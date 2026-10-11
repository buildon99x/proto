# R11a observed Banner / town-entry correction

2026-10-10 UTC. Local branch from 8aa28eb. This is a bounded repair of two
normal-input QA findings; a new implementation, not recovered source.

## Brief / specification before implementation

The supplied `r11-banner-placed-flash0.jpg` was inspected directly: the live
Protection Banner label is readable while its short muted dash merges with the
blue-green stone floor. Keep the live accepted radius, LOS clipping and lifetime;
change only the static floor casing and dash contrast. No animated glow, new
flash, enlarged gameplay area, extra lifespan or hostile-warning occlusion.

The new town B endpoint (560,528) is 45.25 units from the Furnace freight lift,
50.29 from the Sluice lift and 68 from the Quarry rescue lift. All are inside the
unchanged 76-unit interaction reach. Inspect all existing NPC/portal/prop positions,
map bounds and projected sprite bounds. Relocate only the new B town endpoint and
its own ordinary return arrival. No legacy endpoint, collision room, NPC, prop,
selector priority, interaction radius, gate, reward, save schema or input changes.

The selected town entry is (304,104), in the open northern floor, with ordinary
return arrival (336,160). The minimum distance to any existing town NPC or portal
is 153.07 units, greater than two 76-unit reaches; the return is 64.50 units from
B. Eda's direct path changes from 230.89 to 264.87 world units. This is a separation
repair rather than a play-length measure. B's safe arrival and boss return stay
unchanged. Existing persisted positions remain valid and are not migrated.

## Evidence / authorship

- Canonical requirements are traced in docs/requirements/requirements-source-status.json
  and warrior-completion-checklist.md (Library v2, document v1.1). The canonical
  local file remains unavailable after the recorded HTTP403; no transfer retry or
  byte-verification claim is made here.
- Cached reference `reference-warrior.js` has Banner duration15 seconds; radius is
  explicitly unknown. It is a cached, not newly verified original-game claim.
- Runtime `warrior-expert.js` radius128, centre-distance/LOS, world coordinates,
  76-unit reach, destination selection and all visual colors/widths/dashes are
  authored Emberwatch behavior. No reference or combat balance value is changed.
- The prior screenshot is direct before-state evidence. Canvas-command/geometry
  tests are not corrected pixel QA. The integration owner performs that review.

## Evaluation plan and handoff boundary

Run only focused Node tests for the affected presentation and B town movement,
actual nearest/F handlers, controller/travel/save round trips, old-coordinate
reload and existing B geometry/interaction regressions. Assert exact runtime
radius/expiry, flash0 invariance, wall/fog guards and floor-before-danger order.
Keep renderer inputs immutable. Track actual results below without inheriting
historic pass counts. No browser, engine, full build, publication or remote Git
writes belong to this worker. Parent owns brief/spec/eval integration, aggregate
checks, actual corrected screenshots and Library preservation.

## Implemented authored presentation values

- Boundary casing: continuous `#111420`, alpha0.94, width4.2 screen pixels.
- Same-path inner boundary: `#ead7b0`, alpha0.92, width1.8 pixels, static10/6 dash.
- Floor tint: same warm color at alpha0.06; previous tint was0.045.
- The small existing flag uses the same two strokes. No extra marker, bloom,
  animation or motion-dependent color is added. Other Expert FX styles remain.
- Both strokes are below loot, every hostile tell and actors, including when
  Banner, Flames, Lance, Onslaught and danger overlap. `flashes=0` does not
  suppress the boundary. No boundary is drawn after actual Banner expiry.

## Focused result, 2026-10-10 UTC

Node24.19.0 serial focused run: **103/103 passed**,0fail/skip/cancel/TODO,
4.264seconds. This includes13 new checks (11 town entry and2 Banner) and90
retained checks, not a whole-suite or browser pass.

Executed:

    node --test --test-reporter=tap --test-concurrency=1 \
      app/tests/expert-presentation.test.mjs \
      app/tests/battlefield-town-entry.test.mjs \
      app/tests/battlefield-geometry.test.mjs \
      app/tests/battlefield-readability.test.mjs \
      app/tests/interaction-target.test.mjs \
      app/tests/fire-area-presentation.test.mjs

New town checks verify every retained NPC/portal/prop anchor, open tile bounds,
separate projected arch/NPC/seeded-landmark rectangles, all legally walkable
sampled approach angles and exact representable76-unit boundary points, actual
`stepBattle` movement from five origins, unmodified main `nearest`/`interact`,
real campaign travel and controller/session commits, read-only durable reload,
immediate ordinary-return re-entry and unchanged old-entry/old-return save
positions. No obsolete command at the old B position can remotely activate B.
Town reload preserves schema4, pools, cooldown/recovery, inventory, character,
economy, kills and objective/receipt data. Normal elapsed walking still regenerates
pools/cooldowns; the travel transaction itself does not refill them.

Banner checks execute the actual renderer command stream and the actual combat
handler's placement/movement/15-second expiry, in addition to retained128-radius,
LOS, fog, invalid data, frozen-input, no-duplicate-FX and flash0 assertions.
Synthetic Expert profile setup is disclosed in the existing fixture; it does not
replace genuine promotion or ordinary-input combat qualification.

Initial direct run:28/37 passed,9 failed, preserved with only trailing blank-line whitespace normalized. The new harness had
six VM object-prototype failures, two mistaken schema-name expectations and one
trigonometric76-boundary floating overshoot. Fixes normalize only the test VM
boundary via structuredClone, assert the actual unchanged schema string, and
sample just inside curved reach while retaining exactly representable76-unit
cardinal tests. No production behavior was weakened for those failures. Direct
rerun37/37 passed before the final103-check run. Run outputs are retained beside
this document in verification-r11a-banner-town-entry/.

Syntax checks passed for both modified source and both modified/new test files;
`git diff --check` passed. No main.js, input, save, controller, combat, reference,
original Emberwatch or asset file changed. No browser, engine, registry command,
aggregate suite, full build, deploy, remote push or Library write was run here.
Registry/build and Library preservation remain the integration owner's scope.

## Required parent integration notes

Suggested brief/spec addition: R11a's observed Banner boundary merges with town
paving at flash0 and the new B town endpoint overlaps older lifts. Correct only
its quiet exact-lifetime footprint and the new endpoint/return placement. Keep
legacy map/anchors, reach, selector priority, original saves and balance intact.

Suggested eval addition: source-focused103/103 passed with13 new checks; corrected
ordinary-input pixel/entry review and final aggregate/archival are still pending.
Inspect the warm dashed128 boundary against blue stone at flash0 and mixed
hostile warnings, and walk Eda→new B entrance→ordinary return→re-entry. Review
both old-coordinate reload positions without save migration or input changes.
