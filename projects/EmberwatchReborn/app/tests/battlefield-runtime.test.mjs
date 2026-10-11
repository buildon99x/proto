import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState,migrateState} from '../src/state.js';
import {createStore,createSession,checksum} from '../src/save.js';
import {createController} from '../src/controller.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {getRegion,createMap,inMap,findPathStep,FOES} from '../src/world.js';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_FOES,BATTLEFIELD_LINKS,BATTLEFIELD_GROUPS,BATTLEFIELD_RECEIPTS} from '../src/battlefield-content.js';
import {battlefieldInputRevision} from '../src/battlefield.js';
import {battlefieldObjectView,battlefieldElderView,battlefieldCommandFields} from '../src/battlefield-presentation.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// SCRIPTED PRODUCTION-HANDLER INTEGRATION, NOT ORDINARY-INPUT OR BROWSER PLAY.
// All earned XP, promotion, defeats, rewards, travel, save and retry pass through
// the unmodified registered reducers/controller/store. Coordinates and defeat
// reports are explicit fixtures; no walking, AI victory, UI click, survival,
// timing, screenshot or balance acceptance is claimed. No syntheticTravel,
// direct B reducer call, source rewriting or test-only handler registration.
// Corruption and storage faults below are explicitly adversarial fixtures.
const copy=value=>structuredClone(value),elder={x:450,y:325},trainer={x:260,y:325};
const region=getRegion(BATTLEFIELD_REGION);
const memory=()=>{const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};};
function locks(){let queue=Promise.resolve();return {request(_key,_options,fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}};}
const quest=(state,type)=>({type,...report(state,elder),expectedRevision:battlefieldInputRevision(state)});
const objectCommand=(state,id)=>({type:'interactBattlefield',objectId:id,...report(state,region.objects.find(object=>object.id===id)),expectedRevision:battlefieldInputRevision(state)});
function portalCommand(state,id){const portal=getRegion(state.world.region).portals.find(row=>row.id===id);assert.ok(portal,id);return {type:'travel',portalId:id,to:portal.to,...report(state,portal)};}
const settleCommand=(state,ids,extra={})=>({type:'settleCombat',defeated:ids,...report(state),...extra});
function promoted(difficulty='normal',options={}){const state=earnedTombRoute(difficulty,options),result=reduceRuntime(state,{type:'promoteExpert',...report(state,trainer),expectedRevision:0,expectedGoldCost:120},{revision:0});assert.equal(result.ok,true,JSON.stringify(result));return result.state;}
let cachedStages;
function stages(){
 if(cachedStages)return copy(cachedStages);
 const out={promoted:promoted()};let state=out.promoted;
 state=run(state,quest(state,'acceptBattlefieldQuest')).state;out.accepted=state;
 state=travel(state,'town-battlefield-entry');out.entered=state;
 state=settle(state,BATTLEFIELD_GROUPS.west);out.westGuards=state;
 state=run(state,objectCommand(state,'battlefield-west-device')).state;out.westReady=state;
 state=settle(state,BATTLEFIELD_GROUPS.east);out.bothGuards=state;
 state=run(state,objectCommand(state,'battlefield-east-device')).state;out.devicesReady=state;
 state=settle(state,BATTLEFIELD_GROUPS.boss);out.bossDown=state;
 state=run(state,objectCommand(state,'battlefield-beacon')).state;out.beacon=state;
 state=travel(state,'battlefield-boss-return');out.reportReady=state;
 state=run(state,quest(state,'reportBattlefieldQuest')).state;out.finished=state;
 cachedStages=copy(out);return copy(out);
}
async function harness(source,{storage=memory(),profile='qa-battlefield-runtime',sharedLocks=locks()}={}){
 const store=createSession(storage,sharedLocks,{profile,namespace:'qa-r11'});
 assert.equal((await store.save(source,{expectedRevision:0})).ok,true);
 const controller=createController(store),events=[];controller.subscribe(event=>events.push(event));
 assert.equal((await controller.load()).ok,true);
 return {controller,store,storage,events};
}
async function dispatch(h,command){
 const intent=copy(command),revision=h.controller.revision(),result=await h.controller.dispatch(command);
 assert.equal(result.ok,true,JSON.stringify({command:command.type,id:command.objectId??command.portalId,result}));
 assert.deepEqual(command,intent);assert.equal(result.revision,revision+1);assert.equal(validateState(result.state).ok,true);
 assert.deepEqual(h.controller.snapshot(),result.state);assert.deepEqual(h.store.load().state,result.state);return result;
}
async function reject(h,command,code){
 const before=h.controller.snapshot(),revision=h.controller.revision(),bytes=new Map(h.storage.data),writes=h.storage.writes.length;
 const result=await h.controller.dispatch(command);assert.equal(result.ok,false,JSON.stringify(result));if(code)assert.equal(result.code,code,JSON.stringify(result));
 assert.deepEqual(h.controller.snapshot(),before);assert.equal(h.controller.revision(),revision);assert.deepEqual(h.storage.data,bytes);assert.equal(h.storage.writes.length,writes);return result;
}
async function roundTripLoad(h){const before=h.controller.snapshot(),bytes=new Map(h.storage.data),writes=h.storage.writes.length;for(let n=0;n<2;n++){const loaded=await h.controller.load();assert.equal(loaded.ok,true);assert.deepEqual(loaded.state,before);}assert.deepEqual(h.storage.data,bytes);assert.equal(h.storage.writes.length,writes);return before;}

// No new content defaults are inferred merely because the B region is registered.
test('registered B world, reciprocal arrivals and actual campaign entry/boss guards are live',()=>{
 assert.equal(region,BATTLEFIELD_REGIONS[BATTLEFIELD_REGION]);
 for(const [kind,foe]of Object.entries(BATTLEFIELD_FOES))assert.equal(FOES[kind],foe);
 for(const link of BATTLEFIELD_LINKS.ash_hamlet){assert.equal(getRegion('ash_hamlet').portals.filter(p=>p.id===link.id).length,1);assert.equal(getRegion('ash_hamlet').portals.find(p=>p.id===link.id),link);}
 for(const portal of [...BATTLEFIELD_LINKS.ash_hamlet,...region.portals])assert.ok(inMap(createMap(portal.to),portal.arrival.x,portal.arrival.y),portal.id);
 const tomb=earnedTombRoute();assert.equal(reduceRuntime(tomb,portalCommand(tomb,'town-battlefield-entry')).code,'EXPERT_REQUIRED');
 const all=stages();assert.equal(reduceRuntime(all.promoted,portalCommand(all.promoted,'town-battlefield-entry')).code,'QUEST_REQUIRED');
 assert.equal(reduceRuntime(all.entered,portalCommand(all.entered,'battlefield-boss-return')).code,'BOSS_REQUIRED');
 assert.equal(reduceRuntime(all.entered,settleCommand(all.entered,BATTLEFIELD_GROUPS.boss)).code,'ENCOUNTER_LOCKED');
 const boss=region.foes.find(foe=>foe.id===BATTLEFIELD_GROUPS.boss[0]);
 assert.equal(findPathStep(createMap(BATTLEFIELD_REGION,all.westReady),region.spawn,boss),null);
 assert.ok(findPathStep(createMap(BATTLEFIELD_REGION,all.devicesReady),region.spawn,boss));
});

for(const difficulty of ['normal','hard'])for(const full of [false,true])for(const order of [['west','east'],['east','west']])test(`controller earned ${difficulty} ${full?'full':'minimum'} ${order.join('→')}: real promotion, travel, one-time B ledger and read-only reload`,async()=>{
 const source=earnedTombRoute(difficulty,{full}),h=await harness(source);let state=source;
 state=(await dispatch(h,{type:'promoteExpert',...report(state,trainer),expectedRevision:h.controller.revision(),expectedGoldCost:120})).state;
 assert.equal(state.character.tier,'expert');assert.equal(state.gold,source.gold-120);assert.deepEqual(state.reservedTrainingGold,{expert:0});
 const before=copy(state),accepted=quest(state,'acceptBattlefieldQuest');state=(await dispatch(h,accepted)).state;
 assert.equal(state.gold,before.gold);assert.equal(state.stats.earnedXp,before.stats.earnedXp);await reject(h,accepted,'STALE_REVISION');await reject(h,quest(state,'acceptBattlefieldQuest'),'ALREADY_ACCEPTED');
 state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;
 for(const [index,side]of order.entries()){
  const beforeKills=state;state=(await dispatch(h,settleCommand(state,BATTLEFIELD_GROUPS[side]))).state;
  assert.equal(state.stats.kills-beforeKills.stats.kills,6);assert.equal(state.stats.earnedXp-beforeKills.stats.earnedXp,difficulty==='hard'?405:540);
  const beforeDevice=copy(state),command=objectCommand(state,`battlefield-${side}-device`),result=await dispatch(h,command);state=result.state;
  assert.equal(state.gold-beforeDevice.gold,35);assert.equal(state.stats.earnedXp-beforeDevice.stats.earnedXp,280);assert.deepEqual(state.vitals,beforeDevice.vitals);
  assert.equal(result.events.find(event=>event.type==='battlefieldChanged').mapChanged,index===1);
  assert.equal(result.events.filter(event=>event.type==='battlefieldReward').length,1);assert.equal(state.world.objectives.chapter_three_complete,0);
  await reject(h,command,'STALE_REVISION');await reject(h,objectCommand(state,`battlefield-${side}-device`),'ALREADY_CLAIMED');await roundTripLoad(h);
  if(index===0){const revision=battlefieldInputRevision(state),paid=copy(state);state=(await dispatch(h,portalCommand(state,'battlefield-town-return'))).state;state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;
   assert.equal(battlefieldInputRevision(state),revision+2);for(const key of ['vitals','recovery','inventory','stats','gold','character'])assert.deepEqual(state[key],paid[key],key);
   assert.deepEqual(state.world.defeated,paid.world.defeated);
  }
 }
 state=(await dispatch(h,settleCommand(state,BATTLEFIELD_GROUPS.boss))).state;
 assert.equal(state.world.objectives.battlefield_beacon_taken,0);assert.equal(state.inventory.tools.includes('battlefield_beacon'),false);
 // The real boss return does not silently award the separately interactable beacon.
 state=(await dispatch(h,portalCommand(state,'battlefield-boss-return'))).state;await reject(h,quest(state,'reportBattlefieldQuest'),'BEACON_REQUIRED');
 state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;
 const beaconCommand=objectCommand(state,'battlefield-beacon');state=(await dispatch(h,beaconCommand)).state;
 assert.equal(state.world.objectives.chapter_three_complete,0);await reject(h,beaconCommand,'STALE_REVISION');await reject(h,objectCommand(state,'battlefield-beacon'),'ALREADY_CLAIMED');
 state=(await dispatch(h,portalCommand(state,'battlefield-boss-return'))).state;
 await reject(h,{...quest(state,'reportBattlefieldQuest'),position:trainer},'ELDER_REQUIRED');
 const reportCommand=quest(state,'reportBattlefieldQuest');state=(await dispatch(h,reportCommand)).state;
 assert.equal(state.gold-before.gold,326);assert.equal(state.stats.earnedXp-before.stats.earnedXp,difficulty==='hard'?1890:2220);assert.equal(state.stats.kills-before.stats.kills,13);
 const cumulative=difficulty==='normal'?(full?8585.5:8411):(full?7605.125:7399.5);
 assert.equal(state.stats.earnedXp,cumulative);assert.equal(state.character.level,difficulty==='hard'?17:18);assert.equal(state.character.tier,'expert');
 for(const [id,amount]of Object.entries({iron:6,wood:4,thread:4,ember_shard:4}))assert.equal(state.inventory.materials[id]-(before.inventory.materials[id]??0),amount);
 assert.equal(state.inventory.consumables.health_potion-before.inventory.consumables.health_potion,2);
 assert.equal(state.inventory.tools.filter(id=>id==='battlefield_beacon').length,1);assert.equal(state.world.objectives.chapter_three_complete,1);assert.deepEqual(state.reservedTrainingGold,{expert:0});
 assert.deepEqual(state.world.claimedRewards.filter(id=>id.startsWith('r11:b')).toSorted(),[...BATTLEFIELD_RECEIPTS].toSorted());
 await reject(h,reportCommand,'STALE_REVISION');await reject(h,quest(state,'reportBattlefieldQuest'),'ALREADY_CLAIMED');await roundTripLoad(h);
 assert.equal(createBattle(state).enemies.length,0,'town after final report');
 state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;assert.equal(createBattle(state).enemies.length,0,'no repeat-run resurrection');
});

test('B presentation snapshots use B revision independently of unrelated controller/store commits',async()=>{
 const h=await harness(stages().promoted);let state=h.controller.snapshot();
 const opened=battlefieldCommandFields(battlefieldElderView(state));assert.deepEqual(opened,{type:'acceptBattlefieldQuest',expectedRevision:0});
 state=(await dispatch(h,{type:'setOption',option:'flashes',value:0})).state;assert.equal(h.controller.revision(),2);assert.equal(battlefieldInputRevision(state),0);
 const command={...opened,...report(state,elder)};state=(await dispatch(h,command)).state;assert.equal(battlefieldInputRevision(state),1);assert.equal(h.controller.revision(),3);
 await reject(h,command,'STALE_REVISION');
 state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;state=(await dispatch(h,settleCommand(state,BATTLEFIELD_GROUPS.west))).state;
 const view=battlefieldObjectView(state,region.objects.find(o=>o.id==='battlefield-west-device'));
 const fields=battlefieldCommandFields(view.actions[0]);assert.deepEqual(fields,{type:'interactBattlefield',objectId:'battlefield-west-device',expectedRevision:battlefieldInputRevision(state)});
 const old={...fields,...report(state,region.objects.find(o=>o.id==='battlefield-west-device'))};
 state=(await dispatch(h,portalCommand(state,'battlefield-town-return'))).state;state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;
 await reject(h,old,'STALE_REVISION');state=(await dispatch(h,objectCommand(state,'battlefield-west-device'))).state;
 assert.equal(battlefieldObjectView(state,region.objects.find(o=>o.id==='battlefield-west-device')).actions.length,0);
});

test('real travel on B and older regions invalidates B panels without minting rewards',()=>{
 let state=stages().accepted;
 for(const id of ['road','home','town-tomb-entry','tomb-boss-return','town-battlefield-entry','battlefield-town-return']){
  const before=copy(state);state=travel(state,id);assert.equal(battlefieldInputRevision(state),battlefieldInputRevision(before)+1);
  for(const key of ['gold','stats','vitals','recovery','character','inventory'])assert.deepEqual(state[key],before[key],id+':'+key);
 }
});

test('depleted partial-device checkpoint, repeated load and actual re-entry preserve paid pools, cooldowns, RNG and permanent defeats',async()=>{
 const h=await harness(stages().westReady);let state=h.controller.snapshot();
 // Explicit resource/recovery fixture sent through the real checkpoint handler.
 const recovery={...copy(state.recovery),cooldowns:{shield_charge:2.75,righteous_hammer:3.25},lock:.4,manaDelay:.3,staminaDelay:.2,potionCooldown:1.5,combatRng:{state:42,draws:19}};
 state=(await dispatch(h,{type:'checkpoint',...report(state),vitals:{hp:30,mana:7,stamina:9},recovery})).state;const paid=copy(state),stale=objectCommand(state,'battlefield-east-device');
 await roundTripLoad(h);state=(await dispatch(h,portalCommand(state,'battlefield-town-return'))).state;state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;await roundTripLoad(h);
 assert.deepEqual(state.vitals,paid.vitals);assert.deepEqual(state.recovery,paid.recovery);assert.deepEqual(state.world.defeated,paid.world.defeated);assert.equal(state.world.objectives.battlefield_west_ready,1);assert.equal(state.world.objectives.battlefield_east_ready,0);
 await reject(h,stale,'STALE_REVISION');
 const battle=createBattle(state),before=battleReport(battle);assert.equal(battle.awaitingAdvance,true);assert.equal(battle.p.action,null);assert.equal(battle.shots.length,0);assert.equal(battle.banner,null);
 assert.ok(battle.enemies.every(enemy=>!BATTLEFIELD_GROUPS.west.includes(enemy.id)));assert.ok(battle.enemies.every(enemy=>enemy.hp===enemy.max));
 for(let tick=0;tick<10;tick++)assert.deepEqual(stepBattle(battle,state.character,.05,{}),[]);assert.deepEqual(battleReport(battle),before);
});

for(const checkpoint of ['westReady','devicesReady'])test(`controller death/reload/retry from ${checkpoint} preserves devices and paid recovery without extra death or resurrected foes`,async()=>{
 const h=await harness(stages()[checkpoint]);let state=h.controller.snapshot();
 const recovery={...copy(state.recovery),cooldowns:{shield_charge:2.5},combatRng:{state:99,draws:7}};
 state=(await dispatch(h,{type:'checkpoint',...report(state),vitals:{hp:17,mana:4,stamina:6},recovery})).state;
 const before=copy(state),stale=objectCommand(state,'battlefield-east-device'),death=settleCommand(state,[],{vitals:{...state.vitals,hp:0}});
 state=(await dispatch(h,death)).state;assert.equal(state.stats.deaths,before.stats.deaths+1);assert.equal(state.gold,before.gold-Math.floor(before.gold*.05));
 await reject(h,death,'STALE_ENCOUNTER');await reject(h,objectCommand(state,'battlefield-beacon'),'HERO_DOWN');await roundTripLoad(h);assert.equal(createBattle(state).p.hp,0);
 const dead=copy(state);state=(await dispatch(h,{type:'retry'})).state;
 assert.equal(state.world.life,before.world.life+1);assert.equal(state.world.region,'ash_hamlet');assert.equal(state.stats.deaths,dead.stats.deaths);assert.equal(state.gold,dead.gold);
 assert.deepEqual(state.world.objectives,before.world.objectives);assert.deepEqual(state.world.defeated,before.world.defeated);assert.deepEqual(state.recovery.cooldowns,recovery.cooldowns);assert.deepEqual(state.recovery.combatRng,recovery.combatRng);
 await reject(h,{type:'retry'},'NOT_DOWN');state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;await reject(h,stale,'STALE_LIFE');
 assert.ok(createBattle(state).enemies.every(enemy=>!before.world.defeated[BATTLEFIELD_REGION].includes(enemy.id)));await roundTripLoad(h);
});

test('simultaneous real boss/hero settlement commits boss reward once, dead load cannot take beacon, retry can finish',async()=>{
 const h=await harness(stages().devicesReady);let state=h.controller.snapshot();const before=copy(state),stale=objectCommand(state,'battlefield-beacon');
 const death=settleCommand(state,BATTLEFIELD_GROUPS.boss,{vitals:{...state.vitals,hp:0}});state=(await dispatch(h,death)).state;
 assert.equal(state.stats.kills,before.stats.kills+1);assert.equal(state.stats.deaths,before.stats.deaths+1);assert.equal(state.stats.earnedXp-before.stats.earnedXp,240);
 assert.equal(state.gold,before.gold+48-Math.floor((before.gold+48)*.05));assert.equal(state.world.objectives.battlefield_beacon_taken,0);
 await reject(h,death,'STALE_ENCOUNTER');await reject(h,objectCommand(state,'battlefield-beacon'),'HERO_DOWN');await roundTripLoad(h);
 state=(await dispatch(h,{type:'retry'})).state;state=(await dispatch(h,portalCommand(state,'town-battlefield-entry'))).state;await reject(h,stale,'STALE_LIFE');
 const settled=copy(state);state=(await dispatch(h,settleCommand(state,BATTLEFIELD_GROUPS.boss))).state;
 for(const field of ['gold','stats','character','inventory','vitals','recovery'])assert.deepEqual(state[field],settled[field],field);
 state=(await dispatch(h,objectCommand(state,'battlefield-beacon'))).state;state=(await dispatch(h,portalCommand(state,'battlefield-boss-return'))).state;
 state=(await dispatch(h,quest(state,'reportBattlefieldQuest'))).state;assert.equal(state.world.objectives.chapter_three_complete,1);assert.equal(state.world.claimedRewards.filter(id=>id==='r11:b:beacon').length,1);await roundTripLoad(h);
});

function legacy(version){const state=createState();state.version=version;delete state.actionSlots;state.options.controls.version=2;delete state.options.controls.bindings.expert1;delete state.options.controls.bindings.expert2;if(version===1)delete state.equipmentProgress;if(version<3)delete state.options.controls;return state;}
for(const version of [1,2,3])test(`untouched v${version} loads read-only and migration creates no B activity`,async()=>{
 const source=legacy(version);assert.equal(validateState(source).ok,true);const h=await harness(source),bytes=new Map(h.storage.data),writes=h.storage.writes.length;
 for(let n=0;n<2;n++){const loaded=await h.controller.load();assert.equal(loaded.ok,true);assert.equal(loaded.state.version,5);
  for(const state of [h.store.load().state,loaded.state,migrateState(source)]){
   assert.equal(Object.keys(state.world.objectives).some(key=>key.startsWith('battlefield_')||key==='chapter_three_complete'),false);
   assert.equal(state.world.claimedRewards.some(id=>id.startsWith('r11:b')),false);assert.equal(state.inventory.tools.some(id=>id.startsWith('battlefield_')),false);
   assert.equal(state.world.visited.includes(BATTLEFIELD_REGION),false);assert.equal(Object.hasOwn(state.world.defeated??{},BATTLEFIELD_REGION),false);
  }
 }
 assert.deepEqual(h.storage.data,bytes);assert.equal(h.storage.writes.length,writes);
});
for(const version of [1,2,3])test(`v${version} cannot smuggle B-owned defaults, receipts, tools, region, visits or defeats through the registered world`,()=>{
 const changes=[state=>state.world.objectives.battlefield_accepted=0,state=>state.world.objectives.chapter_three_complete=0,state=>state.world.claimedRewards.push('r11:b:accept'),state=>state.inventory.tools.push('battlefield_beacon'),state=>state.world.region=BATTLEFIELD_REGION,state=>state.world.visited.push(BATTLEFIELD_REGION),state=>(state.world.defeated??={})[BATTLEFIELD_REGION]=[]];
 for(const change of changes){const state=legacy(version);change(state);const before=copy(state),storage=memory();
  assert.equal(validateState(state).code,'INVALID_LEGACY_VERSION');assert.equal(reduceRuntime(state,{type:'setOption',option:'flashes',value:0}).code,'INVALID_LEGACY_VERSION');
  assert.equal(createStore(storage).save(state,{expectedRevision:0}).ok,false);assert.equal(storage.data.size,0);assert.deepEqual(state,before);
 }
});

test('global validation rejects fabricated/partial B progress before unrelated commands and durable writes',()=>{
 const changes=[state=>state.world.objectives.battlefield_accepted=1,state=>state.world.objectives.chapter_three_complete=1,state=>state.world.claimedRewards.push('r11:b:accept'),state=>state.inventory.tools.push('battlefield_beacon'),state=>state.world.visited.push(BATTLEFIELD_REGION),state=>state.world.defeated[BATTLEFIELD_REGION]=[]];
 for(const change of changes){const state=stages().promoted;change(state);const before=copy(state),storage=memory();
  assert.equal(validateState(state).code,'INVALID_BATTLEFIELD_STATE');assert.equal(reduceRuntime(state,{type:'setOption',option:'flashes',value:0}).code,'INVALID_BATTLEFIELD_STATE');
  assert.equal(createStore(storage).save(state,{expectedRevision:0}).ok,false);assert.equal(storage.data.size,0);assert.deepEqual(state,before);
 }
});

test('valid-checksum modern envelopes still reject forged B ledger, partial flags, missing tools and future boss progress',async()=>{
 const changes=[state=>delete state.world.objectives.battlefield_east_ready,state=>state.world.objectives.battlefield_unknown=1,state=>state.world.objectives.chapter_three_complete=0,state=>state.world.objectives.battlefield_devices_ready=0,state=>state.world.claimedRewards.push('r11:b:unknown'),state=>state.world.claimedRewards=state.world.claimedRewards.filter(id=>id!=='r11:b:west'),state=>state.inventory.tools=state.inventory.tools.filter(id=>id!=='battlefield_beacon'),state=>state.inventory.tools.push('battlefield_unknown'),state=>state.world.defeated[BATTLEFIELD_REGION].pop(),state=>state.world.defeated[BATTLEFIELD_REGION].push('unknown-b-foe'),state=>state.world.objectives.battlefield_revision=1,state=>state.world.visited=state.world.visited.filter(id=>id!==BATTLEFIELD_REGION)];
 for(const change of changes){const source=stages().finished,state=copy(source);change(state);const storage=memory(),store=createStore(storage,{profile:'qa-battlefield-corrupt',namespace:'qa-r11'});assert.equal(store.save(source,{expectedRevision:0}).ok,true);
  const envelope=JSON.parse(storage.data.get(store.keys.slots[0]));envelope.payload=JSON.stringify(state);envelope.checksum=checksum(envelope.payload);storage.data.set(store.keys.slots[0],JSON.stringify(envelope));storage.data.set(store.keys.head,JSON.stringify({slot:0,revision:1,checksum:envelope.checksum,previousCommit:null}));
  const bytes=new Map(storage.data),writes=storage.writes.length;assert.equal(store.load().code,'CORRUPT');assert.equal((await createController(store).load()).code,'CORRUPT');assert.equal(store.save(source,{expectedRevision:1}).code,'CORRUPT');assert.deepEqual(storage.data,bytes);assert.equal(storage.writes.length,writes);
 }
 const early=stages().entered;early.world.defeated[BATTLEFIELD_REGION]=[...BATTLEFIELD_GROUPS.boss];assert.equal(validateState(early).code,'INVALID_BATTLEFIELD_STATE');
});

const transactions=[
 {name:'accept',stage:'promoted',command:state=>quest(state,'acceptBattlefieldQuest'),receipt:'r11:b:accept',duplicate:'ALREADY_ACCEPTED'},
 {name:'west device',stage:'westGuards',command:state=>objectCommand(state,'battlefield-west-device'),receipt:'r11:b:west',duplicate:'ALREADY_CLAIMED'},
 {name:'second device',stage:'bothGuards',command:state=>objectCommand(state,'battlefield-east-device'),receipt:'r11:b:east',duplicate:'ALREADY_CLAIMED'},
 {name:'beacon',stage:'bossDown',command:state=>objectCommand(state,'battlefield-beacon'),receipt:'r11:b:beacon',duplicate:'ALREADY_CLAIMED'},
 {name:'report',stage:'reportReady',command:state=>quest(state,'reportBattlefieldQuest'),receipt:'r11:b:report',duplicate:'ALREADY_CLAIMED'},
];
for(const transaction of transactions)for(const fault of ['dropped-slot','before-head','after-head'])test(`controller ${transaction.name} ${fault} save fault never exposes speculative rewards and reload resolves exactly once`,async()=>{
 const source=stages()[transaction.stage],h=await harness(source),command=transaction.command(source),expected=reduceRuntime(source,command);assert.equal(expected.ok,true);
 const original=h.storage.setItem;h.storage.setItem=(key,value)=>{
  if(fault==='dropped-slot'&&h.store.keys.slots.includes(key))return;
  if(key===h.store.keys.head&&fault==='before-head')throw Error('explicit pre-head fixture');
  original(key,value);if(key===h.store.keys.head&&fault==='after-head')throw Error('explicit post-head fixture');
 };
 const result=await h.controller.dispatch(command);assert.equal(result.code,fault==='dropped-slot'?'WRITE_FAILED':'COMMIT_UNCERTAIN');assert.deepEqual(h.controller.snapshot(),source);assert.equal(h.controller.revision(),1);
 assert.equal(h.events.filter(event=>event.type==='committed').length,0);assert.deepEqual(h.events.at(-1),{type:'saveFailed',code:result.code});
 assert.deepEqual(h.store.load().state,fault==='after-head'?expected.state:source);
 if(fault!=='dropped-slot'){const blocked=await h.controller.dispatch(command);assert.equal(blocked.blocked,true);assert.equal(blocked.code,'COMMIT_UNCERTAIN');}
 h.storage.setItem=original;
 if(fault==='dropped-slot'){await dispatch(h,command);}else{
  const loaded=await h.controller.load();assert.equal(loaded.ok,true);
  if(fault==='after-head'){assert.deepEqual(loaded.state,expected.state);await reject(h,command,'STALE_REVISION');await reject(h,transaction.command(loaded.state),transaction.duplicate);}
  else{assert.deepEqual(loaded.state,source);await dispatch(h,command);}
 }
 const final=h.controller.snapshot();assert.deepEqual(final,expected.state);assert.equal(final.world.claimedRewards.filter(id=>id===transaction.receipt).length,1);assert.deepEqual(h.store.load().state,expected.state);await roundTripLoad(h);
});

for(const transaction of transactions)test(`two real sessions race ${transaction.name}: only one B transaction commits and the loser reloads without duplicate reward`,async()=>{
 const source=stages()[transaction.stage],storage=memory(),sharedLocks=locks(),profile='qa-battlefield-race',h=await harness(source,{storage,sharedLocks,profile});
 const second=createController(createSession(storage,sharedLocks,{profile,namespace:'qa-r11'}));assert.equal((await second.load()).ok,true);
 const command=transaction.command(source),expected=reduceRuntime(source,command);assert.equal(expected.ok,true);
 const results=await Promise.all([h.controller.dispatch(command),second.dispatch(command)]);assert.equal(results.filter(result=>result.ok).length,1);assert.equal(results.filter(result=>result.code==='CONFLICT').length,1);
 const loser=results[0].ok?second:h.controller;assert.deepEqual(loser.snapshot(),source);assert.equal((await loser.dispatch(command)).blocked,true);
 const loaded=await loser.load();assert.equal(loaded.ok,true);assert.deepEqual(loaded.state,expected.state);assert.equal((await loser.dispatch(command)).code,'STALE_REVISION');assert.equal((await loser.dispatch(transaction.command(loaded.state))).code,transaction.duplicate);
 assert.equal(h.store.load().state.world.claimedRewards.filter(id=>id===transaction.receipt).length,1);assert.deepEqual(h.store.load().state,expected.state);
});

test('B revision overflow rejects real travel and reward atomically before any save',async()=>{
 // Deliberate boundary fixture; revision limits are not earned-route evidence.
 const source=stages().westGuards;source.world.objectives.battlefield_revision=Number.MAX_SAFE_INTEGER;assert.equal(validateState(source).ok,true);
 const h=await harness(source);await reject(h,objectCommand(source,'battlefield-west-device'),'REVISION_LIMIT');await reject(h,portalCommand(source,'battlefield-town-return'),'REVISION_LIMIT');
 assert.deepEqual(h.store.load().state,source);
});
