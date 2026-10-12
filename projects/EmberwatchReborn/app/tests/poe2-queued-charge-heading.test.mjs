import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {poeControlPreset,enableSkillLoadout} from '../src/controls.js';
import {createBattle,acceptBattleInput,stepBattle,clearPoeInput} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function fixture({version=4,tracking=false}={}){
 let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 let c=poeControlPreset(s.options.controls);c.chargeDirection='movement';c.poe.cursorTrackingAfterRelease=tracking;
 if(version===5)c=enableSkillLoadout(c,{skills:s.character.skills,actionSlots:s.actionSlots});
 s=reduceRuntime(s,{type:'setControls',controls:c}).state;
 const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=b.p.y=600;b.enemies=[];b.awaitingAdvance=false;return {s,b};
}
const sample=(f,extra={})=>({aim:{x:1000,y:600},chargeAngle:Math.PI/2,...extra});
const begin=(f,extra={})=>acceptBattleInput(f.b,sample(f,extra));
const tick=(f,dt,extra={})=>stepBattle(f.b,f.s.character,dt,sample(f,extra));
function run(f,seconds,hz=60,extra={}){const events=[];for(let t=0;t<seconds-1e-10;){const dt=Math.min(1/hz,seconds-t);events.push(...tick(f,dt,extra));t+=dt;}return events;}
function prepare(f,origin,hz){
 if(origin==='mace'){begin(f,{attack:true,attackPressed:true,attackHeld:false});run(f,f.b.p.action.duration-.14,hz);}
 else{begin(f,{dodgeOnly:true});run(f,.28,hz);}
}
for(const version of [4,5])for(const tracking of [false,true])for(const hz of [30,60,120])for(const origin of ['mace','roll'])test(`queued charge controls${version} tracking${tracking} ${hz}Hz ${origin} respects movement heading and unchanged payment/contact/travel`,()=>{
 const f=fixture({version,tracking});prepare(f,origin,hz);const before=f.b.p.stamina,cd=f.b.p.cooldowns.shield_charge??0;
 begin(f,{charge:true});assert.equal(f.b.skillIntent?.id,'shield_charge');near(f.b.skillIntent.remaining,.18);near(f.b.p.stamina,before);near(f.b.p.cooldowns.shield_charge??0,cd);
 const starts=[];for(let n=0;n<100&&f.b.p.action?.id!=='shield_charge';n++)starts.push(...tick(f,1/hz));
 assert.equal(f.b.p.action?.id,'shield_charge');assert.equal(starts.filter(e=>e.type==='actionStarted'&&e.id==='shield_charge').length,1);
 const charge=f.b.p.action;near(charge.angle,Math.PI/2);near(f.b.p.stamina,before-charge.spec.staminaCost);near(f.b.p.cooldowns.shield_charge,charge.spec.cooldown-charge.elapsed);
 const x=f.b.p.x,y=f.b.p.y,elapsed=charge.elapsed;
 const events=run(f,charge.duration-elapsed,hz,{chargeAngle:Math.PI,aim:{x:600,y:1000}});
 near(charge.angle,Math.PI/2);near(f.b.p.x,x);near(f.b.p.y-y,Math.max(0,charge.spec.travelDuration-elapsed)*charge.spec.speed);
 assert.equal(events.filter(e=>e.type==='actionContact'&&e.id==='shield_charge').length,1);assert.equal(events.some(e=>e.type==='actionStarted'&&e.id==='shield_charge'),false);assert.equal(f.b.skillIntent,null);
});
test('pending movement heading refreshes before start, then locks; cursor-only queue keeps existing refresh',()=>{
 for(const movement of [true,false]){
  const f=fixture();prepare(f,'mace',60);begin(f,{charge:true,chargeAngle:movement?Math.PI/2:undefined});
  tick(f,.02,{chargeAngle:movement?Math.PI:undefined,aim:{x:600,y:1000}});
  const events=run(f,.2,60,{chargeAngle:movement?Math.PI:undefined,aim:{x:600,y:1000}});
  near(f.b.p.action.angle,movement?Math.PI:Math.PI/2);assert.equal(events.filter(e=>e.type==='actionStarted'&&e.id==='shield_charge').length,1);
 }
});
test('clearPoeInput cancels movement-directed queue and cannot replay it after resume',()=>{
 const f=fixture();prepare(f,'mace',60);begin(f,{charge:true});const stamina=f.b.p.stamina;
 clearPoeInput(f.b,'blur');const events=run(f,1);assert.equal(f.b.skillIntent,null);assert.equal(events.some(e=>e.type==='actionStarted'&&e.id==='shield_charge'),false);assert.ok(f.b.p.stamina>=stamina);near(f.b.p.cooldowns.shield_charge??0,0);
});
