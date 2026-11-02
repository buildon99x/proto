import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { phase, smooth, seeded, defineWorld, clockTime, toolkit } from '../kit/world.js';
import { inspectWorld } from './look-world.mjs';
import { build } from 'esbuild';
import * as THREE from 'three';

const valid = () => ({name:'test-world',title:'Test world',description:'A test world.',duration:8,still:2,build(){return{};},tick(){}});
test('clock wraps at either end and does not depend on frame count',()=>{
  assert.equal(phase(0,8),0);assert.equal(phase(8,8),0);assert.equal(phase(-2,8),.75);assert.equal(phase(10,8),.25);
  assert.equal(smooth(-1),0);assert.equal(smooth(2),1);assert.equal(smooth(.5),.5);
});
test('skipped frames and low FPS do not slow the clock',()=>{
  assert.equal(clockTime(0,1000,8),1);
  assert.ok(Math.abs(clockTime(0,1200,8)-1.2)<1e-12);
  assert.equal(clockTime(7.5,1000,8),.5);
  assert.equal(clockTime(0,1000,8,1.5),1.5);
});
test('procedural detail is deterministic',()=>{
  const a=seeded(7),b=seeded(7),c=seeded(8);
  const aa=Array.from({length:100},()=>a()),bb=Array.from({length:100},()=>b());
  assert.deepEqual(aa,bb);assert.notEqual(aa[0],c());assert.ok(aa.every(n=>n>=0&&n<1));
});
test('definition rejects broken animation and framing contracts',()=>{
  for(const overrides of [{duration:0},{duration:Infinity},{still:8},{still:-1},{name:'Wrong Name'},{tick:null},{description:null},{contactTimes:[NaN]},{contactTimes:[1]},{bounds:[[0,0,0],[0,1,1]]},{bounds:[[0,0,0],[2,NaN,2]]}]) assert.throws(()=>defineWorld({...valid(),...overrides}));
  assert.equal(defineWorld(valid()).name,'test-world');
});
test('ground defaults to a flat broken cutout; raised slab requires explicit opt-in',()=>{
  const previous=globalThis.document;
  globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillStyle:'',fillRect(){}};}};}};
  try{
    for(const base of ['none','slab']){
      const stage=new THREE.Group(),W=toolkit(stage);
      if(base==='none')W.terrain(5,4,'#82935b',17);else W.terrain(5,4,'#82935b',17,{base});
      stage.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(stage);
      assert.ok(base==='none'?bounds.min.y>=.004:bounds.min.y<-.3,`base ${base}: ground minY ${bounds.min.y}`);
      const extrusions=stage.children.filter(o=>o.geometry?.type==='ExtrudeGeometry');
      assert.equal(extrusions.length,base==='none'?0:1);
      assert.ok(base==='none'?stage.children.length>100:stage.children.length===2);
      assert.throws(()=>W.terrain(5,4,'#82935b',17,{base:'automatic-plinth'}));
      W.dispose();
    }
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('adult proportion and planted-foot rig work through bends and turns',()=>{
  const stage=new THREE.Group(),W=toolkit(stage),person=W.person(0,0);
  stage.updateMatrixWorld(true);
  const height=new THREE.Box3().setFromObject(person.root).getSize(new THREE.Vector3()).y;
  const headHeight=new THREE.Box3().setFromObject(person.face).getSize(new THREE.Vector3()).y;
  assert.ok(height/headHeight>6.6&&height/headHeight<7.6,`head ratio ${height/headHeight}`);
  for(const [crouch,lean,twist] of [[0,0,0],[.04,.1,.1],[.08,.16,-.15],[.02,.06,.2]]){
    W.plant(person,{crouch,lean,twist});stage.updateMatrixWorld(true);
    for(const side of [-1,1]){
      const foot=side<0?person.leftFoot:person.rightFoot;
      const ankle=foot.getWorldPosition(new THREE.Vector3());assert.ok(ankle.distanceTo(new THREE.Vector3(side*.13,.09,0))<.00002);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(foot.getWorldQuaternion(new THREE.Quaternion()));assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-8);
      const target=[side*.085,1.1,.26],actual=W.reach(person,side,target);assert.ok(Math.hypot(...actual.map((v,i)=>v-target[i]))<.025);
    }
  }
  W.dispose();
});
const examples=fileURLToPath(new URL('../examples/',import.meta.url));
test('fresh subject: juggling balls meet each catching/releasing palm',async()=>{
  const result=await build({entryPoints:[join(examples,'street-juggler.js')],bundle:true,write:false,format:'esm',platform:'node',alias:{'@diorama/worlds':fileURLToPath(new URL('../kit/world.js',import.meta.url))}});
  const {hand,ballPose}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  const near=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])))<1e-8;
  for(let i=0;i<3;i++)for(let k=0;k<2;k++){
    const start=k*1.5,side=k===0?-1:1;
    for(const [label,q,handSide] of [['release',start,side],['catch',start+1.15,-side]]){
      const t=((q-i)%3+3)%3;
      assert.ok(near(ballPose(t+i),hand(handSide,t)),`${label}: ball ${i} meets palm at ${t}`);
    }
  }
  for(let i=0;i<3;i++)assert.ok(near(ballPose(i),ballPose(i+3)));
});
for(const name of ['cricket','basketball','street-juggler','florist','pottery-studio','bakery','observatory']) test(`${name}: actual offline browser output`,{timeout:120000},async()=>{
  const output=resolve(process.env.WORLDS_TEST_OUTPUT??'work/worlds-tests',name);
  const report=await inspectWorld(join(examples,`${name}.js`),output);
  assert.ok(report.passed,JSON.stringify(report.checks.filter(c=>!c.pass),null,2));
});
