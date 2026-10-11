import {battleReport} from './recovery.js';
const critical=new Set(['roll-start','knockdown-start','mobilityCancelled','actionStarted','heroHurt','healApplied','regenBuffChanged','channelPayment','channelEnded','innerFlameChanged','procCooldownStarted','procCooldownExpired','heroStatusChanged','combatRandom','safetyCancelled']);
// The caller freezes simulation until this command is durably committed. A
// failure must close the runtime gate even when it is a recoverable quota error.
export function combatCheckpoint(battle,events,{elapsed=0}={}){
 // The first town tutorial has no durable vitals until all four starters are
 // trained. Periodic movement saves must not ask the campaign to checkpoint
 // that intentionally untrained state and then treat TRAIN_FIRST as a fault.
 if(!battle.stats.actions.mace_swing?.learned)return null;
 const defeated=events.filter(e=>e.type==='defeated').map(e=>e.id),died=events.some(e=>e.type==='heroDead');
 if(defeated.length||died)return {type:'settleCombat',defeated,...battleReport(battle)};
 if(!battle.dead&&!battle.awaitingAdvance&&(events.some(e=>critical.has(e.type))||elapsed>=1))return {type:'checkpoint',...battleReport(battle)};
 return null;
}
