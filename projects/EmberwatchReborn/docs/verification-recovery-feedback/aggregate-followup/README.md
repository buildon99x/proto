# Aggregate validation after authorized dependency installation

The user explicitly approved installing pnpm 9.15.4 and lockfile dependencies in the cloud environment. The historical ENOENT/missing-package results in the parent directory are superseded by this fresh successful run; their original evidence is retained.

Executed without alternate scripts:

```
COREPACK_HOME=/workspace/scratch/emberwatch-corepack corepack install --global --cache-only pnpm@9.15.4
COREPACK_HOME=/workspace/scratch/emberwatch-corepack corepack pnpm install --frozen-lockfile --registry=https://registry.npmjs.org --store-dir=/workspace/scratch/emberwatch-pnpm-store
COREPACK_HOME=/workspace/scratch/emberwatch-corepack corepack pnpm sync:registry
COREPACK_HOME=/workspace/scratch/emberwatch-corepack corepack pnpm build:vercel
```

All four exit codes were 0. Corepack cached pnpm only inside the workspace; no authentication/security changes or public deployment. Installed package versions: pnpm9.15.4, tsx4.22.4, Next15.5.19, React/ReactDOM18.3.1. Installation used the existing frozen lockfile and official npm registry.

`sync:registry` found 12 projects. `build:vercel` ran the registry script, all registered static project builds, and the launcher build. Next compiled, checked types and generated all 29 pages. Retained Vite chunk-size warnings from other projects are nonfatal; no warnings were suppressed.

pnpm emitted two empty no-dependency importers for Emberwatch/EmberwatchReborn; this generated lockfile-only addition was restored to HEAD, with no resolved version changes. The registry output changes (new Reborn entry and git-derived timestamps) are retained as `registry-generated.diff` evidence, then the generated registry source was restored to HEAD. This follow-up commits project evidence only; it does not change metadata, other projects, runtime code or a19 blocked changes.

Emberwatch build:125 payload files /16,744,302 bytes. All124 source-copy hashes and125 launcher-copy payload hashes match. Runtime main.js is byte-identical to commit82466f61fd853725ff64e7465c99b17dff62e57e. No game changes required a new full suite run; the fresh4485/4485 and focused208/208 results in the parent remain applicable to identical game source.

## Browser QA artifact and routing boundary

The built game is `app/dist/qa-r14/index.html`, copied by the aggregate build to `launcher/public/runs/emberwatch-reborn/qa-r14/index.html`. A ZIP of this exact static payload can run through an existing local HTTP server; it contains no saved profile or secrets. Native dot play, visual/audio acceptance and AX verification remain unperformed.

Existing `project.json` points the launcher iframe at `/runs/emberwatch-reborn/index.html`, but this build emits the nested `qa-r14/index.html`. Aggregate success does not validate that iframe route. This evidence-only follow-up does not silently change the entry metadata; direct browser QA must use the nested path. Public release needs separate routing review and native QA.
