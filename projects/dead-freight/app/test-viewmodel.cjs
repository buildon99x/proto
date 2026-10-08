const assert=require('node:assert/strict');const T=require('./vendor/three.min.js');require('./weapon.js');
let checks=0;
for(let weapon=0;weapon<3;weapon++)for(let suppressed of [false,true])for(let laser of [false,true]){
 const g=DFWeapon.create(T,weapon,{suppressed,laser});g.updateMatrixWorld(true);const v=g.userData;
 assert(v.rightWrist&&v.leftWrist);
 assert(v.index&&v.trigger&&v.slide&&v.support&&v.magazine&&v.hammer);
 assert.equal(v.suppressor.visible,suppressed);assert.equal(v.laserModule.visible,laser);
 const fingertip=v.index.localToWorld(v.indexTip.clone()),triggerContact=v.trigger.localToWorld(new T.Vector3(0,-.064,.01));assert(fingertip.distanceTo(triggerContact)<.025,'trigger finger must reach trigger contact zone');assert.equal(v.fingerRoots.length,3);assert.equal(v.muzzle.z,suppressed?-.825:-.428);
 let meshes=0,vertices=0;g.traverse(o=>{if(!o.isMesh)return;meshes++;const pos=o.geometry.attributes.position;vertices+=pos.count;for(let n of pos.array)assert(Number.isFinite(n));});
 assert(meshes>160);assert(vertices>0);let bounds=new T.Box3().setFromObject(g);assert(bounds.min.y<-.6);assert(bounds.min.z<-.8);
 for(const wrist of [v.rightWrist,v.leftWrist]){assert(wrist.material.name==='exposed-wrist');assert(wrist.geometry.attributes.color);}
 g.traverse(o=>{if(o.isMesh)assert(o.castShadow&&o.receiveShadow);});
 const muzzle=g.localToWorld(v.muzzle.clone());const camera=new T.PerspectiveCamera(62,16/9,.01,10);camera.updateMatrixWorld();const mp=muzzle.clone().project(camera);const px=(mp.x+1)*320,py=(1-mp.y)*180;if(suppressed){assert(px>324&&px<334&&py>195&&py<206,'readability-first lower muzzle framing');}
 const wristPoint=v.rightWrist.getWorldPosition(new T.Vector3()).project(camera),wp=[(wristPoint.x+1)*320,(1-wristPoint.y)*180];assert(wp[0]>365&&wp[0]<420&&wp[1]>290&&wp[1]<350,'exposed wrist stays readable in the lower-right frame');
 const rear=g.localToWorld(new T.Vector3(0,.04,.06)).project(camera);assert((rear.x+1)*320>390&&(rear.x+1)*320<422);
 const hipP=g.position.clone(),hipR=g.rotation.clone();g.position.fromArray(DFWeapon.poses.ads.position);g.rotation.set(...DFWeapon.poses.ads.rotation);g.updateMatrixWorld(true);const adsBounds=new T.Box3().setFromObject(g);assert(adsBounds.max.z<-.04,'ADS sleeves must remain in front of near plane');g.position.copy(hipP);g.rotation.copy(hipR);g.updateMatrixWorld(true);let redAccent=false;g.traverse(o=>{if(o.material?.name==='oxide-red-accent'){redAccent=true;assert(o.material.color.r>o.material.color.g*1.5);}});assert(redAccent);assert(Number.isFinite(muzzle.x)&&muzzle.z<-.8);
 console.log(`PASS weapon ${weapon}, suppressor=${suppressed}, laser=${laser}: ${meshes} meshes, ${vertices} vertices`);checks++;
}
console.log(`${checks} viewmodel construction checks passed. These are not rendered visual checks.`);
