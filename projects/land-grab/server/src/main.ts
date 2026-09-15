/**
 * 땅따먹기 온라인 세계 서버.
 *
 * 프로세스 하나가 세계 하나를 들고 계속 돈다. 그게 이 게임이 서버리스에 못 올라가는
 * 이유이고, 동시에 구조가 단순한 이유이기도 하다 — 공유 상태가 전부 이 프로세스의
 * 메모리 안에 있어서 외부 저장소가 필요 없다.
 *
 * Render 의 Web Service 로 띄우는 것을 기준으로 맞춰 두었다.
 * - 포트는 `PORT` 환경변수에서 받는다. 없으면 8080.
 * - `0.0.0.0` 에 바인딩한다. 루프백에만 붙으면 헬스 체크가 실패한다.
 * - `/healthz` 가 2xx 를 돌려준다. 무중단 배포의 판단 기준이다.
 * - **인스턴스는 항상 하나여야 한다.** 여러 개로 늘리면 로드 밸런서가 접속을 갈라
 *   같은 세계에 있다고 믿는 사람들이 서로 다른 세계에 앉는다.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import { Session, type Sink } from "./session";
import { World } from "./world";

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

/** 시뮬레이션 한 걸음. 이동은 167ms 마다 일어나므로 50ms 면 칸 경계를 충분히 잘게 쪼갠다. */
const STEP_MS = 50;
/** 방송 주기. 위치는 167ms 마다 바뀌니 100ms 면 한 칸도 놓치지 않는다. */
const BROADCAST_MS = 100;
/** 살아 있는지 확인하는 주기. */
const PING_MS = 15_000;
/** 이 시간 동안 Pong 이 없으면 끊는다. */
const PING_TIMEOUT_MS = 45_000;

const world = new World({ stepMs: STEP_MS, seed: Number.parseInt(process.env.WORLD_SEED ?? "", 10) || Date.now() });
const sessions = new Set<Session>();
const bySocket = new Map<WebSocket, Session>();

function status(): Record<string, unknown> {
  return {
    ok: true,
    protocol: 1,
    mapSize: world.boardSize,
    players: world.humanCount,
    bots: world.botCount,
    connections: sessions.size,
    uptimeMs: Date.now() - world.startedAt
  };
}

const http = createServer((request: IncomingMessage, response: ServerResponse) => {
  const path = (request.url ?? "/").split("?")[0];

  if (path === "/healthz") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ok");
    return;
  }

  if (path === "/" || path === "/status") {
    const body = JSON.stringify(status());
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      // 브라우저 클라이언트가 다른 출처(런처)에서 상태를 읽어 서버가 깨어 있는지 본다.
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    });
    response.end(body);
    return;
  }

  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("not found");
});

const wss = new WebSocketServer({ server: http, path: "/ws", maxPayload: 4096 });

function sinkFor(socket: WebSocket): Sink {
  return {
    send(bytes: Uint8Array): void {
      if (socket.readyState === socket.OPEN) {
        socket.send(bytes, { binary: true });
      }
    },
    close(code: number, reason: string): void {
      try {
        socket.close(code, reason);
      } catch {
        socket.terminate();
      }
    },
    get buffered(): number {
      return socket.bufferedAmount;
    }
  };
}

wss.on("connection", (socket: WebSocket) => {
  const session = new Session(world, sinkFor(socket));
  sessions.add(session);
  bySocket.set(socket, session);

  socket.binaryType = "nodebuffer";

  socket.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    try {
      const bytes = Array.isArray(data)
        ? new Uint8Array(Buffer.concat(data))
        : data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      session.receive(bytes);
    } catch (error) {
      // 잘리거나 규약에 맞지 않는 메시지. 접속을 닫는 편이 안전하다 —
      // 어차피 이 클라이언트는 이후 메시지도 어긋난다.
      console.warn(`[ws] 잘못된 메시지로 접속을 닫습니다: ${(error as Error).message}`);
      socket.close(1002, "protocol");
    }
  });

  const drop = (): void => {
    session.dispose();
    sessions.delete(session);
    bySocket.delete(socket);
  };

  socket.on("close", drop);
  socket.on("error", drop);
});

let lastTickAt = Date.now();

const broadcast = setInterval(() => {
  const now = Date.now();
  const delta = now - lastTickAt;
  lastTickAt = now;

  world.advance(delta);

  const dirty = world.drainDirty();
  const deaths = world.drainDeaths();

  for (const session of sessions) {
    try {
      session.tick(delta, dirty, deaths);
    } catch (error) {
      console.warn(`[tick] 세션 처리 중 오류: ${(error as Error).message}`);
    }
  }
}, BROADCAST_MS);

const heartbeat = setInterval(() => {
  const now = Date.now();
  for (const [socket, session] of bySocket) {
    if (now - session.lastPongAt > PING_TIMEOUT_MS) {
      socket.terminate();
      continue;
    }
    session.ping();
  }
}, PING_MS);

function shutdown(signal: string): void {
  console.log(`[server] ${signal} — 정리하고 종료합니다`);
  clearInterval(broadcast);
  clearInterval(heartbeat);
  for (const socket of bySocket.keys()) {
    socket.close(1001, "going away");
  }
  wss.close();
  http.close(() => process.exit(0));
  // 소켓이 정리되지 않아도 배포가 막히지 않게 상한을 둔다.
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

http.listen(PORT, HOST, () => {
  console.log(`[server] ${HOST}:${PORT} 에서 대기합니다 — 보드 ${world.boardSize}², 봇 ${world.botCount}기`);
});
