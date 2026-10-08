# Wizard / Ranger reference catalogs

Research checkpoint: 2026-10-08. Scope is Hammerwatch II (2023), mapped exactly to Emberwatch `mage → wizard` and `archer → ranger`. This is M0 reference data for the later M4 implementation. Warrior remains the first implementation and playtest gate.

Both catalogs contain 54 nodes: 16 base nodes and 38 augmentations. Every base and augmentation heading recovered from the class pages is represented. A complete inventory does not establish complete numerical or behavioral fidelity. No new gameplay, art, UI, subclass, or weapon system is enabled by these files.

## Deliverables and schema

- [Mage catalog](../../app/src/campaign/reference-mage.js): `MAGE_REFERENCE`
- [Archer catalog](../../app/src/campaign/reference-archer.js): `ARCHER_REFERENCE`
- [Data-contract tests](../../app/tests/campaign-reference-ranged.test.mjs)

Catalogs and all nested records are immutable. `classId` is the Emberwatch class; `referenceClassId` identifies its sole source class. `referenceName` is a research label. `displayName` is an original Korean Emberwatch working name, not an official translation. The main game's display naming should use the latter. `behaviorId` is a reference key only, not an implemented handler.

Each node includes its own tier, type, base relationship, source-order upgrade costs, rank values, known dependencies, unknowns and source metadata. Augment tiers are independent of the parent's tier. `requires[].relation` distinguishes a sourced augmentation relationship from an effect dependency. A null prerequisite rank means the minimum purchase rank has not been verified; it must not silently become rank 1. The three Wizard Ascendency effects explicitly require rank 1 of the corresponding spell. Pack Leader's dependency on Wolf Companion is recorded with an unknown minimum rank. Regrowth does not acquire an invented Entangle purchase prerequisite.

Numeric fields ending in `Percent` retain percentage points, so 25 means 25%, not 0.25. Signed modifiers retain their sign. `Seconds` means an explicit source time unit. `SourceUnits` retains a row whose unit was not established. A scalar preserves a single cached table cell; it does not manufacture a value for every rank. Arrays preserve source row order. Upgrade cost is the cost at each listed rank, not a cumulative total.

`null` and `unknown` are unresolved evidence. They are not zero, a default timing, or permission to invent a mechanic. `rankArityDiscrepancies` identifies arrays that cannot safely be aligned with costs. An omitted `exclusiveGroup` means no exclusion was found in the recovered evidence; it does not prove compatibility. Only explicit class-page exclusions are grouped.

## Sources and confidence

1. [Wizard class page](https://wiki.hammerwatch2.com/Wizard), community wiki, retrieved through targeted cached web-search excerpts on 2026-10-08. The result reported a crawl age of 2.3 years.
2. [Ranger class page](https://wiki.hammerwatch2.com/Ranger), same retrieval route and reported crawl age.
3. [Official September 19, 2023 patch notes](https://maximument.com/news/hwiipatchnotes/), publisher evidence that Arcanist/Arcane Amplification and Elemental Flux lightning behavior received corrections. The patch also reports persistent character saves. It does not supply replacement numeric skill tables or establish that the cached wiki matches the installed game.

Direct wiki fetches had already failed with HTTP 502 in the parent investigation; this pass used the functioning cached-search route without repeating that failure. Query anchors included Wizard's “Somatic Reservoir”, “Barrier”, “Meteor” and “Damage per Level”, and Ranger's “Piercing Shot”, “Entangle” and all three upper-tier headings. Overlapping excerpts were reconciled by node heading. Ranger's Adept section came from the tier-targeted excerpt; its complete Apprentice and Master sections came from targeted skill excerpts. Contiguous Wizard Meteor rows were recovered and checked in multiple excerpts from the same cache. These are repeated views of one source, not independent validation.

Every skill source is marked `wiki_cached`, `community_cached_unverified`, `currentVersionVerified: false`, and `measured: false`. The access date is a research date, not the date of the source's game build. Source `section` identifies the exact skill heading. Official patch links are additional cautions on affected nodes, not a promotion of their numerical values to official or measured evidence.

Only functional values, relationships, concise original annotations and reference names are included. No commercial descriptions, artwork, maps, game code or audio are copied into the deliverable.

## Initial action contracts

| Emberwatch | Dash | Mainhand | Offhand | Spell |
|---|---|---|---|---|
| 마법사 / mage | Phase Shift | Arcane Bolt | Arcane Grimoire | Barrier |
| 궁사 / archer | Dodge Roll | Sword Slash | Bow Shot | Entangle |

Ranger's sword is mainhand and its charged bow is offhand. The class page and canonical plan determine these roles; inconsistent item-blueprint labels must not reverse them. Bow Shot's charge changes range, speed and damage and consumes stamina. Arcane Grimoire invokes the equipped grimoire's spell; its missing item-specific mana costs, cooldowns and spell list remain unknown. Wizard starts with Barrier.

## Complete base and augmentation inventory

The first tier column belongs to the base node. Each augmentation carries its own tier in parentheses. This includes late-tier branches under earlier base skills.

### Wizard → 마법사

Node tiers: apprentice: 7; adept: 14; expert: 18; master: 15. Base nodes: four per tier.

| Base tier | Reference base | Emberwatch label | Every augmentation (its own tier) |
|---|---|---|---|
| apprentice | Phase Shift | 틈새 걸음 | Mana Surge (adept); Mirror Image (expert) |
| apprentice | Arcane Bolt | 잿빛 섬광탄 | Empowered Bolt (apprentice); Focused Bolt (apprentice); Wand Mastery (master) |
| apprentice | Arcane Grimoire | 봉인서 펼치기 | Grimoire Scholar (apprentice); Somatic Reservoir (adept) |
| apprentice | Barrier | 등불 장막 | Flame Shield (adept); Ice Block (adept); Reactive Barrier (adept) |
| adept | Arc Lightning | 갈래 번갯줄 | Overcharge (adept); Channel Lightning (expert) |
| adept | Haste | 짧아진 순간 | Blur (adept); Energy Surge (adept); Temporal Shift (expert) |
| adept | Arcane Intellect | 기록자의 통찰 | Arcane Physique (adept); Arcane Finesse (adept) |
| adept | Elemental Ward | 삼빛 수호문 | Control Fire (expert); Control Ice (expert); Control Lightning (expert) |
| expert | Frost Nova | 서릿살 고리 | Shatter (expert); Flash Freeze (expert) |
| expert | Wall of Flames | 잿불 울타리 | Volatile Flames (expert); Wall of Alteration (master) |
| expert | Incanter's Cadence | 문장의 박자 | Rising Crescendo (expert); Intensified Intonation (expert); Alleviating Rhythm (expert) |
| expert | Arcanist | 유랑 기록자 | Arcane Safeguard (expert); Arcane Amplification (expert) |
| master | Wizard's Duplicate | 등불 분신 | Wizard's Army (master); Improved Duplicate (master) |
| master | Meteor | 낙화의 별 | Meteor Shower (master); Comet (master) |
| master | Weaver of Time | 시간의 매듭 | Prolonged Agony (master); Shockwave (master) |
| master | Elemental Flux | 삼빛 순환 | Fire Ascendency (master); Ice Ascendency (master); Lightning Ascendency (master) |

### Ranger → 궁사

Node tiers: apprentice: 8; adept: 20; expert: 12; master: 14. Base nodes: four per tier.

| Base tier | Reference base | Emberwatch label | Every augmentation (its own tier) |
|---|---|---|---|
| apprentice | Dodge Roll | 낙엽 구르기 | Evasive Roll (apprentice); Critical Momentum (adept) |
| apprentice | Sword Slash | 솔바람 베기 | Swift Strikes (apprentice); Deflect (apprentice); Extended Reach (adept) |
| apprentice | Bow Shot | 시위 당기기 | Piercing Shot (apprentice); Overdraw (adept); Splinter Shot (adept) |
| apprentice | Entangle | 뿌리 매듭 | Healing Wisps (adept); Poison Ivy (adept); Penetrating Vines (adept) |
| adept | Enchanted Arrows | 숲빛 화살 | Frost Arrows (adept); Shock Arrows (adept); Multi Shot (expert) |
| adept | Wolf Companion | 숲길 벗 | Protective Bond (adept); Vicious Bites (adept); Coordinated Attack (adept) |
| adept | Barkskin | 나이테 갑옷 | Wild Strength (adept); Natural Mending (adept) |
| adept | Hunter | 숲길 추적자 | Beastslayer (adept); Big Game Hunter (adept) |
| expert | On the Prowl | 몰아가는 발걸음 | Hot Pursuit (expert); Finish the Kill (master) |
| expert | Wind Weaver | 맴도는 솔바람 | Winter Winds (expert); Wind Slash (expert) |
| expert | Archer's Concentration | 고요한 시위 | Careful Aim (expert); Determination (master) |
| expert | Nature's Blessing | 숲의 가호 | Natural Attunement (expert); Nature's Vigor (expert); Nature's Sting (expert) |
| master | Rain of Arrows | 낙엽 화살비 | Storm of Arrows (master); Thundercaller (master) |
| master | Spectral Wolf Pack | 달빛 무리 | Pack Leader (master); Relentless Hunters (master) |
| master | Wicked Sprouts | 돋아나는 가시 | Rampant Growth (master); Regrowth (master) |
| master | Nature's Scorn | 숲의 노여움 | Frost Revenant (master); Storm Strider (master) |


## Source-backed mutually exclusive groups

| Class | Group | Members |
|---|---|---|
| mage | `barrier_form` | Flame Shield, Ice Block, Reactive Barrier |
| mage | `arcane_attribute` | Arcane Physique, Arcane Finesse |
| mage | `flame_wall_form` | Volatile Flames, Wall of Alteration |
| mage | `duplicate_form` | Wizard's Army, Improved Duplicate |
| mage | `elemental_ascendency` | Fire Ascendency, Ice Ascendency, Lightning Ascendency |
| archer | `entangle_form` | Healing Wisps, Poison Ivy |
| archer | `enchanted_arrow_element` | Frost Arrows, Shock Arrows |

The Wall of Alteration pair is stated on Volatile Flames' entry. No exclusion is invented for Empowered/Focused Bolt, the Control-element trio, Meteor Shower/Comet, Piercing/Overdraw/Splinter Shot, or Penetrating Vines alongside the Entangle form choice. Group IDs are class-local and should be qualified by class in a shared registry.

## Preserved discrepancies and implementation blockers

| Node or topic | Evidence retained | Unresolved detail |
|---|---|---|
| Somatic Reservoir | Upgrade costs 2, 3; thresholds 30%, 40%, 50% | Two costs versus three values; which rank/cell is missing is unknown. Stamina conversion is unknown. |
| Control Fire / Ice / Lightning | Each has costs 2, 3, 4 and conversion rates 0.5, 1 | Three costs versus two values; do not pad, interpolate or drop a rank. |
| Meteor | Costs 4, 5, 6; damage 400, 500, 600; damage/level 2, 4, 6; mana 70, 90, 110; cooldown 25 seconds | Fire/physical allocation, exact delay and impact size are missing. |
| Wall of Flames | Duration row 8, 11, 14 | Unit is absent in the cached row; retained as `durationSourceUnits`. |
| Flame Shield / Volatile Flames | Costs and mana modifiers; Volatile Flames proc chances | Damage/tick/radius cells are not supplied; missing damage is null. |
| Bow Shot / Overdraw | Charge limits 0.3 / 0.35–0.45 seconds; charging stamina values 1 / 2 | Charging cost cadence/basis and charge interpolation curves are not stated. |
| Piercing Shot | Piercing row 1, 3, 6; damage declines after piercing | Charge-to-piercing mapping and per-pierce damage loss are unknown. |
| Arcane Safeguard / Determination | Trigger is low health/life | Threshold is unknown, not assumed to be 25%, 30% or any other value. |
| Rain of Arrows | Offhand scaling, mana and cooldown | Arrow count and impact timing/radius are unknown. |
| Regrowth | Proc chance 25%, 50%; produces a weaker Entangle | Reduced spell's values and learned-Entangle requirement are unknown. |
| Wizard patch-sensitive nodes | Official Arcanist/Arcane Amplification and Elemental Flux fixes | Current-build behavior needs direct verification. |

Other per-node gaps include effect durations, spatial units, invulnerability/cancel windows, summon limits/AI, triggered spell costs, proc overlap and modifier order. Neither catalog establishes trainer/NPC promotion requirements, all rank-level gates, tier promotion costs, respec pricing or rounding. Measured/current-build verification is still required before these rows drive fidelity-critical gameplay. Mage and Archer gameplay remain deferred behind the Warrior slice.

## Validation

Run from `projects/Emberwatch/app`:

```sh
node --test tests/campaign-reference-ranged.test.mjs
```

The 13 tests passed on 2026-10-08. They cover all 108 nodes and all 76 base-to-augment relationships, four tiers per class, Korean display labels, exact class and starting-slot mapping, source confidence, dependency integrity, only the seven sourced exclusion groups, preservation of all four arity mismatches, representative resource/rank values, null timing/formula cells and immutability. These are data-contract tests, not gameplay or browser validation. The parent integration owns aggregate project lint/test/build and any registry or release work.
