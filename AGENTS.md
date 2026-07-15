# Prototype Lab Monorepo Instructions

This repo is a single Git repo and single Vercel project for early production apps, prototypes, PoCs, and internal tools.

## Structure

- `launcher` is the only deployed browser site.
- `launcher` is a catalog and runner. It must discover projects through registry metadata.
- New projects must be created under `projects/{slug}`.
- Each project manages its own app code, assets, data, prompts, tests, notes, docs, and project-specific instructions.
- Project-specific assets must stay inside that project's root.
- `launcher/public/runs` is generated build output.
- `packages` is only for genuinely shared code.

## Project Instructions

- Every project root should have its own `AGENTS.md` and `CLAUDE.md`.
- Project-specific guidance belongs in the project's own instruction files.
- Root instructions apply across the repo unless a project instruction file gives narrower guidance for that project.

## Required Workflow

- Before implementing a project, write or update `brief.md`, `spec.md`, and `eval.md`.
- After project or metadata changes, run `pnpm sync:registry`.
- Before release, run `pnpm build:vercel`.

## Project Metadata

- Each `project.json` carries an explicit semantic `version` (for example `0.3.0`). Bump it when you cut a release so the launcher shows the current version.
- The launcher also shows each project's last-updated time. `updatedAt` is derived automatically from git history during `pnpm sync:registry`, so it is generated (not hand-written) in the registry.
