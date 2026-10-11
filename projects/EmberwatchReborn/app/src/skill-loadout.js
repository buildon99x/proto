// Explicit R14a2 equipment of the eight implemented Warrior actions. This does
// not purchase skills, change balance, or modify the legacy expert actionSlots.
import {ACTION_SKILL_IDS,STARTER_SKILLS} from './warrior-growth.js';
import {jsonSafe} from './state.js';
export const SKILL_SLOTS=Object.freeze(['attack','hammer','block','charge','judgement','heal','expert1','expert2']);
export const LEGACY_SLOT_SKILLS=Object.freeze({attack:'mace_swing',hammer:'righteous_hammer',block:'shield_block',charge:'shield_charge',judgement:'judgement',heal:'lay_on_hands'});
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const fail=(code,reason)=>({ok:false,code,reason});
export const emptySkillSlots=()=>({version:1,...Object.fromEntries(SKILL_SLOTS.map(slot=>[slot,null]))});
// Structural validation is intentionally separate from learned-skill validation.
// Controls can be inspected without a character; saving/assignment cannot.
export function validateSkillSlotShape(value){
 if(!jsonSafe(value)||!plain(value)||Object.keys(value).length!==SKILL_SLOTS.length+1||value.version!==1||!SKILL_SLOTS.every(slot=>Object.hasOwn(value,slot)))return fail('INVALID_SKILL_SLOTS','전체 기술 배치 형식이 올바르지 않습니다.');
 const assigned=new Set();
 for(const slot of SKILL_SLOTS){const id=value[slot];if(id===null)continue;if(!ACTION_SKILL_IDS.includes(id))return fail('UNAVAILABLE_SKILL','구현된 행동 기술만 배치할 수 있습니다.');if(assigned.has(id))return fail('DUPLICATE_SKILL','같은 기술을 두 슬롯에 배치할 수 없습니다.');assigned.add(id);}
 return {ok:true};
}
export function validateSkillSlots(value,{skills={}}={}){
 const shape=validateSkillSlotShape(value);if(!shape.ok)return shape;
 if(!jsonSafe(skills)||!plain(skills))return fail('UNAVAILABLE_SKILL','배운 행동 기술만 배치할 수 있습니다.');
 for(const slot of SKILL_SLOTS){const id=value[slot];if(id!==null&&(!Object.hasOwn(skills,id)||!Number.isSafeInteger(skills[id])||skills[id]<1))return fail('UNAVAILABLE_SKILL','배운 행동 기술만 배치할 수 있습니다.');}
 return {ok:true};
}
export function seedSkillSlots({skills={},actionSlots={}}={}){
 const slots=emptySkillSlots();
 for(const slot of SKILL_SLOTS){const id=LEGACY_SLOT_SKILLS[slot]??actionSlots?.[slot];if(ACTION_SKILL_IDS.includes(id)&&Number.isSafeInteger(skills?.[id])&&skills[id]>0&&!Object.values(slots).includes(id))slots[slot]=id;}
 return slots;
}
export function assignSkillSlot(current,request,context){
 const valid=validateSkillSlots(current,context);if(!valid.ok)return valid;
 if(!jsonSafe(request)||!plain(request)||Object.keys(request).length!==3||!SKILL_SLOTS.includes(request.slot)||!Object.hasOwn(request,'skillId')||!Object.hasOwn(request,'expectedSkillId'))return fail('INVALID_ASSIGNMENT','배치 요청 형식이 올바르지 않습니다.');
 if(current[request.slot]!==request.expectedSkillId)return fail('STALE_ASSIGNMENT','기술 배치가 바뀌었습니다. 다시 확인하세요.');
 const next={...current,[request.slot]:request.skillId},check=validateSkillSlots(next,context);return check.ok?{ok:true,slots:next}:check;
}
export function validateSavedSkillSlots(state){
 if(state.options?.controls?.version!==5)return {ok:true};
 return validateSkillSlots(state.options.controls.skillSlots,{skills:state.character.skills});
}
export function reduceSkillSlots(state,command,context={}){
 const keys=['type','slot','skillId','expectedSkillId','expectedRevision','life'];
 if(!jsonSafe(command)||!jsonSafe(context)||!plain(command)||!plain(context)||Object.keys(command).length!==keys.length||!keys.every(k=>Object.hasOwn(command,k))||command.type!=='assignSkillSlot')return fail('INVALID_ASSIGNMENT','기술 배치 요청 형식을 확인하세요.');
 if(!Number.isSafeInteger(context.revision)||context.revision<0||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0)return fail('REVISION_REQUIRED','현재 저장 버전으로 배치를 요청하세요.');
 if(command.expectedRevision!==context.revision)return fail('STALE_REVISION','배치 화면이 오래되었습니다. 다시 열어 주세요.');
 if(!Number.isSafeInteger(command.life)||command.life<0||command.life!==(state.world.life??0))return fail('STALE_LIFE','현재 생명의 배치 요청이 아닙니다.');
 if(state.world.lifeDown||!state.vitals||state.vitals.hp<=0)return fail('HERO_DOWN','살아 있는 전사만 기술을 배치할 수 있습니다.');
 if(!STARTER_SKILLS.every(id=>Number.isSafeInteger(state.character.skills[id])&&state.character.skills[id]>0))return fail('STARTER_REQUIRED','기본 네 기술의 첫 훈련을 먼저 받으세요.');
 if(state.options.controls?.version!==5)return fail('SKILL_LOADOUT_REQUIRED','전체 기술 배치를 먼저 명시적으로 선택하세요.');
 const result=assignSkillSlot(state.options.controls.skillSlots,{slot:command.slot,skillId:command.skillId,expectedSkillId:command.expectedSkillId},{skills:state.character.skills});if(!result.ok)return result;
 const next=structuredClone(state);next.options.controls.skillSlots=result.slots;
 return {ok:true,state:next,events:[{type:'skillSlotAssigned',slot:command.slot,skillId:command.skillId}]};
}
