export type ResourceKey = "warmth" | "mana" | "gold";
export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

export type EggType = {
  id: string;
  name: string;
  subtitle: string;
  hatchNeed: number;
  cost: Partial<Record<ResourceKey, number>>;
  resourcePerClick: Partial<Record<ResourceKey, number>>;
  hatchReward: Partial<Record<ResourceKey, number>>;
  rarityWeights: Record<Rarity, number>;
  accent: string;
  shell: string;
};

export type Dragon = {
  id: string;
  name: string;
  rarity: Rarity;
  element: string;
  quote: string;
  production: Partial<Record<ResourceKey, number>>;
};

export type Upgrade = {
  id: string;
  name: string;
  description: string;
  baseCost: Partial<Record<ResourceKey, number>>;
  maxLevel: number;
  value: (level: number) => string;
};

export const rarityLabels: Record<Rarity, string> = {
  Common: "Common",
  Rare: "Rare",
  Epic: "Epic",
  Legendary: "Legendary"
};

export const resources: Record<ResourceKey, { label: string; icon: string }> = {
  warmth: { label: "온기", icon: "🔥" },
  mana: { label: "마나", icon: "💧" },
  gold: { label: "골드", icon: "🪙" }
};

export const eggTypes: EggType[] = [
  {
    id: "basic",
    name: "기본 알",
    subtitle: "따뜻한 볏짚 둥지에서 금방 깨어나는 알",
    hatchNeed: 100,
    cost: {},
    resourcePerClick: { warmth: 1 },
    hatchReward: { gold: 12, mana: 3 },
    rarityWeights: { Common: 72, Rare: 23, Epic: 4.5, Legendary: 0.5 },
    accent: "#ffb84d",
    shell: "#fff0ba"
  },
  {
    id: "rare",
    name: "희귀 알",
    subtitle: "푸른 마나 결정이 박힌 반짝이는 알",
    hatchNeed: 150,
    cost: { warmth: 220, gold: 80 },
    resourcePerClick: { warmth: 1, mana: 1 },
    hatchReward: { gold: 24, mana: 12 },
    rarityWeights: { Common: 45, Rare: 40, Epic: 13, Legendary: 2 },
    accent: "#69d7ff",
    shell: "#c8f4ff"
  },
  {
    id: "ancient",
    name: "고대 알",
    subtitle: "오래된 룬이 맥동하는 전설의 알",
    hatchNeed: 230,
    cost: { warmth: 620, mana: 180, gold: 260 },
    resourcePerClick: { warmth: 2, mana: 1 },
    hatchReward: { gold: 55, mana: 28 },
    rarityWeights: { Common: 20, Rare: 38, Epic: 32, Legendary: 10 },
    accent: "#b88cff",
    shell: "#eadcff"
  }
];

export const dragons: Dragon[] = [
  { id: "ember-pip", name: "엠버피프", rarity: "Common", element: "불씨", quote: "작은 불씨로 둥지를 데워요.", production: { warmth: 0.5 } },
  { id: "dew-mimi", name: "듀미미", rarity: "Common", element: "이슬", quote: "마나 방울을 톡톡 모아요.", production: { mana: 0.15 } },
  { id: "coin-tail", name: "코인테일", rarity: "Common", element: "황금", quote: "반짝이는 꼬리로 동전을 찾아요.", production: { gold: 0.25 } },
  { id: "moss-nap", name: "모스냅", rarity: "Common", element: "숲", quote: "알이 편안하게 쉬도록 풀향을 내요.", production: { warmth: 0.35, gold: 0.1 } },
  { id: "aqua-pop", name: "아쿠아팝", rarity: "Rare", element: "물", quote: "파란 균열을 부드럽게 열어요.", production: { mana: 0.45, warmth: 0.2 } },
  { id: "ruby-horn", name: "루비혼", rarity: "Rare", element: "보석", quote: "루비 뿔이 골드를 끌어당겨요.", production: { gold: 0.75 } },
  { id: "cloud-bun", name: "클라우드번", rarity: "Rare", element: "구름", quote: "폭신한 숨결로 클릭감을 가볍게 해요.", production: { warmth: 0.65, mana: 0.2 } },
  { id: "spark-sage", name: "스파크세이지", rarity: "Epic", element: "번개", quote: "완벽한 타이밍을 번쩍 알려줘요.", production: { mana: 0.9, gold: 0.55 } },
  { id: "sunny-orbit", name: "써니오빗", rarity: "Epic", element: "태양", quote: "작은 태양처럼 부화장을 밝힙니다.", production: { warmth: 1.35, gold: 0.45 } },
  { id: "opal-wing", name: "오팔윙", rarity: "Epic", element: "환상", quote: "오팔빛 날개가 희귀한 기운을 남겨요.", production: { mana: 0.75, warmth: 0.85 } },
  { id: "aurora-king", name: "오로라킹", rarity: "Legendary", element: "오로라", quote: "부화장 하늘에 축제를 펼쳐요.", production: { warmth: 2.2, mana: 1.4, gold: 1.2 } },
  { id: "chrono-whelp", name: "크로노웰프", rarity: "Legendary", element: "시간", quote: "다음 알이 깨어날 순간을 당겨요.", production: { warmth: 1.6, mana: 1.6, gold: 1.6 } }
];

export const upgrades: Upgrade[] = [
  {
    id: "clickPower",
    name: "따뜻한 장갑",
    description: "클릭할 때 부화 게이지와 온기 획득량이 증가합니다.",
    baseCost: { warmth: 35 },
    maxLevel: 12,
    value: (level) => `클릭 파워 +${level}`
  },
  {
    id: "incubator",
    name: "포근한 부화장",
    description: "모든 드래곤의 자동 생산량이 증가합니다.",
    baseCost: { warmth: 80, gold: 25 },
    maxLevel: 10,
    value: (level) => `자동 생산 +${level * 12}%`
  },
  {
    id: "luckyCharm",
    name: "행운의 리본",
    description: "Rare 이상 드래곤 등장 확률을 밀어 올립니다.",
    baseCost: { mana: 25, gold: 40 },
    maxLevel: 8,
    value: (level) => `희귀 보정 +${level * 6}%`
  },
  {
    id: "crackLens",
    name: "균열 렌즈",
    description: "빛나는 균열 이벤트의 지속시간과 보너스가 증가합니다.",
    baseCost: { mana: 45 },
    maxLevel: 8,
    value: (level) => `Perfect Hatch +${level * 10}%`
  },
  {
    id: "nestMarket",
    name: "둥지 상점",
    description: "부화 보상 골드가 증가합니다.",
    baseCost: { gold: 65, warmth: 90 },
    maxLevel: 10,
    value: (level) => `부화 골드 +${level * 15}%`
  },
  {
    id: "manaFountain",
    name: "마나 분수",
    description: "클릭과 부화 보상으로 얻는 마나가 증가합니다.",
    baseCost: { mana: 60, gold: 70 },
    maxLevel: 10,
    value: (level) => `마나 획득 +${level * 12}%`
  }
];
