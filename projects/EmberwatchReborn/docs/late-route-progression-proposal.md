# Late-route progression and economy proposal

2026-10-10 UTC · **DESIGN ONLY / NOT IMPLEMENTED OR GAMEPLAY-ACCEPTED**
Base: `5192eeca1884cd28b46e3db486b334faec2b27a7`. Scope: five post-B regions,
Master handoff and a separate post-Master finale contract. No runtime, UI,
build, deployment, source recovery or save changes are included.

**Recommendation:** keep the 65-foe calculation below as a minimum functional
envelope only. Compare/reallocate toward the 105-foe combat-weighted schedule
before implementation, then validate W's decisions in actual play. Neither is
an accepted density target: current B already has 13 foes and is too shallow
in the invested native build. Repeating that sparse envelope five times is
not a defensible depth decision merely because the XP sum passes.

## Authority and starting point

- Read: project/root instructions; `brief.md`, `spec.md`, `eval.md`;
  [canonical trace §§1–2,5–9](requirements/warrior-completion-checklist.md),
  [R11 gap ledger](requirements/warrior-gap-update-r11.md),
  [B reward contract](r11-battlefield-runtime-integration.md), and the current
  progression, campaign settlement, promotion, wallet, equipment, slots and save code.
- Canonical plan remains v1.1 / Library version 2. Its exact original file
  materialization is **blocked HTTP 403; local hash not compared**, as recorded
  in `requirements/requirements-source-status.json`. No fresh source confirmation
  or alternate transfer occurred. Cached tier boundaries are not current measurements.
- L30 is the cached Master boundary. Sequential Bran training, `master_commission`,
  300G and this route are authored project requirements. All new region/foe/item
  names, layouts, patterns, XP, gold, supply and recipe numbers below are **new
  Emberwatch proposals**, not recovered content or original-game values.
- Observed Normal B endpoint: L18 / **8,565.5 cumulative XP / 1,537G**, with 22
  or 32 unspent SP on different legally purchased builds. Keep those histories
  separate; never refill spent points from the level total. Automatic B envelopes
  are Easy/Normal **8,411–8,585.5** and Hard/Serious **7,399.5–7,605.125 XP**.
  Those automatic routes are not native play. The calculator uses these numbers
  as synthetic arithmetic inputs; it does not load, create or relabel a native save.

## Required route and reporter ownership

`B chapter-three report → W wilderness/signal → R repair facility → A archive
→ F late foundry → S oath spire → Bran commission → L30 / 300G Master training
→ Eda's separate final-battlefield quest → final beacon → Eda final report`.

| ID / working name | Acceptance and report | Required handoff and distinct activity |
|---|---|---|
| W / 갈라진 신호 황야 | Eda (`elder`) accepts after B; Eda reports | Survey signal damage; obtain free reusable hook; interpret a visible clue; redirect a signal across cover; recover evidence. Eda refers to Orin. |
| R / 물길 수리소 | Orin (`blacksmith`) accepts after W; Orin reports | Hook/pick repairs or an explicit material alternative; choose water route/cover; recover the new repair lens. Orin refers to the archive scribe. |
| A / 잿빛 기록 보관소 | New scribe Mira (`archive_scribe`, authored identity) accepts after R; Mira reports | W clue + R lens; persistent ordered seal; living/undead threats; archive guardian; separately recover records. Mira refers to Orin. |
| F / 꺼진 별 주조소 | Orin accepts after A; Orin reports | Independently disable pressure and heat devices; combined-role group; foreman boss; separately recover the forge core. Orin refers to Bran. |
| S / 두 서약의 첨탑 | Bran (`trainer`) accepts after F; **Bran reports** | Two free permanent-tool jobs, different enemy roles, oath guardian, separately recover oath. Bran's report issues the commission and reserves its 300G. |

Each acceptance is 0XP/0G. Next acceptance requires its predecessor's valid
report receipt, retained required tool/relic and real Expert training history.
Master training is a separate Bran action after the S report, never the report
itself. Eda does not issue the Master commission; Bran does not close the campaign.
All reporters require the real NPC, alive/current life, reachable position/LOS
and current revision. A commission can be reported below L30 in a valid boundary
case; training remains level-gated. No new purchase or particular combat skill
is a main-route gate. Becoming L30 early never skips remaining route history.

## Minimum functional envelope: exact mandatory award schedule

Every region has **three required groups of four foes plus one boss**. All
65 foes are authored **Expert** reward tier, including bosses. No respawns,
random drop rolls or optional foes are required by this XP guarantee.

The order is always: group A → O1 → O2 → group B → O3 → group C → O4 → boss
→ O5 explicit relic → optional annex, if chosen → O6 actual NPC report.
Different device/approach choices may reorder work inside a stage but cannot
skip or double-count its clear/award. Award each kill sequentially at the
character's then-current level; do not batch the group's XP at its entry level.
For a choice that changes the next encounter, select/commit the configuration
**before** that encounter for zero XP; its listed O reward is the separate
completion after the required clear. Never offer a combat-route choice only
after its affected enemies are dead.

| Region | Each ordinary foe XP/G ×12 | Boss XP/G | Base kill XP | O1–O6 XP, respectively | Objective XP | Total G |
|---|---|---|---:|---|---:|---:|
| W | 110 / 10 | 280 / 40 | 1,600 | 200,250,300,300,150,200 | 1,400 | 360 |
| R | 120 / 11 | 300 / 45 | 1,740 | 250,300,350,300,150,200 | 1,550 | 400 |
| A | 130 / 12 | 320 / 50 | 1,880 | 250,350,400,350,200,200 | 1,750 | 450 |
| F | 140 / 13 | 340 / 60 | 2,020 | 300,400,400,350,200,200 | 1,850 | 500 |
| S | 150 / 14 | 360 / 70 | 2,160 | 350,400,450,350,200,200 | 1,950 | 700 |
| Total | 60 ordinary +5 bosses | | **9,400** | 30 distinct objectives | **8,500** | **2,410** |

| Region | O1 | O2 | O3 | O4 | O5 | O6 | Objective gold O1–O6 |
|---|---|---|---|---|---|---|---|
| W | Read damaged survey tablet | Retrieve hook and anchor a return bridge | Calibrate clue receiver | Route signal through chosen approach | Take signal evidence | Eda report | 30,20,35,35,20,60 |
| R | Inspect hydraulic diagram | Complete paired repairs | Set water-path choice | Lock aligned lens cradle | Take repair lens | Orin report | 25,30,35,40,23,70 |
| A | Project earlier clue through lens | Decode retained sequence | Complete ordered seal | Open guarded record vault | Take archive records | Mira report | 30,35,45,45,26,75 |
| F | Diagnose both hazards | Disable pressure feed | Disable heat feed | Isolate core chamber | Take forge core | Orin report | 35,40,50,50,29,80 |
| S | Hook the first oath anchor | Pick open the second anchor | Align three oath witnesses | Open summit seal | Take spire oath | Bran commission report | 25,30,40,40,27,**300** |

Objective XP is fixed once-only XP, as in current region reducers. It has no
difficulty/low-tier multiplier. Kill XP retains `experienceMultiplier`: 1 on
Easy/Normal and .75 on Hard/Serious before L30; these Expert foes become .5
and .375 respectively at L30, even before actual Master training. Gold/materials
do not change by difficulty. Preserve `xpForLevel`, all reference values and
millionth-XP precision. Each O6 grants **200XP**, not the region's entire XP.
Acceptance, shortcuts after their paid first construction, travel and rereading
clues grant nothing. Each award needs a fixed unique receipt and atomic save.

### Supplies, optional branches and material alternatives

Material tuple order is **iron / wood / thread / ember_shard**. Mandatory
supplies are independent of a purchase, damage taken or optional branch.

| Region | Mandatory material tuple | O1 / O2 / O3 / O4 / O5 material tuples | Potions |
|---|---|---|---|
| W | 6/4/4/2 | 0/2/2/0; 2/0/0/0; 2/0/0/1; 0/0/2/1; 2/2/0/0 | 1 at O3, 1 at O5 |
| R | 8/2/2/3 | 2/2/0/0; 2/0/2/0; 2/0/0/1; 0/0/0/2; 2/0/0/0 | 1 at O3, 1 at O5 |
| A | 4/2/6/4 | 0/2/2/0; 0/0/2/1; 2/0/0/1; 0/0/2/1; 2/0/0/1 | 1 at O3, 1 at O5 |
| F | 10/2/2/5 | 2/2/0/0; 2/0/2/0; 2/0/0/2; 2/0/0/2; 2/0/0/1 | 1 at O3, 1 at O5 |
| S | 6/4/4/6 | 0/2/2/0; 2/0/0/2; 2/0/0/2; 0/2/2/1; 2/0/0/1 | 1 at O3, 1 at O5 |

Mandatory total: **34 iron, 14 wood, 18 thread, 20 ember_shards, 10 potions**.
O6 supplies no materials/potions. R's paired repair has a **free hook + existing
`quarry_pick` route**, or consumes exactly **2 iron +2 wood**, with identical
mandatory kills/XP and one shared repair receipt. Neither tool is consumed.
Water-path choice is free. S requires both actual tool jobs, not buying material
access. Zero entering inventory cannot block progress. Re-entry never reissues
hook, supplies, potions, material salvage or XP.

| Optional annex (opens after O5) | Optional Expert foes at that region's ordinary rate | Single objective XP/G | Material tuple / potions | Total optional G |
|---|---:|---|---|---:|
| W signal-guided stranded scouts | 4 | 200 /60 | 0/2/2/0 /1 | 100 |
| R dry conduit salvage | 2 | 220 /65 | 2/0/0/1 /1 | 87 |
| A lens-marked side archive/revisit | 3 | 240 /70 | 0/0/2/1 /1 | 106 |
| F slag annex | 4 | 260 /75 | 3/0/0/2 /1 | 127 |
| S pilgrim side stair | 2 | 280 /80 | 0/1/2/1 /1 | 108 |

All optional total: **15 kills, 1,930 base kill XP, 1,200 objective XP, 528G,
5/3/6/5 materials and 5 potions**. Main-route gates never check these receipts.
An annex remains claimable once after reporting/returning; the calculation
places it before that region's report, so later-postponed order needs its own
implementation regression. Wrong puzzle inputs reset only their uncompleted
prefix, without paid-resource loss, reward reset or a timer. Night/time-limited
quests are still an independent unmet requirement, not implicitly supplied here.

## Combat-weighted comparison before implementation

This alternative replaces the minimum schedule, rather than adding another
reward layer. Each region has **five distinct groups of 3/4/5/4/4 foes plus
one boss**. Keep the same ordinary/boss XP rates, boss gold, materials/potions,
O1–O6 meanings, objective gold, optional counts and receipts; replace ordinary
kill gold and objective XP as below. Order: A3 → O1 → B4 → O2 → C5 → O3 → D4
→ O4 → E4 → boss → O5 → optional annex → O6. Old/alternative schedules must
not both be awarded, and only one is to become a future authored content table.

| Region | Base kill XP (20 ordinary +boss) | Replacement O1–O6 XP | Objective total | Each ordinary kill G | Region total G |
|---|---:|---|---:|---:|---:|
| W | 2,480 | 100,150,150,150,100,150 | 800 | 6 | 360 |
| R | 2,700 | 100,150,175,175,100,150 | 850 | 7 | 408 |
| A | 2,920 | 150,150,200,200,100,150 | 950 | 7 | 446 |
| F | 3,140 | 150,200,225,225,100,150 | 1,050 | 8 | 504 |
| S | 3,360 | 200,200,250,250,100,150 | 1,150 | 8 | 692 |
| Total | **14,600** | | **4,800** | | **2,410** |

The Hard minimum route shifts from **54.7% objective XP** to **30.7%** after
actual scaling. More combat is not itself better: each added group has a
different decision and stays below a single undifferentiated mob pack. W's five
groups are specified next; the other comparison groups are:

| Region | A: 3 foes | B: 4 foes | C: 5 foes | D: 4 foes | E: 4 foes |
|---|---|---|---|---|---|
| R | Two guards +poison caster: use a pillar to break the ranged lane before reaching diagram | Two shielders +two flankers: split pressure while doing hook/pick repairs | Three advance blockers +two casters: the water choice changes safe crossing and Banner placement | Two casters +two lancers: interrupt from a side path or risk a short channel across the lens lane | Two undead +silence caster +bulwark: spend cleansing/control now or preserve MP for the keeper |
| A | Two living guards +undead scribe: learn the tags before using healing offensively | Two separated scribes +two lancers: resolve crossfire before the decode panel | Three undead guards +two living casters: AoE/control and target type compete at the seal | Two bulwarks +two casters: choose a flank instead of firing down a blocked vault corridor | Two flankers +two ranged scribes: face/cover matters while approaching the boss, with no compulsory hit |
| F | Two melee +one fire caster: move out of the diagnosed hazard lane | Two bulwarks +two poison casters: pressure device has a safe flank but split ranged priority | Three melee +two fire casters: heat-device cover changes whether one sustained channel is safe | Two lancers +one binder +one hexer: deal with silence or poison first at the isolated core | Two casters +two blockers: approach the foreman with a resource/target-order choice, rather than another identical open pack |
| S | Two lancers +one caster: anchor approach needs lateral positioning | Two bulwarks +two undead: second-tool approach rewards a different damage/control choice | Three living blockers +two undead casters: switch from frontal clearing to witness-side angles | Two binders +two flankers: eliminate silence or retain defense while circling summit cover | Two undead +fire caster +lancer: choose burst now or carry resources into the oath guardian |

These are **new authored encounter intents**, not implemented patterns or
proof that the resulting rooms produce those choices. Each needs open retreat,
actual readable LOS/cover, non-overlapping warning clarity and useful recovery.
Do not make them mandatory repeated rooms, timed wave locks or HP increases.
An encounter that plays identically to its neighbor should be redesigned or
removed with its earned XP redistributed across remaining meaningful actions.

| All optional skipped, starting envelope | W cumulative /level | R | A | F | S / Bran |
|---|---|---|---|---|---|
| Easy/Normal minimum | 11,691 /21 | 15,241 /24 | 19,111 /27 | 23,131 /30 | **25,961 /31** |
| Easy/Normal full | 11,865.5 /22 | 15,415.5 /25 | 19,285.5 /27 | 23,165.5 /30 | **25,995.5 /32** |
| Hard/Serious minimum | 10,059.5 /20 | 12,934.5 /22 | 16,074.5 /25 | 19,479.5 /27 | **23,014.5 /30** |
| Hard/Serious full | 10,265.125 /20 | 13,140.125 /23 | 16,280.125 /25 | 19,685.125 /28 | **23,107.625 /30** |
| Observed Normal endpoint as arithmetic input | 11,845.5 /22 | 15,395.5 /24 | 19,265.5 /27 | 23,215.5 /30 | **26,045.5 /32** |

Lowest Hard crosses L30 on S's last ordinary foe at **22,629.5**, so the boss
correctly pays **135XP**, not 270. Its final margin is **414.5XP**. Earlier L30
can halve one more kill, so endpoint XP is not strictly monotonic with starting
XP. The calculator checks L30 transition breakpoints across both starting
intervals, not just their endpoints: all-skipped alternative minima are
**25,920 Easy/Normal** and **23,014.5 Hard/Serious**. No report leaps two levels.
This exposes a real preserved scaling property, not a reason to remove it.

All optional alternative branch gold is **84/79/91/107/96 =457G** under the
new ordinary-kill rates; other optional rewards stay the same. Supplies remain
34/14/18/20 +10 potions. The same 700G-purchase/ten-death schedule from zero gold
leaves **1,001G** after Master300; from 1,537 leaves **1,921G**. This redistribution
adds no total mandatory gold. Increased encounter exposure may need different
supply placement after play; ten supplied potions do not establish survivability.

## First bounded target: W's complete loop under the comparison schedule

1. Eda's completed-B dialogue explicitly sends the player to W's safe entrance.
   The initial town return is usable immediately. Preserve earlier maps and saves.
2. A three-foe survey encounter mixes two advancing weapon users and one ranged
   poison caster. Offset sightlines allow either a safe
   Banner pocket or flanking the caster; do not line all three up for a mandatory
   single Hammer solution. Killing them unlocks the readable survey tablet O1.
3. Group B's one bulwark, two separated ranged foes and one flanker guard the
   anchor. Prioritize the exposed shooters or hold a defensive corner while
   separating the bulwark. O2 retrieves a **free new reusable signal hook** and
   uses it on the nearby anchor. Opening the short return bridge is its own
   visible tool operation; after its guards it needs no extra fight, payment,
   puzzle completion or boss defeat.
   The later hook gates depend on this retained tool, not a new collectible tier.
4. Group C uses a living silence caster, two undead melee, one undead
   caster and one lancer. Interrupt silence, exploit undead healing or spend
   a line attack while retaining escape space. O3 combines the durable tablet
   clue with receiver orientation.
   The clue remains in the journal. Wrong order gives an explanatory reset.
5. Before group D, choose a cover-preserving flank or straight exposed channel
   lane for zero reward. Group D separates a fire caster from two lancers and
   one shielder; clear then operate the receiver to complete O4.
   Both retain all four required foes and equal rewards; choosing cover cannot
   close the only retreat. Geometry changes must agree with collision/LOS.
6. Group E's two flankers, undead caster and bulwark test changing facing and
   avoiding a surrounded channel, with the boss visible beyond open retreat.
   The signal keeper uses a locked-direction line attack and a close sweep with
   readable recovery. Off-axis repositioning, shielding and interrupt/control
   opportunities differ from standing still and trading HP. Exact HP, damage,
   geometry, animation and timings remain implementation/ordinary-play work;
   this proposal does not prescribe an invulnerability timer or HP inflation.
7. Defeat opens O5's evidence interaction and a direct return beside Eda. The
   relic is never auto-looted by a kill. Optional scout rescue opens now, has its
   own reportable reward, and can be skipped without losing the main report.
8. Eda reports, names Orin as the next contact, and points to an optional Orin
   crafting choice using W's just-earned supplies. Then Orin accepts R. Neither
   reporting nor buying silently heals, equips, allocates SP or learns a rank.

Proposed first Expert equipment choice: one of two ordinary single-accessory
recipes, **120G +3 iron +2 thread +1 ember_shard each**, available after W report
at Orin's workshop with existing `smith_tools`. Both require Warrior and the
existing base 18/12/10 permanent attributes; no temporary buff qualifies.
`signal_ward_token` offers armor +4 / stamina regeneration +1 per second;
`signal_focus_token` offers spellPower +.08 / mana regeneration +.6 per second.
These are new authored items using existing stat categories, not reference
items. Only one accessory equips at a time; an instance cannot be claimed twice.
These numbers are a concrete comparison candidate, not a validated balance
result or substitute for the still-required uniques, affixes and later gear.
Keep the free route viable with neither recipe. Exact spellPower action coverage
must match current runtime previews; never advertise universal +8% spell damage.

This closes an intended investigate → tool → tactical choice → relic → correct
NPC → optional craft → next quest loop. Its usefulness, density, visibility and
boss survival remain **unaccepted until normal-input testing**.

## Sequential calculation and economy allowance

Run from repository root:
`node projects/EmberwatchReborn/docs/late-route-budget-proposal.mjs`.
The read-only calculator calls production `grantExperience`, `xpForLevel` and
`experienceMultiplier` for every proposed award. It does **not** call new campaign
reward handlers: those handlers/foes do not exist. Starting cumulative XP is
seeded for arithmetic only. Gold/death after the future Master reserve is an
explicit projection because current `trainingGoldBalances` accepts only `expert`.
Before that reserve the calculator uses the actual wallet helper. No save is written.

For the **minimum functional envelope**, all optional branches skipped,
cumulative XP / reached level after each report:

| Input envelope | W | R | A | F | S / Bran |
|---|---|---|---|---|---|
| Easy/Normal minimum 8,411 | 11,411 /21 | 14,701 /24 | 18,331 /27 | 22,201 /29 | **25,456 /31** |
| Easy/Normal full 8,585.5 | 11,585.5 /21 | 14,875.5 /24 | 18,505.5 /27 | 22,375.5 /29 | **25,555.5 /31** |
| Hard/Serious minimum 7,399.5 | 9,999.5 /20 | 12,854.5 /22 | 16,014.5 /25 | 19,379.5 /27 | **22,949.5 /30** |
| Hard/Serious full 7,605.125 | 10,205.125 /20 | 13,060.125 /23 | 16,220.125 /25 | 19,585.125 /28 | **23,155.125 /30** |
| Observed Normal endpoint used only as input, 8,565.5 | 11,565.5 /21 | 14,855.5 /24 | 18,485.5 /27 | 22,355.5 /29 | **25,535.5 /31** |

Lowest Hard/Serious late deltas are **2,600 +2,855 +3,160 +3,365 +3,570 =15,550**.
The S boss settles at 22,549.5 (L29); explicit O5 oath pickup adds 200 to reach
**22,749.5 (L30)**; Bran's 200XP report ends at **22,949.5**, a 349.5XP margin
over the unchanged **22,600** threshold. No report provides multiple levels.
Across nine inputs and all 32 optional subsets, **288 arithmetic cases** reach
L30 and every individual new grant advances at most one level. All-optional
endpoints range from **24,899.5–25,105.125 (Hard/Serious L31)** and
**27,691–27,795.5 (Easy/Normal L32)**. The observed-input all-optional projection
is 27,775.5. Normal's lower-tier penalty is included; adding all base kill XP
without reevaluating L30 would overstate it. No staged report is a level top-up.

The minimum-envelope native-input projection adds 67 earned SP:
**22→89 or 32→99** if no further points
are spent, preserving each build's earlier ledger. These are projections, not
actual saved inventories. Reaching L30 itself grants only the reference 6SP;
promotion adds none. Master base ranks, augments and exclusivity still cost their
catalog SP; no all-node grant is part of this economy.

Gold includes the S report's **300 exactly once**: mandatory earned 2,410,
of which 300 becomes protected, so 2,110 is ordinary new spending capacity
before purchases/death. Reservation reclassifies wallet money; it never adds a
second 300. Planned per-region discretionary spending allowances are
**120/120/160/180/120G =700G**. Only W's 120G recipe is specified above; later
allowances are affordability envelopes, not invented implemented stock/sinks.

Stress projection: no optional income, no sales, zero entering gold/materials,
two deaths after each regional report, then that region's allowance purchase.
The five resulting wallet/spendable balances are **205/205, 427/427, 633/633,
844/844, 1,303/1,003**. Ten 5%-of-spendable death charges total **407G**;
700G purchases and Master300 leave **1,003G**. The same schedule from observed
1,537G leaves **1,923G** (larger wallet incurs 1,024G death losses).
This is one explicit allowance scenario, not evidence of ten deaths survived
or a bound for unlimited purchases/deaths. Free rest and non-consumable tool
routes prevent an economic softlock; potion sufficiency is untested. A player
who spends every ordinary coin can still earn the protected 300 at the S report.

Material allowance: even buying the W recipe, choosing R's material repair,
and reserving an additional **20/8/10/12** for later optional crafting leaves
**9/4/6/7** from mandatory supply. Later crafting allowance is not a shipped
recipe list. No main objective consumes that optional crafting allocation.

## Master safety and backward compatibility requirements

These are future implementation gates, not capabilities enabled by this commit.

1. **Historical tiers:** Master must retain true Adept + Expert + Master
   receipts, all predecessor reports/tools, legal ranks, purchased-SP ledger,
   equipment ownership and current pools. Do not change `tier === 'expert'`
   checks blindly: distinguish “at least Expert history” from “currently eligible
   to promote from Expert.” Audit `promotion`, `quarry`, `pass`, `signal`,
   `furnace`, `tomb`, `battlefield`, growth, guidance and action-slot guards.
   For example, today's Tomb validator equates Expert receipt with exact Expert
   tier and exact `{expert}` wallet shape; today's B eligibility also excludes
   Master. A valid Master must be able to revisit them without losing history.
2. **One atomic commission:** S O6 grants its fixed chosen-schedule XP (200 in
   the minimum envelope, 150 in the comparison) and 300G, records earned
   gold once, retains oath, records report + `master_commission` + receipt, and
   sets the Master reservation to 300 in the same durable transition. S O5 is
   separate. Repeat/wrong NPC/stale revision/death/save failure cannot grant,
   reserve, report or partially mint anything. Reserve must equal 300 exactly
   between commission and actual promotion, then zero; reject forged partials.
3. **One atomic training:** require real Expert tier/history, L30, correct
   commission/oath, alive/current pools, actual Bran reach/LOS and an exact
   current 300G quote/revision. Debit gold300 and increment lifetime spent300,
   clear only Master reserve, record the Master receipt/tier. No XP, SP, rank,
   healing, cooldown reset or auto-assignment. Repeated promotion is no-op failure.
4. **Shared wallet:** evolve the validated wallet to sum `expert + master`,
   each supported by its own history. Purchases, recipes, upgrades and any
   future repair/respec/paid consumable quote and mutation must use spendable
   gold. Death settles current-frame kills, then charges `floor(spendable*.05)`
   once. Never charge protected300 or reuse the `expert` field for Master.
   Strict ledger invariant remains `earnedGold - spentGold === gold`.
5. **Explicit versioned migration:** propose state v5, since v4 cannot express
   this supported route/Master contract. Validate v1–v4 using their own rules
   before migration; never accept a forged old-version Master/late flag merely
   because new growth code knows it. Preserve old raw slots until the supported
   explicit save/copy transaction. Map an existing valid `{expert:n}` to the
   new wallet with `master:0` without changing n or gold; absence can remain
   absent until a real accepting command initializes the wallet. Never recreate
   an Expert120 reserve already spent, commission, kill, skill or XP from level.
   Newly active records must be complete; malformed presence fails closed.
6. **Slots and input:** current slot-v1 stores nullable `expert1/expert2`, only
   Banner/Onslaught, and current mutation requires exact Expert tier. Proposed
   slot-v2 keeps those IDs and bindings, broadens eligible *purchased* extra
   actives to Pillar/Champion, and preserves existing assignments byte-for-byte
   in meaning. Master passives do not occupy action slots. No automatic replacement
   of an Expert action. Any UI naming/alternative extra-slot design needs its
   own versioned contract; avoid a hidden keybinding change. Preserve save-input
   handoff, held-channel ownership, safety cancel, queued-input invalidation,
   keyboard/mouse/touch remaps and duplicate-slot rejection.
7. **Recovery/save:** extend exact recovery/action schemas for new Master effects,
   validate owners/source IDs/tick counts and bounded durations, preserve paid
   cooldown/RNG/pools, prevent copied Pillar component/delayed-hit awards, and
   clear/cancel only effects appropriate to death/travel/load. Old profiles,
   release root and candidate namespaces must not be implicitly overwritten.

**Open decision: True Restoration.** Current authored base `healthRegen=0`,
and current equipment offers no positive health regeneration. Multiplying zero
by the cached +300/+500% still gives zero. Before claiming that node functional,
choose and explicitly document a meaningful positive regen source/baseline and
its impact on Invigorating Touch, rest, recovery and equipment. Or keep the
node unavailable with a clear reason until that decision is made. Do not turn
the percent into an unapproved flat heal, advertise zero as a useful effect,
change the cached percentages, or force an optional regen purchase as a campaign
gate. This proposal leaves the decision **open** and changes no regeneration.

## Separate finale and remaining acceptance

Actual Master training enables **Eda's new final quest**, not an ending screen.
Reserve a separate battlefield with two distinct six-foe approaches/relays,
a later boss and an explicit beacon pickup, followed by Eda's final report.
Use group spacing/control opportunities for Pillar, meaningful stun/slow threats
for Champion, close-successive targets for Crusader and survivable defensive
decisions for Guardian. No one named Master skill is an entry gate and no forced
damage can be used just to trigger Guardian. Finale rewards do not count toward
the pre-Master L30/300 guarantee. It needs a separate exact combat/reward plan
and actual play; the earlier B battlefield is not relabeled as the finale.

Biggest design risk: **reward density can hide insufficient combat/choice depth**.
W alone projects three or four levels, and the invested current Hammer build already
clears some B threats very quickly. This arithmetic proves availability, not
interesting encounters or acceptable power pacing. Do not fix short fights
with HP, walking, invulnerability or repeated-farming padding. Implement W as
the first isolated complete loop, compare invested and lower-investment legal
builds on Normal/Hard, and revise authored encounter geometry/reward placement
from observed choices and actual counterplay before rolling out all five regions.

Pending gates: real command-earned route on all difficulties; ordinary-input
Normal/Hard completion; optional-skip/material/free path; wrong/reporting NPC;
depleted pools; death/retry; relic-before-report; repeat/reentry; cross-version
save failure/recovery; atomic reservation/promotion; all Master effects/branches
and final use; 53-node coverage; gear depth; listening/mobile/repeat expedition.
No claim about play duration, fun, full Warrior completion, new source fidelity
or gameplay acceptance follows from this document or its arithmetic checks.

Validation in this change: calculator executed successfully; **576 subset cases
plus 1,088 endpoint/micro-XP transition-boundary cases** across both schedules,
individual-award level bounds, material totals/allowances, exact L30 curve and
four wallet scenarios checked; script syntax and scoped diff checks run. No game suite,
registry generation, build, browser, archive upload, Git push or deployment ran.
