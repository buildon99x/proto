import {CRUSHER_RULES,crusherAvailability,crusherImmune,setCrusherMode,recordCrusherHit,crusherContactReady,commitCrusherPayoff,resetCrusherEnemy,stepCrusherEnemy} from './crusher-combat.js';
import {STORM_RULES,stormAvailability,setStormMode,stormPlacement,installStormBell,liveStormBells,recordStormEnemyHit,noteStormContact,stormPerfectStart,claimStormBellHit,consumeStormBell,stepStorm} from './storm-combat.js';
import {MAGMA_RULES,magmaAvailability,setMagmaMode,clearMagmaDefense,acceptMagmaIncoming,registerMagmaBlock,consumeMagmaRelease,stepMagma} from './magma-combat.js';
import {recordEnemyReaction,stepEnemyReaction,ENEMY_REACTION} from './enemy-reaction.js';
import {isPoeControls} from './controls.js';
import {moveActorBody,previewActorBody,relativePathContact} from './actor-body.js';
import {createPoeMobility} from './poe-mobility.js';
import {createAimIntent} from './aim-intent.js';
import {isPoeAimTargetValid} from './cursor-targeting.js';
import {REBORN_POE_MOBILITY_TUNING,skillMovementFactor,skillCanRetarget,skillCanDodgeCancel,skillPolicyDeadlines} from './poe-skill-policy.js';
import {lanceReleaseScale} from './warrior-expert.js';
import {sectorContains} from './fire-area-presentation.js';
import {HERO_STATUS_RULES,hasStatus} from './hero-status.js';
import {recoveryFrom} from './recovery.js';
import {WARRIOR_REFERENCE} from './reference-warrior.js';
import {CORE_REFERENCE} from './reference-core.js';
import {deriveStats} from './warrior-growth.js';
import {FOES,getRegion,createMap,inMap,lineOfSight,traceSegment,findPathStep} from './world.js';
import {advanceLocomotion} from './motion.js';
import {clearFireResponse,interruptFireEscape,observeFireExposure,stepFireEscape} from './furnace-fire-response.js';
import {initializePatternPhase,observePatternPhase,activatePendingPatternPhase,selectedEnemyPattern} from './boss-phase.js';
import {interruptBattlefieldRoleMovement,deferBattlefieldRoleMovement,recordBattlefieldRoleAttack,stepBattlefieldRoleMovement} from './battlefield-role-movement.js';

const innerFlameRows=WARRIOR_REFERENCE.skills.find(row=>row.id==='inner_flame').rankValues;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const impactHeading=(origin,target,fallback=0)=>distance(origin,target)>1e-9?Math.atan2(target.y-origin.y,target.x-origin.x):fallback;
const unit=(x,y)=>{const n=Math.hypot(x,y);return n>0?{x:x/n,y:y/n}:{x:0,y:0};};
const alive=e=>e.hp>0;
const foeFor=(b,e)=>b.foeTypes?.[e.kind]??FOES[e.kind];
// Emberwatch input tolerance: only the last 0.18s of current recovery.
// PoE intent ages with recovery (hitstop rate >= .35, active-time cap .18/.35);
// legacy intent retains its 0.18s active-frame lifetime. No skill/CD/damage changes.
const SKILL_INTENT_SECONDS=.18;
export function clearBattleIntent(b){if(b)b.skillIntent=null;}

const mobilityActions=['dodgeOnly','dodgeSprint','sprint'];
const skillInputs={mace_swing:'attack',righteous_hammer:'hammer',shield_charge:'charge',lay_on_hands:'heal',judgement:'judgement'};
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const poeHeld=(input,id)=>{const key=skillInputs[id];return key?(input.heldActions?.[key]??(key==='attack'?input.attackHeld??input.attack:false)):id==='zealous_onslaught'?!!input.channel?.held:!!(input.heldActions?.expert1||input.heldActions?.expert2);};
const poeSample=(input,id)=>input.aimBySkill?.[id]??{aim:input.aim,groundPoint:input.aim};
const mobilityHeld=(b,input)=>{const old=b.poeMobility.snapshot().held;return {dodgeSprint:old.dodgeSprint&&(input.dodgeSprintHeld??input.heldActions?.dodgeSprint??false),dodgeOnly:old.dodgeOnly&&(input.heldActions?.dodgeOnly??false),sprint:old.sprint&&(input.sprintHeld??input.heldActions?.sprint??false)};};
const poeAngle=(b,input,id)=>{const point=poeSample(input,id)?.aim;return finitePoint(point)?Math.atan2(point.y-b.p.y,point.x-b.p.x):b.p.angle;};
function initPoeBattle(b,state){
 const controls=state.options?.controls;if(!isPoeControls(controls))return b;
 b.poeInput={...controls.poe};b.poeNeedsFresh=b.poeNeedsFresh??{};
 const tuning=REBORN_POE_MOBILITY_TUNING;b.poeSprintBaseSpeed=b.stats.moveSpeed;
 b.poeMobility=createPoeMobility({tuning:{...tuning,sprintSpeed:b.stats.moveSpeed*tuning.sprintSpeedMultiplier},keepSprintingWhileMoving:controls.poe.keepSprintingWhileMoving,chooseRollDirection:({moveDirection,aimDirection})=>moveDirection??aimDirection});
 if(b.p.recoveryLock>0)b.poeMobility.restoreRecoveryDebt(b.p.recoveryLock);
 updatePoePresentation(b);return b;
}
// Run once after a successful controls commit, not during ordinary checkpoint
// synchronization. Live entities, skill spec, pools and paid cooldowns survive.
export function configurePoeControls(b,controls){
 if(!b)return [];
 const start=b.events.length,debt=Math.max(b.p.recoveryLock??0,b.poeMobility?.serializeRecoveryDebt()??0);
 clearPoeInput(b,'controls-changed');clearBattleIntent(b);b.p.recoveryLock=debt;b.requireFreshAttack=true;b.poeNeedsFresh={attack:true,hammer:true};
 if(isPoeControls(controls))initPoeBattle(b,{options:{controls}});
 else {delete b.poeMobility;delete b.poeInput;delete b.poeNeedsFresh;delete b.poeSprintBaseSpeed;b.p.presentationPose=null;}
 return b.events.slice(start);
}
const poeEvadeWindow=b=>{const m=b.poeMobility?.snapshot();return m?.state==='roll'&&m.elapsed>=REBORN_POE_MOBILITY_TUNING.evadeStart-1e-9&&m.elapsed<REBORN_POE_MOBILITY_TUNING.evadeEnd-1e-9;};
function updatePoePresentation(b){
 if(!b.poeMobility)return;
 const m=b.poeMobility.snapshot(),a=b.p.action;
 b.p.presentationPose={state:m.state,elapsed:m.elapsed,remaining:m.remaining,direction:{...m.direction},evadeWindow:poeEvadeWindow(b),blocksSkills:m.blocksSkills,recoveryDebt:m.recoveryDebt,source:m.source,skillId:a?.id??null,skillElapsed:a?.elapsed??0,skillDuration:a?.duration??0,skillContact:a?.contact??0};
}
function mobilityEvents(b,result){
 for(const event of result.events??[])emit(b,{...event,time:b.time,pose:{state:result.state,elapsed:result.elapsed,direction:{...event.direction}}});
 updatePoePresentation(b);
}
// Call together with router/locomotion clear at menu, blur, owner/life/region
// changes, and rebind. Preserve timed debt; never grant a fresh evade window.
export function clearPoeInput(b,reason='safety-clear'){
 if(!b?.poeMobility)return [];
 const start=b.events.length,previous=b.poeMobility.snapshot();clearBattleIntent(b);
 b.poeLastInput=null;b.poeActionAim?.clear();b.poeActionAim=null;b.poeAimSuspended=true;
 b.poeNeedsFresh={attack:true,hammer:true};b.requireFreshAttack=true;
 mobilityEvents(b,b.poeMobility.clear({preserveRecovery:true,reason}));
 if(previous.state!=='idle')emit(b,{type:'mobilityCancelled',reason,recoveryDebt:b.poeMobility.serializeRecoveryDebt()});
 return b.events.slice(start);
}
// Only after an already committed full recovery reset (rest/new life).
// Ordinary menu, blur, settings, travel and checkpoints must retain debt.
export function resetPoeMobility(b,reason='rest'){
 if(!b?.poeMobility)return [];
 const start=b.events.length;clearPoeInput(b,reason);
 mobilityEvents(b,b.poeMobility.clear({preserveRecovery:false,reason}));
 return b.events.slice(start);
}
function startPoeAim(b,action){
 if(!b.poeMobility)return;
 const input=b.poeLastInput??{};b.poeAimSuspended=false;
 b.poeActionAim=createAimIntent({cursorTrackingAfterRelease:b.poeInput.cursorTrackingAfterRelease});
 action.poeAim=b.poeActionAim.press(!b.poeQueuedStart&&input.releasedAimBySkill?.[action.id]||poeSample(input,action.id));
 if(!poeHeld(input,action.id))action.poeAim=b.poeActionAim.release();
}
function updatePoeAim(b,input){
 const a=b.p.action;if(!a||!b.poeActionAim||b.poeAimSuspended)return;
 const canRetarget=skillCanRetarget(a),wasHeld=b.poeActionAim.snapshot().held,held=!!poeHeld(input,a.id),sample=poeSample(input,a.id),policy={canRetarget,isTargetValid:id=>isPoeAimTargetValid(id,b)};
 // OFF commits an angle at release, rather than continuously recomputing an
 // angle toward a frozen world point while the actor walks.
 if(wasHeld&&!held)a.poeAim=b.poeActionAim.release(input.releasedAimBySkill?.[a.id]??sample,policy);
 else if(held&&!wasHeld)a.poeAim=b.poeActionAim.press(sample);
 else a.poeAim=b.poeActionAim.snapshot(sample,policy);
 if(canRetarget&&(wasHeld||held||b.poeInput.cursorTrackingAfterRelease)&&finitePoint(a.poeAim.aim))a.angle=b.p.angle=Math.atan2(a.poeAim.aim.y-b.p.y,a.poeAim.aim.x-b.p.x);
 if(a.stormSwing&&canRetarget&&(wasHeld||held||b.poeInput.cursorTrackingAfterRelease)){const bellSample=wasHeld&&!held?(input.releasedAimBySkill?.[a.id]??sample):sample;a.stormBellId=bellSample.bellId??null;}
}
function applyPoeMobilityInput(b,input){
 const p=b.p,m=b.poeMobility;if(!m)return false;
 const held=mobilityHeld(b,input);
 const moveDirection=finitePoint(input.move)?unit(input.move.x,input.move.y):null;
 for(const id of mobilityActions)if(input[id])delete held[id];
 mobilityEvents(b,m.update(0,{moveDirection,held,canSprint:!p.action&&!(p.recoveryLock>0)&&!hasStatus(p,'stun')}));
 const requested=mobilityActions.find(id=>input[id]);if(!requested)return false;
 const aim=poeAngle(b,input,'mace_swing'),canStart=!hasStatus(p,'stun')&&!(p.recoveryLock>0)&&(requested==='sprint'?!p.action:skillCanDodgeCancel(p.action));
 const result=m.press(requested,{moveDirection,aimDirection:{x:Math.cos(aim),y:Math.sin(aim)},canStart});
 if(result.accepted&&result.state==='roll'){
  clearMagmaDefense(b,'dodge');
  const action=p.action;
  if(action){
   const requireFresh=b.requireFreshAttack;
   if(action.id==='zealous_onslaught'){finishOnslaught(b,'dodge');b.requireFreshAttack=requireFresh;}
   else p.action=null;
   emit(b,{type:'actionCancelled',id:action.id,castId:action.castId,reason:'dodge',contactOccurred:action.fired||action.pulses>0});
  }
  clearBattleIntent(b);b.poeActionAim?.clear();b.poeActionAim=null;p.block=false;p.angle=Math.atan2(result.direction.y,result.direction.x);
 }
 mobilityEvents(b,result);
 if(!result.accepted)emit(b,{type:'mobilityRejected',id:requested,reason:result.reason});
 return result.accepted; // Only an allowed mobility command preempts a new skill.
}
const poeSprintScale=b=>b.stats.moveSpeed/b.poeSprintBaseSpeed*(hasStatus(b.p,'slow')?HERO_STATUS_RULES[b.p.negativeStatuses.slow.ruleId].moveMultiplier:1);
function advancePoeMobility(b,dt,options){
 let result=b.poeMobility.update(dt,options);
 // Canonicalize only floating-point residue at an already reached deadline.
 // The battle clock uses the same 1e-9 tolerance for action/debt boundaries.
 const candidates=[result.recoveryDebt,...(result.state==='roll'?[REBORN_POE_MOBILITY_TUNING.evadeStart-result.elapsed,REBORN_POE_MOBILITY_TUNING.evadeEnd-result.elapsed]:result.state==='sprint'?[REBORN_POE_MOBILITY_TUNING.sprintGrace-result.elapsed]:[])].filter(value=>value>0&&value<=1e-9);
 if(candidates.length){
  const settled=b.poeMobility.update(Math.max(...candidates),options);
  result={...settled,delta:{x:result.delta.x+settled.delta.x,y:result.delta.y+settled.delta.y},events:[...result.events,...settled.events.map(event=>({...event,offset:dt}))]};
 }
 return result;
}
function movePoeHero(b,input,t){
 const p=b.p,m=b.poeMobility,previous=m.snapshot(),locked=previous.blocksSkills||p.recoveryLock>0||hasStatus(p,'stun'),v=finitePoint(input.move)?unit(input.move.x,input.move.y):{x:0,y:0};
 const result=advancePoeMobility(b,t,{moveDirection:v,held:mobilityHeld(b,input),canSprint:!p.action&&!(p.recoveryLock>0)&&!hasStatus(p,'stun')});
 let dx=result.delta.x,dy=result.delta.y;
 if(previous.state==='sprint'){const scale=poeSprintScale(b);dx*=scale;dy*=scale;}
 if(previous.state==='sprint'&&finitePoint(input.moveTarget)){const length=Math.hypot(dx,dy),maximum=distance(p,input.moveTarget);if(length>maximum){dx*=maximum/length;dy*=maximum/length;}}
 if(previous.state==='idle'&&result.state==='idle'&&!locked){
  const speed=b.stats.moveSpeed*skillMovementFactor(p.action)*(hasStatus(p,'slow')?HERO_STATUS_RULES[p.negativeStatuses.slow.ruleId].moveMultiplier:1)*(p.block?b.stats.actions.shield_block.moveMultiplier:1),maximum=finitePoint(input.moveTarget)?distance(p,input.moveTarget):Number.isFinite(input.moveDistance)?Math.max(0,input.moveDistance):Infinity,length=Math.min(speed*t,maximum);
  dx=v.x*length;dy=v.y*length;
 }
 // The final roll slice uses its PRE-update body, even if update ended in sprint.
 const delta=moveActorBody(b,p,dx,dy,{rolling:previous.state==='roll'});b.poeHeroPath=delta.path;const savedAngle=p.angle,walker={...p,action:null};const feet=advanceLocomotion(walker,delta.x,delta.y,{dt:t});p.angle=savedAngle;p.moving=walker.moving;if(p.moving)p.walk=walker.walk;
 if(!p.action&&['idle','sprint'].includes(previous.state)){p.walkPhase=walker.walkPhase;for(const foot of feet)emit(b,{type:'sound',name:'footstep',foot:foot.foot,owner:'hero'});}
 if(previous.state==='roll'||previous.state==='sprint')p.angle=Math.atan2(previous.direction.y,previous.direction.x);
 mobilityEvents(b,result);
}

function random(b){if(!Number.isSafeInteger(b.combatDraws)||b.combatDraws>=Number.MAX_SAFE_INTEGER)throw new Error('Combat RNG exhausted');b.seed=(Math.imul(b.seed,1664525)+1013904223)>>>0;b.combatDraws++;emit(b,{type:'combatRandom',state:b.seed,draws:b.combatDraws});return b.seed/4294967296;}
function fxRandom(b){b.fxSeed=(Math.imul(b.fxSeed,1664525)+1013904223)>>>0;return b.fxSeed/4294967296;}
const freezeSpec=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freezeSpec);Object.freeze(value);}return value;};
const spellIds=new Set(['righteous_hammer','lay_on_hands','judgement','battle_banner','zealous_onslaught']);
const disabled=e=>e.disarm?.remaining>1e-9||e.silence?.remaining>1e-9;
function hitContext(b,action,e,part,rootKind='spell',procDepth=0){return {castId:action.castId,hitId:`${action.castId}:${part}:${e.id}`,originSkillId:action.id,rootKind,procDepth,criticalEligible:procDepth===0&&['spell','mace'].includes(rootKind),canTriggerOnHit:procDepth===0,attackerId:'hero',attackFamily:rootKind==='spell'?'spell':'weapon'};}
export function physicalDamage(raw,armor=0,penetration=0){return Math.max(0,raw)*100/(100+Math.max(0,armor-penetration));}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function createBattle(state,{crusherEnabled=false,stormEnabled=false,magmaEnabled=false}={}) {
  const region=getRegion(state.world.region),stats=deriveStats(state.character,state);
  if(!region||!stats.ok)throw new Error('Invalid battle initialization');
  const pools=state.vitals??{hp:stats.stats.hpMax,mana:stats.stats.manaMax,stamina:stats.stats.staminaMax};
  const pos=state.world.position??region.spawn,defeated=state.world.defeated?.[region.id]??[];
  const difficulty=CORE_REFERENCE.difficulty[state.difficulty];
  // A persisted death has already paid its cost. Never re-enter arrival safety
  // or report it as a new death when reconstructing the encounter.
  const dead=state.world.lifeDown===true||pools.hp<=0, recovery=recoveryFrom(state);
  const battle={equipmentContext:state,region:region.id,map:createMap(region.id,state),time:0,seed:recovery.combatRng?.state??1369781,combatDraws:recovery.combatRng?.draws??0,fxSeed:1369781,castSerial:0,attackSerial:0,foeTypes:FOES,stats:stats.stats,difficulty,stateLife:state.world.life??0,
    p:{...pos,hp:pools.hp,mana:pools.mana,stamina:pools.stamina,angle:0,classId:'warrior',action:null,walkPhase:0,invuln:state.recovery?.invuln??0,block:false,cooldowns:{...(state.recovery?.cooldowns??{})},potionCooldown:state.recovery?.potionCooldown??0,recoveryLock:state.recovery?.lock??0,manaDelay:state.recovery?.manaDelay??0,staminaDelay:state.recovery?.staminaDelay??0,combo:0,regenBuff:recovery.regenBuff??null,innerFlame:recovery.innerFlame??null,procCooldowns:{...recovery.procCooldowns},procCooldownRanks:{...recovery.procCooldownRanks},negativeStatuses:structuredClone(recovery.negativeStatuses??{})},
    enemies:region.foes.filter(e=>!defeated.includes(e.id)).map(e=>initializePatternPhase({...e,type:FOES[e.kind].role==='boss'||e.kind==='warden'?'boss':FOES[e.kind].style==='ranged'?'mage':'guardian',hp:FOES[e.kind].hp*difficulty.enemyHealth,max:FOES[e.kind].hp*difficulty.enemyHealth,angle:0,active:false,state:'idle',timer:0,stun:0,telegraph:null},FOES[e.kind])),
    skillIntent:null,awaitingAdvance:!dead&&region.foes.length>0,shots:[],areas:[],banner:null,areaSerial:0,effects:[],floaters:[],events:[],dead,deathReported:state.world.lifeDown===true,shake:0,hitstop:0,contacts:0};
  if(crusherEnabled)setCrusherMode(battle,true);
  if(stormEnabled)setStormMode(battle,true);
  if(magmaEnabled)setMagmaMode(battle,true);
  return initPoeBattle(battle,state);
}
function emit(b,event){b.events.push(event);}
function fx(b,type,x,y,color,r=28,life=.3,extra={}){b.effects.push({type,x,y,color,r,life,max:life,...extra});if(b.effects.length>180)b.effects.splice(0,b.effects.length-180);}
function floater(b,text,x,y,color='#f0d69d'){b.floaters.push({text,x,y,color,life:1,lift:0});if(b.floaters.length>40)b.floaters.shift();}
function move(b,actor,dx,dy){
 // Skill-owned travel keeps its existing wall/stop/pierce contract. Only normal
 // POE locomotion and reciprocal enemy locomotion use the new body solver.
 if(b.poeMobility&&actor!==b.p)return moveActorBody(b,actor,dx,dy);
 const x=actor.x,y=actor.y,nextX=traceSegment(b.map,actor,{x:actor.x+dx,y:actor.y},11);actor.x=nextX.x;
 const nextY=traceSegment(b.map,actor,{x:actor.x,y:actor.y+dy},11);actor.y=nextY.y;return {x:actor.x-x,y:actor.y-y};
}
function hitEnemy(b,e,raw,{stun=0,pen=0,heavy=false,source='mace',damageType='physical',context=null,spec=null,components=null,impactAngle=null,crusherStrike=false}={}){
  if(!alive(e)||b.dead)return {hit:false,damage:0,critical:false,defeated:false};
  const ctx=context??{castId:0,hitId:`legacy:${++b.attackSerial}:${e.id}`,originSkillId:source,rootKind:'secondary',procDepth:1,criticalEligible:false,canTriggerOnHit:false,attackerId:'hero',attackFamily:'weapon'};
  const before=e.hp,wasDisabled=disabled(e),position={x:e.x,y:e.y},offense=spec?.offense??{},foe=foeFor(b,e);
  const critical=ctx.criticalEligible&&random(b)<(offense.criticalChance??0),crit=critical?(offense.criticalMultiplier??1.5):1;
  const taken=(e.shackles?.remaining>0?e.shackles.damageTakenMultiplier:1)*(wasDisabled?(offense.punishMultiplier??1):1);
  const packet=components??[{id:damageType,damageType,raw}];
  let amount=0;
  for(const part of packet){
    if(!Number.isFinite(part.raw)||part.raw<0)throw new Error('Unresolved damage component');
    const type=part.damageType,value=part.raw*(offense.damageMultiplier??1)*(type==='fire'?(offense.fireDamageMultiplier??1):1)*crit;
    amount+=(type==='physical'?physicalDamage(value,Math.max(0,foe.armor-(e.armorBreak?.remaining>0?e.armorBreak.amount:0)),pen):type==='pure'?value:value*(1-clamp((foe.resistances?.[type]??0)/100,0,.9)))*taken;
  }
  const crusherPayoff=crusherStrike?commitCrusherPayoff(b,e,{castId:ctx.castId,readyAtContact:true,hit:{hit:true,damage:Math.min(before,amount),position,context:ctx,defeated:amount>=before}}):null;
  if(crusherPayoff)emit(b,crusherPayoff);
  if(b.crusherEnabled&&crusherImmune(b,e))stun=0;
  e.hp=Math.max(0,e.hp-amount);e.flash=.11;e.stun=Math.max(e.stun,stun);heavy=heavy||critical;
  recordEnemyReaction(e,{angle:Number.isFinite(impactAngle)?impactAngle:b.p.angle,heavy,damage:amount});
  observePatternPhase(e,foe);
  if(stun>0){interruptFireEscape(e);e.telegraph=null;e.state='idle';e.timer=.25;emit(b,{type:'soundCancel',tag:`enemy:${e.id}`});}
  floater(b,String(Math.round(amount)),e.x,e.y,heavy?'#ffe8aa':'#eadcb5');
  fx(b,'impact',e.x,e.y,source==='hammer'?'#ffc263':'#c9eee1',heavy?32:22,.23,{angle:Number.isFinite(impactAngle)?impactAngle:b.p.angle,heavy});
  emit(b,{type:'sound',name:heavy?'heavyHit':'hit',phase:'impact',owner:'hero',audience:'friendly',castId:ctx.castId,hitId:ctx.hitId,tag:`impact:${ctx.hitId}`,x:e.x,y:e.y});
  b.shake=Math.max(b.shake,heavy?5:2);b.hitstop=Math.max(b.hitstop,heavy?.035:.014);b.contacts++;
  const result={hit:true,damage:Math.min(before,amount),rawDamage:amount,critical,defeated:e.hp===0,wasDisabled,position,context:ctx,components:packet.map(c=>c.id),...(crusherPayoff?{crusherPayoff}:{})};
  emit(b,{type:'enemyHit',id:e.id,...result});
  if(e.hp===0){clearFireResponse(e);e.dead=true;e.deathTime=ENEMY_REACTION.deathSeconds;e.telegraph=null;e.state='dead';e.timer=0;e.moving=false;e.attackSpec=null;emit(b,{type:'defeated',id:e.id});fx(b,'enemyDeath',e.x,e.y,'#e9a45b',heavy?35:22,.32,{boss:e.type==='boss'});for(let n=0;n<5;n++)fx(b,'particle',e.x,e.y,n%2?'#a6d4cb':'#e9b071',0,.45,{size:2+fxRandom(b)*3,vx:(fxRandom(b)-.5)*85,vy:(fxRandom(b)-.5)*85,deathParticle:true});}
  dispatchHitProcs(b,e,result,spec);
  const buildup=recordCrusherHit(b,e,result);if(buildup)emit(b,buildup);if(!alive(e)&&e.stunBuildup!==undefined)resetCrusherEnemy(e);
  const combo=recordStormEnemyHit(b,result);if(combo)emit(b,combo);
  return result;
}
function dispatchHitProcs(b,target,result,spec){
 const c=result.context,o=spec?.offense;if(!o||c.procDepth!==0||!c.canTriggerOnHit||result.damage<=0)return;
 const p=b.p,origin=result.position,secondary=(enemy,id)=>({...c,hitId:`${c.hitId}:${id}:${enemy.id}`,originSkillId:id,rootKind:'secondary',procDepth:1,criticalEligible:false,canTriggerOnHit:false});
 const splash=(id,rule,type,eligible)=>{
  p.procCooldowns[id]=rule.cooldown;p.procCooldownRanks[id]=rule.rank;emit(b,{type:'procCooldownStarted',id,remaining:rule.cooldown,castId:c.castId});
  fx(b,'ring',origin.x,origin.y,id==='flaming_wrath'?'#e5a365':'#c6be95',rule.radius,.24);
  for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(alive(e)&&eligible(e)&&distance(e,origin)<=rule.radius+1e-9&&lineOfSight(b.map,origin,e))hitEnemy(b,e,rule.damage,{damageType:type,pen:rule.armorPenetration??0,source:id,spec,impactAngle:impactHeading(origin,e,b.p.angle),context:secondary(e,id)});
 };
 if(c.rootKind==='spell'&&result.critical&&o.flamingWrath&&!(p.procCooldowns.flaming_wrath>1e-9))splash('flaming_wrath',o.flamingWrath,'fire',()=>true);
 if(c.rootKind==='mace'&&result.wasDisabled&&o.guilt&&!(p.procCooldowns.guilt_by_association>1e-9))splash('guilt_by_association',o.guilt,'physical',e=>e.id!==target.id&&!disabled(e));
}
function hurtHero(b,raw,angle,attacker=null,damageType='physical',{attackFamily='weapon',melee=true,statusRuleIds=[],attackId=null,originSkillId=null,procDepth=0,dodgeable=null,evadeWindow=null}={}){
  const p=b.p;if(p.hp<=0||p.invuln>0)return;
  if((evadeWindow??poeEvadeWindow(b))&&['melee','projectile'].includes(dodgeable)){emit(b,{type:'heroEvaded',damageKind:dodgeable,attackId,attackerId:attacker?.id??null});return;}
  if(!acceptMagmaIncoming(b,attackId))return;
  const shield=p.action?.id==='zealous_onslaught'&&p.action.spec.channelShield?p.action.spec.channelShield:b.stats.actions.shield_block,innerResistance=damageType==='fire'&&p.innerFlame?.remaining>1e-9?innerFlameRows.fireResistanceIncreasePercent[p.innerFlame.rank-1]:0;const resistance=innerResistance+(b.stats.resistances[damageType]??0)+(p.block?(shield.resistanceBonus?.[damageType]??0):0);let damage=damageType==='physical'?physicalDamage(raw*b.difficulty.enemyDamage,b.stats.armor):Math.max(0,raw)*b.difficulty.enemyDamage*(1-clamp(resistance/100,0,.9)),blocked=false;
  let activeBlocked=false;
  if(p.block&&Math.abs(angleDelta(p.angle,angle+Math.PI))<(shield.halfAngleRadians??Math.PI*.58)&&p.stamina>=shield.staminaCost){p.stamina-=shield.staminaCost;p.staminaDelay=b.stats.staminaRegenDelay;damage*=1-shield.damageReduction;blocked=true;activeBlocked=true;}
  else if(damageType===shield.passiveDamageType&&shield.learned&&random(b)<shield.passiveBlockChance){damage=Math.max(0,damage-shield.passiveBlockAmount);blocked=true;}
  damage*=bannerAt(b)?.damageTakenMultiplier??1;
  const previousHp=p.hp;p.hp=Math.max(0,p.hp-damage);const incomingId=attackId??++b.castSerial;emit(b,{type:'heroHurt',damage:previousHp-p.hp,blocked,context:{castId:incomingId,hitId:`incoming:${incomingId}:hero`,originSkillId:originSkillId??attacker?.kind??'environment',rootKind:'incoming',procDepth,criticalEligible:false,canTriggerOnHit:false,attackerId:attacker?.id??null,attackFamily}});
  const magmaBlock=registerMagmaBlock(b,{attackId,activeBlocked,procDepth,damage:raw,angle:p.angle});if(magmaBlock){emit(b,magmaBlock);fx(b,'magma-block',p.x,p.y,'#f6d4a5',shield.halfAngleRadians,.24,{angle:p.angle,spray:magmaBlock.spray});if(magmaBlock.spray)resolveMagmaSpray(b,incomingId,p.angle);}
  if(b.poeMobility)mobilityEvents(b,b.poeMobility.hit());
  if(procDepth===0&&p.hp>0&&attacker&&alive(attacker)&&b.enemies.includes(attacker)&&inMap(b.map,attacker.x,attacker.y)&&(!attacker.region||attacker.region===b.region)&&['weapon','spell'].includes(attackFamily)&&(blocked||damage>0)&&b.stats.lawbringer){const success=random(b)<b.stats.lawbringer.chance;emit(b,{type:'lawbringerRolled',attackerId:attacker.id,success});if(success){attacker.disarm={remaining:b.stats.lawbringer.duration};attacker.silence={remaining:b.stats.lawbringer.duration};interruptDisabledAttack(b,attacker);}}
  if(procDepth===0&&blocked&&melee&&attacker&&alive(attacker)&&shield.thorns){const spec=quoteAction(b,'shield_block'),action={id:'shield_of_thorns',castId:++b.castSerial};hitEnemy(b,attacker,p.stamina*shield.thorns.coefficient*shield.thorns.damageMultiplier,{pen:shield.thorns.armorPenetration,source:'thorns',spec,impactAngle:impactHeading(p,attacker,p.angle),context:hitContext(b,action,attacker,'thorns','secondary',1)});}
  if(p.hp>0&&damage>0)for(const id of statusRuleIds)applyHeroStatus(b,id,attacker?.id??null);
  p.hurtTime=.24;p.invuln=.28;
  floater(b,blocked?'방어 '+Math.round(damage):'-'+Math.round(damage),p.x,p.y,blocked?'#9de1d6':'#ff9ba7');
  fx(b,'ring',p.x,p.y,blocked?'#99e4e0':'#e97b85',22,.25);emit(b,{type:'sound',name:blocked?'heavyHit':'hurt',audience:'danger'});b.shake=Math.max(b.shake,blocked?1:5);
  if(p.hp===0){emit(b,{type:'soundCancel',tag:'hero'});emit(b,{type:'soundCancel',tag:'enemy'});finishOnslaught(b,'death');p.innerFlame=null;p.negativeStatuses={};b.banner=null;p.action=null;p.block=false;p.regenBuff=null;b.shots=[];b.areas=[];for(const e of b.enemies)clearFireResponse(e);b.dead=true;stepStorm(b,0);clearMagmaDefense(b,'death');clearBattleIntent(b);clearPoeInput(b,'death');emit(b,{type:'sound',name:'die'});}
}
function interruptDisabledAttack(b,e){
 if(e.state!=='windup')return;const family=e.attackSpec?.attackFamily??foeFor(b,e).attackFamily??'weapon';
 if((family==='weapon'&&e.disarm?.remaining>1e-9)||(family==='spell'&&e.silence?.remaining>1e-9)){e.state='recovery';e.timer=e.attackSpec?.recovery??foeFor(b,e).recovery;e.telegraph=null;emit(b,{type:'enemyAttackInterrupted',id:e.id,attackFamily:family});}
}
export function applyHeroStatus(b,ruleId,sourceId=null){
 const rule=HERO_STATUS_RULES[ruleId],p=b.p;if(!rule||p.hp<=0||b.dead)return false;
 if(sourceId!==null&&(typeof sourceId!=='string'||!/^[a-zA-Z0-9:_-]{1,96}$/.test(sourceId)))return false;
 const existing=p.negativeStatuses[rule.id];p.negativeStatuses[rule.id]={ruleId,remaining:rule.duration,sourceId,...(rule.interval?{nextTick:existing?.nextTick??rule.interval}:{})};
 const action=p.action,interrupt=rule.id==='stun'||(rule.id==='silence'&&spellIds.has(action?.id))||(rule.id==='disarm'&&action?.id==='mace_swing'&&!action.fired);
 if(interrupt&&action){emit(b,{type:'soundCancel',tag:`cast:${action.castId}`});if(!finishOnslaught(b,rule.id)){p.recoveryLock=Math.max(p.recoveryLock,action.duration-action.elapsed);p.action=null;}clearBattleIntent(b);}
 if(rule.id==='stun'){p.block=false;if(b.poeMobility)clearPoeInput(b,'stun');}
 emit(b,{type:'heroStatusChanged',id:rule.id,applied:true});return true;
}
function updateTemporary(b,t){
 const p=b.p;
 if(p.innerFlame){p.innerFlame.remaining=Math.max(0,p.innerFlame.remaining-t);if(p.innerFlame.remaining<=1e-9){p.innerFlame=null;emit(b,{type:'innerFlameChanged',buff:null});}}
 for(const [id,remaining] of Object.entries(p.procCooldowns)){p.procCooldowns[id]=Math.max(0,remaining-t);if(remaining>0&&p.procCooldowns[id]<=1e-9){delete p.procCooldowns[id];delete p.procCooldownRanks[id];emit(b,{type:'procCooldownExpired',id});}}
 for(const [id,status] of Object.entries(p.negativeStatuses)){
  const rule=HERO_STATUS_RULES[status.ruleId],lifetime=status.remaining;status.remaining=Math.max(0,status.remaining-t);
  if(rule.interval){status.nextTick-=Math.min(lifetime,t);if(status.nextTick<=1e-9&&status.remaining>1e-9){status.nextTick+=rule.interval;hurtHero(b,rule.damage,0,null,rule.damageType,{attackFamily:'environment',melee:false});}}
  if(status.remaining<=1e-9){delete p.negativeStatuses[id];emit(b,{type:'heroStatusChanged',id,expired:true});}
 }
}

export function bannerAt(b,point=b.p){const a=b.banner;return a&&a.remaining>1e-9&&a.region===b.region&&distance(point,a)<=a.radius+1e-9&&lineOfSight(b.map,a,point)?a:null;}
export function quoteAction(b,id){
 const base=b.stats.actions[id];if(!base?.learned)return null;
 const a=structuredClone(base),banner=bannerAt(b),spell=spellIds.has(id),inner=b.p.innerFlame;
 const speed=spell?(banner?.castSpeedMultiplier??1):id==='mace_swing'?(banner?.attackSpeedMultiplier??1):1;
 const minimum=id==='zealous_onslaught'?.18:['mace_swing','righteous_hammer','lay_on_hands','judgement','battle_banner'].includes(id)?.30:0;
 const ratio=a.duration>0?a.contact/a.duration:0;a.duration=Math.max(minimum,a.duration/speed);a.contact=a.duration*ratio;
 if(spell)a.manaCost=Number((a.manaCost*(banner?.manaCostMultiplier??1)).toFixed(8));
 a.offense={damageMultiplier:banner?.damageMultiplier??1,fireDamageMultiplier:inner?.remaining>1e-9?1+innerFlameRows.fireDamageIncreasePercent[inner.rank-1]/100:1,criticalChance:spell?clamp(b.stats.criticalChance+(b.stats.flamingWrath?.spellCriticalChanceBonus??0),0,1):b.stats.criticalChance,criticalMultiplier:b.stats.criticalMultiplier,punishMultiplier:b.stats.punishMultiplier??1,flamingWrath:b.stats.flamingWrath?{...b.stats.flamingWrath}:null,guilt:b.stats.guilt?{...b.stats.guilt}:null};
 if(a.channel&&a.guard)a.channelShield=structuredClone(b.stats.actions.shield_block);
 if(!['manaCost','staminaCost','duration','contact','cooldown'].every(k=>Number.isFinite(a[k])&&a[k]>=0))return null;
 return freezeSpec(a);
}
// One read-only eligibility contract for action acceptance and UI feedback.
// Recovery/held-input ownership stays in the existing input/action handlers.
export function actionEligibility(b,id,a=quoteAction(b,id)){
 const p=b.p,learned=!!a?.learned,cooldown=p.cooldowns[id]??0,manaCost=a?.manaCost??0,staminaCost=a?.staminaCost??0;
 const blockedReason=!learned?'unlearned':!(p.hp>0)?'dead':hasStatus(p,'stun')?'stun':spellIds.has(id)&&hasStatus(p,'silence')?'silence':id==='mace_swing'&&hasStatus(p,'disarm')?'disarm':b.crusherEnabled&&id==='judgement'&&!crusherAvailability(b).ok?'weapon':b.stormEnabled&&['mace_swing','judgement','shield_charge'].includes(id)&&!stormAvailability(b).ok?'storm-setup':cooldown>1e-9?'cooldown':!(p.mana>=manaCost)?'mana':!(p.stamina>=staminaCost)?'stamina':b.stormEnabled&&id==='judgement'?(stormPlacement(b,b.poeLastInput,a).blockedReason??null):null;
 return {ready:blockedReason===null,blockedReason,learned,cooldown,manaCost,staminaCost,mana:p.mana,stamina:p.stamina};
}
function actionReady(b,id,a=quoteAction(b,id)){return actionEligibility(b,id,a).ready;}
function rejectUnavailableAction(b,id,eligibility=actionEligibility(b,id)){emit(b,{type:'skillIntentRejected',id,reason:'not-ready',...eligibility});}
function startAction(b,id,angle,ownerToken=null){
 const p=b.p,a=quoteAction(b,id);
 const placement=b.stormEnabled&&id==='judgement'?stormPlacement(b,b.poeLastInput,a):null;
 if(p.action||p.recoveryLock>0||b.poeMobility?.snapshot().blocksSkills||!actionReady(b,id,a))return false;
 clearMagmaDefense(b,'new-action',{keepCharge:true});
 if(b.poeMobility){mobilityEvents(b,b.poeMobility.skillStart());const released=b.poeLastInput?.releasedAimBySkill?.[id]?.aim;if(!b.poeQueuedStart&&finitePoint(released))angle=Math.atan2(released.y-p.y,released.x-p.x);}
 p.mana=Math.max(0,Number((p.mana-a.manaCost).toFixed(8)));p.stamina=Math.max(0,Number((p.stamina-a.staminaCost).toFixed(8)));if(a.manaCost>0)p.manaDelay=b.stats.manaRegenDelay;if(a.staminaCost>0)p.staminaDelay=b.stats.staminaRegenDelay;p.cooldowns[id]=a.cooldown;p.angle=angle;p.block=false;
 const name=id==='mace_swing'?'attack':id==='shield_charge'?'dodge':'cast';
 p.action={id,castId:++b.castSerial,name,spec:a,criticalChance:b.stats.criticalChance,criticalMultiplier:b.stats.criticalMultiplier,duration:a.duration+(a.channel?a.channelDuration:0),contact:a.contact,elapsed:0,fired:false,hitIds:[],angle,payload:{combo:p.combo,which:'q'},...(a.channel?{ownerToken,paidSeconds:1,pulses:0,nextPulse:a.tickSeconds,nextPayment:a.paymentInterval,lanceResolved:false}: {})};
 startPoeAim(b,p.action);if(id==='judgement'&&b.crusherEnabled)p.action.crusherCast=true;if(id==='mace_swing'&&b.crusherEnabled&&crusherAvailability(b).ok)p.action.crusherMace=true;updatePoePresentation(b);
 if(b.stormEnabled){
  if(id==='mace_swing'){p.action.stormSwing=true;p.action.stormContacts=0;p.action.stormBellId=(!b.poeQueuedStart&&b.poeLastInput?.releasedAimBySkill?.[id]||poeSample(b.poeLastInput??{},id)).bellId??null;}
  if(id==='judgement'){p.action.stormPlacement=true;const bell=installStormBell(b,placement,a,p.action.castId);if(bell)emit(b,{type:'stormBellPlaced',id:bell.id,castId:p.action.castId,x:bell.x,y:bell.y,combo:b.storm.combo});}
  if(id==='shield_charge'){p.action.stormDash=true;p.action.stormPerfect=stormPerfectStart(b);p.action.stormWaveHits=[];emit(b,{type:'stormDashStarted',castId:p.action.castId,perfect:p.action.stormPerfect});}
 }
 emit(b,{type:'actionStarted',id,castId:p.action.castId,manaCost:a.manaCost,staminaCost:a.staminaCost});
 if(id==='mace_swing'){p.combo=(p.combo+1)%3;emit(b,{type:'sound',name:'slash',phase:'windup',castId:p.action.castId,tag:`cast:${p.action.castId}`,owner:'hero',audience:'friendly'});}
 if(spellIds.has(id)){emit(b,{type:'sound',name:'magicCharge',phase:'windup',castId:p.action.castId,tag:`cast:${p.action.castId}`,owner:'hero',audience:'friendly'});if(b.stats.innerFlame){p.innerFlame={rank:b.stats.innerFlame.rank,remaining:b.stats.innerFlame.duration};emit(b,{type:'innerFlameChanged',buff:{...p.innerFlame}});}}
 if(id==='shield_charge')emit(b,{type:'sound',name:'dash',castId:p.action.castId,tag:`cast:${p.action.castId}`,owner:'hero',audience:'friendly'});

 if(a.channel)emit(b,{type:'channelPayment',id,castId:p.action.castId,index:0,staminaCost:a.staminaCost,manaCost:0});
 return true;
}
const lanceStops=new Set(['release','complete','stamina','wall']);
const safetyStop=reason=>typeof reason==='string'&&!lanceStops.has(reason)?reason:'safety';
export function finishOnslaught(b,reason='safety'){
 const p=b?.p,action=p?.action;if(action?.id!=='zealous_onslaught'||action.ended)return false;
 action.ended=reason;b.requireFreshAttack=true;p.action=null;p.block=false;p.staminaDelay=b.stats.staminaRegenDelay;p.recoveryLock=Math.max(p.recoveryLock??0,.18);clearBattleIntent(b);
 const a=action.spec;
 if(!action.lanceResolved){action.lanceResolved=true;if(p.hp>0&&!b.dead&&action.pulses>=1&&a.lance&&lanceStops.has(reason)){
  const releaseScale=lanceReleaseScale(a.lance,action.pulses);
  emit(b,{type:'lanceResolved',castId:action.castId,reason,releaseScale,pulses:action.pulses});fx(b,'slash',p.x,p.y,'#efb066',a.lance.range,.3,{angle:action.angle,expertFootprint:{skillId:'zealous_lance',range:a.lance.range,arcRadians:a.lance.arcRadians}});
  for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(strictSector(b,e,p,action.angle,a.lance.range,a.lance.arcRadians))hitEnemy(b,e,0,{pen:a.armorPenetration??0,source:'lance',spec:a,impactAngle:action.angle,context:hitContext(b,action,e,'lance'),components:[{id:'physical',damageType:'physical',raw:a.lance.physicalDamage*releaseScale},{id:'fire',damageType:'fire',raw:a.lance.fireDamage*releaseScale}]});
 }}
 emit(b,{type:'channelEnded',id:action.id,castId:action.castId,reason,payments:action.paidSeconds,pulses:action.pulses});return true;
}
// UI must call this before modal/blur/hidden/capture loss/slot edit; persist its
// returned critical event before resuming. Normal release uses input.channel.
export function cancelBattleAction(b,reason='safety'){
 if(!b)return [];const start=b.events.length;clearMagmaDefense(b,reason);clearBattleIntent(b);clearPoeInput(b,reason);
 if(b.p.action)emit(b,{type:'soundCancel',tag:`cast:${b.p.action.castId}`});
 if(finishOnslaught(b,safetyStop(reason)))emit(b,{type:'safetyCancelled',reason});
 return b.events.slice(start);
}
function resolveOnslaught(b){
 const p=b.p,action=p.action;if(action?.id!=='zealous_onslaught')return;const a=action.spec,active=Math.max(0,action.elapsed-a.duration);
 while(action.nextPulse<=active+1e-9&&action.pulses<16){
  action.pulses++;const tick=action.pulses;action.nextPulse=Number((tick*a.tickSeconds+a.tickSeconds).toFixed(8));
  for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id))){const dx=e.x-p.x,dy=e.y-p.y,forward=dx*Math.cos(action.angle)+dy*Math.sin(action.angle),side=Math.abs(-dx*Math.sin(action.angle)+dy*Math.cos(action.angle));if(alive(e)&&forward>=0&&forward<=a.range+1e-9&&side<=a.halfWidth+1e-9&&lineOfSight(b.map,p,e))hitEnemy(b,e,a.damage,{pen:a.armorPenetration,source:'onslaught',spec:a,impactAngle:action.angle,context:hitContext(b,action,e,`pulse:${tick}`)});}
  emit(b,{type:'channelPulse',castId:action.castId,index:tick});
 }
 if(active>=a.channelDuration-1e-9){finishOnslaught(b,'complete');return;}
 if(action.wallStopped){finishOnslaught(b,'wall');return;}
 if(active>=action.nextPayment-1e-9){
  if(p.stamina<a.staminaCost){finishOnslaught(b,'stamina');return;}
  p.stamina=Math.max(0,Number((p.stamina-a.staminaCost).toFixed(8)));p.staminaDelay=b.stats.staminaRegenDelay;
  emit(b,{type:'channelPayment',id:action.id,castId:action.castId,index:action.paidSeconds,staminaCost:a.staminaCost,manaCost:0});action.paidSeconds++;action.nextPayment+=a.paymentInterval;
 }
}

function cancelSkillIntent(b,reason){
  if(!b.skillIntent)return;
  const id=b.skillIntent.id;clearBattleIntent(b);emit(b,{type:'skillIntentCancelled',id,reason});
}
function executeSkillIntent(b){
  if(!b.skillIntent||b.p.action||b.p.recoveryLock>0||b.poeMobility?.snapshot().blocksSkills)return false;
  const intent=b.skillIntent;clearBattleIntent(b);
  if(b.poeMobility)b.poeQueuedStart=true;
  if(!startAction(b,intent.id,intent.angle,intent.ownerToken))rejectUnavailableAction(b,intent.id);
  if(b.poeMobility)b.poeQueuedStart=false;
  return true;
}
function handleSkillIntent(b,input){
  const p=b.p,slot=id=>['battle_banner','zealous_onslaught'].includes(id)?id:null,fresh=b.poeMobility&&(Object.hasOwn(skillInputs,input.pressedSkillId)||slot(input.pressedSkillId))?input.pressedSkillId:null,id=fresh||(b.poeMobility&&input.attackPressed?'mace_swing':null)||(input.charge?'shield_charge':input.hammer?'righteous_hammer':input.judgement?'judgement':input.heal?'lay_on_hands':slot(input.expert1)||slot(input.expert2));
  const ownerToken=input.channel?.ownerToken??null;
  if(b.skillIntent?.id==='zealous_onslaught'&&(!input.channel?.held||input.channel.ownerToken!==b.skillIntent.ownerToken))cancelSkillIntent(b,'released');
  if(p.action?.id==='zealous_onslaught'){
    const current=p.action,competing=id&&!(id===current.id&&ownerToken===current.ownerToken);
    if(input.channel?.cancelReason)finishOnslaught(b,safetyStop(input.channel.cancelReason));
    else if(competing||input.guardPressed||input.interact)finishOnslaught(b,'competing-input');
    else if(!input.channel?.held||input.channel.ownerToken!==current.ownerToken||input.channel?.released)finishOnslaught(b,'release');
    return true;
  }
  if(id==='zealous_onslaught'&&(!input.channel?.held||ownerToken===null))return true;
  const aimed=b.poeMobility?poeAngle(b,input,id??b.skillIntent?.id??'mace_swing'):Number.isFinite(input.aim?.x)&&Number.isFinite(input.aim?.y)?Math.atan2(input.aim.y-p.y,input.aim.x-p.x):null;
  const moving=Number.isFinite(input.move?.x)&&Number.isFinite(input.move?.y)&&Math.hypot(input.move.x,input.move.y)>0?unit(input.move.x,input.move.y):null;
  if(b.skillIntent){
    if(input.block)cancelSkillIntent(b,'guard');
    else if(!b.poeMobility&&aimed!==null&&Math.abs(angleDelta(aimed,b.skillIntent.aimAngle))>=Math.PI/2-1e-9)cancelSkillIntent(b,'aim-reversed');
    else if(!b.poeMobility&&moving&&b.skillIntent.move&&moving.x*b.skillIntent.move.x+moving.y*b.skillIntent.move.y<-1e-9)cancelSkillIntent(b,'movement-reversed');
  }
  // A queued charge uses the same selected heading as an immediate charge.
  // Other queued skills retain live cursor refresh; started charge stays locked.
  if(b.poeMobility&&b.skillIntent){b.skillIntent.angle=b.skillIntent.id==='shield_charge'&&Number.isFinite(input.chargeAngle)?input.chargeAngle:poeAngle(b,input,b.skillIntent.id);b.skillIntent.aimAngle=b.skillIntent.angle;}
  // All explicit skill inputs are the input router's one-shot pulses, not held keys.
  if(id){
    clearBattleIntent(b); // A newer pulse replaces even an older valid intent.
    const eligibility=actionEligibility(b,id);if(!eligibility.ready){rejectUnavailableAction(b,id,eligibility);return true;} // No CD/resource waiting.
    const aimAngle=aimed??p.angle,angle=id==='shield_charge'&&Number.isFinite(input.chargeAngle)?input.chargeAngle:aimAngle;
    if(!p.action&&!(p.recoveryLock>0)&&!b.poeMobility?.snapshot().blocksSkills)startAction(b,id,angle,ownerToken);
    else{
      const remaining=Math.max(p.action?Math.max(0,p.action.duration-p.action.elapsed):0,p.recoveryLock??0,b.poeMobility?.serializeRecoveryDebt()??0);
      if(input.block)emit(b,{type:'skillIntentRejected',id,reason:'guard'});
      else if(remaining>SKILL_INTENT_SECONDS+1e-9)emit(b,{type:'skillIntentRejected',id,reason:'recovery-too-early',remaining,window:SKILL_INTENT_SECONDS});
      else b.skillIntent={id,angle,aimAngle,move:moving,remaining:SKILL_INTENT_SECONDS,...(id==='zealous_onslaught'?{ownerToken}:{})};
    }
    return true;
  }
  // Reserve priority over held attack; resolve current-frame recovery first.
  return !!b.skillIntent;
}
function resolveCrusherStrike(b,action,a){
 const p=b.p,id=action.poeAim?action.poeAim.targetId:b.targetId,chosen=b.enemies.find(e=>e.id===id);
 const target=chosen&&inSector(b,chosen,p,action.angle,a.range,a.arcRadians)&&lineOfSight(b.map,p,chosen)?chosen:null;
 fx(b,'slash',p.x,p.y,'#d5c3a0',a.range,.45,{angle:action.angle});
 let payoff=null;
 if(target&&alive(target)&&crusherAvailability(b).ok){
  const ready=crusherContactReady(b,target,action.castId),hit=hitEnemy(b,target,a.damage,{stun:ready?CRUSHER_RULES.heavyStunSeconds:0,pen:a.armorPenetration??0,heavy:true,source:'crusher_strike',spec:a,impactAngle:action.angle,crusherStrike:ready,context:hitContext(b,action,target,'crusherStrike')});
  payoff=hit.crusherPayoff??null;
  if(alive(target)&&a.shackles)target.shackles={...a.shackles,remaining:a.shackles.duration};
 }
 if(payoff){
  const origin={x:payoff.x,y:payoff.y},hitIds=[];
  for(const e of [...b.enemies].sort((x,y)=>x.id.localeCompare(y.id)))if(e!==target&&alive(e)&&distance(e,origin)<=a.range+1e-9&&lineOfSight(b.map,origin,e)){
   const hit=hitEnemy(b,e,a.damage,{pen:a.armorPenetration??0,heavy:true,source:'crusher_wave',spec:a,impactAngle:impactHeading(origin,e,action.angle),context:hitContext(b,action,e,'crusherWave','secondary',1)});if(hit.hit)hitIds.push(e.id);
  }
  emit(b,{type:'crusherShockwave',id:target.id,castId:action.castId,...origin,radius:a.range,damage:a.damage,hitIds});
  fx(b,'ring',origin.x,origin.y,'#d5c3a0',a.range,.3,{crusherShockwave:true,castId:action.castId});
 }
 if(a.fireArea)b.areas=[{id:++b.areaSerial,castId:action.castId,originSkillId:action.id,spec:a,x:p.x,y:p.y,angle:action.angle,range:a.range,arcRadians:a.arcRadians,...a.fireArea,age:0,nextTick:a.fireArea.tickSeconds,newborn:true}];
 emit(b,{type:'sound',name:'magicRelease',phase:'release',castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});
}
function resolveMagmaSpray(b,attackId,angle){
 const a=quoteAction(b,'righteous_hammer'),cone=quoteAction(b,'mace_swing');if(!a||!cone)return;const action={id:'magma_spray',castId:++b.castSerial},hitIds=[];
 for(const e of [...b.enemies].sort((x,y)=>x.id.localeCompare(y.id)))if(strictSector(b,e,b.p,angle,cone.range,cone.arcRadians)){const hit=hitEnemy(b,e,a.damage,{source:'magma_spray',damageType:'fire',spec:a,impactAngle:angle,context:hitContext(b,action,e,'spray','secondary',1)});if(hit.hit)hitIds.push(e.id);}
 emit(b,{type:'magmaSpray',castId:action.castId,attackId,hitIds});fx(b,'magma-spray',b.p.x,b.p.y,'#efb96a',cone.range,.3,{angle,arc:cone.arcRadians});emit(b,{type:'sound',name:'magicRelease',phase:'impact',owner:'hero',castId:action.castId,tag:`magma:${attackId}`});
}
function resolveMagmaBash(b,action,a){
 const hitIds=[];for(const e of [...b.enemies].sort((x,y)=>x.id.localeCompare(y.id)))if(strictSector(b,e,b.p,action.angle,a.range,a.arcRadians)){const hit=hitEnemy(b,e,a.damage,{source:'shield_bash',stun:b.stats.actions.shield_charge.stunSeconds,heavy:true,pen:a.armorPenetration??0,spec:a,impactAngle:action.angle,context:hitContext(b,action,e,'shieldBash','secondary',1)});if(hit.hit)hitIds.push(e.id);}
 emit(b,{type:'magmaShieldBash',castId:action.castId,attackId:action.magmaBlockId,hitIds});fx(b,'magma-bash',b.p.x,b.p.y,'#d3c4a4',a.range,.24,{angle:action.angle,arc:a.arcRadians});
}
function resolveStormWave(b,bell,action,explosion=false){
 const hitIds=[],a=bell.spec;
 for(const e of [...b.enemies].sort((x,y)=>x.id.localeCompare(y.id)))if(alive(e)&&distance(e,bell)<=a.range+1e-9&&lineOfSight(b.map,bell,e)&&(!explosion||!action.stormWaveHits.includes(e.id))){
  if(explosion)action.stormWaveHits.push(e.id);
  const hit=hitEnemy(b,e,a.damage,{pen:a.armorPenetration??0,source:explosion?'storm_explosion':'storm_wave',spec:a,impactAngle:impactHeading(bell,e,action.angle),context:hitContext(b,action,e,`bell:${bell.id}`,'secondary',1)});if(hit.hit)hitIds.push(e.id);
 }
 emit(b,{type:explosion?'stormBellExploded':'stormBellWave',id:bell.id,castId:action.castId,x:bell.x,y:bell.y,hitIds});
 fx(b,'ring',bell.x,bell.y,explosion?'#e6eaff':'#acbebf',a.range,.3,{stormWave:true,explosion});
 if(explosion)fx(b,'storm-ground',bell.x,bell.y,'#92b7cb',bell.radius,b.stats.actions.shield_charge.duration,{stormGround:true});
 emit(b,{type:'sound',name:explosion?'heavyHit':'magicRelease',phase:'impact',owner:'hero',castId:action.castId,tag:`storm:${action.castId}:${bell.id}`,x:bell.x,y:bell.y});
}
function resolveStormSwing(b,action,a,ordinal){
 emit(b,{type:'actionContact',id:action.id,castId:action.castId,elapsed:action.elapsed,pose:{x:b.p.x,y:b.p.y,angle:action.angle},storm:true,ordinal});
 emit(b,{type:'sound',name:'slash',phase:'contact',castId:action.castId,owner:'hero',tag:`staff:${action.castId}:${ordinal}`});
 fx(b,'storm-staff',b.p.x,b.p.y,'#c5baa1',a.range,.18,{angle:action.angle,ordinal});
 const bell=liveStormBells(b).find(x=>x.id===action.stormBellId);let contacted=false;
 if(action.stormBellId){
  if(bell&&distance(b.p,bell)<=a.range+bell.radius&&Math.abs(angleDelta(Math.atan2(bell.y-b.p.y,bell.x-b.p.x),action.angle))<=a.arcRadians/2&&lineOfSight(b.map,b.p,bell)){
   contacted=true;const wave=claimStormBellHit(b,bell,action.castId);emit(b,{type:'stormBellHit',id:bell.id,castId:action.castId,ordinal,wave});fx(b,'impact',bell.x,bell.y,'#c5baa1',22,.18,{angle:action.angle});if(wave)resolveStormWave(b,bell,action);
  }
 }else for(const e of [...b.enemies].sort((x,y)=>x.id.localeCompare(y.id)))if(alive(e)&&lineOfSight(b.map,b.p,e)&&distance(e,b.p)<=a.range+10&&Math.abs(angleDelta(Math.atan2(e.y-b.p.y,e.x-b.p.x),action.angle))<=a.arcRadians/2){
  const context={...hitContext(b,action,e,`staff:${ordinal}`,'mace'),stormSwing:true};const hit=hitEnemy(b,e,a.damage,{pen:a.armorPenetration??0,spec:a,source:'staff',impactAngle:action.angle,context});if(hit.hit&&hit.damage>0)contacted=true;
 }
 if(contacted){noteStormContact(b,ordinal);if(ordinal===2)emit(b,{type:'stormTimingReady',castId:action.castId,window:STORM_RULES.perfectWindow});}
}
function resolveAction(b,dt){
  const p=b.p,action=p.action;if(!action)return;
  const a=action.spec??b.stats.actions[action.id],previous=action.elapsed;action.elapsed+=dt;action.phase=action.elapsed/action.duration;
  if(action.stormSwing){for(let ordinal=1;ordinal<=STORM_RULES.contactsPerSwing;ordinal++)if(action.stormContacts<ordinal&&action.elapsed+1e-9>=a.contact*ordinal){action.stormContacts=ordinal;resolveStormSwing(b,action,a,ordinal);}action.fired=action.stormContacts>0;if(action.elapsed+1e-9>=action.duration)p.action=null;return;}
  if(a.channel){const travel=Math.max(0,Math.min(action.elapsed,a.duration+a.channelDuration)-Math.max(previous,a.duration));p.block=action.elapsed>=a.duration&&!!a.guard;const delta=move(b,p,Math.cos(action.angle)*a.speed*travel,Math.sin(action.angle)*a.speed*travel);if(travel>0&&Math.hypot(delta.x,delta.y)<a.speed*travel-1e-6)action.wallStopped=true;return;}
  if(action.id==='shield_charge'){
    const old={x:p.x,y:p.y};
    const travel=action.stopped?0:Math.min(dt,Math.max(0,a.travelDuration-(action.elapsed-dt)));
    const delta=move(b,p,Math.cos(action.angle)*a.speed*travel,Math.sin(action.angle)*a.speed*travel);
    fx(b,'afterimage',p.x,p.y,'#bce9df',0,.18,{angle:p.angle,classId:'warrior'});
    for(const e of [...b.enemies].sort((x,y)=>distance(x,old)-distance(y,old)))if(travel>0&&alive(e)&&lineOfSight(b.map,old,e)&&segmentDistance(e,old,p)<a.radius+12&&!action.hitIds.includes(e.id)){action.hitIds.push(e.id);hitEnemy(b,e,a.damage,{stun:a.stunSeconds,pen:a.armorPenetration??0,heavy:true,source:'charge',spec:action.spec,impactAngle:action.angle,context:hitContext(b,action,e,'charge','charge')});if(!a.passesThroughEnemies){
      // Enemy contact must not undo the wall-safe sweep. Axis sliding can put
      // the enemy within the swept radius while this aimed point is in a wall.
      // Keep the original stop distance, bounded by this frame's actual travel,
      // and admit the resulting position through the same radius-11 sweep.
      const stop=Math.min(Math.hypot(delta.x,delta.y),Math.max(0,distance(old,e)-a.radius-12));
      const contact=traceSegment(b.map,old,{x:old.x+Math.cos(action.angle)*stop,y:old.y+Math.sin(action.angle)*stop},11);
      p.x=contact.x;p.y=contact.y;action.stopped=true;emit(b,{type:'soundCancel',tag:`cast:${action.castId}`});break;
    }}
    if(travel>0&&Math.hypot(delta.x,delta.y)<.1&&!action.stopped){action.stopped=true;emit(b,{type:'soundCancel',tag:`cast:${action.castId}`});}
    if(action.stormDash&&action.stormPerfect&&travel>0)for(const bell of liveStormBells(b))if(segmentDistance(bell,old,p)<=bell.radius+11&&lineOfSight(b.map,old,bell)&&consumeStormBell(b,bell,action))resolveStormWave(b,bell,action,true);
  }
  if(!action.fired&&action.elapsed+(b.poeMobility?1e-9:0)>=a.contact){
    action.fired=true;emit(b,{type:'actionContact',id:action.id,castId:action.castId,elapsed:action.elapsed,...(b.poeMobility?{pose:{x:p.x,y:p.y,angle:action.angle}}:{}),...(action.crusherCast?{crusher:true}:{}),...(action.stormPlacement?{storm:true}:{}),...(action.magmaBash?{magma:true}:{})});
    if(action.magmaBash){if(!action.magmaCancelled)resolveMagmaBash(b,action,a);
    }else if(action.stormPlacement){
      emit(b,{type:'sound',name:'magicRelease',phase:'release',castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});
    }else if(action.id==='mace_swing'){
      // Dispatch the swish peak only when simulation reaches contact. A future
      // AudioContext deadline would run ahead during subsequent hitstop.
      emit(b,{type:'sound',name:'slash',phase:'contact',contactIn:0,castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});
      fx(b,'slash',p.x,p.y,'#ffe2ab',a.range,.25,{angle:action.angle});
      for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(alive(e)&&lineOfSight(b.map,p,e)&&distance(e,p)<=a.range+10&&Math.abs(angleDelta(Math.atan2(e.y-p.y,e.x-p.x),action.angle))<=a.arcRadians/2){
        hitEnemy(b,e,a.damage,{stun:random(b)<(a.stunChance??0)?a.stunSeconds??.7:0,pen:a.armorPenetration??0,spec:a,impactAngle:action.angle,context:hitContext(b,action,e,'mace','mace')});
      }
      if(a.flameArc){fx(b,'slash',p.x,p.y,'#db9b62',a.flameArc.range,.25,{angle:action.angle,expertFootprint:{skillId:'flames_of_devotion',range:a.flameArc.range,arcRadians:a.flameArc.arcRadians}});for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(strictSector(b,e,p,action.angle,a.flameArc.range,a.flameArc.arcRadians))hitEnemy(b,e,a.flameArc.damage,{damageType:'fire',source:'flame',spec:a,impactAngle:action.angle,context:hitContext(b,action,e,'flame','secondary',1)});}
    }else if(action.id==='righteous_hammer'){
      b.shots.push({id:`hammer-${action.castId}`,castId:action.castId,originSkillId:action.id,spec:a,returning:a.returning??null,leg:'outward',newborn:true,kind:'hammer',x:p.x,y:p.y,vx:Math.cos(action.angle)*a.speed,vy:Math.sin(action.angle)*a.speed,life:a.range/a.speed,damage:a.damage,pen:a.armorPenetration??0,lightning:a.lightning?{...a.lightning}:null,armorBreak:a.armorBreak?{...a.armorBreak}:null,age:0,nextTick:a.lightning?.tickSeconds??Infinity,hitIds:[],enemy:false});
      emit(b,{type:'sound',name:'magicRelease',phase:'release',castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});fx(b,'ring',p.x,p.y,'#ffc870',32,.2);
    }else if(action.id==='battle_banner'){
      b.banner={...a,x:p.x,y:p.y,region:b.region,remaining:a.buffDuration,castId:action.castId};emit(b,{type:'bannerPlaced',castId:action.castId});fx(b,'ring',p.x,p.y,'#dec692',a.radius,.5,{bannerPlacement:true});
    }else if(action.id==='lay_on_hands'){
      const before=p.hp;p.hp=Math.min(b.stats.hpMax,p.hp+a.heal);
      if(a.cleanse){for(const [id,status] of Object.entries(p.negativeStatuses))if(HERO_STATUS_RULES[status.ruleId]?.cleansable){delete p.negativeStatuses[id];emit(b,{type:'heroStatusChanged',id,cleansed:true});}}
      if(a.undead)for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(alive(e)&&foeFor(b,e).tags?.includes('undead')&&distance(e,p)<=a.undead.radius+1e-9&&lineOfSight(b.map,p,e))hitEnemy(b,e,a.undead.damage,{damageType:'pure',source:'turn_undead',spec:a,impactAngle:impactHeading(p,e,p.angle),context:hitContext(b,action,e,'undead')});
      p.regenBuff=a.regenBuff?{remaining:a.regenBuff.duration,multiplier:a.regenBuff.multiplier}:null;
      emit(b,{type:'healApplied',amount:p.hp-before});floater(b,'+'+Math.round(p.hp-before),p.x,p.y,'#9df2c4');
      fx(b,'ring',p.x,p.y,'#96ecc1',a.radius,.65);fx(b,'blast',p.x,p.y,'#c3ffe1',32,.35);emit(b,{type:'sound',name:'magicRelease',phase:'release',castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});
    }else if(action.id==='judgement'&&action.crusherCast){
      resolveCrusherStrike(b,action,a);
    }else if(action.id==='judgement'){
      fx(b,'slash',p.x,p.y,'#ffd77d',a.range,.45,{angle:action.angle});fx(b,'ring',p.x,p.y,'#f7ab69',38,.3);
      for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(inSector(b,e,p,action.angle,a.range,a.arcRadians)){
        hitEnemy(b,e,a.damage,{pen:a.armorPenetration??0,heavy:true,source:'judgement',spec:a,impactAngle:action.angle,context:hitContext(b,action,e,'judgement')});
        if(alive(e)&&a.shackles)e.shackles={...a.shackles,remaining:a.shackles.duration};
      }
      // One caster owns one fixed sector; recasting replaces, never stacks it.
      if(a.fireArea)b.areas=[{id:++b.areaSerial,castId:action.castId,originSkillId:action.id,spec:a,x:p.x,y:p.y,angle:action.angle,range:a.range,arcRadians:a.arcRadians,...a.fireArea,age:0,nextTick:a.fireArea.tickSeconds,newborn:true}];
      emit(b,{type:'sound',name:'magicRelease',phase:'release',castId:action.castId,tag:`cast:${action.castId}`,owner:'hero',audience:'friendly'});
    }
  }
  if(action.elapsed+1e-9>=action.duration)p.action=null;
}
function strictSector(b,e,origin,angle,range,arc){return alive(e)&&distance(e,origin)<=range+1e-9&&Math.abs(angleDelta(Math.atan2(e.y-origin.y,e.x-origin.x),angle))<=arc/2+1e-9&&lineOfSight(b.map,origin,e);}
function inSector(b,e,origin,angle,range,arc){return alive(e)&&sectorContains(b.map,e,origin,angle,range,arc);}
const inFireArea=(b,e,area)=>inSector(b,e,area,area.angle,area.range,area.arcRadians);
function updateEnemy(b,e,dt){
 stepCrusherEnemy(b,e,dt);
 stepEnemyReaction(e,dt);
 e.flash=Math.max(0,(e.flash??0)-dt);
 if(!alive(e)){interruptBattlefieldRoleMovement(e);e.deathTime=Math.max(0,(e.deathTime??0)-dt);return;}
 const f=foeFor(b,e),p=b.p;e.stun=Math.max(0,e.stun-dt);observePatternPhase(e,f);
 if(b.region==='beacon_battlefield'&&f.battlefieldRoleMovement)e.moving=false;
 if(e.gate&&!(b.equipmentContext.world.objectives[typeof e.gate==='string'?e.gate:e.gate.objective]>=(e.gate.minimum??1))){clearFireResponse(e);interruptBattlefieldRoleMovement(e);e.active=false;e.telegraph=null;return;}
 const contains=(target,area)=>inFireArea(b,target,area),fireArea=f.fireAreaEscape?observeFireExposure(b,e,dt,contains):null;
 if(e.stun>0||p.hp<=0){interruptFireEscape(e);interruptBattlefieldRoleMovement(e);e.telegraph=null;return;}
 const d=distance(p,e),visible=lineOfSight(b.map,e,p);if(d<300&&visible)e.active=true;if(!e.active)return;
 interruptDisabledAttack(b,e);
 if(e.state==='windup'){
  e.timer-=dt;e.telegraph.progress=clamp(1-e.timer/e.windupDuration,0,1);
  if(e.timer<=1e-9){
   const shape=e.telegraph.shapes[0],attack=e.attackSpec;emit(b,{type:'sound',name:'enemyRelease',phase:'release',attackId:e.attackId,tag:`enemy:${e.id}`,owner:'enemy',audience:'danger',enemy:f.style,x:e.x,y:e.y});
   if(shape.type==='line')b.shots.push({kind:'arrow',enemy:true,x:e.x,y:e.y,vx:Math.cos(e.angle)*attack.speed,vy:Math.sin(e.angle)*attack.speed,damage:attack.damage,damageType:attack.damageType??'physical',attackerId:e.id,attackFamily:attack.attackFamily??f.attackFamily??'weapon',statusRuleIds:attack.statusRuleIds??[],attackId:e.attackId,originSkillId:attack.id??e.kind,life:attack.travelRange/attack.speed});
   else if(visible&&(shape.type==='circle'?distance(p,shape)<shape.r+8:distance(p,shape)<shape.r+8&&Math.abs(angleDelta(Math.atan2(p.y-shape.y,p.x-shape.x),shape.angle))<shape.halfAngle))hurtHero(b,attack.damage,e.angle,e,attack.damageType??'physical',{attackId:e.attackId,originSkillId:attack.id??e.kind,melee:shape.type==='cone',dodgeable:shape.type==='cone'?'melee':null,attackFamily:attack.attackFamily??f.attackFamily??'weapon',statusRuleIds:attack.statusRuleIds??[]});
   fx(b,'enemyRelease',shape.x,shape.y,'#e67c78',0,.25,{shape:{...shape}});e.state='recovery';e.timer=attack.recovery;e.telegraph=null;recordBattlefieldRoleAttack(b,e,f);
  }
  return;
 }
 const recoveryDebt=Math.max(0,e.timer);e.timer=Math.max(0,e.timer-dt);if(e.timer>0)return;
 // B footwork cannot spend the substep that was still owed to recovery.
 // Earlier regions retain their existing frame behavior.
 if(b.region==='beacon_battlefield'){dt=Math.max(0,dt-recoveryDebt);if(!(dt>1e-9))return;}
 const phaseChange=activatePendingPatternPhase(e,f);if(phaseChange)emit(b,phaseChange);
 if(f.fireAreaEscape&&stepFireEscape(b,e,dt,fireArea,f.speed,contains,move)){deferBattlefieldRoleMovement(b,e,f);return;}
 e.angle=Math.atan2(p.y-e.y,p.x-e.x);
 const pattern=selectedEnemyPattern(e,f);
 const attack=pattern??{attackFamily:f.attackFamily??'weapon',shape:f.style==='ranged'?'line':'cone',range:f.range,windup:f.windup,recovery:f.recovery,damage:f.damage,halfAngle:f.style==='boss'?1.25:1,speed:240,travelRange:528,width:20};
 const family=attack.attackFamily??f.attackFamily??'weapon',suppressed=(family==='weapon'&&e.disarm?.remaining>1e-9)||(family==='spell'&&e.silence?.remaining>1e-9);
 if(stepBattlefieldRoleMovement(b,e,f,dt,{visible,suppressed,move}))return;
 if(d<=attack.range&&visible&&!suppressed){
  e.state='windup';e.attackId=++b.castSerial;e.timer=attack.windup;e.windupDuration=attack.windup;e.attackSpec={...attack,attackFamily:attack.attackFamily??f.attackFamily??'weapon'};
  let shape=attack.shape==='line'?{type:'line',x:e.x,y:e.y,x2:e.x+Math.cos(e.angle)*(attack.travelRange??440),y2:e.y+Math.sin(e.angle)*(attack.travelRange??440),width:attack.width??20}:attack.shape==='circle'?{type:'circle',x:e.x,y:e.y,r:attack.radius??attack.range}:{type:'cone',x:e.x,y:e.y,angle:e.angle,r:attack.range,halfAngle:attack.halfAngle??1};
  if(!pattern&&f.style==='boss'&&random(b)<.35)shape={type:'circle',x:e.x,y:e.y,r:115};
  if(pattern)e.patternIndex=(e.patternIndex??0)+1;
  e.telegraph={phase:'windup',color:'#f29187',locked:true,progress:0,name:f.name,shapes:[shape]};emit(b,{type:'sound',name:'enemyTell',phase:'windup',attackId:e.attackId,tag:`enemy:${e.id}`,owner:'enemy',audience:'danger',enemy:f.style,x:e.x,y:e.y});return;
 }
 e.state='idle';e.pathTimer=Math.max(0,(e.pathTimer??0)-dt);
 let target=p;if(!visible){if(!e.pathTimer){e.pathTarget=findPathStep(b.map,e,p);e.pathTimer=.3;}if(!e.pathTarget){e.moving=false;return;}target=e.pathTarget;}
 let v=unit(target.x-e.x,target.y-e.y);
 for(const other of b.poeMobility?[...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)):b.enemies)if(other!==e&&alive(other)){const separation=distance(e,other);if(separation<28&&separation>0&&lineOfSight(b.map,e,other)){v.x+=(e.x-other.x)/separation*.85;v.y+=(e.y-other.y)/separation*.85;}}
 v=unit(v.x,v.y);const delta=move(b,e,v.x*f.speed*(e.shackles?.moveMultiplier??1)*dt,v.y*f.speed*(e.shackles?.moveMultiplier??1)*dt);e.moving=Math.hypot(delta.x,delta.y)>.01;e.walk=(e.walk??0)+Math.hypot(delta.x,delta.y)/16;
}
// Split actual simulation at effect/contact/payment boundaries. One-shot input
// belongs only to the first segment; channel owner/hold survives every segment.
const continuationInput=input=>({...input,attack:input.attack,pressedSkillId:null,pressedSkill:null,releasedAimBySkill:undefined,attackPressed:false,dodgeSprint:false,dodgeOnly:false,sprint:false,hammer:false,charge:false,heal:false,judgement:false,expert1:null,expert2:null,guardPressed:false,interact:false,channel:input.channel?{...input.channel,released:false,cancelReason:null}:undefined});
// Existing hostile-projectile contact radius; named here for the opt-in
// relative sweep/deadline calculation, not a new hitbox tuning value.
const HERO_PROJECTILE_CONTACT_RADIUS=15;
function poeHeroVelocity(b,input){
 const p=b.p,m=b.poeMobility.snapshot(),a=p.action;
 if(m.state==='roll')return m.velocity;
 if(m.state==='sprint'){const scale=poeSprintScale(b);return {x:m.velocity.x*scale,y:m.velocity.y*scale};}
 if(m.blocksSkills||p.recoveryLock>0||hasStatus(p,'stun'))return {x:0,y:0};
 if(a?.id==='shield_charge'&&!a.stopped&&a.elapsed<a.spec.travelDuration)return {x:Math.cos(a.angle)*a.spec.speed,y:Math.sin(a.angle)*a.spec.speed};
 if(a?.spec.channel&&a.elapsed>=a.spec.duration)return {x:Math.cos(a.angle)*a.spec.speed,y:Math.sin(a.angle)*a.spec.speed};
 const v=finitePoint(input.move)?unit(input.move.x,input.move.y):{x:0,y:0},speed=b.stats.moveSpeed*skillMovementFactor(a)*(hasStatus(p,'slow')?HERO_STATUS_RULES[p.negativeStatuses.slow.ruleId].moveMultiplier:1)*(p.block?b.stats.actions.shield_block.moveMultiplier:1);
 return {x:v.x*speed,y:v.y*speed};
}
function previewPoeHeroPath(b,input,horizon){
 const v=poeHeroVelocity(b,input),m=b.poeMobility.snapshot(),p=b.p,skillTravel=p.action?.id==='shield_charge'||p.action?.spec.channel;
 let dx=v.x*horizon,dy=v.y*horizon;
 if(!skillTravel&&m.state!=='roll'){const max=finitePoint(input.moveTarget)?distance(p,input.moveTarget):Number.isFinite(input.moveDistance)?Math.max(0,input.moveDistance):Infinity,n=Math.hypot(dx,dy);if(n>max){dx*=max/n;dy*=max/n;}}
 return skillTravel?[{x0:p.x,y0:p.y,x1:p.x+dx,y1:p.y+dy,t0:0,t1:1}]:previewActorBody(b,p,dx,dy,{rolling:m.state==='roll'}).path;
}
function incomingContactDeadline(shot,path,horizon){
 const seconds=relativePathContact(path,shot,horizon,HERO_PROJECTILE_CONTACT_RADIUS);return seconds<=shot.life?seconds:Infinity;
}
function nextDeadline(b,input={},horizon=.05){
 const p=b.p,a=p.action,values=[];
 const add=v=>{if(Number.isFinite(v)&&v>1e-9)values.push(v);};
 if(a){if(a.spec.channel){add(a.spec.duration-a.elapsed);add(a.spec.duration+a.nextPulse-a.elapsed);if(a.nextPayment<a.spec.channelDuration)add(a.spec.duration+a.nextPayment-a.elapsed);add(a.duration-a.elapsed);}else{if(!a.fired)add(a.contact-a.elapsed);add(a.duration-a.elapsed);}}
 if(a?.stormSwing&&a.stormContacts<STORM_RULES.contactsPerSwing)add(a.contact*(a.stormContacts+1)-a.elapsed);
 for(const bell of liveStormBells(b)){add(bell.remaining);add(bell.nextWave);}
 if(b.magmaEnabled){add(MAGMA_RULES.chargeSeconds-b.magma.charge);add(b.magma.token?.remaining);}
 if(b.poeMobility){const m=b.poeMobility.snapshot();add(m.remaining);add(m.recoveryDebt);add(p.recoveryLock);if(m.state==='roll'){add(REBORN_POE_MOBILITY_TUNING.evadeStart-m.elapsed);add(REBORN_POE_MOBILITY_TUNING.evadeEnd-m.elapsed);}if(m.state==='sprint')add(REBORN_POE_MOBILITY_TUNING.sprintGrace-m.elapsed);if(a)for(const deadline of skillPolicyDeadlines(a))add(deadline);for(const cooldown of Object.values(p.cooldowns))add(cooldown);}
 add(b.banner?.remaining);add(p.innerFlame?.remaining);for(const v of Object.values(p.procCooldowns))add(v);
 for(const status of Object.values(p.negativeStatuses)){add(status.remaining);add(status.nextTick);}
 for(const e of b.enemies){add(e.heavyStunRemaining);for(const id of ['disarm','silence','armorBreak','shackles'])add(e[id]?.remaining);if(e.state==='windup')add(e.timer);}
 for(const shot of b.shots){if(!shot.enemy){add(shot.nextTick-shot.age);add(shot.life);if(shot.leg==='return')add((distance(shot,p)-shot.returning.catchRadius)/shot.spec.speed);}const speed=Math.hypot(shot.vx,shot.vy);if(speed>0){const trace=traceSegment(b.map,shot,{x:shot.x+shot.vx*.05,y:shot.y+shot.vy*.05},2);if(trace.blocked)add(distance(shot,trace)/speed);}}
 for(const area of b.areas)add(area.nextTick-area.age);
 // Predict against the same resolved body path as execution, including stopped
 // and sliding legs. Intended velocity alone is incorrect once a roll is blocked.
 if(b.poeMobility&&b.shots.some(shot=>shot.enemy)){horizon=Math.min(horizon,...values);const path=previewPoeHeroPath(b,input,horizon);for(const shot of b.shots)if(shot.enemy)add(incomingContactDeadline(shot,path,horizon));}
 return values.length?Math.min(...values):Infinity;
}
export function stepBattle(b,character,dt,input={}){
 if(!Number.isFinite(dt)||dt<0||dt>.25)throw new Error('Invalid step');
 let left=Math.min(dt,.05),current=input,recoveryWalked=false;const events=[];
 if(b.poeMobility&&!b.dead){events.push(...acceptBattleInput(b,input));current=continuationInput(input);}
 do{
  const rate=b.poeMobility?(b.hitstop>1e-9?.35:1):b.hitstop>=left&&b.hitstop>0?.35:1,deadline=nextDeadline(b,current,left*rate),intent=b.skillIntent?.remaining;
  let segment=Math.min(left,deadline/rate);if(b.poeMobility&&b.hitstop>1e-9)segment=Math.min(segment,b.hitstop);if(intent>1e-9)segment=Math.min(segment,intent/(b.poeMobility?rate:1));
  if(segment<1e-10)segment=left;
  const wasMaceRecovery=b.p.action?.id==='mace_swing'&&b.p.action.fired;
  events.push(...stepBattleFrame(b,character,segment,current));
  recoveryWalked||=wasMaceRecovery&&b.p.moving;
  left=Math.max(0,left-segment);current=continuationInput(current);
 }while(left>1e-9);
 // A later windup segment must not hide walking earlier in this outer frame.
 if(recoveryWalked)b.p.moving=!b.dead;
 b.events=events;return events;
}


function applyBattleInput(b,input){const p=b.p;
  if(b.poeMobility){b.poeLastInput=input;if(input.attackPressed)b.requireFreshAttack=false;for(const key of ['attack','hammer'])if(!poeHeld(input,key==='attack'?'mace_swing':'righteous_hammer')||input[key+'Pressed']||input[key]&&key==='hammer')b.poeNeedsFresh[key]=false;updatePoeAim(b,input);if(applyPoeMobilityInput(b,input))return;}

  if(Number.isFinite(input.aim?.x)&&Number.isFinite(input.aim?.y)&&!p.action&&!b.poeMobility?.snapshot().blocksSkills)p.angle=Math.atan2(input.aim.y-p.y,input.aim.x-p.x);
  p.block=(p.action?.id==='zealous_onslaught'?p.action.elapsed>=p.action.spec.duration&&p.action.spec.guard:!!input.block&&!p.action)&&!hasStatus(p,'stun')&&b.stats.actions.shield_block.learned&&p.stamina>=b.stats.actions.shield_block.staminaCost&&!b.poeMobility?.snapshot().blocksSkills;
  if(b.magmaEnabled){
   const competing=!!(input.pressedSkillId&&input.pressedSkillId!=='shield_block'||input.attack||input.hammer||input.charge||input.heal||input.judgement||input.expert1||input.expert2||input.interact||input.potion||mobilityActions.some(id=>input[id]));
   if(competing)clearMagmaDefense(b,'competing-input',{keepCharge:true});
   else if(b.magma.raised&&!input.block){const token=consumeMagmaRelease(b);if(token&&!p.action&&!(p.recoveryLock>0)&&!b.poeMobility?.snapshot().blocksSkills&&startAction(b,'mace_swing',p.angle)){p.action.magmaBash=true;p.action.magmaBlockId=token.attackId;emit(b,{type:'magmaBashStarted',castId:p.action.castId,attackId:token.attackId});}}
   b.magma.raised=p.block;if(input.block&&!p.block)b.magma.token=null;
  }
  let skillAttempted=handleSkillIntent(b,input);
  if(b.poeMobility&&!mobilityActions.some(id=>input[id])&&!skillAttempted&&!p.action&&!p.block&&!b.poeNeedsFresh.hammer&&poeHeld(input,'righteous_hammer')&&actionReady(b,'righteous_hammer'))skillAttempted=startAction(b,'righteous_hammer',poeAngle(b,input,'righteous_hammer'));
  if(!input.attack){b.requireFreshAttack=false;b.attackBlockedReason=null;}
  if(!skillAttempted&&!(b.poeMobility&&mobilityActions.some(id=>input[id]))&&input.attack&&!b.requireFreshAttack&&!b.poeNeedsFresh?.attack&&!p.block){
   const started=startAction(b,'mace_swing',b.poeMobility?poeAngle(b,input,'mace_swing'):p.angle),eligibility=actionEligibility(b,'mace_swing');
   // Held basic attack keeps retrying normally; report a status once per hold
   // (or newly changed blocking status), rather than repeating a toast each frame.
   const statusBlocked=!started&&!p.action&&!(p.recoveryLock>0)&&['stun','disarm'].includes(eligibility.blockedReason);
   if(statusBlocked&&b.attackBlockedReason!==eligibility.blockedReason)rejectUnavailableAction(b,'mace_swing',eligibility);
   b.attackBlockedReason=statusBlocked?eligibility.blockedReason:null;
  }
}
export function acceptBattleInput(b,input={}){
 if(!b)return [];b.events=[];if(b.dead||b.p.hp<=0)return [];
 if(b.awaitingAdvance){const offensive=[['attack','mace_swing'],['hammer','righteous_hammer'],['charge','shield_charge'],['judgement','judgement'],['expert1','zealous_onslaught'],['expert2','zealous_onslaught']].some(([key,id])=>(key.startsWith('expert')?input[key]===id:input[key])&&actionReady(b,id));if(!offensive&&!(b.poeMobility&&mobilityActions.some(id=>input[id])))return [];b.awaitingAdvance=false;}
 applyBattleInput(b,input);return b.events;
}

function stepBattleFrame(b,character,dt,input){
  b.events=[];
  if(b.awaitingAdvance){const moves=Number.isFinite(input.move?.x)&&Number.isFinite(input.move?.y)&&Math.hypot(input.move.x,input.move.y)>0;const offensive=[['attack','mace_swing'],['hammer','righteous_hammer'],['charge','shield_charge'],['judgement','judgement'],['expert1','zealous_onslaught'],['expert2','zealous_onslaught']].some(([key,id])=>(key.startsWith('expert')?input[key]===id:input[key])&&actionReady(b,id)&&(id!=='zealous_onslaught'||input.channel?.held&&input.channel.ownerToken!=null));if(!moves&&!offensive&&!(b.poeMobility&&mobilityActions.some(id=>input[id])))return b.events;b.awaitingAdvance=false;}
  const safeDt=Math.min(dt,.05);b.time+=safeDt;b.shake=Math.max(0,b.shake-safeDt*20);
  for(const e of b.effects){e.life-=safeDt;e.x+=(e.vx??0)*safeDt;e.y+=(e.vy??0)*safeDt;}b.effects=b.effects.filter(e=>e.life>0);
  for(const f of b.floaters){f.life-=safeDt;f.lift+=safeDt*22;}b.floaters=b.floaters.filter(f=>f.life>0);
  if(b.dead){stepStorm(b,0);clearMagmaDefense(b,'death');clearBattleIntent(b);clearPoeInput(b,'death');if(!b.deathReported){emit(b,{type:'heroDead'});b.deathReported=true;}return b.events;}
  const poeSlowed=b.poeMobility&&b.hitstop>1e-9;b.hitstop=Math.max(0,b.hitstop-safeDt);const t=(b.poeMobility?poeSlowed:b.hitstop>0)?safeDt*.35:safeDt,p=b.p;
  stepStorm(b,t);
  stepMagma(b,t);
  // An accepted PoE tap must survive the same hitstop as its remaining recovery.
  // The single intent still expires finitely; menus/blur clear via the export.
  if(b.skillIntent){b.skillIntent.remaining-=b.poeMobility?t:safeDt;if(b.skillIntent.remaining< -1e-9)cancelSkillIntent(b,'expired');else b.skillIntent.remaining=Math.max(0,b.skillIntent.remaining);}
  const heroStart={x:p.x,y:p.y},mobilityStart=b.poeMobility?.snapshot();
  if(b.poeMobility){applyBattleInput(b,input);movePoeHero(b,input,t);}
  const oldManaDelay=p.manaDelay,oldStaminaDelay=p.staminaDelay;
  p.potionCooldown=Math.max(0,p.potionCooldown-t);p.recoveryLock=Math.max(0,p.recoveryLock-t);p.invuln=Math.max(0,p.invuln-t);p.hurtTime=Math.max(0,(p.hurtTime??0)-t);p.manaDelay=Math.max(0,p.manaDelay-t);p.staminaDelay=Math.max(0,p.staminaDelay-t);
  if(p.recoveryLock<1e-9)p.recoveryLock=0;
  for(const id of Object.keys(p.cooldowns))p.cooldowns[id]=Math.max(0,p.cooldowns[id]-t);
  if(b.banner){b.banner.remaining=Math.max(0,b.banner.remaining-t);if(b.banner.remaining<=1e-9)b.banner=null;}
  updateTemporary(b,t);
  const refreshed=deriveStats(character,b.equipmentContext);if(!refreshed.ok)throw new Error('Invalid character');b.stats=refreshed.stats;
  const regenTime=t+(p.regenBuff?Math.min(t,p.regenBuff.remaining)*(p.regenBuff.multiplier-1):0);
  if(!p.manaDelay)p.mana=Math.min(b.stats.manaMax,p.mana+b.stats.manaRegen*regenTime*(t?Math.max(0,t-oldManaDelay)/t:0));
  if(!p.staminaDelay&&p.action?.id!=='zealous_onslaught')p.stamina=Math.min(b.stats.staminaMax,p.stamina+b.stats.staminaRegen*regenTime*(t?Math.max(0,t-oldStaminaDelay)/t:0));
  p.hp=Math.min(b.stats.hpMax,p.hp+b.stats.healthRegen*regenTime);
  if(p.regenBuff){p.regenBuff.remaining=Math.max(0,p.regenBuff.remaining-t);if(p.regenBuff.remaining<=1e-9){p.regenBuff=null;emit(b,{type:'regenBuffChanged'});}}
  for(const e of b.enemies)for(const key of ['armorBreak','shackles','disarm','silence'])if(e[key]){e[key].remaining-=t;if(e[key].remaining<=1e-9)e[key]=null;}
  if(!b.poeMobility)applyBattleInput(b,input);
  // Mace contact keeps its planted origin; only subsequent recovery segments
  // accept walking. Retain the action (and its full debt) until normal completion.
  const maceRecovery=p.action?.id==='mace_swing'&&p.action.fired;
  if(b.poeMobility){/* Separate opt-in locomotion already ran for this slice. */}
  else if(!p.action||maceRecovery){
   const v=unit(Number.isFinite(input.move?.x)?input.move.x:0,Number.isFinite(input.move?.y)?input.move.y:0),speed=(hasStatus(p,'stun')?0:b.stats.moveSpeed)*(hasStatus(p,'slow')?HERO_STATUS_RULES[p.negativeStatuses.slow.ruleId].moveMultiplier:1)*(p.block?b.stats.actions.shield_block.moveMultiplier:1),d=move(b,p,v.x*speed*t,v.y*speed*t);
   // Measure with the same locomotion contract while the real action keeps its
   // recovery pose, locked angle and gait phase. No recovery footsteps are emitted.
   const savedAngle=p.angle,walker=maceRecovery?{...p,action:null}:p,feet=advanceLocomotion(walker,d.x,d.y,{dt:t});p.angle=savedAngle;
   if(maceRecovery){p.moving=walker.moving;if(p.moving)p.walk=walker.walk;}
   else for(const foot of feet)emit(b,{type:'sound',name:'footstep',foot:foot.foot,owner:'hero'});
  }else p.moving=false;
  const skillTravel=p.action?.id==='shield_charge'||p.action?.spec.channel;
  resolveAction(b,t);
  if(b.poeMobility&&skillTravel)b.poeHeroPath=[{x0:heroStart.x,y0:heroStart.y,x1:p.x,y1:p.y,t0:0,t1:1}];
  // Recovery ending at the exact deadline may start the queued action once;
  // it receives no contact/movement time until the next frame.
  executeSkillIntent(b);
  if(b.poeMobility&&!p.action)applyBattleInput(b,continuationInput(input));
  if(b.skillIntent&&b.skillIntent.remaining<=1e-9)cancelSkillIntent(b,'expired');
  for(const shot of b.shots){
    if(shot.life<=0)continue;
    if(shot.newborn){shot.newborn=false;continue;}
    if(!shot.enemy&&shot.leg==='return'){const d=distance(shot,p);if(d<=shot.returning.catchRadius){shot.life=0;continue;}const v=unit(p.x-shot.x,p.y-shot.y);shot.vx=v.x*shot.spec.speed;shot.vy=v.y*shot.spec.speed;}
    const old={x:shot.x,y:shot.y},travel=Math.min(t,shot.life,shot.leg==='return'?Math.max(0,distance(shot,p)-shot.returning.catchRadius)/shot.spec.speed:Infinity),traced=traceSegment(b.map,old,{x:shot.x+shot.vx*travel,y:shot.y+shot.vy*travel},2);
    shot.x=traced.x;shot.y=traced.y;shot.life=Math.max(0,shot.life-t);if(traced.blocked)shot.life=0;
    if(shot.enemy){const at=b.poeMobility?relativePathContact(b.poeHeroPath,{...shot,...old},t,HERO_PROJECTILE_CONTACT_RADIUS):Infinity,speed=Math.hypot(shot.vx,shot.vy),available=traced.blocked&&speed>0?Math.min(travel,distance(old,traced)/speed):travel,contact=b.poeMobility?at<=available+1e-8:segmentDistance(p,old,shot)<HERO_PROJECTILE_CONTACT_RADIUS,evadeWindow=b.poeMobility?mobilityStart.state==='roll'&&mobilityStart.elapsed+at>=REBORN_POE_MOBILITY_TUNING.evadeStart-1e-9&&mobilityStart.elapsed+at<REBORN_POE_MOBILITY_TUNING.evadeEnd-1e-9:null;if(lineOfSight(b.map,old,p)&&contact){hurtHero(b,shot.damage,Math.atan2(shot.vy,shot.vx),b.enemies.find(e=>e.id===shot.attackerId&&alive(e))??null,shot.damageType??'physical',{attackId:shot.attackId,originSkillId:shot.originSkillId,procDepth:shot.procDepth??0,attackFamily:shot.attackFamily??'environment',melee:false,dodgeable:'projectile',evadeWindow,statusRuleIds:shot.statusRuleIds??[]});shot.life=0;}}
    else{
      for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(alive(e)&&lineOfSight(b.map,old,e)&&!shot.hitIds.includes(e.id)&&segmentDistance(e,old,shot)<22){
        shot.hitIds.push(e.id);hitEnemy(b,e,shot.damage,{pen:shot.pen??0,heavy:true,source:'hammer',spec:shot.spec,impactAngle:Math.hypot(shot.vx,shot.vy)>0?Math.atan2(shot.vy,shot.vx):null,context:hitContext(b,{castId:shot.castId,id:shot.originSkillId},e,shot.leg??'outward')});
        if(alive(e)&&shot.armorBreak)e.armorBreak={...shot.armorBreak,remaining:shot.armorBreak.duration};
      }
      shot.age=(shot.age??0)+travel;
      if(shot.lightning&&(shot.life>0||shot.returning&&shot.leg==='outward'))while(shot.nextTick<=shot.age+1e-9){
        for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(alive(e)&&distance(e,shot)<=shot.lightning.radius&&lineOfSight(b.map,shot,e))hitEnemy(b,e,shot.lightning.damage,{damageType:'lightning',source:'lightning',spec:shot.spec,impactAngle:impactHeading(shot,e,Math.atan2(shot.vy,shot.vx)),context:hitContext(b,{castId:shot.castId,id:shot.originSkillId},e,`lightning:${shot.nextTick}`,'secondary',1)});
        fx(b,'ring',shot.x,shot.y,'#9bcfff',shot.lightning.radius,.18);shot.nextTick+=shot.lightning.tickSeconds;
      }
      fx(b,'particle',shot.x,shot.y,'#ffcf79',0,.18,{size:3});
      if(shot.leg==='return'&&segmentDistance(p,old,shot)<=shot.returning.catchRadius)shot.life=0;
      else if(shot.life<=1e-9&&shot.returning&&shot.leg==='outward'){shot.leg='return';shot.life=shot.returning.timeout;shot.hitIds=[];emit(b,{type:'hammerReturned',castId:shot.castId});}
    }
  }b.shots=b.shots.filter(s=>s.life>0); // Finite source cooldown/windup and lifetime bound native shot counts; never delete unrelated hostile shots for FX caps.
  for(const area of b.areas){
    if(area.newborn){area.newborn=false;continue;}area.age=Math.min(area.duration,area.age+t);
    while(area.nextTick<=area.age+1e-9&&area.nextTick<=area.duration+1e-9){
      for(const e of [...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)))if(inSector(b,e,area,area.angle,area.range,area.arcRadians))hitEnemy(b,e,area.damage,{damageType:'fire',source:'fire',spec:area.spec,impactAngle:area.angle,context:hitContext(b,{castId:area.castId,id:area.originSkillId},e,`fire:${area.nextTick}`,'secondary',1)});
      fx(b,'slash',area.x,area.y,'#ff944b',area.range,.22,{angle:area.angle});area.nextTick+=area.tickSeconds;
    }
  }b.areas=b.areas.filter(a=>a.age<a.duration-1e-9);

  for(const e of b.poeMobility?[...b.enemies].sort((a,z)=>a.id.localeCompare(z.id)):b.enemies)updateEnemy(b,e,t);
  if(!b.dead)resolveOnslaught(b);
  if(b.dead&&!b.deathReported){emit(b,{type:'heroDead'});b.deathReported=true;}
  updatePoePresentation(b);
  return b.events;
}
