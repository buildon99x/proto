/* Original procedural SILT sentinel. No external assets, environment map or new lights.
 * The material's six bounded cylinder cut-outs are render-only: DFLiquidMetal owns hits.
 * All deformation/repair uses the supplied simulation time, including while paused. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.DFLiquidMetalView=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const MAX_HOLES=6,HOLE_LIFETIME=.6,clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
 const noRaycast=()=>{};
 function readPose(enemy){
  let model=root.DFLiquidMetal;
  if(!model&&typeof require==='function'){try{model=require('./liquid-metal.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}}
  if(model&&typeof model.pose==='function')return model.pose(enemy);
  const m=enemy.metal||{},state=m.state||'idle',open=state==='disrupted'?1:state==='reform'?1-ease(finite(m.stateTime)):0;
  return {state,stateTime:finite(m.stateTime),yaw:finite(m.yaw),bodyScaleY:1-.72*open,torsoSpread:.24*open,bladeLength:state==='strike'?3:state==='windup'?3*ease(finite(m.stateTime)/.75):(state==='recover'||state==='recovery')?3*(1-ease(finite(m.stateTime)/.7)):0,bladeOrigin:{x:.48,y:1.25,z:-.15},bladeDirection:{x:0,y:0,z:-1},core:{x:0,y:1.25,z:0,r:.24,exposed:!!m.coreExposed}};
 }
 function roundedBox(T,w,h,d,r){
  const g=new T.BoxGeometry(w,h,d,6,8,6),a=g.attributes.position;
  r=Math.min(r,w/2,h/2,d/2);const v=new T.Vector3(),q=new T.Vector3();
  for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);q.set(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z)));v.sub(q).normalize().multiplyScalar(r).add(q);a.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();return g;
 }
 function bladeGeometry(T){
  // A broad, asymmetric faceted extrusion becomes a tapered liquid arm blade.
  const v=[[-.105,0,0],[.105,0,0],[0,.04,0],[0,-.04,0],[-.065,0,-.67],[.055,0,-.67],[0,.025,-.67],[0,-.025,-.67],[.016,0,-1]];
  const faces=[[0,2,6],[0,6,4],[2,1,5],[2,5,6],[1,3,7],[1,7,5],[3,0,4],[3,4,7],[4,6,8],[6,5,8],[5,7,8],[7,4,8],[0,3,2],[1,2,3]],positions=[];
  for(const f of faces)for(const i of f)positions.push(...v[i]);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
 }
 function cutoutMaterial(T,color,uniforms,name,extra={}){
  const material=new T.MeshPhongMaterial({color,specular:0xf3fbff,shininess:90,side:T.DoubleSide,...extra});material.name=name;
  material.customProgramCacheKey=()=> 'silt-cylinder-cutouts-v1';
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='uniform mat4 siltInverseRoot;\nvarying vec3 siltPosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nsiltPosition = (siltInverseRoot * modelMatrix * vec4(transformed, 1.0)).xyz;');
   shader.fragmentShader='uniform vec3 siltHoleCenters[6];\nuniform vec3 siltHoleAxes[6];\nuniform float siltHoleRadii[6];\nvarying vec3 siltPosition;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfor (int i = 0; i < 6; i++) {\n vec3 delta = siltPosition - siltHoleCenters[i];\n float along = dot(delta, siltHoleAxes[i]);\n vec3 radial = delta - along * siltHoleAxes[i];\n if (siltHoleRadii[i] > 0.0 && abs(along) < 0.85 && dot(radial, radial) < siltHoleRadii[i] * siltHoleRadii[i]) discard;\n}');
  };
  return material;
 }
 function create(T,enemy){
  if(!T||!enemy)throw new Error('DFLiquidMetalView requires THREE and an enemy');
  const group=new T.Group();group.name='silt-liquid-metal-sentinel';
  const shell=new T.Group();shell.name='silt-connected-shell';group.add(shell);
  const uniforms={siltInverseRoot:{value:new T.Matrix4()},siltHoleCenters:{value:Array.from({length:MAX_HOLES},()=>new T.Vector3())},siltHoleAxes:{value:Array.from({length:MAX_HOLES},()=>new T.Vector3(0,0,-1))},siltHoleRadii:{value:new Float32Array(MAX_HOLES)}};
  const silver=cutoutMaterial(T,0xb7c3ca,uniforms,'silt-diffuse-silver'),bright=cutoutMaterial(T,0xe1ebee,uniforms,'silt-polished-ridges',{shininess:135}),dark=cutoutMaterial(T,0x657b87,uniforms,'silt-recessed-metal',{shininess:110});
  const rimMaterial=new T.MeshPhongMaterial({color:0xe9f4f5,specular:0xffffff,shininess:150,side:T.DoubleSide});rimMaterial.name='silt-chrome-hole-rim';
  const amber=new T.MeshBasicMaterial({color:0xffb84f});amber.name='silt-amber-core';
  const warningMaterial=new T.MeshBasicMaterial({color:0xffc569,transparent:true,opacity:.8,depthWrite:false});warningMaterial.name='silt-blade-telegraph';
  const unitSphere=new T.SphereGeometry(1,16,12),limbGeometry=new T.CylinderGeometry(1,1,1,10),parts={},shellMeshes=[];
  function mesh(parent,name,geometry,material,pos=[0,0,0],scale=[1,1,1],decorative=false){
   const o=new T.Mesh(geometry,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=!decorative;o.receiveShadow=true;
   o.userData.enemy=enemy;o.userData.siltPart=name;parent.add(o);
   if(decorative){o.raycast=noRaycast;o.userData.renderOnly=true;}else if(parent===shell||parent.userData.shellPart)shellMeshes.push(o);
   return o;
  }
  parts.torso=[];parts.legs=[];parts.arms=[];parts.ridges=[];
  for(const side of [-1,1]){
   const name=side<0?'left':'right';
   const torso=mesh(shell,'silt-'+name+'-torso',roundedBox(T,.29,.8,.35,.055),silver,[side*.145,1.12,0]);parts.torso.push(torso);
   const ridge=mesh(shell,'silt-'+name+'-torso-glint',roundedBox(T,.034,.58,.016,.008),bright,[side*.22,1.16,-.178],[1,1,1],true);parts.ridges.push(ridge);
   const thigh=mesh(shell,'silt-'+name+'-thigh',roundedBox(T,.22,.39,.25,.075),silver,[side*.18,.535,-.005]);
   const shin=mesh(shell,'silt-'+name+'-shin',roundedBox(T,.20,.33,.24,.065),silver,[side*.18,.225,-.025]);
   const knee=mesh(shell,'silt-'+name+'-knee',unitSphere,bright,[side*.18,.365,-.035],[.109,.10,.126]);
   const foot=mesh(shell,'silt-'+name+'-foot',roundedBox(T,.23,.13,.36,.055),silver,[side*.18,.075,-.04]);
   parts.legs.push({thigh,shin,knee,foot,side});
   const shoulder=mesh(shell,'silt-'+name+'-shoulder',unitSphere,silver,[side*.40,1.40,-.07],[.15,.13,.15]);
   const upper=mesh(shell,'silt-'+name+'-upper-arm',limbGeometry,silver);
   const elbow=mesh(shell,'silt-'+name+'-elbow',unitSphere,bright,[side*.43,1.13,-.15],[.112,.11,.12]);
   const forearm=mesh(shell,'silt-'+name+'-forearm',limbGeometry,silver);
   const hand=mesh(shell,'silt-'+name+'-hand',unitSphere,silver,[side*.43,.97,-.19],[.112,.13,.13]);
   parts.arms.push({shoulder,upper,elbow,forearm,hand,side});
  }
  parts.pelvis=mesh(shell,'silt-pelvis',roundedBox(T,.56,.18,.35,.065),silver,[0,.75,0]);
  parts.abdomen=mesh(shell,'silt-abdomen-bridge',roundedBox(T,.26,.32,.29,.055),dark,[0,.88,.015]);
  parts.neck=mesh(shell,'silt-neck',limbGeometry,silver,[0,1.61,0],[.12,.23,.12]);
  parts.head=mesh(shell,'silt-faceless-head',unitSphere,silver,[0,1.83,0],[.24,.24,.225]);
  parts.crown=mesh(shell,'silt-asymmetric-crown-ridge',roundedBox(T,.038,.31,.028,.014),bright,[-.06,1.88,-.214],[1,1,1],true);parts.crown.rotation.z=-.18;
  parts.face=mesh(shell,'silt-face-seam',roundedBox(T,.25,.025,.018,.008),dark,[.015,1.86,-.222],[1,1,1],true);parts.face.rotation.z=.13;
  parts.core=mesh(group,'silt-exposed-core',new T.IcosahedronGeometry(1,2),amber,[0,1.25,0],[.24,.24,.24]);parts.core.userData.core=true;
  parts.coreCage=mesh(group,'silt-core-cage',new T.TorusGeometry(.245,.014,6,20),rimMaterial,[0,1.25,0],[1,1,1],true);parts.coreCage.rotation.y=.25;
  parts.tethers=[];
  for(const side of [-1,1])parts.tethers.push(mesh(group,'silt-core-liquid-tether-'+side,limbGeometry,rimMaterial,[0,0,0],[1,1,1],true));
  parts.blade=mesh(group,'silt-extruding-arm-blade',bladeGeometry(T),bright,[.48,1.25,-.15]);parts.blade.userData.shellPart=true;shellMeshes.push(parts.blade);
  parts.bladeRoot=mesh(group,'silt-blade-liquid-root',unitSphere,silver,[.48,1.25,-.15],[.13,.10,.16]);shellMeshes.push(parts.bladeRoot);
  parts.bladeWarning=mesh(parts.blade,'silt-blade-warning-edge',new T.BoxGeometry(.022,.012,.9),warningMaterial,[.005,.042,-.47],[1,1,1],true);
  parts.puddle=mesh(group,'silt-silver-puddle',unitSphere,rimMaterial,[0,.025,0],[.28,.025,.26],true);
  parts.droplets=[];
  for(let i=0;i<8;i++)parts.droplets.push(mesh(group,'silt-reforming-droplet-'+i,unitSphere,rimMaterial,[0,0,0],[.045,.08,.045],true));
  const rims=[];
  for(let i=0;i<MAX_HOLES;i++){const rim=mesh(group,'silt-bullet-hole-rim-'+i,new T.TorusGeometry(1,.1,5,20),rimMaterial,[0,0,0],[1,1,1],true);rim.visible=false;rims.push(rim);}
  group.userData.enemy=enemy;group.userData.silt={T,parts,shell,shellMeshes,uniforms,rims,holes:[],lastTime:0,pose:null};
  update(group,enemy,0);return group;
 }
 function segment(T,mesh,a,b,radius){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),length=delta.length();
  mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.set(radius,Math.max(.0001,length),radius);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
 }
 function keyOf(h){return [finite(h.time),h.point.x,h.point.y,h.point.z,h.part||''].join(':');}
 function ingest(group,event,worldTime){
  const s=group.userData.silt,T=s.T;
  if(!event||!point(event.point))return false;
  const time=finite(event.time,worldTime);if(worldTime-time>=HOLE_LIFETIME||time>worldTime+.02)return false;
  const key=keyOf({...event,time});if(s.holes.some(h=>h.key===key))return false;
  group.updateMatrixWorld(true);
  const worldPoint=new T.Vector3(event.point.x,event.point.y,event.point.z),worldAxis=point(event.direction)?new T.Vector3(event.direction.x,event.direction.y,event.direction.z):point(event.normal)?new T.Vector3(-event.normal.x,-event.normal.y,-event.normal.z):new T.Vector3(0,0,1).transformDirection(group.matrixWorld);
  if(worldAxis.lengthSq()<1e-10)worldAxis.set(0,0,1);worldAxis.normalize();
  let anchor=s.parts.torso[worldPoint.clone().applyMatrix4(group.matrixWorld.clone().invert()).x<0?0:1],nearest=Infinity;
  for(const o of s.shellMeshes){if(!o.visible)continue;o.geometry.computeBoundingBox();const local=o.worldToLocal(worldPoint.clone()),box=o.geometry.boundingBox,closest=local.clone().clamp(box.min,box.max),distance=o.localToWorld(closest).distanceToSquared(worldPoint);if(distance<nearest){nearest=distance;anchor=o;}}
  const localPoint=anchor.worldToLocal(worldPoint.clone()),inverse=anchor.matrixWorld.clone().invert(),localAxis=worldAxis.clone().transformDirection(inverse);
  s.holes.push({key,time,anchor,point:localPoint,axis:localAxis,radius:Math.max(.035,Math.min(.16,finite(event.radius,.095)))});
  if(s.holes.length>MAX_HOLES)s.holes.splice(0,s.holes.length-MAX_HOLES);
  return true;
 }
 function syncHoles(group,enemy,time){
  const s=group.userData.silt,T=s.T;
  if(time<s.lastTime-1e-8)s.holes.length=0;
  s.holes=s.holes.filter(h=>time-h.time<HOLE_LIFETIME&&time>=h.time-.02);
  const incoming=enemy.metal&&Array.isArray(enemy.metal.holes)?enemy.metal.holes:[];
  for(const event of incoming.slice(-MAX_HOLES))ingest(group,event,time);
  const inverse=group.matrixWorld.clone().invert();s.uniforms.siltInverseRoot.value.copy(inverse);
  for(let i=0;i<MAX_HOLES;i++){
   const h=s.holes[i],rim=s.rims[i];rim.visible=!!h;
   if(!h){s.uniforms.siltHoleRadii.value[i]=0;continue;}
   const radius=h.radius*Math.sqrt(1-clamp((time-h.time)/HOLE_LIFETIME)),center=h.anchor.localToWorld(h.point.clone()).applyMatrix4(inverse),axis=h.axis.clone().transformDirection(h.anchor.matrixWorld).transformDirection(inverse);
   s.uniforms.siltHoleCenters.value[i].copy(center);s.uniforms.siltHoleAxes.value[i].copy(axis);s.uniforms.siltHoleRadii.value[i]=radius;
   rim.position.copy(center).addScaledVector(axis,-.009);rim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),axis);rim.scale.setScalar(radius);rim.visible=radius>.001;
  }
  s.lastTime=time;
 }
 function update(group,enemy,worldTime){
  const s=group.userData.silt;if(!s)throw new Error('Expected a SILT view group');
  const T=s.T,p=readPose(enemy),m=enemy.metal||{},state=p.state||m.state||'idle',time=finite(worldTime,s.lastTime),dead=state==='dead'||enemy.alive===false,age=Math.max(0,finite(p.stateTime,finite(m.stateTime)),dead&&Number.isFinite(m.enteredAt)?time-m.enteredAt:0);
  const collapse=dead?1-ease(age/.45):1,sy=Math.max(.001,finite(p.bodyScaleY,1))*collapse,spread=Math.max(0,finite(p.torsoSpread)),core=p.core||{x:0,y:1.25,z:0,r:.24,exposed:!!m.coreExposed};
  group.position.set(finite(enemy.x),finite(enemy.y),finite(enemy.z));group.rotation.set(0,finite(p.yaw,finite(m.yaw)),0);group.scale.setScalar(1);group.visible=true;
  s.pose=p;s.shell.scale.set(1,Math.max(.001,sy),1);s.shell.visible=!dead||age<.45;
  const opening=clamp((1-sy)/.72),walking=state==='pursue'?Math.sin(time*7)*.025:0;
  s.parts.torso.forEach((o,i)=>{o.position.x=(i===0?-1:1)*(.145+spread);});
  s.parts.ridges.forEach((o,i)=>{o.position.x=(i===0?-1:1)*(.22+spread);});
  s.parts.abdomen.scale.x=1+spread*1.5;
  s.parts.legs.forEach(l=>{l.thigh.position.z=-.005+walking*l.side;l.shin.position.z=-.025-walking*l.side;l.knee.position.z=-.035;l.foot.position.z=-.04;});
  const bladeLength=dead?0:Math.max(0,Math.min(3.2,finite(p.bladeLength))),bladeActive=bladeLength>.015&&!['disrupted','reform'].includes(state),origin=p.bladeOrigin||{x:.48,y:1.25,z:-.15},direction=p.bladeDirection||{x:0,y:0,z:-1};
  s.parts.arms.forEach(a=>{
   const x=a.side*(.43+spread),shoulder=[a.side*(.40+spread),1.40,-.07],elbow=[x,1.13,-.15],hand=a.side===1&&bladeActive?[origin.x,origin.y,origin.z]:[x,.97,-.19];
   a.shoulder.position.set(...shoulder);a.elbow.position.set(...elbow);a.hand.position.set(...hand);a.hand.visible=!(a.side===1&&bladeActive);
   segment(T,a.upper,shoulder,elbow,.105);segment(T,a.forearm,elbow,hand,.108);
  });
  s.parts.blade.visible=s.parts.bladeRoot.visible=bladeActive;
  s.parts.blade.position.set(origin.x,origin.y,origin.z);s.parts.blade.scale.set(1,1,Math.max(.001,bladeLength));
  const axis=new T.Vector3(direction.x,direction.y,direction.z);if(axis.lengthSq()<1e-8)axis.set(0,0,-1);axis.normalize();s.parts.blade.quaternion.setFromUnitVectors(new T.Vector3(0,0,-1),axis);s.parts.bladeRoot.position.copy(s.parts.blade.position);
  const aimLocked=!!m.aimLocked||state==='windup'&&age>=.5;
  s.parts.bladeWarning.visible=state==='windup';s.parts.bladeWarning.material.color.setHex(aimLocked?0xffeed0:0xffc569);s.parts.bladeWarning.material.opacity=aimLocked?1:.55+.4*(.5+.5*Math.sin(time*20));
  const coreVisible=!!core.exposed&&!dead;
  s.parts.core.visible=s.parts.coreCage.visible=coreVisible;s.parts.core.position.set(core.x,core.y,core.z);s.parts.core.scale.setScalar(core.r);s.parts.coreCage.position.copy(s.parts.core.position);s.parts.coreCage.rotation.z=time*.6;
  s.parts.core.material.color.setHex(state==='reform'?0xdca252:0xffb84f);
  s.parts.tethers.forEach((o,i)=>{o.visible=coreVisible;segment(T,o,[(i===0?-1:1)*(.22+spread),1.42*sy,0],[(i===0?-1:1)*.13,core.y-.11,0],.027);});
  const puddleSize=dead?.3+.7*ease(age/.45):.26+.43*opening;s.parts.puddle.scale.set(puddleSize,.025+opening*.015,puddleSize*.79);s.parts.puddle.position.y=.023;
  s.parts.droplets.forEach((o,i)=>{
   const a=i*Math.PI/4+.2,phase=(time*1.5+i*.137)%1,r=.35+.28*opening,raise=state==='reform'?phase:1-phase;
   o.visible=!dead&&['disrupted','reform'].includes(state);o.position.set(Math.cos(a)*r,.06+raise*.65*opening,Math.sin(a)*r*.8);o.scale.set(.035,.04+opening*.045,.035);
  });
  if(dead||m.cancelled)s.holes.length=0;
  group.updateMatrixWorld(true);syncHoles(group,dead||m.cancelled?{metal:{holes:[]}}:enemy,time);group.updateMatrixWorld(true);return group;
 }
 function hit(group,event,worldTime){
  const s=group.userData.silt,time=finite(worldTime,s.lastTime),accepted=ingest(group,event,time);
  syncHoles(group,group.userData.enemy,time);group.updateMatrixWorld(true);return accepted;
 }
 return {create,update,hit,MAX_HOLES,HOLE_LIFETIME};
});
