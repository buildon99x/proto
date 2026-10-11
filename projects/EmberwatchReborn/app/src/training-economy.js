// Authored Emberwatch R10 safeguard, not a recovered original-game rule.
// This module validates the wallet's structure and range ONLY. T/promotion
// validators own receipt/commission/tier relationships and exact 0/120 policy.
// Absence is permitted for untouched pre-T state; malformed presence fails.
const record = value => value !== null && typeof value === 'object'
  && Object.getPrototypeOf(value) === Object.prototype;
const count = value => Number.isSafeInteger(value) && value >= 0;
const data = descriptor => descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable;
const invalid = () => ({ok: false, code: 'INVALID_TRAINING_GOLD', reason: '훈련 예약 금화의 형식이나 잔액이 올바르지 않습니다.'});

export function trainingGoldBalances(state) {
  if (!record(state)) return invalid();
  const gold = Object.getOwnPropertyDescriptor(state, 'gold');
  if (!data(gold) || !count(gold.value)) return invalid();
  const allocation = Object.getOwnPropertyDescriptor(state, 'reservedTrainingGold');
  let reservedGold = 0;
  if (allocation !== undefined) {
    if (!data(allocation) || !record(allocation.value)) return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(allocation.value);
    if (Reflect.ownKeys(descriptors).length !== 1 || !Object.hasOwn(descriptors, 'expert')) return invalid();
    const expert = descriptors.expert;
    if (!data(expert) || !count(expert.value) || expert.value > gold.value) return invalid();
    reservedGold = expert.value;
  }
  return {ok: true, totalGold: gold.value, reservedGold, spendableGold: gold.value - reservedGold};
}

export function validateTrainingGold(state) {
  const result = trainingGoldBalances(state);
  return result.ok ? {ok: true} : result;
}
