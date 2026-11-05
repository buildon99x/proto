# Timelapse Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatic editable weather/day-night tracks in both candidates, plus ancient desert construction activity.
**Architecture:** Pure absolute-time track sampling feeds the opt-in scene atmosphere and the existing runtime, while shared controls edit track data. Construction is a separate deterministic procedural module connected only to the desert formation world.
**Tech Stack:** Existing pinned Three.js, browser JavaScript modules, node:test, esbuild.
**Spec:** ../specs/2026-11-05-timelapse-story-design.md

## Global Constraints
- Existing work branches only; preserve original worlds and production.
- Existing single runtime clock governs motion, pause, seek, rate and reduced-motion.
- No new external assets or dependencies; maintain resource disposal and bounded tick work.
- No browser sandbox/GPU/network/security bypass.
- Actual visual quality is not established by CPU tests.

## Review Focus
- Editing event time across neighbors, duplicate times, removing all events, invalid data.
- Seek forward/back and loop without stale transition history or discontinuities.
- Manual override returning to auto without resetting the clock or losing edits.
- Repeated mount/dispose, failed WebGL, mobile controls and live editing focus.
- Construction routes/support contacts, absent-at-start/end equipment, no allocations per frame.

### Task 1: Automatic editable environment tracks
**Files:** app/src/environment-timeline.js (new pure model), app/src/timelapse-environment.js, app/src/environment-controls.js, opt-in runtime source under vendored .agents/skills/diorama-worlds, timelapse world definitions, related tests. Apply matching changes to both isolated candidate checkouts, without copying branch-specific worlds wholesale.
**Interfaces:** Keep setEnvironment(partial) for manual weather/day-night choices; add clearly named runtime track get/edit/mode APIs and expose immutable stats snapshots. Environment tick samples absolute t with world duration and chosen track. Pure sample returns continuous weights suitable for atmosphere blending; validation accepts only finite in-range times, known types and unique stable IDs.
- [x] Write failing tests covering default tracks, stable duplicate-time rule, invalid edits, empty tracks, no mutation, seam continuity, deterministic history independence and interpolation endpoints.
- [x] Implement model and numeric atmosphere blending (including fog, sky opacity and all effect weights). Existing explicit manual states still restore baseline clear/day exactly.
- [x] Write failing runtime/control tests for auto default, add/remove/edit, mode toggling, preservation of pause/speed/time, fallback disabled state and disposal.
- [x] Implement shared accessible editor: automatic/manual switch, current state, time/type rows, add/remove, default reset, timeline markers; manual controls remain.
- [x] Run full authored app tests, build, lint in both branches and commit only this task's changes.

### Task 2: Ancient desert construction activity
**Files:** app/src/desert-construction.js, app/src/desert-timelapse.js, app/test/desert-construction.test.mjs, related desert tests. Desert checkout only.
**Interfaces:** createAncientConstruction(W) returns roots and tick(t); dynamic roots registered before batching. Pure sampler helpers determine work interval and cart/person/lift poses. Exact internal signatures are builder decisions documented in code/tests.
- [x] Write failing CPU tests for a deterministic scaffold/cart/lift/crew setup and representative active/absent times, path/contact constraints, batch compatibility and stable allocations.
- [x] Build reusable wooden machinery, stone loads and workers staged near building sites, scaled and placed to avoid river/temple/finished geometry. No modern tower crane.
- [x] Connect absolute tick, run full authored tests/build/lint and commit task changes.

### Task 3: Integration, review and candidate release
- [x] Independent full-branch review of both branches, fix material findings and rerun affected checks.
- [ ] Update brief/spec/eval/readme/changelog and versions; sync registry and validate metadata.
- [ ] Run exact aggregate build; where environment prevents it, record failure and run allowed equivalent pipeline without security bypass.
- [ ] Verify branch-only pushes by remote SHA and create ordinary separate preview deployments; inspect build/CI outcomes.
- [ ] Use ordinary browser for reachable UI/WebGL checks; report unverified GPU quality honestly.
