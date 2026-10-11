import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBattle,stepBattle} from '../src/combat.js';
import {battleReport,validateRecovery} from '../src/recovery.js';
import {deriveStats} from '../src/warrior-growth.js';
import {reduceCampaign} from '../src/campaign.js';
import {validateState,reduceRuntime} from '../src/state.js';
import {inMap,traceSegment} from '../src/world.js';
import {combatCheckpoint} from '../src/combat-persistence.js';
import {createController} from '../src/controller.js';
import {syncCommittedBattle} from '../src/runtime-sync.js';
const envelope=JSON.parse(fs.readFileSync(new URL('./fixtures/qa/qa-r12a2-replay-l9-r1025-pre-rejection.ewqa.json',import.meta.url),'utf8'));
const saved=JSON.parse(envelope.payload),origin={...saved.world.position};
// Fixture-only inputs. The export supplies a real validated state, stats and
// map. Enemy positions below are synthetic edge cases, not a captured live actor.
function fixture({position=origin,target={x:598,y:299},dt=.02}={}){
 const state=structuredClone(saved);state.world.position={...position};
 state.recovery.lock=0;state.recovery.cooldowns.shield_charge=0;
 const b=createBattle(state);b.enemies[0].x=target.x;b.enemies[0].y=target.y;
 assert.equal(validateState(state).ok,true);assert.equal(inMap(b.map,target.x,target.y),true);
 return {state,b,dt,step:stepBattle,aim:{...target}};
}
function gates(state,b){const r=battleReport(b),stats=deriveStats(state.character,state).stats;return {life:r.life===state.world.life,position:inMap(b.map,r.position.x,r.position.y),recovery:validateRecovery(r.recovery,{character:state.character}),vitals:['hp','mana','stamina'].every(k=>Number.isFinite(r.vitals[k])&&r.vitals[k]>=0&&r.vitals[k]<=stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]]),alive:r.vitals.hp>0};}
function run(f,seconds,inputAt=(n)=>n===0?{charge:true,aim:f.aim}: {}){const trace=[];for(let n=0;n<Math.ceil(seconds/f.dt);n++){const old={x:f.b.p.x,y:f.b.p.y},events=f.step(f.b,f.state.character,f.dt,inputAt(n));trace.push({n,old,position:{x:f.b.p.x,y:f.b.p.y},events,gates:gates(f.state,f.b)});}return trace;}
function summary(result){return result.ok?{ok:true,events:result.events}:{ok:false,code:result.code,reason:result.reason};}

test('real rev1025 export validates without changes and its entire saved report checkpoints',()=>{
 assert.equal(envelope.sourceRevision,1025);assert.deepEqual(validateState(saved),{ok:true});
 const b=createBattle(saved);assert.deepEqual(gates(saved,b),{life:true,position:true,recovery:true,vitals:true,alive:true});
 assert.equal(reduceRuntime(saved,{type:'checkpoint',...battleReport(b)}).ok,true);
});

test('isolated patch keeps same corner charge alive report valid on every frame',()=>{
 const f=fixture();const trace=run(f,.5);
 for(const row of trace)assert.equal(row.gates.position,true,JSON.stringify(row));
 assert.equal(reduceRuntime(f.state,{type:'checkpoint',...battleReport(f.b)}).ok,true);
 assert.ok(f.b.p.x<597);assert.ok(f.b.p.action===null);
});

test('wall-edge aimed contact stays legal across corner targets and 8/16.7/20/33.3/50ms frames',()=>{
 let cases=0,hits=0;
 for(const dt of [.008,1/60,.02,1/30,.05])for(const x of [598,600,608,610,620,632,650])for(const y of [299,300,304,312,328]){
  const f=fixture({target:{x,y},dt}),tr=run(f,.55);cases++;
  for(const row of tr){assert.equal(row.gates.position,true,`dt=${dt} target=${x},${y} frame=${row.n}`);assert.ok(Math.hypot(row.position.x-row.old.x,row.position.y-row.old.y)<=f.b.stats.actions.shield_charge.speed*dt+1e-8);}
  const h=tr.flatMap(t=>t.events).filter(e=>e.type==='enemyHit');assert.ok(h.length<=1);hits+=h.length;
  assert.equal(reduceRuntime(f.state,{type:'checkpoint',...battleReport(f.b)}).ok,true);
 }
 assert.equal(cases,175);assert.ok(hits>0);
});

async function persistedFlow(){
 const f=fixture(),initial=structuredClone(f.state);let durable=structuredClone(initial),revision=envelope.sourceRevision,writes=0;
 const store={load:async()=>({ok:true,state:structuredClone(durable),revision}),save:async(next,{expectedRevision})=>{assert.equal(expectedRevision,revision);durable=structuredClone(next);writes++;return {ok:true,revision:++revision};}};
 const controller=createController(store);assert.equal((await controller.load()).ok,true);
 let elapsed=0,failed=null;const savedCommands=[];
 for(let n=0;n<90;n++){
  const input=n===0?{charge:true,aim:f.aim}:n>=23?{attack:true,aim:f.aim}:{};
  const events=f.step(f.b,f.state.character,.02,input);elapsed+=.02;
  const command=combatCheckpoint(f.b,events,{elapsed});if(!command)continue;
  command.expectedStoreRevision=controller.revision();const result=await controller.dispatch(command);
  savedCommands.push({n,type:command.type,position:command.position,ok:result.ok,code:result.code});
  if(!result.ok){failed=result;break;}
  f.state=result.state;f.b.equipmentContext=f.state;syncCommittedBattle(f.b,f.state);elapsed=0;
 }
 return {f,initial,durable,revision,writes,failed,savedCommands,store,controller};
}

test('patched charge→held mace checkpoints persist and reload without resource refill or double reward',async()=>{
 const r=await persistedFlow();assert.equal(r.failed,null);assert.ok(r.writes>1);
 assert.equal(validateState(r.durable).ok,true);
 const reloaded=createController(r.store);assert.equal((await reloaded.load()).ok,true);assert.deepEqual(reloaded.snapshot(),r.durable);
 const b=createBattle(reloaded.snapshot());assert.deepEqual(battleReport(b).vitals,r.durable.vitals);assert.deepEqual(battleReport(b).recovery,r.durable.recovery);
 const checkpoint={type:'checkpoint',...battleReport(b),expectedStoreRevision:reloaded.revision()};assert.equal((await reloaded.dispatch(checkpoint)).ok,true);
 assert.deepEqual(reloaded.snapshot().stats,r.durable.stats);assert.equal(reloaded.snapshot().gold,r.durable.gold);assert.equal(reloaded.snapshot().character.xp,r.durable.character.xp);
});

test('validation stays strict: invalid wall position, life, recovery and over-max pools are still rejected',()=>{
 const f=fixture();const good={type:'checkpoint',...battleReport(f.b)};
 for(const mutate of [c=>c.position={x:610,y:220},c=>c.life++,c=>c.recovery.lock=-1,c=>c.vitals.mana=1e9,c=>c.vitals.hp=0]){const bad=structuredClone(good);mutate(bad);assert.equal(reduceCampaign(f.state,bad).ok,false);}
 assert.equal(reduceCampaign(f.state,good).ok,true);
});


test('corner contact charges stamina once, retains cooldown, one hit and unchanged damage/RNG',()=>{
 const f=fixture(),beforeDraws=f.b.combatDraws,beforeStamina=f.b.p.stamina;
 const events=stepBattle(f.b,f.state.character,.02,{charge:true,aim:f.aim});
 assert.equal(f.b.p.stamina,beforeStamina-12.5);
 assert.equal(f.b.p.cooldowns.shield_charge,3);
 const trace=run(f,.48,()=>({})),all=[...events,...trace.flatMap(t=>t.events)];
 const hits=all.filter(e=>e.type==='enemyHit');
 assert.equal(hits.length,1);assert.equal(hits[0].id,'pass-ranger-5');assert.equal(hits[0].damage,6.6);
 assert.equal(all.filter(e=>e.type==='actionStarted'&&e.id==='shield_charge').length,1);
 assert.equal(f.b.combatDraws,beforeDraws);assert.equal(f.b.p.hp,saved.vitals.hp);
 assert.ok(f.b.p.cooldowns.shield_charge>2.4&&f.b.p.cooldowns.shield_charge<3);
 assert.equal(reduceRuntime(f.state,{type:'checkpoint',...battleReport(f.b)}).ok,true);
});

test('open-ground contact keeps original distance-minus-radii stop, does not overtravel or duplicate damage',()=>{
 for(const target of [{x:530,y:320},{x:520,y:330},{x:540,y:310}]){
  const position={x:460,y:320},f=fixture({position,target}),trace=run(f,.5);
  const maxDistance=f.b.stats.actions.shield_charge.distance;
  const expectedDistance=Math.min(maxDistance,Math.hypot(target.x-position.x,target.y-position.y)-30);
  assert.ok(Math.abs(Math.hypot(f.b.p.x-position.x,f.b.p.y-position.y)-expectedDistance)<1e-8);
  assert.ok(expectedDistance<=maxDistance);assert.equal(trace.flatMap(t=>t.events).filter(e=>e.type==='enemyHit').length,1);
  assert.equal(reduceRuntime(f.state,{type:'checkpoint',...battleReport(f.b)}).ok,true);
 }
});

test('reload after paid charge-start persists debt and cannot replay the same contact or payment',()=>{
 const f=fixture();const events=stepBattle(f.b,f.state.character,.02,{charge:true,aim:f.aim});
 const command=combatCheckpoint(f.b,events);assert.equal(command.type,'checkpoint');
 const result=reduceRuntime(f.state,command);assert.equal(result.ok,true);
 const reloaded=createBattle(result.state);assert.deepEqual(battleReport(reloaded),battleReport(f.b));
 assert.equal(reloaded.p.action,null);assert.ok(reloaded.p.recoveryLock>0);assert.equal(reloaded.p.cooldowns.shield_charge,3);
 const beforeStamina=reloaded.p.stamina,beforeHp=reloaded.enemies[0].hp;
 const next=stepBattle(reloaded,result.state.character,.02,{charge:true,aim:f.aim});
 assert.equal(reloaded.p.stamina,beforeStamina);assert.equal(reloaded.enemies[0].hp,beforeHp);
 assert.equal(next.filter(e=>['actionStarted','enemyHit'].includes(e.type)).length,0);
 assert.equal(reduceRuntime(result.state,{type:'checkpoint',...battleReport(reloaded)}).ok,true);
});
