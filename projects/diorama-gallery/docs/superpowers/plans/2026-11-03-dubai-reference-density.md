# Dubai reference-density implementation plan

> For agentic workers: use superpowers:executing-plans. User opted out of optional design questions.

**Goal:** Bring island anatomy, city layering, stepped silhouettes and water depth closer to the supplied portrait while preserving interactive transport.
**Architecture:** Authored low-poly geometry and shared materials in existing Dubai modules. Rebuild Palm geometry, tune landmark proportions and fill city gaps with named mid-rise blocks. Shader-only sea detail keeps dynamic cost bounded.
**Tech stack:** Existing pinned Three.js and diorama-worlds, no dependencies or external textures.
**Spec:** ../../../../spec.md and inspected original14307.jpg / actual01-v070-full.jpg.

## Constraints and observations
Existing branch only, no main/production promotion. No reference publishing. Reference shows branching Palm with a front opening, not a closed oval; city has a tall central needle and dense varied lower skylines, not uniform isolated towers. Preserve diagonal rail and full-loop clearances. Existing scene ~300k triangles; aim below400k, no per-frame allocation.

## Review focus
- Island villa plots must sit on sandy fronds and leave continuous channels.
- New city blocks must not intersect metro/stations.
- Taller details must stay in full and occupied projection bounds.
- Sea must retain nonperiodic motion without bright repeating dots.
- Orbit should expose true modeled backs, not facade-only substitutes.

## Tasks
- [ ] Add failing structural tests: island trunk/fronds/open crescent/Atlantis, named varied city layers and height hierarchy; retained bounds and transport sweeps.
- [ ] Rebuild island with planar sand ribbons, road spine, oriented villas/gardens, breakwater/shore strips and low-poly palms. Add crescent hotels and Atlantis arch outline.
- [ ] Replace uniform skyline with varied stepped/sloped/tapered crowns, lower height hierarchy and dense mid-rise podium layers; emphasize central Burj setbacks and base terraces.
- [ ] Add water depth gradient, finer directional shimmer, view-correct normal perturbation and bounded shoreline ribbons; no extra render pass.
- [ ] Run full app29+ tests/build/lint, registry validation and launcher build. Independently review. Report exact local commit to parent before branch publication.
- [ ] Publish scoped Preview then parent performs actual GPU screenshot review. No visual completion claim from CPU tests.
