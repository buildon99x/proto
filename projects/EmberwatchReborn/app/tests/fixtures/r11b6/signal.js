import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {validatePassProgress} from './pass.js';
import {mapFromRegion} from './world-geometry.js';
import {SIGNAL_REGIONS,SIGNAL_GROUPS,SIGNAL_REWARDS,SIGNAL_PROGRESS_DEFAULTS,SIGNAL_RECEIPTS,SIGNAL_ROUTES} from './signal-content.js';

export const SIGNAL_COMMANDS=new Set(['acceptSignalQuest','interactSignal','reportSignalQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(SIGNAL_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
// Keep allowed tiers in one place. TODO: when Expert/Master become real saved
// tiers, extend this helper and predecessor validation to retain old progress.
const ELIGIBLE_TIERS=new Set(['adept','expert']);
export const signalTierAllowed=tier=>ELIGIBLE_TIERS.has(tier);
const REASONS={
 INVALID_SIGNAL_STATE:'신호 복원 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'신호 입력 형식이 올바르지 않습니다.',
 TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.',ADEPT_REQUIRED:'숙련 승급과 고갯길의 에다 보고가 필요합니다.',
 HERO_DOWN:'쓰러진 상태에서는 신호 장치를 조작할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',
 BLACKSMITH_REQUIRED:'마을 대장장이 오린 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 신호 복원을 수락했습니다.',QUEST_REQUIRED:'대장장이 오린에게 신호 복원을 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 신호 장치가 아닙니다.',OBJECT_REQUIRED:'해당 신호 장치 가까이로 이동하세요.',
 ENTRY_GUARDS_ALIVE:'입구의 적 여섯 명을 먼저 처치하세요.',DECODE_REQUIRED:'고갯길 신호 해독판을 먼저 읽으세요.',
 ROUTE_REQUIRED:'송신·수신 레버의 순서로 접근 방향을 고르세요.',YARD_GUARDS_ALIVE:'분지 중계장의 적 여섯 명을 먼저 처치하세요.',
 TRANSMITTER_REQUIRED:'분지 송신기를 먼저 복원하세요.',RECEIVER_GUARDS_ALIVE:'북쪽 수신탑의 적 네 명을 먼저 처치하세요.',
 RECEIVER_REQUIRED:'북쪽 수신기를 복원한 뒤 오린에게 보고하세요.',ALREADY_CLAIMED:'이미 완료하거나 보고한 신호 보상입니다.',
 ALREADY_OPEN:'이미 연결한 장치입니다.',SHORTCUT_REQUIRED:'입구 동쪽의 중계 승강기를 먼저 연결하세요.',
 UNKNOWN_GATE:'알 수 없는 신호 출입 조건입니다.',RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',
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
const killed=state=>state.world.defeated?.signal_basin??[];
const cleared=(state,group)=>SIGNAL_GROUPS[group].every(id=>killed(state).includes(id));
const eligible=state=>signalTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.pass_reported===1&&['r4:report','r5:promote:adept','r6:q:report','r7:p:report'].every(id=>has(state,id));

/** Same geometry used by future world registration; works before integration. */
export function signalMap(state){return mapFromRegion(SIGNAL_REGIONS.signal_basin,state.world.objectives);}
function statePoolsValid(state){
 const w=state.world;
 if(!count(w.life)||typeof w.lifeDown!=='boolean'||!exact(w.position,['x','y'])||!Object.values(w.position).every(Number.isFinite)||!exact(state.vitals,['hp','mana','stamina']))return false;
 const derived=deriveStats(state.character,state);if(!derived.ok)return false;
 if(!Object.entries(state.vitals).every(([key,value])=>Number.isFinite(value)&&value>=0&&value<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]])||w.lifeDown!==(state.vitals.hp===0))return false;
 if(state.recovery!==undefined&&!validateRecovery(state.recovery,{legacy:state.version<3,version:state.version<4?1:2,character:state.character}))return false;
 const map=w.region==='signal_basin'?signalMap(state):createMap(w.region,state);
 return !!map&&inMap(map,w.position.x,w.position.y);
}
/** Signal-owned invariants plus live resource/economy safety. Common runtime
 * still validates the entire character/equipment/dungeon/save envelope. */
export function validateSignalProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_SIGNAL_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100))))return fail('INVALID_SIGNAL_STATE');
 if(w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_SIGNAL_STATE');
 const known=SIGNAL_REGIONS.signal_basin.foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('signal_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r8:s')&&!SIGNAL_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('signal_')&&id!=='signal_cipher'))return fail('INVALID_SIGNAL_STATE');
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r8:s'))||tools.includes('signal_cipher')||w.region==='signal_basin'||(w.visited??[]).includes('signal_basin')||own(w.defeated??{},'signal_basin');
 if(!active)return {ok:true}; // No migration side effects for untouched saves.
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=(['signal_route_step','signal_route_first'].includes(key)?2:1))||!eligible(state)||!validatePassProgress(state).ok||o.signal_accepted!==1)return fail('INVALID_SIGNAL_STATE');
 if(!statePoolsValid(state)||!(w.visited??[]).includes(w.region)||!economyValid(state))return fail('INVALID_SIGNAL_STATE');
 if((w.region==='signal_basin'||own(w.defeated??{},'signal_basin')||dead.length||FLAGS.some(key=>key!=='signal_accepted'&&o[key]))&&!(w.visited??[]).includes('signal_basin'))return fail('INVALID_SIGNAL_STATE');
 const pairs=[['signal_accepted','r8:s:accept'],['signal_decoded','r8:s:decode'],['signal_transmitter_restored','r8:s:transmitter'],['signal_receiver_restored','r8:s:receiver'],['signal_shortcut_open','r8:s:shortcut'],['signal_reported','r8:s:report'],['signal_west_open','r8:s:route-west'],['signal_east_open','r8:s:route-east']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.signal_decoded)!==tools.includes('signal_cipher'))return fail('INVALID_SIGNAL_STATE');
 if(Boolean(o.signal_route_ready)!==(o.signal_route_step===2)||Boolean(o.signal_route_first)!==Boolean(o.signal_route_step)||o.signal_west_open+o.signal_east_open!==o.signal_route_ready)return fail('INVALID_SIGNAL_STATE');
 if(o.signal_route_ready&&o.signal_route_first!==(o.signal_west_open?1:2))return fail('INVALID_SIGNAL_STATE');
 if(o.signal_decoded&&!cleared(state,'entry')||o.signal_route_step&&!o.signal_decoded||SIGNAL_GROUPS.yard.some(id=>dead.includes(id))&&!o.signal_route_ready)return fail('INVALID_SIGNAL_STATE');
 if(o.signal_transmitter_restored&&(!o.signal_route_ready||!cleared(state,'yard'))||SIGNAL_GROUPS.receiver.some(id=>dead.includes(id))&&!o.signal_transmitter_restored)return fail('INVALID_SIGNAL_STATE');
 if(o.signal_receiver_restored&&(!o.signal_transmitter_restored||!cleared(state,'receiver'))||o.signal_shortcut_open&&!o.signal_decoded||o.signal_reported&&!o.signal_receiver_restored)return fail('INVALID_SIGNAL_STATE');
 return {ok:true};
}
export function signalPortalAllowed(state,portal){
 const valid=validateSignalProgress(state);if(!valid.ok)return valid;
 if(!jsonData(portal,new Set(),0,{left:1000})||!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['signal_entry','signal_shortcut'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!state.world.objectives.signal_accepted)return fail('QUEST_REQUIRED');
 if(state.world.lifeDown||state.vitals.hp<=0)return fail('HERO_DOWN');
 return portal.gate==='signal_entry'||state.world.objectives.signal_shortcut_open===1?{ok:true}:fail('SHORTCUT_REQUIRED');
}
function economyValid(state){
 return count(state.gold)&&record(state.stats)&&['earnedGold','spentGold','kills','deaths'].every(key=>count(state.stats[key]))&&state.stats.earnedGold-state.stats.spentGold===state.gold&&Number.isFinite(state.stats.earnedXp)&&state.stats.earnedXp>=0&&state.stats.earnedXp<=Number.MAX_SAFE_INTEGER&&record(state.inventory.materials)&&record(state.inventory.consumables)&&[...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count);
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!SIGNAL_COMMANDS.has(command.type))return false;
 const keys=['type','position','life','vitals',...(command.type==='interactSignal'?['objectId']:[])];
 if(!keys.every(key=>own(command,key))||Object.keys(command).some(key=>![...keys,'recovery'].includes(key))||!count(command.life))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 if(command.type==='interactSignal'&&(typeof command.objectId!=='string'||command.objectId.length>100||!command.objectId.length))return false;
 return command.recovery===undefined||validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');
 if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=SIGNAL_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;
 if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'signalReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validateSignalProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==state.world.life)return fail('STALE_LIFE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!validatePassProgress(state).ok||!economyValid(state)||!statePoolsValid(state))return fail('INVALID_SIGNAL_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=state.world.region==='signal_basin'?SIGNAL_REGIONS.signal_basin:getRegion(state.world.region),map=state.world.region==='signal_basin'?signalMap(state):createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reduceSignal(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};if(command.recovery!==undefined)next.recovery=recoveryFrom(command);
 if(command.type==='acceptSignalQuest'||command.type==='reportSignalQuest'){
  const smith=entered.region.npcs.find(npc=>npc.id==='blacksmith');
  if(state.world.region!=='ash_hamlet'||!smith||!near(command.position,smith))return fail('BLACKSMITH_REQUIRED');
  if(!lineOfSight(entered.map,command.position,smith))return fail('WALL_BLOCKED');
  if(command.type==='acceptSignalQuest'){
   if(o.signal_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r8:s:accept');if(!added.ok)return added;
   Object.assign(o,SIGNAL_PROGRESS_DEFAULTS);mapChanged=true;
  }else{
   if(!o.signal_accepted)return fail('QUEST_REQUIRED');
   if(!o.signal_receiver_restored)return fail('RECEIVER_REQUIRED');
   const added=reward(next,'r8:s:report',events);if(!added.ok)return added;o.signal_reported=1;
  }
 }else{
  if(!o.signal_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='signal'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');
  if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  switch(object.actionKind){
   case 'decode':{
    if(!o.signal_decoded){
     if(!cleared(next,'entry'))return fail('ENTRY_GUARDS_ALIVE');
     if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
     const added=reward(next,'r8:s:decode',events);if(!added.ok)return added;
     next.inventory.tools.push('signal_cipher');o.signal_decoded=1;
    }
    events.push({type:'signalCodeRead',routes:['west','east']});break;
   }
   case 'route':{
    if(!o.signal_decoded)return fail('DECODE_REQUIRED');
    if(o.signal_route_ready)return fail('ALREADY_OPEN');
    const selected=object.node==='transmitter'?1:2;
    if(o.signal_route_step===0){o.signal_route_first=selected;o.signal_route_step=1;events.push({type:'signalRouteAdvanced',step:1,nextNode:selected===1?'receiver':'transmitter'});}
    else if(o.signal_route_first===selected){
     o.signal_route_first=0;o.signal_route_step=0;
     events.push({type:'signalRouteReset',step:0,reason:'같은 레버를 다시 눌러 선택을 초기화했습니다. 송신→수신은 서쪽, 수신→송신은 동쪽입니다. 비용은 없습니다.'});
    }else{
     const direction=o.signal_route_first===1?'west':'east',route=SIGNAL_ROUTES[direction];
     const added=receipt(next,route.receipt);if(!added.ok)return added;
     o.signal_route_step=2;o.signal_route_ready=1;o['signal_'+direction+'_open']=1;mapChanged=true;
     events.push({type:'signalRouteChosen',direction,step:2});
    }
    break;
   }
   case 'transmitter':{
    if(o.signal_transmitter_restored)return fail('ALREADY_CLAIMED');
    if(!o.signal_decoded)return fail('DECODE_REQUIRED');
    if(!o.signal_route_ready)return fail('ROUTE_REQUIRED');
    if(!cleared(next,'yard'))return fail('YARD_GUARDS_ALIVE');
    const added=reward(next,'r8:s:transmitter',events);if(!added.ok)return added;o.signal_transmitter_restored=1;mapChanged=true;break;
   }
   case 'receiver':{
    if(o.signal_receiver_restored)return fail('ALREADY_CLAIMED');
    if(!o.signal_transmitter_restored)return fail('TRANSMITTER_REQUIRED');
    if(!cleared(next,'receiver'))return fail('RECEIVER_GUARDS_ALIVE');
    const added=reward(next,'r8:s:receiver',events);if(!added.ok)return added;o.signal_receiver_restored=1;break;
   }
   case 'shortcut':{
    if(o.signal_shortcut_open)return fail('ALREADY_OPEN');
    if(!o.signal_decoded)return fail('DECODE_REQUIRED');
    const added=receipt(next,'r8:s:shortcut');if(!added.ok)return added;o.signal_shortcut_open=1;mapChanged=true;break;
   }
   default:return fail('UNKNOWN_OBJECT');
  }
 }
 events.push({type:'signalChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validateSignalProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
