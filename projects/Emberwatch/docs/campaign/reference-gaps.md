# Reference gaps before faithful Warrior activation

Checked 2026-10-08. This concerns Hammerwatch II (2023), Steam app 1538970. It does not concern Heroes of Hammerwatch II. The following observations are research leads, not runtime defaults or current-build measurements.

## Blocking numerical rules

The available official material and community tables do not establish the full XP threshold table, STR/DEX/INT coefficients, base resource regeneration and interruption delays, active equipped-shield drain/angle, damage rounding/penetration order or complete respawn rules. They remain UNKNOWN. The old expedition formulas are not substitutes.

The cached class tables establish four starting actions, source-specific skill costs and listed rank effects. Their live pages returned502 and the index reported approximately2.3years of cache age. Missing rank cells, timings, geometry, requirements and provisional tiers are retained explicitly.

## Promotion and redistribution observations

- A [community achievement guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3022155973), published2023-08-18 and updated2023-08-23, reports Adept training1,500gold, Expert level15/5,000gold and Master level30/10,000gold. It describes routes to trainers but does not prove every prerequisite. The Adept minimum level is not explicit there. XP tier classification at level5 is a separate fact.
- A [Japanese first-hand guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3049822734), published2023-10-24 and updated2023-11-17, corroborates Master level30/10,000gold through the author's experience.
- [August2023 respec discussion](https://steamcommunity.com/app/1538970/discussions/0/3814039097898745076/) reports1,500gold before Expert and10,000after; a reply recalls30,000at Master. A [May2024 level42 report](https://steamcommunity.com/app/1538970/discussions/0/4328600722518929018/?l=portuguese) separately reports30,000. Apprentice pricing, current prices and whether attributes and skills reset together remain unresolved.

These are medium-confidence community observations. Do not turn narrative trainer locations into copied content or hardcoded original quest prerequisites.

## Death is a destination choice

A [January2024 first-hand PS5 review](https://www.ps3blog.net/2024/01/04/playstation-5-hammerwatch-ii-review/) describes selectable Rebirth Locations with a carried-gold percentage and elapsed-world-time tradeoff. Nearer destinations cost more gold and consume less time. The Japanese guide reports50–60% loss on its highest-difficulty playthrough; another first-hand review reports typical15–20%. These do not establish a complete formula or table.

Implement the eventual settlement against an explicit destination/difficulty policy, not a universal20% or60% tax. Exact percentages, rounding, travel-time advances, restored resources and enemy-reset rules require verification. Advancing time on death must also advance timed quests consistently.

## Shield and attributes

The [official Paladin spotlight](https://store.steampowered.com/news/posts/?enddate=1687886026&feed=steam_community_announcements) distinguishes active equipped-shield behavior from passive physical blocking. The class table's25% passive chance and25/50/75/100 block amounts do not establish active drain, angle or damage coverage.

A [launch-era first-hand reply](https://steamcommunity.com/app/1538970/discussions/0/3814039097896623146/) says blocking drains stamina yet continues at zero. This uncorroborated behavior must not silently become an unconditional zero-stamina cancel rule or its opposite.

A [Paladin discussion](https://steamcommunity.com/app/1538970/discussions/0/3814039462156689402/) associates STR with HP/regeneration, INT with MP/regeneration and DEX with stamina/regeneration. Coefficients and base values remain unknown.

## Plan/reference discrepancy

A [Russian first-hand guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3025515942) describes six accessory positions and multiplicative percentage attribute bonuses. Its embedded screenshots were not verified. The user's canonical plan explicitly requires exactly seven equipment slots including one Accessory; that contract remains unchanged. The guide's display examples do not prove rounding order.

## Measurement needed

For a game-correct comparison, record the original game build and difficulty, starter stats before/after one point in each attribute, timed idle/in-combat regeneration, XP thresholds through the slice, equipped shield tooltip and sustained blocking at full/zero stamina, trainer requirements, and every offered death destination/cost/time. Preserve observations separately from implementation tuning. No original-game ownership, installation or capture access has been established in this task.
