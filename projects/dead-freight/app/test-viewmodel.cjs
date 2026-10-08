const assert=require('node:assert/strict');const T=require('./vendor/three.min.js');require('./weapon.js');
let checks=0;
for(let weapon=0;weapon<3;weapon++)for(let suppressed of [false,true])for(let laser of [false,true]){
 const g=DFWeapon.create(T,weapon,{suppressed,laser});g.updateMatrixWorld(true);const v=g.userData;
 assert(v.index&&v.trigger&&v.slide&&v.support&&v.magazine&&v.hammer);
 assert.equal(v.suppressor.visible,suppressed);assert.equal(v.laserModule.visible,laser);
 const fingertip=v.index.localToWorld(v.indexTip.clone()),triggerContact=v.trigger.localToWorld(new T.Vector3(0,-.064,.01));assert(fingertip.distanceTo(triggerContact)<.025,'trigger finger must reach trigger contact zone');assert.equal(v.fingerRoots.length,3);assert.equal(v.muzzle.z,suppressed?-.825:-.428);
 let meshes=0,vertices=0;g.traverse(o=>{if(!o.isMesh)return;meshes++;const pos=o.geometry.attributes.position;vertices+=pos.count;for(let n of pos.array)assert(Number.isFinite(n));});
 assert(meshes>160);assert(vertices>0);let bounds=new T.Box3().setFromObject(g);assert(bounds.min.y<-.6);assert(bounds.min.z<-.8);
 const muzzle=g.localToWorld(v.muzzle.clone());const camera=new T.PerspectiveCamera(62,16/9,.01,10);camera.updateMatrixWorld();const mp=muzzle.clone().project(camera);const px=(mp.x+1)*320,py=(1-mp.y)*180;if(suppressed){assert(px>270&&px<330&&py>140&&py<190,'reference-scale muzzle framing');}let redAccent=false;g.traverse(o=>{if(o.material?.name==='oxide-red-accent'){redAccent=true;assert(o.material.color.r>o.material.color.g*1.5);}});assert(redAccent);assert(Number.isFinite(muzzle.x)&&muzzle.z<-.8);
 console.log(`PASS weapon ${weapon}, suppressor=${suppressed}, laser=${laser}: ${meshes} meshes, ${vertices} vertices`);checks++;
}
console.log(`${checks} viewmodel construction checks passed. These are not rendered visual checks.`);
