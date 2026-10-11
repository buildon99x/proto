# R14a13 frame-stall investigation

## Scope
Read-only investigation of frozen a13 (commit 495c6d3f07b2dbc2970d641b629f2a1dcd2dd4fc) against a12. Native normal-input QA is owned by the publication worker. This folder contains diagnostics, not changes to either frozen candidate.

## Confirmed so far
- Native QA reported repeated >500 ms rAF-gap safety pauses while the page was visible/focused, including a short movement sequence. This establishes a callback gap, not its cause.
- The fresh recorded D800ms segment had 48 regular rAF intervals (median16.70/p9516.80/max416.50 ms), 49 JS samples (median4.40/p959.70/max278.20 ms), step maximum1.80 ms, render maximum4.60 ms, HUD maximum7.30 ms. >500 ms intervals are excluded from regular summaries; this is not the exact earlier suspension sample. Different component maxima need not belong to the same frame.
- New warrior rig draws only for known action or guard. Plain walking/idle returns null before rig.render, retaining the existing baked atlas.
- Rig uses one128×128 reusable surface and at most four sets of11 cutouts. No runtime getImageData/readback. Source code caches by direction. Small per-draw pose/vector/function allocations exist but there is no unbounded cache.
- New enemy reactions have bounded draw work; old death blast/particles are replaced, not unboundedly appended. Audio has16 live-voice and128 cooldown-entry caps.
- Old full-map scanning, floor cache rebuilding at96px camera drift, dynamic gradients and10Hz HUD rebuilding are unchanged from a12. These merit measurement but are not proven causes.
- Total frame time includes work outside named brackets: control/aim sampling, checkpoint dispatch before await, scene preparation and audio. A low render number cannot exclude those or deferred GPU/compositor work, GC, scheduling or browser tooling.
- Recent browser warning/error entries were extension metadata-send errors; they do not prove a game error or establish the stall cause.

## Safety policy
Keep runtime-clock.js >500 ms threshold, frameDelta clamp, pause cancellation, and gameplay/save semantics unchanged. A separate a14 safety-dialog containment improvement is authorized; it must not be described as a renderer/stall fix. No actual stat or skill allocation change was observed in QA, only unintended entry into the skill layout panel after later fresh clicks.

## Isolated benchmarks
benchmark-core.mjs compares production renderers and exact original art in synthetic identical scenes. benchmark-native.mjs uses installed Node native Canvas; benchmark-browser.mjs uses a separate installed headless Chromium, loopback-only synthetic page with no game main/input/storage. Neither is live gameplay acceptance, GPU presentation timing, audio listening, or a substitute for the recorded native QA. They must run after native QA ends to avoid shared-CPU confounding.

## Benchmark outcome — 12:41 UTC
Two nativeCanvas scene batches were terminated with exit137. Logs retain completed rows; neither run is an aggregate pass and neither reached the a12 paired comparison. The second used60 measured frames and benchmark-only single-pixel readback after the timed render call to flush deferred native work. That did not complete the batch either. Termination cause was not established; it must not be presented as the native-browser stall cause.

Within those partial runs, both complete2,000-sample rig loops retained45canvases/295,745pixels. Cold directional builds were at most5.68ms, warm sampling/rendering at most2.32ms (two runs differ; machine-local native measurements). The2,000 ordinary-walking probes created zero rig canvases and drew no rig frame. These are useful bounded observations, not a whole-scene/GPU pass.

The isolated Chromium benchmark could not start: process_singleton_posix.cc failed to create its socket with Operation not permitted. One official require_escalated retry was accepted by the action tool but hit the same OS restriction. No third launch, altered security settings, alternate escape flags, or connection to the actual QA browser was attempted. Browser and paired full-scene performance benchmarking remain incomplete.

No renderer code is changed on these findings. The a14 candidate changes safety-dialog ownership only. Its visual, audio, combat, thresholds and original resource bytes must remain identical to a13.
