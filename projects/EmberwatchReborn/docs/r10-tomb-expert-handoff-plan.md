# R10 Signal Tomb → Expert handoff

2026-10-10 UTC. **Design only; no T, Expert, browser play or game-source implementation by this task.** Read baseline `a74f43c` on `codex/emberwatch-rebuild`, alongside the parent's in-progress F integration. This document owns no other file. F's current core is present; its integration work and the older R9 proposal are not T verification.

## 1. Decision and evidence boundary

Build one compact, four-chamber tomb: **lens projection → ordered seal → two-pocket ward relay → pattern-changing boss → explicit oath pickup → Eda report → Bran promotion**. The ward relay carries a protected object with the player; it is a bounded alternative to a fragile allied-NPC escort, not a claim that follower AI exists. Keep the approved 18 ordinary foes + one boss, 960 base kill XP/144G and 480 objective XP/160G. No added XP grant is needed to reach Expert.

- **Preserved cached reference:** level-tier boundaries 5/15/30; Hard/Serious kill XP ×0.75; Adept-enemy XP ×0.5 once the player's level reaches 15; skill costs and known Banner/Onslaught numbers in `reference-core.js` and `reference-warrior.js`. These are the stored 2026-10-08 wiki-cache records, with live 502, unknown original build and no game measurement. This task did not newly verify the website or original game.
- **Preserved official evidence:** the catalog records Patch 2's mutual exclusion of Banner of Protection and Banner of Zeal. Its official provenance remains separate from cached numeric rows; it is not a newly checked current-patch claim.
- **Still unknown in the original:** XP curve, full promotion NPC/quest/fee rules, respec price, encounter geography, Banner radius/refresh, Onslaught payment/damage cadence and cancellation details, and other catalog `null` fields. Unknown does not mean zero, free, unlimited or compatible.
- **Emberwatch-authored:** the existing 5,500XP L15 threshold and recovery/death rules; the approved Q/P/S/F/T reward route and 120G Expert fee; every T coordinate, role, timing, glyph, ward rule and fee-reservation policy below. Future executable mappings belong in an authored balance ledger, never in the preserved reference files.
- **Requirements consulted:** [Warrior checklist](requirements/warrior-completion-checklist.md) G4–G5 and §§3–8; [gap matrix](requirements/warrior-gap-matrix-r6a1.md) §§5–6; [R7/R8 update](requirements/warrior-gap-update-r7-r8.md); [R6 route/economy](r6-adept-route-proposal.md); [R9 tactical plan](r9-furnace-tactical-plan.md) and [F calibration](r9-furnace-balance-calibration.md). Canonical v1.1/Library v2 was previously read according to `requirements-source-status.json`; its local materialization remains recorded as blocked by HTTP 403. No retry or new hash verification occurred here.

Current capability limits matter: generic foes pursue/attack, with cone/line/circle tells and F's opt-in fire escape. There is no allied escort, enemy spell-silence taxonomy, Expert banner/channel runtime or full tiered gear curve. The equipment slice is eight early items and +2 upgrades. This plan must not be presented as 40/53 skills, an earned L15 run, completed itemization, original-game fidelity or AAA-quality acceptance.

## 2. Budget and irreversible progress

All foes remain unique, permanent `adept` foes. Within a group, equal XP values make kill-order variants reward-equivalent; groups cannot be killed out of order. The earlier R6 three-band order is unchanged.

| Group / activation | Proposed full IDs | Base XP / G |
|---|---|---:|
| A, projection vestibule / accepted | `tomb-blade-1/2/3`, `tomb-scribe-1/2/3` | 6 × 40/5 = 240/30 |
| B, inscription chamber / decoded | `tomb-blade-4/5/6`, `tomb-scribe-4/5/6` | 6 × 40/5 = 240/30 |
| C1, lower ward pocket / ward taken | `tomb-vigil-1/2`, `tomb-piercer-1` | 3 × 60/8 = 180/24 |
| C2, upper ward pocket / ward midpoint | `tomb-vigil-3`, `tomb-piercer-2/3` | 3 × 60/8 = 180/24 |
| D, oath chamber / ward sealed | `tomb-oathkeeper` | 120/36 |
| Total | 19 fixed IDs | **960/144** |

| Authoritative receipt | XP / G | Other result |
|---|---:|---|
| `r10:t:accept` | 0/0 | Initialize complete T progress |
| `r10:t:decode` | 100/0 | Read projection, retain clue, open inscription chamber |
| `r10:t:sequence` | 110/10 | Complete the three-symbol prefix and open ward approach |
| `r10:t:ward-take`, `r10:t:ward-midpoint` | 0/0 each | Persist carried ward and relay checkpoint |
| `r10:t:ward` | 130/30 | Seal after all six C foes; iron 4, wood 2, thread 3, ember shard 2, health potion 1 |
| `r10:t:oath` | 0/0 | Explicit, nonconsumable `tomb_oath` pickup after boss defeat |
| `r10:t:shortcut` | 0/0 | Independent free archive stair after decode |
| `r10:t:report` | 140/120 | Eda grants `expert_commission`; reserve this 120G for training |

The four reward-bearing objectives total **480XP/160G**, for **304G** including kills. Boss settlement is the ordinary one-time kill reward; oath pickup adds none. Rereading the projection, wrong glyphs, ward transfer, returning, training and choosing a skill grant no extra XP. No random drop, potion purchase, equipment rank, optional stair or paid material bypass is necessary.

## 3. Compact geometry and distinct encounters

Proposed region `signal_tomb`: **24×24 tiles, 32 units/tile**. Four adjacent chambers share a short clockwise route, with solid separating walls and only authored connectors. This is a 768×768 bounding box, not a promise of exploration duration. Objects/foes below use world coordinates. Low owned masonry, floor apertures and non-color glyph shapes must show what is solid, open and interactable.

Reproducible floor rectangles `(x,y,w,h)`:

- A, southwest: `(2,14,9,2)`, `(2,16,2,2)`, `(6,16,5,2)`, `(2,18,6,2)`, `(10,18,1,2)`, `(2,20,9,2)`. Two small sarcophagi block shots as well as hero movement; no decorative invisible wall.
- B, northwest: `(2,2,9,3)`, `(2,5,3,3)`, `(7,5,4,3)`, `(2,8,9,4)`. One central 2×3 solid inscription plinth leaves a connected perimeter.
- C1, northeast lower pocket: `(13,8,9,4)`; C2, upper pocket: `(13,2,9,5)`; connector `(16,7,3,1)`.
- D, southeast open oath arena: `(13,14,9,8)`. No forced invulnerability cover or maze to delay the boss.
- Connectors: A→B `(5,12,3,2)`, B→C `(11,9,2,3)`, C→D `(16,12,3,2)`.
- Closed overlays: A→B until `tomb_decoded`; B→C until `tomb_sequence_solved`; C1 west strip `(13,8,1,4)` until `tomb_ward_taken`; C1→C2 until `tomb_ward_midpoint`; C→D until `tomb_ward_sealed`. All geometry changes open floor; none closes under an actor.

Physical isolation is mandatory: gated idle foes can currently still receive hits, although premature settlements are rejected. A future-stage foe behind a merely visual seal is therefore a bug. Closed overlays must block walking, swept charge, friendly hammer, hostile shots and LOS to future foe anchors.

### A. Lens projection: expose a clue, separate firing lines

Spawn `(112,656)`; normal town return `(112,688)`; projection `(304,688)`. Blade 1/2/3 anchors `(208,656)`, `(240,560)`, `(336,592)`; scribe 1/2/3 `(304,464)`, `(80,464)`, `(208,464)`.

The two offset sarcophagi keep one frontal cast from aligning every scribe. The player can pull a blade into a side pocket, cross during a locked shot, or spend a hammer on a visible line. Cover must have the same collision for both sides. The three melee foes should not all reach the safe arrival point before the player can read a tell.

After six defeats, interact with the projection using the retained nonconsumable `furnace_lens` and `signal_cipher`. The lens reveals three shape-labelled positions: **crescent → split beam → ember**. Show the complete order in the journal and on a reread, with Korean names and optional numeric ordering; do not require color perception or memorizing a vanished modal. This is a fixed authored decode, not a random password or skill-stat test. The 100XP receipt, decoded clue and open passage commit together; neither source tool is consumed.

### B. Ordered seal: use the information in a small perimeter

Blade 4/5/6 `(112,304)`, `(240,336)`, `(272,176)`; scribe 4/5/6 `(80,112)`, `(304,80)`, `(304,272)`. Crescent plate `(112,240)`, split-beam plate `(304,208)`, ember plate `(208,112)`.

The plinth splits sightlines while the outer path lets the player approach either exposed scribe first. Unlike S's approach selection, the seal has a correct information-backed sequence and does not lock a chosen combat route. Clear B, then interact with the three distinct world plates in projection order. Correct partial input persists across a pause/reload/return. A wrong fresh input resets only the prefix to zero, gives specific feedback and has **no damage, resource, gold, reward or timer penalty**. Stale revision/step, double click or held-key repeat is rejected rather than interpreted as the next wrong input. Completing the sequence pays 110XP/10G once.

Archive stair console `(80,368)` and paired portal `(144,368)` become available after decode independently of B kills and the sequence. This optional return is not a reward prerequisite. Check nearest-target behavior for the explicit pair; avoid broad object priority rules. The main entrance remains available when the stair is skipped.

### C. Ward relay: carry a durable objective through two short pockets

Ward origin `(336,368)` on B's side of the threshold; midpoint socket `(656,272)` in C1; final socket `(528,80)` in C2. C1: vigil 1 `(464,304)`, piercer 1 `(592,272)`, vigil 2 `(656,336)`. C2: vigil 3 `(464,176)`, piercer 2 `(624,112)`, piercer 3 `(656,176)`.

1. After the ordered seal, explicitly take the ward at its origin. It becomes a clearly drawn, non-colliding carried seal using the existing lens. Open C1 and activate its three fixed foes. Carrying imposes no speed, action, MP, stamina or damage penalty.
2. C1's two close-radius pulse foes discourage planting in one spot while its rear piercer creates a locked firing lane. The player can side-step a pulse to reach the piercer or pull a vigil away first. The midpoint can bind only after these exact three defeats.
3. Bind at the midpoint, persist the checkpoint and open C2. The carried visual continues from the midpoint without a separate wait/animation lock. C2 reverses the mix: one pulse foe and two separated piercers, so turning to one attack can expose the other angle. The player should be able to use movement, guard and basic attacks when mana is low.
4. At the final socket, require all C defeats, then finish the relay, pay the single 130XP/30G supply receipt and open D. There is no additional XP at either transfer and no idle defense countdown. Returning through C1 to D is a short connected crossing, not a second required clear.

This is an **escort/ward-seal implementation proposal**, with progression on player/object interactions and no invented escort HP, path-follow AI, resource meter or defend-the-NPC timer. A fragile NPC escort would be separate scope. The ward cannot be sold, consumed or dropped. Death/travel/reload retain the current relay checkpoint and carried status; no unpaid free heal and no enemy revival. If two pockets still play like generic clear-and-click rooms, revise positions/tells/overlap before accepting the design, rather than crediting a carried graphic as tactical depth.

### D. Oathkeeper: readable pattern variation, then a separate pickup

Boss anchor `(560,560)`; oath `(656,560)`; post-boss town return `(656,656)`. After the ward seal, the arena is reachable without a one-way trap; ordinary retreat to town remains possible. Provisional authored boss values: **210HP, armor 8, speed 44**, before difficulty. This is below the old 220HP sluice boss base; do not multiply its HP to force three observed patterns.

| Pattern | Shape / raw physical damage | Windup / recovery | Player-facing decision |
|---|---|---|---|
| Needle oath | Range 132, cone half-angle .22rad / 16 | 1.25s / 1.05s | Sidestep the fixed narrow line, then punish |
| Seal pulse | Radius/range 96, circle / 14 | 1.35s / 1.45s | Leave the clearly traced footprint; re-enter during recovery |
| Broken oath | Line range 250, width 16, speed 200, travel 320 / 12 | 1.20s / 1.10s | Move laterally rather than retreat along its aim |

Above half HP, alternate needle → pulse. On first observing HP at or below 50%, queue the lower-health cycle needle → broken oath → pulse **only after the currently committed windup/recovery ends**. Give a distinct cracked-ring cue when the new cycle becomes active. Never retarget or replace an already drawn tell. This requires a small opt-in phase/pattern selector extension; current `patterns` alone only cycles a fixed list. No random hidden pattern, extra phase HP, summoned reward foes, invulnerability, enrage timer, shortened tell or automatic heal. A strong build may kill it before a full cycle; that is a valid result, not grounds for a forced survival phase.

The baseline shapes already exist, but the phase transition and its presentation are planned. Circles use actual existing LOS/damage semantics; this document does not assert a newly unblockable or elemental attack. The non-color line/cone/ring footprint and pose must remain readable with reduced flashes. Record natural opportunities to see each pattern; separately exercise missed patterns through labelled handler fixtures, never present those as earned play.

Boss defeat pays 120 base XP/36G, and only exposes the oath and post-boss return. The player must still pick up the oath explicitly, return and report to **Eda (`elder`)**, not Orin or Bran. A simultaneous hero/boss death retains the kill but cannot pick up or report while dead. Revisit resumes that exact unfinished pickup.

### Common role envelope and navigation

All values are proposed Emberwatch values before existing difficulty scaling. They do not make any claims about a restored original enemy.

| Kind / count | HP / armor / speed | Attack specification |
|---|---|---|
| `tomb_blade` / 6 | 52 / 2 / 80 | Cone range 64, half-angle .55, damage 9, windup .75s, recovery .80s |
| `tomb_scribe` / 6 | 42 / 0 / 36 | Line range 240, width 12, speed 210, travel 320, damage 8, windup 1.10s, recovery 1.20s |
| `tomb_vigil` / 3 | 74 / 10 / 42 | Circle radius/range 72, damage 11, windup 1.15s, recovery 1.25s |
| `tomb_piercer` / 3 | 46 / 2 / 40 | Line range 240, width 18, speed 200, travel 320, damage 10, windup 1.25s, recovery 1.10s |

All are physical, with normal pursuit/separation. No implicit kiting, directional armor, silence, undead eligibility or F fire escape is attached. Blades need a wedge mark, scribes a narrow slit, vigils a segmented circle, piercers a split shaft, and the boss a large broken ring plus a distinct pose. Reused silhouettes without readable role cues are insufficient.

Proposed town entrance `(624,112)` → T `(112,656)`, normal return → town `(624,144)`; archive stair town counterpart `(464,112)` → T `(144,368)`, stair return → town `(464,144)`; post-boss return → town `(448,208)`. Recheck actual town selector spacing, screen projection and arrival safety at integration. These town points were not browser-tested. Guidance must name the current chamber/object, actual key binding, retained clue and correct report NPC. Completed cards must not leave an active reward button. Do not expose Expert skill buttons as functional before their handlers exist.

## 4. Exact XP, including the L15 crossing

Arithmetic below calls the current production `createCharacter`, `grantExperience` and `experienceMultiplier` with synthetic cumulative starting totals. It does **not** replay T handlers, simulate fighting or alter a save. E=Easy, N=Normal, H=Hard, S=Serious. Each paired column applies identically to each named difficulty, verified in eight separate arithmetic runs. Every kill uses the level **before that kill**, including sequential kills in one settlement. Objective XP has neither multiplier.

| Event | Minimal E/N: grant → cumulative | Full E/N: grant → cumulative | Minimal H/S: grant → cumulative | Full H/S: grant → cumulative |
|---|---:|---:|---:|---:|
| After F report | 5,051 (L14) | 5,285.5 (L14) | 4,309.5 (L13) | 4,515.125 (L13) |
| A1 | 40 → 5,091 | 40 → 5,325.5 | 30 → 4,339.5 | 30 → 4,545.125 |
| A2 | 40 → 5,131 | 40 → 5,365.5 | 30 → 4,369.5 | 30 → 4,575.125 |
| A3 | 40 → 5,171 | 40 → 5,405.5 | 30 → 4,399.5 | 30 → 4,605.125 |
| A4 | 40 → 5,211 | 40 → 5,445.5 | 30 → 4,429.5 | 30 → 4,635.125 |
| A5 | 40 → 5,251 | 40 → 5,485.5 | 30 → 4,459.5 | 30 → 4,665.125 |
| A6 | 40 → 5,291 | 40 → **5,525.5 (L15)** | 30 → 4,489.5 | 30 → 4,695.125 |
| Decode | 100 → 5,391 | 100 → 5,625.5 | 100 → 4,589.5 | 100 → 4,795.125 |
| B1 | 40 → 5,431 | 20 → 5,645.5 | 30 → 4,619.5 | 30 → 4,825.125 |
| B2 | 40 → 5,471 | 20 → 5,665.5 | 30 → 4,649.5 | 30 → 4,855.125 (L14) |
| B3 | 40 → **5,511 (L15)** | 20 → 5,685.5 | 30 → 4,679.5 | 30 → 4,885.125 |
| B4 | 20 → 5,531 | 20 → 5,705.5 | 30 → 4,709.5 | 30 → 4,915.125 |
| B5 | 20 → 5,551 | 20 → 5,725.5 | 30 → 4,739.5 | 30 → 4,945.125 |
| B6 | 20 → 5,571 | 20 → 5,745.5 | 30 → 4,769.5 | 30 → 4,975.125 |
| Ordered seal | 110 → 5,681 | 110 → 5,855.5 | 110 → 4,879.5 (L14) | 110 → 5,085.125 |
| C1 first foe | 30 → 5,711 | 30 → 5,885.5 | 45 → 4,924.5 | 45 → 5,130.125 |
| C1 second | 30 → 5,741 | 30 → 5,915.5 | 45 → 4,969.5 | 45 → 5,175.125 |
| C1 third | 30 → 5,771 | 30 → 5,945.5 | 45 → 5,014.5 | 45 → 5,220.125 |
| C2 first foe | 30 → 5,801 | 30 → 5,975.5 | 45 → 5,059.5 | 45 → 5,265.125 |
| C2 second | 30 → 5,831 | 30 → 6,005.5 | 45 → 5,104.5 | 45 → 5,310.125 |
| C2 third | 30 → 5,861 | 30 → 6,035.5 | 45 → 5,149.5 | 45 → 5,355.125 |
| Ward seal | 130 → 5,991 | 130 → 6,165.5 | 130 → 5,279.5 | 130 → 5,485.125 |
| Boss | 60 → 6,051 | 60 → 6,225.5 (L16) | 90 → **5,369.5 (L14)** | 90 → **5,575.125 (L15)** |
| Explicit oath | 0 → 6,051 | 0 → 6,225.5 | 0 → 5,369.5 | 0 → 5,575.125 |
| Eda report | 140 → **6,191 (L15)** | 140 → **6,365.5 (L16)** | 140 → **5,509.5 (L15)** | 140 → **5,715.125 (L15)** |

Ward pickup, midpoint and optional shortcut add zero and do not change this table. Minimal/full here mean the earlier R6 mandatory/full fixture paths, not spending or enemy difficulty. The recorded S Normal play started 20XP below the full fixture; its projected T result is 6,345.5XP, not 6,365.5XP. Keep that evidence separate.

| Difficulty | Minimal T delta / final | Full T delta / final |
|---|---|---|
| Easy | 1,140 / 6,191 | 1,080 / 6,365.5 |
| Normal | 1,140 / 6,191 | 1,080 / 6,365.5 |
| Hard | 1,200 / 5,509.5 | 1,200 / 5,715.125 |
| Serious | 1,200 / 5,509.5 | 1,200 / 5,715.125 |

**Critical guard:** minimum Hard/Serious is **5,369.5 → 5,509.5** at the 140XP Eda report. Report must accept a living L14 Adept. The margin above L15 is only **9.5XP**; do not round fractions, remove mandatory rewards, move them to an optional path, require L15 for the oath/report, or replace sequential calculation with `960 × multiplier-at-entry`. Easy/Normal's smaller T delta reflects crossing L15 earlier, not an altered difficulty table.

The existing living-kill level-up refills 25% of the new HP/MP/stamina caps once per settlement. Objective level-ups do not refill. Thus the minimum Hard L14 and L15 crossings above grant points/caps but no kill-level refill; full Hard's boss crossing can refill only if alive. Preserve this distinction when judging survival, and do not assume the ward potion covers the preceding fights. Base HP regen remains zero; free town rest, MP regeneration, basic attacks and normal return are available. Earned lower-investment and strong builds require separate Normal/Hard play; these numbers prove no survival result.

## 5. Eda report, protected fee and real Expert training

T acceptance belongs to Eda after actual Adept training, the validated Q/P/S/F chain, `r9:f:report`/`furnace_reported`, retained cipher and lens. Eda's T report requires accepted T, decoded clue, complete seal/ward chain, all 19 defeats, explicit oath receipt/tool, living hero and actual `elder` proximity/LOS in `ash_hamlet`. It requires **neither L15 nor 120G nor a purchased Adept branch**. Apply report XP, 120G income, commission, fee reservation and receipt in one committed transition. It does not train Expert or purchase any skill.

### Planned authored economic safeguard

Adopt the R6 proposal with a strict invariant: `reservedTrainingGold.expert = 120` exactly when T has reported and Expert has not yet been trained, and 0 otherwise. It is included in gold, so `spendableGold = gold - reservedTrainingGold.expert`, with `0 ≤ reserved ≤ gold`. The report's existing 120G funds it; no extra gold/XP grant, debt, random loot, repeat farming or forced sale is needed.

- Purchases, crafting, enhancement, optional repair, consumables and future respec validate the **spendable** balance in their real handlers and previews. Equipment sale adds ordinary spendable income and cannot erase/release the reservation. A reserved amount is not counted twice as another wallet.
- Death loss becomes `floor(spendableGold × .05)` while reserved, after current-frame kills settle. This is an explicit Emberwatch policy change, not the original game's death rule. Repeat death at gold=120 loses 0 and retains the fee. Existing deaths before the report keep current behavior.
- Bran's promotion atomically subtracts 120 from gold, increases `spentGold` by 120, clears the reservation, sets Expert tier and adds its fixed promotion receipt. `earnedGold - spentGold = gold` remains exact. Failures change none of these values. No reserve is freely withdrawn into shopping money before training; the interface shows total, spendable and training-reserved amounts before a purchase.
- Boundary example: arrive at Eda with 0G → report gives total120/spendable0/reserved120 → optional purchase fails unchanged → repeated deaths keep120 → Bran charges120 → total0/reserved0/Expert. At total121/reserved120, a 1G spend succeeds and a 2G spend fails.
- Introduce the schema with T's first supported release, so no pre-policy T report needs a fabricated reimbursement. Untouched older saves default in memory only under an explicit version migration, without writing on load. Partial/forged reservation, wrong commission, duplicate report, reserve after promotion or missing reserve before promotion is invalid. Do not silently reconstruct missing funds.

This is a **planned** safeguard; current `campaign.js` death and `equipment.js` spending use total gold, and no training reserve is implemented. Shipping T report without all spending/death/save guards cannot claim economic-softlock protection. Reversible choices and the free route remain available; no optional decision can consume this fee or a mandatory tool.

### Separate promotion gate

`promoteExpert` must require sequential **Adept → Expert**, level ≥15, valid `expert_commission` and T report/oath chain, 120G with valid reserved allocation, and the real town trainer Bran (`trainer`, currently `(260,325)`) within the existing 76-unit reach and clear LOS. Validate current life, alive HP, legal position, complete paid resources/recovery and expected revision. A high level or standing beside Eda/Orin is not promotion. Use one fixed proposed receipt `r10:promote:expert`; repeated promotion neither charges again nor grants points/healing.

Update ancestor tier guards together: current promotion validation equates the Adept receipt with current Adept tier, and Q/P/S/F likewise require supported tiers. Expert must retain its historical Adept receipt without breaking predecessor validation. Widen them only with real Expert state/skill/recovery support, not by allowing a catalog label. Keep Master rejected until its own implementation.

## 6. First Expert decisions must have a next battlefield

Follow the required **two devices → different boss → beacon → Eda → `chapter_three_complete`** route after training. This is a handoff requirement, not an additional implemented map or an assumed L18 endpoint. Its exact enemy/reward/gear budget is a separate deliverable based on T's actual exit state. Use compact encounters that can also be completed with the existing kit; a particular Expert purchase/branch must not become an access or progression requirement.

| First Expert action | Preserved facts / still-authored boundary | Purpose in the next encounters |
|---|---|---|
| Buy rank-one Battle Banner | Costs 3 SP; 40MP, 15s duration, 30s CD, damage/attack speed +10%. Radius, placement, refresh and who counts as an ally need explicit authored policy. | Device courtyard: hold a useful central pocket while choosing which separated shooter to approach. A banner helps a deliberate local fight but loses value when enemies/telegraphs force repositioning; no stand-still defense timer. |
| Choose Protection **or** Zeal when points permit | Each first augment costs 3 SP. Protection −10% damage taken; Zeal +20% cast speed/−10% mana cost. They share `battle_banner_support`; mutually exclusive in UI, purchase handler and load validation. | Protection favors remaining in the contested pocket and managing shield facing. Zeal favors a planned hammer/heal or Judgement sequence with a real MP budget. Show both next-rank effects and why the other branch locks; compare separate legal saves, never combine them. |
| Buy rank-one Zealous Onslaught | Costs 3 SP; known stamina row9, max4s, CD10s, physical damage row60. Payment/damage cadence, movement/width/cancel rules remain unconfirmed original details. It must use stamina rather than silently substitute mana. | Second-device approach: a short line of separated threats and an open lateral exit. Channel through an exposed line, then release before an off-axis shot/pulse. This competes with guard/charge stamina and with simply moving/basic-attacking; no hallway requiring four seconds of commitment. |
| Later Onslaught augments / other Expert nodes | Lance mixed-damage split/range and exit triggers need authored mapping; Shield has known +25% stamina cost. Return hammer, cleanse/undead damage and Lawbringer need real flight/status/target semantics, not UI labels. | The later boss must offer a flank/recovery punish for controlled channel release. Future undead/status encounters may exercise those other skills only once the corresponding enemy tags and effects actually exist. Do not invent silence utility against today's undifferentiated physical shots. |

An explicit Onslaught payment candidate for implementation review is one row-cost at start plus one at active seconds1/2/3, with no endpoint payment at4: a full channel costs **36/44/52/60 stamina** before modifiers; Shield makes **45/55/65/75**, before the existing discount policy. These totals are an **authored candidate**, not a decoded original rule or live balance. Freeze damage cadence, movement, cost ordering and interruption/Lance eligibility before code; do not assume the 60 damage row is per frame or grant a free full channel. An early release pays only committed costs; menu/blur/pause must stop active simulation, and death/travel/load must not leave a damaging channel or duplicate its end hit.

Promotion grants no extra SP. L15 itself grants 5 SP; a player with no earlier banked points can buy one 3-SP core skill, but **cannot immediately buy both cores (6 SP) or a core plus its 3-SP Banner branch (6 SP)**. Do not hide this with bonus points or a forced purchase. Preserve earned banked points; preview options at Bran and make the first battlefield viable even if the player spent them elsewhere. Later naturally earned points support the other choice. Current respec is incomplete, so do not advertise a reversible branch until a real, clearly priced respec handler exists; compare branches in separate legal profiles meanwhile.

Expert completion still means all **15 Expert nodes / 40 of 53 total nodes** have real rank, cost, combat, branch and persistence handling, followed by observed use. Banner/Onslaught alone are a useful first vertical slice, not G5 completion. The next field must add deliberate item/affix/crafting choices and stable acquisition paths in its own budget; continuing forever with common/+2 gear does not satisfy the checklist. No gear roll or purchase may substitute for the protected fee or required XP path.

## 7. State, failure and verification gates

Proposed T modules follow F's separation: content, reducer/validator and presentation; `acceptTombQuest`, `interactTomb`, `reportTombQuest`, plus separate Expert promotion. Names here are planning contracts, not registrations. Suggested `tomb_` fields: `accepted`, `decoded`, `sequence_step` (0–3), `sequence_solved`, `ward_taken`, `ward_midpoint`, `ward_sealed`, `oath_taken`, `shortcut_open`, `reported`. Carry state is derived: taken and not sealed. The midpoint retains its receipt; it does not spend the lens or reset defeats. Complete default flags and only the acceptance receipt appear atomically at acceptance; later receipts require their actual actions. Untouched legacy saves have none.

- Validate both directions for fixed receipt/flag/tool relationships; prefix3 iff solved; midpoint requires taken+C1 defeats; sealed requires midpoint+all C defeats; boss defeat requires sealed; oath requires boss; report requires oath/commission and the correct pre-/post-promotion reservation. Reject unknown T IDs, premature future kills, partial sets, capacity/receipt overflow and caller-supplied reward, enemy list or arbitrary flag. Intermediate correct glyph steps are durable state but give no reward receipt.
- All actions use authoritative object IDs, current region/life, living resources, original reach/LOS, recovery and expected revision. Only plate interactions accept a bounded glyph identity/expected step. Wrong glyphs are valid puzzle feedback; forged/stale commands are unchanged failures. Report and promotion require different actual NPCs.
- Use `reduceRuntime → validateState → controller/session commit` and current slot/head/Web Lock boundaries. Map changes rebuild collision/path caches without calling `createBattle` or refilling resources, resetting live foe HP/telegraphs or losing paid cooldowns. A head-before-failure is not an excuse to expose half a reward; an uncertain post-head result blocks further actions until a successful load reconciles it.
- Death retains permanent kills, decoded clue, partial prefix, ward checkpoint, tools and paid receipts. Last-foe/hero simultaneous death settles kills once, charges death once and never auto-interacts. Dead-save load offers retry with no second fee. Surviving enemies reconstruct HP/position/status on travel/load under current policy; call this re-entry, not precise mid-combat restoration. Boss phase reconstruction must agree with reconstructed HP, with no replayed reward or stale projectile.

### Required implementation acceptance, still not performed

1. Replay earned minimal/full predecessor command paths on **all four difficulties**, both F cooling modes and optional T stair skipped/opened. Assert every actual per-kill XP, all four objective deltas, 304G, supplies, no automatic promotion, and specifically minimum Hard report at L14. Reorder same-band kills and batch kills across L15. Scripted settlement/position fixtures must remain labelled as such.
2. Test real world geometry and live swept motion/projectiles: every stage, radius11 movement, no future path/LOS/attack leakage, every interactable approach, safe arrivals, circle/cone escape space, pursuit around plinths and no stranded living foe. Center-point BFS is insufficient acceptance. Test phase changes during tells/recovery, stun/slow, simultaneous threshold hit/kill, and re-entry. Never inherit prior suite counts.
3. Execute actual gold mutation/preview handlers with exact/below/excess balances, optional spend and sale, every supported economy command, report/kill+death ordering, zero-spendable deaths, duplicate actions, two-tab report/promotion races, save faults, and corrupt reserve/receipt states. Include gold119 without valid reservation, gold120 with valid reservation, and a level14 commission holder at Bran. Failed promotion must leave resources, gold, points and tier unchanged.
4. Exercise UI via normal/remapped keyboard, pointer and touch where supported: clue reread, wrong prefix, partial-prefix reload, held interaction, ward midpoint return/death, explicit oath, correct Eda card, correct Bran preview, menu/Tab/Enter/Space/Escape, immediate post-commit reopen and uncertain-save input blocking. Inspect ground openings/roles/patterns on the actual screen; source coordinates are not visual evidence.
5. Earned Normal and Hard, strong and lower-investment builds, and separate legal hammer/Banner branches: record starting/current caps, allocations, skills, gear, potions/rests/deaths, active combat/movement/menu/arrival time, mana-wait time and each concrete positioning/resource decision. Use untouched earned predecessor copies through the visible QA flow. No XP/HP/position/item/storage injection represents ordinary play. If generic clumping or whole-pack deletion makes roles irrelevant, first revise geometry/tells/overlap; do not pad HP, walking, timers or obligatory consumables.
6. Before release, the integration owner updates brief/spec/eval, runs final-source checks/lint/build/original167-file integrity and registry workflow, preserves source+tests+provenance externally, and separately verifies the published candidate through ordinary input. T+L15 does not certify Expert effects, the next battlefield, Master, total duration, audio, mobile or campaign completion.

## 8. Checks actually performed for this document

- Read the requirements/proposals/source status above and current F content/core, progression, promotion, combat/settlement, geometry, equipment spending and reference catalog. No application source, browser, save, remote or generated output was changed by this task.
- **Arithmetic probe:** production XP functions, synthetic initial totals, 19 sequential proposed kill grants and four objective grants across minimal/full × Easy/Normal/Hard/Serious. All eight reproduced the per-kill/final values above. This is arithmetic validation only, not T handler or earned-progression evidence.
- **Geometry probe:** proposed rectangles through production `mapFromRegion`, radius11 `inMap`/`findPathStep`, and LOS from reachable tile centers to future foe anchors. Reachable centers by entry/decoded/sealed/ward-taken/midpoint/ward-sealed: **64 / 154 / 160 / 196 / 244 / 322**. Every listed currently available foe/object anchor had a path; all tested future foe anchors had no path or LOS. This does not verify continuous-edge leakage, live combat, interaction selection, town coordinates, rendering, sound, controls or fun.
- A separate read-only check parsed all 24 grant/cumulative rows in this document and matched them against production XP arithmetic for all eight path/difficulty combinations; the 960/144 and 480/160 budgets matched independently. Required `pnpm sync:registry` was attempted and blocked by the recovered environment's missing `/home/agent/.local/share/pnpm`; no registry output was generated. No installation workaround or heavy build was attempted.
- Document whitespace/diff review and a scoped local document commit are the repository checks for this design. No full suite, build, publication, external checkpoint backup or Git remote write is claimed. The parent's current F validation remains separate.
