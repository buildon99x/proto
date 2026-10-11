# R14a6 extracted-fixture dependency correction

The parent-run initial full suite reported 3,701 passes and 152 failures from 3,853 tests (108.170 seconds, zero cancelled/skipped). The exact original log is preserved unchanged as initial-full-3701-pass-152-fixture-failures.txt; initial-full-fixture-failures.json lists every failing test with original file, line, name and error.

## Exact failure groups
- furnace-ui-integration.test.mjs: 56 failures
- pass-prerequisite-copy.test.mjs: 7 failures
- pause-travel-ui.test.mjs: 10 failures
- quarry-completion-ui.test.mjs: 22 failures
- resource-display.test.mjs: 16 failures
- signal-prerequisite-copy.test.mjs: 18 failures
- signal-ui-integration.test.mjs: 23 failures

## Missing dependencies
- TypeError: Cannot read properties of undefined (reading 'recoverySkillId'): 89
- ReferenceError: $ is not defined: 47
- ReferenceError: dismissRecoveryNotice is not defined: 16

## Correction
- Added an empty toast DOM node and noticeUntil=0 to furnace-ui-integration, signal-ui-integration and pause-travel-ui, retaining their existing DOM lookup.
- Added the toast node, the $ lookup and noticeUntil=0 to pass-prerequisite-copy, quarry-completion-ui and signal-prerequisite-copy.
- Injected the actual imported dismissRecoveryNotice, the existing $ lookup and noticeUntil=0 into resource-display’s unchanged extracted production event loop.
- No production JS, handler implementation, expectation, assertion, skip, timeout, fixture game state, or test case was altered. All seven files’ complete top-level test sections are byte-identical to their pre-fix copies in fixture-originals/.

## Verification
- fixture-dependency-focused.txt: 185/185 pass, zero failures/cancellations/skips, 7.353 seconds. This executes the complete seven affected test files, including their 33 originally passing cases.
- fixture-dependencies-only.patch contains only the seven setup corrections. The main recovery-notice.patch and manifest.json now include these dependencies.
- All changed test files pass node --check. Production main.js and action-feedback.js SHA-256 values are unchanged from the initially verified notice candidate.
- The full suite was not rerun by this worker. The parent owns the integrated rerun; 185 focused passes do not establish an overall 3,853-test pass.
