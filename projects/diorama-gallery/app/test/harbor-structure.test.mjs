import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

test('actual scene builds, fits bounds and crane contact endpoints meet',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'harbor-structure-'));
 const old=globalThis.document;
 // Canvas is only a build-time procedural paint target; this is not a WebGL/visual test.
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillStyle:'',fillRect(){}})})};
 try {
  const root=resolve(import.meta.dirname,'..');
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as scene} from ${JSON.stringify(resolve(root,'src/harbor.js'))};export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kit}});
  const {scene,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));
  // Obtain the bundled Three namespace without allocating a GPU context.
  const first=toolkit({});const T=first.THREE
  const group=new T.Group(), W=toolkit(group),parts=scene.build(W);
  for(const t of scene.contactTimes){scene.tick({t,parts,W});const contacts=scene.contacts({t,parts,W});for(const pair of contacts)assert.ok(Math.hypot(...pair.a.map((n,i)=>n-pair.b[i]))<1e-7,`contact at ${t}`);}
  for(const t of [0,8,16,24,48,72,95.999]){
   scene.tick({t,parts,W});group.updateMatrixWorld(true);const box=new T.Box3().setFromObject(group);
   for(let i=0;i<3;i++){const k=['x','y','z'][i];assert.ok(box.min[k]>=scene.bounds[0][i]-.05,`min ${k} ${box.min[k]}`);assert.ok(box.max[k]<=scene.bounds[1][i]+.05,`max ${k} ${box.max[k]}`);}
  }
  scene.tick({t:16,parts,W});group.updateMatrixWorld(true);
  const roadTruck=group.children.find(o=>o.isGroup&&o.position.x===5.1&&o.position.z>0);
  assert.ok(roadTruck,'right quay road truck exists');
  const truckBox=new T.Box3().setFromObject(roadTruck), cargoBox=new T.Box3().setFromObject(parts.cranes[1].cargo);
  assert.equal(truckBox.intersectsBox(cargoBox),false,'truck stays clear of crane source/drop volume');
  for(let t=0;t<96;t+=.5){
   scene.tick({t,parts,W});group.updateMatrixWorld(true);
   for(const foam of parts.wakes){const bounds=new T.Box3().setFromObject(foam.root);assert.ok(bounds.min.y>.045,`wake above water at ${t}: ${bounds.min.y}`);}
  }
  W.dispose();
 } finally {globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
