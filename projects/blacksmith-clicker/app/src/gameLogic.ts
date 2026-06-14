export type WeaponKind = "검" | "도끼" | "창" | "단검" | "활" | "지팡이" | "망치" | "방패";
export type WeaponGrade = "Common" | "Rare" | "Epic" | "Legendary";
export type WeaponQuality = "D" | "C" | "B" | "A" | "S";
export type WeaponElement = "무속성" | "불꽃" | "얼음" | "번개" | "독" | "신성";

export type MaterialKey = "iron" | "coal" | "crystal" | "essence";

export type Weapon = {
  id: string;
  kind: WeaponKind;
  grade: WeaponGrade;
  quality: WeaponQuality;
  element: WeaponElement;
  enhanceLevel: number;
  value: number;
  collectionScore: number;
};

export type UpgradeKey =
  | "hammer"
  | "workbench"
  | "furnace"
  | "staff"
  | "merchant"
  | "salvage"
  | "enhance";

export type Upgrade = {
  key: UpgradeKey;
  name: string;
  description: string;
  level: number;
  baseCost: number;
};

export type GameState = {
  gold: number;
  materials: Record<MaterialKey, number>;
  progress: number;
  target: number;
  clickPower: number;
  autoPower: number;
  pendingWeapon: Weapon | null;
  storedWeapons: Weapon[];
  recentWeapons: Weapon[];
  upgrades: Record<UpgradeKey, Upgrade>;
  lastFeedback: string;
  craftedCount: number;
};

const weaponKinds: WeaponKind[] = ["검", "도끼", "창", "단검", "활", "지팡이", "망치", "방패"];
const qualities: WeaponQuality[] = ["D", "C", "B", "A", "S"];
const elements: WeaponElement[] = ["무속성", "불꽃", "얼음", "번개", "독", "신성"];

const gradeWeights: Record<WeaponGrade, number> = {
  Common: 72,
  Rare: 20,
  Epic: 7,
  Legendary: 1
};

const gradeMultipliers: Record<WeaponGrade, number> = {
  Common: 1,
  Rare: 2.2,
  Epic: 4.5,
  Legendary: 9
};

const qualityMultipliers: Record<WeaponQuality, number> = {
  D: 0.8,
  C: 1,
  B: 1.35,
  A: 1.8,
  S: 2.6
};

export const materialLabels: Record<MaterialKey, string> = {
  iron: "철광석",
  coal: "석탄",
  crystal: "마력 결정",
  essence: "정수"
};

export function createInitialState(): GameState {
  return {
    gold: 120,
    materials: {
      iron: 8,
      coal: 6,
      crystal: 1,
      essence: 0
    },
    progress: 0,
    target: 100,
    clickPower: 9,
    autoPower: 1.4,
    pendingWeapon: null,
    storedWeapons: [],
    recentWeapons: [],
    craftedCount: 0,
    lastFeedback: "모루를 두드려 첫 무기를 완성하세요.",
    upgrades: {
      hammer: {
        key: "hammer",
        name: "망치 강화",
        description: "클릭당 제작 진행도 증가",
        level: 0,
        baseCost: 85
      },
      workbench: {
        key: "workbench",
        name: "제작대 확장",
        description: "제작 목표치 감소 및 상위 품질 기회 증가",
        level: 0,
        baseCost: 120
      },
      furnace: {
        key: "furnace",
        name: "화로 강화",
        description: "희귀 등급 등장 확률 증가",
        level: 0,
        baseCost: 140
      },
      staff: {
        key: "staff",
        name: "직원 고용",
        description: "초당 자동 제작 진행도 증가",
        level: 0,
        baseCost: 160
      },
      merchant: {
        key: "merchant",
        name: "상인 계약",
        description: "판매 가격 증가",
        level: 0,
        baseCost: 150
      },
      salvage: {
        key: "salvage",
        name: "분해 기술",
        description: "분해 재료 획득량 증가",
        level: 0,
        baseCost: 125
      },
      enhance: {
        key: "enhance",
        name: "강화 기술",
        description: "강화 비용 감소",
        level: 0,
        baseCost: 135
      }
    }
  };
}

export function applyProgress(state: GameState, amount: number): GameState {
  if (state.pendingWeapon) {
    return state;
  }

  const progress = state.progress + amount;
  if (progress < state.target) {
    return {
      ...state,
      progress,
      lastFeedback: amount >= state.clickPower ? `+${amount.toFixed(1)} 제작 진행` : state.lastFeedback
    };
  }

  const weapon = generateWeapon(state);
  return {
    ...state,
    progress: 0,
    pendingWeapon: weapon,
    craftedCount: state.craftedCount + 1,
    recentWeapons: [weapon, ...state.recentWeapons].slice(0, 6),
    lastFeedback: `${weapon.grade} ${weapon.quality} ${weapon.element} ${weapon.kind} 완성!`
  };
}

export function buyUpgrade(state: GameState, key: UpgradeKey): GameState {
  const upgrade = state.upgrades[key];
  const cost = upgradeCost(upgrade);

  if (state.gold < cost) {
    return {
      ...state,
      lastFeedback: `${upgrade.name} 구매에 골드가 부족합니다.`
    };
  }

  const nextUpgrade = { ...upgrade, level: upgrade.level + 1 };
  const nextUpgrades = {
    ...state.upgrades,
    [key]: nextUpgrade
  };

  return recomputeDerivedStats({
    ...state,
    gold: state.gold - cost,
    upgrades: nextUpgrades,
    lastFeedback: `${upgrade.name} Lv.${nextUpgrade.level} 적용`
  });
}

export function sellWeapon(state: GameState, weapon: Weapon): GameState {
  const bonus = 1 + state.upgrades.merchant.level * 0.14;
  const gained = Math.round(weapon.value * bonus);

  return {
    ...state,
    gold: state.gold + gained,
    pendingWeapon: null,
    lastFeedback: `판매 +${gained.toLocaleString()} 골드`
  };
}

export function salvageWeapon(state: GameState, weapon: Weapon): GameState {
  const base = Math.max(2, Math.ceil(weapon.value / 45));
  const bonus = 1 + state.upgrades.salvage.level * 0.2;
  const gradeBonus = weapon.grade === "Legendary" ? 4 : weapon.grade === "Epic" ? 2 : weapon.grade === "Rare" ? 1 : 0;
  const iron = Math.ceil((base + gradeBonus) * bonus);
  const coal = Math.ceil((base / 2 + gradeBonus) * bonus);
  const crystal = weapon.grade === "Epic" || weapon.grade === "Legendary" ? 1 + gradeBonus : 0;
  const essence = weapon.grade === "Legendary" ? 1 : 0;

  return {
    ...state,
    materials: {
      iron: state.materials.iron + iron,
      coal: state.materials.coal + coal,
      crystal: state.materials.crystal + crystal,
      essence: state.materials.essence + essence
    },
    pendingWeapon: null,
    lastFeedback: `분해 +철광석 ${iron}, +석탄 ${coal}${crystal ? `, +결정 ${crystal}` : ""}${essence ? ", +정수 1" : ""}`
  };
}

export function enhanceWeapon(state: GameState, weapon: Weapon): GameState {
  const cost = enhanceCost(state, weapon);
  if (state.gold < cost.gold || state.materials.iron < cost.iron || state.materials.crystal < cost.crystal) {
    return {
      ...state,
      lastFeedback: `강화 비용 부족: ${cost.gold} 골드, 철광석 ${cost.iron}, 결정 ${cost.crystal}`
    };
  }

  const enhanced: Weapon = {
    ...weapon,
    enhanceLevel: weapon.enhanceLevel + 1,
    value: Math.round(weapon.value * 1.38 + 24),
    collectionScore: Math.round(weapon.collectionScore * 1.24 + 10)
  };

  return {
    ...state,
    gold: state.gold - cost.gold,
    materials: {
      ...state.materials,
      iron: state.materials.iron - cost.iron,
      crystal: state.materials.crystal - cost.crystal
    },
    pendingWeapon: enhanced,
    lastFeedback: `${enhanced.kind} +${enhanced.enhanceLevel} 강화 성공`
  };
}

export function storeWeapon(state: GameState, weapon: Weapon): GameState {
  return {
    ...state,
    storedWeapons: [weapon, ...state.storedWeapons].slice(0, 24),
    pendingWeapon: null,
    lastFeedback: `${weaponLabel(weapon)} 보관 완료`
  };
}

export function upgradeCost(upgrade: Upgrade): number {
  return Math.round(upgrade.baseCost * Math.pow(1.62, upgrade.level));
}

export function enhanceCost(state: GameState, weapon: Weapon) {
  const discount = Math.max(0.45, 1 - state.upgrades.enhance.level * 0.08);
  return {
    gold: Math.round((55 + weapon.value * 0.28 + weapon.enhanceLevel * 45) * discount),
    iron: Math.max(2, Math.ceil((3 + weapon.enhanceLevel * 2) * discount)),
    crystal: weapon.grade === "Common" ? 0 : 1 + Math.floor(weapon.enhanceLevel / 2)
  };
}

export function weaponLabel(weapon: Weapon): string {
  return `${weapon.grade} ${weapon.quality} ${weapon.element} ${weapon.kind} +${weapon.enhanceLevel}`;
}

function recomputeDerivedStats(state: GameState): GameState {
  return {
    ...state,
    clickPower: 9 + state.upgrades.hammer.level * 4,
    autoPower: 1.4 + state.upgrades.staff.level * 1.8,
    target: Math.max(58, 100 - state.upgrades.workbench.level * 7)
  };
}

function generateWeapon(state: GameState): Weapon {
  const grade = pickGrade(state.upgrades.furnace.level);
  const quality = pickQuality(state.upgrades.workbench.level);
  const kind = pick(weaponKinds);
  const element = pick(elements);
  const baseValue = 38 + Math.floor(Math.random() * 28);
  const elementBonus = element === "무속성" ? 0 : 18;
  const value = Math.round((baseValue + elementBonus) * gradeMultipliers[grade] * qualityMultipliers[quality]);

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    grade,
    quality,
    element,
    enhanceLevel: 0,
    value,
    collectionScore: Math.round(value * (grade === "Legendary" ? 1.8 : grade === "Epic" ? 1.45 : 1.1))
  };
}

function pickGrade(furnaceLevel: number): WeaponGrade {
  const bonus = furnaceLevel * 4;
  const weights = {
    Common: Math.max(30, gradeWeights.Common - bonus * 2),
    Rare: gradeWeights.Rare + bonus,
    Epic: gradeWeights.Epic + Math.floor(bonus * 0.75),
    Legendary: gradeWeights.Legendary + Math.floor(bonus * 0.35)
  };
  const total = weights.Common + weights.Rare + weights.Epic + weights.Legendary;
  const roll = Math.random() * total;

  if (roll < weights.Legendary) return "Legendary";
  if (roll < weights.Legendary + weights.Epic) return "Epic";
  if (roll < weights.Legendary + weights.Epic + weights.Rare) return "Rare";
  return "Common";
}

function pickQuality(workbenchLevel: number): WeaponQuality {
  const weights = [
    Math.max(12, 38 - workbenchLevel * 3),
    28,
    20 + workbenchLevel,
    10 + workbenchLevel * 1.5,
    4 + workbenchLevel
  ];
  const total = weights.reduce((sum, item) => sum + item, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < qualities.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return qualities[index];
  }
  return "D";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
