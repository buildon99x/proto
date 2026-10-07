# Emberwatch: Crown of Cinders

An original, dependency-free Canvas 2D solo dungeon-crawler prototype. Choose a hero, explore six generated floors, gather equipment and relics, fight three guardians, and rebuild a persistent refuge.

**Status: development checkpoint, version 0.2.0. Actual browser gameplay and visuals remain unverified.** See [eval.md](./eval.md) for evidence and blockers.

## Run and build

From the repository root:

```sh
pnpm --filter emberwatch dev
pnpm --filter emberwatch lint
pnpm --filter emberwatch test
pnpm build:project -- emberwatch
pnpm --filter emberwatch standalone
```

The development server listens on port 4173 by default (`PORT=4174` to override). The launcher build places the game at `/runs/emberwatch/index.html`; the launcher run page is `/projects/emberwatch/run`. The standalone command generates `app/dist/Emberwatch.html`. Build output is ignored by Git.

The project itself has no npm dependencies. Direct use from `projects/emberwatch/app` also works with Node.js:

```sh
node scripts/build.mjs
node scripts/serve.mjs
node tests/data.test.mjs
node tests/runtime.test.mjs
```

## Controls

- WASD / arrow keys: move; mouse: aim; hold left click: attack; J: nearest-target attack
- Space: dodge; Q/E: class abilities; F: interact; R: potion
- Tab: inventory; Escape: pause
- On-screen touch controls are experimental and have not been tested on a real device

## Source and evidence

- `app/src/`: HTML, styles, definitions/map generation, and game runtime
- `app/scripts/`: static build, preview server, standalone packager, and syntax check
- `app/tests/`: deterministic data tests and isolated mock-runtime checks
- `brief.md`, `spec.md`, `eval.md`: goals, implementation contract, and verification status
- `docs/QA.md`: the source-stage test record and manual acceptance checklist
- `docs/review.html`: Korean feature-by-feature comparison and research sources (also built as `/runs/emberwatch/review.html`)
- `docs/source-notes.md`: detailed source implementation notes

Save data is stored only in the current browser's local storage under `emberwatch-save`. There is no cloud account, server API, multiplayer, or cross-device synchronization. Clearing site data can remove progression.

Hosted styles optionally load Google Fonts; the standalone edition removes that request and uses system fonts. The runtime includes optional, read-only WebMCP progress registration, which remains unverified in a supported browser.

This is an original genre-inspired prototype. It does not include commercial game assets or claim full feature parity, production balance, or release readiness.

## 0.2.0 work in progress

This checkpoint expands growth, forging, elemental equipment, combat feedback, and map layouts. Dedicated growth tests and refreshed reports are still being integrated. Existing comparison/QA documents describe the prior baseline; follow `eval.md` for current verification gates.
