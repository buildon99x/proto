// Bespoke Rome silhouettes. Shared normalized geometry keeps the city batchable.
export const TAU=Math.PI*2;
export function architecture(W){
 const T=W.THREE,cache=new Map(),materials=new Map();
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;const grainContext=grainCanvas.getContext('2d');grainContext.fillStyle='#eeeeeb';grainContext.fillRect(0,0,128,128);let grainSeed=315;for(let i=0;i<14500;i++){grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const q=grainSeed/4294967296,v=190+Math.floor(q*65);grainContext.fillStyle=`rgb(${v},${v},${v})`;grainContext.fillRect((i*47)%128,(i*29+Math.floor(q*128))%128,1+q*2,1+q*2);}const grain=W.own(new T.CanvasTexture(grainCanvas));grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(2,3);

 const ownGeo=(key,fn)=>{if(!cache.has(key))cache.set(key,W.own(fn()));return cache.get(key);};
 const mat=(color)=>{if(!materials.has(color))materials.set(color,W.own(new T.MeshStandardMaterial({color,roughness:.86,bumpMap:grain,bumpScale:.018})));return materials.get(color);};
 const window=W.own(new T.MeshStandardMaterial({color:'#34423b',emissive:'#ffbc57',emissiveIntensity:0,roughness:.62}));window.name='Rome warm windows';window.userData.romeLight=1;
 const dimWindow=W.own(new T.MeshStandardMaterial({color:'#4a4939',emissive:'#ffb956',emissiveIntensity:0,roughness:.68}));dimWindow.name='Rome softly lit windows';dimWindow.userData.romeLight=.38;
 const darkWindow=W.own(new T.MeshStandardMaterial({color:'#31423c',roughness:.72}));
 const lamp=W.own(new T.MeshStandardMaterial({color:'#f5dca1',emissive:'#ffc567',emissiveIntensity:0,roughness:.55}));lamp.name='Rome lanterns';lamp.userData.romeLight=2.1;
 const glow=W.own(new T.MeshStandardMaterial({color:'#c4a779',emissive:'#ffa84b',emissiveIntensity:0,roughness:.9}));glow.name='Rome architectural uplighting';glow.userData.romeLight=.34;
 const blockGeo=ownGeo('box',()=>new T.BoxGeometry(1,1,1));
 function mesh(geo,material,parent,x=0,y=0,z=0){const o=new T.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 function block(w,h,d,material,x,y,z,g){const o=mesh(blockGeo,typeof material==='string'?mat(material):material,g,x,y,z);o.scale.set(w,h,d);return o;}
 function arch(w,h,depth,g,x=0,y=0,z=0,color='#d5c4a5'){
  const archGeo=ownGeo('arch',()=>{const s=new T.Shape();s.moveTo(-.64,0);s.lineTo(-.64,.5);s.absarc(0,.5,.64,Math.PI,0,true);s.lineTo(.64,0);s.lineTo(.48,0);s.lineTo(.48,.5);s.absarc(0,.5,.48,0,Math.PI,false);s.lineTo(-.48,0);s.closePath();return new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:10});});
  const o=mesh(archGeo,typeof color==='string'?mat(color):color,g,x,y,z-depth/2);o.scale.set(w/1.28,h/1.14,depth);return o;
 }
 function column(g,x,z,h=.9,r=.055,y=.1,color='#d9cbb2'){
  W.cylinder(r*1.4,.08,color,x,y+.04,z,g,8);W.cylinder(r,h-.14,color,x,y+h/2,z,g,12);W.box(r*2.8,.085,r*2.8,color,x,y+h-.04,z,g);
 }
 function dome(g,r,y,scaleY=1,color='#929985'){
  const geo=ownGeo('dome',()=>new T.SphereGeometry(1,40,20,0,TAU,0,Math.PI/2));const d=mesh(geo,mat(color),g,0,y,0);d.scale.set(r,r*scaleY,r);
  for(let k=0;k<16;k++){const a=k/16*TAU;const points=Array.from({length:12},(_,i)=>{const p=i/11*Math.PI/2;return[Math.sin(a)*Math.cos(p)*r,y+Math.sin(p)*r*scaleY,Math.cos(a)*Math.cos(p)*r];});W.line(points,'#d1c7ad',.018,g);}
  return d;
 }
 function pediment(g,w,h,z,y,color='#e3d4b7'){
  const geo=ownGeo('triangle',()=>{const s=new T.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(0,1);s.closePath();return new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false});});const o=mesh(geo,mat(color),g,0,y,z);o.scale.set(w,h,.11);W.box(w+.07,.065,.18,'#e4d5ba',0,y,z+.04,g);
 }
 function roof(g,w,d,y,color='#a75536'){
  const geo=ownGeo('roof',()=>{const q=new T.BufferGeometry();q.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,0,1,-.5,-.5,0,.5,0,1,.5,.5,0,.5,-.5,0,-.5,0,1,-.5,0,1,.5,-.5,0,-.5,0,1,.5,-.5,0,.5,.5,0,-.5,.5,0,.5,0,1,.5,.5,0,-.5,0,1,.5,0,1,-.5],3));q.computeVertexNormals();return q;});const rise=Math.min(w*.28,.24),r=mesh(geo,mat(color),g,0,y,0);r.scale.set(w,rise,d);
  const tiles=W.group(0,0,0,g);tiles.name='rome-roof-tiles';
  for(let i=0,n=Math.max(5,Math.ceil(d/.085));i<=n;i++){const z=(i/n-.5)*d;W.line([[-w*.49,y+.008,z],[0,y+rise+.01,z],[w*.49,y+.008,z]],'#b9754d',.008,tiles);}
  W.line([[0,y+rise+.015,-d/2],[0,y+rise+.015,d/2]],'#c38559',.018,tiles);
 }
 function house(x,z,w,d,h,seed,parent){
  const g=W.group(x,.13,z,parent);g.name=`rome-house-${seed}`;g.rotation.y=Math.sin(seed*1.7)*.12;
  const colors=['#d8b878','#c6a174','#cfa36c','#b98659','#dfc394','#ce9a72'];block(w+.10,.035,d+.10,'#cdbb98',0,0,0,g);block(w,h,d,colors[seed%colors.length],0,h/2,0,g);block(w+.05,.06,d+.05,'#dec79e',0,h,0,g);roof(g,w+.08,d+.08,h+.035,['#a85638','#b66e43','#945034'][seed%3]);
  const floors=Math.max(2,Math.round(h/.29)),cols=Math.max(2,Math.floor(w/.25));for(let f=1;f<floors;f++)block(w+.026,.019,d+.026,'#ddc79f',0,f*h/floors,0,g);
  for(let f=0;f<floors;f++)for(let j=0;j<cols;j++){const xx=(j/(cols-1)-.5)*w*.72,yy=.13+f*(h-.15)/floors,glass=(seed+f*7+j)%5===0?darkWindow:(seed+f+j)%3===0?dimWindow:window;block(.085,.13,.016,glass,xx,yy,d/2+.012,g);block(.14,.022,.04,'#decaab',xx,yy-.076,d/2+.026,g);if(seed%3!==0){for(const s of [-1,1])block(.035,.13,.025,'#4b5c45',xx+s*.065,yy,d/2+.022,g);}block(.085,.13,.016,glass,xx,yy,-d/2-.012,g);}
  for(const side of [-1,1])for(let f=0;f<floors;f++)for(const zz of [-d*.26,d*.26])block(.016,.13,.085,(seed+f+side)%3===0?darkWindow:dimWindow,side*(w/2+.012),.13+f*(h-.15)/floors,zz,g);
  block(.12,.22,.024,'#514d3f',0,.11,d/2+.025,g);W.box(.1,.19,.1,'#b4865a',w*.25,h+.13,-d*.2,g);return g;
 }
 function colosseum(x,z){
  const g=W.group(x,.15,z);g.name='colosseum';g.rotation.y=-.14;const rx=2.9,rz=2.08;
  for(const [radius,yy,color] of [[1.04,.04,'#c5b18c'],[.96,.12,'#ac9775']]){const p=W.cylinder(1,.12,color,0,yy,0,g,96);p.scale.x=rx*radius;p.scale.z=rz*radius;}
  const floor=W.cylinder(1,.03,'#b89c6b',0,.2,0,g,80);floor.scale.x=1.5;floor.scale.z=.90;const hypogeum=W.group(0,.22,0,g);hypogeum.name='colosseum-hypogeum';for(const zz of [-.60,-.28,.04,.36,.64])block(2.3-Math.abs(zz)*.8,.20,.06,'#a28e67',0,.10,zz,hypogeum);for(let i=0;i<9;i++){const xx=-1.15+i*.28;block(.07,.18,1.30-Math.abs(xx)*.35,'#c0ac82',xx,.09,0,hypogeum);if(i%2===0)arch(.21,.23,.07,hypogeum,xx,0,.67,'#b7a078');}
  for(let row=0;row<3;row++)for(let i=0;i<68;i++){
   const a=i/68*TAU,broken=row===2&&i>5&&i<21;if(broken)continue;const cell=W.group(Math.sin(a)*rx,.17+row*.6,Math.cos(a)*rz,g);cell.rotation.y=Math.atan2(Math.sin(a)/rx,Math.cos(a)/rz);
   arch(.245,.55,.20,cell,0,0,0,row%2?'#c5b18d':'#d4c2a0');block(.33,.065,.24,glow,0,.565,0,cell);column(cell,-.14,.125,.52,.024,0,'#e1cfab');block(.13,.26,.025,dimWindow,0,.14,-.10,cell);
  }
  for(let i=0;i<68;i++){if(i>5&&i<21)continue;const a=i/68*TAU,c=W.group(Math.sin(a)*rx,1.97,Math.cos(a)*rz,g);c.rotation.y=Math.atan2(Math.sin(a)/rx,Math.cos(a)/rz);block(.32,.38,.23,'#c2ab86',0,.13,0,c);block(.07,.12,.025,window,0,.13,.13,c);block(.34,.07,.27,'#d5c29d',0,.35,0,c);}
  for(let level=0;level<5;level++){
   const r=1.18+level*.23,ring=W.ring(r,'#c5b391',0,.26+level*.17,0,g,.11);ring.scale.set(1.37,1,1); // torus XY becomes ellipse in world XZ
  }
  for(let i=0;i<32;i++){const a=i/32*TAU;const c=W.group(Math.sin(a)*2.18,.35,Math.cos(a)*1.46,g);c.rotation.y=a;arch(.22,.6,.12,c,0,0,0,'#ae9c7c');}
  return g;
 }
 function basilica(x,z){
  const g=W.group(x,.15,z);g.name='st-peters-basilica';
  block(2.75,.95,2.6,'#cdbb9b',0,.48,-.7,g);block(1.45,1.25,2.8,'#d4c3a4',0,.63,-.7,g);roof(g,1.5,2.9,1.28,'#a98469');
  const dg=W.group(0,0,-1.0,g);W.cylinder(.73,.44,'#d1c2a5',0,1.63,0,dg,48);dome(dg,.85,1.85,1.10,'#859085');
  for(let i=0;i<16;i++){const a=i/16*TAU;column(dg,Math.sin(a)*.75,Math.cos(a)*.75,.38,.04,1.45);const o=block(.11,.23,.04,window,Math.sin(a)*.737,1.66,Math.cos(a)*.737,dg);o.rotation.y=a;}
  W.cylinder(.14,.25,'#cdbf9d',0,2.87,0,dg,12);dome(dg,.16,2.99,.9,'#8e9785');W.box(.035,.36,.035,'#c2a66a',0,3.25,0,dg);W.box(.18,.027,.027,'#c2a66a',0,3.29,0,dg);
  block(3.3,1.25,.4,'#dfcfaf',0,.65,.68,g);block(3.45,.12,.55,'#e4d4b5',0,1.25,.71,g);block(3.35,.16,.48,'#c2af8d',0,1.39,.69,g);
  for(let i=0;i<12;i++)column(g,-1.48+i*.27,.94,1.16,.054,.12,'#e8d9bb');
  for(const xx of [-1.1,-.55,0,.55,1.1]){arch(.36,.6,.12,g,xx,.15,.92);block(.18,.38,.025,window,xx,.35,.885,g);block(.15,.22,.025,window,xx,1.04,.9,g);}
  const relief=W.group(0,0,0,g);relief.name='basilica-facade-relief';for(const y of [.32,.95,1.14])block(3.34,.027,.045,'#c6b28b',0,y,.922,relief);
  for(const xx of [-1.1,-.55,0,.55,1.1]){for(const side of [-1,1])block(.025,.25,.045,'#efdfbd',xx+side*.12,1.035,.945,relief);pediment(relief,.28,.08,.955,1.17);block(.30,.075,.04,'#c2ad86',xx,.76,.95,relief);}
  for(const side of [-1,1]){for(let j=0;j<6;j++){const bay=W.group(side*1.4,0,-.1-j*.36,g);bay.rotation.y=side*Math.PI/2;arch(.26,.52,.08,bay,0,.35,0);block(.10,.27,.02,window,0,.5,-.01,bay);block(.32,.055,.16,'#ddccaa',0,.9,0,bay);}const clock=W.cylinder(.105,.026,'#e9dfc6',side*1.5,1.59,.67,g,24);clock.rotation.x=Math.PI/2;W.line([[side*1.5-.045,1.59,.689],[side*1.5,1.59,.689],[side*1.5,1.65,.689]],'#646051',.008,g);}
  pediment(g,1.4,.32,.99,1.39);for(let i=0;i<12;i++){W.cylinder(.024,.13,'#dfd0b1',-1.5+i*.27,1.62,.72,g,6);W.ball(.036,'#eadbc0',-1.5+i*.27,1.72,.72,g);}
  for(const side of [-1,1]){const tower=W.group(side*1.5,0,.42,g);block(.41,.3,.44,'#c5b69a',0,1.56,0,tower);dome(tower,.26,1.73,1.4,'#8b9587');}
  const plaza=W.group(x,.13,z+2.35);plaza.name='st-peters-colonnade';const pave=W.cylinder(1,.035,'#c4baa5',0,0,0,plaza,96);pave.scale.x=2.6;pave.scale.z=1.82;
  for(let row=0;row<2;row++)for(let i=0;i<78;i++){const a=.32+i/77*(TAU-.64),r=1+row*.08;const xx=Math.sin(a)*2.55*r,zz=-Math.cos(a)*1.75*r;column(plaza,xx,zz,.67,.047,.03);const cap=block(.24,.10,.21,'#dfcfad',xx,.74,zz,plaza);cap.rotation.y=-a;if(i%3===0&&row===1){W.cylinder(.018,.11,'#e0d2b9',xx,.85,zz,plaza,6);W.ball(.028,'#e0d2b9',xx,.93,zz,plaza);}}
  W.box(.27,.16,.27,'#b0a18a',0,.1,0,plaza);const ob=W.cylinder(.065,1.18,'#bfae8a',0,.75,0,plaza,4);W.ball(.035,'#d1b65c',0,1.36,0,plaza);
  return g;
 }
 function pantheon(x,z){
  const g=W.group(x,.14,z);g.name='pantheon';W.cylinder(1.06,1.14,'#bba98a',0,.57,-.31,g,64);W.cylinder(1.13,.12,'#d4c3a0',0,1.14,-.31,g,64);const dg=W.group(0,0,-.31,g);dome(dg,1.13,1.19,.43,'#a99f86');
  // The oculus is an actual dark opening marker at the crown, not a spire.
  W.cylinder(.11,.012,'#464b46',0,1.68,-.31,g,32);
  for(let step=0;step<4;step++)block(2.12+step*.12,.05,1.25+step*.10,'#c4b798',0,.04+step*.035,1.04,g);
  for(let row=0;row<2;row++)for(let i=0;i<8;i++)column(g,-.94+i*.269,.66+row*.55,1.05,.062,.15,'#d9cbb1');
  block(2.25,.17,.88,'#d9c8a7',0,1.23,1.0,g);pediment(g,2.3,.49,1.45,1.31);roof(g,2.29,1.06,1.3,'#b6a48a');
  block(.55,.83,.028,window,0,.52,.75,g);return g;
 }
 function castel(x,z){const g=W.group(x,.14,z);g.name='castel-sant-angelo';W.cylinder(1.1,.24,'#a99b80',0,.12,0,g,64);W.cylinder(.97,.72,'#b49e76',0,.6,0,g,64);W.cylinder(1.03,.10,'#d3bd91',0,1.0,0,g,64);for(let i=0;i<32;i++){const a=i/32*TAU;W.box(.09,.15,.09,'#cfb78c',Math.sin(a),1.12,Math.cos(a),g);}block(.86,.42,.7,'#b69366',0,1.24,-.15,g);roof(g,.94,.77,1.47,'#9c6240');for(let i=0;i<16;i++){const a=i/16*TAU;const o=block(.085,.17,.018,window,Math.sin(a)*.976,.66,Math.cos(a)*.976,g);o.rotation.y=a;}W.cylinder(.026,.4,'#53675b',0,1.73,-.12,g,8);const wings=W.box(.36,.07,.035,'#53675b',0,1.84,-.12,g);wings.rotation.z=.2;return g;}
 function forum(x,z){
  const g=W.group(x,.15,z);g.name='roman-forum';block(4.3,.08,3.35,'#b8ac87',0,0,0,g);for(let n=0;n<4;n++){const temple=W.group(-1.25+(n%2)*2.0,0,-.85+Math.floor(n/2)*1.7,g);temple.rotation.y=n%2?.08:-.12;block(1.4,.18,1.04,'#c9b895',0,.14,0,temple);for(let i=0;i<6;i++)column(temple,-.56+i*.225,.38,1.0+(n%2)*.24,.052,.22,'#d2c3a1');if(n!==1){block(1.48,.12,.26,'#c7b490',0,1.29+(n%2)*.24,.38,temple);if(n===0)pediment(temple,1.5,.27,.38,1.35);}for(const side of [-1,1])for(let j=0;j<3;j++)column(temple,side*.56,-.37+j*.3,.5+((n+j)%3)*.22,.05,.2,'#bfae8c');}
  for(let i=0;i<28;i++){const xx=-2+(i%7)*.57,zz=-1.4+Math.floor(i/7)*.85;block(.18+(i%3)*.07,.12+(i%4)*.06,.13,'#c7b593',xx,.1,zz,g);}return g;
 }
 function constantine(x,z){const g=W.group(x,.14,z);g.name='arch-of-constantine';arch(.65,1.02,.48,g,0,.02,0);for(const side of [-1,1])arch(.38,.72,.44,g,side*.66,.02,0);block(2.02,.43,.58,'#d0be9d',0,1.17,0,g);block(2.12,.09,.65,'#e2d1ac',0,1.43,0,g);for(const xx of [-.94,-.42,.42,.94]){column(g,xx,.31,1.02,.045,.04);block(.14,.20,.04,'#b2a180',xx,1.17,.31,g);}return g;}
 function spanish(x,z){const g=W.group(x,.14,z);g.name='spanish-steps';for(let i=0;i<19;i++){const yy=i*.035,zz=.85-i*.105,w=1.35+Math.sin(i/18*Math.PI)*.55;block(w,.035,.17,'#d8c8a7',0,yy,zz,g);}block(1.5,.92,.65,'#dcccb0',0,1.1,-1.2,g);for(const s of [-1,1]){block(.34,1.55,.42,'#dfceb0',s*.58,1.25,-1.22,g);block(.18,.22,.025,window,s*.58,1.77,-.99,g);const tip=W.cylinder(.23,.28,'#a18e72',s*.58,2.16,-1.22,g,4);tip.rotation.y=Math.PI/4;}pediment(g,.7,.22,-.85,1.56);return g;}
 function cypress(x,z,s=1,parent){const g=W.group(x,.13,z,parent);g.name='rome-gardens';W.cylinder(.045*s,.48*s,'#725e42',0,.24*s,0,g,7);for(let i=0;i<3;i++){const o=W.ball(1,['#355132','#415c31','#2e4b30'][i],0,(.56+i*.22)*s,0,g);o.scale.set(.16*s,.44*s,.16*s);}return g;}
 function pine(x,z,s=1,parent){const g=W.group(x,.13,z,parent);g.name='rome-gardens';W.cylinder(.045*s,.75*s,'#826b48',0,.375*s,0,g,7);for(let i=0;i<9;i++){const a=i/9*TAU,outer=i%3!==0,o=W.ball(1,['#536b35','#647939','#436337'][i%3],Math.sin(a)*(outer?.23:.09)*s,(.80+(i%3)*.045)*s,Math.cos(a)*(outer?.23:.09)*s,g);o.scale.set((outer?.24:.29)*s,.17*s,.24*s);}return g;}
 return{mesh,mat,block,arch,column,dome,pediment,roof,house,colosseum,basilica,pantheon,castel,forum,constantine,spanish,cypress,pine,window,lamp,glow};
}
