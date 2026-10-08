# Existing expedition attack warning contract

This repair describes the existing attacks in `app/src/game.js` as read on 2026-10-08. It does not activate the deferred encounter roster, add monster types, import commercial content, or establish campaign reference-game rules. World-space shapes feed `visual.telegraphOutline` and the matching contact helpers. The previous first-guardian warning was a screen-space ellipse of radius `100 * zoom`, while its damage test was world distance `< 125`.

## Plan and release API

`planLegacyAttack(enemy, player, {floor, time, random, solid, resolveSpawn})` returns a plain JSON-compatible snapshot. It does not mutate its inputs. Inject `random` for replayable tests. `solid(x,y,r)` is the existing wall predicate; `resolveSpawn(type,x,y)` must return the same relocation as `spawnEnemy` so summon markers appear at the actual spawn destination.

`legacyTriggerRange(enemy,floor=0)` provides the same trigger distance without constructing a plan, sampling random values, or querying walls. Use it for the per-frame idle eligibility check, then construct the plan only when a windup actually starts.

The plan contains `id`, Korean `name`, `role`, `color`, `enemyType`, guardian index, pattern, phase, locked `origin`, `target`, `aim`, `windup`, `recovery`, `triggerRange`, `shapes`, and `release`. Its initial clock is `{elapsed:0,released:false,cancelled:false}`. The release object contains `countAdvance`, nullable `contact`, projectile array, zone array, summon array, and nullable `charge`.

- `contact`: `{shape,damage}`. Call `legacyContactHit(plan,player)` only on the successful release event.
- `projectiles`: `{x,y,angle,speed,damage,kind,life,r,maxDistance,wallRadius,shape}`. Use these exact values to create shots. `legacyProjectileStep(projectile,age,dt)` provides a bounded swept segment; call `legacyProjectileHit` on that segment, then remove a completed shot. Do not process a completed shot again.
- `zones`: existing `hostileZone` effect records, plus their circle `shape`. Every random center is chosen at windup and retained at release. `legacyZoneHit(zone,point,age)` is true only after the delay and before total lifetime expires. The warning remains a zone until its expiry.
- `summons`: `{type,x,y}` at locked, resolved destinations. Matching shapes have `purpose:'information'`; they never qualify as damage. A marker's radius is visual information, not an invented attack.
- `charge`: `{x,y,aim,speed,duration,radius,bodyRadius,damage,maxDistance,shape,recovery}`. `legacyChargeStep(charge,age,dt)` returns `from`, `to`, `dx`, `dy`, next `age`, and `done`. Follow this warned straight path; do not use axis-separated wall sliding beyond the lane. `legacyChargeHit(charge,position,player)` retains the strict center-distance collider.

`legacyTelegraph(plan,progress,phase)` returns the existing renderer envelope: `{legacy,id,name,color,locked:true,progress,phase,shapes}`. All coordinates/radii are world units; a line's full width includes the complete player-center danger radius. Rendering can distinguish `purpose:'information'` and the shape `source` (`contact`, `projectile`, `zone`, `charge`, `summon`). Projectile previews show separate capsules so fans and radial patterns retain their safe gaps. A lane is a forecast of projectile travel, not an instantaneous whole-lane hit.

`advanceLegacyAttack(plan,dt,{paused,cancel})` returns `{plan,release}` without side effects. `release` is present once at commitment, regardless of a stalled frame. Pausing consumes no time. Cancellation wins over elapsed time. `cancelLegacyAttack(plan)` produces a canceled copy. The runtime may retain its existing timers instead, but must preserve those single-release semantics.

## Preserved numeric behavior

Damage below is multiplied by the existing actor's `damage`; projectile radii are 4 except fire at 7. Projectile player-center hit radii are therefore 14 and 17 respectively. Wall collision uses radius 2 independently of damage radius.

| Existing attack | Windup | Exact release | Recovery |
| --- | --- | --- | --- |
| Rat/bandit/skeleton/knight | 0.42 s | circle `< enemy.r + 43`, ×1 | rat 0.55 s; others 0.8 s |
| Archer | 0.75 s | 1 arrow at aim; speed 230, life 2.5 s, ×1 | 0.8 s |
| Mage | 0.75 s | 3 orbs at aim + −0.22, 0, +0.22; speed 160, life 3 s, ×1 | 0.8 s |
| Imp | 0.6 s | charge speed 310 for 0.35 s; contact `<25`, body radius 8, ×1 | 1 s |
| First guardian 0 | 1.15/0.85 s | circle `<125`, ×1 | 1.3/0.9 s |
| First guardian 1 | 1.15/0.85 s | 10/16 evenly spaced thorns at locked actor angle (aim fallback); speed 135, life 3 s, ×0.7 | 1.3/0.9 s |
| First guardian 2 | 1.15/0.85 s | 4 rats at cardinal offsets of 50; informational markers | 1.3/0.9 s |
| Bell guardian 0 | 1.15/0.85 s | 3 radius-55 zones; target ±70 each axis; life 1.8 s, delay 0.7 s, ×1 | 1.3/0.9 s |
| Bell guardian 1 | 1.15/0.85 s | 5 orbs at aim + k×0.24 for k=−2…2; speed 190, life 3 s, ×0.8 | 1.3/0.9 s |
| Bell guardian 2 | 1.15/0.85 s | 8 evenly spaced orbs; speed 110, life 4 s, ×0.6 | 1.3/0.9 s |
| Final guardian 0 | 1.15/0.85 s | charge speed 310 for 0.6 s; contact `<55`, body radius 15, ×1.3 | 1 s |
| Final guardian 1 | 1.15/0.85 s | 12 evenly spaced fire shots from angle 0; speed 160, life 3 s, ×0.8; center radius-95 zone, life 4 s, no delay, ×0.6 | 1.3/0.9 s |
| Final guardian 2 | 1.15/0.85 s | 5 radius-50 zones; target ±140 each axis; life 2 s, delay 0.9 s, ×1 | 1.3/0.9 s |

Paired boss values mean phases one/two. Trigger distance remains 250 for ranged enemies, 180 for the imp, `enemy.r+30` for melee, 110 for first-guardian slam, and 290 for other boss attacks. Charge distances without walls are 108.5 and 186 world units. Projectile travel distances without walls are speed × original lifetime.

The existing automatic half-health phase transition summons three biome-native enemies at radius 65 and has no damage contact or attack windup. It is separate from the attack counter and remains runtime-owned; do not treat its decorative ring as damaging geometry.

## Intentional fairness and correctness repairs

Aim, origin, phase, random centers, summon destinations, and projectiles lock at windup. The first guardian's radial base uses its finite `enemy.angle`, matching the previous formula, or aim if no angle exists. Bell guardian's time-based radial orientation snapshots `time + windup`, preserving the nominal release orientation while preventing a later frame/pause from rotating the warned lanes. This deterministic anticipation choice can differ from the old live global-clock angle after pause, hitstop, or a delayed frame. A phase transition during a tell applies its faster cadence to the next plan, not a partially warned attack.

Projectile center lanes end immediately before the first wall under the original tile-corner `solid(...,2)` predicate. Grid boundary probes include even tiny diagonal corner intersections; regular probes support fallback predicates. Runtime must consume `maxDistance` and original lifetime, including the final partial frame, so damage cannot pass beyond the warned travel during a stall. Charge movement similarly uses the planned body radius, stops at its first wall, and caps its last step instead of overshooting or sliding outside the warning.

The previous final-guardian charge returned before incrementing `attackCount`, permanently repeating pattern zero. Every successful boss commitment now carries `countAdvance:1`, including charge; the runtime must apply it once. Canceled windups do not advance. A charge interrupted after commitment has already advanced. This exposes the two already implemented later patterns without adding attacks or changing their values.

Zone expiry is bounded: damage requires `delay < age < max`, preventing the old effects loop's possible extra damage update after lifetime crossed zero. Existing repeated contacts still pass through the runtime's player invulnerability and dodge handling.

Clear the actor's plan and telegraph on stagger, death, resume, lost threat eligibility, and canceled/finished recovery. Knockback during a windup must cancel if it moves the origin; do not quietly re-anchor a warned shape or launch from a displaced actor. A canceled plan produces neither release nor telegraph. Resume starts with no transient plan, projectile, or zone. Pause freezes simulation time. Long warning geometry may clip naturally at viewport edges; require a readable actor/local announcement rather than requiring an entire long projectile lane to fit on a small display.

## Evidence and limits

`app/tests/legacy-telegraphs.test.mjs` checks strict melee/slam boundaries, every existing guardian attack and phase value, projectile angles/speed/lifetime/damage and gaps, charge travel/collider/wall limits, fixed random centers, informational summons, first-wall clipping, tiny diagonal tile corners, lifetime/stall caps, immutable aim/origin snapshots, JSON round trips, canceled/paused/single commitment, final-guardian sequence progression, and projection/inversion at multiple cameras/zooms/viewports. It is logic and projection evidence. Actual published-site guardian combat, visual clarity, and listening require separate browser verification.
