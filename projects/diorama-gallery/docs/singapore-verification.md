# Singapore 0.3.0 candidate verification

2026-11-03, dot cloud workspace. Base: harbor round2 commit46f327e74a9574dc6cc6f1caeb3b45ceed821802. Harbor round3 is not included.

- Supplied Singapore reference image was actually opened and visually inspected, not used as a scene texture.
- Baseline authored suite14/14. New scene existence and world registry tests failed before implementation. Static/dynamic batch regression failed before kernel change; arc-length route test failed before route implementation.
- Final authored suite19/19: scene build/bounds, deterministic seek/seam, all eight landmarks, no tick scene allocation, train/temple clearance across240phases, constant rail gauge and car spacing, wheel height, bow direction/water intersection, static instance upload separation, existing harbor/session/fallback tests.
- App build, syntax checks and lint passed. All output is offline, original procedural geometry and texture, no external image/model runtime requests.
- Root registry sync/metadata validation passed through node --import tsx. Literal pnpm sync:registry/build:vercel is blocked in this cloud executor by tsx IPC socket EPERM. Equivalent scripts are run with node --import tsx and ordinary per-project build commands; final launcher result recorded by parent.
- Initial dependency bootstrap hit missing home cache; retried with caches in /tmp, no project dependency changes.
- Review found train collision/spacing/gauge and boat direction/height defects. Corrected using an exact arc-length stadium route, constant normal gauge, matching wheel/rail height, temple relocation, bow orientation and immersed keel.
- Singapore opts into static architecture batching. Default harbor behavior stays unchanged. CPU structural tests establish upload behavior, not mobile frame rate.

Pending: actual WebGL screenshot inspection, desktop/mobile layout/interaction, full-loop train/boat/Flyer/fountain observation, actual GPU performance, reference likeness judgment. No AAA or production-readiness claim. No public deployment or main promotion from this worktree.
