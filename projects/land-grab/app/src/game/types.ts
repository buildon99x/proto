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
  /** 방향 전환을 받아들인 칸. 같은 칸에서 두 번 바꾸지 못하게 막는다. */
  turnedAtX: number;
  turnedAtY: number;
  trail: Cell[];
  tickMs: number;
  /** 다음 칸까지 남은 시간 누적값(ms). */
  tickAccMs: number;
  lives: number;
  kills: number;
  deaths: number;
  /** 물막이 배율로 쌓은 점수. 사망해도 사라지지 않는다. */
  bonusPoints: number;
  /** 한 번에 가장 넓게 닫은 면적. 결과 화면에 기록으로 보여 준다. */
  bestCapture: number;
  peakTiles: number;
};

export type MatchPhase = "playing" | "paused" | "result";

export type Standing = {
  id: PlayerId;
  kind: RunnerKind;
  /** 화면에 보여 줄 이름. 혼자면 "나", 여럿이면 "P2", AI 면 색 이름. */
  label: string;
  tiles: number;
  share: number;
  kills: number;
  score: number;
  peakTiles: number;
  bonusPoints: number;
  bestCapture: number;
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
