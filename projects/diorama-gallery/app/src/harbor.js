import { defineWorld } from '@diorama/worlds';
import { container, vessel, crane, warehouse, truck, forklift, CONTAINER_COLORS } from './harbor-geometry.js';
import { water, wake } from './harbor-water.js';
import { cranePose, vesselPose, DURATION } from './harbor-motion.js';

function cardboard(W) {
 const T=W.THREE,canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#b58c56';ctx.fillRect(0,0,256,256);
 for(let i=0;i<12000;i++){ctx.fillStyle=i%3?'rgba(91,54,21,.07)':'rgba(255,229,176,.1)';ctx.fillRect(W.random()*256,W.random()*256,.5+W.random(),2+W.random()*5);}
 const tex=W.own(new T.CanvasTexture(canvas));tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,2);
 const mat=W.own(new T.MeshStandardMaterial({map:tex,roughness:1,color:'#e8c396'}));
 const geo=W.own(new T.BoxGeometry(1,1,1)),root=W.group();
 const panel=(w,h,d,x,y,z)=>{const m=new T.Mesh(geo,mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;};
 panel(17.4,.24,23.1,0,-.32,0);
 panel(17.4,3.65,.13,0,1.6,-11.5);panel(.13,3.1,23.1,-8.65,1.32,0);
 panel(17.4,.56,.13,0,-.02,11.5);panel(.13,.65,23.1,8.65,.03,0);
 // Open rear flap has visible fold and a thin corrugated cut edge.
 const flap=panel(17.4,2.05,.12,0,4.25,-11.85);flap.rotation.x=-.32;
 W.box(17.4,.035,.04,'#785632',0,3.4,-11.43);
 for(let i=0;i<116;i++) W.box(.055,.035,.10,i%2?'#6d4b2c':'#d6b478',-8.58+i*.149,5.22,-12.15);
 for(let i=0;i<115;i++) W.box(.06,.025,.12,'#8c693d',-8.55+i*.15,.27,11.5);
 // Packing tape catches the warm light at the corners without a thick display plinth.
 W.box(.34,.012,22.8,'#be9a63',8.36,-.187,0);
}
function quay(W,side) {
 const x=side*6.13;W.box(4.55,.55,22.45,'#999b89',x,.12,0);W.surface(4.5,22.4,'#c0bcaa',x,.401,0,side+8,.12);
 W.box(.14,.64,22.4,'#a4a79a',side*3.86,.09,0);
 for(let i=0;i<37;i++) {
 const z=-10.9+i*.6;W.box(.19,.11,.36,i%2?'#ebc34d':'#3b4440',side*3.9,.46,z);
 if(i%3===0){W.cylinder(.055,.16,'#394842',side*4.12,.52,z,undefined,8);W.box(.17,.05,.07,'#43514a',side*4.12,.61,z);}
 if(i%2===0){const tire=W.ring(.11,'#303b39',side*3.75,.19,z,undefined,.035);tire.rotation.set(0,Math.PI/2,0);}
 }
 for(let i=0;i<20;i++) W.box(.035,.012,.5,'#eadcb4',side*5.6,.42,-10.7+i*1.1);
 for(let i=0;i<8;i++) { const z=-9+i*2.7;W.box(4.3,.006,.017,'#a6a390',x,.412,z); }
 // Drain grates and flush mooring rings, deliberately different scales.
 for(let i=0;i<10;i++){const z=-10+i*2.1;W.box(.28,.009,.42,'#71786e',side*4.4,.42,z);for(let j=0;j<4;j++)W.box(.22,.01,.025,'#a9aa98',side*4.4,.43,z-.15+j*.1);}
}
function cargoYard(W,side) {
 for(let row=0;row<5;row++) for(let col=0;col<3;col++) {
 const x=side*(6.6+col*.62),z=-4.5+row*2.2;
 const height=1+(row+col)%3;
 for(let level=0;level<height;level++) container(W,undefined,x,.64+level*.42,z,CONTAINER_COLORS[(row*3+col+level+4)%6],.88);
 }
 for(let i=0;i<8;i++){const x=side*(6.25+(i%3)*.6),z=7.7+Math.floor(i/3)*.65;W.box(.48,.42,.48,'#b89a63',x,.65,z);W.box(.5,.035,.06,'#d2b781',x,.88,z);W.box(.04,.44,.5,'#8c744e',x,.65,z);}
}
function details(W) {
 for(const side of [-1,1]) {
 warehouse(W,side*6.5,-8.5,3.25,3.5);
 cargoYard(W,side);
 truck(W,side*5.1,8.8,side<0?'#e6ac35':'#d5e0d5',Math.PI);truck(W,side*5.1,-6.8,'#dc6e3d');
 forklift(W,side*4.65,3.1,side*Math.PI/2);forklift(W,side*7.4,7.6,Math.PI);
 for(let i=0;i<4;i++){const tree=W.tree(side*8,-10.4+i*.8,.28,i+17);tree.position.y=.42;}
 for(let i=0;i<4;i++) {
 const g=W.group(side*4.4,.42,-8+i*5.4);W.cylinder(.025,1.6,'#64736a',0,.8,0,g);W.box(.22,.07,.13,'#e6dcba',0,1.62,0,g);
 }
 for(let i=0;i<3;i++){ const actor=W.person(side*4.6,-4+i*5,'#e7a535','#29444c',.19);actor.root.position.y=.42;actor.root.rotation.y=side*Math.PI/2;W.ball(.15,'#edd28c',0,.88,0,actor.head); }
 }
}
export default defineWorld({
 name:'harbor-in-a-box',title:'Harbor in a box',
 description:'A warm cardboard miniature port. Orange lattice cranes lift and transfer containers between a quay and a moored ship while cargo vessels drift and two tugs patrol glossy blue-green water.',
 duration:DURATION,still:8,
 bounds:[[-8.8,-.5,-12.4],[8.8,5.4,11.7]],contactTimes:[2,13,17,28],
 build(W) {
 cardboard(W);quay(W,-1);quay(W,1);const sea=water(W);details(W);
 const cranes=[crane(W,-4.5,-1.7,1),crane(W,4.5,5.7,-1)];
 const moored=vessel(W,{length:4.8,width:1.45,cargo:false});moored.position.set(-2.85,.16,-1.7);
 // The crane serves the empty foredeck, with cargo supports at its exact touchdown height.
 W.box(.7,.16,1.4,'#b2b9a7',-2.85,.37,-1.7);
 for(const z of [-.15])for(const x of [-3.17,-2.53])container(W,undefined,x,.65,z,CONTAINER_COLORS[z< -1?1:2],.78);
 const moored2=vessel(W,{length:3.8,width:1.25,cargo:false,color:'#31545b'});moored2.position.set(2.85,.16,5.7);moored2.rotation.y=Math.PI;
 W.box(.7,.16,1.4,'#b2b9a7',2.85,.37,5.7);
 for(const x of [2.57,3.13])container(W,undefined,x,.63,4.4,CONTAINER_COLORS[3],.7);
 const boats=[vessel(W,{length:5.3,width:1.7}),vessel(W,{length:2.5,width:1,color:'#275965'}),vessel(W,{length:1.2,width:.53,tug:true}),vessel(W,{length:1.1,width:.5,tug:true})];
 const wakes=boats.map((boat,i)=>wake(W,i===0?5.3:i===1?2.5:1.2,i===0?1.7:i===1?1:.5));
 const v1=new W.THREE.Vector3(),v2=new W.THREE.Vector3();
 return {sea,cranes,boats,wakes,v1,v2};
 },
 tick({t,parts}) {
 parts.sea.material.uniforms.time.value=t;
 for(let i=0;i<parts.boats.length;i++) {
 const b=parts.boats[i],p=vesselPose(t,i);b.position.set(p.x,p.bob,p.z);b.rotation.y=p.yaw;parts.sea.material.uniforms.vessels.value[i].set(p.x,p.z,p.yaw,i===0?.9:i===1?.5:.28);b.rotation.z=.007*Math.sin(t/DURATION*Math.PI*24+i);
 parts.wakes[i].root.position.set(p.x,.065,p.z);parts.wakes[i].root.rotation.y=p.yaw;
 parts.wakes[i].material.opacity=.36+.14*Math.sin(t/DURATION*Math.PI*48+i);parts.wakes[i].root.scale.x=1+.08*Math.sin(t/DURATION*Math.PI*24+i);
 }
 for(let i=0;i<parts.cranes.length;i++) {
 const c=parts.cranes[i],p=cranePose(t+i*16);c.trolley.position.x=p.trolleyX;c.hook.position.set(p.trolleyX,p.hookY,0);c.cargo.position.set(p.cargoX,p.cargoY,0);
 const length=3.16-p.hookY;
 for(const cable of c.cables){cable.position.x=p.trolleyX;cable.position.y=p.hookY+length/2;cable.scale.y=length;}
 }
 },
 contacts({parts}) {
 // Real posed mesh endpoints: only report the primary crane's named contact schedule.
 const c=parts.cranes[0];c.root.updateMatrixWorld(true);c.hookAnchor.getWorldPosition(parts.v1);c.cargoAnchor.getWorldPosition(parts.v2);
 return [{label:'spreader meets container corner-lock plane',a:parts.v1.toArray(),b:parts.v2.toArray()}];
 }
});
