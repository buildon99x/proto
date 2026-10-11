import {battleReport} from '../src/recovery.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {createBattle,stepBattle,clearBattleIntent} from '../src/combat.js';
import {createInputRouter,controlsFor} from '../src/controls.js';
import {createStore} from '../src/save.js';
import {readFileSync} from 'node:fs';

// Combat-only fixtures use an empty town, scripted aim and selected boundary
// state changes. These tests are not ordinary-input dungeon completion evidence.
const command=(s,c)=>{const r=reduceRuntime(s,c);assert.equal(r.ok,true,JSON.stringify(r));return r.state;};
function fixture(){const s=command(createState(),{type:'trainStarter',position:{x:260,y:325}});return {s,b:createBattle(s)};}
const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
function advance(f,seconds,input={}){const events=[];for(let i=0;i<Math.ceil(seconds/.02);i++)events.push(...tick(f,input));return events;}
function untilAction(f,id,input={}){const events=[];for(let n=0;n<40;n++){events.push(...tick(f,input));if(f.b.p.action?.id===id)return events;}assert.fail(`action ${id} did not begin`);}
const east=f=>({x:f.b.p.x+200,y:f.b.p.y});
function lateMace(f){tick(f,{attack:true,aim:east(f)});while(f.b.p.action.duration-f.b.p.action.elapsed>.16+1e-9)tick(f);assert.equal(f.b.p.action.id,'mace_swing');}
function queue(f,input={hammer:true}){lateMace(f);tick(f,{aim:east(f),...input});assert.ok(f.b.skillIntent);}
const starts=(events,name)=>events.filter(e=>e.type==='sound'&&e.name===name).length;
const report=battleReport;

test('ready hammer waits for the original mace contact and recovery, then pays once ahead of held attack',()=>{
 const f=fixture(),mana=f.b.p.mana;lateMace(f);const original=f.b.p.action;
 tick(f,{attack:true,hammer:true,aim:east(f)});assert.equal(f.b.p.action,original);assert.equal(f.b.p.action.fired,true);assert.equal(f.b.p.mana,mana);assert.equal(f.b.skillIntent.remaining,.18);
 const events=untilAction(f,'righteous_hammer',{attack:true});assert.equal(original.fired,true);assert.ok(original.elapsed>=original.duration);assert.equal(f.b.p.combo,1);
 assert.equal(starts(events,'magicCharge'),1);assert.equal(f.b.p.mana,mana-f.b.stats.actions.righteous_hammer.manaCost);assert.equal(f.b.skillIntent,null);
 assert.equal(starts(advance(f,4,{attack:true}),'magicCharge'),0);
});
test('ready charge waits without early movement or stamina payment and executes once',()=>{
 const f=fixture(),stamina=f.b.p.stamina,start={x:f.b.p.x,y:f.b.p.y};queue(f,{charge:true});
 assert.deepEqual({x:f.b.p.x,y:f.b.p.y},start);assert.equal(f.b.p.stamina,stamina);
 const events=untilAction(f,'shield_charge',{attack:true});assert.equal(starts(events,'dash'),1);assert.equal(f.b.p.stamina,stamina-f.b.stats.actions.shield_charge.staminaCost);assert.equal(f.b.skillIntent,null);
 assert.equal(starts(advance(f,5,{attack:true}),'dash'),0);
});
test('latest skill pulse replaces the single intent and retains input-time movement-direction aim',()=>{
 const f=fixture();queue(f);tick(f,{charge:true,chargeAngle:Math.PI/2,aim:east(f)});
 assert.deepEqual(f.b.skillIntent,{id:'shield_charge',angle:Math.PI/2,aimAngle:0,move:null,remaining:.18});
 const events=untilAction(f,'shield_charge',{aim:east(f)});assert.equal(starts(events,'magicCharge'),0);assert.equal(f.b.p.action.angle,Math.PI/2);
 assert.equal(f.b.p.mana,40);
});
test('hammer aim is captured at press even while the mace animation faces another direction',()=>{
 const f=fixture();lateMace(f);tick(f,{hammer:true,aim:{x:f.b.p.x,y:f.b.p.y-200}});
 assert.equal(f.b.p.action.angle,0);assert.equal(f.b.skillIntent.angle,-Math.PI/2);
 untilAction(f,'righteous_hammer',{aim:{x:f.b.p.x+20,y:f.b.p.y-200}});assert.equal(f.b.p.action.angle,-Math.PI/2);
});
test('an idle ready skill still starts immediately with its existing cost and cooldown',()=>{
 for(const [pulse,id,sound,pool,cost]of [['hammer','righteous_hammer','magicCharge','mana','manaCost'],['charge','shield_charge','dash','stamina','staminaCost']]){
  const f=fixture(),before=f.b.p[pool],events=tick(f,{[pulse]:true,aim:east(f)});
  assert.equal(f.b.p.action.id,id);assert.equal(starts(events,sound),1);assert.equal(f.b.p[pool],before-f.b.stats.actions[id][cost]);assert.equal(f.b.p.cooldowns[id],f.b.stats.actions[id].cooldown);assert.equal(f.b.skillIntent,null);
 }
});
test('cooldown-blocked requests, including a short remaining cooldown, do not wait for later readiness',()=>{
 for(const cooldown of [.1,3]){const f=fixture();tick(f,{attack:true});f.b.p.cooldowns.righteous_hammer=cooldown;tick(f,{hammer:true});assert.equal(f.b.skillIntent,null);assert.equal(starts(advance(f,4),'magicCharge'),0);assert.equal(f.b.p.mana,40);}
});
test('insufficient resources or unlearned skills never create deferred casts',()=>{
 const f=fixture();tick(f,{attack:true});f.b.p.mana=0;f.b.p.manaDelay=1;tick(f,{hammer:true});assert.equal(f.b.skillIntent,null);assert.equal(starts(advance(f,12),'magicCharge'),0);
 const s=createState(),b=createBattle(s);stepBattle(b,s.character,.02,{hammer:true});assert.equal(b.p.action,null);assert.equal(b.skillIntent,null);
});
test('a newer unavailable request cancels rather than leaves the older intent armed',()=>{
 const f=fixture();queue(f);f.b.p.cooldowns.shield_charge=3;tick(f,{charge:true});assert.equal(f.b.skillIntent,null);
 const events=advance(f,4);assert.equal(starts(events,'dash'),0);assert.equal(starts(events,'magicCharge'),0);
});
test('queued execution rechecks resources and drops a failed attempt permanently',()=>{
 const f=fixture();queue(f);f.b.p.mana=0;f.b.p.manaDelay=2;
 const events=advance(f,.7);assert.equal(f.b.skillIntent,null);assert.equal(starts(events,'magicCharge'),0);assert.equal(f.b.p.cooldowns.righteous_hammer,undefined);
 f.b.p.mana=40;assert.equal(starts(advance(f,2),'magicCharge'),0);
});
test('queued execution cannot bypass a cooldown which became active before recovery finished',()=>{
 const f=fixture();queue(f);f.b.p.cooldowns.righteous_hammer=3;
 assert.equal(starts(advance(f,.7),'magicCharge'),0);assert.equal(f.b.skillIntent,null);assert.equal(starts(advance(f,4),'magicCharge'),0);
});
test('the .18-second window expires in active frame time even when hitstop slows recovery',()=>{
 const f=fixture();queue(f);f.b.hitstop=2;
 for(let n=0;n<8;n++)tick(f);assert.ok(f.b.skillIntent);tick(f);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action.id,'mace_swing');
 f.b.hitstop=0;assert.equal(starts(advance(f,2),'magicCharge'),0);assert.equal(f.b.p.mana,40);
});
test('a recovery lock longer than the small window cannot arm an eventual skill',()=>{
 const f=fixture();f.b.p.recoveryLock=.8;tick(f,{hammer:true});assert.equal(f.b.skillIntent,null);assert.equal(starts(advance(f,2),'magicCharge'),0);
});
test('a short saved recovery lock can accept a new explicit press without restoring an old intent',()=>{
 const f=fixture();f.b.p.recoveryLock=.2;tick(f,{hammer:true});assert.equal(f.b.p.action,null);assert.ok(f.b.skillIntent);assert.equal(starts(untilAction(f,'righteous_hammer'),'magicCharge'),1);
});
test('menu, blur and rebind integration can clear only intent without cancelling the current attack',()=>{
 const f=fixture();queue(f);const original=f.b.p.action,mana=f.b.p.mana;clearBattleIntent(f.b);clearBattleIntent(f.b);clearBattleIntent(null);
 assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,original);assert.equal(f.b.p.mana,mana);assert.equal(starts(advance(f,2),'magicCharge'),0);
});
test('OS repeats and a held skill key yield one router pulse and never refresh or repeat the buffer',()=>{
 const f=fixture(),router=createInputRouter(),controls=controlsFor(f.s);router.down('KeyJ',controls);tick(f,router.snapshot(controls));while(f.b.p.action.duration-f.b.p.action.elapsed>.16+1e-9)tick(f,router.snapshot(controls));router.down('KeyQ',controls);tick(f,router.snapshot(controls));assert.ok(f.b.skillIntent);
 const events=[];for(let n=0;n<350;n++){assert.equal(router.down('KeyQ',controls,{repeat:true}),null);events.push(...tick(f,router.snapshot(controls)));}
 assert.equal(starts(events,'magicCharge'),1);assert.equal(f.b.skillIntent,null);
 while(f.b.p.action&&f.b.p.action.duration-f.b.p.action.elapsed>.16+1e-9)tick(f,router.snapshot(controls));router.up('KeyQ');router.down('KeyQ',controls);const next=[...tick(f,router.snapshot(controls)),...untilAction(f,'righteous_hammer',router.snapshot(controls))];assert.equal(starts(next,'magicCharge'),1);
});
test('checkpoint/save/reload and region creation do not serialize or replay buffered intent',()=>{
 const f=fixture();queue(f);let s=command(f.s,{type:'checkpoint',...report(f.b)});assert.equal(JSON.stringify(s).includes('skillIntent'),false);
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},{profile:'qa-intent-unit'});assert.equal(store.save(s,{expectedRevision:0}).ok,true);
 const resumed={s:store.load().state,b:createBattle(store.load().state)};assert.equal(resumed.b.skillIntent,null);assert.equal(starts(advance(resumed,2),'magicCharge'),0);
 s=command(s,{type:'acceptPatrol',position:{x:450,y:325}});s=command(s,{type:'travel',life:s.world.life??0,to:'ash_road',position:{x:590,y:375},vitals:s.vitals,recovery:s.recovery});
 assert.equal(createBattle(s).skillIntent,null);assert.equal(createBattle(createState()).skillIntent,null);
});
test('actual fatal projectile clears a pending intent and retry constructs an empty one',()=>{
 const f=fixture();queue(f);f.b.p.hp=1;f.b.shots.push({kind:'arrow',enemy:true,x:f.b.p.x-1,y:f.b.p.y,vx:100,vy:0,damage:1000,life:1});
 const events=tick(f);assert.ok(events.some(e=>e.type==='heroDead'));assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,null);
 let s=command(f.s,{type:'settleCombat',defeated:[],...report(f.b)});s=command(s,{type:'retry'});assert.equal(createBattle(s).skillIntent,null);
});
test('early input explicitly rejects without cancelling original preparation/contact or arming a later cast',()=>{
 const f=fixture();tick(f,{attack:true,aim:east(f)});const original=f.b.p.action,mana=f.b.p.mana;
 const events=tick(f,{hammer:true});assert.equal(f.b.p.action,original);assert.equal(original.fired,false);assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.mana,mana);
 const rejection=events.find(e=>e.type==='skillIntentRejected');assert.equal(rejection.reason,'recovery-too-early');assert.equal(rejection.window,.18);assert.ok(rejection.remaining>.18);
 assert.equal(starts(advance(f,2),'magicCharge'),0);assert.equal(original.fired,true);
});
test('guard cancels a queued skill and cannot arm another pending skill while held',()=>{
 const f=fixture();queue(f);const original=f.b.p.action;
 const events=tick(f,{block:true});assert.equal(f.b.skillIntent,null);assert.equal(f.b.p.action,original);assert.ok(events.some(e=>e.type==='skillIntentCancelled'&&e.reason==='guard'));
 const rejected=tick(f,{block:true,charge:true});assert.equal(f.b.skillIntent,null);assert.ok(rejected.some(e=>e.type==='skillIntentRejected'&&e.reason==='guard'));
 const later=advance(f,1,{block:true});assert.equal(starts(later,'magicCharge'),0);assert.equal(starts(later,'dash'),0);assert.equal(f.b.p.block,true);
});
for(const degrees of [89,90,91,180,-90])test(`aim change ${degrees} degrees has an inclusive 90-degree cancellation boundary`,()=>{
 const f=fixture();queue(f);const angle=degrees*Math.PI/180;
 const events=tick(f,{aim:{x:f.b.p.x+Math.cos(angle)*100,y:f.b.p.y+Math.sin(angle)*100}}),cancelled=Math.abs(degrees)>=90;
 assert.equal(f.b.skillIntent===null,cancelled);assert.equal(events.some(e=>e.type==='skillIntentCancelled'&&e.reason==='aim-reversed'),cancelled);
 if(cancelled)assert.equal(starts(advance(f,1),'magicCharge'),0);
 else{untilAction(f,'righteous_hammer');assert.equal(f.b.p.action.angle,0);}
});
test('aim cancellation follows wrapped angles and the input-time aim, independently of movement-based charge angle',()=>{
 const f=fixture(),angle=179*Math.PI/180;queue(f,{charge:true,chargeAngle:Math.PI/2,aim:{x:f.b.p.x+Math.cos(angle)*100,y:f.b.p.y+Math.sin(angle)*100}});
 const oppositeWrap=-179*Math.PI/180;tick(f,{aim:{x:f.b.p.x+Math.cos(oppositeWrap)*100,y:f.b.p.y+Math.sin(oppositeWrap)*100}});assert.ok(f.b.skillIntent);
 untilAction(f,'shield_charge');assert.equal(f.b.p.action.angle,Math.PI/2);
});
test('opposite movement cancels only when movement existed at the skill press; stopping/perpendicular movement preserves it',()=>{
 for(const [next,cancelled]of [[{x:-1,y:0},true],[{x:-1,y:1},true],[{x:0,y:1},false],[{x:0,y:0},false]]){
  const f=fixture();queue(f,{hammer:true,move:{x:3,y:0}});assert.deepEqual(f.b.skillIntent.move,{x:1,y:0});
  const events=tick(f,{move:next});assert.equal(f.b.skillIntent===null,cancelled);assert.equal(events.some(e=>e.type==='skillIntentCancelled'&&e.reason==='movement-reversed'),cancelled);
 }
 const f=fixture();queue(f);tick(f,{move:{x:-1,y:0}});assert.ok(f.b.skillIntent);
});
test('cancel is checked on the final recovery frame before a queued skill could start',()=>{
 const f=fixture();queue(f);while(f.b.p.action.duration-f.b.p.action.elapsed>.02+1e-9)tick(f);
 const events=tick(f,{block:true});assert.equal(f.b.skillIntent,null);assert.equal(starts(events,'magicCharge'),0);assert.equal(f.b.p.mana,40);
});
for(const dt of [.01,.02,.03,.045,.05,1/60])test(`exact .18s action/lock boundary executes within deadline with dt=${dt}`,()=>{
 for(const kind of ['action','lock']){
  const f=fixture();
  if(kind==='action'){tick(f,{attack:true},0);for(let i=0;i<17;i++)tick(f);assert.ok(Math.abs((f.b.p.action.duration-f.b.p.action.elapsed)-.18)<1e-9);}
  else f.b.p.recoveryLock=.18;
  tick(f,{hammer:true},0);assert.ok(f.b.skillIntent);const pressedAt=f.b.time,events=[];
  for(let n=0;n<30&&f.b.p.action?.id!=='righteous_hammer';n++)events.push(...tick(f,{attack:true},dt));
  assert.equal(f.b.p.action?.id,'righteous_hammer');assert.equal(starts(events,'magicCharge'),1);assert.equal(f.b.skillIntent,null);
  const beganAt=f.b.time-f.b.p.action.elapsed;assert.ok(Math.abs(beganAt-pressedAt-.18)<1e-8,`${kind}: ${beganAt-pressedAt}`);
  assert.equal(f.b.p.mana,25);assert.equal(f.b.p.cooldowns.righteous_hammer<=f.b.stats.actions.righteous_hammer.cooldown,true);
 }
});
test('a frame crossing expiry is split without losing time or delivering a replacement pulse twice',()=>{
 const f=fixture();queue(f);f.b.hitstop=2;for(let n=0;n<8;n++)tick(f);assert.ok(f.b.skillIntent.remaining<.05);const before=f.b.time;
 // Keep recovery busy past expiry: a newer pulse will be rejected, not retained.
 f.b.p.recoveryLock=.5;const events=tick(f,{hammer:true},.05);assert.ok(Math.abs(f.b.time-before-.05)<1e-9);
 assert.equal(events.filter(e=>e.type==='skillIntentRejected').length,1);assert.equal(f.b.skillIntent,null);
});
function expiryField(){
 let s=fixture().s;s=command(s,{type:'acceptPatrol',position:{x:450,y:325}});s=command(s,{type:'travel',life:s.world.life??0,to:'ash_road',position:{x:590,y:375},vitals:s.vitals});
 const f={s,b:createBattle(s)};f.b.enemies=f.b.enemies.slice(0,2);for(const e of f.b.enemies){e.x=800;e.y=500;e.stun=10;}
 queue(f);f.b.hitstop=2;for(let n=0;n<8;n++)tick(f);assert.ok(f.b.skillIntent.remaining>0&&f.b.skillIntent.remaining<.05);
 f.b.p.mana=10;f.b.p.stamina=10;f.b.p.manaDelay=f.b.p.staminaDelay=0;
 return f;
}
test('split frame preserves first and second defeated/sound events for one actual settlement with no duplicate XP',()=>{
 const f=expiryField(),p=f.b.p,ids=f.b.enemies.map(e=>e.id);Object.assign(f.b.enemies[0],{x:p.x+5,y:p.y,hp:1});Object.assign(f.b.enemies[1],{x:p.x+40,y:p.y,hp:1});
 f.b.shots.push({id:'fixture-piercing',kind:'hammer',enemy:false,x:p.x,y:p.y,vx:2000,vy:0,damage:100,life:1,hitIds:[]});
 const before=f.b.time,events=tick(f,{},.05);assert.equal(events,f.b.events);assert.ok(Math.abs(f.b.time-before-.05)<1e-9);
 assert.deepEqual(events.filter(e=>e.type==='defeated').map(e=>e.id),ids);assert.equal(starts(events,'heavyHit'),2);
 assert.ok(Math.abs(p.mana-(10+f.b.stats.manaRegen*.05*.35))<1e-9);assert.ok(Math.abs(p.stamina-(10+f.b.stats.staminaRegen*.05*.35))<1e-9);
 const settled=command(f.s,{type:'settleCombat',defeated:ids,...report(f.b)});assert.equal(settled.stats.kills,2);assert.equal(settled.stats.earnedXp,18);assert.equal(settled.gold,6);
 const again=command(settled,{type:'settleCombat',defeated:ids,...report(f.b)});assert.equal(again.stats.earnedXp,18);assert.equal(again.stats.kills,2);
});
test('first substep fatal hit retains heroDead, kill and sound once despite the dead second substep',()=>{
 const f=expiryField(),p=f.b.p,id=f.b.enemies[0].id;p.hp=1;Object.assign(f.b.enemies[0],{x:p.x+5,y:p.y,hp:1});
 f.b.shots.push({id:'fixture-hammer',kind:'hammer',enemy:false,x:p.x,y:p.y,vx:2000,vy:0,damage:100,life:1,hitIds:[]},{kind:'arrow',enemy:true,x:p.x-1,y:p.y,vx:100,vy:0,damage:1000,life:1});
 const before=f.b.time,events=tick(f,{},.05);assert.equal(events.filter(e=>e.type==='heroDead').length,1);assert.deepEqual(events.filter(e=>e.type==='defeated').map(e=>e.id),[id]);assert.equal(starts(events,'die'),1);assert.equal(starts(events,'heavyHit'),1);assert.ok(Math.abs(f.b.time-before-.05)<1e-9);
 const settled=command(f.s,{type:'settleCombat',defeated:[id],...report(f.b)});assert.equal(settled.stats.deaths,1);assert.equal(settled.stats.earnedXp,9);assert.equal(settled.stats.kills,1);
 assert.equal(tick(f).some(e=>e.type==='heroDead'),false);
});
test('expiry-only split matches unsplit elapsed recovery and resource totals without extending hitstop',()=>{
 const f=expiryField();f.b.enemies=[];const plain=structuredClone(f.b);clearBattleIntent(plain);
 const events=tick(f,{},.05),ordinary=stepBattle(plain,f.s.character,.05,{});
 for(const field of ['hp','mana','stamina','recoveryLock','manaDelay','staminaDelay','invuln','potionCooldown'])assert.ok(Math.abs(f.b.p[field]-plain.p[field])<1e-9,field);
 assert.ok(Math.abs(f.b.time-plain.time)<1e-9);assert.ok(Math.abs(f.b.hitstop-plain.hitstop)<1e-9);assert.ok(Math.abs(f.b.p.action.elapsed-plain.p.action.elapsed)<1e-9);
 assert.deepEqual(events.filter(e=>e.type!=='skillIntentCancelled'),ordinary);
});
test('runtime numeric comparison documents .55 versus .18 acceptance boundaries and maximum effective wait',async t=>{
 // Counterfactual numeric benchmark: run this same real combat implementation
 // with ONLY the window constant changed. Not a historical-build or screen QA.
 const url=new URL('../src/combat.js',import.meta.url),source=readFileSync(url,'utf8');assert.match(source,/const SKILL_INTENT_SECONDS=\.18;/);
 const comparison=source.replace('const SKILL_INTENT_SECONDS=.18;','const SKILL_INTENT_SECONDS=.55;').replace(/from '\.\/([^']+)'/g,(_match,file)=>`from '${new URL(file,url).href}'`);
 const oldWindow=await import('data:text/javascript;base64,'+Buffer.from(comparison).toString('base64'));
 const rows=[];
 for(const [window,step]of [[.18,stepBattle],[.55,oldWindow.stepBattle]]){
  const acceptance=[];
  for(const remaining of [.12,.179,.18,.181,.20,.549,.55,.551]){
   const f=fixture();f.b.p.recoveryLock=remaining;const events=step(f.b,f.s.character,0,{hammer:true});
   assert.equal(!!f.b.skillIntent,remaining<=window);if(remaining>window)assert.ok(events.some(e=>e.type==='skillIntentRejected'&&e.reason==='recovery-too-early'));
   acceptance.push({remaining,accepted:!!f.b.skillIntent});
  }
  const f=fixture();f.b.p.recoveryLock=window;step(f.b,f.s.character,0,{hammer:true});let casts=0;
  for(let n=0;n<30&&!f.b.p.action;n++)casts+=starts(step(f.b,f.s.character,.05,{}),'magicCharge');
  assert.equal(casts,1);const effectiveWait=f.b.time-f.b.p.action.elapsed;assert.ok(Math.abs(effectiveWait-window)<1e-8);
  rows.push({window,acceptance,acceptedAtBoundary:true,rejectedOneMillisecondAbove:true,effectiveWait:Number(effectiveWait.toFixed(3))});
 }
 t.diagnostic(JSON.stringify({kind:'runtime numeric window comparison; no browser or screen',rows}));
});
