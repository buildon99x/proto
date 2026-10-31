# Implementation plan
1. Establish shared v1 protocol and specification before code (done).
2. Independently implement server/contract tests and procedural 3D client/control tests; fail tests before production behavior.
3. Integrate build/registry and actual OhMyGame existing-folder project; run isolated dependencies and tests.
4. Architecture review, resolve findings with regression tests. Synthetic50/100 per-room load and actual browser QA.
5. Document exact test evidence and run commands. Commit/push designated branch; verify remote SHA; no main merge/live host.
