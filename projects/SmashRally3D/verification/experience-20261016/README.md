# Experience iteration — 2026-10-16

Runtime source: `0668f6eb3fcd536dbf567a0dfdf2eaaf28b5015c`, from baseline `906024b`. Only `projects/SmashRally3D` is changed. Existing accepted close camera, original assets, finite-arm contact, simple controls and AI rules remain intact. AAA remains a goal; this is one evidence-backed iteration.

## Review and changes

1. Baseline actual entry/help/serve and front-target return exposed ambiguous shot ownership, a debug-style `LIMIT: SMASH > DROP`, and an attack label left on a dead ball. Feedback now names YOU/AI, explains the legal safe return, and shows RETURN between rallies.
2. Points now retain the observed failure cause and next action. Terminal points say MATCH WON/LOST · RESULTS NEXT; an actual 5–0 frame caught and verifies that boundary. Score cues use their own one-event counter rather than inflating hit sounds.
3. Four help sizes exposed a clipped intermediate Back control. Header and footer now stay visible around a keyboard-scrollable body. Actual End/Tab/Enter navigation reaches and activates Back.
4. The physical PERFECT window was already 0.08s, but the attack cue opened at 0.05s. Sharing the existing boundary gives the missing preparation signal. Quality, buffer, reach, collision timing and AI clocks are unchanged; post-contact swipe reinterpretation remains rejected.
5. Actual winning and deliberately unreturned losing games reach results and rematch. Restart resets score, pending effects/audio, miss diagnostics and the held shuttle. Selecting a technique before serve does not launch it.

## Actual play evidence

`flow/experience.json` and `flow-summary.json` describe an ordinary visible-cue UI game with no state/time injection: EASY 5–0, 17 real contacts, longest rally four returns, three normal smashes at 35.682–37.648m/s and two naturally qualified Super Smashes at 53.749–53.762m/s. These are observed trajectories, not player win-rate or balance estimates. All 17 rendered/physical racket-centre checks differ by at most 0.000000177m; the original 0.002m check remains enforced. Radial string contact is allowed; the shuttle is not forced through the exact string centre.

The live graph emitted 17 hit events and five separate point events. Sound-off play emitted neither. Offline point-sound peaks are 0.05458/0.05358 with zero final tail; that is numerical evidence, not listening. NORMAL pressure patterns recorded 13 actual AI returns and one GOOD/PERFECT direct soft winner. Separate NORMAL/HARD centre-soft defence keeps the original three-return-per-window requirement.

The three primary deliveries are `delivery/01-experience-review.mp4`, `delivery/02-experience-before-after.png`, and `delivery/03-actual-super-smash.png`. The video contains six labelled hard cuts at original wall-clock speed: safe return, normal smash, natural Super, ordinary point, winning point, and results/rematch. It uses actual captured WebAudio, with one media-origin calibration; source frames are not interpolated. The capture holds sampled frames at 20fps and does not demonstrate real-time 20fps rendering or physical AV latency. `delivery/edit.json` records ranges and SHA256. Full capture, audio and timing metadata remain under `flow/`.

Unchanged accepted camera evidence: [before](https://chatgpt.com/api/library/files/libfile_9b960e60f0548191beebe71f4ed093bf/download), [close-camera after](https://chatgpt.com/api/library/files/libfile_722c1d4e9594819195cac87caeab6386/download). The earlier [ten actual swing/flight samples](https://chatgpt.com/api/library/files/libfile_25d5a6b236a88191bc0d6d0d33260266/download) show prepare, accelerate, physical contact, follow-through and recovery from the unchanged stroke implementation; this sheet is earlier evidence, not a newly captured frame set. At1065×606 the accepted net width is66.47%, tape51.14%, hair50.94%, sole81.50%, athlete height30.56%. Near court cropping is intentional; legal singles lines and physics remain unchanged. No spectators or third-party characters/logos/background were added.

## Reproduction and retained attempts

Run `bash projects/SmashRally3D/tools/verify-experience-candidate.sh` from the repo, then `python3 projects/SmashRally3D/tools/build-experience-report.py`. The runner archives earlier reports, executes the strict unit suite and full root build, then runs ten browser cases serially. All final cases must pass without browser errors on the identical runtime bundle. Original mouse0.1px/touch1.5px aiming, six-return/clipping, mobile gesture, rotation and defence gates remain unchanged.

`attempts/` preserves superseded runs and findings. The baseline screenshot-before-command consumed the input window and is instrumentation interference. A native swipe previously reached the game after contact; it remained rejected and motivated correcting the preparation cue. One strict unit fixture exceeded its unchanged timeout during host contention; the final idle strict suite passes. An odd203×360 resized capture initially failed encoding; double-RAF viewport settling plus proportional scaling/padding fixes recording, with `encoder-check.json` retaining a separate original-failed-frame probe. Dialog observation now waits for actual native keyboard scrolling instead of an arbitrary300ms. Terminal-wrong-hint.png retains the real last-point defect. No failed attempt is presented as passing evidence.

## Remaining limits

Chromium151/Angle SwiftShader and touch emulation are the available environment. Physical-device60/30fps, Safari, speaker/headphone listening, touch/audio/display latency, a complete accessibility audit, broad human game-feel/balance testing and ten full browser matches remain open. Domain fixtures are separately identified. The Naver article is unread; no changes are attributed to it. The original13013.jpg download was blocked in the earlier camera task; accepted framing relies on parent-provided direct-image measurements, not a claim of a successful local image download. The base cb-ll project was not edited. No main merge, public-default promotion or manual deployment was performed.

## Final qualification

Strict62 tests/10 files pass; full `build:vercel` passes, with the project stage extracted into `build-final.txt`. All ten final browser reports pass with zero runtime errors and bundle SHA256 `cca484ce060f8e0dc5aba9618af99309d4e0d0b87b7e5ef19394cffa04403dc0`. Native mobile was repeated three times on this runtime.

| View | Returns | Athlete/shuttle clipping | Maximum aim error | High-clear apex |
| --- | ---: | --- | ---: | ---: |
| pc | 6 | 0/0 | 0.000030px | 9.774m |
| mobile-landscape | 6 | 0/0 | 0.390302px | 9.654m |
| mobile-portrait | 6 | 0/0 | 0.507010px | 9.642m |

NORMAL/HARD centre-soft windows each return three real contacts with zero immediate soft winners. Continuing portrait→landscape→portrait DPR2 MEDIUM touch play passes. Four help viewports retain a fully visible44px Back button and keyboard scrolling/navigation. Reports and source identity are enumerated in `qualification.json`; actual game metrics are in `flow-summary.json`.

## Saved individual deliveries

- [26-second actual play review](https://chatgpt.com/api/library/files/libfile_ff92bea7b77081919586fc263cc2fc86/download)
- [Observed before/after corrections](https://chatgpt.com/api/library/files/libfile_1410532120e0819180a91e75b583c281/download)
- [Actual natural Super Smash](https://chatgpt.com/api/library/files/libfile_f8d1530cf9188191a20ab4dbbbf4b987/download)

The bundled upload helper failed during its read-only tools/list request before preparing any upload (network). The official Codex host-upload saved these three new files; all returned xattrs were applied to their original local files. Stable IDs are in delivery/library-files.json. Media bytes were not changed after saving.

Terminal-only trailing whitespace/CR progress formatting in text logs was normalized for the evidence commit; values, failures and success gates are unchanged.
