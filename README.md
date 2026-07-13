# Prototype Lab Monorepo

Prototype Lab Monorepo is a single-repo, single-Vercel-project workspace for early production apps, prototypes, PoCs, and internal tools.

The deployed browser surface is only `launcher`. Individual projects stay encapsulated under `projects/{slug}` and are built into static artifacts only when they need to be served by the launcher.

## Structure Principles

- `launcher` is a catalog and runner, not a place for project-specific assets.
- Every project is a small standalone product under `projects/{slug}`.
- Project-specific app code, assets, data, prompts, tests, notes, and docs stay inside the project folder.
- `launcher/public/runs` is generated build output.
- `packages` is reserved for genuinely shared code.

## Create A Project

```bash
pnpm create:project -- --name "Customer Insight Dashboard"
```

The script copies `templates/vite-react-project`, updates metadata, writes a placeholder initial request, and refreshes the launcher registry.

## AI Prototype Factory

Turn a one-line idea into a documented, runnable, browser-verified micro prototype:

```bash
pnpm prototype:factory -- --name "Dragon Post Office" --prompt "용이 우체국을 운영하는 경영 게임" --offline
```

The factory creates the project under `projects/{slug}`, writes `brief.md`, `spec.md`, and `eval.md`, generates a safe data-driven React microgame, syncs the registry, builds it, and runs a strict browser scenario. When `OPENAI_API_KEY` is configured, omit `--offline` to generate the structured blueprint with the OpenAI Responses API. Model output is validated and injected as data; generated code is never executed directly.

Use `--dry-run` to inspect a blueprint without writing files, `--blueprint path.json` to use a reviewed blueprint, `--resume` to continue a failed run with the same blueprint, or `--no-verify` to skip build and browser checks.

## Run A Project Directly

```bash
pnpm --filter sample-project dev
```

## Run The Launcher

```bash
pnpm install
pnpm sync:registry
pnpm build:projects
pnpm --filter launcher dev
```

Open:

- `/`
- `/projects`
- `/projects/sample-project`
- `/projects/sample-project/run`

## Vercel Deploy

Use the repo root as the Vercel root directory. Vercel runs:

```bash
pnpm build:vercel
```

That command syncs the registry, builds static-artifact projects, copies their output into `launcher/public/runs/{project-id}`, and builds the Next.js launcher.

## Asset Encapsulation

Do not put project-specific assets in `launcher` or `packages`. Store them under:

```txt
projects/{slug}/assets/
projects/{slug}/data/
projects/{slug}/prompts/
projects/{slug}/tests/
projects/{slug}/notes/
```

## Codex Usage

Before implementing a project, write or update its `brief.md`, `spec.md`, and `eval.md`. After implementation, run `pnpm sync:registry` and verify `pnpm build:vercel`.
