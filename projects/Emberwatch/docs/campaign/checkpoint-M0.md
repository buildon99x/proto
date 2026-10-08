# Campaign foundation checkpoint — 2026-10-08

The active game remains version 0.4.4. This checkpoint adds isolated campaign source and tests, not a playable campaign release. The frozen baseline is recorded in baseline-0.4.4.json; legacy saves are not converted.

## Implemented foundation

- Separate campaign.v2 storage with verbatim legacy backup, validated JSON, two snapshot slots and commit receipts. Recovery does not promote an uncommitted staging snapshot. Browser writers use a shared Web Lock and expected revision; missing safe-lock support fails closed.
- Three classes and seven equipment slots in the storage contract. Known level-point bands, tier eligibility and lower-tier XP multipliers are pure functions. Level transitions do not invent an XP curve or automatically promote a character.
- All four tiers cataloged for Warrior (53 nodes), Mage (54) and Archer (54). The catalogs retain numeric units, relationships, source confidence and unknowns. Original Korean display labels are separate from reference names.
- Source-only catalogs cannot be purchased as executable skills. Unknown prerequisites, provisional tiers and incomplete rank cells remain blocked.

## Evidence and limits

The full canonical plan v1.1 was read from Library version 2, updated 2026-10-08 14:07 UTC. Class tables were retrieved from cached Hammerwatch II wiki search results after live pages returned 502. Their reported cache age is approximately 2.3 years. They are not current-build measurements. An official September 2023 patch supplies Battle Banner exclusivity.

Fifteen storage, six progression and twenty-six class-reference tests pass. Syntax checking now includes nested source and test directories. These checks do not establish combat feel, browser saves, sound quality or release readiness.

At this checkpoint, XP thresholds, general attribute conversion, resource regeneration, exact active shield behavior, damage rounding, death settlement, respec price and trainer promotion conditions remain unresolved. New world and inventory modules are separate work in progress. Normal-control play is waiting on the private Site sign-in flow; no sharing change or authentication bypass is authorized.
