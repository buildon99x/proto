import { PALETTE } from "./config";
import type { MatchEvent } from "./engine";
import type { Cell, PlayerId } from "./types";

/** 점령한 영역 위를 훑고 지나가는 사선 쐐기. */
export type CaptureSweep = {
  id: PlayerId;
  cells: Cell[];
  originX: number;
  originY: number;
  ageMs: number;
  lifeMs: number;
  /** 원점에서 가장 먼 칸까지의 거리. 쐐기 진행 속도를 맞추는 데 쓴다. */
  reach: number;
};

/** 사망한 영토가 부서져 나가는 삼각 파편. */
export type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  ageMs: number;
  lifeMs: number;
};

/** 충돌 지점에서 퍼지는 링. */
export type Shockwave = {
  x: number;
  y: number;
  color: string;
  ageMs: number;
  lifeMs: number;
};

const CAPTURE_LIFE_MS = 420;
const SHARD_LIFE_MS = 780;
const SHOCKWAVE_LIFE_MS = 520;
const MAX_SHARDS_PER_DEATH = 220;

/**
 * 연출 전용 상태. 시뮬레이션 결과를 바꾸지 않으며, 여기서 무엇이 사라져도
 * 게임 규칙에는 영향이 없다.
 */
export class Effects {
  readonly sweeps: CaptureSweep[] = [];
  readonly shards: Shard[] = [];
  readonly shockwaves: Shockwave[] = [];

  constructor(private readonly rng: () => number = Math.random) {}

  ingest(events: MatchEvent[]): void {
    for (const event of events) {
      if (event.type === "capture") {
        this.sweeps.push({
          id: event.id,
          cells: event.cells,
          originX: event.originX,
          originY: event.originY,
          ageMs: 0,
          lifeMs: CAPTURE_LIFE_MS,
          reach: this.reachOf(event.cells, event.originX, event.originY)
        });
        continue;
      }

      this.spawnShards(event.cells, PALETTE[event.id].territory);
      this.shockwaves.push({
        x: event.x + 0.5,
        y: event.y + 0.5,
        color: PALETTE[event.killerId ?? event.id].territory,
        ageMs: 0,
        lifeMs: SHOCKWAVE_LIFE_MS
      });
    }
  }

  update(deltaMs: number): void {
    advance(this.sweeps, deltaMs);
    advance(this.shockwaves, deltaMs);

    for (let i = this.shards.length - 1; i >= 0; i -= 1) {
      const shard = this.shards[i];
      shard.ageMs += deltaMs;
      if (shard.ageMs >= shard.lifeMs) {
        this.shards.splice(i, 1);
        continue;
      }
      const step = deltaMs / 1000;
      shard.x += shard.vx * step;
      shard.y += shard.vy * step;
      shard.vx *= 0.94;
      shard.vy *= 0.94;
      shard.rotation += shard.spin * step;
    }
  }

  clear(): void {
    this.sweeps.length = 0;
    this.shards.length = 0;
    this.shockwaves.length = 0;
  }

  private reachOf(cells: Cell[], originX: number, originY: number): number {
    let reach = 1;
    for (const cell of cells) {
      const distance = Math.abs(cell.x - originX) + Math.abs(cell.y - originY);
      if (distance > reach) {
        reach = distance;
      }
    }
    return reach;
  }

  /** 영토가 넓으면 전부 파편으로 만들지 않고 고르게 솎아낸다. */
  private spawnShards(cells: Cell[], color: string): void {
    if (cells.length === 0) {
      return;
    }
    const stride = Math.max(1, Math.ceil(cells.length / MAX_SHARDS_PER_DEATH));

    for (let i = 0; i < cells.length; i += stride) {
      const cell = cells[i];
      const angle = this.rng() * Math.PI * 2;
      const speed = 1.5 + this.rng() * 5.5;
      this.shards.push({
        x: cell.x + 0.5,
        y: cell.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: this.rng() * Math.PI * 2,
        spin: (this.rng() - 0.5) * 10,
        size: 0.35 + this.rng() * 0.4,
        color,
        ageMs: 0,
        lifeMs: SHARD_LIFE_MS * (0.7 + this.rng() * 0.6)
      });
    }
  }
}

function advance<T extends { ageMs: number; lifeMs: number }>(list: T[], deltaMs: number): void {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    list[i].ageMs += deltaMs;
    if (list[i].ageMs >= list[i].lifeMs) {
      list.splice(i, 1);
    }
  }
}
