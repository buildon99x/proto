/**
 * 온라인 세계의 전송 규약 v1.
 *
 * 전부 **바이너리**다. splix 서버가 그랬듯 위치 갱신은 초당 여러 번 나가고,
 * JSON 으로 싸면 같은 내용이 대여섯 배가 된다. 브라우저와 서버가 이 파일 하나를
 * 같이 쓰므로 Node 전용 API 는 쓰지 않는다.
 *
 * 바이트 순서는 **리틀 엔디언**으로 고정한다. `DataView` 기본값이 빅 엔디언이라
 * 모든 호출에 `true` 를 넘긴다 — 한 군데라도 빠지면 좌표가 뒤집힌다.
 */

import type { Direction } from "../game/types";

/** 클라이언트가 캐시될 수 있어 버전 불일치는 반드시 생긴다. 첫 메시지로 맞춘다. */
export const PROTOCOL_VERSION = 1;

export const ClientMessage = {
  /** u16 version, u8 nameLen, name(utf8) */
  Hello: 0x01,
  /** u8 direction */
  Direction: 0x02,
  /** u32 token — 서버 Ping 에 대한 응답 */
  Pong: 0x03,
  /** 본문 없음 — 죽은 뒤 다시 들어간다 */
  Respawn: 0x04
} as const;

export const ServerMessage = {
  /** u16 version, u16 mapSize, u8 yourId, u16 tickMs, u16 viewTiles */
  Welcome: 0x81,
  /** u8 reason */
  Reject: 0x82,
  /** u16 x, u16 y, u16 w, u16 h, w*h × u8 owner */
  Tiles: 0x83,
  /** u8 count, count × (u8 id, u16 x, u16 y, u8 dir, u8 flags) */
  Players: 0x84,
  /** u8 id, u16 len, len × (u16 x, u16 y) */
  Trail: 0x85,
  /** u8 id */
  Remove: 0x86,
  /** u8 id, u8 killerId, u16 x, u16 y */
  Death: 0x87,
  /** u32 score, u32 tiles, u16 kills, u16 rank, u16 total */
  Score: 0x88,
  /** u8 count, count × (u8 id, u32 score, u8 nameLen, name) */
  Leaderboard: 0x89,
  /** u8 id, u8 nameLen, name */
  Name: 0x8a,
  /** u32 token */
  Ping: 0x8b,
  /** u32 score, u32 peakTiles, u16 kills, u16 rank, u16 total, u32 survivalMs, u8 killerId */
  GameOver: 0x8c
} as const;

export const RejectReason = {
  /** 클라이언트 버전이 서버와 다르다. 새로고침이 답이다. */
  Version: 1,
  /** 자리가 없다. */
  Full: 2,
  /** 첫 메시지가 Hello 가 아니었다. */
  Handshake: 3
} as const;

export const REJECT_TEXT: Record<number, string> = {
  [RejectReason.Version]: "서버와 버전이 다릅니다. 새로고침해 주세요.",
  [RejectReason.Full]: "세계가 가득 찼습니다. 잠시 뒤 다시 시도해 주세요.",
  [RejectReason.Handshake]: "접속 순서가 올바르지 않습니다."
};

/** 살아 있음. 꺼져 있으면 사망 처리 중이다. */
export const PLAYER_FLAG_ALIVE = 1;
/** 영토 밖이라 꼬리를 그리는 중. 클라이언트가 꼬리를 이어 붙일지 판단한다. */
export const PLAYER_FLAG_TRAIL = 2;

/** 이름 길이 상한(바이트). 한글은 UTF-8 로 3바이트라 한글 8자쯤 된다. */
export const MAX_NAME_BYTES = 24;

const DIRECTION_ORDER: Direction[] = ["up", "right", "down", "left"];

export function directionCode(dir: Direction): number {
  return DIRECTION_ORDER.indexOf(dir);
}

export function directionFromCode(code: number): Direction | null {
  return DIRECTION_ORDER[code] ?? null;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** 눈에 보이지 않는 문자는 이름으로 받지 않는다. 제어 문자와 DEL. */
function isPrintable(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x20 && code !== 0x7f;
}

/**
 * 이름을 규약이 허용하는 길이로 자른다.
 *
 * 바이트 수로 자르면 UTF-8 문자가 중간에서 쪼개져 깨진 글자가 남는다.
 * 그래서 **글자 단위로 줄이면서** 인코딩 길이를 확인한다.
 */
export function sanitizeName(raw: string, fallback = "익명"): string {
  const stripped = Array.from(raw).filter(isPrintable).join("").trim();
  if (stripped.length === 0) {
    return fallback;
  }
  let name = stripped;
  while (textEncoder.encode(name).length > MAX_NAME_BYTES) {
    name = Array.from(name).slice(0, -1).join("");
  }
  return name.length > 0 ? name : fallback;
}

/** 늘어나는 바이트 버퍼. 메시지 하나를 쌓아 올린 뒤 `finish()` 로 꺼낸다. */
export class ByteWriter {
  private bytes: Uint8Array;
  private view: DataView;
  private offset = 0;

  constructor(initial = 64) {
    this.bytes = new Uint8Array(initial);
    this.view = new DataView(this.bytes.buffer);
  }

  private reserve(extra: number): void {
    const needed = this.offset + extra;
    if (needed <= this.bytes.length) {
      return;
    }
    let size = this.bytes.length * 2;
    while (size < needed) {
      size *= 2;
    }
    const next = new Uint8Array(size);
    next.set(this.bytes.subarray(0, this.offset));
    this.bytes = next;
    this.view = new DataView(next.buffer);
  }

  u8(value: number): this {
    this.reserve(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
    return this;
  }

  u16(value: number): this {
    this.reserve(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
    return this;
  }

  u32(value: number): this {
    this.reserve(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
    return this;
  }

  /** 길이(u8)를 앞에 붙인 UTF-8 문자열. */
  text(value: string): this {
    const encoded = textEncoder.encode(value);
    const length = Math.min(encoded.length, 255);
    this.u8(length);
    this.raw(encoded.subarray(0, length));
    return this;
  }

  raw(value: Uint8Array): this {
    this.reserve(value.length);
    this.bytes.set(value, this.offset);
    this.offset += value.length;
    return this;
  }

  /** 쓴 만큼만 잘라 돌려준다. 내부 버퍼를 그대로 넘기면 남는 0 이 같이 나간다. */
  finish(): Uint8Array {
    return this.bytes.slice(0, this.offset);
  }

  get length(): number {
    return this.offset;
  }
}

/**
 * 받은 바이트를 순서대로 읽는다.
 * 끝을 넘겨 읽으면 던진다 — 조용히 0 을 돌려주면 잘린 메시지가 정상처럼 보인다.
 */
export class ByteReader {
  private readonly view: DataView;
  private offset = 0;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private need(count: number): void {
    if (this.offset + count > this.bytes.byteLength) {
      throw new RangeError(`메시지가 짧습니다: ${count}바이트가 더 필요합니다`);
    }
  }

  u8(): number {
    this.need(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  u16(): number {
    this.need(2);
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  u32(): number {
    this.need(4);
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  text(): string {
    const length = this.u8();
    this.need(length);
    const slice = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return textDecoder.decode(slice);
  }

  raw(length: number): Uint8Array {
    this.need(length);
    const slice = this.bytes.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  get remaining(): number {
    return this.bytes.byteLength - this.offset;
  }
}
