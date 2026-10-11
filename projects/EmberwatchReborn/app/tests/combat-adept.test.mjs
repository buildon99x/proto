import test from 'node:test';import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';import {grantExperience} from '../src/progression.js';
import {deriveStats,purchaseSkill} from '../src/warrior-growth.js';
import {createBattle,stepBattle,physicalDamage,clearBattleIntent} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';import {FOES} from '../src/world.js';
import {WARRIOR_REFERENCE} from '../src/reference-warrior.js';
import {battleReport} from '../src/recovery.js';
// Combat-boundary fixtures inject XP/tier and stationary targets. Real combat
// handlers are exercised, but these are NOT earned progression or screen QA.
function fixture(skills={}){
 const s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 s.character=grantExperience(s.character,20000).character;s.character.tier='adept';
 function learn(id,rank){const row=WARRIOR_REFERENCE.skills.find(x=>x.id===id);if(row.baseId&&!s.character.skills[row.baseId])learn(row.baseId,1);while((s.character.skills[id]??0)<rank){const r=purchaseSkill(s.character,id,s);assert.equal(r.ok,true,`${id}: ${r.reason}`);s.character=r.character;}}
 for(const [id,rank]of Object.entries(skills))learn(id,rank);
 const stats=deriveStats(s.character,s).stats;s.vitals={hp:stats.hpMax,mana:stats.manaMax,stamina:stats.staminaMax};
 const b=createBattle(s);b.map=mapFromRegion({w:30,h:30});b.p.x=300;b.p.y=300;b.awaitingAdvance=false;return {s,b};
}
function enemy(f,{x=390,y=300,id='target',hp=5000,kind='warden',inert=true}={}){const e={id,kind,x,y,hp,max:hp,angle:Math.PI,active:true,state:'idle',timer:0,stun:0,telegraph:null,...(inert?{gate:{objective:'fixture_inert',minimum:1}}:{})};f.b.enemies.push(e);return e;}
const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
function run(f,seconds,input={}){const events=[];for(let n=0;n<Math.ceil(seconds/.02);n++)events.push(...tick(f,input));return events;}
const aim=f=>({x:f.b.p.x+200,y:f.b.p.y});
function cast(f,pulse){return tick(f,{[pulse]:true,aim:aim(f)});}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('new explicit spells spend once on start, resolve once on contact, and keep distinct cooldowns',()=>{
 const f=fixture({lay_on_hands:1,judgement:1});f.b.p.hp=10;
 const before=f.b.p.mana,start=cast(f,'heal');assert.equal(start.filter(e=>e.type==='actionStarted').length,1);close(f.b.p.mana,before-30);assert.equal(f.b.p.hp,10);assert.equal(f.b.p.cooldowns.lay_on_hands,13);
 const events=run(f,1);assert.equal(events.filter(e=>e.type==='healApplied').length,1);close(f.b.p.hp,70);assert.equal(f.b.p.cooldowns.judgement,undefined);
 const again=cast(f,'heal');assert.equal(again.some(e=>e.type==='actionStarted'),false);
});
test('heal clamps at maximum, ignores offensive multipliers and never resurrects',()=>{
 const f=fixture({lay_on_hands:1,crushing_might:1});f.b.p.hp=f.b.stats.hpMax-5;cast(f,'heal');const events=run(f,.6);assert.equal(events.find(e=>e.type==='healApplied').amount,5);close(f.b.p.hp,f.b.stats.hpMax);
 f.b.dead=true;f.b.p.hp=0;assert.equal(cast(f,'heal').some(e=>e.type==='healApplied'||e.type==='actionStarted'),false);assert.equal(f.b.p.hp,0);
});
test('regen touch scales only existing regeneration, expires after four simulation seconds and snapshots remaining duration',()=>{
 const f=fixture({lay_on_hands:1,invigorating_touch:1});f.b.p.hp=10;cast(f,'heal');while(!f.b.p.regenBuff)tick(f);
 const remaining=4-(f.b.p.action.elapsed-f.b.p.action.contact);close(f.b.p.regenBuff.remaining,remaining);assert.deepEqual(battleReport(f.b).recovery.regenBuff,{remaining:f.b.p.regenBuff.remaining,multiplier:1.25});
 f.b.p.mana=0;f.b.p.stamina=0;f.b.p.manaDelay=0;f.b.p.staminaDelay=0;const health=f.b.p.hp;
 run(f,1);close(f.b.p.mana,f.b.stats.manaRegen*1.25);close(f.b.p.stamina,f.b.stats.staminaRegen*1.25);close(f.b.p.hp,health);close(f.b.p.regenBuff.remaining,remaining-1);
 const copied={...f.s,recovery:battleReport(f.b).recovery,vitals:battleReport(f.b).vitals};const restored=createBattle(copied);assert.deepEqual(restored.p.regenBuff,f.b.p.regenBuff);restored.p.regenBuff.remaining=1;close(f.b.p.regenBuff.remaining,remaining-1);
 run(f,3.02);assert.equal(f.b.p.regenBuff,null);
});
test('regen buff respects resource delays and partial final-frame expiry without increasing zero base HP regen',()=>{
 const f=fixture({lay_on_hands:1,invigorating_touch:1});f.b.p.regenBuff={remaining:.01,multiplier:1.25};f.b.p.mana=0;f.b.p.stamina=0;f.b.p.hp=1;f.b.p.manaDelay=1;f.b.p.staminaDelay=1;
 tick(f);assert.equal(f.b.p.mana,0);assert.equal(f.b.p.stamina,0);assert.equal(f.b.p.hp,1);assert.equal(f.b.p.regenBuff,null);
 f.b.p.regenBuff={remaining:.01,multiplier:1.25};f.b.p.manaDelay=0;tick(f);close(f.b.p.mana,f.b.stats.manaRegen*.0225);
});
test('judgement hits every visible forward target once, excluding rear, range and solid-wall targets',()=>{
 const f=fixture({judgement:1}),front=enemy(f),second=enemy(f,{id:'second',x:385,y:330}),rear=enemy(f,{id:'rear',x:230}),far=enemy(f,{id:'far',x:500});
 cast(f,'judgement');run(f,.8);const a=f.b.stats.actions.judgement;close(front.hp,5000-physicalDamage(a.damage,FOES.warden.armor,a.armorPenetration));assert.ok(second.hp<5000);assert.equal(rear.hp,5000);assert.equal(far.hp,5000);assert.equal(f.b.contacts,2);
 const wall=fixture({judgement:1});wall.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});wall.b.p.x=300;const hidden=enemy(wall,{x:365});cast(wall,'judgement');run(wall,1);assert.equal(hidden.hp,5000);
});
test('trial fire has no instant tick, exactly ten interval ticks, fixed original sector and no physical armor/penetration scaling',()=>{
 const f=fixture({judgement:1,trial_by_fire:1,battering_ram:1}),e=enemy(f);cast(f,'judgement');while(!f.b.areas.length)tick(f);const afterInitial=e.hp,origin={x:f.b.p.x,y:f.b.p.y};
 close(f.b.areas[0].age,f.b.p.action.elapsed-f.b.p.action.contact);run(f,.4);close(e.hp,afterInitial);f.b.p.x=150;f.b.p.y=150;run(f,6);
 close(afterInitial-e.hp,200);assert.equal(f.b.areas.length,0);assert.equal(f.b.contacts,11);assert.notEqual(f.b.p.x,origin.x);
});
test('recasting fire replaces old area, and leaving a sector prevents subsequent ticks',()=>{
 const f=fixture({judgement:1,trial_by_fire:1}),e=enemy(f);cast(f,'judgement');run(f,.6);assert.equal(f.b.areas.length,1);e.y=500;const health=e.hp;run(f,1);close(e.hp,health);
 f.b.p.cooldowns.judgement=0;f.b.p.mana=f.b.stats.manaMax;cast(f,'judgement');run(f,.4);assert.equal(f.b.areas.length,1);assert.ok(f.b.areas[0].age<.3);
});
test('shackles is post-contact, slows movement and amplifies subsequent damage only, with refresh rather than stacking',()=>{
 const f=fixture({judgement:1,shackles:1}),e=enemy(f);const a=f.b.stats.actions.judgement;cast(f,'judgement');while(!e.shackles)tick(f);close(5000-e.hp,physicalDamage(a.damage,FOES.warden.armor,a.armorPenetration));assert.equal(e.shackles.damageTakenMultiplier,a.shackles.damageTakenMultiplier);assert.ok(e.shackles.remaining>2.9);
 f.b.hitstop=0;e.gate=null;e.state='idle';e.timer=0;e.x=510;const x=e.x;tick(f);const slowed=x-e.x;assert.ok(slowed>0);close(slowed,FOES.warden.speed*a.shackles.moveMultiplier*.02);
 e.gate={objective:'fixture_inert',minimum:1};run(f,3.1);assert.equal(e.shackles,null);
});
test('charge-through sweeps multiple targets exactly once with quarter-second stun; ordinary charge stops at first',()=>{
 for(const through of [false,true]){const f=fixture(through?{charge_through:1}:{}) ;const es=[350,400,450].map((x,i)=>enemy(f,{x,id:'e'+i}));cast(f,'charge');run(f,.4);
 assert.equal(f.b.contacts,through?3:1);assert.ok(through?f.b.p.x>450:f.b.p.x<350);for(const e of es)assert.equal(e.hp,5000);assert.equal(f.b.stats.actions.shield_charge.stunSeconds,through?.25:.75);}
});
test('charge-through cannot traverse closed wall',()=>{
 const f=fixture({charge_through:1});f.b.map=mapFromRegion({w:20,h:20,rooms:[{x:1,y:1,w:9,h:18},{x:11,y:1,w:8,h:18}]});const e=enemy(f,{x:370});cast(f,'charge');run(f,.5);assert.ok(f.b.p.x<310);assert.equal(e.stun,0);assert.equal(f.b.contacts,0);
});
test('wrath emits lightning from live projectile at quarter-second intervals, outside physical sweep',()=>{
 const f=fixture({hammer_of_wrath:1}),e=enemy(f,{x:440,y:350});cast(f,'hammer');while(!f.b.shots.length)tick(f);const initial=e.hp;run(f,.18);close(e.hp,initial);run(f,.12);assert.ok(e.hp<initial);close(initial-e.hp,f.b.stats.actions.righteous_hammer.lightning.damage);run(f,1);assert.equal(f.b.shots.length,0);const hp=e.hp;run(f,1);close(e.hp,hp);
});
test('sundering applies initial damage against old armor and a timed nonstacking armor reduction afterwards',()=>{
 const f=fixture({hammer_of_sundering:1}),e=enemy(f);cast(f,'hammer');while(!e.armorBreak)tick(f);const a=f.b.stats.actions.righteous_hammer;close(5000-e.hp,physicalDamage(a.damage,FOES.warden.armor,a.armorPenetration));assert.equal(e.armorBreak.amount,5);
 while(f.b.p.action)tick(f);f.b.hitstop=0;const before=e.hp;f.b.p.x=345;cast(f,'attack');run(f,.25);const mace=f.b.stats.actions.mace_swing;close(before-e.hp,physicalDamage(mace.damage,Math.max(0,FOES.warden.armor-5),mace.armorPenetration));run(f,3.2);assert.equal(e.armorBreak,null);
});
function incoming(f,{ranged=false,passive=false}={}){
 const e=enemy(f,{x:330,inert:false});f.b.p.angle=0;f.b.p.stamina=40;f.b.p.staminaDelay=1;
 if(passive)f.b.seed=0; // deterministic first random < passive block chance
 e.state='windup';e.timer=.01;e.windupDuration=.5;e.attackSpec={damage:10,recovery:1};e.telegraph={progress:1,shapes:[{type:'cone',x:e.x,y:e.y,angle:Math.PI,r:80,halfAngle:1}]};e.angle=Math.PI;
 if(ranged){e.gate={objective:'fixture_inert',minimum:1};f.b.shots.push({kind:'arrow',enemy:true,x:330,y:300,vx:-1000,vy:0,damage:10,life:1});}
 return e;
}
test('thorns samples stamina after active block payment and reflects only the one melee attacker',()=>{
 const f=fixture({shield_of_thorns:1}),e=incoming(f),other=enemy(f,{id:'other',x:340,y:340});const a=f.b.stats.actions.shield_block;const events=tick(f,{block:true,aim:aim(f)});assert.ok(events.some(e=>e.type==='heroHurt'&&e.blocked));const remaining=40-a.staminaCost;
 close(f.b.p.stamina,remaining);close(5000-e.hp,physicalDamage(remaining*a.thorns.coefficient*a.thorns.damageMultiplier,FOES.warden.armor,a.thorns.armorPenetration));assert.equal(other.hp,5000);
});
test('thorns does not reflect ranged hits, trigger while unblocked, or recurse on reflected damage',()=>{
 const f=fixture({shield_of_thorns:1}),e=incoming(f,{ranged:true});tick(f,{block:true,aim:aim(f)},.05);assert.equal(e.hp,5000);
 const plain=fixture({shield_of_thorns:1}),melee=incoming(plain);plain.b.seed=100000;tick(plain,{aim:{x:100,y:300}});assert.equal(melee.hp,5000);assert.ok(plain.b.p.hp<plain.b.stats.hpMax);
});
test('new spells obey short intent replacement, cancel, readiness and no held-attack starvation',()=>{
 for(const [pulse,id]of [['heal','lay_on_hands'],['judgement','judgement']]){const f=fixture({lay_on_hands:1,judgement:1});cast(f,'attack');while(f.b.p.action.duration-f.b.p.action.elapsed>.16)tick(f);tick(f,{[pulse]:true,attack:true,aim:aim(f)});assert.equal(f.b.skillIntent.id,id);let events=[];while(f.b.p.action?.id!==id)events.push(...tick(f,{attack:true,aim:aim(f)}));assert.equal(events.filter(e=>e.type==='actionStarted'&&e.id===id).length,1);assert.equal(f.b.skillIntent,null);}
 const f=fixture({lay_on_hands:1});f.b.p.recoveryLock=.15;cast(f,'heal');assert.ok(f.b.skillIntent);tick(f,{block:true});assert.equal(f.b.skillIntent,null);assert.equal(run(f,.5).some(e=>e.type==='healApplied'),false);clearBattleIntent(f.b);
});
test('unlearned inputs and heal-only input never release arrival protection; learned offensive action does',()=>{
 const f=fixture({lay_on_hands:1});f.b.awaitingAdvance=true;for(const input of [{heal:true},{judgement:true},{block:true}]){assert.deepEqual(tick(f,input),[]);assert.equal(f.b.awaitingAdvance,true);}cast(f,'hammer');assert.equal(f.b.awaitingAdvance,false);
});
test('death cancels pending fields/projectiles/buff and no dead target receives duplicate kill receipts',()=>{
 const f=fixture({judgement:1,trial_by_fire:1}),e=enemy(f,{hp:1});cast(f,'judgement');const events=run(f,6);assert.equal(events.filter(x=>x.type==='defeated'&&x.id===e.id).length,1);
 f.b.areas=[{age:0}];f.b.p.regenBuff={remaining:4,multiplier:1.25};f.b.p.hp=1;f.b.p.invuln=0;incoming(f);f.b.seed=100000;tick(f,{aim:{x:100,y:300}});assert.equal(f.b.dead,true);assert.equal(f.b.areas.length,0);assert.equal(f.b.shots.length,0);assert.equal(f.b.p.regenBuff,null);
});

test('passive successful melee block reflects current stamina without charging the active block cost',()=>{
 const f=fixture({shield_of_thorns:1}),e=incoming(f),a=f.b.stats.actions.shield_block;
 let seed=0;while(((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296>=a.passiveBlockChance)seed++;f.b.seed=seed;
 const events=tick(f,{aim:{x:100,y:300}});assert.equal(events.filter(x=>x.type==='heroHurt'&&x.blocked).length,1);close(f.b.p.stamina,40);close(5000-e.hp,physicalDamage(40*a.thorns.coefficient*a.thorns.damageMultiplier,FOES.warden.armor,a.thorns.armorPenetration));
});
test('elemental bulwark and constitution resistance resolve incoming elemental damage separately from physical armor',()=>{
 for(const [type,skills,block]of [['fire',{elemental_bulwark:1},true],['poison',{superb_constitution:1},false]]){
  const f=fixture(skills),e=incoming(f,{ranged:true});f.b.shots[0].damageType=type;f.b.seed=100000;const hp=f.b.p.hp;const events=tick(f,{block,aim:aim(f)},.05),hurt=events.find(x=>x.type==='heroHurt');assert.ok(hurt);
  const resistance=f.b.stats.resistances[type]+(block?f.b.stats.actions.shield_block.resistanceBonus[type]:0),raw=10*(1-resistance/100)*(block?.3:1);close(hp-f.b.p.hp,raw);assert.equal(e.hp,5000);
 }
});
test('expired lightning projectile never emits a late tick and moving out of LOS protects targets',()=>{
 const f=fixture({hammer_of_wrath:1}),e=enemy(f,{x:440,y:350});cast(f,'hammer');while(!f.b.shots.length)tick(f);const shot=f.b.shots[0];shot.life=.01;shot.age=.24;shot.nextTick=.25;shot.x=440;shot.y=300;const health=e.hp;tick(f);assert.equal(f.b.shots.length,0);close(e.hp,health);
});
test('refresh cancels attack fields/debuffs while retaining the already paid MP, recovery and regen buff',()=>{
 const f=fixture({lay_on_hands:1,invigorating_touch:1,judgement:1,trial_by_fire:1});f.b.p.hp=1;cast(f,'heal');run(f,.6);const report=battleReport(f.b),loaded=createBattle({...f.s,vitals:report.vitals,recovery:report.recovery});
 assert.equal(loaded.p.mana,report.vitals.mana);assert.deepEqual(loaded.p.regenBuff,report.recovery.regenBuff);assert.deepEqual(loaded.p.cooldowns,report.recovery.cooldowns);assert.equal(loaded.p.action,null);assert.deepEqual(loaded.areas,[]);assert.deepEqual(loaded.shots,[]);assert.equal(loaded.skillIntent,null);
});

test('an in-flight action freezes its paid rank and multipliers across a paused skill purchase',()=>{
 const f=fixture({lay_on_hands:1});f.b.p.hp=1;cast(f,'heal');assert.equal(f.b.p.action.spec.heal,60);
 f.s.character=purchaseSkill(f.s.character,'lay_on_hands',f.s).character;assert.equal(f.s.character.skills.lay_on_hands,2);const events=run(f,.6);assert.equal(events.find(e=>e.type==='healApplied').amount,60);close(f.b.p.hp,61);assert.equal(f.b.stats.actions.lay_on_hands.heal,120);
});

test('rejected explicit skill reports current cost/cooldown for feedback, without charging or queuing',()=>{
 const f=fixture({judgement:1,trial_by_fire:1});f.b.p.mana=1;f.b.p.manaDelay=1;const events=cast(f,'judgement'),e=events.find(x=>x.type==='skillIntentRejected');assert.equal(e.reason,'not-ready');assert.equal(e.manaCost,37.5);assert.equal(e.mana,1);assert.equal(e.learned,true);assert.equal(f.b.p.mana,1);assert.equal(f.b.skillIntent,null);
 f.b.p.mana=f.b.stats.manaMax;f.b.p.cooldowns.judgement=2;const cooldown=cast(f,'judgement').find(x=>x.type==='skillIntentRejected');assert.ok(cooldown.cooldown>1.9);assert.equal(f.b.skillIntent,null);
});
