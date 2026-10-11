import {deriveStats} from './warrior-growth.js';
import {clearBattleIntent,cancelBattleAction,resetPoeMobility} from './combat.js';

/**
 * Apply an already committed, validated state to the existing live battle.
 * Caller must not invoke this for a rejected or uncertain save. The caller also
 * owns equipmentContext and map/region updates, as before this extraction.
 * Only a successful rest uses resetRecovery:true; ordinary checkpoints, rewards
 * and equipment changes preserve the running action, skill CDs and intent.
 */
export function syncCommittedBattle(battle,state,{resetRecovery=false,cancelReason=null}={}){
  if(!battle||!state?.vitals)return;
  const derived=deriveStats(state.character,state);
  if(!derived.ok)throw new Error('Invalid committed character for battle synchronization');
  if(resetRecovery&&!state.recovery)throw new Error('Committed recovery is required for rest synchronization');
  const p=battle.p;
  if(cancelReason)cancelBattleAction(battle,cancelReason);
  Object.assign(p,state.vitals);
  battle.stats=derived.stats;
  if(state.recovery)p.potionCooldown=state.recovery.potionCooldown;
  if(resetRecovery){
    const r=state.recovery;
    p.cooldowns={...r.cooldowns};
    p.recoveryLock=r.lock;
    p.manaDelay=r.manaDelay;
    p.staminaDelay=r.staminaDelay;
    p.invuln=r.invuln;
    p.potionCooldown=r.potionCooldown;
    p.regenBuff=r.regenBuff?{...r.regenBuff}:null;
    p.innerFlame=r.innerFlame?{...r.innerFlame}:null;
    p.procCooldowns={...r.procCooldowns};p.procCooldownRanks={...r.procCooldownRanks};p.negativeStatuses=structuredClone(r.negativeStatuses??{});
    if(r.combatRng){battle.seed=r.combatRng.state;battle.combatDraws=r.combatRng.draws;}
    battle.banner=null;battle.shots=[];battle.areas=[];
    p.action=null;p.block=false;p.moving=false;resetPoeMobility(battle,'rest');
    clearBattleIntent(battle);
  }
}
