## Current main integration (2026-11-05)
The user explicitly requested all desert-through-Rome city dioramas merged to main. This supersedes historical branch-only and no-main constraints below for this integration. Version 0.11.0 combines the published source heads listed in docs/superpowers/plans/2026-11-05-main-integration.md and preserves harbor and Singapore. Ten entries are available, including five city-formation timelines. Unpublished Rome refinement 5d1e3ef is not included because its source is unavailable in this workspace. The merge is not a claim of 95% reference likeness or verified real-WebGL performance.

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
Dubai timelapse is a separate72-second deterministic cycle with phase navigation. Original Dubai geometry is reused without editing its source. Bounded construction batches reveal individual building pieces and terrain/infrastructure stages; completed city motion remains. Dedicated thumbnail time differs from opening/reset time.

## Timeline controls
Use the existing runtime clock for current/total time, progress percentage, pause-on-seek slider and 0.25×, 0.5×, 0.75×, 1×, 1.5×, 2×, 3× speed selection. Gallery and standalone use the same opt-in controls. Reflect reset, phase selection, reduced motion and repeat; disable unavailable controls and clean up on exit.

## Timelapse environment controls
Only the formation world opts into a shared environment factory. Default is clear/day. Weather (clear/cloudy/rain/sandstorm) and time of day (day/night) are independent selectors in gallery and standalone. Environment changes repaint the existing scene time without changing pause, phase, playback speed or view. Procedural clouds, rain, sand, haze and star/moon sky use owned bounded resources and deterministic absolute scene time. Night retains readable cool scene lighting. Clear/day restores original scene lighting/background/fog. No network assets. Legacy worlds do not opt in. Controls are keyboard-labeled, wrapping and at least 44px high; unavailable WebGL controls are visibly disabled. Effects share runtime pause, visibility/reduced-motion, seek and disposal.

## Automatic environment story (2026-11-05)
Implement the deterministic editable event track and ancient construction design in docs/superpowers/specs/2026-11-05-timelapse-story-design.md. Manual choices remain explicit overrides, with return to automatic playback.

## Shared visual quality
See docs/superpowers/specs/2026-11-05-visual-quality-design.md. Original remains default. New effects are miniature-only and use capability-tested linear HDR with exactly one output encoding. Settings retain clock, camera and weather. Auto performance is conservative on narrow screens. AO/new DOF deferred pending real GPU comparison.
## Shared visual quality integration (2026-11-05)
Port only isolated rendering lifecycle hooks and shared visual settings/pipeline/controls from c944186. Expose the same controls in gallery and every standalone world. Keep pinned dependencies and existing scene files unchanged. Preserve runtime state and effective-status subscription; non-miniature finishes remain legacy.
## Istanbul implementation
Use the existing Three.js renderer, offline build, timeline/speed/view/weather controls on separate `istanbul-timelapse` registry and standalone entry. A thin dark sea slab supports a densely composed warm-lit waterfront. Bespoke layered mosque domes/minarets, Galata, palace arcades, facade bays and shops, catenary bridge, Maiden's Tower and ferries. Dark-blue night is the default atmosphere; progressive architectural lighting is the final construction stage. Day mode remains available. All motion and construction are deterministic absolute time, resources owned/bounded, historical dates deliberately omitted. References are not output art. Keep original worlds byte-identical; no main/production promotion.

## Shared visual engine integration (2026-11-05)
Integrate reviewed shared opt-in HDR/Neutral/AgX/bloom/color-grade engine and Original/Soft/Vivid controls into this Istanbul candidate. Preserve every city scene, camera, environment and timeline. Default Original; non-miniature finishes retain their legacy renderer. Validate shared settings/runtime/resource tests, all city CPU tests, app build/lint and aggregate release build. GPU appearance and performance remain unverified without ordinary WebGL2.
## Paris formation
A separate 72-second artistic sequence and standalone paris-timelapse.html. Ground, river quays/bridges, architecture, gardens and life form deterministically and rewind. Reuse the bounded construction batching and playback UI. New Paris-only atmosphere wraps the existing shared atmosphere, adds seeded snowfall and switches emissive windows/streetlamps/landmark trim, defaulting to clear/night. Weather choices are world-specific and leave Dubai unchanged. Build bespoke recognizable landmark meshes and detailed continuous mansard façades on a square limestone base. No reference pixels are shipped. Isolation: codex/paris-city-timelapse based on bd755a9; no main merge or production promotion.

### Paris reference refinement
Broader rounded Montmartre terraces and solid stair risers support the basilica. Three Haussmann blocks have actual open-air courtyards; pitched mansard crowns and pavilion accents diversify the roof silhouette. The Louvre pyramid has a clear paved court, free from trees, lamps and visitors intersecting its glass. Four palace chimneys meet their real roof surfaces. Gallery fallback/title identify generic miniature worlds rather than the original harbor.

### Paris final detail pass
One additional source-only refinement adds bounded shared facade ornament and street-scale detail: real window lintels, masonry courses, shop detail, small cars with wheel contact and night lamps, pedestrian crossings and benches. Street props must sit on actual surfaces and clear architecture, river water and other props. Deterministic static geometry enters the existing infrastructure/life construction phases. A fresh exact-source offline comparison is required; this still does not establish 95% fidelity or GPU appearance.

### User-directed Paris composition revision
Raise the Eiffel Tower substantially while retaining a bounded completed pose. Replace identical blue-roof blocks with distinguishable building/window/roof families within their existing outer footprints. Plan roads from actual architectural footprints, remove road surfaces beneath architecture/water except explicit bridges, and place all trees on supported sites clear of roads and buildings. Audit every road segment and tree from the same production scene builder. Work remains local until separate publication approval is resolved.

## Shared visual quality controls
Use byte-identical visual-settings.js, visual-pipeline.js and visual-controls.js from the reviewed common engine c944186. Add only runtime and gallery/standalone wiring. Miniature may opt into linear HalfFloat HDR, highlight bloom, Neutral/AgX tone mapping and display-space grading; legacy finishes stay unchanged. Preserve all five existing world entries. Expose getVisualSettings, setVisualSettings, onVisualChange and stats.visual, notifying after resize and context restoration. Controls never reset scene time, pause, playback speed, camera or environment.
## Rome miniature and formation
Follow docs/superpowers/specs/2026-11-05-rome-design.md. New rome and rome-timelapse entries use procedural geometry, portrait map composition, named landmarks, stone bridges and moving boats. Warm window/arcade illumination defaults to night; day remains selectable. Snow is scoped to Rome, and Dubai's existing weather contract stays unchanged. Formation uses deterministic construction batches with ground-to-roof revelation, final hold and rewind.

## Published Rome common visual integration (2026-11-05)
Integrate reviewed common engine c944186 onto published Rome be19f617 only. Preserve all authored geometry, opt-in orbitFit/framingProjection, night defaults, independent weather, and scene lists. Original remains default; HDR, Neutral/AgX, threshold bloom and grading are opt-in through Korean shared controls. Validate full app CPU suite, build/lint, shader compiler where available, registry and equivalent aggregate build. Real WebGL pixels and performance remain unverified. No unpublished Rome refinements or production promotion.
