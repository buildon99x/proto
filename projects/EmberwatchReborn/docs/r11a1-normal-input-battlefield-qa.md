# R11a1 normal-input correction and complete B loop

## Exact tested build and method

2026-10-10 05:22–05:49 UTC, dot Chrome owned tab33, public
`https://emberwatch-reborn.buildon733500.chatgpt.site/qa-r11/`, Site37,
app0.11.0-reimplementation.2/R11a1, source8e6b6076f4746735b4b84374b4720bc6068065ab.
The main Site root stayed R7a4. This is the reimplementation, not recovery of
the lost original Reborn source. All play used ordinary pointer/key/UI inputs.
The isolated profile `qa-r11-west-20261010` continued its explicit earlier copy
of earned R10 progress. No HP, damage, XP, gold, skill, position, save or flag was
injected. No save import was used. Earlier R11a promotion/death evidence is in
`r11a-first-normal-input-qa.md`; it is not relabeled as R11a1 evidence.

Esc menus bounded each combat observation. Tool, review and menu latency makes
wall-clock duration unsuitable as human campaign duration. A brief unpaused
gap on an already cleared map also increases play time and normal MP regen.
The combat/movement counters overlap and must not be added together.
Earlier normal R7 purchases retained in this earned profile include mace4,
hammer4, Sundering1 and Towering Strength1 (see the R7/R9/R10 QA chain). It is
not a rank1 starter build. The source audit explains why E1 plus Q4 can legally
exceed this boss's200HP before critical, Banner or Lance; do not mistake rapid
burst for evidence of duplicate hit application.
Important build distinction: this is the R9 channel profile, which did NOT
purchase Trial by Fire (R9a1 channel QA explicitly records that; current E costs
30MP). The four-foe E/basic clear is direct sector damage, not a persistent fire
area. Fire-response improvements need a separately, normally purchased augment
and cannot be credited as a response to an observed fire-area failure here.

## Corrected controls, footprint and entry

- Continue restored L16,1160G,215.5/780XP,22SP,148HP/94MP/98stamina, one west foe
  defeated, Expert Protection/Banner/Onslaught/Lance rank1, actual keys2/3 and
  old E/T/Q/mouse/F/R bindings.
- Two separate west Onslaught holds started correctly against real enemies,
  charged9stamina each, showed cooldown and contact. A later east hold charged
 18stamina for two paid stages. A boss hold also charged9 and reduced its HP.
  These correct the observed old rejection symptom. They do not measure browser
  storage latency or exhaust every deferred-input timing boundary.
- Banner cast once for40MP; the dark-cased warm footprint remained readable at
  flash0 while red hostile danger appeared above it. The hero moved outside the
  fixed footprint; it expired after normal elapsed simulation. Exact radius,
  LOS, duration and protection math have automated coverage; this screen run
  did not isolate the protection damage multiplier.
- E/2 pressed early during a preceding action's recovery was deliberately
  rejected without cost, with the recovery-window message. This is distinct
  from the repaired save-window input loss. Holding a rejected channel start
  does not silently restart it later; another explicit press was required.
- The new B portal is visibly separate in the northern town clearing. Normal
  F return/re-entry selected it without the prior gate stack obscuring the hero.
  Old town gateways remain crowded and shrine-like NPC props remain a visual
  quality issue.

## Earned route, pools and one-time economy

West six-foe yard finished after the prior one kill. Normal potion R was used
once (4→3); its instant heal was followed by visible poison damage. Device F
offered a single connection button. West connection added280XP/35G/one potion,
L16→17,27SP. Pools stayed166HP/22MP/98stamina while maxima became180/96/101;
level-up did not refill them. Refresh restored these values and remaining
Onslaught/Banner cooldowns (1.0/11.7s), bindings and1/2 objective. Reopening the
completed device offered no second reward.

Normal return/re-entry retained the dead enemies and objective. Region
transition itself did not heal: HP166 remained166. MP/stamina regenerated during
ordinary unpaused walking/review time, which is not a transition refill.

East six foes were killed with Banner, Onslaught, Condemnation, basic attacks
and an aimed Hammer. Four melee foes fell together during the E/basic sequence.
No second potion was used. Its device added280XP/35G/one potion: L18,1329G,
145.5/900XP,32SP,144HP/96MP/101stamina (max184/98/104),5 potions. The second
connection opened only the central route; it did not revive earlier enemies.

The boss visibly alternated a committed long fire line and a broad melee cone.
The cone is captured in `r11a1-boss-cycle-1.jpg` and
`r11a1-boss-onslaught-contact.jpg`. Observation-only guard samples took damage;
these are not ordinary kill-time or fair-difficulty measurements. A movement
plus T heal obscures whether the first fire line hit, so no clean dodge claim is
made. A later late cone-exit attempt took17HP including ongoing burn. On actual
offense, E lowered boss HP, Onslaught contact lowered it again, then aimed Q/E
killed it. Boss reward was240XP/48G. HP131 persisted after the kill.

Killing the boss did not collect or report the beacon. Explicit F collection
added160XP/20G; repeat panel said already collected and offered no claim button.
The return gate led to town; Eda's explicit report added180XP/80G once. Report
text correctly states chapter3 complete, with Master/end campaign still pending.

Complete B budget on Normal, across R11a and a1:12×90XP +2×280 +240 +160 +180
=2220XP;12×9G +2×35 +48 +20 +80 =326G. Earned totalXP6345.5→8565.5, L16→18.
After120G Expert promotion and the earlier60G idle-observation death:
1331−120−60+326=1477G. The death was NOT a reaction/difficulty finding.

## Save/re-entry and inventory results

Final report: L18,725.5/900XP,totalXP8565.5,1477G,32SP,50 unspent attribute
points,STR18/DEX5/INT12 allocations,129 kills/8 deaths,131HP/98MP/104stamina.
Inventory UI showed +1 outpost mace and +1 oak shield,29iron/17wood/19thread/
10ember,5potions and persistent beacon. It exposed the raw `battlefield_beacon`
identifier instead of a localized label, a small UI defect to correct.

Save-and-title succeeded. Reload and ordinary Continue restored the exact final
values, Expert bindings2/3, old controls, gear and report. F at Eda offered no
reward action. Another normal B entry retained completion, HP131 and currency/
XP. Walking its open central route showed the boss platform empty, no crystal,
no new combat or reward. Final save-and-title succeeded and only tab33 closed.

## Quality findings and remaining gates

- Functional loop and the three focused R11a corrections passed this Normal
  sample. This is not whole campaign, all15 Expert nodes, all difficulty curves,
  Master, live repeat expedition, mobile or AAA-quality acceptance.
- West combat approximately18s in the first a1 connection, plus its earlier
  first kill. East six foes about7s; deliberate boss offense about5s after the
  separately observed patterns. These rounded counters/input batches are not
  controlled DPS benchmarks. Nevertheless the legal burst and common chase AI
  consume a same-tier field too quickly to demonstrate sustained choices.
- Current growth grants two levels in this brief loop. Do not solve depth by
  increasing HP/walking or claim the campaign time target passed. Audit damage
  duplication first, then test distributed threats, cover/area response and
  readable boss pressure with the same earned equipment/profile. Preserve the
  ability to overpower older regions after growth.
- Completed-device prose still says “kill all six” after all six are dead.
  Beacon inventory localization and completed-device copy need small fixes.
- Existing giant repeated gates, shrine NPCs and dense trainer descriptions
  remain presentation work. This slice has screen evidence at flash0, but no
  separate listening/audio synchronization or mobile inspection evidence.
-1827/1827 automatic checks apply to the tested source. They do not certify
  actual pacing, fun, sound or undisplayed Expert branch behavior.

## Screenshot interpretation

All `r11a1-*.jpg` captures contain actual JPEG bytes. Screenshot names describe
the intended observation, not automatically a successful outcome. In particular
`boss-sweep-telegraph` and `boss-second-pattern` are recovery frames; use
`boss-cycle-1` for the actual cone. `boss-cone-exit` records a late, damaged exit.
No edited/annotated gameplay images substitute for these originals.
