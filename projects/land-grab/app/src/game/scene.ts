/**
 * 로컬 판을 렌더러가 읽는 모양(`Scene`)으로 바꿔 준다.
 *
 * 렌더러는 `Match` 를 모른다. 온라인에서는 시뮬레이션이 서버에 있어서 이쪽에
 * `Match` 가 없기 때문이다. 그 경계를 여기서 한 번만 넘는다.
 */

import { PLAYER_KEYS } from "./config";
import type { Match } from "./engine";
import type { Scene, SceneRunner } from "./render";
import type { Runner } from "./types";

/**
 * 프레임마다 `Scene` 을 만들어 주는 어댑터.
 *
 * 유닛 객체는 **재사용한다.** 세계 모드는 41기가 초당 60번 그려지므로,
 * 매 프레임 새로 만들면 던져 버릴 객체가 초당 2천 개 넘게 나온다.
 */
export class MatchScene implements Scene {
  private readonly buffer: SceneRunner[] = [];

  constructor(private readonly match: Match) {}

  get size(): number {
    return this.match.board.size;
  }

  get owner(): Uint8Array {
    return this.match.board.owner;
  }

  /** 혼자 할 때만 십자선을 허용한다. 넷이 그으면 화면이 격자무늬가 된다. */
  get crosshair(): boolean {
    return this.match.humans === 1;
  }

  get rubbleLockMs(): number {
    return this.match.rules.rubbleLockMs;
  }

  get elapsedMs(): number {
    return this.match.elapsedMs;
  }

  get hasRubble(): boolean {
    return this.match.board.hasRubble;
  }

  rubbleUntilAt = (x: number, y: number): number => this.match.board.rubbleUntilAt(x, y);

  get runners(): readonly SceneRunner[] {
    const source = this.match.runners;
    const seats = this.match.humans > 1;

    while (this.buffer.length < source.length) {
      this.buffer.push(blankRunner());
    }
    this.buffer.length = source.length;

    for (let i = 0; i < source.length; i += 1) {
      copyRunner(this.buffer[i], source[i], this.match.moveProgress(source[i]), seats);
    }
    return this.buffer;
  }
}

function blankRunner(): SceneRunner {
  return {
    id: 0,
    alive: false,
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    dir: "up",
    trail: [],
    progress: 1,
    focus: false
  };
}

function copyRunner(target: SceneRunner, runner: Runner, progress: number, seats: boolean): void {
  target.id = runner.id;
  target.alive = runner.alive;
  target.x = runner.x;
  target.y = runner.y;
  target.prevX = runner.prevX;
  target.prevY = runner.prevY;
  target.dir = runner.dir;
  target.trail = runner.trail;
  target.progress = progress;
  target.focus = runner.kind === "human";
  // 배지는 한 화면 멀티일 때만. 혼자면 내 말이 어느 것인지 헷갈릴 일이 없다.
  target.label =
    seats && runner.kind === "human"
      ? (PLAYER_KEYS[runner.id - 1]?.label ?? `P${runner.id}`)
      : undefined;
}
