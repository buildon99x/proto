/* Original procedural scenery for DFWorld; no network assets or screen-space noise.
 * DFWorldView.build({T: THREE,parent: Group,world: Mission}) ->
 * {wallMeshes,extractionMeshes,treeMeshes,stats,dispose()}.
 * wallMeshes is collision-ID indexed. Trunk raycast proxies have renderProxy=true;
 * keep those invisible when syncing walls. Three raycasting still tests proxies.
 */
(function(root){
'use strict';
function build({T,parent,world}){
 const data=world.region||world,wallData=world.walls||data.walls;
 if(!T||!parent||!data.trees)throw new Error('DFWorldView requires THREE, parent and a populated region');
 const group=new T.Group();group.name='black-pines-region';parent.add(group);
 const resources={geometry:new Set(),material:new Set(),texture:new Set()};
 const geometry=g=>(resources.geometry.add(g),g);
 const geos={box:geometry(new T.BoxGeometry(1,1,1)),cylinder:geometry(new T.CylinderGeometry(1,1,1,8)),cone:geometry(new T.ConeGeometry(1,1,7)),plane:geometry(new T.PlaneGeometry(1,1)),disc:geometry(new T.CircleGeometry(1,48)),ring:geometry(new T.TorusGeometry(1,.018,4,48))};
 const colors={soil:[64,72,76],road:[110,117,121],gravel:[133,138,140],concrete:[157,163,165],rock:[105,116,122],wood:[88,95,96],trunk:[43,52,57],leaf:[43,58,62],steel:[76,89,96],crate:[113,114,104],bark:[103,110,106],dark:[28,39,45],ivory:[197,207,207],rust:[99,42,43],mud:[64,72,77]};
 function material(kind,repeat=1){const n=64,pixels=new Uint8Array(n*n*4),base=colors[kind];let s=731;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){s=(Math.imul(s,1664525)+1013904223)>>>0;let grain=(s/4294967296-.5)*(kind==='soil'?17:22),stain=Math.sin(x*.14+y*.06)*Math.sin(y*.17)*9;
   if(kind==='wood'||kind==='trunk'||kind==='bark')grain+=Math.sin(x*.73+Math.sin(y*.15))*7;
   if(kind==='steel')grain-=(x%16<2?15:0)+(y%32<1?9:0);
   if(kind==='crate')grain-=(x<4||x>59||y<4||y>59||Math.abs(x-y)<2)?24:0;
   for(let k=0;k<3;k++)pixels[(y*n+x)*4+k]=Math.max(0,Math.min(255,base[k]+grain+stain));pixels[(y*n+x)*4+3]=255;
  }
  const map=new T.DataTexture(pixels,n,n,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(repeat,repeat);map.magFilter=T.NearestFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;resources.texture.add(map);
  const m=new T.MeshLambertMaterial({map,color:0xffffff});m.name='weathered-'+kind;resources.material.add(m);return m;
 }
 const mats={};for(const kind of Object.keys(colors))mats[kind]=material(kind,kind==='soil'?42:1);
 const basic=(color,extra={})=>{const m=new T.MeshBasicMaterial({color,...extra});resources.material.add(m);return m;};
 const marker=basic('#bbc7c6'),dimMarker=basic('#647776'),redMarker=basic('#782a31'),proxyMat=basic('#000000');
 function mesh(g,m,x,y,z,sx=1,sy=1,sz=1){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o;}
 const box=(x,y,z,w,h,d,m=mats.concrete)=>mesh(geos.box,m,x,y,z,w,h,d);
 const cylinder=(x,y,z,r,h,m=mats.steel)=>mesh(geos.cylinder,m,x,y,z,r,h,r);
 function flat(x,z,w,d,m,y=.012,rotation=0){const o=mesh(geos.plane,m,x,y,z,w,d,1);o.rotation.x=-Math.PI/2;o.rotation.z=rotation;return o;}
 function disc(x,z,r,m,y=.014){const o=mesh(geos.disc,m,x,y,z,r,r,1);o.rotation.x=-Math.PI/2;return o;}
 function beam(a,b,width,m=mats.steel){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),o=box(...av.clone().add(bv).multiplyScalar(.5).toArray(),width,v.length(),width,m);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
 flat(0,0,data.size,data.size,mats.soil,-.035);
 // Constant in-world surface texture; broad routes read through the fog as paths.
 for(const r of data.routes){for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),x=(a.x+b.x)/2,z=(a.z+b.z)/2;
   flat(x,z,r.width,length+.2,mats.road,.002,angle);
   for(const offset of [-r.width*.22,r.width*.22])flat(x+Math.cos(angle)*offset,z-Math.sin(angle)*offset,.44,length,mats.mud,.008,angle);
  }for(const p of r.points)disc(p.x,p.z,r.width/2,mats.road,.001);
 }
 for(const l of data.landmarks)disc(l.x,l.z,l.radius*.84,l.id==='quarry'?mats.gravel:l.id==='depot'||l.id==='relay'?mats.concrete:mats.road,.018);
 // Collision geometry and ray-hit identity. Elevated roofs/gantries retain their height.
 const wallMeshes=[];
 for(const w of wallData){let o;
  if(w.kind==='trunk'){o=mesh(geos.cylinder,proxyMat,w.x,w.h/2,w.z,w.w/2,w.h,w.d/2);o.visible=false;}
  else{o=box(w.x,(w.y||0)+w.h/2,w.z,w.w,w.h,w.d,mats[w.kind]||mats.concrete);if(w.kind==='boundary'||w.renderProxy)o.visible=false;}
  o.name='wall-'+w.id;o.userData={kind:'wall',id:w.id,renderProxy:!!w.renderProxy||w.kind==='trunk'||w.kind==='boundary'};wallMeshes[w.id]=o;
 }
 // Whole forest: three render calls including low understory. No individual leaf objects.
 const trunks=new T.InstancedMesh(geos.cylinder,mats.trunk,data.trees.length),leaves=new T.InstancedMesh(geos.cone,mats.leaf,data.trees.length*4),brush=new T.InstancedMesh(geos.cone,mats.leaf,data.trees.length*2);
 trunks.name='forest-trunks';leaves.name='forest-canopy';brush.name='forest-understory';const dummy=new T.Object3D(),color=new T.Color();
 for(let i=0;i<data.trees.length;i++){const t=data.trees[i];dummy.position.set(t.x,t.h/2,t.z);dummy.rotation.set(0,t.rotation,0);dummy.scale.set(t.r,t.h,t.r);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);color.setRGB(.76+t.tone*.07,.8+t.tone*.065,.84+t.tone*.06);trunks.setColorAt(i,color);
  for(let j=0;j<4;j++){const radius=t.crown*(1-j*.19),height=t.h*(.42-j*.026);dummy.position.set(t.x,t.h*(.41+j*.155),t.z);dummy.rotation.set(0,t.rotation+j*.7,0);dummy.scale.set(radius,height,radius*.92);dummy.updateMatrix();leaves.setMatrixAt(i*4+j,dummy.matrix);color.setRGB(.74+t.tone*.08+j*.016,.79+t.tone*.07+j*.012,.82+t.tone*.06+j*.014);leaves.setColorAt(i*4+j,color);}
  for(let j=0;j<2;j++){dummy.position.set(t.x+Math.cos(t.rotation+j*2)*1.4,.17,t.z+Math.sin(t.rotation+j*2)*1.4);dummy.rotation.set(0,t.rotation,0);dummy.scale.set(.6,.34,.38);dummy.updateMatrix();brush.setMatrixAt(i*2+j,dummy.matrix);}
 }
 for(const o of [trunks,leaves,brush]){o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.computeBoundingSphere();group.add(o);}
 // High-contrast location plates are world objects, never overlaid on the screen.
 function sign(v){const h=v.width*.14;box(v.x,v.y,v.z,v.width+.15,h+.15,.13,mats.dark);
  if(typeof document==='undefined'||!document.createElement)return;
  const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#202b31';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#aab9b9';ctx.lineWidth=4;ctx.strokeRect(7,7,754,114);ctx.font='bold 42px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#d1d9d6';ctx.fillText(v.text,384,66);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;resources.texture.add(texture);const m=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});resources.material.add(m);mesh(geos.plane,m,v.x,v.y,v.z+.074,v.width,h,1);
 }
 for(const v of data.details){
  if(v.type==='sign'||v.type==='direction'){sign(v);continue;}
  if(v.type==='practice'){for(const x of [-10,-6])box(x,.79,123,1,.03,1.12,marker);sign({x:-7,z:111.9,y:2.8,width:6,text:'JUMP / SLIDE'});}
  if(v.type==='hut-roof'){const o=box(v.x,v.y+.1,v.z,v.w,.2,v.d,mats.dark);o.rotation.z=.045;box(v.x,v.y-.13,v.z+v.d/2,v.w,.24,.18,mats.ivory);}
  if(v.type==='log-stack'){for(let j=0;j<3;j++){const o=cylinder(v.x,.24+j*.3,v.z+.55-j*.32,.23,v.w*.98,mats.bark);o.rotation.z=Math.PI/2;for(const x of [v.x-v.w/2-.02,v.x+v.w/2+.02]){const end=mesh(geos.disc,mats.ivory,x,.24+j*.3,v.z+.55-j*.32,.2,.2,1);end.rotation.y=Math.PI/2;}}}
  if(v.type==='sawmill'){box(v.x,3,v.z,v.w+.7,.2,v.d+.6,mats.dark);box(v.x,1.6,v.z+v.d/2+.04,3,.8,.08,mats.dark);for(let j=0;j<3;j++)box(v.x-3+j*3,1.5,v.z+v.d/2+.12,.12,2.9,.12,mats.ivory);}
  if(v.type==='container'){for(const side of [-1,1]){for(let i=0;i<Math.floor(v.w);i+=2)box(v.x-v.w/2+i+.5,1.65,v.z+side*(v.d/2+.025),.12,2.95,.06,mats.dark);box(v.x,3.15,v.z+side*(v.d/2+.04),v.w,.1,.1,mats.ivory);}box(v.x+v.w/2+.025,1.7,v.z,.06,2.8,.12,mats.ivory);}
  if(v.type==='gantry'){beam([v.x-v.width/2,7.5,v.z],[v.x+v.width/2,9.4,v.z],.12);beam([v.x+v.width/2,7.5,v.z],[v.x-v.width/2,9.4,v.z],.12);box(v.x,9.5,v.z,v.width,.22,.9,mats.dark);box(v.x,6.6,v.z,.12,3.2,.12,mats.rust);}
  if(v.type==='rail'){for(const x of [v.x-1.4,v.x+1.4])box(x,.043,v.z,.13,.08,v.length,mats.steel);for(let z=v.z-v.length/2;z<v.z+v.length/2;z+=3.3)box(v.x,.025,z,3.8,.04,.38,mats.dark);}
  if(v.type==='tip-wagon'){box(v.x,2.94,v.z,v.w+.2,.17,v.d+.2,mats.rust);for(const x of [v.x-3,v.x+3])for(const z of [v.z-1.95,v.z+1.95]){const o=cylinder(x,.55,z,.53,.25,mats.dark);o.rotation.x=Math.PI/2;}}
  if(v.type==='crane'){box(v.x,8.1,v.z,5,.45,5,mats.dark);beam([v.x,8.7,v.z],[v.x-13,11,v.z],.4);beam([v.x-13,11,v.z],[v.x-13,4.7,v.z],.065);box(v.x-13,4.7,v.z,1.3,.22,.7,mats.rust);}
  if(v.type==='quarry'){for(let i=0;i<10;i++){const a=i*Math.PI/5,r=19,px=v.x+Math.cos(a)*r,pz=v.z+Math.sin(a)*r;flat(px,pz,3.2,2.4,mats.rock,.032,a);}}
  if(v.type==='relay-equipment'){for(let i=0;i<3;i++)box(v.x-2.7+i*2.7,2.6,v.z,1.8,.25,4.5,mats.dark);box(v.x,1.4,v.z+v.d/2+.055,v.w*.8,.35,.06,mats.rust);}
  if(v.type==='mast'){for(let h=4;h<v.height;h+=4){box(v.x,h,v.z,3.3,.14,3.3,mats.steel);beam([v.x-1.5,h,v.z+1.5],[v.x+1.5,Math.min(v.height,h+4),v.z+1.5],.1);beam([v.x+1.5,h,v.z-1.5],[v.x-1.5,Math.min(v.height,h+4),v.z-1.5],.1);}for(const h of [18,23]){box(v.x,h,v.z,10,.15,.15,mats.ivory);for(const x of [v.x-4,v.x+4])box(x,h,v.z,.25,2,.15,mats.ivory);}cylinder(v.x,v.height+1.5,v.z,.1,3,mats.steel);cylinder(v.x,v.height+3,v.z,.21,.25,redMarker);}
 }
 const extractionMeshes=[];
 for(const e of data.extractionZones){const pad=new T.Group();pad.name=e.id;pad.position.set(e.x,0,e.z);group.add(pad);const ring=new T.Mesh(geos.ring,marker);ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.scale.setScalar(e.radius);pad.add(ring);
  for(const x of [-2,2]){const o=new T.Mesh(geos.box,marker);o.position.set(x,.07,0);o.scale.set(.65,.035,5.2);pad.add(o);}const cross=new T.Mesh(geos.box,marker);cross.position.y=.07;cross.scale.set(4,.035,.65);pad.add(cross);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,o=new T.Mesh(geos.box,i%2?dimMarker:marker);o.position.set(Math.cos(a)*(e.radius+.4),.07,Math.sin(a)*(e.radius+.4));o.scale.set(.9,.05,.5);o.rotation.y=-a;pad.add(o);}
  extractionMeshes.push(pad);
 }
 // Perpetual surface night: old powered work lamps create useful local pools.
 // No sun, moon or explanation for the upper-atmosphere event is invented here.
 const lampMaterial=basic('#d4e3ec');
 for(const l of data.landmarks){const x=l.x+7,z=l.z+7;const pole=cylinder(x,2.4,z,.11,4.8,mats.steel);pole.name='night-work-lamp';pole.userData.fixture=true;box(x,4.9,z,1.15,.22,.8,mats.dark);box(x,4.76,z,1,.05,.66,lampMaterial);const light=new T.PointLight('#a6c6df',58,34,2);light.position.set(x,4.5,z);light.name='night-landmark-light';group.add(light);}
 for(const e of data.extractionZones){const light=new T.PointLight('#adcac8',28,20,2);light.position.set(e.x,2.2,e.z);light.name='night-extraction-light';group.add(light);}
 // Batch static, non-colliding decoration by shared geometry/material. Collision
 // targets keep their individual IDs for weapon hit/destruction synchronization.
 const batches=new Map(),decorInstances=[];
 for(const o of [...group.children]){if(!o.isMesh||o.isInstancedMesh||o.userData.kind||o.userData.fixture)continue;const key=o.geometry.uuid+':'+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}
 for(const objects of batches.values()){if(objects.length<3)continue;const first=objects[0],inst=new T.InstancedMesh(first.geometry,first.material,objects.length);inst.name='region-decoration-batch';objects.forEach((o,i)=>{o.updateMatrix();inst.setMatrixAt(i,o.matrix);group.remove(o);});inst.instanceMatrix.needsUpdate=true;inst.computeBoundingSphere();group.add(inst);decorInstances.push(inst);}
 group.updateMatrixWorld(true);let visibleMeshes=0,triangles=0,instances=0;
 group.traverse(o=>{if(!o.isMesh||!o.visible)return;visibleMeshes++;const count=o.isInstancedMesh?o.count:1;instances+=o.isInstancedMesh?o.count:0;triangles+=((o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3)*count;});
 const stats={treeCount:data.trees.length,treeDrawCalls:3,visibleMeshes,triangles,instances,materials:resources.material.size,textures:resources.texture.size,wallRayTargets:wallMeshes.length};
 return {group,wallMeshes,extractionMeshes,treeMeshes:[trunks,leaves,brush],stats,dispose(){parent.remove(group);for(const o of [trunks,leaves,brush,...decorInstances])o.dispose();for(const g of resources.geometry)g.dispose();for(const m of resources.material)m.dispose();for(const t of resources.texture)t.dispose();}};
}
root.DFWorldView={build};if(typeof module!=='undefined')module.exports=root.DFWorldView;
})(typeof globalThis!=='undefined'?globalThis:this);
