# Dubai Night Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add a deterministic 55–80-second Dubai night transition.
**Architecture:** Dubai-specific night scene lighting and environment wrapper, retaining the shared controls and runtime. One 90-second absolute-time loop.
**Tech Stack:** Existing Three.js 0.186.1, esbuild, Node test runner.
**Spec:** docs/superpowers/specs/2026-11-05-dubai-night-design.md

## Global Constraints
Preserve all common controls and non-formation worlds. No dependencies or security bypass. Branch/preview only; no main or production.

## Review Focus
- Default track reset must restore Dubai's authored transition, not the shared weather demo.
- User manual and edited tracks must control city lamps and sky consistently.
- Late seek must preserve the completed city through 84 seconds.
- All new emissive materials and sky objects need ownership and deterministic resets.
- Metro lamp geometry must clear train and platform envelopes.

## Task 1: Duration and city lights
Files: app/src/dubai-timeline.js, dubai-timelapse.js, dubai-night-lights.js; app/test/dubai-timelapse.test.mjs, dubai-night-lights.test.mjs.
- [x] Write failing tests for 90-second loop, completed city through 84, staged lamp fades, transit clearance and seek stability.
- [x] Implement duration, named phases, construction hold/rewind and Dubai-only build-time night materials/rail lamps.
- [x] Verify focused tests and app suite.

## Task 2: Sky and editable environment
Files: app/src/dubai-night-environment.js; app/test/dubai-night-environment.test.mjs.
Interface: createDubaiNightEnvironment(args) wraps existing environment API; createDubaiEnvironmentTrack() returns validated 90-second events. Lamp material userData.dubaiNight carries {start,end,power} thresholds against sampled night weight, not wall time.
- [x] Write failing tests for 55/80 boundaries, manual overrides, track/reset, exactly three staggered meteors, deterministic seeks and disposal.
- [x] Add camera-relative Milky Way/meteors outside content bounds; reuse base environment getters/setters and sampled weights.
- [x] Verify focused tests and app suite.

## Task 3: Integration and evidence
- [x] Update brief/spec/eval/readme/changelog and scoped version/registry.
- [x] Run app tests, build, syntax, toolkit CPU and shader checks plus release pipeline.
- [x] Obtain independent branch review, fix important regressions with failing tests, and reverify.
- [ ] Commit/push work branch, verify remote SHA, preview status and provide honest GPU limits.

Ruling: scoped feature is implemented in the existing assigned engineering task on an independent clone/branch because the requested dot workspace has no registered reusable executor. User opted out of additional design-approval questions.

Execution record: initial lamp/timeline tests failed before implementation. Sky worker observed missing-feature RED before implementation. A cross-world regression exposed Paris importing the legacy Dubai construction clock; the old 72-second export is now unchanged and only Dubai uses the new 90-second function. Focused regression observed RED then GREEN. Independent review found floating metro lamp bases, corrected with deck-connected cantilevers and a RED→GREEN structural regression. No other Critical/Important findings. No minors deferred.

Ruling: Keep legacy constructionTime as the Paris-compatible 72-second function and add dubaiConstructionTime for the extended sequence, rather than changing Paris source or shared controls. Risk if wrong: other city timelines would change; original Paris tests and direct legacy export regression pass.
