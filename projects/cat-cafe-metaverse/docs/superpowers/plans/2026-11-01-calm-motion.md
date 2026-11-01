# Calm Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Smooth player presentation and mostly resting, believable cats without extra realtime cost.
**Architecture:** Separate authoritative snapshots from a bounded render timeline; camera and local avatar share one displayed pose. Shared deterministic ambient policy drives live/solo cats without protocol changes.
**Tech Stack:** Existing Node24, Three.js0.172, native tests, Vercel/Redis unchanged.
**Spec:** ../specs/2026-11-01-calm-motion-design.md

## Global Constraints
- Existing wire/checkpoint schema, collision/layout, player speed, action ownership and six-seat beta stay intact.
- No new dependencies, paid resources, quota reset, higher network/tick frequency or main merge.
- Last working public URL remains intact; bounded live QA only after local gates.

## Review Focus
- Irregular packet arrivals and30/60/120FPS must not produce camera/player relative jumps.
- Room/reconnect/hidden-tab transitions must clear stale interpolation history.
- Stationary cats must not rotate or endlessly walk; rare transitions remain valid and bounded.
- Old checkpoints and mixed immutable candidate readers must remain compatible.
- Interaction/ball/cooldown correctness and CPU/wire budgets must not regress.

### Task1: presentation timing (frontend worker)
Files: app/src/world.js, main.js, new pure motion helper/tests.
- [x] Reproduce camera snapshot-step/fixed-alpha/gait pulse with deterministic traces.
- [x] Implement bounded snapshot interpolation and shared displayed camera/local pose; velocity-based gait hysteresis.
- [x] Test irregular timing, FPS invariance, stop/largegap/room reset and crowd batch preservation.

### Task2: ambient cats (server worker)
Files: shared ambient module, server/world.mjs, app/src/preview.js, matching tests.
- [x] Reproduce continuous orbit and unstable stationary yaw.
- [x] Define shared deterministic ambientPhase(id,nowMs) contract with frontend; mostly sleep/rest and rare bounded walks.
- [x] Preserve custom homes/schema; migrate only exact legacy-grid idle/unowned cats once to validated catalog spots. Test checkpoint takeover idempotency, active-action deferral, floor/doorway clearance and interactions.
- [x] Test quiet-time fraction, stagger, solo/live parity, lease/ball/cooldown and baseline CPU/wire comparison.

### Task3: integrate and verify (owner)
- [x] Update brief/spec/eval and release version; restore locked dependencies without secrets.
- [x] Independent review, full tests, project build, registry sync and full build:vercel attempt.
- [x] Supported browser render/control checks if available; otherwise explicit visual limitation.
- [x] Commit/push branch, verify candidate CI and bounded actual public flow without quota reset; preserve old link.

### Task4: mixed-version rollout
- [x] Review old immutable Lua fail-closed version guard and atomic envelope migration contract.
- [x] Implement post-build-only branch-scoped migration, private readback preservation, metered idempotence and legacy rejection tests.
- [x] Publish inactive compiled candidate; migrate actual provider once with nonsecret receipt; enable improved candidate.
- [x] Measure actual snapshot cadence and validate targeted public flow before delivery.
