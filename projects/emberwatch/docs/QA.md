# Verification record — 2026-10-07

## Passed, automated only

1. JavaScript syntax checks (`node --check`).
2. 600 seeded floor maps: all 12 room centers connected to the starting room; expected guardian-floor flags.
3. Seven class definitions / three specialization labels each; unique eighteen-trinket roster; seven building definitions.
4. Save defaults and version migration fallback.
5. Mock-runtime smoke: seven classes' two skills, basic attacks, six floor render code paths, equipment generation, guardian death hooks, inventory/guide/town UI construction.
6. Mock-runtime resource settlement: death retains 60% at no upgrades; victory retains 100%.
7. Mock-runtime save/resume restores floor state.
8. Self-contained HTML generation; no module/network dependencies in the single-file edition.

## Not passed / not performed

Actual browser interaction and screenshot QA could not start. The first browser action was initially not approved, then its exact authorized retry succeeded. The preview page returned HTTP 502 / `[Errno 111] Connection refused`. The preview server was also launched visibly through the cloud desktop terminal; the proxy still returned 502. The exact localhost address printed by the server was explicitly blocked with `net::ERR_BLOCKED_BY_CLIENT`. Testing stopped rather than trying an alternate route around that restriction.

No genuine game screenshots, human-style gameplay, fresh-game victory, death/restart, user-interface equipment changes, browser reload persistence, touch responsiveness, frame-rate or long-session stability are claimed. Read-only WebMCP registration/behavior could not be validated in a supported browser context either.

## Required manual acceptance checklist

- [ ] Fresh start: choose each of four starter classes; begin expedition; read controls
- [ ] Move, aim, attack, dodge, both skills, potion; verify collision/telegraphs
- [ ] Clear a room; collect gold/materials; open chest; equip loot
- [ ] Bank half a haul; verify exact resource deltas
- [ ] Select one trinket from three; verify its effect
- [ ] Die; verify equipment/XP retained and resource settlement; buy a town upgrade
- [ ] Defeat each guardian and final boss without injected state; verify unlocks/NG+
- [ ] Reload during a run, resume, and verify persistent position/resources/enemies
- [ ] Repeat an expedition and verify town/hero progression
- [ ] Check small-screen/touch controls and browser audio after explicit opt-in

## Code-review fixes before handoff

- Pending resume survives sound/guide use rather than being erased by an unrelated save
- Chests guarantee access to both wood and stone in early floors so initial town upgrades are attainable
- Treasury and Chapel descriptions now match their actual resource-loss effects

## Quality conclusion

This is a smaller original prototype. Its systems are substantially narrower than the commercial game. Automated checks are useful fault detection, not evidence of equal play quality. See review.html for exact gaps and sources.

## Growth / combat / map revision 0.2.0

Added permanent skill-point spending, rank gates, five attribute allocations, persistent equipment forging, elemental traits, first-chest equipment guarantee, equipment comparison grid, skill spheres, a training dummy, rank-3 behavior changes, short input buffering, dodge attack cancellation, impact pause/stagger, varied map connectivity/room shapes/corridor widths/encounter packs. Old in-progress maps keep the legacy generator.

New `app/tests/growth.test.mjs` passes legacy migration and idempotency, learning/rank restrictions, costs, attribute allocation, forging/denial non-mutation, legacy-map equality, and topology diversity. Mock-runtime tests now explicitly exercise evolved Q and E for all seven classes. No one should confuse these with actual gameplay evidence.

Reference pixels inspected: official Steam inventory screenshot `ss_8570e9fd7db5c2e91955df2e5686668794d84223.jpg`. It shows adjacent equipped/candidate cards, rarity-colored item slots, clear weapon/attribute requirements, detailed item effects and a dense backpack grid. The new armory adopts comparison-first layout with independently drawn icons. Reference art is not shipped.

Current visual assessment is incomplete: no new-build normal-play screenshot or subjective feel measurement has been obtained. A 98% visual match is neither measured nor claimed. The UI/growth revision can be assessed from source and logic tests only until supported authenticated browser access is available.

### Current private-Site check

The published Emberwatch URL was opened through the supported cloud browser on 2026-10-07. It returned the site's ChatGPT sign-in screen (Korean “접속하려면 로그인하세요” / “ChatGPT로 계속”), not the game. No sign-in was attempted without authorization. This is the current blocker for baseline/new-build screenshot comparison and ordinary-control growth-loop testing; it is not evidence that the game rendered or played correctly.
