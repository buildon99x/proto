# Single Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Repeated entry must not replace a pending same-endpoint admission.
**Architecture:** A client-only in-flight guard preserves the existing socket and deadline; room-selection feedback prevents silently ignored changes.
**Tech Stack:** Existing JavaScript, Node test runner, Vite/Next packaging.
**Spec:** ../specs/2026-11-01-single-entry-design.md

## Global Constraints
No server changes, provider writes, new dependencies or extra live load. Main unchanged.

## Review Focus
CONNECTING and OPEN-await-welcome; original deadline identity; room controls during admission; manual cancellation and fresh reentry; terminal error/closed socket retry.

## Task 1: Admission guard
- [x] Add actual-main failing tests in app/src/main-journey.test.js for both pending socket states; observe expected one socket versus actual two.
- [x] Add room-control/deadline/manual cancellation cases before the narrow app/src/main.js fix.
- [x] Preserve socket and timers on repeated pending entry; give explicit waiting feedback and block initial room changes only.
- [x] Run frontend suite and independent review, update evidence and metadata.
- [ ] Run required build/registry stages, commit/push branch, verify deployment/static entrypoint without live load.
