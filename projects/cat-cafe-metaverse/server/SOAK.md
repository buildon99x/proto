# Finite local lifecycle soak

Run `node soak.mjs` from this directory. It runs30s warmup,20min measured work, then waits for the production20s reconnect reservations to expire naturally before closing. `SOAK_SMOKE=1 node soak.mjs` is a separate explicitly time-compressed calibration:500ms reservations,6.5s measured work. It is not production timing evidence.

The production run uses300 synthetic clients, three rooms, delta-v1 and seed1337 circular movement intents for90% of visitor slots. No public host, AI key or account is used. Every45s, three clients disconnect and resume within2s; every fourth cycle, they instead remain disconnected22s to exercise expiry and invalid-token rejection before fresh admission. Alternating cycles explicitly free one seat in each room, rotate three visitors through those vacancies and replace departed visitors. Full-room switches must fail atomically. Forced resyncs are bounded to one per10s for each selected client. Each resume verifies that input sequence0 is accepted.

All state frames are decoded. One selected slot per room is checked every10 frames against canonical authoritative snapshots captured only by this harness. The expected-state history is bounded to600 keys; old sockets are removed from client slots, and pending acknowledgements expire after10s. Raw logs contain counters and slot-level errors, not reconnect-token fields. Assertions enforce minimum completed lifecycle counts, canonical comparisons and actual accepted cat actions.

Memory: RSS, heapUsed and external memory sampled every10s after warmup; five-minute windows summarize heap/RSS minima and medians with natural GC only. Figures include server,300 synthetic clients and harness data in one process. Production tick metric arrays grow to their bounded12000 entries (~10min), so effective tickHz uses `world.seq` differences, not retained-array lengths. Window quantiles read only the latest window's tick samples. A rising RSS alone is not proof of a leak or retention.

Success requires all three: `workload_result.workloadPassed`, zero-member/token/room-seat/client-socket cleanup, and `terminal_complete.passed` plus process exit0. The harness never manually calls world cleanup to repair the subject; expiration must happen through normal server ticks. Room-full and expired-token rejections are expected counters, separate from unexpected protocol/connection errors. Report observed rates, churn counts, state agreement and memory trends—not real browser/mobile/human-user validation or leak-free guarantees.

## Oracle calibration and aborted first run
The initial run starting2026-10-31T08:44:01.159Z was interrupted with exit130 after raw JSON equality mismatches. Preserve `soak-aborted-20261031T084401.jsonl` as failed/aborted evidence, not a pass; final natural cleanup was not verified in that interrupted process. `diagnose-soak-order.mjs` reproduces a real WebSocket case: reserved reconnect restores server player insertion position `[A,B]`, whereas delta removal/re-addition produces `[B,A]`. All per-ID fields and metadata are identical; evidence is `soak-order-diagnosis.jsonl`. The old13 raw mismatches did not retain individual diffs, so do not claim every old mismatch was retrospectively diagnosed.

The corrected oracle compares identity-keyed entity collections sorted by ID and room metadata sorted by room ID, retaining every field plus room, sequence and time. Raw order-only differences are counted and the first is explicitly logged; real semantic mismatch or missing oracle state fails immediately with bounded, token-free diagnostics. Unit tests verify permutation equality and rejection of position/owner/lease/metadata/membership changes. No product wire change was made. The fresh20-minute run must independently pass all stages.

For a graceful operator stop, create `server/soak.stop` while the runner is active. It records a failed workload, finishes an already-active bounded churn operation, waits for natural reservation cleanup and exits nonzero. Remove that marker before a new run. This is test control only, not a server endpoint.

## Final fresh20-minute result — PASS
- Server runtime base: `083d308`; app-only changes were outside this socket-test scope. Later ball-physics changes are **not** covered by this run.
- Measured start:2026-10-31T08:54:03.340Z; measured duration1200.019s; natural reservation cleanup and process exit0 confirmed around09:14:25UTC.
-26 lifecycle cycles;60 short reconnects with sequence0 acceptance;18 expired reservations rejected then fresh-joined;39 successful vacancy-assisted room switches;26 full-room switches correctly retained old membership;347 forced resync requests.
-104 expected full-room and18 expected expired-token rejections, separately counted.6074 accepted cat actions and176668 rejected actions; individual rejection reasons were not separately tallied in this run.
-3,657,903 frames decoded,3427 exact sampled semantic comparisons;0 semantic mismatch, missing oracle state, decoder error, cross-room state, unexpected socket error/message/close.14 raw ordering differences were explicitly classified as equal per-ID state, not silently ignored.
-Normal300 visitors; intentional churn lowered connected count to297. No room exceeded100 seats including reservations.0 dropped snapshots/slow-client closes. Final members/tokens/room seats/client sockets all0; `terminal_complete.passed=true` and process exit0.
-Observed19.846 simulationHz,11.909MiB/s received WS traffic,48.76% of one core CPU for the combined server+generator. These are local lifecycle-soak observations, not a public-service SLA.

###Natural-GC memory windows (combined process)
| Post-warmup window | Heap minimum MiB | Heap median MiB | RSS median MiB |
|---|---:|---:|---:|
|0–5min|34.49|64.17|230.28|
|5–10min|29.01|64.35|230.86|
|10–15min|35.82|66.17|231.36|
|15–20min|30.77|63.55|231.91|

No sustained increasing sampled heap floor was observed in this bounded run. This is **not a memory-leak proof**: no isolated retained-heap analysis, forcedGC, real graphics clients or multi-hour production test was performed. The test includes harness allocations and the bounded production metrics ring. Brief separate frontend test/build activity overlapped09:06:38–41,09:07:04–05 and09:08:19–22 and09:09:01–26UTC; therefore CPU/latency figures are not an isolated benchmark.

Artifacts: `soak-20min.jsonl` (raw complete fresh run), `soak-summary.json` (derived summary), `soak-smoke.jsonl` (time-compressed all-branch calibration), `soak-stop-validation.jsonl` (expected nonzero graceful-stop calibration), `soak-order-diagnosis.jsonl` (real WS ordering reproduction), and the separately retained aborted trace. Preserve the aborted trace as aborted, not as a passing run.


## Separate post-ball-fix socket check
The subsequent shared ball-physics revision was checked separately with `node ball-socket-smoke.mjs` and `tests/server-ball-socket.test.mjs`, completed before09:19:05UTC. `ball-postfix-socket-smoke.jsonl` records80 decoded active-ball frames, minimum decoded cat/ball center distance0.900 (acceptance threshold0.885 allows2-decimal wire quantization), duplicate action producing one toy, four-second expiry, disconnect releasing toy/lease, same-identity reconnect with input sequence0 accepted, successful room switch with full snapshot, room isolation and forced full resync. Protocol errors0; no compression.

The harness approached the cat using real authoritative movement inputs before the second action: after the chase, the cat was3.369 units away, correctly outside interaction range. An initial harness attempt incorrectly assumed it stayed nearby; only test setup was corrected, not product permission/proximity checks. The targeted socket regression passed in5.33s. This is local transport/state verification, **not visual ball verification and not a second20-minute soak**. Preserve the earlier20-minute result's server-base identity separately from the post-fix working tree.
