# Emberwatch · Crown of Cinders

An original, dependency-free Canvas action roguelite inspired by the exploration/progression loop of **Heroes of Hammerwatch II**. This is a prototype and not a port, a full clone, or commercial-quality equivalence.

## Run

From the repository root:

- `pnpm --filter emberwatch dev` and open the printed local HTTP address
- `pnpm --filter emberwatch standalone` builds `app/dist/Emberwatch.html`, which can be opened in a modern browser
- `pnpm --filter emberwatch test` checks 600 procedural maps and data definitions, then runs logic using a mocked DOM/Canvas. It does **not** simulate human browser play or verify real rendering/input
- See the project [README](../README.md) for dependency-free Node commands

No installation, backend, account, external game assets, extracted code, or external audio is required. The hosted CSS optionally loads Google Fonts; the standalone edition uses system fonts and is offline-contained.

## Controls

WASD / arrows move. Mouse aims; hold left mouse to attack. J attacks with nearest-target aiming. Space dodges. Q/E use class skills. F interacts. R drinks a potion. Tab opens equipment. Escape pauses. Touch controls offer directional and action buttons.

## Implemented

- Four starter heroes and three guardian-unlocked heroes, each with distinct combat/skills
- Six seeded floors, twelve connected rooms per floor, three original biomes and three phased guardians
- Ranged/melee enemies, attack telegraphs, dash invulnerability, mana/cooldowns, limited potions, destructibles, loot and fog-map exploration
- Eighteen run-only trinkets with three-choice reliquaries
- Permanent weapons/armor/charms, persistent hero levels, six shared town upgrades
- Courier banking of half a haul; baseline death/retreat retains 60%; permanent equipment and XP survive
- New Game + scaling, automatic device-local saves and mid-run resume
- Optional synthesized sound effects, read-only WebMCP progress tool

## Important verification limit

Actual browser play was **not completed**. The cloud preview returned HTTP 502 / connection refused. The browser explicitly blocked the exact localhost preview URL. No control-path bypass was attempted. Automated map and mocked-runtime checks passed, but real browser rendering, combat feel, balance, input, device persistence, victory and mobile usability remain unverified. See [review.html](./review.html) and [QA.md](./QA.md).

Progress is saved only in this browser/device's local storage; it is not account-synced. Clearing browser site data removes it. The source contains no reset/delete-save button.

## Research

The correct sequel wiki is https://wiki.heroesofhammerwatch2.com/Main_Page . Steam: https://store.steampowered.com/app/619820/Heroes_of_Hammerwatch_II/ . `review.html` lists sources and a feature-by-feature comparison.

All runtime artwork is independently authored Canvas rendering. All effects are synthesized locally. Official screenshots were inspected as research but are not bundled. No original game code, sprite sheets, music, maps, logos or extracted assets are included.
