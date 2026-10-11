// Emberwatch input tolerance for asynchronous durable saves, not a skill queue.
// Wall-clock bounded so a delayed save can never trigger an old potion/portal.
export const SAVE_INPUT_WINDOW_MS=150;
export function createImmediateInput(){
 let pending=null;
 const clear=()=>{pending=null;};
 return {clear,
  offer(action,{now,life,region}){
   if(!['interact','potion'].includes(action)||!Number.isFinite(now)||!Number.isInteger(life)||typeof region!=='string')return false;
   pending={action,now,life,region};return true;
  },
  flush({now,life,region,busy=false,paused=false,blocked=false,lifeDown=false,focused=true,hidden=false},execute){
   if(!pending)return {status:'idle'};
   const intent=pending;
   if(paused||blocked||lifeDown||!focused||hidden||life!==intent.life||region!==intent.region){clear();return {status:'cancelled'};}
   if(!Number.isFinite(now)||now<intent.now||now-intent.now>SAVE_INPUT_WINDOW_MS){clear();return {status:'expired',action:intent.action};}
   if(busy)return {status:'waiting'};
   clear();execute(intent.action);return {status:'dispatched',action:intent.action};
  }
 };
}
