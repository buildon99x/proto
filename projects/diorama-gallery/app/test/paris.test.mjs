import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
const app=resolve(import.meta.dirname,'..');
async function fixture(){
 const file=resolve(app,'src/paris-timelapse.js');assert.ok(existsSync(file),'Paris formation world exists');
 const dir=await mkdtemp(join(tmpdir(),'paris-')),kit=resolve(app,'../.agents/skills/diorama-worlds/kit/world.js');
 await build({stdin:{contents:`export {default as world} from ${JSON.stringify(file)};export * from ${JSON.stringify(kit)};`,resolveDir:app},bundle:true,format:'esm',platform:'node',outfile:join(dir,'world.mjs'),alias:{'@diorama/worlds':kit}});
 const mod=await import(pathToFileURL(join(dir,'world.mjs'))),T=mod.toolkit({}).THREE,scene=new T.Scene(),content=new T.Group();scene.add(content);const W=mod.toolkit(content),parts=mod.world.build(W);
 return{...mod,T,scene,content,W,parts,dispose:async()=>{W.dispose();await rm(dir,{recursive:true,force:true});}};
}
test('Paris forms all landmarks and resets deterministic construction without allocating geometry',async()=>{
 const f=await fixture();try{const {world,W,parts,content,T}=f;assert.equal(world.timeline,true);assert.equal(world.still,0);assert.equal(world.reducedStill,60);
 for(const name of ['eiffel-tower','notre-dame','louvre','arc-de-triomphe','sacre-coeur','seine-river','haussmann-district'])assert.ok(content.getObjectByName(name),name);
 const snap=t=>{world.tick({t,parts,W});content.updateMatrixWorld(true);const out=[];content.traverse(o=>{out.push(...o.matrix.elements);if(o.isInstancedMesh)out.push(...o.instanceMatrix.array);});return out;};
 const first=snap(0),done=snap(60);assert.notDeepEqual(first,done);snap(35);assert.deepEqual(snap(60),done);assert.deepEqual(snap(72),first);const n=done.length;for(const t of [1,12,24,40,50,68,-20,143])assert.equal(snap(t).length,n);
 snap(60);const bounds=new T.Box3(new T.Vector3(...world.bounds[0]),new T.Vector3(...world.bounds[1]));const b=new T.Box3().setFromObject(content,true);for(const k of ['x','y','z']){assert.ok(b.min[k]>=bounds.min[k]-.01,`min ${k} ${b.min[k]}`);assert.ok(b.max[k]<=bounds.max[k]+.01,`max ${k} ${b.max[k]}`);}
 assert.ok(parts.construction.count>3000,'dense procedural city, not a few primitive landmarks');
 const before=parts.boats[0].position.clone();snap(61);assert.ok(before.distanceTo(parts.boats[0].position)>.02);snap(60);assert.deepEqual(snap(60),done);
 }finally{await f.dispose();}
});
test('Paris defaults to warm illuminated night and supports deterministic snow plus independent day',async()=>{
 const f=await fixture();try{const {T,scene,W,world,parts}=f;scene.background=new T.Color('#bfd4e7');const sky=new T.HemisphereLight('#ffffff','#839bad',1.5),sun=new T.DirectionalLight('#fff1d7',3);scene.add(sky,sun);
 world.tick({t:60,parts,W});const e=world.environment({W,scene,lights:{sky,sun},profile:world.rendering});assert.deepEqual(e.getState(),{weather:'clear',timeOfDay:'night'});
 const lamps=[];scene.traverse(o=>{if(o.isMesh&&o.material.userData.nightIntensity)lamps.push(o.material);});assert.ok(lamps.length>0);assert.ok(lamps.every(m=>m.emissiveIntensity>0));
 for(const weather of ['clear','cloudy','rain','snow'])for(const timeOfDay of ['day','night']){e.setState({weather,timeOfDay});assert.deepEqual(e.getState(),{weather,timeOfDay});assert.ok(lamps.every(m=>timeOfDay==='night'?m.emissiveIntensity>0:m.emissiveIntensity===0));e.tick(12);assert.equal(scene.getObjectByName('paris-snowfall').visible,weather==='snow');}
 e.setState({weather:'snow',timeOfDay:'night'});const snow=scene.getObjectByName('paris-snowfall'),a=()=>Array.from(snow.geometry.attributes.position.array);e.tick(12);const start=a();e.tick(13);assert.notDeepEqual(a(),start);e.tick(12);assert.deepEqual(a(),start);const uuid=snow.geometry.uuid;e.tick(50);assert.equal(snow.geometry.uuid,uuid);
 for(const invalid of [{weather:'sandstorm'},{weather:'rain',timeOfDay:'dawn'},{unknown:true},null]){assert.throws(()=>e.setState(invalid));assert.deepEqual(e.getState(),{weather:'snow',timeOfDay:'night'});}
 e.setState({weather:'clear',timeOfDay:'day'});assert.equal(snow.visible,false);assert.ok(lamps.every(m=>m.emissiveIntensity===0));
 }finally{await f.dispose();}
});

test('Paris is discoverable alongside unchanged legacy worlds with a standalone and matching controls',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'paris-registry-')),kit=resolve(app,'../.agents/skills/diorama-worlds/kit/world.js');try{
 await build({entryPoints:[resolve(app,'src/worlds.js')],bundle:true,platform:'node',format:'esm',outfile:join(dir,'registry.mjs'),alias:{'@diorama/worlds':kit}});const {worlds}=await import(pathToFileURL(join(dir,'registry.mjs'))),p=worlds.find(w=>w.id==='paris-timelapse');assert.ok(p,'Paris gallery entry exists');assert.equal(p.file,'paris-timelapse.html');assert.equal(p.thumbnailTime,60);assert.deepEqual(p.definition.weatherOptions.map(([k])=>k),['clear','cloudy','rain','snow']);assert.ok(worlds.find(w=>w.id==='harbor'));assert.ok(worlds.find(w=>w.id==='singapore'));assert.equal(worlds.find(w=>w.id==='dubai').definition.environment,undefined);assert.equal(worlds.find(w=>w.id==='dubai-timelapse').definition.weatherOptions,undefined);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('river craft roofs pass below the actual masonry bridge decks',async()=>{
 const f=await fixture();try{const {world,W,parts,T}=f;world.tick({t:60,parts,W});parts.source.updateMatrixWorld(true);
 const decks=parts.construction.batches.flatMap(b=>b.entries).filter(e=>e.window[2]==='road'&&Math.abs(e.matrix.elements[5]-.16)<1e-5&&e.matrix.elements[13]===.45);
 // The authored bridges have one broad masonry deck each. Test real transformed boat bounds against their underside.
 assert.equal(decks.length,4);for(const boat of parts.boats){const top=new T.Box3().setFromObject(boat,true).max.y;for(const deck of decks){const bottom=deck.matrix.elements[13]-Math.abs(deck.matrix.elements[5])/2;assert.ok(top<bottom-.01,`craft roof ${top} must clear deck underside ${bottom}`);}}
 }finally{await f.dispose();}
});
