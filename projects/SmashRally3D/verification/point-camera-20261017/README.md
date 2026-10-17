# Keep actual landed athletes framed after a point

Baseline `4800d06863e2a94b7fdf08a90bce737d4be95a72`; implementation `90e8cf1`. Same branch `codex/smash-athlete-form-20261017`. The older user candidates569cfb7 and3f18189 remain separate and unchanged. Scoring is frozen at48/60 reviewed,40unknown,overall null,V2=4; this targeted camera repair awards no automatic experience points.

## Existing deployment and playback capability

4800d06 has authorized GitHub **Vercel SUCCESS**: [exact deployment dashboard](https://vercel.com/silentstacks-projects/loop-lab/7M3xzjDW7vHEJmWd281LeZbXRwPb). Its [check-run feedback metadata](https://github.com/buildon99x/proto/runs/117340652373) provides the hostname for the [actual branch game URL](https://loop-lab-git-codex-smash-athlete-f-a949a2-silentstacks-projects.vercel.app/runs/smash-rally-3d/index.html). This branch URL follows later commits; it is not an immutable4800 URL. Real Chromium navigation before this follow-up push failed pre-HTTP with `ERR_TUNNEL_CONNECTION_FAILED`; no runtime/asset-delivery pass or proxy bypass. See `baseline-deployment.json` and `baseline-remote/remote-preview.json`.

`playback-capability.json` records available tools. Puppeteer/CDP can run and record the browser; ffmpeg can decode/encode and `view_image` can show literal stills. No active tool accepts a video for continuous temporal perception; no graphical DISPLAY/Wayland or physical GPU session is available. Starting ffplay or decoding many stills would not establish that the assistant watched normal-speed motion continuously. **Continuous normal-speed assistant watching, actual listening and physical-device verification remain false.** A software wall-clock MP4 is a review deliverable, not a substitute for those observations; the existing simulation intentionally slows when software rendering falls below30fps.

## Actual defect and minimum correction

At the first actual smash winner, the old POINT_RESOLVED branch snaps tracking shift/lift to zero, excludes actors from the lens bound and shrinks toward the ready lens. The near actor remains at its real lateral landing position and is cut by the portrait right edge. The first reproduction image was directly inspected before any code edit.

Only `app/src/main.ts` changes in production: hold the last tracking shift/lift and lens during POINT_RESOLVED/RESULTS, while applying finite joint/garment padding to the visibility bound (relative to the held horizontal camera centre). The actor bound remains active after a viewport turn. The normal serve/restart restores the existing base framing. RALLY tracking, aiming freeze, pitch/FOV constants, court, poses, solver, AI, controls and all5models are unchanged. No actor/ball position, time, hit or score is rewritten. A result card intentionally covers the middle of the canvas; projected viewport inclusion is not a claim that the modal exposes both athletes.

## Evidence roles

`before-portrait/` and the final `after-*` folders use visible menu/settings/start and real court clicks at the original HIT NOW cue. A read-only frameend observer retains every phase's camera, projected joints, real positions and score. Those are ordinary UI runs; the mobile viewport route uses mouse/court input and does not claim physical touch. Rotation includes the actual point window; existing native touch and continuing-rally rotation have separate reports.

`preserve-*` folders are explicitly separate held diagnostics: fixed update cadence to the first real serve, hold update/autoRender, disable CSS animations only in the test, capture repeat PNGs, restore. They establish unchanged ready pixels/composition; they are not uninterrupted match or normal-speed feel evidence. Point images intentionally change camera and are compared side by side, not byte-gated.

`attempts/viewport-probe/` preserves an avoidable harness failure: a separate Puppeteer status connection used its default viewport and resized both live pages to800x600. Those runs were stopped and are excluded from qualification. Their screenshots/states and TargetClose errors remain. Clean runs have no external DevTools connections and reject any viewport outside their declared portrait/landscape sequence. The first old portrait clipping screenshot predates that probe; interrupted candidate screenshots are not portrait acceptance.

## Completion status

[Qualification](qualification.json) completes10 browser reports on the recorded before/current bundle hashes: baseline portrait,3current lifecycle viewports, native continuing-rally rotation, three-viewport aim/high-flight rally, and4separate ready diagnostics.81strict units/14files and fullrootbuild pass. All5model hashes and17other runtime files remain identical. The archived interrupted attempts are excluded.

Clean baseline portrait: RALLY897samples/0clipped; POINT_RESOLVED228samples/183clipped; RESULTS8samples/8clipped. Clean current portrait: RALLY991samples/0clipped; POINT_RESOLVED225samples/0clipped; RESULTS8samples/0clipped, including point-time portrait→landscape→portrait and real5–0match/restart. All3current views reach results/restart and have0point/result joint clipping; inspect their explicit counts inqualification.json. These are viewport joint projections, not visibility through the modal or a physical-device quality claim.

The five old portrait RALLY→POINT camera position steps are1.56–2.45m; the largest lens contraction is11.95°. All five current portrait transitions hold camera position and FOV exactly (0step), preserving the just-played rally view. Separate PC1065×606 and portrait390×844DPR2 held-ready original-repeat/current-repeat/original-current pairs have0changed pixels and identical state. Ready/starting court and athlete proportions are thus unchanged; ordinary rally/point captures are independent UI runs, not falsely matched poses.

- [Literal portrait lifecycle comparison](delivery/01-portrait-lifecycle-before-after.png)
- [Actual point views and rotation](delivery/02-point-views-and-rotation.png)
- [Actual silent wall-clock browser recording](after-portrait/actual-lifecycle-silent.mp4), about200s; original CDP timestamps and holds, no interpolation, no audio. Slow software rendering/simulation catch-up is retained; this is not a normal-speed experience certification.
- [Nine literal decoded video samples](delivery/03-literal-video-samples.png), [source hashes](delivery/sources.json), [direct raster review](manual-review.json)
- [Unchanged scoring decision](score-preservation.json): all20scores/weights preserved48/60reviewed,40unknown,overall null,V2=4,target98false.

No physical-device/Safari/FPS/latency, continuous normal-speed temporal watching, actual listening, diverse human strategy or remote runtime/asset-delivery verification. No cb-ll edit, new branch, main merge/default promotion, manual deploy, alias/protection change, Library write or proxy bypass.
