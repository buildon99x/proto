# R11b enemy release geometry correction

Date: 2026-10-10 UTC. Baseline: `5192eeca1884cd28b46e3db486b334faec2b27a7`.
This is a bounded presentation correction, not gameplay calibration or a release.

## Observed defect and scope

The supplied normal-input Protection boss image
`r11b-protection-boss-fire-inside-4.jpg` was visually inspected. It shows a huge
sword arc during the boss's committed fire line. The handler selected `slash`
for every non-circle attack and supplied `attack.range` when the line had no
radius. For this fire line that meant a 280-world-unit sword arc despite damage
being carried by a moving projectile. Generic slash drawing also substituted
its own 1.05 half-angle and scaled radii for actual cone geometry.

Root/project instructions, current brief/spec/eval and the retained canonical
source-status/requirement trace were read. The canonical plan remains recorded
as Library version2 / document v1.1; its previously blocked local transfer was
not retried or bypassed. Brief/spec/eval were updated before source edits.

## Presentation-only implementation

- The release FX snapshots the exact committed telegraph shape before it clears.
  The existing lifetime remains 0.25 seconds and the existing FX cap is retained.
- A line produces one open three-point directional chevron. Forward extent is
  capped at24 world units, half-width at6, independent of attack/travel range.
  It uses the moving shot's existing9-world-unit visual height. It has no lane
  fill, full-length beam, ring or sword arc.
- Real cone and circle releases use the same outline generator as their locked
  tells, at the committed center and radius. Cones retain their own facing and
  half-angle, including narrow0.28 lances and the boss's broad1.15 sweep.
- These cues use two strokes on the same path: a4-pixel dark casing at72% opacity
  and1.7-pixel existing enemy color at90%, both fading with the existing lifetime.
  No additional glow, flash, particle, texture or asset is used. The authored
  numbers above are presentation choices, not original-game measurements.
- Release cues precede current hostile warnings and actor art. Their geometry
  is fixed over the fade, remains present at flash0 and does not track movement.
  The existing player slash code and every windup tell remain unchanged.

## Verification actually run

Node24.19.0, serial execution, no inherited pass counts:

-24/24 new handler/canvas contract tests pass,0 fail/skip/cancel/TODO.
-185/185 focused related tests pass:24 new plus161 retained,25.904 seconds.
  Retained files: battlefield-role-movement, battlefield-core,
  battlefield-readability, dungeon-boss, tomb-boss-phase, combat-walls and
  expert-presentation. No preexisting test was edited or removed.
- Source/test syntax, parity-script syntax and Git diff whitespace pass.
- Required `pnpm sync:registry` was attempted and blocked at the existing
  `/home/agent/.local/share/pnpm` ENOENT setup failure. No workaround or build ran.

Focused handler coverage includes six locked boss-line directions; exact full
shot payload; delayed13-fire-damage/burn contact;220 speed;352 travel range;
wall interception; a genuine miss after a locked tell;0.25-second cue expiry
while the projectile continues; legacy240-speed/528-range archer; real
cone/circle damage/status; silence cancellation; narrow/broad cones; and the
legacy random boss115-radius circle versus104-radius cone. Canvas-command
checks consume actual handler effects, compare exact projected paths, forbid
fills, retain flash0/current-warning layering, freeze inputs and retain ordinary
player slash geometry. These are scripted contracts, not corrected pixel QA.

## Unchanged gameplay evidence

`app/scripts/check-enemy-release-parity.mjs` loads the actual baseline combat
module from local Git and imports the unchanged dependencies. It asserts the
candidate combat source is byte-identical after replacing only the one release
FX expression. Baseline SHA256:
`833dd00d606f5a590cfe9501511b2a4ea86b83ea04949bf49226bc2c35057a59`.
Candidate combat SHA256:
`a10cfef593a7dab15ad85753926924b9c4488d698a911d6e8b5e30e0914bf787`.

The same script passed48 historical scenarios:12 cases at four frame steps,
with9,156 frame-by-frame deep comparisons of every returned event and the whole
battle state excluding only `effects`. Cases cover line hit/miss/wall/silence,
cone hit/miss, circle hit/miss, old ranged attacks, both old random boss shapes
and concurrent real player attacks. HP, damage, statuses, shot collision/speed/
lifetime, recovery, movement, combat/FX RNG, equipment context and other state
all matched exactly. The snapshot changes no controller, save, input, reward,
foe catalog or original-project file.

## Retained failed evidence and limits

The initial focused run passed19/22; two physical-hit fixtures accidentally
sampled successful native passive shield blocks, and one requested-angle
floating-point expectation differed by approximately3e-14. A second focused
run passed22/24 and the first related run183/185: using seed1 still correctly
triggered the25% passive block. The final fixtures use documented seed1000 for
unblocked physical-hit expectations and the actual committed angle for exact
shot payload comparison. Production code was not changed to satisfy these
fixture failures. Raw failed and final outputs remain in
`docs/verification-r11-enemy-release/`.

No full-suite execution, browser/runtime QA, build, deployment, push or Library
operation ran in this worktree. Native corrected cue visibility, aggregate
integration and final release/preservation remain the parent task's gates.
