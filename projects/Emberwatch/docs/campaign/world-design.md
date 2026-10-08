# Original campaign world foundation

This is the coordinate-independent quest/world layer for the October 8, 2026 campaign plan v1.1, especially H2-08, H2-09 and section 5. It implements original Emberwatch places, characters, clues and interactions. It does not reproduce commercial maps, dialogue, puzzle answers or unknown reference economics.

The module is a deterministic state foundation. Passing its tests is not a claim of a playable 60–90 minute campaign, verified combat, an implemented commerce system or browser acceptance.

## Authored content

- One safe hub: 재빛 피난촌, centered on the 공동 화로.
- Two fields: 솔바람 고개 and 유리갈대 습지.
- Three connected dungeon floors: 종의 회랑, 물길 제어실 and 잿불 심장.
- One optional side cave: 메아리 틈굴. The main quest never requires entering it.
- Twenty-one semantic nodes and twenty-three bidirectional links. Nodes expose region, Korean landmark name, room role and description; geometry belongs to the renderer's level layer.
- Five hub NPCs with working dialogue and quest transactions. Additional typed service requests dispatch to the progression/economy owner: 세린 (training), 보로 (equipment/crafting), 나리 (tools/navigation), 윤 (consumables), 미라 (rest). Rest itself advances world time here. There are two field NPCs, including a night-only character.
- Three linked main quests and five side quests covering tool/clue collection, puzzle solving, material delivery, timed delivery, nighttime conversation, exploration and encounter completion.
- A sequence puzzle using a clue from another region, an environmental valve puzzle, a consumable key door, persistent chests, a hook-gated revisit, two hidden passages, a return shortcut and a persistent boss/beacon resolution.

### Geography and choices

The hub connects to the forest's 이정표. The 이정표 branches to the 종탑 clue, the initially blocked 수로, a short exposed ridge to the marsh, and a longer sheltered route through 낮은 징검길. The marsh branches to the tool shed, delivery dock and optional cave. The cave entrance is revealed by the forest's separate fissure clue.

The tool shed grants 물길 갈고리. Returning to 나리 completes the first main quest. The same previously blocked forest 수로 can then be opened and crossed into the first dungeon floor. Its bell puzzle uses the earlier forest clue, in the original order 재 → 갈대 → 종.

The second floor offers a short pressure-plate bridge or the longer valve route. The valve goal is 유입 closed, 우회 open, 배출 open. Solving it enables the safe route and lower floor access. Opening the 배수로 문 creates a shortcut to the earlier forest's newly revealed 물 아래 계단 and its unique-item descriptor chest. The third main quest uses the second quest's 인장 to open the final door, then resolves the guardian and beacon. Completing it records the next-region and advanced-stock flags; the next region's geometry and merchant inventory are deliberately outside this foundation.

Trap/exposure fields are renderer/combat encounter contracts, not simulated collision or damage here. All routes are authored and stable; none are procedurally rerolled.

## Public API

Imports are browser-compatible relative ES modules with no runtime dependencies:

```js
import {createCampaignSave} from './save.js';
import {
  WORLD_CONTENT, initializeCampaignWorld, applyWorldCommand,
  validateCampaignWorld, getWorldView, getQuestJournal, worldClock
} from './world.js';

let result = initializeCampaignWorld(createCampaignSave('warrior'));
let save = result.save;
result = applyWorldCommand(save, {type: 'talk', npcId: 'serin'});
if (result.ok) save = result.save;
const view = getWorldView(save);
```

`WORLD_CONTENT` is deeply frozen and is also exported directly from `world-content.js`. Its arrays are `regions`, `nodes`, `exits`, `npcs`, `quests`, `interactions`, `puzzles` and `encounters`. IDs are stable, plain original-content identifiers.

`initializeCampaignWorld(save)` is explicit, immutable and idempotent. It accepts a fresh campaign save and refuses unrecognized world progress or incompatible content versions. It never converts, deletes or accesses legacy saves. All three campaign classes can carry this world state; this is not a claim that all three classes have completed combat presentation.

`applyWorldCommand(save, command)` returns `{ok, save, events}` and, on failure, `code` and optional detail. Every failure returns the exact original save object and an empty event list. A success returns a new complete snapshot, except documented no-op repeats and service intents, which preserve the original object. Inputs are never mutated. There is no `Date`, timer, random call, browser/storage access or asynchronous side effect in this module.

| Command | Fields | Result |
| --- | --- | --- |
| `travel` | `exitId` | Validates current node and saved requirements, visits destination and advances authored travel minutes |
| `talk` | `npcId` | Checks presence/time, discovers available quests and records active conversation objectives |
| `acceptQuest` | `questId` | Requires discovery and the giver's presence; atomically grants any start item and records deadline |
| `turnInQuest` | `questId` | Requires objectives, recipient and deadline; atomically consumes delivery items and grants rewards |
| `interact` | `interactionId` | Completes a clue, chest, door, shortcut or beacon as one atomic command |
| `beginInteraction` | `interactionId`, `token` | Saves a pending interaction without granting rewards |
| `commitInteraction` | `token` | Rechecks location and requirements, then completes once |
| `cancelInteraction` | `token` | Removes a pending interaction without completing it |
| `puzzleInput` | `puzzleId`, `input` | Advances or resets the sequence puzzle |
| `puzzleInput` | `puzzleId`, `control`, `value` | Sets a boolean valve and checks the environment puzzle |
| `defeatEncounter` | `encounterId` | Records an authored encounter's verified combat completion and any boss reward |
| `advanceTime` | `minutes` | Advances positive integer campaign minutes and expires deadlines |
| `rest` | `minutes` | Advances time while the hub innkeeper is present |
| `requestService` | `npcId`, `service` | Emits `serviceRequested` without making progression/economy changes |

Interaction tokens must contain 1–80 letters, digits, underscores, colons or hyphens. A committed token cannot be reused for another interaction. Repeated commit callbacks, chests, opened doors, boss completion and completed quest turn-ins do not duplicate rewards. Starting a second pending interaction is rejected. Travel, rest or explicit time advance interrupts an unfinished interaction. A saved pending interaction may be resumed after load at its saved node.

`getWorldView` returns the current node and region, clock/weather, exits with destination/lock/missing requirements, present NPCs, local interactions, puzzles without their `solution` fields, remaining encounters and journal. This view is a detached copy. A locked hidden exit can be rendered as an unexplained landmark until the player has its clue; the renderer chooses discovery presentation. The content export necessarily includes puzzle solutions for the local engine, so hiding them in the view is presentation hygiene, not security.

`getQuestJournal` hides undiscovered quests by default and supports `{includeUndiscovered: true}` for diagnostic views. It exposes Korean titles/hints/objectives, completion, deadline and rewards. Completed collection objectives remain checked after their items are consumed.

The combat owner must emit `defeatEncounter` only after actual verified defeat. The reducer validates authored ID, node, prerequisites and repeat protection; it does not inspect health, attack input, collision or client trust.

## Persisted state and atomicity

The foundation extends the existing campaign.v2 save shape:

```text
world.contentId / contentVersion
world.currentRegionId / currentNodeId
world.timeMinutes / weather
world.visitedLevels / visitedNodes
world.questFlags / questLog
world.travelRequirements
world.openedDoors / openedShortcuts / openedChests
world.puzzleStates / bossFlags / flags
world.metNpcs / clues / defeatedEncounters
world.usedInteractions / pendingInteraction / interactionCommits
world.rewardReceipts
inventory.rewardDescriptors
```

Each quest log row stores status, acceptance/completion/failure time, absolute deadline, its prerequisite and objective snapshots, and conversation progress. Every exit stores its requirements in `world.travelRequirements`. These snapshots are serialized with the save and validated against the content version on load/use. A content rule change requires an explicit version migration; the module does not silently reinterpret an old snapshot.

The existing store serializes all added fields. Validation here additionally checks world location, inventories, requirement snapshots, puzzle structure and quest timestamps. `validateCampaignSave` alone remains a generic envelope validator; integration must call `validateCampaignWorld` before activating this campaign's world.

Rewards and their durable receipts are in the same returned snapshot. The integration sequence is: reduce command → persist entire resulting snapshot with the existing revision check → install/render/acknowledge the snapshot. If persistence fails, keep the previous committed snapshot and let the user retry. Do not pay rewards again from emitted events. The tests simulate an interrupted head write and demonstrate replay from the committed snapshot yields exactly one reward.

This provides exactly-once state effects within the single-player save transaction, not distributed exactly-once network delivery. Event consumers are responsible for treating presentation events as notifications, not a second authority for inventory mutation.

### Reward descriptors

Gold and material amounts are original provisional Emberwatch content values, explicitly unrelated to unverified Hammerwatch II prices or XP curves. Supported state effects are gold, material, tool, quest item, clue and progression flag. No XP or level transition is fabricated.

Two unique-item finds append descriptors to `inventory.rewardDescriptors` with a stable `grantId`, item identity, slot and `AWAITING_ITEM_CATALOG` status. They intentionally have no guessed damage, armor, affix or requirement numbers. The item-system owner must resolve each `grantId` once within its own persisted inventory transaction before treating the descriptor as equippable gear. The world layer does not silently generate duplicate equipment instances.

Training, shopping, crafting, potion use, stock refresh and paid rest are not implemented by service dispatch. Existing `shopRefreshTimes`, character state, equipment instances and unrelated inventory fields are preserved for their owning modules. `rest` changes only campaign time/weather/quest deadlines; it makes no claim about unknown healing or gold charges.

## Time and quest rules

- `timeMinutes` is elapsed campaign time in integer minutes. Elapsed minute 0 is local 08:00, day 1. Real wall-clock time and time spent with the application closed do not advance it.
- Travel durations and authored delivery duration are provisional Emberwatch tuning. Interaction/dialogue commands do not advance time. The gameplay owner may convert active play into explicit whole-minute `advanceTime` commands; it must choose and test that pacing.
- The night NPC is available from local 18:00 inclusive until 06:00 exclusive, including across midnight. The night quest must be active when the conversation occurs.
- The timed delivery expires when `timeMinutes >= deadlineAt`, including while its conditions are ready but it has not been handed in. Its 90-minute interval begins at acceptance, not discovery. Delivery is valid through minute 89 and invalid at minute 90 when accepted at 0.
- Expiration marks the quest failed, removes its expired quest-only flask and changes the apothecary's dialogue. It does not reset locations, discoveries, other quests or rewards. There is no automatic retry/reset or duplicate flask grant.
- Cosmetic weather cycles fair → mist → rain by local calendar day. It has no invented damage, movement or quest debuff.
- No death loss, respawn location, enemy respawn schedule, original respec price, original shop cadence or unverified promotion condition is specified here.

## Verification

Run from the project directory:

```sh
node --test app/tests/campaign-world.test.mjs
```

The focused suite currently contains 15 tests, including a full authored route that completes all eight quests and saves/reloads through `createCampaignStore` after every successful command. It covers class-neutral initialization, content counts/IDs, all regions, the optional branch, clue/tool/revisit order, two puzzles, the shortcut, key consumption, boss/beacon flags, deferred unique descriptors, quest dependency locks, malformed and prototype IDs, immutable rejection, repeat callbacks, canceled/resumed interactions, interrupted save commit, partial puzzle reload, exact night/deadline boundaries, travel that crosses a deadline, cosmetic midnight weather, requirement/deadline roundtrip, and service dispatch boundaries.

These are pure-state logic tests. Geometry, collision, node proximity, fight completion, minimap/fog, UI controls, Korean screen layout, encounter animation, audio, combat/economy integration, actual campaign pacing and player enjoyment require their own runtime/browser verification. This module does not publish or activate any presentation rollout.
