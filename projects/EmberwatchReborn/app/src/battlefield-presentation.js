// Pure views for the authored post-Expert route. These helpers grant nothing.
import {BATTLEFIELD_REGION,BATTLEFIELD_REGIONS,BATTLEFIELD_LINKS,BATTLEFIELD_FOES,BATTLEFIELD_GROUPS,BATTLEFIELD_REWARDS,BATTLEFIELD_TACTICS} from './battlefield-content.js';
import {battlefieldEligible,battlefieldInputRevision,battlefieldGroupCleared,battlefieldPortalAllowed} from './battlefield.js';
import {actionLabel,controlsFor} from './controls.js';
const objects=BATTLEFIELD_REGIONS[BATTLEFIELD_REGION].objects;
const alive=state=>!state.world.lifeDown&&state.vitals?.hp>0;
const left=(state,group)=>BATTLEFIELD_GROUPS[group].filter(id=>!(state.world.defeated?.[BATTLEFIELD_REGION]??[]).includes(id)).length;
const result=(id,title,detail)=>({id,title,detail});
const supplyNames={iron:'철',wood:'목재',thread:'실',ember_shard:'잿불 조각',health_potion:'체력 물약'};
const reward=stage=>{const r=BATTLEFIELD_REWARDS['r11:b:'+stage];return [`경험치 ${r.xp}`,`금화 ${r.gold}`,...Object.entries({...r.materials,...r.consumables}).map(([id,n])=>`${supplyNames[id]} ${n}`)].join(' · ');};
export const BATTLEFIELD_CONTINUATION_NOTICE='3장 보고를 마쳤습니다. 에다의 황야 조사로 이어집니다. Master 훈련·황야 이후 지역·최종 결말은 아직 구현 중이며 캠페인 전체 완료가 아닙니다.';
export const BATTLEFIELD_REENTRY_NOTICE='완료한 장치·처치·보상은 유지됩니다. 살아남은 적은 재입장 때 처음 체력과 위치로 돌아옵니다. 원정 초기화나 반복 보상은 제공하지 않습니다.';
const directions='지역 북쪽은 화면 오른쪽 위, 동쪽은 오른쪽 아래, 남쪽은 왼쪽 아래, 서쪽은 왼쪽 위입니다.';
const common=(state,text)=>`${text} ${directions} 상호작용(${actionLabel(controlsFor(state),'interact')}) 또는 화면 버튼으로 조작하세요.`;
/** Capture the revision when the panel opens. Append only live report fields;
 * never copy reward/tactic/view data into a command or refresh the token. */
export function battlefieldCommandFields(action){
 if(!action||!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0)return null;
 const fields={type:action.type,expectedRevision:action.expectedRevision};
 if(['acceptBattlefieldQuest','reportBattlefieldQuest'].includes(action.type))return fields;
 if(action.type!=='interactBattlefield'||!objects.some(o=>o.id===action.objectId))return null;
 return {...fields,objectId:action.objectId};
}
export function battlefieldObjectView(state,candidate){
 const object=objects.find(row=>candidate?.type==='battlefield'&&row.id===candidate.id);
 if(!object)return {name:candidate?.name??'알 수 없는 장치',detail:'사용할 수 없는 대상입니다.',actions:[],completed:false};
 const o=state.world.objectives,side=object.actionKind,isDevice=['west','east'].includes(side);
 const completed=!!o[isDevice?'battlefield_'+side+'_ready':'battlefield_beacon_taken'];
 const ready=isDevice?battlefieldGroupCleared(state,side):!!o.battlefield_devices_ready&&battlefieldGroupCleared(state,'boss');
 let detail;
 if(isDevice)detail=completed?`중계기를 연결했고 보상은 이미 받았습니다. ${o.battlefield_devices_ready?'두 중계기가 모두 연결되어 가운데 북쪽 봉화 단상으로 가는 길이 열렸습니다.':'다른 쪽 중계기의 적을 처치하고 연결하세요.'}`:`${ready?'여섯 명을 모두 처치했습니다. 아래 버튼으로 중계기를 연결하세요.':`${side==='west'?'서쪽':'동쪽'} 적 ${left(state,side)}/6명 남음. 여섯 명을 모두 처치하면 바로 연결할 수 있습니다.`} 어느 쪽부터 해도 되며 대기 시간·재료 비용·필수 전문 기술은 없습니다. ${BATTLEFIELD_TACTICS[side].hint} 보상: ${reward(side)}.`;
 else detail=completed?`봉화핵을 이미 회수했고 보상도 받았습니다. ${o.battlefield_reported?BATTLEFIELD_CONTINUATION_NOTICE:'북동쪽 귀환문으로 마을 촌장 에다에게 보고하세요.'}`:`두 중계기를 연결하고 봉화 탈취자를 처치한 뒤 따로 회수하세요. 보스 처치만으로 회수되거나 보고되지는 않습니다. 보상: ${reward('beacon')}. 봉화핵은 비소모 회수물입니다.`;
 if(!alive(state))detail+=' 쓰러진 상태에서는 조작할 수 없습니다. 재시도 후 이어가세요.';
 return {name:object.name+(completed?' · 완료':''),detail:common(state,detail),completed,actions:battlefieldEligible(state)&&alive(state)&&o.battlefield_accepted&&ready&&!completed?[{type:'interactBattlefield',objectId:object.id,label:isDevice?'중계기 연결':'봉화핵 회수',expectedRevision:battlefieldInputRevision(state)}]:[]};
}
export function battlefieldGuidance(state){
 if(!battlefieldEligible(state))return null;
 const o=state.world.objectives;let goal;
 if(o.battlefield_reported)goal=result('battlefield-complete','3장 · 봉화 보고 완료',BATTLEFIELD_CONTINUATION_NOTICE);
 else if(!o.battlefield_accepted)goal=result('battlefield-accept','에다에게 봉화 전장 의뢰 받기','전문 승급을 마쳤습니다. 마을 촌장 에다에게 양쪽 중계기와 봉화 탈취자 조사를 받으세요. 특정 전문 기술 구매는 필요하지 않습니다.');
 else if(!o.battlefield_devices_ready){
  const sides=['west','east'].filter(side=>!o['battlefield_'+side+'_ready']);
  goal=result('battlefield-devices',`중계기 연결 ${2-sides.length}/2`,sides.map(side=>`${side==='west'?'서쪽 방벽':'동쪽 조준'} 중계기: ${left(state,side)?`적 ${left(state,side)}/6명 처치 후 연결`:'적 처치 완료, 장치를 직접 연결'}.`).join(' ')+' 두 구역은 어느 순서로든 진행할 수 있습니다. 남쪽 길로 서로 오갈 수 있습니다.');
 }else if(!battlefieldGroupCleared(state,'boss'))goal=result('battlefield-boss','봉화 탈취자 처치','입구에서 가운데 북쪽 길로 봉화 단상에 오르세요. '+BATTLEFIELD_TACTICS.boss.hint);
 else if(!o.battlefield_beacon_taken)goal=result('battlefield-beacon','봉화핵 따로 회수','보스는 처치했습니다. 봉화 단상 북쪽의 봉화핵을 직접 회수한 뒤 에다에게 보고하세요.');
 else goal=result('battlefield-report','마을 에다에게 봉화핵 보고',`봉화핵을 확보했습니다. ${state.world.region===BATTLEFIELD_REGION?'단상 북동쪽 귀환문 또는 남쪽 입구로 마을에 돌아가':'마을로 돌아가'} 촌장 에다에게 보고하세요. 보상: ${reward('report')}.`);
 if(o.battlefield_accepted&&!o.battlefield_reported&&!o.battlefield_beacon_taken&&state.world.region!==BATTLEFIELD_REGION)goal={...goal,detail:`${state.world.region==='ash_hamlet'?'마을 북쪽 빈터의 봉화 전장 입구':'현재 출구로 마을에 돌아간 뒤 북쪽 빈터의 봉화 전장 입구'}로 이동하세요. 전장에서 할 일: ${goal.detail}`};
 if(!alive(state))goal={...goal,detail:'먼저 재시도한 뒤 이어가세요. '+goal.detail};
 return {...goal,detail:common(state,goal.detail)};
}
export function battlefieldElderView(state){
 if(!battlefieldEligible(state))return null;
 const o=state.world.objectives,base={npcId:'elder',expectedRevision:battlefieldInputRevision(state)};
 if(o.battlefield_reported)return {...base,title:'봉화 전장 · 에다 보고 완료',detail:`보고 보상은 이미 받았습니다. ${BATTLEFIELD_CONTINUATION_NOTICE}`,action:null,label:''};
 if(!alive(state))return {...base,title:'봉화 전장 · 재시도 후 대화',detail:'먼저 재시도한 뒤 수락하거나 보고하세요.',action:null,label:''};
 if(!o.battlefield_accepted)return {...base,title:'전문 의뢰 · 갈라진 봉화 전장',detail:'양쪽 중계기의 적을 처치하고 두 장치를 연결해 주세요. 봉화 탈취자를 처치한 뒤 봉화핵을 따로 회수해서 제게 보고해야 합니다. 두 장치는 어느 순서로든 가능합니다. 특정 기술·장비·재료·입장료는 필요하지 않습니다.',action:'accept',type:'acceptBattlefieldQuest',label:'봉화 전장 의뢰 수락'};
 if(o.battlefield_beacon_taken)return {...base,title:'에다에게 봉화핵 보고',detail:`${reward('report')}을 한 번 받고 3장 보고를 마칩니다. 봉화핵은 소모되지 않습니다. Master 승급이나 최종 결말을 뜻하지 않습니다.`,action:'report',type:'reportBattlefieldQuest',label:'에다에게 봉화핵 보고'};
 return {...base,title:'봉화 전장 조사 진행 중',detail:battlefieldGuidance(state).detail,action:null,label:''};
}
export function battlefieldPortalView(state,candidate){
 const id=typeof candidate==='string'?candidate:candidate?.id,portal=[...BATTLEFIELD_LINKS.ash_hamlet,...BATTLEFIELD_REGIONS[BATTLEFIELD_REGION].portals].find(p=>p.id===id);if(!portal)return null;
 const gate=battlefieldPortalAllowed(state,portal),missing=portal.id==='battlefield-boss-return'&&!state.world.objectives.battlefield_beacon_taken;
 return {id:portal.id,name:portal.name+(missing?' · 봉화핵 미회수':''),allowed:gate.ok&&alive(state),detail:!alive(state)?'재시도 후 이동하세요.':!gate.ok?gate.reason:`지역 전환 자체는 현재 HP·MP·기력과 남은 쿨다운을 회복하지 않습니다. 일반 보행 시간에는 정상 재생과 쿨다운 감소가 적용됩니다.${missing?' 봉화핵을 아직 회수하지 않았습니다. 단상 북쪽에서 따로 회수하세요.':''}`};
}
export const battlefieldPortalLabel=(state,candidate)=>battlefieldPortalView(state,candidate)?.name??candidate?.name??'';
export function battlefieldPresentationHints(){
 return {roleShapes:Object.fromEntries(Object.entries(BATTLEFIELD_FOES).map(([id,f])=>[id,f.roleGlyph])),foeLabels:Object.fromEntries(Object.entries(BATTLEFIELD_FOES).map(([id,f])=>[id,{name:f.name,undead:f.tags.includes('undead'),attackFamilies:[...new Set(f.patterns.map(p=>p.attackFamily))],statusRuleIds:[...new Set(f.patterns.flatMap(p=>p.statusRuleIds))]}])),tactics:BATTLEFIELD_TACTICS,reentry:BATTLEFIELD_REENTRY_NOTICE};
}
export function battlefieldEventCopy(event){
 if(event?.type==='battlefieldDeviceReady')return `${event.side==='west'?'서쪽':'동쪽'} 중계기를 연결했습니다. ${event.both?'가운데 북쪽 봉화 단상으로 가는 길이 열렸습니다.':'다른 쪽 중계기도 연결하세요.'}`;
 if(event?.type==='battlefieldBeaconTaken')return '봉화핵을 회수했습니다. 귀환문으로 마을 촌장 에다에게 보고하세요.';
 if(event?.type==='chapterThreeCompleted')return BATTLEFIELD_CONTINUATION_NOTICE;
 return '';
}
