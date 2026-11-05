/** Original, resource-owned Paris miniature. Repeated masonry and lattice share geometry. */
export function buildParisLandmarks(W){
 const T=W.THREE,illuminated=[],roots=[],geometries=new Map(),materials=new Map();
 const geo=(key,make)=>{if(!geometries.has(key))geometries.set(key,W.own(make()));return geometries.get(key);};
 function mat(color,glow=0,metal=0){const key=[color,glow,metal].join();if(!materials.has(key)){const m=W.own(new T.MeshStandardMaterial({color,roughness:.72,metalness:metal,emissive:glow?color:0,emissiveIntensity:0}));if(glow){m.userData.nightIntensity=glow;illuminated.push(m);}materials.set(key,m);}return materials.get(key);}
 const stone=mat('#d9cbb2',.22),trim=mat('#eee1c7',.25),roof=mat('#697782'),dark=mat('#36454c'),gold=mat('#ab8051',.9,.45),lit=mat('#ffcd78',2.3),white=mat('#ece7d9',.28);
 function mesh(g,m,p,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 function box(p,w,h,d,m,x=0,y=0,z=0){const o=mesh(geo('box',()=>new T.BoxGeometry(1,1,1)),m,p,x,y,z);o.scale.set(w,h,d);return o;}
 function cyl(p,r,h,m,x=0,y=0,z=0,n=16,top=1){const o=mesh(geo(`cyl${n}/${top}`,()=>new T.CylinderGeometry(top,1,1,n)),m,p,x,y,z);o.scale.set(r,h,r);return o;}
 function beam(p,a,b,r,m=gold){const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);const o=cyl(p,r,delta.length(),m,...va.add(vb).multiplyScalar(.5).toArray(),5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function group(p,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
 function root(name,x,y,z){const g=W.group(x,y,z);g.name=name;g.userData.stage='architecture';roots.push(g);return g;}
 function archShape(w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;}
 function window(p,x,y,z,w=.12,h=.32,m=dark){const key=`arch${w}/${h}`;return mesh(geo(key,()=>new T.ShapeGeometry(archShape(w,h),8)),m,p,x,y,z);}
 function gable(p,w,h,d,m,x,y,z){const key=`gable/${w}/${h}/${d}`;const g=geo(key,()=>{const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,w/2,0,d/2,0,h,d/2],3));b.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);b.computeVertexNormals();return b;});return mesh(g,m,p,x,y,z);}
 function cross(p,x,y,z,size=.16){box(p,.026,size,.026,trim,x,y,z);box(p,size*.65,.026,.026,trim,x,y+size*.12,z);}
 function bands(p,w,d,ys,m=trim){for(const y of ys)box(p,w,.055,d,m,0,y,0);}
 // Eiffel: four splayed, open truss legs meet at two observation decks.
 const e=root('eiffel-tower',-4.6,.18,.3),lattice=group(e);e.scale.y=1.18;lattice.name='eiffel-lattice';
 const levels=[[0,1.28],[1.62,.72],[2.0,.65],[3.25,.38],[3.5,.32],[6.38,.12],[6.65,.09]];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  for(let k=0;k<levels.length-1;k++){
   const [ya,ra]=levels[k],[yb,rb]=levels[k+1],n=Math.ceil((yb-ya)/.24);
   const widthA=k<2?.23:.09,widthB=k<2?.14:.045;
   for(const side of [-1,1])beam(lattice,[sx*ra+side*widthA/2,ya,sz*ra],[sx*rb+side*widthB/2,yb,sz*rb],k<2?.035:.019);
   for(let j=0;j<n;j++){
    const u=j/n,v=(j+1)/n,ry=ya+(yb-ya)*u,ny=ya+(yb-ya)*v,r=ra+(rb-ra)*u,nr=ra+(rb-ra)*v,ww=widthA+(widthB-widthA)*u,nw=widthA+(widthB-widthA)*v;
    beam(lattice,[sx*r-ww/2,ry,sz*r],[sx*nr+nw/2,ny,sz*nr],.012);beam(lattice,[sx*r+ww/2,ry,sz*r],[sx*nr-nw/2,ny,sz*nr],.012);
   }
  }
  box(e,.49,.13,.49,stone,sx*1.28,.04,sz*1.28);
 }
 for(let k=1;k<levels.length-1;k++){
  const [ya,ra]=levels[k],[yb,rb]=levels[k+1],n=Math.ceil((yb-ya)/.25);
  for(let j=0;j<n;j++){const u=j/n,v=(j+1)/n,r=ra+(rb-ra)*u,nr=ra+(rb-ra)*v,y=ya+(yb-ya)*u,ny=ya+(yb-ya)*v;
   for(const side of [-1,1]){beam(lattice,[-r,y,side*r],[nr,ny,side*nr],.012);beam(lattice,[r,y,side*r],[-nr,ny,side*nr],.012);beam(lattice,[side*r,y,-r],[side*nr,ny,nr],.012);beam(lattice,[side*r,y,r],[side*nr,ny,-nr],.012);}
  }
 }
 // Sweeping curved arches leave all four ground openings clear.
 for(let face=0;face<4;face++){const a=group(e);a.rotation.y=face*Math.PI/2;for(let j=0;j<16;j++){const x0=-1.23+j*2.46/16,x1=-1.23+(j+1)*2.46/16;const y=x=>.12+1.34*Math.sqrt(Math.max(0,1-(x/1.25)**2));beam(a,[x0,y(x0),1.05],[x1,y(x1),1.05],.045);}}
 for(const [y,w] of [[1.65,1.70],[3.3,.98],[6.4,.40]]){
  box(e,w,.15,w,gold,0,y,0);box(e,w+.06,.035,w+.06,lit,0,y+.09,0);
  for(let side=0;side<4;side++){const railing=group(e,0,0,0);railing.rotation.y=side*Math.PI/2;for(let i=0;i<12;i++)box(railing,.016,.16,.018,gold,-w/2+i*w/11,y+.19,w/2);box(railing,w,.018,.018,gold,0,y+.27,w/2);}
 }
 cyl(e,.06,.58,gold,0,6.83,0,8);beam(e,[0,6.8,0],[0,7.3,0],.012);for(let i=0;i<3;i++)box(e,.1,.17,.008,mat(['#234789','#eee9dc','#d44b44'][i]),.06+i*.1,7.16,0);
 // Notre-Dame, west facade facing the viewer (+z).
 const n=root('notre-dame',-.3,.19,-.6);box(n,2.28,.14,3.1,stone,0,.07,0);
 box(n,1.3,1.6,2.65,stone,0,.9,-.08);gable(n,1.48,.72,2.8,roof,0,1.7,-.1);
 box(n,2.12,1.75,.42,stone,0,.98,1.22);bands(n,2.2,.53,[.22,.85,1.5,1.87]);
 for(const x of [-.72,.72]){
  const tower=group(n,x,0,1.08);box(tower,.65,3.05,.68,stone,0,1.6,0);bands(tower,.74,.77,[1.65,2.2,3.08,3.26]);
  for(const face of [-1,1])for(const dx of [-.16,.16]){window(tower,dx,2.36,face*.351,.20,.57);if(face<0)tower.children.at(-1).rotation.y=Math.PI;}
  for(const dx of [-.30,.30])for(const dz of [-.31,.31])box(tower,.075,3.07,.075,trim,dx,1.68,dz);
  for(let i=0;i<6;i++)box(tower,.065,.13,.07,trim,-.30+i*.12,3.37,.36);
 }
 for(const x of [-.62,0,.62]){window(n,x,.18,1.445,.44,.75);for(const s of [-1,1])box(n,.045,.74,.1,trim,x+s*.24,.55,1.47);}
 const rose=mesh(geo('rose-ring',()=>new T.TorusGeometry(.27,.046,7,32)),trim,n,0,1.4,1.48);rose.name='rose-window';
 const glass=mesh(geo('rose-glass',()=>new T.CircleGeometry(.235,24)),lit,n,0,1.4,1.465);for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(n,[0,1.4,1.49],[Math.cos(a)*.24,1.4+Math.sin(a)*.24,1.49],.013,trim);}
 for(let i=0;i<13;i++){box(n,.05,.28,.055,trim,-.55+i*.09,1.97,1.48);window(n,-.51+i*.085,1.68,1.48,.055,.15);}
 for(const side of [-1,1])for(let j=0;j<6;j++){
  const z=-1.25+j*.42;box(n,.10,1.45,.13,trim,side*1.01,.84,z);beam(n,[side*.68,1.97,z],[side*1.01,1.24,z],.065,trim);gable(n,.19,.3,.21,trim,side*1.01,1.58,z);const win=window(n,0,.73,.67,.18,.69);win.rotation.y=side*Math.PI/2;win.position.set(side*.66,.74,z);
 }
 cyl(n,.08,1.1,roof,0,2.65,-.45,8,0);cross(n,0,3.24,-.45,.24);
 // Louvre palace with repeated pilasters, dormers and a transparent lattice pyramid.
 const l=root('louvre',-.3,.19,3.6);box(l,4.05,.12,.91,stone,0,.06,0);box(l,3.88,1.12,.7,stone,0,.67,0);
 for(const y of [.2,.65,1.15,1.24])box(l,4,.055,.78,trim,0,y,0);
 gable(l,4.02,.43,.85,roof,0,1.25,0);
 for(let i=0;i<20;i++){const x=-1.82+i*.192;for(const side of [-1,1]){window(l,x,.25,side*.356,.10,.30);window(l,x,.76,side*.356,.1,.29);box(l,.035,.97,.035,trim,x+.075,.72,side*.38);}}
 for(const x of [-1.78,0,1.78]){box(l,.45,1.35,.89,stone,x,.78,0);gable(l,.61,.51,1.03,roof,x,1.46,0);window(l,x,.38,.46,.20,.70);box(l,.66,.06,1.02,trim,x,1.45,0);}
 for(let i=0;i<11;i++){const x=-1.65+i*.33;box(l,.15,.19,.15,stone,x,1.51,.24);gable(l,.19,.10,.19,trim,x,1.60,.24);box(l,.07,.1,.015,dark,x,1.54,.323);}
 const pyramid=group(l,-1.2,0,1.3);pyramid.name='glass-pyramid';const glassMat=W.own(new T.MeshPhysicalMaterial({color:'#9ab9c0',roughness:.15,metalness:.15,transparent:true,opacity:.45,side:T.DoubleSide}));
 const vertices=[-.82,0,-.82,.82,0,-.82,.82,0,.82,-.82,0,.82,0,.93,0],pg=W.own(new T.BufferGeometry());pg.setAttribute('position',new T.Float32BufferAttribute(vertices,3));pg.setIndex([0,4,1,1,4,2,2,4,3,3,4,0]);pg.computeVertexNormals();mesh(pg,glassMat,pyramid);
 box(pyramid,1.76,.07,1.76,trim,0,.035,0);
 for(let f=0;f<4;f++){const face=group(pyramid);face.rotation.y=f*Math.PI/2;for(let j=0;j<=9;j++){const t=j/9,half=.82*(1-t),y=.93*t,z=.82*(1-t);beam(face,[-half,y,z],[half,y,z],.009,trim);beam(face,[-.82+j*1.64/9,0,.82],[0,.93,0],.008,trim);}}
 // Arc: the opening is a cut-out through the whole monument, not a black decal.
 const a=root('arc-de-triomphe',2.6,.19,5.9);cyl(a,1.09,.07,stone,0,.035,0,40);const shape=new T.Shape();shape.moveTo(-.79,0);shape.lineTo(.79,0);shape.lineTo(.79,1.87);shape.lineTo(-.79,1.87);shape.closePath();
 const hole=new T.Path();hole.moveTo(-.34,.005);hole.lineTo(-.34,1.01);hole.absarc(0,1.01,.34,Math.PI,0,true);hole.lineTo(.34,.005);hole.closePath();shape.holes.push(hole);
 const am=mesh(W.own(new T.ExtrudeGeometry(shape,{depth:1.04,bevelEnabled:false,curveSegments:16})),stone,a,0,.08,-.52);am.name='triumphal-arch';
 for(const y of [1.61,1.83,1.95,2.1])box(a,1.73,.07,1.17,trim,0,y,0);box(a,1.55,.25,1.03,stone,0,2,0);
 for(const side of [-1,1]){
  for(const x of [-.57,.57]){box(a,.27,.68,.05,trim,x,.53,side*.55);for(let i=0;i<4;i++){cyl(a,.035,.28,stone,x-.09+i*.06,.61,side*.59,6);mesh(geo('head',()=>new T.SphereGeometry(.045,6,4)),stone,a,x-.09+i*.06,.79,side*.59);}box(a,.27,.29,.05,trim,x,1.33,side*.55);}
  for(let i=0;i<12;i++)box(a,.07,.08,.02,stone,-.72+i*.13,1.76,side*.60);
 }
 // Sacré-Cœur: luminous Romanesque basilica, central onion dome and stepped chapels.
 const s=root('sacre-coeur',3.3,.95,-5);box(s,2.62,.14,2.18,stone,0,.07,0);box(s,1.8,1.25,1.7,white,0,.74,0);
 for(let i=0;i<5;i++)box(s,1.9+i*.1,.07, .15,trim,0,.29-i*.045,1.03+i*.13);
 function dome(p,x,z,r,y,h,name){cyl(p,r,.48,white,x,y+.24,z,24);for(let i=0;i<12;i++){const ang=i*Math.PI/6;const w=window(p,0,0,0,.09,.28);w.position.set(x+Math.sin(ang)*(r+.002),y+.10,z+Math.cos(ang)*(r+.002));w.rotation.y=ang;}
  const points=[];for(let i=0;i<=14;i++){const t=i/14;points.push(new T.Vector2(r*Math.cos(t*Math.PI/2)*(1-.1*Math.sin(t*Math.PI)),t*h));}const cap=mesh(geo(`dome${r}/${h}`,()=>new T.LatheGeometry(points,32)),white,p,x,y+.48,z);if(name)cap.name=name;
  for(let i=0;i<7;i++){const yy=i/7*h,rr=r*Math.cos(i/7*Math.PI/2)*(1-.1*Math.sin(i/7*Math.PI));const ring=mesh(geo(`dome-ring${r}/${h}/${i}`,()=>new T.TorusGeometry(rr,.013,5,32)),trim,p,x,y+.48+yy,z);ring.rotation.x=Math.PI/2;}cyl(p,.025,.15,trim,x,y+.48+h+.055,z,8,0);cross(p,x,y+.48+h+.16,z,.16);
 }
 dome(s,0,-.12,.49,1.45,.89,'central-dome');
 for(const x of [-.68,.68])for(const z of [-.55,.55]){cyl(s,.24,1.4,white,x,.8,z,12);dome(s,x,z,.25,1.35,.50);}
 const b=group(s,.88,0,-.65);box(b,.36,2.64,.40,white,0,1.39,0);bands(b,.43,.47,[1.8,2.35,2.65]);window(b,0,2.09,.21,.20,.42);gable(b,.48,.50,.48,white,0,2.72,0);cross(b,0,3.32,0,.16);
 box(s,1.02,.89,.37,white,0,.58,.95);gable(s,1.2,.50,.52,white,0,1.02,.93);
 for(const x of [-.35,0,.35]){window(s,x,.20,1.145,.22,.55);cyl(s,.035,.66,trim,x-.14,.53,1.17,8);}
 for(const side of [-1,1])for(let i=0;i<5;i++){const z=-.65+i*.3;const win=window(s,0,0,0,.13,.51);win.rotation.y=side*Math.PI/2;win.position.set(side*.91,.69,z);}
 return {roots,illuminated};
}
