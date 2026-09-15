# Project Instructions — 땅따먹기

This project is managed as an individual Prototype Lab project.

- Current stage: **prototype** — playable app in `app/` (Vite + React + TS + Canvas 2D), registered in the launcher registry via `project.json`.
- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- 게임 규칙을 바꾸면 `spec.md`의 규칙 표와 `eval.md`의 규칙 검사(R1~R6)를 같이 고친다.
- 시뮬레이션(`app/src/game/`)은 렌더와 분리해 둔다. 렌더 코드가 보드 상태를 직접 바꾸지 않는다.
- `window.__landGrab` 테스트 훅의 필드를 바꾸면 `tests/e2e/scenario.mjs`도 같이 고친다.
  온라인 쪽 훅은 `window.__landGrabNet` (`app/src/net/testHook.ts`) 이다.
- 렌더러는 `Match` 를 받지 않는다. `Scene`(`game/render.ts`)만 받고, 그 모양을
  `game/scene.ts`(로컬)와 `net/scene.ts`(온라인)가 만든다. 렌더러에 `Match` 를 다시
  끌어들이면 화면을 두 벌 써야 한다.
- 모드(`Match.mode`)와 인원(`Match.humans`)에 따라 규칙과 화면이 갈린다. 한쪽만 고치지 않는다.
- `600 × 600` 에서는 **판 전체를 훑는 코드를 새로 쓰지 않는다.** 경계 상자(`Board.boundsOf`),
  증분 집계(`Board.tilesOf`), 시야 렌더링이 그래서 있다. 자세한 내용은 `spec.md` §0.
- 온라인 세계 서버는 `server/` 에 있고 Vercel 이 아니라 **Render** 로 나간다.
  `server/` 는 pnpm 워크스페이스 밖이라 자체 `package-lock.json` 으로 npm 설치한다.
  시뮬레이션은 `app/src/game` 을 그대로 가져다 쓴다 — 서버용으로 다시 짜지 않는다.
  규약(`app/src/net/protocol.ts`)을 바꾸면 `PROTOCOL_VERSION` 을 올리고 양쪽을 같이 고친다.
  **인스턴스는 항상 하나여야 한다.** 늘리면 세계가 쪼개진다 —
  `docs/design/render-deploy.md` 를 먼저 읽는다.
- After project or metadata changes, run `pnpm sync:registry`; before release, run `pnpm build:vercel` and verify the `/runs/land-grab/` run path.
