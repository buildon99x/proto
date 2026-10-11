# R9 Furnace calibration and provenance

2026-10-10 UTC. Arithmetic calibration, not observed combat time or a completed F playtest. The original cached difficulty multipliers remain unchanged in reference-core.js (wiki_cached, previously live502, not measured by this task). Every F HP/armor/pattern/geometry/reward and the runtime armor formula, regen, potion/death values below are Emberwatch authored mappings. Do not claim they are confirmed original-game statistics.

## Controlled comparison
To isolate difficulty, use a normalized hypothetical player with160HP,20armor and a40raw physical mace hit with no critical/penetration. This is NOT an exported actual QA character. Enemy columns are tender/nozzle/warden, respective base HP54/44/82 and armor2/0/10. Hit damage is raw×100/(100+target armor); incoming13×difficulty enemyDamage×100/120. The same attack schedule/cover/escape decision exists on all difficulties.

| Difficulty | enemy HP tender/nozzle/warden | mace hits to kill | incoming warden thrust | front active-blocked thrust | unblocked thrusts to KO | 55% potion in thrust equivalents |
|---|---|---|---:|---:|---:|---:|
| easy | 35.64 / 29.04 / 54.12 | 1 / 1 / 2 | 7.15 | 2.15 | 23 | 12.31 |
| normal | 54.00 / 44.00 / 82.00 | 2 / 2 / 3 | 10.83 | 3.25 | 15 | 8.12 |
| hard | 67.50 / 55.00 / 102.50 | 2 / 2 / 3 | 13.54 | 4.06 | 12 | 6.50 |
| serious | 81.00 / 66.00 / 123.00 | 3 / 2 / 4 | 21.67 | 6.50 | 8 | 4.06 |

Hits are discrete, so25% HP scaling need not add a swing for every foe. A base0.52s mace action contacts at35%=0.182s, so a stationary target killed inN consecutive unmodified swings has ideal contact time0.182+(N−1)×0.52 seconds; this excludes travel, windup avoidance, block, hitstop, targeting, player build changes and stagger. Actual elapsed kill time MUST be measured through normal controls separately. Do not inflate F enemy HP to meet a campaign duration target.

## Resources/recovery
- Active frontal guard reduces the remaining damage by70%, consumes6stamina per blocked hit before authored skill discounts, with0.3s regen delay. A missed facing does not receive that reduction. Passive block is separate and omitted from this deterministic table.
- Current potion restores55% max HP with5s cooldown. At160max HP it heals up to88HP, capped by missingHP; the table expresses its diminishing protection under harder damage, not a new difficulty-dependent healing bonus.
- Base HP regen is0. Base MP regen4/s and stamina10/s are authored. With12allocated INT the current regen is4.48MP/s after0.5s delay; replacing a37.5MP hammer costs about8.87s without other spend/buffs. These are reference calculations for the observed QA allocation, not a promise that its whole build is this normalized player. Movement/guard/basic attack can remain meaningful while mana returns.
- Alive combat level-up restores25% of NEW max HP/MP/stamina after kills settle. Objective-only level-up does not do this. At160max HP that is40HP; separate it from explicit potion/skill healing and save persistence when measuring survival.
- Death costs5% current gold once, retains level/equipment/quest/receipt/defeated state and retries in town. Surviving enemies reconstruct on region reentry; this is not precise enemy HP save-resume.

## F progression budget
17unique foes pay840baseXP/106G. Four independent objective receipts pay450XP/150G; accept/lens/optional lift grant0. BelowL15 F pays1290XP Easy/Normal and1080XP Hard/Serious, always256G. Each actual kill computes the existing lower-tier multiplier before grant, so crossingL15 changes later Adept kill XP. Tests replay four difficulties×two earned predecessor paths×two cooling choices with per-kill assertions; scripted settlement fixtures are not ordinary input. No repeat-run XP, optional gear purchase, skill branch or level requirement gates the F report. Minimal Hard T report must remain before the finalL15 promotion check to avoid the documented5500XP softlock.

## Required real-play comparison
After UI/render integration: both cooling choices from untouched copies of earnedS saves; evaluate whether cover blocks player/enemy shots and changes approach, whether mixed5/6/6 roles avoid one clump, whether the fire tender response can be read without invulnerability/teleport, and whether1.5HP/2damage Serious becomes unreasonably punishing. Record damage, potion/MP decisions, deaths, combat/movement/paused time separately. F is not accepted solely by this calculation or automated counts.
