# R7a normal-input Pass QA

2026-10-09, 21:20–21:38 UTC. Dot Chrome, public Site v20 candidate `/qa-r7/`, app `0.7.0-reimplementation.1`, code `2014acb520186094fa81493b54f6dfadaf0b6a1d`. Root R5a4 and all 195 pre-existing runtime files were unchanged. Site source is `ae10d82eb0f79e33a9f46b2147e15d2f2f1de8a1`; deployment `appgdep_6ac95a6e7ea08191bae957dc2a1bc1e5` succeeded at 21:20:01 UTC.

## Method and progression
Normal mouse, WASD and action keys only. The built-in explicit copy UI copied the owned R6 QA profile `qa-r6a-earned-20261009` into the new isolated `qa-r7a-earned-20261009`; it did not import a file, inject XP/items/flags, or alter the original profile. New-region entry was earned through earlier normal-play quarry completion.

| Observation | Level / cumulative XP | Gold | Kills / deaths |
|---|---|---|---|
| R6 source copied | L8 / 1845.5 | 426 | 49 / 5 |
| First five Pass foes | L8 / 2045.5 | 450 | 54 / 5 |
| First clue read | L8 / 2125.5 | 460 | 54 / 5 |
| Rescue group finished | L9 / 2325.5 | 484 | 59 / 5 |
| Guide rescued | L9 / 2415.5 | 504 | 59 / 5 |
| Advancing signal raider killed | L9 / 2450.5 | 508 | 60 / 5 |
| All 15 Pass foes finished | L10 / 2615.5 | 528 | 64 / 5 |
| Three signals aligned | L10 / 2745.5 | 568 | 64 / 5 |
| Eda final report | L10 / 2835.5 | 628 | 64 / 5 |

Exactly **990 XP and 202G** were earned in this Normal-difficulty route. Quest acceptance and shortcut connection did not give XP, money or recovery. L9 and L10 occurred during unique enemy encounters; the final report did not jump the character to Expert/L15. No new Pass death fee occurred in this profile.

## Legal build preparation and combat
The copied L8 had 31 unused attribute points and 13 unused skill points. Normal allocation buttons spent all 31 to reach STR18/DEX5/INT12. Normal Bran purchases spent 13 SP: mace2→4 (5), hammer3→4 (4), and one rank each of Shining Armor, Towering Strength, Constitution and Armored Assault (4). Existing Sundering, Heal and Judgement remained; the opposite hammer branch stayed locked. Max HP became144, MP78 and stamina74. Purchases did not restore existing HP60. The normal town healer then restored resources.

This differs from the analytic mixed build by Armored Assault in place of Faith; its actual armor is18.8, not the analytic21. Source equipment remained watch mace+1 and oak shield+1.

- First group: two Q casts killed two foes each; low MP then required approaching and finishing the last ranger with mace. HP ended137/144. Immediate Q after Space was outside the short recovery buffer and clearly refused without MP cost.
- Rescue group: Q penetrated targets, Space and mace finished the last ranger after MP depletion. L9 was earned during this group. No potion was consumed.
- After rescue, an enemy from the newly opened signal area approached the cleared rescue courtyard. During a failed interaction and **unpaused tool-reading delay**, HP fell133→103→65. This is not a measurement of normal-player difficulty. Q killed that raider, and the rope provided an independent return before the remaining signal fights.
- Town save/quit/reload preserved HP65, L9,508G and all progress. Normal T healed60 for30MP; returning through the rope preserved HP125 and the remaining6.6-second healing cooldown. Travel did not refill resources. Arrival protection remained until a movement gesture.
- Four remaining signal foes were defeated with Q, Space, mace and final E around the central obstacle. The final E earned L10. Q could one-shot the elite for this spent build; it should not be used as evidence that this enemy tests sustained armor-breaking decisions. All-rank and alternate-build gameplay remains unverified.

## Interaction and save regressions
- First clue: +80XP/+10G and a permanent, non-consuming copy. Normal reread gave no further rewards.
- Before all signal guards died, an attempted ember interaction failed without reward or resource changes.
- Wind produced1/3. Repeating wind reset only sequence progress to0/3, without a money penalty or duplicate receipt. Wind again produced1/3.
- Reloading directly from the signal modal and continuing restored1/3, next=ember,528G,2615.5XP, HP148/152, MP35 and remaining Judgement cooldown2s. F could inspect the device during protected arrival.
- Ember produced2/3 without reward. Stone completed3/3 and granted130XP/40G, iron3/wood3/thread2/ember shard1/potion1 once. Completed signal UI removed the action button.
- Rope return, Eda report and final refresh preserved the result. Eda had no second report action. Final normal inventory UI showed iron10/wood8/thread7/ember shard1, potion2, clue copy and previous tools/gear. Final state: L10 current235.5/500,628G,64 kills/5 deaths,8 unused SP/10 unused attributes, HP148/152, MP82/stamina80, earnedGold738/spent110.
- Final saved title was verified and only the owned QA tab was closed. The pre-existing localhost/approval tab remained untouched.

## Findings to fix before broader promotion
1. **Interaction priority:** the locked return portal can be nearer than its adjacent rope connection object. It tells the player to connect the rope but keeps selecting the portal. A small target-selection correction is needed, with reach/LOS and actual command guards preserved.
2. **Navigation clarity:** tall wall art, camera-relative directions and partially hidden floor openings make routes harder to read. The HUD shows only the goal title while useful route instructions are buried in dialogs. Directional guidance and an accessible objective view are preferable to widening empty travel or adding HP.
3. **Combat quality:** role silhouettes remain too similar; elite mechanics can be bypassed by a strong first hit. Damage/FX clarity and enemy behavior need further design and live review, not simply higher HP. Screen recording/audio listening were not performed.
4. **Completed text:** completed guide/signal descriptions still repeat prerequisite instructions. They should describe the saved result, not ask for already-completed work.

## Timing and limits
This was interrupted, tool-driven normal-input QA, not a continuous human-speed playthrough. The first session recorded191s play/37s combat/19s movement/305s menus/23s arrival, the second roughly32s play/7s combat, and the last103s play/0 combat/13s movement/95s menus. Combat and movement overlap. Unpaused reading contributed to play and combat time. Wall-clock18 minutes must not be claimed as actual campaign length; the region's active combat is brief. Whole-campaign depth, fun and target duration are still unproven.

R7-specific **actual death remains unverified**. After all enemies are cleared, there is no damaging encounter to test death during partial signals in this candidate. Automated life/death fixtures remain separate evidence. Another explicitly copied QA profile can test early Pass death normally; do not resurrect cleared campaign foes or inject a dead save. Optional expedition bookkeeping has only pure tests and no playable loop. Expert/Master, further required regions and the full ending remain incomplete. R7 stays a candidate pending these corrections/regressions.
