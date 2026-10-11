import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {grantExperience,allocateAttribute} from '../src/progression.js';
import {deriveStats,purchaseSkill} from '../src/warrior-growth.js';
import {createBattle,stepBattle,physicalDamage} from '../src/combat.js';
import {FOES,createMap,inMap,lineOfSight,traceSegment} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {CORE_REFERENCE} from '../src/reference-core.js';
import {battleReport} from '../src/recovery.js';
import {createRuntimeGate} from '../src/runtime-gate.js';

// Combat-boundary fixtures, NOT earned progression or ordinary-input play.
// XP/tier, open test floors, position and high-HP targets isolate AI timing.
// Every cast, fire tick, enemy response, hit and stun uses real stepBattle.
function fixture({difficulty='normal',kind='furnace_tender',skills={trial_by_fire:1},x=390,y=300,hp=5000}={}){
 const s=reduceRuntime(createState({difficulty}),{type:'trainStarter',position:{x:260,y:325}}).state;
 s.character=grantExperience(s.character,20000).character;s.character.tier='adept';
 function learn(id,rank){
  const row=WARRIOR_REFERENCE.skills.find(x=>x.id===id);
  if(row.baseId&&!s.character.skills[row.baseId])learn(row.baseId,1);
  while((s.character.skills[id]??0)<rank){const r=purchaseSkill(s.character,id,s);assert.equal(r.ok,true,`${id}: ${r.reason}`);s.character=r.character;}
 }
 for(const [id,rank]of Object.entries(skills))learn(id,rank);
 const stats=deriveStats(s.character,s).stats;s.vitals={hp:stats.hpMax,mana:stats.manaMax,stamina:stats.staminaMax};
 const b=createBattle(s);b.map=mapFromRegion({w:30,h:30});b.p.x=300;b.p.y=300;b.awaitingAdvance=false;
 const e={id:'response-target',kind,x,y,hp,max:hp,active:true,state:'idle',timer:0,stun:0,angle:Math.PI,telegraph:null,gate:'fixture_inert'};
 b.enemies=[e];return {s,b,e};
}
const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
// Stop observation exactly at a pending contact. R11 splits the rest of the
// frame too, so sampling only at the caller's frame end may already age fire.
const contactStep=(f,dt)=>{const a=f.b.p.action,left=Math.min(dt,.05),rate=f.b.hitstop>=left&&f.b.hitstop>0?.35:1,limits=[left];if(a&&!a.fired)limits.push(Math.max(1e-10,(a.contact-a.elapsed)/rate));if(f.e.state==='windup')limits.push(Math.max(1e-10,f.e.timer/rate));return Math.min(...limits);};
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
function until(f,condition,{dt=.02,limit=1000,input={}}={}){
 const events=[];let frames=0;while(!condition()&&frames++<limit)events.push(...tick(f,input,contactStep(f,dt)));
 assert.ok(condition(),`condition not reached after ${limit} frames`);return events;
}
function run(f,seconds,dt=.02,input={}){const events=[];for(let remaining=seconds;remaining>1e-9;remaining-=Math.min(dt,remaining))events.push(...tick(f,input,Math.min(dt,remaining)));return events;}
function fire(f,{hold=.55,dt=.02}={}){
 tick(f,{judgement:true,aim:{x:500,y:300}},dt);until(f,()=>f.b.areas.length===1,{dt});
 const area=f.b.areas[0];assert.equal(area.age,0);delete f.e.gate;f.e.state='recovery';f.e.timer=hold;
 return area;
}
const inArea=(f,e,a)=>e.hp>0&&lineOfSight(f.b.map,a,e)&&Math.hypot(e.x-a.x,e.y-a.y)<=a.range+10&&Math.abs(Math.atan2(Math.sin(Math.atan2(e.y-a.y,e.x-a.x)-a.angle),Math.cos(Math.atan2(e.y-a.y,e.x-a.x)-a.angle)))<=a.arcRadians/2;

test('production fire response opts in furnace tenders and explicit B/W roles; furnace identity remains transient',()=>{
 assert.deepEqual(Object.entries(FOES).filter(([,f])=>f.fireAreaEscape).map(([id])=>id),['furnace_tender','battlefield_revenant','battlefield_hexer','battlefield_pyromancer','battlefield_lancer','battlefield_binder','battlefield_bulwark','battlefield_usurper','wilderness_flanker','wilderness_revenant','wilderness_hexer','wilderness_binder','wilderness_pyromancer','wilderness_lancer','wilderness_bulwark','wilderness_keeper']);
 const f=fixture();f.s.world.region='ember_furnace';f.s.world.position={x:112,y:560};
 const b=createBattle(f.s);assert.equal(b.enemies.filter(e=>FOES[e.kind].fireAreaEscape).length,6);assert.equal(b.areaSerial,0);
 assert.ok(b.enemies.every(e=>e.fireResponse===undefined));
});

for(const difficulty of ['easy','normal','hard','serious'])for(const dt of [.01,.02,.05,.25])test(`${difficulty}, step ${dt}: tender reacts only after .55 active exposure and existing fire tick`,()=>{
 const f=fixture({difficulty});assert.deepEqual(f.b.difficulty,CORE_REFERENCE.difficulty[difficulty]);
 const a=fire(f,{dt}),hp=f.e.hp,position={x:f.e.x,y:f.e.y};
 until(f,()=>!!f.e.fireResponse?.attempted,{dt});
 assert.ok(a.age>=.55-1e-9&&a.age<=.55+Math.min(dt,.05)+1e-9);
 near(hp-f.e.hp,a.damage);assert.equal(f.b.contacts,2);near(f.e.fireResponse.exposure,.55);
 assert.equal(f.e.state,'fireEscape');assert.ok(Math.hypot(f.e.x-position.x,f.e.y-position.y)<=FOES.furnace_tender.speed*Math.min(dt,.05)+1e-7);
 assert.equal(f.e.telegraph,null);assert.equal(f.e.invuln,undefined);
});

for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: authored-health tender walks into fire and starts a vulnerable escape without an HP boost`,()=>{
 const hp=FOES.furnace_tender.hp*CORE_REFERENCE.difficulty[difficulty].enemyHealth;
 const f=fixture({difficulty,x:448,hp}),a=fire(f,{hold:0,dt:.05});assert.equal(f.e.hp,hp);assert.equal(f.b.contacts,0);
 until(f,()=>!!f.e.fireResponse?.attempted,{dt:.05});near(hp-f.e.hp,a.damage);assert.ok(f.e.hp>0);
 assert.equal(f.e.state,'fireEscape');assert.ok(a.age>.55);const response=f.e.fireResponse;
 const events=until(f,()=>!response.escape,{dt:.05});
 if(difficulty==='easy'){assert.equal(f.e.hp,0);assert.equal(events.filter(e=>e.type==='defeated').length,1);} // A second ordinary tick legitimately kills this low-HP tender mid-escape.
 else{assert.ok(f.e.hp>0);assert.equal(inArea(f,f.e,a),false);}
});

test('a cast has no danger knowledge before contact and visual-only effects cannot trigger escape',()=>{
 const f=fixture();delete f.e.gate;f.e.timer=10;f.e.state='recovery';
 f.b.effects.push({type:'slash',x:300,y:300,r:128,angle:0,life:9});run(f,1);
 assert.equal(f.e.fireResponse,undefined);
 tick(f,{judgement:true,aim:{x:500,y:300}});
 while(!f.b.areas.length){assert.equal(f.e.fireResponse,undefined);tick(f,{},contactStep(f,.02));}
 assert.equal(f.b.areas[0].age,0);assert.equal(f.e.fireResponse,undefined);
});

test('a freely pursuing tender cannot attempt before .55 even without a recovery gate',()=>{
 for(const dt of [.01,.02,.05]){
  const f=fixture(),a=fire(f,{hold:0,dt});f.b.p.x=100;
  let previous={x:f.e.x,y:f.e.y};
  while(!f.e.fireResponse?.attempted){
   previous={x:f.e.x,y:f.e.y};tick(f,{},dt);
   if(a.age<.55-1e-9){assert.notEqual(f.e.state,'fireEscape');assert.equal(f.e.fireResponse.attempted,false);assert.ok(f.e.x<previous.x);}
  }
  assert.ok(a.age>=.55-1e-9&&a.age<=.55+dt+1e-9);assert.equal(f.e.state,'fireEscape');
  assert.ok(Math.hypot(f.e.x-previous.x,f.e.y-previous.y)<=82*dt+1e-7);
 }
});

test('continuous exposure resets outside sector, outside range or behind a wall',()=>{
 for(const outside of [{x:290,y:300},{x:500,y:300},{x:390,y:500}]){
  const f=fixture(),a=fire(f,{hold:10});run(f,.3);const old=f.e.fireResponse.exposure;assert.ok(old>.25&&old<.31);
  Object.assign(f.e,outside);tick(f);assert.equal(f.e.fireResponse.exposure,0);f.e.x=390;f.e.y=300;run(f,.3);
  assert.ok(f.e.fireResponse.exposure<=.3+1e-9);assert.equal(f.e.fireResponse.attempted,false);assert.equal(a.id,f.e.fireResponse.areaId);
 }
 const f=fixture();fire(f,{hold:10});run(f,.3);f.b.map=mapFromRegion({w:30,h:30,rooms:[{x:1,y:1,w:9,h:28},{x:11,y:1,w:18,h:28}]});
 const hp=f.e.hp;run(f,.4);assert.equal(f.e.fireResponse.exposure,0);assert.equal(f.e.hp,hp);
});

test('committed locked windup and recovery complete before escape, without snapping aim or cancelling damage',()=>{
 const f=fixture({x:330}),a=fire(f,{hold:0});tick(f);assert.equal(f.e.state,'windup');
 const tell=f.e.telegraph,angle=f.e.angle;until(f,()=>f.e.fireResponse.exposure>=.55-1e-9);
 assert.equal(f.e.telegraph,tell);assert.equal(f.e.angle,angle);assert.equal(f.e.fireResponse.attempted,false);assert.equal(f.e.x,330);
 const hp=f.b.p.hp;f.b.seed=100000;until(f,()=>f.e.state==='recovery');assert.ok(f.b.p.hp<hp);const recovery=f.e.timer;assert.equal(recovery,.85);
 until(f,()=>f.e.timer<.1);assert.equal(f.e.state,'recovery');assert.equal(f.e.fireResponse.attempted,false);
 until(f,()=>f.e.fireResponse.attempted);assert.equal(f.e.state,'fireEscape');assert.ok(a.age>1.6);
});

test('escape chooses the shortest legal ray with deterministic ties, ordinary speed and a fixed endpoint',()=>{
 const f=fixture(),a=fire(f);until(f,()=>f.e.state==='fireEscape');const r=f.e.fireResponse,escape=r.escape;
 assert.deepEqual(escape.target,{x:442,y:300,distance:52});assert.equal(inArea(f,{...f.e,...escape.target},a),false);
 assert.equal(traceSegment(f.b.map,f.e,escape.target,11).blocked,false);const start={x:f.e.x,y:f.e.y},before=escape.elapsed;
 tick(f,{},.02);near(Math.hypot(f.e.x-start.x,f.e.y-start.y),82*.02);near(escape.elapsed-before,.02);
 until(f,()=>!r.escape);near(f.e.x,442);near(f.e.y,300);assert.ok(escape.distance<=64&&escape.elapsed<=1);assert.equal(f.e.state,'idle');
 assert.equal(f.e.hp,5000-physicalDamage(f.b.stats.actions.judgement.damage,2)-a.damage*2);
});

test('no legal exit consumes one attempt and preserves the ordinary pursuit/attack fallback',()=>{
 const f=fixture(),a=fire(f,{hold:.55});
 // Every point within 64 units is still in the fire or beyond a closed wall.
 f.b.map=mapFromRegion({w:20,h:20,rooms:[{x:9,y:9,w:4,h:1}]});f.b.p.x=385;f.b.p.y=300;
 until(f,()=>!!f.e.fireResponse?.attempted);assert.equal(f.e.fireResponse.escape,null);assert.equal(f.e.state,'windup');
 const areaId=f.e.fireResponse.areaId;f.b.map=mapFromRegion({w:30,h:30});f.e.x=390;f.e.state='idle';f.e.timer=0;f.e.telegraph=null;
 run(f,.2);assert.equal(f.e.fireResponse.attempted,true);assert.equal(f.e.fireResponse.escape,null);assert.equal(f.e.fireResponse.areaId,areaId);assert.equal(a.id,areaId);
});

test('one area cannot retrigger after a complete escape and re-entry',()=>{
 const f=fixture();fire(f);until(f,()=>!!f.e.fireResponse?.escape);const response=f.e.fireResponse;
 until(f,()=>!response.escape);f.e.x=390;f.e.y=300;f.e.state='recovery';f.e.timer=.65;run(f,.7);
 assert.equal(f.e.fireResponse,response);assert.equal(response.attempted,true);assert.equal(response.escape,null);assert.notEqual(f.e.state,'fireEscape');
});

test('replacement casts get increasing identity independent of battle time and reset exposure and attempt',()=>{
 const f=fixture(),old=fire(f);until(f,()=>f.e.fireResponse?.attempted);assert.equal(old.id,1);
 f.e.x=390;f.e.y=300;f.e.state='recovery';f.e.timer=10;f.b.p.cooldowns.judgement=0;f.b.p.mana=f.b.stats.manaMax;
 // Rewind only the synthetic battle clock; IDs must not be time-derived.
 f.b.time=0;tick(f,{judgement:true,aim:{x:500,y:300}});until(f,()=>f.b.areas[0].id!==old.id);
 const fresh=f.b.areas[0];assert.equal(fresh.id,2);assert.equal(f.b.areas.length,1);assert.equal(fresh.age,0);assert.equal(f.e.fireResponse,null);
 tick(f);assert.equal(f.e.fireResponse.areaId,2);assert.equal(f.e.fireResponse.attempted,false);assert.ok(f.e.fireResponse.exposure<=.02);
});

test('Shackles slowdown and damage amplification remain active during the bounded escape',()=>{
 const f=fixture({skills:{trial_by_fire:1,shackles:1}}),a=fire(f);until(f,()=>!!f.e.fireResponse?.escape);
 const escape=f.e.fireResponse.escape,start={x:f.e.x,y:f.e.y},hp=f.e.hp;tick(f);near(Math.hypot(f.e.x-start.x,f.e.y-start.y),82*.4*.02);
 until(f,()=>!f.e.fireResponse.escape);near(escape.elapsed,1);near(escape.distance,32.8);assert.ok(escape.distance<escape.target.distance);assert.equal(inArea(f,f.e,a),true);
 assert.ok(f.e.hp<hp);assert.ok(f.e.shackles.remaining>0);assert.equal(f.e.shackles.damageTakenMultiplier,1.1);assert.equal(f.e.invuln,undefined);
});

test('real charge stun interrupts escape, retains damage/debuffs and cannot start a second attempt',()=>{
 const f=fixture({skills:{trial_by_fire:1,shackles:1}});fire(f);until(f,()=>!!f.e.fireResponse?.escape);
 const response=f.e.fireResponse;tick(f,{charge:true,aim:{x:f.e.x,y:f.e.y}});until(f,()=>f.e.stun>0);
 assert.equal(response.escape,null);assert.equal(response.attempted,true);const location={x:f.e.x,y:f.e.y},hp=f.e.hp;
 run(f,.2);near(f.e.x,location.x);near(f.e.y,location.y);assert.ok(f.e.hp<=hp);assert.ok(f.e.shackles.remaining>0);assert.equal(f.e.state,'idle');
 until(f,()=>f.e.stun===0);assert.equal(response.escape,null);assert.equal(response.attempted,true);
});

test('pre-existing stun retains priority until expiry while real fire exposure and ticks continue',()=>{
 const f=fixture();fire(f,{hold:0});f.e.stun=.9;const hp=f.e.hp;run(f,.7);
 assert.ok(f.e.stun>0);assert.equal(f.e.fireResponse.attempted,false);assert.equal(f.e.x,390);assert.ok(f.e.hp<hp);
 until(f,()=>f.e.fireResponse.attempted);assert.equal(f.e.stun,0);assert.equal(f.e.state,'fireEscape');
});

test('ordinary hammer can hit an escaping tender without immunity or resetting its attempt',()=>{
 const f=fixture({skills:{trial_by_fire:1,shackles:1}});fire(f);until(f,()=>!!f.e.fireResponse?.escape);
 const hp=f.e.hp;tick(f,{hammer:true,aim:{x:f.e.x,y:f.e.y}});const events=until(f,()=>f.b.shots.some(s=>s.hitIds?.includes(f.e.id)));
 assert.ok(f.e.hp<hp-f.b.stats.actions.righteous_hammer.damage*.9);assert.equal(f.e.fireResponse.attempted,true);assert.equal(f.e.invuln,undefined);
 assert.ok(events.some(e=>e.type==='sound'&&e.name==='heavyHit'));
});

test('newly blocked movement cancels safely on legal floor without retry, warp or healing',()=>{
 const f=fixture();fire(f);until(f,()=>!!f.e.fireResponse?.escape);const response=f.e.fireResponse,hp=f.e.hp;
 f.b.map=mapFromRegion({w:30,h:30,rooms:[{x:1,y:1,w:12,h:28}]}); // Wall immediately east of this legal actor.
 assert.equal(inMap(f.b.map,f.e.x,f.e.y,11),true);
 until(f,()=>!response.escape);assert.equal(inMap(f.b.map,f.e.x,f.e.y,11),true);assert.ok(f.e.x<=405);assert.ok(f.e.hp<=hp);assert.equal(response.attempted,true);
});

test('real furnace closed and open geometry keeps escape motion radius-11 legal and swept-clear',()=>{
 for(const objectives of [{furnace_accepted:1},{furnace_accepted:1,furnace_cooled:1},{furnace_accepted:1,furnace_cooled:1,furnace_center_open:1,furnace_exhausted:1}]){
  const f=fixture({x:390,y:464});f.b.map=createMap('ember_furnace',{world:{objectives}});f.b.p.x=300;f.b.p.y=464;
  tick(f,{judgement:true,aim:{x:500,y:464}});until(f,()=>f.b.areas.length===1);delete f.e.gate;f.e.state='recovery';f.e.timer=.55;
  let attempted=false;
  for(let n=0;n<100;n++){
   const before={x:f.e.x,y:f.e.y};tick(f);assert.ok(inMap(f.b.map,f.e.x,f.e.y,11));assert.equal(traceSegment(f.b.map,before,f.e,11).blocked,false);
   assert.ok(Math.hypot(f.e.x-before.x,f.e.y-before.y)<=82*.02+1e-7);attempted ||= !!f.e.fireResponse?.attempted;
  }
  assert.equal(attempted,true);
 }
});

test('arrival, pause, hidden tab and lost focus cannot age fire exposure or move a tender',()=>{
 const f=fixture();fire(f);run(f,.3);const area=f.b.areas[0],time=f.b.time,age=area.age,exposure=f.e.fireResponse.exposure,x=f.e.x;
 f.b.awaitingAdvance=true;run(f,5);assert.equal(f.b.time,time);assert.equal(area.age,age);assert.equal(f.e.fireResponse.exposure,exposure);assert.equal(f.e.x,x);
 f.b.awaitingAdvance=false;const gate=createRuntimeGate();
 for(const extra of [{paused:true},{busy:true},{hidden:true},{focused:false}]){
  if(gate.canStep({hasBattle:true,paused:false,busy:false,hidden:false,...extra}))run(f,5);
  assert.equal(f.b.time,time);assert.equal(area.age,age);assert.equal(f.e.fireResponse.exposure,exposure);
 }
 for(let n=0;n<20;n++)tick(f,{},0);assert.equal(f.e.fireResponse.exposure,exposure);assert.equal(f.e.x,x);
});

test('load/travel reconstruction discards fire responses and areas while retaining paid hero pools/recovery',()=>{
 const f=fixture();fire(f);until(f,()=>!!f.e.fireResponse?.escape);const report=battleReport(f.b);
 for(const region of ['ember_furnace','ash_hamlet']){
  const loaded=createBattle({...f.s,world:{...f.s.world,region,position:region==='ember_furnace'?{x:112,y:560}:{x:350,y:420}},vitals:report.vitals,recovery:report.recovery});
  assert.deepEqual(loaded.areas,[]);assert.equal(loaded.areaSerial,0);assert.ok(loaded.enemies.every(e=>e.fireResponse===undefined));
  assert.deepEqual(battleReport(loaded).vitals,report.vitals);assert.deepEqual(battleReport(loaded).recovery,report.recovery);
 }
});

test('hero death clears active response once, and tender death cannot produce duplicate defeat events',()=>{
 const f=fixture();fire(f);until(f,()=>!!f.e.fireResponse?.escape);f.b.p.hp=1;f.b.p.invuln=0;
 f.b.shots.push({kind:'arrow',enemy:true,x:320,y:300,vx:-1000,vy:0,damage:100,life:1});const events=tick(f,{},.05);
 assert.equal(f.b.dead,true);assert.equal(f.e.fireResponse,null);assert.deepEqual(f.b.areas,[]);assert.equal(events.filter(e=>e.type==='heroDead').length,1);assert.equal(run(f,.5).some(e=>e.type==='heroDead'),false);
 const killed=fixture();fire(killed);until(killed,()=>!!killed.e.fireResponse?.escape);killed.e.hp=1;
 const all=run(killed,2);assert.equal(all.filter(e=>e.type==='defeated'&&e.id===killed.e.id).length,1);assert.equal(killed.e.fireResponse,null);assert.equal(killed.e.hp,0);
});

test('a strong initial real Judgement can kill an authored-health tender before response on every difficulty',()=>{
 for(const difficulty of ['easy','normal','hard','serious']){
  const f=fixture({difficulty,skills:{judgement:5,trial_by_fire:1},hp:FOES.furnace_tender.hp*CORE_REFERENCE.difficulty[difficulty].enemyHealth});
  const allocation=allocateAttribute(f.s.character,'strength',20);assert.equal(allocation.ok,true);f.s.character=allocation.character;
  const events=[...tick(f,{judgement:true,aim:{x:500,y:300}}),...run(f,1)];
  assert.equal(f.e.hp,0);assert.equal(events.filter(e=>e.type==='defeated').length,1);assert.equal(f.e.fireResponse,undefined);
 }
});

test('all non-opt-in old and furnace roles keep ordinary fire damage and locked attack behavior',()=>{
 for(const kind of Object.keys(FOES).filter(kind=>!FOES[kind].fireAreaEscape)){
  const f=fixture({kind,x:330}),a=fire(f,{hold:.7}),hp=f.e.hp;
  run(f,.6);assert.equal(f.e.fireResponse,undefined,kind);assert.equal(f.e.state,'recovery',kind);near(hp-f.e.hp,a.damage*(1-(FOES[kind].resistances?.fire??0)/100));
  until(f,()=>f.e.state==='windup');assert.ok(f.e.telegraph.locked);assert.equal(f.e.fireResponse,undefined,kind);
 }
});

test('expired or non-damaging fire cannot trigger or retain an escape',()=>{
 const f=fixture();const a=fire(f,{hold:10});a.damage=0;run(f,.8);assert.equal(f.e.fireResponse,undefined);
 a.damage=20;f.e.timer=.55;until(f,()=>!!f.e.fireResponse?.escape);a.duration=a.age+.01;tick(f);
 assert.equal(f.b.areas.length,0);assert.equal(f.e.fireResponse,null);assert.notEqual(f.e.state,'fireEscape');
});

test('committed recovery allows the unchanged ten fire ticks, with no duplicate tick from response bookkeeping',()=>{
 const f=fixture(),a=fire(f,{hold:10}),hp=f.e.hp;run(f,6);
 near(hp-f.e.hp,10*a.damage);assert.equal(f.b.contacts,11);assert.equal(f.b.areas.length,0);assert.equal(f.e.fireResponse,null);
});

test('a still-gated furnace tender cannot escape or activate from area bookkeeping',()=>{
 const f=fixture();fire(f,{hold:0});f.e.gate='fixture_closed_gate';const hp=f.e.hp;run(f,1);
 assert.equal(f.e.active,false);assert.equal(f.e.fireResponse,undefined);assert.equal(f.e.x,390);assert.equal(f.e.y,300);
 assert.ok(f.e.hp<hp); // Retain existing fire damage semantics; no new immunity.
});
