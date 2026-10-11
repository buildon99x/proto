# R2a — first connected development slice, before ordinary-input QA

New reimplementation,2026-10-09. Original0.4.7 remains unchanged.

Implemented: explicit free four-action training; legal Apprentice nine-node upgrades; derived resource/stat values and previews; first town and25-enemy road; live moving melee/ranged/cleave/miniboss AI with fixed attack telegraphs; contact-timed mace, piercing hammer, non-piercing charge, directional shield; first patrol and sealed chests; fixed kill rewards; one-frame kill-before-death settlement; retry; potions; explicit isolated profiles; transactional saves including cooldown/resource/recovery state; desktop and basic touch controls; source24-sample Warrior motion and existing atlas/PCM audio reuse.

Limitations: upper44nodes, Adept/Expert/Master, equipment instances, crafting, multi-floor dungeon and complete campaign are not yet implemented. Nine nodes have data/purchase/runtime mapping; their effect coverage is limited by this slice (e.g. no elemental-damage enemy currently exercises elemental bulwark). The hero source art depicts a sword while the mechanics correspond to mace swing, so weapon-specific presentation remains a visual gap. NPC representations currently reuse shrine art and need richer character presentation. Do not call this AAA, feature complete or fun/depth-accepted.

Automated status:99 current tests pass (R1 original50 retained, newgrowth28, campaign/combat21), syntax passes,29-file15.85MB static build succeeds. The model first-six-kill route uses normal combat functions and moving AI, with scripted NPC coordinates/steering and no injected HP/XP/level. Other geometry/settlement tests intentionally isolate enemies or submit fixture reports. This is not human input or wall-clock campaign pacing evidence.

Browser ordinary-input QA, visual/audio review, real Web Locks behavior and published Site QA are not yet run at this checkpoint. The source and static build are preserved before beginning those checks.

Save/transitions contract: snapshots retain paid resources, skill/potion cooldowns and remaining recovery lock. Saving/travel cancels uncompleted attack/projectile execution without refund and cannot skip its remaining recovery. Kill receipts survive region roundtrip, death and resume. Death costs5% of current gold after frame rewards, preserves XP/materials/kill records, and requires explicit retry at the town. Town healing is free. All these are Emberwatch-authored policies, not source-verified original rules.

Resources: docs/reused-resources-r2.json records original0.4.7 hashes and current adaptations. Original source, generation/animation provenance, CC-BY voice attribution and Korean font OFL remain preserved. The audio engine uses existing fantasy PCM, not new oscillator beeps; listening quality is unverified. Master volume, shake and actor flash options are connected. Effect density and full flash treatment still require visual review.

Build reproduction: in app/, `npm test`, `npm run lint`, `npm run build`. Serve app/dist/index.html via a local HTTP server. Full monorepo/launcher build remains unavailable on this sparse recovered checkout and is not claimed. No public Site or remote ref is changed.

## Latest publication instruction
The user subsequently requested immediate public publication of the current version (2026-10-09). R2a is therefore being published as an explicitly limited development checkpoint before the whole-playthrough gate. Ordinary-input review and improvements continue after publication. A new separate Site identity was registered; original Emberwatch is preserved. Optional read-only WebMCP status registration is feature-detected; no supported WebMCP context has been validated, and it does not supply gameplay/debug mutation.
