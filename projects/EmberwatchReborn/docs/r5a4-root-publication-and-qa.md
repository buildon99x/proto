# R5a4 public root startup regression

2026-10-09 21:12–21:15 UTC, dot Chrome, own isolated profiles only. No save imports, XP/items/flags injection, or normal-user main profile changes.

## Published identity
- Public URL: https://emberwatch-reborn.buildon733500.chatgpt.site/
- Site v19 / app R5a4, 0.5.0-reimplementation.5.
- Exact Site source: 1fb9633dcc5de163893387d294a94f6f02c8eed4.
- Saved version: appgprj_6ac8ea942a608191bb680178f189f1d3~appgver_904c46785590819182c5aa05088ec640.
- Successful deployment: appgdep_6ac95897a6a08191a4b0e25aa9cf736c at 21:12:06 UTC.
- 49 root files exactly match the isolated verified build; only main.js, combat.js and build-manifest.json changed. All146 candidate files in qa-r4/qa-r5/qa-r6 remain byte-identical. Root49 + candidate146 =195 runtime files.

## Normal-input observations
1. Existing qa-r2-live-20261009 loaded under R5a4: ApprenticeL4,124G, HP36/76, MP46/46, stamina57/57, currentXP42/250, earnedXP492, skillpoints8, attributes13remaining/STR2, kills25/deaths1. Custom Z hammer/E interact/1 potion/J attack persisted. Gear: watch mace+0, oak shield+1, quilted hood+0; iron3/wood0/thread3, blacksmith tool, potion2. No equipment/resource changes were made. Saved back to title.
2. Fresh qa-r5a4-root-death-20261009 started L1 and untrained. NormalWASD/F reached Bran; training granted the four starter skills and two potions. Eda patrol was accepted. First attempt at a nearby portal selected the locked dungeon shortcut, correctly refused without changing map; then the actual road portal opened.
3. Road entry visibly waited for movement/offense with HP55. NormalD movement and J-held attack against normal enemies gave6kills/54XP/18G, and deliberate no-dodge/no-heal fighting ended in death. This is a regression failure path, not evidence of ordinary-player difficulty or full play time.
4. Reloaded page, entered the same profile and clicked Continue only. HP0 and the immediate death/retry panel appeared without any movement or attack. No arrival-wait message blocked retry.
5. Explicit town retry restored HP55 and preserved54XP,18G,two potions. Menu showed6kills/1death, earnedGold18/spent0. floor(18*0.05)=0, so this case proves no duplicate death settlement but is not a nonzero-gold-loss test. Existing R6 Adept actual13G loss and automated cases cover that separate boundary.
6. Saved to title, reloaded title and closed only the owned QA tab. Existing localhost/approval tab untouched.

## Checks and limits
446/446 isolated backport tests, source syntax and build passed before publication. The currentR7 working tree is separate; its565 tests do not replace this R5 count. QA does not establish whole campaign, every skill/rank, full-run timing, actual hearing or mobile quality. Screenshot labels are evidence of the observed screen, not a release-complete claim.
