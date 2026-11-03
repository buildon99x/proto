# Approved implementation specification
## Architecture
Static Three.js browser artifact plus separate persistent Node/ws process, scoped to this project. The launcher remains unchanged except generated registry. This is the narrow user-approved exception to root static-project endpoint rules. ws chosen over Colyseus for small explicit protocol, low dependency count and directly auditable room ownership. In-memory rooms deliberately have no durable player profiles. No client-only fake multiplayer fallback.

## World and controls
Warm cream, honey wood and sage; window lounge, cat tree and open play floor. World horizontal walk half-size12√2 (shared/space.mjs), twice the original walk area. Decorative furniture must match shared collision circles. WASD/arrows movement, drag orbit, click cat and action; touch joystick/camera and 44px action buttons. Player-player overlap prevents griefing blockers. Three rooms sunshine/window, garden, evening. Eighteen procedural cats per room, six markings. All shared simulation is server-owned.

## Wire protocol v1 (JSON)
Client opens /ws; sends {type:'join',room:'sunroom'|'garden'|'moonlight',token?:string}. Server {type:'welcome',id,token,room}, then {type:'state',seq,time,room,players:[{id,name,x,z,yaw,color}],cats:[{id,name,x,z,yaw,skin,mode,owner,until}],toys:[{id,x,z,owner}],rooms:[{id,name,count,capacity,recommended}]}.
Client {type:'move',seq:integer,x:number,z:number} normalized intent -1..1. Server uses fixed dt, speed3.6/s, input timeout250ms and collision/bounds. Client {type:'action',requestId:string,action:'pet'|'feather'|'ball',catId:string}. Server {type:'actionResult',requestId,ok,reason?}. Action proximity <=2.8, cat lease exclusive, bounded cooldown/duration; reject malformed/unknown/oversized input. Client {type:'ping',id:number} → {type:'pong',id}. Client {type:'leave'} releases all; disconnect reserves seat20s and clears active input/leases. Reconnect token is random secret with fixed expiry, never in public state; only one connection may own a token. Capacity counts reservations. Joining another room is atomic: denied join retains original membership. 101st visitor rejected explicitly.

20Hz authoritative simulation, 10Hz snapshots; compact quantized values. Per-client state spatial filtering may reduce remote detail, but full visible crowd must remain truthful. Maxpayload2048, rate limited input; no compression; ping/pong liveness, queue limit and slow-client close. Default bind127.0.0.1:8787. Deployment build config supplies browser URL automatically; localhost uses same-origin /ws. Guests never enter server addresses. Missing production host produces a service-unavailable notice, never a fake online scene. Origins explicit allowlist; no wildcard public origins by default.

## Evidence and release
Synthetic 3×100 socket clients are not 300 visual clients/human usability. Record CPU/RSS/tick quantiles/action RTT and bytes. Browser test desktop/touch, visual WebGL fallback, screenshots, interactions; document unavailable stages. Working branch only, no main merge or paid/public host.

### Clarifications from independent architecture review
Action requestId deduplicates in bounded per-session cache. Successful switch transfers the single token membership and releases old leases; rejected switch preserves old seat. Unjoined sockets expire after5s; server caps360 total connections and incoming traffic. Missing Origin is accepted only on this loopback-only build for native local clients. Snapshot players lists connected visitors only, while rooms count includes reservations and exposes connected/reserved separately. Resume must reset input sequence or disclose lastInputSeq. The browser configures /ws explicitly.

## 0.2 direct-request change
Floor26×26 becomes (26√2)²=1352, exactly2× area. Furniture/character sizes and speed stay unchanged; horizontal layout/obstacles share the same scaled configuration. Original rounded chibi3D cats use soft pastels, tiny doteyes/wmouth and restrained dark silhouette, based on inspected user references without copying artwork/text. Public host remains unconfigured pending account availability and cost approval.

## Explicit solo preview (user follow-up)
The separately labeled “혼자 둘러보기 · 실시간 연결 아님” runs only in browser memory:18 simulated cats, one SD block-toy local player, no other visitors or live occupancy. Movement/rest and near pet/feather/ball are available without backend. Every transition into preview leaves live membership and clears resume token; live connect or exit clears preview. Shared floor collision bounds remain consistent. Missing public endpoint disables live entry prominently, not preview. This is not public multiplayer deployment.

## Release-quality iteration
Coat pattern is pigment on existing body/head surfaces, not added volume: six palettes,12cached128×64RGBA color maps (~384KiB), sRGB, no displacement. Pet/feather/ball reactions reset to idle and express eyes/ears/tail/posture/heart from current accepted mode. Original procedural audio starts silent until a trusted sound-control gesture, volume/mute preferences are nonsecret local storage, simultaneous voices capped, hidden/leave cleanup. Live sounds require matching successful recent actionResult, never snapshot/reconnect bursts. Public connection remains an explicit operational gate, not something static deployment supplies.

## Negotiated delta transport
Clients opt in with `snapshotFormat:delta-v1`; legacy clients retain packed-v1, and new clients accept packed fallback from old servers. Full snapshots establish a baseline on successful membership changes/reconnect/resync; later patches contain changed fields and removals. Same-sequence validated full snapshots may refresh state because joins/actions can occur between world ticks. Delta caches use actual baseline identity, not only tick sequence. Bounded sends never advance a dropped baseline; gap resync is rate limited. This transport improvement does not create a public backend.

### Mobile robustness acceptance extension · 2026-10-31
Each camera/joystick gesture has one owner pointer; unrelated pointers must neither steal nor terminate it. Capture loss/cancel/background/orientation/leave reset active IDs and movement, and stale moves cannot resume. Joystick and camera may operate independently; help/native dialogs pause both. Narrow controls must not overlap joystick; coarse tablets must expose it. Tests/emulated layout are distinct from actual phone multitouch verification. Actual OfflineAudioContext PCM validates generated samples, silence and cleanup but not heard quality or live device output.

### Code-only deployment readiness extension · 2026-10-31
Local startup remains loopback by default; NODE_ENV alone must not enable public binding. Explicit production mode requires nonempty exact canonical HTTPS page origins and rejects missing Origin. Readiness becomes503 while draining; no new upgrades/gameplay are admitted. Close is idempotent, existing sockets receive1012, and every accepted raw TCP/WS connection is forcibly cleaned within the5second scheduling budget. State remains in-memory and is lost on restart. Container recipe is preparation, not verified running deployment; no Docker install or public host was authorized/executed in this change.

### Vercel shared authority implementation · 2026-10-31 16:06 UTC
Follow docs/superpowers/plans/2026-10-31-vercel-realtime.md. Public WebSocket route belongs under launcher/app/api/cat-cafe-metaverse; durable room, session and action state belongs in the approved shared store, never a function singleton. One fenced café authority owns all three rooms. All state, processed commands and acknowledgments commit atomically before publication; expired owners cannot write. Opaque connection generations prevent an old gateway close from disconnecting a resumed visitor. Full snapshots re-establish reconnect state. Serialize bounded complete World checkpoints before provider integration.
Preserve all existing graphics/audio/solo behavior. Public beta allows six globally reserved/connected seats, with exact UI disclosure, idle shutdown and durable aggregate quota counters across deployments. Public access is intended, not a protected 120-second proof. Provider-specific integration waits until actual approved resource availability; app counters are not provider invoice caps.

### Implemented Vercel candidate contracts · 2026-10-31 17:58 UTC
Runtime status must require explicit enable flag, exact branch-preview scope and a successful cached store readiness check. Next upgrade validates exact same HTTPS origin, caps frame payload2048bytes and holds the request lifecycle until socket close. Gateway has one single-flight durable batch loop per instance; reliable join/action results cannot be silently evicted by movement; same-world-sequence revisions use full replacement snapshots. Lost authoritative presence forces a new socket retaining valid reconnect identity, never a ghost online display. Guarded build-only diagnostic may initialize the approved new database once with NX, but no public admin endpoint exists. See server/VERCEL.md for caps, failure semantics and verified-versus-pending gates.

### Deployed WebSocket artifact acceptance · 2026-11-01
Production Next output must receive masked client frames of at least 32 bytes without an optional native-addon shape failure. Readiness HTTP 200 is necessary but not sufficient: actual join/welcome, two-client state agreement, actions, room isolation, resume and cleanup must pass against the deployed candidate. Record wall-time movement and executed region independently from nominal configuration. Preserve private credentials and all existing protocol/authority constraints.
Only the two cafe API route files receive per-function Tokyo regions in the verified Vercel root (`launcher/vercel.json`); all unmatched routes retain their existing deployment defaults. `preferredRegion` source declarations alone are not accepted as executed-region proof.

### Idle cleanup and read-only budget inspection
A new connection arriving during awaited old-generation cleanup must retain its reliable join command and acknowledgment tracking, including failure paths. WebSocket request completion must await bounded gateway flush after close. A separate explicit `budget-readonly` build flag is allowed only for the exact candidate Preview branch with live mode disabled; it performs one GET of the fixed resource budget key, emits allowlisted aggregate counters/presence/reset dates only, and never reads room state, resets limits, or exposes a public endpoint.

### Free-beta budget efficiency correction
Actual QA exhausted the conservative daily byte allocation after approximately4.63 active minutes. First reduce repeated Lua transport and unused public snapshot payloads without changing private checkpoint coverage, fencing, committed acknowledgments, movement cadence or monthly ceilings. Any reallocation of the implementation's daily headroom must preserve cumulative counters and the existing350,000-operation/1GiB monthly app ceilings, and be disclosed as finite shared test capacity rather than sustainable free hosting. Keep six-recipient egress reservation until a tighter cross-gateway/resync bound is proven.

### Calm motion contract
See docs/superpowers/specs/2026-11-01-calm-motion-design.md. Bounded timestamped presentation interpolation; camera uses rendered local pose, no new authority prediction/network rate. Cats spend >=80% ambient time stationary, stable yaw, rare staggered walks/groom/stretch. Existing mode/tuple/checkpoint shape remains compatible. Exact legacy-grid idle/unowned cats receive a one-time validated rest-spot relocation; custom homes and active interactions are preserved. No player/session or quota reset.

## Visitor journey correction (2026-11-01)
Renderer failure gates live/solo entry with recovery; manual throttled service retry and immediate reentry; camera-relative cat direction and shared ambient rest explanation. See docs/superpowers/specs/2026-11-01-visitor-journey-design.md. Unit/build evidence is separate from actual rendered play.

## Interruption invariants
No action or held movement crosses pending room transitions; join acknowledgement is bounded; help cannot leak between sessions; hidden solo work pauses and presentation resumes without catch-up. Gesture taps do not rotate the camera.

## Single in-flight entry (2026-11-01)
Preserve one pending admission and its original deadlines; block ambiguous room changes until welcome or cancellation. Actual-main RED traces precede the client-only correction. See docs/superpowers/specs/2026-11-01-single-entry-design.md. Verification pending; no provider or 3D-play claim.

## Pinned open-3d-skills application (2026-11-01)
Apply static batching, reduced cosmetic motion and truthful successful-render diagnostics per docs/superpowers/specs/2026-11-01-open3d-application-design.md. Existing world, authority, shadow flags and free limits preserved. Tests precede implementation; real GPU/3D visual verification remains pending.

## 2026-11-03 player-value review
User requests repeated human-like play, natural witty cats and many-user quality with independent rubric. See docs/superpowers/specs/2026-11-03-player-value-design.md. Six-total public capacity and missing current GPU/phone evidence remain explicit open gates.

### 0.3.7 scoped acceptance
- Compact mobile card preserves selection, nearest-cat discovery and feedback while actions/location can expand explicitly; desktop stays expanded.
- Confirmed own action displays a bounded remaining duration; repeating the same action cannot silently restart it. Other actions retain server-authoritative validation.
- Solo snapshots mark `preview:true`; only that mode uses the new phased feather presentation. Live retains the previous pose and authoritative behavior. Welcome copy discloses the difference.
- No live simulation, Redis schema, deployment credentials, quota or main-branch change in this release.

### 0.3.8 follow-up acceptance
- At568×320, expanded action drawer and notice occupy side rails, not the central30%-wide play corridor. Preserve44px controls and portrait/desktop behavior.
- In each solo room exactly one existing cat/home starts within2.8m of unchanged player spawn, clear of obstacles/other cats and resting for30s. Live catalog remains unchanged; existing shared ambient phases continue.
- Visible help disclosure reports time between successful renderer.render completions on the main thread: initial60 intervals and a rolling240 warm intervals, p50/p95. It is not GPU completion duration, device FPS certification or network telemetry. Timestamp after render with performance.now, update aggregates every30 calls/readout at most1Hz. Clear on hidden/pagehide/context loss/room reset; retain long visible stalls rather than discarding them. A thrown renderer call triggers existing recovery and releases a live visit.
