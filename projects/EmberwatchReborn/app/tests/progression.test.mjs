import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CORE_REFERENCE } from '../src/reference-core.js';
import { WARRIOR_REFERENCE } from '../src/reference-warrior.js';
import { PROGRESSION_BALANCE } from '../src/progression-balance.js';
import { createCharacter, xpForLevel, grantExperience, allocateAttribute, experienceMultiplier, validateCharacter } from '../src/progression.js';

// These are deterministic handler tests, not ordinary-input or earned-campaign
// evidence. Positive fixtures advance through the real XP handler; malformed
// fixtures intentionally alter fields only to test rejection.
const copy = value => structuredClone(value);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function totalToLevel(level) {
  let xp = 0;
  for (let from = 1; from < level; from++) xp += xpForLevel(from);
  return xp;
}
function atLevel(level) {
  const result = grantExperience(createCharacter(), totalToLevel(level));
  assert.equal(result.ok, true);
  assert.equal(result.character.level, level);
  return result.character;
}
function unchangedFailure(handler, character, ...args) {
  const before = copy(character);
  const result = handler(freeze(character), ...args);
  assert.equal(result.ok, false);
  assert.equal(typeof result.code, 'string');
  assert.equal(typeof result.reason, 'string');
  assert.equal(Object.hasOwn(result, 'character'), false);
  assert.deepEqual(character, before);
  return result;
}

test('new Warrior preserves the original character shape plus residual XP and learns no runtime skill', () => {
  const a = createCharacter(), b = createCharacter();
  assert.deepEqual(a, {
    classId: 'warrior', level: 1, tier: 'apprentice', xp: 0,
    attributes: { strength: 0, dexterity: 0, intelligence: 0 },
    attributePoints: 0, skillPoints: 0, skills: {}, exclusiveBranches: {},
    equipment: { mainHand: null, offHand: null, head: null, chest: null, hands: null, feet: null, accessory: null }
  });
  assert.deepEqual(validateCharacter(a), { ok: true });
  a.attributes.strength = 1; a.skills.example = 1; a.equipment.head = 'changed';
  assert.equal(b.attributes.strength, 0);
  assert.deepEqual(b.skills, {});
  assert.equal(b.equipment.head, null);
});

test('copied reference catalogs are byte-identical by baseline SHA and retain unknown facts', () => {
  for (const [file, hash] of [
    ['reference-core.js', '04804f94aa38999f5e0af98094196394d703a3be4c3593d9338a3bc13bc8eb04'],
    ['reference-warrior.js', '1fb06923bbf69a33e80593a734f86b39d22ef7cd1f260b9d5b0be9a15261d549']
  ]) assert.equal(createHash('sha256').update(readFileSync(new URL('../src/' + file, import.meta.url))).digest('hex'), hash);
  assert.equal(CORE_REFERENCE.unknown.experienceCurve.value, null);
  assert.equal(CORE_REFERENCE.unknown.experienceCurve.status, 'UNKNOWN');
  assert.equal(WARRIOR_REFERENCE.skills.length, 53);
  assert.ok(WARRIOR_REFERENCE.skills.every(skill => skill.implementationStatus === 'reference_only'));
  assert.equal(WARRIOR_REFERENCE.skills.find(skill => skill.id === 'champion_of_truth').rankValues.attackCritChancePercent, null);
});

test('the immutable authored XP bands cover every level once without pretending to be reference values', () => {
  assert.equal(PROGRESSION_BALANCE.origin, 'emberwatch_authored_adjustment');
  assert.equal(PROGRESSION_BALANCE.referenceStatus, 'UNKNOWN');
  assert.ok(Object.isFrozen(PROGRESSION_BALANCE));
  assert.ok(Object.isFrozen(PROGRESSION_BALANCE.xpBands));
  assert.ok(PROGRESSION_BALANCE.xpBands.every(Object.isFrozen));
  for (let level = 1; level < 50; level++) {
    assert.ok(Number.isSafeInteger(xpForLevel(level)));
    if (level > 1) assert.ok(xpForLevel(level) > xpForLevel(level - 1));
    assert.equal(PROGRESSION_BALANCE.xpBands.filter(b => level >= b.from && level <= b.to).length, 1);
  }
  assert.deepEqual([1,4,5,14,15,29,30,49].map(xpForLevel), [100,250,300,660,720,1560,1650,3360]);
  assert.deepEqual([5,15,30,50].map(totalToLevel), [700,5500,22600,72700]);
});

test('XP query rejects invalid levels and returns null at the cap instead of a zero-cost level', () => {
  for (const level of [0,-1,1.5,50,51,NaN,Infinity,-Infinity,'5',true,null,undefined,{},[],Number.MAX_SAFE_INTEGER]) {
    assert.equal(xpForLevel(level), null);
  }
});

test('one micro-XP below a threshold does not level up; exact completion grants points once', () => {
  const initial = freeze(createCharacter());
  const almost = grantExperience(initial, 99.999999);
  assert.equal(almost.ok, true);
  assert.equal(almost.character.level, 1);
  assert.equal(almost.character.xp, 99.999999);
  const result = grantExperience(freeze(almost.character), 0.000001);
  assert.equal(result.ok, true);
  assert.equal(result.character.level, 2);
  assert.equal(result.character.xp, 0);
  assert.deepEqual(result.granted, { attributePoints: 5, skillPoints: 3 });
  assert.equal(result.gainedLevels, 1);
  assert.equal(initial.attributePoints, 0);
});

test('multi-level grants use each earned-level point band and preserve residual XP', () => {
  const initial = freeze(createCharacter());
  const result = grantExperience(initial, 500);
  assert.equal(result.ok, true);
  assert.equal(result.character.level, 4);
  assert.equal(result.character.xp, 50);
  assert.equal(result.character.tier, 'apprentice');
  assert.equal(result.gainedLevels, 3);
  assert.deepEqual(result.granted, { attributePoints: 15, skillPoints: 9 });
  assert.equal(result.appliedXp, 500);
  assert.equal(result.discardedXp, 0);
});

test('all point-band boundaries use the entered level, including L50', () => {
  for (const [from, expected] of [[4,4],[14,5],[29,6],[49,6]]) {
    let c = atLevel(from);
    const allocation = allocateAttribute(c, 'strength', 1);
    assert.equal(allocation.ok, true);
    c = grantExperience(allocation.character, 0.075).character;
    const before = freeze(copy(c));
    const result = grantExperience(c, xpForLevel(from) - 0.075);
    assert.equal(result.ok, true);
    assert.equal(result.character.level, from + 1);
    assert.equal(result.character.xp, 0);
    assert.deepEqual(result.granted, { attributePoints: 5, skillPoints: expected });
    assert.equal(result.character.attributes.strength, 1);
    assert.equal(result.character.attributePoints, before.attributePoints + 5);
    assert.equal(result.character.skillPoints, before.skillPoints + expected);
    assert.equal(result.character.tier, 'apprentice');
    assert.deepEqual(c, before);
  }
});

test('one grant to the cap yields exactly +245 attribute and +250 skill points with explicit excess', () => {
  const result = grantExperience(freeze(createCharacter()), Number.MAX_SAFE_INTEGER);
  assert.equal(result.ok, true);
  assert.equal(result.character.level, 50);
  assert.equal(result.character.xp, 0);
  assert.equal(result.character.tier, 'apprentice');
  assert.deepEqual(result.character.skills, {});
  assert.deepEqual(result.granted, { attributePoints: 245, skillPoints: 250 });
  assert.equal(result.gainedLevels, 49);
  assert.equal(result.appliedXp, 72700);
  assert.equal(result.discardedXp, Number.MAX_SAFE_INTEGER - 72700);
  assert.deepEqual(validateCharacter(result.character), { ok: true });
});

test('cap grants, zero grants and repeat queries never duplicate level points', () => {
  const capped = freeze(atLevel(50));
  for (const amount of [0,0.075,10,Number.MAX_SAFE_INTEGER]) {
    const result = grantExperience(capped, amount);
    assert.equal(result.ok, true);
    assert.deepEqual(result.character, capped);
    assert.notEqual(result.character, capped);
    assert.equal(result.appliedXp, 0);
    assert.equal(result.discardedXp, amount);
    assert.equal(result.gainedLevels, 0);
    assert.deepEqual(result.granted, { attributePoints: 0, skillPoints: 0 });
  }
  const c = freeze(atLevel(15)), first = grantExperience(c, 0), second = grantExperience(c, 0);
  assert.deepEqual(first, second);
  assert.deepEqual(first.character, c);
  assert.equal(first.character.skillPoints, 54);
});

test('fractional reference awards retain precision over repeated grants and level crossings', () => {
  let c = createCharacter();
  for (let i = 0; i < 4000; i++) {
    const result = grantExperience(c, 1 * experienceMultiplier(30, 'apprentice', 'hard'));
    assert.equal(result.ok, true);
    c = result.character;
  }
  const bulk = grantExperience(createCharacter(), 300);
  assert.deepEqual(c, bulk.character);
  assert.equal(c.level, 3);
  assert.equal(c.xp, 50);
  assert.deepEqual(grantExperience(createCharacter(), 0.1 * 0.75).character.xp, 0.075);
});

test('effective sub-micro XP fails explicitly rather than silently rounding into progress', () => {
  for (const amount of [0.0000001,0.00000049,1.0000001,Number.MIN_VALUE]) {
    assert.equal(unchangedFailure(grantExperience, createCharacter(), amount).code, 'XP_PRECISION');
  }
  const result = grantExperience(createCharacter(), 0.000001);
  assert.equal(result.ok, true);
  assert.equal(result.character.xp, 0.000001);
});

test('remaining XP to the cap is exact even with fractional progress and an overflowing award', () => {
  const c = grantExperience(atLevel(49), 0.075).character;
  const result = grantExperience(freeze(c), 3360);
  assert.equal(result.ok, true);
  assert.equal(result.character.level, 50);
  assert.equal(result.character.xp, 0);
  assert.equal(result.appliedXp, 3359.925);
  assert.ok(Math.abs(result.discardedXp - 0.075) < 1e-9);
  assert.deepEqual(result.granted, { attributePoints: 5, skillPoints: 6 });
});

test('negative, non-finite, coercible and unsafe XP awards fail without changing input', () => {
  for (const amount of [-1,NaN,Infinity,-Infinity,undefined,null,'100',true,false,{},[],Number.MAX_SAFE_INTEGER+1]) {
    assert.equal(unchangedFailure(grantExperience, atLevel(5), amount).code, 'INVALID_XP');
  }
  assert.equal(grantExperience(createCharacter(), -0).ok, true);
});

test('attribute allocation spends real earned points, preserves base/additional separation and is pure', () => {
  const c = freeze(atLevel(5)), before = copy(c);
  const one = allocateAttribute(c, 'strength');
  assert.equal(one.ok, true);
  assert.equal(one.spent, 1);
  assert.equal(one.character.attributes.strength, 1);
  assert.equal(one.character.attributePoints, 19);
  const rest = allocateAttribute(one.character, 'intelligence', 19);
  assert.equal(rest.ok, true);
  assert.deepEqual(rest.character.attributes, { strength: 1, dexterity: 0, intelligence: 19 });
  assert.equal(rest.character.attributePoints, 0);
  assert.deepEqual(c, before);
  assert.equal(CORE_REFERENCE.classes.warrior.baseAttributes.strength, 18);
  assert.equal(unchangedFailure(allocateAttribute, rest.character, 'dexterity').code, 'INSUFFICIENT_POINTS');
});

test('invalid attribute names and amounts fail atomically, including prototype-looking names', () => {
  for (const key of ['health','focus','vitality','__proto__','constructor','toString','Strength',null,undefined,{},[]]) {
    assert.equal(unchangedFailure(allocateAttribute, atLevel(5), key, 1).code, 'INVALID_ALLOCATION');
  }
  for (const amount of [0,-1,0.5,NaN,Infinity,'1',true,null,Number.MAX_SAFE_INTEGER+1]) {
    assert.equal(unchangedFailure(allocateAttribute, atLevel(5), 'strength', amount).code, 'INVALID_ALLOCATION');
  }
  assert.equal(unchangedFailure(allocateAttribute, atLevel(5), 'strength', Number.MAX_SAFE_INTEGER).code, 'INSUFFICIENT_POINTS');
});

test('shared validator rejects malformed character ranges and both mutators reuse it', () => {
  const edits = [
    c => { c.classId = 'mage'; }, c => { c.level = 0; }, c => { c.level = 51; },
    c => { c.level = 1.5; }, c => { c.tier = 'expert'; }, c => { c.tier = 'unknown'; },
    c => { c.xp = -1; }, c => { c.xp = NaN; }, c => { c.xp = Infinity; },
    c => { c.xp = xpForLevel(c.level); }, c => { c.xp = 0.0000001; },
    c => { c.xp = xpForLevel(c.level) - Number.EPSILON * xpForLevel(c.level); },
    c => { c.attributePoints = -1; }, c => { c.attributePoints = 0.5; },
    c => { c.skillPoints = NaN; }, c => { c.skillPoints = -1; },
    c => { c.attributes.strength = -1; }, c => { delete c.attributes.dexterity; },
    c => { c.attributes.focus = 0; }, c => { c.skills = []; },
    c => { c.skills.mace_swing = 0.5; }, c => { c.exclusiveBranches.bad = null; },
    c => { delete c.equipment.head; }, c => { c.equipment.head = {}; }
  ];
  for (const edit of edits) {
    const c = atLevel(5); edit(c);
    const before = copy(c);
    assert.equal(validateCharacter(c).ok, false);
    assert.equal(grantExperience(c, 0).code, 'INVALID_CHARACTER');
    assert.equal(allocateAttribute(c, 'strength', 1).code, 'INVALID_CHARACTER');
    assert.deepEqual(c, before);
  }
  const capped = atLevel(50); capped.xp = 0.075;
  assert.equal(validateCharacter(capped).ok, false);
  for (const c of [null,undefined,0,'character',[],{}]) assert.equal(validateCharacter(c).ok, false);
});

test('point-budget overclaims are rejected while spent points are never reconstructed from level', () => {
  const c = atLevel(5);
  for (const edit of [
    x => { x.attributePoints++; },
    x => { x.attributes.strength = 1; },
    x => { x.skillPoints++; },
    x => { x.attributes.strength = Number.MAX_SAFE_INTEGER; }
  ]) { const bad = copy(c); edit(bad); assert.equal(validateCharacter(bad).ok, false); }
  const spent = copy(c); spent.attributePoints = 0; spent.attributes.strength = 20; spent.skillPoints = 0;
  const zero = grantExperience(freeze(spent), 0);
  assert.equal(zero.ok, true);
  assert.deepEqual(zero.character, spent);
  const next = grantExperience(spent, xpForLevel(spent.level));
  assert.equal(next.character.attributePoints, 5);
  assert.equal(next.character.skillPoints, 4);
  assert.equal(next.character.attributes.strength, 20);
});

test('successful handlers detach nested JSON extension fields instead of aliasing caller state', () => {
  const c = atLevel(2);
  c.extension = { log: [{ kind: 'future-state', values: [1,2] }] };
  const before = copy(c);
  const result = grantExperience(freeze(c), 0);
  result.character.extension.log[0].values.push(3);
  result.character.equipment.head = 'new';
  assert.deepEqual(c, before);
  const allocation = allocateAttribute(c, 'dexterity');
  allocation.character.extension.log[0].values.push(4);
  assert.deepEqual(c, before);
});

test('malformed JSON, cycles and accessors fail without running getters or coercing data', () => {
  const cycle = createCharacter(); cycle.loop = cycle;
  const getter = createCharacter(); let calls = 0;
  Object.defineProperty(getter, 'danger', { enumerable: true, get() { calls++; return 1; } });
  const func = createCharacter(); func.extra = () => 1;
  const date = createCharacter(); date.extra = new Date();
  const hole = createCharacter(); hole.extra = new Array(1);
  const hidden = createCharacter(); Object.defineProperty(hidden, 'extra', { value: 1, enumerable: false });
  const fakeDense = createCharacter(); fakeDense.extra = new Array(1); fakeDense.extra['4294967295'] = 1;
  class HostileArray extends Array { map() { calls++; return this; } }
  const subclass = createCharacter(); subclass.extra = new HostileArray(1, 2);
  for (const c of [cycle,getter,func,date,hole,hidden,fakeDense,subclass]) {
    assert.equal(validateCharacter(c).ok, false);
    assert.equal(grantExperience(c, 1).ok, false);
  }
  assert.equal(calls, 0);
});

test('experience coefficient uses every preserved difficulty and level-tier boundary', () => {
  for (let level = 1; level <= 50; level++) {
    const playerTier = level < 5 ? 0 : level < 15 ? 1 : level < 30 ? 2 : 3;
    for (const [enemy, tier] of CORE_REFERENCE.tiers.entries()) {
      for (const [difficulty, row] of Object.entries(CORE_REFERENCE.difficulty)) {
        assert.equal(experienceMultiplier(level, tier.id, difficulty), CORE_REFERENCE.lowerTierExperience[playerTier][enemy] * row.xp);
      }
    }
  }
  assert.equal(experienceMultiplier(4, 'apprentice'), 1);
  assert.equal(experienceMultiplier(5, 'apprentice'), 0.5);
  assert.ok(Math.abs(experienceMultiplier(15, 'apprentice', 'hard') - 0.15) < 1e-12);
  assert.ok(Math.abs(experienceMultiplier(30, 'apprentice', 'serious') - 0.075) < 1e-12);
  assert.equal(atLevel(30).tier, 'apprentice');
});

test('coefficient queries fail closed for invalid levels, tiers and inherited difficulty properties', () => {
  for (const level of [0,51,NaN,Infinity,1.5,'5',true,null,undefined]) assert.equal(experienceMultiplier(level, 'apprentice'), null);
  for (const tier of ['unknown','constructor','toString','__proto__',null,undefined,{},[]]) assert.equal(experienceMultiplier(5, tier), null);
  for (const difficulty of ['unknown','constructor','toString','__proto__',null,{},[]]) assert.equal(experienceMultiplier(5, 'adept', difficulty), null);
});

test('pure repeated calls are deterministic; reward receipt deduplication is not falsely claimed here', () => {
  const c = freeze(createCharacter());
  const first = grantExperience(c, 100), sameInput = grantExperience(c, 100);
  assert.deepEqual(first, sameInput);
  assert.equal(c.level, 1);
  const distinctSecondAward = grantExperience(first.character, 100);
  assert.equal(distinctSecondAward.character.level, 2);
  assert.equal(distinctSecondAward.character.xp, 100);
  assert.deepEqual(distinctSecondAward.granted, { attributePoints: 0, skillPoints: 0 });
});

