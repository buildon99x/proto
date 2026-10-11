# R11b1 v39 normal-input status and Zeal checkpoint

Date:2026-10-10, about07:20–07:43UTC. Dot Chrome candidate /qa-r11/, buildR11b1 /0.11.0-reimplementation.4 /Sitev39. Source5192eeca1884cd28b46e3db486b334faec2b27a7. This records the previous live executable, not R11b2 corrected release pixels. Only ordinary UI/keyboard/mouse actions were used. No runtime injection, save import, XP/HP edits or forced random result.

## Earned profile and investments
The existing Protection L18 save loaded intact in v39. Then the normal copy UI preserved earned R10 `qa-r10-channel-20261010` and made `qa-r11b1-zeal-20261010`. Starting L16,1331G including120 reserved,34SP,131/176HP,94MP,98stamina,4potions; Bran promotion used120G, leaving1211G. Permanent STR18/DEX5/INT12, inherited Mace4/Hammer4/Sundering1/Towering1,+1mace/shield, no Trial by Fire; no attributes, equipment or difficulty altered.

Normal training bought Banner1,Zeal1,Onslaught1,ShieldOnslaught1,Flames1,Inner1,Wrath1,Lance1,TurnUndead1 for25SP, leaving9. Protection became unavailable after Zeal choice. Key settings assigned slot1=Onslaught/2 and slot2=Banner/3. Returning Hammer was deliberately not yet purchased, to retain a before/after opportunity against the untouched boss.

## Observed effects and costs
- Town Banner at94MP showed56 after passive regeneration; the discounted HUD quoted Q33.75 instead of37.5 and E/T27 instead of30. Boundary remained visible at flash0. Leaving the boundary restored standard costs. Inner Flame status appeared after a spell.
- T inside Zeal healed131→176; MP56→31 including passive regeneration, nominal27 cost. CD showed12.3s following activation, consistent with the13s Zeal adjustment. No town undead target existed.
- Q at31MP was rejected with `마나 부족 · 필요 33.75 / 현재 31`; no spell cooldown/spend was observed. Passive regeneration continued normally.
- A safe open-town completed Onslaught/Shield hold spent exactly45stamina (98→53), consistent with four11.25 payments. Directional movement and recovery were visible. This does not isolate Lance damage or Wrath proc.
- First normal mace contact on a revenant showed40 physical plus7 fire, establishing the trained Flames addition at the rounded display precision, not the exact6.6/7.26 underlying values.
- T near the wounded revenant showed100 pure damage and one kill; later T showed100 on the nearby bulwark and another kill. Adjacent living enemies remained. MP paid30 outside Banner; one heal was capped at fullHP and the other overlapped a9HP enemy hit, so net healing is not a nominal-heal measurement.
- In the east lane, a direct key2 hold traversed the lane and killed two enemies; later a spear enemy repositioned past a committed charge and also moved away from an aimed Q. A later Q during its committed close attack killed it. This demonstrates target/position changes in this observation, not a controlled pacing superiority comparison.
- A simultaneous right-click+2 attempt shortly after Banner produced guarding without Onslaught/CD. The subsequent distinct2 hold worked. Existing explicit guard/buffer cancellation and action timing can explain this, but the exact combined-input ordering was not isolated; no new input defect is conclusively established.

## New v39 status feedback: actual enemy causes
Natural enemy attacks caused all three states. Menus froze the state while the next deliberate input was selected.
- Disarm: mace HUD/aria became `무장해제 · 공격 불가`; normal LMB produced the specific disarm message and no basic attack. Other spells remained available.
- Silence: Q/T/E/2/3 HUD/aria all showed `침묵 · 시전 불가`. Q produced `침묵 중에는 주문을 시전할 수 없습니다.`; MP stayed94 with no Q cooldown. A subsequent enemy stun changed the HUD to the higher-priority stun reason.
- Stun: Space produced `기절 중에는 행동할 수 없습니다.`. Stamina stayed98 and no dash cooldown appeared; after natural expiry the normal cost/ready HUD returned.
These are normal-input checks of the feedback fix, alongside the separate1956 automated v39 gate. The intentional no-defense observation periods reducedHP; they are not difficulty/survival acceptance or representative play.

## East settlement and durable checkpoint
East six kills:1211→1265G and540XP. Device connection once awarded35G,280XP,4thread,2embers,1potion, advancingL16/665.5 toL17/165.5 and9→14SP. Final1300G,115/180HP,11/96MP,88/101stamina,5potions,122total historicalkills,7historicaldeaths,45unspent attributes. No new death. Completed device correctly displayed completed text and no reward button.

Normal current-location save → save/title → same-profile continue preserved L17,1300G,14SP,115HP,11MP,88stamina,5potions,east1/2 and Onslaught4.6/Banner9.1cooldowns. UI also retained key2/key3 and flash0. Saved/title again, then closed the owned tab before aggregate/source work. The root live R7a4 save was not changed.

Menu counters at this segmented checkpoint:66active/41combat/9movement/945menu/15arrival-wait seconds. Movement and combat overlap; this included intentional passive status probes and town diagnostics. They are not continuous playtime, encounter TTK, DPS or campaign length.

## Remaining quality and verification gates
- Zeal west, boss, final report and death/retry still pending; Returning Hammer not bought/tested. Wrath random proc and isolated Lance effect are unobserved. Inner Flame resistance and exact fire multiplier are not quantitatively observed. All15nodes are not native-complete.
- Observed ranged release draws a misleading large slash; corrected geometry is now separately integrated as R11b2 and must be re-observed. HP/timing/damage changes are not part of that correction.
- A fractionalMP value can display ceiling38 alongside a37.5 quote while the eligibility truth is still insufficient. This is a follow-up display precision issue; runtime resource calculation has not been shown wrong.
- Map/goal-loop depth, advanced gear, Master, live repeat runs, full campaign, mobile and listening/audio acceptance remain open. Enemy count and checks do not establish the desired quality.

Evidence is retained in the R11b1-Zeal portion of the Library QA archive; original JPEG pixels and DOM text are distinct. `r11b1-status-silence-ready.jpg` was an intended probe filename but contains no silence and is explicitly NOT silence evidence. `r11b1-silence-blocked-hud.jpg`, `r11b1-silence-rejected-input.jpg`, `r11b1-stun-rejected-dash.jpg` and their DOM snapshots are the positive evidence.
