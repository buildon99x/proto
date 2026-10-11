import {jsonSafe} from './state.js';
// Explicit equipment of already purchased actions, never a skill purchase.
import {assignActionSlot,emptyActionSlots,validateActionSlots} from './expert-input.js';
import {RUNTIME_SKILL_IDS} from './warrior-growth.js';
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const keys=['type','slot','skillId','expectedSkillId','expectedRevision','life'];
const fail=(code,reason)=>({ok:false,code,reason});
export function validateSavedActionSlots(state){
 if(state.actionSlots===undefined)return {ok:true};
 if(state.version<4&&['expert1','expert2'].some(k=>state.actionSlots?.[k]!==null))return fail('INVALID_LEGACY_SLOTS','구버전에는 전문 기술 배치가 없습니다.');
 return validateActionSlots(state.actionSlots,{skills:state.character.skills,supported:RUNTIME_SKILL_IDS});
}
export function reduceActionSlots(state,command,context={}){
 if(!jsonSafe(command)||!jsonSafe(context)||!plain(command)||Object.keys(command).length!==keys.length||!keys.every(k=>Object.hasOwn(command,k))||command.type!=='assignActionSlot')return fail('INVALID_ASSIGNMENT','기술 배치 요청 형식을 확인하세요.');
 if(!Number.isSafeInteger(context.revision)||context.revision<0||!Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0)return fail('REVISION_REQUIRED','현재 저장 버전으로 배치를 요청하세요.');
 if(command.expectedRevision!==context.revision)return fail('STALE_REVISION','배치 화면이 오래되었습니다. 다시 열어 주세요.');
 if(command.life!==(state.world.life??0))return fail('STALE_LIFE','현재 생명의 배치 요청이 아닙니다.');
 if(state.world.lifeDown||!state.vitals||state.vitals.hp<=0)return fail('HERO_DOWN','살아 있는 전사만 기술을 배치할 수 있습니다.');
 if(state.character.tier!=='expert')return fail('EXPERT_REQUIRED','전문가 승급과 기술 구매가 먼저 필요합니다.');
 const result=assignActionSlot(state.actionSlots??emptyActionSlots(),{slot:command.slot,skillId:command.skillId,expectedSkillId:command.expectedSkillId},{skills:state.character.skills,supported:RUNTIME_SKILL_IDS});
 if(!result.ok)return result;
 const next=structuredClone(state);next.actionSlots=result.slots;
 return {ok:true,state:next,events:[{type:'actionSlotAssigned',slot:command.slot,skillId:command.skillId}]};
}
