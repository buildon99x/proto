// Dubai-specific architecture: authored silhouettes and recessed facade detail.
export const TAU=Math.PI*2;
export function mesh(W,geometry,material,parent){const m=new W.THREE.Mesh(W.own(geometry),W.own(material));m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function cylinder(W,r,h,color,x,y,z,g,n=24){return W.cylinder(r,h,color,x,y,z,g,n);}
export function burjKhalifa(W,x,z){
 const g=W.group(x,.13,z);g.name='burj-khalifa';
 // Three buttressed wings step back independently around a central core.
 cylinder(W,.91,.16,'#cec7b1',0,.08,0,g,36);cylinder(W,.76,.12,'#afa891',0,.22,0,g,36);
 for(let tier=0;tier<15;tier++){
  const y=.28+tier*.64,h=.67,r=[.46,.46,.42,.42,.36,.36,.31,.31,.25,.25,.2,.17,.14,.105,.085][tier];
  cylinder(W,r,h,tier%2?'#41636a':'#36575f',0,y+h/2,0,g,20);
  for(let wing=0;wing<3;wing++){
   const a=wing*TAU/3+.3,reach=Math.max(.04,[.47,.47,.41,.37,.37,.31,.27,.27,.21,.17,.17,.12,.09,.06,.04][tier]-(wing%2)*.035);
   const cx=Math.cos(a)*reach,cz=Math.sin(a)*reach,wr=Math.max(.055,r*.65);
   cylinder(W,wr,h,'#466b72',cx,y+h/2,cz,g,12);
   for(let floor=0;floor<7;floor++)cylinder(W,wr+.012,.014,'#c2c5b9',cx,y+floor*.088+.045,cz,g,12);
   for(let fin=0;fin<8;fin++){const q=fin*TAU/8;W.box(.014,h,.014,'#b6c1bb',cx+Math.cos(q)*wr,y+h/2,cz+Math.sin(q)*wr,g);}
  }
  for(let floor=0;floor<7;floor++)cylinder(W,r+.013,.014,'#acbdb8',0,y+floor*.088+.045,0,g,20);
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
 const T=W.THREE,g=W.group(x,.035,z);g.name='palm-jumeirah';g.rotation.y=.12;
 // Flat sandy land ribbons leave open water channels, unlike tubular spokes.
 function ribbon(points,width,color,y,parent){const positions=[],indices=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),w=typeof width==='function'?width(i/(points.length-1)):width;positions.push(points[i][0]-dz/len*w,y,points[i][1]+dx/len*w,points[i][0]+dz/len*w,y,points[i][1]-dx/len*w);if(i<points.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(W,geo,new T.MeshStandardMaterial({color,roughness:.92,side:T.DoubleSide}),parent);}
 const leafPositions=[];for(let i=0;i<7;i++){const a=i*TAU/7;leafPositions.push(0,.25,0,Math.cos(a)*.13,.19,Math.sin(a)*.13,Math.cos(a+.3)*.05,.255,Math.sin(a+.3)*.05);}
 const islandLeafGeometry=W.own(new T.BufferGeometry());islandLeafGeometry.setAttribute('position',new T.Float32BufferAttribute(leafPositions,3));islandLeafGeometry.computeVertexNormals();const islandLeafMaterial=W.own(new T.MeshStandardMaterial({color:'#57714a',side:T.DoubleSide,roughness:1}));
 function tinyPalm(px,pz,scale,parent){const p=W.group(px,.1,pz,parent);p.scale.setScalar(scale);W.cylinder(.014,.23,'#947a52',0,.115,0,p,5);const crown=new T.Mesh(islandLeafGeometry,islandLeafMaterial);crown.castShadow=crown.receiveShadow=true;p.add(crown);}

 const trunk=W.group(0,0,0,g);trunk.name='island-trunk';
 ribbon([[0,-2.12],[0,2.62]],.24,'#d5c398',.045,trunk);ribbon([[0,-2.1],[0,2.6]],.065,'#8e927f',.06,trunk);
 for(let i=0;i<15;i++){W.box(.012,.005,.10,'#e9dfbd',0,.067,-1.9+i*.29,trunk);for(const side of [-1,1])tinyPalm(side*.17,-1.8+i*.28,.7,trunk);}
 for(const side of [-1,1])for(let row=0;row<8;row++){
  const frond=W.group(0,0,0,g);frond.name=`island-frond-${side}-${row}`;
  const zz=-1.92+row*.43,span=1.15+1.25*Math.sin((row+1)/9*Math.PI),bend=.20+.28*row/7;
  const point=t=>[side*(.12+span*t),zz+bend*t*t];const points=Array.from({length:25},(_,i)=>point(i/24));
  ribbon(points,t=>.18*(1-.65*Math.pow(t,8)),'#629f91',.003,frond);
  ribbon(points,t=>.145*(1-.65*Math.pow(t,8)),'#dfc89a',.05,frond);ribbon(points,t=>.029*(1-.5*t),'#aaa48a',.064,frond);
  for(let house=0;house<8;house++){
   const t=.12+house*.105,[px,pz]=point(t),dx=side*span,dz=2*bend*t,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
   for(const edge of [-1,1]){
    const v=W.group(px+nx*.067*edge,.05,pz+nz*.067*edge,frond);v.name='island-villa';v.rotation.y=-Math.atan2(dz,dx);const variant=(row+house+(edge+1))%4,h=.07+variant*.012;
    W.box(.10,h,.08,['#d1bc91','#e3d2ae','#c6b38c','#ddd0af'][variant],0,h/2,0,v);W.box(.112,.018,.09,'#b29c76',0,h+.009,0,v);W.box(.047,.028,.044,'#d9c8a3',-.02,h+.03,0,v);W.box(.026,.035,.006,'#44675f',.022,.04,.042,v);
    if(house%3===0)tinyPalm(px+nx*.122*edge,pz+nz*.122*edge,.6,frond);
   }
  }
 }
 const crescent=W.group(0,0,0,g);crescent.name='island-crescent';crescent.userData.frontOpening=.82;
 const arc=Array.from({length:121},(_,i)=>{const a=.41+i/120*(TAU-.82);return[Math.sin(a)*2.83,Math.cos(a)*2.75];});
 const shelf=ribbon(arc,.23,'#4b9590',.002,crescent);shelf.name='island-shallows';ribbon(arc,.195,'#779f91',.012,crescent);ribbon(arc,.17,'#b6aa86',.035,crescent);ribbon(arc,.13,'#dcc89f',.065,crescent);ribbon(arc,.035,'#93947f',.072,crescent);
 for(let i=1;i<59;i++){const a=.41+i/60*(TAU-.82),px=Math.sin(a)*2.83,pz=Math.cos(a)*2.75;if(Math.abs(a-Math.PI)<.3)continue;const villa=W.group(px,.08,pz,crescent);villa.rotation.y=a;W.box(.10,.08+i%3*.015,.12,'#cbbb96',0,.05,0,villa);W.box(.115,.015,.13,'#e1d0aa',0,.1+i%3*.015,0,villa);if(i%2===0)tinyPalm(px+Math.sin(a)*.1,pz+Math.cos(a)*.1,.8,crescent);}
 const hotel=W.group(0,.08,-2.73,g);hotel.name='atlantis-palace';
 // Separate wings and central bridge preserve the palace's open arch silhouette.
 for(const side of [-1,1]){W.box(.5,.28,.3,'#c7a47e',side*.43,.14,0,hotel);W.box(.18,.58,.36,'#d4b38c',side*.22,.29,0,hotel);W.box(.16,.43,.33,'#c9ab84',side*.68,.215,0,hotel);for(let i=0;i<3;i++)W.box(.018,.15,.012,'#665f4c',side*(.3+i*.12),.15,.156,hotel);}
 W.box(.32,.15,.3,'#d8b78e',0,.48,0,hotel);for(const xx of [-.68,-.22,.22,.68]){const roof=mesh(W,new T.ConeGeometry(.14,.18,4),new T.MeshStandardMaterial({color:'#79958c',roughness:.7}),hotel);roof.position.set(xx,Math.abs(xx)<.3?.68:.52,0);roof.rotation.y=Math.PI/4;}
 return g;
}
export function skyline(W){
 const T=W.THREE,g=W.group();g.name='dubai-skyline';
 const sites=[[2.0,-3.65,5.9,.67,0],[3.15,-4.45,6.5,.72,1],[4.45,-3.8,5.8,.6,2],[5.65,-2.9,5.1,.63,0],[3.7,-1.55,4.0,.62,3],[5.65,-.4,2.9,.52,2],[1.5,-5.6,3.7,.5,1],[6.4,-4.55,3.8,.5,0]];
 for(const [x,z,h,w,kind] of sites){
  const tower=W.group(x,.13,z,g);tower.name=`skyline-tower-${x}-${z}`;W.box(w*1.7,.18,w*1.5,'#bcb091',0,.09,0,tower);
  const heights=kind===3?[h*.76,h*.24]:[h];let bottom=0;
  heights.forEach((level,j)=>{const width=w*(1-j*.2);W.box(width,level,width*.85,['#294f59','#3c636c','#44656a','#618382'][kind],0,bottom+level/2,0,tower);bottom+=level;});
  for(let floor=.2;floor<h;floor+=.16+kind*.014){const width=w*(kind===3&&floor>h*.76?.8:1);W.box(width+.02,.012,width*.85+.02,['#889e97','#9cac9e','#879b92','#acb4a0'][kind],0,floor,0,tower);}
  for(let fin=0;fin<5;fin++)for(const side of [-1,1]){W.box(.018,h,.025,'#aeb7a8',-w/2+fin*w/4,h/2,side*w*.44,tower);W.box(.025,h,.018,'#b7bdac',side*w*.52,h/2,-w*.4+fin*w*.2,tower);}
  if(kind===1||kind===2){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(kind===1?-w*.1:w*.28,.65);shape.lineTo(w/2,kind===1?.26:0);shape.closePath();const roof=mesh(W,new T.ExtrudeGeometry(shape,{depth:w*.85,bevelEnabled:false}),new T.MeshStandardMaterial({color:'#466a72',metalness:.35,roughness:.3}),tower);roof.position.set(0,h,-w*.425);W.line([[-w/2,h,-w*.45],[kind===1?-w*.1:w*.28,h+.66,-w*.45],[w/2,h+(kind===1?.26:0),-w*.45]],'#c2c8b7',.023,tower);}
  else{for(let step=0;step<3;step++)W.box(w*(.8-step*.18),.19,w*(.7-step*.15),step%2?'#456b70':'#a7b4a1',0,h+.095+step*.19,0,tower);}
  cylinder(W,.013,.55,'#c3c8b8',0,h+.79,0,tower,6);
 }
 // Dense layered mid-rise architecture, with true side facades and courtyard roofs.
 const blocks=[[-1.7,-.4,2.3,.48],[-1.95,-1.65,1.6,.42],[-1.3,-2.5,2.8,.4],[-.95,-4.0,1.6,.5],[.25,-4.4,2.1,.5],[.6,-3.15,1.35,.46],[.8,-6.7,1.25,.6],[2.1,-6.5,1.8,.55],[3.4,-6.35,2.2,.5],[4.6,-6.25,1.8,.6],[5.6,-6.1,1.3,.5],[6.85,-5.8,1.4,.45],[6.8,-3.2,2.5,.45],[5.1,-1.7,1.35,.5],[4.65,.25,1.6,.5],[2.6,-.35,1.35,.45],[1.35,-1.9,2.1,.4],[2.7,-2.7,1.8,.42],[4.8,-5.1,1.3,.5],[.15,-6.1,1.1,.5],[1.65,.1,1.3,.4],[6.75,.55,1.2,.4]];
 for(let i=0;i<blocks.length;i++){
  const [x,z,h,w]=blocks[i],b=W.group(x,.12,z,g);b.name=`city-block-${i}`;const glass=i%4===0;
  W.box(w*1.2,.12,w*1.15,'#b9a887',0,.06,0,b);W.box(w,h,w*.8,glass?'#44656a':['#bdac87','#cabc98','#b2a88b'][i%3],0,h/2,0,b);
  for(let floor=.23;floor<h;floor+=.22){W.box(w+.035,.025,w*.8+.035,'#ded0af',0,floor+.09,0,b);for(const side of [-1,1])for(let k=0;k<3;k++){W.box(.07,.1,.008,'#3f605c',-w*.32+k*w*.32,floor,side*(w*.4+.006),b);W.box(.008,.1,.07,'#4b6860',side*(w*.5+.006),floor,-w*.24+k*w*.24,b);}}
  W.box(w*1.1,.055,w*.9,'#ded0ae',0,h+.025,0,b);W.box(w*.54,.18,w*.5,'#a99c7b',0,h+.14,0,b);if(i%3===0){W.box(w*.3,.22,w*.3,'#c3b899',0,h+.33,0,b);cylinder(W,.012,.4,'#b8c0ad',0,h+.62,0,b,5);}
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
 const glass=new Set(['294f59','3c636c','44656a','618382','466a72','36575f','41636a','466b72','355b64','4c6e75','49646a','719392','51747b','38666d','496c70']);
 const cache=new Map();root.traverse(o=>{if(!o.isMesh||!o.material?.color)return;const hex=o.material.color.getHexString();if(!glass.has(hex))return;
 const key=hex+':'+o.material.side;if(!cache.has(key)){const mat=W.own(new W.THREE.MeshStandardMaterial({color:`#${hex}`,roughness:.23,metalness:.42,side:o.material.side}));mat.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 facadePosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacadePosition=position;');shader.fragmentShader='varying vec3 facadePosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat reflectionBand=smoothstep(-.5,.8,facadePosition.y);\ndiffuseColor.rgb*=.77+.26*reflectionBand;\ndiffuseColor.rgb+=vec3(.035,.055,.06)*pow(max(0.,sin(facadePosition.x*8.+facadePosition.y*.7)),8.);');};cache.set(key,mat);}o.material=cache.get(key);
 });
}
