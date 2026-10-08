// Pure campaign inventory. Content values are supplied by provenance-bearing data.
import {CAMPAIGN_SLOTS, validateCampaignSave} from './save.js';
import {CORE_REFERENCE} from './reference-core.js';

export const ITEM_TIERS = Object.freeze(['apprentice', 'adept', 'expert', 'master']);
export const ITEM_QUALITIES = Object.freeze(['common', 'uncommon', 'rare', 'epic', 'legendary', 'unique']);
export const CLASS_WEAPONS = Object.freeze({
 warrior: Object.freeze({mainHand: 'mace', offHand: 'shield'}),
 mage: Object.freeze({mainHand: 'wand', offHand: 'grimoire'}),
 archer: Object.freeze({mainHand: 'sword', offHand: 'bow'})
});
const ATTRIBUTES = ['strength', 'dexterity', 'intelligence'];
const CATEGORIES = ['equipment', 'material', 'tool', 'consumable'];
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
export const record = value => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const count = value => Number.isSafeInteger(value) && value >= 0;
export const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 240 && !RESERVED.has(value);
export const copy = value => JSON.parse(JSON.stringify(value));
export const failure = (code, details = {}) => ({ok: false, code, ...details});
export function canonical(value) {
 if (value === null || typeof value !== 'object') return JSON.stringify(value);
 if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
 return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}
function jsonData(value, parents = new Set(), depth = 0) {
 if (depth > 60) return false;
 if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
 if (typeof value === 'number') return Number.isFinite(value);
 if ((!record(value) && !Array.isArray(value)) || parents.has(value)) return false;
 parents.add(value);
 const ok = Object.entries(value).every(([key, item]) => !RESERVED.has(key) && jsonData(item, parents, depth + 1));
 parents.delete(value);
 return ok;
}
export function declared(value) {
 return record(value) && jsonData(value) && record(value.provenance) && identifier(value.provenance.kind)
  && identifier(value.provenance.source ?? value.provenance.url) && !['unknown', 'UNKNOWN'].includes(value.provenance.status);
}
const statsValid = value => record(value) && Object.entries(value).every(([key, number]) => identifier(key) && Number.isFinite(number));
export function validateItemCatalog(catalog) {
 if (!declared(catalog) || !identifier(catalog.id) || !identifier(catalog.revision) || !Array.isArray(catalog.bases)) return failure('INVALID_CATALOG');
 const ids = new Set();
 for (const base of catalog.bases) {
  if (!declared(base) || !identifier(base.id) || ids.has(base.id) || !CATEGORIES.includes(base.category)) return failure('INVALID_ITEM_BASE');
  ids.add(base.id);
  if (base.category === 'equipment') {
   if (!CAMPAIGN_SLOTS.includes(base.slot) || !record(base.requirements) || !ATTRIBUTES.every(key => count(base.requirements[key])) || !statsValid(base.stats)) return failure('INVALID_ITEM_BASE');
   if (['mainHand', 'offHand'].includes(base.slot) && !identifier(base.weaponType)) return failure('INVALID_WEAPON_TYPE');
   if (base.classes !== undefined && (!Array.isArray(base.classes) || !base.classes.length || new Set(base.classes).size !== base.classes.length || !base.classes.every(id => Object.hasOwn(CLASS_WEAPONS, id)))) return failure('INVALID_ITEM_CLASSES');
  }
  if (base.category === 'consumable' && base.capacity !== undefined && (!count(base.capacity) || base.capacity === 0)) return failure('INVALID_CAPACITY');
 }
 return {ok: true};
}
export function itemBase(catalog, id) { return Array.isArray(catalog?.bases) ? catalog.bases.find(base => base?.id === id) : undefined; }
export function validateEquipmentInstance(item, catalog) {
 if (!record(item) || !jsonData(item) || !identifier(item.id) || !ITEM_TIERS.includes(item.tier) || !ITEM_QUALITIES.includes(item.quality)) return failure('INVALID_EQUIPMENT');
 if (itemBase(catalog, item.baseId)?.category !== 'equipment') return failure('UNKNOWN_ITEM_BASE');
 if (item.stats !== undefined && !statsValid(item.stats)) return failure('INVALID_ITEM_STATS');
 if (item.enchantment !== undefined && item.enchantment !== null && (!declared(item.enchantment) || !identifier(item.enchantment.id))) return failure('INVALID_ENCHANTMENT');
 if (item.affixes !== undefined && (!Array.isArray(item.affixes) || !item.affixes.every(affix => declared(affix) && identifier(affix.id)))) return failure('INVALID_AFFIXES');
 return {ok: true};
}
export function validateConsumable(item, catalog) {
 const base = itemBase(catalog, item?.baseId);
 if (!record(item) || !jsonData(item) || !identifier(item.id) || base?.category !== 'consumable' || !count(item.quantity) || !item.quantity) return failure('INVALID_CONSUMABLE');
 if (base.capacity !== undefined && (!count(item.charges) || item.charges > base.capacity || item.quantity !== 1)) return failure('INVALID_CHARGES');
 if (base.capacity === undefined && item.charges !== undefined) return failure('UNDECLARED_CAPACITY');
 return {ok: true};
}
export function validateCampaignInventory(save, catalog) {
 const valid = validateCampaignSave(save);
 if (!valid.ok) return failure('INVALID_SAVE', {errors: valid.errors});
 const catalogValid = validateItemCatalog(catalog);
 if (!catalogValid.ok) return catalogValid;
 const inventory = save.inventory, ids = new Set();
 if (!ITEM_TIERS.includes(save.character.tier)) return failure('INVALID_CHARACTER_TIER');
 if (Object.keys(save.character.equipment).length !== CAMPAIGN_SLOTS.length || Object.keys(save.character.attributes).length !== ATTRIBUTES.length) return failure('INVALID_CHARACTER_SHAPE');
 for (const item of inventory.equipmentInstances) {
  const result = validateEquipmentInstance(item, catalog);
  if (!result.ok) return result;
  if (ids.has(item.id)) return failure('DUPLICATE_ITEM_ID');
  ids.add(item.id);
 }
 for (const item of inventory.consumables) {
  const result = validateConsumable(item, catalog);
  if (!result.ok) return result;
  if (ids.has(item.id)) return failure('DUPLICATE_ITEM_ID');
  ids.add(item.id);
 }
 if (!Object.entries(inventory.materials).every(([id, amount]) => itemBase(catalog, id)?.category === 'material' && count(amount))) return failure('INVALID_MATERIALS');
 if (!inventory.tools.every(id => itemBase(catalog, id)?.category === 'tool') || new Set(inventory.tools).size !== inventory.tools.length) return failure('INVALID_TOOLS');
 const equipped = Object.values(save.character.equipment).filter(id => id !== null);
 if (new Set(equipped).size !== equipped.length || equipped.some(id => !inventory.equipmentInstances.some(item => item.id === id))) return failure('INVALID_EQUIPPED_ITEM');
 for (const slot of CAMPAIGN_SLOTS) {
  const item = inventory.equipmentInstances.find(row => row.id === save.character.equipment[slot]);
  if (item) {
   const base = itemBase(catalog, item.baseId), classId = save.character.classId;
   if (base.slot !== slot) return failure('INVALID_EQUIPMENT_SLOT');
   if (ITEM_TIERS.indexOf(item.tier) > ITEM_TIERS.indexOf(save.character.tier)) return failure('TIER_REQUIREMENT', {requiredTier: item.tier, trainedTier: save.character.tier, itemId: item.id});
   if (base.classes && !base.classes.includes(classId) || ['mainHand', 'offHand'].includes(slot) && CLASS_WEAPONS[classId][slot] !== base.weaponType) return failure('INVALID_EQUIPPED_CLASS');
   if (ATTRIBUTES.some(key => CORE_REFERENCE.classes[classId].baseAttributes[key] + save.character.attributes[key] < base.requirements[key])) return failure('INVALID_EQUIPPED_REQUIREMENTS');
  }
 }
 if (save.transactions !== undefined && (!Array.isArray(save.transactions) || !save.transactions.every(row => record(row) && identifier(row.id)) || new Set(save.transactions.map(row => row.id)).size !== save.transactions.length)) return failure('INVALID_TRANSACTION_LEDGER');
 if (save.inventoryRules !== undefined && (!record(save.inventoryRules) || !jsonData(save.inventoryRules) || !Object.values(save.inventoryRules).every(value => typeof value === 'string'))) return failure('INVALID_RULE_BINDINGS');
 if (save.inventoryAwards !== undefined && (!Array.isArray(save.inventoryAwards) || !save.inventoryAwards.every(identifier) || new Set(save.inventoryAwards).size !== save.inventoryAwards.length)) return failure('INVALID_AWARD_LEDGER');
 return {ok: true};
}
// Bind executable input data so reopening a menu cannot replace a settled roll/table.
export function bindInventoryRule(save, namespace, definition) {
 const key = namespace + ':' + definition.id, signature = canonical(definition);
 save.inventoryRules ??= {};
 if (Object.hasOwn(save.inventoryRules, key) && save.inventoryRules[key] !== signature) return failure('RULE_CHANGED', {ruleId: definition.id});
 save.inventoryRules[key] = signature;
 return {ok: true};
}
// All changes, including the receipt, are made on one isolated snapshot. The caller
// must durably commit that entire save before presenting success or changing state.
export function campaignInventoryOperation(save, catalog, domain, request, operation) {
 const valid = validateCampaignInventory(save, catalog);
 if (!valid.ok) return valid;
 if (!record(request) || !jsonData(request) || !identifier(request.transactionId)) return failure('INVALID_TRANSACTION_ID');
 const intent = canonical({domain, request});
 const previous = (save.transactions ?? []).find(row => row.id === request.transactionId);
 if (previous) return previous.domain === domain && previous.intent === intent
  ? {ok: true, save, receipt: copy(previous), replayed: true}
  : failure('TRANSACTION_CONFLICT');
 const next = copy(save);
 const binding = bindInventoryRule(next, 'catalog', catalog);
 if (!binding.ok) return binding;
 const result = operation(next);
 if (!result.ok) return result;
 const check = validateCampaignInventory(next, catalog);
 if (!check.ok) return check;
 const receipt = {id: request.transactionId, domain, intent, result: copy(result), worldTimeMinutes: next.world.timeMinutes};
 next.transactions ??= [];
 next.transactions.push(receipt);
 return {ok: true, save: next, receipt, replayed: false, ...result};
}
export function equipmentEligibility(save, catalog, itemId, slot) {
 const valid = validateCampaignInventory(save, catalog);
 if (!valid.ok) return valid;
 const item = save.inventory.equipmentInstances.find(row => row.id === itemId);
 if (!item) return failure('ITEM_NOT_OWNED');
 const base = itemBase(catalog, item.baseId), target = slot ?? base.slot, character = save.character;
 if (!CAMPAIGN_SLOTS.includes(target) || base.slot !== target) return failure('WRONG_SLOT');
 if (ITEM_TIERS.indexOf(item.tier) > ITEM_TIERS.indexOf(character.tier)) return failure('TIER_REQUIREMENT', {requiredTier: item.tier, trainedTier: character.tier, itemId: item.id});
 if (base.classes && !base.classes.includes(character.classId)) return failure('WRONG_CLASS');
 if (['mainHand', 'offHand'].includes(target) && CLASS_WEAPONS[character.classId][target] !== base.weaponType) return failure('WRONG_WEAPON');
 const attributes = Object.fromEntries(ATTRIBUTES.map(key => [key, CORE_REFERENCE.classes[character.classId].baseAttributes[key] + character.attributes[key]]));
 if (!Object.values(attributes).every(count)) return failure('ATTRIBUTE_OVERFLOW');
 const missing = ATTRIBUTES.filter(key => attributes[key] < base.requirements[key]);
 if (missing.length) return failure('ATTRIBUTE_REQUIREMENT', {required: copy(base.requirements), attributes, missing});
 return {ok: true, itemId, slot: target, attributes};
}
export function equipCampaignItem(save, catalog, request) {
 return campaignInventoryOperation(save, catalog, 'inventory.equip', request, next => {
  const eligible = equipmentEligibility(next, catalog, request.itemId, request.slot);
  if (!eligible.ok) return eligible;
  const replacedItemId = next.character.equipment[eligible.slot];
  next.character.equipment[eligible.slot] = request.itemId;
  return {ok: true, itemId: request.itemId, slot: eligible.slot, replacedItemId};
 });
}
export function unequipCampaignItem(save, catalog, request) {
 return campaignInventoryOperation(save, catalog, 'inventory.unequip', request, next => {
  if (!CAMPAIGN_SLOTS.includes(request.slot)) return failure('WRONG_SLOT');
  const itemId = next.character.equipment[request.slot];
  next.character.equipment[request.slot] = null;
  return {ok: true, slot: request.slot, itemId};
 });
}
export function compareCampaignEquipment(save, catalog, itemId) {
 const valid = validateCampaignInventory(save, catalog);
 if (!valid.ok) return valid;
 const candidate = save.inventory.equipmentInstances.find(row => row.id === itemId);
 if (!candidate) return failure('ITEM_NOT_OWNED');
 const base = itemBase(catalog, candidate.baseId), current = save.inventory.equipmentInstances.find(row => row.id === save.character.equipment[base.slot]) ?? null;
 const values = item => item ? item.stats ?? itemBase(catalog, item.baseId).stats : {};
 const before = values(current), after = values(candidate);
 const deltas = Object.fromEntries([...new Set([...Object.keys(before), ...Object.keys(after)])].map(key => [key, (after[key] ?? 0) - (before[key] ?? 0)]));
 if (!Object.values(deltas).every(Number.isFinite)) return failure('STAT_DELTA_OVERFLOW');
 return {ok: true, slot: base.slot, current: copy(current), candidate: copy(candidate), deltas, eligibility: equipmentEligibility(save, catalog, itemId), unresolved: ['derivedCombatTotals', 'affixAndEnchantmentStacking']};
}
export function addInventoryBundle(next, catalog, bundle) {
 if (!record(bundle) || !jsonData(bundle) || Object.keys(bundle).some(key => !['equipment', 'materials', 'tools', 'consumables'].includes(key))) return failure('INVALID_BUNDLE');
 if (bundle.equipment !== undefined && !Array.isArray(bundle.equipment) || bundle.consumables !== undefined && !Array.isArray(bundle.consumables) || bundle.tools !== undefined && !Array.isArray(bundle.tools) || bundle.materials !== undefined && !record(bundle.materials)) return failure('INVALID_BUNDLE');
 for (const item of bundle.equipment ?? []) {
  const valid = validateEquipmentInstance(item, catalog);
  if (!valid.ok) return valid;
  next.inventory.equipmentInstances.push(copy(item));
 }
 for (const [id, amount] of Object.entries(bundle.materials ?? {})) {
  const total = (next.inventory.materials[id] ?? 0) + amount;
  if (itemBase(catalog, id)?.category !== 'material' || !count(amount) || !count(total)) return failure('INVALID_MATERIALS');
  next.inventory.materials[id] = total;
 }
 for (const id of bundle.tools ?? []) {
  if (itemBase(catalog, id)?.category !== 'tool') return failure('INVALID_TOOLS');
  if (next.inventory.tools.includes(id)) return failure('TOOL_ALREADY_OWNED');
  next.inventory.tools.push(id);
 }
 for (const item of bundle.consumables ?? []) {
  const valid = validateConsumable(item, catalog);
  if (!valid.ok) return valid;
  next.inventory.consumables.push(copy(item));
 }
 return {ok: true};
}
export function receiveCampaignItems(save, catalog, request) {
 return campaignInventoryOperation(save, catalog, 'inventory.receive', request, next => {
  if (!declared(request.award) || !identifier(request.award.id)) return failure('UNDECLARED_AWARD');
  const bound = bindInventoryRule(next, 'award', request.award);
  if (!bound.ok) return bound;
  // Award identity is independently unique, even if a caller retries with a new transaction ID.
  next.inventoryAwards ??= [];
  if (!Array.isArray(next.inventoryAwards) || next.inventoryAwards.some(id => !identifier(id))) return failure('INVALID_AWARD_LEDGER');
  if (next.inventoryAwards.includes(request.award.id)) return failure('AWARD_ALREADY_RECEIVED');
  const granted = addInventoryBundle(next, catalog, request.award.items);
  if (!granted.ok) return granted;
  if (!count(request.award.gold ?? 0) || !count(next.gold + (request.award.gold ?? 0))) return failure('INVALID_GOLD');
  next.gold += request.award.gold ?? 0;
  next.inventoryAwards.push(request.award.id);
  return {ok: true, awardId: request.award.id};
 });
}
