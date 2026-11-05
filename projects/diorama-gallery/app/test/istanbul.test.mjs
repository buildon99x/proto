import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
const root=resolve(import.meta.dirname,'..');
test('Istanbul is an independent formation entry with all existing worlds retained',()=>{
 const source=readFileSync(resolve(root,'src/worlds.js'),'utf8');
 for(const id of ['harbor','singapore','dubai','dubai-timelapse','istanbul-timelapse'])assert.ok(source.includes(`id:'${id}'`),id);
 assert.match(readFileSync(resolve(root,'build.mjs'),'utf8'),/dist\/istanbul-timelapse.html/);
});
test('Istanbul builds a deterministic bounded lit city with a night finale',async()=>{
 const file=resolve(root,'src/istanbul-timelapse.js');assert.ok(existsSync(file),'Istanbul world implemented');
 const dir=await mkdtemp(join(tmpdir(),'istanbul-test-')),old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(file)};export * from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kit}});
  const {world,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));const T=toolkit({}).THREE,scene=new T.Scene(),content=new T.Group();scene.add(content);const W=toolkit(content),parts=world.build(W);
  assert.equal(world.duration,72);assert.equal(world.reducedStill,60);assert.equal(world.timeline,true);
  for(const name of ['hagia-sophia','blue-mosque','galata-tower','palace-courtyard','bosphorus-bridge','maidens-tower','waterfront-houses','istanbul-sea'])assert.ok(content.getObjectByName(name),name);
  assert.ok(parts.construction.count>1000,'detailed city, not landmark placeholders');assert.ok(parts.luminousMaterials.length>0);
  const sky=new T.HemisphereLight(),sun=new T.DirectionalLight();const env=world.environment({W,scene,lights:{sky,sun},profile:world.rendering});
  assert.equal(env.getState().timeOfDay,'night','default reference night');
  const snapshot=t=>{world.tick({t,parts,W});env.tick(t);content.updateMatrixWorld(true);const out=[];content.traverse(o=>{out.push(...o.matrix.elements);if(o.isInstancedMesh)out.push(...o.instanceMatrix.array);});return out;};
  const start=snapshot(0);const count=start.length;const dark=parts.luminousMaterials[0].emissiveIntensity;snapshot(60);assert.ok(parts.luminousMaterials[0].emissiveIntensity>dark+.5,'windows light at finale');
  const complete=snapshot(60);snapshot(20);assert.deepEqual(snapshot(60),complete,'seek restores every transform');assert.deepEqual(snapshot(72),start,'seam deterministic');
  for(const t of [0,12,24,36,48,60,69])assert.equal(snapshot(t).length,count,'no per-frame mesh allocation');
  snapshot(60);const box=new T.Box3().setFromObject(content,true);for(const k of ['x','y','z']){const i=['x','y','z'].indexOf(k);assert.ok(box.min[k]>=world.bounds[0][i]-.05,`min ${k}: ${box.min[k]}`);assert.ok(box.max[k]<=world.bounds[1][i]+.05,`max ${k}: ${box.max[k]}`);}
  const lightBox=new T.Box3();for(const light of parts.city.lights){const position=light.getWorldPosition(new T.Vector3());for(const batch of parts.construction.batches)for(const entry of batch.entries){lightBox.copy(batch.inst.geometry.boundingBox).applyMatrix4(entry.matrix);assert.equal(lightBox.containsPoint(position),false,'warm lights stay outside solid architecture rather than producing intersection hot spots');}}
  const viewDirection=new T.Vector3(...world.rendering.camera).normalize(),target=new T.Vector3(parts.landmarks.roots[2].position.x,1.3,parts.landmarks.roots[2].position.z).add(new T.Vector3(viewDirection.x,0,viewDirection.z).normalize().multiplyScalar(.565)),ray=new T.Raycaster(target.clone().addScaledVector(viewDirection,30),viewDirection.clone().negate());const hit=ray.intersectObject(parts.construction.root,true)[0];assert.ok(hit&&hit.point.distanceTo(target)<.25,'Galata lower stone shaft remains visible rather than hidden by waterfront houses');
  env.setState({timeOfDay:'day'});env.tick(60);assert.equal(env.getState().timeOfDay,'day');assert.ok(parts.luminousMaterials[0].emissiveIntensity<.1,'day mode dims illuminated windows');
  env.setState({timeOfDay:'night'});snapshot(60);assert.ok(parts.luminousMaterials[0].emissiveIntensity>.5);W.dispose();
 }finally{globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
