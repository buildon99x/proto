import {createMainInputFixture} from './support/main-input-fixture.mjs';
import {controlsFor} from '../src/controls.js';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {tombWardCarried} from '../src/tomb.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {signalRolePresentation,SIGNAL_MARK_STYLE as STYLE} from '../src/signal-readability.js';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {combatActorOpacity} from '../src/combat-readability.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {FURNACE_REGION,FURNACE_REGIONS,FURNACE_FOES} from '../src/furnace-content.js';
import {ART} from '../src/art.js';

// Authored role cues, tested through the production renderer with scripted
// positions and a recording Canvas2D boundary. This is not visual acceptance.
const kinds=Object.keys(FURNACE_FOES),signalKinds=['signal_runner','signal_archer','signal_keeper'];
const actor=(kind=kinds[0],extra={})=>({id:kind,kind,type:kind==='furnace_nozzle'?'mage':'guardian',x:336,y:464,hp:FURNACE_FOES[kind].hp,max:FURNACE_FOES[kind].hp,active:true,state:'idle',angle:0,...extra});
const state=(extra={})=>({width:1000,height:750,regionId:FURNACE_REGION,map:mapFromRegion(FURNACE_REGIONS[FURNACE_REGION]),p:{x:384,y:528,hp:100,angle:0},entities:kinds.map((k,i)=>actor(k,{x:304+i*64})),time:0,cleanView:true,...extra});
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const gradient=Object.freeze({addColorStop(){}});
function render(s){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...data});
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)}),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null}),metrics=renderer.render(s);return {calls,metrics,renderer};
}
const inners=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.roleColor);
const outlines=calls=>calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.roleOutlineColor);
const withoutRoles=calls=>calls.filter(c=>c.op!=='stroke'||![STYLE.roleColor,STYLE.roleOutlineColor].includes(c.strokeStyle));
const warning={phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:336,y:464,x2:336,y2:304,width:14}]};

test('F tender, nozzle and warden reuse distinct frozen S glyphs without inheriting S body scaling',()=>{
 const roles=kinds.map(kind=>signalRolePresentation({kind},FURNACE_REGION));
 assert.deepEqual(roles.map(r=>r?.mark),['double-chevron','forked-arrow','broad-shield']);
 for(const [i,role] of roles.entries()){
  assert.equal(role.lines,signalRolePresentation({kind:signalKinds[i]},'signal_basin').lines);
  assert.ok(Object.isFrozen(role)&&Object.isFrozen(role.lines));
  assert.equal(role.height,undefined);assert.equal(role.widthScale,undefined);
 }
});

test('role mapping is specific to the matching region and never marks unknown or cross-region kinds',()=>{
 for(const kind of kinds)for(const region of [undefined,'ash_road','ash_hamlet','windscar_pass','signal_basin'])assert.equal(signalRolePresentation({kind},region),null);
 for(const kind of [...signalKinds,'scout','archer','warden','__proto__','constructor',null,undefined])assert.equal(signalRolePresentation({kind},FURNACE_REGION),null);
 assert.equal(signalRolePresentation(null,FURNACE_REGION),null);
 assert.deepEqual(signalKinds.map(kind=>{const r=signalRolePresentation({kind},'signal_basin');return [r.height,r.widthScale];}),[[42,.9],[46,.86],[52,1.1]]);
});

test('production F renderer draws all three exact paths with the established keyline and foot-shadow offset',()=>{
 const s=state(),{calls}=render(s),inner=inners(calls),outline=outlines(calls);assert.equal(inner.length,3);assert.equal(outline.length,3);
 for(const [i,e] of s.entities.entries()){
  const role=signalRolePresentation(e,FURNACE_REGION),q=projectWorld(e.x-s.p.x,e.y-s.p.y),x=s.width*.5+q.x*ISO.zoom,y=s.height*.55+q.y*ISO.zoom;
  const expected=role.lines.flatMap(line=>line.map(([px,py],j)=>[j?'lineTo':'moveTo',x+px*ISO.zoom,y+(py+8)*ISO.zoom]));
  assert.equal(inner[i].path.length,expected.length);
  for(const [j,p] of expected.entries()){assert.equal(inner[i].path[j][0],p[0]);for(let k=1;k<=2;k++)assert.ok(Math.abs(inner[i].path[j][k]-p[k])<1e-9);}
  assert.deepEqual(outline[i].path,inner[i].path);assert.equal(calls.indexOf(inner[i]),calls.indexOf(outline[i])+1);
  assert.deepEqual([outline[i].lineWidth,inner[i].lineWidth,outline[i].globalAlpha,inner[i].globalAlpha],[3.25,1.25,.85,.8]);
  assert.ok(Math.min(...inner[i].path.map(p=>p[2]))-outline[i].lineWidth/2>y+6);
 }
});

test('F role strokes stay below loot, danger areas, locked tells and actor bodies',()=>{
 const s=state({entities:[actor(kinds[0],{telegraph:warning})],loot:[{type:'gold',x:336,y:464,bob:0}],effects:[{type:'zone',x:336,y:464,r:50,color:'#ed9966',life:1,max:1}]}),{calls}=render(s),marks=[...inners(calls),...outlines(calls)];
 assert.equal(marks.length,2);const last=Math.max(...marks.map(c=>calls.indexOf(c)));
 const later=calls.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id)||c.op==='stroke'&&['#f29187','#ffe5a6','#ed9966'].includes(c.strokeStyle)||c.op==='fillRect'&&c.fillStyle==='#e8c07b');
 assert.ok(later.length>=6);assert.ok(later.every(c=>calls.indexOf(c)>last));
 assert.ok(!calls.some(c=>c.op==='fill'&&[STYLE.roleColor,STYLE.roleOutlineColor].includes(c.fillStyle)));
});

for(const [label,extra] of [['inactive',{active:false}],['zero HP',{hp:0}],['dead',{dead:true,deathTime:.5}],['offscreen',{x:8000,y:8000}]])test(`F ground glyphs exclude ${label} actors of every role`,()=>{
 const {calls}=render(state({entities:kinds.map(k=>actor(k,extra))}));assert.equal(inners(calls).length,0);assert.equal(outlines(calls).length,0);
});

test('F ground glyphs obey actual fog visibility independently for each live actor',()=>{
 const s=state();s.seen=s.map.tiles.map(row=>row.map(()=>false));let result=render(s);assert.equal(inners(result.calls).length,0);assert.equal(outlines(result.calls).length,0);
 const e=s.entities[1];s.seen[Math.floor(e.y/32)][Math.floor(e.x/32)]=true;result=render(s);assert.equal(inners(result.calls).length,1);assert.equal(outlines(result.calls).length,1);
});

test('reduced-flash F mode retains static glyph paths while suppressing actor hit brightness',()=>{
 const s=state({entities:kinds.map(k=>actor(k,{flash:1}))}),a=render(s),b=render({...s,reduced:true,flashScale:0,time:8});
 assert.equal(inners(a.calls).length,3);assert.deepEqual(inners(a.calls),inners(b.calls));assert.deepEqual(outlines(a.calls),outlines(b.calls));
 assert.ok(a.calls.some(c=>c.op==='drawImage'&&c.filter.startsWith('brightness')));assert.ok(!b.calls.some(c=>c.op==='drawImage'&&c.filter.startsWith('brightness')));
});

test('adding F glyphs preserves every other render command, metrics, state and actor occlusion',()=>{
 const s=state({entities:kinds.map((k,i)=>actor(k,{x:336+i*32,y:544,hp:20,telegraph:warning})),targetId:kinds[0]}),before=structuredClone(s),a=render(freeze(s));
 const b=render({...s,entities:s.entities.map(e=>({...e,kind:'unmapped_fixture'}))});
 assert.deepEqual(withoutRoles(a.calls),b.calls);assert.deepEqual(a.metrics,b.metrics);assert.deepEqual(s,before);
 for(const e of s.entities)assert.equal(combatActorOpacity(e,s.p,FURNACE_REGION),combatActorOpacity({...e,kind:'unmapped_fixture'},s.p,FURNACE_REGION));
});

test('F kinds do not alter non-F render output or enable S passage cues elsewhere',()=>{
 for(const regionId of [undefined,'ash_hamlet','ash_road','windscar_pass','signal_basin']){
  const s=state({regionId}),a=render(s),b=render({...s,entities:s.entities.map(e=>({...e,kind:'unmapped_fixture'}))});
  assert.equal(inners(a.calls).length,0);assert.equal(outlines(a.calls).length,0);assert.deepEqual(a.calls,b.calls);assert.deepEqual(a.metrics,b.metrics);
 }
 const {calls}=render(state());assert.equal(calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.passageColor).length,0);
});

test('the actual main renderer handoff draws each live F role without a preview-only path',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf('const renderObservation=inputLatency.renderEntered('),end=source.indexOf('drawLabels(sceneVisibility);',start)+'drawLabels(sceneVisibility);'.length;
 assert.ok(start>0&&end>start);const s=state(),{renderer,calls}=render(state({entities:[]}));calls.length=0;
 const battle={region:FURNACE_REGION,map:s.map,p:s.p,enemies:s.entities,shots:[],effects:[],floaters:[],time:0,shake:0,stats:{},targetId:null};let labels=0;
 const currentState={options:{screenShake:0,flashes:0}};
 runInNewContext(source.slice(start,end),{...createMainInputFixture(),visibleTownPortal:()=>null,config:()=>controlsFor(currentState),tombWardCarried,sceneVisibility:wildernessSceneVisibility(battle),renderer,canvas:{width:s.width,height:s.height},battle,objects:[],state:currentState,drawLabels(){labels++;}});
 assert.equal(inners(calls).length,3);assert.equal(outlines(calls).length,3);assert.equal(labels,1);
});
