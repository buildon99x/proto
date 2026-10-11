import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, validateState, reduceRuntime, jsonSafe, clone, MAX_RECEIPTS} from '../src/state.js';
import {createStore, createSession, profileKeys, checksum} from '../src/save.js';
import {createController} from '../src/controller.js';

function memory() {
  const data = new Map(), reads = [], writes = [];
  return {data, reads, writes, getItem(k) { reads.push(k); return data.get(k) ?? null; }, setItem(k, v) { writes.push(k); data.set(k, v); }};
}
// Completion flags here are fixture injection for transaction tests. They do not
// establish an earned XP route, combat victory, or ordinary-input play coverage.
function completedObjective() { const s = createState(); s.world.objectives.patrol_scouts = 6; return s; }
const locked = {request: async (_key, _options, fn) => fn()};

test('fresh states are valid independent objects, empty progression, no injected currency', () => {
  const a = createState(), b = createState();
  assert.equal(validateState(a).ok, true); assert.equal(a.gold, 0);
  a.world.visited.push('x'); assert.deepEqual(b.world.visited, ['ash_hamlet']);
  assert.throws(() => createState({difficulty: 'impossible'}));
});
test('state rejects non-JSON values, cycles, sparse arrays and unsafe prototypes', () => {
  for (const x of [NaN, Infinity, undefined, () => {}, new Date(), Array(2)]) assert.equal(jsonSafe(x), false);
  const x = {}; x.x = x; assert.equal(jsonSafe(x), false);
  const state = createState(); state.options.flashes = NaN; assert.equal(validateState(state).ok, false);
});
test('ledger mismatch and bad world/options fail without mutation', () => {
  for (const mutate of [s => s.gold++, s => s.world.region = 'unknown', s => s.options.flashes = 2, s => s.inventory.materials.iron = -1, s => s.world.claimedRewards.push('x', 'x')]) {
    const s = createState(); mutate(s); const before = clone(s);
    assert.equal(validateState(s).ok, false); assert.deepEqual(s, before);
  }
});
test('reward fails before objective and never trusts client-supplied amount', () => {
  const s = createState(), before = clone(s);
  assert.equal(reduceRuntime(s, {type: 'claimReward', rewardId: 'watch_patrol', xp: 9999}).code, 'OBJECTIVE_INCOMPLETE');
  assert.deepEqual(s, before);
  assert.equal(reduceRuntime(s, {type: 'claimReward', rewardId: '__proto__'}).code, 'UNKNOWN_REWARD');
});
test('fixture-completed reward uses fixed values and is immutable/idempotent', () => {
  const s = completedObjective(), before = clone(s);
  const r = reduceRuntime(s, {type: 'claimReward', rewardId: 'watch_patrol', xp: 9999, gold: 9999});
  assert.equal(r.ok, true); assert.equal(r.state.character.xp, 70); assert.equal(r.state.gold, 20);
  assert.equal(r.state.inventory.materials.iron, 1); assert.equal(r.state.stats.earnedXp, 70);
  assert.deepEqual(s, before);
  assert.equal(reduceRuntime(r.state, {type: 'claimReward', rewardId: 'watch_patrol'}).code, 'ALREADY_CLAIMED');
});
test('receipt bound refuses new grants instead of forgetting claimed rewards', () => {
  const s = completedObjective(); s.world.claimedRewards = Array.from({length: MAX_RECEIPTS}, (_, n) => `fixture-${n}`);
  assert.equal(reduceRuntime(s, {type: 'claimReward', rewardId: 'watch_patrol'}).code, 'RECEIPT_LIMIT');
  assert.equal(s.gold, 0);
});
test('options handler supports accessibility limits and rejects invalid names/values', () => {
  for (const option of ['masterVolume', 'flashes', 'screenShake']) {
    for (const value of [0, 1]) assert.equal(reduceRuntime(createState(), {type: 'setOption', option, value}).state.options[option], value);
    for (const value of [-1, 2, '0']) assert.equal(reduceRuntime(createState(), {type: 'setOption', option, value}).code, 'INVALID_OPTION');
  }
  assert.equal(reduceRuntime(createState(), {type: 'setOption', option: '__proto__', value: 0}).ok, false);
  assert.equal(reduceRuntime(createState(), {type: 'giveXp', amount: 999}).code, 'UNKNOWN_COMMAND');
});
test('profile keys isolate QA and reject ambiguous names', () => {
  assert.notEqual(profileKeys().head, profileKeys('qa-fresh').head);
  for (const p of ['default', '../main', 'qa-', 'qa-A', '', 'qa-'.concat('a'.repeat(49))]) assert.throws(() => profileKeys(p));
});
test('save reads/writes only new profile namespace and preserves all legacy bytes', () => {
  const m = memory(); m.data.set('emberwatch-save', 'original'); m.data.set('emberwatch-campaign.v2.head', 'old');
  const store = createStore(m, {profile: 'qa-fresh'});
  assert.equal(store.save(createState(), {expectedRevision: 0}).ok, true);
  assert.equal(store.load().state.character.level, 1);
  assert.equal(m.data.get('emberwatch-save'), 'original'); assert.equal(m.data.get('emberwatch-campaign.v2.head'), 'old');
  assert.equal([...m.reads, ...m.writes].every(k => k.startsWith('emberwatch-reborn.reimplementation.v1.qa-fresh.')), true);
  assert.equal(createStore(m).load().state, null);
});
test('save requires current revision and no invalid data is written', () => {
  const m = memory(), store = createStore(m);
  assert.equal(store.save(createState()).code, 'REVISION_REQUIRED');
  const invalid = createState(); invalid.gold = -1;
  assert.equal(store.save(invalid, {expectedRevision: 0}).ok, false); assert.equal(m.writes.length, 0);
  store.save(createState(), {expectedRevision: 0});
  assert.equal(store.save(createState(), {expectedRevision: 0}).code, 'CONFLICT');
  assert.equal(store.load().revision, 1);
});
test('checksum and state corruption never overwrite existing bytes', () => {
  const m = memory(), store = createStore(m); store.save(createState(), {expectedRevision: 0});
  const key = store.keys.slots[0]; const e = JSON.parse(m.data.get(key)); e.payload += 'x'; m.data.set(key, JSON.stringify(e));
  const bytes = new Map(m.data); assert.equal(store.load().code, 'CORRUPT');
  assert.equal(store.save(createState(), {expectedRevision: 1}).code, 'CORRUPT'); assert.deepEqual(m.data, bytes);
});
test('a valid checksum cannot bypass semantic state validation', () => {
  const m = memory(), store = createStore(m); store.save(createState(), {expectedRevision: 0});
  const e = JSON.parse(m.data.get(store.keys.slots[0])); const s = JSON.parse(e.payload); s.gold = 999;
  e.payload = JSON.stringify(s); e.checksum = checksum(e.payload); m.data.set(store.keys.slots[0], JSON.stringify(e));
  assert.equal(store.load().code, 'CORRUPT');
});
test('failed staged write does not grant a reward and prior commit remains readable', () => {
  const m = memory(), store = createStore(m); store.save(completedObjective(), {expectedRevision: 0});
  const oldSet = m.setItem; m.setItem = (k, v) => { if (k === store.keys.head) throw new Error('quota'); oldSet(k, v); };
  const r = reduceRuntime(completedObjective(), {type: 'claimReward', rewardId: 'watch_patrol'});
  assert.equal(store.save(r.state, {expectedRevision: 1}).code, 'COMMIT_UNCERTAIN');
  const loaded = store.load(); assert.equal(loaded.revision, 1); assert.equal(loaded.state.gold, 0); assert.deepEqual(loaded.state.world.claimedRewards, []);
});
test('first staged slot without head is not a completed save', () => {
  const m = memory(), store = createStore(m); const oldSet = m.setItem;
  m.setItem = (k, v) => { if (k === store.keys.head) throw new Error('fail'); oldSet(k, v); };
  assert.equal(store.save(createState(), {expectedRevision: 0}).ok, false);
  assert.equal(store.load().code, 'CORRUPT');
});
test('corrupt latest slot recovers a previously committed revision', () => {
  const m = memory(), store = createStore(m); store.save(completedObjective(), {expectedRevision: 0});
  const r = reduceRuntime(completedObjective(), {type: 'claimReward', rewardId: 'watch_patrol'});
  store.save(r.state, {expectedRevision: 1}); m.data.set(store.keys.slots[1], 'broken');
  const recovered = store.load(); assert.equal(recovered.recovered, true); assert.equal(recovered.revision, 1); assert.equal(recovered.state.gold, 0);
});
test('corrupt head uses previous receipt, never newest uncommitted staging', () => {
  const m = memory(), store = createStore(m); store.save(completedObjective(), {expectedRevision: 0});
  const r = reduceRuntime(completedObjective(), {type: 'claimReward', rewardId: 'watch_patrol'});
  store.save(r.state, {expectedRevision: 1}); m.data.set(store.keys.head, '{');
  const recovered = store.load(); assert.equal(recovered.revision, 1); assert.equal(recovered.recovered, true);
});
test('unavailable storage returns explicit failure', () => {
  const store = createStore({getItem() { throw new Error(); }, setItem() { throw new Error(); }});
  assert.equal(store.load().code, 'UNAVAILABLE'); assert.equal(store.save(createState(), {expectedRevision: 0}).code, 'UNAVAILABLE');
});
test('oversized validated data is refused before storage mutation', () => {
  const m = memory(), s = createState(); s.futureExtension = '한'.repeat(800000);
  assert.equal(createStore(m).save(s, {expectedRevision: 0}).code, 'TOO_LARGE'); assert.equal(m.writes.length, 0);
});
test('session refuses unprotected browser writes and uses profile-specific lock', async () => {
  const m = memory(); assert.equal((await createSession(m, null).save(createState(), {expectedRevision: 0})).code, 'LOCKS_UNAVAILABLE'); assert.equal(m.writes.length, 0);
  const calls = []; const locks = {request: async (key, o, fn) => { calls.push([key, o]); return fn(); }};
  assert.equal((await createSession(m, locks, {profile: 'qa-x'}).save(createState(), {expectedRevision: 0})).ok, true);
  assert.deepEqual(calls[0], [profileKeys('qa-x').lock, {mode: 'exclusive'}]);
});
test('lock rejection before/after callback distinguishes uncertainty', async () => {
  const before = createSession(memory(), {request: async () => { throw new Error(); }});
  assert.equal((await before.save(createState(), {expectedRevision: 0})).code, 'LOCK_FAILED');
  const after = createSession(memory(), {request: async (_k, _o, fn) => { fn(); throw new Error(); }});
  assert.equal((await after.save(createState(), {expectedRevision: 0})).code, 'COMMIT_UNCERTAIN');
});
test('controller starts once, refuses absent-game commands and isolates snapshots', async () => {
  const c = createController(createSession(memory(), locked));
  assert.equal((await c.dispatch({type: 'setOption', option: 'flashes', value: 0})).code, 'NO_GAME');
  assert.equal((await c.start()).ok, true); assert.equal((await c.start()).code, 'GAME_EXISTS');
  const s = c.snapshot(); s.options.flashes = 0; assert.equal(c.snapshot().options.flashes, 0.5);
  assert.equal((await c.dispatch({type: 'allocateAttribute', attribute: 'strength'})).ok, false);
});
test('double-click reward queue commits exactly once and survives controller reload', async () => {
  const m = memory(), store = createSession(m, locked); await store.save(completedObjective(), {expectedRevision: 0});
  const c = createController(store); await c.load(); const command = {type: 'claimReward', rewardId: 'watch_patrol'};
  const results = await Promise.all([c.dispatch(command), c.dispatch(command)]);
  assert.equal(results[0].ok, true); assert.equal(results[1].code, 'ALREADY_CLAIMED');
  const resumed = createController(store); await resumed.load();
  assert.equal(resumed.snapshot().gold, 20); assert.equal(resumed.snapshot().character.xp, 70);
  assert.equal((await resumed.dispatch(command)).code, 'ALREADY_CLAIMED');
});
test('intent and event objects cannot mutate queued writes or other subscribers', async () => {
  const c = createController(createSession(memory(), locked)); await c.start();
  const seen = []; c.subscribe(e => { e.events.length = 0; throw new Error('observer'); }); c.subscribe(e => seen.push(e));
  const cmd = {type: 'setOption', option: 'flashes', value: 0}; const promise = c.dispatch(cmd); cmd.value = 1;
  assert.equal((await promise).ok, true); assert.equal(c.snapshot().options.flashes, 0); assert.equal(seen[0].events.length, 1);
});
test('write uncertainty preserves in-memory state and blocks until explicit reload', async () => {
  const m = memory(), store = createSession(m, locked); await store.save(completedObjective(), {expectedRevision: 0});
  const c = createController(store); await c.load(); const oldSet = m.setItem;
  m.setItem = (k, v) => { oldSet(k, v); if (k === store.keys.head) throw new Error('post-write'); };
  const command = {type: 'claimReward', rewardId: 'watch_patrol'};
  assert.equal((await c.dispatch(command)).code, 'COMMIT_UNCERTAIN'); assert.equal(c.snapshot().gold, 0);
  assert.equal((await c.dispatch(command)).blocked, true);
  m.setItem = oldSet; await c.load(); assert.equal(c.snapshot().gold, 20); assert.equal((await c.dispatch(command)).code, 'ALREADY_CLAIMED');
});
test('stale second controller cannot overwrite newer save and resumes after reload', async () => {
  const store = createSession(memory(), locked), a = createController(store), b = createController(store);
  await a.start(); await b.load(); await a.dispatch({type: 'setOption', option: 'flashes', value: 0});
  assert.equal((await b.dispatch({type: 'setOption', option: 'masterVolume', value: 0})).code, 'CONFLICT');
  assert.equal((await b.dispatch({type: 'setOption', option: 'flashes', value: 1})).blocked, true);
  await b.load(); assert.equal(b.snapshot().options.flashes, 0);
  assert.equal((await b.dispatch({type: 'setOption', option: 'masterVolume', value: 0})).ok, true);
});
test('unexpected adapter read exceptions become failures and do not strand queue', async () => {
  let broken = true; const store = createStore(memory()); const c = createController({...store, load() { if (broken) throw new Error('storage'); return store.load(); }});
  assert.equal((await c.start()).code, 'UNAVAILABLE'); broken = false; await c.load(); assert.equal((await c.start()).ok, true);
});
test('state and intent validation do not execute accessors', async () => {
  let calls = 0; const s = createState(); Object.defineProperty(s, 'trap', {enumerable: true, get() { calls++; throw new Error(); }});
  assert.equal(validateState(s).ok, false); assert.equal(calls, 0);
  const c = createController(createStore(memory())); await c.start();
  assert.equal((await c.dispatch(s)).code, 'INVALID_COMMAND'); assert.equal(calls, 0);
});
test('unsupported trained skills/equipment fail closed until runtime is implemented', () => {
  for (const alter of [s => s.character.skills.mace = 1, s => s.character.exclusiveBranches.mace = 'fire', s => s.character.equipment.mainHand = 'missing-id', s => s.inventory.equipmentInstances.push({id: 'fake'})]) {
    const s = createState(); alter(s); assert.equal(validateState(s).ok, false);
  }
});
