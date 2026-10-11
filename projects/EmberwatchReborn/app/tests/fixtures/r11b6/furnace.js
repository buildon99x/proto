import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {validateSignalProgress} from './signal.js';
import {mapFromRegion} from './world-geometry.js';
import {FURNACE_REGION,FURNACE_REGIONS,FURNACE_GROUPS,FURNACE_REWARDS,FURNACE_PROGRESS_DEFAULTS,FURNACE_RECEIPTS,FURNACE_MODES} from './furnace-content.js';

export const FURNACE_COMMANDS=new Set(['acceptFurnaceQuest','interactFurnace','reportFurnaceQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(FURNACE_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
// Future Expert/Master support must widen every predecessor's tier guard along
// with genuine training/skill support; a high level alone never changes tier.
export const furnaceTierAllowed=tier=>tier==='adept'||tier==='expert';
const REASONS={
 INVALID_FURNACE_STATE:'용광로 진행 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'용광로 입력 형식이 올바르지 않습니다.',
 TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.',ADEPT_REQUIRED:'숙련 승급과 신호 복원 후 오린 보고가 필요합니다.',
 HERO_DOWN:'쓰러진 상태에서는 용광로 장치를 조작할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',
 BLACKSMITH_REQUIRED:'마을 대장장이 오린 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 용광로 수리를 수락했습니다.',QUEST_REQUIRED:'대장장이 오린에게 용광로 수리를 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 용광로 장치가 아닙니다.',OBJECT_REQUIRED:'해당 용광로 장치 가까이로 이동하세요.',
 COOLING_GUARDS_ALIVE:'냉각 앞마당의 적 다섯 명을 먼저 처치하세요.',COOLING_REQUIRED:'냉각 장치에서 엄폐판 유지 또는 중앙 통로 개방을 선택하세요.',
 EXHAUST_GUARDS_ALIVE:'작업 고리의 적 여섯 명을 먼저 처치하세요.',EXHAUST_REQUIRED:'작업 고리의 배기 장치를 먼저 여세요.',
 IGNITION_GUARDS_ALIVE:'용광로의 적 열일곱 명을 모두 처치하세요.',IGNITION_REQUIRED:'북쪽 점화 장치를 먼저 작동하세요.',
 LENS_REQUIRED:'점화 후 북동쪽의 용광로 렌즈를 따로 회수하고 오린에게 보고하세요.',
 ALREADY_CLAIMED:'이미 완료하거나 보고한 용광로 보상입니다.',ALREADY_OPEN:'이미 연결한 장치입니다.',
 SHORTCUT_REQUIRED:'냉각 후 입구 동쪽의 화물 승강기를 먼저 연결하세요.',UNKNOWN_GATE:'알 수 없는 용광로 출입 조건입니다.',
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
const killed=state=>state.world.defeated?.[FURNACE_REGION]??[];
const cleared=(state,group)=>FURNACE_GROUPS[group].every(id=>killed(state).includes(id));
const eligible=state=>furnaceTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.signal_reported===1&&state.inventory.tools.includes('signal_cipher')&&['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report'].every(id=>has(state,id));

export function furnaceMap(state){return mapFromRegion(FURNACE_REGIONS[FURNACE_REGION],state.world.objectives);}
function statePoolsValid(state){
 const w=state.world;
 if(!count(w.life)||typeof w.lifeDown!=='boolean'||!exact(w.position,['x','y'])||!Object.values(w.position).every(Number.isFinite)||!exact(state.vitals,['hp','mana','stamina']))return false;
 const derived=deriveStats(state.character,state);if(!derived.ok)return false;
 if(!Object.entries(state.vitals).every(([key,value])=>Number.isFinite(value)&&value>=0&&value<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]])||w.lifeDown!==(state.vitals.hp===0))return false;
 if(state.recovery!==undefined&&!validateRecovery(state.recovery,{legacy:state.version<3,version:state.version<4?1:2,character:state.character}))return false;
 const map=w.region===FURNACE_REGION?furnaceMap(state):createMap(w.region,state);
 return !!map&&inMap(map,w.position.x,w.position.y);
}
function economyValid(state){
 return count(state.gold)&&record(state.stats)&&['earnedGold','spentGold','kills','deaths'].every(key=>count(state.stats[key]))&&state.stats.earnedGold-state.stats.spentGold===state.gold&&Number.isFinite(state.stats.earnedXp)&&state.stats.earnedXp>=0&&state.stats.earnedXp<=Number.MAX_SAFE_INTEGER&&record(state.inventory.materials)&&record(state.inventory.consumables)&&[...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count);
}
/** F-owned invariants. Untouched older saves are read-only and get no defaults.
 * The runtime still validates character, equipment and the complete save. */
export function validateFurnaceProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_FURNACE_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100))))return fail('INVALID_FURNACE_STATE');
 if(w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_FURNACE_STATE');
 const known=FURNACE_REGIONS[FURNACE_REGION].foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('furnace_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r9:f')&&!FURNACE_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('furnace_')&&id!=='furnace_lens'))return fail('INVALID_FURNACE_STATE');
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r9:f'))||tools.includes('furnace_lens')||w.region===FURNACE_REGION||(w.visited??[]).includes(FURNACE_REGION)||own(w.defeated??{},FURNACE_REGION);
 if(!active)return {ok:true};
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=(key==='furnace_mode'?2:1))||!eligible(state)||!validateSignalProgress(state).ok||o.furnace_accepted!==1)return fail('INVALID_FURNACE_STATE');
 if(!statePoolsValid(state)||!(w.visited??[]).includes(w.region)||!economyValid(state))return fail('INVALID_FURNACE_STATE');
 if((w.region===FURNACE_REGION||own(w.defeated??{},FURNACE_REGION)||FLAGS.some(key=>key!=='furnace_accepted'&&o[key]))&&!(w.visited??[]).includes(FURNACE_REGION))return fail('INVALID_FURNACE_STATE');
 const pairs=[['furnace_accepted','r9:f:accept'],['furnace_cooled','r9:f:cooling'],['furnace_exhausted','r9:f:exhaust'],['furnace_ignited','r9:f:ignition'],['furnace_lens_taken','r9:f:lens'],['furnace_shortcut_open','r9:f:shortcut'],['furnace_reported','r9:f:report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.furnace_lens_taken)!==tools.includes('furnace_lens'))return fail('INVALID_FURNACE_STATE');
 if(Boolean(o.furnace_mode)!==Boolean(o.furnace_cooled)||Boolean(o.furnace_center_open)!==(o.furnace_mode===FURNACE_MODES.channel.value))return fail('INVALID_FURNACE_STATE');
 if(o.furnace_cooled&&!cleared(state,'cooling')||FURNACE_GROUPS.exhaust.some(id=>dead.includes(id))&&!o.furnace_cooled)return fail('INVALID_FURNACE_STATE');
 if(o.furnace_exhausted&&(!o.furnace_cooled||!cleared(state,'exhaust'))||FURNACE_GROUPS.ignition.some(id=>dead.includes(id))&&!o.furnace_exhausted)return fail('INVALID_FURNACE_STATE');
 if(o.furnace_ignited&&(!o.furnace_exhausted||!Object.keys(FURNACE_GROUPS).every(group=>cleared(state,group)))||o.furnace_lens_taken&&!o.furnace_ignited||o.furnace_shortcut_open&&!o.furnace_cooled||o.furnace_reported&&(!o.furnace_ignited||!o.furnace_lens_taken))return fail('INVALID_FURNACE_STATE');
 return {ok:true};
}
export function furnacePortalAllowed(state,portal){
 const valid=validateFurnaceProgress(state);if(!valid.ok)return valid;
 if(!jsonData(portal,new Set(),0,{left:1000})||!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['furnace_entry','furnace_shortcut'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!state.world.objectives.furnace_accepted)return fail('QUEST_REQUIRED');
 if(state.world.lifeDown||state.vitals.hp<=0)return fail('HERO_DOWN');
 return portal.gate==='furnace_entry'||state.world.objectives.furnace_shortcut_open===1?{ok:true}:fail('SHORTCUT_REQUIRED');
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!FURNACE_COMMANDS.has(command.type))return false;
 const interaction=command.type==='interactFurnace',cooling=interaction&&command.objectId==='furnace-cooling';
 const keys=['type','position','life','vitals',...(interaction?['objectId']:[]),...(cooling?['choice']:[])];
 if(!keys.every(key=>own(command,key))||Object.keys(command).some(key=>![...keys,'recovery'].includes(key))||!count(command.life))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 if(interaction&&(typeof command.objectId!=='string'||command.objectId.length>100||!command.objectId.length))return false;
 if(cooling&&(typeof command.choice!=='string'||!own(FURNACE_MODES,command.choice)))return false;
 return command.recovery===undefined||validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');
 if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=FURNACE_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;
 if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'furnaceReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validateFurnaceProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==state.world.life)return fail('STALE_LIFE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!validateSignalProgress(state).ok||!economyValid(state)||!statePoolsValid(state))return fail('INVALID_FURNACE_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=state.world.region===FURNACE_REGION?FURNACE_REGIONS[FURNACE_REGION]:getRegion(state.world.region),map=state.world.region===FURNACE_REGION?furnaceMap(state):createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reduceFurnace(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};if(command.recovery!==undefined)next.recovery=recoveryFrom(command);
 if(command.type==='acceptFurnaceQuest'||command.type==='reportFurnaceQuest'){
  const smith=entered.region.npcs.find(npc=>npc.id==='blacksmith');
  if(state.world.region!=='ash_hamlet'||!smith||!near(command.position,smith))return fail('BLACKSMITH_REQUIRED');
  if(!lineOfSight(entered.map,command.position,smith))return fail('WALL_BLOCKED');
  if(command.type==='acceptFurnaceQuest'){
   if(o.furnace_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r9:f:accept');if(!added.ok)return added;
   Object.assign(o,FURNACE_PROGRESS_DEFAULTS);
  }else{
   if(!o.furnace_accepted)return fail('QUEST_REQUIRED');
   if(!o.furnace_ignited)return fail('IGNITION_REQUIRED');
   if(!o.furnace_lens_taken||!next.inventory.tools.includes('furnace_lens'))return fail('LENS_REQUIRED');
   const added=reward(next,'r9:f:report',events);if(!added.ok)return added;o.furnace_reported=1;
  }
 }else{
  if(!o.furnace_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='furnace'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');
  if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  switch(object.actionKind){
   case 'cooling':{
    if(o.furnace_cooled)return fail('ALREADY_CLAIMED');
    if(!cleared(next,'cooling'))return fail('COOLING_GUARDS_ALIVE');
    const added=reward(next,'r9:f:cooling',events);if(!added.ok)return added;
    o.furnace_cooled=1;o.furnace_mode=FURNACE_MODES[command.choice].value;o.furnace_center_open=Number(command.choice==='channel');mapChanged=true;
    events.push({type:'furnaceModeChosen',mode:command.choice});break;
   }
   case 'exhaust':{
    if(o.furnace_exhausted)return fail('ALREADY_CLAIMED');
    if(!o.furnace_cooled)return fail('COOLING_REQUIRED');
    if(!cleared(next,'exhaust'))return fail('EXHAUST_GUARDS_ALIVE');
    const added=reward(next,'r9:f:exhaust',events);if(!added.ok)return added;o.furnace_exhausted=1;mapChanged=true;break;
   }
   case 'ignition':{
    if(o.furnace_ignited)return fail('ALREADY_CLAIMED');
    if(!o.furnace_exhausted)return fail('EXHAUST_REQUIRED');
    if(!Object.keys(FURNACE_GROUPS).every(group=>cleared(next,group)))return fail('IGNITION_GUARDS_ALIVE');
    const added=reward(next,'r9:f:ignition',events);if(!added.ok)return added;o.furnace_ignited=1;break;
   }
   case 'lens':{
    if(o.furnace_lens_taken)return fail('ALREADY_CLAIMED');
    if(!o.furnace_ignited)return fail('IGNITION_REQUIRED');
    if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
    const added=receipt(next,'r9:f:lens');if(!added.ok)return added;
    next.inventory.tools.push('furnace_lens');o.furnace_lens_taken=1;events.push({type:'furnaceLensTaken'});break;
   }
   case 'shortcut':{
    if(o.furnace_shortcut_open)return fail('ALREADY_OPEN');
    if(!o.furnace_cooled)return fail('COOLING_REQUIRED');
    const added=receipt(next,'r9:f:shortcut');if(!added.ok)return added;o.furnace_shortcut_open=1;mapChanged=true;break;
   }
   default:return fail('UNKNOWN_OBJECT');
  }
 }
 events.push({type:'furnaceChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validateFurnaceProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
