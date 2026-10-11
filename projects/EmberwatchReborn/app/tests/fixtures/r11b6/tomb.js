import {validateRecovery,recoveryFrom} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience} from './progression.js';
import {deriveStats} from './warrior-growth.js';
import {validateFurnaceProgress} from './furnace.js';
import {mapFromRegion} from './world-geometry.js';
import {TOMB_REGION,TOMB_REGIONS,TOMB_GROUPS,TOMB_REWARDS,TOMB_PROGRESS_DEFAULTS,TOMB_RECEIPTS,TOMB_SEQUENCE,TOMB_GLYPHS,TOMB_TRAINING_RESERVE} from './tomb-content.js';

export const TOMB_COMMANDS=new Set(['acceptTombQuest','interactTomb','reportTombQuest']);
const own=(object,key)=>Object.hasOwn(object,key);
const record=value=>value!==null&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype;
const count=value=>Number.isSafeInteger(value)&&value>=0;
const exact=(object,keys)=>record(object)&&Object.keys(object).length===keys.length&&keys.every(key=>own(object,key));
const clone=value=>JSON.parse(JSON.stringify(value));
const FLAGS=Object.keys(TOMB_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
// Expert history can remain valid after genuine supported promotion. This is
// not a tier unlock: the complete character/promotion validators own support.
export const tombTierAllowed=tier=>tier==='adept'||tier==='expert';
const REASONS={
 INVALID_TOMB_STATE:'묘실 진행·서약·훈련 예약 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'묘실 입력 형식이 올바르지 않습니다.',
 TRAIN_FIRST:'먼저 브란에게 기본 네 기술을 배우세요.',ADEPT_REQUIRED:'숙련 승급과 용광로 렌즈 회수 후 오린 보고가 필요합니다.',
 HERO_DOWN:'쓰러진 상태에서는 묘실 장치를 조작하거나 보고할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',
 STALE_REVISION:'이전 묘실 화면의 입력입니다. 현재 목표를 다시 확인하세요.',STALE_STEP:'석판 순서가 바뀌었습니다. 현재 단계를 다시 확인하세요.',
 INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',ELDER_REQUIRED:'마을 촌장 에다 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 신호 묘실 조사를 수락했습니다.',QUEST_REQUIRED:'촌장 에다에게 신호 묘실 조사를 먼저 받으세요.',
 UNKNOWN_OBJECT:'이 지역의 묘실 장치가 아닙니다.',OBJECT_REQUIRED:'해당 묘실 장치 가까이로 이동하세요.',
 ENTRY_GUARDS_ALIVE:'투영 전실의 적 여섯 명을 먼저 처치하세요.',DECODE_REQUIRED:'렌즈 투영 장치에서 세 기호의 순서를 먼저 읽으세요.',
 INSCRIPTION_GUARDS_ALIVE:'비문실의 적 여섯 명을 먼저 처치하세요.',SEQUENCE_REQUIRED:'초승달 → 갈라진 빛줄기 → 잿불 순서로 석판을 누르세요.',
 WARD_REQUIRED:'비문실의 운반 봉인을 먼저 받으세요.',LOWER_GUARDS_ALIVE:'하부 봉인실의 적 세 명을 먼저 처치하세요.',
 MIDPOINT_REQUIRED:'하부 중계 받침에서 운반 봉인을 연결하세요.',UPPER_GUARDS_ALIVE:'상부 봉인실의 적 세 명을 먼저 처치하세요.',
 SEAL_REQUIRED:'상부 봉인 받침에서 봉인을 완성하세요.',BOSS_REQUIRED:'서약 수호자를 먼저 처치하세요.',OATH_REQUIRED:'서약 수호자 처치 후 서약문을 따로 회수하세요.',
 ALREADY_CLAIMED:'이미 완료하거나 보고한 묘실 보상입니다.',ALREADY_OPEN:'이미 연결한 기록 보관 계단입니다.',
 SHORTCUT_REQUIRED:'해독 후 기록 보관 계단을 먼저 연결하세요.',UNKNOWN_GATE:'알 수 없는 묘실 출입 조건입니다.',
 RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',REVISION_LIMIT:'묘실 입력 기록 한도에 도달했습니다.',
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
const killed=state=>state.world.defeated?.[TOMB_REGION]??[];
const cleared=(state,group)=>TOMB_GROUPS[group].every(id=>killed(state).includes(id));
const eligible=state=>tombTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.furnace_reported===1&&['signal_cipher','furnace_lens'].every(id=>state.inventory.tools.includes(id))&&['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report','r9:f:report'].every(id=>has(state,id));
export function tombMap(state){return mapFromRegion(TOMB_REGIONS[TOMB_REGION],state.world.objectives);}
export const tombWardCarried=state=>state.world?.objectives?.tomb_ward_taken===1&&state.world?.objectives?.tomb_ward_sealed===0;
export const tombInputRevision=state=>state.world?.objectives?.tomb_revision??0;
/** Called only on an already-cloned candidate by the travel reducer. A journey
 * invalidates old object clicks even when returning during the same life.
 * This token is separate from the controller's slot/head storage revision. */
export function invalidateTombInput(next){
 if(!next.world.objectives.tomb_accepted)return {ok:true};
 const revision=next.world.objectives.tomb_revision;
 if(!count(revision)||revision>=Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');
 next.world.objectives.tomb_revision=revision+1;return {ok:true};
}
function statePoolsValid(state){
 const w=state.world;
 if(!count(w.life)||typeof w.lifeDown!=='boolean'||!exact(w.position,['x','y'])||!Object.values(w.position).every(Number.isFinite)||!exact(state.vitals,['hp','mana','stamina']))return false;
 const derived=deriveStats(state.character,state);if(!derived.ok)return false;
 if(!Object.entries(state.vitals).every(([key,value])=>Number.isFinite(value)&&value>=0&&value<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]])||w.lifeDown!==(state.vitals.hp===0))return false;
 if(state.recovery!==undefined&&!validateRecovery(state.recovery,{legacy:state.version<3,version:state.version<4?1:2,character:state.character}))return false;
 const map=w.region===TOMB_REGION?tombMap(state):createMap(w.region,state);
 return !!map&&inMap(map,w.position.x,w.position.y);
}
function economyValid(state){
 return count(state.gold)&&record(state.stats)&&['earnedGold','spentGold','kills','deaths'].every(key=>count(state.stats[key]))&&state.stats.earnedGold-state.stats.spentGold===state.gold&&Number.isFinite(state.stats.earnedXp)&&state.stats.earnedXp>=0&&state.stats.earnedXp<=Number.MAX_SAFE_INTEGER&&record(state.inventory.materials)&&record(state.inventory.consumables)&&[...Object.values(state.inventory.materials),...Object.values(state.inventory.consumables)].every(count);
}
/** T-owned invariants. Untouched saves get no defaults or inferred rewards.
 * Full character, equipment, promotion, economy and save validation still run
 * through validateState before/after every registered runtime command. */
export function validateTombProgress(state){
 if(!jsonData(state)||!record(state)||!record(state.world)||!record(state.world.objectives)||!list(state.world.claimedRewards)||!record(state.inventory)||!list(state.inventory.tools,100))return fail('INVALID_TOMB_STATE');
 const w=state.world,o=w.objectives,tools=state.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(value=>list(value,100))))return fail('INVALID_TOMB_STATE');
 if(w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_TOMB_STATE');
 const known=TOMB_REGIONS[TOMB_REGION].foes.map(foe=>foe.id),dead=killed(state);
 if(dead.some(id=>!known.includes(id))||Object.keys(o).some(key=>key.startsWith('tomb_')&&!FLAGS.includes(key))||w.claimedRewards.some(id=>id.startsWith('r10:t')&&!TOMB_RECEIPTS.includes(id)||id.startsWith('r10:promote')&&id!=='r10:promote:expert')||tools.some(id=>id.startsWith('tomb_')&&id!=='tomb_oath'))return fail('INVALID_TOMB_STATE');
 // A promotion receipt is T history too; it must not escape validation merely
 // because the caller removed every prerequisite flag, tool and report.
 const active=FLAGS.some(key=>own(o,key))||w.claimedRewards.some(id=>id.startsWith('r10:t')||id.startsWith('r10:promote'))||tools.includes('tomb_oath')||w.region===TOMB_REGION||(w.visited??[]).includes(TOMB_REGION)||own(w.defeated??{},TOMB_REGION);
 if(!active){
  if(state.reservedTrainingGold!==undefined&&(!exact(state.reservedTrainingGold,['expert'])||state.reservedTrainingGold.expert!==0))return fail('INVALID_TOMB_STATE');
  return {ok:true};
 }
 if(!FLAGS.every(key=>own(o,key)&&count(o[key])&&o[key]<=(key==='tomb_revision'?Number.MAX_SAFE_INTEGER:key==='tomb_sequence_step'?3:1))||o.tomb_revision<1||!eligible(state)||!validateFurnaceProgress(state).ok||o.tomb_accepted!==1)return fail('INVALID_TOMB_STATE');
 if(!statePoolsValid(state)||!(w.visited??[]).includes(w.region)||!economyValid(state))return fail('INVALID_TOMB_STATE');
 if((w.region===TOMB_REGION||own(w.defeated??{},TOMB_REGION)||FLAGS.some(key=>!['tomb_accepted','tomb_revision','expert_commission'].includes(key)&&o[key]))&&!(w.visited??[]).includes(TOMB_REGION))return fail('INVALID_TOMB_STATE');
 const pairs=[['tomb_accepted','r10:t:accept'],['tomb_decoded','r10:t:decode'],['tomb_sequence_solved','r10:t:sequence'],['tomb_ward_taken','r10:t:ward-take'],['tomb_ward_midpoint','r10:t:ward-midpoint'],['tomb_ward_sealed','r10:t:ward'],['tomb_oath_taken','r10:t:oath'],['tomb_shortcut_open','r10:t:shortcut'],['tomb_reported','r10:t:report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(state,id))||Boolean(o.tomb_oath_taken)!==tools.includes('tomb_oath')||Boolean(o.tomb_reported)!==Boolean(o.expert_commission))return fail('INVALID_TOMB_STATE');
 if(Boolean(o.tomb_sequence_solved)!==(o.tomb_sequence_step===3))return fail('INVALID_TOMB_STATE');
 if(o.tomb_decoded&&!cleared(state,'entry')||TOMB_GROUPS.inscription.some(id=>dead.includes(id))&&!o.tomb_decoded)return fail('INVALID_TOMB_STATE');
 if(o.tomb_sequence_step&&(!o.tomb_decoded||!cleared(state,'inscription'))||o.tomb_ward_taken&&!o.tomb_sequence_solved||TOMB_GROUPS.ward_lower.some(id=>dead.includes(id))&&!o.tomb_ward_taken)return fail('INVALID_TOMB_STATE');
 if(o.tomb_ward_midpoint&&(!o.tomb_ward_taken||!cleared(state,'ward_lower'))||TOMB_GROUPS.ward_upper.some(id=>dead.includes(id))&&!o.tomb_ward_midpoint)return fail('INVALID_TOMB_STATE');
 if(o.tomb_ward_sealed&&(!o.tomb_ward_midpoint||!cleared(state,'ward_upper'))||dead.includes(TOMB_GROUPS.boss[0])&&!o.tomb_ward_sealed||o.tomb_oath_taken&&!cleared(state,'boss')||o.tomb_shortcut_open&&!o.tomb_decoded||o.tomb_reported&&!o.tomb_oath_taken)return fail('INVALID_TOMB_STATE');
 const minimumRevision=pairs.reduce((sum,[flag])=>sum+o[flag],0)+Math.min(o.tomb_sequence_step,2);
 if(o.tomb_revision<minimumRevision)return fail('INVALID_TOMB_STATE');
 const promoted=has(state,'r10:promote:expert'),expert=state.character.tier==='expert';
 if(promoted!==expert||expert&&!o.tomb_reported)return fail('INVALID_TOMB_STATE');
 const reserve=o.tomb_reported&&!expert?TOMB_TRAINING_RESERVE:0;
 if(!exact(state.reservedTrainingGold,['expert'])||state.reservedTrainingGold.expert!==reserve||reserve>state.gold)return fail('INVALID_TOMB_STATE');
 return {ok:true};
}
export function tombPortalAllowed(state,portal){
 const valid=validateTombProgress(state);if(!valid.ok)return valid;
 if(!jsonData(portal,new Set(),0,{left:1000})||!record(portal))return fail('UNKNOWN_GATE');
 if(portal.gate===undefined||portal.gate===null)return {ok:true};
 if(!['tomb_entry','tomb_shortcut','tomb_boss_return'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!state.world.objectives.tomb_accepted)return fail('QUEST_REQUIRED');
 if(state.world.lifeDown||state.vitals.hp<=0)return fail('HERO_DOWN');
 if(portal.gate==='tomb_shortcut'&&!state.world.objectives.tomb_shortcut_open)return fail('SHORTCUT_REQUIRED');
 if(portal.gate==='tomb_boss_return'&&!cleared(state,'boss'))return fail('BOSS_REQUIRED');
 return {ok:true};
}
function commandValid(command,state){
 if(!jsonData(command,new Set(),0,{left:1000})||!record(command)||!TOMB_COMMANDS.has(command.type))return false;
 const interaction=command.type==='interactTomb',plate=interaction&&TOMB_REGIONS[TOMB_REGION].objects.some(o=>o.id===command.objectId&&o.actionKind==='glyph');
 const keys=['type','position','life','vitals','recovery','expectedRevision',...(interaction?['objectId']:[]),...(plate?['glyph','expectedStep']:[])];
 if(!exact(command,keys)||!count(command.life)||!count(command.expectedRevision))return false;
 if(!exact(command.position,['x','y'])||!Object.values(command.position).every(Number.isFinite)||!exact(command.vitals,['hp','mana','stamina'])||!Object.values(command.vitals).every(value=>Number.isFinite(value)&&value>=0))return false;
 if(interaction&&(typeof command.objectId!=='string'||command.objectId.length>100||!command.objectId.length))return false;
 if(plate&&(!own(TOMB_GLYPHS,command.glyph)||!count(command.expectedStep)||command.expectedStep>3))return false;
 return validateRecovery(command.recovery,{character:state.character});
}
function receipt(next,id){
 if(has(next,id))return fail('ALREADY_CLAIMED');
 if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');
 next.world.claimedRewards.push(id);return {ok:true};
}
function reward(next,id,events){
 const added=receipt(next,id);if(!added.ok)return added;
 const row=TOMB_REWARDS[id],gain=grantExperience(next.character,row.xp);if(!gain.ok)return gain;
 const xp=next.stats.earnedXp+gain.appliedXp;
 if(!count(next.gold+row.gold)||!count(next.stats.earnedGold+row.gold)||!Number.isFinite(xp)||xp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');
 next.character=gain.character;next.gold+=row.gold;next.stats.earnedGold+=row.gold;next.stats.earnedXp=Math.round(xp*1e6)/1e6;
 for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,amount]of Object.entries(values)){
  const total=(next.inventory[field][key]??0)+amount;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;
 }
 if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});
 events.push({type:'tombReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};
}
function context(state,command){
 const valid=validateTombProgress(state);if(!valid.ok)return valid;
 if(!commandValid(command,state))return fail('INVALID_COMMAND');
 if(!state.vitals||!state.world.objectives.trained)return fail('TRAIN_FIRST');
 if(state.world.lifeDown||state.vitals.hp<=0||command.vitals.hp<=0)return fail('HERO_DOWN');
 if(command.life!==state.world.life)return fail('STALE_LIFE');
 if(command.expectedRevision!==tombInputRevision(state))return fail('STALE_REVISION');
 if(command.expectedRevision===Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');
 if(!eligible(state))return fail('ADEPT_REQUIRED');
 if(!validateFurnaceProgress(state).ok||!economyValid(state)||!statePoolsValid(state))return fail('INVALID_TOMB_STATE');
 const derived=deriveStats(state.character,state);if(!derived.ok)return derived;
 const region=state.world.region===TOMB_REGION?TOMB_REGIONS[TOMB_REGION]:getRegion(state.world.region),map=state.world.region===TOMB_REGION?tombMap(state):createMap(state.world.region,state);
 if(!region||!map||!inMap(map,command.position.x,command.position.y)||!['hp','mana','stamina'].every(key=>command.vitals[key]<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[key]]))return fail('INVALID_REPORT');
 return {ok:true,region,map};
}
export function reduceTomb(state,command){
 const entered=context(state,command);if(!entered.ok)return entered;
 const next=clone(state),events=[],o=next.world.objectives;let mapChanged=false;
 next.world.position={...command.position};next.vitals={...command.vitals};next.recovery=recoveryFrom(command);
 if(command.type==='acceptTombQuest'||command.type==='reportTombQuest'){
  const elder=entered.region.npcs.find(npc=>npc.id==='elder');
  if(state.world.region!=='ash_hamlet'||!elder||!near(command.position,elder))return fail('ELDER_REQUIRED');
  if(!lineOfSight(entered.map,command.position,elder))return fail('WALL_BLOCKED');
  if(command.type==='acceptTombQuest'){
   if(o.tomb_accepted)return fail('ALREADY_ACCEPTED');
   const added=receipt(next,'r10:t:accept');if(!added.ok)return added;
   Object.assign(o,TOMB_PROGRESS_DEFAULTS);next.reservedTrainingGold={expert:0};
  }else{
   if(!o.tomb_accepted)return fail('QUEST_REQUIRED');
   if(!o.tomb_oath_taken||!next.inventory.tools.includes('tomb_oath'))return fail('OATH_REQUIRED');
   // The 140XP report is allowed at L14: minimum Hard/Serious crosses L15 here.
   // Reserve the existing 120G reward, never add a second wallet or grant.
   const added=reward(next,'r10:t:report',events);if(!added.ok)return added;
   o.tomb_reported=1;o.expert_commission=1;next.reservedTrainingGold={expert:TOMB_TRAINING_RESERVE};
   events.push({type:'expertCommissionGranted',reservedGold:TOMB_TRAINING_RESERVE});
  }
 }else{
  if(!o.tomb_accepted)return fail('QUEST_REQUIRED');
  const object=entered.region.objects.find(row=>row.type==='tomb'&&row.id===command.objectId);
  if(!object)return fail('UNKNOWN_OBJECT');
  if(!near(command.position,object))return fail('OBJECT_REQUIRED');
  if(!lineOfSight(entered.map,command.position,object))return fail('WALL_BLOCKED');
  switch(object.actionKind){
   case 'decode':{
    if(!o.tomb_decoded){
     if(!cleared(next,'entry'))return fail('ENTRY_GUARDS_ALIVE');
     const added=reward(next,'r10:t:decode',events);if(!added.ok)return added;o.tomb_decoded=1;mapChanged=true;
    }
    events.push({type:'tombClueRead',sequence:[...TOMB_SEQUENCE]});break;
   }
   case 'glyph':{
    if(command.glyph!==object.glyph)return fail('INVALID_COMMAND');
    if(command.expectedStep!==o.tomb_sequence_step)return fail('STALE_STEP');
    if(o.tomb_sequence_solved)return fail('ALREADY_CLAIMED');
    if(!o.tomb_decoded)return fail('DECODE_REQUIRED');
    if(!cleared(next,'inscription'))return fail('INSCRIPTION_GUARDS_ALIVE');
    if(object.glyph!==TOMB_SEQUENCE[o.tomb_sequence_step]){
     const expectedGlyph=TOMB_SEQUENCE[o.tomb_sequence_step];o.tomb_sequence_step=0;
     events.push({type:'tombSequenceReset',glyph:object.glyph,expectedGlyph,nextGlyph:TOMB_SEQUENCE[0],step:0});break;
    }
    o.tomb_sequence_step++;
    if(o.tomb_sequence_step===TOMB_SEQUENCE.length){
     const added=reward(next,'r10:t:sequence',events);if(!added.ok)return added;o.tomb_sequence_solved=1;mapChanged=true;
    }
    events.push({type:'tombSequenceAdvanced',glyph:object.glyph,step:o.tomb_sequence_step,complete:!!o.tomb_sequence_solved,nextGlyph:TOMB_SEQUENCE[o.tomb_sequence_step]??null});break;
   }
   case 'wardTake':{
    if(o.tomb_ward_taken)return fail('ALREADY_CLAIMED');
    if(!o.tomb_sequence_solved)return fail('SEQUENCE_REQUIRED');
    const added=receipt(next,'r10:t:ward-take');if(!added.ok)return added;o.tomb_ward_taken=1;mapChanged=true;
    events.push({type:'tombWardTaken'});break;
   }
   case 'wardMidpoint':{
    if(o.tomb_ward_midpoint)return fail('ALREADY_CLAIMED');
    if(!o.tomb_ward_taken)return fail('WARD_REQUIRED');
    if(!cleared(next,'ward_lower'))return fail('LOWER_GUARDS_ALIVE');
    const added=receipt(next,'r10:t:ward-midpoint');if(!added.ok)return added;o.tomb_ward_midpoint=1;mapChanged=true;
    events.push({type:'tombWardMidpoint'});break;
   }
   case 'wardSeal':{
    if(o.tomb_ward_sealed)return fail('ALREADY_CLAIMED');
    if(!o.tomb_ward_midpoint)return fail('MIDPOINT_REQUIRED');
    if(!cleared(next,'ward_upper'))return fail('UPPER_GUARDS_ALIVE');
    const added=reward(next,'r10:t:ward',events);if(!added.ok)return added;o.tomb_ward_sealed=1;mapChanged=true;
    events.push({type:'tombWardSealed'});break;
   }
   case 'oath':{
    if(o.tomb_oath_taken)return fail('ALREADY_CLAIMED');
    if(!o.tomb_ward_sealed)return fail('SEAL_REQUIRED');
    if(!cleared(next,'boss'))return fail('BOSS_REQUIRED');
    if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');
    const added=receipt(next,'r10:t:oath');if(!added.ok)return added;
    next.inventory.tools.push('tomb_oath');o.tomb_oath_taken=1;events.push({type:'tombOathTaken'});break;
   }
   case 'shortcut':{
    if(o.tomb_shortcut_open)return fail('ALREADY_OPEN');
    if(!o.tomb_decoded)return fail('DECODE_REQUIRED');
    const added=receipt(next,'r10:t:shortcut');if(!added.ok)return added;o.tomb_shortcut_open=1;mapChanged=true;break;
   }
   default:return fail('UNKNOWN_OBJECT');
  }
 }
 o.tomb_revision=command.expectedRevision+1;
 events.push({type:'tombChanged',...(command.objectId?{objectId:command.objectId}:{}),mapChanged});
 const checked=validateTombProgress(next);return checked.ok?{ok:true,state:next,events}:checked;
}
