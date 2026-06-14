# 대장장이 클릭커 Project Instructions

- Keep all project-specific code, docs, assets, tests, prompts, and notes inside `projects/blacksmith-clicker`.
- Before changing gameplay, update `brief.md`, `spec.md`, or `eval.md` when the product expectation changes.
- Keep simulation rules in `app/src/gameLogic.ts`; Phaser scenes should only adapt state into rendering, animation, and effects.
- Keep text-heavy HUD, modal, inventory, and upgrade UI in React/DOM rather than Phaser canvas.
- Preserve the first-screen playable experience: no landing page before the forge.
- After metadata changes, run `corepack.cmd pnpm sync:registry` from the repo root.
- Before release, run project test and `corepack.cmd pnpm build:vercel`.
