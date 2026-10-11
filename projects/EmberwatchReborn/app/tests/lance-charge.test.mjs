import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fixture,enemy,until,tick,close,noncriticalSeed,seedFor,learn} from './support/expert-fixture.mjs';
import {finishOnslaught,cancelBattleAction} from '../src/combat.js';
import {lanceReleaseScale,EXPERT_BALANCE,expertPreview} from '../src/warrior-expert.js';
import {onslaughtPresentation} from '../src/expert-presentation.js';

// Synthetic high-level tier, target placement and RNG; real combat/purchase
// handlers. Not earned progression, browser observation or pacing acceptance.
const held={channel:{ownerToken:'charge-test',held:true}};
function start(f){tick(f,{...held,expert1:'zealous_onslaught',aim:{x:1000,y:300}},0);assert.ok(f.b.p.action);}
function reach(f,pulses,dt=.02){until(f,()=>f.b.p.action.pulses===pulses,{input:held,dt});}
function target(f){const e=enemy(f,{x:f.b.p.x+80,y:f.b.p.y});f.b.foeTypes={...f.b.foeTypes,scout:{...f.b.foeTypes.scout,armor:100,resistances:{fire:50}}};return e;}

test('release curve is explicit authored balance with strict finite pulse input',()=>{
 assert.equal(EXPERT_BALANCE.source.measured,false);assert.equal(EXPERT_BALANCE.lance.fullPowerPulses,4);
 for(const [n,v] of [[0,0],[1,.25],[2,.5],[3,.75],[4,1],[16,1]])assert.equal(lanceReleaseScale(EXPERT_BALANCE.lance,n),v);
 for(const n of [-1,.5,NaN,Infinity,'4',null])assert.equal(lanceReleaseScale(EXPERT_BALANCE.lance,n),0);
 for(const cap of [0,-1,1.5,NaN,Infinity,null])assert.equal(lanceReleaseScale({fullPowerPulses:cap},4),0);
});
for(const rank of [1,2,3])for(const pulses of [1,2,3,4,8])for(const reason of ['release','wall','stamina'])test(`Lance${rank} ${pulses} pulses ${reason}: one scaled mixed packet`,()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:rank,crushing_might:3});start(f);reach(f,pulses);
 const a=f.b.p.action.spec,e=target(f),scale=Math.min(1,pulses/4),stamina=f.b.p.stamina,mana=f.b.p.mana,cd=f.b.p.cooldowns.zealous_onslaught;
 f.b.seed=noncriticalSeed();const draws=f.b.combatDraws;f.b.events=[];
 finishOnslaught(f.b,reason);const hits=f.b.events.filter(x=>x.type==='enemyHit');assert.equal(hits.length,1);
 close(hits[0].damage,(a.lance.physicalDamage/2+a.lance.fireDamage*.5)*scale);
 close(e.hp,e.max-hits[0].damage);assert.equal(f.b.combatDraws,draws+1);
 assert.equal(f.b.events.find(x=>x.type==='lanceResolved').releaseScale,scale);
 close(f.b.p.stamina,stamina);close(f.b.p.mana,mana);close(f.b.p.cooldowns.zealous_onslaught,cd);
 assert.equal(finishOnslaught(f.b,'release'),false);assert.equal(f.b.events.filter(x=>x.type==='enemyHit').length,1);
});
for(const dt of [.01,.02,.05])test(`real release boundary and charge cue partition dt${dt}`,()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:1});start(f);
 for(let pulses=1;pulses<=4;pulses++){reach(f,pulses,dt);const cue=onslaughtPresentation(f.b.p);assert.equal(cue.lanceScale,pulses/4);assert.match(cue.label,new RegExp(`선봉 ${pulses*25}%`));}
 const events=tick(f,{channel:{ownerToken:'charge-test',held:false,released:true}},0);
 assert.equal(events.filter(x=>x.type==='lanceResolved').length,1);assert.equal(events.find(x=>x.type==='lanceResolved').releaseScale,1);
});
test('accepted Lance snapshot survives a later rank purchase without release retargeting',()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:1});start(f);reach(f,1);const spec=f.b.p.action.spec;
 learn(f.s,'zealous_lance',3);assert.equal(spec.lance.rank,1);assert.equal(spec.lance.fullPowerPulses,4);assert.ok(Object.isFrozen(spec.lance));
 const e=target(f);f.b.seed=noncriticalSeed();f.b.events=[];finishOnslaught(f.b,'release');
 close(e.max-e.hp,(spec.lance.physicalDamage/2+spec.lance.fireDamage*.5)*.25);
});
test('scaled physical and fire share exactly one critical draw and full-power maximum',()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:3});start(f);reach(f,2);const a=f.b.p.action.spec;
 target(f);f.b.seed=seedFor(next=>next()<a.offense.criticalChance);const draws=f.b.combatDraws;f.b.events=[];finishOnslaught(f.b,'release');
 const hit=f.b.events.find(x=>x.type==='enemyHit');assert.equal(hit.critical,true);assert.equal(f.b.combatDraws,draws+1);
 close(hit.damage,(a.lance.physicalDamage/2+a.lance.fireDamage*.5)*.5*a.offense.criticalMultiplier);
});
test('fully charged safety cancellation still produces no Lance, charge or pending save action',()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:3});start(f);reach(f,4);target(f);f.b.events=[];
 cancelBattleAction(f.b,'menu');assert.equal(f.b.p.action,null);assert.equal(f.b.events.some(e=>e.type==='lanceResolved'||e.type==='enemyHit'),false);
});
test('full release threshold preserves the existing second payment at active one second',()=>{
 const f=fixture({zealous_onslaught:1,zealous_lance:1}),initial=f.b.p.stamina;start(f);reach(f,3);
 close(f.b.p.stamina,initial-9);assert.equal(onslaughtPresentation(f.b.p).lanceScale,.75);
 reach(f,4);close(f.b.p.stamina,initial-18);assert.equal(f.b.p.action.paidSeconds,2);
 tick(f,{channel:{ownerToken:'charge-test',held:false,released:true}},0);close(f.b.p.stamina,initial-18);
});
test('actual trainer effect projection exposes maximum pulse requirement, not a hidden damage reduction',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function effectText('),source.indexOf('\nasync function showNpc('));
 assert.ok(code.startsWith('function effectText(')&&!code.includes('async function showNpc('),'extract only the production formatter');
 const context=vm.createContext({});vm.runInContext(code,context);
 const f=fixture({zealous_onslaught:1,zealous_lance:1}),preview=expertPreview('zealous_lance',f.b.stats),text=context.effectText(preview);
 assert.equal(preview.lance.fullPowerPulses,4);assert.match(text,/25\/50\/75\/100%/);assert.match(text,/물리/);assert.match(text,/화염/);
});
