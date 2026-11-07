# Court framing and stand removal — 2026-10-15

Base: `bca895778ec7e67775227f64854516f2074ea08c`. Runtime change: `29dc43aaf112dfe8616fab80c424c66813236872`. Branch `codex/smash-rally-3d`; the fetched remote and initial working tree matched and were clean. The default cb-ll checkout is untouched. No main merge, public-default promotion or manual deployment.

The48 seating/spectator scene nodes are removed at construction, for every quality level. The camera now fits a conservative court/athlete/high-clear envelope to the available viewport instead of selecting two fixed positions and wide FOVs. It uses a44° vertical FOV and a responsive distance/pitch; the view is stable during a rally, with no ball chase or per-shot zoom. The tested final views use28° downward pitch on desktop/landscape and52° in portrait.

The envelope includes court/runoff at x±3.5m, z±7.5m, actor/racket extent to3.6m and a raised clear-flight hull to11.2m. Independent tests project actual16/19/22m/s clear solver paths from low/high contacts and front/mid/rear positions through desktop, landscape and portrait views. This is prototype framing for the existing physical profiles, not a claim about arbitrary future shot tuning. Physics, AI, finite racket collision, timing/buffer and mobile reservation rules are unchanged.

Wide screens place the same three shot buttons in the right gutter, with feedback/instructions at left and score at upper right. This frees the full central height for the court and high shuttle. Portrait keeps the three buttons below the court and removes the obsolete suggestion to turn the phone. No new button, gesture or required key is added. Screen rays now intersect the rendered court plane y0.025m exactly, retaining existing x/z aim clamps. The old inverse ray intersected y0 while its projection target used y0.025, causing a small systematic offset.

## Recorded ordinary UI comparison

`court-framing.mjs` starts EASY, selects existing CLEAR once, serves, then makes three mouse/native-touch returns at the visible HIT NOW cue, using centre/left/right course taps. No ball/actor/time injection, contactAt input scheduling, paused gallery or invented hit. Each view reaches six returns and four player contacts including serve. Screen bounds are read after actual engine frameend, with the official inspector hook. All captured PNGs are original browser screenshots.

| View | Before court area (CSS px²) | After | Increase |
|---|---:|---:|---:|
| PC1280×720 |44,337.58|63,646.79|43.55%|
| Mobile landscape844×390, DPR2 |13,008.77|17,617.83|35.43%|
| Mobile portrait390×844, DPR2 |26,439.59|60,117.34|127.38%|

These are exact projected regulation-court polygons, independent of render quality and native screenshot pixel dimensions. The initial `before` run is LOW; `final` is MEDIUM. Their actors/apex images are not pose/pixel matched. A separate matched LOW comparison and9m-plus captures are retained in the gallery with their own reports. Quantitative area does not include the surrounding floor or removed stands.

The three final MEDIUM views collect1,357 rendered RALLY samples in total. Court-corner, displayed player-joint and shuttle clipping counts are all zero. Observed maximum shuttle heights are9.77m /9.66m /9.63m. All nine centre/left/right course inputs are accepted; mouse projection is accurate below0.000001m and native-coordinate rounding remains within0.05m horizontally/0.08m longitudinally. No screenshot or bounds test is physical-device/Safari performance certification.

`comparison.json` retains the individual source bundles, viewports, bounds, aim commands and measurements. `after` is an initial LOW candidate, while `final` includes explicit UI stacking and MEDIUM/DPR2 checks. Original tall-PNG top crops and pixel counts confirmed that an apparent missing HUD in the image preview was a display artifact: the before/initial/final originals all contain the same991 gold-brand pixels and1,742 bright HUD pixels in the inspected top regions. It was not counted as an app failure. Full original PNGs are the deliverables; diagnostic crops are not substituted.

## Regressions

- 53 tests pass: all45 existing tests and eight camera/aim regressions. New cases cover six viewport sizes, current high-clear solver paths and the rendered-plane aim intersection/clamps. `tests.txt`.
- Project typecheck/build and full root `build:vercel` pass. Generated registry changes are scoped to this project. `build.txt`, `root-build.txt`.
- Existing MEDIUM native up/down gesture runner passes, preserving trusted raw/pointermove once-only classification and actual clear/drop outcomes. `mobile/mobile-native-report.json`.
- Existing native novice path passes: three taps →six returns and four player contacts including serve. `beginner/mobile-beginner-report.json`.
- NORMAL mixed-shot UI match finishes1:5 with29 actual contacts,12 visible-cue inputs, max8 returns, nine techniques and29 unique physical impact/audio callbacks. Rendered contact and grounded stance checks pass. The configured yield after16 returns does not trigger. `mixed/drop-defence-regression-report.json`.

Final drop/rotation details are recorded with their source reports below. Existing arbitrary browser-stall limits and below30fps simulation slowdown from the mobile input fix remain in force. Hardware input latency, PC/mobile FPS, Safari, human balance and actual listening are unverified.

## Screenshot delivery and Library

Library saving was attempted through its current official prepared-upload route for nine original screenshot deliverables. It failed at the connection stage before upload preparation; no upload session or Library file ID was returned. `library-result.json`. The failure is a Library connection/tool issue, not an app/screenshot failure. The user-authorized fallback is the original PNGs in this branch, delivered with the full final commit SHA and remote paths in the final response. No signed URLs or private transfer internals are published.

## Reproduce

Use the pinned pnpm/Node instructions in the project README. From the repository root:

```sh
pnpm --filter smash-rally-3d test
pnpm --filter smash-rally-3d build
SMASH_EVIDENCE_DIR=/tmp/court-framing node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/court-framing.mjs
SMASH_EVIDENCE_DIR=/tmp/court-rotate node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/court-resize.mjs
SMASH_DROP_LIMIT=3 SMASH_EVIDENCE_DIR=/tmp/court-drop node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/drop-defence.mjs
```

`SMASH_FRAMING_QUALITY=MEDIUM` checks actual DPR2 rendering at the1.5 pixel-ratio cap. `SMASH_FRAMING_BASELINE=1` disables acceptance assertions to record the original scene; its runner completion is not new-feature acceptance. `SMASH_DIST` serves an isolated baseline; `SMASH_PORT` isolates listeners. Browser scenarios are run sequentially to avoid renderer contention. No production dependencies were added.

Final DROP regression:9 ordinary UI windows (three patterns ×three difficulties), each bounded after3 settled soft flights. AI contacts27/27 actual soft flights;18 are confirmed successful subsequent player contacts and9 remain in flight at observation end. Zero reply faults/direct soft winners. Each difficulty has9 contacts/6 confirmed/3 unresolved. Maximum observed continuous AI speed5.8000000000003755m/s; minimum reaction delays0.500 /0.300 /0.183333s match unchanged0.5/0.3/0.18s profiles at120Hz. These small windows are a regression smoke check, not a human balance estimate or replacement for the prior9-match DROP investigation. `drop/drop-defence-report.json`, `drop-analysis.json`.

[Matched LOW before/after gallery](GALLERY.md), including9m-plus actual clear captures. The original higher-quality `final` screenshots remain separately available and validate the same runtime bundle. Runtime Vercel candidate `2HeMsYZAfovUqmzA63LhTYfB1wz6` reports success for29dc43a. Hosted bundle bytes have not been read or independently verified here.

Live rotation passes in one continuing EASY rally: portrait→landscape→portrait, MEDIUM/DPR2, with no reload or pause. Actual canvas sizes are1266×585 and585×1266 (the existing1.5 pixel-ratio cap). Both court bounds remain on screen; native left/right taps retain the intended course within the stated native rounding tolerance and produce actual clear returns. Source: `rotation/court-resize-report.json`.

The final matched LOW `before-high` and `matched` runs both capture actual incoming high clears above9.4m in all three views and each reaches6 returns/4 player contacts. Full capture-adjacent samples are in `highClearCapture`; observed peaks reach9.63–9.80m. The matched runs retain zero rendered court/player/shuttle clipping and the same area improvements. `comparison.json` uses this quality-matched pair as its primary comparison; separate `final` remains the MEDIUM validation.
