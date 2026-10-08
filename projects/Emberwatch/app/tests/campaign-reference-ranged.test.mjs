import assert from 'node:assert/strict';
import test from 'node:test';
import { MAGE_REFERENCE } from '../src/campaign/reference-mage.js';
import { ARCHER_REFERENCE } from '../src/campaign/reference-archer.js';

const references = [MAGE_REFERENCE, ARCHER_REFERENCE];
const tiers = ['apprentice', 'adept', 'expert', 'master'];
const types = ['dash', 'mainhand', 'offhand', 'spell', 'passive', 'augment'];
const get = (reference, id) => {
  const skill = reference.skills.find(node => node.id === id);
  assert.ok(skill, `${reference.classId}: missing ${id}`);
  return skill;
};

// Independent inventory from the two class-page section/branch headings.
const inventory = {
  mage: {
    apprentice: {
      phase_shift: ['mana_surge', 'mirror_image'],
      arcane_bolt: ['empowered_bolt', 'focused_bolt', 'wand_mastery'],
      arcane_grimoire: ['grimoire_scholar', 'somatic_reservoir'],
      barrier: ['flame_shield', 'ice_block', 'reactive_barrier'],
    },
    adept: {
      arc_lightning: ['overcharge', 'channel_lightning'],
      haste: ['blur', 'energy_surge', 'temporal_shift'],
      arcane_intellect: ['arcane_physique', 'arcane_finesse'],
      elemental_ward: ['control_fire', 'control_ice', 'control_lightning'],
    },
    expert: {
      frost_nova: ['shatter', 'flash_freeze'],
      wall_of_flames: ['volatile_flames', 'wall_of_alteration'],
      incanters_cadence: ['rising_crescendo', 'intensified_intonation', 'alleviating_rhythm'],
      arcanist: ['arcane_safeguard', 'arcane_amplification'],
    },
    master: {
      wizards_duplicate: ['wizards_army', 'improved_duplicate'],
      meteor: ['meteor_shower', 'comet'],
      weaver_of_time: ['prolonged_agony', 'shockwave'],
      elemental_flux: ['fire_ascendency', 'ice_ascendency', 'lightning_ascendency'],
    },
  },
  archer: {
    apprentice: {
      dodge_roll: ['evasive_roll', 'critical_momentum'],
      sword_slash: ['swift_strikes', 'deflect', 'extended_reach'],
      bow_shot: ['piercing_shot', 'overdraw', 'splinter_shot'],
      entangle: ['healing_wisps', 'poison_ivy', 'penetrating_vines'],
    },
    adept: {
      enchanted_arrows: ['frost_arrows', 'shock_arrows', 'multi_shot'],
      wolf_companion: ['protective_bond', 'vicious_bites', 'coordinated_attack'],
      barkskin: ['wild_strength', 'natural_mending'],
      hunter: ['beastslayer', 'big_game_hunter'],
    },
    expert: {
      on_the_prowl: ['hot_pursuit', 'finish_the_kill'],
      wind_weaver: ['winter_winds', 'wind_slash'],
      archers_concentration: ['careful_aim', 'determination'],
      natures_blessing: ['natural_attunement', 'natures_vigor', 'natures_sting'],
    },
    master: {
      rain_of_arrows: ['storm_of_arrows', 'thundercaller'],
      spectral_wolf_pack: ['pack_leader', 'relentless_hunters'],
      wicked_sprouts: ['rampant_growth', 'regrowth'],
      natures_scorn: ['frost_revenant', 'storm_strider'],
    },
  },
};

for (const reference of references) {
  test(`${reference.classId}: complete four-tier base and augmentation inventory`, () => {
    const expected = [];
    for (const [tier, bases] of Object.entries(inventory[reference.classId])) {
      assert.equal(Object.keys(bases).length, 4);
      for (const [baseId, branches] of Object.entries(bases)) {
        const base = get(reference, baseId);
        assert.equal(base.tier, tier);
        assert.equal(base.baseId, null);
        assert.notEqual(base.type, 'augment');
        assert.deepEqual(reference.skills.filter(node => node.baseId === baseId).map(node => node.id).sort(), [...branches].sort());
        expected.push(baseId, ...branches);
      }
    }
    assert.equal(reference.skills.length, 54);
    assert.equal(reference.skills.filter(node => node.type === 'augment').length, 38);
    assert.deepEqual(reference.skills.map(node => node.id).sort(), expected.sort());
  });

  test(`${reference.classId}: source provenance, Korean names, and dependency integrity`, () => {
    assert.equal(reference.referenceClassId, reference.classId === 'mage' ? 'wizard' : 'ranger');
    assert.equal(reference.game, 'Hammerwatch II (2023)');
    assert.equal(reference.catalogStatus, 'reference_only');
    assert.equal(new Set(reference.skills.map(node => node.id)).size, reference.skills.length);
    assert.equal(new Set(reference.skills.map(node => node.displayName)).size, reference.skills.length);
    assert.equal(reference.implementationStage, 'M4_deferred');
    for (const node of reference.skills) {
      assert.match(node.id, /^[a-z][a-z0-9_]*$/);
      assert.match(node.displayName, /[가-힣]/);
      assert.notEqual(node.displayName, node.referenceName);
      assert.ok(tiers.includes(node.tier));
      assert.ok(types.includes(node.type));
      assert.ok(Array.isArray(node.upgradeCosts) && node.upgradeCosts.length > 0);
      assert.ok(node.upgradeCosts.every(cost => cost === null || Number.isInteger(cost) && cost >= 0));
      assert.ok(node.rankValues && typeof node.rankValues === 'object');
      assert.ok(Array.isArray(node.unknown));
      assert.ok(node.unknown.every(value => typeof value === 'string'));
      assert.equal(node.source.kind, 'wiki_cached');
      assert.equal(node.source.currentVersionVerified, false);
      assert.equal(node.source.measured, false);
      assert.equal(node.source.accessedAt, '2026-10-08');
      assert.equal(node.source.url, reference.source.url);
      assert.equal(node.source.section, node.referenceName);
      assert.equal(node.behaviorId, `reference.${reference.classId}.${node.id}`);
      if (node.baseId) {
        assert.equal(node.type, 'augment');
        const base = get(reference, node.baseId);
        assert.ok(tiers.indexOf(node.tier) >= tiers.indexOf(base.tier));
        assert.deepEqual(node.requires[0], {skillId: node.baseId, rank: null, relation: 'augment_base'});
        assert.ok(node.unknown.some(value => value.startsWith('minimumBaseRank:')));
      } else assert.notEqual(node.type, 'augment');
      for (const dependency of node.requires) {
        assert.notEqual(dependency.skillId, node.id);
        const target = get(reference, dependency.skillId);
        assert.ok(dependency.rank === null || Number.isInteger(dependency.rank) && dependency.rank > 0 && dependency.rank <= target.upgradeCosts.length);
        assert.ok(['augment_base', 'effect_dependency'].includes(dependency.relation));
      }
    }
  });

  test(`${reference.classId}: every unequal rank row is explicitly quarantined`, () => {
    for (const node of reference.skills) {
      const actual = [];
      for (const [field, value] of Object.entries(node.rankValues)) {
        for (const cell of Array.isArray(value) ? value : [value]) {
          assert.ok(cell === null || typeof cell === 'string' || typeof cell === 'number' && Number.isFinite(cell), `${node.id}.${field}`);
        }
        if (Array.isArray(value) && value.length !== node.upgradeCosts.length) {
          actual.push({field, costCount: node.upgradeCosts.length, valueCount: value.length, rankAlignment: null});
        }
      }
      assert.deepEqual(node.rankArityDiscrepancies, actual, node.id);
      if (actual.length) assert.ok(node.unknown.some(value => value.startsWith('rankArity:')));
    }
  });

  test(`${reference.classId}: references cannot be mutated into runtime defaults`, () => {
    assert.throws(() => { reference.skills[0].rankValues.cooldownSeconds[0] = 0; }, TypeError);
    assert.throws(() => { reference.skills[0].source.measured = true; }, TypeError);
    assert.throws(() => { reference.skills.push({}); }, TypeError);
  });
}

test('four starting actions preserve class identity, weapon slots and distinct resources', () => {
  const expected = {
    mage: {dash: 'phase_shift', mainhand: 'arcane_bolt', offhand: 'arcane_grimoire', spell: 'barrier'},
    archer: {dash: 'dodge_roll', mainhand: 'sword_slash', offhand: 'bow_shot', spell: 'entangle'},
  };
  for (const reference of references) {
    const starts = reference.skills.filter(node => node.baseId === null && node.tier === 'apprentice');
    assert.deepEqual(Object.fromEntries(starts.map(node => [node.type, node.id])), expected[reference.classId]);
    for (const node of starts) assert.equal(node.upgradeCosts[0], 0);
  }
  assert.deepEqual(get(ARCHER_REFERENCE, 'sword_slash').rankValues.mainhandDamagePercent, [100, 120, 140, 160, 180, 200]);
  assert.deepEqual(get(ARCHER_REFERENCE, 'bow_shot').rankValues.staminaCost, [2, 2, 3, 3, 4, 4]);
  assert.equal(get(ARCHER_REFERENCE, 'bow_shot').rules.weaponSlot, 'offHand');
  assert.equal(get(ARCHER_REFERENCE, 'bow_shot').rankValues.maxChargeSeconds, 0.3);
  assert.deepEqual(get(ARCHER_REFERENCE, 'entangle').rankValues.manaCost, [20, 25, 30, 35, 40]);
  assert.equal(get(MAGE_REFERENCE, 'arcane_grimoire').rules.actionSource, 'equipped_grimoire');
  assert.equal(get(MAGE_REFERENCE, 'arcane_grimoire').rankValues.manaCost, null);
  assert.deepEqual(get(MAGE_REFERENCE, 'barrier').rankValues.damageTakenModifierPercent, [-40, -45, -50]);
});

test('only explicit class-page mutually exclusive pairs become groups', () => {
  const expected = {
    mage: {
      barrier_form: ['flame_shield', 'ice_block', 'reactive_barrier'],
      arcane_attribute: ['arcane_finesse', 'arcane_physique'],
      flame_wall_form: ['volatile_flames', 'wall_of_alteration'],
      duplicate_form: ['improved_duplicate', 'wizards_army'],
      elemental_ascendency: ['fire_ascendency', 'ice_ascendency', 'lightning_ascendency'],
    },
    archer: {
      entangle_form: ['healing_wisps', 'poison_ivy'],
      enchanted_arrow_element: ['frost_arrows', 'shock_arrows'],
    },
  };
  for (const reference of references) {
    const actual = {};
    for (const node of reference.skills) {
      if (node.exclusiveGroup) (actual[node.exclusiveGroup] ??= []).push(node.id);
    }
    for (const nodes of Object.values(actual)) nodes.sort();
    assert.deepEqual(actual, expected[reference.classId]);
  }
  for (const id of ['empowered_bolt', 'focused_bolt', 'control_fire', 'control_ice', 'control_lightning', 'meteor_shower', 'comet']) {
    assert.equal(Object.hasOwn(get(MAGE_REFERENCE, id), 'exclusiveGroup'), false);
  }
  assert.equal(Object.hasOwn(get(ARCHER_REFERENCE, 'penetrating_vines'), 'exclusiveGroup'), false);
});

test('cross-tier branches keep their own sourced tier and effect prerequisites', () => {
  for (const [id, tier] of [['mana_surge', 'adept'], ['mirror_image', 'expert'], ['wand_mastery', 'master'], ['wall_of_alteration', 'master']]) {
    assert.equal(get(MAGE_REFERENCE, id).tier, tier);
  }
  for (const [id, tier] of [['overdraw', 'adept'], ['multi_shot', 'expert'], ['finish_the_kill', 'master'], ['determination', 'master']]) {
    assert.equal(get(ARCHER_REFERENCE, id).tier, tier);
  }
  for (const [id, skillId] of [['fire_ascendency', 'wall_of_flames'], ['ice_ascendency', 'frost_nova'], ['lightning_ascendency', 'arc_lightning']]) {
    assert.deepEqual(get(MAGE_REFERENCE, id).requires[1], {skillId, rank: 1, relation: 'effect_dependency'});
  }
  assert.deepEqual(get(ARCHER_REFERENCE, 'pack_leader').requires[1], {skillId: 'wolf_companion', rank: null, relation: 'effect_dependency'});
  assert.equal(get(ARCHER_REFERENCE, 'regrowth').requires.some(entry => entry.skillId === 'entangle'), false);
});

test('known damaged wiki rows stay unresolved instead of becoming invented ranks', () => {
  const reservoir = get(MAGE_REFERENCE, 'somatic_reservoir');
  assert.deepEqual(reservoir.upgradeCosts, [2, 3]);
  assert.deepEqual(reservoir.rankValues.manaThresholdPercent, [30, 40, 50]);
  assert.equal(reservoir.rankValues.staminaConversionRate, null);
  for (const id of ['control_fire', 'control_ice', 'control_lightning']) {
    assert.deepEqual(get(MAGE_REFERENCE, id).upgradeCosts, [2, 3, 4]);
    assert.deepEqual(get(MAGE_REFERENCE, id).rankValues.conversionRate, [0.5, 1]);
    assert.equal(get(MAGE_REFERENCE, id).rankArityDiscrepancies[0].rankAlignment, null);
  }
  assert.equal(MAGE_REFERENCE.skills.filter(node => node.rankArityDiscrepancies.length).length, 4);
  assert.equal(ARCHER_REFERENCE.skills.filter(node => node.rankArityDiscrepancies.length).length, 0);
});

test('recovered high-tier rows do not imply timing, damage-split or current-build verification', () => {
  const meteor = get(MAGE_REFERENCE, 'meteor');
  assert.deepEqual(meteor.rankValues.damage, [400, 500, 600]);
  assert.deepEqual(meteor.rankValues.damagePerLevel, [2, 4, 6]);
  assert.deepEqual(meteor.rankValues.manaCost, [70, 90, 110]);
  assert.equal(meteor.rankValues.cooldownSeconds, 25);
  assert.equal(meteor.rankValues.impactDelaySeconds, null);
  assert.equal(meteor.rankValues.fireDamageSharePercent, null);
  assert.deepEqual(get(MAGE_REFERENCE, 'wall_of_flames').rankValues.durationSourceUnits, [8, 11, 14]);
  assert.equal(Object.hasOwn(get(MAGE_REFERENCE, 'wall_of_flames').rankValues, 'durationSeconds'), false);
  assert.equal(get(MAGE_REFERENCE, 'flame_shield').rankValues.fireDamage, null);
  assert.equal(get(ARCHER_REFERENCE, 'rain_of_arrows').rankValues.arrowCount, null);
  assert.equal(get(ARCHER_REFERENCE, 'piercing_shot').rankValues.damageLossPerPiercePercent, null);
  for (const id of ['arcanist', 'arcane_amplification', 'elemental_flux']) {
    const node = get(MAGE_REFERENCE, id);
    assert.ok(node.source.officialEvidence.includes('https://maximument.com/news/hwiipatchnotes/'));
    assert.ok(node.unknown.some(item => item.startsWith('postPatchBehavior:')));
    assert.equal(node.source.kind, 'wiki_cached');
  }
});
