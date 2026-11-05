import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {resolve,join} from 'node:path';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {pathToFileURL} from 'node:url';
import * as kit from '../../.agents/skills/diorama-worlds/kit/world.js';
import {changeViewMode} from '../src/view-controls.js';import {attachZoom} from '../src/zoom.js';
const root=resolve(import.meta.dirname,'..'),kitFile=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');

test('reference uses portrait framing while legacy perspective FOV stays identical',()=>{
 assert.equal(typeof kit.perspectiveFieldOfView,'function','shared projection helper exists');
 const config={fov:50,framingAspect:4/7};
 for(const aspect of [.4,.45,4/7,.65,1,1.5,2]){
  const legacy=2*Math.atan(Math.tan(50*Math.PI/360)/Math.min(1,aspect))*180/Math.PI;
  assert.ok(Math.abs(kit.perspectiveFieldOfView({fov:50},aspect)-legacy)<1e-12);
  const actual=kit.perspectiveFieldOfView(config,aspect);assert.ok(actual>=50&&actual<=76);
  if(aspect>=4/7)assert.equal(actual,50);
 }
});

test('reference transition remains a normal resettable mode and both UIs opt in by definition',async()=>{
 const calls=[];changeViewMode({setViewMode:v=>calls.push(v)},{reset:()=>calls.push('reset')},'reference');assert.deepEqual(calls,['reset','reference']);
 for(const file of ['src/main.js','../.agents/skills/diorama-worlds/scripts/build-world.mjs']){const source=await readFile(resolve(root,file),'utf8');assert.match(source,/rendering\?\.referenceView/);assert.match(source,/<option value="reference">레퍼런스 보기<\/option>/);}
});

class Element{constructor(){this.events=new Map();this.style={};this.dataset={};this.attrs={};this.capture=new Set();this.width=900;this.height=600;this.options=[];}getBoundingClientRect(){return{width:this.width,height:this.height}}replaceChildren(){}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]??null}removeAttribute(k){delete this.attrs[k]}addEventListener(k,f){this.events.set(k,f)}removeEventListener(k){this.events.delete(k)}setPointerCapture(id){this.capture.add(id)}releasePointerCapture(id){this.capture.delete(id)}emit(k,e){this.events.get(k)?.(e)}}
const pointer=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',preventDefault(){}});

test('runtime switches full/cinematic/detail/reference, cancels gestures and restores exact camera',async()=>{
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');const dir=await mkdtemp(join(tmpdir(),'reference-runtime-'));
 const globals=['document','matchMedia','devicePixelRatio','ResizeObserver','IntersectionObserver','__cameraProbe','__cameraResize'],old=new Map(globals.map(k=>[k,globalThis[k]]));
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});globalThis.devicePixelRatio=1;
 globalThis.ResizeObserver=class{constructor(fn){globalThis.__cameraResize=fn}observe(){}disconnect(){}};globalThis.IntersectionObserver=class{observe(){}disconnect(){}};
 try{
  await build({entryPoints:[kitFile],bundle:true,platform:'node',format:'esm',outfile:join(dir,'runtime.mjs'),alias:{three:resolve(root,'test/fixtures/camera-probe-three.mjs')}});
  const {mountWorld}=await import(pathToFileURL(join(dir,'runtime.mjs'))),el=new Element(),definition={name:'camera-probe',description:'CPU probe',duration:120,still:12,bounds:[[-9,-.5,-10],[9,7.1,10]],rendering:{zoom:true,atmosphere:{color:'#d7bc90',near:25,far:85},camera:[2.2,12,32],cinematicView:{position:[1,9,20],target:[-1,1,-3],fov:50},detailView:{position:[1,7,16],target:[-2,2,0],fov:50},referenceView:{position:[3,16,24],target:[-.3,1,-1],fov:50,framingAspect:4/7,landscapeView:{fromAspect:1,toAspect:1.5,position:[-1.8,7,24],fov:30,target:[-.3,1,-1]}}},build(W){const h=W.group();h.userData.fadeMaterial={opacity:1};return{cinematicRoots:[h]};},tick(){}};
  const runtime=mountWorld(definition,{el,paused:true}),plus=new Element(),minus=new Element(),reset=new Element(),label=new Element(),zoom=attachZoom({stage:el,plus,minus,reset,label,runtime});
  assert.ok(globalThis.__cameraProbe.scene.fog,'opt-in atmospheric haze is present');assert.equal(globalThis.__cameraProbe.scene.fog.near,25);assert.equal(globalThis.__cameraProbe.scene.fog.far,85);
  const snapshot=()=>{const c=globalThis.__cameraProbe.camera;return[...c.position.toArray(),...c.quaternion.toArray(),...c.projectionMatrix.elements];};
  for(const mode of ['full','cinematic','detail','reference','full','reference']){
   changeViewMode(runtime,zoom,mode);const baseline=snapshot();assert.equal(runtime.stats().viewMode,mode);assert.equal(runtime.stats().time,12);assert.equal(runtime.stats().paused,true);assert.equal(label.textContent,'100%');
   el.emit('pointerdown',pointer(1,100,100));el.emit('pointermove',pointer(1,120,110));assert.notDeepEqual(snapshot(),baseline,'drag still orbits');plus.emit('click');assert.ok(runtime.stats().zoom>1);
   changeViewMode(runtime,zoom,mode);assert.deepEqual(snapshot(),baseline,'reselection resets exact preset camera');assert.equal(el.capture.size,0,'mode switch cancels pointer capture');el.emit('pointermove',pointer(1,300,200));assert.deepEqual(snapshot(),baseline,'stale move cannot jump after switch');
   runtime.panView(.1,.1);runtime.setZoom(1.5);zoom.reset();assert.deepEqual(snapshot(),baseline,'Home/button reset preserves active preset');
  }
  for(const aspect of [.4,.45,4/7,.65,1,1.1,1.25,1.4,1.5,2,3]){
   el.width=700*aspect;el.height=700;globalThis.__cameraResize();const camera=globalThis.__cameraProbe.camera;assert.ok(Math.abs(camera.fov-kit.perspectiveFieldOfView(definition.rendering.referenceView,aspect))<1e-10);assert.equal(camera.aspect,aspect);
   const baseline=snapshot();el.emit('pointerdown',pointer(1,100,100));el.emit('pointermove',pointer(1,130,120));assert.notDeepEqual(snapshot(),baseline,'drag works after responsive resize');runtime.panView(.05,.03);runtime.setZoom(1.4);zoom.reset();assert.deepEqual(snapshot(),baseline,'reset restores resized preset exactly');
   const view=kit.resolvePerspectiveView(definition.rendering.referenceView,aspect);assert.deepEqual(camera.position.toArray(),view.position,'responsive camera position matches aspect');
  }
  runtime.orbitView(.03,.02);runtime.panView(.04,.01);runtime.setZoom(1.4);const prior=runtime.stats();el.width=455;el.height=700;globalThis.__cameraResize();assert.deepEqual(runtime.stats().view,prior.view,'resize keeps user orbit and pan');assert.equal(runtime.stats().zoom,prior.zoom,'resize keeps user zoom');zoom.reset();
  const mobileCamera=globalThis.__cameraProbe.camera;assert.deepEqual(mobileCamera.position.toArray(),definition.rendering.referenceView.position,'mobile camera pose remains original');
  for(const mode of ['cinematic','detail']){changeViewMode(runtime,zoom,mode);const c=globalThis.__cameraProbe.camera,cfg=definition.rendering[`${mode}View`];assert.deepEqual(c.position.toArray(),cfg.position);assert.ok(Math.abs(c.fov-kit.perspectiveFieldOfView(cfg,.65))<1e-10);}
  changeViewMode(runtime,zoom,'reference');
  // Both pitch limits must be revalidated when the reference eye height changes.
  for(const [from,to,dragY] of [[.65,2,-10],[2,.65,10]]){
   el.width=700*from;el.height=700;globalThis.__cameraResize();changeViewMode(runtime,zoom,'reference');runtime.orbitView(.07,dragY);runtime.panView(.02,.01);runtime.setZoom(1.7);const before=runtime.stats();
   el.width=700*to;globalThis.__cameraResize();const after=runtime.stats(),view=kit.resolvePerspectiveView(definition.rendering.referenceView,to),[px,py,pz]=view.position,[tx,ty,tz]=view.target,elevation=Math.atan2(py-ty,Math.hypot(px-tx,pz-tz)),expected=Math.max(elevation-1.35,Math.min(elevation-.12,before.view.pitch));
   assert.ok(Math.abs(after.view.pitch-expected)<1e-12,'resize clamps extreme pitch to the new elevation limits');assert.equal(after.view.yaw,before.view.yaw,'resize retains yaw');assert.equal(after.view.x,before.view.x,'resize retains horizontal pan');assert.equal(after.view.y,before.view.y,'resize retains vertical pan');assert.equal(after.zoom,before.zoom,'resize retains zoom');
   const camera=globalThis.__cameraProbe.camera,direction=camera.getWorldDirection(new (kit.toolkit({}).THREE.Vector3)());assert.ok(direction.y<-.11,'resized camera continues to look down at the ground');assert.ok(camera.position.y>0,'resized extreme camera remains above ground');zoom.reset();assert.deepEqual(camera.position.toArray(),view.position,'reset restores responsive base after clamping');
  }
  runtime.setFinish('pixel');assert.equal(runtime.stats().viewMode,'reference');zoom.dispose();runtime.dispose();assert.doesNotThrow(()=>runtime.setViewMode('reference'));
  globalThis.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});const accessible=mountWorld({...definition,still:0,reducedStill:119},{el,paused:false});assert.equal(accessible.stats().time,119,'reduced motion shows completed formation');assert.equal(accessible.stats().running,false);accessible.dispose();
  const legacy=mountWorld({...definition,rendering:{zoom:true}},{el,paused:true});assert.throws(()=>legacy.setViewMode('reference'));assert.equal(legacy.stats().viewMode,'full');assert.equal(globalThis.__cameraProbe.scene.fog,null,'other worlds retain no atmospheric haze');legacy.dispose();
 }finally{for(const [k,v]of old)if(v===undefined)delete globalThis[k];else globalThis[k]=v;await rm(dir,{recursive:true,force:true});}
});

test('actual desert reference camera preserves subject hierarchy across desktop and portrait aspects',async()=>{
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js'),dir=await mkdtemp(join(tmpdir(),'reference-framing-')),oldDocument=globalThis.document;
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src/desert.js'))};export {toolkit,perspectiveFieldOfView,resolvePerspectiveView,setCinematicVisibility} from ${JSON.stringify(kitFile)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kitFile}});
  const {world,toolkit,perspectiveFieldOfView,resolvePerspectiveView,setCinematicVisibility}=await import(pathToFileURL(join(dir,'scene.mjs'))),T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=world.build(W),cfg=world.rendering.referenceView;
  assert.ok(cfg,'desert alone opts into reference preset');assert.equal(cfg.framingAspect,4/7);
  assert.deepEqual(world.rendering.camera,[2.2,12,32]);assert.deepEqual(world.rendering.cinematicView,{position:[1,9,20],target:[-1,1,-3],fov:50});assert.deepEqual(world.rendering.detailView,{position:[1,7,16],target:[-2,2,0],fov:50});
  scene.updateMatrixWorld(true);const {riverCenter}=await import('../src/desert-motion.js');
  for(const aspect of [3,2.416,2,1.75,1.5,1.4,1.25,1.1,1,.65,4/7,.45,.4]){
   const view=resolvePerspectiveView(cfg,aspect),camera=new T.PerspectiveCamera(perspectiveFieldOfView(cfg,aspect),aspect,.1,120);camera.position.set(...view.position);camera.lookAt(...view.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   const projected={};
   for(const name of ['central-stepped-pyramid','foreground-colonnaded-temple']){
    const points=[];scene.getObjectByName(name).traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(camera));});
    assert.ok(points.every(p=>Math.abs(p.x)<.99&&Math.abs(p.y)<.99&&p.z>-1&&p.z<1),`${name} is fully framed at aspect ${aspect}`);
    projected[name]=new T.Box3().setFromPoints(points);
   }
   if(aspect>=1.5){
    const points=[];scene.traverse(o=>{if(!['central-stepped-pyramid','foreground-colonnaded-temple','foreground-secondary-temple','rear-stepped-sanctuary','distant-pyramid','sinuous-river'].includes(o.name))return;o.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(camera));});});
    assert.ok(points.every(p=>Math.abs(p.x)<.95&&Math.abs(p.y)<.95),'all landmark and river triangles stay inside wide safe frame');
    const occupied=new T.Box3().setFromPoints(points);assert.ok((occupied.max.y-occupied.min.y)/2>.80,'wide scene fills at least 80% of viewport height');
    const door=scene.getObjectByName('foreground-colonnaded-temple').getObjectByName('temple-entrance'),box=new T.Box3().setFromObject(door),meshes=[];scene.traverseVisible(o=>{if(o.isMesh&&o.material.visible!==false)meshes.push(o);});
    let visible=0;for(const fx of [.15,.5,.85])for(const fy of [.15,.5,.85]){const target=new T.Vector3(box.min.x+(box.max.x-box.min.x)*fx,box.min.y+(box.max.y-box.min.y)*fy,box.max.z),ray=new T.Raycaster(camera.position,target.clone().sub(camera.position).normalize());if(ray.intersectObjects(meshes,false)[0]?.object===door)visible++;}
    assert.ok(visible>=6,'at least six of nine real doorway samples are unobstructed');
    const center=box.getCenter(new T.Vector3()),ray=new T.Raycaster(camera.position,center.sub(camera.position).normalize());assert.equal(ray.intersectObjects(meshes,false)[0]?.object,door,'actual entrance center is the first ray hit');
   }
   const hero=projected['central-stepped-pyramid'],temple=projected['foreground-colonnaded-temple'];
   assert.ok(hero.max.y>temple.max.y+.25,'hero rises above foreground temple');assert.ok(hero.max.y-hero.min.y>.34,'hero does not shrink to a thumbnail');
   for(const p of [[-7.7,2.862,-8.6],[6.5,3.262,-8.2]]){const v=new T.Vector3(...p).project(camera);assert.ok(Math.abs(v.x)<.95&&Math.abs(v.y)<.95,'both background pyramid tips remain visible');}
   let lastY=Infinity;for(let z=-9;z<=9;z+=.5){const v=new T.Vector3(riverCenter(z),.002,z).project(camera);assert.ok(Math.abs(v.x)<.95&&Math.abs(v.y)<.95,'river center remains visible');assert.ok(v.y<lastY,'river recedes continuously to foreground');lastY=v.y;}
  }
  setCinematicVisibility(parts,'reference');assert.ok(parts.cinematicRoots.every(r=>r.visible),'reference uses scenic horizon');setCinematicVisibility(parts,'reference',Math.PI);assert.ok(parts.cinematicRoots.every(r=>!r.visible),'rear orbit hides scenic backdrop');setCinematicVisibility(parts,'full');assert.ok(parts.cinematicRoots.every(r=>!r.visible));W.dispose();
  for(const name of ['harbor','singapore','dubai'])assert.doesNotMatch(await readFile(resolve(root,`src/${name}.js`),'utf8'),/referenceView/,'other worlds do not opt in');
 }finally{globalThis.document=oldDocument;await rm(dir,{recursive:true,force:true});}
});


test('reference landscape fit enlarges and recenters without changing portrait or legacy presets',()=>{
 assert.equal(typeof kit.resolvePerspectiveView,'function');
 const config={position:[3,16,24],target:[-.3,1,-1],fov:50,framingAspect:4/7,landscapeView:{fromAspect:1,toAspect:1.5,position:[-1.8,7,24],fov:30,target:[-.3,1,-1]}};
 const copy=structuredClone(config);
 for(const aspect of [.4,.45,4/7,.65,1]){assert.deepEqual(kit.resolvePerspectiveView(config,aspect),config);assert.equal(kit.perspectiveFieldOfView(config,aspect),kit.perspectiveFieldOfView({...config,landscapeView:undefined},aspect));}
 const wide=kit.resolvePerspectiveView(config,2);assert.equal(wide.fov,30);assert.deepEqual(wide.position,[-1.8,7,24]);assert.deepEqual(wide.target,[-.3,1,-1]);
 let previous=50;for(let aspect=1;aspect<=1.6;aspect+=.01){const current=kit.resolvePerspectiveView(config,aspect);assert.ok(current.fov<=previous+1e-10&&previous-current.fov<.7,'continuous monotone FOV change');assert.ok(current.target[1]>=-1&&current.target[1]<=1);previous=current.fov;}
 assert.deepEqual(config,copy,'resolution does not mutate world preset');assert.deepEqual(kit.resolvePerspectiveView({target:[1,2,3],fov:50},2),{target:[1,2,3],fov:50});
});
