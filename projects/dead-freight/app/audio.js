/* Original procedural sound design for DEAD FREIGHT. No recordings or external assets.
 * Buffers are synthesized once per variant, then reused. Web Audio starts only in resume().
 * The final shaper bounds digital output; it cannot guarantee safe headphone/device volume.
 */
(function(root){
'use strict';
const LIMITS=Object.freeze({voices:32,buffers:80,seconds:1.25,sampleRate:48000,output:.86});
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const object=value=>value&&typeof value==='object'?value:{};
const clamp=(n,lo,hi,fallback=lo)=>Math.max(lo,Math.min(hi,finite(n,fallback)));
const weaponIndex=n=>Math.round(clamp(n,0,2));
const WEAPONS=Object.freeze([
 Object.freeze({name:'pistol',body:116,end:47,tail:.23,crack:4700,mechanism:1350}),
 Object.freeze({name:'shotgun',body:78,end:33,tail:.34,crack:2900,mechanism:760}),
 Object.freeze({name:'smg',body:168,end:67,tail:.14,crack:6200,mechanism:1820})
]);
const MATERIALS=Object.freeze({rock:'stone',boundary:'stone',concrete:'stone',brick:'stone',plaster:'stone',floor:'stone',trunk:'wood',crate:'wood',steel:'metal',barrel:'metal',armor:'armor',body:'body',head:'head',wood:'wood',metal:'metal',stone:'stone'});
const layer=(wave,at,duration,level,frequency=1000,end=frequency,lowpass=15000,highpass=35)=>({wave,at,duration,level,frequency,end,lowpass,highpass});
const noise=(at,duration,level,lowpass=15000,highpass=35)=>layer('noise',at,duration,level,1000,1000,lowpass,highpass);
const tone=(at,duration,level,frequency,end=frequency)=>layer('sine',at,duration,level,frequency,end);
function recipe(type,options={}){
 options=object(options);
 const weapon=weaponIndex(options.weapon),w=WEAPONS[weapon],v=Math.round(clamp(options.variant,0,2)),pitch=1+(v-1)*.026;
 const layers=[];let length=.3;
 const add=(...items)=>layers.push(...items);
 const mechanical=(at,scale=1)=>add(noise(at,.023,.16*scale,8000,1400),tone(at+.006,.032,.11*scale,w.mechanism*1.4,w.mechanism*.78));
 const casing=(at,scale=1)=>add(layer('metal',at,.115,.045*scale,2600,2450,8000,1700),noise(at+.071,.022,.027*scale,6200,2300));
 switch(type){
 case 'shot':{
  const suppressed=!!options.suppressed,s=suppressed?.36:1,heavy=weapon===1?1.17:1;
  length=weapon===2?.58:.55;
  // Muzzle crack, combustion body, low concussion, debris fizz, moving action, outdoor return.
  add(noise(0,suppressed?.032:.051,.49*s,w.crack*(suppressed?.48:1),suppressed?450:1700),
      tone(.002,w.tail,.49*s*heavy,w.body,w.end),
      noise(.006,w.tail,.30*s*heavy,suppressed?950:2100,90),
      tone(.004,.075,.14*s,w.body*1.93,w.body*.63),
      noise(.021,.105,.10*s,6700,3100));
  mechanical(.018,.50);
  if(weapon!==1){mechanical(.058,weapon===0?.40:.28);casing(weapon===0?.28:.25,.80);}
  add(noise(.072,.13,.115*s,1700,100),noise(.143,.22,.052*s,1150,100));
  break;
 }
 case 'impact':{
  const material=MATERIALS[options.material]||'stone';length=.32;
  if(material==='body'||material==='head'){
   add(tone(0,.085,.33,material==='head'?180:132,55),noise(.001,.052,.31,material==='head'?4100:1450,210));
   if(material==='head')add(noise(.009,.024,.21,7200,2600),tone(.019,.033,.055,1820,1200));
  }else if(material==='metal'||material==='armor'){
   add(noise(0,.024,.38,9500,1200),layer('metal',.002,.23,material==='armor'?.13:.22,material==='armor'?1480:2100,material==='armor'?1300:1900,8500,500),tone(0,.052,.16,220,91));
  }else if(material==='wood')add(noise(0,.045,.38,4200,700),tone(0,.065,.27,290,118),noise(.04,.15,.14,2500,1200));
  else add(noise(0,.032,.46,7600,2300),tone(.003,.046,.15,430,200),noise(.028,.18,.17,4900,2400));
  break;
 }
 case 'reload':{
  let phase=options.phase;if(Number.isFinite(phase))phase=['eject','insert','seat','close'][Math.round(clamp(phase,0,3))];
  length=.38;
  if(phase==='start'){
   length=.17;mechanical(0,.7);add(tone(.015,.053,.10,580,310));
  }else if(phase==='eject'){
   // Magazine/port handling, never spent-shell ejection: those follow the actual slide/pump.
   add(noise(0,.14,.15,2600,550),tone(.055,.07,.15,w.mechanism*.25,w.mechanism*.14));mechanical(.10,.38);
  }else if(phase==='insert'){
   add(noise(0,.10,.13,1600,350),tone(.024,.07,.17,360,190));mechanical(.082,.55);
  }else if(phase==='seat'){
   add(tone(0,.067,.30,230,83),noise(.004,.035,.27,4200,760));mechanical(.022,.45);
  }else if(phase==='perfect'){
   mechanical(0,1.0);add(tone(.003,.11,.13,1320,1050),tone(.028,.11,.085,1980,1580));
  }else if(phase==='mistime'){
   add(noise(0,.066,.17,2700,450),tone(.001,.12,.15,104,72));mechanical(.036,.25);
  }else if(phase==='close'){
   add(noise(0,.054,.22,4200,850),tone(.012,.085,.20,310,130));mechanical(.062,.65);
  }else if(phase==='loaded'){
   length=.14;mechanical(0,.5);add(tone(.009,.046,.10,470,280));
  }else return null;
  break;
 }
 case 'cycle':
  length=weapon===1?.43:.24;add(noise(0,.06,.16,4800,1100),tone(.002,.054,.11,w.mechanism*.7,w.mechanism*.44));mechanical(.095,.95);if(weapon===1)casing(.24,1.1);break;
 case 'empty':case 'needcycle':length=.12;mechanical(0,.8);add(tone(.004,.052,.08,650,480));break;
 case 'switch':length=.25;add(noise(0,.18,.15,1500,250));mechanical(.112,.7);break;
 case 'dash':length=.36;add(noise(0,.31,.26,1100,170),noise(.02,.11,.09,3500,1500),tone(.01,.13,.14,88,41));break;
 case 'hurt':length=.38;add(tone(0,.19,.42,102,34),noise(.002,.073,.26,2200,350),noise(.06,.23,.13,800,80));break;
 case 'break':length=.65;add(noise(0,.19,.38,4000,700),tone(0,.16,.29,155,49),noise(.11,.24,.19,2700,900),noise(.25,.23,.095,3600,1500));break;
 case 'explosion':length=1.12;add(tone(0,.51,.57,72,29),noise(0,.21,.58,3100,100),noise(.055,.72,.36,1300,40),noise(.16,.55,.11,4100,700));break;
 case 'enemyshot':length=.3;add(noise(0,.048,.27,3500,1000),tone(.005,.15,.27,119,51),noise(.063,.16,.08,1600,100));break;
 case 'kill':length=.2;add(tone(0,.14,.12,270,100),noise(0,.035,.055,1500,300));break;
 case 'warning':length=.13;add(tone(0,.10,.12,720,650));break;
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
  this.maxVoices=Math.round(clamp(options.maxVoices,8,LIMITS.voices,LIMITS.voices));this.voices=new Set();this.buffers=new Map();this.last=new Map();this.counter=0;this.bus=null;this.nodes=[];this.dropped=0;this.played=0;this.lifecycle=0;
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
 async resume(){
  if(this.destroyed)return false;const lifecycle=++this.lifecycle;
  try{if(!this.context||this.context.state==='closed'){this.context=this.contextFactory();this.ownsContext=true;this.bus=null;this.nodes=[];this.buffers.clear();}if(!this._setup())return false;await this.context.resume();if(this.destroyed||lifecycle!==this.lifecycle)return false;this.paused=false;return this.context.state==='running';}catch(_){return false;}
 }
 async suspend(){
  this.lifecycle++;this.paused=true;this.stopAll();try{if(this.context?.state==='running')await this.context.suspend();}catch(_){}return true;
 }
 setMuted(muted){this.muted=!!muted;if(this.master){const t=this.context.currentTime;this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.006);}if(this.muted)this.stopAll();return this.muted;}
 setVolume(volume){this.volume=clamp(volume,0,.85,.72);if(this.master&&!this.muted)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.012);return this.volume;}
 _dispose(voice,stop=false){
  if(!this.voices.delete(voice))return;
  voice.source.onended=null;if(stop)try{voice.source.stop();}catch(_){}
  for(const node of voice.nodes)try{node.disconnect();}catch(_){}
 }
 stopAll(){for(const voice of [...this.voices])this._dispose(voice,true);this.last.clear();}
 _buffer(type,options){
  const key=[type,weaponIndex(options.weapon),!!options.suppressed,options.material||'',options.phase??'',options.variant].join(':');
  if(this.buffers.has(key)){const buffer=this.buffers.get(key);this.buffers.delete(key);this.buffers.set(key,buffer);return buffer;}
  const design=recipe(type,options);if(!design)return null;
  const sr=Math.min(LIMITS.sampleRate,this.context.sampleRate||48000),data=synthesize(design,sr),buffer=this.context.createBuffer(1,data.length,sr);buffer.getChannelData(0).set(data);
  this.buffers.set(key,buffer);while(this.buffers.size>LIMITS.buffers)this.buffers.delete(this.buffers.keys().next().value);return buffer;
 }
 _play(type,options={}){
  if(this.destroyed||this.muted||this.paused||!this.bus||this.context?.state!=='running')return false;
  const c=this.context,now=c.currentTime,throttle=type==='shot'?.028:type==='impact'?.01:.035;
  if(this.last.has(type)&&now-this.last.get(type)<throttle){this.dropped++;return false;}
  const opt={...options,weapon:weaponIndex(options.weapon),variant:this.counter++%3};
  // Canonical inputs keep accidental unbounded event values from expanding cache identities.
  if(type==='impact')opt.material=MATERIALS[opt.material]||'stone';
  if(type!=='reload')delete opt.phase;
  const buffer=this._buffer(type,opt);if(!buffer)return false;this.last.set(type,now);
  const priority=type==='shot'||type==='hurt'?2:type==='reload'||type==='cycle'?1:0;
  if(this.voices.size>=this.maxVoices){
   let oldest=null;for(const voice of this.voices)if(!oldest||voice.priority<oldest.priority||(voice.priority===oldest.priority&&voice.start<oldest.start))oldest=voice;
   if(oldest.priority>priority){this.dropped++;return false;}this._dispose(oldest,true);
  }
  const source=c.createBufferSource(),gain=c.createGain(),nodes=[source,gain];source.buffer=buffer;
  const distance=clamp(options.distance,0,150),level=clamp(options.intensity,0,1,1);gain.gain.value=level/(1+distance*.055);
  source.connect(gain);let lastNode=gain;
  if(c.createStereoPanner){const pan=c.createStereoPanner();pan.pan.value=clamp(options.pan,-1,1,0);gain.connect(pan);lastNode=pan;nodes.push(pan);}
  lastNode.connect(this.bus);
  const voice={source,nodes,start:now,priority};this.voices.add(voice);source.onended=()=>this._dispose(voice);
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
  case 'perfect':case 'mistime':case 'loaded':return this.reload(type,data.weapon);
  case 'dash':case 'hurt':case 'cycle':case 'empty':case 'needcycle':case 'switch':case 'break':case 'explosion':case 'enemyshot':case 'kill':case 'warning':case 'pickup':return this._play(type,data);
  default:return false;
  }
 }
 stats(){return {ready:!!this.bus,running:!this.paused&&!this.destroyed&&this.context?.state==='running',muted:this.muted,voices:this.voices.size,buffers:this.buffers.size,played:this.played,dropped:this.dropped,maxVoices:this.maxVoices};}
 async destroy(){
  if(this.destroyed)return;this.destroyed=true;this.lifecycle++;this.paused=true;this.stopAll();this.buffers.clear();for(const node of this.nodes)try{node.disconnect();}catch(_){}this.nodes=[];this.bus=null;
  if(this.ownsContext&&this.context?.state!=='closed')try{await this.context?.close();}catch(_){}
 }
}
const api=Object.freeze({create:options=>new Engine(options),Engine,recipe,synthesize,LIMITS,WEAPONS});
root.DeadFreightAudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
