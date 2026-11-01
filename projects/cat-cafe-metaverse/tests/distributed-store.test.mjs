import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedisStore} from '../server/distributed/store.mjs';
const options={url:'https://test.upstash.io',token:'test-only',namespace:'cat-cafe:preview:v1',budgetNamespace:'cat-cafe:resource-budget:v1'};
test('Redis adapter sends exact two keys and preserves checkpoint empty arrays',async()=>{let args;const store=createRedisStore({...options,fetchImpl:async(url,request)=>{args=JSON.parse(request.body);return new Response(JSON.stringify({result:JSON.stringify({availability:{ok:true},checkpoint:'{"players":[]}',snapshots:'{"sunroom":{"players":[]}}',commands:{}})}));}});const view=await store.commit({checkpoint:{players:[]},snapshots:{sunroom:{players:[]}}});assert.equal(args[0],'EVALSHA');assert.equal(args[2],2);assert.deepEqual(args.slice(3,5),[options.budgetNamespace,options.namespace]);assert.equal(typeof JSON.parse(args[6]).checkpoint,'string');assert.deepEqual(view.checkpoint,{players:[]});assert.deepEqual(view.commands,[]);});
test('known exhausted store rejects locally without repeated Redis polling',async()=>{let calls=0;const store=createRedisStore({...options,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({result:JSON.stringify({availability:{ok:false,reason:'BUDGET_EXHAUSTED'},serverTime:1})}));}});await store.open({commands:[]});await store.open({commands:[]});await store.release({});assert.equal(calls,1);});
test('approved bootstrap clears only missing-state negative cache after success',async()=>{let calls=0;const store=createRedisStore({...options,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({result:JSON.stringify({availability:calls===1?{ok:false,reason:'STORE_NOT_INITIALIZED'}:{ok:true},serverTime:1})}));}});await store.check();await store.bootstrap();assert.equal((await store.check()).availability.ok,true);assert.equal(calls,3);});
test('daily quota negative cache expires on same instance at trusted reset window',async()=>{let now=100,calls=0;const store=createRedisStore({...options,clock:()=>now,fetchImpl:async()=>{calls++;return new Response(JSON.stringify({result:JSON.stringify({availability:calls===1?{ok:false,reason:'BUDGET_EXHAUSTED',scope:'day',resetAt:200}:{ok:true},serverTime:now})}));}});await store.check();await store.check();assert.equal(calls,1);now=200;assert.equal((await store.check()).availability.ok,true);assert.equal(calls,2);});
test('commit reserves six largest single-room snapshots plus unique acknowledgement bytes',async()=>{let payload;const store=createRedisStore({...options,fetchImpl:async(url,request)=>{const args=JSON.parse(request.body);payload=JSON.parse(args[6]);return new Response(JSON.stringify({result:JSON.stringify({availability:{ok:true},serverTime:1})}));}});const snapshots={a:{players:[]},b:{players:[{id:'visitor'}]},c:{players:[]}},results={c:{type:'actionResult',ok:true}};await store.commit({checkpoint:{},snapshots,results});assert.equal(payload.egressBytes,6*(512+Math.max(...Object.values(snapshots).map(s=>Buffer.byteLength(JSON.stringify(s)))))+Buffer.byteLength(JSON.stringify(results))+32);});

import {ATOMIC_SCRIPT} from '../server/distributed/atomic-script.mjs';
test('Lua source contract omits public fields only from leader output (not execution proof)',()=>{
 assert.match(ATOMIC_SCRIPT,/if not leader then value.results=s.results;value.snapshots=s.snapshots or {} end/);
 assert.match(ATOMIC_SCRIPT,/return output\(s.owner==request.ownerId\)/);
 assert.equal((ATOMIC_SCRIPT.match(/return output\(false\)/g)||[]).length,2);
});
import {DEFAULT_LIMITS} from '../server/distributed/store.mjs';
test('reviewed daily headroom remains below unchanged monthly ceilings and active limit',()=>{
 assert.deepEqual(DEFAULT_LIMITS,{dayOps:250000,monthOps:350000,dayBytes:768*1024*1024,monthBytes:1024*1024*1024,activeMs:30*60000});
 for(const key of ['dayOps','monthOps','dayBytes','monthBytes','activeMs'])assert.throws(()=>createRedisStore({...options,limits:{[key]:DEFAULT_LIMITS[key]+1}}),/Invalid budget/);
});
test('headroom update sends limits only, never resets counters; monthly rejection remains fail closed',async()=>{
 const calls=[];const store=createRedisStore({...options,fetchImpl:async(url,request)=>{const args=JSON.parse(request.body);calls.push(args);return new Response(JSON.stringify({result:JSON.stringify({availability:{ok:false,reason:'BUDGET_EXHAUSTED',scope:'month',resetAt:Date.now()+60000},serverTime:Date.now()})}));}});
 const result=await store.check();assert.equal(result.availability.scope,'month');await store.open({ownerId:'test',commands:[]});assert.equal(calls.length,1);
 assert.equal(calls[0][5],'check');assert.deepEqual(JSON.parse(calls[0][6]),{});assert.deepEqual(JSON.parse(calls[0][7]),DEFAULT_LIMITS);
 // Source contract only: existing durable counters are reused and both caps checked.
 assert.match(ATOMIC_SCRIPT,/local d=b.days\[dayKey\] or/);assert.match(ATOMIC_SCRIPT,/local m=b.months\[monthKey\] or/);
 assert.match(ATOMIC_SCRIPT,/local monthly=m.ops\+operations>limits.monthOps or m.bytes\+bytes>limits.monthBytes/);
 assert.match(ATOMIC_SCRIPT,/if daily or monthly then/);
});
