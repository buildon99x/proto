# Stroke chain and athlete color ·2026-10-17

Previous accepted runtime/evidence:9fbeeab, reviewed39/55,45weight unverified, overall null. Same frozen20×5rubric at../switch-benchmark-20261017/rubric.json, SHA256 acbd3311fa6e000b9c03d2b8d8a3736c35a377c89912c72a88b1e085aef5b438. No changed weights, easier experience criteria, normalized subtotal or invented98-point completion.

## Actual defect and causal changes

The original literal frame sequence showed the arm staying low until shortly before the hit, then rising abruptly. Fresh ordinary-input baseline data confirms visible loaded preparation only.017–.042sim seconds before the first five human normal/Super attacks; in-.45..-.18s samples the loaded fraction is0and the elbow averages152.4deg. Isolated120Hz diagnostic poses additionally show frequent arm extension and overhead hopping. These isolated poses are labelled separately and are not ordinary-play evidence.

Motion commit`cd91361`: a render-only layer anticipates an already perceived high incoming contact, brings the elbow into a bent preparation, rotates the visible gripping hand along the actual racket, and absorbs landing with bounded body/knee compression. Clear/smash/high-drop share a preparation; choosing a safe high return does not drop the prepared arm. Low strokes and serves retain the original motion. No input command, hit, perception or extra AI knowledge is created.

The domain game, physics, original skeleton, motion-data and camera-framing source files are byte-identical to9fbeeab. The presentation result is never used by the solver, swept collision, prediction, foot motor or AI. The original physical racket and predecessor remain identical from hitFrame−60ms across the collision window; actual rendered contact frames bypass the presentation layer. The camera uses the original domain-pose envelope so the new visible arm cannot change framing. No normal-play time-scale change or video speedup.

Do not remove every clear jump: actual high clear contacts can already use the full arm reach, so removing the hop would stretch bones or move the contact. This change preserves those jumps and original foot x/z trajectories. It adds loading/landing bend; a comprehensive heel/toe and locomotion overhaul remains open.

First prototype partially improved preparation but double-applied the old physical wrist cock: one measured acceleration specimen tilted103.9deg versus81.8deg in the baseline. It is retained under`attempts/additive-wrist-motion`. The accepted version blends a single canonical load basis into the physical basis. No three stagnant attempts occurred; see`iteration-ledger.json`.

## Separate material correction

Art commit`ca5471b`: the athlete author previously placed sRGB hex values directly in linear glTF baseColorFactor. Installed PlayCanvas2.23.2 glb-parser gamma-converts this input, washing out the intended palette. Only athlete generation opts into standard sRGB-to-linear factors. Two athlete GLB binary buffers, geometry/rig/skin/animation JSON and every other model asset remain identical; only material factors change. Proof:`art-asset-validation.json` and`stage-model-manifests.json`.

The engine Color.gamma uses a2.2power approximation rather than the exact standard sRGB transfer. Standard transfer round-trip is validated separately; the measured imported-channel approximation error(max~.02265) is reported in`art-import-colors.json`, not hidden as bit-exact palette recovery.

Held ordinary-input phases compare legacy/corrected diffuse colors on the exact same pose, clock and applied camera. Full update is paused only while taking diagnostic images, then original update/timeScale1/auto-render are restored and checked. Color isolation changes0pixels outside conservative joint±.35m athlete bounds. This is an isolation test, not an experience score or a normal-speed video.

## Evidence interpretation

- `before`: fresh ordinary original visible-cue UI match,640×360LOW, no game/pose/time injection, actual CDP video/WebAudio and read-only frame traces.
- `final-play`: same original controller and fixed domain clock with accepted motion+color. Other final folders repeat the complete previous14browser gates, including3independent native gesture/lesson repetitions.
- `phases-before`, `phases-motion`, `phases-art`: initial held phase investigation. The early acceleration label was too close to the contact window; these specimens are retained and superseded by`refined-phases-*`for the final phase sheet.
- `refined-phases-*`: naturally reached preparation, earlier acceleration, actual contact, follow-through, landing and return; each shows actual relative phase time. The candidate applies the baseline camera parameters. Numerical quaternion round-trip differences are reported; the initial naive JSON-equality failure at~1.6e-18is retained under attempts. No arbitrary visual threshold was invented.
- `final-play/kinematics.json`: actual sample-based lead, elbow, wrist/grip, bone, landing and contact data. Max speed is an observed finite difference, not a full peak measurement, energy change or a feel score.
- The first live trace excludes dead-ball phases; some Super landing metrics are null because a point resolves before the sampled landing window. Null does not mean no support. Held phase and source video provide separate views.

Raw CLI transcripts retain original carriage returns/whitespace. Source/JSON checks and meaningful simulation/browser gates are separate.

## Review and remaining work

Motion-only, with old materials held constant:39→40/55(V4+1). Material-only, on the exact same candidate pose:40→41/55(V2+1). Direct image review is single-reviewer, stated-scope evidence; technical pass counts do not award points. All nine unknown items remain null, weight45; overallScore null and target98 false.

Code/art work still possible: V3flat facade/tree environment; more expressive independent character geometry; heel/toe articulation and broader stance/locomotion; lower-stroke detail and further follow-through polish; fuller focus/zoom/accessibility work. This update does not assert that the product has reached98or that only access blockers remain.

Access-dependent work remains unavailable/unverified: physical mouse/touch and physical AV latency; actual speaker/headphone listening; real-device comfort and natural-speed motion; multi-person beginner/fairness studies; direct reference-video watching. Shell and software Chromium access are proven, not a physical dot/device session.

Original13013.jpg: current native Library read resolves the correct image metadata(1065×606,169400bytes), but the actual byte transfer again fails. The worker has not directly seen those original pixels; the parent's existing observation and composition measurements remain the authority. No third-party character, logo, background or sound is copied. Prior BWF402PaymentRequired research failure was not retried or used as viewed evidence.

## Final completed verification and deliverables

All existing runners finished successfully; no duplicate functional run was started. Strict units:77/13files. Registry sync and complete root build:vercel pass; generated registry was restored to keep the diff project-only. All14final functional browser reports pass with0runtime errors and the same JS SHA2568bda7e1ceccef6ce617d389476d3d677ad08fc7e46fadba7a0f99799274b4cde AND all five model hashes. Three refined phase reports additionally pass and restore timeScale1, auto-render and original update. See`qualification.json`, `tests-final.txt`, `root-build-final.txt`, `finish-checks.txt`.

Three native gesture/lesson repetitions and continuing DPR2 MEDIUM rotation pass. NORMAL/HARD centre-DROP defence observes6physical AI returns with0immediate soft winners; original pressure patterns produce13returns and1GOOD/PERFECT winner. PC/landscape/portrait each reach6returns with0player/shuttle clipping or tutorial occlusion. Actual cue anchor maxima are.021012/.021757/.021437CSSpx. Four ready-view camera positions/FOV and target projections are unchanged from the accepted baseline; spectators remain0. The ordinary5–0match has17physical and17rendered contacts, maximum centre error1.760e-7m,17hit cues/5point cues, both counters0muted.

Final direct raster review is recorded in`manual-review-final.json`. The earlier acceleration is selected by the actual motion kernel phase, not a late guessed timing threshold. Motion/color phase sheets, actual source-frame sequence,12consecutive contact frames, decoded video samples, scorecard and final mobile/ready screenshots were inspected. Keep the41/55assessment within this explicitly limited frame-review scope. It is now marked reviewed in stated scope after final gates; overall remains null and45weight unknown. No real-time playback watching, hearing, device feel or original reference-pixel comparison is claimed.

- [Before/after normal and Super swing video](delivery/01-stroke-review.mp4): four7-second source excerpts,28.021333s H264640×360+AAC audio; actual wall-clock1x software capture, no pose interpolation/time rescaling or per-event audio replacement. Different software-render throughput prevents natural-speed/latency certification.
- [Motion-only six phases](delivery/02-motion-phases.png): legacy materials held constant; same applied baseline camera. Exact relative simulation times are labelled; samples are naturally reached held diagnostic states.
- [Material-only six phases](delivery/03-art-only.png): exact same pose/time/camera;0changed pixels outside conservative athlete bounds in all6pairs.
- [Frozen scorecard](delivery/04-scorecard.png):39→40motion→41color/55;45unverified, target98not qualified.
- [Actual source-frame swing sequence](delivery/05-actual-swing-sequence.png) and [12consecutive captured frames](delivery/06-consecutive-contact-frames.png), with source hashes/timing in`delivery/swing-sources.json`.
- [Current1065×606ready composition](delivery/07-current-ready.png) and [decoded video samples](delivery/08-decoded-video-review.png).

## Library save and scope

The final seven-file ordered Library save was attempted once with the current official helper and failed during read-only tool discovery: `library upload failed: hosted apps tools/list request failed: network`. Zero files were saved; no prepare/transfer/finalize started and no fallback or repeated write was attempted. This is an observed network failure, not a quota diagnosis. The existing scorecard identity and retained version0guard were preserved; its older Library content remains unchanged. Exact non-secret status:`library-save-status.json`. Local/Git deliverables above are complete.

All work stays under this project on codex/smash-rally-3d; no cb-ll edit, main merge/default promotion or manual deployment.
