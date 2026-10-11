# W ancestry, snapshot freshness and pre-choice gate correction

2026-10-10 UTC. Corrective follow-up to the detached module at `b0b1db6`.
W has not been integrated, uploaded or exposed by this slice. These findings
are detached-handler and prospective integration defects, not a demonstrated
ordinary-input exploit in the published R11 candidate.

## Reproduced defects

1. B→T→F→S→P→Q ancestry checks did not transitively validate the first Dungeon.
   Setting `sluice_sequence_solved=0` in an earned W survey checkpoint could
   leave W eligible and grant the tablet's 100 XP even though the shared
   Dungeon validator rejected that history.
2. W objective revision does not change for combat/checkpoints. A captured
   tablet command could therefore overwrite a later same-life 1/1/1 checkpoint
   with old 127/76/99 pools, clear paid `shield_charge:2.5`, and rewind RNG.
   The reverse ordering also mattered: an older checkpoint could overwrite
   a newer objective or later paid snapshot. Replaying a previously settled
   kill could undo the existing level-up recovery despite granting no second XP.
3. The receiver→relay door opened at calibration, but the relay foes' AI required
   a later mode choice. Generic combat can damage an inactive enemy; the old
   geometry therefore allowed a kill that W settlement correctly rejected as
   locked, risking a blocked pending settlement when wired into the main loop.

## Scoped changes

- Run Dungeon, Quarry, Pass, Signal, Furnace, Tomb and Battlefield validators
  explicitly against the already-documented read-only ancestry view. Do not rely
  on one validator transitively owning unrelated or optional predecessor history.
- Both `reduceWilderness(state, command, context)` and
  `reduceWildernessRuntime(state, command, context)` require a separate trusted
  `context` containing exactly `{revision}`. All W commands, including detached
  travel, settlement, checkpoint and retry, require `expectedStoreRevision`.
  Missing/malformed context fails closed; a mismatched epoch yields
  `STALE_STORE_REVISION`. This is independent of `expectedRevision` (W puzzle/
  objective revision), `expectedStep`, life, owner identity and modal epoch.
- The three W objective commands additionally require **exact committed vitals
  and recovery**, including paid cooldowns, RNG, statuses and recovery debt.
  A fresh stamp attached to old resource data yields `REPORT_NOT_COMMITTED`.
  Equality is structural and does not depend on JSON key order. Live movement
  positions remain reach/LOS-validated command reports, under the trusted
  atomic report-capture boundary below; this change does not invent a movement
  simulator or infer a current position from old command data.
- Live combat/checkpoint reports may legitimately differ from committed pools:
  they carry changes since their bound base epoch. Do not apply objective-style
  pool equality indiscriminately to these live reports. Their immutable base
  store revision and controller owner/serialization contract prevent old reports
  from being accepted after another commit.
- Views require the captured controller context and include
  `expectedStoreRevision` in returned action fields. Without a valid epoch they
  expose no executable actions. `wildernessCommandFields` preserves both revision
  tokens and the optional puzzle-step/mode fields; it never refreshes them.
- Move the mode selector onto the receiver side at authored `(784,624)` and
  keep the physical doorway closed until `wilderness_mode >= 1`. Every relay
  foe is path-inaccessible and has no LOS from any reachable tile center before
  the choice. After either choice all four remain reachable. The six-tile
  cover/channel difference and both retreat flanks remain unchanged.
- Reward tables, HP, combat timing, source-reference data, earlier regions,
  state schema, published root and `/qa-r11/` remain unchanged.

## Required controller integration, before W can be exposed

Use the existing promotion/slot `checkpointPanel` ordering as the model, not
merely the older B/T panel ordering:

1. Open and pause a placeholder panel. Wait for any busy commit, then drain and
   await pending action-safety cancellation and its durable checkpoint. Opening
   a panel can schedule cancellation; capturing a revision before this would
   make the rendered buttons stale immediately.
2. Check owner/profile/battle/life/modal epoch. Capture the live position, pools,
   recovery and RNG together with the committed base store revision. Issue the
   checkpoint with that original `expectedStoreRevision`; await its durable
   result. Do not resume simulation while constructing an objective command.
3. Atomically obtain the **same committed controller snapshot and its revision**,
   then render the view. Construct the objective command from that captured
   position/vitals/recovery/life/objective revision/step and store revision.
   Do not mix fields from two snapshots or advance one token around old data.
4. At dispatch, the real controller passes its current committed revision as
   the third, trusted context argument. Do not copy the context from the command,
   default it from W revision, infer it from state data, or blindly replace a
   command's `expectedStoreRevision` with the latest value before dispatch.
   The command and its report fields are immutable after capture.
5. Combat/travel/checkpoint snapshot creation must likewise capture one live
   battle report and its corresponding committed base epoch atomically, verify
   owner/life, and enqueue it without re-stamping. The controller remains the
   owner of global commit ordering, storage conflicts and uncertain-commit
   reconciliation. A rejected stale report must not be silently replayed with
   old pools or old RNG. Reconcile the actual committed state, then capture a
   genuinely new live report if another action is still appropriate.
6. Never show success or apply speculative rewards until the storage commit is
   confirmed. Extend real save-fault/race/modal/owner tests when shared integration
   occurs. These pure handlers and their revision harness are not evidence that
   production W controller/save integration already exists.

No shared B/T/world/main/schema code was edited. The parent still needs to
register W, remove the temporary ancestry location projection, establish an
explicit supported save-version boundary and perform full/native validation.

## Focused regressions

All 34 preceding new W tests remain. Added coverage includes every ancestry
owner plus the exact Dungeon counterexample and corrupt optional store/rescue
histories; stale tablet after depleted checkpoint; current-token/old-pool rejection;
reverse checkpoint/objective ordering; stale checkpoint/settlement/travel reports;
replayed already-settled kill and later paid recovery; missing/forged trusted
context; structural recovery equality; missing view epoch; and physically sealed
pre-choice relay geometry. The scripted fixture uses an explicit external
in-memory epoch harness. It does not add revision metadata to game saves, patch
the production dispatcher, or manufacture controller/save acceptance.

No full suite, browser, build, upload, Library operation, deployment or push ran.

Final focused result: **46/46 pass** (34 retained W checks + 12 new),
0 fail/skip/cancel/TODO, 20.057 seconds serial on Node v24.19.0. Six changed
source/test files pass syntax checks; scoped diff whitespace passes. Independent
reproduction checks also reject the original Dungeon/stale-tablet/duplicate-kill
cases and confirm the pre-choice relay doorway is sealed.

Town layout remains a parent-owned P2 integration gate: proposed W links at
(144,104) and (144,208) have overlapping 76-unit interaction circles and
110-wide visual arch footprints; the entry also overlaps the seeded statue
near (80,80), and the anchor area overlaps the older Pass entry circle. Both
centers are usable, but nearest-target selection and visual crowding need
registered-town/native review before exposure. This correction deliberately
does not move existing town objects or claim that placement accepted.
