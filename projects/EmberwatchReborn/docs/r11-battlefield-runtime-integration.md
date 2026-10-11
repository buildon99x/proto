# R11 authored post-Expert battlefield integration

2026-10-10 UTC. Content/module checkpoint on `codex/emberwatch-r11-battlefield`, based on `aab0368`. This is a new Emberwatch implementation, not restoration of lost maps or original Hammerwatch II measurements. Original reference catalogs and `projects/Emberwatch` are unchanged.

## Scope and evidence boundary

Implemented here: immutable B content, pure reducer/validator, read-only Korean presentation helpers, narrow world registry, geometry tests, explicit one-time budgets, synthetic production-settlement and isolated live-AI tests. `beacon_battlefield` contains two independently accessible device yards → distinct boss → separately recovered beacon → Eda report → `chapter_three_complete`.

Not implemented here: parent state/controller/campaign/main/visual integration, Expert item/affix/crafting choices, repeat expedition/reset, Master and final campaign, browser QA, balance/survival/readability/audio/mobile acceptance, publication or external archival. Render hints are data, not evidence that the user can see the new glyphs. The word “re-entry” means surviving foes reconstruct at full authored health/position while permanent defeats remain; it never means a reset/reward farm.

## Files and exact hooks for integration owner

1. `world.js` already imports/spreads `BATTLEFIELD_REGIONS`, `BATTLEFIELD_FOES`, `BATTLEFIELD_LINKS`. Region is `beacon_battlefield`; town portal is `town-battlefield-entry` at `(560,528)`, returning to `(560,464)`. Safe B arrival `(480,752)` and ordinary return `(480,784)` are separately spaced. Boss return reaches `(448,208)` in town, toward Eda but outside automatic NPC reach.
2. `state.js`: import `{BATTLEFIELD_COMMANDS, reduceBattlefield, validateBattlefieldProgress}` from `battlefield.js`. Run validation after T on every load/pre-/post-command. Dispatch the three commands via `reduceBattlefield`, then full `validateState`. Historical v1/v2/v3 guards must also reject B-owned flags/receipts/tool/region/visits/defeats, rather than accepting those through a newly recognized world registry. This module deliberately does not silently initialize older saves.
3. `campaign.js`: import `{battlefieldPortalAllowed,invalidateBattlefieldInput}`. Before the older portal selector, route `portal.gate?.startsWith('battlefield_')` to B. On every valid travel, call `invalidateBattlefieldInput(next)` beside `invalidateTombInput(next)` and reject revision overflow before mutation is committed. Existing actual settlement can use FOES and `battlefield_devices_ready` without special reward code. Re-run full post-state validation to catch out-of-order defeat records.
4. Commands are exact objects: `{type, life, position:{x,y}, vitals:{hp,mana,stamina}, recovery, expectedRevision}`; `interactBattlefield` adds only `objectId`. Types: `acceptBattlefieldQuest`, `interactBattlefield`, `reportBattlefieldQuest`. `expectedRevision` is B's `battlefield_revision`, NOT the controller/store revision or T's token. Snapshot it when the panel opens. Let ordinary controller/store revision handle atomic write races independently. No caller-supplied side, reward, amount, foe list or flags are accepted.
5. `main.js`: import `battlefieldObjectView`, `battlefieldElderView`, `battlefieldGuidance`, `battlefieldCommandFields`, `battlefieldPortalView/Label`, `battlefieldEventCopy`, `battlefieldPresentationHints`. Only actual `elder` mounts the quest card. Its `type` plus snapshot revision forms command fields; append current committed/runtime report fields. B object type is `battlefield`, with IDs `battlefield-west-device`, `battlefield-east-device`, `battlefield-beacon`. Completed objects have no actions. `hideWhenCompleted` reads the view's `completed`, not empty actions. Reopened panels retain updated progression; stale clicks must not acquire a new token at click time.
6. Guidance must precede completed T guidance for genuine Expert history. `battlefieldGuidance` returns null before Expert and an explicit unfinished-later-campaign notice after B reporting. Replace T's stale “Expert and battlefield in development” line when these actually ship; do not describe Master/whole campaign as done.
7. After committed `battlefieldChanged` or `battlefieldReward`, sync paid resources/permanent stats using the existing runtime sync. Only `battlefieldChanged.mapChanged===true` rebuilds `createMap` and clears path caches, preserving current living enemy HP, spells, RNG and accepted action snapshots. This occurs only on the second device. Never recreate the whole battle or refill resources for this event.
8. Events: `battlefieldDeviceReady` with `side` and `both`; `battlefieldBeaconTaken`; `chapterThreeCompleted`; `battlefieldReward` with rewardId/xp/gold; final `battlefieldChanged` with optional objectId/mapChanged. Generic objective level-up changes no current pool. All reward/flag/tool/revision changes are in one candidate state and one parent save.
9. `visual.js`: reuse owned assets and draw B roles from `battlefieldPresentationHints().roleShapes` below enemy tells. Labels explicitly include undead/status roles; boss family alternates fire spell line and physical weapon sweep. Place role/status labels where flash0 can still distinguish them. Danger uses existing exact committed pattern shape; never turn the tactical hints into fake new hitboxes. Optional static yard landmarks can use `BATTLEFIELD_TACTICS`, but the runtime geometry remains authoritative.
10. Parent full acceptance: actual campaign travel, top-level state legacy exclusions and B load rejection; controller two-tab stale/duplicate/reward faults and post-head uncertainty; UI/button/reopen/focus/remapping; full regression/build/original manifest/registry; separate normal-input Normal/Hard profiles, both skill branches, depleted save/retry, published QA and external source/test/provenance checkpoint.

## Progress/receipt truth table

All fields are absent in untouched saves. Acceptance atomically adds the complete default set and `r11:b:accept` with revision1:

- `battlefield_accepted=1`
- `battlefield_west_ready`, `battlefield_east_ready`, `battlefield_devices_ready`, `battlefield_beacon_taken`, `battlefield_reported`, `chapter_three_complete` begin0
- `battlefield_revision` grows on successful B commands and parent-authorized travel

Each device needs its own exact six defeated IDs; its flag iff `r11:b:west`/`r11:b:east`. Both devices iff `battlefield_devices_ready`. Boss ID `battlefield-usurper` is gated by that flag and disconnected by an actual solid overlay until both devices are operated. Beacon requires actual boss defeat and a separate living/reach/LOS interaction, adds `battlefield_beacon` tool and `r11:b:beacon`; both directions are validated. Report requires exact town Eda, entire preceding chain, and atomically adds `r11:b:report`, `battlefield_reported=1`, `chapter_three_complete=1`. This is a third-chapter marker, not the final campaign ending.

Eligibility requires current Expert tier, real `r10:promote:expert`, historical Adept/T receipts, retained oath and full `validateTombProgress`. Level15, commission or typing a tier label cannot replace valid history. A particular Expert purchase is never an access gate. Unknown B flags/receipts/tools/foes and partial/default-free activity fail closed. Death cannot interact; it retains paid objectives/defeats. No duplicate input replenishes gold/items, resets devices, clears cooldowns or resurrects enemies.

## Authored encounter rationale

The two yards are open in either order, connected by the short southern path. West has an offset solid central barrier, visible separate shooters and a southern radius128 Banner pocket; it requires choosing a firing side and leaving that pocket to reach the other shooters. The east lane spans256 units, with open96-unit lateral exits; a full4s/360-unit Onslaught is unnecessary. Side shooters give early release a tactical reason. The boss has200HP, below T's210, no invulnerable phases, and alternates a long narrow fire spell line with a short broad physical sweep and1.5–1.55s recovery. It is living, while seven yard enemies are explicitly undead; heal burst is useful without becoming a boss skip requirement. No HP/wait/distance padding was added to exhibit a skill.

All six negative statuses have real producers through the existing R11 `statusRuleIds` registry: revenant disarm; hexer poison; pyromancer/boss burn; lancer slow; binder silence; bulwark0.6s stun. Weapon/spell family is explicitly authored per pattern, including mixed boss attacks. Earlier T foes receive no new undead or spell labels. Existing R11 registry owns effect duration/tick damage; B content does not encode arbitrary save-provided status amounts.

This is an opportunity contract, not a balance claim: fixed patterns, safe entry and mathematical flanks do not prove readable encounters or strong/lower-investment build survival. Layout/tells should be corrected after actual play before increasing HP or introducing forced timers.

## Authored reward and progression ledger

All rows are Emberwatch choices. Original XP curve/reward/gold/geometry/enemy/status/supply values for this encounter are unknown. No source-confirmed catalog value was changed.

| Stage | XP | Gold | Other |
|---|---:|---:|---|
| Each yard:6 Expert foes | 540 base killXP | 54 | No random drops |
| Boss | 240 base killXP | 48 | No automatic beacon |
| West device | 280 objectiveXP | 35 | 3 iron,2 wood,1 health potion |
| East device | 280 objectiveXP | 35 | 4 thread,2 ember shard,1 health potion |
| Explicit beacon | 160 objectiveXP | 20 | 3 iron,2 wood,2 ember shard; nonconsumed beacon tool |
| Eda report | 180 objectiveXP | 80 | Chapter3 marker only |
| Total | 1320 base killXP +900 objectiveXP | 326 | 6 iron,4 wood,4 thread,4 ember shard,2 potions |

KillXP uses the unchanged production level-derived enemy-tier/difficulty function on each settlement. All B foes are explicitly authored Expert, so through these exits the multiplier is1 on Easy/Normal and0.75 on Hard/Serious. ObjectiveXP has no difficulty or low-tier multiplier. Device order does not change budget. Accepting/travelling grants0. Supplies are optional survival/build resources, not mandatory consumable/recipe gates. The reported T120G training reserve has already been consumed by real promotion; B does not create/release another reserve.

| T source total | B delta | Exit cumulativeXP | Exit level |
|---|---:|---:|---:|
| Minimal Easy/Normal6191 | 2220 | 8411 | 18 |
| Full Easy/Normal6365.5 | 2220 | 8585.5 | 18 |
| Minimal Hard/Serious5509.5 | 1890 | 7399.5 | 17 |
| Full Hard/Serious5715.125 | 1890 | 7605.125 | 17 |

These are actual handler-fixture totals from the existing earned T settlement path, not ordinary-input play. The historical observed Normal T6345.5 exit would project8565.5/L18 by this fixed budget; it has NOT been played through B. The lower Hard endpoint is explicit, not disguised as an assumed universal L18. L18–L30, Master fees and remaining content still need authored and played budgets. Existing early equipment is not Expert itemization; this module supplies no claim that the item/affix/crafting gate is complete.

## Verification record

Final command results are recorded in `verification-r11-battlefield.txt`. Standalone content/geometry tests run directly in this worktree. The baseline cannot derive or validate Expert state, so core tests run against a disposable `/tmp/emberwatch-battlefield-verify` copy of current `emberwatch-r11-combat/app` plus B files/world. That copy is a dependency test overlay, not an alternate shipping app, browser run or remote environment. No source of the combat/integration parent was modified by the worker.

Core tests explicitly identify synthetic settlement/location fixtures. XP/points/promotion/reward/death/retry use production handlers without XP/level/reward injection. B travel alone is a synthetic location/visited/revision transition, pending parent routing. Save round trips use the copied R11 store and explicitly invoke the B validator, but do not establish that the parent's `validateState` registers B until integrated. Isolated live-AI tests use authored map/foes/HP/status families and real `stepBattle`, with explicit actor relocation/isolation and one documented deterministic RNG seed for Lawbringer. No synthetic status injection or old-T relabeling substitutes for a real producer.

`pnpm sync:registry` was attempted and returned the known `ENOENT /home/agent/.local/share/pnpm` before registry generation. No dependency installation workaround, release build, browser, Git remote, publication or Library upload was attempted. Syntax and local source/test/provenance checkpoint do not replace external archival or final integration acceptance.

Final focused results:23/23 standalone geometry/regression checks (10 new B plus13 existing world/T geometry),34/34 B dependency-overlay checks, and source/test syntax passed. Exact copied dependency bytes matched combat commit `8d6f54062ecbfef5aa1d1b38b37b94bfe01b39ac` at final comparison; core source hashes are in the log. These counts are new execution results, not inherited suite totals. Original project/reference scoped diff is empty; the separate full167-file manifest verification remains the parent's release responsibility.

## Later parent integration

The historical component-only exclusions above are superseded for the R11a integrated candidate by `r11a-integrated-battlefield-candidate.md` and `verification-r11a/`. The original component test methods/counts remain historical evidence, not a substitute for the integrated whole-suite and ordinary-input gates.
