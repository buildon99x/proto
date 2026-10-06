# Verification status

## Reconstructed v0.2.1 — 2026-10-06

The earlier unpushed workspace was reconstructed, backed up and restored into a fresh proto checkout. The backup manifest verified all 65 archived files, and its SHA-256 matched the saved original. The current implementation is not claimed to be byte-identical to the pre-reconstruction build.

### Automated validation

- Unit/simulation tests: PASS, 52 tests (34 model and 18 scene), no failures or skips
- Strict TypeScript (`pnpm --filter mm-wild-craft lint`): PASS
- Production game build: PASS; all three generated files are byte-identical to the verified backup build
- Source archive verification: PASS; both retained Markdown documents match original SHA-256 hashes
- Project metadata validation and registry sync: PASS; 11 projects validated and catalogued
- All 11 static project builds: PASS
- Launcher production build: PASS; 27 static pages generated, including the new project routes
- Integration repair: launcher list/detail pages now handle a project's optional `updatedAt` before its first Git history entry

The exact root `pnpm build:vercel` wrapper could not start because this execution environment rejects the local IPC socket used by the `tsx` CLI (`EPERM`). Its validation/registry scripts were run with `node --import tsx`, followed by all static project builds and the launcher production build. Those equivalent build stages passed. Existing projects' generated timestamps were preserved to avoid unrelated changes from the shallow clone.

### Manual browser gameplay

Actual end-to-end browser gameplay QA remains pending. Automated model/scene simulations do not establish completion of playtesting.

Required coverage: onboarding, first capture, camp transport and production, crafting, partner assignment, boss victory, defeat/checkpoint recovery, save/reload/import, keyboard and narrow touch layouts, and repeated modal open/close actions.

### Archive publication

The design and full response Markdown retain their original recovered hashes, including 66 numbered design sections. Public reference URLs are retained separately. Raw page HTML, post JSON, internal citation metadata JSON, private preview configuration and generated build output are excluded from this repository.
