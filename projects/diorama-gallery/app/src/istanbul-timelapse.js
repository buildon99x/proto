import {defineWorld,toolkit} from '@diorama/worlds';
import {buildLandmarks} from './istanbul-landmarks.js';
import {buildCity} from './istanbul-city.js';
import {compileConstruction} from './construction-batches.js';
import {DURATION,PHASES,cityTime,cityWindow,progress} from './istanbul-timeline.js';
import {createIstanbulEnvironment} from './istanbul-environment.js';
const BOAT_PATHS=[[-6.8,7,.65,.40],[-4,8.4,.7,.4],[-1,11,.7,.4],[4.8,7.5,.7,.4],[4.4,5.6,.6,.35]];
export default defineWorld({
 name:'istanbul-city-formation',title:'İstanbul · When the City Lights Up',description:'An artistic Istanbul miniature takes shape: Hagia Sophia, the Blue Mosque, Galata Tower, a palace courtyard, waterfront houses, red trams, a suspension bridge and Maiden’s Tower. Thousands of warm windows light the completed blue-hour city. This is a compressed artistic composition, not a geographic or dated historical reconstruction.',
 duration:DURATION,still:0,reducedStill:60,timeline:true,environment:createIstanbulEnvironment,moments:PHASES,
 bounds:[[-8.5,-.5,-9.0],[9.5,11.8,13.1]],
 rendering:{zoom:true,staticBatches:false,background:'#2b4263',camera:[-19,38,32],padding:.66,ambient:1.35,sunlight:2.8,groundColor:'#686879',sunColor:'#ffe2b3',shadowSize:2048,samples:4,focus:.06,bias:-.00012,normalBias:.014,pixelRatio:1.75,framingBounds:[[[-8.3,-.5,-8.05],[8.3,.4,12.95]],[[-6.8,.2,-7.5],[-.5,8.0,-1.3]],[[2.3,.2,-2.9],[7.7,8.1,2.3]],[[-.85,.2,-.7],[.6,5.95,.7]],[[-2.5,7.1,-8.8],[9.1,10.2,-2.1]]].map(region=>region.map(([x,y,z])=>[x-1.5,y-1.15,z]))},
 build(W){
  const source=W.group();source.name='istanbul-construction-source';const S=toolkit(source);W.own({dispose:()=>S.dispose()});
  const landmarks=buildLandmarks(S),city=buildCity(S);
  for(const [index,landmark] of landmarks.roots.slice(0,2).entries()){const body=S.group(0,0,0,landmark);for(const child of [...landmark.children])if(child!==body&&child.name!=='minaret')body.add(child);body.scale.y=index?1.05:1.1;landmark.position.set(index?5:-1.8,1.0,index?-.4:-4.4);landmark.scale.set(index?1.05:1.25,1.1,index?1.05:1.25);landmark.rotation.y=-Math.PI/2;}
  const terraces=S.group();terraces.name='istanbul-monument-terraces';for(const [x,z,w,d] of [[-1.8,-4.4,6.25,6.1],[4.7,-.4,6.1,5.35]]){S.box(w,.78,d,'#aaa18f',x,.61,z,terraces);S.box(w+.12,.07,d+.12,'#c2b49d',x,1.02,z,terraces);for(let step=0;step<6;step++)x<0?S.box(.95,.13,.22,'#b7ab96',x,.31+step*.13,z+d/2+.72-step*.14,terraces):S.box(.22,.13,.95,'#b7ab96',x-w/2-.72+step*.14,.31+step*.13,z,terraces);}
  landmarks.roots[3].position.set(-6.2,.22,.15);landmarks.roots[3].scale.y=1.4;landmarks.roots[2].position.x=.1;
  for(const house of city.homes.children)house.scale.y=.86;
  source.updateMatrixWorld(true);const footprint=[...landmarks.roots,...city.homes.children].map(root=>new W.THREE.Box3().setFromObject(root));for(const plant of [...city.gardens.children])if((plant.position.x>.75&&plant.position.z< -7.9+(plant.position.x-.75)*4.5/7.25)||footprint.some(b=>plant.position.x>b.min.x&&plant.position.x<b.max.x&&plant.position.z>b.min.z&&plant.position.z<b.max.z))plant.removeFromParent();
  const luminousMaterials=[...landmarks.luminousMaterials,...city.luminousMaterials];
  for(const material of luminousMaterials){material.userData.istanbulLuminous=Math.max(.9,material.emissiveIntensity);material.emissiveIntensity=.025;}
  const dynamicRoots=city.dynamicRoots,construction=compileConstruction(W,source,dynamicRoots,cityWindow);
  const compile=city.water.onBeforeCompile;city.water.onBeforeCompile=shader=>{compile(shader);shader.uniforms.singaporeTime.value=city.water.userData.currentTime??0;};
  return{source,S,city,landmarks,construction,luminousMaterials,dynamicRoots:[source,construction.root]};
 },
 tick({t,parts}){
  const time=cityTime(t),motion=((t%DURATION)+DURATION)%DURATION,life=progress(time,48,52),lit=progress(time,49,57);
  parts.construction.update(time);
  for(const material of parts.luminousMaterials)material.emissiveIntensity=.025+lit*material.userData.istanbulLuminous;
  for(const light of parts.city.lights)light.intensity=lit*light.userData.nightPower;
  parts.city.water.userData.currentTime=motion/DURATION*120;if(parts.city.water.userData.shader)parts.city.water.userData.shader.uniforms.singaporeTime.value=motion/DURATION*120;
  parts.city.trams.forEach((tram,i)=>{const p=(motion/DURATION*2+i/3)%1,x=-6.9+13.8*(.5-.5*Math.cos(p*Math.PI*2));tram.position.set(i===0?-7.2+(x+6.9)/13.8*5.1:-1.1+(x+6.9)/13.8*8.3,.29,i===0?3.75:i===1?3.43:3.75);tram.rotation.y=p<.5?0:Math.PI;tram.scale.setScalar(life);});
  parts.city.boats.forEach((boat,i)=>{const a=motion/DURATION*Math.PI*2+i*1.37,[x,z,rx,rz]=BOAT_PATHS[i];boat.position.set(x+Math.cos(a)*rx,.045,z+Math.sin(a)*rz);boat.rotation.y=Math.atan2(-Math.sin(a)*rx,Math.cos(a)*rz)+Math.PI;boat.scale.setScalar(life);});
  parts.city.title.visible=time>7;parts.city.title.scale.setScalar(progress(time,5,12));
 }
});
