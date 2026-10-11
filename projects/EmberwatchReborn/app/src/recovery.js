import {WARRIOR_REFERENCE} from './reference-warrior.js';
import {validateNegativeStatuses} from './hero-status.js';
// Version 1 is the exact pre-R11 shape. Version 2 is admitted only by state v4.
const ACTIONS=['mace_swing','shield_charge','shield_block','righteous_hammer','lay_on_hands','judgement'];
const SCALARS=['lock','manaDelay','staminaDelay','invuln','potionCooldown'];
const guiltCooldowns=WARRIOR_REFERENCE.skills.find(row=>row.id==='guilt_by_association').rankValues.effectCooldownSeconds;
const EXPERT_CDS={battle_banner:30,zealous_onslaught:10};
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const finite=(x,max)=>Number.isFinite(x)&&x>=0&&x<=max;
export const initialCombatRng=()=>({state:1369781,draws:0});
export const validCombatRng=r=>record(r)&&Object.keys(r).length===2&&Number.isInteger(r.state)&&r.state>=0&&r.state<=0xffffffff&&Number.isSafeInteger(r.draws)&&r.draws>=0;
export const emptyRecovery=({combatRng=initialCombatRng()}={})=>({version:2,cooldowns:{},lock:0,manaDelay:0,staminaDelay:0,invuln:0,potionCooldown:0,regenBuff:null,innerFlame:null,procCooldowns:{},procCooldownRanks:{},negativeStatuses:{},combatRng:{...combatRng}});
export function validateRecovery(r,{legacy=false,version=legacy?1:2,character=null}={}){
 const modern=version===2;if(![1,2].includes(version)||!record(r)||!record(r.cooldowns))return false;
 const keys=['cooldowns',...SCALARS,...(legacy?[]:['regenBuff']),...(modern?['version','innerFlame','procCooldowns','procCooldownRanks','negativeStatuses','combatRng']:[])];
 if(Object.keys(r).some(k=>!keys.includes(k))||!SCALARS.every(k=>finite(r[k],60)))return false;
 if(!Object.entries(r.cooldowns).every(([k,v])=>(legacy?ACTIONS.slice(0,4):ACTIONS).includes(k)?finite(v,60):modern&&Object.hasOwn(EXPERT_CDS,k)&&finite(v,EXPERT_CDS[k])&&(!character||character.skills[k]>0)))return false;
 if(r.regenBuff!=null){
  const b=r.regenBuff;if(!record(b)||Object.keys(b).length!==2||!finite(b.remaining,4)||b.remaining<=0||![1.25,1.5,2].includes(b.multiplier))return false;
  if(character){const rank=character.skills.invigorating_touch??0;if(!rank||b.multiplier>[1.25,1.5,2][rank-1])return false;}
 }
 if(!modern)return true;
 if(r.version!==2||!['innerFlame','procCooldowns','procCooldownRanks','negativeStatuses','combatRng','regenBuff'].every(k=>Object.hasOwn(r,k))||!validCombatRng(r.combatRng)||!record(r.procCooldowns)||!record(r.procCooldownRanks)||Object.keys(r.procCooldownRanks).some(id=>!Object.hasOwn(r.procCooldowns,id))||!validateNegativeStatuses(r.negativeStatuses))return false;
 if(r.innerFlame!==null){const b=r.innerFlame;if(!record(b)||Object.keys(b).length!==2||!Number.isInteger(b.rank)||b.rank<1||b.rank>4||!finite(b.remaining,3)||b.remaining<=0||(character&&!(character.skills.inner_flame>=b.rank)))return false;}
 for(const [id,value] of Object.entries(r.procCooldowns)){
  if(!['flaming_wrath','guilt_by_association'].includes(id)||!finite(value,id==='flaming_wrath'?.5:1.5))return false;
  const rank=r.procCooldownRanks[id];if(!Number.isInteger(rank)||rank<1||rank>3||value>(id==='flaming_wrath'?.5:guiltCooldowns[rank-1])||(character&&!(character.skills[id]>=rank)))return false;
 }
 return true;
}
// Explicit migration only: old bytes are validated before adding defaults.
export function migrateRecovery(old,{legacy=false,character=null}={}){
 if(old?.version===2){if(!validateRecovery(old,{character}))throw new Error('Invalid current recovery');return structuredClone(old);}
 if(!validateRecovery(old,{legacy,version:1,character}))throw new Error('Invalid legacy recovery');
 return {...emptyRecovery(),...structuredClone(old),regenBuff:old.regenBuff?{...old.regenBuff}:null};
}
export function retryRecovery(previous){const next=emptyRecovery({combatRng:previous.combatRng});next.cooldowns={...previous.cooldowns};next.procCooldowns={...previous.procCooldowns};next.procCooldownRanks={...previous.procCooldownRanks};return next;}
export function recoveryFrom(command,previous=null){
 if(command.recovery===undefined)return previous?structuredClone(previous):emptyRecovery();
 if(!validateRecovery(command.recovery))throw new Error('Invalid current recovery report');
 return structuredClone(command.recovery);
}
export function battleReport(b){const p=b.p;return {life:b.stateLife,position:{x:p.x,y:p.y},vitals:{hp:p.hp,mana:p.mana,stamina:p.stamina},recovery:{version:2,cooldowns:{...p.cooldowns},lock:Math.max(p.recoveryLock??0,p.action?Math.max(0,p.action.duration-p.action.elapsed):0,b.poeMobility?.serializeRecoveryDebt()??0),manaDelay:p.manaDelay,staminaDelay:p.staminaDelay,invuln:p.invuln,potionCooldown:p.potionCooldown,regenBuff:p.regenBuff?{...p.regenBuff}:null,innerFlame:p.innerFlame?{...p.innerFlame}:null,procCooldowns:{...p.procCooldowns},procCooldownRanks:{...p.procCooldownRanks},negativeStatuses:structuredClone(p.negativeStatuses??{}),combatRng:{state:b.seed,draws:b.combatDraws??0}}};}
