# Cloud crusher continuation — partial acceptance

Baseline: `b6a4626bd58e15356af1dc865fcdc4b5da84ea64`, fetched into the separate `/workspace/emberwatch-reborn` checkout. The environment's `/workspace/cb-ll` checkout was not edited. No main merge or deployment.

## Implemented unit

Actual ordinary-input screenshots made the short crusher floor feedback difficult to separate from the stone floor and the existing Judgement arc. `crusher-presentation.js` now draws a quiet dark keyline and the existing inner stroke on **the same path and alpha**. The true radius, projection, 0.3-second lifetime, decorative geometry, reduced/zero-flash behavior, combat packets, damage, timing, inputs, audio, balances and persistence are unchanged. This is a small presentation improvement, not completion of the PoE2 port.

The new paired-stroke contract failed against the baseline (three failed presentation checks, including the two revised stroke-count expectations), then passed after implementation. It executes the existing production payoff and verifies geometry, alpha and mode restrictions at three effect ages and the actual isometric transform. Stroke-count changes describe two contrast strokes on each existing path; they do not describe extra effects or hits.

## Tools and evidence boundary

No browser/computer MCP or node REPL desktop API was exposed after environment startup. Installed Chromium and Python Playwright were usable. QA used a fresh headless Chromium context at 1440×900, the built `http://127.0.0.1:4182/qa-r14/`, and native Playwright keyboard/mouse/DOM UI actions. The runner does not evaluate game modules, write storage, grant XP/items/ranks, teleport, change enemy HP, or create a new game writer. Browser storage was read only to preserve and compare this newly earned QA profile. Existing in-game UI performs all progression and save writes.

These are actual Chromium-rendered pixels and game inputs, **not dot desktop acceptance**, physical display latency, a human-speed continuous playthrough, or actual listening. DISPLAY/audio-device and exposed-tool checks did not provide a supported physical display/listening path. WebAudio request acceptance is separately labelled below. Do not turn that into heard sound or playback onset.

Original instructions, project requirements/source trace, PoE input review and writer-resumption-scope were read. The canonical Library plan was read in its exact version2, lines1–500 and501–623; no local canonical byte/hash match is asserted. Root/project `.agents` skill directories were absent; `/workspace/.agents` and `.codex` were empty.

## Normal-input route and screens

Screens are excluded from Git; `screenshots.json` records their exact hashes. They are preserved with the source/tests/logs in the Library checkpoint and local `app/artifacts/qa-cloud-20261013`.

| Evidence | Actual observation |
| --- | --- |
| 02–04 | Fresh L1 profile `qa-cloud-crusher-20261013`, free Brann training, patrol acceptance. |
| 07–09 | Six actual patrol kills, 67XP/22G; potion use and personal portal return; once-only report to L2. |
| 11–12 | Buy iron_mace for32G, allocate two earned Strength points, equip the one owned instance. Screenshot12 shows the actual mainhand and attack15.2. |
| 16–17 | Real road death, reload dead profile, explicit town retry with earned skills/item/kills retained. A later overlong attack batch clicked retry after another death; this is logged as an unintended QA action, not a successful boss trial. |
| 23–25 | Boss hit/defeat, warden cache and normal dungeon quest/key. Remaining road slinger/cache were not required or silently granted. |
| 28–42 | Upper/lower dungeon, crank, three runes, all six upper guards, water controls, lift, lower enemies, boss, core and elder report. A context-click portal plus redundant V caused an upper/lower roundtrip and is retained as a navigation mistake. |
| 43–44 | Earned L5 commission → free Adept promotion → Judgement1 and Lay on Hands1 bought for two points each → town-only crusher selection. No free XP, points or recovery from promotion. |
| 46–48 | **Failed wave attempt**: ground aim killed two raiders; E started/contacted but no prepared-guard payoff was shown. Internal input observations: E start0.40ms, render entry14.20ms, return15.70ms, contact328.90ms; accepted sound request0.60ms. These are internal timestamps, not physical input/display/sound latency. |
| 49–51 | Normal settings changed aim projection to Cursor. Actual named guard, two direct hits and ◆ preparation, then valid E with guard and nearby slinger defeat. Ground lines were difficult to distinguish; this was the presentation motivation. |
| 52–53 | Normal save→title→refresh→same-profile continue retained L6, XP, gold, purchased ranks and all four equipment IDs. Session combat mode reset as documented; town reselection restored crusher. Cleared entry enemies stayed absent. Pickaxe was legitimately obtained, then another encounter approached. |
| 54–55 | **Failed corrected-FX trial**: target had moved; no preparation/payoff was established. Do not claim these images verify the correction. |
| 56–58 | Corrected build: named guard ◆ preparation, then valid E. Screenshot57 contains the target-centred outer contour and internal fractures;58 is the expired-effect followup. Guard, raider and two slingers settle together: kills38→42,247→265G. This is a different legitimate encounter, not a matched visual A/B benchmark. |
| 59–62 | Normal brightness slider to0, actual insufficient-MP rejection (`needed30/current14.728`), then natural regeneration, real preparation and valid zero-flash payoff. Screenshot62 retains the static contour without decorative fractures. |
| 63–66 | Actual crusher-mode death:299→285G (floor5%=14), XP/ranks/items/kills retained. E/P/Escape cannot dismiss the death state into gameplay. Reload restores death; explicit retry returns to town. Reselect crusher and re-enter cleared quarry; J+Space and the internal observation screen were exercised, then current position saved normally. Detailed responsiveness/held-restart acceptance is still open. |

All screenshots were inspected individually for the claims above. Zero page errors were observed. Locator/time/coordinate failures and the initially invalid QA name are preserved in `browser-actions.jsonl` and the operation-failure record; they are not counted as passes. The final new profile is L7 Adept,285G,181.5 current XP,45 kills/3 deaths, Judgement1/Lay on Hands1, four unchanged item IDs, full retry pools and brightness0. Campaign/repeat-expedition completion is not asserted.

## Checks

- Fresh baseline full run:4,680/4,680; failures/skips/cancellations0.
- Focused corrected crusher run:27/27.
- Final full run:4,681/4,681; failures/skips/cancellations0;522,942.619ms.
- Syntax lint passed; project build passed:133 files/16,799,799 bytes.
- Registry: initial pnpm failed on its external home path; the scoped cache attempt installed dependencies but stopped at ignored esbuild/sharp lifecycle approval. No lifecycle approvals were granted. Generated root lock/workspace changes were preserved as evidence and reverted.
- `build:vercel` failed before the project pipeline on corepack cache mkdir under `/home/agent/.cache/node/corepack/v1`. It is **not passed**. No deployment was attempted.
- `preservation.json` compares every other source/asset, original Emberwatch file and other tracked repository file with the exact baseline. No protected writer, hook or alternate namespace was created.

## Remaining gates

Actual listening/mix/synchronization, dot desktop/native focus/AX, physical input/display timing, full subjective responsiveness and a matched before/after screen comparison remain unperformed. Scene performance/60FPS and native30/60/120Hz consistency are not established by this run. The outer radius is still the existing range contour, not a newly verified wall-clipped damage footprint.

The parent reported that original a19 invocation/command/diff/review ID could not be recovered; R13 archival material is not its security decision. There is **no verified clearance**. Protected one/two-hand and ring/neck/belt equipment changes, Master13 effective growth and repeat-expedition writer integration remain incomplete and were not recreated under other hooks/namespaces. First-crusher acceptance still has the listening/native quality gates; no new remaining-melee-build extension or whole-project completion is claimed.

The live environment still responded to shell and browser calls at18:06:59UTC after the parent's disconnect notice. Source, owned QA snapshot, raw actions and screenshots are preserved independently of that session. Resume with the pushed branch/checkpoint and the Library evidence; do not import the QA snapshot or replay blocked writer work as a workaround.
