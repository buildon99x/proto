# R14a18 normal-head save validation candidate

R14a18 is the label-final integration of the independently reviewed head-first patch. Only the healthy-head load fast path changes: read head/slot0/slot1 exactly as before, validate the selected slot, and return immediately only if the unchanged receipt predicate matches. Failed/missing/mismatched heads still run full fallback. There is no cross-load cache. Save CAS, Web Locks, staging/head readbacks, version upgrades, corrupt/uncertain recovery, busy command atomicity, 150 ms pending expiry, and >500 ms safety remain unchanged.

## Verification boundaries

The exact functional source passed the full 4,483 tests before release relabel. The original 4,372/4,373 failed run is retained in `../verification-head-first-save/full-tests.log`: one unexplained expert-main-input file-process failure. The unchanged isolated file then passed 182/182 and the fresh default-concurrency full TAP run passed 4,483/4,483. No confirmed OOM/timeout cause or test weakening is claimed. All original logs and phase receipts remain unchanged in the copied proof directory.

After labels changed to R14a18/.18, six affected files ran fresh: build-label UI, tomb UI, wilderness UI, recovery page, recovery storage UI and the new save head-first tests. These passed 215/215, with zero failure/skip/cancel, followed by lint and build exit 0. Only three existing release-string expectations changed. Main/index/recovery runtime differences from the reviewed patch are label-only; save.js is byte-identical. This is not a claim that the whole 4,483 suite was rerun after relabel.

Build: 125 payload files, 16,744,195 bytes; all 124 directly copied source files have matching SHA256, plus the independently checked generated recovery entry. `source-freeze-manifest.json` freezes 371 source/test/metadata entries. Four runtime files differ from frozen a17: save.js and three label-only files. All 14 asset/provenance files and game/input/controller models remain byte-identical.

## Scope of improvement

The actual controller checkpoint traversal count falls from seven full state validations to six, with two decoder calls becoming one. Four command-earned fixture stages retained exact results, storage bytes, read/write sequence and lock call count. The 32 alternating uninstrumented memory-store pairs measured a 12.6–17.0% stage-median reduction. These are cloud Node synthetic checkpoint measurements, not native localStorage/lock scheduling or accepted input latency. Actual browser input expiration is still unverified after this change.

Second-phase identity validation reuse was reviewed only and is not implemented. No new balance, resource/art, control or cancellation policy was introduced. Git/CI/Library and candidate Site publication are separate exact-SHA stages. Original Emberwatch and other projects must stay untouched.
