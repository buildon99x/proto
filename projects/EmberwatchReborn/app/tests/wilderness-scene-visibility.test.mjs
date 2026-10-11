import {createMainInputFixture} from './support/main-input-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {wildernessSceneVisibility,WILDERNESS_LANDMARK_RANGE} from '../src/wilderness-scene-visibility.js';
import {wildernessObjectView,wildernessPortalView} from '../src/wilderness-presentation.js';
import {createBattle} from '../src/combat.js';
import {lineOfSight,inMap,mapFromRegion} from '../src/world-geometry.js';
import {createVisualRenderer} from '../src/visual.js';
import {ART} from '../src/art.js';
import {mainImports} from './support/main-imports.mjs';
import {W,stages,object} from './support/earned-wilderness-route.mjs';
// Command-earned progression with explicit position/actor presentation fixtures.
// These are actual production helper/main/renderer calls, not browser play.
let earned;const route=()=>structuredClone(earned??=stages());
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const visibility=(s,b)=>wildernessSceneVisibility(b,{objectives:s.world.objectives,objectView:o=>wildernessObjectView(s,o),portalView:o=>wildernessPortalView(s,o)});
function fixture(stage,p){const s=route()[stage],b=createBattle(s);if(p)Object.assign(b.p,{x:p.x,y:p.y});return {s,b,v:visibility(s,b)};}
const gradient={addColorStop(){}};
function render(b,v,{entities=b.enemies,objects=[],reduced=false}={}){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none'};
 const methods={save(){stack.push({...data});},restore(){Object.assign(data,stack.pop());},beginPath(){},moveTo(){},lineTo(){},ellipse(){},closePath(){},stroke(){calls.push({op:'stroke',...data});},fill(){},fillRect(){},drawImage(...args){calls.push({op:'image',args,...data});},fillText(...args){calls.push({op:'text',args,...data});},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;},measureText(text){return {width:text.length*7};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,val)=>(data[k]=val,true)});
 const renderer=createVisualRenderer(ctx,ART,{environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}},{createCanvas:null});
 const scene={width:1600,height:1000,regionId:b.region,map:b.map,p:b.p,entities,objects,sceneVisibility:v,seen:v?.seen,effects:b.effects,shots:b.shots,time:0,cleanView:true,reduced,flashScale:reduced?0:1};
 renderer.render(scene);return calls;
}
const enemyBodies=calls=>calls.filter(c=>c.op==='image'&&c.args[0].id==='enemy');
const props=(calls,key)=>calls.filter(c=>c.op==='image'&&c.args[0].id==='environment'&&c.args[1]===ART.environment.sprites[key].x&&c.args[2]===ART.environment.sprites[key].y);
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
function main(s,b){
 const calls=[],ctx={save(){},restore(){},fillRect(...args){calls.push({op:'rect',args});},fillText(...args){calls.push({op:'text',args});}},context={...createMainInputFixture(),...mainImports,config:()=>mainImports.controlsFor(s),state:s,battle:b,ctx,canvas:{width:1600,height:1000}};
 vm.createContext(context);const selectors=source.slice(source.indexOf('function wildernessView('),source.indexOf('function interact(')),labels=source.split('\n').find(line=>line.startsWith('function drawLabels('));
 vm.runInContext(selectors+'\n'+labels,context);return {context,calls};
}
for(const stage of ['entered','survey','anchor','calibrated','chosen','routed','approach','evidence'])test(`W ${stage}: real floor connectivity and encounter gates conceal all future-room bodies`,()=>{
 const {s,b,v}=fixture(stage,W.spawn),before=structuredClone(b.map);
 for(const e of W.foes)assert.equal(v.entityVisible(e),s.world.objectives[e.gate]>=1,e.id);
 const available=W.objects.filter(v.objectVisible).map(o=>o.id);
 if(stage==='entered')assert.deepEqual(available,['wilderness-tablet']);
 if(stage==='survey')assert.deepEqual(available,['wilderness-tablet','wilderness-hook','wilderness-anchor']);
 if(stage==='routed')assert.ok(!available.includes('wilderness-evidence')&&!available.includes('wilderness-scouts'));
 if(stage==='approach')assert.ok(available.includes('wilderness-evidence')&&!available.includes('wilderness-scouts'));
 if(stage==='evidence')assert.ok(!available.includes('wilderness-evidence')&&available.includes('wilderness-scouts'));
 assert.deepEqual(b.map,before);
});
test('encounter gate still conceals a future actor even when a fixture supplies open collision',()=>{
 const {s,b}=fixture('routed',{x:368,y:240});b.map=mapFromRegion(W,{...s.world.objectives,wilderness_keeper_open:1});
 const keeper=b.enemies.find(e=>e.kind==='wilderness_keeper'),v=visibility(s,b);assert.equal(v.seen[7][22],true);assert.equal(v.entityVisible(keeper),false);assert.equal(enemyBodies(render(b,v,{entities:[keeper]})).length,0);
});
test('actual renderer hides locked keeper body but retains accessible unaggroed keeper',()=>{
 const locked=fixture('routed',{x:368,y:240}),open=fixture('approach',{x:640,y:240});
 for(const [f,expected] of [[locked,0],[open,1]]){
  const keeper=f.b.enemies.find(e=>e.kind==='wilderness_keeper');assert.equal(keeper.active,false);
  assert.equal(enemyBodies(render(f.b,f.v,{entities:[keeper]})).length,expected);
 }
 const keeper=locked.b.enemies.find(e=>e.kind==='wilderness_keeper');assert.equal(enemyBodies(render(locked.b,null,{entities:[keeper]})).length,1,'before fixture reproduces leaked body');
});
test('actual active LOS-broken foe body and committed warning remain visible, including flash0',()=>{
 const {s,b}=fixture('entered',{x:176,y:848}),enemy=b.enemies.find(e=>e.id==='wilderness-survey-2');Object.assign(enemy,{x:336,y:848,active:true,state:'windup',telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'line',x:336,y:848,x2:176,y2:848,width:14}]}});
 assert.equal(lineOfSight(b.map,b.p,enemy),false);const v=visibility(s,b);assert.equal(v.entityVisible(enemy),true);assert.equal(v.combat,true);
 for(const reduced of [false,true]){const calls=render(b,v,{entities:[enemy],reduced});assert.equal(enemyBodies(calls).length,1);assert.ok(calls.some(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'));}
});
test('hideWhenCompleted hides hook shrine and evidence crystal, while completed durable landmarks remain',()=>{
 for(const [stage,id,key]of [['hook','hook','statue'],['evidence','evidence','crystal']]){
  const {s,b,v}=fixture(stage,object(id)),o=object(id),prop={...o,type:o.visualType,used:wildernessObjectView(s,o).completed};
  assert.equal(v.objectVisible(o),false);assert.equal(v.landmarkLabel(o),null);assert.equal(props(render(b,v,{entities:[],objects:[prop]}),key).length,0);
 }
 const {v}=fixture('hook',object('anchor'));assert.equal(v.objectVisible(object('anchor')),true,'unfinished anchor has no actions missing view epoch, but must remain visible');
 const completed=fixture('anchor',object('anchor'));assert.equal(completed.v.objectVisible(object('anchor')),true);
});
test('actual keeper return art and F candidate stay absent before defeat and appear immediately afterward',()=>{
 const portal=W.portals.find(p=>p.id==='wilderness-keeper-return');
 for(const [stage,allowed]of [['approach',false],['boss',true],['evidence',true]]){
  const {s,b,v}=fixture(stage,portal),h=main(s,b);assert.equal(wildernessPortalView(s,portal).allowed,allowed);assert.equal(v.objectVisible(portal),allowed);
  assert.equal(props(render(b,v,{entities:[],objects:[{...portal,type:'return'}]}),'arch').length,Number(allowed));
  assert.equal(h.context.nearest()?.id===portal.id,allowed);
  if(stage==='boss')assert.match(h.context.nearest().name,/기록핵 미회수/);
 }
});
test('only unavailable in-W portals leave F candidates; town locked-anchor and available return contracts remain',()=>{
 const a=route(),town=a.accepted,b=createBattle(town),anchor=mainImports.getRegion('ash_hamlet').portals.find(p=>p.id==='town-wilderness-anchor');Object.assign(b.p,anchor);
 const h=main(town,b);assert.equal(wildernessPortalView(town,anchor).allowed,false);assert.equal(h.context.nearest().id,anchor.id);h.context.drawLabels();assert.ok(h.calls.some(c=>c.op==='text'&&c.args[0]===anchor.name));assert.equal(visibility(town,b),null);
 for(const [stage,id,expected]of [['survey','wilderness-anchor-return',false],['anchor','wilderness-anchor-return',true],['entered','wilderness-town-return',true]]){
  const portal=W.portals.find(p=>p.id===id),{s,b}=fixture(stage,portal);assert.equal(main(s,b).context.nearest()?.id===id,expected);assert.equal(wildernessPortalView(s,portal).allowed,expected);
 }
});
test('nearby W labels are short and LOS-valid; full names remain in F hints and modal views',()=>{
 const {s,b,v}=fixture('anchor',{x:880,y:912}),anchor=object('anchor');assert.equal(WILDERNESS_LANDMARK_RANGE,160);assert.equal(v.landmarkLabel(anchor),'귀환 닻 · 완료');
 const h=main(s,b);h.context.drawLabels();assert.ok(h.calls.some(c=>c.op==='text'&&c.args[0]==='귀환 닻 · 완료'));assert.ok(h.calls.filter(c=>c.op==='text').every(c=>c.args[0].length<=16));
 Object.assign(b.p,anchor);const n=h.context.nearest();assert.equal(n.id,anchor.id);assert.match(n.name,/갈고리를 걸어 귀환 닻다리 연결/);assert.match(wildernessObjectView(s,anchor).detail,/완료/);
 Object.assign(b.p,{x:anchor.x+WILDERNESS_LANDMARK_RANGE+1,y:anchor.y});assert.equal(visibility(s,b).landmarkLabel(anchor),null);
 const f=fixture('chosen'),relay=object('relay');let blocked;
 for(let y=relay.y-160;y<=relay.y+160&&!blocked;y+=8)for(let x=relay.x-160;x<=relay.x+160&&!blocked;x+=8){const p={x,y};if(inMap(f.b.map,x,y)&&Math.hypot(x-relay.x,y-relay.y)<=160&&!lineOfSight(f.b.map,p,relay))blocked=p;}
 assert.ok(blocked);Object.assign(f.b.p,blocked);assert.equal(visibility(f.s,f.b).landmarkLabel(relay),null);
});
test('actual main suppresses nonessential labels during combat and residual hostile tells',()=>{
 const {s,b}=fixture('approach',{x:720,y:240}),keeper=b.enemies.find(e=>e.kind==='wilderness_keeper');keeper.active=true;
 const h=main(s,b);h.context.drawLabels();assert.equal(h.calls.filter(c=>c.op==='text').length,0);
 keeper.active=false;b.shots.push({enemy:true});assert.equal(visibility(s,b).combat,true);b.shots=[];
 for(const type of ['enemyRelease','hostileZone','meteor']){b.effects=[{type,life:.2}];assert.equal(visibility(s,b).combat,true);}
 b.effects=[];assert.equal(visibility(s,b).combat,false);
});
test('actual main does not place a quiet landmark label across the player silhouette',()=>{
 const {s,b}=fixture('boss',object('evidence')),h=main(s,b);h.context.drawLabels();
 for(const rect of h.calls.filter(c=>c.op==='rect')){const [x,y,w,height]=rect.args;assert.ok(!(x<825&&x+w>775&&y<558&&y+height>486));}
});
test('frozen state, live actors, map, attacks and progression stay unchanged through visibility and actual render',()=>{
 const {s,b}=fixture('approach',{x:640,y:240});b.enemies.find(e=>e.kind==='wilderness_keeper').active=true;
 const before=structuredClone({s,b}),v=visibility(freeze(s),freeze(b));render(b,v,{objects:W.objects.map(o=>({...o,type:o.visualType}))});assert.deepEqual({s,b},before);
 assert.equal(b.enemies.length,before.b.enemies.length);assert.deepEqual(b.enemies.map(e=>e.active),before.b.enemies.map(e=>e.active));
});

test('actual main frame passes the same W snapshot to the renderer and canvas labels without changing live arrays',()=>{
 const {s,b}=fixture('routed',{x:368,y:240}),h=main(s,b),before=structuredClone({s,b});let projected;
 h.context.renderer={render:scene=>{projected=scene;}};
 const start=source.indexOf('   const sceneVisibility=wildernessSceneVisibility('),end=source.indexOf('   audio.tick(',start);assert.ok(start>0&&end>start);
 vm.runInContext(source.slice(start,end),h.context);
 assert.equal(projected.entities,b.enemies);assert.equal(projected.p,b.p);assert.equal(projected.map,b.map);
 assert.equal(projected.sceneVisibility.entityVisible(b.enemies.find(e=>e.kind==='wilderness_keeper')),false);
 assert.equal(projected.seen,projected.sceneVisibility.seen);assert.equal(projected.sceneVisibility.objectVisible(W.portals.find(p=>p.id==='wilderness-keeper-return')),false);
 assert.ok(!h.calls.some(c=>c.op==='text'&&/신호지기|기록핵|단상 귀환/.test(c.args[0])));
 assert.deepEqual({s,b},before);
});
