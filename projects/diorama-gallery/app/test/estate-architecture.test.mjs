import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';


test('estate architecture has connected courts, an open gate and tiered tiled roofs inside its footprint',async()=>{
 const file=new URL('../src/estate-architecture.js',import.meta.url);
 assert.ok(existsSync(file),'estate architecture module exists');
 const {toolkit}=await import('../../.agents/skills/diorama-worlds/kit/world.js');const {buildEstateArchitecture}=await import(file);const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene);
 try {
 const {root,buildings,corridors}=buildEstateArchitecture(W);
 assert.equal(root.name,'estate-architecture');assert.ok(buildings.length>=10);assert.ok(corridors.length>=6);
 const hall=root.getObjectByName('estate-main-hall');assert.ok(hall);assert.ok(hall.children.filter(o=>o.name==='estate-roof').length>=2);
 for(const name of ['estate-gate','estate-dining-hall','estate-storehouse','estate-kitchen','estate-stable','estate-residence','estate-perimeter-wall'])assert.ok(root.getObjectByName(name),name);
 scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);assert.ok(bounds.min.x>=-8.5&&bounds.max.x<=8.5);assert.ok(bounds.min.z>=-12.6&&bounds.max.z<=13.1);assert.ok(bounds.max.y>3.8&&bounds.max.y<5.5);
 const gate=root.getObjectByName('estate-gate');const ray=new T.Raycaster(new T.Vector3(0,.85,13),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(gate,true).length,0,'gate center is a real opening');
 const geos=new Set(),mats=new Set();let count=0;root.traverse(o=>{if(o.isMesh){count++;geos.add(o.geometry);mats.add(o.material);}});assert.ok(count>700);assert.ok(geos.size<90);assert.ok(mats.size<=10);
 }finally{W.dispose();}
});

test('both courtyard walk and roof graphs connect the rear crosswalk to the front crosswalk',async()=>{
 const {toolkit}=await import('../../.agents/skills/diorama-worlds/kit/world.js');
 const {buildEstateArchitecture}=await import('../src/estate-architecture.js');
 const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene);
 try {
  const {corridors}=buildEstateArchitecture(W);scene.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const chain=corridors.filter(c=>Math.sign(c.position.x)===side&&c.position.z<=2);
   const rear=chain.find(c=>c.position.z===-7),front=chain.find(c=>c.position.z===2);
   assert.ok(rear&&front,'named courtyard endpoints exist');
   for(const surface of ['walk','roof']){
    const bounds=new Map(chain.map(c=>{
     const part=surface==='roof'?c.getObjectByName('estate-roof'):c.children.find(o=>o.isMesh&&Math.abs(o.scale.y-.12)<1e-6);
     assert.ok(part,`${surface} surface exists`);
     return [c,new T.Box3().setFromObject(part)];
    }));
    const visited=new Set([rear]),queue=[rear];
    while(queue.length){const current=queue.shift();for(const next of chain){if(!visited.has(next)&&bounds.get(current).intersectsBox(bounds.get(next))){visited.add(next);queue.push(next);}}}
    assert.ok(visited.has(front),`${side<0?'west':'east'} ${surface} graph has no rear-to-front gap`);
   }
  }
 }finally{W.dispose();}
});
