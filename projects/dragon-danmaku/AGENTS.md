# Project Instructions

This project is managed as an individual Prototype Lab project.

- Current stage: **prototype** — design docs in `docs/` + a playable app in `app/` (Vite + React + TS + Phaser), registered in the launcher registry via `project.json`.
- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- Keep `brief.md`, `spec.md`, `eval.md`, and `changelog.md` aligned with behavior changes.
- After project or metadata changes, run `pnpm sync:registry`; before release, run `pnpm build:vercel` and verify the `/runs/dragon-danmaku/` run path.
