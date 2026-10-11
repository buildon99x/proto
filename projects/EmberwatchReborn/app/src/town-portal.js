import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
// Authored Emberwatch utility, not a Path of Exile 2 timing/cooldown measurement.
export const TOWN_PORTAL_COOLDOWN_SECONDS=60;
export const TOWN_PORTAL_ID='personal-town-portal';
// A running session follows monotonic elapsed time: OS clock corrections cannot
// shorten or extend an in-flight cooldown. Reload uses the saved epoch deadline;
// this local-only game does not claim server-backed anti-tamper guarantees.
export function createTownPortalClock({wallNow=()=>Date.now(),steadyNow=()=>performance.now()}={}){
 const wall=wallNow(),start=steadyNow();let last=wall;
 return ()=>{const steady=steadyNow(),next=wall+Math.max(0,steady-start);if(Number.isFinite(next)&&next>=last&&next<=Number.MAX_SAFE_INTEGER)last=next;return Math.floor(last);};
}
export const townPortalNow=createTownPortalClock();
const fail=(code,reason)=>({ok:false,code,reason});
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const integer=x=>Number.isSafeInteger(x)&&x>=0;
export function validateTownPortal(state){
 const portal=state.world?.townPortal;if(portal===undefined)return {ok:true};
 if(state.version<5||!record(portal)||Object.keys(portal).length!==4||portal.version!==1||!integer(portal.openedAtMs)||!integer(portal.readyAtMs)||portal.readyAtMs-portal.openedAtMs!==TOWN_PORTAL_COOLDOWN_SECONDS*1000)return fail('INVALID_TOWN_PORTAL','귀환 포탈 기록이 올바르지 않습니다.');
 const a=portal.active;
 if(a!==null&&(!record(a)||Object.keys(a).length!==3||a.region==='ash_hamlet'||!getRegion(a.region)||a.region!==state.world.region||!state.world.visited.includes(a.region)||!integer(a.life)||a.life!==(state.world.life??0)||state.world.lifeDown||!record(a.position)||Object.keys(a.position).length!==2||!inMap(createMap(a.region,state),a.position.x,a.position.y)))return fail('INVALID_TOWN_PORTAL','현재 지역의 살아 있는 귀환 포탈만 복원할 수 있습니다.');
 return {ok:true};
}
export function townPortalRemaining(state,nowMs=townPortalNow()){
 const ready=state?.world?.townPortal?.readyAtMs;if(ready===undefined)return 0;
 return Number.isFinite(nowMs)?Math.max(0,(ready-nowMs)/1000):Infinity;
}
export function townPortalCandidate(state){
 const a=state?.world?.townPortal?.active;
 return a&&a.region===state.world.region&&a.life===(state.world.life??0)&&!state.world.lifeDown?{...a.position,id:TOWN_PORTAL_ID,kind:'townPortal',type:'townPortal',name:'잿불 귀환 포탈',openedAtMs:state.world.townPortal.openedAtMs,to:'ash_hamlet'}:null;
}
export function townPortalAvailability(state,nowMs=townPortalNow()){
 if(state?.world?.lifeDown||state?.vitals?.hp===0)return fail('HERO_DOWN','쓰러진 동안에는 귀환 포탈을 사용할 수 없습니다.');
 if(state?.world?.region==='ash_hamlet')return fail('ALREADY_IN_TOWN','이미 잿불 마을에 있습니다.');
 const remaining=townPortalRemaining(state,nowMs);
 if(remaining>0)return {...fail('TOWN_PORTAL_COOLDOWN',`귀환 포탈 재사용까지 ${Number.isFinite(remaining)?Math.ceil(remaining)+'초':'잠시'} 남았습니다.`),remaining};
 return {ok:true};
}
export function clearTownPortal(state){if(state.world.townPortal)state.world.townPortal.active=null;}
// Called only inside the validated campaign transaction. Time is supplied by
// the controller at dequeue, never by input or a save report. No reward/gate edit.
export function reduceTownPortal(next,c,context){
 if(c.region!==next.world.region)return fail('STALE_PORTAL_REGION','이전 지역의 귀환 입력입니다.');
 if(c.type==='openTownPortal'){
  if(!integer(context.nowMs)||context.nowMs>Number.MAX_SAFE_INTEGER-TOWN_PORTAL_COOLDOWN_SECONDS*1000)return fail('PORTAL_CLOCK_REQUIRED','포탈 대기 시간을 확인할 수 없습니다.');
  const available=townPortalAvailability(next,context.nowMs);if(!available.ok)return available;
  next.world.townPortal={version:1,openedAtMs:context.nowMs,readyAtMs:context.nowMs+TOWN_PORTAL_COOLDOWN_SECONDS*1000,active:{region:next.world.region,life:next.world.life??0,position:{...c.position}}};
  next.world.position={...c.position};
  return {ok:true,events:[{type:'townPortalOpened'}]};
 }
 const portal=townPortalCandidate(next);
 if(!portal||c.portalOpenedAtMs!==portal.openedAtMs)return fail('STALE_TOWN_PORTAL','현재 열린 귀환 포탈을 선택하세요.');
 if(!near(c.position,portal)||!lineOfSight(createMap(next.world.region,next),c.position,portal))return fail('PORTAL_REQUIRED','귀환 포탈 가까이로 이동하세요.');
 clearTownPortal(next);next.world.region='ash_hamlet';next.world.position={...getRegion('ash_hamlet').spawn};if(!next.world.visited.includes('ash_hamlet'))next.world.visited.push('ash_hamlet');
 return {ok:true,events:[{type:'travelled',region:'ash_hamlet'},{type:'townPortalEntered'}]};
}
