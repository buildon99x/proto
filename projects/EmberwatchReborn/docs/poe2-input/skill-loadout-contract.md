# R14a2 explicit full Warrior skill loadout

Scope: input/data/transaction adapter only. Read the full 185-line user-combat-controls.md and the local canonical requirements/source-status trace. The canonical v1.1 / Library v2 original is still locally unavailable as recorded in the existing source-status file; this change does not claim a fresh source recovery. All interaction policy here is authored Emberwatch behavior. No POE2 frame measurements, new skills, costs, cooldowns, damage, movement tuning or balance changes are introduced by these modules.

## Compatibility and opt-in

- Default controls remain version 3. Explicit existing POE presets remain version 4. Reading/migrating versions 1–4 never opts into full loadout, fills new skill slots, or writes to a save.
- Existing historical migration behavior still applies: in-memory v1/v2 become v3 with previously missing actions unbound. Original objects/bytes and old key ownership remain unchanged.
- `enableSkillLoadout(previous, {skills, actionSlots})` is the explicit v5 entry point. It copies physical bindings, block and charge settings, and v4 POE options. Legacy inputs gain only empty mobility rows and the documented WASD/cursor POE option defaults; no mobility key is assigned implicitly.
- The new `priorControls` is the exact complete v1–v4 predecessor before migration. A v4 predecessor retains its own original v1–v3 history. `restorePriorControls(v5)` returns a deep copy of that complete predecessor. Normal historical load/setControls migration remains as before.
- Existing learned actions are seeded once into their historical semantic rows at opt-in. Unlearned actions are null. Existing learned expert actionSlots are copied only into corresponding loadout rows. `state.actionSlots` itself is never edited.
- Later purchases do not fill empty slots. `poeControlPreset(v5, mode, runMode)`, rebinding, and `controlPreset(name, v5)` preserve the full loadout and the original predecessor. Explicit historical-key presets with a v5 predecessor set movementMode to WASD because their old Mouse0 attack mapping has no click-move key; other POE options remain unchanged. Calling historical preset functions without a v5 predecessor keeps their old defaults.
- Use shared `isPoeControls(c)` rather than a version-4-only check wherever v5 must inherit the POE runtime.

## Strict saved schema and transaction

`controls.skillSlots` has exactly version 1 plus attack, hammer, block, charge, judgement, heal, expert1, expert2. Every value is null or one of the eight existing ACTION_SKILL_IDS. Unknown IDs, passive/augment IDs, duplicate actions and unlearned skills are refused. Structural controls validation is separate from character-aware saved-state validation, and setControls cannot bypass the latter.

`assignSkillSlot` is the command name. Its exact fields are type, slot, skillId, expectedSkillId, expectedRevision, life. Revision comes from the controller's displayed store revision and is compared to trusted dequeue context; life and old slot contents are also compared. It requires a living, starter-trained warrior and controls v5, without an Expert tier gate. Clearing uses skillId null. Moving an action requires clearing its prior row before assignment, since duplicate placement is refused.

No optimistic mutation occurs. The existing controller commits the cloned state only after durable save success. Failed or stale assignments preserve economy, character, vitals, recovery, old expert slots and durable bytes. No purchase or resource payment is part of assignment.

## Physical capture

`createSkillLoadoutInput({now})` exposes:

- `press(token, slot, controls, {canUse, repeat, editable, modified, paused, time, sequence})`: feed only a press accepted by the base physical router, or an explicitly accepted touch slot. Returns an immutable-identity copy {token, slot, id, skillId, sequence, time}, or null. canUse defaults to false; use learned/runtime availability rather than inventing skills. A refused unlearned down is retained as an inactive physical key so learning while held cannot create a fresh action. A fresh empty or refused skill slot clears an older pending edge, without retargeting it. The attached deferred queue shares the live capture sequence; replay preserves the original press sequence and time.
- `peekToken(token)` reads a captured identity copy without consuming an edge. `up(token, {cancelReason})` returns the same captured identity copy (or null); normal physical release differs from cancellation. Mouse0–4, supported keyboard tokens, and Touch:<any-slot>[:pointer-id] are supported.
- `snapshot(controls)`: consumes one newest pressedSkillId/pressedSkill. It also returns heldSkills and releasedSkills boolean objects keyed by existing skill ID, heldIntents/releasedIntents identity copies, block, guardPressed, and channel.
- `clear(reason)`, `reset({preserveDeferred})`, `releaseMouse(reason)`, `owns(token)`, `isHeld(id)`, `hasPendingCombat()`, `expirePending(now, maxAge=150)`, and `breakGuard()` support runtime safety and mobility integration. Call breakGuard for accepted mobility/stop actions that should break toggle guard.

The selected skill determines behavior, never a row's historic name. Shield on attack/expert1 follows guard hold/toggle; Hammer on block never starts shield. Finite subframe taps survive once. OS repeat creates no new edges. Simultaneous physical aliases for the same skill do not duplicate starts. A press captures identity before remap; live assignment/remap must still clear old input at the parent transaction boundary.

Onslaught has one stable channel owner token. Aliases accepted before its first delivered snapshot share ownership; every owned alias must release. Late aliases cannot take ownership or restart after release. A normal release before first delivery cancels the pending channel. Delivered normal release occurs once; menu, blur, hidden, death, remap, assignment, save failure and pointer cancellation use non-release safety reasons and must never create a Lance release. Every physical row, including touch, has the same policy.

## Canonical combat conversion and integration

`canonicalSkillInput(snapshot)` remaps selected skill identity into existing combat fields independently of physical slots. It supplies attack/attackHeld/attackPressed, hammer/hammerPressed, charge, heal, judgement, block/guardPressed, expert1/expert2, canonical heldActions and the unchanged channel ownership shape, plus generic pressedSkillId/pressedSkill/heldSkills/releasedSkills.

For v5 only, merge conversion after the base-router snapshot so raw semantic-slot pulses never also reach combat. Merge canonical heldActions into the base heldActions object to preserve mobility holds. Keep base movement, dodge, sprint, potion, interact and other non-skill fields. For v1–v4 use the unchanged existing adapters.

The combat integration must treat a fresh explicit mace_swing like other fresh skills so it preempts a held Hammer repeat. Prefer generic pressedSkillId over legacy slot priority, and clear generic pressedSkillId/pressedSkill on simulation continuation segments. Keep action eligibility, startAction, payment, contact, active and recovery handling as the existing single authority. This adapter neither starts an action nor pays resources. The parent owns main/combat/runtime-sync integration and ordinary-input browser verification.

## Durable-save input tolerance

The `.deferred` queue and exported `createSkillLoadoutSaveInput()` have the existing expert queue shape: offer(token, slot, id, {now, battle, owner, slots: controls.skillSlots, controls, sequence}), release(token, options), releasePointer(), clear(), and flush(context, execute).

It saves only the newest intent during persistence, with captured identity, press time, battle/controller identity, life, region, complete loadout and controls bytes. It waits while busy only through 150 ms inclusive; invalid/backward time or age greater than 150 ms expires it. A replaced battle/controller, changed controls/loadout/life/region, pause, blocked save, death, lost focus or hidden document cancels it. Flush clears before executing, so it dispatches at most once even if execute throws.

A finite release survives as one released pulse. Onslaught or hold-mode shield released before delivery is discarded. Toggle-mode shield release retains its finite toggle press. Ordinary pointer release followed by lost capture preserves finite intent, but pointer cancellation clears it. Replay uses captured time/sequence and then calls up for a released finite pulse; it must not recapture a different current skill. The queue is a save tolerance, never an animation/resource/cooldown queue. Aliases in this queue follow the historical newest-intent behavior; live channel alias ownership begins only when capture is accepted after save.

## Verification boundary

New tests execute strict schema/real assignment reducers and durable controller/store failure paths; 8 actions × 8 physical rows in both reducer and router capture; historical versions 1–4; guard semantics; aliases; channel ownership; touch/mouse/short taps; input safety; saved-wait identity/expiry; and canonical mapped Hammer production starts without duplicate resource payment. Production-handler fixtures are scripted earned progression, not ordinary browser gameplay. Focused results are reported separately from the parent's later full suite and published/browser validation. No full suite, browser, Git push, Site, or Library operations are performed by this bounded module task.
