# R8a3 corrected visual candidate: actual normal-input review

2026-10-10 UTC. Site v29, /qa-r8/, app0.8.0-reimplementation.4, project a58f7856246c1f739039daa737e21c8a0734d78e; Site source fa40039abe5375b30af518baee1a5030b06ce13a. Published00:31UTC. Root R7a4 and prior candidate260 files were byte-identical before/after staging.

## Actual sequence
The existing qa-r8a2-roles-20261010 profile was saved in-game at L11/3175.5 earned XP/668G/70kills/5deaths, HP140/156 MP84/84 stamina83/83, and then reloaded on the newly published candidate. Flash0, bindings and progression survived. Ordinary movement, right-mouse aim/block, J attack, Q hammer, E judgement, one R potion and F interactions completed the six yard enemies, transmitter, four keepers and receiver. No browser state injection, console mutation or scripted fixture was used.

Final saved/reloaded state: L12, earned XP3885.5/current245.5/580,800G,80kills/5deaths, HP151/160 MP52/86 stamina86/86,16skill points/20attributes,2potions, flash0. Receiver reward restored one potion after one was used. Orin report was intentionally not replayed in this visual-only follow-up; the earlier R8a1 east/west full loops already verified that report. Equipment and skills were not changed.

## Visual findings
- Static double-chevron runner, forked-arrow archer and broad-shield keeper marks are now distinguishable on exposed floor. The previous floor/shadow blending is materially reduced. r8a3-role-glyphs-clear-floor.png and r8a3-open-north-floor-marks.png show archer/keeper marks under line/cone telegraphs at flash0. Different shapes, not color alone, identify roles.
- Red shot lanes and narrow/wide keeper cones remain above the neutral signatures. Player, health bar and enemy silhouettes remain visible through the brief skill effects captured. This is bounded screenshot/input review, not exhaustive animation/frame or audio acceptance.
- The ordinary-input north doorway is traversable after restoration and all four keepers can be fought. However, the small floor-corner marks were not reliably obvious in these screenshots. Tall architecture/black non-walkable gaps still made route alignment confusing; I do NOT mark passage discoverability as fully solved.
- Several early Q attempts hit solid cover or used a stale screen aim after camera-relative movement. Successful freshly observed foot aim then killed the exposed archer. These automation/route factors cannot be presented as a measured input lag defect.
- One E attempt during early mace recovery was rejected with the existing clear message, and low-MP Q attempts displayed the resource failure without spending. These were expected guards, not new defects.

## Timing and difficulty limitations
At the final pre-reload pause, this R8a3 session recorded85active seconds,55combat,17movement,902menu,15arrival-wait. Combat/movement overlap. Large gaps were paused tool/code inspection, and much combat time was deliberate observation/aim correction, so this is NOT a controlled pacing/fun benchmark. Only Normal difficulty was played here. HP includes the pre-existing combat-level-up25% max-pool restoration and one explicit potion, not save/reload healing. No listening or mobile input acceptance.

## Next
Preserve R7a4 root while improving route legibility and connecting F/T/Expert/Master and repeat runs. The visual comparison establishes a bounded role-mark improvement only. It does not establish whole-region tactical depth, whole-campaign duration or AAA quality.
