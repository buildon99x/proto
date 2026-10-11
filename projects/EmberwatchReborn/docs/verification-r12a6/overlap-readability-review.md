# R12a5 S keeper overlap: isolated presentation proposal

2026-10-10 UTC. This directory is a disposable proposal, not the canonical source or a published Site.

## Finding

The photographed loss of keeper body readability is consistent with the renderer's existing compositing, not S sceneVisibility removing a living threat.

- The same filtered entities feed body and telegraph rendering. A living active keeper is retained by S threatVisible even when a stale map/gate would otherwise hide it.
- A nearby keeper in front of the hero is intentionally drawn at 0.64 opacity by combatActorOpacity. The depth-sorted receiver statue then blends over it at 0.30 opacity. The hero is finally drawn again at full opacity.
- Where the statue art is opaque before its 0.30 fade, this leaves 0.64 × 0.70 = 0.448 of the keeper's original contribution. The final hero redraw fully covers coincident hero pixels.
- Disabling sceneVisibility in the open-north recording fixture does not change keeper body calls or alpha. Removing the shrine leaves the same 0.64 body and hero redraw; separating the keeper restores body alpha 1 and removes the extra hero draw.

Evidence images inspected: overlap-body-readability-limit.jpg and keeper-combat-flash0.jpg from the supplied native QA directory. The second image shows readable separated keepers. The recorder fixture uses explicitly authored approximate anchors near the real receiver (hero 404,116; keeper 427,139; receiver 432,144). It is not extracted runtime state, a recovered save, pixel replay, or normal-input play. The supplied normal-input QA remains separate evidence.

## Small candidate

Only one existing source file changes: visual.js. New signal-body-contour.js builds a tiny cached silhouette-edge mask from the current keeper sprite frame.

- Gate: exactly S signal_basin, signal_keeper, active, HP > 0, not dead, already accepted by the existing drawable filter, and already receiving the foreground hero-overlap fade (opacity < 1).
- Draw a static dark two-screen-pixel edge and pale one-screen-pixel edge at the keeper's original depth-sorted draw slot. Their alphas are 0.82 and 0.72. There is no pulse, glow, rectangle, floor ring, health cue, or filled opaque silhouette.
- Keep the keeper body at 0.64, statue at 0.30, and opaque hero restoration unchanged. The contour is before the original body and later architecture. Do not promote it to a post-architecture overlay.
- Stop the contour at least six world-scaled screen pixels above the foot anchor, leaving existing shield glyphs and local foot markers untouched.
- No change to sceneVisibility, signal-readability, combatActorOpacity, simulation, collision, saved state, stats, reward values, input, or targeting.
- Cache at most 16 frames / 32 small surfaces. At the current authored S keeper dimensions all 16 frames total 153,050 pixels; the largest surface is 80 × 72. Reuse is tested; missing or failing optional canvas support returns the legacy drawing path. Factories that return the main canvas/context or reuse mask canvases are rejected before mutation.

This is an authored Emberwatch presentation choice, not a reference-game rule.

## Verification performed

21 focused Node tests passed: 15 new helper/recording/small binary-alpha tests and six existing combat-readability tests run fresh on the proposal. Syntax checks of both changed source modules passed.

The recorded legacy rendering command sequence is identical after excluding the two new contour image calls. That includes telegraph paths, fill/stroke styles, body dimensions, body alpha, role marks, statue drawing, and hero restoration. Other checks cover strict eligibility, dead/inactive/hidden/offscreen/distant exclusion, preserved disconnected live threats, reduced flashes, frozen input state, caching, unavailable canvases, and main-canvas/reuse rejection.

The tiny binary-alpha check confirms opaque source interiors are removed and the edge remains within two pixels of the source silhouette. It is not a browser rasterizer. Source pixels that are already semitransparent can retain a little mask after destination-out; visual acceptance must inspect the actual art.

All 89 existing canonical app/src JavaScript files remained SHA-256 identical before/after this investigation. The proposal differs from that snapshot only in visual.js and its new contour module. No browser, full test suite, build, save operation, public deployment, or Git write was performed.

## Still unverified / acceptance boundary

- Actual browser pixels, frame cost, and improvement on the supplied save need normal-input visual QA before integration/publication is called successful.
- Existing warning commands are unchanged. The footer clip reduces local foot-marker conflicts, but it does not prove that every warning segment crossing an upper body remains equally readable after the narrow edge.
- Fully coincident opaque hero pixels still hide the keeper. A keeper behind the hero with opacity 1 intentionally receives no cue. This candidate improves exposed contours in the existing foreground-overlap condition, not every possible actor overlap.
- If this subtle in-slot cue is insufficient, do not silently make enemies opaque, move their bodies, reveal hidden/dead enemies, or paint a late overlay over other actors and warnings. Reassess from normal-input screenshots.

## Review artifacts

- overlap-contour-source.patch: two-file source proposal
- overlap-contour-tests.patch: five new focused test/support files
- focused-tests.tap: fresh 21-test result
- integrity.json: scope, source integrity and bounded allocation facts
- source-before.json: canonical JavaScript snapshot hashes

Re-run from this isolated work directory:

    node --test tests/overlap-cause.test.mjs tests/signal-body-contour.test.mjs tests/contour-mask.test.mjs tests/legacy-combat-readability.test.mjs

For integration, apply the source and new-test patches to the chosen successor work surface, retain the project's existing combat-readability.test.mjs rather than copying its duplicate, and run its required normal checks and visual QA. No integration or publication permission is implied by this proposal.
