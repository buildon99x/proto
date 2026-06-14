# ADR: DOM React Runtime for 대장장이 클릭커

## Status

Accepted

## Context

The prototype needs dense resource panels, upgrade buttons, a result modal, logs, collection state, and responsive layout. The main interaction is click progression rather than collision, camera movement, tilemaps, or sprite physics.

## Decision

Use the repo's Vite React project template with DOM-driven game state and CSS-built 2D forge visuals instead of adding a canvas engine dependency for the first prototype.

## Consequences

- Fast iteration stays inside the existing monorepo template and build pipeline.
- HUD, modal, and responsive behavior are straightforward to test with TypeScript and browser screenshots.
- If later versions need animated characters, tilemaps, or richer sprite sequencing, the game loop can be moved behind a Phaser scene while keeping the current progression rules.
