# Production preparation — not a deployed room service

Source-only readiness work: no host provisioned, public listener opened, tunnel, paid resource, credentials or public WSS connection. Docker is unavailable here: the recipe has **not** been built/run. Tests use loopback only.

## Configuration

`npm start` stays at `127.0.0.1:8787` with local origins and optional native clients without Origin. `NODE_ENV=production` alone does not enable public binding.

Explicit `ROOM_SERVER_MODE=production` requires `ALLOWED_ORIGINS`: comma-separated exact canonical HTTPS page origins, e.g. `https://cafe.example,https://cafe.example:8443`. Wildcards, paths/trailing slash, credentials, query/hash, `null`, empty entries, HTTP, uppercase/default-port aliases fail startup. Missing Origin fails production upgrades. Origin is **not authentication**: native clients can forge it.

`HOST` remains loopback by default even in production. Only explicit production permits `0.0.0.0` or `::`. Supply the actual platform `PORT`; production should use nonzero. Configure the frontend's explicit `wss://.../ws` endpoint separately. A static Vercel build cannot host this persistent process. Compression remains off by default.

## Future authorized container build

From this project directory: `docker build -f server/Dockerfile -t cat-cafe-room-server .`. This is an operator instruction, **not executed evidence**. Dockerfile-specific ignore rules allowlist runtime source/lock only. Official Node24 slim image, non-root `node` user, locked npm install with lifecycle scripts disabled. The mutable official tag is not a fabricated immutable digest: record the tested digest when building and rebuild for security updates. The image intentionally sets neither public HOST nor production allowlist.

Use one persistent instance behind managed TLS/WSS/private backend, resource limits, supervisor restart and read-only filesystem where available. No writable volume is required. Do not autoscale independent replicas or claim shared rooms across rolling overlap: state is process-local and ephemeral. Restart loses rooms, reservations and tokens; clients rejoin fresh after invalid token.

## Health and shutdown

`/health` reports liveness without player/token information. `/ready` returns200 while serving and503 after drain. `beginDrain()` stops simulation/heartbeat/join timers, denies upgrades503 and gameplay requests `SERVER_DRAINING`. SIGINT/SIGTERM invoke idempotent close: existing WS receive1012, unresponsive connections force-close after5sec, then timers/membership are cleared. Configure host grace above this bound (e.g.10sec). Readiness remains observable during socket drain until HTTP closes. Stop routing before/while terminating.

## Still required before public operation

Authorize/select host/account/budget; configure exact origins, real WSS certificate/proxy; externally verify gameplay/reconnect/shutdown. No X-Forwarded-* trust or guessed per-IP proxy policy is added. Existing frame/message/connection/backpressure bounds are not complete public abuse protection: edge connection limits, rate/DDoS policy, traffic budget alarms and observability remain release gates. Synthetic socket measurements are not human/mobile rendering guarantees.

References: [Node lifecycle](https://nodejs.org/en/about/previous-releases), [Docker best practices](https://docs.docker.com/build/building/best-practices/), [example host WebSocket requirements](https://render.com/docs/websocket). No provider selected by these links.
