import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createCharacter, grantExperience, allocateAttribute, xpForLevel} from '../src/progression.js';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {WARRIOR_BALANCE as B} from '../src/warrior-balance.js';
import {applyEquipmentCommand, equipmentRows, validateEquipmentState} from '../src/equipment.js';
import {ACTION_SKILL_IDS, STARTER_SKILLS, APPRENTICE_SKILLS, ADEPT_SKILLS, RUNTIME_SKILL_IDS,
  trainStarterSkills, validateWarriorGrowth, purchaseSkill, previewSkill, deriveStats} from '../src/warrior-growth.js';

// Pure-model fixtures inject the Adept tier after XP arithmetic. They DO NOT
// establish earned campaign promotion, trainer reach, save receipts, actual
// enemy damage, browser play, or a normally acquired maximum-rank build.
const rows = new Map(WARRIOR_REFERENCE.skills.map(row => [row.id, row]));
const clone = value => structuredClone(value);
const tidy = value => Number(value.toFixed(8));
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function characterAt(level = 50, tier = 'adept') {
  let xp = 0; for (let from = 1; from < level; from++) xp += xpForLevel(from);
  const earned = grantExperience(createCharacter(), xp); assert.equal(earned.ok, true);
  const trained = trainStarterSkills(earned.character); assert.equal(trained.ok, true);
  trained.character.tier = tier;
  return trained.character;
}
function buy(c, id, context = null) {
  const before = clone(c), result = purchaseSkill(freeze(c), id, context);
  assert.equal(result.ok, true, `${id}: ${result.code}: ${result.reason}`);
  assert.deepEqual(c, before);
  return result.character;
}
function baseFor(c, id) {
  const base = rows.get(id).baseId;
  return base && !c.skills[base] ? toRank(c, base, 1) : c;
}
function toRank(c, id, rank) {
  c = baseFor(c, id);
  while ((c.skills[id] ?? 0) < rank) c = buy(c, id);
  return c;
}
function stats(c, context = null) {
  const before = clone(c), result = deriveStats(freeze(c), context);
  assert.equal(result.ok, true, result.reason); assert.deepEqual(c, before); return result.stats;
}
function reject(c, id, code) {
  const before = clone(c), result = purchaseSkill(freeze(c), id);
  assert.equal(result.ok, false); assert.equal(result.code, code);
  assert.equal(Object.hasOwn(result, 'character'), false); assert.deepEqual(c, before);
}
function context(c) {
  return {character: clone(c), gold: 500, stats: {earnedGold: 500, spentGold: 0},
    inventory: {equipmentInstances: [], materials: {}, tools: []}, world: {objectives: {}, claimedRewards: []}};
}
function equipCommand(state, command) {
  const result = applyEquipmentCommand(state, command); assert.equal(result.ok, true, result.reason); return result.state;
}
function allSkills(branch) {
  let c = characterAt();
  for (const id of [...APPRENTICE_SKILLS,...ADEPT_SKILLS]) {
    if (rows.get(id).exclusiveGroup && id !== branch) continue;
    c = toRank(c, id, rows.get(id).upgradeCosts.length);
  }
  return c;
}

function displayedRuntime(id, s) {
  if (ACTION_SKILL_IDS.includes(id)) return s.actions[id];
  const p = s.actions[rows.get(id).baseId];
  return ({
    charge_through: () => ({passesThroughEnemies: p.passesThroughEnemies, stunSeconds: p.stunSeconds}),
    shield_of_thorns: () => ({thorns: p.thorns}),
    hammer_of_wrath: () => ({hammerDamage: p.damage, hammerManaCost: p.manaCost, lightning: p.lightning}),
    hammer_of_sundering: () => ({hammerDamage: p.damage, hammerManaCost: p.manaCost, armorBreak: p.armorBreak}),
    invigorating_touch: () => ({regenBuff: p.regenBuff}),
    trial_by_fire: () => ({judgementManaCost: p.manaCost, fireArea: p.fireArea}),
    shackles: () => ({judgementCooldown: p.cooldown, shackles: p.shackles}),
    shining_knight: () => ({armor: s.armor}),
    armor_of_faith: () => ({armor: s.armor, intelligence: s.intelligence}),
    armored_grace: () => ({moveSpeed: s.moveSpeed, staminaCostMultiplier: s.staminaCostMultiplier}),
    towering_strength: () => ({strength: s.strength, equipmentStrength: s.equipmentAttributes.strength, attributeBreakdown: s.attributeBreakdown.strength}),
    battering_ram: () => ({armorPenetration: s.armorPenetration, strength: s.strength}),
    crushing_might: () => ({physicalDamage: s.physicalDamage, physicalDamageMultiplier: s.physicalDamageMultiplier}),
    superb_constitution: () => ({hpMax: s.hpMax, poisonResistance: s.resistances.poison})
  })[id]();
}

test('R11 authority preserves9 Apprentice +16 Adept and adds15 Expert nodes with eight separate actions', () => {
  assert.equal(APPRENTICE_SKILLS.length, 9); assert.equal(ADEPT_SKILLS.length, 16); assert.equal(RUNTIME_SKILL_IDS.length, 40);
  assert.deepEqual(new Set(RUNTIME_SKILL_IDS), new Set(WARRIOR_REFERENCE.skills.filter(row => ['apprentice','adept','expert'].includes(row.tier)).map(row => row.id)));
  assert.deepEqual(ACTION_SKILL_IDS, [...STARTER_SKILLS, 'lay_on_hands', 'judgement', 'battle_banner', 'zealous_onslaught']);
  for (const value of [ACTION_SKILL_IDS, RUNTIME_SKILL_IDS, ADEPT_SKILLS, B.runtimePolicy, B.training.sectionOnlyUnlocks]) assert.ok(Object.isFrozen(value));
  assert.equal(B.training.sectionOnlyUnlocks.origin, 'emberwatch_authored_adjustment');
  assert.deepEqual(B.training.sectionOnlyUnlocks.skillIds, ['battering_ram','crushing_might','superb_constitution']);
  for (const id of B.training.sectionOnlyUnlocks.skillIds) assert.equal(rows.get(id).tierEvidence, 'section_only');
});

test('source bytes, null facts, costs, and unconfirmed section-only unlock evidence stay unchanged', () => {
  for (const [file, hash] of [['reference-core.js','04804f94aa38999f5e0af98094196394d703a3be4c3593d9338a3bc13bc8eb04'],['reference-warrior.js','1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549']])
    assert.equal(createHash('sha256').update(readFileSync(new URL('../src/' + file, import.meta.url))).digest('hex'), hash);
  assert.ok(WARRIOR_REFERENCE.skills.every(row => row.implementationStatus === 'reference_only'));
  for (const id of ADEPT_SKILLS) assert.equal(rows.get(id).purchaseRequirements, null);
  assert.equal(rows.get('charge_through').rankValues.minorStunDurationSeconds, null);
  assert.equal(rows.get('hammer_of_wrath').rankValues.lightningRange, null);
  assert.equal(rows.get('hammer_of_sundering').rankValues.armorBreakAmount, null);
  for (const id of ['trial_by_fire','shackles']) assert.equal(rows.get(id).exclusiveGroup, null);
  assert.equal(B.runtimePolicy.judgementAugmentsCompatible, true);
});

test('L50 Apprentice stays tier-gated for all sixteen runtime Adept nodes; level does not promote', () => {
  const c = characterAt(50, 'apprentice');
  for (const id of ADEPT_SKILLS) {
    const q = previewSkill(c, id); assert.equal(q.ok, true); assert.equal(q.code, 'TIER_REQUIRED'); assert.equal(q.available, false);
    assert.equal(q.next.runtimeStatus, 'authored_mapping_not_play_verified');
    reject(c, id, 'TIER_REQUIRED');
  }
  assert.equal(c.tier, 'apprentice');
});

test('Expert tier preserves earlier mappings; Adept cannot buy Expert and all13 Master nodes remain unsupported', () => {
  assert.equal(validateWarriorGrowth(characterAt(50,'expert')).ok,true);
  assert.equal(validateWarriorGrowth(characterAt(50,'master')).code,'TIER_NOT_IMPLEMENTED');
  const c = characterAt(), ids = WARRIOR_REFERENCE.skills.filter(row => ['expert','master'].includes(row.tier));
  assert.equal(ids.length, 28);
  for (const row of ids) {
    const code=row.tier==='expert'?'TIER_REQUIRED':'DATA_ONLY';reject(c,row.id,code);if(row.tier==='master')assert.equal(previewSkill(c,row.id).next.runtimeValues,null);
    const forged = clone(c); forged.skills[row.id] = 1; forged.skillPoints -= row.upgradeCosts[0];
    assert.equal(validateWarriorGrowth(forged).code,code);
  }
});

test('every Adept rank purchases at exact source cost with preview equal to actual derived values', () => {
  for (const id of ADEPT_SKILLS) {
    let c = baseFor(characterAt(), id);
    for (let rank = 1; rank <= rows.get(id).upgradeCosts.length; rank++) {
      const before = clone(c), q = previewSkill(freeze(c), id);
      assert.equal(q.available, true, id); assert.equal(q.cost, rows.get(id).upgradeCosts[rank - 1]);
      c = buy(c, id);
      assert.equal(c.skills[id], rank); assert.equal(c.skillPoints, before.skillPoints - q.cost);
      assert.deepEqual(q.next, previewSkill(c, id).current, id);
      assert.deepEqual(q.next.runtimeValues, displayedRuntime(id, stats(c)), id);
      for (const key of ['level','xp','tier','attributePoints','attributes','equipment']) assert.deepEqual(c[key], before[key]);
    }
    const max = previewSkill(c, id); assert.equal(max.code, 'MAX_RANK'); assert.equal(max.next, null); assert.equal(max.cost, null);
    reject(c, id, 'MAX_RANK');
  }
});

test('both legal maximum-rank branch profiles spend exactly 211 points; Adept-only legal maximum is 132', () => {
  const catalogAdeptTotal = ADEPT_SKILLS.reduce((sum, id) => sum + rows.get(id).upgradeCosts.reduce((a,b) => a+b, 0), 0);
  assert.equal(catalogAdeptTotal, 141);
  for (const branch of ['hammer_of_wrath','hammer_of_sundering']) {
    const c = allSkills(branch), result = validateWarriorGrowth(c);
    assert.equal(result.ok, true); assert.equal(result.spentSkillPoints, 211); assert.equal(c.skillPoints, 39);
    assert.equal(result.spentSkillPoints - 79, 132); assert.equal(Object.keys(c.skills).length, 24);
    assert.deepEqual(c.exclusiveBranches, {righteous_hammer_damage_type: branch});
  }
});

test('minimum base rank one is sufficient, missing passive or active bases fail without extra STR/INT/gold gates', () => {
  for (const id of ADEPT_SKILLS.filter(id => rows.get(id).baseId && !STARTER_SKILLS.includes(rows.get(id).baseId))) {
    const c = characterAt(); reject(c, id, 'BASE_SKILL'); assert.equal(previewSkill(c, id).next.runtimeValues, null);
    const withBase = baseFor(c, id); assert.equal(withBase.skills[rows.get(id).baseId], 1);
    assert.equal(purchaseSkill(withBase, id).ok, true);
  }
  for (const id of ['lay_on_hands','judgement','shining_knight','towering_strength']) assert.equal(purchaseSkill(characterAt(5), id).ok, true);
  const untrained = characterAt(); untrained.skills = {}; assert.equal(validateWarriorGrowth(untrained).code, 'STARTER_REQUIRED');
});

test('skill point shortages and corrupted ledgers fail without repair or partial output', () => {
  let c = characterAt(5); c = toRank(c, 'judgement', 3); c = toRank(c, 'shining_knight', 2);
  assert.equal(c.skillPoints, 1); reject(c, 'lay_on_hands', 'SKILL_POINTS');
  for (const edit of [c => c.skillPoints++, c => c.skillPoints--, c => {c.skills.lay_on_hands = 1;}]) {
    const forged = clone(toRank(characterAt(15), 'shining_knight', 1)); edit(forged); assert.equal(validateWarriorGrowth(forged).code, 'SKILL_POINT_LEDGER');
    const result = deriveStats(forged); assert.equal(result.ok, false); assert.equal(Object.hasOwn(result, 'stats'), false);
  }
});

test('hammer branch ownership is atomic, exclusive, exact, and rejects unknown groups or orphan selections', () => {
  for (const chosen of ['hammer_of_wrath','hammer_of_sundering']) {
    const other = chosen === 'hammer_of_wrath' ? 'hammer_of_sundering' : 'hammer_of_wrath';
    const c = toRank(characterAt(), chosen, 1); reject(c, other, 'EXCLUSIVE');
    assert.equal(previewSkill(c, other).exclusiveSelection, chosen);
    assert.equal(previewSkill(c, other).next.runtimeValues, null);
    assert.equal(previewSkill(c, other).next.runtimeStatus, 'exclusive_unavailable');
    assert.deepEqual(previewSkill(c, other).next.referenceValues, Object.fromEntries(Object.entries(rows.get(other).rankValues).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
    assert.match(previewSkill(c, other).reason, /재분배/);
    for (const edit of [c => {c.exclusiveBranches = {};}, c => {c.exclusiveBranches.righteous_hammer_damage_type = other;},
      c => {delete c.skills[chosen]; c.skillPoints += 2;}, c => {c.skills[other] = 1; c.skillPoints -= 2;}]) {
      const forged = clone(c); edit(forged); assert.equal(validateWarriorGrowth(forged).code, 'EXCLUSIVE');
    }
  }
  const unsupported = characterAt(); unsupported.exclusiveBranches.battle_banner_type = 'banner_of_zeal';
  assert.equal(validateWarriorGrowth(unsupported).code, 'BRANCH_NOT_IMPLEMENTED');
});

test('unknown IDs, invalid ranks, orphan augments and malformed growth remain fail-closed', () => {
  for (const id of ['not_a_skill','__proto__','constructor',null,undefined,1,{},[]]) reject(characterAt(), id, 'UNKNOWN_SKILL');
  for (const id of ADEPT_SKILLS) {
    let c = baseFor(characterAt(), id); c.skills[id] = rows.get(id).upgradeCosts.length + 1;
    assert.equal(validateWarriorGrowth(c).code, 'INVALID_RANK', id);
  }
  for (const c of [null, {}, [], {...characterAt(), skillPoints: NaN}, {...characterAt(), skills: {judgement: 0.5}}]) assert.equal(deriveStats(c).ok, false);
  const orphan = characterAt(); orphan.skills.invigorating_touch = 1; orphan.skillPoints -= 2;
  assert.equal(validateWarriorGrowth(orphan).code, 'BASE_SKILL');
});

test('Towering Strength ranks change explicit STR scaling without double-counting base or changing allocated conversions', () => {
  let c = allocateAttribute(characterAt(), 'strength', 2).character;
  const base = stats(c);
  for (const [rank, bonus] of [[1,5],[2,15],[3,30]]) {
    const s = stats(toRank(c, 'towering_strength', rank));
    assert.equal(s.strength, 20 + bonus); assert.equal(s.equipmentAttributes.strength, 20);
    assert.deepEqual(s.attributeBreakdown.strength, {base: 18, allocated: 2, passive: bonus, equipment: 0, temporary: 0});
    assert.equal(s.hpMax, base.hpMax); assert.equal(s.physicalDamage, base.physicalDamage); assert.equal(s.armor, base.armor);
  }
  assert.deepEqual(B.runtimePolicy.toweringStrengthConversions, {hpMax: false, physicalDamage: false, armor: false});
  assert.equal(B.runtimePolicy.equipmentAttributeConversions, false);
});

test('all defensive passive ranks preserve source flat armor, effective INT scaling, health and poison values', () => {
  for (const [rank, amount] of [[1,10],[2,20],[3,40]]) assert.equal(stats(toRank(characterAt(), 'shining_knight', rank)).armor, 4 + amount);
  for (const [rank, amount] of [[1,.1],[2,.2],[3,.4]]) {
    const c = allocateAttribute(toRank(characterAt(), 'armor_of_faith', rank), 'intelligence', 7).character;
    assert.equal(stats(c).armor, tidy(4 + 10 + 17 * amount));
  }
  for (const [rank, hp, poison] of [[1,25,10],[2,50,20],[3,75,30],[4,100,40]]) {
    const c = toRank(characterAt(), 'superb_constitution', rank), s = stats(c);
    assert.equal(s.hpMax, 55 + 49 * 4 + hp); assert.equal(s.resistances.poison, poison);
    assert.deepEqual([s.resistances.fire,s.resistances.ice,s.resistances.lightning], [0,0,0]);
  }
});

test('Armored Grace applies all rank speed/cost factors once after charge surcharge and to actual block cost', () => {
  let c = toRank(characterAt(), 'armored_assault', 3);
  for (const [rank, speed, cost] of [[1,1.03,.8],[2,1.04,.7],[3,1.05,.6]]) {
    const s = stats(toRank(c, 'armored_grace', rank));
    assert.equal(s.moveSpeed, tidy(180 * speed)); assert.equal(s.staminaCostMultiplier, cost);
    assert.equal(s.actions.shield_charge.staminaCost, tidy(10 * 1.25 * cost));
    assert.equal(s.actions.shield_block.staminaCost, tidy(6 * cost));
    assert.equal(s.actions.shield_block.holdCostPerSecond, 0);
    for (const id of ['mace_swing','righteous_hammer']) assert.equal(s.actions[id].staminaCost, 0);
  }
});

test('Charge Through replaces the original stun and Thorns exposes each source coefficient and no sampled stamina', () => {
  const original = stats(characterAt()).actions.shield_charge;
  const through = stats(toRank(characterAt(), 'charge_through', 1)).actions.shield_charge;
  assert.equal(through.stunSeconds, .25); assert.equal(through.passesThroughEnemies, true);
  for (const key of ['distance','speed','range','travelDuration','staminaCost','cooldown']) assert.equal(through[key], original[key]);
  for (const [rank, coefficient] of [[1,.1],[2,.2],[3,.3]]) {
    const s = stats(toRank(characterAt(), 'shield_of_thorns', rank));
    assert.deepEqual(s.actions.shield_block.thorns, {coefficient, damageMultiplier: 1, armorPenetration: 0});
  }
});

test('Crushing Might and Battering Ram apply once to each physical action, with mace-specific penetration separate', () => {
  let c = characterAt();
  for (const id of ['judgement','shield_of_thorns','armored_assault','crushing_blows']) c = toRank(c, id, 1);
  c = toRank(c, 'towering_strength', 3);
  for (const [rank, percent, perStr] of [[1,.05,.2],[2,.1,.3],[3,.15,.4]]) {
    let enriched = toRank(c, 'crushing_might', rank); enriched = toRank(enriched, 'battering_ram', rank);
    const s = stats(enriched), before = stats(c), factor = 1 + percent, penetration = tidy(48 * perStr);
    for (const id of ['mace_swing','shield_charge','righteous_hammer','judgement']) {
      assert.equal(s.actions[id].damage, tidy(before.actions[id].damage * factor), id);
      assert.equal(s.actions[id].armorPenetration, tidy(penetration + (id === 'mace_swing' ? 5 : 0)), id);
    }
    assert.deepEqual(s.actions.shield_block.thorns, {coefficient: .1, damageMultiplier: factor, armorPenetration: penetration});
  }
});

test('Judgement uses mainhand source percentages for every rank and never the mace rank multiplier', () => {
  let c = allocateAttribute(characterAt(), 'strength', 10).character;
  c = toRank(c, 'mace_swing', 6);
  for (const [rank, percent, mana] of [[1,300,30],[2,350,35],[3,400,40],[4,450,45],[5,500,50]]) {
    const s = stats(toRank(c, 'judgement', rank)), action = s.actions.judgement;
    assert.equal(action.damage, 18 * percent / 100); assert.equal(s.actions.mace_swing.damage, 36);
    assert.equal(action.manaCost, mana); assert.equal(action.cooldown, 4);
    assert.equal(action.range, 128); assert.equal(action.arcRadians, Math.PI * 2 / 3); assert.equal(action.duration, .6); assert.equal(action.contact, .27);
  }
});

test('heal source ranks remain unamplified, regen buffs only multiply existing pools, and cast speed changes timing only', () => {
  let c = allocateAttribute(characterAt(), 'intelligence', 30).character;
  for (const [rank, heal, mana] of [[1,60,30],[2,120,40],[3,200,50],[4,300,60]]) {
    const s = stats(toRank(c, 'lay_on_hands', rank)), action = s.actions.lay_on_hands;
    assert.equal(action.heal, heal); assert.equal(action.manaCost, mana); assert.equal(action.cooldown, 13);
    assert.equal(action.radius, 96); assert.equal(action.duration, tidy(.52 / 1.15)); assert.equal(action.contact, tidy(action.duration * .44));
  }
  for (const [rank, multiplier] of [[1,1.25],[2,1.5],[3,2]]) {
    const s = stats(toRank(c, 'invigorating_touch', rank));
    assert.deepEqual(s.actions.lay_on_hands.regenBuff, {duration: 4, multiplier});
    assert.equal(s.healthRegen, 0); assert.equal(s.manaRegen, 5.2); assert.equal(s.staminaRegen, 10);
  }
});

test('each hammer branch preserves source extra mana; lightning remains elemental and sundering follows fixed damage order', () => {
  let c = allocateAttribute(characterAt(), 'intelligence', 10).character;
  c = allocateAttribute(c, 'strength', 2).character;
  c = toRank(c, 'towering_strength', 2); c = toRank(c, 'crushing_might', 3); c = toRank(c, 'battering_ram', 3);
  const baseHammer = (30 + 49 * 2) * 1.1;
  for (const [rank, lightning, coefficient, armor] of [[1,25,.3,5],[2,50,.4,10],[3,75,.5,20]]) {
    const wrath = stats(toRank(c, 'hammer_of_wrath', rank)).actions.righteous_hammer;
    assert.equal(wrath.damage, tidy(baseHammer * 1.15)); assert.equal(wrath.manaCost, 18.75);
    assert.deepEqual(wrath.lightning, {damage: lightning, tickSeconds: .25, radius: 64}); assert.equal(wrath.armorBreak, null);
    const sundering = stats(toRank(c, 'hammer_of_sundering', rank)).actions.righteous_hammer;
    assert.equal(sundering.damage, tidy((baseHammer + 35 * coefficient) * 1.15)); assert.equal(sundering.manaCost, 18.75);
    assert.deepEqual(sundering.armorBreak, {amount: armor, duration: 3}); assert.equal(sundering.lightning, null);
  }
});

test('fire and shackles combine with exact separate mana/CD modifiers and source tick totals without physical leakage', () => {
  let c = allocateAttribute(characterAt(), 'intelligence', 30).character;
  c = toRank(c, 'crushing_might', 3); c = toRank(c, 'battering_ram', 3);
  for (const [rank, fire, total] of [[1,20,200],[2,30,300],[3,45,450],[4,65,650]]) {
    let enriched = toRank(c, 'trial_by_fire', rank); enriched = toRank(enriched, 'shackles', 1);
    const action = stats(enriched).actions.judgement;
    assert.deepEqual(action.fireArea, {damage: fire, tickSeconds: .5, duration: 5});
    assert.equal(action.fireArea.damage * action.fireArea.duration / action.fireArea.tickSeconds, total);
    assert.equal(action.manaCost, 37.5); assert.equal(action.cooldown, 6); assert.equal(action.duration, tidy(.6 / 1.15));
    assert.deepEqual(action.shackles, {moveMultiplier: .4, damageTakenMultiplier: 1.1, duration: 3});
  }
  for (const [rank, move, damage] of [[1,.4,1.1],[2,.3,1.15],[3,.2,1.2]])
    assert.deepEqual(stats(toRank(c, 'shackles', rank)).actions.judgement.shackles, {moveMultiplier: move, damageTakenMultiplier: damage, duration: 3});
});

test('max mana warning is informative and does not invent a new INT requirement or change source price', () => {
  let c = toRank(characterAt(5), 'lay_on_hands', 2);
  const q = previewSkill(c, 'lay_on_hands'); assert.equal(q.available, true); assert.equal(q.cost, 4);
  assert.deepEqual(q.warnings, [{code: 'MAX_MANA_TOO_LOW', reason: '현재 최대마나로 시전할 수 없습니다.', manaCost: 50, manaMax: 48}]);
  c = buy(c, 'lay_on_hands'); assert.equal(stats(c).actions.lay_on_hands.manaCost, 50); assert.equal(stats(c).manaMax, 48);
  assert.equal(previewSkill(characterAt(5), 'judgement').warnings.length, 0);
});

test('equipment context keeps direct bonuses and preview consistency without allowing passive STR to satisfy requirements', () => {
  let c = toRank(characterAt(), 'towering_strength', 3), state = context(c);
  state = equipCommand(state, {type: 'buyEquipment', commandId: 'model-buy', baseId: 'iron_mace', station: 'blacksmith'});
  const itemId = state.inventory.equipmentInstances[0].id;
  assert.equal(stats(c).strength, 48); assert.equal(stats(c).equipmentAttributes.strength, 18);
  assert.equal(equipmentRows(state).rows[0].eligibility.code, 'ATTRIBUTE_REQUIREMENT');
  assert.equal(applyEquipmentCommand(state, {type: 'equipItem', commandId: 'model-denied', itemId}).code, 'ATTRIBUTE_REQUIREMENT');
  state.character = allocateAttribute(state.character, 'strength', 2).character;
  state = equipCommand(state, {type: 'equipItem', commandId: 'model-equip', itemId});
  assert.equal(validateEquipmentState(state).ok, true);
  const before = stats(state.character, state); assert.equal(before.physicalDamage, 15.2); assert.equal(before.strength, 50);
  assert.equal(before.equipmentAttributes.strength, 20); assert.equal(before.hpMax, 255); assert.equal(before.armor, 4.2);
  const q = previewSkill(state.character, 'judgement', state);
  state.character = buy(state.character, 'judgement', state);
  assert.deepEqual(q.next.runtimeValues, stats(state.character, state).actions.judgement);
  assert.equal(stats(state.character, state).actions.judgement.damage, 45.6);
});

test('equipment context cannot leak gear from another character, level, tier, allocation, or empty loadout', () => {
  let state = context(allocateAttribute(characterAt(), 'strength', 2).character);
  state = equipCommand(state, {type: 'buyEquipment', commandId: 'ctx-buy', baseId: 'iron_mace', station: 'blacksmith'});
  state = equipCommand(state, {type: 'equipItem', commandId: 'ctx-equip', itemId: state.inventory.equipmentInstances[0].id});
  assert.equal(deriveStats(state.character).code, 'EQUIPMENT_NOT_IMPLEMENTED');
  for (const edit of [c => {c.equipment.mainHand = null;}, c => {c.tier = 'apprentice';}, c => {c.attributes.strength++; c.attributePoints--;}, c => {c.level = 49; c.attributePoints -= 5; c.skillPoints -= 6;}]) {
    const other = clone(state.character); edit(other);
    assert.equal(deriveStats(other, state).code, 'EQUIPMENT_NOT_IMPLEMENTED');
  }
  assert.equal(deriveStats(characterAt(), state).code, 'EQUIPMENT_NOT_IMPLEMENTED');
});

test('derived Adept objects and previews are detached and high-investment outputs remain finite', () => {
  const c = allSkills('hammer_of_wrath'), before = clone(c), s = stats(c), q = previewSkill(c, 'towering_strength');
  s.actions.judgement.fireArea.damage = 999; s.actions.righteous_hammer.lightning.damage = 999;
  s.attributeBreakdown.strength.passive = 999; q.current.runtimeValues.attributeBreakdown.passive = 999;
  const unchanged = stats(c); assert.equal(unchanged.actions.judgement.fireArea.damage, 65);
  assert.equal(unchanged.actions.righteous_hammer.lightning.damage, 75); assert.equal(unchanged.attributeBreakdown.strength.passive, 30);
  assert.deepEqual(c, before);
  for (const key of ['strength','dexterity','intelligence']) {
    const extreme = stats(allocateAttribute(c, key, 245).character);
    for (const value of Object.values(extreme)) if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
    for (const id of ['lay_on_hands','judgement']) {assert.ok(extreme.actions[id].duration >= .3); assert.ok(extreme.actions[id].contact < extreme.actions[id].duration);}
  }
});
