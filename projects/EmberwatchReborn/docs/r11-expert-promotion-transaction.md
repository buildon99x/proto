# R11 Expert promotion transaction slice

2026-10-10 UTC. Isolated implementation from source `806d61a`. This is a local
transaction/save-history checkpoint, not a published release or normal-input
promotion. No Expert skill is registered: the same25 Apprentice/Adept nodes
remain executable; Expert/Master nodes remain `DATA_ONLY`, and Master tier is
unsupported.

## Numerical provenance

- Expert minimum level15 comes from the preserved reference tier record.
- Bran, T completion/oath/commission, the120G protected fee,76-unit interaction
  radius and transactional save policy are authored Emberwatch rules. They are
  not newly verified or measured Hammerwatch II promotion requirements.
- `EXPERT_GOLD_COST` reuses `TOMB_TRAINING_RESERVE`; no second fee, currency,
  reservation or promotion receipt is introduced. Both reference files remain
  byte-identical to the starting commit.

## API and atomicity

`previewExpertPromotion(state)` is separate from the Adept preview and reports
level/quest/life blockers plus the fixed quote. `promoteExpert` is registered in
`reduceRuntime(state,command,context)`. The exact command fields are:

- `type:'promoteExpert'`
- `life`, `position:{x,y}`, `vitals:{hp,mana,stamina}`, strict `recovery`
- `expectedRevision`: controller/store revision, never `tomb_revision`
- `expectedGoldCost:120`

The separate reducer context is exactly `{revision}`. No context means
`REVISION_REQUIRED`; a stale token means `STALE_REVISION`. The controller checks
that same explicit token inside its queue before reduction and passes its live
revision. The existing session/store then independently checks the committed
head revision under its shared lock. The request token is never silently updated
and is never added to persistent world flags.

The trainer opening must await a successful checkpoint before rendering its
quote. Its submission must retain that revision and the exact committed pools
and recovery. Promotion rejects even a bounded HP refill or CD reset with
`REPORT_NOT_COMMITTED`. Reordered object keys are equivalent. Current legal
position is reported separately and still requires living current life, town,
Bran reach and LOS. Extra reward/NPC/channel fields are rejected.

Global validation runs before mutation and on the complete candidate. A complete
Adept/dungeon/Q/P/S/F/T history, retained oath and report/commission, full starters,
L15, living saved and submitted HP, exact120 reservation, fee quote and receipt
capacity are required. The transaction spends120 reserved gold, adds120 to
spentGold, clears the reservation, sets Expert and appends `r10:promote:expert`
once. It preserves `r5:promote:adept`, other receipts, tools, XP/SP, learned ranks,
attributes, equipment, defeats and depleted resources/recovery.

Total120/reserved120/spendable0 succeeds. Incorrect119 total or reserve is an
invalid state, never repaired. Duplicate current-token requests return
`ALREADY_PROMOTED`; stale duplicates may return `STALE_REVISION` first. A failed
save never updates the controller snapshot. Uncertain post-head outcomes remain
blocked until a verified reload establishes the durable result.

## Save/history boundary

Current `STATE_VERSION` is4, with explicit accepted envelope versions1/2/3/4.
Older versions are validated before pure in-memory migration. Version3 cannot
contain Expert/Master tier/nodes, Expert receipt, Banner branch, control-v3
fields or the planned Expert recovery extensions. Version1/2 still cannot
contain promoted tiers or newer controls. Loads leave original slot/head bytes
unchanged; an accepted command makes the new commit.

Q/P/S/F accept supported Adept or Expert history, preserving all other gates.
T's existing promotion-receipt/reservation equivalence remains authoritative.
`validatePromotion` retains the Adept receipt as history through Expert; it no
longer equates that receipt only with the current Adept label.

## Required R11 integration, outside this commit

1. Recovery owner introduces recovery schema2. This checkpoint keeps the existing
   recovery implementation for independent verification. State/S/F/T recovery
   checks already pass explicit `version:state.version<4?1:2` and
   `legacy:state.version<3`. When recovery schema2 lands, import `migrateRecovery`
   in state and replace `recoveryFrom(next)` during migration with
   `migrateRecovery(next.recovery,{legacy:state.version<3,character:next.character})`.
   Already-current recovery must validate and remain unchanged. Re-run legacy
   tests using genuine old recovery fixtures rather than merely relabeling a
   schema2 record as state version3.
2. Current command reports must be schema2 once that recovery implementation
   lands. Update old test literal reports to `emptyRecovery`/`battleReport`.
   Do not silently seed missing RNG, erase proc cooldowns or weaken saved-state
   validation to preserve a test fixture. Rest/retry RNG/CD policy belongs to
   the combat/recovery owner.
3. Trainer UI must add the separate Expert preview/command, await its opening
   checkpoint, capture the resulting quote revision, use tier-specific promoted
   text, and synchronize the successful state without rebuilding the battle.
   Main/UI/controls are untouched here.
4. `quarry-presentation.js` still has a private Adept-only eligibility check;
   widen that during UI integration. Older S/F completion strings still describe
   Expert promotion as unavailable and require deliberate copy updates.
5. Register Expert skills only with complete handlers/previews/save recovery and
   input. Minimal `runtimeTiers`/starter changes here are not such registration.
   No candidate namespace or QA save copy is added; existing root/R10 saves and
   release artifacts must stay isolated from later candidate publication.

## Verification and limits

New `expert-promotion.test.mjs` executes98 passing production-handler checks:
all four difficulty T routes (minimum/full); exact/excess protected balances;
real paid action checkpoint→controller promotion→live sync→store reload;
command shape/revision/fee/life/Bran/range/pool/recovery failures; missing history,
capacity and maximum-safe ledger; double clicks and queued checkpoint staleness;
pre/post-head failures and two-controller lock conflicts; death/retry and repeated
reloads; genuine promoted ancestor portal round trips and report idempotency;
legacy in-memory migration and valid-checksum bad-Expert rejection.

The fixtures script positions/kill reports through production reducers. Explicit
low-balance/L14/max-ledger fixtures are synthetic. They do not demonstrate earned
ordinary-input play, combat AI success, browser/UI interactions or quality. The
current town has no legal in-range point with blocked LOS to Bran, so no fabricated
natural wall/Bran observation is claimed; illegal-map/range paths and the existing
production world LOS tests cover their separate boundaries.

Final full suite:1344/1344 passed (1246 retained +98 new), zero failures/skips,
51.8seconds. Raw focused/full results are in docs/verification-r11-promotion/.
Source/test syntax, isolated temporary app build and original167-file integrity
passed. Root `pnpm sync:registry` was attempted and blocked by
`ENOENT /home/agent/.local/share/pnpm`; no registry output or root Vercel build
pass is claimed. No browser, remote write, publication or Library action ran.
