import type { Match } from "./game/engine";
import type { Direction } from "./game/types";

export type LandGrabHook = {
  phase: "title" | "playing" | "paused" | "result";
  difficulty: string;
  tiles: number[];
  shares: number[];
  scores: number[];
  elapsedMs: number;
  remainingMs: number;
  /** 남은 목숨. `-1`이면 제한 없음(여럿이 할 때). */
  lives: number;
  kills: number;
  deaths: number;
  /** 한 화면에서 함께 하는 사람 수. */
  humans: number;
  trailLength: number;
  x: number;
  y: number;
  dir: Direction;
  alive: boolean;
  onOwnLand: boolean;
};

declare global {
  interface Window {
    __landGrab?: LandGrabHook;
  }
}

/** 플레이테스트 시나리오가 상태를 읽는 창구. 규칙 검사(R1~R6)가 이 값을 본다. */
export function publishHook(hook: LandGrabHook): void {
  window.__landGrab = hook;
}

export function hookFromMatch(match: Match, difficulty: string): LandGrabHook {
  const human = match.human;
  return {
    phase: match.phase,
    difficulty,
    tiles: match.runners.map((runner) => match.tilesOf(runner.id)),
    shares: match.runners.map((runner) => match.shareOf(runner.id)),
    scores: match.runners.map((runner) => match.scoreOf(runner)),
    elapsedMs: Math.round(match.elapsedMs),
    remainingMs: Math.round(match.remainingMs),
    lives: Number.isFinite(human.lives) ? Math.max(0, human.lives) : -1,
    kills: human.kills,
    deaths: human.deaths,
    humans: match.humans,
    trailLength: human.trail.length,
    x: human.x,
    y: human.y,
    dir: human.dir,
    alive: human.alive,
    onOwnLand: match.board.ownerAt(human.x, human.y) === human.id
  };
}
