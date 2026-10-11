import test from 'node:test';
import assert from 'node:assert/strict';
import {createContactTrace,contactTraceCircle,contactTraceToScreen,CONTACT_TRACE_LIMITS as LIMITS} from '../src/contact-trace.js';
import {ACTOR_BODY_TUNING,moveActorBody} from '../src/actor-body.js';
import {createVisualRenderer,ISO,projectWorld,screenToWorld} from '../src/visual.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {createState,reduceRuntime} from '../src/state.js';
import {poeControlPreset} from '../src/controls.js';
import {createBattle,acceptBattleInput,stepBattle} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {recordingContext} from './recording-context.mjs';

const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const enemy=(id,x=640,y=600,extra={})=>({id,kind:'bruiser',type:'guardian',x,y,hp:5000,max:5000,stun:10,active:false,state:'idle',timer:0,telegraph:null,...extra});
function fixture(enemies=[]){return {region:'qa',stateLife:1,time:0,p:{x:600,y:600,hp:55},enemies,map:mapFromRegion({w:80,h:80}),equipmentContext:{world:{objectives:{}}},poeMobility:{snapshot:()=>({state:'idle'})}};}
function runtime(){let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;s=reduceRuntime(s,{type:'setControls',controls:poeControlPreset(s.options.controls)}).state;const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=600;b.p.y=600;b.awaitingAdvance=false;b.enemies=[enemy('large',650,600)];return {s,b};}
const serial=b=>JSON.stringify({battle:b,mobility:b.poeMobility?.snapshot(),report:battleReport(b)});
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const view={focus:{x:600,y:600},width:1180,height:757,time:0,shake:0};
const move=(b,dx,dy,options={})=>{b.poeHeroPath=moveActorBody(b,b.p,dx,dy,options).path;b.time+=1/60;};

test('OFF observes and draws nothing without reading battle, options, canvas or view',()=>{
 const trap=new Proxy({}, {get(){throw Error('OFF read');},set(){throw Error('OFF write');}}),trace=createContactTrace();
 assert.equal(trace.enabled,false);assert.equal(trace.observe(trap,trap),false);assert.equal(trace.draw(trap,trap),false);assert.equal(trace.snapshot(),trace.snapshot());assert.deepEqual(trace.snapshot().frames,[]);
});
test('only explicit boolean true enables tracing; disable clears retained samples',()=>{
 const trace=createContactTrace({enabled:'true'}),b=fixture();assert.equal(trace.enabled,false);trace.setEnabled(true);trace.observe(b);assert.equal(trace.snapshot().frames.length,1);trace.setEnabled(false);assert.equal(trace.snapshot().enabled,false);trace.setEnabled(true);assert.deepEqual(trace.snapshot().frames,[]);assert.equal(trace.setEnabled(1),false);
});
test('observation uses authoritative body radius and filters dead, gated and invalid bodies, retaining dormant living bodies',()=>{
 const b=fixture([enemy('live'),enemy('zero',641,600,{hp:0}),enemy('dead',642,600,{dead:true}),enemy('gate',643,600,{gate:{objective:'locked',minimum:1}}),enemy('invalid',NaN),enemy('far',2000)]),trace=createContactTrace({enabled:true});
 trace.observe(b);let snapshot=trace.snapshot();assert.deepEqual(snapshot.bodies.map(b=>b.id),['live']);assert.equal(snapshot.hero.radius,ACTOR_BODY_TUNING.heroRadius);assert.equal(snapshot.bodies[0].radius,11);assert.equal(snapshot.bodies[0].rollPushable,false);
 b.equipmentContext.world.objectives.locked=1;trace.observe(b);assert.deepEqual(trace.snapshot().bodies.map(b=>b.id),['live','gate']);
 b.poeMobility={snapshot:()=>({state:'roll'})};trace.observe(b);assert.equal(trace.snapshot().hero.radius,ACTOR_BODY_TUNING.rollingHeroRadius);assert.equal(trace.snapshot().hero.rolling,true);
});
test('optional visibility filter applies to bounded eligible enemies without being retained',()=>{
 const trace=createContactTrace({enabled:true}),b=fixture([enemy('visible'),enemy('hidden',650),enemy('dead',640,600,{hp:0})]);let calls=0;
 trace.observe(b,{entityVisible:actor=>(calls++,actor.id==='visible')});assert.equal(calls,2);assert.deepEqual(trace.snapshot().bodies.map(x=>x.id),['visible']);trace.snapshot();trace.draw(recordingContext().ctx,view);assert.equal(calls,2);
});
test('frozen source remains untouched and returned nested values cannot modify internal or live snapshots',()=>{
 const b=fixture([enemy('large',622)]);move(b,1,0);freeze(b);const before=JSON.stringify(b),trace=createContactTrace({enabled:true});trace.observe(b,{stepped:true,move:{x:1,y:0}});const original=trace.snapshot(),copy=trace.snapshot();
 copy.hero.x=999;copy.frames[0].x=999;copy.bodies[0].x=999;copy.path[0].x0=999;copy.markers[0].x=999;copy.move.x=999;assert.deepEqual(trace.snapshot(),original);assert.equal(JSON.stringify(b),before);
});
test('actual frontal sweep stops at large body; near marker is explicitly inferred, never an engine contact',()=>{
 const b=fixture([enemy('large',650)]),trace=createContactTrace({enabled:true});trace.observe(b);move(b,200,0);trace.observe(b,{stepped:true,move:{x:1,y:0}});const s=trace.snapshot();
 close(s.hero.x,628);assert.equal(s.bodyModel,'poe-actor-body');assert.equal(s.engineContactsAvailable,false);assert.equal(s.pathBasis,'engine-final-slice');assert.deepEqual(s.path,b.poeHeroPath);assert.deepEqual(s.markers.map(m=>m.kind),['proximity']);assert.equal(s.markers[0].inferred,true);assert.equal(s.markers[0].basis,'snapshot-circle-distance');assert.equal(s.markers[0].cause,'unknown');close(s.markers[0].gap,0);close(s.markers[0].x,639);
});
test('actual tangent slide reports observed path bend with inferred cause, not collision attribution',()=>{
 const b=fixture([enemy('large',640)]),trace=createContactTrace({enabled:true});trace.observe(b);move(b,65,30);trace.observe(b,{stepped:true});const markers=trace.snapshot().markers.filter(m=>m.kind==='deflection');assert.ok(markers.length>0);assert.ok(markers.every(m=>m.inferred&&m.cause==='unknown'&&m.basis==='resolved-path-bend'));
});
test('overlap is geometry only and never corrects or separates actors',()=>{
 const b=fixture([enemy('large',605)]),trace=createContactTrace({enabled:true}),before=JSON.stringify(b);trace.observe(b);const s=trace.snapshot();assert.equal(s.markers[0].kind,'overlap');assert.equal(s.markers[0].gap,-17);assert.equal(JSON.stringify(b),before);
});
test('zero-radius roll point still stops against large body and shows no fake enlarged sweep',()=>{
 const b=fixture([enemy('large',640)]),trace=createContactTrace({enabled:true});b.poeMobility={snapshot:()=>({state:'roll'})};trace.observe(b);move(b,100,0,{rolling:true});trace.observe(b,{stepped:true});const s=trace.snapshot();close(s.hero.x,629);assert.equal(s.hero.radius,0);assert.ok(contactTraceCircle(s.hero).every(p=>p.x===s.hero.x&&p.y===s.hero.y));close(s.markers[0].gap,0);
});
test('paused/repeated observation neither appends duplicate samples nor re-certifies an old engine path',()=>{
 const b=fixture(),trace=createContactTrace({enabled:true});trace.observe(b);move(b,1,0);trace.observe(b,{stepped:true});assert.ok(trace.snapshot().path.length);const length=trace.snapshot().frames.length;for(let i=0;i<20;i++)trace.observe(b,{stepped:true});assert.equal(trace.snapshot().frames.length,length);assert.deepEqual(trace.snapshot().path,[]);assert.equal(trace.snapshot().pathBasis,null);
});
test('a stale endpoint and malformed path are omitted rather than displayed as a resolved sweep',()=>{
 for(const path of [[{x0:600,y0:600,x1:601,y1:600,t0:0,t1:1}],[{x0:600,y0:600,x1:NaN,y1:600,t0:0,t1:1}],[{x0:600,y0:600,x1:600,y1:600,t0:1,t1:0}],[{x0:600,y0:600,x1:600,y1:600,t0:0,t1:.5},{x0:620,y0:600,x1:600,y1:600,t0:.5,t1:1}]]){
  const b=fixture(),trace=createContactTrace({enabled:true});b.poeHeroPath=path;trace.observe(b,{stepped:true});assert.deepEqual(trace.snapshot().path,[]);
 }
});
test('a final-slice path is never stretched back to claim the complete display-frame route',()=>{
 const b=fixture(),trace=createContactTrace({enabled:true});trace.observe(b);move(b,10,0);move(b,10,0);const finalSlice=structuredClone(b.poeHeroPath);trace.observe(b,{stepped:true});const s=trace.snapshot();assert.equal(s.frames[0].x,600);assert.equal(s.hero.x,620);assert.equal(s.path[0].x0,610);assert.deepEqual(s.path,finalSlice);assert.equal(s.pathBasis,'engine-final-slice');
});
test('legacy mode labels body reference only and omits stale opt-in engine path',()=>{
 const b=fixture([enemy('large',622)]);delete b.poeMobility;b.poeHeroPath=[{x0:600,y0:600,x1:600,y1:600,t0:0,t1:1}];const trace=createContactTrace({enabled:true});trace.observe(b,{stepped:true});const s=trace.snapshot();assert.equal(s.bodyModel,'reference-only-legacy-wall-movement');assert.deepEqual(s.path,[]);const r=recordingContext();trace.draw(r.ctx,view);assert.ok(r.calls.some(c=>c.op==='text'&&c.args[0].includes('reference only')));
});
test('death, region/life changes, rewind, explicit clear and large discontinuity cannot bridge old trails',()=>{
 for(const mutate of [b=>b.region='new',b=>b.stateLife++,b=>b.time=-1,b=>b.p.x+=300]){const b=fixture(),trace=createContactTrace({enabled:true});trace.observe(b);move(b,1,0);trace.observe(b);mutate(b);trace.observe(b);assert.equal(trace.snapshot().frames.length,1);}
 for(const mutate of [b=>b.dead=true,b=>b.p.hp=0,b=>b.p.x=NaN]){const b=fixture(),trace=createContactTrace({enabled:true});trace.observe(b);mutate(b);assert.equal(trace.observe(b),false);assert.deepEqual(trace.snapshot().frames,[]);}
 const trace=createContactTrace({enabled:true});trace.observe(fixture());trace.clear();assert.deepEqual(trace.snapshot().frames,[]);
});
test('sample and actor maxima cannot be expanded by caller options; latest nearest bodies win',()=>{
 const b=fixture(Array.from({length:100},(_,i)=>enemy(String(i),600+150-i))),trace=createContactTrace({enabled:true,frameLimit:1e9,actorLimit:1e9});
 for(let i=0;i<200;i++){b.time+=1/60;trace.observe(b);}const s=trace.snapshot();assert.equal(s.frames.length,LIMITS.frames);assert.equal(s.bodies.length,LIMITS.actors);assert.equal(s.bodies[0].id,'99');assert.equal(s.actorsClipped,true);assert.equal(s.frames.at(-1).sequence,200);
});
test('enemy scan never touches array positions beyond the fixed per-observation budget',()=>{
 const enemies=Array(LIMITS.scan+2).fill(null);Object.defineProperty(enemies,String(LIMITS.scan),{get(){throw Error('scan escaped bound');}});const trace=createContactTrace({enabled:true});trace.observe(fixture(enemies));assert.equal(trace.snapshot().scanned,LIMITS.scan);assert.equal(trace.snapshot().scanClipped,true);
});
test('path copying has a hard limit and discloses clipping',()=>{
 const b=fixture(),trace=createContactTrace({enabled:true});b.poeHeroPath=Array.from({length:LIMITS.path+1},(_,i)=>({x0:600,y0:600,x1:600,y1:600,t0:i/(LIMITS.path+1),t1:(i+1)/(LIMITS.path+1)}));trace.observe(b,{stepped:true});assert.equal(trace.snapshot().path.length,LIMITS.path);assert.equal(trace.snapshot().pathClipped,true);const r=recordingContext();trace.draw(r.ctx,view);assert.ok(r.calls.some(c=>c.op==='text'&&c.args[0].includes('clipped')));
});
test('every ground-circle sample projects back onto the exact authoritative world radius across viewport and camera changes',()=>{
 for(const radius of [0,11])for(const [width,height,focus,zoom] of [[1180,757,{x:600,y:600},ISO.zoom],[390,780,{x:570,y:640},ISO.zoom],[2400,1200,{x:0,y:0},2]]){
  const body={x:630,y:625,radius};for(const p of contactTraceCircle(body)){const q=contactTraceToScreen(p,{focus,width,height,zoom}),world=screenToWorld(q.x,q.y,focus,width,height,zoom);close(Math.hypot(world.x-body.x,world.y-body.y),radius);}
 }
});
test('ground-circle projection uses the real renderer geometry including shake, without sprite height',()=>{
 const b=fixture(),width=1180,height=757,time=.24,shake=5,translations=[],r=recordingContext(),ctx=new Proxy(r.ctx,{get(target,key){return key==='translate'?(x,y)=>translations.push({x,y}):target[key];}});
 const shape={type:'circle',x:640,y:625,r:11},actor=enemy('tell',640,625,{active:true,state:'windup',telegraph:{shapes:[shape],elapsed:0,duration:1}});
 createVisualRenderer(ctx,{environment:{sprites:{}}},{},{createCanvas:null}).render({width,height,map:b.map,p:b.p,entities:[actor],time,shake,cleanView:true});
 const circle=contactTraceCircle({x:shape.x,y:shape.y,radius:shape.r});const expected=circle[0],ground=projectWorld(expected.x-b.p.x,expected.y-b.p.y),q=contactTraceToScreen(expected,{focus:b.p,width,height,time,shake});close(q.x,width*.5+ground.x*ISO.zoom+translations[0].x);close(q.y,height*.55+ground.y*ISO.zoom+translations[0].y);
 // Match the actual renderer warning circle's first ground vertex, not only
 // another test formula. The QA body has the same world radius and anchor.
 const vertex=r.calls.flatMap(c=>c.path).find(p=>p[0]==='moveTo'&&Math.abs(p[1]-(q.x-translations[0].x))<1e-7&&Math.abs(p[2]-(q.y-translations[0].y))<1e-7);assert.ok(vertex,'real renderer contains the same projected ground-circle vertex');
});
test('draw preserves canvas state, marks inference visibly and performs no animated fill/flash work',()=>{
 const trace=createContactTrace({enabled:true}),b=fixture([enemy('near',622)]);trace.observe(b);const r=recordingContext();r.ctx.strokeStyle='#123';r.ctx.globalAlpha=.3;r.ctx.filter='contrast(2)';r.ctx.font='17px serif';trace.draw(r.ctx,view);assert.equal(r.ctx.strokeStyle,'#123');assert.equal(r.ctx.globalAlpha,.3);assert.equal(r.ctx.filter,'contrast(2)');assert.equal(r.ctx.font,'17px serif');assert.ok(r.calls.some(c=>c.op==='text'&&c.args[0].includes('inferred')));assert.ok(r.calls.every(c=>!['fill','image','fillRect'].includes(c.op)));
});
test('maximum-size draw stays under a deterministic canvas path-vertex budget',()=>{
 const b=fixture(Array.from({length:100},(_,i)=>enemy(String(i),610+i,601))),trace=createContactTrace({enabled:true});for(let i=0;i<120;i++){b.time+=.01;trace.observe(b);}const r=recordingContext();trace.draw(r.ctx,view);const vertices=r.calls.filter(c=>c.op==='stroke').reduce((n,c)=>n+c.path.length,0);assert.ok(vertices<1300,`${vertices} recorded vertices`);
});
for(const hz of [30,60,120])for(const action of ['walk','roll','attack'])test(`real ${hz}Hz ${action}: QA ON/OFF preserves events, actors, HP, RNG, time and durable report exactly`,()=>{
 const a=runtime(),b=runtime(),on=createContactTrace({enabled:true}),off=createContactTrace();const input={move:{x:1,y:0},aim:{x:900,y:600},attack:action==='attack'};
 if(action==='roll'){const first={dodgeOnly:true,move:input.move};assert.deepEqual(acceptBattleInput(a.b,first),acceptBattleInput(b.b,first));}
 on.observe(a.b);off.observe(b.b);
 for(let i=0;i<hz;i++){
  const left=stepBattle(a.b,a.s.character,1/hz,input),right=stepBattle(b.b,b.s.character,1/hz,input);assert.deepEqual(left,right);on.observe(a.b,{stepped:true,move:input.move});off.observe(b.b,{stepped:true,move:input.move});on.draw(recordingContext().ctx,{...view,focus:a.b.p,time:a.b.time});assert.equal(serial(a.b),serial(b.b));
 }
});

test('active enemy AI and damaging combat retain the exact event stream and checkpoint with tracing enabled',()=>{
 const a=runtime(),b=runtime(),trace=createContactTrace({enabled:true});for(const f of [a,b]){f.b.enemies[0].stun=0;f.b.enemies[0].active=true;f.b.enemies[0].x=627;}
 const events=[];trace.observe(a.b);
 for(let i=0;i<240;i++){
  const input={move:{x:1,y:0},aim:{x:900,y:600}},left=stepBattle(a.b,a.s.character,1/60,input),right=stepBattle(b.b,b.s.character,1/60,input);events.push(...left);assert.deepEqual(left,right);trace.observe(a.b,{stepped:true,move:input.move});assert.equal(serial(a.b),serial(b.b));
 }
 assert.ok(events.some(e=>e.type==='heroHurt'&&e.damage>0),'real hostile attack must damage the hero');assert.ok(events.length>0);assert.deepEqual(battleReport(a.b),battleReport(b.b));
});

test('invalid projection views are rejected without drawing or modifying source',()=>{
 const trace=createContactTrace({enabled:true});trace.observe(fixture());for(const bad of [{...view,width:0},{...view,height:Infinity},{...view,focus:{x:NaN,y:1}},{...view,zoom:0}]){const r=recordingContext();assert.equal(trace.draw(r.ctx,bad),false);assert.deepEqual(r.calls,[]);}
});
