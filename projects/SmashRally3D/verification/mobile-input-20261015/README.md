# Mobile input follow-up — 2026-10-15

Base: `b5e0563fbd8808cd3794bd57572842940a0311ac` on `codex/smash-rally-3d`. Only this project and its generated registry timestamp are changed. The default cb-ll checkout is untouched. No main merge, manual deployment or public-default promotion.

## Diagnosis and change

Two different limits were involved:

1. A reserved swipe was rejected at forecast contact minus45ms, although the first physical hit-frame/attempt had not run. The deterministic command-driven replay classifies33.33ms before forecast contact. Before: both requested CLEAR and DROP are rejected and the original DEFAULT produces an actual smash. After: actual clear/drop contacts, retaining the original swingAt/hitFrame and command aim/time. Actual collision times differ by technique because finite racket poses still have to meet the ball; no contact is fabricated.
2. MEDIUM SwiftShader can block delivery of the next pointer task while the update catches up100ms per frame. A follow-up native run of the initial candidate reproduces DROP submission200ms after pointerdown, after the reserved contact. That event correctly stays rejected. Raw pointer handling alone does not solve this case. See `native-trace/mobile-native-report.json` (initial candidate failure).

The final update bounds catch-up to four120Hz steps (33.33ms) per rendered frame, independent of whether any pointer is held. At30fps or above simulation retains its intended rate. Below30fps gameplay slows instead of consuming a full preparation between input tasks. This is an explicit low-frame-rate pacing tradeoff; no gesture-specific freeze, physical rule, speed limit, AI delay, input timing-quality threshold or flight solver changes. The usual fractional accumulator is retained up to the per-frame budget; excess wall-clock backlog is discarded.

Raw pointer movement and pointermove fallback share a once-only22px classifier. The first hit-frame/attempt freezes the reservation, even if that attempt has not yet collided. The same gesture preserves initial target/time and swing clock. Pointerup never submits again. A monotonically increasing gesture ID distinguishes contacts sharing the same simulation tick. Secondary pointerdown/cancel cannot replace/cancel the owner. An owner cancel can stop an already prepared swing before its first hit-frame; after that boundary it cannot undo a hit.

## Before / after evidence

- `before-standard.json`: a fresh native MEDIUM up/down run **passed** on the base. The historical failure is intermittent, not claimed to reproduce on every base run.
- `before-boundaries.txt`: four newly exposed failures in the base: late clear, late drop, prepared cancellation and same-tick gesture identity. The existing38 tests pass (`before-tests.txt`). `after-boundaries.txt` records real emitted clear/drop contacts and unchanged clocks; these are command-driven domain diagnostics, not ordinary UI play.
- `before-lifecycle/mobile-input-lifecycle-report.json`: observational base run with assertions disabled. Runner `pass:true` means recording completed, **not** feature acceptance. Its raw-up then opposite fallback fixture emits DROP because base ignores raw events. The six cases also record held tap, fallback down, owner cancellation, secondary input and post-contact movement. Native touch-down plus synchronous synthetic DOM event fixtures; no ball/actor/time injection. This is not a native swipe or human-play claim.
- `lifecycle/mobile-input-lifecycle-report.json`: initial candidate passes all six fixtures. `lifecycle-final/...` preserves a later **harness failure**: it compared current command to a snapshot taken before a real contact had already cleared that command. The corrected harness compares immediately before/after the secondary event. `lifecycle-corrected` was stopped when the render-clock change superseded its bundle; not counted as a completed pass.
- `standard/mobile-report.json` and `beginner/mobile-beginner-report.json`: initial candidate native up/down and3-tap/6-return beginner checks pass. These validate only their recorded initial-candidate bundle.

Final-candidate results are recorded separately below; the complete source-bundle/hash record is in `bundles.json`. Screenshots are actual browser captures. `standard/mobile-03-drop-threshold.png` was visually inspected; it shows GOOD · DROP with the original three-button UI. Physical devices, Safari, actual listening, human difficulty and physical input latency remain unverified.

## Reproduce

Use the project README's pinned pnpm setup. From the repository root:

```sh
pnpm --filter smash-rally-3d test
pnpm --filter smash-rally-3d build
SMASH_EVIDENCE_DIR=/tmp/smash-native node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/mobile-native.mjs
SMASH_EVIDENCE_DIR=/tmp/smash-lifecycle node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/mobile-input-lifecycle.mjs
```

`SMASH_DIST` serves an isolated baseline without editing the active checkout; `SMASH_PORT` isolates listeners. Run browser scenarios sequentially to avoid unnecessary renderer contention. `SMASH_INPUT_OBSERVE=1` explicitly disables lifecycle assertions for comparative observation. The native wrapper preserves pointer traces even if the standard gesture assertions fail. No production dependencies were added for browser tooling.

## Hosting limits

The GitHub connector reports baseline Vercel success at deployment `69CEfdQLw33vhSwYLQAq4GYg9HvM`. Shell GitHub API access is Forbidden, while connector status retrieval succeeds. Curl to the existing execution URL fails at the network proxy's CONNECT tunnel with403, before an application HTTP response. This is a tool/network block, not evidence of an app failure. No remote bundle hash is asserted without reading its bytes. Details: `remote-check.json`.

## Final candidate checks

Runtime commit: `2f199b6fc3c561a6226ab808d45d0329c9592874`. Final bundle `index-BJK7yYXT.js`, SHA256 `982c6371d74eccaddf2266f85cc11c4ca5afc1047d6a628bdeab29bc4527d008`. Local app and generated launcher bytes match. The full root build/typecheck and45 tests pass (`final-root-build.txt`, `final-build.txt`, `final-tests.txt`). A later focused7-test run adds before/after physical-contact logging without changing runtime code.

| Input / boundary | Base observation | Final observation |
|---|---|---|
| Held tap, no release needed | One actual clear | One actual clear |
| Native up/down, MEDIUM | Fresh base run passes; historical intermittent failures retained | Two final runs pass, including concurrent SwiftShader renderer load; actual clear/drop |
| Raw up followed by opposite pointermove (DOM fixture) | DROP; raw path absent | CLEAR; earliest classification wins once |
| Fallback pointermove down | One DROP | One DROP |
| Late clear/drop,33.33ms before forecast contact (domain replay) | Both rejected; actual SMASH | Actual CLEAR / DROP, original swing clock retained |
| Owner cancel while already prepared (domain replay) | Cancellation fails; actual SMASH | Cancellation succeeds; zero player contacts |
| Different gesture sharing issuedAt (domain replay) | Owner replaced; actual DROP | Owner preserved; original SMASH |
| First hit-frame / post-contact movement and cancellation | Existing hit stays unchanged | Existing hit stays unchanged; no duplicate on release |
| Native secondary contact / unrelated cancel | Recorded separately; command may already have collided | Owner state unchanged across the event, including an already-cleared command |

`final-native/mobile-native-report.json`: trusted raw and pointermove events for both swipes, same accepted reservation; simulation submission delays50ms CLEAR /66.67ms DROP. `final-native-contention/...`: another pass while a separate MEDIUM lifecycle renderer runs. These are software-emulation delays, not physical-device measurements. `final-lifecycle/...`: six native-touch-down/DOM-boundary cases pass. `final-beginner/...`: existing CLEAR button once, then3 native taps →6 returns and4 player contacts including serve. These final reports identify the final bundle and have no runtime errors. The final DROP-threshold screenshot was also visually inspected; the three-button layout is intact.

The initial-candidate failure and invalid-snapshot harness failure are intentionally retained, not counted as final successes. Superseded mixed/drop/lifecycle runs were explicitly stopped when the pacing change invalidated their bundle; their partial logs are labelled `superseded-*`, not completed regressions. The final same-bundle mixed/drop checks are separate reports.

Final NORMAL mixed UI match: score0:5,20 real contacts,7 visible-cue inputs, max7 returns, six techniques and zero runtime errors. The configured yield after16 returns never triggers. All20 unique audio/impact events and rendered contact/stance checks pass; max planted-foot displacement0.000000603m. This is software control, not human balance evidence. `final-mixed/drop-defence-regression-report.json`.

Runtime Vercel candidate `4RKiaUJwS6WJgeCePZgcqstxCcSL` reports **success** for2f199b6 through the GitHub connector. Repeating curl with explicit network permission and the web open fallback still cannot obtain execution-URL bytes; remote actual-bundle verification remains blocked.

Final DROP defence smoke check: nine ordinary UI windows, EASY/NORMAL/HARD × centre/wide/clear-soft, each bounded after3 settled soft flights. This smaller post-input regression is separate from the prior AI-fix9-match/15-flight evidence, not a replacement balance estimate. All27 actual soft flights receive real AI contact returns:18 confirmed successful next collisions and9 replies still in flight at the window end; zero reply faults and zero direct soft winners. Each difficulty has9 contact returns,6 confirmed successful and3 unresolved. There are6 closed points in total (all AI); EASY has none, so its point-win rate is undefined. Techniques and timing-quality splits remain in `final-drop-analysis.json`.

Maximum continuous observed AI speed:5.80000000000037m/s (floating-point tolerance). Minimum observed reaction delays:0.500 /0.300 /0.183333s for EASY/NORMAL/HARD, consistent with the unchanged0.5/0.3/0.18s profiles at120Hz. No AI physics/planner/motor parameters were changed by this follow-up. Final source report: `final-drop/drop-defence-report.json`, all nine windows completed with no runtime errors. The analyzer uses the same logic as `tools/analyze-drop-defence.ts`, restricted to this final report; successful means a subsequent actual player collision or an AI IN point, not merely an AI contact.

All final browser reports (native, native under renderer contention, lifecycle, beginner, mixed and DROP) identify the same final bundle. `manifest.json` hashes every retained evidence file. Historical/superseded failures remain labelled; they do not certify the final bundle. Direction controls retain initial court-tap/mouse aim, the22px vertical threshold and the original three shot buttons. No physical-device/Safari/listening verification or human balance certification is added.

Console `.txt` logs normalize trailing whitespace/newlines only. JSON report and PNG evidence bytes are preserved.
