import test from 'node:test';import assert from 'node:assert/strict';import {frameDelta} from '../src/runtime-clock.js';
test('resume after an already queued rAF timestamp clamps a negative delta to zero',()=>assert.equal(frameDelta(1000,1000.6),0));
test('normal frame keeps its exact delta',()=>assert.equal(frameDelta(1016,1000),.016));
test('zero elapsed time never invents a simulation tick',()=>assert.equal(frameDelta(1000,1000),0));
test('background stalls cap simulation rather than fast-forward enemies',()=>assert.equal(frameDelta(25000,1000),.05));
test('invalid clocks fail closed without an invalid combat step',()=>{for(const n of [NaN,Infinity,-Infinity,undefined,'12']){assert.equal(frameDelta(n,0),0);assert.equal(frameDelta(0,n),0);}});
import {frameWasSuspended} from '../src/runtime-clock.js';
test('render suspension asks for explicit resume rather than one unseen combat tick',()=>{assert.equal(frameWasSuspended(2000,1000),true);assert.equal(frameWasSuspended(1501,1000),true);assert.equal(frameWasSuspended(1500,1000),false);assert.equal(frameWasSuspended(1016,1000),false);assert.equal(frameWasSuspended(999,1000),false);assert.equal(frameWasSuspended(NaN,1000),false);});
