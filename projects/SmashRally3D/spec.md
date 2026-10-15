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
