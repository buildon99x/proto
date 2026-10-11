import test from 'node:test';
import assert from 'node:assert/strict';
import {selectInteractionTarget,SHORTCUT_INTERACTIONS} from '../src/interaction-target.js';
import {getRegion,createMap,near,lineOfSight,inMap} from '../src/world.js';
import {passObjectView} from '../src/pass-presentation.js';
import {quarryObjectView} from '../src/quarry-presentation.js';
import {PASS_GROUPS} from '../src/pass-content.js';
import {QUARRY_GROUPS} from '../src/quarry-content.js';
import {reduceRuntime,validateState} from '../src/state.js';
import {emptyRecovery} from '../src/recovery.js';
import {route,report,run,travel,settle} from './support/earned-route.mjs';
import {earnedQuarryRoute} from './support/earned-quarry-route.mjs';

// SCRIPTED legal positions/kill reports, using actual reducers. No injected XP,
// levels, resources or progress flags. Not ordinary-input browser/combat play.
const copy=value=>structuredClone(value);
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const cache=new Map();
const memo=(key,build)=>{if(!cache.has(key))cache.set(key,build());return copy(cache.get(key));};
const point=(region,id)=>getRegion(region).objects.find(object=>object.id===id);
const interact=(state,id)=>run(state,{type:state.world.region==='ashwind_pass'?'interactPass':'interactQuarry',objectId:id,...report(state,point(state.world.region,id))}).state;
function quarryBeforeRescue(){return memo('quarry-before',()=>{
 let state=route().state;
 state=run(state,{type:'promoteAdept',...report(state,{x:260,y:325}),recovery:state.recovery??emptyRecovery()}).state;
 state=run(state,{type:'acceptQuarryQuest',...report(state,{x:450,y:325})}).state;
 state=travel(state,'town-quarry-entry');
 return interact(settle(state,QUARRY_GROUPS.entry),'quarry-tool');
});}
function quarryRescued(){return memo('quarry-rescued',()=>interact(settle(quarryBeforeRescue(),QUARRY_GROUPS.rescue,point('ember_quarry','quarry-rescue')),'quarry-rescue'));}
function passBeforeRescue(){return memo('pass-before',()=>{
 let state=earnedQuarryRoute('normal',{full:false,shortcut:false});
 state=run(state,{type:'acceptPassQuest',...report(state,{x:450,y:325})}).state;
 state=travel(state,'town-pass-entry');
 return interact(settle(state,PASS_GROUPS.entry),'pass-clue');
});}
function passRescued(){return memo('pass-rescued',()=>interact(settle(passBeforeRescue(),PASS_GROUPS.rescue,point('ashwind_pass','pass-rescue')),'pass-rescue'));}
function inputFor(state,position={x:864,y:688}){
 const region=getRegion(state.world.region),view=region.id==='ashwind_pass'?passObjectView:quarryObjectView;
 // These two regions have no NPCs/chests/dungeon objects; same object order,
 // live view composition, and completed-object filter used by main.nearest().
 const candidates=[...region.objects.filter(object=>!(object.hideWhenCompleted&&view(state,object).actions.length===0)).map(object=>({...object,kind:object.type,...view(state,object)})),...region.portals.map(portal=>({...portal,kind:'portal'}))];
 return {regionId:region.id,objectives:state.world.objectives,position,map:createMap(region.id,state),candidates};
}
const oldNearest=({position,map,candidates})=>candidates.filter(object=>near(position,object)&&lineOfSight(map,position,object)).sort((a,b)=>Math.hypot(a.x-position.x,a.y-position.y)-Math.hypot(b.x-position.x,b.y-position.y))[0]??null;
const pair=input=>({...input,candidates:input.candidates.filter(object=>['pass-town-shortcut','pass-shortcut','quarry-town-lift','quarry-shortcut'].includes(object.id))});
const portalFirst=input=>({...input,candidates:[...input.candidates].sort((a,b)=>Number(b.kind==='portal')-Number(a.kind==='portal'))});
const picked=input=>selectInteractionTarget(input)?.id;
const passInput=()=>pair(inputFor(passRescued()));
const quarryInput=()=>portalFirst(pair(inputFor(quarryRescued(),{x:672,y:608})));
const ledger=state=>({character:state.character,stats:state.stats,gold:state.gold,inventory:state.inventory,vitals:state.vitals,recovery:state.recovery});

test('actual Pass geometry reproduces locked portal before and rope target after correction',()=>{
 const state=passRescued(),input=inputFor(state),before=copy(state);
 assert.equal(inMap(input.map,input.position.x,input.position.y),true);
 const rope=input.candidates.find(object=>object.id==='pass-shortcut'),portal=input.candidates.find(object=>object.id==='pass-town-shortcut');
 assert.deepEqual([rope.x,rope.y,portal.x,portal.y],[816,688,848,688]);
 for(const object of [rope,portal]){assert.equal(near(input.position,object),true);assert.equal(lineOfSight(input.map,input.position,object),true);}
 assert.equal(oldNearest(input),portal);
 assert.equal(selectInteractionTarget(input),rope);
 assert.deepEqual(state,before);assert.equal(state.world.objectives.pass_shortcut_open,0);
 assert.equal(reduceRuntime(state,{type:'travel',portalId:portal.id,to:portal.to,...report(state,input.position)}).code,'SHORTCUT_REQUIRED');
});

test('quarry exact-overlap selection is independent of portal/object source order',()=>{
 const input=quarryInput(),object=input.candidates.find(row=>row.kind==='quarry'),portal=input.candidates.find(row=>row.kind==='portal');
 assert.deepEqual([object.x,object.y,portal.x,portal.y],[656,608,656,608]);
 assert.equal(oldNearest(input),portal);
 assert.equal(selectInteractionTarget(input),object);
 assert.equal(selectInteractionTarget({...input,candidates:[object,portal]}),object);
});

for(const [label,build,beforeRescue,position,objectId,portalId,commandType,flag] of [
 ['Pass',passRescued,passBeforeRescue,{x:864,y:688},'pass-shortcut','pass-town-shortcut','interactPass','pass_shortcut_open'],
 ['quarry',quarryRescued,quarryBeforeRescue,{x:672,y:608},'quarry-shortcut','quarry-town-lift','interactQuarry','quarry_shortcut_open'],
]){
 test(`${label}: only explicit existing command connects, grants no resources, then normal portal travel works`,()=>{
  const state=build(),input=portalFirst(inputFor(state,position)),object=selectInteractionTarget(input),before=copy(state);
  assert.equal(object.id,objectId);assert.deepEqual(state,before);
  const connected=run(state,{type:commandType,objectId:object.id,...report(state,position)}).state;
  assert.equal(connected.world.objectives[flag],1);assert.deepEqual(ledger(connected),ledger(state));
  const fresh=inputFor(connected,position);assert.equal(fresh.candidates.some(row=>row.id===objectId),false);
  assert.equal(picked(fresh),portalId);assert.equal(selectInteractionTarget(fresh),oldNearest(fresh));
  const portal=selectInteractionTarget(fresh),returned=run(connected,{type:'travel',portalId:portal.id,to:portal.to,...report(connected,position)}).state;
  assert.equal(returned.world.region,'ash_hamlet');assert.deepEqual(ledger(returned),ledger(connected));
 });
 test(`${label}: pre-rescue visible actions do not elevate unlock target or bypass reducer requirements`,()=>{
  const state=beforeRescue(),input=portalFirst(inputFor(state,position)),object=input.candidates.find(row=>row.id===objectId),before=copy(state);
  assert.equal(object.actions.length,1);assert.equal(picked(input),portalId);
  assert.equal(reduceRuntime(state,{type:commandType,objectId,...report(state,position)}).code,'RESCUE_REQUIRED');
  assert.deepEqual(state,before);
 });
 test(`${label}: stale life and stale completion still reject existing commands without mutation`,()=>{
  const state=build(),input=portalFirst(inputFor(state,position)),selected=selectInteractionTarget(input),command={type:commandType,objectId:selected.id,...report(state,position)};
  const before=copy(state);assert.equal(reduceRuntime(state,{...command,life:command.life+1}).code,'STALE_LIFE');assert.deepEqual(state,before);
  const connected=run(state,command).state,connectedBefore=copy(connected);
  assert.equal(reduceRuntime(connected,command).code,'ALREADY_OPEN');assert.deepEqual(connected,connectedBefore);
  // Even a stale actionable view cannot take priority after the flag commits.
  const staleView={...input,objectives:connected.world.objectives};
  assert.equal(picked(staleView),portalId);assert.equal(selectInteractionTarget(staleView),oldNearest(staleView));
  assert.equal(validateState(connected).ok,true);
 });
}

test('76-unit default reach is preserved and distant Pass rope is never pulled into range',()=>{
 const input=passInput(),far={...input,position:{x:884,y:724}};
 assert.equal(inMap(far.map,far.position.x,far.position.y),true);
 assert.equal(near(far.position,far.candidates.find(row=>row.kind==='pass')),false);
 assert.equal(picked(far),'pass-town-shortcut');
 const flat={w:12,h:12,tiles:Array.from({length:12},()=>Array(12).fill(1))},position={x:160,y:160};
 const atDistance=distance=>({...input,map:flat,position,candidates:input.candidates.map(row=>({...row,x:position.x+(row.kind==='portal'?10:distance),y:position.y}))});
 assert.equal(picked(atDistance(76)),'pass-shortcut');
 assert.equal(picked(atDistance(76.000001)),'pass-town-shortcut');
 assert.equal(selectInteractionTarget({...atDistance(76),candidates:atDistance(76).candidates.map(row=>({...row,x:300}))}),null);
});

test('visible locked portal never selects its linked object through an intervening wall',()=>{
 // Deliberate geometry fixture: a wall between otherwise-near legal endpoints.
 const input=passInput(),map={w:12,h:12,tiles:Array.from({length:12},()=>Array(12).fill(1))},position={x:144,y:176};
 for(const row of map.tiles)row[5]=0;
 const candidates=input.candidates.map(row=>({...row,x:row.kind==='portal'?144:208,y:176})),fixture={...input,map,position,candidates};
 const object=candidates.find(row=>row.kind==='pass'),portal=candidates.find(row=>row.kind==='portal');
 assert.equal(inMap(map,object.x,object.y),true);assert.equal(near(position,object),true);
 assert.equal(lineOfSight(map,position,object),false);assert.equal(lineOfSight(map,position,portal),true);
 assert.equal(selectInteractionTarget(fixture),portal);
 assert.equal(selectInteractionTarget({...fixture,candidates:[object]}),null);
});

test('nearest unrelated NPC, chest, object or open portal remains authoritative',()=>{
 const input=passInput();
 for(const kind of ['npc','chest','pass','quarry','dungeon','portal']){
  const unrelated={id:'unrelated-'+kind,kind,x:864,y:688,actions:[{label:'Action'}]};
  const fixture={...input,candidates:[...input.candidates,unrelated]};
  assert.equal(selectInteractionTarget(fixture),unrelated,kind);
 }
 // Merely actionable/farther objects are not promoted over any NPC.
 const npc={id:'elder',kind:'npc',x:864,y:688};
 assert.equal(selectInteractionTarget({...input,candidates:[npc,...input.candidates]}),npc);
});

test('relationship matching is exact for region, portal ID, gate, object ID, kind and action kind',()=>{
 for(const original of [passInput(),quarryInput()]){
  for(const [field,value] of [['id','unrelated-portal'],['gate','unknown'],['kind','npc']]){
   const candidates=original.candidates.map(row=>row.kind==='portal'?{...row,[field]:value}:row),input={...original,candidates};
   assert.equal(selectInteractionTarget(input),oldNearest(input),field);
  }
  for(const [field,value] of [['id','unrelated-shortcut'],['kind',original.regionId==='ashwind_pass'?'quarry':'pass'],['actionKind','clue']]){
   const candidates=original.candidates.map(row=>row.kind==='portal'?row:{...row,[field]:value}),input={...original,candidates};
   assert.equal(selectInteractionTarget(input),oldNearest(input),field);
  }
  for(const regionId of [undefined,'ash_hamlet','prefix-'+original.regionId])assert.equal(selectInteractionTarget({...original,regionId}),oldNearest(original));
 }
});

test('no linked local object means no promotion, including town endpoints and ambiguous duplicates',()=>{
 const input=passInput(),object=input.candidates.find(row=>row.kind==='pass'),portal=input.candidates.find(row=>row.kind==='portal');
 assert.equal(selectInteractionTarget({...input,candidates:[portal]}),portal);
 assert.equal(selectInteractionTarget({...input,candidates:[portal,object,{...object,x:100}]}),portal);
 assert.equal(selectInteractionTarget({...input,candidates:[portal,object,{...object}]}),portal);
 const town={...portal,id:'town-pass-shortcut'};
 assert.equal(selectInteractionTarget({...input,regionId:'ash_hamlet',candidates:[town,object]}),town);
});

test('stale, absent, malformed or disabled actions never elevate an unlock object',()=>{
 const input=passInput(),portal=input.candidates.find(row=>row.kind==='portal');
 for(const actions of [undefined,null,{},[],[null],[{}],[{label:''}],[{label:'  '}],[{label:12}],[{label:'Connect',disabled:true}],[{label:'Connect',disabled:'false'}]]){
  const candidates=input.candidates.map(row=>row.kind==='portal'?row:{...row,actions});
  assert.equal(selectInteractionTarget({...input,candidates}),portal,JSON.stringify(actions));
 }
 const candidates=input.candidates.map(row=>row.kind==='portal'?row:{...row,actions:[{label:'Unavailable',disabled:true},{label:'Connect',disabled:false}]});
 assert.equal(picked({...input,candidates}),'pass-shortcut');
});

test('missing, inherited, truthy, malformed and stale objective values do not grant priority',()=>{
 for(const input of [passInput(),quarryInput()]){
  const link=SHORTCUT_INTERACTIONS.find(row=>row.regionId===input.regionId),nearest=oldNearest(input);
  for(const objectives of [undefined,null,[],{},Object.create(input.objectives)])assert.equal(selectInteractionTarget({...input,objectives}),nearest);
  for(const value of [undefined,null,false,true,'0',1,2,NaN])assert.equal(selectInteractionTarget({...input,objectives:{...input.objectives,[link.openObjective]:value}}),nearest);
  for(const key of link.requiredObjectives)for(const value of [undefined,null,0,true,'1',2,NaN])assert.equal(selectInteractionTarget({...input,objectives:{...input.objectives,[key]:value}}),nearest,key);
 }
});

test('malformed selection contexts fail closed and malformed candidates are ignored',()=>{
 const input=passInput();
 for(const value of [undefined,null,[],0,'input',{}, {...input,candidates:null},{...input,candidates:{}},{...input,position:null},{...input,position:{x:NaN,y:688}},{...input,position:{x:864,y:Infinity}},{...input,position:{x:'864',y:688}}])assert.equal(selectInteractionTarget(value),null);
 for(const map of [undefined,null,{}, {w:1,h:1,tiles:null},{w:1,h:1,tiles:[null]},{w:1,h:1,tiles:[[true]]},{w:1,h:2,tiles:[[1]]}])assert.equal(selectInteractionTarget({...input,map}),null);
 const malformed=[null,undefined,{},[],{id:'bad',kind:'npc',x:NaN,y:688},{id:'bad',kind:'npc',x:864,y:'688'},{id:'',kind:'npc',x:864,y:688},{id:'bad',kind:null,x:864,y:688}];
 assert.equal(picked({...input,candidates:[...malformed,...input.candidates]}),'pass-shortcut');
 assert.equal(selectInteractionTarget({...input,candidates:malformed}),null);
});

test('ordinary equal-distance order and input identity are preserved without mutations',()=>{
 const input=passInput(),a={id:'first',kind:'npc',x:860,y:688},b={id:'second',kind:'chest',x:868,y:688};
 assert.equal(selectInteractionTarget({...input,candidates:[a,b]}),a);
 assert.equal(selectInteractionTarget({...input,candidates:[b,a]}),b);
 const frozen=freeze(copy(input)),before=copy(frozen);
 const expected=frozen.candidates.find(row=>row.kind==='pass');
 for(let n=0;n<3;n++)assert.equal(selectInteractionTarget(frozen),expected);
 assert.deepEqual(frozen,before);assert.equal(Object.isFrozen(SHORTCUT_INTERACTIONS),true);
 for(const row of SHORTCUT_INTERACTIONS){assert.equal(Object.isFrozen(row),true);assert.equal(Object.isFrozen(row.requiredObjectives),true);}
});

test('relationship metadata still names actual source objects, gates and independent shortcut conditions',()=>{
 assert.equal(SHORTCUT_INTERACTIONS.length,5);
 assert.deepEqual(new Set(SHORTCUT_INTERACTIONS.map(row=>row.regionId)),new Set(['ashwind_pass','ember_quarry','signal_basin','ember_furnace','signal_tomb']));
 for(const row of SHORTCUT_INTERACTIONS){
  const region=getRegion(row.regionId),portal=region.portals.find(item=>item.id===row.portalId),object=region.objects.find(item=>item.id===row.objectId);
  assert.equal(portal.gate,row.gate);assert.equal(object.type,row.kind);assert.equal(object.actionKind,'shortcut');assert.equal(object.hideWhenCompleted,true);
  assert.deepEqual(region.npcs,[]);assert.equal(region.objects.every(item=>item.type===row.kind),true);
  if(row.regionId==='signal_tomb')assert.deepEqual(row.requiredObjectives,['tomb_accepted','tomb_decoded']);
  else if(row.regionId==='signal_basin')assert.deepEqual(row.requiredObjectives,['signal_accepted','signal_decoded']);
  else assert.equal(row.requiredObjectives.some(key=>key.includes('signal')||key.includes('winch')||key.includes('reported')),false);
  assert.equal(row.requiredObjectives.some(key=>key.includes('transmitter')||key.includes('receiver')||key.includes('reported')),false);
 }
});
