import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRedisStore} from './store.mjs';
import {createRedisTransport} from './rest.mjs';
import {LEGACY_V1_SCRIPT} from './legacy-v1-script.mjs';
const namespace='cat-cafe:preview:v1',budgetNamespace='cat-cafe:resource-budget:v1';
const protectedState=state=>Object.fromEntries(Object.entries(state).filter(([key])=>!['version','fence','revision','owner','deadline','accountedAt'].includes(key)));
// Build-only and after compilation. Private GET bodies remain in memory, never logs.
export async function migrateAuthority(env=process.env,{storeFactory=createRedisStore,transportFactory=createRedisTransport}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse'||env.CAT_CAFE_REDIS_DIAGNOSTIC!=='migrate-authority-v2'||env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Migration scope denied');
 const config={url:env.CAT_CAFE_REDIS_REST_URL,token:env.CAT_CAFE_REDIS_REST_TOKEN};
 const transport=transportFactory({...config,maxBytes:131072}),store=storeFactory({...config,namespace,budgetNamespace});
 const read=async(key=namespace)=>{const raw=await transport.command(['GET',key]);assert.equal(typeof raw,'string');return JSON.parse(raw);};
 let stage='migration-budget-before',reason='ASSERTION';
 try{
 const budgetBefore=await read(budgetNamespace);assert.equal(budgetBefore.version,1);
 stage='migration-commit';
 const migrated=await store.migrateAuthority();reason=migrated.availability.reason??'ASSERTION';assert.equal(migrated.availability.ok,true,'Migration unavailable');
 stage='migration-idempotence';reason='ASSERTION';
 const again=await store.migrateAuthority();reason=again.availability.reason??'ASSERTION';assert.equal(again.availability.ok,true);assert.equal(again.migration.migrated,false);assert.equal(again.migration.fence,migrated.migration.fence);assert.equal(again.migration.revision,migrated.migration.revision);
 const rejected=[];
 for(const operation of ['check','open','commit','release','bootstrap']){
  stage=`migration-legacy-${operation}`;reason='ASSERTION';
  const request={ownerId:'migration-readonly-probe',commands:[],fence:-1,revision:-1};
  const raw=await transport.command(['EVAL',LEGACY_V1_SCRIPT,2,budgetNamespace,namespace,operation,JSON.stringify(request),'{}',0]);
  const result=JSON.parse(raw),expectedReason=operation==='bootstrap'?'BOOTSTRAP_CONFLICT':'SCHEMA_MISMATCH';
  assert.equal(result.availability?.reason,expectedReason,`Legacy ${operation} did not fail closed`);rejected.push(operation);
 }
 stage='migration-state-readback';reason='ASSERTION';
 const after=await read();stage='migration-budget-readback';
 const budgetAfter=await read(budgetNamespace);stage='migration-budget-verify';assert.equal(budgetAfter.version,1);assert.equal(budgetAfter.createdAt,budgetBefore.createdAt);
 for(const group of ['days','months'])for(const [period,counters]of Object.entries(budgetBefore[group]??{})){assert.ok(budgetAfter[group]?.[period],'Budget period lost');for(const key of ['ops','bytes',...(group==='days'?['activeMs']:[])])assert.ok(budgetAfter[group][period][key]>=counters[key],'Budget counter decreased');}
 stage='migration-elapsed-verify';
 const day=String(Math.floor(migrated.serverTime/86400000));
 const elapsed=migrated.migration.oldLeaseElapsed;
 assert.ok((budgetAfter.days?.[day]?.activeMs??0)>=migrated.migration.dayActiveBefore+elapsed,'Original lease elapsed not charged');
 stage='migration-reserve-verify';
 const total=(budget,key)=>Object.values(budget.days??{}).reduce((n,c)=>n+(c[key]??0),0);
 assert.ok(total(budgetAfter,'ops')>=total(budgetBefore,'ops')+144,'Verification operations not reserved');
 assert.ok(total(budgetAfter,'bytes')>=total(budgetBefore,'bytes')+1048576,'Verification bytes not reserved');
 stage='migration-state-verify';
 assert.equal(after.version,2);const increment=migrated.migration.fromVersion===1?1:0;
 assert.equal(after.fence,migrated.migration.previousFence+increment);assert.equal(after.revision,migrated.migration.previousRevision+increment);
 assert.deepEqual(protectedState(after),JSON.parse(migrated.migration.privateState),'Concurrent or unexpected private state mutation; keep service disabled');
 if(increment){assert.equal(after.owner,'');assert.equal(after.deadline,migrated.serverTime);}
 const sum=key=>(transport.metrics?.[key]??0)+(store.metrics?.[key]??0);
 return{kind:'authority-v2-migration',passed:true,fromVersion:migrated.migration.fromVersion,toVersion:2,migrated:increment===1,idempotent:true,preservedPrivateFields:true,budgetCountersPreserved:true,oldLeaseElapsedCharged:true,legacyRejected:rejected,legacyScriptSha1:createHash('sha1').update(LEGACY_V1_SCRIPT).digest('hex'),legacySourceCommit:'0bcac65d139e83db8471dfc14e788475c074bd3f',reservedVerificationOps:128,reservedVerificationBytes:1048576,actualRestRequests:sum('requests'),actualBodyBytesOut:sum('bytesOut'),actualBodyBytesIn:sum('bytesIn'),scriptMisses:sum('scriptMisses'),caveat:'Body metrics exclude HTTP headers; reservations are conservative app accounting, not provider billing'};
 }catch(error){error.diagnosticStage=stage;error.diagnosticReason=reason;throw error;}
}
