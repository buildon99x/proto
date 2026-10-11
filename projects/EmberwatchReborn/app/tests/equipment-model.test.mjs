import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEquipmentState, equipmentBonuses, equipmentRows, previewRecipe, quoteEquipment, applyEquipmentCommand} from '../src/equipment.js';
import {EQUIPMENT_SLOTS, EQUIPMENT_STAT_KEYS, EQUIPMENT_ITEMS, EQUIPMENT_RECIPES, EQUIPMENT_AWARDS, EQUIPMENT_LIMITS, EQUIPMENT_REVISION} from '../src/equipment-content.js';

// Synthetic domain fixtures. No browser play, combat-earned budget, save store,
// NPC reach, or actual deriveStats integration is claimed by these tests.
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
function fixture({gold = 200, level = 1, attributes = {strength: 0, dexterity: 0, intelligence: 0}, materials = {}, tools = []} = {}) {
  return {
    character: {classId: 'warrior', level, tier: 'apprentice', attributes, equipment: Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null])), skills: {}, exclusiveBranches: {}},
    gold, stats: {earnedGold: gold, spentGold: 0, earnedXp: 0, kills: 0, deaths: 0},
    inventory: {equipmentInstances: [], materials, tools, consumables: {health_potion: 2}},
    world: {region: 'ash_hamlet', objectives: {trained: 1}, claimedRewards: [], position: {x: 90, y: 120}},
    options: {masterVolume: 0.7}, recovery: {cooldowns: {shield_charge: 0.8}},
  };
}
const buy = (commandId = 'buy-a', baseId = 'iron_mace') => ({type: 'buyEquipment', commandId, baseId, station: 'blacksmith'});
const craft = (commandId = 'craft-a', recipeId = 'oak_shield') => ({type: 'craftItem', commandId, recipeId, station: 'workshop'});
const award = (commandId = 'award-a', awardId = 'workshop_supplies') => ({type: 'receiveEquipmentAward', commandId, awardId, ...(awardId === 'workshop_supplies' ? {station: 'blacksmith'} : {})});
const equip = (itemId, commandId = 'equip-a') => ({type: 'equipItem', commandId, itemId});
const sell = (itemId, commandId = 'sell-a') => ({type: 'sellItem', commandId, itemId, station: 'blacksmith'});
const upgrade = (itemId, expectedRank = 0, commandId = 'upgrade-a') => ({type: 'upgradeItem', commandId, itemId, expectedRank, station: 'workshop'});
function run(state, command) {
  const before = clone(state), request = clone(command);
  const result = applyEquipmentCommand(freeze(state), freeze(command));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(state, before); assert.deepEqual(command, request);
  assert.equal(validateEquipmentState(result.state).ok, true);
  return result;
}
function rejects(state, command, code) {
  const before = clone(state), request = clone(command);
  const quoted = quoteEquipment(freeze(state), freeze(command)), result = applyEquipmentCommand(state, command);
  assert.equal(result.ok, false); assert.equal(result.code, code, JSON.stringify(result));
  assert.deepEqual(quoted, result); assert.deepEqual(state, before); assert.deepEqual(command, request);
}
const rich = () => fixture({gold: 10000, level: 5, attributes: {strength: 2, dexterity: 1, intelligence: 2}, materials: {iron: 1000, wood: 1000, thread: 1000, ember_shard: 1000}, tools: ['smith_tools']});

test('content is immutable, small, seven-slot and explicitly authored', () => {
  assert.equal(Object.keys(EQUIPMENT_ITEMS).length, 8); assert.equal(Object.keys(EQUIPMENT_RECIPES).length, 3);
  assert.equal(new Set(Object.values(EQUIPMENT_ITEMS).map(row => row.slot)).size, 7);
  assert.ok(Object.values(EQUIPMENT_ITEMS).every(row => row.provenance.includes('authored')));
  assert.throws(() => { EQUIPMENT_ITEMS.iron_mace.price = 0; }, TypeError);
  assert.throws(() => { EQUIPMENT_RECIPES.oak_shield.materials.iron = 0; }, TypeError);
});
test('empty R2-shaped state is accepted without initial copying, items, training gear or bonus injection', () => {
  const state = freeze(fixture()), before = clone(state);
  assert.deepEqual(validateEquipmentState(state), {ok: true});
  assert.deepEqual(equipmentBonuses(state), {ok: true, bonuses: Object.fromEntries(EQUIPMENT_STAT_KEYS.map(key => [key, 0]))});
  assert.equal(equipmentRows(state).rows.length, 0); assert.equal(equipmentRows(state).vendor.cash, 160);
  assert.equal(state.equipmentProgress, undefined); assert.deepEqual(state, before);
});
test('two copies of one base have distinct IDs; replacing, unequipping and selling affect only the chosen physical instance', () => {
  let state = fixture({level: 2, attributes: {strength: 2, dexterity: 0, intelligence: 0}});
  state = run(state, buy('first')).state; state = run(state, buy('second')).state;
  const [a, b] = state.inventory.equipmentInstances;
  assert.equal(a.baseId, b.baseId); assert.notEqual(a.id, b.id);
  state = run(state, equip(a.id, 'equip-first')).state;
  state = run(state, equip(b.id, 'equip-second')).state;
  assert.equal(state.character.equipment.mainHand, b.id); assert.equal(state.inventory.equipmentInstances.length, 2);
  state = run(state, sell(a.id, 'sell-first')).state;
  assert.deepEqual(state.inventory.equipmentInstances.map(x => x.id), [b.id]); assert.equal(state.character.equipment.mainHand, b.id);
  state = run(state, {type: 'unequipItem', commandId: 'remove-second', slot: 'mainHand'}).state;
  assert.equal(state.character.equipment.mainHand, null); assert.equal(state.gold, 148);
});
test('purchase and sale update exact gold, merchant cash, stock and lifetime earned/spent ledger', () => {
  let state = run(fixture(), buy('one', 'oak_shield')).state;
  assert.equal(state.gold, 172); assert.equal(state.stats.spentGold, 28); assert.equal(state.stats.earnedGold, 200);
  assert.equal(equipmentRows(state).vendor.cash, 188); assert.equal(equipmentRows(state).vendor.stock.oak_shield, 1);
  state = run(state, sell(state.inventory.equipmentInstances[0].id)).state;
  assert.equal(state.gold, 182); assert.equal(state.stats.earnedGold, 210); assert.equal(state.stats.spentGold, 28);
  assert.equal(equipmentRows(state).vendor.cash, 178); assert.equal(equipmentRows(state).vendor.stock.oak_shield, 1);
});
test('all seven equipped slots contribute once; unequipped alternatives and training conversion contribute nothing', () => {
  let state = rich();
  for (const baseId of ['iron_mace', 'oak_shield', 'padded_hood', 'guard_coat', 'travel_gloves', 'trail_boots', 'focus_charm']) {
    state = run(state, buy('buy-' + baseId, baseId)).state;
    state = run(state, equip(state.inventory.equipmentInstances.at(-1).id, 'equip-' + baseId)).state;
  }
  const bonuses = equipmentBonuses(state).bonuses;
  assert.equal(bonuses.physicalDamage, 3); assert.equal(bonuses.armor, 4); assert.equal(bonuses.hpMax, 9);
  assert.equal(bonuses.staminaMax, 3); assert.equal(bonuses.manaMax, 5); assert.equal(bonuses.manaRegen, 0.3); assert.equal(bonuses.moveSpeed, 6);
  assert.equal(bonuses.strength, 0); assert.equal(bonuses.criticalChance, 0);
  state = run(state, buy('alternative', 'runner_vest')).state;
  assert.deepEqual(equipmentBonuses(state).bonuses, bonuses);
  const row = equipmentRows(state).rows.at(-1);
  assert.deepEqual(row.deltas, {hpMax: -4, staminaMax: 5, armor: -2, moveSpeed: 4});
  state = run(state, equip(row.instance.id, 'try-runner')).state;
  assert.equal(equipmentBonuses(state).bonuses.moveSpeed, 10); assert.equal(equipmentBonuses(state).bonuses.armor, 2);
});
test('only permanent allocated attributes qualify; extra temporary or derived strength never qualifies', () => {
  let state = run(fixture(), buy()).state; const id = state.inventory.equipmentInstances[0].id;
  rejects(state, equip(id), 'ATTRIBUTE_REQUIREMENT');
  state = clone(state); state.character.temporaryStrength = 100; state.character.buffs = {champion: {strength: 100}};
  rejects(state, equip(id), 'ATTRIBUTE_REQUIREMENT');
  state = clone(state); state.character.level = 2; state.character.attributes.strength = 2;
  assert.equal(run(state, equip(id)).bonuses.physicalDamage, 2);
});
test('wrong slot, no ownership, equipped sales, same slot re-equip and empty unequip fail without side effects', () => {
  let state = run(fixture(), buy('shield', 'oak_shield')).state, id = state.inventory.equipmentInstances[0].id;
  rejects(state, {...equip(id), slot: 'head'}, 'WRONG_SLOT');
  rejects(state, equip('equipment:missing:0'), 'ITEM_NOT_OWNED');
  state = run(state, equip(id)).state;
  rejects(state, sell(id), 'ITEM_EQUIPPED'); rejects(state, equip(id, 'other-equip'), 'ALREADY_EQUIPPED');
  rejects(state, {type: 'unequipItem', commandId: 'empty', slot: 'head'}, 'SLOT_EMPTY');
});
test('one-time fixed supplies require progress and their station, grant actual materials/tools and cannot be reinjected', () => {
  let state = fixture(); state.world.objectives.trained = 0;
  rejects(state, award(), 'PROGRESS_REQUIRED'); state = clone(state); state.world.objectives.trained = 1;
  rejects(state, {...award(), station: 'campfire'}, 'WRONG_STATION');
  const result = run(state, award()); state = result.state;
  assert.deepEqual(state.inventory.materials, {iron: 1, wood: 2, thread: 1}); assert.deepEqual(state.inventory.tools, ['smith_tools']);
  assert.equal(state.gold, 200); assert.equal(state.inventory.equipmentInstances.length, 0);
  rejects(state, award('another-award'), 'AWARD_ALREADY_CLAIMED');
  rejects(state, {...award('payload'), gold: 999}, 'INVALID_COMMAND');
  const repeated = run(state, award()); assert.equal(repeated.replayed, true); assert.deepEqual(repeated.state, state);
});
test('warden reward requires the actual existing claimed chest ID; first dungeon hook remains explicitly gated', () => {
  let state = fixture();
  rejects(state, award('cache', 'warden_cache_gear'), 'PROGRESS_REQUIRED');
  state = clone(state); state.world.claimedRewards.push('chest:warden-cache');
  state = run(state, award('cache', 'warden_cache_gear')).state;
  assert.equal(state.inventory.equipmentInstances[0].baseId, 'padded_hood'); assert.equal(state.gold, 200);
  rejects(state, award('dungeon', 'first_dungeon_salvage'), 'PROGRESS_REQUIRED');
  state = clone(state); state.world.objectives.first_dungeon_cleared = 1;
  state = run(state, award('dungeon', 'first_dungeon_salvage')).state;
  assert.equal(state.inventory.materials.ember_shard, 1);
});
test('all three recipes consume their exact authored resources and create separate instances', () => {
  let state = rich(); state.world.objectives.first_dungeon_cleared = 1;
  for (const recipe of Object.values(EQUIPMENT_RECIPES)) {
    const before = clone(state), result = run(state, craft('make-' + recipe.id, recipe.id)); state = result.state;
    assert.equal(state.gold, before.gold - recipe.gold);
    for (const [key, amount] of Object.entries(recipe.materials)) assert.equal(state.inventory.materials[key], before.inventory.materials[key] - amount);
    assert.equal(state.inventory.equipmentInstances.at(-1).baseId, recipe.output);
  }
  state = run(state, craft('another-shield')).state;
  const shields = state.inventory.equipmentInstances.filter(x => x.baseId === 'oak_shield');
  assert.equal(shields.length, 2); assert.notEqual(shields[0].id, shields[1].id);
});
test('craft shortage, gold, tool, progress and station gates use the exact same quote and execute path', () => {
  rejects(fixture(), craft(), 'TOOL_REQUIRED');
  rejects(fixture({tools: ['smith_tools']}), craft(), 'MATERIAL_SHORTAGE');
  rejects(fixture({gold: 14, materials: {iron: 1, wood: 2}, tools: ['smith_tools']}), craft(), 'GOLD_SHORTAGE');
  rejects(rich(), {...craft(), station: 'blacksmith'}, 'WRONG_STATION');
  rejects(rich(), craft('focus', 'focus_charm'), 'PROGRESS_REQUIRED');
  rejects(rich(), craft('unknown', 'not-a-recipe'), 'UNKNOWN_RECIPE');
});
test('upgrades retain instance identity, do not change its twin, consume exact costs and affect equipped bonuses immediately', () => {
  let state = rich(); state.world.objectives.first_dungeon_cleared = 1;
  state = run(state, buy('twin-a')).state; state = run(state, buy('twin-b')).state;
  const [a, b] = state.inventory.equipmentInstances; state = run(state, equip(a.id)).state;
  const gold = state.gold, iron = state.inventory.materials.iron;
  state = run(state, upgrade(a.id)).state;
  assert.equal(state.inventory.equipmentInstances.find(x => x.id === a.id).upgradeRank, 1); assert.equal(state.inventory.equipmentInstances.find(x => x.id === b.id).upgradeRank, 0);
  assert.equal(equipmentBonuses(state).bonuses.physicalDamage, 3); assert.equal(state.gold, gold - 12); assert.equal(state.inventory.materials.iron, iron - 1);
  state = run(state, upgrade(a.id, 1, 'upgrade-2')).state;
  assert.equal(equipmentBonuses(state).bonuses.physicalDamage, 4); assert.equal(state.gold, gold - 34); assert.equal(state.inventory.materials.iron, iron - 3); assert.equal(state.inventory.materials.ember_shard, 999);
  rejects(state, upgrade(a.id, 2, 'upgrade-3'), 'MAX_UPGRADE');
});
test('upgrade expectedRank prevents a duplicate input with a fresh command ID from silently buying the next rank', () => {
  let state = run(rich(), buy()).state, id = state.inventory.equipmentInstances[0].id;
  state = run(state, upgrade(id)).state;
  rejects(state, upgrade(id, 0, 'retry-with-new-id'), 'STALE_UPGRADE');
  rejects(state, upgrade(id, 1, 'next-before-dungeon'), 'PROGRESS_REQUIRED');
});
test('sale after upgrade has declared resale value; upgrading or selling a removed instance fails', () => {
  let state = run(rich(), buy()).state, id = state.inventory.equipmentInstances[0].id;
  state = run(state, upgrade(id)).state;
  assert.equal(equipmentRows(state).rows[0].sellPrice, 16);
  const gold = state.gold; state = run(state, sell(id)).state; assert.equal(state.gold, gold + 16);
  rejects(state, upgrade(id, 1, 'sold-upgrade'), 'ITEM_NOT_OWNED'); rejects(state, sell(id, 'sold-again'), 'ITEM_NOT_OWNED');
});
test('exact successful command replay after sale returns current state and cannot resurrect its old item', () => {
  let state = run(fixture(), buy('original', 'oak_shield')).state, id = state.inventory.equipmentInstances[0].id;
  state = run(state, sell(id)).state;
  const repeated = run(state, buy('original', 'oak_shield'));
  assert.equal(repeated.replayed, true); assert.deepEqual(repeated.state, state); assert.equal(repeated.state.inventory.equipmentInstances.length, 0);
  const quote = quoteEquipment(state, buy('original', 'oak_shield')); assert.equal(quote.goldCost, 0); assert.equal(quote.replayed, true);
});
test('same command ID with changed action or payload conflicts; failed commands do not consume a receipt or ID', () => {
  let state = fixture({gold: 0}); rejects(state, buy('repeat', 'oak_shield'), 'GOLD_SHORTAGE');
  state = clone(state); state.gold = 28; state.stats.earnedGold = 28; state = run(state, buy('repeat', 'oak_shield')).state;
  rejects(state, buy('repeat', 'padded_hood'), 'COMMAND_CONFLICT');
  rejects(state, equip(state.inventory.equipmentInstances[0].id, 'repeat'), 'COMMAND_CONFLICT');
  assert.equal(state.equipmentProgress.receipts.length, 1);
});
test('quotes do not reserve stock, charge money, record commands or train skills; reviewed prices are checked', () => {
  const state = freeze(rich()), before = clone(state), command = buy('quote');
  const a = quoteEquipment(state, command), b = quoteEquipment(state, command);
  assert.deepEqual(a, b); assert.equal(a.goldCost, 32); assert.deepEqual(state, before); assert.equal(state.equipmentProgress, undefined);
  rejects(state, {...command, expectedGold: 31}, 'STALE_QUOTE');
  assert.equal(run(state, {...command, expectedGold: 32}).state.gold, state.gold - 32);
});
test('quote damage deltas equal actual equipped/upgrade output and preserve fractional units', () => {
  let state = run(rich(), buy('gloves', 'travel_gloves')).state, id = state.inventory.equipmentInstances[0].id;
  let command = equip(id), quote = quoteEquipment(state, command); state = run(state, command).state;
  assert.deepEqual(quote.bonusesAfter, equipmentBonuses(state).bonuses); assert.equal(quote.deltaBonuses.physicalDamage, 1);
  command = upgrade(id); quote = quoteEquipment(state, command); state = run(state, command).state;
  assert.deepEqual(quote.bonusesAfter, equipmentBonuses(state).bonuses); assert.equal(quote.deltaBonuses.physicalDamage, 0.5);
});
test('shop stock is finite and read-only rows cannot refresh it', () => {
  let state = run(rich(), buy('stock-1')).state; state = run(state, buy('stock-2')).state;
  rejects(state, buy('stock-3'), 'STOCK_SHORTAGE'); assert.equal(equipmentRows(state).vendor.stock.iron_mace, 0);
  equipmentRows(state); quoteEquipment(state, buy('stock-4')); assert.equal(equipmentRows(state).vendor.stock.iron_mace, 0);
});
test('merchant cash exhaustion refuses sale atomically rather than minting gold', () => {
  let state = rich();
  for (let index = 0; index < 16; index++) {
    state = run(state, craft('cash-craft-' + index)).state;
    state = run(state, sell(state.inventory.equipmentInstances.at(-1).id, 'cash-sell-' + index)).state;
  }
  assert.equal(equipmentRows(state).vendor.cash, 0);
  state = run(state, craft('cash-final')).state;
  rejects(state, sell(state.inventory.equipmentInstances[0].id, 'cash-shortage'), 'VENDOR_CASH_SHORTAGE');
});
test('nonfinite, fractional, negative and unsafe economic state fails closed', () => {
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const state = fixture(); state.gold = value; assert.equal(validateEquipmentState(state).ok, false);
    const materials = fixture(); materials.inventory.materials.iron = value; assert.equal(validateEquipmentState(materials).ok, false);
  }
  const mismatch = fixture(); mismatch.stats.spentGold = 1; assert.equal(validateEquipmentState(mismatch).code, 'INVALID_ECONOMY');
});
test('gold ledger and material overflow reject the entire command', () => {
  let state = run(fixture({gold: Number.MAX_SAFE_INTEGER}), buy('overflow', 'oak_shield')).state;
  rejects(state, sell(state.inventory.equipmentInstances[0].id), 'VALUE_OVERFLOW');
  rejects(fixture({materials: {iron: Number.MAX_SAFE_INTEGER}}), award(), 'VALUE_OVERFLOW');
});
test('unsupported class, invalid tier-level, extra slots, overspent attributes and arbitrary item stats fail closed', () => {
  for (const edit of [s => { s.character.classId = 'mage'; }, s => { s.character.tier = 'master'; }, s => { s.character.equipment.extra = null; }, s => { s.character.attributes.strength = 5; }]) {
    const state = fixture(); edit(state); assert.equal(validateEquipmentState(state).ok, false);
  }
  const state = clone(run(fixture(), buy('stats', 'oak_shield')).state); state.inventory.equipmentInstances[0].stats = {armor: 999};
  assert.equal(validateEquipmentState(state).code, 'INVALID_INVENTORY');
});
test('duplicate, invented, removed or altered instance IDs and forged upgrade ranks cannot validate', () => {
  const source = run(fixture(), buy('authored', 'oak_shield')).state;
  for (const edit of [s => { s.inventory.equipmentInstances.push(clone(s.inventory.equipmentInstances[0])); }, s => { s.inventory.equipmentInstances[0].id = 'equipment:fake:0'; }, s => { s.inventory.equipmentInstances[0].upgradeRank = 1; }, s => { s.inventory.equipmentInstances.length = 0; }, s => { delete s.equipmentProgress; }]) {
    const state = clone(source); edit(state); assert.equal(validateEquipmentState(state).ok, false);
  }
});
test('receipt edits, duplicate IDs, missing award claim, changed revision and phantom equipped ID are rejected', () => {
  const source = run(run(fixture(), award()).state, buy('receipt', 'oak_shield')).state;
  for (const edit of [s => { s.equipmentProgress.receipts.push(clone(s.equipmentProgress.receipts[0])); }, s => { s.equipmentProgress.receipts[1].event.goldDelta = 0; }, s => { s.equipmentProgress.receipts[1].command.baseId = 'iron_mace'; }, s => { s.equipmentProgress.claimedAwards = []; }, s => { s.equipmentProgress.version = 'next'; }, s => { s.character.equipment.offHand = 'equipment:receipt:0'; }]) {
    const state = clone(source); edit(state); assert.equal(validateEquipmentState(state).ok, false);
  }
});
test('malformed commands, getters, sparse arrays, cycles, unsafe keys and undefined fail without executing accessors', () => {
  for (const command of [null, {}, {...buy(), commandId: ''}, {...buy(), quantity: 2}, {...buy(), expectedGold: NaN}, {...buy(), commandId: 'constructor'}, {type: 'upgradeItem', commandId: 'rank', itemId: 'equipment:item:0', station: 'workshop', expectedRank: 0.5}]) assert.equal(applyEquipmentCommand(fixture(), command).ok, false);
  let reads = 0; const accessor = fixture(); Object.defineProperty(accessor, 'evil', {enumerable: true, get() { reads++; return 1; }});
  assert.equal(validateEquipmentState(accessor).ok, false); assert.equal(reads, 0);
  const sparse = fixture(); sparse.inventory.tools = new Array(1); assert.equal(validateEquipmentState(sparse).ok, false);
  const cycle = fixture(); cycle.loop = cycle; assert.equal(validateEquipmentState(cycle).ok, false);
  const unsafe = fixture(); unsafe.extra = JSON.parse('{"__proto__":1}'); assert.equal(validateEquipmentState(unsafe).ok, false);
  const missing = fixture(); missing.extra = undefined; assert.equal(validateEquipmentState(missing).ok, false);
});
test('successful result, receipt, quote and row objects are detached from input and immutable content', () => {
  const original = fixture(), result = run(original, buy('detached', 'oak_shield'));
  result.receipt.event.created[0].baseId = 'iron_mace'; assert.equal(result.state.inventory.equipmentInstances[0].baseId, 'oak_shield');
  const rows = equipmentRows(result.state); rows.rows[0].base.stats.armor = 900; rows.rows[0].instance.upgradeRank = 2;
  assert.equal(EQUIPMENT_ITEMS.oak_shield.stats.armor, 2); assert.equal(result.state.inventory.equipmentInstances[0].upgradeRank, 0);
  assert.equal(original.inventory.equipmentInstances.length, 0);
});
test('serialized reload keeps receipt idempotence, instance ownership, merchant money and unrelated campaign state', () => {
  let state = run(rich(), buy('persist', 'oak_shield')).state;
  state = run(state, equip(state.inventory.equipmentInstances[0].id)).state;
  const reloaded = JSON.parse(JSON.stringify(state)); assert.deepEqual(validateEquipmentState(reloaded), {ok: true});
  assert.deepEqual(run(reloaded, buy('persist', 'oak_shield')).state, state);
  assert.deepEqual(equipmentRows(reloaded), equipmentRows(state));
  assert.deepEqual(state.recovery, {cooldowns: {shield_charge: 0.8}}); assert.deepEqual(state.inventory.consumables, {health_potion: 2});
  assert.deepEqual(state.world.position, {x: 90, y: 120}); assert.deepEqual(state.character.skills, {});
});
test('128-instance inventory boundary refuses creation without spending resources', () => {
  let state = rich();
  for (let index = 0; index < EQUIPMENT_LIMITS.instances; index++) state = applyEquipmentCommand(state, craft('capacity-' + index)).state;
  assert.equal(state.inventory.equipmentInstances.length, 128);
  rejects(state, craft('capacity-over'), 'INVENTORY_FULL');
});
test('receipt capacity fails closed while a prior command still replays at the cap', () => {
  // Synthetic history generated from two actual first commands; no gameplay claim.
  let state = run(fixture(), buy('limit-buy', 'oak_shield')).state;
  const id = state.inventory.equipmentInstances[0].id;
  state = run(state, equip(id, 'limit-equip')).state;
  state = clone(state);
  for (let index = 2; index < EQUIPMENT_LIMITS.receipts; index++) {
    const removing = index % 2 === 0, commandId = 'limit-' + index;
    const command = removing ? {type: 'unequipItem', commandId, slot: 'offHand'} : equip(id, commandId);
    const event = {goldDelta: 0, materials: {}, tools: [], created: [], removed: null, upgraded: null, equipped: {slot: 'offHand', itemId: removing ? null : id, replacedItemId: removing ? id : null}, awardId: null};
    state.equipmentProgress.receipts.push({commandId, command, event}); state.character.equipment.offHand = removing ? null : id;
  }
  assert.equal(validateEquipmentState(state).ok, true);
  rejects(state, {type: 'unequipItem', commandId: 'over-limit', slot: 'offHand'}, 'RECEIPT_LIMIT');
  assert.equal(applyEquipmentCommand(state, buy('limit-buy', 'oak_shield')).replayed, true);
});

test('inherited object names cannot resolve to executable item, recipe or reward definitions', () => {
  for (const key of ['toString', 'valueOf', 'hasOwnProperty']) {
    rejects(fixture(), award('unknown-award-' + key, key), 'UNKNOWN_AWARD');
    rejects(fixture(), craft('unknown-recipe-' + key, key), 'UNKNOWN_RECIPE');
    rejects(fixture(), buy('unknown-base-' + key, key), 'UNKNOWN_ITEM');
  }
});


test('recipe output preview warns before a legal craft that cannot yet be equipped', () => {
  const state=fixture({gold:200,materials:{iron:1,ember_shard:1},tools:['smith_tools']});state.world.objectives.first_dungeon_cleared=1;
  const before=clone(state),preview=previewRecipe(freeze(state),'focus_charm');
  assert.equal(preview.ok,true);assert.deepEqual(preview.deficits,{intelligence:2});assert.equal(preview.eligibility.code,'ATTRIBUTE_REQUIREMENT');
  assert.deepEqual(preview.currentAttributes,{strength:18,dexterity:12,intelligence:10});assert.equal(preview.base.stats.manaMax,5);
  assert.equal(quoteEquipment(state,craft('preview-craft','focus_charm')).ok,true);assert.deepEqual(state,before);
  const crafted=run(state,craft('preview-craft','focus_charm')).state;
  assert.deepEqual(equipmentRows(crafted).rows[0].eligibility,preview.eligibility);
});
test('recipe eligibility changes with permanent allocation without generating resources or ownership', () => {
  const state=fixture({level:2,attributes:{strength:0,dexterity:0,intelligence:2},gold:0}),before=clone(state),preview=previewRecipe(state,'focus_charm');
  assert.equal(preview.eligibility.ok,true);assert.deepEqual(preview.deficits,{});assert.equal(preview.currentAttributes.intelligence,12);
  assert.deepEqual(state,before);assert.deepEqual(state.inventory.equipmentInstances,[]);
});
test('recipe preview is independent of unavailable crafting funds, station unlock and tools', () => {
  const state=fixture({gold:0}),before=clone(state);const preview=previewRecipe(state,'oak_shield');
  assert.equal(preview.ok,true);assert.equal(preview.eligibility.ok,true);assert.equal(preview.recipe.gold,15);
  assert.equal(quoteEquipment(state,craft()).code,'TOOL_REQUIRED');assert.deepEqual(state,before);
});
test('recipe preview returns detached catalog objects and leaves catalog requirements immutable', () => {
  const preview=previewRecipe(fixture(),'focus_charm');preview.base.requirements.intelligence=0;preview.base.stats.manaMax=999;preview.recipe.materials.iron=999;
  const again=previewRecipe(fixture(),'focus_charm');assert.equal(again.base.requirements.intelligence,12);assert.equal(again.base.stats.manaMax,5);assert.equal(again.recipe.materials.iron,1);
});
test('recipe preview rejects invalid records and unknown or non-string recipe identities safely', () => {
  assert.equal(previewRecipe(null,'focus_charm').code,'INVALID_STATE');
  for(const id of ['__proto__','constructor','missing',null,{},1])assert.equal(previewRecipe(fixture(),id).code,'UNKNOWN_RECIPE');
});
