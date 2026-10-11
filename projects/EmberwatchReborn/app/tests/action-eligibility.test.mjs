import test from 'node:test';
import assert from 'node:assert/strict';
import {actionEligibility,applyHeroStatus,quoteAction} from '../src/combat.js';
import {actionBlockedText} from '../src/action-feedback.js';
import {fixture,tick,run,placeBanner,close} from './support/expert-fixture.mjs';

// Synthetic status/Expert fixtures execute the real acceptance, payment,
// recovery and expiry handlers. These are not native browser gameplay.
const actions=[['attack','mace_swing'],['hammer','righteous_hammer'],['charge','shield_charge'],['heal','lay_on_hands'],['judgement','judgement'],['expert1','battle_banner'],['expert2','zealous_onslaught']];
const input=(pulse,id)=>({[pulse]:pulse.startsWith('expert')?id:true,...(id==='zealous_onslaught'?{channel:{held:true,ownerToken:'fixture-pressed'}}:{})});
const skills={cleansing_touch:1,judgement:1,battle_banner:1,zealous_onslaught:1};
const snapshot=b=>({mana:b.p.mana,stamina:b.p.stamina,cooldowns:structuredClone(b.p.cooldowns),action:b.p.action,serial:b.castSerial,shots:structuredClone(b.shots),areas:structuredClone(b.areas),banner:b.banner});
for(const status of ['stun','silence','disarm'])for(const [pulse,id] of actions)test(`real ${status}/${id} rejection or unaffected acceptance agrees with one immutable eligibility result`,()=>{
 const f=fixture(skills);applyHeroStatus(f.b,`r11_${status}`,'fixture-source');
 const before=snapshot(f.b),full=structuredClone(f.b),eligibility=actionEligibility(f.b,id);assert.deepEqual(f.b,full,'read-only query');
 const blocked=status==='stun'||status==='silence'&&!['mace_swing','shield_charge'].includes(id)||status==='disarm'&&id==='mace_swing';
 assert.equal(eligibility.ready,!blocked);assert.equal(eligibility.blockedReason,blocked?status:null);
 const events=tick(f,input(pulse,id),0);
 if(blocked){
  assert.deepEqual(snapshot(f.b),before);assert.equal(f.b.skillIntent,null);assert.equal(events.some(e=>['actionStarted','channelPayment','sound','innerFlameChanged'].includes(e.type)),false);
  const rejection=events.find(e=>e.type==='skillIntentRejected');assert.ok(rejection);for(const [key,value]of Object.entries(eligibility))assert.equal(rejection[key],value,key);
  assert.ok(actionBlockedText(rejection));
  run(f,status==='stun'?.6:2);assert.equal(actionEligibility(f.b,id).ready,true);assert.equal(f.b.p.action,null,'single/released request is not buffered through status');
  const cost=quoteAction(f.b,id),mana=f.b.p.mana,stamina=f.b.p.stamina;const resumed=tick(f,input(pulse,id),0);assert.equal(resumed.filter(e=>e.type==='actionStarted').length,1);assert.equal(f.b.p.action.id,id);close(f.b.p.mana,mana-cost.manaCost);close(f.b.p.stamina,stamina-cost.staminaCost);close(f.b.p.cooldowns[id],cost.cooldown);
 }else{
  assert.equal(events.filter(e=>e.type==='actionStarted').length,1);assert.equal(f.b.p.action.id,id);close(f.b.p.mana,before.mana-eligibility.manaCost);close(f.b.p.stamina,before.stamina-eligibility.staminaCost);assert.equal(f.b.p.cooldowns[id],f.b.p.action.spec.cooldown);
 }
});
test('held disarmed basic attack reports once but still starts automatically after expiry; a fresh press reports again',()=>{
 const f=fixture();applyHeroStatus(f.b,'r11_disarm','fixture-source');
 assert.equal(tick(f,{attack:true},0).filter(e=>e.type==='skillIntentRejected').length,1);
 assert.equal(run(f,.2,{attack:true}).filter(e=>e.type==='skillIntentRejected').length,0);
 tick(f,{},0);assert.equal(tick(f,{attack:true},0).filter(e=>e.type==='skillIntentRejected').length,1);
 const events=run(f,1.8,{attack:true});assert.equal(events.filter(e=>e.type==='actionStarted').length,1);assert.equal(f.b.p.action.id,'mace_swing');
});
test('shared rejection precedence changes from status to cooldown to actual quoted resource without payment',()=>{
 const f=fixture({cleansing_touch:1}),id='lay_on_hands';applyHeroStatus(f.b,'r11_silence','fixture-source');f.b.p.cooldowns[id]=4;f.b.p.mana=0;f.b.p.manaDelay=10;
 assert.equal(actionEligibility(f.b,id).blockedReason,'silence');run(f,2);assert.equal(actionEligibility(f.b,id).blockedReason,'cooldown');run(f,2);assert.equal(actionEligibility(f.b,id).blockedReason,'mana');
 const before=snapshot(f.b),event=tick(f,{heal:true},0).find(e=>e.type==='skillIntentRejected');assert.equal(event.blockedReason,'mana');assert.equal(event.manaCost,30);assert.equal(actionBlockedText(event),'마나 부족 · 필요 30 / 현재 0');assert.deepEqual(snapshot(f.b),before);
});
test('Banner-discounted failed spell reports its actual payable quote, not the base catalog cost',()=>{
 const f=fixture({battle_banner:1,banner_of_zeal:3,cleansing_touch:1});placeBanner(f);f.b.p.mana=20;f.b.p.manaDelay=10;
 const before=snapshot(f.b),cost=quoteAction(f.b,'lay_on_hands').manaCost,event=tick(f,{heal:true},0).find(e=>e.type==='skillIntentRejected');assert.equal(cost,21);assert.equal(event.manaCost,cost);assert.equal(event.blockedReason,'mana');assert.equal(actionBlockedText(event),'마나 부족 · 필요 21 / 현재 20');assert.deepEqual(snapshot(f.b),before);
});
test('queued spell rechecks the same status eligibility after its unrelated charge recovery and drops the intent without cost',()=>{
 const f=fixture({cleansing_touch:1});tick(f,{charge:true},0);while(f.b.p.action.duration-f.b.p.action.elapsed>.16+1e-9)tick(f);
 tick(f,{heal:true},0);assert.equal(f.b.skillIntent.id,'lay_on_hands');applyHeroStatus(f.b,'r11_silence','fixture-source');assert.equal(f.b.p.action.id,'shield_charge');
 const mana=f.b.p.mana,events=run(f,.2),rejected=events.find(e=>e.type==='skillIntentRejected');assert.equal(rejected.blockedReason,'silence');assert.equal(rejected.learned,true);assert.equal(f.b.p.mana,mana);assert.equal(f.b.p.cooldowns.lay_on_hands??0,0);assert.equal(f.b.skillIntent,null);run(f,2);assert.equal(f.b.p.action,null);
});
test('unlearned and dead queries are safe and never invent a usable cost',()=>{
 const f=fixture();assert.equal(actionEligibility(f.b,'lay_on_hands').blockedReason,'unlearned');assert.equal(actionBlockedText(actionEligibility(f.b,'lay_on_hands')),'훈련 필요');f.b.p.hp=0;assert.equal(actionEligibility(f.b,'mace_swing').blockedReason,'dead');
});
test('low stamina feedback comes from the real charge rejection and leaves all resources/CD untouched',()=>{
 const f=fixture();f.b.p.stamina=0;f.b.p.staminaDelay=10;const before=snapshot(f.b),rejected=tick(f,{charge:true},0).find(e=>e.type==='skillIntentRejected');assert.equal(rejected.blockedReason,'stamina');assert.equal(actionBlockedText(rejected),`기력 부족 · 필요 ${rejected.staminaCost} / 현재 0`);assert.deepEqual(snapshot(f.b),before);
});
