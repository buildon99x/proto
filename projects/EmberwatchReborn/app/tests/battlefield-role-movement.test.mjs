import test from 'node:test';
import assert from 'node:assert/strict';
import {createBattle,stepBattle} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {FOES,createMap} from '../src/world.js';
import {mapFromRegion,inMap,lineOfSight,traceSegment} from '../src/world-geometry.js';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_FOES,BATTLEFIELD_GROUPS,BATTLEFIELD_REWARDS} from '../src/battlefield-content.js';
import {animationFrame} from '../src/visual.js';
import {allocateAttribute} from '../src/progression.js';
import {fixture as expertFixture,enemy,tick,run,until,close} from './support/expert-fixture.mjs';

// SYNTHETIC production-handler/geometry fixtures, NOT ordinary-input play or
// earned-build TTK. The shared fixture injects Expert tier/XP and open test
// floor; native HP is retained unless a test explicitly needs a fire survivor.
// No attack, hit, damage, recovery or motion handler is mocked.
function fixture({kind='battlefield_hexer',x=390,y=300,skills={},hp,region=BATTLEFIELD_REGION}={}){
 const f=expertFixture(skills);f.b.region=region;
 const e=enemy(f,{id:'role-target',kind,x,y,hp:hp??FOES[kind].hp,inert:false});f.e=e;
 return f;
}
const pos=e=>({x:e.x,y:e.y});
const span=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const started=events=>events.filter(e=>e.type==='enemyRepositionStarted');

// Explicit old tiles make accidental collision/save-position changes visible.
test('B keeps prior floor, HP/speed/damage/budgets/IDs while only east lancers change formation',()=>{
 const region=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION];
 assert.deepEqual(region.rooms,[{x:12,y:19,w:6,h:6},{x:2,y:20,w:26,h:2},{x:2,y:10,w:10,h:4},{x:2,y:14,w:4,h:3},{x:8,y:14,w:4,h:3},{x:2,y:17,w:10,h:3},{x:18,y:10,w:10,h:10},{x:13,y:8,w:4,h:11},{x:9,y:2,w:12,h:6}]);
 assert.equal(region.foes.length,13);assert.deepEqual(region.foes.map(e=>e.id).sort(),Object.values(BATTLEFIELD_GROUPS).flat().sort());
 assert.deepEqual(Object.values(BATTLEFIELD_FOES).map(f=>[f.hp,f.speed,f.damage]),[[58,64,9],[44,35,6],[46,35,7],[62,60,10],[44,32,6],[78,38,10],[200,42,13]]);
 assert.equal(region.foes.reduce((n,e)=>n+BATTLEFIELD_FOES[e.kind].xp,0)+Object.values(BATTLEFIELD_REWARDS).reduce((n,r)=>n+r.xp,0),2220);
 assert.equal(region.foes.reduce((n,e)=>n+BATTLEFIELD_FOES[e.kind].gold,0)+Object.values(BATTLEFIELD_REWARDS).reduce((n,r)=>n+r.gold,0),326);
 assert.deepEqual(region.foes.filter(e=>BATTLEFIELD_GROUPS.east.includes(e.id)&&e.kind==='battlefield_lancer').map(pos),[{x:624,y:496},{x:816,y:400}]);
 for(const [kind,row]of Object.entries(FOES))if(!kind.startsWith('battlefield_'))assert.equal(row.battlefieldRoleMovement,undefined,kind);
 for(const kind of ['battlefield_revenant','battlefield_bulwark'])assert.equal(FOES[kind].battlefieldRoleMovement,undefined,'melee cleave remains');
});

for(const kind of ['battlefield_hexer','battlefield_pyromancer','battlefield_binder','battlefield_lancer'])for(const dt of [.01,.02,.05,.25])test(`${kind} at step ${dt}: finite vulnerable lateral walk then real locked attack`,()=>{
 const f=fixture({kind}),home=pos(f.e),rules=FOES[kind].battlefieldRoleMovement;
 assert.equal(started(tick(f,{},dt)).length,1);const step=f.e.roleMovement.step,target={...step.target};
 assert.equal(f.e.state,'roleStep');assert.equal(f.e.moving,true);assert.ok([1,2].includes(animationFrame(f.e,f.b.time)));
 close(target.x,home.x);assert.ok(span(target,home)<=rules.distance);assert.equal(f.e.invuln,undefined);
 while(f.e.roleMovement.step){const before=pos(f.e),time=f.b.time;tick(f,{},dt);assert.ok(span(f.e,before)<=FOES[kind].speed*(f.b.time-time)+1e-7);assert.equal(traceSegment(f.b.map,before,f.e,11).blocked,false);assert.deepEqual(step.target,target);}
 assert.ok(step.distance<=rules.distance+1e-7);assert.ok(step.elapsed<=rules.seconds+1e-7);assert.equal(f.e.hp,FOES[kind].hp);
 assert.ok(span(f.e,home)<=rules.distance+1e-7);until(f,()=>f.e.state==='windup');assert.equal(f.e.telegraph.locked,true);assert.equal(f.e.roleMovement.step,null);
});

test('a fixed step ignores changed aim/actions and does not chase the moving player mid-step',()=>{
 const a=fixture(),b=fixture();tick(a);tick(b);const target={...a.e.roleMovement.step.target};
 b.b.p.x=310;b.b.p.y=350;b.b.p.angle=2;b.b.p.cooldowns.righteous_hammer=100;
 for(let n=0;n<10;n++){tick(a);tick(b,{hammer:true,aim:{x:900,y:600}});assert.deepEqual(pos(a.e),pos(b.e));assert.deepEqual(b.e.roleMovement.step.target,target);}
});

test('windup aim/geometry and full recovery are immutable before a close caster steps',()=>{
 const f=fixture({x:500});tick(f);assert.equal(f.e.state,'windup');const tell=f.e.telegraph,shape=structuredClone(tell.shapes),home=pos(f.e),angle=f.e.angle;
 f.b.p.x=410;f.b.p.y=315;
 while(f.e.state==='windup'){tick(f,{},Math.min(.02,f.e.timer));assert.deepEqual(pos(f.e),home);assert.equal(f.e.angle,angle);if(f.e.telegraph){assert.equal(f.e.telegraph,tell);assert.deepEqual(tell.shapes,shape);}}
 assert.equal(f.e.state,'recovery');close(f.e.timer,1.25);assert.equal(f.e.roleAttacksReleased,1);const releasedAt=f.b.time;
 while(f.e.timer>.02+1e-9){tick(f);assert.deepEqual(pos(f.e),home);assert.equal(f.e.roleMovement,undefined);}
 until(f,()=>f.e.state==='roleStep');assert.ok(f.b.time-releasedAt>=1.25-1e-8);assert.equal(f.e.telegraph,null);
});

test('boss does not evade first tell; first lateral step follows released attack and full debt, then sweep',()=>{
 const f=fixture({kind:'battlefield_usurper'}),home=pos(f.e);tick(f);assert.equal(f.e.state,'windup');assert.equal(f.e.attackSpec.shape,'line');
 while(f.e.state==='windup')tick(f,{},Math.min(.02,f.e.timer));assert.deepEqual(pos(f.e),home);close(f.e.timer,1.55);const releasedAt=f.b.time;
 while(f.e.timer>.02+1e-9){tick(f);assert.deepEqual(pos(f.e),home);assert.equal(f.e.roleMovement,undefined);}
 until(f,()=>f.e.state==='roleStep');assert.ok(f.b.time-releasedAt>=1.55-1e-8);const step=f.e.roleMovement.step;
 until(f,()=>!f.e.roleMovement.step);assert.ok(step.distance<=48+1e-7&&step.elapsed<=1.2+1e-7);assert.equal(f.e.hp,200);
 until(f,()=>f.e.state==='windup');assert.equal(f.e.attackSpec.shape,'cone');assert.equal(f.e.attackSpec.range,100);
});

test('Shackles reduce ordinary footwork speed and timeout leaves a hittable foe that re-engages',()=>{
 const f=fixture();f.e.shackles={remaining:3,moveMultiplier:.4,damageTakenMultiplier:1.1};tick(f);const step=f.e.roleMovement.step,home=pos(f.e);
 tick(f);close(span(f.e,home),35*.4*.02);until(f,()=>!f.e.roleMovement.step);close(step.elapsed,1.5);close(step.distance,21);
 assert.ok(f.e.shackles.remaining>0);until(f,()=>f.e.state==='windup');assert.equal(f.e.invuln,undefined);
});

test('real shield-charge stun interrupts a moving target and consumes its step opportunity',()=>{
 const f=fixture({x:340});tick(f);assert.equal(f.e.state,'roleStep');
 tick(f,{charge:true,aim:{x:f.e.x,y:f.e.y}});until(f,()=>f.e.stun>0);
 assert.equal(f.e.roleMovement.step,null);const location=pos(f.e);run(f,.15);assert.deepEqual(pos(f.e),location);
 assert.equal(f.e.roleMovement.lastReleased,0);until(f,()=>f.e.stun===0);assert.equal(f.e.roleMovement.step,null);
});

for(const [kind,status]of [['battlefield_hexer','silence'],['battlefield_lancer','disarm']])test(`${status} cancels current role step without permitting a suppressed attack`,()=>{
 const f=fixture({kind});tick(f);assert.equal(f.e.state,'roleStep');f.e[status]={remaining:1};
 tick(f);assert.equal(f.e.roleMovement.step,null);assert.notEqual(f.e.state,'windup');assert.equal(f.e.roleMovement.lastReleased,0);
 run(f,.5);assert.notEqual(f.e.state,'roleStep');assert.notEqual(f.e.state,'windup');
 until(f,()=>f.e.state==='windup');assert.equal(f.e[status],null);
});

test('tight corridor and occupied lateral lanes consume only one attempt and immediately attack instead',()=>{
 for(const occupied of [false,true]){
  const f=fixture();if(!occupied)f.b.map=mapFromRegion({w:30,h:30,rooms:[{x:1,y:9,w:28,h:1}]});
  else for(const y of [270,330])enemy(f,{id:`ally-${y}`,kind:'battlefield_revenant',x:390,y,inert:true});
  const events=tick(f);assert.equal(started(events).length,0);assert.equal(f.e.roleMovement.step,null);assert.equal(f.e.state,'windup');
  assert.equal(f.e.roleMovement.lastReleased,0);assert.ok(f.e.roleMovement.nextAt>=6);
 }
});

test('real west-wall LOS cannot trigger a step, and a newly closed path cancels without warp',()=>{
 const f=fixture({x:304,y:496});f.b.map=createMap(BATTLEFIELD_REGION,{world:{objectives:{battlefield_accepted:1}}});f.b.p.x=144;f.b.p.y=496;
 assert.equal(lineOfSight(f.b.map,f.e,f.b.p),false);tick(f);assert.equal(f.e.roleMovement,undefined);
 const g=fixture();tick(g);const home=pos(g.e);g.b.map=mapFromRegion({w:30,h:30,rooms:[{x:1,y:9,w:28,h:1}]});assert.ok(inMap(g.b.map,g.e.x,g.e.y,11));
 tick(g);assert.equal(g.e.roleMovement.step,null);assert.deepEqual(pos(g.e),home);assert.equal(g.e.hp,FOES[g.e.kind].hp);
});

test('repeated combat re-engages between steps, enforces six seconds, and stays within the finite tether',()=>{
 const f=fixture({kind:'battlefield_usurper'});f.b.p.invuln=100;const events=[];
 for(let n=0;n<1200;n++){const frame=tick(f);for(const event of frame)events.push({...event,time:f.b.time,released:f.e.roleAttacksReleased??0});if(f.e.roleMovement?.step)assert.ok(span(f.e,f.e.roleMovement.home)<=80+1e-7);}
 const starts=started(events);assert.ok(starts.length>=2);for(let n=1;n<starts.length;n++){assert.ok(starts[n].time-starts[n-1].time>=6-1e-7);assert.ok(starts[n].released>starts[n-1].released);}
 assert.ok(events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length>=5);
});

test('same role data outside B and older regions retain ordinary attack with no role state',()=>{
 for(const options of [{region:'ember_furnace'},{kind:'furnace_tender',region:'ember_furnace'},{kind:'tomb_guard',region:'signal_tomb'}]){
  if(!FOES[options.kind??'battlefield_hexer'])continue;
  const f=fixture({...options,x:340});tick(f);assert.equal(f.e.roleMovement,undefined);assert.equal(f.e.state,'windup');
 }
});

test('pause/arrival/dt0 and battle reconstruction do not age steps or introduce save fields',()=>{
 const f=fixture();tick(f);const response=structuredClone(f.e.roleMovement),home=pos(f.e),time=f.b.time,report=battleReport(f.b);
 f.b.awaitingAdvance=true;run(f,1);assert.deepEqual(f.e.roleMovement,response);assert.deepEqual(pos(f.e),home);assert.equal(f.b.time,time);
 f.b.awaitingAdvance=false;for(let n=0;n<10;n++)tick(f,{},0);assert.deepEqual(f.e.roleMovement,response);
 assert.doesNotMatch(JSON.stringify(report),/roleMovement|roleAttacksReleased/);
 const restored=createBattle({...f.s,world:{...f.s.world,region:BATTLEFIELD_REGION,position:{x:480,y:752}},vitals:report.vitals,recovery:report.recovery});
 assert.ok(restored.enemies.every(e=>e.roleMovement===undefined&&e.roleAttacksReleased===undefined));assert.deepEqual(battleReport(restored).vitals,report.vitals);assert.deepEqual(battleReport(restored).recovery,report.recovery);
});

test('surviving B fire victims reuse delayed bounded escape only after their recovery',()=>{
 const f=fixture({kind:'battlefield_revenant',hp:5000,skills:{trial_by_fire:1}});f.e.state='recovery';f.e.timer=2;
 tick(f,{judgement:true,aim:{x:500,y:300}});until(f,()=>f.b.areas.length===1);const hp=f.e.hp;
 until(f,()=>f.e.fireResponse?.exposure>=.55-1e-9);assert.equal(f.e.fireResponse.attempted,false);assert.ok(f.e.timer>0);assert.ok(f.e.hp<hp);
 until(f,()=>f.e.fireResponse?.attempted);assert.equal(f.e.state,'fireEscape');assert.equal(f.e.invuln,undefined);
 const step=f.e.fireResponse.escape;until(f,()=>!f.e.fireResponse?.escape);assert.ok(step.distance<=64+1e-7&&step.elapsed<=1+1e-7);assert.ok(f.e.hp<hp);
});

test('strong initial E still kills native low-HP melee before any fire response',()=>{
 const f=fixture({kind:'battlefield_revenant',x:350,skills:{mace_swing:4,judgement:1,trial_by_fire:1,towering_strength:1}});
 const r=allocateAttribute(f.s.character,'strength',18);assert.equal(r.ok,true);f.s.character=r.character;
 const events=[...tick(f,{judgement:true,aim:{x:500,y:300}}),...until(f,()=>f.e.hp===0)];
 assert.equal(events.filter(e=>e.type==='defeated').length,1);assert.equal(f.e.fireResponse?.attempted??false,false);assert.equal(f.e.roleMovement,undefined);
});

test('B movement spends only time remaining after fractional recovery debt',()=>{
 const f=fixture();f.e.state='recovery';f.e.timer=.015;const home=pos(f.e);
 tick(f,{},.02);assert.equal(f.e.state,'roleStep');close(span(f.e,home),35*.005);close(f.e.roleMovement.step.elapsed,.005);
 const g=fixture();g.e.state='recovery';g.e.timer=.02;const exact=pos(g.e);
 tick(g,{},.02);assert.deepEqual(pos(g.e),exact);assert.equal(g.e.roleMovement,undefined);tick(g);assert.equal(g.e.state,'roleStep');
});

test('B fire escape takes priority and cannot chain a fresh lateral step before another attack',()=>{
 const f=fixture({hp:5000,skills:{trial_by_fire:1}});f.e.state='recovery';f.e.timer=.9;
 tick(f,{judgement:true,aim:{x:500,y:300}});until(f,()=>f.e.state==='fireEscape');
 assert.equal(f.e.roleMovement.step,null);const response=f.e.fireResponse;
 until(f,()=>!response.escape);assert.ok(f.e.roleMovement.nextAt-f.b.time>5.9);assert.equal(f.e.roleMovement.lastReleased,0);
 const events=until(f,()=>f.e.state==='windup');assert.equal(started(events).length,0);assert.equal(f.e.roleMovement.step,null);
});

test('an ordinary hammer damages a walking B role, without immunity or HP restoration',()=>{
 const f=fixture({skills:{righteous_hammer:4}});tick(f);assert.equal(f.e.state,'roleStep');const hp=f.e.hp;
 const events=[...tick(f,{hammer:true,aim:{x:f.e.x,y:f.e.y}}),...until(f,()=>f.e.hp<hp)];
 assert.ok(events.some(e=>e.type==='enemyHit'&&e.id===f.e.id&&e.context.originSkillId==='righteous_hammer'));
 assert.equal(f.e.invuln,undefined);if(f.e.hp===0)assert.equal(f.e.roleMovement.step,null);
});

for(const spawn of BATTLEFIELD_REGIONS[BATTLEFIELD_REGION].foes.filter(e=>BATTLEFIELD_FOES[e.kind].battlefieldRoleMovement))test(`real B tiles: ${spawn.id} can step on its native flank and resume an attack`,()=>{
 const f=fixture({kind:spawn.kind,x:spawn.x,y:spawn.y});f.e.id=spawn.id;f.b.p.x=spawn.x;f.b.p.y=spawn.y+64;
 f.b.map=createMap(BATTLEFIELD_REGION,{world:{objectives:{battlefield_accepted:1,battlefield_devices_ready:1}}});
 assert.ok(inMap(f.b.map,f.e.x,f.e.y,11));assert.ok(inMap(f.b.map,f.b.p.x,f.b.p.y,11));assert.ok(lineOfSight(f.b.map,f.e,f.b.p));
 until(f,()=>f.e.state==='roleStep');const step=f.e.roleMovement.step;
 while(f.e.roleMovement.step){const previous=pos(f.e);tick(f);assert.ok(inMap(f.b.map,f.e.x,f.e.y,11));assert.equal(traceSegment(f.b.map,previous,f.e,11).blocked,false);}
 assert.ok(step.distance<=FOES[spawn.kind].battlefieldRoleMovement.distance+1e-7);
 until(f,()=>f.e.state==='windup');assert.equal(f.e.telegraph.locked,true);assert.equal(f.e.hp,FOES[spawn.kind].hp);
});
