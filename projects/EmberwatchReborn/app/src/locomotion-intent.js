import {inMap,traceSegment,findPathStep} from './world-geometry.js';
const point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
// Reborn implementation choices: radius11 collision, 2px arrival tolerance,
// cardinal tile path, no automatic entity approach or hidden nearest target.
export function createLocomotionIntent(){
 let destination=null,identity=null,lastMove=null,moveOwner=null;
// Direction is transient and owned by click locomotion, never saved key history.
 // Arrival/touch release retain it; public safety clearing drops the owner too.
 const clearRoute=()=>{destination=null;identity=null;};
 const clear=()=>{clearRoute();lastMove=null;moveOwner=null;};
 const sameOwner=(owner,battle)=>owner&&owner.battle===battle&&owner.life===battle.stateLife&&owner.region===battle.region;
 function bind(battle){if(!sameOwner(moveOwner,battle)){clear();moveOwner={battle,life:battle.stateLife,region:battle.region};}}
 function result(value){if(value.move.x||value.move.y)lastMove={...value.move};return {...value,lastMove:lastMove?{...lastMove}:null};}
 function press(target,battle){if(!battle||!point(target)||!inMap(battle.map,target.x,target.y,11)){clearRoute();return false;}bind(battle);destination={x:target.x,y:target.y};identity={battle,life:battle.stateLife,region:battle.region};return true;}
 function step({battle,mode='wasd',keys={x:0,y:0},touch={x:0,y:0},held=false,groundPoint=null,stop=false,attackInPlace=false,stopForInPlace=false}={}){
  if(!battle||battle.dead||battle.p.hp<=0||identity&&(identity.battle!==battle||identity.life!==battle.stateLife||identity.region!==battle.region)){clear();return {move:{x:0,y:0},distance:0,destination:null};}
  if(mode==='wasd'){clear();return {move:point(keys)?{...keys}:{x:0,y:0},distance:Infinity,destination:null};}
  bind(battle);
  if(stop||attackInPlace&&stopForInPlace){clearRoute();return result({move:{x:0,y:0},distance:0,destination:null});}
  // A touched direction replaces the old click route; releasing it stops.
  if(point(touch)&&(touch.x||touch.y)){clearRoute();return result({move:{...touch},distance:Infinity,destination:null});}
  if(held&&point(groundPoint))press(groundPoint,battle);
  if(!destination)return result({move:{x:0,y:0},distance:0,destination:null});
  const remaining=Math.hypot(destination.x-battle.p.x,destination.y-battle.p.y);
  if(remaining<=2){clearRoute();return result({move:{x:0,y:0},distance:0,destination:null});}
  const direct=traceSegment(battle.map,battle.p,destination,11);let next=direct.blocked?findPathStep(battle.map,battle.p,destination):destination;
  if(!next){clearRoute();return result({move:{x:0,y:0},distance:0,destination:null,blocked:true});}
  // Tile BFS may advance as soon as the player's center crosses a tile edge.
  // A diagonal turn from there can still clip the previous corner at radius11.
  // Finish centering in the current tile before taking that unsafe next leg.
  if(direct.blocked&&traceSegment(battle.map,battle.p,next,11).blocked){
   const center={x:Math.floor(battle.p.x/32)*32+16,y:Math.floor(battle.p.y/32)*32+16};
   if(traceSegment(battle.map,battle.p,center,11).blocked||Math.hypot(center.x-battle.p.x,center.y-battle.p.y)<.001){clearRoute();return result({move:{x:0,y:0},distance:0,destination:null,blocked:true});}
   next=center;
  }
  const x=next.x-battle.p.x,y=next.y-battle.p.y,n=Math.hypot(x,y);
  return result({move:n>0?{x:x/n,y:y/n}:{x:0,y:0},distance:n,waypoint:{...next},destination:{...destination}});
 }
 return {press,step,clear,get destination(){return destination?{...destination}:null;}};
}
