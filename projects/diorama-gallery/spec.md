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

## Ancient river city
Fourth gallery entry and standalone desert.html, with existing opt-in camera controls and source-specific 100x100 relative layout. Reference and blueprint were visually inspected. Procedural boats follow the river with deterministic bounded time; no historical reconstruction claim. See docs/superpowers/plans/2026-11-03-desert-city.md.

## Inspect-only desert section
A separate offline desert-inspect.html directly builds the current desert.js at t=12. Its fixed orthographic top view marks the Z=−7.40 A–A′ plane and axes. The vertical section computes actual indexed/nonindexed transformed triangle-plane intersections, including instances, with X and Y at equal scale. Hidden objects are excluded. Numeric gaps are sectional measurements, not whole-object clearance claims. No controls or other worlds are changed.

## Desert reference preset
The optional referenceView uses position [3,16,24], target [−.3,1,−1], FOV 50° and framingAspect 4/7. It holds vertical FOV on desktop and ordinary portrait viewports, expanding it only on narrower screens. Presets without framingAspect keep their original shortest-axis projection exactly. Both gallery and standalone expose the opt-in preset; mode changes cancel gestures and restore 100% zoom, while drag, pan, pinch, keyboard and reset remain available. Reference uses the existing angle-faded scenic backdrop.

## Scoped short-landscape layout
Only desert screens 641–1000px wide, at most 500px tall and landscape receive a 180–240px stage, wrapping controls, 44×44px minimum interactive targets, and a native link to the controls. Gallery and standalone use the same scope; embedded standalone remains fullscreen. No fixed overlay, scroll lock, synthetic smooth scrolling or touch-gesture takeover is introduced. Reduced motion remains respected by the runtime and gallery pause UI.

## Desert formation timelapse
Create a new world with separate source and gallery entry. Use absolute time and deterministic staggered stages, with pause/seek/reset and reduced-motion support. The original desert remains unchanged. Existing renderer supports dynamic instance matrix updates; moving stage roots must be marked dynamic before batching. Never use reference artwork as a thumbnail. Water/terrain must remain coherent throughout; preserve the excavated river, finished layout, other worlds and shared resource disposal.

## Timeline controls
Use the existing runtime as the single clock. Show elapsed/total scene time and percentage, with an accessible range slider that seeks and pauses. Offer 0.25×, 0.5×, 0.75×, 1×, 1.5×, 2× and 3× without changing the current scene time. Reflect phase selection, reset, reduced-motion stills and looping. Apply the same controls to the gallery and standalone timelapse only. Keep controls disabled if WebGL is unavailable; dispose the UI animation callback on navigation.

## Timelapse environment controls
Only the formation world opts into a shared environment factory. Default is clear/day. Weather (clear/cloudy/rain/sandstorm) and time of day (day/night) are independent selectors in gallery and standalone. Environment changes repaint the existing scene time without changing pause, phase, playback speed or view. Procedural clouds, rain, sand, haze and star/moon sky use owned bounded resources and deterministic absolute scene time. Night retains readable cool scene lighting. Clear/day restores original scene lighting/background/fog. No network assets. Legacy worlds do not opt in. Controls are keyboard-labeled, wrapping and at least 44px high; unavailable WebGL controls are visibly disabled. Effects share runtime pause, visibility/reduced-motion, seek and disposal.
