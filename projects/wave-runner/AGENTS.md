# Project Instructions

This project is managed as an individual Prototype Lab project.

- Keep project-specific app code, assets, data, prompts, tests, notes, and docs inside this project root.
- Do not move project-specific assets into `launcher` or `packages`.
- Keep `brief.md`, `spec.md`, and `eval.md` aligned with behavior changes.
- 스테이지 난이도를 점검할 때는 `/course-report` 를 쓴다. 절차와 함정은
  [`wave-course-analyst`](../../.claude/agents/wave-course-analyst.md) 에 적혀 있으니
  매번 다시 세우지 말 것. 에이전트 정의가 저장소 루트에 있는 이유는 하네스가 `.claude/agents/`
  만 읽기 때문이고, 스킬은 이 프로젝트 안(`.claude/skills/course-report/`)에 둔다.
- After changes, run `pnpm sync:registry` and verify the launcher run path when needed.
