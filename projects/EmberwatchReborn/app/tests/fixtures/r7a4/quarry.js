import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {QUARRY_REGIONS,QUARRY_GROUPS,QUARRY_REWARDS,QUARRY_PROGRESS_DEFAULTS,QUARRY_RECEIPTS} from './quarry-content.js';

export const QUARRY_COMMANDS=new Set(['acceptQuarryQuest','interactQuarry','reportQuarryQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(QUARRY_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
const REASONS={
 INVALID_QUARRY_STATE:'채석장 진행 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'채석장 입력 형식이 올바르지 않습니다.',
 TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.',ADEPT_REQUIRED:'수문소 보고를 마치고 브란에게 숙련 승급을 받으세요.',
 HERO_DOWN:'쓰러진 상태에서는 채석장 조사를 진행할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',
 ELDER_REQUIRED:'마을 촌장 에다 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 채석장 조사를 수락했습니다.',QUEST_REQUIRED:'촌장 에다에게 채석장 조사를 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 채석장 장치가 아닙니다.',OBJECT_REQUIRED:'해당 채석장 장치 가까이로 이동하세요.',
 ENTRY_GUARDS_ALIVE:'입구의 적 네 명을 먼저 처치하세요.',TOOL_REQUIRED:'입구의 채석 곡괭이를 먼저 회수하세요.',
 RESCUE_GUARDS_ALIVE:'구조 구역의 적 네 명을 먼저 처치하세요.',RESCUE_REQUIRED:'매몰 광부를 먼저 구조하세요.',
 WINCH_GUARDS_ALIVE:'상부 운반장 적 네 명을 먼저 처치하세요.',ANCHORS_REQUIRED:'서쪽과 동쪽의 운반 닻을 모두 고정하세요.',
 WINCH_REQUIRED:'상부 광석 운반기를 수리한 뒤 촌장 에다에게 보고하세요.',ALREADY_CLAIMED:'이미 완료하거나 보고한 채석장 보상입니다.',
 ALREADY_OPEN:'이미 연결한 장치입니다.',SHORTCUT_REQUIRED:'구조 구역의 귀환 승강기 체인을 먼저 연결하세요.',
 UNKNOWN_GATE:'알 수 없는 채석장 출입 조건입니다.',RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',
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
const killed=state=>state.world.defeated?.ember_quarry??[];
const cleared=(state,group)=>QUARRY_GROUPS[group].every(id=>killed(state).includes(id));
const eligible=state=>state.character?.tier==='adept'&&state.world.objectives.adept_commission===1&&has(state,'r4:report')&&has(state,'r5:promote:adept');

/** Quarry-owned invariants only; the parent validates the complete save. */
export function validateQuarryProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_QUARRY_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100))))return fail('INVALID_QUARRY_STATE');
 if(w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_QUARRY_STATE');
 const known=QUARRY_REGIONS.ember_quarry.foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('quarry_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r6:q')&&!QUARRY_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('quarry_')&&id!=='quarry_pick'))return fail('INVALID_QUARRY_STATE');
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r6:q'))||tools.includes('quarry_pick')||w.region==='ember_quarry'||(w.visited??[]).includes('ember_quarry')||own(w.defeated??{},'ember_quarry');
 if(!active)return {ok:true}; // Untouched v1/v2/v3 saves have no quarry records.
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=1)||!eligible(state)||o.quarry_accepted!==1)return fail('INVALID_QUARRY_STATE');
 if((dead.length||FLAGS.some(key=>key!=='quarry_accepted'&&o[key]))&&!(w.visited??[]).includes('ember_quarry'))return fail('INVALID_QUARRY_STATE');
 const pairs=[['quarry_accepted','r6:q:accept'],['quarry_tool_found','r6:q:tool'],['quarry_rescue_complete','r6:q:rescue'],['quarry_anchor_a','r6:q:anchor-a'],['quarry_anchor_b','r6:q:anchor-b'],['quarry_winch_repaired','r6:q:winch'],['quarry_shortcut_open','r6:q:shortcut'],['quarry_reported','r6:q:report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.quarry_tool_found)!==tools.includes('quarry_pick'))return fail('INVALID_QUARRY_STATE');
 if(o.quarry_tool_found&&!cleared(state,'entry')||QUARRY_GROUPS.rescue.some(id=>dead.includes(id))&&!o.quarry_tool_found)return fail('INVALID_QUARRY_STATE');
 if(o.quarry_rescue_complete&&(!o.quarry_tool_found||!cleared(state,'rescue'))||QUARRY_GROUPS.winch.some(id=>dead.includes(id))&&!o.quarry_rescue_complete)return fail('INVALID_QUARRY_STATE');
 if((o.quarry_anchor_a||o.quarry_anchor_b)&&(!o.quarry_rescue_complete||!cleared(state,'winch')))return fail('INVALID_QUARRY_STATE');
 if(o.quarry_winch_repaired&&(!o.quarry_anchor_a||!o.quarry_anchor_b||!cleared(state,'winch'))||o.quarry_shortcut_open&&!o.quarry_rescue_complete||o.quarry_reported&&!o.quarry_winch_repaired)return fail('INVALID_QUARRY_STATE');
 return {ok:true};
}
export function quarryPortalAllowed(state,portal){
 const valid=validateQuarryProgress(state);if(!valid.ok)return valid;
 if(!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['quarry_entry','quarry_shortcut'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!state.world.objectives.quarry_accepted)return fail('QUEST_REQUIRED');
 return portal.gate==='quarry_entry'||state.world.objectives.quarry_shortcut_open===1?{ok:true}:fail('SHORTCUT_REQUIRED');
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!QUARRY_COMMANDS.has(command.type))return false;
 const keys=['type','position','life','vitals',...(command.type==='interactQuarry'?['objectId']:[])];
 if(!keys.every(key=>own(command,key))||Object.keys(command).some(key=>![...keys,'recovery'].includes(key))||!count(command.life))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 if(command.type==='interactQuarry'&&(typeof command.objectId!=='string'||command.objectId.length>100||!command.objectId.length))return false;
 return command.recovery===undefined||validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');
 if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=QUARRY_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;
 if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'quarryReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validateQuarryProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==(state.world.life??0))return fail('STALE_LIFE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!count(state.gold)||!record(state.stats)||!count(state.stats.earnedGold)||!count(state.stats.spentGold)||state.stats.earnedGold-state.stats.spentGold!==state.gold||!Number.isFinite(state.stats.earnedXp)||state.stats.earnedXp<0||!record(state.inventory.materials)||!record(state.inventory.consumables)||![...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count))return fail('INVALID_QUARRY_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=getRegion(state.world.region),map=createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reduceQuarry(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};if(command.recovery!==undefined)next.recovery=recoveryFrom(command);
 if(command.type==='acceptQuarryQuest'||command.type==='reportQuarryQuest'){
  const elder=entered.region.npcs.find(npc=>npc.id==='elder');
  if(state.world.region!=='ash_hamlet'||!elder||!near(command.position,elder))return fail('ELDER_REQUIRED');
  if(!lineOfSight(entered.map,command.position,elder))return fail('WALL_BLOCKED');
  if(command.type==='acceptQuarryQuest'){
   if(o.quarry_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r6:q:accept');if(!added.ok)return added;
   Object.assign(o,QUARRY_PROGRESS_DEFAULTS);mapChanged=true;
  }else{
   if(!o.quarry_accepted)return fail('QUEST_REQUIRED');
   if(!o.quarry_winch_repaired)return fail('WINCH_REQUIRED');
   const added=reward(next,'r6:q:report',events);if(!added.ok)return added;o.quarry_reported=1;
  }
 }else{
  if(!o.quarry_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='quarry'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');
  if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  switch(object.actionKind){
   case 'tool':{
    if(o.quarry_tool_found)return fail('ALREADY_CLAIMED');
    if(!cleared(next,'entry'))return fail('ENTRY_GUARDS_ALIVE');
    if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
    const added=reward(next,'r6:q:tool',events);if(!added.ok)return added;
    next.inventory.tools.push('quarry_pick');o.quarry_tool_found=1;mapChanged=true;break;
   }
   case 'rescue':{
    if(o.quarry_rescue_complete)return fail('ALREADY_CLAIMED');
    if(!o.quarry_tool_found)return fail('TOOL_REQUIRED');
    if(!cleared(next,'rescue'))return fail('RESCUE_GUARDS_ALIVE');
    const added=reward(next,'r6:q:rescue',events);if(!added.ok)return added;o.quarry_rescue_complete=1;mapChanged=true;break;
   }
   case 'anchor':{
    if(!o.quarry_tool_found)return fail('TOOL_REQUIRED');
    if(!o.quarry_rescue_complete)return fail('RESCUE_REQUIRED');
    if(!cleared(next,'winch'))return fail('WINCH_GUARDS_ALIVE');
    if(o['quarry_anchor_'+object.anchor])return fail('ALREADY_OPEN');
    const added=receipt(next,'r6:q:anchor-'+object.anchor);if(!added.ok)return added;o['quarry_anchor_'+object.anchor]=1;break;
   }
   case 'winch':{
    if(o.quarry_winch_repaired)return fail('ALREADY_CLAIMED');
    if(!o.quarry_tool_found)return fail('TOOL_REQUIRED');
    if(!o.quarry_rescue_complete)return fail('RESCUE_REQUIRED');
    if(!cleared(next,'winch'))return fail('WINCH_GUARDS_ALIVE');
    if(!o.quarry_anchor_a||!o.quarry_anchor_b)return fail('ANCHORS_REQUIRED');
    const added=reward(next,'r6:q:winch',events);if(!added.ok)return added;o.quarry_winch_repaired=1;break;
   }
   case 'shortcut':{
    if(o.quarry_shortcut_open)return fail('ALREADY_OPEN');
    if(!o.quarry_tool_found)return fail('TOOL_REQUIRED');
    if(!o.quarry_rescue_complete)return fail('RESCUE_REQUIRED');
    const added=receipt(next,'r6:q:shortcut');if(!added.ok)return added;o.quarry_shortcut_open=1;mapChanged=true;break;
   }
   default:return fail('UNKNOWN_OBJECT');
  }
 }
 events.push({type:'quarryChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validateQuarryProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
