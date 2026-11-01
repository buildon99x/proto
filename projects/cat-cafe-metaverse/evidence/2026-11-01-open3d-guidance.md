# open-3d-skills application trace

Pinned source: https://github.com/Moh4696/open-3d-skills/tree/7b04ab491d5bcbd920cbffbf06ebae3f9429d8e3

| Read guidance | Applied in this existing project | Verification scope |
| --- | --- | --- |
| threejs-scene: merge static shared-material geometry; measure first | static-batch.js and one pre-animation world.js integration | Real Three CPU geometry/object graph, not GPU draw-call or FPS measurement |
| threejs-scene: prefers-reduced-motion | Live media-query preference freezes cosmetic gait/bob/oscillation, not authoritative positions or interactions | Deterministic poses and actual scene graph under stub renderer |
| site-check: successful rendering, aggregate calls/triangles and honest limitations | Whitelisted canvas data-render-ready/data-draw-calls/data-triangles/data-programs after successful rendering | Actual GPU numbers remain unavailable; no global renderer or private session exposed |
| performance: whole-frame renderer.info | info.autoReset=false, reset immediately before render includes shadow pass | Installed Three source inspected and ordering regression tested |
| site-check: blank canvas and reporting limits | Failed/context-lost renderer stops render calls and removes old diagnostics; misleading RAF-only fps removed | Two production-main RED→GREEN regressions; not actual 3D play |

## Deliberately not applied
No repository installer, external script execution, global plugin installation, new dependencies or browser security flags. No starter replacement, GTAO/bloom, 4096 shadows, automatic quality tier, new camera path, recording mode or AI assets. Existing DPR1.5, 2048 sun, colors, shadow flags, layout, calm cat authority and two remote-avatar batches retained. Shadow-removal ideas are deferred until real visual comparison is available.

## Source provenance (UTF-8 SHA256)
- skills/threejs-scene/SKILL.md: 54329406dc8d63034dd64772d9b13c9c3faa25e5ebea96c6b6a27f5d61d83c92
- skills/threejs-scene/references/performance.md: 312fc2ea639104cbc08b42806687cd6bcc00018b13cf1ae6c7617548316e8f60
- skills/site-check/SKILL.md: 7a239ccdbacb86bfc581b728bab32b6f1b8f53f40a164029cfcce58d20897ca9

## Release gates still open
Real GPU frame timing, real rendered visual equivalence, phone hardware, Safari rendering and subjective sound remain unverified in this iteration. Cloud WebGL is unavailable and the existing local Mac task has a usage limit; no alternate executor/model bypass. No live quota load or new budget balance claim.

## Measured CPU object-graph result (not GPU)
Static meshes 145 → 29 (116 fewer, 80% fewer objects); triangles stay 20,896. Material/shadow-attributed triangle totals match and world bounds match within 1e-6 metres. Nested positions, inverse-transpose normals, UVs, exact material identity and source-cache ownership are tested. Animated entities are excluded by construction.

Tradeoffs: source geometry arrays retain 93,336 bytes; merged buffers add 606,448 bytes, with a maximum temporary clone batch of 257,152 bytes. These are JavaScript typed-array counts, not measured GPU memory. Larger merged bounds reduce frustum-culling granularity; fewer mesh objects do not guarantee faster GPU rendering in every view.

## Verification
Final frontend suite 160/160; actual-main 28 and structural/policy tests are subsets. Server 149 passed with one intentional compiled-build skip. Independent reviewer directly reran 43 focused cases and found no scoped blocker. Normal build command still encounters local tsx IPC EPERM; equivalent node --import tsx stages built all static projects and Next successfully, and separate compiled SDK WebSocket checks passed 6/6. Existing large-bundle warnings remain. No provider load used.
