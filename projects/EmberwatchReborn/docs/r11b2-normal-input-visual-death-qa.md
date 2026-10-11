# R11b2 v40 visual and Expert continuation checkpoint

2026-10-10 07:53–08:08UTC. Dot Chrome, public /qa-r11/, R11b2/0.11.0-reimplementation.5, sourcece3c39eac08b09966d13250fea3deaf3808183cf; Sitev40 source562a62bb47e2b442b26b07a1f5f1d0990665d8bf. RootR7a4 unchanged. Ordinary UI/keyboard/mouse only; no runtime/save/XP/HP injection.

## Version and durable migration
Title and pause menu both R11b2. Earned Zeal profile `qa-r11b1-zeal-20261010` restored its prior L17,1300G,14SP,115/180HP,11/96MP,88/101stamina,east1/2,5potions and Onslaught4.6/Banner9.1cooldowns. Key2/3 and flash0 retained. Arrival stayed safely paused until movement. Walking advances normal regeneration/CD; region transition itself does not refill resources.

## Corrected release pixels at flash0
West mixed enemies and the boss were deliberately observed before killing them. In the isolated hexer sequence, the long lane disappears at release and a small red projectile advances from the caster, without the former large false melee slash. The pyromancer sequence similarly has a compact launch/shot rather than a giant arc. Real narrow lancer cones and bulwark circles remain readable during the same mixed scene. Boss fireline and sweep were separately observed, with the long line and true broad cone remaining distinct; released fire no longer draws the old full-range slash.

These are screen observations of representative geometry, not pixel-to-hitbox numeric measurement. Exact24-unit muzzle bound, cone/circle coordinates, rendering layering and gameplay equivalence are the automatic tests. Flash0 was active; listening/audio and mobile are not tested. The screenshots include warning and release frames, not every frame necessarily contains the quarter-second muzzle cue.

## West progression and returning training
West T affected two undead revenants while living opponents remained, then normal E/mace removed three other enemies. A ranged enemy stepped away from an aimed Q; close T subsequently killed that undead hexer. Intentional observation/no-defense periods caused damage and are not a survival benchmark. All six normal kills granted54G/540XP. West device granted35G/280XP once,3iron/2wood/1potion, advancing L17/705.5→L18/145.5 and14→19SP. Final at device1389G,180/184HP,9/98MP,101/104stamina,6potions; both devices complete, boss path physically open.

Returned through the existing town portal and normally bought Returning Hammer1 for3SP,19→16. No gold, attributes or equipment changed. Trainer says2s cooldown/one contact per outward and return leg/wall blocking. Both completed yards remained empty after ordinary re-entry; boss still alive. The first boss Q showed143 rounded damage and a remaining health bar about28%, then the boss side-stepped. No second damage contact was observed. The return contact is therefore NOT accepted; movement/wall interception were not isolated and no runtime failure is established. Wrath, isolated Lance damage, Protection reduction, Guilt extra damage and Inner Flame resistance remain unverified by this native run.

## Deliberate failure and dead-save recovery
After the one Q, intentionally stopped attacking/healing/guarding and observed normal boss attacks until death. This is a failure-path test, not representative combat difficulty or continuous playtime. Death deducted69G once (floor of5% of1389), leaving1320G,0HP; XP/L18,16SP,6potions and earned progress remained.

Reloaded the page, selected the same profile and continued. The dead-save retry panel appeared immediately without movement, kept1320G and did not charge again. Its normal town-retry button restored184HP/98MP/104stamina by the explicit existing retry rule. Pause menu confirmed128kills,8deaths (one new),XP145.5,16SP,50unspent attributes,key2/3,flash0 and1320G. Saved/title and closed owned tab37, then yielded the screen to the other bounded fixture. Boss victory, final relic/report and a post-retry combat revisit remain open at this checkpoint.

No campaign-length/TTK/DPS inference is drawn from tool elapsed time or segmented menu counters. Candidate source/test Library checkpoint predates these new native captures; this document and new JPEG/DOM evidence are preserved as a separate v40 QA part to keep each archive below25MB.

## Post-retry completion, 08:16–08:22 UTC
Reopened the earned Zeal profile in a new owned dot Chrome tab38. The town save
restored184/98/104 resources,1320G,XP145.5/900,L18,16SP,6potions and8deaths.
Normal B re-entry kept both yards empty and both devices complete. The boss was
alive with a full bar after explicit retry; no other reward was repeated.

Moved onto the left side of the arena. Two Q casts missed the moving boss while
the cursor was below its current foot position. These ordinary-input aiming
misses are preserved, rather than counted as damage or skill malfunction. The
third Q was aimed at the current foot ring while the boss began its cone windup.
One press showed an outward143 floater, then a separate150 floater on the return
path and the boss died. Frames retry3-2 and retry3-4 show the two contacts; no
other attack, channel, Banner or damage area was used between them. This verifies
Returning Hammer's second contact in this native situation. It does not isolate
Wrath, critical chance or the exact contribution of armor break; those numerical
attributions remain automatic-test evidence rather than this screen observation.

The boss gave240XP/48G once: XP145.5→385.5,1320→1368G,128→129kills.
Victory did not auto-collect the relic. Normal separate beacon collection gave
160XP/20G,3iron/2wood/2ember; the UI became completed with no second claim button.
The nearby return portal preserved HP121 and did not refill resources. MP rose
during actual walking and unpaused town time, as expected from regeneration.
Eda's explicit report gave180XP/80G once, leavingL18 XP725.5/900,1468G,16SP,
6potions. Final inventory showed29iron/17wood/19thread/10ember and the named,
non-consumed beacon; +1mace/+1shield and attributes were unchanged.

Saved at town with121/184HP,98/98MP,104/104stamina, then returned to title,
reloaded, and continued the same profile. The exact pools, XP, gold, SP, potions,
completed guidance and Eda's already-paid state returned. There was no report
button or new payout. Saved/title again and closed only owned tab38. The final
menu's69play/20combat/7walking/172menu/8arrival seconds are segmented, overlapping
QA counters with deliberate observation and menus, not continuous campaign time,
TTK or DPS. No balance acceptance is inferred from this heavily invested build.

Still open: individual Guilt extra damage, Protection reduction, Wrath proc,
Lance contribution and Inner Flame resistance; other expert ranks/builds and
opposite device order; Master, high-tier equipment, live repeat expeditions,
whole campaign, mobile, listening and overall market-quality acceptance.
