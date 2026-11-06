import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
test('estate gardens provide bounded named organic landscaping and repeatable koi motion',async()=>{
 const file=resolve(import.meta.dirname,'../src/estate-gardens.js');assert.ok(existsSync(file),'gardens module exists');
 const dir=mkdtempSync(join(tmpdir(),'estate-gardens-'));
 try{
 const kit=resolve(import.meta.dirname,'../../.agents/skills/diorama-worlds/kit/world.js');
 await build({stdin:{resolveDir:resolve(import.meta.dirname,'..'),contents:`export * from ${JSON.stringify(file)};export * from ${JSON.stringify(resolve(import.meta.dirname,"../src/estate-architecture.js"))};export {toolkit} from ${JSON.stringify(kit)};`},bundle:true,platform:'node',format:'esm',outfile:join(dir,'test.mjs')});
 const {toolkit,buildEstateGardens,animateEstateGardens,buildEstateArchitecture}=await import(pathToFileURL(join(dir,'test.mjs')));
 const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=buildEstateGardens(W);
 for(const name of ['estate-gardens','estate-koi-pond','estate-arched-bridge','estate-willow','estate-blossom','estate-pine'])assert.ok(scene.getObjectByName(name),name);
 assert.ok(parts.fish.length>=6);assert.ok(parts.willowCrowns.length>=3);assert.ok(parts.waterMaterial.transparent);
 let before=0;scene.traverse(()=>before++);
 const snap=t=>{animateEstateGardens({t,parts,W});scene.updateMatrixWorld(true);return parts.fish.flatMap(o=>[...o.position.toArray(),o.rotation.y]);};
 const zero=snap(0);snap(25);assert.deepEqual(snap(0),zero);assert.deepEqual(snap(48),zero);
 for(const t of [0,7,19,39]){snap(t);const b=new T.Box3().setFromObject(scene);assert.ok(b.min.x>=-9.2 && b.max.x<=8.4,`x bounds ${b.min.x}..${b.max.x}`);assert.ok(b.min.z>=-12.5 && b.max.z<=12.5);for(const f of parts.fish)assert.ok(Math.abs(f.position.x+5.3)<1.7 && Math.abs(f.position.z-8.5)<1.9);}
 const architecture=buildEstateArchitecture(W);scene.updateMatrixWorld(true);
 const footprints=architecture.buildings.filter(b=>b.name!=='estate-gate').map(b=>({name:b.name,box:new T.Box3().setFromObject(b.children[0])}));
 const pondSurfaces=[parts.pond.children[0],scene.getObjectByName('estate-inner-water-garden').children[0]],ray=new T.Raycaster(),position=new T.Vector3();
 parts.root.traverse(o=>{if(!['estate-pine','estate-willow','estate-blossom','estate-stone-basin'].includes(o.name))return;
  o.getWorldPosition(position);
  for(const {name,box} of footprints)assert.ok(!(position.x>box.min.x-.1&&position.x<box.max.x+.1&&position.z>box.min.z-.1&&position.z<box.max.z+.1),`${o.name} at ${position.x},${position.z} clears ${name} solid footprint`);
  ray.set(new T.Vector3(position.x,20,position.z),new T.Vector3(0,-1,0));assert.equal(ray.intersectObjects(pondSurfaces,false).length,0,`${o.name} at ${position.x},${position.z} rooted on dry ground`);
 });
 architecture.root.removeFromParent();
 let after=0;scene.traverse(()=>after++);assert.equal(after,before);W.dispose();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
