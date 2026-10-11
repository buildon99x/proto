// Pure physical token -> slot -> learned skill capture. No casting, payment,
// target selection, or simulation clock advances occur in this adapter.
import {validToken} from './controls.js';
import {SKILL_SLOTS} from './skill-loadout.js';
import {ACTION_SKILL_IDS} from './warrior-growth.js';
import {SAVE_INPUT_WINDOW_MS} from './immediate-input.js';
const active=id=>ACTION_SKILL_IDS.includes(id);
const tokenValid=token=>typeof token==='string'&&(validToken(token)||/^Touch:(attack|hammer|block|charge|judgement|heal|expert1|expert2)(?::\d{1,12})?$/.test(token));
const pointer=token=>/^(Mouse|Touch:)/.test(token);
const flags=()=>Object.fromEntries(ACTION_SKILL_IDS.map(id=>[id,false]));
const channelValue=(owner,extra={})=>({ownerToken:owner.ownerToken,held:true,released:false,cancelReason:null,...extra});

// A single newest save-wait intent. It cannot be retargeted after rebinding,
// skill assignment, life/region changes, or a replacement runtime/controller.
export function createSkillLoadoutSaveInput(){
 let pending=null,serial=0;
 const clear=()=>{pending=null;};
 return {clear,
  offer(token,slot,id,{now,battle,owner,slots,controls,sequence}={}){
   clear();slots??=controls?.skillSlots;
   if(!tokenValid(token)||!SKILL_SLOTS.includes(slot)||!active(id)||!Number.isFinite(now)||!battle||!owner||controls?.version!==5||slots?.[slot]!==id||controls.skillSlots?.[slot]!==id)return false;
   pending={token,slot,id,skillId:id,sequence:Number.isSafeInteger(sequence)&&sequence>0?sequence:++serial,time:now,now,guardToggle:id==='shield_block'&&controls.blockMode==='toggle',battle,owner,life:battle.stateLife,region:battle.region,slots:JSON.stringify(slots),controls:JSON.stringify(controls)};return true;
  },
  release(token,{cancelReason=null}={}){
   if(pending?.token!==token)return;
   if(pending.id==='zealous_onslaught'||pending.id==='shield_block'&&!pending.guardToggle||cancelReason&&!(cancelReason==='lostpointercapture'&&pending.released))clear();else pending.released=true;
  },
  releasePointer(){if(pending&&!pending.released&&pointer(pending.token))clear();},
  flush({now,battle,owner,slots,controls,busy=false,paused=false,blocked=false,lifeDown=false,focused=true,hidden=false},execute){
   if(!pending)return {status:'idle'};slots??=controls?.skillSlots;const intent=pending;
   if(paused||blocked||lifeDown||!focused||hidden||battle!==intent.battle||owner!==intent.owner||battle?.stateLife!==intent.life||battle?.region!==intent.region||JSON.stringify(slots)!==intent.slots||JSON.stringify(controls)!==intent.controls){clear();return {status:'cancelled'};}
   if(!Number.isFinite(now)||now<intent.time||now-intent.time>SAVE_INPUT_WINDOW_MS){clear();return {status:'expired'};}
   if(busy)return {status:'waiting'};
   clear();execute({...intent});return {status:'dispatched'};
  }
 };
}

export function createSkillLoadoutInput({now=()=>performance.now()}={}){
 const deferred=createSkillLoadoutSaveInput(),held=new Map(),released=new Map();
 let sequence=0,pending=null,owner=null,termination=null,toggle=false,guardPulse=false;
 const offerDeferred=deferred.offer;deferred.offer=(token,slot,id,context={})=>offerDeferred(token,slot,id,{...context,sequence:Number.isSafeInteger(context.sequence)&&context.sequence>0?(sequence=Math.max(sequence,context.sequence),context.sequence):++sequence});
 const isHeld=id=>[...held.values()].some(intent=>intent.id===id);
 function press(token,slot,controls,{canUse=()=>false,repeat=false,editable=false,modified=false,paused=false,time=now(),sequence:capturedSequence}={}){
  if(!tokenValid(token)||!SKILL_SLOTS.includes(slot)||controls?.version!==5||repeat||editable||modified||paused||held.has(token)||!Number.isFinite(time))return null;
  const id=controls.skillSlots?.[slot],allowed=active(id)&&canUse(id);
  // Track refused physical down too: assignment or learning while held cannot
  // turn an old key into a newly pressed action. Release/fresh press is needed.
  const intent=Object.freeze({token,slot,id:allowed?id:null,skillId:allowed?id:null,sequence:Number.isSafeInteger(capturedSequence)&&capturedSequence>0?(sequence=Math.max(sequence,capturedSequence),capturedSequence):++sequence,time});
  const alias=active(id)&&isHeld(id);held.set(token,intent);
  if(!allowed){pending=null;guardPulse=false;toggle=false;if(owner&&!owner.delivered)owner=null;return null;}
  if(termination)return null;
  released.delete(id);
  if(id==='zealous_onslaught'){
   if(owner){if(owner.slot===slot&&!owner.delivered)owner.tokens.add(token);return null;}
   owner={ownerToken:`SkillCapture:${intent.sequence}`,slot,id,tokens:new Set([token]),delivered:false};
  }else if(alias)return null;
  if(owner&&!owner.delivered&&id!==owner.id)owner=null;
  if(id==='shield_block'){if(controls.blockMode==='toggle')toggle=!toggle;guardPulse=true;}else{toggle=false;guardPulse=false;}
  pending=intent;return {...intent};
 }
 function up(token,{cancelReason=null}={}){
  deferred.release(token,{cancelReason});const intent=held.get(token);held.delete(token);
  if(intent?.id&&!isHeld(intent.id))released.set(intent.id,{...intent});
  if(cancelReason&&pending?.token===token)pending=null;
  if(!owner||!owner.tokens.has(token))return intent?{...intent}:null;
  if(cancelReason){clear(cancelReason);return intent?{...intent}:null;}
  owner.tokens.delete(token);if(owner.tokens.size)return intent?{...intent}:null;
  if(owner.delivered)termination=channelValue(owner,{held:false,released:true});
  else if(pending?.id==='zealous_onslaught')pending=null;
  owner=null;return intent?{...intent}:null;
 }
 function clear(reason='safety'){
  deferred.clear();if(owner?.delivered)termination=channelValue(owner,{held:false,cancelReason:reason});else if(termination)termination={...termination,released:false,cancelReason:reason};
  owner=null;pending=null;held.clear();released.clear();toggle=false;guardPulse=false;
 }
 function snapshot(controls){
  const heldSkills=flags(),releasedSkills=flags();for(const intent of held.values())if(intent.id)heldSkills[intent.id]=true;
  heldSkills.zealous_onslaught=!!owner;for(const id of released.keys())releasedSkills[id]=true;
  const result={pressedSkillId:null,pressedSkill:null,heldSkills,releasedSkills,heldIntents:[...held.values()].filter(i=>i.id).map(i=>({...i})),releasedIntents:[...released.values()].map(i=>({...i})),block:controls?.blockMode==='toggle'?toggle:heldSkills.shield_block,guardPressed:guardPulse,channel:undefined};
  released.clear();guardPulse=false;
  if(termination){result.channel={...termination};termination=null;return result;}
  if(pending){result.pressedSkillId=pending.id;result.pressedSkill={...pending};pending=null;}
  if(owner){owner.delivered=true;result.channel=channelValue(owner);}
  return result;
 }
 return {deferred,press,up,clear,snapshot,isHeld:id=>id==='zealous_onslaught'?!!owner:isHeld(id),peekToken:token=>held.has(token)?{...held.get(token)}:null,breakGuard(){toggle=false;},owns:token=>!!owner?.tokens.has(token),hasPendingCombat:()=>!!pending||guardPulse||!!termination,
  expirePending(time,maxAge=SAVE_INPUT_WINDOW_MS){if(!pending||Number.isFinite(time)&&time>=pending.time&&time-pending.time<=maxAge)return [];const expired=pending.id;pending=null;if(owner&&!owner.delivered){for(const token of owner.tokens)held.delete(token);owner=null;}if(expired==='shield_block'){guardPulse=false;toggle=false;}return [expired];},
  reset({preserveDeferred=false}={}){if(!preserveDeferred)deferred.clear();pending=null;owner=null;termination=null;held.clear();released.clear();toggle=false;guardPulse=false;},
  releaseMouse(reason='pointer-cancel'){
   deferred.releasePointer();const tokens=[...held.keys()].filter(pointer),captured=owner&&tokens.some(token=>owner.tokens.has(token));
   if(pending&&tokens.includes(pending.token)){if(pending.id==='shield_block'){guardPulse=false;toggle=false;}pending=null;}
   for(const token of tokens){const intent=held.get(token);held.delete(token);if(intent?.id&&!isHeld(intent.id))released.set(intent.id,{...intent});}
   if(captured)clear(reason);return !!captured;
  }
 };
}

// Convert one captured identity to the existing combat contract, independently
// of its physical slot. Caller merges this AFTER base-router movement/mobility.
// No raw slot pulse may also reach combat for a v5 frame.
export function canonicalSkillInput(snapshot){
 const id=snapshot?.pressedSkillId??null,h=snapshot?.heldSkills??{};
 return {pressedSkillId:id,pressedSkill:snapshot?.pressedSkill??null,heldSkills:{...h},releasedSkills:{...snapshot?.releasedSkills},
  attack:!!h.mace_swing||id==='mace_swing',attackHeld:!!h.mace_swing,attackPressed:id==='mace_swing',
  hammer:id==='righteous_hammer',hammerPressed:id==='righteous_hammer',charge:id==='shield_charge',judgement:id==='judgement',heal:id==='lay_on_hands',
  block:!!snapshot?.block,guardPressed:!!snapshot?.guardPressed,expert1:['battle_banner','zealous_onslaught'].includes(id)?id:null,expert2:null,channel:snapshot?.channel,
  heldActions:{attack:!!h.mace_swing,hammer:!!h.righteous_hammer,block:!!h.shield_block,charge:!!h.shield_charge,judgement:!!h.judgement,heal:!!h.lay_on_hands,expert1:!!h.battle_banner||!!h.zealous_onslaught,expert2:false}};
}
