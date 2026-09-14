import { STAGES, sample, stageLength } from "./stages";
import type { Block, Phase, Stage, Tuning } from "./types";
import tuningJson from "./tuning.json";

export const BASE_TUNING: Tuning = tuningJson as Tuning;

export interface TrailPoint {
  x: number;
  y: number;
}

export interface GameState {
  tuning: Tuning;
  stageIndex: number;
  phase: Phase;
  /** 아바타 월드 좌표 */
  x: number;
  y: number;
  /** 수직 속도. 화면 좌표계이므로 음수가 위 */
  vy: number;
  /** 입력 상태 — 누르고 있는가 */
  holding: boolean;
  /** 시도 경과 시간(초) */
  elapsed: number;
  /** phase 전환 후 경과(초). 재시도 지연과 클리어 연출에 쓴다 */
  sincePhase: number;
  /** 이번 스테이지 시도 횟수 */
  attempts: number;
  /** 이번 스테이지에서 도달한 최고 진행률 0..1 */
  best: number;
  trail: TrailPoint[];
}

const TRAIL_MAX = 90;

export function currentStage(state: GameState): Stage {
  return STAGES[state.stageIndex];
}

export function createState(stageIndex: number, tuning: Tuning = BASE_TUNING): GameState {
  const stage = STAGES[stageIndex];
  return {
    tuning,
    stageIndex,
    phase: "ready",
    x: 0,
    y: stage.startY,
    vy: stage.startRising ? -tuning.slope * tuning.speed : tuning.slope * tuning.speed,
    holding: stage.startRising,
    elapsed: 0,
    sincePhase: 0,
    attempts: 0,
    best: 0,
    trail: []
  };
}

/** 같은 스테이지를 처음부터. 시도 횟수와 최고 기록은 유지한다. */
export function restart(state: GameState): void {
  const stage = currentStage(state);
  state.phase = "running";
  state.x = 0;
  state.y = stage.startY;
  state.vy = state.holding ? -state.tuning.slope * state.tuning.speed : state.tuning.slope * state.tuning.speed;
  state.elapsed = 0;
  state.sincePhase = 0;
  state.attempts += 1;
  state.trail.length = 0;
}

export function goToStage(state: GameState, stageIndex: number): void {
  const next = createState(stageIndex, state.tuning);
  Object.assign(state, next);
}

function circleHitsBlock(cx: number, cy: number, r: number, b: Block): boolean {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

export function hits(stage: Stage, x: number, y: number, r: number): boolean {
  const { top, bot } = sample(stage.nodes, x);
  if (y - r < top || y + r > bot) return true;
  for (const b of stage.blocks) {
    if (circleHitsBlock(x, y, r, b)) return true;
  }
  return false;
}

function setPhase(state: GameState, phase: Phase): void {
  state.phase = phase;
  state.sincePhase = 0;
}

type StepOutcome = "none" | "died" | "cleared";

/**
 * 고정 스텝 물리 1회.
 * 문법층은 여기 네 줄이 전부다 — 전진은 일정하고, 수직 속도는
 * 홀드 여부가 정하는 두 값 중 하나로 간다. 중립은 없다.
 */
function step(state: GameState, dt: number, stage: Stage): StepOutcome {
  const t = state.tuning;
  const target = (state.holding ? -1 : 1) * t.slope * t.speed;

  if (t.inertiaMs <= 0) {
    state.vy = target;
  } else {
    const tau = t.inertiaMs / 1000;
    state.vy += (target - state.vy) * (1 - Math.exp(-dt / tau));
  }

  const px = state.x;
  const py = state.y;
  state.x += t.speed * dt;
  state.y += state.vy * dt;
  state.elapsed += dt;

  // 스윕 검사 — 한 스텝의 이동량이 반지름보다 훨씬 작지만 관통을 원천 차단한다.
  const dist = Math.hypot(state.x - px, state.y - py);
  const samples = Math.max(1, Math.ceil(dist / (t.radius * 0.5)));
  for (let i = 1; i <= samples; i += 1) {
    const u = i / samples;
    const sx = px + (state.x - px) * u;
    const sy = py + (state.y - py) * u;
    if (hits(stage, sx, sy, t.radius)) {
      state.x = sx;
      state.y = sy;
      setPhase(state, "dead");
      return "died";
    }
  }

  const len = stageLength(stage);
  state.best = Math.max(state.best, Math.min(1, state.x / len));
  if (state.x >= len) {
    state.x = len;
    setPhase(state, "cleared");
    return "cleared";
  }
  return "none";
}

export interface UpdateResult {
  /** 이 프레임에 발생한 사건. 사운드·저장 훅이 쓴다. */
  event: "none" | "died" | "cleared" | "restarted";
}

/**
 * 프레임 업데이트. dt는 초. 고정 스텝으로 쪼개 적분한다.
 * 사망 후 retryDelayMs 가 지나면 스스로 재시작한다 — 마찰 0의 재시도 루프가
 * 이 게임의 유일한 자산이므로 확인 입력을 요구하지 않는다.
 */
export function update(state: GameState, dtRaw: number): UpdateResult {
  const t = state.tuning;
  const dt = Math.min(dtRaw, 0.1);
  state.sincePhase += dt;

  if (state.phase === "dead") {
    if (state.sincePhase * 1000 >= t.retryDelayMs) {
      restart(state);
      return { event: "restarted" };
    }
    return { event: "none" };
  }

  if (state.phase !== "running") return { event: "none" };

  const stage = currentStage(state);
  const h = 1 / t.fixedStepHz;
  let remaining = dt;
  let outcome: StepOutcome = "none";

  while (remaining > 1e-9 && outcome === "none") {
    const s = Math.min(h, remaining);
    outcome = step(state, s, stage);
    remaining -= s;
    if (state.trail.length >= TRAIL_MAX) state.trail.shift();
    state.trail.push({ x: state.x, y: state.y });
  }

  return { event: outcome };
}

/** ready 상태에서 첫 입력을 받으면 출발한다. */
export function launch(state: GameState): void {
  if (state.phase === "ready") {
    setPhase(state, "running");
    state.attempts += 1;
  }
}

export { STAGES, stageLength };
