import test from 'node:test';
import assert from 'node:assert/strict';
import {runDiagnostic} from '../server/distributed/diagnostic.mjs';
test('diagnostic retains actual first join response rather than a stage annotation',async()=>{
 let checks=0,stops=0;const marker=Object.assign(Error('controlled stop after first join'),{code:'AFTER_JOIN'});
 const storeFactory=()=>({check:async()=>{if(++checks===2)throw marker;return{availability:{ok:true},serverTime:Date.now()};}});
 const coordinatorFactory=()=>({pump:async commands=>({availability:{ok:true},serverTime:Date.now(),snapshots:{sunroom:{rooms:[{count:1}]}},results:Object.fromEntries((commands??[]).filter(c=>c.type==='join').map(c=>[c.id,{type:'welcome',id:'test-player',token:'test-only',room:'sunroom'}]))}),stop:async()=>{stops++;}});
 await assert.rejects(runDiagnostic({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/cat-cafe-metaverse',CAT_CAFE_REDIS_DIAGNOSTIC:'bootstrap-once'},{storeFactory,coordinatorFactory}),error=>error===marker&&error.diagnosticStage==='join');
 assert.equal(checks,2);assert.equal(stops,2);
});
