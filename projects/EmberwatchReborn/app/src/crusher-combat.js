import {EQUIPMENT_ITEMS} from './equipment-content.js';
import {WARRIOR_BALANCE} from './warrior-balance.js';
// NEW, explicit candidate rule, not a copied PoE2 threshold or a balance retune.
// Existing damage/cost/contact/CD are reused; accumulated units are valid hits,
// not remaining stun seconds, armour break, or claimed PoE2 damage scaling.
export const CRUSHER_RULES=Object.freeze({origin:'emberwatch_authored_candidate',gainPerDirectMaceHit:1,primedThreshold:2,heavyStunSeconds:WARRIOR_BALANCE.charge.stunSeconds});
const ledgers=new WeakMap(),waves=new WeakMap();
const alive=e=>!!e&&e.hp>0&&!e.dead;
const ledger=e=>{if(!ledgers.has(e))ledgers.set(e,{lastMaceCast:0,lastPayoffCast:0});return ledgers.get(e);};
export function crusherImmune(b,e){return e?.stunImmune===true||(b.foeTypes?.[e?.kind]?.stunImmune===true);}
export function crusherAvailability(b){
 if(!b?.stats.actions.mace_swing?.learned||!b.stats.actions.judgement?.learned)return {ok:false,reason:'철퇴 기본 훈련과 단죄의 일격을 배워야 합니다.'};
 const state=b.equipmentContext,id=state?.character?.equipment?.mainHand;
 // Empty mainhand is the existing trained starter mace, not a new item grant.
 if(id){const item=state.inventory?.equipmentInstances?.find(row=>row.id===id);if(EQUIPMENT_ITEMS[item?.baseId]?.weaponType!=='mace')return {ok:false,reason:'현재 주무기가 철퇴여야 합니다.'};}
 return {ok:true,weapon:id?'equipped_mace':'trained_starter_mace'};
}
export function resetCrusherEnemy(e){if(!e)return;e.stunBuildup=0;e.primedForStun=false;e.heavyStunned=false;e.heavyStunRemaining=0;}
export function setCrusherMode(b,enabled){
 if(!b||typeof enabled!=='boolean')return {ok:false,reason:'전투 방식을 확인하세요.'};
 if(enabled){const ready=crusherAvailability(b);if(!ready.ok)return ready;}
 b.crusherEnabled=enabled;
 for(const e of b.enemies){e.stunBuildup=0;e.primedForStun=false;/* Do not shorten a previously applied stun. */}
 return {ok:true,enabled};
}
export function recordCrusherHit(b,e,result){
 const c=result?.context;
 if(b.dead||!(b.p.hp>0)||!b.crusherEnabled||!crusherAvailability(b).ok||!alive(e)||crusherImmune(b,e)||e.heavyStunned||!(result.damage>0)||c?.originSkillId!=='mace_swing'||c.rootKind!=='mace'||c.procDepth!==0||!Number.isSafeInteger(c.castId)||c.castId<=0)return null;
 const l=ledger(e);if(c.castId<=l.lastMaceCast)return null;l.lastMaceCast=c.castId;
 e.stunBuildup=Math.min(CRUSHER_RULES.primedThreshold,(e.stunBuildup??0)+CRUSHER_RULES.gainPerDirectMaceHit);e.primedForStun=e.stunBuildup>=CRUSHER_RULES.primedThreshold;
 return {type:'crusherBuildup',id:e.id,castId:c.castId,stunBuildup:e.stunBuildup,primedForStun:e.primedForStun,x:e.x,y:e.y};
}
export function crusherContactReady(b,e,castId){return !!(b.crusherEnabled&&!b.dead&&b.p.hp>0&&crusherAvailability(b).ok&&alive(e)&&e.active===true&&!crusherImmune(b,e)&&!e.heavyStunned&&e.primedForStun&&Number.isSafeInteger(castId)&&castId>ledger(e).lastPayoffCast);}
export function commitCrusherPayoff(b,e,{castId,readyAtContact,hit}={}){
 if(!crusherContactReady(b,e,castId)||!Number.isSafeInteger(castId)||castId<=0||hit?.context?.castId!==castId||hit.context.originSkillId!=='judgement'||b.dead||!(b.p.hp>0)||!readyAtContact||!hit?.hit||!(hit.damage>0)||crusherImmune(b,e)||!b.crusherEnabled||!crusherAvailability(b).ok)return null;
 const l=ledger(e);if(castId<=l.lastPayoffCast)return null;
 if(castId<=(waves.get(b)??0))return null;
 l.lastPayoffCast=castId;waves.set(b,castId);
 e.stunBuildup=0;e.primedForStun=false;
 if(alive(e)){e.heavyStunned=true;e.heavyStunRemaining=CRUSHER_RULES.heavyStunSeconds;e.stun=Math.max(e.stun??0,e.heavyStunRemaining);}else resetCrusherEnemy(e);
 return {type:'crusherHeavyStun',id:e.id,castId,x:hit.position.x,y:hit.position.y,duration:CRUSHER_RULES.heavyStunSeconds,defeatedOnHit:hit.defeated};
}
export function stepCrusherEnemy(b,e,dt){
 if(!alive(e)){if(e.stunBuildup!==undefined)resetCrusherEnemy(e);return;}
 if(crusherImmune(b,e)){e.stunBuildup=0;e.primedForStun=false;}
 if(e.heavyStunned){e.heavyStunRemaining=Math.max(0,(e.heavyStunRemaining??0)-dt);if(e.heavyStunRemaining<=1e-9){e.heavyStunned=false;e.heavyStunRemaining=0;e.stunBuildup=0;e.primedForStun=false;}}
}
