# Project Instructions

This project is a **reverse-planning (역기획) teardown** of the Steam
roguelike **Stackflow** (App `3908810`) **plus a full playable clone
built from it**. `spec.md` is the buildable specification;
`notes/reverse-engineering.md` holds the source evidence and open
questions. The `app/` folder implements the complete game (spec §13
steps 1–8): engine in `app/src/engine`, tunables in `app/src/data/*.json`,
unit tests in `tests/`, browser playtest in `tests/e2e/scenario.mjs`.
Implementation-time choices are logged in `notes/decisions.md`
("Implementation pass").

When implementing, treat `[SRC]` mechanics as requirements and `[DEF]`
values as tunable defaults; validate open questions against the live game.

- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- Keep `brief.md`, `spec.md`, and `eval.md` aligned with behavior changes.
- After changes, run `pnpm sync:registry` and verify the launcher run path when needed.
