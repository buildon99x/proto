/* DEAD FREIGHT: original, deterministic 340 m Black Pines extraction region.
 * Pure data; load before core.js. Browser: DFWorld. Node: require('./world.js').
 * populate(mission) only authors the mission; movement/combat remain in core.js.
 */
(function(root){
'use strict';
const VERSION='0.6.0',SIZE=340;
const bounds={minX:-170,maxX:170,minZ:-170,maxZ:170};
const spawn={x:0,z:145,y:0};
const landmarks=[
 {id:'insertion',name:'남쪽 착륙장',short:'LZ',x:0,z:145,radius:20,role:'extraction'},
 {id:'lumber',name:'벌목 야영지',short:'LUMBER',x:-92,z:58,radius:26,role:'supplies'},
 {id:'depot',name:'화물 집하장',short:'DEPOT',x:77,z:42,radius:29,role:'cargo'},
 {id:'quarry',name:'폐채석장',short:'QUARRY',x:-78,z:-58,radius:27,role:'cargo'},
 {id:'relay',name:'북부 중계소',short:'RELAY',x:28,z:-130,radius:25,role:'objective'}
];
const route=(id,width,points)=>({id,width,points:points.map(([x,z])=>({x,z}))});
const routes=[
 route('insertion-road',10,[[0,145],[0,105],[-19,87]]),
 route('lumber-road',9,[[-19,87],[-51,75],[-92,58]]),
 route('depot-road',10,[[0,105],[43,85],[77,42]]),
 route('west-ridge',8,[[-92,58],[-108,12],[-94,-25],[-78,-58]]),
 route('relay-west',8,[[-78,-58],[-54,-97],[-16,-111],[28,-110],[28,-130]]),
 route('east-haul',10,[[77,42],[101,4],[102,-49],[77,-91],[59,-104],[28,-110],[28,-130]]),
 route('freight-cut',7,[[-92,58],[-46,29],[3,18],[42,25],[77,42]]),
 route('quarry-cut',6,[[-78,-58],[-74,-47],[-29,-42],[22,-36],[61,-17],[102,-49]]),
 route('evac-spur',7,[[102,-49],[134,-75],[138,-108]]),
 route('relay-evac',6,[[28,-130],[28,-154],[60,-154],[75,-142],[116,-130],[151,-128],[151,-108],[138,-108]])
];
const extractionZones=[
 {id:'south-lz',name:'남쪽 착륙장',x:0,z:145,radius:7,holdTime:6},
 {id:'east-evac',name:'동쪽 긴급 회수장',x:138,z:-108,radius:7,holdTime:6}
];
function segmentDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)):0;return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
function routeDistance(x,z){let best=Infinity;for(const r of routes)for(let i=1;i<r.points.length;i++)best=Math.min(best,segmentDistance(x,z,r.points[i-1],r.points[i])-r.width/2);return best;}
function createDefinition(){
 const walls=[],trees=[],details=[],pickups=[],enemies=[];let seed=196731;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const wall=(x,z,w,d,h,kind='concrete',options={})=>{const v={id:walls.length,x,z,w,d,h,kind,y:0,destructible:false,...options};walls.push(v);return v;};
 const detail=(type,x,z,data={})=>details.push({type,x,z,...data});
 const pickup=(type,x,z,data={})=>pickups.push({type,x,z,alive:true,...data});
 const guard=(zone,x,z,data={})=>enemies.push({id:enemies.length,x,z,hp:70,boss:false,alive:true,attack:1+rnd()*2,windup:0,alert:false,phase:rnd()*6,hit:0,homeX:x,homeZ:z,activationRange:31,leash:38,zone,...data});
 // Four collision bounds remain hidden. The perimeter is visible as dense forest.
 wall(-171,0,2,344,36,'boundary');wall(171,0,2,344,36,'boundary');wall(0,-171,344,2,36,'boundary');wall(0,171,344,2,36,'boundary');
 // South insertion: a safe, readable 40 m practice lane with optional side obstacles.
 wall(-16,144,.7,11,3.6,'wood');wall(-10,150,12,.7,3.6,'wood');wall(-4,147,.7,6,3.6,'wood');
 wall(-10,144,13,12,.35,'wood',{y:3.6});detail('hut-roof',-10,144,{w:14,d:13,y:4});
 wall(-8,123,6,1.1,.75,'wood',{vaultable:true});wall(8,119,5,1,.9,'concrete',{vaultable:true});
 wall(-10,113,.7,2,2.7,'wood');wall(-4,113,.7,2,2.7,'wood');wall(-7,113,6.7,1,.6,'wood',{y:1.05,slideable:true});
 detail('practice',-8,124);detail('sign',0,134,{text:'BLACK PINES / 340 m',width:12,y:4.2});
 detail('direction',13,108,{text:'LUMBER ←   → DEPOT',width:9,y:2.8});
 pickup('ammo',5,144);pickup('health',8,144);pickup('armor',-8,144);
 // Lumber camp: log stacks, a sawn-timber shelter and a breaching shortcut.
 for(const [x,z,w,d] of [[-106,69,10,3],[-82,43,9,3],[-114,40,7,3]]){wall(x,z,w,d,1.1,'wood',{vaultable:true});detail('log-stack',x,z,{w,d});}
 wall(-112,55,.6,13,3.8,'wood');wall(-105,49,14,.6,3.8,'wood');wall(-99,52,.6,6,3.8,'wood');wall(-105,55,15,14,.3,'wood',{y:3.8});detail('hut-roof',-105,55,{w:16,d:15,y:4.2});
 wall(-77,71,9,7,2.8,'wood');detail('sawmill',-77,71,{w:9,d:7,y:2.8});
 for(let i=0;i<5;i++)wall(-93+i*1.15,43,1.1,.7,2.1,'wood',{destructible:true});
 for(const [x,z] of [[-86,64],[-103,38],[-72,57]])wall(x,z,2.2,2.2,.9,'crate',{vaultable:true});
 detail('sign',-94,76,{text:'01 / TIMBER CAMP',width:12,y:3.1});
 pickup('cargo',-108,55,{value:175,label:'기계 부품'});pickup('ammo',-83,65);pickup('health',-109,34);pickup('barrel',-82,46,{hp:25});
 guard('lumber',-96,51);guard('lumber',-79,57);guard('lumber',-106,29);
 // Depot: offset freight containers and overhead rail gantry create readable cover lanes.
 for(const [x,z,w,d] of [[61,27,11,4],[94,44,13,4],[58,54,10,4],[80,24,4,12]]){wall(x,z,w,d,3.2,'steel');detail('container',x,z,{w,d});}
 wall(80,65,16,.8,4.6,'concrete');wall(72,60,.8,10,4.6,'concrete');wall(88,62,.8,6,4.6,'concrete');wall(80,60,17,11,.35,'steel',{y:4.6});
 for(const x of [69,86])wall(x,40,.8,.8,8,'steel');wall(77.5,40,18,.7,.6,'steel',{y:8});detail('gantry',77.5,40,{width:18,y:8.6});
 for(const [x,z] of [[78,32],[94,56],[55,44],[91,10]])wall(x,z,2.4,2.4,.85,'crate',{vaultable:true});
 detail('rail',103,43,{length:66});detail('sign',77,66,{text:'02 / FREIGHT DEPOT',width:13,y:3.1});
 pickup('cargo',80,59,{value:250,label:'봉인 화물'});pickup('cargo',99,29,{value:150,label:'공구 상자'});pickup('ammo',55,39);pickup('armor',95,58);pickup('health',83,17);pickup('barrel',66,23,{hp:25});pickup('barrel',97,47,{hp:25});
 guard('depot',75,48);guard('depot',89,37);guard('depot',64,23);guard('depot',100,19);
 // Quarry: rock fingers shape several routes around the yard without fake hills.
 for(const [x,z,w,d,h] of [[-97,-57,8,14,4],[-78,-78,15,7,4.2],[-56,-60,7,14,3.1],[-94,-39,7,6,2.4],[-64,-42,7,5,2.8],[-87,-69,4,4,.85],[-68,-65,5,3,.9]])wall(x,z,w,d,h,'rock',{vaultable:h<1});
 wall(-90,-49,9,4,2.8,'steel');detail('tip-wagon',-90,-49,{w:9,d:4});
 wall(-62,-76,3,3,8,'steel');detail('crane',-62,-76,{y:8});
 detail('quarry',-78,-58,{radius:24});detail('sign',-76,-32,{text:'03 / STONE QUARRY',width:12,y:3.2});
 pickup('cargo',-84,-62,{value:225,label:'채굴 장비'});pickup('ammo',-76,-42);pickup('health',-99,-47);pickup('barrel',-65,-70,{hp:25});
 guard('quarry',-73,-61);guard('quarry',-85,-55);guard('quarry',-68,-79);
 // Relay: broken concrete courtyard, four low jumpable blocks and a tall radio mast.
 for(const [x,z,w,d,h] of [[9,-134,1.2,21,4],[15,-149,15,1.2,4.4],[41,-149,15,1.2,4.4],[48,-132,1.2,20,3.6],[13,-115,10,1.2,2.6],[41,-115,10,1.2,2.6],[20,-138,4,2,.85],[35,-121,4,2,.85],[40,-143,5,2,.9],[15,-126,3,2,.9]])wall(x,z,w,d,h,'concrete',{vaultable:h<1});
 wall(44,-139,4,4,3.5,'concrete');for(const x of [42.5,45.5])for(const z of [-140.5,-137.5])wall(x,z,.28,.28,21.5,'steel',{y:3.5});detail('mast',44,-139,{height:25});
 wall(15,-145,8,5,2.5,'steel');detail('relay-equipment',15,-145,{w:8,d:5});
 detail('sign',28,-116,{text:'04 / NORTH RELAY',width:12,y:3.8});
 pickup('ammo',22,-117);pickup('health',48,-111);pickup('armor',32,-145);pickup('cargo',14,-130,{value:300,label:'통신 기록'});pickup('barrel',38,-135,{hp:25});
 guard('relay',26,-120,{activationRange:35});guard('relay',37,-132,{activationRange:35});guard('relay',19,-135,{activationRange:35});guard('relay',43,-109,{activationRange:35});
 // Side-route rewards make the connecting woodland more than transit distance.
 for(const [x,z] of [[-39,35],[8,-44],[121,-70],[-114,2],[55,80]])wall(x,z,4,2,.8,'wood',{vaultable:true});
 pickup('cargo',4,-41,{value:125,label:'밀수품'});pickup('ammo',-113,7);pickup('health',121,-64);pickup('barrel',-40,38,{hp:25});
 guard('crossroads',-39,27,{activationRange:25,leash:26});guard('crossroads',10,-33,{activationRange:25,leash:26});
 // Emergency extraction has sheltered approach, smoke marker and an optional quick exit.
 wall(127,-111,1,9,2.5,'concrete');wall(134,-119,15,1,2.5,'concrete');
 detail('sign',138,-97,{text:'EAST EVAC / HOLD 6 s',width:11,y:3.2});pickup('ammo',146,-105);
 detail('direction',-120,15,{text:'QUARRY ↑   LUMBER ↓',width:8,y:2.8});
 detail('direction',103,-49,{text:'RELAY ←   EVAC →',width:9,y:2.8});
 detail('direction',-28,-32,{text:'DEPOT →   ← QUARRY',width:9,y:2.8});
 // Narrow sign supports are physical. Panels sit above the standing head.
 for(const s of details.filter(v=>v.type==='sign'||v.type==='direction')){for(const x of [s.x-s.width/2-.25,s.x+s.width/2+.25])wall(x,s.z,.18,.18,s.y+.45,'steel');}
 // Physical posts for the powered night work lamps.
 for(const l of landmarks)wall(l.x+7,l.z+7,.22,.22,4.8,'steel',{renderProxy:true});
 // Deterministic forest: clear actual roads, landmarks, loot, opponents and major cover.
 // Every visible trunk in the traversable region has a matching narrow solid collider.
 let attempts=0;
 while(trees.length<720&&attempts++<16000){
  const x=-165+rnd()*330,z=-165+rnd()*330;
  if(routeDistance(x,z)<3.2||landmarks.some(v=>Math.hypot(x-v.x,z-v.z)<v.radius+2)||extractionZones.some(v=>Math.hypot(x-v.x,z-v.z)<13))continue;
  if(walls.some(w=>w.kind!=='boundary'&&Math.abs(x-w.x)<w.w/2+3&&Math.abs(z-w.z)<w.d/2+3))continue;
  if(pickups.some(p=>Math.hypot(x-p.x,z-p.z)<4)||enemies.some(e=>Math.hypot(x-e.x,z-e.z)<4))continue;
  if(trees.some(t=>Math.hypot(x-t.x,z-t.z)<3.4))continue;
  const h=13+rnd()*14,r=.3+rnd()*.19,crown=2.6+rnd()*2.1;
  const trunk=wall(x,z,r*2,r*2,h,'trunk',{treeIndex:trees.length});
  trees.push({x,z,h,r,crown,rotation:rnd()*Math.PI*2,wallId:trunk.id,tone:Math.floor(rnd()*3)});
 }
 // Boss is last for existing combat/HUD compatibility; its token stays core-owned.
 guard('relay',28,-136,{boss:true,hp:180,activationRange:37,leash:27});
 return {version:VERSION,size:SIZE,bounds:{...bounds},spawn:{...spawn},landmarks:landmarks.map(l=>({...l})),routes:routes.map(r=>({...r,points:r.points.map(p=>({...p}))})),extractionZones:extractionZones.map(e=>({...e})),walls,trees,details,pickups,enemies,stats:{treeCount:trees.length,wallCount:walls.length,enemyCount:enemies.length,routeCount:routes.length}};
}
const definition=createDefinition();
function populate(mission){
 const region=definition;mission.region=region;mission.bounds={...region.bounds};mission.landmarks=region.landmarks;mission.routes=region.routes;mission.extractionZones=region.extractionZones.map(e=>({...e}));
 Object.assign(mission.player,region.spawn);
 for(const v of region.walls){const w=mission.wall(v.x,v.z,v.w,v.d,v.h,v.kind,v.destructible,v.y);Object.assign(w,{y:v.y||0,vaultable:!!v.vaultable,slideable:!!v.slideable,treeIndex:v.treeIndex,renderProxy:!!v.renderProxy});}
 for(const p of region.pickups)mission.pickups.push({...p});
 for(const e of region.enemies)mission.enemies.push({...e,id:mission.enemies.length,attack:1+mission.rand()*2,phase:mission.rand()*6});
 return region;
}
const api={VERSION,SIZE,bounds,spawn,landmarks,routes,extractionZones,definition,createDefinition,populate,segmentDistance,routeDistance};
root.DFWorld=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
