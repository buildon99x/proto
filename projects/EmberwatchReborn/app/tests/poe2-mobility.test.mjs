import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoeMobility} from '../src/poe-mobility.js';

// Convenient binary fractions are test fixtures only, never production balance.
const TUNING = Object.freeze({rollDuration: .5, rollSpeed: 200, sprintSpeed: 160, sprintGrace: .125, knockdownDuration: .75, evadeStart: .125, evadeEnd: .375});
const RIGHT = Object.freeze({x: 1, y: 0}), UP = Object.freeze({x: 0, y: -1});
const policy = ({moveDirection, aimDirection}) => moveDirection ?? aimDirection;
const create = (options = {}) => createPoeMobility({tuning: TUNING, chooseRollDirection: policy, ...options});
const press = (m, action = 'dodgeSprint', options = {}) => m.press(action, {moveDirection: RIGHT, aimDirection: UP, ...options});
const sprint = (m, action = 'dodgeSprint') => {press(m, action);return m.update(TUNING.rollDuration, {moveDirection: RIGHT});};
const types = result => result.events.map(event => event.type);

test('all numerical tuning and the direction policy must be explicit', () => {
 assert.throws(() => createPoeMobility(), /tuning/);
 assert.throws(() => createPoeMobility({tuning: TUNING}), /direction policy/);
 for (const key of Object.keys(TUNING)) {
  const tuning = {...TUNING};delete tuning[key];assert.throws(() => create({tuning}), /tuning/);
  for (const bad of [NaN, Infinity, -1, '1', null]) assert.throws(() => create({tuning: {...TUNING, [key]: bad}}));
 }
 for (const key of ['rollDuration', 'knockdownDuration', 'rollSpeed', 'sprintSpeed']) assert.throws(() => create({tuning: {...TUNING, [key]: 0}}));
 assert.throws(() => create({tuning: {...TUNING, rollDuration: 61}}), /recovery/);
 assert.throws(() => create({tuning: {...TUNING, knockdownDuration: 61}}), /recovery/);
 assert.throws(() => create({tuning: {...TUNING, evadeEnd: .75}}), /Evade/);
 assert.throws(() => create({tuning: {...TUNING, evadeStart: .5}}), /Evade/);
});

test('a permitted keydown starts exactly one roll immediately, before update', () => {
 const m = create(), result = press(m);
 assert.equal(result.accepted, true);assert.equal(result.state, 'roll');assert.equal(result.elapsed, 0);
 assert.deepEqual(types(result), ['roll-start']);assert.equal(result.events[0].offset, 0);
 assert.deepEqual(result.direction, RIGHT);assert.deepEqual(result.velocity, {x: 200, y: 0});
 assert.equal(result.blocksSkills, true);assert.equal(result.recoveryDebt, .5);
 assert.equal(m.snapshot().elapsed, 0);assert.equal(m.snapshot().events, undefined);
});

test('a short press/release before the first frame preserves the single roll', () => {
 const m = create();press(m);assert.deepEqual(types(m.release('dodgeSprint')), []);
 const end = m.update(.5, {moveDirection: RIGHT});
 assert.equal(end.state, 'idle');assert.deepEqual(end.delta, {x: 100, y: 0});
 assert.deepEqual(types(end), ['roll-end']);assert.equal(end.events[0].offset, .5);
 assert.deepEqual(types(m.release('dodgeSprint')), []);assert.equal(m.snapshot().state, 'idle');
});

test('caller direction policy receives detached normalized movement and aim vectors', () => {
 const move = {x: 6, y: 8}, aim = {x: 0, y: -3};let sampled;
 const m = create({chooseRollDirection: directions => {sampled = directions;return directions.aimDirection;}});
 const result = m.press('dodgeOnly', {moveDirection: move, aimDirection: aim});
 assert.deepEqual(sampled, {moveDirection: {x: .6, y: .8}, aimDirection: UP});assert.deepEqual(result.direction, UP);
 sampled.aimDirection.y = 20;move.x = 999;aim.y = 999;result.direction.x = 999;
 assert.deepEqual(m.snapshot().direction, UP);
});

test('the injected policy may choose aim while stationary without hidden fallback', () => {
 const m = create();assert.deepEqual(press(m, 'dodgeOnly', {moveDirection: null}).direction, UP);
 const empty = create({chooseRollDirection: () => null});assert.equal(press(empty).reason, 'no-direction');
 assert.equal(empty.snapshot().state, 'idle');assert.equal(empty.update(2, {moveDirection: RIGHT}).state, 'idle');
});

test('invalid or zero direction vectors never leak NaN into mobility', () => {
 for (const value of [null, {}, {x: NaN, y: 1}, {x: Infinity, y: 0}, {x: 0, y: 0}, {x: '1', y: 0}]) {
  const m = create({chooseRollDirection: () => value});assert.equal(press(m).reason, 'no-direction');
  assert.deepEqual(m.snapshot().velocity, {x: 0, y: 0});
 }
 const m = create();assert.deepEqual(press(m, 'dodgeOnly', {moveDirection: {x: NaN, y: 0}}).direction, UP);
});

test('unknown input is harmless and does not consume a real key edge', () => {
 const m = create();assert.equal(m.press('shield_charge').reason, 'unknown-action');
 assert.deepEqual(types(m.release('shield_charge')), []);assert.equal(press(m).accepted, true);
});

test('OS repeat and a repeated held press never restart or extend a roll', () => {
 const m = create();press(m);m.update(.25, {moveDirection: RIGHT});
 assert.equal(press(m, 'dodgeSprint', {repeat: true}).reason, 'repeated-press');
 assert.equal(press(m).reason, 'repeated-press');assert.equal(m.snapshot().elapsed, .25);
 assert.equal(m.snapshot().remaining, .25);assert.equal(m.update(.25, {moveDirection: RIGHT}).state, 'sprint');
});

test('release and re-press during the roll cannot restart it or queue a second roll', () => {
 const m = create();press(m);m.update(.25);m.release('dodgeSprint');
 const reject = press(m);assert.equal(reject.reason, 'mobility-locked');assert.deepEqual(types(reject), []);
 m.release('dodgeSprint');assert.equal(m.update(.5, {moveDirection: RIGHT}).state, 'idle');
 assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');assert.equal(press(m).accepted, true);
});

test('a roll-only hold never becomes sprint, even if the other key is pressed mid-roll', () => {
 const m = create();press(m, 'dodgeOnly');assert.equal(press(m).accepted, false);
 const end = m.update(10, {moveDirection: RIGHT});assert.equal(end.state, 'idle');
 assert.deepEqual(end.delta, {x: 100, y: 0});assert.deepEqual(types(end), ['roll-end']);
 assert.equal(m.update(10, {moveDirection: RIGHT}).state, 'idle');
});

test('dodge+sprint hold crosses to unlimited sprint only after the roll finishes', () => {
 const m = create();press(m);assert.equal(m.update(.25, {moveDirection: RIGHT}).state, 'roll');
 const start = m.update(.25, {moveDirection: UP});assert.equal(start.state, 'sprint');
 assert.deepEqual(types(start), ['roll-end', 'sprint-start']);assert.equal(start.elapsed, 0);
 assert.equal(start.recoveryDebt, 0);assert.equal(start.blocksSkills, false);assert.deepEqual(start.direction, UP);
 assert.equal(m.update(3600, {moveDirection: RIGHT}).state, 'sprint');
});

test('one long frame splits roll and sprint displacement at the actual transition time', () => {
 const m = create();press(m);const result = m.update(.75, {moveDirection: UP});
 assert.deepEqual(result.delta, {x: 100, y: -40});assert.equal(result.elapsed, .25);
 assert.deepEqual(types(result), ['roll-end', 'sprint-start']);
 assert.ok(result.events.every(event => event.offset === .5));
});

test('split and unsplit updates have equal intended displacement and final state', () => {
 const a = create(), b = create();press(a);press(b);
 const whole = a.update(1, {moveDirection: RIGHT}), sum = {x: 0, y: 0};
 for (let n = 0; n < 8; n++) {const step = b.update(.125, {moveDirection: RIGHT});sum.x += step.delta.x;sum.y += step.delta.y;}
 assert.deepEqual(sum, whole.delta);assert.deepEqual(b.snapshot(), a.snapshot());
});

test('roll direction commits on acceptance while sprint direction follows movement', () => {
 const m = create();press(m);assert.deepEqual(m.update(.25, {moveDirection: UP}).delta, {x: 50, y: 0});
 m.update(.25, {moveDirection: UP});assert.deepEqual(m.update(.25, {moveDirection: RIGHT}).delta, {x: 40, y: 0});
});

test('sprint release immediately stops when Keep Sprinting is off and never rolls', () => {
 const m = create();sprint(m);const release = m.release('dodgeSprint');
 assert.equal(release.state, 'idle');assert.deepEqual(types(release), ['sprint-end']);
 assert.deepEqual(types(m.release('dodgeSprint')), []);assert.deepEqual(m.update(2, {moveDirection: RIGHT}).delta, {x: 0, y: 0});
});

test('Keep Sprinting retains movement after keyup, but movement stop ends it', () => {
 const m = create({keepSprintingWhileMoving: true});sprint(m);
 assert.equal(m.release('dodgeSprint').state, 'sprint');assert.equal(m.update(.25, {moveDirection: UP}).state, 'sprint');
 const stop = m.update(0, {moveDirection: {x: 0, y: 0}});assert.equal(stop.state, 'idle');
 assert.deepEqual(types(stop), ['sprint-end']);assert.equal(stop.events[0].reason, 'movement-stopped');
 assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');
});

test('a keyup during the roll does not pre-arm Keep Sprinting', () => {
 const m = create({keepSprintingWhileMoving: true});press(m);m.release('dodgeSprint');
 assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');
});

test('held dodge with no movement when roll ends does not later start ghost sprint', () => {
 const m = create();press(m);assert.equal(m.update(.5).state, 'idle');
 assert.equal(m.update(.5, {moveDirection: RIGHT}).state, 'idle');assert.equal(press(m).reason, 'repeated-press');
 m.release('dodgeSprint');assert.equal(press(m).state, 'roll');
});

test('a fresh roll interrupts maintained sprint for either dodge action', () => {
 for (const action of ['dodgeSprint', 'dodgeOnly']) {
  const m = create({keepSprintingWhileMoving: true});sprint(m);m.release('dodgeSprint');
  const roll = press(m, action);assert.equal(roll.accepted, true);assert.equal(roll.state, 'roll');
  assert.deepEqual(types(roll), ['sprint-end', 'roll-start']);
 }
});

test('a skill-specific denied cancel consumes its edge and is never buffered', () => {
 const m = create();assert.equal(press(m, 'dodgeOnly', {canStart: false}).reason, 'skill-locked');
 assert.equal(press(m, 'dodgeOnly', {canStart: true}).reason, 'repeated-press');
 assert.equal(m.update(10, {moveDirection: RIGHT}).state, 'idle');
 m.release('dodgeOnly');assert.equal(press(m, 'dodgeOnly', {canStart: true}).accepted, true);
});

test('denied dodge while sprinting does not interrupt sprint or produce FX', () => {
 const m = create({keepSprintingWhileMoving: true});sprint(m);m.release('dodgeSprint');
 const result = press(m, 'dodgeOnly', {canStart: false});assert.equal(result.state, 'sprint');assert.deepEqual(types(result), []);
});

test('an accepted skill stops sprint even with Keep Sprinting and held dodge', () => {
 const m = create({keepSprintingWhileMoving: true});sprint(m);const skill = m.skillStart();
 assert.equal(skill.accepted, true);assert.equal(skill.state, 'idle');assert.deepEqual(types(skill), ['sprint-end']);
 assert.equal(m.update(2, {moveDirection: RIGHT}).state, 'idle');
 assert.equal(m.skillStart().accepted, true);assert.deepEqual(types(m.skillStart()), []);
});

test('skill starts are refused during roll, knockdown and restored recovery', () => {
 const roll = create();press(roll);assert.equal(roll.skillStart().accepted, false);assert.equal(roll.snapshot().state, 'roll');
 const down = create();sprint(down);down.update(.125, {moveDirection: RIGHT});down.hit();
 assert.equal(down.skillStart().accepted, false);assert.equal(down.snapshot().state, 'knockdown');
 const restored = create();restored.restoreRecoveryDebt(.25);assert.equal(restored.skillStart().accepted, false);
 restored.update(.25);assert.equal(restored.skillStart().accepted, true);
});

test('sprint grace prevents only knockdown and ends exactly at the injected bound', () => {
 const m = create();sprint(m);const grace = m.hit();assert.equal(grace.knockedDown, false);assert.equal(grace.reason, 'sprint-grace');
 assert.deepEqual(types(grace), []);m.update(.125, {moveDirection: RIGHT});const hit = m.hit();
 assert.equal(hit.knockedDown, true);assert.equal(hit.state, 'knockdown');assert.deepEqual(types(hit), ['sprint-end', 'knockdown-start']);
 assert.equal(hit.recoveryDebt, .75);assert.equal(hit.blocksSkills, true);assert.equal(hit.evadeWindow, false);
 assert.equal(hit.hp, undefined);assert.equal(hit.damage, undefined);assert.equal(hit.invulnerable, undefined);
});

test('hits outside sprint do not change a roll or restart/extend knockdown', () => {
 const m = create();assert.equal(m.hit().reason, 'not-sprinting');press(m);m.update(.125);const roll = m.snapshot();
 assert.equal(m.hit().knockedDown, false);assert.deepEqual(m.snapshot(), roll);
 m.update(.375, {moveDirection: RIGHT});m.update(.125, {moveDirection: RIGHT});m.hit();m.update(.25);
 const down = m.snapshot();assert.equal(m.hit().knockedDown, false);assert.deepEqual(m.snapshot(), down);
});

test('knockdown has no displacement and its end never resumes held input', () => {
 const m = create();sprint(m);m.update(.125, {moveDirection: RIGHT});m.hit();
 const blocked = press(m, 'dodgeOnly');assert.equal(blocked.accepted, false);
 const end = m.update(2, {moveDirection: RIGHT});assert.deepEqual(end.delta, {x: 0, y: 0});assert.equal(end.state, 'idle');
 assert.deepEqual(types(end), ['knockdown-end']);assert.equal(end.events[0].offset, .75);
 assert.equal(m.update(2, {moveDirection: RIGHT}).state, 'idle');
});

test('evadeWindow is only the injected half-open roll interval', () => {
 const m = create();assert.equal(press(m).evadeWindow, false);assert.equal(m.update(.125).evadeWindow, true);
 assert.equal(m.update(.125).evadeWindow, true);assert.equal(m.update(.125).evadeWindow, false);
 assert.equal(m.update(.125, {moveDirection: RIGHT}).evadeWindow, false);
 const disabled = create({tuning: {...TUNING, evadeStart: 0, evadeEnd: 0}});assert.equal(press(disabled).evadeWindow, false);
});

test('held observations can release sprint but cannot create an action without an edge', () => {
 const m = create();assert.equal(m.update(1, {moveDirection: RIGHT, held: {dodgeSprint: true}}).state, 'idle');
 m.release('dodgeSprint');sprint(m);const released = m.update(0, {moveDirection: RIGHT, held: {dodgeSprint: false}});
 assert.equal(released.state, 'idle');assert.deepEqual(types(released), ['sprint-end']);
});

test('roll-only held observations cannot change the original roll source', () => {
 const m = create();press(m, 'dodgeOnly');const end = m.update(.5, {moveDirection: RIGHT, held: {dodgeSprint: true}});
 assert.equal(end.state, 'idle');assert.deepEqual(types(end), ['roll-end']);
});

test('safety clear removes all held intent, direction and evade eligibility', () => {
 for (const reason of ['menu', 'blur', 'stamp-changed', 'life-changed', 'region-changed', 'rebinding']) {
  const m = create();press(m);m.update(.125);const cleared = m.clear({reason});
  assert.equal(cleared.state, 'idle');assert.deepEqual(cleared.held, {dodgeSprint: false, dodgeOnly: false, sprint: false});
  assert.deepEqual(cleared.direction, {x: 0, y: 0});assert.equal(cleared.evadeWindow, false);assert.equal(cleared.recoveryDebt, .375);
  assert.deepEqual(types(cleared), ['roll-end']);assert.equal(cleared.events[0].reason, reason);
  assert.deepEqual(types(m.clear({reason})), []);assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');
  assert.equal(press(m, 'dodgeOnly', {repeat: true}).accepted, false);assert.equal(m.snapshot().state, 'idle');
  assert.equal(press(m, 'dodgeOnly').accepted, true);
 }
});

test('clearing sprint retains no movement, restart, recovery, or repeated FX', () => {
 const m = create({keepSprintingWhileMoving: true});sprint(m);const cleared = m.clear();
 assert.equal(cleared.recoveryDebt, 0);assert.deepEqual(types(cleared), ['sprint-end']);
 assert.deepEqual(m.update(10, {moveDirection: RIGHT, held: {dodgeSprint: true}}).delta, {x: 0, y: 0});
 assert.deepEqual(types(m.clear()), []);
});

test('clear preserves action debt so opening a menu cannot refresh a roll', () => {
 const m = create();press(m);m.update(.25);m.clear();
 assert.equal(press(m, 'dodgeOnly').reason, 'mobility-locked');assert.equal(m.serializeRecoveryDebt(), .25);
 m.update(.125);assert.equal(m.snapshot().blocksSkills, true);m.update(.125);m.release('dodgeOnly');
 assert.equal(m.snapshot().blocksSkills, false);assert.equal(press(m, 'dodgeOnly').accepted, true);
});

test('an explicit new-life reset may drop debt while still removing intent', () => {
 const m = create();press(m);const result = m.clear({preserveRecovery: false, reason: 'new-life'});
 assert.equal(result.recoveryDebt, 0);assert.equal(result.blocksSkills, false);assert.equal(result.state, 'idle');
 assert.equal(press(m).accepted, true);
});

test('serialize/restore preserves only scalar debt, never position, evade or held state', () => {
 const m = create();press(m);m.update(.125);const saved = m.serializeRecoveryDebt();assert.equal(saved, .375);
 const restored = create(), result = restored.restoreRecoveryDebt(saved);
 assert.equal(result.state, 'idle');assert.equal(result.evadeWindow, false);assert.equal(result.blocksSkills, true);
 assert.deepEqual(result.held, {dodgeSprint: false, dodgeOnly: false, sprint: false});assert.deepEqual(result.direction, {x: 0, y: 0});
 assert.equal(press(restored).accepted, false);assert.deepEqual(restored.update(.375, {moveDirection: RIGHT}).delta, {x: 0, y: 0});
 assert.equal(restored.serializeRecoveryDebt(), 0);assert.equal(restored.update(1, {moveDirection: RIGHT}).state, 'idle');
 restored.release('dodgeSprint');assert.equal(press(restored).accepted, true);
});

test('repeated restoration or a smaller imported debt cannot cancel existing debt', () => {
 const m = create();press(m);m.update(.125);assert.equal(m.restoreRecoveryDebt(.125).recoveryDebt, .375);
 assert.equal(m.restoreRecoveryDebt(0).recoveryDebt, .375);m.update(.125);
 assert.equal(m.restoreRecoveryDebt(.25).recoveryDebt, .25);assert.equal(m.restoreRecoveryDebt(60).recoveryDebt, 60);
});

test('invalid restore data is rejected without mutating the current action', () => {
 const m = create();press(m);const before = m.snapshot();
 for (const value of [-1, 61, Infinity, NaN, '1', null, {}, undefined]) {
  assert.throws(() => m.restoreRecoveryDebt(value), /recovery/);assert.deepEqual(m.snapshot(), before);
 }
});

test('invalid dt is rejected atomically and zero dt is legal', () => {
 const m = create();press(m);const before = m.snapshot();
 for (const dt of [-1, NaN, Infinity, '1', undefined]) {
  assert.throws(() => m.update(dt, {held: {dodgeSprint: false}}), /dt/);assert.deepEqual(m.snapshot(), before);
 }
 const zero = m.update(0, {moveDirection: RIGHT});assert.equal(zero.state, 'roll');assert.deepEqual(zero.delta, {x: 0, y: 0});
});

test('snapshot, events, options and tuning cannot mutate private state', () => {
 const tuning = {...TUNING}, m = create({tuning});const start = press(m);tuning.rollDuration = 50;tuning.rollSpeed = 1;
 start.held.dodgeSprint = false;start.direction.x = 99;start.velocity.x = 99;start.events[0].direction.x = 99;
 const next = m.snapshot();assert.equal(next.remaining, .5);assert.equal(next.held.dodgeSprint, true);assert.deepEqual(next.direction, RIGHT);
 assert.deepEqual(m.update(.5, {moveDirection: RIGHT}).delta, {x: 100, y: 0});
});

test('standalone sprint starts immediately along movement, without a roll or evade window', () => {
 const m = create({chooseRollDirection: () => {throw new Error('Run must not select a roll direction');}});
 const start = press(m, 'sprint');assert.equal(start.accepted, true);assert.equal(start.state, 'sprint');
 assert.equal(start.source, 'sprint');assert.equal(start.evadeWindow, false);assert.deepEqual(types(start), ['sprint-start']);
 assert.deepEqual(m.update(.25, {moveDirection: UP}).delta, {x: 0, y: -40});
});

test('standalone sprint keyup never rolls; unrelated releases cannot stop it', () => {
 const m = create();press(m, 'sprint');assert.equal(m.release('dodgeSprint').state, 'sprint');
 assert.equal(m.release('dodgeOnly').state, 'sprint');assert.deepEqual(types(m.release('sprint')), ['sprint-end']);
 assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');assert.deepEqual(types(m.release('sprint')), []);
});

test('standalone sprint applies skill interruption and initial hit grace while held', () => {
 const m = create({keepSprintingWhileMoving: true});press(m, 'sprint');
 assert.equal(m.update(0, {moveDirection: RIGHT}).state, 'sprint');assert.equal(m.hit().reason, 'sprint-grace');
 m.update(.125, {moveDirection: RIGHT});assert.equal(m.hit().knockedDown, true);
 const skill = create({keepSprintingWhileMoving: true});press(skill, 'sprint');assert.equal(skill.skillStart().state, 'idle');
 assert.equal(skill.update(1, {moveDirection: RIGHT, canSprint: false}).state, 'idle');
 assert.equal(skill.update(0, {moveDirection: RIGHT, canSprint: true}).state, 'sprint');
});

test('standalone sprint cannot restart or replace an active sprint to reset hit grace', () => {
 const m = create();sprint(m);m.update(.125, {moveDirection: RIGHT});
 const rejected = press(m, 'sprint');assert.equal(rejected.reason, 'already-sprinting');assert.equal(rejected.elapsed, .125);
 assert.deepEqual(types(rejected), []);assert.equal(m.hit().knockedDown, true);
});

test('sprint pressed during roll waits as held movement without changing the roll', () => {
 const m = create();press(m, 'dodgeOnly');assert.equal(press(m, 'sprint').reason, 'mobility-locked');
 assert.equal(m.snapshot().source, 'dodgeOnly');const end = m.update(.75, {moveDirection: RIGHT});
 assert.equal(end.state, 'sprint');assert.equal(end.source, 'sprint');assert.deepEqual(types(end), ['roll-end', 'sprint-start']);
 assert.equal(end.events[1].offset, .5);assert.deepEqual(end.delta, {x: 140, y: 0});
});

test('a dodge interrupts standalone sprint and still-held run resumes after roll-only', () => {
 const m = create();press(m, 'sprint');const roll = press(m, 'dodgeOnly');
 assert.deepEqual(types(roll), ['sprint-end', 'roll-start']);assert.equal(roll.source, 'dodgeOnly');
 const end = m.update(.5, {moveDirection: RIGHT});assert.equal(end.state, 'sprint');assert.equal(end.source, 'sprint');
});

test('standalone sprint accepts held-before-movement and resumes only when canSprint permits', () => {
 const m = create();assert.equal(press(m, 'sprint', {moveDirection: null}).reason, 'no-direction');
 assert.equal(m.update(0, {moveDirection: RIGHT}).state, 'sprint');m.release('sprint');
 assert.equal(press(m, 'sprint', {canStart: false}).reason, 'skill-locked');
 assert.equal(m.update(1, {moveDirection: RIGHT, canSprint: false}).state, 'idle');
 assert.equal(m.update(0, {moveDirection: RIGHT, canSprint: true}).state, 'sprint');
});

test('released direct sprint never resumes after a skill, roll or stationary press', () => {
 for (const prepare of [m => {press(m, 'sprint');m.skillStart();}, m => {press(m, 'dodgeOnly');press(m, 'sprint');}, m => press(m, 'sprint', {moveDirection: null})]) {
  const m = create();prepare(m);m.release('sprint');m.update(1, {moveDirection: RIGHT});
  assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');
 }
});

test('safety clear and restore disarm direct sprint even if stale held samples arrive', () => {
 for (const reset of [m => m.clear({reason: 'blur'}), m => m.clear({reason: 'menu'}), m => m.restoreRecoveryDebt(.25)]) {
  const m = create();press(m, 'sprint');reset(m);
  assert.equal(m.update(1, {moveDirection: RIGHT, held: {sprint: true}}).state, 'idle');
  assert.equal(press(m, 'sprint', {repeat: true}).accepted, false);assert.equal(m.update(1, {moveDirection: RIGHT}).state, 'idle');
  m.release('sprint');assert.equal(press(m, 'sprint').accepted, true);
 }
});

test('direct sprint cannot enter until restored debt expires inside a step', () => {
 const m = create();m.restoreRecoveryDebt(.25);assert.equal(press(m, 'sprint').accepted, false);
 const result = m.update(.5, {moveDirection: RIGHT});assert.equal(result.state, 'sprint');
 assert.deepEqual(result.delta, {x: 40, y: 0});assert.equal(result.events[0].offset, .25);assert.equal(result.elapsed, .25);
});

test('canSprint suppression pauses held direct sprint but never arms rejected dodge input', () => {
 const m = create();press(m, 'sprint');assert.equal(m.update(0, {moveDirection: RIGHT, canSprint: false}).state, 'idle');
 assert.equal(m.update(0, {moveDirection: RIGHT, canSprint: true}).state, 'sprint');
 const dodge = create();press(dodge, 'dodgeSprint', {canStart: false});
 assert.equal(dodge.update(1, {moveDirection: RIGHT, canSprint: true}).state, 'idle');
});

test('a held:false sample disarms direct sprint until another real press', () => {
 const m = create();press(m, 'sprint');m.update(0, {moveDirection: RIGHT, held: {sprint: false}});
 assert.equal(m.update(1, {moveDirection: RIGHT, held: {sprint: true}}).state, 'idle');
});

test('Keep Sprinting retains only dodgeSprint source; standalone Shift always stops on keyup', () => {
 for (const keepSprintingWhileMoving of [false, true]) {
  const direct = create({keepSprintingWhileMoving});const started = press(direct, 'sprint');
  assert.equal(started.source, 'sprint');assert.equal(started.held.sprint, true);assert.equal(started.held.dodgeSprint, false);
  const end = direct.release('sprint');assert.equal(end.state, 'idle');assert.equal(end.source, null);
  assert.equal(end.held.sprint, false);assert.deepEqual(types(end), ['sprint-end']);assert.equal(end.events[0].reason, 'released');
  assert.equal(direct.update(1, {moveDirection: RIGHT}).state, 'idle');
  const combined = create({keepSprintingWhileMoving});sprint(combined);
  assert.equal(combined.snapshot().source, 'dodgeSprint');assert.equal(combined.snapshot().held.sprint, false);
  assert.equal(combined.release('sprint').state, 'sprint');
  const released = combined.release('dodgeSprint');assert.equal(released.state, keepSprintingWhileMoving ? 'sprint' : 'idle');
  assert.equal(released.source, keepSprintingWhileMoving ? 'dodgeSprint' : null);
 }
});

test('observed Shift keyup also stops direct run when Keep Sprinting is enabled', () => {
 const m = create({keepSprintingWhileMoving: true});press(m, 'sprint');
 const stop = m.update(0, {moveDirection: RIGHT, held: {sprint: false}});
 assert.equal(stop.state, 'idle');assert.equal(stop.source, null);assert.deepEqual(types(stop), ['sprint-end']);
});
