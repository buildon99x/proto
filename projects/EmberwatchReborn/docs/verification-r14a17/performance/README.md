# R14a15 scene-cost investigation

Read-only investigation of the frozen R14a15 diagnostic candidate. No source, runtime policy, or browser state edits. Original nativeCanvas/isolated Chromium failures are not retried. Publisher exclusively owns normal-input browser QA; plain Node measurements start only after their input session ends.

## Confirmed measurement boundaries

- `main.js` lines 728–732: wilderness/signal visibility and reachable-floor traversal, display object/NPC/portal arrays and their views, and optional contact-trace observation. Contact trace was OFF in incident #1350.
- Renderer, label drawing, and any floor/warrior canvas caches are in the separate render bracket. HUD DOM writes occur in UI. `audio.tick` has its own bracket. Direct combat event/save-entry work is events. Async dispatch completions and non-rAF handlers are not enclosed by these frame brackets.
- A view call can indirectly run pure state validators that construct a temporary collision map. This is distinct from replacing `battle.map`, which only occurs in explicit runtime rebuild/map-changed dispatch paths.
- `connectedFloor` floods current connected tiles and allocates a fresh boolean grid/coordinate queue every call. `connectedSceneVisibility` also makes Maps, objective copies and closures each call. These are potential repetitive work, not yet proof of a 281ms browser interval.
- `main.wildernessView` already has a WeakMap keyed by state object. First access to each object/portal on a new state snapshot populates all views; subsequent accesses reuse them. New committed state identity makes the cache cold.
- Cold wilderness object views each request `wildernessClue` -> `validateWildernessProgress` -> full ancestry validation. Portal views invoke `wildernessPortalAllowed` and progress/eligible validation. The validators recursively inspect state, predecessors, equipment/economy/character and temporary maps; no direct DOM, Canvas readback or storage API occurs in this scene path.

## Native incident #1350

Source: `r14a15-deployment-checks/browser-qa/r14a15-expert-incident1-full.txt` and detail screenshot, read and visually confirmed.

- Previous rAF stamp146620.70; callback entry146879.60/end147162.70: entry-stamp258.90, callback elapsed283.10, scene281.30, render1.50, HUD0.10, safety0.20ms.
- Current rAF stamp147153.90; callback entry147171.40/end147177.80: entry-stamp17.50, callback elapsed6.40, scene0.20, render1.10, HUD5.00, safety0.10ms.
- End-to-next-entry8.70ms. Stamp interval533.20 =258.90+283.10+8.70−17.50. Do not add current6.40 to explain the interval between rAF stamps.
- Both rows are visible/focused/epoch0, no safety stop. `save-wait` classification gives busy precedence over paused; it does not show whether paused was also true. Runtime safety has `!paused && suspended`, not `!busy`. Esc had opened a voluntary menu. The incident cannot support the assertion that saving suppresses the safety guard.
- `performance.now` differences are synchronous bracket elapsed times, not exclusive JS CPU. GC, process descheduling and browser work inside a bracket remain possible. Entry-stamp also is not a uniquely attributed scheduler delay.

## Planned reproducible checks

`benchmark-scene.mjs`: exact extracted production scene block and state-view cache; command-earned synthetic progression fixtures; new-state cold vs same-state warm; individual floor/map/validation/view costs; process aggregate CPU separate from wall; fixture hashes before/after. No Canvas/DOM/storage or live profile extraction.
`profile-cold-scene.mjs`: separate Node CPU sample profile of cold calls after saved fixtures, used only for function ancestry attribution. Browser cause acceptance remains separate.
