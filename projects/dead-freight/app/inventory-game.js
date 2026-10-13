/* Equipment/mission adapter. The existing firearm models own firing and reload timing. */
(function(root){
'use strict';
let model=root.DFInventory;
if(!model&&typeof require==='function')model=require('./inventory.js');
const {Catalog,stackWeight,stackValue}=model;
const ItemAction=(root.DFItemAction||(typeof require==='function'?require('./item-action.js'):null)).ItemAction;
const Melee=root.DFMelee||(typeof require==='function'?require('./melee.js'):null);
const WEAPONS=['pistol','shotgun','smg','r4'],AMMO=WEAPONS.map(id=>Catalog[id].ammoId);
const EPS=1e-7,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const REASONS={overweight:'휴대 중량 30 kg을 초과합니다.', 'bag-full':'가방 12칸이 모두 찼습니다.', 'wrong-slot':'이 장비를 해당 슬롯에 놓을 수 없습니다.', empty:'빈 슬롯입니다.', 'invalid-quantity':'수량을 확인하세요.', occupied:'이미 사용 중인 슬롯입니다.', 'duplicate-uid':'이미 가지고 있는 장비입니다.', 'invalid-location':'슬롯을 확인하세요.'};
function grenadeLaunch(w,options={}){
 const yaw=Number.isFinite(options.yaw)?options.yaw:0,pitch=clamp(Number.isFinite(options.pitch)?options.pitch:0,-.85,.85),p=w.player,dx=-Math.sin(yaw),dz=-Math.cos(yaw),y=p.y+Math.max(.5,p.eyeHeight*.8),reach=.4;
 const blocked=w.wallHit(p.x,y,p.z,p.x+dx*reach,y,p.z+dz*reach,.12)!==null;
 const origin=options.releaseOrigin,valid=origin&&['x','y','z'].every(k=>Number.isFinite(origin[k]))&&Math.hypot(origin.x-p.x,origin.y-y,origin.z-p.z)<=2.5;
 const safe=valid&&w.wallHit(p.x,y,p.z,origin.x,origin.y,origin.z,.12)===null;
 return {x:safe?origin.x:p.x+(blocked?0:dx*reach),y:safe?origin.y:y,z:safe?origin.z:p.z+(blocked?0:dz*reach),vx:dx*Math.cos(pitch)*12,vy:3+Math.sin(pitch)*12,vz:dz*Math.cos(pitch)*12,fuse:2,alive:true};
}
function stepGrenade(w,g,dt){const nx=g.x+g.vx*dt,ny=g.y+g.vy*dt-9*dt*dt,nz=g.z+g.vz*dt,hit=w.wallHit(g.x,g.y,g.z,nx,ny,nz,.11);g.vy-=18*dt;
   let contact=hit!==null;if(hit!==null){
    const hx=w.wallHit(g.x,g.y,g.z,nx,g.y,g.z,.11),hy=w.wallHit(g.x,g.y,g.z,g.x,ny,g.z,.11),hz=w.wallHit(g.x,g.y,g.z,g.x,g.y,nz,.11);
    const travel=Math.max(0,hit-.005);g.x+=(nx-g.x)*travel;g.y+=(ny-g.y)*travel;g.z+=(nz-g.z)*travel;
    if(hx!==null)g.vx*=-.42;if(hz!==null)g.vz*=-.42;if(hy!==null)g.vy*=-.32;if(hx===null&&hy===null&&hz===null){g.vx*=-.35;g.vz*=-.35;}
   }else{g.x=nx;g.y=ny;g.z=nz;}
   if(g.y<.11){contact=true;g.y=.11;g.vy=Math.abs(g.vy)<1?0:Math.abs(g.vy)*.3;g.vx*=.78;g.vz*=.78;}
   if(w.bounds){g.x=clamp(g.x,w.bounds.minX+.15,w.bounds.maxX-.15);g.z=clamp(g.z,w.bounds.minZ+.15,w.bounds.maxZ-.15);}
   g.fuse=Math.max(0,g.fuse-dt);return contact;}
function predictGrenade(w,options={}){const g=grenadeLaunch(w,options),points=[{x:g.x,y:g.y,z:g.z}],contacts=[];for(let i=0;i<240&&g.fuse>EPS;i++){const hit=stepGrenade(w,g,1/120),p={x:g.x,y:g.y,z:g.z};if(hit&&!contacts.length)contacts.push(p);if(i%4===3||hit||g.fuse<=EPS)points.push(p);}return {points,firstContact:contacts[0]||null,end:{x:g.x,y:g.y,z:g.z},duration:2-g.fuse};}
class Bridge{
 constructor(world,inventory,options={}){
  if(!world?.player||!inventory?.get)throw new TypeError('Mission and Inventory are required');
  this.world=world;this.inventory=inventory;this.activeSlot=options.activeSlot===1?1:0;this.activeUid=null;this.holstered=false;this.throwables=[];this.scannerRemaining=0;
  this.itemAction=new ItemAction();this._itemAim={yaw:0,pitch:0};this._itemVital=null;this._lastActionCommit=0;
  this.sessionId=options.sessionId||'carry-session-'+(++Bridge.sessionSequence);this._callbacks=options;
  this._bound=new Map();this._rifleUid=null;this._armorUid=null;this._reserves=[0,0,0,0];this._applied=false;this._lastShots=world.shots||0;this._nextAction=0;this._nextThrowable=1;this._throwableAccumulator=0;this._lastWorldTime=world.time;
  this.syncToWorld();if(options.caches!==false)this.addCaches();
 }
 get activeWeaponUid(){return this.activeUid;}
 get activeWeapon(){return this.inventory.get('weapon:'+this.activeSlot);}
 get canFire(){const stack=this.activeWeapon;return !this.itemAction.active&&!this.holstered&&!!stack&&stack.uid===this.activeUid&&Catalog[stack.itemId]?.weaponIndex===this.world.weapon&&this.world.player.hp>0&&!this.world.extracted&&!this.world.paused;}
 _result(ok,message,extra={}){return {ok,message,...extra};}
 _failure(reason){return this._result(false,REASONS[reason]||'지금은 이 동작을 완료할 수 없습니다.',{reason});}
 _available(){return this.world.player.hp>0&&!this.world.extracted;}
 _find(uid){return this.inventory.all().find(entry=>entry.stack.uid===uid);}
 _notify(name,reason,previousUid){if(typeof this._callbacks[name]==='function')this._callbacks[name]({reason,previousUid,activeUid:this.activeUid,activeSlot:this.activeSlot,holstered:this.holstered});}
 _setRifleReserve(reserve){if(this.world.rifle&&!this.world.rifle.setReserve(reserve))throw new Error('Invalid carried rifle reserve');}
 _captureActive(){
  const w=this.world,entry=this.activeUid&&this._find(this.activeUid);
  if(!entry||this.holstered)return;
  const stack=entry.stack,index=Catalog[stack.itemId].weaponIndex;
  if(w.weapon!==index)return;
  if(index===3&&w.rifle){
   const state=w.rifle.exportInstance();
   if(state.weaponInstanceId!==stack.uid)throw new Error('Rifle instance binding mismatch');
   const candidate={...stack,rounds:state.magazine+state.chamber,chamber:state.chamber,weaponState:state};
   if(!model.validateStack(candidate).ok)throw new Error('Invalid live rifle state');
   Object.assign(stack,{rounds:candidate.rounds,chamber:candidate.chamber,weaponState:state});
  }else if(w.mechanical[index]){const controller=w.mechanical[index],state=controller.exportInstance();if(state.weaponInstanceId!==stack.uid)throw new Error('Pistol instance binding mismatch');const candidate={...stack,rounds:controller.rounds,weaponState:state};if(!model.validateStack(candidate).ok)throw new Error('Invalid live pistol state');Object.assign(stack,{rounds:candidate.rounds,weaponState:state});
  }else{
   const previous=model.weaponState(stack),cycleNeeded=index<2&&!w.cocked;
   // Starting a legacy reload clears its automatic cycle timer. Cancellation
   // must resume that required cycle instead of manufacturing a cocked weapon.
   const cycleRemaining=cycleNeeded?(w.cycleWeapon===index?Math.max(0,w.cycleDelay):previous.cycleNeeded?previous.cycleRemaining:(index===0?.12:.26)):0;
   stack.rounds=Math.max(0,Math.floor(w.ammo[index]));
   stack.weaponState={...previous,cocked:!cycleNeeded,cycleNeeded,cycleRemaining,recoveryRemaining:Math.max(0,w.cooldown),shotSequence:previous.shotSequence+Math.max(0,(w.shots||0)-this._lastShots),reloadCheckpoint:null};
  }
  this._lastShots=w.shots||0;
 }
 _cancelReload(reason='inventory'){
  const w=this.world;w.clearFireInput(reason);
  if(w.rifle?.reload)w.rifle.cancelReload(reason);
  if(w.mechanical[w.weapon]){w.mechanical[w.weapon].cancelReload(reason);w.syncMechanical();}
  if(w.weapon!==3&&w.reload>0)w.emit('reloadcancel',{weapon:w.weapon,reason});
  w.reload=0;w.reloadDuration=0;
  if(!this.holstered&&this.activeUid&&w.weapon<2&&!w.cocked&&w.cycleWeapon===null){
   const state=model.weaponState(this._find(this.activeUid).stack);w.cycleWeapon=w.weapon;w.cycleDelay=state.cycleNeeded?state.cycleRemaining:w.weapon===0?.12:.26;
  }
  w.syncRifle();
 }
 beforeWeaponChange(reason='inventory'){
  if(this.itemAction.active&&!['item-action','melee','item-commit'].includes(reason))this.cancelUse(reason);
  this.syncFromWorld();this._cancelReload(reason);this._captureActive();this._notify('beforeWeaponChange',reason,this.activeUid);
  return {uid:this.activeUid,slot:this.activeSlot,holstered:this.holstered};
 }
 _objective(){
  const w=this.world;w.bounty=this.inventory.countItem('bounty',{bagOnly:true})>0;
  if(!w.bounty)w.cancelExtraction('bounty-dropped');
  w.cargo=this.inventory.countItem('scrap')+this.inventory.countItem('archive');
 }
 // The held UID owns live combat state. Class arrays remain compatibility
 // mirrors and must never write into a second gun of the same class.
 syncFromWorld(){
  if(!this._applied)return;
  const w=this.world;this._captureActive();
  for(let index=0;index<4;index++){
   const reserve=index===3&&w.rifle?w.rifle.reserve:w.reserve[index];
   const spent=Math.max(0,Math.round(this._reserves[index]-reserve));
   if(spent){const available=this.inventory.countItem(AMMO[index],{bagOnly:true}),amount=Math.min(spent,available);if(amount&&!this.inventory.takeItem(AMMO[index],amount,{bagOnly:true}).ok)throw new Error('Carried ammo transfer failed');}
   this._reserves[index]=this.inventory.countItem(AMMO[index],{bagOnly:true});w.reserve[index]=this._reserves[index];
  }
  this._setRifleReserve(this._reserves[3]);
  const armor=this._armorUid&&this._find(this._armorUid);if(armor)armor.stack.durability=clamp(w.player.armor,0,Catalog.armor.maxDurability);
  this._objective();
 }
 _restoreRifle(stack,active){
  const w=this.world;if(!w.rifle)return;
  const state=stack?model.weaponState(stack):{version:1,weaponId:'r4',weaponInstanceId:'unarmed-'+this.sessionId,magazine:0,chamber:0,mode:'auto',shotSequence:0,recoveryRemaining:0,reloadCheckpoint:null};
  w.rifle.bindIdentity({weaponInstanceId:state.weaponInstanceId,sessionId:this.sessionId});
  if(!w.rifle.restoreInstance(state,{reserve:this._reserves[3],sessionId:this.sessionId,active}))throw new Error('Unable to restore carried rifle');
  this._rifleUid=stack?.uid||null;
 }
 _restorePistol(stack){this._restoreMechanical(0,stack);}
 _restoreMechanical(index,stack){const w=this.world,controller=w.mechanical[index],id=controller.config.id,state=stack?model.weaponState(stack):{version:1,weaponId:id,weaponInstanceId:'unarmed-'+id+'-'+this.sessionId,mode:controller.mode,shotSequence:0,recoveryRemaining:0,reloadCheckpoint:null,cocked:true,cycleNeeded:false,cycleRemaining:0};if(!controller.restoreInstance(state,{rounds:stack?.rounds||0,reserve:this._reserves[index],sessionId:this.sessionId,active:false,paused:w.paused}))throw new Error('Unable to restore carried '+id);this._mechanicalUids??=[];this._mechanicalUids[index]=stack?.uid||null;if(index===0)this._pistolUid=stack?.uid||null;}
 syncToWorld(options={}){
  const w=this.world,previous=this.activeUid,slots=[this.inventory.get('weapon:0'),this.inventory.get('weapon:1')];
  const followed=previous?slots.findIndex(stack=>stack?.uid===previous):-1;
  if(followed>=0)this.activeSlot=followed;
  if(!slots[this.activeSlot])this.activeSlot=Math.max(0,slots.findIndex(Boolean));
  const active=slots[this.activeSlot],index=active?Catalog[active.itemId].weaponIndex:null,changed=previous!==(active?.uid||null)||!!options.forceRestore||!this._applied;
  this._bound.clear();w.ammo.fill(0);
  for(let slot=0;slot<2;slot++){
   const stack=slots[slot];if(!stack)continue;
   const wi=Catalog[stack.itemId].weaponIndex;this._bound.set(stack.uid,{uid:stack.uid,slot,index:wi});
   if(!slots.slice(0,slot).some(other=>other?.itemId===stack.itemId))w.ammo[wi]=stack.rounds;
  }
  if(active)w.ammo[index]=active.rounds;
  for(let i=0;i<4;i++){this._reserves[i]=this.inventory.countItem(AMMO[i],{bagOnly:true});w.reserve[i]=this._reserves[i];}
  const rifleStack=index===3?active:slots.find(stack=>stack?.itemId==='r4')||null;
  if(w.rifle&&(this._rifleUid!==rifleStack?.uid||changed||!this._applied))this._restoreRifle(rifleStack,false);
  else this._setRifleReserve(this._reserves[3]);
  for(const [wi,controller] of w.mechanical.entries()){const stack=index===wi?active:slots.find(stack=>stack?.itemId===controller.config.id)||null;if(this._mechanicalUids?.[wi]!==(stack?.uid||null)||changed||!this._applied)this._restoreMechanical(wi,stack);}
  this.activeUid=active?.uid||null;
  if(index===null||this.holstered){
   w.clearFireInput(index===null?'unarmed':'holster');w.rifle?.deactivate();for(const controller of w.mechanical)controller.deactivate('unarmed');if(!w.mechanical[index]){w.reload=0;w.reloadDuration=0;w.cycleWeapon=null;w.cycleDelay=0;w.cocked=index===null;}
  }else if(changed||w.weapon!==index){
   const paused=w.paused;w.paused=false;if(w.weapon!==index)w.switchWeapon(index);w.paused=paused;
   if(index===3){w.rifle.activate();w.rifle.setPaused(paused);}
   else if(w.mechanical[index]){const controller=w.mechanical[index];controller.activate();controller.setPaused(paused);controller.cooldown=Math.max(model.weaponState(active).recoveryRemaining,this._applied?controller.config.switchRecovery:0);}
   else{
    const state=model.weaponState(active);w.cocked=state.cocked;w.cycleWeapon=state.cycleNeeded?index:null;w.cycleDelay=state.cycleRemaining;w.reload=0;w.reloadDuration=0;w.cooldown=Math.max(state.recoveryRemaining,this._applied?.25:0);
   }
   w.clearFireInput('inventory-switch');this._lastShots=w.shots||0;
  }else if(index===3&&w.rifle&&!w.rifle.active)w.rifle.activate();else if(w.mechanical[index]&&!w.mechanical[index].active)w.mechanical[index].activate();
  const armor=this.inventory.get('armor');this._armorUid=armor?.uid||null;w.player.armor=armor?.durability||0;
  w.syncRifle();this._objective();this._applied=true;
 }
 _mutate(action,message,reason='inventory'){
  if(!this._available())return this._failure('unavailable');
  this.syncFromWorld();
  // Validate on an isolated draft before cancellation, so failed moves leave
  // the live reload untouched. The successful operation is applied only once.
  const draft=new model.Inventory(this.inventory.snapshot()),original=this.inventory;let result;
  try{this.inventory=draft;result=action();}finally{this.inventory=original;}
  if(!result.ok)return this._failure(result.reason);
  this.beforeWeaponChange(reason);result=action();if(!result.ok)return this._failure(result.reason);
  const previous=this.activeUid;this.syncToWorld();this._notify('afterWeaponChange','inventory',previous);return this._result(true,message,result);
 }
 move(from,to){return this._mutate(()=>this.inventory.move(from,to),'장비를 옮겼습니다.');}
 equipWeapon(slot){
  if(typeof slot==='string'&&/^weapon:[01]$/.test(slot))slot=Number(slot.slice(-1));
  if(!Number.isInteger(slot)||slot<0||slot>1||!this._available())return this._failure('invalid-location');
  const stack=this.inventory.get('weapon:'+slot);if(!stack)return this._failure('empty');
  if(this.activeUid===stack.uid&&!this.holstered)return this._result(true,Catalog[stack.itemId].name+' 사용 중');
  this.beforeWeaponChange('equip');const previous=this.activeUid;this.activeSlot=slot;this.activeUid=null;this.holstered=false;this.syncToWorld({forceRestore:true});this._notify('afterWeaponChange','equip',previous);
  return this._result(true,Catalog[stack.itemId].name+' 장착');
 }
 holsterWeapon(){
  if(!this._available()||!this.activeUid)return this._failure('unavailable');
  if(this.holstered)return this._result(true,'총기를 내려놓았습니다.');
  this.beforeWeaponChange('holster');const previous=this.activeUid;this.holstered=true;this.syncToWorld();this._notify('afterWeaponChange','holster',previous);return this._result(true,'총기를 내렸습니다.');
 }
 restoreWeapon(){
  if(!this.holstered)return this._result(true,'총기 사용 중');
  if(!this._available()||!this.activeWeapon)return this._failure('unavailable');
  const previous=this.activeUid;this.holstered=false;this.syncToWorld({forceRestore:true});this._notify('afterWeaponChange','restore',previous);return this._result(true,'총기를 들었습니다.');
 }
 _stackFor(item){
  if(item.type==='inventory'&&item.stack)return {...item.stack};
  if(item.type==='health')return {itemId:'medkit',quantity:1};
  if(item.type==='armor')return {itemId:'armor',quantity:1,durability:Catalog.armor.maxDurability};
  if(item.type==='bounty')return {itemId:'bounty',quantity:1};
  if(item.type==='cargo')return /통신|기록|archive/i.test(item.label||'')?{itemId:'archive',quantity:2}:{itemId:'scrap',quantity:3};
  if(item.type==='ammo'){const weapon=Catalog[this.activeWeapon?.itemId],itemId=AMMO.includes(item.ammoId)?item.ammoId:weapon?.ammoId||'ammo-rifle';return {itemId,quantity:item.quantity||{'ammo-rifle':60,'ammo-pistol':24,'ammo-shell':8,'ammo-smg':60}[itemId]};}
  return null;
 }
 nearestPickup(){
  const p=this.world.player;let best=null,distance=Infinity;
  for(const item of this.world.pickups){if(!item.alive||item.type==='barrel'||!this._stackFor(item)||Math.abs((item.y||0)-p.y)>2)continue;const d=Math.hypot(item.x-p.x,item.z-p.z);if(d<=2.5&&d<distance&&this.world.wallHit(p.x,p.y+Math.min(1,p.bodyHeight*.6),p.z,item.x,(item.y||0)+.35,item.z,.015)===null){best=item;distance=d;}}
  return best;
 }
 previewNearest(){
  const item=this.nearestPickup();if(!item)return null;const stack=this._stackFor(item),definition=Catalog[stack.itemId];
  return {item,pickup:item,stack,...stack,name:definition.name,weight:stackWeight(stack),value:stackValue(stack),distance:Math.hypot(item.x-this.world.player.x,item.z-this.world.player.z),category:definition.category};
 }
 pickupPreview(){return this.previewNearest();}
 interact(){
  const w=this.world;if(!this._available()||w.paused)return this._failure('unavailable');
  this.syncFromWorld();const zone=w.nearExtraction();
  if(zone&&w.bounty){
   if(w.extractionZone)return this._result(false,'탈출 신호 송신 중입니다. 구역 안을 지키세요.',{reason:'extracting'});
   w.extractionZone=zone;w.extractionProgress=0;w.extractionRequired=zone.holdTime||6;w.emit('extractionstart',{id:zone.id,duration:w.extractionRequired});
   return this._result(true,'탈출 신호 송신 · 6초 동안 구역을 지키세요.',{extraction:true});
  }
  if(w.time+EPS<this._nextAction)return this._result(false,'잠시 후 다시 시도하세요.',{reason:'cooldown'});
  const item=this.nearestPickup();if(!item)return this._result(false,zone?'탈출하려면 표적 인식표가 필요합니다.':'가까운 곳에 회수할 물품이 없습니다.',{reason:'nothing-nearby'});
  const stack=this._stackFor(item),{itemId,quantity,...meta}=stack;
  const result=this._mutate(()=>this.inventory.add(itemId,quantity,meta),Catalog[itemId].name+' ×'+quantity+' 회수');
  if(!result.ok)return result;
  item.alive=false;this._nextAction=w.time+.16;w.emit('pickup',{kind:item.type==='inventory'?itemId:item.type,itemId,quantity,message:result.message});
  return {...result,item,stack};
 }
 _ground(x,z){
  const p=this.world.player;let y=0;
  for(const wall of this.world.wallCandidates(x-.12,z-.12,x+.12,z+.12)){const top=(wall.y||0)+wall.h;if(top<=p.y+.15&&Math.abs(x-wall.x)<wall.w/2&&Math.abs(z-wall.z)<wall.d/2)y=Math.max(y,top);}
  return y;
 }
 _dropPoint(yaw=0){
  const w=this.world,p=w.player,angle=Number.isFinite(yaw)?yaw:0;
  for(const offset of [0,Math.PI/2,-Math.PI/2,Math.PI,0]){
   const length=offset===0?.8:.65,x=p.x-Math.sin(angle+offset)*length,z=p.z-Math.cos(angle+offset)*length,y=this._ground(x,z);
   if(!w.blocked(x,z,.22,y,.45)&&w.wallHit(p.x,p.y+.5,p.z,x,y+.3,z,.1)===null)return {x,y,z};
  }
  const y=this._ground(p.x,p.z);return !w.blocked(p.x,p.z,.22,y,.45)?{x:p.x,y,z:p.z}:null;
 }
 drop(location,options={}){
  if(typeof options==='number')options={yaw:options};
  const point=this._dropPoint(options.yaw);if(!point)return this._result(false,'여기에는 물품을 내려놓을 수 없습니다.',{reason:'blocked'});
  const result=this._mutate(()=>this.inventory.remove(location,options.quantity),'물품을 바닥에 내려놓았습니다.');
  if(result.ok){const item={type:'inventory',...point,alive:true,stack:{...result.stack},dropped:true};this.world.pickups.push(item);return {...result,item};}
  return result;
 }
 requestMelee(options={}){
  const w=this.world;if(!this._available()||w.paused)return this._failure('unavailable');
  if(this.itemAction.active)return this._failure('busy');
  this.beforeWeaponChange('melee');this.itemAction.start({uid:this.sessionId+':melee',itemId:'melee'},null);this._itemAim=options;this._itemVital=w.player.hp+w.player.armor;this._itemDamageSequence=w.damageSequence||0;w.weaponActionBlocked=true;
  return this._result(true,'근접 공격 준비');
 }
 requestUse(location,options={}){return this._requestUse(location,options,false);}
 prepareUseFromMenu(location,options={}){return this._requestUse(location,options,true);}
 _requestUse(location,options={},pausedPreparation=false){
  const stack=this.inventory.get(location),w=this.world;
  if(!this._available()||w.paused&&!pausedPreparation)return this._failure('unavailable');
  if(location==='safe')return this._failure('safe-pocket');
  if(this.itemAction.active)return this._result(false,'동작 중입니다.',{reason:'busy'});
  if(!stack)return this._failure('empty');
  if(!['bandage','medkit','scanner','frag'].includes(stack.itemId))return this._failure('not-usable');
  if(w.time+EPS<this._nextAction)return this._failure('cooldown');
  if(['bandage','medkit'].includes(stack.itemId)&&w.player.hp>=100)return this._result(false,'체력이 가득 차 있습니다.',{reason:'full-health'});
  this.beforeWeaponChange('item-action');this.itemAction.start(stack,location);this._itemAim=options;this._itemVital=w.player.hp+w.player.armor;this._itemDamageSequence=w.damageSequence||0;w.weaponActionBlocked=true;
  return this._result(true,Catalog[stack.itemId].name+' 준비');
 }
 cancelUse(reason='cancel'){const cancelled=this.itemAction.cancel();if(cancelled){this.world.emit('itemcancel',{reason});this.world.emit('foleycancel',{});}return cancelled;}
 triggerUse(options={}){if(!this._available()||this.world.paused){this.cancelUse('unavailable');return false;}if(!this.itemAction.trigger(options.input??null))return false;this._itemAim=options;return true;}
 releaseUse(input=null){if(!this._available()||this.world.paused){this.cancelUse('unavailable');return false;}return this.itemAction.release(input);}
 stepUse(dt,options={}){
  const a=this.itemAction,w=this.world;if(!a.active)return [];
  if(!this._available()||w.paused){this.cancelUse('unavailable');return [];}
  const vital=w.player.hp+w.player.armor;if((w.damageSequence||0)!==this._itemDamageSequence||vital<this._itemVital-EPS)this.cancelUse('damage');this._itemDamageSequence=w.damageSequence||0;this._itemVital=vital;
  this._itemAim=options;
  const results=[];for(const event of a.tick(dt))if(event.type==='commit'){
   // Reconciled archive receipt: effect dispatch remains once per real timeline identity.
   if(!Number.isSafeInteger(event.sequence)||event.sequence<=0||event.sequence!==a.sequence||event.sequence<=this._lastActionCommit||event.uid!==a.uid||event.itemId!==a.itemId||event.location!==a.location||!a.committed||a.cancelled)continue;
   this._lastActionCommit=event.sequence;
   const stack=this.inventory.get(event.location);
   const aim={...this._itemAim};if(event.itemId==='frag'&&typeof options.releaseOrigin==='function'){try{aim.releaseOrigin=options.releaseOrigin();}catch{delete aim.releaseOrigin;}}
   let result;this._committingItem=true;try{result=event.itemId==='melee'?{...Melee.strike(w,this._itemAim),message:'근접 공격'}:stack?.uid===event.uid&&stack.itemId===event.itemId?this.use(event.location,aim):this._failure('changed-item');}finally{this._committingItem=false;}
   results.push(result);if(!result.ok){const rejectedPose=a.snapshot();a.cancelled=true;a.recoverFrom=rejectedPose;a.stage='recover';a.elapsed=0;w.emit('foleycancel',{});}
  }
  if(a.cancelled)a.drainCues();else for(const cue of a.drainCues())w.emit('foley',cue);
  return results;
 }
 use(location,options={}){
  if(typeof options==='number')options={yaw:options};
  const w=this.world;if(!this._available()||w.paused)return this._failure('unavailable');
  if(this.itemAction.active&&!this._committingItem)return this._failure('busy');
  if(location==='safe')return this._result(false,'안전 주머니의 물품을 먼저 가방이나 빠른 슬롯으로 옮기세요.',{reason:'safe-pocket'});
  const stack=this.inventory.get(location);if(!stack)return this._failure('empty');
  const id=stack.itemId;if(!['bandage','medkit','scanner','frag'].includes(id))return this._result(false,'이 물품은 직접 사용할 수 없습니다.',{reason:'not-usable'});
  if(w.time+EPS<this._nextAction)return this._result(false,'잠시 후 다시 사용하세요.',{reason:'cooldown'});
  if((id==='bandage'||id==='medkit')&&w.player.hp>=100)return this._result(false,'체력이 가득 차 있습니다.',{reason:'full-health'});
  const result=this._mutate(()=>this.inventory.consume(location,1),id==='scanner'?'탐지 펄스 · 35 m 안의 적을 8초 동안 표시합니다.':id==='frag'?'수류탄 투척 · 엄폐하세요!':Catalog[id].name+' 사용',this._committingItem?'item-commit':'inventory');
  if(!result.ok)return result;
  this._nextAction=w.time+.4;
  if(id==='bandage'||id==='medkit'){const before=w.player.hp;w.player.hp=Math.min(100,before+(id==='bandage'?30:60));w.emit('heal',{amount:w.player.hp-before,itemId:id});}
  else if(id==='scanner'){this.scannerRemaining=8;w.emit('scan',{x:w.player.x,z:w.player.z,radius:35,duration:8});}
  else{
   const grenade={id:this._nextThrowable++,...grenadeLaunch(w,options)};
   this.throwables.push(grenade);w.emit('throw',{id:grenade.id,itemId:'frag',x:grenade.x,y:grenade.y,z:grenade.z});result.throwable=grenade;
  }
  return result;
 }
 isScanned(enemy){const p=this.world.player;return this.scannerRemaining>EPS&&!!enemy?.alive&&Math.hypot(enemy.x-p.x,enemy.z-p.z,(enemy.y||0)-p.y)<=35;}
 _blast(grenade){
  if(!grenade.alive)return;grenade.alive=false;const w=this.world,radius=7;
  w.emit('explosion',{x:grenade.x,y:grenade.y,z:grenade.z,kind:'frag',radius,id:grenade.id});
  const damageTo=(x,y,z,max)=>{const distance=Math.hypot(x-grenade.x,y-grenade.y,z-grenade.z);if(distance>=radius||w.wallHit(grenade.x,grenade.y+.1,grenade.z,x,y,z,.015)!==null)return 0;return max*(1-distance/radius);};
  for(const enemy of w.enemies){if(!enemy.alive)continue;const damage=damageTo(enemy.x,(enemy.y||0)+1,enemy.z,165);if(damage<=EPS)continue;enemy.hp-=damage;enemy.hit=.2;enemy.alert=true;w.emit('blood',{x:enemy.x,z:enemy.z,damage,head:false});if(enemy.hp<=0&&enemy.alive)w.kill(enemy,80);}
  const p=w.player,selfDamage=damageTo(p.x,p.y+Math.min(1,p.bodyHeight*.6),p.z,135);if(selfDamage>EPS)w.damage(selfDamage,{x:grenade.x,z:grenade.z});
 }
 _stepThrowables(dt){
  const w=this.world;
  for(const g of this.throwables){if(!g.alive)continue;stepGrenade(w,g,dt);if(g.fuse<=EPS)this._blast(g);
  }
 }
 beforeStep(){this.syncFromWorld();}
 afterStep(dt){
  this.syncFromWorld();const w=this.world;
  const elapsed=Number.isFinite(dt)?Math.min(.25,Math.max(0,dt)):Math.max(0,w.time-this._lastWorldTime);this._lastWorldTime=w.time;
  if(w.paused||w.extracted||w.player.hp<=0)return;
  this.scannerRemaining=Math.max(0,this.scannerRemaining-elapsed);
  if(!this.throwables.length)this._throwableAccumulator=0;else this._throwableAccumulator+=elapsed;while(this._throwableAccumulator>=1/120-EPS){this._stepThrowables(1/120);this._throwableAccumulator=Math.max(0,this._throwableAccumulator-1/120);}
  this.throwables=this.throwables.filter(grenade=>grenade.alive);this.syncFromWorld();
 }
 addCaches(){
  const w=this.world;if(w._inventoryCaches)return;w._inventoryCaches=true;
  if(!w.landmarks?.length)return;
  const plans=[['insertion','bandage',2],['insertion','frag',1],['lumber','shotgun',1],['lumber','ammo-shell',8],['depot','smg',1],['depot','ammo-smg',60],['quarry','frag',2],['quarry','armor',1],['relay','r4',1],['relay','scanner',1],['relay','archive',1]];
  const originals=w.pickups.slice();let sequence=0;
  for(const [landmarkId,itemId,quantity] of plans){
   const landmark=w.landmarks.find(l=>l.id===landmarkId);if(!landmark)continue;
   const source=originals.filter(item=>item.type!=='barrel'&&Math.hypot(item.x-landmark.x,item.z-landmark.z)<landmark.radius+3).sort((a,b)=>Math.hypot(a.x-landmark.x,a.z-landmark.z)-Math.hypot(b.x-landmark.x,b.z-landmark.z))[0];if(!source)continue;
   const definition=Catalog[itemId],stack={itemId,quantity};if(definition.category==='weapon'){stack.rounds=definition.magazineSize;if(itemId==='r4')stack.chamber=1;}if(itemId==='armor')stack.durability=Catalog.armor.maxDurability;
   let x=source.x,z=source.z;const offset=++sequence;for(let i=0;i<12;i++){const angle=(i+offset)*Math.PI/6,px=source.x+Math.cos(angle)*1.25,pz=source.z+Math.sin(angle)*1.25;if(!w.blocked(px,pz,.3,source.y||0,.7)&&!w.pickups.some(p=>Math.hypot(p.x-px,p.z-pz)<.6)){x=px;z=pz;break;}}
   w.pickups.push({type:'inventory',x,z,y:source.y||0,alive:true,stack,cache:landmarkId,label:definition.name});
  }
 }
}
Bridge.sessionSequence=0;
const API={Bridge,WEAPONS,AMMO,grenadeLaunch,stepGrenade,predictGrenade};root.DFInventoryGame=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
