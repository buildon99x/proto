# R14a2 contextual-click contract

2026-10-10. This is authored Emberwatch interaction policy. The hit shapes, approach sampling, reach, and expiry values are not claimed to be measured or unpublished Path of Exile 2 behavior. Existing content, reducers, rewards, battle timings, controls, and saves remain authoritative.

## Pure module API

- `pickContextClickTarget({screenPoint,candidates,toScreen,visible,labelVisible,width,height,zoom})` returns an original candidate or null. Coordinates use the actual canvas/projection. `visible` must explicitly return true; labels require a separate true `labelVisible` result using the actual `drawLabels` rules. No nearest-target fallback exists.
- Body selection uses the actual atlas aspect/anchor and renderer widths (NPC statue 44, chest 38, portal 110 or town-return 100, multiplied by zoom). An inscribed ellipse avoids transparent rectangular corners. Labels use their actual fixed 120×21 canvas rectangle, x±60 and y−74…−53. Rendered labels precede bodies; overlapping bodies use foreground world depth, then hit distance and a stable kind/id tie. The pointer must be inside the current viewport. Hidden or explicitly nonrendered targets and ambiguous same-kind/id duplicates fail closed. Same ID in a different kind is distinct.
- `planContextApproach({battle,target})` finds a legal radius-11 point within existing 76-unit reach and target LOS. It keeps an already valid current position, then tries 16-angle rings at 64/48/32/16, the target point, and nearby tile centers. A radius-11 direct trace or existing `findPathStep` must connect it. Start-to-target LOS is not required for a legal around-corner route.
- `createContextClickIntent().press({target,battle,candidates,visible})` clears the preceding intent and returns whether the exact target was armed. `.destination` is a detached point for existing locomotion. `.active` and `.target` expose detached intent metadata.
- `.step({battle,candidates,visible,dt,blocked,busy,execute})` returns `approaching`, `waiting`, `consumed`, `cancelled`, or `idle`, plus `target` and `destination`. An idle arrival returns `consumed` only after calling `execute` with the revalidated exact candidate. An already-near busy arrival returns `waiting` with no destination. `execute` is the existing interaction dispatcher, never a new reward path. Consumption happens before callback invocation, preventing repeat/reentrant/throw retries.

## Safety and integration ownership

Intent exists only in memory. Battle identity, life, region, exact kind/id, initial target position, open/completed/closed/locked/allowed/disabled state, destination/gate, action kind and action list must remain unchanged. Fresh visibility and unique identity are checked before every step and execution. A moved/hidden/removed/duplicate target, death, changed identity, or disconnected map cancels. No saved intent can restore itself.

Use simulation `dt` only: 2.5 seconds without at least one unit of actual progress expires the intent; 20 seconds total caps wandering even with progress. Invalid/nonpositive dt contributes no time. An expired/cleared/consumed intent requires a new press. A callback failure is not automatically retried.

Main owns the existing movement/controller integration. Feed the destination into locomotion, preserve context while LMB is held, and suppress held-ground refresh until release even after terminal cancellation. Clear locomotion when an intent is consumed/cancelled or waiting at interaction reach. Execute only while the controller is idle, then recheck the frame gate before advancing combat because the callback can open a menu or begin saving. Explicit new ground click, attack, guard, dodge, stop, interact, menu, blur, death, travel, rebind, save fault and profile transitions clear both context and movement. This module provides `.clear(reason)`; it does not own DOM/input/save handlers.

## Verification scope

The integration test exposed an existing ordinary click-movement corner cut: tile BFS advanced to the next tile while the radius-11 body had not cleared the previous corner. `locomotion-intent.js` now checks the leg to each path waypoint and first finishes moving to the current tile center if that leg is blocked. Safe direct movement, destination identity, collision radius and arrival tolerance are unchanged. Both ordinary click movement and contextual approach use this shared correction.

`app/tests/context-click.test.mjs` exercises the actual picker, approach planner, in-memory lifecycle, existing tile geometry and existing locomotion intent, including a collision-resolved around-corner walk and one-shot callback. It covers invalid input, render gating, label/body footprints, ambiguity, changing identity/state/position, no substitution, idle gating, cancellation, expiry and callback reentrancy. These focused tests are not browser QA, a build, a full-suite result, or proof of the main event-handler integration.

Focused verification at 21:25 UTC: `node --test app/tests/context-click.test.mjs app/tests/poe2-input-core.test.mjs` passed 85/85 (59 new contextual/corner tests and 26 existing input-core tests). Syntax checks passed for `context-click.js` and `locomotion-intent.js`. No browser, build, full-suite, Git, or publication was performed by this module task.
