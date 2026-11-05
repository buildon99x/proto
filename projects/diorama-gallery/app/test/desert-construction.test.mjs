import test from 'node:test';
import assert from 'node:assert/strict';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
import {riverCenter,riverHalfWidth} from '../src/desert-motion.js';
const implementation=await import('../src/desert-construction.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
function setup(){assert.equal(typeof implementation.createAncientConstruction,'function','ancient construction factory exists');const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=implementation.createAncientConstruction(W);return {T,scene,W,parts};}
test('ancient crews and tools appear only while their construction stages are active',()=>{
 const {W,parts}=setup();for(const t of [0,20,119,131.99]){parts.tick(t);assert.ok(parts.zones.every(zone=>zone.scale.length()===0),'worksites vanish outside construction');}
 parts.tick(68);assert.ok(parts.zones[0].scale.x>.99);assert.equal(parts.zones[1].scale.x,0);
 parts.tick(90);assert.ok(parts.zones[1].scale.x>.99);assert.ok(parts.scaffolds.length>=2);assert.ok(parts.actors.length>=3);
 W.dispose();
});
test('stone, hand, cart and lifting rope contacts meet at real posed coordinates',()=>{
 const {W,parts,scene}=setup();for(const t of [58,64.5,72,80,89]){parts.tick(t);scene.updateMatrixWorld(true);for(const contact of parts.contacts()){assert.ok(Math.hypot(...contact.a.map((v,i)=>v-contact.b[i]))<.006,`${contact.label} at ${t}`);}}
 for(const t of [64,66,68,70]){parts.tick(t);assert.ok(parts.lift.stone.position.y>=.09&&parts.lift.stone.position.y<=.95);assert.ok(parts.lift.rope.scale.y>0);}
 W.dispose();
});
test('hauling is deterministic, stays on land and keeps resources bounded after batching',()=>{
 const {W,parts,scene,T}=setup();W.batch({staticScene:true,dynamicRoots:parts.dynamicRoots});
 const snapshot=()=>{scene.updateMatrixWorld(true);const values=[];parts.root.traverse(o=>values.push(...o.matrixWorld.elements));return values;};
 const resources=()=>{const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});return [geometries.size,materials.size];};
 parts.tick(71.25);W.updateBatches();const before=snapshot(),counts=resources();
 for(let i=0;i<240;i++){parts.tick(i*.55);W.updateBatches();}
 parts.tick(71.25);W.updateBatches();assert.deepEqual(snapshot(),before);assert.deepEqual(resources(),counts);
 const p=new T.Vector3();for(const t of [42.1,43,93,93.9]){parts.tick(t);scene.updateMatrixWorld(true);parts.cart.getWorldPosition(p);assert.ok(p.x< -6,'appearing/disappearing work stays at its site, not the river origin');}for(let t=48;t<91;t+=.5){parts.tick(t);scene.updateMatrixWorld(true);parts.cart.getWorldPosition(p);assert.ok(p.x<riverCenter(p.z)-riverHalfWidth(p.z)-.4,'cart is well clear of water');assert.ok(p.x>-8.5&&p.x< -7.9&&p.z> -4.2&&p.z< -1.8,'cart stays in west-side work corridor');}
 parts.tick(119);W.updateBatches();assert.ok(parts.zones.every(z=>z.scale.length()===0));W.dispose();
});

test('actual city terrain supports cart wheels and worker feet without dune or rock penetration',async()=>{
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join,resolve}=await import('node:path'),{pathToFileURL}=await import('node:url');
 const dir=await mkdtemp(join(tmpdir(),'construction-ground-')),old=globalThis.document;
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 let W;
 try{
  const kit=resolve(import.meta.dirname,'../../.agents/skills/diorama-worlds/kit/world.js');
  await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(import.meta.dirname,'../src/desert-timelapse.js'))};export {toolkit} from ${JSON.stringify(kit)};`,resolveDir:import.meta.dirname},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
  const {world,toolkit:make}=await import(pathToFileURL(join(dir,'world.mjs'))),T=make({}).THREE,scene=new T.Group();W=make(scene);const parts=world.build(W),construction=parts.construction,obstacles=[];
  scene.traverse(o=>{let within=false;for(let p=o;p;p=p.parent)if(p===construction.root)within=true;if(o.isMesh&&!within)obstacles.push(o);});
  const ray=new T.Raycaster(),point=new T.Vector3(),down=new T.Vector3(0,-1,0),box=new T.Box3();
  function supported(object,label){object.getWorldPosition(point);ray.set(new T.Vector3(point.x,20,point.z),down);const hit=ray.intersectObjects(obstacles,false)[0];assert.ok(hit,`${label} must have land beneath it`);box.setFromObject(object,true);assert.ok(box.min.y>=hit.point.y-.005,`${label} penetrates surface: sole ${box.min.y}, ground ${hit.point.y}`);assert.ok(box.min.y<=hit.point.y+.03,`${label} floats above surface`);}
  for(const batched of [false,true]){if(batched)W.batch({staticScene:true,dynamicRoots:parts.dynamicRoots,excludedRoots:parts.cinematicRoots});
  for(const t of [43.6,79.6,82.25,92.4,105.4,...Array.from({length:131},(_,i)=>42+i*.5)]){
   world.tick({t,parts,W});if(batched)W.updateBatches();scene.updateMatrixWorld(true);
   for(const [i,actor] of construction.actors.entries())if(Math.abs(actor.root.matrixWorld.determinant())>.001){supported(actor.leftFoot,`worker ${i} left foot at ${t}`);supported(actor.rightFoot,`worker ${i} right foot at ${t}`);}
   for(const scaffold of construction.scaffolds)if(Math.abs(scaffold.matrixWorld.determinant())>.125)for(const post of scaffold.children)if(post.isMesh&&post.scale.y>1&&post.scale.x<.1)supported(post,`scaffold post at ${t}`);
   if(Math.abs(construction.cart.matrixWorld.determinant())>.125){construction.cart.traverse(o=>{if(o.name==='cart-wheel')supported(o,`cart wheel at ${t}`);});const moving=new T.Box3().setFromObject(construction.cart,true);for(const fixed of [...construction.scaffolds,construction.lift.root])if(Math.abs(fixed.matrixWorld.determinant())>.125)assert.equal(moving.intersectsBox(new T.Box3().setFromObject(fixed,true)),false,`cart clears scaffold and lifting frame at ${t}`);}
  }}
 }finally{W?.dispose();globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
