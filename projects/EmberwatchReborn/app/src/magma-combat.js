import {isPoeControls} from './controls.js';
import {EQUIPMENT_ITEMS} from './equipment-content.js';
// Explicit candidate values, not verified PoE2 timings/stat formulas.
export const MAGMA_RULES=Object.freeze({chargeSeconds:3,releaseWindow:.18});
export function magmaAvailability(b){
 if(!b?.stats.actions.shield_block?.learned||!b.stats.actions.mace_swing?.learned||!b.stats.actions.righteous_hammer?.learned)return {ok:false,reason:'방패·철퇴·망치 기본 훈련을 먼저 배우세요.'};
 const state=b.equipmentContext,controls=state?.options?.controls;
 if(!isPoeControls(controls)||controls.blockMode!=='hold')return {ok:false,reason:'PoE형 조작과 방패 누름 유지를 선택하세요.'};
 const id=state.character?.equipment?.offHand;
 if(id){const item=state.inventory?.equipmentInstances?.find(x=>x.id===id);if(EQUIPMENT_ITEMS[item?.baseId]?.weaponType!=='shield')return {ok:false,reason:'기존 방패를 사용하거나 보조 무기를 해제하세요.'};}
 return {ok:true};
}
export function setMagmaMode(b,enabled){
 if(!b||typeof enabled!=='boolean')return {ok:false,reason:'전투 방식을 확인하세요.'};if(enabled){const r=magmaAvailability(b);if(!r.ok)return r;}
 if(enabled){b.magmaEnabled=true;b.magma={charge:0,raised:false,token:null,handled:new Set()};b.p.magmaPose=true;b.p.magmaCharge=0;b.p.magmaImpact=0;}
 else if(b.magma){clearMagmaDefense(b,'mode');b.magmaEnabled=false;b.magma=null;delete b.p.magmaPose;delete b.p.magmaCharge;delete b.p.magmaImpact;}
 return {ok:true,enabled};
}
export function clearMagmaDefense(b,reason='safety',{keepCharge=false}={}){
 if(!b?.magma)return;b.magma.raised=false;b.magma.token=null;b.p.block=false;b.p.magmaImpact=0;
 if(!keepCharge){b.magma.charge=0;b.p.magmaCharge=0;}
 if(b.p.action?.magmaBash)b.p.action.magmaCancelled=reason;
}
export function acceptMagmaIncoming(b,id){
 if(!b.magmaEnabled||!b.magma||!Number.isSafeInteger(id)||id<=0)return true;
 if(b.magma.handled.has(id))return false;b.magma.handled.add(id);return true;
}
export function registerMagmaBlock(b,{attackId,activeBlocked,procDepth=0,damage,angle}){
 const s=b.magma;if(!b.magmaEnabled||!s||!magmaAvailability(b).ok||b.dead||!(b.p.hp>0)||!activeBlocked||!Number.isSafeInteger(attackId)||attackId<=0||procDepth!==0||!(damage>0))return null;
 s.raised=true;s.token={attackId,remaining:MAGMA_RULES.releaseWindow,angle};b.p.magmaImpact=.24;
 const spray=s.charge>=MAGMA_RULES.chargeSeconds-1e-9;if(spray){s.charge=0;b.p.magmaCharge=0;}
 return {type:'magmaActiveBlock',attackId,angle,spray};
}
export function consumeMagmaRelease(b){
 const token=b.magma?.token;if(!token||!(token.remaining>1e-9)||b.dead||!(b.p.hp>0))return null;b.magma.token=null;return token;
}
export function stepMagma(b,dt){
 const s=b.magma;if(!b.magmaEnabled||!s)return;
 if(b.dead||!(b.p.hp>0)||!magmaAvailability(b).ok){clearMagmaDefense(b,'unavailable');return;}
 s.charge=Math.min(MAGMA_RULES.chargeSeconds,s.charge+dt);b.p.magmaCharge=s.charge/MAGMA_RULES.chargeSeconds;b.p.magmaImpact=Math.max(0,(b.p.magmaImpact??0)-dt);
 if(s.token){s.token.remaining=Math.max(0,s.token.remaining-dt);if(s.token.remaining<=1e-9)s.token=null;}
}
