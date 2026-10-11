// Usage: node verify-checkpoint-counts.mjs BASELINE_ROOT CANDIDATE_ROOT EARNED_FIXTURES_JSON
// Isolated source instrumentation executes the actual controller/store/validator
// graph. It adds counters only; neither project is edited and no timing is claimed.
import assert from 'node:assert/strict';
import {cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const [baselinePath, candidatePath, fixturesPath] = process.argv.slice(2);
assert.ok(baselinePath && candidatePath && fixturesPath, 'Provide baseline, candidate and earned fixture paths');
const fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'));
const temp = mkdtempSync(join(tmpdir(), 'emberwatch-save-counts-'));
const sha = value => createHash('sha256').update(value).digest('hex');
const report = {scope: 'Actual isolated Node checkpoint graph, memory storage and immediate fake Web Lock; call counts and semantic parity only. No native latency or input-fix claim.', stages: []};
try {
  const variants = [];
  for (const [name, root, expectedValidations, expectedDecodes] of [['baseline', baselinePath, 7, 2], ['candidate', candidatePath, 6, 1]]) {
    const destination = join(temp, name);
    cpSync(join(resolve(root), 'app/src'), destination, {recursive: true});
    writeFileSync(join(destination, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(destination, 'save-count-observer.js'), 'export const counts={validations:0,decodes:0};\n');
    for (const [file, signature, counter] of [['state.js', 'export function validateState(state) {', 'validations'], ['save.js', 'function decode(raw) {', 'decodes']]) {
      const path = join(destination, file), original = readFileSync(path, 'utf8');
      assert.equal(original.split(signature).length, 2, `${name}/${file} instrumentation anchor`);
      writeFileSync(path, "import {counts} from './save-count-observer.js';\n" + original.replace(signature, `${signature}\n  counts.${counter}++;`));
    }
    const {createSession} = await import(pathToFileURL(join(destination, 'save.js')).href);
    const {createController} = await import(pathToFileURL(join(destination, 'controller.js')).href);
    const {counts} = await import(pathToFileURL(join(destination, 'save-count-observer.js')).href);
    variants.push({name, createSession, createController, counts, expectedValidations, expectedDecodes});
    report[`${name}SaveSha256`] = sha(readFileSync(join(resolve(root), 'app/src/save.js')));
  }
  for (const stage of ['entered', 'chosen', 'approach', 'evidence']) {
    const outputs = [];
    for (const variant of variants) {
      const {name, createSession, createController, counts, expectedValidations, expectedDecodes} = variant;
      const data = new Map(), operations = [], lockCalls = [];
      const storage = {
        getItem(key) { operations.push(['get', key]); return data.get(key) ?? null; },
        setItem(key, value) { operations.push(['set', key]); data.set(key, value); },
      };
      const store = createSession(storage, {async request(key, options, fn) { lockCalls.push([key, options]); return fn(); }}, {profile: 'qa-head-counts', namespace: 'qa-r14'});
      const state = structuredClone(fixtures[stage]);
      assert.equal((await store.save(state, {expectedRevision: 0})).ok, true);
      assert.equal((await store.save(state, {expectedRevision: 1})).ok, true);
      const controller = createController(store); assert.equal((await controller.load()).ok, true);
      const before = controller.snapshot();
      const command = {type: 'checkpoint', life: before.world.life ?? 0, position: {...before.world.position}, vitals: {...before.vitals}, recovery: structuredClone(before.recovery), expectedStoreRevision: controller.revision()};
      counts.validations = 0; counts.decodes = 0; operations.length = 0; lockCalls.length = 0;
      const result = await controller.dispatch(command);
      assert.equal(result.ok, true, result.reason); assert.deepEqual(result.state, before);
      assert.equal(counts.validations, expectedValidations); assert.equal(counts.decodes, expectedDecodes);
      assert.equal(operations.filter(([op]) => op === 'get').length, 7); assert.equal(operations.filter(([op]) => op === 'set').length, 2);
      assert.deepEqual(lockCalls, [[store.keys.lock, {mode: 'exclusive'}]]);
      outputs.push({name, counts: {...counts}, operations: [...operations], lockCalls: [...lockCalls], result, data});
    }
    assert.deepEqual(outputs[0].result, outputs[1].result); assert.deepEqual(outputs[0].data, outputs[1].data);
    assert.deepEqual(outputs[0].operations, outputs[1].operations); assert.deepEqual(outputs[0].lockCalls, outputs[1].lockCalls);
    report.stages.push({stage, baseline: outputs[0].counts, candidate: outputs[1].counts, exactResultAndStoredBytesEqual: true, exactStorageAndLockProtocolEqual: true, storageReads: 7, storageWrites: 2, stateSha256: sha(JSON.stringify(outputs[0].result.state))});
  }
  report.ok = true;
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(temp, {recursive: true, force: true});
}
