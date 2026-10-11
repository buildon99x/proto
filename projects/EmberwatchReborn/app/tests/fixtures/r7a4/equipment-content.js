// R3 staging content. Every price, requirement, stat, stock and upgrade below is
// authored Emberwatch tuning, not a measured Hammerwatch II equipment value.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const EQUIPMENT_SLOTS = freeze(['mainHand', 'offHand', 'head', 'chest', 'hands', 'feet', 'accessory']);
export const EQUIPMENT_STAT_KEYS = freeze(['hpMax', 'manaMax', 'staminaMax', 'strength', 'dexterity', 'intelligence', 'armor', 'physicalDamage', 'moveSpeed', 'criticalChance', 'manaRegen', 'staminaRegen', 'healthRegen', 'attackSpeed', 'castSpeed', 'spellPower', 'criticalMultiplier']);
export const EQUIPMENT_REVISION = 'emberwatch-r3-equipment-v1';
export const EQUIPMENT_LIMITS = freeze({receipts: 4096, instances: 128, upgradeRank: 2});
const requirements = {strength: 18, dexterity: 12, intelligence: 10};
const item = (id, name, slot, stats, price, sellPrice, upgradeStats, extra = {}) => ({
  id, name, slot, tier: 'apprentice', quality: 'common', classes: ['warrior'],
  requirements: {...requirements}, stats, price, sellPrice, upgradeStats,
  provenance: 'Emberwatch authored R3 tuning', ...extra,
});
export const EQUIPMENT_ITEMS = freeze({
  iron_mace: item('iron_mace', '초소 철퇴', 'mainHand', {physicalDamage: 2}, 32, 12, {physicalDamage: 1}, {weaponType: 'mace', requirements: {strength: 20, dexterity: 12, intelligence: 10}}),
  oak_shield: item('oak_shield', '참나무 방패', 'offHand', {armor: 2, staminaMax: 3}, 28, 10, {armor: 1}, {weaponType: 'shield'}),
  padded_hood: item('padded_hood', '누비 두건', 'head', {hpMax: 5}, 18, 6, {hpMax: 3}),
  guard_coat: item('guard_coat', '초소 외투', 'chest', {armor: 2, hpMax: 4}, 34, 12, {hpMax: 3}),
  travel_gloves: item('travel_gloves', '길잡이 장갑', 'hands', {physicalDamage: 1}, 20, 7, {physicalDamage: 0.5}, {requirements: {strength: 18, dexterity: 13, intelligence: 10}}),
  trail_boots: item('trail_boots', '잿길 장화', 'feet', {moveSpeed: 6}, 24, 8, {moveSpeed: 2}),
  focus_charm: item('focus_charm', '집중 목걸이', 'accessory', {manaMax: 5, manaRegen: 0.3}, 24, 8, {manaMax: 2}, {requirements: {strength: 18, dexterity: 12, intelligence: 12}}),
  runner_vest: item('runner_vest', '척후 조끼', 'chest', {staminaMax: 5, moveSpeed: 4}, 34, 12, {staminaMax: 2}),
});
export const EQUIPMENT_VENDOR = freeze({
  id: 'village_smith', station: 'blacksmith', initialCash: 160,
  initialStock: Object.fromEntries(Object.keys(EQUIPMENT_ITEMS).map(id => [id, 2])),
  // No world-time refresh or buyback is implied by this staged foundation.
});
export const EQUIPMENT_RECIPES = freeze({
  oak_shield: {id: 'oak_shield', name: '참나무 방패 제작', output: 'oak_shield', station: 'workshop', tool: 'smith_tools', gold: 15, materials: {iron: 1, wood: 2}, unlock: {objective: 'trained', minimum: 1}},
  runner_vest: {id: 'runner_vest', name: '척후 조끼 제작', output: 'runner_vest', station: 'workshop', tool: 'smith_tools', gold: 20, materials: {thread: 3, wood: 1}, unlock: {objective: 'trained', minimum: 1}},
  focus_charm: {id: 'focus_charm', name: '집중 목걸이 제작', output: 'focus_charm', station: 'workshop', tool: 'smith_tools', gold: 18, materials: {iron: 1, ember_shard: 1}, unlock: {objective: 'first_dungeon_cleared', minimum: 1}},
});
export const EQUIPMENT_UPGRADES = freeze({
  1: {rank: 1, station: 'workshop', tool: 'smith_tools', gold: 12, materials: {iron: 1}, sellBonus: 4, unlock: {objective: 'trained', minimum: 1}},
  2: {rank: 2, station: 'workshop', tool: 'smith_tools', gold: 22, materials: {iron: 2, ember_shard: 1}, sellBonus: 8, unlock: {objective: 'first_dungeon_cleared', minimum: 1}},
});
// Fixed one-time bundles only. The caller cannot supply arbitrary rewards.
// These are proposed R3 hooks; the existing R2 runtime does not dispatch them.
export const EQUIPMENT_AWARDS = freeze({
  workshop_supplies: {id: 'workshop_supplies', station: 'blacksmith', unlock: {objective: 'trained', minimum: 1}, equipment: [], materials: {iron: 1, wood: 2, thread: 1}, tools: ['smith_tools']},
  warden_cache_gear: {id: 'warden_cache_gear', unlock: {claimedReward: 'chest:warden-cache'}, equipment: ['padded_hood'], materials: {iron: 1, thread: 2}, tools: []},
  first_dungeon_salvage: {id: 'first_dungeon_salvage', unlock: {objective: 'first_dungeon_cleared', minimum: 1}, equipment: [], materials: {iron: 2, wood: 1, ember_shard: 1}, tools: []},
});
