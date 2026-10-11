import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {PASS_REGIONS,PASS_FOES,PASS_LINKS,PASS_GROUPS,PASS_REWARDS,PASS_PROGRESS_DEFAULTS,PASS_RECEIPTS,PASS_TOOLS,PASS_SEQUENCE} from '../src/pass-content.js';
import {PASS_COMMANDS,reducePass,validatePassProgress,passPortalAllowed,passTierAllowed} from '../src/pass.js';
import {passObjectView,passGuidance,passElderView} from '../src/pass-presentation.js';
import {getRegion,createMap,inMap,lineOfSight,near,findPathStep} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {emptyRecovery,battleReport} from '../src/recovery.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {route,report,run,travel,settle} from './support/earned-route.mjs';
import {earnedQuarryRoute} from './support/earned-quarry-route.mjs';

// SCRIPTED SETTLEMENT FIXTURES, not AI play or ordinary-input completion.
// Predecessor route, promotion, quest actions, kill settlement and stores use
// real handlers. No XP, levels, skill ranks or progress flags are injected into
// the earned-route fixtures. Separately labelled corruption/economy fixtures
// deliberately change state to test rejection or a constrained resource pool.
const copy=x=>structuredClone(x),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const townElder={x:450,y:325},predecessors=new Map();
const quest=(s,type)=>({type,...report(s,townElder)});
function quarryFinished(difficulty='normal',full=false){
 const key=difficulty+full;if(!predecessors.has(key))predecessors.set(key,earnedQuarryRoute(difficulty,{full,shortcut:true}));
 return copy(predecessors.get(key));
}
const point=id=>PASS_REGIONS.ashwind_pass.objects.find(o=>o.id===id);
const at=(s,id)=>({type:'interactPass',objectId:id,...report(s,point(id))});
const interact=(s,id)=>run(s,at(s,id)).state;
const accepted=(difficulty='normal',full=false)=>{const s=quarryFinished(difficulty,full);return run(s,quest(s,'acceptPassQuest')).state;};
const enter=(difficulty='normal',full=false)=>travel(accepted(difficulty,full),'town-pass-entry');
function clue(difficulty='normal',full=false){let s=enter(difficulty,full);s=settle(s,PASS_GROUPS.entry);return interact(s,'pass-clue');}
function rescue(difficulty='normal',full=false,shortcut=true){let s=clue(difficulty,full);s=settle(s,PASS_GROUPS.rescue,point('pass-rescue'));s=interact(s,'pass-rescue');return shortcut?interact(s,'pass-shortcut'):s;}
function signalReady(difficulty='normal',full=false,shortcut=true){return settle(rescue(difficulty,full,shortcut),PASS_GROUPS.signal,point('pass-signal-wind'));}
function partial(step=1,difficulty='normal',full=false,shortcut=true){let s=signalReady(difficulty,full,shortcut);for(const rune of PASS_SEQUENCE.slice(0,step))s=interact(s,'pass-signal-'+rune);return s;}
const aligned=(difficulty='normal',full=false,shortcut=true)=>partial(3,difficulty,full,shortcut);
function finished(difficulty='normal',full=false,shortcut=true){let s=aligned(difficulty,full,shortcut);s=travel(s,shortcut?'pass-town-shortcut':'pass-town-return');return run(s,quest(s,'reportPassQuest')).state;}
function rejected(s,c,code){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locked={request:async(_key,_options,fn)=>fn()};

test('authored pass adds 15 unique Adept foes and exact P-only fixed budgets',()=>{
 const r=PASS_REGIONS.ashwind_pass;assert.equal(Object.keys(PASS_REGIONS).length,1);assert.equal(r.foes.length,15);
 assert.equal(getRegion('ash_road').foes.length+getRegion('sluice_upper').foes.length+getRegion('sluice_lower').foes.length+getRegion('ember_quarry').foes.length,49);
 for(const key of ['foes','objects','portals']){const old=['ash_hamlet','ash_road','sluice_upper','sluice_lower','ember_quarry'].flatMap(id=>getRegion(id)[key].map(row=>row.id));assert.equal(new Set([...old,...r[key].map(row=>row.id)]).size,old.length+r[key].length);}
 for(const [group,ids]of Object.entries(PASS_GROUPS)){
  assert.equal(ids.length,5,group);const foes=ids.map(id=>r.foes.find(f=>f.id===id));assert.equal(foes.filter(f=>f.kind==='pass_raider').length,2);assert.equal(foes.filter(f=>f.kind==='pass_ranger').length,2);assert.equal(foes.filter(f=>f.kind==='pass_elite').length,1);
  assert.equal(foes.reduce((sum,f)=>sum+PASS_FOES[f.kind].xp,0),200);assert.equal(foes.reduce((sum,f)=>sum+PASS_FOES[f.kind].gold,0),24);
 }
 for(const f of Object.values(PASS_FOES)){assert.equal(f.tier,'adept');assert.ok(f.patterns.every(p=>p.windup>=.8));}
 assert.deepEqual(Object.values(PASS_FOES).map(f=>f.hp),[60,48,90]);assert.equal(Object.values(PASS_REWARDS).reduce((sum,r)=>sum+r.xp,0),390);assert.equal(Object.values(PASS_REWARDS).reduce((sum,r)=>sum+r.gold,0),130);
 assert.deepEqual(PASS_REWARDS['r7:p:align'].materials,{iron:3,wood:3,thread:2,ember_shard:1});assert.equal(PASS_TOOLS.pass_rune_note.consumed,false);
 assert.deepEqual([...PASS_COMMANDS],['acceptPassQuest','interactPass','reportPassQuest']);assert.equal(passTierAllowed('adept'),true);assert.equal(passTierAllowed('apprentice'),false);assert.equal(passTierAllowed('invented'),false);assert.throws(()=>{r.foes.push({});},TypeError);
});
test('standalone tile fixture verifies all pass points, gated paths and both free cover branches',()=>{
 // This first geometry test aggregates no runtime regions: it tests authored
 // PASS_REGIONS directly with the shared map engine, not live travel/input.
 const r=PASS_REGIONS.ashwind_pass,open=mapFromRegion(r,{pass_clue_read:1,pass_rescue_complete:1});
 for(const p of [r.spawn,...r.foes,...r.objects,...r.portals]){assert.ok(inMap(open,p.x,p.y),p.id??'spawn');assert.ok(findPathStep(open,r.spawn,p),p.id??'spawn');}
 const shut=mapFromRegion(r,{}),clueOpen=mapFromRegion(r,{pass_clue_read:1});assert.ok(findPathStep(shut,r.spawn,point('pass-clue')));assert.equal(findPathStep(shut,r.spawn,point('pass-rescue')),null);assert.ok(findPathStep(clueOpen,r.spawn,point('pass-rescue')));assert.equal(findPathStep(clueOpen,r.spawn,point('pass-signal-wind')),null);
 assert.equal(inMap(open,656,240),false);assert.ok(findPathStep(open,{x:560,y:144},{x:560,y:336}));assert.ok(findPathStep(open,{x:752,y:144},{x:752,y:336}));assert.equal(lineOfSight(open,{x:560,y:240},{x:752,y:240}),false);
});
test('integrated portal destinations have clearance and entry requires genuine completed quarry',()=>{
 for(const p of [...PASS_REGIONS.ashwind_pass.portals,...PASS_LINKS.ash_hamlet]){assert.ok(getRegion(p.to),p.id);const map=createMap(p.to,{world:{objectives:{pass_clue_read:1,pass_rescue_complete:1}}});assert.ok(inMap(map,p.arrival.x,p.arrival.y),p.id);}
 const before=quarryFinished();assert.equal(passPortalAllowed(before,PASS_LINKS.ash_hamlet[0]).code,'QUEST_REQUIRED');const a=accepted();assert.equal(passPortalAllowed(a,PASS_LINKS.ash_hamlet[0]).ok,true);assert.equal(passPortalAllowed(a,PASS_LINKS.ash_hamlet[1]).code,'SHORTCUT_REQUIRED');assert.equal(passPortalAllowed(a,{gate:'invented'}).code,'UNKNOWN_GATE');assert.equal(passPortalAllowed(a,{}).ok,true);
});
for(const version of [1,2,3])test(`untouched schema v${version} loads without implicit pass acceptance or save writes`,async()=>{
 const s=createState();s.version=version;delete s.actionSlots;s.options.controls.version=2;delete s.options.controls.bindings.expert1;delete s.options.controls.bindings.expert2;if(version===1)delete s.equipmentProgress;if(version<3)delete s.options.controls;assert.deepEqual(validatePassProgress(s),{ok:true});assert.equal(validateState(s).ok,true);
 const m=memory(),store=createStore(m);assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(m.data),c=createController(store),loaded=await c.load();assert.equal(loaded.ok,true);assert.deepEqual(m.data,bytes);assert.equal(Object.hasOwn(loaded.state.world.objectives,'pass_accepted'),false);
});
test('pass acceptance requires real promotion, completed quarry, living same-life report and the real elder',()=>{
 const s=quarryFinished(),c=quest(s,'acceptPassQuest');assert.equal(reducePass(createState(),c).code,'TRAIN_FIRST');const apprentice=route().state;rejected(apprentice,quest(apprentice,'acceptPassQuest'),'ADEPT_REQUIRED');
 let adept=run(apprentice,{type:'promoteAdept',...report(apprentice,{x:260,y:325})}).state;rejected(adept,quest(adept,'acceptPassQuest'),'ADEPT_REQUIRED');
 rejected(s,{...c,position:{x:260,y:325}},'ELDER_REQUIRED');rejected(s,{...c,life:c.life+1},'STALE_LIFE');rejected(s,{...c,vitals:{...c.vitals,hp:0}},'HERO_DOWN');
 const away=enter();rejected(away,{...quest(away,'reportPassQuest'),position:away.world.position},'ELDER_REQUIRED');
});
test('acceptance changes only pass progress, preserving old 49 kills, equipment, keys, XP, gold and recovery',()=>{
 let s=quarryFinished('normal',true);const recovery={...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.4,manaDelay:1.2,staminaDelay:.8,potionCooldown:3};s=run(s,{type:'checkpoint',...report(s,townElder),vitals:{hp:20,mana:10,stamina:15},recovery}).state;
 const n=run(s,quest(s,'acceptPassQuest')).state;assert.equal(n.stats.kills,49);for(const field of ['stats','character','gold','inventory','options','vitals','recovery'])assert.deepEqual(n[field],s[field],field);assert.deepEqual(n.world.defeated,s.world.defeated);assert.deepEqual(n.world.claimedRewards,[...s.world.claimedRewards,'r7:p:accept']);for(const [key,value]of Object.entries(s.world.objectives))assert.equal(n.world.objectives[key],value);for(const [key,value]of Object.entries(PASS_PROGRESS_DEFAULTS))assert.equal(n.world.objectives[key],value);rejected(n,quest(n,'acceptPassQuest'),'ALREADY_ACCEPTED');
});
for(const difficulty of ['easy','normal','hard','serious'])for(const full of [false,true])test(`${difficulty} ${full?'full 49-kill':'minimum earned predecessor'} settlement route yields exact pass budget`,t=>{
 const start=quarryFinished(difficulty,full),s=finished(difficulty,full),hard=['hard','serious'].includes(difficulty);assert.equal(s.stats.earnedXp-start.stats.earnedXp,hard?840:990);assert.equal(s.gold-start.gold,202);assert.equal(s.stats.earnedGold-start.stats.earnedGold,202);assert.equal(s.stats.spentGold,start.stats.spentGold);assert.equal(s.stats.kills-start.stats.kills,15);assert.equal(s.character.tier,'adept');assert.equal(s.world.objectives.pass_reported,1);
 for(const [key,amount]of Object.entries({iron:3,wood:3,thread:2,ember_shard:1}))assert.equal((s.inventory.materials[key]??0)-(start.inventory.materials[key]??0),amount);assert.equal(s.inventory.consumables.health_potion-start.inventory.consumables.health_potion,1);
 for(const [region,dead]of Object.entries(start.world.defeated))assert.deepEqual(s.world.defeated[region],dead);for(const id of start.world.claimedRewards)assert.ok(s.world.claimedRewards.includes(id));for(const tool of start.inventory.tools)assert.ok(s.inventory.tools.includes(tool));assert.equal(s.world.claimedRewards.filter(id=>id.startsWith('r7:p:')).length,6);
 const expected=full?(hard?2475.125:2855.5):(hard?2269.5:2621);assert.equal(s.stats.earnedXp,expected);t.diagnostic(JSON.stringify({fixture:'real runtime settlement; scripted positions/kills; not AI play',difficulty,full,kills:s.stats.kills,earnedXp:s.stats.earnedXp,level:s.character.level,gold:s.gold}));
});
test('three distinct five-foe guards enforce clue, rescue and signal order',()=>{
 let s=enter();rejected(s,at(s,'pass-clue'),'ENTRY_GUARDS_ALIVE');s=settle(s,PASS_GROUPS.entry.slice(0,4));rejected(s,at(s,'pass-clue'),'ENTRY_GUARDS_ALIVE');s=settle(s,PASS_GROUPS.entry.slice(4));s=interact(s,'pass-clue');rejected(s,at(s,'pass-rescue'),'RESCUE_GUARDS_ALIVE');rejected(s,at(s,'pass-shortcut'),'RESCUE_REQUIRED');
 s=rescue();rejected(s,at(s,'pass-signal-wind'),'SIGNAL_GUARDS_ALIVE');s=settle(s,PASS_GROUPS.signal.slice(0,4));rejected(s,at(s,'pass-signal-wind'),'SIGNAL_GUARDS_ALIVE');s=settle(s,PASS_GROUPS.signal.slice(4));assert.equal(interact(s,'pass-signal-wind').world.objectives.pass_signal_step,1);
});
test('locked future encounters reject rather than mint XP or bypass map doors',()=>{
 const s=enter();for(const group of ['rescue','signal'])rejected(s,{type:'settleCombat',defeated:[PASS_GROUPS[group][0]],...report(s)},'ENCOUNTER_LOCKED');const c=clue();rejected(c,{type:'settleCombat',defeated:[PASS_GROUPS.signal[0]],...report(c)},'ENCOUNTER_LOCKED');
});
test('remote clue can be reread indefinitely without duplicate rewards or tools',()=>{
 let s=clue();const before=copy(s);for(let i=0;i<3;i++){const r=run(s,at(s,'pass-clue'));assert.ok(r.events.some(e=>e.type==='passClueRead'));assert.equal(r.events.some(e=>e.type==='passReward'),false);s=r.state;}for(const field of ['stats','character','gold','inventory','vitals','recovery'])assert.deepEqual(s[field],before[field]);assert.deepEqual(s.world.claimedRewards,before.world.claimedRewards);assert.equal(s.inventory.tools.filter(id=>id==='pass_rune_note').length,1);
});
test('wrong sequence resets only bounded puzzle progress and never removes permanent receipts',()=>{
 for(const [step,rune]of [[0,'ember'],[1,'wind'],[1,'stone'],[2,'ember']]){
  const s=partial(step),before=copy(s),r=run(s,at(s,'pass-signal-'+rune));assert.equal(r.state.world.objectives.pass_signal_step,0);assert.equal(r.state.world.objectives.pass_signal_aligned,0);assert.ok(r.events.some(e=>e.type==='passSignalReset'&&e.step===0&&e.expectedRune==='wind'));assert.equal(r.events.some(e=>e.type==='passReward'),false);
  for(const field of ['stats','character','gold','inventory','vitals','recovery'])assert.deepEqual(r.state[field],before[field]);assert.deepEqual(r.state.world.claimedRewards,before.world.claimedRewards);assert.deepEqual(r.state.world.defeated,before.world.defeated);
  let n=r.state;for(const good of PASS_SEQUENCE)n=interact(n,'pass-signal-'+good);assert.equal(n.world.objectives.pass_signal_aligned,1);assert.equal(n.stats.earnedXp,before.stats.earnedXp+130);
 }
});
test('shortcut is independently free immediately after rescue and before signal combat',()=>{
 const s=rescue('normal',false,false),before=copy(s),n=interact(s,'pass-shortcut');assert.equal(n.world.objectives.pass_signal_aligned,0);assert.equal(n.world.objectives.pass_signal_step,0);assert.ok(!PASS_GROUPS.signal.some(id=>n.world.defeated.ashwind_pass.includes(id)));for(const field of ['stats','character','gold','inventory','vitals','recovery'])assert.deepEqual(n[field],before[field]);
 const returned=travel(travel(n,'pass-town-shortcut'),'town-pass-shortcut');assert.equal(returned.world.region,'ashwind_pass');assert.deepEqual(returned.world.defeated,n.world.defeated);assert.equal(passPortalAllowed(returned,PASS_LINKS.ash_hamlet[1]).ok,true);rejected(returned,at(returned,'pass-shortcut'),'ALREADY_OPEN');
});
test('all permanent rewards and 15 kills are once-only; optional shortcut is never a report prerequisite',()=>{
 let s=aligned('normal',false,false);assert.equal(s.world.objectives.pass_shortcut_open,0);for(const id of ['pass-rescue',...PASS_SEQUENCE.map(r=>'pass-signal-'+r)])rejected(s,at(s,id),'ALREADY_CLAIMED');const before=copy(s);s=settle(s,PASS_REGIONS.ashwind_pass.foes.map(f=>f.id));assert.equal(s.stats.earnedXp,before.stats.earnedXp);assert.equal(s.gold,before.gold);assert.deepEqual(s.inventory,before.inventory);s=travel(s,'pass-town-return');s=run(s,quest(s,'reportPassQuest')).state;rejected(s,quest(s,'reportPassQuest'),'ALREADY_CLAIMED');assert.equal(s.world.objectives.pass_reported,1);
});
test('zero gold and empty materials cannot block signal alignment (economy stress fixture)',()=>{
 let s=signalReady();s=copy(s);s.inventory.materials={};s.stats.spentGold+=s.gold;s.gold=0;assert.equal(validateState(s).ok,true);for(const rune of ['wind','ember'])s=interact(s,'pass-signal-'+rune);assert.equal(s.gold,0);assert.deepEqual(s.inventory.materials,{});s=interact(s,'pass-signal-stone');assert.equal(s.gold,40);assert.deepEqual(s.inventory.materials,{iron:3,wood:3,thread:2,ember_shard:1});
});
test('wrong region, far target, illegal coordinates, stale life and overfull pools reject immutably',()=>{
 const s=enter();rejected(s,{...at(s,'pass-clue'),position:s.world.position},'OBJECT_REQUIRED');rejected(s,{...at(s,'pass-clue'),position:{x:0,y:0}},'INVALID_REPORT');rejected(s,{...at(s,'pass-clue'),vitals:{...s.vitals,mana:9999}},'INVALID_REPORT');rejected(s,{...at(s,'pass-clue'),life:s.world.life+1},'STALE_LIFE');const a=accepted();rejected(a,{type:'interactPass',objectId:'pass-clue',...report(a,townElder)},'UNKNOWN_OBJECT');
});
test('strict domain commands reject injected values/rewards/prototypes/accessors/cycles and invalid recovery',()=>{
 const s=enter(),c=at(s,'pass-clue');for(const extra of [{value:1},{xp:1000},{gold:1000},{flags:{pass_reported:1}},{rewardId:'r7:p:align'},{recovery:{}}])assert.equal(reducePass(s,{...c,...extra}).code,'INVALID_COMMAND');
 for(const command of [null,{},'interactPass',{...c,objectId:'p'.repeat(101)},{...c,position:{...c.position,z:0}},{...c,vitals:{...c.vitals,hp:NaN}}])assert.equal(reducePass(s,command).code,'INVALID_COMMAND');let reads=0;const getter=copy(c);Object.defineProperty(getter,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(reducePass(s,getter).code,'INVALID_COMMAND');assert.equal(reads,0);const cycle=copy(c);cycle.bad=cycle;assert.equal(reducePass(s,cycle).code,'INVALID_COMMAND');const polluted=JSON.parse(JSON.stringify(c).replace('"objectId":','"__proto__":{},"objectId":'));assert.equal(reducePass(s,polluted).code,'INVALID_COMMAND');const buff={...emptyRecovery(),regenBuff:{remaining:2,multiplier:1.25}};assert.equal(reducePass(s,{...c,recovery:buff}).code,'INVALID_COMMAND');
});
test('pass flags, exact receipts, tools and visits reject forged, partial and dangling records',()=>{
 const untouched=quarryFinished();for(const edit of [s=>s.world.objectives.pass_accepted=0,s=>s.inventory.tools.push('pass_rune_note'),s=>s.inventory.tools.push('pass_fake'),s=>s.world.claimedRewards.push('r7:p:accept'),s=>s.world.claimedRewards.push('r7:p:fake'),s=>s.world.claimedRewards.push('r7:p:signal-wind'),s=>s.world.visited.push('ashwind_pass'),s=>s.world.defeated.ashwind_pass=[]]){const bad=copy(untouched);edit(bad);assert.equal(validatePassProgress(bad).ok,false);}
 const a=accepted();for(const edit of [s=>delete s.world.objectives.pass_signal_step,s=>s.world.objectives.pass_unknown=0,s=>s.world.defeated.ashwind_pass=[],s=>s.world.objectives.pass_accepted=2,s=>s.world.defeated.ashwind_pass=[PASS_GROUPS.rescue[0]],s=>s.world.defeated.ashwind_pass=['fake'],s=>s.world.claimedRewards.push('r7:p:align'),s=>s.inventory.tools.push('pass_rune_note')]){const bad=copy(a);edit(bad);assert.equal(validatePassProgress(bad).ok,false);}
 const f=finished();for(const id of PASS_RECEIPTS){const bad=copy(f);bad.world.claimedRewards=bad.world.claimedRewards.filter(x=>x!==id);assert.equal(validatePassProgress(bad).ok,false,id);}for(const key of Object.keys(PASS_PROGRESS_DEFAULTS)){const bad=copy(f);bad.world.objectives[key]=0;assert.equal(validatePassProgress(bad).ok,false,key);}const unvisited=copy(f);unvisited.world.visited=unvisited.world.visited.filter(id=>id!=='ashwind_pass');assert.equal(validatePassProgress(unvisited).ok,false);
 for(const id of ['r4:report','r5:promote:adept','r6:q:report']){const bad=copy(f);bad.world.claimedRewards=bad.world.claimedRewards.filter(x=>x!==id);assert.equal(validatePassProgress(bad).ok,false);}const badPredecessor=copy(f);badPredecessor.world.objectives.quarry_anchor_a=0;assert.equal(validatePassProgress(badPredecessor).ok,false);
});
test('bounded partial steps require clue, rescue and all signal foes; final step requires matching award',()=>{
 for(const step of [-1,1.5,4,Infinity]){const s=partial(1);s.world.objectives.pass_signal_step=step;assert.equal(validatePassProgress(s).ok,false);}const noSignal=accepted();noSignal.world.objectives.pass_signal_step=1;assert.equal(validatePassProgress(noSignal).ok,false);const p=partial(2);p.world.objectives.pass_signal_step=3;assert.equal(validatePassProgress(p).ok,false);const a=aligned();a.world.objectives.pass_signal_step=2;assert.equal(validatePassProgress(a).ok,false);
});
test('malformed saves reject without getter evaluation, coercion or exceptions',()=>{
 for(const edit of [s=>s.world.visited='ashwind_pass',s=>s.world.defeated={ashwind_pass:{}},s=>s.world.objectives.pass_accepted=NaN,s=>s.inventory.tools=new Array(1),s=>s.world.claimedRewards=[1],s=>s.world.objectives.pass_accepted=undefined]){const s=createState();edit(s);assert.equal(validatePassProgress(s).ok,false);}let reads=0;const s=createState();Object.defineProperty(s,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(validatePassProgress(s).ok,false);assert.equal(reads,0);
});
test('receipt/gold/material overflow aborts the final rune and entire reward without mutation',()=>{
 const source=partial(2);for(const edit of [s=>{s.stats.earnedGold=Number.MAX_SAFE_INTEGER;s.stats.spentGold=Number.MAX_SAFE_INTEGER-s.gold;},s=>s.inventory.materials.ember_shard=Number.MAX_SAFE_INTEGER,s=>s.inventory.consumables.health_potion=Number.MAX_SAFE_INTEGER]){const bad=copy(source);edit(bad);rejected(bad,at(bad,'pass-signal-stone'),'VALUE_OVERFLOW');}
 const full=copy(source);while(full.world.claimedRewards.length<4096)full.world.claimedRewards.push('fixture:'+full.world.claimedRewards.length);rejected(full,at(full,'pass-signal-stone'),'RECEIPT_LIMIT');assert.equal(full.world.objectives.pass_signal_step,2);
});
test('quest rewards preserve reported resources and nonzero recovery, including absent optional recovery',()=>{
 let s=enter();s=settle(s,PASS_GROUPS.entry);const recovery={...emptyRecovery(),cooldowns:{righteous_hammer:1.5},lock:.2,manaDelay:2,staminaDelay:1,potionCooldown:3};const c={...at(s,'pass-clue'),vitals:{hp:12,mana:6,stamina:9},recovery},r=run(s,c);assert.deepEqual(r.state.vitals,c.vitals);assert.deepEqual(r.state.recovery,recovery);assert.ok(r.events.some(e=>e.type==='passReward'&&e.xp===80&&e.gold===10));
 s=settle(r.state,PASS_GROUPS.rescue,point('pass-rescue'));const before=copy(s.recovery),noRecovery=at(s,'pass-rescue');delete noRecovery.recovery;const n=run(s,noRecovery).state;assert.deepEqual(n.recovery,before);assert.deepEqual(n.vitals,s.vitals);
});
for(const step of [1,2])test(`real stores preserve partial signal ${step}/3 after JSON reload, town return and death`,()=>{
 const m=memory(),options={profile:'qa-pass-partial-'+step};let store=createStore(m,options),s=partial(step),revision=0;const receipts=copy(s.world.claimedRewards),dead=copy(s.world.defeated),keys=copy(s.inventory.tools);
 assert.equal(store.save(s,{expectedRevision:revision++}).ok,true);store=createStore(m,options);s=store.load().state;assert.equal(s.world.objectives.pass_signal_step,step);assert.deepEqual(s.world.claimedRewards,receipts);s=travel(s,'pass-town-shortcut');s=run(s,{type:'rest',position:{x:350,y:250}}).state;s=travel(s,'town-pass-shortcut');assert.equal(s.world.objectives.pass_signal_step,step);
 s=settle(s,[],s.world.position,{vitals:{...s.vitals,hp:0}});assert.equal(s.world.lifeDown,true);rejected(s,at(s,'pass-signal-'+PASS_SEQUENCE[step]),'HERO_DOWN');assert.equal(store.save(s,{expectedRevision:revision++}).ok,true);s=createStore(m,options).load().state;s=run(s,{type:'retry'}).state;s=travel(s,'town-pass-shortcut');assert.equal(s.world.objectives.pass_signal_step,step);assert.deepEqual(s.world.defeated,dead);assert.deepEqual(s.world.claimedRewards,receipts);assert.deepEqual(s.inventory.tools,keys);
 for(const rune of PASS_SEQUENCE.slice(step))s=interact(s,'pass-signal-'+rune);assert.equal(s.world.objectives.pass_signal_aligned,1);assert.equal(store.save(s,{expectedRevision:revision++}).ok,true);assert.deepEqual(createStore(m,options).load().state,s);
});
test('same-frame last guard and hero death preserves kill without auto-align or report',()=>{
 let s=rescue('hard');s=settle(s,PASS_GROUPS.signal.slice(0,4),point('pass-signal-wind'));const xp=s.stats.earnedXp;s=settle(s,PASS_GROUPS.signal.slice(4),point('pass-signal-wind'),{vitals:{...s.vitals,hp:0}});assert.equal(s.stats.earnedXp,xp+37.5);assert.equal(s.world.lifeDown,true);assert.equal(s.world.objectives.pass_signal_step,0);rejected(s,at(s,'pass-signal-wind'),'HERO_DOWN');const dead=copy(s.world.defeated);s=run(s,{type:'retry'}).state;assert.deepEqual(s.world.defeated,dead);s=travel(s,'town-pass-shortcut');const before=s.stats.earnedXp;s=settle(s,PASS_GROUPS.signal);assert.equal(s.stats.earnedXp,before);for(const rune of PASS_SEQUENCE)s=interact(s,'pass-signal-'+rune);assert.equal(s.stats.earnedXp,before+130);
});
test('finished reload and return never reset all 64 unique foes or replay rewards',()=>{
 let s=finished('normal',true);const dead=copy(s.world.defeated),xp=s.stats.earnedXp,receipts=copy(s.world.claimedRewards);s=JSON.parse(JSON.stringify(s));assert.equal(validateState(s).ok,true);s=run(s,{type:'rest',position:{x:350,y:250}}).state;s=travel(s,'town-pass-shortcut');assert.deepEqual(s.world.defeated,dead);assert.deepEqual(s.world.claimedRewards,receipts);assert.equal(s.stats.earnedXp,xp);assert.equal(createBattle(s).enemies.length,0);assert.equal(s.stats.kills,64);
});
test('elite real AI alternates readable circle/cone tells rather than increasing HP for duration',()=>{
 const s=enter(),b=createBattle(s);b.awaitingAdvance=false;const e=b.enemies.find(e=>e.id==='pass-elite-1');b.p.x=e.x-50;b.p.y=e.y;e.active=true;stepBattle(b,s.character,.02,{});assert.equal(e.state,'windup');assert.equal(e.attackSpec.id,'pass-elite-ring');assert.equal(e.telegraph.shapes[0].type,'circle');assert.equal(e.telegraph.shapes[0].r,84);assert.equal(e.windupDuration,1.15);const origin=copy(e.telegraph.shapes[0]);b.p.x-=20;stepBattle(b,s.character,.02,{});assert.equal(e.telegraph.shapes[0].x,origin.x);assert.equal(e.telegraph.shapes[0].y,origin.y);
 e.state='idle';e.timer=0;e.telegraph=null;stepBattle(b,s.character,.02,{});assert.equal(e.attackSpec.id,'pass-elite-sweep');assert.equal(e.telegraph.shapes[0].type,'cone');assert.equal(e.telegraph.shapes[0].halfAngle,.75);assert.equal(e.windupDuration,1);
});
test('guidance and inspect views always expose rune order and honest later-content boundary',()=>{
 assert.equal(passGuidance(createState()),null);assert.equal(passElderView(createState()),null);assert.equal(passGuidance(route().state),null);const q=quarryFinished();assert.equal(passGuidance(q).id,'pass-accept');assert.equal(passElderView(q).action,'accept');assert.equal(passGuidance(enter()).id,'pass-clue');assert.equal(passGuidance(clue()).id,'pass-rescue');assert.equal(passGuidance(rescue('normal',false,false)).id,'pass-shortcut');assert.equal(passGuidance(rescue()).id,'pass-guards');assert.equal(passGuidance(partial(1)).id,'pass-signals');assert.match(passGuidance(partial(1)).detail,/1\/3.*불꽃/);assert.equal(passGuidance(aligned()).id,'pass-report');assert.equal(passElderView(aligned()).action,'report');const f=finished();assert.equal(passGuidance(f).id,'pass-complete');assert.match(passGuidance(f).detail,/아직 구현되지/);assert.equal(passElderView(f).action,null);
 for(const object of PASS_REGIONS.ashwind_pass.objects){const v=passObjectView(f,object);assert.equal(v.actions.length,object.actionKind==='clue'?1:0);if(['clue','signal'].includes(object.actionKind))assert.match(v.detail,/바람 → 불꽃 → 돌/);}assert.equal(point('pass-shortcut').hideWhenCompleted,true);
});
test('queued controller report pays once and fresh session retains exact permanent receipts',async()=>{
 const m=memory(),options={profile:'qa-pass-report'},store=createSession(m,locked,options),s=travel(aligned('hard'),'pass-town-shortcut');assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);assert.equal((await c.load()).ok,true);const command=quest(s,'reportPassQuest');const [first,second]=await Promise.all([c.dispatch(command),c.dispatch(command)]);assert.equal(first.ok,true);assert.equal(second.code,'ALREADY_CLAIMED');assert.equal(c.revision(),2);const resumed=createController(createSession(m,locked,options));assert.equal((await resumed.load()).ok,true);assert.equal(resumed.snapshot().stats.earnedXp,2269.5);assert.equal(resumed.snapshot().gold,s.gold+60);assert.equal((await resumed.dispatch(command)).code,'ALREADY_CLAIMED');assert.equal(resumed.revision(),2);
});
for(const afterWrite of [false,true])test(`final signal ${afterWrite?'post':'pre'}-head save failure preserves all-or-nothing step, award and inventory`,async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-pass-uncertain'}),s=partial(2);assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const c=createController(store);await c.load();const command=at(s,'pass-signal-stone'),original=m.setItem;
 m.setItem=(key,value)=>{if(key!==store.keys.head||afterWrite)original(key,value);if(key===store.keys.head)throw new Error('fixture: head write failed');};assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.equal((await c.dispatch(command)).blocked,true);m.setItem=original;assert.equal((await c.load()).ok,true);assert.equal(c.snapshot().world.objectives.pass_signal_step,afterWrite?3:2);assert.equal(c.snapshot().stats.earnedXp,s.stats.earnedXp+(afterWrite?130:0));const retried=await c.dispatch(command);assert.equal(retried.ok,!afterWrite);if(afterWrite)assert.equal(retried.code,'ALREADY_CLAIMED');const n=c.snapshot();assert.equal(n.stats.earnedXp,s.stats.earnedXp+130);assert.equal(n.gold,s.gold+40);assert.equal(n.inventory.materials.ember_shard,(s.inventory.materials.ember_shard??0)+1);assert.equal(n.inventory.consumables.health_potion,s.inventory.consumables.health_potion+1);assert.equal(n.world.claimedRewards.filter(id=>id==='r7:p:align').length,1);
});
test('two tabs cannot commit the same partial signal or final reward from one revision',async()=>{
 const m=memory(),options={profile:'qa-pass-tabs'},store=createSession(m,locked,options),s=partial(2);assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();const command=at(s,'pass-signal-stone');assert.equal((await a.dispatch(command)).ok,true);assert.equal((await b.dispatch(command)).code,'CONFLICT');assert.deepEqual(b.snapshot(),s);await b.load();assert.equal((await b.dispatch(command)).code,'ALREADY_CLAIMED');assert.equal(b.snapshot().gold,s.gold+40);
});
test('pass entry and independent shortcut reject stale-life travel before changing state',()=>{
 const a=accepted(),entry=PASS_LINKS.ash_hamlet[0];rejected(a,{type:'travel',portalId:entry.id,to:entry.to,...report(a,entry),life:a.world.life+1},'STALE_LIFE');const s=rescue(),portal=PASS_REGIONS.ashwind_pass.portals.find(p=>p.id==='pass-town-shortcut');rejected(s,{type:'travel',portalId:portal.id,to:portal.to,...report(s,portal),life:s.world.life+1},'STALE_LIFE');
});
test('earned healing cast retains paid mana, cooldown and regen buff through pass acceptance and entry',()=>{
 let s=quarryFinished();for(const skillId of ['lay_on_hands','invigorating_touch'])s=run(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}}).state;s=run(s,{type:'checkpoint',...report(s,townElder),vitals:{...s.vitals,hp:10}}).state;const b=createBattle(s);stepBattle(b,s.character,.02,{heal:true});for(let n=0;n<30&&b.p.action;n++)stepBattle(b,s.character,.02,{});assert.ok(b.p.regenBuff?.remaining>0);assert.ok(b.p.cooldowns.lay_on_hands>0);assert.ok(b.p.mana<s.vitals.mana);s=run(s,{type:'checkpoint',...battleReport(b)}).state;const paid={vitals:copy(s.vitals),recovery:copy(s.recovery)};s=run(s,quest(s,'acceptPassQuest')).state;assert.deepEqual(s.vitals,paid.vitals);assert.deepEqual(s.recovery,paid.recovery);s=travel(s,'town-pass-entry');assert.deepEqual(s.vitals,paid.vitals);assert.deepEqual(s.recovery,paid.recovery);const m=memory(),store=createStore(m);assert.equal(store.save(s,{expectedRevision:0}).ok,true);const resumed=createBattle(store.load().state);assert.deepEqual(resumed.p.regenBuff,paid.recovery.regenBuff);assert.equal(resumed.p.cooldowns.lay_on_hands,paid.recovery.cooldowns.lay_on_hands);assert.equal(resumed.p.mana,paid.vitals.mana);
});
test('completed Pass views state completion rather than repeating unmet prerequisites',()=>{
 const s=finished();for(const id of ['pass-rescue','pass-signal-wind','pass-shortcut']){const view=passObjectView(s,point(id));assert.equal(view.actions.length,0);assert.doesNotMatch(view.detail,/처치하세요|처치가 필요|구조하면/);}
 assert.match(passObjectView(s,point('pass-rescue')).detail,/보상은 이미/);assert.match(passObjectView(s,point('pass-signal-wind')).detail,/보고까지 마쳤/);
 const a=aligned();assert.match(passObjectView(a,point('pass-signal-stone')).detail,/에다에게 돌아가/);
});
