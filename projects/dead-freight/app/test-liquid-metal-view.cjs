'use strict';
const assert=require('node:assert/strict'),T=require('./vendor/three.min.js'),Metal=require('./liquid-metal.js'),View=require('./liquid-metal-view.js');
let count=0;
function test(name,run){run();count++;console.log('PASS',name);}
function enemy(state='idle',stateTime=0){const e={id:201,archetype:'silt',alive:true,x:3,y:0,z:-4};Metal.initialize(e);Object.assign(e.metal,{state,stateTime,remaining:1,yaw:.4,aimX:-Math.sin(.4),aimY:0,aimZ:-Math.cos(.4),coreExposed:state==='disrupted'||state==='reform'});return e;}
function finiteTree(g){g.traverse(o=>{for(const n of o.matrixWorld.elements)assert(Number.isFinite(n),o.name+' has nonfinite matrix');if(o.isMesh){assert(o.geometry.isBufferGeometry);assert(o.material.isMaterial&&!Array.isArray(o.material));for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));}});}
function bodyPoint(g,x,y,z){return g.localToWorld(new T.Vector3(x,y,z));}
function materialShader(material){const shader={uniforms:{},vertexShader:T.ShaderLib.phong.vertexShader,fragmentShader:T.ShaderLib.phong.fragmentShader};material.onBeforeCompile(shader);return shader;}
function holeContains(g,index,p){const u=g.userData.silt.uniforms,delta=p.clone().sub(u.siltHoleCenters.value[index]),along=delta.dot(u.siltHoleAxes.value[index]);return Math.abs(along)<.85&&delta.addScaledVector(u.siltHoleAxes.value[index],-along).length()<u.siltHoleRadii.value[index];}
test('UMD API creates original connected silver humanoid without lights or shared game resources',()=>{
 assert.equal(globalThis.DFLiquidMetalView,View);const e=enemy(),before=JSON.stringify(e),g=View.create(T,e),s=g.userData.silt;assert(g.isGroup);assert.equal(JSON.stringify(e),before);assert.equal(s.parts.torso.length,2);assert.equal(s.parts.arms.length,2);assert.equal(s.parts.legs.length,2);assert.equal(s.parts.head.position.y,1.83);assert(!s.parts.core.visible);assert.equal(g.rotation.y,e.metal.yaw);assert.equal(s.parts.puddle.raycast(),undefined);let lights=0;g.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);finiteTree(g);
});
test('torso and head conform to shared collision pose through shell disruption and reform',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt;
 for(const [state,age] of [['idle',0],['disrupted',.07],['disrupted',.8],['reform',.2],['reform',.9]]){
  Object.assign(e.metal,{state,stateTime:age,coreExposed:state==='disrupted'||state==='reform'});View.update(g,e,3+age);const p=Metal.pose(e);assert.equal(s.shell.scale.y,p.bodyScaleY);s.parts.torso.forEach((o,i)=>{assert.equal(o.position.x,(i===0?-1:1)*(.145+p.torsoSpread));o.geometry.computeBoundingBox();assert(Math.abs(o.geometry.boundingBox.max.x-.145)<1e-7);assert(Math.abs(o.geometry.boundingBox.min.y+.4)<1e-7);});assert(Math.abs(s.parts.head.getWorldPosition(new T.Vector3()).y-1.83*p.bodyScaleY)<1e-7);assert.equal(s.parts.core.visible,p.core.exposed);assert.equal(s.parts.core.position.y,1.25);assert.equal(s.parts.core.scale.x,.24);finiteTree(g);
 }
 assert(s.parts.torso[0].position.x<-.145);assert(s.parts.core.visible,'reforming core remains exposed');
});
test('forearms connect elbow to hand or active blade origin without detached pieces',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt;
 for(const [state,stateTime] of [['idle',0],['pursue',.3],['windup',.4],['strike',.08],['recovery',.3],['disrupted',.7],['reform',.3]]){
  Object.assign(e.metal,{state,stateTime,coreExposed:state==='disrupted'||state==='reform'});View.update(g,e,2+stateTime);
  for(const a of s.parts.arms){const elbow=a.elbow.getWorldPosition(new T.Vector3()),hand=a.hand.getWorldPosition(new T.Vector3()),upperEnd=a.upper.localToWorld(new T.Vector3(0,.5,0)),lowerStart=a.forearm.localToWorld(new T.Vector3(0,-.5,0)),lowerEnd=a.forearm.localToWorld(new T.Vector3(0,.5,0));assert(upperEnd.distanceTo(elbow)<1e-7);assert(lowerStart.distanceTo(elbow)<1e-7);assert(lowerEnd.distanceTo(hand)<1e-7);}
 }
});
test('blade extends along shared locked aim, telegraphs only windup, and retracts through recovery',()=>{
 const e=enemy('windup',.2),g=View.create(T,e),s=g.userData.silt;View.update(g,e,1);const early=s.parts.blade.scale.z;assert(s.parts.blade.visible&&s.parts.bladeWarning.visible);e.metal.stateTime=.7;View.update(g,e,1.5);assert(s.parts.blade.scale.z>early);e.metal.state='strike';e.metal.stateTime=.08;e.metal.aimY=.15;View.update(g,e,1.58);assert.equal(s.parts.blade.scale.z,Metal.pose(e).bladeLength);assert(!s.parts.bladeWarning.visible);const yaw=g.rotation.y,axis=new T.Vector3(0,0,-1).applyQuaternion(s.parts.blade.quaternion),p=Metal.pose(e),aim=new T.Vector3(p.bladeDirection.x,p.bladeDirection.y,p.bladeDirection.z).normalize();assert(axis.distanceTo(aim)<1e-7);e.metal.state='recovery';e.metal.stateTime=.5;View.update(g,e,2);assert(s.parts.blade.scale.z<3);assert.equal(g.rotation.y,yaw);e.metal.state='disrupted';e.metal.coreExposed=true;View.update(g,e,2.1);assert(!s.parts.blade.visible);
});
test('shell materials inject actual through-surface fragment discard and bounded six-cylinder uniforms',()=>{
 const g=View.create(T,enemy()),s=g.userData.silt,materials=new Set(s.shellMeshes.map(o=>o.material));assert.equal(View.MAX_HOLES,6);assert.equal(View.HOLE_LIFETIME,.6);
 for(const material of materials){const shader=materialShader(material);assert(shader.vertexShader.includes('siltInverseRoot * modelMatrix'));assert(shader.fragmentShader.includes('siltHoleCenters[6]'));assert(shader.fragmentShader.includes('i < 6'));assert(shader.fragmentShader.includes(') discard;'));assert.equal(shader.uniforms.siltHoleRadii.value.length,6);assert.equal(material.side,T.DoubleSide);assert(material.isMeshPhongMaterial);}
});
test('impact opens a cylinder with annular chrome rim and repairs on simulation time',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt,contact=bodyPoint(g,.12,1.2,-.175),direction=new T.Vector3(0,0,1).transformDirection(g.matrixWorld);e.metal.holes=[{point:contact,time:1,direction}];View.update(g,e,1);
 assert.equal(s.holes.length,1);assert(s.rims[0].visible);assert.equal(s.rims[0].geometry.type,'TorusGeometry');const center=s.uniforms.siltHoleCenters.value[0].clone(),axis=s.uniforms.siltHoleAxes.value[0];assert(holeContains(g,0,center));assert(holeContains(g,0,center.clone().addScaledVector(axis,.34)),'opening passes through opposite shell surface');assert(!holeContains(g,0,center.clone().add(new T.Vector3(.25,0,0))));const radius=s.uniforms.siltHoleRadii.value[0];View.update(g,e,1.3);assert(s.uniforms.siltHoleRadii.value[0]<radius);assert(s.uniforms.siltHoleRadii.value[0]>0);View.update(g,e,1.6);assert.equal(s.holes.length,0);assert(s.rims.every(o=>!o.visible));assert([...s.uniforms.siltHoleRadii.value].every(r=>r===0));
});
test('bullet holes stay attached when sentinel moves and rotates; repeats and pause do not drift',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt,h={point:bodyPoint(g,.12,1.2,-.175),direction:new T.Vector3(0,0,1).transformDirection(g.matrixWorld),time:1};e.metal.holes=[h];View.update(g,e,1);const local=s.uniforms.siltHoleCenters.value[0].clone(),radius=s.uniforms.siltHoleRadii.value[0];e.x+=6;e.z-=7;e.metal.yaw+=1;View.update(g,e,1);assert(s.uniforms.siltHoleCenters.value[0].distanceTo(local)<1e-7);assert.equal(s.holes.length,1);assert.equal(s.uniforms.siltHoleRadii.value[0],radius);const snapshot=s.rims[0].matrixWorld.elements.slice();for(let i=0;i<30;i++)View.update(g,e,1);assert.deepEqual(s.rims[0].matrixWorld.elements,snapshot);assert.equal(s.holes.length,1);
});
test('direct hit adapter is bounded, deduplicated, rejects malformed/future input, and resets on rewind',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt;for(let i=0;i<20;i++){const h={point:bodyPoint(g,.11,1+i*.001,-.175),time:2+i*.001};assert(View.hit(g,h,h.time));assert(!View.hit(g,h,h.time));}assert.equal(s.holes.length,6);assert.equal(s.rims.filter(r=>r.visible).length,6);assert(!View.hit(g,{point:{x:NaN,y:1,z:1}},2.02));assert(!View.hit(g,{point:{x:1,y:1,z:1},time:9},2.02));View.update(g,e,0);assert.equal(s.holes.length,0);assert(s.rims.every(r=>!r.visible));
});
test('terminal state cancels blade/core and collapses into persistent silver puddle without blood',()=>{
 const e=enemy('dead'),g=View.create(T,e),s=g.userData.silt;e.alive=false;e.metal.enteredAt=5;e.metal.stateTime=0;View.update(g,e,5);assert(!s.parts.core.visible);assert(!s.parts.blade.visible);View.update(g,e,5.5);assert(!s.shell.visible);assert(s.parts.puddle.visible);assert(s.parts.puddle.scale.x>.9);assert(s.parts.droplets.every(o=>!o.visible));View.update(g,e,100);assert(!s.shell.visible);assert(g.visible);finiteTree(g);
});
test('all states have finite transforms and resources dispose through existing traversal contract',()=>{
 const e=enemy(),g=View.create(T,e),s=g.userData.silt;for(const state of ['idle','pursue','windup','strike','recovery','disrupted','reform','dead'])for(let i=0;i<=10;i++){Object.assign(e.metal,{state,stateTime:i/10,coreExposed:state==='disrupted'||state==='reform'});View.update(g,e,10+i/10);finiteTree(g);}const geometries=new Set(),materials=new Set();g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});let gd=0,md=0;geometries.forEach(o=>{o.addEventListener('dispose',()=>gd++);o.dispose();});materials.forEach(o=>{o.addEventListener('dispose',()=>md++);o.dispose();});assert.equal(gd,geometries.size);assert.equal(md,materials.size);assert(geometries.size<35);assert(materials.size<8);assert.equal(s.rims.length,6);
});
test('only the opaque depth-tested core writes the semantic post-grade tag',()=>{
 const g=View.create(T,enemy('disrupted',.4)),s=g.userData.silt,m=s.parts.core.material,shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:T.ShaderLib.basic.fragmentShader};m.onBeforeCompile(shader);assert(shader.fragmentShader.includes('gl_FragColor.a = 0.0;'));assert(shader.fragmentShader.indexOf('gl_FragColor.a = 0.0;')>shader.fragmentShader.indexOf('#include <opaque_fragment>'));assert.equal(m.transparent,false);assert.equal(m.premultipliedAlpha,false);assert.equal(m.opacity,1);assert(m.depthTest&&m.depthWrite&&m.fog);assert.equal(m.customProgramCacheKey(),'silt-semantic-core-v1');assert.equal(m.color.getHex(),0xffb84f);
 for(const shell of s.shellMeshes)assert(!materialShader(shell.material).fragmentShader.includes('gl_FragColor.a = 0.0;'));const e=enemy('reform',.5);View.update(g,e,1);assert.equal(m.color.getHex(),0xdca252);assert(s.parts.core.visible);e.alive=false;View.update(g,e,2);assert(!s.parts.core.visible);
});
console.log(count+' SILT rendererless geometry/material checks passed. WebGL shader compilation and visual readability remain browser checks.');
