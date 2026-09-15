/**
 * 실제 소켓까지 포함한 확인.
 *
 * `check.ts` 는 세션 객체를 직접 돌리므로 HTTP·WebSocket·빌드 산출물은 건드리지
 * 않는다. 여기서는 **빌드된 서버를 진짜로 띄우고** 진짜 WebSocket 으로 붙는다.
 * Render 에 올라갈 때와 같은 경로(`npm run build` → `node dist/main.mjs`)다.
 *
 * 실행: `npm run smoke`
 */

import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import WebSocket from "ws";

import { NetWorld, encodeDirection, encodeHello, encodeRespawn } from "../../app/src/net/client-state";
import type { Direction } from "../../app/src/game/types";

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, "../dist/main.mjs");
const PORT = Number.parseInt(process.env.SMOKE_PORT ?? "18080", 10);
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function waitForHealth(attempts = 60): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${BASE}/healthz`);
      if (response.ok) {
        return true;
      }
    } catch {
      // 아직 안 떴다.
    }
    await sleep(250);
  }
  return false;
}

class Client {
  readonly net = new NetWorld();
  readonly socket: WebSocket;
  received = 0;

  constructor(private readonly name: string) {
    this.socket = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    this.socket.binaryType = "nodebuffer";
    this.socket.on("message", (data: Buffer) => {
      this.received += 1;
      this.net.apply(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      const pong = this.net.takePong();
      if (pong) {
        this.socket.send(pong);
      }
    });
  }

  ready(): Promise<void> {
    return new Promise((done, fail) => {
      this.socket.once("open", () => done());
      this.socket.once("error", fail);
    });
  }

  hello(): void {
    this.socket.send(encodeHello(this.name));
  }

  steer(dir: Direction): void {
    this.socket.send(encodeDirection(dir));
  }

  respawn(): void {
    this.socket.send(encodeRespawn());
  }

  /** 내 땅으로 표시된 칸 수. 시작 영토가 도착했는지 보는 데 쓴다. */
  ownedTiles(): number {
    if (this.net.myId === null) {
      return 0;
    }
    let total = 0;
    for (let i = 0; i < this.net.owner.length; i += 1) {
      if (this.net.owner[i] === this.net.myId) {
        total += 1;
      }
    }
    return total;
  }

  close(): void {
    this.socket.close();
  }
}

async function main(): Promise<void> {
  console.log(`서버를 띄웁니다: ${entry}`);
  const server: ChildProcess = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1", WORLD_SEED: "424242" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  const logs: string[] = [];
  server.stdout?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
  server.stderr?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));

  try {
    const healthy = await waitForHealth();
    check("헬스 체크가 200을 돌려준다", healthy);
    if (!healthy) {
      console.log(logs.join(""));
      return;
    }

    const status = (await (await fetch(`${BASE}/status`)).json()) as Record<string, number>;
    check("상태에 보드 크기가 있다", status.mapSize === 600, `${status.mapSize}`);
    check("빈 서버가 봇으로 차 있다", status.bots > 0, `${status.bots}기`);
    check("아직 사람은 없다", status.players === 0, `${status.players}명`);

    const clients = [new Client("소켓1"), new Client("소켓2"), new Client("소켓3")];
    await Promise.all(clients.map((client) => client.ready()));
    check("세 접속이 모두 열린다", true);

    for (const client of clients) {
      client.hello();
    }
    await sleep(600);

    check(
      "모두 자리를 받는다",
      clients.every((client) => client.net.myId !== null),
      clients.map((client) => client.net.myId).join(",")
    );
    check(
      "모두 시작 영토를 받는다",
      clients.every((client) => client.ownedTiles() >= 25),
      clients.map((client) => client.ownedTiles()).join(",")
    );

    const joined = (await (await fetch(`${BASE}/status`)).json()) as Record<string, number>;
    check("서버가 접속 수를 센다", joined.players === 3, `${joined.players}명`);

    // 몇 초 동안 실제로 돌려 본다. 조작은 오른쪽·아래를 번갈아 밟는 계단이다 —
    // 두 방향이 서로 직각이고 경로가 단조라, 자기 꼬리를 밟을 일이 없다.
    const startPositions = clients.map((client) => ({ ...(client.net.me ?? { x: -1, y: -1 }) }));
    const staircase: Direction[] = ["right", "down"];
    for (let round = 0; round < 12; round += 1) {
      for (const client of clients) {
        if (client.net.gameOver) {
          client.respawn();
          continue;
        }
        client.steer(staircase[round % staircase.length]);
      }
      await sleep(250);
    }

    const moved = clients.filter((client, index) => {
      const me = client.net.me;
      return me !== null && (me.x !== startPositions[index].x || me.y !== startPositions[index].y);
    });
    check("접속이 실제로 움직였다", moved.length === clients.length, `${moved.length}/${clients.length}`);
    check(
      "3초 동안 아무도 죽지 않는다 (안전한 조작 기준)",
      clients.every((client) => client.net.myId !== null),
      clients.map((client) => client.net.myId).join(",")
    );
    check(
      "타일이 계속 흘러온다",
      clients.every((client) => client.received > 30),
      clients.map((client) => client.received).join(",")
    );
    check(
      "순위표가 채워진다",
      clients.every((client) => client.net.leaderboard.length > 0)
    );
    check(
      "서버가 규약 위반으로 끊지 않았다",
      clients.every((client) => client.socket.readyState === WebSocket.OPEN)
    );

    clients[0].close();
    await sleep(500);
    const afterLeave = (await (await fetch(`${BASE}/status`)).json()) as Record<string, number>;
    check("끊으면 접속 수가 준다", afterLeave.players === 2, `${afterLeave.players}명`);

    for (const client of clients.slice(1)) {
      client.close();
    }
    await sleep(300);
  } finally {
    server.kill("SIGTERM");
    await sleep(500);
    if (server.exitCode === null) {
      server.kill("SIGKILL");
    }
  }

  console.log(`\n${failed === 0 ? "소켓 확인 통과" : "실패한 확인이 있습니다"} — ${passed}통과 / ${failed}실패`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
