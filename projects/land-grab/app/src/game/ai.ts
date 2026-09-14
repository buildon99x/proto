import type { Match } from "./engine";
import type { Difficulty } from "./config";
import { DELTA, DIRECTIONS, OPPOSITE, type Cell, type Direction, type PlayerId, type Runner } from "./types";

type Leg = { dir: Direction; steps: number };

type AiMode = "expand" | "return" | "hunt";

type AiState = {
  mode: AiMode;
  legs: Leg[];
  target: Cell | null;
  /** 마지막으로 판단을 내린 칸. 같은 칸에서 두 번 판단하지 않는다. */
  decidedX: number;
  decidedY: number;
};

/**
 * AI 조종. 매 프레임 호출하면, 칸이 바뀐 AI에 한해 다음 방향을 예약한다.
 * 경로 탐색은 하지 않는다 — 직사각형 경로 + 안전 규칙 조합으로
 * "적당히 잘하고 가끔 실수하는" 상대를 만드는 것이 목표다.
 */
export class AiController {
  private readonly states = new Map<PlayerId, AiState>();

  constructor(
    private readonly match: Match,
    private readonly difficulty: Difficulty,
    private readonly rng: () => number = Math.random
  ) {}

  update(): void {
    for (const runner of this.match.runners) {
      if (runner.kind !== "ai") {
        continue;
      }
      if (!runner.alive) {
        this.states.delete(runner.id);
        continue;
      }

      const state = this.stateOf(runner);
      // 한 칸에서 한 번만 판단한다. 엔진도 같은 칸의 두 번째 전환은 무시한다.
      if (state.decidedX === runner.x && state.decidedY === runner.y) {
        continue;
      }

      state.decidedX = runner.x;
      state.decidedY = runner.y;
      const dir = this.decide(runner, state);
      if (dir) {
        this.match.queueDirection(runner, dir);
      }
    }
  }

  private stateOf(runner: Runner): AiState {
    let state = this.states.get(runner.id);
    if (!state) {
      state = { mode: "expand", legs: [], target: null, decidedX: -1, decidedY: -1 };
      this.states.set(runner.id, state);
    }
    return state;
  }

  private decide(runner: Runner, state: AiState): Direction | null {
    this.updateMode(runner, state);

    const safe = DIRECTIONS.filter(
      (dir) => dir !== OPPOSITE[runner.dir] && this.isSafe(runner, dir)
    );
    if (safe.length === 0) {
      return null;
    }

    if (state.mode === "expand") {
      const planned = this.followPlan(runner, state, safe);
      if (planned) {
        return planned;
      }
      state.mode = "return";
    }

    const target = state.mode === "hunt" && state.target ? state.target : this.nearestOwnCell(runner);
    if (!target) {
      return this.preferStraight(runner, safe);
    }
    return this.stepToward(runner, safe, target);
  }

  private updateMode(runner: Runner, state: AiState): void {
    const exposed = runner.trail.length;

    if (exposed > this.difficulty.maxTrail) {
      state.mode = "return";
      state.legs = [];
      return;
    }

    if (exposed > 0 && this.threatNearby(runner)) {
      state.mode = "return";
      state.legs = [];
      return;
    }

    if (state.mode === "hunt") {
      const prey = this.findPrey(runner);
      if (prey) {
        state.target = prey;
        return;
      }
      state.mode = "return";
      state.legs = [];
    }

    const insideOwn = this.match.board.ownerAt(runner.x, runner.y) === runner.id;
    if (insideOwn && exposed === 0) {
      const prey = this.findPrey(runner);
      if (prey) {
        state.mode = "hunt";
        state.target = prey;
        state.legs = [];
        return;
      }
      if (state.mode !== "expand" || state.legs.length === 0) {
        state.mode = "expand";
        state.legs = this.planRectangle(runner);
      }
    }
  }

  /** 직사각형 경로: 밖으로 h칸 → 옆으로 w칸 → 영토 쪽으로 되돌아오기. */
  private planRectangle(runner: Runner): Leg[] {
    const { rectMin, rectMax } = this.difficulty;
    const depth = rectMin + Math.floor(this.rng() * (rectMax - rectMin + 1));
    const width = rectMin + Math.floor(this.rng() * (rectMax - rectMin + 1));

    const out = this.pickOutward(runner, depth + 2);
    if (!out) {
      return [];
    }

    const sides: Direction[] =
      out === "up" || out === "down" ? ["left", "right"] : ["up", "down"];
    const sideOptions = sides.filter((dir) => this.roomAhead(runner, dir) >= width + 2);
    if (sideOptions.length === 0) {
      return [];
    }
    const side = sideOptions[Math.floor(this.rng() * sideOptions.length)];

    return [
      { dir: out, steps: depth },
      { dir: side, steps: width },
      { dir: OPPOSITE[out], steps: depth + rectMax }
    ];
  }

  private followPlan(runner: Runner, state: AiState, safe: Direction[]): Direction | null {
    while (state.legs.length > 0) {
      const leg = state.legs[0];
      if (leg.steps <= 0) {
        state.legs.shift();
        continue;
      }

      // 마지막 구간은 영토에 닿는 즉시 끝난다.
      if (state.legs.length === 1 && this.match.board.ownerAt(runner.x, runner.y) === runner.id) {
        state.legs = [];
        return null;
      }

      if (!safe.includes(leg.dir)) {
        state.legs = [];
        return null;
      }

      leg.steps -= 1;
      return leg.dir;
    }
    return null;
  }

  /** 영토 밖으로 나가면서 앞이 충분히 트인 방향. */
  private pickOutward(runner: Runner, needed: number): Direction | null {
    const options = DIRECTIONS.filter((dir) => {
      if (dir === OPPOSITE[runner.dir]) {
        return false;
      }
      return this.roomAhead(runner, dir) >= needed;
    });
    if (options.length === 0) {
      return null;
    }
    return options[Math.floor(this.rng() * options.length)];
  }

  /** 벽이나 자기 꼬리에 막히기 전까지 그 방향으로 갈 수 있는 칸 수. */
  private roomAhead(runner: Runner, dir: Direction): number {
    const delta = DELTA[dir];
    let room = 0;
    let x = runner.x;
    let y = runner.y;
    while (room < 40) {
      x += delta.x;
      y += delta.y;
      if (!this.match.board.isPlayable(x, y)) {
        break;
      }
      if (this.match.board.trailAt(x, y) === runner.id) {
        break;
      }
      room += 1;
    }
    return room;
  }

  private isSafe(runner: Runner, dir: Direction): boolean {
    const delta = DELTA[dir];
    const x = runner.x + delta.x;
    const y = runner.y + delta.y;
    const board = this.match.board;

    if (!board.isPlayable(x, y)) {
      return false;
    }
    if (board.trailAt(x, y) === runner.id) {
      return false;
    }
    if (runner.trail.length > 0 && this.occupiedByEnemy(runner, x, y)) {
      return false;
    }

    // 한 칸 앞을 내다본다. 들어가면 빠져나올 수 없는 칸은 고르지 않는다.
    const hasExit = DIRECTIONS.some((next) => {
      if (next === OPPOSITE[dir]) {
        return false;
      }
      const nx = x + DELTA[next].x;
      const ny = y + DELTA[next].y;
      return board.isPlayable(nx, ny) && board.trailAt(nx, ny) !== runner.id;
    });

    return hasExit;
  }

  private occupiedByEnemy(runner: Runner, x: number, y: number): boolean {
    return this.match.runners.some(
      (other) => other.alive && other.id !== runner.id && other.x === x && other.y === y
    );
  }

  private threatNearby(runner: Runner): boolean {
    return this.match.runners.some((other) => {
      if (!other.alive || other.id === runner.id) {
        return false;
      }
      return Math.abs(other.x - runner.x) + Math.abs(other.y - runner.y) <= 3;
    });
  }

  /** 사냥 대상: 사정거리 안에서 충분히 노출된 적 꼬리 중 가장 가까운 칸. */
  private findPrey(runner: Runner): Cell | null {
    const { huntRange, huntTrailThreshold } = this.difficulty;
    if (!Number.isFinite(huntTrailThreshold) || huntRange <= 0) {
      return null;
    }

    let best: Cell | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const other of this.match.runners) {
      if (!other.alive || other.id === runner.id || other.trail.length < huntTrailThreshold) {
        continue;
      }
      for (const cell of other.trail) {
        const distance = Math.abs(cell.x - runner.x) + Math.abs(cell.y - runner.y);
        if (distance <= huntRange && distance < bestDistance) {
          bestDistance = distance;
          best = cell;
        }
      }
    }

    return best;
  }

  private nearestOwnCell(runner: Runner): Cell | null {
    const board = this.match.board;
    let best: Cell | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < board.owner.length; i += 1) {
      if (board.owner[i] !== runner.id) {
        continue;
      }
      const x = i % board.size;
      const y = (i - x) / board.size;
      const distance = Math.abs(x - runner.x) + Math.abs(y - runner.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x, y };
      }
    }

    return best;
  }

  private stepToward(runner: Runner, safe: Direction[], target: Cell): Direction {
    let best = safe[0];
    let bestScore = Number.POSITIVE_INFINITY;

    for (const dir of safe) {
      const x = runner.x + DELTA[dir].x;
      const y = runner.y + DELTA[dir].y;
      const distance = Math.abs(target.x - x) + Math.abs(target.y - y);
      const turnPenalty = dir === runner.dir ? 0 : 0.5;
      const score = distance + turnPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = dir;
      }
    }

    return best;
  }

  private preferStraight(runner: Runner, safe: Direction[]): Direction {
    return safe.includes(runner.dir) ? runner.dir : safe[Math.floor(this.rng() * safe.length)];
  }
}
