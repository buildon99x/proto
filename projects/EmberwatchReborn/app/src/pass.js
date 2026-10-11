import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {validateQuarryProgress} from './quarry.js';
import {PASS_REGIONS,PASS_GROUPS,PASS_REWARDS,PASS_PROGRESS_DEFAULTS,PASS_RECEIPTS,PASS_SEQUENCE} from './pass-content.js';

export const PASS_COMMANDS=new Set(['acceptPassQuest','interactPass','reportPassQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(PASS_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
// Keep allowed tiers in one place. TODO: when Expert/Master become real saved
// tiers, extend this helper and predecessor validation to retain old progress.
const ELIGIBLE_TIERS=new Set(['adept','expert']);
export const passTierAllowed=tier=>ELIGIBLE_TIERS.has(tier);
const REASONS={
 INVALID_PASS_STATE:'고갯길 진행 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'고갯길 입력 형식이 올바르지 않습니다.',
 TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.',ADEPT_REQUIRED:'브란에게 숙련 승급을 받고 채석장 조사를 에다에게 보고하세요.',
 HERO_DOWN:'쓰러진 상태에서는 고갯길 조사를 진행할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',
 ELDER_REQUIRED:'마을 촌장 에다 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 고갯길 조사를 수락했습니다.',QUEST_REQUIRED:'촌장 에다에게 고갯길 조사를 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 고갯길 장치가 아닙니다.',OBJECT_REQUIRED:'해당 고갯길 장치 가까이로 이동하세요.',
 ENTRY_GUARDS_ALIVE:'서쪽 고갯길의 적 다섯 명을 먼저 처치하세요.',CLUE_REQUIRED:'서쪽 비문에서 바람 → 불꽃 → 돌 순서를 먼저 확인하세요.',
 RESCUE_GUARDS_ALIVE:'구조 구역의 적 다섯 명을 먼저 처치하세요.',RESCUE_REQUIRED:'고립된 길잡이를 먼저 구조하세요.',
 SIGNAL_GUARDS_ALIVE:'북쪽 신호대의 적 다섯 명을 먼저 처치하세요.',SIGNAL_REQUIRED:'바람 → 불꽃 → 돌 순서로 신호를 정렬한 뒤 촌장 에다에게 보고하세요.',
 ALREADY_CLAIMED:'이미 완료하거나 보고한 고갯길 보상입니다.',ALREADY_OPEN:'이미 연결한 장치입니다.',SHORTCUT_REQUIRED:'구조 구역 남동쪽의 귀환 밧줄길을 먼저 연결하세요.',
 UNKNOWN_GATE:'알 수 없는 고갯길 출입 조건입니다.',RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',
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
const killed=state=>state.world.defeated?.ashwind_pass??[];
const cleared=(state,group)=>PASS_GROUPS[group].every(id=>killed(state).includes(id));
const eligible=state=>passTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.quarry_reported===1&&['r4:report','r5:promote:adept','r6:q:report'].every(id=>has(state,id));

/** Pass-owned invariants; common runtime validates the complete save as well. */
export function validatePassProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_PASS_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100))))return fail('INVALID_PASS_STATE');
 if(w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_PASS_STATE');
 const known=PASS_REGIONS.ashwind_pass.foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('pass_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r7:p')&&!PASS_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('pass_')&&id!=='pass_rune_note'))return fail('INVALID_PASS_STATE');
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r7:p'))||tools.includes('pass_rune_note')||w.region==='ashwind_pass'||(w.visited??[]).includes('ashwind_pass')||own(w.defeated??{},'ashwind_pass');
 if(!active)return {ok:true}; // Untouched old saves remain untouched.
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=(key==='pass_signal_step'?3:1))||!eligible(state)||!validateQuarryProgress(state).ok||o.pass_accepted!==1)return fail('INVALID_PASS_STATE');
 if((w.region==='ashwind_pass'||own(w.defeated??{},'ashwind_pass')||dead.length||FLAGS.some(key=>key!=='pass_accepted'&&o[key]))&&!(w.visited??[]).includes('ashwind_pass'))return fail('INVALID_PASS_STATE');
 const pairs=[['pass_accepted','r7:p:accept'],['pass_clue_read','r7:p:clue'],['pass_rescue_complete','r7:p:rescue'],['pass_signal_aligned','r7:p:align'],['pass_shortcut_open','r7:p:shortcut'],['pass_reported','r7:p:report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.pass_clue_read)!==tools.includes('pass_rune_note'))return fail('INVALID_PASS_STATE');
 if(Boolean(o.pass_signal_aligned)!==(o.pass_signal_step===3))return fail('INVALID_PASS_STATE');
 if(o.pass_clue_read&&!cleared(state,'entry')||PASS_GROUPS.rescue.some(id=>dead.includes(id))&&!o.pass_clue_read)return fail('INVALID_PASS_STATE');
 if(o.pass_rescue_complete&&(!o.pass_clue_read||!cleared(state,'rescue'))||PASS_GROUPS.signal.some(id=>dead.includes(id))&&!o.pass_rescue_complete)return fail('INVALID_PASS_STATE');
 if(o.pass_signal_step&&(!o.pass_rescue_complete||!cleared(state,'signal'))||o.pass_shortcut_open&&!o.pass_rescue_complete||o.pass_reported&&!o.pass_signal_aligned)return fail('INVALID_PASS_STATE');
 return {ok:true};
}
export function passPortalAllowed(state,portal){
 const valid=validatePassProgress(state);if(!valid.ok)return valid;
 if(!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['pass_entry','pass_shortcut'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!state.world.objectives.pass_accepted)return fail('QUEST_REQUIRED');
 return portal.gate==='pass_entry'||state.world.objectives.pass_shortcut_open===1?{ok:true}:fail('SHORTCUT_REQUIRED');
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!PASS_COMMANDS.has(command.type))return false;
 const keys=['type','position','life','vitals',...(command.type==='interactPass'?['objectId']:[])];
 if(!keys.every(key=>own(command,key))||Object.keys(command).some(key=>![...keys,'recovery'].includes(key))||!count(command.life))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 if(command.type==='interactPass'&&(typeof command.objectId!=='string'||command.objectId.length>100||!command.objectId.length))return false;
 return command.recovery===undefined||validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');
 if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=PASS_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;
 if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'passReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validatePassProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==(state.world.life??0))return fail('STALE_LIFE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!validateQuarryProgress(state).ok||!count(state.gold)||!record(state.stats)||!count(state.stats.earnedGold)||!count(state.stats.spentGold)||state.stats.earnedGold-state.stats.spentGold!==state.gold||!Number.isFinite(state.stats.earnedXp)||state.stats.earnedXp<0||!record(state.inventory.materials)||!record(state.inventory.consumables)||![...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count))return fail('INVALID_PASS_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=getRegion(state.world.region),map=createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reducePass(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};if(command.recovery!==undefined)next.recovery=recoveryFrom(command);
 if(command.type==='acceptPassQuest'||command.type==='reportPassQuest'){
  const elder=entered.region.npcs.find(npc=>npc.id==='elder');
  if(state.world.region!=='ash_hamlet'||!elder||!near(command.position,elder))return fail('ELDER_REQUIRED');
  if(!lineOfSight(entered.map,command.position,elder))return fail('WALL_BLOCKED');
  if(command.type==='acceptPassQuest'){
   if(o.pass_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r7:p:accept');if(!added.ok)return added;
   Object.assign(o,PASS_PROGRESS_DEFAULTS);mapChanged=true;
  }else{
   if(!o.pass_accepted)return fail('QUEST_REQUIRED');
   if(!o.pass_signal_aligned)return fail('SIGNAL_REQUIRED');
   const added=reward(next,'r7:p:report',events);if(!added.ok)return added;o.pass_reported=1;
  }
 }else{
  if(!o.pass_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='pass'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');
  if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  switch(object.actionKind){
   case 'clue':{
    if(!o.pass_clue_read){
     if(!cleared(next,'entry'))return fail('ENTRY_GUARDS_ALIVE');
     if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
     const added=reward(next,'r7:p:clue',events);if(!added.ok)return added;
     next.inventory.tools.push('pass_rune_note');o.pass_clue_read=1;mapChanged=true;
    }
    events.push({type:'passClueRead',sequence:[...PASS_SEQUENCE]});break;
   }
   case 'rescue':{
    if(o.pass_rescue_complete)return fail('ALREADY_CLAIMED');
    if(!o.pass_clue_read)return fail('CLUE_REQUIRED');
    if(!cleared(next,'rescue'))return fail('RESCUE_GUARDS_ALIVE');
    const added=reward(next,'r7:p:rescue',events);if(!added.ok)return added;o.pass_rescue_complete=1;mapChanged=true;break;
   }
   case 'signal':{
    if(o.pass_signal_aligned)return fail('ALREADY_CLAIMED');
    if(!o.pass_clue_read)return fail('CLUE_REQUIRED');
    if(!o.pass_rescue_complete)return fail('RESCUE_REQUIRED');
    if(!cleared(next,'signal'))return fail('SIGNAL_GUARDS_ALIVE');
    if(object.rune!==PASS_SEQUENCE[o.pass_signal_step]){
     o.pass_signal_step=0;
     events.push({type:'passSignalReset',rune:object.rune,step:0,expectedRune:PASS_SEQUENCE[0],reason:'순서가 달라 신호를 초기화했습니다. 바람 → 불꽃 → 돌 순서로 다시 맞추세요. 비용과 보상 손실은 없습니다.'});
    }else{
     o.pass_signal_step++;
     if(o.pass_signal_step===3){const award=reward(next,'r7:p:align',events);if(!award.ok)return award;o.pass_signal_aligned=1;}
     events.push({type:'passSignalAdvanced',rune:object.rune,step:o.pass_signal_step,expectedRune:PASS_SEQUENCE[o.pass_signal_step]??null});
    }
    break;
   }
   case 'shortcut':{
    if(o.pass_shortcut_open)return fail('ALREADY_OPEN');
    if(!o.pass_rescue_complete)return fail('RESCUE_REQUIRED');
    const added=receipt(next,'r7:p:shortcut');if(!added.ok)return added;o.pass_shortcut_open=1;mapChanged=true;break;
   }
   default:return fail('UNKNOWN_OBJECT');
  }
 }
 events.push({type:'passChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validatePassProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
