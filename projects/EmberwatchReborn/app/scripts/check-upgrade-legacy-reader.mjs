// Preserve actual R7→R11 schema4 history; schema5 has a separate real-R11 check.
// Defaults to exact-byte frozen R7a4 fixtures; an external preserved dist can
// also be supplied. Neither historical tree is ever edited by this check.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createStore,createSession,readUpgradeBackup,restoreUpgradeBackup,profileKeys,upgradeBackupKey} from '../tests/fixtures/r11b6/save.js';
import {migrateState} from '../tests/fixtures/r11b6/state.js';

if(!vm.SourceTextModule)throw Error('Run with --experimental-vm-modules.');
const root=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('../tests/fixtures/r7a4',import.meta.url)),context=vm.createContext({TextEncoder,structuredClone,console}),modules=new Map(),hashes=new Map();
if(!process.argv[2]){
 const manifest=JSON.parse(await readFile(resolve(root,'fixture-manifest.json'),'utf8'));
 assert.equal(manifest.sourceCommit,'a8df609a4b8c6a9b6c07194867bd828442aa4dab');
 for(const file of manifest.files){const bytes=await readFile(resolve(root,file.path));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,`Historical fixture drift: ${file.path}`);}
}
function module(file){
 file=resolve(file);if(!file.startsWith(root+'/'))throw Error('Legacy import escaped preserved tree');
 if(!modules.has(file))modules.set(file,readFile(file,'utf8').then(source=>{hashes.set(file,createHash('sha256').update(source).digest('hex'));return new vm.SourceTextModule(source,{context,identifier:file});}));
 return modules.get(file);
}
const old={};
for(const file of ['save.js','state.js','controller.js']){
 const m=await module(resolve(root,file));if(m.status==='unlinked')await m.link((name,ref)=>module(resolve(dirname(ref.identifier),name)));if(m.status!=='evaluated')await m.evaluate();Object.assign(old,m.namespace);
}
assert.equal(old.STATE_VERSION,3,'This historical test requires actual schema-3 R7');
assert.ok((await readFile(resolve(root,'main.js'),'utf8')).includes('R7a4'),'Supply preserved R7a4, not a later schema-3 runtime');
const oldClone=vm.runInContext('value=>JSON.parse(JSON.stringify(value))',context),hostClone=value=>JSON.parse(JSON.stringify(value));
function memory(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};}
function locks(){const tails=new Map(),calls=[];return {calls,async request(name,options,fn){calls.push([name,options.mode]);const previous=tails.get(name)??Promise.resolve();let release;const gate=new Promise(r=>{release=r;});tails.set(name,previous.then(()=>gate));await previous;try{return await fn();}finally{release();}}};}
async function fixture({trained=false}={}){const storage=memory(),lock=locks();let state=old.createState();if(trained){const r=old.reduceRuntime(state,oldClone({type:'trainStarter',position:{x:260,y:325}}));assert.equal(r.ok,true);state=r.state;}const legacy=old.createSession(storage,lock),current=createSession(storage,lock);assert.equal((await legacy.save(state,{expectedRevision:0})).ok,true);const controller=old.createController(legacy);assert.equal((await controller.load()).ok,true);return {storage,lock,state,legacy,current,controller,newState:migrateState(hostClone(state))};}
const oldCommand=()=>oldClone({type:'setOption',option:'flashes',value:.2});
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};

// Confirm the genuine historical bug against the old reader before checking
// the fix: only the R7-recognized previousCommit field exposes its old slot.
{
 const f=await fixture();assert.equal((await f.current.save(f.newState,{expectedRevision:1})).ok,true);const key=profileKeys().head,head=JSON.parse(f.storage.getItem(key));head.previousCommit=head.upgradePreviousCommit;delete head.upgradePreviousCommit;f.storage.data.set(key,JSON.stringify(head));
 check(f.legacy.load().state.version===3,'R7 recovered the legacy slot under the original unsafe receipt layout');
 check((await f.legacy.save(f.state,{expectedRevision:1})).ok,'Original R7 accepts stale old revision and overwrites upgraded slot without fence');
}
{
 const f=await fixture();assert.equal((await f.current.save(f.newState,{expectedRevision:1})).ok,true);const before=new Map(f.storage.data);
 check(f.legacy.load().code==='CORRUPT','Fresh R7 reader refuses fenced v4');
 check((await f.legacy.save(f.state,{expectedRevision:1})).code==='CORRUPT','Stale R7 revision1 writer refuses fenced v4');
 check((await f.controller.dispatch(oldCommand())).code==='CORRUPT','Already-loaded actual R7 controller refuses fenced v4');
 assert.deepEqual(f.storage.data,before);checks++;check(f.current.load().state.version===4,'Current reader retains committed v4');
 const current=f.current.load();assert.equal((await f.current.save(current.state,{expectedRevision:current.revision})).ok,true);const head=JSON.parse(f.storage.getItem(profileKeys().head));check(head.previousCommit.revision===2&&!Object.hasOwn(head,'upgradePreviousCommit'),'Later v4 commits preserve ordinary receipt layout');check(f.legacy.load().code==='CORRUPT','R7 cannot read later preceding v4 commit');
}
for(const after of [false,true]){
 const f=await fixture(),key=profileKeys().head;const storage={...f.storage,setItem(k,v){if(k===key){if(after)f.storage.setItem(k,v);throw Error(after?'after head':'before head');}f.storage.setItem(k,v);}};
 check((await createSession(storage,f.lock).save(f.newState,{expectedRevision:1})).code==='COMMIT_UNCERTAIN','Head uncertainty is reported');
 if(after){check(f.current.load().state.version===4,'Write-then-throw committed v4');check(f.legacy.load().code==='CORRUPT','Write-then-throw also committed fence');check((await f.controller.dispatch(oldCommand())).code==='CORRUPT','Old controller blocked after uncertain committed head');}
 else{check(f.current.load().state.version===3,'Before-head failure keeps actual old commit');check(f.legacy.load().state.version===3,'R7 still reads un-upgraded old head');check((await f.controller.dispatch(oldCommand())).ok,'R7 can continue when upgrade never committed');}
}
{
 const f=await fixture();assert.equal((await f.current.save(f.newState,{expectedRevision:1})).ok,true);const current=f.current.load();f.storage.data.set(profileKeys().slots[current.slot],'corrupt');
 check(f.current.load().recovered&&f.current.load().state.version===3,'Patched reader recovers original from upgradePreviousCommit');check(f.legacy.load().code==='CORRUPT','Old R7 cannot use new recovery field');check((await f.controller.dispatch(oldCommand())).code==='CORRUPT','Loaded R7 controller still blocked after new active corruption');
 assert.equal((await f.current.save(f.newState,{expectedRevision:1})).ok,true);check(f.current.load().state.version===4,'Patched retry restores a fenced new commit');
}
{
 const f=await fixture({trained:true}),sourceBefore=new Map(f.storage.data);assert.equal((await f.current.save(f.newState,{expectedRevision:1})).ok,true);const protectedBefore=new Map(f.storage.data),summary=readUpgradeBackup(f.storage),target='qa-r7-recovered';
 const restored=await restoreUpgradeBackup(f.storage,f.lock,{sourceProfile:'main',targetProfile:target,namespace:'release',expectedBackupChecksum:summary.backupChecksum});check(restored.ok,'Explicit bounded restore succeeds');
 const oldTarget=old.createSession(f.storage,f.lock,{profile:target}),loaded=oldTarget.load();check(loaded.ok&&loaded.state.version===3,'Actual R7 store opens restored original');check(old.validateState(loaded.state).ok,'Actual R7 validator accepts restored envelope payload');assert.deepEqual(hostClone(loaded.state),hostClone(f.state));checks++;
 check((await oldTarget.save(loaded.state,{expectedRevision:loaded.revision})).ok,'Actual R7 can continue and save restored QA');
 for(const [key,value]of protectedBefore)assert.equal(f.storage.getItem(key),value);checks++;
 const backup=JSON.parse(f.storage.getItem(upgradeBackupKey()));assert.equal(backup.data.raw.head,sourceBefore.get(profileKeys().head));checks++;
}
{
 const f=await fixture(),keys=profileKeys();assert.equal((await f.legacy.save(f.state,{expectedRevision:1})).ok,true);f.storage.data.set(keys.head,'corrupt');check(f.legacy.load().recovered&&f.legacy.load().revision===1,'R7 originally recovers its earlier committed checkpoint');
 const storage={...f.storage,setItem(k,v){if(k===keys.head)throw Error('before head');f.storage.setItem(k,v);}};assert.equal((await createSession(storage,f.lock).save(f.newState,{expectedRevision:1})).code,'COMMIT_UNCERTAIN');
 check(f.current.load().recovered&&f.current.load().revision===1,'Patched reader retains recovered original after interrupted upgrade');check(f.legacy.load().code==='CORRUPT','Known limit: R7 cannot parse staged v4 proof when original head was already corrupt');
 const summary=readUpgradeBackup(f.storage),target='qa-recovered-head';assert.equal((await restoreUpgradeBackup(f.storage,f.lock,{sourceProfile:'main',targetProfile:target,namespace:'release',expectedBackupChecksum:summary.backupChecksum})).ok,true);check(old.createStore(f.storage,{profile:target}).load().revision===1,'Explicit old-checkpoint QA recovery remains readable in R7');
}
for(const [file,hash]of hashes)assert.equal(createHash('sha256').update(await readFile(file,'utf8')).digest('hex'),hash,`Historical source changed: ${file}`);
console.log(JSON.stringify({ok:true,checks,legacyRoot:root,legacyModulesRead:hashes.size,legacySourceUnchanged:true,scope:'actual R7a4 validator/store/controller and patched save API; no browser gameplay acceptance'},null,2));
