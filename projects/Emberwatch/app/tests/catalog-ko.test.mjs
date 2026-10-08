import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  CLASSES, BIOMES, RELICS, BUILDINGS, GEAR_NAMES, legacyGearName,
  createMap, defaultSave,
} from '../src/data.js';
import {
  ATTRIBUTE_DEFS, AFFIXES, SKILL_COST, newHero, trainSkill, forgeGear, skillDescription,
} from '../src/growth.js';

let labelsChecked = 0;
function assertKorean(text, context) {
  assert.equal(typeof text, 'string', context);
  assert.match(text, /[가-힣]/u, `${context} needs Korean display text`);
  assert.doesNotMatch(text, /[A-Za-z]/u, `${context} leaks English display text`);
  labelsChecked++;
}
function checkFields(rows, fields, group) {
  for (const [index, row] of rows.entries()) {
    for (const field of fields) assertKorean(row[field], `${group}[${index}].${field}`);
  }
}
checkFields(CLASSES, ['name', 'desc', 'q', 'e'], 'classes');
for (const hero of CLASSES) {
  hero.specs.forEach((name, index) => assertKorean(name, `${hero.id}.specs[${index}]`));
  for (const key of ['q', 'e', 'passive', 'ultimate']) {
    for (let rank = 0; rank <= 5; rank++) {
      const text = skillDescription(hero.id, key, rank);
      assertKorean(text, `${hero.id}.${key} rank ${rank}`);
      const effectiveRank = Math.max(1, rank);
      if (key === 'q' || key === 'e') {
        assert(text.includes(`${Math.round((1 + (effectiveRank - 1) * .3) * 100)}%`));
      } else if (key === 'ultimate') {
        assert(text.includes(`${effectiveRank * 55 + 100}%`));
      } else {
        assert(text.includes(`+${(effectiveRank - 1) * 6}%`));
        assert(text.includes(`+${(effectiveRank - 1) * 10}`));
      }
    }
  }
}
assertKorean(skillDescription('unknown', 'q', 1), 'unknown class skill fallback');
checkFields(BIOMES, ['name', 'sub', 'boss'], 'biomes');
checkFields(RELICS, ['name', 'text'], 'relics');
checkFields(BUILDINGS, ['name', 'text'], 'buildings');
checkFields(ATTRIBUTE_DEFS, ['name', 'text'], 'attributes');
checkFields(AFFIXES, ['name', 'text'], 'affixes');
for (const [slot, names] of Object.entries(GEAR_NAMES)) {
  names.forEach((name, tier) => assertKorean(name, `${slot} tier ${tier}`));
}
for (let floor = 0; floor < 6; floor++) {
  assertKorean(createMap(42, floor).layout, `floor ${floor} layout`);
}

// These English strings are compatibility inputs, never player-facing labels.
const legacyGear = {
  weapon: ['Iron edge', 'Ashwood staff', 'Hunter’s oath', 'Dusk blade', 'Emberfang', 'Kingsbane'],
  armor: ['Padded coat', 'Scale hauberk', 'Pilgrim’s vest', 'Warden plate', 'Runic mantle', 'Crownward'],
  charm: ['Copper token', 'Moonstone', 'Amber seal', 'Raven charm', 'Cinder jewel', 'Dawnstone'],
};
for (const [slot, names] of Object.entries(legacyGear)) {
  for (const [tier, name] of names.entries()) {
    const storedGear = Object.freeze({ id: 'legacy-item', name, slot, upgrade: 2 });
    assert.equal(legacyGearName(storedGear.name, storedGear.slot), GEAR_NAMES[slot][tier]);
    assert.equal(legacyGearName(name), GEAR_NAMES[slot][tier]);
    assert.equal(legacyGearName(GEAR_NAMES[slot][tier], slot), GEAR_NAMES[slot][tier]);
    assert.equal(storedGear.name, name, 'display localization must not mutate saved names');
  }
}
assert.equal(legacyGearName('Custom keepsake', 'charm'), 'Custom keepsake');
assert.equal(legacyGearName('Iron edge', 'armor'), 'Iron edge', 'a known slot bounds lookup');
assert.equal(legacyGearName('Iron edge', 'unknown'), GEAR_NAMES.weapon[0]);

// All rejection branches remain informative in Korean.
const trainingRejections = [
  { key: 'unknown' },
  { key: 'ultimate' },
  { key: 'q', rank: 5 },
  { key: 'q', rank: 2 },
  { key: 'q', rank: 1 },
];
for (const [index, { key, rank }] of trainingRejections.entries()) {
  const save = defaultSave(), hero = newHero();
  if (rank !== undefined) hero.skills[key] = rank;
  const before = JSON.stringify({ save, hero });
  const result = trainSkill(save, hero, key);
  assert.equal(result.ok, false);
  assertKorean(result.reason, `training rejection ${index}`);
  assert.equal(JSON.stringify({ save, hero }), before);
}
for (const upgrade of [5, 1, 0]) {
  const save = defaultSave(), gear = { stat: 'damage', value: 10, baseValue: 10, upgrade, ilvl: 1 };
  const before = JSON.stringify({ save, gear });
  const result = forgeGear(save, gear);
  assert.equal(result.ok, false);
  assertKorean(result.reason, `forge rejection at upgrade ${upgrade}`);
  assert.equal(JSON.stringify({ save, gear }), before);
}

// Stable identifiers are deliberately not localized.
assert.deepEqual(CLASSES.map(x => x.id), ['warrior', 'paladin', 'ranger', 'wizard', 'rogue', 'warlock', 'sorcerer']);
assert.deepEqual(RELICS.map(x => x.id), ['fang', 'heart', 'boots', 'eye', 'vial', 'hourglass', 'crystal', 'coin', 'thorn', 'flame', 'ice', 'wing', 'shield', 'echo', 'star', 'phoenix', 'magnet', 'venom']);
assert.deepEqual(BUILDINGS.map(x => x.id), ['training', 'guild', 'forge', 'chapel', 'apothecary', 'enchanter', 'treasury']);
assert.deepEqual(ATTRIBUTE_DEFS.map(x => x.id), ['strength', 'dexterity', 'intelligence', 'focus', 'vitality']);
assert.deepEqual(AFFIXES.map(x => x.id), ['ember', 'frost', 'storm', 'vampire']);
assert.deepEqual(Object.keys(GEAR_NAMES), ['weapon', 'armor', 'charm']);

// Pre-localization fingerprint: no balance values, IDs, enums, icons, colors,
// default save fields, skill costs, or generated map geometry changed.
const omit = (rows, fields) => rows.map(row => Object.fromEntries(
  Object.entries(row).filter(([key]) => !fields.includes(key)),
));
const mechanics = {
  classes: omit(CLASSES, ['name', 'q', 'e', 'desc', 'specs']),
  biomes: omit(BIOMES, ['name', 'sub', 'boss']),
  relics: omit(RELICS, ['name', 'text']),
  buildings: omit(BUILDINGS, ['name', 'text']),
  attributes: omit(ATTRIBUTE_DEFS, ['name', 'text']),
  affixes: omit(AFFIXES, ['name', 'text']),
  skillCosts: SKILL_COST,
  save: defaultSave(),
  maps: [0, 7, 42].flatMap(seed => Array.from({ length: 6 }, (_, floor) => {
    const { layout, ...map } = createMap(seed, floor);
    return map;
  })),
};
assert.equal(
  createHash('sha256').update(JSON.stringify(mechanics)).digest('hex'),
  '06cff01de9cf041998f8a2cd070bc1ac9e168ee6ab5840e2f4cc71eb004ccbee',
  'localization must preserve the original mechanical catalog and save/map schema',
);
console.log(`PASS: ${labelsChecked} Korean catalog/generated labels; 18 legacy gear names; stable IDs and pre-localization mechanics fingerprint.`);
