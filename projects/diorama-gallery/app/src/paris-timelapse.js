import {defineWorld,toolkit} from '@diorama/worlds';
import {compileConstruction} from './construction-batches.js';
import {constructionTime,progressAt} from './dubai-timeline.js';
import {riverPose} from './paris-city.js';
import {buildParisScene} from './paris-scene.js';
import {createParisEnvironment} from './paris-environment.js';
export const PARIS_MOMENTS=Object.freeze([{time:0,label:'센강과 대지'},{time:12,label:'강변과 다리'},{time:25,label:'파리의 건축'},{time:40,label:'도시의 실루엣'},{time:52,label:'정원과 일상'},{time:60,label:'완성된 빛의 도시'},{time:68,label:'시간 되감기'}]);
export const PARIS_WEATHER=Object.freeze([['clear','맑은 날'],['cloudy','흐린 날'],['rain','비오는 날'],['snow','눈오는 날']]);
function constructionWindow(names,box){
 const n=names.join('/'),x=(box.min.x+box.max.x)/2,z=(box.min.z+box.max.z)/2;
 const building=(start,pace)=>[start+Math.max(0,box.min.y)*pace,start+Math.max(.001,box.max.y)*pace,'building'];
 if(n.includes('paris-stone-plinth'))return[-2,-1,'permanent'];
 if(n.includes('seine-river'))return n.includes('seine-quay')?[6+(x+8)*.3,11+(x+8)*.3,'road']:[-2,-1,'permanent'];
 if(n.includes('montmartre-hill')||n.includes('cite-island'))return[3+(box.min.y)*3,10+box.max.y*3,'land'];
 if(n.includes('paris-bridges')||n.includes('paris-boulevards'))return[8+(z+8)*.35,17+(z+8)*.35,'road'];
 if(n.includes('paris-gardens'))return[43+(x+8)*.22,50+(x+8)*.22,'plant'];
 if(n.includes('paris-streetlamps')||n.includes('paris-daily-life'))return[47,54,'life'];
 if(n.includes('eiffel-tower'))return building(23,3.3);
 if(n.includes('notre-dame'))return building(18,6.2);
 if(n.includes('louvre'))return building(21,8);
 if(n.includes('sacre-coeur'))return building(24,5);
 if(n.includes('arc-de-triomphe'))return building(28,6);
 if(n.includes('haussmann'))return building(22+(x+8)*.45+(z+8)*.12,6.7);
 return[3,10,'land'];
}
export default defineWorld({
 name:'paris-city-formation',title:'Paris · The City of Light',description:'A miniature Paris forms around the Seine: Eiffel Tower, Notre-Dame, the Louvre, Arc de Triomphe, Sacré-Cœur and warm-lit Haussmann boulevards. An artistic sequence, not a dated historical reconstruction.',
 duration:72,still:0,reducedStill:60,timeline:true,moments:PARIS_MOMENTS,environment:createParisEnvironment,weatherOptions:PARIS_WEATHER,
 rendering:{zoom:true,staticBatches:false,background:'#bfd4e7',camera:[20,22,25],padding:1.04,ambient:1.6,sunlight:3.2,groundColor:'#95a6a6',sunColor:'#ffe9bf',shadowSize:2048,samples:4,focus:.08,bias:-.00015,normalBias:.008,pixelRatio:1.75,framingBounds:[[[-8.3,-.4,-8.3],[8.3,2.8,8.3]],[[-6.2,.2,-1.4],[-3,11.3,2]],[[-1.8,.2,-2.6],[1.3,4.1,1.2]],[[.5,.1,-8.1],[6,5.5,-3.2]]]},
 bounds:[[-8.8,-.5,-8.8],[8.8,11.5,8.8]],
 build(W){const source=W.group();source.name='paris-construction-source';const S=toolkit(source);W.own({dispose:()=>S.dispose()});const {ground,district,landmarks,life,streets}=buildParisScene(S);const construction=compileConstruction(W,source,life.boats,constructionWindow);return{source,S,streets,boatPose:{},...ground,...district,landmarks,...life,construction,dynamicRoots:[source,construction.root]};},
 tick({t,parts}){const time=constructionTime(t),p=((t%72)+72)%72;parts.construction.update(time);parts.water.userData.time=p;if(parts.water.userData.shader)parts.water.userData.shader.uniforms.parisTime.value=p;const progress=progressAt(time,49,55);for(let i=0;i<parts.boats.length;i++){const boat=parts.boats[i],pose=riverPose(p/180+i/5,parts.boatPose);boat.position.set(pose.x,.15,pose.z);boat.rotation.y=pose.yaw;boat.scale.setScalar(progress);}}
});
