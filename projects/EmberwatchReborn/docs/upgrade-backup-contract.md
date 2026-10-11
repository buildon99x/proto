# R11 pre-v4 recovery contract

2026-10-10. Bounded save-safety work; no content, balance, namespace, main/UI,
or release metadata changes. Public root promotion remains blocked pending
integration, normal-input recovery review, and source/build preservation.

## First upgrade

Controller load stays read-only. Immediately before the first actual committed
state-version 1/2/3 → 4 save, the profile's existing exclusive Web Lock protects
capture of raw head/slot0/slot1 and the selected committed receipt. One immutable
`<unchanged-profile-prefix>.pre-v4` sidecar contains those strings, source version,
profile/namespace, capture time, receipt and accidental-corruption checksum.
The sidecar is read back and validated before either live slot is touched.
The raw head is bounded to 64 KiB, each raw slot to 4 MiB (including unreadable
inactive-slot strings), decoded gameplay payload to the existing 2 MiB limit,
and the whole encoded sidecar to 24 MiB. These are UTF-8 validation ceilings,
not browser quota promises. Exceeding any limit fails before live writes;
smaller browser quotas fail the same way. Invalid inactive bytes within those
bounds are retained verbatim; they are never promoted to a committed state.

An existing sidecar is never overwritten. A retry may reuse it only for the
same exact committed envelope and receipt. Its inactive raw slot can differ
from current storage after an interrupted staged v4 write. A different existing
checkpoint, malformed backup, quota/adapter failure, or failed readback stops
before changing live head/slots. Backup write-then-throw also stops; a later
explicit retry can verify the already-written identical backup. No history is
invented for native v4 or already-upgraded profiles with no sidecar.

## Atomic old-reader fence

A first-upgrade head sets `previousCommit: null` and records the actual preceding
receipt in `upgradePreviousCommit`. The v4 envelope retains its normal
`previousCommit`. Current readers recognize both head receipt fields; old R7
readers ignore the new field and reject the v4 payload. Their retained v3 slot
points back to the opposite slot, now v4, so it cannot be used to overwrite the
newly committed upgrade. A malformed self-referencing legacy receipt is refused
before writes. There is no separate cleanup write or second-slot deletion.

- Backup failure: existing head and both slots remain byte-identical.
- Staged slot failure or failure before head write with a valid original head:
  old head remains authoritative; v4 is uncommitted and R7 can still use its
  original committed checkpoint.
- If the original head was already corrupt/missing and loaded by fallback,
  staging v4 may overwrite R7's only readable recovery proof before the new
  head commits. Patched R11 can still read the committed original through the
  v4 envelope's previous receipt; R7 can report CORRUPT until the old checkpoint
  is explicitly copied from the immutable backup into a new QA profile.
- If a faulting adapter additionally writes a malformed staged envelope in
  that recovered-head case, even patched live-slot load may return CORRUPT.
  The immutable sidecar is still verified and can restore the old committed
  checkpoint. Upgrade readback failure is COMMIT_UNCERTAIN and blocks play;
  the title recovery action must remain accessible when ordinary load fails.
- Head write-then-throw: v4 and its fence both exist, but the caller gets an
  uncertain result and must load again.
- Confirmed head: stale or freshly loaded R7 writers fail closed, including old
  controllers holding the preceding revision.
- Damaged v4 active slot: patched R11 can recover the real previous legacy commit
  from `upgradePreviousCommit`; R7 cannot. A retry uses the same immutable backup.
- Later v4 → v4 writes use the existing `previousCommit` layout, pointing to v4.

The fence relies on the browser's existing per-profile Web Lock and atomic
single-value localStorage writes. It is not tamper resistance, synchronization
across devices, durability against storage clearing/eviction, or a guarantee
against adapters that violate localStorage semantics.

## Public module API (exported by save.js)

`readUpgradeBackup(storage, {profile='main', namespace='release'})` is read-only.
Missing: `{ok:true, exists:false}`. Available: `ok`, `exists`, `backupChecksum`,
`sourceProfile`, `namespace`, `sourceVersion`, `targetVersion`, `sourceRevision`,
`sourceChecksum`, `sourceSlot`, `level`, `xp`, `earnedXp`, `createdAt`, `recovered`.
`createdAt` is backup capture time, not the original play checkpoint's wall time.
`xp` is current-level XP; `earnedXp` is cumulative earned XP. All errors return
`{ok:false, code, reason}` and never synthesize a missing checkpoint.
Every `UPGRADE_*` save failure immediately returns `blocked:true` through the
controller, blocks queued and future commands, and leaves its committed in-memory
state unchanged. Only an explicit controller load clears that block; there is
no automatic save retry or pretend continuation after a failed original backup.

`restoreUpgradeBackup(storage, locks, {sourceProfile='main', targetProfile,
namespace='release', expectedBackupChecksum})` requires the summary checksum the
UI just showed. The target must be a different empty `qa-*` profile in exactly
the same namespace. `main` source is allowed. No sourceNamespace/targetNamespace
or cross-namespace options are accepted. Any target head, slot, or existing
upgrade backup refuses the restore, even if that target is damaged. Both lock
names are acquired exclusively in sorted order to prevent opposite-direction
restore deadlock, while ordinary save takes only its own lock.

Restore copies the exact selected old envelope into its corresponding target
slot and commits a head for that receipt; the source revision/checksum are
preserved. It never writes the source profile, original backup, current v4
progress, or other profiles. Success returns the summary plus `profile`,
`revision`, and `checksum`. After uncertain writes, a target may contain a
headless staged slot and is not overwritten on retry: check QA Continue; if no
committed target exists, use another new name. A completed retry is refused as
existing, never duplicated or replaced.

## Exact recovery boundary

This recovers the checkpoint immediately before the first v4 write, without any
later v4 progress. Original v4 progress remains independently stored in its old
profile. It does not downgrade v4, merge progress, import a file, or export data.
Continuing a restored old state under R11 migrates in memory and upgrades its
new QA profile on the next write. An unmodified R7 code rollback does not read
sidecars; restore must be performed through the patched recovery UI before
opening the recovered QA profile with a compatible preserved old runtime.
Schema 3 alone does not prove R7 compatibility: later schema-3 S/F/T content can
need its corresponding old runtime. Root R7 fixtures must be checked against the
actual preserved R7 modules, not an approximation of their validator.

## Verification

The new unit suite executes actual store/session/restore calls with storage
faults and lock scheduling. Historical validation additionally uses the frozen
R7a4 static module tree, without modifying it. Run:

    node --test tests/upgrade-backup.test.mjs tests/upgrade-legacy-reader.test.mjs tests/state-save.test.mjs tests/candidate-profile.test.mjs
    node --experimental-vm-modules scripts/check-upgrade-legacy-reader.mjs
    node --experimental-vm-modules scripts/check-upgrade-legacy-reader.mjs /path/to/preserved/R7a4/dist

Exact-byte historical fixtures are included in `app/tests/fixtures/r7a4`:
25 JS files / 276,684 bytes, source commit
`a8df609a4b8c6a9b6c07194867bd828442aa4dab`, public root R7a4. Every file hash was
checked against that root's original build-manifest and is recorded in
fixture-manifest.json. The helper defaults to these fixtures, so the source
archive is independently reproducible; an optional external preserved dist
argument verifies that tree too. No PNG/audio/fonts or live browser are needed.

Automated checks establish storage contracts only, not ordinary-input UI quality
or full gameplay acceptance.

### Focused verification result (2026-10-10)

- 80/80 focused Node tests passed: new save/backup/restore suite, portable
  frozen historical reader wrapper, existing state-save and candidate-profile.
- The historical helper passed 32 assertions against both the bundled exact-byte
  fixture and the separate preserved public R7a4 dist. It verifies the old defect,
  atomic fence, stale writer/controller rejection, later v4 history, uncertain
  head writes, recovered-head limitation, and old trained-state recovery.
- All source/test JavaScript syntax passed. Diff whitespace checks passed with
  only inherited blank-at-EOF warnings disabled: four frozen R7 files retain
  those original bytes intentionally, rather than changing historical hashes.
- A separate read-only review found no blocking source-data-loss or deadlock
  flaw under the stated atomic-localStorage/Web-Lock assumptions. Its already-
  corrupt-head + malformed-stage edge now has a recovery regression and an
  explicit documented limitation.
- Full aggregate, UI integration, native browser recovery, publication and
  preserved rollback/recovery-page release are the integrating parent's gates.
