# Project Instructions

This project is managed as an individual Prototype Lab project.

- Current stage: **concept/design (기획)** — design docs only, no app code or registry entry yet.
- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- Keep `brief.md`, `spec.md`, and `eval.md` aligned with the design docs in `docs/`.
- Do NOT register this project in the launcher registry or run `pnpm build:vercel` until app code exists — registering an empty app can break the launcher build.
- When implementation starts: create the app under this root, add `project.json`, then run `pnpm sync:registry` and verify the launcher run path.
