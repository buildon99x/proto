const assert=require('node:assert/strict');
const {Mission}=require('./core.js');
const I=require('./inventory.js');
const {Bridge}=require('./inventory-game.js');
let count=0;
const test=(name,fn)=>{fn();console.log('PASS',name);count++;};
function fixture(inventory=I.starter(),options={}){
 const world=new Mission(1,1,731,{world:false});world.enemies=[];world.pickups=[];world.walls=[];world._gridDirty=true;
 const bridge=new Bridge(world,inventory,{caches:false,...options});
 return {world,inventory,bridge};
}
function advance(f,seconds,step=.01){let left=seconds;while(left>1e-8){const dt=Math.min(step,left);f.bridge.beforeStep();f.world.tick(dt);f.bridge.afterStep(dt);left-=dt;}}
function addAt(inventory,id,quantity,location,meta={}){const result=inventory.add(id,quantity,meta);assert(result.ok,result.reason);if(location){assert.equal(result.locations.length,1);assert(inventory.move(result.locations[0],location).ok);}return result.locations[0];}
const total=(inventory,id)=>inventory.countItem(I.Catalog[id].ammoId)+inventory.all().filter(e=>e.stack.itemId===id).reduce((n,e)=>n+e.stack.rounds,0);
function shootRifle(f){f.world.setFireInput(true);const fired=f.world.fire(null);f.world.setFireInput(false);f.bridge.syncFromWorld();return fired;}

test('deployment inventory replaces legacy free weapons, ammo and armor',()=>{
 const f=fixture();assert.equal(f.world.weapon,3);assert.equal(f.bridge.activeSlot,0);assert.equal(f.bridge.activeUid,f.inventory.get('weapon:0').uid);
 assert.deepEqual(f.world.ammo,[6,0,0,30]);assert.deepEqual(f.world.reserve,[24,0,0,90]);assert.equal(f.world.player.armor,45);assert(f.bridge.canFire);
 const empty=fixture(new I.Inventory());assert(!empty.bridge.canFire);assert.deepEqual(empty.world.ammo,[0,0,0,0]);assert(!empty.world.fire(null));assert(!empty.bridge.equipWeapon(1).ok);assert(!empty.bridge.equipWeapon(3).ok);
});
test('pickup failure preserves world pickup and inventory atomically',()=>{
 const inventory=new I.Inventory();assert(inventory.add('pistol',12).ok);const f=fixture(inventory),pickup={type:'health',x:0,z:24,alive:true};f.world.pickups.push(pickup);
 const before=inventory.snapshot(),result=f.bridge.interact();assert(!result.ok);assert.equal(result.reason,'bag-full');assert(pickup.alive);assert.deepEqual(inventory.snapshot(),before);assert.equal(f.world.player.hp,100);
});
test('overweight pickup reports weight limit without deleting the world object',()=>{
 const inventory=new I.Inventory();assert(inventory.add('armor',5).ok);const f=fixture(inventory),pickup={type:'armor',x:0,z:24,alive:true};f.world.pickups.push(pickup);
 const before=inventory.snapshot(),result=f.bridge.interact();assert.equal(result.reason,'overweight');assert(result.message.includes('30 kg'));assert(pickup.alive);assert.deepEqual(inventory.snapshot(),before);
});
test('interact picks only the nearest item and health remains a carried medkit',()=>{
 const f=fixture(),far={type:'health',x:2,z:24,alive:true},near={type:'health',x:.3,z:24,alive:true};f.world.pickups.push(far,near);f.world.player.hp=25;
 assert.equal(f.bridge.previewNearest().item,near);assert.equal(f.bridge.previewNearest().itemId,'medkit');assert(f.bridge.interact().ok);assert(!near.alive);assert(far.alive);assert.equal(f.world.player.hp,25);assert.equal(f.inventory.countItem('medkit'),1);assert(!f.bridge.interact().ok);
 advance(f,.2);assert(f.bridge.interact().ok);assert.equal(f.inventory.countItem('medkit'),2);
});
test('cargo becomes heavy retained loot without adding cash',()=>{
 const f=fixture();f.world.cash=70;f.world.pickups.push({type:'cargo',x:0,z:24,alive:true,value:250,label:'봉인 화물'});
 const preview=f.bridge.previewNearest();assert.equal(preview.itemId,'scrap');assert.equal(preview.quantity,3);assert.equal(preview.weight,I.Catalog.scrap.weight*3);assert(f.bridge.interact().ok);assert.equal(f.inventory.countItem('scrap'),3);assert.equal(f.world.cash,70);assert.equal(f.world.cargo,3);
});
test('loot cannot be collected through solid cover',()=>{
 const f=fixture();f.world.wall(.6,24,.2,3,3);const pickup={type:'health',x:1.2,z:24,alive:true};f.world.pickups.push(pickup);assert.equal(f.bridge.nearestPickup(),null);assert(!f.bridge.interact().ok);assert(pickup.alive);
});
test('healing consumes one only when injured, and safe pocket use is rejected',()=>{
 const f=fixture(),before=f.inventory.get('quick:0').quantity;assert.equal(f.bridge.use('quick:0').reason,'full-health');assert.equal(f.inventory.get('quick:0').quantity,before);
 f.world.player.hp=50;assert(f.bridge.use('quick:0').ok);assert.equal(f.world.player.hp,80);assert.equal(f.inventory.get('quick:0').quantity,before-1);assert.equal(f.bridge.use('quick:0').reason,'cooldown');
 advance(f,.4);const location=addAt(f.inventory,'medkit',1);f.bridge.syncToWorld();assert(f.bridge.use(location).ok);assert.equal(f.world.player.hp,100);assert.equal(f.inventory.get(location),null);
 assert(f.bridge.move('quick:0','safe').ok);f.world.player.hp=50;assert.equal(f.bridge.use('safe').reason,'safe-pocket');assert(f.inventory.get('safe'));
});
test('rifle reload transfers bag reserve exactly once and preserves its completion gate after cancellation',()=>{
 const inventory=I.starter();inventory.get('weapon:0').rounds=5;const f=fixture(inventory);advance(f,.4);const initial=total(inventory,'r4');assert(f.world.load());advance(f,1.06);
 assert.equal(inventory.get('weapon:0').rounds,31);assert.equal(inventory.countItem('ammo-rifle',{bagOnly:true}),64);assert.equal(total(inventory,'r4'),initial);
 assert(f.bridge.move('quick:0','bag:5').ok);assert.equal(f.world.rifle.reload,null);assert(f.world.rifle.cooldown>.6);assert(!shootRifle(f));advance(f,.7);assert(shootRifle(f));assert.equal(total(inventory,'r4'),initial-1);
 for(let i=0;i<10;i++){f.bridge.syncFromWorld();f.bridge.syncToWorld();}assert.equal(total(inventory,'r4'),initial-1);
});
test('reload canceled before insertion never spends or duplicates reserve',()=>{
 const inventory=I.starter();inventory.get('weapon:0').rounds=5;const f=fixture(inventory);advance(f,.4);const initial=total(inventory,'r4');assert(f.world.load());advance(f,.4);assert(f.bridge.equipWeapon(1).ok);advance(f,2);
 assert.equal(inventory.get('weapon:0').rounds,5);assert.equal(inventory.countItem('ammo-rifle',{bagOnly:true}),90);assert.equal(total(inventory,'r4'),initial);
});
test('dropping an empty-reload weapon after insertion retains the unchambered magazine',()=>{
 const inventory=I.starter();Object.assign(inventory.get('weapon:0'),{rounds:0,chamber:0});const f=fixture(inventory);advance(f,.4);assert(f.world.load());advance(f,1.1);
 const drop=f.bridge.drop('weapon:0');assert(drop.ok);assert.equal(drop.stack.rounds,30);assert.equal(drop.stack.chamber,0);assert.equal(inventory.countItem('ammo-rifle',{bagOnly:true}),60);assert(f.bridge.interact().ok);
 const location=inventory.all().find(({stack})=>stack.uid===drop.stack.uid).location;assert(f.bridge.move(location,'weapon:0').ok);assert(f.bridge.equipWeapon(0).ok);advance(f,.4);assert(f.world.load());advance(f,.7);assert.equal(inventory.get('weapon:0').rounds,30);assert.equal(inventory.get('weapon:0').chamber,1);assert.equal(inventory.countItem('ammo-rifle',{bagOnly:true}),60);
});
test('legacy gun reload uses its own bag reserve and survives switches without free ammo',()=>{
 const inventory=I.starter(1);inventory.get('weapon:0').rounds=0;const f=fixture(inventory);const initial=total(inventory,'shotgun');assert(f.world.load());advance(f,2.1);
 assert.equal(inventory.get('weapon:0').rounds,2);assert.equal(inventory.countItem('ammo-shell',{bagOnly:true}),10);assert.equal(total(inventory,'shotgun'),initial);
 assert(f.bridge.equipWeapon(1).ok);advance(f,.3);assert(f.world.fire(null));f.bridge.syncFromWorld();assert.equal(inventory.get('weapon:1').rounds,5);assert.equal(inventory.get('weapon:0').rounds,2);
});
test('safe-pocket ammunition cannot feed a reload',()=>{
 const inventory=new I.Inventory();addAt(inventory,'r4',1,'weapon:0',{rounds:0,chamber:0});addAt(inventory,'ammo-rifle',30,'safe');const f=fixture(inventory);advance(f,.4);
 assert.equal(f.world.rifle.reserve,0);assert(!f.world.load());assert.equal(inventory.get('safe').quantity,30);
});
test('partial drop and weapon drop/pickup preserve quantities, identity and loaded rounds',()=>{
 const f=fixture();advance(f,.4);assert(shootRifle(f));const before=total(f.inventory,'r4'),uid=f.inventory.get('weapon:0').uid,rounds=f.inventory.get('weapon:0').rounds;
 const dropped=f.bridge.drop('weapon:0',{yaw:0});assert(dropped.ok);assert.equal(dropped.stack.uid,uid);assert.equal(dropped.stack.rounds,rounds);assert.equal(f.world.ammo[3],0);assert.equal(f.world.rifle.total,0);assert.equal(f.world.weapon,0);
 assert.equal(total(f.inventory,'r4')+dropped.stack.rounds,before);assert(f.bridge.interact().ok);assert(!dropped.item.alive);const where=f.inventory.all().find(entry=>entry.stack.uid===uid).location;assert(f.bridge.move(where,'weapon:0').ok);assert(f.bridge.equipWeapon(0).ok);assert.equal(f.world.rifle.total,rounds);assert.equal(total(f.inventory,'r4'),before);
 const quantity=f.inventory.get('quick:0').quantity,originalUid=f.inventory.get('quick:0').uid,partial=f.bridge.drop('quick:0',{quantity:1});assert(partial.ok);assert.equal(partial.stack.quantity,1);assert.notEqual(partial.stack.uid,originalUid);assert.equal(f.inventory.get('quick:0').quantity,quantity-1);
});
test('equipped armor damage persists through dropping and equipping it again',()=>{
 const f=fixture();f.world.damage(20);f.bridge.syncFromWorld();assert.equal(f.inventory.get('armor').durability,32);const drop=f.bridge.drop('armor');assert(drop.ok);assert.equal(drop.stack.durability,32);assert.equal(f.world.player.armor,0);
 assert(f.bridge.interact().ok);const entry=f.inventory.all().find(({stack})=>stack.uid===drop.stack.uid);assert(f.bridge.move(entry.location,'armor').ok);assert.equal(f.world.player.armor,32);
});
test('paused bag swaps preserve pause and cannot bypass rifle switching or fire gates',()=>{
 const f=fixture();advance(f,.4);f.world.setPaused(true);assert(f.bridge.equipWeapon(1).ok);assert(f.world.paused);assert(!f.bridge.canFire);assert(f.bridge.equipWeapon(0).ok);assert(f.world.rifle.paused);assert(f.world.rifle.cooldown>0);assert(!shootRifle(f));
 f.world.setPaused(false);assert(!shootRifle(f));advance(f,.4);assert(shootRifle(f));
});
test('scanner reveals nearby living enemies without alerting and expires after eight seconds',()=>{
 const f=fixture(),near={id:0,x:10,z:24,y:0,hp:70,alive:true,alert:false,activationRange:.01,leash:.01},far={id:1,x:40,z:24,hp:70,alive:true,alert:false};
 f.world.enemies=[near,far];assert(f.bridge.use('quick:2').ok);assert.equal(f.inventory.get('quick:2'),null);assert.equal(f.bridge.scannerRemaining,8);assert(f.bridge.isScanned(near));assert(!f.bridge.isScanned(far));assert(!near.alert);
 advance(f,7.9);assert(f.bridge.isScanned(near));assert(!near.alert);advance(f,.2);assert.equal(f.bridge.scannerRemaining,0);assert(!f.bridge.isScanned(near));
});
test('grenade has visible two-second flight, bounces off cover and explodes once',()=>{
 const f=fixture();f.world.wall(0,22,8,1,5);const result=f.bridge.use('quick:1',{yaw:0,pitch:0});assert(result.ok);assert.equal(f.bridge.throwables.length,1);const g=result.throwable;
 assert(g.vz<0);advance(f,1.9);assert(g.alive);assert(g.z>22.5);assert(g.fuse>0);advance(f,.11);assert(!g.alive);assert.equal(f.bridge.throwables.length,0);assert.equal(f.world.events.filter(e=>e.type==='explosion'&&e.kind==='frag').length,1);
 advance(f,.5);assert.equal(f.world.events.filter(e=>e.type==='explosion'&&e.kind==='frag').length,1);
});
test('grenade blast respects range and solid cover, hurts self and rewards a kill only once',()=>{
 const f=fixture();f.world.wall(-1,24,.4,4,4);
 const enemy=(id,x,hp=40)=>({id,x,z:24,y:0,hp,alive:true,alert:false,attack:1000,activationRange:.01,leash:.01});
 const exposed=enemy(0,2),covered=enemy(1,-2),distant=enemy(2,10);f.world.enemies=[exposed,covered,distant];
 const used=f.bridge.use('quick:1');assert(used.ok);Object.assign(used.throwable,{x:0,y:.11,z:24,vx:0,vy:0,vz:0,fuse:.1});advance(f,.11);
 assert(!exposed.alive);assert.equal(covered.hp,40);assert.equal(distant.hp,40);assert(f.world.player.hp<100);assert.equal(f.world.kills,1);assert.equal(f.world.cash,70);advance(f,.5);assert.equal(f.world.kills,1);assert.equal(f.world.cash,70);
});
test('bounty requires bag capacity and bridge extraction uses the original six-second hold',()=>{
 const inventory=new I.Inventory();assert(inventory.add('pistol',12).ok);const full=fixture(inventory);full.world.pickups.push({type:'bounty',x:0,z:24,alive:true});assert(!full.bridge.interact().ok);assert(!full.world.bounty);assert(full.world.pickups[0].alive);
 const f=fixture();f.world.interact=()=>{throw new Error('Legacy auto-consumption is forbidden');};f.world.pickups.push({type:'bounty',x:0,z:24,alive:true});assert(f.bridge.interact().ok);assert(f.world.bounty);assert(f.bridge.interact().extraction);assert.equal(f.world.extractionRequired,6);advance(f,5.9);assert(!f.world.extracted);advance(f,.2);assert(f.world.extracted);
});
test('dropping the bounty cancels extraction, and recovering it requires a fresh hold',()=>{
 const f=fixture();f.world.pickups.push({type:'bounty',x:0,z:24,alive:true});assert(f.bridge.interact().ok);assert(f.bridge.interact().ok);advance(f,2);
 const location=f.inventory.all().find(({stack})=>stack.itemId==='bounty').location;assert(f.bridge.drop(location).ok);assert(!f.world.bounty);assert.equal(f.world.extractionZone,null);assert.equal(f.world.extractionProgress,0);advance(f,5);assert(!f.world.extracted);
 assert(f.bridge.interact().ok);assert(f.bridge.interact().ok);advance(f,6.1);assert(f.world.extracted);
});
test('existing region receives reachable category caches once at its authored landmarks',()=>{
 const world=new Mission(),bridge=new Bridge(world,I.starter()),caches=world.pickups.filter(p=>p.type==='inventory');assert(caches.length>=10);
 for(const category of ['weapon','armor','health','gadget','throwable','ammo','loot'])assert(caches.some(p=>I.Catalog[p.stack.itemId].category===category),category);
 for(const cache of caches){const landmark=world.landmarks.find(l=>l.id===cache.cache);assert(landmark);assert(Math.hypot(cache.x-landmark.x,cache.z-landmark.z)<landmark.radius+5);assert(!world.blocked(cache.x,cache.z,.22,0,.45));}
 const length=world.pickups.length;bridge.addCaches();assert.equal(world.pickups.length,length);
});
test('inventory interruption resumes an uncocked loaded legacy firearm with normal recovery',()=>{
 for(const wi of [0,1]){const f=fixture(I.starter(wi));advance(f,.5);assert(f.world.fire(null));assert(f.world.load());assert(!f.world.cocked);assert(f.bridge.move('quick:0','quick:3').ok);assert(!f.world.fire(null),'interruption cannot grant an immediate shot');advance(f,3);assert(f.world.cocked);assert(f.world.fire(null));}
});
test('dropping the final uncocked gun cannot produce a phantom automatic cycle',()=>{const f=fixture(I.starter(0));assert(f.world.fire(null));assert(f.world.load());assert(f.bridge.drop('weapon:0').ok);f.world.events=[];advance(f,1);assert(!f.bridge.canFire);assert(!f.world.events.some(e=>e.type==='cycle'));});
console.log('FINAL: '+count+' inventory/mission bridge tests passed');
