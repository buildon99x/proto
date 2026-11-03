/** Authored miniature Singapore landmarks. Geometry is created once and owned by W. */
const palettes = new WeakMap();
function material(W,color,roughness=.65,metalness=0){
 let cache=palettes.get(W);if(!cache){cache=new Map();palettes.set(W,cache);}
 const key=[color,roughness,metalness].join();if(!cache.has(key))cache.set(key,W.own(new W.THREE.MeshStandardMaterial({color,roughness,metalness,side:W.THREE.DoubleSide})));
 return cache.get(key);
}
function mesh(W,geometry,color,parent,roughness=.65,metalness=0){const m=new W.THREE.Mesh(W.own(geometry),material(W,color,roughness,metalness));m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function ellipse(W,parent,rx,rz,y,color,tube=.025){const points=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;points.push([Math.cos(a)*rx,y,Math.sin(a)*rz]);}return W.line(points,color,tube,parent);}
function roof(W,parent,w,d,y,color,h=.3){const g=new W.THREE.BufferGeometry();g.setAttribute('position',new W.THREE.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,w/2,0,d/2,-w/2,0,d/2,0,h,0],3));g.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,2,0,2,3]);g.computeVertexNormals();const m=mesh(W,g,color,parent);m.position.y=y;return m;}
function pine(W,parent,x,y,z,s=.1){W.cylinder(s*.17,s*1.5,'#746747',x,y+s*.7,z,parent,6);for(let i=0;i<3;i++){const m=mesh(W,new W.THREE.ConeGeometry(s*(1-i*.18),s*1.5,6),'#416047',parent);m.position.set(x,y+s*(1.3+i*.55),z);}}
function facade(W,parent,w,h,d,color='#ced3c4',glass='#3e6870',floors=18,cols=6){
 W.box(w,h,d,glass,0,h/2,0,parent);
 for(let j=0;j<=floors;j++)W.box(w+.035,.023,d+.035,color,0,.05+j*(h-.1)/floors,0,parent);
 for(let i=0;i<=cols;i++){
  const x=-w/2+i*w/cols;W.box(.025,h,.035,color,x,h/2,d/2+.018,parent);W.box(.025,h,.035,color,x,h/2,-d/2-.018,parent);
 }
 for(let i=0;i<=3;i++){const z=-d/2+i*d/3;for(const side of [-1,1])W.box(.035,h,.025,color,side*(w/2+.018),h/2,z,parent);}
}
export function marinaBaySands(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='marina-bay-sands';
 W.box(6.2,.22,1.65,'#c7c3aa',0,.11,0,root);W.box(6.12,.03,1.55,'#7c8c7b',0,.24,0,root);
 for(const tx of [-2.04,0,2.04]){
  const tower=W.group(tx,.24,0,root);facade(W,tower,1.18,5.3,1.08,'#aab4aa','#30565e',29,7);
  for(const side of [-1,1]){
   const positions=[];
   for(let j=0;j<=20;j++){const t=j/20,yy=t*5.3;positions.push([side*(.60+.27*(1-t)**2),yy,.58]);}
   W.line(positions,'#e4dcc7',.075,tower);
  }
  W.box(.12,5.25,1.15,'#d9d2ba',0,2.65,0,tower);
  for(let j=0;j<26;j++)for(const col of [-.48,-.25,.25,.48])if((j+Math.round(col*100))%7===0)W.box(.045,.038,.018,'#d6b672',col,.21+j*.19,.566,tower);
 }
 // Long narrow curved sky park with a projecting prow, not a rectangular cap.
 const shape=new W.THREE.Shape();shape.moveTo(-3.7,-.45);shape.bezierCurveTo(-3.1,-.82,2.9,-.77,3.47,-.49);shape.quadraticCurveTo(3.92,0,3.47,.49);shape.bezierCurveTo(2.4,.8,-2.9,.77,-3.7,.18);shape.quadraticCurveTo(-4.05,-.05,-3.7,-.45);
 const deck=mesh(W,new W.THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.045}),'#ded6bd',root);deck.rotation.x=-Math.PI/2;deck.position.y=5.62;
 W.box(5.6,.045,.48,'#7a9672',-.1,5.87,.13,root);W.box(2.35,.025,.27,'#3c9ba0',-.9,5.9,-.23,root);
 for(let i=0;i<22;i++)pine(W,root,-2.9+i*.26,5.88,.32,.07);
 for(let i=0;i<3;i++){W.box(.45,.2,.38,'#d7d8c9',-1.9+i*1.9,5.99,.06,root);W.box(.39,.025,.31,'#82948f',-1.9+i*1.9,6.10,.06,root);}
 for(const zz of [-.58,.56]){W.line([[-3.35,5.95,zz],[3.35,5.95,zz]],'#a6ac9a',.013,root);for(let i=0;i<28;i++)W.cylinder(.008,.16,'#d5d5c5',-3.3+i*.245,5.88,zz,root,5);}
 // Low glass concourse with repeated light roof ribs.
 const hall=W.group(0,0,1.2,root);W.box(5.65,.42,.9,'#567a7b',0,.23,0,hall);for(let i=0;i<21;i++)W.box(.035,.075,1.04,'#d6d7c8',-2.75+i*.275,.49,0,hall);
 return root;
}
export function artScience(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='artscience-lotus';
 W.cylinder(1.30,.12,'#a7a48e',0,.06,0,root,48);W.cylinder(1.20,.035,'#ded8c1',0,.14,0,root,48);W.cylinder(.40,.32,'#809390',0,.32,0,root,24);
 const rings=10,segments=10;
 for(let p=0;p<10;p++){
  const points=[],indices=[],angle=p/10*Math.PI*2,height=.85+(p%4)*.16;
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
   const t=j/rings,u=i/segments*2-1,rad=.18+1.20*t,width=.10+.33*Math.sin(t*Math.PI*.72);
   const yy=.43+height*t**1.65+.10*u*u,xx=rad,zz=u*width;
   points.push(xx*Math.cos(angle)-zz*Math.sin(angle),yy,xx*Math.sin(angle)+zz*Math.cos(angle));
  }
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const geo=new W.THREE.BufferGeometry();geo.setAttribute('position',new W.THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();const petal=mesh(W,geo,p%2?'#fffef1':'#f5f5e9',root,.31);petal.name=`lotus-petal-${p}`;petal.material.emissive.set('#e8e6d7');petal.material.emissiveIntensity=.06;
  const a=angle;W.line(Array.from({length:13},(_,i)=>{const t=i/12;return[(.18+1.2*t)*Math.cos(a),.44+height*t**1.65,(.18+1.2*t)*Math.sin(a)];}),'#e0e2d6',.010,root);
 }
 W.cylinder(.22,.04,'#cbcbbd',0,.48,0,root,32);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;W.cylinder(.013,.25,'#7b9189',1.1*Math.cos(a),.28,1.1*Math.sin(a),root,6);}
 ellipse(W,root,1.1,1.1,.4,'#b8bcac',.018);return root;
}
function glasshouse(W,parent,x,z,w,d,h){
 const root=W.group(x,.06,z,parent),vertices=[],indices=[],n=28,m=18;
 // A long vaulted conservatory, narrowed at either end and tilted in silhouette.
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
  const u=j/m,angle=i/n*Math.PI,rx=w/2*(.82+.18*Math.sin(u*Math.PI));
  vertices.push(Math.cos(angle)*rx,h*Math.sin(angle)*(1-.16*u),-d/2+u*d);
 }
 for(let j=0;j<m;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const g=new W.THREE.BufferGeometry();g.setAttribute('position',new W.THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const glazing=mesh(W,g,'#477e85',root,.16,.15);glazing.name='conservatory-glass';
 for(let j=0;j<=10;j++){
  const u=j/10,points=[];for(let i=0;i<=28;i++){const a=i/28*Math.PI;points.push([Math.cos(a)*w/2*(.82+.18*Math.sin(u*Math.PI)),h*Math.sin(a)*(1-.16*u)+.015,-d/2+u*d]);}W.line(points,'#d0d8c8',.028,root);
 }
 for(let i=1;i<6;i++){const a=i/6*Math.PI,points=[];for(let j=0;j<=18;j++){const u=j/18;points.push([Math.cos(a)*w/2*(.82+.18*Math.sin(u*Math.PI)),h*Math.sin(a)*(1-.16*u)+.018,-d/2+u*d]);}W.line(points,'#a7bdb4',.012,root);}
 return root;
}
export function gardens(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='gardens-by-the-bay';
 W.box(5.1,.09,4.1,'#72856a',0,.045,0,root);
 glasshouse(W,root,-.9,-1,2.5,1.7,1.7);glasshouse(W,root,.9,1,2.3,1.9,1.5);
 for(const [tx,tz,h] of [[-.9,.8,2.3],[.75,-.7,2.8],[1.85,-1.1,2.15]]){
  W.cylinder(.17,h,'#786b45',tx,h/2,tz,root,9);const g=W.group(tx,0,tz,root);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;W.line([[.15*Math.cos(a),.08,.15*Math.sin(a)],[.16*Math.cos(a),h*.56,.16*Math.sin(a)],[.72*Math.cos(a),h,.72*Math.sin(a)]],'#84596a',.022,g);}
  for(let i=0;i<4;i++)ellipse(W,g,.24+i*.16,.24+i*.16,h*.63+i*h*.12,'#b1888e',.018);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;W.ball(.13,'#5d7954',Math.cos(a)*.16,.3+i*.11,Math.sin(a)*.16,g);}
 }
 for(let i=0;i<45;i++){const a=i*2.399,rr=1.55+(i%3)*.25,xx=Math.cos(a)*rr,zz=Math.sin(a)*rr;if(Math.abs(xx)<1.7&&Math.abs(zz)<1.4)continue;pine(W,root,xx,0,zz,.11+(i%4)*.025);}
 return root;
}
export function flyer(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='singapore-flyer';const radius=1.75,center=2.12;
 W.box(2.4,.13,1.1,'#b2b5a4',0,.065,0,root);
 for(const zz of [-.3,.3])for(const side of [-1,1])W.line([[side*.95,.12,zz],[0,center,0]],'#c8d0c3',.075,root);
 const wheel=W.group(0,center,0,root);wheel.name='flyer-wheel';
 for(const zz of [-.16,.16]){const ring=W.ring(radius,'#e1e3d5',0,0,zz,wheel,.036);ring.rotation.x=0;}
 W.cylinder(.13,.5,'#9ba89e',0,0,0,wheel,16).rotation.x=Math.PI/2;
 const pods=[];for(let i=0;i<20;i++){
  const a=i/20*Math.PI*2,px=Math.cos(a)*radius,py=Math.sin(a)*radius;
  for(const zz of [-.16,.16])W.line([[0,0,zz],[px,py,zz]],'#c9d3c7',.011,wheel);
  const pod=W.group(px,py,0,wheel);pod.userData.angle=a;
  W.box(.24,.16,.25,'#678b8d',0,0,0,pod);W.box(.27,.035,.27,'#e2e4d9',0,.1,0,pod);W.box(.25,.035,.26,'#b7c4ba',0,-.09,0,pod);
  W.box(.025,.17,.27,'#cbd5c8',0,0,0,pod);pods.push(pod);
 }
 return {root,wheel,pods};
}
export function civic(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='civic-clocktower';W.box(2.9,.15,1.7,'#bdb69d',0,.075,0,root);
 for(const xx of [-.85,.85]){
  const wing=W.group(xx,.15,0,root);W.box(1.2,.92,1.35,'#ded1ae',0,.46,0,wing);roof(W,wing,1.4,1.55,.92,'#9c593c',.4);
  for(const front of [-1,1])for(let i=0;i<4;i++){
   W.box(.15,.28,.025,'#475e59',-.44+i*.29,.53,front*.687,wing);W.cylinder(.028,.7,'#e8dec1',-.54+i*.36,.38,front*.73,wing,8);
  }
  for(let i=0;i<5;i++)W.box(1.2,.025,.025,'#baaa88',0,.16+i*.18,.69,wing);
 }
 // The tower is deliberately clear above the low wings, with four visible clock faces.
 W.box(.78,2.72,.78,'#eee4c9',0,1.36,0,root);
 for(const yy of [.25,1.25,1.92,2.72])W.box(.89,.07,.89,'#d0c6a9',0,yy,0,root);
 for(let i=0;i<4;i++){
  const face=W.group(0,2.29,0,root);face.rotation.y=i*Math.PI/2;face.name=`civic-clock-face-${i}`;
  const rim=W.cylinder(.275,.024,'#746f5a',0,0,.405,face,40);rim.rotation.x=Math.PI/2;
  const dial=W.cylinder(.247,.027,'#fff8df',0,0,.421,face,40);dial.rotation.x=Math.PI/2;
  W.line([[0,-.02,.445],[0,.183,.445]],'#39453e',.015,face);W.line([[0,0,.445],[.135,-.06,.445]],'#39453e',.015,face);
  for(let j=0;j<12;j++){const a=j/12*Math.PI*2;W.ball(.012,'#39453e',Math.sin(a)*.212,Math.cos(a)*.212,.445,face);}
 }
 W.box(.50,.47,.50,'#d1d3b8',0,2.99,0,root);for(const xx of [-.16,.16])for(const zz of [-.26,.26])W.box(.035,.32,.02,'#4b665c',xx,2.99,zz,root);
 roof(W,root,.70,.70,3.23,'#6e8b79',.32);W.cylinder(.025,.22,'#9b9973',0,3.62,0,root,6);
 return root;
}
export function temple(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='heritage-temple';W.box(2.25,.15,1.8,'#b1a48b',0,.075,0,root);
 for(let level=0;level<5;level++){
  const y=.15+level*.58,w=2.08-level*.25,d=1.65-level*.18;
  W.box(w*.8,.39,d*.8,'#994b37',0,y+.2,0,root);
  for(const front of [-1,1])for(let i=0;i<5-level%2;i++){const xx=-w*.34+i*w*.17;W.box(.07,.26,.028,'#dfc598',xx,y+.20,front*d*.408,root);}
  roof(W,root,w,d,y+.39,'#5d655b',.22);
  W.box(w,.035,d,'#b2794d',0,y+.40,0,root);
  for(const sx of [-1,1])for(const sz of [-1,1])W.line([[sx*w*.38,y+.45,sz*d*.38],[sx*w*.5,y+.43,sz*d*.5],[sx*w*.57,y+.56,sz*d*.57]],'#566455',.035,root);
  for(const xx of [-w*.35,w*.35])for(const zz of [-d*.35,d*.35])W.cylinder(.035,.39,'#dfc391',xx,y+.20,zz,root,6);
 }
 W.cylinder(.035,.4,'#bca169',0,3.23,0,root,6);W.ball(.07,'#bca169',0,3.4,0,root);return root;
}
export function merlion(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='merlion';W.cylinder(.60,.13,'#a5a78f',0,.065,0,root,32);W.cylinder(.52,.12,'#6e9b96',0,.16,0,root,32);
 // Fish tail coils into the pedestal; tapered scaly body rises to a lion head facing bay (-x).
 const tail=W.ring(.27,'#dcd7c2',.13,.35,0,root,.10,Math.PI*1.7);tail.rotation.x=0;
 const body=W.ball(.33,'#e3dfc9',.05,.72,0,root);body.scale.set(.27,.49,.27);
 for(let j=0;j<7;j++)for(let i=0;i<7;i++){const a=i/7*Math.PI*2+(j%2)*.3;const r=.23*(1-j*.035);const scale=W.ball(.06,j%2?'#c8c8b2':'#e9e4cf',.05+Math.cos(a)*r,.44+j*.083,Math.sin(a)*r,root);scale.scale.set(.06,.035,.065);}
 const mane=W.ball(.31,'#e8e1ca',-.04,1.15,0,root);mane.scale.set(.29,.35,.28);
 for(let i=0;i<13;i++){const a=i/13*Math.PI*2;const lock=W.ball(.095,'#c9cbb5',-.015+Math.cos(a)*.18,1.13+Math.sin(a)*.26,.21,root);lock.scale.set(.07,.15,.065);}
 const snout=W.ball(.18,'#f0ead8',-.25,1.23,0,root);snout.scale.set(.20,.13,.17);W.ball(.06,'#b0b09a',-.41,1.27,0,root);
 W.ball(.021,'#49564b',-.23,1.37,.17,root);W.ball(.021,'#49564b',-.23,1.37,-.17,root);
 W.ball(.11,'#e5dfc9',.03,1.39,.22,root);W.ball(.11,'#e5dfc9',.03,1.39,-.22,root);
 W.box(.10,.025,.12,'#7c8d80',-.37,1.19,0,root);return {root,mouth:[-.42,1.2,0]};
}
export function skyline(W,x=0,z=0){
 const root=W.group(x,.14,z);root.name='downtown-skyline';
 const specs=[[-1.15,-.65,.85,3.2,.8],[-.1,-.9,.85,4.15,.85],[1,-.5,.86,3.65,.8],[-1.2,.6,.75,2.35,.75],[-.2,.65,.8,2.9,.8],[.8,.7,.78,2.2,.8]];
 for(const [xx,zz,w,h,d] of specs){const t=W.group(xx,0,zz,root);facade(W,t,w,h,d,'#b9c5bd','#3d5f69',Math.round(h*7),5);W.box(w+.08,.10,d+.08,'#c4c9b8',0,h+.04,0,t);W.box(w*.7,.17,d*.7,'#84958e',0,h+.17,0,t);W.box(w*.54,.02,d*.5,'#4c6461',0,h+.265,0,t);}
 return root;
}
