# R11B: bounded battlefield role spacing and response

Baseline build clarification: R11a1 used the inherited R9 channel profile with
no Trial by Fire purchase (E cost30MP). Its four-melee clear was direct E/basic
damage. The same-build comparison can assess role spacing; actual fire response
requires a separately recorded legal augment purchase and remains unobserved.

## Scope and provenance

Local source slice from `0e7231378380820dda88fc42be641287d96d91c0` on
`codex/emberwatch-r11b-roles`. All new distances, triggers and behavior below are
authored Emberwatch tuning, not measured Hammerwatch II rules. The canonical
plan remains represented by the existing requirement trace; its recorded
materialization failure is unchanged.

The motivation is the actual R11a1 Normal review in
`r11a1-normal-input-battlefield-qa.md`: an earned rank4 Hammer/mace build with
Sundering1/Towering1 and four Expert purchases legally burst down east's six
foes in roughly7combat seconds and the200HP boss in roughly5offensive seconds.
No damage-duplication fix is part of this slice. These approximate observations
are not a controlled DPS benchmark.

## What changed

- Only the two east lancer spawn coordinates change: lancer2 `(720,496)` →
  `(624,496)`, lancer3 `(720,400)` → `(816,400)`. The other11 positions stay.
- All B casters and lancers can take a short lateral walk when a visible hero
  closes in. The boss can do so only after releasing its first attack and
  paying its complete recovery timer.
- Existing west masonry remains the physical cover. No tile/room/door is added
  or removed, preserving every previously legal saved position and route.
- B foes opt into the existing Furnace fire response. No shared fire-response
  code changed. A fire escape consumes the role-footwork opportunity too, so
  the two movements cannot chain before another attack.
- Tactics copy explains separate flanks, vulnerable footwork and locked aim.

| Role | Trigger range | Max step | Deadline | Existing speed |
| --- | ---: | ---: | ---: | ---: |
| Hexer / pyromancer | 176 | 48 | 1.5s | 35 |
| Binder | 176 | 48 | 1.5s | 32 |
| Lancer | 148 | 32 | 0.6s | 60 |
| Boss, after first attack | 160 | 48 | 1.2s | 42 |

Distances are world units. Every role has a minimum6battle-second interval,
a released attack required between opportunities, and an80unit tether around
its first footwork-attempt position. A blocked attempt consumes its opportunity.
These are maximums: obstruction, crowding or slow effects can finish a step
short. Re-entry reconstructs transient enemies as it did before; none of this
bookkeeping is added to saved hero recovery or progression.

## Safety and readable commitments

The destination is selected once from two lateral rays and half-length fallbacks,
using actual radius11 floor/swept collision, current LOS and nearby actors. It
never reads the player's input, aim, action or impending hit. Native walking
animation uses the existing moving/walk values. Damage, stun and Shackles remain
active; relevant silence/disarm ends role movement and still suppresses the
attack. No immunity, teleport, healing, HP multiplier or hidden damage reduction
is added.

Windup position, angle, shape and committed attack spec remain unchanged. The
entire recovery debt comes first; on a fractional frame boundary only the time
left after that debt can move a B enemy. Ordinary attacks and path pursuit resume
after the finite step, and no new attack starts in its finishing movement frame.
Old regions retain their existing recovery-frame behavior.

Fire still requires0.55seconds of actual continuous exposure and cannot cancel
a committed windup/recovery. Its existing single attempt is capped at64units /
1second and ordinary speed. Initial E can kill low-HP B foes before a response,
and a surviving slow caster can fail to leave the footprint before the deadline.
This is intentional vulnerability, not a promise that every fire victim escapes.

## Invariants

-13foes; same IDs, gates, objectives, receipts and explicit devices/beacon/report
-2220XP on Normal and326G; all other difficulty scalars unchanged
- Every HP, armor, speed, attack damage/range/timing/status and reward unchanged
- Unchanged map tiles, portal/object positions, travel distances and save schema
- Revenants/bulwarks keep their ordinary melee behavior except the opt-in fire
  response; no global Warrior/growth/skill damage change
- No finishOnslaught, input, main, expert rendering or save implementation edit

## Validation and limitations

The focused suite executes actual production combat, content, geometry,
progression/controller/save and rendering-command handlers. Its artificial
Expert tier/XP, isolated native targets, selected positions and high-HP fire
survivor are explicitly synthetic. These tests are not normal-input play,
an earned-profile balance result, visual animation acceptance or whole-campaign
quality evidence.

The first84case run passed82 and failed2 newly authored boundary assertions.
Those fixtures sampled0.01seconds after release because the production frame
had consumed its remainder; they now stop at the exact release boundary. No
production attack timing was shortened to satisfy them. Both raw runs remain in
`verification-r11b-roles/focused-first.log` and `focused-second.log`.

The expanded pre-final focused run passed196/196. Eight additional native-spawn
map/LOS/walk/re-engagement tests brought the new movement file to42/42. Final
source result is recorded below and in `verification-r11b-roles/focused-final.tap`.
The existing fire-response test now asserts the explicit tender+B opt-in set,
and its non-opt-in loop still covers every older non-opt-in kind; no test was
removed. The new B cases cover the added behavior independently.

No browser, screenshot, listening, Godot, build, registry sync, deployment,
Library upload or remote write ran in this slice. Aggregate/build/registry,
source preservation and ordinary-input earned-build review remain integration
gates. In particular this candidate does not establish that the fast boss
burst or east-yard depth finding is solved; focused fire response alone cannot
make low-HP victims survive their initial hit.

Footwork after recovery also lowers attack cadence while the enemy walks. A
before/after live run with the same earned profile must show useful targeting
and position choices rather than merely extra kiting time or weaker pressure.
The unchanged200HP boss can still die rapidly to legal E1+Q4 burst. Boss-depth
acceptance remains open even though the movement contracts pass.

Final focused source gate:204/204 passed,0fail/skip/cancel/TODO,52.866seconds,
Node24.19.0, serial runner. This includes42new role tests and162retained focused
checks. Source/test syntax and `git diff --check` pass. It is not the full
application aggregate and does not inherit the earlier1827pass count.

Exact final test command, from the project root:

```sh
node --test --test-concurrency=1 --test-reporter=tap \
  app/tests/battlefield-role-movement.test.mjs \
  app/tests/furnace-fire-response.test.mjs \
  app/tests/battlefield-geometry.test.mjs \
  app/tests/battlefield-core.test.mjs \
  app/tests/battlefield-runtime.test.mjs \
  app/tests/battlefield-readability.test.mjs \
  app/tests/battlefield-town-entry.test.mjs
```
