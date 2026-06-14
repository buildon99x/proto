# Create Project Workflow

1. Clarify the project name and first useful workflow.
2. Run `pnpm create:project -- --name "Project Name"`.
3. Fill in `brief.md`, `spec.md`, and `eval.md`.
4. Implement inside `projects/{slug}` only.
5. Run `pnpm sync:registry`.
6. Run `pnpm build:vercel`.
