import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

// Real city + construction instances + Three's actual material-uniform refresh.
// Canvas calls are mocked only for authored map textures. This is not a pixel test.
test('real Dubai construction keeps every night circuit unlit by day across seeks, manual controls and remounts',async()=>{
 const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'dubai-night-')),old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const mounts=[];
 try{
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js'),three=resolve(root,'../.agents/skills/diorama-worlds/node_modules/three');
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src/dubai-timelapse.js'))}; export * from ${JSON.stringify(kit)}; export {WebGLMaterials} from ${JSON.stringify(join(three,'src/renderers/webgl/WebGLMaterials.js'))};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
  const {world,toolkit,WebGLMaterials}=await import(pathToFileURL(join(dir,'world.mjs'))),T=toolkit({}).THREE;
  function mount(){
   const scene=new T.Scene(),content=new T.Group();scene.add(content);const W=toolkit(content),parts=world.build(W);W.batch({staticScene:false,dynamicRoots:parts.dynamicRoots});
   scene.background=new T.Color(world.rendering.background);const sky=new T.HemisphereLight('#fff','#888',1),sun=new T.DirectionalLight('#fff',3);scene.add(sky,sun);
   const env=world.environment({W,scene,lights:{sky,sun},duration:90,track:world.environmentTrack}),camera=new T.PerspectiveCamera(45,1.7,.1,100);camera.position.set(4,24,32);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const all=new Set();content.traverse(o=>{for(const m of [o.material].flat())if(m)all.add(m);});
   const materials=[...all].filter(m=>m.userData.dubaiNight);
   assert.equal([...all].filter(m=>m.emissive?.getHex()&&!m.userData.dubaiNight).length,0,'no ungoverned emissive building material');
   assert.ok(materials.length>=80&&materials.length<110,'bounded material budget');
   const fixture={W,parts,materials,env,camera};mounts.push(fixture);return fixture;
  }
  const rendererMaterials=WebGLMaterials(null,{get:()=>({})});
  function snapshot(f,t){
   world.tick({t,parts:f.parts,W:f.W});f.env.tick(t,f.camera);f.W.updateBatches();
   return f.materials.map(m=>{
    const u={opacity:{},diffuse:{value:new T.Color()},emissive:{value:new T.Color()},roughness:{},metalness:{}};
    rendererMaterials.refreshMaterialUniforms(u,m,1,800,null);
    const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <emissivemap_fragment>'};m.onBeforeCompile(shader);
    if(shader.uniforms.dubaiLightLevel)assert.equal(shader.uniforms.dubaiLightLevel,m.userData.dubaiNight.level,'compilation binds current live level');
    return {intensity:m.emissiveIntensity,level:m.userData.dubaiNight.level.value,rgb:u.emissive.value.toArray(),color:m.color.getHexString()};
   });
  }
  const f=mount(),day=snapshot(f,0),off=values=>{for(const m of values){assert.equal(m.intensity,0);assert.equal(m.level,0);assert.deepEqual(m.rgb,[0,0,0]);}};
  for(const t of [0,25,40,54.9,55,89.99,90])off(snapshot(f,t));
  const dusk=snapshot(f,67.5);assert.ok(dusk.some(m=>m.level===0)&&dusk.some(m=>m.level>0&&m.level<1)&&dusk.some(m=>m.level===1));
  const night=snapshot(f,80);assert.ok(night.every(m=>m.level===1&&m.intensity>0));
  assert.deepEqual(snapshot(f,84),night);assert.deepEqual(snapshot(f,40),day);assert.deepEqual(snapshot(f,80),night);assert.deepEqual(snapshot(f,170),night);off(snapshot(f,90));
  f.env.setState({timeOfDay:'night',weather:'rain'});assert.deepEqual(snapshot(f,20),night,'explicit manual night wins even during formation');
  f.env.setState({timeOfDay:'day'});off(snapshot(f,80));
  f.env.setTrack([{id:'early',type:'night',time:0},{id:'clear',type:'clear',time:0}]);f.env.setMode('automatic');assert.deepEqual(snapshot(f,20),night);
  f.env.resetTrack();off(snapshot(f,20));
  const g=mount();assert.deepEqual(snapshot(g,80),night,'fresh mounting reproduces deterministic schedules');
  const disposed=new Set();for(const m of f.materials)m.addEventListener('dispose',()=>disposed.add(m));f.W.dispose();assert.equal(disposed.size,f.materials.length);
 }finally{for(const f of mounts)f.W.dispose();globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
