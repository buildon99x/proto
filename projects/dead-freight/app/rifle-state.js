/* Deterministic rifle controller. JSON balance and AmmoLedger own authoritative resources. */
(function(root){
'use strict';
const definitions=root.DFWeaponDefinitions||(typeof require==='function'?require('./weapon-definitions.js'):null);
const ammoSource=root.DFAmmo||(typeof require==='function'?require('./ammo-ledger.js'):null);
if(!definitions||!ammoSource)throw new Error('Weapon definitions and ammo ledger must load before rifle-state.js');
const {AmmoLedger,ShotJournal,shotId,validIdentity}=ammoSource;
const INDEX=3,EPS=1e-8,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const configuration=definitions.configuration,RIFLE=configuration(),R4=configuration({},'r4');
let runtimeIdentity=0;
// Stateless indexed sample: peeking a ready shot never consumes randomness.
function randomAt(seed,index,salt){let n=(seed^Math.imul(index+1,0x9e3779b1)^Math.imul(salt+1,0x85ebca6b))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;}
function spreadSample(seed,index,cone){const r=Math.sqrt(randomAt(seed,index,0))*cone,a=randomAt(seed,index,1)*Math.PI*2;return Object.freeze({x:Math.cos(a)*r,y:Math.sin(a)*r,cone});}
function damageAt(distance=0,part='torso',armor=0,config=RIFLE){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const falloff=d>config.maxRange?0:1-clamp((d-config.falloffStart)/(config.falloffEnd-config.falloffStart),0,1)*(1-config.minimumDamage);
 const multiplier=part==='head'?config.headMultiplier:['limb','arm','leg'].includes(part)?config.limbMultiplier:1;
 const raw=config.damage*falloff*multiplier,armorDamage=Math.min(Math.max(0,Number.isFinite(armor)?armor:0),raw*config.armorAbsorption),damage=Math.max(0,raw-armorDamage);
 return {raw,damage,armorDamage,falloff,part,armored:armorDamage>EPS,stopped:raw>EPS&&damage<=EPS};
}
const instanceKeys=['version','weaponId','weaponInstanceId','magazine','chamber','mode','shotSequence','recoveryRemaining','reloadCheckpoint'];
function validateInstance(state,{weaponInstanceId,magazineSize=30}={}){
 if(!state||typeof state!=='object'||Array.isArray(state)||Object.keys(state).length!==instanceKeys.length||instanceKeys.some(k=>!Object.prototype.hasOwnProperty.call(state,k)))return false;
 if(state.version!==1||state.weaponId!=='r4'||!validIdentity(state.weaponInstanceId)||(weaponInstanceId!==undefined&&state.weaponInstanceId!==weaponInstanceId))return false;
 if(!Number.isSafeInteger(state.magazine)||state.magazine<0||state.magazine>magazineSize||![0,1].includes(state.chamber)||!['auto','burst','semi'].includes(state.mode)||!Number.isSafeInteger(state.shotSequence)||state.shotSequence<0||!Number.isFinite(state.recoveryRemaining)||state.recoveryRemaining<0)return false;
 const checkpoint=state.reloadCheckpoint;
 return checkpoint===null||!!(checkpoint&&typeof checkpoint==='object'&&!Array.isArray(checkpoint)&&Object.keys(checkpoint).sort().join(',')==='committed,kind'&&['tactical','empty','chamber'].includes(checkpoint.kind)&&typeof checkpoint.committed==='boolean');
}
class RifleState {
 constructor(options={}){
  this.config=configuration(options.config,options.definitionId);this.seed=(options.seed??731)>>>0;this.time=0;
  this.ledger=new AmmoLedger({magazineSize:this.config.magazineSize,magazine:this.config.initialMagazine,chamber:this.config.initialChamber,reserve:this.config.initialReserve});
  this.journal=options.journal||new ShotJournal();this.runtimeId=++runtimeIdentity;this.weaponInstanceId=options.weaponInstanceId||'rifle-'+this.runtimeId;this.sessionId=options.sessionId||'combat-'+this.runtimeId;
  if(!validIdentity(this.weaponInstanceId)||!validIdentity(this.sessionId))throw new TypeError('Invalid rifle identity');
  this.active=options.active!==false;this.paused=false;this.disabled=false;this.mode=this.config.modes[0];this.held=false;this.requireRelease=false;this.pendingUntil=-Infinity;this.pendingAt=-Infinity;this.burstRemaining=0;
  this.nextFireAt=0;this.switchUntil=0;this.recoverUntil=0;this.readyAt=0;this.cycleAt=null;this.cycles=[];this.shots=0;this.ads=0;this.recoil=0;this.blockedByWall=false;
  this.intent={sprint:false,ads:false,moving:false,airborne:false};this.reload=null;this.reloadCheckpoint=null;this.events=[];this.actionSequence=0;this._cadence=false;this._firedThisTick=0;
  this.autoReloadAt=this.active&&!this.total&&this.reserve>0&&this.config.autoReloadDelay!==null?this.time+this.config.autoReloadDelay:null;
 }
 // Compatibility setters still pass through the ledger. Gameplay uses commit/restore/setReserve.
 get magazine(){return this.ledger.magazine;}set magazine(n){this.ledger.reconcile({magazine:n},'fixture-magazine');}
 get chamber(){return this.ledger.chamber;}set chamber(n){this.ledger.reconcile({chamber:n},'fixture-chamber');}
 get reserve(){return this.ledger.reserve;}set reserve(n){this.ledger.reconcile({reserve:n},'fixture-reserve');}
 get total(){return this.magazine+this.chamber;}
 get cooldown(){return Math.max(0,this.nextFireAt-this.time,this.switchUntil-this.time,this.recoverUntil-this.time);}
 get state(){if(this.disabled)return 'disabled';if(!this.active)return 'holstered';if(this.paused)return 'paused';if(this.blockedByWall)return 'blocked-by-wall';if(this.reload)return 'reloading';if(this.switchUntil>this.time+EPS)return 'switching';if(this.intent.sprint)return 'sprinting';if(this.recoverUntil>this.time+EPS)return 'sprint-recovery';if(this.nextFireAt>this.time+EPS)return 'firing';if(!this.chamber)return 'empty';return 'ready';}
 emit(type,data={}){this.events.push({type,weapon:INDEX,time:this.time,weaponInstanceId:this.weaponInstanceId,sessionId:this.sessionId,...data});}
 drainEvents(){return this.events.splice(0);}
 snapshot(){const r=this.reload;return {weapon:INDEX,name:this.config.name,definitionId:this.config.definitionId,weaponInstanceId:this.weaponInstanceId,sessionId:this.sessionId,state:this.state,mode:this.mode,magazine:this.magazine,magazineSize:this.config.magazineSize,chamber:this.chamber,total:this.total,reserve:this.reserve,boltLocked:!this.chamber,magazineInserted:!r||!r.ejected||r.inserted,ads:this.ads,recoil:this.recoil,shots:this.shots,shotSequence:this.shots,cooldown:this.cooldown,burstRemaining:this.burstRemaining,blockedByWall:this.blockedByWall,autoReloadRemaining:this.autoReloadAt===null?0:Math.max(0,this.autoReloadAt-this.time),reloadKind:r?.kind||null,reloadStage:r?.stage||null,reloadCommitted:!!r?.committed,reloadProgress:r?clamp((this.time-r.start)/r.duration,0,1):0,reloadRemaining:r?Math.max(0,r.start+r.duration-this.time):0,reloadDuration:r?.duration||0};}
 bindIdentity({weaponInstanceId,sessionId=this.sessionId}={}){
  if(!validIdentity(weaponInstanceId)||!validIdentity(sessionId))return false;
  if(weaponInstanceId!==this.weaponInstanceId||sessionId!==this.sessionId){this.clearFireInput('identity');this.cancelReload('identity');this.clearCycles();this.events=[];}
  this.weaponInstanceId=weaponInstanceId;this.sessionId=sessionId;return true;
 }
 exportInstance(){
  const r=this.reload,checkpoint=r?{kind:r.kind,committed:r.committed}:this.reloadCheckpoint;
  const recovery=Math.max(this.cooldown,r?this.config.cancelRecovery:0,r?.committed?r.start+r.duration-this.time:0);
  return {version:1,weaponId:'r4',weaponInstanceId:this.weaponInstanceId,magazine:this.magazine,chamber:this.chamber,mode:this.mode,shotSequence:this.shots,recoveryRemaining:recovery,reloadCheckpoint:checkpoint?{...checkpoint}:null};
 }
 restoreInstance(state,{reserve=this.reserve,sessionId=this.sessionId,active=this.active}={}){
  if(!validateInstance(state,{magazineSize:this.config.magazineSize})||!this.config.modes.includes(state.mode)||!Number.isSafeInteger(reserve)||reserve<0||!validIdentity(sessionId)||typeof active!=='boolean')return false;
  // Validate every field before touching the currently bound weapon.
  try{this.ledger.validate({magazine:state.magazine,chamber:state.chamber,reserve});}catch(_){return false;}
  this.clearFireInput('restore');this.reload=null;this.clearCycles();this.events=[];this.weaponInstanceId=state.weaponInstanceId;this.sessionId=sessionId;
  this.ledger.reconcile({magazine:state.magazine,chamber:state.chamber,reserve},'instance-restore');this.mode=state.mode;this.shots=state.shotSequence;this.active=active;this.disabled=false;
  this.nextFireAt=this.time+state.recoveryRemaining;this.readyAt=this.nextFireAt;this.recoverUntil=0;this.switchUntil=0;this.ads=0;this.recoil=0;this.blockedByWall=false;this.reloadCheckpoint=state.reloadCheckpoint?{...state.reloadCheckpoint}:null;
  this.intent={sprint:false,ads:false,moving:false,airborne:false};this.autoReloadAt=active&&!this.total&&reserve>0&&this.config.autoReloadDelay!==null?this.time+this.config.autoReloadDelay:null;return true;
 }
 setReserve(rounds){if(!Number.isSafeInteger(rounds)||rounds<0)return false;try{return this.ledger.reconcile({reserve:rounds},'reserve-sync');}catch(_){return false;}}
 clearCycles(){this.cycles=[];this.cycleAt=null;}
 clearFireInput(reason='clear'){
  this.requireRelease=this.requireRelease||this.held;this.held=false;this.pendingUntil=-Infinity;this.pendingAt=-Infinity;this.burstRemaining=0;this._cadence=false;
  if(['dead','death','extracted','focus','blur'].includes(reason)){this.clearCycles();this.autoReloadAt=null;if(['dead','death','extracted'].includes(reason)){this.cancelReload(reason);this.active=false;this.disabled=true;}}
  return reason;
 }
 setFireInput(held){
  held=!!held;if(!held){this.held=false;this.requireRelease=false;if(this.mode!=='burst'||!this.burstRemaining)this._cadence=false;return false;}
  if(this.requireRelease||!this.active||this.paused||this.disabled)return false;
  const pressed=!this.held;this.held=true;if(pressed)this.requestTrigger();return pressed;
 }
 requestTrigger(){
  if(!this.active||this.paused||this.disabled||this.requireRelease)return false;
  if(this.burstRemaining>0)return false;
  if(this.reload&&this.config.cancelReloadOnTrigger&&this.reload.kind==='tactical'&&this.chamber){const held=this.held;this.cancelReload('trigger');this.requireRelease=false;this.held=held;this.pendingUntil=Math.max(this.time,this.nextFireAt)+this.config.inputBuffer;this.pendingAt=this.time;return true;}
  this.pendingUntil=this.time+this.config.inputBuffer;this.pendingAt=this.time;
  if(!this.total&&!this.reload&&this.cooldown<=EPS){this.emit('empty');this.pendingUntil=-Infinity;if(this.config.autoReloadDelay!==null&&this.reserve>0&&this.autoReloadAt===null)this.autoReloadAt=this.time+this.config.autoReloadDelay;}
  return true;
 }
 setBlocked(blocked){blocked=!!blocked;if(this.blockedByWall&&!blocked)this.readyAt=this.time;this.blockedByWall=blocked;if(blocked){this.ads=0;this._cadence=false;}return blocked;}
 setIntent(input={}){
  const sprint=!!input.sprint;
  if(sprint&&!this.intent.sprint){
   const held=this.held,requireRelease=this.requireRelease;this.clearFireInput('sprint');this.cancelReload('sprint');this.ads=0;
   if(this.mode==='auto'){this.held=held;this.requireRelease=requireRelease;}
  }
  if(!sprint&&this.intent.sprint)this.recoverUntil=Math.max(this.recoverUntil,this.time+this.config.sprintRecovery);
  if(Object.prototype.hasOwnProperty.call(input,'blockedByWall'))this.setBlocked(input.blockedByWall);
  this.intent={sprint,ads:!!input.ads,moving:!!input.moving,airborne:!!input.airborne,sliding:!!input.sliding};
 }
 setMode(mode){if(!this.config.modes.includes(mode)||mode===this.mode||!this.active||this.paused||this.disabled||this.reload)return false;this.clearFireInput('mode');this.mode=mode;this.emit('mode',{mode});return true;}
 setPaused(paused){paused=!!paused;if(paused){this.clearFireInput('pause');this.clearCycles();this.ads=0;this.intent={sprint:false,ads:false,moving:false,airborne:false};}else if(this.paused)this.readyAt=this.time;this.paused=paused;}
 activate(){this.active=true;this.disabled=false;this.clearFireInput('switch');this.switchUntil=this.time+this.config.switchTime;this.readyAt=this.switchUntil;this.ads=0;if(!this.total&&this.reserve>0&&this.config.autoReloadDelay!==null)this.autoReloadAt=this.time+this.config.autoReloadDelay;return true;}
 deactivate(){this.clearFireInput('switch');this.cancelReload('switch');this.active=false;this.clearCycles();this.autoReloadAt=null;this.ads=0;this.intent={sprint:false,ads:false,moving:false,airborne:false};}
 addReserve(rounds){if(!Number.isFinite(rounds)||rounds<0)return false;return this.setReserve(this.reserve+Math.floor(rounds));}
 load({automatic=false}={}){
  if(!this.active||this.paused||this.disabled||this.reload||this.intent.sprint||this.switchUntil>this.time+EPS)return false;
  let kind;if(!this.chamber&&this.magazine>0)kind='chamber';else if(this.magazine<this.config.magazineSize&&this.reserve>0)kind=this.chamber?'tactical':'empty';else return false;
  const plan=this.config.reload[kind];this.clearFireInput('reload');this.ads=0;this.clearCycles();this.autoReloadAt=null;
  this.reload={kind,start:this.time,duration:plan.duration,stages:plan.stages,plan,index:0,stage:'start',ejected:false,inserted:false,committed:false,charged:false,id:JSON.stringify([this.weaponInstanceId,this.sessionId,'reload',this.runtimeId,++this.actionSequence])};this.reloadCheckpoint=null;
  this.emit('reload',{kind,duration:plan.duration,automatic});return true;
 }
 cancelReload(reason='cancel'){
  if(!this.reload)return false;const cancelled=this.reload,kind=cancelled.kind;
  this.reload=null;this.reloadCheckpoint={kind,committed:cancelled.committed};
  const triggerCancel=reason==='trigger'&&this.config.cancelReloadOnTrigger&&kind==='tactical'&&this.chamber;
  this.nextFireAt=Math.max(this.nextFireAt,this.time+this.config.cancelRecovery,cancelled.committed&&!triggerCancel?cancelled.start+cancelled.duration:0);this.clearFireInput(reason);this.emit('reloadcancel',{kind,reason,committed:cancelled.committed});return true;
 }
 shouldFire(){
  if(!this.active||this.paused||this.disabled||this.blockedByWall||this.reload||this.intent.sprint||this.cooldown>EPS||!this.chamber||this._firedThisTick>=this.config.maxShotsPerTick)return null;
  const buffered=this.pendingUntil+EPS>=this.time,wanted=this.mode==='auto'?(this.held||buffered):this.mode==='burst'?(this.burstRemaining>0||buffered):buffered;
  if(!wanted)return null;
  const c=this.config,cone=(c.hipSpread+(c.adsSpread-c.hipSpread)*this.ads)+(this.intent.moving?c.movingSpread*(1-c.movingAdsReduction*this.ads):0)+(this.intent.airborne?c.airSpread:0)+this.recoil*c.recoilSpread;
  const continuing=this._cadence&&(this.held&&this.mode==='auto'||this.burstRemaining>0);
  const deadline=continuing?this.nextFireAt:Math.max(this.nextFireAt,this.readyAt,this.switchUntil,this.recoverUntil,Number.isFinite(this.pendingAt)?this.pendingAt:this.time);
  const scheduledTime=this.time-deadline>c.maxCatchUp+EPS?this.time:deadline;
  const sequence=this.shots+1,id=shotId(this.weaponInstanceId,this.sessionId,sequence);
  return Object.freeze({weapon:INDEX,id:sequence,shotId:id,weaponInstanceId:this.weaponInstanceId,sessionId:this.sessionId,shotSequence:sequence,mode:this.mode,range:c.maxRange,pellets:1,ads:this.ads,spread:spreadSample(this.seed,this.shots,cone),recoil:Object.freeze({pitch:(c.recoilPitch+this.recoil*c.recoilPitchBloom)*(1-c.recoilAdsScale*this.ads),yaw:(randomAt(this.seed,this.shots,2)-.5)*c.recoilYaw}),time:this.time,scheduledTime});
 }
 fire(command){
  const shot=this.shouldFire();if(!shot)return null;
  const requested=typeof command==='string'?command:command?.shotId;if(requested!==undefined&&requested!==shot.shotId)return null;
  if(this.journal.has(shot.shotId,'ammo')||!this.ledger.shot(shot.shotId))return null;
  this.journal.claim(shot.shotId,'ammo');const c=this.config;
  if(this.mode==='burst'&&!this.burstRemaining)this.burstRemaining=c.burstCount;
  this.pendingUntil=-Infinity;this.pendingAt=-Infinity;this.shots++;this._firedThisTick++;this.recoil=clamp(this.recoil+c.recoilPerShot,0,1);this.reloadCheckpoint=null;
  if(this.mode==='burst')this.burstRemaining--;if(!this.chamber)this.burstRemaining=0;
  const interval=this.mode==='burst'?(this.burstRemaining?c.burstInterval:c.burstRecovery):c.interval;
  // Accumulate the scheduled deadline, rather than rounding each shot up to the next tick.
  this.nextFireAt=shot.scheduledTime+interval;this._cadence=true;
  const cycle={at:this.time+c.cycleTime,shotId:shot.shotId};this.cycles.push(cycle);this.cycleAt=this.cycles[0].at;
  if(!this.total&&this.reserve>0&&c.autoReloadDelay!==null)this.autoReloadAt=this.time+c.autoReloadDelay;
  this.emit('shot',{...shot,magazine:this.magazine,chamber:this.chamber});return shot;
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.paused||this.disabled)return;
  if(this.config.maxDelta!==null&&dt>this.config.maxDelta){this.clearFireInput('focus');dt=this.config.maxDelta;}
  const start=this.time;this.time+=dt;this._firedThisTick=0;
  this.recoil=Math.max(0,this.recoil-this.config.recoilRecovery*dt);
  if(this.active){while(this.cycles.length&&this.time+EPS>=this.cycles[0].at){const cycle=this.cycles.shift();this.emit('riflecycle',{...cycle,boltLocked:!this.chamber});}}else this.clearCycles();this.cycleAt=this.cycles[0]?.at??null;
  const r=this.reload;
  if(r){
   // Resource checkpoints are independent of visual keyframes and each has one ledger identity.
   if(!r.committed&&r.plan.transferAt!==null&&this.time+EPS>=r.start+r.plan.transferAt){const entry=this.ledger.reload(r.id+':transfer');if(entry){r.committed=true;this.emit('reloadcommit',{kind:r.kind,commitId:entry.id,at:r.start+r.plan.transferAt,magazine:this.magazine,chamber:this.chamber,reserve:this.reserve});}}
   if(!r.charged&&r.plan.chamberAt!==null&&this.time+EPS>=r.start+r.plan.chamberAt){const entry=this.ledger.chamberRound(r.id+':chamber');r.charged=true;if(entry){r.committed=true;this.emit('chambercommit',{kind:r.kind,commitId:entry.id,at:r.start+r.plan.chamberAt});}}
   while(r.index<r.stages.length&&this.time+EPS>=r.start+r.stages[r.index][1]){
    const [stage,at]=r.stages[r.index++];r.stage=stage;if(stage==='eject')r.ejected=true;if(stage==='insert')r.inserted=true;
    this.emit('reloadstage',{kind:r.kind,stage,progress:at/r.duration,at:r.start+at});
   }
   if(this.time+EPS>=r.start+r.duration){this.reload=null;this.reloadCheckpoint=null;this.readyAt=r.start+r.duration;this.emit('loaded',{kind:r.kind});}
  }
  if(this.config.autoReloadDelay!==null&&this.active&&!this.reload&&!this.total&&this.reserve>0&&!this.intent.sprint){
   if(this.autoReloadAt===null)this.autoReloadAt=this.time+this.config.autoReloadDelay;
   if(this.time+EPS>=this.autoReloadAt)this.load({automatic:true});
  }
  const canAim=this.active&&!this.intent.airborne&&!this.intent.sliding&&!this.blockedByWall&&!this.reload&&!this.intent.sprint&&this.time+EPS>=this.switchUntil&&this.time+EPS>=this.recoverUntil;
  const available=Math.max(0,this.time-Math.max(start,this.switchUntil,this.recoverUntil,r?r.start+r.duration:-Infinity));
  const target=canAim&&this.intent.ads?1:0,step=(target?available:dt)/this.config.adsTime;
  this.ads=target>this.ads?Math.min(target,this.ads+step):Math.max(target,this.ads-step);
 }
}
const API={RifleState,RIFLE,R4,INDEX,spreadSample,damageAt,configuration,validateInstance,AmmoLedger,ShotJournal};root.DFRifle=API;if(typeof module!=='undefined')module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
