import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../.agents/skills/diorama-worlds/node_modules/three/build/three.module.js';
import {sectionTriangles,inspectConfiguration} from '../src/desert-section.js';

test('section uses indexed triangle coordinates transformed into world space',()=>{
 const root=new T.Group(),box=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial());
 box.name='actual-box';box.position.set(3,2,-7.4);root.add(box);
 const result=sectionTriangles(root,-7.4);
 assert.ok(result.segments.length>=4);
 for(const s of result.segments)for(const p of [s.a,s.b]){assert.ok(Math.abs(p[2]+7.4)<1e-8);assert.ok(p[0]>=2&&p[0]<=4&&p[1]>=1&&p[1]<=3);}
 assert.equal(result.meshCount,1);assert.equal(result.triangleCount,12);
 assert.ok(result.segments.some(s=>s.a[0]===2&&s.b[0]===2),'left actual face');
});

test('section handles nonindexed meshes, instances, hidden ancestors and coplanar triangles',()=>{
 const root=new T.Group(),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,-1,2,0,1,0,2,1],3));
 const triangle=new T.Mesh(geometry,new T.MeshBasicMaterial());root.add(triangle);
 const instance=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial(),2);
 instance.setMatrixAt(0,new T.Matrix4().makeTranslation(4,0,0));instance.setMatrixAt(1,new T.Matrix4().makeTranslation(10,0,3));root.add(instance);
 const hidden=new T.Group();hidden.visible=false;hidden.add(new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshBasicMaterial()));root.add(hidden);
 const result=sectionTriangles(root,0);
 assert.equal(result.meshCount,3,'one ordinary mesh and two instances, hidden group skipped');
 assert.ok(result.segments.some(s=>JSON.stringify(s.a)==='[1,0,0]'&&JSON.stringify(s.b)==='[0,1,0]'));
 assert.ok(result.segments.some(s=>s.a[0]>=3.5&&s.a[0]<=4.5));
 assert.ok(result.segments.every(s=>s.a[0]<5&&s.b[0]<5),'nonintersecting instance absent');
 const coplanar=new T.Group();const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));coplanar.add(new T.Mesh(g,new T.MeshBasicMaterial()));
 assert.equal(sectionTriangles(coplanar,0).segments.length,3,'coplanar triangle contributes actual perimeter');
});

test('inspection remains a fixed desert-only snapshot and section plane',()=>{
 assert.equal(inspectConfiguration.worldId,'desert');assert.equal(inspectConfiguration.z,-7.4);assert.equal(inspectConfiguration.time,12);
 assert.deepEqual(inspectConfiguration.topCamera.up,[0,0,-1]);
 assert.equal(inspectConfiguration.sectionVerticalScale,1,'no vertical exaggeration');
});

test('actual candidate section crosses the northern shrine, river and eastern pyramid',async()=>{
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {resolve,join}=await import('node:path');const {pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'actual-desert-section-')),oldDocument=globalThis.document;
 const context=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>context})};
 try{
  const kit=resolve('../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve('src/desert.js'))};export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:resolve('.')},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kit}});
  const {world,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs')));const scene=new T.Group(),W=toolkit(scene);const parts=world.build(W);scene.traverse(o=>{if(o.name==='distant-pyramid'&&o.position.x>0)o.name='right-distant-pyramid';});world.tick({t:12,parts,W});
  const result=sectionTriangles(scene,inspectConfiguration.z);
  const segments=name=>result.segments.filter(s=>s.ancestry.includes(name));
  const shrine=segments('rear-stepped-sanctuary'),water=segments('sinuous-river'),pyramid=segments('right-distant-pyramid');
  assert.ok(shrine.length>10&&water.length>0&&pyramid.length>0);assert.ok(pyramid.every(s=>s.a[0]>0&&s.b[0]>0),'section measures only right pyramid');
  const range=list=>{const p=list.flatMap(s=>[s.a,s.b]);return{minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),maxY:Math.max(...p.map(v=>v[1]))};};
  const s=range(shrine),w=range(water),p=range(pyramid);
  assert.ok(w.minX-s.maxX>.1,'actual section shrine footprint clears water');assert.ok(p.minX-w.maxX>.1,'actual pyramid section clears water');
  assert.ok(s.maxY>1&&p.maxY>1,'real elevation, not flat blueprint');
  assert.ok(result.triangleCount>10000&&result.cutMeshCount>10);
  assert.ok(result.segments.every(s=>!s.ancestry.includes('cinematic-horizon')),'hidden cinematic art excluded');
  W.dispose();
 }finally{globalThis.document=oldDocument;await rm(dir,{recursive:true,force:true});}
});

test('standalone inspection entry is isolated from gallery controls and builds offline',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../src/desert-inspect.js',import.meta.url),'utf8');
 assert.match(source,/sectionTriangles\(content/);assert.match(source,/world\.build\(W\)/);
 assert.doesNotMatch(source,/blueprint|attachZoom|showWorld|setInterval|requestAnimationFrame/);
 const builder=await readFile(new URL('../build.mjs',import.meta.url),'utf8');assert.match(builder,/dist\/desert-inspect\.js/);assert.match(builder,/dist\/desert-inspect\.html/);
});
