# Dubai Unlit Construction Correction

**Goal:** Make building-window and rail-lamp off/on states visually distinct, preserving the existing environment timeline and all other worlds.
**Base:** 17ce956aa1eb4b93a36c14e31623a14c506ca3ac.
**Scope:** Dubai-specific materials/environment and regression tests only. No common UI, main merge, production promotion or browser/GPU bypass.

- [x] Trace actual-world material intensities, rendered standard-shader uniforms and off-state surface colors at construction/night/rewind times.
- [x] Reproduce any uncovered path or missing off-state contract in a failing test before implementation.
- [x] Add explicit dark unlit fixture/window surfaces and staggered cell lighting if source evidence supports that cause; preserve independent manual/edited-track control.
- [x] Verify initial creation, late shader compilation, seek, rewind, repeat, manual switching and resource ownership.
- [x] Run full app tests/build/lint, registry/release checks and independent review.

Release step: publish only the existing candidate branch and verify its preview before reporting the URL as ready.

Do not claim a day emissive leak unless the probe proves one. A bright diffuse surface and actual emitted light are different findings; report visual limitations honestly.
