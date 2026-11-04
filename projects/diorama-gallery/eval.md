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

Dubai timelapse: test phase boundaries, deterministic reverse seeking, start/end seam, original-world preservation, allocation stability, instance matrices and phase-control metadata. Actual playback/visual quality and mobile performance require separate real browser review.

Timelapse initial suite32/32 passed, offline build/lint passed. A real-scene regression caught train root scaling shifting track positions; changed to per-car scaling. Original Dubai source files unchanged. Ordinary sandboxed Chromium launch exited before a page could open; no GPU bypass attempted, so real playback/pixels/FPS not verified by that attempt.
Literal pnpm build:vercel is blocked by tsx CLI IPC socket creation (EPERM /tmp/tsx-1000/*.pipe). The same registry/project build scripts are run via node --import tsx without that CLI IPC service; report their result separately. This does not establish browser rendering.
Independent review reproduced51 crescent villas incorrectly classified as vegetation and55 pedestrians as roads. The timelapse wrapper now assigns semantic names without editing original Dubai; classification regression tests cover both. Three temporary rotating cranes mark the construction period; hoist attachment regression is covered. All12 project artifacts and the Next29-page launcher built using the non-IPC loader path. Actual GPU playback remains pending.
Follow-up review: completed timelapse60s matches original Dubai100s for10,731 mesh/instance transforms (independent maximum error7.63e-7). Corrected semantic stage tags, ground-anchored vegetation and height-proportional linear architectural reveal to keep facade pieces with structural growth. Shared reducedStill/moments support now lets reduced-motion standalone viewers see the completed city and select paused stages. A temporary crane mast/collar overlap was reproduced by OBB regression and its site moved north. These checks still do not replace actual GPU viewing.
Final crane correction preserves working height until a timelapse cut at49/50/51s, avoiding descent through already completed towers during all-axis removal. Full24–52s actual-growth OBB sweep at0.25s passes. Hidden zero-scale instances are excluded from OBB tests because a singular transform yields undefined OBB rotation. First water shader compilation is seeded from current motion time, including reducedStill60 (original motion100). No new rendering claim follows from these source checks.
