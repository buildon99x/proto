import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

test('Paris district has open courtyards, sculpted roof silhouettes and bounded supported roof details',async()=>{
 const root=resolve(import.meta.dirname,'..'),file=resolve(root,'src/paris-city.js');
 const dir=await mkdtemp(join(tmpdir(),'paris-district-'));
 try {
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {buildParisDistrict} from ${JSON.stringify(file)}; export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs')});
  const {buildParisDistrict,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));
  const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),{root:district}=buildParisDistrict(W);scene.updateMatrixWorld(true);
  assert.equal(district.children.length,14);
  for(const index of [0,6,7]){const block=district.getObjectByName(`haussmann-block-${index}`);const ray=new T.Raycaster(new T.Vector3(block.position.x,6,block.position.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(block,true)[0];assert.ok(hit.point.y<.4,'open courtyard admits daylight to ground');}
  for(const block of district.children){const b=new T.Box3().setFromObject(block);assert.ok(b.min.x>-8.11&&b.max.x<8.11&&b.min.z>-8.11&&b.max.z<8.11,`architectural detail stays within diorama bounds: ${block.name} ${JSON.stringify(b)}`);assert.ok(b.max.y<3.7,'pavilions remain lower than landmarks');}
  const roofs=[];district.traverse(o=>{if(o.isMesh&&o.material.userData.snowSurface)roofs.push(o);});assert.ok(roofs.length>14,'multiple roof volumes articulate courtyard wings and pavilions');
  for(const roof of roofs){const p=roof.geometry.attributes.position,levels=new Set();for(let i=0;i<p.count;i++)levels.add(p.getY(i).toFixed(3));assert.ok(levels.size>=3,'roof has steep mansard skirt and narrower pitched cap');}
  const batchKeys=new Set();district.traverse(o=>{if(o.isMesh)batchKeys.add(o.geometry.uuid+'/'+o.material.uuid);});assert.ok(batchKeys.size<80,'identical dormer pediments must share geometry and material for batching');
  W.dispose();
 }finally{await rm(dir,{recursive:true,force:true});}
});
