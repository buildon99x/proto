/** Local, single-player simulation. All helpers mutate the supplied state.
 * React callers should structuredClone state before act/tickEconomy.
 * Combat positions and live enemy HP deliberately remain in the action scene.
 */
export type SpeciesId = 'slime' | 'mushroom' | 'stump' | 'octopus' | 'boar' | 'rare';
export type FacilityType = 'storage' | 'workbench' | 'logging' | 'farm' | 'quarry' | 'kitchen';
export type WorkType = 'transport' | 'crafting' | 'logging' | 'farming' | 'mining' | 'cooking';
export type ItemId = 'wood' | 'stone' | 'berry' | 'herb' | 'essence' | 'ore' | 'hide' | 'crystal' | 'plank' | 'brick' | 'ingot' | 'card' | 'enhancedCard' | 'royalCard' | 'food' | 'potion' | 'feast' | 'sword' | 'ironSword' | 'armor' | 'boots' | 'charm' | 'guardianBlade';
export type CardId = 'card' | 'enhancedCard' | 'royalCard';
export type RecipeId = 'sword' | 'card' | 'enhancedCard' | 'food' | 'potion' | 'plank' | 'brick' | 'ingot' | 'ironSword' | 'armor' | 'boots' | 'charm' | 'royalCard' | 'feast' | 'guardianBlade';
export type Inventory = Record<ItemId, number>;
export type Materials = Partial<Inventory>;

export interface Species {
  id: SpeciesId; name: string; subtitle: string; color: string; hp: number; attack: number; level: number;
  captureRate: number; work: Partial<Record<WorkType, number>>; skill: string; description: string;
}
export const WORK_NAMES: Record<WorkType, string> = { transport: '운반', crafting: '제작', logging: '벌목', farming: '농사', mining: '채광', cooking: '조리' };
export const SPECIES: Record<SpeciesId, Species> = {
  slime: { id: 'slime', name: '이끼 슬라임', subtitle: '풀밭의 작은 운반꾼', color: '#bce969', hp: 42, attack: 6, level: 1, captureRate: .92, work: { transport: 2, crafting: 1 }, skill: '통통 점프', description: '가벼운 몸으로 높이 뛰고, 캠프의 생산물을 창고로 옮겨요.' },
  mushroom: { id: 'mushroom', name: '노을 버섯', subtitle: '다정한 숲의 정원사', color: '#ed9168', hp: 60, attack: 8, level: 2, captureRate: .83, work: { farming: 2, cooking: 1 }, skill: '포자 폭발', description: '포자로 적을 느리게 해요. 텃밭과 주방에서 특히 행복해요.' },
  stump: { id: 'stump', name: '꼬마 그루터기', subtitle: '성실한 나무 친구', color: '#b68c62', hp: 85, attack: 10, level: 3, captureRate: .76, work: { logging: 2, transport: 1 }, skill: '나무껍질 방패', description: '단단한 껍질로 탐험가를 지키고, 꾸준히 목재를 모아요.' },
  octopus: { id: 'octopus', name: '솜사탕 문어', subtitle: '여덟 팔의 공방 장인', color: '#d6b1ee', hp: 72, attack: 11, level: 4, captureRate: .7, work: { crafting: 3, transport: 1, cooking: 2 }, skill: '반짝이 탐지', description: '숨은 자원을 찾아요. 여러 팔로 제작 대기열도 빠르게 처리해요.' },
  boar: { id: 'boar', name: '숲멧돼지', subtitle: '씩씩한 바위 탐험가', color: '#b99388', hp: 115, attack: 15, level: 5, captureRate: .62, work: { mining: 2, logging: 1 }, skill: '힘찬 돌진', description: '강한 돌진으로 적을 밀치고, 채석장에서 돌과 광석을 캐요.' },
  rare: { id: 'rare', name: '별빛 슬라임', subtitle: '달빛 속의 희귀한 친구', color: '#90d5e9', hp: 100, attack: 13, level: 6, captureRate: .36, work: { transport: 3, farming: 2, cooking: 3 }, skill: '별빛 회복', description: '반짝이는 회복의 기운을 나눠요. 캠프에서 무엇이든 척척 해내요.' },
};

const item = (id: ItemId, name: string, icon: string, color = '#d9c9a5') => ({ id, name, icon, color });
export const ITEMS: Record<ItemId, ReturnType<typeof item>> = {
  wood: item('wood', '목재', '🪵'), stone: item('stone', '돌', '◆', '#bdc6cc'), berry: item('berry', '숲 열매', '●', '#e7948d'), herb: item('herb', '약초', '❧', '#a9d88d'),
  essence: item('essence', '몬스터 정수', '✦', '#c6acf1'), ore: item('ore', '철광석', '⬡', '#aebcc8'), hide: item('hide', '튼튼한 가죽', '◈'), crystal: item('crystal', '수호자의 결정', '✧', '#9cdcec'),
  plank: item('plank', '다듬은 목재', '▰'), brick: item('brick', '석재 블록', '▦'), ingot: item('ingot', '철 주괴', '▱', '#bed2d9'),
  card: item('card', '몬스터 카드', '▣', '#d7edb3'), enhancedCard: item('enhancedCard', '강화 카드', '▣', '#a9dcea'), royalCard: item('royalCard', '별빛 카드', '▣', '#d7b7ef'),
  food: item('food', '열매 도시락', '🥣'), potion: item('potion', '회복 물약', '⚱', '#e9a4aa'), feast: item('feast', '숲의 만찬', '♨', '#e6c593'),
  sword: item('sword', '탐험가의 목검', '⚔'), ironSword: item('ironSword', '숲지기의 검', '⚔', '#c1d7db'), armor: item('armor', '숲지기의 조끼', '◒'),
  boots: item('boots', '가벼운 탐험화', '♧'), charm: item('charm', '탐험가의 부적', '✺', '#dcc0e9'), guardianBlade: item('guardianBlade', '별빛 수호검', '⚔', '#99e5e0'),
};

export interface FacilityDefinition { id: FacilityType; name: string; description: string; work: WorkType; cost: Materials; level: number; seconds: number; capacity: number; output: Materials; icon: string }
export const FACILITIES: Record<FacilityType, FacilityDefinition> = {
  storage: { id: 'storage', name: '숲속 보관함', description: '운반 친구가 시설의 완성품을 가방으로 옮겨요.', work: 'transport', cost: { wood: 4, stone: 2 }, level: 1, seconds: 3, capacity: 24, output: {}, icon: '▦' },
  workbench: { id: 'workbench', name: '작은 작업대', description: '카드와 장비를 만들어요. 제작 친구가 있으면 더 빨라요.', work: 'crafting', cost: { wood: 8, stone: 4 }, level: 1, seconds: 1, capacity: 24, output: {}, icon: '⚒' },
  logging: { id: 'logging', name: '바람 벌목장', description: '벌목 친구가 목재를 꾸준히 생산해요.', work: 'logging', cost: { wood: 8, stone: 4 }, level: 2, seconds: 8, capacity: 24, output: { wood: 3 }, icon: '♧' },
  farm: { id: 'farm', name: '햇살 텃밭', description: '농사 친구가 열매와 약초를 길러요.', work: 'farming', cost: { wood: 6, stone: 4 }, level: 2, seconds: 10, capacity: 24, output: { berry: 3, herb: 1 }, icon: '❧' },
  quarry: { id: 'quarry', name: '반짝 채석장', description: '채광 친구가 돌과 철광석을 찾아내요.', work: 'mining', cost: { wood: 8, stone: 6 }, level: 2, seconds: 12, capacity: 24, output: { stone: 3, ore: 2 }, icon: '◆' },
  kitchen: { id: 'kitchen', name: '포근한 주방', description: '도시락과 만찬을 만들어요. 조리 친구가 더 빨리 완성해요.', work: 'cooking', cost: { wood: 6, stone: 6 }, level: 2, seconds: 1, capacity: 24, output: {}, icon: '♨' },
};
export interface Recipe { id: RecipeId; name: string; description: string; ingredients: Materials; output: Materials; seconds: number; level: number; facility: 'workbench' | 'kitchen'; category: 'equipment' | 'cards' | 'food' | 'materials' }
export const RECIPES: Record<RecipeId, Recipe> = {
  sword: { id: 'sword', name: '탐험가의 목검', description: '공격력 +8 · 완성하면 자동 장착', ingredients: { wood: 4 }, output: { sword: 1 }, seconds: 3, level: 1, facility: 'workbench', category: 'equipment' },
  card: { id: 'card', name: '몬스터 카드 ×4', description: '야생 친구를 담는 가장 작은 약속', ingredients: { wood: 2, essence: 1 }, output: { card: 4 }, seconds: 6, level: 1, facility: 'workbench', category: 'cards' },
  enhancedCard: { id: 'enhancedCard', name: '강화 카드 ×3', description: '기본 카드보다 포획 확률이 높아요', ingredients: { plank: 1, essence: 2, ore: 1 }, output: { enhancedCard: 3 }, seconds: 10, level: 2, facility: 'workbench', category: 'cards' },
  food: { id: 'food', name: '열매 도시락 ×2', description: '체력 35 회복 · 지친 친구의 식사', ingredients: { berry: 3 }, output: { food: 2 }, seconds: 5, level: 1, facility: 'workbench', category: 'food' },
  potion: { id: 'potion', name: '회복 물약 ×2', description: '체력 65 회복', ingredients: { herb: 3, berry: 1 }, output: { potion: 2 }, seconds: 7, level: 1, facility: 'workbench', category: 'food' },
  plank: { id: 'plank', name: '다듬은 목재 ×2', description: '더 튼튼한 제작 재료', ingredients: { wood: 5 }, output: { plank: 2 }, seconds: 5, level: 1, facility: 'workbench', category: 'materials' },
  brick: { id: 'brick', name: '석재 블록 ×2', description: '단단한 장비를 위한 재료', ingredients: { stone: 5 }, output: { brick: 2 }, seconds: 5, level: 1, facility: 'workbench', category: 'materials' },
  ingot: { id: 'ingot', name: '철 주괴 ×2', description: '장비에 강한 힘을 더해요', ingredients: { ore: 4, wood: 2 }, output: { ingot: 2 }, seconds: 9, level: 2, facility: 'workbench', category: 'materials' },
  ironSword: { id: 'ironSword', name: '숲지기의 검', description: '공격력 +20 · 완성하면 자동 장착', ingredients: { plank: 2, ingot: 3, essence: 3 }, output: { ironSword: 1 }, seconds: 16, level: 2, facility: 'workbench', category: 'equipment' },
  armor: { id: 'armor', name: '숲지기의 조끼', description: '최대 체력 +30 · 방어력 +5', ingredients: { hide: 3, plank: 2, brick: 1 }, output: { armor: 1 }, seconds: 14, level: 2, facility: 'workbench', category: 'equipment' },
  boots: { id: 'boots', name: '가벼운 탐험화', description: '이동 속도 +12% · 채집량 +1', ingredients: { hide: 2, plank: 1 }, output: { boots: 1 }, seconds: 10, level: 2, facility: 'workbench', category: 'equipment' },
  charm: { id: 'charm', name: '탐험가의 부적', description: '포획 확률 +12% · 최대 체력 +15', ingredients: { essence: 6, ingot: 1, herb: 3 }, output: { charm: 1 }, seconds: 12, level: 3, facility: 'workbench', category: 'equipment' },
  royalCard: { id: 'royalCard', name: '별빛 카드 ×3', description: '희귀한 친구를 위한 가장 강한 카드', ingredients: { enhancedCard: 2, essence: 4, ingot: 1 }, output: { royalCard: 3 }, seconds: 12, level: 3, facility: 'workbench', category: 'cards' },
  feast: { id: 'feast', name: '숲의 만찬 ×2', description: '체력 완전 회복 · 친구의 든든한 식사', ingredients: { berry: 5, herb: 3 }, output: { feast: 2 }, seconds: 10, level: 2, facility: 'kitchen', category: 'food' },
  guardianBlade: { id: 'guardianBlade', name: '별빛 수호검', description: '공격력 +32 · 숲의 수호자에게 받은 힘', ingredients: { crystal: 2, ingot: 4, plank: 3 }, output: { guardianBlade: 1 }, seconds: 20, level: 3, facility: 'workbench', category: 'equipment' },
};

export interface Monster { id: string; species: SpeciesId; level: number; vitality: number; bond: number; resting?: boolean }
export interface Facility { id: string; type: FacilityType; slot: number; workerId: string | null; buffer: Materials; progress: number }
export interface CraftJob { id: string; recipeId: RecipeId; facilityId: string; remaining: number; total: number }
export interface GameState {
  version: 1; inventory: Inventory; monsters: Monster[]; facilities: Facility[]; queue: CraftJob[];
  partnerId: string | null; equipment: { weapon: number; armor: number; tool: number; charm: number }; hp: number; maxHp: number;
  research: number; campLevel: number; completedQuests: string[]; encountered: SpeciesId[]; nextId: number; playSeconds: number;
  stats: { gathered: number; woodGathered: number; captured: number; killed: number; crafted: number; cardsCrafted: number; produced: number; transported: number; campVisits: number };
  flags: { campUnlocked: boolean; bossDefeated: boolean; introSeen: boolean; automationStarted: boolean; transportAssigned: boolean };
  settings: { muted: boolean; reducedMotion: boolean };
}
export interface Quest { id: string; title: string; description: string; hint: string; reward: Materials; research: number; complete: (state: GameState) => boolean }
export const QUESTS: Quest[] = [
  { id: 'gather', title: '숲의 첫 선물', description: '목재를 4개 모으세요', hint: '반짝이는 나무 곁에서 E · 채집', reward: { berry: 2 }, research: 2, complete: s => s.stats.woodGathered >= 4 },
  { id: 'sword', title: '탐험 준비', description: '탐험가의 목검을 만드세요', hint: '제작 탭 → 탐험가의 목검', reward: { essence: 2 }, research: 3, complete: s => s.equipment.weapon >= 1 },
  { id: 'capture', title: '첫 번째 친구', description: '야생 몬스터를 처음 포획하세요', hint: '체력을 낮춘 뒤 F · 첫 포획은 반드시 성공해요', reward: { wood: 4, stone: 2 }, research: 5, complete: s => s.stats.captured >= 1 },
  { id: 'camp', title: '우리의 작은 캠프', description: '친구와 함께 캠프로 돌아오세요', hint: 'B · 캠프로 귀환', reward: { food: 2, wood: 3 }, research: 3, complete: s => s.stats.campVisits > 0 },
  { id: 'storage', title: '함께 일하는 즐거움', description: '운반 친구가 첫 목재를 옮길 때까지 기다리세요', hint: '보관함 건설 → 이끼 슬라임 배치 → 약 3초 기다리기', reward: { wood: 4, essence: 2 }, research: 5, complete: s => s.flags.transportAssigned && s.stats.transported >= 1 },
  { id: 'cards', title: '새로운 만남의 준비', description: '몬스터 카드를 제작하세요', hint: '목재 2개 + 정수 1개 → 카드 4장', reward: { enhancedCard: 2 }, research: 5, complete: s => s.stats.cardsCrafted > 0 },
  { id: 'collection', title: '숲이 넓어지는 순간', description: '서로 다른 친구 2종을 모으세요', hint: '그루터기는 벌목, 버섯은 농사를 잘해요', reward: { wood: 6, stone: 6 }, research: 6, complete: s => new Set(s.monsters.map(m => m.species)).size >= 2 },
  { id: 'automation', title: '살아 움직이는 캠프', description: '생산 시설에 친구를 배치하고 자원을 만드세요', hint: '벌목장·텃밭·채석장 중 하나를 건설하고 배치', reward: { ore: 4, hide: 2 }, research: 8, complete: s => s.stats.produced >= 3 },
  { id: 'equipment', title: '깊은 숲을 향하여', description: '숲지기의 검 또는 조끼를 만드세요', hint: '원자재를 다듬어 장비를 강화하세요', reward: { potion: 3, enhancedCard: 3 }, research: 8, complete: s => s.equipment.weapon >= 2 || s.equipment.armor >= 1 },
  { id: 'guardian', title: '숲의 새로운 수호자', description: '숲 끝의 고대 수호자를 물리치세요', hint: '붉은 예고를 피하고, Q 브레이크와 R 동행 능력을 활용하세요', reward: { royalCard: 3 }, research: 15, complete: s => s.flags.bossDefeated },
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const entries = (m: Materials) => Object.entries(m) as [ItemId, number][];
const materialCount = (m: Materials) => entries(m).reduce((sum, [, count]) => sum + count, 0);
const validKey = <T extends object>(object: T, key: unknown): key is keyof T => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);
export function emptyInventory(): Inventory { return Object.fromEntries(Object.keys(ITEMS).map(key => [key, 0])) as Inventory; }
export function createGame(): GameState {
  return {
    version: 1, inventory: { ...emptyInventory(), card: 8, food: 2, berry: 4 }, monsters: [],
    facilities: [{ id: 'facility-0', type: 'workbench', slot: 0, workerId: null, buffer: {}, progress: 0 }], queue: [],
    partnerId: null, equipment: { weapon: 0, armor: 0, tool: 0, charm: 0 }, hp: 100, maxHp: 100, research: 0, campLevel: 1,
    completedQuests: [], encountered: [], nextId: 1, playSeconds: 0,
    stats: { gathered: 0, woodGathered: 0, captured: 0, killed: 0, crafted: 0, cardsCrafted: 0, produced: 0, transported: 0, campVisits: 0 },
    flags: { campUnlocked: false, bossDefeated: false, introSeen: false, automationStarted: false, transportAssigned: false },
    settings: { muted: false, reducedMotion: false },
  };
}
export function canAfford(state: GameState, cost: Materials): boolean { return entries(cost).every(([id, count]) => count >= 0 && state.inventory[id] >= count); }
function grant(state: GameState, items: Materials) { for (const [id, count] of entries(items)) state.inventory[id] = Math.min(99999, state.inventory[id] + count); }
function pay(state: GameState, items: Materials) { for (const [id, count] of entries(items)) state.inventory[id] -= count; }
export function getWorkLevel(monster: Monster | SpeciesId, work: WorkType): number { return SPECIES[typeof monster === 'string' ? monster : monster.species].work[work] ?? 0; }
export function getPlayerStats(state: GameState) {
  return { attack: 8 + [0, 8, 20, 32][state.equipment.weapon], defense: state.equipment.armor * 5, maxHp: 100 + state.equipment.armor * 30 + state.equipment.charm * 15, speed: state.equipment.tool ? 1.12 : 1, gatherBonus: state.equipment.tool ? 1 : 0 };
}
export function currentQuest(state: GameState): Quest | undefined { return QUESTS.find(q => !state.completedQuests.includes(q.id)); }
export function advanceProgress(state: GameState): string[] {
  const messages: string[] = [];
  for (const quest of QUESTS) {
    if (state.completedQuests.includes(quest.id)) continue;
    if (!quest.complete(state)) break;
    state.completedQuests.push(quest.id); grant(state, quest.reward); state.research += quest.research;
    messages.push(`연구 완료 · ${quest.title}`);
  }
  const kinds = new Set(state.monsters.map(m => m.species)).size;
  const level = kinds >= 4 || state.flags.bossDefeated ? 3 : kinds >= 2 ? 2 : 1;
  if (level > state.campLevel) messages.push(`캠프 Lv.${level} · 새로운 설계도 해금!`);
  state.campLevel = Math.max(state.campLevel, level);
  return messages;
}
export function captureChance(state: GameState, species: SpeciesId, hpRatio: number, groggy = false, enhanced: boolean | CardId = false): number {
  if (!validKey(SPECIES, species) || !Number.isFinite(hpRatio) || hpRatio <= 0) return 0;
  if (state.stats.captured === 0) return 1;
  const card: CardId = typeof enhanced === 'string' ? enhanced : enhanced ? 'enhancedCard' : 'card';
  const power = { card: .55, enhancedCard: .8, royalCard: 1.1 }[card];
  if (!power) return 0;
  const hp = clamp(hpRatio, 0, 1);
  const hpBonus = hp <= .1 ? 1.8 : hp <= .3 ? 1.45 : hp <= .5 ? 1.15 : hp <= .7 ? .95 : .75;
  const levelModifier = clamp(1 - Math.max(0, SPECIES[species].level - (state.campLevel * 2 + state.equipment.weapon)) * .055, .7, 1);
  return clamp(SPECIES[species].captureRate * power * hpBonus * (groggy ? 1.25 : 1) * levelModifier * (state.equipment.charm ? 1.12 : 1), .03, .9);
}

export type GameAction =
  | { type: 'gather'; item: ItemId; amount: number }
  | { type: 'encounter'; species: SpeciesId }
  | { type: 'kill'; species: SpeciesId }
  | { type: 'capture'; species: SpeciesId; hpRatio: number; groggy?: boolean; enhanced?: boolean; card?: CardId; roll?: number }
  | { type: 'build'; facility: FacilityType; slot?: number }
  | { type: 'assign'; facilityId: string; monsterId: string | null }
  | { type: 'partner'; monsterId: string | null }
  | { type: 'craft'; recipeId: RecipeId }
  | { type: 'collect'; facilityId: string }
  | { type: 'stageDelivery'; facilityId: string }
  | { type: 'heal'; item?: 'food' | 'potion' | 'feast' }
  | { type: 'feed'; monsterId?: string }
  | { type: 'damage'; amount: number }
  | { type: 'camp' } | { type: 'boss' };
export interface ActionResult { ok: boolean; message: string; captured?: Monster; chance?: number; events?: string[] }
export type Action = GameAction;
const failure = (message: string): ActionResult => ({ ok: false, message });
function finish(state: GameState, message: string, extra: Partial<ActionResult> = {}): ActionResult { return { ok: true, message, events: advanceProgress(state), ...extra }; }
function discover(state: GameState, species: SpeciesId) { if (!state.encountered.includes(species)) state.encountered.push(species); }
function collectBuffer(state: GameState, facility: Facility, maximum = Infinity): number {
  let collected = 0;
  for (const [id, count] of entries(facility.buffer)) {
    const move = Math.min(count, maximum - collected, 99999 - state.inventory[id]);
    if (move <= 0) continue;
    state.inventory[id] += move; facility.buffer[id] = count - move; collected += move;
  }
  return collected;
}
function equipmentCrafted(state: GameState, recipe: Recipe) {
  const previousMax = state.maxHp;
  if (recipe.id === 'sword') state.equipment.weapon = Math.max(1, state.equipment.weapon);
  if (recipe.id === 'ironSword') state.equipment.weapon = Math.max(2, state.equipment.weapon);
  if (recipe.id === 'guardianBlade') state.equipment.weapon = 3;
  if (recipe.id === 'armor') state.equipment.armor = 1;
  if (recipe.id === 'boots') state.equipment.tool = 1;
  if (recipe.id === 'charm') state.equipment.charm = 1;
  state.maxHp = getPlayerStats(state).maxHp;
  state.hp = Math.min(state.maxHp, state.hp + Math.max(0, state.maxHp - previousMax));
}
export function act(state: GameState, action: GameAction): ActionResult {
  switch (action.type) {
    case 'gather': {
      if (!['wood', 'stone', 'berry', 'herb', 'ore', 'essence'].includes(action.item) || !Number.isInteger(action.amount) || action.amount <= 0 || action.amount > 50) return failure('채집할 자원을 확인해 주세요');
      const amount = action.amount + getPlayerStats(state).gatherBonus;
      grant(state, { [action.item]: amount }); state.stats.gathered += amount;
      if (action.item === 'wood') state.stats.woodGathered += amount;
      return finish(state, `${ITEMS[action.item].name} +${amount}`);
    }
    case 'encounter': {
      if (!validKey(SPECIES, action.species)) return failure('알 수 없는 몬스터예요');
      discover(state, action.species); return finish(state, `${SPECIES[action.species].name} 발견`);
    }
    case 'kill': {
      if (!validKey(SPECIES, action.species)) return failure('알 수 없는 몬스터예요');
      discover(state, action.species); state.stats.killed++;
      const loot: Record<SpeciesId, Materials> = { slime: { essence: 2, berry: 1 }, mushroom: { essence: 2, herb: 2 }, stump: { essence: 2, wood: 3 }, octopus: { essence: 3, ore: 2 }, boar: { essence: 2, hide: 2, ore: 1 }, rare: { essence: 5, herb: 3 } };
      grant(state, loot[action.species]); return finish(state, `${SPECIES[action.species].name} 조사 완료 · 정수 획득`);
    }
    case 'capture': {
      if (!validKey(SPECIES, action.species)) return failure('수호자는 포획할 수 없어요');
      if (!Number.isFinite(action.hpRatio) || action.hpRatio <= 0 || action.hpRatio > 1) return failure('살아 있는 몬스터를 대상으로 선택하세요');
      if (state.monsters.length >= 60) return failure('몬스터북이 가득 찼어요 (최대 60마리)');
      const kindsAfter = new Set([...state.monsters.map(m => m.species), action.species]);
      if (60 - (state.monsters.length + 1) < Object.keys(SPECIES).length - kindsAfter.size) return failure('아직 만나지 못한 종류의 친구를 위해 몬스터북 자리를 남겨 두었어요');
      const card = action.card ?? (action.enhanced ? 'enhancedCard' : 'card');
      if (!['card', 'enhancedCard', 'royalCard'].includes(card) || state.inventory[card] < 1) return failure('선택한 카드가 없어요 · 제작 탭에서 만들 수 있어요');
      if (action.roll !== undefined && (!Number.isFinite(action.roll) || action.roll < 0 || action.roll > 1)) return failure('포획 값을 확인해 주세요');
      const chance = captureChance(state, action.species, action.hpRatio, !!action.groggy, card);
      state.inventory[card]--; discover(state, action.species);
      if ((action.roll ?? Math.random()) >= chance && chance < 1) return { ok: false, message: '카드에서 빠져나왔어요! 체력을 낮추거나 브레이크를 노려보세요', chance };
      const captured: Monster = { id: `monster-${state.nextId++}`, species: action.species, level: SPECIES[action.species].level, vitality: 100, bond: 0 };
      state.monsters.push(captured); state.stats.captured++; state.research += 3; state.flags.campUnlocked = true;
      grant(state, { essence: 1 });
      return finish(state, `${SPECIES[action.species].name}, 새로운 친구가 되었어요!`, { captured, chance });
    }
    case 'build': {
      if (!validKey(FACILITIES, action.facility)) return failure('알 수 없는 시설이에요');
      if (!state.flags.campUnlocked) return failure('첫 친구를 포획하면 캠프가 열려요');
      const def = FACILITIES[action.facility];
      if (state.campLevel < def.level) return failure(`캠프 Lv.${def.level}부터 지을 수 있어요 · 서로 다른 친구를 모아 보세요`);
      if (state.facilities.length >= 8) return failure('캠프의 8개 자리가 모두 찼어요');
      if (state.facilities.filter(f => f.type === action.facility).length >= 2) return failure('같은 시설은 두 개까지 지을 수 있어요');
      const typesAfter = new Set([...state.facilities.map(f => f.type), action.facility]);
      if (8 - (state.facilities.length + 1) < Object.keys(FACILITIES).length - typesAfter.size) return failure('아직 없는 시설을 위한 자리도 남겨 주세요 · 중복 시설은 총 2개까지 지을 수 있어요');
      const slot = action.slot ?? Array.from({ length: 8 }, (_, i) => i).find(i => !state.facilities.some(f => f.slot === i));
      if (slot === undefined || !Number.isInteger(slot) || slot < 0 || slot >= 8 || state.facilities.some(f => f.slot === slot)) return failure('비어 있는 캠프 자리를 선택하세요');
      if (!canAfford(state, def.cost)) return failure('건설 재료가 부족해요');
      pay(state, def.cost);
      // The first delivery is a real relocation, not free production: stage
      // up to three of the player's remaining logs after construction is paid.
      // A normal transport cycle moves this buffer back into their inventory.
      const stagedWood = action.facility === 'storage' && !state.facilities.some(f => f.type === 'storage') ? Math.min(3, state.inventory.wood) : 0;
      state.inventory.wood -= stagedWood;
      state.facilities.push({ id: `facility-${state.nextId++}`, type: action.facility, slot, workerId: null, buffer: stagedWood ? { wood: stagedWood } : {}, progress: 0 });
      return finish(state, `${def.name} 완성! 함께 일할 친구를 배치해 주세요`);
    }
    case 'assign': {
      const facility = state.facilities.find(f => f.id === action.facilityId);
      if (!facility) return failure('시설을 찾을 수 없어요');
      if (action.monsterId === null) { facility.workerId = null; return finish(state, '친구가 쉬러 갔어요'); }
      const monster = state.monsters.find(m => m.id === action.monsterId);
      if (!monster) return failure('몬스터북에 없는 친구예요');
      if (getWorkLevel(monster, FACILITIES[facility.type].work) < 1) return failure('이 친구의 작업 적성과 맞지 않아요');
      if (state.partnerId === monster.id) return failure('동행 중인 친구예요 · 먼저 동행을 해제하세요');
      if (state.facilities.some(f => f.workerId === monster.id && f.id !== facility.id)) return failure('다른 시설에서 일하는 친구예요 · 먼저 배치를 해제하세요');
      facility.workerId = monster.id;
      if (facility.type === 'storage') state.flags.transportAssigned = true;
      return finish(state, `${SPECIES[monster.species].name} → ${FACILITIES[facility.type].name}`);
    }
    case 'partner': {
      if (action.monsterId === null) { state.partnerId = null; return finish(state, '동행 친구가 캠프에서 쉬어요'); }
      const monster = state.monsters.find(m => m.id === action.monsterId);
      if (!monster) return failure('몬스터북에 없는 친구예요');
      if (state.facilities.some(f => f.workerId === monster.id)) return failure('캠프에서 일하는 친구예요 · 먼저 배치를 해제하세요');
      state.partnerId = monster.id; return finish(state, `${SPECIES[monster.species].name}와 함께 출발!`);
    }
    case 'craft': {
      if (!validKey(RECIPES, action.recipeId)) return failure('알 수 없는 제작법이에요');
      const recipe = RECIPES[action.recipeId];
      if (state.campLevel < recipe.level) return failure(`캠프 Lv.${recipe.level}에서 연구할 수 있어요`);
      const pendingWork = (id: string) => state.queue.filter(q => q.facilityId === id).reduce((sum, q) => sum + q.remaining, 0);
      const facility = state.facilities.filter(f => f.type === recipe.facility).sort((a, b) => pendingWork(a.id) - pendingWork(b.id))[0];
      if (!facility) return failure(`${FACILITIES[recipe.facility].name}를 먼저 지어 주세요`);
      if (state.queue.length >= 12) return failure('제작 대기열이 가득 찼어요 (12개)');
      if (!canAfford(state, recipe.ingredients)) return failure('제작 재료가 부족해요');
      pay(state, recipe.ingredients);
      state.queue.push({ id: `job-${state.nextId++}`, recipeId: recipe.id, facilityId: facility.id, remaining: recipe.seconds, total: recipe.seconds });
      return finish(state, `${recipe.name} 제작 시작`);
    }
    case 'stageDelivery': {
      const facility = state.facilities.find(f => f.id === action.facilityId);
      if (!facility || facility.type !== 'storage') return failure('목재 운반은 보관함에서 맡길 수 있어요');
      if (state.stats.transported > 0 || state.completedQuests.includes('storage')) return failure('첫 운반을 이미 마쳤어요 · 이제 생산 시설의 자원을 옮겨요');
      if (state.facilities.some(f => materialCount(f.buffer) > 0)) return failure('운반을 기다리는 자원이 있어요 · 운반 친구를 배치해 주세요');
      if (state.inventory.wood < 1) return failure('맡길 목재가 없어요 · 숲에서 목재를 먼저 모아 주세요');
      // An exact-cost first build may leave no tutorial logs to stage.
      // This retry only relocates newly gathered wood; it never creates items.
      const amount = Math.min(3, state.inventory.wood);
      state.inventory.wood -= amount; facility.buffer.wood = amount;
      return finish(state, `목재 ${amount}개를 맡겼어요 · 운반 친구를 배치하고 잠시 기다려 주세요`);
    }
    case 'collect': {
      const facility = state.facilities.find(f => f.id === action.facilityId);
      if (!facility) return failure('시설을 찾을 수 없어요');
      const count = collectBuffer(state, facility);
      return count ? finish(state, `완성된 자원 ${count}개를 받았어요`) : failure('아직 완성된 자원이 없어요');
    }
    case 'heal': {
      if (state.hp >= state.maxHp) return failure('이미 체력이 가득해요');
      const food = action.item ?? (state.inventory.potion > 0 ? 'potion' : state.inventory.food > 0 ? 'food' : 'feast');
      if (!['food', 'potion', 'feast'].includes(food) || state.inventory[food] < 1) return failure('회복 음식이 없어요 · 열매로 도시락을 만들어 보세요');
      state.inventory[food]--; const heal = food === 'potion' ? 65 : food === 'feast' ? state.maxHp : 35;
      state.hp = Math.min(state.maxHp, state.hp + heal); return finish(state, `${ITEMS[food].name} · 체력을 회복했어요`);
    }
    case 'feed': {
      const hungry = state.monsters.filter(m => (!action.monsterId || m.id === action.monsterId) && m.vitality < 100);
      if (!hungry.length) return failure('모두 활력이 가득해요');
      let fed = 0;
      for (const monster of hungry) {
        const food = state.inventory.food > 0 ? 'food' : state.inventory.berry > 0 ? 'berry' : state.inventory.feast > 0 ? 'feast' : null;
        if (!food) break;
        state.inventory[food]--; monster.vitality = Math.min(100, monster.vitality + (food === 'berry' ? 20 : food === 'food' ? 65 : 100)); monster.bond = Math.min(100, monster.bond + 3);
        if (monster.resting && monster.vitality >= 30) monster.resting = false;
        fed++;
      }
      return fed ? finish(state, `${fed}명의 친구가 맛있게 먹었어요`) : failure('먹을 것이 없어요 · 열매를 채집하거나 도시락을 만드세요');
    }
    case 'damage': {
      if (!Number.isFinite(action.amount) || action.amount < 0) return failure('유효하지 않은 피해예요');
      state.hp = Math.max(0, state.hp - action.amount); return { ok: true, message: '' };
    }
    case 'camp': {
      if (!state.flags.campUnlocked) return failure('첫 친구를 포획하면 캠프가 열려요');
      state.stats.campVisits++; state.hp = state.maxHp;
      return finish(state, '캠프에 돌아왔어요 · 모닥불 곁에서 체력 회복');
    }
    case 'boss': {
      if (state.flags.bossDefeated) return failure('수호자의 선물은 이미 받았어요');
      state.flags.bossDefeated = true; state.research += 20; grant(state, { crystal: 3, essence: 10, ingot: 4 });
      return finish(state, '숲의 수호자와 마음이 닿았어요! 수호자의 결정 ×3 획득');
    }
    default: return failure('알 수 없는 행동이에요');
  }
}

function workPower(monster: Monster | undefined, work: WorkType) {
  if (!monster || monster.resting || monster.vitality <= 0) return 0;
  const level = getWorkLevel(monster, work);
  return level ? [0, 1, 1.45, 2][level] * (monster.vitality < 20 ? .5 : 1) : 0;
}
function eatWhenHungry(state: GameState, monster: Monster) {
  if (monster.vitality >= 22 && !monster.resting) return;
  const food: ItemId | null = state.inventory.food > 0 ? 'food' : state.inventory.berry > 0 ? 'berry' : null;
  if (food) {
    state.inventory[food]--; monster.vitality = Math.min(100, monster.vitality + (food === 'food' ? 65 : 20));
    if (monster.resting && monster.vitality >= 30) monster.resting = false;
  }
}
/** Deterministic in one-second slices; no offline catch-up or hidden-tab windfall.
 * Raw production stays in bounded buffers until manually collected or transported.
 * Craft ingredients are charged atomically when enqueued; each station works serially.
 */
export function tickEconomy(state: GameState, seconds: number): string[] {
  if (!Number.isFinite(seconds) || seconds <= 0) return [];
  let remaining = Math.min(seconds, 3600);
  const messages: string[] = [];
  while (remaining > .000001) {
    const dt = Math.min(remaining, 1); remaining -= dt; state.playSeconds += dt;
    const working = new Set<string>();
    for (const monster of state.monsters) if (monster.vitality <= 0) monster.resting = true;
    for (const facility of state.facilities) {
      const def = FACILITIES[facility.type];
      const monster = state.monsters.find(m => m.id === facility.workerId);
      if (monster) eatWhenHungry(state, monster);
      const power = workPower(monster, def.work);
      if (facility.type === 'workbench' || facility.type === 'kitchen') {
        let time = dt * (power ? 1 + power : 1);
        while (time > 0) {
          const job = state.queue.find(q => q.facilityId === facility.id);
          if (!job) break;
          const used = Math.min(time, job.remaining); job.remaining -= used; time -= used;
          if (monster && power) working.add(monster.id);
          if (job.remaining > .000001) break;
          const recipe = RECIPES[job.recipeId]; grant(state, recipe.output); equipmentCrafted(state, recipe);
          state.stats.crafted++; state.stats.cardsCrafted += (recipe.output.card ?? 0) + (recipe.output.enhancedCard ?? 0) + (recipe.output.royalCard ?? 0);
          state.queue.splice(state.queue.indexOf(job), 1); messages.push(`${recipe.name} 완성!`);
        }
      } else if (facility.type === 'storage') {
        if (!monster || !power) continue;
        const hasOutputs = state.facilities.some(f => materialCount(f.buffer) > 0);
        if (!hasOutputs) continue;
        working.add(monster.id); facility.progress += dt * power;
        if (facility.progress >= def.seconds) {
          facility.progress -= def.seconds;
          let capacity = 5;
          for (const source of state.facilities) { const moved = collectBuffer(state, source, capacity); capacity -= moved; state.stats.transported += moved; if (!capacity) break; }
        }
      } else {
        if (!monster || !power || materialCount(facility.buffer) + materialCount(def.output) > def.capacity) continue;
        working.add(monster.id); facility.progress += dt * power;
        if (facility.progress >= def.seconds) {
          facility.progress -= def.seconds;
          for (const [id, count] of entries(def.output)) facility.buffer[id] = (facility.buffer[id] ?? 0) + count;
          state.stats.produced += materialCount(def.output); state.flags.automationStarted = true;
        }
      }
    }
    for (const monster of state.monsters) {
      if (working.has(monster.id)) {
        monster.vitality = Math.max(0, monster.vitality - dt * .11);
        if (monster.vitality <= 0) monster.resting = true;
      } else if (monster.resting) {
        // Rest preserves the assignment; hysteresis prevents work/rest flicker at 0.
        monster.vitality = Math.min(100, monster.vitality + dt * .65);
        if (monster.vitality >= 30) monster.resting = false;
      } else if (state.partnerId !== monster.id) monster.vitality = Math.min(100, monster.vitality + dt * .35);
    }
  }
  messages.push(...advanceProgress(state)); return messages;
}

export const SAVE_KEY = 'wild-and-craft.save.v1';
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type SaveResult = { ok: true; state: GameState } | { ok: false; error: string };
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const number = (x: unknown, max = 1e9): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const integer = (x: unknown, max = 1e9): x is number => number(x, max) && Number.isInteger(x);
function validMaterials(x: unknown, full = false): x is Materials {
  if (!object(x)) return false;
  return Object.entries(x).every(([k, n]) => validKey(ITEMS, k) && integer(n, 99999)) && (!full || Object.keys(ITEMS).every(k => k in x));
}
export function parseSave(raw: string): SaveResult {
  const bad = (): SaveResult => ({ ok: false, error: '저장 데이터를 읽을 수 없어요. 원본을 보존했어요. 내보낸 뒤 새 탐험을 시작해 주세요.' });
  try {
    if (typeof raw !== 'string' || raw.length > 500000) return bad();
    const s: unknown = JSON.parse(raw);
    if (!object(s) || s.version !== 1 || !validMaterials(s.inventory, true) || !Array.isArray(s.monsters) || s.monsters.length > 60 || !Array.isArray(s.facilities) || !s.facilities.length || s.facilities.length > 8 || !Array.isArray(s.queue) || s.queue.length > 12) return bad();
    if (!object(s.equipment) || !integer(s.equipment.weapon, 3) || !integer(s.equipment.armor, 1) || !integer(s.equipment.tool, 1) || !integer(s.equipment.charm, 1)) return bad();
    if (!number(s.hp, 145) || !number(s.maxHp, 145) || s.maxHp !== 100 + s.equipment.armor * 30 + s.equipment.charm * 15 || s.hp > s.maxHp || !integer(s.research) || !integer(s.campLevel, 3) || s.campLevel < 1 || !integer(s.nextId) || s.nextId < 1 || !number(s.playSeconds)) return bad();
    if (!Array.isArray(s.completedQuests) || s.completedQuests.length > QUESTS.length || s.completedQuests.some((q, i) => q !== QUESTS[i].id)) return bad();
    if (!Array.isArray(s.encountered) || s.encountered.some(id => !validKey(SPECIES, id)) || new Set(s.encountered).size !== s.encountered.length) return bad();
    if (!object(s.stats) || Object.keys(createGame().stats).some(key => !integer((s.stats as Record<string, unknown>)[key]))) return bad();
    if (!object(s.flags) || Object.keys(createGame().flags).some(key => typeof (s.flags as Record<string, unknown>)[key] !== 'boolean')) return bad();
    if (!object(s.settings) || typeof s.settings.muted !== 'boolean' || typeof s.settings.reducedMotion !== 'boolean') return bad();
    const ids = new Set<string>(); const monsterIds = new Set<string>(); const workers = new Set<string>(); const slots = new Set<number>();
    const acceptId = (id: unknown, prefix: string) => { if (typeof id !== 'string' || !new RegExp(`^${prefix}-(0|[1-9]\\d*)$`).test(id) || ids.has(id) || Number(id.split('-')[1]) >= (s.nextId as number)) return false; ids.add(id); return true; };
    for (const m of s.monsters) {
      if (!object(m) || !acceptId(m.id, 'monster') || !validKey(SPECIES, m.species) || !integer(m.level, 50) || m.level < 1 || !number(m.vitality, 100) || !number(m.bond, 100) || (m.resting !== undefined && typeof m.resting !== 'boolean')) return bad();
      monsterIds.add(m.id as string);
    }
    const kinds = new Set(s.monsters.map(m => (m as Monster).species)).size;
    if (s.stats.captured !== s.monsters.length || s.flags.campUnlocked !== (s.monsters.length > 0) || s.campLevel !== (kinds >= 4 || s.flags.bossDefeated ? 3 : kinds >= 2 ? 2 : 1)) return bad();
    if (s.monsters.some(m => !(s.encountered as unknown[]).includes((m as Monster).species)) || (s.stats.woodGathered as number) > (s.stats.gathered as number)) return bad();
    if (s.flags.automationStarted !== ((s.stats.produced as number) > 0)) return bad();
    if (s.partnerId !== null && (typeof s.partnerId !== 'string' || !monsterIds.has(s.partnerId))) return bad();
    for (const f of s.facilities) {
      if (!object(f) || !acceptId(f.id, 'facility') || !validKey(FACILITIES, f.type) || !integer(f.slot, 7) || slots.has(f.slot) || !validMaterials(f.buffer) || materialCount(f.buffer) > FACILITIES[f.type].capacity || !number(f.progress, FACILITIES[f.type].seconds)) return bad();
      if (Object.keys(f.buffer).some(key => f.type === 'storage' ? key !== 'wood' : !validKey(FACILITIES[f.type as FacilityType].output, key)) || s.facilities.filter(other => (other as Facility).type === f.type).length > 2) return bad();
      slots.add(f.slot);
      if (f.workerId !== null) {
        if (typeof f.workerId !== 'string' || !monsterIds.has(f.workerId) || workers.has(f.workerId) || f.workerId === s.partnerId) return bad();
        const m = s.monsters.find(monster => (monster as Monster).id === f.workerId) as Monster;
        if (!getWorkLevel(m, FACILITIES[f.type].work)) return bad();
        workers.add(f.workerId);
      }
    }
    if (!s.facilities.some(f => (f as Facility).type === 'workbench') || (s.flags.transportAssigned && !s.facilities.some(f => (f as Facility).type === 'storage'))) return bad();
    for (const q of s.queue) {
      if (!object(q) || !acceptId(q.id, 'job') || !validKey(RECIPES, q.recipeId) || !number(q.remaining, RECIPES[q.recipeId].seconds) || q.remaining <= 0 || q.total !== RECIPES[q.recipeId].seconds || !s.facilities.some(f => (f as Facility).id === q.facilityId && (f as Facility).type === RECIPES[q.recipeId as RecipeId].facility)) return bad();
    }
    // Earlier v1 saves completed storage on assignment alone. Keep earned
    // progress intact without inventing a delivery for those existing saves.
    if (s.completedQuests.some((_, i) => !QUESTS[i].complete(s as unknown as GameState) && !(QUESTS[i].id === 'storage' && (s.flags as GameState['flags']).transportAssigned))) return bad();
    return { ok: true, state: s as unknown as GameState };
  } catch { return bad(); }
}
export function serializeGame(state: GameState): string { return JSON.stringify(state); }
/** Read errors return a playable fresh state but must keep UI saving disabled.
 * saveGame independently refuses to replace corrupt or future-version data.
 */
export function loadGame(storage: StorageLike): { status: 'new' | 'loaded' | 'error'; state: GameState; error?: string } {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return { status: 'new', state: createGame() };
    const parsed = parseSave(raw);
    return parsed.ok ? { status: 'loaded', state: parsed.state } : { status: 'error', state: createGame(), error: parsed.error };
  } catch { return { status: 'error', state: createGame(), error: '브라우저 저장소에 접근할 수 없어요. 이 탐험은 자동 저장되지 않아요.' }; }
}
export function saveGame(storage: StorageLike, state: GameState): { ok: boolean; error?: string } {
  try {
    const existing = storage.getItem(SAVE_KEY);
    if (existing !== null && !parseSave(existing).ok) return { ok: false, error: '읽을 수 없는 이전 저장 파일을 보호하기 위해 자동 저장을 멈췄어요.' };
    const raw = serializeGame(state);
    if (!parseSave(raw).ok) return { ok: false, error: '현재 탐험 데이터를 검증하지 못해 저장을 멈췄어요.' };
    storage.setItem(SAVE_KEY, raw); return { ok: true };
  } catch { return { ok: false, error: '저장 공간이 부족하거나 브라우저가 저장을 차단했어요. 저장 파일을 내보내 주세요.' }; }
}
