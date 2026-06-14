# Test Project Workflow

1. Run the project command in `project.json`.
2. Add smoke checks under `projects/{slug}/tests/smoke` when useful.
3. Build with `pnpm build:project -- {slug}`.
4. Verify the launcher run page at `/projects/{slug}/run`.
5. Record gaps in `eval.md`.
