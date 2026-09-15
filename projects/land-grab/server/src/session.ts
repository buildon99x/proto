/**
 * 접속 하나. 소켓이 아니라 **바이트를 주고받는 구멍**(`Sink`)에만 기댄다.
 * 그래서 소켓 없이도 세션을 그대로 돌려 검사할 수 있다.
 */

import {
  ByteReader,
  ByteWriter,
  ClientMessage,
  PLAYER_FLAG_ALIVE,
  PLAYER_FLAG_TRAIL,
  PROTOCOL_VERSION,
  RejectReason,
  ServerMessage,
  directionCode,
  directionFromCode,
  sanitizeName
} from "../../app/src/net/protocol";
import { LEADERBOARD_SIZE, PLAYER_TICK_MS } from "../../app/src/game/config";
import type { MatchEvent } from "../../app/src/game/engine";
import type { PlayerId } from "../../app/src/game/types";
import { ViewportSync, type Rect } from "./viewport";
import type { World } from "./world";

/**
 * 한 번에 보내는 타일 사각형의 한 변.
 * 화면(44칸)보다 훨씬 넓게 잡아 두어야 카메라가 빈 칸을 보지 않는다.
 */
export const VIEW_SPAN = 96;

/**
 * 중심이 가장자리에서 이만큼 안으로 들어오면 사각형을 다시 잡는다.
 * **화면 반폭(22)보다 커야 한다** — 작으면 다시 잡기 전에 화면이 보낸 영역을 넘는다.
 */
export const VIEW_MARGIN = 32;

/** 상대 목록에 넣을 여유. 화면 밖에서 들어오는 상대가 갑자기 튀어나오지 않게 한다. */
const PLAYER_PAD = 4;

/** 보낸 것이 이만큼 쌓여 있으면 타일 전송을 한 주기 쉰다. 느린 회선이 서버를 잡아먹지 않게. */
const BACKPRESSURE_BYTES = 512 * 1024;

const SCORE_INTERVAL_MS = 500;
const LEADERBOARD_INTERVAL_MS = 1_000;

export type Sink = {
  send(bytes: Uint8Array): void;
  close(code: number, reason: string): void;
  /** 아직 회선으로 나가지 못하고 쌓여 있는 바이트. */
  readonly buffered: number;
};

export class Session {
  /** 자리에 앉아 있으면 유닛 번호, 아니면 `null`. */
  id: PlayerId | null = null;
  name = "";
  /** 죽어서 결과를 받은 상태. 클라이언트의 재입장을 기다린다. */
  waiting = false;
  closed = false;
  lastPongAt = Date.now();

  private readonly view: ViewportSync;
  /** 이름을 이미 보낸 상대들. 시야를 벗어나면 지운다. */
  private readonly known = new Set<number>();
  /** 상대별로 마지막에 맞춰 둔 꼬리 길이. 줄었을 때만 다시 보낸다. */
  private readonly trailLength = new Map<number, number>();
  private scoreAccMs = 0;
  private leaderboardAccMs = 0;
  private pingToken = 0;

  constructor(
    private readonly world: World,
    private readonly sink: Sink
  ) {
    this.view = new ViewportSync(world.boardSize, VIEW_SPAN, VIEW_MARGIN);
  }

  // --- 받기 ---

  /**
   * 클라이언트 메시지 하나를 처리한다.
   * 잘린 메시지는 예외를 던지므로 호출부가 잡아 접속을 닫는다.
   */
  receive(bytes: Uint8Array): void {
    if (this.closed || bytes.length === 0) {
      return;
    }
    const reader = new ByteReader(bytes);
    const kind = reader.u8();

    switch (kind) {
      case ClientMessage.Hello:
        this.onHello(reader);
        return;
      case ClientMessage.Direction:
        this.onDirection(reader);
        return;
      case ClientMessage.Pong:
        reader.u32();
        this.lastPongAt = Date.now();
        return;
      case ClientMessage.Respawn:
        this.onRespawn();
        return;
      default:
        // 모르는 메시지는 버린다. 규약이 늘어나도 옛 서버가 죽지 않게.
        return;
    }
  }

  private onHello(reader: ByteReader): void {
    if (this.id !== null || this.waiting) {
      return;
    }
    const version = reader.u16();
    if (version !== PROTOCOL_VERSION) {
      this.reject(RejectReason.Version);
      return;
    }
    this.name = sanitizeName(reader.text());
    this.enter();
  }

  private onDirection(reader: ByteReader): void {
    if (this.id === null) {
      return;
    }
    const dir = directionFromCode(reader.u8());
    if (dir) {
      // 클라이언트가 보내는 것은 방향뿐이다. 위치는 절대 받지 않는다.
      this.world.steer(this.id, dir);
    }
  }

  private onRespawn(): void {
    if (this.id !== null || !this.waiting) {
      return;
    }
    this.waiting = false;
    this.enter();
  }

  private enter(): void {
    const joined = this.world.join(this.name);
    if (!joined) {
      this.reject(RejectReason.Full);
      return;
    }

    this.id = joined.runner.id;
    this.view.reset();
    this.known.clear();
    this.trailLength.clear();

    const writer = new ByteWriter(16);
    writer
      .u8(ServerMessage.Welcome)
      .u16(PROTOCOL_VERSION)
      .u16(this.world.boardSize)
      .u8(this.id)
      .u16(PLAYER_TICK_MS)
      .u16(this.world.viewTiles);
    this.sink.send(writer.finish());

    // 첫 화면은 통째로 보낸다. 조각 전송은 그다음부터다.
    for (const rect of this.view.follow(joined.runner.x, joined.runner.y)) {
      this.sendTiles(rect);
    }
    this.sendName(this.id);
    this.sendLeaderboard();
    this.sendScore();
  }

  // --- 보내기 ---

  /**
   * 한 방송 주기. 순서가 중요하다 — 타일을 먼저 맞추고 그 위에 사람을 얹는다.
   * 반대로 하면 아직 없는 땅 위에 상대가 서 있는 한 프레임이 보인다.
   */
  tick(deltaMs: number, dirty: Rect[], deaths: MatchEvent[]): void {
    if (this.closed) {
      return;
    }

    if (this.id === null) {
      return;
    }

    const runner = this.world.runnerOf(this.id);
    if (!runner) {
      // 세계에서 자리가 사라졌는데 결과를 못 받은 경우. 접속만 정리한다.
      this.id = null;
      return;
    }

    const relaxed = this.sink.buffered < BACKPRESSURE_BYTES;

    if (relaxed) {
      for (const rect of this.view.follow(runner.x, runner.y)) {
        this.sendTiles(rect);
      }
      for (const rect of dirty) {
        const clipped = this.view.clip(rect);
        if (clipped) {
          this.sendTiles(clipped);
        }
      }
    }

    this.syncPlayers();
    this.sendDeaths(deaths);

    this.scoreAccMs += deltaMs;
    if (this.scoreAccMs >= SCORE_INTERVAL_MS) {
      this.scoreAccMs = 0;
      this.sendScore();
    }

    this.leaderboardAccMs += deltaMs;
    if (this.leaderboardAccMs >= LEADERBOARD_INTERVAL_MS) {
      this.leaderboardAccMs = 0;
      this.sendLeaderboard();
    }
  }

  /** 응답이 있는지 확인한다. 클라이언트의 Pong 은 회선을 살아 있게도 만든다. */
  ping(): void {
    this.pingToken = (this.pingToken + 1) >>> 0;
    const writer = new ByteWriter(8);
    writer.u8(ServerMessage.Ping).u32(this.pingToken);
    this.sink.send(writer.finish());
  }

  reject(reason: number): void {
    const writer = new ByteWriter(4);
    writer.u8(ServerMessage.Reject).u8(reason);
    this.sink.send(writer.finish());
    this.sink.close(1008, `rejected:${reason}`);
    this.closed = true;
  }

  /** 접속이 끊겼다. 세계에서 자리를 비운다. */
  dispose(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    if (this.id !== null) {
      this.world.leave(this.id);
      this.id = null;
    }
  }

  private sendTiles(rect: Rect): void {
    const board = this.world.match.board;
    const writer = new ByteWriter(9 + rect.w * rect.h);
    writer.u8(ServerMessage.Tiles).u16(rect.x).u16(rect.y).u16(rect.w).u16(rect.h);
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      const from = board.index(rect.x, y);
      writer.raw(board.owner.subarray(from, from + rect.w));
    }
    this.sink.send(writer.finish());
  }

  private sendName(id: number): void {
    const writer = new ByteWriter(32);
    writer.u8(ServerMessage.Name).u8(id).text(this.world.nameOf(id));
    this.sink.send(writer.finish());
  }

  /**
   * 시야 안의 사람들을 맞춘다.
   *
   * 꼬리는 매 주기 통째로 보내지 않는다 — 20명이 각자 100칸을 끌고 다니면 초당 수십
   * KB 가 된다. 대신 **길이가 줄었을 때만** 다시 보내고, 늘어나는 동안에는 클라이언트가
   * 위치 갱신으로 이어 붙인다. 점령·사망은 길이를 0으로 만드니 그때 한 번 나간다.
   */
  private syncPlayers(): void {
    const box = this.view.current;
    if (!box) {
      return;
    }

    const left = box.x - PLAYER_PAD;
    const top = box.y - PLAYER_PAD;
    const right = box.x + box.w + PLAYER_PAD;
    const bottom = box.y + box.h + PLAYER_PAD;

    const visible = this.world.match.runners.filter(
      (runner) => runner.x >= left && runner.x < right && runner.y >= top && runner.y < bottom
    );

    const seen = new Set<number>();
    const writer = new ByteWriter(8 + visible.length * 7);
    writer.u8(ServerMessage.Players).u8(Math.min(255, visible.length));

    for (const runner of visible.slice(0, 255)) {
      seen.add(runner.id);
      let flags = 0;
      if (runner.alive) flags |= PLAYER_FLAG_ALIVE;
      if (runner.trail.length > 0) flags |= PLAYER_FLAG_TRAIL;
      writer.u8(runner.id).u16(runner.x).u16(runner.y).u8(directionCode(runner.dir)).u8(flags);
    }
    this.sink.send(writer.finish());

    for (const runner of visible) {
      if (!this.known.has(runner.id)) {
        this.known.add(runner.id);
        this.sendName(runner.id);
        this.sendTrail(runner.id, runner.trail);
        this.trailLength.set(runner.id, runner.trail.length);
        continue;
      }
      const previous = this.trailLength.get(runner.id) ?? 0;
      if (runner.trail.length < previous) {
        this.sendTrail(runner.id, runner.trail);
      }
      this.trailLength.set(runner.id, runner.trail.length);
    }

    for (const id of [...this.known]) {
      if (seen.has(id)) {
        continue;
      }
      this.known.delete(id);
      this.trailLength.delete(id);
      const writer = new ByteWriter(4);
      writer.u8(ServerMessage.Remove).u8(id);
      this.sink.send(writer.finish());
    }
  }

  private sendTrail(id: number, trail: Array<{ x: number; y: number }>): void {
    const writer = new ByteWriter(4 + trail.length * 4);
    writer.u8(ServerMessage.Trail).u8(id).u16(trail.length);
    for (const cell of trail) {
      writer.u16(cell.x).u16(cell.y);
    }
    this.sink.send(writer.finish());
  }

  private sendDeaths(deaths: MatchEvent[]): void {
    const box = this.view.current;
    for (const event of deaths) {
      if (event.type !== "death") {
        continue;
      }
      if (event.id === this.id) {
        this.sendGameOver(event);
        continue;
      }
      const inView =
        box !== null &&
        event.x >= box.x &&
        event.x < box.x + box.w &&
        event.y >= box.y &&
        event.y < box.y + box.h;
      if (!inView) {
        continue;
      }
      const writer = new ByteWriter(8);
      writer.u8(ServerMessage.Death).u8(event.id).u8(event.killerId ?? 0).u16(event.x).u16(event.y);
      this.sink.send(writer.finish());
    }
  }

  private sendGameOver(event: Extract<MatchEvent, { type: "death" }>): void {
    if (this.id === null) {
      return;
    }
    const id = this.id;
    const board = this.world.scoreboardFor(id);
    const runner = this.world.runnerOf(id);
    const writer = new ByteWriter(24);
    writer
      .u8(ServerMessage.GameOver)
      .u32(board.score)
      .u32(runner?.peakTiles ?? 0)
      .u16(board.kills)
      .u16(board.rank)
      .u16(board.total)
      .u32(this.world.survivalMs(id))
      .u8(event.killerId ?? 0);
    this.sink.send(writer.finish());

    // io 문법: 죽으면 그걸로 끝이다. 자리를 비우고 다시 들어오게 한다.
    this.world.leave(id);
    this.id = null;
    this.waiting = true;
    this.known.clear();
    this.trailLength.clear();
    this.view.reset();
  }

  private sendScore(): void {
    if (this.id === null) {
      return;
    }
    const board = this.world.scoreboardFor(this.id);
    const writer = new ByteWriter(16);
    writer
      .u8(ServerMessage.Score)
      .u32(board.score)
      .u32(board.tiles)
      .u16(board.kills)
      .u16(board.rank)
      .u16(board.total);
    this.sink.send(writer.finish());
  }

  private sendLeaderboard(): void {
    const rows = this.world.leaderboard(LEADERBOARD_SIZE);
    const writer = new ByteWriter(16 + rows.length * 32);
    writer.u8(ServerMessage.Leaderboard).u8(rows.length);
    for (const row of rows) {
      writer.u8(row.id).u32(row.score).text(row.name);
    }
    this.sink.send(writer.finish());
  }
}
