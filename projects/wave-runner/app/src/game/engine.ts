import { NEUTRAL_BUILD, applyBuild, applyTrade, resolve } from "./axes";
import { EndlessCourse, buildStageCourse, pieceAt } from "./course";
import { CUFF_BOT, CUFF_TOP, sample, shutterDepth } from "./sectors";
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
    lane: null
  };
}

/** 같은 설정으로 처음부터. 빌드도 시작 프리셋으로 되돌아간다 — 재시도는 해법을 다시 고를 기회다. */
export function restart(state: GameState): void {
  const fresh = createState(state.config);
  const attempts = state.attempts + 1;
  const best = state.best;
  const holding = state.holding;
  Object.assign(state, fresh, { phase: "running", attempts, best, holding });
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

export interface Lanes {
  outerTop: number;
  outerBot: number;
  /** 분기 중이면 칸막이 상/하단. 아니면 null */
  dividerTop: number | null;
  dividerBot: number | null;
}

const GATE_OPEN_TOP = 18;
const GATE_OPEN_BOT = 82;

function smooth(u: number): number {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
}

/**
 * 게이트 구간의 통로 형상.
 *
 * 바깥 벽은 섹터의 규격 출구(CUFF)에서 넓게 벌어졌다가 다시 규격 입구로 좁혀진다 —
 * 어느 이음매에서도 갑자기 벽이 생기지 않아야 한다. 칸막이는 0에서 서서히 자라
 * 구멍 두 개가 아니라 길이 둘로 갈라지는 것으로 읽힌다.
 */
export function gateLanes(gate: Gate, x: number, t: Tuning): Lanes {
  const span = Math.max(1e-6, gate.endX - gate.startX);
  let top: number;
  let bot: number;
  if (x < gate.startX) {
    const w = smooth((x - gate.leadInX) / Math.max(1e-6, gate.startX - gate.leadInX));
    top = CUFF_TOP + (GATE_OPEN_TOP - CUFF_TOP) * w;
    bot = CUFF_BOT + (GATE_OPEN_BOT - CUFF_BOT) * w;
  } else {
    const closing = smooth(((x - gate.startX) / span - 0.75) / 0.25);
    top = GATE_OPEN_TOP + (CUFF_TOP - GATE_OPEN_TOP) * closing;
    bot = GATE_OPEN_BOT + (CUFF_BOT - GATE_OPEN_BOT) * closing;
  }
  const outer = { outerTop: top, outerBot: bot };
  if (x < gate.startX) return { ...outer, dividerTop: null, dividerBot: null };

  // 칸막이는 자랐다가 **끝나기 전에 다시 사라진다.** 갈라진 두 길이 도로 합쳐져야
  // 출구에서 바깥벽이 좁아지는 것과 겹쳐 아바타를 끼우지 않는다.
  // 어느 관을 탔는지는 칸막이가 서 있는 동안 이미 기록되므로 판정에는 영향이 없다.
  const u = (x - gate.startX) / span;
  const grow = smooth(u / 0.35);
  const fade = 1 - smooth((u - 0.7) / 0.3);
  const d = t.gateDivider * Math.min(grow, fade);
  if (d <= 1e-6) return { ...outer, dividerTop: null, dividerBot: null };
  return { ...outer, dividerTop: 50 - d / 2, dividerBot: 50 + d / 2 };
}

/** 통로를 중앙 기준으로 조인다. squeeze 1 이면 그대로. */
export function squeezeBounds(b: { top: number; bot: number }, squeeze: number): { top: number; bot: number } {
  if (squeeze >= 1) return b;
  const mid = (b.top + b.bot) / 2;
  const half = ((b.bot - b.top) / 2) * squeeze;
  return { top: mid - half, bot: mid + half };
}

function circleHitsBlock(cx: number, cy: number, r: number, b: Block): boolean {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

/**
 * 섹터 안에서의 충돌. 셔터는 시각에 따라 깊이가 변한다.
 *
 * squeeze 는 통로를 중앙으로 조이는 계수다. Endless 에서 손으로 만든 가장 어려운
 * 섹터를 다 쓴 뒤에도 난이도를 계속 올리기 위한 장치이고, 3단계의 런타임 생성이
 * 들어오면 회랑 폭 목표치가 이 역할을 대신한다.
 */
export function hitsSector(
  sector: Sector,
  localX: number,
  y: number,
  r: number,
  time: number,
  squeeze = 1
): boolean {
  const { top, bot } = squeezeBounds(sample(sector.nodes, localX), squeeze);
  if (y - r < top || y + r > bot) return true;
  for (const b of sector.blocks) {
    if (circleHitsBlock(localX, y, r, b)) return true;
  }
  for (const s of sector.shutters) {
    const depth = shutterDepth(s, time);
    if (depth <= 0) continue;
    const rect: Block =
      s.side === "top"
        ? { x: s.x, y: top, w: s.w, h: depth }
        : { x: s.x, y: bot - depth, w: s.w, h: depth };
    if (circleHitsBlock(localX, y, r, rect)) return true;
  }
  return false;
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

export { NEUTRAL_BUILD };
export type { Build, RunMode };
