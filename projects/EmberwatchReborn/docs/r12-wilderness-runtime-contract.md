# W wilderness runtime slice (authored, not yet integrated)

## Scoped brief

Implement the first post-B wilderness/signal loop under the combat-weighted
proposal. This is newly authored Emberwatch content, not recovered source.
Use five meaningful required groups (3/4/5/4/4), one boss, 800 distributed
objective XP, and the existing Expert kill-XP scaling. Preserve the prior
campaign, resources, skill purchases, equipment and receipts. Parent owns
shared registration, save versioning, controller/UI, build and native acceptance.
No public root or `/qa-r11/` changes belong to this slice.

## Scoped specification

B must be genuinely reported after real Expert training. Eda accepts and reports
W. Survey clue persists; a free reusable hook is picked up separately from its
explicit anchor operation. The anchor immediately opens a safe return. A visible
ordered receiver puzzle retains its partial prefix and explains wrong-order
reset. Cover/channel is committed before the affected encounter, changes real
floor/LOS and costs nothing. Relic pickup is separate from defeating the boss;
the boss return is immediately available. Optional scout rescue never gates the
main report and remains available afterward. Eda identifies Orin's future repair
handoff without pretending the next region or recipes are implemented.

New foe names, map, timing, HP, rewards and puzzle are authored candidates.
Cached/source-confirmed XP scaling is reused unchanged; lost map/layout/timing
values remain unknown. No invisible timers, required skill purchase, automatic
healing from objectives/travel, duplicate rewards or UI-only success.

## Scoped evaluation plan

Run only new small serial Node handler tests: earned B prerequisites, both modes,
all difficulties, exact budgets, retained clue/prefix, optional skip/post-report,
wrong NPC/LOS, invalid commands, death/life/revision/repeat/corrupt histories,
resource preservation, geometry and bounded overflow. Scripted reports do not
prove AI victories, ordinary-input balance, duration, visuals or save-controller
atomicity. Preserve all prior test files/counts and failures. Parent runs registry,
full checks, build, native comparisons, save faults, archive and release gates.

## Implemented authored content and ledger

- `wilderness-content.js`: region `signal_wilderness`, five groups named
  survey/anchor/receiver/relay/approach = 3/4/5/4/4, keeper = 1, optional scouts = 4.
  This is the combat-weighted alternative, **not** the minimum-envelope schedule.
- Ordinary Expert foes pay 110 base XP / 6G; keeper pays 280 / 40G.
  Every kill reevaluates the existing `experienceMultiplier` at current level.
  At the current earned entry range, mandatory W is 3,280 XP Easy/Normal or
  2,660 XP Hard/Serious, 360G, materials 6 iron / 4 wood / 4 thread /
  2 ember shards, and two potions. Later L30 kills correctly halve again.
- O1–O6 are survey100, anchor150, calibrated puzzle150, relay150, explicit
  evidence100, Eda report150 XP. Their gold is 30/20/35/35/20/60.
  Acceptance, free hook pickup, pre-encounter choice, clue reread and travel
  grant no XP/gold. Hook pickup and anchor operation have distinct receipts.
- Optional scout rescue pays four ordinary kills plus 200 XP/60G, 2 wood /
  2 thread / 1 potion. Total optional is 640 base XP / 84G before scaling;
  before/after the main report are both supported. It never gates the main route.
- Survey clue is retained by `wilderness_survey`; `wildernessClue` returns
  its readable prose/order and saved prefix. Sequence is explicitly authored
  바람깃 → 돌무덤 → 잿불. A wrong input resets only the uncompleted prefix,
  emits explanatory copy and advances the objective revision.
- `wilderness_hook` is free, retained and never consumed. O2 is its explicit
  anchor operation, which immediately opens both town return and re-entry.
  The hook, anchor and return endpoint are outside each other's 76-unit
  interaction circles where needed, avoiding the prior locked-portal/F trap.
- Cover mode leaves six solid center tiles; channel mode opens exactly those
  tiles. Both side paths remain open. Mode is chosen once for zero reward
  before group D activates. The presentation explains that it is irreversible.
- A small southern entry foyer breaks every initial enemy sightline and offers
  immediate return. This is safety geometry, not extra encounter/farming distance.
  All route gates have real tile collision; safe retreat remains reachable.
- After group E's permanent clear, `wilderness_keeper_open` becomes true.
  The keeper has reused B line/sweep patterns and unchanged HP. The keeper's
  defeat opens direct return but never auto-loots `wilderness_evidence`.
- Existing B foe HP/status/pattern contracts are reused with authored W identities
  and tactical spacing. B-only lateral movement metadata is deliberately removed:
  the B policy is region-gated and is **not** claimed to run in W. Existing generic
  fire-exposure response remains specified, pending actual W combat registration.
  No new art/audio or asset provenance is invented.

## Actual exported handlers and parent integration contract

1. Merge only these new files. Do not overwrite the parent's live R11b2 edits,
   root R7a4 or `/qa-r11/`. This slice has no app/project release-label change.
2. Register `WILDERNESS_REGIONS`, `WILDERNESS_FOES` and `WILDERNESS_LINKS` in
   shared world resolution. Validate town placement alongside all existing
   portals. `createBattle` currently **cannot construct W**, deliberately.
3. Register `WILDERNESS_COMMANDS`/`reduceWilderness` and
   `validateWildernessProgress` before advertising W commands. The three object/
   quest commands require exact live position/life/vitals/recovery and captured
   `expectedRevision`; glyphs additionally capture `expectedStep`, and choice
   captures only `cover`/`channel`. `wildernessCommandFields` strips view data.
4. `reduceWildernessRuntime` is a real pure detached dispatcher for the three
   commands plus scoped generic `travel`, `settleCombat`, `checkpoint`, `retry`.
   Parent may route W-owned commands here, or integrate the same helpers into
   the existing campaign handler. **Never run both settlements.** All handlers
   validate first, clone and return one candidate state/events; failure does not
   mutate the caller or expose partial rewards.
5. If keeping generic campaign settlement, register the new foes/gates and call
   `synchronizeWildernessCombatProgress(candidate)` after permanent defeats and
   before post-state validation. It opens the keeper path only when all four
   approach foes are actually recorded; it grants no reward. Emit its `mapChanged`
   result and retain living actors/resources/projectiles as the existing B map-only
   reconciliation does. Do not recreate the whole encounter on each glyph/choice.
6. Every actual travel while W is active must call `invalidateWildernessInput`
   on the isolated candidate, alongside existing B/T invalidation. W portal guards
   use `wildernessPortalAllowed`. The detached travel handler already does this.
   Keep command revision separate from storage revision and capture modal epochs.
7. `validateWildernessAncestry` first checks the **real** W map/position,
   life/pools/recovery, visited current region/town, complete permanent defeat IDs,
   wallet/equipment/growth/promotion/slots, actual B report/tool/receipt and Expert
   history. Only for a current W location does it pass unchanged history to B's
   ancestry validator using `{region:'ash_hamlet', position:town.spawn}` because
   older validators cannot resolve unregistered W. It does not insert a visit,
   receipt, kill, tool or resource, and no projected state escapes. Tests corrupt
   both projected fields and their dependencies. Once W is registered, remove
   this two-field projection and validate the real state directly. Do not use it
   as a save/migration bypass.
8. **No W save compatibility is claimed.** Decide and implement an explicit
   shared state-version/migration boundary, reject W fields in unsupported old
   versions before migration, and preserve old raw slots/QA profile bytes.
   Detached source accepts v4 as its current prerequisite model; update that
   guard only with the actual supported version. Existing validators can be
   permissive about unrecognized town objective fields; this is not an accepted
   future-save route. W region/defeat records are not accepted by current saves.
9. `wilderness-presentation.js` supplies real object actions, persistent journal
   clue, choice explanation, Eda report/continuation, missing-relic return warning,
   and role labels. Wire these to actual controller commits and normal input;
   no speculative XP, healing or UI-only success. Cache validated views per
   committed snapshot rather than rerunning full ancestry checks every paint.
10. Add W role glyphs/undead labels/cover cutaway/open-floor presentation using
    the existing owned visuals and shape vocabulary. Reuse actual collision tiles;
    do not fake open paths. Verify flash0, threat layering, labels, action focus,
    modal cancellation, save-input safety and pointer/keyboard/touch.
11. Preserve established combat settlement behavior: same-frame kills precede
    one `floor(spendableGold*.05)` death charge; a combat level-up retains the
    existing 25%-of-max pool recovery, and explicit death retry retains established
    refill/cooldown/RNG rules. W objectives, clue reading, choice, relic, report
    and travel never create healing. This slice does not silently rebalance the
    shared combat level-up/retry rules.
12. Eda reports W. The returned `wildernessReported` event names
    `nextNpcId:'blacksmith', nextRegionImplemented:false`. Orin's existing shop
    remains unchanged. Future R acceptance must require this genuine report and
    retained hook/evidence/history. No recipe, R quest, Master training or ending
    is implemented or represented as already available here.

## Verification and remaining gates

Focused tests directly execute these exported runtime handlers and the existing
production helpers. Their earlier route earns training/promotion/B through the
registered handlers; W positions and defeat reports are explicit scripted inputs.
JSON serialization tests check detached state preservation only, **not** production
save compatibility, disk atomicity, controller races or actual reload gameplay.
The exact original plan file remains unavailable as recorded by the existing
source-status trace; this change adds no source-confirmed original map/numbers.

Two initial new-test failures were retained: a geometry fixture had no real
wall within the original relay's interaction circle (new relay layout corrected),
and retry's out-of-scope check hid the established `NOT_DOWN` reason for a second
retry after returning to town (validation order corrected without mutation).
No old test was modified or removed. Initial and final focused logs live beside
this contract under `verification-r12-wilderness-module/`.

Parent gates still open: registered world/state/controller/save migration and
fault/race tests; actual W createBattle/stepBattle behavior and live geometry
reconciliation; full existing regression/registry/build; ordinary-input complete
Normal/Hard loops for invested rank4 Hammer and lower-investment legal builds;
optional skip/after-report, both modes, death/retry, stale inputs, dead load,
correct NPC, depleted-resource save/title/re-entry; actual tactical usefulness,
visual/flash0/audio/mobile QA; source/test/provenance Library archive and release.
No full campaign, duration, quality, Master, all-Expert-node, repeat expedition,
new recipe, archive upload, Git push or deployment claim follows from this slice.

Final focused result: **34/34 new checks pass**, 0 fail/skip/cancel/TODO,
12.697 seconds serial. Source/new-test syntax and staged diff whitespace pass.
No existing test count is inherited. Intermediate failure log blank-line trailing
spaces were normalized; test names, results and failure details were retained.

## Corrective API boundary (supersedes the initial report-trust contract)

The initial 34-check result did not catch an omitted Dungeon ancestor validator
or same-life stale snapshot overwrites. See
[r12-wilderness-state-correction.md](r12-wilderness-state-correction.md) for
reproductions, repairs and the required `checkpointPanel` ordering.
All W commands now require `expectedStoreRevision` and a separate trusted
`{revision}` dispatcher context. Objective rewards additionally require exact
committed vitals/recovery. Captured reports and revisions must never be re-stamped
around old pools, position, cooldowns or RNG. Views require that captured epoch
before exposing actions. The choice is now on the receiver side, and physical
relay access opens only after its mode is committed. These changes remain
unexposed and do not modify any shared runtime or save schema.
