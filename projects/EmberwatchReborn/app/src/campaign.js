import {reduceTownPortal,clearTownPortal} from './town-portal.js';
import {wildernessPortalAllowed,invalidateWildernessInput,synchronizeWildernessCombatProgress} from './wilderness.js';
import {battlefieldPortalAllowed,invalidateBattlefieldInput} from './battlefield.js';
import {trainingGoldBalances} from './training-economy.js';
import {emptyRecovery,retryRecovery,recoveryFrom,validateRecovery} from './recovery.js';
import {dungeonPortalAllowed} from './dungeon.js';
import {quarryPortalAllowed} from './quarry.js';
import {passPortalAllowed} from './pass.js';
import {signalPortalAllowed} from './signal.js';
import {furnacePortalAllowed} from './furnace.js';
import {tombPortalAllowed,invalidateTombInput} from './tomb.js';
import {trainStarterSkills,purchaseSkill,deriveStats} from './warrior-growth.js';
import {grantExperience,experienceMultiplier} from './progression.js';
import {getRegion,createMap,inMap,near,findEnemy,FOES,lineOfSight} from './world.js';
const fail=(code,reason)=>({ok:false,code,reason});
const copy=x=>JSON.parse(JSON.stringify(x));
export const CAMPAIGN_COMMANDS=new Set(['trainStarter','purchaseSkill','acceptPatrol','settleCombat','travel','rest','retry','drinkPotion','openChest','checkpoint','openTownPortal','enterTownPortal']);
function initialize(next){next.world.defeated??={};next.world.life??=0;next.world.lifeDown??=false;next.world.position??={...getRegion(next.world.region).spawn};}
function grant(next,xp,gold,events){const result=grantExperience(next.character,xp);if(!result.ok)return result;next.character=result.character;next.gold+=gold;next.stats.earnedGold+=gold;next.stats.earnedXp=Math.round((next.stats.earnedXp+result.appliedXp)*1e6)/1e6;if(result.gainedLevels)events.push({type:'levelUp',levels:result.gainedLevels});return result;}
function validReport(next,c){const stats=deriveStats(next.character,next);if(!stats.ok)return false;return (c.recovery===undefined||validateRecovery(c.recovery,{character:next.character}))&&c.position&&inMap(createMap(next.world.region,next),c.position.x,c.position.y)&&c.vitals&&['hp','mana','stamina'].every(k=>Number.isFinite(c.vitals[k])&&c.vitals[k]>=0&&c.vitals[k]<=stats.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]]);}
function npcAt(next,c,id){const npc=getRegion(next.world.region).npcs.find(x=>x.id===id);return npc&&near(c.position,npc)&&lineOfSight(createMap(next.world.region,next),c.position,npc);}
export function reduceCampaign(state,c,context={}){
  const balances=trainingGoldBalances(state);if(!balances.ok)return balances;
  const next=copy(state),events=[];initialize(next);
  // A manual pre-training save records only the safe town position. It does
  // not initialize combat pools, grant starters, or weaken the trained path.
  if(c.type==='checkpoint'&&!next.vitals){
    if(next.world.region!=='ash_hamlet'||next.world.lifeDown||c.life!==next.world.life||Object.keys(next.character.skills).length||!validReport(next,c)||c.vitals.hp<=0)return fail('INVALID_REPORT','훈련 전 마을 위치를 확인하세요.');
    next.world.position={...c.position};events.push({type:'tutorialCheckpoint'});return {ok:true,state:next,events};
  }
  if(c.type!=='trainStarter'&&!next.vitals)return fail('TRAIN_FIRST','먼저 마을 훈련관에게 기본 기술을 배우세요.');
  if(next.world.lifeDown&&!['retry','settleCombat'].includes(c.type))return fail('HERO_DOWN','마을에서 다시 일어나세요.');
  switch(c.type){
    case 'openTownPortal':
    case 'enterTownPortal':{
      if(c.life!==next.world.life)return fail('STALE_LIFE','현재 생명의 포탈 입력만 처리할 수 있습니다.');
      if(!validReport(next,c)||c.vitals.hp<=0)return fail('INVALID_REPORT','살아 있는 현재 위치에서 포탈을 사용하세요.');
      const portal=reduceTownPortal(next,c,context);if(!portal.ok)return portal;
      next.vitals={...c.vitals};next.recovery=recoveryFrom(c,next.recovery);
      if(c.type==='enterTownPortal'){
        for(const invalidate of [invalidateWildernessInput,invalidateBattlefieldInput,invalidateTombInput]){const revision=invalidate(next);if(!revision.ok)return revision;}
      }
      events.push(...portal.events);break;
    }
    case 'trainStarter':{
      if(!npcAt(next,c,'trainer'))return fail('TRAINER_REQUIRED','훈련관 가까이에서 대화하세요.');
      const trained=trainStarterSkills(next.character,next);if(!trained.ok)return trained;next.character=trained.character;
      if(!next.vitals){const s=deriveStats(next.character,next).stats;next.vitals={hp:s.hpMax,mana:s.manaMax,stamina:s.staminaMax};next.inventory.consumables.health_potion=2;next.world.objectives.trained=1;events.push({type:'trained'});}
      next.world.position={...c.position};break;
    }
    case 'purchaseSkill':{
      if(!npcAt(next,c,'trainer'))return fail('TRAINER_REQUIRED','기술 강화는 훈련관에게 돌아와 진행하세요.');
      const learned=purchaseSkill(next.character,c.skillId,next);if(!learned.ok)return learned;next.character=learned.character;events.push({type:'skillLearned',skillId:c.skillId,rank:learned.rank});break;
    }
    case 'acceptPatrol':{
      if(!npcAt(next,c,'elder'))return fail('ELDER_REQUIRED','촌장 가까이에서 대화하세요.');
      if(next.world.objectives.patrol_accepted)return fail('ALREADY_ACCEPTED','이미 의뢰를 받았습니다.');
      next.world.objectives.patrol_accepted=1;events.push({type:'questAccepted'});break;
    }
    case 'settleCombat':{
      if(c.life!==next.world.life||next.world.lifeDown)return fail('STALE_ENCOUNTER','이미 정산했거나 이전 생명의 전투입니다.');
      if(!validReport(next,c)||!Array.isArray(c.defeated)||c.defeated.length>100||new Set(c.defeated).size!==c.defeated.length)return fail('INVALID_REPORT','전투 보고가 올바르지 않습니다.');
      const region=next.world.region,receipts=next.world.defeated[region]??=[];
      if(!c.defeated.every(id=>findEnemy(region,id)))return fail('UNKNOWN_ENEMY','이 지역의 적만 정산할 수 있습니다.');
      if(c.defeated.some(id=>{const e=findEnemy(region,id);return e.gate&&!(next.world.objectives[e.gate]>=1);}))return fail('ENCOUNTER_LOCKED','아직 열리지 않은 전투입니다.');
      next.vitals={...c.vitals};next.recovery=recoveryFrom(c,next.recovery);next.world.position={...c.position};let kills=0;
      // All kills in the frame settle before its single death cost.
      for(const id of c.defeated){if(receipts.includes(id))continue;const f=FOES[findEnemy(region,id).kind];const r=grant(next,f.xp*experienceMultiplier(next.character.level,f.tier,next.difficulty),f.gold,events);if(!r.ok)return r;receipts.push(id);next.stats.kills++;kills++;if(region==='ash_road'&&next.world.objectives.patrol_accepted&&!next.world.claimedRewards.includes('watch_patrol'))next.world.objectives.patrol_scouts=(next.world.objectives.patrol_scouts??0)+1;}
      if(c.vitals.hp===0){next.recovery.regenBuff=null;next.recovery.innerFlame=null;next.recovery.negativeStatuses={};const wallet=trainingGoldBalances(next);if(!wallet.ok)return wallet;const loss=Math.floor(wallet.spendableGold*.05);next.gold-=loss;next.stats.spentGold+=loss;next.stats.deaths++;next.world.lifeDown=true;clearTownPortal(next);events.push({type:'died',lostGold:loss});}
      else if(events.some(e=>e.type==='levelUp')){const s=deriveStats(next.character,next).stats;next.vitals.hp=Math.min(s.hpMax,next.vitals.hp+s.hpMax*.25);next.vitals.mana=Math.min(s.manaMax,next.vitals.mana+s.manaMax*.25);next.vitals.stamina=Math.min(s.staminaMax,next.vitals.stamina+s.staminaMax*.25);}
      const wilderness=synchronizeWildernessCombatProgress(next);if(!wilderness.ok)return wilderness;
      if(next.world.objectives.wilderness_accepted)events.push({type:'wildernessChanged',mapChanged:wilderness.mapChanged});
      events.push({type:'combatSettled',kills});break;
    }
    case 'checkpoint':{
      if(c.life!==next.world.life||!validReport(next,c)||c.vitals.hp<=0){
        const positionOnly=c.life===next.world.life&&c.vitals?.hp>0&&validReport(next,{...c,position:next.world.position})&&(!c.position||!inMap(createMap(next.world.region,next),c.position.x,c.position.y));
        return fail('INVALID_REPORT',positionOnly?'현재 위치가 벽이나 이동할 수 없는 곳에 있어 저장하지 못했습니다. 마지막 저장을 불러와 다시 시도하세요.':'현재 생존 상태만 저장할 수 있습니다.');
      }
      next.vitals={...c.vitals};next.recovery=recoveryFrom(c,next.recovery);next.world.position={...c.position};break;
    }
    case 'travel':{
      if(c.life!==next.world.life)return fail('STALE_LIFE','현재 생명의 이동 입력만 처리할 수 있습니다.');
      const portal=getRegion(next.world.region).portals.find(p=>p.to===c.to&&(!c.portalId||p.id===c.portalId)&&near(c.position,p)&&lineOfSight(createMap(next.world.region,next),c.position,p));
      if(!portal)return fail('PORTAL_REQUIRED','출입구 가까이로 이동하세요.');
      const allowed=portal.gate?.startsWith('wilderness_')?wildernessPortalAllowed(next,portal):portal.gate?.startsWith('battlefield_')?battlefieldPortalAllowed(next,portal):portal.gate?.startsWith('tomb_')?tombPortalAllowed(next,portal):portal.gate?.startsWith('furnace_')?furnacePortalAllowed(next,portal):portal.gate?.startsWith('signal_')?signalPortalAllowed(next,portal):portal.gate?.startsWith('pass_')?passPortalAllowed(next,portal):portal.gate?.startsWith('quarry_')?quarryPortalAllowed(next,portal):dungeonPortalAllowed(next,portal);if(!allowed.ok)return allowed;
      if(c.to==='ash_road'&&!next.world.objectives.patrol_accepted)return fail('QUEST_REQUIRED','촌장에게 잿길 순찰 의뢰를 받으세요.');
      if(!validReport(next,c)||c.vitals.hp<=0)return fail('INVALID_REPORT','이동 상태가 올바르지 않습니다.');
      const wildernessRevision=invalidateWildernessInput(next);if(!wildernessRevision.ok)return wildernessRevision;
      const battlefieldRevision=invalidateBattlefieldInput(next);if(!battlefieldRevision.ok)return battlefieldRevision;
      const revision=invalidateTombInput(next);if(!revision.ok)return revision;
      next.vitals={...c.vitals};next.recovery=recoveryFrom(c,next.recovery);clearTownPortal(next);next.world.region=c.to;next.world.position={...(portal.arrival??getRegion(c.to).spawn)};if(!next.world.visited.includes(c.to))next.world.visited.push(c.to);events.push({type:'travelled',region:c.to});break;
    }
    case 'rest':{
      if(!npcAt(next,c,'healer'))return fail('HEALER_REQUIRED','마을 치유사 가까이에서 쉬세요.');
      const s=deriveStats(next.character,next).stats;next.vitals={hp:s.hpMax,mana:s.manaMax,stamina:s.staminaMax};next.recovery=emptyRecovery({combatRng:next.recovery?.combatRng});events.push({type:'rested'});break;
    }
    case 'retry':{
      if(!next.world.lifeDown)return fail('NOT_DOWN','아직 쓰러지지 않았습니다.');
      const s=deriveStats(next.character,next).stats;next.vitals={hp:s.hpMax,mana:s.manaMax,stamina:s.staminaMax};next.recovery=retryRecovery(next.recovery??emptyRecovery());next.world.life++;next.world.lifeDown=false;clearTownPortal(next);next.world.region='ash_hamlet';next.world.position={...getRegion('ash_hamlet').spawn};events.push({type:'retried'});break;
    }
    case 'drinkPotion':{
      if(!validReport(next,c)||c.vitals.hp<=0)return fail('INVALID_REPORT','살아 있을 때 사용할 수 있습니다.');
      if((next.inventory.consumables.health_potion??0)<1)return fail('NO_POTION','체력 물약이 없습니다. 마을 치유사에게 돌아가세요.');
      const s=deriveStats(next.character,next).stats;if(c.vitals.hp>=s.hpMax)return fail('HEALTH_FULL','체력이 가득합니다.');
      if(((c.recovery??next.recovery)?.potionCooldown??0)>0)return fail('POTION_COOLDOWN','물약 재사용을 잠시 기다리세요.');
      next.inventory.consumables.health_potion--;next.recovery={...recoveryFrom(c,next.recovery),potionCooldown:5};next.vitals={...c.vitals,hp:Math.min(s.hpMax,c.vitals.hp+s.hpMax*.55)};events.push({type:'potionUsed'});break;
    }
    case 'openChest':{
      const chest=getRegion(next.world.region).objects.find(x=>x.id===c.chestId&&x.type==='chest'&&near(c.position,x)&&lineOfSight(createMap(next.world.region,next),c.position,x));if(!chest)return fail('CHEST_REQUIRED','상자 가까이로 이동하세요.');
      if(!validReport(next,c)||c.vitals.hp<=0)return fail('INVALID_REPORT','상자 획득 상태가 올바르지 않습니다.');
      next.vitals={...c.vitals};next.recovery=recoveryFrom(c,next.recovery);
      const id='chest:'+chest.id;if(next.world.claimedRewards.includes(id))return fail('ALREADY_CLAIMED','이미 연 상자입니다.');
      if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT','보상 기록이 가득합니다.');
      if(chest.id==='warden-cache'&&!(next.world.defeated.ash_road??[]).includes('road-warden'))return fail('WARDEN_ALIVE','잿문 감시자가 상자를 봉인하고 있습니다.');
      const r=grant(next,chest.id==='warden-cache'?45:20,chest.id==='warden-cache'?35:12,events);if(!r.ok)return r;
      next.inventory.consumables.health_potion=(next.inventory.consumables.health_potion??0)+1;next.inventory.materials.iron=(next.inventory.materials.iron??0)+1;next.world.claimedRewards.push(id);events.push({type:'chestOpened',id:chest.id});break;
    }
    default:return fail('UNKNOWN_COMMAND','아직 구현되지 않은 동작입니다.');
  }
  return {ok:true,state:next,events};
}
