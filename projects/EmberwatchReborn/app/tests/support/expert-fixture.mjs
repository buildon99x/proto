import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../../src/state.js';
import {grantExperience,xpForLevel} from '../../src/progression.js';
import {deriveStats,purchaseSkill} from '../../src/warrior-growth.js';
import {createBattle,stepBattle} from '../../src/combat.js';
import {mapFromRegion} from '../../src/world-geometry.js';
import {WARRIOR_REFERENCE} from '../../src/reference-warrior.js';
import {FOES} from '../../src/world.js';

// SYNTHETIC HANDLER FIXTURES ONLY. The starter command and XP/purchase reducers
// are real, but Expert promotion, target placement/taxonomy and selected RNG
// seeds below are injected. These tests are not earned play, campaign promotion,
// complete-save validation, screen/input review or evidence of game balance.
export const rows=new Map(WARRIOR_REFERENCE.skills.map(row=>[row.id,row]));
export const close=(actual,expected,message='')=>assert.ok(Math.abs(actual-expected)<1e-7,`${message}: ${actual} != ${expected}`);
export function expertState(skills={}){
 const trained=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}});
 assert.equal(trained.ok,true,trained.reason);const s=trained.state;
 let xp=0;for(let level=1;level<29;level++)xp+=xpForLevel(level);
 const grant=grantExperience(s.character,xp);assert.equal(grant.ok,true);s.character=grant.character;
 assert.equal(s.character.level,29);s.character.tier='expert';
 for(const [id,rank] of Object.entries(skills))learn(s,id,rank);
 return s;
}
export function learn(s,id,rank=1){
 const row=rows.get(id);if(row.baseId&&!s.character.skills[row.baseId])learn(s,row.baseId);
 while((s.character.skills[id]??0)<rank){const before=structuredClone(s.character),r=purchaseSkill(s.character,id,s);assert.equal(r.ok,true,`${id}: ${r.code}: ${r.reason}`);assert.deepEqual(s.character,before);s.character=r.character;}
}
export function fixture(skills={}){
 const s=expertState(skills),derived=deriveStats(s.character,s);assert.equal(derived.ok,true,derived.reason);
 const stats=derived.stats;s.vitals={hp:stats.hpMax,mana:stats.manaMax,stamina:stats.staminaMax};
 const b=createBattle(s);b.map=mapFromRegion({w:40,h:30});b.enemies=[];b.p.x=300;b.p.y=300;b.awaitingAdvance=false;
 return {s,b};
}
export function enemy(f,{id='target',x=345,y=300,hp=5000,kind='scout',inert=true,...extra}={}){
 const e={id,kind,x,y,hp,max:hp,angle:Math.PI,active:true,state:'idle',timer:0,stun:0,telegraph:null,...(inert?{gate:{objective:'synthetic_expert_fixture',minimum:1}}:{}),...extra};
 f.b.enemies.push(e);return e;
}
export function undeadTaxonomy(f,{armor=FOES.scout.armor,resistances={}}={}){
 f.b.foeTypes={...FOES,fixture_undead:{...FOES.scout,tags:['undead'],armor,resistances}};
}
export const aim=f=>({x:f.b.p.x+200,y:f.b.p.y});
export const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
export const cast=(f,pulse,dt=0)=>tick(f,{...(pulse==='battle_banner'?{expert1:pulse}:{[pulse]:true}),aim:aim(f)},dt);
export function until(f,predicate,{input={},dt=.02,limit=4000}={}){
 const events=[];for(let i=0;!predicate()&&i<limit;i++)events.push(...tick(f,input,dt));
 assert.ok(predicate(),'Synthetic handler fixture did not reach its bounded condition');return events;
}
export function run(f,seconds,input={},dt=.02){const events=[];for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=dt)events.push(...tick(f,input,Math.min(dt,seconds-elapsed)));return events;}
export function placeBanner(f){const events=cast(f,'battle_banner');events.push(...until(f,()=>!!f.b.banner));events.push(...until(f,()=>!f.b.p.action));return events;}
export function seedFor(predicate,max=100000){for(let seed=0;seed<max;seed++){let state=seed;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};if(predicate(next))return seed;}throw new Error('No deterministic RNG fixture seed found');}
export const noncriticalSeed=()=>seedFor(next=>next()>.5&&next()>.5&&next()>.5&&next()>.5);
export function incoming(f,{owner=null,damage=20,damageType='fire',attackFamily='weapon',x=f.b.p.x+30,y=f.b.p.y}={}){
 f.b.shots.push({kind:'arrow',enemy:true,x,y,vx:-1000,vy:0,damage,damageType,attackerId:owner?.id??null,attackFamily,life:1});
}
