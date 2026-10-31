# Cat Café authoritative room server

```sh
cd projects/cat-cafe-metaverse/server
npm ci --ignore-scripts
npm test
npm start
# ws://127.0.0.1:8787/ws ; GET http://127.0.0.1:8787/health
LOAD_SECONDS=30 npm run load
```
Node >=24. Browser uses native WebSocket; server uses pinned official `ws` (https://github.com/websockets/ws). No AI keys/assets/provider needed. Local mode defaults to loopback, localhost/127.0.0.1 page origins on ports4173 and5173, and permits native sockets without Origin. Explicit `ROOM_SERVER_MODE=production` requires a nonempty canonical HTTPS `ALLOWED_ORIGINS` list and rejects missing Origin; only this mode permits an explicitly configured non-loopback `HOST`. Production still defaults to loopback. `PORT` controls the port. Origin validation is not authentication. There are no accounts, chat or persistent profiles, and restart resets all rooms. A public service still requires an authorized persistent TLS/WSS host, abuse controls and operational verification. See [DEPLOYMENT.md](DEPLOYMENT.md); no live WSS deployment is claimed.

World: 20Hz authoritative input,10Hz negotiated delta-v1 snapshots (legacy packed full fallback); three fixed rooms,100 seats including20s reconnect reservations,18cats/room. Actions have4s exclusive cat leases,1.2s per-player cooldown and bounded64-entry request-ID dedup. Duplicate requestIDs return cached results, not repeated effects. Player state omits reconnect tokens. Reconnect accepts only one active owner, resets input seq for a new socket. Movement is intent, not claimed coordinates; input expires250ms. Collisions in `WORLD_OBSTACLES` match client furniture. Snapshots contain only connected players; room count includes reservations (separate connected/reserved fields).

Limits: max2048-byte frames,60messages/sec token bucket burst120,360 sockets,5s unjoined deadline,15s heartbeat,64KiB superseded snapshot dropping,512KiB slow socket close1013. Exact client action acknowledgements are not deliberately dropped below hard limit; reconnect/retry same requestID to retrieve an acknowledged effect.

## Evidence limits
`load-baseline.jsonl` records two30s runs:150 then300 synthetic sockets, both generator and server in one Node process, local loopback. CPU/RSS are COMBINED; tickWork includes broadcast serialization/enqueue, not elapsed tick interval. RTT is local generator-observed. This is not300 rendered browsers or human/mobile FPS. At300 sockets full snapshots consumed36.9MiB/s aggregate and tick-work p99 exceeded50ms; hard capacity is not a demonstrated public-service quality guarantee. Further optimization/real host testing required before live public release. Automated backpressure test uses a deterministic socket-shaped test double; it is not a slow network experiment.


## Historical packed-v1 optimization result (2026-10-31)
`load-packed.jsonl` superseded the original baseline at the packed-v1 revision: 3×100 synthetic sockets for30.01s, all300 connected,597ticks, tick-work p95 10.65/p99 12.27ms; action RTT p95 19.32/p99 20.85ms; combined server+generator CPU35.90% of one core, peakRSS210.4MiB, zero dropped snapshots/slow closes. Aggregate outbound21.63MiB/s remains substantial; this is a local loopback throughput result, not a live Internet service guarantee. 3×50: p99tick4.70ms,150connected. Packed wire arrays are documented in `packState`; `schema: packed-v1` distinguishes them from object snapshots used internally. This historical revision predates delta transport; later sections contain delta results.

## Historical packed client-rate-matched run (2026-10-31, 20Hz input)
`load-final-20hz.jsonl` records the final packed-v1 evidence for that driver revision, superseding10Hz input runs above. Actions every2s, ping every1s;150 then300 synthetic sockets for30s each.

| Metric | 3×50 | 3×100 |
|---|---:|---:|
| Connected at end |150/150|300/300|
| Effective simulation Hz |19.933|19.933|
| Tick interval p95 / p99 ms |50.87 /51.04|50.90 /54.06|
| Intervals over75ms |0|0|
| Tick work p95 /p99 ms |4.65 /5.39|11.05 /11.64|
| Action RTT p95 /p99 ms |9.69 /9.85|43.99 /46.19|
| CPU% onecore, combined |19.45|43.90|
| PeakRSS MiB, combined |179.85|209.21|
| Aggregate outbound MiB/s |7.05|21.60|
| Dropped snapshots /slow closes |0 /0|0 /0|

At300 clients378 actions were accepted and3822 rejected (normal lease/proximity/cooldown contention, not transport failure);18 cats are a bounded shared resource. There is still no test of300 graphics clients, Internet latency, real mobile frame rate or persistent live hosting. Tick work and elapsed tick interval are distinct measurements;50ms nominal interval necessarily has normal timer jitter.

## Bounded90s soak
Command: `LOAD_SECONDS=90 LOAD_COUNTS=100 npm run load` (default counts remain50,100). `load-soak-20hz.jsonl` records300/300 connected after90.00s at20Hz client input. Effective simulation19.866Hz (1788ticks); elapsed tick interval p95 51.01 /p99 54.88ms, one interval exceeded75ms. Tick-work p99 11.81ms; actionRTT p95 40.42 /p99 44.21ms. No dropped snapshots or slow-client closes. Combined server+generator CPU50.17% of one core, peakRSS264.48MiB, aggregate outbound21.76MiB/s. This bounded local soak found no disconnect but is not a memory-leak proof or long-running production capacity guarantee. PeakRSS exceeds the30s run and includes generator allocation/GC; no isolated retained-heap analysis was performed.

## Opt-in compression experiment (not enabled by default)
`WS_COMPRESSION=1 npm start` opts into standard `permessage-deflate`; clients without extension support still receive unchanged `packed-v1` JSON. Defaults remain compression OFF and loopback binding only. Both context takeovers are disabled; window bits12, deflate level1/memory level5, concurrency2, threshold1024bytes. Browser-compatible extension negotiation is covered by actual WebSocket integration tests, not a claim of native mobile browser QA.

Compare locally with `LOAD_SECONDS=90 LOAD_COUNTS=100 LOAD_COMPRESSION=0 npm run load` and then `LOAD_SECONDS=90 LOAD_COUNTS=100 LOAD_COMPRESSION=1 npm run load`. New `wireOutbound*` metrics read each client's Node TCP socket byte counter: they include received WebSocket framing, exclude initial handshake, and do not include TLS/IP/TCP packet overhead. Existing `outboundMiB*` remains pre-compression application JSON bytes queued by the server. The benchmark's private ws socket access is instrumentation only, not product transport logic. CPU/RSS includes server plus synthetic clients (therefore compression AND decompression), not isolated server resource usage.

The official ws documentation cautions that compression can increase CPU/memory and cause memory fragmentation; do not enable from bandwidth savings alone: https://github.com/websockets/ws#websocket-compression . Public host choice, account access and spend authorization remain separate. No live service has been provisioned by this experiment.

###90s experiment result: keep default OFF
Raw: `load-compression-baseline.jsonl` and `load-compression-experiment.jsonl`. Each used300 synthetic clients,20Hz input,90s, same-process server+generator. Both retained300/300 clients with zero dropped snapshots/slow closes.

| Metric | Compression OFF | Opt-in ON |
|---|---:|---:|
| Actual received WS bytes MiB/s |21.751|8.957|
| Application JSON queued MiB/s |21.738|21.732|
| CPU% of one core, combined |53.65|132.05|
| PeakRSS MiB, combined |268.32|339.27|
| Action RTT p95 /p99 ms |20.08 /22.78|74.75 /105.85|
| Effective tickHz |19.833|19.933|
| Elapsed tick interval p99 ms |57.77|53.64|

Wire bytes decreased58.8%, but combined CPU and action RTT regressed substantially. Compression remains disabled by default; this result does NOT justify turning it on for public launch. Concurrent browser work and a separate test run around08:01:00–08:01:10UTC overlapped the compression run, so this is a shared-resource diagnostic rather than an isolated comparative benchmark. Combinedprocess CPU also includes300 client inflaters. Next step is client/server delta transport design or an isolated representative host experiment, not silently enabling compression. Public service remains unconfigured.

## Optional delta-v1 snapshots (compression remains OFF)
A client opts in on every join using `snapshotFormat: 'delta-v1'`. Clients omitting it still receive `packed-v1`; older servers ignore the new join field and remain compatible. Welcome reports selected `snapshotFormat`.

Full packet: `type:state, schema:delta-v1, kind:full, room, seq, time, players, cats, toys, rooms`, with existing packed tuples. Delta packet: `type:state, schema:delta-v1, kind:delta, room, seq, time, baseSeq`; changed entity groups optionally contain `add` full tuples, `remove` ID arrays, and `change` arrays `[id, mask, ...values]`. Mask bit0 refers to the first tuple field after ID, then existing tuple order. Room metadata is included only when changed. Empty groups are omitted. `shared/delta.mjs` is the browser-safe shared validator/reconstructor.

Full packets are sent on join, actual room switch, reconnect and resync. Baselines advance only after successful enqueue, never when backpressure drops a snapshot. A requested resync that is dropped keeps forceFull set until a full packet queues. `resync` requests are limited to1/second plus the ordinary input bucket. No periodic keyframe or packet acknowledgement is needed on ordered WebSocket/TCP. Clients request resync on missing/mismatched baselines.

A valid full packet with the SAME sequence refreshes the baseline (joins/actions can mutate state between simulation ticks); older full packets are stale. Delta sequence <=current is stale. Shared serialization cache uses baseline object identity, NOT sequence alone: two clients can have distinct same-sequence membership snapshots. Both edge cases have regressions. Decoding rejects unsupported masks, invalid fields/nonfinite numbers, duplicate additions and unknown changed IDs without mutating the prior baseline.

###90s delta correctness/performance diagnostic
`LOAD_SECONDS=90 LOAD_COUNTS=100 LOAD_DELTA=0 LOAD_COMPRESSION=0 npm run load` versus `LOAD_DELTA=1`. Raw: `load-delta-baseline.jsonl`, `load-delta-experiment.jsonl`. Every post-warmup reconstructed frame was checked for EXACT equality against the authoritative snapshot captured by a harness-only `world.snapshot` wrapper;600 timestamp/room/sequence keys retained. This adds significant validation/stringification/GC work to the same event loop as300 clients and the server.

| Metric | Packed full | Delta |
|---|---:|---:|
| Exactly verified state frames |227700|254100|
| Missing /mismatched /decode errors /resyncs |0 /0 /0 /0|0 /0 /0 /0|
| Actual WS MiB/s |18.228|3.365|
| CPU% onecore combined |81.80|66.24|
| PeakRSS MiB combined |367.12|317.43|
| Action RTT p95 /p99 ms |77.59 /86.64|21.28 /24.56|
| Tick work p99 ms |12.99|6.19|
| Effective simulation Hz |16.84|18.83|
| Elapsed tick interval p99 ms |83.67|69.38|
| Observed moving player fraction |13.45%|11.36%|
| Nonzero movement input fraction |9.05%|9.00%|

Both retained300/300 sockets, with0 dropped snapshots/slow closes. Wire traffic fell81.5%; this is a substantial diagnostic improvement, not a claim of20Hz public-service capacity. Correctness verification itself throttled the combined process. Workload algorithm matched but time-driven cats were not an exact replay; most visitors settled near their cat, so this is NOT300 continuously moving avatars. Initial~4s of the baseline overlapped another test run ending08:11:12UTC; no subsequent heavy parent work was requested. Initial full packets are excluded from the comparison frame counts. There is no real-user/mobileFPS/Internet-host proof in these figures.

###Deterministic90%-moving performance comparison (sampled equality)
Latest performance evidence: `load-delta-sampled-baseline.jsonl`, `load-delta-sampled-experiment.jsonl`. Commands add `LOAD_VERIFY=sampled LOAD_DETERMINISTIC=1` to the prior90s/300-client runs. Seed1337 controls a fixed circular movement-intent sequence;90% of clients move continuously,10% idle. Both runs sent exactly540000 movement messages over1800 driver steps, with matching seed/pattern. The90s is a nominal1800×50ms target; actual elapsed time is reported below, not disguised as90s. The seed does not freeze server cat wall-clock roaming or generated visitor identities.

Every frame is still decoded/validated. Exact authoritative equality is sampled for one client per room every10 frames (270 checks each run); the earlier all-frame correctness proof remains separate. Observed authoritative moving-player fraction was90.00% in BOTH runs, not merely nonzero intent. Parent heavy tests/build/browser actions were paused during this pair.

| Metric | Packed full | Delta |
|---|---:|---:|
| Actual elapsed seconds |93.108|91.626|
| Movement messages /driver steps |540000 /1800|540000 /1800|
| State frames decoded |270000|270000|
| Exact sampled comparisons |270 /270|270 /270|
| Decode /missing /mismatch /resync errors |0 /0 /0 /0|0 /0 /0 /0|
| Actual WS MiB/s |19.170|11.781|
| Combined CPU% onecore |75.35|58.13|
| Combined peakRSS MiB |379.31|407.70|
| Effective simulation Hz |19.332|19.645|
| Elapsed tick interval p99 ms |65.73|59.08|
| Tick work p99 ms |13.23|7.11|
| Action RTT p95 /p99 ms |54.05 /67.35|50.79 /59.92|

Both retained300/300 sockets with zero snapshot drops or slow closes. Under continuous90%-moving load, delta reduced actual WS traffic38.5% and combined CPU22.9%; peakRSS INCREASED7.5%, so do not claim an across-the-board memory improvement. This heavy-movement result supersedes the mostly-idle81.5% saving as the conservative performance headline. The same-process test still includes300 synthetic decoders and monitoring, not isolated server CPU, real browsers, mobile rendering or Internet latency. Effective19.645Hz is near but not a guaranteed20Hz service SLA. Compression remains OFF; no public host was provisioned.

Memory bounds (design, not a leak proof): each admitted socket retains at most one authoritative baseline reference; the encoded delta cache exists only for one broadcast and is discarded afterward. Normal same-room clients share the current baseline object. World membership/reservations are capped at300 across three rooms; transport connections at360; each player dedup cache at64; tick metric arrays at12000 entries each. Backpressure caps queued sending and closes slow peers. The load-only authoritative-history map retains600 keys and is absent from production startup. Observed peakRSS increased7.5% in the90%-moving delta comparison; no isolated retained-heap or long-duration leak analysis was performed.

## Production-readiness source (not public deployment)
See [DEPLOYMENT.md](DEPLOYMENT.md) for explicit production origin validation, unchanged loopback defaults, readiness/drain and bounded shutdown, and an **unbuilt** non-root Node24 Docker recipe. Host/WSS/abuse-control authorization remains required.

## Private checkpoint codec (Vercel migration foundation)
`state-codec.mjs` exports/imports a versioned, bounded JSON-safe World checkpoint for a future shared authority adapter. Distributed connections use opaque string IDs; the existing loopback ws-object World remains unchanged and cannot be exported directly. Checkpoints contain private reconnect tokens and MUST NOT be returned to clients or logged. Public `snapshot()` output still excludes those tokens. Trusted-time recovery expires stale input/actions/reservations without replaying movement ticks. The codec alone does not provide a shared database, fencing, presence detection or a live Vercel server. `npm test` includes its regressions.
