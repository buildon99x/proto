# R14a15 frame-stall diagnostics: static review

Reviewed 2026-10-11 UTC against frozen R14a14. No remaining blocking source issue was found in this narrow diagnostic scope. No gameplay source was edited by this reviewer.

## Scope and findings

- Runtime `frameWasSuspended` remains strictly `>500 ms`; the delta clamp and gameplay/input work order are unchanged. Legacy observer `>=500 ms` statistical exclusion remains separate and is explained in the UI.
- The 12-pair incident ring is independent of the recent-frame and last-active rings. It survives menu eviction and the next active segment; existing clear, disable, travel, profile-load, and reload boundaries reset it.
- Previous observed rAF, runtime guard reference, callback entry/end, actual frame safety-stop marker, and entry focus/visibility context are distinct. An abandoned callback cannot attach an older completed callback as its immediate predecessor.
- Incident snapshots detach both samples and each mutable context/phase object. Stored context is a bounded primitive allowlist. No storage, network, timer, scheduling, or gameplay ownership was added to the observer.
- New safety, input, events, scene, and audio-tick brackets are disjoint from existing step/render/UI brackets. OFF paths avoid new diagnostic clock reads and context allocations. The callback end stamp precedes observer finalization and next-rAF scheduling; UI wording correctly calls this an observation end.
- Found and resolved during review: rejected entry or backwards previous clocks could originally fabricate a positive between-callback duration. The final code requires both completed observations to have valid work status, and regression coverage keeps this derived duration null for both cases.

## Evidence examined

Read final source and focused tests; inspected the coordinator's recorded results rather than independently rerunning its suites:

- `focused-unit.log`: 45 pass, comprising 32 existing observer tests and 13 new diagnostic tests, zero failures/skips/cancellations.
- `focused-main.log`: 9 new actual-main tests pass, zero failures/skips/cancellations. These execute production handlers/frame code with real state/store logic and synthetic DOM/render/audio boundaries.
- `red-main.log`: the same nine diagnostic main cases fail against the frozen baseline, establishing that their diagnostic expectations are not inherited baseline passes.
- Re-read the final audio-tick bracket after its formatting-only correction: `audio.tick` is restored to its original separate line for existing source-extraction fixtures; bracketing, work order, and runtime behavior are unchanged. Initial full-run scene fixture failures remain recorded; `focused-scene-contract.log` verifies both affected production-scene cases pass after the correction, with no assertion changes. Final aggregate results are pending coordinator verification.
- Reviewed source SHA-256: `frame-observation.js` `8b30bbd513cbf4df6fe81f4734100cebbceb849e47f467038e601b6bb3400969`; `main.js` `8430cbe5e0e216cbdd04adde35484c79fa701c361e983dfb54bad9cf470adabd`.

## Verification limits

Synthetic phase increments at `endPhase` prove bracket execution and duration conservation, not measured cost of each enclosed production operation; static inspection establishes phase contents. The final ON/OFF parity case now executes the production mouse handler through `mouseDown(h,2)` and asserts accepted `righteous_hammer` plus `castSerial===1` before paired frames. This resolves the earlier both-no-op combat-precondition concern.

This review establishes neither the stall cause nor a performance improvement. Native input/focus, real browser timings, GPU/compositor work, GC, other event handlers, asynchronous save continuations, and audible output remain outside this evidence. No nativeCanvas, Chromium, or browser benchmark was run or restriction bypassed. Aggregate tests, build/lint, archival, Git, and publication remain coordinator-owned.
