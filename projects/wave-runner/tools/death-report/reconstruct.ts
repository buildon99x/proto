/**
 * 수집된 이벤트로 코스를 되살리고, **실수가 일어난 자리**를 짚는다.
 *
 * 사망 좌표는 원인이 아니라 결과다. 중립이 없는 조작에서는 생존 회랑을 벗어난 지점과
 * 벽에 닿는 지점이 언제나 떨어져 있고, 좁은 통로일수록 짧고 넓은 통로일수록 길다.
 * 사망 x 를 그대로 히스토그램으로 쌓으면 실수가 일어난 자리가 아니라 **그 결과가
 * 드러난 자리**가 집계되어, 좁은 섹터가 앞 섹터의 죄를 뒤집어쓴다.
 *
 * 궤적은 저장하지 않으므로 실제 이탈 지점은 알 수 없다. 대신 **상계**를 구한다.
 *
 *   R[j] : 사망 지점 {y_d} 에서 시작해 자유 구간 안에서 뒤로 팽창시킨 집합
 *   k*   = max { j ≤ d : R[j] ∩ S[j] ≠ ∅ }
 *
 * `k*` 이후로는, 이 사망에 도달하는 어떤 입력열이든 이미 생존 회랑 밖이었다는 뜻이다.
 * 즉 **실수는 x(k*) 이전에 일어났다.** 실제 이탈은 더 이를 수 있으므로 이 값은 상계이며,
 * 사망 x 보다 언제나 원인에 가깝다.
 *
 * 세 가지 근사가 있고, 전부 `k*` 를 **뒤로(늦게)** 밀 뿐 앞으로 당기지 않는다 —
 * 그래서 상계라는 성질이 깨지지 않는다.
 *
 * 1. 솔버의 전파는 실제 조작으로 낼 수 있는 것의 상위 집합이다(스텝 안에서 한 번
 *    전환하면 그 사이 어떤 평균 속도든 낼 수 있다고 본다).
 * 2. 사망 x 를 솔버 격자의 가장 가까운 스텝으로 맞춘다.
 * 3. 코스 전체 회랑을 다시 계산한다 — 솔버의 B[k] 는 **그 조각 끝까지**의 생존이라
 *    조각 경계 근처에서 S 가 크게 부풀고, 그러면 R∩S 가 사망 직전에 바로 성립해
 *    k* 가 사망 x 에 붙어 버린다(실측 중앙 1.1 월드 단위였다). 조각별 추적을 하나로
 *    이어 붙인 뒤 끝에서부터 후진 훑기를 다시 돌리면 코스 끝까지의 생존이 된다.
 */
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { buildStageCourse, pieceIndexAt } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { intersect, measure, union } from "../../app/src/game/geometry";
import type { Span } from "../../app/src/game/geometry";
import { solveCourse } from "../../app/src/game/solver";
import type { CourseSolveResult } from "../../app/src/game/solver";
import type { AxisKey, Build, Course, Tuning } from "../../app/src/game/types";

/** 솔버 해상도. 코스 지도와 같은 값이라 두 도구의 수치가 서로 대조된다 */
export const DT = 1 / 90;

/** NDJSON 한 줄. 서버가 저장한 모양 그대로다 */
export interface StoredEvent {
  k: "death" | "clear" | "abort";
  ts: number;
  mode: "stage" | "endless";
  tier?: number;
  no?: number;
  seed?: number;
  att: number;
  cap: number;
  pre: string;
  lanes: string;
  bld: [number, number, number];
  t: number;
  pi?: number;
  pid?: string;
  x?: number;
  lx?: number;
  y?: number;
  hold?: number;
  gw?: number;
  gd?: number;
  dist?: number;
  sec?: number;
  fps: number;
  prac: number;
  dev: number;
  hud: number;
  mob: number;
  iid: string;
  sid: string;
  fp: string;
}

const tuningFor = (cap: number): Tuning => ({ ...BASE_TUNING, axisMin: -cap, axisMax: cap });

const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

/** 선택열을 솔버가 받는 모양으로. 기록보다 게이트가 많으면 남은 자리는 "top" 으로 채운다 */
const lanesOf = (lanes: string, gates: number): Array<"top" | "bot"> =>
  Array.from({ length: gates }, (_, i) => (lanes[i] === "b" ? "bot" : "top"));

/** 스텝 하나. 조각 경계를 넘어 하나로 이어 붙인 시간축이다 */
interface Frame {
  x: number;
  /** 이 조각의 인덱스 */
  piece: number;
  free: Span[];
  surv: Span[];
  /** 직전 프레임에서 여기로 오는 한 스텝의 이동량. 조각마다 빌드가 달라 값이 바뀐다 */
  up: number;
  down: number;
  /** 폭을 시간으로 환산하는 계수 */
  rate: number;
}

/** 구간이 잘게 쪼개지면 가장 좁은 것부터 버린다. 솔버와 같은 상한을 쓴다 */
const MAX_SPANS = 48;
function cap(spans: Span[]): Span[] {
  if (spans.length <= MAX_SPANS) return spans;
  return [...spans]
    .sort((a, b) => b.hi - b.lo - (a.hi - a.lo))
    .slice(0, MAX_SPANS)
    .sort((a, b) => a.lo - b.lo);
}
const grow = (spans: Span[], up: number, down: number): Span[] =>
  union(spans.map((s) => ({ lo: s.lo - up, hi: s.hi + down })), []);

/**
 * 이어 붙인 프레임 위에서 **코스 전체** 생존 회랑을 다시 구한다.
 *
 * 솔버가 조각 단위로 푸는 것은 게이트마다 빌드가 바뀌기 때문이고, 그 대가로 후진
 * 훑기가 조각 끝에서 끊긴다. 난이도 수치로는 문제가 없지만(그 조각을 통과할 수 있는가는
 * 정확하다) 이탈 지점을 되짚는 데에는 치명적이다 — 조각 끝 근처의 S 가 자유 구간만큼
 * 넓어져 "회랑 안이었다"가 늘 참이 된다.
 *
 * 프레임에 조각별 이동량이 실려 있으므로 여기서 한 번 더 훑는 것으로 족하다.
 */
function tightenCorridor(frames: Frame[], startY: number): void {
  const n = frames.length;
  if (n === 0) return;

  const fwd: Span[][] = new Array(n);
  fwd[0] = cap(intersect([{ lo: startY - 1e-6, hi: startY + 1e-6 }], frames[0].free));
  for (let j = 1; j < n; j += 1) {
    fwd[j] = fwd[j - 1].length === 0
      ? []
      : cap(intersect(grow(fwd[j - 1], frames[j].up, frames[j].down), frames[j].free));
  }

  const back: Span[][] = new Array(n);
  back[n - 1] = frames[n - 1].free;
  for (let j = n - 2; j >= 0; j -= 1) {
    // y' ∈ [y − up, y + down] 의 역상은 y ∈ [y' − down, y' + up]
    back[j] = back[j + 1].length === 0
      ? []
      : cap(intersect(grow(back[j + 1], frames[j + 1].down, frames[j + 1].up), frames[j].free));
  }

  for (let j = 0; j < n; j += 1) frames[j].surv = intersect(fwd[j], back[j]);
}

export interface Reconstruction {
  course: Course;
  solved: CourseSolveResult;
  frames: Frame[];
  /** 조각별 최소 여유(ms). 표 B 의 밴드가 이 값을 쓴다 */
  slackMs: number[];
  tuning: Tuning;
}

const keyOf = (e: StoredEvent) => `${e.tier}:${e.no}:${e.cap}:${e.lanes}`;
const cache = new Map<string, Reconstruction | null>();

/**
 * 이벤트가 가리키는 코스를 되살려 스텝 축까지 편다.
 *
 * 같은 (스테이지, 축 상한, 선택열) 은 언제나 같은 코스이므로 캐시한다 — 사망은 수천
 * 건이어도 서로 다른 경로는 스테이지당 16개뿐이다.
 */
export function reconstruct(e: StoredEvent): Reconstruction | null {
  if (e.mode !== "stage" || e.tier === undefined || e.no === undefined) return null;
  const key = keyOf(e);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const tuning = tuningFor(e.cap);
  const course = buildStageCourse(e.tier, e.no, tuning);
  const gates = course.pieces.filter((p) => p.kind === "gate").length;
  const solved = solveCourse(
    course.pieces,
    { ...NEUTRAL_BUILD },
    tuning,
    startYFor(course),
    lanesOf(e.lanes, gates),
    tradeWith(tuning),
    DT,
    true
  );

  const frames: Frame[] = [];
  for (const pp of solved.perPiece) {
    const t = pp.trace;
    if (!t) continue;
    for (let k = 0; k < t.survival.length; k += 1) {
      // 조각 경계에서 같은 x 가 두 번 나온다. 앞 조각의 마지막과 뒤 조각의 첫 스텝이
      // 같은 자리이므로 하나로 합친다 — 두 번 팽창시키면 R 이 실제보다 넓어진다.
      if (k === 0 && frames.length > 0) {
        const last = frames[frames.length - 1];
        last.free = intersect(last.free, t.free[k] ?? []);
        last.surv = intersect(last.surv, t.survival[k] ?? []);
        continue;
      }
      frames.push({
        x: t.startX + k * t.dx,
        piece: pp.index,
        free: t.free[k] ?? [],
        surv: t.survival[k] ?? [],
        up: t.up,
        down: t.down,
        rate: t.rate
      });
    }
  }

  tightenCorridor(frames, startYFor(course));

  const slackMs = course.pieces.map(() => Number.NaN);
  for (const pp of solved.perPiece) slackMs[pp.index] = pp.slackSec * 1000;

  const out: Reconstruction = { course, solved, frames, slackMs, tuning };
  cache.set(key, out);
  return out;
}

/** 사망 x 에 가장 가까운 프레임. 프레임은 x 오름차순이므로 이분 탐색이다 */
function frameAt(frames: Frame[], x: number): number {
  if (frames.length === 0) return -1;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(frames[lo - 1].x - x) <= Math.abs(frames[lo].x - x)) return lo - 1;
  return lo;
}

export interface Divergence {
  /** 실수가 일어난 자리의 상계(월드 x). 구하지 못하면 null */
  x: number | null;
  /** 그 자리의 조각 인덱스 */
  piece: number | null;
  /** 사망 x 에서 얼마나 거슬러 올라갔는가 */
  lag: number | null;
  /** 사망 프레임에서 회랑까지 남은 거리. 0 이면 사망 순간에도 회랑 안이었다 */
  offCorridor: number;
  why?: string;
}

/**
 * 사망 지점에서 뒤로 되짚어 이탈 지점의 상계를 찾는다.
 *
 * 전진 전파가 `y' ∈ [y − up, y + down]` 이므로 역상은 `y ∈ [y' − down, y' + up]` 이다
 * (solver.ts 의 후진 훑기와 같은 뒤집기다).
 */
export function divergence(rec: Reconstruction, deathX: number, deathY: number): Divergence {
  const { frames } = rec;
  const d = frameAt(frames, deathX);
  if (d < 0) return { x: null, piece: null, lag: null, offCorridor: 0, why: "프레임 없음" };

  // 사망 프레임에서 회랑까지의 거리. 0 이면 회랑 안에서 벽에 닿은 것이라 —
  // 상류에 원인이 없다는 뜻이고, 그 사망은 그 자리의 것이다.
  const off = distanceTo(frames[d].surv, deathY);

  // 사망 지점은 벽 안이므로 자유 구간과 교차시키지 않는다. 그 이전 프레임들은
  // 살아 있었으므로 전부 자유 구간 안이어야 한다.
  let r: Span[] = [{ lo: deathY - 1e-6, hi: deathY + 1e-6 }];
  for (let j = d - 1; j >= 0; j -= 1) {
    const step = frames[j + 1];
    r = intersect(union(r.map((s) => ({ lo: s.lo - step.down, hi: s.hi + step.up })), []), frames[j].free);
    if (r.length === 0) {
      // 더 거슬러 올라갈 수 없다 — 이 사망에 이르는 경로가 자유 구간 안에 없다.
      return {
        x: frames[j].x,
        piece: frames[j].piece,
        lag: deathX - frames[j].x,
        offCorridor: off,
        why: "자유 구간에서 끊김"
      };
    }
    if (measure(intersect(r, frames[j].surv)) > 1e-9) {
      return { x: frames[j].x, piece: frames[j].piece, lag: deathX - frames[j].x, offCorridor: off };
    }
  }
  return { x: frames[0].x, piece: frames[0].piece, lag: deathX - frames[0].x, offCorridor: off, why: "출발까지 거슬러 감" };
}

/** y 에서 가장 가까운 구간까지의 거리. 안에 있으면 0, 구간이 없으면 −1 */
export function distanceTo(spans: Span[], y: number): number {
  if (spans.length === 0) return -1;
  let best = Number.POSITIVE_INFINITY;
  for (const s of spans) {
    if (y >= s.lo && y <= s.hi) return 0;
    best = Math.min(best, y < s.lo ? s.lo - y : y - s.hi);
  }
  return best;
}

/** 이벤트가 어디까지 진입했는가 — 사망률의 분모를 만든다 */
export function reachOf(e: StoredEvent, rec: Reconstruction | null): number {
  if (e.k === "death") return e.pi ?? 0;
  if (!rec) return 0;
  if (e.k === "clear") return rec.course.pieces.length - 1;
  return Math.max(0, pieceIndexAt(rec.course, e.dist ?? 0));
}

export { lanesOf, tuningFor };
