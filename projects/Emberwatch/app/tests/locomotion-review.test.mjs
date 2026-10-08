// Actual source in a mocked DOM/Canvas. Not browser play evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {runtime} from './helpers/warrior-runtime.mjs';
import {RUN_GAIT,advanceLocomotion,resolveActorMotion} from '../src/motion.js';
import {spriteDirection,projectWorld} from '../src/visual.js';
import {AUDIO_EVENTS} from '../src/audio.js';
function warrior(){const h=runtime();h.beginRun();h.arena();h.isometric();return h;}
const directions=[['north',['w'],0,-1,3],['northeast',['w','d'],1,-1,3],['east',['d'],1,0,2],['southeast',['s','d'],1,1,0],['south',['s'],0,1,0],['southwest',['s','a'],-1,1,0],['west',['a'],-1,0,1],['northwest',['w','a'],-1,-1,3]];
for(const [name,keys,dx,dy,row] of directions)test(`pointer hover cannot override ${name} travel or the correct baked sprite row`,()=>{
 const h=warrior();h.pointer(1220,440);const p=h.read().p,start={x:p.x,y:p.y};keys.forEach(k=>h.key(k));h.step(.22);
 const travelled=projectWorld(p.x-start.x,p.y-start.y),facing=projectWorld(Math.cos(p.angle),Math.sin(p.angle));
 assert(travelled.x*dx+travelled.y*dy>0);assert.equal(spriteDirection(p.angle),row);if(Math.abs(dx)<.01)assert(Math.abs(facing.x)<1e-8);else assert.equal(Math.sign(facing.x),Math.sign(dx));assert(Math.abs(Math.atan2(facing.y,facing.x)-Math.atan2(dy,dx))<1e-8);
 const angle=p.angle,phase=p.walkPhase;keys.forEach(k=>h.key(k,false));const count=h.sounds.filter(s=>s.type==='footstep').length;h.step(.2);assert.equal(p.angle,angle);assert.equal(p.walkPhase,phase);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,count);assert.equal(p.moving,false);
});
test('attack/cast aim remains committed, then travel facing resumes without pointer movement',()=>{
 const h=warrior();h.pointer(1220,440);h.key('w');assert(h.attack());const p=h.read().p,angle=p.angle;h.pointer(20,440);h.step(.15);assert.equal(p.angle,angle);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,0);h.step(.6);assert.equal(spriteDirection(p.angle),3);assert(p.moving);
});
test('dodge faces its own travel, without stale pointer or previous attack facing',()=>{
 const h=warrior();h.pointer(20,440);h.key('d');assert(h.dodge());const p=h.read().p;assert.equal(spriteDirection(p.angle),2);h.step(.2);assert.equal(spriteDirection(p.angle),2);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,0);
});
test('touch movement follows the same travel-facing contract',()=>{
 const h=warrior();h.pointer(1220,440);h.touch('a');h.step(.2);assert.equal(spriteDirection(h.read().p.angle),1);h.touch('a',false);h.step(.1);assert.equal(h.read().p.moving,false);
});
test('wall collision, hurt and pause do not produce phantom steps',()=>{
 const h=warrior();h.key('d');h.step(.2);const p=h.read().p;h.wall();const phase=p.walkPhase,count=h.sounds.filter(s=>s.type==='footstep').length;h.step(.3);assert.equal(p.walkPhase,phase);assert.equal(p.moving,false);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,count);
 h.arena();h.key('d');h.damagePlayer(1,{x:100,y:100});h.step(.15);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,count);assert(h.cancellations.includes('heroStep'));
 h.key('Escape');h.step(.8);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,count);
});
test('run phase and both contact events follow distance at 30/60/120 Hz, stalls and speed changes',()=>{
 for(const dt of [1/30,1/60,1/120,.1])for(const speed of [79,158,181.7,240]){
  const p={angle:0,hp:150,action:null},contacts=[];let distance=0;
  for(let t=0;t<2-1e-8;t+=dt){const step=Math.min(dt,2-t),dx=speed*step;distance+=dx;contacts.push(...advanceLocomotion(p,dx,0,{dt:step}));}
  assert(Math.abs(p.walkPhase-((RUN_GAIT.startPhase+distance/RUN_GAIT.distance)%1))<1e-8);
  assert.equal(contacts.length,Math.floor((RUN_GAIT.startPhase+distance/RUN_GAIT.distance+1e-9)*2));
  contacts.forEach((c,i)=>{assert.equal(c.foot,i%2?'left':'right');assert.equal(c.frame,i%2?0:12);assert.equal(resolveActorMotion({hp:150,moving:true,walkPhase:c.phase},99,true).frame,c.frame);});
 }
 const p={hp:150,action:null};const a=advanceLocomotion(p,15,0);const phase=p.walkPhase;assert.equal(advanceLocomotion(p,0,0).length,0);assert.equal(p.walkPhase,phase);advanceLocomotion(p,-15,0);assert.equal(p.angle,Math.PI);assert.equal(a.length,0);
});
test('footsteps are exactly 30% louder than 0.4.2, dry and low priority',()=>{
 assert.equal(AUDIO_EVENTS.footstep.gain,.1105);assert(Math.abs(AUDIO_EVENTS.footstep.gain/.085-1.3)<1e-12);assert.equal(AUDIO_EVENTS.footstep.wet,0);assert(AUDIO_EVENTS.footstep.priority<AUDIO_EVENTS.hit.priority);
});


test('all eight travel inputs normalize world speed; War Cry speed changes gait by the same distance',()=>{
 for(const boost of [false,true])for(const [,keys] of directions){const h=warrior(),p=h.read().p,start={x:p.x,y:p.y};if(boost)p.warcry=10;keys.forEach(k=>h.key(k));h.step(.4);const length=Math.hypot(p.x-start.x,p.y-start.y),expected=158*(boost?1.15:1)*.4;assert(Math.abs(length-expected)<1e-7);assert(Math.abs(p.walkPhase-((RUN_GAIT.startPhase+length/RUN_GAIT.distance)%1))<1e-7);}
});
test('dodge landing resumes the existing gait without duplicate or extra landing footsteps',()=>{
 const h=warrior();h.key('d');h.step(.1);const p=h.read().p,phase=p.walkPhase;h.dodge();h.step(.3);assert.equal(p.walkPhase,phase);assert.equal(h.sounds.filter(s=>s.type==='footstep').length,0);h.step(.3);const steps=h.sounds.filter(s=>s.type==='footstep');assert(steps.length<=2);assert(steps.every((s,i)=>!i||s.options.foot!==steps[i-1].options.foot));
});
