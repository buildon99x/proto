/* Original carry tuning. Pure equipment model: no renderer, storage or game clock. */
(function(root){
'use strict';
const LIMITS=Object.freeze({bagSlots:12,weaponSlots:2,quickSlots:4,maxWeight:30});
const Catalog=Object.freeze(Object.fromEntries(Object.entries({
 r4:{name:'R-4 소총',category:'weapon',weight:3.6,value:540,maxStack:1,weaponIndex:3,ammoId:'ammo-rifle',magazineSize:30},
 pistol:{name:'P-6 권총',category:'weapon',weight:1.1,value:220,maxStack:1,weaponIndex:0,ammoId:'ammo-pistol',magazineSize:6},
 shotgun:{name:'S-2 산탄총',category:'weapon',weight:3.4,value:380,maxStack:1,weaponIndex:1,ammoId:'ammo-shell',magazineSize:2},
 smg:{name:'M-24 기관단총',category:'weapon',weight:2.4,value:420,maxStack:1,weaponIndex:2,ammoId:'ammo-smg',magazineSize:24},
 armor:{name:'작업 방탄복',category:'armor',weight:5.5,value:260,maxStack:1,maxDurability:45,protection:.65},
 bandage:{name:'붕대',category:'health',weight:.2,value:25,maxStack:5,heal:30},
 medkit:{name:'응급 키트',category:'health',weight:.7,value:80,maxStack:2,heal:60},
 frag:{name:'파편 수류탄',category:'throwable',weight:.5,value:75,maxStack:3},
 scanner:{name:'펄스 탐지기',category:'gadget',weight:.8,value:110,maxStack:2},
 scrap:{name:'합금 부품',category:'loot',weight:1.5,value:35,maxStack:6},
 archive:{name:'기록 모듈',category:'loot',weight:.4,value:180,maxStack:3},
 'ammo-rifle':{name:'소총 탄약',category:'ammo',weight:.016,value:2,maxStack:60},
 'ammo-pistol':{name:'권총 탄약',category:'ammo',weight:.012,value:1,maxStack:60},
 'ammo-shell':{name:'산탄',category:'ammo',weight:.035,value:3,maxStack:20},
 'ammo-smg':{name:'기관단총 탄약',category:'ammo',weight:.009,value:1,maxStack:90},
 bounty:{name:'표적 인식표',category:'quest',weight:.1,value:0,maxStack:1}
}).map(([id,item])=>[id,Object.freeze({id,...item})])));
const STACK_KEYS=new Set(['uid','itemId','quantity','rounds','chamber','durability','issued']);
const EPS=1e-8;
let nextUid=1;
// Observe saved identities as they are validated so a reloaded stash and a new
// starter kit cannot share an identity. Also reserve removed/split identities.
const allocatedUids=new Set();
const fail=reason=>({ok:false,reason});
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const plain=object=>!!object&&typeof object==='object'&&!Array.isArray(object)&&(Object.getPrototypeOf(object)===Object.prototype||Object.getPrototypeOf(object)===null);
const cloneStack=stack=>stack===null?null:{...stack};
const empty=()=>({bag:Array(LIMITS.bagSlots).fill(null),weapons:Array(LIMITS.weaponSlots).fill(null),armor:null,quick:Array(LIMITS.quickSlots).fill(null),safe:null});
function parseLocation(location){
 if(location==='armor'||location==='safe')return {key:location,index:null};
 if(typeof location!=='string')return null;
 const match=/^(bag|weapon|quick):(0|[1-9]\d*)$/.exec(location);
 if(!match)return null;
 const key=match[1]==='weapon'?'weapons':match[1],index=Number(match[2]);
 const limit={bag:LIMITS.bagSlots,weapons:LIMITS.weaponSlots,quick:LIMITS.quickSlots}[key];
 return index<limit?{key,index}:null;
}
function at(state,location){const slot=parseLocation(location);return !slot?undefined:slot.index===null?state[slot.key]:state[slot.key][slot.index];}
function put(state,location,stack){const slot=parseLocation(location);if(slot.index===null)state[slot.key]=stack;else state[slot.key][slot.index]=stack;}
function entries(state){
 const result=[];
 for(const [key,prefix] of [['bag','bag'],['weapons','weapon'],['quick','quick']])state[key].forEach((stack,index)=>{if(stack!==null)result.push({location:prefix+':'+index,stack});});
 for(const location of ['armor','safe'])if(state[location]!==null)result.push({location,stack:state[location]});
 return result;
}
function copyState(state){return {bag:state.bag.map(cloneStack),weapons:state.weapons.map(cloneStack),armor:cloneStack(state.armor),quick:state.quick.map(cloneStack),safe:cloneStack(state.safe)};}
function validateStack(stack){
 if(!plain(stack))return fail('invalid-stack');
 if(Object.keys(stack).some(key=>!STACK_KEYS.has(key)))return fail('invalid-metadata');
 if(typeof stack.uid!=='string'||!stack.uid.length||stack.uid.length>120)return fail('invalid-uid');
 if(typeof stack.itemId!=='string'||!own(Catalog,stack.itemId))return fail('unknown-item');
 const item=Catalog[stack.itemId];
 if(!Number.isSafeInteger(stack.quantity)||stack.quantity<1||stack.quantity>item.maxStack)return fail('invalid-quantity');
 if(own(stack,'issued')&&typeof stack.issued!=='boolean')return fail('invalid-metadata');
 if(item.category==='weapon'){
  if(!Number.isSafeInteger(stack.rounds)||stack.rounds<0)return fail('invalid-rounds');
  if(item.weaponIndex===3){
   if(stack.chamber!==0&&stack.chamber!==1)return fail('invalid-chamber');
   if(stack.rounds<stack.chamber||stack.rounds-stack.chamber>item.magazineSize)return fail('invalid-rounds');
  }else if(stack.rounds>item.magazineSize||own(stack,'chamber'))return fail('invalid-rounds');
 }else if(own(stack,'rounds')||own(stack,'chamber'))return fail('invalid-metadata');
 if(item.category==='armor'){
  if(!Number.isFinite(stack.durability)||stack.durability<0||stack.durability>item.maxDurability)return fail('invalid-durability');
 }else if(own(stack,'durability'))return fail('invalid-metadata');
 allocatedUids.add(stack.uid);
 return {ok:true};
}
function canPlace(location,stack){
 const slot=parseLocation(location);
 if(!slot)return false;
 if(stack===null)return true;
 const item=stack&&own(Catalog,stack.itemId)&&Catalog[stack.itemId];
 if(!item)return false;
 if(slot.key==='bag')return true;
 if(slot.key==='weapons')return item.category==='weapon';
 if(slot.key==='armor')return item.category==='armor';
 if(slot.key==='quick')return ['health','throwable','gadget'].includes(item.category);
 return !['weapon','armor','quest'].includes(item.category);
}
function stackWeight(stack){
 if(stack===null)return 0;
 const item=Catalog[stack.itemId];
 if(!item)return NaN;
 return Math.round((item.weight*stack.quantity+(item.category==='weapon'?Catalog[item.ammoId].weight*stack.rounds:0))*1e6)/1e6;
}
function stackValue(stack){
 if(stack===null)return 0;
 const item=Catalog[stack.itemId];
 if(!item)return NaN;
 return stack.issued?0:item.value*stack.quantity+(item.category==='weapon'?Catalog[item.ammoId].value*stack.rounds:0);
}
function weightOf(state){return Math.round(entries(state).reduce((sum,{stack})=>sum+stackWeight(stack),0)*1e6)/1e6;}
function validateSnapshot(state){
 if(!plain(state))return fail('invalid-snapshot');
 if(!Array.isArray(state.bag)||state.bag.length!==LIMITS.bagSlots||!Array.isArray(state.weapons)||state.weapons.length!==LIMITS.weaponSlots||!Array.isArray(state.quick)||state.quick.length!==LIMITS.quickSlots||!own(state,'armor')||!own(state,'safe'))return fail('invalid-slots');
 // Sparse arrays or aliases must not manufacture independent copies on load.
 const refs=new Set(),uids=new Set(),weaponClasses=new Set();
 for(const [key,count] of [['bag',LIMITS.bagSlots],['weapons',LIMITS.weaponSlots],['quick',LIMITS.quickSlots]]){
  if(refs.has(state[key]))return fail('duplicate-reference');refs.add(state[key]);
  for(let i=0;i<count;i++)if(!own(state[key],i))return fail('invalid-slots');
 }
 for(const {location,stack} of entries(state)){
  const result=validateStack(stack);if(!result.ok)return result;
  if(refs.has(stack))return fail('duplicate-reference');refs.add(stack);
  if(uids.has(stack.uid))return fail('duplicate-uid');uids.add(stack.uid);
  if(!canPlace(location,stack))return fail('wrong-slot');
  if(location.startsWith('weapon:')){const index=Catalog[stack.itemId].weaponIndex;if(weaponClasses.has(index))return fail('duplicate-weapon');weaponClasses.add(index);}
 }
 if(weightOf(state)>LIMITS.maxWeight+EPS)return fail('overweight');
 return {ok:true};
}
function freshUid(state){
 const uids=new Set(entries(state).map(entry=>entry.stack.uid));
 let uid;do{uid='df-'+nextUid++;}while(uids.has(uid)||allocatedUids.has(uid));allocatedUids.add(uid);return uid;
}
function makeStack(state,itemId,quantity,meta){
 const item=Catalog[itemId];
 const stack={uid:freshUid(state),itemId,quantity};
 if(item.category==='weapon'){stack.rounds=0;if(item.weaponIndex===3)stack.chamber=0;}
 if(item.category==='armor')stack.durability=item.maxDurability;
 for(const key of Object.keys(meta))if(key!=='quantity'&&key!=='itemId')stack[key]=meta[key];
 return stack;
}
function compatible(a,b){
 if(a.itemId!==b.itemId)return false;
 for(const key of ['rounds','chamber','durability'])if(a[key]!==b[key])return false;
 return !!a.issued===!!b.issued;
}
class Inventory{
 constructor(serialized){
  const state=serialized===undefined?empty():serialized;
  const result=validateSnapshot(state);
  if(!result.ok)throw new TypeError('Invalid inventory: '+result.reason);
  this._state=copyState(state);
 }
 snapshot(){return copyState(this._state);}
 // Combat owns current loaded-round and durability values; it may update get().
 get(location){return at(this._state,location)??null;}
 all(){return entries(this._state);}
 weight(){return weightOf(this._state);}
 usedSlots(){return this._state.bag.filter(Boolean).length;}
 value(){return this.all().reduce((sum,{stack})=>sum+stackValue(stack),0);}
 _commit(state,result){const valid=validateSnapshot(state);if(!valid.ok)return valid;this._state=state;return {ok:true,...result};}
 add(itemId,quantity=1,meta={}){
  if(typeof itemId!=='string'||!own(Catalog,itemId))return fail('unknown-item');
  if(!Number.isSafeInteger(quantity)||quantity<1)return fail('invalid-quantity');
  if(!plain(meta)||Object.keys(meta).some(key=>!STACK_KEYS.has(key)))return fail('invalid-metadata');
  if((own(meta,'itemId')&&meta.itemId!==itemId)||(own(meta,'quantity')&&meta.quantity!==quantity))return fail('invalid-metadata');
  const state=copyState(this._state),item=Catalog[itemId],probe=makeStack(state,itemId,Math.min(quantity,item.maxStack),meta);
  const valid=validateStack(probe);if(!valid.ok)return valid;
  // Explicit incoming identities remain intact, as required for dropped/stashed stacks.
  if(own(meta,'uid')&&quantity>item.maxStack)return fail('invalid-quantity');
  if(own(meta,'uid')&&entries(state).some(({stack})=>stack.uid===meta.uid))return fail('duplicate-uid');
  if(this.weight()+stackWeight(probe)/probe.quantity*quantity>LIMITS.maxWeight+EPS)return fail('overweight');
  let remaining=quantity;const locations=[];
  if(!own(meta,'uid'))for(let i=0;i<state.bag.length&&remaining;i++){
   const current=state.bag[i];if(!current||!compatible(current,probe))continue;
   const amount=Math.min(item.maxStack-current.quantity,remaining);if(!amount)continue;
   current.quantity+=amount;remaining-=amount;locations.push('bag:'+i);
  }
  for(let i=0;i<state.bag.length&&remaining;i++)if(state.bag[i]===null){
   const amount=Math.min(item.maxStack,remaining),stack=makeStack(state,itemId,amount,meta);
   state.bag[i]=stack;remaining-=amount;locations.push('bag:'+i);
  }
  if(remaining)return fail('bag-full');
  return this._commit(state,{locations,quantity});
 }
 addStack(stack,preferredLocation){
  const valid=validateStack(stack);if(!valid.ok)return valid;
  if(preferredLocation===undefined)return this.add(stack.itemId,stack.quantity,stack);
  if(!parseLocation(preferredLocation))return fail('invalid-location');
  if(!canPlace(preferredLocation,stack))return fail('wrong-slot');
  if(this.get(preferredLocation)!==null)return fail('occupied');
  const state=copyState(this._state);put(state,preferredLocation,cloneStack(stack));
  return this._commit(state,{locations:[preferredLocation],quantity:stack.quantity});
 }
 move(from,to){
  if(!parseLocation(from)||!parseLocation(to))return fail('invalid-location');
  const source=this.get(from),target=this.get(to);
  if(!source)return fail('empty');
  if(!canPlace(to,source)||!canPlace(from,target))return fail('wrong-slot');
  const state=copyState(this._state);put(state,to,cloneStack(source));put(state,from,cloneStack(target));
  // A same-location move succeeds without accidentally replacing the source twice.
  if(from===to)put(state,from,cloneStack(source));
  return this._commit(state,{from,to});
 }
 remove(location,count){
  if(!parseLocation(location))return fail('invalid-location');
  const source=this.get(location);if(!source)return fail('empty');
  const amount=count===undefined?source.quantity:count;
  if(!Number.isSafeInteger(amount)||amount<1||amount>source.quantity)return fail('invalid-quantity');
  const state=copyState(this._state),removed={...source,quantity:amount};
  if(amount===source.quantity)put(state,location,null);
  else{at(state,location).quantity-=amount;removed.uid=freshUid(state);}
  return this._commit(state,{location,stack:removed});
 }
 consume(location,count=1){return this.remove(location,count);}
 countItem(itemId,options={}){
  return this.all().reduce((sum,{location,stack})=>sum+(stack.itemId===itemId&&(!options.bagOnly||location.startsWith('bag:'))?stack.quantity:0),0);
 }
 takeItem(itemId,count,options={}){
  if(!own(Catalog,itemId))return fail('unknown-item');
  if(!Number.isSafeInteger(count)||count<1)return fail('invalid-quantity');
  if(this.countItem(itemId,options)<count)return fail('insufficient-items');
  const state=copyState(this._state),stacks=[];let remaining=count;
  for(const {location,stack} of entries(state)){
   if(stack.itemId!==itemId||(options.bagOnly&&!location.startsWith('bag:')))continue;
   const amount=Math.min(stack.quantity,remaining),removed={...stack,quantity:amount};
   if(amount===stack.quantity)put(state,location,null);else{stack.quantity-=amount;removed.uid=freshUid(state);}
   stacks.push(removed);remaining-=amount;if(!remaining)break;
  }
  return this._commit(state,{stacks,quantity:count});
 }
}
function starter(primaryIndex=3){
 const primary=['pistol','shotgun','smg','r4'][primaryIndex]||'r4',inventory=new Inventory();
 const issued={issued:true};
 const putNew=(itemId,quantity,location,meta={})=>{
  const stack=makeStack(inventory._state,itemId,quantity,{...issued,...meta});
  const result=inventory.addStack(stack,location);if(!result.ok)throw new Error('Invalid starter kit: '+result.reason);
 };
 const primaryItem=Catalog[primary];
 putNew(primary,1,'weapon:0',{rounds:primaryItem.magazineSize,...(primary==='r4'?{chamber:1}:{})});
 if(primary!=='pistol')putNew('pistol',1,'weapon:1',{rounds:6});
 putNew('armor',1,'armor',{durability:45});
 putNew('bandage',3,'quick:0');putNew('frag',2,'quick:1');putNew('scanner',1,'quick:2');
 const reserves={'ammo-rifle':90,'ammo-pistol':24,'ammo-shell':12,'ammo-smg':72};
 const ammoIds=[primaryItem.ammoId,...(primary!=='pistol'?['ammo-pistol']:[])];
 for(const itemId of ammoIds){const result=inventory.add(itemId,reserves[itemId],issued);if(!result.ok)throw new Error('Invalid starter reserve: '+result.reason);}
 return inventory;
}
function reserveIdentities(ids){if(!Array.isArray(ids)||ids.some(uid=>typeof uid!=='string'||!uid.length||uid.length>120))return fail('invalid-uid');for(const uid of ids)allocatedUids.add(uid);return {ok:true};}
function reserveUids(stacks){for(const stack of stacks){const result=validateStack(stack);if(!result.ok)return result;}return {ok:true};}
const api={Inventory,Catalog,LIMITS,starter,defaultStarter:starter,validateStack,validateSnapshot,canPlace,stackWeight,stackValue,reserveUids,reserveIdentities};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.DFInventory=api;
})(typeof globalThis!=='undefined'?globalThis:this);
