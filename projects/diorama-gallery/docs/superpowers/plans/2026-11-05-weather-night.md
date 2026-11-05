# Weather and Night Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task.

**Goal:** Add independently selectable weather and day/night to the existing timelapse.
**Architecture:** An opt-in environment factory owns procedural sky/weather resources outside construction content. Runtime calls its tick with absolute time and current camera. UI uses runtime state setters without altering playback.
**Tech Stack:** Existing JavaScript, Three.js, Node tests, esbuild.
**Spec:** ../specs/2026-11-05-weather-night-design.md

## Global Constraints
- Preserve existing worlds and current production.
- No new dependencies, external assets or browser/GPU bypass flags.
- Only the designated formation world enables the feature.

## Review Focus
- Paused/reduced-motion stills update environment without resuming.
- Backward seeks repeat the same weather geometry.
- Camera/view changes keep celestial effects legible without changing scene bounds.
- Disabled WebGL fallback never suggests successful rendering.
- Leaving/reopening does not leak effects/listeners or inherit stale state.

## Task 1: Procedural environment
Files: app/src/timelapse-environment.js; app/test/timelapse-environment.test.mjs.
Interface: createTimelapseEnvironment({W,scene,lights:{sky,sun},profile}) returns setState(partial), getState(), tick(t,camera). State is weather clear/cloudy/rain/sandstorm and timeOfDay day/night.
- [x] Write and run failing behavior tests for all states, deterministic updates, validation, restoration and cleanup.
- [x] Implement shared clouds/rain/sand/sky, registering owned resources.
- [x] Run tests and verify no per-tick allocation growth.

## Task 2: Runtime and controls
Files: kit/world.js; scripts/build-world.mjs; app/src/environment-controls.js; app/src/main.js; app/build.mjs; app/test/environment-controls.test.mjs and runtime test.
- [x] Add failing tests for opt-in setter/stats, clock invariance, labeled UI, unavailable fallback and cleanup.
- [x] Wire optional factory, render hook and setter without changing clock anchors.
- [x] Attach same controls to gallery and generated standalone with lifecycle cleanup.
- [x] Run tests and existing playback tests.

## Task 3: Integrate and release candidates
Files: formation definition, project metadata and project documentation.
- [x] Add failing opt-in/legacy isolation regression, then enable factory only in the timelapse.
- [x] Run full project tests/build/lint, registry sync/validation and root release build.
- [x] Independently review combined diff; fix material findings with regressions.
- [ ] Commit and push designated branch, verify Preview reaches READY at exact commit.
- [ ] Test ordinary browser, accurately record GPU availability and controls.
