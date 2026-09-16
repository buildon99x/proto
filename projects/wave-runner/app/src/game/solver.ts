/**
 * 정확한 도달 가능성 솔버.
 *
 * 2단계까지의 검증은 **증인(witness) 기반**이었다 — 오토파일럿이 통과하면 통과
 * 가능함이 증명되지만, 실패가 불가능을 증명하지는 못했다. 여기서 그 부채를 갚는다.
 *
 * 가능한 이유는 관성이 축에서 탈락해 `inertiaMs = 0` 이기 때문이다. 수직 속도가
 * 이력이 아니라 **현재 입력만으로** 결정되므로 상태가 `(시간, 높이)` 하나로 줄고,
 * 입력은 이진이므로 전이가 둘뿐이다. 그래서 격자 근사 없이 **구간 집합**으로
 * 정확히 전파할 수 있다 — 상승/하강 이동량이 상수이므로 구간을 그대로 밀면 된다.
 *
 * 전파는 **이동이 아니라 팽창**이다. 플레이어는 스텝 경계가 아니라 아무 때나 입력을
 * 바꿀 수 있으므로, 한 스텝 dt 동안 y 에서 도달 가능한 곳은 두 점이 아니라 구간
 * `[y − rise·dt, y + fall·dt]` 전체다(스텝 안에서 한 번 전환하면 그 사이의 어떤 평균
 * 속도든 낼 수 있다). 이동 후 합집합으로 계산하면 도달 집합이 격자 위의 점들이 되어
 * 측도가 0 이 되고, 폭을 난이도로 쓸 수 없게 된다.
 *
 * 두 방향으로 훑는다.
 *   - 전진 F[k] : 출발 집합에서 k 스텝 만에 **도달 가능한** y 집합
 *   - 후진 B[k] : k 스텝에서 출발해 끝까지 **살아남을 수 있는** y 집합
 *   - 생존 S[k] = F[k] ∩ B[k]
 *
 * S[k] 의 총 길이가 그 지점의 **생존 회랑 폭**이고, 이것이 플레이 전에 계측되는
 * 객관적 난이도다. 정밀 플랫포머가 보통 못 하는 일이며, 3단계의 생성기는
 * 이 곡선을 목표치에 맞춰 코스를 만든다.
 */
import { gateOffer, resolve } from "./axes";
import { intersect, measure, pieceFreeSpans, union } from "./geometry";
import type { Span } from "./geometry";
import type { Build, CoursePiece, Tuning } from "./types";

/** 구간이 지나치게 잘게 쪼개지면 가장 좁은 것부터 버린다. 정확도보다 안정성이 중요한 지점. */
const MAX_SPANS = 48;

/** 출발 집합이 점이라 폭이 0 인 초반 구간은 최소 폭 집계에서 뺀다. */
const SETTLE_SEC = 0.35;

/** 한 스텝 동안 위로 up, 아래로 down 만큼 번진 집합. 겹치면 합쳐진다. */
function dilate(spans: Span[], up: number, down: number): Span[] {
  return union(
    spans.map((s) => ({ lo: s.lo - up, hi: s.hi + down })),
    []
  );
}

function simplify(spans: Span[]): Span[] {
  if (spans.length <= MAX_SPANS) return spans;
  const sorted = [...spans].sort((a, b) => b.hi - b.lo - (a.hi - a.lo));
  return sorted.slice(0, MAX_SPANS).sort((a, b) => a.lo - b.lo);
}

export interface SolveOptions {
  piece: CoursePiece;
  build: Build;
  base: Tuning;
  /** 진입 시 있을 수 있는 y 집합 */
  startSpans: Span[];
  /** 진입 시각(초). 맥동 셔터의 위상에 쓴다 */
  startTime: number;
  lane?: "top" | "bot";
  /** 결정 간격(초). 작을수록 정확하고 느리다 */
  dt?: number;
  /**
   * 스텝별 자유 구간과 생존 집합을 함께 내보낸다. 분석·시각화 전용이고 기본은 꺼져 있다 —
   * 켜면 스텝 수만큼 배열을 쌓으므로 런타임 경로에서는 절대 켜지 않는다.
   */
  trace?: boolean;
}

/** `trace` 를 켰을 때만 채워지는 스텝별 기록. x = startX + k·dx, 시각 = startTime + k·dt. */
export interface SolveTrace {
  startX: number;
  startTime: number;
  dx: number;
  dt: number;
  /** 폭을 시간으로 환산할 때 쓰는 계수 — slack = width / (2·rate) */
  rate: number;
  /**
   * 한 스텝 동안의 상승·하강 이동량(월드 단위). 전진 전파가 쓰는 것과 같은 값이다.
   *
   * 추적에 함께 싣는 이유는 **역추적이 추적만으로 가능해야** 하기 때문이다. 사망
   * 지점에서 뒤로 되짚는 분석은 조각마다 다른 빌드를 다시 풀 필요 없이 이 두 값만
   * 있으면 되고, 그래야 분석기가 솔버의 내부 계산을 복제하지 않는다.
   */
  up: number;
  down: number;
  /** 스텝별 자유 구간(아바타 반지름을 뺀 중심 좌표 기준) */
  free: Span[][];
  /** 스텝별 생존 집합 S[k] = F[k] ∩ B[k] */
  survival: Span[][];
}

export interface SolveResult {
  passable: boolean;
  /** 조각 끝에서 살아 있을 수 있는 y 집합 — 다음 조각의 출발 집합이 된다 */
  endSpans: Span[];
  /** 스텝별 생존 회랑 폭(월드 단위) */
  widths: Float32Array;
  /** 가장 좁은 지점의 폭과 그 월드 x */
  minWidth: number;
  tightestX: number;
  /**
   * 최소 폭을 시간으로 환산한 값(초).
   *
   * 폭 W 인 생존 회랑에서 위치 오차 δ 는 δ/rate 초면 만회되므로, 허용되는 타이밍
   * 오차는 대략 W/(2·rate) 다. 프로브가 재는 "실패하기 시작하는 반응 지연"과 같은
   * 단위가 되어 생성기의 목표치를 사람의 체감으로 말할 수 있게 한다.
   */
  minSlackSec: number;
  /** 통과에 걸리는 시간(초) */
  duration: number;
  /** `trace` 를 켰을 때만 있다 */
  trace?: SolveTrace;
}

export function solvePiece(opts: SolveOptions): SolveResult {
  const { piece, build, base, startSpans, startTime, lane } = opts;
  const dt = opts.dt ?? 1 / 120;
  const r = resolve(build, base);
  const dx = r.speed * dt;
  const up = r.riseRate * dt;
  const down = r.fallRate * dt;
  const radius = base.radius;
  const len = piece.endX - piece.startX;
  const steps = Math.max(1, Math.ceil(len / dx));

  // 각 스텝의 자유 구간을 미리 구한다. 양방향 훑기가 모두 읽는다.
  const free: Span[][] = new Array(steps + 1);
  for (let k = 0; k <= steps; k += 1) {
    const x = Math.min(piece.endX, piece.startX + k * dx);
    free[k] = pieceFreeSpans(piece, x, radius, startTime + k * dt, base, lane);
  }

  const forward: Span[][] = new Array(steps + 1);
  forward[0] = simplify(intersect(startSpans, free[0]));
  for (let k = 0; k < steps; k += 1) {
    if (forward[k].length === 0) {
      for (let j = k + 1; j <= steps; j += 1) forward[j] = [];
      break;
    }
    forward[k + 1] = simplify(intersect(dilate(forward[k], up, down), free[k + 1]));
  }

  const backward: Span[][] = new Array(steps + 1);
  backward[steps] = free[steps];
  for (let k = steps - 1; k >= 0; k -= 1) {
    if (backward[k + 1].length === 0) {
      for (let j = k; j >= 0; j -= 1) backward[j] = [];
      break;
    }
    // y' ∈ [y − up, y + down] 의 역상은 y ∈ [y' − down, y' + up]
    backward[k] = simplify(intersect(dilate(backward[k + 1], down, up), free[k]));
  }

  const widths = new Float32Array(steps + 1);
  const survival: Span[][] | null = opts.trace ? new Array(steps + 1) : null;
  let minWidth = Number.POSITIVE_INFINITY;
  let tightestStep = 0;
  const settle = Math.min(steps, Math.ceil(SETTLE_SEC / dt));
  for (let k = 0; k <= steps; k += 1) {
    const s = intersect(forward[k] ?? [], backward[k] ?? []);
    widths[k] = measure(s);
    if (survival) survival[k] = s;
    if (k >= settle && widths[k] < minWidth) {
      minWidth = widths[k];
      tightestStep = k;
    }
  }

  const endSpans = intersect(forward[steps] ?? [], free[steps]);
  const safeMin = Number.isFinite(minWidth) ? minWidth : 0;
  return {
    passable: measure(endSpans) > 1e-6,
    endSpans,
    widths,
    minWidth: safeMin,
    tightestX: piece.startX + tightestStep * dx,
    minSlackSec: safeMin / (2 * Math.max(r.riseRate, r.fallRate)),
    duration: steps * dt,
    trace: survival
      ? {
          startX: piece.startX,
          startTime,
          dx,
          dt,
          rate: Math.max(r.riseRate, r.fallRate),
          up,
          down,
          free,
          survival
        }
      : undefined
  };
}

export interface CourseSolveResult {
  passable: boolean;
  /** 실패한 조각의 인덱스. 전부 통과하면 −1 */
  failedAt: number;
  minWidth: number;
  minSlackSec: number;
  /** 조각별 최소 폭. `trace` 를 켰으면 스텝별 기록이 함께 온다 */
  perPiece: Array<{
    index: number;
    minWidth: number;
    slackSec: number;
    passable: boolean;
    trace?: SolveTrace;
  }>;
  duration: number;
}

/**
 * 코스 전체를 한 경로(게이트마다 어느 관을 탈지)로 푼다.
 *
 * 빌드는 게이트를 지날 때마다 바뀌므로 조각마다 다시 해석한다. 시간은 누적되며,
 * 한 조각의 생존 집합이 다음 조각의 출발 집합이 된다 — 그래서 결과가 정확하다.
 *
 * 게이트의 제안도 미리 박혀 있는 값이 아니라 **그 자리에서의 빌드로** 다시 뽑는다.
 * 엔진이 직전 게이트를 지나며 하는 일과 같은 함수를 부르므로, 경로마다 제안이
 * 달라지는 것까지 포함해 실제로 플레이될 코스를 푼다.
 */
export function solveCourse(
  pieces: CoursePiece[],
  startBuild: Build,
  base: Tuning,
  startY: number,
  lanes: Array<"top" | "bot">,
  applyTrade: (build: Build, trade: { plus: keyof Build; minus: keyof Build }) => Build,
  dt = 1 / 120,
  trace = false
): CourseSolveResult {
  let build = { ...startBuild };
  let spans: Span[] = [{ lo: startY - 1e-6, hi: startY + 1e-6 }];
  let time = 0;
  let gateIndex = 0;
  let minWidth = Number.POSITIVE_INFINITY;
  let minSlack = Number.POSITIVE_INFINITY;
  const perPiece: CourseSolveResult["perPiece"] = [];

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    const lane = piece.kind === "gate" ? lanes[Math.min(lanes.length - 1, gateIndex)] ?? "top" : undefined;
    const res = solvePiece({ piece, build, base, startSpans: spans, startTime: time, lane, dt, trace });
    perPiece.push({
      index: i,
      minWidth: res.minWidth,
      slackSec: res.minSlackSec,
      passable: res.passable,
      trace: res.trace
    });
    minWidth = Math.min(minWidth, res.minWidth);
    minSlack = Math.min(minSlack, res.minSlackSec);
    time += res.duration;
    if (!res.passable) {
      return { passable: false, failedAt: i, minWidth, minSlackSec: minSlack, perPiece, duration: time };
    }
    spans = res.endSpans;
    if (piece.kind === "gate" && piece.gate) {
      const offer = gateOffer(piece.gate.seed, build, base);
      build = applyTrade(build, lane === "bot" ? offer.bot : offer.top);
      gateIndex += 1;
    }
  }

  return { passable: true, failedAt: -1, minWidth, minSlackSec: minSlack, perPiece, duration: time };
}
