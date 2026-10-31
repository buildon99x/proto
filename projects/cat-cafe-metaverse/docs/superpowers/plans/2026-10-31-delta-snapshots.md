# Negotiated delta snapshots implementation plan

**Goal:** Reduce repeated authoritative state traffic without enabling CPU-heavy compression or breaking old clients.
**Scope:** Existing client/server only, no host/provisioning. Explicitly authorized under iterative release request.

## Contract
Join may advertise `snapshotFormat:'delta-v1'`; omitted uses existing packed-v1. Welcome declares selected format. Full delta-v1 state includes packed arrays. Subsequent deltas carry seq/baseSeq/room/time and add/change/remove groups; changed rows encode id+field mask+values. Unchanged groups/room metadata omitted. Shared pure decoder reconstructs packed-v1; malformed, stale or inconsistent state never mutates baseline.

- Full on actual join/switch/reconnect and explicit resync; pending rejected room switch keeps old baseline.
- Server baseline advances only after bounded send queues successfully. Dropped snapshot retains baseline so next delta catches up. Resync requests bounded to1/s and existing message rate limit.
- Client filters wrongroom first, requests one resync after gap, waits for valid full, resets on welcome/disconnect. Oldserver packed fallback remains supported.
- Acknowledgments and controls are never delta encoded.

## Tasks/checks
- [ ] Server/shared codec tests before code: exact reconstruction, field metadata changes, additions/removals, seq/base/room/malformed rejection, no mutation, dropped-send recovery, join/resync behavior and compatibility.
- [ ] Client transport tests before integration: oldpacked fallback; all join paths advertise; reset hooks; deniedswitch preservesoldroom; staleotherroom doesn't mutate; one-shot gap resync; validfull unblocks.
- [ ] Same300clients×20Hz×90s benchmark, compression OFF, realwire bytes, CPU/RSS/RTT/tick, reconstructed state equality for every frame. Reject corruption or material stability regression.
- [ ] Independent review, fresh wholeproject tests/build, local and deployedUI transition checks, exact separate branch commit+candidate.

## Release distinction
Reduced transport traffic is not proof of internet capacity, real300human rendering, production abuse controls or an available public host. All previously documented visual/audio/hosting gates remain.

## Review-discovered consistency refinements
World tick sequence does not increment on every join/action. Different clients can therefore hold distinct full states with the same tick sequence. Cache deltas by baseline object identity, NOT only sequence. A validated full snapshot with equal sequence must replace baseline/render state; only older full snapshots are stale. Deltas with sequence<=baseline remain stale. Regression tests must reproduce two same-sequence distinct baselines and a same-sequence resync with changed membership. This was caught independently before benchmarking/publication.
