import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createCharacter, grantExperience, allocateAttribute, xpForLevel } from '../src/progression.js';
import { WARRIOR_REFERENCE } from '../src/reference-warrior.js';
import { WARRIOR_BALANCE } from '../src/warrior-balance.js';
import { STARTER_SKILLS, APPRENTICE_SKILLS, trainStarterSkills, validateWarriorGrowth, purchaseSkill, previewSkill, deriveStats } from '../src/warrior-growth.js';

// Model/handler fixtures, not a browser or a normally earned campaign.
// No combat renderer, hit resolution, NPC reach or play-duration claim.
const rows = new Map(WARRIOR_REFERENCE.skills.map(row => [row.id, row]));
const copy = value => structuredClone(value);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function characterAt(level = 1, trained = true) {
  let xp = 0;
  for (let from = 1; from < level; from++) xp += xpForLevel(from);
  const result = grantExperience(createCharacter(), xp);
  assert.equal(result.ok, true);
  return trained ? trainStarterSkills(result.character).character : result.character;
}
function buy(c, id) { const result = purchaseSkill(c, id); assert.equal(result.ok, true, id + ': ' + result.reason); return result.character; }
function toRank(c, id, rank) { while ((c.skills[id] ?? 0) < rank) c = buy(c, id); return c; }
function rejected(fn, c, ...args) {
  const before = copy(c);
  const result = fn(freeze(c), ...args);
  assert.equal(result.ok, false);
  assert.ok(result.code && result.reason);
  assert.equal(Object.hasOwn(result, 'character'), false);
  assert.deepEqual(c, before);
  return result;
}
function stats(c) { const result = deriveStats(c); assert.equal(result.ok, true); return result.stats; }

test('R2 scope is exactly the reference nine Apprentice nodes and explicit four starters', () => {
  assert.deepEqual(STARTER_SKILLS, ['shield_charge','mace_swing','shield_block','righteous_hammer']);
  assert.deepEqual(new Set(APPRENTICE_SKILLS), new Set(['shield_charge','armored_assault','mace_swing','stunning_strikes','crushing_blows','shield_block','shield_training','elemental_bulwark','righteous_hammer']));
  assert.ok(Object.isFrozen(STARTER_SKILLS) && Object.isFrozen(APPRENTICE_SKILLS));
  assert.equal(APPRENTICE_SKILLS.length, 9);
  assert.equal(WARRIOR_REFERENCE.skills.filter(row => !APPRENTICE_SKILLS.includes(row.id)).length, 44);
  assert.ok(WARRIOR_REFERENCE.skills.every(row => row.implementationStatus === 'reference_only'));
});

test('reference bytes, null unknowns and source point costs remain untouched', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('../src/reference-warrior.js', import.meta.url))).digest('hex'), '1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549');
  assert.ok(STARTER_SKILLS.every(id => rows.get(id).upgradeCosts[0] === 0));
  assert.equal(rows.get('mace_swing').rankValues.staminaCost, null);
  assert.equal(rows.get('shield_block').rankValues.activeStaminaCost, null);
  assert.equal(rows.get('shield_charge').rankValues.stunDurationSeconds, null);
  assert.equal(rows.get('righteous_hammer').rankValues.projectileSpeed, null);
  assert.ok(Object.isFrozen(WARRIOR_BALANCE) && Object.isFrozen(WARRIOR_BALANCE.mace));
  assert.equal(WARRIOR_BALANCE.origin, 'emberwatch_authored_adjustment');
});

test('explicit starter training grants four rank-one zero-cost skills without level, XP or point injection', () => {
  const c = freeze(createCharacter()), before = copy(c);
  const result = trainStarterSkills(c);
  assert.equal(result.ok, true);
  assert.deepEqual(result.learned, STARTER_SKILLS);
  assert.equal(result.alreadyTrained, false);
  assert.deepEqual(result.character.skills, Object.fromEntries(STARTER_SKILLS.map(id => [id, 1])));
  for (const key of ['level','xp','tier','attributePoints','skillPoints']) assert.equal(result.character[key], c[key]);
  assert.deepEqual(c, before);
  assert.deepEqual(validateWarriorGrowth(result.character), { ok: true, starterTrained: true, spentSkillPoints: 0, earnedSkillPoints: 0 });
});

test('repeat starter training is idempotent and does not reset upgraded ranks or refill spent points', () => {
  const upgraded = freeze(buy(characterAt(2), 'mace_swing'));
  const result = trainStarterSkills(upgraded);
  assert.equal(result.ok, true);
  assert.equal(result.alreadyTrained, true);
  assert.deepEqual(result.learned, []);
  assert.deepEqual(result.character, upgraded);
  assert.notEqual(result.character, upgraded);
  result.character.skills.mace_swing = 1;
  assert.equal(upgraded.skills.mace_swing, 2);
  assert.equal(upgraded.skillPoints, 2);
});

test('untrained earned-level characters retain their points during explicit starter training', () => {
  const c = freeze(characterAt(15, false));
  const result = trainStarterSkills(c);
  assert.equal(result.ok, true);
  assert.equal(result.character.skillPoints, 54);
  assert.equal(result.character.level, 15);
  assert.equal(result.character.tier, 'apprentice');
  assert.equal(validateWarriorGrowth(result.character).spentSkillPoints, 0);
});

test('partial starter sets, zero stored ranks and orphan augments fail closed without repair grants', () => {
  const partial = createCharacter(); partial.skills.shield_charge = 1;
  assert.equal(rejected(trainStarterSkills, partial).code, 'PARTIAL_STARTER');
  const zero = createCharacter(); zero.skills.shield_charge = 0;
  assert.equal(rejected(trainStarterSkills, zero).code, 'INVALID_RANK');
  const orphan = characterAt(2, false); orphan.skills.armored_assault = 1; orphan.skillPoints--;
  assert.equal(rejected(trainStarterSkills, orphan).code, 'BASE_SKILL');
});

test('purchases consume the exact next-rank source cost and insufficient points are unchanged', () => {
  const c = freeze(characterAt(2));
  const first = purchaseSkill(c, 'armored_assault');
  assert.equal(first.ok, true);
  assert.equal(first.cost, 1);
  assert.equal(first.rank, 1);
  assert.equal(first.character.skillPoints, 2);
  const second = purchaseSkill(first.character, 'mace_swing');
  assert.equal(second.cost, 1);
  assert.equal(second.character.skillPoints, 1);
  assert.equal(rejected(purchaseSkill, second.character, 'armored_assault').code, 'SKILL_POINTS');
  assert.equal(c.skillPoints, 3);
});

test('all nine skills reach every source rank through the purchase handler with exact total spend', () => {
  let c = characterAt(50), expectedSpent = 0;
  for (const id of APPRENTICE_SKILLS) {
    const row = rows.get(id);
    for (let rank = (c.skills[id] ?? 0) + 1; rank <= row.upgradeCosts.length; rank++) {
      const result = purchaseSkill(freeze(c), id);
      assert.equal(result.ok, true);
      assert.equal(result.rank, rank);
      assert.equal(result.cost, row.upgradeCosts[rank - 1]);
      c = result.character;
    }
    expectedSpent += row.upgradeCosts.reduce((sum, cost) => sum + cost, 0);
  }
  assert.equal(expectedSpent, 79);
  assert.equal(c.skillPoints, 250 - expectedSpent);
  assert.equal(validateWarriorGrowth(c).spentSkillPoints, expectedSpent);
  assert.equal(c.level, 50);
  assert.equal(c.tier, 'apprentice');
});

test('max rank has no fabricated next rank, price or preview and cannot be repurchased', () => {
  for (const id of APPRENTICE_SKILLS) {
    const c = freeze(toRank(characterAt(50), id, rows.get(id).upgradeCosts.length));
    const preview = previewSkill(c, id);
    assert.equal(preview.ok, true);
    assert.equal(preview.available, false);
    assert.equal(preview.code, 'MAX_RANK');
    assert.equal(preview.nextRank, null);
    assert.equal(preview.cost, null);
    assert.equal(preview.next, null);
    assert.equal(rejected(purchaseSkill, copy(c), id).code, 'MAX_RANK');
  }
});

test('L50 Apprentice still cannot buy all28 later nodes: Expert requires promotion and Master stays data-only', () => {
  const c = freeze(characterAt(50));
  for (const row of WARRIOR_REFERENCE.skills.filter(row => ['expert','master'].includes(row.tier))) {
    const preview = previewSkill(c, row.id);
    assert.equal(preview.ok, true);
    const code=row.tier==='expert'?'TIER_REQUIRED':'DATA_ONLY';assert.equal(preview.code,code);
    assert.equal(preview.available, false);
    assert.equal(preview.rank, 0);
    assert.equal(preview.current, null);
    if(row.tier==='master'){assert.equal(preview.next.runtimeValues,null);assert.equal(preview.next.runtimeStatus,'data_only');}else assert.equal(preview.next.runtimeStatus,'authored_mapping_not_play_verified');
    assert.equal(rejected(purchaseSkill, copy(c), row.id).code,code);
  }
  assert.equal(previewSkill(c, 'champion_of_truth').next.referenceValues.attackCritChancePercent, null);
});

test('unknown or inherited-looking skill IDs fail without object-prototype access', () => {
  for (const id of ['unknown','__proto__','constructor','toString',null,undefined,{},[],1]) {
    assert.equal(rejected(purchaseSkill, characterAt(2), id).code, 'UNKNOWN_SKILL');
    assert.equal(previewSkill(characterAt(2), id).code, 'UNKNOWN_SKILL');
  }
});

test('R2 exact point ledger rejects free paid ranks and missing or excessive unspent points', () => {
  const free = characterAt(2); free.skills.armored_assault = 1;
  assert.equal(validateWarriorGrowth(free).code, 'SKILL_POINT_LEDGER');
  const lost = characterAt(2); lost.skillPoints--;
  assert.equal(validateWarriorGrowth(lost).code, 'SKILL_POINT_LEDGER');
  const paid = buy(characterAt(2), 'armored_assault');
  assert.equal(validateWarriorGrowth(paid).ok, true);
  const forged = copy(paid); forged.skillPoints++;
  assert.equal(validateWarriorGrowth(forged).code, 'SKILL_POINT_LEDGER');
});

test('unsupported tiers, inconsistent branches, missing equipment contexts and unpromoted skills are rejected', () => {
  for (const [edit, code] of [
    [c => { c.tier = 'expert'; c.skills = {}; }, 'STARTER_REQUIRED'],
    [c => { c.exclusiveBranches.righteous_hammer_damage_type = 'hammer_of_wrath'; }, 'EXCLUSIVE'],
    [c => { c.equipment.mainHand = 'fake-mace'; }, 'EQUIPMENT_NOT_IMPLEMENTED'],
    [c => { c.skills.lay_on_hands = 1; c.skillPoints -= 2; }, 'TIER_REQUIRED'],
    [c => { c.skills.mace_swing = 7; }, 'INVALID_RANK']
  ]) {
    const c = characterAt(15); edit(c);
    assert.equal(validateWarriorGrowth(c).code, code);
    assert.equal(rejected(deriveStats, c).code, code);
  }
});

test('untrained actions are explicitly learned:false and cannot be purchased instead of first training', () => {
  const c = freeze(createCharacter()), result = stats(c);
  assert.ok(Object.values(result.actions).every(action => action.learned === false));
  for (const id of APPRENTICE_SKILLS) {
    const preview = previewSkill(c, id);
    assert.equal(preview.code, 'STARTER_REQUIRED');
    assert.equal(preview.current, null);
    assert.equal(rejected(purchaseSkill, copy(c), id).code, 'STARTER_REQUIRED');
  }
});

test('reference starting pools and attributes stay exact; training-kit values are separate authored mappings', () => {
  const s = stats(freeze(characterAt(1)));
  assert.deepEqual([s.hpMax,s.manaMax,s.staminaMax], [55,40,45]);
  assert.deepEqual([s.strength,s.dexterity,s.intelligence], [18,12,10]);
  assert.deepEqual([s.physicalDamage,s.armor,s.moveSpeed], [12,4,180]);
  assert.deepEqual([s.healthRegen,s.manaRegen,s.staminaRegen], [0,4,10]);
  assert.equal(s.criticalChance, 0.05);
  assert.ok(STARTER_SKILLS.every(id => s.actions[id].learned === true));
  assert.equal(s.actions.lay_on_hands.learned, false);
  assert.equal(s.actions.judgement.learned, false);
  assert.ok(Object.values(characterAt(1).equipment).every(value => value === null));
});

test('unallocated level growth follows reference 4/2/3 without implicitly adding attribute bonuses', () => {
  for (const level of [2,5,15,30,50]) {
    const s = stats(characterAt(level));
    assert.deepEqual([s.hpMax,s.manaMax,s.staminaMax], [55+4*(level-1),40+2*(level-1),45+3*(level-1)]);
    assert.deepEqual([s.strength,s.dexterity,s.intelligence], [18,12,10]);
    assert.equal(s.physicalDamage, 12);
  }
});

test('actual attribute allocations produce the documented authored pools, rates and pre-defense damage', () => {
  let c = characterAt(5);
  c = allocateAttribute(c, 'strength', 5).character;
  c = allocateAttribute(c, 'dexterity', 5).character;
  c = allocateAttribute(c, 'intelligence', 10).character;
  const s = stats(freeze(c));
  assert.deepEqual([s.hpMax,s.manaMax,s.staminaMax], [81,68,62]);
  assert.deepEqual([s.strength,s.dexterity,s.intelligence], [23,17,20]);
  assert.deepEqual([s.physicalDamage,s.armor,s.criticalChance], [15,4.5,0.055]);
  assert.deepEqual([s.attackSpeed,s.castSpeed,s.spellPower], [1.025,1.05,1.1]);
  assert.deepEqual([s.manaRegen,s.staminaRegen], [4.4,10.3]);
  assert.equal(s.actions.righteous_hammer.damage, 41.8);
});

test('action contact/duration is independent of source cooldown, and charged movement has a bounded distance', () => {
  const a = stats(characterAt(1)).actions;
  assert.equal(a.mace_swing.cooldown, 0.1);
  assert.equal(a.mace_swing.duration, 0.52);
  assert.equal(a.mace_swing.contact, 0.182);
  assert.equal(a.righteous_hammer.cooldown, 1);
  assert.equal(a.righteous_hammer.duration, 0.52);
  assert.equal(a.righteous_hammer.contact, 0.2288);
  assert.equal(a.righteous_hammer.damage, 30);
  assert.equal(a.righteous_hammer.manaCost, 15);
  assert.equal(a.shield_charge.damage, 0);
  assert.equal(a.shield_charge.staminaCost, 10);
  assert.equal(a.shield_charge.cooldown, 3);
  assert.equal(a.shield_charge.travelDuration, 0.18);
  assert.equal(a.shield_charge.speed * a.shield_charge.travelDuration, a.shield_charge.distance);
  assert.ok(a.shield_charge.contact + a.shield_charge.travelDuration <= a.shield_charge.duration);
  assert.equal(a.shield_charge.passesThroughEnemies, false);
});

test('Armored Assault uses actual derived armor and adds the source 25 percent stamina modifier once', () => {
  for (const [rank, coefficient] of [[1,1],[2,1.5],[3,2]]) {
    let c = toRank(characterAt(50), 'armored_assault', rank);
    c = allocateAttribute(c, 'strength', 5).character;
    const s = stats(c);
    assert.equal(s.actions.shield_charge.damage, s.armor * coefficient);
    assert.equal(s.actions.shield_charge.staminaCost, 12.5);
    assert.equal(s.actions.mace_swing.staminaCost, 0);
  }
});

test('stun chance and crushing penetration follow every source rank without leaking into hammer', () => {
  for (const [rank, chance] of [[1,.05],[2,.1],[3,.15],[4,.2]]) {
    const s = stats(toRank(characterAt(50), 'stunning_strikes', rank));
    assert.equal(s.actions.mace_swing.stunChance, chance);
    assert.equal(s.actions.mace_swing.stunSeconds, 0.6);
  }
  for (const [rank, penetration] of [[1,5],[2,10],[3,20]]) {
    const s = stats(toRank(characterAt(50), 'crushing_blows', rank));
    assert.equal(s.actions.mace_swing.armorPenetration, penetration);
    assert.equal(s.actions.righteous_hammer.armorPenetration, 0);
  }
});

test('active and passive shields are distinct, with per-hit cost and multiplicative slow-effect reduction', () => {
  for (const [rank, amount] of [[1,25],[2,50],[3,75],[4,100]]) {
    const block = stats(toRank(characterAt(50), 'shield_block', rank)).actions.shield_block;
    assert.equal(block.passiveBlockChance, 0.25);
    assert.equal(block.passiveBlockAmount, amount);
    assert.equal(block.passiveDamageType, 'physical');
    assert.equal(block.damageReduction, 0.7);
    assert.equal(block.staminaCost, 6);
    assert.equal(block.holdCostPerSecond, 0);
    assert.equal(block.costTrigger, 'successfully_blocked_incoming_hit');
  }
  for (const [rank, movement] of [[0,.5],[1,.6],[2,.7],[3,.85]]) {
    const c = rank ? toRank(characterAt(50), 'shield_training', rank) : characterAt(50);
    assert.equal(stats(c).actions.shield_block.moveMultiplier, movement);
  }
});

test('Elemental Bulwark exposes only three blocking resistances without passive poison or permanent leakage', () => {
  for (const [rank, amount] of [[1,10],[2,20],[3,40]]) {
    const s = stats(toRank(characterAt(50), 'elemental_bulwark', rank));
    assert.deepEqual(s.actions.shield_block.resistanceBonus, { fire: amount, ice: amount, lightning: amount, poison: 0 });
    assert.deepEqual(s.resistances, { fire: 0, ice: 0, lightning: 0, poison: 0 });
  }
});

test('preview returns source unknowns and actual next-rank runtime values without spending or mutating', () => {
  const c = freeze(characterAt(2)), before = copy(c);
  const preview = previewSkill(c, 'mace_swing');
  assert.equal(preview.ok, true);
  assert.equal(preview.available, true);
  assert.equal(preview.rank, 1);
  assert.equal(preview.nextRank, 2);
  assert.equal(preview.cost, 1);
  assert.equal(preview.current.referenceValues.staminaCost, null);
  assert.equal(preview.current.runtimeValues.staminaCost, 0);
  assert.equal(preview.next.referenceValues.mainhandDamagePercent, 120);
  assert.equal(preview.next.damageStage, 'before_target_defense_and_critical_resolution');
  assert.deepEqual(preview.next.runtimeValues, stats(buy(c, 'mace_swing')).actions.mace_swing);
  assert.deepEqual(c, before);
  const block = previewSkill(c, 'shield_block');
  assert.equal(block.current.referenceValues.activeStaminaCost, null);
  assert.equal(block.current.runtimeValues.staminaCost, 6);
});

test('unaffordable and untrained previews remain informative without becoming purchase authority', () => {
  const c = freeze(characterAt(1));
  const preview = previewSkill(c, 'armored_assault');
  assert.equal(preview.code, 'SKILL_POINTS');
  assert.equal(preview.available, false);
  assert.equal(preview.next.runtimeValues.chargeDamage, 4);
  assert.equal(preview.next.runtimeValues.chargeStaminaCost, 12.5);
  const fresh = previewSkill(createCharacter(), 'mace_swing');
  assert.equal(fresh.code, 'STARTER_REQUIRED');
  assert.equal(fresh.next.referenceValues.staminaCost, null);
  assert.equal(fresh.next.runtimeValues.damage, 12);
  assert.equal(previewSkill(createCharacter(), 'armored_assault').next.runtimeValues, null);
});

test('all current/next preview values for implemented ranks agree with successful purchases', () => {
  for (const id of APPRENTICE_SKILLS) {
    let c = characterAt(50);
    while ((c.skills[id] ?? 0) < rows.get(id).upgradeCosts.length) {
      const preview = previewSkill(freeze(c), id);
      const result = purchaseSkill(c, id);
      assert.equal(result.ok, true);
      const after = previewSkill(result.character, id);
      assert.deepEqual(preview.next, after.current);
      c = result.character;
    }
  }
});

test('derived outputs and previews are detached from source catalog and character data', () => {
  const c = freeze(toRank(characterAt(50), 'elemental_bulwark', 1)), before = copy(c);
  const preview = previewSkill(c, 'elemental_bulwark');
  preview.current.runtimeValues.resistanceBonusWhileBlocking.fire = 999;
  preview.current.referenceValues.resistanceBonus = 999;
  const s = stats(c); s.actions.shield_block.resistanceBonus.fire = 777;
  assert.equal(stats(c).actions.shield_block.resistanceBonus.fire, 10);
  assert.equal(rows.get('elemental_bulwark').rankValues.resistanceBonus[0], 10);
  assert.deepEqual(c, before);
});

test('high investment respects authored readable-action minimums and keeps finite unit-correct stats', () => {
  for (const key of ['strength','dexterity','intelligence']) {
    const c = allocateAttribute(characterAt(50), key, 245).character;
    const s = stats(c);
    assert.ok(s.actions.mace_swing.duration >= 0.3);
    assert.ok(s.actions.righteous_hammer.duration >= 0.3);
    assert.ok(s.actions.mace_swing.contact < s.actions.mace_swing.duration);
    assert.ok(s.criticalChance >= 0 && s.criticalChance <= 1);
    for (const value of Object.values(s)) if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
  }
});

test('malformed input fails through shared validation and source previews never substitute null with zero', () => {
  for (const c of [null,undefined,{},[],{...createCharacter(), xp: NaN}]) {
    assert.equal(validateWarriorGrowth(c).ok, false);
    assert.equal(trainStarterSkills(c).ok, false);
    assert.equal(deriveStats(c).ok, false);
    assert.equal(previewSkill(c, 'mace_swing').ok, false);
    assert.equal(purchaseSkill(c, 'mace_swing').ok, false);
  }
  const preview = previewSkill(characterAt(50), 'champion_of_truth');
  assert.equal(preview.next.referenceValues.attackCritChancePercent, null);
  assert.equal(preview.next.runtimeValues, null);
});

