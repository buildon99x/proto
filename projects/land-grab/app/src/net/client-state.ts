/**
 * 서버가 보내 준 것을 쌓아 두는 곳. 화면도 검사 하네스도 같은 것을 본다.
 *
 * 여기에는 **판단이 없다.** 충돌도 점령도 서버가 정하고, 이쪽은 받은 대로 기록만
 * 한다. 클라이언트가 규칙을 한 줄이라도 다시 계산하는 순간 두 구현이 갈라진다.
 */

import { PLAYER_TICK_MS, WORLD_BOARD_SIZE, WORLD_VIEW_TILES } from "../game/config";
import { DIRECTIONS, type Cell, type Direction } from "../game/types";
import {
  ByteReader,
  ByteWriter,
  ClientMessage,
  PLAYER_FLAG_ALIVE,
  PLAYER_FLAG_TRAIL,
  PROTOCOL_VERSION,
  ServerMessage,
  directionCode,
  directionFromCode
} from "./protocol";

export type NetPlayer = {
  id: number;
  name: string;
  x: number;
  y: number;
  dir: Direction;
  alive: boolean;
  hasTrail: boolean;
  trail: Cell[];
};

export type NetScore = {
  score: number;
  tiles: number;
  kills: number;
  rank: number;
  total: number;
};

export type NetGameOver = {
  score: number;
  peakTiles: number;
  kills: number;
  rank: number;
  total: number;
  survivalMs: number;
  killerId: number;
};

export type NetDeath = {
  id: number;
  killerId: number;
  x: number;
  y: number;
};

/** 한 번에 들고 있을 사망 연출 수. 넘치면 오래된 것부터 버린다. */
const DEATH_BUFFER = 32;

export class NetWorld {
  mapSize = WORLD_BOARD_SIZE;
  tickMs = PLAYER_TICK_MS;
  viewTiles = WORLD_VIEW_TILES;

  /** 내 유닛 번호. 아직 자리를 못 받았으면 `null`. */
  myId: number | null = null;

  /** 타일 소유자. 서버에서 받은 칸만 값이 들어 있다. */
  owner: Uint8Array;
  /** 그 칸을 실제로 받아 본 적이 있는지. 안 받은 칸은 그리지 않는다. */
  known: Uint8Array;

  readonly players = new Map<number, NetPlayer>();
  leaderboard: Array<{ id: number; name: string; score: number }> = [];
  score: NetScore = { score: 0, tiles: 0, kills: 0, rank: 0, total: 0 };
  gameOver: NetGameOver | null = null;
  rejected: number | null = null;

  /** 연출용. 읽어 간 쪽이 비운다. */
  deaths: NetDeath[] = [];

  /** 서버가 보낸 Ping 에 그대로 돌려줄 응답. 없으면 `null`. */
  private pendingPong: number | null = null;

  constructor(mapSize = WORLD_BOARD_SIZE) {
    this.mapSize = mapSize;
    this.owner = new Uint8Array(mapSize * mapSize);
    this.known = new Uint8Array(mapSize * mapSize);
  }

  index(x: number, y: number): number {
    return y * this.mapSize + x;
  }

  ownerAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.mapSize || y >= this.mapSize) {
      return 0;
    }
    return this.owner[this.index(x, y)];
  }

  isKnown(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapSize || y >= this.mapSize) {
      return false;
    }
    return this.known[this.index(x, y)] === 1;
  }

  get me(): NetPlayer | null {
    return this.myId === null ? null : (this.players.get(this.myId) ?? null);
  }

  /** 서버가 Ping 을 보냈으면 돌려줄 Pong 바이트. 없으면 `null`. */
  takePong(): Uint8Array | null {
    if (this.pendingPong === null) {
      return null;
    }
    const writer = new ByteWriter(8);
    writer.u8(ClientMessage.Pong).u32(this.pendingPong);
    this.pendingPong = null;
    return writer.finish();
  }

  takeDeaths(): NetDeath[] {
    const drained = this.deaths;
    this.deaths = [];
    return drained;
  }

  apply(bytes: Uint8Array): void {
    const reader = new ByteReader(bytes);
    const kind = reader.u8();

    switch (kind) {
      case ServerMessage.Welcome: {
        const version = reader.u16();
        const mapSize = reader.u16();
        this.myId = reader.u8();
        this.tickMs = reader.u16();
        this.viewTiles = reader.u16();
        if (version !== PROTOCOL_VERSION) {
          this.rejected = version;
        }
        this.resize(mapSize);
        this.gameOver = null;
        return;
      }
      case ServerMessage.Reject: {
        this.rejected = reader.u8();
        return;
      }
      case ServerMessage.Tiles: {
        const x = reader.u16();
        const y = reader.u16();
        const w = reader.u16();
        const h = reader.u16();
        for (let row = 0; row < h; row += 1) {
          const line = reader.raw(w);
          const at = this.index(x, y + row);
          this.owner.set(line, at);
          this.known.fill(1, at, at + w);
        }
        return;
      }
      case ServerMessage.Players: {
        const count = reader.u8();
        for (let i = 0; i < count; i += 1) {
          const id = reader.u8();
          const x = reader.u16();
          const y = reader.u16();
          const dir = directionFromCode(reader.u8()) ?? DIRECTIONS[0];
          const flags = reader.u8();
          this.movePlayer(id, x, y, dir, (flags & PLAYER_FLAG_ALIVE) !== 0, (flags & PLAYER_FLAG_TRAIL) !== 0);
        }
        return;
      }
      case ServerMessage.Trail: {
        const id = reader.u8();
        const length = reader.u16();
        const trail: Cell[] = [];
        for (let i = 0; i < length; i += 1) {
          trail.push({ x: reader.u16(), y: reader.u16() });
        }
        const player = this.ensurePlayer(id);
        player.trail = trail;
        return;
      }
      case ServerMessage.Remove: {
        this.players.delete(reader.u8());
        return;
      }
      case ServerMessage.Name: {
        const id = reader.u8();
        this.ensurePlayer(id).name = reader.text();
        return;
      }
      case ServerMessage.Death: {
        const id = reader.u8();
        const killerId = reader.u8();
        const x = reader.u16();
        const y = reader.u16();
        this.deaths.push({ id, killerId, x, y });
        if (this.deaths.length > DEATH_BUFFER) {
          this.deaths.splice(0, this.deaths.length - DEATH_BUFFER);
        }
        const player = this.players.get(id);
        if (player) {
          player.alive = false;
          player.trail = [];
        }
        return;
      }
      case ServerMessage.Score: {
        this.score = {
          score: reader.u32(),
          tiles: reader.u32(),
          kills: reader.u16(),
          rank: reader.u16(),
          total: reader.u16()
        };
        return;
      }
      case ServerMessage.Leaderboard: {
        const count = reader.u8();
        const rows: Array<{ id: number; name: string; score: number }> = [];
        for (let i = 0; i < count; i += 1) {
          rows.push({ id: reader.u8(), score: reader.u32(), name: reader.text() });
        }
        this.leaderboard = rows;
        return;
      }
      case ServerMessage.Ping: {
        this.pendingPong = reader.u32();
        return;
      }
      case ServerMessage.GameOver: {
        this.gameOver = {
          score: reader.u32(),
          peakTiles: reader.u32(),
          kills: reader.u16(),
          rank: reader.u16(),
          total: reader.u16(),
          survivalMs: reader.u32(),
          killerId: reader.u8()
        };
        if (this.myId !== null) {
          this.players.delete(this.myId);
          this.myId = null;
        }
        return;
      }
      default:
        // 모르는 메시지는 버린다. 서버가 규약을 늘려도 옛 클라이언트가 죽지 않게.
        return;
    }
  }

  private resize(mapSize: number): void {
    if (mapSize === this.mapSize && this.owner.length === mapSize * mapSize) {
      this.owner.fill(0);
      this.known.fill(0);
    } else {
      this.mapSize = mapSize;
      this.owner = new Uint8Array(mapSize * mapSize);
      this.known = new Uint8Array(mapSize * mapSize);
    }
    this.players.clear();
  }

  private ensurePlayer(id: number): NetPlayer {
    let player = this.players.get(id);
    if (!player) {
      player = { id, name: "", x: 0, y: 0, dir: DIRECTIONS[0], alive: true, hasTrail: false, trail: [] };
      this.players.set(id, player);
    }
    return player;
  }

  /**
   * 위치를 옮기고, 꼬리를 그리는 중이면 지나온 칸을 이어 붙인다.
   *
   * 서버는 꼬리가 **줄었을 때만** 다시 보낸다. 늘어나는 동안은 이쪽이 이어 붙여야
   * 하고, 방송이 밀려 두 칸이 한 번에 오면 사이를 메워야 꼬리에 구멍이 안 생긴다.
   */
  private movePlayer(
    id: number,
    x: number,
    y: number,
    dir: Direction,
    alive: boolean,
    hasTrail: boolean
  ): void {
    const player = this.ensurePlayer(id);
    const first = player.x === 0 && player.y === 0 && player.trail.length === 0 && !player.hasTrail;

    if (hasTrail && !first) {
      const dx = Math.sign(x - player.x);
      const dy = Math.sign(y - player.y);
      const steps = Math.abs(x - player.x) + Math.abs(y - player.y);
      // 직선으로 이어진 경우에만 메운다. 리스폰처럼 순간이동했으면 메우지 않는다.
      if (steps > 0 && (dx === 0 || dy === 0) && steps <= 16) {
        for (let step = 1; step <= steps; step += 1) {
          player.trail.push({ x: player.x + dx * step, y: player.y + dy * step });
        }
      }
    } else if (!hasTrail) {
      player.trail.length = 0;
    }

    player.x = x;
    player.y = y;
    player.dir = dir;
    player.alive = alive;
    player.hasTrail = hasTrail;
  }
}

/** 접속 직후 보내는 첫 메시지. 이름과 규약 버전을 맞춘다. */
export function encodeHello(name: string): Uint8Array {
  const writer = new ByteWriter(48);
  writer.u8(ClientMessage.Hello).u16(PROTOCOL_VERSION).text(name);
  return writer.finish();
}

export function encodeDirection(dir: Direction): Uint8Array {
  const writer = new ByteWriter(4);
  writer.u8(ClientMessage.Direction).u8(directionCode(dir));
  return writer.finish();
}

export function encodeRespawn(): Uint8Array {
  const writer = new ByteWriter(2);
  writer.u8(ClientMessage.Respawn);
  return writer.finish();
}
