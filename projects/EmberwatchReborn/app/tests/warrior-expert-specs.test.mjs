import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { WARRIOR_REFERENCE } from '../src/reference-warrior.js';
import { EXPERT_BALANCE, applyExpertStats, expertPreview } from '../src/warrior-expert.js';

// Calculation fixtures only. These deliberately synthetic stats/ranks are not
// legal earned profiles and do not test purchase, combat, save or normal play.
// Handler integration and activation of supported nodes belong to separate tests.
const rows = new Map(WARRIOR_REFERENCE.skills.map(row => [row.id, row]));
const tidy = n => Number(n.toFixed(8));
const source = (id, key, rank) => {
  const value = rows.get(id).rankValues[key];
  return Array.isArray(value) ? value[rank - 1] : value;
};
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function baseStats(overrides = {}) {
  return {
    intelligence: 27, physicalDamage: 46, physicalDamageMultiplier: 1.15,
    armorPenetration: 8, castSpeed: 1.2, staminaCostMultiplier: 1,
    criticalChance: 0.05, criticalMultiplier: 1.5,
    resistances: {fire: 0, ice: 0, lightning: 0, poison: 0},
    actions: {
      mace_swing: {learned: true, damage: 69, manaCost: 0, staminaCost: 0, cooldown: 0.1},
      shield_charge: {learned: true, damage: 9, manaCost: 0, staminaCost: 15, cooldown: 3},
      shield_block: {learned: true, manaCost: 0, staminaCost: 6, holdCostPerSecond: 0},
      righteous_hammer: {learned: true, damage: 90, manaCost: 18.75, staminaCost: 0, cooldown: 1, speed: 560, radius: 16},
      lay_on_hands: {learned: true, heal: 60, manaCost: 30, staminaCost: 0, cooldown: 13, radius: 96, regenBuff: {duration: 4, multiplier: 2}},
      judgement: {learned: true, damage: 138, manaCost: 37.5, staminaCost: 0, cooldown: 6}
    },
    ...overrides
  };
}
function calculate(skills = {}, overrides = {}, finalCosts = false) {
  const stats = applyExpertStats(baseStats(overrides), {skills});
  // Reproduce only the documented final cost arithmetic seam. This is NOT the
  // production growth handler and does not claim an end-to-end purchase test.
  if (finalCosts) for (const action of Object.values(stats.actions)) if (action.learned) {
    action.staminaCost = tidy(action.staminaCost * stats.staminaCostMultiplier);
    if (Object.hasOwn(action, 'holdCostPerSecond')) action.holdCostPerSecond = tidy(action.holdCostPerSecond * stats.staminaCostMultiplier);
  }
  return stats;
}

test('Expert calculation provenance preserves source bytes/nulls and immutable authored policy', () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL('../src/reference-warrior.js', import.meta.url))).digest('hex'), '1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549');
  for (const [id, key] of [
    ['flames_of_devotion', 'flameArcRange'], ['hammer_of_devotion', 'returnDelaySeconds'],
    ['battle_banner', 'areaRadius'], ['zealous_onslaught', 'manaCost'],
    ['zealous_onslaught', 'damageTickSeconds'], ['zealous_onslaught', 'staminaCostIntervalSeconds'],
    ['zealous_lance', 'physicalFireSplit'], ['zealous_lance', 'range'],
    ['flaming_wrath', 'areaRadius'], ['lawbringer', 'disarmDurationSeconds'],
    ['lawbringer', 'silenceDurationSeconds'], ['guilt_by_association', 'areaRadius']
  ]) assert.equal(rows.get(id).rankValues[key], null, `${id}.${key}`);
  assert.equal(EXPERT_BALANCE.origin, 'emberwatch_authored_adjustment');
  assert.equal(EXPERT_BALANCE.source.measured, false);
  assert.equal(EXPERT_BALANCE.source.currentVerified, false);
  assert.ok(Object.isFrozen(EXPERT_BALANCE) && Object.isFrozen(EXPERT_BALANCE.onslaught));
  assert.ok(Object.isFrozen(EXPERT_BALANCE.cleanseStatuses));
  assert.match(EXPERT_BALANCE.policy.onslaughtMana, /unknown.*zero MP/);
  assert.equal(EXPERT_BALANCE.onslaught.manaCost, 0);
  assert.equal(EXPERT_BALANCE.onslaught.recurringManaCost, 0);
});

test('Expert calculation is deterministic, changes only derived stats and grants no unlearned effects', () => {
  const character = freeze({skills: {}}), before = structuredClone(character);
  const stats = baseStats(), original = structuredClone(stats);
  assert.equal(applyExpertStats(stats, character), stats);
  assert.deepEqual(character, before);
  assert.deepEqual(stats, applyExpertStats(baseStats(), character));
  assert.deepEqual(stats.actions.battle_banner, {learned: false});
  assert.deepEqual(stats.actions.zealous_onslaught, {learned: false});
  for (const key of ['innerFlame', 'flamingWrath', 'lawbringer', 'guilt']) assert.equal(stats[key], null);
  assert.equal(stats.punishMultiplier, 1);
  assert.equal(stats.actions.mace_swing.flameArc, null);
  assert.equal(stats.actions.righteous_hammer.returning, null);
  assert.equal(stats.actions.lay_on_hands.undead, null);
  assert.equal(stats.actions.lay_on_hands.cleanse, false);
  for (const key of ['intelligence', 'physicalDamage', 'criticalChance', 'criticalMultiplier', 'resistances']) assert.deepEqual(stats[key], original[key]);
  for (const id of ['mace_swing', 'righteous_hammer', 'lay_on_hands', 'judgement']) {
    for (const key of ['damage', 'manaCost', 'staminaCost', 'cooldown']) assert.equal(stats.actions[id][key], original.actions[id][key]);
  }
  assert.equal(expertPreview('healing_flames', stats), null);
  assert.equal(expertPreview('__proto__', stats), null);
});

test('Flames calculation uses every source INT coefficient without weapon/spell conversions', () => {
  for (let rank = 1; rank <= rows.get('flames_of_devotion').upgradeCosts.length; rank++) {
    const stats = calculate({flames_of_devotion: rank}, {intelligence: 35, physicalDamageMultiplier: 8, spellPower: 10});
    assert.deepEqual(stats.actions.mace_swing.flameArc, {
      rank, damage: tidy(35 * source('flames_of_devotion', 'damagePerIntelligence', rank)),
      damageType: 'fire', range: 90, arcRadians: 2.1
    });
    assert.equal(stats.actions.mace_swing.damage, 69);
  }
});

test('Return, cleanse and all undead ranks preserve base action payloads and known cooldown additions', () => {
  for (let rank = 1; rank <= rows.get('turn_undead').upgradeCosts.length; rank++) {
    const stats = calculate({hammer_of_devotion: 1, cleansing_touch: 1, turn_undead: rank});
    const hammer = stats.actions.righteous_hammer, heal = stats.actions.lay_on_hands;
    assert.deepEqual(hammer.returning, {delay: 0, timeout: 2, catchRadius: 18});
    assert.equal(hammer.cooldown, source('righteous_hammer', 'cooldownSeconds', 1) + source('hammer_of_devotion', 'cooldownAddSeconds', 1));
    assert.equal(hammer.manaCost, 18.75);
    assert.equal(hammer.damage, 90);
    assert.equal(hammer.speed, 560);
    assert.equal(heal.cleanse, true);
    assert.equal(heal.cooldown, source('lay_on_hands', 'cooldownSeconds', 1) + source('cleansing_touch', 'cooldownAddSeconds', 1));
    assert.equal(heal.manaCost, 30);
    assert.equal(heal.heal, 60);
    assert.deepEqual(heal.regenBuff, {duration: 4, multiplier: 2});
    assert.deepEqual(heal.undead, {rank, damage: source('turn_undead', 'pureDamage', rank), damageType: 'pure', radius: 96});
  }
});

test('Banner calculation reads all source rank values and keeps placement timing distinct from lifetime', () => {
  for (let rank = 1; rank <= rows.get('battle_banner').upgradeCosts.length; rank++) {
    const banner = calculate({battle_banner: rank}).actions.battle_banner;
    assert.equal(banner.manaCost, source('battle_banner', 'manaCost', rank));
    assert.equal(banner.cooldown, source('battle_banner', 'cooldownSeconds', rank));
    assert.equal(banner.buffDuration, source('battle_banner', 'durationSeconds', rank));
    assert.equal(banner.damageMultiplier, 1 + source('battle_banner', 'damageIncreasePercent', rank) / 100);
    assert.equal(banner.attackSpeedMultiplier, 1 + source('battle_banner', 'attackSpeedIncreasePercent', rank) / 100);
    assert.equal(banner.damageTakenMultiplier, 1);
    assert.equal(banner.castSpeedMultiplier, 1);
    assert.equal(banner.manaCostMultiplier, 1);
    assert.equal(banner.duration, tidy(0.52 / 1.2));
    assert.equal(banner.contact, tidy(banner.duration * 0.44));
    assert.equal(banner.radius, 128);
    assert.equal(banner.staminaCost, 0);
    assert.equal(banner.damage, 0);
  }
  const fast = calculate({battle_banner: 1}, {castSpeed: 100}).actions.battle_banner;
  assert.equal(fast.duration, 0.3);
  assert.equal(fast.contact, 0.132);
  assert.equal(fast.buffDuration, 15);
  assert.equal(fast.cooldown, 30);
});

test('Banner support calculations cover each branch rank without applying an aura to permanent stats', () => {
  for (const id of ['banner_of_protection', 'banner_of_zeal']) {
    for (let rank = 1; rank <= rows.get(id).upgradeCosts.length; rank++) {
      const stats = calculate({battle_banner: 1, [id]: rank}), banner = stats.actions.battle_banner;
      assert.equal(stats.castSpeed, 1.2);
      assert.equal(stats.physicalDamage, 46);
      assert.equal(banner.manaCost, 40, 'No first-placement self discount');
      assert.equal(banner.damageTakenMultiplier, id === 'banner_of_protection' ? tidy(1 + source(id, 'damageTakenChangePercent', rank) / 100) : 1);
      assert.equal(banner.castSpeedMultiplier, id === 'banner_of_zeal' ? tidy(1 + source(id, 'castSpeedIncreasePercent', rank) / 100) : 1);
      assert.equal(banner.manaCostMultiplier, id === 'banner_of_zeal' ? tidy(1 + source(id, 'manaCostChangePercent', rank) / 100) : 1);
      assert.equal(stats.actions.lay_on_hands.manaCost, 30);
    }
  }
});

test('Onslaught calculation covers every rank, Shield and Grace budget without double-discounting block cost', () => {
  for (let rank = 1; rank <= rows.get('zealous_onslaught').upgradeCosts.length; rank++) {
    for (const shield of [0, 1]) for (let grace = 0; grace <= rows.get('armored_grace').upgradeCosts.length; grace++) {
      const graceMultiplier = grace ? tidy(1 + source('armored_grace', 'staminaCostChangePercent', grace) / 100) : 1;
      const skills = {zealous_onslaught: rank, ...(shield ? {zealous_shield: 1} : {})};
      const raw = source('zealous_onslaught', 'staminaCost', rank);
      const increase = shield ? 1 + source('zealous_shield', 'staminaCostIncreasePercent', 1) / 100 : 1;
      const stats = calculate(skills, {staminaCostMultiplier: graceMultiplier}, true);
      const onslaught = stats.actions.zealous_onslaught;
      assert.equal(onslaught.staminaCost, tidy(raw * increase * graceMultiplier));
      assert.equal(onslaught.fullChannelStaminaCost, tidy(onslaught.staminaCost * 4));
      assert.equal(stats.actions.shield_block.staminaCost, tidy(6 * graceMultiplier));
      assert.equal(onslaught.manaCost, 0);
      assert.equal(onslaught.recurringManaCost, 0);
      assert.equal(onslaught.guard, !!shield);
      assert.equal(onslaught.maxPayments, 4);
      assert.equal(onslaught.maxPulses, 16);
      assert.equal(onslaught.paymentInterval, 1);
      assert.equal(onslaught.tickSeconds, 0.25);
      assert.equal(onslaught.channelDuration, source('zealous_onslaught', 'maxChannelSeconds', rank));
      assert.equal(onslaught.cooldown, source('zealous_onslaught', 'cooldownSeconds', rank));
      assert.equal(onslaught.suspendStaminaRegen, true);
    }
  }
});

test('Onslaught calculation interprets source DPS once, uses fixed corridor and cast-speed startup floor', () => {
  for (let rank = 1; rank <= rows.get('zealous_onslaught').upgradeCosts.length; rank++) {
    const onslaught = calculate({zealous_onslaught: rank}, {castSpeed: 100, spellPower: 7}).actions.zealous_onslaught;
    assert.equal(onslaught.damage, tidy(source('zealous_onslaught', 'physicalDamage', rank) * 0.25 * 1.15));
    assert.equal(onslaught.duration, 0.18);
    assert.equal(onslaught.contact, 0.18);
    assert.equal(onslaught.speed, 90);
    assert.equal(onslaught.range, 80);
    assert.equal(onslaught.halfWidth, 18);
    assert.equal(onslaught.armorPenetration, 8);
    assert.equal(onslaught.exitRecovery, 0.18);
    assert.equal(onslaught.lance, null);
  }
});

test('Lance calculation splits each source rank before physical-only multiplication and preserves inherited costs', () => {
  for (let rank = 1; rank <= rows.get('zealous_lance').upgradeCosts.length; rank++) {
    const onslaught = calculate({zealous_onslaught: 1, zealous_lance: rank, zealous_shield: 1}).actions.zealous_onslaught;
    assert.deepEqual(onslaught.lance, {
      rank, physicalDamage: tidy(source('zealous_lance', 'damage', rank) * 0.5 * 1.15),
      fireDamage: source('zealous_lance', 'damage', rank) * 0.5,
      armorPenetration: 8, range: 180, arcRadians: Math.PI / 3, fullPowerPulses: 4
    });
    assert.equal(onslaught.manaCost, 0);
    assert.equal(onslaught.staminaCost, 11.25);
    assert.equal(onslaught.cooldown, 10);
  }
});

test('Inner Flame and Flaming Wrath calculations map all source ranks without permanent buff application', () => {
  for (let rank = 1; rank <= rows.get('inner_flame').upgradeCosts.length; rank++) {
    const stats = calculate({inner_flame: rank});
    assert.deepEqual(stats.innerFlame, {rank, duration: source('inner_flame', 'durationSeconds', rank), fireDamageMultiplier: tidy(1 + source('inner_flame', 'fireDamageIncreasePercent', rank) / 100), fireResistanceBonus: source('inner_flame', 'fireResistanceIncreasePercent', rank)});
    assert.equal(stats.resistances.fire, 0);
    assert.equal(stats.criticalChance, 0.05);
  }
  for (let rank = 1; rank <= rows.get('flaming_wrath').upgradeCosts.length; rank++) {
    const stats = calculate({inner_flame: 1, flaming_wrath: rank});
    assert.deepEqual(stats.flamingWrath, {rank, spellCriticalChanceBonus: source('flaming_wrath', 'spellCritChanceBonusPercent', rank) / 100, damage: source('flaming_wrath', 'fireDamage', rank), damageType: 'fire', radius: 64, cooldown: source('flaming_wrath', 'effectCooldownSeconds', rank)});
    assert.equal(stats.criticalChance, 0.05, 'Do not give spell critical bonus to mace');
  }
});

test('Lawbringer, Punish and Guilt calculations map every rank using mainhand once and keeping predicates separate', () => {
  for (let rank = 1; rank <= rows.get('lawbringer').upgradeCosts.length; rank++) {
    const stats = calculate({lawbringer: rank, punish_the_wicked: rank, guilt_by_association: rank});
    assert.deepEqual(stats.lawbringer, {rank, chance: source('lawbringer', 'chancePercent', rank) / 100, duration: 2});
    assert.equal(stats.punishMultiplier, tidy(1 + source('punish_the_wicked', 'damageIncreasePercent', rank) / 100));
    assert.deepEqual(stats.guilt, {rank, damage: tidy(46 * source('guilt_by_association', 'mainhandDamagePercent', rank) / 100), damageType: 'physical', radius: 80, cooldown: source('guilt_by_association', 'effectCooldownSeconds', rank), armorPenetration: 8});
    assert.notEqual(stats.guilt.damage, 69 * source('guilt_by_association', 'mainhandDamagePercent', rank) / 100, 'Do not derive splash from rank-scaled mace');
    assert.equal(stats.actions.mace_swing.damage, 69, 'Live target condition must not alter permanent action damage');
  }
});

test('All fifteen Expert calculations have detached preview projections; unsupported Master remains unmapped', () => {
  const expertRows = WARRIOR_REFERENCE.skills.filter(row => row.tier === 'expert');
  assert.equal(expertRows.length, 15);
  for (const row of expertRows) for (let rank = 1; rank <= row.upgradeCosts.length; rank++) {
    const skills = {battle_banner: 1, zealous_onslaught: 1, inner_flame: 1, lawbringer: 1, [row.id]: rank};
    const stats = calculate(skills, {}, true), before = structuredClone(stats);
    const preview = expertPreview(row.id, stats);
    assert.ok(preview && typeof preview === 'object', `${row.id} rank ${rank}`);
    preview.testMutation = true;
    for (const value of Object.values(preview)) if (value && typeof value === 'object') value.testMutation = true;
    assert.deepEqual(stats, before);
  }
  for (const row of WARRIOR_REFERENCE.skills.filter(row => row.tier === 'master')) assert.equal(expertPreview(row.id, calculate()), null);
});

test('Unlearned parent actions and passives do not acquire orphan effects in calculation fixtures', () => {
  const stats = baseStats();
  for (const id of ['mace_swing', 'righteous_hammer', 'lay_on_hands']) stats.actions[id] = {learned: false};
  applyExpertStats(stats, {skills: {flames_of_devotion: 1, hammer_of_devotion: 1, cleansing_touch: 1, turn_undead: 1, banner_of_zeal: 1, zealous_lance: 1, zealous_shield: 1, flaming_wrath: 1, punish_the_wicked: 1, guilt_by_association: 1}});
  for (const id of ['mace_swing', 'righteous_hammer', 'lay_on_hands', 'battle_banner', 'zealous_onslaught']) assert.deepEqual(stats.actions[id], {learned: false});
  assert.equal(stats.flamingWrath, null);
  assert.equal(stats.punishMultiplier, 1);
  assert.equal(stats.guilt, null);
});

test('Known-row calculation rejects malformed ranks rather than admitting undefined/NaN coefficients', () => {
  for (const invalid of [0.5, -1, 99, '1', NaN, Infinity]) {
    assert.throws(() => calculate({zealous_onslaught: invalid}), /Invalid reference rank/);
  }
});
