import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState,migrateState} from '../src/state.js';
import {createStore,createSession,checksum} from '../src/save.js';
import {createController} from '../src/controller.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {createMap,getRegion,inMap,lineOfSight,traceSegment,findPathStep} from '../src/world.js';
import {TOMB_REGION,TOMB_GROUPS} from '../src/tomb-content.js';
import {tombInputRevision,validateTombProgress} from '../src/tomb.js';
import {earnedFurnaceRoute} from './support/earned-furnace-route.mjs';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// SCRIPTED production reducer routes and isolated live-step collision fixtures.
// Legacy/corruption snapshots and projectile/actor positions are synthetic.
// No test here represents ordinary-input play, survival, visual QA or boss-phase
// behavior. Production modules are imported unchanged, with no test registration.
const copy=value=>structuredClone(value),elder={x:450,y:325};
const memory=()=>{const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};};
const quest=(state,type)=>({type,...report(state,elder),expectedRevision:tombInputRevision(state)});
function interact(state,id){const object=getRegion(TOMB_REGION).objects.find(row=>row.id===id);return run(state,{type:'interactTomb',objectId:id,...report(state,object),expectedRevision:tombInputRevision(state),...(object.actionKind==='glyph'?{glyph:object.glyph,expectedStep:state.world.objectives.tomb_sequence_step}:{})}).state;}
let stageCache;
function stages(){
 if(stageCache)return stageCache.map(copy);
 let state=earnedFurnaceRoute();state=run(state,quest(state,'acceptTombQuest')).state;state=travel(state,'town-tomb-entry');const result=[state];
 state=interact(settle(state,TOMB_GROUPS.entry),'tomb-projection');result.push(state);
 state=settle(state,TOMB_GROUPS.inscription);for(const id of ['tomb-glyph-crescent','tomb-glyph-split-beam','tomb-glyph-ember'])state=interact(state,id);result.push(state);
 state=interact(state,'tomb-ward-origin');result.push(state);
 state=interact(settle(state,TOMB_GROUPS.ward_lower),'tomb-ward-midpoint');result.push(state);
 state=interact(settle(state,TOMB_GROUPS.ward_upper),'tomb-ward-final');result.push(state);
 stageCache=result.map(copy);return result;
}
function reachable(map){const start=getRegion(TOMB_REGION).spawn,list=[start],seen=new Set([`${start.x}:${start.y}`]);for(let index=0;index<list.length;index++)for(const [dx,dy]of [[32,0],[-32,0],[0,32],[0,-32]]){const p={x:list[index].x+dx,y:list[index].y+dy},key=`${p.x}:${p.y}`;if(!seen.has(key)&&inMap(map,p.x,p.y,11)&&!traceSegment(map,list[index],p,11).blocked){seen.add(key);list.push(p);}}return list;}

for(const version of [1,2,3])for(const trained of [false,true])test(`untouched v${version} ${trained?'trained':'fresh'} load is byte-preserving and creates no T defaults`,async()=>{
 let state=createState();if(trained)state=run(state,{type:'trainStarter',position:{x:260,y:325}}).state;
 state=copy(state);state.version=version;delete state.actionSlots;state.options.controls.version=2;delete state.options.controls.bindings.expert1;delete state.options.controls.bindings.expert2;if(version===1)delete state.equipmentProgress;if(version<3)delete state.options.controls;
 assert.equal(validateState(state).ok,true);const before=copy(state),storage=memory(),store=createStore(storage,{profile:`qa-tomb-old-${version}-${trained}`});
 assert.equal(store.save(state,{expectedRevision:0}).ok,true);const bytes=new Map(storage.data),writes=storage.writes.length;
 for(let n=0;n<2;n++){
  const raw=store.load();assert.deepEqual(raw.state,state);const controller=createController(store),loaded=await controller.load();assert.equal(loaded.ok,true);assert.equal(loaded.state.version,5);
  for(const candidate of [raw.state,loaded.state,migrateState(state)]){assert.equal(Object.hasOwn(candidate,'reservedTrainingGold'),false);assert.equal(Object.keys(candidate.world.objectives).some(key=>key.startsWith('tomb_')||key==='expert_commission'),false);assert.equal(candidate.world.claimedRewards.some(id=>id.startsWith('r10:')),false);}
 }
 assert.deepEqual(state,before);assert.deepEqual(storage.data,bytes);assert.equal(storage.writes.length,writes);
});

test('pre-T reservation structure and unsupported Expert history fail at the global boundary without mutation',()=>{
 for(const allocation of [null,[],{expert:-1},{expert:1},{expert:0,other:0},{expert:1.5}]){const state=createState();state.reservedTrainingGold=allocation;const before=copy(state);assert.equal(validateState(state).ok,false);assert.equal(reduceRuntime(state,{type:'setOption',option:'flashes',value:0}).ok,false);assert.deepEqual(state,before);}
 for(const source of [createState(),earnedFurnaceRoute(),stages()[0],earnedTombRoute()])for(const receipts of [['r10:promote:expert'],['r10:promote:unknown'],['r10:promote:expert','r10:promote:expert']]){const state=copy(source);state.world.claimedRewards.push(...receipts);const before=copy(state);assert.equal(validateTombProgress(state).ok,false,receipts.join());assert.equal(validateState(state).ok,false);assert.deepEqual(state,before);}
 const state=earnedTombRoute();state.version=3;state.character.tier='expert';state.reservedTrainingGold.expert=0;state.world.claimedRewards.push('r10:promote:expert');assert.equal(validateState(state).ok,false,'a historical v3 envelope cannot contain Expert');
});

test('valid checksums cannot load partial T flags, future defeats, forged receipts or reconstructed reservation',()=>{
 const source=earnedTombRoute();for(const edit of [
  state=>delete state.world.objectives.tomb_ward_midpoint,state=>delete state.reservedTrainingGold,state=>state.reservedTrainingGold.expert=0,
  state=>state.world.objectives.expert_commission=0,state=>state.world.claimedRewards.push('r10:t:unknown'),state=>state.world.claimedRewards.push('r10:promote:unknown'),
  state=>state.inventory.tools=state.inventory.tools.filter(id=>id!=='tomb_oath'),state=>state.world.objectives.tomb_decoded=0,
 ]){
  const storage=memory(),store=createStore(storage,{profile:'qa-tomb-corrupt-load'});assert.equal(store.save(source,{expectedRevision:0}).ok,true);
  const state=copy(source);edit(state);const envelope=JSON.parse(storage.data.get(store.keys.slots[0]));envelope.payload=JSON.stringify(state);envelope.checksum=checksum(envelope.payload);
  storage.data.set(store.keys.slots[0],JSON.stringify(envelope));storage.data.set(store.keys.head,JSON.stringify({slot:0,revision:1,checksum:envelope.checksum,previousCommit:null}));
  const bytes=new Map(storage.data),writes=storage.writes.length;assert.equal(store.load().code,'CORRUPT');assert.equal(store.save(source,{expectedRevision:1}).code,'CORRUPT');assert.deepEqual(storage.data,bytes);assert.equal(storage.writes.length,writes);
 }
});

for(let stage=0;stage<6;stage++)test(`registered T stage${stage} live charge/hammer/projectiles cannot damage or reach future foes`,()=>{
 const state=stages()[stage],map=createMap(TOMB_REGION,state),points=reachable(map),future=getRegion(TOMB_REGION).foes.filter(foe=>!state.world.objectives[foe.gate]);
 assert.deepEqual(createBattle(state).map,map);assert.equal(validateState(state).ok,true);
 for(const foe of getRegion(TOMB_REGION).foes)assert.equal(!!findPathStep(map,getRegion(TOMB_REGION).spawn,foe),!!state.world.objectives[foe.gate],foe.id);
 for(const foe of future){
  const point=points.toSorted((a,b)=>Math.hypot(a.x-foe.x,a.y-foe.y)-Math.hypot(b.x-foe.x,b.y-foe.y))[0];
  for(const dx of [-4,0,4])for(const dy of [-4,0,4]){const p={x:point.x+dx,y:point.y+dy};assert.equal(lineOfSight(map,p,foe),false);assert.equal(traceSegment(map,p,foe,2).blocked,true,'actual runtime projectile radius');}
  const make=()=>{const battle=createBattle(state);Object.assign(battle.p,point);battle.awaitingAdvance=false;battle.enemies=battle.enemies.filter(enemy=>!state.world.objectives[enemy.gate]);return battle;};
  for(const skill of ['charge','hammer']){
   const battle=make(),hp=battle.enemies.map(enemy=>enemy.hp),events=stepBattle(battle,state.character,.05,{[skill]:true,aim:foe});assert.ok(events.some(event=>event.type==='actionStarted'),skill);
   for(let tick=0;tick<60;tick++){stepBattle(battle,state.character,.05);assert.ok(inMap(map,battle.p.x,battle.p.y,11));assert.ok(findPathStep(map,getRegion(TOMB_REGION).spawn,battle.p));}
   assert.deepEqual(battle.enemies.map(enemy=>enemy.hp),hp);assert.equal(battle.shots.length,0);
  }
  // Adversarial high-speed projectile fixtures exercise the same swept handler
  // in both directions; synthetic speed/lifetime is not a content balance row.
  for(const hostile of [false,true]){
   const battle=make(),hp=battle.enemies.map(enemy=>enemy.hp),heroHp=battle.p.hp,from=hostile?foe:point,to=hostile?point:foe,angle=Math.atan2(to.y-from.y,to.x-from.x);
   battle.shots.push({kind:hostile?'arrow':'hammer',enemy:hostile,x:from.x,y:from.y,vx:Math.cos(angle)*1200,vy:Math.sin(angle)*1200,life:2,damage:999,hitIds:[]});
   for(let tick=0;tick<45&&battle.shots.length;tick++)stepBattle(battle,state.character,.05);
   assert.equal(battle.shots.length,0);assert.deepEqual(battle.enemies.map(enemy=>enemy.hp),hp);assert.equal(battle.p.hp,heroHp);
  }
 }
});

test('same-band reordered and batch settlements preserve sequential L15 XP calculation',()=>{
 for(const difficulty of ['easy','normal'])for(const full of [false,true]){
  let state=earnedFurnaceRoute(difficulty,{full});state=travel(run(state,quest(state,'acceptTombQuest')).state,'town-tomb-entry');
  if(!full)state=interact(settle(state,TOMB_GROUPS.entry),'tomb-projection');const ids=TOMB_GROUPS[full?'entry':'inscription'];
  let sequential=state;for(const id of ids)sequential=settle(sequential,[id]);const batched=settle(state,ids),reordered=settle(state,[...ids].reverse());
  assert.equal(state.character.level,14);assert.equal(batched.character.level,15);
  for(const result of [batched,reordered]){assert.deepEqual(result.character,sequential.character);assert.deepEqual(result.stats,sequential.stats);assert.equal(result.gold,sequential.gold);assert.deepEqual(result.world.defeated[TOMB_REGION].toSorted(),sequential.world.defeated[TOMB_REGION].toSorted());}
 }
});

test('two session controllers race T report once and a reloaded loser cannot duplicate or release protected gold',async()=>{
 const source=earnedTombRoute('hard',{reportQuest:false}),storage=memory();let queue=Promise.resolve();const locks={request(_key,_options,fn){const result=queue.then(fn);queue=result.catch(()=>{});return result;}};
 const options={profile:'qa-tomb-report-race'},store=createSession(storage,locks,options);assert.equal((await store.save(source,{expectedRevision:0})).ok,true);
 const a=createController(store),b=createController(createSession(storage,locks,options));await Promise.all([a.load(),b.load()]);const command=quest(source,'reportTombQuest'),results=await Promise.all([a.dispatch(command),b.dispatch(command)]);
 assert.equal(results.filter(result=>result.ok).length,1);assert.equal(results.filter(result=>result.code==='CONFLICT').length,1);
 const loser=results[0].ok?b:a;assert.equal((await loser.dispatch(command)).blocked,true);const loaded=await loser.load();assert.equal(loaded.ok,true);assert.equal((await loser.dispatch(command)).code,'STALE_REVISION');
 assert.equal((await loser.dispatch(quest(loaded.state,'reportTombQuest'))).code,'ALREADY_CLAIMED');assert.equal(loaded.state.gold,source.gold+120);assert.equal(loaded.state.stats.earnedXp,source.stats.earnedXp+140);assert.deepEqual(loaded.state.reservedTrainingGold,{expert:120});assert.equal(loaded.state.world.claimedRewards.filter(id=>id==='r10:t:report').length,1);
});
