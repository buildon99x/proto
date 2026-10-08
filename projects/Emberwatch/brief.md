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

## 0.4.4 footstep level adjustment — 2026-10-08

User requests footsteps another 20% louder than deployed 0.4.3. Change only event gain 0.1105 × 1.2 = 0.1326; retain samples, contact synchronization, cancellation, dry send and all other sounds. Verify the existing contracts and required builds before publication.

## Campaign transition — plan v1.1, 2026-10-08

Canonical user plan: Library libfile_52344aab47a48191aa0d9b86f5192591 version 2, updated 2026-10-08 14:07 UTC, 56,360 UTF-8 bytes / 623 lines. The later (3) copy has identical text. This supersedes the expedition expansion objective: create a connected campaign action RPG inspired by Hammerwatch II (2023), not Heroes of Hammerwatch II.

Exactly three campaign classes: warrior→Paladin, mage→Wizard, archer→Ranger; no gunner, Rogue/Warlock mixing or new subclass invention. Complete the Warrior vertical slice first, then one enemy before further presentation rollout. Preserve existing original rendering/motion/audio, Korean UI and 0.1326 footstep gain. Isolate campaign.v2 saves and retain the legacy raw save without automatic conversion.

M0 gates: frozen 0.4.4 baseline, sourced three-class/four-tier catalog with confidence/unknown fields, save isolation/atomic recovery. M1: Warrior four independent actions and meaningful tier/branch/equipment/resource choices across 15–30 minutes. M2: authored hub/two fields/three-floor dungeon/optional caves, tool-gated revisit, quests/puzzles/shortcuts and persistent world. M3: seven-slot gear, linked trading/crafting/enchantment/consumables and higher tiers. M4: Mage/Archer four-tier completion. Four-player co-op remains M5 and is not claimed.

No unresolved reference number becomes a claimed original rule. Death loss, exact promotion NPC conditions, respec pricing and rounding remain UNKNOWN until verified. Only functional facts are reimplemented; no copied commercial art, maps, writing or audio. Actual normal-control journeys, build choices and revisits are required for release/fun claims; logic tests alone do not satisfy them.

### M0 implementation boundary and next independent cores

The unreleased campaign foundation stores world, character and inventory together, with a verbatim legacy backup, proven-commit recovery and Web Lock serialization across tabs. Reference catalogs remain data-only until their unresolved activation rules are verified. Add immutable authored world/quest commands and provenance-bearing seven-slot inventory/economy operations as independently tested modules; these do not by themselves enable new heroes or claim playable content. See docs/campaign/checkpoint-M0.md for current evidence and gaps.

## 0.4.5 actual-browser first-entry review — 2026-10-08

The user explicitly authorized making the existing Emberwatch Site public for dot-browser testing. The0.4.4 baseline is now accessible without authentication; the new campaign remains isolated source. Actual normal input has verified initial entry, movement, attacks/Q, first chest, equipment gain and equip, death/retry, pause and reload/resume.

A seed-dependent onboarding failure is reproduced: nearby enemies activate while the player practices in the first room; some begin through blocked line of sight and arrive later. Do not claim the first desktop screenshot proves invisible attackers. Short/portrait views independently permit offscreen legacy attack releases. Add one-way starting-room protection, ended by first departure or a confirmed hit on a real enemy; preserve that state across new saves and default old saves to protection off. Require revealed/readable threats and a short visible interval before enemy windup/release, preserving pursuit toward a readable location. Do not activate the unverified expanded monster roster.

Also make the documented J keyboard auto-aim independent of stale pointer hover, while explicit mouse attacks retain their aim. Gate resume on visual readiness just as fresh starts, avoiding mid-input projection changes on a cold load. Preserve Korean UI, legacy progress, motion poses, licensed War Cry and footstep gain0.1326. Reproduce failures in focused tests, then build/publish and repeat actual browser journeys. No release-quality or original-game-equivalence claim follows from this narrow repair.

## Existing-attack warning repair from guardian playtest — 2026-10-08

Normal-control play reached the first guardian. The old visual renderer uses one screen-space ellipse for every legacy windup, while melee/slam collision and projectile trajectories use world-space distances. The guardian's125-unit slam therefore extends beyond its displayed warning; ranged and summon phases also look identical. Repair the existing attacks using shared world-space warning geometry and locked release plans, retaining their current damage/cadence/counts. Represent circle, charge lane, projectile fan/radial lanes and delayed zones according to their actual behavior. Snapshot random zone/spawn positions before release and cancel transient plans cleanly on interruption/death/resume. Play existing sampled enemy tell/release cues on those events. Do not enable the deferred multi-role monster framework or claim new actor animation completion.

Verify collider/warning agreement, canceled release, all three existing guardians, camera projection and boundary cases in focused tests, then repeat the actual first-guardian fight on the published repair. The authored Hammerwatch II campaign and its unresolved original-game numeric rules remain separate.

### Independent first-Warrior campaign art preparation

Prepare new original mace/hammer art and campaign-specific Warrior motion while numerical reference gaps are resolved. Reuse the existing original armor and articulated rig, with24 genuinely varied poses per principal clip and four established facings. Add shield raising/holding/recoil, committed shield charge, mace swing and hammer cast. Keep stable anchors and contact markers; do not infer damage timing from frame count. These assets remain unactivated until campaign runtime and normal-play acceptance. No other hero or enemy art rollout is included. Preserve image-generation provenance, transparent bounds and honest articulated-animation limits.
