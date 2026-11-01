import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBudget} from '../server/distributed/budget-inspection.mjs';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/cat-cafe-metaverse',CAT_CAFE_REDIS_DIAGNOSTIC:'budget-readonly',CAT_CAFE_REALTIME_ENABLED:'0'};
test('budget inspection issues only one fixed GET and emits allowlisted counters',async()=>{
 const calls=[];const now=Date.UTC(2026,10,1,4);const day=String(Math.floor(now/86400000));
 const result=await inspectBudget(env,{now,transport:{command:async args=>{calls.push(args);return JSON.stringify({version:1,days:{[day]:{ops:200,bytes:268435450,activeMs:5000}},months:{'2026-11':{ops:300,bytes:268435460}},private:'never-output'});}}});
 assert.deepEqual(calls,[['GET','cat-cafe:resource-budget:v1']]);assert.equal(result.current.day.bytes,268435450);assert.equal(JSON.stringify(result).includes('never-output'),false);assert.equal(result.resetAt.day,Date.UTC(2026,10,2));
});
test('budget inspection refuses enabled service and wrong branch before transport',async()=>{
 for(const bad of [{...env,CAT_CAFE_REALTIME_ENABLED:'1'},{...env,VERCEL_GIT_COMMIT_REF:'main'}])await assert.rejects(inspectBudget(bad,{transport:{command:()=>{throw Error('must not run')}}}));
});
test('missing periods are explicitly identified rather than claiming untouched allowance',async()=>{const result=await inspectBudget(env,{transport:{command:async()=>JSON.stringify({version:1,days:{},months:{}})}});assert.deepEqual(result.present,{day:false,month:false});});
