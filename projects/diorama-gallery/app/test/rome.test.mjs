import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
export async function fixture(file='rome-timelapse.js'){
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');
 const dir=await mkdtemp(join(tmpdir(),'rome-test-')),old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src',file))};export * from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
 const {world,toolkit,framingProjection,resolveViewPivot}=await import(join(dir,'world.mjs')),T=toolkit({}).THREE,scene=new T.Scene(),content=new T.Group();scene.add(content);const W=toolkit(content),parts=world.build(W);W.batch({staticScene:!!world.rendering.staticBatches,dynamicRoots:parts.dynamicRoots});
 return {world,T,W,scene,content,parts,framingProjection,resolveViewPivot,async close(){W.dispose();globalThis.document=old;await rm(dir,{recursive:true,force:true});}};
}
test('Rome timeline has a complete night city hold, deterministic phases and continuous rewind',async()=>{
 const file=resolve(root,'src/rome-timeline.js');assert.ok(existsSync(file),'Rome timeline exists');const {DURATION,constructionTime,PHASES,constructionWindow}=await import(file);
 assert.equal(DURATION,84);assert.ok(PHASES.length>=6);assert.equal(constructionTime(0),0);assert.equal(constructionTime(84),0);assert.equal(constructionTime(65),65);assert.ok(constructionTime(83.999)<.001);
 for(const t of [-13,0,26,54,76,82])assert.ok(Math.abs(constructionTime(t)-constructionTime(t+84))<1e-9);
 const box={min:{x:1,y:2,z:2},max:{x:2,y:3,z:3}};assert.equal(constructionWindow(['colosseum'],box)[2],'building');assert.equal(constructionWindow(['rome-gardens'],box)[2],'plant');
});
test('Rome provides recognizable landmarks and bounded complete/partial deterministic construction',async()=>{
 assert.ok(existsSync(resolve(root,'src/rome-timelapse.js')),'Rome world exists');const f=await fixture();try{const {world,T,W,parts}=f;
 for(const name of ['colosseum','st-peters-basilica','st-peters-colonnade','pantheon','roman-forum','castel-sant-angelo','arch-of-constantine','spanish-steps','villa-borghese','tiber-river'])assert.ok(parts.source.getObjectByName(name),name);
 assert.equal(world.duration,84);assert.equal(world.still,0);assert.equal(world.reducedStill,68);assert.ok(parts.construction.count>2500);assert.ok(parts.construction.batches.length<450);
 const snapshot=t=>{world.tick({t,parts,W});W.updateBatches();return parts.construction.batches.flatMap(b=>Array.from(b.inst.instanceMatrix.array));};
 const start=snapshot(0);snapshot(35);assert.deepEqual(snapshot(0),start);assert.deepEqual(snapshot(84),start);const final=snapshot(68);assert.ok(final.some((v,i)=>v!==start[i]));const writes=parts.construction.writes;snapshot(70);assert.equal(parts.construction.writes,writes);
 const m=new T.Matrix4();for(const b of parts.construction.batches)for(let i=0;i<b.entries.length;i++){b.inst.getMatrixAt(i,m);assert.ok(m.elements.every((v,j)=>Math.abs(v-b.entries[i].matrix.elements[j])<1e-5),'completed source transform');}
 for(const t of [0,15,30,50,68,79]){snapshot(t);f.content.updateMatrixWorld(true);for(const b of parts.construction.batches){b.inst.geometry.computeBoundingBox();for(let i=0;i<b.entries.length;i++){b.inst.getMatrixAt(i,m);const box=b.inst.geometry.boundingBox.clone().applyMatrix4(m);for(const [n,k] of ['x','y','z'].entries())assert.ok(box.min[k]>=world.bounds[0][n]-.03&&box.max[k]<=world.bounds[1][n]+.03,`bounds ${k} ${box.min[k]} ${box.max[k]}`);}}}
 const mid=snapshot(39);snapshot(7);assert.deepEqual(snapshot(39),mid);
 }finally{await f.close();}
});
test('Rome registers separate completed and formation offline entries without removing legacy worlds',()=>{
 const registry=readFileSync(resolve(root,'src/worlds.js'),'utf8');for(const id of ['harbor','singapore','dubai','dubai-timelapse','rome','rome-timelapse'])assert.ok(registry.includes(`id:'${id}'`),id);
 const build=readFileSync(resolve(root,'build.mjs'),'utf8');assert.match(build,/dist\/rome\.html/);assert.match(build,/dist\/rome-timelapse\.html/);
});
test('Rome composition uses a high atlas view and keeps bridge approaches below monument entrances',async()=>{
 const f=await fixture('rome.js');try{assert.ok(f.world.rendering.camera[1]/f.world.rendering.camera[2]>1.3,'high portrait atlas camera');f.content.updateMatrixWorld(true);for(const bridge of f.parts.bridges){const box=new f.T.Box3().setFromObject(bridge);assert.ok(box.max.y<1.2,'low stone bridges');}assert.ok(f.content.getObjectsByProperty('name','rome-landmark-label').length>=7,'reference-style landmark captions');}finally{await f.close();}
});
test('completed Rome first shader compile honors its paused scene time',async()=>{const f=await fixture('rome.js');try{f.world.tick({t:68,parts:f.parts,W:f.W});const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_begin>'};f.parts.water.onBeforeCompile(shader);assert.equal(shader.uniforms.singaporeTime.value,68/84*120);}finally{await f.close();}});
test('Rome roof ridges are actual reusable geometry rather than flat untextured roofs',async()=>{const f=await fixture('rome-timelapse.js');try{assert.ok(f.parts.source.getObjectsByProperty('name','rome-roof-tiles').length>70);assert.ok(f.parts.construction.batches.length<450);}finally{await f.close();}});
test('Rome reframes rotated atlas bounds at 100% zoom without cancelling intentional pan',async()=>{
 const f=await fixture('rome.js');try{assert.equal(typeof f.framingProjection,'function');assert.equal(f.world.rendering.orbitFit,true);const {T,world}=f,bounds=new T.Box3(new T.Vector3(...world.bounds[0]),new T.Vector3(...world.bounds[1])),base=new T.OrthographicCamera(-12,12,9,-9,.1,100);base.position.set(...world.rendering.camera);base.lookAt(0,0,0);base.updateMatrixWorld();const q=base.quaternion.clone(),pos=base.position.clone(),pivot=f.resolveViewPivot(world,bounds,base);
 for(const aspect of [351/387,736/1308,1160/660])for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const pitch of [-.25,0,.4]){const yq=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),right=new T.Vector3(1,0,0).applyQuaternion(q).applyQuaternion(yq),r=new T.Quaternion().setFromAxisAngle(right,pitch).multiply(yq);base.quaternion.copy(r).multiply(q);base.position.copy(pos).sub(pivot).applyQuaternion(r).add(pivot);base.updateMatrixWorld();Object.assign(base,f.framingProjection(world,bounds,base,aspect));base.updateProjectionMatrix();for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new T.Vector3(x,y,z).project(base);assert.ok(Math.abs(p.x)<=1.001&&Math.abs(p.y)<=1.001,`rotated bound clips ${aspect} ${yaw} ${pitch}`);}
 const before=f.framingProjection(world,bounds,base,aspect),offset=new T.Vector3(1.2,-.5,0).applyQuaternion(base.quaternion);base.position.add(offset);base.updateMatrixWorld();const after=f.framingProjection(world,bounds,base,aspect,{panX:1.2,panY:-.5});for(const key of ['left','right','top','bottom'])assert.ok(Math.abs(after[key]-before[key])<1e-8,'pan is not silently recentered');}
 }finally{await f.close();}
});
test('Rome boats turn continuously at each direction change and the 84-second loop seam',async()=>{const f=await fixture('rome.js');try{const pose=t=>{f.world.tick({t,parts:f.parts,W:f.W});return f.parts.boats.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));};for(const t of [0,14,28,42,56,70,84]){const a=pose(t-.001),b=pose(t+.001);for(let i=0;i<3;i++){assert.ok(a[i].q.angleTo(b[i].q)<.02,'boat heading does not jump');assert.ok(a[i].p.distanceTo(b[i].p)<.01,'boat position does not jump');}}}finally{await f.close();}});
test('Rome opposing boats retain distinct river lanes instead of crossing through each other',async()=>{const f=await fixture('rome.js');try{for(let t=0;t<84;t+=.1){f.world.tick({t,parts:f.parts,W:f.W});for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(f.parts.boats[i].position.distanceTo(f.parts.boats[j].position)>.23,`boats overlap at ${t}`);}}finally{await f.close();}});
test('completed Rome has only selectable moments inside its 84-second loop',async()=>{const f=await fixture('rome.js');try{assert.ok(f.world.moments?.length>=3);assert.ok(f.world.moments.every(p=>p.time>=0&&p.time<84));assert.match(readFileSync(resolve(root,'src/worlds.js'),'utf8'),/moments:rome\.moments/);}finally{await f.close();}});
test('Rome masonry uses locally generated owned surface grain instead of featureless color only',async()=>{const f=await fixture();try{const materials=f.parts.construction.batches.map(b=>b.inst.material);assert.ok(materials.filter(m=>m.bumpMap).length>=12);const texture=materials.find(m=>m.bumpMap)?.bumpMap;assert.equal(texture?.image?.width,128);}finally{await f.close();}});
test('Rome surrounds monuments with dense small-scale neighborhoods and detailed basilica facades',async()=>{const f=await fixture();try{assert.ok(f.parts.original.houses>=170,`neighborhoods have ${f.parts.original.houses} houses`);assert.ok(f.parts.source.getObjectByName('basilica-facade-relief'));}finally{await f.close();}});
test('Colosseum includes its open hypogeum and varied light levels rather than a flat glowing arena',async()=>{const f=await fixture();try{assert.ok(f.parts.source.getObjectByName('colosseum-hypogeum'));const levels=new Set(f.parts.construction.batches.map(b=>b.inst.material.userData?.romeLight).filter(Boolean));assert.ok(levels.has(.38));}finally{await f.close();}});
test('foreground bridge remains above the printed Rome title panel',async()=>{const f=await fixture('rome.js');try{f.content.updateMatrixWorld(true);const box=new f.T.Box3().setFromObject(f.parts.bridges.at(-1));assert.ok(box.max.z<8.8,`bridge reaches the atlas title at z=${box.max.z}`);}finally{await f.close();}});
