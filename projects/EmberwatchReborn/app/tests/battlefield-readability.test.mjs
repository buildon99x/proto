import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {battlefieldCoverSegments,battlefieldOpenFloor,battlefieldRolePresentation,BATTLEFIELD_SCENE_STYLE as SCENE,BATTLEFIELD_LABEL_STYLE as LABEL,BATTLEFIELD_UNDEAD_LINES} from '../src/battlefield-readability.js';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_FOES} from '../src/battlefield-content.js';
import {battlefieldPresentationHints} from '../src/battlefield-presentation.js';
import {SIGNAL_MARK_STYLE as MARK,signalRolePresentation} from '../src/signal-readability.js';
import {tombRolePresentation} from '../src/tomb-readability.js';
import {EXPERT_STYLE} from '../src/expert-presentation.js';
import {mapFromRegion,inMap} from '../src/world-geometry.js';
import {ART} from '../src/art.js';
// Scripted renderer fixtures only. No synthetic profile is described as play.
const region=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION],kinds=Object.keys(BATTLEFIELD_FOES);
const actor=(kind=kinds[0],patch={})=>({id:kind,kind,type:BATTLEFIELD_FOES[kind].role==='boss'?'boss':'guardian',x:720,y:496,hp:30,max:BATTLEFIELD_FOES[kind].hp,active:true,state:'idle',angle:0,...patch});
const scene=(patch={})=>({width:1000,height:750,regionId:BATTLEFIELD_REGION,map:mapFromRegion(region,{battlefield_devices_ready:1}),p:{x:672,y:496,hp:100,angle:0},entities:[],objects:[],effects:[],time:0,cleanView:true,...patch});
const gradient=Object.freeze({addColorStop(){}});
function render(s){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...data});
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;},measureText(text){return {width:text.length*7};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)}),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null}),metrics=renderer.render(s);return {calls,metrics};
}
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const roles=r=>r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===MARK.roleColor);
const labels=r=>r.calls.filter(c=>c.op==='fillText'&&c.fillStyle===LABEL.color);
const floorFills=r=>r.calls.filter(c=>c.op==='fill'&&c.fillStyle===SCENE.passageFill);
for(const [name,objectives,opened] of [['accepted',{},false],['west only',{battlefield_west_ready:1},false],['east only',{battlefield_east_ready:1},false],['both devices',{battlefield_devices_ready:1},true]])test(`B ${name}: low wall geometry follows real floor edges and paving follows the complete door`,()=>{
 const map=mapFromRegion(region,objectives),cover=battlefieldCoverSegments(BATTLEFIELD_REGION,map),hero={x:480,y:432},floor=battlefieldOpenFloor(BATTLEFIELD_REGION,map,hero);assert.ok(cover.length);
 for(const c of cover){assert.equal(map.tiles[c.tile.y][c.tile.x],0);assert.equal(map.tiles[c.floor.y][c.floor.x],1);}
 assert.equal(floor.length>0,opened);for(const f of floor)for(const t of f.tiles){assert.ok(inMap(map,t.x*32+16,t.y*32+16,0));assert.ok(t.x>=13&&t.x<17&&t.y>=8&&t.y<19);}
 const r=render(scene({map,p:{...scene().p,...hero},battlefield_devices_ready:!opened}));assert.equal(floorFills(r).length>0,opened,'alleged scene flags cannot open paving');
});
test('a single physically closed central-door tile suppresses every passage band despite completed objectives',()=>{
 const s=scene({p:{x:480,y:432,hp:100,angle:0},battlefield_devices_ready:true});s.map.tiles[12][14]=0;assert.deepEqual(battlefieldOpenFloor(BATTLEFIELD_REGION,s.map,s.p),[]);assert.equal(floorFills(render(s)).length,0);assert.ok(battlefieldCoverSegments(BATTLEFIELD_REGION,s.map).some(c=>c.tile.x===14&&c.tile.y===12));
});
test('B fog and proximity reveal only real adjacent cover and individual actual open-door tiles',()=>{
 const s=scene({p:{x:480,y:432,hp:100,angle:0}});s.seen=s.map.tiles.map(row=>row.map(()=>false));assert.deepEqual(battlefieldCoverSegments(BATTLEFIELD_REGION,s.map,s.seen),[]);assert.deepEqual(battlefieldOpenFloor(BATTLEFIELD_REGION,s.map,s.p,s.seen),[]);assert.equal(floorFills(render(s)).length,0);
 s.seen[12][13]=true;const floors=battlefieldOpenFloor(BATTLEFIELD_REGION,s.map,s.p,s.seen);assert.deepEqual(floors.flatMap(f=>f.tiles),[{x:13,y:12}]);assert.ok(battlefieldCoverSegments(BATTLEFIELD_REGION,s.map,s.seen).every(c=>c.floor.x===13&&c.floor.y===12));assert.equal(floorFills(render(s)).length,1);assert.deepEqual(battlefieldOpenFloor(BATTLEFIELD_REGION,s.map,{x:9000,y:9000},s.seen),[]);
});
test('B mapping matches presentation roleShapes and reuses old glyphs without body/hitbox scaling',()=>{
 const hints=battlefieldPresentationHints();
 for(const kind of kinds){const r=battlefieldRolePresentation({kind},BATTLEFIELD_REGION),f=BATTLEFIELD_FOES[kind];assert.equal(r.mark,hints.roleShapes[kind]);assert.equal(r.label,f.name);assert.equal(r.undead,f.tags.includes('undead'));assert.equal(r.height,undefined);assert.equal(r.widthScale,undefined);assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.lines));}
 const pyro=battlefieldRolePresentation({kind:'battlefield_pyromancer'},BATTLEFIELD_REGION);assert.equal(pyro.lines,signalRolePresentation({kind:'signal_archer'},'signal_basin').lines);
 const lance=battlefieldRolePresentation({kind:'battlefield_lancer'},BATTLEFIELD_REGION);assert.equal(lance.lines,tombRolePresentation({kind:'tomb_piercer'},'signal_tomb').lines);
});
test('only explicitly undead B rows get the side-skull, separating the two slit roles without color',()=>{
 for(const kind of kinds){const r=battlefieldRolePresentation({kind},BATTLEFIELD_REGION);assert.equal(r.lines.some(line=>line===BATTLEFIELD_UNDEAD_LINES[0]),BATTLEFIELD_FOES[kind].tags.includes('undead'));}
 const hexer=battlefieldRolePresentation({kind:'battlefield_hexer'},BATTLEFIELD_REGION),binder=battlefieldRolePresentation({kind:'battlefield_binder'},BATTLEFIELD_REGION);assert.equal(hexer.mark,binder.mark);assert.notDeepEqual(hexer.lines,binder.lines);assert.match(hexer.label,/망자.*독/);assert.match(binder.label,/침묵/);
 const roles=kinds.map(kind=>battlefieldRolePresentation({kind},BATTLEFIELD_REGION));assert.equal(new Set(roles.map(r=>JSON.stringify(r.lines))).size,7);
});
test('actual B renderer draws every living active role path and explicit catalog threat label',()=>{
 const s=scene({entities:kinds.map((kind,i)=>actor(kind,{x:592+i*32,y:496}))}),r=render(s);assert.equal(roles(r).length,7);assert.deepEqual(labels(r).map(c=>c.args[0]),kinds.map(k=>BATTLEFIELD_FOES[k].name));
 for(const [i,e] of s.entities.entries()){
  const role=battlefieldRolePresentation(e,s.regionId),q=projectWorld(e.x-s.p.x,e.y-s.p.y),x=s.width*.5+q.x*ISO.zoom,y=s.height*.55+q.y*ISO.zoom,expected=role.lines.flatMap(line=>line.map(([px,py],j)=>[j?'lineTo':'moveTo',x+px*ISO.zoom,y+(py+MARK.roleOffsetY)*ISO.zoom]));assert.equal(roles(r)[i].path.length,expected.length);for(const [j,point] of expected.entries()){assert.equal(roles(r)[i].path[j][0],point[0]);for(let k=1;k<=2;k++)assert.ok(Math.abs(roles(r)[i].path[j][k]-point[k])<1e-9);}assert.ok(Math.abs(labels(r)[i].args[2]-(y+LABEL.offsetY*ISO.zoom))<1e-9);
 }
});
for(const [name,patch] of [['inactive',{active:false}],['zero HP',{hp:0}],['dead',{dead:true,deathTime:.5}],['offscreen',{x:8000,y:8000}]])test(`B roles and threat names exclude ${name} enemies`,()=>{
 const r=render(scene({entities:kinds.map(kind=>actor(kind,patch))}));assert.equal(roles(r).length,0);assert.equal(labels(r).length,0);
});
test('B role/status visibility honors per-actor fog and never reveals unobserved enemies',()=>{
 const s=scene({entities:[actor('battlefield_hexer',{x:624,disarm:{remaining:1}}),actor('battlefield_binder',{x:720,silence:{remaining:1}})]});s.seen=s.map.tiles.map(row=>row.map(()=>false));let r=render(s);assert.equal(roles(r).length,0);assert.equal(labels(r).length,0);assert.equal(r.calls.filter(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative).length,0);
 s.seen[15][22]=true;r=render(s);assert.equal(roles(r).length,1);assert.deepEqual(labels(r).map(c=>c.args[0]),[BATTLEFIELD_FOES.battlefield_binder.name]);assert.deepEqual(r.calls.filter(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative).map(c=>c.args[0]),['침묵']);
});
test('actual B low atlas walls, paving and role/status cues stay below hostile tells, loot and actors',()=>{
 const e=actor('battlefield_hexer',{x:480,y:432,disarm:{remaining:1},silence:{remaining:1},telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:480,y:432,x2:480,y2:600,width:16}]}}),r=render(scene({p:{x:480,y:496,hp:100,angle:0},entities:[e],loot:[{type:'gold',x:480,y:432,bob:0}]}));
 const danger=r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'),cues=[...roles(r),...labels(r),...floorFills(r),...r.calls.filter(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative)];assert.ok(danger.length&&cues.length>4);assert.ok(cues.every(c=>danger.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))));
 const low=ART.environment.sprites.lowwall,walls=r.calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='environment'&&c.args[1]===low.x&&c.args[2]===low.y);assert.ok(walls.length);assert.ok(walls.every(c=>danger.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))));
 const bodies=r.calls.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id));assert.ok(cues.every(c=>bodies.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))));
 const loot=r.calls.find(c=>c.op==='fillRect'&&c.fillStyle==='#e8c07b');assert.ok([...roles(r),...labels(r),...floorFills(r),...walls].every(c=>r.calls.indexOf(c)<r.calls.indexOf(loot)));
});
test('threat name remains below foot glyph while applied disable statuses remain above head and HP',()=>{
 const e=actor('battlefield_hexer',{disarm:{remaining:1},silence:{remaining:1}}),s=scene({entities:[e]}),r=render(s),label=labels(r)[0],status=r.calls.find(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative),q=projectWorld(e.x-s.p.x,e.y-s.p.y),footY=s.height*.55+q.y*ISO.zoom;
 assert.match(label.args[0],/독/);assert.equal(status.args[0],'무장 해제 · 침묵');assert.ok(status.args[2]<footY-46*ISO.zoom-8);assert.ok(label.args[2]>footY+25*ISO.zoom);assert.ok(label.args[2]-status.args[2]>90);
});
test('B flash0 retains static wall/paving/glyph/threat/status output without brightness requirements',()=>{
 const s=scene({entities:kinds.map((kind,i)=>actor(kind,{x:592+i*32,y:496,flash:1,silence:{remaining:1}}))}),a=render(s),b=render({...s,reduced:true,flashScale:0,time:80});assert.deepEqual(roles(a),roles(b));assert.deepEqual(labels(a),labels(b));assert.deepEqual(floorFills(a),floorFills(b));
 assert.deepEqual(a.calls.filter(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative),b.calls.filter(c=>c.op==='fillText'&&c.fillStyle===EXPERT_STYLE.negative));assert.ok(a.calls.some(c=>c.op==='drawImage'&&c.filter.startsWith('brightness')));assert.ok(!b.calls.some(c=>c.op==='drawImage'&&c.filter.startsWith('brightness')));
});
test('B cues cannot alter any previous region render command or invent architecture elsewhere',()=>{
 for(const regionId of [undefined,'ash_hamlet','ash_road','sluice_upper','grey_quarry','windscar_pass','signal_basin','ember_furnace','signal_tomb']){
  const s=scene({regionId,entities:kinds.map(kind=>actor(kind))}),a=render(s),b=render({...s,entities:s.entities.map(e=>({...e,kind:'unmapped_fixture'}))});assert.deepEqual(a.calls,b.calls);assert.deepEqual(a.metrics,b.metrics);assert.deepEqual(battlefieldCoverSegments(regionId,s.map),[]);assert.deepEqual(battlefieldOpenFloor(regionId,s.map,s.p),[]);assert.equal(battlefieldRolePresentation(s.entities[0],regionId),null);
 }
 for(const kind of [undefined,null,'__proto__','constructor','tomb_blade','signal_archer'])assert.equal(battlefieldRolePresentation({kind},BATTLEFIELD_REGION),null);
});
test('frozen map, actors, status state and catalog remain untouched by B rendering',()=>{
 const s=scene({entities:kinds.map((kind,i)=>actor(kind,{x:592+i*32,y:496,disarm:{remaining:1}}))}),before=structuredClone(s);render(freeze(s));assert.deepEqual(s,before);assert.ok(SCENE.coverWidth<64);assert.equal(SCENE.coverKey,'lowwall');
});
