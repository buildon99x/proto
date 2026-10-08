// Functional reference data for Hammerwatch II (2023), not executable combat.
// Percent values use percentage units (25 means 25%, not 0.25).
// Missing facts are null; they must never become zero, free purchases or unlocks.
const CHECKED_AT = '2026-10-08';
const WIKI = {
  id: 'hw2_paladin_wiki_cached', kind: 'wiki_cached',
  url: 'https://wiki.hammerwatch2.com/Paladin',
  title: 'Hammerwatch II Wiki: Paladin', accessedAt: CHECKED_AT,
  accessMethod: 'search_cached_page', reportedCrawlAge: '2.3 years',
  gameVersion: null, measured: false, currentVerified: false,
  limitation: 'Live page unavailable (502); cached facts have not been checked in the game.'
};
const BANNER_PATCH = {
  id: 'hw2_patch_2_banner_exclusivity', kind: 'official',
  url: 'https://maximument.com/news/hwiipatchnotes/',
  title: 'Hammerwatch II Gets Massive Second Patch',
  section: 'Patch 2: Battle Banner extra upgrades', publishedAt: '2023-09-19',
  accessedAt: CHECKED_AT, accessMethod: 'web_page',
  gameVersion: 'Patch 2 (2023-09-19)', measured: false, currentVerified: false,
  claims: ['Battle Banner extra upgrades are mutually exclusive.']
};
const unknown = (field, reason) => ({field, reason});
const sourceFor = referenceName => ({...WIKI, section: referenceName});
const missing = value => value === null || value === 'UNKNOWN';

function node(id, referenceName, displayName, tier, type, upgradeCosts, rankValues, options = {}) {
  const baseId = options.baseId ?? null;
  const source = sourceFor(referenceName);
  const requires = baseId ? [{skillId: baseId, rank: null, kind: 'base_relationship', source}] : [];
  const unresolved = [
    unknown('purchaseRequirements', 'Purchase ranks, trainer requirements and extra prerequisites are not published here.')
  ];
  if (baseId) unresolved.push(unknown('requires.0.rank', 'Base-skill relationship is documented; required purchased rank is not.'));
  if (!options.exclusiveGroup) unresolved.push(unknown('exclusiveGroup', 'No exclusivity claim found; null does not establish compatibility.'));
  for (const [key, value] of Object.entries(rankValues)) {
    if (missing(value)) unresolved.push(unknown(`rankValues.${key}`, 'Not quantified in the retrieved table.'));
  }
  return {
    id, referenceName, displayName, tier, type, baseId, upgradeCosts, rankValues,
    exclusiveGroup: options.exclusiveGroup ?? null,
    exclusiveSource: options.exclusiveGroup ? (options.exclusiveSource ?? source) : null,
    requires, purchaseRequirements: null, behaviorId: id,
    mechanics: options.mechanics ?? {},
    tierEvidence: options.tierEvidence ?? 'explicit',
    source, implementationStatus: 'reference_only',
    unknown: [...unresolved, ...(options.unknown ?? [])],
    tableDiscrepancies: options.tableDiscrepancies ?? [],
    sourceRows: options.sourceRows ?? {}
  };
}
function augment(id, referenceName, displayName, tier, baseId, upgradeCosts, rankValues, options = {}) {
  return node(id, referenceName, displayName, tier, 'augment', upgradeCosts, rankValues, {...options, baseId});
}
const activeUnknown = {castTimeSeconds: null, range: null, hitbox: null, cancellationWindowSeconds: null};
const provisionalAdept = {
  tierEvidence: 'section_only',
  unknown: [unknown('tier', 'Adept is catalog placement under Towering Strength; the augmentation heading omits its tier. Do not unlock from this placement.')]
};

const skills = [
  node('shield_charge', 'Shield Charge', '방벽 돌진', 'apprentice', 'dash', [0, 1, 2, 3, 4], {
    staminaCost: [10, 12, 14, 16, 18], cooldownSeconds: [3, 2.5, 2, 1.5, 1],
    stunDurationSeconds: null, ...activeUnknown
  }, {mechanics: {direction: 'forward', status: 'stun', targets: 'collided_enemies'}}),
  augment('armored_assault', 'Armored Assault', '강철 충돌', 'apprentice', 'shield_charge', [1, 2, 3], {
    damagePerArmor: [1, 1.5, 2], staminaCostIncreasePercent: 25
  }, {mechanics: {damageType: 'physical', targets: 'collided_enemies'}}),
  augment('charge_through', 'Charge Through', '전열 돌파', 'adept', 'shield_charge', [2], {
    minorStunDurationSeconds: null
  }, {mechanics: {passesThroughEnemies: true, replacesStatus: 'minor_stun'}}),

  node('mace_swing', 'Mace Swing', '철퇴 휘두르기', 'apprentice', 'mainhand', [0, 1, 2, 3, 4, 5], {
    mainhandDamagePercent: [100, 120, 140, 160, 180, 200], cooldownSeconds: 0.1,
    staminaCost: null, ...activeUnknown
  }, {mechanics: {attack: 'melee', equipmentSlot: 'mainHand'}}),
  augment('stunning_strikes', 'Stunning Strikes', '충격 타격', 'apprentice', 'mace_swing', [1, 2, 3, 4], {
    stunChancePercent: [5, 10, 15, 20], stunDurationSeconds: null
  }, {mechanics: {status: 'stun'}}),
  augment('crushing_blows', 'Crushing Blows', '장갑 분쇄', 'apprentice', 'mace_swing', [1, 2, 3], {
    armorPenetration: [5, 10, 20]
  }),
  augment('flames_of_devotion', 'Flames of Devotion', '잿불 후려치기', 'expert', 'mace_swing', [3, 4, 5], {
    damagePerIntelligence: [0.3, 0.4, 0.5], flameArcRange: null
  }, {mechanics: {trigger: 'after_mace_swing', damageType: 'fire', shape: 'arc'}}),

  node('shield_block', 'Shield Block', '방패 버티기', 'apprentice', 'offhand', [0, 1, 2, 3], {
    passivePhysicalBlockChancePercent: 25, passivePhysicalBlockAmount: [25, 50, 75, 100],
    activeStaminaCost: null, activeBlockAmount: null, movementSlowPercent: null, cooldownSeconds: null,
    ...activeUnknown
  }, {mechanics: {activeBlock: 'equipped_shield', equipmentSlot: 'offHand', passiveBlockDamageType: 'physical'}}),
  augment('shield_training', 'Shield Training', '방패 보법', 'apprentice', 'shield_block', [1, 2, 3], {
    slowEffectChangePercent: [-20, -40, -70]
  }, {mechanics: {while: 'shield_block', modifierTarget: 'movement_slow_effect'}}),
  augment('elemental_bulwark', 'Elemental Bulwark', '세 원소 방벽', 'apprentice', 'shield_block', [1, 2, 3], {
    resistanceBonus: [10, 20, 40]
  }, {mechanics: {while: 'shield_block', elements: ['fire', 'ice', 'lightning']}}),
  augment('shield_of_thorns', 'Shield of Thorns', '반격 철편', 'adept', 'shield_block', [2, 3, 4], {
    damagePerCurrentStamina: [0.1, 0.2, 0.3]
  }, {mechanics: {trigger: 'blocked_melee_attack', damageType: 'physical', target: 'attacker'}}),

  node('righteous_hammer', 'Righteous Hammer', '잿불 망치', 'apprentice', 'spell', [0, 2, 3, 4, 5], {
    physicalDamage: [30, 45, 65, 90, 120], damagePerLevel: 2,
    manaCost: [15, 20, 25, 30, 35], cooldownSeconds: 1,
    projectileSpeed: null, ...activeUnknown
  }, {mechanics: {damageType: 'physical', targets: 'all_enemies_in_path', projectile: 'hammer'},
    unknown: [unknown('levelScalingOrigin', 'The table does not state whether per-level scaling begins at level zero or level one.')]}),
  augment('hammer_of_wrath', 'Hammer of Wrath', '뇌광 망치', 'adept', 'righteous_hammer', [2, 3, 4], {
    lightningDamage: [25, 50, 75], tickSeconds: 0.25, manaCostIncreasePercent: 25, lightningRange: null
  }, {exclusiveGroup: 'righteous_hammer_damage_type', mechanics: {damageType: 'lightning', trigger: 'projectile_periodic', targets: 'nearby_enemies'}}),
  augment('hammer_of_sundering', 'Hammer of Sundering', '균열 망치', 'adept', 'righteous_hammer', [2, 3, 4], {
    physicalDamagePerStrength: [0.3, 0.4, 0.5],
    status: ['minor_armor_break', 'armor_break', 'greater_armor_break'],
    manaCostIncreasePercent: 25, armorBreakDurationSeconds: null, armorBreakAmount: null
  }, {exclusiveGroup: 'righteous_hammer_damage_type', mechanics: {damageType: 'physical', damageOperation: 'additional'}}),
  augment('hammer_of_devotion', 'Hammer of Devotion', '귀환 망치', 'expert', 'righteous_hammer', [3], {
    cooldownAddSeconds: 1, returnDelaySeconds: null
  }, {mechanics: {projectileReturns: true}}),

  node('lay_on_hands', 'Lay on Hands', '온기 나누기', 'adept', 'spell', [2, 3, 4, 5], {
    heal: [60, 120, 200, 300], manaCost: [30, 40, 50, 60], cooldownSeconds: 13,
    areaRadius: null, ...activeUnknown
  }, {mechanics: {target: 'allies_in_target_area', effect: 'heal'}}),
  augment('invigorating_touch', 'Invigorating Touch', '되살아나는 온기', 'adept', 'lay_on_hands', [2, 3, 4], {
    allRegenIncreasePercent: [25, 50, 100], durationSeconds: 4
  }),
  augment('cleansing_touch', 'Cleansing Touch', '재 씻기', 'expert', 'lay_on_hands', [3], {
    cooldownAddSeconds: 5
  }, {mechanics: {removes: ['negative_status_effects', 'afflictions']}}),
  augment('turn_undead', 'Turn Undead', '망자 태우기', 'expert', 'lay_on_hands', [3, 4, 5], {
    pureDamage: [100, 200, 400]
  }, {mechanics: {damageType: 'pure', targets: 'undead_in_heal_area'}}),

  node('judgement', 'Judgement', '단죄의 일격', 'adept', 'spell', [2, 3, 4, 5, 6], {
    mainhandDamagePercent: [300, 350, 400, 450, 500], manaCost: [30, 35, 40, 45, 50],
    cooldownSeconds: 4, ...activeUnknown
  }, {mechanics: {targets: 'enemies_in_front_area', scaling: 'mainhand'}}),
  augment('trial_by_fire', 'Trial by Fire', '불길 자국', 'adept', 'judgement', [2, 3, 4, 5], {
    fireDamage: [20, 30, 45, 65], durationSeconds: 5, tickSeconds: 0.5, manaCostIncreasePercent: 25
  }, {mechanics: {damageType: 'fire', terrain: 'burning_judgement_area'}}),
  augment('shackles', 'Shackles', '잿빛 족쇄', 'adept', 'judgement', [2, 3, 4], {
    movementSpeedReductionPercent: [60, 70, 80], damageTakenIncreasePercent: [10, 15, 20],
    durationSeconds: 3, cooldownAddSeconds: 2
  }, {mechanics: {targets: 'judgement_hits'}}),

  node('shining_knight', 'Shining Knight', '강철 파수꾼', 'adept', 'passive', [1, 2, 3], {
    armorBonus: [10, 20, 40]
  }),
  augment('armor_of_faith', 'Armor of Faith', '불굴의 갑옷', 'adept', 'shining_knight', [1, 2, 3], {
    armorPerIntelligence: [0.1, 0.2, 0.4]
  }),
  augment('armored_grace', 'Armored Grace', '강철 걸음', 'adept', 'shining_knight', [1, 2, 3], {
    movementSpeedIncreasePercent: [3, 4, 5], staminaCostChangePercent: [-20, -30, -40]
  }, {mechanics: {staminaCostAppliesTo: 'all_skills'}}),
  node('towering_strength', 'Towering Strength', '거목의 힘', 'adept', 'passive', [1, 2, 3], {
    strengthBonus: [5, 15, 30]
  }),
  augment('battering_ram', 'Battering Ram', '공성의 힘', 'adept', 'towering_strength', [1, 2, 3], {
    armorPenetrationPerStrength: [0.2, 0.3, 0.4]
  }, {...provisionalAdept, unknown: [...provisionalAdept.unknown,
    unknown('penetrationTerminology', 'The description says Physical Penetration; its numerical row says Armor Penetration. Equivalence is unverified.')]}),
  augment('crushing_might', 'Crushing Might', '압도하는 힘', 'adept', 'towering_strength', [1, 2, 3], {
    physicalDamageIncreasePercent: [5, 10, 15]
  }, provisionalAdept),
  augment('superb_constitution', 'Superb Constitution', '무쇠 체질', 'adept', 'towering_strength', [1, 2, 3, 4], {
    healthBonus: [25, 50, 75, 100], poisonResistanceBonus: [10, 20, 30, 40]
  }, provisionalAdept),

  node('battle_banner', 'Battle Banner', '잿불 깃발', 'expert', 'spell', [3, 4, 5], {
    damageIncreasePercent: [10, 20, 30], attackSpeedIncreasePercent: [10, 20, 30],
    durationSeconds: 15, manaCost: [40, 50, 60], cooldownSeconds: 30,
    areaRadius: null, ...activeUnknown
  }, {mechanics: {targets: 'allies_in_banner_area', effect: 'area_buff'}}),
  augment('banner_of_protection', 'Banner of Protection', '수호 깃발', 'expert', 'battle_banner', [3, 4, 5], {
    damageTakenChangePercent: [-10, -15, -20]
  }, {exclusiveGroup: 'battle_banner_support', exclusiveSource: BANNER_PATCH}),
  augment('banner_of_zeal', 'Banner of Zeal', '격려 깃발', 'expert', 'battle_banner', [3, 4, 5], {
    castSpeedIncreasePercent: [20, 35, 50], manaCostChangePercent: [-10, -20, -30]
  }, {exclusiveGroup: 'battle_banner_support', exclusiveSource: BANNER_PATCH}),

  node('zealous_onslaught', 'Zealous Onslaught', '불굴의 진격', 'expert', 'spell', [3, 4, 5, 6], {
    physicalDamage: [60, 90, 130, 180], maxChannelSeconds: 4,
    staminaCost: [9, 11, 13, 15], cooldownSeconds: 10, manaCost: null,
    damageTickSeconds: null, staminaCostIntervalSeconds: null, ...activeUnknown
  }, {mechanics: {direction: 'forward', targets: 'all_enemies_in_path', damageType: 'physical', channel: true},
    unknown: [unknown('resourcePaymentMode', 'Spell type is explicit, but the row lists Stamina Cost. Upfront versus periodic payment is unverified.')]}),
  augment('zealous_lance', 'Zealous Lance', '화염 선봉', 'expert', 'zealous_onslaught', [3, 4, 5], {
    damage: [100, 200, 300], physicalFireSplit: null, range: null
  }, {mechanics: {trigger: 'channel_end', damageTypes: ['physical', 'fire'], targets: 'all_enemies_in_front'}}),
  augment('zealous_shield', 'Zealous Shield', '진격 방벽', 'expert', 'zealous_onslaught', [3], {
    staminaCostIncreasePercent: 25
  }, {mechanics: {while: 'zealous_onslaught', activatesSkillId: 'shield_block'}}),
  node('inner_flame', 'Inner Flame', '가슴속 잿불', 'expert', 'passive', [2, 3, 4, 5], {
    fireDamageIncreasePercent: [10, 15, 20, 25], fireResistanceIncreasePercent: [20, 30, 40, 50], durationSeconds: 3
  }, {mechanics: {trigger: 'spell_cast'}}),
  augment('flaming_wrath', 'Flaming Wrath', '불꽃 반향', 'expert', 'inner_flame', [2, 3, 4], {
    spellCritChanceBonusPercent: [5, 10, 15], fireDamage: [40, 60, 100], effectCooldownSeconds: 0.5,
    areaRadius: null
  }, {mechanics: {trigger: 'spell_critical_hit', damageType: 'fire', targets: 'nearby_enemies'}}),
  augment('healing_flames', 'Healing Flames', '생명을 잇는 불씨', 'master', 'inner_flame', [3, 4, 5], {
    spellLifeLeechPercent: [2, 3.5, 5], spellCostIncreasePercent: [10, 15, 20]
  }),
  node('lawbringer', 'Lawbringer', '파수의 응징', 'expert', 'passive', [2, 3, 4], {
    chancePercent: [10, 15, 20], disarmDurationSeconds: null, silenceDurationSeconds: null
  }, {mechanics: {triggers: ['block', 'take_damage'], target: 'attacker', statuses: ['disarm', 'silence']}}),
  augment('punish_the_wicked', 'Punish the Wicked', '틈새 응징', 'expert', 'lawbringer', [2, 3, 4], {
    damageIncreasePercent: [10, 20, 30]
  }, {mechanics: {targetHasAnyStatus: ['disarm', 'silence']}}),
  augment('guilt_by_association', 'Guilt by Association', '퍼지는 응징', 'expert', 'lawbringer', [2, 3, 4], {
    mainhandDamagePercent: [50, 75, 100], effectCooldownSeconds: [1.5, 1, 0.5], areaRadius: null
  }, {mechanics: {trigger: 'attack_disarmed_or_silenced_enemy', targets: 'nearby_enemies_without_disarm_or_silence'}}),

  node('pillar_of_light', 'Pillar of Light', '새벽 불기둥', 'master', 'spell', [4, 5, 6], {
    damage: [150, 300, 500], damagePerLevel: 4, manaCost: [60, 80, 100], cooldownSeconds: 15,
    physicalFireSplit: null, blindnessDurationSeconds: null, areaRadius: null, ...activeUnknown
  }, {mechanics: {damageTypes: ['physical', 'fire'], status: 'blindness', target: 'target_location'},
    unknown: [unknown('levelScalingOrigin', 'Per-level origin and additive/multiplicative ordering are not specified.')]}),
  augment('pulsing_light', 'Pulsing Light', '되울리는 새벽', 'master', 'pillar_of_light', [4, 5], {
    additionalExplosions: [1, 2], cooldownAddSeconds: 5, explosionIntervalSeconds: null
  }, {exclusiveGroup: 'pillar_of_light_effect', mechanics: {repeatAtSameLocation: true}}),
  augment('heavens_wrath', "Heaven's Wrath", '벼락 기둥', 'master', 'pillar_of_light', [4, 5, 6], {
    lightningDamage: [30, 70, 120], tickSeconds: 0.5, durationSeconds: 5, areaRadius: null
  }, {exclusiveGroup: 'pillar_of_light_effect', mechanics: {replaceDamageType: {from: 'fire', to: 'lightning'}, terrain: 'electrified_ground'}}),
  node('blessed_champion', 'Blessed Champion', '잿불 각성', 'master', 'spell', [4, 5, 6], {
    attributesIncreasePercent: [50, 75, 100], durationSeconds: [5, 6, 7], manaCost: [70, 100, 130],
    cooldownSeconds: 30, castTimeSeconds: null, cancellationWindowSeconds: null
  }, {mechanics: {target: 'self', immunities: ['stun', 'slow']}}),
  augment('champion_of_truth', 'Champion of Truth', '흔들림 없는 일격', 'master', 'blessed_champion', [4, 5, 6], {
    attackCritChancePercent: null, manaCostIncreasePercent: 25
  }, {mechanics: {while: 'blessed_champion', grants: 'true_strike'},
    sourceRows: {attackCritChancePercent: [25, 50]},
    tableDiscrepancies: [{field: 'attackCritChancePercent', costCount: 3, valueCount: 2, rankMapping: null}],
    unknown: [unknown('rankValues.attackCritChancePercent', 'Three upgrade costs but only two critical-chance values (25%, 50%); rank mapping and missing value are unresolved.'),
      unknown('trueStrikeDefinition', 'The ability names True Strike but does not define its exact hit/defense interaction.')]}),
  augment('champions_hammer', "Champion's Hammer", '끊임없는 망치', 'master', 'blessed_champion', [4, 5], {
    righteousHammerCastSpeedIncreasePercent: [50, 100], righteousHammerCooldownSeconds: 0,
    cooldownAddSeconds: 15
  }, {mechanics: {while: 'blessed_champion', modifiesSkillId: 'righteous_hammer'},
    unknown: [unknown('cooldownModifierTarget', 'The +15s table row is placed under the Blessed Champion augmentation; confirm its target in-game before execution.')]}),
  node('crusader', 'Crusader', '전진하는 불씨', 'master', 'passive', [3, 4], {
    movementSpeedPerStackPercent: 1, damagePerStackPercent: [2, 4], maxStacks: 20,
    stackDurationSeconds: 3, stacksPerKill: null
  }, {mechanics: {trigger: 'enemy_kill', effect: 'stacking_buff'},
    unknown: [unknown('stackRefreshRule', 'Independent stack expiry versus refreshing the full stack is not documented.')]}),
  augment('dauntless', 'Dauntless', '거인 맞서기', 'master', 'crusader', [3, 4, 5], {
    stacksGained: [1, 2, 4]
  }, {mechanics: {trigger: 'attack_hit', targetKinds: ['boss', 'superior'], grantsStacks: 'crusader'}}),
  augment('zealot', 'Zealot', '타오르는 기세', 'master', 'crusader', [3, 4], {
    damageThreshold: [400, 200], stacksPerThreshold: null
  }, {mechanics: {trigger: 'damage_dealt', grantsStacks: 'crusader'},
    unknown: [unknown('damageAccumulatorRule', 'Remainders, resets and eligible damage types are not documented.')]}),
  node('guardian_angel', 'Guardian Angel', '마지막 불씨', 'master', 'passive', [3, 4, 5], {
    damageThreshold: 200, durationSeconds: 4, cooldownSeconds: [120, 100, 80],
    damageWindowSeconds: null
  }, {mechanics: {trigger: 'damage_taken_within_window', effect: 'invulnerability'}}),
  augment('true_restoration', 'True Restoration', '되살아나는 숨', 'master', 'guardian_angel', [3, 4], {
    healthRegenIncreasePercent: [300, 500]
  }, {mechanics: {while: 'guardian_angel'}}),
  augment('wrathful_avenger', 'Wrathful Avenger', '최후의 역습', 'master', 'guardian_angel', [3, 4], {
    damageIncreasePercent: [200, 300]
  }, {mechanics: {while: 'guardian_angel'}})
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export const WARRIOR_REFERENCE = deepFreeze({
  schemaVersion: 1, classId: 'warrior', referenceClassId: 'paladin', displayName: '전사',
  referenceGame: 'Hammerwatch II', referenceReleaseYear: 2023,
  source: WIKI, supplementalSources: [BANNER_PATCH],
  evidenceStatus: 'cached_reference_not_measured', implementationStatus: 'reference_only',
  tiers: ['apprentice', 'adept', 'expert', 'master'],
  promotionRequirements: null,
  unknown: [unknown('promotionRequirements', 'This class page does not establish promotion NPCs, quests, costs or complete level/rank conditions.'),
    unknown('gameVersion', 'The cached wiki does not identify a verified game build.'),
    unknown('combatFidelity', 'No original-game timing, collision, resource or damage measurements have been performed.')],
  skills
});

// Data validation is deliberately separate from purchasing, unlocking and combat.
export function validateWarriorReference(catalog = WARRIOR_REFERENCE) {
  const errors = [];
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const evidence = value => record(value) && ['wiki_cached', 'official', 'measured'].includes(value.kind)
    && typeof value.url === 'string' && /^https:\/\//.test(value.url)
    && typeof value.accessedAt === 'string' && typeof value.section === 'string';
  if (!record(catalog) || !Array.isArray(catalog.skills)) return {ok: false, errors: ['Malformed catalog.']};
  if (catalog.classId !== 'warrior' || catalog.referenceClassId !== 'paladin'
      || catalog.referenceGame !== 'Hammerwatch II' || catalog.referenceReleaseYear !== 2023) errors.push('Wrong reference identity.');
  if (!record(catalog.source) || catalog.source.kind !== 'wiki_cached' || !catalog.source.url) errors.push('Missing catalog source.');
  if (catalog.promotionRequirements !== null) errors.push('Promotion requirements remain unknown; new evidence is required before replacing null.');
  const tiers = ['apprentice', 'adept', 'expert', 'master'];
  const types = ['dash', 'mainhand', 'offhand', 'spell', 'passive', 'augment'];
  const ids = new Set(), byId = new Map(), groups = new Map();
  for (const skill of catalog.skills) {
    if (!record(skill)) {errors.push('Malformed skill.'); continue;}
    if (typeof skill.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(skill.id) || ids.has(skill.id)) errors.push('Invalid or duplicate skill ID: ' + skill.id);
    ids.add(skill.id); byId.set(skill.id, skill);
    if (!skill.referenceName || !skill.displayName || !/[가-힣]/.test(skill.displayName)) errors.push('Missing names: ' + skill.id);
    if (!tiers.includes(skill.tier) || !types.includes(skill.type)) errors.push('Invalid tier/type: ' + skill.id);
    if (!evidence(skill.source)) errors.push('Missing skill source: ' + skill.id);
    if (!Array.isArray(skill.upgradeCosts) || !skill.upgradeCosts.length
        || !skill.upgradeCosts.every(value => missing(value) || (Number.isInteger(value) && value >= 0))) errors.push('Invalid upgrade costs: ' + skill.id);
    if (!Array.isArray(skill.requires) || !Array.isArray(skill.unknown) || !skill.behaviorId) errors.push('Missing relationship/unknown/behavior metadata: ' + skill.id);
    const unresolved = Array.isArray(skill.unknown) ? skill.unknown.filter(record) : [];
    const discrepancies = Array.isArray(skill.tableDiscrepancies) ? skill.tableDiscrepancies : [];
    if (!Array.isArray(skill.tableDiscrepancies)) errors.push('Invalid discrepancy metadata: ' + skill.id);
    if (skill.purchaseRequirements !== null) errors.push('Unsupported purchase requirements: ' + skill.id);
    if (!record(skill.rankValues)) {errors.push('Invalid rank values: ' + skill.id); continue;}
    for (const [key, value] of Object.entries(skill.rankValues)) {
      const values = Array.isArray(value) ? value : [value];
      if (!values.length || !values.every(item => missing(item) || typeof item === 'string' || (typeof item === 'number' && Number.isFinite(item)))) errors.push('Invalid rank value: ' + skill.id + '.' + key);
      if (Array.isArray(value) && value.length !== skill.upgradeCosts?.length) errors.push('Unresolved rank arity must be null: ' + skill.id + '.' + key);
      if (missing(value) && !unresolved.some(entry => entry.field === 'rankValues.' + key && entry.reason)) errors.push('Unexplained unknown: ' + skill.id + '.' + key);
      if (!missing(value) && unresolved.some(entry => entry.field === 'rankValues.' + key)) errors.push('Unknown field was promoted without resolving its evidence: ' + skill.id + '.' + key);
    }
    for (const discrepancy of discrepancies) {
      if (!record(discrepancy)) {errors.push('Invalid discrepancy metadata: ' + skill.id); continue;}
      if (!missing(skill.rankValues[discrepancy.field]) || !Array.isArray(skill.sourceRows?.[discrepancy.field])
          || discrepancy.costCount !== skill.upgradeCosts?.length
          || discrepancy.valueCount !== skill.sourceRows[discrepancy.field].length
          || discrepancy.rankMapping !== null) errors.push('Unresolved source discrepancy was promoted: ' + skill.id);
    }
    if (skill.tierEvidence === 'section_only' && !unresolved.some(entry => entry.field === 'tier')) errors.push('Provisional tier lost its warning: ' + skill.id);
    if (skill.exclusiveGroup !== null) {
      if (typeof skill.exclusiveGroup !== 'string' || !evidence(skill.exclusiveSource)) errors.push('Unsupported exclusivity: ' + skill.id);
      const group = groups.get(skill.exclusiveGroup) ?? []; group.push(skill); groups.set(skill.exclusiveGroup, group);
    }
  }
  for (const tier of tiers) if (catalog.skills.filter(skill => skill?.tier === tier && skill.baseId === null).length !== 4) errors.push('Expected four base skills in ' + tier);
  for (const skill of catalog.skills.filter(record)) {
    if (skill.type === 'augment') {
      if (!byId.has(skill.baseId) || byId.get(skill.baseId)?.type === 'augment') errors.push('Invalid augmentation base: ' + skill.id);
      if (!Array.isArray(skill.requires) || !skill.requires.some(item => record(item) && item.skillId === skill.baseId && item.kind === 'base_relationship' && item.rank === null && evidence(item.source))) errors.push('Unsupported prerequisite rank: ' + skill.id);
    } else if (skill.baseId !== null) errors.push('Base skill has a parent: ' + skill.id);
  }
  for (const [group, members] of groups) {
    if (members.length < 2 || new Set(members.map(skill => skill.baseId)).size !== 1) errors.push('Invalid exclusive group: ' + group);
  }
  return {ok: errors.length === 0, errors};
}
