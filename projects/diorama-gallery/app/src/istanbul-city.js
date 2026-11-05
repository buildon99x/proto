import {waterMaterial} from './dubai-water.js';
const TAU=Math.PI*2;
/** The waterfront is authored geometry; no reference image is used as a texture. */
export function buildCity(W){
 const T=W.THREE,materials=[],lights=[],boxGeo=W.own(new T.BoxGeometry(1,1,1));
 const glow=W.own(new T.MeshStandardMaterial({color:'#ffdc95',emissive:'#ffbb53',emissiveIntensity:1.7,roughness:.5}));materials.push(glow);
 const redGlow=W.own(new T.MeshStandardMaterial({color:'#f1b971',emissive:'#ffac38',emissiveIntensity:.7}));materials.push(redGlow);
 function litBox(w,h,d,x,y,z,g,mat=glow){const m=new T.Mesh(boxGeo,mat);m.scale.set(w,h,d);m.position.set(x,y,z);g.add(m);return m;}
 function named(name,x=0,y=0,z=0){const g=W.group(x,y,z);g.name=name;return g;}
 function raw(geo,mat,g,x=0,y=0,z=0){const m=new T.Mesh(W.own(geo),W.own(mat));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 const base=named('istanbul-base');
 const baseShape=new T.Shape();baseShape.moveTo(-8.05,-8.0);baseShape.lineTo(.8,-8);baseShape.lineTo(8.05,-3.5);baseShape.lineTo(8.05,12.3);baseShape.quadraticCurveTo(8.05,12.85,7.5,12.85);baseShape.lineTo(-7.5,12.85);baseShape.quadraticCurveTo(-8.05,12.85,-8.05,12.3);baseShape.closePath();
 const baseGeometry=new T.ExtrudeGeometry(baseShape,{depth:.42,bevelEnabled:true,bevelSize:.08,bevelThickness:.04,bevelSegments:3,steps:1,curveSegments:12});baseGeometry.rotateX(Math.PI/2);raw(baseGeometry,new T.MeshStandardMaterial({color:'#12233c',roughness:.82}),base,0,-.045,0);
 const water=waterMaterial(W,'#264b6d');water.roughness=.28;water.metalness=.28;
 const seaRoot=W.group(0,0,0,base);seaRoot.name='istanbul-sea';const seaGeo=new T.ShapeGeometry(baseShape,24);seaGeo.rotateX(Math.PI/2);for(let i=0;i<seaGeo.index.count;i+=3){const a=seaGeo.index.getX(i+1);seaGeo.index.setX(i+1,seaGeo.index.getX(i+2));seaGeo.index.setX(i+2,a);}seaGeo.computeVertexNormals();const sea=raw(seaGeo,water,seaRoot,0,.055,0);sea.castShadow=false;
 const land=named('istanbul-coast');
 const coast=new T.Shape();coast.moveTo(-8,-7.9);coast.lineTo(.75,-7.9);coast.lineTo(8,-3.4);coast.lineTo(8,4.1);coast.lineTo(1.2,4.1);coast.quadraticCurveTo(.5,4.15,-.3,4.2);coast.lineTo(-1.4,4.1);coast.lineTo(-8,4.1);coast.closePath();
 const landGeo=new T.ExtrudeGeometry(coast,{depth:.16,bevelEnabled:true,bevelSize:.055,bevelThickness:.04,bevelSegments:2,steps:1,curveSegments:12});landGeo.rotateX(Math.PI/2);
 raw(landGeo,new T.MeshStandardMaterial({color:'#9e9d9b',roughness:1}),land,0,.22,0);W.box(1.35,.14,1.12,'#9e9d9b',-.7,.15,4.25,land);
 // Raised pedestrian quay, parallel tram rails and small-sett streets.
 const streets=named('istanbul-streets');
 W.box(15.7,.035,.82,'#727c88',0,.255,3.58,streets);
 for(const z of [3.33,3.53,3.65,3.85]){const west=false;W.box(west?6.3:15.7,.016,.024,'#3c4858',west?-4.85:0,.285,z,streets);W.box(west?6.3:15.7,.008,.007,'#a2a5a5',west?-4.85:0,.296,z,streets);}
 W.box(15.8,.035,.22,'#c2b5a0',0,.27,4.04,streets);
 W.box(.72,.035,10.8,'#8f9194',-.05,.25,-1.8,streets);for(const x of [-.36,.29])W.box(.035,.014,10.8,'#c0b8a7',x,.276,-1.8,streets);
 for(let i=0;i<91;i++){const x=-7.8+i*.173;W.box(.022,.004,.18,'#b5aea0',x,.29,4.04,streets);}
 const homes=named('waterfront-houses');
 function house(x,z,w,h,index,turn=0){const g=W.group(x,.27,z,homes);g.name=`waterfront-house-${index}`;g.rotation.y=turn;const wall=['#c3a58b','#aaa7a0','#8b7770','#b9a281','#6c7377','#956e63'][index%6],roof=['#593f49','#51484e','#425266'][index%3];
  W.box(w,h,.92,wall,0,h/2,0,g);W.box(w+.10,.09,1.03,'#d1be9e',0,h+.02,0,g);W.box(w-.09,.07,.82,roof,0,h+.10,0,g);
  for(const side of [-1,1]){W.box(.045,h,.08,'#dac6a7',side*(w/2-.04),h/2,.49,g);for(let floor=0;floor<Math.floor(h/.46);floor++)W.box(w+.03,.045,1.0,'#c9b599',0,.48+floor*.46,0,g);}
  const floors=Math.floor(h/.46),cols=Math.max(2,Math.round(w/.28));
  for(let f=1;f<floors;f++)for(let c=0;c<cols;c++){const xx=-(cols-1)*.13+c*.26,yy=.24+f*.46;W.box(.19,.30,.025,'#d7c29f',xx,yy,.474,g);W.box(.14,.25,.03,'#414756',xx,yy,.493,g);if((index+f+c)%5!==1)litBox(.112,.215,.01,xx,yy,.512,g);W.box(.014,.26,.025,'#b4a48e',xx,yy,.525,g);W.box(.16,.014,.03,'#b4a48e',xx,yy-.015,.528,g);}
  for(const side of [-1,1])for(let f=1;f<floors;f++)for(let k=0;k<2;k++){const zz=-.21+k*.42;W.box(.028,.29,.18,'#d1b994',side*(w/2+.01),.24+f*.46,zz,g);litBox(.012,.22,.12,side*(w/2+.03),.24+f*.46,zz,g);}
  // Ground-floor shop fronts, stone lintels, striped awnings and projecting bay.
  for(let c=0;c<cols;c++){const xx=-(cols-1)*.13+c*.26;W.box(.21,.40,.06,'#4b4341',xx,.23,.48,g);litBox(.16,.28,.013,xx,.25,.516,g);W.box(.018,.34,.025,'#775a3f',xx,.23,.531,g);}
  W.box(w*.90,.12,.055,['#67433e','#4f645f','#644e53'][index%3],0,.52,.51,g);litBox(w*.55,.025,.012,0,.51,.544,g,redGlow);
  for(let k=0;k<10;k++)W.box(w/10,.045,.24,k%2?'#c2b493':['#8a5550','#657663','#8d7961'][index%3],-w/2+w*(k+.5)/10,.61,.60,g);
  if(index%3===0){W.box(w*.56,.51,.18,'#b5a28e',0,1.05,.52,g);for(const xx of [-w*.15,w*.15])litBox(.14,.29,.018,xx,1.05,.622,g);W.box(w*.65,.055,.26,roof,0,1.34,.55,g);}
  if(index%4===0||index%4===3){const roofGeo=new T.CylinderGeometry(w*.40,w*.74,index%4===0?.36:.26,4);const m=raw(roofGeo,new T.MeshStandardMaterial({color:roof,roughness:.95}),g,0,h+.24,0);m.rotation.y=Math.PI/4;m.scale.z=.86;}else if(index%4===1){const shape=new T.Shape();shape.moveTo(-w*.54,0);shape.lineTo(0,.30);shape.lineTo(w*.54,0);shape.closePath();raw(new T.ExtrudeGeometry(shape,{depth:1.02,bevelEnabled:false}),new T.MeshStandardMaterial({color:roof,roughness:.95}),g,0,h+.10,-.51);}
  W.box(.12,.32,.13,'#8f7e70',w*.28,h+.25,-.15,g);return g;
 }
 let index=0;for(const [x,z,w,h] of [[-7.35,2.75,.95,1.75],[-6.25,2.75,1.05,2.35],[-5.08,2.75,1.05,2.05],[-3.90,2.75,1.05,2.65],[-2.69,2.75,1.12,2.15],[1.65,2.75,1.05,2.65],[2.86,2.75,1.12,2.9],[4.10,2.75,1.12,2.10],[5.35,2.75,1.12,2.65],[6.60,2.75,1.12,2.40],[7.65,2.75,.8,2.90]])house(x,z,w,h,index++);

 const kiosk=named('harbor-kiosk',-.70,.27,4.25);W.box(1.05,.64,.72,'#ba996c',0,.32,0,kiosk);for(const xx of [-.34,0,.34])litBox(.21,.37,.025,xx,.33,.372,kiosk);const kr=raw(new T.CylinderGeometry(0,.92,.44,4),new T.MeshStandardMaterial({color:'#6c3f42',roughness:.8}),kiosk,0,.85,0);kr.rotation.y=Math.PI/4;kr.scale.z=.7;
 const bridge=named('bosphorus-bridge',-.5,0,8.25);const length=9.4;bridge.rotation.y=-1.131;
 W.box(length,.12,.80,'#898c8d',0,.40,0,bridge);W.box(length,.025,.55,'#4e5865',0,.475,0,bridge);
 for(const side of [-1,1]){W.box(length,.045,.045,'#d4c9ac',0,.53,side*.40,bridge);for(let x=-length/2;x<length/2;x+=.24)W.box(.014,.24,.014,'#c6bda5',x,.65,side*.4,bridge);W.box(length,.025,.025,'#d8caae',0,.78,side*.4,bridge);}
 for(const x of [-3.0,3.0]){for(const side of [-1,1]){W.box(.12,2.62,.12,'#b0afa5',x,1.58,side*.43,bridge);W.box(.18,.15,.17,'#cfbf9a',x,2.9,side*.43,bridge);litBox(.055,1.88,.055,x,1.65,side*.50,bridge,redGlow);}W.box(.13,.12,.98,'#c2b99f',x,2.70,0,bridge);W.box(.13,.09,.98,'#c2b99f',x,1.95,0,bridge);}
 for(const side of [-1,1]){const points=[];for(let i=0;i<=60;i++){const x=-4.475+i*8.95/60,y=Math.abs(x)<=3?1.14+1.67*(x*x/9):2.81-(Math.abs(x)-3)*1.54;points.push([x,y,side*.43]);if(i%2===0&&Math.abs(x)<3)W.box(.012,y-.5,.012,'#d8c7a3',x,(y+.5)/2,side*.43,bridge);}W.line(points,'#d8c49e',.019,bridge);}
 const island=named('maidens-tower',-5.7,.08,10.3);W.box(2.18,.14,1.92,'#c3b59e',0,.07,0,island);W.box(1.98,.07,1.72,'#d6c4a4',0,.17,0,island);W.box(1.36,.65,.95,'#c6b18a',0,.54,.18,island);
 const ir=raw(new T.CylinderGeometry(0,.98,.38,4),new T.MeshStandardMaterial({color:'#76494a',roughness:.8}),island,0,1.03,.18);ir.rotation.y=Math.PI/4;ir.scale.z=.7;
 W.box(.57,1.28,.57,'#dcc49b',-.25,1.37,-.18,island);for(const y of [.84,1.22,1.62,1.96])W.box(.64,.07,.64,'#8b7661',-.25,y,-.18,island);
 for(const side of [-1,1]){litBox(.20,.28,.015,-.25,1.72,-.18+side*.294,island);litBox(.015,.28,.20,-.25+side*.294,1.72,-.18,island);}
 W.cylinder(.38,.28,'#a79675',-.25,2.09,-.18,island,12);for(let i=0;i<8;i++){const a=i*TAU/8;litBox(.08,.20,.025,-.25+Math.sin(a)*.32,2.1,-.18+Math.cos(a)*.32,island).rotation.y=a;}
 const cap=raw(new T.SphereGeometry(.38,24,12,0,TAU,0,Math.PI/2),new T.MeshStandardMaterial({color:'#45546b',roughness:.65}),island,-.25,2.23,-.18);cap.scale.y=.72;W.cylinder(.012,.35,'#a9a7a1',-.25,2.68,-.18,island,8);W.box(.16,.09,.008,'#b43f46',-.17,2.78,-.18,island);
 for(let i=0;i<5;i++)litBox(.13,.25,.02,-.54+i*.27,.57,.664,island);
 for(const x of [-1.01,1.01])for(let z=-.82;z<.85;z+=.28)W.box(.035,.20,.035,'#8d8c85',x,.31,z,island);
 W.box(.5,.045,.24,'#5a4c40',-.8,.17,1.0,island);
 const gardens=named('istanbul-gardens');
 function tree(x,z,r=.25){const g=W.group(x,.25,z,gardens);g.name='istanbul-tree';W.cylinder(.035,.48,'#685849',0,.24,0,g,6);const crown=W.ball(r,'#395242',0,.64,0,g);crown.scale.set(r*.9,r*1.8,r);for(const [dx,dz] of [[-.10,.07],[.08,-.05]]){const leaf=W.ball(r*.68,'#47614a',dx,.57,dz,g);leaf.scale.y*=1.3;} }
 for(const [x,z] of [[-7.6,-5],[-7.4,-4.2],[-6.8,-1],[-7.55,.1],[-7.6,1.1],[-6.8,1.0],[-5.8,1.6],[-5.0,1.6],[-3.15,1.0],[-2.8,.4],[-1.3,.9],[-1.3,.2],[.85,.7],[1.05,-.1],[1.15,-1.0],[1.2,-2.0],[1.4,-3.5],[6.9,-5.9],[7.5,-5.8],[7.4,-4.9],[6.7,-1.65],[5.5,-1.1],[4.5,-1.2],[3.4,-1.1],[-1.0,-5.9],[-1.1,-4.8]])tree(x,z,.23+(Math.abs(x*31+z*7)%7)/90);
 for(const [x,z] of [[-2.1,.8],[-2.2,1.4],[-1.8,-.7],[.1,1.0],[.3,1.6],[.5,-1.0],[-7.6,-7.3],[7.65,-7.2],[1.8,-7.4]])tree(x,z,.24);
 for(let i=0;i<40;i++){const x=-7.7+(i%20)*.79,z=i<20?-6.5:-.90;if(x>1.5&&x<6.3&&z<0)continue;const leaf=W.ball(.16,'#3b5543',x,.32,z,gardens);leaf.scale.set(.24,.13,.18);}
 const lamps=named('istanbul-street-lamps');
 for(let i=0;i<25;i++){const x=-7.5+i*.62,z=4.04;W.cylinder(.020,.61,'#4a4a48',x,.59,z,lamps,8);W.cylinder(.06,.045,'#68635b',x,.91,z,lamps,8);litBox(.065,.10,.065,x,.97,z,lamps);W.cylinder(.08,.045,'#504f4d',x,1.035,z,lamps,8);W.cylinder(.065,.06,'#665f52',x,.30,z,lamps,8);}
 for(const [x,z] of [[-1.15,1.6],[1.0,.8],[-1.5,-2.5],[1.2,-5]]){W.cylinder(.02,.65,'#4b4b47',x,.60,z,lamps,8);litBox(.07,.11,.07,x,.97,z,lamps);}
 // Restrained local warm pools light stone rather than simulating glow with an image.
 for(const [x,y,z,power,distance] of [[-2.7,2.4,-.5,3,5],[1.15,2.5,.6,3.5,5],[-1.0,2.2,1.1,1.8,3.2],[-4.4,1.2,3.8,2,4],[4.3,1.1,3.8,2.1,4],[-5.7,1.6,11.5,2.4,3.5]]){const l=new T.PointLight('#ffc178',power,distance,2);l.position.set(x,y,z);l.userData.istanbulLight=true;l.userData.nightPower=power;W.group().add(l);lights.push(l);}
 const people=named('istanbul-pedestrians');for(let i=0;i<36;i++){const x=-7.6+(i%18)*.84,z=i<18?4.0:-.75;const p=W.person(x,z,['#c2b098','#775d57','#425d72','#8e714f'][i%4],'#353c48',.065);people.add(p.root);p.root.position.y=.28;p.root.rotation.y=i*1.2;}
 const trams=[];for(let i=0;i<3;i++){const g=named('istanbul-tram');W.box(.98,.22,.29,'#a33937',0,.17,0,g);W.box(.96,.04,.33,'#d6c29e',0,.30,0,g);W.box(.85,.19,.26,'#b3a482',0,.39,0,g);for(let k=0;k<5;k++)for(const s of [-1,1]){litBox(.115,.13,.01,-.32+k*.16,.39,s*.137,g);W.box(.012,.19,.025,'#a08d6e',-.4+k*.19,.39,s*.14,g);}W.box(1.02,.055,.32,'#5b5652',0,.51,0,g);for(const x of [-.31,.31])for(const s of [-1,1]){const wh=W.cylinder(.065,.04,'#2c313b',x,.07,s*.14,g,12);wh.rotation.x=Math.PI/2;}W.line([[-.14,.54,0],[0,.71,0],[.15,.54,0]],'#675e4d',.009,g);W.box(.3,.015,.05,'#8b806b',0,.72,0,g);trams.push(g);}
 const boats=[];for(let i=0;i<5;i++){const g=named('bosphorus-ferry');const shape=new T.Shape();shape.moveTo(-.14,-.35);shape.quadraticCurveTo(-.20,.20,0,.52);shape.quadraticCurveTo(.20,.20,.14,-.35);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1});geo.rotateX(-Math.PI/2);raw(geo,new T.MeshStandardMaterial({color:i%2?'#b7b0a2':'#e0d9bf',roughness:.55}),g,0,.035,0);W.box(.26,.04,.59,'#796b54',0,.14,.02,g);W.box(.20,.14,.30,'#ded9bf',0,.22,-.07,g);W.box(.22,.035,.38,'#dedbce',0,.32,-.07,g);for(const s of [-1,1])litBox(.01,.065,.22,s*.105,.25,-.07,g,redGlow);W.box(.04,.15,.045,'#4e4d49',0,.40,-.13,g);boats.push(g);}
 // Actual canvas typography only; the reference artwork is never loaded.
 const title=named('istanbul-title');const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1536,256);ctx.font='bold 260px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#101c35';ctx.fillText('İSTANBUL',768,136);const tex=W.own(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;const textMat=W.own(new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));const titleMesh=new T.Mesh(W.own(new T.PlaneGeometry(12.3,4.2)),textMat);titleMesh.position.set(3.3,8.2,-5.5);titleMesh.rotation.y=Math.atan2(-19,32);title.add(titleMesh);
 return {water,sea,base,land,streets,homes,bridge,island,gardens,lamps,people,trams,boats,title,lights,luminousMaterials:materials,dynamicRoots:[...trams,...boats,title]};
}
