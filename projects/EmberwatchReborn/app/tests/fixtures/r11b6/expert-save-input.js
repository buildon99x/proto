import {SAVE_INPUT_WINDOW_MS} from './immediate-input.js';

// A single wall-clock bounded tolerance for a durable save, not an animation
// queue. Identity is captured at the physical press and never retargeted.
export function createExpertSaveInput(){
 let pending=null;
 const clear=()=>{pending=null;};
 return {clear,
  offer(token,slot,id,{now,battle,owner,slots,controls}){
   clear();
   if(!Number.isFinite(now)||!battle||!owner||!['expert1','expert2'].includes(slot)||!['battle_banner','zealous_onslaught'].includes(id)||slots?.[slot]!==id)return false;
   pending={token,slot,id,now,battle,owner,life:battle.stateLife,region:battle.region,slots:JSON.stringify(slots),controls:JSON.stringify(controls)};return true;
  },
  release(token,{cancelReason=null}={}){
   if(pending?.token!==token)return;
   if(pending.id==='zealous_onslaught'||cancelReason&&!(cancelReason==='lostpointercapture'&&pending.released))clear();
   else pending.released=true;
  },
  releasePointer(){if(!pending?.released&&/^(Mouse|Touch:)/.test(pending?.token??''))clear();},
  flush({now,battle,owner,slots,controls,busy=false,paused=false,blocked=false,lifeDown=false,focused=true,hidden=false},execute){
   if(!pending)return {status:'idle'};
   const intent=pending;
   if(paused||blocked||lifeDown||!focused||hidden||battle!==intent.battle||owner!==intent.owner||battle?.stateLife!==intent.life||battle?.region!==intent.region||JSON.stringify(slots)!==intent.slots||JSON.stringify(controls)!==intent.controls){clear();return {status:'cancelled'};}
   if(!Number.isFinite(now)||now<intent.now||now-intent.now>SAVE_INPUT_WINDOW_MS){clear();return {status:'expired'};}
   if(busy)return {status:'waiting'};
   clear();execute(intent);return {status:'dispatched'};
  }
 };
}
