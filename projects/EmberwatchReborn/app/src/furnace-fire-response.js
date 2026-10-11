import {inMap,traceSegment} from './world-geometry.js';

// R9 Emberwatch-authored tender behavior, not a source-game AI rule. Combat
// opts in explicitly; the damage loop remains the sole owner of fire ticks.
const REACTION=.55,MAX_DISTANCE=64,MAX_SECONDS=1,PROBE_STEP=4;
const diagonal=Math.SQRT1_2;
const DIRECTIONS=[[1,0],[diagonal,diagonal],[0,1],[-diagonal,diagonal],[-1,0],[-diagonal,-diagonal],[0,-1],[diagonal,-diagonal]];

export function interruptFireEscape(e){
 if(!e.fireResponse)return;
 e.fireResponse.escape=null;
 if(e.state==='fireEscape'){e.state='idle';e.moving=false;}
}
export function clearFireResponse(e){
 if(!e.fireResponse)return;
 interruptFireEscape(e);e.fireResponse=null;
}
export function observeFireExposure(b,e,dt,contains){
 // An unborn/non-damaging/expired area cannot grant pre-cast knowledge. A
 // replacement is a new opportunity, even when cast at the same battle time.
 const area=b.areas.find(a=>Number.isSafeInteger(a.id)&&a.id>0&&a.age>0&&a.age<a.duration&&a.damage>0);
 if(!area){clearFireResponse(e);return null;}
 if(e.fireResponse?.areaId!==area.id){
  clearFireResponse(e);e.fireResponse={areaId:area.id,exposure:0,attempted:false,escape:null};
 }
 const response=e.fireResponse;
 response.exposure=contains(e,area)?Math.min(REACTION,response.exposure+dt):0;
 return area;
}
function findExit(b,e,area,contains){
 let best=null;
 // Eight stable rays, each bounded at 64 units. The first safe point along a
 // ray is the candidate; prefer the shortest escape, retaining order on ties.
 for(const [x,y] of DIRECTIONS)for(let length=PROBE_STEP;length<=MAX_DISTANCE;length+=PROBE_STEP){
  const target={x:e.x+x*length,y:e.y+y*length};
  if(!inMap(b.map,target.x,target.y,11)||traceSegment(b.map,e,target,11).blocked)break;
  if(!contains({...e,...target},area)){
   if(!best||length<best.distance-1e-9)best={...target,distance:length};
   break;
  }
 }
 return best;
}
export function stepFireEscape(b,e,dt,area,speed,contains,move){
 const response=e.fireResponse;
 if(!area||!response||dt<=0)return false;
 if(!response.escape){
  if(response.attempted||response.exposure<REACTION-1e-9)return false;
  response.attempted=true; // A blocked attempt also consumes this area's turn.
  const target=findExit(b,e,area,contains);
  if(!target)return false;
  response.escape={target,elapsed:0,distance:0};e.state='fireEscape';
 }
 const escape=response.escape,dx=escape.target.x-e.x,dy=escape.target.y-e.y,distance=Math.hypot(dx,dy);
 const elapsed=Math.min(dt,Math.max(0,MAX_SECONDS-escape.elapsed));
 const travel=Math.min(distance,MAX_DISTANCE-escape.distance,speed*(e.shackles?.moveMultiplier??1)*elapsed);
 e.angle=Math.atan2(dy,dx);
 // A deadline substep may legitimately request less than .01 world units.
 // Only shortfall against that requested travel is a collision, not small dt.
 const delta=move(b,e,distance?dx/distance*travel:0,distance?dy/distance*travel:0),moved=Math.hypot(delta.x,delta.y);
 escape.elapsed+=elapsed;escape.distance+=moved;e.moving=moved>.01;e.walk=(e.walk??0)+moved/16;
 if(escape.elapsed>=MAX_SECONDS-1e-9||escape.distance>=MAX_DISTANCE-1e-9||Math.hypot(escape.target.x-e.x,escape.target.y-e.y)<.01||(travel>1e-9&&moved<Math.min(.01,travel*.5)))interruptFireEscape(e);
 // Finishing this movement never also starts an attack in the same frame.
 return true;
}
