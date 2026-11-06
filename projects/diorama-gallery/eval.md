## Integrated validation evidence
See [main integration verification](docs/main-integration-verification.md) for fresh 0.11.0 results and explicit limits. Earlier sections below are historical source-branch evidence.

## Current main integration (2026-11-05)
The user explicitly requested all desert-through-Rome city dioramas merged to main. This supersedes historical branch-only and no-main constraints below for this integration. Version 0.11.0 combines the published source heads listed in docs/superpowers/plans/2026-11-05-main-integration.md and preserves harbor and Singapore. Ten entries are available, including five city-formation timelines. Unpublished Rome refinement 5d1e3ef is not included because its source is unavailable in this workspace. The merge is not a claim of 95% reference likeness or verified real-WebGL performance.

# Evaluation contract
1. Unit tests: deterministic absolute-time motion, loop seam continuity, pause/reduced-motion clock behavior, gallery data.
2. Build: pinned clean dependency install; app build; metadata validation and sync; aggregate pnpm build:vercel.
3. Browser: ordinary existing Chromium, no sandbox or GPU blocklist bypass. Verify WebGL2 availability first. If unavailable, explicitly mark visual/animation/FPS unverified; test fallback/navigation and continue static checks.
4. When WebGL works: capture actual scene thumbnail, desktop/mobile screenshots; inspect composition against reference; sample time-separated frames; test pause, reopen cleanup, reset, resize and reduced motion. Report actual frame timings, not aspirational FPS.
5. Independent code review and targeted fixes before commit/push. Verify remote branch SHA. No production promotion.

## Candidate validation — 2026-11-02
- Reference pixels: inspected locally; reference not committed.
- Scoped `npm ci --ignore-scripts`: PASS, exact upstream lock retained. Clean-CI bootstrap added because the hidden vendor package is intentionally not a pnpm workspace.
- App CPU tests: PASS (session ownership, failed/unavailable mounts, thumbnail capture disposal, deterministic/seam-safe vessel/crane motion, actual geometry bounds and hook/cargo contacts). Structure tests stub only canvas painting; they are NOT GPU/image evidence.
- App offline build and syntax lint: PASS. Gallery JavaScript ~778 KB; self-contained standalone HTML ~779 KB, before compression.
- Upstream CPU-only test attempt used a negative name regex that did not exclude browser tests as intended; the upstream helper attempted its default flags and failed before rendering at the OS socket restriction. The session was stopped when observed. Browser helper is now locally hardened (sandbox enabled, unsafe SwiftShader default excluded); CPU-only rerun uses explicit skip-pattern. No browser success inferred.
- Root `pnpm sync:registry` and exact `pnpm build:vercel`: attempted but tsx CLI local IPC socket denied (`EPERM /tmp/tsx-1000/*.pipe`). Running the same registry/validation scripts through `node --import tsx` passes. All project build/copy scripts and launcher build run independently via the non-IPC loader path; see final result below.
- Root `pnpm test`: initially failed new metadata's missing git-derived updatedAt before initial commit; resolved by committing and syncing. Rerun reaches 12 successful tasks, then existing msw-inc tsx test is blocked by the same environment IPC restriction. No claim of green aggregate test suite.
- Ordinary Chromium with browser sandbox enabled: launch blocked by OS process socket; no browser/GPU bypass applied. Local HTTP is not reachable across tool execution contexts; existing browser file URL route explicitly unsupported. Local browser animation, shader compilation, screenshot quality, mobile interaction and FPS remain UNVERIFIED.
- Independent review: addressed clean-CI install, data-driven multiple-world cards, truck/drop-zone overlap, wake height, and probing WebGL after live launch. Thumbnail capture is an actual rendered still synchronously copied before renderer disposal; no photo substitute.
- Awaiting ordinary branch Preview URL for actual browser QA. AAA fidelity is a target, not verified or claimed.

Final independent build result: all 12 project artifacts copied successfully and Next launcher production build completed (29 static pages). Authored app suite: 7/7 PASS, final offline build and syntax lint PASS.

Upstream CPU-only rerun with explicit skip-pattern: 7/7 PASS. All seven browser-output tests excluded; no browser-helper rerun.

Safety-only browser helper patch independently reviewed: sandbox enabled, unsafe SwiftShader default removed, no other upstream source changes.

## Candidate CI repair
First Preview failed because production NODE_ENV omitted vendored dev build tools (esbuild). Reproduced in a fresh temporary project: missing esbuild after setup. Scoped installer now explicitly includes dev dependencies while retaining exact lock and --ignore-scripts. `node test/clean-build.mjs` verifies a completely clean production-environment install and offline bundle; this is separate from GPU verification. Existing msw-inc underlying simulation suite passed63/63 via node --import tsx after aggregate CLI IPC blocker.

## Actual candidate observation
Candidate f13df470 built successfully through the exact Vercel aggregate pipeline. Parent inspected the ordinary cloud browser: WebGL 2 is unavailable and the app correctly displayed its fallback; no harbor pixels were rendered. This is not a visual-quality pass. Gallery/viewer fallback is now compact and Korean, explicitly labels unavailable rendering and never substitutes the reference image. Authored tests now include fallback wording and no-fake-image assertions.

## GPU round 1 and visual refinement (0.2.0 candidate)
Authorized jh-laptop browser QA succeeded for WebGL rendering. Real screenshots (full/detail) were opened by parent, implementer and scene agents. Prior visual quality FAILED the requested reference target: repeating water stripes, pale block/bargelike ships, plain cardboard and weak material/shadow depth. Movement advanced over4.85s, pause stayed steady7s, enter/reset/back/reenter passed, two console checks had no warn/error. These observations do not establish new revision performance.

Refinement addresses the observed defects with tapered hull/bridge silhouettes, paper fiber bump/exposed flute geometry, richer cargo/warehouse detail, four-crane composition, derivative-noise water/reflection approximations/feathered wakes and an opt-in harbor rendering profile. Shadows adapt2048 desktop/1024 mobile; multisampling4/2; subtle focus cannot substitute for geometry quality. Camera/background and hero size changed. References still not displayed as results. Await round2 GPU shader/appearance/performance inspection before any visual pass.

## Singapore evaluation
Run CPU structural tests for landmarks, complete-pose bounds, deterministic absolute time, loop seam and disposal. Test registry/standalone links and metadata-driven labels. Build and lint exact output, root registry checks. These are not visual/GPU verification. Actual browser review must show map base, recognizable major silhouettes, no occlusion/clipping, first-screen touch controls, gallery return/re-entry, pause/reset/finishes, mobile 390x844. Inspect fountain mouth and train rails/contact, whole-loop continuity and real frame performance. Record screenshots from real renderer only, never reference image stand-ins.

## Dubai evaluation contract
CPU: registry/standalone, landmark presence and hierarchy, narrow central silhouette, complete-pose bounds, deterministic loop and allocation stability, inherited controls. Build: full app suite and root build. Browser: parent-owned actual GPU review of desktop/mobile composition, camera, gallery cleanup, pauses, motion, shader/console and screenshots. The CPU canvas stub does not establish visual quality or GPU performance.

### Dubai candidate CPU/build review
- Reference pixels viewed locally before implementation; image is not committed.
- Baseline 25/25 tests passed. Dubai first failed for missing registry/world, then passed. Added failing regressions for reversed boat bow and train/camel overlap; corrected heading, immersed hull, camel clearance and wheel/rail contact.
- Independent reviewer measured static batching at 128 visible meshes, 5,853 instances and approximately 210,504 triangles. These are scene counts, not measured GPU performance.
- App suite, offline build and syntax checks pass. Registry validation passes. Literal pnpm invocation attempted automatic dependency installation and failed creating the unavailable default pnpm home. Equivalent node/npm pipeline built/copied all 12 projects and Next generated 29 pages successfully. Existing other-project large chunk warnings remain.
- Dubai GPU shader compilation, visual quality/reference fidelity, real frame rate and camera interaction remain pending actual browser review. No AAA completion claim.

### Dubai actual GPU round 1 and refinement
Parent's authorized Edge test rendered 0.6.0, verified controls/gallery/zoom/drag/finish, clean console and sampled moving metro/boats/fountain. Full/detail/mobile screenshots were opened locally. Visual review found excessive upper blank space, thin central tower, flat/repetitive facade detail, faint fountain and obscured Frame. Physical touch and real mobile FPS remain unverified.
0.6.1 uses an opt-in union of occupied regions for camera fit; regression started RED for missing framing support, then actual mesh corners at five poses fit the projection. Full motion bounds remain unchanged. Dubai-only mobile dimensions reduce blank canvas. Architecture/material and fountain changes need a fresh GPU review.

Independent review preserved two-sided sail glass while changing materials and aligned the occupied-region orbit pivot with screen center. Both fixes have failing-then-passing regression assertions; legacy single-box framing and pivot remain unchanged.

### Dubai 0.7 transit/environment candidate
Original reference and actual 0.6.1 desktop/detail/mobile screenshots were reopened. New requested scope replaces the foreground oval with a diagonal elevated terminal-to-terminal service. Absolute-time 60-second cycle includes eased motion, terminal dwell and return on the same continuous track; no teleport or tight oval.
Tests started RED for missing transit module and new environment/viaduct groups. New route tests cover endpoints, physical spacing, seamless time wrap, dwell and reversal. Scene tests sweep the full60s at0.1s against nine named obstacle groups and wheel/rail contact, with three inspection-camera coordinate checks. A wheel-gap assertion exposed10-sided wheel geometry not reaching nominal radius; changed to12 sides and reran. Occupied default framing, resources and allocations remain checked.
Shared pinnate crown geometry, varied trunks/shrubs/agaves, coastal sand grain/bump and small dune relief, shaded benches, station roofs/platforms/stairs and calmer small-scale sea highlights add detail without external assets. Actual GPU appearance/performance of0.7 remains unverified until parent review.
Independent review additionally swept both station fixtures with per-mesh oriented boxes over the full60s route. Initial world-axis bounds produced conservative false positives; oriented-box checks found no intersections. This stronger station-clearance test is committed. Scene census is about201 renderables and300k triangles, not a GPU benchmark.
The route was extended into the right-side city corridor (endpoint z−2.2), rather than ending at the foreground mall. Dubai Frame returns to the reference's rear-right composition with a taller outline. Aggregate skyline bounds contain empty road space, so landmark collision checks now use broad-phase bounds followed by actual per-mesh oriented boxes; the complete service passes. New imagery still required.

### Dubai0.8 reference-density evaluation
Reference and actual0.7 full/detail screenshots visually inspected. Test island anatomy, city height hierarchy, full scene bounds/projection and complete rail route. Measure source triangle counts separately from GPU performance. Actual new screenshot comparison remains required after Preview.
Independent review found redundant island crown allocations and one unsupported mid-rise. Shared crown geometry/material replaces152 unique geometries; a stepped terrace patch supports the block. Added raycasts for all22 block centers and all villa footprint corners, plus a real causeway from trunk to mainland. Villa corner regression exposed tapered-tip overhang; plots were inset and lowered to sand elevation. Two fountain clusters remain inside the lake. Latest scene census approximately271 visible renderables,10,606 instances and333k triangles, not an FPS measurement.

## Ancient river city evaluation
Check registry/standalone, landmarks and geometry bounds, deterministic boats and loop seam, no per-tick allocation, then independently review. Actual GPU composition, interactions, animations and mobile require real browser QA; test counts do not establish visual quality.

## Desert 0.9.1 screenshot-guided revision
The first actual jh-laptop Edge preview showed an overly leftward hero, hidden background pyramid, flat oval dunes and simplistic trees and bank. The follow-up adjusts camera framing and river layout, grounds the foreground temple on a rocky bank, adds sculpted dunes, grouped tree crowns, larger rigged boats, more varied settlement and a second foreground temple. New geometry, normal orientation, bank/boat clearance and sparse-frame tests are CPU evidence only; the new appearance awaits actual browser review.

## Desert 0.9.2 planned review

Changes target 0.9.1 screenshot observations; actual rendered comparison and physical-device performance remain pending.

## Desert 0.9.3 pending

Device screenshots and direct visual comparison pending; procedural miniature remains unlike photorealistic reference.

## Desert 0.9.4 pending

Independent geometry review and GPU screenshot comparison are required; no claim of photorealistic parity or measured mobile performance.

## Desert 0.9.5 candidate

Independent source and real GPU review required. Scenic view intentionally crops portions of the board; full view remains available. Photo parity and mobile performance are not claimed.

## Desert 0.9.6 candidate

Independent bank, visibility and resource review plus GPU and real touch testing required. Source changes do not establish photo-level parity.

## Desert 0.9.7 candidate

CPU angle/opacity tests pass; GPU full orbit, blending, screenshots, and mobile performance remain pending.

## Desert 0.9.8 candidate

Independent geometry, rendering and real GPU assessment required; no claim of photo fidelity or mobile performance.

## Actual desert mesh inspection candidate
The standalone inspection uses actual mesh triangles, not bounds or a reference drawing. Tests cover transforms, index modes, instances, hidden ancestors, coplanar triangles and the actual northern shrine / river / right pyramid section. The fixed t=12 section inspects 79,542 visible triangles and intersects 18 meshes. At that earlier revision it exposed a continuous ground slab underneath the water; that finding led to a subsequent geometry change. GPU visuals and responsive layout require actual browser review; local ordinary Chromium launch is blocked by process socket permissions, with no bypass attempted.

## Excavated channel candidate

The earlier channel candidate was closed-ended inside the board. CPU nominal water Y+.002, land Y−.038 and bed Y−.35 imply .352 scene units water-to-bed and .312 land-to-bed, excluding animated shader displacement. Automated geometry tests and independent review do not replace GPU visual validation.

## Integrated candidate

Excavated water/land geometry and section are retained while CC0 sandstone maps and subject view are integrated; source attribution in TEXTURE-CREDITS.md. Visual, touch and frame-timing verification remain pending.

## Open-mouth candidate

The channel, bed and two land polygons meet the board edges at Z±10. No above-bed end caps are modeled. Actual GPU end/underside, mobile and performance checks remain pending.

## Reference camera CPU review
New tests exercise real Three.js camera matrices through the runtime with GPU I/O replaced by a test-only renderer. They cover all four modes, reselection, drag/pan/zoom, capture cancellation, reset, resize, finish changes and rejection of the preset in worlds without it. Actual desert mesh projection is checked at aspects 2, 1.5, 1, .65, 4/7, .45 and .4: the main pyramid and foreground temple are fully framed, both distant pyramid tips and the river center remain visible. Existing camera values and other worlds remain unchanged. These tests do not prove GPU appearance, reference likeness, occlusion or touch-device performance.

## Raised bank and landscape candidate

The reference view smoothly changes from the prior mobile pose at aspect 1 to a lower landscape pose at 1.5, keeping portrait unchanged. Geometry checks cover stair support and collision-free water boundaries. Real GPU inspection must verify entry visibility, path continuity and visual result; portrait entry can still be occluded by the roof.

## Short-landscape accessibility verification
Generated gallery DOM and CSS contract tests cover the desert-only focus target, every scene control, 44px rules, responsive media bounds, embedded exclusion, and no scroll lock. The optional test/short-landscape.browser.mjs audits real browser layout, scrolling reachability, overflow, selectors and reduced motion at 844×390, 390×844 and 1440×900 for gallery and standalone. Local ordinary Chromium cannot launch because process sockets are forbidden, so the browser audit is not claimed as passed here. Physical mobile touch remains unverified.

## Foreground vertical slice budget and evidence

Twelve shared cliff outcrops use 20 triangles each near and 8 far (240/96 active triangles), switching as one LOD group. Reuses the existing three 256×256 CC0 sandstone maps: no new texture set; see TEXTURE-CREDITS.md. Four authored boats each contain 262 triangles including wake (1,048 total) with geometry/materials shared per world. Independent CPU census 93 mesh objects, 2,340 instances, 77,308 triangles counts both cliff LODs and excludes line draw calls, so it is not a measured GPU draw count. Automated tests sample the 120-second route at 0.1s; minimum water-bank clearance .2746 scene units and boat longitudinal gap 2.5545. The inspector intentionally renders without atmospheric fog for diagnostic clarity. Real GPU appearance, aliasing, LOD transition, actual frame time and physical touch are not verified.

## Desert formation candidate acceptance
Check all phase boundaries and midpoints, deterministic seeking, pause/resume/reset, independent instances, final-scene positions, original-world invariance and renderer batches after stage changes. Verify build and static checks. When GPU is available, record actual stages and inspect continuity, visual quality, controls and comparison with finished world. A failed WebGL runtime is not visual validation. No main promotion without explicit authority.

### Source-level review, independent Linux CPU probe
The formation runs 132 seconds: seven staged phases reach the authored final city by 119 seconds, hold, then repeat. At completion the independent reviewer compared 2,362 mesh/line instances with the original world; maximum reported Float32 transform difference was below 5e-7. Across 529 sampled formation times, ground-vertex screening reported no newly water-overlapping sampled vertices; this is not a complete triangle intersection or visual proof. A 1,000-iteration Node 24.22.1 CPU-only tick/instance-update probe on shared AMD EPYC 9V74 reported medians .686–.730 ms and p95 1.052–1.145 ms by phase; it excludes renderer, GPU, uploads and mobile device FPS. The gallery thumbnails seek to the actual final frame. Reduced motion defaults to completed frame and offers stage selection. Actual rendered playback and reference quality remain unverified.

## Timeline control acceptance
Test progress synchronization, zero and last-frame seeking without wrapping to zero, pause-on-seek, every supported rate, reduced-motion state, unavailable rendering, legacy-world exclusion and disposal. Run the full app test suite and build, registry sync and release build. CPU/DOM checks are not GPU, animation quality or touch-device evidence.

### 2026-11-05 timeline-control checks
- Full app suite: 74/74 passed; offline build and syntax lint passed. Eight new tests include generated standalone entry behavior, phase/reset synchronization, scrub-pause/resume, external speed changes and unavailable-renderer BFCache preservation.
Dubai timelapse: test phase boundaries, deterministic reverse seeking, start/end seam, original-world preservation, allocation stability, instance matrices and phase-control metadata. Actual playback/visual quality and mobile performance require separate real browser review.

Timelapse initial suite32/32 passed, offline build/lint passed. A real-scene regression caught train root scaling shifting track positions; changed to per-car scaling. Original Dubai source files unchanged. Ordinary sandboxed Chromium launch exited before a page could open; no GPU bypass attempted, so real playback/pixels/FPS not verified by that attempt.
Literal pnpm build:vercel is blocked by tsx CLI IPC socket creation (EPERM /tmp/tsx-1000/*.pipe). The same registry/project build scripts are run via node --import tsx without that CLI IPC service; report their result separately. This does not establish browser rendering.
Independent review reproduced51 crescent villas incorrectly classified as vegetation and55 pedestrians as roads. The timelapse wrapper now assigns semantic names without editing original Dubai; classification regression tests cover both. Three temporary rotating cranes mark the construction period; hoist attachment regression is covered. All12 project artifacts and the Next29-page launcher built using the non-IPC loader path. Actual GPU playback remains pending.
Follow-up review: completed timelapse60s matches original Dubai100s for10,731 mesh/instance transforms (independent maximum error7.63e-7). Corrected semantic stage tags, ground-anchored vegetation and height-proportional linear architectural reveal to keep facade pieces with structural growth. Shared reducedStill/moments support now lets reduced-motion standalone viewers see the completed city and select paused stages. A temporary crane mast/collar overlap was reproduced by OBB regression and its site moved north. These checks still do not replace actual GPU viewing.
Final crane correction preserves working height until a timelapse cut at49/50/51s, avoiding descent through already completed towers during all-axis removal. Full24–52s actual-growth OBB sweep at0.25s passes. Hidden zero-scale instances are excluded from OBB tests because a singular transform yields undefined OBB rotation. First water shader compilation is seeded from current motion time, including reducedStill60 (original motion100). No new rendering claim follows from these source checks.

## Timeline control acceptance
Cover progress/loop synchronization, scrubbing, endpoint handling, speeds, paused/reduced state, renderer-unavailable state, legacy exclusion and disposal. Run the full app suite and release checks. CPU/DOM checks do not prove GPU appearance or physical touch.

### 2026-11-05 timeline-control checks
- Full app suite: 41/41 passed; offline build and syntax lint passed. Eight new tests include generated standalone entry behavior, phase/reset synchronization, scrub-pause/resume, external speed changes and unavailable-renderer BFCache preservation.
- Independent review found the unavailable BFCache cleanup defect; a failing regression preceded the guarded-disposal fix.
- All 12 project metadata records validate. Registry sync completed through `node --import tsx` because ordinary `pnpm sync:registry` and `pnpm build:vercel` encounter this executor's existing tsx IPC socket EPERM. Only the diorama registry entry is retained to avoid unrelated timestamp churn.
- Monorepo test invocation on the desert checkout reached 13 successful tasks before existing msw-inc's tsx IPC failure canceled remaining concurrent work; direct diorama suites above passed independently. No green aggregate test/build is claimed locally.
- Actual GPU appearance, playback smoothness and physical mobile touch remain unverified.

## Weather/night acceptance (2026-11-05)
Test all eight weather/time combinations, default restoration, invalid state atomicity, deterministic seeking and stable resource identity. Test UI and runtime independence from construction time, pause/rate and reset. Exercise standalone, unavailable WebGL, gallery navigation and cleanup. Run app suite/build/lint, root sync/validation/release build and independent review. Use ordinary browser only; if WebGL2 unavailable report visuals, shader compilation and frame performance unverified. Never substitute static reference artwork or use sandbox/GPU bypass flags.

### Integrated weather/night checks
- Full diorama app suite: 99/99 PASS. Offline app build and syntax lint PASS. New tests were observed RED before implementation; night backdrop required both depth test and depth write for graphic finishes.
- Full diorama app suite: 66/66 PASS. Offline app build and syntax lint PASS. New tests were observed RED before implementation; night backdrop required both depth test and depth write for graphic finishes.
- Both runtime CPU suites: 7/7 PASS with seven GPU-output cases explicitly excluded. The full desert vendored suite was also attempted: all seven CPU tests passed; all seven browser-output tests failed at ordinary sandboxed Chromium launch with process socket EPERM. No browser/GPU bypass was used.
- Registry sync and all 12 metadata validations pass through node --import tsx. Literal pnpm build:vercel cannot start here because pnpm attempts an unavailable user-home install. Equivalent npm project builds/copies and Next launcher build pass for all 12 projects (29 static pages) in each checkout. Existing unrelated large-chunk/npm environment warnings remain.
- Root test invocation reaches 13 successful tasks then existing msw-inc tsx IPC EPERM aborts concurrent tasks; direct diorama runs above pass independently. No green aggregate test suite is claimed.
- Ordinary dot browser at the prior live candidate again reports WebGL2 unavailable. New GPU shader appearance, actual animation smoothness, physical touch and device frame performance remain UNVERIFIED.

Independent review deferred minor: desert scenic/reference horizon hills retain their unlit MeshBasic vertex-color palette at night and receive fog tint, unlike lit city meshes. Full view hides the hills. Actual GPU inspection should determine whether additional night tint is needed; no visual sign-off is claimed.

Independent source review: no Critical or Important findings; ready for Preview, not visual acceptance. Targeted 25/25 tests passed per branch. A separate actual-world CPU probe covered 72 state/aspect/zoom combinations per world and found finite in-frustum sky/moon coordinates. Shader output, blending, finish readability and physical touch remain outside this CPU evidence.

## Environment story acceptance (2026-11-05)
Test track mutations, edge/duplicate times, seamless interpolation, seek/replay determinism, manual/auto clock preservation, disposal/fallback, and bounded contact-aware construction. CPU results are not visual approval.

### Integrated story checks — 2026-11-05
- Authored app suite: 117/117 passed; offline app build and lint passed. Pure model, circular weather/particle seams, edit validation/atomicity, manual/automatic runtime invariance, stable keyboard focus, invalid drafts, deletion focus and disposal have regression coverage.
- Authored app suite: 80/80 passed; offline app build and lint passed. Pure model, circular weather/particle seams, edit validation/atomicity, manual/automatic runtime invariance, stable keyboard focus, invalid drafts, deletion focus and disposal have regression coverage.
- Vendored runtime CPU tests: 7/7 passed, browser-output tests explicitly excluded. No CPU result is described as GPU verification.
- Exact local `pnpm build:vercel` was attempted but pnpm tried to create an unavailable user-home store before building. Existing installed tools ran the corresponding registry/metadata scripts, all 12 project builds/copies and Next launcher build (29 pages). No sandbox/security setting was changed.
- Root `npm test` reached 13 successful workspace tasks, then unrelated msw-inc tsx CLI failed on IPC socket EPERM and Turbo interrupted concurrent tasks. No all-workspace pass is claimed. The underlying msw simulation passed 63 tests via the standard node --import tsx loader.
- Ordinary dot browser preflight at the existing candidate reports WebGL2 unavailable. New 3D composition, shader output, animation smoothness, mobile device performance and FPS remain unverified.
- Construction CPU checks cover actual wrist/load/cart-handle/rope endpoint contacts, stationary worksite anchors during appearance/removal, land-side cart route, history-independent poses, batching/resource stability and the unchanged completed-city geometry.

Independent final review found and resolved two P2 defects with RED→GREEN regressions: sparse event-array holes are rejected before state replacement in both candidates; desert hauling and scaffold locations were moved to raycast-verified flat ground without changing existing terrain or ecology. The completed-city comparison still passes. Full-scene foot/wheel/scaffold supports and construction clearance are checked over 136 times before and after batching. The earlier focus-loss defect was independently confirmed addressed. No P0/P1 finding was reported.

## Shared visual quality candidate
Implementation acceptance: settings validation, HDR capability and framebuffer downgrade, resource cleanup, clock/finish isolation, UI availability and standalone parity, all app tests/build, aggregate checks and independent review. Shader compilation, actual appearance and GPU/mobile performance require an ordinary supported WebGL2 browser; no safety bypass is permitted.

### Visual candidate validation — 2026-11-05
- App CPU/runtime/UI suite: 135/135 PASS; app build and syntax lint PASS. Runtime tests replace GPU/canvas I/O only; they do not certify image quality.
- Independent source review found a resize/context-restore status ordering race. Fixed with runtime visual-state subscriptions; regression passes and all app tests reran. No outstanding critical/important review findings.
- Optional isolated shader compiler: all extract/blur/output vertex+fragment pairs compile and link in surfaceless EGL 1.5 / Mesa llvmpipe OpenGL ES 3.2. Script: app/test/validate-visual-shaders.sh. Requires installed Linux libEGL/Python; no dependency download or browser/GPU bypass. Uses equivalent ES3 preamble, not full browser-generated programs; proves syntax/link only, not renderer/image/performance.
- Exact root sync:registry/build:vercel attempted but tsx CLI IPC socket creation is denied (EPERM). The same registry and metadata validators run through node --import tsx: PASS. All 12 project build/copy scripts plus Next launcher production build: PASS, 29 static pages. No unrelated project code changed.
- Exact root pnpm test attempted: 13 tasks pass; existing msw-inc tsx CLI IPC fails and turbo interrupts outstanding diorama processes. Standalone diorama suite was rerun to completion (135/135). No green aggregate-suite claim.
- Ordinary Chromium with browser sandbox enabled failed before page load at OS process-singleton socket creation. No bypass flags added. Actual browser rendering, visual appearance, touch interaction and mobile FPS remain UNVERIFIED.

Independent final review confirmed the focus-loss fix and found a sparse-array validation defect. Dense validation now rejects every hole before replacing the prior working track; model/runtime RED→GREEN regressions cover preserved state and subsequent seeks. No P0/P1 finding was reported.

## Shared visual quality integration (2026-11-05)
Run baseline, shared visual regression tests, full Dubai app suite, offline build/lint, shader validator, registry/metadata and aggregate build where available. Record CPU versus actual WebGL limits explicitly; no image-quality or FPS claim without real browser evidence.

### Dubai visual integration verification
- Baseline at 848a966b2c16942bd07198174c655bcd8441bcbd: 80/80 app tests passed. Shared controls/runtime tests failed for the missing visual APIs before integration.
- Integrated authored app suite: 98/98 passed. Offline gallery and all four standalone builds, app lint and changed-module syntax checks passed. Upstream CPU tests: 7/7 passed; browser-output tests explicitly excluded.
- EGL/GLES validation compiled and linked all extract, blur and output shaders with pinned Three r186 chunks. This checks GLSL syntax/linkage only; it is not a browser render, visual quality or performance benchmark.
- Exact registry and build:vercel commands with COREPACK_HOME=/tmp/timelapse-corepack fail at tsx IPC listen EPERM. Registry sync and all 12 metadata checks pass with node --import tsx. No security bypass was used.
- Real WebGL2 visual comparison, live interaction, material readability, bloom appearance and device FPS remain unverified for this Dubai revision. No production promotion.

- Equivalent aggregate pipeline: all 12 static project artifacts built and copied successfully; Next launcher production build generated 29 pages. Existing unrelated project large-bundle warnings remain.

- Independent narrow integration review passed: shared modules are byte-identical, Dubai camera/environment/city behavior preserved, gallery and all four standalone calls wired. No critical or important finding.
Independent source review: no Critical or Important findings; ready for Preview, not visual acceptance. Targeted 25/25 tests passed per branch. A separate actual-world CPU probe covered 72 state/aspect/zoom combinations per world and found finite in-frustum sky/moon coordinates. Shader output, blending, finish readability and physical touch remain outside this CPU evidence.

## Istanbul acceptance
Observe RED→GREEN for new registry, timeline, architecture, emission, bounds and deterministic/resource contracts. Run full app suite and release build. Compare actual scene-derived output with the reference for landmark placement/silhouettes, terrace density, bridge/island and night palette. Offline Blender renders may assist visual iteration but cannot establish browser shader quality or GPU performance; keep that limitation explicit. No fabricated similarity percentage.

### Istanbul candidate verification — 2026-11-05
- Actual uploaded reference pixels opened before authoring. Multiple actual geometry exports rendered and viewed through standard Blender EEVEE and CPU Cycles. Reference artwork is not included in the world.
- Full app suite 70/70 PASS after the current composition/lighting changes, app build and syntax lint PASS. Observed RED→GREEN includes missing world/landmarks, a Galata shaft obscured by waterfront houses, and warm point lights intersecting solid architecture. Repeated seeks, loop seam, light activation/day mode, geometry bounds and stable mesh counts are covered.
- Corrected the camera's coast direction, bridge orientation, foreground island placement, mosque proportions and courtyard orientation. Added varied terrace roofs, enlarged the mosque court/palace gates, removed distracting rear houses, pruned greenery under architecture/outside the new shoreline and moved light sources outside solids. Terrace construction precedes monuments, and water normals face upward for WebGL culling.
- Ordinary browser WebGL2 remains unavailable; ordinary sandboxed Chromium cannot launch because process socket creation is denied. No unsafe browser flags or security bypasses were used. The first standard EEVEE export succeeded, later EEVEE processes were killed. CPU Cycles completed normally. This does not establish browser shader correctness or real device FPS.
- Offline lighting, BRDF, shadows, water GLSL, atmospheric planes and postprocessing differ from the web renderer. Offline review images are not used as runtime thumbnails. Camera/mesh/material data are exported from the actual source, with no reference-image overlay.
- Initial equivalent 12-project and Next launcher build passed. Literal pnpm commands fail before work because the configured pnpm home is unavailable. A later equivalent aggregate run was killed during unrelated dragon-danmaku Vite transformation; the final diorama build passes. Root tests reach 13 successful tasks before the existing msw-inc tsx IPC EPERM, canceling pending tasks; direct msw-inc tests pass 63/63. No green aggregate local test run is claimed.
- The preview page was opened in the ordinary cloud browser: Istanbul metadata, 72-second timeline and unavailable-renderer controls appeared. Actual WebGL2 rendering was unavailable there too.
- Two limited source/visual reviews covered render ordering, night/day emission restoration, resource ownership, the final offline images and transit alignment. One tram-gauge/track-center issue was reproduced with a failing world-coordinate contact assertion and corrected. No further blocking timeline/night/disposal issue was identified; this is not a full browser audit.
- Visual acceptance remains OPEN. The scene has the reference's named landmarks, waterfront/courtyard/bridge/island structure and warm-window blue-night palette, but the exact landmark silhouettes, asymmetrical facade masses, relative placements and material finish still differ. No defined comparison metric establishes 95%, and no such numerical completion claim is made.

## Shared visual engine integration (2026-11-05)
Integrate reviewed shared opt-in HDR/Neutral/AgX/bloom/color-grade engine and Original/Soft/Vivid controls into this Istanbul candidate. Preserve every city scene, camera, environment and timeline. Default Original; non-miniature finishes retain their legacy renderer. Validate shared settings/runtime/resource tests, all city CPU tests, app build/lint and aggregate release build. GPU appearance and performance remain unverified without ordinary WebGL2.

### Istanbul visual integration validation
- Authored app tests: 88/88 PASS, including shared visual settings, pipeline, UI and runtime lifecycle tests. App offline build (gallery and five authored standalone pages) and lint PASS.
- Shared visual-settings.js, visual-pipeline.js and visual-controls.js match c944186 byte-for-byte. Existing city source, camera configuration, lighting, weather and construction timeline files are unchanged. Runtime integration preserves the older Istanbul orthographic camera API; only new visual stats snapshots are frozen.
- Vendor CPU tests: 7/7 PASS with browser-output cases explicitly excluded. An initial unfiltered vendor test attempted ordinary Chromium and failed at OS process-singleton socket creation (EPERM); no browser/GPU safety bypass. Appearance, mobile interaction and FPS are UNVERIFIED.
- Shader validator: extract/blur/output vertex and fragment stages compile and link under surfaceless EGL 1.5 / Mesa llvmpipe OpenGL ES 3.2. This checks shader syntax/link only, not actual browser rendering or performance.
- Exact pnpm sync:registry/build:vercel attempted but automatic dependency checks fail creating the unavailable user-home pnpm store. Equivalent node --import tsx registry generation and all 12 metadata validations PASS. All 12 project builds/copies and Next production build (29 pages) PASS with installed tools. No all-workspace test-suite claim.
- Independent integration review is coordinated before remote publication. No main merge or production promotion.
Independent source review: no Critical or Important findings; ready for Preview, not visual acceptance. Targeted 25/25 tests passed per branch. A separate actual-world CPU probe covered 72 state/aspect/zoom combinations per world and found finite in-frustum sky/moon coordinates. Shader output, blending, finish readability and physical touch remain outside this CPU evidence.

## Paris acceptance
Test first: registry integration, deterministic construction and reverse seeking, no frame allocations, named/bounded landmarks, snow/weather/day/night atomic validation, default illuminated night and daylight restoration, independent UI options, and legacy preservation. Run full app tests/build/lint, root metadata/sync and release checks. Independently review source and actual source-geometry offline renders. Ordinary dot browser lacks WebGL2: record fallback honestly. Offline Blender output is NOT a browser screenshot, shader proof, FPS measurement or a numeric fidelity score. Do not claim 95% without defensible verification.

### Paris implementation evidence
- Baseline 66/66 and latest full authored app suite 75/75 pass. New tests observed RED for missing Paris world/registry, snow UI options, malformed Louvre roof footprint, boat/bridge clearance, bridge apertures and coplanar river surfaces before fixes.
- Offline app build passes. Syntax checks cover all Paris modules and shared environment controls. Registry sync/validation passes using node --import tsx. Literal pnpm sync:registry/build:vercel cannot start because this executor cannot create the package-manager home /home/agent/.local/share/pnpm. Equivalent npm project builds/copies plus Next launcher build pass for all 12 projects and 29 generated pages.
- Root npm test reaches 13 successful tasks, then pre-existing msw-inc tsx IPC/socket EPERM cancels remaining concurrent work (including its parallel diorama invocation). The independent authored app run above is green; the aggregate run is not.
- Supplied reference was opened before implementation. Actual source-geometry Blender day/night inspection exposed foreground occlusion, a distorted roof helper, narrow/angular water, boat/deck overlap and coplanar river layers. Geometry, camera and placement were corrected and regression tests added where applicable.
- Offline renders use exact source meshes/materials/camera and source light settings, but Blender BRDF/lighting/postprocessing differs from Three.js; custom atmosphere/water GLSL and Points are not reproduced. These images are explicitly labeled offline/not WebGL. The result is a stylized approximation; reference-level density/ornament and 95% similarity have NOT been achieved or verified. Browser GPU appearance, shader compilation, physical touch and frame performance remain unverified on this WebGL2-unavailable dot computer.

Independent whole-branch review found no Critical issue and two Important physical-support defects: boat paths crossed three bridge piers, and eight trees were planted in water. Added a 1,000-position actual-mesh OBB bridge sweep and ground/water raycast support regressions, observed RED, then aligned bridges to a single smoothed water/boat centerline and relocated/grounded the trees. The same integration also makes headings continuous and reuses a pose without per-frame route arrays. Visual grounding of the Haussmann district was treated as a material quality defect: tested actual foundation-to-ground contact and extended plinths downward. All targeted review regressions pass. No fresh GPU claims follow from these tests.

Final reviewed source: app suite 79/79 PASS, app offline build PASS, extended syntax lint PASS; refreshed diorama copy and Next launcher build PASS. Final offline day/night renders inspect bundle SHA-256 29d6510a99b8d3e163a50e16a99695c8b6c3a19aa43103a349658328ab215b92. Bridge direction, bank-tree support and foundations are visibly improved; day emission is off and night windows/Eiffel emit. The Louvre pyramid remains visually small/partly obscured in the default view, and detailed reference fidelity remains below the requested target.

Round 2 acceptance: source-geometry day/night comparison after larger terraced Montmartre, grounded hill trees, richer landmark detail and an exposed Louvre pyramid. Ordinary Preview browser verification found a stale harbor-specific fallback/title; add failing generic-gallery copy checks before correction, then verify new Preview. Actual browser WebGL2 absence leaves animation/visual validation incomplete.

Round 2 independent review reproduced floating Louvre chimney stems and basilica entrance slabs. Both received failing actual-mesh support tests before extending stems/risers to their supports. Round 3 introduced true courtyard raycasts and multi-level roof geometry checks; a widened Louvre plaza also tests glass collision clearance against trees, lamps and visitors. Renderer-unavailable browser navigation, correct snow option and disabled controls were directly checked on the first Preview. No GPU bypass was attempted.

Round 3 independent review verified open courtyard floors at 60 points each and connected pavilion geometry. Identical dormer pediments initially created 217 district geometry/material keys; a failing batching regression preceded per-build shared-resource caching. This is source-level draw-batch evidence, not an FPS measurement.

Latest candidate checks: full authored app suite 84/84 PASS, app build PASS, extended syntax lint PASS, registry sync/12-project validation PASS, refreshed diorama artifact and Next launcher build PASS (29 generated pages). District caching reduces geometry/material keys from 217 to 50 while preserving all 6,934 district meshes. An independent canonical export comparison confirms geometry values, material values and transforms are unchanged by that cache optimization across all 14,957 exported world meshes. These are CPU/source measurements only.

Final source bundle SHA-256: 3bb8f475dceac1b17d544ec1e27e397f694f5c05d8cb0af4521378c75e28d372. Round3 daylight comparison predates a minor lamp/visitor relocation and resource caching; it is not mislabeled as the final exact bundle. Remaining visible gaps: reference-level facade ornament/urban parcel variation, street activity/detail, natural landscaping and precise landmark proportions/layout. The 95% target remains unmet and unverified.

Final detail-pass acceptance: RED-first checks for facade ornament and bounded batching; street props require actual wheel/surface contact, real obstacle clearance and no water placement. Repeat full app/build/lint and independent source/visual review before candidate update. Compare exact source geometry offline without interpreting that image as WebGL evidence.

The final detail pass has 88/88 authored app tests PASS, app build/lint PASS and registry sync/12 metadata validations PASS. New ornament tests started RED; a clearance regression caught pediments covering upper-floor glazing on short blocks, corrected by height-aware floor count/spacing. A street-fixture collision regression caught a wheel/lamp overlap, corrected by including actual fixture bounds. Independent review found no Important issue: 15 parked cars, 4 crossings and 1 bench clear architecture, planting, fixtures and each other, and timing remains road/life respectively. District counts are 13,566 meshes/53 geometry-material keys; streets 270/13. Compared with prior 6,934 district meshes/50 keys, batching stays restrained but construction instance-update work increases. GPU cost is unmeasured.

Final detail-pass comparison uses matching exact day/night bundle SHA-256 2fa5f34337aa01275b78108c4f29d61678d5f6d492187afdd7f0fbc9bd31282c, exported as 21,859 source meshes and rendered sequentially at 1200 square, CPU Cycles32. Direct viewing confirms less orange day glass, stronger masonry/window relief, visible storefronts and small road details; night keeps warm lit windows/shops. Latest refreshed artifact and Next launcher build pass. Remaining gaps are principally landmark/layout proportions, a narrower canal-like river, simplified roads/plazas/banks, regular rounded foliage and the broad pale Sacre-Coeur landing. Achieving the reference's detailed visual character would require a more faithful parcel/landmark remodel, finer foliage, and richer stone/zinc/glass surface assets, followed by actual WebGL review. No 95% fidelity or GPU-performance claim is made.

New user feedback acceptance: before changes, reproduce road/building and tree/road overlap from actual geometry. Test every road surface against projected architecture, every tree against roads/buildings/water and terrain support, and taller Eiffel bounds/completed construction. Distinct building families must affect actual silhouettes and window geometry, not labels alone. Run the full suite, independent review and exact day/night offline comparison. Do not retry blocked GitHub publication without new authorization.

Feedback-pass result: actual geometry tests first reproduced road/building, bridge/landmark and foreground block/block overlap. The shared production scene now builds architecture before planning road/bridge corridors, and plants trees only on clear, supported surfaces. Inspection counts: 14 district blocks, 5 landmarks, 12 road segments (22.53 square world units), 4 bridges, 72 trees, 29 cars and 8 crossings. Every road/bridge deck is tested against transformed building footprints; every tree is tested against roads, bridges, architecture, actual water geometry and supporting terrain. The original boat-pier regression now uses the same production composition, not a ground-only approximation.

Independent review found no Important defect. It separately swept 2,000 actual boat-route OBB poses without bridge-pier collision and verified chimney support. Eiffel top is 10.984 (previous scale 1.18, now 1.48), within 11.3 framing and 11.5 world bounds, and construction completes before 60 seconds. District variation is actual geometry: stepped townhouses and courtyard wings, three roof profiles, five window proportions including curved arches, multiple dormers and balcony rhythms. District 15,258 meshes / 42 shared geometry-material keys; streets 514 / 13. Increased instance count is not a GPU performance measurement.

Exact feedback day/night comparison: bundle SHA-256 a86e5743b213a3dcfc3280a49a64bfecfce57e30a0b5414d4000fa18b076729f, 23,599 source meshes, sequential offline Cycles CPU32 at 1200 square. Both images were opened beside the reference. The taller tower fits fully and building/window/roof variation is visible; trees and bridges read separately from architecture. Remaining visual differences include urban layout/proportions, narrow river, discontinuous road segments, sparse roof ornament, dominant round dormers on several roofs, geometric foliage and the broad pale Sacre-Coeur landing. Overview window differences are subtler than close-up geometry. No 95% similarity or WebGL appearance/performance claim is established. This feedback revision has not been published.

Final feedback verification: authored app suite 95/95 PASS after switching the river regression to production composition; app build and extended syntax lint PASS; registry sync and all 12 project metadata checks PASS; refreshed diorama artifact and Next launcher build PASS with 29 generated pages. Unrelated generated timestamp churn was discarded. Existing environment limitations for literal pnpm commands and aggregate monorepo tests remain as documented above. Neither GitHub nor Vercel was changed in this feedback pass.

## Paris shared visual integration validation contract
Start at published c87113b, preserving the latest Paris feedback geometry. Run the baseline and final app CPU suite, offline build and syntax lint, the common settings/pipeline/runtime/UI tests, kit CPU-only tests with browser examples excluded, isolated shader compile/link, metadata/registry checks and the entire 12-artifact plus Next launcher build. Compare changed paths to the published base and preserve unrelated registry timestamps. Actual browser WebGL2 appearance, screenshots and performance remain unverified: cloud WebGL2 is unavailable and local Chromium is blocked at OS sockets. Do not bypass these restrictions.

### 0.10.0-paris-timelapse.visual.1 results
- Published-base app suite PASS 95/95. Visual runtime/UI tests were observed failing before integration because the API and controls were absent. Final full app suite PASS 113/113, including independent reviewer rerun. App offline build and extended syntax lint PASS.
- Kit CPU suite PASS 7/7 with the seven browser-output cases excluded explicitly; no browser helper was launched for this integration. Extract, blur and output shaders compile and link under isolated EGL GLES 3.2 Mesa llvmpipe with the pinned Three color helpers. This is GLSL compiler evidence, not Three WebGL rendering or performance evidence.
- Exact pinned scoped dependency setup PASS using the permitted temporary npm cache. Literal corepack pnpm sync:registry and build:vercel were attempted with the supplied Corepack cache and blocked at tsx CLI IPC sockets (EPERM). The equivalent node --import tsx registry/validation/build-project pipeline built and copied all 12 artifacts, then the launcher Next build PASS with 29 generated pages. Existing unrelated large-bundle warnings remain.
- Every existing scene, geometry, environment, timeline, world-list and camera-control source file is byte-identical to published c87113b. The three common visual modules are byte-identical to reviewed c944186. All five existing standalone builds include the same optional controls, while their original zoom/playback/environment options are preserved. Registry changes are restricted to the diorama entry.
- Independent review found no Critical or Important defects. Ordinary cloud WebGL2 remains unavailable and local Chromium has the previously established OS socket blocker. Actual Original/Soft/Vivid images, interactive browser behavior, physical touch, real GPU/mobile performance and 95% reference fidelity are not verified. No browser/GPU restrictions were bypassed; no push or deployment was performed by this integration task.
Independent source review: no Critical or Important findings; ready for Preview, not visual acceptance. Targeted 25/25 tests passed per branch. A separate actual-world CPU probe covered 72 state/aspect/zoom combinations per world and found finite in-frustum sky/moon coordinates. Shader output, blending, finish readability and physical touch remain outside this CPU evidence.

## Rome evaluation contract
Test actual scene geometry and landmark groups, bounds, river/boat clearance, formation determinism/seams, complete instance transforms, no allocation growth, night emissive states, all four weather/two light combinations, and disposal. Run app suite/build/lint, registry and full release build, independent review, verify remote SHA and preview deployment. Offline Blender geometry renders are composition evidence only, not WebGL shader/performance or a 95% match. Ordinary browser GPU limitations stay explicit; no bypass flags.

### Rome candidate result
See docs/rome-verification.md. App suite 81/81 and toolkit CPU suite 7/7 pass. App build/lint and non-IPC equivalent full release pipeline pass; literal pnpm release/aggregate test commands retain the environment's tsx IPC blocker. Independent review fixes cover orbit clipping, boat reversals/passing lanes and phase duration. Offline night/day geometry renders were inspected and labeled distinctly from browser output. The 95% visual target and real WebGL validation remain OPEN; this branch is a candidate, not a visual acceptance pass.

## Published Rome common visual integration (2026-11-05)
Integrate reviewed common engine c944186 onto published Rome be19f617 only. Preserve all authored geometry, opt-in orbitFit/framingProjection, night defaults, independent weather, and scene lists. Original remains default; HDR, Neutral/AgX, threshold bloom and grading are opt-in through Korean shared controls. Validate full app CPU suite, build/lint, shader compiler where available, registry and equivalent aggregate build. Real WebGL pixels and performance remain unverified. No unpublished Rome refinements or production promotion.

### 0.10.0-rome.visual.1 validation results
- Full authored app suite PASS 99/99 (baseline 81 plus 18 common visual cases); app build and syntax lint PASS. Common standalone fixture adjusted only from five to six published scenes.
- Kit CPU tests PASS 7/7 with explicit browser-case skip pattern. Initial full kit invocation also attempted seven browser cases, all blocked before rendering by OS socket EPERM/read-only Chromium config; no security bypass or browser retry used.
- EGL GLES 3.2 Mesa llvmpipe compile/link PASS for extract, blur and output shaders. This is isolated GLSL validation, not Three WebGL render or visual/performance evidence.
- Exact pinned scoped setup PASS. Registry sync and all 12 metadata validations PASS through node --import tsx. Literal corepack pnpm failed because its default package cache directory is unavailable. Equivalent pipeline built/copied all 12 projects and built launcher successfully, generating 29 pages. Existing unrelated large-chunk warnings remain. Unrelated generated timestamp churn was excluded.
- Published Rome/Dubai/Singapore/harbor scene sources are byte-identical to be19f617. All visual modules match reviewed c944186. Rome orbitFit, framingProjection, weatherOptions and night defaults retained; no unpublished Rome refinement files incorporated.
- Actual WebGL pixels, Original/Soft/Vivid comparisons, browser interaction and real GPU/mobile performance remain unverified.

## Dubai evening transition (2026-11-05)
Only Dubai formation changes: smooth day-to-night 55–80 seconds, staggered building/metro lighting, Milky Way and three deterministic meteors. Preserve common controls and other worlds. 90-second loop holds night at 80–84 and rewinds at 84–90. Design and validation plan: docs/superpowers/plans/2026-11-05-dubai-night.md. GPU visuals/FPS require actual WebGL evidence.

Final Dubai evening candidate: app suite 201/201 PASS, kit CPU 7/7 PASS, app build/lint and all source syntax PASS, new sky and existing postprocess isolated shaders PASS. Equivalent 12-project release pipeline and final Next launcher build PASS. Literal root release and aggregate tests retain the existing tsx IPC blocker. Independent review lamp-support finding fixed with RED→GREEN regression; Paris legacy timing regression fixed and verified. Actual WebGL images/FPS remain unverified. Full evidence: docs/dubai-night-verification.md.

## Dubai unlit construction correction (2026-11-05)
User feedback: buildings appear already illuminated while forming. Verify the actual candidate material and shader path; ensure explicit unlit facade and lamp surfaces during day, then distinct staggered night lighting. Keep the editable environment track and manual day/night authoritative, and preserve other scenes. Regressions must cover backward seek, replay, rewind and remount. Visual acceptance remains separate from CPU evidence when WebGL is unavailable.

## Dubai manual weather only (2026-11-05)
Remove automatic weather changes from Dubai formation only. Weather stays clear by default and remains at the user's manual selection across playback, seeks, loops, day/night mode changes and track resets. Preserve the 55–80s day-to-night sequence, 80–84s hold, night lights/sky and 90s loop. Dubai's editor contains day/night events only and labels its mode accordingly; existing other-city behavior and static Dubai remain unchanged. Validate both environment state and the actual shared UI integration before preview publication; do not merge main or claim unobserved WebGL pixels/FPS.


## Courtyard estate reference (2026-11-06)
Final checks: 216/216 app tests passed, app build/lint and syntax checks for all three new source modules passed. The 7 estate-focused tests cover registration, actual architecture/garden meshes, finite bounds, deterministic seeks/loop, bounded batching, building/pond clearance, connected rear/front corridor graphs, and nonoverlapping paving intersections. Independent review identified planting collisions and corridor gaps; both were corrected and re-reviewed.

Registry synchronization and metadata validation passed. All 12 static project builds and the launcher Next.js production build (29 generated pages) passed. The standard pnpm registry wrapper is blocked by the environment's `tsx` CLI IPC socket restriction, so the same TypeScript scripts were executed with `node --import tsx`; the final changed diorama artifact was rebuilt/copied and the launcher rebuilt after geometry fixes.

Ordinary Chromium could not launch: socket() failed / Operation not permitted, including the approved non-bypass retry. The connected cloud browser refuses file: URLs. No sandbox or GPU bypass was used. Thus actual WebGL pixels, GPU FPS, browser interaction and mobile visual appearance remain unverified.

The actual implemented meshes and original material colors were rendered at t=12 in Blender CPU mode and visually inspected, distinct from the live renderer. This caught coplanar paving at crossings, corrected with one shared tile grid and a regression test. The final CPU geometry review is stored in assets/estate-verification and is never substituted for the gallery's actual paused-world thumbnail. Main hall/gate/pond/bridge/corridor composition is recognizable; foliage and roof treatment remain a stylized interpretation, not an asserted numeric likeness.
