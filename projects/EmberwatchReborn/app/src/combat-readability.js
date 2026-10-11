import {signalRolePresentation} from './signal-readability.js';
// Localized character occlusion response. It never changes collision, damage,
// telegraph opacity, camera position or the player's input.
export function combatActorOpacity(actor,hero,regionId) {
 if(!actor||!hero||actor.hp<=0||!actor.active)return 1;
 const dx=(actor.x-actor.y)-(hero.x-hero.y),dy=((actor.x+actor.y)-(hero.x+hero.y))*.53;
 const role=signalRolePresentation(actor,regionId);
 const height=role?.height??(actor.type==='boss'?100:46),width=(actor.type==='boss'?48:26)*(role?.widthScale??1);
 const coversHero=dy>0&&dy<height-10&&Math.abs(dx)<width+12;
 return coversHero?.64:1;
}
// A small nearby walking corridor is protected even outside combat. Far walls
// remain full-height/opaque. This changes only rendering, never map membership.
export function localPassageBounds(hero,screen,zoom=1.26){
 return {left:screen.x-95*zoom,right:screen.x+95*zoom,top:screen.y-60*zoom,bottom:screen.y+38*zoom,depth:hero.x+hero.y-96};
}
export function nearbyFloorEdges(map,hero,radius=190){
 const edges=[];const loX=Math.max(0,Math.floor((hero.x-radius)/32)),hiX=Math.min(map.w-1,Math.ceil((hero.x+radius)/32)),loY=Math.max(0,Math.floor((hero.y-radius)/32)),hiY=Math.min(map.h-1,Math.ceil((hero.y+radius)/32));
 for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
  if(!map.tiles[y]?.[x]||Math.hypot((x+.5)*32-hero.x,(y+.5)*32-hero.y)>radius)continue;
  const ax=x*32,ay=y*32;
  if(!map.tiles[y-1]?.[x])edges.push([{x:ax,y:ay},{x:ax+32,y:ay}]);
  if(!map.tiles[y+1]?.[x])edges.push([{x:ax,y:ay+32},{x:ax+32,y:ay+32}]);
  if(!map.tiles[y]?.[x-1])edges.push([{x:ax,y:ay},{x:ax,y:ay+32}]);
  if(!map.tiles[y]?.[x+1])edges.push([{x:ax+32,y:ay},{x:ax+32,y:ay+32}]);
 }
 return edges;
}
