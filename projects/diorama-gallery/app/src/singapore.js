import {defineWorld} from '@diorama/worlds';
import {marinaBaySands,artScience,gardens,flyer,civic,temple,merlion,skyline} from './singapore-landmarks.js';
import {railPose,TRACK_LENGTH,boatPose} from './singapore-motion.js';
const TAU=Math.PI*2,DURATION=120;
function custom(W,geometry,material,parent){const mesh=new W.THREE.Mesh(W.own(geometry),W.own(material));mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function mapBase(W){
 const T=W.THREE,root=W.group();root.name='engraved-map';
 W.box(16.3,.14,17.2,'#8c7555',0,-.18,.4,root);W.box(16.22,.035,17.12,'#eee1bd',0,-.09,.4,root);
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1664;const c=canvas.getContext('2d');c.fillStyle='#d8c6a1';c.fillRect(0,0,1536,1664);
 let seed=42;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<30000;i++){c.fillStyle=`rgba(${rnd()>.5?'77,65,40':'255,248,219'},${rnd()*.085})`;c.fillRect(rnd()*1536,rnd()*1664,1+rnd()*3,1+rnd()*3);}
 c.strokeStyle='#8f9475';c.lineWidth=1.4;
 for(let i=0;i<100;i++){let x=rnd()*1536,y=rnd()*1664;c.beginPath();c.moveTo(x,y);for(let j=0;j<9;j++){x+=(rnd()-.5)*180;y+=35+rnd()*90;c.lineTo(x,y);}c.stroke();}
 c.strokeStyle='#aaa080';c.lineWidth=.7;for(let i=0;i<34;i++){c.beginPath();c.moveTo(i*47,0);c.lineTo(i*47,1664);c.stroke();}for(let i=0;i<36;i++){c.beginPath();c.moveTo(0,i*47);c.lineTo(1536,i*47);c.stroke();}
 c.strokeStyle='#72664e';c.lineWidth=3;c.strokeRect(25,25,1486,1614);c.lineWidth=1;c.strokeRect(34,34,1468,1596);
 c.textAlign='center';c.fillStyle='#243c36';c.font='86px Georgia';c.fillText('S I N G A P O R E',768,1480);c.font='21px Georgia';c.fillText('L I O N  C I T Y   ·   G A R D E N  C I T Y',768,1538);c.font='16px Georgia';c.fillText('1.3521° N  /  103.8198° E',768,1584);
 c.save();c.translate(130,1480);for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(0,-65);c.lineTo(9,0);c.lineTo(0,14);c.lineTo(-9,0);c.closePath();c.fillStyle=i%2?'#ab926c':'#40524a';c.fill();}c.restore();
 const tex=W.own(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 const plane=custom(W,new T.PlaneGeometry(16.2,17.1),new T.MeshStandardMaterial({map:tex,roughness:.93}),root);plane.rotation.x=-Math.PI/2;plane.position.set(0,-.065,.4);
 return root;
}
function landscape(W){
 const T=W.THREE;mapBase(W);
 const shape=new T.Shape();shape.moveTo(-7.6,-6.6);shape.lineTo(7.4,-6.6);shape.lineTo(7.6,5.7);shape.lineTo(-1.4,5.7);shape.quadraticCurveTo(-2.1,4.7,-1.4,3.5);shape.lineTo(.25,1.3);shape.quadraticCurveTo(1,-.6,-1.3,-1.6);shape.lineTo(-6.4,-1.6);shape.quadraticCurveTo(-7.9,-2.5,-7.6,-6.6);
 const geo=new T.ShapeGeometry(shape,24);geo.rotateX(Math.PI/2); // Shape z is opposite? Flip below to keep authored x/z shape.
 geo.scale(1,-1,1);
 const land=custom(W,geo,new T.MeshStandardMaterial({color:'#778467',roughness:1,side:T.DoubleSide}),W.group());land.position.y=.055;
 // Clear architectural garden terraces override the organically shaped bay edge.
 W.box(14.5,.1,5.2,'#8b9471',-.1,.08,-4);W.box(7.4,.1,10.8,'#b9af90',3.8,.075,.2);
 for(const [x,z,w,d] of [[-3,-2.5,7.5,.35],[3.9,1.2,7,.34],[.2,3.6,.35,4.8],[4.7,4.4,5.2,.3]])W.box(w,.025,d,'#e5d7b7',x,.15,z);
 // Sea shaped as an inset turquoise basin, with relief and light that travel rather than stripes.
 const waterRoot=W.group();const geometry=new T.PlaneGeometry(7.1,7.2,72,72);geometry.rotateX(-Math.PI/2);
 const mat=new T.MeshStandardMaterial({color:'#398e96',roughness:.2,metalness:.15});
 mat.onBeforeCompile=shader=>{shader.uniforms.singaporeTime={value:0};mat.userData.shader=shader;
 shader.vertexShader='uniform float singaporeTime; varying vec3 waterPosition;\n'+shader.vertexShader;
 shader.fragmentShader='uniform float singaporeTime; varying vec3 waterPosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float phase=singaporeTime*6.2831853/120.;
float ripple=sin(waterPosition.x*12.1+sin(waterPosition.z*9.4)+phase*20.)*sin(waterPosition.z*16.7+waterPosition.x*5.9-phase*30.);
float sparkle=pow(max(0.,ripple),9.);
diffuseColor.rgb*=.82+.25*ripple;diffuseColor.rgb+=vec3(.32,.46,.44)*sparkle;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
normal=normalize(normal+vec3(.16*sin(waterPosition.x*10.4+singaporeTime*1.04719755),.07*cos(waterPosition.z*12.7),.12*sin(waterPosition.z*15.2-singaporeTime*1.57079633)));`);
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat phase=singaporeTime*6.2831853/120.;\nwaterPosition=position;\ntransformed.y += .015*sin(position.x*6.1+sin(position.z*2.4)+phase*20.) + .009*cos(position.z*10.3+position.x*3.4-phase*30.);');};
 const sea=custom(W,geometry,mat,waterRoot);sea.position.set(-3.9,.015,1.2);sea.castShadow=false;
 for(let i=0;i<22;i++){const z=-2.2+i*.34;W.box(.16,.16,.32,i%3?'#d9cbaa':'#aaa387',-.27,.12,z);}
 for(let i=0;i<24;i++){const x=.1+i*.3;W.box(.28,.15,.16,'#d4c6a4',x,.13,5.7);}
 return mat;
}
function palm(W,x,z,s=1){const g=W.group(x,.16,z);W.cylinder(.045*s,.9*s,'#85714e',0,.45*s,0,g);for(let i=0;i<7;i++){const a=i*TAU/7;const p=W.ball(.2*s,i%2?'#557442':'#355a3b',Math.cos(a)*.19*s,.9*s,Math.sin(a)*.19*s,g);p.scale.set(.32*s,.07*s,.12*s);p.rotation.y=-a;p.rotation.z=.18;}return g;}
function greenery(W){
 for(let i=0;i<68;i++){const x=.5+(i%9)*.78,z=-6.15+Math.floor(i/9)*1.02;if((x>3.7&&z<-.7)||(x<1.4&&z>-.5))continue;const tree=W.tree(x,z,.19+(i%4)*.028,i+35);tree.position.y=.15;}
 for(let i=0;i<20;i++)palm(W,-7.15+i*.7,5.6,.55+(i%3)*.1);
 for(let i=0;i<12;i++)palm(W,.38,-5.8+i*.92,.6);
 for(let i=0;i<7;i++)palm(W,-6.4+i*.85,-2.35,.6);
 for(let i=0;i<25;i++){const x=1.05+(i%5)*1.3,z=4.9+Math.floor(i/5)*.16;W.ball(.12,'#587044',x,.24,z);}
 for(let i=0;i<28;i++){const x=i<14?-6.7+i*.47:.5+(i-14)*.48,z=i<14?5.3:1.1;const p=W.person(x,z,['#f3d2a3','#758e9e','#b76b52','#e9e7cf'][i%4],'#464b43',.075);p.root.position.y=.16;p.root.rotation.y=i*.8;}
 // Oversized orchids are an explicit miniature foreground flourish from the reference.
 for(let i=0;i<7;i++){
 const x=6.45+(i%3)*.36,z=5.15+Math.floor(i/3)*.4,y=.65+(i%2)*.2;
 W.line([[x,.14,z],[x-.04,y-.12,z]],'#53683e',.018);
 for(let k=0;k<5;k++){const a=k*TAU/5;const petal=W.ball(.1,k%2?'#ae648d':'#d99ab7',x+Math.cos(a)*.13,y+Math.sin(a)*.13,z);petal.scale.set(.16,.09,.028);petal.rotation.z=a;}
 const lip=W.ball(.06,'#8d4975',x,y-.055,z+.035);lip.scale.set(.07,.09,.025);W.ball(.035,'#f5d784',x,y,z+.06);
 for(const side of [-1,1]){const leaf=W.ball(.1,'#45663d',x+side*.11,.3,z);leaf.scale.set(.07,.2,.025);leaf.rotation.z=-side*.6;}
 }
 // Layered low garden beds and irregular clustered canopy fill the city, not its landmark silhouettes.
 for(let i=0;i<95;i++){
 const x=.45+(i%13)*.51,z=-6.4+Math.floor(i/13)*.64;
 if((x>4.6&&z>-3.5)||(x<1.9&&z>-1.3))continue;
 const bush=W.ball(.13,['#406044','#567348','#71834b'][i%3],x,.22+(i%3)*.025,z);bush.scale.set(.19,.13,.16);
 }
 for(let i=0;i<18;i++){const x=1.05+(i%6)*.57,z=2.8+Math.floor(i/6)*.24;W.ball(.13,['#4f713f','#6b8348','#8b9652'][i%3],x,.25,z);}

}
function boatModel(W){const g=W.group();const T=W.THREE,shape=new T.Shape();shape.moveTo(-.35,-.75);shape.quadraticCurveTo(-.48,.4,0,.95);shape.quadraticCurveTo(.48,.4,.35,-.75);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);const hull=custom(W,geo,new T.MeshStandardMaterial({color:'#674c2c',roughness:.7}),g);hull.position.y=.05;W.box(.7,.05,1.3,'#d1a463',0,.3,-.03,g);W.box(.72,.1,1.28,'#b8873e',0,.77,-.03,g);for(const x of [-.3,.3])for(let i=0;i<5;i++)W.box(.025,.42,.025,'#694c2d',x,.54,-.55+i*.26,g);W.box(.4,.24,.3,'#a57538',0,.44,-.55,g);return g;}
function transport(W){
 // Elevated, arc-length stadium route: both train cars and wheels remain on the exact rail centerline.
 const points=Array.from({length:193},(_,i)=>{const p=railPose(i/192*TRACK_LENGTH);return[p.x,.8,p.z];});
 W.line(points,'#a89f85',.16);
 for(const offset of [-.2,.2])W.line(Array.from({length:193},(_,i)=>{const p=railPose(i/192*TRACK_LENGTH,offset);return[p.x,.97,p.z];}),'#5c6661',.018);
 for(let i=0;i<24;i++){const p=railPose(i/24*TRACK_LENGTH);W.box(.13,.68,.18,'#aaa68e',p.x,.4,p.z);const sleeper=W.box(.55,.06,.15,'#c6bea4',p.x,.76,p.z);sleeper.rotation.y=p.yaw;}
 const train=W.group();for(let car=0;car<3;car++){const g=W.group(0,0,0,train);W.box(.43,.34,.94,'#e4e5d9',0,.3,0,g);W.box(.45,.04,.94,'#3e756e',0,.26,0,g);W.box(.38,.07,.84,'#b9c5bf',0,.51,0,g);for(const side of [-1,1])for(let j=0;j<4;j++)W.box(.014,.14,.15,'#334f55',side*.22,.37,-.34+j*.22,g);for(const x of [-.2,.2])for(const z of [-.3,.3])W.cylinder(.07,.03,'#3b4741',x,.12,z,g).rotation.z=Math.PI/2;}
 const bus=W.group(4.1,.14,7);bus.rotation.y=-.18;W.box(1.55,.74,.55,'#8fb629',0,.49,0,bus);W.box(1.55,.08,.57,'#bfd349',0,.9,0,bus);for(const side of [-1,1])for(let row=0;row<2;row++)for(let i=0;i<6;i++)W.box(.19,.21,.012,'#314b43',-.63+i*.25,.4+row*.34,side*.283,bus);for(const x of [-.51,.51])for(const z of [-.29,.29]){const w=W.cylinder(.14,.07,'#303b34',x,.16,z,bus,12);w.rotation.x=Math.PI/2;const hub=W.cylinder(.065,.075,'#b7b9a5',x,.16,z,bus,12);hub.rotation.x=Math.PI/2;}
 for(let i=0;i<18;i++){const x=-6.5+i*.75;W.box(.35,.018,.045,'#ece4cc',x,.15,6.03);}
 return {train,bus};
}
function fountain(W,start){const root=W.group();const drops=[];for(let i=0;i<70;i++){const p=W.ball(.026,'#e1f0dc',0,0,0,root);p.scale.set(.025,.035,.025);drops.push(p);}const rings=[];for(let i=0;i<5;i++){const ring=W.ring(.22+i*.075,'#93c3b9',start[0]-2.65,.045,start[2],root,.009);rings.push(ring);}return{root,drops,start,rings};}
export default defineWorld({name:'singapore-garden-city',title:'Singapore · Garden City',description:'A living Singapore miniature on a warm engraved map: Marina Bay Sands, the lotus museum, garden domes and Supertrees, observation wheel, Merlion fountain, civic clocktower, temple and skyline. A train circles the foreground, a bumboat cruises the bay, and the fountain falls from the Merlion’s mouth.',duration:DURATION,still:12,
 rendering:{staticBatches:true,background:'#e4dac8',camera:[5,21,28],padding:1.025,ambient:1.7,sunlight:3.1,groundColor:'#8c9fa2',sunColor:'#ffe5bb',shadowSize:2048,samples:4,focus:.12,bias:-.00015,normalBias:.012,pixelRatio:1.75},
 bounds:[[-8.2,-.3,-8.2],[8.2,7.5,9.1]],
 build(W){
 const sea=landscape(W);const mbs=marinaBaySands(W,-3.4,-4.9);mbs.name='marina-bay-sands';
 const lotus=artScience(W,-5.4,-1.35);lotus.name='artscience';
 const garden=gardens(W,2.4,-4.3);garden.name='gardens';const wheel=flyer(W,6,-3.1);wheel.root.name='flyer';
 const clock=civic(W,.95,.2);clock.name='civic';const shrine=temple(W,5.35,2);shrine.name='temple';
 const mer=merlion(W,-.85,2.25);mer.root.scale.setScalar(1.42);mer.root.name='merlion';const city=skyline(W,5.5,-.5);city.scale.setScalar(.82);city.name='skyline';
 greenery(W);const boat=boatModel(W);const travel=transport(W);const mouth=[-.85+mer.mouth[0]*1.42,.14+mer.mouth[1]*1.42,2.25+mer.mouth[2]*1.42];const spray=fountain(W,mouth);
 return{sea,boat,...travel,wheel,fountain:spray,dynamicRoots:[boat,travel.train,wheel.wheel,spray.root]};
 },
 tick({t,parts}){
 const p=((t%DURATION)+DURATION)%DURATION/DURATION,a=p*TAU;
 if(parts.sea.userData.shader)parts.sea.userData.shader.uniforms.singaporeTime.value=t;
 const b=boatPose(t);parts.boat.position.set(b.x,b.y,b.z);parts.boat.rotation.y=b.yaw;
 parts.wheel.wheel.rotation.z=-a;for(const pod of parts.wheel.pods)pod.rotation.z=a;
 parts.train.children.forEach((car,i)=>{const q=railPose(p*TRACK_LENGTH-i*1.12);car.position.set(q.x,.938,q.z);car.rotation.y=q.yaw;});
 const {drops,start,rings}=parts.fountain;drops.forEach((drop,i)=>{const q=(p*80+i/drops.length)%1;drop.position.set(start[0]-2.65*q,start[1]+.65*q-(start[1]+.65-.04)*q*q,start[2]+.025*Math.sin(i*2.1));});
 rings.forEach((ring,i)=>ring.scale.setScalar(.85+.12*Math.sin(a*40+i)));
 }
});
