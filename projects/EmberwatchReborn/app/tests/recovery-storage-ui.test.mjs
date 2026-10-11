// Synthetic historical states, real current recovery page/save APIs and exact
// preserved R11 migration. Only DOM and Web Locks are small local probes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mountRecoveryPage} from '../src/recovery-page.js';
import {createState,migrateState} from '../src/state.js';
import {createStore,profileKeys,upgradeBackupKey,upgradeBackupV5Key} from '../src/save.js';
import {createStore as r11Store} from './fixtures/r11b6/save.js';
import {migrateState as r11Migrate} from './fixtures/r11b6/state.js';
const namespace='qa-r11',profile='qa-original',target='qa-recovery-real';
function setup(){
 const data=new Map(),writes=[],storage={getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}},locks={request:async(_name,_options,callback)=>callback()};
 const legacy=createState();legacy.version=3;delete legacy.actionSlots;legacy.options.controls.version=2;delete legacy.options.controls.bindings.expert1;delete legacy.options.controls.bindings.expert2;
 const old=r11Store(storage,{profile,namespace});assert.equal(old.save(legacy,{expectedRevision:0}).ok,true);const preV4=old.load(),rawV3=storage.getItem(old.keys.slots[preV4.slot]);assert.equal(old.save(r11Migrate(legacy),{expectedRevision:1}).ok,true);const preV5=old.load(),rawV4=storage.getItem(old.keys.slots[preV5.slot]),preV4Bytes=storage.getItem(upgradeBackupKey(profile,namespace));
 const current=createStore(storage,{profile,namespace});assert.equal(current.save(migrateState(preV5.state),{expectedRevision:2}).ok,true);assert.equal(storage.getItem(upgradeBackupKey(profile,namespace)),preV4Bytes);
 const modal={innerHTML:'',querySelector:()=>({focus(){}})},els={modal,recoverySource:{value:profile},upgradeBackupKind:{value:''},upgradeBackupTarget:{value:target}},events={};
 const document={getElementById:id=>els[id],addEventListener:(name,fn)=>events[name]=fn};mountRecoveryPage({document,storage,locks,pathname:'/qa-r11/recovery'});
 const confirmation=()=>({backupKind:/data-backup-kind="([^"]+)"/.exec(modal.innerHTML)?.[1],backupChecksum:/data-backup-checksum="([^"]+)"/.exec(modal.innerHTML)?.[1],backupSelection:/data-backup-selection="([^"]+)"/.exec(modal.innerHTML)?.[1]});
 const click=action=>events.click({target:{closest:()=>({dataset:{action,...confirmation()},disabled:false})}});
 return {storage,locks,data,writes,current,modal,els,click,preV4,preV5,rawV3,rawV4};
}
for(const kind of ['pre-v4','pre-v5'])test(`real recovery UI selects ${kind}, restores its exact original and keeps latest progress and both checkpoints`,async()=>{
 const h=setup(),before=new Map(h.data),writes=h.writes.length;assert.equal(h.current.load().state.version,5);h.els.upgradeBackupKind.value=kind;await h.click('recovery-qa');assert.equal(h.writes.length,writes);assert.match(h.modal.innerHTML,new RegExp(`선택 ${kind}`));assert.match(h.modal.innerHTML,new RegExp(`저장 형식${kind==='pre-v4'?'3 → 4':'4 → 5'} 직전`));await h.click('upgrade-backup-restore');assert.match(h.modal.innerHTML,/복사했습니다/);const restored=createStore(h.storage,{profile:target,namespace}),loaded=restored.load(),original=kind==='pre-v4'?h.preV4:h.preV5;assert.deepEqual(loaded.state,original.state);assert.equal(loaded.revision,original.revision);assert.equal(h.storage.getItem(restored.keys.slots[loaded.slot]),kind==='pre-v4'?h.rawV3:h.rawV4);for(const [key,value]of before)assert.equal(h.storage.getItem(key),value,key);assert.equal(h.writes.length-writes,2,'restore writes only selected target envelope and head, without auto-load/save');assert.match(h.modal.innerHTML,/자동으로 이어하지 않습니다/);
});
for(const kind of ['pre-v4','pre-v5'])for(const occupied of ['head','slot0','slot1','pre-v4','pre-v5'])test(`real ${kind} UI rejects target containing ${occupied}, including corrupt orphan bytes`,async()=>{
 const h=setup(),keys=profileKeys(target,namespace),key=occupied==='head'?keys.head:occupied==='slot0'?keys.slots[0]:occupied==='slot1'?keys.slots[1]:occupied==='pre-v4'?upgradeBackupKey(target,namespace):upgradeBackupV5Key(target,namespace);h.data.set(key,'{corrupt-orphan');h.els.upgradeBackupKind.value=kind;await h.click('recovery-qa');const before=new Map(h.data),count=h.writes.length;await h.click('upgrade-backup-restore');assert.doesNotMatch(h.modal.innerHTML,/복사했습니다/);assert.match(h.modal.innerHTML,/기록이 있습니다/);assert.deepEqual(h.data,before);assert.equal(h.writes.length,count);
});
test('real delayed restore finishes only its authorized target and cannot replace a returned standalone title',async()=>{
 const h=setup();h.els.upgradeBackupKind.value='pre-v5';await h.click('recovery-qa');let resume;h.locks.request=async(_name,_options,callback)=>{h.locks.request=async(_n,_o,fn)=>fn();return new Promise(resolve=>resume=()=>resolve(callback()));};const pending=h.click('upgrade-backup-restore');await h.click('upgrade-backup-title');const title=h.modal.innerHTML,before=new Map(h.data);resume();await pending;assert.equal(h.modal.innerHTML,title);for(const [key,value]of before)assert.equal(h.storage.getItem(key),value);assert.deepEqual(createStore(h.storage,{profile:target,namespace}).load().state,h.preV5.state);assert.equal(h.current.load().state.version,5);
});
