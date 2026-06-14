# Handoff: 대장장이 클릭커

## Current State

The prototype is playable in code and builds successfully. The project lives at `projects/blacksmith-clicker` and is registered in the launcher as `대장장이 클릭커`.

## Important Files

- `app/src/gameLogic.ts`: simulation, rewards, random weapon generation, upgrade rules.
- `app/src/ForgeScene.ts`: Phaser forge canvas and visual effects.
- `app/src/App.tsx`: React HUD, result modal, panels, and action wiring.
- `app/src/styles.css`: responsive fantasy forge UI styling.
- `brief.md`, `spec.md`, `eval.md`: product and verification contract.
- `.context/kb/adr/20260614-phaser-react-clicker.md`: architecture decision.
- `.context/kb/lrn/20260614-setup-and-verification.md`: setup and verification lessons.

## Verified Commands

- `corepack.cmd pnpm --filter blacksmith-clicker test`
- `corepack.cmd pnpm sync:registry`
- `corepack.cmd pnpm build:vercel`

## Known Limitations

- Browser e2e was not completed in this run because the Browser tool blocked direct `file://` artifact navigation and a background dev server could not be started after approval usage limits were hit.
- The Phaser bundle triggers Vite's large chunk warning.
- There is no persisted save/load yet; state resets on refresh.

## Recommended Next Steps

1. Add a standard preview workflow for launcher run artifacts.
2. Run desktop and mobile browser playtests through `http://127.0.0.1`.
3. Add lightweight persistence for gold, materials, upgrades, and stored weapons.
4. Add audio toggles and sound effects for hammer hits, completion, and rare weapons.
