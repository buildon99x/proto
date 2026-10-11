import {trainingGoldBalances} from './training-economy.js';
import {
  EQUIPMENT_SLOTS as SLOTS, EQUIPMENT_STAT_KEYS as STAT_KEYS, EQUIPMENT_REVISION,
  EQUIPMENT_LIMITS as LIMITS, EQUIPMENT_ITEMS as ITEMS, EQUIPMENT_VENDOR as VENDOR,
  EQUIPMENT_RECIPES as RECIPES, EQUIPMENT_UPGRADES as UPGRADES, EQUIPMENT_AWARDS as AWARDS,
} from './equipment-content.js';

const TIERS = ['apprentice', 'adept', 'expert', 'master'];
const MIN_LEVEL = [1, 5, 15, 30];
const ATTRIBUTES = {strength: 18, dexterity: 12, intelligence: 10};
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
const record = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const count = value => Number.isSafeInteger(value) && value >= 0;
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(value) && !RESERVED.has(value);
const copy = value => JSON.parse(JSON.stringify(value));
const own = (map, key) => Object.hasOwn(map, key);
const exact = (object, keys) => record(object) && Object.keys(object).length === keys.length && keys.every(key => own(object, key));
const tidy = number => Math.round(number * 1e8) / 1e8;
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']'
  : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
const REASONS = {
  INVALID_STATE: '장비 상태 형식이 올바르지 않습니다.', INVALID_CHARACTER: '영구 전사 능력치 또는 훈련 티어가 올바르지 않습니다.',
  INVALID_ECONOMY: '금화 수입·지출이 잔액과 일치하지 않습니다.', INVALID_INVENTORY: '소지품 수량이나 장비 인스턴스가 올바르지 않습니다.',
  INVALID_PROGRESS: '장비 이력 형식 또는 콘텐츠 버전이 올바르지 않습니다.', INVALID_RECEIPT: '장비 영수증과 소유·장착 기록이 일치하지 않습니다.',
  INVALID_COMMAND: '장비 명령 형식이 올바르지 않습니다.', COMMAND_CONFLICT: '같은 명령 ID를 다른 동작에 재사용할 수 없습니다.',
  RECEIPT_LIMIT: '장비 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.', INVENTORY_FULL: '장비 보관 한도에 도달했습니다.',
  UNKNOWN_ITEM: '지원하지 않는 장비입니다.', ITEM_NOT_OWNED: '이 장비 인스턴스를 소유하지 않습니다.', WRONG_SLOT: '장비 슬롯이 맞지 않습니다.',
  TIER_REQUIREMENT: '이 장비의 훈련 티어가 필요합니다.', ATTRIBUTE_REQUIREMENT: '영구 능력치가 장비 요구량에 부족합니다.',
  ITEM_EQUIPPED: '판매하기 전에 장비를 해제하세요.', ALREADY_EQUIPPED: '이미 장착한 장비입니다.', SLOT_EMPTY: '이미 빈 슬롯입니다.',
  WRONG_STATION: '해당 상인 또는 작업대에서 진행하세요.', STOCK_SHORTAGE: '이 장비의 판매 재고가 없습니다.',
  VENDOR_CASH_SHORTAGE: '상인의 매입 자금이 부족합니다.', GOLD_SHORTAGE: '금화가 부족합니다.', MATERIAL_SHORTAGE: '제작·강화 재료가 부족합니다.',
  TOOL_REQUIRED: '대장장이 도구가 필요합니다.', TOOL_ALREADY_OWNED: '이미 도구를 보유하여 이 보급 묶음을 다시 받을 수 없습니다.',
  PROGRESS_REQUIRED: '먼저 필요한 의뢰·탐험 진행을 완료하세요.', AWARD_ALREADY_CLAIMED: '이미 받은 장비 보급입니다.',
  UNKNOWN_AWARD: '지원하지 않는 장비 보급입니다.', UNKNOWN_RECIPE: '지원하지 않는 제작법입니다.',
  MAX_UPGRADE: '이 단계에서는 +2까지만 강화할 수 있습니다.', STALE_UPGRADE: '강화 단계가 바뀌었습니다. 견적을 다시 확인하세요.',
  STALE_QUOTE: '금액이 바뀌었습니다. 견적을 다시 확인하세요.', VALUE_OVERFLOW: '금화·재료·능력치 수치 한도를 넘습니다.',
};
const fail = code => ({ok: false, code, reason: REASONS[code] ?? code});

// Strict JSON data only: no getters, sparse arrays, prototypes, NaN or hidden keys.
function jsonData(value, parents = new Set(), depth = 0, budget = {nodes: 0}) {
  if (++budget.nodes > 250000 || depth > 32) return false;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || parents.has(value) || (!Array.isArray(value) && !record(value)) || Object.getOwnPropertySymbols(value).length) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Object.entries(descriptors).filter(([key]) => !(Array.isArray(value) && key === 'length'));
  if (Array.isArray(value) && (Object.getPrototypeOf(value) !== Array.prototype || entries.length !== value.length || entries.some(([key], index) => key !== String(index)))) return false;
  if (entries.some(([key, descriptor]) => RESERVED.has(key) || !own(descriptor, 'value') || !descriptor.enumerable)) return false;
  parents.add(value);
  const valid = entries.every(([, descriptor]) => jsonData(descriptor.value, parents, depth + 1, budget));
  parents.delete(value);
  return valid;
}
function commandValid(command) {
  if (!jsonData(command) || !record(command) || !identifier(command.commandId)) return false;
  const fields = {
    receiveEquipmentAward: ['awardId'], buyEquipment: ['baseId', 'station'], equipItem: ['itemId'],
    unequipItem: ['slot'], sellItem: ['itemId', 'station'], craftItem: ['recipeId', 'station'], upgradeItem: ['itemId', 'station', 'expectedRank'],
  };
  if (!own(fields, command.type)) return false;
  const optional = command.type === 'receiveEquipmentAward' ? ['station'] : command.type === 'equipItem' ? ['slot']
    : ['buyEquipment', 'sellItem', 'craftItem', 'upgradeItem'].includes(command.type) ? ['expectedGold'] : [];
  const required = ['type', 'commandId', ...fields[command.type]], allowed = [...required, ...optional];
  if (!required.every(key => own(command, key)) || Object.keys(command).some(key => !allowed.includes(key))) return false;
  return Object.entries(command).every(([key, value]) => key === 'expectedRank' ? count(value) && value <= LIMITS.upgradeRank
    : key === 'expectedGold' ? count(value) : key === 'itemId' ? typeof value === 'string' && /^equipment:[A-Za-z0-9][A-Za-z0-9._:-]{0,79}:\d+$/.test(value) : identifier(value));
}
const emptyEquipment = () => Object.fromEntries(SLOTS.map(slot => [slot, null]));
const blankModel = () => ({items: new Map(), equipment: emptyEquipment(), awards: [], tools: new Set(), cash: VENDOR.initialCash, stock: {...VENDOR.initialStock}, spent: 0, earned: 0});
const instanceId = (commandId, index = 0) => `equipment:${commandId}:${index}`;
function baseStats(instance) {
  const base = ITEMS[instance.baseId], result = {...base.stats};
  for (const [key, value] of Object.entries(base.upgradeStats)) result[key] = tidy((result[key] ?? 0) + value * instance.upgradeRank);
  return result;
}
function modelBonuses(model) {
  const bonuses = Object.fromEntries(STAT_KEYS.map(key => [key, 0]));
  for (const itemId of Object.values(model.equipment)) {
    if (itemId === null) continue;
    for (const [key, value] of Object.entries(baseStats(model.items.get(itemId)))) bonuses[key] = tidy(bonuses[key] + value);
  }
  return bonuses;
}
const sellValue = instance => ITEMS[instance.baseId].sellPrice + Object.values(UPGRADES).filter(row => row.rank <= instance.upgradeRank).reduce((sum, row) => sum + row.sellBonus, 0);
const policyFor = (command, model) => command.type === 'craftItem' ? (own(RECIPES, command.recipeId) ? RECIPES[command.recipeId] : undefined)
  : command.type === 'upgradeItem' ? UPGRADES[(model.items.get(command.itemId)?.upgradeRank ?? LIMITS.upgradeRank) + 1]
  : command.type === 'receiveEquipmentAward' ? (own(AWARDS, command.awardId) ? AWARDS[command.awardId] : undefined) : null;

// This deterministic projection is shared by new commands and receipt validation.
// It does NOT reconstruct historical combat/quest state or authorize a new reward.
function project(model, command) {
  const event = {goldDelta: 0, materials: {}, tools: [], created: [], removed: null, upgraded: null, equipped: null, awardId: null};
  const create = baseId => {
    const item = {id: instanceId(command.commandId, event.created.length), baseId, upgradeRank: 0};
    if (model.items.has(item.id)) return false;
    event.created.push(item); model.items.set(item.id, {...item}); return true;
  };
  const cost = policy => {
    event.goldDelta = -policy.gold;
    event.materials = Object.fromEntries(Object.entries(policy.materials).map(([key, value]) => [key, -value]));
  };
  const target = () => model.items.get(command.itemId);
  switch (command.type) {
    case 'receiveEquipmentAward': {
      const award = own(AWARDS, command.awardId) ? AWARDS[command.awardId] : null;
      if (!award) return fail('UNKNOWN_AWARD');
      if (award.station !== undefined && command.station !== award.station) return fail('WRONG_STATION');
      if (model.awards.includes(award.id)) return fail('AWARD_ALREADY_CLAIMED');
      for (const baseId of award.equipment) if (!create(baseId)) return fail('INVALID_RECEIPT');
      event.materials = {...award.materials}; event.tools = [...award.tools]; event.awardId = award.id;
      model.awards.push(award.id); award.tools.forEach(tool => model.tools.add(tool));
      break;
    }
    case 'buyEquipment': {
      if (command.station !== VENDOR.station) return fail('WRONG_STATION');
      if (!own(ITEMS, command.baseId)) return fail('UNKNOWN_ITEM');
      if (model.stock[command.baseId] < 1) return fail('STOCK_SHORTAGE');
      event.goldDelta = -ITEMS[command.baseId].price; model.stock[command.baseId]--; model.cash -= event.goldDelta;
      if (!create(command.baseId)) return fail('INVALID_RECEIPT');
      break;
    }
    case 'equipItem': {
      const item = target(); if (!item) return fail('ITEM_NOT_OWNED');
      const slot = command.slot ?? ITEMS[item.baseId].slot;
      if (!SLOTS.includes(slot) || ITEMS[item.baseId].slot !== slot) return fail('WRONG_SLOT');
      if (model.equipment[slot] === item.id) return fail('ALREADY_EQUIPPED');
      event.equipped = {slot, itemId: item.id, replacedItemId: model.equipment[slot]}; model.equipment[slot] = item.id;
      break;
    }
    case 'unequipItem': {
      if (!SLOTS.includes(command.slot)) return fail('WRONG_SLOT');
      if (model.equipment[command.slot] === null) return fail('SLOT_EMPTY');
      event.equipped = {slot: command.slot, itemId: null, replacedItemId: model.equipment[command.slot]}; model.equipment[command.slot] = null;
      break;
    }
    case 'sellItem': {
      if (command.station !== VENDOR.station) return fail('WRONG_STATION');
      const item = target(); if (!item) return fail('ITEM_NOT_OWNED');
      if (Object.values(model.equipment).includes(item.id)) return fail('ITEM_EQUIPPED');
      event.goldDelta = sellValue(item);
      if (model.cash < event.goldDelta) return fail('VENDOR_CASH_SHORTAGE');
      model.cash -= event.goldDelta; event.removed = item.id; model.items.delete(item.id);
      break;
    }
    case 'craftItem': {
      if (!own(RECIPES, command.recipeId)) return fail('UNKNOWN_RECIPE');
      const policy = RECIPES[command.recipeId];
      if (command.station !== policy.station) return fail('WRONG_STATION');
      cost(policy); if (!create(policy.output)) return fail('INVALID_RECEIPT');
      break;
    }
    case 'upgradeItem': {
      const item = target(); if (!item) return fail('ITEM_NOT_OWNED');
      if (item.upgradeRank !== command.expectedRank) return fail('STALE_UPGRADE');
      if (item.upgradeRank >= LIMITS.upgradeRank) return fail('MAX_UPGRADE');
      const policy = UPGRADES[item.upgradeRank + 1];
      if (command.station !== policy.station) return fail('WRONG_STATION');
      cost(policy); event.upgraded = {itemId: item.id, from: item.upgradeRank, to: item.upgradeRank + 1}; item.upgradeRank++;
      break;
    }
  }
  if (own(command, 'expectedGold') && command.expectedGold !== Math.abs(event.goldDelta)) return fail('STALE_QUOTE');
  if (model.items.size > LIMITS.instances) return fail('INVENTORY_FULL');
  model.spent += Math.max(0, -event.goldDelta); model.earned += Math.max(0, event.goldDelta);
  if (![model.cash, model.spent, model.earned].every(count)) return fail('VALUE_OVERFLOW');
  return {ok: true, event};
}
function eligibility(character, instance, slot = ITEMS[instance.baseId].slot) {
  const base = ITEMS[instance.baseId];
  if (base.slot !== slot) return fail('WRONG_SLOT');
  if (TIERS.indexOf(base.tier) > TIERS.indexOf(character.tier)) return fail('TIER_REQUIREMENT');
  if (Object.keys(ATTRIBUTES).some(key => ATTRIBUTES[key] + character.attributes[key] < base.requirements[key])) return fail('ATTRIBUTE_REQUIREMENT');
  return {ok: true, slot};
}
function analyze(state) {
  if (!jsonData(state) || !record(state)) return fail('INVALID_STATE');
  const c = state.character, i = state.inventory, w = state.world, s = state.stats;
  if (!record(c) || c.classId !== 'warrior' || !Number.isSafeInteger(c.level) || c.level < 1 || c.level > 50 || !TIERS.includes(c.tier) || c.level < MIN_LEVEL[TIERS.indexOf(c.tier)]
    || !exact(c.attributes, Object.keys(ATTRIBUTES)) || !Object.values(c.attributes).every(count) || Object.values(c.attributes).reduce((sum, value) => sum + value, 0) > (c.level - 1) * 5
    || !exact(c.equipment, SLOTS)) return fail('INVALID_CHARACTER');
  if (!count(state.gold) || !record(s) || !count(s.earnedGold) || !count(s.spentGold) || s.earnedGold - s.spentGold !== state.gold) return fail('INVALID_ECONOMY');
  const balances = trainingGoldBalances(state); if (!balances.ok) return balances;
  if (!record(i) || !Array.isArray(i.equipmentInstances) || i.equipmentInstances.length > LIMITS.instances || !record(i.materials) || !Object.entries(i.materials).every(([key, value]) => identifier(key) && count(value))
    || !Array.isArray(i.tools) || i.tools.length > 128 || !i.tools.every(identifier) || new Set(i.tools).size !== i.tools.length) return fail('INVALID_INVENTORY');
  if (!record(w) || !record(w.objectives) || !Object.entries(w.objectives).every(([key, value]) => identifier(key) && count(value))
    || !Array.isArray(w.claimedRewards) || !w.claimedRewards.every(identifier) || new Set(w.claimedRewards).size !== w.claimedRewards.length) return fail('INVALID_STATE');
  const progress = state.equipmentProgress;
  if (progress !== undefined && (!exact(progress, ['version', 'receipts', 'claimedAwards']) || progress.version !== EQUIPMENT_REVISION || !Array.isArray(progress.receipts) || progress.receipts.length > LIMITS.receipts || !Array.isArray(progress.claimedAwards))) return fail('INVALID_PROGRESS');
  const model = blankModel(), ids = new Set();
  for (const receipt of progress?.receipts ?? []) {
    if (!exact(receipt, ['commandId', 'command', 'event']) || !commandValid(receipt.command) || receipt.commandId !== receipt.command.commandId || ids.has(receipt.commandId)) return fail('INVALID_RECEIPT');
    ids.add(receipt.commandId);
    const projected = project(model, receipt.command);
    if (!projected.ok || canonical(projected.event) !== canonical(receipt.event)) return fail('INVALID_RECEIPT');
  }
  const physicalIds = new Set();
  for (const instance of i.equipmentInstances) {
    if (!exact(instance, ['id', 'baseId', 'upgradeRank']) || !own(ITEMS, instance.baseId) || !count(instance.upgradeRank) || instance.upgradeRank > LIMITS.upgradeRank || physicalIds.has(instance.id)
      || canonical(model.items.get(instance.id)) !== canonical(instance)) return fail('INVALID_INVENTORY');
    physicalIds.add(instance.id);
  }
  if (model.items.size !== i.equipmentInstances.length || canonical(model.equipment) !== canonical(c.equipment)
    || canonical(model.awards) !== canonical(progress?.claimedAwards ?? []) || [...model.tools].some(tool => !i.tools.includes(tool)) || model.spent > s.spentGold || model.earned > s.earnedGold) return fail('INVALID_RECEIPT');
  for (const slot of SLOTS) {
    if (c.equipment[slot] === null) continue;
    const valid = eligibility(c, model.items.get(c.equipment[slot]), slot);
    if (!valid.ok) return valid;
  }
  return {ok: true, model, balances};
}
export function validateEquipmentState(state) {
  const result = analyze(state); return result.ok ? {ok: true} : result;
}
export function equipmentBonuses(state) {
  const result = analyze(state); return result.ok ? {ok: true, bonuses: modelBonuses(result.model)} : result;
}
const unlocked = (state, rule) => !rule || (rule.claimedReward ? state.world.claimedRewards.includes(rule.claimedReward) : (state.world.objectives[rule.objective] ?? 0) >= rule.minimum);
function prepare(state, command) {
  const valid = analyze(state); if (!valid.ok) return valid;
  if (!commandValid(command)) return fail('INVALID_COMMAND');
  const prior = state.equipmentProgress?.receipts.find(row => row.commandId === command.commandId);
  if (prior) return canonical(prior.command) === canonical(command) ? {ok: true, model: valid.model, replayed: true, receipt: prior} : fail('COMMAND_CONFLICT');
  if ((state.equipmentProgress?.receipts.length ?? 0) >= LIMITS.receipts) return fail('RECEIPT_LIMIT');
  if (command.type === 'receiveEquipmentAward' && valid.model.awards.includes(command.awardId)) return fail('AWARD_ALREADY_CLAIMED');
  if (command.type === 'upgradeItem') {
    const item = valid.model.items.get(command.itemId);
    if (!item) return fail('ITEM_NOT_OWNED');
    if (item.upgradeRank !== command.expectedRank) return fail('STALE_UPGRADE');
    if (item.upgradeRank >= LIMITS.upgradeRank) return fail('MAX_UPGRADE');
  }
  const policy = policyFor(command, valid.model);
  if (policy && !unlocked(state, policy.unlock)) return fail('PROGRESS_REQUIRED');
  if (policy?.tool && !state.inventory.tools.includes(policy.tool)) return fail('TOOL_REQUIRED');
  if (command.type === 'receiveEquipmentAward' && policy?.tools.some(tool => state.inventory.tools.includes(tool))) return fail('TOOL_ALREADY_OWNED');
  if (command.type === 'equipItem' && valid.model.items.has(command.itemId)) {
    const eligible = eligibility(state.character, valid.model.items.get(command.itemId), command.slot);
    if (!eligible.ok) return eligible;
  }
  const before = modelBonuses(valid.model), projected = project(valid.model, command);
  if (!projected.ok) return projected;
  const {event} = projected;
  if (valid.balances.spendableGold + event.goldDelta < 0) return fail('GOLD_SHORTAGE');
  if (!count(state.gold + event.goldDelta) || !count(state.stats.earnedGold + Math.max(0, event.goldDelta)) || !count(state.stats.spentGold + Math.max(0, -event.goldDelta))) return fail('VALUE_OVERFLOW');
  for (const [key, amount] of Object.entries(event.materials)) {
    const next = (state.inventory.materials[key] ?? 0) + amount;
    if (next < 0) return fail('MATERIAL_SHORTAGE');
    if (!count(next)) return fail('VALUE_OVERFLOW');
  }
  const bonuses = modelBonuses(valid.model);
  return {ok: true, replayed: false, model: valid.model, event, bonuses, deltaBonuses: Object.fromEntries(STAT_KEYS.map(key => [key, tidy(bonuses[key] - before[key])]))};
}
export function quoteEquipment(state, command) {
  const result = prepare(state, command); if (!result.ok) return result;
  if (result.replayed) return {ok: true, replayed: true, receipt: copy(result.receipt), goldCost: 0, goldGain: 0, materialsCost: {}, bonusesAfter: modelBonuses(result.model), deltaBonuses: Object.fromEntries(STAT_KEYS.map(key => [key, 0]))};
  return {ok: true, replayed: false, goldCost: Math.max(0, -result.event.goldDelta), goldGain: Math.max(0, result.event.goldDelta),
    materialsCost: Object.fromEntries(Object.entries(result.event.materials).filter(([, value]) => value < 0).map(([key, value]) => [key, -value])),
    event: copy(result.event), bonusesAfter: result.bonuses, deltaBonuses: result.deltaBonuses};
}
export function applyEquipmentCommand(state, command) {
  const result = prepare(state, command); if (!result.ok) return result;
  if (result.replayed) return {ok: true, state: copy(state), receipt: copy(result.receipt), replayed: true, bonuses: modelBonuses(result.model)};
  const next = copy(state), {event, model} = result;
  next.gold += event.goldDelta;
  next.stats.earnedGold += Math.max(0, event.goldDelta); next.stats.spentGold += Math.max(0, -event.goldDelta);
  for (const [key, amount] of Object.entries(event.materials)) next.inventory.materials[key] = (next.inventory.materials[key] ?? 0) + amount;
  next.inventory.tools.push(...event.tools);
  next.inventory.equipmentInstances = [...model.items.values()].map(copy);
  next.character.equipment = {...model.equipment};
  next.equipmentProgress ??= {version: EQUIPMENT_REVISION, receipts: [], claimedAwards: []};
  const receipt = {commandId: command.commandId, command: copy(command), event: copy(event)};
  next.equipmentProgress.receipts.push(receipt); next.equipmentProgress.claimedAwards = [...model.awards];
  const valid = analyze(next); if (!valid.ok) return valid;
  return {ok: true, state: next, receipt: copy(receipt), replayed: false, bonuses: result.bonuses};
}
export function equipmentRows(state) {
  const valid = analyze(state); if (!valid.ok) return valid;
  const {model} = valid;
  return {ok: true, vendor: {id: VENDOR.id, cash: model.cash, stock: {...model.stock}}, rows: state.inventory.equipmentInstances.map(instance => {
    const base = ITEMS[instance.baseId], equippedId = state.character.equipment[base.slot], current = model.items.get(equippedId), after = baseStats(instance), before = current ? baseStats(current) : {};
    return {instance: copy(instance), base: copy(base), stats: after, equipped: equippedId === instance.id, eligibility: eligibility(state.character, instance), sellPrice: sellValue(instance),
      deltas: Object.fromEntries(STAT_KEYS.filter(key => (after[key] ?? 0) !== (before[key] ?? 0)).map(key => [key, tidy((after[key] ?? 0) - (before[key] ?? 0))]))};
  })};
}

/** Read-only output preview. Being craftable does not imply being wearable. */
export function previewRecipe(state, recipeId) {
  const valid = analyze(state); if (!valid.ok) return valid;
  if (typeof recipeId !== 'string' || !own(RECIPES, recipeId)) return fail('UNKNOWN_RECIPE');
  const recipe = RECIPES[recipeId], base = ITEMS[recipe.output];
  const currentAttributes = Object.fromEntries(Object.keys(ATTRIBUTES).map(key => [key, ATTRIBUTES[key] + state.character.attributes[key]]));
  const deficits = Object.fromEntries(Object.keys(ATTRIBUTES).filter(key => currentAttributes[key] < base.requirements[key]).map(key => [key, base.requirements[key] - currentAttributes[key]]));
  return {ok: true, recipe: copy(recipe), base: copy(base), currentAttributes, deficits,
    eligibility: eligibility(state.character, {baseId: base.id, upgradeRank: 0})};
}
