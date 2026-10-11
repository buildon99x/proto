# R10 Tomb boss phase runtime

2026-10-10 UTC. This bounded checkpoint implements the selector required by
`r10-tomb-expert-handoff-plan.md` and `r10-tomb-core-contract.md`. It changes
`app/src/combat.js`, adds `boss-phase.js`, and adds production-combat fixtures.
World/state/UI integration belongs to the integration owner. This is not browser
play, an earned L15 run, boss-readability acceptance or a published release.

## Authored behavior and preserved boundaries

Only `tomb_oathkeeper` currently declares `patternPhases`. Its existing authored
210 HP, armor 8, speed 44 and immutable attack values are unchanged. Difficulty
still applies the existing health and outgoing-damage factors. No source-game
measurement or new reference fact is claimed.

- Whole cycles needle → pulse.
- Each living HP observation at or below 50% of the actual difficulty-scaled max
  latches the cracked phase. Damage handlers observe immediately, including
  hammer/fire/thorns; the enemy update also observes a threshold while stunned.
- The committed attack keeps its original spec, angle and tell. Its release and
  complete existing recovery finish before the selector activates cracked and
  resets the cycle cursor. Cracked cycles needle → broken oath → pulse.
- A later HP rise cannot un-latch a phase within the same encounter. The game
  does not add such a heal; only a labelled test mutation exercises this case.
- Existing charge stun still interrupts a tell, resets the ordinary idle timer
  to .25 seconds, and prevents updates until stun expires. The selector does not
  cancel the tell or replace that established stun rule. A pending phase waits
  for both stun and its remaining idle timer. Shackles still slows movement only;
  it does not shorten/lengthen windup, recovery or change pattern geometry.
- Lethal contact is allowed before every phase. A player hit at the same frame
  as recovery expiry defeats the enemy before phase activation. Shield thorns
  can still settle simultaneous hero/boss death. No HP boost, immunity, force-
  survival timer, summon, extra reward, healing or automatic oath pickup exists.
- No phase metadata or event is created for existing non-opted-in foes. Their
  fixed list and legacy random-circle fallback remain unchanged.

## Presentation contract

The renderer may read, never write:

- `enemy.patternPhase?.id`: `whole` or `cracked`.
- `enemy.patternPhase?.cue`: `null` for whole, `cracked-ring` for active cracked.

The cue changes only at activation, not when the threshold is pending. Treat it
as a quiet persistent shape cue below hostile warnings, loot and actors, with
the same semantics at reduced flashes. Presentation must not advance the cursor,
infer attacks from current HP, retarget a tell or consume a gameplay event.

Activation emits exactly one transient
`{type:'enemyPhaseChanged', id, phaseId:'cracked', cue:'cracked-ring'}` event.
Initialization emits none. `index` and `pendingIndex` in `patternPhase`, plus the
existing `patternIndex`, belong to combat. The cue is not a damage area or pulse.

## Reconstruction and persistence

`createBattle` creates fresh phase state using the freshly reconstructed enemy
HP. The current game already restores living foes to their ordinary full HP on
re-entry/load; consequently the returned Oathkeeper starts whole with a fresh
cursor. This checkpoint does not change that existing enemy-health policy and
does not persist a cracked marker against a newly full-HP foe. Defeated permanent
IDs remain absent. Player paid pools, cooldowns and recovery are preserved by
the existing snapshot path. A map-only refresh of the same battle retains the
same enemy phase latch; no new save field is added.

## Verification and remaining gates

All 27 new cases in `tests/tomb-boss-phase.test.mjs` run actual `createBattle` and
`stepBattle`. They inject T gate/position, precise HP thresholds and, where
needed, an Adept skill budget. Timing-only cases explicitly give the fixture
hero temporary invulnerability; damage/death cases remove it. They do not
increase boss HP. These are deterministic combat-boundary fixtures, not earned
ordinary-input play or proof that a normal build sees every cycle.

Coverage includes .01/.02/.05 and capped .25-second steps; all four difficulty
thresholds; whole/cracked cycle order; locked aim/spec/shape; full recovery;
latching after a synthetic HP rise; actual hammer, charge, Shackles and fire
hits; stun-time damage; death before activation and on the boundary frame;
simultaneous thorns/hero death; one-shot skill-deadline split; pulse's existing
strict radius+8 center test; broken-oath projectile data; re-entry HP/phase and
hero recovery; arrival/gate safety; every existing fixed-pattern foe and the
four legacy unpatterned kinds.

The focused sequential regression command covers the new file plus
`campaign-combat`, `combat-adept`, `combat-intent`, `combat-walls`,
`furnace-fire-response` and `fire-area-presentation`: **181/181 passed**, zero
failed/skipped. The source preserves R9a3's `sectorContains` import/use. Source
syntax and diff checks accompany this checkpoint. The required
`pnpm sync:registry` was attempted and failed with the recovered environment's
missing `/home/agent/.local/share/pnpm`; no registry output was produced and no
installation workaround was used.

Full integrated suite, build, original-asset verification, external checkpoint,
normal-input candidate/public QA and final publication remain the owner's gates.
This task did not run a browser, publish, use Library or write remote Git.
