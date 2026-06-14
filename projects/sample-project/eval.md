# Evaluation

- `pnpm --filter sample-project build` succeeds.
- `pnpm build:projects` copies the Vite output to `launcher/public/runs/sample-project`.
- `/projects/sample-project/run` displays the built sample project in an iframe.
