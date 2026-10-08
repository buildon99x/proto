/* Original extraction prototype. No game assets or game code used. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const EPS=1e-6;
const MOVEMENT=Object.freeze({radius:.38,height:1.75,eyeHeight:1.62,slideHeight:.72,slideEyeHeight:.58,jumpSpeed:6.9,gravity:19,slideCost:28,slideDuration:.8,slideSpeed:12.8,slideFriction:12,slideCooldown:1.4,maxMoveStep:.14,simulationStep:1/120,walkSpeed:4.8,sprintSpeed:7.5,aimSpeed:2.8,fatiguedSpeed:2.8,walkDrain:2,sprintDrain:10,restRecovery:24,jumpCost:10,fatigueRecovery:18});
const CYCLE=Object.freeze([{delay:.12,recovery:.19},{delay:.26,recovery:.28},null]);
// Exact slab intersection, including zero-length segments and axis-parallel shots.
function segmentBox(ax,ay,az,bx,by,bz,minX,minY,minZ,maxX,maxY,maxZ){
 let enter=0,exit=1;
 for(const [a,b,min,max] of [[ax,bx,minX,maxX],[ay,by,minY,maxY],[az,bz,minZ,maxZ]]){
  const d=b-a;if(Math.abs(d)<EPS){if(a<min||a>max)return null;continue;}
  let t0=(min-a)/d,t1=(max-a)/d;if(t0>t1)[t0,t1]=[t1,t0];enter=Math.max(enter,t0);exit=Math.min(exit,t1);if(enter>exit)return null;
 }
 return enter;
}
let rifleSource=root.DFRifle;
if(!rifleSource&&typeof require==='function'){try{rifleSource=require('./rifle-state.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND'||!e.message.includes("'./rifle-state.js'"))throw e;}}
let regionSource=root.DFWorld;
if(!regionSource&&typeof require==='function'){try{regionSource=require('./world.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND'||!e.message.includes("'./world.js'"))throw e;}}
class Mission {
 constructor(level=1,difficulty=1,seed=731,options={}){
  this.level=level;this.difficulty=difficulty;this.seed=seed;
  this.player={x:0,z:24,y:0,velocityY:0,grounded:true,bodyHeight:MOVEMENT.height,eyeHeight:MOVEMENT.eyeHeight,crouched:false,hp:100,armor:0,stamina:100,fatigued:false,dash:0,invulnerable:0,slide:0,slideCooldown:0,slideSpeed:0,slideDirX:0,slideDirZ:0};
  this.movementIntent={moving:false,sprint:false,aiming:false};
  this.walls=[];this.enemies=[];this.pickups=[];this.particles=[];this.events=[];this.projectiles=[];
  this.time=0;this.kills=0;this.bounty=false;this.extracted=false;this.shots=0;this.hits=0;this.destroyed=0;this.cash=0;this.cargo=0;
  this.rifle=rifleSource?new rifleSource.RifleState({seed,active:false,config:options.rifleConfig}):null;this.paused=false;
  this.weapon=0;this.ammo=[6,2,24,this.rifle?.total||0];this.reserve=[72,24,144,this.rifle?.reserve||0];this.cocked=true;this.reload=0;this.cooldown=0;this.cycleDelay=0;this.cycleWeapon=null;
  this.combo=0;this.comboTimer=0;this.style=0;this.perfect=0;this.reloadDuration=0;
  this.extractionZones=[{id:'south',name:'SOUTH LZ',x:0,z:25,radius:3.5,holdTime:6}];this.extractionZone=null;this.extractionProgress=0;this.extractionRequired=6;
  this._grid=new Map();this._indexedWalls=null;this._indexedCount=-1;this._gridDirty=true;
  if(options.world!==false&&regionSource?.populate)regionSource.populate(this);else this.build();
  // Armor belongs to the encounter, including when the rifle is equipped later.
  for(const enemy of this.enemies)enemy.armor??=enemy.boss?60:0;
  this.extractions=this.extractionZones;this.rebuildSpatialIndex();
  if(options.weapon===3)this.switchWeapon(3);
 }
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 wall(x,z,w,d,h,kind='concrete',destructible=false,y=0){const o={id:this.walls.length,x,z,w,d,h,y,kind,hp:destructible?75:Infinity,alive:true};this.walls.push(o);this._gridDirty=true;return o;}
 build(){
  // Compact legacy fixture retained for deterministic weapon/regression tests.
  this.wall(-25,0,2,66,8,'boundary');this.wall(25,0,2,66,8,'boundary');this.wall(0,33,50,2,8,'boundary');this.wall(0,-33,50,2,8,'boundary');
  for(const [x,z,w,d] of [[-12,10,9,4],[14,11,8,5],[-12,-4,13,3],[13,-11,10,4],[-12,-22,8,6],[12,-26,6,4]])this.wall(x,z,w,d,2.5,'rock');
  for(let x=-5;x<=3;x+=2)this.wall(x,-7,2,1.2,2.6,'wood',true);
  for(const [x,z] of [[-7,19],[7,16],[-17,4],[18,-3],[-5,-17],[8,-19]])this.wall(x,z,.75,.75,10,'trunk');
  for(const [x,z] of [[3,4],[-8,-11],[13,-17]])this.pickups.push({type:'barrel',x,z,hp:25,alive:true});
  const spots=[[-5,8],[9,4],[-13,-7],[11,-10],[-7,-17],[9,-24],[0,-27]];
  spots.forEach(([x,z],i)=>this.enemies.push({id:i,x,z,hp:i===6?150:70,boss:i===6,alive:true,attack:1+this.rand()*2,windup:0,alert:false,phase:this.rand()*6,hit:0}));
  this.pickups.push({type:'health',x:-18,z:0,alive:true},{type:'ammo',x:17,z:-3,alive:true},{type:'health',x:-12,z:-24,alive:true});
 }
 rebuildSpatialIndex(){
  this._grid.clear();const size=8;
  for(const w of this.walls){for(let gx=Math.floor((w.x-w.w/2)/size);gx<=Math.floor((w.x+w.w/2)/size);gx++)for(let gz=Math.floor((w.z-w.d/2)/size);gz<=Math.floor((w.z+w.d/2)/size);gz++){const key=gx+','+gz;if(!this._grid.has(key))this._grid.set(key,[]);this._grid.get(key).push(w);}}
  this._indexedWalls=this.walls;this._indexedCount=this.walls.length;this._gridDirty=false;
 }
 wallCandidates(minX,minZ,maxX,maxZ){
  if(this._gridDirty||this._indexedWalls!==this.walls||this._indexedCount!==this.walls.length)this.rebuildSpatialIndex();
  const out=new Set();for(let gx=Math.floor(minX/8);gx<=Math.floor(maxX/8);gx++)for(let gz=Math.floor(minZ/8);gz<=Math.floor(maxZ/8);gz++)for(const w of this._grid.get(gx+','+gz)||[])if(w.alive)out.add(w);return out;
 }
 blocked(x,z,r=MOVEMENT.radius,y=this.player.y,height=this.player.bodyHeight){
  for(const w of this.wallCandidates(x-r,z-r,x+r,z+r))if(y+height>(w.y||0)+EPS&&y<(w.y||0)+w.h-EPS&&x>w.x-w.w/2-r+EPS&&x<w.x+w.w/2+r-EPS&&z>w.z-w.d/2-r+EPS&&z<w.z+w.d/2+r-EPS)return true;return false;
 }
 setMovementIntent(intent={}){this.movementIntent={moving:!!intent.moving,sprint:!!intent.sprint,aiming:!!intent.aiming};}
 movementSprinting(){const p=this.player,i=this.movementIntent;return i.moving&&i.sprint&&!i.aiming&&!p.fatigued&&p.stamina>EPS&&p.dash<=0&&p.slide<=0;}
 movementSpeed({aiming=this.movementIntent.aiming}={}){const p=this.player;if(p.dash>0)return 18;if(p.fatigued||p.stamina<=EPS)return Math.min(MOVEMENT.fatiguedSpeed,aiming?MOVEMENT.aimSpeed:Infinity);if(aiming)return MOVEMENT.aimSpeed;return this.movementSprinting()?MOVEMENT.sprintSpeed:MOVEMENT.walkSpeed;}
 consumeStamina(amount){const p=this.player;p.stamina=clamp(p.stamina-amount,0,100);if(p.stamina<=EPS){p.stamina=0;p.fatigued=true;}}
 move(dx,dz){
  const p=this.player;if(p.hp<=0||this.extracted||this.paused||!Number.isFinite(dx)||!Number.isFinite(dz))return {dx:0,dz:0,blockedX:false,blockedZ:false};
  const staminaSpeed=this.movementSpeed(),staminaRate=this.movementSprinting()?MOVEMENT.sprintDrain:MOVEMENT.walkDrain;
  const x=p.x,z=p.z,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/MOVEMENT.maxMoveStep));let blockedX=false,blockedZ=false;
  for(let i=0;i<steps;i++){const sx=dx/steps,sz=dz/steps;if(!this.blocked(p.x+sx,p.z))p.x+=sx;else blockedX=true;if(!this.blocked(p.x,p.z+sz))p.z+=sz;else blockedZ=true;}
  // Charge actual displacement, not held keys: pushing a solid wall cannot drain walking stamina.
  // At the commanded movement speed these rates are per-second; collision/partial motion costs proportionately less.
  if(this.movementIntent.moving&&p.slide<=0&&p.dash<=0)this.consumeStamina(Math.hypot(p.x-x,p.z-z)*staminaRate/staminaSpeed);
  if(this.extractionZone&&Math.hypot(p.x-this.extractionZone.x,p.z-this.extractionZone.z)>this.extractionZone.radius)this.cancelExtraction('left');
  return {dx:p.x-x,dz:p.z-z,blockedX,blockedZ};
 }
 wallHit(ax,ay,az,bx,by,bz,r=.02){
  let nearest=null;for(const w of this.wallCandidates(Math.min(ax,bx)-r,Math.min(az,bz)-r,Math.max(ax,bx)+r,Math.max(az,bz)+r)){
   const y=w.y||0,t=segmentBox(ax,ay,az,bx,by,bz,w.x-w.w/2-r,y-r,w.z-w.d/2-r,w.x+w.w/2+r,y+w.h+r,w.z+w.d/2+r);if(t!==null&&(nearest===null||t<nearest))nearest=t;
  }return nearest;
 }
 segmentWall(ax,az,bx,bz,ay=1.3,by=ay){return this.wallHit(ax,ay,az,bx,by,bz)!==null;}
 dash(){const p=this.player;if(p.stamina<45||p.dash>0||p.slide>0||p.hp<=0||this.extracted||this.paused)return false;this.consumeStamina(45);p.dash=.2;p.invulnerable=.15;this.emit('dash');return true;}
 jump(){const p=this.player;if(p.hp<=0||this.extracted||this.paused||p.stamina<MOVEMENT.jumpCost||!p.grounded||p.slide>0||this.blocked(p.x,p.z,MOVEMENT.radius,p.y,MOVEMENT.height))return false;this.consumeStamina(MOVEMENT.jumpCost);p.velocityY=MOVEMENT.jumpSpeed;p.grounded=false;this.emit('jump');return true;}
 slide(dx,dz){
  const p=this.player,len=Math.hypot(dx,dz);if(p.hp<=0||this.extracted||this.paused||!p.grounded||p.slide>0||p.slideCooldown>0||p.stamina<MOVEMENT.slideCost||p.dash>0||!Number.isFinite(len)||len<.001)return false;
  this.consumeStamina(MOVEMENT.slideCost);p.slide=MOVEMENT.slideDuration;p.slideCooldown=MOVEMENT.slideCooldown;p.slideSpeed=MOVEMENT.slideSpeed;p.slideDirX=dx/len;p.slideDirZ=dz/len;p.bodyHeight=MOVEMENT.slideHeight;p.eyeHeight=MOVEMENT.slideEyeHeight;p.crouched=true;this.emit('slide',{dx:p.slideDirX,dz:p.slideDirZ});return true;
 }
 posture(){const p=this.player,low=p.slide>0||this.blocked(p.x,p.z,MOVEMENT.radius,p.y,MOVEMENT.height);p.crouched=low;p.bodyHeight=low?MOVEMENT.slideHeight:MOVEMENT.height;p.eyeHeight=low?MOVEMENT.slideEyeHeight:MOVEMENT.eyeHeight;}
 vertical(dt){
  const p=this.player,old=p.y;let support=0,ceiling=Infinity;
  for(const w of this.wallCandidates(p.x-MOVEMENT.radius,p.z-MOVEMENT.radius,p.x+MOVEMENT.radius,p.z+MOVEMENT.radius)){
   if(p.x<=w.x-w.w/2-MOVEMENT.radius+EPS||p.x>=w.x+w.w/2+MOVEMENT.radius-EPS||p.z<=w.z-w.d/2-MOVEMENT.radius+EPS||p.z>=w.z+w.d/2+MOVEMENT.radius-EPS)continue;
   const base=w.y||0,top=base+w.h;if(top<=old+EPS)support=Math.max(support,top);if(base>=old+p.bodyHeight-EPS)ceiling=Math.min(ceiling,base-p.bodyHeight);
  }
  if(p.grounded&&old>support+EPS)p.grounded=false;
  if(!p.grounded){const impact=p.velocityY;p.y+=p.velocityY*dt-.5*MOVEMENT.gravity*dt*dt;p.velocityY-=MOVEMENT.gravity*dt;
   if(p.y>ceiling){p.y=ceiling;p.velocityY=Math.min(0,p.velocityY);}
   if(p.velocityY<=0&&p.y<=support+EPS){p.y=support;p.velocityY=0;p.grounded=true;this.emit('land',{speed:Math.abs(impact)});}
  }else{p.y=support;p.velocityY=0;}
 }
 reward(points){this.combo++;this.comboTimer=4;this.style+=Math.round(points*(1+Math.min(4,this.combo)*.25));}
 emit(type,data={}){this.events.push({type,...data});}
 damage(n){if(this.player.hp<=0||this.player.invulnerable>0||this.extracted)return;this.combo=0;this.comboTimer=0;const shield=Math.min(this.player.armor,n*.65);this.player.armor-=shield;this.player.hp=Math.max(0,this.player.hp-(n-shield));this.emit('hurt',{amount:n});if(this.player.hp<=0){this.cancelExtraction('dead');this.player.slide=0;this.player.slideSpeed=0;this.clearFireInput('dead');}}
 syncRifle(){
  if(!this.rifle)return;const r=this.rifle.snapshot();this.ammo[3]=r.total;this.reserve[3]=r.reserve;
  if(this.weapon===3){this.reload=r.reloadRemaining;this.reloadDuration=r.reloadDuration;this.cooldown=r.cooldown;this.cocked=!!r.chamber;}
  for(const event of this.rifle.drainEvents())this.events.push(event);
 }
 setFireInput(held){if(!held){this.rifle?.setFireInput(false);return false;}return this.weapon===3&&this.player.hp>0&&!this.extracted?this.rifle.setFireInput(true):false;}
 requestTrigger(){if(this.weapon!==3||this.player.hp<=0||this.extracted)return false;const accepted=this.rifle.requestTrigger();this.syncRifle();return accepted;}
 clearFireInput(reason='clear'){this.rifle?.clearFireInput(reason);}
 setWeaponIntent(intent={}){if(this.weapon===3){this.rifle.setIntent(intent);this.syncRifle();}}
 setFireMode(mode){if(this.weapon!==3||this.player.hp<=0||this.extracted)return false;const changed=this.rifle.setMode(mode);this.syncRifle();return changed;}
 setPaused(paused){this.paused=!!paused;if(this.paused)this.setMovementIntent({});this.rifle?.setPaused(paused);this.syncRifle();}
 shouldFire(){return this.weapon===3&&this.player.hp>0&&!this.extracted&&!this.paused?this.rifle.shouldFire():null;}
 cycle(){
  if(this.weapon===3)return false;
  if(this.cocked||this.reload>0||this.cycleDelay>EPS||this.player.hp<=0||this.extracted)return false;
  const weapon=this.cycleWeapon??this.weapon;this.cocked=true;this.cycleDelay=0;this.cycleWeapon=null;this.cooldown=Math.max(this.cooldown,CYCLE[weapon]?.recovery||.19);this.emit('cycle',{weapon});return true;
 }
 load(){
  if(this.player.hp<=0||this.extracted||this.paused)return false;
  if(this.weapon===3){const accepted=this.rifle.load();this.syncRifle();return accepted;}
  if(this.reload>0){const progress=1-this.reload/this.reloadDuration;if(progress>.44&&progress<.62){this.reload=.04;this.perfect=3;this.reward(45);this.emit('perfect');}else{this.reload+=.35;this.emit('mistime');}return true;}
  if(this.ammo[this.weapon]>=[6,2,24][this.weapon]||this.reserve[this.weapon]<=0)return false;
  this.cycleDelay=0;this.cycleWeapon=null;this.reload=this.reloadDuration=[1.6,1.9,2][this.weapon];this.emit('reload',{weapon:this.weapon});return true;
 }
 switchWeapon(n){
  if(!Number.isInteger(n)||n<0||n>3||n===this.weapon||this.player.hp<=0||this.extracted||this.paused||(n===3&&!this.rifle))return false;
  if(this.weapon===3)this.rifle.deactivate();else this.clearFireInput('switch');
  this.weapon=n;this.reload=0;this.reloadDuration=0;this.cycleDelay=0;this.cycleWeapon=null;this.cocked=true;this.cooldown=.25;
  if(n===3)this.rifle.activate();this.syncRifle();this.emit('switch',{weapon:n});return true;
 }
 fire(hit){
  if(this.weapon===3)return this.fireRifle(hit);
  if(this.paused)return false;
  if(this.player.hp<=0||this.extracted||this.reload>0||this.cooldown>EPS||!this.cocked)return false;if(!this.ammo[this.weapon]){this.emit('empty');return false;}
  this.ammo[this.weapon]--;this.shots++;this.cooldown=[.2,.4,.1][this.weapon];if(this.weapon<2){this.cocked=false;this.cycleDelay=CYCLE[this.weapon].delay;this.cycleWeapon=this.weapon;}this.emit('shot',{weapon:this.weapon});
  if(hit){this.hits++;if(hit.kind==='enemy'){const e=this.enemies[hit.id];if(e?.alive){e.hp-=([48,105,21][this.weapon])*(hit.head?2.5:1)*(this.perfect>0?1.3:1);e.hit=.16;e.alert=true;this.emit('blood',{x:e.x,z:e.z,head:hit.head});if(e.hp<=0)this.kill(e,hit.head?150:80);}}
   if(hit.kind==='wall'){const w=this.walls[hit.id];if(w?.alive&&Number.isFinite(w.hp)){w.hp-=[40,90,19][this.weapon];if(w.hp<=0){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}}}
   if(hit.kind==='barrel'){const b=this.pickups[hit.id];if(b?.alive){b.hp-=50;if(b.hp<=0)this.explode(b);}}
  }return true;
 }
 fireRifle(hit){
  if(this.player.hp<=0||this.extracted||this.paused)return false;
  const shot=this.rifle.fire();if(!shot)return false;this.shots++;this.syncRifle();
  if(!hit)return true;
  const part=hit.part||(hit.head?'head':'torso'),head=part==='head';
  if(hit.kind==='enemy'){
   const e=this.enemies[hit.id];if(!e?.alive)return true;
   // Body armor does not protect a bare head. Explicit armor coverage can override it.
   const armorKey=head?'helmet':'armor',covered=hit.armored!==false,armor=covered?(Number.isFinite(e[armorKey])?e[armorKey]:0):0;
   const result=rifleSource.damageAt(hit.distance,part,armor,this.rifle.config);
   if(result.raw<=0)return true;this.hits++;if(result.armorDamage>0)e[armorKey]=Math.max(0,armor-result.armorDamage);e.hp-=result.damage;e.hit=.16;e.alert=true;
   this.emit('impact',{weapon:3,kind:'enemy',id:e.id,x:e.x,z:e.z,head,...result});
   if(result.armorDamage>0)this.emit('armorhit',{weapon:3,id:e.id,damage:result.armorDamage,stopped:result.stopped,part,head});
   if(result.damage>0)this.emit('blood',{weapon:3,x:e.x,z:e.z,head,part,damage:result.damage});
   if(e.hp<=0)this.kill(e,head?150:80);
  }else if(hit.kind==='wall'){
   const w=this.walls[hit.id];if(!w?.alive)return true;const result=rifleSource.damageAt(hit.distance,'torso',0,this.rifle.config);if(!result.raw)return true;this.hits++;
   this.emit('impact',{weapon:3,kind:'wall',id:w.id,...result});if(Number.isFinite(w.hp)){w.hp-=result.damage;if(w.hp<=0){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}}
  }else if(hit.kind==='barrel'){
   const b=this.pickups[hit.id];if(!b?.alive)return true;const result=rifleSource.damageAt(hit.distance,'torso',0,this.rifle.config);if(!result.raw)return true;this.hits++;
   this.emit('impact',{weapon:3,kind:'barrel',id:hit.id,...result});b.hp-=result.damage;if(b.hp<=0)this.explode(b);
  }
  return true;
 }
 kill(e,points=0){e.alive=false;this.kills++;if(points)this.reward(points);this.cash+=e.boss?750:70;this.emit('kill',{id:e.id,x:e.x,z:e.z,boss:e.boss});if(e.boss)this.pickups.push({type:'bounty',x:e.x,z:e.z,y:e.y||0,alive:true});}
 explode(b){
  b.alive=false;this.emit('explosion',{x:b.x,z:b.z});for(const e of this.enemies)if(e.alive&&Math.hypot(e.x-b.x,e.z-b.z)<6){e.hp-=140;e.alert=true;if(e.hp<=0)this.kill(e);}
  for(const w of this.wallCandidates(b.x-5,b.z-5,b.x+5,b.z+5))if(Number.isFinite(w.hp)&&Math.hypot(w.x-b.x,w.z-b.z)<5){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}
  if(Math.hypot(this.player.x-b.x,this.player.z-b.z,this.player.y-(b.y||0))<5)this.damage(25);
 }
 nearExtraction(){const p=this.player;return this.extractionZones.find(zone=>Math.hypot(p.x-zone.x,p.z-zone.z)<=zone.radius)||null;}
 cancelExtraction(reason='left'){if(!this.extractionZone)return;const zone=this.extractionZone;this.extractionZone=null;this.extractionProgress=0;this.emit('extractioncancel',{id:zone.id,reason});}
 interact(){
  const p=this.player;if(p.hp<=0||this.extracted)return false;let changed=false;
  for(const item of this.pickups){if(!item.alive||Math.hypot(p.x-item.x,p.z-item.z)>2.5||Math.abs(p.y-(item.y||0))>2||item.type==='barrel')continue;
   if((item.type==='health'&&p.hp>=100)||(item.type==='armor'&&p.armor>=100))continue;
   item.alive=false;changed=true;if(item.type==='health')p.hp=clamp(p.hp+45,0,100);if(item.type==='armor')p.armor=clamp(p.armor+45,0,100);if(item.type==='ammo'){for(let i=0;i<3;i++)this.reserve[i]+=[24,8,60][i];this.rifle?.addReserve(90);this.syncRifle();}if(item.type==='bounty')this.bounty=true;if(item.type==='cargo'){this.cargo++;this.cash+=item.value??150;}this.emit('pickup',{kind:item.type,value:item.value||0});
  }
  const zone=this.nearExtraction();if(zone&&this.bounty&&!this.extractionZone){this.extractionZone=zone;this.extractionProgress=0;this.extractionRequired=zone.holdTime||6;this.emit('extractionstart',{id:zone.id,duration:this.extractionRequired});changed=true;}return changed;
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0||this.paused)return;if(this.player.hp<=0){this.cancelExtraction('dead');this.clearFireInput('dead');return;}if(this.extracted){this.clearFireInput('extracted');return;}
  // Integrate frame time in bounded physics steps; the presentation already clamps stalls.
  let remaining=Math.min(.25,dt);while(remaining>EPS&&this.player.hp>0&&!this.extracted){const step=Math.min(MOVEMENT.simulationStep,remaining);this.step(step);remaining-=step;}
 }
 step(dt){
  const p=this.player;this.time+=dt;const resting=!this.movementIntent.moving&&p.slide<=0&&p.dash<=0&&p.grounded;if(resting)p.stamina=clamp(p.stamina+dt*MOVEMENT.restRecovery,0,100);if(p.stamina<=EPS)p.fatigued=true;else if(p.stamina>=MOVEMENT.fatigueRecovery-EPS)p.fatigued=false;p.dash=Math.max(0,p.dash-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.slideCooldown=Math.max(0,p.slideCooldown-dt);
  if(p.slide>0){const t=Math.min(dt,p.slide),speed=Math.max(0,p.slideSpeed-MOVEMENT.slideFriction*t),distance=(p.slideSpeed+speed)*.5*t;const moved=this.move(p.slideDirX*distance,p.slideDirZ*distance);p.slideSpeed=speed;p.slide=Math.max(0,p.slide-t);if(Math.hypot(moved.dx,moved.dz)<distance*.2){p.slide=0;p.slideSpeed=0;}if(!p.slide)this.emit('slideend');}
  this.posture();this.vertical(dt);this.posture();
  this.perfect=Math.max(0,this.perfect-dt);this.comboTimer=Math.max(0,this.comboTimer-dt);if(!this.comboTimer)this.combo=0;if(this.rifle){this.rifle.tick(dt);this.syncRifle();}if(this.weapon!==3)this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.cycleWeapon!==null&&!this.reload){this.cycleDelay=Math.max(0,this.cycleDelay-dt);if(this.cycleDelay<=EPS)this.cycle();}
  if(this.weapon!==3&&this.reload>0){this.reload=Math.max(0,this.reload-dt);if(this.reload<=EPS){this.reload=0;const n=Math.min([6,2,24][this.weapon]-this.ammo[this.weapon],this.reserve[this.weapon]);this.ammo[this.weapon]+=n;this.reserve[this.weapon]-=n;this.cocked=true;this.emit('loaded',{weapon:this.weapon});}}
  for(const e of this.enemies){
   if(!e.alive)continue;e.hit=Math.max(0,(e.hit||0)-dt);const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz),activation=e.activationRange||19,leash=e.leash||48;
   // Remote groups sleep; distance is checked before broadphase or line-of-sight work.
   if(d>Math.max(activation,leash)){e.windup=0;if(e.alert)e.alert=false;continue;}
   const visible=!this.segmentWall(e.x,e.z,p.x,p.z,(e.y||0)+1.3,p.y+p.bodyHeight*.7);
   if(d<activation&&visible)e.alert=true;if(!e.alert)continue;
   if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.attack=e.boss?1.5:2.4;if(visible){const y=(e.y||0)+1.3,dy=p.y+p.bodyHeight*.65-y,length=Math.max(.1,Math.hypot(dx,dz,dy)),speed=e.boss?15:12;this.projectiles.push({x:e.x,y,z:e.z,vx:dx/length*speed,vy:dy/length*speed,vz:dz/length*speed,life:3,alive:true});this.emit('enemyshot',{id:e.id,x:e.x,y,z:e.z});}}}
   else{e.attack=(e.attack??1)-dt;if(visible&&d<Math.min(leash,28)&&e.attack<=0){e.windup=e.boss?.65:.9;this.emit('warning',{id:e.id});}
    if(d>7&&visible){const speed=1.6*dt,nx=e.x+dx/d*speed,nz=e.z+dz/d*speed,homeX=e.homeX??e.x,homeZ=e.homeZ??e.z;if(Math.hypot(nx-homeX,nz-homeZ)<leash){if(!this.blocked(nx,e.z,.3,e.y||0,1.9))e.x=nx;if(!this.blocked(e.x,nz,.3,e.y||0,1.9))e.z=nz;}}
   }
  }
  for(const shot of this.projectiles){
   if(!shot.alive)continue;const x=shot.x,y=shot.y??1.25,z=shot.z;shot.life-=dt;const nx=x+shot.vx*dt,ny=y+(shot.vy||0)*dt,nz=z+shot.vz*dt;
   const wall=this.wallHit(x,y,z,nx,ny,nz,.06),body=segmentBox(x,y,z,nx,ny,nz,p.x-MOVEMENT.radius-.06,p.y-.06,p.z-MOVEMENT.radius-.06,p.x+MOVEMENT.radius+.06,p.y+p.bodyHeight+.06,p.z+MOVEMENT.radius+.06);
   if(body!==null&&(wall===null||body<wall)){this.damage(24*this.difficulty);shot.alive=false;}else if(wall!==null||shot.life<=0||ny<0)shot.alive=false;
   shot.x=nx;shot.y=ny;shot.z=nz;
  }
  this.projectiles=this.projectiles.filter(shot=>shot.alive);
  if(this.extractionZone){const zone=this.extractionZone;if(p.hp<=0||!this.bounty||Math.hypot(p.x-zone.x,p.z-zone.z)>zone.radius)this.cancelExtraction(p.hp<=0?'dead':'left');else{this.extractionProgress=Math.min(this.extractionRequired,this.extractionProgress+dt);if(this.extractionProgress>=this.extractionRequired-EPS){this.extractionProgress=this.extractionRequired;this.extracted=true;this.clearFireInput('extracted');this.emit('win',{id:zone.id,cargo:this.cargo,cash:this.cash});}}}
 }
}
root.HC={Mission,clamp,MOVEMENT,CYCLE,RIFLE:rifleSource?.RIFLE};if(typeof module!=='undefined')module.exports=root.HC;
})(typeof globalThis!=='undefined'?globalThis:this);
