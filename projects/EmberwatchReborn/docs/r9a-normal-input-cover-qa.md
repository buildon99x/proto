# R9a Furnace cover-route ordinary-input QA

2026-10-10 01:13–01:31 UTC, dot cloud Chrome tab26, public Sitev30 /qa-r9/. App0.9.0-reimplementation.1, implementation1c45789, Site3858a72. RootR7a4 and earlier candidates remain byte-identical.

## Provenance and method
The title UI explicitly forward-copied the earned S completion profile qa-r8a-earned-20261009 into qa-r9-cover-20261010. No save-file import, XP/flags/items/coordinates injection, browser hidden-state mutation, or combat helper was used. Keyboard/mouse and normal UI controls drove movement/combat/choices. Source geometry informed route planning, so this is not unaided discoverability research. Pausing between observations preserved safety after the first death; it also prevents treating wall time as ordinary continuous play.

## Earned results
|Field|Before F|After report and reload|
|---|---:|---:|
|Level / cumulative XP|12 /3975.5|14 /5265.5|
|Gold|860|1073|
|Kills / deaths|80 /5|97 /6|
|HP /MP /stamina|98/160 ·86/86 ·86/86|161/168 ·90/90 ·92/92|
|Unspent skill /attribute points|16 /20|24 /30|
|Iron /wood /thread /ember|14 /9 /10 /2|19 /11 /12 /4|
|Potions|3|3|

XP delta1290 matches17unique kills840 +objectives450. Gold delta213 is256earned minus43one-time death loss. One potion was consumed before death and ignition granted one. Mace+1/shield+1, inherited STR18/DEX5/INT12 allocations and controls remained unchanged. Combat level-up and death retry healing are included, not attributed to the lift or save.

## Passed actual-input observations
- Orin offered free F acceptance from existing completed S atL12; no synthetic level gate. Start resources were retained at entry, and arrival safety waited for movement.
- First5unique kills, explicit irreversible cover choice, one100XP/10G award andL13. Choice vanished after commit; HP stayed160 while max increased164, rather than objective healing.
- One death during slow active tool observation:871G→828G, retained2kills and potion count2. Refresh/continue opened death UI immediately atHP0, no second penalty. Normal retry restoredHP and retained progress. This death is not a clean difficulty measurement.
- Optional lift connected for zero reward/cost and round-tripped before exhaust. HP160/164 unchanged; MP48→49 across a short unpaused interval, then regenerated during later town time. No teleport heal is inferred.
- Six working-ring kills from eastern flank and cross-aisle, exhaust120XP/30G once, rear aisle opened. Mace attacks were useful during lowMP; narrow/wide cones and long shot lines stayed readable.
- Six ignition kills, L14 reached from combat rather than an instant report jump. Full17defeated before ignition. Lens pickup before ignition was rejected with the required-step message and unchangedXP/G/HP, with chargeCD1.0s frozen while modal was open.
- Ignition140XP/50G and material/potion grant did not auto-collect lens. Explicit lens had noextraXP/G, then lift return and Orin report90XP/60G. The lens remained a nonconsumable tool. Report button disappeared.
- Save/reload retained final stats, inventory, lens, +1equipment and completedF report card.

## Quality findings and limits
1. Low masonry and open paving bands made actual corridors/solid holes more legible than the older tall wall clutter. Some diagonal approaches still clipped baffle corners and required correction; pathfinding acceptance remains bounded, not effortless navigation.
2. New F kinds lacked the established role glyphs, despite sharing similar purple actor art. This is a genuine renderer-mapping omission. Narrow/wide attack tells remained visible, but role recognition before attacking was weak. Bounded R9a1 mapper fix is separately tested and awaits screen review.
3. The completed S card still invited a new F repair after F was already reported. R9a1 makes that text follow actual acceptance/completion.
4. Native54HP tenders died rapidly to direct upgraded hammer hits. Successful actual fire escape was not captured; the later review established that Q Hammer is not the Trial by Fire/Judgement area, so these casts were not a valid fire-response trial; deterministic reaction tests do not establish that players perceive the behavior. Do not inflate HP merely to make an escape visible.
5. F has no new authored boss. Most groups resolve quickly once aimed correctly; this run proves connected progression, not campaign density or AAA combat quality. More deliberate pressure/role-space choices remain necessary.
6. One objective-only level-up and one combat level-up occurred. All17kills and fixed objective budget match, so there is no unexplainedXP injection. Unspent24skill points show high-tier/build spending remains an open depth issue.

The final post-death reload session reported152active seconds,30combat,23movement,510menu,9arrival; combat/movement overlap. The earlier segment last observed50active/32combat before a later death. Its exact final counter was not captured. Do not sum these into an exact full-route duration. Long tool inspection, idle town regen and repeated pauses materially bias combat pressure and timing. Normal difficulty only; audio listening, mobile, channel choice, actual cover-vs-shot comparison and correctedFrole screen acceptance remain unrun.

Screenshots/visible AX are named r9a-* in the QA checkpoint. They contain only isolated game data, no credentials.
