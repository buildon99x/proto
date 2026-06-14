# Codex Instructions

- New projects must be created under `projects/{slug}`.
- Project-specific assets must not leave that project folder.
- `launcher` must not own project-specific assets.
- `launcher/public/runs` is generated build output.
- Before implementation, write or update `brief.md`, `spec.md`, and `eval.md`.
- After implementation, refresh the registry with `pnpm sync:registry`.
- After implementation, `pnpm build:vercel` must succeed.
- Keep `packages` minimal and only for genuinely shared code.
- The launcher must discover projects through registry metadata only.
