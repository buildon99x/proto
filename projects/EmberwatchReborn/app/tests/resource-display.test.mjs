import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {formatResourceAmount,formatResourceCost} from '../src/resource-display.js';
import {actionEligibility,applyHeroStatus,quoteAction} from '../src/combat.js';
import {actionBlockedText} from '../src/action-feedback.js';
import {fixture,placeBanner,tick} from './support/expert-fixture.mjs';

// Synthetic skill/pool fixtures, not native input, rendered pixels or earned
// progression. Execute actual main HUD and frame rejection processing against
// minimal DOM/audio probes, plus real quote/eligibility/stepBattle handlers.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),imports={};
for(const row of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'/gm)){
 const module=await import(new URL('../src/'+row[2].replace('./',''),import.meta.url));
 for(const name of row[1].split(',').map(s=>s.trim()))imports[name]=module[name];
}
function fn(name){
 const match=new RegExp(`function ${name}\\(`).exec(source);assert.ok(match,name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const text=source.slice(match.index,end+1);
  try{new vm.Script('('+text+')');return text;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error(name);
}
const declaration=name=>source.split('\n').find(line=>line.startsWith(`const ${name}=`));
const rejectionLoop=fn('deliverCombatEvents').split('\n').find(line=>line.includes("for(const e of events){")&&line.includes("skillIntentRejected"));
assert.ok(rejectionLoop,'actual main frame rejection loop');
function hud(f){
 const node=()=>({innerHTML:'',textContent:'',attributes:{},classes:new Set(),setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){},remove(){}}});
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const buttons=Object.fromEntries(['attack','hammer','charge','block','heal','judgement','expert1','expert2','potion'].map(a=>{const el=node();el.classList.toggle=(k,v)=>v?el.classes.add(k):el.classes.delete(k);el.classList.remove=(...keys)=>keys.forEach(k=>el.classes.delete(k));return [a,el];}));
 $('hotbar').querySelector=selector=>buttons[/data-(?:combat|action)="([^"]+)"/.exec(selector)?.[1]]??null;
 const env={...imports,state:f.s,battle:f.b,canvas:{width:1024},$,lastObjectiveHtml:'',config:()=>imports.controlsFor(f.s),keyName:a=>imports.actionLabel(imports.controlsFor(f.s),a),visibleAction:()=>true};
 const update=new Function(...Object.keys(env),[declaration('esc'),declaration('button'),declaration('tierLabel'),fn('updateHud'),'return updateHud;'].join('\n'))(...Object.values(env));
 const toasts=[],feedback=new Function('events','audio','toast','actionBlockedText','inputLatency','battle','dismissRecoveryNotice','$','noticeUntil','projectWorld',fn('deliverCombatAudio')+'\n'+rejectionLoop);
 return {update,buttons,toasts,feedback:events=>feedback(events,{play(){},cancel(){}},t=>toasts.push(t),actionBlockedText,imports.createInputLatency(),f.b,imports.dismissRecoveryNotice,$,0,imports.projectWorld),pool(kind){return new RegExp(`<div class="bar ${kind}">.*?<span>([^<]+)</span>`).exec($('vitals').innerHTML)?.[1];}};
}
function adjacent(value,direction){const data=new DataView(new ArrayBuffer(8));data.setFloat64(0,value);data.setBigUint64(0,data.getBigUint64(0)+BigInt(direction));return data.getFloat64(0);}
const scenarios=[
 {name:'Trial by Fire 37.5 MP',skills:{trial_by_fire:1},id:'judgement',pulse:'judgement',pool:'mana',bar:'mana',cost:37.5,below:'37.499',label:'MP',long:'마나'},
 {name:'Zeal-discounted Trial by Fire 33.75 MP',skills:{trial_by_fire:1,battle_banner:1,banner_of_zeal:1},banner:true,id:'judgement',pulse:'judgement',pool:'mana',bar:'mana',cost:33.75,below:'33.749',label:'MP',long:'마나'},
 {name:'shielded Onslaught 11.25 stamina',skills:{zealous_onslaught:1,zealous_shield:1},id:'zealous_onslaught',pulse:'expert1',pool:'stamina',bar:'stamina',cost:11.25,below:'11.249',label:'기력',long:'기력'},
 {name:'Grace-discounted shielded Onslaught 7.875 stamina',skills:{zealous_onslaught:1,zealous_shield:1,armored_grace:2},id:'zealous_onslaught',pulse:'expert1',pool:'stamina',bar:'stamina',cost:7.875,below:'7.874',label:'기력',long:'기력'}
];
const boundaries=[
 ['just below',c=>c-.0001,false],['below by 1e-10',c=>c-1e-10,false],['adjacent float below',c=>adjacent(c,-1),false],
 ['exact',c=>c,true],['adjacent float above',c=>adjacent(c,1),true],['above by 1e-10',c=>c+1e-10,true],['just above',c=>c+.0001,true]
];
for(const scenario of scenarios)for(const [name,amount,ready] of boundaries)test(`${scenario.name}: ${name} HUD, aria and actual acceptance/payment agree`,()=>{
 const c=scenario,f=fixture(c.skills);if(c.banner)placeBanner(f);
 if(c.id==='zealous_onslaught')f.s.actionSlots={expert1:c.id,expert2:null};
 const quote=quoteAction(f.b,c.id);assert.equal(quote[c.pool+'Cost'],c.cost,'actual learned/discounted runtime quote');
 f.b.p[c.pool]=amount(c.cost);f.b.p[c.pool+'Delay']=10;
 const h=hud(f),before=structuredClone(f.b),stateBefore=structuredClone(f.s),shown=ready?String(c.cost):c.below;
 h.update();assert.deepEqual(f.b,before,'HUD never changes battle');assert.deepEqual(f.s,stateBefore,'HUD never changes durable state');
 assert.equal(h.pool(c.bar),`${shown} / ${f.b.stats[c.pool+'Max']}`);
 const detail=ready?`${c.label} ${c.cost}`:`${c.label} 부족 · ${c.cost}`;
 assert.ok(h.buttons[c.pulse].innerHTML.includes(`<em>${detail}</em>`));assert.ok(h.buttons[c.pulse].attributes['aria-label'].endsWith(detail));
 assert.equal(h.buttons[c.pulse].classes.has('resource-low'),!ready);
 const eligibility=actionEligibility(f.b,c.id);assert.equal(eligibility.ready,ready);
 assert.equal(eligibility.blockedReason,ready?null:c.pool);assert.ok(Number(shown)<=f.b.p[c.pool]);
 const input=c.id==='zealous_onslaught'?{expert1:c.id,channel:{held:true,ownerToken:'resource-precision-fixture'}}:{[c.pulse]:true};
 const events=tick(f,input,0);h.feedback(events);
 if(!ready){
  const rejected=events.find(e=>e.type==='skillIntentRejected');assert.ok(rejected);assert.equal(rejected[c.pool+'Cost'],c.cost);assert.equal(rejected[c.pool],before.p[c.pool]);
  assert.equal(h.toasts.at(-1),`${c.long} 부족 · 필요 ${c.cost} / 현재 ${shown}`);
  for(const key of ['hp','mana','stamina','cooldowns','action','manaDelay','staminaDelay'])assert.deepEqual(f.b.p[key],before.p[key],key);
  assert.equal(f.b.castSerial,before.castSerial);assert.equal(f.b.skillIntent,null);assert.deepEqual(f.b.shots,before.shots);assert.deepEqual(f.b.areas,before.areas);
  assert.equal(events.some(e=>['actionStarted','channelPayment','sound'].includes(e.type)),false);
 }else{
  assert.equal(events.filter(e=>e.type==='actionStarted').length,1);assert.equal(h.toasts.length,0);assert.equal(f.b.p.action.id,c.id);
  assert.equal(f.b.p[c.pool],Math.max(0,Number((before.p[c.pool]-c.cost).toFixed(8))));
  assert.equal(f.b.p.cooldowns[c.id],quote.cooldown);assert.equal(f.b.p[c.pool==='mana'?'stamina':'mana'],before.p[c.pool==='mana'?'stamina':'mana']);
 }
});
test('actual HUD updates the discounted quote and low-resource state when a real Banner expires',()=>{
 const f=fixture({trial_by_fire:1,battle_banner:1,banner_of_zeal:1});placeBanner(f);f.b.p.mana=35;f.b.p.manaDelay=10;
 const h=hud(f);h.update();assert.match(h.buttons.judgement.innerHTML,/<em>MP 33.75<\/em>/);assert.equal(actionEligibility(f.b,'judgement').ready,true);
 // Expiry through the real runtime; no substitute quote or eligibility logic.
 f.b.banner.remaining=.01;tick(f,{},.02);h.update();assert.equal(f.b.banner,null);assert.equal(quoteAction(f.b,'judgement').manaCost,37.5);
 assert.equal(h.pool('mana'),`35 / ${f.b.stats.manaMax}`);assert.match(h.buttons.judgement.attributes['aria-label'],/MP 부족 · 37.5$/);
 h.feedback(tick(f,{judgement:true},0));assert.equal(h.toasts.at(-1),'마나 부족 · 필요 37.5 / 현재 35');
});
for(const [name,values,expected] of [
 ['full',null,null],['empty mana/stamina with fractional living HP',{hp:.001,mana:0,stamina:0},{health:'1',mana:'0',stamina:'0'}],
 ['dead and empty',{hp:0,mana:0,stamina:0},{health:'0',mana:'0',stamina:'0'}],
 ['fractional pools',{hp:37.001,mana:37.499,stamina:11.249},{health:'38',mana:'37.499',stamina:'11.249'}]
])test(`actual HUD ${name} preserves health ceiling and conservative pool text`,()=>{
 const f=fixture({trial_by_fire:1});if(values)Object.assign(f.b.p,values);const h=hud(f),before=structuredClone(f.b);h.update();
 for(const [bar,pool] of [['health','hp'],['mana','mana'],['stamina','stamina']])assert.equal(h.pool(bar),`${expected?.[bar]??f.b.stats[pool+'Max']} / ${f.b.stats[pool+'Max']}`);
 if(values?.hp===0){assert.match(h.buttons.judgement.attributes['aria-label'],/쓰러짐 · 행동 불가$/);assert.equal(actionEligibility(f.b,'judgement').blockedReason,'dead');}
 assert.deepEqual(f.b,before);
});
for(const invalid of [NaN,Infinity,-Infinity,-1,undefined,'37.5'])test(`invalid ${String(invalid)} is unknown display text, never an invented usable value`,()=>{
 assert.equal(formatResourceAmount(invalid),'?');assert.equal(formatResourceAmount(invalid,{health:true}),'?');assert.equal(formatResourceCost(invalid),'?');
 const f=fixture({trial_by_fire:1});f.b.p.mana=invalid;f.b.p.stamina=invalid;const h=hud(f),before=structuredClone(f.b);h.update();
 assert.equal(h.pool('mana'),`? / ${f.b.stats.manaMax}`);assert.equal(h.pool('stamina'),`? / ${f.b.stats.staminaMax}`);assert.deepEqual(f.b,before);
 assert.equal(actionBlockedText({blockedReason:'mana',manaCost:37.5,mana:invalid}),'마나 부족 · 필요 37.5 / 현재 ?');
 assert.equal(actionBlockedText({blockedReason:'stamina',staminaCost:invalid,stamina:invalid}),'기력 부족 · 필요 ? / 현재 ?');
});
test('formatting retains exact quoted decimals and never introduces an optimistic thousandth',()=>{
 for(const value of [0,-0,.001,.009,.1,.29,1.15,11.25,33.75,37.5,100,33.75000001,37.12345678,Number.MAX_VALUE])assert.equal(formatResourceCost(value),String(value));
 for(let cents=1;cents<=40000;cents++)for(const value of [cents/1000,adjacent(cents/1000,-1),adjacent(cents/1000,1)]){
  const shown=Number(formatResourceAmount(value));assert.ok(shown<=value,`${value} must not display ${shown}`);assert.ok(value-shown<.00100000001);
  if(value===cents/1000)assert.equal(shown,value,'exact thousandths must not lose precision');
 }
 for(const hp of [Number.MIN_VALUE,.0000001,.01,.999,1,1.001])assert.ok(Number(formatResourceAmount(hp,{health:true}))>0);
});
for(const [rule,reason,text] of [['r11_stun','stun','기절 · 행동 불가'],['r11_silence','silence','침묵 · 시전 불가']])test(`actual HUD keeps ${reason} above cooldown and fractional resource shortage`,()=>{
 const f=fixture({trial_by_fire:1});applyHeroStatus(f.b,rule,'display-priority');f.b.p.mana=37.499;f.b.p.manaDelay=10;f.b.p.cooldowns.judgement=2;
 const h=hud(f);h.update();assert.equal(actionEligibility(f.b,'judgement').blockedReason,reason);assert.ok(h.buttons.judgement.attributes['aria-label'].endsWith(text));
 h.feedback(tick(f,{judgement:true},0));assert.equal(h.toasts.at(-1),actionBlockedText(actionEligibility(f.b,'judgement')));
});
