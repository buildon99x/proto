# Singapore Diorama Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
**Goal:** Add a recognizable animated Singapore map miniature with a genuine rendered thumbnail.
**Architecture:** Existing world runtime; separate landmark, environment/motion, and registry modules. No new dependencies. Build once, tick absolute-time transforms.
**Tech Stack:** Three.js 0.186.1, pinned diorama-worlds, esbuild, node:test.
**Spec:** ../specs/2026-11-03-singapore-design.md
## Global Constraints
- Existing pinned dependencies, no sandbox/GPU bypass, no main promotion.
- Real thumbnails, dispose old scene, preserve harbor, no reference image in output.
## Review Focus
- Mobile aspect ratio: stage controls remain visible, scene uses portrait-friendly framing.
- Returning/reopening: exactly one active world; labels and standalone links correct per world.
- Reduced motion: declared still without movement; controls accurately disabled.
- Loop boundary: train/wheel/boat continuous and deterministic after seek.
- Fountain and train: mouth/start endpoint and rail height align visibly, not just generic motion.
## Task 1: Authored Singapore world
- [x] Write failing CPU scene/pose/bounds test in app/test/singapore.test.mjs; run RED.
- [x] Create app/src/singapore-landmarks.js and singapore.js, resource-owned original geometry and absolute-time motion.
- [x] Run tests GREEN and inspect finite bounds, loop continuity and resource disposal.
## Task 2: Gallery integration
- [x] Add failing metadata test, create worlds.js registry, make main.js labels/links data driven.
- [x] Build standalone singapore.html, add ?world=singapore direct entry and responsive first-screen stage/controls.
- [x] Update project metadata to0.3.0, docs and changelog. Run test/build/lint/registry/rootbuild.
## Task 3: Visual review
- [ ] Open real browser output; inspect desktop/mobile and all main landmark silhouettes, interactions, seams and performance.
- [ ] Capture actual screenshots. If WebGL inaccessible report unverified status, no fabricated captures.
- [ ] Independent review, scoped local commit; parent handles publication authorization.

## Actual 0.3.1 visual review / 0.3.2 bounded polish
- Evidence: actual Edge full/detail/mobile captures reviewed 2026-11-03. Controls, reset and mobile framing passed.
- Replace periodic water diamonds with domain-warped multiscale value noise; no textures/dependencies or per-frame allocations.
- Shade lotus petals from cool recessed roots to ivory rims with vertex colors and stronger cupping; retain upward normals.
- Reduce foreground skyline height to reveal Flyer silhouette, preserving placement clearance.
- Run CPU/shader-contract regression, build/lint and independent source review, publish same Preview branch only. Actual GPU appearance/performance remains separate QA.

## 0.4.0 requested transport speed and zoom
- Train/boat only: exactly2×0.3.2 route-time, 60s loop vs120s, unchanged spacing and Flyer/fountain clock.
- Opt-in Singapore zoom 0.75–2.5, default1. Accessible buttons/reset, scoped wheel, two-touch pinch; single-touch scrolling allowed.
- Remove listeners on gallery/pagehide/reentry; cancel pinch safely. Preserve zoom across resize/finish, reset view separately from scene time.
- Test deterministic old/new period, clamping and lifecycle; build/review/Preview, actual browser QA separate from physical touch/FPS.

## 0.5.0 requested camera drag
- Singapore-only camera orbit/translation; no scene object changes, transport2× retained.
- Primary drag/one touch rotates; shift/right drag or two-touch centroid pans; two-touch distance zooms. Capture/cancel/release cleaned. Stage owns touch gesture; page scroll outside stage.
- Keyboard arrows rotate, Shift+arrows pan, Home/basic view resets camera position/orientation/zoom. Pitch and pan bounded; defaults exact, resize/finish/pause preserve.
- Unit-test gesture transitions/cancel/cleanup and camera limits/default reset; independent review and Preview, actual touch not inferred.
