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
