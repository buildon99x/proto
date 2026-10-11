// Small, clock-free input state. It changes only its private intent, never the
// pointer/battle/skill passed by a caller. A distinct instance belongs to each
// running action or queued action. Queue length/timing belong to the caller.
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const point=p=>finitePoint(p)?{x:p.x,y:p.y}:null;
function copyAim(value){
 const aim=point(value?.aim);
 return {
  aim,
  groundPoint:point(value?.groundPoint),
  targetId:aim&&typeof value?.targetId==='string'&&value.targetId?value.targetId:null,
  aimingMode:value?.aimingMode==='ground'?'ground':'cursor',
  groundTargeted:value?.groundTargeted===true,
  targetingHeight:Number.isFinite(value?.targetingHeight)&&value.targetingHeight>=0?value.targetingHeight:null,
 };
}

/** Keep key lifetime, release tracking and a skill's retarget window separate.
 * press(resolvedAim) starts/replaces a released intent; repeated held presses
 * are idempotent, so OS repeat cannot bypass canRetarget. release(resolvedAim,
 * policy) samples the last held input before marking the key released.
 * snapshot(liveAim, {canRetarget, queued, isTargetValid}) updates only an active
 * intent. queued:true explicitly refreshes a pending action independently of
 * an executing skill's phase/release policy. That is an Emberwatch queue
 * policy, not a claim about POE2's undisclosed queue implementation.
 * isTargetValid(id) clears invalid metadata even when coordinates are frozen;
 * it never follows the entity or finds a replacement. clear() disarms input.
 */
export function createAimIntent({cursorTrackingAfterRelease=false}={}){
 const tracking=cursorTrackingAfterRelease===true;
 let active=false,held=false,current=copyAim(null);
 const output=()=>({...copyAim(current),active,held,cursorTrackingAfterRelease:tracking});
 function update(liveAim,{canRetarget=true,queued=false,isTargetValid}={}){
  if(active&&liveAim?.aim&&finitePoint(liveAim.aim)&&(queued===true||(canRetarget!==false&&(held||tracking))))current=copyAim(liveAim);
  if(active&&current.targetId&&typeof isTargetValid==='function'&&!isTargetValid(current.targetId))current={...current,targetId:null};
  return output();
 }
 return {
  press(resolvedAim){
   if(!held){current=copyAim(resolvedAim);active=true;held=true;}
   return output();
  },
  release(resolvedAim,policy){
   // A repeated release must not accidentally sample a new pointer.
   if(held){update(resolvedAim,policy);held=false;}
   return output();
  },
  snapshot:update,
  clear(){active=false;held=false;current=copyAim(null);return output();},
 };
}
