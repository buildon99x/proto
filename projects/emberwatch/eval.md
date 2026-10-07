# Evaluation

Status: prototype; source and focused checks complete, aggregate verification pending.

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
- All eleven project builds passed in the aggregate run. Launcher type checking initially stopped because the newly uncommitted project had no git-derived `updatedAt`. Commit the source, regenerate from git history, and rerun before the final branch result.

### Environment note

The exact `pnpm sync:registry` and `pnpm build:vercel` commands initially failed because the tsx CLI's local IPC pipe could not bind (`EPERM`). For verification, the ignored local tsx executable was temporarily adapted to `node --import tsx` so the same repository script bodies could run without the CLI IPC server. No repository build scripts or dependencies were changed, and the executable was restored afterward. This is distinct from the browser access blocker above; no browser bypass was attempted.
