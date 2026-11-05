import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';

async function inspectDistrict(inspect){
 const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'paris-facades-'));
 try{
  await build({stdin:{contents:`export {buildParisDistrict} from ${JSON.stringify(resolve(root,'src/paris-city.js'))}; export {toolkit} from ${JSON.stringify(resolve(root,'../.agents/skills/diorama-worlds/kit/world.js'))};`,resolveDir:root},bundle:true,platform:'node',format:'esm',outfile:join(dir,'scene.mjs')});
  const {buildParisDistrict,toolkit}=await import(pathToFileURL(join(dir,'scene.mjs'))),T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene),district=buildParisDistrict(W);
  scene.updateMatrixWorld(true);
  try{await inspect({...district,T});}finally{W.dispose();}
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('Paris facades have raised corner masonry, fine stone courses and separated cornice dentils',()=>inspectDistrict(({root,T})=>{
 for(const block of root.children){
  const details=[];block.traverse(o=>{if(o.isMesh)details.push(o);});
  const quoins=details.filter(o=>o.name==='facade-quoin'),courses=details.filter(o=>o.name==='facade-stone-course'),dentils=details.filter(o=>o.name==='facade-cornice-dentil');
  assert.ok(quoins.length>=32,`${block.name} has individual corner stones rather than painted corners`);
  assert.ok(new Set(quoins.map(o=>o.position.y.toFixed(3))).size>=6,'corner stones articulate the full wall height');
  assert.ok(courses.length>=20,'fine masonry courses appear on every elevation');
  assert.ok(dentils.length>=24,'cornice is a row of discrete projecting teeth');
  for(const part of [...quoins,...courses,...dentils]){const size=new T.Box3().setFromObject(part).getSize(new T.Vector3());assert.ok(Math.min(...size.toArray())>.002,'facade detail is solid relief geometry');}
  const stoneWidths=new Set(quoins.map(o=>Math.max(o.scale.x,o.scale.z).toFixed(3)));assert.ok(stoneWidths.size>=2,'alternating long and short quoin blocks break the repeated edge');
 }
}));

test('Paris windows vary their pediments and glazed storefronts retain warm night emission without orange daylight panes',()=>inspectDistrict(({root,windowMaterial})=>{
 const details=[];root.traverse(o=>{if(o.isMesh)details.push(o);});
 for(const kind of ['triangle','segmental']){
  const crowns=details.filter(o=>o.name===`window-pediment-${kind}`);assert.ok(crowns.length>=24,`${kind} window crowns are actual district meshes`);
  for(const crown of crowns){assert.ok(crown.geometry.attributes.position.count>=6);assert.ok(crown.scale.y>0);}
 }
 for(const name of ['storefront-mullion','storefront-sign','storefront-canopy'])assert.ok(details.filter(o=>o.name===name).length>=14,`${name} is present across the street frontages`);
 const hsl=windowMaterial.color.getHSL({});assert.ok(hsl.l<.5,'daylight windows read as dark recessed glass');
 assert.ok(windowMaterial.emissive.r>windowMaterial.emissive.b*2,'night windows keep warm illumination');
 const keys=new Set(details.map(o=>o.geometry.uuid+'/'+o.material.uuid));assert.ok(keys.size<80,'facade ornament shares resources instead of adding a draw batch per feature');
 const ornament=details.filter(o=>/^(facade-|window-pediment-|storefront-)/.test(o.name));assert.ok(new Set(ornament.map(o=>o.geometry.uuid)).size<=5,'facade details share box, curved glazing and two crown geometries');
}));

test('Paris window crowns do not cover the glazing of the floor above',()=>inspectDistrict(({root,windowMaterial,T})=>{
 for(const block of root.children){const glass=[],crowns=[];block.traverse(o=>{if(!o.isMesh)return;if(o.material===windowMaterial)glass.push(new T.Box3().setFromObject(o));if(o.name.startsWith('window-pediment-'))crowns.push(new T.Box3().setFromObject(o));});
  for(const crown of crowns)for(const pane of glass)assert.ok(!crown.clone().expandByScalar(-.001).intersectsBox(pane),`${block.name} stone window crown leaves glazing clear`);
 }
}));

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

test('Paris building families vary real window proportions, arches and balcony rhythms',()=>inspectDistrict(({root,T})=>{
 const panes=[],balconies=[];root.traverse(o=>{if(o.name.startsWith('facade-window-pane-'))panes.push(o);if(o.name==='facade-balcony-rail')balconies.push(o);});
 assert.ok(panes.length>300,'the street elevations expose their actual glazed window geometry');
 const proportions=new Set(panes.map(o=>{const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3());return `${Math.max(s.x,s.z).toFixed(2)}/${s.y.toFixed(2)}`;}));
 assert.ok(proportions.size>=5,'at least five visibly different window proportions replace uniform small squares');
 const arches=panes.filter(o=>o.name==='facade-window-pane-arched');assert.ok(arches.length>30,'several buildings use genuinely arched window openings');
 for(const arch of arches)assert.ok(arch.geometry.attributes.position.count>12,'arched glazing has a curved mesh silhouette');
 const railWidths=new Set(balconies.map(o=>{const s=new T.Box3().setFromObject(o).getSize(new T.Vector3());return Math.max(s.x,s.z).toFixed(2);}));
 assert.ok([...railWidths].some(w=>Number(w)>.8),'selected facades have continuous floor balconies');
 assert.ok([...railWidths].some(w=>Number(w)<.4),'other facades use individual French balconies');
}));

test('Paris townhouse rows and courtyard wings have separate stepped wall and roof volumes',()=>inspectDistrict(({root,T})=>{
 for(const index of [2,4,13]){const block=root.getObjectByName(`haussmann-block-${index}`),masses=[];block.traverse(o=>{if(o.name==='building-mass')masses.push(o);});assert.ok(masses.length>=3,`${block.name} has individual townhouses rather than one slab`);const heights=masses.map(o=>new T.Box3().setFromObject(o).getSize(new T.Vector3()).y);assert.ok(Math.max(...heights)-Math.min(...heights)>.2,'adjacent townhouses visibly step in height');}
 for(const index of [0,6,7]){const block=root.getObjectByName(`haussmann-block-${index}`),roofLevels=[];block.traverse(o=>{if(o.isMesh&&o.material.userData.snowSurface)roofLevels.push(new T.Box3().setFromObject(o).max.y.toFixed(2));});assert.ok(new Set(roofLevels).size>=3,'courtyard street wings and pavilions have articulated roof heights');}
 const dormers=[];root.traverse(o=>{if(o.name.startsWith('dormer-glass-'))dormers.push(o);});assert.ok(new Set(dormers.map(o=>o.name)).size>=3,'gable, round and shed dormers vary the roof rhythm');
}));

test('Paris building details remain within collision-free block footprints and preserve each planned position',()=>inspectDistrict(({root,T})=>{
 const footprints=[[-5.35,5.5,2.35,1.5],[-5.25,3.55,2.5,1.55],[-5.4,7.0,2.2,.75],[-3.7,7.2,1.1,1.35],[-1.1,7.3,2.5,1.2],[7.15,7.1,1.25,1.45],[-5.8,-5.2,2.1,1.8],[-3.4,-5.2,2.1,1.8],[-1.0,-5.5,1.9,1.6],[6.9,-5.5,1.2,2.4],[6.1,-2.1,1.45,2.5],[6.2,.8,1.5,2.4],[6.9,4.8,1.3,2.6],[-7.65,3.8,.6,3.2]];
 for(const[index,[x,z,w,d]]of footprints.entries()){const block=root.getObjectByName(`haussmann-block-${index}`),b=new T.Box3().setFromObject(block);assert.equal(block.position.x,x);assert.equal(block.position.z,z);assert.ok(b.min.x>=x-w/2-.001&&b.max.x<=x+w/2+.001&&b.min.z>=z-d/2-.001&&b.max.z<=z+d/2+.001,`${block.name}: balconies, eaves and canopies must stay off adjacent roads`);}
}));
