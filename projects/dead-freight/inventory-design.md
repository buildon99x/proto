# Equipment checkpoint 0.8

This is an original Dead Freight adaptation of extraction equipment and carry decisions. It does not copy ARC Raiders art, names, audio or exact numerical balance.

## Official reference facts

- [Embark: Gearing up](https://id.embark.games/arc-raiders/support/faq/140-gearing-up) describes weapons, armor, ammunition, gadgets and augment-dependent backpack layouts.
- [Live Update 1.45.0](https://arcraiders.com/news/live-update-1-45-0) confirms loadout weight, full-inventory feedback and quick-use controls.
- [Your first raid](https://id.embark.games/arc-raiders/support/faq/135-your-first-raid-1759328782) describes loss of carried equipment and scavenged loot on failure except protected Safe Pocket contents, plus basic free loadouts.
- [Store Update 1.47.0](https://arcraiders.com/news/store-update-1-47-0) confirms quick-use slot type restrictions.

These references establish the general systems. Exact current slot/weight counts and penalties were not verified from official text; the values below are our own prototype choices.

## Dead Freight rules

- Two distinct equipped firearm positions, one armor slot, four stable quick-use positions, 12 bag slots and one restricted safe pocket.
- Total carried mass is capped at 30 kg. Equipment, protected contents and loaded ammunition count. A rejected pickup or swap changes neither source nor destination.
- The safe pocket allows one eligible stack; weapons, armor and quest evidence are excluded. Safe-pocket supplies must be moved out before use, and safe ammunition does not feed reloads.
- Bandages heal 30, medkits 60, with no consumption at full health. A scanner reveals living enemies within 35 m for eight seconds without itself alerting them. A fragmentation grenade flies, collides and explodes after two seconds with cover, falloff and self-damage.
- Keys 1/2 select equipped guns. Keys 3–6 use the corresponding quick slots. Tab opens the bag during play; the single-player prototype explicitly pauses while it is open. Escape returns. Menu keyboard navigation remains native.
- Ground supplies become carried objects. They are not instantly healed, equipped or sold. Cargo has slot/mass opportunity costs; the six old cargo caches cannot all be taken with an unchanged basic kit.
- Extraction stores carried equipment and loot, excludes the quest token, and separately banks earned bounty cash. Death keeps only the last durably saved safe pocket. Existing stash and bank remain untouched.
- The menu stages whole stash stacks for a later deployment; moving them into a draft does not withdraw them. A successful deployment write reserves them. Issued basic equipment has zero reference value and supports recovery after loss.
- Stash is not a shop. Buying, crafting, selling and broader progression are not part of this slice.

## Save contract and limits

The existing `deadfreight-best` record keeps its cash. Legacy contract numbers represent completed contracts; schema 2 and 3 store the next contract index. Loading does not migrate or write. Valid inventory fields are also preserved if an older open 0.7.2 tab changes the schema marker while banking cash. Before the first schema-3 mutation, an unchanged legacy record is retained under `deadfreight-backup-v2` if no backup exists. An unreadable record is never cleared or overwritten.

Schema 3 journals deployed gear and safe contents. Settlement records prevent duplicate awards after retry, including a storage implementation that accepted a write before reporting an error. Reopening an active journal offers explicit interrupted-raid recovery; it does not silently restore a fresh world with duplicated carried loot.

Pending writes exist in the current page only. Closing or reloading before successful extraction persistence loses unsaved carry; interrupted recovery retains only the last saved safe pocket. A foreign save change blocks stale pending writes rather than overwriting newer data. Local storage has no cross-tab compare-and-swap guarantee. The UI warns about these limits.

All source tests use isolated fixtures, including an example cash value of 2920. They do not operate the user's live saved game. Actual input, image quality, audio listening and FPS remain separate acceptance gates.
