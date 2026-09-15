/**
 * 서버가 들고 도는 세계 하나. splix 의 `Game` 에 해당한다.
 *
 * 시뮬레이션은 브라우저와 **같은 코드**를 쓴다(`app/src/game`). 서버에서 다시 짜면
 * 두 구현이 갈라지고, 그 순간부터 "클라이언트에서는 산 것 같은데 서버는 죽었다"를
 * 디버깅하게 된다. 여기서 새로 하는 일은 세 가지뿐이다.
 *
 * 1. 고정 간격으로 `Match.update` 를 돌린다.
 * 2. 접속이 들어오고 나가는 것을 자리 추가·제거로 옮긴다.
 * 3. 바뀐 타일을 사각형 목록으로 모아 둔다. 연결별 시야 동기화가 이걸 쓴다.
 */

import { AiController } from "../../app/src/game/ai";
import { Match, type MatchEvent } from "../../app/src/game/engine";
import { findDifficulty, PLAYER_TICK_MS, WORLD_VIEW_TILES } from "../../app/src/game/config";
import type { Cell, Direction, PlayerId, Runner } from "../../app/src/game/types";
import type { Rect } from "./viewport";

/** 한 번에 처리할 최대 시간. 이벤트 루프가 밀렸을 때 수십 틱이 한꺼번에 도는 것을 막는다. */
const MAX_CATCHUP_MS = 250;

/**
 * 한 세계가 받는 사람 수 상한.
 * 소유자 코드가 1바이트라 봇까지 합쳐 254를 넘길 수 없다. 여유를 크게 둔 값이다.
 */
export const MAX_HUMANS = 64;

export type WorldOptions = {
  seed?: number;
  /** 시뮬레이션 한 걸음의 길이(ms). 짧을수록 정확하고 CPU 를 더 쓴다. */
  stepMs?: number;
  difficultyId?: "easy" | "normal" | "hard";
};

export type Joined = {
  runner: Runner;
  name: string;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boundsOf(cells: Cell[]): Rect | null {
  if (cells.length === 0) {
    return null;
  }
  let minX = cells[0].x;
  let maxX = cells[0].x;
  let minY = cells[0].y;
  let maxY = cells[0].y;
  for (let i = 1; i < cells.length; i += 1) {
    const cell = cells[i];
    if (cell.x < minX) minX = cell.x;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.y > maxY) maxY = cell.y;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export class World {
  readonly match: Match;
  readonly stepMs: number;
  readonly startedAt = Date.now();

  private readonly ai: AiController;
  private readonly names = new Map<number, string>();
  /** 자리에 앉은 시각(경기 경과 ms). 생존 시간을 여기서 뺀다. */
  private readonly joinedAt = new Map<number, number>();
  private carryMs = 0;

  /** 이번 방송 주기에 바뀐 타일 영역들. 연결별로 잘라 내보낸 뒤 비운다. */
  private dirty: Rect[] = [];
  /** 이번 주기에 죽은 사람들. 서버가 결과를 보내고 자리를 비운다. */
  private deaths: MatchEvent[] = [];
  /**
   * 직전 걸음의 생존 여부. 봇이 되살아나면 `claimHome` 으로 새 영토가 생기는데,
   * 그건 이벤트로 나오지 않는다. 죽음→생존 전이를 직접 보고 그 자리를 갱신 대상에 넣는다.
   */
  private readonly aliveSeen = new Map<number, boolean>();

  constructor(options: WorldOptions = {}) {
    const { seed = Date.now(), stepMs = 50, difficultyId = "normal" } = options;
    this.stepMs = stepMs;
    this.match = new Match(findDifficulty(difficultyId), {
      mode: "world",
      shared: true,
      seed
    });
    // 서버가 권위를 가지려면 모든 난수가 시드에서 나와야 한다. 기본값인 `Math.random`
    // 을 그대로 두면 같은 시드로도 판이 재현되지 않는다.
    this.ai = new AiController(this.match, this.match.difficulty, mulberry32(seed ^ 0x5bf03635));
  }

  get boardSize(): number {
    return this.match.board.size;
  }

  get viewTiles(): number {
    return WORLD_VIEW_TILES;
  }

  get humanCount(): number {
    return this.match.runners.reduce((total, runner) => total + (runner.kind === "human" ? 1 : 0), 0);
  }

  get botCount(): number {
    return this.match.runners.length - this.humanCount;
  }

  nameOf(id: number): string {
    return this.names.get(id) ?? `봇${id}`;
  }

  runnerOf(id: number): Runner | undefined {
    return this.match.runners.find((runner) => runner.id === id);
  }

  /** 세계에 자리를 하나 연다. 가득 찼으면 `null`. */
  join(name: string): Joined | null {
    if (this.humanCount >= MAX_HUMANS) {
      return null;
    }
    const runner = this.match.addRunner("human", PLAYER_TICK_MS);
    if (!runner) {
      return null;
    }
    this.names.set(runner.id, name);
    this.joinedAt.set(runner.id, this.match.elapsedMs);
    // 새 영토가 생겼으니 그 자리를 보고 있는 접속들에게 알려야 한다.
    this.markDirtyAround(runner.x, runner.y, 3);
    return { runner, name };
  }

  leave(id: PlayerId): void {
    if (this.runnerOf(id)) {
      // 지워지기 전에 영토 상자를 재 둔다. 지운 뒤에는 상자가 비어 있어 알 수 없다.
      this.markDirtyBounds(id);
    }
    this.match.removeRunner(id);
    this.names.delete(id);
    this.joinedAt.delete(id);
    this.aliveSeen.delete(id);
  }

  /** 접속이 앉아 있던 시간(ms). */
  survivalMs(id: number): number {
    const from = this.joinedAt.get(id);
    return from === undefined ? 0 : Math.max(0, Math.round(this.match.elapsedMs - from));
  }

  steer(id: PlayerId, dir: Direction): void {
    const runner = this.runnerOf(id);
    if (runner) {
      this.match.queueDirection(runner, dir);
    }
  }

  /**
   * 실제로 흐른 시간만큼 세계를 굴린다.
   * 남는 시간은 다음 호출로 넘긴다 — 버리면 세계가 조금씩 느려진다.
   */
  advance(deltaMs: number): void {
    this.carryMs += Math.min(Math.max(deltaMs, 0), MAX_CATCHUP_MS);

    while (this.carryMs >= this.stepMs) {
      this.carryMs -= this.stepMs;
      this.ai.update();
      this.match.update(this.stepMs);
      this.collect();
    }
  }

  /** 이번 주기에 죽은 사람들. 읽으면 비워진다. */
  drainDeaths(): MatchEvent[] {
    const drained = this.deaths;
    this.deaths = [];
    return drained;
  }

  /** 이번 주기에 바뀐 타일 영역들. 읽으면 비워진다. */
  drainDirty(): Rect[] {
    const drained = this.dirty;
    this.dirty = [];
    return drained;
  }

  /** 상위 몇 명. 이름은 접속이 보낸 것으로 바꿔 넣는다. */
  leaderboard(limit: number): Array<{ id: number; name: string; score: number }> {
    return this.match.leaderboard(limit).map((standing) => ({
      id: standing.id,
      name: this.nameOf(standing.id),
      score: standing.score
    }));
  }

  /** 점수·순위·땅·킬. 접속 하나에 주기적으로 보내는 값이다. */
  scoreboardFor(id: number): { score: number; tiles: number; kills: number; rank: number; total: number } {
    const standings = this.match.standings();
    const rank = standings.findIndex((standing) => standing.id === id) + 1;
    const mine = standings.find((standing) => standing.id === id);
    return {
      score: mine?.score ?? 0,
      tiles: mine?.tiles ?? 0,
      kills: mine?.kills ?? 0,
      rank: rank > 0 ? rank : standings.length,
      total: standings.length
    };
  }

  private collect(): void {
    for (const runner of this.match.runners) {
      const was = this.aliveSeen.get(runner.id);
      if (was === false && runner.alive) {
        // 되살아난 자리에는 시작 영토가 새로 깔린다. `HOME_RADIUS` 보다 넉넉히 잡는다.
        this.markDirtyAround(runner.x, runner.y, 3);
      }
      this.aliveSeen.set(runner.id, runner.alive);
    }

    const events = this.match.drainEvents();
    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      const box = boundsOf(event.cells);
      if (box) {
        this.dirty.push(box);
      }
      if (event.type === "death") {
        this.deaths.push(event);
      }
    }
  }

  private markDirtyBounds(id: number): void {
    const box = this.match.board.boundsOf(id);
    if (box) {
      this.dirty.push({
        x: box.minX,
        y: box.minY,
        w: box.maxX - box.minX + 1,
        h: box.maxY - box.minY + 1
      });
    }
  }

  private markDirtyAround(x: number, y: number, radius: number): void {
    const size = this.boardSize;
    const left = Math.max(0, x - radius);
    const top = Math.max(0, y - radius);
    const right = Math.min(size - 1, x + radius);
    const bottom = Math.min(size - 1, y + radius);
    this.dirty.push({ x: left, y: top, w: right - left + 1, h: bottom - top + 1 });
  }
}
