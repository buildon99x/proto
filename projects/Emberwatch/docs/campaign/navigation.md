# Campaign navigation adapter

Status: independently tested runtime component, not an activated or browser-verified campaign. The legacy entrypoint is unchanged. No combat statistics, XP, equipment, class rules, or enemy content are added.

## Integration

`app/src/campaign/navigation.js` wraps the existing campaign controller. Its required `speed` option must come from the caller's verified movement rules; it has no invented character-speed default. Positions use the existing 32-unit world grid and the existing 12-unit actor footprint. The 48-unit interaction reach and 100 ms frame cap are presentation/collision constants, not claims about Hammerwatch II values.

1. Create the existing `createCampaignSession` and `createCampaignController`. Initialize the world with `initializeCampaignWorld`, or load an existing campaign. Keep the controller's combined world/inventory validation in place.
2. Create `createCampaignNavigation(controller, {speed})` and await `restore()`. Do not present a campaign actor until it succeeds. A missing optional navigation record is initialized and durably committed first.
3. Feed world-axis input to `step({x, y, interact, paused}, elapsedSeconds)`. Normalize camera/screen coordinates outside this module. The adapter normalizes diagonal input, caps suspended frames, and uses swept axis collision with corner sliding.
4. Render `level()` as immutable authored geometry. Render the copied `view()` position, targets, focus, locked-gate markers, and pending state. Do not mutate the returned level. Target commands in `view()` can be sent through `request(command)`; proximity and line of sight are checked again at execution.
5. A non-null `step(...).commit` must be awaited or observed. Show travel, reward, puzzle, dialogue, and service results only after its successful result. `pending()` also exposes the active promise. An ordinary movement frame is immediate; a room/region transition is visible only after the complete save commits.
6. Call `checkpoint()` when ending gameplay, opening a persistent pause/menu, or handling focus loss. Stopping movement on a normal frame also checkpoints a dirty position. `setPaused(true)` blocks further input but does not itself save; await the explicit checkpoint. Browser shutdown can interrupt asynchronous persistence, so resume restores the last completed commit rather than promising to save an in-flight frame.
7. Feed key-up frames while paused or pending. A press consumed there is not buffered for later execution. Portals also require physical departure beyond interaction reach after arriving or restoring on one, preventing immediate return even after releasing F.

`request()` allows nearby conversations, quest acceptance/turn-in, services, rest, authored interactions and their begin/commit/cancel phases, individual puzzle controls, and cross-region portals. It refuses same-region travel buttons: walk the connecting floor instead. It does not expose combat defeat, arbitrary time advancement, position assignment, or node teleportation. Combat and other verified systems retain their own controller reducers.

## World rules and fixed geometry

The world reducer remains the only authority for quest prerequisites, tools, doors, clues, puzzles, shortcuts, time, rewards, and reward receipts. Collision derives accessible galleries from those same authored travel requirements. Entering a directly connected room commits that travel edge; no disconnected destination command can be chosen by the UI. Locked doorway markers are supplied for rendering, and locked hidden portals have no active interaction target.

The fixed `levels.js` L galleries have overlapping topology: for example, the marsh-edge-to-dock gallery crosses the shed room. The adapter preserves every original tile. When walking enters an adjacent room along that route, it records that room's real travel edge. Leaving through an overlapping gallery can then commit the edge back to the gallery's owning node before continuing. Crossing a third room without a direct graph edge stays on the current authored gallery. This avoids a dead end or an invented shortcut and keeps the actor's position continuous.

Consequently, physical routes that enter an incidental adjacent room can accrue that side-path's existing travel time as well as the destination edge's time. The complete directed-edge test verifies each resulting event and the sum of its authored minutes. This is an explicit consequence of preserving the present layout, and route-time/landmark clarity still needs a normal-play map review before campaign activation. The adapter does not claim the authored travel-time labels alone describe every overlapping physical route.

Cross-region arrival always uses the reciprocal portal for the selected edge. A coordinate saved at another entrance or another room is never substituted. The arrival portal remains disarmed until the actor walks away. Region entry, world state, departure position, arrival position, and their rewards/time effects commit together.

## Save compatibility and failure behavior

The module adds this optional field inside the existing campaign.v2 world object; `save.js` and the storage envelope are unchanged:

```json
{
  "navigation": {
    "version": 1,
    "layoutVersion": 1,
    "positions": {
      "ash_hamlet": {"nodeId": "hamlet_square", "x": 560, "y": 496}
    }
  }
}
```

The numbers above are a shape example; migration derives the actual coordinate from the currently committed authored node. It does not reset the world, convert legacy expeditions, grant starting gear, or fill unresolved character rules.

`validateCampaignNavigation` composes world validation with navigation version, visited region/node, finite floor position, room/corridor association, current-node agreement, and active gate checks. Missing navigation state may be initialized. Malformed positions or unsupported versions fail closed without silently overwriting the save. Historical regions retain their last recorded coordinates; resume restores the exact current-region coordinate. A new region entry deliberately replaces that region's position with the correct incoming portal.

Controller revisions are captured when requesting a transition. A queued competing controller change invalidates stale navigation intent instead of overwriting it. An external location or same-node position change requires `restore()` before continuing. Ordinary inventory/progression commands that preserve location can continue through their existing reducers.

A pending operation holds movement and repeated requests behind one deterministic latch. Failed writes leave the departure actor and controller snapshot unchanged, so rewards and travel are never announced before persistence. A deliberate retry is possible after the failure. Pause does not cancel an already requested commit; if that commit succeeds, its durable position remains authoritative while the game is paused.

## Verification and remaining integration

Run `node app/tests/campaign-navigation.test.mjs` from the project root. Tests cover:

- Missing-state migration, invalid/newer saves, wrong-node and gated positions, and write failure during initialization
- Normalized world input, wall sweeps, corner sliding, frame stalls, and exact wall-corner line-of-sight rejection
- All directed authored connections through normal movement or their actual portal
- Nearby NPC/quest/service authority, remote command rejection, individual puzzle-control reach, and two-phase chest authority
- A physical first-quest journey: clue, tool, village revisit, quest turn-in, door opening, and dungeon arrival
- Physical valve solving, drainage shortcut opening, restart, hidden-bank reward, and return to the earlier field
- Pause, held F, portal departure, asynchronous commit serialization, failed writes, stale queued intents, and immutable view data
- Stop/checkpoint/reload exact-position restoration and entrance-correct region revisits

The integration includes this test in `app/package.json`; the required full suite exercises it. Actual campaign rendering, authored encounter integration, map/minimap presentation, browser controls, gameplay timing, and the unresolved original-game combat/progression rules remain separate acceptance work. These logic checks do not prove a finished playable campaign.
