# Courtyard Estate CPU geometry review

Reviewed 2026-11-06 at scene time 12 seconds.

Image: `exact-mesh-t12-cpu-geometry-review.png` (1000 × 1100).

## Method and limits

Exported 16,317 actual mesh geometries from the implemented `courtyard-estate.js` world using its pinned toolkit, applied their world matrices after the t=12 tick, and rendered their triangles offline with Blender Cycles on CPU. Meshes were grouped by original material color; no approximate replacement buildings or AI-generated imagery were used. The offline renderer uses its own lighting, material handling, and orthographic camera fit. It does not reproduce the production Three.js shading, antialiasing, shadows, batching, transparency, or interactive behavior.

This image is a **CPU geometry review, not a browser/WebGL screenshot, runtime validation, or gallery thumbnail**. It must not replace the gallery thumbnail. The portrait frame was tightened to show the full perimeter at approximately 88% of the image height.

## Findings after revisions

- The black rectangular artifact at the front entry-path crossing is gone. The union-grid paving reads cleanly in this render.
- The longitudinal covered walks now visibly meet the rear crosswalk.
- The front gate, main two-tier hall, central courtyard, dining hall, rear service buildings, perimeter walls, bridge and pond are legible, without major visible building intersections or frame clipping at this view.
- Planting does not visibly engulf the main hall or pond. Some foliage naturally overlaps roof silhouettes in projection; no new conspicuous clipping was identified.
- The supplied reference remains richer and more irregular in its garden planting. The implementation is a simpler, orderly interpretation, with more roof-dominated intermediate courts.

Browser-rendered appearance, orbit/zoom framing and animated-state clipping still require actual WebGL verification. This review only supports the geometry and composition findings above.
