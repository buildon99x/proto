import test from 'node:test';
import assert from 'node:assert/strict';
import {WARRIOR_REFERENCE, validateWarriorReference} from '../src/campaign/reference-warrior.js';

const copy = () => structuredClone(WARRIOR_REFERENCE);
const skill = (id, catalog = WARRIOR_REFERENCE) => catalog.skills.find(row => row.id === id);
const ids = rows => rows.map(row => row.id).sort();
const fails = (catalog, pattern) => {
  const result = validateWarriorReference(catalog);
  assert.equal(result.ok, false);
  assert(result.errors.some(error => pattern.test(error)), result.errors.join('\n'));
};

test('the reference is the 2023 Paladin mapped to the single Emberwatch warrior class', () => {
  assert.equal(WARRIOR_REFERENCE.classId, 'warrior');
  assert.equal(WARRIOR_REFERENCE.referenceClassId, 'paladin');
  assert.equal(WARRIOR_REFERENCE.referenceGame, 'Hammerwatch II');
  assert.equal(WARRIOR_REFERENCE.referenceReleaseYear, 2023);
  assert.equal(WARRIOR_REFERENCE.implementationStatus, 'reference_only');
  assert.deepEqual(validateWarriorReference(), {ok: true, errors: []});
});

test('all four tiers retain their four complete base abilities', () => {
  const expected = {
    apprentice: ['shield_charge', 'mace_swing', 'shield_block', 'righteous_hammer'],
    adept: ['lay_on_hands', 'judgement', 'shining_knight', 'towering_strength'],
    expert: ['battle_banner', 'zealous_onslaught', 'inner_flame', 'lawbringer'],
    master: ['pillar_of_light', 'blessed_champion', 'crusader', 'guardian_angel']
  };
  assert.deepEqual(WARRIOR_REFERENCE.tiers, Object.keys(expected));
  for (const [tier, expectedIds] of Object.entries(expected)) {
    assert.deepEqual(ids(WARRIOR_REFERENCE.skills.filter(row => row.tier === tier && row.baseId === null)), expectedIds.sort());
  }
});

test('all 37 augmentation nodes are retained under their source base abilities', () => {
  const expected = {
    shield_charge: ['armored_assault', 'charge_through'],
    mace_swing: ['stunning_strikes', 'crushing_blows', 'flames_of_devotion'],
    shield_block: ['shield_training', 'elemental_bulwark', 'shield_of_thorns'],
    righteous_hammer: ['hammer_of_wrath', 'hammer_of_sundering', 'hammer_of_devotion'],
    lay_on_hands: ['invigorating_touch', 'cleansing_touch', 'turn_undead'],
    judgement: ['trial_by_fire', 'shackles'],
    shining_knight: ['armor_of_faith', 'armored_grace'],
    towering_strength: ['battering_ram', 'crushing_might', 'superb_constitution'],
    battle_banner: ['banner_of_protection', 'banner_of_zeal'],
    zealous_onslaught: ['zealous_lance', 'zealous_shield'],
    inner_flame: ['flaming_wrath', 'healing_flames'],
    lawbringer: ['punish_the_wicked', 'guilt_by_association'],
    pillar_of_light: ['pulsing_light', 'heavens_wrath'],
    blessed_champion: ['champion_of_truth', 'champions_hammer'],
    crusader: ['dauntless', 'zealot'],
    guardian_angel: ['true_restoration', 'wrathful_avenger']
  };
  assert.equal(WARRIOR_REFERENCE.skills.length, 53);
  assert.equal(WARRIOR_REFERENCE.skills.filter(row => row.type === 'augment').length, 37);
  for (const [baseId, expectedIds] of Object.entries(expected)) {
    assert.deepEqual(ids(WARRIOR_REFERENCE.skills.filter(row => row.baseId === baseId)), expectedIds.sort());
  }
});

test('cached evidence cannot be mistaken for measured or current-build verification', () => {
  assert.equal(WARRIOR_REFERENCE.evidenceStatus, 'cached_reference_not_measured');
  for (const row of WARRIOR_REFERENCE.skills) {
    assert.equal(row.source.kind, 'wiki_cached');
    assert.equal(row.source.accessMethod, 'search_cached_page');
    assert.equal(row.source.url, 'https://wiki.hammerwatch2.com/Paladin');
    assert.equal(row.source.accessedAt, '2026-10-08');
    assert.equal(row.source.reportedCrawlAge, '2.3 years');
    assert.equal(row.source.gameVersion, null);
    assert.equal(row.source.measured, false);
    assert.equal(row.source.currentVerified, false);
    assert.equal(row.source.section, row.referenceName);
    assert.match(row.displayName, /[가-힣]/);
    assert.equal(row.implementationStatus, 'reference_only');
  }
});

test('initial four actions preserve distinct source costs and scaling', () => {
  assert.deepEqual(['shield_charge', 'mace_swing', 'shield_block', 'righteous_hammer'].map(id => skill(id).type), ['dash', 'mainhand', 'offhand', 'spell']);
  assert.deepEqual(skill('shield_charge').rankValues.staminaCost, [10, 12, 14, 16, 18]);
  assert.deepEqual(skill('shield_charge').rankValues.cooldownSeconds, [3, 2.5, 2, 1.5, 1]);
  assert.deepEqual(skill('mace_swing').rankValues.mainhandDamagePercent, [100, 120, 140, 160, 180, 200]);
  assert.equal(skill('mace_swing').rankValues.cooldownSeconds, 0.1);
  assert.equal(skill('shield_block').rankValues.passivePhysicalBlockChancePercent, 25);
  assert.deepEqual(skill('shield_block').rankValues.passivePhysicalBlockAmount, [25, 50, 75, 100]);
  assert.deepEqual(skill('righteous_hammer').upgradeCosts, [0, 2, 3, 4, 5]);
  assert.deepEqual(skill('righteous_hammer').rankValues.physicalDamage, [30, 45, 65, 90, 120]);
  assert.deepEqual(skill('righteous_hammer').rankValues.manaCost, [15, 20, 25, 30, 35]);
});

test('only source-backed pairs gain exclusivity and Banner uses the official correction', () => {
  const groups = {};
  for (const row of WARRIOR_REFERENCE.skills) if (row.exclusiveGroup) (groups[row.exclusiveGroup] ??= []).push(row.id);
  assert.deepEqual(groups, {
    righteous_hammer_damage_type: ['hammer_of_wrath', 'hammer_of_sundering'],
    battle_banner_support: ['banner_of_protection', 'banner_of_zeal'],
    pillar_of_light_effect: ['pulsing_light', 'heavens_wrath']
  });
  for (const id of groups.battle_banner_support) {
    assert.equal(skill(id).exclusiveSource.kind, 'official');
    assert.equal(skill(id).exclusiveSource.publishedAt, '2023-09-19');
    assert.equal(skill(id).exclusiveSource.url, 'https://maximument.com/news/hwiipatchnotes/');
  }
  assert.equal(skill('stunning_strikes').exclusiveGroup, null);
  assert(skill('stunning_strikes').unknown.some(entry => entry.field === 'exclusiveGroup'));
  const broken = copy(); skill('banner_of_zeal', broken).exclusiveGroup = null;
  fails(broken, /Invalid exclusive group/);
  const unsupported = copy(); skill('banner_of_zeal', unsupported).exclusiveSource = null;
  fails(unsupported, /Unsupported exclusivity/);
});

test('Champion of Truth retains the 3-cost/2-value discrepancy without inventing rank mapping', () => {
  const row = skill('champion_of_truth');
  assert.deepEqual(row.upgradeCosts, [4, 5, 6]);
  assert.equal(row.rankValues.attackCritChancePercent, null);
  assert.deepEqual(row.sourceRows.attackCritChancePercent, [25, 50]);
  assert.deepEqual(row.tableDiscrepancies, [{field: 'attackCritChancePercent', costCount: 3, valueCount: 2, rankMapping: null}]);
  for (const guessed of [[25, 50, 75], [25, 50], [25, 50, null], 25]) {
    const broken = copy(); skill('champion_of_truth', broken).rankValues.attackCritChancePercent = guessed;
    fails(broken, /Unknown field was promoted|source discrepancy was promoted/);
  }
});

test('section-only tier placement remains explicitly provisional', () => {
  assert.deepEqual(ids(WARRIOR_REFERENCE.skills.filter(row => row.tierEvidence === 'section_only')), ['battering_ram', 'crushing_might', 'superb_constitution']);
  for (const id of ['battering_ram', 'crushing_might', 'superb_constitution']) {
    assert.equal(skill(id).tier, 'adept');
    assert(skill(id).unknown.some(entry => entry.field === 'tier'));
  }
  const broken = copy(); skill('battering_ram', broken).unknown = skill('battering_ram', broken).unknown.filter(entry => entry.field !== 'tier');
  fails(broken, /Provisional tier/);
});

test('unverified promotions and base ranks cannot become invented purchase rules', () => {
  assert.equal(WARRIOR_REFERENCE.promotionRequirements, null);
  for (const row of WARRIOR_REFERENCE.skills) {
    assert.equal(row.purchaseRequirements, null);
    if (row.type === 'augment') assert.deepEqual(row.requires.map(entry => [entry.skillId, entry.rank]), [[row.baseId, null]]);
  }
  const promotion = copy(); promotion.promotionRequirements = {adept: {level: 5, questRequired: false}};
  fails(promotion, /Promotion requirements remain unknown/);
  const guessedRank = copy(); skill('armored_assault', guessedRank).requires[0].rank = 1;
  fails(guessedRank, /Unsupported prerequisite rank/);
  const guessedPurchase = copy(); skill('shield_charge', guessedPurchase).purchaseRequirements = [];
  fails(guessedPurchase, /Unsupported purchase requirements/);
});

test('unpublished costs, timing and geometry remain null rather than free or instantaneous', () => {
  assert.equal(skill('shield_block').rankValues.activeStaminaCost, null);
  assert.equal(skill('shield_block').rankValues.activeBlockAmount, null);
  assert.equal(skill('mace_swing').rankValues.staminaCost, null);
  assert.equal(skill('shield_charge').rankValues.range, null);
  assert.equal(skill('righteous_hammer').rankValues.castTimeSeconds, null);
  assert.equal(skill('guardian_angel').rankValues.damageWindowSeconds, null);
  const guessed = copy(); skill('shield_charge', guessed).rankValues.range = 0;
  fails(guessed, /Unknown field was promoted/);
});

test('Zealous Onslaught keeps the source spell type and stamina row without inventing drain frequency', () => {
  const row = skill('zealous_onslaught');
  assert.equal(row.type, 'spell');
  assert.deepEqual(row.rankValues.staminaCost, [9, 11, 13, 15]);
  assert.equal(row.rankValues.manaCost, null);
  assert.equal(row.rankValues.staminaCostIntervalSeconds, null);
  assert.equal(row.rankValues.maxChannelSeconds, 4);
  assert.equal(row.rankValues.damageTickSeconds, null);
});

test('malformed rows, missing evidence, dangling bases and arity changes fail validation', () => {
  assert.equal(validateWarriorReference(null).ok, false);
  const noSource = copy(); delete skill('guardian_angel', noSource).source;
  fails(noSource, /Missing skill source/);
  const noTier = copy(); noTier.skills = noTier.skills.filter(row => row.tier !== 'master');
  fails(noTier, /Expected four base skills in master/);
  const badCost = copy(); skill('mace_swing', badCost).upgradeCosts[2] = -1;
  fails(badCost, /Invalid upgrade costs/);
  const badValue = copy(); skill('mace_swing', badValue).rankValues.cooldownSeconds = NaN;
  fails(badValue, /Invalid rank value/);
  const badArity = copy(); skill('mace_swing', badArity).rankValues.mainhandDamagePercent.pop();
  fails(badArity, /rank arity/);
  const badBase = copy(); skill('armored_assault', badBase).baseId = 'unknown';
  fails(badBase, /Invalid augmentation base/);
  const duplicate = copy(); duplicate.skills.push(structuredClone(duplicate.skills[0]));
  fails(duplicate, /duplicate skill ID/);
  for (const field of ['requires', 'unknown', 'tableDiscrepancies']) {
    const malformed = copy(); skill('armored_assault', malformed)[field] = {};
    assert.equal(validateWarriorReference(malformed).ok, false);
  }
});

test('reference data is deeply immutable and JSON serializable', () => {
  assert(Object.isFrozen(WARRIOR_REFERENCE));
  assert(Object.isFrozen(skill('shield_charge').rankValues.staminaCost));
  assert(Object.isFrozen(skill('banner_of_zeal').exclusiveSource));
  assert.throws(() => {skill('shield_charge').rankValues.staminaCost[0] = 0;}, TypeError);
  assert.deepEqual(JSON.parse(JSON.stringify(WARRIOR_REFERENCE)), copy());
});
