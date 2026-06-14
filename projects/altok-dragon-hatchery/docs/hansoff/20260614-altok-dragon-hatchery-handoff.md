# Handoff: 알톡! 드래곤 부화장

Date: 2026-06-14

## Current State

Playable MVP is implemented under `projects/altok-dragon-hatchery`. The app runs as a Vite static artifact and is registered in the launcher.

## Key Files

- `app/src/App.tsx`: React shell, resources, panels, collection, upgrade controls
- `app/src/EggStage.tsx`: Phaser canvas scene for egg visuals and click feedback
- `app/src/data.ts`: eggs, dragons, upgrades, resources
- `app/src/gameLogic.ts`: state transitions, random hatch, production, purchases
- `app/src/styles.css`: responsive game UI styling

## Verified Flow

1. Open local app.
2. Click `알 톡톡` repeatedly.
3. Hatch progress rises and resources increase.
4. A dragon hatches and appears in the collection.
5. Owned dragon production starts increasing resources over time.
6. Desktop and 390px mobile layouts render without horizontal overflow.

## Known Follow-Up

- Phaser increases JS bundle size and triggers Vite's chunk size warning.
- Randomness is intentionally non-deterministic for prototype feel; automated deterministic tests would need seeded RNG injection.
- Launcher cover image is a captured prototype screenshot and should be refreshed after major visual changes.
