import {deriveStats,validateWarriorGrowth} from './warrior-growth.js';
import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
export const ADEPT_RECEIPT='r5:promote:adept';
const fail=(code,reason)=>({ok:false,code,reason});
export function validatePromotion(state){
 const has=state.world.claimedRewards.includes(ADEPT_RECEIPT),adept=state.character.tier==='adept';
 if(state.world.claimedRewards.some(id=>id.startsWith('r5:')&&id!==ADEPT_RECEIPT)||has!==adept||adept&&(state.world.objectives.adept_commission!==1||!state.world.claimedRewards.includes('r4:report')))return fail('INVALID_PROMOTION','숙련 승급과 위임장 기록이 일치하지 않습니다.');
 return {ok:true};
}
export function previewPromotion(state){
 const result=(code,reason)=>({ok:true,available:!code,code,reason,goldCost:0,minimumLevel:5});
 if(state.character.tier==='adept')return result('ALREADY_PROMOTED','숙련 승급을 완료했습니다.');
 if(state.character.tier!=='apprentice')return result('TIER_NOT_IMPLEMENTED','상위 승급은 아직 연결 중입니다.');
 if(!state.vitals||!validateWarriorGrowth(state.character,state).starterTrained)return result('TRAIN_FIRST','기본 네 기술을 먼저 배우세요.');
 if(state.world.lifeDown||state.vitals.hp<=0)return result('HERO_DOWN','살아 있는 상태에서 승급하세요.');
 if(state.character.level<5)return result('LEVEL_REQUIRED','레벨5가 필요합니다.');
 if(state.world.objectives.adept_commission!==1||!state.world.claimedRewards.includes('r4:report'))return result('COMMISSION_REQUIRED','첫 수문소 조사와 촌장 보고를 마치고 위임장을 받으세요.');
 return result(null,'브란의 첫 승급 지원: 금화0. 경험치·점수·자원은 추가 지급하지 않습니다.');
}
export function promoteAdept(state,c){
 const preview=previewPromotion(state);if(!preview.available)return fail(preview.code,preview.reason);
 const map=createMap(state.world.region,state),npc=getRegion(state.world.region).npcs.find(n=>n.id==='trainer');
 if(state.world.region!=='ash_hamlet'||!npc||!near(c.position,npc)||!lineOfSight(map,c.position,npc))return fail('TRAINER_REQUIRED','마을 훈련관 브란 가까이에서 승급하세요.');
 const stats=deriveStats(state.character,state).stats;
 if(c.life!==(state.world.life??0)||!inMap(map,c.position?.x,c.position?.y)||!c.vitals||!['hp','mana','stamina'].every(k=>Number.isFinite(c.vitals[k])&&c.vitals[k]>=0&&c.vitals[k]<=stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]])||c.vitals.hp<=0||!validateRecovery(c.recovery,{character:state.character}))return fail('INVALID_REPORT','현재 생명과 자원 기록으로 승급하세요.');
 if(state.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT','진행 기록이 가득합니다.');
 const next=structuredClone(state);next.character.tier='adept';next.world.claimedRewards.push(ADEPT_RECEIPT);next.vitals={...c.vitals};next.recovery=recoveryFrom(c);next.world.position={...c.position};
 return {ok:true,state:next,events:[{type:'promoted',tier:'adept',goldCost:0}]};
}
