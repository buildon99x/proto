# R10 Signal Tomb content/reducer integration contract

2026-10-10 UTC. Scope: new T content, pure authoritative reducer/validator and new production-handler tests. **This checkpoint is not yet registered in world/state/UI and is not a playable T release.** No browser play, boss-phase runtime execution, build, publication, external backup or Git remote write is claimed here. The integration owner retains those gates.

## Evidence and authored values

The task read the repository instructions, `brief.md`, `spec.md`, `eval.md`, the R10 handoff plan and local canonical requirements trace. Canonical v1.1/Library version2 remains recorded as previously read with byte materialization blocked by HTTP403; this task did not retry it. Existing cached reference tier/XP facts were not re-verified live. Reference files are unchanged.

Every new region coordinate, role, shape, timing, puzzle, ward rule, reward and training reservation is an authored Emberwatch value from `r10-tomb-expert-handoff-plan.md`. T has 18 ordinary Adept foes plus one Adept boss, 960 base kill XP/144G, and four objectives totaling480XP/160G. All19 permanent IDs and gates are defined in `app/src/tomb-content.js`. The final total is304G; the report's120G funds its reservation and is not an additional wallet or grant.

The four chambers are projection → inscription → two-pocket ward relay → oath arena. Geometry includes physical, opening-only overlays and solid cover. The retained `signal_cipher` and `furnace_lens` are never consumed. Projection exposes and re-exposes crescent / split beam / ember, with Korean names and order metadata. Glyphs are three actual objects. Wrong fresh inputs reset only the prefix and pay nothing. Carrying the ward has no HP, timer, movement, resource or damage penalty; its visual is non-colliding and derived from taken&&!sealed. Boss defeat never picks up the separate `tomb_oath`. Reporting belongs to Eda, not Orin or Bran, with no L15 or preexisting120G requirement.

## Required runtime registration

1. `world.js`: merge `TOMB_REGIONS`, `TOMB_FOES` and `TOMB_LINKS.ash_hamlet`, retaining original references. `tombMap` uses the production `mapFromRegion`, not a preview or test map.
2. `state.js`: call `validateTombProgress` during full validation; route `TOMB_COMMANDS` to `reduceTomb` and revalidate the complete result. The complete save, predecessor and equipment validators remain in force. No loader/test transformation may substitute for this registration.
3. `campaign.js`: gate T portals using `tombPortalAllowed`. On successful travel, after input/gate checks but before commit, call `invalidateTombInput(next)` on the already-cloned candidate and fail unchanged if it returns failure. This work is coordinated with the training-economy owner. Permanent foe settlement uses existing `gate` metadata and per-kill production XP calculation, including sequential kills within one frame.
4. `save.js`/schema boundary: untouched older saves have no T defaults. T acceptance creates every default plus `reservedTrainingGold:{expert:0}` atomically. Reject partial T flags, unknown T IDs, future-stage defeats, missing receipt/tool/reservation, and report/commission mismatch. Do not fabricate a missing reservation or funds. Loading remains read-only under the established version policy.
5. `main.js`/views: all T actions are issued through the real controller/session path. Use `tombChanged.mapChanged` to rebuild collision/path caches without recreating battle, healing, resetting live foes/telegraphs or dropping paid recovery. Preserve menu generation ownership, reduced flashes, remapped controls and original reach/LOS. Completed cards remove action buttons. A dead hero cannot interact/report. Do not label Expert skills functional from the commission or level alone.

## Input protocol and transient boundaries

Every T command has exactly `type`, `position:{x,y}`, `life`, `vitals:{hp,mana,stamina}`, `recovery`, and `expectedRevision`. Interaction adds `objectId`. Only a recognized glyph plate also requires `glyph` and `expectedStep`; the glyph must equal that object's immutable glyph. Any other authority-bearing field is rejected.

`expectedRevision = tombInputRevision(state)` is a T-specific durable input token, **not the controller's store revision**. Before acceptance it is0; accepted state starts at1. Every successful T interaction, including clue reread and a valid wrong glyph, advances the token; failed/stale commands leave everything unchanged. `expectedStep` checks the current prefix separately. Successful travel increments this token to prevent an old plate click from becoming valid after a same-life round trip. Death/explicit retry additionally invalidate via dead state/life. Load/menu/new-panel callback ownership still belongs to the UI's existing generation mechanism; loading must not mutate the save merely to change this token.

Exports:

- `TOMB_COMMANDS`, `reduceTomb`, `validateTombProgress`
- `tombPortalAllowed`, `tombMap`, `tombTierAllowed`
- `tombWardCarried`, `tombInputRevision`
- `invalidateTombInput(next)` mutates only an already-cloned candidate's token and returns `{ok:true}` or `REVISION_LIMIT`.

Objects: `tomb-projection`; `tomb-glyph-crescent`, `tomb-glyph-split-beam`, `tomb-glyph-ember`; `tomb-shortcut`; `tomb-ward-origin`, `tomb-ward-midpoint`, `tomb-ward-final`; `tomb-oath`.

Portals: `town-tomb-entry`, `town-tomb-shortcut`, `tomb-town-return`, `tomb-town-shortcut`, `tomb-boss-return`. T gates are `tomb_entry`, `tomb_shortcut`, `tomb_boss_return`; the boss return requires defeat but deliberately does not require oath pickup. The optional stair is independent after decode. Selector precedence may be adjusted only for its explicit console/portal pair, within76-unit reach and LOS.

## Atomic report and economy ownership

T report does one candidate transition: `r10:t:report`, `tomb_reported=1`, `expert_commission=1`,140XP,120G income, and `reservedTrainingGold.expert=120`. It grants no tier, bonus SP or heal. Minimum Hard/Serious can report at L14 and the140XP may cross L15.

The T validator owns the exact semantic relation: after T acceptance reserve field is mandatory; before report it equals0; reported Adept equals120; genuinely promoted Expert equals0 with `r10:promote:expert`. The reserve must be within total gold. Expert history support here does not unlock that tier; complete character/promotion/predecessor validators must support genuine Expert functionality before it can exist.

The separate economy owner provides general structure checks, spendable-gold previews/handlers and post-kill death loss. T report must not ship as softlock-protected until every spend/death/save path is integrated. Promotion remains a distinct trainer transaction that charges120, clears reserve, retains Adept history and grants no XP/SP/heal. No Expert promotion or skill behavior is implemented by these T files.

## Boss phase data is a contract, not an implemented selector

The210HP/armor8/speed44 boss defines three immutable attacks and `patternPhases`:

- whole: HP ratio up to1, needle → pulse
- cracked: HP ratio at or below.5, needle → broken oath → pulse, `cue:'cracked-ring'`

The runtime must latch a threshold observation and switch only after the committed windup/recovery ends, never replacing/retargeting a drawn tell. It should initialize consistently on re-entry with reconstructed HP and avoid rewinding to the whole cycle after a latched transition. The plan's fixed physical damage, speeds, windups/recoveries and reduced-flash footprint remain authoritative. Stun/slow, threshold during tell/recovery, simultaneous hit/death and ordinary player observation need separate runtime tests. Strong builds may kill before all patterns; do not add invulnerability/HP/timers to force observation.

## Checks at this core checkpoint

Passed on the actual source:

- `node --check` for both new source modules and the new test/support modules.
- `node --test --test-name-pattern='authored content|untouched old|core acceptance' tests/tomb-core.test.mjs`:3/3. These run current production predecessor handlers, direct authoritative T acceptance and read-only validation; no T world registration is faked.
- `node --test tests/tomb-geometry-core.test.mjs`:7/7. Six opening stages test radius11 reachable anchors, continuous swept radius11/radius4 segments, and LOS from reachable center±4 sub-tile offsets against every future foe. Object/arrival positions and cover are checked. This is more than center-point BFS, but is still a sampled geometry fixture, not complete continuous collision proof, live projectile/AI integration or screen evidence.

The additional tests in `tomb-core.test.mjs` intentionally require production world/state registration; they are not replaced with preview imports, source transforms or skips. They cover all4 difficulties × minimum/full × both F choices × skipped/open T stair; every real kill/objective delta; L15 crossings; clue/prefix/carry/death/travel; explicit oath; wrong NPC; unknown/forged state; overflow; two-tab stale input; and slot/pre-head/post-head report atomicity. These integrated tests and the full existing suite are **not yet run for this checkpoint** because the owner is first completing a separate R9a2 correction. They must run after actual registration, followed by the full suite in a sequential low-memory process.

Reusable `tests/support/earned-furnace-route.mjs` and `earned-tomb-route.mjs` execute production predecessor/quest/travel/settlement handlers. Their positions and kill reports are scripted. They do not inject XP/levels/items/flags, but they are **not ordinary-input earned gameplay** and do not demonstrate resource survival, boss observation, tactical depth or campaign duration. `earnedTombRoute(difficulty,{full,mode,shortcut,reportQuest:false})` returns the genuine handler-produced town state before reporting for economy/report checks.

The handoff plan's earlier synthetic XP arithmetic remains separate from these fixtures. Expected route totals are test assertions awaiting production integration, not gameplay claims. Integration/release ownership still includes brief/spec/eval, registry/build/original167-file checks, externally verified source+tests+provenance preservation and ordinary-input candidate/public QA.
