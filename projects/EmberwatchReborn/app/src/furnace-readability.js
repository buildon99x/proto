// Furnace-only, read-only architecture. The live tile map owns both cover and
// opened floor; quest flags, enemy activation and predicted choices do not.
import {FURNACE_REGION,FURNACE_REGIONS} from './furnace-content.js';

export const FURNACE_SCENE_STYLE=Object.freeze({
 coverKey:'lowwall',coverWidth:46,coverYScale:.85,coverFootOffset:8,
 edgeColor:'#c5b799',edgeAlpha:.65,edgeWidth:1.4,
 passageFill:'#aab6a2',passageFillAlpha:.24,
 passageEdge:'#c6ceba',passageEdgeAlpha:.68,passageEdgeWidth:1.5,
});
const open=(map,x,y)=>map?.tiles?.[y]?.[x]===1;
const visible=(seen,x,y)=>!seen||!!seen[y]?.[x];
export const isFurnaceScene=regionId=>regionId===FURNACE_REGION;

// One low reused masonry segment per real exposed tile edge, inset toward the
// solid tile. Mirroring supplies the other isometric axis from the same atlas.
// Only an adjacent seen, open floor tile may reveal a segment; unseen floor
// and closed door cells cannot acquire paving or decorative landmarks.
export function furnaceCoverSegments(regionId,map,seen=null){
 return isFurnaceScene(regionId)?lowCoverSegments(map,seen):[];
}
export function lowCoverSegments(map,seen=null){
 if(!map)return [];
 const segments=[];
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++){
  if(open(map,x,y))continue;
  const ax=x*32,ay=y*32;
  for(const [dx,dy,side] of [[0,-1,'north'],[1,0,'east'],[0,1,'south'],[-1,0,'west']]){
   if(!open(map,x+dx,y+dy)||!visible(seen,x+dx,y+dy))continue;
   const horizontal=dy!==0,px=horizontal?ax+16:ax+(dx>0?28:4),py=horizontal?ay+(dy>0?28:4):ay+16;
   const edge=horizontal?[{x:ax,y:ay+(dy>0?32:0)},{x:ax+32,y:ay+(dy>0?32:0)}]
    :[{x:ax+(dx>0?32:0),y:ay},{x:ax+(dx>0?32:0),y:ay+32}];
   segments.push({tile:{x,y},floor:{x:x+dx,y:y+dy},side,x:px,y:py,flipX:!horizontal,edge});
  }
 }
 return segments.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
}

// A visible paving band, not a hazard outline or an interaction prediction.
// Entire door geometry must actually be open. Each band is clipped by its
// own real/seen tile and proximity, including the wide exhaust cross-aisle.
export function furnaceOpenFloor(regionId,map,hero,seen=null,radius=320){
 return isFurnaceScene(regionId)?openedDoorFloors(FURNACE_REGIONS[FURNACE_REGION].doors,map,hero,seen,radius):[];
}
export function openedDoorFloors(doors,map,hero,seen=null,radius=320){
 if(!map||!Number.isFinite(hero?.x)||!Number.isFinite(hero?.y))return [];
 const passages=[];
 for(const [index,door] of doors.entries()){
  let opened=true;
  for(let y=door.y;y<door.y+door.h;y++)for(let x=door.x;x<door.x+door.w;x++)if(!open(map,x,y))opened=false;
  if(!opened)continue;
  const tiles=[];
  for(let y=door.y;y<door.y+door.h;y++)for(let x=door.x;x<door.x+door.w;x++){
   if(visible(seen,x,y)&&Math.hypot((x+.5)*32-hero.x,(y+.5)*32-hero.y)<=radius)tiles.push({x,y});
  }
  if(tiles.length)passages.push({id:`${door.unlockObjective}:${index}`,tiles});
 }
 return passages;
}
export function furnaceFloorBand(tile){
 const x=tile.x*32,y=tile.y*32;
 return [{x:x+1,y:y+11},{x:x+31,y:y+11},{x:x+31,y:y+21},{x:x+1,y:y+21}];
}
