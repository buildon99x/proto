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
