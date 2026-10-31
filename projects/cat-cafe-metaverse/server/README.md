# Cat Café authoritative room server

```sh
cd projects/cat-cafe-metaverse/server
npm ci --ignore-scripts
npm test
npm start
# ws://127.0.0.1:8787/ws ; GET http://127.0.0.1:8787/health
LOAD_SECONDS=30 npm run load
```
Node >=20. Browser uses native WebSocket; server uses pinned official `ws` (https://github.com/websockets/ws). No AI keys/assets/provider needed. Defaults bind loopback only. `PORT` may change port; `ALLOWED_ORIGINS` is a comma-separated exact origin list. Defaults localhost/127.0.0.1 ports4173 and5173. No-Origin native sockets are accepted because binding is restricted to loopback; this is not a public authentication design. There are no accounts, chat or persistent profiles. Restart resets all rooms. A shared live deployment requires an explicit reviewed TLS/WSS host, allowed browser origins, abuse protection and observability; this implementation refuses non-loopback HOST.

World: 20Hz authoritative input,10Hz packed full snapshots; three fixed rooms,100 seats including20s reconnect reservations,18cats/room. Actions have4s exclusive cat leases,1.2s per-player cooldown and bounded64-entry request-ID dedup. Duplicate requestIDs return cached results, not repeated effects. Player state omits reconnect tokens. Reconnect accepts only one active owner, resets input seq for a new socket. Movement is intent, not claimed coordinates; input expires250ms. Collisions in `WORLD_OBSTACLES` match client furniture. Snapshots contain only connected players; room count includes reservations (separate connected/reserved fields).

Limits: max2048-byte frames,60messages/sec token bucket burst120,360 sockets,5s unjoined deadline,15s heartbeat,64KiB superseded snapshot dropping,512KiB slow socket close1013. Exact client action acknowledgements are not deliberately dropped below hard limit; reconnect/retry same requestID to retrieve an acknowledged effect.

## Evidence limits
`load-baseline.jsonl` records two30s runs:150 then300 synthetic sockets, both generator and server in one Node process, local loopback. CPU/RSS are COMBINED; tickWork includes broadcast serialization/enqueue, not elapsed tick interval. RTT is local generator-observed. This is not300 rendered browsers or human/mobile FPS. At300 sockets full snapshots consumed36.9MiB/s aggregate and tick-work p99 exceeded50ms; hard capacity is not a demonstrated public-service quality guarantee. Further optimization/real host testing required before live public release. Automated backpressure test uses a deterministic socket-shaped test double; it is not a slow network experiment.


## Packed-v1 optimization result
`load-packed.jsonl` supersedes the baseline for the current code: 3×100 synthetic sockets for30.01s, all300 connected,597ticks, tick-work p95 10.65/p99 12.27ms; action RTT p95 19.32/p99 20.85ms; combined server+generator CPU35.90% of one core, peakRSS210.4MiB, zero dropped snapshots/slow closes. Aggregate outbound21.63MiB/s remains substantial; this is a local loopback throughput result, not a live Internet service guarantee. 3×50: p99tick4.70ms,150connected. Packed wire arrays are documented in `packState`; `schema: packed-v1` distinguishes them from object snapshots used internally. No delta transport yet.

## Final client-rate-matched run (20Hz input)
`load-final-20hz.jsonl` is the final evidence for the current driver, superseding10Hz input runs above. Actions every2s, ping every1s;150 then300 synthetic sockets for30s each.

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
