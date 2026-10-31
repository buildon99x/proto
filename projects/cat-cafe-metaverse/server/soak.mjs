import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {rawCanonical,canonicalSnapshot,canonicalFromRaw,describeDifference} from './soak-oracle.mjs';
import {performance} from 'node:perf_hooks';
import WebSocket from 'ws';
import {createRoomServer,packState} from './index.mjs';
import {World} from './world.mjs';
import {applySnapshot} from '../shared/delta.mjs';

const smoke=process.env.SOAK_SMOKE==='1';
const durationMs=smoke?6500:1200000;
const warmupMs=smoke?1000:30000;
const cycleMs=smoke?2000:45000;
const reservationMs=smoke?500:20000;
const resumeDelayMs=smoke?100:2000;
const expiryDelayMs=smoke?750:22000;
const sampleMs=smoke?1000:10000;
const expiryEvery=smoke?2:4;
const seed=1337,roomIds=['sunroom','garden','moonlight'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const percentile=(a,p)=>{if(!a.length)return 0;const sorted=[...a].sort((x,y)=>x-y);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];};
const canonical=rawCanonical;const stopFile=new URL('./soak.stop',import.meta.url);if(existsSync(stopFile))throw Error('Remove stale soak.stop before starting');
const stateKey=p=>`${p.room}:${p.seq}:${p.time}`;
const emit=value=>process.stdout.write(`${JSON.stringify(value)}\n`);
const world=new World({reservationMs});
const expected=new Map(),originalSnapshot=world.snapshot.bind(world);
world.snapshot=room=>{const snapshot=originalSnapshot(room),packed=packState(snapshot),key=stateKey(packed);if(!expected.has(key))expected.set(key,new Set());expected.get(key).add(canonical(packed));while(expected.size>600)expected.delete(expected.keys().next().value);return snapshot;};
const server=await createRoomServer({port:0,world});
const clients=[];
const stats={decoded:0,verified:0,orderOnlyDifferences:0,missing:0,mismatches:0,decodeErrors:0,wrongRoom:0,unexpectedSocketErrors:0,unexpectedMessages:0,unexpectedCloses:0,expectedRoomFull:0,expectedExpiredToken:0,resumes:0,resumedZeroSequences:0,expiredRejoins:0,successfulSwitches:0,atomicRejectedSwitches:0,freshReplacements:0,forcedResyncs:0,actionsAccepted:0,actionsRejected:0,ackExpired:0,latencyOverflow:0,cycles:0};
let workloadPassed=false,measuring=false,stopping=false,fatal=null,driver=null,sampler=null,churnTask=null;
let driveStep=0,wireClosed=0,measuredStart=0,startSeq=0,startWire=0,cpuStart,priorSampleTime=0,priorSampleSeq=0,priorSampleWire=0,minConnected=300,maxConnected=0;
let pingSamples=[],actionSamples=[];
const memorySamples=[];
const fail=error=>{if(!fatal){fatal=error instanceof Error?error:new Error(String(error));emit({event:'fatal',message:fatal.message});}};
function liveCount(){return clients.filter(c=>c.ready).length;}
function observe(){if(measuring){const n=liveCount();minConnected=Math.min(minConnected,n);maxConnected=Math.max(maxConnected,n);}}
function validateWorld(){let total=0;for(const room of world.rooms.values()){assert.ok(room.players.size<=100,'Room capacity exceeded');total+=room.players.size;for(const p of room.players.values())assert.equal(p.room,room.id,'Cross-room membership');}assert.ok(total<=300);assert.equal(world.tokens.size,total,'Token/membership cardinality');assert.ok(world.members.size<=total);for(const p of world.members.values())assert.ok(p.connection&&world.rooms.get(p.room).players.has(p.id));observe();}
function wireRead(){return wireClosed+clients.reduce((n,c)=>n+(c.socket?.bytesRead||0),0);}
function boundedLatency(bucket,value){if(bucket.length<10000)bucket.push(value);else stats.latencyOverflow++;}
function attachClient(c,room,token){
 c.busy=true;c.ready=false;c.packed=null;c.seq=0;c.pending.clear();
 const ws=new WebSocket(server.url);c.ws=ws;c.socket=null;c.expectedClose=false;
 return new Promise((resolve,reject)=>{
  let welcomed=false,settled=false;
  const deadline=setTimeout(()=>{if(!settled){settled=true;reject(Error(`Slot ${c.slot} join timeout`));}},5000);
  ws.on('open',()=>{c.socket=ws._socket;ws.send(JSON.stringify({type:'join',room,snapshotFormat:'delta-v1',...(token?{token}:{})}));});
  ws.on('message',raw=>{
   if(c.ws!==ws)return;
   try{
    const packet=JSON.parse(raw);
    if(packet.type==='welcome'){c.room=packet.room;c.id=packet.id;c.token=packet.token;c.packed=null;c.seq=0;c.ready=true;welcomed=true;observe();}
    else if(packet.type==='state'){
     if(packet.room!==c.room){stats.wrongRoom++;fail(Error('Cross-room state delivered'));return;}
     try{const result=applySnapshot(c.packed,packet);c.packed=result.state;stats.decoded++;if(measuring){c.sampleFrames++;if(c.slot%100===0&&c.sampleFrames%10===0){const choices=expected.get(stateKey(c.packed));if(!choices){stats.missing++;if(stats.missing===1)emit({event:'oracle_missing',slot:c.slot,room:c.room,seq:c.packed.seq});fail(Error('Missing authoritative oracle entry'));}else if(choices.has(canonical(c.packed)))stats.verified++;else{const actual=canonicalSnapshot(c.packed);const matching=[...choices].find(choice=>canonicalFromRaw(choice)===actual);if(matching){stats.verified++;stats.orderOnlyDifferences++;if(stats.orderOnlyDifferences===1){const original=JSON.parse(matching);emit({event:'first_order_only_difference',slot:c.slot,room:c.room,seq:c.packed.seq,expectedPlayerOrderSuffix:original[3].slice(0,8).map(r=>r[0].slice(-4)),actualPlayerOrderSuffix:c.packed.players.slice(0,8).map(r=>r[0].slice(-4)),allPerIdFieldsAndMetadataEqual:true});}}else{stats.mismatches++;if(stats.mismatches===1)emit({event:'semantic_mismatch',slot:c.slot,room:c.room,seq:c.packed.seq,difference:describeDifference(canonicalFromRaw([...choices][0]),actual)});fail(Error('Semantic state mismatch; bounded diagnostic recorded'));}}}}}
     catch(error){stats.decodeErrors++;fail(error);return;}
     if(welcomed&&!settled){settled=true;clearTimeout(deadline);c.busy=false;resolve();}
    }else if(packet.type==='pong'||packet.type==='actionResult'){
     const key=packet.type==='pong'?`p:${packet.id}`:`a:${packet.requestId}`;
     const sent=c.pending.get(key);if(sent!==undefined){c.pending.delete(key);if(measuring)boundedLatency(packet.type==='pong'?pingSamples:actionSamples,performance.now()-sent);}
     if(packet.type==='actionResult')packet.ok?stats.actionsAccepted++:stats.actionsRejected++;
    }else if(packet.type==='error'){
     if(packet.reason==='ROOM_FULL'&&c.expectRoomFull){stats.expectedRoomFull++;}
     else {stats.unexpectedMessages++;fail(Error(`Unexpected server rejection: ${packet.reason}`));}
    }
   }catch(error){fail(error);}
  });
  ws.on('error',error=>{if(!c.expectedClose&&!stopping){stats.unexpectedSocketErrors++;fail(error);}if(!settled){settled=true;clearTimeout(deadline);reject(error);}});
  ws.on('close',()=>{clearTimeout(deadline);if(c.ws===ws){wireClosed+=c.socket?.bytesRead||0;c.socket=null;c.ws=null;c.ready=false;observe();if(!c.expectedClose&&!stopping){stats.unexpectedCloses++;fail(Error(`Unexpected close slot ${c.slot}`));}}if(!settled){settled=true;reject(Error('Closed before join'));}});
 });
}
function waitPacket(ws,predicate,timeout=4000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Expected packet timeout'));},timeout);function handler(raw){const packet=JSON.parse(raw);if(predicate(packet)){clearTimeout(timer);ws.off('message',handler);resolve(packet);}}ws.on('message',handler);});}
async function waitUntil(predicate,timeout=1500){const end=performance.now()+timeout;while(!predicate()){if(performance.now()>end)throw Error('State transition timeout');await sleep(10);}}
async function closeClient(c,leave=false){c.busy=true;c.expectedClose=true;const ws=c.ws;if(!ws)return;const closed=new Promise(resolve=>ws.once('close',resolve));if(leave)ws.send(JSON.stringify({type:'leave'}));else ws.terminate();await closed;await waitUntil(()=>!world.rooms.get(c.room).players.get(c.id)?.connection);}
async function probe(room,token,reason){const ws=new WebSocket(server.url);try{await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});const reply=waitPacket(ws,p=>p.type==='error'||p.type==='welcome');ws.send(JSON.stringify({type:'join',room,...(token?{token}:{})}));const packet=await reply;assert.equal(packet.type,'error');assert.equal(packet.reason,reason);if(reason==='ROOM_FULL')stats.expectedRoomFull++;else if(reason==='INVALID_TOKEN')stats.expectedExpiredToken++;}finally{ws.terminate();}}
function pick(room,excluded=new Set()){const c=clients.find(c=>c.room===room&&c.ready&&!c.busy&&!excluded.has(c));assert.ok(c,`No eligible slot for ${room}`);excluded.add(c);return c;}
async function switchClient(c,destination,expectFull=false){c.busy=true;c.expectRoomFull=expectFull;const oldRoom=c.room,oldId=c.id;const full=expectFull?null:waitPacket(c.ws,p=>p.type==='state'&&p.kind==='full'&&p.room===destination);const reply=waitPacket(c.ws,p=>p.type==='welcome'||p.type==='error');c.ws.send(JSON.stringify({type:'join',room:destination,snapshotFormat:'delta-v1'}));const packet=await reply;if(expectFull){assert.equal(packet.reason,'ROOM_FULL');assert.equal(c.room,oldRoom);assert.equal(c.id,oldId);assert.ok(world.rooms.get(oldRoom).players.has(oldId));stats.atomicRejectedSwitches++;}else{assert.equal(packet.type,'welcome');await full;assert.equal(c.packed.room,destination);assert.equal(c.room,destination);assert.ok(!world.rooms.get(oldRoom).players.has(oldId));stats.successfulSwitches++;}c.expectRoomFull=false;c.busy=false;validateWorld();}
async function churn(cycle){
 stats.cycles++;validateWorld();
 const rejected=pick('sunroom');await switchClient(rejected,'garden',true);
 const selected=new Set(),group=roomIds.map(room=>pick(room,selected));
 const identities=group.map(c=>({id:c.id,token:c.token,room:c.room}));
 await Promise.all(group.map(c=>closeClient(c,false)));
 for(const room of roomIds){assert.equal(world.rooms.get(room).players.size,100);await probe(room,null,'ROOM_FULL');}
 if(cycle%expiryEvery===0){
  await sleep(expiryDelayMs);await waitUntil(()=>identities.every(old=>!world.tokens.has(old.token)));
  for(let i=0;i<group.length;i++){const old=identities[i];assert.ok(!world.tokens.has(old.token));assert.ok(!world.rooms.get(old.room).players.has(old.id));await probe(old.room,old.token,'INVALID_TOKEN');await attachClient(group[i],old.room);assert.notEqual(group[i].id,old.id);stats.expiredRejoins++;}
 }else{
  await sleep(resumeDelayMs);
  for(let i=0;i<group.length;i++){const old=identities[i];await attachClient(group[i],old.room,old.token);assert.equal(group[i].id,old.id);assert.ok(group[i].token===old.token,'Resume token changed');group[i].busy=true;assert.equal(group[i].seq,0);group[i].ws.send(JSON.stringify({type:'move',seq:group[i].seq++,x:0,z:0}));await waitUntil(()=>world.tokens.get(old.token)?.seq===0);group[i].busy=false;stats.resumedZeroSequences++;stats.resumes++;}
 }
 if(cycle%2===0){
  const used=new Set(),departures=roomIds.map(room=>pick(room,used));
  await Promise.all(departures.map(c=>closeClient(c,true)));
  for(const room of roomIds)assert.equal(world.rooms.get(room).players.size,99);
  const movers=roomIds.map(room=>pick(room,used));
  for(let i=0;i<3;i++)await switchClient(movers[i],roomIds[(i+1)%3]);
  for(let i=0;i<3;i++){await attachClient(departures[i],roomIds[i]);stats.freshReplacements++;}
 }
 validateWorld();assert.equal(world.tokens.size,300);assert.equal(world.members.size,300);
 emit({event:'churn',cycle,elapsedSeconds:(performance.now()-measuredStart)/1000,connected:liveCount(),resumes:stats.resumes,expiredRejoins:stats.expiredRejoins,successfulSwitches:stats.successfulSwitches,expectedRoomFull:stats.expectedRoomFull,expectedExpiredToken:stats.expectedExpiredToken});
}
function drive(){try{driveStep++;for(const c of clients){if(!c.ready||c.busy||c.ws?.readyState!==WebSocket.OPEN)continue;const phase=((seed^Math.imul(c.slot+1,2654435761))>>>0)%100;const angle=((driveStep+phase)%100)*Math.PI*2/100;const x=c.slot%10===0?0:Math.sin(angle),z=c.slot%10===0?0:Math.cos(angle);c.ws.send(JSON.stringify({type:'move',seq:c.seq++,x,z}));if(driveStep%20===0){c.pending.set(`p:${driveStep}`,performance.now());c.ws.send(JSON.stringify({type:'ping',id:driveStep}));for(const [key,time]of c.pending)if(performance.now()-time>10000){c.pending.delete(key);stats.ackExpired++;}}
 if(driveStep%40===0&&c.packed){const cat=c.packed.cats[c.slot%18],requestId=`${c.slot}-${driveStep}`;c.pending.set(`a:${requestId}`,performance.now());c.ws.send(JSON.stringify({type:'action',requestId,action:['pet','feather','ball'][c.slot%3],catId:cat[0]}));}
 if(driveStep%(smoke?20:200)===0&&c.slot%100===0){c.ws.send(JSON.stringify({type:'resync'}));stats.forcedResyncs++;}}
 }catch(error){fail(error);}}
function sample(){try{validateWorld();const now=performance.now(),seconds=(now-priorSampleTime)/1000,seqDelta=world.seq-priorSampleSeq,wire=wireRead(),memory=process.memoryUsage();const intervals=server.metrics.tickIntervals.slice(-Math.min(seqDelta,12000)),work=server.metrics.ticks.slice(-Math.min(seqDelta,12000));const entry={event:'sample',elapsedSeconds:(now-measuredStart)/1000,windowSeconds:seconds,connected:liveCount(),reservations:world.tokens.size-world.members.size,totalSeats:world.tokens.size,rssMiB:memory.rss/1048576,heapUsedMiB:memory.heapUsed/1048576,externalMiB:memory.external/1048576,effectiveTickHz:seqDelta/seconds,tickIntervalP99Ms:percentile(intervals,.99),tickWorkP99Ms:percentile(work,.99),pingP95Ms:percentile(pingSamples,.95),actionP95Ms:percentile(actionSamples,.95),wireMiBPerSecond:(wire-priorSampleWire)/1048576/seconds,decoded:stats.decoded,verified:stats.verified,mismatches:stats.mismatches,decodeErrors:stats.decodeErrors,missing:stats.missing,cycles:stats.cycles};memorySamples.push(entry);emit(entry);pingSamples=[];actionSamples=[];priorSampleTime=now;priorSampleSeq=world.seq;priorSampleWire=wire;}catch(error){fail(error);}}
try{
 emit({event:'config',mode:smoke?'TIME_COMPRESSED_SMOKE':'PRODUCTION_TIMING_20_MINUTE_SOAK',seed,clients:300,rooms:3,warmupSeconds:warmupMs/1000,measuredSeconds:durationMs/1000,reservationMs,cycleMs,sampleMs,compression:false,baseCommit:'083d308',oracle:'entity collections sorted by ID; all fields retained; raw order-only differences counted',harnessStatus:'uncommitted test harness over base source',scope:'local synthetic sockets; server and generator share one process; no visual/mobile/Internet verification'});
 for(let slot=0;slot<300;slot++){const c={slot,room:roomIds[Math.floor(slot/100)],ready:false,busy:true,pending:new Map(),sampleFrames:0};clients.push(c);await attachClient(c,c.room);}
 validateWorld();driver=setInterval(drive,50);
 await sleep(warmupMs);assert.equal(fatal,null);
 measuring=true;measuredStart=performance.now();startSeq=world.seq;startWire=wireRead();cpuStart=process.cpuUsage();priorSampleTime=measuredStart;priorSampleSeq=startSeq;priorSampleWire=startWire;minConnected=maxConnected=liveCount();
 emit({event:'measured_start',utc:new Date().toISOString(),connected:liveCount(),worldSeq:startSeq});sampler=setInterval(sample,sampleMs);
 let cycle=0,nextCycle=measuredStart+cycleMs,nextMilestone=measuredStart+300000;
 while(performance.now()-measuredStart<durationMs&&!fatal){const now=performance.now();if(existsSync(stopFile)){fail(Error('Operator stop requested'));break;}if(now>=nextCycle&&!churnTask&&durationMs-(now-measuredStart)>expiryDelayMs+(smoke?250:2000)){cycle++;churnTask=churn(cycle).catch(fail).finally(()=>{churnTask=null;});nextCycle+=cycleMs;}if(now>=nextMilestone){emit({event:'milestone',minutes:Math.round((now-measuredStart)/60000),connected:liveCount(),cycles:stats.cycles,decoded:stats.decoded,verified:stats.verified,errors:stats.decodeErrors+stats.mismatches+stats.missing,heapUsedMiB:process.memoryUsage().heapUsed/1048576});nextMilestone+=300000;}await sleep(100);}
 if(churnTask)await churnTask;clearInterval(driver);driver=null;clearInterval(sampler);sampler=null;sample();
 const elapsed=(performance.now()-measuredStart)/1000,cpu=process.cpuUsage(cpuStart);if(fatal)throw fatal;
 assert.ok(stats.verified>=(smoke?3:2500),'Insufficient canonical comparisons');assert.ok(stats.decoded>=(smoke?1000:2000000),'Insufficient decoded frames');assert.ok(stats.actionsAccepted>0,'No accepted cat actions');assert.equal(liveCount(),300);assert.ok(stats.cycles>=(smoke?2:24),'Insufficient lifecycle cycles');assert.ok(stats.resumes>=(smoke?3:54),'Resume workload incomplete');assert.equal(stats.resumedZeroSequences,stats.resumes);assert.ok(stats.expiredRejoins>=(smoke?3:18),'Expiry workload incomplete');assert.ok(stats.successfulSwitches>=(smoke?3:36),'Successful switch workload incomplete');assert.ok(stats.forcedResyncs>=(smoke?3:200),'Resync workload incomplete');
 assert.equal(stats.decodeErrors+stats.missing+stats.mismatches+stats.wrongRoom+stats.unexpectedSocketErrors+stats.unexpectedCloses+stats.unexpectedMessages,0);
 const buckets=[];for(let start=0;start<durationMs/1000;start+=300){const window=memorySamples.filter(s=>s.elapsedSeconds>=start&&s.elapsedSeconds<start+300);if(window.length)buckets.push({fromSeconds:start,toSeconds:start+300,heapMinMiB:Math.min(...window.map(s=>s.heapUsedMiB)),heapMedianMiB:percentile(window.map(s=>s.heapUsedMiB),.5),rssMinMiB:Math.min(...window.map(s=>s.rssMiB)),rssMedianMiB:percentile(window.map(s=>s.rssMiB),.5)});}
 workloadPassed=true;emit({event:'workload_result',workloadPassed:true,droppedSnapshots:server.metrics.droppedSnapshots,slowCloses:server.metrics.slowCloses,mode:smoke?'SMOKE':'20_MINUTE_SOAK',actualMeasuredSeconds:elapsed,effectiveTickHz:(world.seq-startSeq)/elapsed,minConnected,maxConnected,wireMiBPerSecond:(wireRead()-startWire)/1048576/elapsed,cpuPercentOneCoreCombined:(cpu.user+cpu.system)/(elapsed*10000),memoryWindows:buckets,stats,metricsRetentionNote:'production tick arrays cap12000; effectiveHz uses world.seq delta, per-window quantiles use latest window tick count',memoryScope:'same-process server+generator+bounded600-key correctness history; natural GC, no forced GC, not leak proof'});
}finally{
 stopping=true;if(driver)clearInterval(driver);if(sampler)clearInterval(sampler);
 for(const c of clients){c.expectedClose=true;c.ws?.terminate();c.pending.clear();}
 await sleep(reservationMs+(smoke?250:1000));await waitUntil(()=>world.tokens.size===0&&world.members.size===0&&[...world.rooms.values()].every(r=>r.players.size===0));
 const cleanup={members:world.members.size,tokens:world.tokens.size,roomSeats:[...world.rooms.values()].reduce((n,r)=>n+r.players.size,0),clientSockets:clients.filter(c=>c.ws!==null).length};
 await server.close();expected.clear();emit({event:'cleanup',...cleanup,serverClosed:true});
 assert.deepEqual(cleanup,{members:0,tokens:0,roomSeats:0,clientSockets:0});emit({event:'terminal_complete',passed:workloadPassed,cleanupPassed:true});
}
