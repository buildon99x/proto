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


## 0.3.0 generated-art revision — 2026-10-08

PASS: source syntax; 600 seeded maps; growth/migration/forge checks; seven-class mock-runtime paths; 441 projection/inverse cases at three viewport shapes; all four facing directions and animation states; 48 RGBA atlas rectangles/anchors; static packaging; standalone syntax and all three embedded PNG atlases.

Portrait and landscape images under `assets/screenshots/visual-0.3.0/` are deterministic offscreen Canvas renders of the actual visual module. They confirm integration, depth ordering, stone scale, wall orientation and anchored actors. They are **not browser gameplay screenshots**. The hero sheet check shows all 16 anchored poses.

Remaining limits: supported cloud preview remains HTTP 502; private Site browser access requires ChatGPT login approval and no login/bypass was attempted. Actual play, browser input, save/reload, mobile controls and frame rate remain unverified. Original generated art is closer in palette/material/perspective, but composition and architecture differ from the supplied reference. A 99% match is neither measured nor claimed. All classes share one hero sheet and all enemy types share guardian art; dedicated class/enemy sheets remain future work.

Packaging repair: the former standalone generator omitted visual modules and the PNG atlases. The updated generator embeds all required modules and all three RGBA sheets into one offline HTML artifact.

## 0.4.0 Warrior-first checkpoint — 2026-10-08

PASS:27-file JavaScript syntax checks at the focused gate;600seeded-map checks; growth/save migration/forge invariants; seven existing class regression paths; Warrior delayedcontact/dodge/axes/War Cry/death;11specific collision/input/save regressions;9audio sample/mix-contract checks;960distinct articulated joint signatures excluding root shifts/alpha; pose-contact remapping, stance-foot and loop tests; RGBA/bounds; static build; standalone bundling with six embedded image references and one PCM bank. These are automated/offscreen results.

Offscreen video and contact sheets were visually inspected; side-strike direction, windup silhouette and corpse leg/clipping defects were corrected. Audio is source-generated layered PCM; this runtime does not support audio input, so no subjective listening pass is claimed.

Fresh browser route check: a PythonHTTPserver launched successfully in dot’s desktop terminal, serving4173 from the shared project. The supported terminal.local4173 browser proxy nevertheless returned502Connection refused. No localhost-policy bypass, local-file browser workaround, private-login attempt or sharing change was made.

Required before Warrior acceptance: normal controls throughout a run, attack/skill/dodge feel and balance, real sound mix, actual reload/save flow, target-device60FPS, readable danger under crowded combat. No rollout to another character/monster before this gate.

### Final bounded renderer pass

PASS: bounded viewport floor cache and direct fallback, immediate fog/walkability/map/image/zoom/resize invalidation, camera movement/jumps and viewport coverage. Tall walls/pillars/statues/arches selectively fade where they obscure the Warrior, nearby active opponents or projected tells.

Flushed offscreen1280×800 CPU samples(120perpath): stationarymean43.54→29.94ms, movingmean42.87→27.53ms; p95stationary63.96→44.77ms, moving64.72→44.10ms. These31–36% mean reductions are offscreen measurements, not browser60FPS proof. One typicalcache1600×1120 uses6.84MiB; hardcap6millionpixels. Fractional-camera sampling meanerror<=3.50/255 in testedscenes, stationary0.0018/255. Cache rebuilds still cost time; targetdeviceperformance gate remainsopen.

Motion foot tests are local grounding checks, not world-space planting proof at game movement speed. Actual locomotion may still need gait/speed tuning. No subjective audio listening pass was possible: audio input is unsupported in this runtime.
