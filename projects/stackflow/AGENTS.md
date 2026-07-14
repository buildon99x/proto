# Project Instructions

This project is a **reverse-planning (역기획) teardown** of the Steam
roguelike **Stackflow** (App `3908810`). Goal: capture enough to build a
mechanically identical game. `spec.md` is the buildable specification;
`notes/reverse-engineering.md` holds the source evidence and open
questions. The `app/` folder is still the template — implementation has
not started (build order is `spec.md` §13).

When implementing, treat `[SRC]` mechanics as requirements and `[DEF]`
values as tunable defaults; validate open questions against the live game.

- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- Keep `brief.md`, `spec.md`, and `eval.md` aligned with behavior changes.
- After changes, run `pnpm sync:registry` and verify the launcher run path when needed.
