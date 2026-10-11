# R7a4 normal-input focus and legacy-save regression

Date: 2026-10-09 22:32–22:41 UTC. Dot Chrome owned tab24, public Site v24 `/qa-r7/`, app0.7.0-reimplementation.5 (R7a4), release code4b83051, preserved source c9b6678. All interactions used visible ordinary keyboard/mouse controls. No injected state, XP, position, storage, or developer commands. Explicit built-in QA-copy controls preserved the source profiles. Saved and closed only this QA tab afterward.

## L4 legacy copy and UI input ownership
The normal UI copied release QA `qa-r2-live-20261009` into candidate `qa-r7a4-focus-20261009`. It preserved L4,124G, cumulative492XP/current42/250,25kills/1death,36/76HP,46/46MP,57/57stamina,8SP,13attribute points,STR+2. Equipment was watch mace+0, oak shield+1, padded hood+0; iron3/wood0/thread3,2potions and blacksmith tool. Legacy E interaction/1 potion/Z hammer/J attack/Space charge and toggle shield remained unchanged.

- Escape closed the menu and focused the canvas. Tab twice focused the stable goal button. Holding Space1500ms opened its native goal panel, focused Back, and left HP36,MP46,stamina57,2potions and charge-ready status unchanged.
- Z,1 and W400ms inside the goal modal caused no attack, potion use or movement. Native Enter activated Back. Holding Escape1600ms opened the pause menu and kept it paused, rather than resuming on key repeat.
- Through the key settings UI, Space charge was rebound to P; starting another capture and pressing Escape cancelled capture while retaining P. No resource or cooldown changed during capture.
- With the native shield-mode select focused, P,Z,1 and Tab/Shift+Tab did not trigger game actions or alter the chosen mode. With the volume slider focused, P,Z,1 likewise produced no further cost or potion consumption.
- Escape restored canvas focus. P then executed one intended charge: stamina47/57 and2.9s charge cooldown, with HP36/MP46 and2potions unchanged. Restoring the original Space binding through the UI did not change these values.
- Save-and-quit, browser reload and normal Continue preserved stamina47/57 and2.9s charge cooldown,124G/492XP,HP36/MP46,2potions and legacy bindings. Saving/reloading did not refill this paid action or reset its cooldown.
- Native Enter on Continue resumed the canvas. D1600ms then A1600ms moved normally. Later Tab focus on the goal button followed by an ordinary mouse click on the game canvas restored gameplay input; W600ms and Space1600ms executed a single intended charge. Escape1600ms stayed paused. Cooldown1.3s was visible, consistent with one cast and elapsed active time, rather than repeat casts. The profile was safely saved.

Screens: `r7a4-space-native-no-charge.png`, `r7a4-focus-save-cost-and-cooldown.png`.

## L6 adept copy and persistence
The UI copied prior qa-r5 profile `qa-r5a-adept-20261009` to `qa-r7a4-l6-20261009`. It preserved L6 adept,295G,cumulative1025.5XP/current25.5/340,37kills/1death,5SP,21attribute points,STR+2/INT+2,84HP,63stamina and the actual old T-heal cooldown11.9s. MP33/59 regenerated during about6s active time before pausing; no free reload refill is inferred. The menu then showed59MP and heal cooldown5.2s.

The trainer showed the previously chosen lightning hammer branch1/3 and its opposite branch disabled, healing1/4, regeneration1/3, judgement1/5 and fire-area1/4. Runtime previews retained hammer18.75MP and judgement37.5MP. No skill points were spent in this check. The next objective was the still-unaccepted quarry investigation at Eda, not an automatically granted region or quest reward.

After save-and-quit/reload/Continue the same L6 resources,295G,1025.5XP,5SP,keys and1potion remained. The heal cooldown initially displayed5.1s, then expired only during the subsequent5s of active play before pausing. This was an elapsed-time observation, not a reset. The profile was safely saved. Screen: `r7a4-l6-reload-preserved.png`.

## Fresh entry and native Space activation
A distinct new candidate profile `qa-r7a4-new-20261009` entered at L1,0G/0XP,55HP,40MP,45stamina and no potions. Normal W movement reached Bran and F opened initial training. Back held focus; Shift+Tab selected the training button and Space held1000ms activated training once. It returned focus to the canvas with four learned starter actions,2potions and unchanged full resources, with no unintended charge. Browser reload and Continue preserved training,2potions,55/40/45resources and0XP/0G. The profile was saved and the QA tab closed. Screen: `r7a4-new-training-reload.png`.

## Automated coverage and limits
The isolated R7a4 release passed590/590 tests, syntax and build. Its real keyboard handlers cover button/input/select/textarea/contenteditable ancestry, dialog ownership, keyup/held-state clearing, binding capture, fresh gameplay input and repeated Escape. Textarea and contenteditable are not present in the current visible game, so those cases are automated only, not browser observations. No new combat-balance formula was changed.

This is a focused compatibility and input regression, not a second full campaign playthrough. The earnedL8→L10 Pass progression, death/retry and shortcut loops were separately played on R7a/R7a1 and are documented in their dated reports. Current nonblocking accessibility gaps include pointer-only hotbar button activation and no modal Tab focus trap (leaving the page is protected by blur pause). Hearing, mobile behavior, high-tier combat, complete campaign length and AAA-quality acceptance remain unverified. S and optional expedition ledger source are unintegrated and excluded from this release runtime.
