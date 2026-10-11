import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualRenderer} from '../src/visual.js';
import {tombCoverSegments,tombOpenFloor,tombRolePresentation,tombGlyphLines,TOMB_MARK_STYLE,TOMB_SCENE_STYLE} from '../src/tomb-readability.js';
import {SIGNAL_MARK_STYLE} from '../src/signal-readability.js';
import {TOMB_REGION,TOMB_REGIONS,TOMB_FOES} from '../src/tomb-content.js';
import {mapFromRegion,inMap} from '../src/world-geometry.js';
import {ART} from '../src/art.js';
const region=TOMB_REGIONS[TOMB_REGION];
const stages=[{}, {tomb_decoded:1}, {tomb_decoded:1,tomb_sequence_solved:1}, {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1}, {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1,tomb_ward_midpoint:1}, {tomb_decoded:1,tomb_sequence_solved:1,tomb_ward_taken:1,tomb_ward_midpoint:1,tomb_ward_sealed:1}];
const actor=(kind,extra={})=>({id:kind,kind,type:TOMB_FOES[kind].role==='boss'?'boss':'guardian',x:528,y:560,hp:50,max:TOMB_FOES[kind].hp,active:true,state:'idle',angle:0,...extra});
const scene=(extra={})=>({width:1000,height:750,regionId:TOMB_REGION,map:mapFromRegion(region,stages[5]),p:{x:528,y:560,hp:100,angle:0},entities:[],objects:[],time:0,cleanView:true,...extra});
const gradient=Object.freeze({addColorStop(){}});
function render(s){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...data});
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)}),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null}),metrics=renderer.render(s);return {calls,metrics,renderer};
}

const roleStrokes=r=>r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===SIGNAL_MARK_STYLE.roleColor);
const objectStrokes=r=>r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===TOMB_MARK_STYLE.color);
for(const [i,o] of stages.entries())test(`T stage${i} actual closed geometry alone controls low masonry and opened floor`,()=>{
 const map=mapFromRegion(region,o),cover=tombCoverSegments(TOMB_REGION,map),floor=tombOpenFloor(TOMB_REGION,map,{x:384,y:384});assert.ok(cover.length);
 for(const c of cover){assert.equal(map.tiles[c.tile.y][c.tile.x],0);assert.equal(map.tiles[c.floor.y][c.floor.x],1);}
 for(const f of floor)for(const t of f.tiles)assert.ok(inMap(map,t.x*32+16,t.y*32+16,0));
 if(i===0)assert.equal(floor.length,0);else assert.ok(floor.length>0);
 const hidden=map.tiles.map(r=>r.map(()=>false));assert.equal(tombCoverSegments(TOMB_REGION,map,hidden).length,0);assert.equal(tombOpenFloor(TOMB_REGION,map,{x:384,y:384},hidden).length,0);
});
test('five Tomb roles have frozen distinct non-color line silhouettes and no new hitbox dimensions',()=>{
 const roles=Object.keys(TOMB_FOES).map(kind=>tombRolePresentation(actor(kind),TOMB_REGION));assert.equal(new Set(roles.map(r=>r.mark)).size,5);assert.equal(new Set(roles.map(r=>JSON.stringify(r.lines))).size,5);
 for(const r of roles){assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.lines));assert.equal(r.height,undefined);assert.equal(r.widthScale,undefined);}
});
test('boss cracked shape activates only from committed phase cue, not HP or pending latch',()=>{
 const whole=tombRolePresentation(actor('tomb_oathkeeper',{hp:1,patternPhase:{id:'whole',cue:null,pendingIndex:1}}),TOMB_REGION),cracked=tombRolePresentation(actor('tomb_oathkeeper',{patternPhase:{id:'cracked',cue:'cracked-ring'}}),TOMB_REGION);
 assert.equal(whole.mark,'oath-ring');assert.equal(cracked.mark,'cracked-ring');assert.deepEqual(cracked.lines.slice(0,2),whole.lines);assert.equal(cracked.lines.length,3);
 const a=render(scene({entities:[actor('tomb_oathkeeper')]})),b=render(scene({entities:[actor('tomb_oathkeeper',{patternPhase:{cue:'cracked-ring'}})]}));assert.notDeepEqual(roleStrokes(a)[0].path,roleStrokes(b)[0].path);
});
test('actual renderer draws all five live roles and omits dead/inactive/hidden ones',()=>{
 const kinds=Object.keys(TOMB_FOES),s=scene({entities:kinds.map((kind,i)=>actor(kind,{x:464+i*32}))});assert.equal(roleStrokes(render(s)).length,5);
 for(const extra of [{active:false},{hp:0},{dead:true}])assert.equal(roleStrokes(render({...s,entities:s.entities.map(e=>({...e,...extra}))})).length,0);
 s.seen=s.map.tiles.map(r=>r.map(()=>false));assert.equal(roleStrokes(render(s)).length,0);
});
test('three world glyph plates show catalog-specific shapes rather than color alone',()=>{
 const glyphs=['crescent','split_beam','ember'];assert.equal(new Set(glyphs.map(g=>JSON.stringify(tombGlyphLines(g,TOMB_REGION)))).size,3);
 const r=render(scene({objects:glyphs.map((glyph,i)=>({id:region.objects[i+1].id,type:'shrine',glyph,x:464+i*32,y:560}))}));assert.equal(objectStrokes(r).length,3);assert.equal(new Set(objectStrokes(r).map(c=>JSON.stringify(c.path))).size,3);
});
test('carried ward is a read-only living-player mark, never shown outside T or after deposit',()=>{
 const a=render(scene({wardCarried:true}));assert.equal(objectStrokes(a).length,1);assert.equal(objectStrokes(render(scene({wardCarried:false}))).length,0);assert.equal(objectStrokes(render(scene({wardCarried:true,p:{x:528,y:560,hp:0,angle:0}}))).length,0);assert.equal(objectStrokes(render(scene({regionId:'ember_furnace',wardCarried:true}))).length,0);
});
test('T cues stay below a real hostile warning, loot and character art, including flash0',()=>{
 const e=actor('tomb_vigil',{telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.5,shapes:[{type:'circle',x:528,y:560,r:72}]}}),s=scene({entities:[e],wardCarried:true,loot:[{type:'gold',x:528,y:560,bob:0}]}),a=render(s),b=render({...s,reduced:true,flashScale:0});
 assert.deepEqual(roleStrokes(a),roleStrokes(b));assert.deepEqual(objectStrokes(a),objectStrokes(b));const last=Math.max(...[...roleStrokes(a),...objectStrokes(a)].map(c=>a.calls.indexOf(c)));
 const later=a.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'||c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id)||c.op==='fillRect'&&c.fillStyle==='#e8c07b');assert.ok(later.length>=4);assert.ok(later.every(c=>a.calls.indexOf(c)>last));
});
test('T functions do not mark non-T scenes or alter baseline renderer without opt-in',()=>{
 for(const id of [undefined,'ash_hamlet','ash_road','sluice_upper','grey_quarry','windscar_pass','signal_basin','ember_furnace']){
  assert.equal(tombRolePresentation(actor('tomb_blade'),id),null);assert.equal(tombGlyphLines('crescent',id),null);assert.deepEqual(tombCoverSegments(id,scene().map),[]);assert.deepEqual(tombOpenFloor(id,scene().map,scene().p),[]);
  const a=render(scene({regionId:id,wardCarried:true,objects:[{id:'p',glyph:'crescent',type:'shrine',x:528,y:560}]})),b=render(scene({regionId:id,objects:[{id:'p',type:'shrine',x:528,y:560}]}));assert.deepEqual(a.calls,b.calls);assert.deepEqual(a.metrics,b.metrics);
 }
});
test('rendering roles, glyphs, ward and low cover does not mutate map, actor or progress data',()=>{
 const s=scene({wardCarried:true,objects:[{id:'p',glyph:'ember',type:'shrine',x:528,y:560}],entities:[actor('tomb_oathkeeper',{patternPhase:{id:'cracked',cue:'cracked-ring'}})]}),before=structuredClone(s),freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};render(freeze(s));assert.deepEqual(s,before);assert.ok(TOMB_SCENE_STYLE.coverWidth<64);
});
