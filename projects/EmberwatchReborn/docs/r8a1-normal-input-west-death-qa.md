# R8a1 candidate: west route, death and reload QA

## Exact artifact and observation boundary
2026-10-09 23:30 through 2026-10-10 00:01 UTC, dot Chrome tab26. Public `/qa-r8/` is Site v27, app0.8.0-reimplementation.2, source af5c9f41a672fb19f3020bd5da7fdf7d4fcc717e. Site source961fe4050ead855b451bcfbc65495e3a83ff0f72, saved version appgprj_6ac8ea942a608191bb680178f189f1d3~appgver_47d5984379e48191a784d5993fb7c9ea, deployment appgdep_6ac978e4ae2c8191a29b9dcddcbb3584 succeeded23:29:55UTC. Public root remains R7a4; v27 keeps all260 earlier root/candidate files unchanged.

Separate owned `qa-r8a1-west-death-20261009` profile, normal input only. No XP, position, objective, item or browser-storage injection. Both route runs used the same genuinely earned L10 predecessor build. Geometry was consulted after visible navigation trouble: this is not an unaided usability benchmark.

## Death and persistence evidence
Retained23:32 screenshots show the death modal and the same modal immediately after dead-save reload, before retry. At resumed observation23:51 the profile was back in S with69kills/6deaths,3035.5earnedXP,622G,124/152HP,37/82MP,2potions; total gold earned763/spent141. The earlier east predecessor spent110: the extra31G matches floor(628*5%) death loss, with no XP loss or repeated fee in subsequent reloads. Do not infer an exact uninterrupted pre-death timing from these screenshots. Current source/handler death idempotency checks remain separate automated evidence.

## West route normal input
- Last entry enemy brought70kills,3075.5XP and627G. Decode gave100XP/10G and earnedL11. Reread stayed637G/current75.5XP and explicitly said the reward was already paid.
- Transmitter first → receiver second opened WEST. The completed receiver panel stated fixed selection and offered no further lever action. Traversed the west doorway and entered the common yard normally; no shortcut used or connected.
- Six yard kills yielded76kills,3415.5XP,667G. Transmitter paid110XP/30G once and opened the north approach.
- Four keepers yielded80kills,3765.5XP,729G. During this combat HP fell61/156; held R for1second consumed exactly one potion (2→1), and the final count was2 after the receiver's one-potion award. Q resource shortages were explicit; no potion or mana was injected.
- Receiver paid120XP/40G and the fixed materials once, then regular entrance return worked without the optional lift. F travel immediately followed by Escape showed the committed town name in both HUD and pause menu: the R8a1 race correction passed this actual input sequence.
- Orin report paid90XP/60G without a lift condition. Final L12,3975.5cumulativeXP/current335.5/580,829G,80kills/6deaths,16SP/20attributes,HP131/160,MP86/86,stamina86/86,iron14/wood9/thread10/ember2,2potions. Mace+1/shield+1 and prior bindings remained.
- Save→title→reload→same-profile Continue preserved all visible final values, depletedHP, completion goal,80kills/6deaths and970G earned/141G spent.

Both normal routes yield exactly1140XP/232G from S. West final829G vs east860G differs by the single31G death fee; final2potions vs east3 differs by the one observed combat potion. No side reward, equipment purchase, skill purchase, attribute allocation or rest was used in this west continuation. This demonstrates optional-lift independence and identical route budgets, not a completed repeat-expedition loop.

## Timing and quality findings
Final post-retry session counters:105s play,65s combat,35s movement,1579s menus,13s arrival. Combat and movement overlap. A long interrupted tool session stayed paused; menu time is not game content duration. Earlier pre-death session is not included. Do not compare65s directly with east36s as a controlled balance test: targeting, movement and tool planning differ.

Threat lines/cones remained identifiable while fighting, and close-target mace/charge/judgement supplied ways forward when mana was low. However, tall reused walls, dark rectangular floor gaps and similar foe silhouettes still hurt route/role reading. The first north approach wasted offensive casts into a wall before moving right into the actual opening. Raw damage/HP increases would not address this. Next bounded improvement: mark opened traversal thresholds and differentiate runner/archer/keeper ground silhouettes with non-flashing cues, then repeat ordinary-input review; tactical encounter changes require separate tests and balancing.

Other limitation: menu still says R8a while title says R8a1, so exact build identity in this report derives from the title, verified deployed artifact and source manifest. No new fatal regression observed. Mobile, listening, uninterrupted difficulty/low-power runs, Expert/Master, repeated expedition and whole campaign acceptance remain open. This QA does not certify AAA quality.
