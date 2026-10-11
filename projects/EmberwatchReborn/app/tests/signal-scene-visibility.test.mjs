import {createMainInputFixture} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {signalSceneVisibility,SIGNAL_LANDMARK_RANGE} from '../src/signal-scene-visibility.js';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {signalObjectView} from '../src/signal-presentation.js';
import {signalWallFootings,signalWallFootingLines,SIGNAL_WALL_STYLE as WALL,signalOpenPassages,signalPassageTickLines,SIGNAL_MARK_STYLE as MARK} from '../src/signal-readability.js';
import {SIGNAL_REGION as S,SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_ROUTES,SIGNAL_FOES} from '../src/signal-content.js';
import {mapFromRegion,inMap,lineOfSight,traceSegment} from '../src/world-geometry.js';
import {createVisualRenderer} from '../src/visual.js';
import {ART} from '../src/art.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {createStore} from '../src/save.js';
import {resolveCursorAim} from '../src/cursor-targeting.js';
import {mainImports} from './support/main-imports.mjs';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {run,report,travel,settle} from './support/earned-route.mjs';

// Production helper/main/renderer calls at a recording Canvas2D boundary.
// Geometry/actor positions and malformed snapshots below are explicit fixtures;
// reducer-earned route checks are scripted settlements, NOT normal-input play,
// actual pixels, visual acceptance, or evidence of combat difficulty.
const region=SIGNAL_REGIONS[S],point=id=>region.objects.find(o=>o.id===id);
const base={signal_accepted:1},west={...base,signal_route_ready:1,signal_west_open:1},east={...base,signal_route_ready:1,signal_east_open:1},north={...west,signal_transmitter_restored:1};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const visibility=(s,b)=>signalSceneVisibility(b,{objectives:s.world.objectives,objectView:o=>signalObjectView(s,o)});
function fixture(objectives=base,p=region.spawn){
 const s={world:{objectives:{...objectives},defeated:{},claimedRewards:[]},options:{screenShake:0,flashes:0}};
 const b={region:S,map:mapFromRegion(region,objectives),p:{...p,hp:100,angle:0},enemies:region.foes.map(e=>({...e,hp:SIGNAL_FOES[e.kind].hp,max:SIGNAL_FOES[e.kind].hp,type:'guardian',active:false,angle:0,state:'idle'})),shots:[],effects:[],floaters:[],time:0,shake:0,stats:{}};
 return {s,b,v:visibility(s,b)};
}
function recordingContext(){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',lineJoin:'miter',lineCap:'butt',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:structuredClone(path),...data});
 const methods={save(){stack.push({...data});},restore(){for(const k of Object.keys(data))delete data[k];Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('image',v);},fillText(...v){record('text',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return {addColorStop(){}};},measureText:t=>({width:t.length*7})};
 return {calls,ctx:new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)})};
}
function render(b,v,extra={}){
 const {calls,ctx}=recordingContext(),renderer=createVisualRenderer(ctx,ART,{environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}},{createCanvas:null});
 renderer.render({width:1600,height:1000,regionId:b.region,map:b.map,p:b.p,entities:b.enemies,objects:region.objects.map(o=>({...o,type:o.visualType})),sceneVisibility:v,seen:v?.seen,shots:b.shots,effects:b.effects,time:b.time,cleanView:true,...extra});return calls;
}
const bodies=c=>c.filter(c=>c.op==='image'&&c.args[0].id==='enemy');
const rails=c=>c.filter(c=>c.op==='stroke'&&[WALL.color,WALL.keyColor].includes(c.strokeStyle));
const ticks=c=>c.filter(c=>c.op==='stroke'&&c.strokeStyle===MARK.passageColor);
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function main(s,b){
 const calls=[],context={...createMainInputFixture(),...mainImports,config:()=>mainImports.controlsFor(s),state:s,battle:b,canvas:{width:1600,height:1000},ctx:{save(){},restore(){},fillRect(...args){calls.push({op:'rect',args});},fillText(...args){calls.push({op:'text',args});}}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function wildernessView('),source.indexOf('function interact('))+'\n'+source.split('\n').find(l=>l.startsWith('function drawLabels(')),context);return {calls,context};
}
for(const [name,objectives,counts] of [['closed',base,[6,0,0]],['west',west,[6,6,0]],['east',east,[6,6,0]],['north',north,[6,6,4]]])test(`S ${name}: floor connectivity and authored gates control idle bodies and future devices`,()=>{
 const {b,v}=fixture(objectives),before=structuredClone(b);
 for(const [i,group] of ['entry','yard','receiver'].entries())assert.equal(b.enemies.filter(e=>SIGNAL_GROUPS[group].includes(e.id)&&v.entityVisible(e)).length,counts[i]);
 assert.equal(v.objectVisible(point('signal-transmitter')),name!=='closed');assert.equal(v.objectVisible(point('signal-receiver')),name==='north');
 assert.equal(bodies(render(b,v,{width:4000,height:2000})).length,counts.reduce((a,b)=>a+b,0));assert.deepEqual(b,before);
});
test('actual renderer removes four locked keeper bodies, then shows reachable still-idle keepers immediately',()=>{
 for(const [objectives,count] of [[west,0],[north,4]]){
  const {b,v}=fixture(objectives,{x:416,y:208});b.enemies=b.enemies.filter(e=>e.kind==='signal_keeper');
  assert.ok(b.enemies.every(e=>!e.active));assert.equal(bodies(render(b,v)).length,count);
  if(!count)assert.equal(bodies(render(b,null)).length,4,'unfiltered fixture reproduces prior leak');
 }
});
test('stale objective/map combinations cannot reveal idle foes or invent an open passage',()=>{
 for(const door of region.doors){
  const p={x:(door.x+1)*32+16,y:(door.y+2)*32+16},f=fixture(north,p);f.b.map=mapFromRegion(region,base);
  let v=visibility(f.s,f.b);assert.ok(!signalOpenPassages(S,f.b.map,p,v.seen,2000).length);
  f.s.world.objectives={...base};f.b.map=mapFromRegion(region,north);v=visibility(f.s,f.b);
  assert.equal(v.entityVisible(f.b.enemies.find(e=>e.kind==='signal_keeper')),false);
 }
});
for(const [name,objectives] of [['closed',base],['west',west],['east',east],['north',north]])test(`S ${name}: capped footings use only nearby connected 1/0 edges, inset inside real solid tiles`,()=>{
 const {b,v}=fixture(objectives,{x:416,y:208}),before=structuredClone(b.map),segments=signalWallFootings(S,b.map,b.p,v.seen),lines=signalWallFootingLines(segments);
 // A disconnected player-position fixture correctly gets no floor or rail.
 if(!v.seen[Math.floor(b.p.y/32)]?.[Math.floor(b.p.x/32)])assert.equal(segments.length,0);
 for(const s of segments){
  assert.equal(b.map.tiles[s.tile.y][s.tile.x],0);assert.equal(b.map.tiles[s.floor.y][s.floor.x],1);assert.equal(v.seen[s.floor.y][s.floor.x],true);
  assert.ok(Math.hypot((s.floor.x+.5)*32-b.p.x,(s.floor.y+.5)*32-b.p.y)<=WALL.radius);
  assert.equal(traceSegment(b.map,{x:(s.floor.x+.5)*32,y:(s.floor.y+.5)*32},{x:s.x,y:s.y}).blocked,true);
 }
 for(const line of lines){assert.equal(line.length,4);for(const p of line)assert.equal(inMap(b.map,p.x,p.y,0),false);}
 assert.ok(lines.length<=segments.length);assert.deepEqual(b.map,before);
});
for(const [name,index,objectives] of [['west',0,west],['east',1,east],['north',2,north]])test(`${name} before/after: only the complete real opened door receives ticks and no footing crosses its lane`,()=>{
 const door=region.doors[index],p={x:(door.x+door.w/2)*32,y:(door.y+1.5)*32};
 for(const opened of [false,true]){
  const {s,b}=fixture({...objectives,[door.unlockObjective]:Number(opened)},p),v=visibility(s,b),passages=signalOpenPassages(S,b.map,p,v.seen);
  assert.equal(passages.some(p=>p.id===door.unlockObjective),opened);
  for(const tile of passages.flatMap(p=>p.tiles)){assert.equal(b.map.tiles[tile.y][tile.x],1);assert.equal(v.seen[tile.y][tile.x],true);}
  const segments=signalWallFootings(S,b.map,p,v.seen),doorSegments=segments.filter(s=>s.tile.y===door.y&&s.tile.x>=door.x&&s.tile.x<door.x+door.w);
  assert.equal(doorSegments.length>0,!opened);
  if(opened){b.map.tiles[door.y][door.x]=0;assert.ok(!signalOpenPassages(S,b.map,p,visibility(s,b).seen).some(p=>p.id===door.unlockObjective));}
 }
});
test('seen=false and remote floor do not reveal hidden-room footings or opened corner marks',()=>{
 const {b}=fixture(north,{x:416,y:208}),seen=b.map.tiles.map(r=>r.map(()=>false));
 assert.deepEqual(signalWallFootings(S,b.map,b.p,seen),[]);assert.deepEqual(signalOpenPassages(S,b.map,b.p,seen),[]);
 assert.deepEqual(signalWallFootings(S,b.map,{x:5000,y:5000}),[]);
 const c=render(b,{entityVisible:()=>false,objectVisible:()=>false,seen});assert.equal(rails(c).length,0);assert.equal(ticks(c).length,0);
 const merged=signalWallFootingLines(signalWallFootings(S,b.map,b.p));assert.ok(merged.length>0);assert.notDeepEqual(merged[0],signalPassageTickLines({x:11,y:5})[0]);
});
test('actual active LOS-broken threats and committed warnings survive gate/map inconsistencies, including flash0',()=>{
 const {s,b}=fixture(west,{x:304,y:272}),e=b.enemies.find(e=>e.kind==='signal_keeper');
 Object.assign(e,{active:true,state:'windup',telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:e.x,y:e.y,x2:b.p.x,y2:b.p.y,width:14}]}});
 assert.equal(lineOfSight(b.map,b.p,e),false);const v=visibility(s,b);assert.equal(v.seen[Math.floor(e.y/32)][Math.floor(e.x/32)],false);assert.equal(v.entityVisible(e),true);assert.equal(v.combat,true);
 for(const reduced of [false,true]){const c=render(b,v,{entities:[e],reduced,flashScale:reduced?0:1});assert.equal(bodies(c).length,1);assert.ok(c.some(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'));}
});
test('residual hostile shots and area warnings remain visible after the caster dies and keep labels suppressed',()=>{
 const {s,b}=fixture(base,point('signal-code'));b.enemies=[];b.shots=[{enemy:true,kind:'arrow',x:432,y:560,vx:30,vy:0,life:1}];
 b.effects=[{type:'hostileZone',x:432,y:560,r:30,color:'#bb3344',life:1,max:1,delay:.5},{type:'enemyRelease',shape:{type:'line',x:432,y:560,x2:480,y2:560,width:14},color:'#dd6677',life:1,max:1}];
 const v=visibility(s,b),c=render(b,v);assert.equal(v.combat,true);assert.equal(v.landmarkLabel(point('signal-code')),null);
 assert.ok(c.some(c=>c.op==='fillRect'&&c.fillStyle==='#ec796e'));for(const color of ['#bb3344','#dd6677'])assert.ok(c.some(c=>c.op==='stroke'&&c.strokeStyle===color));
 for(const type of ['enemyRelease','hostileZone','meteor']){b.shots=[];b.effects=[{type,life:.2}];assert.equal(visibility(s,b).combat,true);b.effects[0].life=0;assert.equal(visibility(s,b).combat,false);}
});
test('capped boundaries and existing passage ticks precede loot, danger and every actor, static at flash0',()=>{
 const {s,b}=fixture(north,{x:416,y:208}),e=b.enemies[0];Object.assign(e,{x:432,y:208,active:true,telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'cone',x:432,y:208,angle:1,r:70,halfAngle:.3}]}});
 const v=visibility(s,b),extra={loot:[{type:'gold',x:416,y:208,bob:0}]},a=render(b,v,extra),z=render(b,v,{...extra,reduced:true,flashScale:0,time:8});
 assert.equal(rails(a).length,2);assert.ok(ticks(a).length);assert.deepEqual(rails(a),rails(z));assert.deepEqual(ticks(a),ticks(z));
 assert.ok(rails(a).every(c=>c.path.some(p=>p[0]==='closePath')));assert.ok(ticks(a).every(c=>!c.path.some(p=>p[0]==='closePath')));
 const last=Math.max(...[...rails(a),...ticks(a)].map(c=>a.indexOf(c))),later=a.filter(c=>c.op==='image'&&['hero','enemy'].includes(c.args[0].id)||c.op==='fillRect'&&c.fillStyle==='#e8c07b'||c.op==='stroke'&&['#f29187','#ffe5a6'].includes(c.strokeStyle));
 assert.ok(later.length>3);assert.ok(later.every(c=>a.indexOf(c)>last));assert.ok(!a.some(c=>c.op==='stroke'&&c.strokeStyle==='#9dc3bc'&&c.path.length));
});
test('S quiet nearby LOS-valid short labels retain full F names; active combat suppresses labels only',()=>{
 const {s,b}=fixture(north,{x:528,y:144}),v=visibility(s,b),receiver=point('signal-receiver');assert.equal(SIGNAL_LANDMARK_RANGE,160);assert.equal(v.landmarkLabel(receiver),'북쪽 수신기');
 const h=main(s,b);h.context.drawLabels(v);assert.ok(h.calls.some(c=>c.op==='text'&&c.args[0]==='북쪽 수신기'));
 Object.assign(b.p,receiver);assert.equal(h.context.nearest().name,signalObjectView(s,receiver).name);b.enemies[0].active=true;h.calls.length=0;h.context.drawLabels();assert.equal(h.calls.length,0);assert.equal(h.context.nearest().id,receiver.id);
 b.enemies[0].active=false;Object.assign(b.p,{x:receiver.x+161,y:receiver.y});assert.equal(visibility(s,b).landmarkLabel(receiver),null);
 let blocked;for(let y=80;y<280&&!blocked;y+=8)for(let x=288;x<576&&!blocked;x+=8){const p={x,y};if(inMap(b.map,x,y)&&Math.hypot(x-receiver.x,y-receiver.y)<=160&&!lineOfSight(b.map,p,receiver))blocked=p;}
 assert.ok(blocked);Object.assign(b.p,blocked);assert.equal(visibility(s,b).landmarkLabel(receiver),null);
});
test('shortcut marker follows availability/completion while ordinary F interaction candidates stay unchanged',()=>{
 const portal=region.portals.find(p=>p.id==='signal-town-shortcut'),device=point('signal-shortcut');
 for(const opened of [false,true]){const {s,b,v}=fixture({...base,signal_shortcut_open:Number(opened)},portal);assert.equal(v.objectVisible(portal),opened);assert.equal(v.objectVisible(device),!opened);assert.equal(main(s,b).context.nearest().id,portal.id);}
});
test('actual main frame supplies one S snapshot to live renderer, floor cues and labels at each map transition',()=>{
 const {s,b}=fixture(west,{x:416,y:208}),h=main(s,b);let rendered,labelSnapshot;const realLabels=h.context.drawLabels;
 h.context.renderer={render:scene=>{rendered=scene;}};h.context.drawLabels=v=>{labelSnapshot=v;realLabels(v);};
 const start=source.indexOf('   const sceneVisibility=wildernessSceneVisibility('),end=source.indexOf('   audio.tick(',start);assert.ok(start>0&&end>start);
 for(const objectives of [west,north,west]){
  s.world.objectives={...objectives};b.map=mapFromRegion(region,objectives);const before=structuredClone({s,b});h.calls.length=0;vm.runInContext('{'+source.slice(start,end)+'}',h.context);
  assert.equal(rendered.sceneVisibility,labelSnapshot);assert.equal(rendered.seen,labelSnapshot.seen);assert.equal(rendered.map,b.map);assert.equal(rendered.entities,b.enemies);assert.equal(rendered.p,b.p);
  assert.equal(rendered.sceneVisibility.entityVisible(b.enemies.find(e=>e.kind==='signal_keeper')),!!objectives.signal_transmitter_restored);assert.deepEqual({s,b},before);
 }
});
test('S adapter and rails opt out of all other regions; W scene contract remains selected only for W',()=>{
 const {b}=fixture(north);for(const id of [undefined,'ash_hamlet','ash_road','furnace_works','signal_tomb','beacon_battlefield','signal_wilderness']){assert.equal(signalSceneVisibility({...b,region:id}),null);assert.deepEqual(signalWallFootings(id,b.map,b.p),[]);assert.equal(rails(render({...b,region:id},null)).length,0);}
 assert.equal(wildernessSceneVisibility(b),null);
});
let earned;
function earnedSignal(){let s=structuredClone(earned??=earnedPassRoute());s=run(s,{type:'acceptSignalQuest',...report(s,{x:250,y:470})}).state;return travel(s,'town-signal-entry');}
for(const direction of ['west','east'])test(`reducer-earned ${direction} gate transitions and reloaded snapshot keep display tied to committed geometry`,()=>{
 let s=earnedSignal();const interact=id=>{s=run(s,{type:'interactSignal',objectId:id,...report(s,point(id))}).state;};
 s=settle(s,SIGNAL_GROUPS.entry);interact('signal-code');for(const node of SIGNAL_ROUTES[direction].order)interact('signal-route-'+node);
 let b=createBattle(s),v=visibility(s,b);assert.ok(b.enemies.filter(e=>e.kind==='signal_keeper').every(e=>!v.entityVisible(e)));
 s=settle(s,SIGNAL_GROUPS.yard,point('signal-transmitter'));interact('signal-transmitter');b=createBattle(s);v=visibility(s,b);assert.ok(b.enemies.filter(e=>e.kind==='signal_keeper').every(e=>!e.active&&v.entityVisible(e)));
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,val)=>data.set(k,val)});assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(data),before=structuredClone({s,b});
 render(freeze(b),visibility(freeze(s),b));assert.deepEqual({s,b},before);assert.deepEqual(data,bytes);const loaded=store.load();assert.equal(loaded.ok,true);const resumed=createBattle(loaded.state);assert.deepEqual(visibility(loaded.state,resumed).seen,v.seen);
});
test('interleaved S visibility/rendering preserves actual combat, aiming, collision, resource and cooldown outcomes',()=>{
 const s=earnedSignal(),a=createBattle(s);Object.assign(a.p,{x:192,y:592});const b=structuredClone(a),pointer={x:900,y:540};
 for(let i=0;i<24;i++){const input={attack:true,aim:{x:224,y:592}};stepBattle(a,s.character,.05,input);stepBattle(b,s.character,.05,input);const aim=resolveCursorAim(pointer,b,1600,1000);render(b,visibility(s,b));assert.deepEqual(b,a);assert.deepEqual(resolveCursorAim(pointer,b,1600,1000),aim);}
 assert.ok(a.contacts>0);
});
