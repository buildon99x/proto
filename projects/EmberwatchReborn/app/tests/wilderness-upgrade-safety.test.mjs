import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../src/controller.js';
import {createStore,createSession,readUpgradeBackupV5,restoreUpgradeBackupV5,upgradeBackupV5Key} from '../src/save.js';
import {wildernessInputRevision} from '../src/wilderness.js';
import {earnedBattlefield} from './support/earned-wilderness-route.mjs';
// Scripted earned production-handler reports, not native victories or imports.
const profile='qa-w-upgrade',namespace='qa-r12',locks={request:async(_k,_o,fn)=>fn()};
async function setup(){
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},state=earnedBattlefield();state.version=4;
 const store=createStore(storage,{profile,namespace});assert.equal(store.save(state,{expectedRevision:0}).ok,true);
 const before=new Map(values),controller=createController(createSession(storage,locks,{profile,namespace}));assert.equal((await controller.load()).ok,true);assert.deepEqual(values,before);
 return {values,storage,state,store,controller,before};
}
function accept(controller){const {state,revision}=controller.capture();return {type:'acceptWildernessQuest',life:state.world.life,position:{x:450,y:325},vitals:structuredClone(state.vitals),recovery:structuredClone(state.recovery),expectedStoreRevision:revision,expectedRevision:wildernessInputRevision(state)};}
test('first earned B-to-W acceptance retains exact v4 original and independent resources/recovery',async()=>{
 const f=await setup(),r=await f.controller.dispatch(accept(f.controller));assert.equal(r.ok,true);assert.equal(r.state.world.objectives.wilderness_accepted,1);
 const summary=readUpgradeBackupV5(f.storage,{profile,namespace});assert.equal(summary.sourceVersion,4);assert.equal(summary.targetVersion,5);
 const raw=JSON.parse(f.storage.getItem(upgradeBackupV5Key(profile,namespace))).data.raw;assert.equal(raw.head,f.before.get(f.store.keys.head));assert.deepEqual(raw.slots,f.store.keys.slots.map(k=>f.before.get(k)??null));
 for(const key of ['vitals','recovery','character','gold'])assert.deepEqual(r.state[key],f.state[key]);
});
test('failed W first-upgrade backup blocks queued input without acceptance or speculative epoch',async()=>{
 const f=await setup(),key=upgradeBackupV5Key(profile,namespace),write=f.storage.setItem,captured=f.controller.capture();
 f.storage.setItem=(k,v)=>{if(k===key)throw Error('quota');write(k,v);};
 const results=await Promise.all([f.controller.dispatch(accept(f.controller)),f.controller.dispatch({type:'setOption',option:'flashes',value:.2})]);
 for(const r of results){assert.equal(r.ok,false);assert.equal(r.blocked,true);assert.match(r.code,/^UPGRADE_/);}assert.deepEqual(f.controller.capture(),captured);assert.deepEqual(f.values,f.before);
 f.storage.setItem=write;assert.equal((await f.controller.dispatch(accept(f.controller))).blocked,true);assert.equal((await f.controller.load()).ok,true);assert.equal((await f.controller.dispatch(accept(f.controller))).ok,true);
});
test('uncertain first W head commits acceptance once; old captured action is not restamped',async()=>{
 const f=await setup(),command=accept(f.controller),write=f.storage.setItem;
 f.storage.setItem=(k,v)=>{write(k,v);if(k===f.store.keys.head)throw Error('after head');};
 assert.equal((await f.controller.dispatch(command)).code,'COMMIT_UNCERTAIN');f.storage.setItem=write;
 const loaded=await f.controller.load();assert.equal(loaded.state.world.objectives.wilderness_accepted,1);const snapshot=f.controller.capture();
 assert.equal((await f.controller.dispatch(command)).code,'STALE_STORE_REVISION');assert.deepEqual(f.controller.capture(),snapshot);assert.equal(readUpgradeBackupV5(f.storage,{profile,namespace}).sourceVersion,4);
});
test('explicit pre-W recovery preserves latest W and exact earned B checkpoint without automatic load',async()=>{
 const f=await setup();assert.equal((await f.controller.dispatch(accept(f.controller))).ok,true);const summary=readUpgradeBackupV5(f.storage,{profile,namespace}),before=new Map(f.values),current=f.controller.capture(),targetProfile='qa-w-before';
 const restored=await restoreUpgradeBackupV5(f.storage,locks,{sourceProfile:profile,targetProfile,namespace,expectedBackupChecksum:summary.backupChecksum});assert.equal(restored.ok,true);
 for(const [k,v] of before)assert.equal(f.values.get(k),v);assert.deepEqual(f.controller.capture(),current);
 const old=createStore(f.storage,{profile:targetProfile,namespace}).load();assert.equal(old.state.version,4);assert.deepEqual(old.state,f.state);assert.equal(old.state.world.objectives.wilderness_accepted,undefined);
});
