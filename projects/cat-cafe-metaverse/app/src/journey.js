import {ambientPhase} from '../../shared/ambient.mjs';
import {soloProfile,soloExperience,soloDeadlineReached} from './solo-experience.js';
export function allowEntry(rendererReady,onReady){if(!rendererReady)return false;onReady();return true;}
export function catBearing(me,cat,yaw=0){if(!me||!cat)return null;const dx=cat.x-me.x,dz=cat.z-me.z,distance=Math.hypot(dx,dz);if(!Number.isFinite(distance)||!Number.isFinite(yaw))return null;if(distance<.1)return{distance,direction:'바로 곁'};const right=dx*Math.cos(yaw)-dz*Math.sin(yaw),forward=-dx*Math.sin(yaw)-dz*Math.cos(yaw);const labels=['앞쪽','오른쪽 앞','오른쪽','오른쪽 뒤','뒤쪽','왼쪽 뒤','왼쪽','왼쪽 앞'];return{distance,direction:labels[(Math.round(Math.atan2(right,forward)/(Math.PI/4))+8)%8]};}
const CAT_ASIDES={sleep:['잠자는 중 · 낮잠 근무는 아직 끝나지 않았어요','잠자는 중 · 꿈속에서 깃털을 잡는 중일지도요','잠자는 중 · 이 자리는 햇살 맛집이에요'],rest:['쉬는 중 · 아무것도 안 하기의 전문가예요','쉬는 중 · 쓰다듬기는 가까이에서 부탁해요','쉬는 중 · 오늘도 카페의 느긋한 주인이에요'],groom:['털을 고르는 중 · 앞발 세수는 꼼꼼하게','털을 고르는 중 · 지금은 단장 시간이에요','털을 고르는 중 · 수염까지 가지런하게'],stretch:['기지개 중 · 앞발 끝까지 쭈욱','기지개 중 · 낮잠 다음에도 준비 운동','기지개 중 · 길어지는 데는 잠깐이면 돼요'],walk:['잠깐 산책 중 · 다음 낮잠 자리를 살펴요','잠깐 산책 중 · 카페 순찰은 느긋하게','잠깐 산책 중 · 서두를 일은 없어요']};
export function catActivity(cat,time,room,solo=false){if(!cat)return'';if(solo){const experience=soloExperience(cat,time,room);if(experience.action)return soloActionResponse(cat,experience.action);const activity=experience.routine?.text??catActivity({...cat,mode:'idle'},time,room).split(' · ')[0];return `${activity} · ${experience.profile.clue}`;}const explicit={pet:'쓰다듬으며 교감하고 있어요',feather:'깃털과 놀고 있어요',ball:'공과 놀고 있어요',rest:'편안하게 쉬고 있어요'};if(explicit[cat.mode])return explicit[cat.mode];if(!Number.isFinite(time))return'느긋하게 쉬어 가는 친구예요';const phase=ambientPhase(cat.id,time,room),index=Math.abs(Number.parseInt(String(cat.id).replace(/^cat-/,''),10)||0)%3;return CAT_ASIDES[phase]?.[index]??'느긋하게 쉬고 있어요';}
export function settleAction(journey,feedback,event,selected){const result=journey.settle(event);if(result.status==='ignored')return result;const action=feedback.consume(event);if(result.status==='timed-out')feedback.clear();return{...result,playSound:result.playSound&&result.catId===selected&&Boolean(action)};}
// Presentation-only guard: a confirmed action may finish before the visitor repeats it.
// Other actions remain available; authority still decides acceptance and ownership.
export function activeCatAction(cat,visitorId,time,solo=false){
 const label={pet:'쓰다듬기',feather:'깃털 놀이',ball:'공 놀이'}[cat?.mode];
 if(!label||!visitorId||cat.owner!==visitorId||!Number.isFinite(time)||!Number.isFinite(cat.until)||(solo?soloDeadlineReached(cat.until,time):cat.until<=time))return null;
 const seconds=Math.min(4,Math.ceil((cat.until-time)/1000));
 return{action:cat.mode,seconds,message:`${label} 중 · 약 ${seconds}초 뒤 다시 놀 수 있어요`};
}

const SOLO_RESPONSES={
 sleepy:{pet:'눈을 가늘게 감고 천천히 부비적 ♡ 낮잠보다 좋은 손길',feather:'깃털을 살피고 한 번 폴짝 · 나머지는 느긋한 구경',ball:'공을 느긋하게 따라가요 · 서두르지 않는 추격자'},
 observant:{pet:'눈을 살짝 감고 조심조심 부비적 ♡',feather:'깃털을 오래 살피고 한 번 폴짝 · 신중한 사냥꾼',ball:'공을 차분하게 따라가요 · 한 발씩 거리를 좁혀요'},
 playful:{pet:'눈을 반쯤 감고 부비적 ♡ 놀이 사이의 작은 쉼표',feather:'깃털을 살피고 두 번 폴짝 · 중간에는 잠깐 쉬어요',ball:'공을 힘차게 쫓아요 · 데굴데굴은 못 참아요'}
};
export function soloActionResponse(cat,action){return cat?SOLO_RESPONSES[soloProfile(cat.id).key][action]??'':'';}
