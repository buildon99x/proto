# Dubai city-crossing transit and environment refinement

Reference and latest 0.6.1 full/detail/mobile screenshots were opened and compared on 2026-11-03. The foreground racetrack, twig-like palms, blank uniform land and weak environmental layering differ materially from the reference.

## Approach
Replace the foreground oval with a smooth elevated diagonal route from the beach foreground, across the plaza, into a right-side city station. A bidirectional four-car metro stops briefly at each terminus and returns on the same visible track. This avoids a fake hidden teleport, an implausible tight return bend, and a large loop cutting through landmark buildings. Arc-length sampling preserves car spacing; eased departure/arrival has zero velocity at terminal stops. Existing 60-second transport cycle and camera controls remain.

Add sculpted pinnate palm crowns, varied trunk/crown scale and tilt, shrub/agave/stone planting, textured sandy shore and limestone urban ground, shaded coastal plazas, benches and route detail. Reuse static geometry/material variants and bounded dynamic roots. No external model, paid dependency, reference upload or main promotion.

## Tests and review
First fail tests for non-oval diagonal route, deterministic seam-safe terminal stops, physical car spacing/heading, and new scene environmental groups. Test all train phases against named landmarks/camel/car and whole motion bounds. Test occupied-region default projection plus representative camera orientations. Independent review precedes publication; actual desktop/mobile screenshots, train traversal/reversal, rail contact and visible environmental quality require parent-managed GPU review. CPU tests do not establish visual fidelity or FPS.
