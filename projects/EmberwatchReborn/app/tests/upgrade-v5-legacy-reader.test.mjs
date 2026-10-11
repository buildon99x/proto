import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('actual frozen R11b6 readers, writers and controllers fail closed across schema5 commits and resume exact recovered originals', () => {
  const script = fileURLToPath(new URL('../scripts/check-upgrade-v5-legacy-reader.mjs', import.meta.url));
  const result = spawnSync(process.execPath, ['--experimental-vm-modules', script], {encoding: 'utf8', maxBuffer: 1024 * 1024});
  assert.equal(result.status, 0, result.stderr + '\n' + result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, true);
  assert.equal(report.sourceCommit, '17b13fa04fec8336d2c08f3c4603a0d2e8d00276');
  assert.equal(report.legacyVersion, 4);
  assert.equal(report.currentVersion, 5);
  assert.equal(report.manifestFiles, 41);
  assert.equal(report.legacyModulesRead, 40);
  assert.equal(report.legacySourceUnchanged, true);
  assert.deepEqual(report.sharedNamespaces, ['release', 'qa-r11']);
  assert.equal(report.unknownNamespaceRejectionCountedAsFence, false);
  const expected = [];
  for (const namespace of ['release', 'qa-r11']) expected.push(...[
    'unsafe-previousCommit-counterexample', 'unsafe-upgradePreviousCommit-counterexample',
    'first5-fence', 'later5-history', 'first5-corrupt-active', 'first5-corrupt-head',
    'later5-corrupt-active', 'later5-corrupt-head', 'exact4-restore',
    'direct1-read-gate-upgrade-restore', 'direct2-read-gate-upgrade-restore', 'direct3-read-gate-upgrade-restore',
  ].map(name => `${namespace}:${name}`));
  expected.push(...['before-slot', 'after-slot', 'before-head', 'after-head',
    'preexisting-corrupt-head-before-commit', 'preexisting-corrupt-head-after-commit', 'pre-v4-remains-independent',
  ].map(name => `release:${name}`));
  assert.deepEqual(report.scenarios, expected);
  assert.equal(report.scenarioCount, expected.length);
});
