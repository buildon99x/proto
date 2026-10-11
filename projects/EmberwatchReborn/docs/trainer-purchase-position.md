# Bounded trainer purchase position correction

2026-10-10 UTC. Based on R11b7 commit
`128aae574de5d31f070b76191a7694340c8bdcce`, in the isolated
`fix/emberwatch-trainer-position` worktree. This corrects the lower-card scroll
reset observed in `r11b7-native-description-qa.md`; it adds no content/balance.

## Cause and small integration patch

The old skill click called `showNpc('trainer')` without awaiting the asynchronous
`showTraining`. It restored scroll to the temporary checkpoint panel; the real
trainer then replaced that DOM and received its default close-button focus.

Only `app/src/main.js` changes executable behavior:

- The skill click awaits `purchaseTrainingSkill`. An enabled live card in the
  current visible panel may submit once; busy, detached and double-click actions
  are ignored. The production purchase and subsequent critical checkpoint are
  unchanged, including their actual point/resource and persistence rules.
- The local purchase snapshot belongs to the exact controller, profile, battle,
  state/live battle life, region and original presentation epoch. Success cannot
  reopen or restore a dismissed/superseded menu. Existing checkpoint-panel epoch
  ownership remains in force during the second await.
- After payment, sample the latest scroll, expanded tier groups and purchased
  card's panel-relative top. Restore only after the final trainer renders, with
  an anchor correction for changed description heights. Nothing is persisted.
- Restore purchase focus only if it still belonged to that button, loading focus
  was not moved, and no blur/visibility safety event intervened. A local monotonic
  event counter avoids using wall-clock timestamps as an ownership token.
- If the new button is disabled by maximum rank or insufficient points, focus
  the same inert card with `tabIndex=-1`, never a disabled or different purchase.
  Native repeat protection, panel input clearing and canvas focus on exit remain.

Apply the source diff/cherry-pick rather than replacing the whole main file in
R12/W. Shared brief/spec/eval changes are short append-only scope/verification
notes. The existing training HTML and generic panel, combat, economic, save and
resource handlers are unchanged.

## Evidence

`app/tests/trainer-position.test.mjs` executes the real document click, panel,
trainer, dispatch, checkpoint, controller, reducer, store and safety handlers.
Its deterministic DOM geometry/focus model and delayed persistence are probes,
not browser rendering. The predecessor route is an existing scripted earned-route
fixture, not normal-input play. Session invalidation probes explicitly replace
owners/life/region; retained profile-load tests additionally exercise real loads.

The new cases cover successful/repeated purchases, changed text heights,
disclosures/scroll changes during payment, max/point/base/exclusive denials,
replay/busy/disabled/detached clicks, close/reopen/title/new-menu ownership,
profile/battle/life/region/death transitions across both waits, ordinary/critical
save failure, actual range rejection, focus/blur/visibility, fixed-clock blur,
held/deferred-input clearing, native key-repeat and exit focus.

Final focused serial run: **367/367 passed** (324 retained +43 new), no
fail/skip/cancel/TODO, 41494.16296ms on Node24.19.0. The final43 new cases run
against unchanged base main.js fail19/pass24 as expected. Changed-file syntax
and whitespace pass. Raw focused results, counterfactual summary, syntax and
reproducible scope are in `verification-trainer-position/`. All pre-existing
tests are unmodified.
`registry.txt` records the required `pnpm sync:registry` attempt, blocked before
execution by the existing pnpm-home ENOENT; registry synchronization did not pass.

No whole-suite run, build/release, browser/native screen check, remote push,
Site publication, Library upload or original Emberwatch edit was performed.
Integration owns those gates, especially real desktop/mobile scroll clamping,
card focus appearance, native Tab/Enter/Space, final W merge and archival.
The canonical v1.1 / Library version2 source-status and requirement trace were
consulted; the previously recorded original-file HTTP403 transfer was not retried
or described as newly read/hash-verified.
