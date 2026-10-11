import {emptyRecovery,battleReport} from '../src/recovery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {createBattle,stepBattle,physicalDamage,segmentDistance} from '../src/combat.js';
import {getRegion,FOES} from '../src/world.js';
import {deriveStats} from '../src/warrior-growth.js';
import {createStore} from '../src/save.js';
import {createController} from '../src/controller.js';

const recovery=emptyRecovery;
function command(s,c){const r=reduceRuntime(s,c);assert.equal(r.ok,true,JSON.stringify(r));return r.state;}
function trained(difficulty='normal'){return command(createState({difficulty}),{type:'trainStarter',position:{x:260,y:325}});}
function field(difficulty='normal'){
 let s=trained(difficulty);s=command(s,{type:'acceptPatrol',position:{x:450,y:325}});
 return command(s,{type:'travel',life:s.world.life??0,to:'ash_road',position:{x:590,y:375},vitals:s.vitals,recovery:recovery()});
}
const report=battleReport;
function battleFixture(difficulty='normal'){
 const s=field(difficulty),b=createBattle(s);
 // Unit geometry fixture only: isolate one genuine active enemy, position both.
 b.awaitingAdvance=false;b.enemies=b.enemies.slice(0,1);Object.assign(b.p,{x:200,y:200});Object.assign(b.enemies[0],{x:260,y:200,active:true});
 return {s,b,e:b.enemies[0]};
}
function steps(b,c,seconds,input){const events=[];for(let n=0;n<Math.ceil(seconds/.02);n++)events.push(...stepBattle(b,c,.02,input));return events;}

test('first training requires actual trainer proximity, commits basic skills once and keeps zero gold',()=>{
 const s=createState();assert.equal(reduceRuntime(s,{type:'trainStarter',position:{x:50,y:50}}).code,'TRAINER_REQUIRED');
 const a=trained();assert.equal(Object.keys(a.character.skills).length,4);assert.equal(a.inventory.consumables.health_potion,2);assert.equal(a.gold,0);
 const b=command(a,{type:'trainStarter',position:{x:260,y:325}});assert.equal(b.inventory.consumables.health_potion,2);assert.equal(b.character.skillPoints,0);
});
test('road requires quest and actual portal proximity; no arbitrary region command',()=>{
 const s=trained();assert.equal(reduceRuntime(s,{type:'travel',life:s.world.life??0,to:'ash_road',position:{x:590,y:375},vitals:s.vitals}).code,'QUEST_REQUIRED');
 assert.equal(reduceRuntime(s,{type:'travel',life:s.world.life??0,to:'master_citadel',position:{x:590,y:375}}).code,'PORTAL_REQUIRED');
 assert.equal(field().world.region,'ash_road');
});
test('settlement refuses unknown enemies, duplicates inside report and stale life without mutation',()=>{
 const s=field(),before=structuredClone(s),base={type:'settleCombat',life:0,position:s.world.position,vitals:s.vitals,recovery:recovery()};
 for(const defeated of [['fake'],['road-0-0','road-0-0']])assert.equal(reduceRuntime(s,{...base,defeated}).ok,false);
 assert.equal(reduceRuntime(s,{...base,life:5,defeated:[]}).code,'STALE_ENCOUNTER');assert.deepEqual(s,before);
});
test('fixed enemy rewards settle once and remain absent after region reload',()=>{
 let s=field();const base={type:'settleCombat',life:0,position:s.world.position,vitals:s.vitals,recovery:recovery(),defeated:['road-0-0']};
 s=command(s,base);assert.equal(s.stats.kills,1);assert.equal(s.stats.earnedXp,9);assert.equal(s.gold,3);
 s=command(s,{...base,vitals:s.vitals});assert.equal(s.stats.kills,1);assert.equal(s.gold,3);assert.equal(createBattle(s).enemies.some(e=>e.id==='road-0-0'),false);
});
test('same-frame kills are awarded before a single death settlement and retry preserves rewards',()=>{
 let s=field();s=command(s,{type:'settleCombat',life:0,position:s.world.position,vitals:{...s.vitals,hp:0},recovery:recovery(),defeated:['road-warden']});
 assert.equal(s.stats.earnedXp,90);assert.equal(s.stats.earnedGold,28);assert.equal(s.stats.spentGold,1);assert.equal(s.gold,27);assert.equal(s.stats.deaths,1);
 assert.equal(reduceRuntime(s,{type:'settleCombat',life:0,defeated:['road-warden']}).code,'STALE_ENCOUNTER');
 s=command(s,{type:'retry'});assert.equal(s.world.life,1);assert.equal(s.world.region,'ash_hamlet');assert.equal(s.stats.kills,1);assert.equal(s.vitals.hp,deriveStats(s.character).stats.hpMax);assert.equal(reduceRuntime(s,{type:'retry'}).code,'NOT_DOWN');
});
test('potion refuses full HP, consumes one item and persists five-second reuse block',()=>{
 const s=field(),b=createBattle(s);assert.equal(reduceRuntime(s,{type:'drinkPotion',...report(b)}).code,'HEALTH_FULL');
 b.p.hp=1;let next=command(s,{type:'drinkPotion',...report(b)});assert.equal(next.inventory.consumables.health_potion,1);assert.equal(next.recovery.potionCooldown,5);
 const resumed=createBattle(next);assert.equal(reduceRuntime(next,{type:'drinkPotion',...report(resumed)}).code,'POTION_COOLDOWN');
});
test('normal checkpoints preserve pools/cooldowns and cancel action into a retained recovery lock',()=>{
 let s=field();const b=createBattle(s);steps(b,s.character,.1,{hammer:true,aim:{x:400,y:690}});
 assert.equal(b.p.mana,25);s=command(s,{type:'checkpoint',...report(b)});const again=createBattle(s);
 assert.equal(again.p.mana,b.p.mana);assert.equal(again.p.cooldowns.righteous_hammer,b.p.cooldowns.righteous_hammer);assert.ok(again.p.recoveryLock>0);assert.equal(again.p.action,null);
 stepBattle(again,s.character,.02,{hammer:true,aim:{x:400,y:690}});assert.equal(again.p.mana,b.p.mana);
});
test('region roundtrip preserves depleted mana and cooldowns rather than refilling',()=>{
 let s=field();const b=createBattle(s);steps(b,s.character,.1,{hammer:true,aim:{x:400,y:690}});
 s=command(s,{type:'travel',life:s.world.life??0,to:'ash_hamlet',...report(b),position:{x:92,y:728}});
 assert.equal(s.vitals.mana,25);assert.ok(s.recovery.cooldowns.righteous_hammer>0);const again=createBattle(s);assert.equal(again.p.mana,25);
});
test('rest is only at healer, resources refill without granting points/gold',()=>{
 let s=trained();s.vitals.hp=1;s.vitals.mana=0;assert.equal(reduceRuntime(s,{type:'rest',position:{x:60,y:60}}).code,'HEALER_REQUIRED');
 const next=command(s,{type:'rest',position:{x:350,y:250}});assert.equal(next.vitals.hp,55);assert.equal(next.vitals.mana,40);assert.equal(next.gold,0);assert.equal(next.character.skillPoints,0);
});
test('sealed warden chest requires its kill, location, real resource report and single receipt',()=>{
 let s=field();const c={type:'openChest',chestId:'warden-cache',position:{x:868,y:112},vitals:s.vitals,recovery:recovery()};
 assert.equal(reduceRuntime(s,c).code,'WARDEN_ALIVE');s=command(s,{type:'settleCombat',life:0,position:s.world.position,vitals:s.vitals,recovery:recovery(),defeated:['road-warden']});
 s=command(s,{...c,vitals:s.vitals});assert.equal(s.world.claimedRewards.includes('chest:warden-cache'),true);assert.equal(reduceRuntime(s,{...c,vitals:s.vitals}).code,'ALREADY_CLAIMED');
});
test('trained patrol reward requires returning to elder rather than remote claim',()=>{
 let s=field();const ids=getRegion('ash_road').foes.slice(0,6).map(x=>x.id);
 s=command(s,{type:'settleCombat',life:0,position:s.world.position,vitals:s.vitals,recovery:recovery(),defeated:ids});
 assert.equal(reduceRuntime(s,{type:'claimReward',rewardId:'watch_patrol'}).code,'ELDER_REQUIRED');
 s=command(s,{type:'travel',life:s.world.life??0,to:'ash_hamlet',position:{x:92,y:728},vitals:s.vitals,recovery:recovery()});
 s=command(s,{type:'claimReward',rewardId:'watch_patrol',position:{x:450,y:325}});assert.equal(s.world.claimedRewards.includes('watch_patrol'),true);
});
test('pure geometry and armor rules are bounded and swept hits cannot skip narrow targets',()=>{
 assert.equal(segmentDistance({x:50,y:5},{x:0,y:0},{x:100,y:0}),5);assert.equal(physicalDamage(20,100),10);assert.equal(physicalDamage(20,100,100),20);assert.equal(physicalDamage(20,-50),20);
});
test('mace resolves at contact, not press; action recovery prevents repeated per-frame damage',()=>{
 const {s,b,e}=battleFixture();e.active=false;e.x=260;e.y=200;
 steps(b,s.character,.16,{attack:true,aim:e});assert.equal(e.hp,e.max);
 steps(b,s.character,.04,{attack:true,aim:e});assert.ok(e.hp<e.max);const hp=e.hp;steps(b,s.character,.10,{attack:true,aim:e});assert.equal(e.hp,hp);
});
test('hammer pays once, respects cooldown and pierces each enemy at most once',()=>{
 const {s,b,e}=battleFixture();e.active=false;const twin={...e,id:'unit-second',x:300,y:200,hp:100,max:100};e.hp=e.max=100;b.enemies.push(twin);
 const events=steps(b,s.character,.9,{hammer:true,aim:{x:500,y:200}});assert.equal(events.filter(e=>e.type==='sound'&&e.name==='magicRelease').length,1);assert.ok(b.p.mana<29);assert.equal(e.hp,70);assert.equal(twin.hp,70);
});
test('charge travel is limited to authored distance and recovery cannot extend it',()=>{
 const s=field(),b=createBattle(s);b.enemies=[];b.p.x=200;b.p.y=200;steps(b,s.character,.5,{charge:true,aim:{x:600,y:200}});
 assert.ok(Math.abs(b.p.x-362)<1e-5);assert.equal(b.p.y,200);assert.ok(b.p.stamina<40);assert.ok(b.p.cooldowns.shield_charge>2);
});
test('base charge stops on a collided enemy and stuns without invented base damage',()=>{
 const {s,b,e}=battleFixture();e.active=false;const hp=e.hp;steps(b,s.character,.14,{charge:true,aim:e});assert.equal(e.hp,hp);assert.ok(e.stun>0);assert.ok(b.p.x<e.x);
});
test('enemy windup locks its tell; moving out avoids the matching hit geometry',()=>{
 const {s,b,e}=battleFixture();b.p.x=240;e.x=270;stepBattle(b,s.character,.02,{});assert.ok(e.telegraph);const angle=e.telegraph.shapes[0].angle;
 steps(b,s.character,.6,{move:{x:0,y:1}});assert.equal(e.telegraph.shapes[0].angle,angle);steps(b,s.character,.3,{});assert.equal(b.p.hp,55);
});
test('active block consumes stamina only at contact, respects facing and reduces damage',()=>{
 const {s,b,e}=battleFixture();b.p.x=240;e.x=270;steps(b,s.character,.9,{block:true,aim:e});assert.ok(b.p.hp>=52);assert.ok(b.p.stamina<45);assert.equal(b.p.block,true);
});
test('difficulty directly scales HP and authored enemy outgoing damage, not player cooldown/recovery',()=>{
 const normal=battleFixture('normal'),hard=battleFixture('hard'),easy=battleFixture('easy'),serious=battleFixture('serious');
 assert.equal(hard.e.max,normal.e.max*1.25);assert.equal(easy.e.max,normal.e.max*.66);assert.equal(serious.e.max,normal.e.max*1.5);
 assert.equal(hard.b.stats.manaRegen,normal.b.stats.manaRegen);assert.equal(hard.b.stats.actions.mace_swing.duration,normal.b.stats.actions.mace_swing.duration);
 for(const x of [normal,hard,easy,serious]){x.b.p.x=240;x.e.x=270;x.b.seed=1000;steps(x.b,x.s.character,.9,{});}
 const damage=55-normal.b.p.hp;assert.ok(damage>0);assert.ok(Math.abs((55-hard.b.p.hp)/damage-1.25)<1e-8);assert.ok(Math.abs((55-serious.b.p.hp)/damage-2)<1e-8);
});
test('long frame input is capped and invalid deltas fail without runaway movement',()=>{
 const s=field(),b=createBattle(s);b.enemies=[];const before=b.p.x;stepBattle(b,s.character,.2,{move:{x:1,y:0}});assert.ok(b.p.x-before<=9.001);assert.throws(()=>stepBattle(b,s.character,1,{}));assert.throws(()=>stepBattle(b,s.character,-1,{}));
});
test('live AI model route earns first six kills through actual combat and persists real rewards',async()=>{
 let s=field();const m=new Map();const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},store=createStore(storage,{profile:'qa-model-route'});
 store.save(s,{expectedRevision:0});const c=createController(store);await c.load();const b=createBattle(s);let killed=0,elapsed=0;
 // Model-only policy: scripted steering and NPC coordinates, real moving AI,
 // no HP/XP/level injection. Not a human normal-input or campaign-time proof.
 for(let frame=0;frame<9000&&killed<6&&!b.dead;frame++){
   const target=b.enemies.filter(e=>e.hp>0).sort((a,z)=>Math.hypot(a.x-b.p.x,a.y-b.p.y)-Math.hypot(z.x-b.p.x,z.y-b.p.y))[0];
   const dx=target.x-b.p.x,dy=target.y-b.p.y,d=Math.hypot(dx,dy),direction=d>185?1:d<135?-1:0;
   const events=stepBattle(b,s.character,.02,{move:{x:dx*direction,y:dy*direction},aim:target,hammer:true});elapsed+=.02;
   const ids=events.filter(e=>e.type==='defeated').map(e=>e.id);if(ids.length||b.dead){const r=await c.dispatch({type:'settleCombat',defeated:ids,...report(b)});assert.equal(r.ok,true,JSON.stringify(r));s=r.state;Object.assign(b.p,s.vitals);killed=s.stats.kills;}
 }
 assert.ok(killed>=6,`kills=${killed} hp=${b.p.hp} elapsed=${elapsed}`);assert.ok(s.stats.earnedXp>0);assert.equal(s.stats.deaths,0);
 const resumed=createController(store);await resumed.load();assert.equal(resumed.snapshot().stats.kills,killed);assert.equal(validateState(resumed.snapshot()).ok,true);
});

test('new field arrival waits for deliberate movement/attack and cannot regenerate or advance cooldowns while reading',()=>{const s=field(),b=createBattle(s);b.p.mana=10;b.p.cooldowns.righteous_hammer=.8;const pos=structuredClone(b.enemies.map(e=>({x:e.x,y:e.y})));steps(b,s.character,8,{});assert.equal(b.p.hp,55);assert.equal(b.p.mana,10);assert.equal(b.p.cooldowns.righteous_hammer,.8);assert.deepEqual(b.enemies.map(e=>({x:e.x,y:e.y})),pos);stepBattle(b,s.character,.02,{move:{x:1,y:0}});assert.equal(b.awaitingAdvance,false);});

test('checkpoint reload arrival cannot reset paid cooldown, lock, invulnerability or regenerate saved mana',()=>{
 let s=field();const b=createBattle(s);stepBattle(b,s.character,.02,{hammer:true,aim:{x:600,y:690}});s=command(s,{type:'checkpoint',...report(b)});const restored=createBattle(s),saved=structuredClone(restored.p);steps(restored,s.character,8,{});assert.equal(restored.p.mana,saved.mana);assert.deepEqual(restored.p.cooldowns,saved.cooldowns);assert.equal(restored.p.recoveryLock,saved.recoveryLock);assert.equal(restored.p.invuln,saved.invuln);assert.equal(restored.p.hp,saved.hp);assert.equal(restored.time,0);stepBattle(restored,s.character,.02,{hammer:true});assert.equal(restored.p.action,null);assert.ok(restored.p.cooldowns.righteous_hammer>0);
});
test('guard input or pointer aim alone never releases first-arrival safety',()=>{const s=field(),b=createBattle(s);steps(b,s.character,4,{block:true,aim:{x:500,y:500}});assert.equal(b.awaitingAdvance,true);assert.equal(b.time,0);assert.equal(b.p.stamina,45);assert.equal(b.p.hp,55);});

test('travel requires an explicit current-life report and never accepts an absent life token',()=>{
 const s=trained();const before=structuredClone(s);const r=reduceRuntime(s,{type:'travel',to:'ash_road',position:{x:590,y:375},vitals:s.vitals});assert.equal(r.code,'STALE_LIFE');assert.deepEqual(s,before);
});
