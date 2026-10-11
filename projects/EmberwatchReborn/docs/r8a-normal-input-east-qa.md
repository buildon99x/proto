# R8a normal-input east route QA — 2026-10-09 22:59–23:22 UTC

## Build and method
Public Site v26 `/qa-r8/`, app0.8.0-reimplementation.1, source c49904dc37c0013706766419189d399ead3cea92. Root remains R7a4. Dot Chrome tab26, isolated qa-r8a-earned-20261009 copied through the visible no-overwrite UI from genuinely earned qa-r7a-earned-20261009 in the R7 QA namespace. Ordinary keyboard/mouse actions only; no injected XP, coordinates, items, objectives or browser storage. Source geometry was consulted to plan walking after visible navigation difficulty. This is not an unaided first-time navigation benchmark.

## Earned progression and economy
Start L10, cumulative2835.5XP,628G,64kills/5deaths,HP148/152,MP82/82,stamina68/80 and paid charge cooldown2.8s retained from previous save. Skills8/attributes10 banked. Existing mace+1/shield+1, iron10/wood8/thread7/ember1,2potions; STR+18 DEX+5 INT+12. No new skill purchase, attribute allocation, equipment purchase, rest or potion use during S.

| checkpoint | cumulative XP | gold | kills | observed result |
|---|---:|---:|---:|---|
| acceptance |2835.5|628|64|no cost, XP, refill or quest auto-completion|
| six entry enemies |3075.5|658|70|MP fell to26; E30 rejected as insufficient|
| decode |3175.5|668|70|earned L11; HP148/156, not free-filled; repeat decode unchanged|
| six yard enemies |3415.5|698|76|HP140; route chosen EAST|
| transmitter |3525.5|728|76|110XP/30G once|
| four keepers |3765.5|760|80|earned L12 during combat; HP98/160 at end|
| receiver |3885.5|800|80|120XP/40G,iron4/wood1/thread3/ember1/potion1|
| Orin report |3975.5|860|80|90XP/60G once; completed UI has no report action|

Total S award exactly1140XP/232G, matching authored normal budget720killXP+420objectiveXP and92killG+140objectiveG. End L12 current335.5/580XP,16SP/20attributes banked, iron14/wood9/thread10/ember2,3potions. Final save→title→reload→Continue preserves these, both +1 equipment pieces, bindings J/Q/E/T/Space/R/F,80kills/5deaths and HP98/160 (not healed). Actual XP is20 below the full optional fixture because inherited predecessor progress differs; no fabricated fixture-to-browser equality.

## Persistence/selection checks
- Receiver lever first gives1/2; repeating it resets only unfinished order to0/2 without reward. Receiver again1/2 survives save/title/reload. Then transmitter fixes EAST, with no extra reward and no remaining choice action.
- Optional lift opened free immediately after decode while route still1/2. Paid Q before travel lowers MP84→47; trip and immediate return retained about50MP after active regeneration, HP148 and the same XP/gold/partial-order state. No refill or restored reward. Cooldown expired through actual active time; this observation does not independently prove every residual cooldown duration.
- Orin quest UI coexists with normal shop, old stock and equipped items. No optional older free supplies were claimed, keeping the S budget isolated.
- Post-report reopening Orin retains860G/3975.5XP and completed text, no repeated report. Full reload preserves completion.
- An accidental short visit to the previously cleared Pass occurred while locating Orin, then ordinary F return; no kills or awards there.

## Quality observations and limits
The bounded progression works, but the region is not quality-complete. Approximate counter sums across the two logged sessions:168active-play seconds,36combat seconds,29moving seconds (combat/movement may overlap); later session had115play/27combat/23move/777menu/10arrival-wait. Earlier had53play/9combat/6move/237menu/59arrival-wait. Tool thinking and inspection inflated unpaused idle regeneration and menu wall time. Do not treat23 minutes wall clock or these counters as uninterrupted player duration.

Strong learned hammer cleared groups quickly. North keepers' narrow/wide cones were visible; under repeated basic attack the player took meaningful damage and finished98HP without potions. Pointer position affected direction; some misses were automation aiming, not hit-detection defects. A deliberate death test remains unrun. Offensive action rooting is existing behavior, not demonstrated input loss. MP shortages were visible but no clean uninterrupted sustain benchmark was performed. No direct audio/hearing pass occurred.

P1 review: tall reused walls and dark floor seams obscured the north approach; current goal lacked map landmarks. Distinct enemy functions did not yet yield enough sustained tactical decisions in this strong build. Do not solve by HP/walking inflation. West route, deliberate death, lower-power/difficulty balance and repeated play still need review.

P2 actual defects: after accepting/returning in town, guidance described internal S enemies instead of travel; completed decode still advertised first reward generically; travel immediately followed by Esc showed the old region only in the menu heading. Local R8a1 corrects these; its browser regression remains pending. No whole-campaign, Expert/Master, repeat-expedition, mobile, audio or AAA-quality acceptance follows from this run.
