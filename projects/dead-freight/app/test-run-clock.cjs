'use strict';
const assert=require('node:assert/strict'),{RunClock}=require('./run-clock.js');
let checks=0;function check(name,fn){fn();checks++;console.log('PASS',name);}const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
check('100ms low-FPS frame receives six bounded simulation steps',()=>{const c=new RunClock();c.setActive(true,1000);const f=c.advance(1100);assert.equal(f.steps,6);near(f.steps*f.step,.1);near(c.elapsed,.1);});
check('fractional intervals accumulate instead of disappearing',()=>{const c=new RunClock();c.setActive(true,0);let steps=0;for(let i=1;i<=100;i++)steps+=c.advance(i).steps;assert.equal(steps,6);near(c.elapsed,.1);});
check('long stall keeps active elapsed time but caps CPU catch-up',()=>{const c=new RunClock();c.setActive(true,0);const f=c.advance(5000);assert.equal(f.steps,15);near(f.elapsed,5);near(f.dropped,4.75);assert.equal(c.advance(5000).steps,0);});
check('menu and pause intervals never become gameplay time on resume',()=>{const c=new RunClock();c.advance(10000);near(c.elapsed,0);c.setActive(true,10000);c.advance(11000);c.setActive(false,11050);near(c.elapsed,1.05);c.advance(30000);c.setActive(true,50000);assert.equal(c.advance(50000).steps,0);near(c.advance(50100).elapsed,1.15);});
check('reset, zero delta and invalid timestamps remain finite and monotonic',()=>{const c=new RunClock();c.setActive(true,1000);c.advance(1100);for(const now of [NaN,Infinity,900,1100]){const f=c.advance(now);assert.equal(f.steps,0);near(f.elapsed,.1);}c.reset(2000);assert.equal(c.active,false);near(c.elapsed,0);near(c.dropped,0);});
console.log(`${checks} deterministic run-clock checks passed.`);
