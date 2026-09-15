/**
 * 서버와의 접속 하나. 소켓의 지저분한 부분을 여기서 끝낸다.
 *
 * 화면은 `phase` 와 `message` 만 보고 무엇을 띄울지 정하면 된다.
 * 규칙 판단은 한 줄도 하지 않는다 — 전부 서버가 정한 것을 받아 적을 뿐이다.
 */

import type { Direction } from "../game/types";
import { NetWorld, encodeDirection, encodeHello, encodeRespawn } from "./client-state";
import { REJECT_TEXT } from "./protocol";
import { serverSocketUrl, wakeServer } from "./endpoint";

export type ConnectionPhase =
  /** 잠든 인스턴스를 깨우는 중. Free 플랜이라 1분까지 걸린다. */
  | "waking"
  /** 소켓을 여는 중. */
  | "connecting"
  /** 세계 안에 있다. */
  | "playing"
  /** 죽었다. 결과를 보여 주고 재입장을 기다린다. */
  | "over"
  /** 접속이 끊겼다. */
  | "closed"
  /** 더 진행할 수 없다. `message` 에 이유가 있다. */
  | "error";

export class Connection {
  readonly world = new NetWorld();
  phase: ConnectionPhase = "waking";
  message = "서버를 깨우는 중…";
  /** 깨우기를 기다린 시간(ms). 대기 화면이 이걸 보여 준다. */
  waitedMs = 0;

  private socket: WebSocket | null = null;
  private lastSentDir: Direction | null = null;
  private disposed = false;

  constructor(private readonly onUpdate: () => void) {}

  async start(name: string): Promise<void> {
    const woken = await wakeServer(90_000, (waitedMs) => {
      this.waitedMs = waitedMs;
      this.message = `서버를 깨우는 중… ${Math.round(waitedMs / 1000)}초`;
      this.onUpdate();
    });

    if (this.disposed) {
      return;
    }

    if (woken.state === "unreachable") {
      this.fail(`서버에 닿지 못했습니다 (${woken.reason}).`);
      return;
    }

    this.set("connecting", "접속하는 중…");
    this.open(name);
  }

  /**
   * 방향을 보낸다. **같은 방향은 다시 보내지 않는다** — 키를 누르고 있으면
   * 초당 수십 번이 되는데, 서버는 칸 경계에서 한 번만 받는다.
   */
  steer(dir: Direction): void {
    if (this.phase !== "playing" || dir === this.lastSentDir) {
      return;
    }
    this.lastSentDir = dir;
    this.send(encodeDirection(dir));
  }

  /** 죽은 뒤 다시 들어간다. */
  again(): void {
    if (this.phase !== "over") {
      return;
    }
    this.lastSentDir = null;
    this.world.gameOver = null;
    this.send(encodeRespawn());
    this.set("playing", "");
  }

  dispose(): void {
    this.disposed = true;
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, "leaving");
  }

  private open(name: string): void {
    let socket: WebSocket;
    try {
      socket = new WebSocket(serverSocketUrl());
    } catch (error) {
      this.fail(`소켓을 열지 못했습니다 (${describe(error)}).`);
      return;
    }

    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.onopen = () => {
      if (this.disposed) {
        socket.close();
        return;
      }
      socket.send(encodeHello(name));
    };

    socket.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.disposed) {
        return;
      }
      try {
        this.world.apply(new Uint8Array(event.data));
      } catch (error) {
        // 규약이 어긋났다. 이 뒤의 메시지도 어긋나므로 접속을 닫는 편이 낫다.
        this.fail(`서버 메시지를 읽지 못했습니다 (${describe(error)}).`);
        socket.close(1002, "protocol");
        return;
      }

      const pong = this.world.takePong();
      if (pong) {
        socket.send(pong);
      }
      this.settle();
    };

    socket.onerror = () => {
      if (!this.disposed && this.phase !== "error") {
        this.fail("연결이 실패했습니다.");
      }
    };

    socket.onclose = () => {
      if (this.disposed || this.phase === "error") {
        return;
      }
      this.set("closed", "서버와 연결이 끊겼습니다.");
    };
  }

  /** 받아 적은 상태를 보고 지금 어느 단계인지 정한다. */
  private settle(): void {
    const world = this.world;

    if (world.rejected !== null) {
      this.fail(REJECT_TEXT[world.rejected] ?? `서버가 접속을 거절했습니다 (${world.rejected}).`);
      this.socket?.close(1000, "rejected");
      return;
    }

    if (world.gameOver !== null) {
      this.set("over", "");
      return;
    }

    if (world.myId !== null && this.phase !== "playing") {
      this.lastSentDir = null;
      this.set("playing", "");
      return;
    }

    this.onUpdate();
  }

  private send(bytes: Uint8Array): void {
    const socket = this.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(bytes);
    }
  }

  private set(phase: ConnectionPhase, message: string): void {
    this.phase = phase;
    this.message = message;
    this.onUpdate();
  }

  private fail(message: string): void {
    this.set("error", message);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
