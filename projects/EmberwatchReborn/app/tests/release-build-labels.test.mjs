import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../src/main.js'),label=main.match(/const BUILD_LABEL='([^']+)'/)[1];
test('candidate title, recovery and generated manifest identify the same game build',()=>{
 assert.match(label,/^R\d+[a-z]\d+$/);
 const recovery=read('../src/recovery-page.js').match(/RECOVERY_BUILD='([^']+)'/)[1];
 assert.equal(recovery,label);
 assert.ok(read('../src/index.html').includes(`Emberwatch Reborn ${label}:`));
 const build=read('../scripts/build-r14.mjs');
 assert.ok(build.includes(`kind:'${label} POE-style input candidate`));
 assert.ok(build.includes("namespace:'qa-r14'"));
 assert.ok(build.includes("recovery/index.html"));
 assert.ok(build.includes("src=\"recovery-entry-r14.js\""));
 assert.ok(main.includes('${BUILD_LABEL}'));
 const archivedBuild=read('../scripts/build.mjs');assert.ok(archivedBuild.includes("manifest.kind='R12a6 browser-local historical save recovery tool"));
});
