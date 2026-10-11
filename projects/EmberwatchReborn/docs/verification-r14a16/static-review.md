# R14a16 independent source review

Review date: 2026-10-11 UTC. Scope: the independent R14a16 candidate compared with frozen R14a15, limited to death-overlay containment, dialog background ownership and read-only postmortem diagnostics. The frozen baseline was only read.

## Result

No remaining blocking source issue found in the reviewed patch. This is source/fixture acceptance, not native accessibility-tree or browser acceptance. Full aggregate tests, lint/build and publication remain separate coordinator gates.

## Reviewed behavior

- The HUD menu handler refuses activation behind any open modal and rejects all three existing death indicators: committed `lifeDown`, `battle.dead` and live HP at or below zero. `showMenu` also rejects those indicators before checkpoint or presentation changes.
- The delegated death click route requires the target to belong to the current modal and permits only Retry, Reload and the narrow diagnostic refresh/back routes. Stale menu/save/settings actions and death-time change events cannot expand the dialog or write settings.
- `setDialogBackground` resolves only HUD/world through the modal's owner document; it excludes the modal and an ancestor containing it. Repeated/nested panels preserve the first snapshot. Restore retains previous inert state and the presence/value of aria-hidden.
- Opening remembers the original trigger, renders/focuses the dialog, then blocks background. Closing restores background before restoring focus. Direct successful profile load releases the same presentation lock before alive gameplay or re-opening the death panel.
- Candidate-only postmortem access is shown when frame recording is already enabled. The diagnostic panel offers refresh and return to death, without toggles, clearing, full-menu entry or a resume action. Successful Retry retains the pre-existing transient-observation reset.
- A review finding about errors being hidden inside inert HUD was corrected. Each shared panel now owns a polite status region, and the existing toast function mirrors text into the currently open panel. This covers ordinary retry failure, a retry that fails after navigation into diagnostics, and reload failure, without changing controller dispatch, storage transactions or reload behavior.
- The final delegated-click guard reads `state?.world?.lifeDown`, safely allowing a partial/no-game state through the ordinary non-death routes. Reversing this single optional-chain character reproduces the previously reviewed main source hash exactly; it does not alter a valid game state or relax the battle/HP death guards.
- Main frame processing, strict >500ms safety threshold, frame observer implementation, combat/save reducers, input cancellation and audio/render modules are unchanged from the baseline. The additional index/recovery changes are R14a16 identity labels only.

## Verification evidence

- Final independent focused run against the final guarded source: `node --test --test-name-pattern=R14a16 app/tests/dialog-focus.test.mjs app/tests/dialog-background.test.mjs app/tests/expert-main-input.test.mjs app/tests/dead-save-resume.test.mjs`: **18 passed, 0 failed**. Log: `reviewer-focused-final.log`. The additional case executes alive profile-load restoration and confirms unchanged stored bytes.
- Independent focused run: `node --test --test-name-pattern=R14a16 app/tests/dialog-focus.test.mjs app/tests/dialog-background.test.mjs app/tests/expert-main-input.test.mjs`: **17 passed, 0 failed**. Log: `reviewer-focused.log`.
- Negative-control quality finding resolved: the stale-dead-action test now asserts unchanged death dialog HTML immediately after every attempted action. Frozen R14a15 fails at the first menu attempt with the intended `AssertionError: dead dialog unchanged after menu`, rather than reaching an absent inventory fixture dependency; final R14a16 passes. Evidence: `red-stale-guard-strengthened.log` and `green-stale-guard-strengthened.log`. This strengthens test assertions only; reviewed source is unchanged.
- Earlier independent full dialog suite on the same containment behavior before the final shared-status/identity adjustment: **64 passed, 0 failed**. This earlier result is supporting history, not a final aggregate count.
- Reviewed the six real-controller/store cases, including retry success, preserved save on quota failure, pending-retry diagnostic navigation failure, uncertain-save reload failure/dead reload and rejected stale death actions. Helper tests cover exact restoration and nested ownership; actual dialog tests cover focus/triggers, permitted diagnostic controls and detached targets.
- The initial boundary log recorded three legacy startup-fixture failures; the coordinator was notified that fixtures must provide new presentation dependencies. Legacy dead-action-HUD fixtures also need a current-modal containment boundary. The first full aggregate subsequently recorded 4,372/4,378. The coordinator corrected additional Furnace/Tomb/Wilderness current-modal mocks, changed stale-dead-action expectations from reducer rejection to zero dispatch with preserved save/rewards, and added the safe partial-state read described above. Initial logs remain preserved; final aggregate results must establish the corrected total separately.

## Limits and required supported-browser checks

The test DOM, audio and renderer are boundary probes. The death fixtures use scripted state/reports. Passing them does not prove native AX omission, screen-reader announcements, rendered layout, touch acceptance, audible behavior, responsiveness or stall resolution. No nativeCanvas, isolated Chromium or browser-control action was run for this review.

Verify in the supported published browser that death AX exposes the death controls without the background menu/HUD/canvas; Tab and Shift+Tab remain inside; a read-only diagnostic view returns to death; Retry restores normal controls; and errors remain accessible. Preserve the existing safety-menu and normal nested-dialog focus checks. This patch does not identify or fix the frame-stall cause.

The reviewer changed only this report and its focused test logs. No implementation edit, Git operation, deployment, save import or Library upload was performed.

## Reviewed source hashes (SHA-256)

- `app/src/main.js`: `5aff3ad2e3f74b5fae03b7fd8670dc7d8d045f51584d0ba9bb627379124f0c50`
- `app/src/dialog-focus.js`: `de3b1e79f96f6d53de62d7fb8590ca5107f6b47972ba11ffbaf36f191b445e8c`
- `app/src/index.html`: `8a05e266d7fa9144280be0fd55c94f47fde6cb1577307cb660197b641189f698`
- `app/src/recovery-page.js`: `cd9744244f3818e60bc0ad4f08bd2098051d9066382d89710877b0b3c492293d`
- `app/src/frame-observation.js`: `8b30bbd513cbf4df6fe81f4734100cebbceb849e47f467038e601b6bb3400969`
- `app/src/runtime-gate.js`: `b637099aa0f22259a7dbebaea37c35436fe6fd2564f370bc1ac4086028a3e433`

These hashes bind the source review to the listed bytes. Later behavioral edits require re-review; later test/log updates do not change this source assessment.
