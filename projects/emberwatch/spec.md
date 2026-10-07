# Specification

## Game structure

- Seven classes: Warrior, Paladin, Ranger, Wizard, Rogue, Warlock, and Sorcerer; each has a basic attack, two active abilities, and three specialization definitions.
- Three themed biomes over six floors; each seeded map contains twelve connected rooms and corridors. Every second floor has a guardian.
- Runs include combat, dodging, potions, exploration, loot, relic selection, equipment, and resource collection.
- Six persistent refuge buildings provide upgrades between runs.
- Browser local storage records progression and a resumable run. This is device/browser-local data, not cloud synchronization.

## Controls

WASD or arrow keys move; mouse aims and held left click attacks; J attacks using nearest-target aiming; Space dodges; Q/E use abilities; F interacts; R uses a potion; Tab opens inventory; Escape pauses. On-screen touch buttons are a fallback requiring real-device verification.

## Repository and build contract

- Project ID and package name: `emberwatch`; initial semantic version: `0.1.0`; status: `prototype`.
- Canonical static source lives in `app/src/`; `app/scripts/build.mjs` copies it into generated `app/dist/`.
- `pnpm --filter emberwatch build` produces `app/dist/index.html` with relative assets so the launcher can serve `/runs/emberwatch/index.html`.
- `pnpm --filter emberwatch test` runs deterministic data checks and isolated mock-runtime tests. These tests do not automate a browser.
- `pnpm --filter emberwatch standalone` produces a generated self-contained HTML file from the built static artifact.
- No committed `dist`, launcher run output, package manager cache, generated standalone bundle, credentials, or Sites configuration.

## Verification requirement

Run project syntax checks, tests, static build, registry synchronization, and the required repository-wide Vercel build. Real browser interaction and screenshot review are required before claiming gameplay or release readiness. A failed unrelated project build must be reported without modifying that project to hide the failure.
