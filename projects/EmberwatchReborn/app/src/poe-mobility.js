// Clock-free Emberwatch mobility state. The caller supplies every tuning value
// and roll-direction policy; none are asserted to be measured POE2 values.
const ACTIONS = ['dodgeSprint', 'dodgeOnly', 'sprint'];
const ZERO = () => ({x: 0, y: 0});
const finite = value => typeof value === 'number' && Number.isFinite(value);
function direction(value) {
 if (!value || !finite(value.x) || !finite(value.y)) return null;
 const length = Math.hypot(value.x, value.y);
 return finite(length) && length > 0 ? {x: value.x / length, y: value.y / length} : null;
}
function validateTuning(value) {
 const result = {};
 for (const key of ['rollDuration', 'rollSpeed', 'sprintSpeed', 'sprintGrace', 'knockdownDuration', 'evadeStart', 'evadeEnd']) {
  if (!finite(value?.[key]) || value[key] < 0) throw new TypeError(`Invalid mobility tuning: ${key}`);
  result[key] = value[key];
 }
 if (result.rollDuration <= 0 || result.knockdownDuration <= 0 || result.rollSpeed <= 0 || result.sprintSpeed <= 0) throw new RangeError('Mobility durations and speeds must be positive');
 // Recovery v2 only admits scalar locks in [0, 60]. Do not silently clamp a
 // larger action into a shorter persisted debt.
 if (result.rollDuration > 60 || result.knockdownDuration > 60) throw new RangeError('Mobility durations must fit the recovery v2 lock');
 if (result.evadeStart > result.evadeEnd || result.evadeEnd > result.rollDuration) throw new RangeError('Evade window must lie inside the roll');
 return Object.freeze(result);
}

/** Pure input/state controller. No browser, combat, HP, wall collision or IO.
 * press() accepts real keydown edges; repeat:true never rearms a cleared key.
 * canStart belongs to the executing skill's cancel window and recovery lock.
 * update() returns intended displacement only; the caller resolves collision.
 * clear() removes intent while retaining recovery debt unless explicitly reset
 * for a new life. State/held/evade information is never restored from a save.
 */
export function createPoeMobility({tuning, chooseRollDirection, keepSprintingWhileMoving = false} = {}) {
 const config = validateTuning(tuning);
 if (typeof chooseRollDirection !== 'function') throw new TypeError('A roll direction policy is required');
 const keepSprinting = keepSprintingWhileMoving === true;
 let state = 'idle', elapsed = 0, vector = ZERO(), source = null, debt = 0, directSprintArmed = false;
 const emptyHeld = () => ({dodgeSprint: false, dodgeOnly: false, sprint: false});
 let held = emptyHeld();
 const duration = () => state === 'roll' ? config.rollDuration : state === 'knockdown' ? config.knockdownDuration : 0;
 const retainsSprint = () => source === 'dodgeSprint' && keepSprinting;
 const remaining = () => Math.max(0, duration() - elapsed);
 const recoveryDebt = () => Math.max(debt, remaining());
 const output = (extra = {}) => {
  const speed = state === 'roll' ? config.rollSpeed : state === 'sprint' ? config.sprintSpeed : 0;
  return {
   state, elapsed, remaining: remaining(), direction: {...vector},
   velocity: {x: vector.x * speed, y: vector.y * speed},
   evadeWindow: state === 'roll' && elapsed >= config.evadeStart && elapsed < config.evadeEnd,
   blocksSkills: state === 'roll' || state === 'knockdown' || debt > 0,
   recoveryDebt: recoveryDebt(), held: {...held}, source,
   keepSprintingWhileMoving: keepSprinting,
   ...extra,
  };
 };
 // Each transition is reported exactly once by the method causing it. Snapshot
 // does not consume or replay events. offset is seconds into this method's step.
 function transition(next, events, reason, offset = 0, nextDirection = null, nextSource = null) {
  if (state !== 'idle') events.push({type: `${state}-end`, reason, offset, direction: {...vector}});
  state = next; elapsed = 0; vector = nextDirection ? {...nextDirection} : ZERO(); source = nextSource;
  if (state !== 'idle') events.push({type: `${state}-start`, reason, offset, direction: {...vector}});
 }
 function observeHeld(sample) {
  for (const action of ACTIONS) if (typeof sample?.[action] === 'boolean') held[action] = sample[action];
 }
 const api = {
  snapshot: () => output(),
  press(action, {moveDirection, aimDirection, canStart = true, repeat = false} = {}) {
   const events = [];
   const reject = reason => output({accepted: false, reason, events});
   if (!ACTIONS.includes(action)) return reject('unknown-action');
   if (repeat || held[action]) return reject('repeated-press');
   // A denied dodge edge is consumed, never buffered for a later cancel window.
   held[action] = true;
   // Direct running is a continuous modifier, unlike either dodge command.
   // A real press arms it until release/clear, including a stationary press.
   if (action === 'sprint') directSprintArmed = true;
   if (state === 'roll' || state === 'knockdown' || debt > 0) return reject('mobility-locked');
   if (canStart !== true) return reject('skill-locked');
   // A separate authored run binding uses movement only. It cannot restart an
   // existing sprint to refresh its initial knockdown grace. Which preset binds
   // this action belongs to controls, not this module.
   if (action === 'sprint') {
    if (state === 'sprint') return reject('already-sprinting');
    const move = direction(moveDirection);
    if (!move) return reject('no-direction');
    transition('sprint', events, action, 0, move, action);
    return output({accepted: true, reason: 'started', events});
   }
   const next = direction(chooseRollDirection({moveDirection: direction(moveDirection), aimDirection: direction(aimDirection)}));
   if (!next) return reject('no-direction');
   transition('roll', events, action, 0, next, action);
   return output({accepted: true, reason: 'started', events});
  },
  release(action) {
   const events = [];
   if (!ACTIONS.includes(action)) return output({events});
   held[action] = false;
   if (action === 'sprint') directSprintArmed = false;
   if (action === source && state === 'sprint' && !retainsSprint()) transition('idle', events, 'released');
   return output({events});
  },
  update(dt, {moveDirection, held: heldSample, canSprint = true} = {}) {
   if (!finite(dt) || dt < 0) throw new RangeError('Mobility dt must be a finite nonnegative number');
   observeHeld(heldSample);
   if (!held.sprint) directSprintArmed = false;
   const move = direction(moveDirection), events = [], delta = ZERO();
   const initialDebt = debt;
   debt = Math.max(0, debt - dt);
   if (state === 'sprint' && (!move || canSprint !== true || (!held[source] && !retainsSprint()))) transition('idle', events, !move ? 'movement-stopped' : canSprint !== true ? 'sprint-not-allowed' : 'released');
   let budget = dt, offset = 0;
   // There are at most two timed states per update: roll/knockdown can end in
   // idle or sprint. Only explicitly armed direct run may restart from held.
   if (state === 'roll' || state === 'knockdown') {
    const slice = Math.min(budget, remaining());
    if (state === 'roll') {
     delta.x += vector.x * config.rollSpeed * slice;
     delta.y += vector.y * config.rollSpeed * slice;
    }
    elapsed += slice; budget -= slice; offset += slice;
    if (elapsed >= duration()) {
     const sprint = state === 'roll' && source === 'dodgeSprint' && held.dodgeSprint && !!move && canSprint === true;
     transition(sprint ? 'sprint' : 'idle', events, 'completed', offset, sprint ? move : null, sprint ? 'dodgeSprint' : null);
    }
   }
   // This is held movement, not a queued dodge. A safety clear/restore removes
   // its arm, so a stale held:true observation alone cannot revive it.
   if (state === 'idle' && directSprintArmed && held.sprint && move && canSprint === true && debt === 0) {
    const wait = Math.min(budget, Math.max(0, initialDebt - offset));
    budget -= wait; offset += wait;
    transition('sprint', events, 'sprint-held', offset, move, 'sprint');
   }
   if (state === 'sprint') {
    vector = {...move};
    delta.x += vector.x * config.sprintSpeed * budget;
    delta.y += vector.y * config.sprintSpeed * budget;
    elapsed += budget;
   }
   return output({delta, events});
  },
  skillStart() {
   const events = [];
   if (state === 'roll' || state === 'knockdown' || debt > 0) return output({accepted: false, reason: 'mobility-locked', events});
   if (state === 'sprint') transition('idle', events, 'skill-started');
   return output({accepted: true, reason: 'skill-started', events});
  },
  hit() {
   const events = [];
   if (state !== 'sprint') return output({knockedDown: false, reason: 'not-sprinting', events});
   if (elapsed < config.sprintGrace) return output({knockedDown: false, reason: 'sprint-grace', events});
   transition('knockdown', events, 'hit');
   return output({knockedDown: true, reason: 'hit', events});
  },
  clear({preserveRecovery = true, reason = 'safety-clear'} = {}) {
   const events = [];
   debt = preserveRecovery === false ? 0 : recoveryDebt();
   held = emptyHeld();
   directSprintArmed = false;
   transition('idle', events, reason);
   return output({events});
  },
  serializeRecoveryDebt: () => recoveryDebt(),
  restoreRecoveryDebt(seconds) {
   // Fail closed without touching current state on malformed save input.
   if (!finite(seconds) || seconds < 0 || seconds > 60) throw new RangeError('Invalid recovery v2 mobility lock');
   const events = [];
   debt = Math.max(seconds, recoveryDebt());
   held = emptyHeld();
   directSprintArmed = false;
   transition('idle', events, 'restored-recovery');
   return output({events});
  },
 };
 return api;
}
