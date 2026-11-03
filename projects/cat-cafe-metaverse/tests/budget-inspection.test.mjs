import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBudget} from '../server/distributed/budget-inspection.mjs';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/cat-cafe-metaverse',CAT_CAFE_REDIS_DIAGNOSTIC:'budget-readonly',CAT_CAFE_REALTIME_ENABLED:'0'};
test('budget inspection issues only one fixed GET and emits allowlisted counters',async()=>{
 const calls=[];const now=Date.UTC(2026,10,1,4);const day=String(Math.floor(now/86400000));
 const result=await inspectBudget(env,{now,transport:{command:async args=>{calls.push(args);return JSON.stringify({version:1,days:{[day]:{ops:200,bytes:268435450,activeMs:5000}},months:{'2026-11':{ops:300,bytes:268435460}},private:'never-output'});}}});
 assert.deepEqual(calls,[['GET','cat-cafe:resource-budget:v1']]);assert.equal(result.current.day.bytes,268435450);assert.equal(JSON.stringify(result).includes('never-output'),false);assert.equal(result.resetAt.day,Date.UTC(2026,10,2));
});
test('budget inspection refuses wrong branch and production before transport',async()=>{
 for(const bad of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'main'}])await assert.rejects(inspectBudget(bad,{transport:{command:()=>{throw Error('must not run')}}}));
});
test('missing periods are explicitly identified rather than claiming untouched allowance',async()=>{const result=await inspectBudget(env,{transport:{command:async()=>JSON.stringify({version:1,days:{},months:{}})}});assert.deepEqual(result.present,{day:false,month:false});});
test('state health reads one fixed state key and never emits identifiers or private payload',async()=>{const {inspectStateHealth}=await import('../server/distributed/budget-inspection.mjs');const calls=[];const result=await inspectStateHealth({...env,CAT_CAFE_REDIS_DIAGNOSTIC:'state-health-readonly'},{now:10000,transport:{command:async args=>{calls.push(args);return JSON.stringify({version:1,checkpoint:null,presence:{'secret-id':9000},queue:[{type:'leave',token:'secret-token'}],snapshots:{},owner:'secret-owner',revision:4});}}});assert.deepEqual(calls,[['GET','cat-cafe:preview:v1']]);assert.equal(result.presence.count,1);assert.equal(result.commands.leave,1);assert.equal(JSON.stringify(result).includes('secret'),false);});
test('state health refuses wrong scope and reports malformed checkpoint without payload',async()=>{const {inspectStateHealth}=await import('../server/distributed/budget-inspection.mjs');await assert.rejects(inspectStateHealth({...env,CAT_CAFE_REDIS_DIAGNOSTIC:'state-health-readonly',CAT_CAFE_REALTIME_ENABLED:'1'},{transport:{command:()=>assert.fail('must not run')}}));const result=await inspectStateHealth({...env,CAT_CAFE_REDIS_DIAGNOSTIC:'state-health-readonly'},{transport:{command:async()=>JSON.stringify({version:1,checkpoint:JSON.stringify({private:'never-echo'})})}});assert.deepEqual(result.checkpoint,{status:'invalid',code:'INVALID_CHECKPOINT'});assert.equal(JSON.stringify(result).includes('never-echo'),false);});

test('active service budget inspection still performs exactly one fixed GET',async()=>{const calls=[];const result=await inspectBudget({...env,CAT_CAFE_REALTIME_ENABLED:'1'},{transport:{command:async args=>{calls.push(args);return JSON.stringify({version:1,days:{},months:{}})}}});assert.deepEqual(calls,[['GET','cat-cafe:resource-budget:v1']]);assert.equal(result.inspectionCommands,1);});
