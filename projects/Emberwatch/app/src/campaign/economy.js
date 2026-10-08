// Atomic, data-driven economy; no item prices, recipes, rolls or stat formulas live here.
import {
 record, count, identifier, copy, failure, declared, itemBase, validateEquipmentInstance,
 validateConsumable, validateItemCatalog, validateCampaignInventory, bindInventoryRule, campaignInventoryOperation, addInventoryBundle
} from './inventory.js';
export const VENDOR_REFRESH_MINUTES = 24 * 60;
const positive = value => count(value) && value > 0;
const priceMap = (value, catalog) => record(value) && Object.entries(value).every(([id, price]) => itemBase(catalog, id) && count(price));
function stockValidation(stock, catalog, ids = new Set()) {
 if (!Array.isArray(stock)) return failure('INVALID_STOCK');
 const rows = new Set();
 for (const row of stock) {
  const base = itemBase(catalog, row?.baseId);
  if (!record(row) || !identifier(row.id) || rows.has(row.id) || !base || !count(row.quantity)) return failure('INVALID_STOCK');
  rows.add(row.id);
  if (['equipment', 'tool'].includes(base.category) && row.quantity > 1) return failure('INVALID_STOCK');
  if (base.category === 'equipment' || base.category === 'consumable') {
   const valid = base.category === 'equipment' ? validateEquipmentInstance(row.item, catalog) : validateConsumable(row.item, catalog);
   if (!valid.ok || row.item.baseId !== row.baseId || row.quantity > 0 && ids.has(row.item.id)) return failure('INVALID_STOCK_ITEM');
   if (base.category === 'consumable' && row.item.quantity !== row.quantity && row.quantity !== 0) return failure('INVALID_STOCK_QUANTITY');
   // Sold-out rows retain their immutable item template, but no longer own its ID.
   if (row.quantity > 0) ids.add(row.item.id);
  }
 }
 return {ok: true};
}
export function validateCampaignEconomy(save, catalog) {
 const valid = validateCampaignInventory(save, catalog);
 if (!valid.ok) return valid;
 if (save.economy === undefined) return {ok: true};
 if (!record(save.economy) || !record(save.economy.vendors)) return failure('INVALID_ECONOMY');
 const ids = new Set([...save.inventory.equipmentInstances, ...save.inventory.consumables].map(item => item.id));
 for (const [id, vendor] of Object.entries(save.economy.vendors)) {
  if (!identifier(id) || !record(vendor) || !count(vendor.cash) || !count(vendor.cycle) || !count(vendor.lastRefreshMinute) || vendor.lastRefreshMinute !== vendor.cycle * VENDOR_REFRESH_MINUTES) return failure('INVALID_VENDOR_STATE');
  const stock = stockValidation(vendor.stock, catalog, ids);
  if (!stock.ok) return stock;
 }
 return {ok: true};
}
function createStock(table, cycle, catalog) {
 return table.stockCycles[cycle % table.stockCycles.length].map(row => {
  const base = itemBase(catalog, row.baseId), result = {id: row.id, baseId: row.baseId, quantity: row.quantity};
  if (base.category === 'equipment' || base.category === 'consumable') {
   result.item = {...copy(row.instance ?? {}), id: 'vendor:' + table.id + ':' + cycle + ':' + row.id, baseId: row.baseId};
   if (base.category === 'consumable') result.item.quantity = row.quantity;
  }
  return result;
 });
}
export function validateVendorTable(table, catalog) {
 const catalogValid = validateItemCatalog(catalog);
 if (!catalogValid.ok) return catalogValid;
 if (!declared(table) || !identifier(table.id) || !identifier(table.revision) || !count(table.cash) || !priceMap(table.sellPrices, catalog) || !priceMap(table.buyPrices, catalog)) return failure('INVALID_VENDOR_TABLE');
 if (!record(table.refresh) || table.refresh.intervalMinutes !== VENDOR_REFRESH_MINUTES || !['reset', 'retain', 'atLeast'].includes(table.refresh.cash) || table.refresh.stock !== 'replace') return failure('UNDECLARED_REFRESH_POLICY');
 if (!Array.isArray(table.stockCycles) || !table.stockCycles.length || !table.stockCycles.every(Array.isArray)) return failure('INVALID_STOCK_TABLE');
 for (let index = 0; index < table.stockCycles.length; index++) {
  const rows = table.stockCycles[index];
  if (rows.some(row => !record(row) || !positive(row.quantity) || !Object.hasOwn(table.sellPrices, row.baseId))) return failure('INVALID_STOCK_TABLE');
  if (rows.some(row => !itemBase(catalog, row.baseId))) return failure('UNKNOWN_ITEM_BASE');
  const stock = stockValidation(createStock(table, index, catalog), catalog);
  if (!stock.ok) return stock;
 }
 return {ok: true};
}
function prepareVendor(next, catalog, table) {
 const economy = validateCampaignEconomy(next, catalog);
 if (!economy.ok) return economy;
 const valid = validateVendorTable(table, catalog);
 if (!valid.ok) return valid;
 const binding = bindInventoryRule(next, 'vendor', table);
 if (!binding.ok) return binding;
 next.economy ??= {vendors: {}};
 next.world.shopRefreshTimes ??= {};
 if (!record(next.world.shopRefreshTimes) || !Object.entries(next.world.shopRefreshTimes).every(([id, time]) => identifier(id) && count(time))) return failure('INVALID_REFRESH_LEDGER');
 const cycle = Math.floor(next.world.timeMinutes / VENDOR_REFRESH_MINUTES);
 if (!count(cycle) || !count(cycle * VENDOR_REFRESH_MINUTES)) return failure('INVALID_WORLD_TIME');
 const old = next.economy.vendors[table.id];
 if (old && cycle < old.cycle) return failure('WORLD_TIME_REVERSED');
 const refreshed = !old || cycle > old.cycle;
 if (refreshed) {
  const cash = !old || table.refresh.cash === 'reset' ? table.cash : table.refresh.cash === 'retain' ? old.cash : Math.max(old.cash, table.cash);
  next.economy.vendors[table.id] = {cycle, lastRefreshMinute: cycle * VENDOR_REFRESH_MINUTES, cash, stock: createStock(table, cycle, catalog)};
  next.world.shopRefreshTimes[table.id] = cycle * VENDOR_REFRESH_MINUTES;
 }
 const check = validateCampaignEconomy(next, catalog);
 return check.ok ? {ok: true, vendor: next.economy.vendors[table.id], refreshed} : check;
}
function economyOperation(save, catalog, domain, request, run) {
 return campaignInventoryOperation(save, catalog, domain, request, next => {
  const valid = validateCampaignEconomy(next, catalog);
  if (!valid.ok) return valid;
  const result = run(next);
  if (!result.ok) return result;
  const check = validateCampaignEconomy(next, catalog);
  return check.ok ? result : check;
 });
}
export function refreshCampaignVendor(save, catalog, table, request) {
 return economyOperation(save, catalog, 'economy.refresh', {...request, vendorId: table?.id}, next => {
  const ready = prepareVendor(next, catalog, table);
  return ready.ok ? {ok: true, vendorId: table.id, refreshed: ready.refreshed, cycle: ready.vendor.cycle} : ready;
 });
}
function tradePlan(next, catalog, table, request) {
 const ready = prepareVendor(next, catalog, table);
 if (!ready.ok) return ready;
 const vendor = ready.vendor;
 if (!positive(request.quantity)) return failure('INVALID_QUANTITY');
 if (request.expectedCycle !== undefined && request.expectedCycle !== vendor.cycle) return failure('STALE_QUOTE');
 let base, row, item, unitPrice;
 if (request.direction === 'buy') {
  row = vendor.stock.find(entry => entry.id === request.stockId);
  if (!row || row.quantity < request.quantity) return failure('STOCK_SHORTAGE');
  base = itemBase(catalog, row.baseId); item = row.item;
  unitPrice = table.sellPrices[base.id];
  if (base.category === 'tool' && next.inventory.tools.includes(base.id)) return failure('TOOL_ALREADY_OWNED');
 } else if (request.direction === 'sell') {
  item = [...next.inventory.equipmentInstances, ...next.inventory.consumables].find(entry => entry.id === request.itemId);
  base = itemBase(catalog, item?.baseId ?? request.baseId);
  if (!base) return failure('ITEM_NOT_OWNED');
  if (['equipment', 'consumable'].includes(base.category) && (!item || request.baseId !== undefined && item.baseId !== request.baseId)) return failure('ITEM_NOT_OWNED');
  if (base.category === 'material' && (next.inventory.materials[base.id] ?? 0) < request.quantity) return failure('MATERIAL_SHORTAGE');
  if (base.category === 'tool' && !next.inventory.tools.includes(base.id)) return failure('ITEM_NOT_OWNED');
  if (base.category === 'consumable' && item.quantity < request.quantity) return failure('STOCK_SHORTAGE');
  if (base.category === 'equipment' && Object.values(next.character.equipment).includes(item.id)) return failure('ITEM_EQUIPPED');
  unitPrice = table.buyPrices[base.id];
  if (!Object.hasOwn(table.buyPrices, base.id) || !Object.hasOwn(table.sellPrices, base.id)) return failure('VENDOR_DECLINES_ITEM');
 } else return failure('INVALID_TRADE_DIRECTION');
 if (['equipment', 'tool'].includes(base.category) && request.quantity !== 1 || base.capacity !== undefined && request.quantity !== 1) return failure('INVALID_QUANTITY');
 // Split consumable stacks receive a deterministic transaction-derived instance ID.
 const total = unitPrice * request.quantity;
 if (!count(unitPrice) || !count(total)) return failure('INVALID_PRICE');
 if (request.expectedTotal !== undefined && request.expectedTotal !== total) return failure('STALE_QUOTE');
 if (request.direction === 'buy' && next.gold < total) return failure('GOLD_SHORTAGE');
 if (request.direction === 'sell' && vendor.cash < total) return failure('VENDOR_CASH_SHORTAGE');
 if (!count(next.gold + (request.direction === 'buy' ? -total : total)) || !count(vendor.cash + (request.direction === 'buy' ? total : -total))) return failure('GOLD_OVERFLOW');
 return {ok: true, vendor, row, item, base, total, unitPrice, cycle: vendor.cycle};
}
export function quoteCampaignTrade(save, catalog, table, request) {
 const valid = validateCampaignEconomy(save, catalog);
 if (!valid.ok) return valid;
 if (!record(request)) return failure('INVALID_TRADE');
 const plan = tradePlan(copy(save), catalog, table, request);
 return plan.ok ? {ok: true, vendorId: table.id, direction: request.direction, baseId: plan.base.id, quantity: request.quantity, total: plan.total, unitPrice: plan.unitPrice, cycle: plan.cycle} : plan;
}
export function tradeCampaignItem(save, catalog, table, request) {
 return economyOperation(save, catalog, 'economy.trade', {...request, vendorId: table?.id}, next => {
  const plan = tradePlan(next, catalog, table, request);
  if (!plan.ok) return plan;
  const {vendor, row, item, base, total} = plan, amount = request.quantity, buying = request.direction === 'buy';
  if (buying) {
   let bundle;
   if (base.category === 'equipment') bundle = {equipment: [item]};
   if (base.category === 'material') bundle = {materials: {[base.id]: amount}};
   if (base.category === 'tool') bundle = {tools: [base.id]};
   if (base.category === 'consumable') bundle = {consumables: [{...item, id: amount === row.quantity ? item.id : 'purchase:' + request.transactionId, quantity: amount}]};
   const added = addInventoryBundle(next, catalog, bundle);
   if (!added.ok) return added;
   row.quantity -= amount;
   if (base.category === 'consumable' && row.quantity > 0) row.item.quantity = row.quantity;
  } else {
   let soldItem;
   if (base.category === 'equipment') {
    next.inventory.equipmentInstances = next.inventory.equipmentInstances.filter(entry => entry.id !== item.id);
    soldItem = copy(item);
   }
   if (base.category === 'material') next.inventory.materials[base.id] -= amount;
   if (base.category === 'tool') next.inventory.tools = next.inventory.tools.filter(id => id !== base.id);
   if (base.category === 'consumable') {
    soldItem = {...copy(item), id: amount === item.quantity ? item.id : 'sale:' + request.transactionId, quantity: amount};
    if (amount === item.quantity) next.inventory.consumables = next.inventory.consumables.filter(entry => entry.id !== item.id);
    else item.quantity -= amount;
   }
   const resale = {id: 'resale:' + request.transactionId, baseId: base.id, quantity: amount};
   if (soldItem) resale.item = soldItem;
   vendor.stock.push(resale);
  }
  next.gold += buying ? -total : total;
  vendor.cash += buying ? total : -total;
  return {ok: true, vendorId: table.id, direction: request.direction, baseId: base.id, quantity: amount, total, cycle: vendor.cycle};
 });
}
function policyCost(next, catalog, policy, request) {
 if (!declared(policy) || !identifier(policy.id) || !identifier(policy.station) || !record(policy.materials) || !Array.isArray(policy.tools) || !count(policy.goldCost)) return failure('UNDECLARED_POLICY');
 if (request.station !== policy.station) return failure('WRONG_STATION');
 if (!policy.tools.every(id => itemBase(catalog, id)?.category === 'tool') || new Set(policy.tools).size !== policy.tools.length) return failure('INVALID_TOOL_REQUIREMENTS');
 if (policy.tools.some(id => !next.inventory.tools.includes(id))) return failure('TOOL_REQUIRED');
 if (!Object.entries(policy.materials).every(([id, amount]) => itemBase(catalog, id)?.category === 'material' && positive(amount))) return failure('INVALID_MATERIAL_REQUIREMENTS');
 if (Object.entries(policy.materials).some(([id, amount]) => (next.inventory.materials[id] ?? 0) < amount)) return failure('MATERIAL_SHORTAGE');
 if (next.gold < policy.goldCost) return failure('GOLD_SHORTAGE');
 if (policy.unlock !== undefined && (!record(policy.unlock) || !identifier(policy.unlock.questFlag) || !Object.hasOwn(policy.unlock, 'value'))) return failure('INVALID_UNLOCK_POLICY');
 if (policy.unlock && next.world.questFlags[policy.unlock.questFlag] !== policy.unlock.value) return failure('RECIPE_LOCKED');
 const bound = bindInventoryRule(next, 'policy', policy);
 if (!bound.ok) return bound;
 return {ok: true};
}
function payPolicy(next, policy) {
 next.gold -= policy.goldCost;
 for (const [id, amount] of Object.entries(policy.materials)) next.inventory.materials[id] -= amount;
}
function outputBundle(policy, transactionId) {
 if (!record(policy.outputs)) return null;
 const output = copy(policy.outputs);
 for (const category of ['equipment', 'consumables']) {
  if (output[category] !== undefined && !Array.isArray(output[category])) return null;
  if (output[category]) output[category] = output[category].map((item, index) => ({...item, id: 'made:' + transactionId + ':' + category + ':' + index}));
 }
 return output;
}
export function craftCampaignRecipe(save, catalog, recipe, request) {
 return economyOperation(save, catalog, 'economy.craft', {...request, recipeId: recipe?.id}, next => {
  const checked = policyCost(next, catalog, recipe, request);
  if (!checked.ok) return checked;
  if (!['craft', 'cook', 'potion'].includes(recipe.kind)) return failure('UNKNOWN_RECIPE_KIND');
  if (recipe.kind === 'cook' && (itemBase(catalog, recipe.panToolId)?.category !== 'tool' || itemBase(catalog, recipe.panToolId)?.toolType !== 'pan' || !next.inventory.tools.includes(recipe.panToolId))) return failure('COOKING_PAN_REQUIRED');
  const bundle = outputBundle(recipe, request.transactionId);
  if (!bundle) return failure('INVALID_RECIPE_OUTPUT');
  const added = addInventoryBundle(next, catalog, bundle);
  if (!added.ok) return added;
  payPolicy(next, recipe);
  return {ok: true, recipeId: recipe.id, received: bundle};
 });
}
export function refillCampaignPotion(save, catalog, policy, request) {
 return economyOperation(save, catalog, 'economy.refill', {...request, policyId: policy?.id}, next => {
  const checked = policyCost(next, catalog, policy, request);
  if (!checked.ok) return checked;
  if (!Array.isArray(policy.baseIds) || !policy.baseIds.length || !policy.baseIds.every(id => itemBase(catalog, id)?.category === 'consumable' && positive(itemBase(catalog, id).capacity)) || !(policy.amount === 'full' || positive(policy.amount))) return failure('UNDECLARED_REFILL_POLICY');
  const item = next.inventory.consumables.find(entry => entry.id === request.itemId);
  if (!item || !policy.baseIds.includes(item.baseId)) return failure('INVALID_REFILL_TARGET');
  const capacity = itemBase(catalog, item.baseId).capacity;
  if (item.charges === capacity) return failure('POTION_ALREADY_FULL');
  const previousCharges = item.charges;
  item.charges = policy.amount === 'full' ? capacity : Math.min(capacity, item.charges + policy.amount);
  payPolicy(next, policy);
  return {ok: true, itemId: item.id, previousCharges, charges: item.charges};
 });
}
function processingTarget(next, catalog, policy, request) {
 const item = next.inventory.equipmentInstances.find(entry => entry.id === request.itemId);
 if (!item) return failure('ITEM_NOT_OWNED');
 for (const [field, value] of [['baseIds', item.baseId], ['tiers', item.tier], ['qualities', item.quality]]) {
  if (policy[field] !== '*' && (!Array.isArray(policy[field]) || !policy[field].length || !policy[field].every(identifier))) return failure('UNDECLARED_ITEM_RESTRICTION');
  if (policy[field] !== '*' && !policy[field].includes(value)) return failure('ITEM_POLICY_RESTRICTION');
 }
 if (!['reject', 'allow', 'unequip'].includes(policy.equipped)) return failure('UNDECLARED_EQUIPPED_POLICY');
 const slot = Object.keys(next.character.equipment).find(key => next.character.equipment[key] === item.id);
 if (slot && policy.equipped === 'reject') return failure('ITEM_EQUIPPED');
 return {ok: true, item, slot};
}
export function enchantCampaignItem(save, catalog, policy, request) {
 return economyOperation(save, catalog, 'economy.enchant', {...request, policyId: policy?.id}, next => {
  const checked = policyCost(next, catalog, policy, request);
  if (!checked.ok) return checked;
  const target = processingTarget(next, catalog, policy, request);
  if (!target.ok) return target;
  if (!['reject', 'replace'].includes(policy.existingEnchantment) || !declared(policy.enchantment) || !identifier(policy.enchantment.id)) return failure('UNDECLARED_ENCHANTMENT_POLICY');
  if (target.item.enchantment && policy.existingEnchantment === 'reject') return failure('ALREADY_ENCHANTED');
  target.item.enchantment = copy(policy.enchantment);
  if (target.slot && policy.equipped === 'unequip') next.character.equipment[target.slot] = null;
  payPolicy(next, policy);
  return {ok: true, itemId: target.item.id, enchantmentId: policy.enchantment.id};
 });
}
export function disenchantCampaignItem(save, catalog, policy, request) {
 return economyOperation(save, catalog, 'economy.disenchant', {...request, policyId: policy?.id}, next => {
  const checked = policyCost(next, catalog, policy, request);
  if (!checked.ok) return checked;
  const target = processingTarget(next, catalog, policy, request);
  if (!target.ok) return target;
  if (!['required', 'optional'].includes(policy.existingEnchantment) || !['destroy', 'retain'].includes(policy.itemDisposition)) return failure('UNDECLARED_DISENCHANTMENT_POLICY');
  if (!target.item.enchantment && policy.existingEnchantment === 'required') return failure('ENCHANTMENT_REQUIRED');
  if (target.slot && policy.itemDisposition === 'destroy' && policy.equipped !== 'unequip') return failure('ITEM_EQUIPPED');
  const bundle = outputBundle(policy, request.transactionId);
  if (!bundle) return failure('INVALID_DISENCHANTMENT_OUTPUT');
  const added = addInventoryBundle(next, catalog, bundle);
  if (!added.ok) return added;
  if (target.slot && policy.equipped === 'unequip') next.character.equipment[target.slot] = null;
  if (policy.itemDisposition === 'destroy') next.inventory.equipmentInstances = next.inventory.equipmentInstances.filter(item => item.id !== target.item.id);
  else target.item.enchantment = null;
  payPolicy(next, policy);
  return {ok: true, itemId: target.item.id, itemDisposition: policy.itemDisposition, received: bundle};
 });
}
export function consumeCampaignItem(save, catalog, request) {
 return economyOperation(save, catalog, 'economy.consume', request, next => {
  const item = next.inventory.consumables.find(entry => entry.id === request.itemId);
  if (!item) return failure('ITEM_NOT_OWNED');
  const base = itemBase(catalog, item.baseId);
  if (!Array.isArray(base.effects) || !base.effects.length || !base.effects.every(declared)) return failure('UNDECLARED_CONSUMABLE_EFFECT');
  if (base.capacity !== undefined) {
   if (!item.charges) return failure('POTION_EMPTY');
   item.charges -= 1;
  } else if (item.quantity > 1) item.quantity -= 1;
  else next.inventory.consumables = next.inventory.consumables.filter(entry => entry.id !== item.id);
  // Effect dispatch is deliberately external; the receipt is an exactly-once event.
  return {ok: true, itemId: item.id, effects: copy(base.effects)};
 });
}
