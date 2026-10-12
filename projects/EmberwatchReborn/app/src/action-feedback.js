import {formatResourceAmount,formatResourceCost} from './resource-display.js';
// Presentation of the runtime eligibility result; never recompute combat rules here.
export function actionBlockedText(eligibility,{compact=false}={}){
 const e=eligibility;
 switch(e.blockedReason){
  case 'stun':return compact?'기절 · 행동 불가':'기절 중에는 행동할 수 없습니다.';
  case 'silence':return compact?'침묵 · 시전 불가':'침묵 중에는 주문을 시전할 수 없습니다.';
  case 'disarm':return compact?'무장해제 · 공격 불가':'무장해제 중에는 철퇴 기본 공격을 사용할 수 없습니다.';
  case 'cooldown':return compact?`${e.cooldown.toFixed(1)}초`:`기술 재사용 대기 · ${e.cooldown.toFixed(1)}초`;
  case 'mana':return compact?`MP 부족 · ${formatResourceCost(e.manaCost)}`:`마나 부족 · 필요 ${formatResourceCost(e.manaCost)} / 현재 ${formatResourceAmount(e.mana)}`;
  case 'stamina':return compact?`기력 부족 · ${formatResourceCost(e.staminaCost)}`:`기력 부족 · 필요 ${formatResourceCost(e.staminaCost)} / 현재 ${formatResourceAmount(e.stamina)}`;
  case 'weapon':return compact?'철퇴 필요':'파쇄 강타에는 철퇴가 필요합니다.';
  case 'unlearned':return '훈련 필요';
  case 'dead':return '쓰러짐 · 행동 불가';
  default:return '';
 }
}

// Dismiss only the currently displayed recovery rejection, never a later toast.
// A matching accepted action makes it obsolete; input safety ends its lifetime.
export function dismissRecoveryNotice(notice,skillId=null){
 if(!notice.recoverySkillId||(skillId!==null&&notice.recoverySkillId!==skillId))return false;
 notice.recoverySkillId=null;notice.textContent='';notice.classList.remove('visible');return true;
}
