// Dubai-specific architecture: authored silhouettes and recessed facade detail.
export const TAU=Math.PI*2;
export function mesh(W,geometry,material,parent){const m=new W.THREE.Mesh(W.own(geometry),W.own(material));m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function cylinder(W,r,h,color,x,y,z,g,n=24){return W.cylinder(r,h,color,x,y,z,g,n);}
export function burjKhalifa(W,x,z){
 const g=W.group(x,.13,z);g.name='burj-khalifa';
 // Three buttressed wings step back independently around a central core.
 cylinder(W,.91,.16,'#cec7b1',0,.08,0,g,36);cylinder(W,.76,.12,'#afa891',0,.22,0,g,36);
 for(let tier=0;tier<15;tier++){
  const y=.28+tier*.64,h=.67,r=.43*(1-tier/18);
  cylinder(W,r,h,tier%2?'#41636a':'#36575f',0,y+h/2,0,g,24);
  for(let wing=0;wing<3;wing++){
   const a=wing*TAU/3+.3,reach=Math.max(.07,.43-tier*.028-(wing%2)*.025);
   const cx=Math.cos(a)*reach,cz=Math.sin(a)*reach,wr=Math.max(.055,r*.65);
   cylinder(W,wr,h,'#466b72',cx,y+h/2,cz,g,16);
   for(let floor=0;floor<7;floor++)cylinder(W,wr+.012,.014,'#c2c5b9',cx,y+floor*.088+.045,cz,g,16);
   for(let fin=0;fin<8;fin++){const q=fin*TAU/8;W.box(.014,h,.014,'#b6c1bb',cx+Math.cos(q)*wr,y+h/2,cz+Math.sin(q)*wr,g);}
  }
  for(let floor=0;floor<7;floor++)cylinder(W,r+.013,.014,'#acbdb8',0,y+floor*.088+.045,0,g,24);
 }
 cylinder(W,.105,1.15,'#9cafa8',0,10.45,0,g,16);cylinder(W,.067,.8,'#a9b6ab',0,11.35,0,g,12);cylinder(W,.027,1.05,'#d3d1bc',0,12.22,0,g,8);
 for(let i=0;i<3;i++){const a=i*TAU/3+.3;W.box(.35,.18,.7,'#d8d1bc',Math.cos(a)*.7,.2,Math.sin(a)*.7,g).rotation.y=-a;}
 return g;
}
export function sailHotel(W,x,z){
 const T=W.THREE,g=W.group(x,.14,z);g.name='burj-al-arab';
 cylinder(W,1.12,.16,'#bdbca2',0,.08,0,g,48);cylinder(W,1.02,.035,'#ded4b8',0,.18,0,g,48);
 // Curving sail surface with a visibly concave edge, not a wedge box.
 const shape=new T.Shape();shape.moveTo(-.36,.2);shape.lineTo(-.36,5.15);shape.bezierCurveTo(.35,4.78,1.1,2.1,.49,.27);shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth:.5,bevelEnabled:false,steps:1,curveSegments:28});const sail=mesh(W,geo,new T.MeshStandardMaterial({color:'#e8e5d6',roughness:.55}),g);sail.position.z=-.25;
 const glass=new T.Shape();glass.moveTo(-.27,.35);glass.lineTo(-.27,4.77);glass.bezierCurveTo(.18,4.2,.64,1.65,.34,.35);glass.closePath();
 for(const side of [-1,1]){const m=mesh(W,new T.ShapeGeometry(glass,24),new T.MeshStandardMaterial({color:'#38666d',metalness:.28,roughness:.25,side:T.DoubleSide}),g);m.position.z=side*.256;}
 for(let f=0;f<28;f++){const y=.4+f*.149,width=.6*Math.sin(Math.PI*(y/5.3))+.18;for(const side of [-1,1])W.line([[-.28,y,side*.27],[-.28+width,y,side*.27]],'#d3d8c9',.012,g);}
 const spine=[[-.44,.2,0],[-.44,5.62,0]];W.line(spine,'#f0ebd6',.036,g);
 const curve=Array.from({length:40},(_,i)=>{const t=i/39;return[-.36+1.35*Math.sin(t*Math.PI*.86),5.15*(1-t)+.25,.31];});
 W.line(curve,'#f4edd7',.045,g);W.line(curve.map(([a,b])=>[a,b,-.31]),'#f4edd7',.045,g);
 for(const side of [-1,1])W.line([[-.43,.3,side*.31],[.78,2.4,side*.31],[-.42,4.95,side*.31]],'#d1d8cf',.027,g);
 cylinder(W,.39,.065,'#bdc6b4',-.55,4.15,0,g,28);W.box(.7,.06,.28,'#afbcad',-.35,4.1,0,g);
 W.line([[0,.19,.95],[.25,.19,1.45],[.8,.19,1.7]],'#d4c6a4',.12,g);
 return g;
}
export function palmIsland(W,x,z){
 const g=W.group(x,.035,z);g.name='palm-jumeirah';
 W.box(.25,.08,3.6,'#d1bf93',0,.02,.2,g);
 for(let side of [-1,1])for(let row=0;row<8;row++){
  const zz=-1.3+row*.39,span=2.35*Math.sqrt(Math.max(.1,1-Math.pow((zz+.15)/2.6,2)));
  const points=Array.from({length:15},(_,i)=>{const t=i/14;return[side*span*t,.03,zz+.5*t*t];});W.line(points,'#d8c79b',.095,g);
  for(let house=1;house<6;house++){const t=house/6;for(const dz of [-.12,.12]){const variant=(house+row*3+(side+1))%4,height=.065+variant*.012;W.box(.115,height,.085,['#e3d3b0','#c7b690','#d1c4a1','#e9d9b9'][variant],side*span*t,.065+height/2,zz+.5*t*t+dz,g);W.box(.125,.016,.095,variant%2?'#ae9b79':'#d5c19b',side*span*t,.075+height,zz+.5*t*t+dz,g);if(variant===1)W.box(.05,.025,.045,'#c2b397',side*span*t,.1+height,zz+.5*t*t+dz,g);W.box(.06,.018,.065,'#708360',side*span*(t-.055),.078,zz+.5*t*t+dz,g);}}
 }
 const crescent=Array.from({length:81},(_,i)=>{const a=.12+i/80*(TAU-.24);return[Math.sin(a)*2.8,.025,-Math.cos(a)*2.65];});W.line(crescent,'#d4c39c',.14,g);
 // Atlantis palace along the outer crescent.
 const hotel=W.group(0,.08,-2.55,g);W.box(1.3,.3,.24,'#c2aa85',0,.16,0,hotel);
 for(const xx of [-.57,-.28,0,.28,.57]){W.box(.14,.55,.3,'#cbb38c',xx,.3,0,hotel);const roof=cylinder(W,.13,.18,'#8b9b8e',xx,.66,0,hotel,4);roof.rotation.y=Math.PI/4;}
 return g;
}
export function skyline(W){
 const T=W.THREE,g=W.group();g.name='dubai-skyline';
 const sites=[[2.1,-3.8,6.7,.63,0],[3.35,-4.5,7.7,.65,1],[4.65,-3.9,6.6,.67,2],[5.65,-2.8,5.8,.6,0],[3.6,-1.8,5.1,.66,3],[5.7,-.5,3.6,.55,2],[1.65,-5.6,4.2,.5,1],[6.5,-4.5,4.4,.5,0]];
 for(const [x,z,h,w,kind] of sites){
  const tower=W.group(x,.13,z,g);W.box(w*1.7,.18,w*1.5,'#c1b79e',0,.09,0,tower);
  W.box(w,h,w*.85,['#355b64','#4c6e75','#49646a','#719392'][kind],0,h/2,0,tower);
  for(let floor=.2;floor<h;floor+=.15+kind*.013)W.box(w+.025,.012,w*.85+.025,['#93a9a5','#aabbb2','#879e9a','#b3b9a8'][kind],0,floor,0,tower);
  for(let fin=0;fin<6;fin++)for(const side of [-1,1]){W.box(.025,h+.08,.035,'#c4c7b7',-w/2+fin*w/5,h/2,side*w*.44,tower);W.box(.035,h+.08,.025,'#bdc3b5',side*w*.52,h/2,-w*.4+fin*w*.16,tower);}
  if(kind===1||kind===2){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,.85);shape.lineTo(w/2,0);shape.closePath();const roof=mesh(W,new T.ExtrudeGeometry(shape,{depth:w*.85,bevelEnabled:false}),new T.MeshStandardMaterial({color:'#51747b',metalness:.2,roughness:.4}),tower);roof.position.set(0,h,-w*.425);W.line([[-w/2,h,-w*.45],[0,h+.87,-w*.45],[w/2,h,-w*.45]],'#c8cebd',.028,tower);}
  else{W.box(w*.7,.34,w*.65,'#bdc1ad',0,h+.17,0,tower);W.box(w*.4,.25,w*.4,'#496c70',0,h+.46,0,tower);}
  cylinder(W,.018,.65,'#c3c8b8',0,h+.8,0,tower,6);
 }
 return g;
}
export function frame(W,x,z){const g=W.group(x,.14,z);g.name='dubai-frame';for(const side of [-1,1])W.box(.19,3.7,.2,'#be973d',side*.95,1.85,0,g);W.box(2.1,.25,.2,'#d6b260',0,3.65,0,g);W.box(2.3,.14,.7,'#c3b18a',0,.07,0,g);for(let i=0;i<23;i++)for(const side of [-1,1]){const ring=W.ring(.065,'#ead08a',side*.95,.22+i*.145,.11,g,.009);ring.rotation.x=Math.PI/2;}return g;}
export function mall(W,x,z){
 const g=W.group(x,.14,z);g.name='dubai-mall';
 W.box(3.7,.52,2.3,'#aa9d7f',0,.26,0,g);W.box(3.78,.08,2.38,'#d9cfb1',0,.55,0,g);
 for(let i=0;i<6;i++){const xx=-1.6+i*.63;W.box(.48,.28,.25,'#48665f',xx,.3,1.16,g);W.box(.06,.42,.34,'#d7c8a6',xx-.28,.25,1.19,g);}
 for(let i=0;i<5;i++){const xx=-1.4+i*.7;cylinder(W,.46,.62,'#b1a183',xx,.31,-1.05,g,28);cylinder(W,.48,.07,'#d5c6a7',xx,.66,-1.05,g,28);cylinder(W,.31,.04,'#a9b1a0',xx,.715,-1.05,g,28);for(let k=0;k<12;k++){const a=k*TAU/12;W.box(.035,.3,.035,'#d7c8a7',xx+Math.sin(a)*.43,.31,-1.05+Math.cos(a)*.43,g);}}
 for(let i=0;i<9;i++)W.box(.25,.08,.27,'#a6a796',-1.5+(i%3)*1.25,.64,-.65+Math.floor(i/3)*.65,g);
 return g;
}

export function finishArchitecture(W,root){
 const glass=new Set(['36575f','41636a','466b72','355b64','4c6e75','49646a','719392','51747b','38666d','496c70']);
 const cache=new Map();root.traverse(o=>{if(!o.isMesh||!o.material?.color)return;const hex=o.material.color.getHexString();if(!glass.has(hex))return;
 const key=hex+':'+o.material.side;if(!cache.has(key)){const mat=W.own(new W.THREE.MeshStandardMaterial({color:`#${hex}`,roughness:.23,metalness:.42,side:o.material.side}));mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 facadePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacadePosition=position;');shader.fragmentShader='varying vec3 facadePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat reflectionBand=smoothstep(-.5,.8,facadePosition.y);\ndiffuseColor.rgb*=.77+.26*reflectionBand;\ndiffuseColor.rgb+=vec3(.035,.055,.06)*pow(max(0.,sin(facadePosition.x*8.+facadePosition.y*.7)),8.);');};cache.set(key,mat);}o.material=cache.get(key);
 });
}
