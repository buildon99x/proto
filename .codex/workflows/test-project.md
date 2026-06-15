# Test Project Workflow

**한 방에:** `pnpm verify --project {slug}` — lint → build → 브라우저 플레이테스트+스크린샷을
순차로 돌리고 단계별 PASS/FAIL 통합 리포트를 낸다(`verify-project` 스킬). 어느 단계든
실패하면 비0 종료. 평소 검증은 이 단일 명령이면 충분하다.

개별 단계가 필요할 때:

1. Run the project command in `project.json`.
2. Add smoke checks under `projects/{slug}/tests/smoke` when useful.
3. Build with `pnpm build:project -- {slug}`.
4. Browser playtest + screenshots: `pnpm playtest --project {slug}` (see the
   `playtest-capture` skill). Author the flow once in
   `projects/{slug}/tests/e2e/scenario.mjs`. Require PASS (0 page errors) and
   eyeball the captured screens — catches runtime bugs that `build` cannot.
5. Verify the launcher run page at `/projects/{slug}/run`.
6. Record gaps in `eval.md`.
