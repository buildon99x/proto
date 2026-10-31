import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import WebSocket from 'ws';
import {createRoomServer} from './index.mjs';
import {applySnapshot} from '../shared/delta.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate,ms=2000){const end=Date.now()+ms;while(!predicate()){if(Date.now()>end)throw Error('Socket state transition timed out');await sleep(20);}}
function packet(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Packet timeout'));},2500);function handler(raw){const p=JSON.parse(raw);if(predicate(p)){clearTimeout(timer);ws.off('message',handler);resolve(p);}}ws.on('message',handler);});}
export async function runBallSocketSmoke(){
 const server=await createRoomServer({port:0});const clients=[],errors=[];let observedBallFrames=0,minDecodedGap=Infinity,gardenLeak=false;
 async function connect(room,token){const c={ws:new WebSocket(server.url),room,state:null,fullFrames:0,ballFrames:0};clients.push(c);const ready=new Promise((resolve,reject)=>{c.ws.on('error',reject);c.ws.on('open',()=>c.ws.send(JSON.stringify({type:'join',room,snapshotFormat:'delta-v1',...(token?{token}:{})})));c.ws.on('message',raw=>{try{const p=JSON.parse(raw);if(p.type==='welcome'){c.id=p.id;c.token=p.token;c.room=p.room;c.state=null;}else if(p.type==='state'){c.state=applySnapshot(c.state,p).state;if(p.kind==='full')c.fullFrames++;for(const toy of c.state.toys){const cat=c.state.cats.find(r=>r[7]===toy[3]&&r[6]==='ball');if(cat){const distance=Math.hypot(cat[2]-toy[1],cat[3]-toy[2]);observedBallFrames++;c.ballFrames++;minDecodedGap=Math.min(minDecodedGap,distance);}}if(c===garden&&c.state.toys.length)gardenLeak=true;resolve();}else if(p.type==='error')errors.push(p.reason);}catch(error){errors.push(error.message);}});});await ready;return c;}
 let garden=null;
 try{
  const a=await connect('sunroom'),watcher=await connect('sunroom');garden=await connect('garden');
  const action={type:'action',requestId:'ball-live',action:'ball',catId:'cat-14'};
  let reply=packet(a.ws,p=>p.type==='actionResult'&&p.requestId===action.requestId);a.ws.send(JSON.stringify(action));assert.equal((await reply).ok,true);
  await until(()=>a.state.toys.length===1&&watcher.state.toys.length===1);
  const firstToy=a.state.toys[0][0];reply=packet(a.ws,p=>p.type==='actionResult'&&p.requestId===action.requestId);a.ws.send(JSON.stringify(action));assert.equal((await reply).ok,true);
  await sleep(300);assert.equal(a.state.toys.length,1);assert.equal(a.state.toys[0][0],firstToy);
  await sleep(4100);assert.equal(a.state.toys.length,0);assert.equal(watcher.state.toys.length,0);assert.ok(observedBallFrames>=50);assert.ok(minDecodedGap>=.885,'Decoded gap below .90 clearance minus .015 quantization allowance');assert.equal(gardenLeak,false);
  let moveSeq=0;const distanceToCat=()=>{const p=a.state.players.find(p=>p[0]===a.id),cat=a.state.cats.find(c=>c[0]==='cat-14');return {dx:cat[2]-p[2],dz:cat[3]-p[3],distance:Math.hypot(cat[2]-p[2],cat[3]-p[3])};};const approachDistanceBefore=distanceToCat().distance;const approachDeadline=Date.now()+2500;while(distanceToCat().distance>2.1){assert.ok(Date.now()<approachDeadline,'Approach timed out');const v=distanceToCat();a.ws.send(JSON.stringify({type:'move',seq:moveSeq++,x:v.dx/v.distance,z:v.dz/v.distance}));await sleep(50);}a.ws.send(JSON.stringify({type:'move',seq:moveSeq++,x:0,z:0}));await sleep(100);
  const second={...action,requestId:'ball-before-resume'};reply=packet(a.ws,p=>p.type==='actionResult'&&p.requestId===second.requestId);a.ws.send(JSON.stringify(second));const secondResult=await reply;assert.equal(secondResult.ok,true,secondResult.reason);await until(()=>watcher.state.toys.length===1);
  const oldId=a.id,resumeToken=a.token;await new Promise(resolve=>{a.ws.once('close',resolve);a.ws.terminate();});await until(()=>watcher.state.toys.length===0&&!watcher.state.players.some(p=>p[0]===oldId));
  const resumed=await connect('sunroom',resumeToken);assert.equal(resumed.id,oldId);assert.ok(resumed.token===resumeToken,'Resume identity changed');resumed.ws.send(JSON.stringify({type:'move',seq:0,x:0,z:0}));await until(()=>server.world.tokens.get(resumeToken)?.seq===0);
  assert.equal(resumed.state.toys.length,0);assert.ok(resumed.state.cats.every(c=>c[7]!==oldId));
  const newFull=packet(resumed.ws,p=>p.type==='state'&&p.kind==='full'&&p.room==='garden');resumed.ws.send(JSON.stringify({type:'join',room:'garden',snapshotFormat:'delta-v1'}));await newFull;await until(()=>!watcher.state.players.some(p=>p[0]===oldId)&&garden.state.players.some(p=>p[0]===oldId));
  assert.equal(resumed.state.room,'garden');assert.equal(server.world.rooms.get('sunroom').toys.length,0);assert.equal(server.world.rooms.get('garden').toys.length,0);
  const resync=packet(resumed.ws,p=>p.type==='state'&&p.kind==='full');resumed.ws.send(JSON.stringify({type:'resync'}));await resync;
  assert.deepEqual(errors,[]);
  return{passed:true,scope:'post-ball-fix real local WebSocket smoke; not the earlier 20-minute baseline or visual verification',observedBallFrames,minDecodedGap,approachDistanceBefore,approachedUsingAuthoritativeSocketInputs:true,requiredDecodedGap:.885,quantizationAllowance:.015,duplicateActionSingleToy:true,fourSecondExpiryObserved:true,disconnectReleasedToyAndLease:true,resumeSameIdentity:true,resumeSequenceZeroAccepted:true,successfulRoomSwitchFull:true,roomIsolation:true,resyncFull:true,protocolErrors:errors.length,compression:false};
 }finally{for(const c of clients)c.ws.terminate();await server.close();}
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(await runBallSocketSmoke()));
