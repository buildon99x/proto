import test from 'node:test';
import assert from 'node:assert/strict';
import * as water from '../src/harbor-water.js';
test('water relief uses multiple nonaligned noise scales and repeats at the authored loop',()=>{
 assert.equal(typeof water.sampleWaterField,'function');
 for(const [x,z] of [[0,0],[1.2,-5.8],[-2.8,7.1]]) {
  const a=water.sampleWaterField(x,z,0),b=water.sampleWaterField(x,z,96);
  for(let i=0;i<3;i++)assert.ok(Math.abs(a[i]-b[i])<1e-8);
  assert.ok(Math.hypot(a[1],a[2])<2,'bounded surface gradient');
 }
 const values=Array.from({length:20},(_,i)=>water.sampleWaterField(i*.13,i*.13,8)[0]);
 assert.ok(new Set(values.map(v=>v.toFixed(5))).size>18,'diagonal sample is not a coherent stripe');
});
test('wake geometry has feathered alpha edges and remains water aligned',()=>{
 assert.equal(typeof water.buildWakeGeometryData,'function');
 const data=water.buildWakeGeometryData(5.3,1.7);
 assert.equal(data.positions.length/3,data.alpha.length);
 assert.ok(data.alpha.includes(0));assert.ok(data.alpha.some(a=>a>.5));
 for(let i=1;i<data.positions.length;i+=3)assert.equal(data.positions[i],0);
 assert.ok(data.positions.length<10000,'bounded static geometry');
});
