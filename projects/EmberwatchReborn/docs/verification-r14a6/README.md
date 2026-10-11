# R14a6 recovery-notice candidate

## Result
The 3.3-second recovery-too-early toast previously outlived the rejected input and remained during the same held skill's later successful start/contact. Only that transient recovery notice now stores its rejected skill ID. A matching real actionStarted clears it. Another skill's success, a not-ready/resource rejection, or a later generic message cannot clear it. Menu, blur, death, other input-safety boundaries and normal expiry retire the recovery notice. A rejected tap that never starts keeps its existing lifetime.

Production changes: app/src/main.js and app/src/action-feedback.js. Tests: app/tests/expert-main-input.test.mjs. brief.md, spec.md and eval.md contain the scoped contract. The parent can apply recovery-notice.patch from project root. No release label/package bump, deployment, Git write, or source edit to the frozen parent project was made. All other app/src bytes match the frozen base; manifest.json lists exact hashes.

## Fresh evidence
- notice-focused.txt: final 24/24 pass, zero failures/cancellations/skips, 12.957 seconds. Includes LMB and remapped F, roll and hammer recovery, 30/60/120 Hz, both orders of simultaneous LMB+Space held for 1350 ms, contact, release-without-repeat, rejected tap expiry, matching new press, different skill, superseding notice, menu/blur/death and genuine save failure.
- handler-compatibility.txt: 206/206 pass, zero failures/cancellations/skips, 65.627 seconds. Runs expert-main-input, attack-recovery-lifecycle, dead-save-resume and profile-load-ownership. This includes the first 22 new notice tests; the final focused run adds the two 1350 ms cases. Counts overlap and must not be added. Production source was identical for these runs.
- original-negative.txt: 12/12 focused held-resume cases fail against an untouched R14a5 source copy specifically because the old Korean recovery text remains after successful actionStarted. No missing API or synthetic failure accounts for those 12 failures.
- The first negative-copy setup omitted assets/audio-manifest.js. Its separate original-negative-fixture-missing-manifest.txt records that setup error; after copying the original manifest unchanged, the actual 12 assertion failures above were obtained.
- changed-syntax.txt: all changed JavaScript source/tests passed node --check.

Tests execute real production toast, event delivery, keyboard/mouse handlers, frame, combat, controller, save and safety paths. Their DOM classes and audio/render boundaries are probes, and progression is a scripted earned-state fixture. They do not establish browser pixels, audible output, input-device timing, or game/campaign quality.

## Remaining integration gates
Full aggregate regression, final lint/build, browser candidate QA, Library checkpoint and any authorized release remain with the parent. No heavy full suite or browser was started here. Combat timing, skills, costs, damage, cooldowns, recovery, save schema and balance were not changed.

## Extracted-fixture dependency follow-up
The parent’s first full run returned 3,701/3,853 passes; 152 tests in seven older extracted UI fixtures lacked the newly read toast node, $ lookup or imported dismissRecoveryNotice. The exact initial log and per-test failure list are preserved here. Only fixture dependency setup was corrected; production code and all prior test assertions remain unchanged. The seven affected files now pass 185/185 focused tests (7.353 seconds). See fixture-dependency-correction.md and fixture-dependencies-only.patch. The parent owns the pending full rerun.

## Parent integration check (2026-10-11 00:36 UTC)
After completing all seven old fixture DOM dependency corrections, the entire current candidate suite passes 3,853/3,853, no failures/cancellations/skips, duration104855.259129ms. Lint passes. The count is 3,829 prior unique tests +24 new notice cases; focused runs overlap and are not added. Source still deliberately carries R14a5 labels because this is an isolated unpublised notice patch, not a newly released app. Build/release labeling and real browser regression remain pending. Public v58/R14a4 and saved-but-blocked v59/R14a5 are unchanged.
