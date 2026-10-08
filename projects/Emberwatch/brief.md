# Emberwatch: Crown of Cinders

## Goal

Create an original, solo browser dungeon-crawler prototype with a repeatable loop: choose a hero, explore generated floors, collect loot, face guardians, and reinvest resources in a persistent refuge.

## Audience and constraints

- Desktop keyboard-and-mouse players; touch controls are an experimental fallback.
- Canvas 2D rendering, browser ES modules, and local saves; no runtime package dependencies, backend, accounts, or external art assets.
- Original title, world, implementation, and procedural visuals. Genre inspiration does not mean feature parity with any commercial game.
- Integrate as a new `projects/Emberwatch` static artifact without changing other projects.

## Prototype boundary

The current scope is seven hero definitions, three biomes across six generated floors, three guardians, equipment and relics, refuge upgrades, and local run persistence. It is not a finished commercial release. Browser gameplay and visual quality have not been verified in the current environment.

## 0.2.0 development revision

Expand permanent progression and combat feedback with spendable skill/attribute points, rank-gated training, forging, elemental equipment, skill orbs, input buffering, impact feedback, varied floor topology, and legacy map migration. The source revision includes dedicated growth tests and updated reporting. Automated verification and browser acceptance remain distinct gates; this is an untested development build, not a release.

## 0.3.0 visual revision

Match the supplied teal/violet ruined-citadel reference as closely as possible using original generated raster assets. Integrate coherent isometric architecture, firelight, four-direction idle/walk/attack actor sheets, projected controls, restrained combat UI, and cinematic view. A numerical 99% visual match has no validated measurement and is not claimed. Preserve existing simulation and saves.

## 0.4.0 combat animation revision

Improve controllable combat feel toward commercial reference principles: genuinely articulated 16–24 sampled motion frames, clear anticipation/contact/recovery, synchronized confirmed-hit feedback, and role-based monsters with fair readable attack patterns. Use original generated artwork and sprite tooling, preserving existing art direction and save compatibility. Commercial equivalence and impossible perfection are not claimed; retain candid verification limits.

### Latest scope and sequence

Complete the Warrior first: idle, locomotion, three-hit sword chain, Whirling Axes Q, War Cry E, dodge, hurt, death, synchronized fantasy-RPG sound and impact. Preserve other existing characters, but defer new class/enemy art rollout until the Warrior passes its gates. Audio is original layered material/noise/resonance sample design rather than the former beep tones, with bounded polyphony, mix dynamics, and opt-in playback. Listening and normal-play acceptance remain separate from numerical audio and offscreen checks.

### 2026-10-08 continuation

The user authorized proceeding without usage checks for this task and reaffirmed dot’s cloud computer as the execution environment. First-Warrior acceptance remains mandatory before the next character or monster rollout. New enemy pattern definitions are retained as unactivated framework source; current expedition monsters keep their prior behavior until that gate.

### Bounded Canvas performance pass

Measure the integrated Warrior renderer offscreen, then add bounded viewport floor caching only if it addresses a measured bottleneck. Preserve depth sorting, fog reveal, frame margins and uncached fallback. Compare stationary/moving output and report CPU timing as offscreen evidence; browser60FPS acceptance remains pending.

## 0.4.1 Korean and player-lifecycle pass — 2026-10-08

Apply natural Korean throughout first entry, controls/HUD, catalog, rewards, growth, death/retreat, resume and repeated expeditions. Preserve stable save IDs, formulas and existing player progress. Review the full lifecycle and distinct play-style/repeat-play motivations; implement narrow verified fixes and clearer next goals. Warrior remains the first character quality gate; monster/roster expansion is not authorized by this localization pass.

Audit source and deterministic journeys while actual browser access remains blocked. Produce Korean game-screen evidence with proper glyphs and responsive layout, clearly labeled as offscreen evidence where applicable. Validate save/resume, first reward, training, equipment, death settlement and retry; distinguish tested logic/layout from human-control gameplay and listening. The 2026-10-08 approval permits the Emberwatch record in the shared generated registry to use projects/Emberwatch and the current Korean metadata; preserve every other project record and path.

## 0.4.2 player-feedback repair — 2026-10-08

The user heard War Cry as a fart-like sound, saw the Warrior face sideways/backwards while travelling, and found footsteps too loud and unsynchronized. Replace War Cry with a licensed human effort voice and controlled accent; keep provenance and listening limits explicit. Correct ordinary travel-facing while retaining locked attack aim. Drive the 24-frame run cycle and alternating foot contacts from actual displacement; reduce footstep level and room send, and cancel steps on stop, wall collision, attacks, dodge, hurt and pause. Validate eight screen travel directions, pointer inactivity/attack transitions and varied movement speeds without expanding characters.

## 0.4.3 footstep level adjustment — 2026-10-08

User feedback requests footsteps 30% louder than deployed 0.4.2. Change only the footstep event gain from 0.085 to 0.1105 (exactly ×1.3). Keep samples, alternating contact timing, cancellation, dry mix, facing and War Cry unchanged. Verify the mixer and movement contracts and publish the narrow update.
