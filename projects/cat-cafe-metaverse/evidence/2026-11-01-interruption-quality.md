# Interruption quality — reproducible local evidence

## Request and limits
User requested continued quality improvement at09:15UTC after the0.3.3 partial UX delivery. This pass targets existing source-proven defects, not new features. Cloud WebGL and authorized Mac usage limits are unchanged; no new attempt to evade them. Local simulated browser/network traces do not prove human3D play, phone behavior or actual provider performance.

## Before fixes
- Actual pointer binding:5px out/back touch movement invokes camera rotation twice although release is classified as a tap;7px movement already rotates. Two added regressions failed.
- Actual production-main VM with simulated DOM/socket boundaries: pending room switch sends action referencing old selection; held W survives new room welcome; open socket has no join-ack deadline; denied room leaves picker showing rejected destination. Existing6 tests passed while4 new tests failed.
- Help open→leave→reentry retains help-layer and input gate.
- Pure MotionTrack reproduction with solo clock: after30s hidden callback pause, render clock exceeds all samples indefinitely; new packets jump instead of restoring150ms interpolation. No authority/provider call was made.

## Intended invariant
Tap jitter must not rotate. Pending room change blocks movement/actions and resets held inputs; rejection restores the old room. Transport open is not entry success: welcome is bounded separately. Session transitions clear help. Hidden solo simulation/render work pauses; return rebases presentation only, without catch-up or newmeshes. Hidden live tabs stop periodic inputs and target a single30s socket pause, preserving only the existing short reconnect reservation; foreground inactivity never triggers this policy.

## Resource and validation scope
No schema migration, quota reset, provider diagnostic, paid resource, credential or main change. Existing public URLs remain compatible. Browser throttling may delay hidden timer execution;30s is a target, not guaranteed resource release. Resume after the existing reservation expires can return to entrance rather than preserve position.

## Final local verification — 09:26 UTC
- Frontend 138/138, including 22 executable production-main interruption traces; pointer 11/11 and motion/renderer 28/28 are subsets, not additional user sessions.
- Server 149 passed with one intentional compiled-build skip; separate actual compiled SDK WebSocket check 6/6 passed. Lint passed.
- Normal pnpm build:vercel was attempted but tsx CLI IPC listener hit local EPERM. Equivalent node --import tsx stages built all static projects and Next successfully. Final cat artifact and Next build repeated after last product edit; existing bundle-size warning remains.
- Supported local browser: renderer failure gate still works; background policy help text readable, help open→leave→welcome→Escape leaves help collapsed. No3D scene or live socket was used for this observation.
- Independent review confirmed repeated-entry deadline, fatal hidden error/manual leave, scheduled reconnect/pagehide, old events and expired-token fallback. No source blocker remains for this scoped candidate.
- Hidden30-second pause is best effort when browser executes timers; existing reconnect reservation can expire. No indefinite position, free-service-duration or provider-cost saving guarantee.
