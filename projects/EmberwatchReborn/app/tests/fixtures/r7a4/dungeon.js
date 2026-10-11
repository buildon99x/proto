import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion, createMap, inMap, near, lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {DUNGEON_REGIONS, DUNGEON_GROUPS, DUNGEON_REWARDS, DUNGEON_PROGRESS_DEFAULTS, DUNGEON_RECEIPTS} from './dungeon-content.js';

export const DUNGEON_COMMANDS = new Set(['acceptSluiceQuest','interactDungeon','reportSluiceQuest']);
const TYPES = ['acceptSluiceQuest','interactDungeon','reportSluiceQuest'];
const MAX_RECEIPTS = 4096;
const own = (object, key) => Object.hasOwn(object, key);
const record = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const count = value => Number.isSafeInteger(value) && value >= 0;
const exact = (object, keys) => record(object) && Object.keys(object).length === keys.length && keys.every(key => own(object,key));
const clone = value => JSON.parse(JSON.stringify(value));
const regionIds = Object.keys(DUNGEON_REGIONS);
const objectiveKeys = Object.keys(DUNGEON_PROGRESS_DEFAULTS);
const RESERVED = new Set(['__proto__','prototype','constructor']);
const REASONS = {
  INVALID_DUNGEON_STATE:'수문소 진행 기록이 서로 맞지 않습니다.', INVALID_COMMAND:'수문소 입력 형식이 올바르지 않습니다.',
  TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.', HERO_DOWN:'쓰러진 상태에서는 수문소 조사를 진행할 수 없습니다.',
  STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.', INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',
  ELDER_REQUIRED:'마을 촌장 에다 가까이에서 보고하세요.', WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
  PATROL_REQUIRED:'촌장에게 잿길 순찰 결과를 먼저 보고하세요.', WARDEN_CACHE_REQUIRED:'감시자를 처치하고 북동쪽 보급 상자를 회수하세요.',
  ALREADY_ACCEPTED:'이미 수문소 조사를 수락했습니다.', QUEST_REQUIRED:'촌장에게 수문소 조사와 열쇠를 먼저 받으세요.',
  OBJECT_REQUIRED:'해당 수문소 장치 가까이로 이동하세요.', UNKNOWN_OBJECT:'이 지역의 수문소 장치가 아닙니다.',
  VALUE_REQUIRED:'밸브는 0/1, 배수 방향은 직통1/창고2 중 하나를 선택하세요.', TOOL_REQUIRED:'상층 입구에서 수문 손잡이를 회수하세요.',
  GUARDS_ALIVE:'상층 경비실의 적 세 명을 먼저 처치하세요.', CONTROL_GUARDS_ALIVE:'상층 제어실의 적 세 명을 먼저 처치하세요.',
  SEQUENCE_REQUIRED:'물결 → 톱니 → 불씨 순서로 중문을 먼저 여세요.', WATER_REQUIRED:'급수 차단·배수 개방과 방향 선택을 완료하세요.',
  ANTECHAMBER_ALIVE:'하층 전실의 적 두 명을 먼저 처치하세요.', BOSS_ALIVE:'수문 심장지기를 먼저 처치하세요.',
  STORE_LOCKED:'상층에서 창고 배수 방향2를 선택하세요.', STORE_GUARDS_ALIVE:'선택 창고의 적 세 명을 먼저 처치하세요.',
  CORE_REQUIRED:'보스 뒤 수문핵을 회수한 뒤 촌장에게 보고하세요.', ALREADY_CLAIMED:'이미 회수하거나 보고한 수문소 보상입니다.',
  ALREADY_OPEN:'이미 영구 개방한 장치입니다.', RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',
  VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.', UNKNOWN_GATE:'알 수 없는 수문소 출입 조건입니다.', SHORTCUT_REQUIRED:'하층 안전 구역에서 승강기 체인을 먼저 연결하세요.',
};
const fail = code => ({ok:false,code,reason:REASONS[code]??code});
function jsonData(value, parents = new Set(), depth = 0, budget = {left:250000}) {
  if (--budget.left < 0 || depth > 40) return false;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || parents.has(value) || (!Array.isArray(value) && !record(value)) || Object.getOwnPropertySymbols(value).length) return false;
  const entries = Object.entries(Object.getOwnPropertyDescriptors(value)).filter(([key]) => !(Array.isArray(value) && key === 'length'));
  if (Array.isArray(value) && (Object.getPrototypeOf(value) !== Array.prototype || entries.length !== value.length || entries.some(([key],index)=>key!==String(index)))) return false;
  if (entries.some(([key,d])=>RESERVED.has(key)||!own(d,'value')||!d.enumerable)) return false;
  parents.add(value); const valid = entries.every(([,d])=>jsonData(d.value,parents,depth+1,budget)); parents.delete(value); return valid;
}
const list = value => Array.isArray(value) && value.every(item=>typeof item==='string') && new Set(value).size===value.length;
const defeated = (state,region) => state.world.defeated?.[region]??[];
const cleared = (state,group) => DUNGEON_GROUPS[group].every(id=>defeated(state,group.startsWith('upper')?'sluice_upper':'sluice_lower').includes(id));
const hasReceipt = (state,id) => state.world.claimedRewards.includes(id);
const hasTool = (state,id) => state.inventory.tools.includes(id);
const progress = state => state.world.objectives;

/** Domain consistency only. Parent validateState still validates the whole save. */
export function validateDungeonProgress(state) {
  if (!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools)) return fail('INVALID_DUNGEON_STATE');
  const o=progress(state), receipts=state.world.claimedRewards, tools=state.inventory.tools;
  if (state.world.defeated!==undefined&&(!record(state.world.defeated)||!Object.values(state.world.defeated).every(list))) return fail('INVALID_DUNGEON_STATE');
  if (state.world.visited!==undefined&&!list(state.world.visited)) return fail('INVALID_DUNGEON_STATE');
  for (const region of regionIds) {
    const entries=defeated(state,region), known=DUNGEON_REGIONS[region].foes.map(foe=>foe.id);
    if (!list(entries)||entries.some(id=>!known.includes(id))) return fail('INVALID_DUNGEON_STATE');
  }
  if (Object.keys(o).some(key=>key.startsWith('sluice_')&&!objectiveKeys.includes(key))||receipts.some(id=>id.startsWith('r4:')&&!DUNGEON_RECEIPTS.includes(id))) return fail('INVALID_DUNGEON_STATE');
  const active=objectiveKeys.some(key=>own(o,key))||receipts.some(id=>id.startsWith('r4:'))||tools.some(id=>id==='sluice_key'||id==='sluice_crank')||regionIds.includes(state.world.region)
    ||regionIds.some(region=>defeated(state,region).length>0)||(state.world.visited??[]).some(region=>regionIds.includes(region));
  if (!active) return {ok:true}; // Existing unmodified R3 saves have no R4 fields.
  if (!objectiveKeys.every(key=>own(o,key)&&count(o[key]))) return fail('INVALID_DUNGEON_STATE');
  if (objectiveKeys.some(key=>o[key]>(key==='sluice_rune_step'?3:key==='sluice_drain_mode'?2:1))) return fail('INVALID_DUNGEON_STATE');
  if (o.sluice_accepted!==1||!hasReceipt(state,'r4:accept')||!hasReceipt(state,'watch_patrol')||!hasReceipt(state,'chest:warden-cache')||!defeated(state,'ash_road').includes('road-warden')||!hasTool(state,'sluice_key')) return fail('INVALID_DUNGEON_STATE');
  const pairs=[['sluice_crank_found','r4:crank'],['sluice_sequence_solved','r4:sequence'],['sluice_bridge_open','r4:water'],['sluice_shortcut_open','r4:lift'],['sluice_boss_awakened','r4:bell'],['first_dungeon_cleared','r4:core'],['adept_commission','r4:report']];
  if (pairs.some(([flag,id])=>Boolean(o[flag])!==hasReceipt(state,id))||Boolean(o.sluice_crank_found)!==hasTool(state,'sluice_crank')) return fail('INVALID_DUNGEON_STATE');
  if (Boolean(o.sluice_sequence_solved)!==(o.sluice_rune_step===3)) return fail('INVALID_DUNGEON_STATE');
  if ((o.sluice_rune_step>0||o.sluice_sequence_solved)&&(!o.sluice_crank_found||!cleared(state,'upper_guard'))) return fail('INVALID_DUNGEON_STATE');
  if (DUNGEON_GROUPS.upper_control.some(id=>defeated(state,'sluice_upper').includes(id))&&!o.sluice_sequence_solved) return fail('INVALID_DUNGEON_STATE');
  const touchedWater=o.sluice_valve_inlet!==1||o.sluice_valve_outlet!==0||o.sluice_drain_mode!==0||o.sluice_bridge_open;
  if (touchedWater&&(!o.sluice_sequence_solved||!o.sluice_crank_found||!cleared(state,'upper_control'))) return fail('INVALID_DUNGEON_STATE');
  const waterSolved=o.sluice_valve_inlet===0&&o.sluice_valve_outlet===1&&o.sluice_drain_mode>0;
  if (Boolean(o.sluice_bridge_open)!==waterSolved) return fail('INVALID_DUNGEON_STATE');
  if (o.sluice_store_open&&!o.sluice_bridge_open||o.sluice_bridge_open&&o.sluice_drain_mode===2&&!o.sluice_store_open) return fail('INVALID_DUNGEON_STATE');
  if ((state.world.region==='sluice_lower'||(state.world.visited??[]).includes('sluice_lower')||defeated(state,'sluice_lower').length>0||o.sluice_shortcut_open)&&!o.sluice_bridge_open) return fail('INVALID_DUNGEON_STATE');
  if (o.sluice_boss_awakened&&!cleared(state,'lower_antechamber')||cleared(state,'boss')&&!o.sluice_boss_awakened) return fail('INVALID_DUNGEON_STATE');
  if (DUNGEON_GROUPS.store.some(id=>defeated(state,'sluice_lower').includes(id))&&!o.sluice_store_open) return fail('INVALID_DUNGEON_STATE');
  if (hasReceipt(state,'r4:store')&&(!o.sluice_store_open||!cleared(state,'store'))) return fail('INVALID_DUNGEON_STATE');
  if (o.first_dungeon_cleared&&(!o.sluice_sequence_solved||!o.sluice_bridge_open||!cleared(state,'boss'))||o.adept_commission&&!o.first_dungeon_cleared) return fail('INVALID_DUNGEON_STATE');
  return {ok:true};
}

/** Caller passes an authored portal found in the current region, never user data. */
export function dungeonPortalAllowed(state,portal) {
  const valid=validateDungeonProgress(state); if(!valid.ok)return valid;
  if (!record(portal)) return fail('UNKNOWN_GATE');
  if (portal.gate===undefined||portal.gate===null) return {ok:true};
  const o=progress(state);
  if (portal.gate==='sluice_entry') return o.sluice_accepted===1&&hasTool(state,'sluice_key')?{ok:true}:fail('QUEST_REQUIRED');
  if (portal.gate==='sluice_bridge') return o.sluice_bridge_open===1?{ok:true}:fail('WATER_REQUIRED');
  if (portal.gate==='sluice_shortcut') return o.sluice_shortcut_open===1?{ok:true}:fail('SHORTCUT_REQUIRED');
  return fail('UNKNOWN_GATE');
}
function commandValid(command) {
  if (!jsonData(command)||!record(command)||!TYPES.includes(command.type)) return false;
  const required=['type','position','life','vitals',...(command.type==='interactDungeon'?['objectId']:[])];
  const allowed=[...required,'recovery',...(command.type==='interactDungeon'?['value']:[])];
  if (!required.every(key=>own(command,key))||Object.keys(command).some(key=>!allowed.includes(key))||!count(command.life)) return false;
  if (!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0)) return false;
  if (command.type==='interactDungeon'&&typeof command.objectId!=='string') return false;
  if(command.recovery!==undefined&&!validateRecovery(command.recovery))return false;
  return true;
}
function appendReceipt(next,id) {
  if (hasReceipt(next,id)) return fail('ALREADY_CLAIMED');
  if (next.world.claimedRewards.length>=MAX_RECEIPTS) return fail('RECEIPT_LIMIT');
  next.world.claimedRewards.push(id); return {ok:true};
}
function reward(next,id,events) {
  const receipt=appendReceipt(next,id);if(!receipt.ok)return receipt;
  const row=DUNGEON_REWARDS[id],gained=grantExperience(next.character,row.xp);if(!gained.ok)return gained;
  if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(next.stats.earnedXp+gained.appliedXp))return fail('VALUE_OVERFLOW');
  next.character=gained.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round((next.stats.earnedXp+gained.appliedXp)*1e6)/1e6;
  for(const [field,values] of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount] of Object.entries(values)){
    const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
  }
  if(gained.gainedLevels)events.push({type:'levelUp',levels:gained.gainedLevels});
  events.push({type:'dungeonReward',rewardId:id,xp:gained.appliedXp,gold:row.gold});return {ok:true};
}
function nearTarget(map,position,target) {
  if(!target||!near(position,target))return fail('OBJECT_REQUIRED');
  return lineOfSight(map,position,target)?{ok:true}:fail('WALL_BLOCKED');
}
function enterContext(state,command) {
  const valid=validateDungeonProgress(state);if(!valid.ok)return valid;
  if(!commandValid(command))return fail('INVALID_COMMAND');
  if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
  if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
  if(command.life!==(state.world.life??0))return fail('STALE_LIFE');
  if(!count(state.gold)||!record(state.stats)||!count(state.stats.earnedGold)||!count(state.stats.spentGold)||state.stats.earnedGold-state.stats.spentGold!==state.gold||!Number.isFinite(state.stats.earnedXp)||state.stats.earnedXp<0
    ||!record(state.inventory.materials)||!record(state.inventory.consumables)||![...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count))return fail('INVALID_DUNGEON_STATE');
  const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
  const region=getRegion(state.world.region),map=createMap(state.world.region,state);
  if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
  return {ok:true,region,map};
}
export function reduceDungeon(state,command) {
  const context=enterContext(state,command);if(!context.ok)return context;
  const next=clone(state),events=[],o=progress(next);let mapChanged=false;
  next.world.position={...command.position};next.vitals={...command.vitals};if(command.recovery!==undefined)next.recovery=recoveryFrom(command);
  if(command.type==='acceptSluiceQuest'||command.type==='reportSluiceQuest'){
    const elder=context.region.npcs.find(npc=>npc.id==='elder');
    if(state.world.region!=='ash_hamlet'||!elder||!near(command.position,elder))return fail('ELDER_REQUIRED');
    if(!lineOfSight(context.map,command.position,elder))return fail('WALL_BLOCKED');
    if(command.type==='acceptSluiceQuest'){
      if(o.sluice_accepted)return fail('ALREADY_ACCEPTED');
      if(!hasReceipt(next,'watch_patrol'))return fail('PATROL_REQUIRED');
      if(!hasReceipt(next,'chest:warden-cache')||!defeated(next,'ash_road').includes('road-warden'))return fail('WARDEN_CACHE_REQUIRED');
      const receipt=appendReceipt(next,'r4:accept');if(!receipt.ok)return receipt;
      Object.assign(o,DUNGEON_PROGRESS_DEFAULTS);next.inventory.tools.push('sluice_key');
      events.push({type:'dungeonAccepted'});
    }else{
      if(!o.first_dungeon_cleared)return fail('CORE_REQUIRED');
      const granted=reward(next,'r4:report',events);if(!granted.ok)return granted;o.adept_commission=1;
      events.push({type:'adeptCommission',promotionImplemented:true});
    }
  }else{
    if(!o.sluice_accepted)return fail('QUEST_REQUIRED');
    const object=context.region.objects.find(row=>row.type==='dungeon'&&row.id===command.objectId);
    if(!object)return fail('UNKNOWN_OBJECT');
    const nearby=nearTarget(context.map,command.position,object);if(!nearby.ok)return nearby;
    const valued=['inlet','outlet','flow'].includes(object.actionKind);
    if(valued?(!own(command,'value')||!Number.isInteger(command.value)||(object.actionKind==='flow'?![1,2].includes(command.value):![0,1].includes(command.value))):own(command,'value'))return fail('VALUE_REQUIRED');
    switch(object.actionKind){
      case 'record':o.sluice_record_read=1;events.push({type:'dungeonClue',text:'봉인판은 물결 → 톱니 → 불씨. 급수를 차단하고 배수를 연 뒤 방향을 고르세요.'});break;
      case 'crank':{
        if(o.sluice_crank_found)return fail('ALREADY_CLAIMED');
        const granted=reward(next,'r4:crank',events);if(!granted.ok)return granted;
        o.sluice_crank_found=1;next.inventory.tools.push('sluice_crank');break;
      }
      case 'rune':{
        if(o.sluice_sequence_solved)return fail('ALREADY_OPEN');
        if(!hasTool(next,'sluice_crank'))return fail('TOOL_REQUIRED');
        if(!cleared(next,'upper_guard'))return fail('GUARDS_ALIVE');
        if(object.rune!==o.sluice_rune_step){o.sluice_rune_step=0;events.push({type:'dungeonPuzzleReset',text:'순서가 맞지 않습니다. 물결부터 다시 조작하세요.'});break;}
        o.sluice_rune_step++;
        if(o.sluice_rune_step===3){const granted=reward(next,'r4:sequence',events);if(!granted.ok)return granted;o.sluice_sequence_solved=1;mapChanged=true;}
        break;
      }
      case 'inlet':case 'outlet':case 'flow':{
        if(!hasTool(next,'sluice_crank'))return fail('TOOL_REQUIRED');
        if(!o.sluice_sequence_solved)return fail('SEQUENCE_REQUIRED');
        if(!cleared(next,'upper_control'))return fail('CONTROL_GUARDS_ALIVE');
        if(o.sluice_bridge_open&&object.actionKind!=='flow')return fail('ALREADY_OPEN');
        if(object.actionKind==='inlet')o.sluice_valve_inlet=command.value;
        else if(object.actionKind==='outlet')o.sluice_valve_outlet=command.value;
        else o.sluice_drain_mode=command.value;
        if(o.sluice_valve_inlet===0&&o.sluice_valve_outlet===1&&o.sluice_drain_mode>0){
          if(!o.sluice_bridge_open){const granted=reward(next,'r4:water',events);if(!granted.ok)return granted;o.sluice_bridge_open=1;mapChanged=true;}
          if(o.sluice_drain_mode===2&&!o.sluice_store_open){o.sluice_store_open=1;mapChanged=true;}
        }
        break;
      }
      case 'lift':{
        if(!o.sluice_bridge_open)return fail('WATER_REQUIRED');
        if(!hasTool(next,'sluice_crank'))return fail('TOOL_REQUIRED');
        const receipt=appendReceipt(next,'r4:lift');if(!receipt.ok)return receipt;o.sluice_shortcut_open=1;mapChanged=true;break;
      }
      case 'bell':{
        if(!o.sluice_bridge_open)return fail('WATER_REQUIRED');
        if(!cleared(next,'lower_antechamber'))return fail('ANTECHAMBER_ALIVE');
        const receipt=appendReceipt(next,'r4:bell');if(!receipt.ok)return receipt;o.sluice_boss_awakened=1;mapChanged=true;break;
      }
      case 'core':{
        if(!cleared(next,'boss'))return fail('BOSS_ALIVE');
        if(!o.sluice_sequence_solved||!o.sluice_bridge_open)return fail('WATER_REQUIRED');
        const granted=reward(next,'r4:core',events);if(!granted.ok)return granted;o.first_dungeon_cleared=1;break;
      }
      case 'store':{
        if(!o.sluice_store_open)return fail('STORE_LOCKED');
        if(!cleared(next,'store'))return fail('STORE_GUARDS_ALIVE');
        const granted=reward(next,'r4:store',events);if(!granted.ok)return granted;break;
      }
      default:return fail('UNKNOWN_OBJECT');
    }
    events.push({type:'dungeonChanged',objectId:object.id,mapChanged});
  }
  const valid=validateDungeonProgress(next);return valid.ok?{ok:true,state:next,events}:valid;
}
