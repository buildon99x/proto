/** Inspect-only snapshot. Coordinates are scene units, with no vertical exaggeration. */
export const inspectConfiguration=Object.freeze({worldId:'desert',z:-7.4,time:12,topCamera:{position:[0,40,0],up:[0,0,-1]},sectionVerticalScale:1});

/** Intersect actual transformed BufferGeometry triangles, not object bounds or a blueprint. */
export function sectionTriangles(root,z,epsilon=1e-7){
 if(!Number.isFinite(z))throw new TypeError('Section z must be finite.');
 root.updateMatrixWorld(true);
 const segments=[];let triangleCount=0,meshCount=0,cutMeshCount=0;
 root.traverseVisible(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
  const position=mesh.geometry.attributes.position,index=mesh.geometry.index;
  const count=index?.count??position.count,instances=mesh.isInstancedMesh?mesh.count:1;
  const ancestry=[];for(let o=mesh;o;o=o.parent)if(o.name)ancestry.push(o.name);
  for(let instance=0;instance<instances;instance++){
   meshCount++;const matrix=mesh.matrixWorld.clone();
   if(mesh.isInstancedMesh){const local=matrix.clone().identity();mesh.getMatrixAt(instance,local);matrix.multiply(local);}
   const e=matrix.elements,seen=new Set(),start=segments.length;
   const world=i=>{const x=position.getX(i),y=position.getY(i),zz=position.getZ(i);return[e[0]*x+e[4]*y+e[8]*zz+e[12],e[1]*x+e[5]*y+e[9]*zz+e[13],e[2]*x+e[6]*y+e[10]*zz+e[14]];};
   const add=(a,b,offset)=>{
    if(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<=epsilon)return;
    const key=p=>p.map(v=>Math.round(v/epsilon)).join(',');const ka=key(a),kb=key(b),k=ka<kb?`${ka}/${kb}`:`${kb}/${ka}`;
    if(seen.has(k))return;seen.add(k);
    const group=mesh.geometry.groups.find(g=>offset>=g.start&&offset<g.start+g.count);
    const material=Array.isArray(mesh.material)?mesh.material[group?.materialIndex??0]:mesh.material;
    segments.push({a,b,meshName:mesh.name,ancestry:[...ancestry],instance:mesh.isInstancedMesh?instance:null,color:material?.color?.getHexString?.()??'a9875e'});
   };
   const startOffset=Math.max(0,mesh.geometry.drawRange.start),endOffset=Math.min(count,startOffset+mesh.geometry.drawRange.count);
   for(let offset=startOffset;offset+2<endOffset;offset+=3){
    triangleCount++;
    const vertices=[0,1,2].map(k=>world(index?index.getX(offset+k):offset+k)),distance=vertices.map(p=>p[2]-z);
    if(distance.every(d=>d>epsilon)||distance.every(d=>d< -epsilon))continue;
    if(distance.every(d=>Math.abs(d)<=epsilon)){for(let i=0;i<3;i++)add(vertices[i],vertices[(i+1)%3],offset);continue;}
    const points=[];const point=p=>{if(!points.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<epsilon))points.push([p[0],p[1],z]);};
    for(let i=0;i<3;i++){
     const j=(i+1)%3,a=vertices[i],b=vertices[j],da=distance[i],db=distance[j];
     if(Math.abs(da)<=epsilon)point(a);
     if(da*db< -epsilon*epsilon){const t=da/(da-db);point(a.map((v,k)=>v+(b[k]-v)*t));}
    }
    if(points.length===2)add(points[0],points[1],offset);
   }
   if(segments.length>start)cutMeshCount++;
  }
 });
 return {z,segments,triangleCount,meshCount,cutMeshCount};
}
