# SILT laptop QA — 41ee11d / 0.15.0

Tested source: `41ee11dd3573ce616718d51f58e34b9e8d2706ed`, on jh-laptop in a separate detached worktree. Existing checkout and user changes were preserved. This handoff and its evidence are QA records only; SILT implementation remains owned by dot. No main merge or public deployment was performed.

Evidence root: `qa-evidence/silt-laptop-2026-10-16/`. `verification.json` contains source, manifest and module hashes. Browser runs used actual installed Chrome with WebGL, isolated profiles and loopback static servers. Puppeteer sent production keyboard/button inputs. Read-only constructor/renderer references and copied event receipts were used for observation. Native CUA remained unavailable with MXC HRESULT0x80070003; shell-launched Chrome worked. Headless capture does not establish foreground mouse feel, device frame rate or listening acceptance.

## Completed automatic checks

- App: 58 test commands, 1050 `PASS` lines plus 22 world checks = 1072; exit 0.
- Syntax: 38 JavaScript files; static app build: exit 0.
- Audits: reload 135, item 108, cover 72 = 315, all passed.
- `pnpm sync:registry`: exit 0, 11 projects. `pnpm build:vercel`: exit 0, 27/27 static pages. This closes the corresponding dot IPC environment blocker on this laptop.
- Build-generated registry and weapon-content working tree changes were restored, so this delivery contains no application changes. Logs preserve actual successful output; generated registry was not included in this QA-only commit.

## Ordinary browser input

`normal-attempt-2/normal-browser.json` passed with no page errors. Fresh workshop-qa save, Canal Ward, tourist difficulty, pistol. Walked from dock through the outer west approach to the natural SILT spawn; no warps, health/AI changes, seeded save, direct damage or kill calls.

- Actual silver connected body and sign visible in WebGL; shell impacts, collapse and core visible.
- Three pistol shell hits collapsed cohesion 100; one core hit reduced core HP 80 to 32. After natural reform, cohesion returned to 100 and core HP remained 32.
- Near-range windup/blade and D+X movement were captured. HP was 100 before and after this sequence; copied strike events report misses. Later separate strikes hit and reduced HP to 86.56, demonstrating actual incoming blade damage. This is a bounded automated sequence, not a claim about human timing or guaranteed dodge behavior.
- Continued normal fire killed SILT, core HP 0, one kill and cash 70; eight shots total. No human blood/headshot visual acceptance is inferred from model tests.

Existing progression regression also used fresh saves and normal movement/combat/pickup/extraction inputs:

- `regression-canal/ordinary-receipt.json`: dock medkit and market archive, pump fight/token, ferry 8-second hold, cash 1170/7 kills, schema-6 stash retains medkit/archive and weapon instance, settled raid recorded once, normal Start creates a new mission. No page errors.
- `regression-forest/forest-regression.json`: depot/east haul/relay/token/east evac 6-second hold, cash 1310/9 kills, settled save/stash recorded. No page errors. Its `baseline` field names the historical script origin; `sourceRef` is the current tested 41ee11d source.
- `regression-west-boundary/west-receipt.json`: ordinary dock/market/pump/token route, then south z92 and west boundary x=-136 to bypass optional SILT, winch 12-second hold, cash 1170/7 kills/81 shots, retained medkit/archive and weapon instance in schema-6 stash, then ordinary Start resets the mission. No page errors. SILT remained alive with core HP 80; this regression deliberately verifies the existing extraction path separately from SILT combat.

## Explicit WebGL/input fixtures

These are intentionally synthetic setups and do not count as ordinary play completion.

- `fixtures-attempt-2/fixtures-browser.json`: rear human placed behind SILT, rear HP 1000, armor 0, other enemies disabled. One real F-fired production projectile contacted SILT then rear enemy at ordered impact times. Shell cohesion fell by 48; rear lost 33.6 (70%). No direct hit resolver invocation.
- A second real shot created a shader aperture. The world was explicitly frozen for an inspectable close screenshot; model hole, view hole and nonzero shader radius were recorded. Escape pause/resume plus elapsed simulation time subsequently closed model and view holes. This image is labeled frozen fixture and must not be described as an ordinary live frame.
- Actual input killed the fixture sentinel once, then additional corpse fire left cash 70 and kills 1: no duplicate reward.
- `fixtures-cover/cover-fixtures.json`: existing dock steel post located from actual wall geometry, with positive wall query before testing; locked blade strike reports blocked=true/hit=false, HP 100. Separate pre-positioned windup with cohesion 48 was interrupted by a real F projectile; collapse canceled damage. Lethal damage fixture then cleared blade and hole effects; normal Start reset core HP 80/cohesion 100 with no SILT fields in save.
- `lifecycle-workshop-fixtures/browser-receipt.json`: lists each setup mutation. Actual UI covers bandage healing, death→Start, seeded exit→redeploy, medkit crafting and armor repair, schema-5 backup migration and exact persisted save after reload. It is a UI/persistence regression with explicit damage/placement/save seeding, not a natural economy journey.

## Visual finding for dot

The exposed core is rose/pink in actual rendered screenshots/video, rather than the handoff's stated orange/amber. `liquid-metal-view.js` uses `0xffb84f`, but the global `render-style.js` warm/red-strength mapping sends warm source colors into the rose accent palette. This is a visual contract discrepancy supported by actual pixels plus a source-level explanation; it was not fixed here because implementation belongs on dot. Check core identity and separation from projectile/hit accents when correcting it.

The corpse screenshot still shows the recent “SILT collapse / aim at exposed core” transient message. This was captured immediately after the kill and is not enough evidence of a persistent HUD defect; retain as a presentation review note.

## Failed attempts retained honestly

- Root `normal-browser.json`: slow scripted turn/movement near SILT caused natural player death. This was an automation strategy failure; it is not a SILT defect or a successful encounter.
- `fixtures/`: initial shot missed before pose settling; corrected with settling time and a small seam offset in attempt 2.
- `fixtures-attempt-2/` cover assertion failed because the test used x=-118.25 instead of the actual post x=-117.25. Corrected test locates and verifies the existing post; it passed in `fixtures-cover/`. Do not cite the failed placement as an AI cover bug.
- First west regression used an incorrect waypoint beyond Canal bounds; its result is separate from the corrected route. No game source was changed in response.
- `regression-west-corrected/` reached the correct west approach but the historical human-enemy firing loop stopped at 30 iterations while SILT still had core HP 50.03. `regression-west-final/` approached within activation range and aimed at core height, but spent all 120 rifle rounds, left core HP 5 and died; this loop did not switch to the carried pistol. These are failed ordinary attempts, not passing extraction evidence. They demonstrate that the old generic firing automation is not a reliable SILT strategy; they do not establish an AI defect. The successful normal pistol encounter remains separate. `regression-west-outer/` is the separate optional-encounter bypass route.
- The first outer bypass touched the actual building corner at x=-39.60/z=59.75 and stopped. This is another failed scripted waypoint, not a collider defect. The final boundary route goes south at z92 before following x=-136 north to the winch.

## Video and Library delivery

`normal-attempt-2/silt-normal-speed-silent.webm` is a raw MediaRecorder WebGL canvas recording, requested 30 fps, 960×540, duration 15.943 seconds, speed 1. No frame resampling or time scaling. DOM HUD and audio are excluded. `video-review.json` verifies playbackRate 1 and 3.972 seconds of media advanced over 4.016 wall seconds; decoded 2/8/14-second frames were visually inspected. The clip includes combat transitions and blade motion; screenshots/receipts document the complete encounter beyond the clip.

Library uploads succeeded, version 0. Full identities and returned xattrs are retained in `library-delivery.json`; Windows lacks `os.setxattr`, so local xattrs could not be applied. No duplicate upload was attempted.

- Video: `libfile_9c5b939a47548191b7261780b4a31011` — https://chatgpt.com/api/library/files/libfile_9c5b939a47548191b7261780b4a31011/download
- Ordinary exposed core: `libfile_8980e9db934081919a080454d5337092` — https://chatgpt.com/api/library/files/libfile_8980e9db934081919a080454d5337092/download
- Ordinary terminal state: `libfile_0d51bc6d13c48191b7761e08b4b0729a` — https://chatgpt.com/api/library/files/libfile_0d51bc6d13c48191b7761e08b4b0729a/download
- Frozen aperture fixture: `libfile_3a6a0b24837c819187e353069cbf2266` — https://chatgpt.com/api/library/files/libfile_3a6a0b24837c819187e353069cbf2266/download

## Remaining limits

Actual sound listening, foreground mouse/pointer-lock feel and target-device frame pacing remain unverified. Silent video and audio graph/model checks do not close listening. Treatment/grenade/melee motion had prior 0.14.2 ordinary evidence; the current handoff does not relabel that older run as current 0.15.0 acceptance. A full ordinary SILT kill followed by extraction in the same raid was not run; SILT combat/reward and ordinary existing extraction/save routes were verified separately. Follow-up liquid-metal implementation changes stay on dot.

## Completion

All three existing extraction regressions completed on the 41ee11d app build: Canal ferry 8 s, Canal west winch 12 s and Black Pines east evac 6 s. Ferry and winch both include actual saved stash inspection and ordinary redeployment. The explicit lifecycle/workshop browser suite completed all eight checks with no page errors; repaired armor persisted at 45 and cash at 793 after crafting/repair and reload. Failed intermediate routes remain in their own folders.

QA record commits contain no changes under `projects/dead-freight/app` or `packages/registry` relative to the tested source. Native UI/audio limits and the core-color finding remain open as stated above.
