# Portable QA checkpoint, detached core

2026-10-10. This slice adds only `app/src/portable-checkpoint.js`, its focused
tests, and this document. It does not integrate UI, change gameplay, build or
publish the Site, access a browser, or import any historical denied file. The
recovered checkout has no recovered Git history; no repository was initialized.

## Explicit local API

- `exportPortableCheckpoint(storage, locks, {sourceProfile, namespace,
  exporterBuild})` returns a validated `text`, a safe `filename`, and summary.
  It takes the selected source's exclusive Web Lock, reads exactly its head and
  two slots, and delegates committed/fallback selection to `createStore.load`
  over those captured bytes. It never enumerates storage or writes a source.
- `inspectPortableCheckpoint(text)` validates a selected file and returns its
  source profile/namespace, version, build/date, receipt, digest, recovery flag,
  and level/XP/gold/difficulty summary without accessing storage.
- `restorePortableCheckpoint(storage, locks, {text, expectedSourceProfile,
  expectedNamespace, expectedDigest, targetProfile, namespace})` requires the
  exact preview selection plus a separately chosen destination. Both profiles
  must be valid, different `qa-*` names in the same supported namespace.
  Supported namespaces are existing `release` and `qa-r4` through `qa-r12`;
  `main`, unknown namespaces and cross-namespace restoration are rejected.

The UI owner must bind the three expected preview values to the user's current
explicit selection, check `File.size` before reading, and download returned text
locally only after the explicit export action. This module performs no download,
network operation or UI selection. An exported fallback has `recovered: true`
and a visible-use `recoveryNote`; its actual older source version is retained.

## Format and validation

Format `emberwatch.reborn.qa-checkpoint`, format version 1, has exactly these
ordered canonical fields: `format`, `formatVersion`, `schema`, `sourceVersion`,
`sourceProfile`, `namespace`, `exporterBuild`, `exportedAt`, `sourceSlot`,
`sourceRevision`, `checksum`, `recovered`, `payload`. The final wrapper also has
`digest`. SHA-256 is lowercase hex over UTF-8 `JSON.stringify` of the canonical
field order, excluding `digest`. Wrapper key order/formatting may vary on read;
the payload is always the original string, including its internal whitespace.

The original payload's existing FNV checksum, schema/version consistency and
production `validateState` invariants are independently checked. Both payload
and entire UTF-8 file are bounded to 2 MiB. Escaping and metadata can therefore
make a near-limit payload too large for export; data is never truncated.
Unexpected wrapper fields, arbitrary storage keys and historical commit links
are rejected. Versions 1–5 remain in their original form, without controller
migration. SHA-256 establishes integrity only: it does not authenticate a player,
prove normal-input progress, or prevent a knowledgeable person from re-signing
a valid edited state. Ordinary-input provenance remains separate evidence.

## Empty destination and uncertainty

Under the destination's exclusive Web Lock, any non-null head, slot0, slot1,
pre-v4 or pre-v5 value makes it occupied, including empty/corrupt strings. A new
slot0/revision1 envelope and head are constructed, both with `previousCommit:
null`; old source links, revisions and sidecars are not restored. Source payload
bytes remain exact. All five destination values are checked after staging and
after committing, then the committed snapshot is loaded through the real store.

Any attempted-write exception or failed readback returns `RESTORE_UNCERTAIN`.
There is no cleanup, automatic retry or overwrite. Existing bytes remain for
explicit inspection; an occupied target cannot be reused by this operation.
Web Locks serialize cooperating same-origin writers. Readback detects observed
uncooperative interference but is not an atomic transaction against code that
ignores those locks, nor protection against future outside edits.

## Focused verification

Node 24.19.0: `node --test --test-concurrency=1
tests/portable-checkpoint.test.mjs` passed 133/133, zero failed, cancelled,
skipped or TODO tests, 1314.726914 ms. Source and test syntax checks passed.
Coverage includes original v1–5 bytes, actual reducer-earned reward/resource
state, duplicate rewards, committed/fallback/staged/corrupt records, three-key
reads and zero export writes, metadata/checksum/state/history rejection, UTF-8
boundaries, explicit confirmation mismatches, every occupied target key,
source/destination lock queues, simultaneous restores, racing values, and
before/after-write/readback/crypto failures without cleanup or retry.

Initial run: 125/130 passed; five new race fixtures accidentally spread a mock
storage object's deliberately throwing enumeration getter before invoking the
module. Explicit get/set adapters fixed those fixtures; production code was
unchanged. The corrected run passed 130/130; three additional hardening cases
then passed in the 133-test final run. No old test was edited or removed.

These are synthetic handler/store tests, not native file-download/restoration
acceptance or proof of the new normal-input QA profile. Full aggregate, UI/native
QA, build, publication and external archival remain integration-owner gates.
