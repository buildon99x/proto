# R14a15 exact long-gap diagnostics

Independent candidate copied from frozen R14a14, without modifying that source or other projects. This patch does not fix or attribute the repeatedly observed native browser stalls. The original >=500ms statistical exclusion had retained raw samples but did not expose them in the QA UI.

## Capture and interpretation

- New strict >500ms incident ring: 12 pairs, last six shown, with explicit count of older pairs evicted. Independent of menu frames and the last-active ring; manual clear, recording OFF, profile/travel/reload keep their established reset behavior.
- Previous/current recorded rAF stamps and interval, distinct runtime last reference/interval, and the actual callback safety branch. The runtime reference may be reset on Continue; an observed long gap alone does not prove a safety pause occurred.
- Previous and current callback entry/end and measured synchronous totals are separate. Entry is sampled before frame preparation/context. End is sampled before end-observer bookkeeping and scheduling the next rAF, so the tiny unmeasured tail is not included. The gap after the previous observed callback is explicitly unattributed, not GPU/idle time, and invalid callback clocks keep it null.
- Disjoint step, render, HUD, input/aim, scene preparation, audio.tick, event delivery/synchronous save entry and safety/queued-action processing. Remaining valid synchronous time is “other.” Invalid, failed, incomplete or unobserved values remain null/status-labeled, not zero-cost passes.
- Event audio requests and synchronous save setup are in events. Cancellation during safety handling is in safety; other audio calls can remain in other. Audio tick is the synchronous scheduler, not audible output latency. Async continuation work and other browser handlers are outside these frame brackets.
- Entry hidden/focused/visibility state and focus-event epoch are retained; no profile names, URLs, arbitrary context, user input tokens or external telemetry are collected.

The old observer >=500ms exclusion and runtime strict >500ms safety guard remain unchanged. Exact 500ms is excluded by legacy normal statistics but causes neither a new strict-long-gap incident nor a safety pause. The new incident threshold is explicitly >500ms. Neither prior render cost nor unclassified elapsed time establishes a stall cause. Instrumentation overhead itself is included in the observed region.

## Cost boundaries

Default OFF. Added frame probes are guarded; OFF reads no new performance clock or diagnostic context and allocates no recording objects. ON adds fixed eight named phase brackets, at most 19 clock reads including the entry read for a fully observed frame, bounded records and small fixed-size calculations. Statistics/snapshot copying and UI string building happen only on explicit panel open/refresh, not every animation callback. No per-frame JSON, DOM/canvas readback, polling timers, unbounded logs or network transmission was added. Existing phase calls keep their existing OFF no-op behavior.

## Tests and review

- New 13 observer cases and 9 actual-main cases all fail against unchanged a14, then pass against the patch. See red-diagnostics-final.log, red-main.log, focused-unit.log and focused-main.log.
- The actual-main tests execute production frame and ordinary mouse/key/safety handlers with real state/store logic. The parity precondition asserts a real accepted right-click hammer cast. Independent rAF/callback entry clocks distinguish costly prior callback, cheap current callback and unexplained separation. ON/OFF comparisons protect full battle data, report, save/revision and pending input.
- Synthetic end-phase increments establish bracket execution/order and duration conservation; static inspection establishes enclosed operation boundaries. They are not measured browser phase costs.
- Exact 500/501ms, retained UI after long menu/resume, candidate-only refresh, blur/hidden context, unchanged safety panel, failed render/recovery and rejected/backwards clocks are covered.
- Initial aggregate: 4,358/4,360. Two unchanged scene tests extracted source using the original `audio.tick` line anchor, lost when instrumentation was put on that line. Restoring the line break fixed both without altering assertions or behavior. Initial log is retained. Final aggregate/lint/build results are in final-summary.json.
- Independent review found and corrected a derived elapsed-time issue after invalid entry/prior clocks. No remaining blocking source issue; see static-review.md.

## Native browser handoff (not yet performed for a15)

Use only the publisher's supported dot browser and ordinary input. Do not retry the terminated nativeCanvas batches or blocked isolated Chromium process.

1. Verify R14a15 on the candidate title and open an isolated QA save through the existing ordinary route.
2. Menu → 접속 기록 · 입력 / QA → QA 접점 / 프레임 관측 → 프레임 기록 켜기; then Continue. Keep contact markers OFF unless their own observation is needed.
3. Try brief idle, ordinary movement, right-click skill and guard flows. If a safety stop occurs, preserve it; choose 전체 메뉴 열기 explicitly and reopen QA. Expand the newest “500ms 초과 간격 진단” pair and capture its actual clocks, phase values and focus state. Do not clear/toggle OFF before reading it.
4. Check long menu retention and that Continue starts a new active segment without deleting the incident. Confirm the safety dialog still exposes only its two choices and stale gameplay clicks cannot reach mutable menu controls.
5. Interpret any signature as evidence to narrow the next experiment, never as proof of GPU/device/GC/audio cause. Only after an exact incident capture, a same-input comparison at original volume versus volume 0 may be useful; audio module behavior is unchanged. Restore the user's original setting after any authorized comparison.

No a15 native motion/focus/touch, listening, stall resolution or causal attribution is asserted here. No Git write, deployment or Library upload occurred in this preparation; coordinator owns those later steps.
