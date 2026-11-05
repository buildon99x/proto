# Timelapse controls implementation

Goal: Add progress and speed controls to the separate dubai formation candidate.
Architecture: Reuse runtime.stats, seek, setPaused and setSpeed; no second scene clock.
Scope: Existing gallery and standalone UI only. Original scenes and production are unchanged.

1. Add failing tests for progress, endpoints, rate changes, reduced motion, unavailable rendering and disposal.
2. Implement one opt-in playback-controls module and wire both entry points.
3. Run app tests, builds, registry/release checks and independent code review.
4. Commit and push the existing candidate branch; verify its Preview and report GPU limits honestly.
