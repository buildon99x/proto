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
  const eiffel=roots[0];assert.ok(new T.Box3().setFromObject(eiffel).max.y>10.8,'Eiffel rises substantially above the previous8.8-unit tower');
  assert.ok(eiffel.getObjectByName('eiffel-lattice'),'tower uses open lattice');
  const arc=roots[3].getObjectByName('triumphal-arch');
  assert.equal(arc.geometry.type,'ExtrudeGeometry');assert.ok(arc.geometry.parameters.shapes.holes.length>0,'arch aperture is real geometry');
  scene.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(2.6,1,8),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(arc).length,0,'center opening allows a ray through');ray.ray.origin.x=3.17;assert.ok(ray.intersectObject(arc).length>0,'solid pier blocks the same ray');
  const roofBox=new T.Box3();roots[2].traverse(o=>{if(o.isMesh&&o.material.color?.getHexString()==='697782')roofBox.union(new T.Box3().setFromObject(o));});assert.ok(roofBox.min.z>=2.7,'palace roofs must stay on their narrow footprint, clear of the river');
  assert.ok(roots[1].getObjectByName('rose-window'));assert.ok(roots[2].getObjectByName('glass-pyramid'));assert.ok(roots[4].getObjectByName('central-dome'));
  const pyramidBounds=new T.Box3().setFromObject(roots[2].getObjectByName('glass-pyramid'));assert.ok(pyramidBounds.min.x>-1.8 && pyramidBounds.max.x<.25,'pyramid clears foreground Haussmann blocks');assert.ok(pyramidBounds.max.y>1.23,'pyramid apex remains legible above court');
  const basilicaBounds=new T.Box3().setFromObject(roots[4]);assert.ok(roots[4].position.y===1.65 && basilicaBounds.min.y>=1.3 && basilicaBounds.max.y<5.3,'basilica rests on raised terrace and stays in frame');
  assert.ok(illuminated.length>=3);for(const m of illuminated){assert.equal(m.emissiveIntensity,0);assert.ok(m.userData.nightIntensity>0);}
  const geometries=new Set();let meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;geometries.add(o.geometry);}});assert.ok(meshes>300);assert.ok(geometries.size<meshes/3,'repeated architecture shares geometry');W.dispose();
 } finally {await rm(dir,{recursive:true,force:true});}
});

test('Louvre chimney stems and basilica entry stairs meet real supporting geometry',async()=>{
 const {toolkit}=await import('../../.agents/skills/diorama-worlds/kit/world.js'),{buildParisLandmarks}=await import('../src/paris-landmarks.js'),{buildParisGround}=await import('../src/paris-city.js');
 const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene);try{
 const ground=buildParisGround(W),{roots}=buildParisLandmarks(W);scene.updateMatrixWorld(true);
 const louvre=roots.find(r=>r.name==='louvre'),stems=louvre.children.filter(o=>o.isMesh&&Math.abs(o.scale.x-.08)<1e-6&&Math.abs(o.scale.z-.10)<1e-6);assert.equal(stems.length,4);
 for(const stem of stems){const b=new T.Box3().setFromObject(stem),ray=new T.Raycaster(new T.Vector3((b.min.x+b.max.x)/2,8,(b.min.z+b.max.z)/2),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(louvre.children.filter(o=>o.isMesh&&o.material.color?.getHexString()==='697782'),true);assert.ok(hits.length&&b.min.y-hits[0].point.y<.015,'chimney base must meet the palace roof');}
 const s=roots.find(r=>r.name==='sacre-coeur'),steps=s.children.filter(o=>o.isMesh&&Math.abs(o.scale.z-.15)<1e-6&&o.scale.x>=1.89&&o.scale.x<=2.31);assert.equal(steps.length,5);
 for(const step of steps){const b=new T.Box3().setFromObject(step),x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2;assert.ok(b.min.y<=ground.groundHeight(x,z)+.015,'basilica entry riser must meet the actual terrace');}
 }finally{W.dispose();}
});

test('Louvre pyramid has an open, paved court without trees through its glass',async()=>{
 const {toolkit}=await import('../../.agents/skills/diorama-worlds/kit/world.js'),{buildParisLandmarks}=await import('../src/paris-landmarks.js'),{buildParisGround,buildParisLife}=await import('../src/paris-city.js');const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene);try{
 const ground=buildParisGround(W),{roots}=buildParisLandmarks(W),life=buildParisLife(W,ground.groundHeight);scene.updateMatrixWorld(true);const pyramid=roots[2].getObjectByName('glass-pyramid'),b=new T.Box3().setFromObject(pyramid);assert.ok(b.max.x<.25,'pyramid stays left of the foreground arch with a visible plaza gap');
 for(const x of[b.min.x,b.max.x])for(const z of[b.min.z,b.max.z])assert.ok(b.min.y-ground.groundHeight(x,z)<=.015,'pyramid base corners meet the court');
 for(const item of[...life.root.children,...life.streetlamps.children,...life.people.children]){const t=new T.Box3().setFromObject(item);assert.equal(t.intersectsBox(b),false,'trees, lamps and visitors must not intersect pyramid glass');}
 }finally{W.dispose();}
});
