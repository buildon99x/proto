'use strict';
const assert=require('node:assert/strict');
const A=require('./audio.js');
let checks=0;
function test(name,fn){fn();console.log('PASS '+name);checks++;}
function energy(samples,start=0,end=samples.length){let sum=0;for(let i=start;i<end;i++)sum+=samples[i]*samples[i];return sum/Math.max(1,end-start);}
function peak(samples){let p=0;for(let n of samples)p=Math.max(p,Math.abs(n));return p;}
const variants=[];
for(let weapon=0;weapon<3;weapon++)for(let suppressed of [false,true])for(let variant=0;variant<3;variant++){
 test(`weapon ${weapon} suppressed=${suppressed} variant=${variant} bounded layered signal`,()=>{
  const design=A.recipe('shot',{weapon,suppressed,variant}),buffer=A.synthesize(design);
  assert(design.layers.length>=8);assert(buffer.every(Number.isFinite));assert(peak(buffer)>.05&&peak(buffer)<=.881);assert.equal(buffer[0],0);assert.equal(buffer.at(-1),0);
  assert(energy(buffer,0,4800)>energy(buffer,14400,19200)*8,'muzzle attack dominates outdoor return');
  assert.deepEqual(buffer,A.synthesize(design),'seeded synthesis must be deterministic');variants.push(buffer);
 });
}
test('weapons and suppression produce measurably different signals',()=>{
 for(let w=0;w<3;w++){
  const loud=A.synthesize(A.recipe('shot',{weapon:w})),quiet=A.synthesize(A.recipe('shot',{weapon:w,suppressed:true}));
  assert(energy(quiet)<energy(loud)*.25);assert.notDeepEqual(loud,quiet);
 }
 assert.notDeepEqual(variants[0],variants[6]);assert.notDeepEqual(variants[0],variants[12]);assert.notDeepEqual(variants[0],variants[1]);
});
test('material impacts stay distinct and all reload phases synthesize',()=>{
 const sounds=new Set();
 for(let material of ['body','head','armor','wood','metal','stone']){const b=A.synthesize(A.recipe('impact',{material}));assert(b.every(Number.isFinite));assert(peak(b)<=.881&&energy(b)>.00001);sounds.add(Buffer.from(b.buffer).toString('base64'));}
 assert.equal(sounds.size,6);
 for(let weapon=0;weapon<3;weapon++)for(let phase of ['start','eject','insert','seat','close','perfect','mistime','loaded',0,1,2,3]){const d=A.recipe('reload',{phase,weapon});assert(d);assert(energy(A.synthesize(d))>0);}
 assert.equal(A.recipe('not-an-event'),null);assert.equal(A.recipe('reload',{phase:'unknown'}),null);
});
test('pistol and SMG eject on shot; shotgun ejects only on its cycle',()=>{
 assert.equal(A.WEAPONS[0].name,'pistol');
 const cases=design=>design.layers.filter(part=>part.wave==='metal');
 for(let weapon=0;weapon<3;weapon++){
  assert.equal(cases(A.recipe('shot',{weapon})).length,weapon===1?0:1);
  assert.equal(cases(A.recipe('cycle',{weapon})).length,weapon===1?1:0);
  for(let phase of ['start','eject','insert','close','loaded'])assert.equal(cases(A.recipe('reload',{phase,weapon})).length,0);
  const reloadSignals=new Set(['start','eject','insert','close','loaded'].map(phase=>Buffer.from(A.synthesize(A.recipe('reload',{phase,weapon})).buffer).toString('base64')));
  assert.equal(reloadSignals.size,5,'each integrated reload phase has its own sound');
 }
});
test('all event recipes are finite with bounded duration',()=>{
 for(let type of ['cycle','empty','needcycle','switch','dash','hurt','break','explosion','enemyshot','kill','warning','pickup']){
  const d=A.recipe(type),b=A.synthesize(d);assert(b.length<=A.LIMITS.sampleRate*A.LIMITS.seconds);assert(b.every(Number.isFinite));assert(peak(b)<=.881);assert(energy(b)>0);
 }
});
test('invalid numeric synthesis inputs are bounded without NaN',()=>{
 for(let sampleRate of [-1,NaN,Infinity,0,8000,192000]){
  const b=A.synthesize({length:Infinity,seed:NaN,layers:[null,{wave:'noise',at:NaN,duration:Infinity,level:Infinity,frequency:NaN,end:-1,lowpass:Infinity,highpass:NaN}]},sampleRate);
  assert(b.length>0&&b.length<=A.LIMITS.sampleRate*A.LIMITS.seconds);assert(b.every(Number.isFinite));assert(peak(b)<=.881);
 }
 assert.equal(energy(A.synthesize(null)),0);assert(A.recipe('shot',null));assert(A.create(null));
});
class Param{
 constructor(value=0){this.value=value;this.calls=[];}
 setTargetAtTime(value,time,constant){assert([value,time,constant].every(Number.isFinite));this.value=value;this.calls.push(['target',value,time,constant]);}
 cancelScheduledValues(time){assert(Number.isFinite(time));}
}
class Node{
 constructor(context,kind){this.context=context;this.kind=kind;this.connections=[];this.disconnected=false;context.nodes.push(this);for(let p of ['gain','frequency','Q','threshold','knee','ratio','attack','release','pan'])this[p]=new Param();}
 connect(node){this.connections.push(node);return node;}
 disconnect(){this.disconnected=true;this.connections=[];}
}
class Source extends Node{
 constructor(c){super(c,'source');this.started=false;this.stopped=false;this.stopTime=Infinity;}
 start(time){assert(Number.isFinite(time));this.started=true;this.startTime=time;}
 stop(time=this.context.currentTime){assert(Number.isFinite(time));this.stopTime=time;this.stopped=true;}
}
class Context{
 constructor({stereo=true}={}){this.sampleRate=48000;this.currentTime=0;this.state='suspended';this.nodes=[];this.destination={kind:'destination'};if(!stereo)this.createStereoPanner=undefined;}
 createGain(){return new Node(this,'gain');}
 createBiquadFilter(){return new Node(this,'filter');}
 createDynamicsCompressor(){return new Node(this,'compressor');}
 createWaveShaper(){return new Node(this,'shaper');}
 createStereoPanner(){return new Node(this,'panner');}
 createBufferSource(){return new Source(this);}
 createBuffer(channels,length,sr){assert.equal(channels,1);assert(Number.isInteger(length)&&length>0);const data=new Float32Array(length);return {duration:length/sr,getChannelData:()=>data};}
 async resume(){this.state='running';}
 async suspend(){this.state='suspended';}
 async close(){this.state='closed';}
 advance(seconds){this.currentTime+=seconds;for(const node of this.nodes)if(node instanceof Source&&node.onended&&node.stopTime<=this.currentTime)node.onended();}
}
(async()=>{
 const c=new Context(),engine=A.create({context:c});assert.equal(engine.shot(),false);assert.equal(c.nodes.length,0);assert(await engine.resume());
 test('audio graph has compressor, bounded final shaper and finite default gain',()=>{
  assert.deepEqual(engine.nodes.map(n=>n.kind),['gain','filter','compressor','gain','shaper']);assert.equal(engine.master.gain.value,.72);
  const shaper=engine.nodes.at(-1);assert([...shaper.curve].every(v=>Number.isFinite(v)&&Math.abs(v)<=A.LIMITS.output));assert.equal(shaper.connections[0],c.destination);
 });
 test('event playback, throttle and exact source cleanup',()=>{
  assert(engine.shot(2));assert.equal(engine.shot(2),false);assert.equal(engine.voices.size,1);assert.equal(engine.buffers.size,1);
  c.advance(.11);assert(engine.shot(2,{suppressed:true}));assert.equal(engine.voices.size,2);c.advance(2);assert.equal(engine.voices.size,0);
  for(let n of c.nodes.filter(n=>n.kind==='source'))assert(n.disconnected&&n.started&&n.stopped&&n.onended===null);
 });
 test('voice budget and priority eviction stay bounded during overlapping fire',()=>{
  engine.maxVoices=8;
  for(let i=0;i<100;i++){c.advance(.036);engine.event(i%3===0?'explosion':'shot',{weapon:i%3});assert(engine.voices.size<=8);}
  assert.equal(engine.voices.size,8);engine.stopAll();assert.equal(engine.voices.size,0);
 });
 test('muting stops old tails and prevents new work until unmuted',()=>{
  assert(engine.shot(0));engine.setMuted(true);assert.equal(engine.voices.size,0);assert.equal(engine.master.gain.value,0);const buffers=engine.buffers.size;assert.equal(engine.impact('metal'),false);assert.equal(engine.buffers.size,buffers);
  engine.setMuted(false);assert(engine.shot(0));assert.equal(engine.setVolume(Infinity),.72);assert.equal(engine.setVolume(10),.85);assert.equal(engine.setVolume(-1),0);engine.setVolume(.72);
 });
 await engine.suspend();assert.equal(c.state,'suspended');assert.equal(engine.voices.size,0);assert.equal(engine.event('dash'),false);assert(await engine.resume());checks++;console.log('PASS pause/resume cancels tails and restores playback');
 test('all event routes, pan and distance sanitization',()=>{
  for(let type of ['shot','blood','impact','reload','perfect','mistime','loaded','dash','hurt','cycle','empty','needcycle','switch','break','explosion','enemyshot','kill','warning','pickup']){
   c.advance(.1);assert(engine.event(type,{weapon:NaN,material:'steel',distance:Infinity,pan:NaN,intensity:NaN}));
  }
  c.advance(.1);assert(engine.event('shot',null));c.advance(.1);assert(engine.impact('wood',null));assert.equal(engine.event('bogus'),false);for(let node of c.nodes){assert(Number.isFinite(node.gain.value));assert(Number.isFinite(node.pan.value));}
 });
 test('cache has a fixed upper bound across weapon/phase/impact variants',()=>{
  for(let repeat=0;repeat<3;repeat++){for(let weapon=0;weapon<3;weapon++)for(let phase of ['start','eject','insert','seat','close','perfect','mistime','loaded']){c.advance(.1);engine.reload(phase,weapon);assert(engine.buffers.size<=A.LIMITS.buffers);}c.advance(.1);engine.event('pickup');}
  assert.equal(engine.buffers.size,A.LIMITS.buffers);
 });
 const monoContext=new Context({stereo:false}),mono=A.create({context:monoContext});assert(await mono.resume());assert(mono.impact('wood',{pan:.5}));await mono.destroy();assert.equal(monoContext.state,'running');assert.equal(mono.voices.size,0);assert.equal(mono.buffers.size,0);assert.equal(mono.shot(),false);checks++;console.log('PASS stereo fallback and injected-context ownership');
 const ownContext=new Context(),owned=A.create({contextFactory:()=>ownContext});assert(await owned.resume());owned.shot();await owned.destroy();assert.equal(ownContext.state,'closed');assert.equal(owned.stats().running,false);assert.equal(await owned.resume(),false);checks++;console.log('PASS owned context closes on destroy');
 const denied=A.create({contextFactory:()=>{throw new Error('unavailable');}});assert.equal(await denied.resume(),false);assert.equal(denied.shot(),false);await denied.destroy();checks++;console.log('PASS unavailable Web Audio degrades silently');
 const racingContext=new Context();let finishResume;racingContext.resume=()=>new Promise(resolve=>{finishResume=()=>{racingContext.state='running';resolve();};});const racing=A.create({context:racingContext});const pending=racing.resume();await racing.suspend();finishResume();assert.equal(await pending,false);assert.equal(racing.paused,true);assert.equal(racing.shot(),false);await racing.destroy();checks++;console.log('PASS delayed resume cannot undo a newer pause');
 await engine.destroy();assert.equal(engine.voices.size,0);assert.equal(engine.buffers.size,0);assert(engine.nodes.length===0);
 console.log(`${checks} audio checks passed. Signal/graph tests do not substitute for listening on target devices.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
