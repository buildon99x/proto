/* Menu audio readiness only. This module has no world, inventory, persistence, DOM or pointer-lock access.
 * prepare() never calls resume, starts a source or starts a raid. Call activate() directly in a fresh input handler;
 * request pointer lock in that same handler, then claim the result before committing any gameplay state.
 * A resolved Promise's optional .immediate result supports already-running/muted continuation without
 * an extra microtask. Normal suspended contexts still wait for resume() to succeed.
 */
(function(root){
'use strict';
const Audio=root.DeadFreightAudio||(typeof module!=='undefined'&&module.exports?require('./audio.js'):null);
const result=(ok,reason,generation)=>Object.freeze({ok,reason,generation});
const immediate=value=>Object.assign(Promise.resolve(value),{immediate:value});
class Controller{
 constructor(options={}){
  this.engine=options.engine||Audio.create();this.onChange=typeof options.onChange==='function'?options.onChange:null;
  this.timeoutMs=Number.isFinite(options.timeoutMs)?Math.max(1,options.timeoutMs):5000;
  this.generation=0;this.status=this.engine.stats().muted?'muted':this._prepared()?'ready':'idle';this.error=null;this.destroyed=false;
  this.pending=null;this.abort=null;this.grant=null;
 }
 _prepared(){return this.engine.stats().prepared===true;}
 _notify(){if(this.onChange)try{this.onChange(this.snapshot());}catch(_){} }
 snapshot(){
  const stats=this.engine.stats(),bank=stats.rifle||{},muted=!!stats.muted,busy=this.status==='preparing'||this.status==='activating'||!!this.grant;
  return Object.freeze({status:this.status,busy,muted,prepared:this._prepared(),running:!!stats.running,
   canStart:!this.destroyed&&!busy&&(muted||this._prepared()),canPrepare:!this.destroyed&&!muted&&!busy&&!this._prepared(),
   loaded:bank.loaded||0,total:bank.total||79,error:this.error,generation:this.generation});
 }
 prepare(){
  if(this.destroyed)return Promise.resolve(false);
  if(this.status==='preparing')return this.pending;
  if(this.status==='activating')return Promise.resolve(false);
  if(this.engine.stats().muted){this.status='muted';this._notify();return Promise.resolve(true);}
  if(this._prepared()){this.status='ready';this.error=null;this._notify();return Promise.resolve(true);}
  const generation=++this.generation;this.grant=null;this.status='preparing';this.error=null;this._notify();
  const cancelled=new Promise(resolve=>{this.abort=()=>resolve(false);});
  let preparation;
  // Invoke synchronously so an exceptional explicit Prepare click can create the context itself.
  try{preparation=this.engine.prepare();}catch(error){preparation=Promise.reject(error);}
  const pending=Promise.race([Promise.resolve(preparation).catch(error=>{
   if(generation===this.generation)this.error=String(error?.message||'Audio preparation failed');return false;
  }),cancelled]).then(ready=>{
   if(this.destroyed||generation!==this.generation)return false;
   this.pending=null;this.abort=null;
   if(ready&&this._prepared()){this.status='ready';this.error=null;}
   else{const error=this.engine.stats().error;this.status=error?.code==='gesture-required'?'needs-gesture':'error';this.error=this.error||error?.message||this.engine.stats().rifle?.error||'Audio could not be prepared. Retry preparation or choose mute.';}
   this._notify();return this.status==='ready';
  });
  this.pending=pending;return pending;
 }
 activate(){
  if(this.destroyed)return immediate(result(false,'destroyed',this.generation));
  if(this.status==='preparing'||this.status==='activating'||this.grant)return immediate(result(false,'busy',this.generation));
  const stats=this.engine.stats();
  if(!stats.muted&&!this._prepared())return immediate(result(false,'not-ready',this.generation));
  const generation=++this.generation;this.error=null;
  if(stats.muted||stats.running){
   this.status=stats.muted?'muted':'active';this.grant=result(true,stats.muted?'muted':'ready',generation);this._notify();return immediate(this.grant);
  }
  this.status='activating';this._notify();
  let timer,resume;
  const cancelled=new Promise(resolve=>{this.abort=()=>resolve({ok:false,reason:'cancelled'});});
  // Never move resume into a .then callback: this call shares the fresh gesture with pointer lock.
  try{resume=this.engine.resume();}catch(error){resume=Promise.reject(error);}
  const unlocked=Promise.resolve(resume).then(ok=>({ok:!!ok,reason:'unlock-failed'}),error=>({ok:false,reason:'unlock-failed',error:String(error?.message||'Audio could not be unlocked')}));
  const timedOut=new Promise(resolve=>{timer=setTimeout(()=>resolve({ok:false,reason:'timeout'}),this.timeoutMs);});
  const pending=Promise.race([unlocked,cancelled,timedOut]).then(outcome=>{
   clearTimeout(timer);
   if(this.destroyed||generation!==this.generation)return result(false,'cancelled',generation);
   this.pending=null;this.abort=null;
   if(outcome.ok&&this._prepared()&&this.engine.stats().running){this.status='active';this.error=null;this.grant=result(true,'ready',generation);this._notify();return this.grant;}
   // A cancelled or timed-out native resume can resolve later. Engine's lifecycle guard re-suspends it.
   this.engine.suspend();this.status='error';this.error=outcome.error||this.engine.stats().error?.message||(outcome.reason==='timeout'?'Audio unlock timed out. Retry Start or choose mute.':'Audio could not be unlocked. Retry Start or choose mute.');this._notify();
   return result(false,outcome.reason,generation);
  });
  this.pending=pending;return pending;
 }
 claim(activation){
  if(this.destroyed||!activation?.ok||activation!==this.grant||activation.generation!==this.generation)return false;
  if(!this.engine.stats().muted&&(!this._prepared()||!this.engine.stats().running))return false;
  this.grant=null;this._notify();return true;
 }
 cancel(reason='cancelled'){
  if(this.destroyed)return;
  this.generation++;this.grant=null;const abort=this.abort;this.abort=null;this.pending=null;
  this.engine.suspend();this.status=this.engine.stats().muted?'muted':this._prepared()?'ready':'idle';this.error=null;
  if(abort)abort(reason);this._notify();
 }
 setMuted(muted){
  if(this.destroyed)return false;
  if(!!muted===!!this.engine.stats().muted)return !!muted;
  this.cancel('sound-setting-changed');this.engine.setMuted(!!muted);this.status=muted?'muted':this._prepared()?'ready':'idle';this._notify();return !!muted;
 }
 destroy(){
  if(this.destroyed)return Promise.resolve();
  this.cancel('destroyed');this.destroyed=true;this.status='destroyed';this._notify();return this.engine.destroy();
 }
}
const api=Object.freeze({create:options=>new Controller(options),Controller});
root.DeadFreightAudioPreparation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
