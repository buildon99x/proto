import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSave, createCampaignStore} from '../src/campaign/save.js';
import {CLASS_WEAPONS, ITEM_TIERS, ITEM_QUALITIES, validateItemCatalog, validateCampaignInventory, equipCampaignItem, unequipCampaignItem, compareCampaignEquipment, receiveCampaignItems} from '../src/campaign/inventory.js';
import {validateCampaignEconomy, refreshCampaignVendor, quoteCampaignTrade, tradeCampaignItem, craftCampaignRecipe, refillCampaignPotion, enchantCampaignItem, disenchantCampaignItem, consumeCampaignItem} from '../src/campaign/economy.js';
const provenance = {kind: 'test', source: 'campaign-inventory.test.mjs: synthetic fixtures, not HW2 values'};
const req = {strength: 0, dexterity: 0, intelligence: 0};
const equipment = (id, slot, weaponType) => ({id, category: 'equipment', slot, ...(weaponType ? {weaponType} : {}), requirements: {...req}, stats: {damage: 2}, provenance});
const catalog = {id: 'test-items', revision: '1', provenance, bases: [
 equipment('mace', 'mainHand', 'mace'), equipment('shield', 'offHand', 'shield'), equipment('wand', 'mainHand', 'wand'), equipment('grimoire', 'offHand', 'grimoire'), equipment('sword', 'mainHand', 'sword'), equipment('bow', 'offHand', 'bow'),
 ...['head', 'chest', 'hands', 'feet', 'accessory'].map(slot => equipment(slot, slot)),
 {...equipment('heavy', 'mainHand', 'mace'), requirements: {strength: 19, dexterity: 13, intelligence: 11}},
 ...['ore', 'herb', 'rune'].map(id => ({id, category: 'material', provenance})),
 {id: 'pan', category: 'tool', toolType: 'pan', provenance}, {id: 'axe', category: 'tool', toolType: 'axe', provenance},
 {id: 'food', category: 'consumable', provenance, effects: [{id: 'synthetic-food-effect', provenance, action: 'test-effect', amount: 2}]},
 {id: 'potion', category: 'consumable', capacity: 3, provenance, effects: [{id: 'synthetic-potion-effect', provenance, action: 'test-effect', amount: 4}]}
]};
const item = (id, baseId = 'mace', tier = 'apprentice', quality = 'common') => ({id, baseId, tier, quality});
function state(classId = 'warrior') {
 const save = createCampaignSave(classId);
 save.gold = 100;
 save.inventory.equipmentInstances = [item('mace-1'), item('shield-1', 'shield'), item('heavy-1', 'heavy')];
 save.inventory.materials = {ore: 4, herb: 3, rune: 1};
 save.inventory.consumables = [{id: 'potion-1', baseId: 'potion', quantity: 1, charges: 0}];
 return save;
}
function vendor(overrides = {}) {
 return {id: 'smith', revision: '1', provenance, cash: 20, sellPrices: {ore: 5, mace: 10, shield: 10, food: 4, potion: 8, pan: 3}, buyPrices: {ore: 2, mace: 6, shield: 6, food: 1, potion: 3, pan: 1}, refresh: {intervalMinutes: 1440, cash: 'reset', stock: 'replace'}, stockCycles: [[{id: 'ore-row', baseId: 'ore', quantity: 4}, {id: 'mace-row', baseId: 'mace', quantity: 1, instance: {tier: 'apprentice', quality: 'rare', stats: {damage: 7}}}, {id: 'food-row', baseId: 'food', quantity: 3}, {id: 'pan-row', baseId: 'pan', quantity: 1}]], ...overrides};
}
const tx = (id, fields = {}) => ({transactionId: id, ...fields});
function succeeds(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.save; }
function failsWithoutMutation(save, run, code) {
 const before = JSON.stringify(save), result = run();
 assert.equal(result.ok, false, JSON.stringify(result));
 if (code) assert.equal(result.code, code);
 assert.equal(JSON.stringify(save), before);
 return result;
}
function policy(fields = {}) { return {id: 'test-policy', provenance, station: 'bench', materials: {ore: 2}, tools: [], goldCost: 3, ...fields}; }

test('equipment uses seven slots, three separate requirements and exact class main/off weapon semantics', () => {
 for (const [classId, weapons] of Object.entries(CLASS_WEAPONS)) {
  let save = createCampaignSave(classId);
  for (const [slot, type] of Object.entries(weapons)) save.inventory.equipmentInstances.push(item(type + '-1', type));
  for (const slot of ['head', 'chest', 'hands', 'feet', 'accessory']) save.inventory.equipmentInstances.push(item(slot + '-1', slot));
  for (const gear of save.inventory.equipmentInstances) save = succeeds(equipCampaignItem(save, catalog, tx('equip-' + gear.id, {itemId: gear.id})));
  assert.equal(Object.values(save.character.equipment).filter(Boolean).length, 7);
  const changed = succeeds(unequipCampaignItem(save, catalog, tx('off', {slot: 'offHand'})));
  assert.equal(changed.character.equipment.offHand, null);
  assert.notEqual(save.character.equipment.offHand, null);
 }
 const save = state();
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('heavy', {itemId: 'heavy-1'})), 'ATTRIBUTE_REQUIREMENT');
 save.character.attributes = {strength: 1, dexterity: 1, intelligence: 1};
 assert(equipCampaignItem(save, catalog, tx('heavy', {itemId: 'heavy-1'})).ok);
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('wrong-slot', {itemId: 'mace-1', slot: 'offHand'})), 'WRONG_SLOT');
 save.inventory.equipmentInstances.push(item('wand-1', 'wand'));
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('wrong-weapon', {itemId: 'wand-1'})), 'WRONG_WEAPON');
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('missing', {itemId: 'missing'})), 'ITEM_NOT_OWNED');
});

test('tier and quality are independent and comparison reports supplied stats without guessing combat formulas', () => {
 let save = state();
 save.inventory.equipmentInstances = ITEM_TIERS.flatMap(tier => ITEM_QUALITIES.map(quality => item(tier + quality, 'mace', tier, quality)));
 assert(validateCampaignInventory(save, catalog).ok);
 save = succeeds(equipCampaignItem(save, catalog, tx('equip', {itemId: 'apprenticecommon'})));
 save.inventory.equipmentInstances.find(row => row.id === 'mastercommon').stats = {damage: 7, block: 3};
 const comparison = compareCampaignEquipment(save, catalog, 'mastercommon');
 assert.deepEqual(comparison.deltas, {damage: 5, block: 3});
 assert.equal(comparison.eligibility.code, 'TIER_REQUIREMENT');
 assert.equal(comparison.eligibility.requiredTier, 'master');
 assert.equal(comparison.eligibility.trainedTier, 'apprentice');
 assert(equipCampaignItem(save, catalog, tx('same-tier-unique', {itemId: 'apprenticeunique'})).ok);
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('higher-tier-common', {itemId: 'mastercommon'})), 'TIER_REQUIREMENT');
 assert(comparison.unresolved.includes('derivedCombatTotals'));
});

test('catalog provenance, missing requirements, duplicate bases and duplicate inventory IDs are rejected', () => {
 for (const mutate of [x => delete x.provenance, x => x.bases.push(x.bases[0]), x => delete x.bases[0].requirements.intelligence, x => x.bases[0].requirements.strength = -1]) {
  const bad = structuredClone(catalog); mutate(bad); assert.equal(validateItemCatalog(bad).ok, false);
 }
 const save = state(); save.inventory.equipmentInstances.push(item('mace-1'));
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('x', {itemId: 'mace-1'})), 'DUPLICATE_ITEM_ID');
});

test('buy and sell transfer money exactly, preserve item properties and respect individual vendor prices', () => {
 const table = vendor(), original = state();
 let save = succeeds(tradeCampaignItem(original, catalog, table, tx('buy', {direction: 'buy', stockId: 'mace-row', quantity: 1})));
 assert.equal(original.gold, 100); assert.equal(save.gold, 90); assert.equal(save.economy.vendors.smith.cash, 30);
 const bought = save.inventory.equipmentInstances.find(row => row.id.startsWith('vendor:'));
 assert.equal(bought.quality, 'rare'); assert.equal(bought.stats.damage, 7);
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('sell', {direction: 'sell', itemId: bought.id, quantity: 1})));
 assert.equal(save.gold, 96); assert.equal(save.economy.vendors.smith.cash, 24);
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('buy-back', {direction: 'buy', stockId: 'resale:sell', quantity: 1})));
 assert.equal(save.inventory.equipmentInstances.find(row => row.id === bought.id).stats.damage, 7);
 const alternate = vendor({id: 'herbalist', buyPrices: {...table.buyPrices, ore: 4}});
 assert.equal(quoteCampaignTrade(save, catalog, table, {direction: 'sell', baseId: 'ore', quantity: 1}).total, 2);
 assert.equal(quoteCampaignTrade(save, catalog, alternate, {direction: 'sell', baseId: 'ore', quantity: 1}).total, 4);
});

test('cash, stock, equipped sales, stale quote and malformed price failures roll back every field', () => {
 const table = vendor(); let save = state();
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, table, tx('overstock', {direction: 'buy', stockId: 'ore-row', quantity: 5})), 'STOCK_SHORTAGE');
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, vendor({cash: 1}), tx('cash', {direction: 'sell', baseId: 'ore', quantity: 1})), 'VENDOR_CASH_SHORTAGE');
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, table, tx('quote', {direction: 'buy', stockId: 'ore-row', quantity: 1, expectedTotal: 0})), 'STALE_QUOTE');
 save = succeeds(equipCampaignItem(save, catalog, tx('eq', {itemId: 'mace-1'})));
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, table, tx('equipped', {direction: 'sell', itemId: 'mace-1', quantity: 1})), 'ITEM_EQUIPPED');
 for (const price of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
  const bad = vendor(); bad.sellPrices.ore = price;
  failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, bad, tx('bad', {direction: 'buy', stockId: 'ore-row', quantity: 1})));
 }
 const duplicate = vendor(); duplicate.stockCycles[0].push(duplicate.stockCycles[0][0]);
 failsWithoutMutation(save, () => refreshCampaignVendor(save, catalog, duplicate, tx('duplicate')));
 save.gold = 0;
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, table, tx('poor', {direction: 'buy', stockId: 'ore-row', quantity: 1})), 'GOLD_SHORTAGE');
});

test('24 world-hour boundary refreshes once; reopen, reload, altered tables and reversed time cannot reroll', () => {
 const table = vendor(); let save = state();
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('buy', {direction: 'buy', stockId: 'ore-row', quantity: 4})));
 assert.equal(save.economy.vendors.smith.stock[0].quantity, 0);
 save.world.timeMinutes = 1439.999;
 save = succeeds(refreshCampaignVendor(save, catalog, table, tx('early')));
 assert.equal(save.economy.vendors.smith.stock[0].quantity, 0);
 const altered = structuredClone(table); altered.stockCycles[0][1].instance.stats.damage = 999;
 failsWithoutMutation(save, () => refreshCampaignVendor(save, catalog, altered, tx('reroll')), 'RULE_CHANGED');
 save.world.timeMinutes = 1440;
 save = succeeds(refreshCampaignVendor(save, catalog, table, tx('boundary')));
 assert.equal(save.economy.vendors.smith.stock[0].quantity, 4); assert.equal(save.economy.vendors.smith.cash, 20);
 assert.equal(save.world.shopRefreshTimes.smith, 1440);
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('buy-again', {direction: 'buy', stockId: 'ore-row', quantity: 1})));
 const reloaded = JSON.parse(JSON.stringify(save));
 save = succeeds(refreshCampaignVendor(reloaded, catalog, table, tx('same-cycle')));
 assert.equal(save.economy.vendors.smith.stock[0].quantity, 3);
 save.world.timeMinutes = 1439;
 failsWithoutMutation(save, () => refreshCampaignVendor(save, catalog, table, tx('reverse')), 'WORLD_TIME_REVERSED');
});

test('transaction receipts are exactly-once across reload and cannot be reused for another intent', () => {
 const table = vendor(), request = tx('once', {direction: 'buy', stockId: 'ore-row', quantity: 1});
 let save = succeeds(tradeCampaignItem(state(), catalog, table, request));
 delete save.memo;
 const again = tradeCampaignItem(JSON.parse(JSON.stringify(save)), catalog, table, request);
 assert(again.ok && again.replayed); assert.deepEqual(again.save, save); assert.equal(again.save.transactions.length, 1);
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, table, {...request, quantity: 2}), 'TRANSACTION_CONFLICT');
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('once', {itemId: 'mace-1'})), 'TRANSACTION_CONFLICT');
 const old = state(); delete old.transactions;
 assert(tradeCampaignItem(old, catalog, table, request).ok);
});

test('material, tool and split consumable trading preserve ownership and total quantities', () => {
 const table = vendor(); let save = state();
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('food-buy', {direction: 'buy', stockId: 'food-row', quantity: 2})));
 const food = save.inventory.consumables.find(row => row.baseId === 'food');
 assert.equal(food.quantity, 2); assert.equal(save.economy.vendors.smith.stock.find(row => row.id === 'food-row').quantity, 1);
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('food-sell', {direction: 'sell', itemId: food.id, quantity: 1})));
 assert.equal(save.inventory.consumables.find(row => row.id === food.id).quantity, 1);
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('pan-buy', {direction: 'buy', stockId: 'pan-row', quantity: 1})));
 assert(save.inventory.tools.includes('pan'));
 save = succeeds(tradeCampaignItem(save, catalog, table, tx('pan-sell', {direction: 'sell', baseId: 'pan', quantity: 1})));
 assert(!save.inventory.tools.includes('pan')); assert(validateCampaignEconomy(save, catalog).ok);
});

test('crafting, station/tool/recipe unlock checks and shortages are atomic', () => {
 const recipe = policy({id: 'pan-recipe', kind: 'craft', outputs: {tools: ['pan']}}); let save = state();
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, recipe, tx('wrong', {station: 'well'})), 'WRONG_STATION');
 save = succeeds(craftCampaignRecipe(save, catalog, recipe, tx('pan', {station: 'bench'})));
 assert.equal(save.gold, 97); assert.equal(save.inventory.materials.ore, 2); assert.deepEqual(save.inventory.tools, ['pan']);
 const insufficient = policy({id: 'expensive', kind: 'craft', materials: {ore: 3}, outputs: {materials: {rune: 1}}});
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, insufficient, tx('fail', {station: 'bench'})), 'MATERIAL_SHORTAGE');
 const gated = policy({id: 'gated', kind: 'craft', unlock: {questFlag: 'unlock', value: true}, outputs: {materials: {rune: 1}}});
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, gated, tx('gated', {station: 'bench'})), 'RECIPE_LOCKED');
 const tools = policy({id: 'tool', kind: 'craft', tools: ['axe'], outputs: {materials: {rune: 1}}});
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, tools, tx('tool', {station: 'bench'})), 'TOOL_REQUIRED');
});

test('cooking explicitly requires a pan; recipe output duplicates cannot consume inputs', () => {
 const recipe = policy({id: 'cook', kind: 'cook', panToolId: 'pan', materials: {herb: 1}, outputs: {consumables: [{baseId: 'food', quantity: 1}]}}); let save = state();
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, recipe, tx('cook', {station: 'bench'})), 'COOKING_PAN_REQUIRED');
 save.inventory.tools = ['axe'];
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, {...recipe, panToolId: 'axe'}, tx('cook', {station: 'bench'})), 'COOKING_PAN_REQUIRED');
 save.inventory.tools = ['pan'];
 save = succeeds(craftCampaignRecipe(save, catalog, recipe, tx('cook', {station: 'bench'})));
 assert.equal(save.inventory.materials.herb, 2);
 const used = consumeCampaignItem(save, catalog, tx('eat', {itemId: 'made:cook:consumables:0'}));
 assert(used.ok); assert.equal(used.effects[0].id, 'synthetic-food-effect');
 const duplicate = policy({id: 'duplicate-pan', kind: 'craft', outputs: {tools: ['pan']}});
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, duplicate, tx('dupe', {station: 'bench'})), 'TOOL_ALREADY_OWNED');
});

test('potions refill only under supplied well policy, consume one charge, and retries never duplicate effects', () => {
 const refill = policy({id: 'well-refill', station: 'well', materials: {}, goldCost: 0, baseIds: ['potion'], amount: 'full'}); let save = state();
 save = succeeds(refillCampaignPotion(save, catalog, refill, tx('fill', {station: 'well', itemId: 'potion-1'})));
 assert.equal(save.inventory.consumables[0].charges, 3);
 failsWithoutMutation(save, () => refillCampaignPotion(save, catalog, refill, tx('full', {station: 'well', itemId: 'potion-1'})), 'POTION_ALREADY_FULL');
 const request = tx('drink', {itemId: 'potion-1'}), first = consumeCampaignItem(save, catalog, request);
 save = succeeds(first); assert.equal(save.inventory.consumables[0].charges, 2);
 const repeated = consumeCampaignItem(save, catalog, request); assert(repeated.replayed); assert.equal(repeated.effects, undefined);
});

test('enchant and disenchant require explicit restrictions and preserve all state on rejected policies', () => {
 const enchant = policy({id: 'rune-enchant', materials: {rune: 1}, baseIds: ['mace'], tiers: '*', qualities: ['common', 'rare'], equipped: 'reject', existingEnchantment: 'reject', enchantment: {id: 'explicit-rune', provenance, stats: {damage: 2}}});
 let save = state();
 failsWithoutMutation(save, () => enchantCampaignItem(save, catalog, {...enchant, existingEnchantment: undefined}, tx('unknown', {station: 'bench', itemId: 'mace-1'})));
 save = succeeds(enchantCampaignItem(save, catalog, enchant, tx('enchant', {station: 'bench', itemId: 'mace-1'})));
 assert.equal(save.inventory.equipmentInstances[0].enchantment.id, 'explicit-rune'); assert.equal(save.inventory.materials.rune, 0);
 save.inventory.materials.rune = 1;
 failsWithoutMutation(save, () => enchantCampaignItem(save, catalog, enchant, tx('again', {station: 'bench', itemId: 'mace-1'})), 'ALREADY_ENCHANTED');
 const disenchant = policy({id: 'disenchant', materials: {}, goldCost: 0, baseIds: '*', tiers: '*', qualities: '*', equipped: 'reject', existingEnchantment: 'required', itemDisposition: 'destroy', outputs: {materials: {rune: 1}}});
 save = succeeds(disenchantCampaignItem(save, catalog, disenchant, tx('disenchant', {station: 'bench', itemId: 'mace-1'})));
 assert(!save.inventory.equipmentInstances.some(row => row.id === 'mace-1')); assert.equal(save.inventory.materials.rune, 2);
 assert(disenchantCampaignItem(save, catalog, disenchant, tx('disenchant', {station: 'bench', itemId: 'mace-1'})).replayed);
});

test('award identity and transaction identity prevent duplicate rewards, including separate retry IDs', () => {
 const award = {id: 'chest:01', provenance, items: {materials: {ore: 2}, equipment: [item('reward')]}, gold: 4};
 let save = state(); delete save.transactions;
 save = succeeds(receiveCampaignItems(save, catalog, tx('claim', {award})));
 assert.equal(save.gold, 104); assert.equal(save.inventory.materials.ore, 6);
 assert(receiveCampaignItems(save, catalog, tx('claim', {award})).replayed);
 failsWithoutMutation(save, () => receiveCampaignItems(save, catalog, tx('new-claim', {award})), 'AWARD_ALREADY_RECEIVED');
 const duplicate = {...award, id: 'chest:02'};
 failsWithoutMutation(save, () => receiveCampaignItems(save, catalog, tx('dupe', {award: duplicate})), 'DUPLICATE_ITEM_ID');
});

test('economy and receipt commit atomically through the campaign store and failed writes do not settle', () => {
 const map = new Map(), storage = {fail: false, getItem: key => map.get(key) ?? null, setItem(key, value) { if (this.fail) throw Error('quota'); map.set(key, value); }};
 const store = createCampaignStore(storage), initial = state(); assert(store.save(initial).ok);
 const request = tx('purchase', {direction: 'buy', stockId: 'ore-row', quantity: 1});
 const changed = tradeCampaignItem(initial, catalog, vendor(), request); assert(changed.ok);
 storage.fail = true; assert.equal(store.save(changed.save, {expectedRevision: 1}).ok, false);
 assert.equal(store.load().save.gold, 100); assert.equal(store.load().save.transactions.length, 0);
 storage.fail = false; assert(store.save(changed.save, {expectedRevision: 1}).ok);
 const loaded = store.load().save; assert.equal(loaded.gold, 95); assert.equal(loaded.economy.vendors.smith.cash, 25);
 assert(tradeCampaignItem(loaded, catalog, vendor(), request).replayed);
});

test('operations accept frozen inputs and never expose mutable aliases to original snapshots or definitions', () => {
 const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
 const save = freeze(state()), table = freeze(vendor()), frozenCatalog = freeze(structuredClone(catalog));
 const result = tradeCampaignItem(save, frozenCatalog, table, freeze(tx('frozen', {direction: 'buy', stockId: 'mace-row', quantity: 1})));
 assert(result.ok); result.save.inventory.equipmentInstances[0].quality = 'unique';
 assert.equal(save.inventory.equipmentInstances[0].quality, 'common');
 assert.equal(table.stockCycles[0][1].instance.quality, 'rare');
});

test('malformed optional ledgers, unsafe balances and duplicate stock ownership fail closed', () => {
 for (const mutate of [save => save.transactions = [{id: 'same'}, {id: 'same'}], save => save.inventoryAwards = ['same', 'same'], save => save.inventoryRules = {bad: 4}, save => save.world.shopRefreshTimes = {smith: -1}, save => save.economy = {vendors: {smith: {cash: -1, cycle: 0, lastRefreshMinute: 0, stock: []}}}]) {
  const save = state(); mutate(save);
  failsWithoutMutation(save, () => refreshCampaignVendor(save, catalog, vendor(), tx('bad-ledger')));
 }
 const save = state(); save.gold = Number.MAX_SAFE_INTEGER;
 failsWithoutMutation(save, () => tradeCampaignItem(save, catalog, vendor(), tx('overflow', {direction: 'sell', baseId: 'ore', quantity: 1})), 'GOLD_OVERFLOW');
 const table = vendor({cash: Number.MAX_SAFE_INTEGER});
 failsWithoutMutation(state(), () => tradeCampaignItem(state(), catalog, table, tx('merchant-overflow', {direction: 'buy', stockId: 'ore-row', quantity: 1})), 'GOLD_OVERFLOW');
});

test('refresh uses the supplied cycle table and cash policy, never RNG or real time', () => {
 const table = vendor({refresh: {intervalMinutes: 1440, cash: 'retain', stock: 'replace'}});
 table.stockCycles.push([{id: 'ore-row', baseId: 'ore', quantity: 2}]);
 let save = succeeds(tradeCampaignItem(state(), catalog, table, tx('buy', {direction: 'buy', stockId: 'ore-row', quantity: 1})));
 save.world.timeMinutes = 1440;
 save = succeeds(refreshCampaignVendor(save, catalog, table, tx('day-one')));
 assert.equal(save.economy.vendors.smith.cash, 25); assert.equal(save.economy.vendors.smith.stock[0].quantity, 2);
 save.world.timeMinutes = 3 * 1440;
 save = succeeds(refreshCampaignVendor(save, catalog, table, tx('day-three')));
 assert.equal(save.economy.vendors.smith.stock[0].quantity, 2); assert.equal(save.economy.vendors.smith.cycle, 3);
});

test('recipe and enchantment policies are bound after success and cannot be changed to reroll outcomes', () => {
 const recipe = policy({id: 'fixed-recipe', kind: 'craft', materials: {}, goldCost: 0, outputs: {equipment: [{baseId: 'mace', tier: 'apprentice', quality: 'rare', stats: {damage: 3}}]}});
 let save = succeeds(craftCampaignRecipe(state(), catalog, recipe, tx('craft', {station: 'bench'})));
 assert(craftCampaignRecipe(save, catalog, recipe, tx('craft', {station: 'bench'})).replayed);
 const reroll = structuredClone(recipe); reroll.outputs.equipment[0].stats.damage = 999;
 failsWithoutMutation(save, () => craftCampaignRecipe(save, catalog, reroll, tx('reroll', {station: 'bench'})), 'RULE_CHANGED');
 save = succeeds(craftCampaignRecipe(save, catalog, recipe, tx('craft-two', {station: 'bench'})));
 assert.equal(save.inventory.equipmentInstances.filter(row => row.baseId === 'mace').length, 3);
});

test('invalid inputs return errors, including non-JSON policies, without throwing or silently losing data', () => {
 for (const value of [null, undefined, 1, 'table', [], {}, {id: 'test'}]) {
  assert.doesNotThrow(() => refreshCampaignVendor(state(), catalog, value, tx('bad')));
  assert.equal(refreshCampaignVendor(state(), catalog, value, tx('bad')).ok, false);
  assert.equal(craftCampaignRecipe(state(), catalog, value, tx('bad', {station: 'bench'})).ok, false);
 }
 assert.equal(quoteCampaignTrade(state(), catalog, vendor(), null).ok, false);
 for (const value of [NaN, Infinity, undefined, () => 1, 1n]) {
  const recipe = policy({kind: 'craft', outputs: {materials: {ore: value}}});
  failsWithoutMutation(state(), () => craftCampaignRecipe(state(), catalog, recipe, tx('bad', {station: 'bench'})));
 }
});

test('imported saves cannot hide extra slots, class-invalid equipped gear, or duplicate physical stock IDs', () => {
 let save = state(); save.character.equipment.legacyWeapon = null;
 assert.equal(validateCampaignInventory(save, catalog).code, 'INVALID_CHARACTER_SHAPE');
 save = state(); save.inventory.equipmentInstances.push(item('wand', 'wand')); save.character.equipment.mainHand = 'wand';
 assert.equal(validateCampaignInventory(save, catalog).code, 'INVALID_EQUIPPED_CLASS');
 save = succeeds(refreshCampaignVendor(state(), catalog, vendor(), tx('stock')));
 const stock = save.economy.vendors.smith.stock.find(row => row.baseId === 'mace');
 save.inventory.equipmentInstances.push(structuredClone(stock.item));
 assert.equal(validateCampaignEconomy(save, catalog).code, 'INVALID_STOCK_ITEM');
});


test('equipment tiers require learned promotion; level alone never unlocks gear and invalid tiers fail closed', () => {
 for (let trained = 0; trained < ITEM_TIERS.length; trained++) {
  const save = state();
  save.character.level = 50;
  save.character.tier = ITEM_TIERS[trained];
  save.inventory.equipmentInstances = ITEM_TIERS.map(tier => item(tier, 'mace', tier, 'common'));
  for (let required = 0; required < ITEM_TIERS.length; required++) {
   const request = tx('equip-' + ITEM_TIERS[required], {itemId: ITEM_TIERS[required]});
   if (required <= trained) assert(equipCampaignItem(save, catalog, request).ok);
   else failsWithoutMutation(save, () => equipCampaignItem(save, catalog, request), 'TIER_REQUIREMENT');
  }
 }
 let save = state();
 save.inventory.equipmentInstances.push(item('trained-gear', 'mace', 'adept'));
 failsWithoutMutation(save, () => equipCampaignItem(save, catalog, tx('promoted', {itemId: 'trained-gear'})), 'TIER_REQUIREMENT');
 save.character.tier = 'adept';
 save = succeeds(equipCampaignItem(save, catalog, tx('promoted', {itemId: 'trained-gear'})));
 assert.equal(save.character.equipment.mainHand, 'trained-gear');
 assert.equal(save.character.level, 1); // Promotion validity belongs to the progression operation.
 save.character.tier = 'apprentice';
 assert.equal(validateCampaignInventory(save, catalog).code, 'TIER_REQUIREMENT');
 for (const tier of ['grandmaster', '', null, 3]) {
  const bad = state(); bad.character.tier = tier;
  failsWithoutMutation(bad, () => equipCampaignItem(bad, catalog, tx('invalid-tier', {itemId: 'mace-1'})), 'INVALID_CHARACTER_TIER');
 }
 const badItem = state(); badItem.inventory.equipmentInstances[0].tier = 'grandmaster';
 failsWithoutMutation(badItem, () => equipCampaignItem(badItem, catalog, tx('invalid-item-tier', {itemId: 'mace-1'})), 'INVALID_EQUIPMENT');
});
