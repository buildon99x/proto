/* Original deterministic assault-rifle model. No renderer, clocks or random globals. */
(function(root){
'use strict';
const INDEX=3,EPS=1e-8,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const RIFLE=Object.freeze({
 id:'r-4',name:'R-4',weapon:INDEX,magazineSize:30,initialMagazine:29,initialChamber:1,initialReserve:120,
 modes:Object.freeze(['auto','burst']),burstCount:3,interval:.10,burstInterval:.10,burstRecovery:.20,cycleTime:.045,
 switchTime:.35,sprintRecovery:.19,adsTime:.18,inputBuffer:.16,cancelRecovery:.25,
 hipSpread:.016,adsSpread:.0018,movingSpread:.010,airSpread:.026,recoilSpread:.012,recoilPerShot:.13,recoilRecovery:.48,
 damage:30,headMultiplier:2.6,limbMultiplier:.72,falloffStart:35,falloffEnd:100,minimumDamage:.55,maxRange:160,armorAbsorption:1,
 reload:Object.freeze({
  tactical:Object.freeze({duration:1.70,stages:Object.freeze([['eject',.22],['insert',1.02],['seat',1.27],['close',1.70]].map(Object.freeze))}),
  empty:Object.freeze({duration:2.20,stages:Object.freeze([['eject',.22],['insert',1.05],['seat',1.28],['charge',1.78],['close',2.20]].map(Object.freeze))}),
  chamber:Object.freeze({duration:.64,stages:Object.freeze([['charge',.36],['close',.64]].map(Object.freeze))})
 })
});
function configuration(overrides={}){
 const c={...RIFLE,...overrides,reload:RIFLE.reload,modes:RIFLE.modes};
 for(const key of ['magazineSize','initialMagazine','initialChamber','initialReserve','burstCount']){
  if(!Number.isInteger(c[key])||c[key]<0)throw new RangeError('Invalid rifle '+key);
 }
 if(c.magazineSize<1||c.initialMagazine>c.magazineSize||c.initialChamber>1||c.burstCount<1)throw new RangeError('Invalid rifle capacity');
 for(const key of ['interval','burstInterval','burstRecovery','cycleTime','switchTime','sprintRecovery','adsTime','inputBuffer','cancelRecovery','falloffEnd','maxRange'])if(!Number.isFinite(c[key])||c[key]<=0)throw new RangeError('Invalid rifle '+key);
 for(const key of ['hipSpread','adsSpread','movingSpread','airSpread','recoilSpread','recoilPerShot','recoilRecovery','damage','headMultiplier','limbMultiplier','falloffStart','minimumDamage','armorAbsorption'])if(!Number.isFinite(c[key])||c[key]<0)throw new RangeError('Invalid rifle '+key);
 if(c.minimumDamage>1||c.armorAbsorption>1||c.falloffEnd<=c.falloffStart||c.maxRange<c.falloffEnd||c.cycleTime>=Math.min(c.interval,c.burstInterval))throw new RangeError('Invalid rifle timing or ballistics');
 return Object.freeze(c);
}
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
class RifleState {
 constructor(options={}){
  this.config=configuration(options.config);this.seed=(options.seed??731)>>>0;this.time=0;
  this.magazine=this.config.initialMagazine;this.chamber=this.config.initialChamber;this.reserve=this.config.initialReserve;
  this.active=options.active!==false;this.paused=false;this.mode='auto';this.held=false;this.requireRelease=false;this.pendingUntil=-Infinity;this.burstRemaining=0;
  this.nextFireAt=0;this.switchUntil=0;this.recoverUntil=0;this.cycleAt=null;this.shots=0;this.ads=0;this.recoil=0;
  this.intent={sprint:false,ads:false,moving:false,airborne:false};this.reload=null;this.events=[];
 }
 get total(){return this.magazine+this.chamber;}
 get cooldown(){return Math.max(0,this.nextFireAt-this.time,this.switchUntil-this.time,this.recoverUntil-this.time);}
 get state(){if(!this.active)return 'holstered';if(this.paused)return 'paused';if(this.reload)return 'reloading';if(this.switchUntil>this.time+EPS)return 'switching';if(this.intent.sprint)return 'sprinting';if(this.recoverUntil>this.time+EPS)return 'sprint-recovery';if(this.nextFireAt>this.time+EPS)return 'firing';if(!this.chamber)return 'empty';return 'ready';}
 emit(type,data={}){this.events.push({type,weapon:INDEX,time:this.time,...data});}
 drainEvents(){return this.events.splice(0);}
 snapshot(){const r=this.reload;return {weapon:INDEX,name:this.config.name,state:this.state,mode:this.mode,magazine:this.magazine,magazineSize:this.config.magazineSize,chamber:this.chamber,total:this.total,reserve:this.reserve,boltLocked:!this.chamber,magazineInserted:!r||!r.ejected||r.inserted,ads:this.ads,recoil:this.recoil,shots:this.shots,cooldown:this.cooldown,burstRemaining:this.burstRemaining,reloadKind:r?.kind||null,reloadStage:r?.stage||null,reloadProgress:r?clamp((this.time-r.start)/r.duration,0,1):0,reloadRemaining:r?Math.max(0,r.start+r.duration-this.time):0,reloadDuration:r?.duration||0};}
 clearFireInput(reason='clear'){
  // Require release when interrupted while held; a per-frame held=true must not resurrect a burst.
  this.requireRelease=this.requireRelease||this.held;this.held=false;this.pendingUntil=-Infinity;this.burstRemaining=0;
  return reason;
 }
 setFireInput(held){
  held=!!held;if(!held){this.held=false;this.requireRelease=false;return false;}
  if(this.requireRelease||!this.active||this.paused)return false;
  const pressed=!this.held;this.held=true;if(pressed)this.requestTrigger();return pressed;
 }
 requestTrigger(){
  if(!this.active||this.paused||this.requireRelease)return false;
  if(this.burstRemaining>0)return false;
  this.pendingUntil=this.time+this.config.inputBuffer;
  if(!this.total&&!this.reload&&this.cooldown<=EPS){this.emit('empty');this.pendingUntil=-Infinity;}
  return true;
 }
 setIntent(input={}){
  const sprint=!!input.sprint;
  if(sprint&&!this.intent.sprint){
   const held=this.held,requireRelease=this.requireRelease;this.clearFireInput('sprint');this.cancelReload('sprint');this.ads=0;
   // Held automatic fire may resume after sprint recovery; old burst rounds never do.
   if(this.mode==='auto'){this.held=held;this.requireRelease=requireRelease;}
  }
  if(!sprint&&this.intent.sprint)this.recoverUntil=Math.max(this.recoverUntil,this.time+this.config.sprintRecovery);
  this.intent={sprint,ads:!!input.ads,moving:!!input.moving,airborne:!!input.airborne};
 }
 setMode(mode){if(!this.config.modes.includes(mode)||mode===this.mode||!this.active||this.paused||this.reload)return false;this.clearFireInput('mode');this.mode=mode;this.emit('mode',{mode});return true;}
 setPaused(paused){paused=!!paused;if(paused){this.clearFireInput('pause');this.ads=0;this.intent={sprint:false,ads:false,moving:false,airborne:false};}this.paused=paused;}
 activate(){this.active=true;this.clearFireInput('switch');this.switchUntil=this.time+this.config.switchTime;this.ads=0;return true;}
 deactivate(){this.clearFireInput('switch');this.cancelReload('switch');this.active=false;this.cycleAt=null;this.ads=0;this.intent={sprint:false,ads:false,moving:false,airborne:false};}
 addReserve(rounds){if(!Number.isFinite(rounds)||rounds<0)return false;this.reserve+=Math.floor(rounds);return true;}
 load(){
  if(!this.active||this.paused||this.reload||this.intent.sprint||this.switchUntil>this.time+EPS)return false;
  let kind;if(!this.chamber&&this.magazine>0)kind='chamber';else if(this.magazine<this.config.magazineSize&&this.reserve>0)kind=this.chamber?'tactical':'empty';else return false;
  const plan=this.config.reload[kind];this.clearFireInput('reload');this.ads=0;this.cycleAt=null;
  this.reload={kind,start:this.time,duration:plan.duration,stages:plan.stages,index:0,stage:'start',ejected:false,inserted:false};
  this.emit('reload',{kind,duration:plan.duration});return true;
 }
 cancelReload(reason='cancel'){
  if(!this.reload)return false;const cancelled=this.reload,kind=cancelled.kind;
  // Rounds transfer only at insert and charge. Cancelling never refunds a completed transfer.
  // A seated new magazine also retains its original ready deadline: cancel/switch cannot shortcut a reload.
  this.reload=null;this.nextFireAt=Math.max(this.nextFireAt,this.time+this.config.cancelRecovery,cancelled.inserted?cancelled.start+cancelled.duration:0);this.clearFireInput(reason);this.emit('reloadcancel',{kind,reason});return true;
 }
 shouldFire(){
  if(!this.active||this.paused||this.reload||this.intent.sprint||this.cooldown>EPS||!this.chamber)return null;
  const buffered=this.pendingUntil+EPS>=this.time,wanted=this.mode==='auto'?(this.held||buffered):(this.burstRemaining>0||buffered);
  if(!wanted)return null;
  const c=this.config,cone=(c.hipSpread+(c.adsSpread-c.hipSpread)*this.ads)+(this.intent.moving?c.movingSpread*(1-.55*this.ads):0)+(this.intent.airborne?c.airSpread:0)+this.recoil*c.recoilSpread;
  return Object.freeze({weapon:INDEX,id:this.shots+1,mode:this.mode,range:c.maxRange,pellets:1,ads:this.ads,spread:spreadSample(this.seed,this.shots,cone),recoil:Object.freeze({pitch:(.009+this.recoil*.006)*(1-.25*this.ads),yaw:(randomAt(this.seed,this.shots,2)-.5)*.008}),time:this.time});
 }
 fire(){
  const shot=this.shouldFire();if(!shot)return null;
  const c=this.config;
  if(this.mode==='burst'&&!this.burstRemaining)this.burstRemaining=c.burstCount;
  this.pendingUntil=-Infinity;this.chamber=0;if(this.magazine>0){this.magazine--;this.chamber=1;}
  this.shots++;this.recoil=clamp(this.recoil+c.recoilPerShot,0,1);
  if(this.mode==='burst')this.burstRemaining--;
  if(!this.chamber)this.burstRemaining=0;
  const interval=this.mode==='burst'?(this.burstRemaining?c.burstInterval:c.burstRecovery):c.interval;
  // Retain only one interval of timing debt. A stalled render cannot cause a catch-up avalanche.
  const previous=this.nextFireAt;this.nextFireAt=(this.time-previous<=interval+EPS?Math.max(previous,this.time-interval):this.time)+interval;
  if(this.nextFireAt<=this.time+EPS)this.nextFireAt=this.time+interval;
  this.cycleAt=this.time+c.cycleTime;this.emit('shot',{...shot,magazine:this.magazine,chamber:this.chamber});return shot;
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.paused)return;
  const start=this.time;this.time+=dt;
  this.recoil=Math.max(0,this.recoil-this.config.recoilRecovery*dt);
  if(this.cycleAt!==null&&this.time+EPS>=this.cycleAt){const at=this.cycleAt;this.cycleAt=null;this.emit('riflecycle',{at,boltLocked:!this.chamber});}
  const r=this.reload;
  if(r){while(r.index<r.stages.length&&this.time+EPS>=r.start+r.stages[r.index][1]){
   const [stage,at]=r.stages[r.index++];r.stage=stage;
   if(stage==='eject')r.ejected=true;
   if(stage==='insert'){const transfer=Math.min(this.config.magazineSize-this.magazine,this.reserve);this.magazine+=transfer;this.reserve-=transfer;r.inserted=true;}
   if(stage==='charge'&&!this.chamber&&this.magazine){this.magazine--;this.chamber=1;}
   this.emit('reloadstage',{kind:r.kind,stage,progress:at/r.duration,at:r.start+at});
  }
  if(this.time+EPS>=r.start+r.duration){this.reload=null;this.emit('loaded',{kind:r.kind});}}
  const canAim=this.active&&!this.reload&&!this.intent.sprint&&this.time+EPS>=this.switchUntil&&this.time+EPS>=this.recoverUntil;
  // If a gate opens inside a large step, count only the post-gate time toward ADS.
  const available=Math.max(0,this.time-Math.max(start,this.switchUntil,this.recoverUntil,r?r.start+r.duration:-Infinity));
  const target=canAim&&this.intent.ads?1:0,step=(target?available:dt)/this.config.adsTime;
  this.ads=target>this.ads?Math.min(target,this.ads+step):Math.max(target,this.ads-step);
 }
}
const API={RifleState,RIFLE,INDEX,spreadSample,damageAt,configuration};root.DFRifle=API;if(typeof module!=='undefined')module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
