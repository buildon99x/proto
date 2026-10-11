import {createMainInputFixture} from './support/main-input-fixture.mjs';
import {controlsFor} from '../src/controls.js';
import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import {tombWardCarried} from '../src/tomb.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fireAreaOutline,sectorContains,SECTOR_TARGET_PADDING,FIRE_AREA_STYLE as STYLE} from '../src/fire-area-presentation.js';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {inMap,lineOfSight} from '../src/world-geometry.js';
import {ART} from '../src/art.js';
const openMap=()=>({w:24,h:24,rooms:[],tiles:Array.from({length:24},()=>Array(24).fill(1))});
const area=(extra={})=>({id:1,x:320,y:320,angle:0,range:128,arcRadians:Math.PI*2/3,age:1,duration:5,damage:20,...extra});
const scene=(extra={})=>({width:1000,height:750,regionId:'ember_furnace',map:openMap(),p:{x:320,y:320,hp:100,angle:0},entities:[],areas:[area()],effects:[],time:1,cleanView:true,...extra});
const gradient=Object.freeze({addColorStop(){}});
function render(s){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...data});
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)}),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null}),metrics=renderer.render(s);return {calls,metrics,renderer};
}

const strokes=r=>r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.edge);
const fills=r=>r.calls.filter(c=>c.op==='fill'&&c.fillStyle===STYLE.fill);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

test('existing sector center tolerance and angular boundary are shared with combat unchanged',()=>{
 assert.equal(SECTOR_TARGET_PADDING,10);const map=openMap(),a=area();
 for(const radius of [0,20,128,137.99,138,138.01,150])for(const theta of [-2,-Math.PI/3-.001,-Math.PI/3,0,Math.PI/3,Math.PI/3+.001,2]){
  const p={x:a.x+Math.cos(theta)*radius,y:a.y+Math.sin(theta)*radius};
  const delta=Math.atan2(Math.sin(Math.atan2(p.y-a.y,p.x-a.x)-a.angle),Math.cos(Math.atan2(p.y-a.y,p.x-a.x)-a.angle));
  const old=lineOfSight(map,a,p)&&Math.hypot(p.x-a.x,p.y-a.y)<=a.range+10&&Math.abs(delta)<=a.arcRadians/2;
  assert.equal(sectorContains(map,p,a,a.angle,a.range,a.arcRadians),old);
 }
 const source=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');assert.match(source,/return alive\(e\)&&sectorContains\(b.map,e,origin,angle,range,arc\)/);
});
test('open-field outline follows actual range plus tolerance and exact sector side angles',()=>{
 const a=area(),p=fireAreaOutline(openMap(),a);assert.deepEqual(p[0],{x:a.x,y:a.y});assert.ok(p.length>80);
 for(const v of p.slice(1))assert.ok(Math.abs(Math.hypot(v.x-a.x,v.y-a.y)-138)<1e-9);
 for(const [v,angle] of [[p[1],-Math.PI/3],[p.at(-1),Math.PI/3]])assert.ok(Math.abs(Math.atan2(v.y-a.y,v.x-a.x)-angle)<1e-9);
});
test('closed walls clip the persistent footprint using production damage LOS traversal',()=>{
 const map=openMap();for(const row of map.tiles)row[12]=0;const a=area(),p=fireAreaOutline(map,a);
 assert.ok(p.slice(1).every(v=>v.x<384));for(const v of p)assert.ok(inMap(map,v.x,v.y,0)&&lineOfSight(map,a,v));
 assert.equal(sectorContains(map,{x:420,y:320},a,a.angle,a.range,a.arcRadians),false);
});
for(const [name,patch] of [['newborn',{age:0}],['between ticks',{age:.72}],['last instant',{age:4.999}]])test(`persistent footprint exists ${name}`,()=>{const r=render(scene({areas:[area(patch)]}));assert.equal(strokes(r).length,1);assert.equal(fills(r).length,1);});
for(const [name,patch] of [['expired',{age:5}],['past end',{age:5.1}],['negative age',{age:-1}],['no damage',{damage:0}],['bad range',{range:NaN}],['bad angle',{angle:Infinity}]])test(`invalid or inactive footprint is absent: ${name}`,()=>{assert.equal(strokes(render(scene({areas:[area(patch)]}))).length,0);});
test('actual renderer draws the clipped ground polygon with low-alpha fill and static edge',()=>{
 const s=scene(),r=render(s),edge=strokes(r)[0],fill=fills(r)[0];assert.equal(edge.globalAlpha,STYLE.edgeAlpha);assert.equal(fill.globalAlpha,.11);assert.equal(edge.lineWidth,1.7);assert.deepEqual(edge.path,fill.path);
 const expected=fireAreaOutline(s.map,s.areas[0]).map(v=>{const q=projectWorld(v.x-s.p.x,v.y-s.p.y);return [s.width*.5+q.x*ISO.zoom,s.height*.55+q.y*ISO.zoom];});
 expected.forEach((v,i)=>{assert.equal(edge.path[i][0],i?'lineTo':'moveTo');v.forEach((n,j)=>assert.ok(Math.abs(edge.path[i][j+1]-n)<1e-9));});
});
test('flash-zero retains identical footprint without animated brightness or simulation mutation',()=>{
 const s=scene(),before=structuredClone(s);const a=render(freeze(s)),b=render({...s,reduced:true,flashScale:0,time:99});assert.deepEqual(strokes(a),strokes(b));assert.deepEqual(fills(a),fills(b));assert.deepEqual(s,before);
});
test('area remains underneath loot, hostile warnings and player or enemy bodies',()=>{
 const enemy={id:'a',kind:'furnace_tender',type:'guardian',x:368,y:320,hp:54,max:54,active:true,state:'windup',angle:0,telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:368,y:320,x2:280,y2:320,width:14}]}};
 const r=render(scene({entities:[enemy],loot:[{type:'gold',x:352,y:320,bob:0}]})),idx=r.calls.indexOf(strokes(r)[0]);
 const later=r.calls.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id)||c.op==='stroke'&&c.strokeStyle==='#f29187'||c.op==='fillRect'&&c.fillStyle==='#e8c07b');assert.ok(later.length>=4);assert.ok(later.every(c=>r.calls.indexOf(c)>idx));
});
test('hidden footprint and absent areas leave the old renderer command stream untouched',()=>{
 const s=scene({areas:[]}),a=render(s),b=render({...s,areas:[area({age:5})]});assert.deepEqual(a.calls,b.calls);assert.deepEqual(a.metrics,b.metrics);
 const hidden=scene();hidden.seen=hidden.map.tiles.map(r=>r.map(()=>false));assert.equal(strokes(render(hidden)).length,0);
});
test('real main render handoff forwards the live area rather than a generated preview',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),start=source.indexOf('renderer.render({width:canvas.width'),end=source.indexOf('drawLabels(sceneVisibility);',start)+'drawLabels(sceneVisibility);'.length,s=scene(),r=render(scene({areas:[]}));r.calls.length=0;
 const battle={region:s.regionId,map:s.map,p:s.p,enemies:[],areas:s.areas,shots:[],effects:[],floaters:[],time:1,shake:0,stats:{},targetId:null};let labels=0;
 const currentState={options:{screenShake:0,flashes:0}};
 runInNewContext(source.slice(start,end),{...createMainInputFixture(),config:()=>controlsFor(currentState),tombWardCarried,sceneVisibility:wildernessSceneVisibility(battle),renderer:r.renderer,canvas:{width:s.width,height:s.height},battle,objects:[],state:currentState,drawLabels(){labels++;}});assert.equal(strokes(r).length,1);assert.equal(labels,1);
});

test('observed low-contrast boundary correction adds a same-path static outer keyline',()=>{
 const r=render(scene()),edge=strokes(r)[0],outer=r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===STYLE.outline);assert.equal(outer.length,1);assert.deepEqual(outer[0].path,edge.path);assert.equal(r.calls.indexOf(edge),r.calls.indexOf(outer[0])+1);assert.deepEqual([outer[0].globalAlpha,outer[0].lineWidth],[.9,3.6]);assert.ok(STYLE.fillAlpha<.15);
});
test('flash-zero preserves both contrast strokes and does not introduce extra bright area fills',()=>{
 const a=render(scene()),b=render(scene({reduced:true,flashScale:0,time:70}));const strokes=r=>r.calls.filter(c=>c.op==='stroke'&&[STYLE.edge,STYLE.outline].includes(c.strokeStyle));assert.equal(strokes(a).length,2);assert.deepEqual(strokes(a),strokes(b));assert.equal(fills(a).length,1);assert.equal(fills(b).length,1);
});
