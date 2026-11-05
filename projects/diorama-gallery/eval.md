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
- Independent review found the unavailable BFCache cleanup defect; a failing regression preceded the guarded-disposal fix.
- All 12 project metadata records validate. Registry sync completed through `node --import tsx` because ordinary `pnpm sync:registry` and `pnpm build:vercel` encounter this executor's existing tsx IPC socket EPERM. Only the diorama registry entry is retained to avoid unrelated timestamp churn.
- Monorepo test invocation on the desert checkout reached 13 successful tasks before existing msw-inc's tsx IPC failure canceled remaining concurrent work; direct diorama suites above passed independently. No green aggregate test/build is claimed locally.
- Actual GPU appearance, playback smoothness and physical mobile touch remain unverified.
