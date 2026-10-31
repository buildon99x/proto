import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRedisStore} from './store.mjs';
import {createCoordinator} from './coordinator.mjs';

// Build-only operator diagnostic. Never imported by a public route. No secrets,
// tokens, checkpoints, provider error bodies or command results enter logs.
export async function runDiagnostic(env=process.env){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse'||env.CAT_CAFE_REDIS_DIAGNOSTIC!=='bootstrap-once')throw Error('Diagnostic scope denied');
 const options={url:env.CAT_CAFE_REDIS_REST_URL,token:env.CAT_CAFE_REDIS_REST_TOKEN,namespace:'cat-cafe:preview:v1',budgetNamespace:'cat-cafe:resource-budget:v1'};
 const aStore=createRedisStore(options),bStore=createRedisStore(options);
 let readiness=await aStore.check();
 if(readiness.availability.reason==='STORE_NOT_INITIALIZED')readiness=await aStore.bootstrap();
 assert.equal(readiness.availability.ok,true,'Database initialization unavailable/conflicting');
 const ownerA=`diagnostic-a-${randomUUID()}`,ownerB=`diagnostic-b-${randomUUID()}`;
 const a=createCoordinator({store:aStore,ownerId:ownerA}),b=createCoordinator({store:bStore,ownerId:ownerB});
 const birth=readiness.serverTime,one=`${birth}:${randomUUID()}`,two=`${birth}:${randomUUID()}`;
 const seq=new Map();let offset=readiness.serverTime-Date.now();
 const command=(connectionId,type,fields={})=>{const n=(seq.get(connectionId)??-1)+1;seq.set(connectionId,n);return {id:`${connectionId}:${n}`,connectionId,seq:n,issuedAt:Date.now()+offset,type,...fields};};
 const good=view=>{assert.equal(view.availability.ok,true,'Store operation unavailable');offset=view.serverTime-Date.now();return view;};
 let completed=false;
 try{
  const first=command(one,'join',{room:'sunroom'});
  const joined=good(await a.pump([first]));assert.equal(joined.results[first.id]?.type,'welcome');
  const accountingStart=good(await aStore.check());
  let accountingEnd;
  for(let i=0;i<5;i++){await new Promise(resolve=>setTimeout(resolve,150));accountingEnd=good(await aStore.check());}
  assert.ok(accountingEnd.budget.activeMs-accountingStart.budget.activeMs<=accountingEnd.serverTime-accountingStart.serverTime+200,'Read-only checks double charged active time');
  const motionStart=good(await a.pump([command(one,'presence')]));
  let motionEnd=motionStart;
  const wallStart=performance.now();
  for(let i=0;i<5;i++){
   await new Promise(resolve=>setTimeout(resolve,100));
   motionEnd=good(await a.pump([command(one,'move',{inputSeq:i,x:1,z:0}),command(one,'presence')]));
  }
  const motion={wallMs:performance.now()-wallStart,serverMs:motionEnd.serverTime-motionStart.serverTime,steps:motionEnd.snapshots.sunroom.seq-motionStart.snapshots.sunroom.seq,displacement:motionEnd.snapshots.sunroom.players[0].x-motionStart.snapshots.sunroom.players[0].x};
  assert.ok(motion.steps>0&&motion.displacement>0,'Provider movement did not advance');
  const second=command(two,'join',{room:'sunroom'});
  const queued=good(await b.pump([second]));assert.equal(queued.results[second.id],undefined,'Follower acknowledged uncommitted join');
  const shared=good(await a.pump());assert.equal(shared.results[second.id]?.type,'welcome');assert.equal(shared.snapshots.sunroom.players.length,2);
  // Bring both visitors within authoritative interaction range, with real inputs.
  let approached=shared;
  for(let i=0;i<8;i++){
   await new Promise(resolve=>setTimeout(resolve,100));
   approached=good(await a.pump([command(one,'move',{inputSeq:i+5,x:0,z:-1}),command(two,'move',{inputSeq:i,x:0,z:-1}),command(one,'presence'),command(two,'presence')]));
  }
  const players=approached.snapshots.sunroom.players;
  const cat=approached.snapshots.sunroom.cats.find(c=>c.mode==='idle'&&players.every(p=>Math.hypot(p.x-c.x,p.z-c.z)<2.6));
  assert.ok(cat,'Could not approach a shared cat under actual provider cadence');
  const actionA=command(one,'action',{requestId:'diagnostic-pet-a',action:'pet',catId:cat.id});
  const actionB=command(two,'action',{requestId:'diagnostic-pet-b',action:'pet',catId:cat.id});
  good(await b.pump([actionB]));
  const contested=good(await a.pump([actionA]));
  const outcomes=[contested.results[actionA.id],contested.results[actionB.id]];
  assert.equal(outcomes.filter(r=>r.ok).length,1,'Cat ownership was not exclusive');
  assert.equal(outcomes.filter(r=>r.reason==='CAT_BUSY').length,1);
  good(await a.pump([first])); // Committed-but-lost acknowledgement replay.
  const before=good(await aStore.open({ownerId:ownerA,commands:[]}));
  await new Promise(resolve=>setTimeout(resolve,5100));
  good(await b.pump([command(one,'presence'),command(two,'presence')]));
  const stale=await aStore.commit({ownerId:ownerA,fence:before.fence,revision:before.revision,checkpoint:before.checkpoint,presence:before.presence,retired:before.retired,results:{},snapshots:before.snapshots,consumed:[],lastTick:before.lastTick,active:true});
  assert.equal(stale.availability.reason,'STALE_OWNER','Expired owner committed');
  const switched=command(two,'join',{room:'garden'});
  const isolated=good(await b.pump([switched]));assert.equal(isolated.snapshots.garden.players.length,1);assert.equal(isolated.snapshots.sunroom.players.length,1);
  const closed=command(one,'disconnect');good(await b.pump([closed]));
  const resumedId=`${Date.now()+offset}:${randomUUID()}`;
  const resume=command(resumedId,'join',{room:'sunroom',token:joined.results[first.id].token});
  const resumed=good(await b.pump([resume]));assert.equal(resumed.results[resume.id]?.id,joined.results[first.id].id);
  const late=command(one,'presence');const fenced=good(await b.pump([late]));assert.equal(fenced.results[late.id]?.reason,'SESSION_EXPIRED');
  good(await b.pump([command(resumedId,'leave'),command(two,'leave')]));
  await a.stop();await b.stop();completed=true;
  const budget=good(await aStore.check()).budget;
  const metrics={requests:aStore.metrics.requests+bStore.metrics.requests,bytesOut:aStore.metrics.bytesOut+bStore.metrics.bytesOut,bytesIn:aStore.metrics.bytesIn+bStore.metrics.bytesIn};
  assert.ok(metrics.requests*8+8<=1000);assert.ok(metrics.bytesOut+metrics.bytesIn<10*1024*1024);
  return {passed:true,motion,budgetUsedBeforeFinalRead:budget,checks:['shared-two-visitors','ack-after-commit','duplicate-replay','same-cat-exclusive-action','stale-fence','room-isolation','resume','late-generation'],...metrics};
 }finally{
  if(!completed){try{await b.pump([command(one,'leave'),command(two,'leave')]);}catch{}try{await a.stop();await b.stop();}catch{}}
 }
}
if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){
 runDiagnostic().then(result=>console.log('CAT_CAFE_REDIS_DIAGNOSTIC',JSON.stringify(result))).catch(()=>{console.error('CAT_CAFE_REDIS_DIAGNOSTIC failed; no provider details logged');process.exitCode=1;});
}
