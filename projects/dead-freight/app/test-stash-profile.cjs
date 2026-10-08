'use strict';
const assert=require('node:assert/strict');
const {create,decode,KEY,BACKUP_KEY,BACKUP_V3_KEY,SCHEMA,TOMBSTONE_LIMIT,EXPANSION_COSTS}=require('./stash-profile.js');
const {Inventory,starter,stackValue}=require('./inventory.js');
let checks=0,uid=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
const copy=value=>JSON.parse(JSON.stringify(value));
function store(raw=null){
 const records=new Map(raw===null?[]:[[KEY,raw]]),calls=[];
 const faults={read:false,write:false,backupRead:false,backupWrite:false,afterWrite:false};
 return {faults,calls,get value(){return records.get(KEY)??null;},get backup(){return records.get(BACKUP_KEY)??null;},get backupV3(){return records.get(BACKUP_V3_KEY)??null;},
  external(raw,key=KEY){if(raw===null)records.delete(key);else records.set(key,raw);},
  getItem(key){assert([KEY,BACKUP_KEY,BACKUP_V3_KEY].includes(key));if(faults.read||(key!==KEY&&faults.backupRead))throw Error('read denied');return records.get(key)??null;},
  setItem(key,value){assert([KEY,BACKUP_KEY,BACKUP_V3_KEY].includes(key));calls.push({key,value});if(faults.write||(key!==KEY&&faults.backupWrite))throw Error('write denied');records.set(key,value);if(key===KEY&&faults.afterWrite)throw Error('ack lost');}
 };
}
function stack(itemId,quantity=1,meta={}){return {uid:`fixture-${++uid}`,itemId,quantity,...meta};}
function record(stash=[],extra={}){return JSON.stringify({schema:3,cash:2920,level:4,stash,activeRaid:null,revision:0,settledRaids:[],...extra});}
function home(stash=[],extra={}){return record(stash,{schema:4,stashTier:0,recovery:[],stashReceipts:[],...extra});}
function filled(count=24){return Array.from({length:count},()=>stack('scrap'));}
function carry(items=[]){const inv=new Inventory();for(const [item,location]of items)assert.equal(inv.addStack(item,location).ok,true);return inv.snapshot();}
function start(s,items=[]){const profile=create(s),inventory=items.length?carry(items):starter().snapshot(),deployed=profile.deploy(inventory);assert.equal(deployed.ok,true,JSON.stringify(deployed));return {profile,inventory,id:deployed.raidId};}
function contents(snapshot){return [...snapshot.bag,...snapshot.weapons,snapshot.armor,...snapshot.quick,snapshot.safe].filter(Boolean);}

check('legacy cash 2920 and completed level migrate only in memory on read',()=>{
 const raw='{"cash":2920,"level":3,"custom":{"flag":"keep"}}',s=store(raw),p=create(s);
 assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().nextLevel,4);assert.equal(p.snapshot().known,true);
 assert.equal(s.value,raw);assert.equal(s.backup,null);assert.equal(s.calls.length,0);
 const deployed=p.deploy(starter().snapshot());assert(deployed.ok);const data=JSON.parse(s.value);
 assert.equal(data.schema,SCHEMA);assert.equal(data.cash,2920);assert.equal(data.level,4);assert.deepEqual(data.custom,{flag:'keep'});assert.equal(s.backup,raw);
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
check('an older open tab banking cash cannot hide preserved inventory fields on reload',()=>{const item=stack('archive'),s=store(record([item])),old=require('./save-state.js').create(s);assert(old.award(25,6));assert.equal(JSON.parse(s.value).schema,2);const p=create(s);assert.equal(p.snapshot().bank,2945);assert.equal(p.snapshot().nextLevel,6);assert.deepEqual(p.snapshot().stash,[item]);const inv=carry([[item,'bag:0']]);assert(p.deploy(inv).ok);assert.equal(JSON.parse(s.value).schema,SCHEMA);assert.equal(p.snapshot().stash.length,0);});

check('schema 1/2/3 reads expose default stash capacity without changing exact cash or contents',()=>{
 const items=[stack('r4',1,{rounds:19,chamber:1}),stack('armor',1,{durability:16.25}),stack('archive',3)];
 for(const schema of [1,2,3]){
  const raw=record(items,{schema,custom:{nested:['retained']}}),s=store(raw),p=create(s),v=p.snapshot();
  assert.equal(v.known,true);assert.equal(v.bank,2920);assert.equal(v.capacity,24);assert.equal(v.used,3);assert.equal(v.available,21);assert.equal(v.tier,0);assert.equal(v.nextCost,500);assert.equal(v.nextCapacity,32);assert.deepEqual(v.recovery,[]);
  assert.deepEqual(v.stash,items);assert.equal(s.value,raw);assert.equal(s.calls.length,0);
 }
});
check('schema 3 first write backs up its original bytes separately and preserves both backups',()=>{
 const raw=record([stack('archive')],{custom:{keep:true}}),s=store(raw),p=create(s);s.external('old-v2',BACKUP_KEY);
 assert(p.expandStash({expectedLevel:0,requestId:'first-upgrade'}).ok);assert.equal(s.backupV3,raw);assert.equal(s.backup,'old-v2');
 assert.equal(p.snapshot().bank,2420);assert.equal(p.snapshot().tier,1);assert.deepEqual(JSON.parse(s.value).custom,{keep:true});
 const second=store(raw);second.external('older-v3',BACKUP_V3_KEY);assert(create(second).expandStash({expectedLevel:0,requestId:'different-upgrade'}).ok);assert.equal(second.backupV3,'older-v3');
});
check('schema 3 backup failures leave upgrades pending without spending virtual currency',()=>{
 for(const mode of ['backupRead','backupWrite']){
  const raw=record(filled(25)),s=store(raw),p=create(s);s.faults[mode]=true;
  assert.equal(p.expandStash({expectedLevel:0,requestId:'backup-'+mode}).ok,false);assert.equal(p.snapshot().status,'backup-error');assert.equal(p.snapshot().tier,0);assert.equal(p.snapshot().bank,2920);assert.equal(s.value,raw);
  s.faults[mode]=false;assert(p.retry());assert.equal(s.backupV3,raw);assert.equal(p.snapshot().tier,1);assert.equal(p.snapshot().bank,2420);assert.equal(p.snapshot().used,25);
 }
});
check('all five exact expansion prices persist capacity and bank in one profile write each',()=>{
 const s=store(home([],{cash:10000})),p=create(s);let balance=10000;
 for(let tier=0;tier<EXPANSION_COSTS.length;tier++){
  const before=s.calls.length,r=p.expandStash({expectedLevel:tier,requestId:'tier-'+tier});assert(r.ok);balance-=EXPANSION_COSTS[tier];
  assert.equal(s.calls.length,before+1);assert.equal(p.snapshot().bank,balance);assert.equal(p.snapshot().capacity,24+(tier+1)*8);assert.equal(p.snapshot().tier,tier+1);
  const reopened=create(s);assert.equal(reopened.snapshot().bank,balance);assert.equal(reopened.snapshot().tier,tier+1);
 }
 assert.equal(p.snapshot().capacity,64);assert.equal(p.snapshot().nextCost,null);assert.equal(p.snapshot().nextCapacity,null);
 const raw=s.value;assert.equal(p.expandStash({expectedLevel:5,requestId:'max'}).reason,'stash-at-maximum');assert.equal(s.value,raw);
});
check('invalid requests, stale tier quotes and insufficient bank never mutate the save',()=>{
 const s=store(home([],{cash:499})),p=create(s),raw=s.value;
 assert.equal(p.expandStash({expectedLevel:0,requestId:'poor'}).reason,'insufficient-funds');
 assert.equal(p.expandStash({expectedLevel:1,requestId:'old'}).reason,'stale-expansion-quote');
 for(const options of [null,{}, {expectedLevel:-1,requestId:'x'},{expectedLevel:1.2,requestId:'x'},{expectedLevel:6,requestId:'x'}])assert.equal(p.expandStash(options).reason,'invalid-expansion-level');
 for(const requestId of [undefined,'',14,'x'.repeat(201)])assert.equal(p.expandStash({expectedLevel:0,requestId}).reason,'invalid-request-id');
 assert.equal(s.value,raw);assert.equal(s.calls.length,0);
});
check('same purchase request stays idempotent across reloads and later purchases',()=>{
 const s=store(home()),p=create(s),first={expectedLevel:0,requestId:'buy-once'};assert(p.expandStash(first).ok);assert(p.expandStash({expectedLevel:1,requestId:'buy-next'}).ok);
 const raw=s.value,calls=s.calls.length;for(const q of [p,create(s)]){const r=q.expandStash(first);assert(r.ok);assert(r.alreadyApplied);assert.equal(r.receipt.cost,500);assert.equal(q.snapshot().bank,1670);assert.equal(q.snapshot().tier,2);}
 assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
 assert.equal(p.expandStash({expectedLevel:2,requestId:'buy-once'}).reason,'request-id-conflict');assert.equal(s.value,raw);
});
check('failed purchases freeze the request and retry one debit even when the caller repeats',()=>{
 const s=store(home()),p=create(s),raw=s.value,quote={expectedLevel:0,requestId:'retry-buy'};s.faults.write=true;
 assert.equal(p.expandStash(quote).ok,false);assert.equal(p.snapshot().pendingKind,'expand');assert.equal(p.snapshot().bank,2920);assert.equal(p.snapshot().tier,0);assert.equal(s.value,raw);
 assert.equal(p.expandStash({...quote,expectedLevel:1}).reason,'request-id-conflict');assert.equal(p.expandStash({...quote,requestId:'other'}).reason,'pending-operation');
 s.faults.write=false;assert(p.expandStash(quote).ok);const committed=s.value;assert(p.retry());assert.equal(s.value,committed);assert.equal(p.snapshot().bank,2420);
});
check('accepted purchase with lost acknowledgement resolves through its durable receipt',()=>{
 const s=store(home()),p=create(s),first={expectedLevel:0,requestId:'lost-ack'};s.faults.afterWrite=true;
 assert.equal(p.expandStash(first).ok,false);assert.equal(p.snapshot().bank,2920);s.faults.afterWrite=false;
 const reopened=create(s);assert(reopened.expandStash(first).alreadyApplied);assert(reopened.expandStash({expectedLevel:1,requestId:'later-buy'}).ok);
 const raw=s.value,calls=s.calls.length;assert(p.retry());assert.equal(p.snapshot().bank,1670);assert.equal(p.snapshot().tier,2);assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('stale purchase tabs must restage and cannot replay an old tier quote',()=>{
 const s=store(home()),a=create(s),b=create(s);assert(a.expandStash({expectedLevel:0,requestId:'tab-a'}).ok);
 assert.equal(b.expandStash({expectedLevel:0,requestId:'tab-b'}).reason,'save-changed-in-another-session');assert.equal(b.snapshot().bank,2420);
 assert.equal(b.expandStash({expectedLevel:0,requestId:'tab-b'}).reason,'stale-expansion-quote');assert.equal(b.snapshot().pending,false);assert.equal(JSON.parse(s.value).cash,2420);
});
check('pending purchases never overwrite a newer foreign profile',()=>{
 const s=store(home()),p=create(s);s.faults.write=true;assert.equal(p.expandStash({expectedLevel:0,requestId:'pending-old'}).ok,false);s.faults.write=false;
 assert(create(s).expandStash({expectedLevel:0,requestId:'foreign'}).ok);const raw=s.value,calls=s.calls.length;assert.equal(p.retry(),false);assert.equal(p.snapshot().status,'stale-state');assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('legacy over-capacity stash is never truncated or silently moved on read or upgrade',()=>{
 const items=filled(70),raw=record(items),s=store(raw),p=create(s),v=p.snapshot();assert.equal(v.used,70);assert.equal(v.overCapacity,46);assert.equal(v.available,0);assert.deepEqual(v.stash,items);assert.equal(s.value,raw);
 assert(p.expandStash({expectedLevel:0,requestId:'legacy-space'}).ok);assert.equal(p.snapshot().capacity,32);assert.equal(p.snapshot().overCapacity,38);assert.deepEqual(p.snapshot().stash,items);assert.deepEqual(p.snapshot().recovery,[]);
});
check('extraction fills remaining stack slots and journals every overflow item durably',()=>{
 const keep=filled(23),s=store(home(keep)),{profile,inventory,id}=start(s),inv=new Inventory(inventory),loot=stack('archive',2);assert(inv.addStack(loot).ok);
 const retained=contents(inv.snapshot());assert(profile.settle(id,true,inv.snapshot(),425,5).ok);const v=profile.snapshot();
 assert.equal(v.used,24);assert.deepEqual(v.stash,keep.concat(retained.slice(0,1)));assert.deepEqual(v.recovery,retained.slice(1));assert.equal(v.bank,3345);assert.equal(v.nextLevel,5);
 const reopened=create(s);assert.deepEqual(reopened.snapshot().recovery,v.recovery);assert.equal(reopened.deploy(starter().snapshot()).reason,'recovery-required');
 const raw=s.value;assert(profile.settle(id,true,inv.snapshot(),425,5).alreadySettled);assert.equal(s.value,raw);
});
check('full-stash death and interrupted recovery retain the protected item in the queue',()=>{
 for(const recover of [false,true]){
  const items=filled(),safe=stack('archive',3),s=store(home(items,{activeRaid:{id:'full-death-'+recover,safe}})),p=create(s);
  // The saved active raid is deliberately resumed only through the explicit
  // interrupted-raid path. A live raid uses an owned journal created by deploy.
  if(recover){assert(p.recoverInterrupted().ok);assert.deepEqual(p.snapshot().recovery,[safe]);}
  else{
   const liveStore=store(home(items)),live=start(liveStore),replacement=stack('archive',2);assert(live.profile.updateSafe(live.id,replacement).ok);assert(live.profile.settle(live.id,false,null,100,9).ok);assert.deepEqual(live.profile.snapshot().recovery,[replacement]);assert.equal(live.profile.snapshot().bank,2920);assert.equal(live.profile.snapshot().nextLevel,4);
  }
 }
});
check('failed overflow settlement keeps its exact pending result and no partial retention',()=>{
 const s=store(home(filled())),{profile,inventory,id}=start(s),raw=s.value;s.faults.write=true;assert.equal(profile.settle(id,true,inventory,50,5).ok,false);
 assert.equal(s.value,raw);assert.deepEqual(profile.snapshot().recovery,[]);assert.equal(profile.snapshot().bank,2920);s.faults.write=false;assert(profile.retry());assert.deepEqual(profile.snapshot().recovery,contents(inventory));assert.equal(profile.snapshot().bank,2970);
});
check('over-capacity legacy active raids still settle without losing retained stacks',()=>{
 const old=filled(70),safe=stack('archive'),s=store(record(old,{activeRaid:{id:'legacy-full-raid',safe}})),p=create(s);assert(p.recoverInterrupted().ok);assert.deepEqual(p.snapshot().stash,old);assert.deepEqual(p.snapshot().recovery,[safe]);assert.equal(p.snapshot().bank,2920);assert.equal(s.backupV3!==null,true);
});
check('expanding does not auto-claim or remove the deployment recovery gate',()=>{
 const recovery=[stack('archive'),stack('scrap',2)],s=store(home(filled(),{recovery})),p=create(s);assert(p.expandStash({expectedLevel:0,requestId:'space-for-recovery'}).ok);
 assert.deepEqual(p.snapshot().recovery,recovery);assert.equal(p.snapshot().available,8);assert.equal(p.deploy(starter().snapshot()).reason,'recovery-required');
 const r=p.claimRecovery('all','claim-everything');assert(r.ok);assert.equal(r.claimed,2);assert.equal(p.snapshot().used,26);assert.deepEqual(p.snapshot().recovery,[]);assert(p.deploy(starter().snapshot()).ok);
});
check('claim-all fills only free slots and keeps the rest in order, with repeat-safe receipts',()=>{
 const keep=filled(22),recovery=filled(4),s=store(home(keep,{recovery})),p=create(s),r=p.claimRecovery('all','partial-claim');assert(r.ok);assert.equal(r.claimed,2);
 assert.deepEqual(p.snapshot().stash,keep.concat(recovery.slice(0,2)));assert.deepEqual(p.snapshot().recovery,recovery.slice(2));const raw=s.value,calls=s.calls.length;
 assert(create(s).claimRecovery('all','partial-claim').alreadyApplied);assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
 assert.equal(p.claimRecovery(recovery[2].uid,'no-space').reason,'stash-full');assert.equal(s.value,raw);assert.equal(p.claimRecovery('missing','missing').reason,'recovery-item-not-found');
});
check('claim-one preserves identity and metadata, and snapshot edits cannot mutate recovery',()=>{
 const rifle=stack('r4',1,{rounds:21,chamber:1}),armor=stack('armor',1,{durability:7.5}),s=store(home([],{recovery:[rifle,armor]})),p=create(s),view=p.snapshot();view.recovery[0].rounds=0;
 assert.equal(p.snapshot().recovery[0].rounds,21);assert(p.claimRecovery(armor.uid,'claim-armor').ok);assert.deepEqual(p.snapshot().stash,[armor]);assert.deepEqual(p.snapshot().recovery,[rifle]);
 assert.equal(p.claimRecovery(rifle.uid,'claim-armor').reason,'request-id-conflict');const inv=carry([[armor,'armor']]);assert.equal(p.deploy(inv).reason,'recovery-required');assert(p.claimRecovery(rifle.uid).ok);assert(p.deploy(inv).ok);
});
check('failed and accepted-then-thrown claims conserve items through retry and reload',()=>{
 for(const mode of ['write','afterWrite']){
  const recovery=filled(2),s=store(home([],{recovery})),p=create(s);s.faults[mode]=true;assert.equal(p.claimRecovery('all','claim-fault').ok,false);assert.deepEqual(p.snapshot().stash,[]);assert.deepEqual(p.snapshot().recovery,recovery);s.faults[mode]=false;
  if(mode==='afterWrite')assert(create(s).claimRecovery('all','claim-fault').alreadyApplied);
  assert(p.claimRecovery('all','claim-fault').ok);assert.deepEqual(p.snapshot().stash,recovery);assert.deepEqual(p.snapshot().recovery,[]);const raw=s.value;assert(p.retry());assert.equal(s.value,raw);
 }
});
check('whole-stack sales use catalog value including loaded ammunition and preserve unrelated stacks',()=>{
 const rifle=stack('r4',1,{rounds:21,chamber:1}),archive=stack('archive',3),armor=stack('armor',1,{durability:7.5}),s=store(home([rifle,archive],{recovery:[armor]})),p=create(s);
 for(const [source,item]of [['stash',rifle],['stash',archive],['recovery',armor]]){
  const before=p.snapshot().bank,r=p.sellStack(source,item.uid,'sell-'+item.uid);assert(r.ok);assert.equal(r.value,stackValue(item));assert.equal(p.snapshot().bank,before+stackValue(item));assert(!p.snapshot()[source].some(stack=>stack.uid===item.uid));
 }
 assert.equal(p.snapshot().bank,4302);assert.equal(p.snapshot().used,0);assert.equal(p.snapshot().recoveryCount,0);
});
check('issued gear sales yield zero and do not invent or normalize owned inventory',()=>{
 const issued=stack('r4',1,{rounds:31,chamber:1,issued:true}),keep=stack('archive'),s=store(home([issued,keep])),p=create(s),r=p.sellStack('stash',issued.uid,'sell-issued');assert(r.ok);assert.equal(r.value,0);assert.equal(p.snapshot().bank,2920);assert.deepEqual(p.snapshot().stash,[keep]);
 const raw=s.value,calls=s.calls.length;assert(create(s).sellStack('stash',issued.uid,'sell-issued').alreadyApplied);assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('sales cannot authorize a different source or item with the same request receipt',()=>{
 const a=stack('archive'),b=stack('scrap'),s=store(home([a,b])),p=create(s);assert(p.sellStack('stash',a.uid,'sale-once').ok);const raw=s.value;
 assert.equal(p.sellStack('stash',b.uid,'sale-once').reason,'request-id-conflict');assert.equal(p.sellStack('recovery',a.uid,'sale-once').reason,'request-id-conflict');assert.equal(p.sellStack('other',b.uid,'bad-source').reason,'invalid-sale');assert.equal(p.sellStack('stash','missing','missing').reason,'item-not-found');assert.equal(p.sellStack('stash',b.uid).reason,'invalid-request-id');assert.equal(s.value,raw);
});
check('failed sale freezes the full stack and credits once after retry',()=>{
 const item=stack('archive',3),s=store(home([item])),p=create(s),raw=s.value;s.faults.write=true;assert.equal(p.sellStack('stash',item.uid,'sale-fail').ok,false);assert.equal(p.snapshot().bank,2920);assert.deepEqual(p.snapshot().stash,[item]);assert.equal(s.value,raw);s.faults.write=false;
 assert(p.sellStack('stash',item.uid,'sale-fail').ok);assert.equal(p.snapshot().bank,3460);assert.deepEqual(p.snapshot().stash,[]);const saved=s.value;assert(p.retry());assert.equal(s.value,saved);
});
check('accepted-then-thrown sale recognizes its receipt after another mutation and reopen',()=>{
 const item=stack('archive',2),keep=stack('scrap'),s=store(home([item,keep])),p=create(s);s.faults.afterWrite=true;assert.equal(p.sellStack('stash',item.uid,'sale-lost-ack').ok,false);s.faults.afterWrite=false;
 const reopened=create(s);assert(reopened.sellStack('stash',item.uid,'sale-lost-ack').alreadyApplied);assert(reopened.expandStash({expectedLevel:0,requestId:'after-sale'}).ok);const raw=s.value,calls=s.calls.length;
 assert(p.retry());assert.equal(p.snapshot().bank,2780);assert.deepEqual(p.snapshot().stash,[keep]);assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
});
check('sold draft reservations cannot deploy the sold item and recovery sales unblock deployment',()=>{
 const item=stack('archive'),recovery=stack('scrap'),s=store(home([item],{recovery:[recovery]})),p=create(s),draft=carry([[item,'safe']]);assert(p.sellStack('stash',item.uid,'sell-draft').ok);assert(p.sellStack('recovery',recovery.uid,'sell-recovery').ok);
 assert.equal(p.deploy(draft).reason,'item-not-in-stash');assert.equal(p.snapshot().activeRaid,null);assert(p.deploy(starter().snapshot()).ok);
});
check('all new home actions refuse to mutate a live or interrupted raid',()=>{
 const item=stack('archive'),s=store(home([item])),{profile,id}=start(s),raw=s.value;
 for(const p of [profile,create(s)]){
  assert.equal(p.expandStash({expectedLevel:0,requestId:'during-raid'}).reason,'active-raid-exists');assert.equal(p.sellStack('stash',item.uid,'during-raid-sale').reason,'active-raid-exists');assert.equal(p.claimRecovery('all','during-raid-claim').reason,'active-raid-exists');
 }
 assert.equal(s.value,raw);assert(profile.settle(id,false,null).ok);
});
check('an older bank writer preserves tier, recovery, receipts and custom fields on schema downgrade',()=>{
 const item=stack('archive'),s=store(home([],{recovery:[item],custom:{keep:'yes'}})),p=create(s);assert(p.expandStash({expectedLevel:0,requestId:'preserved-purchase'}).ok);const old=require('./save-state.js').create(s);assert(old.award(25,6));assert.equal(JSON.parse(s.value).schema,2);
 const reopened=create(s),view=reopened.snapshot();assert.equal(view.tier,1);assert.equal(view.capacity,32);assert.equal(view.bank,2445);assert.deepEqual(view.recovery,[item]);assert(reopened.expandStash({expectedLevel:0,requestId:'preserved-purchase'}).alreadyApplied);assert(reopened.claimRecovery('all','mixed-claim').ok);assert.equal(JSON.parse(s.value).schema,4);assert.deepEqual(JSON.parse(s.value).custom,{keep:'yes'});
});
check('malformed progression, receipts, duplicate identities and future schema are preserved unreadable',()=>{
 const item=stack('archive'),receipt={id:'purchase',kind:'expand',expectedLevel:0,tier:1,cost:500};
 const bad=[{stashTier:-1},{stashTier:6},{stashTier:1.5},{stashTier:null},{recovery:null},{stashReceipts:null},{stashReceipts:[receipt]},{stashTier:1,stashReceipts:[receipt,receipt]},{stashTier:1,stashReceipts:[receipt,{...receipt,id:'duplicate-tier'}]},{stashTier:1,stashReceipts:[{...receipt,cost:1}]},{recovery:[item,item]},{stash:[item],recovery:[item]},{recovery:[stack('unknown')]},{schema:5},{schema:4,stashTier:undefined},{schema:2,stashTier:1,recovery:undefined},{cash:null},{level:null},{stash:undefined},{activeRaid:undefined},{revision:undefined},{settledRaids:undefined},{stashReceipts:[{id:'bad-sale',kind:'sell',source:'stash',uid:'x',value:-1}]},{stashReceipts:[{id:'bad-claim',kind:'claim',target:'all',uids:[]}]}];
 for(const extra of bad){const raw=home([],extra),s=store(raw),p=create(s);assert.equal(p.snapshot().known,false,raw);assert.equal(p.expandStash({expectedLevel:0,requestId:'bad-save'}).ok,false);assert.equal(p.sellStack('stash',item.uid,'bad-sale').ok,false);assert.equal(p.claimRecovery('all','bad-claim').ok,false);assert.equal(p.retry(),false);assert.equal(s.value,raw);assert.equal(s.calls.length,0);}
});
check('stale home sales and claims require restaging without duplicating items or credits',()=>{
 for(const kind of ['sell','claim']){
  const item=stack('archive'),s=store(home(kind==='sell'?[item]:[],{recovery:kind==='claim'?[item]:[]})),a=create(s),b=create(s);
  const action=(p,id)=>kind==='sell'?p.sellStack('stash',item.uid,id):p.claimRecovery(item.uid,id);
  assert(action(a,'first-'+kind).ok);const raw=s.value,calls=s.calls.length;assert.equal(action(b,'stale-'+kind).reason,'save-changed-in-another-session');assert.equal(action(b,'stale-'+kind).reason,kind==='sell'?'item-not-found':'recovery-item-not-found');assert.equal(s.value,raw);assert.equal(s.calls.length,calls);
 }
});
check('unsafe bank precision never spends or credits an inexact amount',()=>{
 const item=stack('archive'),s=store(home([item],{cash:2**60})),p=create(s),raw=s.value;assert.equal(p.expandStash({expectedLevel:0,requestId:'large-bank'}).reason,'bank-overflow');assert.equal(p.sellStack('stash',item.uid,'large-sale').reason,'bank-overflow');assert.equal(s.value,raw);assert.equal(s.calls.length,0);assert.deepEqual(p.snapshot().stash,[item]);
 const exact=store(home([item],{cash:2920.25})),q=create(exact);assert(q.expandStash({expectedLevel:0,requestId:'fractional-bank'}).ok);assert(q.sellStack('stash',item.uid,'fractional-sale').ok);assert.equal(q.snapshot().bank,2600.25);
});
check('cross-kind receipt reuse cannot spend, sell or claim a different operation',()=>{
 const item=stack('archive'),s=store(home([item])),p=create(s);assert(p.expandStash({expectedLevel:0,requestId:'shared-request'}).ok);const raw=s.value;assert.equal(p.sellStack('stash',item.uid,'shared-request').reason,'request-id-conflict');assert.equal(p.claimRecovery('all','shared-request').reason,'request-id-conflict');assert.equal(s.value,raw);
});
check('existing recovery prevents duplicate retained identities and safe journal collisions',()=>{
 const item=stack('archive'),s=store(home(filled(),{recovery:[item],activeRaid:{id:'already-active',safe:null}})),p=create(s),raw=s.value;
 assert.equal(p.snapshot().known,true);assert(p.recoverInterrupted().ok);assert.deepEqual(p.snapshot().recovery,[item]);
 const invalid=store(home([],{recovery:[item],activeRaid:{id:'bad-safe',safe:item}}));assert.equal(create(invalid).snapshot().known,false);assert.equal(invalid.calls.length,0);assert.notEqual(s.value,raw);
});
check('sold issued drafts remain rejected after a stale reader refresh',()=>{const item=stack('pistol',1,{rounds:4,issued:true}),s=store(record([item])),a=create(s),b=create(s),draft=carry([[item,'weapon:0']]);assert(a.sellStack('stash',item.uid,'sold-issued').ok);assert(!b.deploy(draft).ok);assert(b.retry());assert.equal(b.deploy(draft).reason,'item-not-in-stash');assert.equal(JSON.parse(s.value).activeRaid,null);});
check('fresh sessions reserve sold generated UIDs before constructing a recovery kit',()=>{const fs=require('node:fs'),vm=require('node:vm'),sandbox={};vm.createContext(sandbox);for(const name of ['inventory.js','stash-profile.js'])vm.runInContext(fs.readFileSync(__dirname+'/'+name,'utf8'),sandbox);const raw=home([],{stashReceipts:[{id:'sold-generated',kind:'sell',source:'stash',uid:'df-1',value:0}]}),memory=new Map([[KEY,raw]]),profile=sandbox.DFStashProfile.create({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}),kit=sandbox.DFInventory.starter();assert(profile.snapshot().known);assert(!kit.all().some(x=>x.stack.uid==='df-1'));assert(profile.deploy(kit.snapshot()).ok);});
console.log(`${checks} deterministic stash-profile checks passed.`);
