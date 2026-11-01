import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const triangles=g=>(g.index?.count??g.attributes.position?.count??0)/3;
const bytes=g=>Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(g.index?.array.byteLength??0);
function visible(mesh,root){for(let o=mesh;o;o=o.parent){if(!o.visible)return false;if(o===root)return true;}return false;}
function eligible(mesh,root){
 const g=mesh.geometry,m=mesh.material;
 return mesh.isMesh&&!mesh.isSkinnedMesh&&!mesh.isInstancedMesh&&!mesh.children.length&&visible(mesh,root)&&
  !Array.isArray(m)&&m&&!m.transparent&&m.opacity===1&&!m.isShaderMaterial&&!m.displacementMap&&
  m.onBeforeCompile===T.Material.prototype.onBeforeCompile&&!mesh.customDepthMaterial&&!mesh.customDistanceMaterial&&
  mesh.onBeforeRender===T.Object3D.prototype.onBeforeRender&&mesh.onAfterRender===T.Object3D.prototype.onAfterRender&&
  mesh.onBeforeShadow===T.Object3D.prototype.onBeforeShadow&&mesh.onAfterShadow===T.Object3D.prototype.onAfterShadow&&
  g?.isBufferGeometry&&g.attributes.position?.array instanceof Float32Array&&
  Object.keys(g.morphAttributes).length===0&&!Object.values(g.attributes).some(a=>a.isInterleavedBufferAttribute||a.isInstancedBufferAttribute)&&
  g.drawRange.start===0&&g.drawRange.count===Infinity&&mesh.matrixWorld.determinant()>0;
}
function signature(mesh,materialKey){const g=mesh.geometry;return JSON.stringify([materialKey,mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,mesh.renderOrder,mesh.frustumCulled,Boolean(g.index),Object.keys(g.attributes).sort().map(k=>{const a=g.attributes[k];return[k,a.itemSize,a.normalized,a.array.constructor.name,a.gpuType];})]);}
// Call once after immutable décor construction, before animated meshes exist.
// Larger batches reduce culling granularity. Counts below are scene-graph facts,
// not renderer.info draw calls, GPU allocation, frame time or FPS measurements.
export function batchStaticScene(root){
 root.updateWorldMatrix(true,true);
 const all=[];root.traverse(o=>{if(o.isMesh)all.push(o);});
 const sourceGeometries=new Set(all.map(o=>o.geometry));
 const report={beforeMeshes:all.length,afterMeshes:all.length,beforeTriangles:all.reduce((n,o)=>n+triangles(o.geometry),0),afterTriangles:0,mergedGroups:0,removedMeshes:0,sourceGeometryBytes:[...sourceGeometries].reduce((n,g)=>n+bytes(g),0),addedMergedGeometryBytes:0,peakTemporaryCloneBytes:0};
 const inverse=new T.Matrix4().copy(root.matrixWorld).invert(),groups=new Map(),materials=new Map();
 // Singular/mirrored roots are not this café's static layout; retain them safely.
 if(root.matrixWorld.determinant()>0)for(const mesh of all)if(eligible(mesh,root)){if(!materials.has(mesh.material))materials.set(mesh.material,materials.size);const key=signature(mesh,materials.get(mesh.material));if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
 for(const members of groups.values()){
  if(members.length<2)continue;
  const clones=members.map(mesh=>mesh.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));
  report.peakTemporaryCloneBytes=Math.max(report.peakTemporaryCloneBytes,clones.reduce((n,g)=>n+bytes(g),0));
  const geometry=mergeGeometries(clones,false);for(const clone of clones)clone.dispose();if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();const first=members[0],batch=new T.Mesh(geometry,first.material);
  batch.name='static-cafe-batch';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.layers.mask=first.layers.mask;batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;
  root.add(batch);for(const mesh of members)mesh.removeFromParent();
  // Sources belong to the existing shared cache (also used by dynamic models).
  report.mergedGroups++;report.removedMeshes+=members.length;report.addedMergedGeometryBytes+=bytes(geometry);
 }
 report.afterMeshes=0;root.traverse(o=>{if(o.isMesh){report.afterMeshes++;report.afterTriangles+=triangles(o.geometry);}});
 return report;
}
