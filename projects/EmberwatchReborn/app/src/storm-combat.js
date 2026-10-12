import {isPoeControls} from './controls.js';
import {inMap,lineOfSight} from './world-geometry.js';
// Source0.5: cap3 and .3s trigger interval. Remaining values are authored tests,
// not a claim to implement live PoE2 staff/Combo or Gathering Storm formulas.
export const STORM_RULES=Object.freeze({comboRequired:4,bellLifetime:12,maxBells:3,waveInterval:.3,contactsPerSwing:2,perfectWindow:.18});
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function stormAvailability(b){
 if(!b?.stats.actions.mace_swing?.learned||!b.stats.actions.judgement?.learned||!b.stats.actions.shield_charge?.learned)return {ok:false,reason:'기본 훈련과 단죄의 일격을 배워야 합니다.'};
 if(!isPoeControls(b.equipmentContext?.options?.controls))return {ok:false,reason:'키 설정에서 PoE형 조작을 선택하세요.'};
 if(b.equipmentContext?.character?.equipment?.mainHand)return {ok:false,reason:'주무기를 해제하면 세션 훈련봉 자세를 선택할 수 있습니다.'};
 return {ok:true};
}
export function setStormMode(b,enabled){
 if(!b||typeof enabled!=='boolean')return {ok:false,reason:'전투 방식을 확인하세요.'};
 if(enabled){const ready=stormAvailability(b);if(!ready.ok)return ready;}
 if(enabled){b.crusherEnabled=false;b.stormEnabled=true;b.storm={combo:0,bells:[],serial:0,lastSwing:0,lastTimedContact:null};b.p.stormPose=true;for(const e of b.enemies)if(e.stunBuildup!==undefined){e.stunBuildup=0;e.primedForStun=false;}}
 else if(b.stormEnabled||b.storm){b.stormEnabled=false;b.storm=null;delete b.p.stormPose;}
 return {ok:true,enabled};
}
export const liveStormBells=b=>b.storm?.bells.filter(x=>x.active&&x.remaining>1e-9)??[];
export function stormPlacement(b,input,a=b.stats.actions.judgement){
 if(!b.stormEnabled||!stormAvailability(b).ok)return {ok:false,blockedReason:'storm-setup'};
 if(b.storm.combo<STORM_RULES.comboRequired)return {ok:false,blockedReason:'combo'};
 if(liveStormBells(b).length>=STORM_RULES.maxBells)return {ok:false,blockedReason:'bell-limit'};
 const point=input?.aimBySkill?.judgement?.groundPoint,radius=b.stats.actions.shield_charge.radius;
 if(!finite(point)||Math.hypot(point.x-b.p.x,point.y-b.p.y)>a.range+1e-9||Math.hypot(point.x-b.p.x,point.y-b.p.y)<radius+11||!inMap(b.map,point.x,point.y,radius)||!lineOfSight(b.map,b.p,point)||liveStormBells(b).some(x=>Math.hypot(point.x-x.x,point.y-x.y)<2*radius)||b.enemies.some(x=>x.active&&x.hp>0&&!x.dead&&Math.hypot(point.x-x.x,point.y-x.y)<radius+11))return {ok:false,blockedReason:'bell-placement'};
 return {ok:true,point:{x:point.x,y:point.y},radius};
}
export function installStormBell(b,placement,spec,castId){
 if(!placement?.ok)return null;
 const bell={id:`storm-bell-${++b.storm.serial}`,kind:'storm-bell',x:placement.point.x,y:placement.point.y,radius:placement.radius,active:true,remaining:STORM_RULES.bellLifetime,nextWave:0,lastSwing:0,spec,placedBy:castId};
 b.storm.combo-=STORM_RULES.comboRequired;b.storm.bells.push(bell);return bell;
}
export function recordStormEnemyHit(b,result){
 const c=result?.context,s=b.storm;if(!b.stormEnabled||!s||b.dead||!(b.p.hp>0)||!stormAvailability(b).ok||!result.hit||!(result.damage>0)||!c?.stormSwing||c.originSkillId!=='mace_swing'||c.rootKind!=='mace'||c.procDepth!==0||!Number.isSafeInteger(c.castId)||c.castId<=s.lastSwing)return null;
 s.lastSwing=c.castId;s.combo=Math.min(STORM_RULES.comboRequired,s.combo+1);return {type:'stormCombo',castId:c.castId,combo:s.combo};
}
export function noteStormContact(b,ordinal){if(ordinal===2&&b.storm)b.storm.lastTimedContact=b.time;}
export function stormPerfectStart(b){const last=b.storm?.lastTimedContact;return Number.isFinite(last)&&b.time>=last-1e-9&&b.time-last<=STORM_RULES.perfectWindow+1e-9;}
export function claimStormBellHit(b,bell,castId){
 if(!b.stormEnabled||!bell?.active||!(bell.remaining>1e-9)||!Number.isSafeInteger(castId)||castId<=bell.lastSwing)return false;
 bell.lastSwing=castId;if(bell.nextWave>1e-9)return false;bell.nextWave=STORM_RULES.waveInterval;return true;
}
export function consumeStormBell(b,bell,action){
 if(!b.stormEnabled||b.dead||!(b.p.hp>0)||!Number.isSafeInteger(action?.castId)||action.castId<=0||!action.stormPerfect||!bell?.active||!(bell.remaining>1e-9))return false;
 bell.active=false;bell.remaining=0;bell.consumedBy=action.castId;return true;
}
export function stepStorm(b,dt){
 if(!b.storm)return;
 if(b.dead||!(b.p.hp>0)){b.storm.combo=0;b.storm.lastTimedContact=null;b.storm.bells=[];return;}
 for(const bell of b.storm.bells){bell.remaining=Math.max(0,bell.remaining-dt);bell.nextWave=Math.max(0,bell.nextWave-dt);if(bell.remaining<=1e-9)bell.active=false;}
 b.storm.bells=b.storm.bells.filter(x=>x.active&&x.remaining>1e-9);
}
