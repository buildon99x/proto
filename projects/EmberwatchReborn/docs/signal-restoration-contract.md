# S-region signal restoration: isolated module and integration contract

2026-10-09 UTC. New Emberwatch Reborn reimplementation after source loss, not recovery of historical source. This module leaves `original0.4.7` and all existing/common files untouched. Parent integration, aggregate verification, normal-input QA, Git, Sites and Library are separate work.

## Scope and evidence

Implemented in six new files only:

- `app/src/signal-content.js`
- `app/src/signal.js`
- `app/src/signal-presentation.js`
- `app/tests/signal.test.mjs`
- `app/tests/support/earned-pass-route.mjs`
- this contract

Read bases: `r6-adept-route-proposal.md`, `requirements/warrior-gap-matrix-r6a1.md`, `r7-integration-checkpoint.md`, `r7a-normal-input-qa.md`, and current Pass/quarry domain/geometry/combat/persistence code. R7 ordinary-input progression reaches earned L10, but neither that evidence nor the previous aggregate test count proves this module.

**All new map layout, combat values, route rules, rewards and economy below are Emberwatch-authored tuning.** Preserved original reference facts and UNKNOWN fields are unchanged. There is no original-game map/AI/balance claim.

The S-only focused run: `node --test app/tests/signal.test.mjs`, **38/38 passed**, no skips/cancellations, 2026-10-09 around 22:00 UTC. `node --check` passes for all five new JavaScript/MJS files. This is an **in-memory integration preview**, not proof that the common app has been connected or that a human played S. No browser, Godot, heavy assets, network, publication or Git actions were performed by this module owner.

The test file explicitly enumerates the only preview transforms:

1. `world.js`: import/spread S region, foe and town-link data.
2. `state.js`: import S commands/reducer/validator; route S commands and validate S progress.
3. `campaign.js`: select the S portal guard for `signal_` gates.

Node 24 `registerHooks` applies those additions in memory, without writing existing source. A transform is skipped when that common module already imports S. Assertions fail if a required insertion anchor is missing. Existing settlement, life/death, reward multipliers, economy, command rejections, controller, store and commit formulas are unchanged. Each test file has Node's own test-process isolation; the hook is deregistered after module loading. The preview must not substitute for the parent's real-source aggregate/normal-input checks.

`earned-pass-route.mjs` runs existing R1→R7 handlers, including real promotion, quest, travel and combat settlement. It explicitly labels scripted coordinates and defeated reports as **scripted settlement fixtures, not actual combat**. Earned progression paths never assign XP, level, skill ranks or progress flags. Separately named corruption and zero-gold boundary fixtures intentionally change fields to test rejection or a constrained economy; they are not earned progression evidence.

## Playable authored loop

1. With actual Adept promotion and completed Pass report, accept from **blacksmith Orin**, not Eda. No new level, skill, gear, materials or currency requirement.
2. Enter `signal_basin`; defeat six entry foes and read the decoder near the upper centre of the entry courtyard. It grants a permanent non-consuming `signal_cipher`.
3. Use the two nearby routing levers in an order:
   - transmitter → receiver opens the **west approach**;
   - receiver → transmitter opens the **east approach**.
4. Repeating the same first lever resets only the unfinished order to 0/2. It does not cost anything or award XP. The second distinct lever commits exactly one route and one zero-value receipt. The committed direction stays fixed across return, death and reload; this avoids closing a route on a moving actor or farming route receipts.
5. Take the chosen corridor to the same central yard. The west enters toward the extra northern runner; the east enters toward two northern/eastern ranged positions. A solid centre island breaks sightlines. Defeat six yard foes and restore the transmitter on the island's south side.
6. The transmitter opens the central north door. Defeat four keepers and restore the receiver just north of that door. Report to Orin in town.

The choice changes traversable approach direction without teleporting or duplicating encounters. It is a compact 26×23-tile map; all mandatory targets and foes are connected when their prerequisites open. Neither approach adds a timer, required delay, payment or longer HP sponge. Both routes have identical mandatory rewards. Existing general AI and line/cone tells are reused; there is no new retreat/flank/environment-avoidance AI or directional armor implementation.

### Free optional return

`signal-shortcut` is usable immediately after decoding, **before route selection, yard combat or final objective**. Its zero-value receipt opens a town↔entry-courtyard lift. The shortcut is never required for transmitter, receiver or final report. Acceptance, levers, shortcut and region travel do not heal or erase paid cooldowns. Reward handlers preserve submitted vitals and recovery; the existing combat level-up recovery policy remains unchanged.

The unlock object is at (656,608), return portal at (720,656). They are 80 units apart, beyond one direct interaction radius, but their 76-radius interaction circles overlap. Add its explicit pair to the existing `SHORTCUT_INTERACTIONS` list during common UI integration so a nearby locked portal cannot hide the unlock action. Preserve existing reach/LOS guards.

## Exact budget

| Stage | Unique foes | Base kill XP / gold | Objective XP / gold |
|---|---:|---:|---:|
| Entry / decode | 6 | 240 / 30 | 100 / 10 |
| Yard / transmitter | 6 | 240 / 30 | 110 / 30 |
| Receiver / restore | 4 | 240 / 32 | 120 / 40 |
| Orin report | 0 | 0 / 0 | 90 / 60 |
| Total | **16** | **720 / 92** | **420 / 140** |

- Easy/Normal S total: **1,140 XP, 232G** before any L15 low-tier scaling. Hard/Serious: **960 XP, 232G** under the preserved per-kill multiplier. Every earned fixture here remains below L15; future high-level entries still use the existing per-kill tier multiplier.
- Receiver-only once-reward: iron4, wood1, thread3, ember_shard1, health_potion1.
- No reward for acceptance, route choice or shortcut. No entry/mandatory path cost, injected level, automatic Expert tier, skill or points beyond real level gains.
- Minimum route after S report: Normal **3761 cumulative XP, L12 +121XP**; Hard **3229.5XP, L11 +129.5XP**.
- Full earlier-route fixture after S: Normal **3995.5XP, L12 +355.5XP**; Hard **3435.125XP, L11 +335.125XP**.
- These totals are real-handler scripted economic paths. They are neither R7 user's normal-play profile totals nor ordinary S gameplay outcomes.

### Foe tuning

All use `tier:'adept'`, existing supported combat patterns and no larger-than-Pass HP maximum.

| Foe | Count | HP / armor / speed | Patterns |
|---|---:|---|---|
| `signal_runner` | 6 | 58 / 2 / 88 | alternating narrow cone: range70, half-angle0.32, damage11, 0.95s tell/0.8s recovery; broad short cone: range48, half-angle0.9, damage8, 0.65/0.95s |
| `signal_archer` | 6 | 44 / 0 / 36 | line, range255, width14, speed230, travel390, damage9, 1.2s tell/1.25s recovery |
| `signal_keeper` | 4 | 82 / 10 / 43 | alternating long narrow cone: range112, half-angle0.3, damage13, 1.1/1.0s; short broad sweep: range68, half-angle1.3, damage11, 0.9/1.2s |

Difficulty health/damage scaling remains existing common code. Tests inspect actual generic AI tells in the preview. They do not establish sustained combat pressure, role silhouettes, balanced builds, survivability or enjoyable pacing. Art/role badges remain the parent's common rendering work.

## Exports and command contract

Content exports:
`SIGNAL_REGION`, `SIGNAL_REGIONS`, `SIGNAL_FOES`, `SIGNAL_LINKS`, `SIGNAL_GROUPS`, `SIGNAL_ROUTES`, `SIGNAL_NODE_NAMES`, `SIGNAL_REWARDS`, `SIGNAL_PROGRESS_DEFAULTS`, `SIGNAL_RECEIPTS`, `SIGNAL_TOOLS`.

Domain exports:
`SIGNAL_COMMANDS`, `reduceSignal`, `validateSignalProgress`, `signalPortalAllowed`, `signalTierAllowed`, `signalMap`.

Presentation exports:
`signalObjectView`, `signalGuidance`, **`signalBlacksmithView`**. There is no Eda report alias; the intended quest NPC is Orin.

Commands match the Pass shape:

- `acceptSignalQuest`: `type, position:{x,y}, life, vitals:{hp,mana,stamina}`, optional `recovery`.
- `interactSignal`: same plus exact `objectId`.
- `reportSignalQuest`: same shape as acceptance.

Unknown fields, non-JSON data, accessors, symbols, sparse/cyclic structures, invalid life, unknown object, invalid position/resources/recovery or dead/stale commands fail closed. Commands are immutable inputs. New state is returned only after post-validation; failed reward/receipt capacity or overflow discards the whole transaction.

Acceptance/report requires live town state, distance≤76 and LOS to `blacksmith`. Required predecessor facts are the real Adept tier, `adept_commission`, `pass_reported`, `r4:report`, `r5:promote:adept`, `r6:q:report`, `r7:p:report`, plus full Pass/quarry-owned consistency validation. Common `validateState` must still validate the complete dungeon/promotion/equipment/save envelope. The local module does not claim a cryptographic ledger or server-authoritative kill/movement proof.

### Saved objective fields

All fields below are absent in untouched saves. Acceptance writes the complete set with `signal_accepted=1` and everything else 0:

- `signal_accepted`, `signal_decoded`
- `signal_route_step`: integer0–2
- `signal_route_first`: 0 before selection/reset, 1 for transmitter first, 2 for receiver first; retained after commitment
- `signal_route_ready`, `signal_west_open`, `signal_east_open`
- `signal_transmitter_restored`, `signal_receiver_restored`
- `signal_shortcut_open`, `signal_reported`

Every field except step/first is an integer0–1. Partial set or unknown `signal_` field is invalid. Step0 iff first0; route_ready iff step2. Exactly one west/east flag and corresponding receipt exists when ready; first must match direction. Tools/receipts/flags match exactly. All local kills belong to the fixed 16 IDs and require the earlier objective gates. Report requires receiver, receiver requires transmitter and its guards, transmitter requires committed route and yard guards. Decoding requires entry guards. Shortcut requires only decoding. Prior region/tool/receipt histories are never removed.

Exact receipts:
`r8:s:accept`, `r8:s:decode`, **one of** `r8:s:route-west`/`r8:s:route-east`, `r8:s:transmitter`, `r8:s:receiver`, optional `r8:s:shortcut`, `r8:s:report`.

Unknown `r8:s*`, duplicate receipts, both routes, missing cipher, forged future kills, mismatched predecessor records, absent required visit, illegal saved position/life/resources/recovery/economy all fail validation. Living commands cannot operate on a dead save. A valid persisted death keeps route, kills and rewards; existing retry increments life and moves to town without resetting progression.

Currently `signalTierAllowed` is intentionally **Adept only**, matching the runnable application. Future Expert/Master must be widened together in Pass/quarry eligibility, promotion validator, warrior runtime tiers/growth/recovery, and S. Expanding S alone would admit a misleading helper result while predecessor validation still rejects the save. This module never downgrades or injects a future tier.

### Events

- `signalChanged`: optional `objectId`, `mapChanged`.
- `signalReward`: `rewardId`, applied `xp`, `gold`.
- `signalCodeRead`: `routes:['west','east']`.
- `signalRouteAdvanced`: `step:1`, `nextNode`.
- `signalRouteReset`: `step:0`, localized reason.
- `signalRouteChosen`: `direction`, `step:2`.
- existing `levelUp` when an actual objective award crosses a boundary.

`mapChanged` is true for acceptance, committed approach, transmitter north-door opening and shortcut. Parent must rebuild only map/path caches from saved objectives, preserve combat/resource state, and display route progress/reset feedback. It must not reset all enemies or current recovery when a gate changes.

## Parent-owned integration checklist

1. Register content with `world.js`: `SIGNAL_FOES`, `SIGNAL_REGIONS`, `SIGNAL_LINKS.ash_hamlet`. Fixed region ID `signal_basin`; foe gates use only existing string-objective semantics.
2. Add S reducer dispatch and validator to `state.js`, before/alongside current Pass and quarry dispatch. Do not auto-add S fields to old saves. Add `signalPortalAllowed` selection for `signal_` gate strings to campaign travel. Two gates: `signal_entry` and `signal_shortcut`.
3. Route blacksmith quest UI with `signalBlacksmithView` while preserving equipment UI. Orin currently opens shop directly; do not accidentally send S report to elder or replace equipment access.
4. Add S object inspection/interaction, `SIGNAL_TOOLS` inventory names, `signalChanged` map cache updates, `signalReward`/route feedback, object visuals/used flags and labels. Use existing visual primitives, no new heavy asset claim.
5. Prefer `signalGuidance` ahead of completed Pass guidance once eligible. Retain useful route order, current next lever, selected side, independent lift and correct Orin report text in the accessible objective modal/HUD.
6. Extend shortcut targeting with explicit pair: region `signal_basin`, portal `signal-town-shortcut`, gate `signal_shortcut`, object `signal-shortcut`, kind `signal`, `openObjective:'signal_shortcut_open'`, required `signal_accepted` + `signal_decoded`. Test reach/LOS and unlocked behavior.
7. Add/verify focused role naming/badges as appropriate; generic geometry/AI supports the new kinds, but visual distinctions need common rendering inspection.
8. Run same-final-source aggregate tests, syntax/build, baseline integrity, and browser QA. Preview success is not evidence for a runtime-only hook omitted above.

## Covered failures and remaining boundaries

Preview coverage includes eight minimum/full×difficulty economic paths; both approaches/equal rewards/real navigation; NPC/dead/stale/LOS/gate failures; wrong repeated input/reset and idempotent decoder reread; free independent shortcut with saved resources/cooldowns; no-shortcut completion; persistent partial order through actual stores, travel, death and retry; simultaneous final guard/player death; duplicate kill/objective/report prevention; hostile/corrupt save/command trees; ledger/tool/receipt bounds and reward overflow; controller queue and two-tab conflicts; pre/post-head uncertain commits; generic AI pattern tells; truthful completed guidance.

Still untested: actual integrated browser/controller UI and first-entry safety for S; normal input from a genuinely earned R7 profile; live selection of both routes and readability; balanced all-spent/alternate builds; full Hard normal-input path; full campaign duration/fun; audio, touch/mobile, screenshots or site deployment. Current survivors retain the common policy of regenerating un-killed foe HP/position on reload; this is not full mid-fight enemy-state persistence. Future F/T, Expert15/skill use, later L30/Master and final report remain incomplete. S completion is only one meaningful prerequisite region, not campaign completion.
