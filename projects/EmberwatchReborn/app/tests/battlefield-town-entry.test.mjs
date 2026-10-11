import {createMainInputFixture} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {getRegion,createMap,inMap,lineOfSight,traceSegment} from '../src/world.js';
import {createBattle,stepBattle,clearBattleIntent} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {reduceRuntime,validateState,STATE_SCHEMA,migrateState} from '../src/state.js';
import {createSession} from '../src/save.js';
import {createController} from '../src/controller.js';
import {selectInteractionTarget} from '../src/interaction-target.js';
import {BATTLEFIELD_REGION} from '../src/battlefield-content.js';
import {battlefieldInputRevision} from '../src/battlefield.js';
import {battlefieldObjectView,battlefieldPortalLabel} from '../src/battlefield-presentation.js';
import {tombPortalLabel} from '../src/tomb-presentation.js';
import {ART} from '../src/art.js';
import {projectWorld,ISO} from '../src/visual.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {report} from './support/earned-route.mjs';

// Scripted fixture setup and Node movement/F-handler execution. Earlier kills
// are synthetic settlement reports; this is not browser walking or earned QA.
// Source fragments are unchanged production nearest/interact handlers. DOM/audio
// are absent, while movement, selection, dispatch, validation and storage are real.
const town=getRegion('ash_hamlet'),map=createMap(town.id),entry=town.portals.find(p=>p.id==='town-battlefield-entry');
const oldEntry={x:560,y:528},oldReturn={x:560,y:464},point=o=>({x:o.x,y:o.y});
const legacyPortals=[['town-sluice-lift',545,480],['town-quarry-entry',620,300],['town-quarry-lift',620,560],['town-pass-entry',112,320],['town-pass-shortcut',112,544],['town-signal-entry',112,448],['town-signal-shortcut',112,592],['town-furnace-entry',352,560],['town-furnace-shortcut',528,560],['town-tomb-entry',624,112],['town-tomb-shortcut',464,112],['road',590,375]];
const candidates=[...town.npcs.map(p=>({...p,kind:'npc'})),...town.portals.filter(p=>!p.gate?.startsWith('wilderness_')).map(p=>({...p,kind:'portal'}))];
const select=position=>selectInteractionTarget({position,map,candidates,regionId:town.id,objectives:{}});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let accepted;
function source(){
 if(accepted)return structuredClone(accepted);
 let s=earnedTombRoute(),r=reduceRuntime(s,{type:'promoteExpert',...report(s,town.npcs.find(p=>p.id==='trainer')),expectedRevision:0,expectedGoldCost:120},{revision:0});assert.equal(r.ok,true,JSON.stringify(r));s=r.state;
 r=reduceRuntime(s,{type:'acceptBattlefieldQuest',...report(s,town.npcs.find(p=>p.id==='elder')),expectedRevision:battlefieldInputRevision(s)});assert.equal(r.ok,true,JSON.stringify(r));accepted=r.state;return structuredClone(accepted);
}
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const handlers=main.slice(main.indexOf('function wildernessView('),main.indexOf('async function showDungeon('));
assert.ok(handlers.includes('function interactionCandidates(')&&handlers.includes('function nearest(')&&handlers.includes('function interact(')&&handlers.includes('selectInteractionTarget'));
function runtime(state,controller=null){
 let pending=null;const context={...createMainInputFixture(),state,battle:createBattle(state),paused:false,busy:false,getRegion,selectInteractionTarget,battlefieldObjectView,battlefieldPortalLabel,tombPortalLabel,clearBattleIntent,
  report:()=>battleReport(context.battle),toast:message=>assert.fail(message),keyName:()=> 'F',showNpc:id=>assert.fail(`F selected NPC ${id}`),
  // Normalize the VM realm's object prototype at the harness boundary.
  dispatch(command){const request=structuredClone(command);pending=controller?controller.dispatch(request):Promise.resolve(reduceRuntime(context.state,request));},
 };
 vm.createContext(context);vm.runInContext(handlers,context);return {context,async interact(){context.interact();assert.ok(pending,'F must dispatch travel');const r=await pending;pending=null;assert.equal(r.ok,true,JSON.stringify(r));context.state=r.state;context.battle=createBattle(r.state);return r;}};
}
function checkpointAt(s,position){const r=reduceRuntime(s,{type:'checkpoint',...report(s,position)});assert.equal(r.ok,true,JSON.stringify(r));return r.state;}
function approach(context,target,reach=75.5){
 let steps=0;while(dist(context.battle.p,target)>reach&&steps++<1000){const b=context.battle,before=point(b.p);stepBattle(b,context.state.character,.025,{move:{x:target.x-b.p.x,y:target.y-b.p.y}});assert.ok(inMap(b.map,b.p.x,b.p.y,11));assert.equal(traceSegment(b.map,before,b.p,11).blocked,false);}
 assert.ok(steps<1000,'continuous normal movement reaches the endpoint');return steps;
}
async function session(s){
 const data=new Map(),writes=[],storage={getItem:k=>data.get(k)??null,setItem(k,v){data.set(k,v);writes.push(k);}},locks={request:(_key,_opts,fn)=>Promise.resolve().then(fn)},store=createSession(storage,locks,{profile:'qa-b-town-entry',namespace:'qa-r11'});
 assert.equal((await store.save(s,{expectedRevision:0})).ok,true);const controller=createController(store);assert.equal((await controller.load()).ok,true);return {data,writes,store,controller};
}

test('only new B town entry and its own ordinary return move; all legacy anchors and map remain',()=>{
 assert.deepEqual(point(entry),{x:304,y:104});assert.equal(entry.gate,'battlefield_entry');assert.deepEqual(entry.arrival,{x:480,y:752});
 const b=getRegion(BATTLEFIELD_REGION);assert.deepEqual(b.portals.find(p=>p.id==='battlefield-town-return').arrival,{x:336,y:160});assert.deepEqual(b.portals.find(p=>p.id==='battlefield-boss-return').arrival,{x:448,y:208});
 assert.deepEqual(town.portals.filter(p=>p.id!==entry.id&&!p.gate?.startsWith('wilderness_')).map(p=>[p.id,p.x,p.y]),legacyPortals);
 assert.deepEqual(town.npcs.map(p=>[p.id,p.x,p.y]),[['trainer',260,325],['elder',450,325],['healer',350,250],['blacksmith',250,470],['workshop',430,480]]);
 assert.deepEqual(town.spawn,{x:350,y:420});assert.deepEqual(town.objects,[{id:'townfire',type:'torch',x:360,y:345}]);
 assert.deepEqual(map.rooms,[{x:1,y:1,w:21,h:18,index:0}]);assert.ok(inMap(map,entry.x,entry.y,11));assert.ok(inMap(map,336,160,11));
});
test('new entry has non-overlapping 76-unit reach and sole selection at every legal sampled approach',()=>{
 for(const other of candidates.filter(p=>p.id!==entry.id))assert.ok(dist(entry,other)>152,`${other.id}: ${dist(entry,other)}`);
 for(let i=0;i<72;i++)for(const radius of [0,32,64,76-1e-8]){const angle=i*Math.PI/36,p={x:entry.x+Math.cos(angle)*radius,y:entry.y+Math.sin(angle)*radius};if(!inMap(map,p.x,p.y,11))continue;assert.ok(lineOfSight(map,p,entry));assert.equal(select(p)?.id,entry.id);}
 for(const p of [{x:entry.x-76,y:entry.y},{x:entry.x+76,y:entry.y},{x:entry.x,y:entry.y+76}])assert.equal(select(p)?.id,entry.id,'exact representable reach boundary');
 assert.equal(select({x:336,y:160})?.id,entry.id);
 for(const p of town.portals.filter(p=>p.id!==entry.id&&!p.gate?.startsWith('wilderness_')))assert.equal(select(p)?.id,p.id,`legacy centre remains selected: ${p.id}`);
});
test('new projected arch footprint is separate from every existing town portal, NPC and seeded landmark',()=>{
 function bounds(o,key,width){const s=ART.environment.sprites[key],k=width/s.w,q=projectWorld(o.x,o.y);return {left:q.x-s.ax*k,right:q.x+(s.w-s.ax)*k,top:q.y-s.ay*k,bottom:q.y+(s.h-s.ay)*k};}
 const a=bounds(entry,'arch',110),others=[...town.portals.filter(p=>p.id!==entry.id).map(p=>[p,'arch',110]),...town.npcs.map(p=>[p,'statue',44]),[town.objects[0],'brazier',28],[{id:'seed-statue',x:80,y:80},'statue',44],[{id:'seed-pillar',x:656,y:80},'pillar',48]];
 for(const [p,key,width] of others){const b=bounds(p,key,width);assert.ok(a.right<b.left||b.right<a.left||a.bottom<b.top||b.bottom<a.top,`sprite boxes overlap ${p.id}`);}
 assert.equal(ISO.zoom,1.26);const elder=town.npcs.find(p=>p.id==='elder');assert.ok(dist(elder,entry)-dist(elder,oldEntry)<35,'relocation is a compact separation repair, not travel inflation');
});
for(const [name,start] of [['Eda',{x:450,y:325}],['town spawn',town.spawn],['trainer',{x:260,y:325}],['old B endpoint',oldEntry],['old B return',oldReturn]])test(`actual movement and main nearest/F from ${name} enter only B`,async()=>{
 const s=checkpointAt(source(),start),h=runtime(s);approach(h.context,entry);assert.equal(h.context.nearest().id,entry.id);const before=battleReport(h.context.battle),result=await h.interact();assert.equal(result.state.world.region,BATTLEFIELD_REGION);assert.deepEqual(result.state.world.position,entry.arrival);assert.deepEqual(result.state.vitals,before.vitals);assert.deepEqual(result.state.recovery,before.recovery);assert.equal(result.events.filter(e=>e.type==='travelled').length,1);
});
test('actual main F and durable controller support ordinary B return, immediate re-entry and read-only reload',async()=>{
 const s=source(),saved=await session(s),h=runtime(s,saved.controller);approach(h.context,entry);await h.interact();
 const back=getRegion(BATTLEFIELD_REGION).portals.find(p=>p.id==='battlefield-town-return');assert.equal(h.context.nearest().id,back.id);const before=battleReport(h.context.battle);await h.interact();assert.deepEqual(h.context.state.world.position,back.arrival);assert.deepEqual(h.context.state.vitals,before.vitals);assert.deepEqual(h.context.state.recovery,before.recovery);assert.equal(h.context.nearest().id,entry.id);
 const townState=structuredClone(h.context.state),bytes=new Map(saved.data),writes=saved.writes.length;assert.deepEqual((await saved.controller.load()).state,townState);assert.deepEqual(saved.data,bytes);assert.equal(saved.writes.length,writes);
 await h.interact();assert.equal(h.context.state.world.region,BATTLEFIELD_REGION);assert.deepEqual(saved.store.load().state,h.context.state);for(const key of ['gold','inventory','character','stats'])assert.deepEqual(h.context.state[key],s[key],key);assert.deepEqual(h.context.state.world.defeated,s.world.defeated);
});
for(const [name,position] of [['old entry',oldEntry],['old return',oldReturn]])test(`existing schema4 ${name} position reloads without teleport, migration write or lost resources`,async()=>{
 const s=checkpointAt(source(),position);s.version=4;const saved=await session(s),before=new Map(saved.data),writes=saved.writes.length;assert.equal(s.version,4);assert.equal(validateState(s).ok,true);
 const loaded=await saved.controller.load();assert.deepEqual(loaded.state,migrateState(s));assert.deepEqual(loaded.state.world.position,position);assert.deepEqual(saved.data,before);assert.equal(saved.writes.length,writes);assert.equal(STATE_SCHEMA,'emberwatch.reborn.reimplementation');
 const rejected=await saved.controller.dispatch({type:'travel',portalId:entry.id,to:BATTLEFIELD_REGION,...report(s,position)});assert.equal(rejected.ok,false);assert.equal(rejected.code,'PORTAL_REQUIRED');assert.deepEqual(saved.data,before);assert.equal(saved.writes.length,writes);
 const h=runtime(loaded.state,saved.controller);approach(h.context,entry);assert.equal(h.context.nearest().id,entry.id);await h.interact();assert.equal(h.context.state.world.region,BATTLEFIELD_REGION);assert.deepEqual(saved.store.load().state,h.context.state);
});
