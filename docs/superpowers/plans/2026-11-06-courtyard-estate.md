# Courtyard Estate Implementation Plan

**Goal:** Recreate the supplied courtyard-estate image as an eleventh independently selectable live miniature in the existing gallery.
**Architecture:** Add project-local architecture and gardens modules plus a world definition. Reuse the existing renderer, view/finish controls, disposal and thumbnail capture without changing other cities.
**Tech stack:** Existing pinned Three.js 0.186.1, esbuild 0.28.2 and Node test runner.
**Source:** User-supplied reference image, actual pixels inspected on 2026-11-06. Artistic East Asian courtyard residence, not a claimed historical reconstruction.

## Scope and composition
Gray curved tile roofs, layered timber main hall, front gate, connected colonnaded corridors, rear kitchen/storehouse/stable, smaller residential pavilions. Irregular turquoise koi pond and arched wood bridge front left; willows, pines, blossom trees, rock gardens and stone paths. No bitmap imitation, no external assets, no invented construction timeline. Small koi movement and tree motion share a deterministic 48-second loop. Build from current main 61c86d2 on codex/courtyard-estate-diorama; no main merge or production promotion.

## Tasks and acceptance
- [x] Add failing tests for gallery/standalone registration, named scene landmarks, geometry bounds, deterministic backward seeks and loop seam, owned resources and bounded batching.
- [x] Build estate-architecture.js and estate-gardens.js with reused geometry and material palettes, then assemble courtyard-estate.js.
- [x] Register the new scene and standalone output; maintain existing ten entries and common controls, bump to 0.13.0.
- [x] Run focused and full app tests, app build/lint, root registry sync and aggregate build.
- [x] Attempt ordinary browser/WebGL rendering without security/GPU bypass; inspect actual output if available and report limits honestly otherwise.
- [x] Fresh independent review; publish only the work branch after final verification.

## Review focus
Pause/seek must not change static geometry; backward seek and remount reproduce state. Main gate and garden perimeter fit portrait camera. No plant or roof blocks the central path unintentionally. Returning to the gallery releases the live runtime. Thumbnail remains a paused actual render; WebGL-unavailable view stays honest.
