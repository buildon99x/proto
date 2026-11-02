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
