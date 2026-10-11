import test from 'node:test';
import assert from 'node:assert/strict';
import {freezeOwnedSnapshot, isImmutableSnapshot} from '../src/immutable-snapshot.js';
import {validateWildernessProgress} from '../src/wilderness.js';

const sample = () => ({world: {objectives: {accepted: 1}, defeated: ['guard']}, recovery: {cooldowns: {}, combatRng: {state: 42, draws: 19}}, rows: [[null, true, false, 'text', 2.5]]});
const shallow = value => Object.freeze(value);

test('owned snapshot copy preserves bytes and freezes its detached nested arrays', () => {
  const source = sample(), before = JSON.stringify(source), state = freezeOwnedSnapshot(source);
  assert.notEqual(state, source);
  assert.notEqual(state.rows[0], source.rows[0]);
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(source), before);
  for (const value of [state, state.world, state.world.objectives, state.world.defeated, state.recovery, state.recovery.cooldowns, state.recovery.combatRng, state.rows, state.rows[0]]) assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(source), false);
  assert.equal(Object.isFrozen(source.world.objectives), false);
  assert.equal(isImmutableSnapshot(source), false);
  assert.equal(isImmutableSnapshot(state), true);
  assert.equal(freezeOwnedSnapshot(state), state);
  assert.equal(isImmutableSnapshot(state), true);
});

test('null and scalar values never become immutable snapshot cache keys', () => {
  for (const value of [null, true, false, 0, 'snapshot']) {
    assert.equal(freezeOwnedSnapshot(value), value);
    assert.equal(isImmutableSnapshot(value), false);
  }
  for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol('snapshot'), () => {}]) {
    assert.equal(isImmutableSnapshot(value), false);
    assert.throws(() => freezeOwnedSnapshot(value), TypeError);
  }
});

test('shallow and fully frozen external roots never acquire canonical provenance', () => {
  const child = {revision: 1}, array = [child], source = shallow({array});
  assert.equal(isImmutableSnapshot(source), false);
  child.revision = 2;
  shallow(array);
  assert.equal(isImmutableSnapshot(source), false);
  child.revision = 3;
  shallow(child);
  assert.equal(isImmutableSnapshot(source), false);
  const state = freezeOwnedSnapshot(source);
  assert.notEqual(state, source);
  assert.equal(isImmutableSnapshot(state), true);
  assert.equal(state.array[0].revision, 3);
});

test('mutable input may change between copies without contaminating an earlier cache key', () => {
  const source = sample(), first = freezeOwnedSnapshot(source);
  source.world.objectives.accepted = 0;
  source.recovery.combatRng.draws++;
  assert.equal(isImmutableSnapshot(source), false);
  const second = freezeOwnedSnapshot(source);
  assert.notEqual(second, first);
  assert.equal(first.world.objectives.accepted, 1);
  assert.equal(second.world.objectives.accepted, 0);
  assert.equal(first.recovery.combatRng.draws, 19);
  assert.equal(second.recovery.combatRng.draws, 20);
});

test('external references and shared acyclic subtrees are copied without freezing the originals', () => {
  const child = {amount: 4}, source = {first: child, second: child}, state = freezeOwnedSnapshot(source);
  assert.equal(state.first, state.second);
  assert.notEqual(state.first, child);
  child.amount = 5;
  assert.equal(source.second.amount, 5);
  assert.equal(state.second.amount, 4);
  assert.throws(() => { state.first.amount = 6; }, TypeError);
  assert.throws(() => { state.first = {}; }, TypeError);
  assert.throws(() => { Object.setPrototypeOf(state.first, null); }, TypeError);
  assert.equal(isImmutableSnapshot(state), true);
  assert.equal(isImmutableSnapshot(source), false);
});

test('cloned and unrelated profile snapshots have independent provenance', () => {
  const original = freezeOwnedSnapshot(sample()), copy = structuredClone(original), other = sample();
  assert.equal(isImmutableSnapshot(copy), false);
  assert.equal(isImmutableSnapshot(other), false);
  copy.world.objectives.accepted = 0;
  copy.recovery.combatRng.draws++;
  assert.equal(original.world.objectives.accepted, 1);
  assert.equal(original.recovery.combatRng.draws, 19);
  assert.equal(isImmutableSnapshot(original), true);
  assert.equal(isImmutableSnapshot(freezeOwnedSnapshot(copy)), true);
  assert.equal(isImmutableSnapshot(copy), false);
  assert.equal(isImmutableSnapshot(other), false);
});

test('accessors are rejected without running getters or freezing valid siblings', () => {
  let reads = 0;
  const child = {value: 1}, source = {child};
  Object.defineProperty(source, 'unsafe', {enumerable: true, configurable: true, get() { reads++; return child; }});
  assert.equal(isImmutableSnapshot(source), false);
  assert.throws(() => freezeOwnedSnapshot(source), TypeError);
  assert.equal(reads, 0);
  assert.equal(Object.isFrozen(child), false);
  assert.equal(Object.isFrozen(source), false);
  shallow(source);
  assert.equal(isImmutableSnapshot(source), false);
  assert.equal(reads, 0);
});

test('failed shape checks leave input mutable and repaired input can be copied later', () => {
  const source = {child: {value: 1}};
  Object.defineProperty(source, 'hidden', {value: 1, configurable: true});
  assert.throws(() => freezeOwnedSnapshot(source), TypeError);
  assert.equal(isImmutableSnapshot(source.child), false);
  delete source.hidden;
  source.child.value = 2;
  const state = freezeOwnedSnapshot(source);
  assert.equal(isImmutableSnapshot(state), true);
  assert.equal(state.child.value, 2);
  assert.equal(isImmutableSnapshot(source), false);
  assert.equal(Object.isFrozen(source.child), false);
});

test('custom prototypes, symbol keys, hidden keys and reserved keys cannot be copied', () => {
  const cases = [Object.create(null), Object.create({value: 1}), new Date(), new Map(), new Set(), new Uint8Array(), {value: NaN}, {value: undefined}, {value: 1n}, {value: () => {}}, {[Symbol('hidden')]: 1}, Object.defineProperty({}, 'hidden', {value: 1})];
  for (const key of ['__proto__', 'prototype', 'constructor']) cases.push(Object.defineProperty({}, key, {value: 1, enumerable: true}));
  for (const source of cases) {
    assert.equal(isImmutableSnapshot(source), false);
    assert.throws(() => freezeOwnedSnapshot(source), TypeError);
    Object.freeze(source);
    assert.equal(isImmutableSnapshot(source), false);
    assert.throws(() => freezeOwnedSnapshot(source), TypeError);
  }
});

test('sparse, extended and accessor arrays are rejected without invoking values', () => {
  let reads = 0;
  const accessor = [];
  Object.defineProperty(accessor, '0', {enumerable: true, get() { reads++; return 1; }});
  for (const source of [Array(2), Object.assign([1], {extra: 2}), accessor, Object.defineProperty([1], '0', {enumerable: false})]) {
    assert.throws(() => freezeOwnedSnapshot(source), TypeError);
    Object.freeze(source);
    assert.equal(isImmutableSnapshot(source), false);
    assert.throws(() => freezeOwnedSnapshot(source), TypeError);
  }
  assert.equal(reads, 0);
});

test('cycles are rejected both before and after external freezing', () => {
  const root = {child: {value: 1}};
  root.child.parent = root;
  assert.equal(isImmutableSnapshot(root), false);
  assert.throws(() => freezeOwnedSnapshot(root), TypeError);
  assert.equal(Object.isFrozen(root.child), false);
  shallow(root.child);
  shallow(root);
  assert.equal(isImmutableSnapshot(root), false);
  assert.throws(() => freezeOwnedSnapshot(root), TypeError);
  const array = [];
  array.push(array);
  shallow(array);
  assert.equal(isImmutableSnapshot(array), false);
  assert.throws(() => freezeOwnedSnapshot(array), TypeError);
});

test('over-deep trees and hostile inspection fail closed without stack overflow', () => {
  const root = {}, nodes = [root];
  let node = root;
  for (let i = 0; i < 100; i++) nodes.push(node = node.child = {});
  assert.equal(isImmutableSnapshot(root), false);
  assert.throws(() => freezeOwnedSnapshot(root), TypeError);
  assert.equal(Object.isFrozen(root), false);
  nodes.reverse().forEach(Object.freeze);
  assert.equal(isImmutableSnapshot(root), false);
  assert.throws(() => freezeOwnedSnapshot(root), TypeError);
  const hostile = new Proxy({}, {getPrototypeOf() { throw new Error('blocked inspection'); }});
  assert.equal(isImmutableSnapshot(hostile), false);
  assert.throws(() => freezeOwnedSnapshot(hostile), TypeError);
});

test('canonical provenance alone does not establish valid game or save data', () => {
  const malformed = freezeOwnedSnapshot({world: {objectives: {wilderness_accepted: 9}}, forged: true});
  assert.equal(isImmutableSnapshot(malformed), true);
  assert.equal(validateWildernessProgress(malformed).ok, false);
  assert.equal(malformed.world.objectives.wilderness_accepted, 9);
});

test('frozen Proxies with changing missing properties never become validation cache keys', () => {
  let active = false, reads = 0;
  const world = new Proxy(Object.freeze({objectives: Object.freeze({}), claimedRewards: Object.freeze([])}), {
    get(target, key, receiver) {
      if (key === 'region') { reads++; return active ? 'signal_wilderness' : 'ash_hamlet'; }
      return Reflect.get(target, key, receiver);
    },
  });
  const source = Object.freeze({world, inventory: Object.freeze({tools: Object.freeze([])})});
  assert.equal(isImmutableSnapshot(source), false);
  assert.deepEqual(validateWildernessProgress(source), {ok: true});
  active = true;
  assert.equal(validateWildernessProgress(source).code, 'INVALID_WILDERNESS_STATE');
  const beforeCopy = reads, canonical = freezeOwnedSnapshot(source);
  assert.equal(reads, beforeCopy, 'descriptor copying never calls missing-property get');
  assert.notEqual(canonical, source);
  assert.notEqual(canonical.world, world);
  assert.equal(Object.hasOwn(canonical.world, 'region'), false);
  assert.equal(canonical.world.region, undefined);
  assert.equal(isImmutableSnapshot(canonical), true);
  assert.equal(isImmutableSnapshot(source), false);
  assert.deepEqual(validateWildernessProgress(canonical), {ok: true});
  active = false;
  assert.deepEqual(validateWildernessProgress(canonical), {ok: true});
  active = true;
  assert.equal(validateWildernessProgress(source).code, 'INVALID_WILDERNESS_STATE');
});

test('a Proxy wrapping a certified copy does not inherit its provenance', () => {
  const canonical = freezeOwnedSnapshot(sample()), proxy = new Proxy(canonical, {});
  assert.equal(isImmutableSnapshot(canonical), true);
  assert.equal(isImmutableSnapshot(proxy), false);
  const copy = freezeOwnedSnapshot(proxy);
  assert.notEqual(copy, canonical);
  assert.notEqual(copy, proxy);
  assert.equal(isImmutableSnapshot(copy), true);
  assert.deepEqual(copy, canonical);
});
