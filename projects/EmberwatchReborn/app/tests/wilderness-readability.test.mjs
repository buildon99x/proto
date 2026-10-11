import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {wildernessCoverSegments,wildernessOpenFloor,wildernessRolePresentation,WILDERNESS_SCENE_STYLE as SCENE} from '../src/wilderness-readability.js';
import {BATTLEFIELD_LABEL_STYLE as LABEL,BATTLEFIELD_UNDEAD_LINES} from '../src/battlefield-readability.js';
import {WILDERNESS_REGION,WILDERNESS_REGIONS,WILDERNESS_FOES} from '../src/wilderness-content.js';
import {wildernessPresentationHints} from '../src/wilderness-presentation.js';
import {SIGNAL_MARK_STYLE as MARK,signalRolePresentation} from '../src/signal-readability.js';
import {tombRolePresentation} from '../src/tomb-readability.js';
import {EXPERT_STYLE} from '../src/expert-presentation.js';
import {mapFromRegion,inMap} from '../src/world-geometry.js';
import {ART} from '../src/art.js';
// Scripted renderer fixtures only. No synthetic profile is described as play.
const region=WILDERNESS_REGIONS[WILDERNESS_REGION],kinds=Object.keys(WILDERNESS_FOES);
const actor=(kind=kinds[0],patch={})=>({id:kind,kind,type:WILDERNESS_FOES[kind].role==='boss'?'boss':'guardian',x:720,y:496,hp:30,max:WILDERNESS_FOES[kind].hp,active:true,state:'idle',angle:0,...patch});
const scene=(patch={})=>({width:1000,height:750,regionId:WILDERNESS_REGION,map:mapFromRegion(region,{wilderness_mode:2,wilderness_channel_open:1}),p:{x:672,y:496,hp:100,angle:0},entities:[],objects:[],effects:[],time:0,cleanView:true,...patch});
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
for(const mode of [0,1,2])test(`W mode ${mode}: low cover and opened floor follow actual collision tiles`,()=>{
 const map=mapFromRegion(region,{wilderness_mode:mode,wilderness_channel_open:Number(mode===2)}),cover=wildernessCoverSegments(WILDERNESS_REGION,map),hero={x:688,y:568},floor=wildernessOpenFloor(WILDERNESS_REGION,map,hero);
 assert.ok(cover.length);for(const segment of cover){assert.equal(map.tiles[segment.tile.y][segment.tile.x],0);assert.equal(map.tiles[segment.floor.y][segment.floor.x],1);}
 assert.equal(floor.some(f=>f.id.startsWith('wilderness_mode:')),mode>0);assert.equal(floor.some(f=>f.id.startsWith('wilderness_channel_open:')),mode===2);for(const f of floor)for(const t of f.tiles)assert.equal(inMap(map,t.x*32+16,t.y*32+16,0),true);
 const s=scene({map,p:{...hero,hp:100,angle:0},wilderness_mode:2});assert.equal(floorFills(render(s)).length>0,mode>0,'presentation flags do not open collision');
});
test('W opened-door cues fail closed on one solid tile and all-hidden fog',()=>{
 const s=scene({p:{x:688,y:568,hp:100,angle:0}});s.map.tiles[17][20]=0;assert.equal(wildernessOpenFloor(WILDERNESS_REGION,s.map,s.p).some(f=>f.id.startsWith('wilderness_mode:')),false);
 s.seen=s.map.tiles.map(row=>row.map(()=>false));assert.deepEqual(wildernessOpenFloor(WILDERNESS_REGION,s.map,s.p,s.seen),[]);assert.deepEqual(wildernessCoverSegments(WILDERNESS_REGION,s.map,s.seen),[]);assert.equal(floorFills(render(s)).length,0);
});
test('W role geometry uses explicit undead tags and keeps living flankers distinct without body or hitbox scaling',()=>{
 for(const kind of kinds){const role=wildernessRolePresentation({kind},WILDERNESS_REGION),foe=WILDERNESS_FOES[kind];assert.equal(role.mark,foe.roleGlyph);assert.equal(role.undead,foe.tags.includes('undead'));assert.equal(role.lines.some(line=>line===BATTLEFIELD_UNDEAD_LINES[0]),role.undead);assert.equal(role.height,undefined);assert.equal(role.widthScale,undefined);assert.ok(Object.isFrozen(role)&&Object.isFrozen(role.lines));assert.equal(wildernessRolePresentation({kind},'beacon_battlefield'),null);}
 assert.notDeepEqual(wildernessRolePresentation({kind:'wilderness_flanker'},WILDERNESS_REGION).lines,wildernessRolePresentation({kind:'wilderness_revenant'},WILDERNESS_REGION).lines);
});
test('actual W renderer draws each living role and non-color threat label with static flash0 parity',()=>{
 const s=scene({entities:kinds.map((kind,i)=>actor(kind,{x:592+i*32,y:496,flash:1}))}),before=structuredClone(s),a=render(freeze(s)),b=render({...s,reduced:true,flashScale:0,time:8});assert.equal(roles(a).length,kinds.length);assert.equal(labels(a).length,kinds.length);assert.deepEqual(roles(a),roles(b));assert.deepEqual(labels(a),labels(b));assert.deepEqual(s,before);
 assert.ok(labels(a).some(c=>c.args[0].includes('망자')));assert.ok(!b.calls.some(c=>c.op==='drawImage'&&c.filter.startsWith('brightness')));
});
for(const [name,patch] of [['inactive',{active:false}],['dead',{dead:true}],['zero HP',{hp:0}],['offscreen',{x:8000,y:8000}]])test(`W role cues exclude ${name} actors`,()=>{const r=render(scene({entities:kinds.map(kind=>actor(kind,patch))}));assert.equal(roles(r).length,0);assert.equal(labels(r).length,0);});
test('W fog prevents unobserved role labels and marks',()=>{const s=scene({entities:[actor()]});s.seen=s.map.tiles.map(row=>row.map(()=>false));const r=render(s);assert.equal(roles(r).length,0);assert.equal(labels(r).length,0);});
test('actual W role marks, labels and low wall sprites remain below hostile warning and actor layers',()=>{
 const s=scene({entities:[actor(kinds[0],{telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:720,y:496,x2:720,y2:350,width:14}]}})],loot:[{type:'gold',x:720,y:496,bob:0}]}),r=render(s),lastMark=Math.max(...[...roles(r),...labels(r)].map(c=>r.calls.indexOf(c))),warnings=r.calls.filter(c=>c.op==='stroke'&&['#f29187','#ffe5a6'].includes(c.strokeStyle)),actors=r.calls.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id));assert.ok(lastMark>=0&&warnings.length&&actors.length);assert.ok([...warnings,...actors].every(c=>r.calls.indexOf(c)>lastMark));
 const atlas=ART.environment.sprites.lowwall,low=r.calls.filter(c=>c.op==='drawImage'&&c.args[0].id==='environment'&&c.args[1]===atlas.x&&c.args[2]===atlas.y);assert.ok(low.length);assert.ok(low.every(c=>r.calls.indexOf(c)<lastMark));
});
