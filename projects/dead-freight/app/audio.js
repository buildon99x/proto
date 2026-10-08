/* DEAD FREIGHT audio: recorded gun effects for every weapon; separate procedural world/UI cues.
 * Rifle recordings and license provenance live in assets/audio and audio-provenance.md.
 * Gun buffers can be prepared silently before a gesture; only resume() unlocks playback.
 * The final shaper bounds digital output; it cannot guarantee safe headphone/device volume.
 */
(function(root){
'use strict';
const LIMITS=Object.freeze({voices:32,buffers:80,seconds:1.25,sampleRate:48000,output:.86});
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const object=value=>value&&typeof value==='object'?value:{};
const clamp=(n,lo,hi,fallback=lo)=>Math.max(lo,Math.min(hi,finite(n,fallback)));
const weaponIndex=n=>Math.round(clamp(n,0,3));
const RifleAudio=root.DeadFreightRifleAudio||(typeof module!=='undefined'&&module.exports?require('./rifle-audio.js'):null);
const WEAPONS=Object.freeze(['pistol','shotgun','smg','rifle'].map(name=>Object.freeze({name,recorded:true})));
const GUN_CUES=new Set(['shot','impact','reload','cycle','empty','needcycle','switch','enemyshot','casing','casingbounce','hurt']);
const MATERIALS=Object.freeze({rock:'stone',boundary:'stone',concrete:'stone',brick:'stone',plaster:'stone',floor:'stone',trunk:'wood',crate:'wood',steel:'metal',barrel:'metal',armor:'armor',body:'body',head:'head',wood:'wood',metal:'metal',stone:'stone'});
const layer=(wave,at,duration,level,frequency=1000,end=frequency,lowpass=15000,highpass=35)=>({wave,at,duration,level,frequency,end,lowpass,highpass});
const noise=(at,duration,level,lowpass=15000,highpass=35)=>layer('noise',at,duration,level,1000,1000,lowpass,highpass);
const tone=(at,duration,level,frequency,end=frequency)=>layer('sine',at,duration,level,frequency,end);
function recipe(type,options={}){
 options=object(options);
 // Gun cues have no synthesis recipe, including while the recording bank is unavailable.
 if(GUN_CUES.has(type)||['kill','warning'].includes(type))return null;
 const weapon=weaponIndex(options.weapon),v=Math.round(clamp(options.variant,0,2)),pitch=1+(v-1)*.026;
 const layers=[];let length=.3;const add=(...items)=>layers.push(...items);
 switch(type){
 case 'dash':length=.36;add(noise(0,.31,.26,1100,170),noise(.02,.11,.09,3500,1500),tone(.01,.13,.14,88,41));break;
 case 'break':length=.65;add(noise(0,.19,.38,4000,700),tone(0,.16,.29,155,49),noise(.11,.24,.19,2700,900),noise(.25,.23,.095,3600,1500));break;
 case 'explosion':length=1.12;add(tone(0,.51,.57,72,29),noise(0,.21,.58,3100,100),noise(.055,.72,.36,1300,40),noise(.16,.55,.11,4100,700));break;
 case 'pickup':length=.28;add(tone(0,.10,.12,660,640),tone(.07,.14,.105,990,970));break;
 default:return null;
 }
 return {type,length,layers:layers.map(l=>({...l,frequency:l.frequency*pitch,end:l.end*pitch})),seed:(19073+v*997+weaponIndex(options.weapon)*1367)>>>0};
}
function synthesize(input,sampleRate=48000){
 // Public for deterministic signal tests. All synthesis parameters are finite and bounded.
 const sr=Math.round(clamp(sampleRate,8000,LIMITS.sampleRate,48000));
 const duration=clamp(input?.length,.02,LIMITS.seconds,.3),out=new Float32Array(Math.ceil(duration*sr));
 let seed=(finite(input?.seed,19073)>>>0)||19073;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/2147483648-1;};
 const layers=Array.isArray(input?.layers)?input.layers.slice(0,24):[];
 for(const part of layers){
  if(!part||typeof part!=='object')continue;
  const at=clamp(part.at,0,duration),len=clamp(part.duration,.002,LIMITS.seconds,.1),level=clamp(part.level,0,1),start=Math.floor(at*sr),count=Math.min(Math.ceil(len*sr),out.length-start);
  const f0=clamp(part.frequency,25,sr*.43,120),f1=clamp(part.end,25,sr*.43,f0),lp=clamp(part.lowpass,40,sr*.45,15000),hp=clamp(part.highpass,20,sr*.40,35);
  const a=1-Math.exp(-2*Math.PI*lp/sr),b=Math.exp(-2*Math.PI*hp/sr);let phase=0,low=0,lastLow=0,high=0;
  for(let i=0;i<count;i++){
   const t=i/sr,u=Math.min(1,t/len);phase+=2*Math.PI*(f0*Math.pow(f1/f0,u))/sr;
   let raw=part.wave==='noise'?random():part.wave==='metal'?(Math.sin(phase)+.45*Math.sin(phase*1.47)+.24*Math.sin(phase*2.09))/1.69:Math.sin(phase);
   low+=a*(raw-low);high=b*(high+low-lastLow);lastLow=low;
   const attack=Math.min(1,t/.0012),endFade=Math.min(1,(len-t)/.009),decay=Math.exp(-6*u);
   out[start+i]+=high*level*attack*Math.max(0,endFade)*decay;
  }
 }
 let peak=0;for(let i=0;i<out.length;i++)peak=Math.max(peak,Math.abs(out[i]));
 const scale=peak>.88?.88/peak:1;
 // A final fade also covers layers that hit the recipe boundary.
 for(let i=0;i<out.length;i++)out[i]*=scale*Math.min(1,i/Math.max(1,sr*.001),(out.length-1-i)/Math.max(1,sr*.006));
 return out;
}
class Engine {
 constructor(options={}){
  options=object(options);
  this.context=options.context||null;this.ownsContext=!options.context;this.contextFactory=options.contextFactory||(()=>{const C=root.AudioContext||root.webkitAudioContext;return C?new C({latencyHint:'interactive'}):null;});
  this.muted=!!options.muted;this.volume=clamp(options.volume,0,.85,.72);this.paused=true;this.destroyed=false;
  this.maxVoices=Math.round(clamp(options.maxVoices,8,LIMITS.voices,LIMITS.voices));this.voices=new Set();this.buffers=new Map();this.last=new Map();this.counter=0;this.bus=null;this.nodes=[];this.dropped=0;this.played=0;this.lifecycle=0;this.preparation=0;this.preparePending=null;this.error=null;this.rifle=RifleAudio?new RifleAudio.Bank({base:options.rifleBase,fetch:options.fetch,onStatus:options.onRifleStatus}):null;
 }
 _setup(){
  if(this.bus)return true;const c=this.context;if(!c)return false;
  const bus=c.createGain(),highpass=c.createBiquadFilter(),compressor=c.createDynamicsCompressor(),master=c.createGain(),ceiling=c.createWaveShaper();
  highpass.type='highpass';highpass.frequency.value=30;highpass.Q.value=.5;
  compressor.threshold.value=-13;compressor.knee.value=4;compressor.ratio.value=12;compressor.attack.value=.001;compressor.release.value=.09;
  master.gain.value=this.muted?0:this.volume;
  // A final bounded transfer curve catches simultaneous attacks before compressor attack settles.
  const curve=new Float32Array(2049);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=LIMITS.output*Math.tanh(x/LIMITS.output);}
  ceiling.curve=curve;ceiling.oversample='2x';bus.connect(highpass);highpass.connect(compressor);compressor.connect(master);master.connect(ceiling);ceiling.connect(c.destination);
  this.bus=bus;this.master=master;this.nodes=[bus,highpass,compressor,master,ceiling];return true;
 }
 _ensureContext(){
  if(!this.context||this.context.state==='closed'){
   for(const node of this.nodes)try{node.disconnect();}catch(_){}
   this.context=null;this.bus=null;this.nodes=[];this.buffers.clear();this.rifle?.reset();
   this.context=this.contextFactory();this.ownsContext=true;
  }
  if(!this.context)throw Error('Web Audio is unavailable on this device');
  if(!this._setup())throw Error('Audio output could not be configured');
  return this.context;
 }
 _error(error,stage){this.error={stage,code:['NotAllowedError','SecurityError'].includes(error?.name)?'gesture-required':'audio-unavailable',message:String(error?.message||'Audio preparation failed').slice(0,180)};}
 prepare(){
  if(this.destroyed)return Promise.resolve(false);
  if(this.preparePending)return this.preparePending;
  const generation=++this.preparation;this.lifecycle++;this.paused=true;this.stopAll();this.error=null;
  let context,suspended;
  try{
   context=this._ensureContext();
   // Some previously permitted browsers create a running context. Suspend immediately,
   // before scheduling any source. Preparation never calls resume or starts a source.
   suspended=context.state==='running'?context.suspend():Promise.resolve();
  }catch(error){this._error(error,'prepare');return Promise.resolve(false);}
  const pending=Promise.resolve(suspended).then(async()=>{
   if(this.destroyed||generation!==this.preparation||context!==this.context)return false;
   if(context.state!=='suspended')throw Error('Audio context must be suspended while recordings are prepared');
   const ready=await this.preloadRifle();
   if(this.destroyed||generation!==this.preparation||context!==this.context)return false;
   if(!ready)throw Error(this.rifle?.stats().error||'Recorded gun audio could not be prepared');
   return this.stats().prepared;
  }).catch(error=>{if(!this.destroyed&&generation===this.preparation)this._error(error,'prepare');return false;}).finally(()=>{if(this.preparePending===pending)this.preparePending=null;});
  this.preparePending=pending;return pending;
 }
 cancelPreparation(){
  this.preparation++;this.preparePending=null;
  if(this.rifle?.stats().status==='loading')this.rifle.reset();
 }
 async resume(){
  if(this.destroyed)return false;const lifecycle=++this.lifecycle;this.error=null;
  try{
   const context=this._ensureContext();
   // Keep this call before the first await: activation belongs to the fresh Start gesture.
   await context.resume();
   if(this.destroyed||lifecycle!==this.lifecycle||context!==this.context){
    if((this.paused||this.destroyed)&&context.state==='running')try{await context.suspend();}catch(_){}
    return false;
   }
   this.paused=context.state!=='running';
   if(this.paused)this._error(Error('Audio remains suspended; retry Start or choose mute'),'resume');
   return !this.paused;
  }catch(error){if(lifecycle===this.lifecycle){this.paused=true;this._error(error,'resume');}return false;}
 }
 preloadRifle(){return this.destroyed||!this.context?Promise.resolve(false):this.rifle?.load(this.context)||Promise.resolve(false);}
 async suspend(){
  this.lifecycle++;this.cancelPreparation();this.paused=true;this.stopAll();try{if(this.context?.state==='running')await this.context.suspend();}catch(_){}return true;
 }
 setMuted(muted){this.muted=!!muted;if(this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.006);}if(this.muted)this.stopAll();return this.muted;}
 setVolume(volume){this.volume=clamp(volume,0,.85,.72);if(this.master&&!this.muted)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.012);return this.volume;}
 _dispose(voice,stop=false){
  if(!this.voices.delete(voice))return;
  voice.source.onended=null;if(stop)try{voice.source.stop();}catch(_){}
  for(const node of voice.nodes)try{node.disconnect();}catch(_){}
 }
 cancelRifleReload(){for(const voice of [...this.voices])if(voice.type==='reload'&&voice.weapon===3)this._dispose(voice,true);}
 cancelReload(){for(const voice of [...this.voices])if(voice.type==='reload')this._dispose(voice,true);}
 stopAll(){for(const voice of [...this.voices])this._dispose(voice,true);this.last.clear();}
 _buffer(type,options){
  if(GUN_CUES.has(type))return this.rifle?.get(type,options)||null;
  const key=[type,weaponIndex(options.weapon),!!options.suppressed,options.material||'',options.phase??'',options.variant].join(':');
  if(this.buffers.has(key)){const buffer=this.buffers.get(key);this.buffers.delete(key);this.buffers.set(key,buffer);return buffer;}
  const design=recipe(type,options);if(!design)return null;
  const sr=Math.min(LIMITS.sampleRate,this.context.sampleRate||48000),data=synthesize(design,sr),buffer=this.context.createBuffer(1,data.length,sr);buffer.getChannelData(0).set(data);
  this.buffers.set(key,buffer);while(this.buffers.size>LIMITS.buffers)this.buffers.delete(this.buffers.keys().next().value);return buffer;
 }
 _play(type,options={}){
  if(this.destroyed||this.muted||this.paused||!this.bus||this.context?.state!=='running')return false;
  const c=this.context,now=c.currentTime,throttle=type==='shot'?.028:type==='impact'?.01:.035;
  const eventKey=type+':'+weaponIndex(options.weapon)+(type==='reload'?':'+options.phase:'');
  if(this.last.has(eventKey)&&now-this.last.get(eventKey)<throttle){this.dropped++;return false;}
  const opt={...options,weapon:weaponIndex(options.weapon),variant:this.counter++%3};
  // Canonical inputs keep accidental unbounded event values from expanding cache identities.
  if(type==='impact')opt.material=MATERIALS[opt.material]||'stone';
  if(type!=='reload')delete opt.phase;
  const buffer=this._buffer(type,opt);if(!buffer)return false;this.last.set(eventKey,now);
  const priority=type==='shot'||type==='hurt'?2:type==='reload'||type==='cycle'?1:0;
  if(this.voices.size>=this.maxVoices){
   let oldest=null;for(const voice of this.voices)if(!oldest||voice.priority<oldest.priority||(voice.priority===oldest.priority&&voice.start<oldest.start))oldest=voice;
   if(oldest.priority>priority){this.dropped++;return false;}this._dispose(oldest,true);
  }
  const source=c.createBufferSource(),gain=c.createGain(),nodes=[source,gain];source.buffer=buffer;
  const distance=clamp(options.distance,0,150),level=clamp(options.intensity,0,1,1);gain.gain.value=level/(1+distance*.055);
  source.connect(gain);let lastNode=gain;
  if(type==='casing'||type==='casingbounce'){
   const surface=String(options.material||'stone'),soft=['soil','dirt','ground','grass'].includes(surface),wood=['wood','crate','trunk'].includes(surface);
   const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=soft?2600:wood?6500:15500;filter.Q.value=.45;gain.gain.value*=soft?.14:wood?.48:1;gain.connect(filter);lastNode=filter;nodes.push(filter);
  }
  if(c.createStereoPanner){const pan=c.createStereoPanner();pan.pan.value=clamp(options.pan,-1,1,0);lastNode.connect(pan);lastNode=pan;nodes.push(pan);}
  lastNode.connect(this.bus);
  const voice={source,nodes,start:now,priority,type,weapon:opt.weapon};this.voices.add(voice);source.onended=()=>this._dispose(voice);
  try{source.start(now);source.stop(now+buffer.duration+.015);this.played++;return true;}catch(_){this._dispose(voice,true);return false;}
 }
 shot(weapon=0,options={}){return this._play('shot',{...options,weapon});}
 impact(material='stone',options={}){options=object(options);return this._play('impact',{...options,material:options.head?'head':material});}
 reload(phase='start',weapon=0){return this._play('reload',{phase,weapon});}
 event(type,data={}){
  data=object(data);
  switch(type){
  case 'shot':return this.shot(data.weapon,data);
  case 'blood':return this.impact(data.head?'head':'body',data);
  case 'impact':return this.impact(data.material,data);
  case 'reload':return this.reload('start',data.weapon);
  case 'reloadstage':return this.reload(data.stage,data.weapon);
  case 'reloadcancel':if(data.weapon===3)this.cancelRifleReload();else this.cancelReload();return true;
  case 'casing':case 'casingbounce':return this._play('casing',data);
  case 'riflecycle':return false; // Recorded shot contains its own action; never duplicate it.
  case 'perfect':case 'mistime':case 'loaded':return this.reload(type,data.weapon);
  case 'dash':case 'hurt':case 'cycle':case 'empty':case 'needcycle':case 'switch':case 'break':case 'explosion':case 'enemyshot':case 'kill':case 'warning':case 'pickup':return this._play(type,data);
  default:return false;
  }
 }
 stats(){return {ready:!!this.bus,prepared:!this.destroyed&&!!this.bus&&this.context?.state!=='closed'&&this.rifle?.context===this.context&&this.rifle?.stats().status==='ready',running:!this.paused&&!this.destroyed&&this.context?.state==='running',muted:this.muted,error:this.error,voices:this.voices.size,buffers:this.buffers.size,played:this.played,dropped:this.dropped,maxVoices:this.maxVoices,rifle:this.rifle?.stats()||{status:'error',error:'Recorded gun audio module is missing',loaded:0,total:RifleAudio?.FILES.length||79}};}
 async destroy(){
  if(this.destroyed)return;this.destroyed=true;this.lifecycle++;this.cancelPreparation();this.paused=true;this.stopAll();this.rifle?.destroy();this.buffers.clear();for(const node of this.nodes)try{node.disconnect();}catch(_){}this.nodes=[];this.bus=null;
  if(this.ownsContext&&this.context?.state!=='closed')try{await this.context?.close();}catch(_){}
 }
}
const api=Object.freeze({create:options=>new Engine(options),Engine,recipe,synthesize,LIMITS,WEAPONS});
root.DeadFreightAudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
