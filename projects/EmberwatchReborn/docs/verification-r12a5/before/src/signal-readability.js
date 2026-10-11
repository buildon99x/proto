// Authored Emberwatch S/F presentation. These dimensions and ground symbols never
// participate in targeting, collision, enemy timing, rewards or saved state.
import {SIGNAL_REGION,SIGNAL_REGIONS} from './signal-content.js';
import {FURNACE_REGION} from './furnace-content.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const ROLES=freeze({
 signal_runner:{height:42,widthScale:.9,mark:'double-chevron',lines:[
  [[-17,3],[-10,0],[-3,3]],[[-17,8],[-10,5],[-3,8]],
  [[3,3],[10,0],[17,3]],[[3,8],[10,5],[17,8]],
 ]},
 signal_archer:{height:46,widthScale:.86,mark:'forked-arrow',lines:[
  [[-15,6],[0,-1],[15,6]],[[-15,6],[-8,6]],[[-15,6],[-15,2]],
  [[15,6],[8,6]],[[15,6],[15,2]],[[0,-1],[0,9]],
 ]},
 signal_keeper:{height:52,widthScale:1.1,mark:'broad-shield',lines:[
  [[-18,0],[-18,5],[0,12],[18,5],[18,0]],
  [[-12,0],[-12,3],[0,8],[12,3],[12,0]],
 ]},
});
// F reuses the established authored glyphs, not the S silhouette proportions.
// Omitting height/widthScale retains the renderer's current F body/occlusion
// defaults. Visibility, keyline, shadow offset and danger layering stay shared.
const FURNACE_ROLES=freeze({
 furnace_tender:{mark:ROLES.signal_runner.mark,lines:ROLES.signal_runner.lines},
 furnace_nozzle:{mark:ROLES.signal_archer.mark,lines:ROLES.signal_archer.lines},
 furnace_warden:{mark:ROLES.signal_keeper.mark,lines:ROLES.signal_keeper.lines},
});
// A narrow dark keyline separates the unchanged symbols from the noisy floor.
// An eight-unit screen-down shift clears the actors' five-pixel ground shadows.
export const SIGNAL_MARK_STYLE=freeze({roleColor:'#d8ded2',roleAlpha:.8,roleWidth:1.25,
 roleOutlineColor:'#111626',roleOutlineAlpha:.85,roleOutlineWidth:3.25,roleOffsetY:8,
 passageColor:'#9faeaa',passageAlpha:.45,passageWidth:1.2});

export function signalRolePresentation(actor,regionId){
 if(regionId===FURNACE_REGION)return Object.hasOwn(FURNACE_ROLES,actor?.kind)?FURNACE_ROLES[actor.kind]:null;
 return regionId===SIGNAL_REGION&&Object.hasOwn(ROLES,actor?.kind)?ROLES[actor.kind]:null;
}

// The map is authoritative, not a quest flag or a predicted interaction result.
// Only the opened threshold and its real, seen landing tiles receive ticks.
// The central lane keeps the marks small and avoids outlining an attack area.
export function signalOpenPassages(regionId,map,hero,seen=null,radius=240){
 if(regionId!==SIGNAL_REGION||!map||!Number.isFinite(hero?.x)||!Number.isFinite(hero?.y))return [];
 const passages=[];
 for(const door of SIGNAL_REGIONS.signal_basin.doors){
  let open=true;
  for(let y=door.y;y<door.y+door.h;y++)for(let x=door.x;x<door.x+door.w;x++)if(map.tiles[y]?.[x]!==1)open=false;
  if(!open)continue;
  const center={x:(door.x+door.w/2)*32,y:(door.y+door.h/2)*32};
  if(Math.hypot(center.x-hero.x,center.y-hero.y)>radius)continue;
  const tiles=[],lo=door.x+Math.floor((door.w-1)/2),hi=door.x+Math.floor(door.w/2);
  for(let y=door.y-1;y<=door.y+door.h;y++)for(let x=lo;x<=hi;x++){
   if(map.tiles[y]?.[x]===1&&(!seen||seen[y]?.[x]))tiles.push({x,y});
  }
  if(tiles.length)passages.push({id:door.unlockObjective,tiles});
 }
 return passages;
}

// Two inset corner ticks per tile, with no filled surface or animated glow.
export function signalPassageTickLines(tile){
 const x=tile.x*32,y=tile.y*32;
 return [
  [{x:x+8,y:y+14},{x:x+8,y:y+8},{x:x+14,y:y+8}],
  [{x:x+18,y:y+24},{x:x+24,y:y+24},{x:x+24,y:y+18}],
 ];
}
