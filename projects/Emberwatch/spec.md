# Specification

## Game structure

- Seven classes: Warrior, Paladin, Ranger, Wizard, Rogue, Warlock, and Sorcerer; each has a basic attack, two active abilities, and three specialization definitions.
- Three themed biomes over six floors; each seeded map contains twelve connected rooms and corridors. Every second floor has a guardian.
- Runs include combat, dodging, potions, exploration, loot, relic selection, equipment, and resource collection.
- Seven persistent refuge buildings provide upgrades between runs.
- Browser local storage records progression and a resumable run. This is device/browser-local data, not cloud synchronization.

## Controls

WASD or arrow keys move; mouse aims and held left click attacks; J attacks using nearest-target aiming; Space dodges; Q/E use abilities; F interacts; R uses a potion; Tab opens inventory; K opens training; C uses an unlocked specialization technique; Escape pauses. On-screen touch buttons are a fallback requiring real-device verification.

## Repository and build contract

- Project ID and package name: `emberwatch`; current semantic version: `0.4.0` (development); status: `prototype`.
- Canonical static source lives in `app/src/`; `app/scripts/build.mjs` copies it into generated `app/dist/`.
- `pnpm --filter emberwatch build` produces `app/dist/index.html` with relative assets so the launcher can serve `/runs/emberwatch/index.html`.
- `pnpm --filter emberwatch test` runs deterministic data checks and isolated mock-runtime tests. These tests do not automate a browser.
- `pnpm --filter emberwatch standalone` produces a generated self-contained HTML file from the built static artifact.
- No committed `dist`, launcher run output, package manager cache, generated standalone bundle, credentials, or Sites configuration.

## Verification requirement

Run project syntax checks, tests, static build, registry synchronization, and the required repository-wide Vercel build. Real browser interaction and screenshot review are required before claiming gameplay or release readiness. A failed unrelated project build must be reported without modifying that project to hide the failure.

## 0.2.0 progression and combat revision

- Add a DOM-independent `growth.js` module for hero migration, skill ranks/point costs, attribute allocation, equipment values, and forge transactions.
- Add Training Grounds rank gates, seven shared building definitions, a level-10 ultimate gate, elemental gear affixes, and run-only skill orbs.
- Expand combat with queued inputs and impact feedback; expand maps with varied topology while preserving resume compatibility for legacy map versions.
- Ship `growth.js` in the static artifact and inline it into standalone output before the game runtime.
- Keep the permanent untested-development header warning, local save key, and all source files within this project.
- Dedicated pure-growth coverage checks migration, rank gates, point spending, forging, and map compatibility. Refreshed comparison/QA documents cover this revision. Map/mock tests do not validate real browser interaction.

## 0.3.0 visual contract

- Original generated transparent environment atlas plus four-direction hero and guardian sheets; each actor direction has idle, two walk poses and attack. All classes currently share the hero sheet; enemy archetypes share the guardian sheet with scale/tint variants.
- Isometric projection is rendering-only. Convert screen-aligned movement, dodge and mouse aim back to existing world coordinates; preserve collision, seed, progression, and save state.
- Add depth sorting, foreground wall fade, local torch illumination, full-viewport combat HUD and H cinematic view.
- Add atlas/projection/animation checks and clearly label offscreen renderer evidence. Update static and standalone packaging to include generated art.
- Browser QA remains blocked on the supported preview route and existing private Site sign-in; no bypass.

## 0.4.0 combat contract

- Character motion supports 24-frame phase-driven idle/run/attack/cast/dodge/hurt/death states with genuine pose differences, not repeated count padding or whole-sprite shifts. Original generated source and final-art provenance remain recorded.
- Attacks schedule their contact separately from anticipation and recovery. Single confirmed-hit feedback drives damage, hitstop, hit flash, impact VFX and SFX. Dodge can cancel recoverable actions; interrupted windups cannot ghost-hit.
- Enemy roles expose serializable telegraph geometry and lock aim before commitment. Contact tests use matching shape. Boss forms have differing patterns and phase behavior; attack budget reduces overlapping unavoidable tells.
- Test 24-pose uniqueness, state transitions, buffered inputs, canceled contact, telegraph/contact agreement, recovery vulnerability, crowd attack budget, all hero skills and save/resume.
- Preserve all source history and private-only hosting. No copied commercial art and no access-control bypass.

### Latest scope and sequence

Complete the Warrior first: idle, locomotion, three-hit sword chain, Whirling Axes Q, War Cry E, dodge, hurt, death, synchronized fantasy-RPG sound and impact. Preserve other existing characters, but defer new class/enemy art rollout until the Warrior passes its gates. Audio is original layered material/noise/resonance sample design rather than the former beep tones, with bounded polyphony, mix dynamics, and opt-in playback. Listening and normal-play acceptance remain separate from numerical audio and offscreen checks.

### 2026-10-08 continuation

The user authorized proceeding without usage checks for this task and reaffirmed dot’s cloud computer as the execution environment. First-Warrior acceptance remains mandatory before the next character or monster rollout. New enemy pattern definitions are retained as unactivated framework source; current expedition monsters keep their prior behavior until that gate.

### Bounded Canvas performance pass

Measure the integrated Warrior renderer offscreen, then add bounded viewport floor caching only if it addresses a measured bottleneck. Preserve depth sorting, fog reveal, frame margins and uncached fallback. Compare stationary/moving output and report CPU timing as offscreen evidence; browser60FPS acceptance remains pending.

## 0.4.1 Korean and player-lifecycle pass — 2026-10-08

Apply natural Korean throughout first entry, controls/HUD, catalog, rewards, growth, death/retreat, resume and repeated expeditions. Preserve stable save IDs, formulas and existing player progress. Review the full lifecycle and distinct play-style/repeat-play motivations; implement narrow verified fixes and clearer next goals. Warrior remains the first character quality gate; monster/roster expansion is not authorized by this localization pass.

Audit source and deterministic journeys while actual browser access remains blocked. Produce Korean game-screen evidence with proper glyphs and responsive layout, clearly labeled as offscreen evidence where applicable. Validate save/resume, first reward, training, equipment, death settlement and retry; distinguish tested logic/layout from human-control gameplay and listening. The 2026-10-08 approval permits the Emberwatch record in the shared generated registry to use projects/Emberwatch and the current Korean metadata; preserve every other project record and path.
