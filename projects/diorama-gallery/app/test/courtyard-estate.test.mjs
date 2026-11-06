import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
async function fixture(){
 assert.ok(existsSync(resolve(root,'src/courtyard-estate.js')),'courtyard world definition exists');
 const {build}=await import('../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js');
 const dir=await mkdtemp(join(tmpdir(),'estate-test-')),kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
 await build({stdin:{contents:`export {default as world} from ${JSON.stringify(resolve(root,'src/courtyard-estate.js'))};export * from ${JSON.stringify(kit)};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
 const {world,toolkit}=await import(join(dir,'world.mjs')),T=toolkit({}).THREE,content=new T.Group(),W=toolkit(content),parts=world.build(W);
 return {world,T,W,content,parts,async close(){W.dispose();await rm(dir,{recursive:true,force:true});}};
}
test('courtyard estate adds one real world and standalone without replacing existing cities',()=>{
 const registry=readFileSync(resolve(root,'src/worlds.js'),'utf8');
 assert.match(registry,/id:'courtyard-estate'/);
 assert.match(registry,/file:'courtyard-estate.html'/);
 assert.match(registry,/number:'11'/);
 assert.match(readFileSync(resolve(root,'build.mjs'),'utf8'),/dist\/courtyard-estate.html/);
});
test('courtyard world contains actual reference architecture, pond, bridge and planting',async()=>{
 const f=await fixture();try{
 for(const name of ['estate-main-hall','estate-gate','estate-dining-hall','estate-storehouse','estate-kitchen','estate-stable','estate-residence','estate-corridor','estate-perimeter-wall','estate-roof','estate-koi-pond','estate-arched-bridge','estate-willow','estate-blossom','estate-pine','estate-paving','estate-visitors'])assert.ok(f.content.getObjectByName(name),name);
 assert.equal(f.world.duration,48);assert.equal(f.world.rendering.zoom,true);assert.equal(f.world.rendering.orbitFit,true);
 assert.ok(f.world.moments.every(m=>m.time>=0&&m.time<f.world.duration));
 const box=new f.T.Box3().setFromObject(f.content);
 for(const [i,k] of ['x','y','z'].entries()){assert.ok(box.min[k]>=f.world.bounds[0][i]-.02,`min ${k}: ${box.min[k]}`);assert.ok(box.max[k]<=f.world.bounds[1][i]+.02,`max ${k}: ${box.max[k]}`);}
 }finally{await f.close();}
});
test('courtyard loop and reverse seeks reproduce fish and willow poses without allocating scene objects',async()=>{
 const f=await fixture();try{
 const snapshot=t=>{f.world.tick({t,parts:f.parts,W:f.W});f.content.updateMatrixWorld(true);return f.parts.dynamicRoots.flatMap(o=>o.matrixWorld.toArray());};
 const before=f.content.children.length;const start=snapshot(0);snapshot(23.9);assert.deepEqual(snapshot(0),start);assert.deepEqual(snapshot(48),start);const middle=snapshot(13);snapshot(2);assert.deepEqual(snapshot(13),middle);assert.notDeepEqual(middle,start);
 assert.ok(middle.every(Number.isFinite));assert.equal(f.content.children.length,before);
 const a=snapshot(47.999),b=snapshot(.001);assert.ok(a.every((x,i)=>Math.abs(x-b[i])<.01),'loop is continuous');
 f.W.batch({staticScene:true,dynamicRoots:f.parts.dynamicRoots});f.W.updateBatches();let batches=0;f.content.traverse(o=>{if(o.isInstancedMesh)batches++;});assert.ok(batches<350,`bounded batching: ${batches}`);
 }finally{await f.close();}
});
test('courtyard path intersections have one nonoverlapping paving layer',async()=>{
 const f=await fixture();try{
 f.content.updateMatrixWorld(true);const tiles=f.parts.ground.children.filter(o=>Math.abs(o.position.y-.017)<1e-9);assert.ok(tiles.length>250,'individual stone pavers');
 const boxes=tiles.map(o=>new f.T.Box3().setFromObject(o));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!boxes[i].intersectsBox(boxes[j]),`paving tiles ${i}/${j} are not coplanar overlaps`);
 }finally{await f.close();}
});
