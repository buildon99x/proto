# Project Instructions — 땅따먹기

This project is managed as an individual Prototype Lab project.

- Current stage: **prototype** — playable app in `app/` (Vite + React + TS + Canvas 2D), registered in the launcher registry via `project.json`.
- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- 게임 규칙을 바꾸면 `spec.md`의 규칙 표와 `eval.md`의 규칙 검사(R1~R6)를 같이 고친다.
- 시뮬레이션(`app/src/game/`)은 렌더와 분리해 둔다. 렌더 코드가 보드 상태를 직접 바꾸지 않는다.
- `window.__landGrab` 테스트 훅의 필드를 바꾸면 `tests/e2e/scenario.mjs`도 같이 고친다.
- 인원(`Match.humans`)에 따라 규칙과 화면이 갈린다. 둘 중 하나만 고치지 않는다.
  온라인 멀티는 저장소의 `static-artifact` 제약 때문에 불가능하다 —
  `docs/design/multiplayer.md` 를 먼저 읽는다.
- After project or metadata changes, run `pnpm sync:registry`; before release, run `pnpm build:vercel` and verify the `/runs/land-grab/` run path.
