# Crusher floor FX layering — bounded independent correction, 2026-10-14

Baseline: `f007a491c15fdae05d9dee795c7d5970917802af`, branch `codex/emberwatch-rebuild`, independent checkout `/workspace/emberwatch-reborn`. Existing October13 source, screenshots and owned read-only snapshots were preserved. The canonical version2 plan was already fully read in this conversation; its local materialization remains blocked, as documented in `docs/requirements/requirements-source-status.json`. This slice also re-read project/root AGENTS, local `.codex` verification/playtest skills, current requirements and `docs/poe2-input/user-spec-review.md` plus `writer-resumption-scope.md`. Current source is the authority for the narrow layer correction; no new PoE2 numerical or parity claims are made.

## Reproduced problem and change

The existing confirmed crusher wave was rendered in the general FX pass after hostile telegraphs, persistent hazards, loot and living sprites. Unlike the other friendly ground footprints, its dark contour and fracture paths could paint over tactical warning/body intersections. Six integrated tests reproduce this using actual production mace priming and Judgement contact/payoff records, with deliberately overlapping danger fixtures; all six failed before the change on draw ordering.

Only `app/src/visual.js` changes: the same `drawCrusherShockwave` records now render once in the friendly floor pass, before loot, danger and actor art; the later general FX pass skips those tagged rings. The component, radius,0.3s lifetime, geometry, colors, zero/reduced-flash behavior, damage/LOS/contact, motion, warning/evade, input, audio, balance and save/equipment/growth code remain byte-identical. No new assets or gameplay feature was introduced.

## Fresh automatic evidence

| Check | Actual result |
| --- | --- |
| Pre-fix layer regression | 6 cases,0 pass/6 fail, all expected draw-order failures |
| Focused real crusher/render/ground/expert integration | 98/98,0 fail/skip/cancel;2,856.231317ms |
| Full current suite | **4,689/4,689**,0 fail/skip/cancel;418,486.688242ms |
| Direct app syntax/lint | passed |
| Direct current app build | passed:133files,16,800,170bytes,version0.14.0-reimplementation.18 |
| Repository verify wrapper | failed at lint launch: Corepack mkdir `/home/agent/.cache/node/corepack/v1`; build/playtest skipped |
| Registry sync / Vercel build | failed at the same Corepack cache path; not passed or deployed |

Exact red/green/full output and setup logs are in this folder. Older pass counts were not inherited. The full renderer tests check single consumption, all contour/fracture strokes before warning/hazard/loot/both sprites, zero-flash, stack balance and no scene mutation. Existing combat regressions retain real packet/contact behavior.

## Matched pixels are controlled fixtures

`app/artifacts/qa-cloud-layer-20261014/controlled-{before,after}-flash-{0,0.5,1}.png` are six actual Chromium canvas screenshots using identical serialized scene, clock, assets and actual handler-generated wave. The before renderer is pinned byte-for-byte to f007a49. Only the renderer version changes. The supplied warning/hazard overlap is intentionally constructed; the enemy's visual state is configured for this presentation fixture. The visible page explicitly labels it **not ordinary UI play**. It does not touch the game's page, profile or storage and is not evidence of a new naturally encountered crusher payoff. All six captured without page errors. Inspected flash1 before/after and flash0 after show the danger line/body intersections above the friendly fractures/contour.

Harness, scene-generation script/JSON and copied baseline renderer modules remain in the excluded artifact folder. Images reuse the original owned source assets. No commercial source art or new PNG was committed.

## Separate normal UI play

Installed headless Chromium via Python Playwright runs the current built `/qa-r14/` app. Only ordinary native keyboard/mouse controls and read-only DOM/storage observations are used. New profile `qa-cloud-layer-20261014` was trained through existing UI; no old profile injection/import/copy, new writer, stat grant or namespace change.9 recorded batches,15 normal UI screenshots,zero operation exceptions/page errors. There is a preserved navigation miss: screen03, despite its attempted-entry filename, is still town and selected the nearer locked quarry; screen04 is the corrected actual road entry. Initial server bind/404 setup failures are separately retained in `environment.json`.

- Screens04–06: road entry, visible locked red melee tells and held mace combat.5 real kills gave58XP/19G. Space was delivered during the hold; the screenshot is an after-input combat frame, not a captured evade-window proof.
- Screens07–09: road attacks caused death. J/Q/P/Escape/Tab stayed contained by the death overlay with retry focused and canvas inert. Dead payload SHA256/revision84 remained identical through input attempts and normal reload/Continue. No repeated death charge.
- Screen10: native Enter used the existing retry UI → life1/deaths1, town with55HP/40MP/45stamina; kills/XP/gold remained.
- Screens11–13: second normal road entry/fight, then P opens the existing one-way portal and V returns to town. The second visit added **no kill**;5kills/58XP/19G remain.42.5HP demonstrates ordinary damage on the repeat visit; do not claim a second cleared encounter or expedition implementation.
- Screen14: fresh town RMB starts hammer input7 at0.80ms; Space starts roll8 at0.90ms. Hammer contact remains unobserved. Mace input9 is `recovery-too-early`; subsequent held starts10–12 contact at200.10/182.70/183.30ms from each own start. These are internal handler/render/contact clocks, not physical device/display delay or a measured dodge-success rate. Accepted audio request returns are not listening.
- Screen15: normal Save-and-title, refresh, profile Continue and menu retain life1/deaths1,5kills/58XP/19G and42.5HP in town. Mana changes30.532→32.2652 across normal elapsed UI time; no whole-payload equality claim is made for the living re-entry.

Raw owned snapshots and screenshots stay excluded from Git. Public sanitized native logs retain exact input requests, DOM/text and bounded read-only save hashes/fields. `native-checks.json` contains the verified invariants.

## Preservation, remaining requirements and blockers

`preservation.json` checks exact baseline Git blobs plus current SHA256:133 unchanged runtime source/assets,167 original Emberwatch files,1,451 other tracked repository files; default `/workspace/cb-ll` clean. Only the renderer runtime file changes. No main merge, release/version bump or default deployment.

Native browser/computer MCP tools are unavailable; installed headless Chromium is usable. Physical input/display latency, real OS blur/visibility, native AX/screen-reader and actual audible playback/mix remain unverified. Playwright launches muted Chromium. No 60FPS/performance or PoE2-completion claim. Today did not re-earn Judgement or a new ordinary crusher payoff; October13 earned-equipment/Judgement/real-wave evidence is historical and preserved, not relabelled as today's test.

The original a19 decision/diff remains unavailable and **is not cleared** by continuation. No protected equipment/save writer, JSON hook or substitute namespace/path was recreated or retried. One/two-hand and exact equipment-slot model, Master13 practical effects and repeat expeditions remain incomplete. Other melee-build expansion and balance micro-tuning remain on hold until first crusher quality/native/listening gates are legitimately resolved. Current input/movement/retarget/dodge implementations were inspected and retained; no second independent defect was established in this bounded slice, so no speculative feature or rebalance was added.

Library backup remains incomplete: earlier official PNG signed transfers returned `Forbidden` with no IDs/finalization. No transfer retry or alternate mechanism was attempted here without a verified cause/resolution. A distinct local source/tests/owned-assets/provenance/evidence checkpoint is retained, but it is not a Library backup.

Reviewable current build: `app/dist/qa-r14/`, local current server `http://127.0.0.1:4185/qa-r14/`. Controlled comparison URL: `http://127.0.0.1:4185/artifacts/qa-cloud-layer-20261014/controlled.html?version=after&flash=1`.
