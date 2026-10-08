# Changelog

## 0.2.0 — 2026-10-07 — development revision

- Add skill and attribute point progression, rank-gated Training Grounds, forging, elemental equipment, and run-only skill orbs.
- Add combat input buffering/impact feedback, varied map topology, and legacy map migration.
- Package the new dependency-free growth module in static and standalone builds.
- Preserve an explicit untested-development warning; dedicated growth tests and updated reports are included, while real browser QA remains pending.

## 0.1.0 — 2026-10-07

- Initial original solo dungeon-crawler prototype and source integration.
- Added dependency-free static build, project metadata, deterministic data tests, and isolated mock-runtime tests.
- Documented blocked browser QA and pending release verification.


## 0.3.0 — 2026-10-08 (visual development revision)

- Original generated citadel kit and four-direction hero/guardian sheets.
- Isometric scene projection, larger floor slabs, matching wall orientation, painter-order actors, foreground wall transparency, localized firelight and embers.
- Screen-aligned movement/dodge, projected mouse targeting, compact full-viewport combat HUD and H cinematic view.
- Preserve original simulation, procedural maps, growth systems and save compatibility.
- Repair standalone art packaging; add projection, direction, animation and atlas tests.
- Offscreen portrait/landscape renders inspected; browser QA remains blocked. No numerical visual-parity claim.

## 0.4.0 — Warrior-first source checkpoint (2026-10-08)

- Moved canonical project to exact `projects/Emberwatch` path.
- Added24-sample articulated Warrior idle/run/three sword attacks/Q/E/dodge/hurt/death clips and original throwing-axe sprite.
- Separated startup/contact/recovery, added skill recovery cancel, dash-strike/counter choices, confirmed-hit impact feedback and reducedFX option.
- Replaced oscillator beeps with55original layered PCM samples, bounded mixing, variation, scheduled sword swish and interrupt cancellation.
- Fixed held-basic skill starvation, unavailable-skill recovery exploit, canceled ghost contacts, terminal projectile collision loss, combo cancel state, and saved-death resurrection.
- Preserved new role/pattern framework as disabled source until Warrior acceptance, then one-opponent verification.
- Added source, motion, audio and combat regressions; updated standalone offline bundling.
- Known gates: actual browser play/listening and60FPS pending; shared registry case update awaits authorized integration.

- Added bounded floor caching and foreground actor/threat-aware fade; offscreenmean31–36% faster in the measuredCPU scenes, browser60FPS still unverified.
- Added intentional dash-strike iframe tradeoff and evade counter opportunity; isolated regressions pass.
