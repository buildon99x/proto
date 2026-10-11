# R8a2 actual mixed-combat review and R8a3 correction

2026-10-10 UTC. Site v28 /qa-r8/, app0.8.0-reimplementation.3, project451941cd9bb81202c89f67b610be5a36472a80ed. Public root R7a4 remained unchanged.

## Normal-input evidence
A third isolated profile qa-r8a2-roles-20261010 explicitly copied the previously earned R7 L10 save through the in-app QA UI. It earned six entry kills and decode through ordinary movement/aim/attacks, reaching L11/3175.5 cumulative XP/668G/70kills/5deaths. RX then TX chose East. No XP, coordinates, items or flags were injected. Flash slider was set to0 using its ordinary UI.

- The title and pause menu both say R8a2; the previous mismatch is corrected.
- Screenshot r8a2-roles-danger-flash0.png shows mixed roles and danger windup. Cone/shot threats remain visible with flash0. The quiet role signatures are too low-contrast against the detailed floor and partly under actor shadows. This is a failed first visual pass, despite render tests passing.
- r8a2-east-open-passage.png captures the route after RX→TX. It does not itself establish that every threshold mark is easy to read; the character is still approaching the east mouth.
- Normal movement then approached the east mixed group. Pause at L11 HP140/156 MP84/84 stamina83/83, no additional kills, supplies unchanged. This retained state enables comparison after a corrective candidate update.

## Narrow correction
Commit4caa8d5d7a459d8e9093f8e9d205efc3135f2627: same shapes and dimensions, dark3.25px outer stroke then light1.25px inner stroke, about10px below the foot shadow. Static only, below danger/loot/actors, Sonly. No north-gate, combat or save-rule edits. Three new renderer tests check the exact stroke order, path reuse and shadow separation. The source package label is R8a3/app0.8.0-reimplementation.4.

## Open review
R8a3 actual contrast, open north passage visibility, heavy effects overlap and same-profile save reentry are not yet verified. No new audio, mobile, campaign-depth or AAA-quality acceptance is implied. This short tool-assisted combat is not an unaided pacing benchmark. Existing level-up-on-combat restores25% of new maxima; this authored rule must be accounted for in any survival comparison.
