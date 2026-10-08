'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const R=require('./rifle-audio.js'),A=require('./audio.js');
const directory=path.join(__dirname,'../assets/audio/rifle');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function pcm(bytes){
 const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 let channels,sampleRate,bits,data;
 for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);if(id==='fmt '){assert.equal(b.readUInt16LE(p+8),1);channels=b.readUInt16LE(p+10);sampleRate=b.readUInt32LE(p+12);bits=b.readUInt16LE(p+22);}if(id==='data')data=b.subarray(p+8,p+8+n);p+=8+n+(n%2);}
 assert.equal(bits,16);const length=data.length/(channels*2);const decoded=Array.from({length:channels},()=>new Float32Array(length));
 for(let i=0;i<length;i++)for(let c=0;c<channels;c++)decoded[c][i]=data.readInt16LE((i*channels+c)*2)/32768;
 return {duration:length/sampleRate,numberOfChannels:channels,length,sampleRate,getChannelData:c=>decoded[c]};
}
function energy(b,start=0,end=b.length){let e=0;for(let c=0;c<b.numberOfChannels;c++){const x=b.getChannelData(c);for(let i=start;i<end;i++)e+=x[i]*x[i];}return e/((end-start)*b.numberOfChannels);}
class Param {constructor(){this.value=0;}setTargetAtTime(v){assert(Number.isFinite(v));this.value=v;}cancelScheduledValues(){}}
class Node {constructor(c,kind){this.context=c;this.kind=kind;this.connections=[];for(const p of ['gain','frequency','Q','threshold','knee','ratio','attack','release','pan'])this[p]=new Param();c.nodes.push(this);}connect(x){this.connections.push(x);}disconnect(){this.connections=[];this.disconnected=true;}}
class Source extends Node {constructor(c){super(c,'source');}start(t){this.startTime=t;}stop(t=this.context.currentTime){this.stopTime=t;}}
class Context {
 constructor(){this.currentTime=0;this.state='suspended';this.sampleRate=48000;this.nodes=[];this.destination={};this.syntheticBuffers=0;this.decodes=0;}
 createGain(){return new Node(this,'gain');}createBiquadFilter(){return new Node(this,'filter');}createDynamicsCompressor(){return new Node(this,'compressor');}createWaveShaper(){return new Node(this,'shaper');}createStereoPanner(){return new Node(this,'panner');}createBufferSource(){return new Source(this);}
 createBuffer(channels,length,sr){this.syntheticBuffers++;const data=new Float32Array(length);return {numberOfChannels:channels,length,sampleRate:sr,duration:length/sr,getChannelData:()=>data};}
 async decodeAudioData(bytes){this.decodes++;return pcm(bytes);}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
 advance(t){this.currentTime+=t;for(const n of this.nodes)if(n.kind==='source'&&n.onended&&n.stopTime<=this.currentTime)n.onended();}
}
const requested=[];
async function localFetch(url,options){
 requested.push(url);assert(/^audio\/rifle\/[a-z0-9-]+\.wav$/.test(url));assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');
 const bytes=fs.readFileSync(path.join(directory,path.basename(url)));
 return {ok:true,status:200,headers:{get:()=>String(bytes.length)},arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
}
const decoded=new Map();
for(const name of R.FILES){
 test(`${name} is a finite, bounded, local PCM recording with clean endpoints`,()=>{
  const bytes=fs.readFileSync(path.join(directory,name+'.wav')),b=R.validate(pcm(bytes));decoded.set(name,b);
  assert.equal(b.sampleRate,48000);assert.equal(b.numberOfChannels,2);assert(bytes.length<=R.LIMITS.bytesPerFile);assert(energy(b)>1e-7);
  for(let c=0;c<2;c++){const x=b.getChannelData(c);assert.equal(x[0],0);assert.equal(x.at(-1),0);let dc=0;for(const v of x)dc+=v;assert(Math.abs(dc/x.length)<.0001);}
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.files[name].sha256);assert.equal(b.length,manifest.files[name].frames);
 });
}
test('Pixabay provenance is exact and raw downloads are excluded from distributed assets',()=>{
 const provenance=JSON.parse(fs.readFileSync(path.join(directory,'../provenance.json')));
 assert.equal(provenance.provider,'Pixabay');assert.equal(provenance.rawSourcesIncluded,false);assert(provenance.sources.length>=10);
 assert.equal(fs.existsSync(path.join(directory,'../sources')),false);
 for(const source of provenance.sources){
  assert.equal(source.sha256,manifest.sourceHashes[source.id]);assert.match(source.sha256,/^[a-f0-9]{64}$/);assert(source.page.startsWith('https://pixabay.com/sound-effects/'));assert(source.artist);assert.equal(source.license,'Pixabay Content License');
  if(process.env.DF_RIFLE_SOURCE_DIR)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(process.env.DF_RIFLE_SOURCE_DIR,source.id+'.mp3'))).digest('hex'),source.sha256);
 }
 for(const file of Object.values(manifest.files)){assert(file.sourceIds.length>=1);for(const id of file.sourceIds)assert(manifest.sourceHashes[id]);}
});
test('three round-robin attacks are distinct, suppression is quieter, tails decay',()=>{
 const hashes=new Set(R.FILES.filter(x=>/^shot-[123]$/.test(x)).map(x=>manifest.files[x].sha256));assert.equal(hashes.size,3);
 for(const prefix of ['','pistol-','shotgun-','smg-'])for(let i=1;i<=3;i++){
  const loud=decoded.get(prefix+'shot-'+i),quiet=decoded.get(prefix+'suppressed-'+i);assert(energy(quiet)<energy(loud)*.18);assert(energy(loud,0,4800)>energy(loud,Math.floor(loud.length*.60),Math.floor(loud.length*.90))*10);
  assert(energy(loud,loud.length-480)<energy(loud)*.001);
 }
});
test('indoor and outdoor shot tails are bounded and distinctly mixed',()=>{
 for(let i=1;i<=3;i++)for(const type of ['shot','suppressed']){const outdoor=decoded.get(type+'-'+i),indoor=decoded.get(type+'-indoor-'+i);assert.notEqual(manifest.files[type+'-'+i].sha256,manifest.files[type+'-indoor-'+i].sha256);assert(energy(indoor)>0);assert(energy(indoor,4800,12000)!==energy(outdoor,4800,12000));}
});
test('every firearm requires recordings and cannot synthesize a fallback',()=>{
 for(let weapon=0;weapon<4;weapon++)for(const type of ['shot','reload','cycle','empty','switch','impact','enemyshot'])assert.equal(A.recipe(type,{weapon,phase:'eject'}),null);
 assert(A.WEAPONS.every(w=>w.recorded));
 assert.equal(R.keyFor('reload',{phase:'perfect'}),null);assert.equal(R.keyFor('riflecycle'),null);
});
(async()=>{
 const context=new Context(),updates=[],engine=A.create({context,fetch:localFetch,onRifleStatus:s=>updates.push(s),maxVoices:8});
 assert.equal(engine.stats().rifle.status,'idle');for(let weapon=0;weapon<4;weapon++)assert.equal(engine.shot(weapon),false);await engine.resume();for(let weapon=0;weapon<4;weapon++)assert.equal(engine.shot(weapon),false);assert.equal(context.syntheticBuffers,0);
 const p=engine.preloadRifle();assert.equal(engine.stats().rifle.status,'loading');for(let weapon=0;weapon<4;weapon++)assert.equal(engine.shot(weapon),false);assert(await p);assert.equal(engine.voices.size,0,'dropped loading-time shots are never replayed later');assert.equal(engine.played,0);
 test('atomic local bank loading exposes readiness and keeps fixed decoded count',()=>{
  assert.equal(engine.stats().rifle.status,'ready');assert.equal(engine.stats().rifle.loaded,R.FILES.length);assert.equal(requested.length,R.FILES.length);assert.equal(context.decodes,R.FILES.length);assert(updates.some(x=>x.status==='loading'));assert.equal(context.syntheticBuffers,0);
 });
 assert(await engine.preloadRifle());assert.equal(context.decodes,R.FILES.length);
 test('rifle uses exactly three decoded shot variations and retained stereo',()=>{
  const used=[];for(let i=0;i<6;i++){context.advance(.10);assert(engine.shot(3));used.push([...engine.voices].at(-1).source.buffer);}
  assert.equal(new Set(used).size,3);assert.equal(used[0],used[3]);for(const b of used)assert.equal(b.numberOfChannels,2);assert.equal(context.syntheticBuffers,0);assert.equal(engine.buffers.size,0);
 });
 test('authoritative reload phases and impacts select real samples without duplicate charge',()=>{
  engine.stopAll();for(const stage of ['eject','insert','seat','charge','close']){context.advance(.1);assert(engine.event('reloadstage',{weapon:3,stage}));}
  context.advance(.1);assert.equal(engine.event('loaded',{weapon:3}),false);assert.equal(engine.event('riflecycle',{weapon:3}),false);
  for(const material of ['metal','armor','wood','stone','head','body']){context.advance(.1);assert(engine.impact(material,{weapon:3,pan:.5,distance:12}));}
  context.advance(.1);assert(engine.event('empty',{weapon:3}));context.advance(.1);assert(engine.event('switch',{weapon:3}));assert.equal(context.syntheticBuffers,0);
 });
 test('all playable firearms use their own decoded shots and timed mechanical phases',()=>{
  engine.stopAll();
  for(let weapon=0;weapon<4;weapon++){
   const prefix=['pistol-','shotgun-','smg-',''][weapon];
   for(const suppressed of [false,true])for(const environment of ['outdoor','indoor']){
    context.advance(.1);assert(engine.shot(weapon,{suppressed,environment}));const actual=[...engine.voices].at(-1).source.buffer;
    assert([1,2,3].some(i=>actual===engine.rifle.buffers.get(prefix+(suppressed?'suppressed':'shot')+(environment==='indoor'?'-indoor':'')+'-'+i)));
   }
   for(const phase of ['start','eject','insert','seat','close']){context.advance(.1);assert(engine.reload(phase,weapon));}
   for(const phase of ['perfect','mistime','loaded']){context.advance(.1);assert.equal(engine.reload(phase,weapon),false);}
   context.advance(.1);assert(engine.event('empty',{weapon}));context.advance(.1);assert(engine.event('switch',{weapon}));
   if(weapon!==3){context.advance(.1);assert(engine.event('cycle',{weapon}));assert.equal([...engine.voices].at(-1).source.buffer,engine.rifle.buffers.get(prefix+'cycle'));if(weapon<2)assert([...engine.voices].at(-1).source.buffer.duration<=(weapon===0?.19:.28));}
   context.advance(.1);assert(engine.event('hurt',{weapon}));assert.equal([...engine.voices].at(-1).source.buffer,engine.rifle.buffers.get('impact-body'));context.advance(.1);assert(engine.event('hurt',{weapon,armored:true}));assert.equal([...engine.voices].at(-1).source.buffer,engine.rifle.buffers.get('impact-armor'));context.advance(.1);assert(engine.impact('metal',{weapon}));context.advance(.1);assert(engine.event('casingbounce',{weapon,material:'wood'}));
   for(const type of ['kill','warning']){context.advance(.1);assert.equal(engine.event(type,{weapon}),false);}
  }
  assert.equal(context.syntheticBuffers,0);assert.equal(engine.buffers.size,0);engine.stopAll();
 });
 test('enemy gunfire uses recorded rifle output independent of equipped gun',()=>{
  for(let weapon=0;weapon<4;weapon++){context.advance(.1);assert(engine.event('enemyshot',{weapon,distance:20}));const voice=[...engine.voices].at(-1);assert([1,2,3].some(i=>voice.source.buffer===engine.rifle.buffers.get('shot-'+i)));assert(voice.nodes.find(n=>n.kind==='gain').gain.value<.5);}engine.stopAll();assert.equal(context.syntheticBuffers,0);
 });
 test('partial armor impact uses its recorded composite instead of bare-body cue',()=>{
  engine.stopAll();context.advance(.1);assert(engine.impact('body',{weapon:3,armored:true}));const composite=[...engine.voices].at(-1).source.buffer;
  context.advance(.1);assert(engine.impact('body',{weapon:3}));assert.notEqual(composite,[...engine.voices].at(-1).source.buffer);
  assert.equal(R.keyFor('impact',{material:'armor'}),'impact-armor');assert.equal(R.keyFor('impact',{material:'body',armored:true}),'impact-body-armored');
 });
 test('rifle reload cancellation preserves active shot reflection tails',()=>{
  engine.stopAll();context.advance(.1);assert(engine.shot(3));assert(engine.reload('charge',3));assert.equal(engine.voices.size,2);engine.cancelRifleReload();assert.equal(engine.voices.size,1);assert.equal([...engine.voices][0].type,'shot');engine.stopAll();
 });
 test('reload cancellation leaves no queued later phases or phantom charge',()=>{
  engine.stopAll();context.advance(.1);assert(engine.event('reloadstage',{weapon:3,stage:'eject'}));assert.equal(engine.voices.size,1);
  const played=engine.stats().played;engine.event('reloadcancel',{weapon:3});assert.equal(engine.voices.size,0);context.advance(4);assert.equal(engine.stats().played,played);assert.equal(engine.voices.size,0);
 });
 test('casing contact is independent, varied and damped on soft ground',()=>{
  engine.stopAll();context.advance(.1);engine.shot(3);assert.equal(engine.voices.size,1,'shot has one combined buffer, no scheduled floor drop');engine.stopAll();
  const used=[];for(let i=0;i<3;i++){context.advance(.1);assert(engine.event('casingbounce',{weapon:3,material:'stone',pan:.7,distance:2}));const voice=[...engine.voices].at(-1);used.push(voice.source.buffer);assert.equal(voice.type,'casing');}
  assert.equal(new Set(used).size,3);engine.stopAll();context.advance(.1);engine.event('casing',{weapon:3,material:'soil',pan:-.6});const voice=[...engine.voices].at(-1);assert.equal(voice.nodes.find(x=>x.kind==='filter').frequency.value,2600);assert.equal(voice.nodes.find(x=>x.kind==='gain').gain.value,.14);assert.equal(voice.nodes.find(x=>x.kind==='panner').pan.value,-.6);
 });
 test('bounded rifle voices, suppressed routes and mute cancel tails',()=>{
  for(let i=0;i<160;i++){context.advance(.031);engine.shot(3,{suppressed:!!(i%2)});assert(engine.voices.size<=8);}
  assert(engine.stats().dropped>=0);engine.setMuted(true);assert.equal(engine.voices.size,0);assert.equal(engine.shot(3),false);engine.setMuted(false);assert(engine.shot(3));
  const source=[...engine.voices][0].source;assert.equal(source.loop,undefined);assert(source.stopTime<=context.currentTime+1.265);
 });
 await engine.suspend();assert.equal(engine.voices.size,0);assert.equal(engine.shot(3),false);await engine.resume();assert(engine.shot(3));context.advance(2);assert.equal(engine.voices.size,0);
 test('pause/resume retains decoded recordings but releases playback nodes',()=>{assert.equal(context.decodes,R.FILES.length);assert.equal(context.syntheticBuffers,0);assert(context.nodes.filter(x=>x.kind==='source').every(x=>x.disconnected));});
 await engine.destroy();assert.equal(engine.rifle.buffers.size,0);assert.equal(engine.shot(3),false);assert.equal(await engine.preloadRifle(),false);
 const failed=A.create({context:new Context(),fetch:async()=>({ok:false,status:404})});await failed.resume();assert.equal(await failed.preloadRifle(),false);
 test('missing WAV gives visible error with no partial bank or synthetic fallback',()=>{assert.equal(failed.stats().rifle.status,'error');assert.match(failed.stats().rifle.error,/HTTP 404/);assert.equal(failed.rifle.buffers.size,0);for(let weapon=0;weapon<4;weapon++)assert.equal(failed.shot(weapon),false);assert.equal(failed.context.syntheticBuffers,0);});
 await failed.destroy();
 for(const base of ['https://example.com/','//example.com/','../audio/','audio/?secret=1','/audio/']){
  const bank=new R.Bank({base,fetch:()=>{throw Error('must not fetch');}});assert.equal(await bank.load(new Context()),false);assert.match(bank.error,/project-local/);
 }
 checks++;console.log('PASS external and escaping asset paths are rejected before network work');
 const invalid=pcm(fs.readFileSync(path.join(directory,'shot-1.wav')));invalid.getChannelData(0)[25]=NaN;
 test('corrupt, silent, oversized and non-finite decode results are rejected',()=>{
  assert.throws(()=>R.validate(invalid));assert.throws(()=>R.validate({...invalid,duration:100}));assert.throws(()=>R.validate({...invalid,numberOfChannels:8}));assert.throws(()=>R.validate({...invalid,getChannelData:()=>new Float32Array(invalid.length)}));
 });
 let began=0;const cancelled=new R.Bank({fetch:(url,options)=>new Promise((resolve,reject)=>{began++;options.signal.addEventListener('abort',()=>reject(Error('aborted')));})});
 const loading=cancelled.load(new Context());cancelled.destroy();assert.equal(await loading,false);
 test('destroy aborts pending network and cannot resurrect a decoded bank',()=>{assert.equal(began,3);assert.equal(cancelled.buffers.size,0);assert.equal(cancelled.get('shot'),null);});
 console.log(`${checks} recorded rifle audio checks passed. Listening and browser/device acceptance are NOT verified.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
