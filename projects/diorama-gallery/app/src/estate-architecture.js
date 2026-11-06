/** Reference-inspired timber estate. All custom resources are shared and runtime-owned. */
export function buildEstateArchitecture(W) {
 const T=W.THREE,root=W.group(),buildings=[],corridors=[],geometries=new Map();root.name='estate-architecture';
 const material=color=>W.own(new T.MeshStandardMaterial({color,roughness:.92}));
 const timber=material('#513e31'),wood=material('#806046'),plaster=material('#d7cead'),stone=material('#a7a08a'),roofMat=material('#666761'),tile=material('#85867e'),dark=material('#302d26'),paper=material('#b8aa83');
 const geo=(key,create)=>{if(!geometries.has(key))geometries.set(key,W.own(create()));return geometries.get(key);};
 function group(p,x=0,y=0,z=0,name=''){const g=W.group(x,y,z,p);g.name=name;return g;}
 function mesh(p,g,m,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 function box(p,w,h,d,m,x=0,y=0,z=0){const o=mesh(p,geo('box',()=>new T.BoxGeometry(1,1,1)),m,x,y,z);o.scale.set(w,h,d);return o;}
 function beam(p,a,b,r,m=timber){const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va),o=mesh(p,geo('cylinder',()=>new T.CylinderGeometry(1,1,1,6)),m);o.position.copy(va.add(vb).multiplyScalar(.5));o.scale.set(r,delta.length(),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 // Curved tile slopes have a shallow concave profile and individually raised eave ends.
 function roof(p,w,d,y,rise=.65){
  const g=group(p,0,y,0,'estate-roof'),nx=12,nz=7;
  const point=(u,t,s)=>[u*w/2*(.77+.23*t),rise*(1-t)**1.9+.10*t**8+.10*Math.abs(u)**8*t**3,s*t*d/2];
  const geometry=geo(`roof/${w}/${d}/${rise}`,()=>{const pts=[],idx=[];
   for(const s of [-1,1]){const start=pts.length/3;for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)pts.push(...point(i/nx*2-1,j/nz,s));for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=start+j*(nx+1)+i,b=a+nx+1;idx.push(a,b,a+1,a+1,b,b+1);}}
   // Hip ends close the roof volume instead of leaving flat triangular gables.
   for(const side of [-1,1])for(let j=0;j<nz;j++){const a=pts.length/3;pts.push(...point(side,j/nz,-1),...point(side,(j+1)/nz,-1),...point(side,(j+1)/nz,1),...point(side,j/nz,1));idx.push(a,a+1,a+2,a,a+2,a+3);}
   const b=new T.BufferGeometry();b.setAttribute('position',new T.Float32BufferAttribute(pts,3));b.setIndex(idx);b.computeVertexNormals();return b;
  });
  // Double-sided tile skin avoids back-face gaps on under-eaves.
  roofMat.side=T.DoubleSide;mesh(g,geometry,roofMat);
  const ribs=Math.max(8,Math.round(w/.16));for(const s of [-1,1])for(let i=0;i<=ribs;i++){const u=i/ribs*2-1;for(let j=0;j<5;j++){const a=point(u,j/5,s),b=point(u,(j+1)/5,s);a[1]+=.023;b[1]+=.023;beam(g,a,b,.014,tile);}}
  for(const s of [-1,1]){for(let i=0;i<12;i++)beam(g,point(i/6-1,1,s),point((i+1)/6-1,1,s),.045,timber);for(const u of [-1,1])for(let j=0;j<5;j++)beam(g,point(u,j/5,s),point(u,(j+1)/5,s),.035,tile);}
  beam(g,[-w*.385,rise+.045,0],[w*.385,rise+.045,0],.065,tile);
  for(const side of [-1,1])beam(g,[side*w*.385,rise+.045,0],[side*(w*.385+.12),rise+.20,0],.045,tile);
  return g;
 }
 function window(p,x,y,z,w,h){box(p,w,h,.035,dark,x,y,z);box(p,w-.065,h-.07,.025,paper,x,y,z+.025);for(let i=0;i<=4;i++)box(p,.026,h,.04,timber,x-w/2+i*w/4,y,z+.05);for(let j=0;j<=3;j++)box(p,w,.025,.045,timber,x,y-h/2+j*h/3,z+.052);}
 function stairs(p,width,z,height=.32,n=4){for(let i=0;i<n;i++){const h=height*(n-i)/n;box(p,width+.07*i,h,.18,stone,0,h/2,z+.09+i*.18);}}
 function building(name,x,z,w,d,h=1.45,tier=false,open=false){
  const g=group(root,x,0,z,name);buildings.push(g);box(g,w+.30,.25,d+.34,stone,0,.125,0);box(g,w+.2,.09,d+.25,wood,0,.295,0);
  if(!open){box(g,w,.95*h,d*.77,plaster,0,.34+h*.475,-d*.065);box(g,w,.15,d*.79,wood,0,.43,-d*.065);}
  const bays=Math.max(2,Math.round(w/.85));for(let i=0;i<=bays;i++){const px=-w/2+i*w/bays;for(const s of [-1,1]){box(g,.105,h,.105,timber,px,.34+h/2,s*d*.44);box(g,.24,.08,.19,wood,px,h+.29,s*d*.44);box(g,.33,.065,.15,timber,px,h+.36,s*d*.44);}}
  for(const s of [-1,1])box(g,w+.22,.14,.12,timber,0,h+.32,s*d*.44);
  if(!open){for(let i=0;i<bays;i++){const px=-w/2+(i+.5)*w/bays;if(i===Math.floor(bays/2)){box(g,w/bays*.66,h*.76,.04,dark,px,.34+h*.38,d*.325);for(const side of [-1,1])box(g,.06,h*.79,.07,wood,px+side*w/bays*.34,.34+h*.395,d*.35);}else window(g,px,.39+h*.48,d*.325,w/bays*.72,h*.60);}}
  roof(g,w+.65,d+.7,h+.38,tier?.72:.59);stairs(g,Math.min(w*.5,1.65),d/2+.17);
  if(tier){box(g,w*.66,.65,d*.54,plaster,0,h+1.04,0);for(const s of [-1,1]){box(g,w*.7,.09,.08,timber,0,h+1.31,s*d*.28);for(let i=-2;i<=2;i++)window(g,i*w*.12,h+1.04,s*d*.275,w*.105,.40);}
   roof(g,w*.86,d*.82,h+1.37,.85);
  }
  return g;
 }
 building('estate-main-hall',0,5.5,5.25,3.05,1.85,true);
 building('estate-dining-hall',0,-5,3.8,2.55,1.65,true);
 building('estate-storehouse',2,-10.4,3.45,2.1,1.63);
 const kitchen=building('estate-kitchen',-2,-10.5,2.4,1.9,1.38);box(kitchen,.26,1.7,.32,stone,-.7,2.15,-.4);box(kitchen,.35,.12,.41,roofMat,-.7,3.02,-.4);
 building('estate-utility',-5.8,-10.5,2.5,2.1,1.42);
 building('estate-stable',5.9,-10,2.75,2.5,1.35,false,true);
 building('estate-residence',-5.6,-4.8,2.8,2.5,1.42);
 building('estate-library',-5.7,-.9,2.75,2.1,1.3);
 building('estate-guest-house',-5.9,3.4,2.55,2.15,1.4);
 building('estate-residence',5.8,-4.3,2.6,2.7,1.45);
 building('estate-residence',5.8,-.2,2.55,2.1,1.27);
 building('estate-guest-house',5.9,3.6,2.5,2.05,1.35);
 function corridor(x,z,length,rotation=0){const g=group(root,x,0,z,'estate-corridor');g.rotation.y=rotation;corridors.push(g);box(g,length,.12,.88,stone,0,.06,0);const bays=Math.ceil(length/.9);for(let i=0;i<=bays;i++)for(const side of [-1,1]){const px=-length/2+i*length/bays;box(g,.075,1.28,.075,timber,px,.73,side*.34);box(g,.16,.08,.14,wood,px,1.37,side*.34);}
  for(const side of [-1,1]){box(g,length,.09,.09,timber,0,1.39,side*.34);box(g,length,.055,.055,wood,0,.60,side*.34);}roof(g,length+.25,1.12,1.45,.25);return g;
 }
 // Continuous garden walks framing the axial courtyards, with the central path left open.
 for(const side of [-1,1]){corridor(side*5.35,2,5.4);corridor(side*5.25,-7,5.4);corridor(side*2.7,-2.5,9,Math.PI/2);corridor(side*5.25,6.0,4.5);}
 function wall(x,z,len,rotation=0){const g=group(root,x,0,z,'estate-perimeter-wall');g.rotation.y=rotation;box(g,len,.23,.30,stone,0,.115,0);box(g,len,.81,.19,plaster,0,.635,0);for(let i=0;i<=Math.ceil(len/1.35);i++)box(g,.075,1.02,.24,timber,-len/2+i*len/Math.ceil(len/1.35),.63,0);box(g,len,.08,.25,timber,0,1.08,0);roof(g,len+.10,.43,1.12,.12);}
 wall(-8.1,0,24.6,Math.PI/2);wall(8.1,0,24.6,Math.PI/2);wall(0,-12.15,16.2);wall(-5.05,12.15,6.1);wall(5.05,12.15,6.1);
 const gate=group(root,0,0,11.8,'estate-gate');buildings.push(gate);
 for(const x of [-1.65,1.65]){box(gate,.24,1.8,.29,timber,x,.9,0);box(gate,.37,.18,.43,stone,x,.09,0);box(gate,.32,.95,.10,wood,x+Math.sign(x)*.25,.65,0);}
 box(gate,3.65,.20,.32,timber,0,1.75,0);roof(gate,4.1,1.35,1.88,.5);stairs(gate,3.25,.48,.14,3);
 return {root,buildings,corridors};
}
