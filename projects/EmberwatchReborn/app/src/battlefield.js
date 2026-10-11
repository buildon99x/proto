import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {validateTombProgress} from './tomb.js';
import {mapFromRegion} from './world-geometry.js';
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_GROUPS,BATTLEFIELD_REWARDS,BATTLEFIELD_PROGRESS_DEFAULTS,BATTLEFIELD_RECEIPTS} from './battlefield-content.js';

export const BATTLEFIELD_COMMANDS=new Set(['acceptBattlefieldQuest','interactBattlefield','reportBattlefieldQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(BATTLEFIELD_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
const REASONS={
 INVALID_BATTLEFIELD_STATE:'전장 진행·봉화·보고 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'전장 입력 형식이 올바르지 않습니다.',
 EXPERT_REQUIRED:'묘실 보고 후 브란에게 실제 전문 승급을 완료해야 합니다.',TRAIN_FIRST:'기본 네 기술을 먼저 배우세요.',
 HERO_DOWN:'쓰러진 상태에서는 장치를 조작하거나 보고할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',
 STALE_REVISION:'이전 전장 화면의 입력입니다. 현재 목표를 다시 확인하세요.',REVISION_LIMIT:'전장 입력 기록 한도에 도달했습니다.',
 INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',ELDER_REQUIRED:'마을 촌장 에다 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 봉화 전장 의뢰를 수락했습니다.',QUEST_REQUIRED:'촌장 에다에게 봉화 전장 의뢰를 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 전장 장치가 아닙니다.',OBJECT_REQUIRED:'해당 전장 장치 가까이로 이동하세요.',
 WEST_GUARDS_ALIVE:'서쪽 중계기의 적 여섯 명을 먼저 처치하세요.',EAST_GUARDS_ALIVE:'동쪽 중계기의 적 여섯 명을 먼저 처치하세요.',
 DEVICES_REQUIRED:'양쪽 중계기를 모두 연결해야 합니다.',BOSS_REQUIRED:'봉화 탈취자를 먼저 처치하세요.',BEACON_REQUIRED:'보스 처치 후 단상의 봉화핵을 따로 회수하세요.',
 ALREADY_CLAIMED:'이미 완료하거나 보고한 전장 보상입니다.',UNKNOWN_GATE:'알 수 없는 전장 출입 조건입니다.',
 RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',
};
const fail=code=>({ok:false,code,reason:REASONS[code]??code});
function jsonData(value,parents=new Set(),depth=0,budget={left:250000}){
 if(--budget.left<0||depth>40)return false;
 if(value===null||typeof value==='boolean'||typeof value==='string')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value!=='object'||parents.has(value)||(!Array.isArray(value)&&!record(value))||Object.getOwnPropertySymbols(value).length)return false;
 const entries=Object.entries(Object.getOwnPropertyDescriptors(value)).filter(([key])=>!(Array.isArray(value)&&key==='length'));
 if(Array.isArray(value)&&(Object.getPrototypeOf(value)!==Array.prototype||entries.length!==value.length||entries.some(([key],index)=>key!==String(index))))return false;
 if(entries.some(([key,d])=>RESERVED.has(key)||!own(d,'value')||!d.enumerable))return false;
 parents.add(value);const valid=entries.every(([,d])=>jsonData(d.value,parents,depth+1,budget));parents.delete(value);return valid;
}
const list=(value,max=4096)=>Array.isArray(value)&&value.length<=max&&value.every(item=>typeof item==='string'&&item.length>0&&item.length<=100)&&new Set(value).size===value.length;
const has=(state,id)=>state.world.claimedRewards.includes(id);
const killed=state=>state.world.defeated?.[BATTLEFIELD_REGION]??[];
export const battlefieldGroupCleared=(state,group)=>own(BATTLEFIELD_GROUPS,group)&&BATTLEFIELD_GROUPS[group].every(id=>killed(state).includes(id));
// The real training receipt is necessary, and the full Tomb validator below
// checks its history. Neither level nor a commission alone permits entry.
export const battlefieldEligible=state=>state.character?.tier==='expert'&&state.world?.objectives?.tomb_reported===1&&state.world.objectives.expert_commission===1&&state.inventory?.tools?.includes('tomb_oath')&&['r5:promote:adept','r10:t:report','r10:promote:expert'].every(id=>state.world?.claimedRewards?.includes(id));
export const battlefieldInputRevision=state=>state.world?.objectives?.battlefield_revision??0;
export function battlefieldMap(state){return mapFromRegion(BATTLEFIELD_REGIONS[BATTLEFIELD_REGION],state.world.objectives);}
/** Travel invalidates panels without rewriting the controller store token. */
export function invalidateBattlefieldInput(next){
 if(!next.world.objectives.battlefield_accepted)return {ok:true};
 const revision=battlefieldInputRevision(next);if(!count(revision)||revision>=Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');
 next.world.objectives.battlefield_revision=revision+1;return {ok:true};
}
function economyValid(state){
 return count(state.gold)&&record(state.stats)&&['earnedGold','spentGold','kills','deaths'].every(key=>count(state.stats[key]))&&state.stats.earnedGold-state.stats.spentGold===state.gold&&Number.isFinite(state.stats.earnedXp)&&state.stats.earnedXp>=0&&state.stats.earnedXp<=Number.MAX_SAFE_INTEGER&&record(state.inventory.materials)&&record(state.inventory.consumables)&&[...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count);
}
function statePoolsValid(state){
 const w=state.world;if(!count(w.life)||typeof w.lifeDown!=='boolean'||!exact(w.position,['x','y'])||!Object.values(w.position).every(Number.isFinite)||!exact(state.vitals,['hp','mana','stamina']))return false;
 const derived=deriveStats(state.character,state);if(!derived.ok)return false;
 if(!Object.entries(state.vitals).every(([key,value])=>Number.isFinite(value)&&value>=0&&value<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]])||w.lifeDown!==(state.vitals.hp===0)||!validateRecovery(state.recovery,{character:state.character}))return false;
 const map=createMap(w.region,state);return !!map&&inMap(map,w.position.x,w.position.y);
}
/** B-owned invariants only. Parent validateState still owns the complete
 * character, equipment, legacy version, promotion and save-envelope checks. */
export function validateBattlefieldProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_BATTLEFIELD_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100)))||w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_BATTLEFIELD_STATE');
 const known=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION].foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('battlefield_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r11:b')&&!BATTLEFIELD_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('battlefield_')&&id!=='battlefield_beacon'))return fail('INVALID_BATTLEFIELD_STATE');
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r11:b'))||tools.includes('battlefield_beacon')||w.region===BATTLEFIELD_REGION||(w.visited??[]).includes(BATTLEFIELD_REGION)||own(w.defeated??{},BATTLEFIELD_REGION);
 if(!active)return {ok:true};
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=(key==='battlefield_revision'?Number.MAX_SAFE_INTEGER:1))||o.battlefield_revision<1||o.battlefield_accepted!==1||!battlefieldEligible(state)||!validateTombProgress(state).ok||!statePoolsValid(state)||!economyValid(state)||!(w.visited??[]).includes(w.region))return fail('INVALID_BATTLEFIELD_STATE');
 if((w.region===BATTLEFIELD_REGION||own(w.defeated??{},BATTLEFIELD_REGION)||FLAGS.some(key=>!['battlefield_accepted','battlefield_revision'].includes(key)&&o[key]))&&!(w.visited??[]).includes(BATTLEFIELD_REGION))return fail('INVALID_BATTLEFIELD_STATE');
 const pairs=[['battlefield_accepted','r11:b:accept'],['battlefield_west_ready','r11:b:west'],['battlefield_east_ready','r11:b:east'],['battlefield_beacon_taken','r11:b:beacon'],['battlefield_reported','r11:b:report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.battlefield_beacon_taken)!==tools.includes('battlefield_beacon')||Boolean(o.battlefield_reported)!==Boolean(o.chapter_three_complete))return fail('INVALID_BATTLEFIELD_STATE');
 if(Boolean(o.battlefield_devices_ready)!==Boolean(o.battlefield_west_ready&&o.battlefield_east_ready)||o.battlefield_west_ready&&!battlefieldGroupCleared(state,'west')||o.battlefield_east_ready&&!battlefieldGroupCleared(state,'east')||dead.includes(BATTLEFIELD_GROUPS.boss[0])&&!o.battlefield_devices_ready||o.battlefield_beacon_taken&&!battlefieldGroupCleared(state,'boss')||o.battlefield_reported&&!o.battlefield_beacon_taken)return fail('INVALID_BATTLEFIELD_STATE');
 if(o.battlefield_revision<pairs.reduce((sum,[flag])=>sum+o[flag],0))return fail('INVALID_BATTLEFIELD_STATE');
 return {ok:true};
}
export function battlefieldPortalAllowed(state,portal){
 const valid=validateBattlefieldProgress(state);if(!valid.ok)return valid;
 if(!jsonData(portal,new Set(),0,{left:1000})||!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['battlefield_entry','battlefield_boss_return'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!battlefieldEligible(state)||!validateTombProgress(state).ok)return fail('EXPERT_REQUIRED');
 if(!state.world.objectives.battlefield_accepted)return fail('QUEST_REQUIRED');
 if(state.world.lifeDown||state.vitals.hp<=0)return fail('HERO_DOWN');
 if(portal.gate==='battlefield_boss_return'&&!battlefieldGroupCleared(state,'boss'))return fail('BOSS_REQUIRED');
 return {ok:true};
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!BATTLEFIELD_COMMANDS.has(command.type))return false;
 const interaction=command.type==='interactBattlefield';
 if(!exact(command,['type','position','life','vitals','recovery','expectedRevision',...(interaction?['objectId']:[])])||!count(command.life)||!count(command.expectedRevision))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 return (!interaction||typeof command.objectId==='string'&&command.objectId.length>0&&command.objectId.length<=100)&&validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=BATTLEFIELD_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'battlefieldReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validateBattlefieldProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==state.world.life)return fail('STALE_LIFE');
 if(command.expectedRevision!==battlefieldInputRevision(state))return fail('STALE_REVISION');
 if(command.expectedRevision===Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');
 if(!battlefieldEligible(state))return fail('EXPERT_REQUIRED');
 if(!validateTombProgress(state).ok||!economyValid(state)||!statePoolsValid(state))return fail('INVALID_BATTLEFIELD_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=getRegion(state.world.region),map=createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!Object.entries(command.vitals).every(([key,value])=>value<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reduceBattlefield(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};next.recovery=recoveryFrom(command);
 if(command.type==='acceptBattlefieldQuest'||command.type==='reportBattlefieldQuest'){
  const elder=entered.region.npcs.find(npc=>npc.id==='elder');
  if(state.world.region!=='ash_hamlet'||!elder||!near(command.position,elder))return fail('ELDER_REQUIRED');
  if(!lineOfSight(entered.map,command.position,elder))return fail('WALL_BLOCKED');
  if(command.type==='acceptBattlefieldQuest'){
   if(o.battlefield_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r11:b:accept');if(!added.ok)return added;Object.assign(o,BATTLEFIELD_PROGRESS_DEFAULTS);
  }else{
   if(!o.battlefield_accepted)return fail('QUEST_REQUIRED');
   if(!o.battlefield_beacon_taken||!next.inventory.tools.includes('battlefield_beacon'))return fail('BEACON_REQUIRED');
   const added=reward(next,'r11:b:report',events);if(!added.ok)return added;o.battlefield_reported=1;o.chapter_three_complete=1;
   events.push({type:'chapterThreeCompleted'});
  }
 }else{
  if(!o.battlefield_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='battlefield'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  if(['west','east'].includes(object.actionKind)){
   const group=object.actionKind,flag='battlefield_'+group+'_ready';if(o[flag])return fail('ALREADY_CLAIMED');
   if(!battlefieldGroupCleared(next,group))return fail(group==='west'?'WEST_GUARDS_ALIVE':'EAST_GUARDS_ALIVE');
   const added=reward(next,'r11:b:'+group,events);if(!added.ok)return added;o[flag]=1;
   if(o.battlefield_west_ready&&o.battlefield_east_ready){o.battlefield_devices_ready=1;mapChanged=true;}
   events.push({type:'battlefieldDeviceReady',side:group,both:!!o.battlefield_devices_ready});
  }else if(object.actionKind==='beacon'){
   if(o.battlefield_beacon_taken)return fail('ALREADY_CLAIMED');if(!o.battlefield_devices_ready)return fail('DEVICES_REQUIRED');if(!battlefieldGroupCleared(next,'boss'))return fail('BOSS_REQUIRED');
   if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
   const added=reward(next,'r11:b:beacon',events);if(!added.ok)return added;
   next.inventory.tools.push('battlefield_beacon');o.battlefield_beacon_taken=1;events.push({type:'battlefieldBeaconTaken'});
  }else return fail('UNKNOWN_OBJECT');
 }
 o.battlefield_revision=command.expectedRevision+1;
 events.push({type:'battlefieldChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validateBattlefieldProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
