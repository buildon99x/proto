import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {reduceDungeon,validateDungeonProgress,dungeonPortalAllowed,DUNGEON_COMMANDS} from '../src/dungeon.js';
import {DUNGEON_REGIONS,DUNGEON_FOES,DUNGEON_LINKS,DUNGEON_GROUPS,DUNGEON_REWARDS,DUNGEON_PROGRESS_DEFAULTS} from '../src/dungeon-content.js';
import {getRegion,createMap,inMap,near,lineOfSight} from '../src/world.js';
import {quoteEquipment} from '../src/equipment.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';

// Settlement fixtures, NOT AI combat or ordinary-input play. Positions are
// scripted to valid interaction points and actual settleCombat reports stand in
// for kills. XP/levels/required quest flags are never injected into route runs.
const copy=x=>JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const report=(s,position=s.world.position)=>({life:s.world.life??0,position:{x:position.x,y:position.y},vitals:{...s.vitals},...(s.recovery?{recovery:copy(s.recovery)}:{})});
function run(s,c){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,true,JSON.stringify({command:c.type,id:c.objectId??c.portalId,reason:r}));assert.deepEqual(s,before);assert.deepEqual(c,request);assert.equal(validateState(r.state).ok,true);assert.equal(validateDungeonProgress(r.state).ok,true);return r;}
function rejected(s,c,code){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,false);assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
function travel(s,portalId){const p=getRegion(s.world.region).portals.find(p=>p.id===portalId);assert.ok(p,portalId);return run(s,{type:'travel',portalId,to:p.to,...report(s,p)}).state;}
function interact(s,objectId,value){const o=getRegion(s.world.region).objects.find(o=>o.id===objectId);assert.ok(o,objectId);return run(s,{type:'interactDungeon',objectId,...(value===undefined?{}:{value}),...report(s,o)}).state;}
function settle(s,ids,position=s.world.position,extra={}){return run(s,{type:'settleCombat',defeated:ids,...report(s,position),...extra}).state;}
function entry(difficulty='normal',full=false){
  let s=createState({difficulty});
  s=run(s,{type:'trainStarter',position:{x:260,y:325}}).state;
  s=run(s,{type:'acceptPatrol',position:{x:450,y:325}}).state;
  s=travel(s,'road');
  const foes=getRegion('ash_road').foes,ids=full?foes.map(f=>f.id):[...foes.filter(f=>f.kind==='scout').slice(0,5).map(f=>f.id),'road-warden'];
  s=settle(s,ids);
  if(full)s=run(s,{type:'openChest',chestId:'road-cache',...report(s,{x:588,y:604})}).state;
  s=run(s,{type:'openChest',chestId:'warden-cache',...report(s,{x:868,y:112})}).state;
  s=travel(s,'home');s=run(s,{type:'claimReward',rewardId:'watch_patrol',position:{x:450,y:325}}).state;
  return s;
}
function accepted(difficulty='normal',full=false){let s=entry(difficulty,full);return run(s,{type:'acceptSluiceQuest',...report(s,{x:450,y:325})}).state;}
function upper(difficulty='normal',full=false){let s=accepted(difficulty,full);s=travel(s,'road');return travel(s,'road-sluice-in');}
function afterGuard(difficulty='normal',full=false){let s=upper(difficulty,full);s=interact(s,'sluice-crank');return settle(s,DUNGEON_GROUPS.upper_guard,{x:432,y:528});}
function afterSequence(difficulty='normal',full=false){let s=afterGuard(difficulty,full);for(const id of ['sluice-rune-water','sluice-rune-gear','sluice-rune-ember'])s=interact(s,id);return s;}
function afterControl(difficulty='normal',full=false){let s=afterSequence(difficulty,full);return settle(s,DUNGEON_GROUPS.upper_control,{x:416,y:256});}
function lower(difficulty='normal',full=false,optional=false){let s=afterControl(difficulty,full);s=interact(s,'sluice-valve-inlet',0);s=interact(s,'sluice-valve-outlet',1);s=interact(s,'sluice-flow-selector',optional?2:1);return travel(s,'upper-descend');}
function readyBoss(difficulty='normal',full=false,optional=false){let s=lower(difficulty,full,optional);s=interact(s,'sluice-lift-chain');if(optional){s=settle(s,DUNGEON_GROUPS.store,{x:192,y:272});s=interact(s,'sluice-store-cache');}s=settle(s,DUNGEON_GROUPS.lower_antechamber,{x:416,y:400});return interact(s,'sluice-boss-bell');}
function cleared(difficulty='normal',full=false,optional=false){let s=readyBoss(difficulty,full,optional);s=settle(s,DUNGEON_GROUPS.boss,{x:560,y:144});return interact(s,'sluice-core');}
function route(difficulty='normal',full=false,optional=false){let s=cleared(difficulty,full,optional);const beforeReport=s.stats.earnedXp;s=travel(s,'lower-lift-town');s=run(s,{type:'reportSluiceQuest',...report(s,{x:450,y:325})}).state;return {state:s,beforeReport};}
const at=(s,id,value)=>{const o=getRegion(s.world.region).objects.find(o=>o.id===id);return {type:'interactDungeon',objectId:id,...(value===undefined?{}:{value}),...report(s,o)};};

test('authored content has two floors, globally unique object/enemy/portal IDs and fixed boss patterns',()=>{
  assert.equal(Object.keys(DUNGEON_REGIONS).length,2);const regions=Object.values(DUNGEON_REGIONS);
  for(const key of ['objects','foes','portals']){const ids=regions.flatMap(r=>r[key].map(x=>x.id));assert.equal(ids.length,new Set(ids).size);}
  assert.equal(regions.reduce((n,r)=>n+r.foes.length,0),12);assert.equal(DUNGEON_GROUPS.upper_guard.length+DUNGEON_GROUPS.upper_control.length+DUNGEON_GROUPS.lower_antechamber.length+DUNGEON_GROUPS.boss.length,9);
  assert.equal(DUNGEON_FOES.sluice_keeper.hp,220);assert.equal(DUNGEON_FOES.sluice_keeper.role,'boss');assert.deepEqual(DUNGEON_FOES.sluice_keeper.patterns.map(p=>p.shape),['cone','line','circle']);
  assert.equal(Object.entries(DUNGEON_REWARDS).filter(([id])=>id!=='r4:store').reduce((n,[,r])=>n+r.xp,0),350);
  assert.throws(()=>{DUNGEON_REGIONS.sluice_upper.foes.push({});},TypeError);
});
test('old R3 v2 state has no dungeon fields and remains valid; partial flags/tools/receipts do not',()=>{
  const s=createState();s.version=2;delete s.options.controls;assert.equal(validateState(s).ok,true);assert.equal(s.version,2);assert.deepEqual(validateDungeonProgress(s),{ok:true});
  for(const edit of [s=>{s.world.objectives.first_dungeon_cleared=0;},s=>s.inventory.tools.push('sluice_key'),s=>s.world.claimedRewards.push('r4:accept'),s=>s.world.visited.push('sluice_upper')]){const bad=copy(s);edit(bad);assert.equal(validateDungeonProgress(bad).ok,false);}
});
test('acceptance needs actual starter training, elder reach, patrol report and warden chest',()=>{
  let s=createState();const c={type:'acceptSluiceQuest',life:0,position:{x:450,y:325},vitals:{hp:55,mana:40,stamina:45}};
  rejected(s,c,'TRAIN_FIRST');s=run(s,{type:'trainStarter',position:{x:260,y:325}}).state;
  rejected(s,{type:'acceptSluiceQuest',...report(s,{x:450,y:325})},'PATROL_REQUIRED');
  const e=entry();rejected(e,{type:'acceptSluiceQuest',...report(e,{x:100,y:100})},'ELDER_REQUIRED');
  const missing=copy(e);missing.world.claimedRewards=missing.world.claimedRewards.filter(x=>x!=='chest:warden-cache');
  rejected(missing,{type:'acceptSluiceQuest',...report(missing,{x:450,y:325})},'WARDEN_CACHE_REQUIRED');
});
test('acceptance initializes all R4 progress without XP, tiers, ranks, money or duplicate keys',()=>{
  const s=entry(),r=run(s,{type:'acceptSluiceQuest',...report(s,{x:450,y:325})}),n=r.state;
  for(const [key,value]of Object.entries(DUNGEON_PROGRESS_DEFAULTS))assert.equal(n.world.objectives[key],value);
  assert.deepEqual(n.character,s.character);assert.equal(n.gold,s.gold);assert.deepEqual(n.inventory.tools,['sluice_key']);
  rejected(n,{type:'acceptSluiceQuest',...report(n,{x:450,y:325})},'ALREADY_ACCEPTED');
});
for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: actual runtime settlement fixture reaches L5 on strict minimum six-road-kill route without optional rewards`,t=>{
  const {state:s,beforeReport}=route(difficulty),hard=['hard','serious'].includes(difficulty),expected=hard?709.5:791;
  assert.equal(s.stats.earnedXp,expected);assert.equal(s.character.level,5);assert.equal(s.character.xp,expected-700);assert.equal(beforeReport,hard?619.5:701);
  assert.equal(s.stats.kills,15);assert.equal(s.stats.earnedGold,254);assert.equal(s.gold,254);assert.equal(s.character.tier,'apprentice');assert.equal(s.world.objectives.adept_commission,1);
  assert.equal(s.character.attributePoints,20);assert.equal(s.character.skillPoints,13);assert.equal(s.world.claimedRewards.includes('chest:road-cache'),false);assert.equal(s.world.claimedRewards.includes('r4:store'),false);
  t.diagnostic(JSON.stringify({kind:'settlement fixture; scripted coordinates; no AI combat',difficulty,xp:s.stats.earnedXp,level:s.character.level,gold:s.gold,beforeReport}));
});
for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: full existing road completion applies lower-tier XP at each current level`,()=>{
  const {state:s}=route(difficulty,true),hard=['hard','serious'].includes(difficulty);assert.equal(s.stats.earnedXp,hard?896:972.5);assert.equal(s.character.level,5);assert.equal(s.stats.kills,34);assert.equal(s.gold,339);
});
for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: optional branch remains optional and pays only its authored rewards`,()=>{
  const hard=['hard','serious'].includes(difficulty),a=route(difficulty,false,true).state,b=route(difficulty,true,true).state;
  assert.equal(a.stats.earnedXp,hard?774:867);assert.equal(a.gold,287);assert.equal(b.stats.earnedXp,hard?915.125:1025.5);assert.equal(b.gold,372);assert.equal(b.character.level,hard?5:6);assert.equal(b.character.tier,'apprentice');
});
test('door, stairs and lift portal gates require their own milestones, not merely a high level',()=>{
  const s=entry();assert.equal(dungeonPortalAllowed(s,DUNGEON_LINKS.ash_road[0]).code,'QUEST_REQUIRED');
  const a=accepted();assert.equal(dungeonPortalAllowed(a,DUNGEON_LINKS.ash_road[0]).ok,true);
  assert.equal(dungeonPortalAllowed(a,DUNGEON_REGIONS.sluice_upper.portals[1]).code,'WATER_REQUIRED');
  let l=lower();assert.equal(dungeonPortalAllowed(l,DUNGEON_LINKS.ash_hamlet[0]).code,'SHORTCUT_REQUIRED');
  l=interact(l,'sluice-lift-chain');assert.equal(dungeonPortalAllowed(l,DUNGEON_LINKS.ash_hamlet[0]).ok,true);assert.equal(dungeonPortalAllowed(l,{gate:'invented'}).code,'UNKNOWN_GATE');
  assert.equal(dungeonPortalAllowed(l,{}).ok,true);
});
test('all mandatory guard groups are enforced before their rewarded puzzle or boss release',()=>{
  let s=upper();s=interact(s,'sluice-crank');rejected(s,at(s,'sluice-rune-water'),'GUARDS_ALIVE');
  s=settle(s,DUNGEON_GROUPS.upper_guard.slice(0,2),{x:432,y:528});rejected(s,at(s,'sluice-rune-water'),'GUARDS_ALIVE');
  const q=afterSequence();rejected(q,at(q,'sluice-valve-inlet',0),'CONTROL_GUARDS_ALIVE');
  let l=lower();rejected(l,at(l,'sluice-boss-bell'),'ANTECHAMBER_ALIVE');
  l=settle(l,DUNGEON_GROUPS.lower_antechamber.slice(0,1),{x:416,y:400});rejected(l,at(l,'sluice-boss-bell'),'ANTECHAMBER_ALIVE');
});
test('crank ownership is required and once-only; record reads and wrong rune sequences never mint XP',()=>{
  let s=upper();s=settle(s,DUNGEON_GROUPS.upper_guard,{x:432,y:528});rejected(s,at(s,'sluice-rune-water'),'TOOL_REQUIRED');
  s=interact(s,'sluice-crank');rejected(s,at(s,'sluice-crank'),'ALREADY_CLAIMED');
  const xp=s.stats.earnedXp,gold=s.gold;s=interact(s,'sluice-entry-record');s=interact(s,'sluice-entry-record');s=interact(s,'sluice-rune-gear');
  assert.equal(s.world.objectives.sluice_rune_step,0);assert.equal(s.stats.earnedXp,xp);assert.equal(s.gold,gold);
  s=interact(s,'sluice-rune-water');s=JSON.parse(JSON.stringify(s));assert.equal(validateState(s).ok,true);s=interact(s,'sluice-rune-ember');assert.equal(s.world.objectives.sluice_rune_step,0);
  for(const id of ['sluice-rune-water','sluice-rune-gear','sluice-rune-ember'])s=interact(s,id);
  assert.equal(s.stats.earnedXp,xp+60);assert.equal(s.world.objectives.sluice_sequence_solved,1);rejected(s,at(s,'sluice-rune-water'),'ALREADY_OPEN');
});
test('water logic requires both valve states and a route choice; route changes never close paths or repay XP',()=>{
  let s=afterControl(),xp=s.stats.earnedXp;s=interact(s,'sluice-flow-selector',2);s=interact(s,'sluice-valve-outlet',1);
  assert.equal(s.world.objectives.sluice_bridge_open,0);assert.equal(s.world.objectives.sluice_store_open,0);assert.equal(s.stats.earnedXp,xp);
  s=interact(s,'sluice-valve-inlet',0);assert.equal(s.world.objectives.sluice_bridge_open,1);assert.equal(s.world.objectives.sluice_store_open,1);assert.equal(s.stats.earnedXp,xp+70);
  s=interact(s,'sluice-flow-selector',1);s=interact(s,'sluice-flow-selector',2);assert.equal(s.world.objectives.sluice_store_open,1);assert.equal(s.stats.earnedXp,xp+70);
  rejected(s,at(s,'sluice-valve-inlet',1),'ALREADY_OPEN');
  for(const value of [-1,0,3,NaN,'2']){const c=at(s,'sluice-flow-selector',value),r=reduceDungeon(s,c);assert.equal(r.ok,false);}
});
test('optional store requires drain choice and its own three guards, independently of the main boss',()=>{
  const locked=lower();rejected(locked,at(locked,'sluice-store-cache'),'STORE_LOCKED');
  let s=lower('normal',false,true);rejected(s,at(s,'sluice-store-cache'),'STORE_GUARDS_ALIVE');
  s=settle(s,DUNGEON_GROUPS.store,{x:192,y:272});const before=copy(s);s=interact(s,'sluice-store-cache');
  assert.equal(s.stats.earnedXp,before.stats.earnedXp+30);assert.equal(s.gold,before.gold+18);assert.equal(s.inventory.consumables.health_potion,before.inventory.consumables.health_potion+1);
  assert.equal(s.world.objectives.first_dungeon_cleared,0);rejected(s,at(s,'sluice-store-cache'),'ALREADY_CLAIMED');
});
test('core requires boss defeat and report requires core; commission never performs an Adept promotion',()=>{
  let s=readyBoss();rejected(s,at(s,'sluice-core'),'BOSS_ALIVE');
  s=travel(s,'lower-lift-town');rejected(s,{type:'reportSluiceQuest',...report(s,{x:450,y:325})},'CORE_REQUIRED');
  s=route().state;assert.equal(s.world.objectives.first_dungeon_cleared,1);assert.equal(s.world.objectives.adept_commission,1);assert.equal(s.character.tier,'apprentice');
  rejected(s,{type:'reportSluiceQuest',...report(s,{x:450,y:325})},'ALREADY_CLAIMED');assert.equal(DUNGEON_COMMANDS.has('promoteAdept'),false);
});
test('valid nearby coordinates across an actual wall cannot interact even within the distance radius',()=>{
  const s=upper(),object=getRegion('sluice_upper').objects.find(o=>o.id==='sluice-entry-record'),position={x:272,y:560},map=createMap('sluice_upper',s);
  assert.equal(inMap(map,position.x,position.y),true);assert.equal(near(position,object),true);assert.equal(lineOfSight(map,position,object),false);
  rejected(s,{type:'interactDungeon',objectId:object.id,...report(s,position)},'WALL_BLOCKED');
});
test('wrong region, distant object, wall position, stale life and excessive resources reject without mutation',()=>{
  const s=upper();rejected(s,{type:'interactDungeon',objectId:'sluice-core',...report(s)},'UNKNOWN_OBJECT');
  rejected(s,{type:'interactDungeon',objectId:'sluice-rune-water',...report(s)},'OBJECT_REQUIRED');
  rejected(s,{...at(s,'sluice-crank'),position:{x:0,y:0}},'INVALID_REPORT');
  rejected(s,{...at(s,'sluice-crank'),life:1},'STALE_LIFE');
  rejected(s,{...at(s,'sluice-crank'),vitals:{...s.vitals,mana:100000}},'INVALID_REPORT');
});
test('commands reject arbitrary XP/flags/rewards, unknown types, bad values and malformed recovery',()=>{
  const s=upper();for(const extra of [{xp:9000},{gold:50},{flags:{first_dungeon_cleared:1}},{rewardId:'r4:report'},{value:1}])assert.equal(reduceDungeon(s,{...at(s,'sluice-crank'),...extra}).ok,false);
  for(const command of [{},{type:'promoteAdept'},null,{...at(s,'sluice-crank'),recovery:{}}])assert.equal(reduceDungeon(s,command).ok,false);
  const bad=copy(at(s,'sluice-crank'));bad.recovery={cooldowns:{invented:1},lock:0,manaDelay:0,staminaDelay:0,invuln:0,potionCooldown:0};assert.equal(reduceDungeon(s,bad).ok,false);
});
test('forged tools, incomplete objectives, future guard kills and disconnected receipts fail closed',()=>{
  const source=accepted();for(const edit of [s=>{delete s.world.objectives.sluice_valve_inlet;},s=>{s.world.objectives.adept_commission=1;},s=>{s.world.objectives.sluice_crank_found=1;},s=>{s.inventory.tools=[];},s=>s.world.claimedRewards.push('r4:water'),s=>{s.world.defeated.sluice_upper=[DUNGEON_GROUPS.upper_control[0]];},s=>{s.world.objectives.sluice_unknown=0;}]){const bad=copy(source);edit(bad);assert.equal(validateDungeonProgress(bad).ok,false);}
  const complete=route().state;for(const id of ['r4:crank','r4:sequence','r4:water','r4:bell','r4:core','r4:report']){const bad=copy(complete);bad.world.claimedRewards=bad.world.claimedRewards.filter(x=>x!==id);assert.equal(validateDungeonProgress(bad).ok,false);}
});
test('invalid JSON and malformed dungeon lists return failure without invoking getters or repairing data',()=>{
  for(const edit of [s=>{s.world.visited='sluice_upper';},s=>{s.world.defeated={ash_road:{}};},s=>{s.inventory.tools=new Array(1);},s=>{s.world.objectives.sluice_accepted=NaN;},s=>{s.extra=undefined;}]){const s=createState();edit(s);assert.equal(validateDungeonProgress(s).ok,false);}
  let reads=0;const s=createState();Object.defineProperty(s,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(validateDungeonProgress(s).ok,false);assert.equal(reads,0);
});
test('gold/material/receipt overflow rejects the complete pending reward atomically',()=>{
  let s=afterGuard();s=interact(s,'sluice-rune-water');s=interact(s,'sluice-rune-gear');let bad=copy(s);bad.stats.earnedGold=Number.MAX_SAFE_INTEGER;bad.stats.spentGold=Number.MAX_SAFE_INTEGER-bad.gold;
  rejected(bad,at(bad,'sluice-rune-ember'),'VALUE_OVERFLOW');
  let water=afterControl();water=interact(water,'sluice-valve-inlet',0);water=interact(water,'sluice-valve-outlet',1);water=copy(water);water.inventory.materials.iron=Number.MAX_SAFE_INTEGER;
  rejected(water,at(water,'sluice-flow-selector',1),'VALUE_OVERFLOW');
  bad=copy(s);while(bad.world.claimedRewards.length<4096)bad.world.claimedRewards.push('fixture:'+bad.world.claimedRewards.length);
  rejected(bad,at(bad,'sluice-rune-ember'),'RECEIPT_LIMIT');
});
test('same-frame boss and hero death retains kill XP, not core; retry/lift recovery cannot duplicate reward',()=>{
  let s=readyBoss('hard'),before=s.stats.earnedXp;s=settle(s,DUNGEON_GROUPS.boss,{x:560,y:144},{vitals:{...s.vitals,hp:0}});
  assert.equal(s.stats.earnedXp,before+75);assert.equal(s.world.lifeDown,true);assert.equal(s.world.objectives.first_dungeon_cleared,0);
  rejected(s,at(s,'sluice-core'),'HERO_DOWN');const deathGold=s.gold;s=run(s,{type:'retry'}).state;assert.equal(s.gold,deathGold);assert.equal(s.world.life,1);
  s=travel(s,'town-sluice-lift');const xp=s.stats.earnedXp;s=settle(s,DUNGEON_GROUPS.boss);assert.equal(s.stats.earnedXp,xp);
  s=interact(s,'sluice-core');assert.equal(s.stats.earnedXp,xp+70);rejected(s,at(s,'sluice-core'),'ALREADY_CLAIMED');
});
test('JSON re-entry, region roundtrip and record reread preserve progression without duplicate grants',()=>{
  let s=cleared();const xp=s.stats.earnedXp,items=copy(s.inventory),objectives=copy(s.world.objectives);s=JSON.parse(JSON.stringify(s));assert.equal(validateState(s).ok,true);
  s=travel(s,'lower-lift-town');s=travel(s,'town-sluice-lift');s=travel(s,'lower-ascend');s=interact(s,'sluice-entry-record');
  assert.equal(s.stats.earnedXp,xp);assert.deepEqual(s.inventory,items);for(const [key,value]of Object.entries(objectives))if(key!=='sluice_record_read')assert.equal(s.world.objectives[key],value);
});
test('real equipment runtime consumes first-dungeon salvage and unlocks +2 without free levels or duplicate salvage',()=>{
  let s=route().state;const equipment=(operation,station='blacksmith')=>{const point=station==='blacksmith'?{x:250,y:470}:{x:430,y:480};s=run(s,{type:'equipment',operation,position:point}).state;};
  equipment({type:'receiveEquipmentAward',commandId:'dng-tools',awardId:'workshop_supplies',station:'blacksmith'});
  equipment({type:'receiveEquipmentAward',commandId:'dng-salvage',awardId:'first_dungeon_salvage'});
  equipment({type:'buyEquipment',commandId:'dng-shield',baseId:'oak_shield',station:'blacksmith'});
  const id=s.inventory.equipmentInstances[0].id,xp=s.stats.earnedXp;
  equipment({type:'upgradeItem',commandId:'dng-plus1',itemId:id,expectedRank:0,station:'workshop'},'workshop');
  equipment({type:'upgradeItem',commandId:'dng-plus2',itemId:id,expectedRank:1,station:'workshop'},'workshop');
  assert.equal(s.inventory.equipmentInstances[0].upgradeRank,2);assert.equal(s.inventory.materials.ember_shard,0);assert.equal(s.stats.earnedXp,xp);assert.equal(s.character.tier,'apprentice');
  assert.equal(quoteEquipment(s,{type:'craftItem',commandId:'dng-no-extra-ember',recipeId:'focus_charm',station:'workshop'}).code,'MATERIAL_SHORTAGE');
  rejected(s,{type:'equipment',operation:{type:'receiveEquipmentAward',commandId:'dng-another-salvage',awardId:'first_dungeon_salvage'},position:{x:250,y:470}},'AWARD_ALREADY_CLAIMED');
});
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locked={request:async(_key,_options,fn)=>fn()};
test('real save envelopes retain legacy R3 entry, partial runes and tools through fresh store instances',()=>{
  const m=memory(),options={profile:'qa-dungeon-save'};let store=createStore(m,options),revision=0,s=entry('hard');
  const persist=()=>{assert.equal(store.save(s,{expectedRevision:revision}).ok,true);revision++;store=createStore(m,options);const loaded=store.load();assert.equal(loaded.revision,revision);assert.deepEqual(loaded.state,s);s=loaded.state;};
  persist();assert.equal(Object.hasOwn(s.world.objectives,'sluice_accepted'),false);
  s=run(s,{type:'acceptSluiceQuest',...report(s,{x:450,y:325})}).state;persist();
  s=travel(s,'road');s=travel(s,'road-sluice-in');s=interact(s,'sluice-crank');s=settle(s,DUNGEON_GROUPS.upper_guard,{x:432,y:528});s=interact(s,'sluice-rune-water');persist();
  assert.equal(s.world.objectives.sluice_rune_step,1);assert.deepEqual(s.inventory.tools,['sluice_key','sluice_crank']);
  const xp=s.stats.earnedXp;s=interact(s,'sluice-rune-gear');s=interact(s,'sluice-rune-ember');persist();assert.equal(s.stats.earnedXp,xp+60);
  rejected(s,at(s,'sluice-rune-ember'),'ALREADY_OPEN');
});
test('queued controller report commits once and fresh controller reload preserves the commission and earned XP',async()=>{
  const m=memory(),store=createSession(m,locked,{profile:'qa-dungeon-report'}),s=travel(cleared('hard'),'lower-lift-town');
  assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);assert.equal((await c.load()).ok,true);
  const command={type:'reportSluiceQuest',...report(s,{x:450,y:325})},results=await Promise.all([c.dispatch(command),c.dispatch(command)]);
  assert.equal(results[0].ok,true);assert.equal(results[1].code,'ALREADY_CLAIMED');assert.equal(c.revision(),2);
  const resumed=createController(createSession(m,locked,{profile:'qa-dungeon-report'}));assert.equal((await resumed.load()).ok,true);
  const loaded=resumed.snapshot();assert.equal(loaded.stats.earnedXp,709.5);assert.equal(loaded.gold,254);assert.equal(loaded.world.objectives.adept_commission,1);assert.equal(loaded.character.tier,'apprentice');
  assert.equal((await resumed.dispatch(command)).code,'ALREADY_CLAIMED');assert.equal(resumed.revision(),2);
});
for(const afterWrite of [false,true])test(`dungeon report ${afterWrite?'post':'pre'}-head write failure blocks replay until load and never duplicates the grant`,async()=>{
  const m=memory(),store=createSession(m,locked,{profile:'qa-dungeon-uncertain'}),s=travel(cleared('hard'),'lower-lift-town');
  assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);await c.load();
  const original=m.setItem;m.setItem=(key,value)=>{if(key!==store.keys.head||afterWrite)original(key,value);if(key===store.keys.head)throw new Error('fixture: head write unavailable');};
  const command={type:'reportSluiceQuest',...report(s,{x:450,y:325})};assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);
  assert.equal((await c.dispatch(command)).blocked,true);m.setItem=original;assert.equal((await c.load()).ok,true);
  assert.equal(c.snapshot().stats.earnedXp,afterWrite?709.5:619.5);
  const retry=await c.dispatch(command);assert.equal(retry.ok,!afterWrite);if(afterWrite)assert.equal(retry.code,'ALREADY_CLAIMED');
  assert.equal(c.snapshot().stats.earnedXp,709.5);assert.equal(c.snapshot().gold,254);assert.equal(c.snapshot().world.claimedRewards.filter(id=>id==='r4:report').length,1);
});
