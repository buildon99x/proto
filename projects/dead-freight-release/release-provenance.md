# Release-copy provenance

## Identity

- Public site: https://dead-freight-browser.buildon733500.chatgpt.site
- Sites version: **26**; application version: **0.15.2**.
- Sites project: `appgprj_6ac665cb5d00819197613a08a2fb6c78`.
- Successful published deployment: `appgdep_6ad83fa484b081919186be973f6f5f06` (2026-10-21).
- Sites packaging source commit: `021a28a282c05f1e08ac4a0633b1ce1409e618a0`.
- Original development repository: https://github.com/buildon99x/proto
- Original development commit: `41b16ba588bd20bdd645c3e741edd73eeb78cc57`, branch `codex/dead-freight-gunplay-v1`.
- New independently registered project: `projects/dead-freight-release`.

This copy retains all 657 original tracked project files, including source, assets, licenses, content generators, tests, and historical QA evidence. Only workspace identity and introductory documentation are changed. The historical documentation may refer to the old project path; it is retained as development history. No gameplay changes and no Sites deployment were performed.

The deployment archive was unavailable to the current file-download authorization, so this is a reproducible Git-source copy, not a claim to have downloaded that archive. Public build-manifest comparison is recorded separately below.

## Verification (2026-10-28)

- Original Git source full test suite: **1,056 PASS assertions**, exit 0; syntax checks and static build also exit 0.
- All 11 project static builds passed using installed dependencies. Launcher production build passed after deriving the new project timestamp from Git; all 27 static pages generated.
- Registry metadata validation passed for all 11 projects.
- Source integrity audit: every original tracked file retained, gameplay/build/test/assets bytes unchanged from the development commit.
- Independent review: no critical or important code findings.
- Real-device gameplay, audio listening, browser render/input and physical Android acceptance were not rerun; prior evidence is historical, not new acceptance.

### Build-tool environment

The literal `pnpm build:vercel` command was attempted but Corepack could not create its cache at `/home/agent/.cache/node/corepack/v1`. The cloud environment's `pnpm` shim also attempted dependency installation; preflight was disabled without installing anything. The `tsx` CLI then failed on its local IPC socket (`EPERM`). Its installed loader (`node --import tsx`) runs the same registry/validation scripts without that IPC server. Aggregate coverage uses each project's existing `npm run build`, copies its output to the corresponding launcher run directory, then runs the existing launcher `npm run build`. No repository build logic or dependencies were changed to work around environment tooling.

### Public manifest comparison

The public manifest was fetched on 2026-10-28. Of its 135 listed files, 99 match the local build SHA-256 exactly and 35 match after reconstructing deployment line endings (33 uniform CRLF, `index.html` LF on lines 32/91 only, `input-router.js` LF on lines 9–12 only). **`game.js` remains unresolved. This snapshot is not yet verified as the exact deployed source.** Actual asset requests returned HTTP 403; they were not retried. The public manifest evidence does not independently verify served asset bytes.

The new project's full suite also passed all 1,056 PASS assertions, followed by syntax checks and static build (exit 0).
