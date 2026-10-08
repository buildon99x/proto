'use strict';
const assert=require('node:assert/strict');
const {create,decode,KEY,BACKUP_KEY,TOMBSTONE_LIMIT}=require('./stash-profile.js');
const {Inventory,starter,stackValue}=require('./inventory.js');
let checks=0,uid=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
const copy=value=>JSON.parse(JSON.stringify(value));
function store(raw=null){
 const records=new Map(raw===null?[]:[[KEY,raw]]),calls=[];
 const faults={read:false,write:false,backupRead:false,backupWrite:false,afterWrite:false};
 return {faults,calls,get value(){return records.get(KEY)??null;},get backup(){return records.get(BACKUP_KEY)??null;},
  external(raw,key=KEY){if(raw===null)records.delete(key);else records.set(key,raw);},
  getItem(key){assert([KEY,BACKUP_KEY].includes(key));if(faults.read||(key===BACKUP_KEY&&faults.backupRead))throw Error('read denied');return records.get(key)??null;},
  setItem(key,value){assert([KEY,BACKUP_KEY].includes(key));calls.push({key,value});if(faults.write||(key===BACKUP_KEY&&faults.backupWrite))throw Error('write denied');records.set(key,value);if(key===KEY&&faults.afterWrite)throw Error('ack lost');}
 };
}
function stack(itemId,quantity=1,meta={}){return {uid:`fixture-${++uid}`,itemId,quantity,...meta};}
function record(stash=[],extra={}){return JSON.stringify({schema:3,cash:2920,level:4,stash,activeRaid:null,revision:0,settledRaids:[],...extra});}
function carry(items=[]){const inv=new Inventory();for(const [item,location]of items)assert.equal(inv.addStack(item,location).ok,true);return inv.snapshot();}
function start(s,items=[]){const profile=create(s),inventory=items.length?carry(items):starter().snapshot(),deployed=profile.deploy(inventory);assert.equal(deployed.ok,true,JSON.stringify(deployed));return {profile,inventory,id:deployed.raidId};}
function contents(snapshot){return [...snapshot.bag,...snapshot.weapons,snapshot.armor,...snapshot.quick,snapshot.safe].filter(Boolean);}

check('legacy cash 2920 and completed level migrate only in memory on read',()=>{
 const raw='{"cash":2920,"level":3,"custom":{"flag":"keep"}}',s=store(raw),p=create(s);
 assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().nextLevel,4);assert.equal(p.snapshot().known,true);
 assert.equal(s.value,raw);assert.equal(s.backup,null);assert.equal(s.calls.length,0);
 const deployed=p.deploy(starter().snapshot());assert(deployed.ok);const data=JSON.parse(s.value);
 assert.equal(data.schema,3);assert.equal(data.cash,2920);assert.equal(data.level,4);assert.deepEqual(data.custom,{flag:'keep'});assert.equal(s.backup,raw);
});
check('blank, cash-only and schema 2 saves retain compatible next levels without writes',()=>{
 for(const [raw,next]of [[null,1],['{}',1],['{"cash":2920}',1],['{"schema":2,"cash":2920,"level":7}',7]]){
  const s=store(raw),p=create(s);assert.equal(p.snapshot().nextLevel,next);assert.equal(s.value,raw);assert.equal(s.calls.length,0);
 }
 assert.equal(decode('{"schema":1,"level":5}').nextLevel,6);
});
check('backup failures block schema migration and preserve the original bytes',()=>{
 for(const mode of ['backupWrite','backupRead']){
  const raw='{"cash":2920,"level":1}',s=store(raw),p=create(s);s.faults[mode]=true;
  const r=p.deploy(starter().snapshot());assert.equal(r.ok,false);assert.equal(r.raidId,null);assert.equal(p.snapshot().status,'backup-error');
  assert.equal(p.snapshot().activeRaid,null);assert.equal(p.snapshot().pendingKind,'deploy');assert.equal(s.value,raw);
  s.faults[mode]=false;assert.equal(p.retry(),true);assert.equal(s.backup,raw);assert.equal(p.snapshot().bank,2920);assert(p.snapshot().activeRaid);
 }
});
check('migration never replaces an existing backup',()=>{
 const s=store('{"cash":2920}');s.external('earlier original',BACKUP_KEY);const {profile}=start(s);
 assert.equal(s.backup,'earlier original');assert.equal(s.calls.filter(x=>x.key===BACKUP_KEY).length,0);assert.equal(profile.snapshot().bank,2920);
});
check('preparing or cancelling a draft never withdraws stash or changes the save',()=>{
 const item=stack('archive',2),s=store(record([item])),p=create(s),raw=s.value;
 const draft=new Inventory();assert(draft.addStack(p.snapshot().stash[0]).ok);assert(draft.remove('bag:0').ok);
 assert.equal(s.value,raw);assert.deepEqual(p.snapshot().stash,[item]);assert.equal(s.calls.length,0);
});
check('deploy withdraws complete selected stacks once and preserves ammunition and armor metadata',()=>{
 const rifle=stack('r4',1,{rounds:17,chamber:1}),ammo=stack('ammo-rifle',43),armor=stack('armor',1,{durability:18.5}),keep=stack('scrap',2);
 const s=store(record([rifle,ammo,armor,keep])),inventory=carry([[rifle,'weapon:0'],[ammo,'bag:0'],[armor,'armor']]),p=create(s),r=p.deploy(inventory);
 assert(r.ok);assert.deepEqual(p.snapshot().stash,[keep]);assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().interrupted,false);
 const before=s.value;assert.equal(p.deploy(inventory).reason,'active-raid-exists');assert.equal(p.retry(),true);assert.equal(s.value,before);
 assert(p.settle(r.raidId,true,inventory,25,5).ok);assert.equal(p.snapshot().bank,2945);assert.deepEqual(p.snapshot().stash,[keep,ammo,rifle,armor]);
});
check('partial withdrawal and altered stored metadata are refused without a write',()=>{
 const ammo=stack('ammo-rifle',30),s=store(record([ammo])),p=create(s),raw=s.value;
 assert.equal(p.deploy(carry([[{...ammo,quantity:15},'bag:0']])).reason,'partial-stack-withdrawal-unsupported');
 assert.equal(p.deploy(carry([[{...ammo,issued:true},'bag:0']])).reason,'stash-item-changed');
 assert.equal(s.value,raw);assert.equal(p.snapshot().pending,false);assert.equal(s.calls.length,0);
});
check('unknown non-issued carry and duplicate identities cannot create a raid',()=>{
 const s=store(record()),p=create(s),item=stack('archive');assert.equal(p.deploy(carry([[item,'bag:0']])).reason,'item-not-in-stash');
 const invalid=starter().snapshot();invalid.bag[11]=copy(invalid.weapons[0]);assert.match(p.deploy(invalid).reason,/duplicate-uid/);
 assert.equal(p.snapshot().activeRaid,null);assert.equal(s.calls.length,0);
});
check('valid issued recovery gear deploys and remains value zero after extraction',()=>{
 const s=store(),{profile,inventory,id}=start(s);assert(profile.settle(id,true,inventory,0,2).ok);
 assert.equal(profile.snapshot().stash.length,contents(inventory).length);assert(profile.snapshot().stash.every(item=>item.issued&&stackValue(item)===0));assert.equal(profile.snapshot().bank,0);
});
check('failed deployment exposes no active raid and retries its frozen draft once',()=>{
 const item=stack('ammo-rifle',42),s=store(record([item])),p=create(s),inventory=carry([[item,'bag:0']]),raw=s.value;s.faults.write=true;
 assert.equal(p.deploy(inventory).ok,false);inventory.bag[0].quantity=1;
 assert.equal(p.snapshot().activeRaid,null);assert.deepEqual(p.snapshot().stash,[item]);assert.equal(p.snapshot().pendingKind,'deploy');assert.equal(s.value,raw);
 assert.equal(p.retry(),false);assert.equal(p.deploy(starter().snapshot()).reason,'pending-operation');s.faults.write=false;
 assert.equal(p.retry(),true);assert.equal(p.snapshot().stash.length,0);assert(p.snapshot().activeRaid);assert.equal(p.snapshot().interrupted,false);
 const committed=s.value;assert.equal(p.retry(),true);assert.equal(s.value,committed);
});
check('deployment accepted before storage throws is recognized without a second withdrawal',()=>{
 const item=stack('archive'),s=store(record([item])),p=create(s);s.faults.afterWrite=true;
 assert.equal(p.deploy(carry([[item,'safe']])).ok,false);assert.equal(p.snapshot().activeRaid,null);const written=s.value,calls=s.calls.length;
 assert.equal(p.retry(),true);assert.equal(s.value,written);assert.equal(s.calls.length,calls);assert.equal(p.snapshot().stash.length,0);assert.deepEqual(p.snapshot().activeRaid.safe,item);
});
check('extraction retains items without auto-selling and omits quest bounty items',()=>{
 const s=store(record()),{profile,inventory,id}=start(s),inv=new Inventory(inventory),loot=stack('archive',2),bounty=stack('bounty');
 assert(inv.addStack(loot).ok);assert(inv.addStack(bounty).ok);assert(profile.settle(id,true,inv.snapshot(),425,5).ok);
 assert.equal(profile.snapshot().bank,3345);assert.equal(profile.snapshot().nextLevel,5);assert(profile.snapshot().stash.some(item=>item.uid===loot.uid));
 assert(!profile.snapshot().stash.some(item=>item.itemId==='bounty'));assert.equal(profile.snapshot().activeRaid,null);
});
check('repeated settlement and reopened settlement cannot duplicate bank or stash',()=>{
 const s=store(record()),{profile,inventory,id}=start(s);assert(profile.settle(id,true,inventory,425,5).ok);const raw=s.value,calls=s.calls.length;
 assert.equal(profile.settle(id,true,inventory,425,5).alreadySettled,true);assert.equal(create(s).settle(id,true,inventory,425,5).alreadySettled,true);
 assert.equal(s.value,raw);assert.equal(s.calls.length,calls);assert.equal(profile.snapshot().bank,3345);
});
check('failed extraction keeps pending award and uses the original result on all retries',()=>{
 const s=store(record()),{profile,inventory,id}=start(s),deployed=s.value;s.faults.write=true;
 assert.equal(profile.settle(id,true,inventory,425,5).ok,false);assert.equal(profile.snapshot().bank,2920);assert.equal(profile.snapshot().pendingCash,425);assert.equal(s.value,deployed);
 assert.equal(profile.settle(id,false,null,0,4).ok,false);assert.equal(profile.snapshot().pendingCash,425);s.faults.write=false;
 assert(profile.retry());assert.equal(profile.snapshot().bank,3345);assert.equal(profile.snapshot().nextLevel,5);const raw=s.value;assert(profile.retry());assert.equal(s.value,raw);
});
check('accepted-then-thrown extraction is recognized across local retries and reopen',()=>{
 const s=store(record()),{profile,inventory,id}=start(s);s.faults.afterWrite=true;assert.equal(profile.settle(id,true,inventory,500,5).ok,false);
 assert.equal(profile.snapshot().bank,2920);const raw=s.value,calls=s.calls.length,reopened=create(s);assert.equal(reopened.snapshot().bank,3420);
 assert.equal(reopened.settle(id,true,inventory,500,5).alreadySettled,true);assert(profile.retry());assert.equal(profile.snapshot().bank,3420);assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('death retains only committed safe contents without advancing bank or contract',()=>{
 const safe=stack('archive',2),ammo=stack('ammo-rifle',50),keep=stack('scrap'),s=store(record([safe,ammo,keep]));
 const {profile,inventory,id}=start(s,[[safe,'safe'],[ammo,'bag:0']]);assert(profile.settle(id,false,inventory,999,99).ok);
 assert.deepEqual(profile.snapshot().stash,[keep,safe]);assert.equal(profile.snapshot().bank,2920);assert.equal(profile.snapshot().nextLevel,4);
 const raw=s.value;assert(profile.settle(id,false,inventory,999,99).alreadySettled);assert.equal(s.value,raw);
});
check('safe updates are durable only on success and block settlement until retry',()=>{
 const safe=stack('bandage',2),s=store(record([safe])),{profile,id}=start(s,[[safe,'safe']]),replacement=stack('archive');
 const before=s.value;s.faults.write=true;assert.equal(profile.updateSafe(id,replacement).ok,false);assert.deepEqual(profile.snapshot().activeRaid.safe,safe);assert.equal(s.value,before);
 assert.equal(profile.settle(id,false,null,0,4).reason,'pending-operation');s.faults.write=false;assert(profile.retry());assert.deepEqual(profile.snapshot().activeRaid.safe,replacement);
 assert(profile.settle(id,false,null,0,4).ok);assert.deepEqual(profile.snapshot().stash,[replacement]);
});
check('clearing the safe pocket is persisted and then loses the moved item on death',()=>{
 const safe=stack('archive'),s=store(record([safe])),{profile,id}=start(s,[[safe,'safe']]);assert(profile.updateSafe(id,null).ok);
 assert.equal(profile.snapshot().activeRaid.safe,null);const calls=s.calls.length;assert(profile.updateSafe(id,null).ok);assert.equal(s.calls.length,calls);
 assert(profile.settle(id,false,null).ok);assert.deepEqual(profile.snapshot().stash,[]);
});
check('weapons, armor, quest items and stash-duplicating safe updates are rejected',()=>{
 const keep=stack('archive'),s=store(record([keep])),{profile,id}=start(s),raw=s.value;
 for(const invalid of [stack('pistol',1,{rounds:3}),stack('armor',1,{durability:30}),stack('bounty')])assert.equal(profile.updateSafe(id,invalid).ok,false);
 assert.equal(profile.updateSafe(id,keep).reason,'active-safe-already-in-stash');assert.equal(profile.snapshot().pending,false);assert.equal(s.value,raw);
});
check('opening an interrupted raid performs no write and requires explicit loss recovery',()=>{
 const safe=stack('archive'),ammo=stack('ammo-rifle',40),s=store(record([safe,ammo])),{id}=start(s,[[safe,'safe'],[ammo,'bag:0']]);
 const raw=s.value,calls=s.calls.length,p=create(s);assert.equal(p.snapshot().interrupted,true);assert.equal(p.snapshot().status,'interrupted-raid');assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
 assert.equal(p.deploy(starter().snapshot()).reason,'interrupted-raid');assert.equal(p.settle(id,true,starter().snapshot(),500,5).reason,'interrupted-raid');
 assert(p.recoverInterrupted().ok);assert.deepEqual(p.snapshot().stash,[safe]);assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().activeRaid,null);
 const recovered=s.value;assert(p.recoverInterrupted().ok);assert.equal(s.value,recovered);
});
check('reopening after a failed safe update protects the previous saved safe item',()=>{
 const safe=stack('archive'),s=store(record([safe])),{profile,id}=start(s,[[safe,'safe']]);s.faults.write=true;
 assert.equal(profile.updateSafe(id,stack('bandage',3)).ok,false);s.faults.write=false;const reopened=create(s);assert(reopened.recoverInterrupted().ok);assert.deepEqual(reopened.snapshot().stash,[safe]);
 assert.equal(profile.retry(),false);assert.equal(profile.snapshot().status,'stale-state');assert.equal(profile.snapshot().pending,true);
});
check('failed interrupted recovery retries once and never awards a lost extraction',()=>{
 const safe=stack('archive'),s=store(record([safe]));start(s,[[safe,'safe']]);const p=create(s),raw=s.value;s.faults.write=true;
 assert.equal(p.recoverInterrupted().ok,false);assert.equal(p.snapshot().pendingKind,'recover');assert.equal(s.value,raw);s.faults.write=false;assert(p.retry());
 assert.equal(p.snapshot().bank,2920);assert.deepEqual(p.snapshot().stash,[safe]);assert.equal(p.snapshot().interrupted,false);const recovered=s.value;assert(p.retry());assert.equal(s.value,recovered);
});
check('reload after an uncommitted extraction recovers only the durable safe journal',()=>{
 const safe=stack('archive'),s=store(record([safe])),{profile,inventory,id}=start(s,[[safe,'safe']]);s.faults.write=true;
 assert.equal(profile.settle(id,true,inventory,425,5).ok,false);s.faults.write=false;const p=create(s);assert(p.recoverInterrupted().ok);
 assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().nextLevel,4);assert.deepEqual(p.snapshot().stash,[safe]);assert(profile.retry());assert.equal(profile.snapshot().bank,2920);
});
check('corrupt or unsupported saves remain untouched through every recovery operation',()=>{
 for(const raw of ['broken','null','[]','{"cash":-1}','{"level":1.5}','{"schema":9,"cash":2920}',record([],{stash:null}),record([],{revision:null}),record([],{stash:[stack('missing')]}),record([],{activeRaid:{id:'bad',safe:stack('bounty')}})]){
  const s=store(raw),p=create(s);assert.equal(p.snapshot().known,false,raw);assert.equal(p.deploy(starter().snapshot()).ok,false);assert.equal(p.retry(),false);p.recoverInterrupted();assert.equal(s.value,raw);assert.equal(s.calls.length,0);
 }
});
check('transient read failures can recover without overwriting existing bank',()=>{
 const s=store('{"cash":2920,"level":3}');s.faults.read=true;const p=create(s);assert.equal(p.snapshot().known,false);assert.equal(p.deploy(starter().snapshot()).ok,false);assert.equal(s.calls.length,0);
 s.faults.read=false;assert(p.retry());assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().nextLevel,4);assert.equal(s.calls.length,0);assert(p.deploy(starter().snapshot()).ok);
});
check('foreign storage changes are detected before deployment and require restaging',()=>{
 const item=stack('archive'),s=store(record([item])),p=create(s),other=record([item],{cash:3000,revision:1,custom:'foreign'});s.external(other);
 assert.equal(p.deploy(starter().snapshot()).reason,'save-changed-in-another-session');assert.equal(p.snapshot().status,'stale-state');assert.equal(p.snapshot().bank,3000);assert.equal(s.value,other);assert.equal(s.calls.length,0);
 assert(p.retry());assert(p.deploy(starter().snapshot()).ok);assert.equal(JSON.parse(s.value).custom,'foreign');
});
check('pending deployment never overwrites a newer foreign save or auto-merges twice',()=>{
 const item=stack('archive'),s=store(record([item])),p=create(s);s.faults.write=true;assert.equal(p.deploy(carry([[item,'safe']])).ok,false);s.faults.write=false;
 const other=record([item],{cash:3000,revision:1}),calls=s.calls.length;s.external(other);assert.equal(p.retry(),false);assert.equal(p.snapshot().status,'stale-state');assert.equal(p.snapshot().pending,true);
 assert.equal(p.retry(),false);assert.equal(s.value,other);assert.equal(s.calls.length,calls);assert.equal(p.deploy(starter().snapshot()).reason,'pending-operation');
});
check('foreign raid replaces neither an active raid nor an unchanged safe journal',()=>{
 const s=store(record()),{profile,id}=start(s),foreign=JSON.parse(s.value);foreign.activeRaid.id='foreign-raid';foreign.revision++;s.external(JSON.stringify(foreign));const raw=s.value,calls=s.calls.length;
 assert.equal(profile.updateSafe(id,null).reason,'save-changed-in-another-session');assert.equal(profile.snapshot().interrupted,true);
 assert.equal(profile.settle(id,false,null).reason,'interrupted-raid');assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('retained UID collisions and invalid awards leave the active journal unchanged',()=>{
 const keep=stack('archive'),s=store(record([keep])),{profile,inventory,id}=start(s),inv=new Inventory(inventory);assert(inv.addStack(keep).ok);const raw=s.value;
 assert.equal(profile.settle(id,true,inv.snapshot(),5,5).reason,'retained-item-already-in-stash');assert.equal(profile.settle(id,true,inventory,NaN,5).reason,'invalid-settlement');
 assert.equal(profile.settle(id,true,inventory,5,0).reason,'invalid-settlement');assert.equal(s.value,raw);assert.equal(profile.snapshot().pending,false);
});
check('snapshots and caller-owned arguments cannot mutate persistent state',()=>{
 const safe=stack('archive'),s=store(record([safe])),p=create(s),view=p.snapshot();view.stash[0].quantity=3;assert.equal(p.snapshot().stash[0].quantity,1);
 const inv=carry([[safe,'safe']]),r=p.deploy(inv);assert(r.ok);inv.safe.quantity=3;const active=p.snapshot();active.activeRaid.safe.quantity=2;assert.equal(p.snapshot().activeRaid.safe.quantity,1);
});
check('history is bounded and expired raid IDs still cannot be awarded again',()=>{
 const history=Array.from({length:TOMBSTONE_LIMIT},(_,i)=>({id:'old-'+i,win:true})),s=store(record([],{settledRaids:history})),{profile,inventory,id}=start(s);
 assert(profile.settle(id,true,inventory,10,5).ok);const data=JSON.parse(s.value);assert.equal(data.settledRaids.length,TOMBSTONE_LIMIT);assert.equal(data.settledRaids[0].id,'old-1');
 const raw=s.value;assert.equal(profile.settle('old-0',true,inventory,1000,6).reason,'raid-mismatch');assert.equal(s.value,raw);
});
check('an older open tab banking cash cannot hide preserved inventory fields on reload',()=>{const item=stack('archive'),s=store(record([item])),old=require('./save-state.js').create(s);assert(old.award(25,6));assert.equal(JSON.parse(s.value).schema,2);const p=create(s);assert.equal(p.snapshot().bank,2945);assert.equal(p.snapshot().nextLevel,6);assert.deepEqual(p.snapshot().stash,[item]);const inv=carry([[item,'bag:0']]);assert(p.deploy(inv).ok);assert.equal(JSON.parse(s.value).schema,3);assert.equal(p.snapshot().stash.length,0);});
console.log(`${checks} deterministic stash-profile checks passed.`);
