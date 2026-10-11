import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validateState,reduceRuntime,migrateState,MAX_RECEIPTS,STATE_SCHEMA} from '../src/state.js';
import {promoteExpert,previewExpertPromotion,previewPromotion,validatePromotion,ADEPT_RECEIPT,EXPERT_RECEIPT,EXPERT_GOLD_COST} from '../src/promotion.js';
import {createController} from '../src/controller.js';
import {createStore,createSession,checksum} from '../src/save.js';
import {createRuntimeGate} from '../src/runtime-gate.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {combatCheckpoint} from '../src/combat-persistence.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
import {emptyRecovery,battleReport} from '../src/recovery.js';
import {trainingGoldBalances} from '../src/training-economy.js';
import {getRegion} from '../src/world.js';
import {validateDungeonProgress,dungeonPortalAllowed} from '../src/dungeon.js';
import {validateQuarryProgress,quarryPortalAllowed} from '../src/quarry.js';
import {validatePassProgress,passPortalAllowed,passTierAllowed} from '../src/pass.js';
import {validateSignalProgress,signalPortalAllowed,signalTierAllowed} from '../src/signal.js';
import {validateFurnaceProgress,furnacePortalAllowed,furnaceTierAllowed} from '../src/furnace.js';
import {TOMB_GROUPS} from '../src/tomb-content.js';
import {validateTombProgress,tombPortalAllowed,tombInputRevision} from '../src/tomb.js';
import {validateWarriorGrowth,previewSkill,deriveStats} from '../src/warrior-growth.js';
import {grantExperience,createCharacter,xpForLevel} from '../src/progression.js';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {route,report,run,travel} from './support/earned-route.mjs';

// SCRIPTED production-handler T fixtures: positions/defeat reports, not actual
// combat or browser play. Explicit boundary ledger/level modifications below
// are synthetic tests, never represented as earned ordinary-input progression.
const clone=x=>structuredClone(x),trainer={x:260,y:325};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function command(s,revision=1){return {type:'promoteExpert',...report(s,trainer),recovery:clone(s.recovery??emptyRecovery()),expectedRevision:revision,expectedGoldCost:120};}
function reject(s,c,code,context={revision:1}){
 const before=clone(s),input=clone(c),result=reduceRuntime(freeze(s),freeze(c),context);
 assert.equal(result.ok,false,JSON.stringify(result));if(code)assert.equal(result.code,code,JSON.stringify(result));
 assert.deepEqual(s,before);assert.deepEqual(c,input);assert.equal(Object.hasOwn(result,'state'),false);return result;
}
function promote(s,revision=1){const before=clone(s),c=command(s,revision),result=reduceRuntime(freeze(s),freeze(c),{revision});assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(s,before);assert.equal(validateState(result.state).ok,true);return result.state;}
function balance(s,gold){s=clone(s);s.stats.spentGold=s.stats.earnedGold-gold;s.gold=gold;assert.equal(validateState(s).ok,true);return s;}
function memory(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};}
function serialLocks(){let queue=Promise.resolve();return {request(_key,_options,fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}};}
async function controllerFor(state,storage=memory(),locks=serialLocks()){
 const store=createSession(storage,locks,{profile:'qa-expert-promotion'});assert.equal((await store.save(state,{expectedRevision:0})).ok,true);
 const controller=createController(store);assert.equal((await controller.load()).ok,true);return {storage,store,controller};
}
const ancestors=[validateDungeonProgress,validateQuarryProgress,validatePassProgress,validateSignalProgress,validateFurnaceProgress,validateTombProgress,validatePromotion];

for(const difficulty of ['easy','normal','hard','serious'])for(const full of [false,true])test(`${difficulty} ${full?'full':'minimum'} scripted T route promotes once with complete history and no free skills, XP, SP or pools`,()=>{
 const s=earnedTombRoute(difficulty,{full}),before=clone(s),quote=previewExpertPromotion(s);
 assert.equal(quote.available,true);assert.equal(quote.goldCost,120);assert.equal(EXPERT_GOLD_COST,120);assert.equal(quote.minimumLevel,15);
 const n=promote(s);assert.equal(n.version,5);assert.equal(n.character.tier,'expert');assert.deepEqual({...n.character,tier:'adept'},s.character);
 assert.equal(n.gold,s.gold-120);assert.deepEqual(n.stats,{...s.stats,spentGold:s.stats.spentGold+120});assert.deepEqual(n.reservedTrainingGold,{expert:0});
 assert.deepEqual(n.inventory,s.inventory);assert.deepEqual(n.equipmentProgress,s.equipmentProgress);assert.deepEqual(n.vitals,s.vitals);assert.deepEqual(n.recovery,s.recovery);
 assert.deepEqual(n.world,{...s.world,position:trainer,claimedRewards:[...s.world.claimedRewards,EXPERT_RECEIPT]});
 assert.deepEqual(s,before);for(const check of ancestors)assert.equal(check(n).ok,true,check.name);
 assert.equal(n.world.claimedRewards.filter(id=>id===ADEPT_RECEIPT).length,1);assert.equal(n.world.claimedRewards.filter(id=>id===EXPERT_RECEIPT).length,1);
 assert.equal(previewPromotion(n).code,'ALREADY_PROMOTED');assert.equal(previewExpertPromotion(n).code,'ALREADY_PROMOTED');reject(n,command(n),'ALREADY_PROMOTED');
});
for(const gold of [120,121,1331])test(`protected fee consumes exactly120 from total${gold} without requiring spendable120`,()=>{
 const s=balance(earnedTombRoute(),gold),n=promote(s);assert.equal(n.gold,gold-120);assert.deepEqual(trainingGoldBalances(n),{ok:true,totalGold:gold-120,reservedGold:0,spendableGold:gold-120});
});
test('full equipment/attributes/skills and depleted paid action snapshot are retained by real controller and live synchronization',async()=>{
 let s=earnedTombRoute();s=run(s,{type:'equipment',position:{x:250,y:470},operation:{type:'buyEquipment',commandId:'expert-gear',baseId:'oak_shield',station:'blacksmith'}}).state;
 const item=s.inventory.equipmentInstances.at(-1);s=run(s,{type:'equipment',position:trainer,operation:{type:'equipItem',commandId:'expert-equip',itemId:item.id}}).state;
 s=run(s,{type:'allocateAttribute',attribute:'intelligence',amount:2}).state;
 s=run(s,{type:'purchaseSkill',skillId:'lay_on_hands',position:trainer}).state;
 s=run(s,{type:'checkpoint',...report(s,trainer),vitals:{hp:12,mana:20,stamina:14}}).state;
 const {store,controller}=await controllerFor(s),b=createBattle(s);
 const events=stepBattle(b,s.character,.02,{hammer:true}),paid=combatCheckpoint(b,events);assert.ok(events.some(e=>e.type==='actionStarted'));assert.ok(paid);
 assert.equal((await controller.dispatch(paid)).ok,true);const before=controller.snapshot(),action=clone(b.p.action),time=b.time;
 const result=await controller.dispatch({...command(before,controller.revision()),...battleReport(b)});assert.equal(result.ok,true,JSON.stringify(result));
 syncCommittedBattle(b,result.state);assert.deepEqual(b.p.action,action);assert.equal(b.time,time);assert.deepEqual(result.state.vitals,before.vitals);assert.deepEqual(result.state.recovery,before.recovery);
 assert.deepEqual(result.state.character.equipment,before.character.equipment);assert.deepEqual(result.state.character.skills,before.character.skills);assert.equal(result.state.character.skillPoints,before.character.skillPoints);
 const loaded=await createController(store).load(),restored=createBattle(loaded.state);assert.deepEqual(loaded.state,result.state);assert.equal(restored.p.mana,before.vitals.mana);assert.equal(restored.p.hp,12);
 assert.equal(restored.p.action,null);assert.equal(restored.shots.length,0);assert.ok(restored.p.cooldowns.righteous_hammer>0);assert.ok(restored.p.recoveryLock>0);
});
test('promotion refuses resource refill, resource loss or cooldown reset until the exact snapshot is committed',()=>{
 let s=earnedTombRoute();s=run(s,{type:'checkpoint',...report(s,trainer),vitals:{hp:8,mana:3,stamina:2},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:.8},lock:.2,manaDelay:.4,staminaDelay:.2}}).state;
 for(const edit of [c=>c.vitals.hp++,c=>c.vitals.mana=0,c=>c.vitals.stamina++,c=>c.recovery.cooldowns.righteous_hammer=0,c=>c.recovery.lock=0,c=>c.recovery.manaDelay=0]){const c=command(s);edit(c);reject(s,c,'REPORT_NOT_COMMITTED');}
 const c=command(s);c.vitals={stamina:2,mana:3,hp:8};c.recovery={...c.recovery,cooldowns:{righteous_hammer:.8}};assert.equal(reduceRuntime(s,c,{revision:1}).ok,true,'record key order has no semantic meaning');
});
for(const [name,edit,code]of [
 ['omitted quote',c=>delete c.expectedGoldCost,'INVALID_COMMAND'],['wrong quote',c=>c.expectedGoldCost=119,'QUOTE_CHANGED'],['free quote',c=>c.expectedGoldCost=0,'QUOTE_CHANGED'],['string quote',c=>c.expectedGoldCost='120','QUOTE_CHANGED'],
 ['extra gold',c=>c.gold=999,'INVALID_COMMAND'],['reward payload',c=>c.rewards={xp:1000},'INVALID_COMMAND'],['NPC spoof',c=>c.npcId='trainer','INVALID_COMMAND'],['channel leak',c=>c.channel={active:true},'INVALID_COMMAND'],
 ['missing revision',c=>delete c.expectedRevision,'INVALID_COMMAND'],['negative revision',c=>c.expectedRevision=-1,'REVISION_REQUIRED'],['fractional revision',c=>c.expectedRevision=.5,'REVISION_REQUIRED'],['stale revision',c=>c.expectedRevision=0,'STALE_REVISION'],
 ['wrong life',c=>c.life++,'STALE_LIFE'],['dead report',c=>c.vitals.hp=0,'HERO_DOWN'],['negative pool',c=>c.vitals.stamina=-1,'INVALID_REPORT'],['excess pool',c=>c.vitals.mana=9999,'INVALID_REPORT'],
 ['extra pool',c=>c.vitals.extra=0,'INVALID_COMMAND'],['missing recovery',c=>delete c.recovery,'INVALID_COMMAND'],['invalid recovery',c=>c.recovery.lock=-1,'INVALID_COMMAND'],['foreign recovery',c=>c.recovery.foreign=0,'INVALID_COMMAND'],
 ['off map',c=>c.position={x:-1,y:0},'INVALID_REPORT'],['far away',c=>c.position={x:600,y:400},'TRAINER_REQUIRED'],['Eda proximity',c=>c.position={x:450,y:325},'TRAINER_REQUIRED'],['Orin proximity',c=>c.position={x:250,y:470},'TRAINER_REQUIRED'],
 ['extra coordinate',c=>c.position.z=0,'INVALID_COMMAND']
])test(`Expert command rejects ${name} without mutation`,()=>{const s=earnedTombRoute(),c=command(s);edit(c);reject(s,c,code);});
test('trainer reach includes exactly76 units, rejects excess, wrong region and illegal positions',()=>{
 const s=earnedTombRoute(),c=command(s);c.position={x:trainer.x+76,y:trainer.y};assert.equal(reduceRuntime(s,c,{revision:1}).ok,true);
 c.position.x+=.001;reject(s,c,'TRAINER_REQUIRED');const away=travel(s,'road');reject(away,command(away),'TRAINER_REQUIRED');
});
test('pure reducer requires independent authoritative revision; T puzzle revision is not storage revision',()=>{
 const s=earnedTombRoute(),c=command(s);reject(s,c,'REVISION_REQUIRED',{});assert.equal(promoteExpert(s,c).code,'REVISION_REQUIRED');
 for(const context of [{revision:-1},{revision:NaN},{revision:1,extra:1},null])assert.equal(promoteExpert(s,c,context).code,'REVISION_REQUIRED');
 assert.notEqual(tombInputRevision(s),1);reject(s,{...c,expectedRevision:tombInputRevision(s)},'STALE_REVISION');
 reject(s,{...c,expectedRevision:Number.MAX_SAFE_INTEGER},'REVISION_LIMIT',{revision:Number.MAX_SAFE_INTEGER});
});
test('Apprentice cannot skip Adept; L14 T report remains legal but Expert needs actual L15',()=>{
 const early=route().state;assert.equal(previewExpertPromotion(early).code,'ADEPT_REQUIRED');reject(early,command(early),'ADEPT_REQUIRED');
 const beforeReport=earnedTombRoute('hard',{reportQuest:false});assert.equal(beforeReport.character.level,14);assert.equal(previewExpertPromotion(beforeReport).code,'LEVEL_REQUIRED');
 const s=run(beforeReport,{type:'reportTombQuest',...report(beforeReport,{x:450,y:325}),expectedRevision:tombInputRevision(beforeReport)}).state;assert.equal(s.character.level,15);assert.equal(previewExpertPromotion(s).available,true);
 // Synthetic L14 reported save checks promotion level independently of report XP.
 const low=clone(s);let xp=0;for(let n=1;n<14;n++)xp+=xpForLevel(n);const c=grantExperience(createCharacter(),xp).character;c.skills=clone(s.character.skills);c.tier='adept';low.character=c;
 assert.equal(validateState(low).ok,true);reject(low,command(low),'LEVEL_REQUIRED');
});
for(const receipt of ['r4:report',ADEPT_RECEIPT,'r6:q:report','r7:p:report','r8:s:report','r9:f:report','r10:t:accept','r10:t:decode','r10:t:sequence','r10:t:ward-take','r10:t:ward-midpoint','r10:t:ward','r10:t:oath','r10:t:report'])test(`promotion/load retains required history ${receipt}`,()=>{
 for(const source of [earnedTombRoute(),promote(earnedTombRoute())]){const s=clone(source);s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!==receipt);assert.equal(validateState(s).ok,false);reject(s,command(s));}
});
for(const tool of ['signal_cipher','furnace_lens','tomb_oath'])test(`promotion cannot lose retained ${tool}`,()=>{const s=clone(earnedTombRoute());s.inventory.tools=s.inventory.tools.filter(id=>id!==tool);assert.equal(validateState(s).ok,false);reject(s,command(s));});
for(const [name,edit]of [
 ['missing reservation',s=>delete s.reservedTrainingGold],['zero reserve',s=>s.reservedTrainingGold.expert=0],['119 reserve',s=>s.reservedTrainingGold.expert=119],['extra reserve',s=>s.reservedTrainingGold.other=0],
 ['119 total',s=>{s.gold=119;s.stats.spentGold=s.stats.earnedGold-119;}],['missing commission',s=>s.world.objectives.expert_commission=0],['untrained',s=>s.character.skills={}],
 ['missing boss',s=>s.world.defeated.signal_tomb=s.world.defeated.signal_tomb.filter(id=>id!==TOMB_GROUPS.boss[0])],['mismatched life',s=>s.world.lifeDown=true],['unsafe ledger',s=>{s.stats.earnedGold=Number.MAX_SAFE_INTEGER+1;}]
])test(`malformed promotion state rejects ${name}`,()=>{const s=clone(earnedTombRoute());edit(s);assert.equal(validateState(s).ok,false,name);reject(s,command(s));});
test('receipt capacity and safe integer limit preserve all-or-nothing state',()=>{
 const s=clone(earnedTombRoute());while(s.world.claimedRewards.length<MAX_RECEIPTS)s.world.claimedRewards.push(`capacity:${s.world.claimedRewards.length}`);assert.equal(validateState(s).ok,true);reject(s,command(s),'RECEIPT_LIMIT');
 const limit=balance(earnedTombRoute(),120);limit.stats.earnedGold=Number.MAX_SAFE_INTEGER;limit.stats.spentGold=Number.MAX_SAFE_INTEGER-120;const n=promote(limit);assert.equal(n.stats.spentGold,Number.MAX_SAFE_INTEGER);assert.equal(n.gold,0);
});
test('controller serializes double promotion, reports stale token, and fresh duplicate remains already-promoted after reload',async()=>{
 const s=earnedTombRoute(),{store,controller,storage}=await controllerFor(s),c=command(s,controller.revision()),writes=storage.writes.length;
 const [first,second]=await Promise.all([controller.dispatch(c),controller.dispatch(c)]);assert.equal(first.ok,true);assert.equal(second.code,'STALE_REVISION');assert.equal(controller.revision(),2);assert.equal(storage.writes.length-writes,2);
 assert.equal((await controller.dispatch(command(first.state,2))).code,'ALREADY_PROMOTED');const reloaded=createController(store);assert.equal((await reloaded.load()).ok,true);assert.deepEqual(reloaded.snapshot(),first.state);assert.equal((await reloaded.dispatch(command(first.state,2))).code,'ALREADY_PROMOTED');
});
test('queued earlier checkpoint invalidates quote rather than silently rebasing it; queued intent is cloned',async()=>{
 const s=earnedTombRoute(),{controller}=await controllerFor(s),c=command(s,1);
 const checkpoint=controller.dispatch({type:'checkpoint',...report(s,trainer)}),promotion=controller.dispatch(c);c.expectedRevision=2;
 assert.equal((await checkpoint).ok,true);assert.equal((await promotion).code,'STALE_REVISION');assert.equal(controller.snapshot().character.tier,'adept');
 assert.equal((await controller.dispatch(command(controller.snapshot(),2))).ok,true);
});
test('missing or malformed controller revision never reaches mutation or store writes',async()=>{
 const s=earnedTombRoute(),{controller,storage}=await controllerFor(s),writes=storage.writes.length;
 for(const value of [undefined,-1,.5,'1',Number.MAX_SAFE_INTEGER+1]){const c=command(s);if(value===undefined)delete c.expectedRevision;else c.expectedRevision=value;assert.equal((await controller.dispatch(c)).code,'REVISION_REQUIRED');}
 assert.deepEqual(controller.snapshot(),s);assert.equal(storage.writes.length,writes);
});
for(const mode of ['drop-slot','throw-slot','throw-before-head','throw-after-head'])test(`promotion ${mode} failure preserves atomic state and verified reload authority`,async()=>{
 const s=earnedTombRoute(),{controller,store,storage}=await controllerFor(s),before=controller.snapshot(),write=storage.setItem.bind(storage);
 storage.setItem=(key,value)=>{if(key===store.keys.slots[1]&&mode==='drop-slot')return;if(key===store.keys.slots[1]&&mode==='throw-slot')throw Error('slot failure');if(key===store.keys.head&&mode==='throw-before-head')throw Error('head failure');write(key,value);if(key===store.keys.head&&mode==='throw-after-head')throw Error('post head failure');};
 const result=await controller.dispatch(command(s));assert.equal(result.code,mode==='drop-slot'?'WRITE_FAILED':'COMMIT_UNCERTAIN');assert.deepEqual(controller.snapshot(),before);
 const gate=createRuntimeGate();gate.block(result.reason);assert.equal(gate.canStep({hasBattle:true,paused:false,busy:false,hidden:false}),false);
 if(mode!=='drop-slot')assert.equal((await controller.dispatch(command(s))).blocked,true);
 storage.setItem=write;const loaded=await controller.load();assert.equal(loaded.ok,true);assert.equal(gate.resolveLoad(loaded),true);
 if(mode==='throw-after-head'){assert.equal(loaded.state.character.tier,'expert');assert.equal(loaded.state.gold,s.gold-120);assert.equal((await controller.dispatch(command(loaded.state,loaded.revision))).code,'ALREADY_PROMOTED');}
 else {assert.deepEqual(loaded.state,s);assert.equal((await controller.dispatch(command(s,loaded.revision))).ok,true);}
 assert.equal(store.load().state.stats.spentGold,s.stats.spentGold+120);assert.equal(store.load().state.world.claimedRewards.filter(id=>id===EXPERT_RECEIPT).length,1);
});
test('two controllers share the session lock and stale tab cannot spend reserve twice',async()=>{
 const s=earnedTombRoute(),{store,controller:a}=await controllerFor(s),b=createController(store);await b.load();
 const [first,second]=await Promise.all([a.dispatch(command(s)),b.dispatch(command(s))]);assert.equal(first.ok,true);assert.equal(second.code,'CONFLICT');assert.deepEqual(b.snapshot(),s);assert.equal((await b.dispatch(command(s))).blocked,true);
 const loaded=await b.load();assert.equal(loaded.state.gold,s.gold-120);assert.equal((await b.dispatch(command(loaded.state,loaded.revision))).code,'ALREADY_PROMOTED');
});
test('protected deaths and dead reload never promote or consume reserve; retry rejects old life and promotes once',async()=>{
 let s=balance(earnedTombRoute(),120);const {controller,store}=await controllerFor(s),oldLife=s.world.life;
 const dead=await controller.dispatch({type:'settleCombat',defeated:[],...report(s),vitals:{...s.vitals,hp:0}});assert.equal(dead.ok,true);assert.equal(dead.state.gold,120);assert.equal(dead.state.reservedTrainingGold.expert,120);
 assert.equal((await controller.dispatch(command(dead.state,controller.revision()))).code,'HERO_DOWN');
 for(let n=0;n<2;n++){const loaded=await createController(store).load();assert.equal(loaded.state.stats.deaths,s.stats.deaths+1);assert.equal(loaded.state.gold,120);assert.equal(createBattle(loaded.state).p.hp,0);}
 const retry=await controller.dispatch({type:'retry'});assert.equal(retry.ok,true);assert.equal(retry.state.world.life,oldLife+1);assert.equal((await controller.dispatch({...command(retry.state,controller.revision()),life:oldLife})).code,'STALE_LIFE');
 const promoted=await controller.dispatch(command(retry.state,controller.revision()));assert.equal(promoted.ok,true);assert.equal(promoted.state.gold,0);assert.equal(promoted.state.reservedTrainingGold.expert,0);
 s=promoted.state;const expertDeath=await controller.dispatch({type:'settleCombat',defeated:[],...report(s),vitals:{...s.vitals,hp:0}});assert.equal(expertDeath.ok,true);assert.equal(validateState(expertDeath.state).ok,true);assert.ok(expertDeath.state.world.claimedRewards.includes(ADEPT_RECEIPT));
 assert.equal((await controller.dispatch({type:'retry'})).ok,true);assert.equal((await controller.dispatch({type:'retry'})).ok,false);assert.equal(controller.snapshot().character.tier,'expert');
});
test('all ancestor validators and permitted portal gates retain identical history after Expert; actual round trips succeed',()=>{
 const s=earnedTombRoute('normal',{shortcut:true}),n=promote(s),checks={sluice:dungeonPortalAllowed,quarry:quarryPortalAllowed,pass:passPortalAllowed,signal:signalPortalAllowed,furnace:furnacePortalAllowed,tomb:tombPortalAllowed};
 for(const region of s.world.visited)for(const portal of getRegion(region).portals){const check=checks[portal.gate?.split('_')[0]];if(check)assert.deepEqual(check(n,portal),check(s,portal),portal.id);}
 for(const allowed of [passTierAllowed,signalTierAllowed,furnaceTierAllowed]){assert.equal(allowed('expert'),true);assert.equal(allowed('master'),false);}
 let current=n;
 for(const [entry,exit]of [['town-quarry-entry','quarry-town-return'],['town-pass-entry','pass-town-return'],['town-signal-entry','signal-town-return'],['town-furnace-entry','furnace-town-return'],['town-tomb-entry','tomb-boss-return'],['town-tomb-shortcut','tomb-town-shortcut']]){current=travel(current,entry);current=travel(current,exit);assert.equal(current.character.tier,'expert');assert.equal(validateState(current).ok,true);}
 assert.deepEqual(current.world.claimedRewards,n.world.claimedRewards);assert.deepEqual(current.world.defeated,n.world.defeated);assert.equal(current.gold,n.gold);
 assert.equal(reduceRuntime(current,{type:'reportTombQuest',...report(current,{x:450,y:325}),expectedRevision:tombInputRevision(current)}).code,'ALREADY_CLAIMED');assert.equal(current.reservedTrainingGold.expert,0);
});
test('Expert retains earlier nodes and admits only the15 implemented Expert handlers; Master remains DATA_ONLY',()=>{
 const s=promote(earnedTombRoute());for(const row of WARRIOR_REFERENCE.skills.filter(row=>['expert','master'].includes(row.tier))){const q=previewSkill(s.character,row.id,s),result=reduceRuntime(s,{type:'purchaseSkill',skillId:row.id,position:trainer});if(row.tier==='master'){assert.equal(q.code,'DATA_ONLY',row.id);assert.equal(result.code,'DATA_ONLY');}else{assert.notEqual(q.code,'DATA_ONLY',row.id);assert.equal(result.ok,q.available,row.id);if(result.ok){assert.equal(result.state.character.skills[row.id],q.nextRank);assert.equal(result.state.character.skillPoints,s.character.skillPoints-q.cost);assert.equal(validateState(result.state).ok,true);}}}
 const master=clone(s);master.character=grantExperience(master.character,100000).character;master.character.tier='master';assert.equal(validateWarriorGrowth(master.character,master).code,'TIER_NOT_IMPLEMENTED');assert.equal(validateState(master).ok,false);reject(master,command(master));
 const empty=clone(s);empty.character.skills={};assert.equal(validateWarriorGrowth(empty.character,empty).code,'STARTER_REQUIRED');
});
for(const version of [1,2,3])test(`historical v${version} stays byte-identical on repeated reads and migrates only in memory until explicit commit`,async()=>{
 const s=createState();s.version=version;delete s.actionSlots;s.options.controls.version=2;delete s.options.controls.bindings.expert1;delete s.options.controls.bindings.expert2;if(version===1)delete s.equipmentProgress;if(version<3)delete s.options.controls;
 const {controller,store,storage}=await controllerFor(s),bytes=new Map(storage.data),writes=storage.writes.length;
 for(let n=0;n<2;n++){const loaded=await controller.load();assert.equal(loaded.state.version,5);assert.deepEqual(store.load().state,s);assert.deepEqual(storage.data,bytes);assert.equal(storage.writes.length,writes);}
 assert.equal((await controller.dispatch({type:'setOption',option:'flashes',value:0})).ok,true);assert.equal(store.load().state.version,5);
});
test('real v3 completed T state loads read-only, then one promotion commits v4 using retained protected fee',async()=>{
 const old=clone(earnedTombRoute());old.version=3;delete old.actionSlots;old.options.controls.version=2;delete old.options.controls.bindings.expert1;delete old.options.controls.bindings.expert2;old.recovery=Object.fromEntries(['cooldowns','lock','manaDelay','staminaDelay','invuln','potionCooldown','regenBuff'].map(k=>[k,old.recovery[k]]));assert.equal(validateState(old).ok,true);const {controller,store,storage}=await controllerFor(old),bytes=new Map(storage.data);
 assert.deepEqual(store.load().state,old);assert.deepEqual(storage.data,bytes);assert.equal(controller.snapshot().version,5);
 const result=await controller.dispatch(command(controller.snapshot(),controller.revision()));assert.equal(result.ok,true);assert.equal(store.load().state.version,5);assert.equal(store.load().state.gold,old.gold-120);
});
for(const version of [1,2,3])test(`valid-checksum v${version} cannot masquerade as Expert before migration`,()=>{
 const invalid=promote(earnedTombRoute());invalid.version=version;assert.equal(validateState(invalid).code,'INVALID_LEGACY_VERSION');assert.throws(()=>migrateState(invalid));
 const storage=memory(),store=createStore(storage,{profile:'qa-expert-old'}),payload=JSON.stringify(invalid),hash=checksum(payload);
 storage.data.set(store.keys.slots[0],JSON.stringify({schema:STATE_SCHEMA,revision:1,checksum:hash,previousCommit:null,payload}));storage.data.set(store.keys.head,JSON.stringify({slot:0,revision:1,checksum:hash,previousCommit:null}));
 const bytes=new Map(storage.data);assert.equal(store.load().code,'CORRUPT');assert.deepEqual(storage.data,bytes);
});
for(const field of ['procCooldowns','innerFlame','negativeStatuses','combatRng'])test(`v3 rejects future recovery field ${field} before migration`,()=>{const s=clone(earnedTombRoute());s.version=3;s.recovery[field]=field==='innerFlame'?null:{};assert.equal(validateState(s).code,'INVALID_LEGACY_VERSION');});
test('invalid state/command/context accessors are never executed and all inputs remain untouched',()=>{
 const s=earnedTombRoute();let calls=0;const c=command(s);Object.defineProperty(c,'trap',{enumerable:true,get(){calls++;throw Error('accessor');}});assert.equal(promoteExpert(s,c,{revision:1}).code,'INVALID_COMMAND');
 const context=Object.defineProperty({},'revision',{enumerable:true,get(){calls++;return 1;}});assert.equal(promoteExpert(s,command(s),context).code,'REVISION_REQUIRED');
 const malformed=clone(s);Object.defineProperty(malformed,'trap',{enumerable:true,get(){calls++;return 1;}});assert.equal(promoteExpert(malformed,command(s),{revision:1}).code,'INVALID_STATE');assert.equal(calls,0);
});

for(const [name,edit]of [
 ['removed Expert receipt',s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!==EXPERT_RECEIPT)],
 ['duplicate Expert receipt',s=>s.world.claimedRewards.push(EXPERT_RECEIPT)],
 ['reset training reserve',s=>s.reservedTrainingGold.expert=120],
 ['regressed tier',s=>s.character.tier='adept'],
 ['removed oath',s=>s.inventory.tools=s.inventory.tools.filter(id=>id!=='tomb_oath')],
 ['removed commission',s=>s.world.objectives.expert_commission=0]
])test(`Expert saved history rejects ${name} and leaves source bytes untouched`,()=>{
 const s=promote(earnedTombRoute());edit(s);const before=clone(s);assert.equal(validateState(s).ok,false);const storage=memory(),store=createStore(storage);assert.equal(store.save(s,{expectedRevision:0}).ok,false);assert.equal(storage.writes.length,0);assert.deepEqual(s,before);
});
