import {WORLD_CONTENT} from './world-content.js';

// Original, fixed Emberwatch floor plans. Rectangles are deliberately authored
// landmarks; there is no random room placement or copied reference-game map.
// Coordinates use the existing renderer's 32-unit world tiles.
export const CAMPAIGN_LAYOUTS = Object.freeze({
 ash_hamlet:{size:[34,30],rooms:{hamlet_square:[7,7,20,16]}},
 pine_reach:{size:[44,38],rooms:{pine_gate:[5,23,12,10],pine_lookout:[5,5,12,10],pine_canal:[28,23,11,10],pine_hidden_bank:[28,5,11,9]}},
 glass_marsh:{size:[49,51],rooms:{marsh_edge:[5,5,13,11],marsh_reeds:[5,25,13,10],marsh_shed:[30,5,12,10],marsh_dock:[30,25,12,11],cave_mouth:[18,39,13,8]}},
 echo_cave:{size:[43,36],rooms:{cave_entry:[5,5,10,10],cave_lake:[23,18,14,12]}},
 sunken_hall_1:{size:[62,42],rooms:{hall_foyer:[5,25,13,11],hall_bells:[25,17,16,13],hall_stairs:[46,5,11,11]}},
 sunken_hall_2:{size:[56,38],rooms:{water_landing:[5,21,12,11],water_valves:[11,4,13,10],water_causeway:[35,15,15,13]}},
 sunken_hall_3:{size:[68,42],rooms:{heart_threshold:[5,20,12,11],heart_ring:[27,11,20,20],heart_beacon:[53,19,10,11]}}
});
const center = ([x,y,w,h])=>({x:x+Math.floor(w/2)+.5,y:y+Math.floor(h/2)+.5});
const nodes=Object.fromEntries(WORLD_CONTENT.nodes.map(n=>[n.id,n]));

export function createCampaignLevel(regionId){
 const layout=CAMPAIGN_LAYOUTS[regionId];if(!layout)throw new Error('Unknown authored region: '+regionId);
 const [w,h]=layout.size,tiles=Array.from({length:h},()=>Array(w).fill(0)),rooms=[],anchors={},corridors=[],portals=[];
 const paint=(x,y,width,height)=>{for(let j=y;j<y+height;j++)for(let i=x;i<x+width;i++)if(j>0&&j<h-1&&i>0&&i<w-1)tiles[j][i]=1;};
 for(const [id,rectangle] of Object.entries(layout.rooms)){
  const [x,y,rw,rh]=rectangle,c=center(rectangle);paint(x,y,rw,rh);
  anchors[id]={x:c.x*32,y:c.y*32};rooms.push({id,index:rooms.length,x,y,w:rw,h:rh,cx:c.x,cy:c.y,name:nodes[id].name,kind:nodes[id].role});
 }
 const visited=new Set();
 for(const exit of WORLD_CONTENT.exits.filter(e=>nodes[e.from].regionId===regionId)){
  const a=anchors[exit.from],key=[exit.from,exit.to].sort().join(':');
  if(nodes[exit.to].regionId!==regionId){
   const siblings=portals.filter(p=>p.nodeId===exit.from).length;
   portals.push({id:exit.id,nodeId:exit.from,destinationNodeId:exit.to,destinationRegionId:nodes[exit.to].regionId,x:a.x+(siblings-1)*64,y:a.y+64});continue;
  }
  if(visited.has(key))continue;visited.add(key);
  const b=anchors[exit.to],ax=Math.floor(a.x/32),ay=Math.floor(a.y/32),bx=Math.floor(b.x/32),by=Math.floor(b.y/32);
  // Each graph edge is a fixed L-shaped gallery. Narrow corridors are three
  // tiles wide, leaving a 32-unit safe clearance for a 12-unit player radius.
  paint(Math.min(ax,bx)-1,ay-1,Math.abs(bx-ax)+3,3);paint(bx-1,Math.min(ay,by)-1,3,Math.abs(by-ay)+3);
  corridors.push({id:exit.id,from:exit.from,to:exit.to,points:[{x:a.x,y:a.y},{x:b.x,y:a.y},{x:b.x,y:b.y}],requirements:exit.requirements});
 }
 return {id:regionId,w,h,tiles,rooms,anchors,corridors,portals,layoutVersion:1};
}

export function campaignFloorContains(map,x,y,radius=12){
 if(![x,y,radius].every(Number.isFinite)||radius<0)return false;
 return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy])=>map.tiles[Math.floor((y+dy)/32)]?.[Math.floor((x+dx)/32)]===1);
}

export function moveCampaignActor(actor,map,dx,dy,radius=12){
 if(![dx,dy].every(Number.isFinite))return {dx:0,dy:0,blocked:true};
 const start={x:actor.x,y:actor.y},steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8));
 // Swept subdivision prevents a 100 ms stall or a charge from tunnelling
 // through the authored floor boundary. Axes slide independently at corners.
 for(let i=0;i<steps;i++){
  if(campaignFloorContains(map,actor.x+dx/steps,actor.y,radius))actor.x+=dx/steps;
  if(campaignFloorContains(map,actor.x,actor.y+dy/steps,radius))actor.y+=dy/steps;
 }
 const actual={dx:actor.x-start.x,dy:actor.y-start.y};return {...actual,blocked:Math.hypot(actual.dx,actual.dy)<.001};
}

export function closestCampaignLandmark(map,x,y){
 return map.rooms.reduce((best,room)=>{const p=map.anchors[room.id],distance=Math.hypot(x-p.x,y-p.y);return !best||distance<best.distance?{id:room.id,name:room.name,distance}:best;},null);
}
