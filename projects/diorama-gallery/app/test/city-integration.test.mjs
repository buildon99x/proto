import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const expected=['harbor','singapore','dubai','desert','desert-timelapse','dubai-timelapse','istanbul-timelapse','paris-timelapse','rome','rome-timelapse'];
test('all published cities and formation scenes have unique gallery and standalone entries',()=>{
 const registry=read('../src/worlds.js');
 const ids=[...registry.matchAll(/\{id:'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(ids,expected);
 const numbers=[...registry.matchAll(/number:'([^']+)'/g)].map(m=>m[1]);
 assert.equal(new Set(numbers).size,expected.length);
 const build=read('../build.mjs');
 for(const id of expected){assert.ok(registry.includes(`file:'${id}.html'`),id);assert.ok(build.includes(`dist/${id}.html`),id);}
});
test('gallery preserves desert camera modes, common visual controls and single-session disposal',()=>{
 const main=read('../src/main.js');
 for(const marker of ['referenceView','cinematicView','attachEnvironmentControls','attachPlaybackControls','attachVisualControls','session.close()'])assert.ok(main.includes(marker),marker);
 assert.ok(main.includes("get('world')"));
});
