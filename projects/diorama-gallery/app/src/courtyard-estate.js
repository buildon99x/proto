import {defineWorld} from '@diorama/worlds';
import {buildEstateArchitecture} from './estate-architecture.js';
import {buildEstateGardens,animateEstateGardens} from './estate-gardens.js';
const DURATION=48;

function paving(W){
 const root=W.group();root.name='estate-paving';
 W.box(17.2,.22,25.2,'#8b897b',0,-.17,0,root);
 W.box(16.9,.06,24.9,'#bdb8a3',0,-.03,0,root);
 const stone=['#c7c5b5','#bebdab','#d0ccbb','#b7b7a6'];
 // One shared grid covers the union of walkways: crossings never stack coplanar tiles.
 const paths=[[0,0,2.05,23.6],[0,8,15.7,1.1],[0,-8.4,15.7,1.15],[-4.9,-4.2,4.4,2],[5.4,-4.2,3.6,2],[-4.9,.7,4.4,1.2],[5.4,3.8,3.6,1.05],[-7.65,0,.7,22.9],[7.65,0,.7,22.9]];
 for(let j=0;j<36;j++)for(let i=0;i<32;i++){
  const x=-7.75+i*.5,z=-11.375+j*.65;
  if(!paths.some(([px,pz,w,d])=>Math.abs(x-px)<=w/2&&Math.abs(z-pz)<=d/2))continue;
  const tile=W.box(.482,.025,.632,stone[(i+j*3)%stone.length],x,.017,z,root);tile.name='estate-paving-tile';
 }
 // A tidy central axis is visible through the open front gate and inner courts.
 for(const [x,z,w,d] of [[-1.5,-2.1,.36,4],[1.5,-2.1,.36,4],[-4.1,8.15,.2,5.2]])W.box(w,.018,d,'#9a9e7b',x,.032,z,root);
 return root;
}
function visitors(W){
 const root=W.group();root.name='estate-visitors';
 const people=[];
 for(const [i,[x,z,yaw]] of [[0,[.25,9.8,-.4]],[1,[-1.05,8.2,.8]],[2,[.08,-1.8,Math.PI]],[3,[-4.5,-3.5,.6]],[4,[6.5,3.8,1.8]],[5,[5.7,-8.3,-1.5]],[6,[-4.1,-8.4,.5]]]){
  const person=W.person(x,z,['#384e5a','#81765e','#b18c6c','#54615b'][i%4],'#414a45',.22,'#d0af8e');
  root.attach(person.root);person.root.position.y=.05;person.root.rotation.y=yaw;people.push(person);
 }
 return {root,people};
}
export default defineWorld({
 name:'courtyard-estate',title:'Courtyard Estate · A Garden Within',
 description:'A gray-tiled East Asian courtyard residence: a two-tier timber hall, open front gate, connected roofed corridors, quiet rooms and rear service courts. Koi swim below an arched wooden bridge among willows, clipped pines, flowering trees and stone lanterns. An artistic miniature inspired by the supplied reference, not a historical reconstruction.',
 duration:DURATION,still:12,reducedStill:12,
 moments:[{time:0,label:'시작'},{time:12,label:'정원의 아침'},{time:24,label:'연못의 물결'},{time:36,label:'고요한 안뜰'}],
 bounds:[[-9.2,-.3,-13.2],[9.2,4.6,13.4]],
 rendering:{zoom:true,orbitFit:true,staticBatches:true,background:'#e1e2da',camera:[1.1,30,29],padding:1.025,ambient:1.5,sunlight:2.7,groundColor:'#a7ac98',sunColor:'#fff0d4',shadowSize:2048,samples:4,focus:.05,bias:-.00015,normalBias:.014,pixelRatio:1.75},
 build(W){
  const ground=paving(W),architecture=buildEstateArchitecture(W),gardens=buildEstateGardens(W),life=visitors(W);
  return {ground,architecture,gardens,life,dynamicRoots:[...gardens.fish,...gardens.willowCrowns]};
 },
 tick({t,parts,W}){animateEstateGardens({t:((t%DURATION)+DURATION)%DURATION,parts:parts.gardens,W});}
});
