import {isImmutableSnapshot} from './immutable-snapshot.js';
import {validateRecovery,recoveryFrom,retryRecovery} from './recovery.js';
import {getRegion,createMap,inMap,near,lineOfSight} from './world.js';
import {grantExperience,experienceMultiplier,validateCharacter} from './progression.js';
import {deriveStats,validateWarriorGrowth} from './warrior-growth.js';
import {validateBattlefieldProgress,battlefieldEligible,invalidateBattlefieldInput} from './battlefield.js';
import {invalidateTombInput,validateTombProgress} from './tomb.js';
import {validateDungeonProgress} from './dungeon.js';
import {validateQuarryProgress} from './quarry.js';
import {validatePassProgress} from './pass.js';
import {validateSignalProgress} from './signal.js';
import {validateFurnaceProgress} from './furnace.js';
import {validatePromotion} from './promotion.js';
import {validateEquipmentState} from './equipment.js';
import {validateSavedActionSlots} from './action-slots.js';
import {trainingGoldBalances} from './training-economy.js';
import {mapFromRegion} from './world-geometry.js';
import {WILDERNESS_REGION,WILDERNESS_REGIONS,WILDERNESS_LINKS,WILDERNESS_FOES,WILDERNESS_GROUPS,WILDERNESS_REWARDS,WILDERNESS_PROGRESS_DEFAULTS,WILDERNESS_RECEIPTS,WILDERNESS_TOOLS,WILDERNESS_SEQUENCE,WILDERNESS_MODES,WILDERNESS_CLUE} from './wilderness-content.js';

export const WILDERNESS_COMMANDS=new Set(['acceptWildernessQuest','interactWilderness','reportWildernessQuest']);
const own=(o,k)=>Object.hasOwn(o,k),record=o=>o!==null&&typeof o==='object'&&Object.getPrototypeOf(o)===Object.prototype;
const count=n=>Number.isSafeInteger(n)&&n>=0,exact=(o,keys)=>record(o)&&Object.keys(o).length===keys.length&&keys.every(k=>own(o,k));
const clone=o=>JSON.parse(JSON.stringify(o));
const FLAGS=Object.keys(WILDERNESS_PROGRESS_DEFAULTS),RESERVED=new Set(['__proto__','prototype','constructor']);
const region=WILDERNESS_REGIONS[WILDERNESS_REGION];
const REASONS={
 STORE_REVISION_REQUIRED:'현재 저장 버전과 신뢰된 처리 문맥이 필요합니다.',STALE_STORE_REVISION:'이전 저장 상태의 입력입니다. 최신 상태에서 다시 조작하세요.',REPORT_NOT_COMMITTED:'현재 자원과 회수 상태를 먼저 저장한 뒤 조작하세요.',
 INVALID_WILDERNESS_STATE:'황야 조사·갈고리·신호·보고 기록이 서로 맞지 않습니다.',INVALID_COMMAND:'황야 입력 형식이 올바르지 않습니다.',
 BATTLEFIELD_REPORT_REQUIRED:'실제 전문 승급과 봉화핵 회수 후 에다의 전장 보고가 필요합니다.',
 HERO_DOWN:'쓰러진 상태에서는 조작하거나 보고할 수 없습니다.',STALE_LIFE:'현재 생명의 입력만 처리할 수 있습니다.',STALE_ENCOUNTER:'이미 정산했거나 이전 생명의 전투입니다.',
 STALE_REVISION:'이전 황야 화면의 입력입니다. 현재 목표를 다시 확인하세요.',STALE_STEP:'수신판 순서가 바뀌었습니다. 현재 단계를 다시 확인하세요.',REVISION_LIMIT:'황야 입력 기록 한도에 도달했습니다.',
 INVALID_REPORT:'현재 위치·자원·회수 상태를 확인할 수 없습니다.',ELDER_REQUIRED:'마을 촌장 에다 가까이에서 대화하세요.',WALL_BLOCKED:'벽이나 닫힌 문 너머에서는 조작할 수 없습니다.',
 ALREADY_ACCEPTED:'이미 황야 조사를 수락했습니다.',QUEST_REQUIRED:'에다에게 황야 조사를 먼저 받으세요.',UNKNOWN_OBJECT:'이 지역의 황야 장치가 아닙니다.',OBJECT_REQUIRED:'해당 황야 장치 가까이로 이동하세요.',
 GUARDS_ALIVE:'이 장치를 지키는 적을 먼저 처치하세요.',SURVEY_REQUIRED:'파손된 측량판의 순서를 먼저 읽으세요.',HOOK_REQUIRED:'무료 신호 갈고리를 먼저 직접 챙기세요.',ANCHOR_REQUIRED:'갈고리를 귀환 닻에 걸어 다리를 먼저 연결하세요.',
 CALIBRATION_REQUIRED:'기록에 적힌 순서로 수신판을 조정하세요.',CHOICE_REQUIRED:'교전 전에 엄폐판 유지 또는 중앙 통로 개방을 선택하세요.',RELAY_REQUIRED:'교전 후 신호 중계기를 먼저 작동하세요.',
 BOSS_REQUIRED:'신호지기를 먼저 처치하세요.',EVIDENCE_REQUIRED:'신호지기 처치 후 기록핵을 따로 회수하세요.',ALREADY_CLAIMED:'이미 완료하거나 받은 황야 보상입니다.',
 UNKNOWN_GATE:'알 수 없는 황야 출입 조건입니다.',PORTAL_REQUIRED:'해당 황야 출입구 가까이로 이동하세요.',UNKNOWN_ENEMY:'이 지역의 적만 정산할 수 있습니다.',ENCOUNTER_LOCKED:'아직 열리지 않은 전투입니다.',NOT_DOWN:'아직 쓰러지지 않았습니다.',
 RECEIPT_LIMIT:'보상 기록 한도에 도달했습니다. 기존 기록은 삭제하지 않습니다.',VALUE_OVERFLOW:'보상 수치 한도를 넘습니다.',
};
const fail=code=>({ok:false,code,reason:REASONS[code]??code});
function jsonData(value,parents=new Set(),depth=0,budget={left:250000}){
 if(--budget.left<0||depth>40)return false;
 if(value===null||typeof value==='boolean'||typeof value==='string')return true;
 if(typeof value==='number')return Number.isFinite(value);
 if(typeof value!=='object'||parents.has(value)||(!Array.isArray(value)&&!record(value))||Object.getOwnPropertySymbols(value).length)return false;
 const entries=Object.entries(Object.getOwnPropertyDescriptors(value)).filter(([k])=>!(Array.isArray(value)&&k==='length'));
 if(Array.isArray(value)&&(Object.getPrototypeOf(value)!==Array.prototype||entries.length!==value.length||entries.some(([k],i)=>k!==String(i))))return false;
 if(entries.some(([k,d])=>RESERVED.has(k)||!own(d,'value')||!d.enumerable))return false;
 parents.add(value);const valid=entries.every(([,d])=>jsonData(d.value,parents,depth+1,budget));parents.delete(value);return valid;
}
const list=(v,max=4096)=>Array.isArray(v)&&v.length<=max&&v.every(x=>typeof x==='string'&&x.length>0&&x.length<=100)&&new Set(v).size===v.length;
const has=(s,id)=>s.world.claimedRewards.includes(id),dead=s=>s.world.defeated?.[WILDERNESS_REGION]??[];
export const wildernessGroupCleared=(s,group)=>own(WILDERNESS_GROUPS,group)&&WILDERNESS_GROUPS[group].every(id=>dead(s).includes(id));
export const wildernessInputRevision=s=>s.world?.objectives?.wilderness_revision??0;
export function wildernessMap(s){return mapFromRegion(region,s.world.objectives);}
const currentRegion=s=>s.world.region===WILDERNESS_REGION?region:getRegion(s.world.region);
const currentMap=s=>s.world.region===WILDERNESS_REGION?wildernessMap(s):createMap(s.world.region,s);
function poolsValid(s){
 const w=s.world;if(!count(w.life)||typeof w.lifeDown!=='boolean'||!exact(w.position,['x','y'])||!Object.values(w.position).every(Number.isFinite)||!exact(s.vitals,['hp','mana','stamina']))return false;
 const derived=deriveStats(s.character,s);if(!derived.ok)return false;
 if(!Object.entries(s.vitals).every(([k,v])=>Number.isFinite(v)&&v>=0&&v<=derived.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]])||w.lifeDown!==(s.vitals.hp===0)||!validateRecovery(s.recovery,{character:s.character}))return false;
 const map=currentMap(s);return !!map&&inMap(map,w.position.x,w.position.y);
}
function economyValid(s){return count(s.gold)&&record(s.stats)&&['earnedGold','spentGold','kills','deaths'].every(k=>count(s.stats[k]))&&s.stats.earnedGold-s.stats.spentGold===s.gold&&Number.isFinite(s.stats.earnedXp)&&s.stats.earnedXp>=0&&s.stats.earnedXp<=Number.MAX_SAFE_INTEGER&&record(s.inventory.materials)&&record(s.inventory.consumables)&&[...Object.values(s.inventory.materials),...Object.values(s.inventory.consumables)].every(count)&&trainingGoldBalances(s).ok;}
const reportedB=s=>battlefieldEligible(s)&&s.world.objectives.battlefield_reported===1&&s.world.objectives.chapter_three_complete===1&&s.inventory.tools.includes('battlefield_beacon')&&has(s,'r11:b:report');
// Reuse only immutable, complete input snapshots. Mutable/untrusted trees use
// the original validators every time; no caller-provided validity flag exists.
// Cache immutable copies and return fresh results so caller edits cannot change
// a later validation decision. The identity is the entire state, not a revision.
const ancestryValidationCache=new WeakMap(),progressValidationCache=new WeakMap();
function immutableValidation(cache,s,validate){
 if(!isImmutableSnapshot(s))return validate(s);
 if(!cache.has(s))cache.set(s,Object.freeze({...validate(s)}));
 return {...cache.get(s)};
}
export function validateWildernessAncestry(s){return immutableValidation(ancestryValidationCache,s,validateWildernessAncestryUncached);}
export function validateWildernessProgress(s){return immutableValidation(progressValidationCache,s,validateWildernessProgressUncached);}
/** Validate the real registered region and complete predecessor history. */
function validateWildernessAncestryUncached(s){
 if(!jsonData(s)||!record(s)||!record(s.world)||!record(s.world.objectives)||!record(s.inventory)||!list(s.inventory.tools,100)||!list(s.world.claimedRewards)||!list(s.world.visited,200)||!s.world.visited.includes(s.world.region)||!s.world.visited.includes('ash_hamlet')||!poolsValid(s))return fail('INVALID_WILDERNESS_STATE');
 if(!Object.values(s.world.objectives).every(count)||Object.keys(s.world.objectives).length>500||!record(s.world.defeated)||!Object.entries(s.world.defeated).every(([id,ids])=>{const r=id===WILDERNESS_REGION?region:getRegion(id);return r&&list(ids,100)&&ids.every(enemyId=>r.foes.some(e=>e.id===enemyId));}))return fail('INVALID_WILDERNESS_STATE');
 if(s.schema!=='emberwatch.reborn.reimplementation'||s.version!==5||!['easy','normal','hard','serious'].includes(s.difficulty)||!validateCharacter(s.character).ok||!validateWarriorGrowth(s.character,s).ok||!validatePromotion(s).ok||!validateEquipmentState(s).ok||!validateSavedActionSlots(s).ok||!economyValid(s))return fail('INVALID_WILDERNESS_STATE');
 if(!reportedB(s))return fail('BATTLEFIELD_REPORT_REQUIRED');
 // Do not rely on a transitive chain: Quarry does not own Dungeon validation.
 const validators=[validateDungeonProgress,validateQuarryProgress,validatePassProgress,validateSignalProgress,validateFurnaceProgress,validateTombProgress,validateBattlefieldProgress];
 return validators.every(validate=>validate(s).ok)?{ok:true}:fail('INVALID_WILDERNESS_STATE');
}
/** W-owned bidirectional invariants; untouched saves receive no defaults.
 * Full production state/save-envelope validation remains a separate gate. */
function validateWildernessProgressUncached(s){
 if(!jsonData(s)||!record(s)||!record(s.world)||!record(s.world.objectives)||!list(s.world.claimedRewards)||!record(s.inventory)||!list(s.inventory.tools,100))return fail('INVALID_WILDERNESS_STATE');
 const w=s.world,o=w.objectives,tools=s.inventory.tools;
 if(w.defeated!==undefined&&(!record(w.defeated)||!Object.values(w.defeated).every(v=>list(v,100)))||w.visited!==undefined&&!list(w.visited,200))return fail('INVALID_WILDERNESS_STATE');
 if(dead(s).some(id=>!region.foes.some(e=>e.id===id))||Object.keys(o).some(k=>k.startsWith('wilderness_')&&!FLAGS.includes(k))||w.claimedRewards.some(id=>id.startsWith('r12:w')&&!WILDERNESS_RECEIPTS.includes(id))||tools.some(id=>id.startsWith('wilderness_')&&!own(WILDERNESS_TOOLS,id)))return fail('INVALID_WILDERNESS_STATE');
 const active=FLAGS.some(k=>own(o,k))||w.claimedRewards.some(id=>id.startsWith('r12:w'))||tools.some(id=>id.startsWith('wilderness_'))||w.region===WILDERNESS_REGION||(w.visited??[]).includes(WILDERNESS_REGION)||own(w.defeated??{},WILDERNESS_REGION);
 if(!active)return {ok:true};
 if(Object.keys(o).length>500||!FLAGS.every(k=>own(o,k)&&count(o[k])&&o[k]<=(k==='wilderness_revision'?Number.MAX_SAFE_INTEGER:k==='wilderness_mode'?2:k==='wilderness_sequence_step'?3:1))||o.wilderness_revision<1||o.wilderness_accepted!==1||!validateWildernessAncestry(s).ok)return fail('INVALID_WILDERNESS_STATE');
 const pairs=[['wilderness_accepted','accept'],['wilderness_surveyed','survey'],['wilderness_hook_taken','hook'],['wilderness_anchored','anchor'],['wilderness_calibrated','calibrate'],['wilderness_routed','relay'],['wilderness_evidence_taken','evidence'],['wilderness_scouts_rescued','scouts'],['wilderness_reported','report']];
 if(pairs.some(([flag,id])=>Boolean(o[flag])!==has(s,'r12:w:'+id))||Boolean(o.wilderness_mode)!==has(s,'r12:w:choice'))return fail('INVALID_WILDERNESS_STATE');
 if([['wilderness_surveyed','wilderness_survey'],['wilderness_hook_taken','wilderness_hook'],['wilderness_evidence_taken','wilderness_evidence']].some(([flag,tool])=>Boolean(o[flag])!==tools.includes(tool)))return fail('INVALID_WILDERNESS_STATE');
 if((w.region===WILDERNESS_REGION||own(w.defeated??{},WILDERNESS_REGION)||FLAGS.some(k=>!['wilderness_accepted','wilderness_revision'].includes(k)&&o[k]))&&!(w.visited??[]).includes(WILDERNESS_REGION))return fail('INVALID_WILDERNESS_STATE');
 if(o.wilderness_surveyed&&!wildernessGroupCleared(s,'survey')||o.wilderness_hook_taken&&(!o.wilderness_surveyed||!wildernessGroupCleared(s,'anchor'))||o.wilderness_anchored&&!o.wilderness_hook_taken)return fail('INVALID_WILDERNESS_STATE');
 if(o.wilderness_sequence_step&&(!o.wilderness_anchored||!wildernessGroupCleared(s,'receiver'))||Boolean(o.wilderness_calibrated)!==(o.wilderness_sequence_step===3)||o.wilderness_mode&&!o.wilderness_calibrated||Boolean(o.wilderness_channel_open)!==(o.wilderness_mode===2))return fail('INVALID_WILDERNESS_STATE');
 if(o.wilderness_routed&&(!o.wilderness_mode||!wildernessGroupCleared(s,'relay'))||Boolean(o.wilderness_keeper_open)!==wildernessGroupCleared(s,'approach')||o.wilderness_evidence_taken&&!wildernessGroupCleared(s,'boss')||o.wilderness_scouts_rescued&&(!o.wilderness_evidence_taken||!wildernessGroupCleared(s,'scouts'))||o.wilderness_reported&&!o.wilderness_evidence_taken)return fail('INVALID_WILDERNESS_STATE');
 if(dead(s).some(id=>{const e=region.foes.find(e=>e.id===id);return !(o[e.gate]>=1);}))return fail('INVALID_WILDERNESS_STATE');
 const minimum=pairs.reduce((n,[flag])=>n+o[flag],0)+Number(Boolean(o.wilderness_mode))+Math.min(o.wilderness_sequence_step,2);
 if(o.wilderness_revision<minimum)return fail('INVALID_WILDERNESS_STATE');
 return {ok:true};
}
export function wildernessEligible(s){return validateWildernessProgress(s).ok&&validateWildernessAncestry(s).ok;}
export function wildernessClue(s){return validateWildernessProgress(s).ok&&s.world.objectives.wilderness_surveyed?{...WILDERNESS_CLUE,step:s.world.objectives.wilderness_sequence_step,solved:!!s.world.objectives.wilderness_calibrated}:null;}
/** Mutate only the caller's isolated candidate, just like prior travel tokens. */
export function invalidateWildernessInput(next){if(!next.world.objectives.wilderness_accepted)return {ok:true};const n=wildernessInputRevision(next);if(!count(n)||n>=Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');next.world.objectives.wilderness_revision=n+1;return {ok:true};}
/** Call after permanent defeats, before post-state validation. No reward here. */
export function synchronizeWildernessCombatProgress(next){const o=next.world.objectives;if(!o.wilderness_accepted)return {ok:true,mapChanged:false};const open=Number(wildernessGroupCleared(next,'approach')),changed=o.wilderness_keeper_open!==open;o.wilderness_keeper_open=open;return {ok:true,mapChanged:changed};}
export function wildernessPortalAllowed(s,portal){
 const valid=validateWildernessProgress(s);if(!valid.ok)return valid;
 if(!jsonData(portal,new Set(),0,{left:1000})||!record(portal)||portal.gate!==undefined&&portal.gate!==null&&!['wilderness_entry','wilderness_anchor_return','wilderness_keeper_return'].includes(portal.gate))return fail('UNKNOWN_GATE');
 if(!wildernessEligible(s))return fail('BATTLEFIELD_REPORT_REQUIRED');if(!s.world.objectives.wilderness_accepted)return fail('QUEST_REQUIRED');if(s.world.lifeDown||s.vitals.hp<=0)return fail('HERO_DOWN');
 if(portal.gate==='wilderness_anchor_return'&&!s.world.objectives.wilderness_anchored)return fail('ANCHOR_REQUIRED');
 if(portal.gate==='wilderness_keeper_return'&&!wildernessGroupCleared(s,'boss'))return fail('BOSS_REQUIRED');return {ok:true};
}
export function wildernessEncounterAllowed(s,id){const valid=validateWildernessProgress(s);if(!valid.ok)return valid;const e=region.foes.find(e=>e.id===id);if(!e)return fail('UNKNOWN_ENEMY');return s.world.region===WILDERNESS_REGION&&s.world.objectives[e.gate]>=1?{ok:true}:fail('ENCOUNTER_LOCKED');}
function reportValid(s,c){const d=deriveStats(s.character,s),map=currentMap(s);return d.ok&&map&&exact(c.position,['x','y'])&&Object.values(c.position).every(Number.isFinite)&&inMap(map,c.position.x,c.position.y)&&exact(c.vitals,['hp','mana','stamina'])&&Object.entries(c.vitals).every(([k,v])=>Number.isFinite(v)&&v>=0&&v<=d.stats[{hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}[k]])&&validateRecovery(c.recovery,{character:s.character});}
function commandValid(s,c){
 if(!jsonData(c,new Set(),0,{left:1500})||!record(c)||!WILDERNESS_COMMANDS.has(c.type))return false;
 const interaction=c.type==='interactWilderness',o=interaction?region.objects.find(o=>o.id===c.objectId):null;
 return exact(c,['type','position','life','vitals','recovery','expectedStoreRevision','expectedRevision',...(interaction?['objectId']:[]),...(o?.actionKind==='glyph'?['expectedStep']:[]),...(o?.actionKind==='choice'?['choice']:[])])&&count(c.life)&&count(c.expectedRevision)&&(!interaction||typeof c.objectId==='string'&&c.objectId.length>0&&c.objectId.length<=100)&&(o?.actionKind!=='glyph'||count(c.expectedStep)&&c.expectedStep<=3)&&(o?.actionKind!=='choice'||typeof c.choice==='string'&&own(WILDERNESS_MODES,c.choice))&&reportValid(s,c);
}
function receipt(next,id){if(has(next,id))return fail('ALREADY_CLAIMED');if(next.world.claimedRewards.length>=4096)return fail('RECEIPT_LIMIT');next.world.claimedRewards.push(id);return {ok:true};}
function grant(next,xp,gold,events){const gain=grantExperience(next.character,xp);if(!gain.ok)return gain;const totalXp=Math.round((next.stats.earnedXp+gain.appliedXp)*1e6)/1e6;if(!count(next.gold+gold)||!count(next.stats.earnedGold+gold)||!Number.isFinite(totalXp)||totalXp>Number.MAX_SAFE_INTEGER)return fail('VALUE_OVERFLOW');next.character=gain.character;next.gold+=gold;next.stats.earnedGold+=gold;next.stats.earnedXp=totalXp;if(gain.gainedLevels)events.push({type:'levelUp',levels:gain.gainedLevels});return {ok:true,appliedXp:gain.appliedXp};}
function reward(next,id,events){const added=receipt(next,id);if(!added.ok)return added;const row=WILDERNESS_REWARDS[id],gain=grant(next,row.xp,row.gold,events);if(!gain.ok)return gain;for(const [field,values]of [['materials',row.materials],['consumables',row.consumables]])for(const [key,n]of Object.entries(values)){const total=(next.inventory[field][key]??0)+n;if(!count(total))return fail('VALUE_OVERFLOW');next.inventory[field][key]=total;}events.push({type:'wildernessReward',rewardId:id,xp:gain.appliedXp,gold:row.gold});return {ok:true};}
function tool(next,id){if(next.inventory.tools.includes(id))return fail('ALREADY_CLAIMED');if(next.inventory.tools.length>=100)return fail('VALUE_OVERFLOW');next.inventory.tools.push(id);return {ok:true};}
// The store revision is supplied separately by the trusted controller. Never
// infer it from a command, W objective revision, or state content.
function freshness(c,context){
 if(!jsonData(c,new Set(),0,{left:2000})||!record(c))return fail('INVALID_COMMAND');
 if(!jsonData(context,new Set(),0,{left:100})||!exact(context,['revision'])||!count(context.revision)||!count(c.expectedStoreRevision))return fail('STORE_REVISION_REQUIRED');
 return c.expectedStoreRevision===context.revision?{ok:true}:fail('STALE_STORE_REVISION');
}
const sameData=(a,b)=>a===b||record(a)&&record(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>own(b,k)&&sameData(a[k],b[k]))||Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>sameData(v,b[i]));
function snapshot(next,c){next.world.position={...c.position};next.vitals={...c.vitals};next.recovery=recoveryFrom(c);}
function finish(next,events){const v=validateWildernessProgress(next);return v.ok?{ok:true,state:next,events}:v;}
export function reduceWilderness(s,c,context){
 const valid=validateWildernessProgress(s);if(!valid.ok)return valid;
 if(!commandValid(s,c))return fail('INVALID_COMMAND');
 if(s.world.lifeDown||s.vitals.hp<=0||c.vitals.hp<=0)return fail('HERO_DOWN');if(c.life!==s.world.life)return fail('STALE_LIFE');if(c.expectedRevision!==wildernessInputRevision(s))return fail('STALE_REVISION');if(c.expectedRevision===Number.MAX_SAFE_INTEGER)return fail('REVISION_LIMIT');
 const fresh=freshness(c,context);if(!fresh.ok)return fresh;
 const ancestor=validateWildernessAncestry(s);if(!ancestor.ok)return ancestor;
 // Objectives are promotion-style transactions over committed pools/recovery.
 // Even re-stamping an old report must never restore HP, paid CDs or RNG.
 if(!sameData(c.vitals,s.vitals)||!sameData(c.recovery,s.recovery))return fail('REPORT_NOT_COMMITTED');
 const next=clone(s),o=next.world.objectives,events=[],map=currentMap(s);let mapChanged=false;snapshot(next,c);
 if(c.type!=='interactWilderness'){
  const elder=currentRegion(s).npcs.find(n=>n.id==='elder');if(s.world.region!=='ash_hamlet'||!elder||!near(c.position,elder))return fail('ELDER_REQUIRED');if(!lineOfSight(map,c.position,elder))return fail('WALL_BLOCKED');
  if(c.type==='acceptWildernessQuest'){
   if(o.wilderness_accepted)return fail('ALREADY_ACCEPTED');const added=receipt(next,'r12:w:accept');if(!added.ok)return added;if(Object.keys(o).length+FLAGS.length>500)return fail('VALUE_OVERFLOW');Object.assign(o,WILDERNESS_PROGRESS_DEFAULTS);
  }else{
   if(!o.wilderness_accepted)return fail('QUEST_REQUIRED');if(!o.wilderness_evidence_taken)return fail('EVIDENCE_REQUIRED');const added=reward(next,'r12:w:report',events);if(!added.ok)return added;o.wilderness_reported=1;events.push({type:'wildernessReported',nextNpcId:'blacksmith',nextRegionImplemented:false});
  }
 }else{
  if(!o.wilderness_accepted)return fail('QUEST_REQUIRED');const object=currentRegion(s).objects.find(o=>o.type==='wilderness'&&o.id===c.objectId);if(!object)return fail('UNKNOWN_OBJECT');if(!near(c.position,object))return fail('OBJECT_REQUIRED');if(!lineOfSight(map,c.position,object))return fail('WALL_BLOCKED');
  const award=(id,flag)=>{const r=reward(next,'r12:w:'+id,events);if(r.ok)o[flag]=1;return r;};let result={ok:true};
  switch(object.actionKind){
   case 'survey':if(o.wilderness_surveyed)return fail('ALREADY_CLAIMED');if(!wildernessGroupCleared(s,'survey'))return fail('GUARDS_ALIVE');result=tool(next,'wilderness_survey');if(result.ok)result=award('survey','wilderness_surveyed');mapChanged=true;break;
   case 'hook':if(o.wilderness_hook_taken)return fail('ALREADY_CLAIMED');if(!o.wilderness_surveyed)return fail('SURVEY_REQUIRED');if(!wildernessGroupCleared(s,'anchor'))return fail('GUARDS_ALIVE');result=tool(next,'wilderness_hook');if(result.ok)result=receipt(next,'r12:w:hook');if(result.ok)o.wilderness_hook_taken=1;break;
   case 'anchor':if(o.wilderness_anchored)return fail('ALREADY_CLAIMED');if(!o.wilderness_hook_taken)return fail('HOOK_REQUIRED');result=award('anchor','wilderness_anchored');mapChanged=true;break;
   case 'glyph':{
    if(o.wilderness_calibrated)return fail('ALREADY_CLAIMED');if(!o.wilderness_anchored)return fail('ANCHOR_REQUIRED');if(!wildernessGroupCleared(s,'receiver'))return fail('GUARDS_ALIVE');if(c.expectedStep!==o.wilderness_sequence_step)return fail('STALE_STEP');
    const matched=object.glyph===WILDERNESS_SEQUENCE[o.wilderness_sequence_step];o.wilderness_sequence_step=matched?o.wilderness_sequence_step+1:0;
    events.push({type:'wildernessSequenceChanged',matched,step:o.wilderness_sequence_step,reason:matched?'기록과 일치합니다.':'순서가 달라 진행 중인 입력만 처음으로 돌아갑니다. '+WILDERNESS_CLUE.sequenceText});
    if(o.wilderness_sequence_step===3){result=award('calibrate','wilderness_calibrated');mapChanged=true;}break;
   }
   case 'choice':if(o.wilderness_mode)return fail('ALREADY_CLAIMED');if(!o.wilderness_calibrated)return fail('CALIBRATION_REQUIRED');result=receipt(next,'r12:w:choice');if(result.ok){o.wilderness_mode=WILDERNESS_MODES[c.choice].value;o.wilderness_channel_open=Number(c.choice==='channel');events.push({type:'wildernessModeChosen',mode:c.choice});mapChanged=true;}break;
   case 'relay':if(o.wilderness_routed)return fail('ALREADY_CLAIMED');if(!o.wilderness_mode)return fail('CHOICE_REQUIRED');if(!wildernessGroupCleared(s,'relay'))return fail('GUARDS_ALIVE');result=award('relay','wilderness_routed');mapChanged=true;break;
   case 'evidence':if(o.wilderness_evidence_taken)return fail('ALREADY_CLAIMED');if(!o.wilderness_routed)return fail('RELAY_REQUIRED');if(!wildernessGroupCleared(s,'boss'))return fail('BOSS_REQUIRED');result=tool(next,'wilderness_evidence');if(result.ok)result=award('evidence','wilderness_evidence_taken');mapChanged=true;break;
   case 'scouts':if(o.wilderness_scouts_rescued)return fail('ALREADY_CLAIMED');if(!o.wilderness_evidence_taken)return fail('EVIDENCE_REQUIRED');if(!wildernessGroupCleared(s,'scouts'))return fail('GUARDS_ALIVE');result=award('scouts','wilderness_scouts_rescued');events.push({type:'wildernessScoutsRescued'});break;
   default:return fail('UNKNOWN_OBJECT');
  }
  if(!result.ok)return result;
 }
 o.wilderness_revision=c.expectedRevision+1;events.push({type:'wildernessChanged',...(c.objectId?{objectId:c.objectId}:{}),mapChanged});return finish(next,events);
}

/** Detached W production-runtime handlers. The parent may route these generic
 * commands here OR integrate the identical content/guards in campaign.js, never
 * both. This export is not registered with reduceRuntime/controller/save yet. */
export function reduceWildernessRuntime(s,c,context){
 if(jsonData(c,new Set(),0,{left:2000})&&record(c)&&WILDERNESS_COMMANDS.has(c.type))return reduceWilderness(s,c,context);
 const valid=validateWildernessProgress(s);if(!valid.ok)return valid;
 if(!jsonData(c,new Set(),0,{left:2000})||!record(c)||!['travel','settleCombat','checkpoint','retry'].includes(c.type))return fail('INVALID_COMMAND');
 if(!s.world.objectives.wilderness_accepted)return fail('QUEST_REQUIRED');
 const next=clone(s),events=[];
 if(c.type==='retry'){
  const fresh=freshness(c,context);if(!fresh.ok)return fresh;
  if(!exact(c,['type','expectedStoreRevision']))return fail('INVALID_COMMAND');if(!s.world.lifeDown)return fail('NOT_DOWN');if(s.world.region!==WILDERNESS_REGION)return fail('INVALID_REPORT');if(!count(s.world.life+1))return fail('VALUE_OVERFLOW');
  const d=deriveStats(s.character,s).stats;next.vitals={hp:d.hpMax,mana:d.manaMax,stamina:d.staminaMax};next.recovery=retryRecovery(s.recovery);next.world.life++;next.world.lifeDown=false;next.world.region='ash_hamlet';next.world.position={...getRegion('ash_hamlet').spawn};events.push({type:'retried'});return finish(next,events);
 }
 const extras=c.type==='travel'?['portalId','to']:c.type==='settleCombat'?['defeated']:[];
 if(!exact(c,['type','position','life','vitals','recovery','expectedStoreRevision',...extras])||!count(c.life)||!reportValid(s,c))return fail('INVALID_REPORT');
 if(c.life!==s.world.life||s.world.lifeDown)return fail(c.type==='settleCombat'?'STALE_ENCOUNTER':c.life!==s.world.life?'STALE_LIFE':'HERO_DOWN');
 const fresh=freshness(c,context);if(!fresh.ok)return fresh;
 if(c.type==='travel'){
  if(c.vitals.hp<=0)return fail('HERO_DOWN');const portals=s.world.region===WILDERNESS_REGION?region.portals:s.world.region==='ash_hamlet'?WILDERNESS_LINKS.ash_hamlet:[];
  const portal=portals.find(p=>p.id===c.portalId&&p.to===c.to);if(!portal||!near(c.position,portal))return fail('PORTAL_REQUIRED');if(!lineOfSight(currentMap(s),c.position,portal))return fail('WALL_BLOCKED');const allowed=wildernessPortalAllowed(s,portal);if(!allowed.ok)return allowed;
  for(const invalidate of [invalidateWildernessInput,invalidateBattlefieldInput,invalidateTombInput]){const r=invalidate(next);if(!r.ok)return r;}
  snapshot(next,c);next.world.region=portal.to;next.world.position={...portal.arrival};if(!next.world.visited.includes(portal.to)){if(next.world.visited.length>=200)return fail('VALUE_OVERFLOW');next.world.visited.push(portal.to);}events.push({type:'travelled',region:portal.to});return finish(next,events);
 }
 if(s.world.region!==WILDERNESS_REGION)return fail('INVALID_REPORT');
 if(c.type==='checkpoint'){if(c.vitals.hp<=0)return fail('HERO_DOWN');snapshot(next,c);return finish(next,events);}
 if(!list(c.defeated,100))return fail('INVALID_REPORT');for(const id of c.defeated){const allowed=wildernessEncounterAllowed(s,id);if(!allowed.ok)return allowed;}
 snapshot(next,c);next.world.defeated??={};const receipts=next.world.defeated[WILDERNESS_REGION]??=[];let kills=0;
 for(const id of c.defeated){if(receipts.includes(id))continue;const f=WILDERNESS_FOES[region.foes.find(e=>e.id===id).kind];const added=grant(next,f.xp*experienceMultiplier(next.character.level,f.tier,next.difficulty),f.gold,events);if(!added.ok)return added;if(!count(next.stats.kills+1))return fail('VALUE_OVERFLOW');receipts.push(id);next.stats.kills++;kills++;}
 const mapChanged=synchronizeWildernessCombatProgress(next).mapChanged;
 // Match campaign settlement: all same-frame kills precede a single death fee.
 // Objective/travel handlers never heal. Existing combat level-up recovery and
 // explicit death retry retain their established, disclosed recovery behavior.
 if(c.vitals.hp===0){next.recovery.regenBuff=null;next.recovery.innerFlame=null;next.recovery.negativeStatuses={};const wallet=trainingGoldBalances(next);if(!wallet.ok)return wallet;const loss=Math.floor(wallet.spendableGold*.05);if(!count(next.stats.spentGold+loss)||!count(next.stats.deaths+1))return fail('VALUE_OVERFLOW');next.gold-=loss;next.stats.spentGold+=loss;next.stats.deaths++;next.world.lifeDown=true;events.push({type:'died',lostGold:loss});}
 else if(events.some(e=>e.type==='levelUp')){const d=deriveStats(next.character,next).stats;for(const [pool,max]of Object.entries({hp:'hpMax',mana:'manaMax',stamina:'staminaMax'}))next.vitals[pool]=Math.min(d[max],next.vitals[pool]+d[max]*.25);}
 events.push({type:'combatSettled',kills},{type:'wildernessChanged',mapChanged});return finish(next,events);
}
