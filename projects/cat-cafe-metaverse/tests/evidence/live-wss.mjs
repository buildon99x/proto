import {WebSocket} from '../../server/node_modules/ws/wrapper.mjs';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {applySnapshot} from '../../shared/delta.mjs';

// Public protocol only. Tokens remain exclusively in memory; never serialize a
// welcome, message, checkpoint, private error, or full client object into logs.
export async function verifyLive({origin,seconds=85}={}){
 const page=new URL(origin);
 if(page.protocol!=='https:'||!page.hostname.endsWith('.vercel.app')||page.pathname!=='/'||page.search||page.hash)throw Error('Invalid candidate origin');
 const deadline=performance.now()+Math.min(85,seconds)*1000,start=performance.now();
 const clients=new Set(),metrics={bytesOut:0,bytesIn:0,stateFrames:0,matchedStates:0,stateMismatches:0,deltaFrames:0,decodeErrors:0,resyncRequests:0};
 const checks={},observations={};let phase='connect';
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(predicate,label,limit=12000)=>{const end=Math.min(deadline,performance.now()+limit);while(performance.now()<end){const value=predicate();if(value)return value;await delay(40);}throw Error(label);};
 function client(format='packed-v1'){
  const c={format,baseline:null,ws:new WebSocket(`wss://${page.host}/api/cat-cafe-metaverse/ws`,{origin:page.origin,handshakeTimeout:10000}),seq:0,welcome:null,state:null,states:new Map(),actions:new Map(),errors:[],closed:false,open:false};clients.add(c);
  c.ws.on('unexpected-response',(request,response)=>{c.httpStatus=response.statusCode;response.resume();request.destroy();c.failed=true;});
  c.ws.on('open',()=>{c.open=true;});c.ws.on('error',()=>{c.failed=true;});c.ws.on('close',code=>{c.closed=true;c.closeCode=code;});
  c.send=m=>{if(c.ws.readyState!==WebSocket.OPEN)return;const data=JSON.stringify(m);metrics.bytesOut+=Buffer.byteLength(data);c.ws.send(data);};
  c.move=(x,z)=>c.send({type:'move',seq:c.seq++,x,z});
  c.ws.on('message',raw=>{
   metrics.bytesIn+=raw.length;let m;try{m=JSON.parse(raw);}catch{c.failed=true;return;}
   if(m.type==='welcome'){c.welcome=m;c.baseline=null;}
   else if(m.type==='state'){
    if(m.schema==='delta-v1'&&m.kind==='delta')metrics.deltaFrames++;
    try{const decoded=applySnapshot(c.baseline,m);c.baseline=decoded.state;m=decoded.state;}catch{metrics.decodeErrors++;if(performance.now()-(c.lastResync??-Infinity)>1000){c.send({type:'resync'});c.lastResync=performance.now();metrics.resyncRequests++;}return;}
    c.state=m;metrics.stateFrames++;const key=`${m.room}:${m.seq}:${m.time}`;
    const ordered=rows=>[...rows].sort((x,y)=>x[0].localeCompare(y[0]));
    const encoded=JSON.stringify({players:ordered(m.players),cats:ordered(m.cats),toys:ordered(m.toys),rooms:[...m.rooms].sort((x,y)=>x.id.localeCompare(y.id))});
    for(const other of clients){if(other===c)continue;const previous=other.states.get(key);if(previous){metrics.matchedStates++;if(previous!==encoded)metrics.stateMismatches++;}}
    c.states.set(key,encoded);while(c.states.size>40)c.states.delete(c.states.keys().next().value);
   }else if(m.type==='actionResult')c.actions.set(m.requestId,{ok:m.ok,reason:m.reason});
   else if(m.type==='error')c.errors.push(typeof m.reason==='string'?m.reason:'UNKNOWN');
  });
  return c;
 }
 const player=c=>c.state?.players.find(p=>p[0]===c.welcome?.id);
 const join=async(c,room,token)=>{await wait(()=>c.open&&!c.failed,'upgrade_failed');c.welcome=null;c.send({type:'join',room,snapshotFormat:c.format,...(token?{token}:{})});await wait(()=>c.welcome?.room===room,'join_failed');await wait(()=>c.state?.room===room&&player(c),'state_missing');};
 let a,b,reconnected;
 const watchdog=setTimeout(()=>{for(const c of clients)c.ws.terminate();},Math.min(90,seconds+5)*1000);
 try{
  a=client('delta-v1');b=client();await Promise.all([join(a,'sunroom'),join(b,'sunroom')]);
  await wait(()=>a.state.players.some(p=>p[0]===b.welcome.id)&&b.state.players.some(p=>p[0]===a.welcome.id),'shared_membership_missing');checks.twoSharedVisitors=true;
  phase='motion';const motionStart={wall:performance.now(),seq:a.state.seq,x:player(a)[2],time:a.state.time};
  const motionEnd=Math.min(deadline,performance.now()+5000);
  while(performance.now()<motionEnd){a.move(1,0);await delay(50);}a.move(0,0);
  await wait(()=>b.state.players.some(p=>p[0]===a.welcome.id&&p[2]>motionStart.x+.05),'observer_motion_missing');
  observations.motion={wallMs:performance.now()-motionStart.wall,serverMs:a.state.time-motionStart.time,steps:a.state.seq-motionStart.seq,displacement:player(a)[2]-motionStart.x};checks.observedMovement=true;
  phase='cat_approach';
  const cat=a.state.cats.filter(c=>c[6]==='idle').sort((c,d)=>Math.max(...[player(a),player(b)].map(p=>Math.hypot(p[2]-c[2],p[3]-c[3])))-Math.max(...[player(a),player(b)].map(p=>Math.hypot(p[2]-d[2],p[3]-d[3]))))[0];
  if(!cat)throw Error('no_idle_cat');const approachEnd=Math.min(deadline,performance.now()+18000);
  let near=false;
  while(performance.now()<approachEnd){
   const target=a.state.cats.find(c=>c[0]===cat[0]);near=true;
   for(const c of [a,b]){const p=player(c),dx=target[2]-p[2],dz=target[3]-p[3],distance=Math.hypot(dx,dz);if(distance>1.8){near=false;c.move(dx/distance,dz/distance);}else c.move(0,0);}
   if(near)break;await delay(100);
  }
  a.move(0,0);b.move(0,0);if(!near)throw Error('interaction_approach_timeout');
  phase='cat_race';a.send({type:'action',requestId:'live-pet-a',action:'pet',catId:cat[0]});b.send({type:'action',requestId:'live-pet-b',action:'pet',catId:cat[0]});
  await wait(()=>a.actions.has('live-pet-a')&&b.actions.has('live-pet-b'),'action_ack_missing');
  const results=[a.actions.get('live-pet-a'),b.actions.get('live-pet-b')];
  if(results.filter(r=>r.ok).length!==1||results.filter(r=>r.reason==='CAT_BUSY').length!==1)throw Error('cat_exclusivity_failed');checks.catExclusiveOwnership=true;
  phase='room_switch';const bId=b.welcome.id;await join(b,'garden');
  await wait(()=>!a.state.players.some(p=>p[0]===bId),'old_room_removal_missing');if(b.state.players.some(p=>p[0]===a.welcome.id))throw Error('room_isolation_failed');checks.roomIsolation=true;
  phase='reconnect';const token=a.welcome.token,id=a.welcome.id;a.ws.close(1000,'Resume verification');await wait(()=>a.closed,'disconnect_timeout');
  // Allow the gateway's authoritative disconnect flush; do not steal active token.
  await delay(2000);reconnected=client('delta-v1');await join(reconnected,'sunroom',token);if(reconnected.welcome.id!==id)throw Error('resume_identity_changed');checks.sameIdentityResume=true;
  phase='cleanup';reconnected.send({type:'leave'});await wait(()=>reconnected.closed,'leave_timeout');
  await join(b,'sunroom');await wait(()=>!b.state.players.some(p=>p[0]===id),'leave_not_visible');checks.leaveVisibleToObserver=true;
  b.send({type:'leave'});await wait(()=>b.closed,'final_leave_timeout');checks.finalSocketsClosed=true;
  if(metrics.decodeErrors)throw Error('delta_decode_failed');if(!metrics.deltaFrames)throw Error('delta_not_observed');checks.deltaTransport=true;
  if(metrics.stateMismatches)throw Error('shared_state_mismatch');if(!metrics.matchedStates)throw Error('no_common_state_sample');checks.sharedSnapshotAgreement=true;
  return {passed:true,checks,observations,metrics,elapsedMs:performance.now()-start};
 }catch(error){const allowed=new Set(['SERVER_UNAVAILABLE','QUOTA_EXHAUSTED','TOKEN_IN_USE','INVALID_TOKEN','BETA_FULL','SESSION_EXPIRED','COMMAND_EXPIRED','JOIN_TIMEOUT','TOO_FAR','CAT_BUSY']);const transport=[...clients].map(c=>({httpStatus:c.httpStatus??null,closeCode:c.closeCode??null,errors:c.errors.map(r=>allowed.has(r)?r:'OTHER')}));return {passed:false,phase,transport,failure:['upgrade_failed','join_failed','state_missing','shared_membership_missing','observer_motion_missing','no_idle_cat','interaction_approach_timeout','action_ack_missing','cat_exclusivity_failed','old_room_removal_missing','room_isolation_failed','disconnect_timeout','resume_identity_changed','leave_timeout','leave_not_visible','final_leave_timeout','shared_state_mismatch','no_common_state_sample','delta_decode_failed','delta_not_observed'].includes(error.message)?error.message:'harness_failed',checks,observations,metrics,elapsedMs:performance.now()-start};}
 finally{clearTimeout(watchdog);for(const c of clients){if(c.ws.readyState===WebSocket.OPEN){c.send({type:'leave'});c.ws.close(1000,'Diagnostic complete');}}await delay(1000);for(const c of clients)if(!c.closed)c.ws.terminate();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.env.CAFE_WSS_GO!=='1')throw Error('Await explicit READY authorization');
 const result=await verifyLive({origin:process.env.CAFE_WSS_ORIGIN});console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}
