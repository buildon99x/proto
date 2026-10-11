import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {poeControlPreset,enableSkillLoadout,createInputRouter} from '../src/controls.js';
import {createBattle,stepBattle,acceptBattleInput,clearBattleIntent,clearPoeInput,configurePoeControls} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';

// Production combat/router handlers with an empty arena or stationary targets.
// Injected hitstop/locks exercise finite-clock boundaries, not browser latency.
const WINDOW=.18,MIN_RATE=.35,MAX_WALL=WINDOW/MIN_RATE;
const near=(a,b,message='')=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} != ${b}`);
function fixture({version=5,tracking=true}={}){
 let result=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}});assert.equal(result.ok,true);let s=result.state;
 let controls=poeControlPreset(s.options.controls);controls.poe.cursorTrackingAfterRelease=tracking;
 if(version===5)controls=enableSkillLoadout(controls,{skills:s.character.skills,actionSlots:s.actionSlots});
 result=reduceRuntime(s,{type:'setControls',controls});assert.equal(result.ok,true);s=result.state;
 const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=b.p.y=600;b.enemies=[];return {s,b};
}
const input=(f,extra={})=>({aim:{x:f.b.p.x+400,y:f.b.p.y},...extra});
const begin=(f,extra={})=>acceptBattleInput(f.b,input(f,extra));
const tick=(f,dt,extra={})=>stepBattle(f.b,f.s.character,dt,input(f,extra));
function run(f,duration,extra={},hz=60){const events=[];for(let t=0;t<duration-1e-10;){const dt=Math.min(1/hz,duration-t);events.push(...tick(f,dt,typeof extra==='function'?extra(f):extra));t+=dt;}return events;}
const starts=(events,id)=>events.filter(e=>e.type==='actionStarted'&&e.id===id);
function target(f,x,id='target'){const e={id,kind:'scout',type:'guardian',x,y:600,hp:100,max:100,active:true,state:'idle',timer:0,stun:10,angle:Math.PI};f.b.enemies.push(e);return e;}
function queuedHammer(f){begin(f,{attack:true,attackPressed:true,attackHeld:false});run(f,f.b.p.action.duration-WINDOW);begin(f,{hammer:true});assert.equal(f.b.skillIntent?.id,'righteous_hammer');near(f.b.skillIntent.remaining,WINDOW);return f.b.p.action;}

for(const version of [4,5])for(const hz of [30,60,120])for(const withTarget of [false,true])test(`controls${version} ${hz}Hz accepted hammer-to-mace tap survives ${withTarget?'actual projectile hitstop':'empty-space recovery'} once`,()=>{
 const f=fixture({version});if(withTarget)target(f,700);
 begin(f,{hammer:true});const original=f.b.p.action,spec=structuredClone(original.spec),mana=f.b.p.mana,manaDelay=f.b.p.manaDelay;run(f,.34,{},hz);
 begin(f,{attack:true,attackPressed:true,attackHeld:false});assert.equal(f.b.skillIntent?.id,'mace_swing');near(f.b.skillIntent.remaining,WINDOW);
 const events=run(f,.3,{},hz);assert.equal(starts(events,'mace_swing').length,1);assert.equal(events.some(e=>e.type==='skillIntentCancelled'),false);
 assert.equal(events.some(e=>e.type==='enemyHit'),withTarget);assert.equal(f.b.skillIntent,null);assert.equal(original.fired,true);near(original.elapsed,original.duration);assert.deepEqual(original.spec,spec);near(f.b.p.mana,mana+Math.max(0,original.duration+f.b.p.action.elapsed-manaDelay)*f.b.stats.manaRegen);
 near(f.b.p.cooldowns.righteous_hammer,original.spec.cooldown-original.duration-f.b.p.action.elapsed);
 assert.equal(starts(run(f,1,{},hz),'mace_swing').length,0);
});

for(const hz of [30,60,120])test(`${hz}Hz consecutive real projectile contacts cannot consume an accepted tap before recovery`,()=>{
 const f=fixture();target(f,700,'near');target(f,730,'far');begin(f,{hammer:true});run(f,.34,{},hz);begin(f,{attack:true,attackPressed:true,attackHeld:false});
 const events=run(f,.4,{},hz);assert.equal(events.filter(e=>e.type==='enemyHit'&&e.context.originSkillId==='righteous_hammer').length,2);assert.equal(starts(events,'mace_swing').length,1);assert.equal(events.some(e=>e.type==='skillIntentCancelled'),false);assert.equal(f.b.skillIntent,null);
});

for(const hz of [30,60,120])for(const kind of ['action','lock'])test(`${hz}Hz exact .18 ${kind} recovery and persistent hitstop share the same finite deadline`,()=>{
 const f=fixture();let original=null;
 if(kind==='action')original=queuedHammer(f);else{f.b.p.recoveryLock=WINDOW;begin(f,{hammer:true});assert.equal(f.b.skillIntent?.id,'righteous_hammer');}
 const before=f.b.time,mana=f.b.p.mana;f.b.hitstop=2;
 const events=run(f,MAX_WALL,{},hz);assert.equal(starts(events,'righteous_hammer').length,1);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action.id,'righteous_hammer');near(f.b.p.action.elapsed,0);near(f.b.time-before,MAX_WALL);
 near(f.b.p.mana,mana-f.b.p.action.spec.manaCost);near(f.b.p.cooldowns.righteous_hammer,f.b.p.action.spec.cooldown);if(original)near(original.elapsed,original.duration);
 assert.equal(starts(run(f,.8,{},hz),'righteous_hammer').length,0);
});

for(const hz of [30,60,120])test(`${hz}Hz continually refreshed hitstop cannot keep an ineligible intent beyond .18/.35 active seconds`,()=>{
 const f=fixture();queuedHammer(f);f.b.p.recoveryLock=2;const mana=f.b.p.mana,before=f.b.time;
 const refresh=()=>{f.b.hitstop=2;return {};};run(f,MAX_WALL-.001,refresh,hz);assert.ok(f.b.skillIntent);assert.ok(f.b.skillIntent.remaining<.001);
 const events=run(f,.001,refresh,hz);near(f.b.time-before,MAX_WALL);assert.equal(f.b.skillIntent,null);assert.equal(events.filter(e=>e.type==='skillIntentCancelled'&&e.reason==='expired').length,1);
 f.b.hitstop=0;f.b.p.recoveryLock=0;assert.equal(starts(run(f,2,{},hz),'righteous_hammer').length,0);near(f.b.p.mana,mana);
});

for(const remaining of [.179,.18,.181])test(`PoE hitstop leaves the existing ${remaining}s acceptance boundary unchanged`,()=>{
 const f=fixture();f.b.p.recoveryLock=remaining;f.b.hitstop=2;const events=begin(f,{hammer:true});assert.equal(!!f.b.skillIntent,remaining<=WINDOW);
 assert.equal(events.some(e=>e.type==='skillIntentRejected'&&e.reason==='recovery-too-early'),remaining>WINDOW);
});

test('partial-hitstop split preserves total recovery, resources, cooldown and event delivery',()=>{
 const queued=fixture(),plain=fixture();queuedHammer(queued);queuedHammer(plain);clearBattleIntent(plain.b);
 for(const f of [queued,plain]){f.b.p.recoveryLock=.8;f.b.hitstop=.023;f.b.p.mana=10;f.b.p.stamina=10;f.b.p.manaDelay=f.b.p.staminaDelay=0;}
 const events=tick(queued,.05),ordinary=tick(plain,.05);near(queued.b.skillIntent.remaining,WINDOW-(.023*MIN_RATE+.027));
 for(const key of ['mana','stamina','recoveryLock','manaDelay','staminaDelay'])near(queued.b.p[key],plain.b.p[key],key);
 near(queued.b.p.action.elapsed,plain.b.p.action.elapsed);near(queued.b.time,plain.b.time);near(queued.b.hitstop,plain.b.hitstop);assert.deepEqual(events,ordinary);
});

test('frame crossing scaled expiry splits once without losing elapsed time or retrying the old cast',()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;f.b.p.recoveryLock=2;run(f,.5);near(f.b.skillIntent.remaining,.005);const before=f.b.time;
 const events=tick(f,.05);near(f.b.time-before,.05);assert.equal(f.b.skillIntent,null);assert.equal(events.filter(e=>e.type==='skillIntentCancelled'&&e.reason==='expired').length,1);assert.equal(starts(events,'righteous_hammer').length,0);
});

for(const reason of ['menu','blur','region-change','rebind'])test(`${reason} clears an extended PoE intent and stale held keys cannot revive it`,()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;run(f,.2);assert.ok(f.b.skillIntent);const original=f.b.p.action;
 clearPoeInput(f.b,reason);clearPoeInput(f.b,reason);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,original);
 const events=run(f,1,{attack:true,attackHeld:true,heldActions:{hammer:true}});assert.equal(starts(events,'righteous_hammer').length,0);assert.equal(starts(events,'mace_swing').length,0);
});

test('guard, newer unavailable request, and allowed dodge each cancel an extended intent permanently',()=>{
 for(const reason of ['guard','new-unavailable','dodge']){const f=fixture();queuedHammer(f);f.b.hitstop=2;run(f,.2);assert.ok(f.b.skillIntent);
  if(reason==='guard')begin(f,{block:true});else if(reason==='new-unavailable'){f.b.p.cooldowns.shield_charge=3;begin(f,{charge:true});}else assert.ok(begin(f,{dodgeOnly:true}).some(e=>e.type==='roll-start'));
  assert.equal(f.b.skillIntent,null);assert.equal(starts(run(f,4),'righteous_hammer').length,0);
 }
});

test('a newer accepted skill replaces the extended one and pays exactly once',()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;run(f,.2);const stamina=f.b.p.stamina;begin(f,{charge:true});assert.equal(f.b.skillIntent.id,'shield_charge');near(f.b.skillIntent.remaining,WINDOW);
 const events=run(f,.4);assert.equal(starts(events,'righteous_hammer').length,0);assert.equal(starts(events,'shield_charge').length,1);near(f.b.p.stamina,stamina-f.b.stats.actions.shield_charge.staminaCost);
});

for(const unavailable of ['mana','cooldown'])test(`extended queued execution rechecks ${unavailable} and never rearms later`,()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;if(unavailable==='mana'){f.b.p.mana=0;f.b.p.manaDelay=2;}else f.b.p.cooldowns.righteous_hammer=3;
 assert.equal(starts(run(f,.6),'righteous_hammer').length,0);assert.equal(f.b.skillIntent,null);f.b.p.mana=40;f.b.p.cooldowns.righteous_hammer=0;
 assert.equal(starts(run(f,3),'righteous_hammer').length,0);
});

test('real fatal projectile clears extended intent; retry state cannot replay it',()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;run(f,.2);f.b.p.hp=1;f.b.shots.push({kind:'arrow',enemy:true,x:f.b.p.x,y:f.b.p.y,vx:0,vy:0,damage:1000,life:1});
 const events=tick(f,.01);assert.equal(events.filter(e=>e.type==='heroDead').length,1);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,null);assert.equal(starts(run(f,1),'righteous_hammer').length,0);assert.equal(createBattle(f.s).skillIntent,null);
});

test('switching controls cancels extended intent without converting its time base or reviving it',()=>{
 const f=fixture();queuedHammer(f);f.b.hitstop=2;run(f,.2);const original=f.b.p.action;configurePoeControls(f.b,poeControlPreset(f.s.options.controls).priorControls);
 assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,original);assert.equal(starts(run(f,2),'righteous_hammer').length,0);
});

test('held skill and OS repeats do not refresh the accepted timer; releasing prevents further casts',()=>{
 const f=fixture({version:4}),router=createInputRouter({captureAttackTap:true}),controls=f.s.options.controls;
 begin(f,{attack:true,attackPressed:true,attackHeld:false});run(f,f.b.p.action.duration-WINDOW);router.down('Mouse2',controls);begin(f,router.snapshot(controls));f.b.hitstop=2;
 for(let n=0;n<10;n++){assert.equal(router.down('Mouse2',controls,{repeat:true}),null);tick(f,.02,router.snapshot(controls));}
 near(f.b.skillIntent.remaining,WINDOW-.2*MIN_RATE);router.up('Mouse2');begin(f,router.snapshot(controls));const events=run(f,4,()=>router.snapshot(controls));assert.equal(starts(events,'righteous_hammer').length,1);assert.equal(f.b.skillIntent,null);
});

test('extended latest-aim queue retains priority over held basic attack and opposite movement',()=>{
 const f=fixture({tracking:false});queuedHammer(f);f.b.hitstop=2;run(f,.2);const events=run(f,.4,{attack:true,attackHeld:true,move:{x:-1,y:0},aim:{x:600,y:1000}});
 assert.equal(starts(events,'righteous_hammer').length,1);assert.equal(starts(events,'mace_swing').length,0);assert.ok(f.b.p.action.angle>1);assert.equal(f.b.skillIntent,null);
});
