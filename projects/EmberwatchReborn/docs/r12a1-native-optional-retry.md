# R12a1 normal optional rescue and death/save retry

2026-10-10 11:29–11:40 UTC, dot Chrome tab50, same Sitev47 `/qa-r12/`, runtimea93ed235e0f54244e793bdd92091a8cc194b3d10. Same normally earned profile, Normal difficulty, unchanged skills/attributes/equipment. Continues main-route report checkpoint, not a level1 replay. No injected state or imported save.

## Death, raw save reload and partial-encounter retention

After the completed Eda report, reentry through the town anchor retained all main objectives, cover choice, dead mandatory foes and bridges. Optional room remained accessible. Started L22/45.5XP,1828G,186HP,8potions. Basic+E killed one of four optional foes, awarding110XP/6G once. Then intentionally stopped all attacks/guard/movement/potions and watched the remaining three normal enemies kill the player. This is deliberate undefended death-state QA, not evidence of normal difficulty, survivability, TTK or player skill. No invulnerability, HP edit or forced-death command.

The death modal appeared at0HP,1743G,155.5XP. Exact loss floor(1834×0.05)=91G once. XP, gear,8potions and one optional kill remained. Reloaded the page while dead; title→same isolated Continue immediately displayed the proper retry modal, still1743G. Native retry returned to town200HP/106MP/116stamina,151kills/9deaths,36SP,70unspentattributes and unchanged XP/gold. Full pools are the disclosed explicit retry behavior, not travel healing. Cooldowns had expired naturally during the deliberate death, so this pass cannot prove a nonzero cooldown survives death.

Walked the connected route again. Mandatory rooms were empty and optional room had exactly three enemies. No new payout occurred during this reentry. Killed the remaining three using Q/E/Q with normal movement and mouse aim, giving330XP/18G, ending1761G/485.5XP. The previously killed enemy did not respawn or pay again.

## Optional reward after main report

Neri was usable after Eda report. All four dead, claim enabled. UI said “적0/4명 처치 후”, ambiguous because this value means remaining; a separate presentation patch will correct wording without changing condition/reward. Claim gave200XP/60G,2wood,2thread,1potion once. Before17.557MP/193HP and after17.557MP/193HP prove no reward refill; Q cooldown0.2s also unchanged in the panel. Final L22/685.5XP,1821G,9potions,35iron/23wood/25thread/12embers. Exact optional total640XP/84G minus91G death loss = final1821G from1828G main-route checkpoint.

Save/title/reload retained the same position,193HP and36.489MP (normal regeneration while closing previous panels before saving). The entry was safely held for movement. F alone did not release it. A short normal A then F reopened the completed Neri object: no claim button, same1821G/685.5XP/9potions. Final save/title succeeded; owned tab50 was closed. No other user's tabs were touched.

## Limits and new source audit

Channel alternative, Hard/lower-investment run, nonzero-CD death edge, all Expert effects, sound/mobile and whole-game pacing remain unverified. All25 W foes and all authored Normal objectives are now completed by this one earned build, with one deliberate death. Repeated cleared-region traversal is persistence evidence, not a repeatable expedition or an engaging replay loop.

Source audit explains keeper Q without duplicate damage: Hammer4/Sundering1/Towering1/Returning1, L21 STR41/spellPower1.12 gives raw157.9, outgoing148.962 at armor6, return156.337 after armor-5. Nominal305.299>200HP; actual HP loss caps on second hit. MP37.5 once/CD2. Existing per-leg hit-ID tests cover the two contacts; audit ran no new test. Future difficulty changes need the same earned-build comparison, not a duplicate-bug assumption or health inflation alone.

F observations after movement are still not classified as input loss. At Neri the first call's DOM briefly lacked the panel, but next call showed it and MP/CD remained exactly17.557/0.2 despite wall-clock delay, consistent with an already paused asynchronous interaction. Delayed DOM observation, save buffering and actual targeting range must be distinguished before changing the contract.

## Independent recovery URL read (11:55 UTC)

Opened the real public `/qa-r12/recovery` in a separate owned dot Chrome tab51. It loaded the standalone R12a1 recovery tool (no game), correctly named qa-r12, and required explicit pre-v4/pre-v5 selection. Normal UI selected pre-v5 and the completed main profile. It still displayed the original L18/725.5XP format4→5 revision1 snapshot timestamp10:42:19.767Z despite the live profile now L22/685.5XP. The warning correctly states that R11 cannot directly read qa-r12 and that newer progression is not converted by code rollback. No new restore/copy was requested here; the earlier title restoration remains the only native copy operation and its qa-r12 target remains unopened. Closed only tab51. This closes canonical-route/view validation, not native old-R11 restoration.
