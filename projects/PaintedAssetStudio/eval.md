# Acceptance
- Real upstream engine build and command receipts, original generated stroke logs.
- Three different sample uses; readable silhouettes, shared colors, no borrowed artworks.
- PNG integrity, RGB8/dimensions, image statistics, SHA256 and exact same-build replay checks.
- Direct visual review separately documented; correct at least one identified weakness.
- Approval gate, bounded corrections/timeouts, malformed spec rejection, reproducible CLI and README.
- Registry sync and local static gallery build; no release/deployment.

## Completed evidence
- Official unmodified engine commit: `8ee1cdd67f510a55eb6dc279e7113c593e1b282a`; Rust 1.99.0 release build, original fixed Lua hash CFLAGS, clean source check recorded.
- Actual five-tool live session: `notes/live-engine-proof/commands.json`, original proof PNG and Lua.
- Three original RGB8 samples and hash-bound assistant reviews exported. Each sample includes revision-0 observation, final PNG/Lua, engine receipts and exact replay report.
- All three final decoded RGB streams reproduce exactly with the same binary and native width. PNG integrity/dimensions/color checks pass; gallery links resolve. See `notes/delivery-checks.json`.
- Four workflow unit tests pass (input bounds, deterministic source, approval/tamper rejection, RGBA rejection).
- Direct image observations and rejected bridge/keeper renders are retained in `notes/visual-review.md` and `notes/rejected-observations/`.
- Project-only static gallery build and monorepo metadata validation pass. Registry synchronized. No production release or public deployment; global `build:vercel` is reserved for the release workflow and was not invoked.
- Remaining limits: three fixed compositions, one palette/style, at most one prepared corrective pass, opaque icons, simplified figurative anatomy, same-build determinism only. No LLM/HTTP API/alpha/character-animation implementation.
