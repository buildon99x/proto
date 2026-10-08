// Reference catalog only: no behavior is enabled or gameplay fidelity claimed.
// Numeric rows are cached community facts, not current-build measurements.
// Rank arrays preserve source order. Scalars are single source cells, not inferred ranks.
// Null is unresolved; never coerce it to zero or silently pad a mismatched rank array.
const SOURCE = Object.freeze({
  kind: 'wiki_cached',
  url: 'https://wiki.hammerwatch2.com/Ranger',
  accessedAt: '2026-10-08',
  reportedCrawlAge: '2.3 years',
  retrieval: 'targeted_web_search_cache',
  confidence: 'community_cached_unverified',
  currentVersionVerified: false,
  measured: false,
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function skill(id, referenceName, displayName, tier, type, baseId, upgradeCosts, rankValues, options = {}) {
  const requires = baseId ? [{ skillId: baseId, rank: null, relation: 'augment_base' }] : [];
  const unknown = baseId ? ['minimumBaseRank: branch membership is sourced; purchase threshold is not.'] : [];
  const entry = {
    id, referenceName, displayName, tier, type, baseId, upgradeCosts, rankValues,
    requires: [...requires, ...(options.requires ?? [])],
    behaviorId: `reference.archer.${id}`,
    unknown: [...unknown, ...(options.unknown ?? [])],
    source: {
      ...SOURCE, section: referenceName,
      ...(options.sourceNotes ? { notes: options.sourceNotes } : {}),
      ...(options.officialEvidence ? { officialEvidence: options.officialEvidence } : {}),
    },
    rules: options.rules ?? {},
    rankArityDiscrepancies: options.rankArityDiscrepancies ?? [],
  };
  if (options.exclusiveGroup) entry.exclusiveGroup = options.exclusiveGroup;
  return entry;
}

export const ARCHER_REFERENCE = freeze({
  classId: "archer",
  referenceClassId: "ranger",
  displayName: "궁사",
  game: "Hammerwatch II (2023)",
  catalogStatus: "reference_only",
  implementationStage: "M4_deferred",
  displayNameProvenance: "Original Emberwatch Korean working labels; not an official translation.",
  unknown: ["Current game build and rank-by-rank behavior are not measured.", "Trainer/NPC promotion requirements and rank-level purchase gates are unresolved.", "Animation, collision, cancel timing, numeric rounding and modifier order are unresolved.", "An omitted exclusiveGroup means no sourced exclusion, not proven compatibility."],
  source: { ...SOURCE, section: "Abilities: all four tiers" },
  skills: [

    // Apprentice — Dodge Roll
    skill("dodge_roll", "Dodge Roll", "낙엽 구르기", "apprentice", "dash", null, [0, 1, 2, 3, 4],
      {"movementSpeedBonusPercent": 15, "durationSeconds": 2, "staminaCost": [10, 12, 14, 16, 18], "cooldownSeconds": [3, 2.5, 2, 1.5, 1]},
      {"rules": {"speedBuffTrigger": "after_roll"}, "unknown": ["travelDistance: not listed.", "invulnerabilityWindow: not established."]}),
    skill("evasive_roll", "Evasive Roll", "흔적 지우기", "apprentice", "augment", "dodge_roll", [1, 2, 3],
      {"evasionBonusPercent": [20, 30, 40], "durationSeconds": 2},
      {"rules": {"trigger": "after_roll"}}),
    skill("critical_momentum", "Critical Momentum", "반격의 발돋움", "adept", "augment", "dodge_roll", [2, 3, 4],
      {"attackCritChanceBonusPercent": [20, 30, 40], "durationSeconds": 2},
      {"rules": {"trigger": "after_roll"}}),

    // Apprentice — Sword Slash
    skill("sword_slash", "Sword Slash", "솔바람 베기", "apprentice", "mainhand", null, [0, 1, 2, 3, 4, 5],
      {"mainhandDamagePercent": [100, 120, 140, 160, 180, 200], "cooldownSeconds": 0.1},
      {"rules": {"weaponSlot": "mainHand", "shape": "wide_melee_arc"}, "unknown": ["meleeRange: not listed.", "arcAngle: not listed."]}),
    skill("swift_strikes", "Swift Strikes", "가벼운 검끝", "apprentice", "augment", "sword_slash", [1, 2, 3, 4],
      {"attackSpeedBonusPercent": [5, 10, 15, 20]},
      {}),
    skill("deflect", "Deflect", "비껴 받기", "apprentice", "augment", "sword_slash", [1, 2, 3, 4],
      {"blockAmount": [25, 40, 55, 70]},
      {"rules": {"trigger": "after_sword_slash", "blockInstances": 1, "damageType": "physical"}, "unknown": ["blockWindowSeconds: not listed.", "blockOverflow: not specified."]}),
    skill("extended_reach", "Extended Reach", "뻗어 가는 검끝", "adept", "augment", "sword_slash", [2, 3, 4],
      {"rangeBonusPercent": [15, 30, 50]},
      {}),

    // Apprentice — Bow Shot
    skill("bow_shot", "Bow Shot", "시위 당기기", "apprentice", "offhand", null, [0, 1, 2, 3, 4, 5],
      {"offhandDamagePercent": [100, 120, 140, 160, 180, 200], "maxChargeSeconds": 0.3, "staminaCost": [2, 2, 3, 3, 4, 4], "chargingStaminaCost": 1, "cooldownSeconds": 0.1},
      {"rules": {"weaponSlot": "offHand", "chargeAffects": "range,speed,damage", "resource": "stamina"}, "unknown": ["chargingStaminaCost: cadence/basis of the value 1 is not specified.", "chargeDamageFormula: not listed.", "chargeRangeFormula: not listed.", "chargeSpeedFormula: not listed."]}),
    skill("piercing_shot", "Piercing Shot", "뚫고 가는 화살", "apprentice", "augment", "bow_shot", [1, 2, 3],
      {"projectilePiercing": [1, 3, 6], "damageLossPerPiercePercent": null},
      {"rules": {"piercingDependsOn": "charge", "damageFallsAfterPiercing": true}, "unknown": ["piercingChargeFormula: not listed.", "damageLossPerPiercePercent: not listed."]}),
    skill("overdraw", "Overdraw", "깊은 당김", "adept", "augment", "bow_shot", [2, 3, 4],
      {"maxChargeSeconds": [0.35, 0.4, 0.45], "chargingStaminaCost": 2, "projectileDamageAndSpeedBonusPercent": [20, 40, 60]},
      {"rules": {"extendsCharge": true}, "unknown": ["chargingStaminaCost: cadence/basis of the value 2 is not specified."]}),
    skill("splinter_shot", "Splinter Shot", "뒤를 가르는 화살", "adept", "augment", "bow_shot", [2, 3, 4],
      {"cleaveRangeSourceUnits": [50, 60, 70], "cleaveArcSourceUnits": [50, 60, 70], "cleaveDamagePercent": 25, "staminaCostModifierPercent": 25},
      {"rules": {"target": "behind_hit_enemy"}, "unknown": ["cleaveRangeSourceUnits: world-unit conversion not specified.", "cleaveArcSourceUnits: angle unit not stated."]}),

    // Apprentice — Entangle
    skill("entangle", "Entangle", "뿌리 매듭", "apprentice", "spell", null, [0, 2, 3, 4, 5],
      {"physicalDamage": [5, 8, 12, 17, 23], "tickIntervalSeconds": 0.5, "durationSeconds": [4, 4.5, 5, 5.5, 6], "manaCost": [20, 25, 30, 35, 40], "cooldownSeconds": 4},
      {"rules": {"damageType": "physical", "status": "crippled", "shape": "targeted_area"}, "unknown": ["areaRadius: not listed.", "crippledDuration: relationship to area duration not specified."]}),
    skill("healing_wisps", "Healing Wisps", "숲등불 숨결", "adept", "augment", "entangle", [2, 3, 4, 5],
      {"heal": [6, 12, 18, 24], "tickIntervalSeconds": 1, "durationSeconds": 5, "manaCostModifierPercent": 25},
      {"exclusiveGroup": "entangle_form", "rules": {"trigger": "ally_enters_entangle", "effect": "healing_wisp"}, "unknown": ["wispStacking: repeated area entry/overlap rule not listed."]}),
    skill("poison_ivy", "Poison Ivy", "쓴덩굴", "adept", "augment", "entangle", [2, 3, 4, 5],
      {"poisonDamage": [6, 12, 18, 24], "tickIntervalSeconds": 0.5, "cooldownBonusSeconds": 2},
      {"exclusiveGroup": "entangle_form", "rules": {"addedDamageType": "poison"}}),
    skill("penetrating_vines", "Penetrating Vines", "갑옷 틈새 뿌리", "adept", "augment", "entangle", [2, 3, 4],
      {"statusEffect": ["minor_armor_break", "armor_break", "greater_armor_break"]},
      {"unknown": ["armorBreakDuration: not listed."]}),

    // Adept — Enchanted Arrows
    skill("enchanted_arrows", "Enchanted Arrows", "숲빛 화살", "adept", "spell", null, [2, 3, 4, 5],
      {"offhandDamagePercent": [125, 150, 175, 200], "stackReplenishSeconds": 3, "maxStacks": [3, 4, 5, 6], "manaCost": [9, 12, 15, 18], "cooldownSeconds": null},
      {"rules": {"passiveStackRecharge": true, "pierceAllEnemies": true, "weaponScaling": "offHand"}, "unknown": ["castStackConsumption: exact stacks/arrows consumed per cast not specified.", "cooldownSeconds: not listed."]}),
    skill("frost_arrows", "Frost Arrows", "서리꽃 화살", "adept", "augment", "enchanted_arrows", [2, 3, 4],
      {"iceDamage": [50, 70, 100], "manaCostModifierPercent": 25},
      {"exclusiveGroup": "enchanted_arrow_element", "rules": {"replacesPiercingWith": "impact_explosion", "addedDamageType": "ice"}, "unknown": ["explosionRadius: not listed."]}),
    skill("shock_arrows", "Shock Arrows", "우레꽃 화살", "adept", "augment", "enchanted_arrows", [2, 3, 4],
      {"lightningDamage": [15, 30, 50], "manaCostModifierPercent": 25},
      {"exclusiveGroup": "enchanted_arrow_element", "rules": {"trigger": "arrow_hit", "damageType": "lightning", "target": "random_nearby_enemy"}, "unknown": ["zapRange: not listed."]}),
    skill("multi_shot", "Multi Shot", "부채살 사격", "expert", "augment", "enchanted_arrows", [3, 4],
      {"projectiles": [3, 5], "projectileDamagePercent": 50},
      {"rules": {"projectilePattern": "fan"}, "unknown": ["projectileSpreadAngle: not listed."]}),

    // Adept — Wolf Companion
    skill("wolf_companion", "Wolf Companion", "숲길 벗", "adept", "spell", null, [2, 3, 4, 5, 6],
      {"wolfDamage": [30, 40, 50, 60, 70], "wolfDamagePerLevel": 2, "wolfHealth": [300, 500, 700, 900, 1100], "manaCost": [40, 50, 60, 70, 80], "cooldownSeconds": 30},
      {"rules": {"damageType": "physical", "target": "nearby_enemies"}, "unknown": ["summonLimit: not listed.", "attackIntervalSeconds: not listed.", "summonDurationSeconds: not listed."]}),
    skill("protective_bond", "Protective Bond", "나란한 발자국", "adept", "augment", "wolf_companion", [2, 3, 4],
      {"damageTakenModifierPercent": [-10, -20, -30]},
      {"rules": {"condition": "near_wolf", "beneficiaries": "self,wolf"}, "unknown": ["bondRange: not listed."]}),
    skill("vicious_bites", "Vicious Bites", "거친 송곳니", "adept", "augment", "wolf_companion", [2, 3, 4],
      {"chancePercent": [30, 45, 60]},
      {"rules": {"trigger": "wolf_attack", "status": "bleeding"}, "unknown": ["bleedingDurationAndDamage: not listed."]}),
    skill("coordinated_attack", "Coordinated Attack", "함께 노리기", "adept", "augment", "wolf_companion", [2, 3, 4],
      {"damageBonusPercent": [10, 20, 30]},
      {"rules": {"target": "wolf_attacked_enemy"}, "unknown": ["targetDebuffDurationSeconds: not listed."]}),

    // Adept — Barkskin
    skill("barkskin", "Barkskin", "나이테 갑옷", "adept", "passive", null, [1, 2, 3],
      {"armorPerStack": [4, 6, 8], "stackReplenishSeconds": 8, "maxStacks": 5},
      {"rules": {"passiveStackRecharge": true, "loseOneStackOnDamage": true}}),
    skill("wild_strength", "Wild Strength", "굳센 나이테", "adept", "augment", "barkskin", [1, 2, 3],
      {"strengthPerStack": [2, 4, 6]},
      {}),
    skill("natural_mending", "Natural Mending", "상처 덮는 이끼", "adept", "augment", "barkskin", [1, 2, 3],
      {"healthRegenBonusPercent": [100, 150, 200], "durationSeconds": [3, 4, 5]},
      {"rules": {"trigger": "damage_taken"}}),

    // Adept — Hunter
    skill("hunter", "Hunter", "숲길 추적자", "adept", "passive", null, [1, 2, 3],
      {"chancePercent": 15, "statusEffect": ["minor_marked", "marked", "greater_marked"]},
      {"rules": {"trigger": "attack"}, "unknown": ["markedMagnitudeAndDuration: not listed."]}),
    skill("beastslayer", "Beastslayer", "짐승의 빈틈", "adept", "augment", "hunter", [1, 2, 3],
      {"damageBonusPercent": [10, 20, 30]},
      {"rules": {"targetType": "beast"}}),
    skill("big_game_hunter", "Big Game Hunter", "거인의 빈틈", "adept", "augment", "hunter", [1, 2, 3],
      {"damageBonusPercent": [5, 10, 15]},
      {"rules": {"targetType": "boss,superior"}}),

    // Expert — On the Prowl
    skill("on_the_prowl", "On the Prowl", "몰아가는 발걸음", "expert", "spell", null, [3, 4, 5],
      {"movementSpeedBonusPercent": [10, 15, 20], "attackSpeedBonusPercent": [10, 15, 20], "durationSeconds": 7, "manaCost": [35, 40, 45], "cooldownSeconds": 20},
      {"rules": {"removesAttackMovementSlow": true}}),
    skill("hot_pursuit", "Hot Pursuit", "끊기지 않는 추격", "expert", "augment", "on_the_prowl", [3, 4],
      {"durationPerAttackHitSeconds": [0.25, 0.5]},
      {"rules": {"trigger": "attack_hit_during_on_the_prowl"}}),
    skill("finish_the_kill", "Finish the Kill", "사냥의 마침표", "master", "augment", "on_the_prowl", [4, 5, 6],
      {"swordSlashDamagePercent": [400, 600, 800]},
      {"rules": {"affectedAction": "sword_slash", "endsBuff": "on_the_prowl", "killResets": "on_the_prowl_cooldown"}}),

    // Expert — Wind Weaver
    skill("wind_weaver", "Wind Weaver", "맴도는 솔바람", "expert", "spell", null, [3, 4, 5, 6],
      {"physicalDamage": [30, 45, 65, 90], "tickIntervalSeconds": 0.25, "maxChargeSeconds": 1, "maxLifetimeSeconds": [8, 10, 12, 14], "manaCost": [30, 35, 40, 45], "cooldownSeconds": 3},
      {"rules": {"damageType": "physical", "chargeAffects": "lifetime", "tornadoFollowsCaster": true}, "unknown": ["chargeLifetimeFormula: not listed.", "tornadoLimit: not listed."]}),
    skill("winter_winds", "Winter Winds", "눈바람 소용돌이", "expert", "augment", "wind_weaver", [3, 4, 5],
      {"chancePercent": [10, 20, 30], "manaCostModifierPercent": 20},
      {"rules": {"replacementDamageType": "ice", "status": "minor_freeze"}, "unknown": ["freezeDurationSeconds: not listed."]}),
    skill("wind_slash", "Wind Slash", "바람 실은 검끝", "expert", "augment", "wind_weaver", [3, 4, 5],
      {"damagePerDexterityPercent": [50, 75, 100]},
      {"rules": {"condition": "active_tornado", "trigger": "sword_slash", "damageType": "physical"}, "unknown": ["gustRange: not listed."]}),

    // Expert — Archer's Concentration
    skill("archers_concentration", "Archer's Concentration", "고요한 시위", "expert", "passive", null, [2, 3, 4],
      {"damageBonusPercent": [10, 20, 30], "rechargeSeconds": 4},
      {"rules": {"lostOn": "damage_taken", "affectedActions": "bow_shot,enchanted_arrows"}}),
    skill("careful_aim", "Careful Aim", "한 점 응시", "expert", "augment", "archers_concentration", [2, 3, 4],
      {"critChancePercent": [10, 20, 30]},
      {"rules": {"condition": "archers_concentration", "affectedActions": "bow_shot,enchanted_arrows"}}),
    skill("determination", "Determination", "끝까지 겨누기", "master", "augment", "archers_concentration", [3],
      {"lowLifeThresholdPercent": null},
      {"rules": {"condition": "low_life", "grants": "archers_concentration"}, "unknown": ["lowLifeThresholdPercent: not listed."]}),

    // Expert — Nature's Blessing
    skill("natures_blessing", "Nature's Blessing", "숲의 가호", "expert", "passive", null, [2, 3, 4],
      {"attributes": [3, 6, 12]},
      {"rules": {"attributes": "strength,dexterity,intelligence"}}),
    skill("natural_attunement", "Natural Attunement", "사계의 수호", "expert", "augment", "natures_blessing", [2, 3, 4],
      {"resistance": [5, 10, 15]},
      {"rules": {"scope": "all_resistances"}}),
    skill("natures_vigor", "Nature's Vigor", "샘물 기운", "expert", "augment", "natures_blessing", [2, 3, 4],
      {"allRegen": [1, 2, 3]},
      {"rules": {"scope": "all_regeneration_stats"}, "unknown": ["allRegen: time unit not specified."]}),
    skill("natures_sting", "Nature's Sting", "가시의 응답", "expert", "augment", "natures_blessing", [2, 3, 4],
      {"chancePercent": [10, 20, 30], "poisonDamage": [30, 40, 50]},
      {"rules": {"trigger": "attack", "damageType": "poison"}}),

    // Master — Rain of Arrows
    skill("rain_of_arrows", "Rain of Arrows", "낙엽 화살비", "master", "spell", null, [4, 5, 6],
      {"offhandDamagePercent": [50, 75, 100], "manaCost": [40, 50, 60], "cooldownSeconds": 15, "arrowCount": null, "impactDelaySeconds": null},
      {"rules": {"weaponScaling": "offHand", "placement": "target_location", "impact": "delayed_sequence"}, "unknown": ["arrowCount: not listed.", "impactDelaySeconds: not listed.", "impactSpacingSeconds: not listed.", "impactRadius: not listed."]}),
    skill("storm_of_arrows", "Storm of Arrows", "넓은 화살그늘", "master", "augment", "rain_of_arrows", [4, 5],
      {"sizeBonusPercent": [50, 100], "manaCostModifierPercent": 20},
      {"unknown": ["sizeMeaning: radius/diameter/area not specified."]}),
    skill("thundercaller", "Thundercaller", "뒤따르는 우레", "master", "augment", "rain_of_arrows", [4, 5, 6],
      {"lightningBolts": 5, "lightningDamage": [50, 100, 200], "damagePerLevel": 4},
      {"rules": {"follows": "arrow_impacts", "damageType": "lightning"}, "unknown": ["lightningSpacingSeconds: not listed."]}),

    // Master — Spectral Wolf Pack
    skill("spectral_wolf_pack", "Spectral Wolf Pack", "달빛 무리", "master", "spell", null, [4, 5, 6],
      {"spectralWolves": [6, 8, 10], "physicalDamagePerStrength": 0.5, "iceDamagePerIntelligence": 0.5, "manaCost": [60, 70, 80], "cooldownSeconds": 20},
      {"rules": {"damageTypes": "physical,ice", "target": "nearby_enemies"}, "unknown": ["wolfLifetimeSeconds: not listed.", "baseDamage: only attribute coefficients are supplied."]}),
    skill("pack_leader", "Pack Leader", "무리를 부르는 벗", "master", "augment", "spectral_wolf_pack", [4, 5, 6],
      {"spectralWolves": [3, 4, 5], "damageBonusPercent": 100, "durationSeconds": 10, "manaCostModifierPercent": 25},
      {"rules": {"additionalEmitter": "wolf_companion", "buffTarget": "wolf_companion"}, "unknown": ["wolfCompanionMinimumRank: functional dependency is clear, minimum rank not listed."], "requires": [{"skillId": "wolf_companion", "rank": null, "relation": "effect_dependency"}]}),
    skill("relentless_hunters", "Relentless Hunters", "끝없는 발자국", "master", "augment", "spectral_wolf_pack", [4, 5],
      {"chancePercent": [20, 40]},
      {"rules": {"trigger": "spectral_wolf_damage", "effect": "seek_new_target"}, "unknown": ["repeatRetargetLimit: not listed."]}),

    // Master — Wicked Sprouts
    skill("wicked_sprouts", "Wicked Sprouts", "돋아나는 가시", "master", "passive", null, [3, 4, 5],
      {"damagePerLevel": [2, 3, 4]},
      {"rules": {"trigger": "spell_cast", "damageType": "physical", "target": "random_nearby_enemies"}, "unknown": ["thornsPerCast: not listed.", "targetRange: not listed."]}),
    skill("rampant_growth", "Rampant Growth", "넘쳐나는 덤불", "master", "augment", "wicked_sprouts", [3, 4, 5],
      {"manaSpentToTrigger": [50, 40, 30]},
      {"rules": {"trigger": "mana_spent", "effect": "extra_thorns"}}),
    skill("regrowth", "Regrowth", "되살아난 뿌리", "master", "augment", "wicked_sprouts", [3, 4],
      {"chancePercent": [25, 50], "lesserEntangleDamage": null},
      {"rules": {"trigger": "enemy_kill", "effect": "lesser_entangle_at_death"}, "unknown": ["lesserEntangleValues: not listed.", "entangleLearnedRequirement: not established."]}),

    // Master — Nature's Scorn
    skill("natures_scorn", "Nature's Scorn", "숲의 노여움", "master", "passive", null, [3, 4, 5],
      {"damageBonusPercent": [10, 20, 30]},
      {"rules": {"damageTypes": "ice,lightning"}}),
    skill("frost_revenant", "Frost Revenant", "서릿발 추적자", "master", "augment", "natures_scorn", [3, 4, 5],
      {"icePenetration": [5, 15, 30]},
      {"rules": {"trigger": "attack_critical_hit", "status": "freeze"}, "unknown": ["freezeDurationSeconds: not listed."]}),
    skill("storm_strider", "Storm Strider", "우렛길 걸음", "master", "augment", "natures_scorn", [3, 4, 5],
      {"lightningPenetration": [5, 15, 30], "damagePerDexterityPercent": 50},
      {"rules": {"trigger": "next_attack_hit_after_dodge_roll", "damageType": "lightning"}, "unknown": ["armedEffectExpirySeconds: not listed."]}),
  ],
});
