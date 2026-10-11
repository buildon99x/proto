import {createMainInputFixture} from './support/main-input-fixture.mjs';
import {controlsFor} from '../src/controls.js';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {tombWardCarried} from '../src/tomb.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {furnaceCoverSegments,furnaceOpenFloor,furnaceFloorBand,FURNACE_SCENE_STYLE as STYLE} from '../src/furnace-readability.js';
import {ART} from '../src/art.js';
import {FURNACE_REGION,FURNACE_REGIONS} from '../src/furnace-content.js';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_ROUTES} from '../src/signal-content.js';
import {mapFromRegion,inMap,traceSegment} from '../src/world-geometry.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {createStore} from '../src/save.js';
import {resolveCursorAim} from '../src/cursor-targeting.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {run,report,travel,settle} from './support/earned-route.mjs';

// The complete production renderer with a recording Canvas2D boundary. Scripted
// fixtures and handler checks are NOT pixels, normal-input play or acceptance.
const region=FURNACE_REGIONS[FURNACE_REGION];
const stages={closed:{},cover:{furnace_cooled:1},channel:{furnace_cooled:1,furnace_center_open:1},exhaust:{furnace_cooled:1,furnace_exhausted:1},all:{furnace_cooled:1,furnace_center_open:1,furnace_exhausted:1}};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const actor=(extra={})=>({id:'furnace-tender-1',kind:'furnace_tender',type:'guardian',x:368,y:464,hp:54,max:54,active:true,state:'idle',angle:0,...extra});
const state=(stage='closed',extra={})=>({width:1000,height:750,regionId:FURNACE_REGION,map:mapFromRegion(region,stages[stage]),p:{x:384,y:464,hp:100,angle:0},entities:[actor()],time:0,cleanView:true,...extra});
const gradient=Object.freeze({addColorStop(){}});
function recordingContext(){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over',transform:[1,0,0,1,0,0]};let path=[];
 const snapshot=()=>({...data,transform:[...data.transform]});
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...snapshot()});
 const methods={save(){stack.push(snapshot());},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},clearRect(...v){record('clearRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(x,y){data.transform[4]+=x;data.transform[5]+=y;},scale(x,y){data.transform[0]*=x;data.transform[3]*=y;},rotate(){},setLineDash(){},createRadialGradient(){return gradient;}};
 return {calls,ctx:new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)})};
}
function render(s,{cached=false}={}){
 const {ctx,calls}=recordingContext(),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}},surfaces=[];
 const createCanvas=cached?()=>{const r=recordingContext();surfaces.push(r);return {id:'cache',getContext:()=>r.ctx};}:null;
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas});const metrics=renderer.render(s);return {calls,metrics,renderer,surfaces};
}
const atlasDraws=(calls,key)=>{const r=ART.environment.sprites[key];return calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='environment'&&c.args[1]===r.x&&c.args[2]===r.y);};
const bandFills=calls=>calls.filter(c=>c.op==='fill'&&c.fillStyle===STYLE.passageFill);
const bandEdges=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.passageEdge);
const boundaryEdges=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.edgeColor&&c.path.length);
const sceneCalls=calls=>calls.filter(c=>atlasDraws([c],STYLE.coverKey).length||bandFills([c]).length||bandEdges([c]).length||boundaryEdges([c]).length);
const warning={phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:368,y:464,x2:368,y2:240,width:14}]};

test('F low masonry reuses the owned atlas within a bounded sub-hero height',()=>{
 assert.ok(Object.isFrozen(STYLE));assert.equal(STYLE.coverKey,'lowwall');assert.ok(ART.environment.sprites.lowwall);
 const sprite=ART.environment.sprites[STYLE.coverKey],height=sprite.h*STYLE.coverWidth/sprite.w*STYLE.coverYScale;
 assert.ok(height<49*.6);assert.ok(STYLE.coverWidth<64);assert.ok(STYLE.passageFillAlpha<=.25);assert.ok(STYLE.passageEdgeAlpha<=.7);
});

for(const [stage,objectives] of Object.entries(stages))test(`${stage}: each cover segment lies on a true solid/visible-floor collision boundary`,()=>{
 const map=mapFromRegion(region,objectives),segments=furnaceCoverSegments(FURNACE_REGION,map);assert.ok(segments.length>0);
 assert.equal(new Set(segments.map(s=>`${s.tile.x},${s.tile.y},${s.side}`)).size,segments.length);
 for(const s of segments){
  assert.equal(map.tiles[s.tile.y][s.tile.x],0);assert.equal(map.tiles[s.floor.y][s.floor.x],1);
  const a={x:s.floor.x*32+16,y:s.floor.y*32+16},b={x:s.tile.x*32+16,y:s.tile.y*32+16};
  assert.equal(traceSegment(map,a,b).blocked,true);assert.equal(inMap(map,s.x,s.y,0),false);
  assert.equal(Math.hypot(s.edge[0].x-s.edge[1].x,s.edge[0].y-s.edge[1].y),32);
 }
});

for(const [stage,count] of [['closed',0],['cover',10],['channel',22],['exhaust',38],['all',50]])test(`${stage}: opened paving comes only from the actual door floor (${count} tiles)`,()=>{
 const map=mapFromRegion(region,stages[stage]),passages=furnaceOpenFloor(FURNACE_REGION,map,{x:384,y:320},null,1000),tiles=passages.flatMap(p=>p.tiles);
 assert.equal(tiles.length,count);assert.equal(new Set(tiles.map(t=>`${t.x},${t.y}`)).size,tiles.length);
 for(const t of tiles)for(const p of furnaceFloorBand(t))assert.equal(inMap(map,p.x,p.y,0),true);
});

test('closed central cover remains solid in cover mode and vanishes in the actual opened channel',()=>{
 const cover=mapFromRegion(region,stages.cover),channel=mapFromRegion(region,stages.channel),a={x:384,y:464},b={x:384,y:336};
 assert.equal(traceSegment(cover,a,b,11).blocked,true);assert.equal(traceSegment(channel,a,b,11).blocked,false);
 for(const map of [cover,channel]){
  const closed=map===cover,segments=furnaceCoverSegments(FURNACE_REGION,map),marked=furnaceOpenFloor(FURNACE_REGION,map,a).flatMap(p=>p.tiles);
  assert.equal(segments.some(s=>s.tile.x===11&&s.tile.y===13&&s.side==='south'),closed);
  assert.equal(marked.some(t=>t.x===11&&t.y===13),!closed);
 }
});

test('partial/stale open geometry cannot advertise a complete channel or exhaust opening',()=>{
 for(const doorIndex of [2,3,4]){
  const map=mapFromRegion(region,stages.all),door=region.doors[doorIndex];map.tiles[door.y][door.x]=0;
  const cues=furnaceOpenFloor(FURNACE_REGION,map,{x:384,y:320},null,1000);
  assert.ok(!cues.some(c=>c.id===`${door.unlockObjective}:${doorIndex}`));
  assert.ok(cues.every(c=>c.tiles.every(t=>map.tiles[t.y][t.x]===1)));
 }
});

test('F architecture/paving obey map visibility, distance and exact region without mutation',()=>{
 const map=mapFromRegion(region,stages.all),seen=map.tiles.map(row=>row.map(()=>false));seen[13][10]=true;
 const before=structuredClone({map,seen}),hero={x:336,y:432};
 const marks=furnaceOpenFloor(FURNACE_REGION,freeze(map),hero,freeze(seen));assert.deepEqual(marks.flatMap(p=>p.tiles),[{x:10,y:13}]);
 const segments=furnaceCoverSegments(FURNACE_REGION,map,seen);assert.ok(segments.length>0);assert.ok(segments.every(s=>s.floor.x===10&&s.floor.y===13));
 assert.deepEqual(furnaceOpenFloor(FURNACE_REGION,map,{x:5000,y:5000},seen),[]);
 for(const id of [undefined,'ash_hamlet','ash_road','signal_basin']){assert.deepEqual(furnaceCoverSegments(id,map,seen),[]);assert.deepEqual(furnaceOpenFloor(id,map,hero,seen),[]);}
 assert.deepEqual({map,seen},before);
});

test('production F renderer replaces seeded tall clutter with low atlas masonry only',()=>{
 const {calls}=render(state('closed',{entities:[]})),baffles=atlasDraws(calls,'lowwall');assert.ok(baffles.length>0);
 for(const key of ['wallSE','wallSW','pillar','statue','rubble'])assert.equal(atlasDraws(calls,key).length,0,key);
 assert.ok(baffles.some(c=>c.transform[0]===-1));assert.ok(baffles.some(c=>c.transform[0]===1));
 for(const c of baffles){assert.equal(c.args[7],STYLE.coverWidth*ISO.zoom);assert.ok(c.args[8]<49*ISO.zoom*.6);assert.equal(c.globalAlpha,1);}
 assert.equal(bandFills(calls).length,0);assert.equal(boundaryEdges(calls).length,1);
});

test('all F cover, exact boundary edges and bands precede loot, threats, player and enemy bodies',()=>{
 const s=state('channel',{entities:[actor({telegraph:warning})],loot:[{type:'gold',x:384,y:464,bob:0}],effects:[{type:'zone',x:384,y:464,r:50,color:'#ed9966',life:1,max:1}]});
 const {calls}=render(s),ground=sceneCalls(calls),last=Math.max(...ground.map(c=>calls.indexOf(c)));assert.ok(ground.length>0);assert.ok(bandFills(calls).length>0);
 const later=calls.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id)||c.op==='stroke'&&['#f29187','#ffe5a6','#ed9966'].includes(c.strokeStyle)||c.op==='fillRect'&&c.fillStyle==='#e8c07b');
 assert.ok(later.length>=6);assert.ok(later.every(c=>calls.indexOf(c)>last));
 assert.equal(calls.filter(c=>c.op==='fill'&&c.fillStyle===STYLE.edgeColor).length,0);
});

test('full renderer cannot paint unseen architecture or floor cues',()=>{
 const s=state('all',{entities:[]});s.seen=s.map.tiles.map(row=>row.map(()=>false));
 const {calls}=render(s);assert.equal(sceneCalls(calls).length,0);assert.equal(atlasDraws(calls,'pillar').length,0);
});

test('paving paths stay within each actually open tile and keep original warning/hero geometry',()=>{
 const s=state('channel',{entities:[actor({telegraph:warning})],targetId:'furnace-tender-1'}),a=render(s),b=render({...s,regionId:'ash_road'}),tiles=furnaceOpenFloor(FURNACE_REGION,s.map,s.p).flatMap(p=>p.tiles);
 assert.equal(bandFills(a.calls).length,tiles.length);
 for(const [i,t] of tiles.entries()){
  const expected=furnaceFloorBand(t).map((v,j)=>{const q=projectWorld(v.x-s.p.x,v.y-s.p.y);return [j?'lineTo':'moveTo',s.width*.5+q.x*ISO.zoom,s.height*.55+q.y*ISO.zoom];});
  const actual=bandFills(a.calls)[i].path.slice(0,4);
  for(let j=0;j<4;j++){assert.equal(actual[j][0],expected[j][0]);for(let k=1;k<=2;k++)assert.ok(Math.abs(actual[j][k]-expected[j][k])<1e-9);}
 }
 const retained=calls=>calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='hero'||c.op==='stroke'&&['#f29187','#ffe5a6','#ffe5ac'].includes(c.strokeStyle));
 assert.deepEqual(retained(a.calls),retained(b.calls));
});

test('low baffles and passage bands are static under reduced flashes and time changes',()=>{
 const s=state('all',{entities:[]}),a=render(s),b=render({...s,reduced:true,flashScale:0,time:8});assert.deepEqual(sceneCalls(a.calls),sceneCalls(b.calls));
});

test('F uses the same geometry with floor caching, including in-place open/seen changes',()=>{
 const s=state('closed',{entities:[]}),{renderer,calls,metrics}=render(s,{cached:true});assert.equal(metrics.floorCache.enabled,true);
 assert.deepEqual(sceneCalls(calls),sceneCalls(render(s).calls));calls.length=0;
 const open=mapFromRegion(region,stages.channel);s.map.tiles=open.tiles;renderer.render(s);
 assert.ok(renderer.metrics().floorCache.rebuilt);assert.deepEqual(sceneCalls(calls),sceneCalls(render(s).calls));assert.ok(bandFills(calls).length>0);
 calls.length=0;s.seen=s.map.tiles.map(row=>row.map(()=>false));renderer.render(s);assert.ok(renderer.metrics().floorCache.rebuilt);assert.equal(sceneCalls(calls).length,0);
});

test('non-F scenes retain legacy tall atlas drawing and receive no F geometry',()=>{
 for(const id of [undefined,'ash_hamlet','ash_road','windscar_pass','signal_basin']){
  const s=state('all',{regionId:id,entities:[]}),a=render(s);assert.equal(sceneCalls(a.calls).length,0);assert.ok(atlasDraws(a.calls,'wallSW').length>0);assert.ok(atlasDraws(a.calls,'pillar').length>0);
  if(id!=='signal_basin')assert.deepEqual(a.calls,render({...s,regionId:undefined}).calls);
 }
});

test('the actual main.js renderer call passes live F map and region without a preview shim',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf('const renderObservation=inputLatency.renderEntered('),end=source.indexOf('drawLabels(sceneVisibility);',start)+'drawLabels(sceneVisibility);'.length;
 assert.ok(start>0&&end>start);const s=state('channel'),{renderer,calls}=render(state());calls.length=0;
 const battle={region:FURNACE_REGION,map:s.map,p:s.p,enemies:s.entities,shots:[],effects:[],floaters:[],time:0,shake:0,stats:{},targetId:null};let labels=0;
 const currentState={options:{screenShake:0,flashes:0}};
 runInNewContext(source.slice(start,end),{...createMainInputFixture(),config:()=>controlsFor(currentState),tombWardCarried,sceneVisibility:wildernessSceneVisibility(battle),renderer,canvas:{width:s.width,height:s.height},battle,objects:[],state:currentState,drawLabels(){labels++;}});
 assert.ok(atlasDraws(calls,'lowwall').length);assert.ok(bandFills(calls).length);assert.equal(labels,1);
});

let earned;
function earnedEntry(){
 if(earned)return structuredClone(earned);
 let s=earnedPassRoute();const smith={x:250,y:470};s=run(s,{type:'acceptSignalQuest',...report(s,smith)}).state;s=travel(s,'town-signal-entry');
 const objects=SIGNAL_REGIONS.signal_basin.objects,interact=id=>{s=run(s,{type:'interactSignal',objectId:id,...report(s,objects.find(o=>o.id===id))}).state;};
 s=settle(s,SIGNAL_GROUPS.entry);interact('signal-code');for(const id of SIGNAL_ROUTES.west.order)interact('signal-route-'+id);
 s=settle(s,SIGNAL_GROUPS.yard,{x:416,y:400});interact('signal-transmitter');s=settle(s,SIGNAL_GROUPS.receiver,{x:416,y:136});interact('signal-receiver');
 s=travel(s,'signal-town-return');s=run(s,{type:'reportSignalQuest',...report(s,smith)}).state;s=run(s,{type:'acceptFurnaceQuest',...report(s,smith)}).state;
 earned=travel(s,'town-furnace-entry');return structuredClone(earned);
}
const battleView=b=>state('closed',{map:b.map,p:b.p,entities:b.enemies,shots:b.shots,effects:b.effects,floaters:b.floaters,time:b.time,stats:b.stats});

test('rendering the production earned-entry battle preserves aim, map, state and durable save bytes',()=>{
 const s=earnedEntry(),b=createBattle(s),before=structuredClone(b),data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(data),pointer={x:530,y:350},aim=resolveCursorAim(pointer,b,1000,750);
 render(freeze(battleView(b)));assert.deepEqual(b,before);assert.deepEqual(resolveCursorAim(pointer,b,1000,750),aim);assert.deepEqual(data,bytes);assert.equal(b.enemies.length,17);
});

test('interleaved full rendering does not change actual combat timing, contacts, damage or outcomes',()=>{
 const s=earnedEntry(),a=createBattle(s);a.p.x=208;a.p.y=464;a.awaitingAdvance=false;const b=structuredClone(a);
 for(let i=0;i<60;i++){const input={attack:true,aim:{x:240,y:464}};stepBattle(a,s.character,.05,input);stepBattle(b,s.character,.05,input);render(battleView(b));assert.deepEqual(b,a);}
 assert.ok(a.contacts>0);assert.ok(a.enemies.some(e=>e.hp<e.max));
});

for(const mode of ['cover','channel'])for(const enemy of [false,true])test(`${mode}: ${enemy?'hostile shot':'player hammer'} obeys the same visible center baffle`,()=>{
 // Deliberately positioned combat-boundary fixture, not earned route evidence.
 const s=earnedEntry(),b=createBattle(s);b.map=mapFromRegion(region,stages[mode]);b.awaitingAdvance=false;b.p.x=384;b.p.y=464;b.p.invuln=0;
 b.enemies=[{...b.enemies[0],x:384,y:336,gate:'fixture_inert',active:false}];const hp=b.p.hp,targetHp=b.enemies[0].hp;
 if(enemy)b.shots.push({kind:'arrow',enemy:true,x:384,y:336,vx:0,vy:240,damage:10,life:2});
 const events=[];for(let i=0;i<50;i++){events.push(...stepBattle(b,s.character,.02,!enemy&&i===0?{hammer:true,aim:{x:384,y:336}}:{}));render(battleView(b));}
 if(mode==='cover'){assert.ok(!events.some(e=>e.type==='heroHurt'));assert.equal(b.p.hp,hp);assert.equal(b.enemies[0].hp,targetHp);assert.equal(b.shots.length,0);assert.equal(bandFills(render(battleView(b)).calls).length,10);}
 else if(enemy)assert.ok(events.some(e=>e.type==='heroHurt'),'an open lane reaches the hero even if their earned passive shield blocks its damage');else assert.ok(b.enemies[0].hp<targetHp);
});
