# R12a1 native QA — first Normal main route and report

2026-10-10 10:42–11:25 UTC, dot Chrome tab49, same public `/qa-r12/` Site v47, runtime `a93ed235e0f54244e793bdd92091a8cc194b3d10`. This extends `r12a1-native-anchor-checkpoint.md`. Root remains R11b6; qa-r11 remains R11b7. No runtime edits, injected pools/XP, imported saves, equipment changes, new ranks/attributes or difficulty changes during this pass. Earned profile was copied through the supported UI from qa-r11. It is not a new level-one playthrough.

## Checkpoint result

The same profile completed the 21 mandatory kills, explicit survey/anchor/receiver/relay/evidence and Eda report, then saved/title/reloaded. Final normal earned state: level22, XP45.5/1140, gold1828, skill points36, kills150/deaths8,8potions,186/200HP. After normal town/menu transitions MP/stamina capped106/116. The report itself preserved raw pools186HP/104MP/113stamina across the level22 cap increase. Report reward is not a free heal. Source qa-r11 and unopened pre-v5 snapshot copy remain separate and unchanged.

No gameplay completeness claim: optional scouts, death/retry, channel alternative, Hard/lower-investment comparison, standalone recovery URL and Expert effect isolation remain open. Orin's repair/follow-up craft, Master, live expeditions and final campaign remain unimplemented. Main route connectedness is proven for this one normally earned build; pacing, fun and whole-region difficulty are not accepted by this result.

## Receiver, clue and committed choice

The five receiver foes created nearby undead plus distant caster/lancer pressure. A normal T Warmth dealt visible100 pure to each of two nearby undead and killed them. The two kill rewards caused a level-up, so resulting HP cannot isolate healing from existing level-up recovery. A Q attempted soon after a basic click was refused during recovery without MP spend. This is distinct from the later mouse-only aim and successful Q, which hit an intervening lancer. A later held Onslaught and still-live returning hammer overlapped against two remaining foes; neither kill proves an isolated Lance contribution.

Native pointer-only aiming via Sky.move was used from this point, avoiding an extra compulsory basic attack just to set aim. Earlier click-to-aim attempts have different action timing and must not be treated as equivalent controls.

Wind advanced1/3. Repeating wind at step2 reset0/3 with explicit wrong-order feedback, no reward or cost. Wind again1/3 survived save/title/reload; fresh F reopened the same prefix. Cairn2/3 then ember3/3 completed receiver:150XP/35G/1potion, no direct pool refill. Safe travel and some tool observation gaps regenerated MP normally before this objective; that is not an objective bonus.

The choice panel explained permanence, no cost/reward, the same four threats and both side paths. Selecting “엄폐판 유지” removed both choices and retained the chosen state. Only this branch was played; a different silhouette alone would not establish balanced tactical alternatives.

## Relay and approach combat

At the relay gateway a straight-up Q/Onslaught attempt did not damage the apparent nearby target. After moving northwest clear of the corner, E killed one lancer and basic killed the other. Moving around the north side of retained solid cover opened the two rear foes to one returning Q. Visible142/156 damage and two kills were observed. The central obstruction actually constrained the approach and line of sight. It also made an initially natural direction unsuccessful; collision/route readability needs another review rather than assuming damage failure.

The completed relay object read0/4 remaining and explicitly required connection. Connection gave150XP/35G with no pools/CD change, then displayed a completed state without claim button. Next bridge opened only after this action.

The approach encounter included two disarmers, a large-radius stunner and an undead ranged caster. Banner cost40, visibly reduced Q cost37.5→33.75 and T/E30→27 in its drawn area. An E killed one target and left MP9.252; further MP actions were visibly unavailable. The player then used stamina-based Onslaught and shield charge, movement and basic attacks rather than a free refill. Stun refused an attempted T with no spend. After it expired, a fresh T dealt visible100 to the undead bulwark, killed it, and healed165→196 (no intervening level-up). The final disarmer fell to basic attack.

This demonstrates actual role/status/resource differences in this sequence. It does not establish difficulty fairness: segmented inspection gave ample decision time, attacks and movement were not continuously human-timed, and the invested build still kills most targets in one skill contact.

## Keeper, separate evidence and report boundary

Arrived at the keeper with196HP/43.848MP. The first line release was not cleanly captured. A later guard observation showed186HP and then a clear radial tell. Normal rightward movement left the radial area and HP remained186. No HP/AI/damage modification was used to obtain this pattern.

From the new flank a single Q outgoing+return killed the200HP keeper. The screenshot caught approximately one-quarter remaining after the outbound hit, then the next paused DOM showed the one boss kill and280XP/40G. This is a serious pacing concern for the same invested build; it is not proof of duplicate damage and not a reason to inflate boss HP. Audit damage-once-per-leg and examine role/space/phase opportunities before any balance change. The current player can skip most boss pattern combinations with an ordinary earned skill.

Before taking the purple evidence, the opened return explicitly said “기록핵 미회수”. Returned to Eda: no report button, guidance to collect the evidence. Town anchor reentry preserved dead foes, glyphs, cover selection and unlocked bridges. The same route could be traversed without replaying its payouts. Separate evidence pickup gave100XP/20G/1potion, retained the nonconsumed key and removed its action. Return followed by fresh Eda interaction now showed150XP/60G report. Claim completed once, removed its button, and stated Orin's next work is not implemented. Save/title/reload preserved level22/45.5XP/1828G,8potions,186HP and completed report with no second claim.

## Exact main-route economy reconciliation

Start cumulative XP8565.5 and1468G. Final cumulative XP11845.5 and1828G. Delta3280XP/360G =20 ordinary kills×110XP/6G + keeper280XP/40G + objectives800XP/200G. No optional payout or death loss occurred. Skill points16→36 reflect the four ordinary level-ups18→22; all20new points remain unspent. Initial725.5/900 at level18; checkpoint845.5/960 at level19; receiver435.5/1020 level20; relay155.5/1080 level21; report45.5/1140 level22. These are earned progression, not automatic fixture grants. Final displayed material stock35iron/21wood/23thread/12embers and the nonconsumed clue/hook/record are captured in report-inventory.txt. Planned main-route material award is6/4/4/2; this screenshot alone is not a before/after material delta measurement.

Four levels from one compact route require pacing review. The diagnostic run does not show that the route has enough encounters, choices or qualitative progression to justify these levels. Do not present a high level number as campaign-depth acceptance.

## Time and input observation limits

10:42–11:25 wall time includes pauses, screenshots, tool latency and save inspection. At the keeper kill this resumed session's UI read51play/27combat/17movement/785menu/13arrival-wait seconds. Combat/movement overlap and there were earlier resets. Neither these counters nor tool action durations are continuous TTK, a campaign-length estimate or a representative fast clear. Some safe out-of-range F attempts left unpaused gaps while inspecting, regenerating MP without HP healing. Travel itself never granted recovery; normal running time correctly does.

First F immediately after movement sometimes left a nearby prompt and required a fresh second F. In several cases the first attempt was near the boundary; other cases could involve checkpoint pending or tool event routing. Exact cause is not established. Do not label all these as lost input without source/repro evidence.

## Visual/quality follow-up priorities

1. Labels and inactive future foes visible across void/locked rooms create clutter and spoil gating. Gate labels sometimes cover player/boss; keep genuine threat tells and interactable cues identifiable, including flash0.
2. Held basic attack substantially roots movement due to the shared action contract. Compare short action commitment against responsive WASD; do not change it silently during a content pass.
3. Keeper currently dies to one legal invested returning hammer. Verify hit accounting first, then compare appropriate later-threat tactics using the same earned build, not synthetic HP or scripted invulnerability.
4. Trainer purchase lower-card position has an independent prepared patch; not included in this exact runtime.
5. Complete optional/death/alternate choice tests before considering candidate promotion. Root stays unchanged.

Evidence files are native screenshots (actual JPEG bytes), DOM text snapshots and this report. Some filenames describe the attempted scenario, not a successful action: receiver-binder-counter.jpg and approach-warmth-counter.jpg show refused attempts; keeper-fire-telegraph.jpg does not establish a visible fire-line tell. Interpret using this report. No audio recording or mobile acceptance was performed.
