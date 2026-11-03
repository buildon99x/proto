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
  const {mountWorld}=await import(pathToFileURL(join(dir,'runtime.mjs'))),el=new Element(),definition={name:'camera-probe',description:'CPU probe',duration:120,still:12,bounds:[[-9,-.5,-10],[9,7.1,10]],rendering:{zoom:true,camera:[2.2,12,32],cinematicView:{position:[1,9,20],target:[-1,1,-3],fov:50},detailView:{position:[1,7,16],target:[-2,2,0],fov:50},referenceView:{position:[3,16,24],target:[-.3,1,-1],fov:50,framingAspect:4/7}},build(W){const h=W.group();h.userData.fadeMaterial={opacity:1};return{cinematicRoots:[h]};},tick(){}};
  const runtime=mountWorld(definition,{el,paused:true}),plus=new Element(),minus=new Element(),reset=new Element(),label=new Element(),zoom=attachZoom({stage:el,plus,minus,reset,label,runtime});
  const snapshot=()=>{const c=globalThis.__cameraProbe.camera;return[...c.position.toArray(),...c.quaternion.toArray(),...c.projectionMatrix.elements];};
  for(const mode of ['full','cinematic','detail','reference','full','reference']){
   changeViewMode(runtime,zoom,mode);const baseline=snapshot();assert.equal(runtime.stats().viewMode,mode);assert.equal(runtime.stats().time,12);assert.equal(runtime.stats().paused,true);assert.equal(label.textContent,'100%');
   el.emit('pointerdown',pointer(1,100,100));el.emit('pointermove',pointer(1,120,110));assert.notDeepEqual(snapshot(),baseline,'drag still orbits');plus.emit('click');assert.ok(runtime.stats().zoom>1);
   changeViewMode(runtime,zoom,mode);assert.deepEqual(snapshot(),baseline,'reselection resets exact preset camera');assert.equal(el.capture.size,0,'mode switch cancels pointer capture');el.emit('pointermove',pointer(1,300,200));assert.deepEqual(snapshot(),baseline,'stale move cannot jump after switch');
   runtime.panView(.1,.1);runtime.setZoom(1.5);zoom.reset();assert.deepEqual(snapshot(),baseline,'Home/button reset preserves active preset');
  }
  for(const aspect of [.4,.45,4/7,.65,1,1.5,2]){el.width=700*aspect;el.height=700;globalThis.__cameraResize();const camera=globalThis.__cameraProbe.camera;assert.ok(Math.abs(camera.fov-kit.perspectiveFieldOfView(definition.rendering.referenceView,aspect))<1e-10);assert.equal(camera.aspect,aspect);}
  runtime.setFinish('pixel');assert.equal(runtime.stats().viewMode,'reference');zoom.dispose();runtime.dispose();assert.doesNotThrow(()=>runtime.setViewMode('reference'));
  const legacy=mountWorld({...definition,rendering:{zoom:true}},{el,paused:true});assert.throws(()=>legacy.setViewMode('reference'));assert.equal(legacy.stats().viewMode,'full');legacy.dispose();
 }finally{for(const [k,v]of old)if(v===undefined)delete globalThis[k];else globalThis[k]=v;await rm(dir,{recursive:true,force:true});}
});

test('actual desert reference camera preserves subject hierarchy across desktop and portrait aspects',async()=>{
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js'),dir=await mkdtemp(join(tmpdir(),'reference-framing-')),oldDocument=globalThis.document;
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src/desert.js'))};export {toolkit,perspectiveFieldOfView,setCinematicVisibility} from ${JSON.stringify(kitFile)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kitFile}});
  const {world,toolkit,perspectiveFieldOfView,setCinematicVisibility}=await import(pathToFileURL(join(dir,'scene.mjs'))),T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=world.build(W),cfg=world.rendering.referenceView;
  assert.ok(cfg,'desert alone opts into reference preset');assert.equal(cfg.framingAspect,4/7);
  assert.deepEqual(world.rendering.camera,[2.2,12,32]);assert.deepEqual(world.rendering.cinematicView,{position:[1,9,20],target:[-1,1,-3],fov:50});assert.deepEqual(world.rendering.detailView,{position:[1,7,16],target:[-2,2,0],fov:50});
  scene.updateMatrixWorld(true);const {riverCenter}=await import('../src/desert-motion.js');
  for(const aspect of [2,1.5,1,.65,4/7,.45,.4]){
   const camera=new T.PerspectiveCamera(perspectiveFieldOfView(cfg,aspect),aspect,.1,120);camera.position.set(...cfg.position);camera.lookAt(...cfg.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
   const projected={};
   for(const name of ['central-stepped-pyramid','foreground-colonnaded-temple']){
    const points=[];scene.getObjectByName(name).traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)points.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(camera));});
    assert.ok(points.every(p=>Math.abs(p.x)<.99&&Math.abs(p.y)<.99&&p.z>-1&&p.z<1),`${name} is fully framed at aspect ${aspect}`);
    projected[name]=new T.Box3().setFromPoints(points);
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
