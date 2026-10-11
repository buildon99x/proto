# Recovery movement: canonical integration verification

Date: 2026-10-10 UTC. Status: integrated full test run and syntax verification passed.

The reviewed combat patch, two new test files, and their attack-recovery
reports/logs were integrated into the canonical recovered project. The existing
combat file matched the reviewed baseline SHA-256 before replacement. All
pre-existing source/test files other than combat.js retained their exact bytes
at integration. The latest separate portable-checkpoint UI source and test
changes were preserved. Version labels, build output and release state were
not changed. No browser, Library or remote operation was performed.

Exact commands, from app/:

    node --test --test-reporter=tap --test-concurrency=1 tests/*.test.mjs
    npm run lint

Full test raw output: `attack-recovery-full-integrated.tap`.
Start/end and process exit status: `attack-recovery-full-integrated-status.txt`.
Syntax raw output: `attack-recovery-syntax-integrated.txt` (exit 0, passed).
Copied-file hashes, pre-integration source/test hashes and UI preservation:
`attack-recovery-integration-manifest.json`.

## Actual integrated result

Node v24.19.0, concurrency 1: **2835/2835 passed**, zero
failures, cancelled, skipped or TODO tests. Process exit code 0. The reported
runtime is 544864.340158 ms (about 9 minutes 5 seconds).

The integrated total is taken from the completed TAP summary, not from adding
historical counts. The earlier isolated 71/71 and selected-regression 253/253
results remain separately labeled stage-specific evidence.

Final post-run hash verification confirmed:

- combat.js matches the reviewed candidate SHA-256 exactly:
  a9991e41ea8c1965d5e965b9c650377b3c4dcc1225fa6fdaa37eb526fe917d56.
- Both new tests match their integrated, verified bytes.
- All 178 pre-existing test/support/fixture files are unchanged from the
  latest canonical source captured immediately before integration.
- All existing source files except the intended combat.js are unchanged.
- The separate portable-checkpoint UI source and its updated tests were preserved
  byte-for-byte before and after the complete run.

The full pass is automated handler/regression evidence. Native combat feel,
visual/audio recovery-sliding review and publication are still separate gates.
No version-label edit, build, deployment, browser, Library or remote action
was performed in this integration task.
