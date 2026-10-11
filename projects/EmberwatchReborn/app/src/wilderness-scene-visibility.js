// W-only read-only presentation. This never filters the simulation, changes a
// collision tile, or turns activation into visibility. Reachable idle foes are
// still bodies; an active threat does not vanish when its sightline is broken.
import {WILDERNESS_REGION,WILDERNESS_REGIONS} from './wilderness-content.js';
import {connectedSceneVisibility} from './scene-visibility.js';
const region=WILDERNESS_REGIONS[WILDERNESS_REGION];
export const WILDERNESS_LANDMARK_RANGE=160;
const names=Object.freeze({
 'wilderness-tablet':'측량판', 'wilderness-hook':'무료 갈고리',
 'wilderness-anchor':'귀환 닻', 'wilderness-glyph-wind':'바람깃 수신판',
 'wilderness-glyph-cairn':'돌무덤 수신판', 'wilderness-glyph-ember':'잿불 수신판',
 'wilderness-choice':'엄폐판 선택', 'wilderness-relay':'신호 중계기',
 'wilderness-evidence':'신호 기록핵', 'wilderness-scouts':'네리 · 선택 구조',
 'wilderness-town-return':'마을 귀환', 'wilderness-anchor-return':'닻다리 귀환',
 'wilderness-keeper-return':'단상 귀환',
});
export function wildernessSceneVisibility(battle,{objectives={},objectView=()=>null,portalView=()=>null}={}){
 if(battle?.region!==WILDERNESS_REGION)return null;
 return connectedSceneVisibility(battle,{objectives,objectView,portalView,region,names,range:WILDERNESS_LANDMARK_RANGE,
  labelOverride:(o,view)=>o.id==='wilderness-keeper-return'&&view?.name?.includes('기록핵 미회수')?'귀환 · 기록핵 미회수':null});
}
