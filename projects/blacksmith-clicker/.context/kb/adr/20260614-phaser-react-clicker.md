# ADR: Phaser Canvas + React DOM HUD for 대장장이 클릭커

## Status

Accepted

## Context

The prototype needs immediate clicker play, responsive HUD panels, a completion modal, visual hit feedback, particles, glow, flash, and screen shake. The repo template is Vite React, while the Game Studio workflow defaults 2D browser games to Phaser.

## Decision

Use Phaser for the forge playfield and renderer-only effects, and React DOM for all text-heavy game UI.

- `app/src/gameLogic.ts` owns simulation and saveable state.
- `app/src/ForgeScene.ts` owns canvas rendering, hammer animation, sparks, glow, flash, and camera shake.
- `app/src/App.tsx` owns resource panels, upgrade buttons, logs, inventory, and result modal.

## Consequences

- Gameplay rules can be tested through TypeScript without instantiating Phaser.
- UI remains readable and responsive because dense text is DOM-rendered.
- Phaser bundle size is large for a small prototype; production hardening should consider lazy loading or a slimmer renderer if this becomes a launcher performance issue.
