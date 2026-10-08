'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {Inventory,Catalog,LIMITS,starter,defaultStarter,validateStack,validateSnapshot,canPlace,stackWeight,stackValue,reserveUids}=require('./inventory.js');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
function add(inventory,itemId,quantity=1,meta={}){const result=inventory.add(itemId,quantity,meta);assert.equal(result.ok,true,result.reason);return result.locations[0];}
function move(inventory,from,to){const result=inventory.move(from,to);assert.equal(result.ok,true,result.reason);}
function unchanged(inventory,action,reason){const before=inventory.snapshot(),mass=inventory.weight();const result=action();assert.equal(result.ok,false);if(reason)assert.equal(result.reason,reason);assert.deepEqual(inventory.snapshot(),before);assert.equal(inventory.weight(),mass);return result;}
function countAll(inventory){const result={};for(const {stack} of inventory.all()){result[stack.itemId]=(result[stack.itemId]||0)+stack.quantity;const item=Catalog[stack.itemId];if(item.category==='weapon')result[item.ammoId]=(result[item.ammoId]||0)+stack.rounds;}return result;}
function placed(itemId,uid,quantity=1,meta={}){return {uid,itemId,quantity,...(Catalog[itemId].category==='weapon'?{rounds:0,...(itemId==='r4'?{chamber:0}:{})}:{}),...(itemId==='armor'?{durability:45}:{}),...meta};}

check('CommonJS and standalone browser global expose the same inventory API',()=>{
 assert.equal(defaultStarter,starter);assert.equal(globalThis.DFInventory.Inventory,Inventory);
 const context={};vm.runInNewContext(fs.readFileSync(require.resolve('./inventory.js'),'utf8'),context);
 assert.equal(typeof context.DFInventory.Inventory,'function');assert.equal(new context.DFInventory.Inventory().weight(),0);
});
check('empty snapshot has exact slot limits and independent containers',()=>{
 const inv=new Inventory(),state=inv.snapshot();assert.deepEqual(LIMITS,{bagSlots:12,weaponSlots:2,quickSlots:4,maxWeight:30});
 assert.equal(state.bag.length,12);assert.equal(state.weapons.length,2);assert.equal(state.quick.length,4);assert.equal(state.armor,null);assert.equal(state.safe,null);
 assert.equal(inv.weight(),0);assert.equal(inv.usedSlots(),0);assert.deepEqual(inv.all(),[]);
});
check('every starter fits carry limits with loaded weapons, quick uses and issued value zero',()=>{
 for(let index=0;index<4;index++){
  const inv=starter(index),primary=inv.get('weapon:0');
  assert.equal(Catalog[primary.itemId].weaponIndex,index);assert.equal(primary.rounds,Catalog[primary.itemId].magazineSize);
  assert.equal(inv.get('weapon:1')?.itemId,index===0?undefined:'pistol');assert.equal(inv.get('armor').durability,45);
  assert.equal(inv.get('quick:0').itemId,'bandage');assert.equal(inv.get('quick:0').quantity,3);assert.equal(inv.get('quick:1').quantity,2);assert.equal(inv.get('quick:2').itemId,'scanner');assert.equal(inv.get('quick:3'),null);
  assert(inv.weight()<30);assert.equal(inv.value(),0);assert(inv.all().every(({stack})=>stack.issued===true));assert(validateSnapshot(inv.snapshot()).ok);
 }
 assert.equal(starter().get('weapon:0').itemId,'r4');assert.equal(starter().countItem('ammo-rifle'),90);assert.equal(starter().countItem('ammo-pistol'),24);
});
check('starter weapons and ammo never reuse an existing saved stash identity',()=>{
 const saved=placed('archive','df-1000');assert(reserveUids([saved]).ok);
 const generated=new Set();for(let i=0;i<90;i++)for(const {stack} of starter().all()){assert.notEqual(stack.uid,saved.uid);assert(!generated.has(stack.uid));generated.add(stack.uid);}
});
check('catalog is immutable and original tuning creates meaningful cargo pressure',()=>{
 assert(Object.isFrozen(Catalog));assert(Object.values(Catalog).every(Object.isFrozen));assert.equal(Catalog.scrap.weight*3,4.5);assert.equal(Catalog.bandage.heal,30);
 assert.throws(()=>{Catalog.r4.weight=0;},TypeError);
});
check('add merges compatible stacks then allocates the precise overflow slots',()=>{
 const inv=new Inventory();add(inv,'ammo-rifle',45);const uid=inv.get('bag:0').uid;const result=inv.add('ammo-rifle',40);
 assert(result.ok);assert.deepEqual(result.locations,['bag:0','bag:1']);assert.equal(inv.get('bag:0').quantity,60);assert.equal(inv.get('bag:0').uid,uid);assert.equal(inv.get('bag:1').quantity,25);assert.equal(inv.countItem('ammo-rifle'),85);assert.equal(inv.usedSlots(),2);
});
check('issued and ordinary stacks remain separate so recovered goods keep their value',()=>{
 const inv=new Inventory();add(inv,'bandage',2,{issued:true});add(inv,'bandage',2);add(inv,'bandage',1,{issued:false});
 assert.equal(inv.usedSlots(),2);assert.equal(inv.get('bag:0').quantity,2);assert.equal(inv.get('bag:1').quantity,3);assert.equal(inv.value(),75);
});
check('explicit UID and combat metadata survive world pickup and direct equipment insertion',()=>{
 const inv=new Inventory(),gun=placed('r4','world-rifle',1,{rounds:31,chamber:1,issued:false});
 assert(inv.addStack(gun,'weapon:0').ok);gun.rounds=0;
 assert.equal(inv.get('weapon:0').rounds,31);assert.equal(inv.get('weapon:0').uid,'world-rifle');
 const armor=placed('armor','world-armor',1,{durability:12.5});assert(inv.addStack(armor,'armor').ok);assert.equal(inv.get('armor').durability,12.5);
});
check('explicit stack identities do not disappear into merges',()=>{
 const inv=new Inventory();add(inv,'bandage',1);assert(inv.addStack(placed('bandage','saved-bandage',2)).ok);
 assert.equal(inv.usedSlots(),2);assert.equal(inv.get('bag:1').uid,'saved-bandage');assert.equal(inv.get('bag:1').quantity,2);
});
check('loaded rounds count toward mass and value, including rifle chamber once',()=>{
 const rifle=placed('r4','mass-r4',1,{rounds:31,chamber:1});assert.equal(stackWeight(rifle),4.096);assert.equal(stackValue(rifle),602);
 const inv=new Inventory();assert(inv.addStack(rifle,'weapon:0').ok);assert.equal(inv.weight(),4.096);
 const p=add(inv,'pistol',1,{rounds:6});assert.equal(stackWeight(inv.get(p)),1.172);assert.equal(inv.weight(),5.268);
 inv.get('weapon:0').rounds--;assert.equal(inv.weight(),5.252);
});
check('equipping and moving cargo preserve total quantity, mass and loaded ammunition',()=>{
 const inv=starter(),mass=inv.weight(),counts=countAll(inv);move(inv,'weapon:0','bag:3');move(inv,'weapon:1','weapon:0');move(inv,'bag:3','weapon:1');move(inv,'quick:0','safe');move(inv,'safe','quick:3');
 assert.equal(inv.weight(),mass);assert.deepEqual(countAll(inv),counts);assert.equal(inv.get('weapon:1').rounds,30);assert.equal(inv.get('weapon:1').chamber,1);
});
check('typed swaps validate both directions before changing equipment',()=>{
 const inv=starter(),location=add(inv,'archive');
 unchanged(inv,()=>inv.move(location,'weapon:0'),'wrong-slot');unchanged(inv,()=>inv.move('weapon:0','quick:0'),'wrong-slot');unchanged(inv,()=>inv.move('armor','safe'),'wrong-slot');
 const newGun=add(inv,'shotgun',1,{rounds:2});const old=inv.get('weapon:0').uid;move(inv,newGun,'weapon:0');assert.equal(inv.get(newGun).uid,old);assert.equal(inv.get('weapon:0').itemId,'shotgun');
});
check('same-class weapons occupy two slots with independent identities and rounds',()=>{
 const inv=starter(),location=add(inv,'r4',1,{rounds:0,chamber:0});assert.equal(inv.countItem('r4'),2);
 move(inv,location,'weapon:1');assert.notEqual(inv.get('weapon:0').uid,inv.get('weapon:1').uid);
 assert.equal(inv.get('weapon:0').rounds,30);assert.equal(inv.get('weapon:1').rounds,0);
});
check('safe pocket holds one eligible stack and refuses weapons, armor and quest items',()=>{
 const inv=new Inventory(),bandage=add(inv,'bandage',5);move(inv,bandage,'safe');assert.equal(inv.get('safe').quantity,5);
 for(const itemId of ['r4','armor','bounty']){const location=add(inv,itemId);unchanged(inv,()=>inv.move(location,'safe'),'wrong-slot');assert.equal(canPlace('safe',inv.get(location)),false);}
 assert.equal(canPlace('safe',placed('archive','eligible')),true);assert.equal(canPlace('safe',{itemId:'toString'}),false);
});
check('stable quick slots accept only usable equipment and are never compacted on consumption',()=>{
 const inv=new Inventory();for(const [item,slot] of [['bandage',0],['frag',1],['scanner',3]])move(inv,add(inv,item),'quick:'+slot);
 assert(inv.consume('quick:1').ok);assert.equal(inv.get('quick:1'),null);assert.equal(inv.get('quick:3').itemId,'scanner');
 const ammo=add(inv,'ammo-rifle');unchanged(inv,()=>inv.move(ammo,'quick:2'),'wrong-slot');
});
check('bag exhaustion after a possible partial merge leaves every quantity untouched',()=>{
 const inv=new Inventory();add(inv,'ammo-pistol',59);for(let i=0;i<11;i++)add(inv,'bandage',1,{uid:'full-'+i});
 assert.equal(inv.usedSlots(),12);unchanged(inv,()=>inv.add('ammo-pistol',2),'bag-full');
 assert(inv.add('ammo-pistol',1).ok);assert.equal(inv.get('bag:0').quantity,60);
});
check('overweight additions fail atomically even when free slots remain',()=>{
 const inv=new Inventory();add(inv,'scrap',19);assert.equal(inv.weight(),28.5);assert.equal(inv.usedSlots(),4);
 unchanged(inv,()=>inv.add('scrap',2),'overweight');assert(inv.add('scrap').ok);assert.equal(inv.weight(),30);unchanged(inv,()=>inv.add('ammo-smg'),'overweight');
});
check('equipped gear and safe contents remain included in the carry limit',()=>{
 const inv=new Inventory();assert(inv.addStack(placed('armor','heavy-armor'),'armor').ok);assert(inv.addStack(placed('archive','safe-record',3),'safe').ok);add(inv,'scrap',15);
 assert.equal(inv.weight(),29.2);unchanged(inv,()=>inv.add('pistol',1,{rounds:0}),'overweight');
});
check('direct insertion cannot overwrite occupied slots or bypass mass and type limits',()=>{
 const inv=starter();unchanged(inv,()=>inv.addStack(placed('shotgun','overwrite'),'weapon:0'),'occupied');
 unchanged(inv,()=>inv.addStack(placed('archive','wrong-type'),'quick:3'),'wrong-slot');
 const heavy=new Inventory();add(heavy,'scrap',20);unchanged(heavy,()=>heavy.addStack(placed('bandage','too-heavy'),'quick:0'),'overweight');
});
check('same-slot moves succeed without losing the selected stack',()=>{
 const inv=starter(),before=inv.snapshot();assert(inv.move('weapon:0','weapon:0').ok);assert.deepEqual(inv.snapshot(),before);
});
check('whole removal keeps identity, metadata and exact round mass for drop and return',()=>{
 const inv=starter(),mass=inv.weight(),gun={...inv.get('weapon:0')},drop=inv.remove('weapon:0');assert(drop.ok);assert.deepEqual(drop.stack,gun);assert.equal(inv.get('weapon:0'),null);
 assert(Math.abs(inv.weight()+stackWeight(drop.stack)-mass)<1e-8);assert(inv.addStack(drop.stack,'weapon:0').ok);assert.equal(inv.weight(),mass);assert.deepEqual(inv.get('weapon:0'),gun);
});
check('partial removal creates a distinct output UID without changing remaining metadata',()=>{
 const inv=new Inventory();add(inv,'bandage',5,{issued:true});const source=inv.get('bag:0').uid,drop=inv.remove('bag:0',2);
 assert(drop.ok);assert.equal(drop.stack.quantity,2);assert.equal(drop.stack.issued,true);assert.notEqual(drop.stack.uid,source);assert.equal(inv.get('bag:0').quantity,3);assert.equal(inv.get('bag:0').uid,source);
 assert(inv.addStack(drop.stack).ok);assert.equal(inv.countItem('bandage'),5);assert.equal(inv.usedSlots(),2);
});
check('takeItem is atomic across stacks and returns conserved quantities',()=>{
 const inv=new Inventory();add(inv,'ammo-rifle',90);unchanged(inv,()=>inv.takeItem('ammo-rifle',91),'insufficient-items');
 const result=inv.takeItem('ammo-rifle',72);assert(result.ok);assert.equal(result.stacks.reduce((sum,stack)=>sum+stack.quantity,0),72);assert.equal(inv.countItem('ammo-rifle'),18);assert.equal(inv.usedSlots(),1);assert.equal(inv.get('bag:0'),null);
});
check('reserve operations can explicitly exclude ammo in the safe pocket',()=>{
 const inv=new Inventory();const a=add(inv,'ammo-rifle',10,{uid:'safe-ammo'});move(inv,a,'safe');add(inv,'ammo-rifle',5);
 assert.equal(inv.countItem('ammo-rifle'),15);assert.equal(inv.countItem('ammo-rifle',{bagOnly:true}),5);
 unchanged(inv,()=>inv.takeItem('ammo-rifle',6,{bagOnly:true}),'insufficient-items');assert(inv.takeItem('ammo-rifle',5,{bagOnly:true}).ok);assert.equal(inv.get('safe').quantity,10);assert.equal(inv.countItem('ammo-rifle'),10);
});
check('reserve-to-magazine transfer conserves total rounds and carry weight',()=>{
 const inv=starter(),gun=inv.get('weapon:0');gun.rounds=17;gun.chamber=1;const counts=countAll(inv),mass=inv.weight();
 assert(inv.takeItem('ammo-rifle',14,{bagOnly:true}).ok);inv.get('weapon:0').rounds=31;
 assert.deepEqual(countAll(inv),counts);assert.equal(inv.weight(),mass);assert(validateSnapshot(inv.snapshot()).ok);
});
check('empty and unchambered loaded rifle states round-trip without a free round',()=>{
 for(const [rounds,chamber] of [[0,0],[30,0],[1,1],[31,1]]){const inv=new Inventory();add(inv,'r4',1,{rounds,chamber});const restored=new Inventory(JSON.parse(JSON.stringify(inv.snapshot())));assert.equal(restored.get('bag:0').rounds,rounds);assert.equal(restored.get('bag:0').chamber,chamber);assert.equal(restored.weight(),inv.weight());}
});
check('snapshots and constructor inputs are deep copies but get supports combat updates',()=>{
 const inv=starter(),state=inv.snapshot(),restored=new Inventory(state);state.weapons[0].rounds=0;state.quick[0].quantity=1;
 assert.equal(inv.get('weapon:0').rounds,30);assert.equal(restored.get('weapon:0').rounds,30);assert.equal(restored.get('quick:0').quantity,3);
 restored.get('armor').durability=7;assert.equal(restored.snapshot().armor.durability,7);assert.equal(inv.get('armor').durability,45);
 assert.equal(restored.all().find(entry=>entry.location==='armor').stack,restored.get('armor'));
});
check('ordinary malformed mutation inputs return failure without throwing or changing state',()=>{
 const inv=starter();for(const quantity of [0,-1,.5,NaN,Infinity,'2'])unchanged(inv,()=>inv.add('bandage',quantity),'invalid-quantity');
 unchanged(inv,()=>inv.add('missing'),'unknown-item');unchanged(inv,()=>inv.add('toString'),'unknown-item');unchanged(inv,()=>inv.add('bandage',1,{extra:true}),'invalid-metadata');
 for(const location of ['bag:12','weapon:2','quick:4','bag:-1','bag:01','wat',null]){unchanged(inv,()=>inv.move('weapon:0',location),'invalid-location');unchanged(inv,()=>inv.remove(location),'invalid-location');assert.equal(inv.get(location),null);}
 unchanged(inv,()=>inv.remove('quick:0',9),'invalid-quantity');unchanged(inv,()=>inv.consume('quick:3'),'empty');unchanged(inv,()=>inv.takeItem('bandage',0),'invalid-quantity');
});
check('duplicate UID addition never duplicates or erases the original',()=>{
 const inv=starter(),uid=inv.get('quick:0').uid;unchanged(inv,()=>inv.add('bandage',1,{uid}),'duplicate-uid');unchanged(inv,()=>inv.addStack(placed('archive',uid),'safe'),'duplicate-uid');
});
check('deserialization rejects duplicate references and duplicate IDs across every section',()=>{
 const inv=starter();for(const alias of [true,false]){const state=inv.snapshot();state.bag[4]=alias?state.weapons[0]:{...state.weapons[0]};assert.equal(validateSnapshot(state).reason,alias?'duplicate-reference':'duplicate-uid');assert.throws(()=>new Inventory(state),TypeError);}
});
check('deserialization rejects sparse, malformed or missing slot arrays instead of normalizing data away',()=>{
 const states=[null,[],{},new Inventory().snapshot(),new Inventory().snapshot(),new Inventory().snapshot()];delete states[3].bag[0];states[4].quick.push(null);delete states[5].safe;
 for(const state of states){assert.equal(validateSnapshot(state).ok,false);assert.throws(()=>new Inventory(state),TypeError);}
});
check('deserialization rejects wrong equipment, overcapacity stacks and overweight',()=>{
 const wrong=starter().snapshot();wrong.safe=placed('bounty','bad-safe');assert.equal(validateSnapshot(wrong).reason,'wrong-slot');
 const stack=new Inventory().snapshot();stack.bag[0]=placed('bandage','too-many',6);assert.equal(validateSnapshot(stack).reason,'invalid-quantity');
 const heavy=new Inventory().snapshot();for(let i=0;i<4;i++)heavy.bag[i]=placed('scrap','heavy-'+i,6);assert.equal(validateSnapshot(heavy).reason,'overweight');
 const duplicate=starter().snapshot();duplicate.weapons[1]=placed('r4','duplicate-class');assert(validateSnapshot(duplicate).ok);
 for(const state of [wrong,stack,heavy])assert.throws(()=>new Inventory(state),TypeError);
});
check('invalid weapon rounds, chamber states and armor durability are rejected before pickup',()=>{
 const inv=new Inventory();for(const meta of [{rounds:-1,chamber:0},{rounds:32,chamber:1},{rounds:31,chamber:0},{rounds:0,chamber:1},{rounds:2,chamber:2},{rounds:1.5,chamber:1}])unchanged(inv,()=>inv.add('r4',1,meta));
 unchanged(inv,()=>inv.add('pistol',1,{rounds:7}),'invalid-rounds');unchanged(inv,()=>inv.add('pistol',1,{rounds:1,chamber:1}),'invalid-rounds');
 for(const durability of [-1,46,NaN,Infinity])unchanged(inv,()=>inv.add('armor',1,{durability}),'invalid-durability');
 unchanged(inv,()=>inv.add('bandage',1,{rounds:1}),'invalid-metadata');assert(validateStack(placed('armor','broken-armor',1,{durability:0})).ok);
});
check('deterministic mixed operations preserve all items except explicit consumes and drops',()=>{
 const inv=starter(),initial=countAll(inv),mass=inv.weight();
 for(let i=0;i<30;i++){
  move(inv,'weapon:0','weapon:1');move(inv,'quick:0','quick:3');move(inv,'quick:3','quick:0');
  const item=add(inv,'archive',1,{uid:'route-record-'+i}),drop=inv.remove(item);assert(drop.ok);assert.equal(drop.stack.itemId,'archive');assert.equal(drop.stack.quantity,1);
  const restored=new Inventory(JSON.parse(JSON.stringify(inv.snapshot())));assert.deepEqual(countAll(restored),initial);assert.equal(restored.weight(),mass);assert(validateSnapshot(inv.snapshot()).ok);
 }
});
check('weapon instance identity is immutable while combat values remain writable',()=>{
 const inv=starter(),gun=inv.get('weapon:0'),uid=gun.uid;
 assert.throws(()=>{gun.uid='replacement';},TypeError);assert.throws(()=>{inv.snapshot().weapons[0].uid='replacement';},TypeError);
 gun.rounds=9;gun.chamber=1;assert.equal(inv.get('weapon:0').uid,uid);assert.equal(inv.get('weapon:0').rounds,9);
 const location=add(inv,'r4',1,{rounds:3,chamber:1});assert.throws(()=>{inv.get(location).uid=uid;},TypeError);
});
check('legacy weapon metadata defaults preserve exact loaded rounds without mutating input',()=>{
 const model=require('./inventory.js');
 for(const [rounds,chamber]of [[0,0],[30,0],[1,1],[31,1]]){
  const old=placed('r4','legacy-'+rounds+'-'+chamber,1,{rounds,chamber}),before=JSON.stringify(old),state=model.weaponState(old);
  assert.equal(state.magazine+state.chamber,rounds);assert.equal(state.chamber,chamber);assert.equal(state.mode,'auto');assert.equal(state.shotSequence,0);assert.equal(JSON.stringify(old),before);
 }
});
check('versioned state and reload checkpoint are copied independently through snapshots and drops',()=>{
 const model=require('./inventory.js'),gun=placed('r4','stateful-r4',1,{rounds:17,chamber:1});gun.weaponState={...model.weaponState(gun),mode:'burst',shotSequence:40,recoveryRemaining:.72,reloadCheckpoint:{kind:'tactical',committed:true}};
 const inv=new Inventory();assert(inv.addStack(gun,'weapon:0').ok);gun.weaponState.mode='auto';gun.weaponState.reloadCheckpoint.committed=false;
 const snapshot=inv.snapshot();snapshot.weapons[0].weaponState.reloadCheckpoint.committed=false;
 assert.equal(inv.get('weapon:0').weaponState.mode,'burst');assert.equal(inv.get('weapon:0').weaponState.reloadCheckpoint.committed,true);
 const removed=inv.remove('weapon:0');assert(removed.ok);assert(inv.addStack(removed.stack,'weapon:1').ok);removed.stack.weaponState.mode='auto';
 assert.equal(inv.get('weapon:1').weaponState.mode,'burst');assert.equal(inv.get('weapon:1').weaponState.shotSequence,40);
});
check('malformed, future and mismatched instance states are rejected without normalization',()=>{
 const model=require('./inventory.js'),gun=placed('r4','validate-r4',1,{rounds:17,chamber:1}),base=model.weaponState(gun);
 for(const patch of [{version:2},{weaponId:'pistol'},{weaponInstanceId:'other'},{magazine:17},{chamber:0},{mode:'safe'},{shotSequence:-1},{shotSequence:1.5},{recoveryRemaining:Infinity},{recoveryRemaining:-.1},{reloadCheckpoint:{kind:'empty',committed:1}},{reloadCheckpoint:{kind:'empty',committed:true,extra:1}},{extra:1}]){
  const state={...gun,weaponState:{...base,...patch}};assert(!validateStack(state).ok,JSON.stringify(patch));
 }
 assert(!validateStack({...gun,weaponState:null}).ok);assert(!validateStack(placed('archive','not-gun',1,{weaponState:base})).ok);
});
check('legacy cycle state is strict and cannot silently cock or cross-bind a weapon',()=>{
 const model=require('./inventory.js'),gun=placed('shotgun','pump-state',1,{rounds:1}),state={...model.weaponState(gun),cocked:false,cycleNeeded:true,cycleRemaining:.22,recoveryRemaining:.31,shotSequence:1};
 assert(validateStack({...gun,weaponState:state}).ok);
 for(const patch of [{cocked:true},{cycleNeeded:false},{cycleRemaining:-.1},{cycleRemaining:NaN},{reloadCheckpoint:{committed:true}},{weaponInstanceId:'different'},{mode:'auto'}])assert(!validateStack({...gun,weaponState:{...state,...patch}}).ok);
});
console.log(`${checks} deterministic inventory checks passed.`);
