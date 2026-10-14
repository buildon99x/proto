# Implementation contract
Authority: [full specification](docs/SmashRally3D-WebGame-Spec-v1.0.read-text.md).
P0: regulation-size singles court; drag physics at 120Hz with swept collisions; shared numerical shot solver and contact rules; finite input buffer; mouse and touch; five contextual shots; constrained auto footwork and fair AI; synchronized animation/hit/SFX/VFX; five points, winner serves; pause/results/rematch/settings/tutorial; context recovery; Vercel build.
P1/P2 excluded until P0 verified.

## 0.2.0 candidate contract
- A common 17-joint weighted skin and nine full-body GLB clips replace the rigid torso-only prototype. Runtime constrained skeletal poses share motion data with export; engine clip hit-frame events drive collision windows.
- Actual 3D racket plane, finite arm length, phase and approach participate in swept contact. No shuttle Y is copied into a racket proxy.
- AI forecasts start after perception delay from noisy current position/velocity samples. Forecasts do not alter the real shuttle.
- Super Smash must beat the ordinary legal smash in speed, downward launch and flight time; impossible attacks return an explicit resolved shot/fallback reason.
