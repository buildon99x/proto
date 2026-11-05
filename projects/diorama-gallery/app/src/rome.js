import {defineWorld} from '@diorama/worlds';
import {architecture,TAU} from './rome-landmarks.js';
import {waterMaterial} from './dubai-water.js';
import {createRomeEnvironment,ROME_WEATHER} from './rome-environment.js';
export const RIVER_POINTS=[[-1.35,-9],[-.65,-6.2],[-1.45,-3.4],[-2.6,-.2],[-2.2,2.7],[.8,5.8],[5.3,7.5],[8.2,7.8]];
export function riverCurve(T){return new T.CatmullRomCurve3(RIVER_POINTS.map(([x,z])=>new T.Vector3(x,0,z)),false,'catmullrom',.45);}
export function riverPose(curve,u){const p=curve.getPoint(u),t=curve.getTangent(u);return{x:p.x,z:p.z,yaw:Math.atan2(t.x,t.z)};}
function atlas(W,A){
 const T=W.THREE,g=W.group();g.name='rome-atlas';W.box(18,.14,22,'#8f7958',0,-.17,1,g);W.box(17.98,.035,21.98,'#ddc9a1',0,-.083,1,g);
 const c=document.createElement('canvas');c.width=1800;c.height=2200;const ctx=c.getContext('2d');ctx.fillStyle='#d8c39a';ctx.fillRect(0,0,1800,2200);let seed=1902;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<32000;i++){ctx.fillStyle=`rgba(${i%2?'88,63,34':'255,249,210'},${rand()*.12})`;ctx.fillRect(rand()*1800,rand()*2200,1+rand()*3,1+rand()*3);}
 ctx.strokeStyle='#a79978';ctx.lineWidth=1;for(let y=35;y<1860;y+=27)for(let x=30;x<1780;x+=32){if(rand()>.25){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(y*.006)*.22);ctx.strokeRect(0,0,14+rand()*15,12+rand()*12);ctx.restore();}}
 ctx.lineWidth=4;ctx.strokeStyle='#705c43';ctx.strokeRect(20,20,1760,2160);ctx.lineWidth=1;ctx.strokeRect(32,32,1736,2136);
 ctx.fillStyle='#e2cca1';ctx.fillRect(34,1880,1732,270);ctx.strokeStyle='#8d7959';ctx.strokeRect(34,1880,1732,270);ctx.textAlign='center';ctx.fillStyle='#782a22';ctx.font='155px Georgia';ctx.fillText('R O M E',920,2038);ctx.font='26px Georgia';ctx.fillStyle='#4b483b';ctx.fillText('E T E R N A L   C I T Y  ·  H I S T O R Y  ·  A R T  ·  C U L T U R E',920,2080);ctx.font='19px Georgia';ctx.fillText('41.9028° N, 12.4964° E',920,2120);
 ctx.save();ctx.translate(155,2010);for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,-85);ctx.lineTo(11,0);ctx.lineTo(0,18);ctx.lineTo(-11,0);ctx.closePath();ctx.fillStyle=i%2?'#ab916a':'#57513f';ctx.fill();}ctx.restore();
 const tex=W.own(new T.CanvasTexture(c));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;const plane=A.mesh(W.own(new T.PlaneGeometry(17.94,21.94)),W.own(new T.MeshStandardMaterial({map:tex,roughness:.96})),g,0,-.058,1);plane.rotation.x=-Math.PI/2;plane.castShadow=false;
}
function geography(W,A){
 atlas(W,A);const T=W.THREE,curve=riverCurve(T),g=W.group();g.name='tiber-river';const positions=[],indices=[],uv=[];
 for(let i=0;i<=160;i++){const u=i/160,p=curve.getPoint(u),t=curve.getTangent(u),r=.84+.10*Math.sin(u*Math.PI);for(const side of [-1,1]){positions.push(p.x+t.z*r*side,.018,p.z-t.x*r*side);uv.push((side+1)/2,u);}if(i<160){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const geo=W.own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const water=waterMaterial(W,'#257f7e');water.side=T.DoubleSide;const compile=water.onBeforeCompile;water.onBeforeCompile=shader=>{compile(shader);shader.uniforms.singaporeTime.value=water.userData.romeTime??0;};const river=A.mesh(geo,water,g);river.castShadow=false;
 const bank=W.group();bank.name='river-embankment';
 for(let i=0;i<160;i++){const u=(i+.5)/160,p=curve.getPoint(u),q=curve.getPoint((i+1)/160),prev=curve.getPoint(i/160),t=curve.getTangent(u),r=.84+.10*Math.sin(u*Math.PI);for(const side of [-1,1]){const b=W.box(.16,.19,q.distanceTo(prev)+.04,'#c4b390',p.x+t.z*(r+.08)*side,.035,p.z-t.x*(r+.08)*side,bank);b.rotation.y=Math.atan2(t.x,t.z);const walk=W.box(.32,.025,q.distanceTo(prev)+.04,'#d4c4a4',p.x+t.z*(r+.27)*side,.145,p.z-t.x*(r+.27)*side,bank);walk.rotation.y=b.rotation.y;}}
 return{curve,water};
}
function bridge(W,A,curve,u,id){const p=riverPose(curve,u),g=W.group(p.x,.035,p.z);g.name=`rome-bridge-${id}`;g.rotation.y=p.yaw;
 for(let i=-1;i<=1;i++)A.arch(1.12,.62,.54,g,i*1.03,0,0,'#cbb998');A.block(3.48,.14,.70,'#cfbe9e',0,.64,0,g);
 for(const side of [-1,1]){A.block(3.53,.13,.065,'#d8c8aa',0,.75,side*.35,g);for(let i=0;i<12;i++){const xx=-1.6+i*.29;A.block(.06,.23,.07,'#d6c4a2',xx,.86,side*.35,g);if(i%3===0){W.cylinder(.024,.18,'#dfd1b6',xx,1.07,side*.35,g,6);W.ball(.036,'#e4d6b9',xx,1.10,side*.35,g);}}
 }
 for(const side of [-1,1])for(let i=0;i<(id===3?4:7);i++){const xx=side*(1.80+i*(id===3?.10:.12));A.block(.14,.14,.73,'#bfae91',xx,.57-i*(id===3?.14:.07),0,g);}return g;
}
function neighborhoods(W,A,curve){
 const blocked=[[-4.9,-5.8,2.7,3.8],[3.8,-1.7,3.2,2.45],[-5,4.3,1.5,1.8],[-5.6,-.7,1.4,1.35],[3.5,3.4,2.4,2],[6.6,2.7,1.2,1.1],[6.4,-6.5,1.2,1.8],[3.3,-7.4,2.4,1.6]];
 const samples=Array.from({length:180},(_,i)=>curve.getPoint(i/179));let seed=0;
 for(let row=0;row<27;row++)for(let col=0;col<29;col++){
  const x=-8.2+col*.58+(row%2)*.07,z=-8.5+row*.60;if(z>7.1||x>8.2)continue;
  if(blocked.some(([bx,bz,w,d])=>Math.abs(x-bx)<w&&Math.abs(z-bz)<d))continue;
  if(samples.some(p=>Math.hypot(x-p.x,z-p.z)<1.62))continue;
  const key=++seed,w=.34+(key%4)*.04,d=.37+(key%3)*.04,h=.55+(key%6)*.13;A.house(x,z,w,d,h,key);
 }
 const park=W.group(3.3,.10,-7.4);park.name='villa-borghese';W.box(4.1,.04,2.3,'#6f7e45',0,0,0,park);for(let i=0;i<35;i++){const x=-1.8+(i%7)*.59,z=-.95+Math.floor(i/7)*.47;if(Math.abs(x)<.8&&Math.abs(z)<.6)continue;A.pine(x,z,.5+(i%3)*.12,park);}A.house(0,0,1.35,.8,.75,18,park);for(let i=0;i<6;i++)A.column(park,-.58+i*.232,.48,.64,.045,.12);A.pediment(park,1.5,.25,.5,.84);
 const gardens=W.group();gardens.name='rome-gardens';for(let i=0;i<64;i++){const u=(i+.5)/64,p=curve.getPoint(u),t=curve.getTangent(u),side=i%2?1:-1,x=p.x+t.z*1.35*side,z=p.z-t.x*1.35*side;if(x>8.3||z>8||[.19,.38,.57,.76].some(v=>Math.abs(u-v)<.035))continue;A.pine(x,z,.40+(i%4)*.08,gardens);}
 for(let i=0;i<23;i++){const a=-1.48+i/22*2.96;A.cypress(3.8+Math.sin(a)*3.16,-1.7+Math.cos(a)*2.42,.43+(i%3)*.09,gardens);}
 for(let i=0;i<18;i++){A.cypress(1.1+(i%6)*1.05,1.55+Math.floor(i/6)*1.85,.6+(i%3)*.17,gardens);}for(let i=0;i<12;i++)A.pine(-7.7+(i%3)*.65,-3.1+Math.floor(i/3)*.58,.5+(i%3)*.15,gardens);
 return seed;
}
function streetLife(W,A,curve){
 const g=W.group();g.name='rome-life';for(let i=0;i<95;i++){const u=.04+(i/95)*.9,p=curve.getPoint(u),t=curve.getTangent(u),side=i%2?1:-1;const person=W.person(p.x+t.z*1.19*side,p.z-t.x*1.19*side,['#9f624d','#d1caa8','#4f6b66','#c89546','#66647c'][i%5],'#454a43',.075);g.attach(person.root);person.root.position.y=.15;person.root.rotation.y=i*.8;}
 for(let i=0;i<28;i++){const u=(i+.5)/29,p=curve.getPoint(u),t=curve.getTangent(u),side=i%2?1:-1,x=p.x+t.z*1.12*side,z=p.z-t.x*1.12*side;if(x>8.5)continue;W.cylinder(.017,.47,'#575d4d',x,.38,z,g,6);A.block(.068,.11,.068,A.lamp,x,.66,z,g);W.box(.09,.03,.09,'#59614e',x,.73,z,g);}
 const fountain=W.group(-2.75,.15,5.3);fountain.name='rome-fountain';W.cylinder(.48,.13,'#c7b899',0,.065,0,fountain,40);W.cylinder(.41,.025,'#408b8a',0,.14,0,fountain,40);W.cylinder(.09,.66,'#d4c4a4',0,.46,0,fountain,12);W.cylinder(.23,.055,'#d7c7a7',0,.58,0,fountain,32);W.ball(.075,'#e0d1b2',0,.84,0,fountain);return{life:g,fountain};
}
function labels(W,A){
 const T=W.THREE;
 for(const [text,x,z,w] of [["ST PETER'S BASILICA",-4.6,-8.6,2.5],['COLOSSEUM',4.2,-4.3,2.1],["CASTEL SANT'ANGELO",-5.7,-2.3,2.25],['PANTHEON',-5.3,6.5,1.8],['ROMAN FORUM',3.7,5.5,2.0],['VILLA BORGHESE',3.3,-8.9,2.3],['SPANISH STEPS',6.5,-4.6,2.0],['TRASTEVERE',-.2,7.3,2.0]]){
  const c=document.createElement('canvas');c.width=512;c.height=84;const ctx=c.getContext('2d');ctx.fillStyle='#dfcda8';ctx.fillRect(0,0,512,84);ctx.strokeStyle='#a58c62';ctx.lineWidth=3;ctx.strokeRect(3,3,506,78);ctx.fillStyle='#433f31';ctx.textAlign='center';ctx.font='bold 34px Georgia';ctx.fillText(text,256,55);const texture=W.own(new T.CanvasTexture(c));texture.colorSpace=T.SRGBColorSpace;const g=W.group();g.name='rome-landmark-label';const mesh=A.mesh(W.own(new T.PlaneGeometry(w,.32)),W.own(new T.MeshStandardMaterial({map:texture,roughness:1})),g,x,.19,z);mesh.rotation.x=-Math.PI/2;mesh.castShadow=false;
 }
}
function boat(W,A,index){const g=W.group();g.name=`tiber-boat-${index}`;const hull=W.ball(1,index%2?'#a55b38':'#dfd4b9',0,.075,0,g);hull.scale.set(.105,.065,.26);A.block(.17,.035,.35,'#d3b889',0,.13,0,g);A.block(.14,.08,.19,'#f0e1c2',0,.17,-.02,g);A.block(.10,.045,.11,'#32676b',0,.22,-.02,g);return g;}
export default defineWorld({name:'rome-eternal-city',title:'Rome · The Eternal City',description:'An illuminated miniature Rome on an engraved atlas: Colosseum, St Peter’s basilica and oval piazza, Pantheon, Castel Sant’Angelo, Forum ruins and stone bridges across the turquoise Tiber. An artistic landmark composition, not a scale map.',duration:84,still:68,reducedStill:68,moments:[{time:0,label:'시작'},{time:28,label:'28초'},{time:56,label:'56초'},{time:68,label:'대표 장면'}],environment:createRomeEnvironment,weatherOptions:ROME_WEATHER,
 rendering:{zoom:true,orbitFit:true,staticBatches:true,background:'#d0c0a2',camera:[1.5,34,22],padding:1.025,ambient:1.25,sunlight:3.1,groundColor:'#90856a',sunColor:'#ffe3b4',shadowSize:2048,samples:4,focus:.07,bias:-.00015,normalBias:.012,pixelRatio:1.75},bounds:[[-9.05,-.26,-10.05],[9.05,3.7,12.05]],
 build(W){const A=architecture(W),geographyParts=geography(W,A);A.basilica(-4.9,-5.8);A.colosseum(3.8,-1.7);A.castel(-5.6,-.7);A.pantheon(-5,4.3);A.forum(3.5,3.4);A.constantine(6.6,2.7);A.spanish(6.4,-6.5);const bridges=[.19,.38,.57,.76].map((u,i)=>bridge(W,A,geographyParts.curve,u,i));labels(W,A);const houses=neighborhoods(W,A,geographyParts.curve),life=streetLife(W,A,geographyParts.curve),boats=[0,1,2].map(i=>boat(W,A,i));return{...geographyParts,...life,bridges,houses,boats,dynamicRoots:boats};},
 tick({t,parts}){const p=((t%84)+84)%84;parts.water.userData.romeTime=p/84*120;if(parts.water.userData.shader)parts.water.userData.shader.uniforms.singaporeTime.value=p/84*120;parts.boats.forEach((b,i)=>{const u=.04+(.5-.5*Math.cos(TAU*p/84+i*TAU/3))*.9,q=riverPose(parts.curve,u);const lane=(i-1)*.27;b.position.set(q.x+Math.cos(q.yaw)*lane,.03,q.z-Math.sin(q.yaw)*lane);b.rotation.y=q.yaw+Math.PI*.5*(1-Math.tanh(Math.sin(TAU*p/84+i*TAU/3)*14));});}
});
