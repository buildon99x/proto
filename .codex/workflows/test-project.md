# Test Project Workflow

1. Run the project command in `project.json`.
2. Add smoke checks under `projects/{slug}/tests/smoke` when useful.
3. Build with `pnpm build:project -- {slug}`.
4. Browser playtest + screenshots: `pnpm playtest --project {slug}` (see the
   `playtest-capture` skill). Author the flow once in
   `projects/{slug}/tests/e2e/scenario.mjs`. Require PASS (0 page errors) and
   eyeball the captured screens — catches runtime bugs that `build` cannot.
5. Verify the launcher run page at `/projects/{slug}/run`.
6. Record gaps in `eval.md`.
