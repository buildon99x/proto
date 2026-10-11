import {battleReport} from '../src/recovery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
import {deriveStats} from '../src/warrior-growth.js';
import {createStore} from '../src/save.js';
import {createController} from '../src/controller.js';

// Memory-storage and scripted NPC-position fixtures. This does not run main.js
// or establish that its success-only integration/normal-input QA has passed.
const command=(s,c)=>{const r=reduceRuntime(s,c);assert.equal(r.ok,true,JSON.stringify(r));return r.state;};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function fixture(){const s=command(createState(),{type:'trainStarter',position:{x:260,y:325}}),b=createBattle(s);return {s,b};}
const report=battleReport;
function charged(){const f=fixture();stepBattle(f.b,f.s.character,.02,{charge:true,aim:{x:450,y:325}});while(f.b.p.action.duration-f.b.p.action.elapsed>.16)stepBattle(f.b,f.s.character,.02,{});stepBattle(f.b,f.s.character,.02,{hammer:true,aim:{x:450,y:325}});assert.ok(f.b.p.action);assert.ok(f.b.skillIntent);f.s=command(f.s,{type:'checkpoint',...report(f.b)});return f;}

test('actual rest reducer synchronizes resources and every recovery field, clearing only its transient action state',()=>{
 const {s,b}=charged();assert.ok(b.p.cooldowns.shield_charge>0);assert.ok(b.p.action.duration>b.p.action.elapsed);
 const rested=command(s,{type:'rest',position:{x:350,y:250}}),before=structuredClone(rested);b.p.block=true;b.p.moving=true;
 syncCommittedBattle(b,freeze(rested),{resetRecovery:true});
 assert.deepEqual({hp:b.p.hp,mana:b.p.mana,stamina:b.p.stamina},rested.vitals);assert.deepEqual(b.p.cooldowns,{});
 for(const field of ['recoveryLock','manaDelay','staminaDelay','invuln','potionCooldown'])assert.equal(b.p[field],0,field);
 assert.equal(b.p.action,null);assert.equal(b.p.block,false);assert.equal(b.p.moving,false);assert.equal(b.skillIntent,null);
 assert.deepEqual(b.stats,deriveStats(rested.character,rested).stats);assert.deepEqual(rested,before);
 for(let i=0;i<100;i++)assert.equal(stepBattle(b,rested.character,.02).some(e=>e.type==='sound'&&e.name==='magicCharge'),false);
});
test('ordinary committed checkpoint refreshes pools/stats without restarting or clearing action, skill cooldowns or intent',()=>{
 const {s,b}=charged(),action=b.p.action,cooldowns=b.p.cooldowns,intent=b.skillIntent;
 const unchanged={lock:b.p.recoveryLock,manaDelay:b.p.manaDelay,staminaDelay:b.p.staminaDelay,invuln:b.p.invuln,block:b.p.block,moving:b.p.moving};
 const before=structuredClone(s);syncCommittedBattle(b,freeze(s));
 assert.equal(b.p.action,action);assert.equal(b.p.cooldowns,cooldowns);assert.equal(b.skillIntent,intent);
 assert.deepEqual({lock:b.p.recoveryLock,manaDelay:b.p.manaDelay,staminaDelay:b.p.staminaDelay,invuln:b.p.invuln,block:b.p.block,moving:b.p.moving},unchanged);
 assert.deepEqual({hp:b.p.hp,mana:b.p.mana,stamina:b.p.stamina},s.vitals);assert.deepEqual(s,before);
});
test('default sync preserves in-flight timing even when committed recovery contains different values',()=>{
 const {s,b}=charged(),rested=command(s,{type:'rest',position:{x:350,y:250}}),action=b.p.action,cooldowns=b.p.cooldowns,intent=b.skillIntent;
 b.p.potionCooldown=4;const lock=b.p.recoveryLock,delay=b.p.staminaDelay;syncCommittedBattle(b,rested);
 assert.equal(b.p.action,action);assert.equal(b.p.cooldowns,cooldowns);assert.equal(b.skillIntent,intent);assert.ok(b.p.cooldowns.shield_charge>0);
 assert.equal(b.p.recoveryLock,lock);assert.equal(b.p.staminaDelay,delay);assert.equal(b.p.potionCooldown,0);
});
test('reset maps saved lock to live recoveryLock and clones cooldown values rather than aliasing the save',()=>{
 const {s,b}=fixture();Object.assign(b.p,{cooldowns:{shield_charge:2,mace_swing:.1},recoveryLock:.3,manaDelay:.4,staminaDelay:.5,invuln:.6,potionCooldown:4});
 const committed=command(s,{type:'checkpoint',...report(b)}),before=structuredClone(committed);syncCommittedBattle(b,freeze(committed),{resetRecovery:true});
 assert.deepEqual(b.p.cooldowns,{shield_charge:2,mace_swing:.1});assert.notEqual(b.p.cooldowns,committed.recovery.cooldowns);
 assert.equal(b.p.recoveryLock,.3);assert.equal(b.p.manaDelay,.4);assert.equal(b.p.staminaDelay,.5);assert.equal(b.p.invuln,.6);assert.equal(b.p.potionCooldown,4);
 b.p.cooldowns.shield_charge=1;assert.deepEqual(committed,before);
});
test('repeated committed rest synchronization is idempotent and leaves encounter identity and progress untouched',()=>{
 const {s,b}=charged(),rested=command(s,{type:'rest',position:{x:350,y:250}}),enemies=b.enemies,map=b.map,position={x:b.p.x,y:b.p.y},life=b.stateLife;
 syncCommittedBattle(b,rested,{resetRecovery:true});const once=structuredClone(b);syncCommittedBattle(b,rested,{resetRecovery:true});assert.deepEqual(b,once);
 assert.equal(b.enemies,enemies);assert.equal(b.map,map);assert.equal(b.stateLife,life);assert.deepEqual({x:b.p.x,y:b.p.y},position);
});
test('absent battle/untrained vitals are no-ops and reset cannot silently invent missing saved recovery',()=>{
 assert.doesNotThrow(()=>syncCommittedBattle(null,createState()));const {s,b}=fixture(),before=structuredClone(b);
 syncCommittedBattle(b,createState());assert.deepEqual(b,before);
 assert.throws(()=>syncCommittedBattle(b,s,{resetRecovery:true}),/Committed recovery/);assert.deepEqual(b,before);
});
test('invalid committed character fails before mutating live resources',()=>{
 const {s,b}=charged(),bad=structuredClone(s),before=structuredClone(b);bad.character.level=NaN;
 assert.throws(()=>syncCommittedBattle(b,bad),/Invalid committed character/);assert.deepEqual(b,before);
});
test('success-only caller contract leaves live battle untouched after an actual rest save failure',async()=>{
 const {s,b}=charged(),data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=createStore(storage,{profile:'qa-rest-sync'});
 assert.equal(store.save(s,{expectedRevision:0}).ok,true);const c=createController(store);assert.equal((await c.load()).ok,true);
 const original=storage.setItem;storage.setItem=(key,value)=>{if(key===store.keys.head)throw new Error('fixture quota');original(key,value);};
 const before=structuredClone(b),result=await c.dispatch({type:'rest',position:{x:350,y:250}});let syncCalls=0;
 // Required main integration: do not call the sync helper outside this guard.
 if(result.ok){syncCalls++;syncCommittedBattle(b,result.state,{resetRecovery:true});}
 assert.equal(result.code,'COMMIT_UNCERTAIN');assert.equal(syncCalls,0);assert.deepEqual(b,before);assert.deepEqual(c.snapshot(),s);assert.deepEqual(store.load().state,s);
});
