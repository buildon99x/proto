import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {getRegion,FOES,createMap,inMap} from '../src/world.js';
import {SIGNAL_REGIONS,SIGNAL_FOES,SIGNAL_LINKS,SIGNAL_GROUPS} from '../src/signal-content.js';
import {signalTierAllowed} from '../src/signal.js';
import {createStore} from '../src/save.js';
import {createController} from '../src/controller.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {report,run,travel,settle} from './support/earned-route.mjs';

// Production modules are statically imported above. No registerHooks, source
// rewriting or replacement handlers are used by this integration suite.
// Earned paths below use SCRIPTED SETTLEMENT FIXTURES, NOT ordinary-input play.
// XP, level, skill ranks and progression flags are never assigned in them.
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const smith={x:250,y:470};
let earned;
const predecessor=()=>structuredClone(earned??=earnedPassRoute());
const accept=s=>run(s,{type:'acceptSignalQuest',...report(s,smith)}).state;
const portalCommand=(s,id)=>{const p=getRegion(s.world.region).portals.find(p=>p.id===id);return {type:'travel',to:p.to,portalId:p.id,...report(s,p)};};
const interact=(s,id)=>run(s,{type:'interactSignal',objectId:id,...report(s,getRegion('signal_basin').objects.find(o=>o.id===id))}).state;

test('production world registers exact S content and every reciprocal portal arrival',()=>{
 assert.equal(getRegion('signal_basin'),SIGNAL_REGIONS.signal_basin);
 for(const [kind,foe]of Object.entries(SIGNAL_FOES))assert.equal(FOES[kind],foe);
 const town=getRegion('ash_hamlet');
 for(const link of SIGNAL_LINKS.ash_hamlet){assert.equal(town.portals.filter(p=>p.id===link.id).length,1);assert.equal(town.portals.find(p=>p.id===link.id),link);}
 for(const p of [...SIGNAL_LINKS.ash_hamlet,...SIGNAL_REGIONS.signal_basin.portals])assert.ok(inMap(createMap(p.to),p.arrival.x,p.arrival.y),p.id);
});

for(const version of [1,2,3])test(`untouched schema v${version} loads read-only without creating S progress`,async()=>{
 const s=createState();s.version=version;delete s.actionSlots;s.options.controls.version=2;delete s.options.controls.bindings.expert1;delete s.options.controls.bindings.expert2;if(version===1)delete s.equipmentProgress;if(version<3)delete s.options.controls;
 assert.equal(validateState(s).ok,true);const m=memory(),store=createStore(m);
 assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(m.data),controller=createController(store),loaded=await controller.load();
 assert.equal(loaded.ok,true);assert.deepEqual(m.data,bytes);
 assert.equal(Object.keys(loaded.state.world.objectives).some(key=>key.startsWith('signal_')),false);
 assert.equal(loaded.state.world.claimedRewards.some(id=>id.startsWith('r8:s')),false);
 assert.equal(loaded.state.inventory.tools.includes('signal_cipher'),false);
});

test('production campaign selects S portal guards and retains paid state on round trips',()=>{
 const before=predecessor();assert.equal(reduceRuntime(before,portalCommand(before,'town-signal-entry')).code,'QUEST_REQUIRED');
 let s=accept(before);assert.equal(reduceRuntime(s,portalCommand(s,'town-signal-shortcut')).code,'SHORTCUT_REQUIRED');
 s=travel(s,'town-signal-entry');assert.equal(reduceRuntime(s,portalCommand(s,'signal-town-shortcut')).code,'SHORTCUT_REQUIRED');
 s=settle(s,SIGNAL_GROUPS.entry);s=interact(s,'signal-code');s=interact(s,'signal-shortcut');
 const snapshot=structuredClone(s);s=travel(travel(s,'signal-town-shortcut'),'town-signal-shortcut');
 for(const field of ['vitals','recovery','character','gold','inventory','stats'])assert.deepEqual(s[field],snapshot[field],field);
 for(const field of ['objectives','claimedRewards','defeated'])assert.deepEqual(s.world[field],snapshot.world[field],field);
 assert.equal(s.world.objectives.signal_route_ready,0);
 assert.equal(reduceRuntime(s,{...portalCommand(s,'signal-town-shortcut'),life:s.world.life+1}).code,'STALE_LIFE');
});

test('common validation and durable store reject unearned or partial S records before unrelated commands',()=>{
 // Explicit corruption fixtures, not earned progression evidence.
 const mutations=[s=>s.world.objectives.signal_accepted=1,s=>s.world.claimedRewards.push('r8:s:accept'),s=>s.inventory.tools.push('signal_cipher'),s=>s.world.visited.push('signal_basin'),s=>s.world.defeated.signal_basin=[]];
 for(const mutate of mutations){const bad=predecessor();mutate(bad);const snapshot=structuredClone(bad);
  assert.equal(validateState(bad).code,'INVALID_SIGNAL_STATE');
  assert.equal(reduceRuntime(bad,{type:'setOption',option:'masterVolume',value:.5}).code,'INVALID_SIGNAL_STATE');
  const m=memory();assert.equal(createStore(m).save(bad,{expectedRevision:0}).ok,false);assert.equal(m.data.size,0);assert.deepEqual(bad,snapshot);
 }
});

test('S integration preserves supported tier history and rejects forged promotions',()=>{
 const s=accept(predecessor());assert.equal(s.character.tier,'adept');assert.equal(signalTierAllowed('adept'),true);
 for(const tier of ['expert','master']){
  assert.equal(signalTierAllowed(tier),tier==='expert');
  const forged=structuredClone(s);forged.character.tier=tier;assert.equal(validateState(forged).ok,false);
  assert.equal(reduceRuntime(forged,portalCommand(forged,'town-signal-entry')).ok,false);
 }
});
