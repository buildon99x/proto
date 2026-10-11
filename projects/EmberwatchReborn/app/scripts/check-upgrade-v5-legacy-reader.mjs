// Execute the unmodified R11b6 reader, writer and controller in a separate realm.
// This is isolated adapter fault testing, never browser/gameplay acceptance.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createStore, createSession, profileKeys, readUpgradeBackup, upgradeBackupKey,
  readUpgradeBackupV5, restoreUpgradeBackupV5, upgradeBackupV5Key} from '../src/save.js';
import {STATE_VERSION, migrateState, validateState} from '../src/state.js';
import {createController} from '../src/controller.js';

if (!vm.SourceTextModule) throw Error('Run with --experimental-vm-modules.');
const sourceCommit = '17b13fa04fec8336d2c08f3c4603a0d2e8d00276';
const root = fileURLToPath(new URL('../tests/fixtures/r11b6', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'fixture-manifest.json'), 'utf8'));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const baselineHashes = new Map();
assert.equal(manifest.sourceCommit, sourceCommit);
assert.equal(manifest.version, '0.11.0-reimplementation.9');
assert.equal(manifest.stateVersion, 4);
assert.deepEqual(manifest.entryModules, ['save.js', 'state.js', 'controller.js']);
assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
for (const file of manifest.files) {
  assert.ok(!file.path.includes('..') && !file.path.startsWith('/'));
  assert.equal(file.sourcePath, `projects/EmberwatchReborn/app/src/${file.path}`);
  const bytes = await readFile(resolve(root, file.path));
  assert.equal(bytes.length, file.bytes, `Historical fixture size drift: ${file.path}`);
  assert.equal(digest(bytes), file.sha256, `Historical fixture drift: ${file.path}`);
  assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), file.gitBlob, `Historical Git blob drift: ${file.path}`);
  baselineHashes.set(file.path, file.sha256);
}
assert.ok((await readFile(resolve(root, 'main.js'), 'utf8')).includes('R11b6'));
const context = vm.createContext({TextEncoder, structuredClone, console});
const modules = new Map();
function module(file) {
  file = resolve(file);
  if (!file.startsWith(root + '/') || !baselineHashes.has(file.slice(root.length + 1))) throw Error('Historical import escaped frozen manifest');
  if (!modules.has(file)) modules.set(file, readFile(file, 'utf8').then(source => new vm.SourceTextModule(source, {context, identifier: file})));
  return modules.get(file);
}
const old = {};
for (const entry of manifest.entryModules) {
  const m = await module(resolve(root, entry));
  if (m.status === 'unlinked') await m.link((name, ref) => module(resolve(dirname(ref.identifier), name)));
  if (m.status !== 'evaluated') await m.evaluate();
  Object.assign(old, m.namespace);
}
assert.equal(old.STATE_VERSION, 4, 'The old reader must be the actual schema4 R11 release');
assert.equal(STATE_VERSION, 5, 'This comparison requires the current schema5 implementation');
const oldClone = vm.runInContext('value => JSON.parse(JSON.stringify(value))', context);
const hostClone = value => JSON.parse(JSON.stringify(value));
const oldCommand = () => oldClone({type: 'setOption', option: 'flashes', value: .2});
const currentCommand = () => ({type: 'setOption', option: 'flashes', value: .3});
const receipt = loaded => ({slot: loaded.slot, revision: loaded.revision, checksum: loaded.checksum});
function memory() {
  const data = new Map(), writes = [];
  return {data, writes, getItem: key => data.get(key) ?? null, setItem(key, value) { writes.push(key); data.set(key, value); }};
}
function locks() {
  const tails = new Map(), calls = [];
  return {calls, async request(name, options, fn) {
    calls.push([name, options.mode]);
    const prior = tails.get(name) ?? Promise.resolve();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    tails.set(name, prior.then(() => gate));
    await prior;
    try { return await fn(); } finally { release(); }
  }};
}
function legacyState(version = 4, trained = false) {
  let state = old.createState();
  if (trained) {
    const trainedResult = old.reduceRuntime(state, oldClone({type: 'trainStarter', position: {x: 260, y: 325}}));
    assert.equal(trainedResult.ok, true);
    state = trainedResult.state;
  }
  if (version < 4) {
    state.version = version;
    delete state.actionSlots;
    state.options.controls.version = 2;
    delete state.options.controls.bindings.expert1;
    delete state.options.controls.bindings.expert2;
    if (version < 3) delete state.options.controls;
    if (version === 1) delete state.equipmentProgress;
  }
  assert.equal(old.validateState(state).ok, true, `Actual R11 accepts the original v${version} fixture`);
  assert.equal(validateState(hostClone(state)).ok, true);
  return state;
}
async function fixture({namespace = 'release', version = 4, two = false, trained = false} = {}) {
  const profile = namespace === 'release' ? 'main' : 'qa-shared-r11';
  const options = {profile, namespace}, storage = memory(), lock = locks();
  // Both implementations must resolve the same keys. Rejecting an unknown
  // qa-r12 namespace would not test a backwards-reader fence at all.
  assert.deepEqual(hostClone(old.profileKeys(profile, namespace)), profileKeys(profile, namespace));
  const legacy = old.createSession(storage, lock, options), current = createSession(storage, lock, options);
  const state = legacyState(version, trained);
  assert.equal((await legacy.save(state, {expectedRevision: 0})).ok, true);
  if (two) assert.equal((await legacy.save(state, {expectedRevision: 1})).ok, true);
  const controller = old.createController(legacy);
  assert.equal((await controller.load()).ok, true);
  const original = current.load();
  assert.equal(original.state.version, version);
  return {storage, lock, options, state, legacy, current, controller, original, newState: migrateState(hostClone(state))};
}
const upgrade = (f, storage = f.storage) => createSession(storage, f.lock, f.options).save(f.newState, {expectedRevision: f.original.revision});
function backupSummary(f) { return readUpgradeBackupV5(f.storage, f.options); }
function backupText(f) { return f.storage.getItem(upgradeBackupV5Key(f.options.profile, f.options.namespace)); }
async function assertOldBlocked(f, message) {
  const before = new Map(f.storage.data), writes = f.storage.writes.length;
  assert.equal(old.createStore(f.storage, f.options).load().code, 'CORRUPT', `${message}: fresh actual R11 reader`);
  assert.equal(f.legacy.load().code, 'CORRUPT', `${message}: existing actual R11 reader`);
  assert.equal((await f.legacy.save(f.state, {expectedRevision: f.original.revision})).code, 'CORRUPT', `${message}: stale actual R11 writer`);
  const fresh = old.createController(old.createSession(f.storage, f.lock, f.options));
  assert.equal((await fresh.load()).code, 'CORRUPT', `${message}: fresh actual R11 controller`);
  assert.equal((await fresh.start()).code, 'CORRUPT', `${message}: blocked old start`);
  const snapshot = hostClone(f.controller.snapshot());
  assert.equal((await f.controller.dispatch(oldCommand())).code, 'CORRUPT', `${message}: already-loaded old controller`);
  assert.equal((await f.controller.dispatch(oldCommand())).blocked, true, `${message}: repeated stale input stays blocked`);
  assert.deepEqual(hostClone(f.controller.snapshot()), snapshot);
  assert.equal(f.storage.writes.length, writes, `${message}: no attempted writes`);
  assert.deepEqual(f.storage.data, before, `${message}: no changed storage bytes`);
}
async function restoreExact(f, targetProfile) {
  const before = new Map(f.storage.data), summary = backupSummary(f), originalRaw = JSON.parse(backupText(f)).data.raw.slots[f.original.slot];
  const result = await restoreUpgradeBackupV5(f.storage, f.lock, {
    sourceProfile: f.options.profile, targetProfile, namespace: f.options.namespace, expectedBackupChecksum: summary.backupChecksum,
  });
  assert.equal(result.ok, true);
  const targetOptions = {profile: targetProfile, namespace: f.options.namespace};
  const restored = old.createSession(f.storage, f.lock, targetOptions), loaded = restored.load();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.state.version, f.original.state.version);
  assert.equal(old.validateState(loaded.state).ok, true);
  assert.deepEqual(hostClone(loaded.state), f.original.state);
  assert.deepEqual(receipt(loaded), receipt(f.original));
  assert.equal(f.storage.getItem(restored.keys.slots[loaded.slot]), originalRaw, 'Selected envelope is copied byte for byte');
  assert.equal(f.storage.getItem(restored.keys.slots[1 - loaded.slot]), null, 'Uncommitted history is not invented');
  const c = old.createController(restored);
  assert.equal((await c.load()).ok, true);
  assert.equal((await c.dispatch(oldCommand())).ok, true, 'Actual R11 can resume and commit the restored original');
  for (const [key, value] of before) assert.equal(f.storage.getItem(key), value, `Recovery changed protected source bytes: ${key}`);
  return loaded;
}
const scenarios = [];
async function scenario(name, run) { await run(); scenarios.push(name); }

for (const namespace of ['release', 'qa-r11']) {
  for (const unsafeField of ['previousCommit', 'upgradePreviousCommit']) await scenario(`${namespace}:unsafe-${unsafeField}-counterexample`, async () => {
    const f = await fixture({namespace});
    assert.equal((await upgrade(f)).ok, true);
    const head = JSON.parse(f.storage.getItem(f.current.keys.head));
    // Recreate the unsafe head layouts only in this disposable memory adapter.
    head[unsafeField] = head.upgradeV5PreviousCommit;
    delete head.upgradeV5PreviousCommit;
    f.storage.data.set(f.current.keys.head, JSON.stringify(head));
    const loaded = f.legacy.load();
    assert.equal(loaded.ok, true);
    assert.equal(loaded.recovered, true);
    assert.equal(loaded.state.version, 4);
    assert.equal((await f.legacy.save(f.state, {expectedRevision: f.original.revision})).ok, true, 'Actual old writer overwrites schema5 when exposed the old receipt');
    assert.equal(f.current.load().state.version, 4);
  });
  await scenario(`${namespace}:first5-fence`, async () => {
    const f = await fixture({namespace, two: true});
    const originalBytes = new Map(f.storage.data), firstWrite = f.storage.writes.length;
    assert.equal((await upgrade(f)).ok, true);
    const head = JSON.parse(f.storage.getItem(f.current.keys.head));
    assert.equal(head.previousCommit, null);
    assert.equal(head.upgradePreviousCommit, null);
    assert.deepEqual(head.upgradeV5PreviousCommit, receipt(f.original));
    const backup = JSON.parse(backupText(f));
    assert.deepEqual(backup.data.raw, {head: originalBytes.get(f.current.keys.head), slots: f.current.keys.slots.map(k => originalBytes.get(k) ?? null)});
    assert.deepEqual(f.storage.writes.slice(firstWrite), [upgradeBackupV5Key(f.options.profile, namespace), f.current.keys.slots[1 - f.original.slot], f.current.keys.head]);
    await assertOldBlocked(f, 'First committed schema5 fence');
    assert.equal(f.current.load().state.version, 5);
  });
  await scenario(`${namespace}:later5-history`, async () => {
    const f = await fixture({namespace});
    assert.equal((await upgrade(f)).ok, true);
    const immutable = backupText(f);
    for (let i = 0; i < 3; i++) {
      const previous = f.current.load();
      assert.equal((await f.current.save(previous.state, {expectedRevision: previous.revision})).ok, true);
      const head = JSON.parse(f.storage.getItem(f.current.keys.head));
      assert.deepEqual(head.previousCommit, receipt(previous));
      assert.equal(Object.hasOwn(head, 'upgradePreviousCommit'), false);
      assert.equal(Object.hasOwn(head, 'upgradeV5PreviousCommit'), false);
      assert.equal(backupText(f), immutable);
      await assertOldBlocked(f, `Later schema5 history ${i + 1}`);
    }
  });
  for (const damage of ['active', 'head']) await scenario(`${namespace}:first5-corrupt-${damage}`, async () => {
    const f = await fixture({namespace, two: true});
    assert.equal((await upgrade(f)).ok, true);
    const immutable = backupText(f), upgraded = f.current.load();
    f.storage.data.set(damage === 'head' ? f.current.keys.head : f.current.keys.slots[upgraded.slot], '{corrupt');
    const recovered = f.current.load();
    assert.equal(recovered.ok, true);
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.state.version, 4);
    assert.deepEqual(receipt(recovered), receipt(f.original));
    await assertOldBlocked(f, `First schema5 corrupt ${damage}`);
    assert.equal((await upgrade(f)).ok, true);
    assert.equal(f.current.load().state.version, 5);
    assert.equal(backupText(f), immutable);
    await assertOldBlocked(f, 'Repaired first schema5 retains fence');
  });
  for (const damage of ['active', 'head']) await scenario(`${namespace}:later5-corrupt-${damage}`, async () => {
    const f = await fixture({namespace});
    assert.equal((await upgrade(f)).ok, true);
    const previous = f.current.load(), immutable = backupText(f);
    assert.equal((await f.current.save(previous.state, {expectedRevision: previous.revision})).ok, true);
    const active = f.current.load();
    f.storage.data.set(damage === 'head' ? f.current.keys.head : f.current.keys.slots[active.slot], '{corrupt');
    const recovered = f.current.load();
    assert.equal(recovered.ok, true);
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.state.version, 5);
    assert.deepEqual(receipt(recovered), receipt(previous));
    assert.equal(backupText(f), immutable);
    await assertOldBlocked(f, `Later schema5 corrupt ${damage}`);
  });
  await scenario(`${namespace}:exact4-restore`, async () => {
    const f = await fixture({namespace, two: true, trained: true});
    const source = new Map(f.storage.data);
    assert.equal((await upgrade(f)).ok, true);
    const immutable = backupText(f);
    assert.equal(backupSummary(f).sourceVersion, 4);
    assert.equal(backupSummary(f).targetVersion, 5);
    assert.equal(JSON.parse(immutable).data.raw.head, source.get(f.current.keys.head));
    await restoreExact(f, 'qa-r11-restored4');
    assert.equal(backupText(f), immutable);
    assert.equal(f.current.load().state.version, 5);
  });
  for (const version of [1, 2, 3]) await scenario(`${namespace}:direct${version}-read-gate-upgrade-restore`, async () => {
    const f = await fixture({namespace, version, two: true});
    const before = new Map(f.storage.data), writes = f.storage.writes.length;
    const controller = createController(f.current), loaded = await controller.load();
    assert.equal(loaded.ok, true);
    assert.equal(loaded.state.version, 5, 'Controller migrates in memory only');
    assert.equal(f.current.load().state.version, version, 'Original disk version is unchanged after read');
    assert.deepEqual(f.storage.data, before);
    assert.equal(f.storage.writes.length, writes);
    assert.deepEqual(backupSummary(f), {ok: true, exists: false});
    assert.deepEqual(readUpgradeBackup(f.storage, f.options), {ok: true, exists: false});
    assert.equal((await controller.dispatch(currentCommand())).ok, true);
    assert.equal(f.current.load().state.version, 5);
    assert.equal(backupSummary(f).sourceVersion, version, 'No fabricated schema4 intermediary');
    assert.equal(backupSummary(f).targetVersion, 5);
    assert.equal(f.storage.getItem(upgradeBackupKey(f.options.profile, namespace)), null, 'Direct upgrade does not invent pre-v4 history');
    await assertOldBlocked(f, `Direct schema${version} to schema5`);
    await restoreExact(f, `qa-r11-restored${version}`);
  });
}
for (const fault of ['before-slot', 'after-slot', 'before-head', 'after-head']) await scenario(`release:${fault}`, async () => {
  const f = await fixture({two: true}), oldHead = f.storage.getItem(f.current.keys.head);
  const key = fault.includes('slot') ? f.current.keys.slots[1 - f.original.slot] : f.current.keys.head;
  const adapter = {...f.storage, setItem(k, v) {
    if (k === key) { if (fault.startsWith('after')) f.storage.setItem(k, v); throw Error(fault); }
    f.storage.setItem(k, v);
  }};
  assert.equal((await upgrade(f, adapter)).code, 'COMMIT_UNCERTAIN');
  const immutable = backupText(f);
  assert.equal(backupSummary(f).exists, true);
  if (fault === 'after-head') {
    assert.equal(f.current.load().state.version, 5);
    await assertOldBlocked(f, 'Head write succeeded before the adapter threw');
  } else {
    assert.equal(f.storage.getItem(f.current.keys.head), oldHead);
    assert.equal(f.current.load().state.version, 4);
    assert.equal(f.legacy.load().state.version, 4);
    // Verify the real loaded old controller on a cloned storage surface, so
    // the independent current-upgrade retry still refers to the same original.
    const fork = memory();
    for (const [k, v] of f.storage.data) fork.setItem(k, v);
    const oldController = old.createController(old.createSession(fork, locks(), f.options));
    assert.equal((await oldController.load()).ok, true);
    assert.equal((await oldController.dispatch(oldCommand())).ok, true);
    assert.equal((await upgrade(f)).ok, true);
    assert.equal(backupText(f), immutable);
    await assertOldBlocked(f, 'Successful retry commits fence');
  }
});
for (const after of [false, true]) await scenario(`release:preexisting-corrupt-head-${after ? 'after' : 'before'}-commit`, async () => {
  const f = await fixture({two: true});
  f.storage.data.set(f.current.keys.head, '{corrupt');
  f.original = f.current.load();
  assert.equal(f.original.recovered, true);
  assert.equal(f.original.revision, 1);
  assert.equal(f.legacy.load().revision, 1);
  const adapter = {...f.storage, setItem(k, v) {
    if (k === f.current.keys.head) { if (after) f.storage.setItem(k, v); throw Error('head boundary'); }
    f.storage.setItem(k, v);
  }};
  assert.equal((await upgrade(f, adapter)).code, 'COMMIT_UNCERTAIN');
  assert.equal(backupSummary(f).recovered, true);
  assert.equal(f.current.load().state.version, after ? 5 : 4);
  // Before-head staging can remove R11's only parseable recovery proof when
  // the original head was already corrupt. Never claim this remains readable.
  await assertOldBlocked(f, 'Already-corrupt old head has no R11-readable recovery proof');
  await restoreExact(f, 'qa-r11-recovered-head');
});
await scenario('release:pre-v4-remains-independent', async () => {
  const f = await fixture({version: 3});
  assert.equal((await f.legacy.save(old.migrateState(f.state), {expectedRevision: f.original.revision})).ok, true);
  const oldKey = upgradeBackupKey(f.options.profile, f.options.namespace), pre4 = f.storage.getItem(oldKey);
  assert.ok(pre4);
  assert.equal(old.readUpgradeBackup(f.storage, f.options).sourceVersion, 3);
  f.original = f.current.load();
  f.state = oldClone(f.original.state);
  f.newState = migrateState(f.original.state);
  assert.equal((await f.controller.load()).ok, true);
  assert.equal((await upgrade(f)).ok, true);
  assert.equal(backupSummary(f).sourceVersion, 4);
  assert.equal(f.storage.getItem(oldKey), pre4);
  await assertOldBlocked(f, 'Prior pre-v4 history cannot expose retained schema4');
  await restoreExact(f, 'qa-r11-chained-restored4');
  assert.equal(f.storage.getItem(oldKey), pre4);
});
for (const [file, hash] of baselineHashes) assert.equal(digest(await readFile(resolve(root, file))), hash, `Historical module changed during verification: ${file}`);
console.log(JSON.stringify({
  ok: true, scenarios, scenarioCount: scenarios.length, sourceCommit,
  legacyRoot: root, legacyVersion: old.STATE_VERSION, currentVersion: STATE_VERSION,
  manifestFiles: baselineHashes.size, legacyModulesRead: modules.size, legacySourceUnchanged: true,
  sharedNamespaces: ['release', 'qa-r11'], unknownNamespaceRejectionCountedAsFence: false,
  scope: 'Exact R11b6 validator/store/writer/controller with schema5 production save APIs; isolated in-memory storage, substituted Web Locks and intentional fault injection. No browser, live profile, remote write, or gameplay acceptance.',
}, null, 2));
