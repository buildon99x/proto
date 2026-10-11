# R10 Tomb runtime integration

2026-10-10 UTC. This is a bounded runtime/state integration of the
authored contracts in `r10-tomb-core-contract.md` and
`r10-training-economy-contract.md`, not a playable/public T or Expert release.

## Scope and acceptance

- Register the original T region, foes and town links in the production world.
- Route all T commands through `reduceRuntime`, validating full state before and
  after the existing pure reducer; validate T progress and protected gold at the
  common load/save/command boundary.
- Keep untouched v1/v2/v3 saves free of inferred T defaults and reservations;
  loading may use existing in-memory migration but must never write storage.
- Retain Adept-only playable character support. No Expert unlock, UI, combat
  balance, promotion, new reward or schema-version bump is part of this slice.
- Run the existing T and protected-economy integration checks, plus production
  map/live-combat and historical save regression checks. Scripted positions,
  kill reports and combat fixtures do not establish ordinary-input gameplay.
- Run all existing checks without removal or weakened assertions. Record exact
  results below only after execution. Browser play, publication, external backup
  and remote Git writes remain outside this task.

## Implementation

`world.js` now composes the original frozen T content into the production region,
foe and town-link registries. `state.js` applies the structural protected-wallet
validator and semantic T validator at the existing common boundary, and routes
T commands through their reducer with complete result revalidation. Existing
`save.js` and `controller.js` require no changes: their reads, writes, queued
commands and slot/head reconciliation already use that boundary. No predecessor
region or tier guard was relaxed.

Integration found one core omission: an isolated `r10:promote:expert` receipt in
an otherwise fresh save previously escaped T's active-history test. With the
integration owner's approval, `tomb.js` now treats that receipt as T history and
rejects unknown `r10:promote*` receipts. Fresh, predecessor-only, accepted and
reported Adept states cannot accept a forged Expert receipt; duplicate receipts
and unsupported Expert tier remain invalid. No genuine Expert state is enabled.

## Focused results

- Existing T core, geometry and protected-economy integration: **71/71 passed**,
  zero failures/skips. These include all 32 scripted route combinations, all
  four objective grants and 19 permanent defeats, 304G, minimum Hard/Serious
  L14 report, explicit oath, death/retry, stale inputs, exact/below/excess
  equipment balances, repeated reporting, and slot/pre-head/post-head faults.
- New `tomb-runtime-integration.test.mjs`: **16/16 passed**, zero failures/skips.
  Covers fresh/trained v1/v2/v3 storage bytes and absent T fields through repeated
  raw/controller loads; checksum-valid malformed T saves; missing/forged
  reservation and promotion history; all six production geometry stages; live
  charge/hammer and both-direction swept projectile collision; same-band
  reversed/batched L15-crossing settlements; serialized two-tab report races.
- The live collision tests use genuine handler-earned progression but synthetic
  actor positions and isolated future-enemy/projectile fixtures. High-speed
  adversarial projectiles exercise actual `stepBattle` sweeping with its radius2
  collision. They supplement the existing sampled geometry suite, not prove all
  continuous paths, tactical quality, survival, or ordinary-input play.
- Source/test syntax and `git diff --check` passed. All **167 original files**
  match both recorded SHA-256 and Git-blob hashes; none were changed.
- `pnpm sync:registry` was attempted from the root and remains blocked by the
  recovered tooling's `ENOENT /home/agent/.local/share/pnpm`. No workaround,
  generated registry output, browser, build, publication, Library backup or
  remote Git action is claimed by this task.

## Aggregate check

At baseline `f041d48` plus this scoped integration diff, every tracked test file
plus the new runtime integration test passed: **1,104/1,104**, zero failures,
cancelled or skipped, **140.6 seconds**, with `node --test --test-concurrency=1`.
The inventory is 938 retained R9a3 checks (including all earlier 936), 79 protected
economy checks, 71 T core/geometry/economy integration checks, and 16 new runtime
checks. No existing test was edited, removed, skipped or weakened.

The exact file list, full output and changed-file hashes are retained under
`verification-r10-tomb-runtime/`. Other workers' future untracked presentation
tests are outside this fixed run list. Parent integration still owns final-source
full checks/build, brief/spec/eval consolidation, UI connection, boss phase
behavior, ordinary-input play, archive and publication.
