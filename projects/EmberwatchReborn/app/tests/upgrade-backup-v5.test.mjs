import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,migrateState} from '../src/state.js';
import {createStore,createSession,profileKeys,checksum,readUpgradeBackupV5,restoreUpgradeBackupV5,upgradeBackupV5Key} from '../src/save.js';
import {readUpgradeBackup,restoreUpgradeBackup,upgradeBackupKey} from '../src/save.js';
import {copyReleaseQaProfile} from '../src/candidate-profile.js';
import {createController} from '../src/controller.js';

function legacy(version=3){const s=createState();s.version=version;if(version<4){delete s.actionSlots;s.options.controls.version=2;delete s.options.controls.bindings.expert1;delete s.options.controls.bindings.expert2;}if(version<3)delete s.options.controls;if(version===1)delete s.equipmentProgress;return s;}
function memory(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};}
function locks(){const tails=new Map(),calls=[];return {calls,async request(key,options,fn){calls.push([key,options.mode]);const old=tails.get(key)??Promise.resolve();let release;const wait=new Promise(r=>{release=r;});tails.set(key,old.then(()=>wait));await old;try{return await fn();}finally{release();}}};}
function setup({profile='main',namespace='release',version=3,two=false}={}){const storage=memory(),lock=locks(),store=createStore(storage,{profile,namespace}),state=legacy(version);assert.equal(store.save(state,{expectedRevision:0}).ok,true);if(two)assert.equal(store.save(state,{expectedRevision:1}).ok,true);return {storage,lock,store,state,profile,namespace,key:upgradeBackupV5Key(profile,namespace)};}
const live=f=>new Map([f.store.keys.head,...f.store.keys.slots].map(key=>[key,f.storage.getItem(key)]));
function upgrade(f,storage=f.storage){const store=createStore(storage,{profile:f.profile,namespace:f.namespace});return store.save(migrateState(f.state),{expectedRevision:store.load().revision});}
function request(f,targetProfile='qa-restored'){const summary=readUpgradeBackupV5(f.storage,{profile:f.profile,namespace:f.namespace});assert.equal(summary.exists,true);return {sourceProfile:f.profile,targetProfile,namespace:f.namespace,expectedBackupChecksum:summary.backupChecksum};}
const preserved=(storage,before)=>{for(const [key,value]of before)assert.equal(storage.getItem(key),value,key);};

test('controller legacy load is read-only and absent/native-v5 history is never invented',async()=>{
 const f=setup(),before=new Map(f.storage.data),controller=createController(createSession(f.storage,f.lock));
 assert.equal((await controller.load()).state.version,5);assert.deepEqual(f.storage.data,before);assert.deepEqual(readUpgradeBackupV5(f.storage),{ok:true,exists:false});
 const fresh=memory(),store=createStore(fresh);assert.equal(store.save(createState(),{expectedRevision:0}).ok,true);assert.equal(store.save(createState(),{expectedRevision:1}).ok,true);assert.deepEqual(readUpgradeBackupV5(fresh),{ok:true,exists:false});
});
for(const version of [1,2,3,4])test(`first real v${version} upgrade captures exact original raw bytes before either live key`,()=>{
 const f=setup({version,two:true}),before=live(f),count=f.storage.writes.length,old=f.store.load();assert.equal(upgrade(f).ok,true);
 const backup=JSON.parse(f.storage.getItem(f.key)),summary=readUpgradeBackupV5(f.storage);assert.deepEqual(backup.data.raw,{head:before.get(f.store.keys.head),slots:f.store.keys.slots.map(k=>before.get(k))});
 assert.deepEqual(backup.data.receipt,{slot:old.slot,revision:old.revision,checksum:old.checksum});assert.deepEqual(f.storage.writes.slice(count),[f.key,f.store.keys.slots[1-old.slot],f.store.keys.head]);
 assert.equal(summary.sourceVersion,version);assert.equal(summary.sourceRevision,2);assert.equal(summary.level,1);assert.equal(summary.xp,0);assert.equal(summary.earnedXp,0);assert.ok(Number.isFinite(Date.parse(summary.createdAt)));assert.equal(summary.recovered,false);
 const head=JSON.parse(f.storage.getItem(f.store.keys.head));assert.equal(head.previousCommit,null);assert.equal(head.upgradePreviousCommit,null);assert.deepEqual(head.upgradeV5PreviousCommit,backup.data.receipt);
});
for(const fault of ['quota','discard','alter','write-then-throw'])test(`backup ${fault} stops before any live slot/head write`,()=>{
 const f=setup({two:true}),before=live(f),count=f.storage.writes.length;
 const adapter={...f.storage,setItem(k,v){if(k===f.key){if(fault==='quota')throw Error('QuotaExceededError');if(fault==='discard')return;f.storage.setItem(k,fault==='alter'?v+'!':v);if(fault==='write-then-throw')throw Error('after backup');}else f.storage.setItem(k,v);}};
 assert.equal(upgrade(f,adapter).code,'UPGRADE_BACKUP_FAILED');assert.deepEqual(live(f),before);assert.equal(f.storage.writes.slice(count).some(k=>k!==f.key),false);
 if(fault==='write-then-throw'){const saved=f.storage.getItem(f.key);assert.equal(upgrade(f).ok,true);assert.equal(f.storage.getItem(f.key),saved);assert.equal(f.storage.writes.filter(k=>k===f.key).length,1);}
});
test('read failure and lost locks fail before backup or live writes',async()=>{
 const f=setup(),before=new Map(f.storage.data);const readFail={...f.storage,getItem(k){if(k===f.key)throw Error('denied');return f.storage.getItem(k);}};
 assert.equal(upgrade(f,readFail).code,'UPGRADE_BACKUP_FAILED');assert.equal(readUpgradeBackupV5(readFail).code,'UNAVAILABLE');assert.deepEqual(f.storage.data,before);
 const s=createSession(f.storage,null);assert.equal((await s.save(migrateState(f.state),{expectedRevision:1})).code,'LOCKS_UNAVAILABLE');assert.deepEqual(f.storage.data,before);
});
test('stale revision and malformed self-receipt fail before backup creation',()=>{
 const f=setup();assert.equal(f.store.save(migrateState(f.state),{expectedRevision:0}).code,'CONFLICT');assert.equal(f.storage.getItem(f.key),null);
 const loaded=f.store.load(),slot=f.store.keys.slots[loaded.slot],entry=JSON.parse(f.storage.getItem(slot));entry.previousCommit={slot:loaded.slot,revision:loaded.revision,checksum:loaded.checksum};f.storage.data.set(slot,JSON.stringify(entry));const before=new Map(f.storage.data);
 assert.equal(upgrade(f).code,'UPGRADE_FENCE_UNSAFE');assert.deepEqual(f.storage.data,before);
});
for(const fault of ['before-slot','after-slot','before-head','after-head'])test(`first upgrade ${fault} has bounded commit/fence and retry behavior`,()=>{
 const f=setup({two:true}),old=f.store.load(),oldHead=f.storage.getItem(f.store.keys.head),newKey=f.store.keys.slots[1-old.slot];let fired=false;
 const adapter={...f.storage,setItem(k,v){const selected=k===(fault.includes('slot')?newKey:f.store.keys.head);if(selected&&!fired){fired=true;if(fault.startsWith('before'))throw Error(fault);f.storage.setItem(k,v);throw Error(fault);}f.storage.setItem(k,v);}};
 assert.equal(upgrade(f,adapter).code,'COMMIT_UNCERTAIN');const backup=f.storage.getItem(f.key);assert.ok(backup);
 if(fault==='after-head'){assert.equal(f.store.load().state.version,5);assert.equal(JSON.parse(f.storage.getItem(f.store.keys.head)).previousCommit,null);}else{
  assert.equal(f.storage.getItem(f.store.keys.head),oldHead);assert.equal(f.store.load().state.version,3);assert.equal(f.store.load().revision,old.revision);assert.equal(upgrade(f).ok,true);
 }
 assert.equal(f.storage.getItem(f.key),backup);assert.equal(f.storage.writes.filter(k=>k===f.key).length,1);
});
test('staged-slot readback failure never changes head; same backup permits later retry',()=>{
 const f=setup(),head=f.storage.getItem(f.store.keys.head),target=f.store.keys.slots[1-f.store.load().slot];const adapter={...f.storage,setItem(k,v){f.storage.setItem(k,k===target?v+'!':v);}};
 assert.equal(upgrade(f,adapter).code,'COMMIT_UNCERTAIN');assert.equal(f.storage.getItem(f.store.keys.head),head);assert.equal(upgrade(f).ok,true);
});
test('existing invalid or altered backup is never replaced and blocks upgrade',()=>{
 for(const mutate of [()=>'{broken',raw=>raw+'!',raw=>{const x=JSON.parse(raw);x.data.profile='qa-other';x.checksum=checksum(JSON.stringify(x.data));return JSON.stringify(x);}]){
  const f=setup();const adapter={...f.storage,setItem(k,v){f.storage.setItem(k,v);if(k===f.key)throw Error('stop');}};upgrade(f,adapter);f.storage.data.set(f.key,mutate(f.storage.getItem(f.key)));const before=new Map(f.storage.data);
  assert.equal(upgrade(f).code,'UPGRADE_BACKUP_CORRUPT');assert.deepEqual(f.storage.data,before);assert.equal(readUpgradeBackupV5(f.storage).code,'UPGRADE_BACKUP_CORRUPT');
 }
});
test('a different valid earlier legacy checkpoint is retained and refuses a later migration',()=>{
 const f=setup();const adapter={...f.storage,setItem(k,v){f.storage.setItem(k,v);if(k===f.key)throw Error('stop');}};upgrade(f,adapter);
 const changed=structuredClone(f.state);changed.options.flashes=.2;assert.equal(f.store.save(changed,{expectedRevision:1}).ok,true);f.state=changed;const before=new Map(f.storage.data);
 assert.equal(upgrade(f).code,'UPGRADE_BACKUP_CONFLICT');assert.deepEqual(f.storage.data,before);
});
test('subsequent v5 commits retain immutable backup and ordinary previous-v5 fallback',()=>{
 const f=setup();assert.equal(upgrade(f).ok,true);const backup=f.storage.getItem(f.key),first=f.store.load();assert.equal(f.store.save(first.state,{expectedRevision:first.revision}).ok,true);
 const head=JSON.parse(f.storage.getItem(f.store.keys.head));assert.deepEqual(head.previousCommit,{slot:first.slot,revision:first.revision,checksum:first.checksum});assert.equal(Object.hasOwn(head,'upgradePreviousCommit'),false);assert.equal(Object.hasOwn(head,'upgradeV5PreviousCommit'),false);assert.equal(f.storage.getItem(f.key),backup);
 f.storage.data.set(f.store.keys.slots[head.slot],'broken');assert.equal(f.store.load().state.version,5);assert.equal(f.store.load().revision,first.revision);assert.equal(f.store.load().recovered,true);
});
test('damaged first active v5 slot recovers original through new head field and upgrades safely again',()=>{
 const f=setup({two:true}),original=f.store.load();assert.equal(upgrade(f).ok,true);const backup=f.storage.getItem(f.key),active=f.store.load().slot;f.storage.data.set(f.store.keys.slots[active],'broken');
 const recovered=f.store.load();assert.equal(recovered.recovered,true);assert.deepEqual(recovered.state,original.state);assert.equal(recovered.revision,original.revision);assert.equal(upgrade(f).ok,true);assert.equal(f.storage.getItem(f.key),backup);
});
test('corrupt old head backup uses only its proven recovered commit and restores that checkpoint',async()=>{
 const f=setup({two:true}),keys=f.store.keys;f.storage.data.set(keys.head,'{broken');const selected=f.store.load();assert.equal(selected.recovered,true);assert.equal(upgrade(f).ok,true);assert.equal(readUpgradeBackupV5(f.storage).recovered,true);
 const restored=await restoreUpgradeBackupV5(f.storage,f.lock,request(f));assert.equal(restored.ok,true);const target=createStore(f.storage,{profile:'qa-restored'}).load();assert.equal(target.revision,selected.revision);assert.equal(target.checksum,selected.checksum);
});
test('profile and existing namespace isolation preserve all unrelated bytes',()=>{
 const storage=memory(),cases=[['main','release'],['qa-same','release'],['qa-same','qa-r10'],['qa-same','qa-r11'],['qa-same','qa-r12']];
 for(const [profile,namespace]of cases)assert.equal(createStore(storage,{profile,namespace}).save(legacy(),{expectedRevision:0}).ok,true);
 for(const [profile,namespace]of cases){const before=new Map(storage.data),store=createStore(storage,{profile,namespace});assert.equal(store.save(migrateState(legacy()),{expectedRevision:1}).ok,true);for(const [key,value]of before)if(![store.keys.head,...store.keys.slots].includes(key))assert.equal(storage.getItem(key),value);}
 assert.equal(new Set(cases.map(([p,n])=>upgradeBackupV5Key(p,n))).size,cases.length);for(const [profile,namespace]of cases)assert.equal(readUpgradeBackupV5(storage,{profile,namespace}).sourceProfile,profile);
});
test('explicit main recovery copies old raw envelope to new QA and leaves current v5/source backup untouched',async()=>{
 const f=setup({two:true}),source=f.store.load(),raw=f.storage.getItem(f.store.keys.slots[source.slot]);upgrade(f);const before=new Map(f.storage.data),r=await restoreUpgradeBackupV5(f.storage,f.lock,request(f));assert.equal(r.ok,true);preserved(f.storage,before);
 const target=createStore(f.storage,{profile:'qa-restored'}),loaded=target.load();assert.equal(loaded.state.version,3);assert.equal(loaded.revision,source.revision);assert.equal(loaded.checksum,source.checksum);assert.equal(f.storage.getItem(target.keys.slots[source.slot]),raw);assert.equal(r.profile,'qa-restored');assert.equal(r.sourceRevision,source.revision);
 const again=new Map(f.storage.data);assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,request(f))).code,'RESTORE_TARGET_EXISTS');assert.deepEqual(f.storage.data,again);
});
for(const occupied of ['head','slot0','slot1','backup'])test(`restoration refuses any existing target ${occupied}, including corrupt/partial bytes`,async()=>{
 const f=setup();upgrade(f);const keys=profileKeys('qa-restored'),key=occupied==='head'?keys.head:occupied==='backup'?upgradeBackupV5Key('qa-restored'):keys.slots[occupied==='slot0'?0:1];f.storage.data.set(key,'broken');const before=new Map(f.storage.data);
 assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,request(f))).code,'RESTORE_TARGET_EXISTS');assert.deepEqual(f.storage.data,before);
});
test('restore validates exact summary, target profile, namespace boundary and locks without writes',async()=>{
 const f=setup();upgrade(f);const base=request(f),before=new Map(f.storage.data);
 for(const [change,code]of [[{targetProfile:'main'},'RESTORE_TARGET_REQUIRED'],[{targetProfile:'bad'},'INVALID_PROFILE'],[{expectedBackupChecksum:'wrong'},'BACKUP_CONFLICT'],[{expectedBackupChecksum:undefined},'BACKUP_CONFIRMATION_REQUIRED'],[{sourceNamespace:'qa-r11'},'INVALID_NAMESPACE'],[{targetNamespace:'release'},'INVALID_NAMESPACE']])assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,{...base,...change})).code,code);
 assert.equal((await restoreUpgradeBackupV5(f.storage,null,base)).code,'LOCKS_UNAVAILABLE');assert.equal((await restoreUpgradeBackupV5(f.storage,{request:async()=>{throw Error('lock');}},base)).code,'LOCK_FAILED');assert.deepEqual(f.storage.data,before);
});
test('missing/corrupt source backup refuses restore without touching v5 history',async()=>{
 const f=setup(),base={sourceProfile:'main',targetProfile:'qa-restored',namespace:'release',expectedBackupChecksum:'unknown'};assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,base)).code,'NO_UPGRADE_BACKUP');upgrade(f);f.storage.data.set(f.key,'broken');const before=new Map(f.storage.data);assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,base)).code,'UPGRADE_BACKUP_CORRUPT');assert.deepEqual(f.storage.data,before);
});
for(const fault of ['before-slot','after-slot','before-head','after-head'])test(`restore ${fault} never overwrites source/current progress and refuses occupied retry`,async()=>{
 const f=setup();upgrade(f);const before=new Map(f.storage.data),keys=profileKeys('qa-restored'),args=request(f);let fired=false;
 const adapter={...f.storage,setItem(k,v){const selected=fault.includes('slot')?keys.slots.includes(k):k===keys.head;if(selected&&!fired){fired=true;if(fault.startsWith('before'))throw Error(fault);f.storage.setItem(k,v);throw Error(fault);}f.storage.setItem(k,v);}};
 assert.equal((await restoreUpgradeBackupV5(adapter,f.lock,args)).code,'RESTORE_UNCERTAIN');preserved(f.storage,before);
 const retry=await restoreUpgradeBackupV5(f.storage,f.lock,args);assert.equal(retry.ok,fault==='before-slot');if(fault!=='before-slot')assert.equal(retry.code,'RESTORE_TARGET_EXISTS');if(fault==='after-head')assert.equal(createStore(f.storage,{profile:'qa-restored'}).load().state.version,3);
});
test('two concurrent restores serialize sorted locks and duplicate target gets one commit only',async()=>{
 const f=setup({profile:'qa-z-source'});upgrade(f);const args=request(f,'qa-a-target'),before=new Map(f.storage.data),results=await Promise.all([restoreUpgradeBackupV5(f.storage,f.lock,args),restoreUpgradeBackupV5(f.storage,f.lock,args)]);
 assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.find(r=>!r.ok).code,'RESTORE_TARGET_EXISTS');preserved(f.storage,before);const source=f.store.keys.lock,target=profileKeys('qa-a-target').lock;assert.equal(f.lock.calls[0][0],target);assert.equal(f.lock.calls.every(([,mode])=>mode==='exclusive'),true);assert.equal(f.lock.calls.some(([key])=>key===source),true);
});
test('concurrent first-upgrade writers share one backup; stale contender cannot double commit',async()=>{
 const f=setup(),session=createSession(f.storage,f.lock),state=migrateState(f.state),results=await Promise.all([session.save(state,{expectedRevision:1}),session.save(state,{expectedRevision:1})]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.find(r=>!r.ok).code,'CONFLICT');assert.equal(f.storage.writes.filter(k=>k===f.key).length,1);assert.equal(f.store.load().revision,2);
});
test('backup failure blocks controller immediately and queued/future commands until explicit reload',async()=>{
 const f=setup(),before=live(f);let failBackup=true;
 const storage={...f.storage,setItem(k,v){if(k===f.key&&failBackup)throw Error('quota');f.storage.setItem(k,v);}};
 const c=createController(createSession(storage,f.lock));assert.equal((await c.load()).ok,true);const state=c.snapshot(),results=await Promise.all([c.dispatch({type:'setOption',option:'flashes',value:.2}),c.dispatch({type:'setOption',option:'masterVolume',value:.4})]);
 for(const r of results){assert.equal(r.ok,false);assert.equal(r.code,'UPGRADE_BACKUP_FAILED');assert.equal(r.blocked,true);}assert.deepEqual(c.snapshot(),state);assert.deepEqual(live(f),before);
 failBackup=false;const count=f.storage.writes.length;assert.equal((await c.dispatch({type:'setOption',option:'flashes',value:.2})).blocked,true);assert.equal(f.storage.writes.length,count);
 assert.equal((await c.load()).ok,true);assert.equal((await c.dispatch({type:'setOption',option:'flashes',value:.2})).ok,true);assert.equal(f.store.load().state.options.flashes,.2);
});
test('invalid inactive-slot bytes within bounds are preserved exactly without being restored as committed',async()=>{
 const f=setup(),loaded=f.store.load(),other=f.store.keys.slots[1-loaded.slot],invalid='not JSON: \u0000 raw byte string';f.storage.data.set(other,invalid);assert.equal(upgrade(f).ok,true);const backup=JSON.parse(f.storage.getItem(f.key));assert.equal(backup.data.raw.slots[1-loaded.slot],invalid);
 const args=request(f),restored=await restoreUpgradeBackupV5(f.storage,f.lock,args);assert.equal(restored.ok,true);const target=profileKeys(args.targetProfile);assert.equal(f.storage.getItem(target.slots[1-loaded.slot]),null);assert.equal(createStore(f.storage,{profile:args.targetProfile}).load().state.version,3);
});
test('oversized raw head, inactive slot, and escaped sidecar fail before live-key writes',()=>{
 for(const kind of ['head','slot','sidecar']){
  const f=setup(),loaded=f.store.load(),key=kind==='head'?f.store.keys.head:f.store.keys.slots[1-loaded.slot];
  if(kind==='head'){const head=JSON.parse(f.storage.getItem(key));head.padding='x'.repeat(65536);f.storage.data.set(key,JSON.stringify(head));}
  else f.storage.data.set(key,kind==='slot'?'x'.repeat(4*1024*1024+1):'\u0000'.repeat(4*1024*1024));
  const before=new Map(f.storage.data),count=f.storage.writes.length;assert.equal(upgrade(f).code,'UPGRADE_BACKUP_INVALID');assert.deepEqual(f.storage.data,before);assert.equal(f.storage.writes.length,count);
 }
});
test('already-corrupt head plus malformed staged upgrade still restores exact old checkpoint from sidecar',async()=>{
 const f=setup({two:true});f.storage.data.set(f.store.keys.head,'{broken');const original=f.store.load(),newSlot=f.store.keys.slots[1-original.slot],adapter={...f.storage,setItem(k,v){f.storage.setItem(k,k===newSlot?v+'!':v);}};
 const controller=createController(createSession(adapter,f.lock));assert.equal((await controller.load()).ok,true);assert.equal((await controller.dispatch({type:'setOption',option:'flashes',value:.2})).code,'COMMIT_UNCERTAIN');assert.equal((await controller.dispatch({type:'setOption',option:'flashes',value:.2})).blocked,true);
 assert.equal(f.store.load().code,'CORRUPT');assert.equal(readUpgradeBackupV5(f.storage).exists,true);const before=new Map(f.storage.data);assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,request(f))).ok,true);preserved(f.storage,before);const restored=createStore(f.storage,{profile:'qa-restored'}).load();assert.equal(restored.revision,original.revision);assert.deepEqual(restored.state,original.state);
});

for(const version of [1,2,3])test(`direct v${version} to v5 records actual origin and never invents pre-v4`,()=>{
 const f=setup({version,two:true}),old=f.store.load();assert.equal(upgrade(f).ok,true);
 const info=readUpgradeBackupV5(f.storage);assert.equal(info.sourceVersion,version);assert.equal(info.targetVersion,5);assert.equal(info.sourceRevision,old.revision);assert.deepEqual(readUpgradeBackup(f.storage),{ok:true,exists:false});
 assert.equal(JSON.parse(f.storage.getItem(f.key)).data.fromVersion,version);
});
for(const version of [1,2,3])test(`true v${version} to v4 retains R11 key, format and restore contract before independent v5 capture`,async()=>{
 const f=setup({version,two:true}),raw=live(f),old=f.store.load(),four=migrateState(f.state);four.version=4;
 assert.equal(f.store.save(four,{expectedRevision:old.revision}).ok,true);const key4=upgradeBackupKey(),backup4=f.storage.getItem(key4),data4=JSON.parse(backup4),head4=JSON.parse(f.storage.getItem(f.store.keys.head));
 assert.equal(key4,'emberwatch-reborn.reimplementation.v1.main.pre-v4');assert.equal(data4.data.format,'emberwatch.reborn.pre-v4');assert.equal(data4.data.fromVersion,version);assert.equal(data4.data.toVersion,4);assert.deepEqual(data4.data.raw,{head:raw.get(f.store.keys.head),slots:f.store.keys.slots.map(k=>raw.get(k))});
 assert.equal(head4.previousCommit,null);assert.deepEqual(head4.upgradePreviousCommit,data4.data.receipt);assert.equal(Object.hasOwn(head4,'upgradeV5PreviousCommit'),false);assert.deepEqual(readUpgradeBackupV5(f.storage),{ok:true,exists:false});
 const committed4=f.store.load();assert.equal(f.store.save(migrateState(committed4.state),{expectedRevision:committed4.revision}).ok,true);assert.equal(f.storage.getItem(key4),backup4);const summary4=readUpgradeBackup(f.storage),summary5=readUpgradeBackupV5(f.storage);assert.equal(summary4.sourceVersion,version);assert.equal(summary5.sourceVersion,4);assert.equal(summary5.sourceRevision,committed4.revision);assert.notEqual(summary4.backupChecksum,summary5.backupChecksum);
 const before=new Map(f.storage.data);assert.equal((await restoreUpgradeBackup(f.storage,f.lock,{targetProfile:'qa-pre-four',expectedBackupChecksum:summary4.backupChecksum})).ok,true);assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,{targetProfile:'qa-pre-five',expectedBackupChecksum:summary5.backupChecksum})).ok,true);preserved(f.storage,before);
 assert.equal(createStore(f.storage,{profile:'qa-pre-four'}).load().state.version,version);assert.equal(createStore(f.storage,{profile:'qa-pre-five'}).load().state.version,4);
});
test('direct v3 to v5 preserves even an unrelated pre-v4 sidecar byte-for-byte',()=>{
 const f=setup(),key4=upgradeBackupKey(),bytes='retained unrelated pre-v4 evidence';f.storage.data.set(key4,bytes);assert.equal(upgrade(f).ok,true);assert.equal(f.storage.getItem(key4),bytes);assert.equal(readUpgradeBackupV5(f.storage).sourceVersion,3);
});
test('same-format checkpoint tokens never authorize the other backup kind',async()=>{
 const f=setup(),four=migrateState(f.state);four.version=4;assert.equal(f.store.save(four,{expectedRevision:1}).ok,true);assert.equal(f.store.save(migrateState(four),{expectedRevision:2}).ok,true);const fourInfo=readUpgradeBackup(f.storage),fiveInfo=readUpgradeBackupV5(f.storage),before=new Map(f.storage.data);
 assert.equal((await restoreUpgradeBackup(f.storage,f.lock,{targetProfile:'qa-other-kind',expectedBackupChecksum:fiveInfo.backupChecksum})).code,'BACKUP_CONFLICT');assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,{targetProfile:'qa-other-kind',expectedBackupChecksum:fourInfo.backupChecksum})).code,'BACKUP_CONFLICT');preserved(f.storage,before);
 // Recomputing a corrupt sidecar's outer checksum does not change its kind.
 const forged=JSON.parse(f.storage.getItem(upgradeBackupKey()));f.storage.data.set(f.key,JSON.stringify(forged));assert.equal(readUpgradeBackupV5(f.storage).code,'UPGRADE_BACKUP_CORRUPT');
});
for(const kind of ['pre-v4','pre-v5'])for(const occupied of ['head','slot0','slot1','pre-v4','pre-v5'])test(`${kind} restore rejects target occupied only by ${occupied}`,async()=>{
 const f=setup(),four=migrateState(f.state);four.version=4;assert.equal(f.store.save(four,{expectedRevision:1}).ok,true);assert.equal(f.store.save(migrateState(four),{expectedRevision:2}).ok,true);
 const targetProfile='qa-occupied',keys=profileKeys(targetProfile),key=occupied==='head'?keys.head:occupied==='slot0'?keys.slots[0]:occupied==='slot1'?keys.slots[1]:occupied==='pre-v4'?upgradeBackupKey(targetProfile):upgradeBackupV5Key(targetProfile);f.storage.data.set(key,'');const before=new Map(f.storage.data),read=kind==='pre-v4'?readUpgradeBackup:readUpgradeBackupV5,restore=kind==='pre-v4'?restoreUpgradeBackup:restoreUpgradeBackupV5;
 assert.equal((await restore(f.storage,f.lock,{targetProfile,expectedBackupChecksum:read(f.storage).backupChecksum})).code,'RESTORE_TARGET_EXISTS');assert.deepEqual(f.storage.data,before);
});
for(const occupied of ['head','slot0','slot1','pre-v4','pre-v5'])test(`candidate copy rejects target occupied only by ${occupied}`,async()=>{
 const f=setup({profile:'qa-source',version:4}),targetProfile='qa-copy',namespace='qa-r12',keys=profileKeys(targetProfile,namespace),key=occupied==='head'?keys.head:occupied==='slot0'?keys.slots[0]:occupied==='slot1'?keys.slots[1]:occupied==='pre-v4'?upgradeBackupKey(targetProfile,namespace):upgradeBackupV5Key(targetProfile,namespace);f.storage.data.set(key,'');const before=new Map(f.storage.data);
 assert.equal((await copyReleaseQaProfile(f.storage,f.lock,{sourceProfile:f.profile,targetProfile,targetNamespace:namespace})).code,'CANDIDATE_EXISTS');assert.deepEqual(f.storage.data,before);
});
test('candidate copy inspects every target key only after both sorted exclusive locks are held',async()=>{
 const f=setup({profile:'qa-source',version:4}),targetProfile='qa-copy',namespace='qa-r12',keys=profileKeys(targetProfile,namespace),held=new Set(),calls=[];
 const lock={async request(name,options,fn){calls.push(name);assert.equal(options.mode,'exclusive');assert.equal(held.has(name),false);held.add(name);try{return await fn();}finally{held.delete(name);}}};
 const adapter={...f.storage,getItem(key){if(key.startsWith(keys.head.replace(/\.head$/,''))){assert.equal(held.has(keys.lock),true);assert.equal(held.has(f.store.keys.lock),true);}return f.storage.getItem(key);}};
 assert.equal((await copyReleaseQaProfile(adapter,lock,{sourceProfile:f.profile,targetProfile,targetNamespace:namespace})).ok,true);assert.deepEqual(calls,[f.store.keys.lock,keys.lock].sort());
});
test('concurrent candidate copies serialize occupancy check and commit once without replacing source',async()=>{
 const f=setup({profile:'qa-source',version:4}),before=new Map(f.storage.data),args={sourceProfile:f.profile,targetProfile:'qa-target',targetNamespace:'qa-r12'},results=await Promise.all([copyReleaseQaProfile(f.storage,f.lock,args),copyReleaseQaProfile(f.storage,f.lock,args)]);
 assert.equal(results.filter(x=>x.ok).length,1);assert.equal(results.find(x=>!x.ok).code,'CANDIDATE_EXISTS');preserved(f.storage,before);
});
test('v5 restore stays in its selected qa-r12 namespace and preserves exact checkpoint bytes',async()=>{
 const f=setup({profile:'qa-w-source',namespace:'qa-r12',version:4,two:true}),original=f.store.load(),envelope=f.storage.getItem(f.store.keys.slots[original.slot]);assert.equal(upgrade(f).ok,true);const before=new Map(f.storage.data),args=request(f,'qa-w-restore');assert.equal((await restoreUpgradeBackupV5(f.storage,f.lock,args)).ok,true);preserved(f.storage,before);
 const target=createStore(f.storage,{profile:args.targetProfile,namespace:f.namespace});assert.equal(target.load().state.version,4);assert.equal(f.storage.getItem(target.keys.slots[original.slot]),envelope);assert.equal(createStore(f.storage,{profile:args.targetProfile}).load().state,null);
});
test('corrupt v5 head recovers only the previous proven source, never active staged v5',()=>{
 const f=setup({version:4,two:true}),original=f.store.load();assert.equal(upgrade(f).ok,true);f.storage.data.set(f.store.keys.head,'{broken');const recovered=f.store.load();assert.equal(recovered.state.version,4);assert.equal(recovered.revision,original.revision);assert.equal(recovered.checksum,original.checksum);assert.equal(upgrade(f).ok,true);
});
