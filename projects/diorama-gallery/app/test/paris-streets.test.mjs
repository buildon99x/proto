import test from 'node:test';import assert from 'node:assert/strict';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
import {existsSync} from 'node:fs';
import {buildParisScene} from '../src/paris-scene.js';
test('Paris streets contain grounded collision-free cars and readable pedestrian crossings',async()=>{
 assert.ok(existsSync(new URL('../src/paris-streets.js',import.meta.url)),'street-detail module exists');
 const T=toolkit({}).THREE,scene=new T.Group(),W=toolkit(scene);try{const {ground,district,landmarks,life,streets:detail}=buildParisScene(W);scene.updateMatrixWorld(true);const obstacles=[...district.root.children,...landmarks.roots,...life.root.children],fixtures=[...life.streetlamps.children,...life.people.children];scene.updateMatrixWorld(true);assert.ok(detail.cars.length>=8,'street scene contains at least eight small cars');assert.ok(detail.crossings.length>=3,'several complete pedestrian crossings are present');
 for(const car of detail.cars){const bounds=new T.Box3().setFromObject(car);for(const obstacle of[...obstacles,...fixtures])assert.equal(bounds.intersectsBox(new T.Box3().setFromObject(obstacle)),false,'cars clear architecture and planting');const wheels=[];car.traverse(o=>{if(o.name==='car-wheel')wheels.push(o);});assert.equal(wheels.length,4);for(const wheel of wheels){const p=wheel.getWorldPosition(new T.Vector3()),b=new T.Box3().setFromObject(wheel);assert.ok(Math.abs(b.min.y-ground.groundHeight(p.x,p.z))<.012,'all wheels meet actual road');}const waterRay=new T.Raycaster(new T.Vector3(car.position.x,5,car.position.z),new T.Vector3(0,-1,0));assert.equal(waterRay.intersectObjects(ground.river.children.filter(o=>o.material===ground.water),false).length,0,'cars are not in Seine water');}
 const keys=new Set();detail.root.traverse(o=>{if(o.isMesh)keys.add(o.geometry.uuid+'/'+o.material.uuid);});assert.ok(keys.size<25,'repeated street details are shared');
 }finally{W.dispose();}
});
