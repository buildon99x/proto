# Ordinary UI net finish follow-up — 2026-10-15

Source base: `da8eff7e5264477c5cbb52cf63f0c6f2639669c7`. Runtime fix: `3db6c23` (full SHA in summary). Final bundle: `index-Dz_tpUCS.js`, SHA256 `85393f1d8c177647cf4d7ac912a45e3d0b9cd553c312eb0b947f9779c7a92770`.

`baseline-ui.json` uses the inherited CM6QE_73 bundle. Three ordinary UI soft/pressure/alternating patterns confirm player net shots, but no net finish. It must not be counted as a test of the new runtime.

`player-net-finish-ui.json` records the new runtime's full NORMAL match: 46 actual contacts, 18 visible-cue commands, score 4:5. All actions use normal UI (mouse, Shift, right click), with a fixed 120ms reaction after the text cue. Read-only telemetry supplies screen projection and observations; there is no state injection or input scheduling from contactAt. This is a repeatable software controller, not human difficulty testing.

The actual sequence at contacts 30–32 is a player rear-court drop, an AI WEAK net return, then a player PERFECT net finish at height 1.834m and 0.597m from the net. AI body moves from z=3.641m to z=0.972m during the setup, with 3.116m court displacement including its lateral movement. The finish launches downward at -1m/s and the player wins the point, serving next. Shared production flight reconstruction yields 0.542s, apex 1.834m, legal tape clearance at 1.572m and landing (-1.805, 1.350)m. Those exact flight numbers are numerical reconstruction from real launch data, not sampled browser flight. `flight-comparison.json` and its rerunnable analysis tool distinguish both sources.

The separate `player-net-finish-traced-ui.json` repeats the full 4:5 match with 3,941 read-only snapshots, 46 valid physical contacts and 46 unique audio/FX callbacks. It independently repeats player net and net finish. Its setup drop has observed sampled apex 3.389m, the rushed AI net reply 2.214m; the finish launches downward from 1.835m and actually lands at (-1.993, 1.350)m. Its 58 finish-flight/point samples include the landing, which has zero discrepancy from production-integrator reconstruction. The first landing sample is 0.567s after launch; reconstructed exact flight is 0.542s, so sample time is not claimed as exact landing time. The opponent body moves 3.123m during this replay’s setup. `flight-comparison.json` is derived from this complete traced replay.

`mobile-beginner-report.json`: existing CLEAR button selected once, then 3 native emulated taps yield 6 returns across both actors, with 4 player contacts including serve. No double input is inferred from the aggregate. New `mobile-beginner.png` uses the new bundle.

`player-net.png`, `player-net-finish.png`, and `mobile-beginner.png` are fresh actual browser screenshots; no query pause or injected contact is used. Their exact hashes, source reports and Library outcome are in `screenshot-manifest.json`.

The renewed EASY/NORMAL/HARD ordinary UI regression passes with 121 contacts, 50 cue-triggered commands, zero runtime errors and maximum20 returns in EASY. Scores are5:0 /4:5 /0:5; this fixed controller is not a human difficulty evaluation. The raw report is `three-difficulty-ui.json`, with per-match foot/contact/audio checks.

35 unit/regression tests pass, including reconstructed contact fixtures for both actors and an ordinary start/command/step tactical net-finish sequence. Those domain tests are separate from the normal UI evidence. Project typecheck/build, registry sync and full build:vercel pass. The generic verify wrapper cannot correctly map this package name to its case-sensitive project folder, and its generic WebGL flags fail in this environment. These wrapper failures are retained in `checks.json`; the project's documented Angle SwiftShader browser runner is the operative UI check.

Library upload was attempted through the current official prepared-upload helper, including one permission-expanded network retry. Both failed before preparation at `hosted apps tools/list request failed: network`; no Library file ID was returned. Original PNGs remain committed on the requested branch, with file hashes and remote paths for delivery. No main merge or public-default promotion.

Physical device performance/input latency, Safari, actual listening/A/V feel, and human novice comprehension/difficulty/coaching realism remain unverified. Software SwiftShader frame rate is not a hardware performance result.
