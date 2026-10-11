import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle,physicalDamage} from '../src/combat.js';
import {FOES} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {enemyReleaseOutline,telegraphOutline,createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {ART} from '../src/art.js';

// Synthetic combat-boundary and canvas-command fixtures, not native play or
// earned progression. Real enemy selection, windup, release and shots execute.
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function fixture({kind='battlefield_usurper',pattern=0,distance=180,angle=0,invuln=100}={}){
 const s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 s.world.region=kind.startsWith('battlefield_')?'beacon_battlefield':'ash_road';
 s.world.objectives.battlefield_accepted=1;s.world.objectives.battlefield_devices_ready=1;
 const b=createBattle(s),e=b.enemies.find(e=>e.kind===kind);assert.ok(e,kind);
 b.map=mapFromRegion({w:40,h:40});b.enemies=[e];b.awaitingAdvance=false;
 Object.assign(e,{x:512,y:512,active:true,patternIndex:pattern});
 Object.assign(b.p,{x:512+Math.cos(angle)*distance,y:512+Math.sin(angle)*distance,invuln});
 return {s,b,e,events:[]};
}
const tick=(f,dt=.02)=>{const events=stepBattle(f.b,f.s.character,dt,{});f.events.push(...events);return events;};
function until(f,predicate){for(let i=0;i<400&&!predicate();i++)tick(f,f.e.state==='windup'?Math.min(.02,f.e.timer):.02);assert.ok(predicate());}
function release(f){until(f,()=>f.e.state==='windup');const shape=f.e.telegraph.shapes[0],snapshot=structuredClone(shape),spec=structuredClone(f.e.attackSpec);until(f,()=>f.e.state==='recovery');const effect=f.b.effects.find(fx=>fx.type==='enemyRelease');assert.ok(effect);return {shape,snapshot,spec,effect};}
const released=f=>f.events.filter(e=>e.type==='sound'&&e.name==='enemyRelease');

for(const angle of [0,.7,Math.PI/2,Math.PI,-Math.PI/2,-2.6])test(`actual B boss line at ${angle}: compact directional cue and unchanged shot payload`,()=>{
 const f=fixture({angle}),hp=f.b.p.hp,seed=f.b.seed,draws=f.b.combatDraws,fxSeed=f.b.fxSeed;
 const {shape,snapshot,spec,effect}=release(f);
 assert.equal(spec.id,'battlefield-usurper-fireline');assert.equal(effect.type,'enemyRelease');assert.equal(effect.r,0);assert.equal(effect.life,.25);assert.equal(effect.max,.25);assert.deepEqual(effect.shape,snapshot);assert.notEqual(effect.shape,shape);assert.equal(f.b.effects.some(e=>e.type==='slash'),false);
 assert.equal(f.b.shots.length,1);const shot=f.b.shots[0];
 assert.deepEqual(shot,{kind:'arrow',enemy:true,x:f.e.x,y:f.e.y,vx:Math.cos(f.e.angle)*220,vy:Math.sin(f.e.angle)*220,damage:13,damageType:'fire',attackerId:f.e.id,attackFamily:'spell',statusRuleIds:['r11_burn'],attackId:f.e.attackId,originSkillId:'battlefield-usurper-fireline',life:352/220});
 assert.equal(f.b.p.hp,hp);assert.deepEqual(f.b.p.negativeStatuses,{});assert.equal(f.b.seed,seed);assert.equal(f.b.combatDraws,draws);assert.equal(f.b.fxSeed,fxSeed);near(f.e.timer,1.55);assert.equal(released(f).length,1);
 const path=enemyReleaseOutline(effect.shape);assert.equal(path.length,3);
 for(const p of path){const dx=p.x-shape.x,dy=p.y-shape.y;assert.ok(Math.hypot(dx,dy)<=24+1e-9);assert.ok(dx*Math.cos(angle)+dy*Math.sin(angle)>0);assert.ok(Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle))<=6+1e-9);}
 near(path[1].x,shape.x+Math.cos(angle)*24);near(path[1].y,shape.y+Math.sin(angle)*24);
 const fixed=structuredClone(effect.shape);shape.x+=100;shape.x2+=100;f.e.angle+=1;assert.deepEqual(effect.shape,fixed);
});

for(const [kind,pattern,distance,type,radius,halfAngle] of [
 ['battlefield_usurper',1,60,'cone',100,1.15],['battlefield_revenant',0,40,'cone',64,.6],['battlefield_lancer',0,50,'cone',92,.28],['battlefield_bulwark',0,40,'circle',64,null],['scout',0,30,'cone',42,1],
])test(`${kind}: release follows actual ${type} center, radius and angle`,()=>{
 const f=fixture({kind,pattern,distance,angle:.83}),{snapshot,effect}=release(f);
 assert.equal(effect.shape.type,type);assert.equal(effect.shape.r,radius);assert.deepEqual({x:effect.x,y:effect.y},{x:snapshot.x,y:snapshot.y});
 if(type==='cone'){assert.equal(effect.shape.halfAngle,halfAngle);near(effect.shape.angle,Math.atan2(f.b.p.y-f.e.y,f.b.p.x-f.e.x));}
 assert.deepEqual(enemyReleaseOutline(effect.shape),telegraphOutline(snapshot));assert.equal(f.b.shots.length,0);assert.equal(released(f).length,1);
});

test('older archer uses the same bounded cue while retaining240 speed and528 travel range',()=>{
 const f=fixture({kind:'archer'}),{effect}=release(f),shot=f.b.shots[0];near(Math.hypot(shot.vx,shot.vy),240);near(shot.life,528/240);assert.equal(shot.damage,FOES.archer.damage);assert.equal(enemyReleaseOutline(effect.shape).length,3);near(enemyReleaseOutline(effect.shape)[1].x-effect.shape.x,24);
});

test('actual B projectile moves before contact, then deals native fire damage and burn once',()=>{
 const f=fixture({invuln:0});release(f);const hp=f.b.p.hp;assert.equal(f.events.filter(e=>e.type==='heroHurt').length,0);
 const shot=f.b.shots[0],start={x:shot.x,y:shot.y,life:shot.life};tick(f,.05);near(shot.x,start.x+11);near(shot.y,start.y);near(shot.life,start.life-.05);assert.equal(f.b.p.hp,hp);assert.deepEqual(f.b.p.negativeStatuses,{});
 until(f,()=>f.events.some(e=>e.type==='heroHurt'));const hits=f.events.filter(e=>e.type==='heroHurt');assert.equal(hits.length,1);near(hits[0].damage,13);assert.equal(hits[0].context.originSkillId,'battlefield-usurper-fireline');assert.equal(hits[0].context.attackFamily,'spell');assert.equal(f.b.p.negativeStatuses.burn.ruleId,'r11_burn');assert.equal(f.b.shots.length,0);assert.ok(f.b.time>1.25+.7);
});

test('side-step after locked line misses; cue expiry neither removes nor redirects projectile',()=>{
 const f=fixture({invuln:0});release(f);f.b.p.y+=60;const hp=f.b.p.hp;for(let i=0;i<13;i++)tick(f);assert.equal(f.b.effects.some(e=>e.type==='enemyRelease'),false);assert.equal(f.b.shots.length,1);near(f.b.shots[0].vy,0);until(f,()=>f.b.shots.length===0);assert.equal(f.b.p.hp,hp);assert.deepEqual(f.b.p.negativeStatuses,{});assert.equal(f.events.filter(e=>e.type==='heroHurt').length,0);
});

test('wall interception after release keeps the original swept projectile collision',()=>{
 const f=fixture({invuln:0});release(f);const hp=f.b.p.hp;for(let y=0;y<f.b.map.h;y++)f.b.map.tiles[y][18]=0;until(f,()=>f.b.shots.length===0);assert.equal(f.b.p.hp,hp);assert.deepEqual(f.b.p.negativeStatuses,{});assert.equal(f.events.filter(e=>e.type==='heroHurt').length,0);
});

for(const [kind,pattern,distance,raw,status]of [['battlefield_usurper',1,60,15,null],['battlefield_bulwark',0,40,10,'stun']])test(`${kind} keeps immediate area damage and status semantics`,()=>{
 const f=fixture({kind,pattern,distance,invuln:0});f.b.seed=1000;release(f);const hits=f.events.filter(e=>e.type==='heroHurt');assert.equal(hits.length,1);near(hits[0].damage,physicalDamage(raw,f.b.stats.armor));assert.equal(f.b.shots.length,0);assert.equal(!!f.b.p.negativeStatuses[status],!!status);assert.equal(f.events.filter(e=>e.type==='enemyRepositionStarted').length,0);
});

test('suppressed windup releases neither damage, projectile nor presentation',()=>{
 const f=fixture();tick(f);assert.equal(f.e.state,'windup');f.e.silence={remaining:2};tick(f);assert.equal(f.e.state,'recovery');assert.equal(f.b.effects.length,0);assert.equal(f.b.shots.length,0);assert.equal(released(f).length,0);
});

const gradient={addColorStop(){}};
function render(scene){
 const calls=[],stack=[],state={globalAlpha:1,strokeStyle:'#000',fillStyle:'#000',lineWidth:1,filter:'none',globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:structuredClone(path),...state});
 const methods={save(){stack.push({...state});},restore(){Object.assign(state,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(){record('fill');},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;},measureText(t){return {width:t.length*7};}};
 const ctx=new Proxy(methods,{get:(o,k)=>k in o?o[k]:state[k],set:(_,k,v)=>(state[k]=v,true)});
 createVisualRenderer(ctx,ART,{environment:{id:'environment'},enemy:{id:'enemy'},hero:{id:'hero'},motion:{}},{createCanvas:null}).render(scene);return calls;
}
function scene(f,patch={}){return {width:900,height:650,map:f.b.map,regionId:f.b.region,p:f.b.p,entities:f.b.enemies,effects:f.b.effects,shots:f.b.shots,time:3,cleanView:true,...patch};}
const releaseStrokes=calls=>calls.filter(c=>c.op==='stroke'&&['#241b26','#e67c78'].includes(c.strokeStyle));
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
for(const [name,options] of [['line',{}],['cone',{pattern:1,distance:60}],['circle',{kind:'battlefield_bulwark',distance:40}]])test(`actual ${name} FX renders exact two-stroke static shape at flash0 below later warnings/actors`,()=>{
 const f=fixture(options),{effect}=release(f),warning={...f.e,id:'other',telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.5,name:'fixture',shapes:[{type:'cone',x:530,y:530,r:70,angle:1.2,halfAngle:.4}]}};
 const s=scene(f,{entities:[f.e,warning]}),before=structuredClone(s),full=render(freeze(s)),reduced=render({...s,reduced:true,flashScale:0,time:90}),strokes=releaseStrokes(full);
 assert.equal(strokes.length,2);assert.deepEqual(strokes,releaseStrokes(reduced));assert.deepEqual(s,before);assert.equal(strokes[0].lineWidth,4);assert.equal(strokes[1].lineWidth,1.7);assert.equal(strokes[0].globalAlpha,.72);assert.equal(strokes[1].globalAlpha,.9);assert.equal(strokes[0].globalCompositeOperation,'source-over');assert.deepEqual(strokes[0].path,strokes[1].path);
 const path=enemyReleaseOutline(effect.shape).map((p,i)=>{const q=projectWorld(p.x-s.p.x,p.y-s.p.y);return [i?'lineTo':'moveTo',s.width*.5+q.x*ISO.zoom,s.height*.55+q.y*ISO.zoom-(name==='line'?9*ISO.zoom:0)];});if(name!=='line')path.push(['closePath']);
 assert.equal(strokes[0].path.length,path.length);for(let i=0;i<path.length;i++){assert.equal(strokes[0].path[i][0],path[i][0]);for(let k=1;k<path[i].length;k++)near(strokes[0].path[i][k],path[i][k]);}
 assert.equal(full.some(c=>c.op==='fill'&&c.fillStyle==='#e67c78'),false);
 const danger=full.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'),actors=full.filter(c=>c.op==='drawImage'&&['hero','enemy'].includes(c.args[0].id));assert.ok(danger.length&&actors.length);assert.deepEqual(danger,reduced.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'));assert.ok(strokes.every(c=>[...danger,...actors].every(later=>full.indexOf(c)<full.indexOf(later))));
 const expired=render({...s,effects:[{...effect,life:0}]});assert.equal(releaseStrokes(expired).length,0);
});

test('unrelated player slash retains its previous geometry and layers',()=>{
 const f=fixture(),s=scene(f,{entities:[],shots:[],effects:[{type:'slash',x:512,y:512,r:100,angle:.6,color:'#ffd77d',life:.25,max:.25}]});const calls=render(s),slashes=calls.filter(c=>c.op==='stroke'&&['#ffd77d','#fff1cf'].includes(c.strokeStyle));assert.equal(slashes.length,3);assert.deepEqual(slashes.map(c=>c.lineWidth),[12,5,1.5]);assert.ok(slashes.every(c=>c.path.length===31));assert.equal(releaseStrokes(calls).length,0);
});

for(const [seed,type,r,halfAngle] of [[0,'circle',115,null],[1000,'cone',104,1.25]])test(`old warden ${type} keeps authored shape and original single selector RNG draw`,()=>{
 const f=fixture({kind:'warden',distance:80});f.b.seed=seed;const {effect}=release(f);assert.equal(effect.shape.type,type);assert.equal(effect.shape.r,r);if(halfAngle!==null)assert.equal(effect.shape.halfAngle,halfAngle);assert.equal(f.b.combatDraws,1);assert.deepEqual(enemyReleaseOutline(effect.shape),telegraphOutline(effect.shape));
});
