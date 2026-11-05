/** Ottoman miniature architecture. All geometry/materials are build-time owned resources. */
export function buildLandmarks(W){
 const T=W.THREE,TAU=Math.PI*2,geo=new Map(),mats=new Map();
 const colors={stone:'#c1ac8a',pale:'#e0c9a2',rose:'#b9977c',dark:'#334658',roof:'#617387',gold:'#c5a364',recess:'#514b46'};
 const material=(color)=>{if(!mats.has(color))mats.set(color,W.own(new T.MeshStandardMaterial({color,roughness:.82})));return mats.get(color);};
 const glow=W.own(new T.MeshStandardMaterial({color:'#ffd17e',emissive:'#ffaf43',emissiveIntensity:.9,roughness:.55}));
 const geometry=(key,create)=>{if(!geo.has(key))geo.set(key,W.own(create()));return geo.get(key);};
 const boxGeo=geometry('box',()=>new T.BoxGeometry(1,1,1));
 function mesh(g,geometry,mat,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,typeof mat==='string'?material(mat):mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 function box(g,w,h,d,c,x=0,y=h/2,z=0){return mesh(g,boxGeo,c,x,y,z,w,h,d);}
 function cyl(g,r,h,c,x,y,z,top=r,n=24){const key=`cyl:${top/r}:${n}`;return mesh(g,geometry(key,()=>new T.CylinderGeometry(top/r,1,1,n)),c,x,y,z,r,h,r);}
 const archShape=new T.Shape();archShape.moveTo(-.5,0);archShape.lineTo(-.5,.6);archShape.absarc(0,.6,.5,Math.PI,0,true);archShape.lineTo(.5,0);archShape.closePath();
 const archGeo=geometry('arch',()=>new T.ShapeGeometry(archShape,8));
 function arch(g,x,y,z,w,h,angle=0,lit=true){const a=W.group(x,y,z,g);a.rotation.y=angle;a.name='arched-window';mesh(a,archGeo,colors.pale,0,-.02,-.008,w*1.28,h*1.15,1);mesh(a,archGeo,lit?glow:colors.recess,0,0,.003,w,h,1);box(a,.018,h*.75,.015,colors.stone,0,h*.38,.014);return a;}
 function windows(g,r,y,n,w=.10,h=.22){for(let i=0;i<n;i++){const a=i*TAU/n;arch(g,Math.sin(a)*r,y,Math.cos(a)*r,w,h,a);}}
 function dome(g,x,y,z,r,stretch=1){const d=W.group(x,y,z,g);d.name='ribbed-dome';cyl(d,r*1.02,.09,colors.pale,0,.005,0);mesh(d,geometry('hemisphere',()=>new T.SphereGeometry(1,32,16,0,TAU,0,Math.PI/2)),colors.roof,0,.035,0,r,r*stretch,r);
  const ribGeo=geometry(`dome-rib:${stretch}`,()=>{const p=[];for(let j=0;j<=16;j++){const a=j/16*Math.PI/2;p.push(new T.Vector3(Math.sin(a),Math.cos(a)*stretch,0));}return new T.TubeGeometry(new T.CatmullRomCurve3(p),16,.009,4,false);});
  for(let i=0;i<16;i++){const rib=mesh(d,ribGeo,'#82909b',0,.04,0,r,r,r);rib.rotation.y=i*TAU/16;}
  cyl(d,.018,.20,colors.gold,0,r*stretch+.12,0, .008,8);mesh(d,geometry('sphere',()=>new T.SphereGeometry(1,10,8)),colors.gold,0,r*stretch+.23,0,.036,.036,.036);return d;
 }
 function drum(g,x,y,z,r,h){cyl(g,r,h,colors.stone,x,y+h/2,z);const d=W.group(x,y,z,g);windows(d,r+.014,h*.15,20,.09,h*.65);dome(g,x,y+h,z,r*1.08,.65);}
 function minaret(g,x,z,h,balconies=2){const m=W.group(x,0,z,g);m.name='minaret';box(m,.43,.32,.43,colors.stone);cyl(m,.22,.78,colors.pale,0,.66,0,.15,12);cyl(m,.115,h-1.3,colors.stone,0,(h-.52)/2+.45,0,.09,16);
  for(let j=0;j<balconies;j++){const yy=h*.56+j*.57;cyl(m,.18,.09,colors.pale,0,yy,0,.14,16);cyl(m,.185,.045,colors.gold,0,yy+.10,0);for(let k=0;k<12;k++){const a=k*TAU/12;box(m,.018,.12,.018,colors.pale,Math.sin(a)*.166,yy+.055,Math.cos(a)*.166);}cyl(m,.108,.16,glow,0,yy+.24,0);}
  cyl(m,.115,.30,colors.pale,0,h-.65,0);cyl(m,.13,.76,colors.dark,0,h-.18,0,0,16);cyl(m,.012,.20,colors.gold,0,h+.29,0,.006,6);return m;
 }
 function facade(g,w,d,y,h,cols=9,c=colors.stone){box(g,w,h,d,c,0,y+h/2,0);for(const yy of [y+.05,y+h-.04])box(g,w+.09,.09,d+.09,colors.pale,0,yy,0);for(let j=0;j<cols;j++){const x=-w*.44+j*w*.88/(cols-1);for(const side of [-1,1])arch(g,x,y+h*.24,side*(d/2+.012),.13,h*.45,side<0?Math.PI:0);}for(let j=0;j<6;j++){const z=-d*.4+j*d*.16;for(const side of [-1,1])arch(g,side*(w/2+.012),y+h*.24,z,.13,h*.45,side*Math.PI/2);}}
 function hagia(){const g=W.group(-3.7,.22,-3.4);g.name='hagia-sophia';g.userData.construction={start:17,end:39};box(g,4.9,.12,4.8,colors.pale);facade(g,3.65,3.7,.12,1.15,11,colors.rose);facade(g,2.8,2.8,1.2,.85,9,colors.rose);facade(g,2.05,2.1,2.02,.8,7,colors.pale);drum(g,0,2.82,0,1.02,.45);
  for(const z of [-1.28,1.28]){drum(g,0,1.95,z,.76,.34);for(const x of [-1.03,1.03])drum(g,x,1.35,z,.43,.27);}
  for(const x of [-1.6,1.6])for(const z of [-1.5,-.6,.3,1.2]){box(g,.37,1.6,.48,colors.rose,x,.93,z);box(g,.43,.12,.55,colors.pale,x,1.78,z);}
  for(const x of [-2.12,2.12])for(const z of [-1.96,1.96])minaret(g,x,z,z<0?6.35:5.5,1);
  for(const x of [-1.05,0,1.05]){const p=W.group(x,.12,2.05,g);box(p,.65,.73,.52,colors.rose);arch(p,0,.08,.269,.24,.45);dome(p,0,.75,0,.37,.63);}
  return g;
 }
 function blue(){const g=W.group(3.9,.22,-3.8);g.name='blue-mosque';g.userData.construction={start:24,end:47};box(g,5.0,.12,4.9,colors.pale);facade(g,3.5,2.5,.12,1.25,10);facade(g,2.6,2.15,1.35,.7,9);drum(g,0,2.15,-.35,.95,.42);
  for(const [x,z] of [[-1.04,-.35],[1.04,-.35],[0,.64],[0,-1.28]])drum(g,x,1.65,z,.61,.3);
  for(const x of [-1.35,1.35])for(const z of [-1.03,.62])drum(g,x,1.24,z,.37,.24);
  // The front court is open to the sky: separate colonnade wings, no solid infill.
  const court=W.group(0,.12,1.55,g);court.name='mosque-open-courtyard';box(court,3.65,.035,1.5,'#b5a48c');
  for(const x of [-1.7,1.7]){box(court,.34,.95,1.5,colors.stone,x,.475,0);box(court,.43,.1,1.6,colors.pale,x,1.0,0);for(const z of [-.5,0,.5])dome(court,x,1.08,z,.225,.7);for(const z of [-.5,0,.5])arch(court,x+(x<0?.18:-.18),.14,z,.18,.58,x<0?Math.PI/2:-Math.PI/2);}
  for(let i=0;i<9;i++){const x=-1.5+i*.375;box(court,.075,.85,.14,colors.pale,x,.425,.7);dome(court,x,.98,.7,.20,.65);}box(court,3.6,.14,.4,colors.stone,0,.88,.7);
  cyl(court,.23,.14,colors.pale,0,.1,0);cyl(court,.13,.35,colors.stone,0,.32,0);dome(court,0,.55,0,.23,.65);
  for(const x of [-2.18,2.18])for(const z of [-2.08,.06,2.02])minaret(g,x,z,z<0?6.7:5.9,z<0?3:2);return g;
 }
 function galata(){const g=W.group(-.15,.22,0);g.name='galata-tower';g.userData.construction={start:12,end:29};cyl(g,.69,.12,colors.pale,0,.06,0);cyl(g,.56,2.75,colors.stone,0,1.48,0,.51,40);for(const y of [.4,.95,1.5,2.05,2.7]){cyl(g,.566,.035,colors.pale,0,y,0);windows(g,.563,y+.12,12,.065,.17);}cyl(g,.66,.13,colors.pale,0,2.87,0);cyl(g,.59,.58,colors.stone,0,3.2,0);windows(g,.603,2.99,16,.14,.34);cyl(g,.68,.08,colors.gold,0,3.50,0);for(let i=0;i<28;i++){const a=i*TAU/28;box(g,.025,.20,.025,colors.pale,Math.sin(a)*.65,3.62,Math.cos(a)*.65);}cyl(g,.68,.045,colors.pale,0,3.73,0);cyl(g,.49,.33,colors.pale,0,3.83,0);windows(g,.50,3.71,12,.105,.19);const roof=cyl(g,.69,1.55,colors.dark,0,4.70,0,0,32);roof.name='galata-conical-roof';for(let i=0;i<16;i++){const a=i*TAU/16;W.line([[Math.sin(a)*.69,3.93,Math.cos(a)*.69],[0,5.475,0]],'#66717a',.009,g);}cyl(g,.014,.26,colors.gold,0,5.57,0);return g;}
 function palace(){const g=W.group(-5.5,.22,1);g.name='palace-courtyard';g.userData.construction={start:10,end:26};const court=box(g,3.8,.10,3.5,'#b8aa8e');court.name='palace-open-courtyard';
  for(const x of [-1.65,1.65]){box(g,.42,1.35,3.1,colors.stone,x,.75,0);box(g,.6,.18,3.3,colors.dark,x,1.49,0);for(let i=0;i<8;i++){const z=-1.28+i*.36;arch(g,x+(x<0?.22:-.22),.35,z,.22,.68,x<0?Math.PI/2:-Math.PI/2);}}
  box(g,3.3,1.35,.43,colors.stone,0,.75,-1.42);box(g,3.6,.18,.62,colors.dark,0,1.49,-1.42);for(let i=0;i<8;i++)arch(g,-1.3+i*.37,.35,-1.19,.23,.68);
  for(const x of [-1.14,1.14])box(g,1.1,1.6,.47,colors.stone,x,.85,1.4);box(g,1.22,.52,.47,colors.stone,0,1.39,1.4);arch(g,0,.12,1.641,.62,.95,0,false);
  for(const x of [-1.57,1.57]){cyl(g,.30,1.95,colors.pale,x,1.04,1.42,.27,8);cyl(g,.38,1.08,colors.dark,x,2.55,1.42,0,8);arch(g,x,.8,1.71,.16,.40);}
  for(let i=0;i<14;i++)box(g,.13,.18,.18,colors.pale,-1.5+i*.23,1.73,1.4);
  cyl(g,.40,.08,colors.pale,0,.16,-.12);cyl(g,.27,.06,'#4e8586',0,.22,-.12);cyl(g,.06,.32,colors.pale,0,.38,-.12);return g;
 }
 return {roots:[hagia(),blue(),galata(),palace()],luminousMaterials:[glow]};
}
