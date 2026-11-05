import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

test('Paris landmarks have recognizable hollow structures and owned switchable night lighting',async()=>{
 const root=resolve(import.meta.dirname,'..'),file=resolve(root,'src/paris-landmarks.js');
 assert.ok(existsSync(file),'Paris landmark builder exists');
 const dir=await mkdtemp(join(tmpdir(),'paris-landmarks-'));
 try {
  const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {buildParisLandmarks} from ${JSON.stringify(file)}; export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs')});
  const {buildParisLandmarks,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));
  const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),{roots,illuminated}=buildParisLandmarks(W);
  assert.deepEqual(roots.map(r=>r.name),['eiffel-tower','notre-dame','louvre','arc-de-triomphe','sacre-coeur']);
  for(const r of roots){assert.equal(r.userData.stage,'architecture');const box=new T.Box3().setFromObject(r);assert.ok(Number.isFinite(box.max.y));assert.ok(box.max.y-box.min.y>1.4);}
  const eiffel=roots[0];assert.ok(new T.Box3().setFromObject(eiffel).max.y>7,'Eiffel dominates skyline');
  assert.ok(eiffel.getObjectByName('eiffel-lattice'),'tower uses open lattice');
  const arc=roots[3].getObjectByName('triumphal-arch');
  assert.equal(arc.geometry.type,'ExtrudeGeometry');assert.ok(arc.geometry.parameters.shapes.holes.length>0,'arch aperture is real geometry');
  scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(2.6,1,8),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(arc).length,0,'center opening allows a ray through');ray.ray.origin.x=3.17;assert.ok(ray.intersectObject(arc).length>0,'solid pier blocks the same ray');
  const roofBox=new T.Box3();roots[2].traverse(o=>{if(o.isMesh&&o.material.color?.getHexString()==='697782')roofBox.union(new T.Box3().setFromObject(o));});assert.ok(roofBox.min.z>=2.7,'palace roofs must stay on their narrow footprint, clear of the river');
  assert.ok(roots[1].getObjectByName('rose-window'));assert.ok(roots[2].getObjectByName('glass-pyramid'));assert.ok(roots[4].getObjectByName('central-dome'));
  assert.ok(illuminated.length>=3);for(const m of illuminated){assert.equal(m.emissiveIntensity,0);assert.ok(m.userData.nightIntensity>0);}
  const geometries=new Set();let meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;geometries.add(o.geometry);}});assert.ok(meshes>300);assert.ok(geometries.size<meshes/3,'repeated architecture shares geometry');W.dispose();
 } finally {await rm(dir,{recursive:true,force:true});}
});
