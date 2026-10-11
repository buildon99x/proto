import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionSafety} from '../src/action-safety.js';
import {createExpertInputCapture} from '../src/expert-input.js';
const slots={version:1,expert1:'zealous_onslaught',expert2:'battle_banner'};
function setup(){
 const capture=createExpertInputCapture(),owner={},battle={stateLife:0,region:'field',p:{action:{id:'zealous_onslaught'},stamina:41,cooldown:9}},calls=[];
 const safety=createActionSafety({capture,cancel:(b,reason)=>{calls.push({b,reason});b.p.action=null;return [{type:'safetyCancelled',reason}];}});
 capture.press('Digit2','expert1',slots,{canUse:()=>true});capture.snapshot();return {capture,owner,battle,calls,safety};
}
test('busy cancellation clears held capture immediately but waits for reconciled battle',()=>{
 const {capture,owner,battle,calls,safety}=setup();safety.request(battle,owner,'menu');
 assert.equal(safety.pending,true);assert.equal(capture.snapshot().channel.cancelReason,'menu');
 assert.equal(safety.drain(battle,owner,{busy:true}).status,'waiting');assert.equal(calls.length,0);assert.ok(battle.p.action);
 battle.p.stamina=40;const result=safety.drain(battle,owner);assert.equal(result.status,'cancelled');assert.deepEqual(result.events,[{type:'safetyCancelled',reason:'menu'}]);assert.equal(battle.p.stamina,40);assert.equal(battle.p.cooldown,9);assert.equal(battle.p.action,null);assert.equal(safety.pending,false);
 assert.equal(capture.press('Digit2','expert1',slots,{canUse:()=>true}),'zealous_onslaught');assert.equal(capture.snapshot().expert1,'zealous_onslaught');
});
for(const reason of ['blur','hidden','pointer-cancel','slot-edit','save-fault','death','store-busy-release'])test(`safety reason ${reason} never becomes normal release`,()=>{
 const {owner,battle,safety,calls}=setup();safety.request(battle,owner,reason);const r=safety.drain(battle,owner);assert.equal(r.events[0].reason,reason);assert.equal(calls.length,1);assert.equal(safety.drain(battle,owner).status,'empty');assert.equal(calls.length,1);
});
test('many safety signals keep one cancellation and do not queue stale actions',()=>{
 const {owner,battle,safety,calls}=setup();for(const r of ['menu','blur','hidden'])safety.request(battle,owner,r);assert.equal(safety.drain(battle,owner).events.length,1);assert.equal(calls.length,1);assert.equal(calls[0].reason,'menu');
});
for(const replacement of ['battle','owner','life','region'])test(`obsolete ${replacement} discards cancellation without touching fresh action`,()=>{
 const x=setup();x.safety.request(x.battle,x.owner,'menu');let b=x.battle,o=x.owner;if(replacement==='battle')b=structuredClone(b);if(replacement==='owner')o={};if(replacement==='life')b.stateLife++;if(replacement==='region')b.region='town';
 assert.equal(x.safety.drain(b,o).status,'obsolete');assert.equal(x.calls.length,0);assert.ok(b.p.action);assert.equal(x.safety.pending,false);assert.equal(x.capture.snapshot().channel,undefined);
});
test('blocked persistence does not silently permit channel cancellation/resume',()=>{
 const {owner,battle,safety,calls}=setup();safety.request(battle,owner,'save-fault');assert.equal(safety.drain(battle,owner,{blocked:true}).status,'waiting');assert.equal(safety.pending,true);assert.equal(calls.length,0);
});
test('a cancellation exception keeps pending state and capture for recovery gating',()=>{
 const capture=createExpertInputCapture(),b={stateLife:0,region:'field'},o={},s=createActionSafety({capture,cancel:()=>{throw Error('probe');}});s.request(b,o);assert.throws(()=>s.drain(b,o),/probe/);assert.equal(s.pending,true);
});
test('title/load reset drops scoped old job without producing offensive end',()=>{
 const {owner,battle,safety,calls,capture}=setup();safety.request(battle,owner);safety.reset();assert.equal(safety.pending,false);assert.equal(calls.length,0);assert.equal(capture.snapshot().channel,undefined);
});
test('no battle clears stale capture without creating a persistence job',()=>{
 const {owner,safety,capture}=setup();safety.request(null,owner,'title');assert.equal(safety.pending,false);assert.equal(capture.snapshot().channel,undefined);
});
