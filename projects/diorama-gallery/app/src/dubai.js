import {defineWorld} from '@diorama/worlds';
import {mesh,TAU,burjKhalifa,sailHotel,palmIsland,skyline,frame,mall,finishArchitecture} from './dubai-architecture.js';
import {waterMaterial} from './dubai-water.js';
import {railPose,trainState,CAR_SPACING,RAIL_Y} from './dubai-motion.js';
import {buildTransit} from './dubai-transit.js';
import {makePalm as palm,groundMaterial,environment} from './dubai-environment.js';
const DURATION=120;
function mapBase(W){
 const T=W.THREE,g=W.group();g.name='engraved-dubai-map';
 W.box(16.5,.15,20.2,'#998363',0,-.16,.5,g);W.box(16.45,.035,20.15,'#ddcfac',0,-.065,.5,g);
 const c=document.createElement('canvas');c.width=1600;c.height=2000;const ctx=c.getContext('2d');
 ctx.fillStyle='#d9c8a2';ctx.fillRect(0,0,1600,2000);let seed=841;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<40000;i++){ctx.fillStyle=`rgba(${i%2?'83,70,43':'255,250,218'},${random()*.09})`;ctx.fillRect(random()*1600,random()*2000,1+random()*3,1+random()*3);}
 // Atlas blocks and alleyways, no literal reference artwork or network textures.
 ctx.strokeStyle='#a49776';ctx.lineWidth=.7;
 for(let y=30;y<1900;y+=26){for(let x=30;x<1570;x+=32){if(random()>.28){ctx.save();ctx.translate(x,y);ctx.rotate(.14*Math.sin(y*.006));ctx.strokeRect(0,0,18+random()*10,14+random()*8);ctx.restore();}}}
 ctx.strokeStyle='#a39c7b';ctx.lineWidth=2;
 for(let i=0;i<60;i++){let x=random()*1600,y=random()*2000;ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<10;j++){x+=30+(random()-.5)*100;y+=50;ctx.lineTo(x,y);}ctx.stroke();}
 ctx.strokeStyle='#796b51';ctx.lineWidth=3;ctx.strokeRect(22,22,1556,1956);ctx.lineWidth=1;ctx.strokeRect(33,33,1534,1934);
 ctx.fillStyle='#dfcea8';ctx.fillRect(195,1640,1220,280);ctx.fillStyle='#244d50';ctx.textAlign='center';ctx.font='142px Georgia';ctx.fillText('D U B A I',800,1780);ctx.font='26px Georgia';ctx.fillText('U N I T E D   A R A B   E M I R A T E S',800,1843);ctx.font='20px Georgia';ctx.fillText('A CITY OF DREAMS, A FUTURE OF POSSIBILITIES',800,1890);
 ctx.save();ctx.translate(135,1760);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,-70);ctx.lineTo(8,0);ctx.lineTo(0,14);ctx.lineTo(-8,0);ctx.closePath();ctx.fillStyle=i%2?'#a08c65':'#42574e';ctx.fill();}ctx.restore();
 const tex=W.own(new T.CanvasTexture(c));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const plane=mesh(W,new T.PlaneGeometry(16.4,20.1),new T.MeshStandardMaterial({map:tex,roughness:.95}),g);plane.rotation.x=-Math.PI/2;plane.position.set(0,-.04,.5);
}
function landscape(W){
 const T=W.THREE;mapBase(W);const sea=waterMaterial(W),lake=waterMaterial(W,'#369b9d');
 const waterGeometry=new T.PlaneGeometry(15.7,14.6,100,96);waterGeometry.rotateX(-Math.PI/2);const water=mesh(W,waterGeometry,sea,W.group());water.position.set(0,-.005,-1.6);water.castShadow=false;
 // Mainland follows a scalloped coast, leaving the hotel and palm in the gulf.
 const shape=new T.Shape();shape.moveTo(-.6,-7.8);shape.lineTo(7.75,-7.8);shape.lineTo(7.75,5.8);shape.lineTo(-6.7,5.8);shape.quadraticCurveTo(-6.8,4.8,-4.5,4.4);shape.quadraticCurveTo(-1.7,4.6,-2,1.4);shape.quadraticCurveTo(-2.3,-.2,-.7,-1.4);shape.closePath();
 const geo=new T.ShapeGeometry(shape,36);geo.rotateX(Math.PI/2);const land=mesh(W,geo,groundMaterial(W,'limestone'),W.group());land.position.y=.055;
 // Raised downtown promenade and a sinuous lake with low stone edge.
 const pool=W.group(-.35,.07,2.65);const poolGeo=new T.CylinderGeometry(1,1,.025,80);poolGeo.scale(2.06,1,1.45);const poolMesh=mesh(W,poolGeo,lake,pool);poolMesh.position.y=.015;poolMesh.castShadow=false;
 const edge=Array.from({length:97},(_,i)=>[Math.sin(i/96*TAU)*2.1,.04,Math.cos(i/96*TAU)*1.49]);W.line(edge,'#d9cba9',.075,pool);
 for(let i=0;i<65;i++){const a=i/65*TAU;const slab=W.box(.13,.06,.12,'#e0d0ae',-.35+Math.sin(a)*2.3,.1,2.65+Math.cos(a)*1.66);slab.rotation.y=a;}
 for(let i=0;i<6;i++){const x=.9+i*1.1;W.box(.12,.015,10.6,'#b8b095',x,.075,-1.1);}
 for(let z=-6;z<1;z+=1.4)W.box(7.8,.015,.11,'#b8b095',3.7,.075,z);
 return {sea,lake};
}
function streets(W){
 for(let i=0;i<38;i++){const a=i/38*TAU;const x=-.35+Math.sin(a)*2.62,z=2.65+Math.cos(a)*1.94;if(x>1.75&&z<3.8)continue;palm(W,x,z,.6+(i%3)*.06);}
 for(let i=0;i<16;i++)palm(W,-6.6+i*.85,5.18,.65);
 for(let i=0;i<22;i++){const x=1.1+(i%5)*1.28,z=-6.5+Math.floor(i/5)*1.17;palm(W,x,z,.5);}
 for(let i=0;i<20;i++)palm(W,6.9,-6.8+i*.62,.55);
 for(let i=0;i<55;i++){const x=-6.2+(i%15)*.84,z=4.75+Math.floor(i/15)*.3;const person=W.person(x,z,['#e7dbc0','#566c80','#d6a252','#e6e7db','#9b6c51'][i%5],'#4e5351',.075);person.root.position.y=.08;person.root.rotation.y=i*.9;}
 // A fine-grained old/new downtown edge fills the empty strip beside the tower.
 for(let i=0;i<10;i++){const x=.4+(i%2)*.69,z=-4.65+Math.floor(i/2)*.58,h=.55+(i%4)*.21;W.box(.43,h,.37,i%2?'#b8ab8e':'#cdbd9a',x,.1+h/2,z);W.box(.48,.055,.42,'#e0d0ad',x,.13+h,z);W.box(.22,.13,.2,'#a99d82',x,.22+h,z);for(let floor=.27;floor<h;floor+=.19)for(let window=0;window<3;window++)W.box(.07,.105,.012,'#46665f',x-.14+window*.14,floor,z+.19);}
 // Low-rise downtown courtyards with recessed window rhythm.
 for(let i=0;i<12;i++){
  const x=1.05+(i%4)*1.1,z=-.3+Math.floor(i/4)*.72;if(x<2.3)continue;
  const h=.35+(i%3)*.15;W.box(.65,h,.48,'#c2b494',x,.1+h/2,z);W.box(.72,.055,.55,'#e0d1af',x,h+.12,z);
  for(let j=0;j<3;j++)W.box(.1,.15,.015,'#496663',x-.21+j*.21,.16+h/2,z+.25);
 }
 const car=W.group(4.7,.04,7.4);car.name='gold-car';car.rotation.y=-.4;
 const body=W.ball(1,'#c7ad5e',0,.25,0,car);body.scale.set(.44,.18,.87);
 const cabin=W.ball(1,'#354b4e',0,.4,-.08,car);cabin.scale.set(.32,.16,.39);
 W.box(.63,.035,.32,'#e3c97d',0,.29,.53,car);for(const side of [-1,1])for(const zz of [-.49,.5]){const wheel=W.cylinder(.145,.07,'#313738',side*.4,.16,zz,car,16);wheel.rotation.z=Math.PI/2;const hub=W.cylinder(.075,.08,'#c5c7b4',side*.4,.16,zz,car,12);hub.rotation.z=Math.PI/2;}
 for(const xx of [-.28,.28])W.box(.13,.04,.035,'#f2eace',xx,.29,.79,car);
 const camel=W.group(0,.1,7.65);camel.name='camel';camel.rotation.y=-.4;
 const torso=W.ball(1,'#ac8655',0,.56,0,camel);torso.scale.set(.36,.22,.19);for(const xx of [-.12,.15]){const hump=W.ball(1,'#b48d59',xx,.75,0,camel);hump.scale.set(.14,.19,.14);}for(const xx of [-.24,.25])for(const zz of [-.13,.13])W.line([[xx,.5,zz],[xx+.04,.24,zz],[xx-.02,.04,zz]],'#99764c',.032,camel);
 W.line([[.3,.6,0],[.43,.92,0],[.56,1.06,0]],'#ac8655',.065,camel);const head=W.ball(1,'#a67e4b',.63,1.07,0,camel);head.scale.set(.16,.08,.07);W.line([[-.34,.6,0],[-.5,.37,0]],'#866843',.02,camel);
}
function boat(W,yacht=false){const T=W.THREE,g=W.group();const shape=new T.Shape();shape.moveTo(-.22,-.5);shape.quadraticCurveTo(-.29,.35,0,.7);shape.quadraticCurveTo(.29,.35,.22,-.5);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);const hull=mesh(W,geo,new T.MeshStandardMaterial({color:yacht?'#dfdfcb':'#775332',roughness:.5}),g);hull.position.y=.025;W.box(.37,.035,.87,yacht?'#d2c5a1':'#b18b52',0,.19,-.05,g);if(yacht){W.box(.26,.18,.48,'#e9e9d5',0,.28,-.12,g);W.box(.27,.065,.38,'#466973',0,.34,-.09,g);W.box(.29,.04,.5,'#f0edda',0,.4,-.12,g);W.line([[0,.42,-.24],[0,.76,-.24]],'#c7c9b3',.018,g);}else{W.box(.4,.045,.8,'#b39b66',0,.52,-.04,g);for(const xx of [-.16,.16])for(const zz of [-.35,.3])W.box(.02,.29,.02,'#795d3e',xx,.36,zz,g);}return g;}
function fountain(W){const root=W.group(),drops=[],jets=[];for(let ring=0;ring<3;ring++)for(let i=0;i<12;i++){const a=i/12*TAU,rad=.28+ring*.28;const points=Array.from({length:12},(_,j)=>{const q=j/11;return[-.35+Math.sin(a)*(rad+.18*q),.11+(1.7-ring*.23)*4*q*(1-q),2.65+Math.cos(a)*(rad+.18*q)];});const jet=W.line(points,ring%2?'#b8dedb':'#e2eee1',.012,root);jets.push(jet);} for(let r=0;r<3;r++)for(let j=0;j<30;j++){const d=W.ball(.025,'#cce2d8',0,0,0,root);d.scale.set(.018,.05,.018);drops.push(d);}return{root,drops,jets};}
export default defineWorld({name:'dubai-city-of-dreams',title:'Dubai · City of Dreams',description:'An engraved Dubai atlas comes alive: tiered Burj Khalifa, sail-shaped hotel, Palm Jumeirah, ribbed glass towers, golden Frame and fountain lake. A diagonal elevated metro crosses the city between beach and city stations, stops and returns, while a yacht and wooden abra cruise the water.',duration:DURATION,still:12,
 rendering:{zoom:true,staticBatches:true,framingBounds:[[[-8.3,-.3,-9.65],[8.3,1.8,10.65]],[[-1.35,0,-2.1],[1.1,12.9,.3]],[[-6.7,0,-.9],[-4.1,5.9,2.2]],[[1.2,0,-6.2],[7.2,9.1,.3]],[[5.1,0,-7.5],[7.6,5.2,-6.6]]],background:'#d6cab4',camera:[4,24,32],padding:1.025,ambient:1.25,sunlight:3.2,groundColor:'#998f78',sunColor:'#ffe5bc',shadowSize:2048,samples:4,focus:.1,bias:-.00015,normalBias:.012,pixelRatio:1.75},bounds:[[-8.3,-.3,-9.65],[8.3,12.9,10.65]],
 build(W){const water=landscape(W);environment(W);const hero=burjKhalifa(W,-.15,-.9);hero.scale.set(1.2,1,1.2);finishArchitecture(W,hero);const sail=sailHotel(W,-5.4,.3);finishArchitecture(W,sail);palmIsland(W,-4.3,-5.6);const city=skyline(W);finishArchitecture(W,city);const goldenFrame=frame(W,6.35,-7.05);goldenFrame.scale.y=1.28;mall(W,4,2.4);streets(W);const train=buildTransit(W),boats=[boat(W,true),boat(W,false)],spray=fountain(W);return{...water,train,boats,fountain:spray,dynamicRoots:[train,...boats,spray.root]};},
 tick({t,parts}){const p=((t%DURATION)+DURATION)%DURATION/DURATION,a=p*TAU;
 for(const mat of [parts.sea,parts.lake])if(mat.userData.shader)mat.userData.shader.uniforms.singaporeTime.value=t;
 const service=trainState(t);parts.train.children.forEach((car,i)=>{const q=railPose(service.distance+(i-1.5)*CAR_SPACING);car.position.set(q.x,RAIL_Y-.011,q.z);car.rotation.y=q.yaw;});
 parts.boats.forEach((boat,i)=>{const q=a*2+i*2.1,rx=i?.25:.75,rz=i?.7:.6;const cx=i?-7:-4.9,cz=i?3:3.1;boat.position.set(cx+Math.cos(q)*rx,-.035,cz+Math.sin(q)*rz);boat.rotation.y=Math.atan2(-Math.sin(q)*rx,Math.cos(q)*rz)+Math.PI;});
 parts.fountain.drops.forEach((drop,i)=>{const ring=Math.floor(i/30),j=i%30,q=(p*40+j/30)%1,angle=j/30*TAU,rad=.28+ring*.28;drop.position.set(-.35+Math.sin(angle)*(rad+.12*q),.1+(1.7-ring*.23)*4*q*(1-q),2.65+Math.cos(angle)*(rad+.12*q));});
 }});
