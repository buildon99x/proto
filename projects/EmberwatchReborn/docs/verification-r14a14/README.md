# R14a14 safety-stop containment

This independent candidate begins at R14a13 commit 495c6d3f07b2dbc2970d641b629f2a1dcd2dd4fc. It preserves the frozen source and all original projects.

## Reason and exact scope
Native a13 QA observed repeated safety pauses after rAF gaps over 500 ms while the page was visible and focused. After an automatic full-menu pause, a continuing sequence of fresh gameplay clicks could enter the skill-layout panel. No actual stat or skill allocation change was observed.

Automatic frame-stall, blur and hidden-tab stops now present only Continue and Open full menu. The actual click/change handlers reject background/stale menu mutations until the dialog's explicit choice. The voluntary pause menu remains complete. Esc, Tab/Shift+Tab, native button activation, focus return, checkpoint ownership, failed-save recovery and death-panel replacement remain on their established paths. Opening the full menu adds no second checkpoint.

This is a menu-ownership fix, not a stall/rendering fix. runtime-clock.js still uses its exact  >500 ms condition and dt clamp. No changes to gameplay, controls/bindings, town portal, audio, renderers, motion/art, save models or balances.

## Verification
- 26 new tests execute production handlers in dialog-focus.test.mjs and expert-main-input.test.mjs. The selected safety run is 30/30, 0 fail/skip/cancel. Boundary 500 ms vs 501 ms, four safety causes, real held/deferred cancellation, blocked save, stale click/change denial, explicit acknowledgement, normal voluntary menu and keyboard access are covered.
- Label 4/4, syntax/lint and app build passed. Build 124 files, 16,729,021 bytes with 123 source-copy hashes verified.
- Independent static review found no blocking regression in the intended scope.
- source-integrity.json proves 1,172 archived a13 source files unchanged, 122/125 a14 source files unchanged, and 14 original assets byte-identical. Only main.js, index.html and recovery-page.js differ in runtime source; the latter two contain version-label changes only.
- An initial aggregate had 4,336 passes and 2 version-identity failures because RECOVERY_BUILD still said a13; the recovery label was corrected without changing its behavior. Initial full logs are retained. Final aggregate: 4,338/4,338 passed, 0 fail/skip/cancel. See final-summary.json and full-tests.log. This aggregate supersedes focused counts.

Initial focused logs are retained. One early broader run's only failure was transient a13/a14 label mismatch while metadata was being updated. Deferred-queue assertions were then strengthened and fixed to press the actual configured PoE expert key and use canonical controlsFor(state), establishing a real waiting→idle queue instead of assuming it existed. No gameplay assertion was weakened.

## Performance investigation, separate from this fix
See performance/README.md and benchmark-status.json. New rig masks are bounded and ordinary walking never enters the articulated renderer. One real-browser recorded D 800 ms segment had JS max 278.2 ms but render max 4.6 ms; the corresponding earlier  >500 ms gap itself was not captured by that later sample. Named phases do not cover all synchronous work and exclude GPU/compositor cost.

Two local nativeCanvas full-scene batches were terminated (exit 137), and isolated Chromium could not start because its process socket was not permitted, including one official escalated attempt. These checks are incomplete and not causal proof. No speculative renderer optimization was made. Further native profiling must distinguish full callback CPU, unbracketed preparation/save/audio, browser scheduling/tooling, GC and GPU/compositor work.

## Release limits
No a14 Git write, external source archive or publication occurred during this candidate preparation. Native browser acceptance of the new dialog is pending; the prior a13 screenshots and ordinary-input observations are not a14 acceptance. Full PoE2 parity, long-combat feel and speaker-output audio quality remain open.
