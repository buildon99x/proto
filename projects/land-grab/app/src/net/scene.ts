/**
 * 서버에서 받아 적은 상태를 렌더러가 읽는 모양(`Scene`)으로 바꾼다.
 * 로컬 판의 `game/scene.ts` 와 같은 자리에 있는 짝이다.
 */

import type { Scene, SceneRunner } from "../game/render";
import type { NetWorld } from "./client-state";

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export class NetScene implements Scene {
  private readonly buffer: SceneRunner[] = [];

  constructor(private readonly net: NetWorld) {}

  get size(): number {
    return this.net.mapSize;
  }

  get owner(): Uint8Array {
    return this.net.owner;
  }

  /** 카메라가 내 말을 따라다니므로 십자선은 필요 없다. 늘 화면 한가운데다. */
  readonly crosshair = false;

  // 폐허 규칙은 실험 끝에 기각됐고 서버도 켜지 않는다.
  readonly rubbleLockMs = 0;
  readonly elapsedMs = 0;
  readonly hasRubble = false;
  rubbleUntilAt = (): number => 0;

  get runners(): readonly SceneRunner[] {
    const players = this.net.players;
    const myId = this.net.myId;
    const tickMs = Math.max(1, this.net.tickMs);
    const stamp = now();

    while (this.buffer.length < players.size) {
      this.buffer.push(blankRunner());
    }
    this.buffer.length = players.size;

    let index = 0;
    for (const player of players.values()) {
      const target = this.buffer[index];
      index += 1;

      target.id = player.id;
      target.alive = player.alive;
      target.x = player.x;
      target.y = player.y;
      target.prevX = player.prevX;
      target.prevY = player.prevY;
      target.dir = player.dir;
      target.trail = player.trail;
      target.progress = Math.min(1, (stamp - player.movedAt) / tickMs);
      target.focus = player.id === myId;
      // 내 말에는 이름을 안 붙인다. 링이 이미 어느 것인지 말해 준다.
      target.label = player.id !== myId && player.name.length > 0 ? player.name : undefined;
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
