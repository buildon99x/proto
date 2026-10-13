# Two-region raid slice, 0.13.0

The original gunplay specification requires two maps with loadout/deploy/exploration/loot/combat/extraction-or-death/home reflection and repeated acceptance evidence. The referenced concept supplies city environments but no two-map selection or playable layouts. This unit preserves Black Pines and authors an original Canal Ward district inspired by drowned-city lore. It does not finish two authored city maps, broader AI/crafting/economy or live acceptance.

| Data / behavior | BLACK PINES, preserved | CANAL WARD, new |
| --- | --- | --- |
| Bounds / insertion |340m square / (0,145)|280×220m / (-112,82)|
| Terrain / cover |720 collider-backed trees, lumber/depot/quarry/relay|0 trees,8 offset urban blocks, central no-swim flood channel, crates and physical signposts|
| Traversal |11 forest routes|4 authored routes with two bridge openings atZ60/Z-20; water blocks movement but not shots or sight|
| Encounter data |17 opponents including relay boss|8 opponents including pump boss, differing home/activation/leash positions|
| Extraction |Two bounty exits,6s each|East ferry requires carried archive+bounty/8s; west winch requires bounty/12s|
| Loot and economy |Existing caches, contract cash and retained loot|West archive and supplies, east pump loot; same cash/UID/settlement/sale transactions|

The collision flood reaches3,270 four-metre-grid positions from insertion, including every landmark, loot, boss and both exits. All authored route segments pass actual movement collision checks. Guidance selects a collision-clear bridge waypoint rather than a flooded straight line. These are source/model checks; travel warps and mocked browser input are explicitly not human play.

No save schema changes. Region is selected for and frozen in the pending deployment; changing the next-region selector while paused leaves the active mission intact. Existing normal saves/UIDs are untouched. Fresh in-memory tests execute canal→forest→canal with the same equipment UIDs, retirement of quest tokens,820 contract cash per fixture and separate180 archive sales; settlement and sale replays do not increase cash. Death retains only protected loot, with no contract award. Failed writes, overflow and stale transactions continue through the existing profile system and its full regression suite.

Live requirements remain: choose each region in a fresh isolated profile, travel routes, fight real encounters with ordinary mouse/key input, test archive removal and both exits, inspect city/water/cover readability and shot paths, return home, sell/redeploy, die and repeat. Capture rendered frames, actual sound and device frame times. The existing CUA/MXC initialization block and queued-only Codex panel do not establish a loaded browser, WebGL defect or pointer-lock defect. Liquid-metal AI remains deferred.

0.13.1 adds three adversarial in-memory rendererless integration cases without changing production transactions: denied deploy write plus changed next-region selector, denied canal settlement plus attempted replacement raid, and successful deployment write with lost acknowledgement/failed verification reads. Retry retains the original region/raid/inventory, cash and each recovered UID once, byte-stable settlement and one withdrawal after unknown acknowledgement. These are failure-model evidence, not actual browser disk/storage acceptance.
