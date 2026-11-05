import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
test('visual runtime preserves clock, camera, legacy finishes, context recovery and cleanup',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'visual-runtime-'));
 const keys=['document','matchMedia','devicePixelRatio','ResizeObserver','IntersectionObserver','performance','__visualGPU'];const old=new Map(keys.map(k=>[k,globalThis[k]]));
 let now=1000,width=900,reduced=false;const resize=[];
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};globalThis.performance={now:()=>now};globalThis.devicePixelRatio=2;
 globalThis.matchMedia=()=>({matches:reduced,addEventListener(){},removeEventListener(){}});
 globalThis.ResizeObserver=class{constructor(callback){resize.push(callback);}observe(){}disconnect(){}};globalThis.IntersectionObserver=class{observe(){}disconnect(){}};
 try {
  const three=resolve(import.meta.dirname,'../../.agents/skills/diorama-worlds/node_modules/three/build/three.module.js');
  await writeFile(join(dir,'three.mjs'),`export * from ${JSON.stringify(three)};
export class WebGLRenderer{
 constructor(){globalThis.__visualGPU=this;this.events={};this.calls=[];this.domElement={style:{},width:0,height:0,setAttribute(){},addEventListener:(name,fn)=>this.events[name]=fn,removeEventListener:(name)=>delete this.events[name],remove(){}};this.shadowMap={};this.info={reset(){},render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};this.capabilities={maxSamples:4};this.float=true;this.extensions={has:()=>this.float};this.gl={FRAMEBUFFER:1,FRAMEBUFFER_COMPLETE:2,RENDERBUFFER:3,RGBA16F:4,DEPTH_COMPONENT24:5,SAMPLES:6,getInternalformatParameter:()=>[4,2],checkFramebufferStatus:()=>2};}
 getContext(){return this.gl;}getRenderTarget(){return this.target||null;}setPixelRatio(){}setClearColor(){}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}setRenderTarget(t){this.target=t;}dispose(){}forceContextLoss(){}setAnimationLoop(callback){this.loop=callback;}render(scene,camera){this.calls.push({scene,camera,target:this.target});}
}`);
  await build({entryPoints:[resolve(import.meta.dirname,'../../.agents/skills/diorama-worlds/kit/world.js')],bundle:true,platform:'node',format:'esm',outfile:join(dir,'runtime.mjs'),alias:{three:join(dir,'three.mjs')}});
  const {mountWorld}=await import(pathToFileURL(join(dir,'runtime.mjs')));
  const el={dataset:{},replaceChildren(){},getBoundingClientRect:()=>({width,height:600})};
  const definition={name:'visual-probe',title:'Visual',description:'Visual probe',duration:132,still:12,reducedStill:119,bounds:[[-1,-1,-1],[1,1,1]],rendering:{zoom:true,samples:4},build:()=>({}),tick(){}};
  const runtime=mountWorld(definition,{el,paused:false}),gpu=globalThis.__visualGPU;
  assert.equal(typeof runtime.setVisualSettings,'function','visual setter must exist');assert.equal(runtime.getVisualSettings().enabled,false);assert.equal(runtime.stats().visual.effective.enabled,false);
  let updates=0;assert.equal(typeof runtime.onVisualChange,'function');const unsubscribe=runtime.onVisualChange(()=>updates++);
  now=2500;gpu.loop(now);runtime.setSpeed(2);runtime.setZoom(1.7);runtime.orbitView(.1,.05);const before=runtime.stats(),loop=gpu.loop;
  gpu.calls.length=0;runtime.setVisualSettings({enabled:true});const after=runtime.stats();
  for(const key of ['time','speed','zoom','paused','viewMode'])assert.deepEqual(after[key],before[key]);assert.deepEqual(after.view,before.view);assert.equal(gpu.loop,loop);assert.equal(gpu.calls.length,5);assert.equal(after.visual.effective.hdr,true);
  now=3000;gpu.loop(now);assert.equal(runtime.stats().time,14.5,'settings must not reset clock anchors');
  runtime.setPaused(true);const time=runtime.stats().time;runtime.setVisualSettings({toneMapping:'agx',exposure:1.2});assert.equal(runtime.stats().time,time);assert.equal(runtime.stats().running,false);
  const detached=runtime.getVisualSettings();detached.exposure=999;assert.equal(runtime.getVisualSettings().exposure,1.2);assert.ok(Object.isFrozen(runtime.stats().visual.effective));
  assert.throws(()=>runtime.setVisualSettings({enabled:false,exposure:NaN}));assert.equal(runtime.getVisualSettings().enabled,true);
  for(const finish of ['pixel','halftone','blueprint']){gpu.calls.length=0;runtime.setFinish(finish);assert.equal(runtime.stats().visual.effective.enabled,false);assert.equal(gpu.calls.length,2);assert.equal(gpu.calls[0].target.texture.type,1009,'legacy target remains UnsignedByteType');assert.equal(runtime.getVisualSettings().enabled,true);}
  runtime.setFinish('miniature');assert.equal(runtime.stats().visual.effective.enabled,true);
  const beforeResizeUpdates=updates;
  width=390;resize[0]();assert.equal(updates,beforeResizeUpdates+1,'emit after actual resize configuration');assert.equal(runtime.stats().visual.effective.bloom,false);assert.equal(runtime.stats().visual.effective.samples,0);assert.equal(runtime.stats().buffer[0],488);
  const beforeRestoreUpdates=updates;
  gpu.events.webglcontextlost({preventDefault(){}});gpu.float=false;gpu.events.webglcontextrestored();assert.equal(runtime.stats().visual.effective.enabled,false);assert.equal(runtime.stats().buffer[0],585,'unsupported GPU must restore original DPR budget');assert.equal(runtime.stats().time,time);assert.equal(updates,beforeRestoreUpdates+1);unsubscribe();runtime.setVisualSettings({enabled:false});assert.equal(updates,beforeRestoreUpdates+1);
  runtime.dispose();runtime.dispose();gpu.calls.length=0;runtime.setVisualSettings({enabled:true});runtime.setFinish('pixel');assert.equal(gpu.calls.length,0);
  reduced=true;const still=mountWorld(definition,{el});still.setVisualSettings({enabled:true});assert.equal(still.stats().time,119);assert.equal(still.stats().running,false);still.dispose();
 } finally {for(const [key,value]of old)if(value===undefined)delete globalThis[key];else globalThis[key]=value;await rm(dir,{recursive:true,force:true});}
});
