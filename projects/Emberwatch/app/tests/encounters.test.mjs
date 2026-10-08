// Pure deterministic simulation checks. No browser or human playtest is claimed.
import assert from 'node:assert/strict';
import {ENCOUNTER_CATALOG,planEncounterAttack,encounterContains,updateEncounterEnemy,resetEncounterEnemy} from '../src/encounters.js';

const makeEnemy=(type='bandit',extra={})=>({type,x:0,y:0,hp:100,max:100,r:type==='boss'?29:12,speed:60,damage:10,active:true,phase:1,attackCount:0,phaseAttackCount:0,encounterVersion:1,state:'idle',timer:0,walk:0,...extra});
function harness(enemy=makeEnemy(),point={x:40,y:0},extra={}) {
  const hits=[],shots=[],events=[],phases=[],player={...point};
  const context={player,entities:[enemy],floor:0,move:(e,dx,dy)=>{e.x+=dx;e.y+=dy;},lineClear:()=>true,solid:()=>false,damagePlayer:(amount,source)=>hits.push({amount,source}),projectile:(...args)=>shots.push(args),onAttack:(plan,e,event)=>events.push({id:plan.id,...event}),onPhase:(e,phase)=>phases.push(phase),...extra};
  return {enemy,player,context,hits,shots,events,phases,step:dt=>updateEncounterEnemy(enemy,dt,context)};
}
const near=(a,b,message)=>assert(Math.abs(a-b)<1e-7,message||`${a} != ${b}`);
function start(h){h.step(0);assert.equal(h.enemy.actionPhase,'anticipation');return h.enemy.encounterAttack.plan;}
function finish(h){const p=h.enemy.encounterAttack.plan;h.step(p.tell+p.active+p.recovery);assert.equal(h.enemy.encounterAttack,null);}

// Every archetype has a deliberately different role/sequence; all phase timings are explicit.
const ordinary=['rat','bandit','archer','skeleton','mage','knight','imp'];
assert.equal(new Set(ordinary.map(type=>ENCOUNTER_CATALOG[type].role)).size,7);
const plans=[];
for(const type of ordinary)for(let i=0;i<ENCOUNTER_CATALOG[type].attacks.length;i++) {
  const e=makeEnemy(type,{phaseAttackCount:i});
  const plan=planEncounterAttack(e);
  assert.deepEqual(plan,planEncounterAttack(e),'selection must be deterministic');
  assert(plan.tell>=.3&&plan.tell<=.9);
  assert(plan.active>0&&plan.active<=.42);
  assert(plan.recovery>=.25&&plan.recovery<=.6);
  assert.equal(plan.lockTime,.15);
  plans.push(plan);
}
assert(plans.some(p=>p.geometry==='line'&&p.travel));
assert(plans.some(p=>p.geometry==='volley'&&p.offsets.length>1&&!p.offsets.includes(0)));
assert(plans.some(p=>p.geometry==='cone'));
assert(plans.some(p=>p.geometry==='target'));
assert(plans.some(p=>p.geometry==='ring'));
assert(plans.some(p=>p.geometry==='circle'));
assert(plans.some(p=>p.geometry==='line'&&!p.travel));

// Boss form changes by floor. Phase 2 changes the ordered combo, not only HP/speed.
for(const [floor,form] of [[1,'thornwarden'],[3,'bellkeeper'],[5,'hollowKing']]) {
  const one=[],two=[];
  for(let i=0;i<4;i++) {
    one.push(planEncounterAttack(makeEnemy('boss',{phase:1,phaseAttackCount:i}),{floor}).id);
    two.push(planEncounterAttack(makeEnemy('boss',{phase:2,phaseAttackCount:i}),{floor}).id);
  }
  assert.notDeepEqual(one,two);
  assert.equal(planEncounterAttack(makeEnemy('boss'),{floor}).form,form);
  assert.equal(new Set(two).size,4);
}
assert.equal(new Set([1,3,5].map(floor=>planEncounterAttack(makeEnemy('boss'),{floor}).id)).size,3);

// Player aim tracks early, then freezes exactly 150ms before release, even across a boundary.
{
  const h=harness(makeEnemy('archer'),{x:170,y:0}),plan=start(h);
  assert.equal(h.shots.length,0);
  h.step(.2);h.player.y=40;h.step(.2);
  assert.equal(h.enemy.telegraph.locked,true);
  const locked=structuredClone(h.enemy.telegraph.shapes),angle=h.enemy.aim;
  h.player.x=0;h.player.y=-170;h.step(.149);
  assert.deepEqual(h.enemy.telegraph.shapes,locked);
  assert.equal(h.enemy.aim,angle);
  assert.equal(h.shots.length,0);
  h.step(.001);
  assert.equal(h.shots.length,1);
  near(h.shots[0][2],angle);
  assert.equal(h.enemy.actionPhase,'active');
  assert.deepEqual(h.events.map(e=>e.type),['windup','contact']);
  h.step(plan.active);
  assert.equal(h.enemy.actionPhase,'recovery');
  assert.equal(h.enemy.telegraph,null);
  assert(h.enemy.actionProgress>.5&&h.enemy.actionProgress<1);
  h.step(plan.recovery);
  assert.equal(h.enemy.attackCount,1);
  assert.equal(h.enemy.actionPhase,'idle');
}

// No tell-frame contact, no idle body damage, one contact per active window.
{
  const h=harness(),plan=start(h);
  h.step(plan.tell-.001);assert.equal(h.hits.length,0);
  h.step(.001);assert.equal(h.hits.length,1);
  h.step(plan.active/2);assert.equal(h.hits.length,1);
  h.step(plan.active/2+.1);assert.equal(h.hits.length,1);
  assert.equal(h.enemy.actionPhase,'recovery');
  const idle=harness(makeEnemy('rat',{timer:1}),{x:0,y:0});
  idle.step(.1);assert.equal(idle.hits.length,0);
}

// Ground markers lock from cue onset: walking at 130px/s can leave every targeted zone.
for(const [type,index,floor] of [['mage',0,0],['boss',2,1],['boss',0,3],['boss',2,5]]) {
  const h=harness(makeEnemy(type,{phaseAttackCount:index}),{x:40,y:0},{floor}),plan=start(h);
  assert.equal(h.enemy.telegraph.locked,true);
  const initial=structuredClone(h.enemy.telegraph.shapes);
  h.player.x+=130*(plan.tell-.15);h.step(plan.tell-.15);
  assert.deepEqual(h.enemy.telegraph.shapes,initial);
  h.step(.15);assert.equal(h.hits.length,0,`${plan.id} must allow ordinary walking escape`);
}
// Offscreen enemies may approach, but cannot begin an unannounced attack.
{
  const h=harness(makeEnemy('archer'),{x:180,y:0},{canAttack:()=>false});
  h.step(.3);assert.equal(h.enemy.encounterAttack,undefined);assert.equal(h.shots.length,0);
  h.context.canAttack=()=>true;h.step(0);assert.equal(h.enemy.actionPhase,'anticipation');
}

// Capsule, cone, circle and hollow-ring boundaries are exact and rotationally stable.
assert(encounterContains({type:'line',x:0,y:0,x2:100,y2:0,width:20},{x:50,y:10}));
assert(!encounterContains({type:'line',x:0,y:0,x2:100,y2:0,width:20},{x:50,y:10.01}));
assert(encounterContains({type:'line',x:0,y:0,x2:100,y2:0,width:20},{x:110,y:0}));
assert(!encounterContains({type:'line',x:0,y:0,x2:100,y2:0,width:20},{x:110.01,y:0}));
assert(encounterContains({type:'cone',x:0,y:0,r:80,angle:Math.PI,halfAngle:.6},{x:-50,y:0}));
assert(!encounterContains({type:'cone',x:0,y:0,r:80,angle:Math.PI,halfAngle:.6},{x:50,y:0}));
assert(!encounterContains({type:'ring',x:0,y:0,r:100,inner:75},{x:74.99,y:0}));
assert(encounterContains({type:'ring',x:0,y:0,r:100,inner:75},{x:75,y:0}));
assert(!encounterContains({type:'ring',x:0,y:0,r:100,inner:75},{x:100.01,y:0}));

// Actual contact decisions reuse the advertised footprint for every static attack family.
// Clone after lock so moving the test player cannot alter the preview being tested.
let geometryChecks=0;
for(const [type,index,floor,phase=1] of [['bandit',0,0],['skeleton',0,0],['knight',1,0],['mage',0,0],['mage',1,0],['boss',0,3],['boss',1,3],['boss',1,1],['boss',1,3,2]]) {
  const h=harness(makeEnemy(type,{phaseAttackCount:index,phase}),{x:40,y:0},{floor});
  const plan=start(h);h.step(plan.tell-.15);
  const locked=structuredClone(h.enemy);
  for(let y=-190;y<=190;y+=19)for(let x=-190;x<=190;x+=19) {
    const copy=structuredClone(locked),sample=harness(copy,{x,y},{floor});
    const expected=encounterContains(copy.telegraph.shapes,sample.player);
    sample.step(.15);
    assert.equal(sample.hits.length>0,expected,`${plan.id} footprint mismatch at ${x}, ${y}`);
    geometryChecks++;
  }
}
assert(geometryChecks>3000);

// Lunge contact sweeps the active movement segment, never the entire lane instantly.
{
  const h=harness(makeEnemy('rat'),{x:77,y:0}),plan=start(h);
  h.step(plan.tell);assert.equal(h.hits.length,0);
  h.step(plan.active*.5);assert.equal(h.hits.length,0);
  h.step(plan.active*.5);assert.equal(h.hits.length,1);
  near(h.enemy.x,plan.travel);
  const side=harness(makeEnemy('imp'),{x:170,y:0}),p=start(side);
  side.step(p.tell-.15);side.player.y=30;side.step(.15+p.active);
  assert.equal(side.hits.length,0,'sidestep the locked dash lane');
}

// Projectile trajectories and lifetimes are derived directly from preview lanes.
{
  const h=harness(makeEnemy('archer',{phaseAttackCount:1}),{x:200,y:0}),plan=start(h);
  h.step(plan.tell-.15);const lanes=structuredClone(h.enemy.telegraph.shapes);
  assert(!encounterContains(lanes,{x:200,y:0}),'split volley must leave a usable center gap');
  h.step(.15);assert.equal(h.shots.length,lanes.length);
  h.shots.forEach((args,i)=>{
    const [x,y,a,speed,,,hostile,options]=args,lane=lanes[i];
    assert(hostile);near(x,lane.x);near(y,lane.y);
    near(x+Math.cos(a)*speed*options.life,lane.x2);
    near(y+Math.sin(a)*speed*options.life,lane.y2);
    near(options.r+10,lane.width/2);
  });
}

// A wall clips the warning lane and projectile travel; LOS suppresses contact through it.
{
  const h=harness(makeEnemy('archer'),{x:180,y:0},{solid:(x)=>x>=100}),plan=start(h);
  assert.equal(h.enemy.telegraph.shapes[0].x2,96);
  h.step(plan.tell);near(h.shots[0][7].life*plan.speed,96);
  const blocked=harness(makeEnemy(),{x:40,y:0});const p=start(blocked);
  blocked.context.lineClear=()=>false;blocked.step(p.tell+p.active);
  assert.equal(blocked.hits.length,0);
}

// Two attack slots and a three-token budget cover attackers on both sides of the player.
{
  const enemies=Array.from({length:7},(_,i)=>makeEnemy('bandit',{x:Math.cos(i)*25,y:Math.sin(i)*25}));
  const ctx=harness(enemies[0],{x:0,y:0}).context;ctx.entities=enemies;
  for(const e of enemies)updateEncounterEnemy(e,0,ctx);
  assert.equal(enemies.filter(e=>e.encounterAttack).length,2);
  const ranged=[makeEnemy('archer',{x:-265}),makeEnemy('archer',{x:265})];
  ctx.entities=ranged;for(const e of ranged)updateEncounterEnemy(e,0,ctx);
  assert.equal(ranged.filter(e=>e.encounterAttack).length,1,'only one ranged commitment at a time');
  const heavy=[makeEnemy('boss'),makeEnemy('knight')];ctx.entities=heavy;
  for(const e of heavy)updateEncounterEnemy(e,0,ctx);
  assert.equal(heavy.filter(e=>e.encounterAttack).length,1,'boss plus heavy exceeds three tokens');
  const regular=makeEnemy('rat');heavy.push(regular);updateEncounterEnemy(regular,0,ctx);
  assert.equal(heavy.filter(e=>e.encounterAttack).length,2,'boss leaves room for one light attacker');
}

// Recovery still owns its attack slot; stagger removes telegraphs and cancels release.
{
  const h=harness(makeEnemy('archer'),{x:200,y:0}),plan=start(h);
  h.step(.2);h.enemy.stagger=.09;h.step(.1);
  assert.equal(h.enemy.telegraph,null);
  assert.equal(h.enemy.actionPhase,'recovery');
  h.step(plan.recovery+.01);assert.equal(h.shots.length,0);
  assert(h.events.some(e=>e.type==='interrupted'));
  h.enemy.hp=0;h.step(.1);assert.equal(h.enemy.telegraph,null);assert.equal(h.enemy.encounterAttack,null);
}

// A full first combo advances the boss at full HP; every second-phase step has a new tell.
{
  const h=harness(makeEnemy('boss'),{x:40,y:0},{floor:3});
  for(let i=0;i<3;i++) {h.enemy.timer=0;start(h);finish(h);}
  assert.equal(h.enemy.hp,h.enemy.max);
  assert.equal(h.enemy.phase,2);
  assert.deepEqual(h.phases,[2]);
  h.enemy.timer=0;const plan=start(h);
  assert.equal(plan.comboLength,4);assert.equal(h.enemy.actionPhase,'anticipation');
  assert.equal(h.events.filter(e=>e.type==='windup').length,4);
  const low=harness(makeEnemy('boss',{hp:49}),{x:40,y:0},{floor:1});start(low);finish(low);
  assert.equal(low.enemy.phase,2);
}

// Save data is JSON-safe; obsolete state starts with a grace interval and no latent damage.
{
  const h=harness(makeEnemy('mage'),{x:160,y:0});start(h);h.step(.3);
  const saved=JSON.parse(JSON.stringify(h.enemy));assert.deepEqual(saved,h.enemy);
  const old=makeEnemy('imp',{encounterVersion:undefined,state:'charge',timer:.01,aim:0});
  resetEncounterEnemy(old);assert.equal(old.state,'idle');assert.equal(old.telegraph,null);assert(old.timer>=.25);
  const resumed=harness(old,{x:0,y:0});resumed.step(.1);assert.equal(resumed.hits.length,0);
}

// Small stepping and a single large step agree on a full attack's deterministic result.
{
  const a=harness(makeEnemy('skeleton'),{x:80,y:0}),b=harness(makeEnemy('skeleton'),{x:80,y:0});
  const plan=start(a);start(b);const total=plan.tell+plan.active+plan.recovery;
  a.step(total);for(let elapsed=0;elapsed<total-1e-9;elapsed+=.01)b.step(Math.min(.01,total-elapsed));
  assert.equal(a.hits.length,b.hits.length);assert.equal(a.enemy.attackCount,b.enemy.attackCount);
  assert.equal(a.enemy.actionPhase,b.enemy.actionPhase);
}
console.log(`PASS: 7 distinct enemy roles, 3 guardian forms/phase combos, anticipation/150ms lock/active/recovery, ${geometryChecks} shared-geometry contact cases, projectile lane/lifetime agreement, lunge sidesteps, wall clipping, attack budgets, stagger cancellation and save safety. Pure simulation only; not browser QA.`);
