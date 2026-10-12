import {CRUSHER_RULES,crusherAvailability,setCrusherMode} from './crusher-combat.js';
import {STORM_RULES,stormAvailability,setStormMode,stormPerfectStart} from './storm-combat.js';
import {stormBellHover} from './storm-presentation.js';
import {freezeOwnedSnapshot,isImmutableSnapshot} from './immutable-snapshot.js';
import {TOWN_PORTAL_COOLDOWN_SECONDS,townPortalNow,townPortalCandidate,townPortalRemaining,townPortalAvailability} from './town-portal.js';
import {rememberDialogTrigger,focusDialog,restoreDialogFocus,trapDialogTab,containDialogFocus,handoffDialogGameFocus,setDialogBackground} from './dialog-focus.js';
import {applyHotbarLayout} from './hotbar-layout.js';
import {createContactTrace} from './contact-trace.js';
import {createFrameObservation} from './frame-observation.js';
import {createContextClickIntent,pickContextClickTarget} from './context-click.js';
import {SKILL_SLOTS,LEGACY_SLOT_SKILLS} from './skill-loadout.js';
import {createSkillLoadoutInput,canonicalSkillInput} from './skill-loadout-input.js';
import {createPoeFeedback} from './poe-presentation.js';
import {resolvePoeAim,REBORN_AIM_HEIGHTS} from './cursor-targeting.js';
import {createLocomotionIntent} from './locomotion-intent.js';
import {createInputLatency} from './input-latency.js';
import {signalSceneVisibility} from './signal-scene-visibility.js';
import {wildernessSceneVisibility} from './wilderness-scene-visibility.js';
import {WILDERNESS_COMMANDS,wildernessClue} from './wilderness.js';
import {WILDERNESS_TOOLS} from './wilderness-content.js';
import {wildernessObjectView,wildernessElderView,wildernessGuidance,wildernessCommandFields,wildernessPortalView,WILDERNESS_CONTINUATION_NOTICE} from './wilderness-presentation.js';
import {BATTLEFIELD_COMMANDS} from './battlefield.js';
import {battlefieldObjectView,battlefieldElderView,battlefieldGuidance,battlefieldCommandFields,battlefieldPortalLabel,battlefieldEventCopy} from './battlefield-presentation.js';
import {selectInteractionTarget} from './interaction-target.js';
import {createImmediateInput} from './immediate-input.js';
import {createExpertInputCapture,EXPERT_SLOTS,emptyActionSlots} from './expert-input.js';
import {createActionSafety} from './action-safety.js';
import {combatCheckpoint} from './combat-persistence.js';
import {battleReport} from './recovery.js';
import {previewPromotion,previewExpertPromotion} from './promotion.js';
import {resolveCursorAim} from './cursor-targeting.js';
import {syncCommittedBattle} from './runtime-sync.js';
import {candidatePath,candidateNamespace,profileNamespaceForPath,copyReleaseQaProfile} from './candidate-profile.js';
const candidate=candidatePath(location.pathname),saveNamespace=profileNamespaceForPath(location.pathname);
import {DUNGEON_TOOLS} from './dungeon-content.js';
import {QUARRY_TOOLS} from './quarry-content.js';
import {PASS_TOOLS} from './pass-content.js';
import {SIGNAL_TOOLS} from './signal-content.js';
import {BATTLEFIELD_TOOLS} from './battlefield-content.js';
import {TOMB_TOOLS} from './tomb-content.js';
import {TOMB_COMMANDS,tombWardCarried} from './tomb.js';
import {tombObjectView,tombElderView,tombCommandFields,tombClueView,tombEventCopy,tombGoldView,tombPortalLabel} from './tomb-presentation.js';
import {FURNACE_TOOLS} from './furnace-content.js';
import {FURNACE_COMMANDS} from './furnace.js';
import {furnaceObjectView,furnaceBlacksmithView} from './furnace-presentation.js';
import {SIGNAL_COMMANDS} from './signal.js';
import {signalObjectView,signalBlacksmithView} from './signal-presentation.js';
import {PASS_COMMANDS} from './pass.js';
import {passObjectView,passElderView} from './pass-presentation.js';
import {DUNGEON_COMMANDS} from './dungeon.js';
import {dungeonObjectView} from './dungeon-presentation.js';
import {QUARRY_COMMANDS} from './quarry.js';
import {quarryObjectView,quarryElderView} from './quarry-presentation.js';
import {campaignGuidance,chestPresentation} from './campaign-guidance.js';
import {equipmentRows,quoteEquipment,previewRecipe} from './equipment.js';
import {EQUIPMENT_ITEMS,EQUIPMENT_RECIPES,EQUIPMENT_SLOTS,EQUIPMENT_UPGRADES} from './equipment-content.js';
import {createRuntimeGate} from './runtime-gate.js';
import {ACTIONS,MOBILITY_ACTIONS,controlActions,isPoeControls,enableSkillLoadout,controlsFor,controlPreset,poeControlPreset,restorePriorControls,rebindControl,actionLabel,tokenLabel,editableTarget,createInputRouter} from './controls.js';
import {frameDelta,frameWasSuspended} from './runtime-clock.js';
import {ART} from './art.js';
import {MOTION_ASSETS} from './motion.js';
import {createVisualRenderer,screenMovement,screenToWorld,projectWorld,ISO} from './visual.js';
import {createFantasyAudio} from './audio.js';
import {createSession,readUpgradeBackup,restoreUpgradeBackup,readUpgradeBackupV5,restoreUpgradeBackupV5} from './save.js';
import {createUpgradeBackupUi} from './upgrade-backup-ui.js';
import {createController} from './controller.js';
import {createBattle,stepBattle,acceptBattleInput,configurePoeControls,clearBattleIntent,cancelBattleAction,quoteAction,actionEligibility} from './combat.js';
import {actionBlockedText,dismissRecoveryNotice} from './action-feedback.js';
import {formatResourceAmount,formatResourceCost} from './resource-display.js';
import {getRegion,near,FOES,createMap,lineOfSight} from './world.js';
import {deriveStats,previewSkill,RUNTIME_SKILL_IDS,ACTION_SKILL_IDS,STARTER_SKILLS} from './warrior-growth.js';
import {xpForLevel} from './progression.js';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
canvas.tabIndex=-1;
const modal=$('modal'),gate=createRuntimeGate(),router=createInputRouter({captureAttackTap:true}),input={aim:null};
let captureBinding=null,suppressNextClick=false,combatSaveElapsed=0;
const deferredImmediate=createImmediateInput();
const inputLatency=createInputLatency();
const contactTrace=createContactTrace(),frameObservation=createFrameObservation();
let releasedAimBySkill={};
const locomotionIntent=createLocomotionIntent();
const contextClick=createContextClickIntent();
let contextSuppressHeld=false;
const poeFeedback=createPoeFeedback();
let inputFeedback=null;
let townPortalPreview=null;
function showInputFeedback(action,waiting=false){if(inputFeedback)$('hotbar').querySelector?.(`[data-combat="${inputFeedback.action}"]`)?.classList.remove('input-pressed','input-wait');inputFeedback={action,waiting,at:performance.now()};$('hotbar').querySelector?.(`[data-combat="${action}"]`)?.classList.add(waiting?'input-wait':'input-pressed');}
function clearInputFeedback(){if(inputFeedback)$('hotbar').querySelector?.(`[data-combat="${inputFeedback.action}"]`)?.classList.remove('input-pressed','input-wait');inputFeedback=null;}
const expertCapture=createExpertInputCapture(),skillCapture=createSkillLoadoutInput();
const allSkillCapture={clear(reason){expertCapture.clear(reason);skillCapture.clear(reason);},reset(options){expertCapture.reset(options);skillCapture.reset(options);}};
const expertSafety=createActionSafety({capture:allSkillCapture,cancel:cancelBattleAction});
const actionSkill={heal:'lay_on_hands',judgement:'judgement'};
const skillNames=Object.freeze({mace_swing:'철퇴',righteous_hammer:'잿불 망치',shield_block:'방패',shield_charge:'방패 돌진',lay_on_hands:'온기 나누기',judgement:'단죄의 일격',battle_banner:'잿불 깃발',zealous_onslaught:'불굴의 진격'});
const slotSkill=a=>config().version===5?config().skillSlots[a]:LEGACY_SLOT_SKILLS[a]??state?.actionSlots?.[a];
const skillBehavior=id=>id==='shield_block'?(config().blockMode==='toggle'?'누름 전환':'누름 유지'):id==='zealous_onslaught'?'누름 채널':['mace_swing','righteous_hammer'].includes(id)?'누름 즉시 / 홀드 반복':'단발';
const controlName=a=>config().version===5&&SKILL_SLOTS.includes(a)?`기술 슬롯 ${SKILL_SLOTS.indexOf(a)+1} · ${skillNames[slotSkill(a)]??'비어 있음'}`:controlActions(config())[a];
const visibleAction=a=>config().version===5&&SKILL_SLOTS.includes(a)?true:EXPERT_SLOTS.includes(a)?!!state?.actionSlots?.[a]:!actionSkill[a]||!!state?.character.skills[actionSkill[a]];
const tierLabel=tier=>({apprentice:'입문',adept:'숙련',expert:'전문가',master:'마스터'}[tier]??tier);
const focusEvents={blurAt:'없음',visibilityAt:'없음',visibilityState:'초기'};
let pauseReason='시작 화면',lastObjectiveHtml='';
const config=()=>controlsFor(state);
const keyName=action=>actionLabel(config(),action);
let controller=null,state=null,battle=null,renderer=null,paused=true,busy=false,profile='main',last=performance.now(),noticeUntil=0,displayTime=0,combatTime=0,menuTime=0,walkTime=0,arrivalWaitTime=0;
let audio=createFantasyAudio();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
// One label for title, pause UI and the optional read-only status tool.
const BUILD_LABEL='R14a18';
function clearInput(reason='safety'){if(dismissRecoveryNotice($('toast')))noticeUntil=0;releasedAimBySkill={};contextClick.clear(reason);contextSuppressHeld=false;locomotionIntent.clear();clearInputFeedback();inputLatency.clear(typeof reason==='string'?reason:'safety');deferredImmediate.clear();router.clear();clearBattleIntent(battle);expertSafety.request(battle,controller,typeof reason==='string'?reason:'pointer-cancel');if(battle)battle.targetId=null;}
function flushActionSafety(){
 const result=expertSafety.drain(battle,controller,{busy,blocked:gate.blocked});
 if(result.status==='waiting')return true;
 if(result.events.length){for(const event of result.events)deliverCombatAudio(event);const checkpoint=combatCheckpoint(battle,result.events);if(checkpoint){const captured=controller.capture();if(!captured.state||battle.stateLife!==(captured.state.world.life??0)||battle.region!==captured.state.world.region)throw new Error('전투와 저장 위치가 다릅니다. 저장을 다시 확인하세요.');checkpoint.expectedStoreRevision=captured.revision;dispatch(checkpoint,{critical:true,safetyCommit:true});return true;}}
 return false;
}
function acceptCombatPress(action,token){
 if(!action)return;
 expertCapture.deferred.clear();skillCapture.deferred.clear();
 if(paused||gate.blocked||!battle||state.world.lifeDown||battle.p.hp<=0||document.hidden||!document.hasFocus())return;
 const c=config(),loadout=c.version===5&&SKILL_SLOTS.includes(action);
 if(isPoeControls(c)&&action==='moveOnly')beginContextOrGroundClick();
 else if(isPoeControls(c)){const wasContext=contextClick.active;contextClick.clear('new-input');contextSuppressHeld=false;if(wasContext||action==='stop')locomotionIntent.clear();}
 const expert=!loadout&&EXPERT_SLOTS.includes(action);
 if(expert||loadout)router.consume(action);
 if(['attack','block','charge','hammer','heal','judgement','dodgeSprint','dodgeOnly','sprint',...EXPERT_SLOTS].includes(action)){inputLatency.press(action,{skillId:slotSkill(action)??null});showInputFeedback(action,busy||expertSafety.pending);}
 if(c.version===5&&['dodgeSprint','dodgeOnly','sprint','stop'].includes(action))skillCapture.breakGuard();
 flushActionSafety();
 if(busy||expertSafety.pending){
  inputLatency.waiting();
  if(loadout){const id=c.skillSlots[action];if(battle.stats.actions[id]?.learned)skillCapture.deferred.offer(token,action,id,{now:performance.now(),battle,owner:controller,controls:c});}
  else if(expert){const id=state.actionSlots?.[action];if(state.character.tier==='expert'&&battle.stats.actions[id]?.learned)expertCapture.deferred.offer(token,action,id,{now:performance.now(),battle,owner:controller,slots:state.actionSlots,controls:c});}
  return;
 }
 if(loadout){const intent=skillCapture.press(token,action,c,{canUse:id=>!!battle.stats.actions[id]?.learned});if(!intent&&!c.skillSlots[action]){clearBattleIntent(battle);toast('빈 기술 슬롯입니다. 성장 메뉴의 기술 배치에서 배운 기술을 지정하세요.');}}
 else if(expert){const id=expertCapture.press(token,action,state.actionSlots??emptyActionSlots(),{canUse:id=>state.character.tier==='expert'&&!!battle.stats.actions[id]?.learned});if(!id&&!state.actionSlots?.[action])toast('성장 메뉴의 전문 기술 배치에서 배운 기술을 이 슬롯에 지정하세요.');}
 if(loadout||expert||router.hasPendingCombat())flushFreshCombatInput();
}
function currentPoeAim(){
 const c=config(),result={};for(const id of ['mace_swing','righteous_hammer','shield_charge','lay_on_hands','judgement','battle_banner','zealous_onslaught'])result[id]=resolvePoeAim(input.pointerScreen,battle,canvas.width,canvas.height,{aimingMode:c.poe?.aimingMode??'cursor',targetingHeight:id==='righteous_hammer'?REBORN_AIM_HEIGHTS.projectile:REBORN_AIM_HEIGHTS.strike});if(battle?.stormEnabled)result.mace_swing.bellId=stormBellHover(input.pointerScreen,battle,canvas.width,canvas.height,projectWorld,ISO.zoom);return result;
}
function sampledCombatInput(){
 const c=config(),base=router.snapshot(c),skills=c.version===5?canonicalSkillInput(skillCapture.snapshot(c)):expertCapture.snapshot(),routed={...base,...skills,heldActions:{...base.heldActions,...skills.heldActions}},keys=screenMovement(routed.move.x,routed.move.y),lastMove=routed.lastMove?screenMovement(routed.lastMove.x,routed.lastMove.y):null,chargeAngle=c.chargeDirection==='movement'&&lastMove?Math.atan2(lastMove.y,lastMove.x):undefined;
 if(isPoeControls(c)){
  const aimBySkill=currentPoeAim(),ground=resolvePoeAim(input.pointerScreen,battle,canvas.width,canvas.height,{groundTargeted:true}),walking=locomotionIntent.step({battle,mode:c.poe.movementMode,keys,held:routed.moveOnly&&!contextSuppressHeld&&!contextClick.active,groundPoint:ground.groundPoint,stop:routed.stop,attackInPlace:routed.attackInPlace,stopForInPlace:c.poe.attackInPlaceStopsMovement});
  battle.targetId=aimBySkill.mace_swing.targetId;battle.moveDestination=walking.destination;
  const released={...releasedAimBySkill};releasedAimBySkill={};
  const aim=aimBySkill.mace_swing.aim??{x:battle.p.x+Math.cos(battle.p.angle)*100,y:battle.p.y+Math.sin(battle.p.angle)*100};
  return {...routed,move:walking.move,moveDistance:walking.distance,moveTarget:walking.waypoint,aim,aimBySkill,releasedAimBySkill:released,poeInput:{...c.poe},chargeAngle};
 }
 locomotionIntent.clear();battle.moveDestination=null;
 const targeting=resolveCursorAim(input.pointerScreen,battle,canvas.width,canvas.height);battle.targetId=targeting.targetId;
 const aim=targeting.aim??battle.enemies.filter(e=>e.hp>0&&lineOfSight(battle.map,battle.p,e)).sort((a,b)=>Math.hypot(a.x-battle.p.x,a.y-battle.p.y)-Math.hypot(b.x-battle.p.x,b.y-battle.p.y))[0];
 return {...routed,move:keys,aim,chargeAngle};
}
function deliverCombatAudio(event){
 if(event.type==='mobilityCancelled')return audio.cancel('mobility');
 if(event.type==='soundCancel')return audio.cancel(event.tag);
 if((event.type==='actionContact'&&event.id!=='shield_charge')||['actionCancelled','channelEnded'].includes(event.type)||(event.type==='channelPulse'&&event.index===1))return audio.cancel(`cast:${event.castId}`);
 if(['defeated','enemyAttackInterrupted'].includes(event.type))return audio.cancel(`enemy:${event.id}`);
 if(event.type!=='sound')return;
 if(event.name==='enemyRelease')audio.cancel(event.tag);
 const located=Number.isFinite(event.x)&&Number.isFinite(event.y),dx=located?event.x-battle.p.x:0,dy=located?event.y-battle.p.y:0;
 return audio.play(event.name,{...event,pan:Math.max(-.78,Math.min(.78,projectWorld(dx,dy).x/360)),distance:located?Math.hypot(dx,dy):0});
}
function deliverCombatEvents(events){
 if(isPoeControls(config()))poeFeedback.accept(events,battle.p);
 let previousEvent=null;for(const e of events){const soundResult=deliverCombatAudio(e);if(e.type==='roll-start'||e.type==='sprint-start'){const start=inputLatency.mobilityStarted(e);if(e.type==='roll-start')inputLatency.mobilitySoundRequested(start,audio.play('dash',{owner:'hero',tag:'mobility'}));}if(e.type==='actionStarted'){inputLatency.started(e);if(dismissRecoveryNotice($('toast'),e.id))noticeUntil=0;}if(e.type==='actionContact')inputLatency.mark('contact',e.castId);if(['skillIntentRejected','skillIntentCancelled','mobilityRejected'].includes(e.type))inputLatency.clear(e.reason);if(e.type==='sound')inputLatency.soundRequested(e,soundResult,previousEvent);if(e.type==='skillIntentRejected'&&e.reason==='recovery-too-early')toast('후딜 중 · 동작이 끝나기 직전에 다시 누르세요.',{recoverySkillId:e.id});if(e.type==='skillIntentRejected'&&e.reason==='not-ready'&&e.learned)toast(actionBlockedText(e)||'지금 사용할 수 없습니다.');previousEvent=e;}
 const checkpoint=combatCheckpoint(battle,events,{elapsed:combatSaveElapsed});if(checkpoint){const captured=controller.capture();if(!captured.state||battle.stateLife!==(captured.state.world.life??0)||battle.region!==captured.state.world.region)throw new Error('전투와 저장 위치가 다릅니다. 저장을 다시 확인하세요.');checkpoint.expectedStoreRevision=captured.revision;dispatch(checkpoint,{critical:true}).then(ok=>{if(ok&&state.world.lifeDown)showDeath();});}
}
function flushFreshCombatInput(){
 if(!gate.canStep({hasBattle:!!battle,paused,busy:busy||expertSafety.pending,hidden:document.hidden,focused:document.hasFocus()})||state.world.lifeDown)return;
 const expired=[...router.expirePending(performance.now()),...skillCapture.expirePending(performance.now())];if(expired.length){inputLatency.clear('save-input-expired');toast('저장 대기가 길어 입력을 취소했습니다. 다시 눌러 주세요.');}
 try{deliverCombatEvents(acceptBattleInput(battle,sampledCombatInput()));}catch(error){gate.block(error.message);panel('입력 처리를 멈췄습니다',`<p>${esc(error.message)}</p><p>마지막 확정 저장을 확인하세요.</p>${button('저장 다시 읽기','reload')}`);}
}
function flushDeferredSkills(){
 if(!battle||!state)return false;
 const deferredSkill=skillCapture.deferred.flush({now:performance.now(),battle,owner:controller,controls:config(),busy:busy||expertSafety.pending,paused,blocked:gate.blocked,lifeDown:state.world.lifeDown||battle.p.hp<=0,focused:document.hasFocus(),hidden:document.hidden},intent=>{skillCapture.press(intent.token,intent.slot,config(),{canUse:id=>id===intent.id&&!!battle.stats.actions[id]?.learned,time:intent.time,sequence:intent.sequence});if(intent.released)skillCapture.up(intent.token);});
 if(deferredSkill.status==='expired')toast('저장 처리가 늦어 기술 입력을 취소했습니다. 다시 눌러 주세요.');
 const deferredExpert=expertCapture.deferred.flush({now:performance.now(),battle,owner:controller,slots:state.actionSlots,controls:config(),busy:busy||expertSafety.pending,paused,blocked:gate.blocked,lifeDown:state.world.lifeDown||battle.p.hp<=0,focused:document.hasFocus(),hidden:document.hidden},intent=>{expertCapture.press(intent.token,intent.slot,state.actionSlots,{canUse:id=>id===intent.id&&state.character.tier==='expert'&&!!battle.stats.actions[id]?.learned});if(intent.released)expertCapture.up(intent.token);});
 if(deferredExpert.status==='expired')toast('저장 처리가 늦어 전문 기술 입력을 취소했습니다. 다시 눌러 주세요.');
 return deferredSkill.status==='dispatched'||deferredExpert.status==='dispatched';
}
function releaseCombatToken(token){
 const c=config(),captured=c.version===5?skillCapture.peekToken(token):null;
 let releaseSample=null;if(battle&&!paused&&isPoeControls(c)){const action=captured?.slot??Object.keys(c.bindings).find(a=>c.bindings[a].includes(token))??(token.startsWith('Touch:')?token.slice(6):null),id=c.version===5?captured?.id:({attack:'mace_swing',hammer:'righteous_hammer',charge:'shield_charge',heal:'lay_on_hands',judgement:'judgement',...state.actionSlots})[action];if(id)releaseSample={action,id,sample:currentPoeAim()[id]};}
 router.up(token);if(c.bindings.moveOnly?.includes(token)||token==='Touch:moveOnly')contextSuppressHeld=false;
 const capture=c.version===5?skillCapture:expertCapture,safetyRelease=busy&&capture.owns(token);
 capture.up(token,{cancelReason:safetyRelease?'store-busy-release':null});
 if(releaseSample&&!(c.version===5?skillCapture.isHeld(releaseSample.id):router.isHeld(releaseSample.action)))releasedAimBySkill[releaseSample.id]=releaseSample.sample;
 if(safetyRelease)clearInput('store-busy-release');
 else if((battle?.p.action?.id==='zealous_onslaught'||isPoeControls(c))&&!busy&&!paused)flushFreshCombatInput();
}

function toast(text,{recoverySkillId=null}={}){const status=!modal.hidden&&modal.querySelector?.('[data-dialog-status]');if(status)status.textContent=text;$('toast').recoverySkillId=recoverySkillId;$('toast').textContent=text;$('toast').classList.add('visible');noticeUntil=performance.now()+3300;}
function panel(title,content,wide=false){rememberDialogTrigger(modal,modal.ownerDocument?.activeElement);modal.presentationEpoch=(modal.presentationEpoch??0)+1;modal.safetyPause=false;if(gate.blocked){title='저장을 확인해야 합니다';content=`<p>${esc(gate.reason)}</p><p>저장 상태를 다시 읽기 전에는 진행할 수 없습니다.</p>${button('저장 다시 읽기','reload')}`;wide=false;}captureBinding=null;paused=true;clearInput();audio.pause(true);modal.hidden=false;modal.innerHTML=`<section class="panel ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"><h2 id="dialog-title">${title}</h2><p data-dialog-status role="status" aria-live="polite"></p>${content}</section>`;focusDialog(modal);setDialogBackground(modal,true);}
function closePanel(){if(!gate.canResume({hasBattle:!!battle,lifeDown:state?.world.lifeDown}))return;modal.presentationEpoch=(modal.presentationEpoch??0)+1;modal.safetyPause=false;modal.hidden=true;modal.innerHTML='';paused=false;clearInput();audio.pause(false);setDialogBackground(modal,false);restoreDialogFocus(modal,canvas);last=performance.now();}
function report(){
 // Synchronous capture binds this exact live report to its committed base.
 // A rejected snapshot must never be restamped with a later revision.
 const captured=controller.capture();
 if(!battle||!captured.state||battle.region!==captured.state.world.region)throw new Error('전투와 저장 위치가 다릅니다. 저장을 다시 확인하세요.');
 // Preserve a stale life's original identity so the controller rejects it with
 // its normal STALE_LIFE feedback; never relabel it as the current life.
 return {...battleReport(battle),expectedStoreRevision:captured.revision};
}
function syncVitals(resetRecovery=false){syncCommittedBattle(battle,state,{resetRecovery});}
async function dispatch(command,{rebuild=false,critical=false,safetyCommit=false}={}){
  if(busy)return false;if(!safetyCommit&&flushActionSafety())return false;busy=true;
  const owner=controller,pending=owner.dispatch(command);dispatch.waiting=pending;const r=await pending;if(owner!==controller)return false;busy=false;
  if(!r.ok){clearInput('save-fault');toast(r.reason??r.code);if(critical||r.blocked||['COMMIT_UNCERTAIN','CONFLICT','CORRUPT'].includes(r.code)){gate.block(r.reason??r.code);panel('저장을 확인해야 합니다','');}return false;}
  state=freezeOwnedSnapshot(r.state);combatSaveElapsed=0;if(battle)battle.equipmentContext=state;
  if(['setControls','assignSkillSlot'].includes(command.type)){clearInput('controls-changed');configurePoeControls(battle,controlsFor(state));}
  if(rebuild){audio.cancel('hero');audio.cancel('enemy');contactTrace.clear();frameObservation.clear('travel');contextClick.clear('travel');contextSuppressHeld=false;deferredImmediate.clear();poeFeedback.clear();locomotionIntent.clear();battle=createBattle(state,{crusherEnabled:battle?.crusherEnabled===true,stormEnabled:battle?.stormEnabled===true});router.clear({resetMovement:true});}else if(DUNGEON_COMMANDS.has(command.type)||QUARRY_COMMANDS.has(command.type)||PASS_COMMANDS.has(command.type)||SIGNAL_COMMANDS.has(command.type)||FURNACE_COMMANDS.has(command.type)||TOMB_COMMANDS.has(command.type)||BATTLEFIELD_COMMANDS.has(command.type)||WILDERNESS_COMMANDS.has(command.type)||['trainStarter','settleCombat','checkpoint','rest','drinkPotion','openTownPortal','equipment','promoteAdept','promoteExpert','assignActionSlot','assignSkillSlot','purchaseSkill','allocateAttribute'].includes(command.type))syncVitals(command.type==='rest');else if(battle)battle.stats=deriveStats(state.character,state).stats;
  const promoted=r.events.find(e=>e.type==='promoted');if(promoted)toast(`${tierLabel(promoted.tier)} 전사로 승급했습니다. 기술 구매와 전문 기술 배치는 별도입니다.`);
  if(r.events.some(e=>['dungeonChanged','quarryChanged','passChanged','signalChanged','furnaceChanged','tombChanged','battlefieldChanged','wildernessChanged'].includes(e.type)&&e.mapChanged)&&battle){battle.map=createMap(battle.region,state);for(const e of battle.enemies)e.pathTimer=0;}
  for(const e of r.events){if(e.type==='wildernessSequenceChanged')toast(e.matched?`수신판 입력 ${e.step}/3 · 바람깃 → 돌무덤 → 잿불`:e.reason);if(e.type==='wildernessModeChosen')toast(e.mode==='cover'?'엄폐판을 유지했습니다. 양옆 퇴로가 열려 있습니다.':'중앙 통로를 열었습니다. 적 화염선과 양옆 퇴로를 확인하세요.');if(e.type==='wildernessReported')toast('황야 보고 완료 · 다음 담당 오린의 수리소 의뢰는 아직 구현 준비 중입니다.');const battlefieldCopy=battlefieldEventCopy(e);if(battlefieldCopy)toast(battlefieldCopy);const tombCopy=tombEventCopy(e);if(tombCopy)toast(tombCopy);if(e.type==='signalRouteReset')toast('같은 레버를 다시 눌러 0/2로 초기화했습니다. 송신 → 수신: 서쪽 / 수신 → 송신: 동쪽');if(e.type==='signalRouteAdvanced')toast(`접근로 선택 1/2 · 다음 ${e.nextNode==='receiver'?'수신':'송신'} 레버`);if(e.type==='signalRouteChosen')toast(`${e.direction==='west'?'서쪽':'동쪽'} 접근로를 열었습니다. 선택은 고정됩니다.`);if(e.type==='passSignalReset')toast('순서가 달라 정렬을 0/3으로 되돌렸습니다. 바람 → 불꽃 → 돌');if(e.type==='passSignalAdvanced')toast(`신호 정렬 ${e.step}/3 · 바람 → 불꽃 → 돌`);if(['dungeonReward','quarryReward','passReward','signalReward','furnaceReward','tombReward','battlefieldReward','wildernessReward'].includes(e.type))toast(`탐험 기록 저장 · 경험치 ${e.xp??0} / 금화 ${e.gold??0}`);if(e.type==='levelUp'){audio.play('level');toast(`레벨 ${state.character.level} · 능력치와 기술점수를 얻었습니다`);}if(e.type==='rewardClaimed')toast(`의뢰 완료 · 경험치 ${e.xp} / 금화 ${e.gold}`);}
  updateHud();
  // Travel may finish after Escape opened the menu. Refresh only its live region
  // label; never reopen/rebuild a panel or checkpoint from this commit callback.
  const pauseRegion=!modal.hidden&&modal.querySelector?.('[data-pause-region]');
  if(pauseRegion)pauseRegion.textContent=getRegion(state.world.region).name;
  if(!paused)queueMicrotask(()=>{flushDeferredSkills();if(router.hasPendingCombat()||skillCapture.hasPendingCombat())flushFreshCombatInput();});
  return true;
}
function wildernessView(snapshot,kind,id){
 const read=()=>kind==='portal'?wildernessPortalView(snapshot,id):wildernessObjectView(snapshot,getRegion('signal_wilderness').objects.find(o=>o.id===id));
 // External/test mutable snapshots must not reuse a view after in-place edits.
 // Runtime snapshots are frozen only after controller validation at reception.
 if(!isImmutableSnapshot(snapshot))return read();
 const cache=wildernessView.cache??=new WeakMap();let views=cache.get(snapshot);
 if(!views){views=new Map();cache.set(snapshot,views);}const key=kind+':'+id;
 if(!views.has(key))views.set(key,read());
 return views.get(key);
}
function interactionCandidates(){
 if(!battle)return [];const r=getRegion(battle.region),all=[...r.npcs.map(x=>({...x,kind:'npc'})),...r.objects.filter(x=>x.type==='dungeon'&&!(x.actionKind==='lift'&&state.world.objectives.sluice_shortcut_open)).map(x=>({...x,kind:'dungeon',...dungeonObjectView(state,x)})),...r.objects.filter(x=>x.type==='quarry'&&!(x.hideWhenCompleted&&quarryObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'quarry',...quarryObjectView(state,x)})),...r.objects.filter(x=>x.type==='pass'&&!(x.hideWhenCompleted&&passObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'pass',...passObjectView(state,x)})),...r.objects.filter(x=>x.type==='signal'&&!(x.hideWhenCompleted&&signalObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'signal',...signalObjectView(state,x)})),...r.objects.filter(x=>x.type==='furnace'&&!(x.hideWhenCompleted&&furnaceObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'furnace',...furnaceObjectView(state,x)})),...r.objects.filter(x=>x.type==='tomb'&&!(x.hideWhenCompleted&&tombObjectView(state,x).completed)).map(x=>({...x,kind:'tomb',...tombObjectView(state,x)})),...r.objects.filter(x=>x.type==='battlefield'&&!(x.hideWhenCompleted&&battlefieldObjectView(state,x).completed)).map(x=>({...x,kind:'battlefield',...battlefieldObjectView(state,x)})),...r.objects.filter(x=>x.type==='wilderness'&&!(x.hideWhenCompleted&&wildernessView(state,'object',x.id).completed)).map(x=>({...x,kind:'wilderness',...wildernessView(state,'object',x.id)})),...r.portals.filter(x=>(!x.gate?.startsWith('furnace_')||state.world.objectives.furnace_accepted===1)&&(!x.gate?.startsWith('tomb_')||state.world.objectives.tomb_accepted===1)&&(!x.gate?.startsWith('battlefield_')||state.world.objectives.battlefield_accepted===1)&&(!x.gate?.startsWith('wilderness_')||state.world.objectives.wilderness_accepted===1)).filter(x=>battle.region!=='signal_wilderness'||wildernessView(state,'portal',x.id).allowed).map(x=>({...x,kind:'portal',name:x.id.includes('wilderness')?wildernessView(state,'portal',x.id).name:x.gate?.startsWith('battlefield_')?battlefieldPortalLabel(state,x):x.gate?.startsWith('tomb_')?tombPortalLabel(state,x):x.name})),...r.objects.filter(x=>x.type==='chest').map(x=>({...x,kind:'chest',...chestPresentation(state,x.id)}))];
 const personal=townPortalCandidate(state);if(personal)all.unshift(personal);return all;
}
function nearest(){if(!battle)return null;return selectInteractionTarget({position:battle.p,map:battle.map,candidates:interactionCandidates(),regionId:battle.region,objectives:state.world.objectives});}

function interact(selected=null){if(paused||busy||!battle||state.world.lifeDown||battle.p.hp<=0)return;contextClick.clear('interaction');locomotionIntent.clear();clearBattleIntent(battle);const exact=selected?interactionCandidates().filter(o=>o.id===selected.id&&o.kind===selected.kind):null,object=selected?(exact.length===1&&near(battle.p,exact[0])&&lineOfSight(battle.map,battle.p,exact[0])?exact[0]:null):nearest();if(!object){toast(`가까운 인물이나 출입구에서 ${keyName('interact')}를 누르세요.`);return;}if(object.kind==='npc')showNpc(object.id);else if(object.kind==='dungeon')showDungeon(object.id);else if(object.kind==='quarry')showQuarry(object.id);else if(object.kind==='pass')showPass(object.id);else if(object.kind==='signal')showSignal(object.id);else if(object.kind==='furnace')showFurnace(object.id);else if(object.kind==='tomb')showTomb(object.id);else if(object.kind==='battlefield')showBattlefield(object.id);else if(object.kind==='wilderness')showWilderness(object.id);else if(object.kind==='townPortal')dispatch({type:'enterTownPortal',region:battle.region,portalOpenedAtMs:object.openedAtMs,...report()},{rebuild:true,critical:true});else if(object.kind==='portal')dispatch({type:'travel',to:object.to,portalId:object.id,...report()},{rebuild:true});else if(object.open)toast(object.message);else dispatch({type:'openChest',chestId:object.id,...report()});}
function contextSceneVisibility(){return wildernessSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>wildernessView(state,'object',o.id),portalView:o=>wildernessView(state,'portal',o.id)})??signalSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>signalObjectView(state,o)});}
function contextProjection(object){const focus=projectWorld(battle.p.x,battle.p.y),q=projectWorld(object.x,object.y);return {x:canvas.width*.5+(q.x-focus.x)*ISO.zoom,y:canvas.height*.55+(q.y-focus.y)*ISO.zoom};}
function contextIsVisible(object,scene){return !scene||scene.objectVisible(object);}
function contextHasLabel(object,scene){
 if(object.kind==='chest')return false;
 if(!['npc','portal'].includes(object.kind)&&!near(battle.p,object,230))return false;
 if(object.kind==='townPortal'&&scene?.combat)return false;
 if(scene&&object.kind!=='townPortal'&&!scene.landmarkLabel(object))return false;
 const p=contextProjection(object);return !(scene&&p.x-60<canvas.width*.5+25&&p.x+60>canvas.width*.5-25&&p.y-74<canvas.height*.55+8&&p.y-53>canvas.height*.55-64);
}
function beginContextOrGroundClick(){
 const candidates=interactionCandidates(),scene=contextSceneVisibility(),visible=o=>contextIsVisible(o,scene)&&lineOfSight(battle.map,battle.p,o),target=pickContextClickTarget({screenPoint:input.pointerScreen,candidates,toScreen:contextProjection,visible,labelVisible:o=>contextHasLabel(o,scene),width:canvas.width,height:canvas.height,zoom:ISO.zoom});
 contextClick.clear('new-click');contextSuppressHeld=false;locomotionIntent.clear();
 if(target){contextSuppressHeld=true;if(contextClick.press({target,battle,candidates,visible})){locomotionIntent.press(contextClick.destination,battle);return;}toast('이 대상까지 안전하게 접근할 수 없습니다. 다른 지점을 클릭하세요.');return;}
 const aim=resolvePoeAim(input.pointerScreen,battle,canvas.width,canvas.height,{groundTargeted:true});locomotionIntent.press(aim.groundPoint,battle);
}
function stepContextClick(dt){
 if(!contextClick.active)return;
 const scene=contextSceneVisibility(),r=contextClick.step({battle,candidates:interactionCandidates(),visible:o=>contextIsVisible(o,scene),dt,busy:busy||expertSafety.pending,execute:object=>interact(object)});
 if(r.destination)locomotionIntent.press(r.destination,battle);else locomotionIntent.clear();
 if(r.status==='cancelled'&&['blocked','timeout'].includes(r.reason))toast('대상 접근이 막혀 멈췄습니다. 새 지점을 클릭하세요.');
}
async function showDungeon(id){
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='dungeon');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 const view=dungeonObjectView(state,object);panel(view.name,`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(a=>button(esc(a.label),`dungeon:${id}${a.value===undefined?'':':'+a.value}`,'class="primary"')).join('')}${button('돌아가기','close')}</div>`);
}
async function showQuarry(id){
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='quarry');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 const view=quarryObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(a=>button(esc(a.label),`quarry:${id}${a.value===undefined?'':':'+a.value}`,'class="primary"')).join('')}${button('돌아가기','close')}</div>`);
}async function showPass(id){
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='pass');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 const view=passObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(a=>button(esc(a.label),`pass:${id}${a.value===undefined?'':':'+a.value}`,'class="primary"')).join('')}${button('돌아가기','close')}</div>`);
}
async function showSignal(id){
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='signal');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 const view=signalObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(a=>button(esc(a.label),`signal:${id}`,'class="primary"')).join('')}${button('돌아가기','close')}</div>`);
}
async function showFurnace(id){
 const epoch=modal.presentationEpoch??0;
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='furnace');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 if(epoch!==(modal.presentationEpoch??0))return;
 const view=furnaceObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(a=>button(esc(a.label),`furnace:${id}${a.choice===undefined?'':':'+a.choice}`,'class="primary"')).join('')}${button('돌아가기','close')}</div>`);
}
// Each button keeps the token and identity from the view that produced it.
// Old DOM events must never be refreshed into a new glyph input.
function tombActionButton(action){
 const fields=tombCommandFields(action);if(!fields)return '';
 const encoded=esc(JSON.stringify(fields)),epoch=(modal.presentationEpoch??0)+1;
 return button(esc(action.label),'tomb-action',`class="primary" data-tomb-command="${encoded}" data-tomb-epoch="${epoch}"`);
}
async function showTomb(id){
 const epoch=modal.presentationEpoch??0,origin=battle;
 if(!battle||state.world.lifeDown||battle.p.hp<=0)return;
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='tomb');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 if(epoch!==(modal.presentationEpoch??0)||origin!==battle||state.world.lifeDown)return;
 const view=tombObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(tombActionButton).join('')}${button('돌아가기','close')}</div>`);
}
function battlefieldActionButton(action){
 const fields=battlefieldCommandFields(action);if(!fields)return '';
 const encoded=esc(JSON.stringify(fields)),epoch=(modal.presentationEpoch??0)+1;
 return button(esc(action.label),'battlefield-action',`class="primary" data-battlefield-command="${encoded}" data-battlefield-epoch="${epoch}"`);
}
async function showBattlefield(id){
 const epoch=modal.presentationEpoch??0,origin=battle;
 if(!battle||state.world.lifeDown||battle.p.hp<=0)return;
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='battlefield');if(!object)return;
 if(!paused&&state.vitals&&!await dispatch({type:'checkpoint',...report()}))return;
 if(epoch!==(modal.presentationEpoch??0)||origin!==battle||state.world.lifeDown)return;
 const view=battlefieldObjectView(state,object);panel(esc(view.name),`<p>${esc(view.detail)}</p><div class="buttons">${view.actions.map(battlefieldActionButton).join('')}${button('돌아가기','close')}</div>`);
}
function wildernessActionButton(action,captured){
 const fields=wildernessCommandFields(action);if(!fields||fields.expectedStoreRevision!==captured.revision)return '';
 const snapshot=captured.state,command={...fields,life:snapshot.world.life,position:snapshot.world.position,vitals:snapshot.vitals,recovery:snapshot.recovery};
 // Serialization is the capture boundary. No report is reconstructed on click.
 return button(esc(action.label),'wilderness-action',`class="primary" data-wilderness-command="${esc(JSON.stringify(command))}" data-wilderness-epoch="${(modal.presentationEpoch??0)+1}"`);
}
async function showWilderness(id){
 if(!battle||state.world.lifeDown||battle.p.hp<=0)return;
 const object=getRegion(battle.region).objects.find(o=>o.id===id&&o.type==='wilderness');if(!object)return;
 const owner=controller,origin=battle;panel('황야 기록 확인 중',`<p>현재 자원과 행동 기록을 저장합니다.</p>${button('돌아가기','close')}`);const epoch=modal.presentationEpoch;
 if(!await checkpointPanel(owner,origin,epoch))return;
 const captured=owner.capture(),view=wildernessObjectView(captured.state,object,{revision:captured.revision});
 panel(esc(view.name),`<p>${esc(view.detail)}</p>${view.actions.map(action=>`<article>${action.detail?`<p>${esc(action.detail)}</p>`:''}${wildernessActionButton(action,captured)}</article>`).join('')}<div class="buttons">${captured.state.world.objectives.wilderness_surveyed?button('측량판 단서 기록','journal'):''}${button('돌아가기','close')}</div>`);
}
function showJournal(){
 if(!state||!battle||state.world.lifeDown)return;
 const clue=tombClueView(state),bGuide=battlefieldGuidance(state),wClue=wildernessClue(state),wGuide=wildernessGuidance(state);panel('탐험 기록',`${wGuide?`<h3>${esc(wGuide.title)}</h3><p>${esc(wGuide.detail)}</p>`:''}${wClue?`<h3>${esc(wClue.title)}</h3><p>${esc(wClue.text)}</p><p>${esc(wClue.sequenceText)} · ${wClue.solved?'조정 완료':`입력 ${wClue.step}/3`}</p><div class="divider"></div>`:''}${bGuide?`<h3>${esc(bGuide.title)}</h3><p>${esc(bGuide.detail)}</p><div class="divider"></div>`:''}${clue?`<h3>${esc(clue.title)}</h3><p>${esc(clue.detail)}</p>`:'<p>아직 묘실 투영 단서를 해독하지 않았습니다.</p>'}${button('돌아가기','close')}`);
}
function effectText(values,referenceValues=null,blockedCode=null){
 if(!values){
  if(!referenceValues)return '효과 정보 없음';
  // Reference-only explanation: never synthesize a learned parent or usable runtime spec.
  const labels={cooldownAddSeconds:['쿨다운 증가','초'],pureDamage:['순수 피해',''],damageTakenChangePercent:['받는 피해 변화','%'],castSpeedIncreasePercent:['시전속도 증가','%'],manaCostChangePercent:['MP 비용 변화','%'],damage:['피해 기준값',''],physicalFireSplit:['물리/화염 분할',''],range:['범위',''],staminaCostIncreasePercent:['기력 비용 증가','%'],spellCritChanceBonusPercent:['주문 치명 확률 보너스','%p'],fireDamage:['화염 피해',''],effectCooldownSeconds:['효과 쿨다운','초'],areaRadius:['반경',''],damageIncreasePercent:['피해 증가','%'],mainhandDamagePercent:['주무기 피해 비율','%']};
  const fields=Object.entries(referenceValues).filter(([key,value])=>key in labels&&(value===null||Number.isFinite(value))).map(([key,value])=>`${labels[key][0]} ${value===null?'미확인':`${key==='spellCritChanceBonusPercent'&&value>0?'+':''}${value}${labels[key][1]}`}`);
  const condition=blockedCode==='EXCLUSIVE'?'반대 배타 분기 선택으로 적용 불가':blockedCode==='BASE_SKILL'?'기반 기술 필요':'기반 기술/훈련 조건 필요';
  return `참조 랭크값 · ${condition} · ${fields.join(' · ')||'알려진 수치 없음'}`;
 }
 const labels={fullPowerPulses:'선봉 최대위력 도달 틱(1/2/3/4틱은25/50/75/100%)',fullChannelStaminaCost:'최대4초 총기력(피격 방패비용 별도)',channelStaminaCost:'회당 기력',blockStaminaCost:'방패 막기 기력',channelDuration:'최대 채널(초)',paymentInterval:'기력 결제 간격(초)',buffDuration:'효과 지속(초)',castSpeedMultiplier:'시전속도 배율',attackSpeedMultiplier:'공격속도 배율',manaCostMultiplier:'MP 비용 배율',recurringManaCost:'매초 MP',hammerCooldown:'망치 쿨다운(초)',healCooldown:'온기 쿨다운(초)',punishMultiplier:'무장해제/침묵 대상 피해 배율',chance:'발동 확률',criticalChance:'주문 치명타 확률',physicalDamage:'물리 피해',fireDamage:'화염 피해',fireDamageMultiplier:'화염 피해 배율',fireResistance:'화염 저항',arcRadians:'호 각도(rad)',halfWidth:'통로 반폭',damage:'피해',heal:'회복',manaCost:'마나',staminaCost:'기력',cooldown:'쿨다운(초)',range:'범위',radius:'반경',duration:'지속(초)',stunChance:'기절 확률',stunSeconds:'기절(초)',armorPenetration:'방어 관통',chargeDamage:'돌진 피해',chargeStaminaCost:'돌진 기력',blockMoveMultiplier:'방패 이동 배율',moveMultiplier:'이동 배율',damageReduction:'방어 감소율',damageTakenMultiplier:'받는 피해 배율',armor:'방어',hpMax:'최대 체력',manaMax:'최대 마나',strength:'전투 힘',equipmentStrength:'장착 요구용 힘',intelligence:'지능',moveSpeed:'이동 속도',staminaCostMultiplier:'기력 비용 배율',physicalDamage:'물리 공격',physicalDamageMultiplier:'물리 피해 배율',poisonResistance:'독 저항',hammerDamage:'망치 피해',hammerManaCost:'망치 마나',judgementManaCost:'단죄 마나',judgementCooldown:'단죄 쿨다운',coefficient:'현재 기력 비례',damageMultiplier:'피해 배율',tickSeconds:'틱 간격(초)',amount:'방어 감소',multiplier:'재생 배율',fire:'화염',ice:'냉기',lightning:'번개',poison:'독'};
 const direct=Object.entries(values).filter(([key,value])=>key in labels&&Number.isFinite(value)).map(([key,value])=>`${labels[key]} ${Math.round(value*100)/100}`);
 for(const [key,label,scale]of [['fireResistanceBonus','화염 저항 증가',1],['spellCriticalChanceBonus','주문 치명 확률 보너스',100]])if(Number.isFinite(values[key])){const amount=Math.round(values[key]*scale*100)/100;direct.push(`${label} ${amount>0?'+':''}${amount}%p`);}
 if(values.cleanse)direct.push('시전이 성공해 회복이 발동할 때 감속·기절·무장해제·침묵·화상·독 제거 · 침묵·기절 중에는 시전 불가');if(values.guard)direct.push('진격 중 정면 방패 · 막기 기력 별도');if(values.returning)direct.push('돌아오는 망치 · 왕복 각1회 적중 · 벽 차단');if(values.channel)direct.push('키를 누르는 동안 전진 · 기력 회당 결제');
 if(values.passesThroughEnemies)direct.push('적 관통 · 벽은 통과 불가');
 for(const [key,label]of Object.entries({flameArc:'철퇴 화염 호',undead:'언데드 순수 피해',lance:'해제 화염 선봉',innerFlame:'내면의 불꽃',flamingWrath:'주문 치명 폭발',lawbringer:'응징 무장해제/침묵',guilt:'연대 피해',lightning:'번개 파동',armorBreak:'방어 균열',thorns:'가시 반격',regenBuff:'회복 재생',fireArea:'화염 지대',shackles:'속박',resistanceBonus:'속성 저항',resistanceBonusWhileBlocking:'방어 중 속성 저항'}))if(values[key]&&typeof values[key]==='object')direct.push(`${label}: ${effectText(values[key])}`);
 return direct.join(' · ')||'해당 기술의 전투 효과를 강화합니다.';
}
async function showNpc(id){
  if(!battle||state.world.lifeDown||battle.p.hp<=0)return;
  if(id==='trainer'&&state.vitals){showTraining();return;}
  let captured=null;
  if(id==='elder'&&state.vitals){const owner=controller,origin=battle;panel('에다의 기록 확인 중',button('돌아가기','close'));const epoch=modal.presentationEpoch;if(!await checkpointPanel(owner,origin,epoch))return;captured=owner.capture();}
  else if(state.vitals)dispatch({type:'checkpoint',...report()});
  if(id==='blacksmith'||id==='workshop'){showEquipment(id);return;}
  if(id==='trainer'){
    if(!state.vitals){panel('훈련관 브란',`<span class="pill">처음 시작 · 무료 기본 훈련</span><p>잿길에는 한 마리보다 함께 몰려드는 적이 더 위험하지. 철퇴로 가까운 적을 쓸고, 망치로 줄을 꿰뚫어라. 방패는 정면을 바라봐야 막는다.</p><p class="minor">기본 네 기술의 첫 랭크는 무료입니다. 돌진은 기력, 망치는 마나를 소모합니다. 훈련용 무장으로 시작합니다. 첫 순찰 보상으로 대장장이와 작업대에서 장비를 준비하세요.</p><div class="buttons">${button('네 가지 기본 기술 배우기','train','class="primary"')}${button('나중에','close')}</div>`);return;}
  }else if(id==='elder'){
    const accepted=state.world.objectives.patrol_accepted,kills=state.world.objectives.patrol_scouts??0,claimed=state.world.claimedRewards.includes('watch_patrol'),o=state.world.objectives;
    const nextQuest=claimed&&state.world.claimedRewards.includes('chest:warden-cache')?`<div class="divider"></div><h3>잿불 수문소 조사</h3><p>${o.adept_commission?(['adept','expert'].includes(state.character.tier)?'수문소 보고와 숙련 승급을 마쳤습니다. 새 의뢰와 훈련할 기술을 확인하세요.':'수문핵의 조사 결과를 확인했습니다. 위임장을 가지고 훈련관 브란에게 가면 레벨5부터 숙련 승급을 받을 수 있습니다.'):o.first_dungeon_cleared?'수문핵을 가져왔군요. 조사 결과를 보고하고 숙련 위임장을 받으세요.':o.sluice_accepted?'감시자 뒤의 수문소 입구에서 열쇠를 확인합니다. 상층 기록을 읽고 손잡이를 찾아 수문을 복구하세요. 하층의 독립 승강기를 고치면 마을로 쉽게 돌아올 수 있습니다.':'감시자 보급품에 수문소 기록이 있었습니다. 열쇠를 드릴 테니 두 층의 수문을 복구하고 핵을 회수해 주세요. 특정 장비 구매는 필요하지 않습니다.'}</p><p class="minor">최종 보고: 경험치90 · 금화60 · 숙련 위임장. 던전의 처치/발견 보상은 별도입니다.</p>${!o.sluice_accepted?button('수문소 조사와 열쇠 받기','sluice-accept','class="primary"'):o.first_dungeon_cleared&&!o.adept_commission?button('수문핵 조사 결과 보고','sluice-report','class="primary"'):''}`:'';
    const q=quarryElderView(state),quarryQuest=q?`<div class="divider"></div><h3>${esc(q.title)}</h3><p>${esc(q.detail)}</p>${q.action?button(esc(q.label),`quarry-${q.action}`,'class="primary"'):''}`:'';
    const pass=passElderView(state),passQuest=pass?`<div class="divider"></div><h3>${esc(pass.title)}</h3><p>${esc(pass.detail)}</p>${pass.action?button(esc(pass.label),`pass-${pass.action}`,'class="primary"'):''}`:'';
    const tomb=tombElderView(state),tombQuest=tomb?`<article class="quest-card"><h3>${esc(tomb.title)}</h3><p>${esc(tomb.detail)}</p>${tomb.action?tombActionButton(tomb):''}</article><div class="divider"></div>`:'';
    const battlefield=battlefieldElderView(state),battlefieldQuest=battlefield?`<article class="quest-card"><h3>${esc(battlefield.title)}</h3><p>${esc(battlefield.detail)}</p>${battlefield.action?battlefieldActionButton(battlefield):''}</article><div class="divider"></div>`:'';
    const wilderness=captured?wildernessElderView(captured.state,{revision:captured.revision}):null,wildernessQuest=wilderness?`<article class="quest-card"><h3>${esc(wilderness.title)}</h3><p>${esc(wilderness.detail)}</p>${wilderness.action?wildernessActionButton(wilderness,captured):''}</article><div class="divider"></div>`:'';
    panel('촌장 에다',`${wildernessQuest}${battlefieldQuest}${tombQuest}<p>${claimed?esc(tomb?'첫 순찰을 마쳤고 보상은 이미 지급했습니다.':campaignGuidance(state).detail):accepted?`척후를 ${kills}/6 처치했군요. 순찰을 마치면 돌아와 주세요. 강한 방패병은 준비 동작을 보고 옆으로 비켜나세요.`:'오래된 잿길에서 순찰대가 돌아오지 않았어요. 길목의 적 여섯을 쓰러뜨리고 소식을 가져와 주세요.'}</p><p class="minor">${claimed?'완료한 첫 순찰 보상(재수령 불가)':'첫 순찰 보상'}: 경험치70 · 금화20 · 철1. 전투 처치 보상은 별도입니다.</p>${nextQuest}${quarryQuest}${passQuest}<div class="buttons">${!accepted?button('순찰 의뢰 받기','accept',state.vitals?'class="primary"':'disabled'):!claimed&&kills>=6?button('순찰 결과 보고','claim','class="primary"'):''}${button('돌아가기','close')}</div>`);
  }else panel('치유사 리아',`<p>마을에서는 잠시 숨을 고르세요. 밖에서는 물약을 아끼고, 적의 붉은 공격 예고에서 벗어나세요.</p><p class="minor">휴식은 무료로 세 자원을 회복합니다. 물약은 체력 최대치의55%를 회복하며 ${esc(keyName('potion'))}로 사용합니다.</p><div class="buttons">${button('휴식하기','rest','class="primary"')}${button('돌아가기','close')}</div>`);
}
async function checkpointPanel(owner,origin,epoch){
 const life=origin?.stateLife;
 const current=()=>controller===owner&&battle===origin&&(state.world.life??0)===life&&!state.world.lifeDown&&battle.p.hp>0&&!modal.hidden&&epoch===(modal.presentationEpoch??0)&&!gate.blocked;
 if(!current())return false;
 if(busy){if(!dispatch.waiting)return false;await dispatch.waiting;if(!current()||busy)return false;}
 if(flushActionSafety()){if(dispatch.waiting)await dispatch.waiting;if(!current()||busy||expertSafety.pending)return false;}
 if(!state.vitals)return current();
 return await dispatch({type:'checkpoint',...report()},{critical:true})&&current();
}
async function showTraining(view=null){
 const owner=controller,origin=battle;panel('훈련 기록 확인 중',`<p>현재 자원과 기술 사용 기록을 저장합니다.</p>${button('돌아가기','close')}`);const epoch=modal.presentationEpoch,waitingFocus=view?document.activeElement:null;
 if(!await checkpointPanel(owner,origin,epoch)||view&&!view.current())return;
 const rows=RUNTIME_SKILL_IDS.map(id=>{const s=previewSkill(state.character,id,state),expert=s.tier==='expert';return `<article class="skill"><div class="row"><strong>${esc(s.name)}</strong><span>${tierLabel(s.tier)} · ${s.rank}/${s.maxRank}</span></div><p class="effect">현재 ${esc(s.current?effectText(s.current.runtimeValues):'미학습')}<br>다음 ${esc(s.next?effectText(s.next.runtimeValues,expert?s.next.referenceValues:null,s.code):s.rank>=s.maxRank?'최대 랭크':s.reason??'조건 확인 필요')}</p>${(s.warnings??[]).map(w=>`<p class="warning">${esc(w.reason)}</p>`).join('')}${s.exclusiveGroup?`<p class="minor">${s.exclusiveGroup==='battle_banner_support'?'깃발 지원':'망치 피해'} 배타 분기 · 선택 후 반대 분기는 잠깁니다.</p>`:''}${id==='zealous_onslaught'?'<p class="minor">누르는 동안 최대4초 · 매초 기력 결제. 원작 MP 비용은 미확인이고 현재 구현은 MP 소모 없음입니다. 일반 해제와 안전 취소는 다릅니다.</p>':''}${expert?'<p class="minor">참조 랭크표 기반 · 범위, 판정, 채널 결제와 미확인 수치는 Emberwatch 조정값입니다.</p>':''}<div class="row"><span class="minor">${s.cost===null?'최대 랭크':`기술점수 ${s.cost}`}</span>${button(s.available?'강화':esc(s.reason),'skill:'+id,s.available?'class="small"':'class="small" disabled')}</div></article>`;});
 const promotion=state.character.tier==='apprentice'?previewPromotion(state):previewExpertPromotion(state),revision=controller.revision(),expertFee=state.character.tier==='adept';
 const promotionHtml=`<section class="quest-card"><h3>${expertFee?'다음 성장 · 전문가 승급':'훈련 단계'}</h3><p>${esc(promotion.reason)}</p>${promotion.available?button(expertFee?'전문가 승급 · 예약금120 사용':'숙련 전사로 승급 · 금화0',expertFee?'promote-expert':'promote-adept',`class="primary" data-revision="${revision}" data-gold="${promotion.goldCost}"`):''}</section>`;
 const keepFocus=view&&document.activeElement===waitingFocus;
 panel('전사의 훈련',`<p>${tierLabel(state.character.tier)} 전사 · 남은 기술점수 <strong>${state.character.skillPoints}</strong></p>${promotionHtml}${STARTER_SKILLS.every(id=>state.character.skills[id]>0)?button('전사 기술 배치','action-slots','class="primary"'):''}${['apprentice','adept','expert'].map(t=>`<details ${state.character.tier===t?'open':''}><summary>${tierLabel(t)} 기술</summary><div class="skills">${RUNTIME_SKILL_IDS.map((id,i)=>previewSkill(state.character,id,state).tier===t?rows[i]:'').join('')}</div></details>`).join('')}<p class="minor">40/53개 전사 노드의 연결을 검증 중입니다. 마스터13노드와 전체 캠페인 완성도는 아직 개발 중입니다. 승급은 기술·점수·자원을 무료 지급하지 않습니다.</p>${button('돌아가기','close')}`,true);
 if(view)view.restore(keepFocus);
}
async function purchaseTrainingSkill(target){
 const pane=modal.querySelector('.panel'),action=target.dataset.action;
 if(busy||modal.hidden||target.disabled||!pane?.contains(target)||!target.closest('.skill'))return;
 const owner=controller,origin=battle,selectedProfile=profile,life=state.world.life,battleLife=battle.stateLife,region=battle.region,epoch=modal.presentationEpoch;
 const focusEpoch=focusEvents.safetyEpoch??0;
 const sameSession=()=>controller===owner&&battle===origin&&profile===selectedProfile&&state.world.life===life&&battle.stateLife===battleLife&&state.world.region===region&&battle.region===region&&!state.world.lifeDown&&battle.p.hp>0&&!gate.blocked;
 if(!sameSession())return;
 if(!await dispatch({type:'purchaseSkill',skillId:action.slice(6),position:{x:battle.p.x,y:battle.p.y}})||!sameSession()||modal.hidden||modal.presentationEpoch!==epoch||modal.querySelector('.panel')!==pane)return;
 // Sample the latest view after payment, then restore only the final trainer,
 // never its transient checkpoint panel or a newer menu/profile.
 const scrollTop=pane.scrollTop,opened=[...pane.querySelectorAll('details')].map(node=>node.open);
 const offset=target.closest('.skill').getBoundingClientRect().top-pane.getBoundingClientRect().top;
 const focused=document.activeElement===target;
 await showTraining({current:sameSession,restore(keepFocus){
  const nextPane=modal.querySelector('.panel'),next=nextPane?.querySelector(`[data-action="${action}"]`),card=next?.closest('.skill');
  if(!sameSession()||!nextPane||!card)return;
  [...nextPane.querySelectorAll('details')].forEach((node,i)=>{node.open=opened[i];});
  nextPane.scrollTop=scrollTop;
  nextPane.scrollTop+=card.getBoundingClientRect().top-nextPane.getBoundingClientRect().top-offset;
  if(focused&&keepFocus&&!document.hidden&&document.hasFocus()&&(focusEvents.safetyEpoch??0)===focusEpoch){
   // A completed/unaffordable row keeps reading focus on its card, never on a
   // disabled purchase or a different actionable button.
   const focus=next.disabled?card:next;if(next.disabled)card.tabIndex=-1;
   focus.focus({preventScroll:true});
  }
 }});
}
async function showSkillSlots(){
 const owner=controller,origin=battle;panel('기술 배치 확인 중',button('돌아가기','close'));const epoch=modal.presentationEpoch;
 if(!await checkpointPanel(owner,origin,epoch))return;
 const c=config();if(c.version!==5)return showActionSlots();
 const slots=c.skillSlots,revision=controller.revision(),choices=[null,...ACTION_SKILL_IDS.filter(id=>state.character.skills[id]>0)];
 panel('전사 기술 배치',`<p>슬롯의 키는 그대로 두고 배운 행동 기술을 지정합니다. 기술을 배워도 빈 슬롯에 자동 배치하지 않습니다. 다른 슬롯으로 옮길 때는 먼저 그 슬롯을 비우세요. 같은 기술의 중복 배치는 막습니다.</p><div class="skills">${SKILL_SLOTS.map((slot,index)=>`<article class="skill"><strong>슬롯 ${index+1} · ${esc(keyName(slot))}</strong><p>${esc(skillNames[slots[slot]]??'비어 있음')}${slots[slot]?` · ${esc(skillBehavior(slots[slot]))}`:''}</p><div class="buttons">${choices.map(id=>{const elsewhere=id&&SKILL_SLOTS.find(other=>other!==slot&&slots[other]===id);return button(id?esc(skillNames[id]):'비우기','assign-skill-slot',`data-slot="${slot}" data-skill="${id??''}" data-expected="${slots[slot]??''}" data-revision="${revision}" ${id===slots[slot]||elsewhere?'disabled':''} ${elsewhere?`title="다른 슬롯 ${esc(keyName(elsewhere))}에 배치됨"`:''}`);}).join('')}</div></article>`).join('')}</div><p class="minor">행동은 지정한 기술을 따릅니다. 철퇴·망치는 홀드 반복, 방패는 유지/전환, 진격은 최초 누른 키가 소유하는 채널, 나머지는 단발입니다. 회피·질주·물약·상호작용은 별도입니다. 메뉴/포커스/배치 변경은 누름과 예약을 비우며 새 입력이 필요합니다.</p>${button('키 설정','controls')}${button('돌아가기','menu')}`,true);
}
async function showActionSlots(){
 if(config().version===5)return showSkillSlots();
 if(state.character.tier!=='expert'){panel('전사 기술 배치',`<p>전체 기술 배치를 켜면 현재 키를 유지하면서 배운 행동 기술을 8개 슬롯에 직접 지정할 수 있습니다. 기존 조작의 정확한 사본을 보존합니다. controls5 기록은 이전 R14a1 코드에서 읽을 수 없습니다. 현재 코드의 키 설정에서 전환 전 조작을 복원할 수 있으며, 진행 전체의 과거 시점 복원이 필요한 경우 복구 페이지에서 이 프로필을 먼저 내보내세요.</p><p>진행·자원·기술 랭크는 바뀌지 않습니다. 회피/질주가 없는 옛 배치에는 새 키를 자동 추가하지 않으므로 POE형 프리셋을 먼저 선택할 수 있습니다.</p>${button('전체 기술 배치 켜기','enable-skill-loadout')}${button('키 설정','controls')}${button('돌아가기','menu')}`);return;}
 const owner=controller,origin=battle;panel('전문 기술 배치 확인 중',button('돌아가기','close'));const epoch=modal.presentationEpoch;
 if(!await checkpointPanel(owner,origin,epoch))return;
 const slots=state.actionSlots??emptyActionSlots(),revision=controller.revision(),names={battle_banner:'잿불 깃발',zealous_onslaught:'불굴의 진격'};
 const choices=[null,...Object.keys(names).filter(id=>state.character.skills[id])];
 panel('전문 기술 배치',`<p class="minor">전체 배치 전환은 기존 키 사본을 보존하지만 controls5 기록은 이전 R14a1 코드로 읽지 못합니다. 현재 코드의 키 설정에서 이전 조작으로 복원할 수 있습니다. 진행 전체의 시점 보존은 복구 페이지의 프로필 내보내기를 사용하세요.</p>${button('8개 전체 기술 배치 켜기','enable-skill-loadout')}<p>기술 구매 후 직접 배치합니다. 기존 키는 바꾸지 않습니다. 빈 키는 키 설정에서 지정하거나 화면 버튼을 사용할 수 있습니다.</p>${EXPERT_SLOTS.map(slot=>`<article class="skill"><strong>${ACTIONS[slot]} · ${esc(keyName(slot))}</strong><p>현재 ${names[slots[slot]]??'비어 있음'}</p><div class="buttons">${choices.map(id=>button(id?names[id]:'비우기','assign-slot',`data-slot="${slot}" data-skill="${id??''}" data-expected="${slots[slot]??''}" data-revision="${revision}" ${state.character.tier!=='expert'||id===slots[slot]||id&&EXPERT_SLOTS.some(other=>other!==slot&&slots[other]===id)?'disabled':''}`)).join('')}</div></article>`).join('')}<p class="minor">깃발은 단발. 진격은 누름 유지, 최초 누른 키를 놓으면 종료합니다. 저장 중 새 전문 입력은 최대0.15초만 기다리며, 진격 키를 먼저 놓으면 시작하지 않습니다. 메뉴·포커스 상실·배치 변경은 공격 없이 취소합니다. 같은 기술을 두 슬롯에 중복 배치할 수 없습니다.</p>${button('키 설정','controls')}${button('돌아가기','menu')}`);
}
function showObjective(){if(!state||!battle||state.world.lifeDown)return;const goal=campaignGuidance(state);if(state.vitals)dispatch({type:'checkpoint',...report()});panel('현재 목표 · '+esc(goal.title),`<p class="pill">안내를 읽는 동안 일시정지</p><p>${esc(goal.detail)}</p><p class="minor">방향은 지역 기준입니다. 화면에서는 북쪽 ↗ · 동쪽 ↘ · 남쪽 ↙ · 서쪽 ↖ 입니다. 이동키는 화면 방향으로 움직입니다.</p>${state.world.objectives?.wilderness_surveyed?button('황야 측량판 단서 기록','journal'):state.world.objectives?.tomb_decoded?button('묘실 투영 단서 기록','journal'):''}${button('돌아가기','close')}`);}
// Safety stops expose no mutable menu controls until the dialog's explicit choice.
// This flag belongs to presentation only; checkpoint and input-clear paths stay shared.
function showMenu(reason='사용자 요청',{safety=false,acknowledge=false}={}){if(!controller||state?.world.lifeDown||battle?.dead||battle?.p?.hp<=0||modal.safetyPause&&!acknowledge)return;pauseReason=typeof reason==='string'?reason:'사용자 요청';if(!acknowledge&&state.vitals&&!state.world.lifeDown)dispatch({type:'checkpoint',...report()});if(safety){panel('안전을 위해 잠시 멈췄습니다',`<p class="pill pause-status">일시정지 · ${esc(pauseReason)}</p><p>전투 입력을 비웠습니다. 계속하거나 전체 메뉴를 직접 열어 주세요.</p><div class="pause-actions" aria-label="안전 일시정지 선택">${button('계속하기','close','class="primary"')}${button('전체 메뉴 열기','safety-menu')}</div>`);modal.safetyPause=!gate.blocked;return;}panel('잿불의 기록',`<p class="pill pause-status">일시정지 · ${esc(pauseReason)}</p><div class="pause-actions" aria-label="주요 메뉴">${button('계속하기','close','class="primary"')}${button('현재 위치 저장','save')}${button('키 설정','controls')}${button('저장 후 시작 화면','leave')}</div><p class="pause-profile">프로필 <strong>${esc(profile)}</strong> · <span data-pause-region>${esc(getRegion(state.world.region).name)}</span> · 레벨${state.character.level} · ${BUILD_LABEL}${candidate?' · 후보 격리 저장':''}</p><div class="buttons pause-secondary">${candidate?button(battle?.crusherEnabled?'파쇄철퇴 · 선택 중':'전투 방식 · 파쇄철퇴','crusher-menu'):''}${candidate?button(battle?.stormEnabled?'폭풍 연격 · 선택 중':'전투 방식 · 폭풍 연격','storm-menu'):''}${button('목표 자세히','objective')}${button('탐험 기록','journal')}${button('조작 안내','help')}${button('장비 / 소지품','inventory')}${STARTER_SKILLS.every(id=>state.character.skills[id]>0)?button('전사 기술 배치','action-slots'):''}</div><details class="pause-details" open><summary>능력치 · 남은 점수 ${state.character.attributePoints}</summary>${['strength','dexterity','intelligence'].map((k,i)=>`<div class="row"><span>${['힘','민첩','지능'][i]} +${state.character.attributes[k]}</span>${button('+1','attribute:'+k,state.character.attributePoints?'class="small"':'disabled')}</div>`).join('')}</details><details class="pause-details"><summary>음량 · 화면 설정</summary>${[['masterVolume','음량'],['screenShake','화면 흔들림'],['flashes','밝은 효과']].map(([k,t])=>`<label class="row">${t}<input type="range" min="0" max="1" step="0.1" value="${state.options[k]}" data-option="${k}"></label>`).join('')}</details><details class="pause-details"><summary>접속 기록 · 입력 / QA</summary><p class="minor">처치${state.stats.kills} · 사망${state.stats.deaths} · XP 수입${state.stats.earnedXp} · 금화 수입${state.stats.earnedGold}/지출${state.stats.spentGold}<br>이번 접속: 플레이${Math.floor(displayTime)}초 / 교전${Math.floor(combatTime)}초 / 이동${Math.floor(walkTime)}초 / 메뉴${Math.floor(menuTime)}초 / 진입대기${Math.floor(arrivalWaitTime)}초. 교전과 이동은 중첩 가능합니다.<br>브라우저: ${esc(document.visibilityState)} / 포커스 ${document.hasFocus()?'있음':'없음'} · 전투는 메뉴 중 정지합니다.<br>마지막 blur: ${esc(focusEvents.blurAt)} / visibility: ${esc(focusEvents.visibilityAt)} (${esc(focusEvents.visibilityState)})</p><div class="buttons">${button('입력 응답 기록','input-observations')}${candidate?button('QA 접점 / 프레임 관측','observe-panel'):''}</div></details>`);}
function showQaObservations(){
 if(!candidate||!state||!battle)return;
 const frames=frameObservation.snapshot(),trace=contactTrace.snapshot(),postmortem=!!(state.world.lifeDown||battle.dead||battle.p.hp<=0);
 const metric=m=>m?.n?`${m.n}개 · p50 ${m.p50Ms.toFixed(2)} / p95 ${m.p95Ms.toFixed(2)} / 최대 ${m.maxMs.toFixed(2)}ms · 16.7ms 초과 ${(m.over16_7Ratio*100).toFixed(1)}% · 33.3ms 초과 ${(m.over33_3Ratio*100).toFixed(1)}%`:'미관측';
 const ms=value=>Number.isFinite(value)?value.toFixed(2)+'ms':'미관측';
 const phaseNames={step:'stepBattle',render:'렌더+표식',ui:'HUD',scene:'장면 준비',audio:'audio.tick',events:'이벤트·음향 요청·저장 진입',safety:'안전·대기입력 처리',input:'입력 라우팅·조준'};
 const sample=(label,row)=>row?`<p><strong>${label} #${row.sequence} · ${esc(row.mode)}</strong><br>rAF 시각 ${ms(row.rafTimestampMs)} · 콜백 진입/관측 종료 ${ms(row.callbackStartedAtMs)} / ${ms(row.callbackEndedAtMs)}<br>동기 JS 관측 구간 ${ms(row.totalMs)} (${esc(row.workStatus)})<br>${Object.entries(phaseNames).map(([key,name])=>`${name} ${ms(row.phaseMs[key])}${row.phaseStatus[key]==='ok'?'':` (${esc(row.phaseStatus[key])})`}`).join(' · ')}<br>기타 동기 구간 ${ms(row.otherMs)}<br>숨김 ${row.context.hidden===null?'미관측':row.context.hidden?'예':'아니오'} · 포커스 ${row.context.focused===null?'미관측':row.context.focused?'있음':'없음'} · visibility ${esc(row.context.visibilityState??'미관측')} · 포커스/표시 변경 순번 ${row.context.focusEpoch??'미관측'}</p>`:'<p>'+label+' 완료 콜백 미관측</p>';
 const diagnostics=frames.stallDiagnostics;
 const incidents=(diagnostics?.incidents??[]).slice(-6).reverse().map(i=>`<article class="skill"><strong>긴 간격 #${i.current.sequence} · ${ms(i.current.rafIntervalMs)} · 안전정지 ${esc(i.current.safetyStop??'이 콜백에서 발생 안 함')}</strong><p>직전/현재 관측 rAF ${ms(i.current.previousRafTimestampMs)} → ${ms(i.current.rafTimestampMs)}<br>실제 보호 기준 시각 ${ms(i.current.runtimePreviousRafTimestampMs)} → ${ms(i.current.rafTimestampMs)} · 간격 ${ms(i.current.runtimeIntervalMs)} · 500ms 초과 ${i.current.runtimeSuspended===null?'미관측':i.current.runtimeSuspended?'예':'아니오'}<br>직전 관측 종료 → 현재 콜백 진입 ${ms(i.sincePreviousCallbackEndMs)}. 다른 이벤트·비동기 작업·대기 등이 섞일 수 있으며 유휴/GPU 시간으로 해석하지 않습니다.</p><details><summary>직전 / 현재 콜백 비용과 상태 보기</summary>${sample('직전',i.previous)}${sample('현재',i.current)}</details></article>`).join('');
 const group=(label,g)=>`<article class="skill"><strong>${label}</strong><p>rAF 간격: ${metric(g?.rafInterval)}<br>동기 JS 전체: ${metric(g?.total)}<br>stepBattle: ${metric(g?.step)}<br>렌더+접점 표식: ${metric(g?.render)}<br>HUD: ${metric(g?.ui)}</p></article>`;
 panel('QA 접점 / 프레임 관측',`<p class="warning">검증용 읽기 전용 표면입니다. 기본 OFF이며 현재 접속 메모리에만 남습니다. 진행·적·충돌을 변경하거나 외부로 전송하지 않습니다.</p>${postmortem?'<p class="warning">사망 상태 · 읽기 전용 기록입니다. 부활하면 이 접속의 전투 관측이 초기화됩니다.</p>':''}<div class="buttons">${postmortem?'':`${button(contactTrace.enabled?'접점 표식 끄기':'접점 표식 켜기','observe-contact-toggle')}${button(frameObservation.enabled?'프레임 기록 끄기':'프레임 기록 켜기','observe-frame-toggle')}${button('관측 기록 비우기','observe-clear')}`}${button('표시 새로고침','observe-refresh')}</div><p>접점 ${contactTrace.enabled?'ON':'OFF'} · 최근 위치 ${trace.frames.length}개 · 주변 몸 ${trace.bodies.length}개. 원은 실제 지면 충돌 몸, 점선은 표본 사이의 추정 궤적, 녹색은 엔진의 마지막 시뮬레이션 조각 경로입니다. 마름모는 거리/굴절에서 추정한 표시이며 충돌 이벤트나 벽 충돌 원인 확정이 아닙니다. 구르기 몸 반경0은 점으로 표시합니다.</p><p>프레임 기록 ${frameObservation.enabled?'ON':'OFF'} · 최근 최대240개. rAF 간격과 동기 JS 실행 비용을 구분합니다. GPU·물리 디스플레이·소리 지연은 측정하지 않습니다. 관측 자체의 비용도 포함됩니다. 500ms 이상 간격은 기존 정규 통계에서 제외하며 아래 사고 기록은 500ms 초과만 보존합니다. 실제 재생 보호조건은 500ms 초과 그대로입니다. 메뉴/저장/진입대기는 교전 통계와 섞지 않습니다.</p><h3>500ms 초과 간격 진단</h3><p>총 ${diagnostics?.totalIncidents??0}건 · 최대12쌍 보존 · 최근6쌍 표시 · 오래된 기록 ${diagnostics?.evictedIncidents??0}건 삭제. 메뉴·새 활성 구간을 거쳐도 보존하며 관측 OFF/비우기·지역/프로필/재로드 시 초기화합니다. 화면은 열기/새로고침 때만 갱신합니다.</p><p class="minor">audio.tick은 동기 스케줄러 비용입니다. 음향 요청과 저장 진입은 이벤트 구간에, 그 밖의 동기 처리는 기타에 포함됩니다. 비동기 저장 완료·다른 이벤트 핸들러·GPU·실제 소리 지연은 분리 측정하지 않습니다. 직전 비용과 긴 간격의 동시 관측만으로 원인을 확정할 수 없습니다. 진단 자체 부하도 포함됩니다.</p>${incidents||'<p>관측된 500ms 초과 간격이 없습니다.</p>'}<h3>마지막 활성 구간 · ${esc(frames.lastActive?.status??'empty')}</h3><p class="minor">메뉴를 오래 열어도 직전 활성 구간은 최대240개 별도 보존됩니다. 새 활성 구간과 프로필/지역/재로드 변경 시 갱신·초기화합니다.</p>${group('마지막 활성 구간',frames.lastActive?.active)}${Object.entries(frames.lastActive?.byMode??{}).filter(([,g])=>g.frames>0).map(([name,g])=>group(esc(name),g)).join('')}<h3>현재 전체 링</h3>${group('활동 표본',frames.active)}${Object.entries(frames.byMode??{}).filter(([,g])=>g.frames>0).map(([name,g])=>group(esc(name),g)).join('')}${button(postmortem?'사망 화면으로 돌아가기':'돌아가기',postmortem?'death-panel':'menu')}`,true);
}
function showInputObservations(){
 const records=inputLatency.snapshot(),inputs=records.filter(r=>r.kind==='input').slice(-12).reverse(),heldStarts=records.filter(r=>r.kind==='action-start'&&r.heldRepeat||r.kind==='mobility-start'&&r.heldTransition).slice(-12).reverse();
 const elapsed=(base,row)=>row?`${Math.max(0,row.at-base.receivedAt).toFixed(2)} ms`:'미관찰';
 const stages=(base,rows)=>{const enter=rows.find(r=>r.kind==='first-render-enter'||r.kind==='mobility-first-render-enter'),returned=rows.find(r=>r.kind==='first-render-return'||r.kind==='mobility-first-render-return'),sound=rows.find(r=>r.kind==='audio-request-result'),contact=rows.find(r=>r.kind==='contact');return `첫 렌더 진입 ${elapsed(base,enter)} · 첫 렌더 반환 ${elapsed(base,returned)}<br>소리 요청 결과 ${elapsed(base,sound)}${sound?` (${sound.accepted===true?'수락':sound.accepted===false?'미수락':'수락 여부 미확인'})`:''} · 접촉 ${elapsed(base,contact)}`;};
 const heldRows=heldStarts.map(base=>{const rows=records.filter(r=>r.sequence===base.sequence),name=skillNames[base.skillId]??(base.state==='roll'?'회피':base.state==='sprint'?'달리기':base.action);return `<article class="skill"><strong>${esc(name)} · ${base.heldTransition?'홀드 전환':'홀드 반복'} 관측 ${base.sequence}</strong><p>입력 → 시작 지연 미측정 · 액션 시작 시점 기준<br>${stages({receivedAt:base.at},rows)}</p></article>`;}).join('');
 const unlinkedSounds=records.filter(r=>r.kind==='audio-request-result'&&r.sequence===null).length;
 panel('입력 응답 기록',`<p>현재 접속에서 받은 최근 입력과 홀드 반복입니다. 입력 핸들러 → 액션 시작, 첫 렌더 함수 진입/반환, 소리 요청 수락 여부, 실제 접촉 이벤트를 구분합니다. 소리 요청 결과는 오디오 함수 반환 시각이며 재생 시작 시각이 아닙니다. 모니터 표시와 스피커 소리의 물리 지연 실측은 아닙니다. 원작 POE2의 측정값도 아닙니다. 메모리에 남은 최근 관측만 표시합니다.</p><p class="minor">행동과 연결할 근거가 없는 소리 요청 ${unlinkedSounds}건. 방패처럼 시작 이벤트가 없는 입력은 시작 시각을 추정하지 않습니다. 입력 연결 종료는 관측 연결의 종료이며 게임 행동의 성공·실패 판정이 아닙니다. 대기 상태 관측과 입력 연결 종료 사유는 별개입니다.</p><h3>최초 입력 기준</h3>${inputs.length?inputs.map(base=>{const rows=records.filter(r=>r.sequence===base.sequence),start=rows.find(r=>r.kind==='action-start'||r.kind==='mobility-start'),cancel=rows.find(r=>r.kind==='cancelled'),name=base.skillId?`${controlActions(config())[base.action]??base.action} · ${skillNames[base.skillId]??base.skillId}`:base.intent==='unresolved'?`${base.action} · 기술 미지정`:controlActions(config())[base.action]??base.action;return `<article class="skill"><strong>${esc(name)} · 입력 ${base.sequence}</strong><p>시작 ${elapsed(base,start)} · ${stages(base,rows)}</p>${rows.some(r=>r.kind==='save-wait')?'<p class="minor">저장·안전 처리 대기 상태 관측 · 대기 시간 미측정</p>':''}${cancel?`<p class="minor">입력 연결 종료: ${esc(cancel.reason)}</p>`:''}</article>`;}).join(''):'<p>관찰된 입력이 없습니다. 게임 화면에서 기술을 사용한 뒤 다시 열어 주세요.</p>'}<h3>홀드 반복 시작 기준</h3><p class="minor">원래 물리 입력과 연결되지 않은 별도 시작 관측입니다. 입력 연결이 끝난 이후에도 홀드 반복이 시작될 수 있습니다. 아래 시간은 각 액션 시작부터 잽니다.</p>${heldRows||'<p>관찰된 홀드 반복이 없습니다.</p>'}${button('돌아가기','menu')}`,true);
}
function help(){panel('조작과 전투',`<div class="buttons dialog-actions">${button('키 설정','controls')}${button('돌아가기','menu')}</div><div class="controls">${Object.keys(controlActions(config())).filter(visibleAction).map(a=>`<span>${esc(keyName(a))}: ${esc(controlName(a))}</span>`).join('')}</div><p>귀환 포탈: ${esc(keyName('townPortal'))} 또는 ◈ 귀환 버튼으로 현재 위치에 즉시 엽니다. 소모품은 필요 없고 전투 중에도 사용할 수 있습니다. 가까이서 ${esc(keyName('interact'))}로 입장하면 마을로 단방향 이동합니다. 원위치 복귀는 지원하지 않습니다. 재사용 대기는 실시간 ${TOWN_PORTAL_COOLDOWN_SECONDS}초이며 메뉴·재접속에도 유지됩니다. P가 기존 키와 겹치면 포탈 키만 미지정으로 두며 여기서 재지정할 수 있습니다. 지역 이동·사망에는 열린 포탈만 닫히고 쿨다운은 남습니다.</p><p>마우스로 조준합니다. 적의 몸 위에 커서를 놓으면 금빛 발밑 표식으로 그 적을 조준하고, 빈 바닥은 자유 조준합니다. 기본 공격은 누르는 동안 반복합니다. ${isPoeControls(config())?'철퇴와 망치는 누름 즉시 시도하고 유지 중 준비되면 반복합니다. 돌진·온기·단죄·깃발·물약·상호작용은 단발입니다.':'망치·돌진·온기·단죄·물약·상호작용은 한 번 누를 때 한 번 시도하며 자동 반복하지 않습니다.'} 준비된 명시적 기술 입력은 현재 동작의 마지막0.18초 회수 구간에서 한 번 보관해 기본 공격보다 먼저 실행합니다. ${isPoeControls(config())?'이동과 커서 조준은 독립적이며, 기술별 재조준 허용 구간과 키 해제 뒤 추적 설정을 따릅니다.':'조준은 누른 순간에 고정됩니다.'} 실제 실행 때만 비용을 씁니다. 가드·${isPoeControls(config())?'다른 기술':'반대 조준/이동'}·상호작용·물약·메뉴·사망·지역 이동에는 이 대기를 비웁니다. 너무 이른 입력은 안내하고 예약하지 않습니다. 방패 유지 중에는 기본 공격보다 방어가 우선합니다. 토글 방패는 공격·스킬을 누르거나 메뉴를 열면 해제됩니다. 온기는 자기 중심 치유이며 진입 안전대기를 해제하지 않습니다. 이동 또는 공격으로 전투를 시작한 뒤 사용할 수 있습니다. 지역 이동·재접속에는 진행 중 공격/바닥효과를 취소하지만 이미 소비한 자원과 쿨다운은 유지합니다.</p><p>이동 방향과 조준은 독립적입니다. 돌진 방향은 기본적으로 조준을 따릅니다. 키 설정에서 마지막 이동 방향으로 바꿀 수 있으며 돌진의 비용·충돌·회복 시간은 그대로입니다.</p><p>전체 기술 배치를 켜면 배운 행동 기술을 모든 전투 슬롯에 옮길 수 있습니다. 기존 전문 배치는 명시 전환 전까지 유지합니다. 깃발은 단발, 진격은 키/화면 버튼을 누르는 동안 최대4초 전진하며 매초 기력을 지불합니다. 일반 해제는 배운 화염 선봉을 낼 수 있고 메뉴·포커스 상실·입력 취소는 추가 공격 없이 멈춥니다. 진격 중 방패/다른 기술/상호작용은 먼저 진격을 취소하고 새 입력이 필요합니다.</p><p>터치: 왼쪽 방향 패드와 기술 버튼. 화면을 짚으면 조준합니다. 메뉴·브라우저 비활성 중에는 전투와 자원 시간이 멈춥니다.</p><p class="warning">${BUILD_LABEL} POE형 조작·전사 전투 개발 후보입니다. 묘실까지는 보통 난이도 일반 조작으로 확인했고, 전문 능력·봉화 전장과 새 황야 전체 루프는 검증 중입니다. 위임장은 자동 승급·기술 습득이 아니며 브란의 승급과 기술점수 구매가 별도입니다. 마스터·고급 장비/접사·전체 캠페인은 미완입니다.</p>`);}
const statNames={hpMax:'최대 체력',manaMax:'최대 마나',staminaMax:'최대 기력',physicalDamage:'물리 공격',armor:'방어',moveSpeed:'이동 속도',manaRegen:'마나 재생',strength:'힘',dexterity:'민첩',intelligence:'지능'};
const slotNames={mainHand:'주무기',offHand:'보조 무기',head:'머리',chest:'가슴',hands:'손',feet:'발',accessory:'장신구'};
const materialNames={iron:'철',wood:'목재',thread:'실',ember_shard:'잿불 조각'};
const statText=values=>Object.entries(values).filter(([,v])=>v).map(([k,v])=>`${statNames[k]??k} ${v>0?'+':''}${Number(v.toFixed(3))}`).join(' · ')||'변화 없음';
const materialText=values=>Object.entries(values).map(([k,v])=>`${materialNames[k]??k} ${v}`).join(' · ')||'없음';
let equipmentStation=null;
function showEquipment(station=null){
 equipmentStation=station;const info=equipmentRows(state);if(!info.ok){panel('장비 기록 확인',`<p>${esc(info.reason)}</p>${button('돌아가기','menu')}`);return;}
 const town=battle.region==='ash_hamlet'&&!state.world.lifeDown,quote=op=>quoteEquipment(state,{commandId:'quote:'+op.type+':'+(op.baseId??op.recipeId??op.itemId??op.awardId??op.slot),...op});
 const clickable=(label,action,can,why='')=>button(label,action,can?'class="small"':`class="small" disabled title="${esc(why)}"`);
 const pools=deriveStats(state.character,state).stats;
 let shop='';
 if(station==='blacksmith'){
  const supplies=quote({type:'receiveEquipmentAward',awardId:'workshop_supplies',station:'blacksmith'});
  const signal=signalBlacksmithView(state),signalQuest=signal?`<article class="quest-card"><h3>${esc(signal.title)}</h3><p>${esc(signal.detail)}</p>${signal.action?button(esc(signal.label),`signal-${signal.action}`,'class="primary"'):''}</article><div class="divider"></div>`:'';
  const furnace=furnaceBlacksmithView(state),furnaceQuest=furnace?`<article class="quest-card"><h3>${esc(furnace.title)}</h3><p>${esc(furnace.detail)}</p>${furnace.action?button(esc(furnace.label),`furnace-${furnace.action}`,'class="primary"'):''}</article><div class="divider"></div>`:'';
  shop=`${state.world.objectives.wilderness_reported?`<article class="quest-card"><h3>황야 이후 · 수리소 준비 중</h3><p>${esc(WILDERNESS_CONTINUATION_NOTICE)}</p></article><div class="divider"></div>`:''}${furnaceQuest}${signalQuest}<h3>대장장이 · 매입 자금 ${info.vendor.cash}G</h3><p class="minor">판매 재고는 품목별2개이며 이 단계에서는 재입고·되사기가 없습니다. 작업대는 마을 동쪽에 있습니다.</p>${clickable('첫 제작 도구와 재료 받기','award:workshop_supplies',supplies.ok,supplies.reason)}<div class="skills">${Object.values(EQUIPMENT_ITEMS).map(item=>{const q=quote({type:'buyEquipment',baseId:item.id,station:'blacksmith'});return `<article class="skill"><strong>${item.name} · ${slotNames[item.slot]}</strong><p>${statText(item.stats)}</p><p class="minor">영구 요구: 힘${item.requirements.strength} / 민첩${item.requirements.dexterity} / 지능${item.requirements.intelligence}<br>품질 common · 입문 · 재고${info.vendor.stock[item.id]}<br>${q.ok?'':esc(q.reason)}</p>${clickable(`${item.price}G 구매`,'buy:'+item.id,q.ok,q.reason)}</article>`;}).join('')}</div>`;
  if(state.world.objectives.first_dungeon_cleared){const q=quote({type:'receiveEquipmentAward',awardId:'first_dungeon_salvage'});shop+=clickable('수문소 조사 보급 받기','award:first_dungeon_salvage',q.ok,q.reason);}
  if(state.world.claimedRewards.includes('chest:warden-cache')){const q=quote({type:'receiveEquipmentAward',awardId:'warden_cache_gear'});shop+=clickable('감시자 보급 장비 확인','award:warden_cache_gear',q.ok,q.reason);}
 }
 if(station==='workshop')shop=`<h3>제작 작업대</h3><p class="minor">도구는 대장장이에게 한 번 받습니다. 제작·강화는 표시된 금화/재료를 원자적으로 소모합니다. +2와 집중 목걸이 제작은 수문핵 회수 후 열립니다. 둘 다 잿불 조각을 쓰므로 먼저 만들 것을 선택하세요.</p><div class="skills">${Object.values(EQUIPMENT_RECIPES).map(recipe=>{const q=quote({type:'craftItem',recipeId:recipe.id,station:'workshop'}),preview=previewRecipe(state,recipe.id),item=preview.base;return `<article class="skill"><strong>${recipe.name}</strong><p>${recipe.gold}G · ${materialText(recipe.materials)}</p><p>${statText(item.stats)}</p><p class="minor">완성품 영구 요구: 힘${item.requirements.strength} / 민첩${item.requirements.dexterity} / 지능${item.requirements.intelligence}<br>현재 영구 능력치: 힘${preview.currentAttributes.strength} / 민첩${preview.currentAttributes.dexterity} / 지능${preview.currentAttributes.intelligence}</p>${preview.eligibility.ok?'':`<p class="warning">제작해도 지금은 장착할 수 없습니다. ${esc(preview.eligibility.reason)} ${Object.entries(preview.deficits).map(([k,v])=>`${statNames[k]} ${v} 부족`).join(' · ')}</p>`}<p class="minor">${q.ok?'제작 가능':esc(q.reason)}</p>${clickable('제작','craft:'+recipe.id,q.ok,q.reason)}</article>`;}).join('')}</div>`;
 const slots=EQUIPMENT_SLOTS.map(slot=>{const row=info.rows.find(r=>r.instance.id===state.character.equipment[slot]);return `<div class="row"><span>${slotNames[slot]} · ${row?row.base.name+' +'+row.instance.upgradeRank:'훈련용 / 비어 있음'}</span>${row?clickable('해제','unequip:'+slot,town,'안전한 마을에서 변경하세요.') : ''}</div>`;}).join('');
 const rows=info.rows.map(row=>{const instance=row.instance,q=quote({type:'equipItem',itemId:instance.id}),upgrade=quote({type:'upgradeItem',itemId:instance.id,expectedRank:instance.upgradeRank,station:'workshop'}),u=EQUIPMENT_UPGRADES[instance.upgradeRank+1];return `<article class="skill"><strong>${row.base.name} +${instance.upgradeRank} ${row.equipped?'· 장착 중':''}</strong><p>${statText(row.stats)}</p><p class="minor">현재 슬롯 대비 ${statText(row.deltas)}<br>${esc(row.eligibility.ok?'장착 가능':row.eligibility.reason)}</p><div class="buttons">${row.equipped?'':clickable('장착','equip:'+instance.id,town&&q.ok,q.reason)}${station==='blacksmith'?clickable(`${row.sellPrice}G 판매`,'sell:'+instance.id,!row.equipped,'먼저 장착을 해제하세요.'):''}${station==='workshop'?button(u?`+${instance.upgradeRank+1} 강화 · ${u.gold}G / ${materialText(u.materials)}`:'최대 강화','upgrade:'+instance.id,`class="small" data-rank="${instance.upgradeRank}" ${upgrade.ok?'':'disabled'}`):''}</div>${station==='workshop'&&!upgrade.ok?`<p class="minor">${esc(upgrade.reason)}</p>`:''}</article>`;}).join('');
 panel(station==='blacksmith'?'대장장이 오린':station==='workshop'?'제작과 강화':'장비와 소지품',`<p><strong>전사 Lv.${state.character.level}</strong><br>${esc(tombGoldView(state).detail)}<br>재료 ${materialText(state.inventory.materials)}<br>도구: ${esc(state.inventory.tools.map(id=>id==='smith_tools'?'대장장이 도구':DUNGEON_TOOLS[id]?.name??QUARRY_TOOLS[id]?.name??PASS_TOOLS[id]?.name??SIGNAL_TOOLS[id]?.name??FURNACE_TOOLS[id]?.name??TOMB_TOOLS[id]?.name??BATTLEFIELD_TOOLS[id]?.name??WILDERNESS_TOOLS[id]?.name??id).join(' · ')||'없음')} · 물약 ${state.inventory.consumables.health_potion??0}</p><p class="minor">공격${pools.physicalDamage} / 방어${pools.armor} / 체력${pools.hpMax} / 마나${pools.manaMax} / 기력${pools.staminaMax}<br>아이템 요구는 장비 보너스를 제외한 영구 능력치입니다. 장착으로 자원을 무료 회복하지 않습니다. 장착은 마을에서만 가능합니다.</p>${shop}<h3>일곱 장비 슬롯</h3>${slots}<h3>보유 장비 · ${info.rows.length}개</h3><div class="skills">${rows||'<p>아직 보유 장비가 없습니다.</p>'}</div>${button('돌아가기','close')}`,true);
}
async function equipmentAction(operation){const id='ui-'+crypto.randomUUID();if(await dispatch({type:'equipment',position:{x:battle.p.x,y:battle.p.y},operation:{commandId:id,...operation}})){toast('장비 기록을 저장했습니다.');showEquipment(equipmentStation);}}

function showControls(message=''){
 const c=config(),preset=isPoeControls(c)?`${c.poe.movementMode==='wasd'?'WASD':'클릭 이동'} · ${c.bindings.dodgeSprint.length?'POE2식 통합 회피 / 질주':'회피와 Shift 달리기 분리'}`:{legacy:'기존 배치 유지',recommended:'기존 추천 배치',custom:'사용자 설정'}[c.preset];
 const options=isPoeControls(c)?`<h3>이동과 조준은 별개</h3><label class="row">조준 투영<select data-poe-option="aimingMode"><option value="cursor" ${c.poe.aimingMode==='cursor'?'selected':''}>Cursor · 화면 커서</option><option value="ground" ${c.poe.aimingMode==='ground'?'selected':''}>Ground · 지면 좌표</option></select></label><label class="row">키를 놓은 뒤에도 재조준<select data-poe-option="cursorTrackingAfterRelease"><option value="true" ${c.poe.cursorTrackingAfterRelease?'selected':''}>켜기 · 스킬 허용 구간만</option><option value="false" ${!c.poe.cursorTrackingAfterRelease?'selected':''}>끄기 · 방향 유지</option></select></label><label class="row">통합 회피키를 놓은 뒤 질주 유지<select data-poe-option="keepSprintingWhileMoving"><option value="false" ${!c.poe.keepSprintingWhileMoving?'selected':''}>끄기</option><option value="true" ${c.poe.keepSprintingWhileMoving?'selected':''}>이동 중 유지 · 정지/스킬 때 해제</option></select></label><label class="row">제자리 공격 입력이 클릭 이동을 멈춤<select data-poe-option="attackInPlaceStopsMovement"><option value="true" ${c.poe.attackInPlaceStopsMovement?'selected':''}>켜기</option><option value="false" ${!c.poe.attackInPlaceStopsMovement?'selected':''}>끄기</option></select></label><p class="minor">조준 방식과 키를 놓은 뒤 추적은 서로 다릅니다. 스킬의 마지막 접촉 구간에서는 방향이 고정될 수 있습니다. 별도 Shift 달리기는 이 질주 유지 옵션과 무관하게 키를 놓으면 멈춥니다.</p>`:'';
 panel('키 설정',`<p><strong>${esc(preset)}</strong> · 이 프로필에만 저장합니다. 기존 키는 직접 전환하기 전까지 유지합니다.</p><p class="minor">${c.version===5?'전체 기술 배치: 아래 슬롯별 기술명과 실제 지정 키를 확인하세요.':`현재 기본 공격: ${esc(keyName('attack'))} · 주력 망치: ${esc(keyName('hammer'))} · 방패: ${esc(keyName('block'))}. 나머지 행동은 아래 실제 지정 키를 확인하세요.`} 지도와 마나물약은 아직 없습니다. 빈 슬롯은 기술 배치에서 채웁니다. 클릭 모드는 WASD 보행키 대신 왼쪽 클릭 목적지로 움직입니다. 인물/장치/출입구 클릭은 접근 후 상호작용, 적이나 빈 바닥 클릭은 이동만 하며 공격은 별도 슬롯입니다.</p>${message?`<p class="warning" role="status">${esc(message)}</p>`:''}<div class="buttons">${button('POE2식 WASD · 권장 선택','poe-preset:wasd:combined')}${button('POE2식 클릭 이동','poe-preset:click:combined')}${button('WASD · Shift 달리기 분리','poe-preset:wasd:separate')}${button('클릭 이동 · Shift 달리기 분리','poe-preset:click:separate')}${isPoeControls(c)?button('전환 전 키 설정 복원','restore-prior-controls'):''}</div>${options}<div class="binding-list">${Object.entries(controlActions(c)).filter(([a])=>visibleAction(a)&&!(isPoeControls(c)&&c.poe.movementMode==='click'&&['up','down','left','right'].includes(a))).map(([a,label])=>`<div class="binding-row"><strong>${esc(controlName(a))}</strong><div>${c.bindings[a].length?'':'<span class="warning">미지정</span>'}${c.bindings[a].map((token,i)=>button(esc(tokenLabel(token)),`bind:${a}:${i}`,'class="small"')+((c.bindings[a].length>1||Object.hasOwn(actionSkill,a)||EXPERT_SLOTS.includes(a)||Object.hasOwn(MOBILITY_ACTIONS,a)||a==='townPortal')?button('×',`unbind:${a}:${i}`,`class="small" aria-label="${esc(controlName(a))} ${esc(tokenLabel(token))} 제거"`):'')).join(' ')}${c.bindings[a].length<3?button('+',`bind:${a}:${c.bindings[a].length}`,`class="small" aria-label="${esc(controlName(a))} 키 추가"`):''}</div></div>`).join('')}</div><label class="row">방패 방식<select data-control-option="blockMode"><option value="hold" ${c.blockMode==='hold'?'selected':''}>누르는 동안</option><option value="toggle" ${c.blockMode==='toggle'?'selected':''}>누를 때 켜기 / 끄기</option></select></label><label class="row">공격형 방패 돌진 방향<select data-control-option="chargeDirection"><option value="aim" ${c.chargeDirection==='aim'?'selected':''}>조준 방향</option><option value="movement" ${c.chargeDirection==='movement'?'selected':''}>마지막 이동 방향</option></select></label><p class="minor">기본공격은 홀드 반복, 돌진·물약·상호작용은 단발입니다. 회피는 공격형 돌진과 별개입니다. 키 버튼 뒤 실제 키/마우스를 누르세요. 중복은 거절, Esc는 안전 일시정지입니다. Ctrl/Alt/Meta와 게임패드는 미지원입니다.</p><div class="buttons">${button('이전 추천 배치로 초기화','preset:recommended')}${button('초기 기존 배치로 초기화','preset:legacy')}${STARTER_SKILLS.every(id=>state.character.skills[id]>0)?button('전사 기술 배치','action-slots'):''}${button('돌아가기','menu')}</div>`,true);
}
async function applyBinding(token){const pending=captureBinding;if(!pending)return;captureBinding=null;const result=rebindControl(config(),pending.action,pending.index,token);if(!result.ok){showControls(result.reason);return;}if(await dispatch({type:'setControls',controls:result.controls}))showControls('키 설정을 저장했습니다.');else showControls('저장에 실패했습니다. 기존 설정을 유지합니다.');}
function beginBinding(action,index){panel('키 지정',`<p>${esc(controlName(action))}에 쓸 키나 마우스 버튼을 누르세요.</p><p>Esc: 취소 · 보조 마우스 버튼도 지정할 수 있습니다.</p>${button('취소','controls')}`);captureBinding={action,index};}

async function loadProfile(name,start,difficulty='normal',requestedSelection=null){
  if(saveNamespace===null){showTitle();return;}
  const newPreset=start?$('newControlsPreset')?.value:null;
  // One title-selection intent spans copy, load and optional start. A dismissed
  // or superseded request may finish its already-requested save, never install
  // its snapshot into a newer owner's UI or begin another save afterward.
  const selection=requestedSelection??((modal.profileSelectionEpoch??0)+1);
  if(requestedSelection===null)modal.profileSelectionEpoch=selection;
  if(selection!==modal.profileSelectionEpoch)return;
  const epoch=modal.presentationEpoch=(modal.presentationEpoch??0)+1;busy=false;
  paused=true;clearInput('profile-load');audio.pause(true);
  let owner=controller;
  const current=()=>controller===owner&&modal.profileSelectionEpoch===selection&&modal.presentationEpoch===epoch;
  try{
    const store=createSession(localStorage,navigator.locks,{profile:name,namespace:saveNamespace});
    owner=createController(store);controller=owner;
    const loaded=await owner.load();if(!current())return;if(!loaded.ok)throw new Error(loaded.reason);
    let result=loaded;
    if(start){result=await owner.start({difficulty});if(!current())return;if(result.ok&&['wasd:combined','click:combined','wasd:separate','click:separate'].includes(newPreset)){const [mode,run]=newPreset.split(':');result=await owner.dispatch({type:'setControls',controls:poeControlPreset(result.state.options.controls,mode,run)});if(!current())return;}}
    if(!result.ok)throw new Error(result.reason);if(!result.state)throw new Error('이 프로필에는 저장이 없습니다. 새 게임을 시작하세요.');
    gate.resolveLoad(result);profile=name;state=freezeOwnedSnapshot(result.state);contactTrace.clear();frameObservation.clear('profile-load');poeFeedback.clear();battle=createBattle(state);router.clear({resetMovement:true});$('hud').hidden=false;modal.hidden=true;setDialogBackground(modal,false);paused=false;$('toast').textContent='';noticeUntil=0;input.aim=null;input.pointerScreen=null;displayTime=combatTime=menuTime=walkTime=arrivalWaitTime=0;clearInput();updateHud();if(state.world.lifeDown)showDeath();else if(!state.vitals)toast(`훈련관 브란 가까이 이동해 ${keyName('interact')}를 누르세요.`);
    // Optional audio permission/sample loading must never postpone retry or
    // resume presentation. setEnabled starts audio without awaiting readiness.
    syncAudioOptions();
  }catch(e){if(current())showTitle(String(e.message));}
}
function showDeath(){panel('불씨는 아직 남아 있습니다',`<p>쓰러졌습니다. 지금까지 얻은 경험치, 장비와 소지품 및 이미 처치한 적의 기록은 남습니다. 훈련 예약금을 제외한 쓸 수 있는 금화의5%를 잃습니다. 예약금은 보존됩니다.</p><p class="minor">적 준비 동작은 붉은 범위로 고정됩니다. 방패만 믿기보다 옆으로 피하고 망치를 여러 적에게 겹쳐 맞혀 보세요.</p>${button('마을에서 다시 일어나기','retry','class="primary"')}${candidate&&frameObservation.enabled?button('사망 직전 프레임 기록','death-observations'):''}`);}
function showTitle(error=''){modal.safetyPause=false;contactTrace.setEnabled(false);frameObservation.setEnabled(false);modal.presentationEpoch=(modal.presentationEpoch??0)+1;paused=true;clearInput();audio.pause(true);$('hud').hidden=true;battle=null;controller=null;state=null;modal.hidden=false;if(saveNamespace===null){modal.innerHTML='<section class="panel"><h1>지원하지 않는 QA 주소</h1><p>저장 공간을 확인할 수 없어 게임을 시작하거나 기록을 읽고 변경하지 않았습니다. 기본 사이트 저장으로 대신 연결하지 않습니다.</p><a href="/">기본 사이트 시작 화면으로 이동</a></section>';return;}modal.innerHTML=`<section class="panel"><div class="eyebrow">THE OATH OF EMBERS</div><h1>EMBERWATCH</h1><p class="lede">Reborn · 잿불의 서약</p><span class="pill">${BUILD_LABEL} · POE형 전사 입력 개발 후보${candidate?' · 공개 QA 후보':''}</span>${candidate?'<p class="warning">공개 테스트 후보 경로입니다. 일반 저장과 별도 공간을 사용합니다. 기존 QA 기록 복사는 원본을 보존하며, 후보 진행을 기본 사이트에 자동 덮어쓰지 않습니다.</p>':''}<p>꺼져 가는 길목에 다시 불을 밝히세요.<br>전사로 훈련하고, 다수의 적을 돌파하며 첫 순찰을 완수합니다.</p>${error?`<p class="warning">${esc(error)}</p>`:''}<label class="row">난이도 <select id="difficulty"><option value="easy">여유롭게</option><option value="normal" selected>보통</option><option value="hard">어려움</option><option value="serious">험난함</option></select></label>${candidate?'':`<div class="buttons">${button('새 게임 · 일반 프로필','new','class="primary"')}${button('일반 프로필 이어하기','continue')}</div>`}<div class="divider"></div><label class="row">새 게임 조작 선택<select id="newControlsPreset"><option value="wasd:combined" selected>권장 · WASD / POE2식 회피 홀드 질주</option><option value="click:combined">클릭 이동 / POE2식 회피 홀드 질주</option><option value="wasd:separate">WASD / Space 회피 + Shift 달리기</option><option value="click:separate">클릭 이동 / Space 회피 + Shift 달리기</option><option value="unchanged">기존 Reborn 배치 유지</option></select></label><p class="minor">새 게임에만 적용합니다. 이어하기/복사는 기존 키를 그대로 읽습니다.</p><label class="row">격리 QA 프로필 <input id="profile" value="qa-r14-input-20261010" maxlength="51" aria-label="격리 QA 프로필 이름"></label><div class="buttons">${button('격리 새 게임','qa-new')}${button('격리 이어하기','qa-continue')}</div><label class="row">확인할 백업 시점 <select id="upgradeBackupKind" aria-label="확인할 업그레이드 백업 시점"><option value="" selected>시점을 선택하세요</option><option value="pre-v4">pre-v4 · 형식4 전환 직전 (원본1~3)</option><option value="pre-v5">pre-v5 · 형식5 전환 직전 (원본1~4)</option></select></label><div class="buttons">${candidate?'':button('일반 프로필 업그레이드 백업','upgrade-backup-main')}${button('이 QA 프로필 업그레이드 백업','upgrade-backup-qa')}</div><p class="minor">선택한 전환 직전 원본만 확인합니다. 백업 실패 시 기존 기록을 덮어쓰지 않습니다. 복구는 같은 저장 공간의 별도 빈 QA 프로필로만 가능합니다. pre-v4와 pre-v5는 서로 다른 시점이며 없는 과거 기록을 만들어 주지 않습니다.</p>${saveNamespace==='qa-r14'?'<p class="warning">R14 조작 설정은 R12에서 읽을 수 없습니다. 원본 QA는 이전 공간에 보존하고 여기서는 빈 프로필 복사만 사용합니다.</p>':''}${saveNamespace==='qa-r12'?'<p class="warning">R11 코드는 qa-r12 저장 공간을 알지 못합니다. 형식4로 복원해도 R11에서 바로 열 수 없습니다. R11용 원본은 qa-r11에 그대로 보존하세요.</p>':''}${candidate?`${['qa-r5','qa-r6','qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?`<label class="row">QA 원본 공간 <select id="sourceNamespace"><option value="release">기본 사이트 QA</option><option value="qa-r4">이전 R4 후보 QA</option>${['qa-r6','qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r5">이전 R5 후보 QA</option>':''}${['qa-r7','qa-r8','qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r6">이전 R6 후보 QA</option>':''}${['qa-r8','qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r7">이전 R7 후보 QA</option>':''}${['qa-r9','qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r8">이전 R8 후보 QA</option>':''}${['qa-r10','qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r9">이전 R9 후보 QA</option>':''}${['qa-r11','qa-r12','qa-r14'].includes(saveNamespace)?'<option value="qa-r10">이전 R10 후보 QA</option>':''}${saveNamespace==='qa-r12'?'<option value="qa-r11">이전 R11 후보 QA</option>':''}${saveNamespace==='qa-r14'?'<option value="qa-r12">이전 R12 후보 QA</option>':''}</select></label>`:''}<label class="row">복사할 기존 QA 원본 <input id="sourceProfile" value="qa-r2-live-20261009" maxlength="51" aria-label="복사할 기존 QA 원본 이름"></label><p class="minor">기존 원본을 위의 새 후보 프로필 이름으로 복사합니다. 이미 있는 후보는 덮어쓰지 않습니다.</p>${button('기존 QA 기록을 후보 공간에 복사','candidate-copy')}`:''}<p class="minor">진행은 이 브라우저에 보관되며 다른 기기로 자동 동기화되지 않습니다. 원본0.4.7과 저장 공간이 분리됩니다. 새 게임은 기존 기록을 덮어쓰지 않습니다. 입문 장비·제작과 첫 2층 던전이 연결되어 있습니다. 첫 숙련 승급·25개 노드·채석장에 이어 고갯길 조사가 연결됩니다. L12 신호 분지의 양쪽 경로·사망 재시도·저장 재진입을 검증했습니다. 역할 표식 구분은 실제 확인했고 통로 가독성은 계속 개선 중입니다. 용광로의 두 선택·렌즈 회수·보고는 별도로 실플레이 확인했습니다. 신호 묘실(T)은 보통 난이도에서 해독·석판·운반 봉인·보스·서약문 회수·에다 보고와 사망 재시도·저장 재진입을 일반 조작으로 확인했습니다. 다른 난이도와 전체 플레이 품질 검증은 계속 진행 중입니다. 전문가 승급·15개 전문 노드와 봉화 전장은 연결하여 일반 입력 검증 중입니다. 봉화 보고 뒤 황야의 측량·갈고리·수신판·엄폐 선택·기록핵·에다 보고가 연결되며 새 황야의 일반 입력 검증은 아직 필요합니다. 오린의 후속 수리소·제작은 미구현입니다. 마스터, 고급 장비/접사, 반복 원정과 전체 캠페인은 아직 완성되지 않았습니다. 클릭 후 판타지 효과음을 사용하며 메뉴에서 음량을 조절할 수 있습니다.</p></section>`;}
let upgradeBackupUi=null;
function backupUi(){
 return upgradeBackupUi??=createUpgradeBackupUi({read:readUpgradeBackup,restore:restoreUpgradeBackup,readV5:readUpgradeBackupV5,restoreV5:restoreUpgradeBackupV5,storage:localStorage,locks:navigator.locks,namespace:saveNamespace,
  epoch:()=>modal.presentationEpoch??0,isTitle:()=>!state&&!battle&&!controller,onTitle:()=>showTitle(),
  render(title,content){if(state||battle||controller)return;modal.presentationEpoch=(modal.presentationEpoch??0)+1;paused=true;clearInput('backup-title');audio.pause(true);modal.hidden=false;modal.innerHTML=`<section class="panel"><h2>${esc(title)}</h2>${content}</section>`;modal.querySelector?.('button:not([disabled]),input')?.focus({preventScroll:true});}});
}
function openUpgradeBackup(name,kind){
 if(state||battle)return;modal.profileSelectionEpoch=(modal.profileSelectionEpoch??0)+1;showTitle();backupUi().show(name,kind);
}
function syncAudioOptions(){audio.setMasterVolume?.(state.options.masterVolume);audio.setEnabled(state.options.masterVolume>0);}
function updateHud(){if(!state||!battle)return;const s=deriveStats(state.character,state).stats,p=battle.p,progress=state.character.xp/(xpForLevel(state.character.level)||1),gold=tombGoldView(state);$('vitals').innerHTML=`<div class="row" style="margin:0"><strong>${tierLabel(state.character.tier)} 전사 · Lv.${state.character.level}</strong><span class="gold">${esc(gold.ok?`총 ${gold.totalGold} G`:gold.detail)}</span></div>${gold.ok?`<div class="minor gold">사용 가능 ${gold.spendableGold} G<br>훈련 예약 ${gold.reservedGold} G</div>`:''}${[['health','hp','hpMax'],['mana','mana','manaMax'],['stamina','stamina','staminaMax']].map(([k,a,b])=>`<div class="bar ${k}"><i style="width:${Math.max(0,p[a]/s[b]*100)}%"></i><span>${formatResourceAmount(p[a],{health:a==='hp'})} / ${formatResourceCost(s[b])}</span></div>`).join('')}<div class="bar xp"><i style="width:${progress*100}%"></i></div><div class="minor">XP ${state.character.xp}/${xpForLevel(state.character.level)} · 기술점수${state.character.skillPoints}</div>`;
 const objective=campaignGuidance(state).title;
 const objectiveHtml=`<strong>${esc(getRegion(state.world.region).name)}</strong><br>${esc(objective)}<br>${button('목표 자세히','objective','class="small objective-detail"')}<br><span class="minor">${esc(keyName('interact'))} 대화 · ${esc(keyName('menu'))} 성장 / 설정</span>`;if(objectiveHtml!==lastObjectiveHtml){$('objective').innerHTML=objectiveHtml;lastObjectiveHtml=objectiveHtml;}
 const entries=config().version===5?SKILL_SLOTS.map(slot=>[slotSkill(slot),skillNames[slotSkill(slot)]??'빈 슬롯',keyName(slot),slot]):[['mace_swing','철퇴',keyName('attack'),'attack'],['righteous_hammer','잿불 망치',keyName('hammer'),'hammer'],['shield_charge','방패 돌진',keyName('charge'),'charge'],['shield_block','방패',keyName('block'),'block'],['lay_on_hands','온기',keyName('heal'),'heal'],['judgement','단죄',keyName('judgement'),'judgement'],...EXPERT_SLOTS.map(slot=>[state.actionSlots?.[slot],state.actionSlots?.[slot]==='battle_banner'?'잿불 깃발':'불굴의 진격',keyName(slot),slot])];
 // Reflect the existing life gate only; live resource/cooldown input rules stay unchanged.
 const lifeDown=!!(state.world.lifeDown||battle.dead||p.hp<=0),deadText=lifeDown?actionBlockedText({blockedReason:'dead'}):'';let visibleCount=1;
 for(const [id,name,key,action] of entries){const el=$('hotbar').querySelector(`[data-combat="${action}"]`);if(el){
  el.disabled=lifeDown;el.setAttribute('aria-disabled',String(lifeDown));
  el.hidden=!visibleAction(action);if(!el.hidden)visibleCount++;if(!id){el.innerHTML=`<b>${esc(tokenLabel(config().bindings[action][0]))}</b>빈 슬롯<em>${deadText||'성장 메뉴에서 배치'}</em>`;el.title=key;el.setAttribute('aria-label',`${key} 빈 기술 슬롯${deadText?' '+deadText:''}`);el.classList.remove('active','resource-low','status-blocked');continue;}
  const displayName=battle.stormEnabled?({mace_swing:'봉 연격',judgement:'종 설치',shield_charge:'정타 돌진'}[id]??name):battle.crusherEnabled&&id==='judgement'?'파쇄 강타':name;
  const eligibility=actionEligibility(battle,id,quoteAction(battle,id)),blockedText=actionBlockedText(eligibility,{compact:true});
  let detail=deadText||blockedText||(battle.skillIntent?.id===id?'예약':eligibility.manaCost?`MP ${formatResourceCost(eligibility.manaCost)}`:eligibility.staminaCost?`기력 ${formatResourceCost(eligibility.staminaCost)}`:'준비');
  if(battle.stormEnabled&&!deadText){if(id==='mace_swing')detail=`Combo ${battle.storm.combo}/${STORM_RULES.comboRequired} · ${detail}`;if(id==='shield_charge'&&!blockedText&&stormPerfectStart(battle))detail=`정타 구간 · ${detail}`;}
  el.title=key;el.setAttribute('aria-label',`${key} ${displayName} ${detail}`);el.innerHTML=`<b>${esc(tokenLabel(config().bindings[action][0]))}</b>${displayName}<em>${esc(detail)}</em>`;
  el.classList.toggle('active',!lifeDown&&id==='shield_block'&&p.block);el.classList.toggle('resource-low',eligibility.learned&&(p.mana<eligibility.manaCost||p.stamina<eligibility.staminaCost));el.classList.toggle('status-blocked',['stun','silence','disarm'].includes(eligibility.blockedReason));
 }}
 for(const action of ['dodgeSprint','dodgeOnly','sprint']){const el=$('hotbar').querySelector(`[data-combat="${action}"]`);if(!el)continue;el.disabled=lifeDown;el.setAttribute('aria-disabled',String(lifeDown));el.hidden=!isPoeControls(config())||!config().bindings[action]?.length;if(el.hidden)continue;visibleCount++;const pose=battle.p.presentationPose,detail=deadText||(pose?.state==='roll'?'구르기':pose?.state==='sprint'?'질주':pose?.blocksSkills?'회복 중':action==='dodgeSprint'?'회피 후 홀드 질주':action==='dodgeOnly'?'회피만':'누르는 동안');el.innerHTML=`<b>${esc(tokenLabel(config().bindings[action][0]))}</b>${esc(MOBILITY_ACTIONS[action])}<em>${esc(detail)}</em>`;el.title=keyName(action);el.setAttribute('aria-label',`${keyName(action)} ${MOBILITY_ACTIONS[action]} ${detail}`);}
 const pot=$('hotbar').querySelector('[data-action="potion"]');if(pot){const detail=deadText||(p.potionCooldown>.05?p.potionCooldown.toFixed(1)+'초':(state.inventory.consumables.health_potion??0)+'개');pot.disabled=lifeDown;pot.setAttribute('aria-disabled',String(lifeDown));pot.title=keyName('potion');pot.setAttribute('aria-label',`${keyName('potion')} 체력 물약 ${detail}`);pot.innerHTML=`<b>${esc(keyName('potion'))}</b>체력 물약<em>${esc(detail)}</em>`;}
 const portalButton=$('hotbar').querySelector('[data-action="townPortal"]');if(portalButton){visibleCount++;const remaining=townPortalRemaining(state),inTown=battle.region==='ash_hamlet',detail=deadText||(inTown?'마을':remaining>0?`${Math.ceil(remaining)}초`:'준비'),key=keyName('townPortal');portalButton.disabled=lifeDown;portalButton.setAttribute('aria-disabled',String(lifeDown));portalButton.title=`${key} · 마을 귀환 포탈. 소모품 없이 개방, ${keyName('interact')}로 입장. 재사용 ${TOWN_PORTAL_COOLDOWN_SECONDS}초 · 단방향`;portalButton.setAttribute('aria-label',`${key} 마을 귀환 포탈 ${detail}`);portalButton.innerHTML=`<b>${esc(key)}</b><span aria-hidden="true">◈</span> 귀환<em>${esc(detail)}</em>`;}
 applyHotbarLayout($('hud'),{width:canvas.width,count:visibleCount});
 $('menuButton').textContent=`메뉴 · ${keyName('pause')}`;
 const boss=battle.enemies.find(e=>e.type==='boss'&&e.active&&e.hp>0);$('boss').innerHTML=boss?`${FOES[boss.kind].name}<div class="bar"><i style="width:${boss.hp/boss.max*100}%"></i></div>`:'';
}
$('hotbar').innerHTML=['attack','hammer','charge','block','heal','judgement','expert1','expert2','dodgeSprint','dodgeOnly','sprint'].map(a=>`<button data-combat="${a}"></button>`).join('')+button('물약','potion')+button('귀환','townPortal','class="town-portal-action"');
document.addEventListener('click',async e=>{
 if(saveNamespace===null){showTitle();return;}
 if(suppressNextClick){suppressNextClick=false;e.preventDefault();e.stopPropagation();return;}
 const target=e.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
 // A stale/background click cannot acknowledge a stop or reach a save/settings action.
 if(modal.safetyPause){if(!modal.contains(target)||!['close','safety-menu'].includes(action))return;if(action==='safety-menu')return showMenu(pauseReason,{acknowledge:true});}
 if(action==='safety-menu')return;
 const deathActive=!!(state?.world?.lifeDown||battle?.dead||battle?.p?.hp<=0);
 if(deathActive&&(!modal.contains?.(target)||!['retry','reload','death-observations','death-panel','observe-refresh'].includes(action)))return;
 if(action==='upgrade-backup-main'){if(!candidate)return openUpgradeBackup('main',$('upgradeBackupKind')?.value);return;}
 if(action==='upgrade-backup-qa')return openUpgradeBackup($('profile')?.value,$('upgradeBackupKind')?.value);
 if(action==='upgrade-backup-restore')return backupUi().copy($('upgradeBackupTarget')?.value,{kind:target.dataset.backupKind,backupChecksum:target.dataset.backupChecksum,selection:target.dataset.backupSelection});
 if(action==='upgrade-backup-title')return backupUi().back();
 if(action==='candidate-copy'){
  if(!candidate)return;
  const selection=modal.profileSelectionEpoch=(modal.profileSelectionEpoch??0)+1,epoch=modal.presentationEpoch??0,owner=controller,name=$('profile').value;
  const current=()=>modal.profileSelectionEpoch===selection&&(modal.presentationEpoch??0)===epoch&&controller===owner;
  paused=true;clearInput('profile-copy');audio.pause(true);
  try{
   const r=await copyReleaseQaProfile(localStorage,navigator.locks,{sourceProfile:$('sourceProfile').value,targetProfile:name,sourceNamespace:$('sourceNamespace')?.value??'release',targetNamespace:saveNamespace});
   if(!current())return;
   if(r.ok)await loadProfile(name,false,'normal',selection);else showTitle(r.reason);
  }catch(error){if(current())showTitle(String(error.message));}
  return;
 }
 if(action==='new'||action==='continue')return loadProfile('main',action==='new',$('difficulty').value);
 if(action.startsWith('qa-'))return loadProfile($('profile').value,action==='qa-new',$('difficulty').value);
 if(gate.blocked&&action!=='reload')return;
 if(action==='objective')return showObjective();if(action==='journal')return showJournal();if(action==='close')return closePanel();if(action==='menu')return showMenu();if(action==='help')return help();if(action==='controls')return showControls();
 if(action==='wilderness-action'){
  const epoch=modal.presentationEpoch??0;if(e.detail>1||modal.hidden||busy||Number(target.dataset.wildernessEpoch)!==epoch)return;
  let captured;try{captured=JSON.parse(target.dataset.wildernessCommand);}catch{return;}
  if(!wildernessCommandFields(captured))return;
  const owner=controller,origin=battle;
  if(await dispatch(captured)&&owner===controller&&origin===battle&&!modal.hidden&&epoch===(modal.presentationEpoch??0)){
   if(captured.type==='interactWilderness')await showWilderness(captured.objectId);else await showNpc('elder');
  }
  return;
 }
 if(action==='tomb-action'){
  const epoch=modal.presentationEpoch??0;if(e.detail>1||modal.hidden||Number(target.dataset.tombEpoch)!==epoch)return;
  let captured;try{captured=JSON.parse(target.dataset.tombCommand);}catch{return;}
  const fields=tombCommandFields(captured);if(!fields)return;
  const owner=controller,origin=battle;
  if(await dispatch({...fields,...report()})&&owner===controller&&origin===battle&&!modal.hidden&&epoch===(modal.presentationEpoch??0)){
   if(fields.type==='interactTomb')await showTomb(fields.objectId);else showNpc('elder');
  }
  return;
 }
 if(action==='battlefield-action'){
  const epoch=modal.presentationEpoch??0;if(e.detail>1||modal.hidden||Number(target.dataset.battlefieldEpoch)!==epoch)return;
  let captured;try{captured=JSON.parse(target.dataset.battlefieldCommand);}catch{return;}
  const fields=battlefieldCommandFields(captured);if(!fields)return;
  const owner=controller,origin=battle;
  if(await dispatch({...fields,...report()})&&owner===controller&&origin===battle&&!modal.hidden&&epoch===(modal.presentationEpoch??0)){
   if(fields.type==='interactBattlefield')await showBattlefield(fields.objectId);else showNpc('elder');
  }
  return;
 }
 if(action==='furnace-accept'||action==='furnace-report'){const epoch=modal.presentationEpoch??0;if(await dispatch({type:action==='furnace-accept'?'acceptFurnaceQuest':'reportFurnaceQuest',...report()})&&!modal.hidden&&epoch===(modal.presentationEpoch??0))showEquipment('blacksmith');return;}
 if(action.startsWith('furnace:')){const [,objectId,choice]=action.split(':'),epoch=modal.presentationEpoch??0;if(await dispatch({type:'interactFurnace',objectId,...(choice===undefined?{}:{choice}),...report()})&&!modal.hidden&&epoch===(modal.presentationEpoch??0))showFurnace(objectId);return;}
 if(action==='signal-accept'||action==='signal-report'){if(await dispatch({type:action==='signal-accept'?'acceptSignalQuest':'reportSignalQuest',...report()}))showEquipment('blacksmith');return;}
 if(action.startsWith('signal:')){const [,objectId]=action.split(':');if(await dispatch({type:'interactSignal',objectId,...report()}))showSignal(objectId);return;}
 if(action==='pass-accept'||action==='pass-report'){if(await dispatch({type:action==='pass-accept'?'acceptPassQuest':'reportPassQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('pass:')){const [,objectId]=action.split(':');if(await dispatch({type:'interactPass',objectId,...report()}))showPass(objectId);return;}
 if(action==='quarry-accept'||action==='quarry-report'){if(await dispatch({type:action==='quarry-accept'?'acceptQuarryQuest':'reportQuarryQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('quarry:')){const [,objectId,value]=action.split(':');if(await dispatch({type:'interactQuarry',objectId,...(value===undefined?{}:{value:Number(value)}),...report()}))showQuarry(objectId);return;}
 if(action==='sluice-accept'||action==='sluice-report'){if(await dispatch({type:action==='sluice-accept'?'acceptSluiceQuest':'reportSluiceQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('dungeon:')){const [,objectId,value]=action.split(':');if(await dispatch({type:'interactDungeon',objectId,...(value===undefined?{}:{value:Number(value)}),...report()}))showDungeon(objectId);return;}
 if(action==='crusher-menu'){
  if(!candidate||!battle||state.world.lifeDown)return;
  // Button focus queues input safety in the same turn. Reconcile it before
  // taking an idle snapshot; real commits/actions still retain their guards.
  flushActionSafety();
  const ready=crusherAvailability(battle),town=battle.region==='ash_hamlet',idle=!battle.p.action&&!(battle.p.recoveryLock>0)&&!busy&&!expertSafety.pending,epoch=(modal.presentationEpoch??0)+1;
  panel('전투 방식 · 파쇄철퇴',`<p>현재 선택: ${battle.crusherEnabled?'파쇄철퇴':'기본 전사'}</p><p>유효 철퇴 타격 ${CRUSHER_RULES.primedThreshold}회 → 적의 ◆ 준비 표식 → 조준하고 ${esc(keyName('judgement'))} 파쇄 강타 → 대상 중심 충격파. 준비되지 않은 적·허공·기절 면역에는 충격파가 나오지 않습니다.</p><p>기존 단죄를 배워야 하며 현재 철퇴를 사용합니다. 강타의 피해·비용·쿨다운·동작과 배운 효과를 재사용합니다. 파쇄 강타는 선택한 적을 직접 때리고 충격파는 주변 적에 한 번 적용합니다.</p><p class="minor">2회 준비는 첫 후보의 명시적 자체 규칙이며 PoE2의 피해 비례 기절 축적과 같은 수치가 아닙니다. 지역 이동에는 선택을 유지하지만 준비 상태는 초기화합니다. 앱 재시작·프로필 변경·다시 불러오기에는 기본으로 돌아갑니다. 저장 항목은 추가하지 않습니다.</p>${!town?'<p class="warning">마을에서 전투 방식을 선택하세요.</p>':!idle?'<p class="warning">진행 중인 동작과 처리가 끝난 뒤 다시 여세요.</p>':!ready.ok?`<p class="warning">${esc(ready.reason)}</p>`:''}<div class="buttons">${button('파쇄철퇴 선택','crusher-mode:1',`data-crusher-epoch="${epoch}" ${town&&idle&&ready.ok?'':'disabled'}`)}${button('기본 전사로','crusher-mode:0',`data-crusher-epoch="${epoch}" ${town&&idle?'':'disabled'}`)}${button('돌아가기','menu')}</div>`);return;
 }
 if(action==='crusher-mode:1'||action==='crusher-mode:0'){
  if(!candidate||Number(target.dataset.crusherEpoch)!==modal.presentationEpoch||battle?.region!=='ash_hamlet'||state.world.lifeDown)return;
  flushActionSafety();
  if(battle.p.action||battle.p.recoveryLock>0||busy||expertSafety.pending)return;
  const result=setCrusherMode(battle,action.endsWith(':1'));if(!result.ok){toast(result.reason);return;}setStormMode(battle,false);closePanel();updateHud();return;
 }
 if(action==='storm-menu'){
  if(!candidate||!battle||state.world.lifeDown)return;flushActionSafety();
  const ready=stormAvailability(battle),idle=battle.region==='ash_hamlet'&&!battle.p.action&&!(battle.p.recoveryLock>0)&&!busy&&!expertSafety.pending,epoch=(modal.presentationEpoch??0)+1;
  panel('전투 방식 · 폭풍 연격',`<p>현재 선택: ${battle.stormEnabled?'폭풍 연격':battle.crusherEnabled?'파쇄철퇴':'기본 전사'}</p><p>${esc(keyName('attack'))} 봉 연격으로 실제 적 명중 ${STORM_RULES.comboRequired}회 → Combo 준비 → 비어 있는 바닥에 ${esc(keyName('judgement'))} 종 설치 → 종 몸체에 조준해 봉으로 직접 타격 → 충격파.</p><p>두 번째 실제 접촉 뒤 ${STORM_RULES.perfectWindow}초 안에 ${esc(keyName('charge'))} 돌진을 시작해 종에 닿으면 종을 소모합니다. 여러 종 폭발이 겹쳐도 한 돌진은 적마다 한 번만 타격합니다. 허공·종·충격파는 Combo를 생성하지 않습니다.</p><p>이 후보는 주무기를 해제한 세션 훈련봉 자세입니다. 실제 봉 아이템·양손 장착은 추가하지 않습니다. 기본 훈련과 단죄를 배워야 하며 PoE형 조작을 직접 선택하세요. 기존 공격·단죄·돌진 수치와 자원을 재사용합니다.</p><p class="minor">공식0.5 근거: 종 최대3개, 타격 충격파 간격0.3초, 정타 돌진의 종 폭발. 자체 시험 설정: Combo4, 종 수명12초, 연격2접촉, 두 번째 접촉 뒤0.18초 돌진 시작 판정. Power Charge는 구현하지 않습니다. 지역 이동은 선택만 유지하고 Combo/종을 초기화합니다. 다시 불러오기는 기본 전사로 돌아갑니다.</p>${!idle?'<p class="warning">마을에서 동작·후딜·처리가 끝난 뒤 다시 여세요.</p>':!ready.ok?`<p class="warning">${esc(ready.reason)}</p>`:''}<div class="buttons">${button('폭풍 연격 선택','storm-mode:1',`data-storm-epoch="${epoch}" ${idle&&ready.ok?'':'disabled'}`)}${button('기본 전사로','storm-mode:0',`data-storm-epoch="${epoch}" ${idle?'':'disabled'}`)}${button('돌아가기','menu')}</div>`);return;
 }
 if(action==='storm-mode:1'||action==='storm-mode:0'){
  if(!candidate||Number(target.dataset.stormEpoch)!==modal.presentationEpoch||battle?.region!=='ash_hamlet'||state.world.lifeDown)return;flushActionSafety();if(battle.p.action||battle.p.recoveryLock>0||busy||expertSafety.pending)return;
  const result=setStormMode(battle,action.endsWith(':1'));if(!result.ok){toast(result.reason);return;}if(action.endsWith(':0'))setCrusherMode(battle,false);closePanel();updateHud();return;
 }
 if(action==='inventory'){if(state.vitals)await dispatch({type:'checkpoint',...report()});return showEquipment();}
 if(action.startsWith('award:')){const awardId=action.slice(6);return equipmentAction({type:'receiveEquipmentAward',awardId,...(awardId==='workshop_supplies'?{station:'blacksmith'}:{})});}
 if(action.startsWith('buy:'))return equipmentAction({type:'buyEquipment',baseId:action.slice(4),station:'blacksmith',expectedGold:EQUIPMENT_ITEMS[action.slice(4)].price});
 if(action.startsWith('craft:'))return equipmentAction({type:'craftItem',recipeId:action.slice(6),station:'workshop',expectedGold:EQUIPMENT_RECIPES[action.slice(6)].gold});
 if(action.startsWith('equip:'))return equipmentAction({type:'equipItem',itemId:action.slice(6)});
 if(action.startsWith('unequip:'))return equipmentAction({type:'unequipItem',slot:action.slice(8)});
 if(action.startsWith('upgrade:'))return equipmentAction({type:'upgradeItem',itemId:action.slice(8),expectedRank:Number(target.dataset.rank),station:'workshop'});
 if(action.startsWith('sell:')){const id=action.slice(5),row=equipmentRows(state).rows.find(r=>r.instance.id===id);if(row)panel('장비 판매 확인',`<p>${row.base.name} +${row.instance.upgradeRank}을 ${row.sellPrice}G에 판매합니다. 현재 되사기는 지원하지 않습니다.</p>${button('판매 확정','confirm-sell:'+id)}${button('취소','smith-return')}`);return;}
 if(action.startsWith('confirm-sell:'))return equipmentAction({type:'sellItem',itemId:action.slice(13),station:'blacksmith'});
 if(action==='smith-return')return showEquipment('blacksmith');
 if(action.startsWith('bind:')){const [,a,i]=action.split(':');return beginBinding(a,Number(i));}
 if(action.startsWith('poe-preset:')){const [,mode,run]=action.split(':');if(!['wasd','click'].includes(mode)||!['combined','separate'].includes(run))return;panel('조작 전환 확인',`<p>이 프로필의 키를 새 프리셋으로 바꿉니다. 전환 전 키 설정은 정확한 사본으로 보관해 복원할 수 있습니다. 진행·장비·자원은 변경하지 않습니다.</p><p>${mode==='click'?'좌클릭 이동 / J 기본공격':'WASD 이동 / 좌클릭 기본공격'} · 우클릭 망치 · Q 돌진 · 1 물약 · V 상호작용<br>${run==='combined'?'Space 회피 뒤 홀드 질주':'Space 회피만 / Shift 달리기'}</p><div class="buttons">${button('이 설정으로 전환',`apply-poe-preset:${mode}:${run}`)}${button('취소','controls')}</div>`);return;}
 if(action.startsWith('apply-poe-preset:')){const [,mode,run]=action.split(':');if(!['wasd','click'].includes(mode)||!['combined','separate'].includes(run)||e.detail>1)return;if(await dispatch({type:'setControls',controls:poeControlPreset(state.options.controls??config(),mode,run)}))showControls('새 조작을 저장했습니다. 전환 전 키도 보존했습니다.');return;}
 if(action==='restore-prior-controls'){const previous=restorePriorControls(config());if(previous&&await dispatch({type:'setControls',controls:previous}))showControls('전환 전 키 설정을 복원했습니다.');return;}
 if(action.startsWith('unbind:')){const [,a,i]=action.split(':');const r=rebindControl(config(),a,Number(i),null);if(r.ok&&await dispatch({type:'setControls',controls:r.controls}))showControls('키를 제거했습니다.');else showControls(r.reason??'저장에 실패했습니다.');return;}
 if(action.startsWith('preset:')){const name=action.slice(7);panel('키 배치 초기화',`<p>이 프로필의 현재 키와 방패/돌진 옵션을 ${name==='legacy'?'기존':'추천'} 배치로 바꿉니다. ${config().version===5?'기술 배치는 유지하며 이동 모드는 WASD로 바뀝니다. 회피/질주 키는 비어 있으므로 필요하면 직접 지정하세요.':''}</p>${button('적용','apply-preset:'+name)}${button('취소','controls')}`);return;}
 if(action.startsWith('apply-preset:')){if(await dispatch({type:'setControls',controls:controlPreset(action.slice(13),config())}))showControls('선택한 배치로 저장했습니다.');return;}
 if(action==='reload'){const r=await controller.load();if(!r.ok){toast(r.reason);return;}if(!gate.resolveLoad(r)){toast('복원할 저장을 확인하지 못했습니다.');return;}state=freezeOwnedSnapshot(r.state);contactTrace.clear();frameObservation.clear('reload');battle=createBattle(state);router.clear({resetMovement:true});if(state.world.lifeDown)showDeath();else closePanel();return;}
 if(action==='input-observations')return showInputObservations();
 if(action==='death-panel'){if(deathActive)return showDeath();return;}
 if(action==='death-observations'){if(deathActive&&candidate&&frameObservation.enabled)return showQaObservations();return;}
 if(action==='observe-panel')return showQaObservations();
 if(candidate&&['observe-contact-toggle','observe-frame-toggle','observe-clear','observe-refresh'].includes(action)){if(action==='observe-contact-toggle')contactTrace.setEnabled(!contactTrace.enabled);else if(action==='observe-frame-toggle')frameObservation.setEnabled(!frameObservation.enabled);else if(action==='observe-clear'){contactTrace.clear();frameObservation.clear('manual');}return showQaObservations();}
 if(action==='action-slots')return showActionSlots();
 if(action==='enable-skill-loadout'){if(e.detail>1||!STARTER_SKILLS.every(id=>state.character.skills[id]>0))return;const c=enableSkillLoadout(state.options.controls??config(),{skills:state.character.skills,actionSlots:state.actionSlots});if(await dispatch({type:'setControls',controls:c}))await showSkillSlots();return;}
 if(action==='assign-skill-slot'){if(e.detail>1||config().version!==5)return;const r=await dispatch({type:'assignSkillSlot',slot:target.dataset.slot,skillId:target.dataset.skill||null,expectedSkillId:target.dataset.expected||null,expectedRevision:Number(target.dataset.revision),life:state.world.life??0});if(r)await showSkillSlots();return;}
 if(action==='assign-slot'){if(e.detail>1)return;const r=await dispatch({type:'assignActionSlot',slot:target.dataset.slot,skillId:target.dataset.skill||null,expectedSkillId:target.dataset.expected||null,expectedRevision:Number(target.dataset.revision),life:state.world.life??0});if(r)await showActionSlots();return;}
 if(action==='promote-expert'){if(e.detail>1)return;if(await dispatch({type:'promoteExpert',...report(),expectedRevision:Number(target.dataset.revision),expectedGoldCost:Number(target.dataset.gold)}))await showTraining();return;}
 if(action==='promote-adept'){if(await dispatch({type:'promoteAdept',...report()}))showNpc('trainer');return;}
 if(action==='train'){if(await dispatch({type:'trainStarter',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='accept'){if(await dispatch({type:'acceptPatrol',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='claim'){if(await dispatch({type:'claimReward',rewardId:'watch_patrol',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='rest'){if(await dispatch({type:'rest',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='retry'){if(await dispatch({type:'retry',expectedStoreRevision:controller.capture().revision},{rebuild:true}))closePanel();}
 else if(action==='potion')immediateAction('potion');
 else if(action==='townPortal')immediateAction('townPortal');
 else if(action.startsWith('skill:')){if(e.detail>1)return;await purchaseTrainingSkill(target);}
 else if(action.startsWith('attribute:')){if(await dispatch({type:'allocateAttribute',attribute:action.slice(10)}))showMenu();}
 else if(action==='save'||action==='leave'){if(await dispatch({type:'checkpoint',...report()})){if(action==='leave')showTitle();else toast('현재 위치와 자원을 저장했습니다.');}}
});
document.addEventListener('change',async e=>{if(modal.safetyPause||state?.world.lifeDown||battle?.dead||battle?.p?.hp<=0)return;const option=e.target.dataset.option;if(option){await dispatch({type:'setOption',option,value:Number(e.target.value)});syncAudioOptions();}const poeOption=e.target.dataset.poeOption;if(poeOption){const c=structuredClone(state.options.controls??config());if(!isPoeControls(c)||!['aimingMode','cursorTrackingAfterRelease','keepSprintingWhileMoving','attackInPlaceStopsMovement'].includes(poeOption))return;c.poe[poeOption]=poeOption==='aimingMode'?e.target.value:e.target.value==='true';if(await dispatch({type:'setControls',controls:c}))showControls('독립 입력 옵션을 저장했습니다.');}const control=e.target.dataset.controlOption;if(control){const c=structuredClone(state.options.controls??config());c[control]=e.target.value;c.preset='custom';if(await dispatch({type:'setControls',controls:c}))showControls('설정을 저장했습니다.');}});
$('menuButton').onclick=()=>{if(!modal.hidden||state?.world.lifeDown||battle?.dead||battle?.p?.hp<=0)return;showMenu();};$('touchInteract').onclick=()=>immediateAction('interact');
function immediateAction(action){
 if(!action)return;const wasContext=contextClick.active;contextClick.clear('immediate-input');contextSuppressHeld=false;if(wasContext||action==='interact'||action==='townPortal')locomotionIntent.clear();expertCapture.deferred.clear();skillCapture.deferred.clear();router.consume(action);
 if(action==='pause'){paused&&battle?closePanel():showMenu();return;}
 if(action==='menu'){showMenu();return;}
 if(paused||!battle||state.world.lifeDown||battle.p.hp<=0||gate.blocked)return;
 if(busy){deferredImmediate.offer(action,{now:performance.now(),life:battle.stateLife,region:battle.region});return;}
 deferredImmediate.clear();
 if(action==='interact'&&battle.p.action?.id==='zealous_onslaught'){clearInput('competing-input');flushActionSafety();return;}
 if(action==='interact')interact();
 if(action==='potion'){clearBattleIntent(battle);dispatch({type:'drinkPotion',...report()});}
 if(action==='townPortal'){if(flushActionSafety()){deferredImmediate.offer(action,{now:performance.now(),life:battle.stateLife,region:battle.region});return;}openTownPortal();}
}
async function openTownPortal(){
 const available=townPortalAvailability(state);if(!available.ok){toast(available.reason);return;}
 const owner=controller,origin=battle,preview={owner,origin,...battle.p,openedAtMs:townPortalNow(),pending:true};
 clearBattleIntent(battle);townPortalPreview=preview;toast('잿불 귀환 포탈 여는 중…');
 const ok=await dispatch({type:'openTownPortal',region:battle.region,...report()},{critical:true});
 if(townPortalPreview===preview)townPortalPreview=null;
 if(ok&&owner===controller&&origin===battle){audio.play('magicRelease');toast(`귀환 포탈이 열렸습니다 · ${keyName('interact')}로 마을 입장`);}
}
function visibleTownPortal(){
 const preview=townPortalPreview?.owner===controller&&townPortalPreview?.origin===battle?townPortalPreview:null,portal=preview??townPortalCandidate(state);
 return portal&&battle&&!state.world.lifeDown&&battle.p.hp>0&&lineOfSight(battle.map,battle.p,portal)?portal:null;
}
window.addEventListener('keydown',e=>{
 if(captureBinding){e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.code==='Escape'){captureBinding=null;showControls();}else if(e.ctrlKey||e.altKey||e.metaKey)toast('조합키는 지원하지 않습니다.');else applyBinding(e.code);return;}
 // Key-capture above keeps Tab assignable; ordinary dialogs own Tab navigation.
 if(trapDialogTab(modal,e)){clearInput();return;}
 const resumedGameKey=!!battle&&!paused&&!gate.blocked&&!state.world.lifeDown&&battle.p.hp>0&&handoffDialogGameFocus(modal,e,canvas,{active:true,configured:()=>Object.values(config().bindings).some(keys=>keys.includes(e.code))});
 // Native UI activation wins; only the exact resumed trigger can hand off a game key.
 if((!resumedGameKey&&editableTarget(e.target))||!modal.hidden){clearInput();if(e.repeat&&['Enter','NumpadEnter','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&battle){e.preventDefault();if(!e.repeat)immediateAction('pause');}return;}
 const action=router.down(e.code,config(),{repeat:e.repeat,editable:false,modified:e.ctrlKey||e.altKey||e.metaKey,paused});
 if(action){e.preventDefault();if(['pause','menu','interact','potion','townPortal'].includes(action))immediateAction(action);else{deferredImmediate.clear();acceptCombatPress(action,e.code);}}
},true);
window.addEventListener('keyup',e=>releaseCombatToken(e.code));
document.addEventListener('focusin',e=>{if(containDialogFocus(modal,e)||editableTarget(e.target))clearInput();});
window.addEventListener('blur',()=>{focusEvents.safetyEpoch=(focusEvents.safetyEpoch??0)+1;focusEvents.blurAt=new Date().toISOString();captureBinding=null;clearInput();if(battle&&!paused)showMenu('브라우저 포커스가 벗어남',{safety:true});});
document.addEventListener('visibilitychange',()=>{focusEvents.safetyEpoch=(focusEvents.safetyEpoch??0)+1;focusEvents.visibilityAt=new Date().toISOString();focusEvents.visibilityState=document.visibilityState;if(document.hidden){captureBinding=null;clearInput();if(battle&&!paused)showMenu('게임 탭이 숨겨짐',{safety:true});}});
window.addEventListener('mousedown',e=>{if(!captureBinding)return;if(e.target.closest?.('[data-action="controls"]')){captureBinding=null;return;}e.preventDefault();e.stopImmediatePropagation();if(e.ctrlKey||e.altKey||e.metaKey){toast('조합키는 지원하지 않습니다.');return;}suppressNextClick=e.button===0;applyBinding('Mouse'+e.button);},true);
canvas.addEventListener('pointermove',e=>{if(battle){const r=canvas.getBoundingClientRect();input.pointerScreen={x:e.clientX-r.left,y:e.clientY-r.top};}});
canvas.addEventListener('pointerdown',e=>{if(!battle||paused)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){e.preventDefault();const r=canvas.getBoundingClientRect();input.pointerScreen={x:e.clientX-r.left,y:e.clientY-r.top};}});
// Mouse chords emit mousedown/up for every button, unlike pointerdown/up.
canvas.addEventListener('mousedown',e=>{if(!battle||paused)return;e.preventDefault();const bounds=canvas.getBoundingClientRect();input.pointerScreen={x:e.clientX-bounds.left,y:e.clientY-bounds.top};const action=router.down('Mouse'+e.button,config(),{modified:e.ctrlKey||e.altKey||e.metaKey});if(['pause','menu','interact','potion','townPortal'].includes(action))immediateAction(action);else{deferredImmediate.clear();acceptCombatPress(action,'Mouse'+e.button);}});
window.addEventListener('mouseup',e=>releaseCombatToken('Mouse'+e.button));canvas.addEventListener('lostpointercapture',()=>{router.releaseMouse();const expertOwned=expertCapture.releaseMouse('pointer-cancel'),skillOwned=skillCapture.releaseMouse('pointer-cancel');if(expertOwned||skillOwned)clearInput('pointer-cancel');});canvas.addEventListener('pointercancel',()=>clearInput('pointer-cancel'));canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('auxclick',e=>e.preventDefault());window.addEventListener('auxclick',e=>{if(!modal.hidden)e.preventDefault();},true);modal.addEventListener('contextmenu',e=>e.preventDefault());
for(const el of document.querySelectorAll('[data-combat]')){
 el.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;deferredImmediate.clear();el.setPointerCapture(e.pointerId);const action=router.virtual(el.dataset.combat,true,config());acceptCombatPress(action,'Touch:'+el.dataset.combat);});
 el.addEventListener('pointerup',()=>{router.virtual(el.dataset.combat,false,config());releaseCombatToken('Touch:'+el.dataset.combat);});
 for(const name of ['pointercancel','lostpointercapture'])el.addEventListener(name,()=>{const token='Touch:'+el.dataset.combat,capture=config().version===5?skillCapture:expertCapture,owned=capture.owns(token);router.virtual(el.dataset.combat,false,config());capture.up(token,{cancelReason:name});if(owned||name==='pointercancel')clearInput(name);});
}
for(const el of document.querySelectorAll('[data-move]')){el.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;deferredImmediate.clear();expertCapture.deferred.clear();skillCapture.deferred.clear();el.setPointerCapture(e.pointerId);router.virtual(el.dataset.move,true,config());});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>router.virtual(el.dataset.move,false,config()));}

function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}window.addEventListener('resize',resize);resize();
function drawLabels(sceneVisibility=wildernessSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>wildernessView(state,'object',o.id),portalView:o=>wildernessView(state,'portal',o.id)})??signalSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>signalObjectView(state,o)})){const r=getRegion(battle.region),focus=projectWorld(battle.p.x,battle.p.y);ctx.save();ctx.font='12px EmberwatchKorean';ctx.textAlign='center';for(const n of [...(townPortalCandidate(state)?[townPortalCandidate(state)]:[]),...r.npcs,...r.portals.filter(x=>(!x.gate?.startsWith('furnace_')||state.world.objectives.furnace_accepted===1)&&(!x.gate?.startsWith('tomb_')||state.world.objectives.tomb_accepted===1)&&(!x.gate?.startsWith('battlefield_')||state.world.objectives.battlefield_accepted===1)&&(!x.gate?.startsWith('wilderness_')||state.world.objectives.wilderness_accepted===1)).map(x=>({...x,name:x.id.includes('wilderness')?wildernessView(state,'portal',x.id).name:x.gate?.startsWith('battlefield_')?battlefieldPortalLabel(state,x):x.gate?.startsWith('tomb_')?tombPortalLabel(state,x):x.name})),...r.objects.filter(o=>['dungeon','quarry','pass','signal','furnace','tomb','battlefield','wilderness'].includes(o.type)&&near(battle.p,o,230)).map(o=>({...o,name:o.type==='wilderness'?wildernessView(state,'object',o.id).name:(o.type==='battlefield'?battlefieldObjectView:o.type==='tomb'?tombObjectView:o.type==='furnace'?furnaceObjectView:o.type==='signal'?signalObjectView:o.type==='pass'?passObjectView:o.type==='quarry'?quarryObjectView:dungeonObjectView)(state,o).name}))]){const q=projectWorld(n.x,n.y),x=canvas.width*.5+(q.x-focus.x)*ISO.zoom,y=canvas.height*.55+(q.y-focus.y)*ISO.zoom;const text=n.kind==='townPortal'?(lineOfSight(battle.map,battle.p,n)&&near(battle.p,n,160)&&!sceneVisibility?.combat?n.name:null):sceneVisibility?sceneVisibility.landmarkLabel(n):n.name;if(!text)continue;if(sceneVisibility&&x-60<canvas.width*.5+25&&x+60>canvas.width*.5-25&&y-74<canvas.height*.55+8&&y-53>canvas.height*.55-64)continue;ctx.fillStyle='#121725cc';ctx.fillRect(x-60,y-74,120,21);ctx.fillStyle=n.to?'#a2d5d3':'#ead09e';ctx.fillText(text,x,y-60);}ctx.restore();}
async function loadArt(){const images={motion:{}};const load=(path,set)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{set(image);resolve();};image.onerror=()=>reject(new Error(path));image.src=path;});await Promise.all([...['environment','hero','enemy'].map(k=>load(ART[k].file,i=>images[k]=i)),load(MOTION_ASSETS.hero.file,i=>images.motion.hero=i),load('assets/motion-warrior-axe.png',i=>images.axe=i)]);renderer=createVisualRenderer(ctx,ART,images);await document.fonts.ready;showTitle();}
let hudTimer=0;
function frame(now){const qaStartedAt=frameObservation.enabled?performance.now():null,qaPreviousRaf=last;let qaStepped=false,qaMove=null,qaFailed=false;const suspended=frameWasSuspended(now,last),dt=frameDelta(now,last);last=now;
 try{
  if(frameObservation.enabled)frameObservation.beginFrame(now,{hasBattle:!!battle,paused,busy,awaitingAdvance:battle?.awaitingAdvance,combat:battle?.enemies.some(e=>e.active&&e.hp>0),moving:battle?.p.moving,hidden:document.hidden,focused:document.hasFocus(),visibilityState:document.visibilityState,focusEpoch:focusEvents.safetyEpoch??0,runtimePreviousRafTimestampMs:qaPreviousRaf,callbackStartedAtMs:qaStartedAt});
  if(battle&&renderer){
   if(frameObservation.enabled)frameObservation.beginPhase('safety');
   if(!paused&&(document.hidden||!document.hasFocus()||suspended)){if(frameObservation.enabled)frameObservation.markSafetyStop(document.hidden?'hidden':!document.hasFocus()?'blur':'frame-gap');showMenu(document.hidden?'게임 탭이 숨겨짐':!document.hasFocus()?'브라우저 포커스가 벗어남':'화면 처리가 0.5초 이상 중단됨',{safety:true});}
   flushActionSafety();
   flushDeferredSkills();
   const deferred=deferredImmediate.flush({now:performance.now(),life:battle.stateLife,region:battle.region,busy,paused,blocked:gate.blocked,lifeDown:state.world.lifeDown||battle.p.hp<=0,focused:document.hasFocus(),hidden:document.hidden},immediateAction);
   if(deferred.status==='expired')toast('저장 처리가 늦어 입력을 취소했습니다. 다시 눌러 주세요.');
   if(frameObservation.enabled)frameObservation.endPhase('safety');
   if(paused)menuTime+=dt;
   if(gate.canStep({hasBattle:!!battle,paused,busy:busy||expertSafety.pending,hidden:document.hidden,focused:document.hasFocus()}))stepContextClick(dt);
   if(gate.canStep({hasBattle:!!battle,paused,busy,hidden:document.hidden,focused:document.hasFocus()})){if(battle.awaitingAdvance)arrivalWaitTime+=dt;else displayTime+=dt;const expired=[...router.expirePending(performance.now()),...skillCapture.expirePending(performance.now())];if(expired.length){inputLatency.clear('save-input-expired');toast('저장 대기가 길어 입력을 취소했습니다. 다시 눌러 주세요.');}if(frameObservation.enabled)frameObservation.beginPhase('input');const routed=sampledCombatInput();if(frameObservation.enabled)frameObservation.endPhase('input');
    if(battle.awaitingAdvance&&routed.heal&&state.character.skills.lay_on_hands)toast('진입 안전대기 중 · 이동 또는 공격한 뒤 치유를 사용하세요.');
    poeFeedback.step(dt);frameObservation.beginPhase('step');const events=stepBattle(battle,state.character,dt,routed);frameObservation.endPhase('step');qaStepped=true;qaMove=routed.move;
    if(battle.enemies.some(e=>e.active&&e.hp>0))combatTime+=dt;if(battle.p.moving)walkTime+=dt;if(!battle.awaitingAdvance)combatSaveElapsed+=dt;
    if(frameObservation.enabled)frameObservation.beginPhase('events');deliverCombatEvents(events);if(frameObservation.enabled)frameObservation.endPhase('events');
   }
   if(frameObservation.enabled)frameObservation.beginPhase('scene');
   const sceneVisibility=wildernessSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>wildernessView(state,'object',o.id),portalView:o=>wildernessView(state,'portal',o.id)})??signalSceneVisibility(battle,{objectives:state.world.objectives,objectView:o=>signalObjectView(state,o)});
   const r=getRegion(battle.region),objects=[...r.objects.map(o=>({...o,type:o.type==='dungeon'?({record:'bird',crank:'barrel',rune:'orb',inlet:'shrine',outlet:'shrine',flow:'shrine',lift:'shrine',bell:'relic',core:'relic',store:'chest'}[o.actionKind]):['quarry','pass','signal','furnace','tomb','battlefield','wilderness'].includes(o.type)?(o.visualType??'relic'):o.type,used:o.type==='wilderness'?wildernessView(state,'object',o.id).completed:o.type==='battlefield'?battlefieldObjectView(state,o).completed:o.type==='tomb'?tombObjectView(state,o).completed:['quarry','pass','signal','furnace','tomb','battlefield','wilderness'].includes(o.type)?(o.type==='battlefield'?battlefieldObjectView:o.type==='tomb'?tombObjectView:o.type==='furnace'?furnaceObjectView:o.type==='signal'?signalObjectView:o.type==='pass'?passObjectView:quarryObjectView)(state,o).actions.length===0:o.type==='dungeon'&&['crank','core'].includes(o.actionKind)&&dungeonObjectView(state,o).actions.length===0,open:state.world.claimedRewards.includes('chest:'+o.id)||(o.actionKind==='store'&&state.world.claimedRewards.includes('r4:store'))})),...r.npcs.map(o=>({...o,type:'shrine'})),...r.portals.filter(o=>(!o.gate?.startsWith('furnace_')||state.world.objectives.furnace_accepted===1)&&(!o.gate?.startsWith('tomb_')||state.world.objectives.tomb_accepted===1)&&(!o.gate?.startsWith('battlefield_')||state.world.objectives.battlefield_accepted===1)&&(!o.gate?.startsWith('wilderness_')||state.world.objectives.wilderness_accepted===1)).map(o=>({...o,type:o.to==='ash_hamlet'?'return':'exit'}))];
   if(contactTrace.enabled)contactTrace.observe(battle,{stepped:qaStepped,move:qaMove,entityVisible:sceneVisibility?.entityVisible});
   if(frameObservation.enabled)frameObservation.endPhase('scene');
   frameObservation.beginPhase('render');
   const renderObservation=inputLatency.renderEntered(battle.p.action,battle.p.presentationPose);
   renderer.render({width:canvas.width,height:canvas.height,regionId:battle.region,map:battle.map,p:battle.p,entities:battle.enemies,stormBells:battle.storm?.bells??[],objects,sceneVisibility,seen:sceneVisibility?.seen,wardCarried:tombWardCarried(state),moveDestination:battle.moveDestination,presentationPose:battle.p.presentationPose,poeInput:isPoeControls(config()),poeFeedback:poeFeedback.snapshot(),banner:battle.banner,areas:battle.areas,shots:battle.shots,effects:battle.effects,floaters:battle.floaters,time:battle.time,shake:battle.shake*state.options.screenShake,reduced:state.options.flashes===0,flashScale:state.options.flashes,stats:battle.stats,classId:'warrior',targetId:battle.targetId,cleanView:true,townPortal:visibleTownPortal(),wallTimeMs:townPortalNow()});inputLatency.renderReturned(renderObservation);drawLabels(sceneVisibility);if(contactTrace.enabled)contactTrace.draw(ctx,{width:canvas.width,height:canvas.height,focus:battle.p,time:battle.time,shake:battle.shake*state.options.screenShake});if(contextClick.active){const q=contextProjection(contextClick.target);ctx.save();ctx.strokeStyle='#f1d697';ctx.lineWidth=2;ctx.beginPath();for(const dx of [-1,1]){ctx.moveTo(q.x+dx*16,q.y-5);ctx.lineTo(q.x+dx*21,q.y);ctx.lineTo(q.x+dx*16,q.y+5);}ctx.stroke();ctx.restore();}
   frameObservation.endPhase('render');
   if(frameObservation.enabled)frameObservation.beginPhase('audio');
   audio.tick(dt,{paused,scene:battle.region==='ash_hamlet'?'town':'dungeon',combat:battle.enemies.some(e=>e.active&&e.hp>0)?1:0});
   if(frameObservation.enabled)frameObservation.endPhase('audio');
   frameObservation.beginPhase('ui');
   const n=nearest(),targeted=battle.enemies.find(e=>e.id===battle.targetId&&e.hp>0);$('hint').textContent=!paused&&battle.skillIntent?`${({shield_charge:'돌진',righteous_hammer:'망치',lay_on_hands:'온기',judgement:'단죄',battle_banner:'깃발',zealous_onslaught:'진격'}[battle.skillIntent.id])} 예약 · ${isPoeControls(config())?'가드/다른 기술/상호작용으로 취소':'가드/반대 조준/상호작용으로 취소'}`:battle.awaitingAdvance&&!paused?`이동하거나 공격하면 전투가 시작됩니다 · ${keyName('pause')}로 조작 안내`:!paused&&n?`${keyName('interact')} · ${n.name??'상자 열기'}`:!paused&&targeted?`조준 · ${FOES[targeted.kind].name}${targeted.kind.startsWith('wilderness_')&&FOES[targeted.kind].tags.includes('undead')?' · 망자':''}`:'';hudTimer+=dt;if(hudTimer>.1){updateHud();hudTimer=0;}frameObservation.endPhase('ui');
  }
  if(inputFeedback&&now-inputFeedback.at>180)clearInputFeedback();
  if(now>noticeUntil){$('toast').recoverySkillId=null;$('toast').classList.remove('visible');$('toast').textContent='';}
 }catch(error){qaFailed=true;console.error(error);gate.block(error.message);panel('진행을 멈췄습니다',`<p>오류를 기록했습니다. 최근 저장 상태를 다시 불러올 수 있습니다.</p><p class="minor">${esc(error.message)}</p>${button('저장 다시 읽기','reload')}`);}
 if(frameObservation.enabled)frameObservation.endFrame({failed:qaFailed});
 requestAnimationFrame(frame);
}
if(saveNamespace===null)showTitle();else {loadArt().catch(error=>{panel('리소스를 불러오지 못했습니다',`<p>${esc(error.message)}</p><p>아트 로드를 확인한 뒤 새로고침하세요. 기본 도형만으로 완성된 게임이라 표시하지 않습니다.</p>`);});requestAnimationFrame(frame);}

// Optional read-only WebMCP: visible progression only, never debug mutation.
if(document.modelContext?.registerTool){const life=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'read_emberwatch_status',title:'현재 전사 상태 읽기',description:'현재 전사 상태와 최근 입력/액션/렌더 함수 호출 시각을 읽습니다. 지연 기록은 실제 화면·스피커 지연 실측이 아닙니다. 게임/저장을 변경하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length)throw new Error('No arguments accepted');return state?{profile,level:state.character.level,xp:state.character.xp,gold:state.gold,region:getRegion(state.world.region).name,kills:state.stats.kills,questKills:state.world.objectives.patrol_scouts??0,paused,version:BUILD_LABEL,inputObservations:inputLatency.snapshot()}:{started:false,version:BUILD_LABEL};}},{signal:life.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>life.abort(),{once:true});}
