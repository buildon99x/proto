import {projectWorld,screenToWorld,ISO} from './visual.js';
import {lineOfSight} from './world-geometry.js';
// Emberwatch cursor interpretation, not damage assistance: only the visible
// living/active body's ellipse under the pointer maps to that actor's feet.
// Empty ground stays free-aim. Damage/range/LOS and fixed windups are unchanged.
export function resolveCursorAim(pointer,battle,width,height){
 if(!pointer||!Number.isFinite(pointer.x)||!Number.isFinite(pointer.y))return {aim:null,targetId:null};
 const raw=screenToWorld(pointer.x,pointer.y,battle.p,width,height),focus=projectWorld(battle.p.x,battle.p.y),candidates=[];
 for(const e of battle.enemies){
  if(!(e.hp>0)||!e.active||!lineOfSight(battle.map,battle.p,e))continue;
  const q=projectWorld(e.x,e.y),x=width*.5+(q.x-focus.x)*ISO.zoom,y=height*.55+(q.y-focus.y)*ISO.zoom,h=(e.type==='boss'?100:e.type==='rat'?28:46)*ISO.zoom;
  const score=((pointer.x-x)/(h*.36))**2+((pointer.y-(y-h*.5))/(h*.5))**2,feet=((pointer.x-x)/16)**2+((pointer.y-y)/9)**2;
  if(score<=1||feet<=1)candidates.push({e,score:Math.min(score,feet),depth:e.x+e.y});
 }
 candidates.sort((a,b)=>a.score-b.score||b.depth-a.depth||a.e.id.localeCompare(b.e.id));const picked=candidates[0]?.e;
 return picked?{aim:{x:picked.x,y:picked.y},targetId:picked.id}:{aim:raw,targetId:null};
}

// Opt-in POE2 public aiming contract. These heights are Emberwatch render
// offsets before ISO.zoom, not POE2 world heights or target-selection radii.
// visual.js lifts slash/impact FX by 23 and moving shots by 9. The animated
// hand is not fixed at either height; callers choose the skill's render plane.
export const REBORN_AIM_HEIGHTS=Object.freeze({strike:23,projectile:9});
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const usableMap=map=>Array.isArray(map?.tiles);

/** Current entity validity only. No namelock, nearest-target fallback or range
 * assistance. Consumers may use this even while an intent's aim is frozen. */
export function isPoeAimTargetValid(targetId,battle){
 if(typeof targetId!=='string'||!targetId||!finitePoint(battle?.p)||!usableMap(battle?.map))return false;
 const e=Array.isArray(battle.enemies)?battle.enemies.find(e=>e?.id===targetId):null;
 return !!(e&&e.hp>0&&e.active&&!e.dead&&finitePoint(e)&&lineOfSight(battle.map,battle.p,e));
}

function hoveredPoeTarget(pointer,battle,width,height){
 if(!Array.isArray(battle.enemies)||!usableMap(battle.map))return null;
 const focus=projectWorld(battle.p.x,battle.p.y),candidates=[];
 for(const e of battle.enemies){
  if(!e||!(e.hp>0)||!e.active||e.dead||!finitePoint(e)||typeof e.id!=='string'||!e.id)continue;
  const q=projectWorld(e.x,e.y),x=width*.5+(q.x-focus.x)*ISO.zoom,y=height*.55+(q.y-focus.y)*ISO.zoom;
  const bodyHeight=(e.type==='boss'?100:e.type==='rat'?28:46)*ISO.zoom;
  // Retain the project's old body/foot hover geometry, but never use it to
  // overwrite the cursor-plane or ground-plane coordinates below.
  const body=((pointer.x-x)/(bodyHeight*.36))**2+((pointer.y-(y-bodyHeight*.5))/(bodyHeight*.5))**2;
  const feet=((pointer.x-x)/16)**2+((pointer.y-y)/9)**2;
  if((body<=1||feet<=1)&&lineOfSight(battle.map,battle.p,e))candidates.push({id:e.id,score:Math.min(body,feet),depth:e.x+e.y});
 }
 // Numerically equal hover scores use draw depth, then id; sub-pixel
 // projection rounding must not reverse the tie when the camera moves.
 candidates.sort((a,b)=>Math.abs(a.score-b.score)>1e-12?a.score-b.score:b.depth-a.depth||a.id.localeCompare(b.id));
 return candidates[0]?.id??null;
}

/** Resolve a canvas-space pointer without changing battle or pointer.
 * At height H, a world point renders at screenY - H*ISO.zoom. Inverting
 * screenY + H*ISO.zoom therefore makes the rendered strike/projectile path
 * pass through the screen cursor. Ground aiming instead keeps the point on
 * the ground, so an elevated path passes above that screen cursor.
 * Direct ground-targeted skills always use groundPoint in both modes.
 * targetId is current hover information only: it never changes aim.
 */
export function resolvePoeAim(pointer,battle,width,height,options={}){
 options=options??{};
 const aimingMode=options.aimingMode==='ground'?'ground':'cursor',groundTargeted=options.groundTargeted===true;
 const targetingHeight=Number.isFinite(options.targetingHeight)&&options.targetingHeight>=0?options.targetingHeight:REBORN_AIM_HEIGHTS.strike;
 const empty={aim:null,groundPoint:null,targetId:null,aimingMode,groundTargeted,targetingHeight};
 if(!finitePoint(pointer)||!finitePoint(battle?.p)||!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)return empty;
 const groundPoint=screenToWorld(pointer.x,pointer.y,battle.p,width,height);
 const aim=aimingMode==='ground'||groundTargeted?{...groundPoint}:screenToWorld(pointer.x,pointer.y+targetingHeight*ISO.zoom,battle.p,width,height);
 if(!finitePoint(aim)||!finitePoint(groundPoint))return empty;
 return {aim,groundPoint,targetId:hoveredPoeTarget(pointer,battle,width,height),aimingMode,groundTargeted,targetingHeight};
}
