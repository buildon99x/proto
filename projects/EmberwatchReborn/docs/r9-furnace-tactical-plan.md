# R9 Furnace: a compact tactical Adept route

2026-10-10 UTC. **Design only. F and T have not been implemented or played by this task.** Baseline read: `816671f` on `codex/emberwatch-rebuild`, app `0.8.0-reimplementation.2`; concurrent S-readability edits are not evidence for this proposal. This task owns this document only. No browser, publication, remote write or application edit is included.

## 1. Decision and evidence boundary

Build **one 24×20-tile furnace with a shared work ring, real projectile-blocking cover, mixed enemy groups and one durable cooling choice**. Cooling can retain a protective baffle or open a direct attack lane; both side approaches remain available. Exhaust opens a rear cross-aisle for the final fight. Do not make three copies of the S keeper room, increase HP to absorb the strong build, add a defense timer, or require more walking to reach a duration target.

- **Existing evidence:** [R8a east QA](r8a-normal-input-east-qa.md) and [R8a1 west/death QA](r8a1-normal-input-west-death-qa.md) earned the same S delta, 1,140 XP/232G, ending at L12/3,975.5 cumulative XP. West used one potion and paid one 31G death loss; east used neither. Readability and encounter-choice depth remain open. Their interrupted combat/menu counters are not controlled pacing measurements.
- **Preserved reference:** tier boundaries 5/15/30, Hard/Serious kill XP ×0.75, and Adept-enemy XP ×0.5 starting at player L15. Cached reference facts are not newly measured original-game facts. Keep `reference-core.js` and `reference-warrior.js` unchanged.
- **Emberwatch-authored:** every map coordinate, enemy role/stat/timing, F reward, cover choice, fire-escape behavior, progression curve, death rule and training-fee protection discussed here. F continues the [R6 approved-authored progression proposal](r6-adept-route-proposal.md); it does not restore lost source or copy an original-game map.
- **Requirements:** [Warrior checklist](requirements/warrior-completion-checklist.md) G4–G5 and §§4–8; [gap matrix](requirements/warrior-gap-matrix-r6a1.md) §§5–6; [dated R7/R8 update](requirements/warrior-gap-update-r7-r8.md). Canonical v1.1/Library v2 was previously read, but its local byte materialization remains blocked in the source-status record. This task did not retry it.

F adds no class or skill tier. Expert/Master skills, itemization, respec, live repeat expeditions, full-campaign time/depth, audio and mobile acceptance remain separate unfinished requirements.

## 2. Exact mandatory budget and objective order

All 17 foes are unique, permanent `adept` enemies. Mix the three reward bands within each encounter, rather than put each band behind its own door. This preserves the previous **240/300/300 base kill-XP sequence**, although the last two groups' gold changes from 36/40 to 38/38. Total rewards are unchanged.

| Stage / activation | Fixed IDs | Count / base XP / G | Required result |
|---|---|---:|---|
| Cooling apron / accepted | tender-1/2, nozzle-1/2, warden-1 | 5 / 240 / 30 | Clear five, choose cooling mode, cool the line |
| Exhaust work ring / cooled | tender-3/4, nozzle-3/4, warden-2/3 | 6 / 300 / 38 | Clear six, open exhaust cross-aisle |
| Ignition gallery / exhausted | tender-5/6, nozzle-5/6, warden-4/5 | 6 / 300 / 38 | Clear six, ignite, then collect the lens separately |

IDs above have the full prefix `furnace-`. Role totals are **6×40 XP/5G + 6×50 XP/6G + 5×60 XP/8G = 840 XP/106G**. No environmental kill, chosen approach, return trip or alternate button creates another enemy/reward ID.

| Single authoritative receipt | XP | G | Other award |
|---|---:|---:|---|
| `r9:f:accept` | 0 | 0 | Initialize F progress only |
| `r9:f:cooling` | 100 | 10 | Cooling mode and both side passages, atomically |
| `r9:f:exhaust` | 120 | 30 | Rear cross-aisle |
| `r9:f:ignition` | 140 | 50 | Iron 5, wood 2, thread 2, ember shard 2, health potion 1 |
| `r9:f:lens` | 0 | 0 | Nonconsumable `furnace_lens`; distinct explicit pickup |
| `r9:f:shortcut` | 0 | 0 | Optional freight lift after cooling |
| `r9:f:report` | 90 | 60 | Orin report; story handoff toward T |

F totals below L15: **Easy/Normal 1,290 XP; Hard/Serious 1,080 XP; every difficulty 256G**. Objective XP is neither difficulty-scaled nor lower-tier-scaled. Apply the existing multiplier at each actual kill; if a future legitimately higher-level entry crosses L15, do not promise the below-L15 total. Preserve fractional XP rather than round the Hard margin away.

No mandatory fee, material use, upgrade, specific branch, potion, new level threshold or optional shortcut. R9 implements the free mechanical repair only. The older optional iron/ember repair proposal is deferred; adding it later must use the same receipts and mandatory foes, never a second reward path.

## 3. One map, three different spatial problems

**Region:** proposed `ember_furnace`, 24×20 tiles, 32 world units/tile. World coordinates below use the same axes as `world.js`, not screen-relative WASD. Bounds are smaller than S's 26×23. Use low walls/ground footprints for cover and unmistakable floor bands at opened thresholds; tall reused walls must not hide the openings again.

Fully open collision sketch (`#` solid, `.` traversable). The two lower side gates open with cooling; the optional center channel runs north from the bottom apron. Exhaust opens the horizontal rear aisle beneath the north gallery and its center connection.

```text
########################
########################
##....................##  ignition gallery / lens
##.....##......##.....##  two solid piers break firing lines
##.....##......##.....##
##....................##  exhaust rear cross-aisle
##.....###....###.....##
##.....###....###.....##
##....................##  work-ring transverse aisle
##....................##
##....................##
##.....###....###.....##  side flanks; optional center channel
##.....###....###.....##
##.....###....###.....##
##....................##  cooling apron
##......##....##......##  two fixed cover blocks
##......##....##......##
##....................##  entry / cooling console
########################
########################
```

Tile-room rectangles `(x,y,w,h)` for a reproducible first implementation:

- Apron: `(2,14,20,1)`, `(2,15,6,2)`, `(10,15,4,2)`, `(16,15,6,2)`, `(2,17,20,1)`.
- Side ring: `(2,4,5,11)`, `(17,4,5,11)`; transverse aisle `(5,8,14,3)`.
- Lower/upper center stems: `(10,10,4,5)`, `(10,4,4,5)`.
- Gallery: `(2,2,20,1)`, `(2,3,5,2)`, `(9,3,6,2)`, `(17,3,5,2)`, `(2,5,20,1)`.
- Closed-door overlays: `(2,13,5,1)` and `(17,13,5,1)` require `furnace_cooled`; `(10,11,4,3)` requires `furnace_center_open`; `(2,5,20,1)` and `(10,6,4,2)` require `furnace_exhausted`.

These are ordinary `rooms`/`doors`, not new dynamic collision types. Flags only open geometry; no choice closes a tile under an actor or strands a surviving enemy. Future-stage foes are physically isolated, not merely asleep behind a cosmetic line: current `hitEnemy` does not make gated idle foes invulnerable, while `settleCombat` correctly rejects their premature kills.

### A. Cooling apron: separate a melee screen from a shot line

Entry/normal return `(112,560)`. Proposed foe points: tender-1 `(240,464)`, tender-2 `(560,528)`, nozzle-1 `(400,464)`, nozzle-2 `(656,464)`, warden-1 `(368,528)`. Cooling console `(560,560)`.

The two cover blocks stop shots and the player's hammer alike. The player can lure the first tender around a block and preserve MP, or use charge to cross into a nozzle's recovery and kill it first. Warden-1 covers the center pocket; a frontal hammer line trades speed for exposure to the other nozzle. No fixed pack of five begins surrounding the arrival point. Do not spread the five farther merely to make the room last longer.

After clearing five, the console offers one explicit, durable choice:

- **Retain baffle / 엄폐판 유지:** both side flanks open; the center remains solid. It breaks nozzle sightlines and supports pulling one melee threat around cover, but also blocks the player's direct hammer/charge.
- **Open channel / 중앙 통로 개방:** the same two side flanks remain open, plus the center stem. This offers a direct charge/penetrating-hammer approach and an escape axis, but exposes that route to the two separated nozzle angles. It does not strengthen the player or reduce any foe's HP.

State the permanence and equal rewards before the choice. The single cooling receipt and chosen mode commit together. No lever-order guessing, extra activation reward or forced pause. Unlike S, this does not select one corridor and prohibit the other: both flanks remain legal throughout.

### B. Exhaust work ring: spend offense, shield or movement on crossfire

Foe points: tender-3 `(176,368)`, tender-4 `(592,368)`, nozzle-3 `(272,304)`, nozzle-4 `(496,304)`, warden-2 `(208,240)`, warden-3 `(560,240)`. Exhaust console `(368,304)`.

Nozzles occupy separate ends of the transverse aisle, with melee threats approaching around the crucible walls. In cover mode the player can break one firing line, pull a warden toward a corner, then cross to the far nozzle. In open mode the player can approach the space between the nozzles directly, spending a spell for speed or guarding one angle while moving out of the other. One facing cannot actively block opposite directions. These are hypotheses for real play, not guarantees from the drawing.

After the six are defeated, exhaust opens the **rear horizontal cross-aisle and center connection simultaneously**. This changes the final encounter's usable floor, not just a quest flag. The console has no charge-up timer, heat meter or periodic hazard. Heat is an authored visual theme; there is no invisible fire damage.

### C. Ignition gallery: commit, flank and control moving targets

Foe points: tender-5 `(176,112)`, tender-6 `(592,112)`, nozzle-5 `(304,80)`, nozzle-6 `(624,80)`, warden-4 `(368,144)`, warden-5 `(560,144)`. Ignition `(368,80)`; distinct lens pickup `(656,112)`.

The newly opened rear aisle allows a lateral flank behind either pier. Direct center entry reaches the first warden quickly but does not put both separated nozzles in one cone. A flank sacrifices the immediate direct shot to break a line and approach a nozzle from its committed aim's side. A fire-area build can occupy a doorway, but surviving tenders may leave it by the bounded response below; the player can keep the warden in the area, follow a tender, or reserve MP for healing. A non-fire build remains fully viable.

Ignition pays only after all three fixed groups are cleared. It exposes the lens, but does not collect it or report automatically. A last kill, ignition, lens pickup and Orin report are four distinct actions/state transitions.

### Return and navigation

Proposed town entrance `(352,560)` → F `(112,560)`; F normal return → town `(352,544)`. A free optional freight-lift console `(656,560)` becomes usable after cooling, with F portal `(656,496)` and town counterpart `(528,560)` → F arrival `(656,512)`. Town return arrival `(528,576)`. Verify final town selector spacing/LOS against all existing NPCs and portals before freezing these integration coordinates.

The lift is independent of exhaust, ignition, lens, report and cooling mode. The normal entrance remains usable when the lift is skipped. Give its nearby locked portal/console only the existing narrowly scoped paired-selector treatment, never global priority or relaxed reach. The lift console and cooling console are distinct objects with distinct labels. Town guidance names Orin and the actual furnace entrance; regional guidance names apron, work ring, rear aisle and lens gallery with current key labels and screen-direction help.

## 4. Roles and the one necessary combat extension

All proposed values below are **Emberwatch-authored starting values**, before difficulty scaling. Reuse owned art/motion/FX with provenance. The design does not raise the S maximum HP/armor envelope. Different rewards represent authored encounter responsibility, not an excuse to make every foe a larger health bar.

| Kind / count | HP / armor / speed | Attack | XP / G | Readable identity |
|---|---|---|---:|---|
| `furnace_tender` / 6 | 54 / 2 / 82 | Physical cone: range 56, half-angle .65rad, damage 9, windup .80s, recovery .85s | 40 / 5 | Small twin-chevron ground mark, short tool silhouette, forward lean; the only fire-escape role |
| `furnace_nozzle` / 6 | 44 / 0 / 40 | Physical slag line: range 240, width 14, speed 220, travel 360, damage 9, windup 1.20s, recovery 1.25s | 50 / 6 | Long narrow ground notch and visible barrel; locked straight aim |
| `furnace_warden` / 5 | 82 / 10 / 43 | Alternate thrust range112/.30rad/13 damage/1.10s/1.00s and sweep range68/1.30rad/11 damage/.90s/1.20s | 60 / 8 | Broad bracket/ring, heavy tool silhouette; visibly distinct narrow/wide tells |

Slag is physical damage in this bounded implementation, not falsely labeled elemental fire. Warden armor is general physical armor, not a new directional shield. Do not claim retreat AI, area escape, new role artwork, or listening verification from a content entry alone. Non-color ground shapes, posture and attack geometry must identify roles with reduced flashes; labels remain available without covering the hero. The existing reused silhouettes alone failed that quality goal in S.

### Minimal new runtime mechanism: opt-in, bounded fire-area escape

Current `combat.js:updateEnemy` pursues and attacks; it does not kite or leave player fire areas. Merely describing the tender as mobile would leave the R6 F requirement unimplemented. Add one small opt-in response, **only to `furnace_tender`**:

1. Detect overlap with the actual live player `trial_by_fire` sector using its existing range/angle/LOS predicate. Do not infer danger from visual FX, read a future cast, or treat walls as transparent.
2. Accumulate **0.55 active seconds** exposed to that area. Pause/arrival/menu time never counts. An already committed enemy windup/recovery completes; stun retains priority. Do not snap or cancel a locked attack to avoid damage.
3. Once free to move, try up to eight deterministic directions at 64 units. Pick a legal radius-11, swept-clear endpoint outside the sector, without crossing closed/future-stage geometry. Prefer the shortest valid escape; stable directional ordering breaks ties. If none exists, retain ordinary behavior. No teleport, immunity, HP restoration or special speed boost.
4. Move with ordinary `move`, current speed and Shackles slowdown, for at most 64 units or 1.0 active second. No attack during this committed movement. Stun interrupts it normally. This creates a punishable movement decision, not endless automatic kiting.
5. Attempt at most once per tender per actual area instance. A new cast may create a new opportunity; one old area cannot retrigger a loop. Use a battle-local increasing area identity, not elapsed wall time or a reward receipt. Death/travel/load cancel this transient response with the existing canceled offensive effects. Preserve paid hero recovery/resources; no persistent enemy-AI schema is needed.

The 0.55s reaction intentionally permits fire ticks, and slow/blocked tenders can remain in the area. Wardens and nozzles do not gain this escape. A strong initial Judgement may legitimately kill a tender before it reacts; solve whole-pack deletion with cover/spacing and attack opportunity, never forced survival phases or inflated HP. Area identity/timing is combat bookkeeping, unrelated to XP or additional reward authority.

Everything else uses existing capabilities: cone/line tells, locked aim, projectile-wall collision, physical armor, ordinary pathfinding/separation, player charge/stun/guard/heal/hammer/area, monotonic door opening and region receipts. No new resource, environmental damage system, weather effect, directional enemy block or class is necessary.

## 5. Resource and survival expectations from the actual build

- Observed S continuations used the same earned +1 mace/+1 shield build with allocated STR+18/DEX+5/INT+12. At L12 the reported caps were **160 HP/86 MP/86 stamina**, with east ending 98HP/3 potions and west 131HP/2 potions. They did not purchase more skills, allocate banked points, upgrade equipment or rest during S. Do not silently spend their 16 banked SP/20 attributes, refill them, or treat them as a minimum build.
- Actual S play exposed MP shortages: east fell to 26MP and its 30MP heal was rejected; west also exhausted hammer resources. The observed 37.5MP hammer cannot be cast three times from 86MP without regeneration. With the existing allocated INT conversion, base MP regeneration is 4.48/s before any additional equipment/buff bonuses, after the current .5s delay. One 37.5MP hammer plus a 30MP rank-one heal leaves only 18.5MP before regeneration. This makes the choice to reserve healing real; the design must not assume permanent hammer spam.
- Baseline HP regeneration is **zero**. Mace uses no MP/stamina; learned active guard spends baseline 6 stamina only on a successful blocked hit, reduces that hit by 70%, and slows movement. Charge has a paid stamina/CD cost. Existing potion healing is 55% max HP with a 5s potion CD; the F potion arrives at ignition, so it cannot be required to survive earlier encounters.
- **Important existing distinction:** `campaign.js:settleCombat` gives 25% of the new HP/MP/stamina caps once when that living settlement produces a level-up. Objective rewards do not grant that refill. Do not add a new universal refill or label travel/save as healing. From the observed 3,975.5XP start, cooling projects to L13 by objective with no refill; L14 is reached in the last combat group, where the existing kill-level rule applies. Kill ordering and multi-kill settlement must be recorded when comparing resources.
- Lower-power arithmetic comparator, not a played save: unallocated, unequipped, starter-rank L11 has 95HP/60MP/75 stamina, baseline 4MP/s and a 15MP rank-one hammer. This is the minimum-Hard entry level, not the observed strong L12 profile. No specific Adept skill is an access requirement. Free town healer rest and normal return remain recovery options; survival must never require buying a potion or idling for a scripted timer.
- At minimum test Normal and Hard with the earned strong build and a separately earned lower-investment Warrior, plus both mutually exclusive hammer branches in separate legal saves. Report cap/current resources, rank/gear, kill-level healing, potions, rests, deaths and time spent waiting for mana. No claim that the proposed HP/damage is survivable follows from these numbers alone. Adjust position, warning readability, overlap and recovery opportunities first if the low-power run fails; do not patch progression with free XP or gear.

## 6. State, command and persistence contract

Proposed modules: `furnace-content.js`, `furnace.js`, `furnace-presentation.js`, plus one bounded combat helper/flag for the tender response. Proposed exports follow S: `FURNACE_REGIONS/FOES/LINKS/GROUPS/REWARDS`, `FURNACE_COMMANDS`, `reduceFurnace`, `validateFurnaceProgress`, `furnacePortalAllowed`, object/Orin/guidance views. These names are a plan, not existing runtime registration.

- Commands: `acceptFurnaceQuest`, `interactFurnace`, `reportFurnaceQuest`. Common interaction envelope contains authoritative object ID, position, current life, complete current vitals/recovery; only the cooling console accepts an exact `choice: cover|channel` enum. No caller-supplied reward, kind, foe list, arbitrary flag or material amount.
- Entry/acceptance require real Adept training, valid predecessor chain, `r8:s:report`/`signal_reported` and the retained signal cipher. Accept/report require living hero, Orin's actual `blacksmith` NPC in town, original 76-unit reach and LOS. Neither S approach choice affects eligibility. Acceptance pays nothing and keeps all character resources, cooldowns, deaths and previous defeats unchanged.
- Suggested exact flags: `furnace_accepted`, `furnace_cooled`, `furnace_mode` (0 unset/1 cover/2 channel), `furnace_center_open`, `furnace_exhausted`, `furnace_ignited`, `furnace_lens_taken`, `furnace_shortcut_open`, `furnace_reported`. Untouched old saves have no F fields. Acceptance initializes the complete group atomically. `center_open` iff mode2; mode is nonzero iff cooled. Reject unknown F flags/tools/receipts and partial or contradictory sets.
- Cooling requires its exact five permanent defeats. Exhaust requires cooling and its exact six; ignition requires exhaust and all 17. Validate both directions between each fixed receipt and flag, between lens tool/receipt/flag, and between future-stage defeats and their activation prerequisite. No completion from a high level alone. No branch-dependent second cooling receipt.
- Lens pickup requires ignition and free capacity for the one tool; it awards no XP/G. Orin report requires that lens and ignition, not the lift, an additional level or money. A future `forge_restored` compatibility flag, if needed for shop content, must be tied to this same report receipt, not independently awarded. Do not expose an implemented T entrance or Expert training until those handlers actually exist.
- Preserve Orin's existing equipment shop and completed S information. His pending F card and current goal must reflect durable receipts. Completed actions have no reward-bearing button; clue/status rereads remain non-consuming. Distinguish missing lens from missing ignition and wrong NPC from insufficient distance.
- `reduceRuntime → validateState → controller/session commit` is the sole mutation path. Register F in actual world/state/campaign dispatch/portal validation/build inputs, not a source-transform preview. After a committed `furnaceChanged.mapChanged`, rebuild geometry only and invalidate path caches, preserving live foe HP/action/telegraphs and the hero's paid state. Do not call `createBattle` for an ordinary switch.
- Preserve existing expectedRevision/Web Lock and head/slot protocol. Pre-head failure reveals no partial choice/award; uncertain post-head outcome blocks further runtime until a successful load reconciles it. Two tabs cannot choose both modes or report twice. Failure is unchanged state, including resources and stock.
- Death settles all frame kills before the single `floor(gold×.05)` cost, without deleting XP, permanent defeats, mode, objectives, lens or receipts. Last foe + hero death does not auto-ignite, collect lens or report. Dead-save reload presents retry immediately without another fee; explicit retry restores existing town pools/life only.
- **Re-entry policy:** only surviving foes reset HP, positions and statuses when the battle is recreated on travel/load; defeated ones stay absent. Shots, offensive areas, unfinished foe attacks and tender escape are canceled. Hero paid HP/MP/stamina, cooldowns, recovery lock, delays and regen buff retain their existing contract. This is not precise mid-combat restoration. Save/load is not an enemy reset or farming command.
- Read-only legacy loads must not add F defaults or rewrite a save. Preserve namespaces, original project and previous candidates. New active F saves require compatible content; do not promise downgrade compatibility. When Expert becomes real, widen Q/P/S/F predecessor tier guards together with actual runtime support, not merely `furnaceTierAllowed`.

## 7. Why F plus T reach L15 without an XP softlock

The unchanged curve reaches L15 at **5,500 cumulative XP**. The new mixed F groups preserve each stage's base XP, so the prior approved path arithmetic still applies. These are projections using the current production `grantExperience`/`experienceMultiplier`, with synthetic arithmetic starting points; they are not F/T handler runs or browser progression.

| Starting route after S | S cumulative XP | F after Orin | T after Eda report |
|---|---:|---:|---:|
| Minimum Easy/Normal | 3,761 | 5,051 / L14 | 6,191 / L15 |
| Minimum Hard/Serious | 3,229.5 | 4,309.5 / L13 | **5,509.5 / L15** |
| Full earlier Easy/Normal fixture | 3,995.5 | 5,285.5 / L14 | 6,365.5 / L16 |
| Full earlier Hard/Serious fixture | 3,435.125 | 4,515.125 / L13 | 5,715.125 / L15 |
| Observed S east/west Normal start, future projection | 3,975.5 | 5,265.5 / L14 | 6,345.5 / L16 |

For minimum Hard: F = `840×.75 + 450 = 1,080`; T = `960×.75 + 480 = 1,200`. T's last report is 140XP, so immediately before it the player has **5,369.5XP, still L14**. Eda's T report must award the XP and Expert commission at L14. **L15 belongs on subsequent Bran promotion, never on F, T entry, lens, oath pickup or the T report.** The minimum margin is only 9.5XP; no trimming a foe/goal, rounding away fractions or moving XP to an optional path. Normal crosses L15 during T; apply the Adept ×.5 at each subsequent kill rather than adding unscaled T totals.

T still needs its own actual 19-foe/960-base-kill-XP design, lens decode100 → seal110 → escort seal130 → boss/oath → Eda140 chain and tests. F does not implement that content. The lens is nonconsumable and survives death, so T cannot lose its mandatory key.

**Gold is a separate softlock risk:** the earlier proposal reserves the T report's 120G for the 120G Expert fee. That protection is not present now. Implement and test `0≤reservedTrainingGold.expert≤gold` across spending, death, validation/save and actual promotion before claiming no economic softlock after arbitrary optional purchases/deaths. Do not count finite F gold or a future repeat expedition as proof. Neither T report nor its 120G grant requires 120G already held. Protecting the fee does not auto-promote or purchase Expert skills.

## 8. Implementation acceptance gates

### Real reducer/runtime checks, not duplicate test-only rules

1. **Production registration and budget:** statically import actual modules through `getRegion`, `reduceRuntime`, `validateState`, controller/session and combat. Replay the earned predecessor via genuine existing commands, then all F commands/settlements for minimum/full × four difficulties × both cooling modes. Disclose scripted coordinates and kill settlements. Assert 17 unique IDs, 840 base killXP/106G, 450 objectiveXP/150G, exact materials/potion/lens and no automatic tier change. Kill-order variants near L15 must use actual per-kill multipliers.
2. **Geometry/physics:** production `createMap`/`mapFromRegion`, radius-11 paths and swept movement for every object, spawn, portal and foe in each legal stage/mode. Both flanks remain open in both modes. Prove the center baffle blocks hero hammer and enemy shots in cover mode and opens only in channel mode. Check live projectile/charge collision, reachable interaction positions and no line to future foes; tile-center BFS alone is insufficient. Simulate melee pursuit around the ring and exit from each pocket, with no disconnected surviving foe.
3. **Combat response:** real `stepBattle` proves tender reaction delay, legitimate fire ticks before escape, no pre-cast knowledge, normal speed, blocked fallback, slow/stun, one attempt per area, replacement-area identity, committed tell/recovery and hit/damage during escape. Non-tenders and old Q/P/S enemies retain existing behavior. Check step sizes and pause/arrival/blur; no wall crossing, infinite orbit, full-heal reset or duplicated ticks.
4. **Persistence/failure:** actual serialized save/load, controller double click, both-mode two-tab race, repeat kills/goals/lens/report, stale life/region/revision, dead hero, wrong NPC/distance/LOS, forged object/choice/reward/receipt, missing lens, premature foes, future/partial flags, overflow/receipt limit and slot/head failure. Resource snapshots/recovery survive map-only update, menu, save/reload and round trip. Death/retry after each objective and last-foe simultaneous death must preserve committed progress without auto-awards.
5. **UI/input:** execute actual main dispatch and presentation handlers, not assertions that source text contains a string. Cover keyboard/remapped F, pointer/touch button, focus/Tab/Enter/Space/Esc, held-input single actions, repeated opening, goal detail, optional-lift selector pair, commit→immediate Escape title refresh, completed reward wording, correct town destination and existing Orin shop coexistence. Uncertain save must close the runtime gate without letting another interaction through.
6. **Release boundary:** after actual implementation, update brief/spec/eval and provenance, run same-final-source full checks/lint/build/original 167-file integrity and required registry/build workflow. Keep actual output and passed/failed/not-run inventory. Archive source+tests+provenance externally before publication. This document is not a release authorization or a newly passed runtime suite.

### Ordinary-input quality gate

Use isolated, visibly identified profiles with real earned S predecessors or fresh normal progression. Never inject XP, position, objectives, foe HP, items or storage to represent play. Record exact build/branch/profile and all starting resources. Compare both cooling modes in separate profiles; copying a genuine predecessor must use the existing visible no-overwrite QA flow. Include at least Normal and Hard, strong and lower-investment builds, plus both legal hammer branches where earned.

- Finish entry→cooling→exhaust→ignition→explicit lens→normal return→Orin report once with the optional lift skipped. Separately open the lift immediately after cooling, make a paid cast, round-trip/reload, and verify depleted resources/mode without new rewards. Deliberate death and dead-save reload must be clearly separated from natural survival observations.
- Identify each role before contact from ground shape/silhouette/weapon/tell, with reduced flashes and without reading source coordinates. See every newly opened threshold; no repeated spell wasted on a wall mistaken for a path. If source geometry is consulted, label the run assisted rather than unaided.
- Record concrete decisions: which shot line was broken, why a flank or channel was used, whether MP was reserved for healing, what was targeted first, whether fire forced a tender to move and whether that created a useful punish/chase choice. A selected menu option alone is not a tactical decision proven in play.
- The two modes should support observably different exposure/approach without one giving fewer foes, better loot or a necessary skill check. If players merely stand still and delete each whole group, or if both choices feel identical, the tactical gate fails even when every reward matches. First revise cover placement, sightlines, roles and timing; do not pad HP, distance or waiting.
- Verify minimum-kit escape/recovery and low-MP alternatives during real enemy AI. Record accepted damage, potion/rest use, deaths, resource-shortage rejections, active combat/movement/menu/arrival time and mana-wait time. Keep overlap and interruptions explicit; no arbitrary duration target or inherited S timing claim.
- Report only observed visual/input results. Audio needs a real listening pass; mobile needs actual touch play. F completion cannot certify Expert skills, T, repeat expeditions, the whole Warrior campaign or AAA quality.

## 9. Checks performed for this document

- Read current requirements, brief/spec/eval, dated S play reports and current world/geometry, combat, state, signal, progression, Warrior stats/recovery and campaign handlers/tests. No full application test suite, browser play or build was run by this documentation task.
- A small in-memory **production geometry probe** instantiated the proposed rectangles through `mapFromRegion` and checked radius-11 tile-center reachability with `findPathStep`, plus LOS from reachable tile centers to future-stage foe anchors. Entry: 72 reachable tile centers; cooled cover/channel: 182/194; exhausted cover/channel: 262/274. Every currently unlocked foe/goal anchor was reachable; future-group anchors had no tested path or LOS. This does not prove continuous-edge LOS, interaction selection, live projectile behavior, AI pursuit, visuals or fun.
- An isolated arithmetic probe used the existing production XP functions, synthetic starting totals and the stated F/T sequence to reproduce the table above. This is arithmetic validation only, not a new earned progression test. Actual starts stay 20XP below the full Normal fixture; no save was altered to make them equal.
- Required `pnpm sync:registry` was attempted and blocked by the recovered environment's missing `/home/agent/.local/share/pnpm`; this checkout also lacks the referenced root registry script/launcher. No generated output was modified. Final document whitespace/diff checks and its document-only local commit are the only repository validation for this deliverable.
