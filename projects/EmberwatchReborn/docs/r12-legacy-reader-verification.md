# R12 schema5 actual R11b6 reader verification

2026-10-10 UTC. This is a bounded source/API gate. No browser, live-profile,
publication, visual/audio, gameplay-depth or whole-campaign acceptance is claimed.

## Historical identity

- Historical source commit: `17b13fa04fec8336d2c08f3c4603a0d2e8d00276`.
- Historical project: Reborn R11b6, app `0.11.0-reimplementation.9`, state version4.
- Fixture: `app/tests/fixtures/r11b6/`, 41 exact-byte files, 463,105 bytes.
- `fixture-manifest.json` records every original `app/src` path, byte count,
  SHA-256 and Git blob ID. Files were extracted directly with `git show` from
  the pinned source commit, without editing any historical module.
- The actual old save, state and controller import closure evaluates 40 modules
  in an isolated VM realm. The extra `main.js` is only the R11b6 build-label
  provenance check and is never evaluated. All files are checked against their
  manifest SHA-256/byte count/Git blob before execution and SHA-256 afterward.
- These are preserved production source modules. A separately tracked historical
  `app/dist` does not exist at that commit, so this does not claim independent
  comparison with downloaded deployed bytes.
- Existing R7a4 fixtures are unchanged. The retained v3→4 test suite uses frozen
  R11b6 as its historical current reader; it is not relabeled as schema5 coverage.

## Command and observed result

From `projects/EmberwatchReborn/app`:

    node --test --test-concurrency=1 tests/upgrade-v5-legacy-reader.test.mjs

Observed at 10:11 UTC: **1/1 Node test passed**, 0 failed/skipped/cancelled,
2.115 seconds. The wrapper executes and checks the exact list of **31 named
scenarios** in `app/scripts/check-upgrade-v5-legacy-reader.mjs`. These are 31
scenario groups inside one test, not 31 additional Node test cases. The raw
focused-run output is in `verification-r12a1/r11-legacy-reader.txt`.

The helper can also be run directly:

    node --experimental-vm-modules scripts/check-upgrade-v5-legacy-reader.mjs

Its JSON report lists every scenario, fixture identity, evaluated module count,
namespace boundaries and qualifications. The direct standalone invocation was
not a separate run for this report; the Node wrapper invoked that same helper.
The new helper and wrapper also passed `node --check`.

At 10:14 UTC the owning integration reran the final helper alongside the four
W integration and four release-metadata checks: **9/9 passed**, 0 failed/skipped,
4.817 seconds. This rerun includes the final no-behavior helper cleanup after
the initial focused run. The complete output is preserved in
`verification-r12a1/combined-focused.txt`. Its nine Node tests include this one
historical-reader wrapper; the 31 scenarios are not added to that test count.

## What the actual historical code proves

Each primary scenario runs against disposable in-memory storage in both
`release` and `qa-r11`, with matching old/current profile key assertions.
R11 rejecting the unknown `qa-r12` namespace is explicitly **not** counted as a
fence pass. Browser Web Locks are replaced with a serializing test adapter;
no browser storage is accessed.

1. The original unsafe layout is reproduced twice: putting the old receipt in
   either `previousCommit` or the R11-recognized `upgradePreviousCommit` lets the
   genuine old reader recover version4 and its stale writer overwrite version5.
   Only the in-memory head is deliberately changed for these counterexamples.
2. The first committed version5 head nulls both old-reader receipt fields and
   exposes the prior receipt only through `upgradeV5PreviousCommit`.
   The pre-v5 backup is written and verified before either live slot/head write,
   with exact original raw head and both slot strings preserved.
3. Fresh and existing genuine R11 readers, a stale R11 writer, a fresh R11
   controller/start, and the already-loaded R11 controller fail with `CORRUPT`.
   Repeated queued inputs stay blocked. Snapshot, write count and every storage
   byte remain unchanged by the rejected old actions.
4. Three later version5 commits retain ordinary previous-version5 receipts,
   drop first-upgrade head fields and retain the original backup bytes.
   Actual R11 continues to fail closed.
5. Corruption of the first version5 active slot or head allows the current
   reader to recover its proven original version4 checkpoint while R11 remains
   blocked. The current retry restores version5 without replacing the backup.
6. Corruption of a later version5 active slot or head recovers the preceding
   version5 commit. Genuine R11 still cannot promote an old checkpoint.
7. Explicit same-namespace recovery copies the selected original envelope
   byte-for-byte to a new QA profile. The actual R11 validator accepts it, the
   old controller loads it and an ordinary setting command commits successfully.
   Original source/current/backup bytes are preserved. This includes a real
   R11 reducer-trained state, not only an empty character.
8. Direct version1/2/3→5 loads migrate only in controller memory. Reads create
   no sidecar or writes. The first ordinary command creates a pre-v5 backup
   recording the actual source version, with no fabricated version4/pre-v4
   intermediary. Old R11 fails closed; explicit exact-original restore remains
   usable by old R11.

The additional release cases cover faults immediately before/after slot and
head writes; old compatibility before the atomic head commit and fail-closed
behavior after a write-then-throw head; preexisting corrupt old-head recovery;
and an actual v3→4→5 chain whose existing pre-v4 backup stays unchanged and
whose independent pre-v5 backup contains the real version4 checkpoint.

## Recovery boundary that remains explicit

When the old head was already corrupt before upgrading, staging version5 may
replace the only envelope that R11 could parse to prove the preceding commit.
Therefore a before-head fault in this special case can leave R11 `CORRUPT`
even though version5 did not commit. The current reader still recovers the
proven original via the staged version5 envelope, and explicit pre-v5 restore
creates an old-readable QA checkpoint. The tests assert this limit instead of
claiming the old reader always remains usable before the head boundary.

## Independent storage review

A read-only pass after the focused test reviewed `save.js`,
`upgrade-backup-v5.js`, `candidate-profile.js` and the controller block path.
No additional blocking defect was identified within the reviewed contract:

- Old/new session writers share the exact profile lock. An unlocked old read
  can race and temporarily observe the pre-upgrade state, but its save obtains
  the lock and reloads before writing; the committed head fence is then checked.
- The only retained old envelope cannot expose itself through a malformed valid
  self-receipt: the first-upgrade guard rejects that receipt before any backup
  or live-key write. An opposite-slot receipt points at the new version5 slot,
  which actual R11 cannot validate.
- Direct1..3→5 selects the pre-v5 API and preserves the actual source version;
  existing pre-v4 bytes remain independent.
- Candidate copy and both restore APIs inspect head, both slots and both
  sidecars for occupied targets and use a shared sorted two-lock order.
- Every `UPGRADE_` failure blocks the current controller until explicit reload,
  preserving the in-memory snapshot and preventing repeated write attempts.

This review is not an additional execution result. The owning integration
tracks the separate backup-fault, candidate-copy, UI, complete aggregate,
build, original167-file integrity and external-preservation gates.
