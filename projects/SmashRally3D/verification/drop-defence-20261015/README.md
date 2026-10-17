# Repeated DROP / soft-shot defence — 2026-10-15

Base commit: `bff2778b6336ef365fd99292ca242f764c6f7c37`; runtime fix: `d3048ff13554f8c8f9a2b7981598d37b30888f3e`.

Base bundle `index-Dz_tpUCS.js`: SHA256 `85393f1d8c177647cf4d7ac912a45e3d0b9cd553c312eb0b947f9779c7a92770`. Fixed bundle `index-LbNX1LNs.js`: SHA256 `33161b0ba9bec001a7912cee12d46bcb4280cc46c7a1a759ac7007e1001246ee`. All after UI, mixed-shot and mobile reports identify their actual loaded bundle. Older evidence validates only its recorded bundle.

## What failed and changed

NORMAL/HARD centre/wide repeated soft input produced ten immediate winners out of ten at each level before the fix. EASY could return some drops, so the failure was not universal across difficulty levels. The clear-soft pattern separately tests overhead drops rather than counting contextual net/block as overhead drop shots.

- A full arm-recovery lock also stopped ground locomotion. Even when it expired, a new opponent-observation delay stopped already chosen base recovery. An AI that had just smashed remained deep until it finally saw the short reply.
- The planner excluded contacts below1.05m although physical hits are allowed down to0.75m. Its shallow crouch could also leave the racket plane above/ahead of a late low shuttle despite the body reaching the forecourt.
- Ground movement now resumes after landing/brief follow-through (high contact0.2s, Super Smash0.3s, low contact0.1s). The original full recovery still gates another swing. Before observing a new flight, actors continue only their previously chosen base, independent of the unseen shuttle.
- Shared low-contact hip crouch is bounded to0.32m; arm segments remain0.36m each, with the same physical string-plane/radial/collision checks. The planner can consider0.8m contacts, above the unchanged0.75m physical floor.
- Forecast and live movement share motor/readiness/split rules. A strict existing5.8m/s vector cap removes a small prior diagonal transient overshoot. Delays/noise, shot-flight profiles and score rules are unchanged. No teleport, input-reading route selection, invented return or score-dependent catch is added.

These values are prototype tuning, not measured human biomechanics or coaching certification.

## Ordinary UI protocol and results

`before-ui.json`: nine full UI matches, one centre-soft / wide-soft / clear-soft pattern per difficulty. `after-ui.json`: the same nine patterns, ending at match completion or15 settled soft flights to avoid waiting for an error in a now-sustainable exchange. Four after sessions complete matches; five are bounded observation windows. Both use real mouse/right-click/Shift inputs at the visible cue, LOW visual quality and read-only traces. No state injection or input scheduling from internal contactAt. This is one fixed software controller, mostly WEAK timing, not human difficulty research.

| Difficulty | Before actual soft flights | Before confirmed successful returns | After actual soft flights | After confirmed successful returns | After replies still in flight | Direct-winner rate before → after |
|---|---:|---:|---:|---:|---:|---:|
| EASY |31|16|45|41|3|48.4% →2.2%|
| NORMAL |14|0|35|34|1|100% →0%|
| HARD |14|3|35|34|1|78.6% →0%|

Contact returns are16/0/3 before and44/35/35 after; confirmed successful returns require the next actual player collision or an AI IN point after the reply. Five after replies are unresolved at window end and are not counted as successes. Every attempted flight and planner verdict is retained. After planner reachable/unreachable counts are45/0,35/0,35/0; before they are29/2,4/10,4/10. A planner verdict is not an omniscient physical oracle. Per-technique and quality splits are in `comparison.json`.

Closed-point repetition win rates (player points / completed points) are15/15 →1/1 EASY,14/19 →0/12 NORMAL,11/16 →0/10 HARD. EASY's after rate has only one closed point, so it must not be presented as a balanced match-win estimate. Direct-winner rates use actual soft flights as the denominator and answer the immediate exploit question separately.

The after traces contain12,085 read-only samples. Maximum observed continuous AI movement is5.8m/s within floating-point precision. Minimum observation times after player contact are0.500s /0.300s /0.183s, consistent with the unchanged0.5/0.3/0.18s profiles and120Hz steps.

## Good short shots still earn an advantage

`good-pressure-ui.json` is separate from the cue-immediate comparison. It adds a fixed170ms visible-cue reaction in two NORMAL pressure windows. In the wide-soft window, all ten actual techniques are **net shots**, not overhead drops: six PERFECT and four GOOD. AI returns five and the player earns five direct winners; planner reachable/unreachable is5/5. The player reaches5:0. This demonstrates useful tight-placement pressure without forcing the AI to return physically unavailable balls. The clear-soft window has one overhead drop and nine blocks; AI contacts all ten and nine are confirmed successful, with one still in flight. Do not pool these quality-controlled windows into the immediate-input rates above.

## Regressions and limits

- `unit-tests.json`:38/38 pass, including all previous35. Added tests cover unseen-shuttle-independent base recovery, finite-bone low returns for both actors, actual repeated-soft AI returns and continuous movement limits. The domain lifecycle controller deliberately stops returning after20 exchanges so it does not require an AI error in a safe deterministic loop; this is labelled in `domain-tactical-scenarios.json`. `before-domain.json` and `probe-drop.ts` are precision-scheduled domain diagnostics, not UI play.
- `mixed-regression-ui.json`: a complete NORMAL1:5 match,29 physical contacts,13 cue inputs, max7 returns, seven techniques,29 unique impact callbacks and zero runtime errors. The controller is configured to yield after16 exchanges; its max7 means this yield did not trigger. Rendered stance/contact checks pass.
- `mobile-beginner.json`: existing CLEAR selected once, three actual emulated return taps produce six returns across both actors and four player contacts including serve. This is not double input.
- `mobile-direction.json`: LOW native left/right taps, horizontal drag and diagonal drag all emit the checked actual shots. Current horizontal drag keeps the initial aim; diagonal26px vertical movement selects DROP.
- `mobile-direction-medium-late.json` and `mobile-standard-after-failure.txt`: MEDIUM software rendering can deliver classification after the preparation cutoff (`accepted:false`); the original reserved shot stays active. The same standard swipe failure reproduces on an isolated base-bff2778 build in `mobile-standard-before-failure.json`. This remains an existing software/emulation limitation, not a proven AI-change-only regression. The initial exploratory mismatch is preserved in `mobile-direction-first-failure.json`. Actual device latency and usability are unverified.
- Project build/typecheck, registry sync and full build:vercel pass (`root-build.txt`). Root registry changes are scoped to this project; unrelated historical timestamp changes are excluded.

Recommendation: retain mouse/court-tap aiming and first improve left/centre/right guidance and tap feedback. Adding horizontal drag conflicts with the existing vertical threshold and consumes preparation time. The [specific control recommendation](../../docs/DIRECTION-CONTROL-RECOMMENDATION.md) compares options; no new direction mapping or required gesture was implemented.

## Screenshots and delivery

`before-normal-wide.png` is a fresh baseline capture. `after-ai-return.png` captures an actual HARD clear-soft AI net return during uninterrupted play; `after-ai-return-capture.json` records its associated pre-capture read-only snapshot. `good-normal-wide.png` shows the well-timed pressure window's5:0 point state. `mobile-direction.png` shows an actual LOW diagonal-induced drop. All source reports, bundle hashes and PNG hashes are in `screenshot-manifest.json`; no injected or event-paused contact gallery is used.

The current official Library prepared-upload helper failed before preparation at its connection step. No Library ID was returned. Original PNGs are preserved in the requested branch with hashes and remote paths. No main merge, public-default promotion, physical-device performance, actual listening or human difficulty certification.

## Reproduce

Build and test with the project README's pinned pnpm/Node instructions. Examples from repository root:

```bash
node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/drop-defence.mjs
node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/good-drop-pressure.mjs
node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/drop-defence-regression.mjs
node projects/SmashRally3D/tools/browser-check.mjs projects/SmashRally3D/tests/e2e/mobile-direction.mjs
pnpm exec tsx projects/SmashRally3D/tools/analyze-drop-defence.ts
```

`SMASH_DROP_LIMIT=0` requests full matches rather than the bounded after protocol; sustainable rallies may last longer than the runner deadline. `SMASH_DIST` can serve an isolated baseline dist without modifying the active app; `SMASH_PORT` isolates browser servers. The baseline was built from a bff2778 archive and verified against the expected85393f... hash. Browser tooling remains isolated in ignored `.playtest`, outside production dependencies.
