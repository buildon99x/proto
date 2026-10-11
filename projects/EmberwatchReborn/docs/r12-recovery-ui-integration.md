# R12a1 explicit recovery UI integration

2026-10-10 UTC. Local source candidate only. This integrates R11b6 recovery
entry/title UI from `17b13fa` into W `ddee4c0`, preserving the W state-version5
runtime and generic profile ownership guard. No remote, browser, Library,
publication, deployed recovery route or native UI acceptance is claimed.

## Selected checkpoint contract

- Title and independent recovery page require an explicit selection. The blank
  default performs no read. `pre-v4` uses only `readUpgradeBackup` and
  `restoreUpgradeBackup`; `pre-v5` uses only the new V5 API pair. The UI never
  selects the newest timestamp or falls back to another sidecar.
- Preview shows the selected kind, actual original version, transition target,
  original revision, level, XP and preservation time. Pre-v4 remains actual
  versions1–3 before4; pre-v5 shows actual versions1–4 before5. A skip-version
  upgrade never invents a version4 original. Mismatched preview types fail closed.
- The restore button contains the exact selected kind, observed checksum and
  preview selection token. All three are required. Reopening a preview or
  rendering a failure invalidates the prior button. The selected restore API
  and a frozen read summary remain fixed for the request.
- Duplicate clicks cannot start another write. Late success/failure/throw cannot
  replace a newer preview, returned title, or loaded gameplay owner. A write
  already requested may finish only its original target. Recovery never loads
  the restored profile automatically.
- Restoration remains within the source namespace to a different empty qa-*
  target. The production APIs reject any target head, either slot, pre-v4 or
  pre-v5 bytes, including corrupt/orphan records. UI confirmation does not relax
  these storage checks or overwrite the source/current progress.
- Missing history is reported for the chosen checkpoint without claiming that
  already-upgraded profiles or fresh games have a recoverable earlier state.

## Entry points and compatibility

`recovery-main.js` and `recovery.html` remain recovery-only: no game loop,
audio, automatic profile load/save, import or network transmission. Both
`/qa-r12/recovery` and `/qa-r12/recovery.html` are recognized alongside retained
release aliases and qa-r4..11 aliases. All other routes fail closed, without
reading storage or falling back to release. The explicit gameplay link on a
recognized candidate recovery page stays in that same namespace. Main and
recovery identity is R12a1.
Build generation/routing remains the integration owner's responsibility.

The UI explicitly says unchanged R11 does not know the qa-r12 namespace:
restoring a version4 payload there does not make that profile openable in R11.
The qa-r11 original remains the R11-accessible copy. Neither UI nor storage
silently renames or transfers the namespace. In all namespaces, later new-version
progress is separate from the original checkpoint and a code rollback is not a
save-format conversion.

## W preservation

Recovery imports, title controls, helpers, click routing and build label are
integrated without changing W `report`, `flushActionSafety`, `dispatch`,
`checkpointPanel`, `wildernessActionButton` or `showWilderness`; source comparison
against pinned W `ddee4c0` verifies these functions byte-identical. `loadProfile` preserves
its original body after one new early route guard. Immutable captured store
epochs, busy/safety checkpoint ordering and local controller/profile-selection
ownership are retained.

## Narrow unknown-candidate route guard

The later approved correction introduces `profileNamespaceForPath` in
candidate-profile.js. Existing qa-r4..12 parsing, root/index and ordinary non-QA
release behavior remain unchanged. An unsupported first QA-looking path segment
(including encoded/case variants) returns null instead of release. Malformed
percent encoding retains the raw first-segment classification, so ordinary
non-QA paths are not newly rejected.

Actual main startup does not load art or schedule the gameplay frame on those
unsupported QA routes. Its title contains a clear refusal and an explicit root
navigation link, with no start/continue actions. Click and direct `loadProfile`
entry points also reject before any session is created or storage is accessed.
No candidate namespace is guessed and existing namespace bytes are unchanged.

## Verification

Focused serial verification passed153/153 checks, zero failed/skipped/cancelled/
TODO, 55,904.370905ms on Node24.19.0. Raw output:
`verification-r12a1/ui-focused.txt`. Command (from app):
`node --test --test-concurrency=1 --test-reporter=tap tests/upgrade-backup-ui.test.mjs tests/recovery-page.test.mjs tests/recovery-storage-ui.test.mjs tests/profile-load-ownership.test.mjs tests/wilderness-ui-integration.test.mjs tests/wilderness-town-keeper.test.mjs`.
Retained R11 recovery scenarios are preserved with the explicit
checkpoint and confirmation input added. Qa-r12 route cases move from rejected
to supported; unknown-route cases remain. New tests exercise source versions1–4,
wrong-kind/checksum/selection confirmations, same-checkpoint reopening, failure
button renewal, cross-kind delayed completion, missing-history separation and
R11 namespace warning text.

`recovery-storage-ui.test.mjs` executes the real standalone click handler with
production current APIs plus the exact preserved R11 migration modules. Its
synthetic three→four→five sequence creates both sidecars, restores each exact
original, preserves all existing bytes and exercises every occupied target key
for both kinds. These are automated handler checks, not normal-input screen,
visual accessibility or historical browser-play evidence.

After the narrow route guard and recovery-link refinements, a final focused
serial run passed136/136, zero failed/skipped/cancelled/TODO, 1,045.736727ms:
26 route checks,43 recovery-page checks,45 backup-UI checks and22 generic
profile-owner checks. Raw: `verification-r12a1/ui-route-focused.txt`. Command:
`node --test --test-concurrency=1 --test-reporter=tap tests/candidate-route-guard.test.mjs tests/recovery-page.test.mjs tests/upgrade-backup-ui.test.mjs tests/profile-load-ownership.test.mjs`.
These overlap the153 earlier checks and must not be summed as unique coverage.
The initial134/134 route output precedes the final malformed non-QA path scope
regressions and is retained as `ui-route-focused-initial.txt`.

Changed-file syntax and diff-whitespace checks pass; raw source-preservation
verification is in `verification-r12a1/ui-syntax-preservation.txt`. Its first
comparison used mutable HEAD after an owner checkpoint, so that inspection was
rerun against pinned original `ddee4c0`, without changing application source. Final W aggregate/build
acceptance remains with the integration owner after these later source edits.

The first focused command was intentionally interrupted (exit130) to preserve
the shared serial test lane. Its partial output is retained and is not a passing
run (`verification-r12a1/ui-focused-interrupted.txt`). Full aggregate, static build/original integrity, archival and publication
remain separate owner gates.
