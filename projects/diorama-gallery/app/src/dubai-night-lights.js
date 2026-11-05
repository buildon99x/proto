import {railPose, TRACK_LENGTH, RAIL_Y} from './dubai-motion.js';

// Only the formation world calls this builder. Authored/static Dubai is untouched.
const GLASS = new Set(['294f59','3c636c','44656a','618382','466a72','36575f','41636a','466b72','38666d','3f605c','4b6860','48665f','44675f']);
function hash(text) {
 let seed=2166136261;
 for (const c of text) seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 return seed/4294967296;
}
export function addDubaiNightLights(W, source) {
 const T=W.THREE, cache=new Map();
 source.traverse(object=>{
  if(!object.isMesh || !object.material?.color || !GLASS.has(object.material.color.getHexString()))return;
  let building;
  for(let parent=object.parent;parent&&parent!==source;parent=parent.parent){
   if(/^(skyline-tower-|city-block-|burj-khalifa$|burj-al-arab$|dubai-mall$|island-villa$|atlantis-palace$)/.test(parent.name)){building=parent;break;}
  }
  if(!building)return;
  // Group windows by building and a small number of floor circuits. The grouping
  // permits staggered neighborhoods without a material/draw-call per window.
  const buildingKey=`${building.name}/${building.position.x}/${building.position.z}`;
  const circuit=Math.floor(hash(buildingKey)*6), band=Math.abs(Math.floor(object.position.y*1.7))%3;
  const original=object.material,key=`${original.uuid}/${circuit}/${band}`;
  if(!cache.has(key)){
   const material=W.own(original.clone());
   const start=.07+circuit*.105+band*.037, end=Math.min(.97,start+.18);
   material.emissive.set('#ffd194');material.emissiveIntensity=0;
   material.userData.dubaiNight={start,end,power:1.8};
   const compile=original.onBeforeCompile;
   material.onBeforeCompile=shader=>{
    compile.call(original,shader);
    shader.vertexShader='varying vec3 dubaiWindowPosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndubaiWindowPosition=position;');
    shader.fragmentShader='varying vec3 dubaiWindowPosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec2 dubaiWindowCell=vec2((dubaiWindowPosition.x+dubaiWindowPosition.z)*20.0,dubaiWindowPosition.y*7.0);
      vec2 dubaiWindowGrid=fract(dubaiWindowCell);
      float dubaiWindowMask=step(.16,dubaiWindowGrid.x)*step(dubaiWindowGrid.x,.84)*step(.18,dubaiWindowGrid.y)*step(dubaiWindowGrid.y,.76);
      float dubaiWindowOccupied=step(.21,fract(sin(dot(floor(dubaiWindowCell),vec2(12.9898,78.233)))*43758.5453));
      totalEmissiveRadiance*=.10+.90*dubaiWindowMask*dubaiWindowOccupied;`);
   };
   material.customProgramCacheKey=()=>`${original.customProgramCacheKey()}/dubai-night-windows-v1`;
   cache.set(key,material);
  }
  object.material=cache.get(key);
 });
 const lamps=W.group(0,0,0,source);lamps.name='dubai-metro-night-lamps';
 const bulbGeometry=W.own(new T.BoxGeometry(.18,.04,.065));
 const bulbMaterials=Array.from({length:7},(_,i)=>{
  const material=W.own(new T.MeshStandardMaterial({color:'#dccba6',emissive:'#ffd095',emissiveIntensity:0,roughness:.45}));
  material.userData.dubaiNight={start:.04+i*.083,end:.21+i*.083,power:3.1};return material;
 });
 let lampCount=0;
 for(let distance=.85;distance<TRACK_LENGTH-.7;distance+=.85){
  const offset=-.49,p=railPose(distance,offset),root=W.group(p.x,RAIL_Y-.055,p.z,lamps);
  root.name=`metro-street-lamp-${lampCount}`;root.userData={distance,offset};root.rotation.y=p.yaw;
  // A short cantilever ties the outboard pole into the viaduct, below the wheels.
  const bracket=W.box(.28,.10,.12,'#9ba593',-.08,-.025,0,root);bracket.name='metro-lamp-cantilever';
  W.box(.10,.055,.12,'#838f83',0,.025,0,root);
  W.cylinder(.018,.99,'#8b9b91',0,.51,0,root,8);
  W.box(.20,.028,.045,'#aab6a7',.07,1,0,root);
  const bulb=new T.Mesh(bulbGeometry,bulbMaterials[Math.floor(hash(root.name)*7)]);
  bulb.name='metro-luminous-fixture';bulb.position.set(.09,.982,0);root.add(bulb);
  lampCount++;
 }
 return {lampCount,materialCount:cache.size+bulbMaterials.length};
}
