# Evaluation

Status: 0.2.0 development revision; final source, reports, and automated integration checks complete. Actual browser QA remains blocked.

## Known evidence limits

- Earlier browser attempts were blocked by an HTTP 502 preview route and `ERR_BLOCKED_BY_CLIENT` at localhost. The current supported private-site check reached a ChatGPT sign-in screen rather than the game; no unauthorized login was attempted. See `docs/QA.md` for the observation.
- No actual gameplay, screenshot review, mobile usability, browser performance, or end-to-end save/resume behavior has been verified.
- The runtime test harness uses mocked DOM, Canvas, input, audio, storage, and animation APIs. Passing it demonstrates selected JavaScript paths and assertions only; it is not browser test evidence.
- No completed release or commercial-game feature-parity claim is made.

## Historical 0.1.0 integration checks

- PASS: final game/data/style/index sources match the source handoff.
- PASS: JavaScript syntax checks across source, test, and build scripts.
- PASS: 600 seeded maps, class/relic/building definitions, and save defaults/versioning.
- PASS: isolated mock-runtime tests for seven class paths, six floors, equipment, guardian deaths, save/resume, and resource settlement.
- PASS: project static build, self-contained HTML generation, and launcher static-artifact copy.
- PASS: metadata validation and registry generation using the same repository scripts through `node --import tsx`.
- PASS: standalone CSS begins at `:root`, contains no `@import` or Google Fonts URL, and the generated HTML has no external script source.
- PASS: `pnpm build:vercel` with the environment adaptation below. All eleven static project builds and the launcher production build, type checks, page generation, and build traces completed successfully. Emberwatch's project and run routes were included.
- The first launcher type-check attempt failed because a new uncommitted project had no git-derived `updatedAt`. Committing the source and regenerating the registry from git history resolved it without changing launcher code or other projects.
- Existing projects' registry entries are preserved; generated UTC timestamp spelling differences are normalized back to their equivalent checked-in values to avoid unrelated churn.
- Build output, package caches, standalone output, and Sites configuration are excluded from the source commit.

## Release decision

Source integration is suitable for prototype review. Browser acceptance remains blocked and must be completed before any gameplay, device compatibility, performance, or release-readiness claim. No PR, main-branch merge, or deployment is part of this source integration.

### Environment note

The exact `pnpm sync:registry` and `pnpm build:vercel` commands initially failed because the tsx CLI's local IPC pipe could not bind (`EPERM`). For verification, the ignored local tsx executable was temporarily adapted to `node --import tsx` so the same repository script bodies could run without the CLI IPC server. No repository build scripts or dependencies were changed, and the executable was restored afterward. This is distinct from the browser access blocker above; no browser bypass was attempted.

## 0.2.0 verification

- Source handoff adds growth, rank gates, attributes, forging, elemental gear, skill orbs, combat buffering/impact, varied map topology, and legacy-map migration.
- PASS: JavaScript syntax checks for ten source/test/build files and extracted standalone code; 600-map connectivity/data checks; legacy growth migration/idempotency, skill unlock/rank gates, attribute allocation, forge value progression/rejected-upgrade non-mutation, legacy-map preservation, and topology diversity; seven-class evolved Q/E paths and six-floor isolated mock-runtime checks.
- PASS: static build, standalone packaging (including growth.js and no unresolved imports), source-byte comparison, and registry synchronization. These are automated checks, not real gameplay evidence.
- Added dedicated pure growth tests and refreshed QA/comparison reports for 0.2.0. The first found item now requires explicit Equip; returning axes can hit again on their return path. Responsive training/comparison styles and narrow-screen header layout are included, but their appearance is unverified.
- PASS: the final gameplay/CSS source passed the complete `pnpm build:vercel` pipeline using the documented tsx environment adaptation: all eleven project builds plus launcher compile, type checks, 27 static pages, and build traces. The subsequent version-meta/sign-in-report-only update was rebuilt and checked with the focused project/standalone workflow.
- This is a development revision, not release readiness. The requested real-play and visual comparison remain blocked.

## 0.3.0 evaluation plan

Re-run syntax, procedural-data, growth, runtime, visual projection/animation/atlas checks, static/standalone builds, registry synchronization and repository release build. Inspect deterministic portrait/landscape renderer evidence against the reference. These images are offscreen Canvas renders, not screenshots of player-controlled browser sessions. No 99% match or browser playability conclusion follows from them.


### 0.3.0 verified outcome

PASS: all focused syntax, data, growth, mocked runtime, projection/direction/animation/atlas checks; static build and standalone embedded-image validation; all eleven static projects, launcher type checks, 27 pages, and traces through the full `pnpm build:vercel` workflow. The existing tsx CLI IPC restriction required the same temporary ignored local shim described above; it was restored after the successful pipeline. Corepack's cache was scoped to /tmp.

The 0.3.0 offscreen images have been inspected. Browser gameplay remains untested, and the 99% visual target has not been established. GitHub blob creation was interrupted awaiting approval on 2026-10-08; source commit is local until the remote branch advances.

## 0.4.0 quality gates (work in progress)

1. Motion: sample each major action across 24 distinct poses; compare anchored contact sheets, limb motion, temporal order and silhouette. Visually identical duplicates fail.
2. Combat: damage/flash/SFX/contact VFX align within one simulation tick; misses cause no hitstop; startup cannot hit; cancellations remove pending events.
3. Fairness: fast tells target 300–450 ms, heavy tells 550–900 ms; lock tracking near final150 ms; 250–600 ms recovery; shape-consistent collision and bounded simultaneous attack pressure. These are Emberwatch tuning targets, not claims about commercial games.
4. Monster diversity: different response-required roles and phased guardian sequences, beyond palette/HP changes.
5. Regression: syntax/data/growth/runtime, new motion/encounter tests, static/standalone packaging, registry and full monorepo build.
6. Real browser: pursue supported private Site or preview route only. If access remains blocked, mark normal-control play, balance, sound, persistence, mobile and performance unverified; offscreen renders are not gameplay screenshots.

### Latest scope and sequence

Complete the Warrior first: idle, locomotion, three-hit sword chain, Whirling Axes Q, War Cry E, dodge, hurt, death, synchronized fantasy-RPG sound and impact. Preserve other existing characters, but defer new class/enemy art rollout until the Warrior passes its gates. Audio is original layered material/noise/resonance sample design rather than the former beep tones, with bounded polyphony, mix dynamics, and opt-in playback. Listening and normal-play acceptance remain separate from numerical audio and offscreen checks.

### 2026-10-08 continuation

The user authorized proceeding without usage checks for this task and reaffirmed dot’s cloud computer as the execution environment. First-Warrior acceptance remains mandatory before the next character or monster rollout. New enemy pattern definitions are retained as unactivated framework source; current expedition monsters keep their prior behavior until that gate.

### Bounded Canvas performance pass

Measure the integrated Warrior renderer offscreen, then add bounded viewport floor caching only if it addresses a measured bottleneck. Preserve depth sorting, fog reveal, frame margins and uncached fallback. Compare stationary/moving output and report CPU timing as offscreen evidence; browser60FPS acceptance remains pending.

### Final bounded renderer pass

PASS: bounded viewport floor cache and direct fallback, immediate fog/walkability/map/image/zoom/resize invalidation, camera movement/jumps and viewport coverage. Tall walls/pillars/statues/arches selectively fade where they obscure the Warrior, nearby active opponents or projected tells.

Flushed offscreen1280×800 CPU samples(120perpath): stationarymean43.54→29.94ms, movingmean42.87→27.53ms; p95stationary63.96→44.77ms, moving64.72→44.10ms. These31–36% mean reductions are offscreen measurements, not browser60FPS proof. One typicalcache1600×1120 uses6.84MiB; hardcap6millionpixels. Fractional-camera sampling meanerror<=3.50/255 in testedscenes, stationary0.0018/255. Cache rebuilds still cost time; targetdeviceperformance gate remainsopen.

Motion foot tests are local grounding checks, not world-space planting proof at game movement speed. Actual locomotion may still need gait/speed tuning. No subjective audio listening pass was possible: audio input is unsupported in this runtime.
