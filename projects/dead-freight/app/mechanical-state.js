/* Shared authoritative mechanical owner for existing non-R4 firearms; save shape remains compatible. */
(function(root){
'use strict';
const A=root.DFAmmo||(typeof require==='function'?require('./ammo-ledger.js'):null),EPS=1e-6,STEP=1/120;
const keys=['version','id','capacity','initialRounds','initialReserve','fireRecovery','cycleDelay','cycleRecovery','reloadDuration','perfectStart','perfectEnd','perfectRemaining','mistimePenalty','switchRecovery'];
function validateDefinition(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==keys.length||keys.some(k=>!Object.hasOwn(data,k))||data.version!==1||!['pistol','shotgun','smg'].includes(data.id))throw new TypeError('Invalid firearm definition');
 for(const key of ['capacity','initialRounds','initialReserve'])if(!Number.isSafeInteger(data[key])||data[key]<0)throw new RangeError('Invalid firearm '+key);
 if(data.capacity<1||data.capacity>100||data.initialRounds>data.capacity)throw new RangeError('Invalid firearm capacity');
 for(const key of keys.slice(5))if(!Number.isFinite(data[key])||data[key]<(data.id==='smg'&&['cycleDelay','cycleRecovery'].includes(key)?0:Number.EPSILON)||data[key]>10)throw new RangeError('Invalid firearm '+key);
 if(data.perfectStart>=data.perfectEnd||data.perfectEnd>=1||data.perfectRemaining>=data.reloadDuration)throw new RangeError('Invalid firearm reload window');
 return Object.freeze({...data});
}
const INDEX=Object.freeze({pistol:0,shotgun:1,smg:2});let runtime=0;
class MechanicalState {
 constructor({config,weaponInstanceId,sessionId,active=true}={}){
  this.config=validateDefinition(config);this.weaponIndex=INDEX[this.config.id];this.mode=this.config.id==='smg'?'auto':'semi';const serial=++runtime;this.weaponInstanceId=weaponInstanceId||this.config.id+'-'+serial;this.sessionId=sessionId||this.config.id+'-combat-'+serial;
  if(!A.validIdentity(this.weaponInstanceId)||!A.validIdentity(this.sessionId))throw new TypeError('Invalid firearm identity');
  this.rounds=this.config.initialRounds;this.reserve=this.config.initialReserve;this.cocked=true;this.cycling=false;this.cycleRemaining=0;this.deferredCycle=0;this.cooldown=0;this.reloadRemaining=0;this.reloadDuration=0;this.sequence=0;this.time=0;this.active=active;this.paused=false;this.events=[];this.journal=new A.ShotJournal();
 }
 get state(){return !this.active?'INACTIVE':this.paused?'PAUSED':this.reloadRemaining>EPS?'RELOADING':!this.cocked?'CYCLING':this.cooldown>EPS?'RECOVERING':'READY_HIP';}
 emit(type,data={}){this.events.push({type,weapon:this.weaponIndex,...data});}
 drainEvents(){return this.events.splice(0);}
 setRounds(value){if(!Number.isSafeInteger(value)||value<0||value>this.config.capacity)throw new RangeError('Invalid firearm rounds');this.rounds=value;}
 setReserve(value){if(!Number.isSafeInteger(value)||value<0)throw new RangeError('Invalid firearm reserve');this.reserve=value;}
 fire(){
  if(this.state!=='READY_HIP')return false;if(!this.rounds){this.emit('empty');return false;}
  const id=A.shotId(this.weaponInstanceId,this.sessionId,this.sequence+1);if(!this.journal.claim(id,'ammunition'))return false;
  this.sequence++;this.rounds--;this.cocked=this.config.cycleDelay===0;this.cycling=!this.cocked;this.cycleRemaining=this.config.cycleDelay;this.cooldown=this.config.fireRecovery;this.emit('shot',{shotId:id});return {shotId:id,sequence:this.sequence};
 }
 cycle(){if(!this.active||this.paused||this.cocked||this.reloadRemaining>EPS||this.cycleRemaining>EPS)return false;this.cocked=true;this.cycling=false;this.cycleRemaining=0;this.deferredCycle=0;this.cooldown=Math.max(this.cooldown,this.config.cycleRecovery);this.emit('cycle');return true;}
 load(){
  if(!this.active||this.paused)return false;
  if(this.reloadRemaining>EPS){const progress=1-this.reloadRemaining/this.reloadDuration;if(progress>this.config.perfectStart&&progress<this.config.perfectEnd){this.reloadRemaining=this.config.perfectRemaining;this.emit('perfect');return 'perfect';}this.reloadRemaining+=this.config.mistimePenalty;this.emit('mistime');return 'mistime';}
  if(this.rounds>=this.config.capacity||this.reserve<=0)return false;
  this.deferredCycle=this.cocked?0:this.cycleRemaining||this.config.cycleDelay;this.cycling=false;this.cycleRemaining=0;this.reloadRemaining=this.reloadDuration=this.config.reloadDuration;this.emit('reload');return 'reload';
 }
 cancelReload(reason='cancel'){if(this.reloadRemaining<=0)return false;this.reloadRemaining=0;this.reloadDuration=0;if(!this.cocked){this.cycling=true;this.cycleRemaining=this.deferredCycle||this.config.cycleDelay;}this.deferredCycle=0;this.emit('reloadcancel',{reason});return true;}
 activate(){this.active=true;}
 deactivate(reason='deactivate'){this.cancelReload(reason);this.active=false;}
 setPaused(value){this.paused=!!value;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0||!this.active||this.paused)return;let remaining=Math.min(.25,dt);while(remaining>1e-9){const step=Math.min(STEP,remaining);remaining-=step;this.time+=step;this.cooldown=Math.max(0,this.cooldown-step);
   if(this.cycling&&!this.reloadRemaining){this.cycleRemaining=Math.max(0,this.cycleRemaining-step);if(this.cycleRemaining<=EPS)this.cycle();}
   if(this.reloadRemaining>0){this.reloadRemaining=Math.max(0,this.reloadRemaining-step);if(this.reloadRemaining<=EPS){const transfer=Math.min(this.config.capacity-this.rounds,this.reserve);this.rounds+=transfer;this.reserve-=transfer;this.reloadRemaining=0;this.cocked=true;this.cycling=false;this.cycleRemaining=0;this.deferredCycle=0;this.emit('loaded',{transfer});}}
  }}
 exportInstance(){return {version:1,weaponId:this.config.id,weaponInstanceId:this.weaponInstanceId,mode:this.mode,shotSequence:this.sequence,recoveryRemaining:this.cooldown,reloadCheckpoint:null,cocked:this.cocked,cycleNeeded:!this.cocked,cycleRemaining:this.cocked?0:this.cycling?this.cycleRemaining:this.deferredCycle||this.config.cycleDelay};}
 restoreInstance(state,{rounds,reserve=this.reserve,sessionId=this.sessionId,active=false,paused=false}={}){
  const names=['version','weaponId','weaponInstanceId','mode','shotSequence','recoveryRemaining','reloadCheckpoint','cocked','cycleNeeded','cycleRemaining'];
  if(!state||Object.keys(state).length!==names.length||names.some(k=>!Object.hasOwn(state,k))||state.version!==1||state.weaponId!==this.config.id||state.mode!==this.mode||!A.validIdentity(state.weaponInstanceId)||!A.validIdentity(sessionId)||!Number.isSafeInteger(rounds)||rounds<0||rounds>this.config.capacity||!Number.isSafeInteger(reserve)||reserve<0||!Number.isSafeInteger(state.shotSequence)||state.shotSequence<0||!Number.isFinite(state.recoveryRemaining)||state.recoveryRemaining<0||typeof state.cocked!=='boolean'||typeof state.cycleNeeded!=='boolean'||state.cycleNeeded===state.cocked||!Number.isFinite(state.cycleRemaining)||state.cycleRemaining<0||state.cocked&&state.cycleRemaining!==0||state.reloadCheckpoint!==null||this.config.id==='smg'&&(!state.cocked||state.cycleNeeded))return false;
  this.weaponInstanceId=state.weaponInstanceId;this.sessionId=sessionId;this.rounds=rounds;this.reserve=reserve;this.sequence=state.shotSequence;this.cooldown=state.recoveryRemaining;this.cocked=state.cocked;this.cycling=state.cycleNeeded;this.cycleRemaining=state.cycleRemaining;this.deferredCycle=0;this.reloadRemaining=0;this.reloadDuration=0;this.active=active;this.paused=paused;this.events=[];return true;
 }
 snapshot(){return {state:this.state,rounds:this.rounds,reserve:this.reserve,cocked:this.cocked,cycleRemaining:this.cycleRemaining,recoveryRemaining:this.cooldown,reloadRemaining:this.reloadRemaining,weaponInstanceId:this.weaponInstanceId,shotSequence:this.sequence};}
}
const api={MechanicalState,validateDefinition,INDEX};root.DFMechanical=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
