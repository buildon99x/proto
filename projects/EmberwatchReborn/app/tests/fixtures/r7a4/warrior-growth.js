import {validateEquipmentState,equipmentBonuses} from './equipment.js';
import { CORE_REFERENCE } from './reference-core.js';
import { WARRIOR_REFERENCE } from './reference-warrior.js';
import { validateCharacter } from './progression.js';
import { WARRIOR_BALANCE as B } from './warrior-balance.js';

export const STARTER_SKILLS = Object.freeze(['shield_charge', 'mace_swing', 'shield_block', 'righteous_hammer']);
export const ACTION_SKILL_IDS = Object.freeze([...STARTER_SKILLS, 'lay_on_hands', 'judgement']);
export const RUNTIME_SKILL_IDS = B.training.runtimeSkillIds;
export const ADEPT_SKILLS = Object.freeze(RUNTIME_SKILL_IDS.filter(id => WARRIOR_REFERENCE.skills.find(row => row.id === id).tier === 'adept'));
export const APPRENTICE_SKILLS = Object.freeze(WARRIOR_REFERENCE.skills.filter(row => row.tier === 'apprentice').map(row => row.id));
const byId = new Map(WARRIOR_REFERENCE.skills.map(row => [row.id, row]));
const clone = value => JSON.parse(JSON.stringify(value));
const fail = (code, reason) => ({ ok: false, code, reason });
const tidy = value => Number(value.toFixed(8));
const rankOf = (c, id) => Object.hasOwn(c.skills, id) ? c.skills[id] : 0;
const rankValue = (id, key, rank) => {
  const value = byId.get(id).rankValues[key];
  return Array.isArray(value) ? value[rank - 1] : value;
};
function earnedSkillPoints(level) {
  return CORE_REFERENCE.levelPoints.skillRanges.reduce((sum, row) => sum + Math.max(0, Math.min(level, row.to) - row.from + 1) * row.points, 0);
}

export function validateWarriorGrowth(character, equipmentContext=null) {
  const base = validateCharacter(character);
  if (!base.ok) return base;
  if (!B.training.runtimeTiers.includes(character.tier)) return fail('TIER_NOT_IMPLEMENTED', '현재 입문과 숙련 전사 훈련만 지원합니다.');
  if (Object.keys(character.exclusiveBranches).some(group => !Object.hasOwn(B.training.exclusiveGroups, group))) return fail('BRANCH_NOT_IMPLEMENTED', '지원하지 않는 배타 분기입니다.');
  if (equipmentContext || Object.values(character.equipment).some(value => value !== null)) {
    if (!equipmentContext || JSON.stringify(equipmentContext.character?.equipment)!==JSON.stringify(character.equipment)||equipmentContext.character?.level!==character.level||equipmentContext.character?.tier!==character.tier||JSON.stringify(equipmentContext.character?.attributes)!==JSON.stringify(character.attributes)) return fail('EQUIPMENT_NOT_IMPLEMENTED', '장착 장비의 소유 기록과 계산 문맥이 필요합니다.');
    const equipment=validateEquipmentState(equipmentContext);if(!equipment.ok)return equipment;
  }
  let spentSkillPoints = 0;
  for (const [id, rank] of Object.entries(character.skills)) {
    const row = byId.get(id);
    if (!row) return fail('UNKNOWN_SKILL', '알 수 없는 기술입니다.');
    if (!RUNTIME_SKILL_IDS.includes(id)) return fail('DATA_ONLY', '상위 기술은 아직 참조 데이터입니다.');
    if (B.training.runtimeTiers.indexOf(row.tier) > B.training.runtimeTiers.indexOf(character.tier)) return fail('TIER_REQUIRED', '숙련 승급을 먼저 완료해야 합니다.');
    if (!Number.isSafeInteger(rank) || rank < 1 || rank > row.upgradeCosts.length) return fail('INVALID_RANK', '기술 랭크가 올바르지 않습니다.');
    if (row.baseId && rankOf(character, row.baseId) < B.training.minimumBaseRankForAugment) return fail('BASE_SKILL', '기반 기술을 먼저 훈련해야 합니다.');
    spentSkillPoints += row.upgradeCosts.slice(0, rank).reduce((sum, cost) => sum + cost, 0);
  }
  for (const [group, ids] of Object.entries(B.training.exclusiveGroups)) {
    const owned = ids.filter(id => rankOf(character, id) > 0), selected = character.exclusiveBranches[group];
    if (owned.length > 1 || (owned.length === 0 ? selected !== undefined : selected !== owned[0])) return fail('EXCLUSIVE', '습득한 기술과 배타 분기 선택 기록이 일치해야 합니다.');
  }
  const starters = STARTER_SKILLS.filter(id => rankOf(character, id) >= 1).length;
  if (starters !== 0 && starters !== STARTER_SKILLS.length) return fail('PARTIAL_STARTER', '기본 네 기술의 훈련 기록이 완전하지 않습니다.');
  if ((character.tier === 'adept' || Object.keys(character.skills).length) && starters !== STARTER_SKILLS.length) return fail('STARTER_REQUIRED', '기본 네 기술을 먼저 훈련해야 합니다.');
  const earned = earnedSkillPoints(character.level);
  if (spentSkillPoints + character.skillPoints !== earned) return fail('SKILL_POINT_LEDGER', '사용한 기술점수와 남은 점수가 획득 기록과 일치하지 않습니다.');
  return { ok: true, starterTrained: starters === STARTER_SKILLS.length, spentSkillPoints, earnedSkillPoints: earned };
}

export function trainStarterSkills(character,equipmentContext=null) {
  const valid = validateWarriorGrowth(character,equipmentContext);
  if (!valid.ok) return valid;
  const next = clone(character), learned = [];
  if (!valid.starterTrained) {
    for (const id of STARTER_SKILLS) {
      if (byId.get(id).upgradeCosts[0] !== 0) return fail('STARTER_SOURCE_CHANGED', '기본 훈련 비용의 참조를 다시 확인해야 합니다.');
      next.skills[id] = B.training.freeStarterRanks;
      learned.push(id);
    }
  }
  return { ok: true, character: next, learned, alreadyTrained: valid.starterTrained };
}

function calculateStats(c,bonuses={}) {
  const source = CORE_REFERENCE.classes.warrior, a = c.attributes;
  const base = B.baseline, strength = B.perAllocatedAttribute.strength;
  const dexterity = B.perAllocatedAttribute.dexterity, intelligence = B.perAllocatedAttribute.intelligence;
  const passiveStrength = rankOf(c, 'towering_strength') ? rankValue('towering_strength', 'strengthBonus', rankOf(c, 'towering_strength')) : 0;
  const equipmentAttributes = Object.fromEntries(Object.keys(source.baseAttributes).map(key => [key, source.baseAttributes[key] + a[key]]));
  const attributeBreakdown = Object.fromEntries(Object.keys(source.baseAttributes).map(key => [key, {
    base: source.baseAttributes[key], allocated: a[key], passive: key === 'strength' ? passiveStrength : 0,
    equipment: bonuses[key] ?? 0, temporary: 0
  }]));
  const stats = {
    hpMax: source.basePools.health + source.poolGrowth.health * (c.level - 1) + a.strength * strength.hpMax,
    manaMax: source.basePools.mana + source.poolGrowth.mana * (c.level - 1) + a.intelligence * intelligence.manaMax,
    staminaMax: source.basePools.stamina + source.poolGrowth.stamina * (c.level - 1) + a.dexterity * dexterity.staminaMax,
    strength: source.baseAttributes.strength + a.strength + passiveStrength,
    dexterity: source.baseAttributes.dexterity + a.dexterity,
    intelligence: source.baseAttributes.intelligence + a.intelligence,
    armor: tidy(base.armor + a.strength * strength.armor),
    physicalDamage: tidy(base.physicalDamage + a.strength * strength.physicalDamage),
    moveSpeed: base.moveSpeed,
    criticalChance: tidy(base.criticalChance + a.dexterity * dexterity.criticalChance),
    criticalMultiplier: base.criticalMultiplier,
    healthRegen: base.healthRegen,
    manaRegen: tidy(base.manaRegen + a.intelligence * intelligence.manaRegen),
    staminaRegen: tidy(base.staminaRegen + a.dexterity * dexterity.staminaRegen),
    manaRegenDelay: base.manaRegenDelay, staminaRegenDelay: base.staminaRegenDelay,
    attackSpeed: tidy(1 + a.dexterity * dexterity.attackSpeed),
    castSpeed: tidy(1 + a.intelligence * intelligence.castSpeed),
    spellPower: tidy(1 + a.intelligence * intelligence.spellPower),
    resistances: { fire: 0, ice: 0, lightning: 0, poison: 0 },
    equipmentAttributes, attributeBreakdown,
    actions: Object.fromEntries(ACTION_SKILL_IDS.map(id => [id, { learned: false }]))
  };
  for(const [key,value] of Object.entries(bonuses)) if(typeof stats[key]==='number')stats[key]=tidy(stats[key]+value);
  const shining = rankOf(c, 'shining_knight'), faith = rankOf(c, 'armor_of_faith');
  const grace = rankOf(c, 'armored_grace'), constitution = rankOf(c, 'superb_constitution');
  const crushing = rankOf(c, 'crushing_might'), ram = rankOf(c, 'battering_ram');
  stats.armor = tidy(stats.armor + (shining ? rankValue('shining_knight', 'armorBonus', shining) : 0)
    + (faith ? stats.intelligence * rankValue('armor_of_faith', 'armorPerIntelligence', faith) : 0));
  stats.hpMax += constitution ? rankValue('superb_constitution', 'healthBonus', constitution) : 0;
  stats.resistances.poison = constitution ? rankValue('superb_constitution', 'poisonResistanceBonus', constitution) : 0;
  stats.moveSpeed = tidy(stats.moveSpeed * (grace ? 1 + rankValue('armored_grace', 'movementSpeedIncreasePercent', grace) / 100 : 1));
  stats.staminaCostMultiplier = tidy(grace ? 1 + rankValue('armored_grace', 'staminaCostChangePercent', grace) / 100 : 1);
  stats.physicalDamageMultiplier = tidy(crushing ? 1 + rankValue('crushing_might', 'physicalDamageIncreasePercent', crushing) / 100 : 1);
  stats.armorPenetration = tidy(ram ? stats.strength * rankValue('battering_ram', 'armorPenetrationPerStrength', ram) : 0);
  // physicalDamage is the final mainhand basis, not mace_swing's rank-scaled hit.
  stats.physicalDamage = tidy(stats.physicalDamage * stats.physicalDamageMultiplier);
  let rank = rankOf(c, 'mace_swing');
  if (rank) {
    const duration = tidy(Math.max(B.mace.minimumDuration, B.mace.duration / stats.attackSpeed));
    const stun = rankOf(c, 'stunning_strikes'), penetration = rankOf(c, 'crushing_blows');
    stats.actions.mace_swing = {
      learned: true,
      damage: tidy(stats.physicalDamage * rankValue('mace_swing', 'mainhandDamagePercent', rank) / 100),
      damageType: 'physical', manaCost: 0, staminaCost: B.mace.staminaCost,
      cooldown: rankValue('mace_swing', 'cooldownSeconds', rank), duration,
      contact: tidy(duration * B.mace.contactFraction), range: B.mace.range, arcRadians: B.mace.arcRadians,
      armorPenetration: tidy(stats.armorPenetration + (penetration ? rankValue('crushing_blows', 'armorPenetration', penetration) : 0)),
      stunChance: stun ? rankValue('stunning_strikes', 'stunChancePercent', stun) / 100 : 0,
      stunSeconds: B.mace.stunSeconds
    };
  }
  rank = rankOf(c, 'shield_charge');
  if (rank) {
    const assault = rankOf(c, 'armored_assault'), through = rankOf(c, 'charge_through');
    stats.actions.shield_charge = {
      learned: true,
      damage: tidy((assault ? stats.armor * rankValue('armored_assault', 'damagePerArmor', assault) : B.charge.unaugmentedDamage) * stats.physicalDamageMultiplier),
      armorPenetration: stats.armorPenetration,
      damageType: 'physical', manaCost: 0,
      staminaCost: tidy(rankValue('shield_charge', 'staminaCost', rank) * (assault ? 1 + rankValue('armored_assault', 'staminaCostIncreasePercent', assault) / 100 : 1)),
      cooldown: rankValue('shield_charge', 'cooldownSeconds', rank),
      duration: B.charge.duration, contact: B.charge.contact, range: B.charge.distance,
      speed: B.charge.speed, distance: B.charge.distance, radius: B.charge.radius,
      travelDuration: tidy(B.charge.distance / B.charge.speed), stunSeconds: through ? B.adept.chargeThroughStunSeconds : B.charge.stunSeconds,
      passesThroughEnemies: !!through
    };
  }
  rank = rankOf(c, 'shield_block');
  if (rank) {
    const training = rankOf(c, 'shield_training'), bulwark = rankOf(c, 'elemental_bulwark'), thorns = rankOf(c, 'shield_of_thorns');
    const slowChange = training ? rankValue('shield_training', 'slowEffectChangePercent', training) / 100 : 0;
    const resistance = bulwark ? rankValue('elemental_bulwark', 'resistanceBonus', bulwark) : 0;
    stats.actions.shield_block = {
      learned: true,
      damage: 0, manaCost: 0, staminaCost: B.block.staminaCost,
      cooldown: B.block.cooldown, duration: B.block.duration, contact: B.block.contact, range: 0,
      holdCostPerSecond: B.block.holdCostPerSecond,
      costTrigger: 'successfully_blocked_incoming_hit',
      damageReduction: B.block.damageReduction,
      moveMultiplier: tidy(1 - B.block.moveSlow * (1 + slowChange)),
      halfAngleRadians: B.block.halfAngleRadians,
      passiveBlockChance: rankValue('shield_block', 'passivePhysicalBlockChancePercent', rank) / 100,
      passiveBlockAmount: rankValue('shield_block', 'passivePhysicalBlockAmount', rank),
      passiveDamageType: 'physical',
      resistanceBonus: { fire: resistance, ice: resistance, lightning: resistance, poison: 0 },
      thorns: thorns ? {coefficient: rankValue('shield_of_thorns', 'damagePerCurrentStamina', thorns), damageMultiplier: stats.physicalDamageMultiplier, armorPenetration: stats.armorPenetration} : null
    };
  }
  rank = rankOf(c, 'righteous_hammer');
  if (rank) {
    const duration = tidy(Math.max(B.hammer.minimumDuration, B.hammer.duration / stats.castSpeed));
    const wrath = rankOf(c, 'hammer_of_wrath'), sundering = rankOf(c, 'hammer_of_sundering');
    stats.actions.righteous_hammer = {
      learned: true,
      damage: tidy(((rankValue('righteous_hammer', 'physicalDamage', rank) + rankValue('righteous_hammer', 'damagePerLevel', rank) * (c.level - B.hammer.levelOrigin)) * stats.spellPower
        + (sundering ? stats.strength * rankValue('hammer_of_sundering', 'physicalDamagePerStrength', sundering) : 0)) * stats.physicalDamageMultiplier),
      damageType: 'physical', manaCost: tidy(rankValue('righteous_hammer', 'manaCost', rank) * (wrath || sundering ? 1 + rankValue(wrath ? 'hammer_of_wrath' : 'hammer_of_sundering', 'manaCostIncreasePercent', wrath || sundering) / 100 : 1)), staminaCost: 0,
      cooldown: rankValue('righteous_hammer', 'cooldownSeconds', rank),
      duration, contact: tidy(duration * B.hammer.contactFraction), range: B.hammer.range,
      speed: B.hammer.speed, radius: B.hammer.radius, pierces: true, armorPenetration: stats.armorPenetration,
      lightning: wrath ? {damage: rankValue('hammer_of_wrath', 'lightningDamage', wrath), tickSeconds: rankValue('hammer_of_wrath', 'tickSeconds', wrath), radius: B.adept.lightningRadius} : null,
      armorBreak: sundering ? {amount: B.adept.armorBreakAmounts[sundering - 1], duration: B.adept.armorBreakDuration} : null
    };
  }
  rank = rankOf(c, 'lay_on_hands');
  if (rank) {
    const duration = tidy(Math.max(B.adept.heal.minimumDuration, B.adept.heal.duration / stats.castSpeed));
    const touch = rankOf(c, 'invigorating_touch');
    stats.actions.lay_on_hands = {
      learned: true, heal: rankValue('lay_on_hands', 'heal', rank), damage: 0,
      manaCost: rankValue('lay_on_hands', 'manaCost', rank), staminaCost: 0,
      cooldown: rankValue('lay_on_hands', 'cooldownSeconds', rank), duration,
      contact: tidy(duration * B.adept.heal.contactFraction), range: B.adept.heal.radius, radius: B.adept.heal.radius,
      regenBuff: touch ? {duration: rankValue('invigorating_touch', 'durationSeconds', touch), multiplier: tidy(1 + rankValue('invigorating_touch', 'allRegenIncreasePercent', touch) / 100)} : null
    };
  }
  rank = rankOf(c, 'judgement');
  if (rank) {
    const duration = tidy(Math.max(B.adept.judgement.minimumDuration, B.adept.judgement.duration / stats.castSpeed));
    const fire = rankOf(c, 'trial_by_fire'), shackles = rankOf(c, 'shackles');
    stats.actions.judgement = {
      learned: true, damage: tidy(stats.physicalDamage * rankValue('judgement', 'mainhandDamagePercent', rank) / 100),
      damageType: 'physical', armorPenetration: stats.armorPenetration,
      manaCost: tidy(rankValue('judgement', 'manaCost', rank) * (fire ? 1 + rankValue('trial_by_fire', 'manaCostIncreasePercent', fire) / 100 : 1)), staminaCost: 0,
      cooldown: rankValue('judgement', 'cooldownSeconds', rank) + (shackles ? rankValue('shackles', 'cooldownAddSeconds', shackles) : 0),
      duration, contact: tidy(duration * B.adept.judgement.contactFraction), range: B.adept.judgement.range, arcRadians: B.adept.judgement.arcRadians,
      fireArea: fire ? {damage: rankValue('trial_by_fire', 'fireDamage', fire), tickSeconds: rankValue('trial_by_fire', 'tickSeconds', fire), duration: rankValue('trial_by_fire', 'durationSeconds', fire)} : null,
      shackles: shackles ? {moveMultiplier: tidy(1 - rankValue('shackles', 'movementSpeedReductionPercent', shackles) / 100), damageTakenMultiplier: tidy(1 + rankValue('shackles', 'damageTakenIncreasePercent', shackles) / 100), duration: rankValue('shackles', 'durationSeconds', shackles)} : null
    };
  }
  // Apply universal cost reduction after per-action source increases, exactly once.
  for (const action of Object.values(stats.actions)) if (action.learned) {
    action.staminaCost = tidy(action.staminaCost * stats.staminaCostMultiplier);
    if (Object.hasOwn(action, 'holdCostPerSecond')) action.holdCostPerSecond = tidy(action.holdCostPerSecond * stats.staminaCostMultiplier);
  }
  return stats;
}

export function deriveStats(character,equipmentContext=null) {
  const valid = validateWarriorGrowth(character,equipmentContext);
  if(!valid.ok)return valid;
  const gear=equipmentContext?equipmentBonuses(equipmentContext):{ok:true,bonuses:{}};
  return gear.ok ? {ok:true,stats:calculateStats(character,gear.bonuses)} : gear;
}

function referenceValues(row, rank) {
  return Object.fromEntries(Object.entries(row.rankValues).map(([key, value]) => [key, Array.isArray(value) ? (value[rank - 1] ?? null) : value]));
}
function effect(character, row, rank, bonuses) {
  const source = referenceValues(row, rank);
  if (!RUNTIME_SKILL_IDS.includes(row.id)) return {referenceValues: source, runtimeValues: null, runtimeStatus: 'data_only'};
  if (row.exclusiveGroup && character.exclusiveBranches[row.exclusiveGroup] && character.exclusiveBranches[row.exclusiveGroup] !== row.id) return {referenceValues: source, runtimeValues: null, runtimeStatus: 'exclusive_unavailable'};
  const candidate = clone(character);
  candidate.skills[row.id] = rank;
  const stats = calculateStats(candidate, bonuses);
  let runtime;
  if (ACTION_SKILL_IDS.includes(row.id)) runtime = stats.actions[row.id];
  else if (row.baseId && !rankOf(candidate, row.baseId)) runtime = null;
  else {
    const parent = stats.actions[row.baseId];
    const mappings = {
      armored_assault: () => ({chargeDamage: parent.damage, chargeStaminaCost: parent.staminaCost}),
      stunning_strikes: () => ({stunChance: parent.stunChance, stunSeconds: parent.stunSeconds}),
      crushing_blows: () => ({armorPenetration: parent.armorPenetration}),
      shield_training: () => ({blockMoveMultiplier: parent.moveMultiplier}),
      elemental_bulwark: () => ({resistanceBonusWhileBlocking: parent.resistanceBonus}),
      charge_through: () => ({passesThroughEnemies: parent.passesThroughEnemies, stunSeconds: parent.stunSeconds}),
      shield_of_thorns: () => ({thorns: parent.thorns}),
      hammer_of_wrath: () => ({hammerDamage: parent.damage, hammerManaCost: parent.manaCost, lightning: parent.lightning}),
      hammer_of_sundering: () => ({hammerDamage: parent.damage, hammerManaCost: parent.manaCost, armorBreak: parent.armorBreak}),
      invigorating_touch: () => ({regenBuff: parent.regenBuff}),
      trial_by_fire: () => ({judgementManaCost: parent.manaCost, fireArea: parent.fireArea}),
      shackles: () => ({judgementCooldown: parent.cooldown, shackles: parent.shackles}),
      shining_knight: () => ({armor: stats.armor}),
      armor_of_faith: () => ({armor: stats.armor, intelligence: stats.intelligence}),
      armored_grace: () => ({moveSpeed: stats.moveSpeed, staminaCostMultiplier: stats.staminaCostMultiplier}),
      towering_strength: () => ({strength: stats.strength, equipmentStrength: stats.equipmentAttributes.strength, attributeBreakdown: stats.attributeBreakdown.strength}),
      battering_ram: () => ({armorPenetration: stats.armorPenetration, strength: stats.strength}),
      crushing_might: () => ({physicalDamage: stats.physicalDamage, physicalDamageMultiplier: stats.physicalDamageMultiplier}),
      superb_constitution: () => ({hpMax: stats.hpMax, poisonResistance: stats.resistances.poison})
    };
    runtime = mappings[row.id]();
  }
  return {referenceValues: source, runtimeValues: runtime, runtimeStatus: 'authored_mapping_not_play_verified', damageStage: 'before_target_defense_and_critical_resolution'};
}

/** Read-only current/next values and the same purchase gate used by purchaseSkill. */
export function previewSkill(character, id,equipmentContext=null) {
  const valid = validateWarriorGrowth(character,equipmentContext);
  if (!valid.ok) return valid;
  const gear=equipmentContext?equipmentBonuses(equipmentContext):{ok:true,bonuses:{}};if(!gear.ok)return gear;
  const row = byId.get(id);
  if (!row) return fail('UNKNOWN_SKILL', '알 수 없는 기술입니다.');
  const rank = rankOf(character, id), maxRank = row.upgradeCosts.length;
  const nextRank = rank < maxRank ? rank + 1 : null;
  const cost = nextRank === null ? null : row.upgradeCosts[rank];
  let code = null, reason = '';
  if (!RUNTIME_SKILL_IDS.includes(id)) { code = 'DATA_ONLY'; reason = '상위 티어 기술은 아직 참조 데이터이며 구매할 수 없습니다.'; }
  else if (B.training.runtimeTiers.indexOf(row.tier) > B.training.runtimeTiers.indexOf(character.tier)) { code = 'TIER_REQUIRED'; reason = '숙련 승급을 먼저 완료해야 합니다.'; }
  else if (!valid.starterTrained) { code = 'STARTER_REQUIRED'; reason = '기본 네 기술의 첫 훈련을 먼저 받으세요.'; }
  else if (nextRank === null) { code = 'MAX_RANK'; reason = '최대 랭크입니다.'; }
  else if (row.baseId && rankOf(character, row.baseId) < B.training.minimumBaseRankForAugment) { code = 'BASE_SKILL'; reason = '기반 기술을 먼저 훈련해야 합니다.'; }
  else if (row.exclusiveGroup && character.exclusiveBranches[row.exclusiveGroup] && character.exclusiveBranches[row.exclusiveGroup] !== id) { code = 'EXCLUSIVE'; reason = '반대 망치 분기를 이미 선택했습니다. 현재 재분배는 지원하지 않습니다.'; }
  else if (character.skillPoints < cost) { code = 'SKILL_POINTS'; reason = '기술점수가 부족합니다.'; }
  const current = rank ? effect(character, row, rank, gear.bonuses) : null;
  const next = nextRank === null ? null : effect(character, row, nextRank, gear.bonuses);
  const candidate = clone(character); if (nextRank !== null && RUNTIME_SKILL_IDS.includes(id) && code !== 'EXCLUSIVE') candidate.skills[id] = nextRank;
  const prospectiveStats = calculateStats(candidate, gear.bonuses);
  const affectedAction = prospectiveStats.actions[ACTION_SKILL_IDS.includes(id) ? id : row.baseId];
  const warnings = affectedAction?.learned && affectedAction.manaCost > prospectiveStats.manaMax ? [{code: 'MAX_MANA_TOO_LOW', reason: '현재 최대마나로 시전할 수 없습니다.', manaCost: affectedAction.manaCost, manaMax: prospectiveStats.manaMax}] : [];
  return {
    ok: true, id, name: row.displayName, tier: row.tier, rank, maxRank, nextRank, cost,
    available: code === null, code, reason, warnings,
    exclusiveGroup: row.exclusiveGroup, exclusiveSelection: row.exclusiveGroup ? character.exclusiveBranches[row.exclusiveGroup] ?? null : null,
    current, next
  };
}

export function purchaseSkill(character, id,equipmentContext=null) {
  const quote = previewSkill(character, id,equipmentContext);
  if (!quote.ok) return quote;
  if (!quote.available) return fail(quote.code, quote.reason);
  const next = clone(character);
  next.skills[id] = quote.nextRank;
  if (quote.exclusiveGroup) next.exclusiveBranches[quote.exclusiveGroup] = id;
  next.skillPoints -= quote.cost;
  const valid = validateWarriorGrowth(next,equipmentContext);
  return valid.ok ? { ok: true, character: next, skillId: id, rank: quote.nextRank, cost: quote.cost } : valid;
}

