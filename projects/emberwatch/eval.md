# Evaluation

Status: prototype; automated source/build checks passed, actual browser QA blocked.

## Known evidence limits

- Real browser QA is blocked in the current environment: the preview route returned HTTP 502 and localhost navigation returned `ERR_BLOCKED_BY_CLIENT`.
- No actual gameplay, screenshot review, mobile usability, browser performance, or end-to-end save/resume behavior has been verified.
- The runtime test harness uses mocked DOM, Canvas, input, audio, storage, and animation APIs. Passing it demonstrates selected JavaScript paths and assertions only; it is not browser test evidence.
- No completed release or commercial-game feature-parity claim is made.

## Integration checks

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
