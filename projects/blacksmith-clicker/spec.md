# 대장장이 클릭커 Spec

## Stack

- Vite + React + TypeScript
- Phaser for the forge canvas, impact animation, sparks, glow, flash, and screen shake
- DOM HUD for resources, upgrades, inventory, logs, and completion modal

## Architecture

- `src/gameLogic.ts` owns saveable simulation state, random weapon generation, rewards, upgrades, enhancement costs, and derived stats.
- `src/ForgeScene.ts` owns renderer-only state: weapon drawing, hammer animation, sparks, glow, flash, and camera shake.
- `src/App.tsx` bridges user actions into simulation updates and renders DOM HUD/modal surfaces.

## Game Rules

### Crafting

- Click progress starts at `+9` per click.
- Auto progress starts at `+1.4` per second.
- Base target is `100` progress and can be reduced by workbench upgrades.
- Progress pauses while a completed weapon modal is open.

### Weapon Generation

- Types: 검, 도끼, 창, 단검, 활, 지팡이, 망치, 방패
- Grades: Common, Rare, Epic, Legendary
- Qualities: D, C, B, A, S
- Elements: 무속성, 불꽃, 얼음, 번개, 독, 신성
- Enhancement starts at `+0`
- Value is derived from base roll, grade multiplier, quality multiplier, and element bonus.

### Completion Choices

- 판매: weapon value plus merchant upgrade bonus becomes gold.
- 분해: iron/coal, plus crystal/essence for higher grades, with salvage upgrade bonus.
- 강화: spends gold, iron, and sometimes crystal; increases value and collection score.
- 보관: stores the weapon in the collection list and adds collection score.

### Upgrades

1. 망치 강화: click progress increases.
2. 제작대 확장: target progress decreases and quality chance improves.
3. 화로 강화: rare grade chance improves.
4. 직원 고용: auto progress per second increases.
5. 상인 계약: sale price increases.
6. 분해 기술: material yield increases.
7. 강화 기술: enhancement cost decreases.

## UX Requirements

- The main forge is immediately playable without a landing page.
- The center playfield stays dominated by the anvil and weapon.
- Left panel shows gold, materials, and stored weapons.
- Right panel shows upgrades with level and cost.
- Bottom area shows recent completed weapons.
- Completion modal blocks crafting until the player makes a decision.
- Rare and higher weapons trigger stronger visual feedback.
