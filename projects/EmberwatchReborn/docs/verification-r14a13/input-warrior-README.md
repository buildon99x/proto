# Warrior caster, gait and hammer presentation patch

Source patch ready; not deployed. Work began2026-10-11 11:24:42UTC with a20-minute audit of code, real sprite pixels, frame counts, sound structure and a new public QA profile. Baseline original project and every owned resource remain untouched.

## What changed

- Reused the owned hero.png anatomical rig instead of slicing the sprite horizontally. Upper attack/cast poses and two articulated leg chains can animate independently. Legs read the existing collision-resolved p.walk counter; no simulation or input hunk changed.
- Hammer holds a compact hammer silhouette before its true release; healing uses an empty hand near the body; Judgement uses the overhand strike; banner uses the raised salute. The existing3-hit basic combo keeps its contact. Guard/charge have a restrained brace using source anatomy.
- The actual flying/returning hammer is a recognizable compact silhouette with a short current-velocity wake. New decorative glints vanish at flash0/reduced. No damage/collision radius or hostile warning logic changes.
- Existing atlas fallback remains. The optional rig cache is bounded to1.2million pixels; actual four-direction cache295,745pixels. No new image/audio/font file is shipped.

## Final verification

4,205/4,205 unique tests passed,0failed/skipped/cancelled,135757.92998ms. This includes4,138baseline+67new. Focused229 is included, not added. Lint and build passed;123built files,16,714,321bytes;122source-derived files byte-compared successfully.

Each of6skills×4directions has24actual distinct rendered pixel samples and24distinct meaningful joint signatures, excluding root translation and opacity from joint uniqueness. All576sampled cells have no edge clipping. Neutral poses shared between different skills are not claimed globally unique; final-summary.json records the global hash count. Display refresh and actual skill duration can skip samples. No duplication was added to inflate source frame count.

Offscreen comparison sheets cover all four directions, distinct start/contact/recovery, independent leg gait, guard stance, and a hammer overlapping an existing hostile warning at flash0. Actual native Canvas render timing is recorded separately and is not a browser/GPU benchmark.

## Evidence and handoff

- warrior-source-tests.patch: only four source files plus67-case test file
- source-freeze.json: exact frozen hashes and shared-hunk boundaries
- final-summary.json: final machine-readable results and limits
- initial-findings.md / baseline-final-summary.json: audited present/gap/unverified distinctions
- candidate-skill-caster-strip.png and baseline-skill-caster-strip.png: real handler states rendered through production code
- candidate-direction-0/1/2/3-24frames.png: all24poses per skill/direction
- candidate-independent-leg-strip.png: fixed upper pose with distance-driven legs
- candidate-guard-directions.png: retained restrained source-art stance
- baseline-hammer-warning.png / candidate-hammer-warning.png: local projectile silhouette and danger visibility
- verify-warrior-pixels.mjs / candidate-pixel-validation.json: actual source-pixel checks

Public baseline QA used only qa-warrior-presentation-20261011-1125. Training, quest acceptance,3patrol kills,flash0/shake0 and explicit save were verified; the profile remains paused. A Chrome error9 interrupted one attempt; reload/resume and a bounded retry succeeded. Its root cause is unconfirmed. This does not establish candidate browser acceptance.

## Remaining gaps

No subjective hearing or physical display/speaker latency measurement. No Git or deployment. Integrated candidate crowded-play/performance acceptance is still needed. Onslaught retains its existing pulse mapping. The original basic weapon is sword artwork despite the mace skill name. The shield stance is a limited adaptation of occluded source art, not a new fully drawn forward-shield animation. PoE2 internal timings, numerical equality and overall commercial production quality are not claimed.

## Integration review addendum

The integrator identified a narrow precedence gap after source freeze: an active guard with hurtTime > 0 can obscure the existing hurt pose. The frozen standalone 4,205-test suite did not cover that combination. The R14a13 integration owner is adding a null-return fallback to the existing hurt renderer and a real-handler regression test. Frozen source and patch hashes remain unchanged; integrated verification is pending the integration report.
