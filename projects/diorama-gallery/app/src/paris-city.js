import {footprint,overlaps,polygonOverlapsRect,planParisRoads,planParisBridges} from './paris-layout.js';
const TAU=Math.PI*2;
function mesh(W,g,m,parent){const o=new W.THREE.Mesh(W.own(g),m);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
export function luminous(W,color='#ffcc78',intensity=1.4){const m=W.own(new W.THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.45}));m.userData.nightIntensity=intensity;return m;}
function solid(W,points,depth,color,y,parent){const T=W.THREE,s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);const o=mesh(W,g,W.own(new T.MeshStandardMaterial({color,roughness:.95})),parent);o.position.y=y;return o;}
function ribbon(points,width){const sides=[[],[]];for(let i=0;i<points.length;i++){const p=points[Math.max(0,i-1)],q=points[Math.min(points.length-1,i+1)],dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);for(let j=0;j<2;j++){const sign=j?1:-1;sides[j].push([points[i][0]-sign*dz/len*width/2,points[i][1]+sign*dx/len*width/2]);}}return[...sides[0],...sides[1].reverse()];}
export const SEINE_POINTS=[[-8,-2.5],[-5,-2.4],[-3,-1],[-2,1],[0,1.8],[2,2.6],[4.4,1.8],[5,4],[5.3,8]];
function smoothPath(points){const out=[];for(let i=0;i<points.length-1;i++){const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];for(let j=0;j<24;j++){const t=j/24,t2=t*t,t3=t2*t;out.push([0,1].map(k=>(2*t3-3*t2+1)*b[k]+(t3-2*t2+t)*.5*(c[k]-a[k])+(-2*t3+3*t2)*c[k]+(t3-t2)*.5*(d[k]-b[k])));}}out.push(points.at(-1));return out;}
const centerline=smoothPath(SEINE_POINTS),branchline=smoothPath([[-4,-2],[0,-3.05],[2.2,-1.6],[2.8,.6],[2,2.6]]),lengths=[],cumulative=[0];
let riverLength=0;for(let i=1;i<centerline.length;i++){const a=centerline[i-1],b=centerline[i],d=Math.hypot(b[0]-a[0],b[1]-a[1]);lengths.push(d);riverLength+=d;cumulative.push(riverLength);}
const tangents=centerline.map((p,i)=>{const a=centerline[Math.max(0,i-1)],b=centerline[Math.min(centerline.length-1,i+1)];return Math.atan2(b[0]-a[0],b[1]-a[1]);});
export function riverPose(u,target={}){const d=(((u%1)+1)%1)*riverLength;let i=0;while(i<lengths.length-1&&d>cumulative[i+1])i++;const f=(d-cumulative[i])/lengths[i],a=centerline[i],b=centerline[i+1],angle=Math.atan2(Math.sin(tangents[i+1]-tangents[i]),Math.cos(tangents[i+1]-tangents[i]));target.x=a[0]+(b[0]-a[0])*f;target.z=a[1]+(b[1]-a[1])*f;target.yaw=tangents[i]+angle*f;return target;}

export function buildParisGround(W,{architecture=[]}={}){
 const T=W.THREE,base=W.group();base.name='paris-stone-plinth';W.box(16.1,.28,16.1,'#9a9c97',0,-.2,0,base);W.box(16.02,.09,16.02,'#c8c6b8',0,-.015,0,base);W.box(15.96,.07,15.96,'#c9c9b8',0,.065,0,base);
 // Square limestone edge courses and regularly staggered stone joints.
 for(const sign of[-1,1])for(let i=0;i<40;i++){const x=-7.8+i*.4;W.box(.014,.12,.015,'#777d79',x,-.14,sign*8.056,base);W.box(.015,.12,.014,'#777d79',sign*8.056,-.14,x,base);}for(const y of[-.26,-.12]){W.box(16.12,.015,16.12,'#777d79',0,y,0,base);}
 const river=W.group();river.name='seine-river';const water=W.own(new T.MeshStandardMaterial({color:'#4a9caa',roughness:.26,metalness:.25}));water.name='seine-water';
 const channels=[centerline,branchline];
 for(const [index,points]of channels.entries()){
 solid(W,ribbon(points,index?1.35:1.9),.035,'#a7b6af',.113,river);const shape=new T.Shape();ribbon(points,index?1.13:1.66).forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geo=new T.ShapeGeometry(shape,32);geo.rotateX(-Math.PI/2);const surface=mesh(W,geo,water,river);surface.position.y=.153+index*.003;surface.castShadow=false;
 const [left,right]=[[],[]];const polygon=ribbon(points,index?1.42:1.97);left.push(...polygon.slice(0,points.length));right.push(...polygon.slice(points.length).reverse());for(const side of[left,right]){const q=W.line(side.map(([x,z])=>[x,.20,z]),'#ded8c5',.07,river);q.name='seine-quay';for(let k=1;k<side.length;k++){const a=side[k-1],b=side[k],distance=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(distance/.22);for(let j=0;j<n;j++){const t=j/n;W.box(.027,.095,.03,'#939e99',a[0]+(b[0]-a[0])*t,.15,a[1]+(b[1]-a[1])*t,river);}}}
 }
 // Island apron under Notre-Dame and low manicured lawns.
 const island=W.group();island.name='cite-island';solid(W,[[-1.8,-2.25],[.6,-2.2],[1.7,-.9],[1.9,.6],[.6,1.3],[-1.3,.8],[-2.1,-.2]],.12,'#ded8c2',.12,island);
 const aprons=[];for(const[x,z,w,d]of[[-4.6,.3,3.5,3.5],[-1.2,5.05,5.3,3.5],[2.6,5.9,3.2,3.4],[3.3,-5.7,5.4,4.6]])aprons.push(W.box(w,.045,d,'#d8d5c8',x,x===-1.2?.1675:.15,z));
 const architectureRects=architecture.map(o=>{o.updateMatrixWorld(true);return footprint(new T.Box3().setFromObject(o));}),waterPolygons=channels.map((points,i)=>ribbon(points,i?1.14:1.68));
 const roadPlan=planParisRoads([...architectureRects,{x0:.54,x1:6.06,z0:-8.04,z1:-3.36}],waterPolygons),roads=W.group();roads.name='paris-boulevards';
 for(const{x,z,w,d}of roadPlan){const surface=W.box(w,.025,d,'#8b9396',x,.2,z,roads);surface.name='paris-road-surface';const horizontal=w>d,length=horizontal?w:d;for(let at=.22;at<length-.16;at+=.55)W.box(horizontal?.15:.02,.005,horizontal?.02:.15,'#e4dfc9',x+(horizontal?-w/2+at:0),.216,z+(horizontal?0:-d/2+at),roads);}

 // Sacré-Cœur is grounded on broad, stepped Montmartre terraces.
 const hill=W.group();hill.name='montmartre-hill';
 function terrace(w,d,r,cx,cz){const points=[];for(let corner=0;corner<4;corner++){const sx=corner===0||corner===3?1:-1,sz=corner<2?1:-1;const ax=cx+sx*(w/2-r),az=cz+sz*(d/2-r);for(let j=0;j<=10;j++){const angle=corner*Math.PI/2+j*Math.PI/20;points.push([ax+Math.cos(angle)*r,az+Math.sin(angle)*r]);}}return points;}
 // Broad rounded lawns rise around the white basilica, rather than a tiny hidden pedestal.
 for(let i=0;i<8;i++){const w=5.4-i*.28,d=4.6-i*.27,y=.17+i*.19;solid(W,terrace(w+.06,d+.06,.45,3.3,-5.7),.18,'#c6c7a7',y,hill);solid(W,terrace(w-.03,d-.03,.42,3.3,-5.7),.025,i%2?'#7e9955':'#6d8c43',y+.18,hill);}
 for(let i=0;i<24;i++){const h=.14+i*.066;W.box(.82,h,.09,'#d7d0b6',3.3,.1+h/2,-2.85-i*.075,hill);}
 for(const side of[-1,1])for(let i=0;i<16;i++){const z=-3.5-i*.18,x=3.3+side*(1.9-i*.045);W.box(.055,.10,.08,'#d3d1b9',x,.34+i*.065,z,hill);}
 const bridges=W.group();bridges.name='paris-bridges';for(const pose of planParisBridges(riverPose,architectureRects,waterPolygons))bridge(W,pose.x,pose.z,pose.yaw,pose.length,bridges);bridge(W,2.4,-1.3,Math.atan2(.6,2.2)+Math.PI/2,1.9,bridges);
 // Low-frequency water motion stays in the standard shader.
 water.onBeforeCompile=shader=>{water.userData.shader=shader;shader.uniforms.parisTime={value:water.userData.time??0};shader.vertexShader='uniform float parisTime; varying vec3 riverPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nriverPosition=position; transformed.y+=.007*sin(position.x*8.+position.z*7.+parisTime*.8);');shader.fragmentShader='varying vec3 riverPosition; uniform float parisTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat ripple=sin(riverPosition.x*34.+sin(riverPosition.z*9.)+parisTime*1.2)*sin(riverPosition.z*21.-parisTime); diffuseColor.rgb*=.95+ripple*.045;');};
 const supports=[];for(const root of[base,river,island,roads,hill,bridges,...aprons]){root.updateMatrixWorld(true);root.traverse(o=>{if(o.isMesh&&o.material!==water)supports.push(o);});}const groundRay=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));function groundHeight(x,z){groundRay.ray.origin.set(x,8,z);return groundRay.intersectObjects(supports,false)[0]?.point.y??.1;}
 const roadRects=roadPlan.map(({x,z,w,d})=>({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2}));bridges.updateMatrixWorld(true);const bridgeRects=bridges.children.map(o=>footprint(new T.Box3().setFromObject(o)));
 function canPlant(x,z,r=.34){if(Math.abs(x)+r>7.96||Math.abs(z)+r>7.96)return false;const rect={x0:x-r,x1:x+r,z0:z-r,z1:z+r};if([...roadRects,...bridgeRects,...architectureRects].some(o=>overlaps(rect,o,.02))||waterPolygons.some(poly=>polygonOverlapsRect(poly,rect)))return false;const y=groundHeight(x,z);for(const dx of[-.13,.13])for(const dz of[-.13,.13])if(Math.abs(groundHeight(x+dx,z+dz)-y)>.20)return false;return true;}
 return{water,river,roads,groundHeight,canPlant,roadRects,architectureRects,waterPolygons};
}
function bridge(W,x,z,yaw,length,parent){const root=W.group(x,0,z,parent);root.rotation.y=yaw;const T=W.THREE,outline=new T.Shape();outline.moveTo(-length/2,.145);outline.lineTo(length/2,.145);outline.lineTo(length/2,.55);outline.lineTo(-length/2,.55);outline.closePath();const opening=new T.Path();opening.moveTo(-(length-.35)/2,.146);opening.lineTo(-(length-.35)/2,.15);opening.absellipse(0,.15,(length-.35)/2,.24,Math.PI,0,true);opening.lineTo((length-.35)/2,.146);opening.closePath();outline.holes.push(opening);const archGeometry=W.own(new T.ExtrudeGeometry(outline,{depth:.04,bevelEnabled:false,curveSegments:16})),archMaterial=W.own(new T.MeshStandardMaterial({color:'#c7c6b8',roughness:.88}));for(const side of[-1,1]){const a=new T.Mesh(archGeometry,archMaterial);a.name='bridge-arch';a.position.x=side*.49;a.rotation.y=Math.PI/2;a.castShadow=a.receiveShadow=true;root.add(a);}W.box(1.0,.16,length,'#c7c6b8',0,.45,0,root);W.box(.72,.025,length+.1,'#939b9f',0,.543,0,root);for(const side of[-1,1]){W.box(.085,.13,length+.1,'#e6ddca',side*.49,.58,0,root);for(let i=0;i<8;i++)W.box(.065,.16,.06,'#b8b8a9',side*.49,.59,-length/2+i*length/7,root);}for(const q of[-1,1])W.box(.95,.3,.14,'#b0b2a5',0,.26,q*(length/2-.12),root);}
function mansard(W,w,d,color,root,height,rise=.43,cache=new Map(),profile='mansard'){
 const T=W.THREE,key=`roof-geometry-${profile}`;let geometry=cache.get(key);
 if(!geometry){
  const verts=[],indices=[],levels=profile==='pavilion'?[[0,.5,.5],[.68,.34,.34],[1,.06,.06]]:profile==='ridge'?[[0,.5,.5],[.35,.45,.39],[1,.32,.035]]:[[0,.5,.5],[.72,.38,.38],[1,.31,.12]];
  for(const[y,wx,dz]of levels)verts.push(-wx,y,-dz,wx,y,-dz,wx,y,dz,-wx,y,dz);
  for(let level=0;level<2;level++)for(let side=0;side<4;side++){const a=level*4+side,b=level*4+(side+1)%4,c=b+4,d=a+4;indices.push(a,d,c,a,c,b);}indices.push(8,11,10,8,10,9);
  geometry=W.own(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();cache.set(key,geometry);
 }
 const materialKey=`roof-material-${color}`;let material=cache.get(materialKey);if(!material){material=W.own(new T.MeshStandardMaterial({color,roughness:.78}));material.userData.snowSurface=true;cache.set(materialKey,material);}
 const roof=new T.Mesh(geometry,material);roof.name=`roof-${profile}`;roof.castShadow=roof.receiveShadow=true;roof.position.y=height;roof.scale.set(Math.max(w,d),rise,Math.min(w,d));if(d>w)roof.rotation.y=Math.PI/2;root.add(roof);return roof;
}
function dormerPediment(W,parent,w,d,y,color,cache){
 const T=W.THREE,key=[w,d,color].join('/');let resources=cache.get(key);
 if(!resources){const geometry=W.own(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,0,.10,-d/2,-w/2,0,d/2,w/2,0,d/2,0,.10,d/2],3));geometry.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4]);geometry.computeVertexNormals();resources={geometry,material:W.own(new T.MeshStandardMaterial({color,roughness:.8}))};cache.set(key,resources);}
 const roof=new T.Mesh(resources.geometry,resources.material);roof.castShadow=roof.receiveShadow=true;roof.position.y=y;parent.add(roof);
}
function windowPediment(W,parent,kind,cache){
 const T=W.THREE,key=`window-${kind}`;let resources=cache.get(key);
 if(!resources){
  const shape=new T.Shape();shape.moveTo(-.5,0);shape.lineTo(.5,0);
  if(kind==='triangle')shape.lineTo(0,.25);else shape.quadraticCurveTo(0,.5,-.5,0);
  shape.closePath();const geometry=W.own(new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:8}));geometry.translate(0,0,-.5);
  const material=cache.get('window-crown-material')??W.own(new T.MeshStandardMaterial({color:'#e9dfc4',roughness:.8}));cache.set('window-crown-material',material);resources={geometry,material};cache.set(key,resources);
 }
 const crown=new T.Mesh(resources.geometry,resources.material);crown.name=`window-pediment-${kind}`;crown.castShadow=crown.receiveShadow=true;crown.scale.set(.24,.24,.055);parent.add(crown);return crown;
}
function shapedWindow(W,parent,kind,width,height,depth,material,cache){
 const T=W.THREE,key=`glazing-shape-${kind}`;let geometry=cache.get(key);
 if(!geometry){const shape=new T.Shape();if(kind==='round'){shape.absellipse(0,0,.5,.5,0,TAU,false);}else{shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,0);shape.absellipse(0,0,.5,.5,0,Math.PI,false);shape.lineTo(-.5,-.5);}shape.closePath();geometry=W.own(new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:12}));geometry.translate(0,0,-.5);cache.set(key,geometry);}
 const pane=new T.Mesh(geometry,material);pane.scale.set(width,height,depth);pane.castShadow=pane.receiveShadow=true;parent.add(pane);return pane;
}
export function buildParisDistrict(W){
 const resources=new Map(),root=W.group();root.name='haussmann-district';const windowMaterial=luminous(W,'#ffc77d',1.65),dark=W.own(new W.THREE.MeshStandardMaterial({color:'#34464d',roughness:.3})),trim=W.own(new W.THREE.MeshStandardMaterial({color:'#e9dfc4',roughness:.8}));
 windowMaterial.color.set('#536261');
 const blocks=[[-5.35,5.5,2.35,1.5,1.75],[-5.25,3.55,2.5,1.55,1.8],[-5.4,7.0,2.2,.75,1.5],[-3.7,7.2,1.1,1.35,1.05],[-1.1,7.3,2.5,1.2,1.5],[7.15,7.1,1.25,1.45,1.65],[-5.8,-5.2,2.1,1.8,1.9],[-3.4,-5.2,2.1,1.8,2.1],[-1.0,-5.5,1.9,1.6,2.2],[6.9,-5.5,1.2,2.4,1.8],[6.1,-2.1,1.45,2.5,2.0],[6.2,.8,1.5,2.4,2.15],[6.9,4.8,1.3,2.6,1.9],[-7.65,3.8,.6,3.2,1.35]];
 const stones=['#d3c8aa','#c7bfa7','#e0d6bb','#c6c3b0'],roofs=['#62778b','#72808b','#586e83','#7f8991'];
 const styles=[
  {bay:.33,pw:.135,ph:.235,balcony:'continuous',dormer:'gable'},
  {bay:.40,pw:.18,ph:.29,balcony:'individual',dormer:'round'},
  {bay:.31,pw:.115,ph:.26,balcony:'alternating',dormer:'shed'},
  {bay:.43,pw:.19,ph:.31,balcony:'individual',dormer:'round',arched:true},
  {bay:.35,pw:.15,ph:.215,balcony:'continuous',dormer:'gable',arched:true},
 ];
 for(const[index,[x,z,w,d,h]]of blocks.entries()){
  const g=W.group(x,.22,z,root);g.name=`haussmann-block-${index}`;W.box(w,.15,d,'#aaa99a',0,-.06,0,g);
  // Keep the complete architectural envelope inside its original block. Wall
  // planes are inset to reserve real space for balconies, shops and cornices.
  const bw=w-.22,bd=d-.22,units=[],courtyard=[0,6,7].includes(index),row=[2,4,13].includes(index),corner=[3,5,8].includes(index),arcade=[9,11].includes(index);
  function unit(ux,uz,uw,ud,uh,style,profile='mansard',sides=['front','right','back','left']){units.push({x:ux,z:uz,w:uw,d:ud,h:uh,style,profile,sides});}
  if(courtyard){
   const wing=.34,insideD=bd-2*wing;
   unit(0,(bd-wing)/2,bw,wing,h*.95,index%5,'mansard',['front','back']);
   unit(0,-(bd-wing)/2,bw,wing,h*1.04,(index+1)%5,'ridge',['front','back']);
   unit(-(bw-wing)/2,0,wing,insideD,h*.86,2,'mansard',['left','right']);
   unit((bw-wing)/2,0,wing,insideD,h*1.10,3,'pavilion',['left','right']);
   W.box(bw-2*wing,.025,insideD,'#b7b2a2',0,.02,0,g);
  }else if(row){
   const alongX=bw>bd,span=alongX?bw:bd;
   for(let j=0;j<3;j++){const length=span/3,offset=-span/2+length*(j+.5);unit(alongX?offset:0,alongX?0:offset,alongX?length:bw,alongX?bd:length,h*[.80,1.08,.91][j],(j+index)%5,['ridge','mansard','pavilion'][j]);}
  }else if(corner){
   const alongX=bw>bd,span=alongX?bw:bd;
   for(let j=0;j<2;j++){const length=span*[.43,.57][j],offset=j===0?-span/2+length/2:span/2-length/2;unit(alongX?offset:0,alongX?0:offset,alongX?length:bw,alongX?bd:length,j===0?h+.24:h*.84,j===0?3:1,j===0?'pavilion':'mansard');}
  }else{
   const alongX=bw>bd,span=alongX?bw:bd;let cursor=-span/2;
   for(let j=0;j<3;j++){const length=span*[.24,.52,.24][j],offset=cursor+length/2;cursor+=length;unit(alongX?offset:0,alongX?0:offset,alongX?length:bw,alongX?bd:length,h*(arcade?[.86,1.03,.91]:[1.02,.90,1.08])[j],arcade?4:j===1?0:1,arcade?'ridge':j===1?'mansard':'pavilion');}
  }
  for(const[part,u]of units.entries()){
   const b=W.group(u.x,0,u.z,g),style=styles[u.style],stone=stones[(index+(row?part:0))%4],rise=u.profile==='pavilion'?.58:u.profile==='ridge'?.31:.43;
   b.name=`building-volume-${index}-${part}`;
   const mass=W.box(u.w,u.h,u.d,stone,0,u.h/2,0,b);mass.name='building-mass';
   W.box(u.w+.04,.065,u.d+.04,'#e8dfc7',0,u.h+.015,0,b);W.box(u.w+.04,.10,u.d+.04,'#a8a99c',0,.07,0,b);
   mansard(W,u.w+.04,u.d+.04,roofs[(index+part)%4],b,u.h+.05,rise,resources,u.profile);
   const floors=Math.min(5,Math.max(2,Math.floor(u.h/.43))),floorRise=(u.h-.57)/(floors-1),paneH=Math.min(style.ph,floorRise-.105);
   for(let floor=1;floor<floors;floor++)W.box(u.w+.025,.025,u.d+.025,'#e9dfc3',0,.29+floor*floorRise-paneH/2-.04,0,b);
   for(const side of u.sides){
    const horizontal=side==='front'||side==='back',span=horizontal?u.w:u.d,face=W.group(side==='right'?u.w/2:side==='left'?-u.w/2:0,0,side==='front'?u.d/2:side==='back'?-u.d/2:0,b);
    face.rotation.y={front:0,right:Math.PI/2,back:Math.PI,left:-Math.PI/2}[side];
    function detail(name,width,height,depth,color,a,y,outset=.015){const box=W.box(width,height,depth,color,a,y,outset,face);box.name=name;return box;}
    const shops=side==='front'||side==='right'&&index%3===0;
    for(let y=.16;y<u.h-.07;y+=.15)detail('facade-stone-course',span,.007,.012,'#b7ad94',0,y,.006);
    for(let q=0,y=.16;y<u.h-.08;q++,y+=.14)for(const end of[-1,1]){const qw=q%2?.07:.105;detail('facade-quoin',qw,.11,.03,'#e9dfc4',end*(span/2-qw/2),y,.015);}
    const teeth=Math.max(6,Math.floor(span/.11));for(let j=0;j<teeth;j++)detail('facade-cornice-dentil',Math.min(.04,span/12),.045,.055,'#e9dfc4',-span/2+.04+j*(span-.08)/(teeth-1),u.h-.04,.018);
    const n=Math.max(1,Math.floor((span-.12)/style.bay)),pw=Math.min(style.pw,span*.42),spacing=n===1?0:(span-.28)/(n-1);
    for(let j=0;j<n;j++){
     const a=n===1?0:-span/2+.14+j*spacing;
     for(let floor=0;floor<floors;floor++){
      if(floor===0&&shops)continue;
      const y=.29+floor*floorRise,arched=style.arched&&(floor===1||floor===2),paneMat=(j+floor+index+part)%5===0?dark:windowMaterial;
      let pane;
      if(arched){const frame=shapedWindow(W,face,'arched',pw+.055,paneH+.055,.026,trim,resources);frame.name='facade-window-arch-surround';frame.position.set(a,y,.018);pane=shapedWindow(W,face,'arched',pw,paneH,.018,paneMat,resources);pane.position.set(a,y,.038);}
      else{detail('facade-window-surround',pw+.05,paneH+.05,.025,'#e9dfc4',a,y,.014);pane=detail('facade-window-pane-rectangular',pw,paneH,.018,'#ffcc88',a,y,.037);pane.material=paneMat;}
      pane.name=`facade-window-pane-${arched?'arched':'rectangular'}`;
      detail('facade-window-mullion',.009,paneH-.015,.012,'#b7ad94',a,y-.006,.051);detail('facade-window-transom',pw,.009,.012,'#b7ad94',a,y+.025,.051);
      detail('facade-window-sill',pw+.075,.023,.07,'#e9dfc4',a,y-paneH/2-.03,.023);
      if(floor===1){const crown=windowPediment(W,face,(j+part+index)%2?'triangle':'segmental',resources);crown.scale.set(pw+.09,.19,.045);crown.position.set(a,y+paneH/2+.034,.029);}
      else if(floor>0)detail('facade-window-lintel',pw+.07,.023,.042,'#e9dfc4',a,y+paneH/2+.032,.024);
      if(style.balcony!=='continuous'&&(style.balcony==='alternating'?(floor===1&&(j+part)%2===0):(floor===1||floor===floors-1))){
       const width=pw+.075;detail('facade-balcony-slab',width,.022,.11,'#8c9290',a,y-paneH/2-.035,.037);detail('facade-balcony-rail',width,.016,.016,'#424d4d',a,y-.035,.087);for(let k=-1;k<=1;k++)detail('facade-balcony-upright',.01,.095,.01,'#424d4d',a+k*width*.35,y-.075,.087);
      }
     }
     if((j+part)%2===0){
      const dormer=W.group(a,0,-.04,face);dormer.name=`dormer-${style.dormer}`;
      if(style.dormer==='round'){const frame=shapedWindow(W,dormer,'round',.185,.20,.10,trim,resources);frame.position.y=u.h+.21;const pane=shapedWindow(W,dormer,'round',.112,.128,.018,windowMaterial,resources);pane.name='dormer-glass-round';pane.position.set(0,u.h+.21,.055);}
      else{W.box(.17,.20,.12,'#d7d1bd',0,u.h+.18,0,dormer);const pane=W.box(.105,.13,.018,'#ffcc88',0,u.h+.19,.066,dormer);pane.material=windowMaterial;pane.name=`dormer-glass-${style.dormer}`;if(style.dormer==='gable')dormerPediment(W,dormer,.21,.16,u.h+.28,'#c6c9c1',resources);else{const cap=W.box(.21,.025,.16,'#c6c9c1',0,u.h+.29,0,dormer);cap.rotation.x=-.18;}}
     }
    }
    if(style.balcony==='continuous')for(const floor of[1,floors-1]){
     if(floor===1&&floors===2)continue;
     const y=.29+floor*floorRise;detail('facade-balcony-slab',span-.045,.025,.105,'#8c9290',0,y-paneH/2-.035,.038);detail('facade-balcony-rail',span-.045,.018,.017,'#424d4d',0,y-.035,.087);const count=Math.max(3,Math.floor(span/.085));for(let k=0;k<count;k++)detail('facade-balcony-upright',.01,.095,.01,'#424d4d',-span/2+.04+k*(span-.08)/(count-1),y-.075,.087);
    }
    if(shops){const count=Math.max(1,Math.floor(span/.60)),sw=Math.min(.49,(span-.07)/count),shopColor=index%3?'#404d45':'#965048';for(let j=0;j<count;j++){
     const a=-span/2+span*(j+.5)/count;detail('storefront-surround',sw,.30,.035,shopColor,a,.27,.018);const glass=detail('storefront-glass',sw-.045,.24,.018,'#ffcc88',a,.27,.042);glass.material=(j+index)%3?windowMaterial:dark;
     for(const dx of[-.5,0,.5])detail('storefront-mullion',.012,.25,.015,shopColor,a+dx*(sw-.045),.27,.057);
     detail('storefront-transom',sw-.04,.015,.015,shopColor,a,.32,.057);detail('storefront-sign',sw+.012,.05,.045,shopColor,a,.446,.025);detail('storefront-sign-trim',sw-.06,.007,.012,'#d0bda7',a,.456,.051);
     const canopy=detail('storefront-canopy',sw+.02,.02,.10,shopColor,a,.408,.056);canopy.rotation.x=.12;detail('storefront-canopy-valance',sw+.02,.033,.014,shopColor,a,.39,.101);
    }}
   }
   // Each chimney intersects its own roof instead of floating above a shared
   // block-level roof datum when neighboring townhouses change height.
   const cx=u.w>.9?u.w*.20:0,cz=0,cy=u.h+.05+rise*.78;
   W.box(.08,.27,.10,'#ac9984',cx,cy+.09,cz,b);W.box(.12,.032,.13,'#d0bda7',cx,cy+.24,cz,b);W.cylinder(.022,.085,'#9b7765',cx,cy+.29,cz+.02,b,8);
  }
 }
 return{root,windowMaterial};
}
export function buildParisLife(W,groundHeight=()=>.1,{canPlant}={}){
 const root=W.group();root.name='paris-gardens';const lamp=luminous(W,'#ffe0a0',2.3),foliage=['#a9a342','#cb9b3f','#9a642e','#819644','#b58134'];
 const treePoints=[];for(let i=0;i<12;i++){treePoints.push([-6.1+i*.28,1.95]);treePoints.push([-6.25,-1.5+i*.29]);}for(let i=0;i<11;i++){treePoints.push([1.5+i*.39,-3.1]);treePoints.push([5.4,-6.7+i*.43]);treePoints.push([-2.9+i*.30,6.45]);}for(let i=0;i<15;i++){treePoints.push([7.5,-6.5+i*.82]);if(i<10)treePoints.push([3.8,6.6-i*.34]);}
 treePoints.push([1.3,.6],[.8,.85],[-1.2,.55],[-1.6,-1.6],[-6,2.1],[-2.8,-6.7],[2,-6.5]);
 const planted=[];
 function plantingSite(x,z){const clear=(px,pz)=>(!canPlant||canPlant(px,pz))&&planted.every(([qx,qz])=>Math.hypot(px-qx,pz-qz)>.27);if(clear(x,z))return[x,z];for(let ring=1;ring<=14;ring++)for(let j=0;j<24;j++){const angle=j*TAU/24,px=x+Math.cos(angle)*ring*.17,pz=z+Math.sin(angle)*ring*.17;if(clear(px,pz))return[px,pz];}return null;}
 for(const[i,point]of treePoints.entries()){const site=plantingSite(...point);if(!site)continue;const[x,z]=site;planted.push(site);const g=W.group(x,groundHeight(x,z),z,root);g.name='paris-tree';W.cylinder(.035,.54,'#746346',0,.23,0,g,7);for(let j=0;j<7;j++){const a=j*TAU/7+i*.3;const crown=W.ball(.15,foliage[(i+j)%foliage.length],Math.cos(a)*.12,.54+(j%3)*.085,Math.sin(a)*.12,g);crown.scale.set(.19+(i%3)*.012,.24,.18);}W.cylinder(.13,.23,'#b7b6a2',0,-.10,0,g,12);}
 const streetlamps=W.group();streetlamps.name='paris-streetlamps';for(const[x,z]of[[-6.8,2.3],[-3.2,2.2],[-3.2,5.6],[-2.2,5.7],[1.5,4.7],[3.7,4.8],[3.8,6.9],[1.4,6.9],[-1.3,6.9],[5.9,5.4],[5.95,3.1],[5.95,.0],[5.9,-2.8],[-5.9,-3.65],[-3.6,-3.65],[-1.4,-3.65],[.9,-3.65],[2.3,-3.0]]){W.cylinder(.025,.59,'#404b4d',x,.49,z,streetlamps,8);W.cylinder(.055,.08,'#444d4b',x,.24,z,streetlamps,8);const glow=W.ball(.075,'#ffdda1',x,.83,z,streetlamps);glow.material=lamp;W.cylinder(.095,.035,'#4f5856',x,.91,z,streetlamps,8);}
 const people=W.group();people.name='paris-daily-life';for(let i=0;i<65;i++){const r=1.05+(i%3)*.13,a=i*2.399;const x=i<30?2.6+Math.cos(a)*r:-2.3+((i-30)%7)*.5,z=i<30?5.9+Math.sin(a)*r:5.95+Math.floor((i-30)/7)*.1;const p=W.person(x,z,['#b18159','#607a8d','#c6ba9d','#8f5050'][i%4],'#3c4650',.035);p.root.position.y=.23;people.add(p.root);p.root.rotation.y=a;}
 const boats=[];for(let i=0;i<5;i++){const g=W.group();g.name=`seine-boat-${i}`;const hull=W.box(.18,.075,.48,i%2?'#b29b77':'#e5ddc5',0,.02,0,g);W.box(.15,.07,.36,'#f2e8d0',0,.08,-.02,g);W.box(.12,.035,.25,'#637f88',0,.13,-.03,g);W.box(.14,.02,.30,'#fbecd1',0,.17,-.04,g);boats.push(g);}
 return{root,streetlamps,people,boats};
}
