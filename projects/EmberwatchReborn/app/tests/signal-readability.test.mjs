import {createMainInputFixture} from './support/main-input-fixture.mjs';
import {controlsFor} from '../src/controls.js';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {tombWardCarried} from '../src/tomb.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {signalRolePresentation,signalOpenPassages,signalPassageTickLines,SIGNAL_MARK_STYLE as STYLE} from '../src/signal-readability.js';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {combatActorOpacity} from '../src/combat-readability.js';
import {mapFromRegion,inMap,traceSegment} from '../src/world-geometry.js';
import {SIGNAL_REGIONS,SIGNAL_FOES,SIGNAL_REWARDS} from '../src/signal-content.js';
import {ART} from '../src/art.js';
import {createBattle,stepBattle} from '../src/combat.js';
import {resolveCursorAim} from '../src/cursor-targeting.js';
import {createStore} from '../src/save.js';
import {earnedPassRoute} from './support/earned-pass-route.mjs';
import {run,report,travel} from './support/earned-route.mjs';

// Production render/combat handlers, with a recording Canvas2D boundary and
// scripted fixture positions. These checks are not pixels or normal-input QA.
const REGION='signal_basin',region=SIGNAL_REGIONS[REGION],kinds=Object.keys(SIGNAL_FOES);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const actor=(kind='signal_runner',extra={})=>({id:kind,kind,type:kind==='signal_archer'?'mage':'guardian',x:416,y:240,hp:SIGNAL_FOES[kind].hp,max:SIGNAL_FOES[kind].hp,active:true,state:'idle',angle:0,...extra});
const state=(extra={})=>({width:900,height:650,regionId:REGION,map:mapFromRegion(region,{signal_west_open:1,signal_transmitter_restored:1}),p:{x:416,y:320,hp:100,angle:0},entities:kinds.map((k,i)=>actor(k,{x:352+i*64,y:256})),cleanView:true,time:0,...extra});
function recordingContext(){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:structuredClone(path),...data});
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},rotate(){},setLineDash(){},createRadialGradient(){return {addColorStop(){}};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)});
 return {ctx,calls};
}
function render(s){const {ctx,calls}=recordingContext(),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null});const metrics=renderer.render(s);return {calls,metrics,renderer};}
const roleStrokes=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.roleColor);
const roleOutlines=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.roleOutlineColor);
const passageStrokes=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.passageColor);
const warningStrokes=calls=>calls.filter(c=>c.op==='stroke'&&['#f29187','#ffe5a6'].includes(c.strokeStyle));
const enemyDraws=calls=>calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='enemy');
const warning={phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'cone',x:416,y:256,angle:1,r:112,halfAngle:.3}]};

test('S roles have distinct static shapes and bounded proportions independent of color',()=>{
 const roles=kinds.map(kind=>signalRolePresentation({kind},REGION));
 assert.equal(new Set(roles.map(r=>r.mark)).size,3);assert.equal(new Set(roles.map(r=>JSON.stringify(r.lines))).size,3);
 assert.deepEqual(roles.map(r=>[r.height,r.widthScale]),[[42,.9],[46,.86],[52,1.1]]);
 for(const role of roles){assert.ok(Object.isFrozen(role)&&Object.isFrozen(role.lines));for(const point of role.lines.flat())assert.ok(Math.abs(point[0])<=18&&Math.abs(point[1])<=12);}
 assert.ok(STYLE.roleAlpha<=.8&&STYLE.roleOutlineAlpha<=.85);
 assert.deepEqual([STYLE.passageColor,STYLE.passageAlpha,STYLE.passageWidth],['#9faeaa',.45,1.2]);
});

test('role treatment is excluded from other regions and unknown actors',()=>{
 for(const kind of kinds)for(const id of [undefined,'ash_road','ash_hamlet','windscar_pass'])assert.equal(signalRolePresentation({kind},id),null);
 for(const kind of ['scout','archer','warden',null,undefined])assert.equal(signalRolePresentation({kind},REGION),null);
});

for(const side of ['west','east'])test(`only the actually open ${side} threshold receives landing marks`,()=>{
 const map=mapFromRegion(region,{[`signal_${side}_open`]:1}),hero={x:416,y:496};
 const marks=signalOpenPassages(REGION,map,hero,null,400);assert.deepEqual(marks.map(m=>m.id),[`signal_${side}_open`]);
 assert.equal(marks[0].tiles.length,3);for(const t of marks[0].tiles)assert.equal(map.tiles[t.y][t.x],1);
});

test('north threshold has real landing tiles on both sides and never paints a closed gate',()=>{
 const p={x:416,y:240},closed=mapFromRegion(region),open=mapFromRegion(region,{signal_transmitter_restored:1});
 assert.deepEqual(signalOpenPassages(REGION,closed,p),[]);
 const [mark]=signalOpenPassages(REGION,open,p);assert.equal(mark.id,'signal_transmitter_restored');assert.equal(mark.tiles.length,6);
 assert.deepEqual([...new Set(mark.tiles.map(t=>t.y))],[4,5,6]);
 for(const t of mark.tiles)for(const line of signalPassageTickLines(t))for(const pt of line)assert.ok(inMap(open,pt.x,pt.y,0));
 assert.equal(traceSegment(closed,{x:416,y:216},{x:416,y:136},11).blocked,true);
 assert.equal(traceSegment(open,{x:416,y:216},{x:416,y:136},11).blocked,false);
});

test('partial or stale map geometry cannot advertise an open door',()=>{
 const map=mapFromRegion(region,{signal_transmitter_restored:1});map.tiles[5][11]=0;
 assert.deepEqual(signalOpenPassages(REGION,map,{x:416,y:240}),[]);
});

test('passage cues obey seen tiles, proximity and existing landing floor without mutation',()=>{
 const map=mapFromRegion(region,{signal_transmitter_restored:1}),seen=map.tiles.map(row=>row.map(()=>false));seen[5][12]=true;
 map.tiles[4][12]=0;const before=JSON.stringify({map,seen});
 const marks=signalOpenPassages(REGION,freeze(map),{x:416,y:240},freeze(seen));assert.deepEqual(marks[0].tiles,[{x:12,y:5}]);
 assert.deepEqual(signalOpenPassages(REGION,map,{x:750,y:650},seen),[]);
 assert.deepEqual(signalOpenPassages('ash_road',map,{x:416,y:240},seen),[]);
 assert.equal(JSON.stringify({map,seen}),before);
});

test('production renderer draws static role and passage strokes below loot, danger and bodies',()=>{
 const s=state({entities:[actor('signal_keeper',{telegraph:warning})],loot:[{x:416,y:240,type:'gold',bob:0}]});
 const {calls}=render(s),roles=roleStrokes(calls),passages=passageStrokes(calls);assert.equal(roles.length,1);assert.equal(passages.length,6);
 const lastMark=Math.max(...[...roles,...roleOutlines(calls),...passages].map(c=>calls.indexOf(c)));
 const loot=calls.findIndex(c=>c.op==='fillRect'&&c.fillStyle==='#e8c07b');assert.ok(lastMark<loot);
 assert.ok(warningStrokes(calls).length>0);assert.ok(warningStrokes(calls).every(c=>calls.indexOf(c)>lastMark));
 assert.ok(enemyDraws(calls).every(c=>calls.indexOf(c)>lastMark));
 assert.ok(calls.filter(c=>c.op==='fill').every(c=>![STYLE.roleColor,STYLE.roleOutlineColor,STYLE.passageColor].includes(c.fillStyle)));
});

test('each role uses one dark outline followed immediately by its unchanged bright inner path',()=>{
 const {calls}=render(state()),outlines=roleOutlines(calls),inners=roleStrokes(calls);
 assert.equal(outlines.length,3);assert.equal(inners.length,3);
 for(let i=0;i<3;i++){
  assert.equal(calls.indexOf(inners[i]),calls.indexOf(outlines[i])+1);
  assert.deepEqual(outlines[i].path,inners[i].path);
  assert.equal(outlines[i].lineWidth,3.25);assert.equal(inners[i].lineWidth,1.25);
  assert.equal(outlines[i].globalAlpha,.85);assert.equal(inners[i].globalAlpha,.8);
  assert.ok(!inners[i].path.some(row=>row[0]==='ellipse'||row[0]==='closePath'));
 }
});

test('role symbols retain their exact dimensions and move only eight units below the feet',()=>{
 const s=state(),inners=roleStrokes(render(s).calls);
 for(let i=0;i<inners.length;i++){
  const e=s.entities[i],role=signalRolePresentation(e,REGION),q=projectWorld(e.x-s.p.x,e.y-s.p.y);
  const x=s.width*.5+q.x*ISO.zoom,y=s.height*.55+q.y*ISO.zoom;
  const expected=role.lines.flatMap(line=>line.map(([px,py],j)=>[j?'lineTo':'moveTo',x+px*ISO.zoom,y+(py+8)*ISO.zoom]));
  assert.equal(inners[i].path.length,expected.length);
  for(let j=0;j<expected.length;j++){assert.equal(inners[i].path[j][0],expected[j][0]);assert.ok(Math.abs(inners[i].path[j][1]-expected[j][1])<1e-9);assert.ok(Math.abs(inners[i].path[j][2]-expected[j][2])<1e-9);}
  assert.ok(Math.min(...inners[i].path.map(p=>p[2]))-STYLE.roleOutlineWidth/2>y+6,'every line clears the five-pixel foot shadow plus its one-pixel offset');
 }
});

test('neither outline nor inner stroke leaks into non-S or inactive combat views',()=>{
 for(const s of [state({regionId:'ash_road'}),state({entities:[actor('signal_runner',{active:false}),actor('signal_archer',{hp:0,dead:true,deathTime:.4})]})]){
  const {calls}=render(s);assert.equal(roleOutlines(calls).length,0);assert.equal(roleStrokes(calls).length,0);
 }
});

test('role ground marks exclude dead, inactive, hidden and offscreen actors',()=>{
 const s=state({entities:[actor('signal_runner',{hp:0,dead:true,deathTime:.5}),actor('signal_archer',{active:false}),actor('signal_keeper',{x:8000,y:8000})]});
 assert.equal(roleStrokes(render(s).calls).length,0);
 s.entities=[actor()];s.seen=s.map.tiles.map(row=>row.map(()=>false));assert.equal(roleStrokes(render(s).calls).length,0);
});

test('renderer applies the three visual silhouettes without changing ground anchors or health',()=>{
 const s=state(),before=structuredClone(s),draws=enemyDraws(render(freeze(s)).calls);assert.equal(draws.length,3);
 for(let i=0;i<draws.length;i++){
  const role=signalRolePresentation(s.entities[i],REGION),frame=ART.enemy.frames[9],k=role.height*ISO.zoom/ART.enemy.bodyHeight;
  assert.equal(draws[i].args[7],frame.w*(k*role.widthScale));assert.equal(draws[i].args[8],frame.h*k);
  const q=projectWorld(s.entities[i].x-s.p.x,s.entities[i].y-s.p.y);
  assert.equal(draws[i].args[5],Math.round(s.width*.5+q.x*ISO.zoom-frame.ax*(k*role.widthScale)));
  assert.equal(draws[i].args[6],Math.round(s.height*.55+q.y*ISO.zoom-frame.ay*k));
 }
 assert.deepEqual(s,before);
});

test('non-S rendering retains legacy body dimensions and emits no S marks or added cutaways',()=>{
 const s=state({regionId:'ash_road'}),a=render(s),b=render({...s,regionId:undefined});
 assert.equal(roleStrokes(a.calls).length,0);assert.equal(passageStrokes(a.calls).length,0);assert.deepEqual(a.metrics,b.metrics);
 assert.deepEqual(enemyDraws(a.calls),enemyDraws(b.calls));
 for(const draw of enemyDraws(a.calls)){const frame=ART.enemy.frames[9],k=46*ISO.zoom/ART.enemy.bodyHeight;assert.equal(draw.args[7],frame.w*k);assert.equal(draw.args[8],frame.h*k);}
});

test('reduced flashes preserves static cues and telegraphs while suppressing actor hit brightness',()=>{
 const s=state({entities:[actor('signal_keeper',{flash:1,telegraph:warning})]}),normal=render(s),reduced=render({...s,reduced:true,flashScale:0,time:4});
 assert.deepEqual(roleStrokes(normal.calls),roleStrokes(reduced.calls));assert.deepEqual(roleOutlines(normal.calls),roleOutlines(reduced.calls));assert.deepEqual(passageStrokes(normal.calls),passageStrokes(reduced.calls));assert.deepEqual(warningStrokes(normal.calls),warningStrokes(reduced.calls));
 assert.ok(enemyDraws(normal.calls).some(c=>c.filter.startsWith('brightness')));assert.ok(enemyDraws(reduced.calls).every(c=>!c.filter.startsWith('brightness')));
});

test('role cues leave danger paths, target reticle and hero art dimensions unchanged',()=>{
 const s=state({entities:[actor('signal_keeper',{telegraph:warning})],targetId:'signal_keeper'}),a=render(s),b=render({...s,regionId:'ash_road'});
 assert.deepEqual(warningStrokes(a.calls),warningStrokes(b.calls));
 assert.deepEqual(a.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#ffe5ac'),b.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#ffe5ac'));
 assert.deepEqual(a.calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='hero'),b.calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='hero'));
});

test('taller S keeper retains local player-occlusion protection without changing non-S behavior',()=>{
 const hero={x:200,y:200},keeper=actor('signal_keeper',{x:238,y:238});
 assert.equal(combatActorOpacity(keeper,hero,REGION),.64);assert.equal(combatActorOpacity(keeper,hero,'ash_road'),1);
 assert.equal(combatActorOpacity({...keeper,active:false},hero,REGION),1);assert.equal(combatActorOpacity({...keeper,hp:0},hero,REGION),1);
});

test('production renderer adds only local cutaways at a genuinely opened north landing',()=>{
 const s=state({p:{x:416,y:400,hp:100},entities:[]}),a=render(s),b=render({...s,regionId:'ash_road'});
 assert.equal(passageStrokes(a.calls).length,6);assert.ok(a.metrics.fadedForeground>b.metrics.fadedForeground);
 const architecture=calls=>calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='environment'&&c.args[2]>200);
 const before=architecture(b.calls),after=architecture(a.calls);assert.equal(after.length,before.length);
 assert.ok(after.some((c,i)=>c.globalAlpha<before[i].globalAlpha));assert.ok(after.some((c,i)=>c.globalAlpha===1&&before[i].globalAlpha===1));
 assert.equal(passageStrokes(render({...s,map:mapFromRegion(region)}).calls).length,0);
});

test('actual main renderer call supplies the live region and map without changing options or objects',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf('renderer.render({width:canvas.width'),end=source.indexOf('drawLabels(sceneVisibility);',start)+'drawLabels(sceneVisibility);'.length;
 assert.ok(start>0&&end>start);const s=state(),{renderer,calls}=render(state({entities:[]}));calls.length=0;
 const battle={region:REGION,map:s.map,p:s.p,enemies:s.entities,shots:[],effects:[],floaters:[],time:0,shake:0,stats:{},targetId:null};let labels=0;
 const currentState={options:{screenShake:0,flashes:0}};
 runInNewContext(source.slice(start,end),{...createMainInputFixture(),config:()=>controlsFor(currentState),tombWardCarried,sceneVisibility:wildernessSceneVisibility(battle),renderer,canvas:{width:900,height:650},battle,objects:[],state:currentState,drawLabels(){labels++;}});
 assert.equal(roleStrokes(calls).length,3);assert.equal(passageStrokes(calls).length,6);assert.equal(labels,1);
});

let earned;
function signalState(){
 let s=structuredClone(earned??=earnedPassRoute());s=run(s,{type:'acceptSignalQuest',...report(s,{x:250,y:470})}).state;return travel(s,'town-signal-entry');
}
function battleView(b){return state({map:b.map,p:b.p,entities:b.enemies,shots:b.shots,effects:b.effects,floaters:b.floaters,time:b.time,stats:b.stats});}

test('rendering leaves the live battle, aim interpretation, collision and durable save bytes unchanged',()=>{
 const s=signalState(),b=createBattle(s);b.p.x=192;b.p.y=592;b.enemies[0].active=true;
 const q=projectWorld(b.enemies[0].x-b.p.x,b.enemies[0].y-b.p.y),pointer={x:450+q.x*ISO.zoom,y:357.5+q.y*ISO.zoom-20};
 const aim=resolveCursorAim(pointer,b,900,650),before=structuredClone(b),data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(store.save(s,{expectedRevision:0}).ok,true);const bytes=new Map(data);render(freeze(battleView(b)));
 assert.deepEqual(b,before);assert.deepEqual(resolveCursorAim(pointer,b,900,650),aim);assert.deepEqual(data,bytes);
 assert.ok(inMap(b.map,b.p.x,b.p.y));assert.equal(b.enemies.length,16);
});

test('interleaved rendering does not alter real combat contacts, damage, timing or outcomes',()=>{
 const s=signalState(),a=createBattle(s);a.p.x=192;a.p.y=592;const b=structuredClone(a);
 for(let i=0;i<60;i++){
  const input={attack:true,aim:{x:224,y:592}};stepBattle(a,s.character,.05,input);stepBattle(b,s.character,.05,input);render(battleView(b));
  assert.deepEqual(b,a);
 }
 assert.ok(a.contacts>0);assert.ok(a.enemies.some(e=>e.hp<e.max));
});

test('S roster, authored health and exact reward budget stay unchanged',()=>{
 assert.equal(region.foes.length,16);assert.deepEqual(kinds.map(k=>SIGNAL_FOES[k].hp),[58,44,82]);
 const sums=region.foes.reduce((a,e)=>({xp:a.xp+SIGNAL_FOES[e.kind].xp,gold:a.gold+SIGNAL_FOES[e.kind].gold}),{xp:0,gold:0});
 for(const reward of Object.values(SIGNAL_REWARDS)){sums.xp+=reward.xp;sums.gold+=reward.gold;}
 assert.deepEqual(sums,{xp:1140,gold:232});
});
