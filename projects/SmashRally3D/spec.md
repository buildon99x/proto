# Implementation contract
Authority: [full specification](docs/SmashRally3D-WebGame-Spec-v1.0.read-text.md).
P0: regulation-size singles court; drag physics at 120Hz with swept collisions; shared numerical shot solver and contact rules; finite input buffer; mouse and touch; five contextual shots; constrained auto footwork and fair AI; synchronized animation/hit/SFX/VFX; five points, winner serves; pause/results/rematch/settings/tutorial; context recovery; Vercel build.
P1/P2 excluded until P0 verified.

## 0.2.0 candidate contract
- A common 17-joint weighted skin and nine full-body GLB clips replace the rigid torso-only prototype. Runtime constrained skeletal poses share motion data with export; engine clip hit-frame events drive collision windows.
- Actual 3D racket plane, finite arm length, phase and approach participate in swept contact. No shuttle Y is copied into a racket proxy.
- AI forecasts start after perception delay from noisy current position/velocity samples. Forecasts do not alter the real shuttle.
- Super Smash must beat the ordinary legal smash in speed, downward launch and flight time; impossible attacks return an explicit resolved shot/fallback reason.

## Tactical iteration acceptance
- Contextual low-contact lift, net shot, smash defence block, drive and high-contact attack; no descending smash from below net.
- Balanced prepared front-of-body contact supports attack; rushed/stretched contact reduces options and precision with deterministic timing/course error, not random outcomes.
- Dynamic recovery covers plausible replies to the played placement; smash/net pressure invites follow-up instead of automatic retreat to fixed depth.
- Automatic shallow split step/readiness respects AI observation delay and equal physical limits.
- AI uses observed geometry and flight tradeoffs for four-corner pressure and defence; no score-dependent success rolls.
- Verify research mapping, physical flight/recovery regressions and normal browser input rally scenarios; capture new actual screenshots. Keep human/audio/device claims separate.

Forecourt follow-up: a shared interception height policy may take a descending loose shuttle up to 2.1m inside 1.8m of the net. Keep physical movement, recovery, racket collision and net clearance gates; do not enlarge net-finish eligibility or add input controls.

A weak-quality or balance<0.85 net/block uses a safety-height soft profile (vertical candidates 5–8m/s; desired flight 1.05s). This shared deterministic tuning makes a pressured loose reply physically attackable; it is prototype tuning, not a measured coaching threshold.

## Repeat-drop defence follow-up
- Preserve noisy delayed observation, existing speed/acceleration, recovery locks and real racket collisions.
- Before perceiving a new shot, actors may continue their already known recovery base; they may not anticipate the unseen trajectory.
- Evaluate low but physically legal interception contacts against the existing 0.75m hit floor, rather than rejecting all contacts below 1.05m.
- Record issued soft intentions, actual drop/net/block flights, planner reachable/unreachable/unobserved verdicts, actual returns and immediate winners per difficulty/pattern. UI measurements are distinct from precise domain scheduling.
- Direction-control changes remain a reviewed recommendation in this iteration; do not add required gestures or combine horizontal aim with existing vertical shot swipes without evidence.

Implemented prototype tuning: ground locomotion resumes 0.2s after high contact, 0.3s after Super Smash or0.1s after a low contact; the next swing still waits for the original full recovery. The same motor and forecast use these times, known-base recovery during observation delay, and split locks. Low-contact hip crouch is bounded to0.32m with existing finite arm segments; planned contacts stop at0.8m, above the unchanged0.75m collision floor. Actual horizontal velocity is capped to the existing5.8m/s limit after per-axis acceleration, eliminating diagonal transient overshoot. These are game-tuning values, not measured human biomechanics.


## Mobile input follow-up
- Process the earliest available pointer movement, with pointermove fallback; keep start aim/time and swing clock. Bound per-render catch-up to four120Hz steps globally; below30fps simulation may slow, preserving input opportunities without changing physical step size or applying a gesture-specific pause.
- Ignore secondary contacts; cancellation belongs only to the owning pointer.
- Freeze classification at the first physical hit-frame/attempt, even if that attempt misses; never rewrite an existing contact. Keep original aim/time/swing clock, and retain normal physical collision checks. No duplicate shot on release or stale gesture replay.
- Compare native MEDIUM input and actual collision results, with explicit before-contact and after-contact boundary diagnostics.

## Court framing follow-up
- Remove seating/spectator entities, rather than hiding them at a quality level.
- Fit a static, responsive perspective view to court/runoff, finite actor/racket bounds and conservative high-clear envelope; keep HUD and shot controls clear. No rally zoom/pan or ball-state camera chase.
- Preserve inverse screen-to-court tap/click aiming after resize/DPR/orientation changes.
- Record before/after real clear rallies on PC1280×720, landscape844×390 and portrait390×844. Keep all45 regressions, mobile and DROP defence. Save screenshots through official Library when available, otherwise commit original bytes and full remote SHA.

## Reference composition and articulated swing
- Replace the elevated all-flight overview with a low rear court view. Target tape around 45–59% of the landscape view, a broad blue near court, purple runoff and a substantially larger near athlete. Keep original characters, no spectator/background copying.
- Keep a fixed camera orientation and smoothly widen the lens for the current high flight and finite court/actor bounds; reset after the rally. This supersedes the prior static high-flight hull fit so a reference-like low view remains useful during ordinary contact. Portrait prioritizes complete actionable court width and controls.
- The racket orientation must change through preparation and follow-through, with an orthonormal string-plane/shaft frame and finite arm lengths. Preserve the exact existing impact pose/solver/contact gates and input clocks; preparation changes must not invent contacts or alter reach.
- Measure actual rendering/physical contact agreement, continuous phase transitions and distinct shot trajectories. Separate controlled pose captures from normal UI rally evidence.
- Hold lens return for the final 0.65s before a human interception; only visibility-required outward expansion can override it. Validate aiming by inverse projection error in pixels (0.1px mouse,1.5px native touch); integer touch dispatch on the foreshortened far court cannot imply a fixed world-distance tolerance.
