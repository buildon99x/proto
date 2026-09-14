export type Direction = "up" | "down" | "left" | "right";

export type PlayerId = 1 | 2 | 3 | 4;

export type Cell = { x: number; y: number };

export type RunnerKind = "human" | "ai";

export type Runner = {
  id: PlayerId;
  kind: RunnerKind;
  alive: boolean;
  /** `alive`가 false일 때만 의미가 있다. 경기 경과 시간(ms) 기준. */
  respawnAt: number;
  x: number;
  y: number;
  /** 보간용 직전 칸. */
  prevX: number;
  prevY: number;
  dir: Direction;
  queuedDir: Direction | null;
  trail: Cell[];
  tickMs: number;
  /** 다음 칸까지 남은 시간 누적값(ms). */
  tickAccMs: number;
  lives: number;
  kills: number;
  deaths: number;
  peakTiles: number;
};

export type MatchPhase = "playing" | "paused" | "result";

export type Standing = {
  id: PlayerId;
  kind: RunnerKind;
  tiles: number;
  share: number;
  kills: number;
  score: number;
  peakTiles: number;
  alive: boolean;
};

export const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

export const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};
