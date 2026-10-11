# Head-first save source patch

## Outcome and boundary

Independent copy of the frozen R14a17 scene-cache project. Production changes are
one hunk in `app/src/save.js`, inside `createStore.load`. A new
`app/tests/save-head-first.test.mjs` contains 50 focused tests. Release labels,
existing tests, state/controller/input/rendering modules and assets are unchanged.
No Git, deployment or Library operation was performed. This is a source patch,
not a relabeled release.

The exact reads `head`, `slot0`, `slot1` still occur before parsing/decoding, under
the same outer exception handler. A numeric head slot selects the first decoder;
a matching receipt returns it immediately. Otherwise, the other slot is decoded
once and the original complete receipt collection, match, descending revision
selection and corruption/empty classifications run unchanged. An invalid primary
is not decoded twice. There is no persistent cache and each returned parsed state
and receipt remains independently mutable.

The decoder, all byte bounds, checksum and semantic validators, save CAS,
staging/readback, head commit/readback, Web Lock, uncertainty handling, upgrade
backup and fence paths are unchanged. Busy, 150 ms input expiry, strict >500 ms
safety handling, gameplay numbers and original resources are unchanged.

## Verified results

- `baseline-red.log`, exit 1: the three optimization-specific tests really failed
  against the unmodified copied source. Normal head slot0 and slot1 loads each
  performed 2 validations where the new test requires 1; direct save performed 3
  where the new test requires 2. These are expected negative controls.
- `new-tests-green.log`, exit 0: the first patched run passed all 50 new tests.
  One ambiguous test display label was subsequently clarified, without changing
  its assertions; the final focused aggregate below includes that final version.
- `focused-tests.log`, exit 0: **823/823**, 21 test files, no skipped, cancelled
  or failed tests. This is the authoritative worker check for the frozen code.
  The coordinator subsequently ran the complete checks below.
- `checkpoint-counts.json`, exit 0: the actual instrumented controller/state/store
  import graph executed one normal checkpoint at each of four existing
  command-earned fixture stages (`entered`, `chosen`, `approach`, `evidence`).
  Every baseline had 7 `validateState` calls and 2 decoder calls; every candidate
  had 6 and 1. Full returned results, stored bytes, storage operation sequence
  (7 reads, 2 writes) and one exclusive profile Web Lock call matched exactly.
  Instrumentation was confined to temporary source copies and removed afterward.

This establishes removal of one unused alternate-slot validation from a normal
two-slot checkpoint. It does not establish native-browser latency, resolve the
observed immediate-input expiry, or eliminate other controller/save costs. Paired uninstrumented timing is reported below; native input acceptance remains unverified.

## New test coverage

The eager reference is the exact pre-optimization load algorithm, evaluated with
the production decoder, checksum and real validator; the candidate is also
checked through the actual imported public store. Instrumentation has no
production test hooks. The tests cover:

- Healthy heads for both slots; exact storage read order and one validation.
- Missing, malformed, primitive and invalid-slot heads; full receipt recovery.
- Both slots with missing/raw JSON/schema/revision/checksum/payload JSON/semantic
  corruption and raw/payload byte-limit breaches, including recomputed checksums.
- Receipt mismatch and semantically invalid primaries decoded exactly once.
- New valid but uncommitted staged slots never promoted; first staging without
  a head, empty storage and both unusable slots.
- Read exceptions on the head and either slot still return `UNAVAILABLE`, stop
  at the same read, and happen before any decoder call.
- Same-revision payload replacement, head-only selection, newly corrupted
  previously ignored alternate, repeat reads and mutation/reload isolation of
  state plus nested receipt data; direct save always revalidates mutated inputs.
- Read-only v1–v5 loads and the current reader's actual first v4 and v5 upgrade
  fences/fallback receipts.

Existing related tests cover conflict, quota/stage/head/readback uncertainty,
controller failure blocking, reload, lock failures, migration/backup races,
portable checkpoints, death/retry and the retained input/safety boundaries.
Some historical v4 tests intentionally use preserved fixture modules; their
passes are not substituted for the new current-reader v4 coverage or the current
v5 backup/fence integration tests.

## Reproduction

From `app/`, run:

```sh
node --test --test-concurrency=2 \
  tests/save-head-first.test.mjs tests/state-save.test.mjs \
  tests/wilderness-controller-save.test.mjs tests/upgrade-backup.test.mjs \
  tests/upgrade-backup-v5.test.mjs tests/upgrade-legacy-reader.test.mjs \
  tests/upgrade-v5-legacy-reader.test.mjs tests/wilderness-upgrade-safety.test.mjs \
  tests/portable-checkpoint.test.mjs tests/action-safety.test.mjs \
  tests/runtime-gate.test.mjs tests/runtime-sync.test.mjs \
  tests/charge-contact-save.test.mjs tests/dead-save-resume.test.mjs \
  tests/expert-save-input.test.mjs tests/expert-main-input.test.mjs \
  tests/skill-loadout-save-input.test.mjs tests/poe2-input-core.test.mjs \
  tests/profile-load-ownership.test.mjs tests/immutable-snapshot.test.mjs \
  tests/wilderness-immutable-cache.test.mjs
```

Call-count reproduction, from the project root:

```sh
node docs/verification-head-first-save/verify-checkpoint-counts.mjs \
  /workspace/shared/emberwatch-r14a17-scene-cache-project \
  /workspace/shared/emberwatch-head-first-save-patch \
  /workspace/shared/r14a15-scene-cost-audit/earned-scene-fixtures.json
```

`save-source.patch` contains the single production hunk. `code-and-tests.patch`
adds the new test file as well. `source-integrity.json` records the frozen hashes
and original-file preservation check. Documentation/logs are separate from the
code patch. The initial focused command had a log-directory path typo and did
not launch Node; the corrected command above is the logged 823-test run.

## Coordinator final validation

- Fresh complete TAP run: **4,483/4,483**, fail/cancelled/skipped 0, exit 0, 267,548.509356 ms. `full-diagnostic.tap` and `.exit` are authoritative. Node default concurrency, original assertions, timeouts and all existing test files were unchanged.
- Earlier default-spec aggregate: **4,372/4,373**, exit 1, unexplained `expert-main-input.test.mjs` file-process failure. This original failure is retained. The isolated file then passed **182/182**, followed by the fresh full success. The first failure cause remains unproven; see `full-suite-diagnosis.md`. Do not label it a confirmed OOM or timeout.
- Fresh lint/build: `final-lint.log/.exit` and `final-build.log/.exit`; original incomplete receipts are not used.
- Source and byte checks: `final-summary.json` and `source-freeze-manifest.json` record the whole-runtime comparison, all original tests and 14 asset/provenance files, manifest-to-source equality, and zero-fuzz application of the two-file patch in an independent a17-based check folder.
- Normal checkpoint benchmark: 32 alternating uninstrumented pairs across four command-earned fixture stages, two warmups per variant/stage. Stage medians changed from 122.48→106.81, 120.46→105.32, 123.93→106.35 and 139.67→115.88 ms, a 12.6–17.0% reduction. All result states/events, stored bytes and exact storage read/write operations matched. Details and limits are in `performance/README.md` and `performance/head-first-paired-results.json`.
- Those measurements use in-memory string storage and an immediate fake exclusive lock in this cloud Node environment. They do not measure browser localStorage/lock scheduling or establish resolution of the observed input expiry. Checkpoint validation traversals fell from 7 to 6; other duplicate validation and busy/input policies remain unchanged.
- `validation-ownership-review.md` evaluates possible later validation reuse only. No unchecked migration, generic-adapter contract change or validation memoization is part of this patch.

The final deliverable remains a **source patch with a17 labels**, ready for parent review and a separately coordinated release integration. It is not a published release. Git, Site and Library remain untouched for this patch.
