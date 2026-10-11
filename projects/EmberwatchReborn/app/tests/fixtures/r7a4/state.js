import {validateRecovery,recoveryFrom} from './recovery.js';
import {validatePromotion,promoteAdept} from './promotion.js';
import {DUNGEON_COMMANDS,reduceDungeon,validateDungeonProgress} from './dungeon.js';
import {QUARRY_COMMANDS,reduceQuarry,validateQuarryProgress} from './quarry.js';
import {PASS_COMMANDS,reducePass,validatePassProgress} from './pass.js';
import {validateEquipmentState} from './equipment.js';
import {EQUIPMENT_REVISION} from './equipment-content.js';
import {reduceEquipmentRuntime} from './equipment-runtime.js';
import {controlPreset,validateControls,migrateControls} from './controls.js';
import {createCharacter, validateCharacter, grantExperience, allocateAttribute} from './progression.js';
import {validateWarriorGrowth, deriveStats} from './warrior-growth.js';
import {CAMPAIGN_COMMANDS, reduceCampaign} from './campaign.js';
import {getRegion,createMap,inMap,findEnemy,near} from './world.js';

export const STATE_SCHEMA = 'emberwatch.reborn.reimplementation';
export const STATE_VERSION = 3;
export const DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard', 'serious']);
export const MAX_RECEIPTS = 4096;
const record = x => !!x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
const integer = (x, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(x) && x >= 0 && x <= max;
export const clone = x => JSON.parse(JSON.stringify(x));
const fail = (code, reason) => ({ok: false, code, reason});

export function jsonSafe(value, ancestors = new Set(), depth = 0) {
  if (depth > 64) return false;
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || ancestors.has(value)) return false;
  if (!Array.isArray(value) && !record(value)) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  const entries = Object.entries(Object.getOwnPropertyDescriptors(value)).filter(([key]) => !(Array.isArray(value) && key === 'length'));
  if (Array.isArray(value) && (Object.getPrototypeOf(value) !== Array.prototype || entries.length !== value.length || entries.some(([key], index) => key !== String(index)))) return false;
  if (entries.some(([, descriptor]) => !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable)) return false;
  ancestors.add(value);
  const valid = entries.every(([, descriptor]) => jsonSafe(descriptor.value, ancestors, depth + 1));
  ancestors.delete(value);
  return valid;
}
const stringList = (x, max = MAX_RECEIPTS) => Array.isArray(x) && x.length <= max && x.every(y => typeof y === 'string' && y.length > 0 && y.length <= 100) && new Set(x).size === x.length;

export function createState({difficulty = 'normal'} = {}) {
  if (!DIFFICULTIES.includes(difficulty)) throw new Error('Unsupported difficulty');
  return {
    schema: STATE_SCHEMA, version: STATE_VERSION, character: createCharacter(), difficulty,
    equipmentProgress:{version:EQUIPMENT_REVISION,receipts:[],claimedAwards:[]},
    gold: 0, inventory: {materials: {}, consumables: {}, equipmentInstances: [], tools: []},
    world: {region: 'ash_hamlet', visited: ['ash_hamlet'], objectives: {}, claimedRewards: []},
    stats: {kills: 0, deaths: 0, earnedGold: 0, spentGold: 0, earnedXp: 0},
    options: {masterVolume: 0.7, screenShake: 0.5, flashes: 0.5, controls: controlPreset('recommended')},
  };
}

export function validateState(state) {
  if (!jsonSafe(state) || !record(state) || state.schema !== STATE_SCHEMA || ![1,2,STATE_VERSION].includes(state.version)) return fail('INVALID_STATE', 'Reborn 저장 형식이 올바르지 않습니다.');
  const character = validateCharacter(state.character);
  if (!character.ok) return character;
  const growth = validateWarriorGrowth(state.character,state);
  if (!growth.ok) return growth;
  if(state.version===1&&(state.equipmentProgress!==undefined||state.inventory?.equipmentInstances?.length||Object.values(state.character.equipment).some(x=>x!==null)))return fail('INVALID_LEGACY_EQUIPMENT','구버전 장비 상태는 자동 복원하지 않습니다.');
  if(state.version>=2&&!record(state.equipmentProgress))return fail('INVALID_EQUIPMENT_PROGRESS','장비 이력 필드가 필요합니다.');
  if (!DIFFICULTIES.includes(state.difficulty) || !integer(state.gold)) return fail('INVALID_ECONOMY', '난이도 또는 금화가 올바르지 않습니다.');
  const i = state.inventory, w = state.world, s = state.stats, o = state.options;
  if (!record(i) || !record(i.materials) || !record(i.consumables) || !Object.values(i.materials).every(x => integer(x)) || !Object.values(i.consumables).every(x => integer(x)) || !Array.isArray(i.equipmentInstances) || !stringList(i.tools, 100)) return fail('INVALID_INVENTORY', '소지품이 올바르지 않습니다.');
  const equipment=validateEquipmentState(state);if(!equipment.ok)return equipment;
  if (!record(w) || typeof w.region !== 'string' || !stringList(w.visited, 200) || !w.visited.includes(w.region) || !record(w.objectives) || Object.keys(w.objectives).length > 500 || !Object.values(w.objectives).every(x => integer(x)) || !stringList(w.claimedRewards)) return fail('INVALID_WORLD', '세계 진행이 올바르지 않습니다.');
  if (!record(s) || !['kills', 'deaths', 'earnedGold', 'spentGold'].every(k => integer(s[k])) || !Number.isFinite(s.earnedXp) || s.earnedXp < 0 || s.earnedGold - s.spentGold !== state.gold) return fail('INVALID_LEDGER', '수입과 지출 기록이 일치하지 않습니다.');
  if (!record(o) || !['masterVolume', 'screenShake', 'flashes'].every(k => Number.isFinite(o[k]) && o[k] >= 0 && o[k] <= 1)) return fail('INVALID_OPTIONS', '화면과 음량 설정이 올바르지 않습니다.');
  if (o.controls !== undefined && !validateControls(o.controls).ok) return fail('INVALID_CONTROLS', validateControls(o.controls).reason);
  if (!getRegion(w.region)) return fail('UNKNOWN_REGION', '알 수 없는 지역입니다.');
  if (state.recovery !== undefined && !validateRecovery(state.recovery,{legacy:state.version<3,character:state.character})) return fail('INVALID_RECOVERY', '재사용 대기 상태가 올바르지 않습니다.');
  if (w.defeated !== undefined && (!record(w.defeated) || !Object.entries(w.defeated).every(([id, ids]) => getRegion(id) && stringList(ids, 100) && ids.every(enemyId => findEnemy(id, enemyId))))) return fail('INVALID_ENCOUNTER', '처치 기록이 올바르지 않습니다.');
  if (w.life !== undefined && !integer(w.life)) return fail('INVALID_LIFE', '재도전 기록이 올바르지 않습니다.');
  if (w.lifeDown !== undefined && typeof w.lifeDown !== 'boolean') return fail('INVALID_LIFE', '생존 기록이 올바르지 않습니다.');
  if (w.position !== undefined && (!record(w.position) || !getRegion(w.region) || !inMap(createMap(w.region,state), w.position.x, w.position.y))) return fail('INVALID_POSITION', '저장 위치가 올바르지 않습니다.');
  if (state.vitals !== undefined) {
    const derived = deriveStats(state.character,state);
    if (!growth.starterTrained || !derived.ok || !record(state.vitals) || !['hp', 'mana', 'stamina'].every(k => Number.isFinite(state.vitals[k]) && state.vitals[k] >= 0 && state.vitals[k] <= derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]])) return fail('INVALID_VITALS', '자원 상태가 올바르지 않습니다.');
  }
  const dungeon=validateDungeonProgress(state);if(!dungeon.ok)return dungeon;
  const quarry=validateQuarryProgress(state);if(!quarry.ok)return quarry;
  const pass=validatePassProgress(state);if(!pass.ok)return pass;
  if(state.version<3&&(state.character.tier!=='apprentice'||state.options.controls?.version===2))return fail('INVALID_LEGACY_VERSION','구버전에 존재하지 않던 승급·입력은 복원하지 않습니다.');
  const promotion=validatePromotion(state);if(!promotion.ok)return promotion;
  return {ok: true};
}

// Pure validated migration; controller load never writes the older slots.
export function migrateState(state){
 const valid=validateState(state);if(!valid.ok)throw new Error(valid.reason);
 const next=clone(state);if(next.version===1)next.equipmentProgress={version:EQUIPMENT_REVISION,receipts:[],claimedAwards:[]};
 next.version=STATE_VERSION;if(next.options.controls)next.options.controls=migrateControls(next.options.controls);
 if(next.recovery)next.recovery=recoveryFrom(next);return next;
}

// Authored Emberwatch rewards, not Hammerwatch 2 source facts. R1 has no
// combat/quest UI; objective completion will come from the R2 combat handler.
export const REWARDS = Object.freeze({
  watch_patrol: Object.freeze({objective: 'patrol_scouts', required: 6, xp: 70, gold: 20, materials: Object.freeze({iron: 1})}),
});
export function reduceRuntime(state, command) {
  const valid = validateState(state);
  if (!valid.ok) return valid;
  if (!jsonSafe(command) || !record(command) || typeof command.type !== 'string') return fail('INVALID_COMMAND', '지원하지 않는 입력입니다.');
  state=migrateState(state);
  if(command.type==='promoteAdept'){const r=promoteAdept(state,command);if(!r.ok)return r;const v=validateState(r.state);return v.ok?r:v;}
  if(DUNGEON_COMMANDS.has(command.type)){const result=reduceDungeon(state,command);if(!result.ok)return result;const check=validateState(result.state);return check.ok?result:check;}
  if(PASS_COMMANDS.has(command.type)){const result=reducePass(state,command);if(!result.ok)return result;const check=validateState(result.state);return check.ok?result:check;}
  if(QUARRY_COMMANDS.has(command.type)){const result=reduceQuarry(state,command);if(!result.ok)return result;const check=validateState(result.state);return check.ok?result:check;}
  if(command.type==='equipment'){const result=reduceEquipmentRuntime(state,command);if(!result.ok)return result;const check=validateState(result.state);return check.ok?result:check;}
  if (CAMPAIGN_COMMANDS.has(command.type)) {
    const result = reduceCampaign(state, command);
    if (!result.ok) return result;
    const check = validateState(result.state);
    return check.ok ? result : check;
  }
  const next = clone(state);
  const events = [];
  switch (command.type) {
    case 'allocateAttribute': {
      const result = allocateAttribute(next.character, command.attribute, command.amount ?? 1);
      if (!result.ok) return result;
      next.character = result.character;
      events.push({type: 'attributeAllocated', attribute: command.attribute, amount: result.spent});
      break;
    }
    case 'claimReward': {
      if (next.vitals && (!next.world.objectives.patrol_accepted || !getRegion(next.world.region).npcs.some(n => n.id === 'elder' && near(command.position, n)))) return fail('ELDER_REQUIRED', '촌장 가까이에서 의뢰 결과를 보고하세요.');
      const reward = Object.hasOwn(REWARDS, command.rewardId) ? REWARDS[command.rewardId] : null;
      if (!reward) return fail('UNKNOWN_REWARD', '알 수 없는 보상입니다.');
      if (next.world.claimedRewards.includes(command.rewardId)) return fail('ALREADY_CLAIMED', '이미 받은 보상입니다.');
      if ((next.world.objectives[reward.objective] ?? 0) < reward.required) return fail('OBJECTIVE_INCOMPLETE', '먼저 목표를 달성하세요.');
      if (next.world.claimedRewards.length >= MAX_RECEIPTS) return fail('RECEIPT_LIMIT', '보상 기록 한도에 도달했습니다. 기록을 지우지 않고 중단합니다.');
      const gained = grantExperience(next.character, reward.xp);
      if (!gained.ok) return gained;
      next.character = gained.character;
      next.gold += reward.gold;
      next.stats.earnedGold += reward.gold;
      next.stats.earnedXp += gained.appliedXp;
      for (const [key, count] of Object.entries(reward.materials)) next.inventory.materials[key] = (next.inventory.materials[key] ?? 0) + count;
      next.world.claimedRewards.push(command.rewardId);
      events.push({type: 'rewardClaimed', rewardId: command.rewardId, xp: gained.appliedXp, gold: reward.gold, levels: gained.gainedLevels});
      break;
    }
    case 'setControls': {
      const controls = validateControls(command.controls);
      if (!controls.ok) return fail('INVALID_CONTROLS', controls.reason);
      next.options.controls = migrateControls(command.controls);
      events.push({type:'controlsChanged'});
      break;
    }
    case 'setOption': {
      if (!['masterVolume', 'screenShake', 'flashes'].includes(command.option) || !Number.isFinite(command.value) || command.value < 0 || command.value > 1) return fail('INVALID_OPTION', '설정은 0부터 1 사이여야 합니다.');
      next.options[command.option] = command.value;
      events.push({type: 'optionChanged', option: command.option, value: command.value});
      break;
    }
    default: return fail('UNKNOWN_COMMAND', '아직 구현되지 않은 동작입니다.');
  }
  const result = validateState(next);
  return result.ok ? {ok: true, state: next, events} : result;
}
