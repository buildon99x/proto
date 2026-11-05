# City diorama main integration plan

**Goal:** Merge all published desert-through-Rome work into main, preserving harbor and Singapore.

**Architecture:** Keep all authored scene modules unchanged. Reconcile the gallery registry, standalone entries, responsive styles and shared runtime into a superset. Preserve source ancestry in one multi-parent integration commit.

**Source heads:** desert 7be6ac8, Dubai 8133060, Istanbul b4959da, Paris 952fdab, Rome common visual 9eca224. Main baseline b029484.

## Required preservation
- Ten gallery entries and offline standalone outputs with unique identifiers.
- Desert cinematic/reference views and editable weather track; Dubai editable weather track.
- Published night defaults, per-city weather choices and occupied orbit framing.
- Shared opt-in visual controls; Original remains default; no reference-image thumbnails.
- Authored geometry, motion, construction staging and resource disposal.

## Steps
- [x] Inspect current remote refs, branch ancestry, project rules and automatic main deployment.
- [x] Integrate all published source modules and reconcile shared interfaces.
- [x] Add registry/build regression tests, run them RED then GREEN.
- [x] Run app tests, build, syntax checks, toolkit CPU tests and ordinary browser attempt.
- [x] Run root registry, metadata validation and full release build; distinguish any environment limits.
- [x] Complete independent review and resolve important findings.
- [ ] Publish the integration, verify remote main and observe exact-commit production deployment.

## Limits
The unavailable unpublished Rome refinement 5d1e3ef is not part of this merge. Existing evidence from separate branches remains historical, not a new validation claim. Real WebGL pixels, physical mobile performance and the requested reference-fidelity target require separate visual verification.
