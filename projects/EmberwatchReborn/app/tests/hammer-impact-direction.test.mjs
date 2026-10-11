import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';
import {poeControlPreset} from '../src/controls.js';
import {createBattle,stepBattle,acceptBattleInput,configurePoeControls} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {fixture as expertFixture,enemy,noncriticalSeed} from './support/expert-fixture.mjs';

// Inspect actual hitEnemy-produced impact payloads from moving projectiles.
// Expert return tests use the existing synthetic progression fixture, not QA play.
const nearAngle=(a,b)=>assert.ok(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-8,`${a} != ${b}`);
function fixture({poe=true,angle=0}={}){
 let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(poe){const r=reduceRuntime(s,{type:'setControls',controls:poeControlPreset(s.options.controls)});assert.equal(r.ok,true);s=r.state;}
 const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=b.p.y=600;
 b.enemies=[{id:'target',kind:'scout',x:600+300*Math.cos(angle),y:600+300*Math.sin(angle),hp:100,max:100,active:true,state:'idle',timer:0,stun:10,angle:angle+Math.PI}];return {s,b};
}
const aim=(f,angle)=>({x:f.b.p.x+500*Math.cos(angle),y:f.b.p.y+500*Math.sin(angle)});
function hitOnce({hz,poe=true,reverse=false,angle=0}){
 const f=fixture({poe,angle}),events=[];acceptBattleInput(f.b,{hammer:true,aim:aim(f,angle)});
 let shot=null,impact=null;
 for(let elapsed=0;elapsed<1;elapsed+=1/hz){
  const next=stepBattle(f.b,f.s.character,1/hz,{aim:aim(f,reverse&&elapsed>=.53?angle+Math.PI:angle)});events.push(...next);shot=f.b.shots[0]??shot;
  if(next.some(e=>e.type==='enemyHit')){impact=f.b.effects.findLast(e=>e.type==='impact');break;}
 }
 assert.ok(impact);assert.ok(shot);const hits=events.filter(e=>e.type==='enemyHit');assert.equal(hits.length,1);assert.equal(hits[0].context.originSkillId,'righteous_hammer');assert.equal(hits[0].context.procDepth,0);assert.equal(shot.hitIds.length,1);
 assert.equal(events.filter(e=>e.type==='sound'&&e.name==='heavyHit').length,1);assert.ok(hits[0].damage>0);assert.ok(Math.abs(100-f.b.enemies[0].hp-hits[0].damage)<1e-8);
 nearAngle(Math.atan2(shot.vy,shot.vx),angle);nearAngle(impact.angle,angle);if(reverse)nearAngle(f.b.p.angle,angle+Math.PI);
 return {hit:hits[0],impact};
}
for(const hz of [30,60,120])for(const reverse of [false,true])test(`${hz}Hz PoE travelling hammer impact follows the projectile with reverse aim=${reverse}`,()=>{hitOnce({hz,reverse});});
for(const hz of [30,60,120])test(`${hz}Hz legacy travelling hammer also preserves contact direction after the hero turns`,()=>{hitOnce({hz,poe:false,reverse:true});});
for(const hz of [30,60,120])test(`${hz}Hz vertical, diagonal and westward projectile impacts keep their own heading`,()=>{
 for(const angle of [Math.PI/2,-Math.PI/3,Math.PI])hitOnce({hz,reverse:true,angle});
});
for(const hz of [30,60,120])test(`${hz}Hz actual returning hammer uses each leg heading without extra hits or payment`,()=>{
 for(const poe of [false,true]){
  const f=expertFixture({hammer_of_devotion:1});if(poe)configurePoeControls(f.b,poeControlPreset(f.s.options.controls));const e=enemy(f,{x:440}),mana=f.b.p.mana;f.b.seed=noncriticalSeed();
  acceptBattleInput(f.b,{hammer:true,aim:aim(f,0)});const spec=f.b.p.action.spec;f.b.p.manaDelay=100;const hits=[],headings=[],events=[];
  for(let elapsed=0;elapsed<4&&(f.b.p.action||f.b.shots.length);elapsed+=1/hz){
   const next=stepBattle(f.b,f.s.character,1/hz,{aim:aim(f,elapsed>=.6?Math.PI/2:0)});events.push(...next);
   for(const hit of next.filter(e=>e.type==='enemyHit'&&e.context.procDepth===0)){hits.push(hit);headings.push(f.b.effects.findLast(e=>e.type==='impact').angle);}
  }
  assert.deepEqual(hits.map(e=>e.context.hitId),['1:outward:target','1:return:target']);assert.equal(events.filter(e=>e.type==='hammerReturned').length,1);nearAngle(headings[0],0);nearAngle(headings[1],Math.PI);
  assert.ok(Math.abs(mana-f.b.p.mana-spec.manaCost)<1e-8);assert.ok(Math.abs(e.max-e.hp-hits.reduce((n,e)=>n+e.damage,0))<1e-8);assert.equal(f.b.shots.length,0);
 }
});
test('stationary synthetic projectiles retain finite fallback heading without altering hit identity',()=>{
 const f=fixture();const e=f.b.enemies[0];f.b.p.angle=Math.PI/2;f.b.shots.push({kind:'hammer',enemy:false,x:e.x,y:e.y,vx:0,vy:0,damage:10,life:1,hitIds:[],castId:7,originSkillId:'righteous_hammer'});
 const events=stepBattle(f.b,f.s.character,.01,{aim:aim(f,Math.PI/2)});assert.equal(events.filter(e=>e.type==='enemyHit').length,1);nearAngle(f.b.effects.findLast(e=>e.type==='impact').angle,Math.PI/2);assert.equal(events.find(e=>e.type==='enemyHit').context.hitId,'7:outward:target');
});
