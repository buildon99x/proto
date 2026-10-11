# R10a1 bounded Tomb guidance correction

2026-10-10 UTC. Source-only follow-up to the parent's ordinary-input review of **R10a, exact `a4c79e2`, Site v34 `/qa-r10/`**. That live candidate is unchanged by this task. This task did not use a browser, publish, access Library, write a Git remote, change generated build output, or claim corrected-build ordinary-input acceptance.

## Observed problems and correction

The integration owner reported these actual R10a observations. This worker verified the matching production presentation branches, then added executable UI regressions before changing them.

1. **First T acceptance looked like a return visit.** Before any T entry, the town objective said “신호 묘실로 돌아가 조사 계속하기”. Progress does not supply a dependable prior-visit fact, so all off-region T travel now uses the neutral “신호 묘실로 이동해 조사하기” and “묘실에서 할 일”. No new visit flag or save field is introduced.
2. **Eda repeated the entire active T goal.** When a T card exists and first-patrol reward is already claimed, the first-patrol paragraph is now a short completed-history statement. The current T goal appears once. Without a T card, the existing campaign-guidance paragraph stays. The unfinished-patrol text, disabled-untrained acceptance, six-kill report gate, claim buttons and once-only reward handlers are unchanged.
3. **Completed Pass history denied implemented regions.** The Pass card and completed Pass guidance now say that its report/reward is finished and the S/F/T investigations are connected. Expert/Master promotion and the campaign ending remain explicitly unimplemented. The completed title no longer calls all later regions unfinished. These are current-source scope statements, not an expansion of implemented content or acceptance.
4. **Solved glyphs still described a reset that was no longer possible.** At sequence completion, the clue/journal, projection reread and glyph cards omit prefix-save/wrong-input reset instructions. The full order, completed 3/3 status, already-paid reward, persistent reread and nonconsuming tools remain visible. Before completion, the exact penalty-free wrong-input guidance remains.
5. **The lower socket asked for an already-carried ward.** Lower-socket copy now distinguishes missing ward, carried ward with foes remaining, all three foes cleared, connected midpoint with upper foes remaining/cleared, and fully sealed ward. Upper socket, carried-ward origin and current-goal copy also recognize completed pockets instead of asking for another clear. Oath copy distinguishes unfinished seal, sealed but living boss, defeated boss, explicit pickup, and completed Eda report.

All changes are authored Emberwatch presentation wording. No original-game rule, newly measured balance fact or new asset is asserted.

## Implementation boundary

- Production files: `app/src/tomb-presentation.js`, `app/src/pass-presentation.js`, and one Eda presentation expression in `app/src/main.js`.
- Regression files: `app/tests/tomb-ui-integration.test.mjs` and the existing travel-copy assertion in `app/tests/tomb-presentation.test.mjs`.
- No reducer, progression/XP, economy, reward amount/receipt, geometry, renderer, input routing, save schema/namespace or command validation changes. Existing object action eligibility and completion flags are unchanged.
- `AGENTS.md`, `brief.md`, `spec.md`, `eval.md`, the canonical source-status record/checklist, R10 gap update and T handoff plan were consulted. Canonical Library v2 / document v1.1 local byte materialization remains the previously recorded HTTP 403 limitation; it was not retried or claimed newly verified. The integration owner maintains the shared brief/spec/eval and external checkpoint.

## Executed regression evidence

The new tests execute the **unchanged production `main.js` functions and click listener**, production views, controller, store, reducers and battle/world helpers through the existing UI harness. DOM, audio and scheduling are explicit boundary probes. Locations and enemy-defeat reports are scripted fixtures; all prerequisite XP, tools, levels, tiers and quest flags are earned through production commands. This is not normal-input combat or pixel review.

Before the correction, the initial eight new UI tests produced **1 pass / 7 failures**. The passing control covered first-patrol acceptance/report and duplicate-reward protection. The failing tests reproduced the travel title, Eda duplication, Pass scope, solved-clue reset warning, lower/upper ward and oath-copy mismatches. A ninth test subsequently added the carried-origin/current-objective already-cleared-pocket cases.

An intermediate corrected run had two fixture failures: reported characters were still in town, so the real object handler correctly returned no Tomb panel. The tests were fixed by returning through the production town-to-T travel handler before opening those completed objects. Production region/proximity guards were not loosened.

Final focused new-test run: **9/9 passed**, zero failures/skips, 3.258 seconds.

Final related suites ran separately and sequentially against the corrected source:

| Command, from `app/` | Passed | Failed / skipped | Duration |
| --- | ---: | ---: | ---: |
| `node --test tests/tomb-presentation.test.mjs` | 16 | 0 / 0 | 5.971 s |
| `node --test tests/tomb-ui-integration.test.mjs` | 83 | 0 / 0 | 15.700 s |
| `node --test tests/pass.test.mjs` | 43 | 0 / 0 | 6.312 s |
| `node --test tests/campaign-guidance.test.mjs` | 8 | 0 / 0 | 0.363 s |
| **Unique tests in these suites** | **150** | **0 / 0** | **28.347 s** |

The 150 include the nine new checks; do not add the focused rerun again. No old lost-source pass count is inherited. `node --check` passed for all five modified source/test files; `git diff --check` passed.

The retained tests exercise wrong/stale/repeated glyph input, actual Eda report, repeated reward refusal, pause/navigation/save boundaries, dead/retry state, retained paid resources and immutable views. The new first-patrol control additionally executes the rendered accept/report buttons and a stale duplicate claim through the real click listener, confirming one 70XP/20G patrol reward and unchanged saved state after repetition.

## Still required by the integration owner

1. Integrate the shared brief/spec/eval, run final aggregate checks/build and original167-file preservation checks, and archive source/tests/provenance externally.
2. Keep the current public R10a candidate unchanged until a separately authorized, verified R10a1 publication.
3. On that corrected build, recheck the actual first acceptance, Eda dialogue length/history, solved-clue reread, both ward sockets before/after clears and connection, and boss/oath/report panels through ordinary input.

No full-suite, fresh build, browser, audio, mobile, Expert/Master, whole-campaign or quality-completion claim follows from this bounded correction.

## Owner final integration
R10a1 app0.10.0-reimplementation.2. Full aggregate1246/1246 passed,1237 retained plus9new,140.547s sequential,zero fail/cancel/skip/todo. Source/test syntax, static build and original167 Gitblob/SHA256 integrity passed. Registry/Vercel attempted, unchanged pnpm-home ENOENT blocker recorded in verification-r10a1 logs. Normal R10a full route is in r10a-normal-input-tomb-qa.md; corrected copy actual review remains pending publication. Exact candidate excludes unintegrated Expert worktrees.
