import test from 'node:test';import assert from 'node:assert/strict';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
import sailboat from '../src/desert-sailboat.js';import {boatPose,riverCenter,riverHalfWidth} from '../src/desert-motion.js';
const T=toolkit({}).THREE;
const vertices=root=>{const result=[];root.updateMatrixWorld(true);root.traverse(o=>{const p=o.geometry?.attributes.position;if(!p)return;for(let i=0;i<p.count;i++)result.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});return result;};
const triangles=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;};

test('authored sailboat retains the root/wake contract with a bounded 3D hull and rig',()=>{
 const scene=new T.Group(),W=toolkit(scene),boat=sailboat(W);assert.equal(boat.name,'river-sailboat');
 for(const name of ['felucca-hull','felucca-sail','felucca-mast','felucca-yard','felucca-rigging','felucca-rudder','boat-wake'])assert.ok(boat.getObjectByName(name),name);
 const box=new T.Box3().setFromPoints(vertices(boat));assert.ok(box.min.x>=-.165&&box.max.x<=.165&&box.min.z>=-.385&&box.max.z<=.365,'same small navigation envelope including existing wake');assert.ok(box.min.y>=.008&&box.max.y<=.705);
 const hull=boat.getObjectByName('felucca-hull'),sail=boat.getObjectByName('felucca-sail');assert.ok(hull.geometry.attributes.position.count>=30);const hp=hull.geometry.attributes.position;assert.ok(Math.max(...Array.from({length:hp.count},(_,i)=>hp.getZ(i)))>=.35,'pointed bow is +Z');
 const sp=sail.geometry.attributes.position;assert.ok(Math.max(...Array.from({length:sp.count},(_,i)=>sp.getX(i)))>.03,'sail has actual bounded cloth curvature');assert.equal(sail.material.side,T.DoubleSide);assert.equal(sail.material.transparent,false);
 const edges=new Map(),ids=hull.geometry.index;for(let i=0;i<ids.count;i+=3){const a=ids.getX(i),b=ids.getX(i+1),c=ids.getX(i+2),p0=new T.Vector3().fromBufferAttribute(hp,a),p1=new T.Vector3().fromBufferAttribute(hp,b),p2=new T.Vector3().fromBufferAttribute(hp,c);assert.ok(p1.sub(p0).cross(p2.sub(p0)).length()>1e-8,'hull has no collapsed triangles');for(const [a,b]of [[ids.getX(i),ids.getX(i+1)],[ids.getX(i+1),ids.getX(i+2)],[ids.getX(i+2),ids.getX(i)]]){const key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)??0)+1);}}assert.ok([...edges.values()].every(n=>n===2),'hull is a closed two-manifold loft');
 assert.ok(triangles(boat)<=320,'entire model including wake stays under 320 triangles');assert.ok(boat.getObjectByName('felucca-rigging').isLineSegments,'fine lines use no triangles');
 W.dispose();
});

test('all four models share W-owned geometry/materials and dispose their unique resources',()=>{
 const scene=new T.Group(),W=toolkit(scene),boats=Array.from({length:4},()=>sailboat(W));const resources=root=>{const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);for(const mat of [o.material].flat())if(mat)m.add(mat);});return{g,m};};
 const first=resources(boats[0]);assert.ok(first.g.size>=4&&first.m.size>=4,'nonempty shared model resources');for(const boat of boats.slice(1)){const other=resources(boat);assert.deepEqual(other.g,first.g);assert.deepEqual(other.m,first.m);}
 let disposed=0;for(const r of [...first.g,...first.m])r.addEventListener('dispose',()=>disposed++);W.dispose();assert.equal(disposed,first.g.size+first.m.size);
});

test('unchanged four-boat route keeps complete model geometry inside water with separation and a 120s seam',()=>{
 const scene=new T.Group(),W=toolkit(scene),boats=Array.from({length:4},()=>{const b=sailboat(W);b.scale.setScalar(1.25);return b;});
 const snapshot=t=>{for(let i=0;i<4;i++){const q=boatPose(t,i);boats[i].position.set(q.x,-.015,q.z);boats[i].rotation.y=q.yaw;}scene.updateMatrixWorld(true);return boats.flatMap(b=>b.matrixWorld.toArray());};
 const start=snapshot(0);assert.deepEqual(snapshot(0),start);assert.ok(snapshot(120).every((v,i)=>Math.abs(v-start[i])<1e-8));
 let minimumBank=Infinity,minimumPair=Infinity;
 for(let t=0;t<120;t+=.1){snapshot(t);for(let i=0;i<4;i++){
  const points=vertices(boats[i]);boats[i].traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,ids=o.geometry.index,n=ids?.count??p.count;for(let j=0;j<n;j+=3){const v=new T.Vector3();for(let k=0;k<3;k++)v.add(new T.Vector3().fromBufferAttribute(p,ids?ids.getX(j+k):j+k));points.push(v.multiplyScalar(1/3).applyMatrix4(o.matrixWorld));}});for(const p of points){const clearance=riverHalfWidth(p.z)-Math.abs(p.x-riverCenter(p.z));minimumBank=Math.min(minimumBank,clearance);assert.ok(clearance>=.04,`complete model leaves water at ${t}: ${p.toArray()}`);}
  for(let j=0;j<i;j++){const a=new T.Box3().setFromPoints(points),b=new T.Box3().setFromPoints(vertices(boats[j])),gap=Math.max(a.min.z-b.max.z,b.min.z-a.max.z);minimumPair=Math.min(minimumPair,gap);assert.ok(gap>=1,'boats retain more than one scene unit of longitudinal clearance');}
 }}
 const hull=boats[0].getObjectByName('felucca-hull');assert.ok(hull);const box=new T.Box3().setFromObject(hull,true);assert.ok(box.min.y<.002&&box.max.y>.002,'hull crosses the nominal water surface');
 console.log(`sailboat budget: ${triangles(boats[0])} triangles; min sampled bank clearance ${minimumBank.toFixed(4)}; min boat gap ${minimumPair.toFixed(4)}`);W.dispose();
});
