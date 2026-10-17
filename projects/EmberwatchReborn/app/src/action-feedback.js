import {formatResourceAmount,formatResourceCost} from './resource-display.js';
// Presentation of the runtime eligibility result; never recompute combat rules here.
export function actionBlockedText(eligibility,{compact=false}={}){
 const e=eligibility;
 switch(e.blockedReason){
  case 'stun':return compact?'기절 · 행동 불가':'기절 중에는 행동할 수 없습니다.';
  case 'silence':return compact?'침묵 · 시전 불가':'침묵 중에는 주문을 시전할 수 없습니다.';
  case 'disarm':return compact?'무장해제 · 공격 불가':'무장해제 중에는 철퇴 기본 공격을 사용할 수 없습니다.';
  case 'cooldown':return compact?`${Math.max(.1,e.cooldown).toFixed(1)}초`:`기술 재사용 대기 · ${Math.max(.1,e.cooldown).toFixed(1)}초`;
  case 'mana':return compact?`MP 부족 · ${formatResourceCost(e.manaCost)}`:`마나 부족 · 필요 ${formatResourceCost(e.manaCost)} / 현재 ${formatResourceAmount(e.mana)}`;
  case 'stamina':return compact?`기력 부족 · ${formatResourceCost(e.staminaCost)}`:`기력 부족 · 필요 ${formatResourceCost(e.staminaCost)} / 현재 ${formatResourceAmount(e.stamina)}`;
  case 'weapon':return compact?'철퇴 필요':'파쇄 강타에는 철퇴가 필요합니다.';
  case 'storm-setup':return compact?'훈련봉 / PoE 조작 필요':'폭풍 연격은 주무기 해제와 PoE형 조작이 필요합니다.';
  case 'combo':return compact?'Combo 4 필요':'실제 적에게 연격을 4회 명중시키면 종을 설치할 수 있습니다.';
  case 'bell-limit':return compact?'종 3개 유지 중':'현재 종이 3개입니다. 소모하거나 만료된 뒤 설치하세요.';
  case 'bell-placement':return compact?'설치 위치 불가':'비어 있는 시야 내 바닥에 조준하세요. 설치 불가에는 자원을 쓰지 않습니다.';
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

// This owns only the currently displayed cooldown rejection. A later toast
// replaces its tag; expiry must never dismiss an unrelated message.
export function dismissCooldownNotice(notice,skillId=null){
 if(!notice.cooldownSkillId||(skillId!==null&&notice.cooldownSkillId!==skillId))return false;
 notice.cooldownSkillId=null;notice.textContent='';notice.classList.remove('visible');return true;
}
export function dismissExpiredCooldownNotice(notice,cooldowns){
 const id=notice.cooldownSkillId;if(!id||!cooldowns)return false;
 const remaining=cooldowns[id]??0;
 return Number.isFinite(remaining)&&remaining<=1e-9&&dismissCooldownNotice(notice,id);
}
