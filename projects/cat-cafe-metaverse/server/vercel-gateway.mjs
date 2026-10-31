import {randomUUID} from 'node:crypto';
import {packState,queueSnapshot,sendBounded} from './index.mjs';

// Transport state only. Authority and budgets live in the external coordinator.
const publicReason=reason=>reason==='BUDGET_EXHAUSTED'?'QUOTA_EXHAUSTED':reason;
export function publicStatus(env={},health=null){
 const configured=env.CAT_CAFE_REALTIME_ENABLED==='1'&&env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='codex/cat-cafe-metaverse'&&
  Boolean(env.CAT_CAFE_REDIS_REST_URL&&env.CAT_CAFE_REDIS_REST_TOKEN);
 const available=configured&&health?.ok===true;
 return{available,endpoint:available?'/api/cat-cafe-metaverse/ws':null,betaCapacity:6,
  ...(available?{}:{reason:publicReason(health?.reason)||'SERVER_UNAVAILABLE',...(health?.resetAt?{retryAt:health.resetAt}:{})})};
}
export function createGateway({coordinator,clock=Date.now,autoSchedule=true,onHealth=()=>{}}){
 const connections=new Map(),pending=new Map(),queue=[];
 const metrics={bytesOut:0,bytesIn:0,droppedSnapshots:0,slowCloses:0};
 let timer=null,inflight=null,closing=false,serverOffset=0,lastPumpAt=-Infinity;
 function enqueue(c,type,fields={}){
  if(queue.length>=256){send(c.ws,{type:'error',reason:'SERVER_UNAVAILABLE'});c.ws.close(1013,'Queue full');return;}
  // Coalesce only adjacent movement; join/action/leave form ordering barriers.
  if(type==='move'&&queue.at(-1)?.connectionId===c.id&&queue.at(-1)?.type==='move')queue.pop();
  const command={...fields,id:`${c.id}:${++c.seq}`,seq:c.seq,connectionId:c.id,issuedAt:clock()+serverOffset,type};
  if(type==='join'||type==='action'){
   if(pending.size>=512){send(c.ws,{type:'error',reason:'SERVER_UNAVAILABLE'});c.ws.close(1013,'Pending requests full');return;}
   pending.set(command.id,{connection:c.id,created:clock(),type});
  }
  queue.push(command);
 }
 const send=(ws,message)=>sendBounded(ws,message,false,metrics);
 function schedule(){if(!autoSchedule||closing||timer||!connections.size)return;timer=setTimeout(()=>{timer=null;void flush();},Math.max(0,100-(clock()-lastPumpAt)));
  // Target 10 Hz durable batches; coordinator integrates bounded 50 ms physics steps.
 }
 function reportError(c,reason){
  if(reason==='SESSION_EXPIRED'||(c.joined&&reason==='NOT_JOINED')){send(c.ws,{type:'error',reason:'SESSION_EXPIRED'});c.ws.close(1012,'Session requires reconnect');}
  else send(c.ws,{type:'error',reason:publicReason(reason)});
 }
 function processResult(key,result){
  const p=pending.get(key),c=connections.get(result.connectionId);if(!c)return;
  if(!p){
   const prefix=`${c.id}:`,sequence=Number(key.slice(prefix.length));
   if(result.type!=='error'||!key.startsWith(prefix)||!Number.isSafeInteger(sequence)||sequence<=c.lastError||sequence>c.seq)return;
   c.lastError=sequence;reportError(c,result.reason);return;
  }
  if(p.connection!==result.connectionId)return;pending.delete(key);
  if(result.type==='welcome'&&result.ok){
   c.room=result.room;c.playerId=result.id;c.joined=true;c.ws.snapshotBaseline=null;c.ws.forceFull=true;
   send(c.ws,{type:'welcome',ok:true,id:result.id,token:result.token,room:result.room,snapshotFormat:c.ws.snapshotFormat});
  }else if(result.type==='actionResult')send(c.ws,{type:'actionResult',requestId:result.requestId,ok:result.ok,...(!result.ok?{reason:result.reason}:{})});
  else if(result.type==='error')reportError(c,result.reason);
 }
 async function run(){
  const now=clock();lastPumpAt=now;
  for(const c of connections.values()){
   if(!c.joined&&now-c.created>5000)c.ws.close(1008,'Join timeout');
   else if(now-c.created>=270000)c.ws.close(1012,'Reconnect for service rotation');
   else if(now-c.presence>=3000){c.presence=now;enqueue(c,'presence');}
  }
  const commands=queue.splice(0,128);
  try{
   const output=await coordinator.pump(commands);
   if(Number.isFinite(output.serverTime))serverOffset=output.serverTime-clock();
   onHealth(output.availability);
   if(!output.availability?.ok){
    const reason=publicReason(output.availability?.reason)||'SERVER_UNAVAILABLE';
    for(const c of [...connections.values()]){send(c.ws,{type:'error',reason});c.ws.close(1013,'Service unavailable');}
   }else{
    for(const [key,result]of Object.entries(output.results||{}))processResult(key,result);
    const encoded=new Map(),packed=new Map();
    for(const c of connections.values()){
     const raw=output.snapshots?.[c.room];if(!c.joined||!raw)continue;
     if(!packed.has(c.room))packed.set(c.room,packState(raw));
     const state=packed.get(c.room);
     if(c.lastRevision!==output.revision||c.ws.forceFull){
      if(c.ws.snapshotBaseline?.seq===state.seq)c.ws.forceFull=true;
      if(queueSnapshot(c.ws,state,metrics,encoded))c.lastRevision=output.revision;
     }
    }
   }
  }catch{
   onHealth({ok:false,reason:'SERVER_UNAVAILABLE'});
   for(const c of [...connections.values()]){send(c.ws,{type:'error',reason:'SERVER_UNAVAILABLE'});c.ws.close(1013,'Service unavailable');}
  }
  for(const [key,p]of pending)if(clock()-p.created>30000)pending.delete(key);
  if(!connections.size){
   // A close during the preceding await may have queued the final disconnect.
   while(queue.length){try{await coordinator.pump(queue.splice(0,128));}catch{queue.length=0;/* presence expiry is the fallback */}}
   try{await coordinator.stop();}catch{onHealth({ok:false,reason:'SERVER_UNAVAILABLE'});}pending.clear();
  }
 }
 async function flush(){if(inflight)return inflight;inflight=Promise.resolve().then(run);try{await inflight;}finally{inflight=null;schedule();}}
 function attach(ws){
  if(closing||connections.size>=12){ws.close(1013,'Gateway full');return;}
  const c={id:`${clock()}:${randomUUID()}`,ws,seq:0,lastError:-1,created:clock(),presence:clock(),bucket:120,refill:clock(),joined:false,room:null,lastRevision:-1};
  ws.snapshotFormat='packed-v1';ws.snapshotBaseline=null;ws.forceFull=true;
  connections.set(c.id,c);
  ws.on('error',()=>{});
  ws.on('message',raw=>{
   if(!connections.has(c.id))return;
   const size=typeof raw==='string'?Buffer.byteLength(raw):raw.byteLength;
   if(!Number.isFinite(size)||size>2048){ws.close(1009,'Message too large');return;}
   const now=clock();c.bucket=Math.min(120,c.bucket+(now-c.refill)*.06);c.refill=now;
   if(--c.bucket<0){ws.close(1008,'Rate limit');return;}
   let m;try{m=JSON.parse(raw.toString());}catch{send(ws,{type:'error',reason:'INVALID_JSON'});return;}
   if(!m||typeof m!=='object'||Array.isArray(m)||typeof m.type!=='string'){send(ws,{type:'error',reason:'INVALID_MESSAGE'});return;}
   if(m.type==='ping'){if(Number.isSafeInteger(m.id))send(ws,{type:'pong',id:m.id});return;}
   if(m.type==='resync'){if(now-(c.lastResync||-Infinity)>=1000){c.lastResync=now;ws.forceFull=true;}return;}
   if(m.type==='join'){ws.snapshotFormat=m.snapshotFormat==='delta-v1'?'delta-v1':'packed-v1';enqueue(c,'join',{room:m.room,...(m.token!==undefined?{token:m.token}:{})});}
   else if(m.type==='move')enqueue(c,'move',{inputSeq:m.seq,x:m.x,z:m.z});
   else if(m.type==='action')enqueue(c,'action',{requestId:m.requestId,action:m.action,catId:m.catId});
   else if(m.type==='leave'){enqueue(c,'leave');c.left=true;ws.close(1000,'Left room');}
   else send(ws,{type:'error',reason:'UNKNOWN_MESSAGE'});
  });
  ws.on('close',()=>{if(!connections.delete(c.id))return;if(!c.left)enqueue(c,'disconnect');if(!connections.size){clearTimeout(timer);timer=null;void flush();}});
  schedule();return c.id;
 }
 async function close(){closing=true;clearTimeout(timer);timer=null;for(const c of [...connections.values()])c.ws.close(1012,'Gateway stopping');await flush();}
 return{attach,flush,close,metrics,get connectionCount(){return connections.size}};
}
