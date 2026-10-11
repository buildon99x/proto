# R12 schema-5 upgrade storage contract

2026-10-10. This is bounded local save-safety integration. The source baseline for
R11 recovery is commit `17b13fa04fec8336d2c08f3c4603a0d2e8d00276`. The original
Emberwatch project, preserved R11 files, and prior namespace prefixes are not
modified. Storage tests are not normal-input gameplay, UI, browser durability,
release, or publication acceptance.

## Two independent immutable checkpoints

The existing `.pre-v4` key, `emberwatch.reborn.pre-v4` format, version-1/2/3 to
version-4 meaning, original bytes, receipt, bounds, and public API remain intact.
The actual `<4 → 4` store path continues to create it before any live write.
Existing `.pre-v4` bytes are never rewritten by a version-5 upgrade.

A new `.pre-v5` key has format `emberwatch.reborn.pre-v5` and `toVersion: 5`.
Immediately before the first actual committed source-version 1/2/3/4 → 5 save,
it captures the actual source version, raw head/slot0/slot1 strings, profile,
namespace, selected committed receipt, capture time, and checksum. Direct 1/2/3
→ 5 creates only `.pre-v5`; it never fabricates a version-4 checkpoint or a
`.pre-v4` history that did not occur. Native version-5 records and already-upgraded
records without a backup do not gain invented history on read or later saves.

Load and controller migration remain read-only. The exclusive profile Web Lock
covers backup capture, verified readback, slot staging, and atomic head commit.
Backup validation precedes either live-slot write. Bounds remain: 64 KiB UTF-8
head, 4 MiB per raw slot, 2 MiB decoded gameplay payload, 24 MiB encoded backup.
These are validation limits, not browser-quota guarantees. Invalid inactive bytes
within bounds are retained exactly but never restored as a committed checkpoint.

One existing sidecar is immutable. Retry can reuse it only for the exact original
committed envelope bytes and receipt. Its inactive slot may differ after an
interrupted staging write. Malformed backup, different valid old checkpoint,
quota/error, truncation, and failed readback stop before live writes. A backup
write-then-throw is an explicit failure; a later explicit retry may verify and
reuse the identical already-written sidecar. Backup errors retain the R11
`UPGRADE_*` codes so controller blocking is immediate until explicit reload.

## Atomic schema-5 fence

Actual R11 readers already recognize `upgradePreviousCommit`. Reusing it would
allow an R11 writer to recover retained version 4 and overwrite committed version
5. The first version-5 head therefore contains:

- `previousCommit: null`
- `upgradePreviousCommit: null`
- `upgradeV5PreviousCommit: <actual preceding committed receipt>`

The new field is unknown to preserved R11. Current readers recognize all three
head receipt fields, plus ordinary envelope `previousCommit`. The new version-5
envelope retains its ordinary previous receipt. The retained source envelope
must not contain a valid self-receipt; such unsafe input is rejected before
backup or live writes. The actual `<4 → 4` fence keeps its prior R11 layout.
Later `5 → 5` writes use ordinary `previousCommit` pointing to version 5 and do
not rewrite backups or retain first-upgrade head fields.

- A confirmed first version-5 head prevents both loaded and stale actual-R11
  writers from recovering and overwriting the retained source checkpoint.
- Damaged active version-5 slot: current load uses `upgradeV5PreviousCommit` to
  recover the real source checkpoint. The same backup can support safe retry.
- Damaged head, readable version-5 envelope: current load uses its previous
  receipt, never the highest revision or uncommitted staged version-5 payload.
- Failure before head commit with a valid original head leaves that head
  authoritative. A head write-then-throw gives `COMMIT_UNCERTAIN`; reload is
  required even when the new head and fence are already present.
- If the original head was already missing/corrupt and load used fallback,
  staging may overwrite the only receipt the old R11 reader understands before
  the new head commits. R11 can report CORRUPT in that interval; current readers
  can use the readable version-5 envelope's preceding receipt. If a faulting
  adapter also corrupts that staged envelope, live current load can be CORRUPT.
  The verified immutable sidecar still permits exact recovery into new QA.

The contract assumes atomic single-value localStorage writes and cooperating
Web Locks. It is not protection from malicious tampering, storage clearing,
eviction, device loss, or adapters that violate those assumptions.

## Explicit public recovery APIs

All functions are exported by `save.js`:

- Existing `readUpgradeBackup(storage, {profile='main', namespace='release'})`,
  `restoreUpgradeBackup(storage, locks, {sourceProfile='main', targetProfile,
  namespace='release', expectedBackupChecksum})`, and `upgradeBackupKey(...)`
  continue to mean pre-v4 only.
- New `readUpgradeBackupV5`, `restoreUpgradeBackupV5`, and `upgradeBackupV5Key`
  use the same signatures and summary fields, but mean pre-v5 only.

The UI explicitly selects a checkpoint and then calls that checkpoint's API;
there is no implicit newest-backup selection. Missing remains
`{ok:true, exists:false}`. A present summary includes `backupChecksum`,
`sourceProfile`, `namespace`, actual `sourceVersion`, `targetVersion`,
`sourceRevision`, `sourceChecksum`, `sourceSlot`, `level`, `xp`, `earnedXp`,
`createdAt`, and `recovered`. Capture time is not original play time. `xp` is
current-level XP; `earnedXp` is cumulative XP. The checksum includes kind,
version, profile, namespace, and checkpoint bytes. FNV detects accidental
corruption; it is not an authenticity token or cryptographic guarantee.

Restore requires the checksum just shown for that selected kind. It restores the
exact selected source envelope, revision, and checksum to a different empty
`qa-*` profile in the same namespace, including `qa-r12`. `main` may be a source.
Source/target namespace overrides are rejected. Neither function downgrades a
live profile, merges newer progress, imports/exports a file, or changes source
history. It restores only the checkpoint before the corresponding first upgrade;
newer progress remains in its original profile.

## Occupancy, locking, and retry

Both restore paths and the forward-only candidate-copy path refuse a target
with *any* head, slot0, slot1, `.pre-v4`, or `.pre-v5` value, including empty,
malformed, headless, and sidecar-only strings. They acquire source and target
locks exclusively in sorted name order; inspection and commit happen under both
locks. Candidate copy uses the synchronous store under those locks rather than
recursively reacquiring the target lock. This makes target occupancy checks
atomic against cooperating writers and avoids lock-order inversion with restore.

Restore rechecks the untouched target keys after staging. It never replaces
partial targets on retry. A failure before any target write can retry the same
empty name. A headless staged slot or completed/uncertain target is occupied: use
QA Continue to inspect it, then choose a different new QA name if needed.
Concurrent same-target requests result in one commit and one existing-target
refusal. Source bytes and both source sidecars remain unchanged.

## Focused verification

`app/tests/upgrade-backup-v5.test.mjs` executes the real production store,
session, controller, both restore functions, and candidate-copy handlers. It
covers actual origins 1..4, the still-working pre-v4 path, byte identity,
checkpoint-kind confirmation, read-only absence, backup/stage/head faults,
stale/retry/concurrent writers, bounds, fallback and unsafe self-receipts,
same-namespace restore, all five occupied-target keys, and ordered locking.
Historical R11 rejection is separately tested using the exact preserved source
modules, not a new validator pretending to be R11. Run tests serially and report
actual results; inherited R11 pass counts are not R12 verification.

Focused local result (2026-10-10): 107/107 passed, zero failed/skipped, in
4.666 seconds with `node --test --test-concurrency=1
 tests/upgrade-backup-v5.test.mjs tests/state-save.test.mjs
 tests/candidate-profile.test.mjs`. Raw output is preserved in
`docs/verification-r12a1/storage-focused.txt`. The new v5 suite contributes 66
checks; 41 retained state/save and candidate checks run against current modules.
All four modified/added storage JavaScript modules and the new test parse.
Full aggregate, normal-input UI/recovery, source/build preservation, and
deployment remain the integrating owner's gates.
