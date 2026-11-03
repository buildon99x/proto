import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const file=new URL('../src/dubai-motion.js',import.meta.url);
test('metro crosses city on a diagonal open route with explicit return service',async()=>{
 assert.ok(existsSync(file),'dedicated diagonal transit module exists');
 const {railPose,TRACK_LENGTH,trainState,CAR_SPACING}=await import(file);
 const start=railPose(0),end=railPose(TRACK_LENGTH);
 assert.ok(start.x<-6&&start.z>6);assert.ok(end.x>6&&end.z< -1);assert.ok(Math.hypot(end.x-start.x,end.z-start.z)>14,'route is not a compact oval');
 assert.equal(CAR_SPACING,.98);
 for(let t=0;t<60;t+=.1){const s=trainState(t);assert.ok(s.distance>=1.9&&s.distance<=TRACK_LENGTH-1.9);for(let i=0;i<4;i++){const a=railPose(s.distance+(i-1.5)*CAR_SPACING);assert.ok(Number.isFinite(a.x+a.z+a.yaw));if(i){const b=railPose(s.distance+(i-2.5)*CAR_SPACING);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>.94,'cars maintain physical spacing');}}}
});
test('metro dwells and reverses smoothly without pose teleport or clock drift',async()=>{
 assert.ok(existsSync(file));const {trainState}=await import(file);
 assert.deepEqual(trainState(0),trainState(60));assert.deepEqual(trainState(-1),trainState(59));
 for(const t of [0,26,30,56,60]){const a=trainState(t-.001),b=trainState(t+.001);assert.ok(Math.abs(a.distance-b.distance)<.001,'continuous terminal transitions');}
 assert.equal(trainState(27).distance,trainState(29).distance);assert.equal(trainState(57).distance,trainState(59).distance);
 assert.ok(trainState(10).distance<trainState(20).distance);assert.ok(trainState(40).distance>trainState(50).distance);
});
