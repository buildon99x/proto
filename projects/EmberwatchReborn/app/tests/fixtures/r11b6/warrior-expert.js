import { WARRIOR_REFERENCE } from './reference-warrior.js';

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

/**
 * Only previously unresolved runtime choices belong here. Known coefficients,
 * costs, cooldowns and rank counts are always read from the preserved catalog.
 * See docs/r11-expert-runtime-contract.md for the authored effect/stop policies.
 * This module supplies calculations, not a purchase/runtime allowlist or a
 * claim that the corresponding combat handlers have passed ordinary play.
 */
export const EXPERT_BALANCE = freeze({
  id: 'emberwatch-warrior-expert-r11b',
  origin: 'emberwatch_authored_adjustment',
  contract: 'docs/r11-expert-runtime-contract.md',
  source: {
    catalog: 'reference-warrior.js',
    url: 'https://wiki.hammerwatch2.com/Paladin',
    evidence: 'preserved_wiki_cache',
    measured: false,
    currentVerified: false,
    unknownsRemainNull: true
  },
  flames: { range: 90, arcRadians: 2.1 },
  returning: { delay: 0, timeout: 2, catchRadius: 18 },
  cleanseStatuses: ['slow', 'stun', 'disarm', 'silence', 'burn', 'poison'],
  banner: { duration: 0.52, minimumDuration: 0.30, contactFraction: 0.44, radius: 128, damage: 0, staminaCost: 0 },
  onslaught: {
    duration: 0.30, minimumDuration: 0.18, tickSeconds: 0.25,
    paymentInterval: 1, manaCost: 0, recurringManaCost: 0,
    speed: 90, range: 80, halfWidth: 18, heroRadius: 11,
    exitRecovery: 0.18, suspendStaminaRegen: true
  },
  lance: { physicalFraction: 0.5, range: 180, arcRadians: Math.PI / 3, fullPowerPulses: 4 },
  flamingWrath: { radius: 64 },
  lawbringer: { duration: 2 },
  guilt: { radius: 80 },
  policy: {
    geometry: 'World-unit center distances and wall LOS; banner and splash edges inclusive.',
    duration: 'Cast speed changes only startup/contact/recovery, never cooldown, pulse or buff clocks.',
    returning: 'Original shot speed/radius/damage; one zero-delay turn, separate per-leg hits, live-hero homing and wall stop.',
    cleanse: 'At successful heal contact remove registered negative hero statuses only; no cost, cooldown or recovery reset.',
    undead: 'Use explicit undead foe tag and the existing self-heal radius; no inferred taxonomy or spellPower conversion.',
    banner: 'One transient solo aura; outgoing bonuses snapshot on later acceptance and incoming defense is live.',
    onslaughtDamage: 'Interpret the source physical row as damage per active second, split into four equal pulses; no spellPower conversion.',
    onslaughtMana: 'Original MP cost is unknown. Emberwatch explicitly charges zero MP at acceptance and renewal.',
    onslaughtStamina: 'One source row at acceptance and active 1/2/3 seconds. Shield increase precedes universal Grace once; no payment at 4.',
    onslaughtBudget: 'Maximum channel budget excludes separately successful shield block payments; no stamina regeneration during channel.',
    lance: 'Split the source maximum row equally; physical multiplier affects the physical half once. Emberwatch R11B: completed paid pulses1/2/3/4 release25/50/75/100 percent; safety cancellation emits none.',
    innerFlame: 'Fire damage multiplier and additive fire-resistance percentage points; refresh after the accepted spell snapshots its previous buff.',
    spellCritical: 'Base critical chance plus Flaming Wrath on direct spell-root hits; terminal secondaries never crit or recurse.',
    lawbringer: 'One chance per qualified incoming attack; refresh both enemy disarm and silence for two active seconds.',
    punish: 'One live-target multiplier for disarm OR silence, never two for both statuses.',
    guilt: 'Terminal physical splash uses final mainhand basis, not rank-scaled mace damage; source victim excluded.',
    unlistedCompatibility: 'Authored compatible subject to parent purchase; official Banner and existing hammer exclusivity remain external gates.'
  }
});

const rows = new Map(WARRIOR_REFERENCE.skills.map(row => [row.id, row]));
const tidy = value => Number(value.toFixed(8));
const rankOf = (character, id) => {
  if (!Object.hasOwn(character.skills, id)) return 0;
  const rank = character.skills[id];
  if (!Number.isSafeInteger(rank) || rank < 1 || rank > rows.get(id).upgradeCosts.length) {
    throw new RangeError(`Invalid reference rank: ${id} ${rank}`);
  }
  return rank;
};

// A source unknown must never silently become zero in executable math.
function rankValue(id, key, rank) {
  const row = rows.get(id);
  if (!Number.isSafeInteger(rank) || rank < 1 || rank > row.upgradeCosts.length) {
    throw new RangeError(`Invalid reference rank: ${id} ${rank}`);
  }
  const values = row.rankValues[key];
  const value = Array.isArray(values) ? values[rank - 1] : values;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Unresolved numeric reference: ${id}.${key}`);
  }
  return value;
}

/**
 * Deterministically decorate fresh derived stats, without changing character or
 * reference data. Call exactly once after existing mappings and BEFORE growth's
 * universal stamina-cost loop. Only staminaCost remains pre-Grace; the display
 * fullChannelStaminaCost already includes Grace and excludes shield-hit costs.
 * Temporary aura/buff effects are deliberately absent from permanent stats.
 */
export function applyExpertStats(stats, character) {
  const rank = id => rankOf(character, id);
  const value = (id, key) => rankValue(id, key, rank(id));
  const action = stats.actions;
  const B = EXPERT_BALANCE;

  if (action.mace_swing?.learned) {
    action.mace_swing.flameArc = rank('flames_of_devotion') ? {
      rank: rank('flames_of_devotion'),
      damage: tidy(stats.intelligence * value('flames_of_devotion', 'damagePerIntelligence')),
      damageType: 'fire', range: B.flames.range, arcRadians: B.flames.arcRadians
    } : null;
  }
  if (action.righteous_hammer?.learned) {
    action.righteous_hammer.returning = rank('hammer_of_devotion') ? { ...B.returning } : null;
    if (rank('hammer_of_devotion')) {
      action.righteous_hammer.cooldown = tidy(action.righteous_hammer.cooldown + value('hammer_of_devotion', 'cooldownAddSeconds'));
    }
  }
  if (action.lay_on_hands?.learned) {
    action.lay_on_hands.cleanse = !!rank('cleansing_touch');
    if (rank('cleansing_touch')) {
      action.lay_on_hands.cooldown = tidy(action.lay_on_hands.cooldown + value('cleansing_touch', 'cooldownAddSeconds'));
    }
    action.lay_on_hands.undead = rank('turn_undead') ? {
      rank: rank('turn_undead'), damage: value('turn_undead', 'pureDamage'),
      damageType: 'pure', radius: action.lay_on_hands.radius
    } : null;
  }

  action.battle_banner = { learned: false };
  if (rank('battle_banner')) {
    const duration = tidy(Math.max(B.banner.minimumDuration, B.banner.duration / stats.castSpeed));
    action.battle_banner = {
      learned: true, rank: rank('battle_banner'),
      augmentRanks: { banner_of_protection: rank('banner_of_protection'), banner_of_zeal: rank('banner_of_zeal') },
      damage: B.banner.damage, manaCost: value('battle_banner', 'manaCost'), staminaCost: B.banner.staminaCost,
      cooldown: value('battle_banner', 'cooldownSeconds'), duration,
      contact: tidy(duration * B.banner.contactFraction), range: B.banner.radius, radius: B.banner.radius,
      buffDuration: value('battle_banner', 'durationSeconds'),
      damageMultiplier: tidy(1 + value('battle_banner', 'damageIncreasePercent') / 100),
      attackSpeedMultiplier: tidy(1 + value('battle_banner', 'attackSpeedIncreasePercent') / 100),
      damageTakenMultiplier: rank('banner_of_protection') ? tidy(1 + value('banner_of_protection', 'damageTakenChangePercent') / 100) : 1,
      castSpeedMultiplier: rank('banner_of_zeal') ? tidy(1 + value('banner_of_zeal', 'castSpeedIncreasePercent') / 100) : 1,
      manaCostMultiplier: rank('banner_of_zeal') ? tidy(1 + value('banner_of_zeal', 'manaCostChangePercent') / 100) : 1
    };
  }

  action.zealous_onslaught = { learned: false };
  if (rank('zealous_onslaught')) {
    const duration = tidy(Math.max(B.onslaught.minimumDuration, B.onslaught.duration / stats.castSpeed));
    const channelDuration = value('zealous_onslaught', 'maxChannelSeconds');
    const maxPayments = Math.ceil(channelDuration / B.onslaught.paymentInterval);
    const staminaCost = tidy(value('zealous_onslaught', 'staminaCost') * (rank('zealous_shield') ? 1 + value('zealous_shield', 'staminaCostIncreasePercent') / 100 : 1));
    action.zealous_onslaught = {
      learned: true, rank: rank('zealous_onslaught'), channel: true,
      augmentRanks: { zealous_lance: rank('zealous_lance'), zealous_shield: rank('zealous_shield') },
      damage: tidy(value('zealous_onslaught', 'physicalDamage') * B.onslaught.tickSeconds * stats.physicalDamageMultiplier),
      damageType: 'physical', armorPenetration: stats.armorPenetration,
      manaCost: B.onslaught.manaCost, recurringManaCost: B.onslaught.recurringManaCost, staminaCost,
      fullChannelStaminaCost: tidy(tidy(staminaCost * stats.staminaCostMultiplier) * maxPayments),
      cooldown: value('zealous_onslaught', 'cooldownSeconds'), duration, contact: duration,
      channelDuration, tickSeconds: B.onslaught.tickSeconds,
      paymentInterval: B.onslaught.paymentInterval, maxPayments,
      maxPulses: Math.floor(channelDuration / B.onslaught.tickSeconds),
      speed: B.onslaught.speed, range: B.onslaught.range, halfWidth: B.onslaught.halfWidth,
      exitRecovery: B.onslaught.exitRecovery, suspendStaminaRegen: B.onslaught.suspendStaminaRegen,
      guard: !!rank('zealous_shield'),
      lance: rank('zealous_lance') ? {
        rank: rank('zealous_lance'),
        physicalDamage: tidy(value('zealous_lance', 'damage') * B.lance.physicalFraction * stats.physicalDamageMultiplier),
        fireDamage: tidy(value('zealous_lance', 'damage') * (1 - B.lance.physicalFraction)),
        armorPenetration: stats.armorPenetration, range: B.lance.range, arcRadians: B.lance.arcRadians, fullPowerPulses: B.lance.fullPowerPulses
      } : null
    };
  }

  stats.innerFlame = rank('inner_flame') ? {
    rank: rank('inner_flame'), duration: value('inner_flame', 'durationSeconds'),
    fireDamageMultiplier: tidy(1 + value('inner_flame', 'fireDamageIncreasePercent') / 100),
    fireResistanceBonus: value('inner_flame', 'fireResistanceIncreasePercent')
  } : null;
  stats.flamingWrath = rank('flaming_wrath') && rank('inner_flame') ? {
    rank: rank('flaming_wrath'), spellCriticalChanceBonus: value('flaming_wrath', 'spellCritChanceBonusPercent') / 100,
    damage: value('flaming_wrath', 'fireDamage'), damageType: 'fire',
    radius: B.flamingWrath.radius, cooldown: value('flaming_wrath', 'effectCooldownSeconds')
  } : null;
  stats.lawbringer = rank('lawbringer') ? {
    rank: rank('lawbringer'), chance: value('lawbringer', 'chancePercent') / 100, duration: B.lawbringer.duration
  } : null;
  stats.punishMultiplier = rank('punish_the_wicked') && rank('lawbringer') ? tidy(1 + value('punish_the_wicked', 'damageIncreasePercent') / 100) : 1;
  stats.guilt = rank('guilt_by_association') && rank('lawbringer') ? {
    rank: rank('guilt_by_association'), damage: tidy(stats.physicalDamage * value('guilt_by_association', 'mainhandDamagePercent') / 100),
    damageType: 'physical', radius: B.guilt.radius,
    cooldown: value('guilt_by_association', 'effectCooldownSeconds'), armorPenetration: stats.armorPenetration
  } : null;
  return stats;
}

/** Derived-value projection only; caller owns the purchase/tier/branch gates. */
export function expertPreview(id, stats) {
  const actions = stats.actions;
  const mappings = {
    flames_of_devotion: () => ({ flameArc: actions.mace_swing?.flameArc ?? null }),
    hammer_of_devotion: () => ({ hammerCooldown: actions.righteous_hammer?.cooldown, returning: actions.righteous_hammer?.returning ?? null }),
    cleansing_touch: () => ({ healCooldown: actions.lay_on_hands?.cooldown, cleanse: actions.lay_on_hands?.cleanse ?? false, cleansableStatuses: [...EXPERT_BALANCE.cleanseStatuses] }),
    turn_undead: () => ({ undead: actions.lay_on_hands?.undead ?? null }),
    battle_banner: () => actions.battle_banner,
    banner_of_protection: () => ({ damageTakenMultiplier: actions.battle_banner?.damageTakenMultiplier, radius: actions.battle_banner?.radius, duration: actions.battle_banner?.buffDuration }),
    banner_of_zeal: () => ({ castSpeedMultiplier: actions.battle_banner?.castSpeedMultiplier, manaCostMultiplier: actions.battle_banner?.manaCostMultiplier, radius: actions.battle_banner?.radius, duration: actions.battle_banner?.buffDuration }),
    zealous_onslaught: () => actions.zealous_onslaught,
    zealous_lance: () => ({ lance: actions.zealous_onslaught?.lance ?? null }),
    zealous_shield: () => ({ guard: actions.zealous_onslaught?.guard ?? false, channelStaminaCost: actions.zealous_onslaught?.staminaCost, fullChannelStaminaCost: actions.zealous_onslaught?.fullChannelStaminaCost, blockStaminaCost: actions.shield_block?.staminaCost }),
    inner_flame: () => ({ innerFlame: stats.innerFlame }),
    flaming_wrath: () => ({ flamingWrath: stats.flamingWrath }),
    lawbringer: () => ({ lawbringer: stats.lawbringer }),
    punish_the_wicked: () => ({ punishMultiplier: stats.punishMultiplier, targetHasAnyStatus: ['disarm', 'silence'] }),
    guilt_by_association: () => ({ guilt: stats.guilt })
  };
  return Object.hasOwn(mappings, id) ? structuredClone(mappings[id]()) : null;
}

// Pure accepted-spec projection used by damage and UI. Live channels are never
// serialized, so an old save cannot restore a pre-calibration full-power hit.
export function lanceReleaseScale(lance,pulses){
 const cap=lance?.fullPowerPulses;
 if(!Number.isSafeInteger(cap)||cap<1||!Number.isSafeInteger(pulses)||pulses<1)return 0;
 return Math.min(1,pulses/cap);
}
