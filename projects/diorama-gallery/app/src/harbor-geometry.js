const C=['#d65a2c','#166b82','#e3ae3f','#bd4037','#689a97','#eee3c8'];
export function container(W,parent,x,y,z,color=C[0],scale=1) {
 const g=W.group(x,y,z,parent);g.scale.setScalar(scale);
 W.box(.68,.48,1.35,color,0,0,0,g);
 for(let i=0;i<9;i++) for(const side of [-1,1]) W.box(.018,.39,.025,color,side*.349,0,-.58+i*.145,g);
 for(const side of [-1,1]) { W.box(.66,.035,.025,'#decbb0',0,.22,side*.683,g);W.box(.66,.025,.025,color,0,-.22,side*.683,g); }
 for(const x of [-.16,.16]) W.box(.018,.38,.018,'#c6bba5',x,0,.688,g);
 return g;
}
export function vessel(W,{length=4.7,width=1.6,tug=false,cargo=true,color='#173e4b'}={}) {
 const T=W.THREE,g=W.group(),shape=new T.Shape();
 shape.moveTo(-width*.36,-length*.5);shape.lineTo(width*.36,-length*.5);shape.lineTo(width*.5,-length*.3);shape.lineTo(width*.5,length*.25);shape.quadraticCurveTo(width*.44,length*.41,0,length*.5);shape.quadraticCurveTo(-width*.44,length*.41,-width*.5,length*.25);shape.lineTo(-width*.5,-length*.3);shape.closePath();
 const geo=W.own(new T.ExtrudeGeometry(shape,{depth:tug?.22:.42,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1}));geo.rotateX(Math.PI/2);
 const mat=W.own(new T.MeshStandardMaterial({color,roughness:.48}));const hull=new T.Mesh(geo,mat);hull.position.y=.25;hull.castShadow=hull.receiveShadow=true;g.add(hull);
 const deckGeo=W.own(new T.ShapeGeometry(shape));deckGeo.rotateX(Math.PI/2);const deckMat=W.own(new T.MeshStandardMaterial({color:tug?'#d5ae55':'#acb8ae',side:T.DoubleSide,roughness:.8}));const deck=new T.Mesh(deckGeo,deckMat);deck.position.y=.29;deck.receiveShadow=true;g.add(deck);
 const l=length,w=width;
 // Painted rubbing strakes and fine safety rails follow both gunwales.
 for(const s of [-1,1]) {
 W.line([[s*w*.36,.1,-l*.49],[s*w*.5,.1,-l*.3],[s*w*.5,.1,l*.25],[s*w*.31,.1,l*.42],[0,.1,l*.5]],'#dc704b',.035,g);
 W.line([[s*w*.35,.47,-l*.47],[s*w*.48,.47,-l*.3],[s*w*.48,.47,l*.25],[0,.47,l*.47]],'#ece9d4',.013,g);
 for(let i=0;i<10;i++) W.box(.018,.18,.018,'#d9e1db',s*w*.48,.38,-l*.28+i*l*.052,g);
 }
 const cabinZ=-l*.32;
 W.box(w*.72,tug?.37:.55,l*.18,'#f4ebd6',0,tug?.52:.63,cabinZ,g);
 W.box(w*.8,.065,l*.2,'#e0e4d9',0,tug?.74:.94,cabinZ,g);
 for(let i=0;i<4;i++) W.box(w*.13,.12,.025,'#274750',(-1.5+i)*w*.16,tug?.58:.74,cabinZ+l*.093,g);
 for(const s of [-1,1]) W.box(.02,.13,l*.12,'#32606a',s*w*.365,tug?.58:.74,cabinZ,g);
 W.cylinder(.023,tug?.6:.88,'#f5ecce',0,tug?1:1.35,cabinZ,g,8);
 W.line([[-w*.28,tug?1.15:1.65,cabinZ],[w*.28,tug?1.15:1.65,cabinZ]],'#d9dfd5',.018,g);
 W.box(.05,.12,.09,'#cf5434',0,tug?1.31:1.84,cabinZ,g);
 W.cylinder(tug?.06:.09,.36,'#273840',w*.25,tug?.89:1.1,cabinZ-.12,g);
 if(tug) for(const s of [-1,1]) for(let i=0;i<3;i++){const r=W.ring(.1,'#27393c',s*w*.5,.26,-l*.23+i*l*.22,g,.04);r.rotation.set(0,Math.PI/2,0);}
 else if(cargo) { const cs=Math.min(.82,width/1.7*.82); for(let row=0;row<Math.max(1,Math.floor(length*.65/(1.4*cs)));row++) for(let col=0;col<2;col++) container(W,g,(col-.5)*.85*cs,.295+.24*cs,-l*.08+row*1.4*cs,C[(row*2+col)%C.length],cs); }
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
 const g=W.group(x,.45,z);W.box(w,1.15,d,'#bca88a',0,.575,0,g);
 for(let i=0;i<3;i++) {const xx=(i-1)*w*.29;W.box(w*.22,.82,.03,'#3b484b',xx,.42,d/2+.02,g);W.box(w*.23,.08,.06,'#e2dac5',xx,.88,d/2+.04,g);}
 const roofA=W.box(w*.54,.08,d+.25,'#516a72',-w*.25,1.3,0,g);roofA.rotation.z=.21;
 const roofB=W.box(w*.54,.08,d+.25,'#5f7881',w*.25,1.3,0,g);roofB.rotation.z=-.21;
 for(let i=0;i<8;i++) W.box(.035,.035,d+.28,'#81918e',-w*.48+i*w*.137,1.39-Math.abs(-w*.48+i*w*.137)*.21,0,g);
 W.box(w+.3,.055,.06,'#e1d6ba',0,1.15,d*.53,g);
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
