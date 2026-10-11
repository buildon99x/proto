// R5a authored runtime mappings. These do not replace UNKNOWN source facts.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const WARRIOR_BALANCE = freeze({
  id: 'emberwatch-warrior-r5a', origin: 'emberwatch_authored_adjustment',
  scope: 'Apprentice nine, Adept sixteen and Expert fifteen handler mappings. Master unsupported; handler tests do not assert normal-input play verification.',
  training: {
    minimumBaseRankForAugment: 1,
    freeStarterRanks: 1,
    allowOnlyWholeStarterSet: true,
    runtimeTiers: ['apprentice', 'adept', 'expert'],
    runtimeSkillIds: ['shield_charge', 'armored_assault', 'mace_swing', 'stunning_strikes', 'crushing_blows', 'shield_block', 'shield_training', 'elemental_bulwark', 'righteous_hammer', 'charge_through', 'shield_of_thorns', 'hammer_of_wrath', 'hammer_of_sundering', 'lay_on_hands', 'invigorating_touch', 'judgement', 'trial_by_fire', 'shackles', 'shining_knight', 'armor_of_faith', 'armored_grace', 'towering_strength', 'battering_ram', 'crushing_might', 'superb_constitution','flames_of_devotion','hammer_of_devotion','cleansing_touch','turn_undead','battle_banner','banner_of_protection','banner_of_zeal','zealous_onslaught','zealous_lance','zealous_shield','inner_flame','flaming_wrath','lawbringer','punish_the_wicked','guilt_by_association'],
    sectionOnlyUnlocks: {
      origin: 'emberwatch_authored_adjustment', tier: 'adept',
      skillIds: ['battering_ram', 'crushing_might', 'superb_constitution'],
      reason: 'Explicit R5a runtime unlock; source section_only evidence remains unconfirmed.'
    },
    exclusiveGroups: {battle_banner_support:['banner_of_protection','banner_of_zeal'],righteous_hammer_damage_type: ['hammer_of_wrath', 'hammer_of_sundering']}
  },
  baseline: {
    physicalDamage: 12, armor: 4, moveSpeed: 180,
    criticalChance: 0.05, criticalMultiplier: 1.5,
    healthRegen: 0, manaRegen: 4, staminaRegen: 10,
    manaRegenDelay: 0.5, staminaRegenDelay: 0.3
  },
  // Only allocated (additional) attributes enter these authored conversions.
  // Starting reference pools therefore remain exactly 55 / 40 / 45.
  perAllocatedAttribute: {
    strength: { hpMax: 2, physicalDamage: 0.6, armor: 0.1 },
    dexterity: { staminaMax: 1, attackSpeed: 0.005, criticalChance: 0.001, staminaRegen: 0.06 },
    intelligence: { manaMax: 2, castSpeed: 0.005, spellPower: 0.01, manaRegen: 0.04 }
  },
  mace: { duration: 0.52, contactFraction: 0.35, minimumDuration: 0.30, range: 76, arcRadians: 2.1, staminaCost: 0, stunSeconds: 0.6 },
  charge: { duration: 0.48, contact: 0.08, speed: 900, distance: 162, radius: 18, stunSeconds: 0.75, unaugmentedDamage: 0 },
  block: { duration: 0, contact: 0, cooldown: 0, staminaCost: 6, holdCostPerSecond: 0, damageReduction: 0.7, moveSlow: 0.5, halfAngleRadians: Math.PI / 2 },
  hammer: { duration: 0.52, contactFraction: 0.44, minimumDuration: 0.30, range: 460, speed: 560, radius: 16, levelOrigin: 1 },
  adept: {
    chargeThroughStunSeconds: 0.25,
    lightningRadius: 64,
    armorBreakAmounts: [5, 10, 20], armorBreakDuration: 3,
    heal: {duration: 0.52, contactFraction: 0.44, minimumDuration: 0.30, radius: 96},
    judgement: {duration: 0.60, contactFraction: 0.45, minimumDuration: 0.30, range: 128, arcRadians: Math.PI * 2 / 3}
  },
  runtimePolicy: {
    origin: 'emberwatch_authored_adjustment',
    equipmentRequirementAttributes: 'reference_base_plus_allocated_only',
    toweringStrengthConversions: {hpMax: false, physicalDamage: false, armor: false},
    equipmentAttributeConversions: false,
    attributeOrder: ['reference_base', 'allocated', 'passive', 'equipment', 'temporary'],
    damageOrder: ['existing_allocated_and_direct_equipment_conversions', 'source_action_coefficient', 'existing_hammer_spell_power', 'sundering_strength_addition', 'global_physical_multiplier_once', 'target_resolution_in_combat'],
    elementalSpellPower: false,
    healingSpellPower: false,
    sunderingSpellPower: false,
    castSpeedActions: ['righteous_hammer', 'lay_on_hands', 'judgement', 'battle_banner', 'zealous_onslaught'],
    physicalPenetration: 'global_battering_ram_plus_action_specific_crushing_blows_once',
    staminaCostOrder: 'source_cost_then_augment_increase_then_armored_grace_for_all_skills_including_successful_block',
    judgementAugmentsCompatible: true,
    exclusivePreview: 'unavailable_opposite_branch_retains_reference_values_without_fabricating_combined_runtime',
    thorns: 'active_or_passive_successful_melee_block_only_after_stamina_payment_no_recursion',
    lightning: 'first_tick_after_interval_live_projectile_radius_and_line_of_sight',
    fireArea: 'first_tick_after_interval_ten_ticks_single_caster_area_replaced_on_contact',
    status: 'armor_break_and_shackles_apply_after_initial_damage_refresh_without_stacking',
    regenBuff: 'one_self_buff_refresh_duration_scale_existing_regen_only',
    targetPolicy: 'lay_on_hands_self_only_in_current_solo_runtime',
    temporaryAttributes: 'none_implemented'
  },
  notes: {
    adeptAttributes: 'Towering Strength changes combat-effective STR and explicit STR-scaled skills only. It does not add HP, armor or mainhand damage; allocated conversions and direct equipment bonuses are unchanged. Equipment requirements use base plus allocated attributes.',
    adeptSpells: 'Heal and elemental ticks retain source amounts without spellPower, physical multiplier or penetration. Cast speed changes spell duration/contact only, never tick interval or cooldown. Sundering adds effective STR after the existing hammer spellPower calculation.',
    baseline: 'Training-kit conversion before the equipment system; no inventory item or equip ownership is granted.',
    damage: 'Runtime damage is pre-target-defense, without random critical resolution. Known source coefficients remain unchanged.',
    block: 'Active block uses a 70% reduction and per-blocked-hit stamina cost, not a flat active block amount. Passive source block is separate.',
    timing: 'Animation duration/contact are independent of source cooldown. Minimum duration preserves readable samples; actual 16–24-frame presentation remains to be visually checked.',
    precision: 'Derived values are normalized to 8 decimal places for display/handler consistency; original source rows are untouched.'
  }
});

