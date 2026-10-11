// Emberwatch-authored R1 tuning, not a Hammerwatch II XP table.
// Keep reference-core.js and reference-warrior.js byte-identical to the baseline.
const bands = [
  { from: 1, to: 4, first: 100, step: 50 },
  { from: 5, to: 14, first: 300, step: 40 },
  { from: 15, to: 29, first: 720, step: 60 },
  { from: 30, to: 49, first: 1650, step: 90 }
];
export const PROGRESSION_BALANCE = Object.freeze({
  id: 'emberwatch-progression-r1',
  origin: 'emberwatch_authored_adjustment',
  referenceStatus: 'UNKNOWN',
  maxLevel: 50,
  xpUnitsPerPoint: 1000000,
  precisionPolicy: 'Store XP in millionths; reject finer effective grants, tolerating only IEEE-754 representation noise. Cap-discarded XP is never stored.',
  xpMeaning: 'remaining experience inside the current level',
  maxLevelXp: 0,
  overflowPolicy: 'discard experience beyond level 50; report discardedXp',
  xpBands: Object.freeze(bands.map(band => Object.freeze(band))),
  rationale: 'Small early thresholds followed by distinct mid/late growth bands; no campaign rewards or play duration are validated by this curve.',
  verificationLimit: 'Arithmetic and handlers only; combat, reward supply, promotion and ordinary-input campaign pacing are unverified.'
});

