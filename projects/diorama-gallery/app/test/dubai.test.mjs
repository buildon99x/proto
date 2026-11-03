import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
const root=resolve(import.meta.dirname,'..');
test('Dubai is registered as third explorable offline world',()=>{
 const registry=readFileSync(resolve(root,'src/worlds.js'),'utf8');assert.match(registry,/id:'dubai'/);
 assert.match(readFileSync(resolve(root,'build.mjs'),'utf8'),/dist\/dubai.html/);
});
test('Dubai architecture is bounded and animation is deterministic without allocation',async()=>{
 const file=resolve(root,'src/dubai.js');assert.ok(existsSync(file),'Dubai world exists');
 const dir=await mkdtemp(join(tmpdir(),'dubai-test-')),old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
 const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
 await build({stdin:{contents:`export {default as world} from ${JSON.stringify(file)};export * from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs'),alias:{'@diorama/worlds':kit}});
 const {world,toolkit,framingCorners,defineWorld,resolveViewPivot}=await import(pathToFileURL(join(dir,'scene.mjs')));const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=world.build(W);
 const motionBox=new T.Box3(new T.Vector3(...world.bounds[0]),new T.Vector3(...world.bounds[1]));assert.equal(framingCorners({},motionBox).length,8,'legacy single-box framing unchanged');for(const framingBounds of [[],[[[0,0,0],[0,1,1]]],[[[0,0,0],[1,NaN,1]]]])assert.throws(()=>defineWorld({...world,rendering:{...world.rendering,framingBounds}}),/Framing regions/);
 assert.equal(world.name,'dubai-city-of-dreams');assert.equal(world.rendering.zoom,true);assert.equal(world.rendering.staticBatches,true);assert.equal(typeof framingCorners,'function','sparse landmark framing supported');assert.ok(world.rendering.framingBounds.length>2,'Dubai frames occupied regions, not empty high rear corners');
 for(const name of ['burj-khalifa','burj-al-arab','palm-jumeirah','dubai-frame','dubai-mall','dubai-skyline','engraved-dubai-map','gold-car','camel','diagonal-metro-viaduct','beach-station','city-station','coastal-sand','desert-gardens'])assert.ok(scene.getObjectByName(name),name);
 const island=scene.getObjectByName('palm-jumeirah');
 assert.ok(island.getObjectByName('island-shallows'),'layered coastal water shelf');
 for(const name of ['island-trunk','island-crescent','atlantis-palace'])assert.ok(island.getObjectByName(name),name);
 assert.equal(island.children.filter(o=>o.name.startsWith('island-frond-')).length,16,'sixteen separate sandy fronds');
 assert.ok(island.getObjectByName('island-crescent').userData.frontOpening>.5,'crescent opens toward mainland');
 scene.updateMatrixWorld(true);for(const frond of island.children.filter(o=>o.name.startsWith('island-frond-'))){const sand=frond.children.find(o=>o.isMesh&&o.material.color?.getHexString()==='dfc89a');for(const villa of frond.children.filter(o=>o.name==='island-villa'))for(const x of [-.05,.05])for(const z of [-.04,.04]){const p=new T.Vector3(x,0,z).applyMatrix4(villa.matrixWorld);const ray=new T.Raycaster(new T.Vector3(p.x,1,p.z),new T.Vector3(0,-1,0));assert.ok(ray.intersectObject(sand,false).length,'villa corners supported by sandy frond');}}
 const palmCrowns=new Set();island.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position.count===21)palmCrowns.add(o.geometry);});assert.equal(palmCrowns.size,1,'island palm crowns share one geometry for static batching');
 assert.ok(scene.getObjectByName('palm-causeway'),'island has a physical mainland connection');
 const terrace=scene.getObjectByName('western-city-terrace');scene.updateMatrixWorld(true);const support=new T.Box3().setFromObject(terrace,true);assert.ok(support.min.z<=-4.35,'western mid-rise has ground support');
 const city=scene.getObjectByName('dubai-skyline');assert.ok(city.children.filter(o=>o.name.startsWith('city-block-')).length>=18,'dense mid-rise city layers');
 scene.updateMatrixWorld(true);for(const block of city.children.filter(o=>o.name.startsWith('city-block-'))){const ray=new T.Raycaster(new T.Vector3(block.position.x,1,block.position.z),new T.Vector3(0,-1,0));assert.ok(ray.intersectObjects([scene.getObjectByName('dubai-mainland'),...terrace.children],false).length>0,'city block center has ground support');}const skylineBox=new T.Box3().setFromObject(city,true);assert.ok(skylineBox.max.y<8,'skyline stays subordinate to central Burj');
 scene.getObjectByName('burj-al-arab').traverse(o=>{if(o.isMesh&&o.material.color?.getHexString()==='38666d')assert.equal(o.material.side,T.DoubleSide,'sail glass visible from both orbit sides');});
 scene.updateMatrixWorld(true);const hero=new T.Box3().setFromObject(scene.getObjectByName('burj-khalifa'),true),size=hero.getSize(new T.Vector3());assert.ok(size.y/Math.max(size.x,size.z)>5,'Burj is slender stepped tower, not a thick cylinder');
 const snapshot=t=>{world.tick({t,parts,W});scene.updateMatrixWorld(true);const out=[];scene.traverse(o=>out.push(...o.matrix.elements));return out;};
 const camera=new T.OrthographicCamera();camera.position.set(...world.rendering.camera);camera.lookAt(0,0,0);camera.updateMatrixWorld();const corners=framingCorners(world,new T.Box3(new T.Vector3(...world.bounds[0]),new T.Vector3(...world.bounds[1]))).map(p=>new T.Vector3(...p).applyMatrix4(camera.matrixWorldInverse));const extent=new T.Box3().setFromPoints(corners);assert.equal(typeof resolveViewPivot,'function','occupied framing pivots at screen center');const pivot=resolveViewPivot(world,motionBox,camera).applyMatrix4(camera.matrixWorldInverse);assert.ok(Math.abs(pivot.y-(extent.min.y+extent.max.y)/2)<1e-9);assert.deepEqual(resolveViewPivot({},motionBox,camera).toArray(),motionBox.getCenter(new T.Vector3()).toArray());for(const t of [0,12,29,47,81]){snapshot(t);scene.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new T.Vector3(x,y,z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);assert.ok(v.x>=extent.min.x-.01&&v.x<=extent.max.x+.01&&v.y>=extent.min.y-.01&&v.y<=extent.max.y+.01,'occupied geometry fits sparse projection');}});}
 const zero=snapshot(0),count=zero.length;snapshot(23);assert.deepEqual(snapshot(0),zero,'seek deterministic');assert.ok(snapshot(world.duration).every((x,i)=>Math.abs(x-zero[i])<1e-7),'loop seamless');

 for(const t of [0,7,19,44]){snapshot(t);const poses=parts.boats.map(b=>({pos:b.position.clone(),yaw:b.rotation.y}));snapshot(t+.001);parts.boats.forEach((b,i)=>{const v=b.position.clone().sub(poses[i].pos).normalize();const bow=new T.Vector3(-Math.sin(poses[i].yaw),0,-Math.cos(poses[i].yaw));assert.ok(v.dot(bow)>.999,'bow follows velocity');const box=new T.Box3().setFromObject(b,true);assert.ok(box.min.y<-.005,'keel immerses in mean sea surface');});}
 const start=parts.train.children[0].position.clone();snapshot(5);assert.ok(start.distanceTo(parts.train.children[0].position)>.5,'metro moves');
 for(let t=0;t<world.duration;t+=2){assert.equal(snapshot(t).length,count,'no per-frame objects');const b=new T.Box3().setFromObject(scene,true);for(let i=0;i<3;i++){const k=['x','y','z'][i];assert.ok(b.min[k]>=world.bounds[0][i]-.05,`min ${k}: ${b.min[k]}`);assert.ok(b.max[k]<=world.bounds[1][i]+.05,`max ${k}: ${b.max[k]}`);}}
 const {OBB}=await import(pathToFileURL(resolve(root,'../.agents/skills/diorama-worlds/node_modules/three/examples/jsm/math/OBB.js')));const stationBounds=[];for(const name of ['beach-station','city-station'])scene.getObjectByName(name).traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();stationBounds.push(new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));}});
 const obstacles=['camel','gold-car','burj-khalifa','burj-al-arab','palm-jumeirah','dubai-frame','dubai-mall','dubai-skyline','desert-gardens'].map(name=>{const object=scene.getObjectByName(name),meshes=[];object.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();meshes.push({box:new T.Box3().setFromObject(o,true),obb:new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)});}});return{name,box:new T.Box3().setFromObject(object,true),meshes};});
 for(let t=0;t<60;t+=.1){snapshot(t);for(const car of parts.train.children){const box=new T.Box3().setFromObject(car,true);for(const obstacle of obstacles){if(!box.intersectsBox(obstacle.box))continue;car.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const carBox=new T.Box3().setFromObject(o,true),carOBB=new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);for(const fixed of obstacle.meshes){if(!carBox.intersectsBox(fixed.box))continue;assert.equal(carOBB.intersectsOBB(fixed.obb),false,`metro clears actual ${obstacle.name} meshes at ${t}`);}});}assert.ok(Math.abs(box.min.y-1.639)<1e-5,'wheels contact rail top');car.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const obb=new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);for(const station of stationBounds)assert.equal(obb.intersectsOBB(station),false,'metro clears station fixtures');});}}
 // Project each car through several inspection views; coordinates remain finite
 // and inside the complete world envelope over departure, turnback and return.
 for(const [x,y,z] of [[4,24,32],[-24,20,20],[24,28,-10]]){const view=new T.OrthographicCamera();view.position.set(x,y,z);view.lookAt(0,3,0);view.updateMatrixWorld();const full=new T.Box3().setFromPoints(framingCorners({},motionBox).map(p=>new T.Vector3(...p).applyMatrix4(view.matrixWorldInverse)));for(const t of [0,12,26,29,42,56,59.99]){snapshot(t);for(const car of parts.train.children){const point=car.position.clone().applyMatrix4(view.matrixWorldInverse);assert.ok(Number.isFinite(point.x+point.y+point.z));assert.ok(full.containsPoint(point),'train remains in world envelope from inspection view');}}}

 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_begin>'};parts.sea.onBeforeCompile(shader);assert.match(shader.fragmentShader,/viewMatrix/,'wave normal perturbation transformed into view space');assert.match(shader.fragmentShader,/shoreDepth/,'sea has broad depth variation');
 assert.ok(parts.dynamicRoots.includes(parts.train));assert.ok(parts.boats.length>=2);assert.ok(parts.fountain.drops.length>50);assert.equal(new Set(parts.fountain.emitters?.map(e=>`${e.x},${e.z}`)).size,2,'two separated reference fountain clusters');W.dispose();
 }finally{globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});
