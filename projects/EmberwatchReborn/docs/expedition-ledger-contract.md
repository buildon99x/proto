# Optional quarry expedition: pure ledger foundation

2026-10-09 UTC. **Not yet playable. Actual runtime, battle, save migration and board integration are unimplemented and unverified. This is not a finished repeat-battle feature.**

## Scope and provenance

This increment adds only `app/src/expedition-content.js`, `app/src/expedition-ledger.js`, their production-function tests and this contract. No world region, map, portal, board, UI command, campaign reward, controller path or save version is changed. The current game still has no `quarry_drill` region and does not dispatch expedition commands.

The design follows `r6-adept-route-proposal.md` §5 and §7, the requirement trace in `requirements/warrior-completion-checklist.md`, and the inspected production `state.js`, `controller.js`, `save.js`, `combat.js`, `combat-persistence.js`, `recovery.js`, `campaign.js` and quarry files. The canonical v1.1/Library-v2 file remains locally unavailable as recorded in `requirements/requirements-source-status.json`; this is not a newly recovered original source or a new source-game measurement.

All expedition content and reward rules are authored Emberwatch adjustments. The six v1 enemy references comprise two raiders, two slingers and two guards. Their IDs and kinds are distinct from campaign enemies. Fixed foe definitions preserve the proposed quarry role tuning but give each kill **0 XP, 0G and no material**. The existing campaign's `CORE_REFERENCE.difficulty` supplies the same base enemy-health and enemy-damage multipliers. Completing all six and making an authorized living board report will grant **0 XP, 12G and iron 1**. Begin/reentry/abandon/completion never grants free HP, mana, stamina, cooldown reset or recovery. No campaign objective, potion, equipment, promotion, stock or old reward is replayed.

The content module intentionally provides no map or positions. A future map requires real geometry, path, spawn/arrival and ordinary-input checks before registration. Its data catalog does not demonstrate playable combat.

## Durable shape and invariants

The future state field is `expeditionLedger`. Its independent ledger version is 1; this is unrelated to game state version 4 or template content version 1.

```json
{
  "version": 1,
  "closedThrough": 0,
  "completedCount": 0,
  "abandonedCount": 0,
  "active": null
}
```

An active run has exactly:

```json
{
  "runId": 1,
  "templateId": "quarry_drill",
  "contentVersion": 1,
  "difficulty": "normal",
  "defeated": [],
  "status": "active"
}
```

- Only one run can be active, and its `runId` must equal `closedThrough + 1`.
- `closedThrough`, `completedCount` and `abandonedCount` are nonnegative safe integers. Their derived total-ended count is `completedCount + abandonedCount === closedThrough`. No separate, inconsistent total or per-run receipt log is stored.
- `closedThrough` identifies every ended serial run, successful or abandoned. Successful close/abandon increases it by exactly one; begin and kills preserve it. No operation truncates it, resets counts or reuses IDs.
- At `Number.MAX_SAFE_INTEGER`, an already-started last run can close. Another begin fails closed. No unsafe increment is attempted.
- Exact template ID, supported content version and saved campaign difficulty are required. Unknown content never falls back to the latest version, discards the active run, re-rolls enemies or grants compensating rewards.
- Only the template's six exact enemy IDs can enter `active.defeated`. Persisted IDs are unique; command batches are bounded to six entries and union repeated known IDs. Duplicate reports within the same run produce no grant and no value change. A newly enlarged union is stored in template order.
- The status remains `active` even with all six defeated: reporting is still pending. There is no life-specific run status. A death, retry or region reconstruction must preserve this run and its dead IDs.
- Every object has exactly its documented own enumerable data properties and ordinary prototype. Accessors, inherited fields, symbols, unknown fields, exotic prototypes, sparse/decorated arrays and invalid numbers are rejected without reading arbitrary getters or invoking serializers. Frozen inputs are accepted. Failures return no partial ledger or reward intent and never mutate inputs. Accepted values are detached copies.
- The fixed structure is bounded by six active IDs and safe-integer-sized counters. Telemetry or any optional bounded display history must remain outside reward authority. No expedition IDs go in `world.claimedRewards` or campaign `world.defeated`.

These are reducer-transition guarantees, not tamper protection. A standalone validator cannot tell whether an otherwise coherent supplied snapshot was copied from an older save. The caller must preserve the authoritative revision/commit path and never replace the current ledger with a client-supplied snapshot. The existing FNV checksum is accidental-corruption detection, not authentication. Generic whole-save recovery behavior must be tested with expedition rewards; this foundation does not claim to change storage recovery.

## Production API

`createExpeditionLedger()` creates a fresh inactive value. Use it only for a genuinely new game or the validated legacy migration below, never as recovery for missing or malformed v4 data.

`validateExpeditionLedger(ledger, {difficulty: state.difficulty})` validates the ledger and its authoritative difficulty. It returns `{ok:true}` or `{ok:false,code}`. Context must have exactly that difficulty field. Client-provided life/alive/board flags are not accepted as authorization.

`validateExpeditionRun(ledger, reference, context)` is the reusable read-only identity guard for future battle reports, checkpoints and travel. `reference` has exactly `runId`, `templateId`, `contentVersion` and `difficulty`. It rejects closed, future, absent, unsupported and mismatched runs. It does **not** replace the domain's life/region/resource validation.

`reduceExpeditionLedger(ledger, command, context)` executes the same authoritative operations that the future domain handler must call:

| Command type | Exact command fields besides type | Result |
| --- | --- | --- |
| `beginExpedition` | `expectedRunId`, `templateId`, `contentVersion`, `difficulty` | Creates only the expected next run if inactive; repeated start cannot implicitly restart |
| `recordExpeditionKills` | the four reference fields plus `defeated` | Unions known IDs into the same active run; no reward |
| `completeExpedition` | the four reference fields | Requires all six dead, closes once and emits fixed reward intent |
| `abandonExpedition` | the four reference fields | Closes once at any progress, including all six dead, with no reward |

Successful results have `{ok:true, ledger, changed}`. Only successful completion also has:

```json
{
  "rewardIntent": {
    "runId": 1,
    "templateId": "quarry_drill",
    "contentVersion": 1,
    "difficulty": "normal",
    "xp": 0,
    "gold": 12,
    "materials": {"iron": 1}
  }
}
```

The intent is an in-memory instruction for the **same atomic state transaction**, not a receipt to serialize, queue or apply later. The caller cannot supply a reward amount or ID. Failed application, resource overflow or commit failure must not expose either half of the result.

## Required future v4 integration gates

### 1. Read-only legacy load and explicit v4 state schema

1. Add `STATE_VERSION = 4` while preserving the state schema string and approved profile namespace. Keep genuine v1/v2/v3 validation, including equipment/control/recovery migrations and existing promotion/quarry guards.
2. First validate the original legacy object under its own version. Reject any expedition field in versions 1–3, even a seemingly empty or `undefined` property; the older schema never owned it. Reject partial/future/malformed expedition data rather than inferring progress. A v4 object must contain a complete valid ledger.
3. Migrate only validated legacy saves **without** expedition data to a cloned v4 state with `createExpeditionLedger()`. Keep XP, gold, receipts, defeated IDs, equipment, options, position, life, vitals and paid recovery. Do not accept an expedition merely because quarry is complete.
4. `createController.load()` may expose that validated in-memory migration but must never call `store.save()`. Repeated loads must leave both slots/head byte-for-byte unchanged. The first authorized gameplay command commits v4 via the normal expected-revision path. Existing older builds already reject an unsupported state version; test their behavior against v4 fixtures rather than asserting a new runtime result now.
5. Validate the new ledger against `state.difficulty` on every full-state validation and transition. Reject expedition region/visited/defeated/receipt artifacts in a state that has no legitimate expedition ledger. Do not silently accept an expedition-shaped extension on an older permissive object.

### 2. Domain authorization before this reducer

All public commands need a strict domain envelope containing the expected run reference, current `life`, exact current `region`, current legal position, current vitals and complete recovery. Obtain difficulty/template from authoritative state/catalog; reject conflicting client copies. Use descriptor-safe validation before cloning. Do not weaken existing epoch, same-life, input reservation or runtime-gate checks.

- **Begin:** require living saved and reported HP, `world.lifeDown !== true`, `command.life === (world.life ?? 0)`, `command.region === world.region === 'ash_hamlet'`, legitimate quarry final-report progress/receipt and actual required promotion, the real board object, distance at most 76 and unobstructed LOS. Validate legal hero-radius position, vitals at or below derived maxima and full recovery. The UI captures a fixed `expectedRunId`; a queued duplicate must not recompute the next value after a different command has closed a run. Starting must leave resources/recovery unchanged except for the submitted, validated current snapshot.
- **Kill settlement:** require a matching active reference, authoritative `world.region === template.regionId`, matching report region and current life, with `lifeDown` still false before settlement. Validate all six-domain IDs and the complete report before accepting any. **HP 0 is permitted for a new same-frame death report**: union those kills before applying the existing single death loss, record resources/recovery and death together, and preserve the ledger. Never pass expedition enemies through campaign kill XP/G or campaign defeated receipts.
- **Checkpoint:** require active reference when inside an expedition, current life, exact current region, legal position, living HP, capped vitals and complete paid recovery. Checkpoint only snapshots the same run; it cannot create, abandon or clear one. For a town checkpoint during an active expedition, retain the active ledger and reject stale expedition-context data rather than treating it as a fresh town event.
- **Travel/reentry:** require current life, current source region, the exact permitted portal/destination, nearby legal position and LOS, living current report, capped resources/recovery and a valid active reference for expedition entry/exit. Reentry uses the existing active ID and dead set. Creating/reconstructing a battle is never a begin command. A begin/completion/abandon must not itself heal or clear cooldowns. Campaign portal handling remains independent.
- **Complete:** require the same living, same-life, legal/capped, near-board/LOS conditions as begin, now with `validateExpeditionRun` for the still-active run. Only then call `completeExpedition`. Being all-dead in the pure ledger is necessary but **not sufficient** for gameplay payment. Final-enemy simultaneous death leaves a complete kill set pending; report is disallowed until ordinary retry has made the hero alive and they reach the board.
- **Abandon:** require the active reference and the same living same-life board conditions; show an explicit irreversible, no-reward confirmation before dispatch. Closing after all six kills still gives no reward. Confirmation binds that run ID, so a delayed confirmation cannot abandon a replacement run.
- **Death/retry/rest:** use their existing authorized domain paths. A successful retry increments life and moves/heals only as that existing operation specifies; the expedition run ID/dead set are unchanged. Old-life battle or board commands must be rejected **before** ledger reduction. No life is stored in the ledger because one run may legitimately span multiple lives.

### 3. Actual battleReport/checkpoint/travel wiring

`createBattle` currently obtains enemies from `world.defeated[region.id]`; `battleReport` currently emits only life/position/vitals/recovery; `combatCheckpoint` emits generic `settleCombat`/`checkpoint`; `campaign.js` settlement resolves every foe via the global campaign catalog. None currently recognizes this ledger.

The future implementation must:

1. Register a separately verified `quarry_drill` map/foe namespace and explicit board/portal route. Select the template by the persisted exact supported version. Construct only enemies absent from `active.defeated`; keep campaign `createBattle` behavior unchanged elsewhere.
2. Capture the validated active run reference and region on the battle instance alongside `stateLife`. Include that captured reference and region in actual `battleReport`, including reports with no kills. Never reconstruct a missing reference from whatever run happens to be current at dispatch time.
3. Route actual `combatCheckpoint` kill/death/checkpoint commands to expedition-aware domain handlers when the captured battle context is expedition. Extend existing travel and manual-save reports likewise. The handler revalidates state/run/life/region on dequeue, not only when UI input was captured.
4. Freeze simulation/input while a durable commit is pending, preserving paid HP/MP/stamina/cooldowns/action lock/mana delay/stamina delay/invulnerability/potion cooldown/regen buff. Reentry may reset *surviving enemy* HP/position/debuffs under the existing documented reconstruction policy; it may not reset hero costs or the six-ID ledger.
5. Carry the returned ledger and fixed reward in one cloned state: increment `gold`, `stats.earnedGold` and `inventory.materials.iron` with safe-integer overflow checks; leave earned XP, level, campaign receipts/defeated/objectives and all other inventory unchanged. Keep separate optional kill telemetry if needed; do not make campaign kill-count invariants depend on repeat enemies.
6. Run full `validateState` and commit once through the existing controller queue, `expectedRevision`, Web Lock, slot write and head receipt. Before head publication, neither next ledger nor reward may be visible. After uncertain head publication, block input until a successful explicit load establishes committed state; never replay a cached reward intent. Conflicts must reload the ledger before another command.

### 4. Integration acceptance still required

Run real domain/controller/store regressions for board alive/life/region/near/LOS/eligibility, same-frame last kill plus death, return/retry/reentry, full recovery persistence, runtime checkpoint routing, stale old-run and old-life inputs, duplicate begin/report/abandon, two tabs, reward overflow, slot/head write failures, commit uncertainty, reload and v1/v2/v3 read-only migration. Then exercise the real board/travel/combat with ordinary controls and observe recovery and difficulty behavior. Current pure tests cannot substitute for any of those checks.

## Foundation verification

The focused suite executes the actual exported production reducer/validators, not a parallel settlement fixture or invented game handler. It covers all 64 enemy subsets, every next enemy, four difficulties, exact reward intent, immutable failures/results, duplicate same-run and stale cross-run reports, complete/abandon/new-run ordering, safe-integer boundaries, hostile shapes, unsupported content and 10,000 serial runs. It asserts that the current runtime still does **not** expose the feature.

The 10,000-run test keeps five top-level ledger fields and at most six active IDs; closed JSON stays below 128 bytes and both all-six-defeated and newly empty active-run ledgers below 512 bytes. Those bounds are structure/serialization checks, not gameplay performance, economic sustainability or proof of controller atomicity.

Focused verification on 2026-10-09: `cd app && node --test tests/expedition-ledger.test.mjs` passed **30/30** tests. `node --check` passed for both new source modules and their test. This worker did not run the aggregate suite/build, a browser, a Site publish, a Library archive or Git commit. The integration owner must report its own final-source aggregate results separately; no earlier checkpoint's pass count is inherited here.
