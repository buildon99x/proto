# Learning: 대장장이 클릭커 Setup and Verification

## What Happened

- The project generator cannot derive a slug from the all-Korean name, so the project was created as `blacksmith-clicker` and then metadata/display text were changed to `대장장이 클릭커`.
- The workspace initially had no `node_modules`; `corepack.cmd pnpm install` was required before `tsx` scripts could run.
- Sandbox network restrictions blocked package install until the command was approved.
- A sandboxed Vite build failed on an esbuild path read restriction; the same build succeeded when run with approval.
- Adding a second registry project exposed a launcher type issue: `projects.length` was inferred as tuple literal `2`, making `projects.length === 1` a TypeScript error. Assigning it to `const projectCount: number` fixed the launcher build.
- In-app browser blocked direct `file://` navigation to the built artifact, so browser e2e could not be completed in this run.

## Keep

- Use the repo `create:project` workflow when possible, then adjust metadata.
- Keep Phaser effects separate from React HUD and game logic.
- Run `sync:registry` after project metadata changes.

## Improve Later

- Add a repo-supported preview command for built static artifacts so Browser QA can run over `http://127.0.0.1` without ad hoc server setup.
- Consider code splitting Phaser if bundle size becomes relevant for launcher load performance.
