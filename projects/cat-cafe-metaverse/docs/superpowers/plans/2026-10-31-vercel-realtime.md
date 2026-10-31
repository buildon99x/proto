# Vercel Cat Café Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. This is a proposed migration, not evidence of a running backend.

**Goal:** Serve the existing café's authoritative multiplayer through the existing Vercel project with automatic same-origin entry.

**Architecture:** Next.js WebSocket gateways accept visitors; a shared external store is the source of authority, not a module singleton. Prefer one fenced logical authority for the existing three-room World, retaining atomic room switches and existing physics; gateways relay bounded commands and committed snapshots. Provider-specific implementation waits for actual approved storage provisioning and capability verification. The independent reviewer agrees that one logical café authority is the smallest safe fit; per-room leaders would add cross-room transaction complexity.

**Tech Stack:** Existing Next 15/Three.js/ws/Node 24; current official @vercel/functions upgradeWebSocket API >=3.10.0; Redis-compatible atomic store only after approval and actual capability verification.

**Spec:** Existing projects/cat-cafe-metaverse/spec.md plus user 2026-10-31 14:42 UTC instruction: “vercel 서버를 띄워서 서비스 하는 방향으로 만들어.” User clarified at 14:51:12 UTC: “공개 서버를 만들어. 그래야 테스트해보지”. The deliverable is a public, directly usable realtime test café, not a protected two-minute proof. Update project brief/spec/eval before implementation.

## Global Constraints
- Preserve three rooms, recommended 50 / hard 100 including reconnect reservations,18 cats per room, authoritative movement/actions, existing UI/audio/solo honesty.
- Existing loopback server remains runnable; no main merge, paid resource, new credentials/integration grants, firewall changes, or public daemon provision without explicit authority.
- Endpoint under launcher/app/api per root instructions; project assets and authority modules remain under projects/cat-cafe-metaverse.
- No durable socket objects or in-memory-only room membership; no acknowledged output before successful fenced durable commit.
- No paid capacity claim or300-human-quality claim from synthetic tests. No bypass of local Mac usage limit.

## Verified Repository / Platform Facts
- Base 16b273bd83ff2ccdc78dbf1f29470b1fff56c9da, clean; existing Next 15 launcher, one telemetry API, Vercel region icn1.
- World currently keys members by ws objects; token/map/action-result state must be serializable with opaque connection IDs.
- Guest endpoint currently build-time VITE_ROOM_SERVER_URL or localhost/ws; missinghost public UI correctly disabled.
- Current official API is upgradeWebSocket, not outdated experimental_upgradeWebSocket.
- WebSockets require Fluid Compute; duration closes sockets; reconnects/deploys can reach different instances.
- Daemons cannot accept inbound HTTP/TCP, run production-only, and would still require external relay/state; excluded from smallest proof.
- Existing integration is not a provisioned database. No Vercel CLI installed; no dependency installed/resource created.

## Review Focus
1. Two owners overlap after lease expiry: stale owner must never commit or publish state/acks.
2. Process dies between command receipt, state write and ack: replay must not duplicate action, seat or room switch.
3. Gateway disappears without close callback: presence expires, neutralizes movement, retains bounded reconnect reservation, then frees seat.
4. Duration/redeploy routes reconnect elsewhere: same identity/full snapshot; old/new protocol versions must not corrupt shared state.
5. Store outage/quota exhausted: fail closed, no local fake multiplayer; bounded queues/retries, solo remains usable.

## Task 1: Serializable authority and deterministic recovery
**Files:** Add server/state-codec.mjs and tests/state-codec.test.mjs; extend server/world.mjs narrowly; do not alter renderer.
**Interfaces:** exportWorld(world)->versioned JSON-safe checkpoint; importWorld(checkpoint,{clock})->World. Stable opaque connection IDs replace transport-object keys only in distributed adapter; local transport remains compatible.
- [ ] Tests fail first: round-trip all cats/toys/positions/tokens/reservations/action results/input sequences; expired disconnected seats; malformed/version-mismatched checkpoint rejects; no secret token exposed in public snapshot.
- [ ] Implement bounded schema (300 seats, 54 cats, bounded results), stable identity maps, tick/time semantics. No catch-up burst granting extra speed after outage.
- [ ] Run existing server/shared tests plus codec tests; maintain all ball/dedup/capacity behavior; independent review then commit.

## Task 2: Shared store and fenced coordinator (provisioning gate)
**Files:** Add server/distributed/store.mjs, coordinator.mjs, protocol.mjs; tests/distributed-authority.test.mjs and real-store integration tests.
**Interfaces:** acquireLease(owner)->{fence,deadline}; appendCommands(gateway,batch)->bounded cursor; commit({owner,fence,expectedRevision,cursor,checkpoint,acks,snapshots})->committed revision or stale rejection; readCommitted(revision); presence heartbeat/expiry. Operations must be atomic at the actual provider, not assumed from a fake adapter.
- [ ] Verify actual provider atomic scripting/transactions, throughput, message/frame limits, subscribe/poll behavior, region and quota before SDK choice. No API keys in browser or logs.
- [ ] Failing tests cover all five Review Focus cases with two independent gateways, conflicting owners, crash windows, clock/lease expiry and store failure.
- [ ] Implement one logical café owner while active gateway requests exist,20 Hz bounded tick,10 Hz committed snapshots. Preserve cross-room switch atomically. Use server/store time, monotonic fence and commit revision; publish only committed output. Uncommitted random IDs/results are not externally visible.
- [ ] Bound input ingress: coalesce movement per connection without reordering join/action/leave barriers; reliable command limits and backpressure; no per-client store polling. Persist/recover command cursor and dedup state atomically.
- [ ] Keep liveness heartbeat separate from20 s reconnect reservation. Old gateway close must not disconnect a newer session generation. Idle service has no endless tick billing. Sleep/wake defines safe state refresh.
- [ ] After provisioning permission, run a bounded two-client diagnostic for concurrent resume, same-cat race, switch rollback, forced owner loss / full resync and stale-owner rejection. Its duration limit applies to the test harness, NOT public visitors. Measure store commands/s, bytes, active duration, memory, RTT and correctness. The 101st-seat / 300-socket capacity suite runs locally against test adapters first; actual-provider capacity testing requires a separately approved resource budget and is not a precondition of opening the small public beta.
- [ ] Independent review and commit only after real store integration passes. Emulator alone is insufficient for atomicity/provider claims.

## Task 3: Vercel route, discovery and candidate validation
**Files:** Add launcher/app/api/cat-cafe-metaverse/ws/route.ts and status/route.ts; narrowly add launcher dependency+lock; project app/src/main.js and logic.js/test; deployment guide/spec/eval.
**Interfaces:** GET status returns no-store public readiness +same-origin endpoint path, no secrets; GET ws validates exactOrigin+readiness then upgradeWebSocket; adapter emits existing welcome/state/actionResult/error protocol.
- [ ] Failing tests for missing-store 503, bad/missing Origin, unavailable UI, automatic endpoint, bounded retry/backoff+jitter, stale callbacks, leave disables retry, reconnect full state, protocol epoch mismatch.
- [ ] Preserve no server-address input. Discovery fails honestly; never enable live entry from static URL existence alone. Explicit solo mode remains separate.
- [ ] Feature/config gate keeps missingprovider deployments unavailable, not split singleton worlds. Preview and production use separate namespaces; same environment deployments coordinate only compatible schema versions.
- [ ] Respect SDK's actual send/backpressure/lifecycle API rather than assume ws.bufferedAmount shape. Time-limit rollover reconnect before platform deadline with jitter; do not create unbounded background loops beyond active request lifecycle.
- [ ] Run full frontend/server/integration/lint/build, sync only this project's registry metadata; commit/push branch, inspect exact SHA CI and candidate route readiness.
- [ ] Verify actual candidate WS upgrade, two independent visitors samecat/positions, room isolation/capacity/reconnect through forced duration, long-session memory, command quota and network use. Cloud DOM checks are not WebGL/hearing/physical touch.

## Public Test Deliverable (replaces protected proof as the destination)
- A public candidate URL where the user and friends enter immediately, without a password or manually entering a server address. No mandatory secret proof gate and no fixed 120-second visitor expiry.
- Existing three rooms and 18 cats per room remain. Proposed initial free beta admission cap is **6 visitors globally across all rooms**, including reserved seats, while the model's per-room hard capacity remains 100. UI must say “무료 공개 테스트 · 전체 동시 입장 6명”; do not advertise this beta as a verified 50–100-person service. Raising the public cap depends on real provider measurements and resource budget, not redesigning the rooms.
- The user can revisit later; function-duration reconnect is automatic and preserves identity/state. There is no daily reset of visitor identity merely because a gateway changes.
- Keep server-only credentials scoped to this exact candidate branch preview environment, never all previews or static app build variables. Publicly accessible candidate does NOT mean production/main promotion. Preserve all other projects.
- One proposed Upstash Free resource in hnd1, automatic upgrades off, production pack off. User approved free database creation and server-only credential binding at 16:06 UTC. Provisioning is delegated separately; real resource availability is still pending verification.

## Finite Free-Tier Safeguards (proposed defaults, validate against actual resource)
- Stop the authoritative simulation and store polling when there are no active visitors. Checkpoint remaining reconnect reservations with expiry, then clean them lazily on the next join; do not keep an idle clock running for empty rooms. Presence expiry covers crashed gateways. Never run a daemon just to keep rooms warm.
- Initial proposed shared ceilings: 100,000 conservatively accounted store commands/day, 350,000/month; 256 MiB application payload/day, 1 GiB/month; 30 minutes of aggregate café-active time/day. Active time is wall-clock time with at least one visitor, not summed user-minutes. Any earliest ceiling closes live service transparently until the applicable window resets. These are finite operational proposals, NOT guaranteed session lengths or provider invoice limits; tune downward if actual account allowances are lower, and report measured useful playtime before opening.
- Count pipeline commands, Lua inner redis.call, accounting operations, retries and Redis request/response plus WebSocket payload. Preserve budgets in shared durable state across gateways and deployments; never treat missing counters as a fresh free allowance. Retain monthly records beyond month-end and derive windows from trusted server time. Reserve cleanup/failure-response budget so shutdown does not require unlimited extra calls.
- A known exhausted/read-only service must reject locally before store work where possible; public status must not poll Redis per anonymous request. Bound gateway connections, message sizes, queue lengths, per-connection input/action rates and join timeout. Origin checks are not authentication; local rate limits are not global DDoS protection. No new firewall or paid abuse service is implied.
- If a store operation times out with uncertain accounting, charge its conservative allowance and fail closed if safety cannot be established. Store outage/quota failure means visible “실시간 테스트 이용량을 다 썼어요” or connection unavailable, never local fake multiplayer.
- Public HTTP/upgrade traffic can still incur Vercel work before application rejection. Application ceilings cannot guarantee zero bill, prevent malicious public traffic, or impose the provider's invoice hard cap. Confirm this operational risk with parent; no paid upgrade or new account-wide spending/security setting is authorized by this plan.
- On exhaustion, retain accessible solo mode, disable live entry, explain which limit applies and a genuine reset time when known. Avoid infinite client retries or a misleading enabled join button.
- Test ceilings using injected small values and a shared fake clock; prove simultaneous gateways cannot double-spend seats/budget, restart cannot reset budgets, window reset cannot replay old commands, and stale owners cannot keep ticking after exhaustion. Actual provider billing/capacity still requires measured verification.

## Optional Internal Diagnostics (not the user's service)
- A two-client, up-to-120-second test harness may force socket rotation at 60 seconds to verify shared authority and reconnect. Stop that harness at its deadline; do not install its deadline as public-server expiry.
- Diagnostics consume the same public-beta counters or a separately reserved smaller test budget, never bypass quota guards. No protected preview or extra proof credentials are required merely to satisfy the user's public-test objective.
- Before sharing the new live URL: verify two independent visitors observe the same cat/player actions; leave and reconnect across gateway instances; switch all three rooms; seventh admission receives truthful beta-capacity feedback; idle work ends; quota exhaustion is truthful; deployed browser retains working solo mode.

## First Meaningful Steps After Provisioning
1. Inspect the actual approved resource region, limits and atomic transaction/scripting capability without logging credentials; bind server secrets to the exact branch only.
2. Add versioned World checkpoint round-trip and session-generation tests, preserving existing 51 server/shared and 70 frontend assertions.
3. Implement and test a real-store fenced commit for one café with two gateways, including crash replay and same-cat action idempotence. No route is enabled while this is incomplete.
4. Add atomic global admission/budget/idle lifecycle, then same-origin Next endpoint and automatic client discovery/reconnect.
5. Run the finite internal diagnostic, independently review correctness, publish the branch candidate, and perform actual public URL entry. Deliver the usable link plus explicit 6-person beta limitation and measured resource use. Larger-capacity testing is a later resource-budget gate, not a reason to hide the public beta behind a two-person secret test.

## Dependency / Cost Gate
User explicitly chose a PUBLIC Vercel realtime service. This supersedes a protected internal proof as the product goal, but does not itself resolve the parent’s scoped DB-creation/credential permission (approved at 16:06 UTC; provisioning pending) or authorize paid capacity. Parent is resolving the smallest explicit storage provisioning permission. Upstash Free reported500K commands/month; even one20 Hz atomic operation alone consumes72K/hour, so500K covers <= 6.94 active hours before any ingress/read/heartbeat overhead. This is an illustrative lower bound, not a tariff quote or runtime estimate. Existing high-motion300-socket wire 11.781 MiB/s (~41.42 GiB/hour) also makes unbounded public operation inappropriate without measured limits/budget.

## Sources (checked 2026-10-31)
- https://vercel.com/docs/functions/websockets
- https://vercel.com/docs/daemons
- https://vercel.com/docs/daemons/limits

## Stopping / Approval Boundary
Provider-independent checkpoint work authorized and started at 16:07 UTC. No provider-specific implementation until approved real resource availability is confirmed. No resource provision, credential creation, package install, public endpoint activation, main merge or deployment is performed by this plan. Once dependency is available, execute task-by-task with independent review; stop on a concrete unavailable capability or authorization requirement, retaining functioning 0.2.4 solo candidate.
