import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';

test('Istanbul has four detailed bounded landmarks and reusable luminous resources',async()=>{
 const file=new URL('../src/istanbul-landmarks.js',import.meta.url);
 assert.ok(existsSync(file),'Istanbul landmark implementation must exist');
 const {buildLandmarks}=await import(file);
 const T=toolkit({}).THREE, scene=new T.Group(),W=toolkit(scene),parts=buildLandmarks(W);
 assert.deepEqual(parts.roots.map(g=>g.name),['hagia-sophia','blue-mosque','galata-tower','palace-courtyard']);
 for(const root of parts.roots){assert.equal(root.parent,scene);assert.ok(root.userData.construction.start<root.userData.construction.end);}
 const named=[];scene.traverse(o=>{if(o.name)named.push(o.name);});
 assert.equal(named.filter(n=>n==='minaret').length,10);
 assert.ok(named.filter(n=>n==='ribbed-dome').length>=14);
 assert.ok(named.filter(n=>n==='arched-window').length>=100);
 assert.ok(scene.getObjectByName('galata-conical-roof'));
 assert.ok(scene.getObjectByName('palace-open-courtyard'));
 scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene,true);
 assert.ok(bounds.min.x>=-8 && bounds.max.x<=8,`x ${bounds.min.x} ${bounds.max.x}`);
 assert.ok(bounds.min.z>=-6.5 && bounds.max.z<=3.4,`z ${bounds.min.z} ${bounds.max.z}`);
 assert.ok(bounds.min.y>=.219 && bounds.max.y<=8,`y ${bounds.min.y} ${bounds.max.y}`);
 assert.ok(parts.luminousMaterials.length>=1 && parts.luminousMaterials.length<=4);
 for(const m of parts.luminousMaterials)assert.ok(m.emissiveIntensity>0);
 let count=0;scene.traverse(o=>{if(o.isMesh){count++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(count<4500,`bounded meshes ${count}`);
 W.dispose();
});
