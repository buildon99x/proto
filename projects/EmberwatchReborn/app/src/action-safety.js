// UI-only cancellation coordination. No wall clock, resource mutation or save IO.
// Wait until an in-flight commit has reconciled before touching the live action.
export function createActionSafety({capture,cancel}){
 let pending=null;
 const same=(job,battle,owner)=>job.battle===battle&&job.owner===owner&&job.life===battle?.stateLife&&job.region===battle?.region;
 return {
  get pending(){return pending!==null;},
  request(battle,owner,reason='safety'){
   capture.clear(reason);
   if(!battle){pending=null;capture.reset();return;}
   if(!pending||!same(pending,battle,owner))pending={battle,owner,life:battle.stateLife,region:battle.region,reason};
  },
  drain(battle,owner,{busy=false,blocked=false}={}){
   if(!pending)return {status:'empty',events:[]};
   if(!same(pending,battle,owner)){pending=null;capture.reset();return {status:'obsolete',events:[]};}
   if(busy||blocked)return {status:'waiting',events:[]};
   const job=pending;
   // If cancellation throws, keep the job and do not reset its capture.
   const events=cancel(battle,job.reason);
   // Fresh input received after request() may be waiting for this save. Its
   // own 150ms owner/life/region contract decides whether it is still usable.
   pending=null;capture.reset({preserveDeferred:true});return {status:'cancelled',events};
  },
  reset(){pending=null;capture.reset();}
 };
}
