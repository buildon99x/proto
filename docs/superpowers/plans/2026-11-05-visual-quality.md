# Shared Visual Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add opt-in HDR, bloom and color controls without changing existing worlds.
**Architecture:** Separate settings and GPU pipeline modules integrated narrowly into world.js; one shared UI for gallery and standalone.
**Tech Stack:** Existing pinned Three.js 0.186.1, esbuild, Node test runner.
**Spec:** docs/superpowers/specs/2026-11-05-visual-quality-design.md

## Global Constraints
No new dependencies, security bypass, city branch overwrite, main merge or production promotion. Preserve clock, camera, finish and resource ownership. Defaults Original. One output conversion.

## Review Focus
- Corrupt and non-finite settings must not reach shaders.
- Unsupported/incomplete float framebuffers must recover to Original.
- Resize and context restore must not retain stale resources or MSAA choices.
- Pixel/halftone/blueprint retain exact legacy path.
- Settings while paused, on repeated gallery entry or reduced motion do not restart time.

## Task 1: Settings and budget resolution
Files: kit/visual-settings.js; app/test/visual-settings.test.mjs.
Interfaces: normalizeVisualSettings(partial, previous), VISUAL_PRESETS, resolveVisualProfile(settings,width,finish,capabilities).
- [x] Write failing tests for legacy default, immutable presets, clamp/validation, mobile budgets, finish gating and float fallback.
- [x] Run tests and observe missing implementation failure.
- [x] Implement pure settings and profile functions.
- [x] Verify focused tests and suite.

## Task 2: HDR pipeline and runtime
Files: kit/visual-pipeline.js, kit/world.js; app/test/visual-pipeline.test.mjs, visual-runtime.test.mjs.
Interfaces: createVisualPipeline(renderer) with configure(settings,effective,width,height), render(scene,camera), dispose(), resetCapabilities(), capabilities(); runtime getVisualSettings/setVisualSettings/stats.visual.
- [x] Write failing tests for actual target types, pass order, no output double transform, bloom pass skipping, sample fallback and cleanup.
- [x] Implement explicit final shader and capability-aware resources.
- [x] Integrate narrow render/resize/dispose hooks and test unchanged time and finishes.
- [x] Verify full app tests/build/lint.

## Task 3: Controls and documentation
Files: app/src/visual-controls.js, main.js, build.mjs, build-world.mjs, UI tests, project docs/metadata.
- [x] Build accessible shared controls tests-first in independent worker; exact settings contract shared.
- [x] Validate disabled state, keyboard labels, presets, changes and cleanup.
- [x] Update docs and integration instructions; run registry, aggregate tests/build.
- [ ] Independent review, targeted regression fixes, commit/push, verify SHA and candidate build. Inspect safe browser if available; state GPU limits honestly.

Execution record: settings and pipeline tests observed RED before implementation, then GREEN. Runtime and visual-state subscription regressions observed RED→GREEN. UI worker reported the same test-first cycle. Independent reviewer found the status notification race and it was fixed with regression coverage. App 135/135; shader compile/link, app build/lint and equivalent full build pass. Exact root CLI and ordinary browser limits are recorded in project eval.md. Candidate push/deployment status is recorded separately after verification.
