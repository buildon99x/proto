# Design
## Intent and approach
An offline Three.js miniature with real geometry, warm shadows, glossy teal animated water, orange gantry cranes, container ships, tugs, stacked cargo, warehouses, road vehicles and corrugated cardboard enclosure. Gallery thumbnails must be actual renders of this scene, never the reference photograph. Use a single live scene at a time; dispose renderer/materials/geometries/listeners on return. Gallery is project-local; root launcher remains generic.
The user selected a scoped pinned diorama-worlds installation and dynamic harbor. Alternatives: a prerendered video is less interactive; a custom game-engine pipeline is heavier. Three.js static artifacts fit the existing launcher. Exact art composition and controls are builder choices.
## Constraints
Project projects/diorama-gallery; branch codex/harbor-diorama-gallery; no main merge or production promotion. Vendor only skills/diorama-worlds from educlopez/diorama SHA 21363b694a5c87f461ed5f86ede21ee158cdc000 with MIT and upstream notices. Pin three 0.186.1, esbuild 0.28.2, playwright 1.64.1, pngjs 7.0.0; npm ci --ignore-scripts. No global installs, paid services, keys, security bypass or unrelated edits.
## Interaction and motion
Thumbnail opens harbor. Back to gallery disposes the live scene. Pause, reset time, and reduced-motion support. Cargo and tug movement use continuous absolute-time paths; cranes visibly lower, lift, translate and drop cargo. Water shimmer and wakes follow time. Responsive viewport, capped DPR and adaptive small-screen shadows. WebGL failure must be explained honestly rather than a blank screen.
## Integration
app/dist offline static bundle copied by standard build pipeline into launcher/public/runs/diorama-gallery. Semantic metadata and brief/spec/eval/readme/changelog. No project-specific launcher branch.
## Non-goals
No external asset CDN, API endpoints, multiplayer, fake benchmark results or unverified quality claims. No main publication. New worlds can be added via gallery data; ship only one complete world now.

## Singapore world
A second world, Singapore / Garden City, uses a thin map-paper base explicitly shown in the reference (not a generic floating terrain slab). Fixed orthographic portrait-friendly composition. Bespoke recognizable landmark meshes, architectural mullions/ribs, teal bay, warm paper, trees, pedestrians and small moving transport. Main motion is a train crossing the foreground, secondary slow observation-wheel movement, bumboat navigation and fountain particles. Absolute-time deterministic loops, no geometry allocations in tick. Gallery metadata drives every label, standalone link and accessibility description. Provide direct ?world=singapore entry; preserve harbor entry. Desktop first-screen controls and mobile compact stage. All dependencies remain pinned existing dependencies. Work on codex/singapore-diorama-gallery from harbor round2; do not include denied harbor round3 payload, merge main, or promote production.

## Dubai world
Third registry entry with direct ?world=dubai and standalone dubai.html. Procedural warm map miniature with recognizable detailed architecture, dynamic metro, boats and fountain, existing shared zoom/orbit/pan/reset controls. Deterministic absolute-time loop and bounded moving roots. Source branch codex/dubai-diorama-gallery from Singapore 6bd76c0, no harbor round3 payload and no main promotion. Detailed design and test plan: docs/superpowers/plans/2026-11-03-dubai.md.

Dubai 0.7 transit: one continuous arc-length diagonal railway, bidirectional train with terminal dwell and smooth reversal, no closed foreground oval or teleport. Environment uses shared procedural canopy geometry, seed-varied shrubs/agaves/rocks, sandy beach and limestone textures, benches and shade. Preserve camera/gallery APIs and existing worlds.

Dubai0.8: rebuild the artificial island as sandy branching fronds with continuous channels, trunk road, open crescent entrance, detailed villas and Atlantis. Central stepped Burj dominates a denser, shorter, varied skyline with mid-rise layers. Use bounded shared geometry and shader-only sea variation, retaining full train clearance and camera contracts.

Dubai timelapse is a separate72-second deterministic cycle with phase navigation. Original Dubai geometry is reused without editing its source. Bounded construction batches reveal individual building pieces and terrain/infrastructure stages; completed city motion remains. Dedicated thumbnail time differs from opening/reset time.

## Timeline controls
Use the existing runtime clock for current/total time, progress percentage, pause-on-seek slider and 0.25×, 0.5×, 0.75×, 1×, 1.5×, 2×, 3× speed selection. Gallery and standalone use the same opt-in controls. Reflect reset, phase selection, reduced motion and repeat; disable unavailable controls and clean up on exit.
