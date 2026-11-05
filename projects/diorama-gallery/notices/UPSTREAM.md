# Vendored upstream
- Repository: https://github.com/educlopez/diorama
- Revision: 21363b694a5c87f461ed5f86ede21ee158cdc000
- Source subtree: skills/diorama-worlds
- Destination: projects/diorama-gallery/.agents/skills/diorama-worlds
- License: MIT; original LICENSE reproduced as diorama-MIT.txt. Upstream THIRD_PARTY_NOTICES.txt retained.
- Local source modification: scripts/browser.mjs explicitly sets chromiumSandbox: true and excludes Playwright's --enable-unsafe-swiftshader default. This safety-only local patch prevents upstream launch defaults weakening restrictions. Additional local rendering patch in kit/world.js: optional per-world camera/background/light/shadow/MSAA/focus profile, with adaptive mobile shadow/sample budgets. Existing world definitions retain default profile; harbor opts in. Rendering appearance still requires GPU review.
- Dependencies are the upstream package-lock exact pins: three 0.186.1, esbuild 0.28.2, playwright 1.64.1, pngjs 7.0.0. Installed with npm ci --ignore-scripts. No global dependencies.
- Singapore-only performance opt-in in kit/world.js: staticScene batching separates immutable architecture from explicitly listed dynamic roots and uploads static instance matrices once. Legacy worlds retain dynamic behavior. CPU regression covers immutable upload count; actual frame performance remains a browser measurement.

2026-11-03 local opt-in zoom patch: mountWorld exposes setZoom only when definition.rendering.zoom is enabled, clamps0.75–2.5, keeps camera zoom through resize/finish, renders immediately while paused, and ignores calls after disposal. Singapore opts in; harbor remains at1×. Gallery owns and removes scoped wheel/touch/button listeners.

Standalone builder takes optional zoomModule, supplied only for Singapore; same bundled controller/buttons and cleanup. Harbor standalone stays unchanged.

0.5.0 opt-in camera rig: orbit/pan/resetView around declared scene center, bounded elevation/translation, retains original framing on reset. Shared default harbor behavior unchanged.

Dubai visual review (0.6.1): opt-in rendering.framingBounds accepts a finite union of occupied XYZ boxes for initial orthographic framing. Default worlds still use the original single motion bounds. This removes empty sky from sparse tall cities without reducing the complete motion bounds used for world checks. CPU tests verify actual geometry projection fits the occupied regions and validate legacy fallback. Occupied-region worlds also center the orbit pivot in their framing plane; legacy pivot behavior is unchanged. No browser flags changed.

2026-11-05 local environment-track opt-in: mountWorld passes the existing scene duration and candidate default events to the owned environment factory. Environment get/set/add/update/remove/reset and automatic/manual mode APIs redraw the same absolute scene time without changing playback anchors. Stats expose detached frozen environment events and blend weights. Existing camera, batching, renderer safety settings and pinned dependencies are preserved; original worlds do not opt in.

2026-11-05 optional visual quality patch: local kit/visual-settings.js and visual-pipeline.js implement an opt-in HalfFloat HDR pipeline, luminance-threshold bloom, pinned Three.js Neutral/AgX curves and one final sRGB encoding plus display grading. world.js adds isolated settings/render/resize/context/dispose hooks. Legacy path remains default, including the original graphic finishes. build-world.mjs accepts an optional shared visualModule. No upstream revision or dependency version changed. See VISUAL-QUALITY.md for capabilities, integration and validation limits.
Timelapse accessibility opt-in (2026-11-04): validate and honor reducedStill for initial/reduced-motion pose; standalone moments metadata adds accessible paused phase navigation. Worlds without these options keep their existing behavior. Shared with desert timelapse implementation.

2026-11-05 local environment-track opt-in: mountWorld passes the existing scene duration and candidate default events to the owned environment factory. Environment get/set/add/update/remove/reset and automatic/manual mode APIs redraw the same absolute scene time without changing playback anchors. Stats expose detached frozen environment events and blend weights. Existing camera, batching, renderer safety settings and pinned dependencies are preserved; original worlds do not opt in.

2026-11-05: port isolated visual lifecycle hooks from common engine c94418614a4778d3e5fb976f1baed475c8ce4c4e. New visual-settings.js and visual-pipeline.js and optional standalone visual controls retain pinned Three.js and all upstream notices. Existing Dubai geometry, lighting, camera, environment and timeline are unchanged; no browser safety settings changed.
Timelapse accessibility opt-in (2026-11-04): validate and honor reducedStill for initial/reduced-motion pose; standalone moments metadata adds accessible paused phase navigation. Worlds without these options keep their existing behavior. Shared with desert timelapse implementation.

Local visual integration adds kit/visual-settings.js and kit/visual-pipeline.js, authored shared controls and selective world/build runtime hooks from c944186. No upstream revision change; existing MIT notices retained.
Timelapse accessibility opt-in (2026-11-04): validate and honor reducedStill for initial/reduced-motion pose; standalone moments metadata adds accessible paused phase navigation. Worlds without these options keep their existing behavior. Shared with desert timelapse implementation.

2026-11-05 common visual integration: locally authored visual-settings.js and visual-pipeline.js, plus narrow mountWorld/build-world hooks from reviewed c944186. Original and legacy finishes remain available. HDR capability/sample/framebuffer checks, optional threshold bloom, Neutral/AgX tone mapping, one output encoding and display-space grading own and release their resources. Upstream revision, pins, MIT notices and safe browser configuration are unchanged.
Timelapse accessibility opt-in (2026-11-04): validate and honor reducedStill for initial/reduced-motion pose; standalone moments metadata adds accessible paused phase navigation. Worlds without these options keep their existing behavior. Shared with desert timelapse implementation.

Rome opt-in orbit fit (2026-11-05): rendering.orbitFit recomputes orthographic bounds after camera orbit and resize, retaining intentional pan and zoom. Only Rome definitions opt in. Legacy worlds retain their fixed initial frusta. Exported framingProjection supports CPU corner-projection regressions; no GPU claim or browser flag change.

2026-11-05 optional visual quality patch: local kit/visual-settings.js and visual-pipeline.js implement an opt-in HalfFloat HDR pipeline, luminance-threshold bloom, pinned Three.js Neutral/AgX curves and one final sRGB encoding plus display grading. world.js adds isolated settings/render/resize/context/dispose hooks. Legacy path remains default, including the original graphic finishes. build-world.mjs accepts an optional shared visualModule. No upstream revision or dependency version changed. See VISUAL-QUALITY.md for capabilities, integration and validation limits.
