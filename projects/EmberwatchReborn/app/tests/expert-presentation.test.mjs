import test from 'node:test';
import assert from 'node:assert/strict';
import {bannerOutline,expertFootprint,expertEffectOutline,onslaughtPresentation,createOnslaughtPresentationTracker,onslaughtOutline,expertStatusHints,EXPERT_STYLE as STYLE} from '../src/expert-presentation.js';
import {createVisualRenderer,ISO,projectWorld,spriteDirection} from '../src/visual.js';
import {MOTION_ACTIONS,motionFrame} from '../src/motion.js';
import {inMap,lineOfSight} from '../src/world-geometry.js';
import {ART} from '../src/art.js';
import {fixture,placeBanner,run as runCombat} from './support/expert-fixture.mjs';
import {bannerAt} from '../src/combat.js';

// Contract-shaped scripted fixtures, not an earned Expert profile or pixels.
const openMap=()=>({w:28,h:28,rooms:[],tiles:Array.from({length:28},()=>Array(28).fill(1))});
const banner=(patch={})=>({x:384,y:384,radius:128,remaining:15,region:'ember_furnace',augmentRanks:{banner_of_protection:0,banner_of_zeal:0},...patch});
const effect=(id='flames_of_devotion',patch={})=>({type:'slash',x:384,y:384,angle:0,r:id==='zealous_lance'?180:90,color:'#eebb77',life:.2,max:.3,expertFootprint:{skillId:id,range:id==='zealous_lance'?180:90,arcRadians:id==='zealous_lance'?Math.PI/3:2.1},...patch});
const action=(patch={})=>({id:'zealous_onslaught',castId:1,angle:.6,elapsed:0,paidSeconds:1,pulses:0,spec:{duration:.3,channelDuration:4,tickSeconds:.25,range:80,halfWidth:18,maxPayments:4,exitRecovery:.18},...patch});
const hero=(patch={})=>({x:384,y:384,hp:100,angle:0,...patch});
const scene=(patch={})=>({width:1000,height:750,regionId:'ember_furnace',map:openMap(),p:hero(),entities:[],effects:[],time:1,cleanView:true,...patch});
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const gradient=Object.freeze({addColorStop(){}});
function recorder(){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over',dash:[]};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:['fill','stroke'].includes(op)?structuredClone(path):[],...data,dash:[...data.dash]});
 const methods={save(){stack.push({...data,dash:[...data.dash]});},restore(){Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(v){data.dash=[...v];},createRadialGradient(){return gradient;},measureText(text){return {width:text.length*7};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)}),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{hero:{id:'motion'}}};
 const renderer=createVisualRenderer(ctx,ART,images,{createCanvas:null});return {calls,renderer,draw(s){calls.length=0;renderer.render(s);return calls;}};
}
const render=s=>{const r=recorder();r.draw(s);return r;};
const strokes=(r,color)=>r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===color);
const texts=r=>r.calls.filter(c=>c.op==='fillText').map(c=>c.args[0]);

test('Banner uses the exact live128-radius boundary and bounded arc sampling',()=>{
 const b=banner(),points=bannerOutline(openMap(),b,b.region);assert.ok(points.length>260&&points.length<280);
 for(const p of points)assert.ok(Math.abs(Math.hypot(p.x-b.x,p.y-b.y)-128)<1e-9);
});
for(const [label,patch] of [['expired',{remaining:0}],['negative lifetime',{remaining:-1}],['nonfinite',{remaining:Infinity}],['invalid radius',{radius:NaN}],['wrong region',{region:'other'}]])test(`Banner hides ${label}`,()=>{assert.deepEqual(bannerOutline(openMap(),banner(patch),'ember_furnace'),[]);});
test('Banner clips solid walls and unrevealed tiles without painting a far-side pocket',()=>{
 const map=openMap();map.tiles.forEach(row=>row[14]=0);const b=banner(),points=bannerOutline(map,b,b.region);
 assert.ok(points.every(p=>p.x<448&&inMap(map,p.x,p.y,0)&&lineOfSight(map,b,p)));
 const seen=map.tiles.map(row=>row.map((_,x)=>x<13)),fogged=bannerOutline(map,b,b.region,seen);assert.ok(fogged.every(p=>p.x<416));
 const hidden=map.tiles.map(row=>row.map(()=>false));assert.deepEqual(bannerOutline(map,b,b.region,hidden),[]);
});
for(const [id,radius,arc] of [['flames_of_devotion',90,2.1],['zealous_lance',180,Math.PI/3]])test(`${id} uses exact runtime center radius${radius} and its own arc, without legacy padding`,()=>{
 const f=effect(id),points=expertEffectOutline(openMap(),f);assert.deepEqual(points[0],{x:f.x,y:f.y});
 for(const p of points.slice(1))assert.ok(Math.abs(Math.hypot(p.x-f.x,p.y-f.y)-radius)<1e-9);
 assert.ok(Math.abs(Math.atan2(points[1].y-f.y,points[1].x-f.x)+arc/2)<1e-9);assert.ok(Math.abs(Math.atan2(points.at(-1).y-f.y,points.at(-1).x-f.x)-arc/2)<1e-9);
 const map=openMap();map.tiles.forEach(row=>row[14]=0);assert.ok(expertEffectOutline(map,f).every(p=>p.x<448&&lineOfSight(map,f,p)));
});
test('Expert FX opt-in needs supported identity, finite accepted geometry and living effect',()=>{
 for(const f of [effect('unknown'),effect('flames_of_devotion',{life:0}),effect('flames_of_devotion',{angle:NaN}),effect('flames_of_devotion',{expertFootprint:{skillId:'flames_of_devotion',range:null,arcRadians:2}}),{type:'slash',r:90,life:.2,max:.3}]){assert.equal(expertFootprint(f),null);assert.deepEqual(expertEffectOutline(openMap(),f),[]);}
});
test('Onslaught phases use accepted startup, locked angle, payments and pulses',()=>{
 const p=hero({angle:2,action:action({elapsed:.29})}),startup=onslaughtPresentation(p);assert.equal(startup.phase,'startup');assert.equal(startup.angle,.6);assert.equal(startup.motion.action,'warcry');assert.equal(startup.paid,1);assert.equal(startup.pulses,0);
 p.action.elapsed=.3;let active=onslaughtPresentation(p);assert.equal(active.phase,'active');assert.equal(active.progress,0);assert.equal(active.motion.action,'attack3');
 p.action={...p.action,elapsed:1.3,paidSeconds:2,pulses:4};p.block=true;active=onslaughtPresentation(p);assert.equal(active.paid,2);assert.equal(active.pulses,4);assert.equal(active.guard,true);assert.equal(active.progress,.25);
 p.action.elapsed=4.3001;assert.equal(onslaughtPresentation(p),null);p.action.elapsed=1;p.hp=0;assert.equal(onslaughtPresentation(p),null);
});
test('channel spec shortened by a buff drives startup, no assumed fixed cast time',()=>{
 const a=action();a.spec.duration=.18;assert.equal(onslaughtPresentation(hero({action:{...a,elapsed:.18}})).phase,'active');
 for(const extra of [{elapsed:NaN},{angle:Infinity},{spec:{...a.spec,tickSeconds:0}},{spec:{...a.spec,duration:null}}])assert.equal(onslaughtPresentation(hero({action:{...a,...extra}})),null);
});
test('Onslaught rectangle follows current hero and accepted angle without endpoint padding',()=>{
 const p=hero({action:action({angle:0,elapsed:.4})}),cue=onslaughtPresentation(p),points=onslaughtOutline(openMap(),p,cue);
 assert.equal(Math.min(...points.map(q=>q.x)),p.x);assert.equal(Math.max(...points.map(q=>q.x)),p.x+80);assert.equal(Math.min(...points.map(q=>q.y)),p.y-18);assert.equal(Math.max(...points.map(q=>q.y)),p.y+18);
 const map=openMap();map.tiles.forEach(row=>row[14]=0);assert.ok(onslaughtOutline(map,p,cue).every(q=>q.x<448&&lineOfSight(map,p,q)));
 assert.deepEqual(onslaughtOutline(map,p,{...cue,phase:'recovery'}),[]);
});
test('recovery is only an observed channel and stays paused with simulation, never restored from a save lock',()=>{
 const tracker=createOnslaughtPresentationTracker(),p=hero({action:action({elapsed:1}),recoveryLock:0}),s=scene({p,time:1});assert.equal(tracker(s).phase,'active');
 p.action=null;p.recoveryLock=.18;s.time=1.01;const recovering=tracker(s);assert.equal(recovering.phase,'recovery');assert.equal(recovering.guard,false);assert.deepEqual(tracker(s),recovering);
 p.recoveryLock=.09;s.time=1.10;assert.ok(tracker(s).motion.phase>recovering.motion.phase);
 p.recoveryLock=0;assert.equal(tracker(s),null);p.recoveryLock=.18;assert.equal(tracker(s),null);
 assert.equal(createOnslaughtPresentationTracker()(s),null);
});
test('replacement actor, region change, later time, death and another action clear remembered recovery',()=>{
 for(const patch of [s=>s.p={...s.p},s=>s.regionId='other',s=>s.time=2,s=>s.p.hp=0,s=>s.p.action={id:'mace_swing'}]){
  const tracker=createOnslaughtPresentationTracker(),s=scene({p:hero({action:action({elapsed:1})}),time:1});tracker(s);s.p.action=null;s.p.recoveryLock=.18;patch(s);assert.equal(tracker(s),null);
 }
});
test('hero status hints expose only registered live statuses, actual Inner Flame and current Banner LOS',()=>{
 const p=hero({negativeStatuses:{stun:{remaining:1},silence:{remaining:2},disarm:{remaining:1},slow:{remaining:1},burn:{remaining:1},poison:{remaining:1},unknown:{remaining:9}},innerFlame:{rank:1,remaining:2}}),map=openMap(),b=banner();let hints=expertStatusHints(p,{player:true,map,banner:b,regionId:b.region});assert.equal(hints.length,8);assert.equal(hints.filter(h=>h.negative).length,6);
 b.augmentRanks.banner_of_protection=1;assert.equal(expertStatusHints(p,{player:true,map,banner:b,regionId:b.region}).at(-1).label,'수호 깃발');b.augmentRanks={banner_of_zeal:1};assert.equal(expertStatusHints(p,{player:true,map,banner:b,regionId:b.region}).at(-1).label,'격려 깃발');
 p.x=b.x+128;assert.ok(expertStatusHints(p,{player:true,map,banner:b,regionId:b.region}).some(h=>h.id==='battle_banner'));p.x+=.01;assert.equal(expertStatusHints(p,{player:true,map,banner:b,regionId:b.region}).some(h=>h.id==='battle_banner'),false);
 p.x=480;map.tiles.forEach(row=>row[14]=0);assert.equal(expertStatusHints(p,{player:true,map,banner:b,regionId:b.region}).some(h=>h.id==='battle_banner'),false);
 p.negativeStatuses={poison:{remaining:0}};p.innerFlame.remaining=0;assert.deepEqual(expertStatusHints(p,{player:true}),[]);
});
test('enemy Lawbringer hints disappear on expiry, inactive and death',()=>{
 const e={hp:20,active:true,disarm:{remaining:1},silence:{remaining:1}};assert.deepEqual(expertStatusHints(e).map(h=>h.id),['disarm','silence']);
 for(const patch of [{hp:0},{dead:true},{active:false},{disarm:{remaining:0},silence:{remaining:0}}])assert.deepEqual(expertStatusHints({...e,...patch}),[]);
});
test('actual renderer puts Banner, exact Flames/Lance and channel below loot and hostile danger',()=>{
 const enemy={id:'a',kind:'furnace_tender',type:'guardian',x:416,y:384,hp:54,max:54,active:true,state:'windup',angle:0,telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:416,y:384,x2:352,y2:384,width:14}]}},r=render(scene({p:hero({action:action({elapsed:.7})}),banner:banner(),effects:[effect(),effect('zealous_lance')],entities:[enemy],loot:[{type:'gold',x:400,y:384,bob:0}]}));
 const floor=r.calls.filter(c=>c.op==='stroke'&&[STYLE.banner,STYLE.flame,STYLE.lance,STYLE.channel].includes(c.strokeStyle));assert.equal(floor.length,5);
 const later=r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'||c.op==='drawImage'&&['motion','enemy'].includes(c.args[0].id)||c.op==='fillRect'&&c.fillStyle==='#e8c07b');assert.ok(later.length>=4);assert.ok(floor.every(c=>later.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))));
 const casings=strokes(r,STYLE.bannerOutline);assert.equal(casings.length,2);assert.ok(casings.every(c=>later.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))),'continuous casing also remains below loot, hostile tells and actors');
 assert.equal(strokes(r,'#eebb77').length,0,'tagged expert slashes do not also paint elevated generic arcs');
 const hints=r.calls.filter(c=>c.op==='fillText'&&[STYLE.text,STYLE.positive,STYLE.negative].includes(c.fillStyle)),warnings=r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle==='#f29187');assert.ok(hints.length);assert.ok(hints.every(c=>warnings.every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))),'hint labels cannot paint over hostile tell paths');
 const fill=r.calls.filter(c=>c.op==='fill'&&c.fillStyle===STYLE.banner);assert.equal(fill.length,1);assert.equal(fill[0].globalAlpha,STYLE.bannerFillAlpha);
});
test('actual renderer transforms the exact Lance footprint without old slash arc or radius changes',()=>{
 const s=scene({effects:[effect('zealous_lance')]}),r=render(s),stroke=strokes(r,STYLE.lance)[0],expected=expertEffectOutline(s.map,s.effects[0]);
 expected.forEach((p,i)=>{const q=projectWorld(p.x-s.p.x,p.y-s.p.y);assert.ok(Math.abs(stroke.path[i][1]-(s.width*.5+q.x*ISO.zoom))<1e-9);assert.ok(Math.abs(stroke.path[i][2]-(s.height*.55+q.y*ISO.zoom))<1e-9);});
});
test('actual hero motion uses existing art with startup/contact/recovery and locked direction',()=>{
 const r=recorder(),p=hero({angle:2,action:action({angle:0,elapsed:.15})}),s=scene({p,time:1}),motion=()=>r.calls.find(c=>c.op==='drawImage'&&c.args[0].id==='motion');
 r.draw(s);let cue=onslaughtPresentation(p);assert.equal(motion().args[2],(spriteDirection(0)*MOTION_ACTIONS.length+MOTION_ACTIONS.indexOf('warcry'))*112);assert.equal(motion().args[1],motionFrame(cue.motion.action,cue.motion.phase)*112);
 p.action.elapsed=.8;s.time=1.1;r.draw(s);assert.equal(motion().args[2],(spriteDirection(0)*MOTION_ACTIONS.length+MOTION_ACTIONS.indexOf('attack3'))*112);
 p.action=null;p.recoveryLock=.18;s.time=1.12;r.draw(s);assert.ok(texts(r).includes('진격 회수'));assert.equal(strokes(r,STYLE.channel).length,0);assert.equal(motion().args[1],motionFrame('attack3',.55)*112);
});
test('flash0 keeps Expert shapes, status labels and existing motion without mutating frozen input',()=>{
 const s=scene({banner:banner(),effects:[effect(),effect('zealous_lance')],p:hero({action:action({elapsed:1.3,paidSeconds:2,pulses:4}),block:true,innerFlame:{rank:1,remaining:2},negativeStatuses:{silence:{remaining:1}}}),entities:[{id:'a',type:'guardian',x:430,y:384,hp:50,max:60,active:true,disarm:{remaining:1},silence:{remaining:1}}]}),before=structuredClone(s),a=render(freeze(s)),b=render({...s,reduced:true,flashScale:0,time:100});
 const focus=r=>r.calls.filter(c=>c.op==='stroke'&&[STYLE.banner,STYLE.bannerOutline,STYLE.flame,STYLE.lance,STYLE.channel].includes(c.strokeStyle)||c.op==='fillText'&&[STYLE.text,STYLE.negative,STYLE.positive].includes(c.fillStyle));assert.deepEqual(focus(a),focus(b));assert.deepEqual(s,before);
 assert.ok(texts(a).some(s=>s.includes('2/4 지불 · 4회')&&s.includes('방벽')));assert.ok(texts(a).includes('무장 해제 · 침묵'));assert.ok(texts(a).includes('가슴속 잿불 · 전투 깃발'));
});
test('absent, expired and off-region Expert data leave the existing renderer commands unchanged',()=>{
 const s=scene(),base=render(s);for(const patch of [{banner:banner({remaining:0})},{banner:banner({region:'other'})},{p:hero({negativeStatuses:{slow:{remaining:0}},innerFlame:{remaining:0}})}])assert.deepEqual(render({...s,...patch}).calls,base.calls);
 const hidden=scene({banner:banner(),effects:[effect()],p:hero({action:action({elapsed:1})})});hidden.seen=hidden.map.tiles.map(row=>row.map(()=>false));const r=render(hidden);assert.equal(strokes(r,STYLE.banner).length,0);assert.equal(strokes(r,STYLE.flame).length,0);assert.equal(strokes(r,STYLE.channel).length,0);assert.equal(texts(r).some(s=>s.includes('진격')),false);
});

test('recovery keeps its actual residual across a last-active frame boundary and does not extend stale locks',()=>{
 const tracker=createOnslaughtPresentationTracker(),p=hero({action:action({elapsed:1})}),s=scene({p,time:1});tracker(s);p.action=null;p.recoveryLock=.17;s.time=1.05;assert.equal(tracker(s).phase,'recovery');p.recoveryLock=.03;s.time=1.19;assert.equal(tracker(s).phase,'recovery');s.time=1.23;assert.equal(tracker(s),null);
});

test('tagged Banner placement uses only the dedicated quiet ground ring while ordinary ring effects remain',()=>{
 const color='#dec692',placement={type:'ring',x:384,y:384,r:128,color,life:.5,max:.5,bannerPlacement:true};
 const r=render(scene({banner:banner(),effects:[placement]}));assert.equal(strokes(r,color).length,0);assert.equal(strokes(r,STYLE.banner).length,2);
 const ordinary=render(scene({effects:[{...placement,bannerPlacement:undefined}]}));assert.equal(strokes(ordinary,color).length,1);
});

// Post-QA regressions: command evidence, not a substitute for corrected pixels.
test('Banner has a continuous dark casing and longer warm dash on the same exact floor boundary',()=>{
 const s=scene({banner:banner(),reduced:true,flashScale:0}),r=render(s),edge=strokes(r,STYLE.banner)[0],casing=strokes(r,STYLE.bannerOutline)[0];
 assert.deepEqual(casing.path,edge.path);assert.deepEqual(casing.dash,[]);assert.deepEqual(edge.dash,[10,6]);
 assert.equal(casing.lineWidth,4.2);assert.equal(edge.lineWidth,1.8);assert.equal(casing.globalAlpha,.94);assert.equal(edge.globalAlpha,.92);
 assert.equal(edge.globalCompositeOperation,'source-over');assert.equal(casing.globalCompositeOperation,'source-over');
 const points=bannerOutline(s.map,s.banner,s.regionId);assert.equal(edge.path.length,points.length+1);
 points.forEach((p,i)=>{const q=projectWorld(p.x-s.p.x,p.y-s.p.y);assert.ok(Math.abs(edge.path[i][1]-(s.width*.5+q.x*ISO.zoom))<1e-9);assert.ok(Math.abs(edge.path[i][2]-(s.height*.55+q.y*ISO.zoom))<1e-9);});
 const later=render({...s,time:13});assert.deepEqual(strokes(later,STYLE.bannerOutline),strokes(r,STYLE.bannerOutline));assert.deepEqual(strokes(later,STYLE.banner),strokes(r,STYLE.banner));
});
test('combat-created Banner visual stays at the accepted placement and vanishes at the real expiry',()=>{
 const f=fixture({banner_of_protection:1});placeBanner(f);const b=f.b.banner;assert.ok(b);assert.equal(b.radius,128);assert.equal(b.buffDuration,15);
 const sceneFromBattle=()=>scene({regionId:f.b.region,map:f.b.map,p:f.b.p,banner:f.b.banner,time:f.b.time,reduced:true,flashScale:0});
 assert.ok(strokes(render(sceneFromBattle()),STYLE.banner).length);const origin={x:b.x,y:b.y};
 runCombat(f,.3,{move:{x:1,y:0}});assert.deepEqual({x:b.x,y:b.y},origin);assert.ok(bannerAt(f.b));
 runCombat(f,b.remaining-.001);assert.ok(strokes(render(sceneFromBattle()),STYLE.banner).length);
 runCombat(f,.001);assert.equal(f.b.banner,null);assert.equal(bannerAt(f.b),null);assert.equal(strokes(render(sceneFromBattle()),STYLE.banner).length,0);
});
