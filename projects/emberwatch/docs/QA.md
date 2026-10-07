# Verification record — 2026-10-07

## Passed, automated only

1. JavaScript syntax checks (`node --check`).
2. 600 seeded floor maps: all 12 room centers connected to the starting room; expected guardian-floor flags.
3. Seven class definitions / three specialization labels each; unique eighteen-trinket roster; six building definitions.
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
