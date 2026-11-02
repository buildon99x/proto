const C=['#d65a2c','#166b82','#e3ae3f','#bd4037','#689a97','#eee3c8'];
const caches=new WeakMap();
function cached(W,key,create){let cache=caches.get(W);if(!cache){cache=new Map();caches.set(W,cache);}if(!cache.has(key))cache.set(key,W.own(create()));return cache.get(key);}
function steel(W,color,roughness=.57,metalness=.18){return cached(W,`steel:${color}:${roughness}:${metalness}`,()=>new W.THREE.MeshStandardMaterial({color,roughness,metalness}));}
function paintBox(W,w,h,d,color,x,y,z,parent,roughness=.57){const m=W.box(w,h,d,color,x,y,z,parent);m.material=steel(W,color,roughness);return m;}
function tint(W,color,scale){return '#'+new W.THREE.Color(color).multiplyScalar(scale).getHexString();}
export function container(W,parent,x,y,z,color=C[0],scale=1) {
 const g=W.group(x,y,z,parent);g.scale.setScalar(scale);
 const frame=tint(W,color,.72),rib=tint(W,color,1.08);
 paintBox(W,.665,.445,1.32,color,0,0,0,g,.72);
 // Corner posts, castings and top/bottom rails give each box a structural silhouette.
 for(const side of [-1,1]) {
  for(const end of [-1,1]){
   paintBox(W,.038,.48,.042,frame,side*.321,0,end*.65,g);
   for(const yy of [-.222,.222])W.box(.047,.034,.047,'#687169',side*.321,yy,end*.65,g);
  }
  for(const yy of [-.22,.22])paintBox(W,.025,.035,1.29,frame,side*.333,yy,0,g);
  for(let i=0;i<10;i++)paintBox(W,.018,.37,.035,rib,side*.34,0,-.58+i*.129,g,.7);
  for(let i=0;i<3;i++)W.box(.006,.026,.08,'#e9dfc5',side*.351,.14,-.43+i*.10,g);
 }
 for(let i=0;i<10;i++)paintBox(W,.58,.012,.025,rib,0,.229,-.57+i*.127,g,.72);
 for(const end of [-1,1]){
  paintBox(W,.61,.405,.012,frame,0,0,end*.665,g);
  for(const xx of [-.155,.155]){paintBox(W,.29,.37,.016,color,xx,0,end*.676,g);W.box(.012,.33,.015,'#b1b5a3',xx,0,end*.688,g);W.box(.05,.014,.02,'#ddd6bc',xx,.02,end*.698,g);}
 }
 return g;
}
function hullOutline(T,length,width){const s=new T.Shape();s.moveTo(-width*.30,-length*.5);s.quadraticCurveTo(-width*.49,-length*.47,-width*.5,-length*.27);s.lineTo(-width*.5,length*.28);s.bezierCurveTo(-width*.48,length*.40,-width*.24,length*.48,0,length*.5);s.bezierCurveTo(width*.24,length*.48,width*.48,length*.40,width*.5,length*.28);s.lineTo(width*.5,-length*.27);s.quadraticCurveTo(width*.49,-length*.47,width*.30,-length*.5);s.closePath();return s;}
export function hullGeometry(W,length,width,tug=false,deckHeight=.295){
 return cached(W,`hull:${length}:${width}:${tug}:${deckHeight}`,()=>{
  const T=W.THREE,points=hullOutline(T,length,width).getPoints(12);points.pop();const count=points.length;
  const vertices=[],indices=[];const levels=tug?[[-.12,.52],[-.025,.83],[.17,.99],[.295,1]]:[[-.23,.48],[-.055,.83],[.16,.99],[.295,1]];
  for(let j=0;j<levels.length;j++)for(const p of points){const [y,beam]=levels[j];const sheer=j===3?Math.max(0,(p.y/length-.12))*.13:0;vertices.push(p.x*beam,(y>=0?y*deckHeight/.295:y)+sheer,p.y*(j===0?.93:1));}
  for(let j=0;j<levels.length-1;j++)for(let i=0;i<count;i++){const n=(i+1)%count,a=j*count+i,b=j*count+n,c=(j+1)*count+i,d=(j+1)*count+n;indices.push(a,b,c,b,d,c);}
  for(let i=1;i<count-1;i++)indices.push(0,i,i+1);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
 });
}
export function vessel(W,{length=4.7,width=1.6,tug=false,cargo=true,color='#102d3c',deckHeight=(cargo&&!tug?.50:.295)}={}) {
 const T=W.THREE,g=W.group(),l=length,w=width;
 const hull=new T.Mesh(hullGeometry(W,l,w,tug,deckHeight),steel(W,color,.38,.32));hull.castShadow=hull.receiveShadow=true;g.add(hull);
 const deckGeo=cached(W,`deck:${l}:${w}`,()=>{const geo=new T.ShapeGeometry(hullOutline(T,l,w));geo.rotateX(Math.PI/2);return geo;});
 const deck=new T.Mesh(deckGeo,steel(W,tug?'#c99f43':'#8d9c91',.78));deck.material.side=T.DoubleSide;deck.position.y=.296;deck.receiveShadow=true;g.add(deck);

 for(const s of [-1,1]){
  W.line([[s*w*.3,.075,-l*.49],[s*w*.48,.075,-l*.3],[s*w*.48,.075,l*.17],[s*w*.31,.09,l*.37],[0,.12,l*.49]],'#a94732',.024,g);
  W.line([[s*w*.3,.31,-l*.49],[s*w*.49,.31,-l*.27],[s*w*.49,.33,l*.17],[s*w*.31,.35,l*.37],[0,.36,l*.49]],'#d1cbb1',.018,g);
  W.line([[s*w*.30,.46,-l*.48],[s*w*.48,.46,-l*.27],[s*w*.48,.48,l*.17],[s*w*.3,.50,l*.37],[0,.51,l*.48]],'#dcdcc7',.008,g);
  for(let i=0;i<11;i++)W.box(.012,.15,.012,'#d9ddcd',s*w*.48,.385,-l*.26+i*l*.042,g);
  for(let i=0;i<4;i++)W.box(.006,.045,.012,'#ddd8c2',s*w*.499,.19-i*.04,l*.12,g);
 }
 // Tiered accommodation house, inset wraparound bridge glazing and thin overhanging decks.
 const cabinZ=-l*.38,baseH=tug?.29:.48,baseTop=.30+baseH,bridgeH=tug?.20:.26,bridgeZ=cabinZ+.02;
 paintBox(W,w*.63,baseH,l*.16,'#e8e4d2',0,.30+baseH/2,cabinZ,g,.7);
 paintBox(W,w*.77,.035,l*.20,'#b9c7bc',0,baseTop+.018,cabinZ,g);
 paintBox(W,w*.67,bridgeH,l*.15,'#f1eddc',0,baseTop+bridgeH/2+.035,bridgeZ,g,.62);
 const windowY=baseTop+bridgeH*.62+.035;
 for(let i=0;i<5;i++){
  const xx=(i-2)*w*.121;paintBox(W,w*.105,bridgeH*.48,.012,'#183f49',xx,windowY,bridgeZ+l*.076,g,.2);
  W.box(w*.08,.012,.014,'#75a7ad',xx,windowY+bridgeH*.13,bridgeZ+l*.083,g);
 }
 for(const s of [-1,1])for(let i=0;i<3;i++)paintBox(W,.012,bridgeH*.48,l*.035,'#264e59',s*w*.34,windowY,bridgeZ+(i-1)*l*.045,g,.2);
 const roofY=baseTop+bridgeH+.07;
 paintBox(W,w*.78,.04,l*.20,'#d9dfd2',0,roofY,bridgeZ,g);
 paintBox(W,w*.16,.08,l*.07,'#9baaa0',-w*.12,roofY+.055,bridgeZ,g);
 for(const s of [-1,1]){
  for(let j=0;j<3;j++)W.box(.013,.035,.014,'#557570',s*w*.323,.43+j*.075,cabinZ+l*.081,g);
  paintBox(W,.025,.05,.04,s<0?'#a73425':'#477856',s*w*.36,roofY+.045,bridgeZ+l*.055,g,.3);
  W.cylinder(.024,.07,'#c4c6ae',s*w*.27,.35,l*.34,g,8);W.box(.12,.025,.025,'#45554e',s*w*.27,.39,l*.34,g);
 }
 const mastY=roofY+.30;
 W.cylinder(.012,.58,'#d8dcca',0,mastY,bridgeZ,g,8);W.line([[-w*.22,mastY+.13,bridgeZ],[w*.22,mastY+.13,bridgeZ]],'#c6cfc3',.012,g);
 W.box(w*.32,.025,.065,'#e2e4d7',0,mastY+.23,bridgeZ,g);W.ball(.028,'#ede5b8',0,mastY+.32,bridgeZ,g);
 const funnel=W.cylinder(tug?.043:.07,tug?.27:.36,'#b45234',w*.24,roofY+.10,cabinZ-l*.055,g,10);funnel.scale.z*=1.3;
 const cap=W.cylinder(tug?.045:.073,.055,'#354440',w*.24,roofY+.29,cabinZ-l*.055,g,10);cap.scale.z*=1.3;
 // Bow winch, hatch and anchor pads add scale without floating props.
 W.cylinder(w*.085,.07,'#5d6e65',0,.34,l*.34,g,12);W.box(w*.2,.025,l*.055,'#75877a',0,.32,l*.22,g);
 if(tug){
  for(const s of [-1,1])for(let i=0;i<4;i++){const r=W.ring(.075,'#263531',s*w*.49,.25,-l*.25+i*l*.15,g,.03);r.rotation.set(0,Math.PI/2,0);}
  W.cylinder(.045,.12,'#e0bf62',0,.37,l*.14,g,10);W.line([[-w*.35,.31,-l*.44],[w*.35,.31,-l*.44]],'#252f2e',.055,g);
 } else if(cargo){const cs=Math.min(.82,width/1.7*.82);for(let row=0;row<Math.max(1,Math.floor(length*.65/(1.4*cs)));row++)for(let col=0;col<2;col++)container(W,g,(col-.5)*.85*cs,.295+.24*cs,-l*.14+row*1.4*cs,C[(row*2+col)%C.length],cs);}
 // Lift exposed decks only on underway cargo ships; moored transfer decks stay fixed.
 const deckLift=deckHeight-.295;if(deckLift)for(const child of g.children)if(child!==hull)child.position.y+=deckLift;
 if(!tug)for(const side of [-1,1])W.line([[side*w*.29,.07,-l*.49],[side*w*.47,.07,-l*.28],[side*w*.47,.07,l*.27],[side*w*.30,.07,l*.43],[0,.07,l*.49]],'#923f2e',.037,g);
 return g;
}
export function crane(W,x,z,mirror=1) {
 const g=W.group(x,.45,z);g.scale.x=mirror;const steel='#cf672b',edge='#e89845',dark='#514d40';
 for(const dx of [-.7,.7]) for(const dz of [-.65,.65]) {
 W.box(.31,.14,.47,dark,dx,.08,dz,g);W.box(.14,2.8,.14,steel,dx,1.5,dz,g);
 W.line([[dx,.2,dz],[dx*.65,2.85,dz]],steel,.065,g);
 }
 for(const dz of [-.65,.65]) {
 W.line([[-.7,.6,dz],[.7,1.6,dz],[-.7,2.6,dz]],edge,.035,g);
 W.box(1.65,.18,.16,steel,0,2.8,dz,g);
 }
 W.box(.18,.18,1.55,steel,-.7,2.8,0,g);W.box(.18,.18,1.55,steel,.7,2.8,0,g);
 for(const dz of [-.21,.21]) {
 W.line([[-1.8,3.15,dz],[2.7,3.15,dz]],steel,.055,g);W.line([[-1.8,3.52,dz],[2.7,3.52,dz]],edge,.045,g);
 for(let i=0;i<9;i++) { const xx=-1.8+i*.5;W.line([[xx,3.15,dz],[xx+.25,3.52,dz],[xx+.5,3.15,dz]],steel,.026,g); }
 W.line([[-1.65,3.5,dz],[0,4.22,dz],[2.55,3.5,dz]],dark,.019,g);
 }
 W.line([[0,2.9,0],[0,4.25,0]],steel,.08,g);
 W.box(.55,.4,.62,'#eae2c8',.4,2.96,.7,g);W.box(.5,.18,.02,'#38565b',.4,3,.1+.91,g);
 const trolley=W.group(0,3.16,0,g);W.box(.46,.18,.6,'#e3ad43',0,0,0,trolley);
 const hook=W.group(0,1,0,g);W.box(.76,.07,1.4,'#e5b747',0,0,0,hook);
 const cables=[];for(const dz of [-.5,.5]){const cable=W.box(.018,1,.018,dark,0,0,dz,g);cables.push(cable);}
 const cargo=container(W,g,-1.1,.78,0,'#da6b36');
 const hookAnchor=W.group(0,-.035,0,hook),cargoAnchor=W.group(0,.205,0,cargo);
 return {root:g,trolley,hook,cables,cargo,hookAnchor,cargoAnchor};
}
export function warehouse(W,x,z,w=3.1,d=3.7) {
 const g=W.group(x,.45,z);
 paintBox(W,w,1.15,d,'#9d967e',0,.575,0,g,.92);
 // Recessed loading docks, worn concrete plinth, steel columns and segmented roller shutters.
 W.box(w+.08,.18,d+.06,'#777f73',0,.09,0,g);
 for(let i=0;i<3;i++) {
  const xx=(i-1)*w*.29;W.box(w*.235,.86,.035,'#24383a',xx,.44,d/2+.021,g);
  paintBox(W,w*.205,.28,.025,'#687b76',xx,.72,d/2+.044,g,.83);
  for(let j=0;j<5;j++)W.box(w*.20,.01,.015,'#8e9b8c',xx,.60+j*.05,d/2+.06,g);
  for(const side of [-1,1])W.box(.045,.93,.065,'#bdbba3',xx+side*w*.125,.47,d/2+.06,g);
  W.box(w*.25,.07,.09,'#c8c2a7',xx,.93,d/2+.045,g);
  W.box(w*.23,.07,.24,'#858d7c',xx,.035,d/2+.10,g);
  for(const side of [-1,1])W.box(.07,.2,.055,'#303c37',xx+side*w*.09,.15,d/2+.1,g);
  W.box(.18,.09,.016,'#d9ceb0',xx,1.035,d/2+.025,g);W.box(.065,.025,.018,'#555c4c',xx,1.035,d/2+.036,g);
 }
 for(const side of [-1,1]){
  for(let i=0;i<9;i++){const zz=-d*.46+i*d*.115;W.box(.025,1.05,.035,'#b4ad94',side*(w/2+.008),.62,zz,g);}
  for(let i=0;i<4;i++){const zz=-d*.32+i*d*.22;paintBox(W,.025,.23,d*.13,'#344f54',side*(w/2+.025),.86,zz,g,.24);W.box(.04,.02,d*.14,'#c0baa0',side*(w/2+.035),.73,zz,g);}
 }
 const roofA=paintBox(W,w*.54,.055,d+.25,'#344f59',-w*.25,1.3,0,g,.66);roofA.rotation.z=.21;
 const roofB=paintBox(W,w*.54,.055,d+.25,'#415b62',w*.25,1.3,0,g,.66);roofB.rotation.z=-.21;
 for(let i=0;i<24;i++){const xx=-w*.50+i*w/23;W.box(.012,.018,d+.27,'#6d817d',xx,1.425-Math.abs(xx)*.21,0,g);}
 W.box(.045,.045,d+.3,'#8b9b8c',0,1.43,0,g);
 for(const side of [-1,1]){W.box(.07,.055,d+.31,'#85958b',side*w*.52,1.12,0,g);W.box(.035,1.1,.035,'#788c80',side*w*.51,.56,d*.49,g);}
 for(const zz of [-d*.24,d*.24]){W.box(.32,.12,.34,'#88998c',-.40,1.43,zz,g);W.box(.38,.035,.39,'#a3b1a0',-.40,1.51,zz,g);}
 return g;
}
export function truck(W,x,z,color='#e9af38',angle=0) {
 const g=W.group(x,.52,z);g.rotation.y=angle;
 W.box(.43,.12,1.1,'#3d4541',0,.12,0,g);W.box(.45,.37,.36,color,0,.35,.37,g);W.box(.37,.15,.025,'#456b75',0,.42,.56,g);
 W.box(.42,.3,.65,'#e2d4ad',0,.35,-.2,g);
 for(const side of [-1,1]) for(const zz of [-.35,.35]){const wheel=W.cylinder(.12,.07,'#303638',side*.25,.12,zz,g,10);wheel.rotation.z=Math.PI/2;}
 return g;
}
export function forklift(W,x,z,angle=0) {
 const g=W.group(x,.49,z);g.rotation.y=angle;
 W.box(.36,.23,.48,'#e5a52e',0,.2,0,g);W.box(.2,.2,.18,'#303e3e',0,.38,0,g);
 for(const xx of [-.15,.15]) {W.box(.025,.55,.025,'#283b40',xx,.46,.22,g);W.box(.025,.025,.28,'#34464a',xx,.1,.37,g);W.box(.025,.4,.025,'#e8b447',xx,.5,-.15,g);}
 W.box(.39,.035,.38,'#e8b447',0,.71,0,g);
 for(const xx of [-.21,.21]) for(const zz of [-.14,.14]) {const wheel=W.cylinder(.09,.06,'#283536',xx,.1,zz,g);wheel.rotation.z=Math.PI/2;}
 return g;
}
export { C as CONTAINER_COLORS };
