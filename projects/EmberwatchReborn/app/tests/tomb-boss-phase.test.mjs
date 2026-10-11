import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {grantExperience} from '../src/progression.js';
import {deriveStats,purchaseSkill} from '../src/warrior-growth.js';
import {createBattle,stepBattle,physicalDamage} from '../src/combat.js';
import {FOES,createMap} from '../src/world.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {CORE_REFERENCE} from '../src/reference-core.js';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {battleReport} from '../src/recovery.js';
import {TOMB_BOSS_PHASES,TOMB_FOES} from '../src/tomb-content.js';

// COMBAT-BOUNDARY FIXTURES, not ordinary-input play or earned progression.
// The T gate/position, exact HP threshold and (where needed) Adept skill budget
// are injected. Timing-only checks suppress hero damage with fixture invuln;
// damage/death checks remove it. Native boss HP/max, attacks and damage are
// never increased. Every observed attack, hit, stun and transition runs through
// the real production createBattle/stepBattle, not a replacement selector.
function fixture({difficulty='normal',skills={}}={}){
 const s=reduceRuntime(createState({difficulty}),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(Object.keys(skills).length){
  s.character=grantExperience(s.character,20000).character;s.character.tier='adept';
  function learn(id,rank){
   const row=WARRIOR_REFERENCE.skills.find(x=>x.id===id);
   if(row.baseId&&!s.character.skills[row.baseId])learn(row.baseId,1);
   while((s.character.skills[id]??0)<rank){const r=purchaseSkill(s.character,id,s);assert.equal(r.ok,true,`${id}: ${r.reason}`);s.character=r.character;}
  }
  for(const [id,rank]of Object.entries(skills))learn(id,rank);
  const stats=deriveStats(s.character,s).stats;s.vitals={hp:stats.hpMax,mana:stats.manaMax,stamina:stats.staminaMax};
 }
 s.world.region='signal_tomb';s.world.position={x:620,y:560};s.world.objectives.tomb_ward_sealed=1;
 const b=createBattle(s),e=b.enemies.find(e=>e.id==='tomb-oathkeeper');b.enemies=[e];b.awaitingAdvance=false;b.p.invuln=100;
 return {s,b,e,events:[]};
}
const tick=(f,input={},dt=.02)=>{const events=stepBattle(f.b,f.s.character,dt,input);f.events.push(...events);return events;};
function until(f,condition,{dt=.02,input={},limit=1500}={}){
 // Observe the exact attack-release boundary, not the later end of a split frame.
 let frames=0;while(!condition()&&frames++<limit){const left=Math.min(dt,.05),rate=f.b.hitstop>=left&&f.b.hitstop>0?.35:1;tick(f,input,f.e.state==='windup'?Math.min(left,Math.max(1e-10,f.e.timer/rate)):left);}
 assert.ok(condition(),`condition not reached after ${limit} frames`);
}
function run(f,seconds,{dt=.02,input={}}={}){for(let left=seconds;left>1e-9;){const part=Math.min(left,dt);tick(f,input,part);left-=part;}}
function nextAttack(f,dt=.02){const old=f.e.telegraph;until(f,()=>!!f.e.telegraph&&f.e.telegraph!==old,{dt});return f.e.attackSpec;}
const phases=f=>f.events.filter(e=>e.type==='enemyPhaseChanged');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const ids={needle:'tomb-oath-needle',pulse:'tomb-oath-pulse',broken:'tomb-oath-broken'};

test('only T oathkeeper opts into the immutable authored phases and uses native scaled HP',()=>{
 assert.deepEqual(Object.entries(FOES).filter(([,f])=>f.patternPhases).map(([id])=>id),['tomb_oathkeeper']);
 assert.equal(TOMB_FOES.tomb_oathkeeper.patternPhases,TOMB_BOSS_PHASES);assert.ok(Object.isFrozen(TOMB_BOSS_PHASES[1].patternIds));
 for(const difficulty of ['easy','normal','hard','serious']){
  const f=fixture({difficulty});assert.equal(f.e.hp,210*CORE_REFERENCE.difficulty[difficulty].enemyHealth);assert.equal(f.e.max,f.e.hp);
  assert.deepEqual(f.e.patternPhase,{id:'whole',cue:null,index:0,pendingIndex:0});assert.equal(f.e.invuln,undefined);assert.equal(f.e.armor,undefined);
  assert.equal(f.e.type,'boss');assert.equal(phases(f).length,0);
 }
});

for(const dt of [.01,.02,.05,.25])test(`step ${dt}: whole cycles needle/pulse and cracked restarts needle/broken/pulse once`,()=>{
 const f=fixture();
 for(const id of [ids.needle,ids.pulse,ids.needle,ids.pulse])assert.equal(nextAttack(f,dt).id,id);
 const tell=f.e.telegraph,spec=f.e.attackSpec,angle=f.e.angle,shape=structuredClone(tell.shapes);f.e.hp=f.e.max/2;
 tick(f,{},dt);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.patternPhase.pendingIndex,1);assert.equal(f.e.telegraph,tell);
 assert.equal(f.e.attackSpec,spec);assert.equal(f.e.angle,angle);assert.deepEqual(f.e.telegraph.shapes,shape);assert.equal(phases(f).length,0);
 until(f,()=>f.e.state==='recovery',{dt});assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.timer,spec.recovery);
 const hp=f.e.hp,max=f.e.max;assert.equal(nextAttack(f,dt).id,ids.needle);
 assert.equal(f.e.patternPhase.id,'cracked');assert.equal(f.e.patternPhase.cue,'cracked-ring');assert.equal(f.e.hp,hp);assert.equal(f.e.max,max);
 assert.deepEqual(phases(f),[{type:'enemyPhaseChanged',id:f.e.id,phaseId:'cracked',cue:'cracked-ring'}]);
 for(const id of [ids.broken,ids.pulse,ids.needle,ids.broken,ids.pulse])assert.equal(nextAttack(f,dt).id,id);
 assert.equal(phases(f).length,1);assert.equal(f.events.filter(e=>e.type==='defeated').length,0);
});

for(const difficulty of ['easy','normal','hard','serious'])test(`${difficulty}: threshold is inclusive at scaled half HP, with no phase above it`,()=>{
 const f=fixture({difficulty});f.e.hp=f.e.max/2+.0001;nextAttack(f);assert.equal(f.e.patternPhase.id,'whole');
 assert.equal(nextAttack(f).id,ids.pulse);assert.equal(phases(f).length,0);
 f.e.hp=f.e.max/2;tick(f);assert.equal(f.e.patternPhase.pendingIndex,1);assert.equal(f.e.patternPhase.id,'whole');
 assert.equal(nextAttack(f).id,ids.needle);assert.equal(f.e.patternPhase.id,'cracked');assert.equal(f.e.hp,f.e.max/2);
});

test('threshold observed during recovery waits its complete timer and latches despite a later fixture HP rise',()=>{
 const f=fixture();nextAttack(f);until(f,()=>f.e.state==='recovery');const recovery=f.e.timer;
 f.e.hp=f.e.max/2;tick(f);assert.equal(f.e.patternPhase.pendingIndex,1);assert.equal(f.e.patternPhase.id,'whole');near(f.e.timer,recovery-.02);
 // There is no enemy heal in production. This deliberate test mutation proves
 // that an already observed threshold cannot rewind if a future source rises.
 f.e.hp=f.e.max;run(f,.4);assert.equal(f.e.patternPhase.id,'whole');assert.equal(phases(f).length,0);
 until(f,()=>f.e.patternPhase.id==='cracked');assert.equal(f.e.attackSpec.id,ids.needle);assert.equal(phases(f).length,1);assert.equal(f.e.hp,f.e.max);
 nextAttack(f);assert.equal(f.e.attackSpec.id,ids.broken);assert.equal(f.e.patternPhase.id,'cracked');
});

test('threshold crossing on a real hammer hit keeps committed needle shape, aim and attack damage',()=>{
 const f=fixture();f.e.hp=f.e.max/2+10;nextAttack(f);const tell=f.e.telegraph,shape=structuredClone(tell.shapes),spec=f.e.attackSpec;
 tick(f,{hammer:true,aim:f.e});until(f,()=>f.b.contacts===1);
 near(f.e.hp,f.e.max/2+10-physicalDamage(f.b.stats.actions.righteous_hammer.damage,FOES.tomb_oathkeeper.armor));
 assert.equal(f.e.patternPhase.pendingIndex,1);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.telegraph,tell);assert.equal(f.e.attackSpec,spec);assert.deepEqual(tell.shapes,shape);
 f.b.p.x=560;f.b.p.y=620;until(f,()=>f.e.state==='recovery');assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.timer,1.05);
 assert.equal(nextAttack(f).id,ids.needle);assert.equal(phases(f).length,1);assert.equal(f.b.contacts,1);
});

test('real charge retains ordinary stun interruption while phase waits for stun and existing idle cooldown',()=>{
 const g=fixture();nextAttack(g);g.e.hp=g.e.max/2;const old=g.e.telegraph;
 tick(g,{charge:true,aim:g.e});until(g,()=>g.e.stun>0);
 assert.equal(g.e.patternPhase.id,'whole');assert.equal(g.e.patternPhase.pendingIndex,1);assert.equal(g.e.state,'idle');assert.equal(g.e.telegraph,null);assert.notEqual(old,null);
 assert.equal(g.e.timer,.25);const hp=g.e.hp;run(g,.3);assert.equal(g.e.patternPhase.id,'whole');assert.equal(g.e.timer,.25);
 until(g,()=>g.e.stun===0);assert.equal(g.e.patternPhase.id,'whole');assert.ok(g.e.timer>0);assert.equal(phases(g).length,0);
 until(g,()=>g.e.patternPhase.id==='cracked');assert.equal(g.e.hp,hp);assert.equal(g.e.invuln,undefined);assert.equal(phases(g).length,1);
});

test('damage remains live while stunned and a newly observed threshold waits for stun expiry',()=>{
 const f=fixture();tick(f,{charge:true,aim:f.e});until(f,()=>f.e.stun>0);
 until(f,()=>!f.b.p.action);f.e.hp=f.e.max/2+5;const hp=f.e.hp;tick(f,{attack:true,aim:f.e});until(f,()=>f.b.contacts>=2);
 assert.ok(f.e.stun>0);assert.ok(f.e.hp<hp);assert.ok(f.e.hp<f.e.max/2);assert.equal(f.e.patternPhase.pendingIndex,1);assert.equal(f.e.patternPhase.id,'whole');
 until(f,()=>f.e.patternPhase.id==='cracked');assert.equal(phases(f).length,1);
});

test('actual Shackles hit latches threshold without changing committed timing; slowed pursuit stays native',()=>{
 const f=fixture({skills:{judgement:1,shackles:1}});f.e.hp=f.e.max/2+1;nextAttack(f);const tell=f.e.telegraph;
 tick(f,{judgement:true,aim:f.e});until(f,()=>!!f.e.shackles);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.telegraph,tell);
 assert.equal(f.e.windupDuration,1.25);assert.equal(f.e.attackSpec.recovery,1.05);assert.ok(f.e.hp<f.e.max/2);
 f.b.hitstop=0;f.b.p.x=690;f.b.p.y=688;const start={x:f.e.x,y:f.e.y};
 until(f,()=>f.e.patternPhase.id==='cracked');assert.equal(f.e.state,'idle');assert.equal(phases(f).length,1);
 const before={x:f.e.x,y:f.e.y},multiplier=f.e.shackles.moveMultiplier;tick(f);
 near(Math.hypot(f.e.x-before.x,f.e.y-before.y),FOES.tomb_oathkeeper.speed*multiplier*.02);assert.ok(Math.hypot(f.e.x-start.x,f.e.y-start.y)>0);
 assert.equal(f.e.attackSpec.id,ids.needle);
});

test('lethal contact during pending windup gives one defeat with no forced phase, release, heal or extra HP',()=>{
 const f=fixture();nextAttack(f);f.e.hp=1;tick(f);assert.equal(f.e.patternPhase.pendingIndex,1);
 tick(f,{attack:true,aim:f.e});until(f,()=>f.e.hp===0);run(f,3);
 assert.equal(f.events.filter(e=>e.type==='defeated'&&e.id===f.e.id).length,1);assert.equal(phases(f).length,0);
 assert.equal(f.events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length,0);assert.equal(f.e.hp,0);assert.equal(f.e.max,210);assert.equal(f.e.invuln,undefined);
});

test('a lethal player contact wins over phase activation on the same recovery-expiry frame',()=>{
 const f=fixture();nextAttack(f);until(f,()=>f.e.state==='recovery');f.e.hp=1;tick(f);
 tick(f,{attack:true,aim:f.e});until(f,()=>f.b.p.action.contact-f.b.p.action.elapsed<=.02+1e-9);
 f.e.timer=.001;tick(f);assert.equal(f.e.hp,0);assert.equal(phases(f).length,0);
 assert.equal(f.events.filter(e=>e.type==='defeated').length,1);assert.equal(f.e.patternPhase.id,'whole');run(f,2);assert.equal(phases(f).length,0);
});

test('actual needle contact and shield thorns can kill hero/boss together without a phase, resurrection or duplicate event',()=>{
 const f=fixture({skills:{shield_of_thorns:1}});nextAttack(f);f.e.hp=1;f.b.p.hp=1;f.b.p.invuln=0;f.b.p.stamina=40;
 until(f,()=>f.b.dead,{input:{block:true,aim:f.e}});
 assert.equal(f.e.hp,0);assert.equal(f.b.p.hp,0);assert.equal(phases(f).length,0);
 assert.equal(f.events.filter(e=>e.type==='defeated'&&e.id===f.e.id).length,1);assert.equal(f.events.filter(e=>e.type==='heroDead').length,1);
 assert.equal(f.e.patternPhase.id,'whole');run(f,3);assert.equal(f.events.filter(e=>e.type==='heroDead').length,1);assert.equal(f.events.filter(e=>e.type==='defeated').length,1);
});

test('actual Trial by Fire ticks cross the threshold during a locked tell without skipping damage or forcing survival',()=>{
 const f=fixture({skills:{judgement:1,trial_by_fire:1}});f.e.hp=FOES.tomb_oathkeeper.hp/2+35;nextAttack(f);
 const tell=f.e.telegraph;tick(f,{judgement:true,aim:f.e});until(f,()=>f.b.areas.length===1);const hp=f.e.hp,contacts=f.b.contacts;
 assert.ok(hp>f.e.max/2);until(f,()=>f.b.contacts>contacts);near(hp-f.e.hp,f.b.stats.actions.judgement.fireArea.damage);
 assert.ok(f.e.hp<=f.e.max/2);assert.equal(f.e.telegraph,tell);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.patternPhase.pendingIndex,1);
 until(f,()=>f.e.state==='recovery');assert.equal(f.e.patternPhase.id,'whole');const afterRelease=f.e.hp;
 until(f,()=>f.e.hp<afterRelease);assert.equal(f.e.patternPhase.id,'whole');assert.ok(f.e.timer>0);
 until(f,()=>f.e.patternPhase.id==='cracked'||f.e.hp===0);assert.ok(f.e.hp<afterRelease);assert.equal(f.e.max,210);assert.equal(f.e.invuln,undefined);
});

test('phase and skill pulse in one split input deadline frame stay single; no second phase or tell on zero-time repeat',()=>{
 const f=fixture();nextAttack(f);until(f,()=>f.e.state==='recovery');f.e.hp=f.e.max/2;
 f.e.timer=.01;f.b.skillIntent={id:'righteous_hammer',angle:Math.PI,aimAngle:Math.PI,move:null,remaining:.02};
 const events=tick(f,{},.05);assert.equal(events.filter(e=>e.type==='enemyPhaseChanged').length,1);assert.equal(events.filter(e=>e.type==='sound'&&e.name==='enemyTell').length,1);
 assert.equal(events.filter(e=>e.type==='actionStarted'&&e.id==='righteous_hammer').length,1);assert.equal(f.e.attackSpec.id,ids.needle);
 const tell=f.e.telegraph;tick(f,{},0);assert.equal(f.e.telegraph,tell);assert.equal(phases(f).length,1);
});

for(const offset of [103.999,104,104.001])test(`pulse keeps native strict radius+8 boundary at ${offset} without duplicate contact`,()=>{
 const f=fixture();nextAttack(f);assert.equal(nextAttack(f).id,ids.pulse);const p=f.b.p;p.x=f.e.x+offset;p.y=f.e.y;p.invuln=0;f.b.seed=100000;
 const hp=p.hp;f.e.hp=f.e.max/2;until(f,()=>f.e.state==='recovery');
 const hurt=f.events.filter(e=>e.type==='heroHurt');assert.equal(hurt.length,offset<104?1:0);
 near(hp-p.hp,offset<104?physicalDamage(14,f.b.stats.armor):0);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.timer,1.45);
 run(f,.3);assert.equal(f.events.filter(e=>e.type==='heroHurt').length,hurt.length);assert.equal(phases(f).length,0);
});

test('broken oath uses its authored locked line, projectile speed, travel, damage and recovery once',()=>{
 const f=fixture();f.e.hp=f.e.max/2;nextAttack(f);assert.equal(nextAttack(f).id,ids.broken);
 const attack=f.e.attackSpec,tell=f.e.telegraph,shape=structuredClone(tell.shapes[0]),angle=f.e.angle;
 assert.equal(shape.type,'line');assert.equal(shape.width,16);near(Math.hypot(shape.x2-shape.x,shape.y2-shape.y),320);
 f.b.p.x=560;f.b.p.y=620;tick(f);assert.equal(f.e.telegraph,tell);assert.equal(f.e.angle,angle);assert.deepEqual(tell.shapes[0],shape);
 until(f,()=>f.e.state==='recovery');assert.equal(f.e.timer,1.1);const shot=f.b.shots.find(s=>s.enemy);assert.ok(shot);
 near(Math.hypot(shot.vx,shot.vy),200);near(shot.life,320/200);assert.equal(shot.damage,12);assert.equal(shot.damageType,'physical');assert.equal(attack.range,250);
 const releases=f.events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length;tick(f);assert.equal(f.events.filter(e=>e.type==='sound'&&e.name==='enemyRelease').length,releases);
});

test('reconstruction restores existing full enemy HP and resets phase/cursor while keeping hero paid recovery',()=>{
 const f=fixture();f.e.hp=f.e.max/2;nextAttack(f);nextAttack(f);assert.equal(f.e.patternPhase.id,'cracked');assert.equal(f.e.patternIndex,2);
 f.b.p.invuln=0; // Remove timing-only fixture invulnerability before testing a strict durable report.
 f.b.p.mana=7;f.b.p.cooldowns.righteous_hammer=2;f.b.p.recoveryLock=.3;const snapshot=battleReport(f.b);
 const resumed=createBattle({...f.s,vitals:snapshot.vitals,recovery:snapshot.recovery}),e=resumed.enemies.find(e=>e.id===f.e.id);
 assert.equal(e.hp,210);assert.equal(e.max,210);assert.deepEqual(e.patternPhase,{id:'whole',cue:null,index:0,pendingIndex:0});assert.equal(e.patternIndex,undefined);assert.equal(e.telegraph,null);
 assert.equal(resumed.p.mana,7);assert.equal(resumed.p.cooldowns.righteous_hammer,2);assert.equal(resumed.p.recoveryLock,.3);assert.equal(resumed.awaitingAdvance,true);
 assert.equal(f.e.patternPhase.id,'cracked');assert.equal(f.e.hp,105);assert.equal(snapshot.patternPhase,undefined);
 const defeated=structuredClone(f.s);defeated.world.defeated.signal_tomb=[f.e.id];assert.equal(createBattle(defeated).enemies.some(e=>e.id===f.e.id),false);
});

test('arrival safety and closed boss gate cannot advance or reveal an unactivated phase',()=>{
 const f=fixture();f.b.awaitingAdvance=true;f.e.hp=f.e.max/2;run(f,1);assert.equal(f.e.patternPhase.id,'whole');assert.equal(f.e.patternPhase.pendingIndex,0);
 f.s.world.objectives.tomb_ward_sealed=0;tick(f,{move:{x:1,y:0}});assert.equal(f.e.active,false);assert.equal(f.e.telegraph,null);assert.equal(f.e.patternPhase.id,'whole');assert.equal(phases(f).length,0);
});

test('every preexisting fixed pattern cycle stays unchanged below half HP without phase fields/events',()=>{
 for(const [kind,foe]of Object.entries(FOES).filter(([,f])=>f.patterns&&!f.patternPhases)){
  const f=fixture();f.b.map=mapFromRegion({w:30,h:30});Object.assign(f.b.p,{x:520,y:560});
  f.e={id:`old-${kind}`,kind,x:560,y:560,hp:foe.hp*.1,max:foe.hp,angle:0,active:true,state:'idle',timer:0,stun:0,telegraph:null};f.b.enemies=[f.e];
  for(let i=0;i<foe.patterns.length*2;i++)assert.equal(nextAttack(f).id,foe.patterns[i%foe.patterns.length].id,kind);
  assert.equal(f.e.patternPhase,undefined,kind);assert.equal(phases(f).length,0,kind);assert.equal(f.e.hp,foe.hp*.1,kind);
 }
});

test('legacy unpatterned foes preserve fallback attacks and never acquire phase metadata',()=>{
 for(const kind of ['scout','archer','bruiser','warden']){
  const f=fixture(),foe=FOES[kind];f.b.map=createMap('ash_road');Object.assign(f.b.p,{x:520,y:560});
  f.e={id:`old-${kind}`,kind,x:560,y:560,hp:foe.hp/2,max:foe.hp,angle:0,active:true,state:'idle',timer:0,stun:0,telegraph:null};f.b.enemies=[f.e];
  const attack=nextAttack(f);assert.equal(attack.damage,foe.damage);assert.equal(attack.windup,foe.windup);assert.equal(attack.recovery,foe.recovery);
  assert.equal(attack.shape,foe.style==='ranged'?'line':'cone');assert.equal(f.e.patternPhase,undefined);assert.equal(f.e.patternIndex,undefined);assert.equal(phases(f).length,0);
 }
});
