// Reference catalog only: no behavior is enabled or gameplay fidelity claimed.
// Numeric rows are cached community facts, not current-build measurements.
// Rank arrays preserve source order. Scalars are single source cells, not inferred ranks.
// Null is unresolved; never coerce it to zero or silently pad a mismatched rank array.
const SOURCE = Object.freeze({
  kind: 'wiki_cached',
  url: 'https://wiki.hammerwatch2.com/Wizard',
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
    behaviorId: `reference.mage.${id}`,
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

export const MAGE_REFERENCE = freeze({
  classId: "mage",
  referenceClassId: "wizard",
  displayName: "마법사",
  game: "Hammerwatch II (2023)",
  catalogStatus: "reference_only",
  implementationStage: "M4_deferred",
  displayNameProvenance: "Original Emberwatch Korean working labels; not an official translation.",
  unknown: ["Current game build and rank-by-rank behavior are not measured.", "Trainer/NPC promotion requirements and rank-level purchase gates are unresolved.", "Animation, collision, cancel timing, numeric rounding and modifier order are unresolved.", "An omitted exclusiveGroup means no sourced exclusion, not proven compatibility."],
  source: { ...SOURCE, section: "Abilities: all four tiers" },
  skills: [

    // Apprentice — Phase Shift
    skill("phase_shift", "Phase Shift", "틈새 걸음", "apprentice", "dash", null, [0, 1, 2, 3, 4],
      {"staminaCost": [10, 12, 14, 16, 18], "cooldownSeconds": [3, 2.5, 2, 1.5, 1]},
      {"rules": {"passesThroughEnemies": true, "status": "slow"}, "unknown": ["slowDurationSeconds: not listed.", "travelDistance: not listed.", "invulnerabilityWindow: not established."]}),
    skill("mana_surge", "Mana Surge", "잔향의 여유", "adept", "augment", "phase_shift", [2, 3],
      {"spellCostModifierPercent": [-25, -50]},
      {"rules": {"trigger": "phase_shift", "scope": "next_spell"}}),
    skill("mirror_image", "Mirror Image", "흐린 발자취", "expert", "augment", "phase_shift", [3, 4, 5],
      {"mirrorImageDurationSeconds": [3, 4, 5], "mirrorImageEvasionPercent": [40, 50, 60], "staminaCostModifierPercent": 50},
      {"rules": {"trigger": "phase_shift", "dismissOnDamage": true}, "unknown": ["imageAI: not described."]}),

    // Apprentice — Arcane Bolt
    skill("arcane_bolt", "Arcane Bolt", "잿빛 섬광탄", "apprentice", "mainhand", null, [0, 1, 2, 3, 4, 5],
      {"mainhandDamagePercent": [100, 120, 140, 160, 180, 200], "cooldownSeconds": 0.2},
      {"rules": {"weaponSlot": "mainHand", "projectileImpact": "explosion"}, "unknown": ["explosionRadius: not listed.", "projectileSpeed: not listed."]}),
    skill("empowered_bolt", "Empowered Bolt", "퍼지는 불씨", "apprentice", "augment", "arcane_bolt", [1, 2, 3, 4],
      {"sizeBonusPercent": [50, 100, 200, 300]},
      {"unknown": ["sizeMeaning: radius/diameter/area not specified."]}),
    skill("focused_bolt", "Focused Bolt", "곧은 빛줄기", "apprentice", "augment", "arcane_bolt", [1, 2, 3, 4],
      {"projectileRangeAndSpeedBonusPercent": [10, 20, 30, 40]},
      {"unknown": ["baseProjectileRangeAndSpeed: not listed."]}),
    skill("wand_mastery", "Wand Mastery", "연속 점화", "master", "augment", "arcane_bolt", [4, 5],
      {"projectiles": [1, 2], "manaCostPercent": [2.5, 5]},
      {"rules": {"firePattern": "successive_projectiles", "addsManaCost": true}, "unknown": ["projectiles: source prose says additional; total-shot interpretation needs measurement.", "manaCostPercent: denominator not specified.", "shotSpacingSeconds: not listed."]}),

    // Apprentice — Arcane Grimoire
    skill("arcane_grimoire", "Arcane Grimoire", "봉인서 펼치기", "apprentice", "offhand", null, [0, 1, 2, 3, 4, 5],
      {"grimoireDamagePercent": [100, 120, 140, 160, 180, 200], "manaCost": null, "cooldownSeconds": null},
      {"rules": {"weaponSlot": "offHand", "actionSource": "equipped_grimoire"}, "unknown": ["grimoireSpells: equipped-item spell catalog is not supplied.", "manaCost: item-dependent values not listed.", "cooldownSeconds: item-dependent values not listed."]}),
    skill("grimoire_scholar", "Grimoire Scholar", "잃은 문장 해독", "apprentice", "augment", "arcane_grimoire", [1, 2, 3],
      {"manaCostModifierPercent": [-10, -20, -30], "cooldownModifierPercent": [-10, -25, -50]},
      {}),
    skill("somatic_reservoir", "Somatic Reservoir", "몸에 새긴 문장", "adept", "augment", "arcane_grimoire", [2, 3],
      {"manaThresholdPercent": [30, 40, 50], "staminaConversionRate": null},
      {"rules": {"belowManaThreshold": "replace_mana_with_stamina"}, "unknown": ["rankArity: two upgrade costs but three mana thresholds; no rank alignment is assumed.", "staminaConversionRate: not listed.", "manaThresholdPercent: denominator and boundary comparison need verification."], "rankArityDiscrepancies": [{"field": "manaThresholdPercent", "costCount": 2, "valueCount": 3, "rankAlignment": null}]}),

    // Apprentice — Barrier
    skill("barrier", "Barrier", "등불 장막", "apprentice", "spell", null, [0, 2, 3],
      {"damageTakenModifierPercent": [-40, -45, -50], "durationSeconds": [5, 6, 7], "manaCost": [15, 30, 45], "cooldownSeconds": 16},
      {}),
    skill("flame_shield", "Flame Shield", "장막의 잔열", "adept", "augment", "barrier", [2, 3, 4],
      {"manaCostModifierPercent": 25, "fireDamage": null, "tickIntervalSeconds": null},
      {"exclusiveGroup": "barrier_form", "rules": {"damageType": "fire", "target": "nearby_enemies"}, "unknown": ["fireDamage: not listed.", "tickIntervalSeconds: not listed.", "radius: not listed."]}),
    skill("ice_block", "Ice Block", "겹서리 장막", "adept", "augment", "barrier", [2, 3, 4],
      {"blockInstances": [3, 4, 5], "blockAmount": [20, 40, 60], "cooldownBonusSeconds": 8},
      {"exclusiveGroup": "barrier_form", "rules": {"onLayerBrokenStatus": "minor_freeze", "dismissWhenLayersDepleted": true}, "unknown": ["blockSequence: interaction with base reduction and overflow is not specified.", "freezeDurationSeconds: not listed."]}),
    skill("reactive_barrier", "Reactive Barrier", "장막의 반향", "adept", "augment", "barrier", [2, 3, 4],
      {"lightningDamage": [15, 25, 40], "manaCostModifierPercent": 25},
      {"exclusiveGroup": "barrier_form", "rules": {"trigger": "attack_or_damage_taken", "damageType": "lightning", "target": "random_nearby_enemy"}, "unknown": ["procCooldownSeconds: not listed.", "targetRange: not listed."]}),

    // Adept — Arc Lightning
    skill("arc_lightning", "Arc Lightning", "갈래 번갯줄", "adept", "spell", null, [2, 3, 4, 5],
      {"chains": [3, 4, 5, 6], "lightningDamage": [120, 140, 160, 180], "damagePerLevel": 2, "damagePerChainModifierPercent": -10, "manaCost": [35, 40, 45, 50], "cooldownSeconds": 2},
      {"rules": {"damageType": "lightning", "projectilePattern": "chain"}, "unknown": ["chainDamageFormula: compounding versus additive loss not specified.", "chainRange: not listed."]}),
    skill("overcharge", "Overcharge", "넘치는 전류", "adept", "augment", "arc_lightning", [2, 3, 4],
      {"critChancePercent": 10, "critDamageBonusPercent": [10, 20, 40], "manaCostModifierPercent": 25},
      {}),
    skill("channel_lightning", "Channel Lightning", "이어지는 전류", "expert", "augment", "arc_lightning", [3, 4],
      {"maxChannelSeconds": 3, "tickIntervalSeconds": [0.5, 0.4], "cooldownBonusSeconds": 4},
      {"rules": {"changesActionTo": "channel"}, "unknown": ["channelManaSchedule: not listed."]}),

    // Adept — Haste
    skill("haste", "Haste", "짧아진 순간", "adept", "spell", null, [2, 3, 4],
      {"durationSeconds": [8, 9, 10], "movementSpeedBonusPercent": 30, "attackSpeedBonusPercent": [30, 40, 50], "castSpeedBonusPercent": [30, 40, 50], "skillStaminaCostPercent": 5, "manaCost": [50, 70, 90], "cooldownSeconds": 30},
      {"rules": {"endBelowStaminaPercent": 5, "extraStaminaOn": "attacks_and_spells"}, "unknown": ["skillStaminaCostPercent: denominator not explicit."]}),
    skill("blur", "Blur", "흐려진 윤곽", "adept", "augment", "haste", [2, 3, 4],
      {"evasionPercent": [10, 20, 30]},
      {}),
    skill("energy_surge", "Energy Surge", "되살아난 호흡", "adept", "augment", "haste", [2, 3, 4],
      {"staminaRestoredPercent": [2.5, 5, 10]},
      {"rules": {"trigger": "critical_hit", "during": "haste"}, "unknown": ["staminaRestoredPercent: denominator not explicit."]}),
    skill("temporal_shift", "Temporal Shift", "느려진 둘레", "expert", "augment", "haste", [3, 4, 5],
      {"auraRangeSourceUnits": [40, 60, 90], "cooldownBonusSeconds": 10},
      {"rules": {"status": "slow", "during": "haste"}, "unknown": ["auraRangeSourceUnits: world-unit conversion not specified.", "slowDurationSeconds: not listed."]}),

    // Adept — Arcane Intellect
    skill("arcane_intellect", "Arcane Intellect", "기록자의 통찰", "adept", "passive", null, [1, 2, 3],
      {"intelligence": [5, 10, 15]},
      {}),
    skill("arcane_physique", "Arcane Physique", "돌에 새긴 지식", "adept", "augment", "arcane_intellect", [1, 2, 3],
      {"strength": [5, 10, 15], "manaRegenPerStrength": [0.01, 0.015, 0.02]},
      {"exclusiveGroup": "arcane_attribute", "unknown": ["manaRegenPerStrength: time unit and stat order not specified."]}),
    skill("arcane_finesse", "Arcane Finesse", "바람에 새긴 지식", "adept", "augment", "arcane_intellect", [1, 2, 3],
      {"dexterity": [5, 10, 15], "manaRegenPerDexterity": [0.01, 0.015, 0.02]},
      {"exclusiveGroup": "arcane_attribute", "unknown": ["manaRegenPerDexterity: time unit and stat order not specified."]}),

    // Adept — Elemental Ward
    skill("elemental_ward", "Elemental Ward", "삼빛 수호문", "adept", "passive", null, [1, 2, 3],
      {"resistances": [5, 10, 20]},
      {"rules": {"resistanceTypes": "fire,ice,lightning"}}),
    skill("control_fire", "Control Fire", "잔불 길들이기", "expert", "augment", "elemental_ward", [2, 3, 4],
      {"conversionRate": [0.5, 1]},
      {"rules": {"conversion": "fire_resistance_to_fire_penetration"}, "unknown": ["rankArity: three upgrade costs but two conversion rates; missing position and value unknown."], "rankArityDiscrepancies": [{"field": "conversionRate", "costCount": 3, "valueCount": 2, "rankAlignment": null}]}),
    skill("control_ice", "Control Ice", "서리 길들이기", "expert", "augment", "elemental_ward", [2, 3, 4],
      {"conversionRate": [0.5, 1]},
      {"rules": {"conversion": "ice_resistance_to_ice_penetration"}, "unknown": ["rankArity: three upgrade costs but two conversion rates; missing position and value unknown."], "rankArityDiscrepancies": [{"field": "conversionRate", "costCount": 3, "valueCount": 2, "rankAlignment": null}]}),
    skill("control_lightning", "Control Lightning", "번개 길들이기", "expert", "augment", "elemental_ward", [2, 3, 4],
      {"conversionRate": [0.5, 1]},
      {"rules": {"conversion": "lightning_resistance_to_lightning_penetration"}, "unknown": ["rankArity: three upgrade costs but two conversion rates; missing position and value unknown."], "rankArityDiscrepancies": [{"field": "conversionRate", "costCount": 3, "valueCount": 2, "rankAlignment": null}]}),

    // Expert — Frost Nova
    skill("frost_nova", "Frost Nova", "서릿살 고리", "expert", "spell", null, [3, 4, 5, 6],
      {"frostShards": 12, "iceDamage": [30, 50, 80, 120], "damagePerLevel": 1, "manaCost": [45, 50, 55, 60], "cooldownSeconds": 3},
      {"rules": {"damageType": "ice", "projectilePattern": "radial"}}),
    skill("shatter", "Shatter", "깨진 고리", "expert", "augment", "frost_nova", [3, 4, 5],
      {"frostShards": 6, "chancePercent": [25, 50, 75], "manaCostModifierPercent": 25, "effectCooldownSeconds": 1},
      {"rules": {"trigger": "frost_nova_kill", "effect": "secondary_nova"}, "unknown": ["secondaryNovaDamage: not listed."]}),
    skill("flash_freeze", "Flash Freeze", "백색 파문", "expert", "augment", "frost_nova", [3, 4, 5],
      {"statusEffect": ["minor_freeze", "freeze", "greater_freeze"], "cooldownBonusSeconds": 3},
      {"unknown": ["freezeDurations: status durations not listed.", "shockwaveRadius: not listed."]}),

    // Expert — Wall of Flames
    skill("wall_of_flames", "Wall of Flames", "잿불 울타리", "expert", "spell", null, [3, 4, 5],
      {"durationSourceUnits": [8, 11, 14], "manaCost": [60, 75, 90], "cooldownSeconds": 20, "fireDamage": [20, 40, 60], "tickIntervalSeconds": 0.5},
      {"rules": {"damageType": "fire", "shape": "wall"}, "unknown": ["durationSourceUnits: source omits a unit; seconds are not assumed.", "wallDimensions: not listed."]}),
    skill("volatile_flames", "Volatile Flames", "튀어 오르는 재", "expert", "augment", "wall_of_flames", [3, 4, 5],
      {"chancePercent": [25, 50, 75], "manaCostModifierPercent": 25, "explosionDamage": null},
      {"exclusiveGroup": "flame_wall_form", "rules": {"trigger": "wall_damage", "effect": "fire_explosion"}, "unknown": ["explosionDamage: not listed.", "explosionRadius: not listed."]}),
    skill("wall_of_alteration", "Wall of Alteration", "침묵의 경계", "master", "augment", "wall_of_flames", [4],
      {"manaCostModifierPercent": 25, "cooldownBonusSeconds": 5},
      {"exclusiveGroup": "flame_wall_form", "rules": {"replacementDamageType": "pure", "statuses": "slow,silence"}, "unknown": ["statusDurations: not listed."], "sourceNotes": ["Exclusivity is explicitly stated on the paired Volatile Flames entry."]}),

    // Expert — Incanter's Cadence
    skill("incanters_cadence", "Incanter's Cadence", "문장의 박자", "expert", "passive", null, [2, 3, 4],
      {"manaCostPerStackModifierPercent": [-3, -4, -5], "castSpeedPerStackBonusPercent": [3, 4, 5], "maxStacks": 8, "stackDurationSeconds": 3},
      {"rules": {"stackTrigger": "spell_cast"}, "unknown": ["stackRefreshRule: independent versus shared duration not specified."]}),
    skill("rising_crescendo", "Rising Crescendo", "높아지는 울림", "expert", "augment", "incanters_cadence", [2, 3],
      {"spellCritChancePerStackPercent": [2, 3]},
      {}),
    skill("intensified_intonation", "Intensified Intonation", "짙어지는 울림", "expert", "augment", "incanters_cadence", [2, 3],
      {"spellDamagePerStackBonusPercent": [2.5, 5], "stackDurationSeconds": [2.5, 2]},
      {}),
    skill("alleviating_rhythm", "Alleviating Rhythm", "고르는 숨결", "expert", "augment", "incanters_cadence", [2, 3, 4],
      {"healthRegenPerStack": [0.5, 1, 1.5]},
      {"unknown": ["healthRegenPerStack: time unit not specified."]}),

    // Expert — Arcanist
    skill("arcanist", "Arcanist", "유랑 기록자", "expert", "passive", null, [2, 3, 4],
      {"slowEffectModifierPercent": [-30, -50, -70]},
      {"rules": {"reducedPenalty": "attack_movement_slow", "affectedActions": "arcane_bolt,arcane_grimoire"}, "unknown": ["postPatchBehavior: official 2023-09-19 fixes require current-build verification."], "sourceNotes": ["Official 2023-09-19 patch reports a correction; cached rows have no build stamp."], "officialEvidence": ["https://maximument.com/news/hwiipatchnotes/"]}),
    skill("arcane_safeguard", "Arcane Safeguard", "마지막 보호문", "expert", "augment", "arcanist", [2, 3, 4],
      {"blockAmount": [30, 40, 50], "manaLostPerDamageBlocked": [2, 1.5, 1], "lowHealthThresholdPercent": null},
      {"rules": {"trigger": "low_health", "blockConsumes": "mana"}, "unknown": ["lowHealthThresholdPercent: not listed.", "overflowDamageRule: not listed."]}),
    skill("arcane_amplification", "Arcane Amplification", "문장의 공명", "expert", "augment", "arcanist", [2, 3, 4],
      {"critDamageBonusPercent": [25, 50, 75]},
      {"rules": {"affectedActions": "arcane_bolt,arcane_grimoire"}, "unknown": ["postPatchBehavior: official 2023-09-19 fixes require current-build verification."], "sourceNotes": ["Official 2023-09-19 patch reports a correction; cached rows have no build stamp."], "officialEvidence": ["https://maximument.com/news/hwiipatchnotes/"]}),

    // Master — Wizard's Duplicate
    skill("wizards_duplicate", "Wizard's Duplicate", "등불 분신", "master", "spell", null, [4, 5, 6],
      {"mainhandDamagePercent": 50, "hitsToDestroy": [5, 7, 9], "duplicateDurationSeconds": [30, 35, 40], "duplicateEvasionPercent": 50, "manaCost": [40, 50, 60], "cooldownSeconds": 15},
      {"rules": {"summonAttack": "arcane_bolt", "weaponScaling": "mainHand", "target": "nearby_enemies"}, "unknown": ["fireIntervalSeconds: not listed.", "augmentInheritance: not listed."]}),
    skill("wizards_army", "Wizard's Army", "여럿의 그림자", "master", "augment", "wizards_duplicate", [4, 5],
      {"maxDuplicates": [2, 3], "cooldownBonusSeconds": [5, 10]},
      {"exclusiveGroup": "duplicate_form"}),
    skill("improved_duplicate", "Improved Duplicate", "배우는 그림자", "master", "augment", "wizards_duplicate", [4, 5],
      {"learnedSpell": ["arc_lightning", "frost_nova"], "duplicateSpellDamagePercent": 50, "manaCostModifierPercent": 25},
      {"exclusiveGroup": "duplicate_form", "rules": {"learnedSpellRank": "base", "damageScope": "duplicate_spells"}, "unknown": ["spellCooldowns: not listed.", "learnedSpellAccumulation: per-rank list does not establish replacement versus accumulation."]}),

    // Master — Meteor
    skill("meteor", "Meteor", "낙화의 별", "master", "spell", null, [4, 5, 6],
      {"damage": [400, 500, 600], "damagePerLevel": [2, 4, 6], "manaCost": [70, 90, 110], "cooldownSeconds": 25, "impactDelaySeconds": null, "fireDamageSharePercent": null, "physicalDamageSharePercent": null},
      {"rules": {"damageTypes": "fire,physical", "placement": "target_location", "impact": "delayed"}, "unknown": ["damageSplit: fire versus physical allocation not listed.", "impactDelaySeconds: not listed.", "impactRadius: not listed."], "sourceNotes": ["Clean, contiguous Meteor rows recovered by targeted cached search on 2026-10-08; damage split remains unknown."]}),
    skill("meteor_shower", "Meteor Shower", "잇따른 낙화", "master", "augment", "meteor", [4, 5],
      {"meteors": [3, 5], "meteorDamagePercent": [80, 60], "manaCostModifierPercent": [25, 50]},
      {"rules": {"impactPattern": "successive_same_location"}, "unknown": ["meteors: total versus additional interpretation is not explicit.", "impactSpacingSeconds: not listed."]}),
    skill("comet", "Comet", "서리별 낙하", "master", "augment", "meteor", [4],
      {"iceDamageSharePercent": null, "physicalDamageSharePercent": null},
      {"rules": {"replacementDamageTypes": "ice,physical", "status": "freeze"}, "unknown": ["damageSplit: ice versus physical allocation not listed.", "freezeDurationSeconds: not listed."]}),

    // Master — Weaver of Time
    skill("weaver_of_time", "Weaver of Time", "시간의 매듭", "master", "passive", null, [3, 4, 5],
      {"chancePercent": [5, 10, 15], "effectCooldownSeconds": 10},
      {"rules": {"trigger": "spell_cast", "resets": "other_spell_cooldowns"}}),
    skill("prolonged_agony", "Prolonged Agony", "느린 상처", "master", "augment", "weaver_of_time", [3, 4, 5],
      {"damageBonusPercent": [10, 20, 30]},
      {"rules": {"targetStatus": "slow"}}),
    skill("shockwave", "Shockwave", "멎은 순간의 파문", "master", "augment", "weaver_of_time", [3, 4, 5],
      {"pureDamage": [40, 60, 80], "chancePercent": [15, 20, 25]},
      {"rules": {"trigger": "attack_slowed_enemy", "damageType": "pure"}, "unknown": ["shockwaveRadius: not listed."]}),

    // Master — Elemental Flux
    skill("elemental_flux", "Elemental Flux", "삼빛 순환", "master", "passive", null, [3, 4],
      {"damageBonusPercent": [25, 50], "cycleIntervalSeconds": 8},
      {"rules": {"elementCycle": "fire,ice,lightning", "buffScope": "active_element"}, "unknown": ["postPatchBehavior: official 2023-09-19 lightning fix requires current-build verification.", "procCounterReset: cycle transition accounting not listed."], "sourceNotes": ["Official 2023-09-19 patch reports a correction; cached rows have no build stamp."], "officialEvidence": ["https://maximument.com/news/hwiipatchnotes/"]}),
    skill("fire_ascendency", "Fire Ascendency", "긴 잔불", "master", "augment", "elemental_flux", [3, 4],
      {"manaSpentToTrigger": 25, "fireCycleDurationBonusSeconds": [4, 8]},
      {"exclusiveGroup": "elemental_ascendency", "rules": {"activeElement": "fire", "triggeredSpell": "wall_of_flames", "oneWallInstance": true}, "unknown": ["triggeredSpellCostAndModifiers: not listed."], "requires": [{"skillId": "wall_of_flames", "rank": 1, "relation": "effect_dependency"}]}),
    skill("ice_ascendency", "Ice Ascendency", "긴 서리", "master", "augment", "elemental_flux", [3, 4],
      {"manaSpentToTrigger": 75, "iceCycleDurationBonusSeconds": [4, 8]},
      {"exclusiveGroup": "elemental_ascendency", "rules": {"activeElement": "ice", "triggeredSpell": "frost_nova"}, "unknown": ["triggeredSpellCostAndModifiers: not listed."], "requires": [{"skillId": "frost_nova", "rank": 1, "relation": "effect_dependency"}]}),
    skill("lightning_ascendency", "Lightning Ascendency", "긴 번개", "master", "augment", "elemental_flux", [3, 4],
      {"manaSpentToTrigger": 50, "lightningCycleDurationBonusSeconds": [4, 8]},
      {"exclusiveGroup": "elemental_ascendency", "rules": {"activeElement": "lightning", "triggeredSpell": "arc_lightning"}, "unknown": ["triggeredSpellCostAndModifiers: not listed."], "requires": [{"skillId": "arc_lightning", "rank": 1, "relation": "effect_dependency"}]}),
  ],
});
