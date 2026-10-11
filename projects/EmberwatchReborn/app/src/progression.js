import { CORE_REFERENCE } from './reference-core.js';
import { PROGRESSION_BALANCE } from './progression-balance.js';

const ATTRIBUTES = Object.freeze(['strength', 'dexterity', 'intelligence']);
const SLOTS = Object.freeze(['mainHand', 'offHand', 'head', 'chest', 'hands', 'feet', 'accessory']);
const MAX_LEVEL = PROGRESSION_BALANCE.maxLevel;
const XP_SCALE = PROGRESSION_BALANCE.xpUnitsPerPoint;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const failure = (code, reason) => ({ ok: false, code, reason });

function xpUnits(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const scaled = value * XP_SCALE, rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || (value > 0 && rounded === 0)
    || Math.abs(scaled - rounded) > Number.EPSILON * Math.max(1, scaled) * 4) return null;
  return rounded === 0 ? 0 : rounded;
}

// No JSON coercion (NaN -> null, undefined removal), accessor execution or
// shared nested output references. Unknown JSON fields may survive later R1
// controller extensions; full campaign validation remains the save layer's job.
function jsonData(value, ancestors = new Set(), depth = 0, budget = { left: 2048 }) {
  if (--budget.left < 0 || depth > 32) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && !record(value)) return false;
  if (Array.isArray(value) && Object.getPrototypeOf(value) !== Array.prototype) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  const entries = Object.entries(Object.getOwnPropertyDescriptors(value)).filter(([key]) => !(Array.isArray(value) && key === 'length'));
  if (Array.isArray(value) && (entries.length !== value.length || entries.some(([key], index) => key !== String(index)))) return false;
  if (entries.some(([, descriptor]) => !own(descriptor, 'value') || !descriptor.enumerable)) return false;
  ancestors.add(value);
  const valid = entries.every(([, descriptor]) => jsonData(descriptor.value, ancestors, depth + 1, budget));
  ancestors.delete(value);
  return valid;
}
function clone(value) {
  if (Array.isArray(value)) return Array.prototype.map.call(value, clone);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}
function earnedPoints(level) {
  let skillPoints = 0;
  for (const band of CORE_REFERENCE.levelPoints.skillRanges) {
    skillPoints += Math.max(0, Math.min(level, band.to) - band.from + 1) * band.points;
  }
  return { attributePoints: (level - 1) * CORE_REFERENCE.levelPoints.attributePoints, skillPoints };
}
function validCharacter(character) {
  if (!jsonData(character) || !record(character) || character.classId !== 'warrior') return false;
  if (!integer(character.level, 1, MAX_LEVEL)) return false;
  const tier = CORE_REFERENCE.tiers.find(row => row.id === character.tier);
  if (!tier || character.level < tier.minimumLevel) return false;
  const storedXpUnits = xpUnits(character.xp);
  if (storedXpUnits === null
    || (character.level === MAX_LEVEL ? storedXpUnits !== 0 : storedXpUnits >= xpForLevel(character.level) * XP_SCALE)) return false;
  const earned = earnedPoints(character.level);
  if (!record(character.attributes) || Object.keys(character.attributes).length !== ATTRIBUTES.length
    || !ATTRIBUTES.every(key => own(character.attributes, key) && integer(character.attributes[key], 0, earned.attributePoints))) return false;
  if (!integer(character.attributePoints, 0, earned.attributePoints)
    || ATTRIBUTES.reduce((sum, key) => sum + character.attributes[key], character.attributePoints) > earned.attributePoints) return false;
  if (!integer(character.skillPoints, 0, earned.skillPoints)) return false;
  if (!record(character.skills) || !Object.entries(character.skills).every(([key, rank]) => /^[a-z][a-z0-9_]*$/.test(key) && integer(rank, 0, 100))) return false;
  if (!record(character.exclusiveBranches) || !Object.entries(character.exclusiveBranches).every(([key, selected]) => /^[a-z][a-z0-9_]*$/.test(key) && typeof selected === 'string' && /^[a-z][a-z0-9_]*$/.test(selected))) return false;
  if (!record(character.equipment) || Object.keys(character.equipment).length !== SLOTS.length
    || !SLOTS.every(key => own(character.equipment, key) && (character.equipment[key] === null || typeof character.equipment[key] === 'string'))) return false;
  return true;
}

/** Shared numerical/point-budget invariants for state and save re-entry. */
export function validateCharacter(character) {
  return validCharacter(character) ? { ok: true } : failure('INVALID_CHARACTER', '성장 정보가 올바르지 않습니다.');
}

/** Untrained Warrior data only. No reference-only ability is made executable. */
export function createCharacter() {
  return {
    classId: 'warrior', level: 1, tier: 'apprentice', xp: 0,
    attributes: Object.fromEntries(ATTRIBUTES.map(key => [key, 0])),
    attributePoints: 0, skillPoints: 0, skills: {}, exclusiveBranches: {},
    equipment: Object.fromEntries(SLOTS.map(key => [key, null]))
  };
}

/** Cost of advancing FROM level. null means invalid input or the level cap. */
export function xpForLevel(level) {
  if (!integer(level, 1, MAX_LEVEL - 1)) return null;
  const band = PROGRESSION_BALANCE.xpBands.find(row => level >= row.from && level <= row.to);
  return band.first + (level - band.from) * band.step;
}

/**
 * Pure arithmetic grant. Reward receipt/idempotency belongs to the calling
 * transaction controller: this API has no reward ID and never fabricates one.
 * Fractional XP is retained for difficulty and lower-tier reference factors.
 */
export function grantExperience(character, amount) {
  if (!validCharacter(character)) return failure('INVALID_CHARACTER', '성장 정보가 올바르지 않습니다.');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) return failure('INVALID_XP', '경험치는 유한한 0 이상의 안전한 수여량이어야 합니다.');
  let remainingUnits = -xpUnits(character.xp);
  for (let level = character.level; level < MAX_LEVEL; level++) remainingUnits += xpForLevel(level) * XP_SCALE;
  // Bound before addition, so a large valid grant cannot overflow state XP.
  const appliedUnits = xpUnits(Math.min(amount, remainingUnits / XP_SCALE));
  if (appliedUnits === null) return failure('XP_PRECISION', '경험치는 소수 여섯째 자리까지 보관할 수 있습니다.');
  const appliedXp = appliedUnits / XP_SCALE;
  const next = clone(character);
  let nextUnits = xpUnits(next.xp) + appliedUnits;
  const granted = { attributePoints: 0, skillPoints: 0 };
  let gainedLevels = 0;
  while (next.level < MAX_LEVEL && nextUnits >= xpForLevel(next.level) * XP_SCALE) {
    nextUnits -= xpForLevel(next.level) * XP_SCALE;
    next.level++;
    gainedLevels++;
    const before = earnedPoints(next.level - 1), after = earnedPoints(next.level);
    granted.attributePoints += after.attributePoints - before.attributePoints;
    granted.skillPoints += after.skillPoints - before.skillPoints;
  }
  next.xp = next.level === MAX_LEVEL ? 0 : nextUnits / XP_SCALE;
  next.attributePoints += granted.attributePoints;
  next.skillPoints += granted.skillPoints;
  // Deliberately do not change tier: training is a separate authored command.
  // Normalizing binary representation noise is not cap loss.
  const discardedXp = amount > remainingUnits / XP_SCALE ? amount - remainingUnits / XP_SCALE : 0;
  return { ok: true, character: next, gainedLevels, granted, appliedXp, discardedXp };
}

export function allocateAttribute(character, key, amount = 1) {
  if (!validCharacter(character)) return failure('INVALID_CHARACTER', '성장 정보가 올바르지 않습니다.');
  if (!ATTRIBUTES.includes(key) || !integer(amount, 1, Number.MAX_SAFE_INTEGER)) return failure('INVALID_ALLOCATION', '배분할 능력치와 양을 확인하세요.');
  if (amount > character.attributePoints) return failure('INSUFFICIENT_POINTS', '능력치 포인트가 부족합니다.');
  const next = clone(character);
  next.attributes[key] += amount;
  next.attributePoints -= amount;
  return { ok: true, character: next, spent: amount };
}

/** Reference coefficient, based on level tier rather than completed training. */
export function experienceMultiplier(level, enemyTier, difficulty = 'normal') {
  if (!integer(level, 1, MAX_LEVEL) || typeof difficulty !== 'string'
    || !own(CORE_REFERENCE.difficulty, difficulty)) return null;
  const enemyIndex = CORE_REFERENCE.tiers.findIndex(row => row.id === enemyTier);
  if (enemyIndex < 0) return null;
  let playerIndex = 0;
  CORE_REFERENCE.tiers.forEach((row, index) => { if (level >= row.minimumLevel) playerIndex = index; });
  return CORE_REFERENCE.lowerTierExperience[playerIndex][enemyIndex] * CORE_REFERENCE.difficulty[difficulty].xp;
}

