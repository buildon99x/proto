import test from 'node:test';import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState,migrateState} from '../src/state.js';
import {previewPromotion,ADEPT_RECEIPT} from '../src/promotion.js';
import {emptyRecovery,validateRecovery,battleReport} from '../src/recovery.js';
import {createStore} from '../src/save.js';import {createController} from '../src/controller.js';
import {createBattle,stepBattle} from '../src/combat.js';import {combatCheckpoint} from '../src/combat-persistence.js';
import {createRuntimeGate} from '../src/runtime-gate.js';import {route,run,report} from './support/earned-route.mjs';
const command=s=>({type:'promoteAdept',...report(s,{x:260,y:325}),recovery:s.recovery??emptyRecovery()});
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: earned reducer route promotes once at L5 without injecting XP or promotion flags`,()=>{
 const s=route(difficulty).state,before=structuredClone(s),p=previewPromotion(s);assert.equal(p.available,true);
 const n=run(s,command(s)).state;assert.equal(n.character.tier,'adept');assert.equal(n.world.claimedRewards.filter(x=>x===ADEPT_RECEIPT).length,1);
 assert.deepEqual({...n.character,tier:'apprentice'},s.character);assert.equal(n.gold,s.gold);assert.deepEqual(n.stats,s.stats);assert.deepEqual(n.vitals,s.vitals);assert.deepEqual(s,before);
 assert.equal(reduceRuntime(n,command(n)).code,'ALREADY_PROMOTED');
 const m=memory(),store=createStore(m);assert.equal(store.save(n,{expectedRevision:0}).ok,true);assert.deepEqual(store.load().state,n);
});
test('promotion requires level, commission, training, alive state, trainer reach, same life and legal resource report',()=>{
 const fresh=createState();assert.equal(previewPromotion(fresh).code,'TRAIN_FIRST');
 const trained=reduceRuntime(fresh,{type:'trainStarter',position:{x:260,y:325}}).state;assert.equal(previewPromotion(trained).code,'LEVEL_REQUIRED');
 const s=route().state;
 for(const edit of [c=>c.position={x:800,y:500},c=>c.life++,c=>c.vitals.hp=0,c=>c.vitals.mana=999,c=>c.recovery.lock=-1,c=>delete c.recovery]){const c=command(s);edit(c);const before=structuredClone(s);assert.equal(reduceRuntime(s,c).ok,false);assert.deepEqual(s,before);}
 const missing=structuredClone(s);delete missing.world.objectives.adept_commission;missing.world.claimedRewards=missing.world.claimedRewards.filter(x=>x!=='r4:report');assert.equal(previewPromotion(missing).code,'COMMISSION_REQUIRED');
});
test('save validation rejects fabricated tier, absent or unknown promotion receipt and legacy masquerading as adept',()=>{
 const s=route().state,n=run(s,command(s)).state;
 for(const edit of [x=>x.character.tier='apprentice',x=>x.world.claimedRewards=x.world.claimedRewards.filter(r=>r!==ADEPT_RECEIPT),x=>x.world.claimedRewards.push('r5:cheat'),x=>x.version=2]){const bad=structuredClone(n);edit(bad);assert.equal(validateState(bad).ok,false);}
 const fake=structuredClone(s);fake.character.tier='adept';assert.equal(validateState(fake).code,'INVALID_PROMOTION');
});
test('old v2 keys/gear/XP/recovery migrate in memory without any storage write; first accepted command commits v4',async()=>{
 const old=route().state;old.version=2;old.options.controls.version=1;delete old.options.controls.bindings.heal;delete old.options.controls.bindings.judgement;delete old.options.controls.bindings.expert1;delete old.options.controls.bindings.expert2;delete old.actionSlots;old.options.controls.bindings.hammer=['KeyZ'];old.options.controls.bindings.interact=['KeyE'];old.options.controls.preset='custom';if(old.recovery)old.recovery=Object.fromEntries(['cooldowns','lock','manaDelay','staminaDelay','invuln','potionCooldown'].map(k=>[k,old.recovery[k]]));
 assert.equal(validateState(old).ok,true);const m=memory(),store=createStore(m);store.save(old,{expectedRevision:0});const bytes=new Map(m.data),c=createController(store),loaded=await c.load();
 assert.equal(loaded.ok,true);assert.equal(loaded.state.version,5);assert.deepEqual(m.data,bytes);assert.equal(store.load().state.version,2);assert.deepEqual(loaded.state.options.controls.bindings.heal,[]);assert.deepEqual(loaded.state.options.controls.bindings.judgement,[]);assert.deepEqual(loaded.state.options.controls.bindings.hammer,['KeyZ']);assert.deepEqual(loaded.state.options.controls.bindings.interact,['KeyE']);
 assert.deepEqual(loaded.state.character,old.character);assert.deepEqual(loaded.state.inventory,old.inventory);
 const changed=await c.dispatch({type:'setOption',option:'flashes',value:0});assert.equal(changed.ok,true);assert.equal(store.load().state.version,5);assert.equal(store.load().revision,2);
 assert.equal(migrateState(loaded.state).version,5);
});
test('strict recovery validates new skills/buff and rejects unearned, overrank, expired or malformed buffs',()=>{
 const r=emptyRecovery();r.cooldowns.lay_on_hands=13;r.cooldowns.judgement=7;assert.equal(validateRecovery(r),true);assert.equal(validateRecovery(r,{legacy:true}),false);
 for(const buff of [{remaining:4,multiplier:3},{remaining:5,multiplier:1.25},{remaining:0,multiplier:1.25},{remaining:1,multiplier:1.25,extra:1}])assert.equal(validateRecovery({...r,regenBuff:buff}),false);
 assert.equal(validateRecovery({...r,regenBuff:{remaining:4,multiplier:1.25}},{character:{skills:{}}}),false);
 assert.equal(validateRecovery({...r,regenBuff:{remaining:4,multiplier:1.5}},{character:{skills:{invigorating_touch:1}}}),false);
});
test('real action start is checkpointed before another frame; reload retains cost and nonzero recovery without a free projectile',async()=>{
 const m=memory(),store=createStore(m),s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const b=createBattle(s);
 const events=stepBattle(b,s.character,.02,{hammer:true}),cmd=combatCheckpoint(b,events);assert.equal(cmd.type,'checkpoint');assert.equal(cmd.vitals.mana,25);assert.ok(cmd.recovery.lock>0);assert.equal(b.shots.length,0);
 assert.equal((await c.dispatch(cmd)).ok,true);const restored=createBattle((await createController(store).load()).state);assert.equal(restored.p.mana,25);assert.ok(restored.p.cooldowns.righteous_hammer>0);assert.ok(restored.p.recoveryLock>0);assert.equal(restored.p.action,null);assert.equal(restored.shots.length,0);
 const before=restored.p.mana;assert.equal(stepBattle(restored,s.character,0,{hammer:true}).some(e=>e.type==='actionStarted'),false);assert.equal(restored.p.mana,before);
});
test('critical save failure gates simulation and does not publish the uncommitted resource loss',async()=>{
 const m=memory(),store=createStore(m),s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const b=createBattle(s),events=stepBattle(b,s.character,.02,{hammer:true}),gate=createRuntimeGate();
 m.setItem=()=>{throw new Error('quota');};const saved=await c.dispatch(combatCheckpoint(b,events));assert.equal(saved.ok,false);gate.block(saved.reason);assert.equal(gate.canStep({hasBattle:true,paused:false,busy:false,hidden:false}),false);assert.equal(c.snapshot().vitals.mana,40);assert.equal(store.load().state.vitals.mana,40);
});
test('one combat frame batches kills/death/resources once and arrival wait never autosaves',()=>{
 const s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state,b=createBattle(s);const c=combatCheckpoint(b,[{type:'actionStarted'},{type:'heroHurt'},{type:'defeated',id:'test'},{type:'heroDead'}]);assert.equal(c.type,'settleCombat');assert.deepEqual(c.defeated,['test']);
 b.awaitingAdvance=true;assert.equal(combatCheckpoint(b,[],{elapsed:100}),null);b.awaitingAdvance=false;assert.equal(combatCheckpoint(b,[],{elapsed:1}).type,'checkpoint');assert.deepEqual(battleReport(b).recovery.regenBuff,null);
});

test('fresh untrained tutorial may move longer than autosave interval without a TRAIN_FIRST critical lock',()=>{
 const s=createState(),b=createBattle(s);let elapsed=0;
 for(let i=0;i<120;i++){const events=stepBattle(b,s.character,.02,{move:{x:-1,y:-1}});elapsed+=.02;assert.equal(combatCheckpoint(b,events,{elapsed}),null);}
 assert.ok(elapsed>1);assert.equal(s.vitals,undefined);const trained=reduceRuntime(s,{type:'trainStarter',position:{x:260,y:325}});assert.equal(trained.ok,true);const active=createBattle(trained.state);assert.equal(combatCheckpoint(active,[],{elapsed:1}).type,'checkpoint');
});

test('manual untrained town checkpoint exits safely with position only, no free skills, vitals, items or XP',async()=>{
 const original=createState(),b=createBattle(original);b.p.x=260;b.p.y=325;
 const report=battleReport(b),r=reduceRuntime(original,{type:'checkpoint',...report});assert.equal(r.ok,true);assert.deepEqual(r.state.world.position,report.position);assert.equal(r.state.vitals,undefined);assert.deepEqual(r.state.character.skills,{});assert.equal(r.state.recovery,undefined);assert.deepEqual(r.state.inventory,original.inventory);assert.deepEqual(r.state.stats,original.stats);
 const m=memory(),store=createStore(m);store.save(r.state,{expectedRevision:0});const c=createController(store),loaded=await c.load();assert.deepEqual(createBattle(loaded.state).p.x,260);assert.equal(loaded.state.vitals,undefined);
 const trained=await c.dispatch({type:'trainStarter',position:report.position});assert.equal(trained.ok,true);assert.equal(Object.keys(trained.state.character.skills).length,4);assert.equal(trained.state.inventory.consumables.health_potion,2);
});
test('untrained manual save rejects invalid life, dead/invalid pool and position reports without writing',()=>{
 const s=createState(),b=createBattle(s),base={type:'checkpoint',...battleReport(b)};
 for(const edit of [c=>c.life++,c=>c.vitals.hp=0,c=>c.vitals.hp=999,c=>c.position={x:-999,y:0},c=>c.recovery.lock=-1]){const c=structuredClone(base);edit(c);assert.equal(reduceRuntime(s,c).ok,false);assert.equal(s.vitals,undefined);assert.equal(s.world.position,undefined);}
});
