import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {QUARRY_REGIONS,QUARRY_FOES,QUARRY_LINKS,QUARRY_GROUPS,QUARRY_REWARDS,QUARRY_PROGRESS_DEFAULTS,QUARRY_RECEIPTS} from '../src/quarry-content.js';
import {QUARRY_COMMANDS,reduceQuarry,validateQuarryProgress,quarryPortalAllowed} from '../src/quarry.js';
import {quarryObjectView,quarryGuidance,quarryElderView} from '../src/quarry-presentation.js';
import {getRegion,createMap,inMap,lineOfSight,near,findPathStep} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {emptyRecovery,battleReport} from '../src/recovery.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {route,report,run,travel,settle} from './support/earned-route.mjs';

// SETTLEMENT FIXTURES, NOT AI combat or ordinary-input completion. Predecessor
// route, promotion, quest actions, kills and saving use actual handlers. Legal
// interaction coordinates and kill reports are scripted; no XP/levels/quest
// flags or free skills are injected into earned route runs.
const copy=x=>structuredClone(x),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const townElder={x:450,y:325},predecessors=new Map();
function promoted(difficulty='normal',full=false){
 const key=difficulty+full;if(!predecessors.has(key)){const s=route(difficulty,full,full).state;predecessors.set(key,run(s,{type:'promoteAdept',...report(s,{x:260,y:325}),recovery:s.recovery??emptyRecovery()}).state);}
 return copy(predecessors.get(key));
}
const quest=(s,type)=>({type,...report(s,townElder)});
function accepted(difficulty='normal',full=false){const s=promoted(difficulty,full);return run(s,quest(s,'acceptQuarryQuest')).state;}
const point=id=>QUARRY_REGIONS.ember_quarry.objects.find(o=>o.id===id);
const at=(s,id)=>({type:'interactQuarry',objectId:id,...report(s,point(id))});
const interact=(s,id)=>run(s,at(s,id)).state;
const enter=(difficulty='normal',full=false)=>travel(accepted(difficulty,full),'town-quarry-entry');
function tool(difficulty='normal',full=false){let s=enter(difficulty,full);s=settle(s,QUARRY_GROUPS.entry);return interact(s,'quarry-tool');}
function rescue(difficulty='normal',full=false,shortcut=true){let s=tool(difficulty,full);s=settle(s,QUARRY_GROUPS.rescue,point('quarry-rescue'));s=interact(s,'quarry-rescue');return shortcut?interact(s,'quarry-shortcut'):s;}
function anchors(difficulty='normal',full=false,shortcut=true){let s=rescue(difficulty,full,shortcut);s=settle(s,QUARRY_GROUPS.winch,point('quarry-winch'));s=interact(s,'quarry-anchor-a');return interact(s,'quarry-anchor-b');}
function winch(difficulty='normal',full=false,shortcut=true){return interact(anchors(difficulty,full,shortcut),'quarry-winch');}
function finished(difficulty='normal',full=false,shortcut=true){let s=winch(difficulty,full,shortcut);s=travel(s,shortcut?'quarry-town-lift':'quarry-town-return');return run(s,quest(s,'reportQuarryQuest')).state;}
function rejected(s,c,code){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locked={request:async(_key,_options,fn)=>fn()};

test('authored quarry adds 12 unique adept foes, four one-time rewards and no replacement old encounters',()=>{
 const r=QUARRY_REGIONS.ember_quarry;assert.equal(Object.keys(QUARRY_REGIONS).length,1);assert.equal(r.foes.length,12);
 assert.equal(getRegion('ash_road').foes.length+getRegion('sluice_upper').foes.length+getRegion('sluice_lower').foes.length,37);
 for(const key of ['foes','objects','portals']){const old=['ash_hamlet','ash_road','sluice_upper','sluice_lower'].flatMap(id=>getRegion(id)[key].map(row=>row.id));const ids=[...old,...r[key].map(row=>row.id)];assert.equal(new Set(ids).size,ids.length);}
 for(const kind of Object.keys(QUARRY_FOES)){assert.equal(r.foes.filter(f=>f.kind===kind).length,4);assert.equal(QUARRY_FOES[kind].tier,'adept');assert.ok(QUARRY_FOES[kind].patterns.length);}
 assert.equal(r.foes.reduce((total,f)=>total+QUARRY_FOES[f.kind].xp,0),480);assert.equal(r.foes.reduce((total,f)=>total+QUARRY_FOES[f.kind].gold,0),56);
 assert.equal(Object.keys(QUARRY_REWARDS).length,4);assert.equal(Object.values(QUARRY_REWARDS).reduce((total,r)=>total+r.xp,0),360);assert.equal(Object.values(QUARRY_REWARDS).reduce((total,r)=>total+r.gold,0),120);
 assert.deepEqual([...QUARRY_COMMANDS],['acceptQuarryQuest','interactQuarry','reportQuarryQuest']);assert.throws(()=>{r.foes.push({});},TypeError);
});
test('all authored quarry points and portal arrivals have hero-sized clearance and connected open paths',()=>{
 const r=QUARRY_REGIONS.ember_quarry,o={quarry_tool_found:1,quarry_rescue_complete:1},map=mapFromRegion(r,o);
 for(const p of [r.spawn,...r.foes,...r.objects,...r.portals]){assert.ok(inMap(map,p.x,p.y),p.id??'spawn');assert.ok(findPathStep(map,r.spawn,p),p.id??'spawn');}
 for(const portal of [...r.portals,...QUARRY_LINKS.ash_hamlet]){const destination=createMap(portal.to,{world:{objectives:o}});assert.ok(inMap(destination,portal.arrival.x,portal.arrival.y),portal.id);}
 const shut=mapFromRegion(r,{}),toolOpen=mapFromRegion(r,{quarry_tool_found:1});assert.ok(findPathStep(shut,r.spawn,point('quarry-tool')));assert.equal(findPathStep(shut,r.spawn,point('quarry-rescue')),null);
 assert.ok(findPathStep(toolOpen,r.spawn,point('quarry-rescue')));assert.equal(findPathStep(toolOpen,r.spawn,point('quarry-winch')),null);
});
for(const version of [1,2,3])test(`untouched schema v${version} has no quarry records and loads without implicit acceptance`,async()=>{
 const s=createState();s.version=version;delete s.actionSlots;s.options.controls.version=2;delete s.options.controls.bindings.expert1;delete s.options.controls.bindings.expert2;if(version===1)delete s.equipmentProgress;if(version<3)delete s.options.controls;
 assert.deepEqual(validateQuarryProgress(s),{ok:true});assert.equal(validateState(s).ok,true);const m=memory(),store=createStore(m);assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(m.data),c=createController(store),loaded=await c.load();assert.equal(loaded.ok,true);assert.deepEqual(m.data,bytes);assert.equal(Object.hasOwn(loaded.state.world.objectives,'quarry_accepted'),false);
});
test('acceptance requires genuine Adept promotion, alive same-life report and nearby real elder',()=>{
 const s=promoted(),fresh=createState(),c=quest(s,'acceptQuarryQuest');assert.equal(reduceQuarry(fresh,c).code,'TRAIN_FIRST');
 const apprentice=route().state;rejected(apprentice,quest(apprentice,'acceptQuarryQuest'),'ADEPT_REQUIRED');
 rejected(s,{...c,position:{x:260,y:325}},'ELDER_REQUIRED');rejected(s,{...c,life:c.life+1},'STALE_LIFE');rejected(s,{...c,vitals:{...c.vitals,hp:0}},'HERO_DOWN');
 const away=travel(accepted(),'town-quarry-entry');rejected(away,{...quest(away,'reportQuarryQuest'),position:away.world.position},'ELDER_REQUIRED');
});
test('acceptance preserves old 37 kills/receipts, equipment, keys, pools, XP and nonzero recovery',()=>{
 let s=promoted('normal',true);const recovery={...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.4,manaDelay:1.2,staminaDelay:.8,potionCooldown:3};
 s=run(s,{type:'checkpoint',...report(s,townElder),vitals:{hp:20,mana:10,stamina:15},recovery}).state;
 const n=run(s,quest(s,'acceptQuarryQuest')).state;assert.equal(n.stats.kills,37);assert.deepEqual(n.stats,s.stats);assert.deepEqual(n.character,s.character);assert.equal(n.gold,s.gold);assert.deepEqual(n.inventory,s.inventory);assert.deepEqual(n.options,s.options);assert.deepEqual(n.vitals,s.vitals);assert.deepEqual(n.recovery,recovery);assert.deepEqual(n.world.defeated,s.world.defeated);
 assert.deepEqual(n.world.claimedRewards,[...s.world.claimedRewards,'r6:q:accept']);for(const [key,value]of Object.entries(s.world.objectives))assert.equal(n.world.objectives[key],value);for(const [key,value]of Object.entries(QUARRY_PROGRESS_DEFAULTS))assert.equal(n.world.objectives[key],value);
 rejected(n,quest(n,'acceptQuarryQuest'),'ALREADY_ACCEPTED');
});
for(const difficulty of ['easy','normal','hard','serious'])for(const full of [false,true])test(`${difficulty} ${full?'full 37-kill':'minimum predecessor'} earned settlement route yields exact Q-only budget`,t=>{
 const start=promoted(difficulty,full),s=finished(difficulty,full),hard=['hard','serious'].includes(difficulty);
 assert.equal(s.stats.earnedXp-start.stats.earnedXp,hard?720:840);assert.equal(s.gold-start.gold,176);assert.equal(s.stats.earnedGold-start.stats.earnedGold,176);assert.equal(s.stats.spentGold,start.stats.spentGold);assert.equal(s.stats.kills-start.stats.kills,12);
 assert.equal(s.character.tier,'adept');assert.equal(s.character.level,full&&!hard?8:7);assert.equal(s.world.objectives.quarry_reported,1);
 for(const [key,amount]of Object.entries({iron:4,wood:2,thread:2}))assert.equal((s.inventory.materials[key]??0)-(start.inventory.materials[key]??0),amount);assert.equal(s.inventory.consumables.health_potion-start.inventory.consumables.health_potion,1);
 assert.deepEqual(s.world.defeated.ash_road,start.world.defeated.ash_road);assert.deepEqual(s.world.defeated.sluice_upper,start.world.defeated.sluice_upper);assert.deepEqual(s.world.defeated.sluice_lower,start.world.defeated.sluice_lower);
 for(const old of start.world.claimedRewards)assert.ok(s.world.claimedRewards.includes(old));assert.equal(s.world.claimedRewards.filter(id=>id.startsWith('r6:q:')).length,8);
 t.diagnostic(JSON.stringify({fixture:'real runtime settlement; scripted positions/kills; not AI play',difficulty,full,kills:s.stats.kills,earnedXp:s.stats.earnedXp,level:s.character.level,gold:s.gold}));
});
test('actual entry and shortcut portals enforce promotion/acceptance/milestones independently',()=>{
 const s=promoted();assert.equal(quarryPortalAllowed(s,QUARRY_LINKS.ash_hamlet[0]).code,'QUEST_REQUIRED');
 const a=accepted();assert.equal(quarryPortalAllowed(a,QUARRY_LINKS.ash_hamlet[0]).ok,true);assert.equal(quarryPortalAllowed(a,QUARRY_LINKS.ash_hamlet[1]).code,'SHORTCUT_REQUIRED');
 rejected(a,{type:'travel',portalId:'town-quarry-lift',to:'ember_quarry',...report(a,QUARRY_LINKS.ash_hamlet[1])},'SHORTCUT_REQUIRED');
 const r=rescue();assert.equal(r.world.objectives.quarry_winch_repaired,0);assert.equal(quarryPortalAllowed(r,QUARRY_LINKS.ash_hamlet[1]).ok,true);let returned=travel(r,'quarry-town-lift');returned=travel(returned,'town-quarry-lift');assert.equal(returned.world.region,'ember_quarry');assert.deepEqual(returned.world.defeated,r.world.defeated);
 assert.equal(quarryPortalAllowed(r,{gate:'invented'}).code,'UNKNOWN_GATE');assert.equal(quarryPortalAllowed(r,{}).ok,true);
});
test('all three guard groups and both free anchors are enforced by actual runtime commands',()=>{
 let s=enter();rejected(s,at(s,'quarry-tool'),'ENTRY_GUARDS_ALIVE');s=settle(s,QUARRY_GROUPS.entry.slice(0,3));rejected(s,at(s,'quarry-tool'),'ENTRY_GUARDS_ALIVE');
 s=settle(s,QUARRY_GROUPS.entry.slice(3));s=interact(s,'quarry-tool');rejected(s,at(s,'quarry-rescue'),'RESCUE_GUARDS_ALIVE');rejected(s,at(s,'quarry-shortcut'),'RESCUE_REQUIRED');
 s=rescue();rejected(s,at(s,'quarry-anchor-a'),'WINCH_GUARDS_ALIVE');rejected(s,at(s,'quarry-winch'),'WINCH_GUARDS_ALIVE');s=settle(s,QUARRY_GROUPS.winch,point('quarry-winch'));rejected(s,at(s,'quarry-winch'),'ANCHORS_REQUIRED');
 s=interact(s,'quarry-anchor-b');rejected(s,at(s,'quarry-winch'),'ANCHORS_REQUIRED');s=interact(s,'quarry-anchor-a');assert.equal(interact(s,'quarry-winch').world.objectives.quarry_winch_repaired,1);
});
test('locked future encounter reports cannot mint XP or force doors',()=>{
 const s=enter();for(const group of ['rescue','winch'])rejected(s,{type:'settleCombat',defeated:[QUARRY_GROUPS[group][0]],...report(s)},'ENCOUNTER_LOCKED');
 const t=tool();rejected(t,{type:'settleCombat',defeated:[QUARRY_GROUPS.winch[0]],...report(t)},'ENCOUNTER_LOCKED');
});
test('all rewards/tools are once-only and unspent-resource path never requires an optional shortcut',()=>{
 let s=winch('normal',false,false);assert.equal(s.world.objectives.quarry_shortcut_open,0);assert.equal(s.world.claimedRewards.includes('r6:q:shortcut'),false);
 for(const id of ['quarry-tool','quarry-rescue','quarry-winch'])rejected(s,at(s,id),'ALREADY_CLAIMED');for(const id of ['quarry-anchor-a','quarry-anchor-b'])rejected(s,at(s,id),'ALREADY_OPEN');
 const before=copy(s);s=settle(s,QUARRY_REGIONS.ember_quarry.foes.map(f=>f.id));assert.equal(s.stats.earnedXp,before.stats.earnedXp);assert.equal(s.gold,before.gold);assert.deepEqual(s.inventory,before.inventory);
 s=travel(s,'quarry-town-return');s=run(s,quest(s,'reportQuarryQuest')).state;rejected(s,quest(s,'reportQuarryQuest'),'ALREADY_CLAIMED');assert.equal(s.world.objectives.quarry_reported,1);
});
test('empty materials and zero gold do not block the free two-anchor path (economy stress fixture)',()=>{
 let s=rescue();s=copy(s);s.inventory.materials={};s.stats.spentGold+=s.gold;s.gold=0;assert.equal(validateState(s).ok,true);
 s=settle(s,QUARRY_GROUPS.winch,point('quarry-winch'));const gold=s.gold;s=interact(s,'quarry-anchor-a');s=interact(s,'quarry-anchor-b');assert.equal(s.gold,gold);assert.deepEqual(s.inventory.materials,{});s=interact(s,'quarry-winch');assert.equal(s.gold,gold+40);assert.deepEqual(s.inventory.materials,{iron:4,wood:2,thread:2});
});
test('actual wall/corner LOS rejects an otherwise near legal rescue interaction',()=>{
 const s=tool(),position={x:596,y:372},target=point('quarry-rescue'),map=createMap('ember_quarry',s);assert.equal(inMap(map,position.x,position.y),true);assert.equal(near(position,target),true);assert.equal(lineOfSight(map,position,target),false);
 rejected(s,{...at(s,'quarry-rescue'),position},'WALL_BLOCKED');
});
test('wrong region, distant target, illegal coordinates and out-of-range resources reject atomically',()=>{
 const s=enter();rejected(s,{...at(s,'quarry-tool'),position:s.world.position},'OBJECT_REQUIRED');rejected(s,{...at(s,'quarry-tool'),position:{x:0,y:0}},'INVALID_REPORT');rejected(s,{...at(s,'quarry-tool'),vitals:{...s.vitals,mana:9999}},'INVALID_REPORT');rejected(s,{...at(s,'quarry-tool'),life:10},'STALE_LIFE');
 const a=accepted();rejected(a,{type:'interactQuarry',objectId:'quarry-tool',...report(a,townElder)},'UNKNOWN_OBJECT');
});
test('strict bounded commands reject arbitrary value/rewards/prototypes/accessors/cycles and bad recovery',()=>{
 const s=enter(),c=at(s,'quarry-tool');for(const extra of [{value:1},{xp:1000},{gold:1000},{flags:{quarry_reported:1}},{rewardId:'r6:q:winch'},{recovery:{}}])assert.equal(reduceQuarry(s,{...c,...extra}).code,'INVALID_COMMAND');
 for(const command of [null,{},'interactQuarry',{...c,objectId:'q'.repeat(101)},{...c,position:{...c.position,z:0}},{...c,vitals:{...c.vitals,hp:NaN}}])assert.equal(reduceQuarry(s,command).code,'INVALID_COMMAND');
 let reads=0;const getter=copy(c);Object.defineProperty(getter,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(reduceQuarry(s,getter).code,'INVALID_COMMAND');assert.equal(reads,0);
 const cyclic=copy(c);cyclic.bad=cyclic;assert.equal(reduceQuarry(s,cyclic).code,'INVALID_COMMAND');const polluted=JSON.parse(JSON.stringify(c).replace('"objectId":','"__proto__":{},"objectId":'));assert.equal(reduceQuarry(s,polluted).code,'INVALID_COMMAND');
 const buff={...emptyRecovery(),regenBuff:{remaining:2,multiplier:1.25}};assert.equal(reduceQuarry(s,{...c,recovery:buff}).code,'INVALID_COMMAND');
});
test('quarry flags/receipts/tool/visits must be complete, known and bidirectionally consistent',()=>{
 const untouched=promoted();for(const edit of [s=>s.world.objectives.quarry_accepted=0,s=>s.inventory.tools.push('quarry_pick'),s=>s.inventory.tools.push('quarry_fake'),s=>s.world.claimedRewards.push('r6:q:accept'),s=>s.world.claimedRewards.push('r6:q:fake'),s=>s.world.visited.push('ember_quarry'),s=>s.world.defeated.ember_quarry=[]]){const bad=copy(untouched);edit(bad);assert.equal(validateQuarryProgress(bad).ok,false);}
 const a=accepted();for(const edit of [s=>delete s.world.objectives.quarry_anchor_a,s=>s.world.objectives.quarry_unknown=0,s=>s.world.objectives.quarry_accepted=2,s=>s.world.defeated.ember_quarry=[QUARRY_GROUPS.rescue[0]],s=>s.world.defeated.ember_quarry=['fake'],s=>s.world.claimedRewards.push('r6:q:winch'),s=>s.inventory.tools.push('quarry_pick')]){const bad=copy(a);edit(bad);assert.equal(validateQuarryProgress(bad).ok,false);}
 const f=finished();for(const id of QUARRY_RECEIPTS){const bad=copy(f);bad.world.claimedRewards=bad.world.claimedRewards.filter(x=>x!==id);assert.equal(validateQuarryProgress(bad).ok,false,id);}
 for(const key of Object.keys(QUARRY_PROGRESS_DEFAULTS)){const bad=copy(f);bad.world.objectives[key]=0;assert.equal(validateQuarryProgress(bad).ok,false,key);}
 const unvisited=copy(f);unvisited.world.visited=unvisited.world.visited.filter(id=>id!=='ember_quarry');assert.equal(validateQuarryProgress(unvisited).ok,false);
 for(const id of ['r4:report','r5:promote:adept']){const bad=copy(f);bad.world.claimedRewards=bad.world.claimedRewards.filter(x=>x!==id);assert.equal(validateQuarryProgress(bad).ok,false);}
});
test('malformed quarry saves reject without getters, accidental coercion or exceptions',()=>{
 for(const edit of [s=>s.world.visited='ember_quarry',s=>s.world.defeated={ember_quarry:{}},s=>s.world.objectives.quarry_accepted=NaN,s=>s.inventory.tools=new Array(1),s=>s.world.claimedRewards=[1],s=>s.world.objectives.quarry_accepted=undefined]){const s=createState();edit(s);assert.equal(validateQuarryProgress(s).ok,false);}
 let reads=0;const s=createState();Object.defineProperty(s,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(validateQuarryProgress(s).ok,false);assert.equal(reads,0);
});
test('receipt/gold/material overflow leaves the entire pending reward and caller immutable',()=>{
 const source=anchors();for(const edit of [s=>{s.stats.earnedGold=Number.MAX_SAFE_INTEGER;s.stats.spentGold=Number.MAX_SAFE_INTEGER-s.gold;},s=>s.inventory.materials.iron=Number.MAX_SAFE_INTEGER]){const bad=copy(source);edit(bad);rejected(bad,at(bad,'quarry-winch'),'VALUE_OVERFLOW');}
 const full=copy(source);while(full.world.claimedRewards.length<4096)full.world.claimedRewards.push('fixture:'+full.world.claimedRewards.length);rejected(full,at(full,'quarry-winch'),'RECEIPT_LIMIT');
});
test('reward level-ups preserve reported HP/MP/stamina and existing cooldowns; absent optional recovery never clears it',()=>{
 let s=enter();s=settle(s,QUARRY_GROUPS.entry);const recovery={...emptyRecovery(),cooldowns:{righteous_hammer:1.5},lock:.2,manaDelay:2,staminaDelay:1,potionCooldown:3};
 const c={...at(s,'quarry-tool'),vitals:{hp:12,mana:6,stamina:9},recovery},r=run(s,c);assert.deepEqual(r.state.vitals,c.vitals);assert.deepEqual(r.state.recovery,recovery);assert.equal(r.events.some(e=>e.type==='levelUp'),true);assert.equal(r.events.some(e=>e.type==='quarryReward'&&e.xp===60&&e.gold===0),true);
 s=settle(r.state,QUARRY_GROUPS.rescue,point('quarry-rescue'));const before=copy(s.recovery),noRecovery=at(s,'quarry-rescue');delete noRecovery.recovery;const n=run(s,noRecovery).state;assert.deepEqual(n.recovery,before);assert.deepEqual(n.vitals,s.vitals);
});
test('same-frame last guard and hero death retains kill but cannot auto-grant anchors/winch/report',()=>{
 let s=rescue('hard');s=settle(s,QUARRY_GROUPS.winch.slice(0,3),point('quarry-winch'));const xp=s.stats.earnedXp;s=settle(s,QUARRY_GROUPS.winch.slice(3),point('quarry-winch'),{vitals:{...s.vitals,hp:0}});
 assert.equal(s.stats.earnedXp,xp+37.5);assert.equal(s.world.lifeDown,true);assert.equal(s.world.objectives.quarry_winch_repaired,0);rejected(s,at(s,'quarry-anchor-a'),'HERO_DOWN');const dead=copy(s.world.defeated);s=run(s,{type:'retry'}).state;assert.deepEqual(s.world.defeated,dead);assert.equal(s.world.objectives.quarry_shortcut_open,1);s=travel(s,'town-quarry-lift');const before=s.stats.earnedXp;s=settle(s,QUARRY_GROUPS.winch);assert.equal(s.stats.earnedXp,before);s=interact(s,'quarry-anchor-a');s=interact(s,'quarry-anchor-b');s=interact(s,'quarry-winch');assert.equal(s.stats.earnedXp,before+120);
});
test('JSON reload, town rest and return retain all quarry foes defeated and cannot reset old 37',()=>{
 let s=finished('normal',true);const old=copy(s.world.defeated),xp=s.stats.earnedXp,receipts=copy(s.world.claimedRewards);s=JSON.parse(JSON.stringify(s));assert.equal(validateState(s).ok,true);s=run(s,{type:'rest',position:{x:350,y:250}}).state;s=travel(s,'town-quarry-lift');assert.deepEqual(s.world.defeated,old);assert.deepEqual(s.world.claimedRewards,receipts);assert.equal(s.stats.earnedXp,xp);assert.equal(createBattle(s).enemies.length,0);assert.equal(s.stats.kills,49);
});
test('new enemy patterns use the real existing AI telegraph handler without claiming new AI or play completion',()=>{
 const s=enter(),b=createBattle(s);b.awaitingAdvance=false;const e=b.enemies.find(e=>e.id==='quarry-guard-1');b.p.x=e.x-50;b.p.y=e.y;e.active=true;
 stepBattle(b,s.character,.02,{});assert.equal(e.state,'windup');assert.equal(e.attackSpec.id,'quarry-guard-thrust');assert.equal(e.telegraph.shapes[0].halfAngle,.45);
 e.state='idle';e.timer=0;e.telegraph=null;stepBattle(b,s.character,.02,{});assert.equal(e.attackSpec.id,'quarry-guard-sweep');assert.equal(e.telegraph.shapes[0].halfAngle,1.15);
});
test('guidance/elder/object views follow progression and clearly stop at incomplete later content',()=>{
 assert.equal(quarryGuidance(createState()),null);assert.equal(quarryElderView(createState()),null);assert.equal(quarryGuidance(route().state),null);assert.equal(quarryElderView(route().state),null);const p=promoted();assert.equal(quarryGuidance(p).id,'quarry-accept');assert.equal(quarryElderView(p).action,'accept');
 assert.equal(quarryGuidance(enter()).id,'quarry-tool');assert.equal(quarryGuidance(tool()).id,'quarry-rescue');assert.equal(quarryGuidance(rescue('normal',false,false)).id,'quarry-shortcut');assert.equal(quarryGuidance(rescue()).id,'quarry-guards');assert.equal(quarryGuidance(anchors()).id,'quarry-winch');assert.equal(quarryGuidance(winch()).id,'quarry-report');assert.equal(quarryElderView(winch()).action,'report');
 const f=finished();assert.equal(quarryGuidance(f).id,'quarry-complete');assert.match(quarryGuidance(f).detail,/아직 구현되지/);assert.equal(quarryElderView(f).action,null);
 for(const o of QUARRY_REGIONS.ember_quarry.objects){assert.equal(quarryObjectView(f,o).actions.length,0);assert.equal(quarryObjectView(accepted(),o).actions.length,1);}assert.equal(point('quarry-shortcut').hideWhenCompleted,true);
});
test('real stores preserve partial anchors and once-only tool after repeated reload',()=>{
 const m=memory(),options={profile:'qa-quarry-reload'};let store=createStore(m,options),s=rescue(),revision=0;s=settle(s,QUARRY_GROUPS.winch,point('quarry-winch'));s=interact(s,'quarry-anchor-b');
 assert.equal(store.save(s,{expectedRevision:revision++}).ok,true);store=createStore(m,options);const loaded=store.load();assert.deepEqual(loaded.state,s);s=loaded.state;assert.equal(s.world.objectives.quarry_anchor_b,1);assert.equal(s.world.objectives.quarry_anchor_a,0);s=interact(s,'quarry-anchor-a');s=interact(s,'quarry-winch');assert.equal(store.save(s,{expectedRevision:revision++}).ok,true);assert.deepEqual(createStore(m,options).load().state,s);
});
test('queued real-controller report pays once and fresh session retains exact four rewards',async()=>{
 const m=memory(),options={profile:'qa-quarry-report'},store=createSession(m,locked,options),s=travel(winch('hard'),'quarry-town-lift');assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);assert.equal((await c.load()).ok,true);const command=quest(s,'reportQuarryQuest');const [first,second]=await Promise.all([c.dispatch(command),c.dispatch(command)]);assert.equal(first.ok,true);assert.equal(second.code,'ALREADY_CLAIMED');assert.equal(c.revision(),2);const resumed=createController(createSession(m,locked,options));assert.equal((await resumed.load()).ok,true);assert.equal(resumed.snapshot().stats.earnedXp,1429.5);assert.equal(resumed.snapshot().gold,430);assert.equal((await resumed.dispatch(command)).code,'ALREADY_CLAIMED');assert.equal(resumed.revision(),2);
});
for(const afterWrite of [false,true])test(`quarry report ${afterWrite?'post':'pre'}-head failure blocks replay until load and preserves exact reward`,async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-quarry-uncertain'}),s=travel(winch('hard'),'quarry-town-lift');assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);await c.load();const command=quest(s,'reportQuarryQuest'),original=m.setItem;
 m.setItem=(key,value)=>{if(key!==store.keys.head||afterWrite)original(key,value);if(key===store.keys.head)throw new Error('fixture: head write failed');};assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.equal((await c.dispatch(command)).blocked,true);m.setItem=original;assert.equal((await c.load()).ok,true);assert.equal(c.snapshot().stats.earnedXp,afterWrite?1429.5:1339.5);const retried=await c.dispatch(command);assert.equal(retried.ok,!afterWrite);if(afterWrite)assert.equal(retried.code,'ALREADY_CLAIMED');assert.equal(c.snapshot().stats.earnedXp,1429.5);assert.equal(c.snapshot().gold,430);assert.equal(c.snapshot().world.claimedRewards.filter(id=>id==='r6:q:report').length,1);
});
test('two controller tabs cannot both commit a quarry reward from the same revision',async()=>{
 const m=memory(),options={profile:'qa-quarry-tabs'},store=createSession(m,locked,options),s=travel(winch(),'quarry-town-lift');assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();const c=quest(s,'reportQuarryQuest');assert.equal((await a.dispatch(c)).ok,true);assert.equal((await b.dispatch(c)).code,'CONFLICT');assert.deepEqual(b.snapshot(),s);await b.load();assert.equal((await b.dispatch(c)).code,'ALREADY_CLAIMED');assert.equal(b.snapshot().gold,s.gold+60);
});

test('quarry entry and independent shortcut reject stale-life travel before touching resources or progress',()=>{
 const acceptedState=accepted(),entry=QUARRY_LINKS.ash_hamlet[0];rejected(acceptedState,{type:'travel',portalId:entry.id,to:entry.to,...report(acceptedState,entry),life:acceptedState.world.life+1},'STALE_LIFE');
 const s=rescue(),portal=QUARRY_REGIONS.ember_quarry.portals.find(p=>p.id==='quarry-town-lift');rejected(s,{type:'travel',portalId:portal.id,to:portal.to,...report(s,portal),life:s.world.life+1},'STALE_LIFE');
});
test('earned healing skill and actual cast retain paid mana, cooldown and regeneration buff through quarry acceptance and entry',()=>{
 let s=promoted();for(const skillId of ['lay_on_hands','invigorating_touch'])s=run(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}}).state;
 s=run(s,{type:'checkpoint',...report(s,townElder),vitals:{...s.vitals,hp:10}}).state;const b=createBattle(s);stepBattle(b,s.character,.02,{heal:true});for(let n=0;n<30&&b.p.action;n++)stepBattle(b,s.character,.02,{});
 assert.ok(b.p.regenBuff?.remaining>0);assert.ok(b.p.cooldowns.lay_on_hands>0);assert.ok(b.p.mana<s.vitals.mana);s=run(s,{type:'checkpoint',...battleReport(b)}).state;const paid={vitals:copy(s.vitals),recovery:copy(s.recovery)};
 s=run(s,quest(s,'acceptQuarryQuest')).state;assert.deepEqual(s.vitals,paid.vitals);assert.deepEqual(s.recovery,paid.recovery);s=travel(s,'town-quarry-entry');assert.deepEqual(s.vitals,paid.vitals);assert.deepEqual(s.recovery,paid.recovery);
 const m=memory(),store=createStore(m);assert.equal(store.save(s,{expectedRevision:0}).ok,true);const resumed=createBattle(store.load().state);assert.deepEqual(resumed.p.regenBuff,paid.recovery.regenBuff);assert.equal(resumed.p.cooldowns.lay_on_hands,paid.recovery.cooldowns.lay_on_hands);assert.equal(resumed.p.mana,paid.vitals.mana);
});
test('failed winch material-reward save keeps its receipt, money and complete inventory unpublished until reload/retry',async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-quarry-winch-save'}),s=anchors();assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);await c.load();const original=m.setItem;
 m.setItem=(key,value)=>{if(key===store.keys.head)throw new Error('fixture: winch commit failure');original(key,value);};assert.equal((await c.dispatch(at(s,'quarry-winch'))).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.deepEqual(store.load().state,s);m.setItem=original;assert.equal((await c.load()).ok,true);assert.equal((await c.dispatch(at(s,'quarry-winch'))).ok,true);
 const n=c.snapshot();assert.equal(n.gold,s.gold+40);assert.equal(n.inventory.materials.iron,(s.inventory.materials.iron??0)+4);assert.equal(n.inventory.consumables.health_potion,s.inventory.consumables.health_potion+1);assert.equal(n.world.claimedRewards.filter(id=>id==='r6:q:winch').length,1);assert.equal((await c.dispatch(at(n,'quarry-winch'))).code,'ALREADY_CLAIMED');
});
