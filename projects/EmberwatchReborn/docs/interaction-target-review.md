# Shortcut interaction target review

## Scope and evidence

This is an authored Emberwatch input-selection correction, not a change to
canonical combat, rewards, progression, collision, or travel rules. The parent
integration owns the project brief/spec/eval updates and publication. Only this
review, `app/src/interaction-target.js`, and its focused test are in this task's
write scope. The canonical requirement trace was read; its recorded Library
materialization HTTP 403 remains unresolved and was not retried.

The current `main.js` builds fresh presentation candidates inside `nearest()`.
Both the HUD hint and the F handler call that function. Its existing eligibility
is the shared `near()` default of 76 world units plus `lineOfSight()` against the
current battle map. Distance wins, and equal distances preserve source order.
`interact()` then opens a menu or dispatches an existing command. It does not
need a new input binding or command.

The Pass rope object is `(816,688)`, while its return portal is `(848,688)`.
At the legal standing point `(864,688)`, both are reachable and visible, but the
old selector chooses the portal at distance 16 rather than the rope at 48.
The portal rejects travel until the rope is connected. The quarry chain and
return portal share `(656,608)`: current source-order ties favor the object,
but correctness should not depend on which list was concatenated first.

## Selection contract

`selectInteractionTarget({position,map,candidates,regionId,objectives})` first
reproduces the existing nearest reachable/visible candidate selection. It can
replace that result only when that result is the exact locked portal in one of
two explicit frozen relationship rows:

- `ashwind_pass`: `pass-town-shortcut`, gate `pass_shortcut`, is unlocked by
  `pass-shortcut` of kind `pass`, after accepted quest and completed rescue.
- `ember_quarry`: `quarry-town-lift`, gate `quarry_shortcut`, is unlocked by
  `quarry-shortcut` of kind `quarry`, after accepted quest, recovered tool, and
  completed rescue.

The matching open objective must be the numeric value 0, required objectives
must be numeric 1, the unique matching object must still have shortcut action
kind and at least one enabled, labelled current presentation action, and the
object must independently pass the original reach and LOS checks. Relationship
matching uses exact IDs, region and gate, never substrings or proximity alone.

If any requirement is missing, stale, malformed, or ambiguous, selection stays
at the ordinary nearest target. Invalid candidates are ignored; invalid player,
map or candidate-list inputs yield null. Equal-distance order, unrelated NPCs,
chests, other objects, other portals, and already open portals retain ordinary
selection. The selector neither changes input objects nor invokes any command.
It has no cache: callers supply the current candidate views, map, and objectives
on every use, as `nearest()` already does.

## Parent integration

Add `import {selectInteractionTarget} from './interaction-target.js';` to
`main.js`, leave candidate construction unchanged, and replace only the return
inside `nearest()` with:

```js
return selectInteractionTarget({position:battle.p,map:battle.map,candidates:all,regionId:battle.region,objectives:state.world.objectives});
```

Retain `interact()`, `showPass()`, `showQuarry()`, candidate hiding after
completion, and all authoritative reducers as written. A selected unlock object
only opens its existing menu; clicking its existing action still needs a valid
same-life report, required progress, normal reach/LOS, and a durable successful
commit. A stale menu or target cannot bypass those checks. No automatic unlock,
travel, resource recovery, reward, menu opening, or collision change is added.

## Verification plan

- Reproduce the old Pass portal choice using actual content/geometry, then prove
  the corrected choice at the same legal position.
- Verify quarry exact matching with portal-first and object-first candidate
  order, plus actual shortcut commands for both regions.
- Cover reach boundaries, occlusion, unrelated nearest targets, wrong region,
  mismatched identities/gates, missing/ambiguous objects, completed/stale views,
  malformed inputs, deterministic ties, and nonmutation.
- Execute actual reducers to prove selection does not unlock anything itself,
  pre-rescue/stale-life/stale-completion requests still fail, explicit unlock
  grants no resources, and open shortcuts remain normal travel targets.
- Run the focused Node test and syntax check. Full integrated suite, app build,
  browser/menu/hint QA, Git, archive, and publication remain parent-owned.

Automated earned-route fixtures use real handlers with scripted legal positions
and kill reports. They are not normal-input browser play or combat completion.

## Verified result — 2026-10-09

- `node --test tests/interaction-target.test.mjs`: 18/18 passed.
- Focused file syntax: `node --check` passed for both new JavaScript files.
- `node --test tests/interaction-target.test.mjs tests/pass.test.mjs tests/quarry.test.mjs tests/world-geometry.test.mjs`:
  105/105 passed, including retained real command, save/idempotency, resource,
  travel, wall, and progression regressions. Counts are from this run.
- The normal-input Pass defect was reported by the parent. This task reproduced
  its target choice with the actual authored coordinates/map and a legally
  standing scripted player, then verified the pure correction. It did not run
  a browser or claim the live F menu/HUD had already been fixed.
- The source invariants preserved are current 76-unit interaction range,
  current LOS/collision geometry, stable ordinary nearest ties, fresh
  completed-object hiding in `main.js`, independent rescue-stage shortcut
  availability, and unchanged authoritative travel/interaction commands.
- No common source, content, existing tests, generated output, Git state, or
  publication was changed by this task. Main integration and its full release
  checks, archive, and ordinary-input regression remain parent-owned.

Parent integration: main.nearest now calls this selector for both F and HUD. Full aggregate584 tests, syntax/build and original167-file integrity passed. Browser F/HUD regression remains pending.
