# Encounter patterns and combat contract

This is deterministic simulation work for the Warrior-first combat revision. It introduces no new character art or class expansion. Passing the tests below does not establish browser playability, presentation quality, balance, accessibility, or release readiness.

## Runtime integration

Canonical module: `app/src/encounters.js`. No imports, runtime packages, DOM APIs, randomness, or service calls are used. Top-level private identifiers use an `EW_` / `ew` prefix so the existing standalone packager can concatenate the module safely.

Exports:

- `updateEncounterEnemy(enemy, dt, context)` advances one enemy.
- `planEncounterAttack(enemy, {floor})` returns a deterministic plain-object plan without mutation.
- `encounterContains(shapeOrShapes, point)` is the shared world-space player-center footprint test.
- `resetEncounterEnemy(enemy)` clears obsolete attack state with at least 250ms grace.
- `ENCOUNTER_CATALOG` describes roles, ordered attacks, and counterplay.

Example integration into the existing game wrapper:

```js
import {updateEncounterEnemy} from './encounters.js';

function enemyUpdate(e, dt) {
  if (e.type === 'dummy') return;
  // Preserve existing flash, slow, burn/DOT maintenance here.
  // Do not decrement e.timer or early-return for stagger in this wrapper.
  updateEncounterEnemy(e, dt, {
    player:p, entities, floor:run.floor,
    move, chase, solid, lineClear, damagePlayer, projectile,
    canAttack: e => enemyIsOnScreen(e),
    onAttack: (plan, e, event) => {
      // event.type is windup, contact or interrupted.
      // Sound / cosmetic effects may respond; do not apply additional damage.
    },
    onPhase: (e, phase) => {
      // Cosmetic boss phase cue; every subsequent attack retains its full tell.
    }
  });
}
```

The module uses the original callback signatures:

- `move(entity, dx, dy, radius)` and optional `chase(enemy, dt, multiplier)`
- `solid(x, y, radius)` and `lineClear(from, to)`
- `damagePlayer(amount, enemy)`; existing player dodge/invulnerability/armor stays authoritative
- `projectile(x, y, angle, speed, damage, kind, true, options)`

`player`, `entities`, and `floor` are current-frame values. Optional `canAttack(enemy, plan)` can prevent offscreen attack starts while allowing approach movement. Optional callbacks should not mutate the current attack. Enemy status DOT remains in the game wrapper, while this module owns stagger countdown and cancels a committed action on stagger. Boss/knight poise policy belongs to the calling combat system.

Delete the old enemy state branch and `bossUpdate`; otherwise they can double-apply damage. Add the new file to static copy and standalone concatenation before `game.js`, strip its exports for standalone as with other modules, and spread its exports into the isolated runtime-test sandbox. Include `node tests/encounters.test.mjs` in the test script. A persisted old `windup` or `charge` has no automatic contact: the encounter-version migration resets it safely. A current-version snapshot retains its serializable action/telegraph; the ordinary paused resume screen must be dismissed before it progresses.

## Timing and state

All attacks use anticipation → active → recovery. There is no incidental idle body damage. Damaging contact occurs only during active frames, once per melee/zone action; dodge/invulnerability consumes that action's contact rather than allowing repeated damage attempts. Projectiles remain governed by the runtime's visible projectile collision system after release.

Aim for directional lanes, cones, and ranged shots tracks only during early anticipation, then freezes for the final 150ms. Targeted ground circles, rings, and crosses are fixed from the first visible cue. This earlier ground lock is important: a 45px circle tracking a 130px/s player until the last 150ms would not allow a walking escape. Every boss combo step starts a new full warning, including phase changes.

| Archetype | Actions | Tell | Active | Recovery |
| --- | --- | --- | --- | --- |
| Rat | short pounce lane | 360ms | 180ms | 320ms |
| Bandit | hook cut / step thrust | 450 / 420ms | 130 / 220ms | 360 / 400ms |
| Archer | aimed arrow / split volley | 550 / 650ms | 120 / 140ms | 420 / 460ms |
| Skeleton | long spear / bone sweep | 550 / 620ms | 160 / 200ms | 430 / 480ms |
| Mage | locked ground sigil / hollow ring | 720 / 700ms | 400 / 320ms | 430 / 450ms |
| Knight | broad cleave / shield slam | 820 / 800ms | 220 / 200ms | 580 / 600ms |
| Imp | long rush / split fire fan | 450 / 600ms | 300 / 140ms | 440 / 400ms |
| Guardians | distinct form-specific combos | 700–900ms | 160–420ms | 450–600ms |

Heavy circles have bounded radii and full fixed warnings. The 77px Knight slam needs approximately 592ms to leave from its center at 130px/s, leaving about 208ms of its 800ms warning. Targeted circles use 45–65px radii and 720–850ms tells. Thin hollow rings leave an inside safe area. These are analytical timing checks, not player-tested balance claims.

During an action the enemy exposes:

- `actionPhase`: `anticipation`, `active`, `recovery` (or `idle` / `death` outside an action)
- `motionAction` / `actionName`: `lunge`, `thrust`, `sweep`, `shoot`, `cast`, or `slam`
- `actionProgress`: normalized progress over the whole action for a 24-sample motion renderer
- `phaseProgress`: normalized progress in the current phase
- `actionDuration`, `timer`, `aim`, `angle`
- `encounterAttack`: JSON-safe plan, origin, target, aim lock, hit flag and phase time
- Legacy `state`: `windup`, `charge` or `strike`, `recover`, `idle`

## Preview geometry and contact

`enemy.telegraph` is present throughout anticipation and active frames. Recovery, interruption, and death remove it. Its shape is:

```js
{
  shapes: [/* world-space shapes below */],
  locked: true,
  progress: 0.5,       // progress through this phase
  phase: 'anticipation',
  color: '#ef986e',
  name: 'Step thrust',
  attackId: 'bandit-lunge'
}
```

The renderer must project the actual world geometry. An isometric ellipse around the actor is not a substitute for an aimed lane or cone.

- Line: `{type:'line', x, y, x2, y2, width}`. A capsule with semicircular ends; `width` is the full width.
- Cone: `{type:'cone', x, y, angle, r, halfAngle}`. A filled sector in world space.
- Circle: `{type:'circle', x, y, r}`.
- Ring: `{type:'ring', x, y, inner, r}`. The inside hole is safe and must remain visibly unfilled.

`encounterContains` tests exactly these footprints against the player's center. Static melee and ground damage call that shared test directly, with line-of-sight preventing wall penetration. Movement attacks show their entire possible capsule path, then damage only through the swept movement segment during the active window. The lunge never damages the entire warning lane instantly. Body movement obstructed by walls is still restricted to the painted lane for damage.

Ranged attacks show separate capsules for every projectile, including the visible gap between split shots. Their origin, angle, lifetime/range and collision radius are derived from those lanes. Warning width includes the runtime's 10px player hit radius. `solid` clips lanes at walls. Normal collision can reduce a preview's danger behind occlusion; it never adds an unpainted damage region. The runtime must not test a projectile after its lifetime expires or let it damage beyond the shown capsule in an oversized simulation step.

## Distinct counterplay and movement

- Rat: short committed pounce; sidestep, punish the landing.
- Bandit: alternating arc and lunge, with short lateral movement between actions; leave the arc or sidestep the lane.
- Archer: backs away at close range and strafes at its preferred distance; aimed arrow alternates with two arrows leaving a center gap.
- Skeleton: long stationary spear followed by a wider sweep; circle the spear and use its recovery.
- Mage: ground controller; leave the fixed sigil, then move inside its hollow ward.
- Knight: deliberately slow cleave and radial slam, each with a long punish window.
- Imp: a substantially longer dash than the rat, alternating with a forked flame fan.

Nearby commitments are limited to two actors and three attack tokens, held through recovery. Light/support/ranged commitments use one token; Knight and guardian commitments use two. At most one projectile volley is committed at once. Attackers on opposite sides of the player share the same budget; distant inactive rooms do not claim it. These limits avoid every nearby enemy winding up together, without adding unannounced contact damage to waiting enemies.

## Guardian forms and phases

Every guardian has a three-action opening combo and a different four-action second-phase combo. Phase 2 starts after completing the first combo even at full HP, or after an earlier completed action when HP is at or below 50%. This makes phase behavior depend on encounter progression as well as health. The phase transition adds a 500ms breath before the next commitment.

1. Thornwarden (floor index 1): rooted scythe → briar lance → fixed briar bloom. Phase 2: lance → bloom → gapped thorn fan → scythe.
2. Bellkeeper (floor index 3): fixed triple funeral sigils → hollow toll ring → mourning fan. Phase 2: sigils → crossing chimes → hollow ring → fan.
3. Hollow King (floor index 5): long charge → separately telegraphed cleave → fixed falling-crown circles. Phase 2: charge → cleave → hollow ash ring → falling crown.

These forms neither create unavoidable instant radial damage nor spawn an unlimited additional swarm. The room's existing enemy composition still participates under the shared attack budget.

## Verification

Run `node app/tests/encounters.test.mjs` from the project root. The tests verify:

- Seven different ordinary enemy roles and three different boss forms.
- Deterministic sequences, timing bounds, and phase changes at full or low HP.
- No anticipation/idle damage; one melee/zone contact per active window.
- Exactly 150ms of final directional aim lock, including crossed phase boundaries.
- Ground markers fixed from cue onset and walkable exits at 130px/s.
- 3,969 contact decisions equal to their serialized static warning geometry, including a second-phase cross.
- Correct lunge movement/contact timing and a locked-lane sidestep.
- Ranged warning origins, paths, collision widths and lifetime distances agree.
- Wall clipping, line-of-sight, offscreen start gating, two-slot/token limits, and stagger cancellation.
- JSON-safe persistence, obsolete-state grace, and equivalent fine/coarse phase progression.

These tests use pure callbacks. They do not run an actual browser, validate the renderer, audition audio, or prove a fight feels good. Real Warrior playtesting and screenshot/audio review remain required before expanding the player-character roster or claiming the user-facing combat target is met.
