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

Timelapse accessibility opt-in (2026-11-04): validate and honor reducedStill for initial/reduced-motion pose; standalone moments metadata adds accessible paused phase navigation. Worlds without these options keep their existing behavior. Shared with desert timelapse implementation.

Local visual integration adds kit/visual-settings.js and kit/visual-pipeline.js, authored shared controls and selective world/build runtime hooks from c944186. No upstream revision change; existing MIT notices retained.
