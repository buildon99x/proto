# R14a1 integration checkpoint

2026-10-10 20:55 UTC. Separate reimplementation work surface derived from R12a6. Existing original Emberwatch 0.4.7, public root R11b6.1 and public qa-r12 R12a6 remain unchanged. No R13 progression expansion or balance patch is merged.

Completed model/actual-handler checks in this checkpoint:
- 66 actual main handlers (includes prior 50 plus new controls4/mobility/settings/aim/trace cases).
- 445 legacy UI fixture regressions plus 21 added new-profile preset/failed-save/ownership cases inside that total. Existing cases/assertions retained; runtime dependencies updated to real production modules.
- 400 adjacent combat regressions including 98 new POE integration cases.
- 49 controls/core/namespace cases, 11 isolated builder safety cases, 34 latency/FX structure cases.
These independently overlapping focused counts must not be added to claim a unique total. The final full suite is running at this checkpoint; its terminal result is not yet included.

Built qa-r14 candidate only. Source/module/hash/route isolation checks passed; browser deployment and actual normal-input QA of R14 have not begun. Canvas assertions are bounded execution/drawing contracts, not visual quality, audio listening, browser frame performance or fun acceptance.

Controls4 is explicit opt-in with original controls retained. New-game form exposes recommended integrated dodge+hold-sprint and separate Shift sprint for both WASD and click move. Continue/copy does not adopt the new preset automatically. Existing saved progress is unchanged. Controls4 profiles are not claimed backward-readable by old R12 code.

Remaining: actual input QA, real danger/FX readability/flash0/sound, contextual LMB approach/interaction, enemy-body collision semantics, expanded action-slot mapping and complete campaign/AAA quality. Current click LMB is visibly labelled Move Only. Exact private POE2 values are not claimed; authored timing/movement values and official references are in docs/poe2-input.

Final full run (2026-10-10 21:03 UTC): node --test --test-concurrency=4 tests/*.test.mjs, 3,271 tests / 3,271 pass / 0 fail / 0 cancelled / 0 skipped, 135.788 seconds. The earlier complete run had 6 missing-dependency failures in extracted render test fixtures; all six now use real shared runtime/controls factories with original expectations retained. No runtime behavior was weakened to satisfy those fixtures. Exact final log: full-final-3271.txt.
