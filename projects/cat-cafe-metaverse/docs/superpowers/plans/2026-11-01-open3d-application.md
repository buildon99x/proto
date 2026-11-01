# Open 3D Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Apply safe pinned 3D guidance to the current café without redesign or extra live cost.
**Architecture:** Static geometry batching, presentation-only motion preference, successful-render diagnostics. Existing authority and dependencies stay unchanged.
**Tech Stack:** Three.js 0.172, JavaScript, Node test runner, existing Vite/Next build.
**Spec:** ../specs/2026-11-01-open3d-application-design.md

## Global Constraints
No external scripts/installers, new dependencies, lighting/shadow policy changes, server or quota changes, main merge, GPU flags or local quota bypass.

## Review Focus
Nested transforms/normals/UVs; material/shadow separation; animated objects excluded; reduced-motion changes while active; failed/context-lost rendering never claims FPS.

## Tasks
- [x] room_server: test then implement static-batch.js with world-space geometry preservation and measured graph/memory receipts.
- [x] cafe_frontend: test then integrate static batching and reduced-motion cosmetics in world.js; preserve action/position feedback, add safe aggregate render diagnostics and successful render return.
- [x] integration: production-main RED test for renderer-failed/context-lost RAF work and misleading FPS, then minimal guard.
- [x] Independent review, full frontend/server/build validation; document guideline-to-change mapping and unsupported real-GPU checks.
- [ ] Commit/push existing branch, verify Preview and stable static entrypoint, no live load.
