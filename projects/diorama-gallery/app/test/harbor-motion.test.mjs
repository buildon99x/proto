import test from 'node:test';
import assert from 'node:assert/strict';
import { cranePose, vesselPose, DURATION } from '../src/harbor-motion.js';
test('crane transfers cargo, releases at both berths and has continuous seam', () => {
  const a=cranePose(2), b=cranePose(13), released=cranePose(15);
  assert.equal(a.cargoX,-1.1); assert.equal(b.cargoX,1.65);
  assert.ok(Math.abs(b.hookY-(b.cargoY+.24))<1e-9);
  assert.ok(released.hookY>released.cargoY+.5);
  assert.deepEqual(cranePose(0),cranePose(DURATION));
  const p=cranePose(DURATION-1e-6),q=cranePose(0);
  for(const k of Object.keys(p)) assert.ok(Math.abs(p[k]-q[k])<1e-5);
});
test('all vessels are deterministic and seam-continuous',()=>{
 for(let i=0;i<4;i++) {
  assert.deepEqual(vesselPose(12,i),vesselPose(12,i));
  const a=vesselPose(0,i), b=vesselPose(DURATION,i);
  for(const k of Object.keys(a)) assert.ok(Math.abs(a[k]-b[k])<1e-8);
 }
});
