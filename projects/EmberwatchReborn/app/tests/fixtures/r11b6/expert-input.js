// Authored Reborn action-slot/capture policy. No original-game key-table claim.
import {validToken} from './controls.js';
import {createExpertSaveInput} from './expert-save-input.js';
export const EXPERT_SLOTS=Object.freeze(['expert1','expert2']);
export const EXPERT_ACTIVES=Object.freeze(['battle_banner','zealous_onslaught']);
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const fail=(code,reason)=>({ok:false,code,reason});
export const emptyActionSlots=()=>({version:1,expert1:null,expert2:null});
export function validateActionSlots(value,{skills={},supported=[]}={}){
 if(!plain(value)||Object.keys(value).length!==3||value.version!==1||!EXPERT_SLOTS.every(k=>Object.hasOwn(value,k)))return fail('INVALID_SLOTS','전문 기술 배치 형식이 올바르지 않습니다.');
 const assigned=new Set();
 for(const slot of EXPERT_SLOTS){const id=value[slot];if(id===null)continue;
  if(!EXPERT_ACTIVES.includes(id)||!supported.includes(id)||!Number.isInteger(skills[id])||skills[id]<1)return fail('UNAVAILABLE_SKILL','배운 전문 행동 기술만 배치할 수 있습니다.');
  if(assigned.has(id))return fail('DUPLICATE_SKILL','같은 기술을 두 슬롯에 배치할 수 없습니다.');assigned.add(id);
 }
 return {ok:true};
}
export function assignActionSlot(current,request,context){
 const valid=validateActionSlots(current,context);if(!valid.ok)return valid;
 if(!plain(request)||Object.keys(request).length!==3||!EXPERT_SLOTS.includes(request.slot)||!Object.hasOwn(request,'skillId')||!Object.hasOwn(request,'expectedSkillId'))return fail('INVALID_ASSIGNMENT','배치 요청 형식이 올바르지 않습니다.');
 if(current[request.slot]!==request.expectedSkillId)return fail('STALE_ASSIGNMENT','기술 배치가 바뀌었습니다. 다시 확인하세요.');
 const next={...current,[request.slot]:request.skillId},check=validateActionSlots(next,context);
 return check.ok?{ok:true,slots:next}:check;
}
const inputToken=token=>typeof token==='string'&&(validToken(token)||/^Touch:expert[12](?::\d{1,12})?$/.test(token));
// Feed only accepted base-router presses. Resolve slots at press time, not at a
// later animation frame. This module neither casts nor pays resources.
export function createExpertInputCapture(){
 const deferred=createExpertSaveInput();
 const down=new Set(),pending=new Map(),pendingTokens=new Map();let serial=0,owner=null,termination=null;
 function press(token,slot,slots,{canUse=()=>false}={}){
  if(!inputToken(token)||!EXPERT_SLOTS.includes(slot)||down.has(token))return null;
  down.add(token);if(termination)return null;
  const id=slots?.[slot];if(!EXPERT_ACTIVES.includes(id)||!canUse(id))return null;
  if(id==='zealous_onslaught'){
   if(owner){if(owner.slot===slot&&!owner.delivered)owner.tokens.add(token);return null;}
   owner={ownerToken:`ExpertCapture:${++serial}`,slot,id,tokens:new Set([token]),delivered:false};
  }
  pending.set(slot,id);if(!pendingTokens.has(slot))pendingTokens.set(slot,new Set());pendingTokens.get(slot).add(token);return id;
 }
 function up(token,{cancelReason=null}={}){
  deferred.release(token,{cancelReason});
  down.delete(token);if(!owner||!owner.tokens.has(token))return;
  if(cancelReason){clear(cancelReason);return;}
  if(!owner.tokens.delete(token)||owner.tokens.size)return;
  if(owner.delivered)termination={ownerToken:owner.ownerToken,held:false,released:true,cancelReason:null};
  else {pending.delete(owner.slot);pendingTokens.delete(owner.slot);}owner=null;
 }
 function clear(reason='safety'){
  deferred.clear();
  if(owner?.delivered)termination={ownerToken:owner.ownerToken,held:false,released:false,cancelReason:reason};
  else if(termination)termination={...termination,released:false,cancelReason:reason};
  owner=null;pending.clear();pendingTokens.clear();down.clear();
 }
 function snapshot(){
  const value={expert1:null,expert2:null,channel:undefined};
  if(termination){value.channel={...termination};termination=null;return value;}
  for(const [slot,id] of pending)value[slot]=id;pending.clear();pendingTokens.clear();
  if(owner){owner.delivered=true;value.channel={ownerToken:owner.ownerToken,held:true,released:false,cancelReason:null};}
  return value;
 }
 // reset is used only after the caller synchronously cancels the live action
 // and retains its critical checkpoint event. It prevents stale cancellation
 // from swallowing the first fresh input after a paused modal.
 return {deferred,press,up,clear,snapshot,owns:token=>!!owner?.tokens.has(token),reset({preserveDeferred=false}={}){if(!preserveDeferred)deferred.clear();owner=null;termination=null;pending.clear();pendingTokens.clear();down.clear();},releaseMouse(reason='pointer-cancel'){
  deferred.releasePointer();
  const pointerHeld=new Set([...down].filter(t=>t.startsWith('Mouse')||t.startsWith('Touch:')));
  const captured=owner&&[...owner.tokens].some(t=>pointerHeld.has(t));
  for(const [slot,tokens] of pendingTokens)if([...tokens].some(t=>pointerHeld.has(t))){pending.delete(slot);pendingTokens.delete(slot);}
  for(const token of down)if(token.startsWith('Mouse')||token.startsWith('Touch:'))down.delete(token);
  if(captured)clear(reason);return !!captured;
 }};
}
