import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTEXT_CLICK_POLICY,createContextClickIntent,pickContextClickTarget,planContextApproach} from '../src/context-click.js';
import {mapFromRegion,inMap,lineOfSight,traceSegment} from '../src/world-geometry.js';
import {createLocomotionIntent} from '../src/locomotion-intent.js';
import {near} from '../src/world.js';

const shown=()=>true;
const npc=(rest={})=>({id:'elder',kind:'npc',x:240,y:144,...rest});
const fixture=(rest={})=>({map:mapFromRegion({w:18,h:18}),p:{x:80,y:144,hp:100},region:'town',stateLife:7,...rest});
const pick=(candidates,screenPoint={x:200,y:160},rest={})=>pickContextClickTarget({candidates,screenPoint,toScreen:()=>({x:200,y:200}),visible:shown,labelVisible:()=>false,width:600,height:500,zoom:1,...rest});
const arm=(rest={})=>{const battle=fixture(),object=npc(),intent=createContextClickIntent(),candidates=[object];assert.equal(intent.press({target:object,battle,candidates,visible:shown,...rest}),true);return {battle,object,intent,candidates};};
const tick=(f,rest={})=>f.intent.step({battle:f.battle,candidates:f.candidates,visible:shown,dt:.01,...rest});

test('picker selects only the explicit rendered NPC body, never nearest empty ground',()=>{
 const object=npc();assert.equal(pick([object]),object);
 for(const screenPoint of [{x:200,y:230},{x:230,y:160},{x:179,y:127},{x:260,y:200}])assert.equal(pick([object],screenPoint),null);
});
test('actual fixed-pixel label rectangle is selectable only when drawLabels says it exists',()=>{
 const object=npc(),pointer={x:250,y:130};assert.equal(pick([object],pointer),null);
 assert.equal(pick([object],pointer,{labelVisible:shown}),object);
 assert.equal(pick([object],{x:261,y:130},{labelVisible:shown}),null);
 // Label offsets do not grow with world zoom.
 assert.equal(pick([object],pointer,{labelVisible:shown,zoom:2}),object);
 assert.equal(pick([object],{x:250,y:90},{labelVisible:shown,zoom:2}),null);
});
test('portal and chest body footprints follow their own render dimensions',()=>{
 const portal=npc({kind:'portal',to:'road'}),chest=npc({kind:'chest'});
 assert.equal(pick([portal],{x:240,y:140}),portal);
 assert.equal(pick([chest],{x:200,y:184}),chest);
 assert.equal(pick([chest],{x:225,y:184}),null);
 assert.equal(pick([chest],{x:200,y:150}),null);
});
test('hidden, occluded, unavailable, completed nonrendered and unknown-kind objects fail closed',()=>{
 for(const object of [npc({hidden:true}),npc({rendered:false}),npc({visible:false}),npc({hideWhenCompleted:true,completed:true}),npc({kind:'monster'}),npc({id:''})])assert.equal(pick([object],{x:200,y:160},{labelVisible:shown}),null);
 assert.equal(pick([npc()],undefined,{visible:()=>false}),null);
 assert.equal(pick([npc()],undefined,{visible:undefined}),null);
 assert.equal(pick([npc()],undefined,{visible:()=>{throw Error('bad view');}}),null);
 const used=npc({kind:'wilderness',completed:true});assert.equal(pick([used],{x:200,y:185}),null);
 // A still-rendered completed label can open the existing informational view.
 assert.equal(pick([used],{x:250,y:130},{labelVisible:shown}),used);
});
test('ambiguous same-kind identities are rejected even if one duplicate is hidden',()=>{
 const a=npc(),duplicate=npc({x:400,hidden:true});assert.equal(pick([a,duplicate]),null);
 const differentKind=npc({kind:'chest'});assert.equal(pick([a,differentKind]),a);
});
test('frontmost rendered depth wins body overlaps independently of candidate order',()=>{
 const back=npc({id:'back',x:100,y:100}),front=npc({id:'front',x:200,y:200});
 for(const list of [[back,front],[front,back]])assert.equal(pick(list),front);
 const a=npc({id:'a'}),z=npc({id:'z'});for(const list of [[z,a],[a,z]])assert.equal(pick(list),a);
});
test('rendered labels are above body hits and projection is supplied fresh by the caller',()=>{
 const back=npc({id:'back',x:100}),front=npc({id:'front',x:300});
 const toScreen=o=>({x:200,y:o===back?230:200});
 assert.equal(pick([front,back],{x:200,y:160},{toScreen,labelVisible:o=>o===back}),back);
 assert.equal(pick([back],{x:400,y:160},{toScreen:()=>({x:400,y:200})}),back);
 assert.equal(pick([back],{x:200,y:160},{toScreen:()=>({x:400,y:200})}),null);
});
test('invalid pointer, projection, viewport and fully offscreen bounds never select',()=>{
 for(const p of [null,{}, {x:NaN,y:1},{x:Infinity,y:1},{x:-1,y:100},{x:600,y:100},{x:100,y:500}])assert.equal(pick([npc()],p),null);
 for(const rest of [{width:NaN},{height:0},{zoom:0},{zoom:Infinity},{toScreen:()=>({x:NaN,y:0})},{toScreen:()=>{throw Error('bad camera');}},{toScreen:()=>({x:200,y:900})}])assert.equal(pick([npc()],undefined,rest),null);
 assert.equal(pickContextClickTarget(),null);
});
test('picker does not mutate candidates, pointer or camera values',()=>{
 const o=Object.freeze(npc()),p=Object.freeze({x:200,y:160}),projection=Object.freeze({x:200,y:200});assert.equal(pick(Object.freeze([o]),p,{toScreen:()=>projection}),o);
});

test('approach chooses a radius-11 legal point within existing interaction reach and LOS',()=>{
 const battle=fixture(),object=npc(),destination=planContextApproach({battle,target:object});
 assert.ok(destination);assert.ok(inMap(battle.map,destination.x,destination.y,11));assert.ok(near(destination,object));assert.ok(lineOfSight(battle.map,destination,object));assert.ok(Math.hypot(destination.x-object.x,destination.y-object.y)<=64.000001);
 assert.deepEqual(CONTEXT_CLICK_POLICY,{reach:76,approachRadius:64,collisionRadius:11,stallSeconds:2.5,maxSeconds:20});
});
test('already-near legal starting position is retained; exact reach boundary matches near()',()=>{
 const battle=fixture(),object=npc({x:battle.p.x+76});assert.ok(near(battle.p,object));assert.deepEqual(planContextApproach({battle,target:object}),{x:battle.p.x,y:battle.p.y});
});
test('wall blocks same-distance interaction; legal around-corner approach does not need start LOS',()=>{
 const battle=fixture({p:{x:112,y:112,hp:100}}),object=npc({x:176,y:112});
 for(let y=1;y<=5;y++)battle.map.tiles[y][4]=0;
 assert.equal(near(battle.p,object),true);assert.equal(lineOfSight(battle.map,battle.p,object),false);
 const destination=planContextApproach({battle,target:object});assert.ok(destination);assert.ok(inMap(battle.map,destination.x,destination.y,11));assert.ok(lineOfSight(battle.map,destination,object));assert.notDeepEqual(destination,{x:112,y:112});
});
test('disconnected target has no plan or armed intent and invalid points are rejected',()=>{
 const battle=fixture(),object=npc();for(let y=0;y<battle.map.h;y++)battle.map.tiles[y][5]=0;
 assert.equal(planContextApproach({battle,target:object}),null);assert.equal(createContextClickIntent().press({battle,target:object,candidates:[object],visible:shown}),false);
 for(const o of [null,{},npc({x:NaN}),npc({y:Infinity}),npc({x:-500})])assert.equal(planContextApproach({battle:fixture(),target:o}),null);
 for(const b of [null,{},fixture({dead:true}),fixture({p:{x:80,y:144,hp:0}}),fixture({map:{}}),fixture({p:{x:32,y:32,hp:100}})])assert.equal(planContextApproach({battle:b,target:object}),null);
});
test('actual locomotion-intent and collision trace reach an around-corner target, then consume exactly once',()=>{
 const battle=fixture({p:{x:112,y:112,hp:100}}),object=npc({x:208,y:112}),candidates=[object],intent=createContextClickIntent(),locomotion=createLocomotionIntent();
 for(let y=1;y<=5;y++)battle.map.tiles[y][4]=0;
 assert.equal(lineOfSight(battle.map,battle.p,object),false);assert.equal(intent.press({battle,target:object,candidates,visible:shown}),true);locomotion.press(intent.destination,battle);
 let calls=0,status=null,frames=0;
 while(intent.active&&frames++<500){
  const result=intent.step({battle,candidates,visible:shown,dt:.05,execute:target=>{assert.equal(target,object);assert.ok(near(battle.p,target));assert.ok(lineOfSight(battle.map,battle.p,target));calls++;}});status=result.status;
  if(!intent.active){locomotion.clear();break;}
  if(result.destination)locomotion.press(result.destination,battle);
  const movement=locomotion.step({battle,mode:'click'}),length=Math.min(100*.05,movement.distance),next=traceSegment(battle.map,battle.p,{x:battle.p.x+movement.move.x*length,y:battle.p.y+movement.move.y*length},11);battle.p.x=next.x;battle.p.y=next.y;
 }
 assert.equal(status,'consumed');assert.equal(calls,1);assert.equal(intent.active,false);assert.equal(locomotion.destination,null);
 for(let n=0;n<10;n++)assert.equal(intent.step({battle,candidates,visible:shown,execute:()=>calls++}).status,'idle');assert.equal(calls,1);
});
test('ordinary click locomotion centers before a blocked corner turn and reaches the exact destination',()=>{
 const battle=fixture({p:{x:116.47213595499957,y:194.2360679774998,hp:100}}),locomotion=createLocomotionIntent(),destination={x:208,y:112};
 for(let y=1;y<=5;y++)battle.map.tiles[y][4]=0;
 assert.equal(locomotion.press(destination,battle),true);const first=locomotion.step({battle,mode:'click'});assert.deepEqual(first.waypoint,{x:112,y:208});assert.deepEqual(first.destination,destination);
 let frames=0;while(locomotion.destination&&frames++<500){const movement=locomotion.step({battle,mode:'click'});assert.notEqual(movement.blocked,true);const length=Math.min(5,movement.distance),next=traceSegment(battle.map,battle.p,{x:battle.p.x+movement.move.x*length,y:battle.p.y+movement.move.y*length},11);assert.ok(inMap(battle.map,next.x,next.y,11));battle.p.x=next.x;battle.p.y=next.y;}
 assert.equal(locomotion.destination,null);assert.ok(Math.hypot(battle.p.x-destination.x,battle.p.y-destination.y)<=2);
});
test('safe direct click legs retain their exact destination and do not unnecessarily center',()=>{
 const battle=fixture({p:{x:87,y:150,hp:100}}),locomotion=createLocomotionIntent(),destination={x:250,y:179};locomotion.press(destination,battle);assert.deepEqual(locomotion.step({battle,mode:'click'}).waypoint,destination);
});
test('arrival executes the captured kind and id, never a closer competing NPC',()=>{
 const f=arm(),nearer=npc({id:'other',x:100});f.candidates.push(nearer);assert.equal(tick(f).status,'approaching');f.battle.p.x=170;
 let chosen=null;assert.equal(tick(f,{execute:o=>chosen=o}).status,'consumed');assert.equal(chosen,f.object);assert.notEqual(chosen,nearer);
});
test('reconstructed fresh candidates are supported, including a same-id different-kind neighbor',()=>{
 const f=arm(),fresh={...f.object};f.candidates=[npc({kind:'chest'}),fresh];f.battle.p.x=170;
 let chosen=null;assert.equal(tick(f,{execute:o=>chosen=o}).status,'consumed');assert.equal(chosen,fresh);
});
for(const [name,change] of [
 ['battle object',f=>f.battle={...f.battle}],['life',f=>f.battle.stateLife++],['region',f=>f.battle.region='elsewhere'],['death flag',f=>f.battle.dead=true],['zero HP',f=>f.battle.p.hp=0],['invalid player point',f=>f.battle.p.x=NaN],
])test(`${name} invalidates an armed intent before any interaction`,()=>{const f=arm();change(f);assert.equal(tick(f,{execute:()=>assert.fail('stale executed')}).status,'cancelled');assert.equal(f.intent.active,false);});
for(const [name,change] of [
 ['removed',f=>f.candidates=[]],['different kind',f=>f.object.kind='chest'],['different id',f=>f.object.id='someone-else'],['duplicate identity',f=>f.candidates.push({...f.object})],['position changed',f=>f.object.x++],['closed',f=>f.object.closed=true],['opened',f=>f.object.open=true],['completed',f=>f.object.completed=true],['hidden',f=>f.object.hidden=true],['portal destination changed',f=>f.object.to='road'],['actions changed',f=>f.object.actions=[]],
])test(`target ${name} cancels rather than substituting another target`,()=>{const f=arm();change(f);assert.equal(tick(f,{execute:()=>assert.fail('stale executed')}).status,'cancelled');assert.equal(f.intent.active,false);});
test('fresh visibility is revalidated before arrival and execution',()=>{const f=arm();f.battle.p.x=170;assert.equal(tick(f,{visible:()=>false,execute:()=>assert.fail('hidden executed')}).status,'cancelled');});
test('new blocking map cannot execute through a wall or retain an unreachable intent',()=>{
 const f=arm();for(let y=0;y<f.battle.map.h;y++)f.battle.map.tiles[y][5]=0;assert.equal(tick(f,{execute:()=>assert.fail('wall executed')}).status,'cancelled');assert.equal(f.intent.active,false);
});
test('arrival waits for controller idle and executes only after a fresh idle validation',()=>{
 const f=arm();f.battle.p.x=170;let calls=0;assert.equal(tick(f,{busy:true,execute:()=>calls++}).status,'waiting');assert.equal(calls,0);assert.equal(f.intent.active,true);
 assert.equal(tick(f,{busy:false,execute:()=>calls++}).status,'consumed');assert.equal(calls,1);
});
test('no execute callback cannot consume; absent callback and long busy arrival still expire',()=>{
 const f=arm();f.battle.p.x=170;assert.equal(tick(f).status,'waiting');assert.equal(tick(f,{dt:3,busy:true}).reason,'timeout');assert.equal(f.intent.active,false);
});
test('consumption occurs before a throwing or reentrant existing interaction callback',()=>{
 const f=arm();f.battle.p.x=170;let calls=0;
 assert.throws(()=>tick(f,{execute:()=>{calls++;assert.equal(f.intent.active,false);assert.equal(tick(f,{execute:()=>calls++}).status,'idle');throw Error('handler');}}),/handler/);
 assert.equal(tick(f,{execute:()=>calls++}).status,'idle');assert.equal(calls,1);
});
for(const reason of ['groundclick','attack','guard','dodge','stop','interact','menu','blur','death','travel','rebind','savefault','profile'])test(`explicit ${reason} cancellation requires a new press`,()=>{
 const f=arm();assert.equal(f.intent.clear(reason).reason,reason);f.battle.p.x=170;assert.equal(tick(f,{execute:()=>assert.fail('cleared executed')}).status,'idle');assert.equal(f.intent.destination,null);assert.equal(f.intent.target,null);
});
test('second press replaces the first exact context and invalid press clears old context',()=>{
 const f=arm(),second=npc({id:'smith',x:320});f.candidates.push(second);assert.equal(f.intent.press({battle:f.battle,target:second,candidates:f.candidates,visible:shown}),true);assert.equal(f.intent.target.id,'smith');
 assert.equal(f.intent.press({battle:f.battle,target:npc({x:NaN}),candidates:f.candidates,visible:shown}),false);assert.equal(f.intent.active,false);
});
test('stale supplied target cannot arm against different live state or hidden live candidate',()=>{
 for(const update of [o=>o.open=true,o=>o.x++,o=>o.hidden=true]){const f=arm(),stale={...f.object};update(f.object);assert.equal(f.intent.press({battle:f.battle,target:stale,candidates:f.candidates,visible:shown}),false);assert.equal(f.intent.active,false);}
});
test('malformed neighboring candidates cannot crash press or replace an exact valid target',()=>{
 const f=arm();f.candidates.unshift(null,undefined,{},npc({x:NaN,id:'invalid'}));assert.equal(f.intent.press({battle:f.battle,target:f.object,candidates:f.candidates,visible:shown}),true);
 f.battle.p.x=170;assert.equal(tick(f,{execute:o=>assert.equal(o,f.object)}).status,'consumed');
});
test('blocked/no-progress timeout advances only with simulation dt and cannot rearm itself',()=>{
 const f=arm();for(const dt of [0,0,-1,NaN,Infinity])assert.equal(tick(f,{dt,blocked:true}).status,'approaching');
 assert.equal(tick(f,{dt:2.4,blocked:true}).status,'approaching');assert.equal(tick(f,{dt:.11,blocked:true}).reason,'timeout');f.battle.p.x=170;assert.equal(tick(f,{dt:5,execute:()=>assert.fail('late interaction')}).status,'idle');
});
test('actual progress resets stall but total simulation age still bounds wandering',()=>{
 const f=arm();for(let n=0;n<9;n++){f.battle.p.y+=n%2?2:-2;assert.equal(tick(f,{dt:2}).status,'approaching');}
 f.battle.p.y+=2;assert.equal(tick(f,{dt:2}).reason,'timeout');
});
test('destination and target getters return detached snapshots without altering battle state',()=>{
 const f=arm(),before=structuredClone(f.battle),destination=f.intent.destination,target=f.intent.target;destination.x=-99;target.id='other';target.x=-50;
 assert.notEqual(f.intent.destination.x,-99);assert.equal(f.intent.target.id,'elder');assert.equal(f.intent.target.x,240);tick(f);assert.deepEqual(f.battle,before);
});
