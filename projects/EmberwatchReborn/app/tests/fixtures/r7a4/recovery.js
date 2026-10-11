// Durable resource/recovery snapshot. Offensive world effects intentionally do
// not resume after a region/load boundary; their already-paid cost and CD do.
const ACTIONS=['mace_swing','shield_charge','shield_block','righteous_hammer','lay_on_hands','judgement'];
const SCALARS=['lock','manaDelay','staminaDelay','invuln','potionCooldown'];
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const finite=(x,max)=>Number.isFinite(x)&&x>=0&&x<=max;
export const emptyRecovery=()=>({cooldowns:{},lock:0,manaDelay:0,staminaDelay:0,invuln:0,potionCooldown:0,regenBuff:null});
export function validateRecovery(r,{legacy=false,character=null}={}){
 if(!record(r)||!record(r.cooldowns)||Object.keys(r).some(k=>!['cooldowns',...SCALARS,...(legacy?[]:['regenBuff'])].includes(k))||!SCALARS.every(k=>finite(r[k],60))||!Object.entries(r.cooldowns).every(([k,v])=>(legacy?ACTIONS.slice(0,4):ACTIONS).includes(k)&&finite(v,60)))return false;
 if(r.regenBuff!=null){
  const b=r.regenBuff;if(!record(b)||Object.keys(b).length!==2||!finite(b.remaining,4)||b.remaining<=0||![1.25,1.5,2].includes(b.multiplier))return false;
  if(character){const rank=character.skills.invigorating_touch??0;if(!rank||b.multiplier>[1.25,1.5,2][rank-1])return false;}
 }
 return true;
}
export function recoveryFrom(command){return command.recovery?{...structuredClone(command.recovery),regenBuff:command.recovery.regenBuff?{...command.recovery.regenBuff}:null}:emptyRecovery();}
export function battleReport(b){const p=b.p;return {life:b.stateLife,position:{x:p.x,y:p.y},vitals:{hp:p.hp,mana:p.mana,stamina:p.stamina},recovery:{cooldowns:{...p.cooldowns},lock:Math.max(p.recoveryLock??0,p.action?Math.max(0,p.action.duration-p.action.elapsed):0),manaDelay:p.manaDelay,staminaDelay:p.staminaDelay,invuln:p.invuln,potionCooldown:p.potionCooldown,regenBuff:p.regenBuff?{...p.regenBuff}:null}};}
