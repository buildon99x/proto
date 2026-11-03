# Quiet Solo Temperaments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task.

**Goal:** Make existing solo cats consistently recognizable through quiet action responses and room routines.
**Architecture:** A small deterministic app-only experience policy shared by preview simulation, renderer and selected-card copy. Existing authority/shared protocol and public budgets do not change.
**Tech Stack:** Existing JavaScript, Three.js, Node tests, Vite.
**Spec:** docs/superpowers/specs/2026-11-03-cafe-solo-temperaments-design.md

## Global Constraints
- Solo-only changes; no live World, authority, envelope, credentials, budget or API changes.
- Existing4s action,1.2s cooldown,2.8m range, all18 cats and nearby welcome anchors remain.
- No extra dependencies, network requests, persistent storage or geometry.

## Review Focus
- Solo→live transitions must not retain preferred-toy claims or altered live poses.
- Action switch/expiry/room changes must not leave stale profile reactions.
- Reduced motion retains action identity without decorative oscillation.
- Nonpreferred actions remain successful and useful, not punitive.
- Labels and routines must match actual shared helper state, not fabricated events.

## Tasks
1. Add app-only policy module and failing tests for stable profiles, room routine phases, preferred and nonpreferred reactions. Use deterministic functions of existing ID, room, action and elapsed time; no hidden clocks. Run RED, implement bounded policy, run GREEN.
2. Integrate policy into SoloPreview and renderer using existing geometry/physics. Add tests for action durations, bounds, clearance, speed/yaw limits, sleep-majority and stationary headings. Keep default/live code path unchanged; prove old live render expectations still pass.
3. Integrate concise selected-card clues and successful-action response. Add actual-main regressions for solo/live transitions and failed actions producing no success/audio. Correct static capacity wording. Preserve compact HUD and countdown priority.
4. Independent source review; full frontend/server/build checks; commit/push existing branch; inspect Preview exactSHA and static assets. Root coordinates actual jh play of three first cats, preferred/nonpreferred toys, room routine differences and mobile layout. Keep frame pacing/multiplayer scale gates unresolved.
