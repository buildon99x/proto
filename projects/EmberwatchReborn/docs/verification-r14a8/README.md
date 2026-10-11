# R14a8 verification record

R14a8 is a separate unpublished copy of the frozen a7 source. The life-feedback defect was observed on public v58/R14a4 during ordinary first-boss retry. This candidate changes presentation only: dead action labels/native disabled/ARIA states and revival restoration. It inherits other unpublished a5–a7 changes; those remain visually unaccepted.

## Automated sequence
The new dead-action HUD regression contains17 tests that invoke actual production HUD/input/settlement/retry handlers with real controller/store/reducer/combat modules. DOM/audio/storage surfaces and explicit life/empty-inventory cases are synthetic. The overlapping focused298 and standalone17 runs must not be added to the full unique count.

The first aggregate run was3940 tests:3878 pass,62 fail,0 skipped/cancelled,113420.767755ms. All62 were pre-existing objective-only fragment harnesses extracting the newly inserted life declaration:61 `p is not defined`,1 `battle is not defined`. Their scope ends at the production `const entries` declaration. Moving the new HUD-life declaration after that unchanged boundary retained the objective fragment and the full HUD behavior. No assertion was removed or weakened. The initial log is preserved. The final aggregate result is recorded in final-summary.json after completion.

Only normal version expectations in three existing label/UI tests were updated froma7 toa8. The new regression's direct Space test also fails on the unchanged a7 main source, providing a concrete original-defect comparison. See the original logs in docs/r14a8-dead-action-hud-*.tap.

## Source boundaries
source-changes-from-a7.json lists exact old/new hashes. Runtime differences are main.js HUD+build label, index description label and recovery label. All other runtime files, assets, combat, AI, movement, timing, save and balance source bytes are identical to a7. Production code outside updateHud and BUILD_LABEL is unchanged.

## Actual verification still open
- a8 dead/retry screen, real focus/assistive-technology behavior.
- a6 notice clearing, a7 desktop long-label/eight-slot layout.
- a7 read-only body/trace actual display and real-browser frame observations.
- a5 FX full animation/flash0/danger layering and actual sound listening.
- Exact large-body centreline contact rejection on a normally earned profile.

A8 has not been published. Public candidate stays v58/R14a4, and the older root is unchanged. v59 approval remains blocked; no later deployment was used as a workaround. The dot browser local-preview HTTP server was not available through the supported environment path; an existing foreground-tab issue was separately resolved without disabling game protection. No real browser/GPU/display/audio timing is inferred from automated fixtures.

Final R14a8 automated check: **3,940/3,940 unique tests**, 0 fail/skip/cancel, 115268.864147ms; lint and build passed. This includes the existing 3,923 plus 17 new lifecycle tests. Actual a8 browser/FX/contact/frame/audio acceptance remains unverified; no deployment occurred.
