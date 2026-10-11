# R12a2 candidate release gate

2026-10-10 UTC. Runtime source53a38c856b09d883f6e910b065db7daad66665b5, app0.12.0-reimplementation.3. New reimplementation, not restoration of lost pre-incident code. Public rootR11b6 and qa-r11/R11b7 are outside this update. Only public qa-r12 candidate changes.

## Changes following actual R12a1 play

- W scene filters use real connected floors and encounter gates, without changing collision, AI, targets, damage, resources, rewards or saves. Reachable idle enemies remain visible. Active enemy warnings remain visible around cover. Completed hidden pickups and unusable in-W return markers are hidden; locked town anchor still explains its requirement.
- Short nearby landmark labels require LOS and avoid the player. Nonessential labels yield to combat and residual hostile effects. Full names/instructions remain in the F hint/modal. This addresses observed distant locked enemies and labels covering the keeper. Native appearance/performance for this patch is still pending.
- Optional rescue explicitly says remaining enemies. Both 3/4 locked and0/4 claim paths tested without reward changes.
- Trainer purchases preserve the current expanded group, card position and eligible focus after the awaited save. Ownership/epoch guards prevent stale restoration after a different panel/profile/battle/life/region/focus. Native long-list purchase regression is pending.

## Automatic verification on final runtime

- Full serial aggregate:2510/2510 pass,0fail/skip/cancel/todo,421803.891301ms. All existing tests retained.
- Initial aggregate2505/2510. Five render extraction fixtures expected old drawLabels() terminator. Updated the fixtures to the actual drawLabels(sceneVisibility) handoff with production non-W visibility output, preserving previous assertions. Focused174/174 passed before the successful full rerun.
- Syntax passed. Game and standalone recovery build each96payload files+manifest; all SHA256 hashes and278 relative import targets validated.
- Original Emberwatch167file Git blob/SHA256 identities unchanged.
- Registry/Vercel earlier pnpm-home ENOENT remains an unpassed launcher gate; not rerun or claimed passed here.

## Prior native evidence and open gates

R12a1/Sitev47 main cover-route, explicit evidence/report, optional rescue after report, deliberate undefended death, dead-save reload, retry, partial kill retention and no duplicate claims are recorded in r12a1-native-main-route.md and r12a1-native-optional-retry.md. These are not native results for the new rendering/trainer code.

The same normally earned build legally killed the200HP keeper with one outward/return Q. Source audit explains305.299 nominal noncritical damage and one MP/CD payment; no new duplicate-hit bug was found. Boss depth, opposite channel choice, lower-investment/Hard comparison, full Expert effect isolation, sound/mobile, Master runtime, meaningful repeat expeditions and whole campaign remain open. Segmented tool-driven inputs cannot establish continuous completion time or DPS.

The real qa-r12 recovery URL read confirms pre-v5 original L18 snapshot remains after live L22 progression. The native copied qa-r12 schema4 profile is unopened and cannot be read by the old qa-r11 namespace. Actual old-module compatibility is automatic-only, not a native rollback claim.
