/* Actual Engine/Bank with a fake Web Audio graph. No browser, storage or listening claims. */
'use strict';
const assert=require('node:assert/strict'),Audio=require('./audio.js'),Preparation=require('./audio-preparation.js');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
class Param{
 constructor(){this.value=0;}
 setTargetAtTime(value){this.value=value;}
 cancelScheduledValues(){}
}
class Node{
 constructor(context,kind){this.context=context;this.kind=kind;this.connections=[];context.nodes.push(this);for(const name of ['gain','frequency','Q','threshold','knee','ratio','attack','release','pan'])this[name]=new Param();}
 connect(node){this.connections.push(node);}
 disconnect(){this.connections=[];}
 start(){this.context.starts++;}
 stop(){}
}
class Context{
 constructor(state='suspended'){this.state=state;this.sampleRate=48000;this.currentTime=0;this.destination={};this.nodes=[];this.resumes=0;this.suspends=0;this.closes=0;this.decodes=0;this.starts=0;this.resumeAction=null;}
 createGain(){return new Node(this,'gain');}
 createBiquadFilter(){return new Node(this,'filter');}
 createDynamicsCompressor(){return new Node(this,'compressor');}
 createWaveShaper(){return new Node(this,'shaper');}
 createStereoPanner(){return new Node(this,'panner');}
 createBufferSource(){return new Node(this,'source');}
 async decodeAudioData(){const id=++this.decodes,data=new Float32Array(16).fill(.1);return {id,length:16,duration:.01,numberOfChannels:1,getChannelData:()=>data};}
 resume(){this.resumes++;if(this.resumeAction)return this.resumeAction();this.state='running';return Promise.resolve();}
 suspend(){this.suspends++;this.state='suspended';return Promise.resolve();}
 close(){this.closes++;this.state='closed';return Promise.resolve();}
}
function fixture(options={}){
 const context=options.context||new Context(),calls={contexts:0,fetches:0,paths:[]};
 const engine=Audio.create({contextFactory:()=>{calls.contexts++;return options.contextFactory?options.contextFactory():context;},fetch:async(path,init)=>{
  calls.fetches++;calls.paths.push(path);if(options.fetch)return options.fetch(path,init);
  return {ok:true,headers:{get:()=>44},arrayBuffer:async()=>new ArrayBuffer(44)};
 }});
 const controller=Preparation.create({engine,timeoutMs:options.timeoutMs,onChange:options.onChange});return {engine,context,controller,calls};
}
let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name);}
(async()=>{
 await check('idle menu decodes all 79 recordings without resume, playback or synthetic sources',async()=>{
  const {engine,context,controller,calls}=fixture();assert.equal(controller.snapshot().canStart,false);
  const pending=controller.prepare();assert.equal(controller.prepare(),pending);assert(await pending);
  assert.equal(calls.contexts,1);assert.equal(calls.fetches,79);assert.equal(context.decodes,79);assert.equal(context.resumes,0);assert.equal(context.starts,0);assert.equal(context.state,'suspended');assert.equal(engine.buffers.size,0);
  assert.equal(engine.event('pickup'),false);assert.equal(engine.shot(3),false);assert.equal(controller.snapshot().loaded,79);assert.equal(controller.snapshot().canStart,true);assert.equal(controller.snapshot().running,false);
  const contextBefore=engine.context,buffersBefore=engine.rifle.buffers,bufferBefore=engine.rifle.buffers.get('shot-1');
  const activation=controller.activate();assert.equal(context.resumes,1,'resume runs before activate returns');assert.equal(activation.immediate,undefined);
  const ready=await activation;assert(ready.ok);assert(controller.claim(ready));assert.equal(controller.claim(ready),false);assert.equal(engine.context,contextBefore);assert.equal(engine.rifle.buffers,buffersBefore);assert.equal(engine.rifle.buffers.get('shot-1'),bufferBefore);assert.equal(calls.fetches,79);
  assert(engine.shot(3));assert.equal(context.nodes.find(n=>n.kind==='source').buffer,engine.rifle.buffers.get('shot-2'));assert.equal(context.starts,1);await controller.destroy();
 });
 await check('already-permitted running constructors are suspended before loading any recording',async()=>{
  const context=new Context('running'),f=fixture({context,fetch:async()=>{assert.equal(context.state,'suspended');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(44)};}});
  assert(await f.controller.prepare());assert.equal(context.suspends,1);assert.equal(context.resumes,0);assert.equal(context.starts,0);await f.controller.destroy();
 });
 await check('progress stays menu-only and repeated early activation cannot queue a future start',async()=>{
  const hold=deferred();let holdOnce=true;const f=fixture({fetch:async()=>{if(holdOnce){holdOnce=false;await hold.promise;}return {ok:true,arrayBuffer:async()=>new ArrayBuffer(44)};}});
  const preparing=f.controller.prepare();for(let i=0;i<60;i++)await flush();const progress=f.controller.snapshot();assert.equal(progress.status,'preparing');assert(progress.loaded>0&&progress.loaded<79);
  const early=await f.controller.activate();assert.equal(early.ok,false);assert.equal(early.reason,'busy');assert.equal(f.context.resumes,0);hold.resolve();assert(await preparing);assert.equal(f.context.resumes,0);assert.equal(f.context.starts,0);assert.equal(f.controller.snapshot().status,'ready');await f.controller.destroy();
 });
 await check('running and muted continuations offer a synchronous one-use result',async()=>{
  const f=fixture();await f.controller.prepare();assert(f.controller.claim(await f.controller.activate()));
  const before=f.context.resumes,warm=f.controller.activate();assert(warm.immediate.ok);assert(f.controller.claim(warm.immediate));assert.equal(f.controller.claim(await warm),false);assert.equal(f.context.resumes,before);
  f.controller.setMuted(true);const muted=f.controller.activate();assert.equal(muted.immediate.reason,'muted');assert(f.controller.claim(muted.immediate));assert.equal(f.context.resumes,before);await f.controller.destroy();
 });
 await check('an unlock denial retains all buffers and the next Start retries exactly once',async()=>{
  const f=fixture();await f.controller.prepare();f.context.resumeAction=()=>Promise.reject(Object.assign(Error('Sound permission blocked'),{name:'NotAllowedError'}));
  assert.equal((await f.controller.activate()).ok,false);assert.match(f.controller.snapshot().error,/Sound permission blocked/);assert.equal(f.controller.snapshot().canStart,true);assert.equal(f.calls.fetches,79);assert.equal(f.engine.shot(3),false);
  f.context.resumeAction=null;const activation=f.controller.activate(),duplicate=f.controller.activate();assert.equal((await duplicate).reason,'busy');assert(f.controller.claim(await activation));assert.equal(f.context.resumes,2);assert.equal(f.calls.fetches,79);await f.controller.destroy();
 });
 await check('resolve-without-running is an unlock failure and cannot authorize gameplay',async()=>{
  const f=fixture();await f.controller.prepare();f.context.resumeAction=()=>Promise.resolve();const r=await f.controller.activate();assert.equal(r.ok,false);assert.equal(f.controller.claim(r),false);assert.match(f.controller.snapshot().error,/suspended/);assert.equal(f.controller.snapshot().canStart,true);await f.controller.destroy();
 });
 await check('pre-gesture context denial has a separate prepare retry and does not resume hardware',async()=>{
  let gesture=false;const context=new Context(),f=fixture({context,contextFactory:()=>{if(!gesture)throw Object.assign(Error('An explicit gesture is required to create audio'),{name:'NotAllowedError'});return context;}});
  assert.equal(await f.controller.prepare(),false);assert.equal(f.controller.snapshot().status,'needs-gesture');assert.equal(f.controller.snapshot().canStart,false);assert.equal(f.controller.snapshot().canPrepare,true);assert.equal(f.calls.fetches,0);
  assert.equal((await f.controller.activate()).reason,'not-ready');gesture=true;assert(await f.controller.prepare());assert.equal(context.resumes,0);assert(f.controller.claim(await f.controller.activate()));assert.equal(f.calls.contexts,2);await f.controller.destroy();
 });
 await check('failed fetch stays silent and atomic; preparation retry can recover',async()=>{
  let fail=true;const f=fixture({fetch:async()=>fail?{ok:false,status:503}:{ok:true,arrayBuffer:async()=>new ArrayBuffer(44)}});
  assert.equal(await f.controller.prepare(),false);assert.equal(f.engine.rifle.buffers.size,0);assert.equal(f.controller.snapshot().canStart,false);assert.equal(f.controller.snapshot().canPrepare,true);assert.match(f.controller.snapshot().error,/503/);assert.equal(f.context.starts,0);
  fail=false;assert(await f.controller.prepare());assert.equal(f.engine.rifle.buffers.size,79);assert.equal(f.context.resumes,0);await f.controller.destroy();
 });
 await check('decode rejection cannot expose partial gun buffers and can be retried',async()=>{
  const f=fixture(),decode=f.context.decodeAudioData;f.context.decodeAudioData=async()=>{throw Error('Decode rejected');};assert.equal(await f.controller.prepare(),false);assert.match(f.controller.snapshot().error,/Decode rejected/);assert.equal(f.engine.rifle.buffers.size,0);assert.equal(f.engine.shot(3),false);assert.equal(f.context.starts,0);
  f.context.decodeAudioData=decode;assert(await f.controller.prepare());assert.equal(f.engine.rifle.buffers.size,79);assert.equal(f.context.resumes,0);await f.controller.destroy();
 });
 await check('unavailable Web Audio still permits an explicit mute without a context',async()=>{
  const f=fixture({contextFactory:()=>null});assert.equal(await f.controller.prepare(),false);assert.match(f.controller.snapshot().error,/unavailable/);assert.equal(f.calls.fetches,0);assert.equal(f.controller.snapshot().canStart,false);f.controller.setMuted(true);const activation=f.controller.activate();assert(activation.immediate.ok);assert(f.controller.claim(activation.immediate));assert.equal(f.engine.context,null);await f.controller.destroy();
 });
 await check('focus cancellation resolves pending activation and late native resume is re-suspended',async()=>{
  const f=fixture(),hold=deferred();await f.controller.prepare();f.context.resumeAction=()=>hold.promise.then(()=>{f.context.state='running';});
  const pending=f.controller.activate();f.controller.cancel('blur');const r=await pending;assert.equal(r.ok,false);assert.equal(r.reason,'cancelled');assert.equal(f.controller.snapshot().status,'ready');assert.equal(f.controller.claim(r),false);
  hold.resolve();await flush();assert.equal(f.context.state,'suspended');assert.equal(f.engine.stats().running,false);assert.equal(f.context.starts,0);f.context.resumeAction=null;assert(f.controller.claim(await f.controller.activate()));await f.controller.destroy();
 });
 await check('a successful but not-yet-claimed completion is invalidated by focus loss',async()=>{
  const f=fixture();await f.controller.prepare();const activation=await f.controller.activate();f.controller.cancel('hidden');assert.equal(f.controller.claim(activation),false);assert.equal(f.engine.stats().running,false);await f.controller.destroy();
 });
 await check('a cancelled old resume cannot suspend a newer successful activation',async()=>{
  const f=fixture(),old=deferred();await f.controller.prepare();f.context.resumeAction=()=>old.promise.then(()=>{f.context.state='running';});const cancelled=f.controller.activate();f.controller.cancel('blur');assert.equal((await cancelled).ok,false);
  f.context.resumeAction=null;assert(f.controller.claim(await f.controller.activate()));old.resolve();await flush();assert.equal(f.context.state,'running');assert.equal(f.engine.stats().running,true);await f.controller.destroy();
 });
 await check('muting a pending unlock invalidates its result and late native resume stays silent',async()=>{
  const f=fixture(),hold=deferred();await f.controller.prepare();f.context.resumeAction=()=>hold.promise.then(()=>{f.context.state='running';});const old=f.controller.activate();f.controller.setMuted(true);assert.equal((await old).ok,false);const muted=f.controller.activate();assert(f.controller.claim(muted.immediate));hold.resolve();await flush();assert.equal(f.controller.snapshot().status,'muted');assert.equal(f.context.state,'suspended');assert.equal(f.engine.shot(3),false);assert.equal(f.context.starts,0);await f.controller.destroy();
 });
 await check('muting cancels loading immediately and stale success never re-enables a sound start',async()=>{
  const hold=deferred(),f=fixture({fetch:async()=>{await hold.promise;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(44)};}});
  const old=f.controller.prepare();await flush();f.controller.setMuted(true);assert.equal(await old,false);const muted=await f.controller.activate();assert(f.controller.claim(muted));assert.equal(f.controller.snapshot().status,'muted');
  hold.resolve();await flush();assert.equal(f.controller.snapshot().status,'muted');assert.equal(f.engine.rifle.buffers.size,0);assert.equal(f.context.resumes,0);f.controller.setMuted(false);assert.equal(f.controller.snapshot().canStart,false);assert(await f.controller.prepare());assert.equal(f.controller.snapshot().canStart,true);await f.controller.destroy();
 });
 await check('unlock timeout remains retryable and rejects the eventual stale native resume',async()=>{
  const hold=deferred(),f=fixture({timeoutMs:5});await f.controller.prepare();f.context.resumeAction=()=>hold.promise.then(()=>{f.context.state='running';});
  const timedOut=await f.controller.activate();assert.equal(timedOut.reason,'timeout');assert.equal(timedOut.ok,false);assert.equal(f.controller.snapshot().canStart,true);assert.match(f.controller.snapshot().error,/timed out/);
  hold.resolve();await flush();assert.equal(f.context.state,'suspended');assert.equal(f.controller.claim(timedOut),false);f.context.resumeAction=null;assert(f.controller.claim(await f.controller.activate()));await f.controller.destroy();
 });
 await check('pagehide destroys its engine and page restoration starts from a fresh one',async()=>{
  const first=fixture(),hold=deferred();await first.controller.prepare();first.context.resumeAction=()=>hold.promise.then(()=>{first.context.state='running';});const stale=first.controller.activate();await first.controller.destroy();assert.equal(first.context.closes,1);assert.equal((await stale).ok,false);assert.equal(first.controller.snapshot().canStart,false);assert.equal(await first.controller.prepare(),false);
  const restored=fixture();assert.notEqual(restored.engine,first.engine);await restored.controller.prepare();assert.equal(restored.context.resumes,0);hold.resolve();await flush();assert.equal(first.controller.snapshot().status,'destroyed');assert.equal(restored.controller.snapshot().status,'ready');assert(restored.controller.claim(await restored.controller.activate()));await restored.controller.destroy();
 });
 await check('unexpected closed contexts require fresh preparation instead of unlocking an empty replacement',async()=>{
  const old=new Context(),fresh=new Context();let creations=0;const f=fixture({context:old,contextFactory:()=>++creations===1?old:fresh});await f.controller.prepare();old.state='closed';assert.equal(f.controller.snapshot().canStart,false);assert.equal((await f.controller.activate()).reason,'not-ready');assert(await f.controller.prepare());assert.equal(f.engine.context,fresh);assert.equal(fresh.decodes,79);assert.equal(fresh.resumes,0);assert(f.controller.claim(await f.controller.activate()));await f.controller.destroy();
 });
 console.log(checks+' audio preparation checks passed. Fake Web Audio is not browser/autoplay/pointer-lock/listening acceptance.');
})().catch(error=>{console.error(error);process.exitCode=1;});
