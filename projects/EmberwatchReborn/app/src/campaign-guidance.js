import {wildernessGuidance} from './wilderness-presentation.js';
const wildernessCache=new WeakMap();
import {battlefieldGuidance} from './battlefield-presentation.js';
import {dungeonGuidance} from './dungeon-presentation.js';
import {quarryGuidance} from './quarry-presentation.js';
import {passGuidance} from './pass-presentation.js';
import {signalGuidance} from './signal-presentation.js';
import {tombGuidance} from './tomb-presentation.js';
import {furnaceGuidance} from './furnace-presentation.js';
// Presentation derived from durable campaign receipts, never a second quest state.
export function campaignGuidance(state) {
 const world=state.world,claimed=world.claimedRewards,objectives=world.objectives;
 const result=(id,title,detail)=>({id,title,detail});
 if(!state.vitals)return result('training','훈련관 브란에게 기본 기술 배우기','마을 서쪽 훈련관에게 네 가지 기본 기술을 무료로 배우세요.');
 if(!objectives.patrol_accepted)return result('accept','촌장 에다에게 순찰 의뢰 받기','마을 북동쪽 촌장에게 잿길 순찰 의뢰를 받으세요.');
 if(!claimed.includes('watch_patrol'))return (objectives.patrol_scouts??0)>=6
  ?result('report','마을로 돌아가 촌장에게 보고','순찰을 마쳤습니다. 촌장에게 경험치70·금화20·철1을 받으세요.')
  :result('patrol',`잿길의 적 처치 ${objectives.patrol_scouts??0}/6`,'적 여섯을 쓰러뜨리고 촌장에게 돌아가세요.');
 if(!(world.defeated?.ash_road??[]).includes('road-warden'))return result('warden','잿길 끝의 잿문 감시자 처치','붉은 예고에서 벗어난 뒤 반격하세요. 감시자가 길 끝 보급품을 봉인하고 있습니다.');
 if(!claimed.includes('chest:warden-cache'))return result('warden-cache','감시자 뒤의 봉인 풀린 상자 열기','감시자를 쓰러뜨렸습니다. 잿길 북동쪽 끝의 보급 상자를 회수하세요.');
 if(objectives.sluice_accepted){if(!wildernessCache.has(state))wildernessCache.set(state,wildernessGuidance(state));return wildernessCache.get(state)??battlefieldGuidance(state)??tombGuidance(state)??furnaceGuidance(state)??signalGuidance(state)??passGuidance(state)??quarryGuidance(state)??dungeonGuidance(state);}
 if(!claimed.includes('chest:road-cache'))return result('road-cache','잿길 남쪽의 남은 보급 상자 회수','감시자 보급품은 확보했습니다. 길 남쪽의 상자도 확인하세요.');
 if(!state.equipmentProgress?.claimedAwards.includes('warden_cache_gear'))return result('smith-award','마을 대장장이에게 감시자 보급 장비 받기','대장장이 오린에게 누비 두건·철1·실2를 한 번 받을 수 있습니다.');
 return dungeonGuidance(state);
}
export function chestPresentation(state,chestId) {
 if(state.world.claimedRewards.includes('chest:'+chestId))return {open:true,name:'빈 보급 상자 · 회수 완료',message:'이미 회수한 보급품입니다. 추가 비용이나 보상은 없습니다.'};
 if(chestId==='warden-cache'&&!(state.world.defeated?.ash_road??[]).includes('road-warden'))return {open:false,name:'봉인된 보급 상자 · 감시자 처치 필요'};
 return {open:false,name:'보급 상자 열기'};
}
