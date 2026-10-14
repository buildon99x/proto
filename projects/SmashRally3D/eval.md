# Acceptance evidence — 2026-10-14

This is a playable prototype. Functional checks below do not certify AAA production quality, novice usability, physical-device FPS or audible A/V sync.

| ID | Status | Evidence / limit |
|---|---|---|
| QA-01 | PASS automated UI | EASY six-return rallies, 5:0 results, rematch and pause; final NORMAL clear/drop/smash match 5:0, longest four returns. Real mouse/touch events, read-only timing assistance; no game-state injection. |
| QA-02 | PASS numeric + inspected visuals | 1000 launches; all legal net crossings; maximum target landing error 0.002341m; prediction/runtime difference zero. Clear, drop and smash have distinct envelopes. |
| QA-03 | PASS automated | Signed horizontal target direction and left/center/right solver cases; normal UI selected targets retained. |
| QA-04 | PASS domain / UI samples | PERFECT/GOOD/WEAK/MISS thresholds and unreachable case tested independently; actual UI showed perfect/good/weak shots. |
| QA-05 | PARTIAL | One callback per valid contact; fixed hit frame controls velocity/SFX/FX and procedural racket reach. GLB body playback is blended separately. Frame-exact A/V alignment and audible latency need high-speed/device inspection. |
| QA-06 | PASS automated | No per-tick movement over shared speed bound; actual contact rechecks distance/height. Three difficulty profiles tested. |
| QA-07 | PASS automated tactics / human pending | Normal UI produced clear/drop/smash attacks, weak returns and physical points. Human tactical depth and five-shot balance still need play review. |
| QA-08 | PARTIAL | Same speed/acceleration/reach/solver across difficulty; reaction delay, timing error and repeated-target recovery bias. Intercept predictor still knows authoritative flight after the delay; human fairness/win-rate study pending. |
| QA-09 | PASS emulated touch | Real CDP tap/up-swipe/down-swipe, command before pointerup, start target retained; landscape and portrait inspected. Physical phones and Safari unverified. |
| QA-10 | UNVERIFIED devices | Browser software renderer approximately 10–24fps across parallel and isolated runs. This is not a physical PC/mobile performance measurement. Runtime dist about 1.5MB uncompressed; engine JS about 324KB gzip. |
| QA-11 | PASS final automated UI | Ten consecutive matches on final runtime completed without runtime errors. Observed JS heap varied from 11.3 to 15.9MB; this is not conclusive GPU/leak profiling. Reports distinguish deliberately omitted returns from full skilled-human play. |
| QA-12 | BLOCKED direct validation | Existing Vercel branch Preview builds succeed; this environment receives proxy 403 before connection to the Preview host. Browser/access level and published-host execution cannot be certified here. Security/access settings unchanged. |
| QA-13 | PASS provenance | Original GLB source, nine named clips and synthesized audio; dependency/asset provenance in assets/LICENSES.md. Rigid articulated models use no skinned skeletal mesh; production character polish remains a limitation. |
| QA-14 | PASS automated controls | Sound/flash/trail/shake controls, mute produced zero impact audio events, reduced preset, readable textual timing, pause/context-loss retry inspected. |

Evidence: `assets/reports/physics-1000.json`, `assets/reports/unit-tests.json`, `assets/screenshots/shots/*-report.json` and inspected PNGs. Forced WebGL context loss is a fault-injection check; unreachable domain setup is a unit test. Neither is counted as normal UI play.

High-clear framing correction: stable sports camera, observed projected Y range 119.70–466.55 at 1280×720 across a four-return clear rally, replacing previously clipped high flights.

Root `pnpm sync:registry` and `pnpm build:vercel` pass. No main merge performed. No paid account, new security setting or permission expansion used.
