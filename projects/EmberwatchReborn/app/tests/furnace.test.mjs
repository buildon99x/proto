import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState,migrateState} from '../src/state.js';
import {FURNACE_REGION,FURNACE_REGIONS,FURNACE_FOES,FURNACE_GROUPS,FURNACE_LINKS,FURNACE_REWARDS,FURNACE_PROGRESS_DEFAULTS,FURNACE_RECEIPTS} from '../src/furnace-content.js';
import {FURNACE_COMMANDS,reduceFurnace,validateFurnaceProgress,furnacePortalAllowed,furnaceTierAllowed,furnaceMap} from '../src/furnace.js';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_ROUTES} from '../src/signal-content.js';
import {getRegion,createMap,inMap,lineOfSight,FOES} from '../src/world.js';
import {createBattle} from '../src/combat.js';
import {grantExperience,experienceMultiplier,xpForLevel} from '../src/progression.js';
import {deriveStats} from '../src/warrior-growth.js';
import {emptyRecovery} from '../src/recovery.js';
import {createStore,createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// SCRIPTED REAL RUNTIME HANDLERS, NOT ordinary-input/AI combat. All normal
// route XP, training, skills, flags and resources originate in real commands.
// Position/kill reports are scripted. Explicit corruption and L15 arithmetic
// boundary fixtures below are NOT earned progression evidence. No loader hook
// supplies missing production integration to these tests.
const copy=x=>structuredClone(x),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const region=FURNACE_REGIONS[FURNACE_REGION],smith={x:250,y:470},cache=new Map();
const point=id=>region.objects.find(o=>o.id===id);
const quest=(s,type)=>({type,...report(s,smith)});
const at=(s,id,choice)=>({type:'interactFurnace',objectId:id,...report(s,point(id)),...(choice===undefined?{}:{choice})});
const interact=(s,id,choice)=>run(s,at(s,id,choice)).state;
function predecessor(difficulty='normal',full=false,direction='west'){
 const key=JSON.stringify([difficulty,full,direction]);if(cache.has(key))return copy(cache.get(key));
 let s=earnedPassRoute(difficulty,{full});s=run(s,quest(s,'acceptSignalQuest')).state;s=travel(s,'town-signal-entry');
 const objects=SIGNAL_REGIONS.signal_basin.objects,p=id=>objects.find(o=>o.id===id),action=id=>{s=run(s,{type:'interactSignal',objectId:id,...report(s,p(id))}).state;};
 s=settle(s,SIGNAL_GROUPS.entry);action('signal-code');
 for(const node of SIGNAL_ROUTES[direction].order)action('signal-route-'+node);
 s=settle(s,SIGNAL_GROUPS.yard,p('signal-transmitter'));action('signal-transmitter');
 s=settle(s,SIGNAL_GROUPS.receiver,p('signal-receiver'));action('signal-receiver');
 s=travel(s,'signal-town-return');s=run(s,quest(s,'reportSignalQuest')).state;cache.set(key,copy(s));return s;
}
const accepted=(difficulty='normal',full=false,direction='west')=>{const s=predecessor(difficulty,full,direction);return run(s,quest(s,'acceptFurnaceQuest')).state;};
const enter=(difficulty='normal',full=false)=>travel(accepted(difficulty,full),'town-furnace-entry');
const coolingReady=(difficulty='normal')=>settle(enter(difficulty),FURNACE_GROUPS.cooling,point('furnace-cooling'));
function cooled(mode='cover',difficulty='normal',shortcut=false){let s=interact(coolingReady(difficulty),'furnace-cooling',mode);return shortcut?interact(s,'furnace-shortcut'):s;}
function exhausted(mode='cover',difficulty='normal',shortcut=false){let s=cooled(mode,difficulty,shortcut);s=settle(s,FURNACE_GROUPS.exhaust,point('furnace-exhaust'));return interact(s,'furnace-exhaust');}
function ignitionReady(mode='cover',difficulty='normal',shortcut=false){return settle(exhausted(mode,difficulty,shortcut),FURNACE_GROUPS.ignition,point('furnace-ignition'));}
const ignited=(mode='cover',difficulty='normal',shortcut=false)=>interact(ignitionReady(mode,difficulty,shortcut),'furnace-ignition');
const collected=(mode='cover',difficulty='normal',shortcut=false)=>interact(ignited(mode,difficulty,shortcut),'furnace-lens');
function finished(mode='cover',difficulty='normal',shortcut=false){let s=collected(mode,difficulty,shortcut);s=travel(s,shortcut?'furnace-town-shortcut':'furnace-town-return');return run(s,quest(s,'reportFurnaceQuest')).state;}
function rejected(s,c,code,{direct=false}={}){
 const before=copy(s),request=copy(c),r=(direct?reduceFurnace:reduceRuntime)(freeze(s),freeze(c));
 assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;
}
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const locked={request:async(_key,_options,fn)=>fn()};
const cumulative=c=>Array.from({length:c.level-1},(_,i)=>xpForLevel(i+1)).reduce((a,b)=>a+b,0)+c.xp;
function reload(s,profile='qa-furnace-model'){
 const m=memory(),store=createStore(m,{profile});assert.equal(store.save(s,{expectedRevision:0}).ok,true);const result=createStore(m,{profile}).load();assert.equal(result.ok,true);assert.deepEqual(result.state,s);return result.state;
}

test('F uses production world/state/campaign registration with no preview transform',()=>{
 assert.equal(getRegion(FURNACE_REGION),region);assert.equal(FOES.furnace_tender,FURNACE_FOES.furnace_tender);
 assert.deepEqual([...FURNACE_COMMANDS],['acceptFurnaceQuest','interactFurnace','reportFurnaceQuest']);
 for(const portal of FURNACE_LINKS.ash_hamlet)assert.ok(getRegion('ash_hamlet').portals.some(p=>p.id===portal.id));
 const s=enter();assert.equal(validateState(s).ok,true);assert.deepEqual(createMap(FURNACE_REGION,s),furnaceMap(s));assert.equal(createBattle(s).enemies.length,17);
});
test('untouched and migrated pre-F saves remain read-only and never gain F defaults',()=>{
 for(const s of [createState(),predecessor()]){
  const before=copy(s);assert.equal(validateFurnaceProgress(freeze(s)).ok,true);assert.deepEqual(s,before);
  assert.equal(Object.keys(migrateState(s).world.objectives).some(k=>k.startsWith('furnace_')),false);
  assert.equal(Object.keys(reload(s).world.objectives).some(k=>k.startsWith('furnace_')),false);
 }
});
test('direct F acceptance validates earned S report/cipher, either route, living life and Orin without fee',()=>{
 for(const direction of ['west','east']){
  const s=predecessor('normal',false,direction),r=reduceFurnace(s,quest(s,'acceptFurnaceQuest'));assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.state.gold,s.gold);assert.equal(r.state.stats.earnedXp,s.stats.earnedXp);assert.deepEqual(r.state.vitals,s.vitals);assert.deepEqual(r.state.recovery,s.recovery);assert.deepEqual(r.state.world.defeated,s.world.defeated);
  assert.deepEqual(Object.fromEntries(Object.keys(FURNACE_PROGRESS_DEFAULTS).map(k=>[k,r.state.world.objectives[k]])),FURNACE_PROGRESS_DEFAULTS);
  rejected(r.state,quest(r.state,'acceptFurnaceQuest'),'ALREADY_ACCEPTED',{direct:true});
 }
 const s=predecessor();rejected(s,{...quest(s,'acceptFurnaceQuest'),position:{x:450,y:325}},'BLACKSMITH_REQUIRED',{direct:true});rejected(s,{...quest(s,'acceptFurnaceQuest'),life:s.world.life+1},'STALE_LIFE',{direct:true});
 for(const edit of [n=>n.world.claimedRewards=n.world.claimedRewards.filter(id=>id!=='r8:s:report'),n=>n.inventory.tools=n.inventory.tools.filter(id=>id!=='signal_cipher'),n=>n.world.objectives.signal_reported=0]){
  const n=copy(s);edit(n);rejected(n,quest(n,'acceptFurnaceQuest'),'ADEPT_REQUIRED',{direct:true});
 }
 assert.equal(furnaceTierAllowed('adept'),true);assert.equal(furnaceTierAllowed('expert'),true);for(const tier of ['apprentice','master'])assert.equal(furnaceTierAllowed(tier),false);
});

for(const difficulty of ['easy','normal','hard','serious'])for(const full of [false,true])for(const mode of ['cover','channel'])test(`earned ${full?'full':'minimum'} ${difficulty} ${mode} route budgets every kill/objective, explicit lens/report and no tier jump`,()=>{
 const start=predecessor(difficulty,full);let s=travel(run(start,quest(start,'acceptFurnaceQuest')).state,'town-furnace-entry');
 const startXp=s.stats.earnedXp,startGold=s.stats.earnedGold,expectedStart=(difficulty==='hard'||difficulty==='serious')?(full?3435.125:3229.5):(full?3995.5:3761);
 assert.equal(startXp,expectedStart);
 for(const group of ['cooling','exhaust','ignition']){
  for(const id of FURNACE_GROUPS[group]){
   const before=copy(s),f=FURNACE_FOES[region.foes.find(f=>f.id===id).kind],expected=f.xp*experienceMultiplier(s.character.level,'adept',difficulty);
   s=settle(s,[id],point('furnace-'+group));assert.equal(s.stats.earnedXp-before.stats.earnedXp,expected,id);assert.equal(s.stats.earnedGold-before.stats.earnedGold,f.gold,id);assert.equal(cumulative(s.character),s.stats.earnedXp);
  }
  const before=copy(s),id='r9:f:'+group;s=interact(s,'furnace-'+group,group==='cooling'?mode:undefined);
  assert.equal(s.stats.earnedXp-before.stats.earnedXp,FURNACE_REWARDS[id].xp);assert.deepEqual(s.vitals,before.vitals,'objective level-up is not a refill');assert.deepEqual(s.recovery,before.recovery);
  assert.equal(s.world.objectives.furnace_lens_taken,0);assert.equal(s.world.objectives.furnace_reported,0);
 }
 assert.equal(s.inventory.tools.includes('furnace_lens'),false);const beforeLens=copy(s);s=interact(s,'furnace-lens');assert.equal(s.stats.earnedXp,beforeLens.stats.earnedXp);assert.equal(s.gold,beforeLens.gold);
 s=travel(s,'furnace-town-return');s=run(s,quest(s,'reportFurnaceQuest')).state;
 assert.equal(s.stats.earnedXp-startXp,['hard','serious'].includes(difficulty)?1080:1290);assert.equal(s.stats.earnedGold-startGold,256);assert.equal(s.stats.kills-start.stats.kills,17);
 for(const [key,amount]of Object.entries({iron:5,wood:2,thread:2,ember_shard:2}))assert.equal(s.inventory.materials[key]-(start.inventory.materials[key]??0),amount);
 assert.equal(s.inventory.consumables.health_potion-start.inventory.consumables.health_potion,1);assert.equal(s.character.tier,'adept');assert.equal(s.character.level,['hard','serious'].includes(difficulty)?13:14);
 assert.equal(s.world.objectives.furnace_shortcut_open,0);assert.equal(s.world.claimedRewards.filter(id=>id.startsWith('r9:f')).length,6);assert.equal(validateFurnaceProgress(reload(s)).ok,true);
});

test('cooling is an atomic permanent exact enum choice; opposite and duplicate choices never reward twice',()=>{
 const s=coolingReady();for(const choice of [undefined,null,0,1,'west','Cover','__proto__','constructor',{}])rejected(s,at(s,'furnace-cooling',choice),'INVALID_COMMAND');
 for(const mode of ['cover','channel']){
  const r=run(s,at(s,'furnace-cooling',mode)),n=r.state;assert.equal(n.world.objectives.furnace_mode,mode==='cover'?1:2);assert.equal(n.world.objectives.furnace_center_open,Number(mode==='channel'));
  assert.ok(r.events.some(e=>e.type==='furnaceChanged'&&e.mapChanged));assert.ok(r.events.some(e=>e.type==='furnaceModeChosen'&&e.mode===mode));
  for(const again of ['cover','channel'])rejected(reload(n),at(n,'furnace-cooling',again),'ALREADY_CLAIMED');
 }
});
test('staged fights and explicit ignition/lens/report requirements reject premature commands',()=>{
 let s=enter();rejected(s,at(s,'furnace-cooling','cover'),'COOLING_GUARDS_ALIVE');rejected(s,at(s,'furnace-shortcut'),'COOLING_REQUIRED');
 for(const group of ['exhaust','ignition'])rejected(s,{type:'settleCombat',defeated:FURNACE_GROUPS[group],...report(s)},'ENCOUNTER_LOCKED');
 s=cooled();rejected(s,at(s,'furnace-exhaust'),'EXHAUST_GUARDS_ALIVE');rejected(s,{type:'settleCombat',defeated:FURNACE_GROUPS.ignition,...report(s)},'ENCOUNTER_LOCKED');
 s=exhausted();rejected(s,at(s,'furnace-ignition'),'IGNITION_GUARDS_ALIVE');rejected(s,at(s,'furnace-lens'),'IGNITION_REQUIRED');
 let town=travel(s,'furnace-town-return');rejected(town,quest(town,'reportFurnaceQuest'),'IGNITION_REQUIRED');
 s=ignitionReady();assert.equal(s.world.objectives.furnace_ignited,0);rejected(s,at(s,'furnace-lens'),'IGNITION_REQUIRED');
 town=travel(ignited(),'furnace-town-return');rejected(town,quest(town,'reportFurnaceQuest'),'LENS_REQUIRED');
 const away=collected();rejected(away,{...quest(away,'reportFurnaceQuest'),position:{x:656,y:112}},'BLACKSMITH_REQUIRED');
});
test('early optional lift works after cooling alone in either mode and never spends/refills resources',()=>{
 for(const mode of ['cover','channel']){
  let s=cooled(mode);const before=copy(s),command={...at(s,'furnace-shortcut'),vitals:{hp:12,mana:3,stamina:5},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:2},lock:.1,manaDelay:2,staminaDelay:1,potionCooldown:3}};
  s=run(s,command).state;assert.equal(s.stats.earnedXp,before.stats.earnedXp);assert.equal(s.gold,before.gold);assert.equal(s.world.objectives.furnace_exhausted,0);assert.equal(s.world.objectives.furnace_ignited,0);
  s=travel(s,'furnace-town-shortcut');s=reload(s);s=travel(s,'town-furnace-shortcut');assert.deepEqual(s.vitals,command.vitals);assert.deepEqual(s.recovery,command.recovery);assert.equal(s.world.objectives.furnace_mode,mode==='cover'?1:2);rejected(s,at(s,'furnace-shortcut'),'ALREADY_OPEN');
 }
});
test('F portal checks enforce eligibility, acceptance, life, known gates and shortcut independently',()=>{
 const entry=FURNACE_LINKS.ash_hamlet[0],lift=FURNACE_LINKS.ash_hamlet[1];
 assert.equal(furnacePortalAllowed(createState(),entry).code,'ADEPT_REQUIRED');assert.equal(furnacePortalAllowed(predecessor(),entry).code,'QUEST_REQUIRED');assert.equal(furnacePortalAllowed(accepted(),entry).ok,true);assert.equal(furnacePortalAllowed(accepted(),lift).code,'SHORTCUT_REQUIRED');assert.equal(furnacePortalAllowed(accepted(),{gate:'furnace_unknown'}).code,'UNKNOWN_GATE');
 const dead=settle(cooled(),[],point('furnace-cooling'),{vitals:{hp:0,mana:0,stamina:0}});assert.equal(furnacePortalAllowed(dead,entry).code,'HERO_DOWN');
 for(const [s,p]of [[accepted(),entry],[cooled('channel','normal',true),region.portals[1]]])rejected(s,{type:'travel',portalId:p.id,to:p.to,...report(s,p),life:s.world.life+1},'STALE_LIFE');
});
test('all rewards and defeated IDs remain exactly once through save/reentry and repeated settlement',()=>{
 let s=finished('channel','normal',true);const xp=s.stats.earnedXp,gold=s.gold,inventory=copy(s.inventory);s=reload(s);rejected(s,quest(s,'reportFurnaceQuest'),'ALREADY_CLAIMED');s=travel(s,'town-furnace-entry');
 for(const id of ['furnace-cooling','furnace-exhaust','furnace-ignition','furnace-lens'])rejected(s,at(s,id,id==='furnace-cooling'?'cover':undefined),'ALREADY_CLAIMED');
 s=settle(s,region.foes.map(f=>f.id));assert.equal(s.stats.earnedXp,xp);assert.equal(s.gold,gold);assert.deepEqual(s.inventory,inventory);assert.equal(createBattle(s).enemies.length,0);assert.equal(s.world.claimedRewards.filter(id=>FURNACE_RECEIPTS.includes(id)).length,7);
});
for(const stage of ['partial-cooling','cooling','partial-exhaust','exhaust','partial-ignition','ignition','lens'])test(`saved ${stage} progress survives death/retry and normal reentry without reset or auto-award`,()=>{
 let s=stage==='partial-cooling'?settle(enter(),FURNACE_GROUPS.cooling.slice(0,2)):stage==='cooling'?cooled():stage==='partial-exhaust'?settle(cooled(),FURNACE_GROUPS.exhaust.slice(0,3)):stage==='exhaust'?exhausted():stage==='partial-ignition'?settle(exhausted(),FURNACE_GROUPS.ignition.slice(0,3)):stage==='ignition'?ignited():collected();
 s=reload(s);const before=copy(s);s=settle(s,[],s.world.position,{vitals:{hp:0,mana:2,stamina:4}});const expectedGold=before.gold-Math.floor(before.gold*.05);assert.equal(s.gold,expectedGold);assert.equal(s.stats.deaths,before.stats.deaths+1);s=reload(s);
 assert.deepEqual(s.world.objectives,before.world.objectives);assert.deepEqual(s.world.claimedRewards,before.world.claimedRewards);assert.deepEqual(s.world.defeated,before.world.defeated);assert.deepEqual(s.inventory,before.inventory);assert.equal(s.stats.earnedXp,before.stats.earnedXp);
 rejected(s,at(s,'furnace-cooling','cover'),'HERO_DOWN');rejected(s,{type:'settleCombat',defeated:[],...report(s)},'STALE_ENCOUNTER');
 s=run(s,{type:'retry'}).state;s=travel(s,'town-furnace-entry');assert.equal(s.gold,expectedGold);assert.equal(s.world.life,before.world.life+1);assert.deepEqual(s.world.defeated,before.world.defeated);assert.deepEqual(s.world.objectives,before.world.objectives);
 assert.equal(createBattle(s).enemies.length,17-(s.world.defeated[FURNACE_REGION]??[]).length);
});
test('last ignition foe plus hero death settles kill first, pays one fee and never auto-ignites/collects/reports',()=>{
 let s=exhausted('channel','hard');s=settle(s,FURNACE_GROUPS.ignition.slice(0,-1),point('furnace-ignition'));const before=copy(s),last=FURNACE_GROUPS.ignition.at(-1);
 s=settle(s,[last],point('furnace-ignition'),{vitals:{hp:0,mana:0,stamina:0}});assert.equal(s.stats.earnedXp,before.stats.earnedXp+45);assert.equal(s.gold,before.gold+8-Math.floor((before.gold+8)*.05));assert.equal(s.world.lifeDown,true);
 for(const key of ['furnace_ignited','furnace_lens_taken','furnace_reported'])assert.equal(s.world.objectives[key],0);
 const dead=reload(s);assert.equal(dead.stats.deaths,before.stats.deaths+1);s=travel(run(dead,{type:'retry'}).state,'town-furnace-entry');s=interact(s,'furnace-ignition');assert.equal(s.stats.earnedXp,before.stats.earnedXp+45+140);
});
test('survivors reset only transient battle HP on reentry while defeated enemies stay absent and paid hero state persists',()=>{
 let s=settle(cooled(),FURNACE_GROUPS.exhaust.slice(0,1),point('furnace-exhaust'));const c={type:'checkpoint',...report(s),vitals:{hp:18,mana:4,stamina:8},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:1.5},lock:.2,manaDelay:2,potionCooldown:3}};s=run(s,c).state;
 const battle=createBattle(s),survivor=battle.enemies.find(e=>e.id===FURNACE_GROUPS.exhaust[1]);survivor.hp=1;const after=createBattle(reload(s));assert.ok(after.enemies.find(e=>e.id===survivor.id).hp>1);assert.ok(!after.enemies.some(e=>e.id===FURNACE_GROUPS.exhaust[0]));assert.equal(after.p.hp,18);assert.equal(after.p.mana,4);assert.equal(after.p.stamina,8);
});

test('direct reducer rejects malformed/extra/forged command data without mutation or accessor execution',()=>{
 const s=coolingReady();for(const edit of [c=>c.life=-1,c=>c.life=1.5,c=>c.position.x=Infinity,c=>c.position.extra=1,c=>c.vitals.hp=-1,c=>c.vitals.hp=1e7,c=>c.objectId='',c=>c.rewardId='r9:f:ignition',c=>c.kind='ignition',c=>c.defeated=region.foes.map(f=>f.id),c=>c.recovery={cooldowns:{}}]){const c=at(s,'furnace-cooling','cover');edit(c);assert.equal(reduceFurnace(s,c).ok,false);}
 for(const id of ['furnace-exhaust','furnace-ignition','furnace-lens','furnace-shortcut'])rejected(s,at(s,id,'cover'),'INVALID_COMMAND',{direct:true});
 rejected(s,{...at(s,'furnace-cooling','cover'),objectId:'signal-code'},'INVALID_COMMAND',{direct:true});
 const unknown=at(s,'furnace-cooling','cover');delete unknown.choice;unknown.objectId='signal-code';rejected(s,unknown,'UNKNOWN_OBJECT',{direct:true});
 let reads=0;const c=at(s,'furnace-cooling','cover');Object.defineProperty(c,'injected',{enumerable:true,get(){reads++;return 1;}});assert.equal(reduceFurnace(s,c).ok,false);assert.equal(reads,0);
 rejected(s,{...at(s,'furnace-cooling','cover'),position:{x:0,y:0}},'INVALID_REPORT',{direct:true});rejected(s,{...at(s,'furnace-cooling','cover'),position:region.spawn},'OBJECT_REQUIRED',{direct:true});
 const town=accepted();rejected(town,{...at(town,'furnace-cooling','cover'),position:smith},'UNKNOWN_OBJECT',{direct:true});
});
test('closed gallery rejects a forged position in its door and blocks lens LOS from the legal work ring',()=>{
 const s=cooled(),position={x:656,y:208};assert.ok(inMap(furnaceMap(s),position.x,position.y));
 // The first legal work-ring point is beyond interaction reach. A forged
 // closer point lies in the solid exhaust door and must fail before mutation.
 const target=point('furnace-lens'),nearby={x:656,y:176};assert.equal(inMap(furnaceMap(s),nearby.x,nearby.y),false);
 assert.equal(lineOfSight(furnaceMap(s),position,target),false);rejected(s,{...at(s,'furnace-lens'),position:nearby},'INVALID_REPORT');
});
test('corrupt partial flags, mode/receipt/tool pairs, unknown F fields and future defeats fail closed',()=>{
 const cases=[s=>delete s.world.objectives.furnace_cooled,s=>s.world.objectives.furnace_future=1,s=>s.world.objectives.furnace_mode=0,s=>s.world.objectives.furnace_mode=3,s=>s.world.objectives.furnace_center_open=1,s=>s.world.claimedRewards.push('r9:f:future'),s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r9:f:cooling'),s=>s.inventory.tools.push('furnace_unknown'),s=>s.inventory.tools.push('furnace_lens'),s=>s.world.defeated[FURNACE_REGION].push(FURNACE_GROUPS.ignition[0]),s=>s.world.defeated[FURNACE_REGION].push('furnace-forged-1')];
 for(const edit of cases){const s=cooled();edit(s);assert.equal(validateFurnaceProgress(s).ok,false);}
 for(const edit of [s=>s.inventory.tools=s.inventory.tools.filter(t=>t!=='furnace_lens'),s=>s.world.objectives.furnace_lens_taken=0,s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r9:f:lens'),s=>s.world.defeated[FURNACE_REGION].pop(),s=>s.world.claimedRewards=s.world.claimedRewards.filter(id=>id!=='r8:s:report')]){const s=finished();edit(s);assert.equal(validateFurnaceProgress(s).ok,false);assert.equal(createStore(memory()).save(s,{expectedRevision:0}).ok,false);}
 const early=enter();early.world.defeated[FURNACE_REGION]=[FURNACE_GROUPS.exhaust[0]];assert.equal(validateFurnaceProgress(early).ok,false);
});
test('partial F footprints on untouched saves never silently migrate into active progress',()=>{
 for(const edit of [s=>s.world.objectives.furnace_accepted=1,s=>s.world.claimedRewards.push('r9:f:accept'),s=>s.inventory.tools.push('furnace_lens'),s=>s.world.visited.push(FURNACE_REGION),s=>s.world.defeated[FURNACE_REGION]=[]]){const s=predecessor();edit(s);assert.equal(validateFurnaceProgress(s).ok,false);}
});
test('corrupt life/resources/location/recovery/economy and unsafe state trees reject before cloning',()=>{
 const base=cooled();for(const edit of [s=>s.world.life=-1,s=>s.world.lifeDown=1,s=>s.vitals.hp=0,s=>s.world.lifeDown=true,s=>s.world.position={x:0,y:0},s=>s.world.position.extra=2,s=>s.vitals.mana=Infinity,s=>s.vitals.mana=-1,s=>s.vitals.hp=1e6,s=>s.recovery.cooldowns.righteous_hammer=61,s=>s.gold++,s=>s.stats.kills=-1,s=>s.inventory.materials.iron=-1,s=>s.world.visited=s.world.visited.filter(x=>x!==FURNACE_REGION),s=>s.world.visited=FURNACE_REGION,s=>s.inventory.tools=new Array(1),s=>s.self=s]){
  const s=copy(base);edit(s);assert.equal(validateFurnaceProgress(s).ok,false);assert.equal(reduceFurnace(s,at(s,'furnace-shortcut')).ok,false);
 }
 let reads=0;const s=copy(base);Object.defineProperty(s,'bad',{enumerable:true,get(){reads++;return 1;}});assert.equal(validateFurnaceProgress(s).ok,false);assert.equal(reads,0);
});
test('all reward overflow and receipt/tool capacity failures leave flags/choice/resources unchanged',()=>{
 for(const edit of [s=>{s.stats.earnedGold=Number.MAX_SAFE_INTEGER;s.stats.spentGold=Number.MAX_SAFE_INTEGER-s.gold;},s=>s.inventory.materials.iron=Number.MAX_SAFE_INTEGER,s=>s.inventory.consumables.health_potion=Number.MAX_SAFE_INTEGER]){
  const s=ignitionReady();edit(s);rejected(s,at(s,'furnace-ignition'),'VALUE_OVERFLOW');
 }
 for(const [base,id,choice]of [[coolingReady(),'furnace-cooling','channel'],[ignited(),'furnace-lens',undefined],[cooled(),'furnace-shortcut',undefined]]){
  while(base.world.claimedRewards.length<4096)base.world.claimedRewards.push('fixture:'+base.world.claimedRewards.length);rejected(base,at(base,id,choice),'RECEIPT_LIMIT');
 }
 const full=ignited();while(full.inventory.tools.length<100)full.inventory.tools.push('fixture-tool-'+full.inventory.tools.length);rejected(full,at(full,'furnace-lens'),'VALUE_OVERFLOW');assert.equal(full.world.objectives.furnace_lens_taken,0);
});
test('zero-gold boundary fixture permits acceptance, entry, cooling and lift without material payment',()=>{
 let s=predecessor();s.stats.spentGold+=s.gold;s.gold=0;const inventory=copy(s.inventory);s=run(s,quest(s,'acceptFurnaceQuest')).state;s=travel(s,'town-furnace-entry');assert.equal(s.gold,0);assert.deepEqual(s.inventory,inventory);
 s=settle(s,FURNACE_GROUPS.cooling);s=interact(s,'furnace-cooling','cover');assert.equal(s.gold,40);s=interact(s,'furnace-shortcut');assert.equal(s.gold,40);assert.deepEqual(s.inventory,inventory);
});
test('ignition objective preserves depleted resources/recovery even when it grants a level',()=>{
 let s=ignitionReady(),c={...at(s,'furnace-ignition'),vitals:{hp:12,mana:3,stamina:5},recovery:{...emptyRecovery(),cooldowns:{righteous_hammer:1.5},lock:.2,manaDelay:2,staminaDelay:1,potionCooldown:3}};
 const r=run(s,c);assert.equal(r.state.character.level,s.character.level+1);assert.ok(r.events.some(e=>e.type==='levelUp'));assert.deepEqual(r.state.vitals,c.vitals);assert.deepEqual(r.state.recovery,c.recovery);assert.ok(r.events.some(e=>e.type==='furnaceReward'&&e.xp===140&&e.gold===50));
 const noRecovery=at(r.state,'furnace-lens');delete noRecovery.recovery;s=run(r.state,noRecovery).state;assert.deepEqual(s.recovery,c.recovery);assert.deepEqual(s.vitals,c.vitals);
});

for(const difficulty of ['easy','normal','hard','serious'])for(const reverse of [false,true])test(`synthetic near-L15 ${difficulty} ${reverse?'reverse':'forward'} kill ordering applies lower-tier scaling at each actual settlement`,()=>{
 let s=accepted(difficulty);const bump=grantExperience(s.character,5455-cumulative(s.character));assert.equal(bump.ok,true);s.character=bump.character;s.stats.earnedXp+=bump.appliedXp;assert.equal(cumulative(s.character),5455);assert.equal(s.character.level,14);assert.equal(validateState(s).ok,true);s=travel(s,'town-furnace-entry');let crossed=false;
 for(const group of ['cooling','exhaust','ignition']){
  const ids=[...FURNACE_GROUPS[group]];if(reverse)ids.reverse();
  for(const id of ids){const before=copy(s),f=FURNACE_FOES[region.foes.find(f=>f.id===id).kind],scale=experienceMultiplier(s.character.level,'adept',difficulty),expected=f.xp*scale;s=settle(s,[id],point('furnace-'+group));assert.equal(s.stats.earnedXp-before.stats.earnedXp,expected);if(before.character.level>=15){assert.equal(scale,['hard','serious'].includes(difficulty)?.375:.5);crossed=true;}assert.equal(cumulative(s.character),s.stats.earnedXp);}
  const before=s.stats.earnedXp;s=interact(s,'furnace-'+group,group==='cooling'?'channel':undefined);assert.equal(s.stats.earnedXp-before,FURNACE_REWARDS['r9:f:'+group].xp);
 }
 assert.equal(crossed,true);assert.equal(s.character.tier,'adept');
});
test('one multi-kill frame crossing L15 scales later kills and grants one living-level refill',()=>{
 let s=enter();const bump=grantExperience(s.character,5480-cumulative(s.character));s.character=bump.character;s.stats.earnedXp+=bump.appliedXp;const before=copy(s);let expected=copy(s.character),xp=0;
 for(const id of FURNACE_GROUPS.cooling){const f=FURNACE_FOES[region.foes.find(f=>f.id===id).kind],gain=grantExperience(expected,f.xp*experienceMultiplier(expected.level,'adept','normal'));xp+=gain.appliedXp;expected=gain.character;}
 s=settle(s,FURNACE_GROUPS.cooling,point('furnace-cooling'),{vitals:{hp:1,mana:1,stamina:1}});assert.equal(s.stats.earnedXp-before.stats.earnedXp,xp);assert.deepEqual(s.character,expected);const caps=deriveStats(s.character,s).stats;assert.equal(s.vitals.hp,1+caps.hpMax*.25);assert.equal(s.vitals.mana,1+caps.manaMax*.25);assert.equal(s.vitals.stamina,1+caps.staminaMax*.25);
});

test('controller double-click and two-tab opposite cooling choices commit exactly one mode/reward',async()=>{
 const m=memory(),options={profile:'qa-furnace-modes'},store=createSession(m,locked,options),s=coolingReady();assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();
 const one=at(s,'furnace-cooling','cover'),two=at(s,'furnace-cooling','channel');const [first,duplicate]=await Promise.all([a.dispatch(one),a.dispatch(one)]);assert.equal(first.ok,true);assert.equal(duplicate.code,'ALREADY_CLAIMED');assert.equal((await b.dispatch(two)).code,'CONFLICT');assert.deepEqual(b.snapshot(),s);await b.load();assert.equal((await b.dispatch(two)).code,'ALREADY_CLAIMED');assert.equal(b.snapshot().world.objectives.furnace_mode,1);assert.equal(b.snapshot().stats.earnedXp,s.stats.earnedXp+100);assert.equal(b.snapshot().world.claimedRewards.filter(id=>id==='r9:f:cooling').length,1);
});
test('controller double report and stale competing report never duplicate the handoff reward',async()=>{
 const m=memory(),options={profile:'qa-furnace-report'},store=createSession(m,locked,options),s=travel(collected(),'furnace-town-return');await store.save(s,{expectedRevision:0});const a=createController(store),b=createController(createSession(m,locked,options));await a.load();await b.load();const c=quest(s,'reportFurnaceQuest');const [one,two]=await Promise.all([a.dispatch(c),a.dispatch(c)]);assert.equal(one.ok,true);assert.equal(two.code,'ALREADY_CLAIMED');assert.equal((await b.dispatch(c)).code,'CONFLICT');await b.load();assert.equal((await b.dispatch(c)).code,'ALREADY_CLAIMED');assert.equal(b.snapshot().gold,s.gold+60);
});
for(const stage of ['slot','pre-head','post-head'])test(`real ${stage} write failure commits cooling mode/reward all-or-nothing and blocks uncertainty`,async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-furnace-uncertain'}),s=coolingReady();await store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const command=at(s,'furnace-cooling','channel'),original=m.setItem;
 m.setItem=(key,value)=>{const fails=stage==='slot'?store.keys.slots.includes(key):key===store.keys.head;if(!fails||stage==='post-head')original(key,value);if(fails)throw new Error('fixture: write failure');};
 assert.equal((await c.dispatch(command)).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);assert.equal((await c.dispatch(command)).blocked,true);m.setItem=original;await c.load();const committed=stage==='post-head';assert.equal(c.snapshot().world.objectives.furnace_mode,committed?2:0);assert.equal(c.snapshot().world.objectives.furnace_cooled,Number(committed));const retry=await c.dispatch(command);assert.equal(retry.ok,!committed);if(committed)assert.equal(retry.code,'ALREADY_CLAIMED');assert.equal(c.snapshot().stats.earnedXp,s.stats.earnedXp+100);assert.equal(c.snapshot().gold,s.gold+10);
});
test('uncertain lens commit reconciles one tool/receipt without any new XP or gold',async()=>{
 const m=memory(),store=createSession(m,locked,{profile:'qa-furnace-lens'}),s=ignited();await store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const original=m.setItem;
 m.setItem=(key,value)=>{original(key,value);if(key===store.keys.head)throw new Error('fixture: post-head failure');};assert.equal((await c.dispatch(at(s,'furnace-lens'))).code,'COMMIT_UNCERTAIN');assert.deepEqual(c.snapshot(),s);m.setItem=original;await c.load();assert.equal((await c.dispatch(at(s,'furnace-lens'))).code,'ALREADY_CLAIMED');const n=c.snapshot();assert.equal(n.inventory.tools.filter(t=>t==='furnace_lens').length,1);assert.equal(n.world.claimedRewards.filter(t=>t==='r9:f:lens').length,1);assert.equal(n.gold,s.gold);assert.equal(n.stats.earnedXp,s.stats.earnedXp);
});
