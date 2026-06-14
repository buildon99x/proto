import { dragons, eggTypes, upgrades, type Dragon, type EggType, type ResourceKey, type Rarity } from "./data";

export type Resources = Record<ResourceKey, number>;
export type UpgradeLevels = Record<string, number>;

export type GameState = {
  resources: Resources;
  activeEggId: string;
  unlockedEggIds: string[];
  hatchProgress: number;
  collection: Record<string, number>;
  upgradeLevels: UpgradeLevels;
  hatchCount: number;
  lastHatch?: Dragon;
  newDragonId?: string;
  perfectReadyUntil: number;
  perfectHits: number;
  floatingTexts: FloatingText[];
  eventLog: string[];
};

export type FloatingText = {
  id: number;
  text: string;
  x: number;
  y: number;
  kind: "warmth" | "perfect" | "hatch" | "resource";
};

let floatingId = 1;

export const emptyResources = (): Resources => ({ warmth: 0, mana: 0, gold: 0 });

export function createInitialState(): GameState {
  return {
    resources: { warmth: 10, mana: 0, gold: 0 },
    activeEggId: "basic",
    unlockedEggIds: ["basic"],
    hatchProgress: 0,
    collection: {},
    upgradeLevels: Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, 0])),
    hatchCount: 0,
    perfectReadyUntil: 0,
    perfectHits: 0,
    floatingTexts: [],
    eventLog: ["첫 번째 알이 둥지 중앙에서 따뜻하게 빛납니다."]
  };
}

export function activeEgg(state: GameState): EggType {
  return eggTypes.find((egg) => egg.id === state.activeEggId) ?? eggTypes[0];
}

export function getUpgradeLevel(state: GameState, id: string): number {
  return state.upgradeLevels[id] ?? 0;
}

export function clickPower(state: GameState): number {
  return 8 + getUpgradeLevel(state, "clickPower") * 2;
}

export function productionMultiplier(state: GameState): number {
  return 1 + getUpgradeLevel(state, "incubator") * 0.12;
}

export function crackBonusMultiplier(state: GameState): number {
  return 1.5 + getUpgradeLevel(state, "crackLens") * 0.1;
}

export function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return Object.entries(cost).every(([key, amount]) => resources[key as ResourceKey] >= (amount ?? 0));
}

export function addResources(resources: Resources, delta: Partial<Resources>): Resources {
  return {
    warmth: Math.max(0, resources.warmth + (delta.warmth ?? 0)),
    mana: Math.max(0, resources.mana + (delta.mana ?? 0)),
    gold: Math.max(0, resources.gold + (delta.gold ?? 0))
  };
}

export function subtractResources(resources: Resources, cost: Partial<Resources>): Resources {
  return addResources(resources, {
    warmth: -(cost.warmth ?? 0),
    mana: -(cost.mana ?? 0),
    gold: -(cost.gold ?? 0)
  });
}

export function upgradeCost(id: string, level: number): Partial<Resources> {
  const upgrade = upgrades.find((item) => item.id === id);
  if (!upgrade) return {};
  const scale = Math.pow(1.58, level);
  return Object.fromEntries(
    Object.entries(upgrade.baseCost).map(([key, value]) => [key, Math.ceil((value ?? 0) * scale)])
  ) as Partial<Resources>;
}

export function eggCost(egg: EggType): Partial<Resources> {
  return egg.cost;
}

function weightedRarity(state: GameState, egg: EggType): Rarity {
  const lucky = getUpgradeLevel(state, "luckyCharm") * 0.06;
  const adjusted = { ...egg.rarityWeights };
  adjusted.Common = Math.max(8, adjusted.Common * (1 - lucky));
  adjusted.Rare += adjusted.Rare * lucky * 0.7;
  adjusted.Epic += adjusted.Epic * lucky * 1.1;
  adjusted.Legendary += adjusted.Legendary * lucky * 1.35;

  const total = Object.values(adjusted).reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;
  for (const rarity of ["Common", "Rare", "Epic", "Legendary"] as Rarity[]) {
    roll -= adjusted[rarity];
    if (roll <= 0) return rarity;
  }
  return "Common";
}

function randomDragon(state: GameState, egg: EggType): Dragon {
  const rarity = weightedRarity(state, egg);
  const pool = dragons.filter((dragon) => dragon.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)] ?? dragons[0];
}

function rewardForHatch(state: GameState, egg: EggType): Partial<Resources> {
  const goldScale = 1 + getUpgradeLevel(state, "nestMarket") * 0.15;
  const manaScale = 1 + getUpgradeLevel(state, "manaFountain") * 0.12;
  return {
    warmth: egg.hatchReward.warmth ?? 0,
    mana: Math.round((egg.hatchReward.mana ?? 0) * manaScale),
    gold: Math.round((egg.hatchReward.gold ?? 0) * goldScale)
  };
}

export function handleEggClick(state: GameState, now = Date.now()): GameState {
  const egg = activeEgg(state);
  const perfectActive = now < state.perfectReadyUntil;
  const progressGain = clickPower(state) * (perfectActive ? crackBonusMultiplier(state) : 1);
  const manaScale = 1 + getUpgradeLevel(state, "manaFountain") * 0.12;
  const clickResources: Partial<Resources> = {
    warmth: (egg.resourcePerClick.warmth ?? 0) + getUpgradeLevel(state, "clickPower"),
    mana: Math.round((egg.resourcePerClick.mana ?? 0) * manaScale),
    gold: egg.resourcePerClick.gold ?? 0
  };

  let next: GameState = {
    ...state,
    resources: addResources(state.resources, clickResources),
    hatchProgress: Math.min(egg.hatchNeed, state.hatchProgress + progressGain),
    perfectReadyUntil: perfectActive ? 0 : state.perfectReadyUntil,
    perfectHits: state.perfectHits + (perfectActive ? 1 : 0),
    floatingTexts: [
      ...state.floatingTexts.slice(-8),
      {
        id: floatingId++,
        text: perfectActive ? "Perfect Hatch!" : `+${Math.round(progressGain)}`,
        x: 38 + Math.random() * 24,
        y: 36 + Math.random() * 16,
        kind: perfectActive ? "perfect" : "warmth"
      }
    ]
  };

  if (Math.random() < 0.075 + getUpgradeLevel(state, "crackLens") * 0.008 && !perfectActive) {
    next = {
      ...next,
      perfectReadyUntil: now + 2100 + getUpgradeLevel(state, "crackLens") * 180,
      eventLog: [`빛나는 균열이 열렸습니다. 지금 클릭하면 보너스!`, ...state.eventLog].slice(0, 5)
    };
  }

  if (next.hatchProgress >= egg.hatchNeed) {
    const dragon = randomDragon(next, egg);
    const isNew = !next.collection[dragon.id];
    next = {
      ...next,
      hatchProgress: 0,
      resources: addResources(next.resources, rewardForHatch(next, egg)),
      collection: {
        ...next.collection,
        [dragon.id]: (next.collection[dragon.id] ?? 0) + 1
      },
      hatchCount: next.hatchCount + 1,
      lastHatch: dragon,
      newDragonId: isNew ? dragon.id : next.newDragonId,
      floatingTexts: [
        ...next.floatingTexts,
        { id: floatingId++, text: `${dragon.name} 부화!`, x: 50, y: 28, kind: "hatch" }
      ],
      eventLog: [
        `${isNew ? "신규 등록" : "추가 획득"}: ${dragon.name} (${dragon.rarity})`,
        ...next.eventLog
      ].slice(0, 5)
    };
  }

  return next;
}

export function tickProduction(state: GameState, seconds: number): GameState {
  const delta = emptyResources();
  const multiplier = productionMultiplier(state);
  for (const [dragonId, count] of Object.entries(state.collection)) {
    const dragon = dragons.find((item) => item.id === dragonId);
    if (!dragon) continue;
    for (const [key, amount] of Object.entries(dragon.production)) {
      delta[key as ResourceKey] += (amount ?? 0) * count * seconds * multiplier;
    }
  }
  return {
    ...state,
    resources: addResources(state.resources, delta)
  };
}

export function buyUpgrade(state: GameState, id: string): GameState {
  const upgrade = upgrades.find((item) => item.id === id);
  if (!upgrade) return state;
  const level = getUpgradeLevel(state, id);
  if (level >= upgrade.maxLevel) return state;
  const cost = upgradeCost(id, level);
  if (!canAfford(state.resources, cost)) return state;
  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    upgradeLevels: { ...state.upgradeLevels, [id]: level + 1 },
    eventLog: [`${upgrade.name} Lv.${level + 1} 업그레이드 완료`, ...state.eventLog].slice(0, 5)
  };
}

export function buyOrSelectEgg(state: GameState, eggId: string): GameState {
  const egg = eggTypes.find((item) => item.id === eggId);
  if (!egg) return state;
  if (state.unlockedEggIds.includes(eggId)) {
    return { ...state, activeEggId: eggId, hatchProgress: 0 };
  }
  const cost = eggCost(egg);
  if (!canAfford(state.resources, cost)) return state;
  return {
    ...state,
    resources: subtractResources(state.resources, cost),
    activeEggId: eggId,
    unlockedEggIds: [...state.unlockedEggIds, eggId],
    hatchProgress: 0,
    eventLog: [`${egg.name}이 해금되었습니다.`, ...state.eventLog].slice(0, 5)
  };
}

export function collectionStats(state: GameState) {
  const owned = Object.keys(state.collection).length;
  const total = dragons.length;
  const production = emptyResources();
  for (const [dragonId, count] of Object.entries(state.collection)) {
    const dragon = dragons.find((item) => item.id === dragonId);
    if (!dragon) continue;
    for (const [key, amount] of Object.entries(dragon.production)) {
      production[key as ResourceKey] += (amount ?? 0) * count * productionMultiplier(state);
    }
  }
  return { owned, total, production };
}
