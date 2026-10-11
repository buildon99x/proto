import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle,applyHeroStatus,physicalDamage,cancelBattleAction} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {createStore} from '../src/save.js';
import {createInputRouter,controlsFor} from '../src/controls.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {FOES} from '../src/world.js';
import {HERO_STATUS_RULES} from '../src/hero-status.js';
import {resolveActorMotion} from '../src/motion.js';
import {fixture as expertFixture} from './support/expert-fixture.mjs';

// Synthetic combat-boundary fixtures: real handlers, router, reducer and store.
// Positions/targets are scripted. No browser, pixels or earned-play acceptance.
const close=(a,b,label='')=>assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
const pos=f=>({x:f.b.p.x,y:f.b.p.y});
const aim=f=>({x:f.b.p.x+200,y:f.b.p.y});
const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
function fixture(){
 const r=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}});assert.equal(r.ok,true);
 const s=r.state,b=createBattle(s);b.map=mapFromRegion({w:40,h:30});b.p.x=b.p.y=300;b.enemies=[];b.awaitingAdvance=false;return {s,b};
}
function enemy(f,{x=340,y=300,id='target',hp=5000}={}){
 const e={id,kind:'scout',x,y,hp,max:hp,angle:Math.PI,active:false,state:'idle',timer:0,stun:0,telegraph:null,gate:{objective:'synthetic_recovery_fixture',minimum:1}};
 f.b.enemies.push(e);return e;
}
function run(f,seconds,input={},dt=.02){
 const events=[];for(let t=0;t<seconds-1e-10;t+=dt)events.push(...tick(f,typeof input==='function'?input():input,Math.min(dt,seconds-t)));return events;
}
function start(f,input={}){const events=tick(f,{attack:true,aim:aim(f),...input},0);assert.equal(f.b.p.action?.id,'mace_swing');return events;}
function elapsed(f,target,input={},dt=.02){
 const events=[];for(let n=0;n<1000&&f.b.p.action?.elapsed<target-1e-10;n++)events.push(...tick(f,input,Math.min(dt,target-f.b.p.action.elapsed)));
 close(f.b.p.action?.elapsed,target,'action elapsed');return events;
}
const starts=events=>events.filter(e=>e.type==='actionStarted');
const hits=events=>events.filter(e=>e.type==='enemyHit');
const east={x:1,y:0};

for(const dt of [1/60,.02,.05])test(`planted pre-contact and exact contact; only next segment walks, dt=${dt}`,()=>{
 const f=fixture(),origin=pos(f);start(f);const a=f.b.p.action,spec=a.spec,angle=a.angle,id=a.castId;
 close(a.duration,.52);close(a.contact/a.duration,.35);elapsed(f,a.contact-1e-6,{attack:true,move:east},dt);
 assert.deepEqual(pos(f),origin);assert.equal(a.fired,false);
 tick(f,{attack:true,move:east},a.contact-a.elapsed);assert.equal(a.fired,true);assert.deepEqual(pos(f),origin);
 tick(f,{attack:true,move:east},dt);close(f.b.p.x-origin.x,f.b.stats.moveSpeed*dt);close(f.b.p.y,origin.y);
 assert.equal(f.b.p.action,a);assert.equal(a.spec,spec);assert.equal(a.angle,angle);assert.equal(a.castId,id);assert.equal(a.duration,.52);
});

test('a contact-crossing external frame walks only its post-contact subsegment',()=>{
 const f=fixture();start(f);elapsed(f,.15);const x=f.b.p.x;tick(f,{attack:true,move:east},.05);
 close(f.b.p.action.elapsed,.2);close(f.b.p.x-x,f.b.stats.moveSpeed*(.2-f.b.p.action.contact));
});

test('zero dt accepts input without movement, contact, elapsed time or early recast',()=>{
 const f=fixture(),origin=pos(f);start(f,{move:east});assert.deepEqual(pos(f),origin);assert.equal(f.b.p.action.elapsed,0);
 elapsed(f,f.b.p.action.contact);const a=f.b.p.action,debt=battleReport(f.b).recovery.lock;
 for(let n=0;n<10;n++)assert.equal(starts(tick(f,{attack:true,move:east},0)).length,0);
 assert.equal(f.b.p.action,a);assert.deepEqual(pos(f),origin);close(battleReport(f.b).recovery.lock,debt);
});

for(const dt of [1/60,.02,.05])for(const held of [false,true])test(`${held?'held':'single'} moving attack preserves cadence, damage, costs and one contact/cast, dt=${dt}`,()=>{
 const moving=fixture(),still=fixture();enemy(moving);enemy(still);const logs=[[],[]],initial=pos(moving);
 for(const [i,f]of [moving,still].entries())logs[i].push(...start(f));
 for(let n=0;n<Math.ceil(2.6/dt);n++){
  const frameStarts=[];
  for(const [i,f]of [moving,still].entries()){
   const input={attack:held,aim:aim(f),move:i===0?{x:0,y:Math.floor(n*dt/.1)%2?1:-1}:{x:0,y:0}};
   const events=tick(f,input,dt);logs[i].push(...events);frameStarts.push(starts(events));
  }
  assert.deepEqual(frameStarts[0],frameStarts[1],'same action starts on each actual frame');
  assert.equal(still.b.p.action?.id,moving.b.p.action?.id);close(still.b.p.action?.elapsed??0,moving.b.p.action?.elapsed??0);
  assert.deepEqual(battleReport(still.b).recovery,battleReport(moving.b).recovery);
 }
 const combatOnly=events=>events.filter(e=>!(e.type==='sound'&&e.name==='footstep'));
 assert.deepEqual(combatOnly(logs[0]),combatOnly(logs[1]));assert.deepEqual(battleReport(moving.b).vitals,battleReport(still.b).vitals);assert.equal(moving.b.seed,still.b.seed);
 const contacts=hits(logs[0]),castIds=contacts.map(e=>e.context.castId);assert.equal(new Set(castIds).size,contacts.length);
 assert.equal(contacts.length,held?starts(logs[0]).length:1);assert.equal(still.b.p.x,initial.x);assert.equal(still.b.p.y,initial.y);
 assert.ok(moving.b.p.y!==initial.y||moving.b.p.walkPhase!==still.b.p.walkPhase,'movement was not permanently blocked');
});

test('contact range and aim use original planted position and cannot sweep a second target during recovery',()=>{
 const f=fixture(),front=enemy(f),outside=enemy(f,{id:'outside',x:1000});start(f);const a=f.b.p.action,origin=pos(f);outside.x=f.b.p.x+a.spec.range+11;
 const events=elapsed(f,a.contact,{move:east,aim:{x:100,y:300}});assert.deepEqual(pos(f),origin);assert.equal(a.angle,0);assert.equal(hits(events).length,1);
 const hit=hits(events)[0],expected=physicalDamage(a.spec.damage*(hit.critical?a.spec.offense.criticalMultiplier:1),FOES.scout.armor,a.spec.armorPenetration??0);
 close(5000-front.hp,expected);const hp=front.hp;run(f,.3,{move:east,aim:{x:100,y:300}});assert.ok(f.b.p.x>origin.x);assert.equal(a.angle,0);assert.equal(front.hp,hp);assert.equal(outside.hp,5000);assert.equal(f.b.contacts,1);
});

test('full recovery debt persists while moving; held attack begins only after original duration',()=>{
 const f=fixture();start(f);elapsed(f,.5);const a=f.b.p.action;close(battleReport(f.b).recovery.lock,.02);
 tick(f,{attack:true,move:east},.02);assert.equal(f.b.p.action,null);close(a.elapsed,a.duration);assert.equal(f.b.p.combo,1);
 const events=tick(f,{attack:true,move:east},0);assert.equal(starts(events).length,1);assert.equal(f.b.p.action.castId,a.castId+1);assert.equal(f.b.p.action.elapsed,0);assert.equal(f.b.p.combo,2);
});

for(const direction of [{x:1,y:0},{x:3,y:4},{x:-3,y:-4}])test(`recovery uses normalized existing move speed for ${JSON.stringify(direction)}`,()=>{
 const f=fixture();start(f);elapsed(f,.2);const origin=pos(f),n=Math.hypot(direction.x,direction.y);
 tick(f,{move:direction},.05);close(f.b.p.x-origin.x,direction.x/n*f.b.stats.moveSpeed*.05);close(f.b.p.y-origin.y,direction.y/n*f.b.stats.moveSpeed*.05);
});

test('recovery collision matches ordinary movement at wall and diagonal slide',()=>{
 for(const move of [{x:1,y:0},{x:1,y:1}]){
  const a=fixture(),idle=fixture();for(const f of [a,idle]){f.b.map=mapFromRegion({w:10,h:10,rooms:[{x:1,y:1,w:4,h:8},{x:6,y:1,w:3,h:8}]});f.b.p.x=142;f.b.p.y=144;}
  start(a);elapsed(a,.2);for(let n=0;n<5;n++){tick(a,{move},.05);tick(idle,{move},.05);assert.deepEqual(pos(a),pos(idle));assert.ok(a.b.p.x<150);}
 }
});

for(const dt of [1/60,.02,.05])test(`hitstop slows movement and recovery together, never enables windup, dt=${dt}`,()=>{
 const f=fixture();start(f);f.b.hitstop=2;const origin=pos(f);tick(f,{move:east},dt);assert.deepEqual(pos(f),origin);close(f.b.p.action.elapsed,dt*.35);
 f.b.hitstop=0;elapsed(f,.2);f.b.hitstop=2;const before=f.b.p.action.elapsed,x=f.b.p.x;tick(f,{move:east},dt);
 close(f.b.p.action.elapsed-before,dt*.35);close(f.b.p.x-x,f.b.stats.moveSpeed*dt*.35);
});

test('actual contact hitstop is respected identically by stationary and recovery-moving attacks',()=>{
 const a=fixture(),b=fixture();enemy(a);enemy(b);for(const f of [a,b]){start(f);elapsed(f,f.b.p.action.contact);assert.ok(f.b.hitstop>0);}
 const before=a.b.p.action.elapsed,x=a.b.p.x;tick(a,{move:east},.005);tick(b,{},.005);
 close(a.b.p.action.elapsed,b.b.p.action.elapsed);close(a.b.p.action.elapsed-before,.005*.35);close(a.b.p.x-x,a.b.stats.moveSpeed*.005*.35);assert.equal(a.b.contacts,1);
});

for(const phase of ['windup','recovery'])for(const status of ['stun','disarm'])test(`${status} in ${phase} preserves interruption/debt contract`,()=>{
 const f=fixture();start(f);elapsed(f,phase==='windup'?.1:.2);const a=f.b.p.action,debt=a.duration-a.elapsed,x=f.b.p.x;
 assert.equal(applyHeroStatus(f.b,'r11_'+status,'fixture'),true);const interrupted=status==='stun'||phase==='windup';
 assert.equal(f.b.p.action,interrupted?null:a);if(interrupted)close(f.b.p.recoveryLock,debt);
 tick(f,{move:east,attack:true},.02);assert.equal(starts(f.b.events).length,0);
 if(status==='stun')close(f.b.p.x,x);else close(f.b.p.x-x,f.b.stats.moveSpeed*.02);
});

test('slow uses existing multiplier during recovery without changing attack timing',()=>{
 const f=fixture();start(f);elapsed(f,.2);const before=f.b.p.action.elapsed,x=f.b.p.x;applyHeroStatus(f.b,'r11_slow','fixture');tick(f,{move:east},.05);
 close(f.b.p.x-x,f.b.stats.moveSpeed*.05*HERO_STATUS_RULES.r11_slow.moveMultiplier);close(f.b.p.action.elapsed-before,.05);
});

test('fatal real projectile clears recovery and later frames cannot move, hit or attack',()=>{
 const f=fixture();start(f);elapsed(f,.2);f.b.p.hp=1;f.b.shots.push({kind:'arrow',enemy:true,x:f.b.p.x+1,y:f.b.p.y,vx:-100,vy:0,damage:1000,life:1});
 const events=tick(f);assert.equal(events.filter(e=>e.type==='heroDead').length,1);assert.equal(f.b.p.action,null);assert.equal(f.b.dead,true);const origin=pos(f);
 const after=run(f,.5,{attack:true,move:east,hammer:true});assert.deepEqual(pos(f),origin);assert.equal(starts(after).length,0);assert.equal(hits(after).length,0);
});

for(const pulse of ['hammer','charge'])test(`moving late recovery queues ${pulse} once ahead of held attack`,()=>{
 const f=fixture();start(f);elapsed(f,.36);const a=f.b.p.action,mana=f.b.p.mana,stamina=f.b.p.stamina,x=f.b.p.x;
 tick(f,{attack:true,[pulse]:true,move:east,aim:aim(f)},0);assert.equal(f.b.p.action,a);assert.equal(f.b.skillIntent.remaining,.18);assert.equal(f.b.p.mana,mana);assert.equal(f.b.p.stamina,stamina);
 const events=run(f,.16,()=>({attack:true,move:east,aim:aim(f)}));const id=pulse==='hammer'?'righteous_hammer':'shield_charge';
 assert.equal(f.b.p.action?.id,id);assert.equal(starts(events).length,1);assert.equal(starts(events)[0].id,id);assert.equal(f.b.skillIntent,null);close(a.elapsed,a.duration);close(f.b.p.action.elapsed,0);assert.ok(f.b.p.x>x);
 close(f.b.p.mana,mana-f.b.p.action.spec.manaCost);close(f.b.p.stamina,stamina-f.b.p.action.spec.staminaCost);
});

for(const [name,change,reason]of [
 ['opposite movement',f=>({move:{x:-1,y:0}}),'movement-reversed'],
 ['90-degree aim',f=>({aim:{x:f.b.p.x,y:f.b.p.y+100}}),'aim-reversed'],
 ['guard',f=>({block:true}),'guard']
])test(`moving recovery preserves ${name} queued-intent cancellation`,()=>{
 const f=fixture();start(f);elapsed(f,.36);tick(f,{hammer:true,move:east,aim:aim(f)},0);const a=f.b.p.action;
 const events=tick(f,change(f));assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,a);assert.equal(events.find(e=>e.type==='skillIntentCancelled')?.reason,reason);
 assert.equal(starts(run(f,.3)).length,0);assert.equal(f.b.p.mana,40);
});

test('guard cannot cancel the attack or activate early during recovery walking',()=>{
 const f=fixture();start(f);elapsed(f,.2);const a=f.b.p.action,x=f.b.p.x;tick(f,{block:true,move:east},.02);
 assert.equal(f.b.p.action,a);assert.equal(f.b.p.block,false);close(f.b.p.x-x,f.b.stats.moveSpeed*.02);
 elapsed(f,.5);tick(f,{block:true},.02);assert.equal(f.b.p.action,null);assert.equal(f.b.p.block,false);tick(f,{block:true},0);assert.equal(f.b.p.block,true);
});

test('latest explicit skill keeps single-slot replacement while walking',()=>{
 const f=fixture();start(f);elapsed(f,.36);tick(f,{hammer:true,move:east},0);tick(f,{charge:true,chargeAngle:Math.PI/2,move:east},0);
 assert.equal(f.b.skillIntent.id,'shield_charge');const events=run(f,.16,{attack:true,move:east});assert.equal(starts(events).length,1);assert.equal(f.b.p.action.id,'shield_charge');assert.equal(f.b.p.action.angle,Math.PI/2);assert.equal(f.b.p.mana,40);
});

test('hitstop expiry still drops the .18-second buffer while recovery can move',()=>{
 const f=fixture();start(f);elapsed(f,.36);tick(f,{hammer:true,move:east},0);f.b.hitstop=2;const x=f.b.p.x;
 const events=run(f,.18,{attack:true,move:east});assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action.id,'mace_swing');assert.ok(f.b.p.x>x);assert.equal(starts(events).length,0);
});

for(const pulse of ['charge','hammer'])test(`${pulse} windup/recovery never gains free walking`,()=>{
 const a=fixture(),b=fixture(),input={chargeAngle:0};tick(a,{[pulse]:true,aim:aim(a),...input},0);tick(b,{[pulse]:true,aim:aim(b),...input},0);
 for(let n=0;n<10&&a.b.p.action;n++){const remaining=a.b.p.action.duration-a.b.p.action.elapsed,dt=Math.min(.05,remaining);tick(a,{move:{x:0,y:1}},dt);tick(b,{},dt);assert.deepEqual(pos(a),pos(b));assert.equal(a.b.p.action?.elapsed,b.b.p.action?.elapsed);}
});

test('Onslaught remains locked to its own channel motion and payment/pulse contract',()=>{
 const a=expertFixture({zealous_onslaught:1}),b=expertFixture({zealous_onslaught:1}),channel={held:true,ownerToken:'fixture'};const logs=[[],[]];
 for(const [i,f]of [a,b].entries())logs[i].push(...tick(f,{expert1:'zealous_onslaught',channel,aim:aim(f)},0));
 for(let n=0;n<60;n++)for(const [i,f]of [a,b].entries())logs[i].push(...tick(f,{channel,...(i===0?{move:{x:0,y:1}}:{})},.02));
 assert.deepEqual(pos(a),pos(b));assert.deepEqual(logs[0],logs[1]);assert.deepEqual(battleReport(a.b).recovery,battleReport(b.b).recovery);assert.equal(a.b.p.stamina,b.b.p.stamina);
});

test('real held keyboard router can walk after contact without a second attack press',()=>{
 const f=fixture(),router=createInputRouter(),controls=controlsFor(f.s),origin=pos(f);router.down('KeyJ',controls);router.down('KeyD',controls);
 const events=[];for(let n=0;n<20;n++)events.push(...tick(f,router.snapshot(controls),.02));
 assert.ok(f.b.p.x>origin.x);assert.equal(starts(events).length,1);assert.equal(f.b.p.action.fired,true);router.up('KeyJ');router.up('KeyD');const x=f.b.p.x;tick(f,router.snapshot(controls));close(f.b.p.x,x);
});

test('recovery movement is measured while its existing action pose and gait phase remain intact',()=>{
 const f=fixture();start(f);elapsed(f,.2);const phase=f.b.p.walkPhase,a=f.b.p.action,pose=resolveActorMotion(f.b.p,0,true).action;
 const events=tick(f,{move:east},.05);assert.ok(f.b.p.x>300);assert.equal(f.b.p.action,a);assert.equal(f.b.p.moving,true);close(f.b.p.walk,.05*f.b.stats.moveSpeed/(158/10));assert.equal(f.b.p.walkPhase,phase);assert.equal(resolveActorMotion(f.b.p,0,true).action,pose);assert.equal(events.some(e=>e.type==='sound'&&e.name==='footstep'),false);
});

test('checkpoint/store/reload retains moving attack recovery debt and cannot replay its paid contact',()=>{
 const f=fixture();start(f);elapsed(f,.2);tick(f,{move:east},.05);const a=f.b.p.action,report=battleReport(f.b);close(report.recovery.lock,a.duration-a.elapsed);
 const r=reduceRuntime(f.s,{type:'checkpoint',...report});assert.equal(r.ok,true,r.reason);
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},{profile:'qa-attack-recovery'});assert.equal(store.save(r.state,{expectedRevision:0}).ok,true);
 const s=store.load().state,resumed={s,b:createBattle(s)};assert.equal(resumed.b.p.action,null);assert.equal(resumed.b.skillIntent,null);close(resumed.b.p.recoveryLock,report.recovery.lock);assert.deepEqual(pos(resumed),report.position);
 const events=tick(resumed,{attack:true,move:{x:0,y:1}},.02);assert.equal(starts(events).length,0);assert.equal(hits(events).length,0);close(resumed.b.p.recoveryLock,report.recovery.lock-.02);
});

for(const reason of ['menu','blur','hidden'])test(`${reason} safety cancellation preserves mace object and debt, clears queued intent`,()=>{
 const f=fixture();start(f);elapsed(f,.36);tick(f,{hammer:true,move:east},0);const a=f.b.p.action,debt=battleReport(f.b).recovery.lock;
 assert.deepEqual(cancelBattleAction(f.b,reason),[{type:'soundCancel',tag:`cast:${a.castId}`}]);assert.equal(f.b.p.action,a);assert.equal(f.b.skillIntent,null);close(battleReport(f.b).recovery.lock,debt);assert.equal(starts(run(f,.18)).length,0);
});

test('an early explicit skill still rejects without moving or cancelling mace preparation',()=>{
 const f=fixture();start(f);elapsed(f,.08);const a=f.b.p.action,origin=pos(f);
 const events=tick(f,{attack:true,hammer:true,move:east},.02);assert.equal(f.b.p.action,a);assert.equal(a.fired,false);assert.deepEqual(pos(f),origin);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.mana,40);assert.equal(events.find(e=>e.type==='skillIntentRejected')?.reason,'recovery-too-early');
});

test('late unavailable skill does not cancel recovery or gain free payment while walking',()=>{
 const f=fixture();start(f);elapsed(f,.36);const a=f.b.p.action,x=f.b.p.x;f.b.p.mana=0;f.b.p.manaDelay=2;
 const events=tick(f,{attack:true,hammer:true,move:east},.02);assert.equal(f.b.p.action,a);assert.equal(f.b.skillIntent,null);close(f.b.p.x-x,f.b.stats.moveSpeed*.02);assert.equal(f.b.p.mana,0);assert.equal(events.find(e=>e.type==='skillIntentRejected')?.blockedReason,'mana');
});

test('89-degree queued aim remains valid while walking, unlike the inclusive 90-degree boundary',()=>{
 const f=fixture();start(f);elapsed(f,.36);tick(f,{hammer:true,move:east,aim:aim(f)},0);const theta=89*Math.PI/180;
 tick(f,{move:east,aim:{x:f.b.p.x+Math.cos(theta)*200,y:f.b.p.y+Math.sin(theta)*200}},.02);assert.equal(f.b.skillIntent?.id,'righteous_hammer');
 const events=run(f,.14,{attack:true,move:east});assert.equal(starts(events)[0]?.id,'righteous_hammer');assert.equal(f.b.p.action.angle,0);
});

test('ordinary block movement resumes its existing speed only after mace completion',()=>{
 const f=fixture();start(f);elapsed(f,.5);tick(f,{},.02);assert.equal(f.b.p.action,null);const x=f.b.p.x;
 tick(f,{block:true,move:east},.02);assert.equal(f.b.p.block,true);close(f.b.p.x-x,f.b.stats.moveSpeed*f.b.stats.actions.shield_block.moveMultiplier*.02);assert.equal(f.b.p.moving,true);
});

test('banner-quoted faster mace still keeps full quoted duration and planted contact',()=>{
 const f=expertFixture({battle_banner:1});tick(f,{expert1:'battle_banner',aim:aim(f)},0);
 for(let n=0;n<60&&f.b.p.action;n++)tick(f,{},.02);assert.ok(f.b.banner);start(f);const a=f.b.p.action,origin=pos(f),spec=a.spec;
 assert.ok(a.duration<f.b.stats.actions.mace_swing.duration);elapsed(f,a.contact,{move:east});assert.deepEqual(pos(f),origin);assert.equal(a.fired,true);
 tick(f,{attack:true,move:east},.02);assert.equal(f.b.p.action,a);assert.equal(a.spec,spec);assert.ok(f.b.p.x>origin.x);close(battleReport(f.b).recovery.lock,a.duration-a.elapsed);
});

for(const dt of [1/60,.02,.05])for(const move of [east,{x:3,y:4}])test(`recovery records actual locomotion distance and moving without changing gait, dt=${dt}, move=${JSON.stringify(move)}`,()=>{
 const f=fixture();start(f);elapsed(f,.2);const origin=pos(f),walk=f.b.p.walk??0,gait=f.b.p.walkPhase,a=f.b.p.action,elapsedBefore=a.elapsed;
 tick(f,{move},dt);const travelled=Math.hypot(f.b.p.x-origin.x,f.b.p.y-origin.y);
 assert.ok(travelled>0);assert.equal(f.b.p.moving,true);close((f.b.p.walk-walk)*(158/10),travelled);close(a.elapsed-elapsedBefore,dt);assert.equal(f.b.p.action,a);assert.equal(f.b.p.walkPhase,gait);assert.equal(resolveActorMotion(f.b.p,0,true).action,'attack1');close(battleReport(f.b).recovery.lock,a.duration-a.elapsed);
});

test('recovery movement flag resets on no input and zero dt without inventing distance',()=>{
 const f=fixture();start(f);elapsed(f,.2);tick(f,{move:east},.02);assert.equal(f.b.p.moving,true);const position=pos(f),walk=f.b.p.walk;
 tick(f,{},.02);assert.equal(f.b.p.moving,false);assert.deepEqual(pos(f),position);close(f.b.p.walk,walk);
 tick(f,{move:east},0);assert.equal(f.b.p.moving,false);assert.deepEqual(pos(f),position);close(f.b.p.walk,walk);
});

test('fully blocked recovery reports false and zero distance; diagonal slide measures only actual travel',()=>{
 const f=fixture();f.b.map=mapFromRegion({w:10,h:10,rooms:[{x:1,y:1,w:4,h:8},{x:6,y:1,w:3,h:8}]});f.b.p.x=142;f.b.p.y=144;start(f);elapsed(f,.2);
 tick(f,{move:east},.05);const wall=pos(f),walk=f.b.p.walk;
 tick(f,{move:east},.05);assert.deepEqual(pos(f),wall);assert.equal(f.b.p.moving,false);close(f.b.p.walk,walk);
 tick(f,{move:{x:1,y:1}},.05);const travel=Math.hypot(f.b.p.x-wall.x,f.b.p.y-wall.y);assert.equal(f.b.p.moving,true);assert.ok(travel>0&&travel<f.b.stats.moveSpeed*.05);close((f.b.p.walk-walk)*(158/10),travel);
});

test('stun after measured recovery movement resets moving and preserves distance, gait and saved debt',()=>{
 const f=fixture();start(f);elapsed(f,.2);tick(f,{move:east},.02);const before=battleReport(f.b),walk=f.b.p.walk,gait=f.b.p.walkPhase;
 applyHeroStatus(f.b,'r11_stun','fixture');tick(f,{move:east,attack:true},.02);assert.equal(f.b.p.moving,false);assert.deepEqual(pos(f),before.position);close(f.b.p.walk,walk);assert.equal(f.b.p.walkPhase,gait);close(battleReport(f.b).recovery.lock,before.recovery.lock-.02);
});

test('recovery-to-held-windup split retains earlier walking for the complete outer frame',()=>{
 const f=fixture();start(f);elapsed(f,.5);const x=f.b.p.x,walk=f.b.p.walk??0,gait=f.b.p.walkPhase,old=f.b.p.action;
 const events=tick(f,{attack:true,move:east},.05);assert.equal(starts(events).length,1);assert.notEqual(f.b.p.action,old);assert.equal(f.b.p.action.fired,false);close(f.b.p.action.elapsed,.03);close(old.elapsed,old.duration);
 close(f.b.p.x-x,f.b.stats.moveSpeed*.02);close((f.b.p.walk-walk)*(158/10),f.b.p.x-x);assert.equal(f.b.p.moving,true);assert.equal(f.b.p.walkPhase,gait);assert.equal(resolveActorMotion(f.b.p,0,true).action,'attack2');
 const after=f.b.p.walk;tick(f,{attack:true,move:east},.02);assert.equal(f.b.p.moving,false);close(f.b.p.walk,after);
});

test('queued hammer after recovery does not erase earlier walking or add distance from its windup',()=>{
 const f=fixture();start(f);elapsed(f,.5);tick(f,{hammer:true,move:east},0);const x=f.b.p.x,walk=f.b.p.walk??0;
 tick(f,{attack:true,move:east},.05);assert.equal(f.b.p.action.id,'righteous_hammer');close(f.b.p.action.elapsed,.03);assert.equal(f.b.p.moving,true);close(f.b.p.x-x,f.b.stats.moveSpeed*.02);close((f.b.p.walk-walk)*(158/10),f.b.p.x-x);
 const position=pos(f),after=f.b.p.walk;tick(f,{move:east},.02);assert.equal(f.b.p.moving,false);assert.deepEqual(pos(f),position);close(f.b.p.walk,after);
});

test('fatal damage after measured recovery cannot leave moving true or accrue later distance',()=>{
 const f=fixture();start(f);elapsed(f,.2);f.b.p.hp=1;f.b.shots.push({kind:'arrow',enemy:true,x:f.b.p.x+1,y:f.b.p.y,vx:-100,vy:0,damage:1000,life:1});
 tick(f,{move:east},.02);assert.equal(f.b.dead,true);assert.equal(f.b.p.moving,false);const position=pos(f),walk=f.b.p.walk;
 tick(f,{move:east,attack:true},.02);assert.equal(f.b.p.moving,false);assert.deepEqual(pos(f),position);close(f.b.p.walk,walk);
});
