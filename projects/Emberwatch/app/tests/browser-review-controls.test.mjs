import test from 'node:test';import assert from 'node:assert/strict';
import {runtime} from './helpers/warrior-runtime.mjs';
function setup(){const h=runtime();h.beginRun();h.arena();h.isometric();const p=h.read().p;h.read().entities.push({type:'dummy',x:p.x+40,y:p.y,hp:1e9,max:1e9,r:12,active:false});return h;}
test('moving a pointer while J remains held does not redirect subsequent keyboard attacks',()=>{
 const h=setup();h.key('j');h.pointer(20,440);h.step(.01);assert(Math.abs(h.read().p.action.payload.angle)<1e-8);h.step(.6);h.pointer(20,120);h.step(.5);assert(h.read().p.action);assert(Math.abs(h.read().p.action.payload.angle)<.05);
});
test('explicit mouse attacks retain pointer aim when J is held, then keyboard targeting resumes',()=>{
 const h=setup();h.key('j');h.pointer(20,440);h.mouse({down:true});h.step(.01);assert(Math.abs(h.read().p.action.payload.angle)>1);h.mouse({down:false});h.step(1.1);const {p,entities}=h.read(),target=entities[0];assert(Math.abs(p.action.payload.angle-Math.atan2(target.y-p.y,target.x-p.x))<.05);
});
