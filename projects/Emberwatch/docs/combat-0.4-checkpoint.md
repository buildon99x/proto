# Warrior combat checkpoint — 2026-10-08

Work-in-progress, not a release. The first Warrior must pass animation, audio and actual-play gates before further character or monster rollout. Development resumed on explicit user authorization to proceed without usage checks for this task. All work remains on dot’s cloud computer.

## Saved implementation

- Serializable player attack timeline with delayed contact, three-hit combo, delayed Q/E release, dodge cancellation, hitstop and death state.
- Shared footprint-based encounter framework and crowd budget. Pattern definitions are preserved but broad rollout has not been accepted.
- World-projected warning geometry, impact bursts and reduced-effects setting.
- Warrior motion bake saved: ten24-pose actions in four directions (960 cells), generated axe sprite, source provenance, contact sheets and uniqueness report. Initial bake reports no duplicate cells or edge clipping; anatomical/visual inspection remains pending.
- Original fantasy audio runtime, sample generator, 55-sample WAV atlas and Warrior-focused demo are saved; runtime integration is pending.

## Completed checks before the pause

- Player combat pure tests: exactly-once contact at 30/60/120 Hz and 100 ms stall, cancellation and serialization.
- Isolated seven-class regression and focused Warrior startup/contact/dodge/axes/War Cry/miss/death assertions. These are mocked runtime tests, not normal gameplay.
- Projection/atlas tests from existing renderer.
- Encounter tests, including 3,969 shared-geometry comparisons, aim lock, wall clipping, attack budgets and phase sequences.
- Audio runtime syntax only. No listening acceptance.

## Remaining blockers and fixes

- Motion and audio integration, focused tests, provenance and offscreen visual review are complete. Listening and actual browser review remain blocked.
- Fixed: projectile movement now caps the terminal step to remaining lifetime and still tests that legal final segment.
- Fixed: committed armored foes resist displacement until poise breaks.
- New monster rollout is disabled until Warrior actual-play acceptance; definitions remain unreleased framework.
- Focused source/regression/static/standalone checks pass. Full launcher integration waits on the shared-registry path permission. GitHub source checkpoint upload is in progress.
- Supported cloud browser proxy returned HTTP502 / connection refused. Same-context readiness check failed on a sandbox mount error. Private Site remains login-gated; no login or blocked-route bypass attempted.
- Normal-control gameplay, subjective feel, audio mix, input/persistence/device behavior and60FPS have not been verified. No commercial-equivalence claim.

## Canonical path

All existing source and uncommitted changes are now under projects/Emberwatch as requested. Project metadata points to that exact case. No unrelated repository directory was edited. The generated shared registry still references the former lowercase path and needs an explicit project integration decision before the launcher release build. This source checkpoint is committed separately from actual-play acceptance. Remote publication is verified independently; the game is not labeled complete.
