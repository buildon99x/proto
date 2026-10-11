import {applyEquipmentCommand} from './equipment.js';
import {deriveStats} from './warrior-growth.js';
import {getRegion,near,inMap,createMap} from './world.js';
const fail=(code,reason)=>({ok:false,code,reason});
export function reduceEquipmentRuntime(state,command){
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST','기본 훈련을 먼저 받으세요.');
 if(state.world.lifeDown||state.vitals.hp<=0)return fail('HERO_DOWN','쓰러진 상태에서는 장비를 변경할 수 없습니다.');
 if(state.world.region!=='ash_hamlet')return fail('TOWN_REQUIRED','장비 교체와 작업은 안전한 마을에서 진행하세요.');
 if(!inMap(createMap(state.world.region,state),command.position?.x,command.position?.y))return fail('INVALID_POSITION','현재 위치가 올바르지 않습니다.');
 const operation=command.operation;
 if(!operation||typeof operation.type!=='string')return fail('INVALID_COMMAND','장비 동작을 확인하세요.');
 const station=['buyEquipment','sellItem','receiveEquipmentAward'].includes(operation.type)?'blacksmith':['craftItem','upgradeItem'].includes(operation.type)?'workshop':null;
 if(station&&!getRegion(state.world.region).npcs.some(n=>n.id===station&&near(command.position,n)))return fail('STATION_REQUIRED',station==='blacksmith'?'대장장이 가까이에서 진행하세요.':'작업대 가까이에서 진행하세요.');
 const result=applyEquipmentCommand(state,operation);if(!result.ok)return result;
 const next=result.state,derived=deriveStats(next.character,next);if(!derived.ok)return derived;
 // Extra capacity never creates HP/MP/stamina. Taking gear off only clamps.
 for(const [pool,max] of [['hp','hpMax'],['mana','manaMax'],['stamina','staminaMax']])next.vitals[pool]=Math.min(next.vitals[pool],derived.stats[max]);
 next.world.position={...command.position};
 return {ok:true,state:next,events:result.replayed?[]:[{type:'equipmentChanged',operation:operation.type,receipt:result.receipt}],replayed:result.replayed};
}
