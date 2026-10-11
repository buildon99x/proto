import {validateState,jsonSafe} from './state.js';
import {CORE_REFERENCE} from './reference-core.js';
import {TOMB_TRAINING_RESERVE} from './tomb-content.js';
import {trainingGoldBalances} from './training-economy.js';
import {deriveStats,validateWarriorGrowth} from './warrior-growth.js';
import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
export const ADEPT_RECEIPT='r5:promote:adept';
const fail=(code,reason)=>({ok:false,code,reason});
export function validatePromotion(state){
 const has=state.world.claimedRewards.includes(ADEPT_RECEIPT),promoted=['adept','expert'].includes(state.character.tier),expert=state.character.tier==='expert';
 if(!['apprentice','adept','expert'].includes(state.character.tier)||state.world.claimedRewards.some(id=>id.startsWith('r5:')&&id!==ADEPT_RECEIPT)||has!==promoted||state.world.claimedRewards.includes(EXPERT_RECEIPT)!==expert||promoted&&(state.world.objectives.adept_commission!==1||!state.world.claimedRewards.includes('r4:report')))return fail('INVALID_PROMOTION','숙련 승급과 위임장 기록이 일치하지 않습니다.');
 return {ok:true};
}
export function previewPromotion(state){
 const result=(code,reason)=>({ok:true,available:!code,code,reason,goldCost:0,minimumLevel:5});
 if(['adept','expert'].includes(state.character.tier))return result('ALREADY_PROMOTED','숙련 승급을 완료했습니다.');
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

// The fee/reservation and trainer/quest gates are authored Emberwatch policy.
// The minimum level is the preserved reference tier boundary, not a measured
// original promotion fee. No source catalog values are changed here.
export const EXPERT_RECEIPT='r10:promote:expert';
export const EXPERT_GOLD_COST=TOMB_TRAINING_RESERVE;
const EXPERT_MINIMUM_LEVEL=CORE_REFERENCE.tiers.find(tier=>tier.id==='expert').minimumLevel;
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const exact=(value,keys)=>record(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const count=value=>Number.isSafeInteger(value)&&value>=0;
function sameData(a,b){
 if(a===b)return true;
 if(!record(a)||!record(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(key=>Object.hasOwn(b,key)&&sameData(a[key],b[key]));
}
export function previewExpertPromotion(state){
 const valid=validateState(state);if(!valid.ok)return valid;
 const result=(code,reason)=>({ok:true,available:!code,code,reason,goldCost:EXPERT_GOLD_COST,minimumLevel:EXPERT_MINIMUM_LEVEL});
 if(state.character.tier==='expert')return result('ALREADY_PROMOTED','전문 승급을 완료했습니다.');
 if(state.character.tier!=='adept')return result('ADEPT_REQUIRED','브란에게 숙련 승급을 먼저 받으세요.');
 if(!state.vitals||!validateWarriorGrowth(state.character,state).starterTrained)return result('TRAIN_FIRST','기본 네 기술을 먼저 배우세요.');
 if(state.world.lifeDown||state.vitals.hp<=0)return result('HERO_DOWN','살아 있는 상태에서 승급하세요.');
 if(state.character.level<EXPERT_MINIMUM_LEVEL)return result('LEVEL_REQUIRED','레벨15가 필요합니다.');
 if(state.world.objectives.expert_commission!==1||state.world.objectives.tomb_reported!==1||!state.inventory.tools.includes('tomb_oath')||!state.world.claimedRewards.includes('r10:t:report'))return result('COMMISSION_REQUIRED','묘실 서약문 회수와 촌장 에다 보고를 마치세요.');
 const gold=trainingGoldBalances(state);
 if(!gold.ok)return gold;
 if(gold.totalGold<EXPERT_GOLD_COST||gold.reservedGold!==EXPERT_GOLD_COST)return result('TRAINING_GOLD_REQUIRED','전문 훈련 예약금120이 필요합니다.');
 return result(null,'전문 훈련 예약금120을 사용합니다. 경험치·점수·기술·자원을 추가 지급하지 않습니다.');
}
/** A pure transaction with a separate authoritative controller revision.
 * Trainer UI must await its checkpoint, then quote that committed revision and
 * its exact pools/recovery. A promotion report cannot heal or reset paid CDs.
 * The store still checks its own revision at commit, independently of this gate.
 */
export function promoteExpert(state,command,context={}){
 const valid=validateState(state);if(!valid.ok)return valid;
 if(!jsonSafe(command)||!exact(command,['type','life','position','vitals','recovery','expectedRevision','expectedGoldCost'])||command.type!=='promoteExpert'||!count(command.life)||!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(Number.isFinite)||!validateRecovery(command.recovery,{character:state.character}))return fail('INVALID_COMMAND','현재 위치·자원·회수 상태와 정확한 승급 견적이 필요합니다.');
 if(!count(command.expectedRevision)||!jsonSafe(context)||!exact(context,['revision'])||!count(context.revision))return fail('REVISION_REQUIRED','현재 저장 버전으로 승급을 요청하세요.');
 if(command.expectedRevision!==context.revision)return fail('STALE_REVISION','이전 승급 화면의 입력입니다. 최신 기록을 다시 확인하세요.');
 if(context.revision===Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT','저장 버전 한도에 도달했습니다.');
 if(command.expectedGoldCost!==EXPERT_GOLD_COST)return fail('QUOTE_CHANGED','전문 승급 비용은 예약금120입니다. 견적을 다시 확인하세요.');
 const preview=previewExpertPromotion(state);if(!preview.available)return preview.ok?fail(preview.code,preview.reason):preview;
 if(command.life!==(state.world.life??0))return fail('STALE_LIFE','현재 생명의 입력으로 승급하세요.');
 if(command.vitals.hp<=0)return fail('HERO_DOWN','살아 있는 상태에서 승급하세요.');
 const map=createMap(state.world.region,state),npc=getRegion(state.world.region).npcs.find(n=>n.id==='trainer');
 if(!inMap(map,command.position.x,command.position.y))return fail('INVALID_REPORT','이동 가능한 현재 위치로 승급을 요청하세요.');
 if(state.world.region!=='ash_hamlet'||!npc||!near(command.position,npc)||!lineOfSight(map,command.position,npc))return fail('TRAINER_REQUIRED','마을 훈련관 브란 가까이에서 승급하세요.');
 const stats=deriveStats(state.character,state).stats;
 if(!Object.entries(command.vitals).every(([key,value])=>value>=0&&value<=stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT','현재 생명과 자원 기록으로 승급하세요.');
 if(!sameData(command.vitals,state.vitals)||!sameData(command.recovery,state.recovery))return fail('REPORT_NOT_COMMITTED','현재 자원과 회수 상태를 먼저 저장한 뒤 승급하세요.');
 if(state.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT','진행 기록이 가득합니다.');
 if(!count(state.stats.spentGold+EXPERT_GOLD_COST))return fail('VALUE_OVERFLOW','금화 지출 기록 한도를 넘습니다.');
 const next=structuredClone(state);
 next.gold-=EXPERT_GOLD_COST;next.stats.spentGold+=EXPERT_GOLD_COST;
 next.reservedTrainingGold.expert=0;next.character.tier='expert';next.world.claimedRewards.push(EXPERT_RECEIPT);
 next.world.position={...command.position};next.vitals={...command.vitals};next.recovery=recoveryFrom(command);
 const complete=validateState(next);if(!complete.ok)return complete;
 return {ok:true,state:next,events:[{type:'promoted',tier:'expert',goldCost:EXPERT_GOLD_COST}]};
}
