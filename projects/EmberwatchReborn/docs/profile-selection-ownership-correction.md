# Profile selection ownership correction

2026-10-10 UTC. Bounded source/handler correction, independent of the wilderness
content, schema version, combat balance and candidate release identity.

## Reproduced boundary

The title's ordinary New/Continue/QA-copy buttons remain available while an
asynchronous load, initial start or copy is pending. Their handlers previously
kept neither the original controller owner nor the selection intent across
awaits. A delayed A first save could finish after B loaded and install A's state
and battle while the global controller still belonged to B. A late error could
also replace B with the title. The copy handler had a separate continuation
race: its late result could invoke a new `loadProfile` after B was selected.

Tests execute the actual title click handler, loader, store, controller and
WebLock-backed session. Delays at the WebLock and read-result boundaries are
explicit test probes. Before the correction, 15 of the 18 targeted scenarios
failed, including the delayed A/B ownership and copy cases. This is a source and
handler-level reproduction. It does not establish that a user encountered an
exploit in the published R11 candidate or substitute for native browser testing.

## Implementation

- A single profile-selection epoch is captured at the original Copy or Load/
  New/Continue request. Copy passes that same epoch into its subsequent load.
- Load keeps a local controller owner, selection epoch and modal presentation
  epoch. It checks them after load, after optional start and before displaying a
  failure. Start is called on that local owner, never a newer global controller.
- A stale preflight does not start a save. A save already requested for A may
  finish only A's own slot/head. Its completion cannot install A into B, alter B's
  modal, trigger a second load/start or generate an additional checkpoint.
- Gameplay pauses and held input clears while selecting a profile. Successful
  current loads retain existing alive-arrival/dead-retry/audio behavior.
- Existing `showTitle` is unchanged. Its presentation-epoch increment and
  controller clearing invalidate dismissed pending requests, including copies.
- No profile key, raw save, schema, resource, receipt or recovery value is remapped
  or reset. Existing progress and current error handling are preserved. The prior
  stale-life reducer behavior is unchanged.

The code changes only `loadProfile` and the existing candidate-copy click branch
in `main.js`. The new test is standalone, uses ordinary trained states and the
preexisting qa-r10→qa-r11 copy route, and does not import wilderness fixtures or
`support/main-imports.mjs`. No R12 title string or schema-5 assertion is part of
the patch, permitting a separate earlier-candidate backport. The untouched
surrounding title text differs between releases; backport application still
requires verification rather than assuming Git context will apply cleanly.

## Verification

- Before guard: 3/18 pass, 15 fail; original failure details retained in
  `verification-profile-load-ownership/before-guard.txt`.
- Guard plus existing dead-save startup cases: **24/24 pass**, 0.99 seconds,
  zero failures, skips, cancellations or TODOs. Output:
  `verification-profile-load-ownership/focused-final.txt`.
- Covers delayed save/load success and failure, same-profile overlap, stale
  new-game preflight, current errors, title dismissal, reload pause, actual copy
  clicks, overlapping copies, latest Continue selection, and source/target raw
  save preservation. Reported pools stay associated with the active controller.
- Additional affected profile/copy/owner handler checks pass **5/5**, 5.09
  seconds; output is `verification-profile-load-ownership/affected-handlers.txt`.
  Source/test syntax and scoped whitespace checks pass. Full aggregate and
  native browser checks remain parent-owned gates.

No browser, import workflow, remote write, deployment or public exploit claim
belongs to this correction.

## Ordinary title-input qualification

A follow-up review questioned whether Escape could resume an old battle during
an awaited profile load. Production `loadProfile` callers are the title New,
Continue and QA-copy branches. Before those controls are visible, `showTitle`
has already cleared the old battle, state and controller and hidden the HUD.
The menu's Reload command uses a different, existing handler. A direct call to
`loadProfile` while a battle remains active is a broader test probe, not an
established ordinary-input path to this window.

Four additional tests execute the real `showTitle`, title click listener,
keydown listener, Escape/pause, the C menu key, `closePanel` and the close click
while actual start/copy WebLock saves are delayed. The title itself has no Close
button: direct `closePanel` and a supplied old close-click are explicitly
defensive probes, while title New/Continue/copy and the keydown path are the
actual production handlers. Deliberate lock delays reproduce their ordering,
not live browser timing. They confirm:

- No old battle or state remains available, so simulation cannot step and no
  old-battle report can bind to the loading controller.
- Escape and the menu key remain owned by the visible title. Close cannot resume
  or change the modal epoch when there is no battle.
- A newer Continue selection wins; otherwise the sole current completion installs
  matching state, battle and controller. Already-requested saves stay scoped to
  their original target.

All **22/22** targeted cases pass in `title-input-window.txt`. No additional
runtime change is needed for this production path. This adds handler evidence,
not native browser acceptance or a claim that the broader direct-call case is
reachable through ordinary controls.
