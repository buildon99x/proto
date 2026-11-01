# Visitor journey implementation plan
> **For agentic workers:** Use executing-plans; bounded approved changes only.
**Goal:** Prevent invisible play and make recovery, reentry and cat orientation clear.
**Architecture:** Pure journey helpers, existing main event handlers and welcome/card markup.
**Tech Stack:** JavaScript, Vite, node:test; no new dependencies.
**Spec:** ../specs/2026-11-01-visitor-journey-design.md
## Constraints and review focus
No server/world edits or live calls. Test WebGL gate before side effects, yaw quadrants and zero distance, shared ambient room phase, room reset, manual throttled recheck, and immediate reentry. Parent owns real browser and release.
## Steps
- [x] Write failing journey unit and source integration regressions.
- [x] Implement journey.js and wire main.js, index.html, style.css.
- [x] Run full app tests, lint and build; request independent review.

Verification 09:04 UTC: app109/109 tests, syntax lint, Vite build passed (existing chunk-size warning). Parent handles real browser recovery review and release; no visual 3D pass claimed. ActionJourney integration retains pending across selection, 5s timeout is unknown outcome/no retry, and suppresses other-cat sound. Independent VM integration review follows.
