# R14a17 save-wait input and atomicity review

Reviewed 2026-10-11 UTC. Source: `/workspace/shared/emberwatch-r14a17-scene-cache-project`.

## Result

The current `busy` barrier is necessary to the implemented persistence contract. It freezes gameplay between a live combat report and durable save acknowledgement. Removing it, ignoring the promise, or letting simulation advance without a new reconciliation design is unsafe. The input-expiry notice is a real 150 ms wall-clock input-age decision; it is not, by itself, a measurement of storage I/O or Web Lock latency.

There is definite repeated semantic validation on the successful checkpoint path. The first candidate should be **head-first lazy slot decoding**, while keeping all three storage reads and their order unchanged. It can remove one unnecessary semantic validation on a valid-head load without introducing persistent cache ownership. After baseline measurement, a store-local bounded cache keyed by the **entire exact serialized slot string** is a possible further candidate. Both are materially narrower than changing controller ownership plus global state-validation memoization. No lock, read, revision, receipt, readback, upgrade or failure boundary may be weakened. No speedup or native-play fix is established by this review.

This review only read source and existing test definitions. No source, existing gameplay artifact, save profile, Git state or deployment was changed; no browser, test suite, benchmark or timing experiment was run. This report is the only authored deliverable. Existing tests listed below were inspected, not rerun.

## 1. Why combat becomes busy

Relevant source:

- `main.js:113–133`: a physical input can start an action immediately through `flushFreshCombatInput`, except while busy or waiting for action-safety reconciliation.
- `main.js:162–170`: combat events generate a report, bind it to `controller.capture().revision`, and dispatch it as critical.
- `combat-persistence.js:2–14`: critical triggers include action start, roll/knockdown, hero hurt, healing, channel payment/end, regeneration/status/proc changes, combat RNG and safety cancellation. Defeat or death becomes `settleCombat`; otherwise a critical event or one elapsed simulation second becomes `checkpoint`.
- `main.js:204–220`: `busy` becomes true before the controller promise starts, and normal success clears it only after the promise resolves. Successful receipt replaces the UI state with an owned immutable copy and synchronizes the live battle. Failures clear input; critical failures close the runtime gate even if a storage error is nominally recoverable.
- `runtime-gate.js:9` and `main.js:730–735`: busy disables stepping. Rendering can continue, but simulation, action clocks, resource regeneration and enemy damage do not advance.
- `action-safety.js:1–23`: a safety cancellation requested during a commit clears captured input immediately but waits for that commit's reconciliation before mutating the live paid action.

This means a paid action can begin before its damage/contact animation advances, then wait for the saved resource/cooldown report to become durable. Combat-save activity is intentionally much more frequent than a menu's manual Save action.

Important precision: ordinary `syncCommittedBattle` (`runtime-sync.js:11–27`) copies saved vitals, derived stats and potion cooldown into the live battle. It intentionally preserves the running action, ordinary skill cooldowns, recovery timing, intent and transient combat. Only the explicit successful rest branch resets all recovery/transient fields. A broad description that every checkpoint rewinds every recovery field would be incorrect.

## 2. What the expiry notice proves

- The exact notice in the request appears at `main.js:169` and `:731` after `router.expirePending(performance.now())` and `skillCapture.expirePending(performance.now())`.
- `controls.js:92` expires pending pulses when age is strictly greater than 150 ms, or the clock is invalid/backwards. `skill-loadout-input.js:88` uses the same default from `immediate-input.js:3`.
- Deferred skill/expert/immediate queues likewise use 150 ms, scoped to the captured runtime/life/region/control identity. Their notice text is slightly different (`main.js:175–177`, `:727`).
- The exact notice therefore means an undelivered input edge exceeded its age budget by the next allowed consumption check. Its wording does not independently prove that all that elapsed time was storage I/O. Controller-queue delay, synchronous validation/stringification/slot decoding, a Web Lock wait, localStorage calls, scheduling or other main-thread work can contribute.
- The `createSession` save is asynchronous because it awaits Web Locks (`save.js:100–106`); the actual `createStore.save` body is synchronous once its lock callback begins. Calling it fire-and-forget does not remove that synchronous work.
- The expiry check is also called whenever a playable frame consumes pending inputs, without requiring a recorded prior busy interval. A stale pending edge alone is sufficient for this notice.
- Expiring an edge is not a blanket release of all held physical keys. Preserve the existing held-input/auto-repeat semantics; a genuinely still-held action can have separate later eligibility.

The parent supplied separate evidence during this audit: native input observation 44 was `dodgeSprint` with save-wait and `save-input-expired`, and its independent logical-clock reproduction delivered at 149/150 ms and expired at 151/300 ms. That evidence was reported by the parent, not rerun here. It identifies the affected input/threshold; it does not yet apportion save latency.

## 3. Existing atomicity boundaries

### Controller and command epoch

`controller.js:7–9,49–64` captures detached command data, serializes operations, and evaluates each command against the controller revision at dequeue time. `state.js:130–142` rejects stale supplied `expectedStoreRevision`. The main report captures life and region from its original battle and the committed store epoch together (`main.js:194–201`); it must not silently relabel old reports after a later commit.

Controller state/revision and the committed announcement change only after a successful store result (`controller.js:10–24`). `CONFLICT`, `COMMIT_UNCERTAIN`, `CORRUPT` and upgrade failures block that controller until reload. The main runtime additionally blocks every failed **critical** combat commit (`main.js:207`), including a recoverable quota/write/lock failure. This extra gate is necessary because the live battle has already paid or been hurt.

### Store CAS, staging and recovery

`save.js:55–95` validates the proposed state, reads the actual store, checks expected revision, stages the alternate slot, verifies the staged bytes, checks unchanged head, writes the head as the commit point, and verifies the committed head. `createSession` holds the profile-specific exclusive Web Lock over the store operation. The synchronous `createStore` alone is intentionally an isolated adapter/test primitive, not a substitute for browser locking.

`load` (`save.js:39–53`) returns only a slot identified by a valid head receipt, or an existing fallback commit receipt. It never promotes the highest staged revision solely because it looks newer. Head-write-then-throw must remain uncertain until reload: the storage may have committed despite the caller's error. Upgrade fences and backup receipts are part of this same protocol.

### Defeat, death, retry and economy

`campaign.js:60–73` handles all reported kills, their receipts/rewards, recovery/vitals and one death charge in one proposed state. Same-frame kills settle before the death loss. Death clears selected transient saved buffs/statuses, increments deaths, marks `lifeDown` and clears the personal portal. `retry` (`:98–100`) requires the durable down state and increments life once while preserving the designated cooldown/RNG history.

The UI shows the normal death flow only after the critical settlement reports success (`main.js:165`). On a failed/uncertain death settlement the correct outcome is the save-recovery gate, not retrying speculatively. Existing kill receipts and life/epoch checks provide important idempotence but cannot reconcile arbitrary live simulation that continued past an older report.

## 4. What breaks if asynchronous saves are ignored

1. **Later resource/damage changes are overwritten.** Suppose a report records mana 90 and HP 80, then continued simulation spends another 10 mana and takes 20 damage. The old successful callback assigns mana 90/HP 80 back into the live player. Running actions, enemies, effects, cooldown timing and combat RNG are largely retained, producing a mixture of two moments rather than a coherent snapshot.
2. **Critical events can be dropped.** If only the frame/input busy gate is removed, `main.dispatch` still returns false while busy. A later defeat or death event generated during that time is not automatically queued or replayed. The live enemy may remain defeated, while its receipt/reward never reached the store. An older alive callback can overwrite vitals after a later live death, leaving contradictory life/death state.
3. **Removing both guards does not fix this.** The controller queues commands, but multiple live reports captured at revision R do not become valid at R+1. Later reports correctly fail as stale. Re-stamping them with the new revision defeats the protection against old pools, recovery and objective snapshots rolling back later progress.
4. **Paid action cancellation loses its ordering guarantee.** The safety coordinator deliberately waits for reconciliation before canceling paid channel/mobility state. Advancing pulses, normal release or finish effects while that earlier payment is unresolved can turn a safety cancel into late offense or leave non-durable resource debt.
5. **Failure ceases to have a single recovery point.** The current error gate leaves the last committed controller state intact and reload resolves uncertainty. Continued speculative effects would need a complete rollback/replay design covering enemies, drops, RNG, action/channel ownership, input identities, portals and death/retry. Such a design is not present.

The likely failures include lost events, refunds of later costs/damage, repeated consumption on an unsafe replay, and stale-life/epoch rejection. Duplicate gold is not inevitable because existing receipts still reject many repeated rewards; those receipts are not a general speculative-execution safety mechanism.

## 5. Repeated validation actually present

For a successful normal `checkpoint`/`settleCombat` with two valid stored slots:

1. Current input state: `reduceRuntime` → `validateState` (`state.js:131`).
2. Same current input state: `migrateState` → `validateState` (`state.js:143` → `:119`).
3. Produced state: `reduceRuntime` → `validateState` after campaign reduction (`state.js:160`).
4. Same produced state: controller `commit` → `validateState` (`controller.js:11`).
5. Same produced state: store `save` → `validateState` (`save.js:56`).
6. Previous primary slot: `save` → `load` → `decode` → `validateState` (`save.js:61,43,31`).
7. Previous alternate slot: the same unconditional decode path.

This is a static call-path count, not a sampled execution count or timing result. Fewer slots/earlier failure change the count; each validator also calls nested progression, equipment, map and derived-stat logic. The a17 scene memo caches apply only to certified immutable roots, while controller state/reducer output and freshly parsed save slots remain mutable/uncertified in this path. The current a17 freeze at main's successful state reception does not eliminate this save-chain work.

## 6. Narrow improvement candidates, in priority order

### A. Head-first lazy slot decoding: first candidate

Keep the same raw head and **both** slot reads first, in the exact existing order: `getItem(keys.head)`, `getItem(keys.slots[0])`, `getItem(keys.slots[1])` (`save.js:41–42`). Preserve the surrounding exception handling. Parse the head, decode its selected slot, and return if the existing receipt predicate matches. Only then decode the remaining slot and use the unchanged fallback algorithm when primary selection fails. Remember the already decoded primary even when invalid, so fallback does not decode it twice.

When the primary head is valid, the current code ignores the other decoded slot's result; avoiding that unused semantic validation can remove one full validation per happy load/save without persistent cache or alias concerns. Keep both raw reads to preserve existing storage-read failures and ordering. This has a smaller maximum benefit, but is the preferred first, independently testable option. Do not combine multiple optimizations before establishing each one's behavioral parity.

### B. Store-local exact-raw bounded decode cache, only after measurement

A possible additional experiment only after the smaller head-first change and baseline attribution justify it. Limit it to `createStore`'s private slot decode path. This optimizes the pure repeated result of decoding and validating identical stored bytes, rather than trusting arbitrary caller objects.

Required constraints:

- Key by the **entire exact raw string**, never by revision, slot number, state identity, length or FNV checksum alone. FNV is explicitly not tamper resistance and collisions cannot establish byte identity.
- Keep all actual head and both slot `getItem` calls, their order and exceptions. Recompute head selection and fallback receipt matching on every load. Never cache the result of `load` without reading current storage.
- Scope cache lifetime to one store/profile/namespace instance and keep a small explicit entry bound, ideally the two slot entries. An unbounded map accumulates up to multi-megabyte envelopes for every combat checkpoint.
- On every cache miss, perform the existing raw/payload byte limits, schema/revision checks, checksum verification, JSON parsing and full semantic validation. A newly changed slot with a valid checksum must still be semantically checked.
- Keep decoded objects private. Every external `load` return must detach **all mutable entry data**, including state and `previousCommit`/nested receipt data, not just its top-level wrapper. Otherwise a caller can poison the next cached load or recovery decisions.
- Do not seed a cache from a just-proposed or just-written state merely because another layer validated it. Use the existing full decoder once for those exact bytes. Never let staged/uncommitted data acquire committed status through a cache hit.
- Preserve CAS, Web Locks, both readbacks, prior-head comparison, backup creation, legacy fences and uncertain-commit classification byte-for-byte in behavior.
- Cache eviction affects only recomputation, never accepted data or recovery choice. Cached failures, if used, need an explicit miss/failure distinction and the same raw-byte key.

Safety comparison: this changes neither public mutable save inputs nor the controller's clone/API/adapter contract. In contrast, canonicalizing controller internals and memoizing `validateState` changes trust and ownership across reducer, migration, adapter, listener and snapshot boundaries. That larger option can be made safe, but requires substantially more proof and regression coverage.

Limits: every never-seen envelope remains a full decode/validation miss. Lock contention, newly produced-state validation and synchronous localStorage cost remain. A raw cache may reduce repeated old-slot work; it cannot be claimed to fix the observed 150 ms expiry until separately measured on the supported browser.

### C. Trusted canonical state-validation reuse, only as a later broader change

Potentially reduce duplicate input/migration and produced-state checks using a private, validated, detached canonical snapshot or an internal capability bound to that exact snapshot. Keep exported mutable `validateState`, `migrateState`, `reduceRuntime`, controller snapshots/capture and direct store calls semantically unchanged. First validation is still mandatory, including for malformed certified copies.

Do not simply remove the second migration validation because two calls appear adjacent: exported functions accept caller-owned values, and Proxy traps or other external aliases complicate assuming repeated mutable inputs remain identical. Do not use `Object.isFrozen`, a public `validated: true` option or a stale object-identity cache. a17's existing dynamic-Proxy regression demonstrates why provenance matters. Any private fast path must make its ownership and no-intervening-mutation proof explicit.

### D. Attribution before any latency claim

After the independent native play work finishes, a separate small diagnostic can distinguish queued controller time, reducer/validation, Web Lock wait, in-lock store work and post-save synchronization. Use separate monotonic elapsed brackets; avoid calling their sum CPU or storage-I/O time. Preserve the current observer-off semantics, 150 ms input contract and strict >500 ms frame-safety condition. No such diagnostic was added in this review.

## 7. Prohibited shortcuts

- Do not remove busy from frame/input gates, resolve busy before durable completion, drop awaits, or ignore save failures.
- Do not downgrade critical combat save errors, close the recovery gate through Escape, or allow retry until a successful load/death commit establishes the correct state.
- Do not globally increase the 150 ms expiry, re-time old inputs at save completion, keep an unbounded FIFO of old attacks, or turn a canceled key release into a later attack. These change intent semantics and hide the bottleneck.
- Do not debounce away action/payment/hurt/RNG/death checkpoints or batch them with unrelated later events without designing a new transaction protocol.
- Do not substitute controller revision for actual storage CAS, remove the Web Lock, trust only head/revision/checksum, skip checksum/semantic validation on changed raw bytes, or select the highest staged revision.
- Do not auto-retry an uncertain payment/settlement or re-stamp stale reports. Reload must determine whether the head commit already happened.
- Do not certify arbitrary frozen or Proxy objects, return cached mutable state by reference, or infer state validity from immutable-snapshot provenance alone.

## 8. Required regression gates for a narrow store optimization

### Cache/lazy-decoder-specific cases

The cache-specific checks below apply only if that later candidate is implemented. For head-first decoding alone, an unselected alternate slot may intentionally remain undecoded when the primary receipt is valid; its actual read and read exceptions must still occur, and overall load/recovery decisions must match baseline.

1. Exact repeated raw bytes can reuse decode, but returned states and nested receipt objects are separate and mutable as before. Mutating a first returned state/receipt must not affect the next load, another caller, upgrade backup or fallback selection.
2. Changed raw in **either** slot invalidates that entry: valid replacement, same revision but different payload, malformed JSON, wrong schema/revision, wrong checksum, semantic corruption with a recomputed valid checksum, oversized payload/raw and null/missing slot. Include a checksum-collision or deliberately equal-checksum mock key scenario to prove the cache is not checksum-keyed.
3. Head-only changes still reselect the correct existing slot. Corrupt/missing head, corrupt latest slot, previous receipt, both unusable slots and a first staged slot without any head retain exact recovery/failure decisions. Never recover uncommitted newest staging.
4. Every actual storage read still occurs on a cache hit. A `getItem` throw on the head or either slot remains `UNAVAILABLE`; a concurrent writer is still observed. Verify profile/namespace separation and cache eviction.
5. Direct public `store.save` calls with caller-mutated state always validate again; previously valid identity cannot hide later invalid gold, vitals, controls, recovery or progression. Both current and legacy semantic rejection behavior remain unchanged.
6. v1–v5 load/migration remains read-only. Upgrade backup failures, unsafe self-receipt fences, backup races, retained legacy bytes, v4/v5 recovery receipts and interrupted upgrades keep existing behavior. Cache must not retain or promote an incompatible old-reader interpretation.

### End-to-end persistence/input/death cases

7. Delayed save: 149/150 ms input delivered once; 151+ ms edge expires without cost or late offense. Cover dodgeSprint plus remapped v5 finite/channel/guard inputs, actual main handlers, latest-wins replacement and OS-repeat not extending the age.
8. Busy combat freezes elapsed simulation, vitals, RNG and paid channel pulses. After successful reconciliation, a held action resumes under the existing rules without new resource grants or duplicate cast/payment. Safety release during busy is persisted exactly once before future input.
9. Stage failure, stage readback mismatch, head-write failure, head-write-then-throw and head readback uncertainty preserve last committed controller state and exact gate behavior. Successful reload resolves what actually committed; no speculative retry/extra reward occurs.
10. Two real session controllers sharing storage conflict instead of overwriting. Old reports and queued identical epoch-bound commands cannot be restamped; snapshots/commands/listener results remain detached.
11. Same-frame kill/death settles one kill reward and one death charge. Failed/uncertain death cannot unlock retry. Dead reload is read-only and cannot emit another settlement; explicit retry increments life once, preserves designated cooldown/RNG/history and clears old input.
12. Travel, portal, control rebinding/slot changes, battle/controller replacement, menu, blur, visibility and >500 ms safety pauses invalidate old waiting input and preserve a16 death-overlay/background ownership. Ordinary checkpoint synchronization must not reset action timing/recovery; explicit rest still must.

Existing relevant test sources: `state-save.test.mjs`, `wilderness-controller-save.test.mjs`, `upgrade-backup.test.mjs`, `upgrade-backup-v5.test.mjs`, `expert-main-input.test.mjs`, `poe2-input-core.test.mjs`, `action-safety.test.mjs`, `runtime-gate.test.mjs`, `runtime-sync.test.mjs`, `charge-contact-save.test.mjs`, `dead-save-resume.test.mjs`, `immutable-snapshot.test.mjs`, and `wilderness-immutable-cache.test.mjs`.

These are proposed acceptance gates. No new test pass, speedup, native browser acceptance or completion of the publisher's live play is claimed here.

## Source fingerprint at review

SHA-256:

- main.js: `12220374b47047098a29e9e5ea4137028988923dc6440e7d9607af985e6f2c83`
- controller.js: `b212b995efb7aabe1112b88f690988d5a2d1d057a52e1153652e273f4e42200a`
- save.js: `bf5c4aa227d8da700164a0ae17f4dd26a19b9f0ce072297a405a30cc2723a7c4`
- state.js: `9468b04fc393f172af2243585889994cc64b138754e381ad5432cab06db67188`
- campaign.js: `aa4a4952809114deee274f679012827f5d485df84609826f7387c0b0108e17ce`
- combat-persistence.js: `1ebbd2387d97d9e595367c36717bf1947b00d28002c59526e4b2b95f9305ff6d`
- runtime-sync.js: `4c1a99cb45e443b0012501255c47f6400f4902fcc62340d7c9e3a5d3d34c8b72`
- immutable-snapshot.js: `3b788bd4a61d9c0be40aa88efc35d068e79f8c13f1a7f608bae9fa4136aa8b1c`
