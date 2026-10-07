# Emberwatch project instructions

- Keep app code, tests, scripts, assets, research, and design documents within this project.
- Read and update `brief.md`, `spec.md`, and `eval.md` before implementation changes; record user-visible changes in `changelog.md`.
- Keep the runtime dependency-free and use relative URLs suitable for the launcher iframe path.
- Canonical game files are in `app/src`; do not edit generated `app/dist` or `launcher/public/runs` files.
- Run `pnpm --filter emberwatch lint`, `pnpm --filter emberwatch test`, and `pnpm --filter emberwatch build` for source changes.
- After project or metadata changes run `pnpm sync:registry`; before a release run `pnpm build:vercel`.
- Treat mock-runtime checks as logic tests only. Real browser playtesting and screenshot review remain required before release-readiness claims.
- Do not introduce copied commercial art, text, names, maps, audio, or code. Keep provenance and feature limitations explicit.
- Do not add Sites deployment configuration or publish from this project unless separately authorized.
