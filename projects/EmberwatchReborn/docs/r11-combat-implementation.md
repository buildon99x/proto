# R11 combat implementation checkpoints

This records runtime checkpoints, not an earned profile, browser observation,
public release, or source-confirmed original-game measurement. Reference catalogs
remain unchanged. Exact intended rules: r11-expert-runtime-contract.md.
The final section supersedes the earlier integration limits for source/save work;
input/render/ordinary-play acceptance still belongs to the integration checkpoint.

## Foundation

- Monotonic accepted cast IDs and per-target/leg/tick contexts; deeply frozen paid
  action specs, structured actual damage results, one combined packet resolution.
- Combat RNG is independent of cosmetic death particles; every combat draw emits
  a checkpoint event. Recovery records uint32 state and bounded draw count.
- Strict recovery v2 (for state v4), explicit legacy v1 migration, bounded negative
  status rule registry, Inner Flame/proc CD fields, and retry/rest helper seams.
- Passive shield block is physical-only. Direct spells now use one spell-critical
  draw per hit. Earlier spell damage may therefore crit; no original-fidelity claim.
- No Expert node is enabled at this checkpoint. Status producers remain absent in
  pre-Expert content; registry alone does not claim an existing status encounter.

Focused checks: 34/34 (foundation, existing Adept combat and wall handler tests).
A broader 67-test probe found four expected old-report integration failures in
combat-intent settlement/checkpoint fixtures; state v4 and legacy report handling
are owned by the promotion integration. Those are not reported as passes.
Parent owns brief/spec/eval, final registry/build, original-file integrity, external
preservation and normal-input QA. No browser, build or publication performed here.

## Expert handler checkpoint

All fifteen nodes now have real purchase/preview mappings and handler paths.
New actor-bound fields are a dedicated transient `banner`, accepted Onslaught
`p.action` and returned shot leg; persisted positive/negative effects and proc
CDs are in recovery v2. Source catalogs and their nulls are unchanged. The
Expert balance module separately records all authored geometry, channel cadence,
zero MP policy, split damage, durations and compatibility rationale.

Focused gate: 180 tests across Expert foundation, 14 calculation checks,
all-rank purchases and effects, 64 channel cases, retained Adept combat and walls.
Synthetic XP/tier, target positions and deterministic RNG are explicitly marked.
This is not complete ordinary-play or v4 save integration acceptance.

The new splitter resolves contact/expiry/payment deadlines inside a frame.
Two retained Adept buff/area assertions now measure the exact residual after
contact rather than assuming no time passes in the remainder of that frame.
No old assertion was removed. Existing source cooldowns are not speed-scaled.

### UI input and render integration

- Existing six inputs remain unchanged. `expert1` / `expert2` are one-shot pulses
  containing the already-resolved `battle_banner` or `zealous_onslaught` skill ID.
- Onslaught also supplies `channel:{ownerToken,held,released,cancelReason}`. The
  token is the input router's stable accepted capture identity. Reference-count
  accepted keyboard/mouse/touch owners there; never replace its identity on a
  held slot remap. `guardPressed` and `interact` consume/cancel an active channel.
- `cancelBattleAction(battle,reason)` clears intent and idempotently stops channels,
  returning critical events. Call before modal/blur/hidden/capture loss/slot edit;
  checkpoint those events before resuming. A normal release uses `channel`, not
  this safety entry point. `finishOnslaught` is the shared internal/test stop path.
- `quoteAction(battle,id)` is the same immutable temporary-modifier resolver used
  to charge; it exposes current actual mana/startup and accepted offensive values.
- `bannerAt(battle,position)` returns the current same-region/LOS-covered banner
  or null. Render `b.banner` as a quiet radius128 friendly field independently of
  `b.areas`; use its position/radius/remaining, not generic damaging-area loops.
- For channel presentation read action.id, angle, elapsed, spec.duration (startup),
  paidSeconds, pulses and spec.channelDuration. Cooldowns remain keyed by skill ID.
- Flames and Lance use exact center radii90/180; legacy mace/Judgement keep their
  existing center tolerance. Renderer must match those different boundaries.
- Lawbringer exposes enemy `disarm`/`silence` remaining timers; hero afflictions are
  `p.negativeStatuses`. Content must opt into real tags/attackFamily/statusRuleIds;
  no existing tomb enemy was silently relabelled undead or a spell caster.

Still outside this checkpoint: DOM/router control-v3 slots and capture semantics,
new authored battlefield status/undead/spell producers, rendering and normal-input
play on earned profiles. Parent owns those integrations and final release gates.

## Combined state-v4/recovery-v2 checkpoint, 2026-10-10 UTC

Promotion source `35cc4d2` was cherry-picked as `4244027`, retaining this branch's
40 supported nodes and all 98 promotion tests. State migration now invokes
`migrateRecovery(next.recovery,{legacy:state.version<3,character:next.character})`
after validating the original envelope. Historical recovery versions are decoded
explicitly; current commands remain strict. Repeated migration validates/clones
already-current records without reseeding RNG or modifying saved bytes.

### Final persisted recovery contract

`emptyRecovery({combatRng})` constructs the current shape. `battleReport(battle)`
is the production report producer; do not hand-build partial current records.

```js
{
  version: 2, cooldowns: {}, lock: 0, manaDelay: 0, staminaDelay: 0,
  invuln: 0, potionCooldown: 0, regenBuff: null, innerFlame: null,
  procCooldowns: {}, procCooldownRanks: {}, negativeStatuses: {},
  combatRng: {state: 1369781, draws: 0}
}
```

Proc cooldowns pair each `flaming_wrath`/`guilt_by_association` duration with its
accepted source rank in `procCooldownRanks`. Rank must be earned, and the duration
must fit that source rank. This preserves an accepted rank-1 Guilt cooldown after
paused purchases reach rank 3: the paid 1.5 seconds must not become a forged
record merely because the new rank's future cooldown is 0.5 seconds. Current
records missing either paired map, RNG, or another required field are rejected.

`recoveryFrom(command,previous)` clones authoritative previous recovery only when
the optional report is absent. Explicit null/malformed reports fail validation.
The campaign settlement, checkpoint, travel, chest and potion seams now pass that
previous record. Omitted potion recovery also checks the existing potion cooldown;
it cannot bypass the payment. Other ancestor optional-report handlers already
preserved prior recovery, while T and promotion retain required full reports.

Death clears regeneration/Inner Flame/negative effects. Explicit retry clears
life recovery and restores pools but keeps paid action/proc cooldowns, source ranks
and RNG through `retryRecovery`. Deliberate healer rest retains its refill/reset
service and resets cooldowns while preserving RNG. Loading or arrival waiting
neither advances these timers nor resumes discarded offensive objects. This
deliberately replaces the pre-R11 retry cooldown reset; the current public R10
checkpoint is outside this branch.

### Final event/input/render details

- Hostile accepted attacks share the monotonic battle cast identity sequence;
  fired projectiles retain attacker, attack identity and declared attack family.
  Incoming damage reports effective HP loss. Terminal secondary contexts cannot
  trigger Lawbringer or Thorns recursively; retained simultaneous fatal-block
  Thorns still settles its kill before the single death boundary.
- `cancelBattleAction` is always a safety stop, even if a caller accidentally
  supplies `release`, `complete`, `stamina` or `wall` as its reason. Normal release
  must use the held-channel input path. Save-busy UI should queue the scoped
  cancellation, drain after committed sync, then checkpoint before simulation.
- Real Flames/Lance slash FX include `expertFootprint:{skillId,range,arcRadians}`
  copied from their accepted action spec. Values are 90/180 range respectively;
  this metadata changes no combat geometry.

### Regression evidence and remaining scope

The exact final source/test tree passed **1,524/1,524** serial Node tests, with
zero failures, cancellations, skips or todos, in 171.8 seconds. Syntax and
`git diff --check` passed. Logs and a full source/test SHA-256 manifest are under
`docs/verification-r11-combat/`. The five new Expert test files execute 180 checks:
5 foundation, 14 pure calculation, 69 effect, 65 channel and 27 combined recovery
checks. The retained 98 promotion checks are included in the full run.

The 27 persistence cases use real reducers/controller/store and cover paid
acceptance/checkpoint/reload; omission/null/malformed reports; same-life travel
and arrival freeze; stale-life rejection; death/retry/rest; pre-head/uncertain
save failures; persisted cleanse/status timing; and accepted-rank cooldowns.
The earned-route helper scripts positions and defeat reports. It is not earned
combat or ordinary-input evidence.

Retained fixtures now produce complete current reports or genuine historical
records instead of putting schema-v2 data into a relabelled old envelope. Growth
expectations distinguish 40 supported nodes from 25 Adept nodes and continue
checking the old 211-point Adept maximum. No old gameplay assertion was removed.
Furnace/Tomb helpers observe exact contact/release boundaries because the new
splitter advances the legitimate remainder of a caller frame. This exposed and
fixed an actual tiny-substep escape bug: a completed movement shorter than .01
world units is no longer misidentified as a wall collision. The retained fatal
block/Thorns regression also remains passing.

`pnpm sync:registry` was attempted and blocked by
`ENOENT /home/agent/.local/share/pnpm`; no registry or root build pass is claimed.
Main, controls and renderer were not edited here. Original167 and reference
catalogs were not changed. Ordinary input, authored new battlefield/status/spell/
undead producers, display integration, normal proportional balance, external
preservation and publication still need the parent integration's separate QA.
Master remains unsupported.
