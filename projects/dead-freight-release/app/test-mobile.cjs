'use strict';const assert=require('node:assert/strict'),Touch=require('./touch-controls.js');let count=0;function test(n,f){f();count++;console.log('PASS',n);}
test('ordinary non-touch desktop does not create controls or require DOM',()=>{assert(!Touch.capable({navigator:{maxTouchPoints:0},matchMedia:()=>({matches:false})}));assert.equal(Touch.create({window:{navigator:{maxTouchPoints:0}}}).enabled,false);});
test('touch detection supports coarse pointers and hybrid touch hardware',()=>{assert(Touch.capable({navigator:{maxTouchPoints:2}}));assert(Touch.capable({matchMedia:()=>({matches:true})}));});
console.log(count+' mobile source checks passed; real Android remains unverified.');
