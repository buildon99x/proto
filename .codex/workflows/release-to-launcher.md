# Release To Launcher Workflow

1. Confirm `project.json` has the right status, summary, tags, entry, and docs.
2. Run `pnpm sync:registry`.
3. Run `pnpm build:projects`.
4. Run `pnpm build:vercel`.
5. Verify the launcher pages for the project.
