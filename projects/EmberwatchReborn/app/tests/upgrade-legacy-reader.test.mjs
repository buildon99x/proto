import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('frozen exact-byte R7a4 reader, validator and stale controller obey first-upgrade fence and restored checkpoint',()=>{
 const script=fileURLToPath(new URL('../scripts/check-upgrade-legacy-reader.mjs',import.meta.url));
 const result=spawnSync(process.execPath,['--experimental-vm-modules',script],{encoding:'utf8',maxBuffer:1024*1024});
 assert.equal(result.status,0,result.stderr+'\n'+result.stdout);const report=JSON.parse(result.stdout);assert.equal(report.ok,true);assert.equal(report.checks,32);assert.equal(report.legacySourceUnchanged,true);
});
