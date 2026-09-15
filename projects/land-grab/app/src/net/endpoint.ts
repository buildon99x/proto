/**
 * 온라인 세계 서버의 주소를 한 군데서 정한다.
 *
 * 브라우저 전용이다. 서버 코드는 이 파일을 가져다 쓰지 않는다 —
 * `import.meta.env` 는 Vite 가 빌드할 때 채워 넣는 값이라 Node 에는 없다.
 */

/**
 * 빌드 때 `VITE_LAND_GRAB_SERVER` 가 없으면 쓰는 주소.
 *
 * Render 의 Free 인스턴스라 **15분간 인바운드 트래픽이 없으면 잠든다.**
 * 깨어나는 데 1분쯤 걸리므로, 접속 전에 `wakeServer()` 로 먼저 두드린다.
 */
const DEFAULT_SERVER = "https://proto-unfy.onrender.com";

function baseUrl(): string {
  const configured = import.meta.env.VITE_LAND_GRAB_SERVER?.trim();
  const raw = configured && configured.length > 0 ? configured : DEFAULT_SERVER;
  // 뒤에 붙은 슬래시를 떼어 둔다. 그러지 않으면 `//status` 가 된다.
  return raw.replace(/\/+$/, "");
}

export function serverStatusUrl(): string {
  return `${baseUrl()}/status`;
}

export function serverHealthUrl(): string {
  return `${baseUrl()}/healthz`;
}

/** WebSocket 주소. `https` 는 `wss`, `http` 는 `ws` 로 바꾼다. */
export function serverSocketUrl(): string {
  return `${baseUrl().replace(/^http/, "ws")}/ws`;
}

export type ServerStatus = {
  ok: boolean;
  protocol: number;
  mapSize: number;
  players: number;
  bots: number;
  connections: number;
  uptimeMs: number;
};

export type WakeResult =
  | { state: "awake"; status: ServerStatus; waitedMs: number }
  | { state: "unreachable"; waitedMs: number; reason: string };

/**
 * 서버를 깨우고 일어날 때까지 기다린다.
 *
 * 잠든 인스턴스는 첫 요청을 받고 나서야 기동을 시작하므로, 한 번 쳐 보고 실패했다고
 * 포기하면 **영원히 못 들어간다.** 그래서 실패를 재시도 신호로 읽는다.
 *
 * @param timeoutMs 이만큼 지나도 안 깨면 포기한다. Render 의 기동 시간이 1분쯤이다.
 * @param onWait 기다리는 동안 화면에 진행을 보여 주려고 부른다.
 */
export async function wakeServer(timeoutMs = 90_000, onWait?: (waitedMs: number) => void): Promise<WakeResult> {
  const startedAt = Date.now();
  let lastReason = "응답 없음";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(serverStatusUrl(), { cache: "no-store" });
      if (response.ok) {
        const status = (await response.json()) as ServerStatus;
        return { state: "awake", status, waitedMs: Date.now() - startedAt };
      }
      lastReason = `HTTP ${response.status}`;
    } catch (error) {
      // 잠들어 있는 동안에는 연결 자체가 거절된다. 이건 실패가 아니라 "아직"이다.
      lastReason = error instanceof Error ? error.message : "연결 실패";
    }

    onWait?.(Date.now() - startedAt);
    await new Promise((done) => setTimeout(done, 2_000));
  }

  return { state: "unreachable", waitedMs: Date.now() - startedAt, reason: lastReason };
}
