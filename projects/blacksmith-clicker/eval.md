# 대장장이 클릭커 Eval

## Smoke Checks

- App loads through Vite without runtime errors.
- The Phaser forge canvas renders a weapon, anvil, hammer, and background.
- Clicking the forge increases the visible crafting gauge.
- Auto progress increases the gauge without clicking.
- Completing a weapon opens a result modal.
- Result modal supports sale, salvage, enhance, and store actions.
- Sale increases gold.
- Salvage increases materials.
- Enhance consumes resources and increases enhancement level/value.
- Store adds the weapon to the collection panel.
- Upgrade buttons spend gold and update the corresponding level/stat.

## E2E Player Path

1. Load the project.
2. Click the forge until a weapon completes.
3. Sell the weapon and verify gold increases.
4. Buy at least one affordable upgrade.
5. Complete another weapon.
6. Salvage or enhance it and verify material/cost feedback.
7. Store a weapon and verify collection count/value changes.

## Release Checks

- `corepack.cmd pnpm --filter blacksmith-clicker test`
- `corepack.cmd pnpm sync:registry`
- `corepack.cmd pnpm build:vercel`
- Browser inspection of project dev URL for desktop and narrow viewport layout.
