import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
test('Dubai construction timeline is deterministic, staged and seamless',async()=>{
 const file=resolve(root,'src/dubai-timeline.js');assert.ok(existsSync(file),'timeline exists');
 const {TIMELAPSE_DURATION,constructionTime,progressAt,PHASES,constructionWindow,pieceProgress}=await import(file);
 const tiny={min:{x:-4,y:.03,z:-7},max:{x:-3.8,y:.15,z:-6.8}};assert.equal(constructionWindow(['palm-jumeirah','island-crescent','timelapse-crescent-villa'],tiny)[2],'building');assert.equal(constructionWindow(['timelapse-pedestrian'],tiny)[2],'life');
 const core=constructionWindow(['burj-khalifa'],{min:{x:0,y:1,z:0},max:{x:.4,y:2,z:.4}}),ring=constructionWindow(['burj-khalifa'],{min:{x:0,y:1.8,z:0},max:{x:.4,y:1.82,z:.4}});assert.ok(core[1]-core[0]>(ring[1]-ring[0])*20,'building reveal duration follows actual piece height');
 assert.equal(pieceProgress(1,[0,4,'building']),.25,'building height front is linear so floors do not outrun support');
 assert.equal(TIMELAPSE_DURATION,72);assert.ok(PHASES.length>=6);
 assert.equal(constructionTime(0),0);assert.equal(constructionTime(72),0);assert.equal(constructionTime(40),40);
 for(const t of [-1,0,8,24,47,65,68,71.999]){assert.ok(Math.abs(constructionTime(t)-constructionTime(t+72))<1e-9);assert.ok(Number.isFinite(constructionTime(t)));}
 assert.equal(progressAt(5,8,14),0);assert.equal(progressAt(20,8,14),1);assert.ok(progressAt(11,8,14)>.4);
 assert.ok(constructionTime(71.999)<.001);
});
test('timelapse is a separate gallery entry with a completed thumbnail and opening phase',()=>{
 const registry=readFileSync(resolve(root,'src/worlds.js'),'utf8');assert.match(registry,/id:'dubai-timelapse'/);assert.match(registry,/thumbnailTime:60/);assert.match(registry,/id:'dubai'/);
 assert.match(readFileSync(resolve(root,'build.mjs'),'utf8'),/dist\/dubai-timelapse.html/);
});
test('construction batches support real scene seek, cache stable phases and preserve transit positions',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{pathToFileURL}=await import('node:url');
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');
 const dir=await mkdtemp(join(tmpdir(),'dubai-timelapse-')),old=globalThis.document;
 const ctx=new Proxy({measureText:t=>({width:t.length*8}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src/dubai-timelapse.js'))};export * from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
 const {world,toolkit,defineWorld}=await import(pathToFileURL(join(dir,'world.mjs'))),T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),parts=world.build(W);assert.equal(parts.source.getObjectsByProperty('name','timelapse-pedestrian').length,55);assert.equal(parts.source.getObjectsByProperty('name','timelapse-crescent-villa').length,51);assert.equal(parts.cranes?.length,3,'temporary cranes articulate the construction phase');assert.ok(scene.getObjectByName('origin-coast'),'original dry coast exists before reclamation');for(const reducedStill of [-1,72,NaN])assert.throws(()=>defineWorld({...world,reducedStill}),/Reduced still/);assert.equal(world.reducedStill,60);assert.equal(world.still,0);assert.equal(world.duration,72);assert.ok(parts.construction.count>5000);assert.ok(parts.construction.batches.length<400,'bounded instanced render groups');W.batch({staticScene:false});
 const snapshot=t=>{world.tick({t,parts,W});W.updateBatches();return parts.construction.batches.flatMap(b=>Array.from(b.inst.instanceMatrix.array));};
 assert.ok(parts.construction.batches.flatMap(b=>b.entries).filter(e=>e.window[2]==='plant').every(e=>e.anchor<=.15),'vegetation grows from ground, not floating leaf-local anchors');
 const start=snapshot(0);snapshot(35);assert.deepEqual(snapshot(0),start);assert.deepEqual(snapshot(72),start);
 snapshot(60);for(const material of [parts.original.sea,parts.original.lake]){const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <normal_fragment_begin>'};material.onBeforeCompile(shader);assert.equal(shader.uniforms.singaporeTime.value,100,'first shader compilation uses current paused pose');}
 const final=snapshot(60),writes=parts.construction.writes;snapshot(61);assert.equal(parts.construction.writes,writes,'completed construction does not re-upload matrices');assert.ok(final.every(Number.isFinite));assert.ok(final.some((v,i)=>v!==start[i]));
 for(const batch of parts.construction.batches){const actual=new T.Matrix4();for(let i=0;i<batch.entries.length;i++){batch.inst.getMatrixAt(i,actual);assert.ok(actual.elements.every((v,j)=>Math.abs(v-batch.entries[i].matrix.elements[j])<1e-5),'completed instance restores exact source transform');}}
 for(const t of [0,18,35,60,69]){snapshot(t);for(const batch of parts.construction.batches){batch.inst.geometry.computeBoundingBox();const m=new T.Matrix4();for(let i=0;i<batch.entries.length;i++){batch.inst.getMatrixAt(i,m);const b=batch.inst.geometry.boundingBox.clone().applyMatrix4(m);for(const [axis,k] of ['x','y','z'].entries()){assert.ok(b.min[k]>=world.bounds[0][axis]-.06&&b.max[k]<=world.bounds[1][axis]+.06,'construction remains inside world bounds');}}}}
 const middle=snapshot(35);snapshot(12);assert.deepEqual(snapshot(35),middle,'backward/forward seeking deterministic');
 snapshot(35);for(const crane of parts.cranes)assert.ok(Math.abs(crane.cable.position.y+.375*crane.cable.scale.y+.045)<1e-9,'hoist cable stays attached to jib');
 snapshot(52);assert.equal(parts.original.train.scale.x,1,'appearing train stays on track rather than scaling world positions');
 for(const t of [0,12,23,35,49,60,68,71.99]){snapshot(t);assert.ok(parts.construction.batches.every(b=>Array.from(b.inst.instanceMatrix.array).every(Number.isFinite)));}
 const {OBB}=await import(pathToFileURL(resolve(root,'../.agents/skills/diorama-worlds/node_modules/three/examples/jsm/math/OBB.js')));const buildings=[];for(const batch of parts.construction.batches)for(const [index,e] of batch.entries.entries())if(e.window[2]==='building'){const local=batch.inst.geometry.boundingBox;buildings.push({box:local.clone().applyMatrix4(e.matrix),local,inst:batch.inst,index,entry:e});}for(let t=24;t<52;t+=.25){snapshot(t);scene.updateMatrixWorld(true);for(const crane of parts.cranes)if(crane.root.scale.x>.01)crane.root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);for(const b of buildings)if(b.entry.previous>0&&box.intersectsBox(b.box)){const current=new T.Matrix4();b.inst.getMatrixAt(b.index,current);assert.equal(new OBB().fromBox3(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).intersectsOBB(new OBB().fromBox3(b.local).applyMatrix4(current)),false,`temporary crane ${crane.index} clears constructed buildings at ${t}, fixed ${b.box.min.toArray()} / ${b.box.max.toArray()}, crane ${box.min.toArray()} / ${box.max.toArray()}`);}});}

 W.dispose();
 }finally{globalThis.document=old;await rm(dir,{recursive:true,force:true});}
});

test('standalone offers phase selection and reduced-motion completed pose',()=>{const source=readFileSync(resolve(root,'../.agents/skills/diorama-worlds/scripts/build-world.mjs'),'utf8');assert.match(source,/definition.moments/);assert.match(source,/definition.reducedStill/);assert.match(source,/stageSelect.addEventListener/);});
