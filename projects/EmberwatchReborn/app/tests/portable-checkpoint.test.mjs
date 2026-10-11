import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createState,migrateState,reduceRuntime,validateState} from '../src/state.js';
import {createStore,profileKeys,checksum,SAVE_LIMIT} from '../src/save.js';
import {exportPortableCheckpoint,inspectPortableCheckpoint,restorePortableCheckpoint,PORTABLE_CHECKPOINT_FORMAT,PORTABLE_CHECKPOINT_VERSION,PORTABLE_CHECKPOINT_LIMIT} from '../src/portable-checkpoint.js';
import {route} from './support/earned-route.mjs';

// Isolated synthetic store fixtures. None represent browser or normal-input QA.
const SOURCE='qa-r12a2-replay-20261010',TARGET='qa-portable-restored',NAMESPACE='qa-r12',BUILD='R12a2 portable test';
const wireFields=['format','formatVersion','schema','sourceVersion','sourceProfile','namespace','exporterBuild','exportedAt','sourceSlot','sourceRevision','checksum','recovered','payload'];
function sign(checkpoint){const data=Object.fromEntries(wireFields.map(key=>[key,checkpoint[key]]));checkpoint.digest=createHash('sha256').update(JSON.stringify(data),'utf8').digest('hex');return JSON.stringify(checkpoint);}
function memory(){
 const data=new Map(),reads=[],writes=[];
 return {data,reads,writes,get length(){throw Error('Storage enumeration is forbidden');},key(){throw Error('Storage enumeration is forbidden');},removeItem(){throw Error('Cleanup is forbidden');},clear(){throw Error('Cleanup is forbidden');},getItem(key){reads.push(key);return data.get(key)??null;},setItem(key,value){writes.push([key,value]);data.set(key,value);}};
}
function locks(){
 const tails=new Map(),calls=[],held=new Set();
 return {calls,held,async request(key,options,callback){calls.push([key,options.mode]);const old=tails.get(key)??Promise.resolve();let release;const wait=new Promise(resolve=>{release=resolve;});tails.set(key,old.then(()=>wait));await old;held.add(key);try{return await callback();}finally{held.delete(key);release();}}};
}
function legacy(version){const state=createState();state.version=version;if(version<4){delete state.actionSlots;state.options.controls.version=2;delete state.options.controls.bindings.expert1;delete state.options.controls.bindings.expert2;}if(version<3)delete state.options.controls;if(version===1)delete state.equipmentProgress;assert.equal(validateState(state).ok,true);return state;}
function setup({version=5,two=false,namespace=NAMESPACE,profile=SOURCE,state=legacy(version)}={}){
 const storage=memory(),lock=locks(),store=createStore(storage,{profile,namespace});assert.equal(store.save(state,{expectedRevision:0}).ok,true);
 if(two){state=structuredClone(state);state.options.flashes=.25;assert.equal(store.save(state,{expectedRevision:1}).ok,true);}
 storage.reads.length=0;storage.writes.length=0;
 return {storage,lock,store,state,namespace,profile,options:{sourceProfile:profile,namespace,exporterBuild:BUILD}};
}
async function exported(f=setup()){const out=await exportPortableCheckpoint(f.storage,f.lock,f.options);assert.equal(out.ok,true,JSON.stringify(out));return out;}
function restoreArgs(out,changes={}){return {text:out.text,expectedSourceProfile:out.sourceProfile,expectedNamespace:out.namespace,expectedDigest:out.digest,targetProfile:TARGET,namespace:out.namespace,...changes};}
const targetKeys=(namespace=NAMESPACE)=>{const keys=profileKeys(TARGET,namespace);return [keys.head,...keys.slots,keys.head.replace(/\.head$/,'.pre-v4'),keys.head.replace(/\.head$/,'.pre-v5')];};
const preserved=(storage,before)=>{for(const [key,value]of before)assert.equal(storage.data.get(key),value,key);};
function repayload(out,change){const checkpoint=JSON.parse(out.text),state=JSON.parse(checkpoint.payload);change(state);checkpoint.payload=JSON.stringify(state);checkpoint.checksum=checksum(checkpoint.payload);return sign(checkpoint);}

test('format constants and source export are bounded, read-only and exactly three-key scoped under its Web Lock',async()=>{
 const f=setup({two:true}),before=new Map(f.storage.data),allowed=[f.store.keys.head,...f.store.keys.slots];
 f.storage.data.set('unrelated.secret','do not inspect');f.storage.data.set(f.store.keys.head.replace(/\.head$/,'.pre-v5'),'do not inspect');
 const adapter={getItem(key){assert.equal(f.lock.held.has(f.store.keys.lock),true);assert.ok(allowed.includes(key));return f.storage.getItem(key);},setItem(){assert.fail('export wrote storage');},key(){assert.fail('enumeration');},get length(){assert.fail('enumeration');}};
 const out=await exportPortableCheckpoint(adapter,f.lock,f.options);assert.equal(out.ok,true);assert.deepEqual(f.storage.reads,allowed);assert.deepEqual(f.storage.writes,[]);preserved(f.storage,before);
 assert.deepEqual(f.lock.calls,[[f.store.keys.lock,'exclusive']]);assert.equal(PORTABLE_CHECKPOINT_FORMAT,'emberwatch.reborn.qa-checkpoint');assert.equal(PORTABLE_CHECKPOINT_VERSION,1);assert.equal(PORTABLE_CHECKPOINT_LIMIT,2*1024*1024);
 const checkpoint=JSON.parse(out.text);assert.equal(out.sourceRevision,2);assert.equal(out.sourceSlot,1);assert.equal(out.recovered,false);assert.equal(out.recoveryNote,null);assert.equal(sign({...checkpoint}),out.text);assert.equal(checkpoint.payload,JSON.parse(f.storage.data.get(f.store.keys.slots[1])).payload);assert.equal(out.filename,`${NAMESPACE}-${SOURCE}-r2.ewqa.json`);
 assert.equal((await inspectPortableCheckpoint(out.text)).digest,out.digest);
});

for(const version of [1,2,3,4,5])test(`original v${version} payload bytes survive export, inspection and fresh canonical restore without migration`,async()=>{
 const f=setup({version,two:true}),keys=f.store.keys,entry=JSON.parse(f.storage.data.get(keys.slots[1]));
 entry.payload='\n'+JSON.stringify(f.state,null,2)+'\n';entry.checksum=checksum(entry.payload);f.storage.data.set(keys.slots[1],JSON.stringify(entry));const head=JSON.parse(f.storage.data.get(keys.head));head.checksum=entry.checksum;f.storage.data.set(keys.head,JSON.stringify(head));
 const before=new Map(f.storage.data),out=await exported(f);assert.equal(out.sourceVersion,version);assert.equal(JSON.parse(out.text).payload,entry.payload);
 const result=await restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out));assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.revision,1);assert.equal(result.sourceRevision,2);assert.equal(result.slot,0);preserved(f.storage,before);
 const restored=createStore(f.storage,{profile:TARGET,namespace:NAMESPACE}),loaded=restored.load(),raw=JSON.parse(f.storage.data.get(restored.keys.slots[0]));
 assert.equal(loaded.state.version,version);assert.equal(loaded.recovered,false);assert.equal(loaded.revision,1);assert.deepEqual(loaded.state,f.state);assert.equal(raw.payload,entry.payload);assert.equal(raw.previousCommit,null);assert.deepEqual(Object.keys(raw),['schema','revision','checksum','previousCommit','payload']);assert.deepEqual(JSON.parse(f.storage.data.get(restored.keys.head)),{slot:0,revision:1,checksum:entry.checksum,previousCommit:null});assert.equal(f.storage.data.has(restored.keys.slots[1]),false);assert.deepEqual(f.storage.writes.map(x=>x[0]),[restored.keys.slots[0],restored.keys.head]);
});

for(const namespace of ['release','qa-r4','qa-r5','qa-r6','qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12'])test(`same-namespace QA restore supports ${namespace} without any source reads`,async()=>{
 const f=setup({namespace}),out=await exported(f),empty=memory(),lock=locks(),allowed=targetKeys(namespace),targetLock=profileKeys(TARGET,namespace).lock;
 const adapter={getItem(key){assert.equal(lock.held.has(targetLock),true);assert.ok(allowed.includes(key),key);return empty.getItem(key);},setItem(key,value){assert.equal(lock.held.has(targetLock),true);assert.ok(allowed.includes(key),key);return empty.setItem(key,value);}};
 assert.equal((await restorePortableCheckpoint(adapter,lock,restoreArgs(out))).ok,true);assert.deepEqual(lock.calls,[[targetLock,'exclusive']]);assert.equal(createStore(empty,{profile:TARGET,namespace}).load().checksum,out.checksum);assert.equal(empty.data.size,2);
});

for(const damage of ['active-slot','head'])test(`export reports recovered committed fallback after corrupt ${damage}`,async()=>{
 const f=setup({two:true});f.storage.data.set(damage==='head'?f.store.keys.head:f.store.keys.slots[1],'{broken');const before=new Map(f.storage.data),selected=f.store.load(),out=await exported(f);
 assert.equal(out.recovered,true);assert.ok(out.recoveryNote.includes('마지막으로 확인된'));assert.equal(out.sourceRevision,1);assert.equal(out.checksum,selected.checksum);assert.equal(JSON.parse(JSON.parse(out.text).payload).options.flashes,.5);assert.equal(f.storage.writes.length,0);preserved(f.storage,before);
 const result=await restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out));assert.equal(result.ok,true);assert.equal(result.recovered,true);assert.equal(createStore(f.storage,{profile:TARGET,namespace:NAMESPACE}).load().recovered,false);
});
test('v5 upgrade-fence fallback exports actual v4 checkpoint without reading either sidecar',async()=>{
 const f=setup({version:4,two:true});assert.equal(f.store.save(migrateState(f.state),{expectedRevision:2}).ok,true);f.storage.data.set(f.store.keys.slots[0],'broken');f.storage.reads.length=0;f.storage.writes.length=0;
 const out=await exported(f);assert.equal(out.recovered,true);assert.equal(out.sourceVersion,4);assert.equal(out.sourceRevision,2);assert.deepEqual(f.storage.reads,[f.store.keys.head,...f.store.keys.slots]);assert.equal(f.storage.writes.length,0);
});
test('higher uncommitted staged revision is never promoted over the committed receipt',async()=>{
 const f=setup(),entry=JSON.parse(f.storage.data.get(f.store.keys.slots[0]));entry.revision=999;entry.payload=JSON.stringify({...f.state,options:{...f.state.options,flashes:.123}});entry.checksum=checksum(entry.payload);entry.previousCommit={slot:0,revision:1,checksum:f.store.load().checksum};f.storage.data.set(f.store.keys.slots[1],JSON.stringify(entry));
 const out=await exported(f);assert.equal(out.sourceRevision,1);assert.equal(out.sourceSlot,0);assert.equal(out.recovered,false);assert.equal(JSON.parse(JSON.parse(out.text).payload).options.flashes,.5);
});
test('production-handler reward, resource and ledger state restores exactly without granting a second reward',async()=>{
 const state=route('normal',true,true).state,f=setup({state,two:true}),out=await exported(f);
 assert.ok(out.earnedXp>0);assert.ok(out.gold>0);assert.ok(f.state.world.claimedRewards.length>0);assert.ok(f.state.vitals);
 assert.equal((await restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out))).ok,true);const loaded=createStore(f.storage,{profile:TARGET,namespace:NAMESPACE}).load();assert.deepEqual(loaded.state,f.state);
 const duplicate=reduceRuntime(loaded.state,{type:'claimReward',rewardId:'watch_patrol',position:{x:450,y:325}});assert.equal(duplicate.code,'ALREADY_CLAIMED');assert.deepEqual(loaded.state,f.state);
});
test('export waits for the source writer and snapshots its subsequently committed receipt',async()=>{
 const f=setup();let release,entered;const began=new Promise(resolve=>{entered=resolve;});const held=f.lock.request(f.store.keys.lock,{mode:'exclusive'},async()=>{entered();await new Promise(resolve=>{release=resolve;});assert.equal(f.store.save(f.state,{expectedRevision:1}).ok,true);});await began;
 const pending=exportPortableCheckpoint(f.storage,f.lock,f.options);await new Promise(resolve=>setTimeout(resolve,10));assert.equal(f.storage.reads.length,0);release();await held;assert.equal((await pending).sourceRevision,2);
});
for(const kind of ['missing','only-staged','corrupt-head-only','bad-checksum','invalid-ledger','foreign-schema'])test(`export refuses ${kind} without any write`,async()=>{
 const f=setup();if(kind==='missing')f.storage.data.clear();
 else if(kind==='only-staged')f.storage.data.delete(f.store.keys.head);
 else if(kind==='corrupt-head-only'){f.storage.data.clear();f.storage.data.set(f.store.keys.head,'broken');}
 else{const entry=JSON.parse(f.storage.data.get(f.store.keys.slots[0]));if(kind==='bad-checksum')entry.checksum='00000000';if(kind==='foreign-schema')entry.schema='original.game';if(kind==='invalid-ledger'){const s=JSON.parse(entry.payload);s.gold=1;entry.payload=JSON.stringify(s);entry.checksum=checksum(entry.payload);const head=JSON.parse(f.storage.data.get(f.store.keys.head));head.checksum=entry.checksum;f.storage.data.set(f.store.keys.head,JSON.stringify(head));}f.storage.data.set(f.store.keys.slots[0],JSON.stringify(entry));}
 const before=new Map(f.storage.data),out=await exportPortableCheckpoint(f.storage,f.lock,f.options);assert.equal(out.ok,false);assert.equal(out.code,kind==='missing'?'NO_SOURCE':'CORRUPT');assert.deepEqual(f.storage.data,before);assert.equal(f.storage.writes.length,0);
});

for(const change of [null,{}, {sourceProfile:'main'},{sourceProfile:'qa-'},{sourceProfile:'qa-UPPER'},{sourceProfile:'qa-'+('a'.repeat(49))},{namespace:'qa-r13'},{namespace:null},{namespace:'original'},{exporterBuild:''},{exporterBuild:' x '},{exporterBuild:'x\n'},{exporterBuild:'가'.repeat(43)},{exporterBuild:8},{unrequested:'option'}])test(`invalid or nonexplicit export selection ${JSON.stringify(change)} fails before reads`,async()=>{
 const f=setup(),options=change===null?null:Object.keys(change).length?{...f.options,...change}:{};const result=await exportPortableCheckpoint(f.storage,f.lock,options);assert.equal(result.ok,false);assert.equal(f.storage.reads.length,0);assert.equal(f.storage.writes.length,0);assert.equal(f.lock.calls.length,0);
});

for(const value of [null,undefined,{},[],42,'','{bad','null','[]','{}'])test(`inspection rejects malformed document ${String(value)}`,async()=>{assert.equal((await inspectPortableCheckpoint(value)).ok,false);});
const invalidFields={format:'foreign',formatVersion:2,schema:'original.game',sourceVersion:'5',sourceProfile:'main',namespace:'qa-r13',exporterBuild:'',exportedAt:'today',sourceSlot:2,sourceRevision:0,checksum:'not-a-checksum',recovered:'false',payload:{},digest:'A'.repeat(64)};
for(const [key,value]of Object.entries(invalidFields))test(`wrong ${key} type/value is rejected even with otherwise valid wrapper`,async()=>{
 const out=await exported(),checkpoint=JSON.parse(out.text);checkpoint[key]=value;assert.equal((await inspectPortableCheckpoint(JSON.stringify(checkpoint))).ok,false);
 delete checkpoint[key];assert.equal((await inspectPortableCheckpoint(JSON.stringify(checkpoint))).ok,false);
});
for(const field of ['targetProfile','storageKeys','previousCommit','upgradePreviousCommit','upgradeV5PreviousCommit','raw','unrelated'])test(`wrapper cannot carry ${field}`,async()=>{
 const out=await exported(),checkpoint=JSON.parse(out.text);checkpoint[field]={head:'arbitrary'};assert.equal((await inspectPortableCheckpoint(sign(checkpoint))).code,'INVALID_CHECKPOINT');
});
test('metadata canonicalization is stable across file key order and whitespace',async()=>{
 const out=await exported(),checkpoint=JSON.parse(out.text),reordered=Object.fromEntries(Object.entries(checkpoint).reverse());assert.equal((await inspectPortableCheckpoint(JSON.stringify(reordered,null,2))).digest,out.digest);
});
test('payload, metadata and digest tampering are separately detected',async()=>{
 const out=await exported(),original=JSON.parse(out.text);
 const badPayload={...original,payload:original.payload+' '};assert.equal((await inspectPortableCheckpoint(JSON.stringify(badPayload))).code,'CHECKSUM_MISMATCH');
 badPayload.checksum=checksum(badPayload.payload);assert.equal((await inspectPortableCheckpoint(JSON.stringify(badPayload))).code,'DIGEST_MISMATCH');
 for(const mutate of [x=>x.sourceProfile='qa-other',x=>x.namespace='qa-r11',x=>x.exporterBuild='Other build',x=>x.recovered=true,x=>x.sourceRevision++,x=>x.sourceSlot=1,x=>x.exportedAt='2026-01-01T00:00:00.000Z',x=>x.digest=(x.digest[0]==='0'?'1':'0')+x.digest.slice(1)]){const x=structuredClone(original);mutate(x);assert.equal((await inspectPortableCheckpoint(JSON.stringify(x))).code,'DIGEST_MISMATCH');}
});
test('SHA-256 is integrity, not evidence of legitimate gameplay or a signing authority',async()=>{
 const out=await exported(),resigned=repayload(out,state=>{state.options.flashes=.123;});assert.equal((await inspectPortableCheckpoint(resigned)).ok,true);assert.notEqual(JSON.parse(resigned).digest,out.digest);
});
for(const [name,mutate]of Object.entries({gold:s=>s.gold=1,spent:s=>s.stats.spentGold=-1,points:s=>s.character.skillPoints=999,rewards:s=>s.world.claimedRewards=['same','same'],history:s=>s.world.claimedRewards=['r12:w:report'],legacy:s=>{s.version=4;s.world.objectives.wilderness_accepted=1;},position:s=>s.world.position={x:-99999,y:-99999},recovery:s=>s.recovery={cooldowns:{invalid:-1}}}))test(`recomputed checksums cannot bypass ${name} state validation`,async()=>{
 const out=await exported(),text=repayload(out,mutate),checkpoint=JSON.parse(text);if(name==='legacy'){checkpoint.sourceVersion=4;}
 const file=sign(checkpoint),result=await inspectPortableCheckpoint(file);assert.equal(result.code,'INVALID_STATE',JSON.stringify(result));const empty=memory();assert.equal((await restorePortableCheckpoint(empty,locks(),restoreArgs(out,{text:file,expectedDigest:checkpoint.digest}))).ok,false);assert.equal(empty.writes.length,0);
});
test('wrapper and payload schema/sourceVersion must agree',async()=>{
 const out=await exported(),checkpoint=JSON.parse(out.text);checkpoint.sourceVersion=4;assert.equal((await inspectPortableCheckpoint(sign(checkpoint))).code,'VERSION_MISMATCH');
 const s=JSON.parse(checkpoint.payload);s.schema='other';checkpoint.payload=JSON.stringify(s);checkpoint.checksum=checksum(checkpoint.payload);assert.equal((await inspectPortableCheckpoint(sign(checkpoint))).code,'VERSION_MISMATCH');
});

test('overall file limit counts UTF-8 bytes including wrapper escaping, not JS characters',async()=>{
 const out=await exported(),nearLimit=out.text+' '.repeat(SAVE_LIMIT-Buffer.byteLength(out.text));assert.equal(Buffer.byteLength(nearLimit),SAVE_LIMIT);assert.equal((await inspectPortableCheckpoint(nearLimit)).ok,true);assert.equal((await inspectPortableCheckpoint(nearLimit+' ')).code,'TOO_LARGE');
 const multibyte=out.text+'가'.repeat(Math.ceil(SAVE_LIMIT/3));assert.ok(multibyte.length<SAVE_LIMIT);assert.ok(Buffer.byteLength(multibyte)>SAVE_LIMIT);assert.equal((await inspectPortableCheckpoint(multibyte)).code,'TOO_LARGE');
 const state=createState();state.note='가'.repeat(Math.floor((SAVE_LIMIT-JSON.stringify(state).length-100)/3));assert.equal(validateState(state).ok,true);const f=setup({state});assert.ok(Buffer.byteLength(JSON.stringify(state))<SAVE_LIMIT);const result=await exportPortableCheckpoint(f.storage,f.lock,f.options);assert.equal(result.code,'TOO_LARGE');assert.equal(f.storage.writes.length,0);
});
test('payload over 2 MiB and heavily escaped otherwise bounded payload fail without truncation',async()=>{
 const f=setup(),entry=JSON.parse(f.storage.data.get(f.store.keys.slots[0]));const state=createState();state.note='가'.repeat(Math.ceil(SAVE_LIMIT/3));entry.payload=JSON.stringify(state);entry.checksum=checksum(entry.payload);f.storage.data.set(f.store.keys.slots[0],JSON.stringify(entry));const head=JSON.parse(f.storage.data.get(f.store.keys.head));head.checksum=entry.checksum;f.storage.data.set(f.store.keys.head,JSON.stringify(head));assert.equal((await exportPortableCheckpoint(f.storage,f.lock,f.options)).code,'CORRUPT');assert.equal(f.storage.writes.length,0);
 const escaped=createState();escaped.note='"'.repeat(Math.floor(SAVE_LIMIT/3));const g=setup({state:escaped});assert.ok(Buffer.byteLength(JSON.stringify(escaped))<SAVE_LIMIT);assert.equal((await exportPortableCheckpoint(g.storage,g.lock,g.options)).code,'TOO_LARGE');assert.equal(g.storage.writes.length,0);
});

for(const [name,change,code]of [
 ['missing source',{expectedSourceProfile:undefined},'CHECKPOINT_CONFIRMATION_REQUIRED'],['missing namespace',{expectedNamespace:undefined},'CHECKPOINT_CONFIRMATION_REQUIRED'],['missing digest',{expectedDigest:undefined},'CHECKPOINT_CONFIRMATION_REQUIRED'],['wrong source',{expectedSourceProfile:'qa-other'},'CHECKPOINT_CONFLICT'],['wrong digest',{expectedDigest:'0'.repeat(64)},'CHECKPOINT_CONFLICT'],['other preview namespace',{expectedNamespace:'qa-r11'},'INVALID_NAMESPACE'],['cross namespace',{namespace:'qa-r11'},'INVALID_NAMESPACE'],['both wrong namespace',{namespace:'qa-r11',expectedNamespace:'qa-r11'},'CHECKPOINT_CONFLICT'],['main target',{targetProfile:'main'},'INVALID_PROFILE'],['same target',{targetProfile:SOURCE},'RESTORE_TARGET_REQUIRED'],['missing target',{targetProfile:undefined},'INVALID_PROFILE'],['unknown target namespace',{namespace:'qa-r13'},'INVALID_PROFILE'],['unknown target option',{targetNamespace:'qa-r12'},'INVALID_REQUEST']
])test(`restore fails closed for ${name} before target access`,async()=>{
 const out=await exported(),storage=memory(),lock=locks(),result=await restorePortableCheckpoint(storage,lock,restoreArgs(out,change));assert.equal(result.code,code,JSON.stringify(result));assert.equal(storage.reads.length,0);assert.equal(storage.writes.length,0);assert.equal(lock.calls.length,0);
});
test('invalid restore options and any selected-file substitution fail without storage mutation',async()=>{
 const out=await exported(),storage=memory();assert.equal((await restorePortableCheckpoint(storage,locks(),null)).code,'INVALID_REQUEST');assert.equal((await restorePortableCheckpoint(storage,locks(),{})).ok,false);
 const other=await exported(setup({profile:'qa-other'}));assert.equal((await restorePortableCheckpoint(storage,locks(),restoreArgs(out,{text:other.text}))).code,'CHECKPOINT_CONFLICT');assert.equal(storage.writes.length,0);
});
for(const [index,name]of ['head','slot0','slot1','pre-v4','pre-v5'].entries())for(const contents of ['', '{broken'])test(`any target ${name} occupancy (${contents?'corrupt':'empty string'}) blocks restore and remains untouched`,async()=>{
 const out=await exported(),storage=memory();storage.data.set(targetKeys()[index],contents);const before=new Map(storage.data);assert.equal((await restorePortableCheckpoint(storage,locks(),restoreArgs(out))).code,'RESTORE_TARGET_EXISTS');assert.deepEqual(storage.data,before);assert.equal(storage.writes.length,0);
});
test('concurrent restores serialize the empty check and commit exactly once',async()=>{
 const f=setup(),out=await exported(f),before=new Map(f.storage.data);f.storage.writes.length=0;
 const results=await Promise.all([restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out)),restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out))]);assert.equal(results.filter(x=>x.ok).length,1);assert.equal(results.find(x=>!x.ok).code,'RESTORE_TARGET_EXISTS');assert.equal(f.storage.writes.length,2);preserved(f.storage,before);
});
test('queued restore checks occupancy only after acquiring its destination lock',async()=>{
 const out=await exported(),storage=memory(),lock=locks(),key=profileKeys(TARGET,NAMESPACE).lock;let release,entered;
 const began=new Promise(resolve=>{entered=resolve;});const held=lock.request(key,{mode:'exclusive'},async()=>{entered();await new Promise(resolve=>{release=resolve;});storage.data.set(targetKeys()[4],'new occupant');});await began;
 const request=restorePortableCheckpoint(storage,lock,restoreArgs(out));await new Promise(resolve=>setTimeout(resolve,10));assert.equal(storage.reads.length,0);release();await held;assert.equal((await request).code,'RESTORE_TARGET_EXISTS');assert.equal(storage.writes.length,0);
});
for(const [index,name]of ['head','slot1','pre-v4','pre-v5'].entries())test(`post-slot ${name} race is detected before the head commit`,async()=>{
 const out=await exported(),storage=memory(),keys=profileKeys(TARGET,NAMESPACE),contaminated=[keys.head,keys.slots[1],...targetKeys().slice(3)][index],adapter={getItem:storage.getItem,setItem(key,value){storage.setItem(key,value);if(key===keys.slots[0])storage.data.set(contaminated,'concurrent occupant');}};
 assert.equal((await restorePortableCheckpoint(adapter,locks(),restoreArgs(out))).code,'RESTORE_UNCERTAIN');assert.deepEqual(storage.writes.map(x=>x[0]),[keys.slots[0]]);assert.equal(storage.data.get(contaminated),'concurrent occupant');
});
for(const point of ['slot','head'])for(const kind of ['throw-before','throw-after','discard','alter','read-throw','read-mismatch'])test(`${point} ${kind} returns terminal uncertainty without cleanup or retry`,async()=>{
 const f=setup(),out=await exported(f),before=new Map(f.storage.data),keys=profileKeys(TARGET,NAMESPACE),faultKey=point==='slot'?keys.slots[0]:keys.head;let attempted=false,calls=0;
 const adapter={getItem(key){if(attempted&&key===faultKey){if(kind==='read-throw')throw Error('readback denied');if(kind==='read-mismatch')return 'readback mismatch';}return f.storage.getItem(key);},setItem(key,value){if(key===faultKey){calls++;attempted=true;if(kind==='throw-before')throw Error('before');if(kind==='discard')return;f.storage.setItem(key,kind==='alter'?value+'!':value);if(kind==='throw-after')throw Error('after');}else f.storage.setItem(key,value);},removeItem(){assert.fail('no cleanup');},clear(){assert.fail('no cleanup');}};
 const result=await restorePortableCheckpoint(adapter,f.lock,restoreArgs(out));assert.equal(result.code,'RESTORE_UNCERTAIN',JSON.stringify(result));assert.equal(calls,1);preserved(f.storage,before);assert.equal(f.storage.writes.length,point==='slot'?(kind==='throw-before'||kind==='discard'?0:1):(kind==='throw-before'||kind==='discard'?1:2));
 if(f.storage.data.has(keys.slots[0])){const after=new Map(f.storage.data),again=await restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out));assert.equal(again.code,'RESTORE_TARGET_EXISTS');assert.deepEqual(f.storage.data,after);}
});
test('final commit readback verifies staged slot, inactive slot and both sidecars again',async()=>{
 const out=await exported();for(const key of targetKeys().slice(1)){
  const storage=memory(),keys=profileKeys(TARGET,NAMESPACE),adapter={getItem:storage.getItem,setItem(k,v){storage.setItem(k,v);if(k===keys.head)storage.data.set(key,'late change');}};
  assert.equal((await restorePortableCheckpoint(adapter,locks(),restoreArgs(out))).code,'RESTORE_UNCERTAIN');assert.equal(storage.writes.length,2);assert.equal(storage.data.get(key),'late change');
 }
});
test('lock availability/rejection and pre-write reads fail without changes',async()=>{
 const f=setup(),out=await exported(f),before=new Map(f.storage.data);f.storage.writes.length=0;
 for(const lock of [null,{}, {request:null}]){assert.equal((await exportPortableCheckpoint(f.storage,lock,f.options)).code,'LOCKS_UNAVAILABLE');assert.equal((await restorePortableCheckpoint(f.storage,lock,restoreArgs(out))).code,'LOCKS_UNAVAILABLE');}
 const denied={request(){throw Error('lock denied');}};assert.equal((await exportPortableCheckpoint(f.storage,denied,f.options)).code,'LOCK_FAILED');assert.equal((await restorePortableCheckpoint(f.storage,denied,restoreArgs(out))).code,'LOCK_FAILED');
 const unavailable={getItem(){throw Error('read denied');},setItem(){assert.fail('must not write');}};assert.equal((await exportPortableCheckpoint(unavailable,f.lock,f.options)).code,'UNAVAILABLE');assert.equal((await restorePortableCheckpoint(unavailable,f.lock,restoreArgs(out))).code,'UNAVAILABLE');assert.deepEqual(f.storage.data,before);assert.equal(f.storage.writes.length,0);
});
test('SHA-256 failure never produces a file or starts a restore write',async t=>{
 const f=setup(),out=await exported(f);f.storage.reads.length=0;const before=new Map(f.storage.data);
 t.mock.method(globalThis.crypto.subtle,'digest',async()=>{throw Error('crypto unavailable');});
 assert.equal((await exportPortableCheckpoint(f.storage,f.lock,f.options)).code,'DIGEST_UNAVAILABLE');assert.equal((await inspectPortableCheckpoint(out.text)).code,'DIGEST_UNAVAILABLE');f.storage.reads.length=0;assert.equal((await restorePortableCheckpoint(f.storage,f.lock,restoreArgs(out))).code,'DIGEST_UNAVAILABLE');assert.equal(f.storage.reads.length,0);assert.equal(f.storage.writes.length,0);assert.deepEqual(f.storage.data,before);
});
