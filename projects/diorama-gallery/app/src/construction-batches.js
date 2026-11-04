import {pieceProgress} from './dubai-timeline.js';
// Bake source transforms once; only upload matrices while the corresponding
// construction pieces change. No geometry or typed arrays are allocated in tick.
export function compileConstruction(W,source,excluded,timing){
 const T=W.THREE,pools=new Map(),excludedSet=new Set();for(const root of excluded)root.traverse(o=>excludedSet.add(o));source.updateMatrixWorld(true);
 const originals=[];source.traverse(o=>{if(!o.isMesh||excludedSet.has(o))return;const names=[];for(let p=o;p&&p!==source;p=p.parent)if(p.name)names.push(p.name);o.geometry.computeBoundingBox();const box=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),window=timing(names,box),key=`${o.geometry.uuid}:${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;if(!pools.has(key))pools.set(key,[]);pools.get(key).push({matrix:o.matrixWorld.clone(),anchor:window[2]==='plant'?(names.includes('palm-jumeirah')?.135:.1):box.min.y,center:box.getCenter(new T.Vector3()),window,previous:NaN});originals.push(o);});
 const batches=[],matrix=new T.Matrix4(),transform=new T.Matrix4(),zero=new T.Matrix4().makeScale(0,0,0),root=W.group();root.name='construction-batches';
 // Keep source metadata alongside pool entries without retaining a second scene.
 const byKey=new Map();for(const o of originals)byKey.set(`${o.geometry.uuid}:${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`,o);
 for(const [key,entries] of pools){const original=byKey.get(key),inst=new T.InstancedMesh(original.geometry,original.material,entries.length);inst.castShadow=original.castShadow;inst.receiveShadow=original.receiveShadow;inst.frustumCulled=false;inst.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(inst);batches.push({inst,entries});}
 for(const o of originals)o.removeFromParent();
 let writes=0;
 function update(t){let changed=0;for(const batch of batches){let dirty=false;for(let i=0;i<batch.entries.length;i++){const e=batch.entries[i],p=pieceProgress(t,e.window);if(p===e.previous)continue;e.previous=p;dirty=true;changed++;if(p===0)matrix.copy(zero);else if(p===1)matrix.copy(e.matrix);else if(e.window[2]==='land'||e.window[2]==='road'){const q=.04+.96*p;transform.makeScale(q,Math.max(.02,p),q);transform.setPosition(e.center.x*(1-q),e.anchor*(1-Math.max(.02,p)),e.center.z*(1-q));matrix.multiplyMatrices(transform,e.matrix);}else{transform.makeScale(1,Math.max(.001,p),1);transform.setPosition(0,e.anchor*(1-Math.max(.001,p)),0);matrix.multiplyMatrices(transform,e.matrix);}batch.inst.setMatrixAt(i,matrix);}if(dirty){batch.inst.instanceMatrix.needsUpdate=true;writes++;}}return changed;}
 return{root,batches,update,get writes(){return writes;},count:originals.length};
}
