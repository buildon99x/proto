/* Recorded, project-local rifle bank. Source credits and editing notes: ../audio-provenance.md.
 * This module never generates a replacement tone when a recording is missing.
 */
(function(root){
'use strict';
const FILES=Object.freeze(['shot-1','shot-2','shot-3','suppressed-1','suppressed-2','suppressed-3','mag-eject','mag-insert','mag-seat','charge','dry-trigger','transition','close','impact-metal','impact-wood','impact-stone','impact-body','impact-armor','casing-1','casing-2','casing-3','shot-indoor-1','shot-indoor-2','shot-indoor-3','suppressed-indoor-1','suppressed-indoor-2','suppressed-indoor-3','impact-body-armored']);
const LIMITS=Object.freeze({files:FILES.length,bytesPerFile:256000,duration:1.25,channels:2,concurrency:3,timeoutMs:10000});
const PHASES=Object.freeze({start:'transition',eject:'mag-eject',insert:'mag-insert',seat:'mag-seat',charge:'charge',close:'close'});
function keyFor(type,options={},variant=0){
 if(type==='shot')return `${options.suppressed?'suppressed':'shot'}${options.environment==='indoor'?'-indoor':''}-${((variant%3)+3)%3+1}`;
 if(type==='reload')return PHASES[options.phase]||null;
 if(type==='empty'||type==='needcycle')return 'dry-trigger';
 if(type==='switch')return 'transition';
 if(type==='casing'||type==='casingbounce')return 'casing-'+(((variant%3)+3)%3+1);
 if(type==='impact'&&options.armored&&(options.material==='body'||options.material==='head'))return 'impact-body-armored';
 if(type==='impact')return 'impact-'+({metal:'metal',armor:'armor',wood:'wood',body:'body',head:'body'}[options.material]||'stone');
 return null; // In particular, riflecycle is already mixed at +45 ms in each shot.
}
function validate(buffer){
 if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>LIMITS.duration||!Number.isInteger(buffer.numberOfChannels)||buffer.numberOfChannels<1||buffer.numberOfChannels>LIMITS.channels||!Number.isInteger(buffer.length)||buffer.length<1||buffer.length>192000*LIMITS.duration)throw Error('Invalid rifle recording format');
 let energy=0;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel);if(data.length!==buffer.length)throw Error('Incomplete rifle recording');
  for(let i=0;i<data.length;i++){const v=data[i];if(!Number.isFinite(v)||Math.abs(v)>.88)throw Error('Unsafe rifle recording samples');energy+=v*v;}
 }
 if(energy<.000001)throw Error('Silent rifle recording');
 return buffer;
}
class Bank {
 constructor(options={}){
  this.base=options.base||'audio/rifle/';this.fetch=options.fetch||(typeof root.fetch==='function'?root.fetch.bind(root):null);this.onStatus=typeof options.onStatus==='function'?options.onStatus:null;
  this.status='idle';this.error=null;this.loaded=0;this.buffers=new Map();this.pending=null;this.context=null;this.destroyed=false;this.generation=0;this.controllers=new Set();this.shotCounter=0;this.casingCounter=0;
 }
 stats(){return {status:this.status,error:this.error,loaded:this.loaded,total:FILES.length};}
 _notify(){if(this.onStatus)try{this.onStatus(this.stats());}catch(_){} }
 async load(context){
  if(this.destroyed)return false;
  if(this.status==='ready'&&this.context===context)return true;
  if(this.pending&&this.context===context)return this.pending;
  this.cancel();this.context=context;const generation=this.generation;this.status='loading';this.error=null;this.loaded=0;this._notify();
  // Only local paths: no external requests, data URLs, fragments, queries, or path traversal.
  const validBase=typeof this.base==='string'&&/^(?:\.\/)?[a-zA-Z0-9_/-]+\/$/.test(this.base)&&!this.base.startsWith('/')&&!this.base.includes('..');
  if(!validBase||!this.fetch||typeof context?.decodeAudioData!=='function'){this.status='error';this.error=!validBase?'Rifle audio path must be project-local':'Recorded rifle audio cannot be decoded on this device';this._notify();return false;}
  const staged=new Map();let next=0;
  const worker=async()=>{
   while(next<FILES.length&&generation===this.generation){
    const name=FILES[next++],controller=typeof AbortController!=='undefined'?new AbortController():null;
    if(controller)this.controllers.add(controller);
    let timer;
    const work=async()=>{
     const response=await this.fetch(this.base+name+'.wav',{signal:controller?.signal,credentials:'same-origin',redirect:'error'});
     if(!response.ok)throw Error(`${name}.wav: HTTP ${response.status}`);
     const size=Number(response.headers?.get?.('content-length'));
     if(Number.isFinite(size)&&size>LIMITS.bytesPerFile)throw Error(`${name}.wav: file too large`);
     const bytes=await response.arrayBuffer();
     if(bytes.byteLength<44||bytes.byteLength>LIMITS.bytesPerFile)throw Error(`${name}.wav: invalid size`);
     const buffer=validate(await context.decodeAudioData(bytes));
     if(generation!==this.generation||this.destroyed)return;
     staged.set(name,buffer);this.loaded=staged.size;this._notify();
    };
    try{await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();reject(Error(`${name}.wav: load timed out`));},LIMITS.timeoutMs);})]);}
    finally{clearTimeout(timer);if(controller)this.controllers.delete(controller);}
   }
  };
  this.pending=(async()=>{
   try{
    await Promise.all(Array.from({length:LIMITS.concurrency},worker));
    if(generation!==this.generation||this.destroyed)return false;
    if(staged.size!==FILES.length)throw Error('Rifle bank is incomplete');
    this.buffers=staged;this.status='ready';this.error=null;this._notify();return true;
   }catch(error){
    if(generation!==this.generation||this.destroyed)return false;
    this.generation++;for(const c of this.controllers)c.abort();this.controllers.clear();this.buffers.clear();this.loaded=0;this.status='error';this.error=String(error?.message||'Rifle audio load failed').slice(0,180);this._notify();return false;
   }finally{if(generation===this.generation||this.status==='error')this.pending=null;}
  })();
  return this.pending;
 }
 get(type,options={}){
  if(this.destroyed||this.status!=='ready')return null;
  const key=keyFor(type,options,type==='shot'?(this.shotCounter=(this.shotCounter+1)%3):type==='casing'||type==='casingbounce'?(this.casingCounter=(this.casingCounter+1)%3):0);
  return key?this.buffers.get(key)||null:null;
 }
 cancel(){this.generation++;for(const c of this.controllers)c.abort();this.controllers.clear();this.pending=null;}
 reset(){this.cancel();this.buffers.clear();this.context=null;this.loaded=0;this.shotCounter=0;this.casingCounter=0;this.status='idle';this.error=null;this._notify();}
 destroy(){this.destroyed=true;this.reset();}
}
const api=Object.freeze({Bank,FILES,LIMITS,keyFor,validate});root.DeadFreightRifleAudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
