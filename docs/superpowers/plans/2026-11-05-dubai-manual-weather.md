# Dubai Manual Weather Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans and TDD.

**Goal:** Remove Dubai timeline weather transitions without removing its automatic nightfall or manual weather.
**Architecture:** Dubai opts out through weatherTimeline:false. The existing environment sampler retains selected weather while sampling day/night; controls show only day/night track events. Existing worlds default to current behavior.
**Tech Stack:** Existing pinned Three.js, JavaScript and Node test runner.
**Spec:** projects/diorama-gallery/spec.md, Dubai manual weather only.

## Global Constraints
- Start from confirmed candidate9ad9151 on the existing working branch. Main4f97f8c remains unchanged.
- Keep manual controls, 55–80s nightfall, nightlights, 90s loop and other cities.
- No new dependencies, browser/GPU bypass, main merge or production promotion.

## Review Focus
- Selecting weather in automatic mode must not freeze an intermediate night blend.
- Returning from manual day/night to automatic must retain weather.
- Mixed legacy tracks and reset must not reintroduce weather keyframes.
- Gallery and standalone share truthful day/night-only editor labels and choices.
- Defaults for every other city remain unchanged.

## Task 1: Independent weather with day/night-only editor
Files: app/src/{timelapse-environment,dubai-night-environment,dubai-timelapse,environment-controls}.js and their existing tests.
Interfaces: optional weatherTimeline:false on Dubai definition and createTimelapseEnvironment arguments; unchanged public runtime environment APIs.
- [x] Add regression tests for clear defaults, fixed manual weather, automatic dusk continuity, manual/automatic/reset/edited track and UI event choices. Run focused tests and observe expected failures.
- [x] Add narrowly opted-in behavior and remove Dubai default weather keys. Preserve validation and source/default behavior.
- [x] Run focused and full app tests, app build/lint, registry/release checks and independent review.
- [ ] Commit and push only the candidate branch, verify exact remote commit and ready preview contents.

Ruling: validate then discard valid weather keys from legacy Dubai tracks, rather than rejecting the entire track. This preserves compatible imports while preventing hidden weather changes; malformed keys still fail atomically.
