const assert=require('node:assert/strict');const T=require('./vendor/three.min.js');require('./weapon.js');require('./motion.js');
let checks=0;function check(name,fn){fn();console.log('PASS',name);checks++;}
function setPose(g,stance){const p=DFWeapon.getPose(g.userData.weapon,stance);g.position.fromArray(p.position);g.rotation.set(...p.rotation);g.updateMatrixWorld(true);}
function visible(o){for(;o;o=o.parent)if(!o.visible)return false;return true;}
// Deterministic opaque-triangle mask. This measures projected coverage, not a browser render.
function coverage(g,W,H){
 const mask=new Uint8Array(W*H),f=H/(2*Math.tan(62*Math.PI/360));let count=0,minX=W,maxX=0,minY=H,maxY=0;
 g.updateMatrixWorld(true);g.traverse(o=>{if(!o.isMesh||!visible(o))return;const p=o.geometry.attributes.position,idx=o.geometry.index,points=[];
  for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);assert(v.z<-.01,'rest-pose geometry must remain in front of the near plane');points.push([W/2+v.x*f/-v.z,H/2-v.y*f/-v.z]);}
  const total=idx?idx.count:p.count;for(let i=0;i<total;i+=3){const [a,b,c]=[0,1,2].map(j=>points[idx?idx.getX(i+j):i+j]);const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-8)continue;
   const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const n=y*W+x;if(mask[n])continue;const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/den,v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/den;if(u>=0&&v>=0&&u+v<=1){mask[n]=1;count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
  }
 });
 let center=0;const r=Math.round(W/80);for(let y=H/2-r;y<H/2+r;y++)for(let x=W/2-r;x<W/2+r;x++)center+=mask[y*W+x];return {fraction:count/(W*H),center,spanX:(maxX-minX)/W,minY:minY/H};
}
for(const suppressed of [false,true])for(const laser of [false,true])check(`rifle construction, suppressor=${suppressed}, laser=${laser}`,()=>{
 const g=DFWeapon.create(T,3,{suppressed,laser}),v=g.userData;g.updateMatrixWorld(true);
 for(const k of ['receiver','stock','handguard','optic','slide','hammer','trigger','index','support','magazine','rightWrist','leftWrist'])assert(v[k]?.isObject3D,k);
 assert.equal(v.suppressor.visible,suppressed);assert.equal(v.laserModule.visible,laser);assert.equal(v.bolt,v.slide);assert.equal(v.fingerRoots.length,3);
 assert(v.support.position.z<v.magazine.position.z-.25,'support hand holds the handguard ahead of the magazine');
 assert(v.support.position.y<0);assert(v.muzzle.z<-.97);assert(v.muzzle.z===(suppressed?-1.201:-.979));assert(v.ejectionPort.x>.08);
 const tip=v.index.localToWorld(v.indexTip.clone()),contact=v.trigger.localToWorld(new T.Vector3(0,-.058,.002));assert(tip.distanceTo(contact)<.02,'index contacts the actual trigger');
 let meshes=0;g.traverse(o=>{if(o.isMesh){meshes++;for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));assert(o.castShadow&&o.receiveShadow);}});assert(meshes>=175);
 for(const w of [v.rightWrist,v.leftWrist]){assert.equal(w.material.name,'exposed-wrist');assert(w.geometry.attributes.color);assert(w.geometry.parameters.height>.04&&w.geometry.parameters.height<.085,'short anatomical wrist gap');}
 assert(v.magazine.getObjectByName('magazine-curved-body'));assert(v.optic.getObjectByName('optic-front-frame'));assert(v.stock.getObjectByName('stock-skeleton'));
});
check('rifle bolt moves independently while receiver, support and muzzle stay fixed',()=>{
 const g=DFWeapon.create(T,3),v=g.userData;const receiver=v.receiver.position.clone(),muzzle=v.muzzle.clone(),bolt=v.slide.position.clone();DFWeapon.applyReload(g,{}, {bolt:.056,trigger:-.3,index:-.15});assert.equal(v.slide.position.z,bolt.z+.056);assert(v.receiver.position.equals(receiver));assert(v.muzzle.equals(muzzle));assert(v.support.position.equals(v.neutral.support.position));assert(v.magazine.position.equals(v.neutral.magazine.position));
 DFWeapon.applyReload(g);for(const key of ['slide','hammer','trigger','index','support','magazine']){assert(v[key].position.equals(v.neutral[key].position));assert(v[key].rotation.equals(v.neutral[key].rotation));}
});
check('all poses preserve joint neutral offsets across repeated reload application',()=>{
 for(let w=0;w<4;w++){const g=DFWeapon.create(T,w);for(let i=0;i<100;i++)DFWeapon.applyReload(g,DFMotion.reloadPose(.5,{weapon:w,kind:'tactical'}),{bolt:.02});DFWeapon.applyReload(g);for(const k of ['support','magazine','slide'])assert(g.userData[k].position.equals(g.userData.neutral[k].position));assert(g.userData.magazine.visible);}
});
check('rifle front and rear optic centers share the camera axis with no opaque occluder',()=>{
 const g=DFWeapon.create(T,3);setPose(g,'ads');for(const aspect of [16/9,4/3]){const camera=new T.PerspectiveCamera(62,aspect,.01,10);camera.updateMatrixWorld();for(const k of ['opticRear','opticFront']){const p=g.localToWorld(g.userData[k].clone()).project(camera);assert(Math.abs(p.x)<1e-12&&Math.abs(p.y)<1e-12);}}
 const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,0,-1),.01,4);assert.equal(ray.intersectObject(g,true).filter(h=>visible(h.object)).length,0,'open optic aperture must not cover the reticle');assert(new T.Box3().setFromObject(g).max.z<-.04);
});
check('rifle optical axis converges monotonically from hip through ADS',()=>{
 const g=DFWeapon.create(T,3),camera=new T.PerspectiveCamera(62,16/9,.01,10),{hip,ads}=DFWeapon.getPose(3);let distance=Infinity;
 for(let i=0;i<=100;i++){const t=i/100;g.position.fromArray(hip.position.map((v,k)=>v+(ads.position[k]-v)*t));g.rotation.set(...hip.rotation.map((v,k)=>v+(ads.rotation[k]-v)*t));g.updateMatrixWorld(true);const p=g.localToWorld(g.userData.opticRear.clone()).project(camera),d=Math.hypot(p.x,p.y);assert(d<=distance+1e-10);distance=d;}assert(distance<1e-12);
});
check('viewmodel sight center maps to world-camera aim at arbitrary yaw and pitch',()=>{
 const g=DFWeapon.create(T,3),gunCam=new T.PerspectiveCamera(62,16/9,.01,10);setPose(g,'ads');for(const yaw of [-2.2,0,1.3])for(const pitch of [-.7,0,.65])for(const fov of [59,78]){const cam=new T.PerspectiveCamera(fov,16/9,.06,440);cam.rotation.order='YXZ';cam.position.set(12,1.7,-9);cam.rotation.set(pitch,yaw,0);cam.updateMatrixWorld();const p=g.localToWorld(g.userData.opticFront.clone()).project(gunCam),direction=new T.Vector3(p.x,p.y,.5).unproject(cam).sub(cam.position).normalize();assert(direction.distanceTo(cam.getWorldDirection(new T.Vector3()))<1e-12);}
});
check('rifle reload stages keep a contacting hand with the moving magazine',()=>{
 for(const kind of ['tactical','empty']){const g=DFWeapon.create(T,3);let last=null;for(const t of (kind==='tactical'?[.22/1.70,.29,.49,1.02/1.70]:[.10,.23,.39,1.05/2.20])){const r=DFMotion.reloadPose(t,{weapon:3,kind});DFWeapon.applyReload(g,r);const difference=g.userData.support.position.clone().sub(g.userData.magazine.position);if(last)assert(difference.distanceTo(last)<.002,'hand and magazine travel together before reseating');last=difference;}}
});
check('reload paths remain finite, restore grips, and do not send sleeves through the camera',()=>{
 for(const kind of ['tactical','empty','chamber']){const g=DFWeapon.create(T,3);for(let i=0;i<=100;i++){const r=DFMotion.reloadPose(i/100,{weapon:3,kind});DFWeapon.applyReload(g,r,{bolt:.056});g.updateMatrixWorld(true);assert(new T.Box3().setFromObject(g).max.z<-.03);for(const k of ['support','magazine','slide'])for(const n of g.userData[k].position.toArray())assert(Number.isFinite(n));}DFWeapon.applyReload(g,DFMotion.reloadPose(1,{weapon:3,kind}));assert(g.userData.support.position.equals(g.userData.neutral.support.position));assert(g.userData.magazine.position.equals(g.userData.neutral.magazine.position));assert(g.userData.magazine.visible);}
});
for(const size of [[640,360],[960,540]])check(`measured hip/ADS coverage and clear hip reticle at ${size.join('x')}`,()=>{
 for(let w=0;w<4;w++){const g=DFWeapon.create(T,w,{suppressed:true,laser:true});for(const stance of ['hip','ads']){setPose(g,stance);const result=coverage(g,...size);assert(result.fraction<(stance==='hip'?.25:.30),`${w} ${stance} coverage ${result.fraction}`);assert(result.fraction>.035,'weapon remains a legible first-person model');if(stance==='hip'){assert.equal(result.center,0,'16px-equivalent reticle neighborhood stays unobstructed');assert(result.minY>.48,'hip weapon stays below the central horizon');}console.log(`  weapon ${w} ${stance}: ${(100*result.fraction).toFixed(2)}% opaque triangle coverage`);}}
});
console.log(`${checks} rifle geometry/projection/coverage checks passed. CPU masks and geometry checks are not browser rendering or play acceptance.`);
