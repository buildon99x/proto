// Actual uninstrumented modules, isolated memory stores and immediate lock stub.
// Execute only when focused/aggregate tests and native browser input are stopped.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const roots={baseline:'../emberwatch-r14a17-scene-cache-project/app/src/',candidate:'../emberwatch-head-first-save-patch/app/src/'};
const modules=Object.fromEntries(await Promise.all(Object.entries(roots).map(async([name,root])=>[name,{...(await import(new URL(root+'save.js',import.meta.url))),...(await import(new URL(root+'controller.js',import.meta.url)))}])));
const fixtures=JSON.parse(readFileSync(new URL('../r14a15-scene-cost-audit/earned-scene-fixtures.json',import.meta.url),'utf8')),hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const stats=xs=>{const a=xs.toSorted((x,y)=>x-y);return {n:a.length,min:a[0],p50:a[Math.floor(a.length*.5)],p95:a[Math.min(a.length-1,Math.floor(a.length*.95))],max:a.at(-1)};};
async function fixture(name,state){
 const data=new Map();let ops=[];const storage={getItem(k){const v=data.get(k)??null;ops.push({op:'get',key:k,valueHash:v===null?null:hash(v)});return v;},setItem(k,v){data.set(k,v);ops.push({op:'set',key:k,valueHash:hash(v)});}};
 const m=modules[name],store=m.createSession(storage,{request:async(name,opts,fn)=>fn()},{profile:'qa-head-first-benchmark',namespace:'qa-r14'});
 assert.equal((await store.save(state,{expectedRevision:0})).ok,true);assert.equal((await store.save(state,{expectedRevision:1})).ok,true);const controller=m.createController(store);assert.equal((await controller.load()).ok,true);
 return {data,store,controller,reset:()=>{ops=[];},operations:()=>structuredClone(ops)};
}
async function trial(h){const s=h.controller.snapshot(),command={type:'checkpoint',life:s.world.life??0,position:{...s.world.position},vitals:{...s.vitals},recovery:structuredClone(s.recovery),expectedStoreRevision:h.controller.revision()};h.reset();const cpu=process.cpuUsage(),start=performance.now(),result=await h.controller.dispatch(command),elapsedMs=performance.now()-start,used=process.cpuUsage(cpu);assert.equal(result.ok,true,result.reason);assert.deepEqual(result.state,s);return {elapsedMs,processCpuMs:(used.user+used.system)/1000,revision:result.revision,stateHash:hash(result.state),eventsHash:hash(result.events),storageHash:hash([...h.data]),operations:h.operations()};}
const report={startedAtUtc:new Date().toISOString(),scope:'Uninstrumented a17 vs head-first-only candidate, earned synthetic states, in-memory exact-string storage and immediate fake Web Lock. Not real localStorage/lock-wait/native input performance, and not proof of all save-input expiry resolution.',pairsPerStage:8,warmupsPerVariantStage:2,stages:[]};
for(const stage of ['entered','chosen','approach','evidence']){
 const state=fixtures[stage],before=hash(state),a=await fixture('baseline',structuredClone(state)),b=await fixture('candidate',structuredClone(state));for(let i=0;i<2;i++){const x=await trial(a),y=await trial(b);assert.equal(x.storageHash,y.storageHash);}
 const pairs=[];for(let i=0;i<report.pairsPerStage;i++){let baseline,candidate;if(i%2){candidate=await trial(b);baseline=await trial(a);}else{baseline=await trial(a);candidate=await trial(b);}for(const k of ['revision','stateHash','eventsHash','storageHash'])assert.equal(candidate[k],baseline[k],k);assert.deepEqual(candidate.operations,baseline.operations);pairs.push({order:i%2?'candidate-baseline':'baseline-candidate',baseline,candidate});}
 assert.equal(hash(state),before);report.stages.push({stage,baseline:stats(pairs.map(p=>p.baseline.elapsedMs)),candidate:stats(pairs.map(p=>p.candidate.elapsedMs)),pairedDifferenceMs:stats(pairs.map(p=>p.baseline.elapsedMs-p.candidate.elapsedMs)),identicalStateEventsStorageAndReadWriteOperations:true,pairs});
}
report.completedAtUtc=new Date().toISOString();report.ok=true;writeFileSync(new URL('./head-first-paired-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,stages:report.stages.map(({pairs,...s})=>s)},null,2));
