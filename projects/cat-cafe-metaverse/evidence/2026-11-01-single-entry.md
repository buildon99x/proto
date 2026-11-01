# Single in-flight entry — 2026-11-01

## Reproduction
Production main.js executed with simulated browser/socket boundaries: initial entry, reopen settings, press entry before welcome. Both CONNECTING and OPEN-with-join-sent paths created a second socket and closed the first (expected one). Initial tests were RED before product changes. No provider request or real duplicate-seat incident was measured.

## Correction
Reuse same-endpoint pending entry, preserve the original transport/open and welcome deadlines, and explain waiting. Disable room selection only during initial admission, with direct-handler guards. Manual Leave cancels and allows another room; established room switches remain unchanged. No server, schema, budget, credentials or dependency changes.

## Local evidence
- Frontend 142/142, including actual-main 26/26 (subset). Deadline timer identity, pending room selection, cancellation and BETA_FULL manual recovery covered.
- Server suite 149 passed / one intentional compiled-artifact skip.
- Lint passed. Normal pnpm build:vercel hit existing local tsx IPC EPERM; equivalent node --import tsx stages built all static projects and Next successfully. Existing bundle-size warning remains. Separate compiled SDK WebSocket check passed 6/6.
- Independent reviewer reran actual-main 26/26 and approved the scoped source at 12:30 UTC. Deployment receipt is recorded separately after publication.

## Limits
Main execution uses DOM/socket/renderer stubs, not human 3D play. The parent's same local Mac task failed before execution due unchanged usage limit; cloud WebGL remains unavailable. No quota-changing provider test or live join was performed. Existing free limits and current unknown remaining allowance are unchanged.
