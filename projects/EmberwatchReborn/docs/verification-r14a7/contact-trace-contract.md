# R14a7 read-only contact trace contract

2026-10-11 UTC. This is a diagnostic aid for ordinary-input contact QA, not a
combat/AI/balance change, proof of AAA quality, or native-browser acceptance.
Only `app/src/contact-trace.js`, its new test file, and this contract belong to
this work item. Existing a5/a6 checkpoints, main.js and visual.js are untouched
by this work item. The integrating task owns UI, build, publication and play.

## Authority and scope

Read: project AGENTS.md, brief/spec/eval, the canonical requirement source-status
and Warrior trace, and the full supplied `docs/poe2-input/user-combat-controls.md`
with implementation/R14a2 contracts. The canonical v1.1 / Library version2 full
local source remains unavailable in this checkout as its source-status records;
this module does not claim to have recovered or revalidated its bytes.

The current task prioritizes human-like play, independent control/aim, contact
clarity, expressive FX and actual-input review. R13 progression and balance stay
paused. This overlay only makes already-existing geometry inspectable. It does
not supply the requested production FX polish or replace normal unassisted play.

`actor-body.js` remains the sole radius/presence authority. All current enemy
bodies, including visually large/non-pushable enemies, have world radius11.
Hero walking/sprinting radius is11; the roll actor body radius is0. Walls retain
their existing radius11 treatment, which this overlay does not draw. Sprite
height/width is never used to expand a collision circle. Values are authored
Emberwatch rules, not measured POE2 internals.

## API and integration

```js
import {createContactTrace} from './contact-trace.js';
const contactTrace=createContactTrace(); // OFF; session-only QA opt-in

// Explicit QA UI toggle. Never enable automatically or persist in combat/save.
contactTrace.setEnabled(true);
contactTrace.observe(battle); // seed current pose; no engine path claim

// Inside the existing allowed simulation branch, AFTER the real stepBattle:
const events=stepBattle(battle,state.character,dt,routed);
contactTrace.observe(battle,{stepped:true,move:routed.move});
// Continue the original event delivery/checkpoint flow without modification.

// AFTER renderer.render(...) has returned/restored its canvas state:
contactTrace.draw(ctx,{
  width:canvas.width,height:canvas.height,focus:battle.p,
  time:battle.time,shake:battle.shake*state.options.screenShake
});

// On battle replacement, profile load, new game, travel/rebuild, or QA reset:
contactTrace.clear();
// On explicit OFF:
contactTrace.setEnabled(false); // clears all prior observations

// Detached, bounded read-only status/report material:
const report=contactTrace.snapshot();
```

An optional `entityVisible(actor)` predicate can be supplied to `observe` using
the same frame's established scene-visibility policy. It receives only bounded,
alive, present, nearby source actors during the call; neither it nor any live
actor is retained. `draw` does not take a scene-visibility policy. Do not capture
again in the same frame merely to apply a later-created policy: another
observation without time advancement correctly discards a previously reported
engine path. Instead call `observe` once after that frame's visibility has been
computed with `stepped` accurately reflecting whether the engine actually ran.
Pause can retain the last picture for inspection without calling observe.

`move` copies a finite vector for review only. It cannot send input, alter the
controller, choose a destination, retarget or change movement. Optional
`frameLimit`/`actorLimit` reduce retention/display limits but cannot raise the
hard maxima. The caller must use the same actual canvas dimensions, camera
focus and already-scaled shake as the renderer; default zoom is the shared
`ISO.zoom`. No extra timer or animation clock is introduced.

`contactTraceToScreen` and `contactTraceCircle` are also exported for focused
projection checks. The former imports the production `projectWorld` and `ISO`,
uses the same .5/.55 camera anchor and shake translation, and applies zero
sprite lift. Circle points are sampled in world coordinates before projection.
A zero-radius roll body is a ground cross, never a visible-radius substitute.

## What observations mean

- Cyan ground circle/cross: current sampled hero body.
- Pink ground circles/crosses: nearest sampled eligible living mob bodies.
- Cyan dashed trail: chords between observed hero positions. Intermediate
  movement is inferred; a chord is not proof of the complete swept route.
- Green line: a detached copy of `battle.poeHeroPath`, from the last simulation
  slice left by the real combat engine. `stepBattle` may subdivide one display
  frame several times. Earlier sub-slice paths are not available here. The
  module neither recomputes them nor stitches the last slice into a full-frame
  sweep. No swept-volume width is invented from an endpoint's body radius,
  especially when a roll ends and radius expands on that frame.
- Dashed yellow/peach diamonds: explicitly `inferred` geometry observations.
  A circle gap at or below .75 world units is a proximity hint; a negative gap
  below numerical tolerance is observed overlap. Their point is the midpoint
  of nearest circle surfaces. This .75 is diagnostic display tolerance, never
  a new collision or attack allowance.
- A bend greater than about10 degrees between nonzero resolved path legs is
  an inferred deflection marker. The path bend is observed geometry; its cause
  is `unknown`. It is not attributed to a particular mob, wall or input.

Every marker includes `inferred:true`, a precise basis and `cause:'unknown'`.
The visible legend says `markers inferred` and `No engine contact events · cause
unconfirmed`. The snapshot reports `engineContactsAvailable:false`. The engine
currently supplies no body-contact event stream. This observer must not be used
to claim confirmed collision normals, solver-contact times, every contact in a
frame, or damage contact. `battle.contacts` counts combat hit feedback and is
not read or relabeled as a body-contact counter. Skill-specific Charge/Onslaught
travel retains its existing contracts; its copied center path is not proof that
normal body-blocking rules applied during that skill.

Legacy control mode is explicitly labeled `reference-only-legacy-wall-movement`
and draws no opt-in engine path. Its displayed body references do not claim that
legacy walking collides with them.

## Mutation, lifetime and work bounds

- OFF `observe` and `draw` return before reading their battle/options/context/
  viewport arguments. OFF snapshot is a shared frozen empty result. No canvas
  calls, scan, projection, callback, timer, sample allocation or battle reads.
- ON stores only detached scalar values/coordinate copies. No battle, actor,
  map, options, callback, action, controller, event array or scene references.
- Never calls movement/preview solvers, input APIs, event emitters, save APIs,
  audio APIs, clocks, RNG or DOM. No simulation fields are written.
- Dead/zero-HP, absent gated, invalid-coordinate and out-of-range enemies are
  excluded. Dormant living bodies remain, because they really block opt-in
  locomotion. Optional scene visibility can further filter the set.
- Hard maximum96 hero samples,24 nearest bodies,128 enemy entries scanned per
  observation,33 final-slice path legs,32 circle segments,160-world-unit
  observation radius. Scan/body/path truncation is disclosed in the snapshot
  and visible QA legend. Retention is sample-count-based, not seconds of video.
- Nearest24 selection is bounded within the first128 entries; scan truncation
  means a closer body beyond that cap can be omitted and is not certified absent.
- Only the latest bodies/path/markers are retained. Markers are at most24
  proximity markers plus32 path bends. No unbounded per-enemy tracks.
- `draw` uses internal copies directly rather than allocating a public snapshot
  every frame. At hard maxima it has a fixed upper bound of1,367 stroked path
  vertices:96 trail +66 path +825 circle +100 center crosses +280 marker
  vertices. Four static text lines at most, no fills/glows/images/particles.
- Disable and explicit clear drop history. Region/life changes, time rewind,
  invalid/dead hero and displacement over160 units also reset the trail. A
  same-region/same-time replacement still requires the explicit clear above.
- Canvas save/restore isolates alpha/filter/style/dashes. Diagnostics have no
  flash/pulse and stay static at flash0; shake follows the actual existing option.

These operation bounds are not a browser frame-time claim. The integrating task
must measure actual frame cost, verify native normal-input frontal contact and
slide/roll behavior, and assess the real pixels at normal/reduced FX. The new
local candidate has not received native-browser visual acceptance in this work.

## Verification executed

2026-10-11 UTC on this candidate's source:

- `node --check app/src/contact-trace.js` and the new test file: passed.
- `node --test app/tests/contact-trace.test.mjs app/tests/actor-body.test.mjs app/tests/poe2-aim-projection.test.mjs`:106/106 passed,0 failed/skipped/cancelled/TODO,
  approximately2.484s.32 are new contact-trace tests;60 existing body checks and
  14 existing aim/projection checks are exercised, not inherited pass counts.
- Real production `moveActorBody` verifies front stop, tangent slide, overlap
  non-correction, rolling point body, and final-slice-only reporting.
- Real `stepBattle` and `acceptBattleInput` are run at30/60/120Hz with walking,
  rolling and attack input. Tracing ON/OFF produces identical events, serialized
  combat state, mobility snapshots and durable `battleReport` every step.
- A separate active enemy attacks through its real AI/tell/release/defense/damage
  handlers; tracing preserves the exact event stream, HP/RNG and checkpoint.
- Frozen source and mutated output tests prove no retained live/output aliases.
- OFF throwing proxies prove no disabled input or canvas reads. Bounded scan
  uses a forbidden next-index getter to prove it never escapes the cap.
- Actual `createVisualRenderer` warning-circle coordinates and shake are matched
  to the QA body's world-circle projection. Inverse projection checks cover
  mobile/desktop viewport sizes, camera changes, zoom, radius11 and radius0.
- Canvas state restoration, invalid-view rejection, explicit inference labels,
  no flash/fill, duplicate/pause handling, reset boundaries, source path
  validation, nearest-body selection and truncation disclosure are checked.

Focused checks do not claim the aggregate game suite, persistence/UI integration,
publication, end-to-end human play, listening, AAA-quality acceptance or measured
60FPS. Those remain the integrating task's independent gates.
