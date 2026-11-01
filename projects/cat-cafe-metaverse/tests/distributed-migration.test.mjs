import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {createRedisStore} from '../server/distributed/store.mjs';
import {ATOMIC_SCRIPT} from '../server/distributed/atomic-script.mjs';
const options={url:'https://test.upstash.io',token:'fixture',namespace:'cat-cafe:preview:v1',budgetNamespace:'cat-cafe:resource-budget:v1'};
test('explicit migration bypasses cached schema mismatch and success clears only that negative cache',async()=>{
 const calls=[];const store=createRedisStore({...options,fetchImpl:async(_,r)=>{const args=JSON.parse(r.body);calls.push(args[5]);return new Response(JSON.stringify({result:JSON.stringify({availability:calls.length===1?{ok:false,reason:'SCHEMA_MISMATCH'}:{ok:true},serverTime:1000})}));}});
 await store.check();assert.equal(typeof store.migrateAuthority,'function');await store.migrateAuthority();assert.equal((await store.check()).availability.ok,true);assert.deepEqual(calls,['check','migrate-authority-v2','check']);
});
test('Lua migration source is before pruning, strict2 runtime, metered and old cutoff computed first (source contract only)',()=>{
 assert.match(ATOMIC_SCRIPT,/s.version~=2/);const migrate=ATOMIC_SCRIPT.indexOf("if operation=='migrate-authority-v2' then",ATOMIC_SCRIPT.indexOf('local function reject'));
 assert.ok(migrate>0&&migrate<ATOMIC_SCRIPT.indexOf('for id,expiry in pairs(s.dedup)'));assert.ok(ATOMIC_SCRIPT.indexOf('local elapsed=0')<migrate);
 assert.match(ATOMIC_SCRIPT,/s.version=2;s.fence=s.fence\+1;s.revision=s.revision\+1;s.owner='';s.deadline=now/);
 assert.match(ATOMIC_SCRIPT,/migrationReserve/);
});
import {migrateAuthority} from '../server/distributed/migration.mjs';
import {LEGACY_V1_SCRIPT} from '../server/distributed/legacy-v1-script.mjs';
import {runBuildDiagnostic} from '../../../scripts/cat-cafe-vercel-diagnostic.mjs';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'codex/cat-cafe-metaverse',CAT_CAFE_REDIS_DIAGNOSTIC:'migrate-authority-v2',CAT_CAFE_REALTIME_ENABLED:'0'};
function fixture({mutate=false,legacySucceeds=false,version=1}={}){
 const state={version,fence:4,revision:9,owner:'old-owner',deadline:5000,accountedAt:1000,checkpoint:'private checkpoint and token',queue:[{id:'queued'}],results:{done:{token:'private'}},dedup:{done:999},presence:{old:1000},retired:{expired:1},lastTick:1000,active:true};
 const budget={version:1,createdAt:1,days:{'0':{ops:50,bytes:1000,activeMs:10}},months:{'1970-1':{ops:50,bytes:1000}}};const counter=budget.days['0'];let calls=0;const operations=[];const metrics={requests:0,bytesOut:0,bytesIn:0,scriptMisses:0};
 return{state,budget,operations,get calls(){return calls;},transportFactory:()=>({metrics,command:async args=>{metrics.requests++;if(args[0]==='GET')return JSON.stringify(args[1]===options.budgetNamespace?budget:state);assert.equal(args[1],LEGACY_V1_SCRIPT);operations.push(args[5]);return JSON.stringify({availability:legacySucceeds?{ok:true}:{ok:false,reason:args[5]==='bootstrap'?'BOOTSTRAP_CONFLICT':'SCHEMA_MISMATCH'}});}}),storeFactory:()=>({metrics:{},migrateAuthority:async()=>{calls++;counter.ops+=72;counter.bytes+=524288;budget.months['1970-1'].ops+=72;budget.months['1970-1'].bytes+=524288;const from=state.version,previousFence=state.fence,previousRevision=state.revision,dayActiveBefore=counter.activeMs,privateState=JSON.stringify(Object.fromEntries(Object.entries(state).filter(([k])=>!['version','fence','revision','owner','deadline','accountedAt'].includes(k))));if(from===1){state.version=2;state.fence++;state.revision++;state.owner='';state.deadline=6000;counter.activeMs+=4000;state.accountedAt=6000;}if(mutate)state.queue=[];return{availability:{ok:true},serverTime:6000,migration:{fromVersion:from,migrated:from===1,fence:state.fence,revision:state.revision,previousFence,previousRevision,privateState,oldLeaseElapsed:from===1?4000:0,dayActiveBefore}};}})};
}
test('executable migration helper proves preserved readback, idempotence and five legacy rejects using contract fixture (not Lua proof)',async()=>{
 const f=fixture(),result=await migrateAuthority(env,f);assert.equal(result.passed,true);assert.deepEqual(result.legacyRejected,['check','open','commit','release','bootstrap']);assert.equal(f.calls,2);assert.equal(f.state.fence,5);assert.equal(f.state.revision,10);assert.equal(f.budget.version,1);assert.equal(f.budget.days[0].activeMs,4010);assert.equal(f.budget.days[0].ops,194);assert.equal(f.budget.days[0].bytes,1049576);assert.doesNotMatch(JSON.stringify(result),/private checkpoint|old-owner|"token"/);
 const rerun=await migrateAuthority(env,f);assert.equal(rerun.migrated,false);assert.equal(f.state.fence,5);assert.equal(f.state.revision,10);
});
test('migration helper refuses unexpected mutation or legacy success rather than emitting success',async()=>{
 await assert.rejects(migrateAuthority(env,fixture({mutate:true})),/private state mutation/);
 const f=fixture({legacySucceeds:true});await assert.rejects(migrateAuthority(env,f),/did not fail closed/);assert.deepEqual(f.operations,['check']);
});
test('migration only runs exact inactive preview branch after build and never through default prebuild hook',async()=>{
 let calls=0;const run=async()=>{calls++;return{passed:true};};assert.deepEqual(await runBuildDiagnostic(env,run),{skipped:true});assert.deepEqual(await runBuildDiagnostic(env,run,{afterBuild:true}),{passed:true});assert.equal(calls,1);
 for(const patch of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_REF:'main'},{CAT_CAFE_REALTIME_ENABLED:'1'},{CAT_CAFE_REDIS_DIAGNOSTIC:'bootstrap-once'}])await assert.rejects(migrateAuthority({...env,...patch},fixture()),/scope denied/);
 assert.deepEqual(await runBuildDiagnostic({...env,CAT_CAFE_REDIS_DIAGNOSTIC:'bootstrap-once'},run,{afterBuild:true}),{skipped:true});
});
test('frozen legacy source rejects unknown authority before normal writes and bootstrap never overwrites existing keys (source contract)',()=>{
 const guard=LEGACY_V1_SCRIPT.indexOf("if b.version~=1 or s.version~=1 then return unavailable('SCHEMA_MISMATCH') end");assert.ok(guard>0);assert.ok(guard<LEGACY_V1_SCRIPT.indexOf('for id,expiry in pairs(s.dedup)'));assert.ok(guard<LEGACY_V1_SCRIPT.indexOf('local function finish'));
 assert.match(LEGACY_V1_SCRIPT,/if rawBudget or rawState then return unavailable\('BOOTSTRAP_CONFLICT'\) end/);
});
import {World} from '../server/world.mjs';
import {exportWorld} from '../server/state-codec.mjs';
import {createCoordinator} from '../server/distributed/coordinator.mjs';
test('preserved checkpoint resumes same token within original deadline at six seats, late recovery frees expired seats (contract model)',async()=>{
 const world=new World({clock:()=>1000});const joined=Array.from({length:6},(_,i)=>world.join(`1000:c${i}`,'sunroom'));
 const f=fixture();f.state.checkpoint=JSON.stringify(exportWorld(world));f.state.presence=Object.fromEntries(Array.from({length:6},(_,i)=>[`1000:c${i}`,1000]));await migrateAuthority(env,f);
 async function recover(now,commands){let saved;const store={open:async()=>({availability:{ok:true},leader:true,serverTime:now,revision:f.state.revision,fence:f.state.fence,checkpoint:JSON.parse(f.state.checkpoint),presence:f.state.presence,retired:{},commands,lastTick:1000}),commit:async value=>(saved=value)};await createCoordinator({store,ownerId:'v2'}).pump();return saved;}
 const cmd=(id,now,fields={})=>({id:`${now}:${id}:0`,connectionId:`${now}:${id}`,seq:0,type:'join',issuedAt:now,room:'sunroom',...fields});
 const resumed=await recover(12000,[cmd('resume',12000,{token:joined[0].token}),cmd('extra',12000)]);assert.equal(resumed.results['12000:resume:0'].id,joined[0].id);assert.equal(resumed.checkpoint.players.length,6);assert.equal(resumed.results['12000:extra:0'].reason,'BETA_FULL');
 const expired=await recover(61000,[cmd('fresh',61000)]);assert.equal(expired.results['61000:fresh:0'].type,'welcome');assert.equal(expired.checkpoint.players.length,1);
});

test('frozen legacy Lua retains deployed0bcac65 SHA1 provenance',()=>{assert.equal(createHash('sha1').update(LEGACY_V1_SCRIPT).digest('hex'),'b631f0ac848bb7b5962944219693afd6b6331dac');});
