import {selectInteractionTarget} from './interaction-target.js';
import {createImmediateInput} from './immediate-input.js';
import {combatCheckpoint} from './combat-persistence.js';
import {battleReport} from './recovery.js';
import {previewPromotion} from './promotion.js';
import {resolveCursorAim} from './cursor-targeting.js';
import {syncCommittedBattle} from './runtime-sync.js';
import {candidatePath,candidateNamespace,copyReleaseQaProfile} from './candidate-profile.js';
const candidate=candidatePath(location.pathname),saveNamespace=candidateNamespace(location.pathname)??'release';
import {DUNGEON_TOOLS} from './dungeon-content.js';
import {QUARRY_TOOLS} from './quarry-content.js';
import {PASS_TOOLS} from './pass-content.js';
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
import {ACTIONS,controlsFor,controlPreset,rebindControl,actionLabel,tokenLabel,editableTarget,createInputRouter} from './controls.js';
import {frameDelta,frameWasSuspended} from './runtime-clock.js';
import {ART} from './art.js';
import {MOTION_ASSETS} from './motion.js';
import {createVisualRenderer,screenMovement,screenToWorld,projectWorld,ISO} from './visual.js';
import {createFantasyAudio} from './audio.js';
import {createSession} from './save.js';
import {createController} from './controller.js';
import {createBattle,stepBattle,clearBattleIntent} from './combat.js';
import {getRegion,near,FOES,createMap,lineOfSight} from './world.js';
import {deriveStats,previewSkill,RUNTIME_SKILL_IDS} from './warrior-growth.js';
import {xpForLevel} from './progression.js';
const $=id=>document.getElementById(id),canvas=$('world'),ctx=canvas.getContext('2d');
canvas.tabIndex=-1;
const modal=$('modal'),gate=createRuntimeGate(),router=createInputRouter(),input={aim:null};
let captureBinding=null,suppressNextClick=false,combatSaveElapsed=0;
const deferredImmediate=createImmediateInput();
const actionSkill={heal:'lay_on_hands',judgement:'judgement'};
const visibleAction=a=>!actionSkill[a]||!!state?.character.skills[actionSkill[a]];
const focusEvents={blurAt:'없음',visibilityAt:'없음',visibilityState:'초기'};
let pauseReason='시작 화면',lastObjectiveHtml='';
const config=()=>controlsFor(state);
const keyName=action=>actionLabel(config(),action);
let controller=null,state=null,battle=null,renderer=null,paused=true,busy=false,profile='main',last=performance.now(),noticeUntil=0,displayTime=0,combatTime=0,menuTime=0,walkTime=0,arrivalWaitTime=0;
let audio=createFantasyAudio();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${label}</button>`;
function clearInput(){deferredImmediate.clear();router.clear();clearBattleIntent(battle);if(battle)battle.targetId=null;}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');noticeUntil=performance.now()+3300;}
function panel(title,content,wide=false){if(gate.blocked){title='저장을 확인해야 합니다';content=`<p>${esc(gate.reason)}</p><p>저장 상태를 다시 읽기 전에는 진행할 수 없습니다.</p>${button('저장 다시 읽기','reload')}`;wide=false;}captureBinding=null;paused=true;clearInput();audio.pause(true);modal.hidden=false;modal.innerHTML=`<section class="panel ${wide?'wide':''}"><h2>${title}</h2>${content}</section>`;(modal.querySelector?.('[data-action="close"]')??modal.querySelector?.('button:not([disabled]),input,select,textarea'))?.focus({preventScroll:true});}
function closePanel(){if(!gate.canResume({hasBattle:!!battle,lifeDown:state?.world.lifeDown}))return;modal.hidden=true;modal.innerHTML='';paused=false;clearInput();audio.pause(false);canvas.focus({preventScroll:true});last=performance.now();}
function report(){return battleReport(battle);}
function syncVitals(resetRecovery=false){syncCommittedBattle(battle,state,{resetRecovery});}
async function dispatch(command,{rebuild=false,critical=false}={}){
  if(busy)return false;busy=true;
  const r=await controller.dispatch(command);busy=false;
  if(!r.ok){clearInput();toast(r.reason??r.code);if(critical||r.blocked||['COMMIT_UNCERTAIN','CONFLICT','CORRUPT'].includes(r.code)){gate.block(r.reason??r.code);panel('저장을 확인해야 합니다','');}return false;}
  state=r.state;combatSaveElapsed=0;if(battle)battle.equipmentContext=state;
  if(rebuild){deferredImmediate.clear();battle=createBattle(state);router.clear({resetMovement:true});}else if(DUNGEON_COMMANDS.has(command.type)||QUARRY_COMMANDS.has(command.type)||PASS_COMMANDS.has(command.type)||['trainStarter','settleCombat','checkpoint','rest','drinkPotion','equipment','promoteAdept','purchaseSkill','allocateAttribute'].includes(command.type))syncVitals(command.type==='rest');else if(battle)battle.stats=deriveStats(state.character,state).stats;
  if(r.events.some(e=>e.type==='promoted'))toast('숙련 전사로 승급했습니다. 훈련관에서 새 기술과 분기를 선택하세요.');
  if(r.events.some(e=>['dungeonChanged','quarryChanged','passChanged'].includes(e.type)&&e.mapChanged)&&battle){battle.map=createMap(battle.region,state);for(const e of battle.enemies)e.pathTimer=0;}
  for(const e of r.events){if(e.type==='passSignalReset')toast('순서가 달라 정렬을 0/3으로 되돌렸습니다. 바람 → 불꽃 → 돌');if(e.type==='passSignalAdvanced')toast(`신호 정렬 ${e.step}/3 · 바람 → 불꽃 → 돌`);if(['dungeonReward','quarryReward','passReward'].includes(e.type))toast(`탐험 기록 저장 · 경험치 ${e.xp??0} / 금화 ${e.gold??0}`);if(e.type==='levelUp'){audio.play('level');toast(`레벨 ${state.character.level} · 능력치와 기술점수를 얻었습니다`);}if(e.type==='rewardClaimed')toast(`의뢰 완료 · 경험치 ${e.xp} / 금화 ${e.gold}`);}
  updateHud();return true;
}
function nearest(){
 if(!battle)return null;const r=getRegion(battle.region),all=[...r.npcs.map(x=>({...x,kind:'npc'})),...r.objects.filter(x=>x.type==='dungeon'&&!(x.actionKind==='lift'&&state.world.objectives.sluice_shortcut_open)).map(x=>({...x,kind:'dungeon',...dungeonObjectView(state,x)})),...r.objects.filter(x=>x.type==='quarry'&&!(x.hideWhenCompleted&&quarryObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'quarry',...quarryObjectView(state,x)})),...r.objects.filter(x=>x.type==='pass'&&!(x.hideWhenCompleted&&passObjectView(state,x).actions.length===0)).map(x=>({...x,kind:'pass',...passObjectView(state,x)})),...r.portals.map(x=>({...x,kind:'portal'})),...r.objects.filter(x=>x.type==='chest').map(x=>({...x,kind:'chest',...chestPresentation(state,x.id)}))];
 return selectInteractionTarget({position:battle.p,map:battle.map,candidates:all,regionId:battle.region,objectives:state.world.objectives});
}
function interact(){if(paused||busy||!battle)return;clearBattleIntent(battle);const object=nearest();if(!object){toast(`가까운 인물이나 출입구에서 ${keyName('interact')}를 누르세요.`);return;}if(object.kind==='npc')showNpc(object.id);else if(object.kind==='dungeon')showDungeon(object.id);else if(object.kind==='quarry')showQuarry(object.id);else if(object.kind==='pass')showPass(object.id);else if(object.kind==='portal')dispatch({type:'travel',to:object.to,portalId:object.id,...report()},{rebuild:true});else if(object.open)toast(object.message);else dispatch({type:'openChest',chestId:object.id,...report()});}
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
function effectText(values){
 if(!values)return '미학습 / 선택 불가';
 const labels={damage:'피해',heal:'회복',manaCost:'마나',staminaCost:'기력',cooldown:'쿨다운(초)',range:'범위',radius:'반경',duration:'지속(초)',stunChance:'기절 확률',stunSeconds:'기절(초)',armorPenetration:'방어 관통',chargeDamage:'돌진 피해',chargeStaminaCost:'돌진 기력',blockMoveMultiplier:'방패 이동 배율',moveMultiplier:'이동 배율',damageReduction:'방어 감소율',damageTakenMultiplier:'받는 피해 배율',armor:'방어',hpMax:'최대 체력',manaMax:'최대 마나',strength:'전투 힘',equipmentStrength:'장착 요구용 힘',intelligence:'지능',moveSpeed:'이동 속도',staminaCostMultiplier:'기력 비용 배율',physicalDamage:'물리 공격',physicalDamageMultiplier:'물리 피해 배율',poisonResistance:'독 저항',hammerDamage:'망치 피해',hammerManaCost:'망치 마나',judgementManaCost:'단죄 마나',judgementCooldown:'단죄 쿨다운',coefficient:'현재 기력 비례',damageMultiplier:'피해 배율',tickSeconds:'틱 간격(초)',amount:'방어 감소',multiplier:'재생 배율',fire:'화염',ice:'냉기',lightning:'번개',poison:'독'};
 const direct=Object.entries(values).filter(([key,value])=>key in labels&&Number.isFinite(value)).map(([key,value])=>`${labels[key]} ${Math.round(value*100)/100}`);
 if(values.passesThroughEnemies)direct.push('적 관통 · 벽은 통과 불가');
 for(const [key,label]of Object.entries({lightning:'번개 파동',armorBreak:'방어 균열',thorns:'가시 반격',regenBuff:'회복 재생',fireArea:'화염 지대',shackles:'속박',resistanceBonus:'속성 저항',resistanceBonusWhileBlocking:'방어 중 속성 저항'}))if(values[key]&&typeof values[key]==='object')direct.push(`${label}: ${effectText(values[key])}`);
 return direct.join(' · ')||'해당 기술의 전투 효과를 강화합니다.';
}
function showNpc(id){
  if(state.vitals)dispatch({type:'checkpoint',...report()});
  if(id==='blacksmith'||id==='workshop'){showEquipment(id);return;}
  if(id==='trainer'){
    if(!state.vitals){panel('훈련관 브란',`<span class="pill">처음 시작 · 무료 기본 훈련</span><p>잿길에는 한 마리보다 함께 몰려드는 적이 더 위험하지. 철퇴로 가까운 적을 쓸고, 망치로 줄을 꿰뚫어라. 방패는 정면을 바라봐야 막는다.</p><p class="minor">기본 네 기술의 첫 랭크는 무료입니다. 돌진은 기력, 망치는 마나를 소모합니다. 훈련용 무장으로 시작합니다. 첫 순찰 보상으로 대장장이와 작업대에서 장비를 준비하세요.</p><div class="buttons">${button('네 가지 기본 기술 배우기','train','class="primary"')}${button('나중에','close')}</div>`);return;}
    const rows=RUNTIME_SKILL_IDS.map(id=>{const s=previewSkill(state.character,id,state);return `<article class="skill"><div class="row"><strong>${esc(s.name)}</strong><span>${s.tier==='adept'?'숙련 · ':''}${s.rank}/${s.maxRank}</span></div><p class="effect">현재 ${esc(effectText(s.current?.runtimeValues))}<br>다음 ${esc(effectText(s.next?.runtimeValues))}</p>${(s.warnings??[]).map(w=>`<p class="warning">${esc(w.reason)}</p>`).join('')}${s.exclusiveGroup?'<p class="minor">망치 배타 분기 · 선택 후 반대 분기는 잠깁니다.</p>':''}<div class="row"><span class="minor">${s.cost===null?'최대 랭크':`기술점수 ${s.cost}`}</span>${button(s.available?'강화':esc(s.reason),'skill:'+id,s.available?'class="small"':'class="small" disabled')}</div></article>`;}).join('');
    const promotion=previewPromotion(state);
    panel('전사의 훈련',`<p>${state.character.tier==='adept'?'숙련':'입문'} 전사 · 남은 기술점수 <strong>${state.character.skillPoints}</strong></p><p>${esc(promotion.reason)}</p>${promotion.available?button('숙련 전사로 승급 · 금화0','promote-adept','class="primary"'):''}<div class="skills">${rows}</div><p class="minor">입문9·숙련16노드가 연결되었습니다. 전문가·마스터28노드와 이후 캠페인은 개발 중입니다. 현재 첫 승급은 브란의 지원으로 금화0이며 추가 경험치/점수/회복을 주지 않습니다.</p>${button('돌아가기','close')}`,true);
  }else if(id==='elder'){
    const accepted=state.world.objectives.patrol_accepted,kills=state.world.objectives.patrol_scouts??0,claimed=state.world.claimedRewards.includes('watch_patrol'),o=state.world.objectives;
    const nextQuest=claimed&&state.world.claimedRewards.includes('chest:warden-cache')?`<div class="divider"></div><h3>잿불 수문소 조사</h3><p>${o.adept_commission?(state.character.tier==='adept'?'수문소 보고와 숙련 승급을 마쳤습니다. 새 의뢰와 훈련할 기술을 확인하세요.':'수문핵의 조사 결과를 확인했습니다. 위임장을 가지고 훈련관 브란에게 가면 레벨5부터 숙련 승급을 받을 수 있습니다.'):o.first_dungeon_cleared?'수문핵을 가져왔군요. 조사 결과를 보고하고 숙련 위임장을 받으세요.':o.sluice_accepted?'감시자 뒤의 수문소 입구에서 열쇠를 확인합니다. 상층 기록을 읽고 손잡이를 찾아 수문을 복구하세요. 하층의 독립 승강기를 고치면 마을로 쉽게 돌아올 수 있습니다.':'감시자 보급품에 수문소 기록이 있었습니다. 열쇠를 드릴 테니 두 층의 수문을 복구하고 핵을 회수해 주세요. 특정 장비 구매는 필요하지 않습니다.'}</p><p class="minor">최종 보고: 경험치90 · 금화60 · 숙련 위임장. 던전의 처치/발견 보상은 별도입니다.</p>${!o.sluice_accepted?button('수문소 조사와 열쇠 받기','sluice-accept','class="primary"'):o.first_dungeon_cleared&&!o.adept_commission?button('수문핵 조사 결과 보고','sluice-report','class="primary"'):''}`:'';
    const q=quarryElderView(state),quarryQuest=q?`<div class="divider"></div><h3>${esc(q.title)}</h3><p>${esc(q.detail)}</p>${q.action?button(esc(q.label),`quarry-${q.action}`,'class="primary"'):''}`:'';
    const pass=passElderView(state),passQuest=pass?`<div class="divider"></div><h3>${esc(pass.title)}</h3><p>${esc(pass.detail)}</p>${pass.action?button(esc(pass.label),`pass-${pass.action}`,'class="primary"'):''}`:'';
    panel('촌장 에다',`<p>${claimed?esc(campaignGuidance(state).detail):accepted?`척후를 ${kills}/6 처치했군요. 순찰을 마치면 돌아와 주세요. 강한 방패병은 준비 동작을 보고 옆으로 비켜나세요.`:'오래된 잿길에서 순찰대가 돌아오지 않았어요. 길목의 적 여섯을 쓰러뜨리고 소식을 가져와 주세요.'}</p><p class="minor">${claimed?'완료한 첫 순찰 보상(재수령 불가)':'첫 순찰 보상'}: 경험치70 · 금화20 · 철1. 전투 처치 보상은 별도입니다.</p>${nextQuest}${quarryQuest}${passQuest}<div class="buttons">${!accepted?button('순찰 의뢰 받기','accept',state.vitals?'class="primary"':'disabled'):!claimed&&kills>=6?button('순찰 결과 보고','claim','class="primary"'):''}${button('돌아가기','close')}</div>`);
  }else panel('치유사 리아',`<p>마을에서는 잠시 숨을 고르세요. 밖에서는 물약을 아끼고, 적의 붉은 공격 예고에서 벗어나세요.</p><p class="minor">휴식은 무료로 세 자원을 회복합니다. 물약은 체력 최대치의55%를 회복하며 ${esc(keyName('potion'))}로 사용합니다.</p><div class="buttons">${button('휴식하기','rest','class="primary"')}${button('돌아가기','close')}</div>`);
}
function showObjective(){if(!state||!battle||state.world.lifeDown)return;const goal=campaignGuidance(state);if(state.vitals)dispatch({type:'checkpoint',...report()});panel('현재 목표 · '+esc(goal.title),`<p class="pill">안내를 읽는 동안 일시정지</p><p>${esc(goal.detail)}</p><p class="minor">방향은 지역 기준입니다. 화면에서는 북쪽 ↗ · 동쪽 ↘ · 남쪽 ↙ · 서쪽 ↖ 입니다. 이동키는 화면 방향으로 움직입니다.</p>${button('돌아가기','close')}`);}
function showMenu(reason='사용자 요청'){if(!controller)return;pauseReason=typeof reason==='string'?reason:'사용자 요청';if(state.vitals&&!state.world.lifeDown)dispatch({type:'checkpoint',...report()});panel('잿불의 기록',`<p class="pill">일시정지 · ${esc(pauseReason)}</p><p>프로필 <strong>${esc(profile)}</strong> · ${esc(getRegion(state.world.region).name)} · 레벨${state.character.level} · R7a4${candidate?' · 후보 격리 저장':''}</p><p class="minor">처치${state.stats.kills} · 사망${state.stats.deaths} · XP 수입${state.stats.earnedXp} · 금화 수입${state.stats.earnedGold}/지출${state.stats.spentGold}<br>이번 접속: 플레이${Math.floor(displayTime)}초 / 교전${Math.floor(combatTime)}초 / 이동${Math.floor(walkTime)}초 / 메뉴${Math.floor(menuTime)}초 / 진입대기${Math.floor(arrivalWaitTime)}초. 교전과 이동은 중첩 가능합니다.<br>브라우저: ${esc(document.visibilityState)} / 포커스 ${document.hasFocus()?'있음':'없음'} · 전투는 메뉴 중 정지합니다.<br>마지막 blur: ${esc(focusEvents.blurAt)} / visibility: ${esc(focusEvents.visibilityAt)} (${esc(focusEvents.visibilityState)})</p><h3>능력치 · 남은 점수 ${state.character.attributePoints}</h3>${['strength','dexterity','intelligence'].map((k,i)=>`<div class="row"><span>${['힘','민첩','지능'][i]} +${state.character.attributes[k]}</span>${button('+1','attribute:'+k,state.character.attributePoints?'class="small"':'disabled')}</div>`).join('')}<div class="divider"></div>${[['masterVolume','음량'],['screenShake','화면 흔들림'],['flashes','밝은 효과']].map(([k,t])=>`<label class="row">${t}<input type="range" min="0" max="1" step="0.1" value="${state.options[k]}" data-option="${k}"></label>`).join('')}<div class="buttons">${button('계속하기','close','class="primary"')}${button('현재 위치 저장','save')}${button('목표 자세히','objective')}${button('조작 안내','help')}${button('키 설정','controls')}${button('장비 / 소지품','inventory')}${button('저장 후 시작 화면','leave')}</div>`);}
function help(){panel('조작과 전투',`<div class="controls">${Object.keys(ACTIONS).filter(visibleAction).map(a=>`<span>${esc(keyName(a))}: ${ACTIONS[a]}</span>`).join('')}</div><p>마우스로 조준합니다. 적의 몸 위에 커서를 놓으면 금빛 발밑 표식으로 그 적을 조준하고, 빈 바닥은 자유 조준합니다. 기본 공격은 누르는 동안 반복합니다. 망치·돌진·온기·단죄·물약·상호작용은 한 번 누를 때 한 번 시도하며 자동 반복하지 않습니다. 준비된 명시적 기술 입력은 현재 동작의 마지막0.18초 회수 구간에서 한 번 보관해 기본 공격보다 먼저 실행합니다. 조준은 누른 순간에 고정되며 실제 실행 때만 비용을 씁니다. 가드·반대 조준/이동·상호작용·물약·메뉴·사망·지역 이동에는 이 대기를 비웁니다. 너무 이른 입력은 안내하고 예약하지 않습니다. 방패 유지 중에는 기본 공격보다 방어가 우선합니다. 토글 방패는 공격·스킬을 누르거나 메뉴를 열면 해제됩니다. 온기는 자기 중심 치유이며 진입 안전대기를 해제하지 않습니다. 이동 또는 공격으로 전투를 시작한 뒤 사용할 수 있습니다. 지역 이동·재접속에는 진행 중 공격/바닥효과를 취소하지만 이미 소비한 자원과 쿨다운은 유지합니다.</p><p>이동 방향과 조준은 독립적입니다. 돌진 방향은 기본적으로 조준을 따릅니다. 키 설정에서 마지막 이동 방향으로 바꿀 수 있으며 돌진의 비용·충돌·회복 시간은 그대로입니다.</p><p>터치: 왼쪽 방향 패드와 기술 버튼. 화면을 짚으면 조준합니다. 메뉴·브라우저 비활성 중에는 전투와 자원 시간이 멈춥니다.</p><p class="warning">R6 개발 중간 구간입니다. 전사 전체 캠페인·전문가/마스터 승급·고급 장비/접사는 아직 완료되지 않았습니다.</p>${button('키 설정','controls')}${button('돌아가기','menu')}`);}
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
  shop=`<h3>대장장이 · 매입 자금 ${info.vendor.cash}G</h3><p class="minor">판매 재고는 품목별2개이며 이 단계에서는 재입고·되사기가 없습니다. 작업대는 마을 동쪽에 있습니다.</p>${clickable('첫 제작 도구와 재료 받기','award:workshop_supplies',supplies.ok,supplies.reason)}<div class="skills">${Object.values(EQUIPMENT_ITEMS).map(item=>{const q=quote({type:'buyEquipment',baseId:item.id,station:'blacksmith'});return `<article class="skill"><strong>${item.name} · ${slotNames[item.slot]}</strong><p>${statText(item.stats)}</p><p class="minor">영구 요구: 힘${item.requirements.strength} / 민첩${item.requirements.dexterity} / 지능${item.requirements.intelligence}<br>품질 common · 입문 · 재고${info.vendor.stock[item.id]}<br>${q.ok?'':esc(q.reason)}</p>${clickable(`${item.price}G 구매`,'buy:'+item.id,q.ok,q.reason)}</article>`;}).join('')}</div>`;
  if(state.world.objectives.first_dungeon_cleared){const q=quote({type:'receiveEquipmentAward',awardId:'first_dungeon_salvage'});shop+=clickable('수문소 조사 보급 받기','award:first_dungeon_salvage',q.ok,q.reason);}
  if(state.world.claimedRewards.includes('chest:warden-cache')){const q=quote({type:'receiveEquipmentAward',awardId:'warden_cache_gear'});shop+=clickable('감시자 보급 장비 확인','award:warden_cache_gear',q.ok,q.reason);}
 }
 if(station==='workshop')shop=`<h3>제작 작업대</h3><p class="minor">도구는 대장장이에게 한 번 받습니다. 제작·강화는 표시된 금화/재료를 원자적으로 소모합니다. +2와 집중 목걸이 제작은 수문핵 회수 후 열립니다. 둘 다 잿불 조각을 쓰므로 먼저 만들 것을 선택하세요.</p><div class="skills">${Object.values(EQUIPMENT_RECIPES).map(recipe=>{const q=quote({type:'craftItem',recipeId:recipe.id,station:'workshop'}),preview=previewRecipe(state,recipe.id),item=preview.base;return `<article class="skill"><strong>${recipe.name}</strong><p>${recipe.gold}G · ${materialText(recipe.materials)}</p><p>${statText(item.stats)}</p><p class="minor">완성품 영구 요구: 힘${item.requirements.strength} / 민첩${item.requirements.dexterity} / 지능${item.requirements.intelligence}<br>현재 영구 능력치: 힘${preview.currentAttributes.strength} / 민첩${preview.currentAttributes.dexterity} / 지능${preview.currentAttributes.intelligence}</p>${preview.eligibility.ok?'':`<p class="warning">제작해도 지금은 장착할 수 없습니다. ${esc(preview.eligibility.reason)} ${Object.entries(preview.deficits).map(([k,v])=>`${statNames[k]} ${v} 부족`).join(' · ')}</p>`}<p class="minor">${q.ok?'제작 가능':esc(q.reason)}</p>${clickable('제작','craft:'+recipe.id,q.ok,q.reason)}</article>`;}).join('')}</div>`;
 const slots=EQUIPMENT_SLOTS.map(slot=>{const row=info.rows.find(r=>r.instance.id===state.character.equipment[slot]);return `<div class="row"><span>${slotNames[slot]} · ${row?row.base.name+' +'+row.instance.upgradeRank:'훈련용 / 비어 있음'}</span>${row?clickable('해제','unequip:'+slot,town,'안전한 마을에서 변경하세요.') : ''}</div>`;}).join('');
 const rows=info.rows.map(row=>{const instance=row.instance,q=quote({type:'equipItem',itemId:instance.id}),upgrade=quote({type:'upgradeItem',itemId:instance.id,expectedRank:instance.upgradeRank,station:'workshop'}),u=EQUIPMENT_UPGRADES[instance.upgradeRank+1];return `<article class="skill"><strong>${row.base.name} +${instance.upgradeRank} ${row.equipped?'· 장착 중':''}</strong><p>${statText(row.stats)}</p><p class="minor">현재 슬롯 대비 ${statText(row.deltas)}<br>${esc(row.eligibility.ok?'장착 가능':row.eligibility.reason)}</p><div class="buttons">${row.equipped?'':clickable('장착','equip:'+instance.id,town&&q.ok,q.reason)}${station==='blacksmith'?clickable(`${row.sellPrice}G 판매`,'sell:'+instance.id,!row.equipped,'먼저 장착을 해제하세요.'):''}${station==='workshop'?button(u?`+${instance.upgradeRank+1} 강화 · ${u.gold}G / ${materialText(u.materials)}`:'최대 강화','upgrade:'+instance.id,`class="small" data-rank="${instance.upgradeRank}" ${upgrade.ok?'':'disabled'}`):''}</div>${station==='workshop'&&!upgrade.ok?`<p class="minor">${esc(upgrade.reason)}</p>`:''}</article>`;}).join('');
 panel(station==='blacksmith'?'대장장이 오린':station==='workshop'?'제작과 강화':'장비와 소지품',`<p><strong>전사 Lv.${state.character.level} · ${state.gold}G</strong> · 재료 ${materialText(state.inventory.materials)}<br>도구: ${esc(state.inventory.tools.map(id=>id==='smith_tools'?'대장장이 도구':DUNGEON_TOOLS[id]?.name??QUARRY_TOOLS[id]?.name??PASS_TOOLS[id]?.name??id).join(' · ')||'없음')} · 물약 ${state.inventory.consumables.health_potion??0}</p><p class="minor">공격${pools.physicalDamage} / 방어${pools.armor} / 체력${pools.hpMax} / 마나${pools.manaMax} / 기력${pools.staminaMax}<br>아이템 요구는 장비 보너스를 제외한 영구 능력치입니다. 장착으로 자원을 무료 회복하지 않습니다. 장착은 마을에서만 가능합니다.</p>${shop}<h3>일곱 장비 슬롯</h3>${slots}<h3>보유 장비 · ${info.rows.length}개</h3><div class="skills">${rows||'<p>아직 보유 장비가 없습니다.</p>'}</div>${button('돌아가기','close')}`,true);
}
async function equipmentAction(operation){const id='ui-'+crypto.randomUUID();if(await dispatch({type:'equipment',position:{x:battle.p.x,y:battle.p.y},operation:{commandId:id,...operation}})){toast('장비 기록을 저장했습니다.');showEquipment(equipmentStation);}}

function showControls(message=''){
 const c=config(),preset={legacy:'기존 배치 유지',recommended:'추천 배치',custom:'사용자 설정'}[c.preset];
 panel('키 설정',`<p><strong>${preset}</strong> · 이 프로필에만 저장합니다. 기존 저장은 E 상호작용·1 물약을 유지합니다. 추천 배치는 F 상호작용·R 물약입니다. 새 추천 프로필은 숙련 단죄 E·온기 T를 사용합니다. 기존 저장은 새 두 기술이 미지정이며, 습득 후 직접 키를 추가하세요. 지도는 아직 지원하지 않습니다.</p>${message?`<p class="warning" role="status">${esc(message)}</p>`:''}<div class="binding-list">${Object.entries(ACTIONS).filter(([a])=>visibleAction(a)).map(([a,label])=>`<div class="binding-row"><strong>${label}</strong><div>${c.bindings[a].length?'':'<span class="warning">미지정</span>'}${c.bindings[a].map((token,i)=>button(esc(tokenLabel(token)),`bind:${a}:${i}`,'class="small"')+((c.bindings[a].length>1||Object.hasOwn(actionSkill,a))?button('×',`unbind:${a}:${i}`,`class="small" aria-label="${label} ${esc(tokenLabel(token))} 제거"`):'')).join(' ')}${c.bindings[a].length<3?button('+',`bind:${a}:${c.bindings[a].length}`,`class="small" aria-label="${label} 키 추가"`):''}</div></div>`).join('')}</div><label class="row">방패 방식<select data-control-option="blockMode"><option value="hold" ${c.blockMode==='hold'?'selected':''}>누르는 동안</option><option value="toggle" ${c.blockMode==='toggle'?'selected':''}>한 번 눌러 켜기 / 끄기</option></select></label><label class="row">돌진 방향<select data-control-option="chargeDirection"><option value="aim" ${c.chargeDirection==='aim'?'selected':''}>조준 방향 (기존 규칙)</option><option value="movement" ${c.chargeDirection==='movement'?'selected':''}>마지막 이동 방향</option></select></label><p class="minor">키 버튼을 누른 뒤 실제 키 또는 마우스 버튼을 누르세요. 중복 키는 거절합니다. Ctrl/Alt/Meta 조합과 운영체제 단축키는 지원하지 않습니다. Esc는 항상 일시정지하며 키 지정 중에는 취소합니다. 게임패드는 아직 미지원입니다.</p><div class="buttons">${button('추천 배치로 초기화','preset:recommended')}${button('기존 배치로 초기화','preset:legacy')}${button('돌아가기','menu')}</div>`,true);
}
async function applyBinding(token){const pending=captureBinding;if(!pending)return;captureBinding=null;const result=rebindControl(config(),pending.action,pending.index,token);if(!result.ok){showControls(result.reason);return;}if(await dispatch({type:'setControls',controls:result.controls}))showControls('키 설정을 저장했습니다.');else showControls('저장에 실패했습니다. 기존 설정을 유지합니다.');}
function beginBinding(action,index){panel('키 지정',`<p>${ACTIONS[action]}에 쓸 키나 마우스 버튼을 누르세요.</p><p>Esc: 취소 · 보조 마우스 버튼도 지정할 수 있습니다.</p>${button('취소','controls')}`);captureBinding={action,index};}

async function loadProfile(name,start,difficulty='normal'){
  try{const store=createSession(localStorage,navigator.locks,{profile:name,namespace:saveNamespace});controller=createController(store);const loaded=await controller.load();if(!loaded.ok)throw new Error(loaded.reason);let result=loaded;if(start)result=await controller.start({difficulty});if(!result.ok)throw new Error(result.reason);if(!result.state)throw new Error('이 프로필에는 저장이 없습니다. 새 게임을 시작하세요.');gate.resolveLoad(result);profile=name;state=result.state;battle=createBattle(state);router.clear({resetMovement:true});$('hud').hidden=false;modal.hidden=true;paused=false;$('toast').textContent='';noticeUntil=0;input.aim=null;input.pointerScreen=null;displayTime=combatTime=menuTime=walkTime=arrivalWaitTime=0;clearInput();updateHud();if(state.world.lifeDown)showDeath();else if(!state.vitals)toast(`훈련관 브란 가까이 이동해 ${keyName('interact')}를 누르세요.`);
  // Optional audio permission/sample loading must never postpone retry or
  // resume presentation. setEnabled starts audio without awaiting readiness.
  syncAudioOptions();}
  catch(e){showTitle(String(e.message));}
}
function showDeath(){panel('불씨는 아직 남아 있습니다',`<p>쓰러졌습니다. 지금까지 얻은 경험치, 장비와 소지품 및 이미 처치한 적의 기록은 남습니다. 소지 금화의5%를 잃습니다.</p><p class="minor">적 준비 동작은 붉은 범위로 고정됩니다. 방패만 믿기보다 옆으로 피하고 망치를 여러 적에게 겹쳐 맞혀 보세요.</p>${button('마을에서 다시 일어나기','retry','class="primary"')}`);}
function showTitle(error=''){paused=true;clearInput();audio.pause(true);$('hud').hidden=true;battle=null;controller=null;state=null;modal.hidden=false;modal.innerHTML=`<section class="panel"><div class="eyebrow">THE OATH OF EMBERS</div><h1>EMBERWATCH</h1><p class="lede">Reborn · 잿불의 서약</p><span class="pill">R7a4 · 숙련 고갯길 개발 빌드${candidate?' · 공개 QA 후보':''}</span>${candidate?'<p class="warning">공개 테스트 후보 경로입니다. 일반 저장과 별도 공간을 사용합니다. 기존 QA 기록 복사는 원본을 보존하며, 후보 진행을 기본 사이트에 자동 덮어쓰지 않습니다.</p>':''}<p>꺼져 가는 길목에 다시 불을 밝히세요.<br>전사로 훈련하고, 다수의 적을 돌파하며 첫 순찰을 완수합니다.</p>${error?`<p class="warning">${esc(error)}</p>`:''}<label class="row">난이도 <select id="difficulty"><option value="easy">여유롭게</option><option value="normal" selected>보통</option><option value="hard">어려움</option><option value="serious">험난함</option></select></label>${candidate?'':`<div class="buttons">${button('새 게임 · 일반 프로필','new','class="primary"')}${button('일반 프로필 이어하기','continue')}</div>`}<div class="divider"></div><label class="row">격리 QA 프로필 <input id="profile" value="qa-r2-20261009" maxlength="51" aria-label="격리 QA 프로필 이름"></label><div class="buttons">${button('격리 새 게임','qa-new')}${button('격리 이어하기','qa-continue')}</div>${candidate?`${['qa-r5','qa-r6','qa-r7'].includes(saveNamespace)?`<label class="row">QA 원본 공간 <select id="sourceNamespace"><option value="release">기본 사이트 QA</option><option value="qa-r4">이전 R4 후보 QA</option>${['qa-r6','qa-r7'].includes(saveNamespace)?'<option value="qa-r5">이전 R5 후보 QA</option>':''}${saveNamespace==='qa-r7'?'<option value="qa-r6">이전 R6 후보 QA</option>':''}</select></label>`:''}<label class="row">복사할 기존 QA 원본 <input id="sourceProfile" value="qa-r2-live-20261009" maxlength="51" aria-label="복사할 기존 QA 원본 이름"></label><p class="minor">기존 원본을 위의 새 후보 프로필 이름으로 복사합니다. 이미 있는 후보는 덮어쓰지 않습니다.</p>${button('기존 QA 기록을 후보 공간에 복사','candidate-copy')}`:''}<p class="minor">진행은 이 브라우저에 보관되며 다른 기기로 자동 동기화되지 않습니다. 원본0.4.7과 저장 공간이 분리됩니다. 새 게임은 기존 기록을 덮어쓰지 않습니다. 입문 장비·제작과 첫 2층 던전이 연결되어 있습니다. 첫 숙련 승급·25개 노드·채석장에 이어 고갯길 조사가 연결됩니다. L10 고갯길까지 정상 입력으로 검증한 개발판입니다. 전문가·마스터, 반복 원정과 전체 캠페인은 아직 완성되지 않았습니다. 클릭 후 판타지 효과음을 사용하며 메뉴에서 음량을 조절할 수 있습니다.</p></section>`;}
function syncAudioOptions(){audio.setMasterVolume?.(state.options.masterVolume);audio.setEnabled(state.options.masterVolume>0);}
function updateHud(){if(!state||!battle)return;const s=deriveStats(state.character,state).stats,p=battle.p,progress=state.character.xp/(xpForLevel(state.character.level)||1);$('vitals').innerHTML=`<div class="row" style="margin:0"><strong>${state.character.tier==='adept'?'숙련':'입문'} 전사 · Lv.${state.character.level}</strong><span class="gold">${state.gold} G</span></div>${[['health','hp','hpMax'],['mana','mana','manaMax'],['stamina','stamina','staminaMax']].map(([k,a,b])=>`<div class="bar ${k}"><i style="width:${Math.max(0,p[a]/s[b]*100)}%"></i><span>${Math.ceil(p[a])} / ${s[b]}</span></div>`).join('')}<div class="bar xp"><i style="width:${progress*100}%"></i></div><div class="minor">XP ${state.character.xp}/${xpForLevel(state.character.level)} · 기술점수${state.character.skillPoints}</div>`;
 const objective=campaignGuidance(state).title;
 const objectiveHtml=`<strong>${esc(getRegion(state.world.region).name)}</strong><br>${esc(objective)}<br>${button('목표 자세히','objective','class="small objective-detail"')}<br><span class="minor">${esc(keyName('interact'))} 대화 · ${esc(keyName('menu'))} 성장 / 설정</span>`;if(objectiveHtml!==lastObjectiveHtml){$('objective').innerHTML=objectiveHtml;lastObjectiveHtml=objectiveHtml;}
 const entries=[['mace_swing','철퇴',keyName('attack'),'attack'],['righteous_hammer','잿불 망치',keyName('hammer'),'hammer'],['shield_charge','방패 돌진',keyName('charge'),'charge'],['shield_block','방패',keyName('block'),'block'],['lay_on_hands','온기',keyName('heal'),'heal'],['judgement','단죄',keyName('judgement'),'judgement']];
 for(const [id,name,key,action] of entries){const el=$('hotbar').querySelector(`[data-combat="${action}"]`);if(el){const a=s.actions[id],cd=p.cooldowns[id]??0;el.hidden=!visibleAction(action);el.title=key;el.setAttribute('aria-label',`${key} ${name} ${battle.skillIntent?.id===id?'예약':!a.learned?'훈련 필요':cd>.05?cd.toFixed(1)+'초':a.manaCost?'MP '+a.manaCost:a.staminaCost?'기력 '+a.staminaCost:'준비'}`);el.innerHTML=`<b>${esc(tokenLabel(config().bindings[action][0]))}</b>${name}<em>${battle.skillIntent?.id===id?'예약':!a.learned?'훈련 필요':cd>.05?`${cd.toFixed(1)}초`:a.manaCost?`MP ${a.manaCost}`:a.staminaCost?`기력 ${a.staminaCost}`:'준비'}</em>`;el.classList.toggle('active',action==='block'&&p.block);el.classList.toggle('resource-low',a.learned&&(p.mana<a.manaCost||p.stamina<a.staminaCost));}}
 const pot=$('hotbar').querySelector('[data-action="potion"]');if(pot)pot.innerHTML=`<b>${esc(keyName('potion'))}</b>체력 물약<em>${p.potionCooldown>.05?p.potionCooldown.toFixed(1)+'초':(state.inventory.consumables.health_potion??0)+'개'}</em>`;
 $('menuButton').textContent=`메뉴 · ${keyName('pause')}`;
 const boss=battle.enemies.find(e=>e.type==='boss'&&e.active&&e.hp>0);$('boss').innerHTML=boss?`${FOES[boss.kind].name}<div class="bar"><i style="width:${boss.hp/boss.max*100}%"></i></div>`:'';
}
$('hotbar').innerHTML=['attack','hammer','charge','block','heal','judgement'].map(a=>`<button data-combat="${a}"></button>`).join('')+button('물약','potion');
document.addEventListener('click',async e=>{
 if(suppressNextClick){suppressNextClick=false;e.preventDefault();e.stopPropagation();return;}
 const target=e.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
 if(action==='candidate-copy'){if(!candidate)return;const name=$('profile').value;const r=await copyReleaseQaProfile(localStorage,navigator.locks,{sourceProfile:$('sourceProfile').value,targetProfile:name,sourceNamespace:$('sourceNamespace')?.value??'release',targetNamespace:saveNamespace});if(r.ok)await loadProfile(name,false);else showTitle(r.reason);return;}
 if(action==='new'||action==='continue')return loadProfile('main',action==='new',$('difficulty').value);
 if(action.startsWith('qa-'))return loadProfile($('profile').value,action==='qa-new',$('difficulty').value);
 if(gate.blocked&&action!=='reload')return;
 if(action==='objective')return showObjective();if(action==='close')return closePanel();if(action==='menu')return showMenu();if(action==='help')return help();if(action==='controls')return showControls();
 if(action==='pass-accept'||action==='pass-report'){if(await dispatch({type:action==='pass-accept'?'acceptPassQuest':'reportPassQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('pass:')){const [,objectId]=action.split(':');if(await dispatch({type:'interactPass',objectId,...report()}))showPass(objectId);return;}
 if(action==='quarry-accept'||action==='quarry-report'){if(await dispatch({type:action==='quarry-accept'?'acceptQuarryQuest':'reportQuarryQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('quarry:')){const [,objectId,value]=action.split(':');if(await dispatch({type:'interactQuarry',objectId,...(value===undefined?{}:{value:Number(value)}),...report()}))showQuarry(objectId);return;}
 if(action==='sluice-accept'||action==='sluice-report'){if(await dispatch({type:action==='sluice-accept'?'acceptSluiceQuest':'reportSluiceQuest',...report()}))showNpc('elder');return;}
 if(action.startsWith('dungeon:')){const [,objectId,value]=action.split(':');if(await dispatch({type:'interactDungeon',objectId,...(value===undefined?{}:{value:Number(value)}),...report()}))showDungeon(objectId);return;}
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
 if(action.startsWith('unbind:')){const [,a,i]=action.split(':');const r=rebindControl(config(),a,Number(i),null);if(r.ok&&await dispatch({type:'setControls',controls:r.controls}))showControls('키를 제거했습니다.');else showControls(r.reason??'저장에 실패했습니다.');return;}
 if(action.startsWith('preset:')){const name=action.slice(7);panel('키 배치 초기화',`<p>이 프로필의 현재 키와 방패/돌진 옵션을 ${name==='legacy'?'기존':'추천'} 배치로 바꿉니다.</p>${button('적용','apply-preset:'+name)}${button('취소','controls')}`);return;}
 if(action.startsWith('apply-preset:')){if(await dispatch({type:'setControls',controls:controlPreset(action.slice(13))}))showControls('선택한 배치로 저장했습니다.');return;}
 if(action==='reload'){const r=await controller.load();if(!r.ok){toast(r.reason);return;}if(!gate.resolveLoad(r)){toast('복원할 저장을 확인하지 못했습니다.');return;}state=r.state;battle=createBattle(state);router.clear({resetMovement:true});if(state.world.lifeDown)showDeath();else closePanel();return;}
 if(action==='promote-adept'){if(await dispatch({type:'promoteAdept',...report()}))showNpc('trainer');return;}
 if(action==='train'){if(await dispatch({type:'trainStarter',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='accept'){if(await dispatch({type:'acceptPatrol',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='claim'){if(await dispatch({type:'claimReward',rewardId:'watch_patrol',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='rest'){if(await dispatch({type:'rest',position:{x:battle.p.x,y:battle.p.y}}))closePanel();}
 else if(action==='retry'){if(await dispatch({type:'retry'},{rebuild:true}))closePanel();}
 else if(action==='potion')immediateAction('potion');
 else if(action.startsWith('skill:')){const scrollTop=modal.querySelector('.panel')?.scrollTop??0;if(await dispatch({type:'purchaseSkill',skillId:action.slice(6),position:{x:battle.p.x,y:battle.p.y}})){showNpc('trainer');const panel=modal.querySelector('.panel');if(panel)panel.scrollTop=scrollTop;}}
 else if(action.startsWith('attribute:')){if(await dispatch({type:'allocateAttribute',attribute:action.slice(10)}))showMenu();}
 else if(action==='save'||action==='leave'){if(await dispatch({type:'checkpoint',...report()})){if(action==='leave')showTitle();else toast('현재 위치와 자원을 저장했습니다.');}}
});
document.addEventListener('change',async e=>{const option=e.target.dataset.option;if(option){await dispatch({type:'setOption',option,value:Number(e.target.value)});syncAudioOptions();}const control=e.target.dataset.controlOption;if(control){const c=config();c[control]=e.target.value;c.preset='custom';if(await dispatch({type:'setControls',controls:c}))showControls('설정을 저장했습니다.');}});
$('menuButton').onclick=showMenu;$('touchInteract').onclick=()=>immediateAction('interact');
function immediateAction(action){
 if(!action)return;router.consume(action);
 if(action==='pause'){paused&&battle?closePanel():showMenu();return;}
 if(action==='menu'){showMenu();return;}
 if(paused||!battle||state.world.lifeDown)return;
 if(busy){deferredImmediate.offer(action,{now:performance.now(),life:battle.stateLife,region:battle.region});return;}
 deferredImmediate.clear();
 if(action==='interact')interact();
 if(action==='potion'){clearBattleIntent(battle);dispatch({type:'drinkPotion',...report()});}
}
window.addEventListener('keydown',e=>{
 if(captureBinding){e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.code==='Escape'){captureBinding=null;showControls();}else if(e.ctrlKey||e.altKey||e.metaKey)toast('조합키는 지원하지 않습니다.');else applyBinding(e.code);return;}
 // Native UI activation wins over remapped combat; Escape still leaves a dialog.
 if(editableTarget(e.target)||!modal.hidden){clearInput();if(e.repeat&&['Enter','NumpadEnter','Space'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&battle){e.preventDefault();if(!e.repeat)immediateAction('pause');}return;}
 const action=router.down(e.code,config(),{repeat:e.repeat,editable:false,modified:e.ctrlKey||e.altKey||e.metaKey,paused});
 if(action){e.preventDefault();if(['pause','menu','interact','potion'].includes(action))immediateAction(action);else deferredImmediate.clear();}
},true);
window.addEventListener('keyup',e=>router.up(e.code));
document.addEventListener('focusin',e=>{if(editableTarget(e.target))clearInput();});
window.addEventListener('blur',()=>{focusEvents.blurAt=new Date().toISOString();captureBinding=null;clearInput();if(battle&&!paused)showMenu('브라우저 포커스가 벗어남');});
document.addEventListener('visibilitychange',()=>{focusEvents.visibilityAt=new Date().toISOString();focusEvents.visibilityState=document.visibilityState;if(document.hidden){captureBinding=null;clearInput();if(battle&&!paused)showMenu('게임 탭이 숨겨짐');}});
window.addEventListener('mousedown',e=>{if(!captureBinding)return;if(e.target.closest?.('[data-action="controls"]')){captureBinding=null;return;}e.preventDefault();e.stopImmediatePropagation();if(e.ctrlKey||e.altKey||e.metaKey){toast('조합키는 지원하지 않습니다.');return;}suppressNextClick=e.button===0;applyBinding('Mouse'+e.button);},true);
canvas.addEventListener('pointermove',e=>{if(battle){const r=canvas.getBoundingClientRect();input.pointerScreen={x:e.clientX-r.left,y:e.clientY-r.top};}});
canvas.addEventListener('pointerdown',e=>{if(!battle||paused)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){e.preventDefault();const r=canvas.getBoundingClientRect();input.pointerScreen={x:e.clientX-r.left,y:e.clientY-r.top};}});
// Mouse chords emit mousedown/up for every button, unlike pointerdown/up.
canvas.addEventListener('mousedown',e=>{if(!battle||paused)return;e.preventDefault();const action=router.down('Mouse'+e.button,config(),{modified:e.ctrlKey||e.altKey||e.metaKey});if(['pause','menu','interact','potion'].includes(action))immediateAction(action);else deferredImmediate.clear();});
window.addEventListener('mouseup',e=>router.up('Mouse'+e.button));canvas.addEventListener('lostpointercapture',()=>router.releaseMouse());canvas.addEventListener('pointercancel',clearInput);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('auxclick',e=>e.preventDefault());window.addEventListener('auxclick',e=>{if(!modal.hidden)e.preventDefault();},true);modal.addEventListener('contextmenu',e=>e.preventDefault());
for(const el of document.querySelectorAll('[data-combat]')){el.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;deferredImmediate.clear();el.setPointerCapture(e.pointerId);router.virtual(el.dataset.combat,true,config());});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>router.virtual(el.dataset.combat,false,config()));}
for(const el of document.querySelectorAll('[data-move]')){el.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;deferredImmediate.clear();el.setPointerCapture(e.pointerId);router.virtual(el.dataset.move,true,config());});for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>router.virtual(el.dataset.move,false,config()));}

function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}window.addEventListener('resize',resize);resize();
function drawLabels(){const r=getRegion(battle.region),focus=projectWorld(battle.p.x,battle.p.y);ctx.save();ctx.font='12px EmberwatchKorean';ctx.textAlign='center';for(const n of [...r.npcs,...r.portals,...r.objects.filter(o=>['dungeon','quarry','pass'].includes(o.type)&&near(battle.p,o,230)).map(o=>({...o,name:(o.type==='pass'?passObjectView:o.type==='quarry'?quarryObjectView:dungeonObjectView)(state,o).name}))]){const q=projectWorld(n.x,n.y),x=canvas.width*.5+(q.x-focus.x)*ISO.zoom,y=canvas.height*.55+(q.y-focus.y)*ISO.zoom;ctx.fillStyle='#121725cc';ctx.fillRect(x-60,y-74,120,21);ctx.fillStyle=n.to?'#a2d5d3':'#ead09e';ctx.fillText(n.name,x,y-60);}ctx.restore();}
async function loadArt(){const images={motion:{}};const load=(path,set)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{set(image);resolve();};image.onerror=()=>reject(new Error(path));image.src=path;});await Promise.all([...['environment','hero','enemy'].map(k=>load(ART[k].file,i=>images[k]=i)),load(MOTION_ASSETS.hero.file,i=>images.motion.hero=i),load('assets/motion-warrior-axe.png',i=>images.axe=i)]);renderer=createVisualRenderer(ctx,ART,images);await document.fonts.ready;showTitle();}
let hudTimer=0;
function frame(now){const suspended=frameWasSuspended(now,last),dt=frameDelta(now,last);last=now;
 try{
  if(battle&&renderer){
   if(!paused&&(document.hidden||!document.hasFocus()||suspended)){showMenu(document.hidden?'게임 탭이 숨겨짐':!document.hasFocus()?'브라우저 포커스가 벗어남':'화면 처리가 0.5초 이상 중단됨');}
   const deferred=deferredImmediate.flush({now:performance.now(),life:battle.stateLife,region:battle.region,busy,paused,blocked:gate.blocked,lifeDown:state.world.lifeDown||battle.p.hp<=0,focused:document.hasFocus(),hidden:document.hidden},immediateAction);
   if(deferred.status==='expired')toast('저장 처리가 늦어 입력을 취소했습니다. 다시 눌러 주세요.');
   if(paused)menuTime+=dt;
   if(gate.canStep({hasBattle:!!battle,paused,busy,hidden:document.hidden,focused:document.hasFocus()})){if(battle.awaitingAdvance)arrivalWaitTime+=dt;else displayTime+=dt;const routed=router.snapshot(config()),move=screenMovement(routed.move.x,routed.move.y),lastMove=routed.lastMove?screenMovement(routed.lastMove.x,routed.lastMove.y):null;const chargeAngle=config().chargeDirection==='movement'&&lastMove?Math.atan2(lastMove.y,lastMove.x):undefined;
    const targeting=resolveCursorAim(input.pointerScreen,battle,canvas.width,canvas.height);battle.targetId=targeting.targetId;const aim=targeting.aim??battle.enemies.filter(e=>e.hp>0&&lineOfSight(battle.map,battle.p,e)).sort((a,b)=>Math.hypot(a.x-battle.p.x,a.y-battle.p.y)-Math.hypot(b.x-battle.p.x,b.y-battle.p.y))[0];
    if(battle.awaitingAdvance&&routed.heal&&state.character.skills.lay_on_hands)toast('진입 안전대기 중 · 이동 또는 공격한 뒤 치유를 사용하세요.');
    const events=stepBattle(battle,state.character,dt,{...routed,move,aim,chargeAngle});
    if(battle.enemies.some(e=>e.active&&e.hp>0))combatTime+=dt;if(battle.p.moving)walkTime+=dt;if(!battle.awaitingAdvance)combatSaveElapsed+=dt;
    for(const e of events){if(e.type==='sound')audio.play(e.name);if(e.type==='skillIntentRejected'&&e.reason==='recovery-too-early')toast('현재 동작 진행 중 · 회수 마지막 구간에서 다시 누르세요.');if(e.type==='skillIntentRejected'&&e.reason==='not-ready'&&e.learned)toast(e.cooldown>0?`기술 재사용 대기 · ${e.cooldown.toFixed(1)}초`:e.mana<e.manaCost?`마나 부족 · 필요 ${e.manaCost} / 현재 ${Math.floor(e.mana)}`:e.stamina<e.staminaCost?`기력 부족 · 필요 ${e.staminaCost} / 현재 ${Math.floor(e.stamina)}`:'지금 사용할 수 없습니다.');}
    const checkpoint=combatCheckpoint(battle,events,{elapsed:combatSaveElapsed});if(checkpoint)dispatch(checkpoint,{critical:true}).then(ok=>{if(ok&&state.world.lifeDown)showDeath();});
   }
   const r=getRegion(battle.region),objects=[...r.objects.map(o=>({...o,type:o.type==='dungeon'?({record:'bird',crank:'barrel',rune:'orb',inlet:'shrine',outlet:'shrine',flow:'shrine',lift:'shrine',bell:'relic',core:'relic',store:'chest'}[o.actionKind]):['quarry','pass'].includes(o.type)?(o.visualType??'relic'):o.type,used:['quarry','pass'].includes(o.type)?(o.type==='pass'?passObjectView:quarryObjectView)(state,o).actions.length===0:o.type==='dungeon'&&['crank','core'].includes(o.actionKind)&&dungeonObjectView(state,o).actions.length===0,open:state.world.claimedRewards.includes('chest:'+o.id)||(o.actionKind==='store'&&state.world.claimedRewards.includes('r4:store'))})),...r.npcs.map(o=>({...o,type:'shrine'})),...r.portals.map(o=>({...o,type:o.to==='ash_hamlet'?'return':'exit'}))];
   renderer.render({width:canvas.width,height:canvas.height,map:battle.map,p:battle.p,entities:battle.enemies,objects,shots:battle.shots,effects:battle.effects,floaters:battle.floaters,time:battle.time,shake:battle.shake*state.options.screenShake,reduced:state.options.flashes===0,flashScale:state.options.flashes,stats:battle.stats,classId:'warrior',targetId:battle.targetId,cleanView:true});drawLabels();
   audio.tick(dt,{paused,scene:battle.region==='ash_hamlet'?'town':'dungeon',combat:battle.enemies.some(e=>e.active&&e.hp>0)?1:0});
   const n=nearest(),targeted=battle.enemies.find(e=>e.id===battle.targetId&&e.hp>0);$('hint').textContent=!paused&&battle.skillIntent?`${({shield_charge:'돌진',righteous_hammer:'망치',lay_on_hands:'온기',judgement:'단죄'}[battle.skillIntent.id])} 예약 · 가드/반대 조준/상호작용으로 취소`:battle.awaitingAdvance&&!paused?`이동하거나 공격하면 전투가 시작됩니다 · ${keyName('pause')}로 조작 안내`:!paused&&n?`${keyName('interact')} · ${n.name??'상자 열기'}`:!paused&&targeted?`조준 · ${FOES[targeted.kind].name}`:'';hudTimer+=dt;if(hudTimer>.1){updateHud();hudTimer=0;}
  }
  if(now>noticeUntil){$('toast').classList.remove('visible');$('toast').textContent='';}
 }catch(error){console.error(error);gate.block(error.message);panel('진행을 멈췄습니다',`<p>오류를 기록했습니다. 최근 저장 상태를 다시 불러올 수 있습니다.</p><p class="minor">${esc(error.message)}</p>${button('저장 다시 읽기','reload')}`);}
 requestAnimationFrame(frame);
}
loadArt().catch(error=>{panel('리소스를 불러오지 못했습니다',`<p>${esc(error.message)}</p><p>아트 로드를 확인한 뒤 새로고침하세요. 기본 도형만으로 완성된 게임이라 표시하지 않습니다.</p>`);});requestAnimationFrame(frame);

// Optional read-only WebMCP: visible progression only, never debug mutation.
if(document.modelContext?.registerTool){const life=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'read_emberwatch_status',title:'현재 전사 상태 읽기',description:'화면에 표시되는 현재 레벨, 지역, 자원, 의뢰 진행을 읽습니다. 게임을 조작하거나 저장을 변경하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length)throw new Error('No arguments accepted');return state?{profile,level:state.character.level,xp:state.character.xp,gold:state.gold,region:getRegion(state.world.region).name,kills:state.stats.kills,questKills:state.world.objectives.patrol_scouts??0,paused,version:'R7a4'}:{started:false,version:'R7a4'};}},{signal:life.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>life.abort(),{once:true});}
