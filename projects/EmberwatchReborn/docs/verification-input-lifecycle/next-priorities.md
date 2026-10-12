# Next priorities: real motion/action chains and melee-build gap

This is a source inventory and a bounded test plan, not approval to rebalance or implement saved equipment changes. No new build archetypes are invented.

## Skill movement/connection inventory

| Existing action | Implemented source contract | What remains to verify or implement next |
| --- | --- | --- |
| Mace swing | Planted windup, free recovery walk after contact; pre-contact aim window; held repeat; early/recovery dodge-cancel windows. | Native D/J retreat/lateral chains, phase-to-body/footwork readability and exact intent/contact correspondence across FPS/hitstop. |
| Righteous hammer | Existing windup/recovery slowdown, independent move/aim, pre-contact retarget window, held repeat through readiness; projectile presentation. | Native release tracking/cursor-ground combinations while walking, contact/cost/visual timing and after-recovery Q/roll chains. |
| Shield charge | Internal authored travel rather than free WASD; selected heading while queued, locked heading after start; no dodge-cancel window during charge. | Native wall/corner contact and charge→mace/hammer sequence, explicit distinction between attack charge and dodge. Baseline v69 heading/roll-to-Q reports cover a subset only. |
| Judgement | Planted pre-contact, slowed recovery walk, pre-contact retarget and finite press. | Native short-tap/movement/roll chain and a clear committed facing through contact; existing timeline is not proof of polished motion. |
| Heal / banner | Heal slows before contact then allows normal walk; banner allows normal walk. Both have finite presses and no aim-retarget window. | Verify actor pose, self/area origin and recovery affordance in actual combat. |
| Onslaught | Internal forward channel movement, input-token ownership, per-second payment and release/cancel handling; channel target window and pulse FX. | Native moving-turn path, normal release vs safety cancellation, one follow-up lance, walls/resource exhaustion, listening. Existing scripted tests do not certify full-play readability. |

All values/windows remain current Emberwatch-authored data in poe-skill-policy.js and warrior-balance.js. Accepted recovery intents still use.18s and save-tolerance uses150ms; no global speed or buffer retune is proposed. Prioritize a normal-input trace of mace→hammer→roll→Q and charge→mace, then repair only reproduced phase/pose/path defects. Do not declare FX/motion complete from handler tests.

## Three requested melee builds: exact mapping still unresolved

The names/core definitions of the user's three builds are not present in the current delegated conversation or local design/requirements files. Personal Context was unavailable; one optional clarification remains requested. No claim that these mean three classes, sword/shield/dual-wield, or three Paladin skill presets is made.

Current implementation facts:

- One playable classId warrior, corresponding to Paladin, with fixed mace/shield/hammer/charge action identities. Rebinding moves skills between slots; it does not select a different weapon combat engine.
- Skill growth and real augments exist: mutually exclusive hammer damage branches, banner support branches, thorns/block triggers, Judgement and Expert channel/lance support. These can affect action results, but are not yet a verified mapping to three named user builds.
- equipment-content.js currently offers iron_mace and oak_shield as weapon/offhand items, with introductory armor/accessories. Source has no distinct sword/axe/dual/two-hand combat-handler catalog. Sword-shaped rig masks and motion-warrior-axe.png are presentation assets, not evidence of separate weapon rules.
- warrior-balance.js advertises Apprentice/Adept/Expert runtime mappings; Master is unsupported. Canonical reference trace has53 warrior nodes including13 Master nodes. Catalog/reference availability alone is not runtime completion.

Required gap closure after definitions are confirmed:

1. Map each requested build to actual supported skills/branches, input sequence, movement/aim policy, defensive/resource loop and observable FX/body differences. Label missing actions explicitly.
2. Run the same ordinary enemy encounter using each legal build with normal earned progression, confirming different decisions/behaviors rather than different key names or damage numbers. Preserve balance hold.
3. Implement one missing independent action/motion slice only after its contract is concrete. Any extension requiring equipment serialization/saved loadouts is outside this input task and remains blocked by a19 review; do not reroute or reproduce it.

The present patch resolves a cancellation-input defect. It does not add a weapon build, complete three builds, enhance FX, certify physical responsiveness, or validate listening.
