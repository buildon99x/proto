# Validation reuse: ownership and dependency review

Date: 2026-10-11 UTC. Source read: `/workspace/shared/emberwatch-r14a17-scene-cache-project`.

## Decision summary

This is a second-phase design review, separate from the approved head-first slot-decoder patch. It authorizes or implements no additional optimization.

1. The inspected gameplay/content catalogs used by `validateState` are recursively frozen, or are completely frozen at all levels of their current shallow scalar structure. Their mutability is **not an identified production blocker** to canonical-state validation reuse.
2. State identity is a sufficient semantic cache key only for a privately certified detached immutable root, under the fixed validation-module/catalog version and unchanged standard prototype/intrinsic environment. Arbitrary frozen trees, caller-owned mutable state and Proxies must continue to traverse the original validator every time.
3. The narrowest input-side change is a private migration body, callable without the repeated validation **only after validation of the exact owned/certified input**. A public unchecked helper or unconditional replacement inside `reduceRuntime` is unsafe. A concrete Proxy/command counterexample is below.
4. A canonical-only `validateState` memo plus controller-owned canonical roots can avoid repeated full traversals while leaving validation calls and decision ordering intact. It is broader than the migration helper and needs explicit storage-adapter compatibility. Freezing only main's display copy does not help controller validation.
5. Reducing all three produced-state validations to one requires the same canonical result identity to exist **before the first produced-state validation**, then survive commit/store boundaries without exposure or mutation. Simply freezing after `reduceRuntime` has already validated a mutable result cannot retroactively eliminate that first traversal. Public reducer results and controller snapshots must remain independently mutable.
6. None of these mechanisms proves a command is fresh, a save is durable, or a storage revision is current. Every command, life, queue, profile, CAS, Web Lock, recovery-receipt and failure gate stays in place.

Scope: source reads and this document only. No implementation, executable probe, benchmark, suite, browser, Git or deployment was run. The parent reported pre-head-first baseline controller-dispatch p50 values of 123.3–134.3 ms across four stages; those timings were not independently measured here and do not predict a second optimization's effect.

## 1. Current boundaries and traversal count

For the audited successful campaign checkpoint/settlement path, the original seven top-level full-validation calls were:

- Input A: `state.js:131`, beginning of `reduceRuntime`.
- Input A again: `state.js:143` calls exported `migrateState`, whose first line validates (`:119`).
- Result B: `state.js:160`, after campaign reduction.
- Result B again: `controller.js:11`, before the adapter call.
- Result B again: original `save.js:56`, public store ingress.
- Two independently decoded stored states: original `save.js:43,31`, called from save's `load`.

This is a static successful-path count, not a timing sample. Nested validators and failed/other command branches vary. The independent head-first patch targets the final unused alternate-slot traversal only. This document does not modify or assess that patch's current working copy.

Ownership today:

- Controller private state is detached by JSON cloning on commit (`controller.js:22`); load assigns a migrated copy (`:31`). Public `snapshot`, `capture`, dispatch/load results and subscriber events are clones (`:7,9,24,32,67`).
- Commands are validated and cloned **before** enqueue (`controller.js:49–52`), preventing subsequent caller edits from changing queued intent.
- Reducers normally create mutable candidates by JSON/structured cloning; campaign does so at `campaign.js:24`, slot reducers at `action-slots.js:22` and `skill-loadout.js:49`, and region reducers similarly clone before mutation.
- The mutable produced candidate is passed to an arbitrary supplied `store.save` adapter and retained across its await (`controller.js:14`). The adapter boundary is therefore materially different from a synchronous private reducer-to-validator boundary.
- Main freezes only its detached received copy after successful dispatch. That root is not the controller's private state or the object already validated by the store.

## 2. Catalog and ambient dependency audit

### Frozen catalogs actually found

The following conclusions are based on their construction source, not a runtime `Object.isFrozen` probe:

| Validator dependency | Source evidence | Conclusion |
| --- | --- | --- |
| `CORE_REFERENCE` | `reference-core.js:3–4`: recursive `Object.values(...).forEach(freeze)` then `Object.freeze` | Complete plain object/array tree frozen |
| `WARRIOR_REFERENCE`, skill rows, costs, rank values | `reference-warrior.js:263–283`: recursive `deepFreeze` applied to the catalog | Complete constructed tree frozen; current inputs are locally constructed plain values |
| `WARRIOR_BALANCE`, training allowlists | `warrior-balance.js:2–6`: recursive freeze; `warrior-growth.js:10` aliases its runtime skill list | The aliased runtime list is frozen too |
| `EXPERT_BALANCE` | `warrior-expert.js:3–18`: recursive freeze | Complete tree frozen |
| `PROGRESSION_BALANCE` | `progression-balance.js:9,19`: root, `xpBands` array, each band explicitly frozen | All current nested objects frozen; other fields are scalars |
| Equipment items, vendor stock, recipes, upgrades, awards and limits | `equipment-content.js:3–43`: recursive freeze on each exported data collection | Nested receipt replay/equipment-policy data frozen |
| Dungeon, quarry, pass, signal, furnace, tomb, battlefield and wilderness content | Recursive freeze helpers at `dungeon-content.js:3`, `quarry-content.js:3`, `pass-content.js:3`, `signal-content.js:4`, `furnace-content.js:4`, `tomb-content.js:3`, `battlefield-content.js:3`, `wilderness-content.js:6`; exported regions/groups/rewards/tools/defaults/receipts use them | All inspected exported catalog data frozen |
| World `REGIONS`, `FOES` | `world.js:13–29`: recursive freeze of composed catalogs, town/road definitions and encounters | `getRegion` and `findEnemy` expose frozen definitions |
| Hero status rules | `hero-status.js:4–11`: root and each rule frozen; current rule fields are all scalars | Complete current rule structure frozen |
| State difficulties/reward values, action/skill slot constants | `state.js:28,127–129`, `skill-loadout.js:5–6`, `warrior-growth.js:8–12` | Current object/array data frozen |

`WARRIOR_REFERENCE.deepFreeze` skips a subtree already frozen at its root. That is not a general-purpose proof for arbitrary caller trees, but its present catalog is locally constructed and contains no supplied shallow-frozen external subtree. Do not generalize this helper's safety to untrusted inputs.

### Private mutable implementation collections

- `warrior-growth.js:13` and `warrior-expert.js:65` build private `Map` indexes of frozen skill rows. Their inspected usages only read them; the maps are not exported and no post-construction mutator was found.
- Recovery action/scalar lists and expert cooldown constants (`recovery.js:4–7`), private validator reason maps, objective-name arrays and reserved-key sets are not all individually frozen. They are closure-local and no production mutation path was found.
- Equipment replay creates fresh mutable Maps/Sets per validation (`equipment.js:71,177–211`); these are computation-local, not shared mutable catalogs.
- Exported `*_COMMANDS` Sets are mutable. They influence reducer dispatch/command validity, not the result of `validateState` itself. Thus **do not cache reducer or command decisions by state identity**. Freezing a Set's object shell would not freeze its contents anyway.

### No time-dependent validation identified

`validateState` and its inspected validator dependency path read saved values and fixed rules. `validateTownPortal` (`town-portal.js:16–21`) checks saved timestamps/geometry; it does not read the live clock. `townPortalRemaining`, availability and portal command reduction do read time, but are separate operations and must not be folded into a state-validity cache. Map geometry is reconstructed from frozen region data plus this state’s objectives (`world.js:31`, `world-geometry.js:14–19`).

### Important limit: frozen own data is not a frozen JavaScript realm

`freezeOwnedSnapshot` creates ordinary objects/arrays with `Object.prototype`/`Array.prototype` (`immutable-snapshot.js:19,29`). It does not freeze those prototypes or standard intrinsic methods. The catalogs have the same general limitation. For example, after validating a canonical state with no own `recovery`, introducing a malformed inherited `Object.prototype.recovery` can change a fresh validator's `state.recovery` lookup while a prior identity memo remains successful. The own root data did not change.

No such prototype/intrinsic mutation path was identified in normal production code. The existing a17 wilderness identity cache already relies on the ordinary fixed-module, unmodified-prototype environment. State-only memoization may use that same explicit assumption; it must not be described as correct under arbitrary hostile same-realm code or hot replacement of validation rules. If runtime catalog/module updates are later supported, invalidate the memo or bind it to a validation-rule epoch. Do not freeze global prototypes or change global intrinsic semantics in this optimization.

## 3. Canonical provenance is not a validation result

`immutable-snapshot.js:4,40–54` privately certifies only roots made by its descriptor-copy routine. It rejects accessors, sparse arrays, symbols, hidden/reserved keys and unsupported prototypes, builds its own objects, deep-freezes them and keeps a private WeakSet. External aliases stay mutable. Only the returned root is certified; wrapping it in a Proxy does not inherit that membership.

Consequences:

- `isImmutableSnapshot(root)` allows reuse **after validating that exact canonical root**. It is not a gameplay-validity test, current-schema test, migration-complete marker, committed-save receipt, owner/profile identity or command authorization.
- A canonically copied malformed state still needs its first full semantic validation. Caching a rejection is permissible for this stable exact root, but the returned failure object must be fresh and must retain the same first-failure code/reason/shape.
- Never seed a canonical root as valid solely because the original caller object was validated before copying. A Proxy may return different descriptor values or synthesize missing reads; the original and its detached plain copy are not automatically equivalent.
- JSON stringify/parse of an unvalidated input is not a safe validation replacement: it can coerce nonfinite values, drop fields or invoke `toJSON` behavior. Public rejection ordering must survive.
- Do not enlarge certification to arbitrary `Object.isFrozen` trees. The existing dynamic missing-property Proxy fixture explicitly defeats that shortcut.
- `freezeOwnedSnapshot` has its own node/depth/shape limits. Full `validateState` also always traverses equipment's `jsonData` (`equipment.js:42–54,177–178`), which rejects reserved keys and limits depth to 32 and nodes to 250000. This supports compatibility of successful current plain states with the canonical copier's depth 40/node 250000 limits, but boundary parity must be tested; never replace the original failure with a generic copy exception merely because copying was moved earlier.

## 4. Candidate comparison

### A. Private validated migration body: narrow input-side option

Extract only the existing migration transform (`state.js:120–122`) behind a non-exported helper. Keep exported `migrateState`'s validation, legacy-before-migration rules and exception behavior. Inside reduction, use the helper only when the exact input was just validated and certified ownership guarantees it cannot change during command/context inspection. Otherwise use the existing public migration path with its revalidation.

Controller private canonical roots would make this fast branch usable. Merely adding the helper while controller state remains an ordinary clone does not justify silently trusting all public `reduceRuntime` calls. A properly isolated internal ownership capability could work instead, but must not be a public boolean such as `validated: true`.

This removes at most the repeated input migration traversal, not the produced-state or stored-slot validations. If a canonical-only full-state memo is adopted, the repeated migration validation is already a cheap memo lookup; a second unchecked helper then adds complexity for little additional structural benefit. Do not stack both approaches automatically.

### B. Canonical-only `validateState` memo plus controller roots

Retain a full uncached validator with unchanged branch/failure order. The exported wrapper may reuse results only for certified roots. Use a WeakMap keyed by the **whole exact root**; store a private frozen result and return a fresh result object. Mutable values, caller-frozen values and Proxies always go through the original validator. Do not cache thrown exceptions or convert them to a new failure code.

Controller roots must be canonical, detached and semantically validated before reuse. Public snapshot/capture/load/dispatch returns and listener events remain detached mutable copies. A new reducer candidate gets a new identity; successful save installs it only after acknowledgement. Failed/uncertain save retains the previously committed root/revision and blocks exactly as today.

This preserves visible validation calls and their ordering more naturally than deleting checks. It can remove the two repeated full input traversals in a steady-state dispatch if that exact committed root was validated previously. It does not automatically remove mutable-result validations. The result path needs its own design below.

### C. Private owned-result path: necessary for all result-side reuse

Today the reducer validates a mutable result before the controller sees it. If the controller then copies/freezes the result and fully validates that new canonical identity, it has performed a second full produced-state check. A later store memo hit can remove only the third check. Do not claim three-to-one traversal reduction for that design.

For three-to-one result reuse, an internal reducer path would need to finalize the canonical candidate **before** the first final-result validation, then pass that exact identity through controller commit and the cooperating store. The public reducer wrapper must still return a detached mutable result, so this is a substantive ownership/API refactor, not a validation-line deletion.

All reducer branches must share the same finalization invariant, including early tutorial returns, equipment replay, promotions, slot assignments, region commands and generic options/attributes. Keep command/reducer validation intact; final state validity cannot replace correct economic or command processing. Preserve events and result metadata, including replay flags, without aliasing the private canonical state.

### D. Arbitrary adapter compatibility is a separate decision

`createController(store)` currently accepts any adapter; `store.save(next, ...)` receives a mutable candidate. Passing a frozen root instead can make an adapter's mutation throw, or change what it eventually stores. Even a mere adapter assertion about input mutability can become a new `COMMIT_UNCERTAIN` path. Existing test adapters mostly wrap/delay real stores; that is not evidence that every external adapter is nonmutating.

Options requiring explicit design selection:

1. Keep arbitrary adapters on the existing mutable-copy path, with full store-ingress validation; allow canonical propagation only through a genuinely private cooperating-store capability whose nonmutation contract is established.
2. Preserve mutable adapter arguments and retain a separate canonical candidate privately. Do **not** install the pre-await candidate if the adapter changed the mutable argument: current code clones the post-await `next`. Maintaining exact adapter semantics needs an explicit equality/fallback policy, which adds work and complexity. No such policy is implemented or endorsed as a small patch here.
3. Make adapters nonmutating by a documented API change and test it. That changes the current generic boundary and is outside a strict compatibility-only optimization.

Never use a caller-spoofable flag or trust an arbitrary adapter because its method is named `save`. Store validation must remain present for all direct mutable public save calls.

## 5. Concrete counterexamples to unsafe shortcuts

### Removing public migration revalidation accepts a repaired invalid input

Start with a valid mutable state and a command equivalent to `setOption(flashes=0)`, wrapped in a Proxy whose prototype/descriptor inspection trap changes `state.options.flashes` to 2. `reduceRuntime` first validates the state, then inspects the command (`state.js:131–133`). The existing `migrateState` validates again and rejects the now-invalid state. If its validation is skipped unconditionally, the unchecked migration copies the invalid state and the option handler can repair flashes to 0, producing a valid final state and success where baseline rejected/threw. Descriptor-based validation avoids invoking getters, but JavaScript Proxy inspection traps can still run.

This is a static code-path counterexample, not an executed test. Public mutable/Proxy calls must retain original behavior; canonical/private-state guarantees are the condition for a fast path.

### Caching mutable reducer output becomes stale before public save

A public caller receives successful `reduceRuntime(...).state`, changes gold, vitals or recovery in place, then calls `store.save` with the same object. An identity memo seeded on that mutable result would bypass the store's present rejection. Object identity or “came from our reducer once” is insufficient.

### Canonicalizing or installing state after durable write can strand the transaction

If a newly added copy/freeze operation throws only after the store has committed, the controller can remain on the old revision despite durable new bytes. Prepare fallible canonicalization/validation before the durable write where possible. If a post-write step can still fail, preserve uncertain-commit blocking/reload semantics rather than pretending nothing committed or retrying. Adapter mutation complicates this ordering and cannot be ignored.

### `version === 5` is not a migrated-state certificate

`migrateState` still supplies `actionSlots`, migrates controls and recovery, and returns a detached copy for current-version inputs. A valid v5 caller state can lack optional defaulted fields. Skipping migration solely because the version matches changes normalization and aliasing behavior.

### Same state validity does not imply same operation validity

Two identical valid state payloads can belong to distinct profiles/revisions or precede/ follow a concurrent write. Cached validity says nothing about `expectedStoreRevision`, action-slot quote revision, life, region, an objective epoch, portal current time, reward idempotence or whether an uncertain head write succeeded. Keep these checks at their original execution points.

## 6. Required invariant ledger

- **Admission:** public mutable validation and migration retain original decisions, order and exception behavior. No getter execution is introduced. Canonical-copy failures do not hide a more specific existing error.
- **Queued intent:** clone before enqueue; never defer command snapshotting or re-stamp a stale quote/report when dequeued. The trusted context uses the live controller revision then, not a cached command result.
- **Owned state:** cache only exact certified roots; no returned reference, event or retained adapter argument may mutate the root. A new proposed state has a fresh identity.
- **Candidate versus commit:** valid candidate is not committed. Install state/revision and notify listeners only after successful save; failures retain prior committed state and existing block classification.
- **Store:** continue state validation at public ingress, payload limits, actual storage reads, revision CAS, profile Web Lock, alternate staging, both readbacks, receipt-only recovery and upgrade fences.
- **Life/economy:** kills, rewards, paid recovery/RNG and same-frame death charge remain one settlement; retry follows durable death and increments life once. No cached semantic success authorizes a replay.
- **Time/module:** semantic cache is confined to the fixed validation implementation/catalog environment. No memoization of portal availability, runtime combat or command outcomes.
- **API:** `snapshot`, `capture.state`, dispatch/load result state, public reducer output and subscriber events stay independent mutable data; errors/results returned by memo lookup cannot be edited to poison future calls.

## 7. Required focused regressions before implementation acceptance

1. Differential `validateState` decisions on the same fixture/corruption matrix for mutable, certified canonical, shallow-frozen, recursively caller-frozen and Proxy inputs. Check full result object or exception, not merely `.ok`.
2. First validation of malformed canonical roots still fails. Mutating a returned cached success/failure object cannot change the next decision. Proxy wrapping a certified root does not hit the cache.
3. Dynamic missing-property Proxies, getter/accessor traps, symbol/hidden/reserved keys, sparse arrays, cycles, aliasing trees and node/depth boundary cases retain baseline rejection/exception behavior. Include the command-Proxy state-mutation/repair counterexample above and a context-Proxy variant.
4. Original source aliases remain mutable after canonicalization; edits cannot change private roots. All public reducer/controller/load/snapshot/capture/event outputs remain independently mutable and cannot alter each other or the cache.
5. Inspect frozen dependency trees in a separate focused invariant test when execution is authorized. Verify every relevant nested catalog value rather than only root `Object.isFrozen`. Document the unsupported global-prototype/hot-module mutation assumption; do not silently create an invalidation claim the code does not implement.
6. v1–v5 legacy inputs validate in their original envelope before migration. Current v5 optional defaults are still filled, migration stays detached/read-only, and future-mechanics forgery rejects with the same error. No load rewrites stored bytes.
7. Command objects edited after enqueue do not change intent. Queued identical commands retain one-commit/stale-result semantics. Context revision/life/profile/region/objective identity is checked freshly on every command despite state memo hits.
8. Direct mutable store inputs edited after prior validation or public reduction still reject; same revision in two profiles cannot borrow commit authority. Two controllers still conflict on the real store after one commits.
9. Slow adapters, adapters inspecting or mutating the candidate, retained aliases, throw-before-write and write-then-throw have explicitly selected behavior. A frozen fast path must not leak into generic adapters unintentionally.
10. Candidate validation/canonicalization failure makes no storage write. Stage/head/readback failures, quota/lock failures and uncertain head commit preserve state/revision, listener count, input cancellation and reload gates. No memo token permits reuse after failed/uncertain save.
11. Same-frame kill/death, repeated dead load, successful/failed retry, cooldown/RNG debt, travel, portal and slot changes retain existing atomicity. Re-run the established delayed-input 150 ms and >500 ms safety regressions when authorized; this optimization must not change their thresholds or bypass busy.
12. Verify all reducer result branches, including early returns, use exactly the intended ownership path. Separately count full uncached traversals, cache hits and copies with tiny focused instrumentation; distinguish that structural result from uninstrumented elapsed measurements. Do not infer native input acceptance from a traversal count.

Relevant existing suites include `state-save.test.mjs`, `wilderness-controller-save.test.mjs`, `immutable-snapshot.test.mjs`, `wilderness-immutable-cache.test.mjs`, `upgrade-backup*.test.mjs`, slot/promotion tests, `action-safety.test.mjs`, `runtime-sync.test.mjs`, `charge-contact-save.test.mjs` and `dead-save-resume.test.mjs`. They were read or identified, not run in this task.

## Recommended next decision

Finish and assess the separately approved head-first patch first. For a second change, choose one explicit scope: an input-only canonical/private migration fast path, or a canonical-only full-state memo plus controller ownership with a defined generic-adapter fallback. Do not silently include an owned-result/API refactor to claim all five repeated input/result traversals were removed. The catalog audit supports exploring certified immutable memoization; adapter ownership, public mutable semantics and failure ordering remain the necessary design work.
