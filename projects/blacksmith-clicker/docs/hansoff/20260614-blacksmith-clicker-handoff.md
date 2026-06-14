# 대장장이 클릭커 Handoff

## Current State

`projects/blacksmith-clicker` contains a playable Vite React prototype. The first screen is the game surface: resources and materials on the left, forge interaction in the center, upgrades on the right, and recent work logs below the forge. Completing a weapon opens a modal with sell, salvage, enhance, and keep choices.

## Main Files

- `app/src/App.tsx`: game state, economy rules, weapon generation, action handlers
- `app/src/styles.css`: responsive layout, forge visuals, animation, modal styling
- `brief.md`: product goal and required screens
- `spec.md`: implementation rules and balancing constants
- `eval.md`: e2e verification checklist

## Known Constraints

- No persistence yet; reload resets progress.
- No real audio yet; rare weapon feedback is visual only.
- Weapon visuals are CSS-built placeholders rather than asset files.
- Local dependency links are currently incomplete because `pnpm install` timed out and network install approval was unavailable. Re-run install before final build or browser QA.

## Recommended Next Work

1. Add localStorage save/load for gold, materials, upgrades, collection, and progress.
2. Add project-owned sound assets with mute controls.
3. Move economy constants into a project data file if balancing starts iterating quickly.
4. Add a small smoke test harness around first render and basic action buttons if the repo standardizes browser tests.
5. Run `corepack pnpm install --no-frozen-lockfile`, `pnpm sync:registry`, `pnpm --filter blacksmith-clicker test`, and `pnpm build:vercel`.
