import { NEUTRAL_BUILD, applyBuild, applyTrade, resolve } from "./axes";
import { EndlessCourse, buildStageCourse, pieceAt } from "./course";
import { contains, gateLanes, pieceFreeSpans, sectorFreeSpans, squeezeBounds } from "./geometry";
import type { Lanes, Span } from "./geometry";
import { sample } from "./sectors";
import tuningJson from "./tuning.json";
import type {
  AxisTrade,
  Block,
  Build,
  Course,
  CoursePiece,
  Gate,
  Phase,
  RunMode,
  Sector,
  Tuning
} from "./types";

export const BASE_TUNING: Tuning = tuningJson as Tuning;

export interface TrailPoint {
  x: number;
  y: number;
}

export interface RunConfig {
  mode: RunMode;
  /** stage 모드에서만 쓴다 */
  tier: number;
  stageNo: number;
  /** endless 모드 시드 */
  seed: number;
  /** 시작 빌드(프리셋). 해금으로 넓어진다 */
  startBuild: Build;
  /** 축 상한. 메타 해금으로 2 → 3 */
  axisCap: number;
  /** 생성기가 쓸 수 있는 섹터 난이도 상한. 확장 풀 해금 전에는 2 */
  maxSectorDifficulty: number;
  /** 개발 튜닝 패널이 덮어쓰는 값. 본 플레이에서는 비어 있다 */
  overrides?: Partial<Tuning>;
  /**
   * 연습 모드. 게이트를 지날 때마다 체크포인트를 남기고 사망 시 거기서 다시 시작한다.
   * 정밀 게임의 학습성에 필요하지만 기록에는 반영하지 않는다 — 긴장이 빠진 통과는
   * 클리어가 아니다.
   */
  practice?: boolean;
}

export interface GameState {
  base: Tuning;
  config: RunConfig;
  build: Build;
  /** build 를 반영한 튜닝. 물리·카메라가 이것을 읽는다 */
  tuning: Tuning;
  mode: RunMode;
  course: Course;
  endless: EndlessCourse | null;

  phase: Phase;
  x: number;
  y: number;
  vy: number;
  holding: boolean;
  elapsed: number;
  sincePhase: number;
  attempts: number;
  /** 도달 진행률 0..1 (stage) 또는 도달 거리 (endless) */
  best: number;
  trail: TrailPoint[];

  /** 이미 통과한 게이트 수 */
  gatesPassed: number;
  /** 통과한 섹터 수 */
  sectorsPassed: number;
  /** 가장 최근 교환 — 통과 직후 잠깐 연출한다 */
  lastTrade: { trade: AxisTrade; at: number } | null;
  /** 현재 게이트 스팬 안에서 어느 관에 있는지 */
  lane: "top" | "bot" | null;
  /** 연습 모드 체크포인트. 게이트를 지날 때마다 쌓인다 */
  checkpoints: Checkpoint[];
  /** 사망 지점에서 "지나갈 수 있었던 자리" — 원인을 글자 없이 알린다 */
  deathGap: Span[] | null;
}

export interface Checkpoint {
  x: number;
  y: number;
  vy: number;
  build: Build;
  elapsed: number;
  gatesPassed: number;
  sectorsPassed: number;
}

const TRAIL_MAX = 110;

function capTuning(base: Tuning, cap: number): Tuning {
  return { ...base, axisMax: cap, axisMin: -cap };
}

function makeCourse(config: RunConfig, t: Tuning): { course: Course; endless: EndlessCourse | null } {
  const maxDiff = config.maxSectorDifficulty;
  if (config.mode === "stage") {
    return { course: buildStageCourse(config.tier, config.stageNo, t, maxDiff), endless: null };
  }
  const endless = new EndlessCourse(config.seed, t, maxDiff);
  return { course: endless.course, endless };
}

/**
 * 코스 시작점의 통로 중앙. 섹터마다 중앙선이 다르므로 고정 y 로 출발하면
 * 첫 프레임에 벽 안에서 시작하는 섹터가 생긴다.
 */
export function startYFor(course: Course): number {
  const first = course.pieces[0];
  if (!first) return 50;
  if (first.kind === "sector" && first.sector) {
    const { top, bot } = sample(first.sector.nodes, 0);
    return (top + bot) / 2;
  }
  return 50;
}


export function createState(config: RunConfig): GameState {
  const base = capTuning({ ...BASE_TUNING, ...config.overrides }, config.axisCap);
  const build = { ...config.startBuild };
  const tuning = applyBuild(base, build);
  const { course, endless } = makeCourse(config, base);
  const r = resolve(build, base);
  return {
    base,
    config,
    build,
    tuning,
    mode: config.mode,
    course,
    endless,
    phase: "ready",
    x: 0,
    y: startYFor(course),
    vy: -r.riseRate,
    holding: true,
    elapsed: 0,
    sincePhase: 0,
    attempts: 0,
    best: 0,
    trail: [],
    gatesPassed: 0,
    sectorsPassed: 0,
    lastTrade: null,
    lane: null,
    checkpoints: [],
    deathGap: null
  };
}

/**
 * 재시도마다 Endless 시드를 한 칸 굴린다.
 *
 * Stage 는 같은 코스를 다시 푸는 것이 전부이지만, Endless 에서 같은 코스를 다시 주면
 * "얼마나 멀리"가 암기 게임이 된다. 난수 대신 LCG 한 스텝을 쓰는 것은 런 전체가
 * 여전히 (최초 시드, 재시도 횟수)로 재현되게 두기 위해서다.
 */
function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

/**
 * 같은 설정으로 다시. 기본은 처음부터이고 빌드도 시작 프리셋으로 되돌아간다 —
 * 재시도는 실행을 다듬을지 해법을 바꿀지 고르는 기회다.
 *
 * 연습 모드에서는 마지막 체크포인트에서 이어간다. 코스와 빌드가 그대로 복원되므로
 * 막힌 구간만 반복할 수 있다.
 */
export function restart(state: GameState): void {
  const attempts = state.attempts + 1;
  const best = state.best;
  const holding = state.holding;
  const checkpoints = state.checkpoints;
  const last = state.config.practice ? checkpoints[checkpoints.length - 1] : undefined;

  const config =
    state.config.mode === "endless"
      ? { ...state.config, seed: nextSeed(state.config.seed) }
      : state.config;
  const fresh = createState(config);
  Object.assign(state, fresh, { phase: "running", attempts, best, holding, checkpoints });

  if (last) {
    state.x = last.x;
    state.y = last.y;
    state.vy = last.vy;
    state.build = { ...last.build };
    state.tuning = applyBuild(state.base, state.build);
    state.elapsed = last.elapsed;
    state.gatesPassed = last.gatesPassed;
    state.sectorsPassed = last.sectorsPassed;
  }
}

function setPhase(state: GameState, phase: Phase): void {
  state.phase = phase;
  state.sincePhase = 0;
}

export function launch(state: GameState): void {
  if (state.phase === "ready") {
    setPhase(state, "running");
    state.attempts += 1;
  }
}

// ── 지오메트리 ────────────────────────────────────────────────

function circleHitsBlock(cx: number, cy: number, r: number, b: Block): boolean {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/**
 * 섹터 안에서의 충돌.
 *
 * 판정은 geometry 의 자유 구간 하나로 통일한다 — 엔진·오토파일럿·솔버가 서로 다른
 * 충돌 규칙을 갖게 되면 "솔버는 통과 가능하다는데 실제로는 죽는다"가 발생한다.
 */
export function hitsSector(
  sector: Sector,
  localX: number,
  y: number,
  r: number,
  time: number,
  squeeze = 1
): boolean {
  return !contains(sectorFreeSpans(sector, localX, r, time, squeeze), y);
}

function hitsGate(gate: Gate, x: number, y: number, r: number, t: Tuning): { hit: boolean; lane: "top" | "bot" | null } {
  const lanes = gateLanes(gate, x, t);
  if (y - r < lanes.outerTop || y + r > lanes.outerBot) return { hit: true, lane: null };
  if (lanes.dividerTop === null || lanes.dividerBot === null) return { hit: false, lane: null };
  if (y + r <= lanes.dividerTop) return { hit: false, lane: "top" };
  if (y - r >= lanes.dividerBot) return { hit: false, lane: "bot" };
  return { hit: true, lane: null };
}

type StepOutcome = "none" | "died" | "cleared";

function collide(state: GameState, x: number, y: number): { hit: boolean; lane: "top" | "bot" | null } {
  const piece = pieceAt(state.course, x);
  if (!piece) return { hit: false, lane: null };
  if (piece.kind === "sector" && piece.sector) {
    const localX = x - piece.startX;
    return {
      hit: hitsSector(piece.sector, localX, y, state.tuning.radius, state.elapsed, piece.squeeze ?? 1),
      lane: null
    };
  }
  if (piece.kind === "gate" && piece.gate) {
    return hitsGate(piece.gate, x, y, state.tuning.radius, state.tuning);
  }
  return { hit: false, lane: null };
}

/** 게이트 종료선을 넘는 순간 어느 관에 있었는지로 교환이 확정된다. */
function resolveGateCrossing(state: GameState, prevX: number, piece: CoursePiece): void {
  const gate = piece.gate;
  if (!gate) return;
  if (!(prevX < gate.endX && state.x >= gate.endX)) return;
  const trade = state.lane === "bot" ? gate.bot : gate.top;
  state.build = applyTrade(state.build, trade, state.base);
  state.tuning = applyBuild(state.base, state.build);
  state.gatesPassed += 1;
  state.lastTrade = { trade, at: state.elapsed };
  state.lane = null;
  if (state.config.practice) {
    state.checkpoints.push({
      x: state.x,
      y: state.y,
      vy: state.vy,
      build: { ...state.build },
      elapsed: state.elapsed,
      gatesPassed: state.gatesPassed,
      sectorsPassed: state.sectorsPassed
    });
  }
}

function step(state: GameState, dt: number): StepOutcome {
  const t = state.tuning;
  const r = resolve(state.build, state.base);
  const target = state.holding ? -r.riseRate : r.fallRate;

  if (t.inertiaMs <= 0) {
    state.vy = target;
  } else {
    const tau = t.inertiaMs / 1000;
    state.vy += (target - state.vy) * (1 - Math.exp(-dt / tau));
  }

  const px = state.x;
  const py = state.y;
  state.x += r.speed * dt;
  state.y += state.vy * dt;
  state.elapsed += dt;

  const dist = Math.hypot(state.x - px, state.y - py);
  const samples = Math.max(1, Math.ceil(dist / (t.radius * 0.5)));
  for (let i = 1; i <= samples; i += 1) {
    const u = i / samples;
    const sx = px + (state.x - px) * u;
    const sy = py + (state.y - py) * u;
    const res = collide(state, sx, sy);
    if (res.lane) state.lane = res.lane;
    if (res.hit) {
      state.x = sx;
      state.y = sy;
      // 사망 지점에서 "지나갈 수 있었던 자리". 정지 화면 없이 원인을 알리는 유일한 수단이다.
      const piece = pieceAt(state.course, sx);
      state.deathGap = piece
        ? pieceFreeSpans(piece, sx, state.tuning.radius, state.elapsed, state.tuning, state.lane ?? undefined)
        : null;
      setPhase(state, "dead");
      return "died";
    }
  }

  // 교차 판정은 **방금 떠난 조각**을 봐야 한다. x 가 게이트 끝을 넘은 순간
  // pieceAt(x) 는 이미 다음 섹터를 가리키므로, 이전 위치의 조각을 기준으로 삼는다.
  const leaving = pieceAt(state.course, px);
  if (leaving) {
    if (leaving.kind === "gate" && state.x >= leaving.endX) resolveGateCrossing(state, px, leaving);
    if (leaving.kind === "sector" && state.x >= leaving.endX) state.sectorsPassed += 1;
  }

  if (state.endless) {
    state.endless.ensure(state.x);
    state.best = Math.max(state.best, state.x);
  } else {
    state.best = Math.max(state.best, Math.min(1, state.x / state.course.finishX));
    if (state.x >= state.course.finishX) {
      state.x = state.course.finishX;
      setPhase(state, "cleared");
      return "cleared";
    }
  }
  return "none";
}

export interface UpdateResult {
  event: "none" | "died" | "cleared" | "restarted";
}

export function update(state: GameState, dtRaw: number): UpdateResult {
  const dt = Math.min(dtRaw, 0.1);
  state.sincePhase += dt;

  if (state.phase === "dead") {
    // Stage 는 스스로 처음부터 다시 시작한다. Endless 는 런이 끝난 것이므로 결과를 보여준다.
    if (state.mode === "stage" && state.sincePhase * 1000 >= state.tuning.retryDelayMs) {
      restart(state);
      return { event: "restarted" };
    }
    return { event: "none" };
  }

  if (state.phase !== "running") return { event: "none" };

  // 생성은 프레임당 예산만큼만 — 코어 루프가 프레임을 잃으면 게임이 성립하지 않는다.
  if (state.endless) state.endless.pump(state.build, 3);

  const h = 1 / state.tuning.fixedStepHz;
  let remaining = dt;
  let outcome: StepOutcome = "none";

  while (remaining > 1e-9 && outcome === "none") {
    const s = Math.min(h, remaining);
    outcome = step(state, s);
    remaining -= s;
    if (state.trail.length >= TRAIL_MAX) state.trail.shift();
    state.trail.push({ x: state.x, y: state.y });
  }

  return { event: outcome };
}

/** 개발 튜닝 패널 전용 — 실행 중인 런의 기준 튜닝을 갈아끼운다. */
export function applyOverrides(state: GameState, overrides: Partial<Tuning>): void {
  state.base = capTuning({ ...BASE_TUNING, ...overrides }, state.config.axisCap);
  state.tuning = applyBuild(state.base, state.build);
}

export { NEUTRAL_BUILD, gateLanes, squeezeBounds };
export type { Build, RunMode };
