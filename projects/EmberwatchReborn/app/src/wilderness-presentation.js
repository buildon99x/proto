// Read-only views for the detached W runtime. Parent must not mount these as
// available gameplay before world/state/controller/save integration is verified.
import {WILDERNESS_REGION,WILDERNESS_REGIONS,WILDERNESS_LINKS,WILDERNESS_GROUPS,WILDERNESS_REWARDS,WILDERNESS_MODES,WILDERNESS_GLYPHS,WILDERNESS_FOES,WILDERNESS_TACTICS} from './wilderness-content.js';
import {wildernessEligible,wildernessInputRevision,wildernessGroupCleared,wildernessPortalAllowed,wildernessClue} from './wilderness.js';
const objects=WILDERNESS_REGIONS[WILDERNESS_REGION].objects;
const storeContext=context=>context&&Number.isSafeInteger(context.revision)&&context.revision>=0;
const alive=s=>!s.world.lifeDown&&s.vitals?.hp>0;
const left=(s,g)=>WILDERNESS_GROUPS[g].filter(id=>!(s.world.defeated?.[WILDERNESS_REGION]??[]).includes(id)).length;
const rewards=id=>{const r=WILDERNESS_REWARDS['r12:w:'+id];return `경험치 ${r.xp} · 금화 ${r.gold}`;};
export const WILDERNESS_CONTINUATION_NOTICE='황야 조사를 에다에게 보고했습니다. 다음 담당은 대장장이 오린입니다. 수리소·후속 제작 선택은 아직 구현 준비 중이며 지금 수락하거나 구매할 수 없습니다. Master 훈련이나 캠페인 결말은 완료되지 않았습니다.';
export const WILDERNESS_REENTRY_NOTICE='완료한 조사·장치·처치·보상은 유지됩니다. 지역 전환 자체는 자원이나 재사용 대기를 회복하지 않습니다. 살아남은 적의 전투 재구성과 일반 보행 중 정상 재생은 기존 규칙을 따릅니다.';
export function wildernessCommandFields(action){
 if(!action||!Number.isSafeInteger(action.expectedStoreRevision)||action.expectedStoreRevision<0||!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0)return null;
 const base={type:action.type,expectedRevision:action.expectedRevision,expectedStoreRevision:action.expectedStoreRevision};
 if(['acceptWildernessQuest','reportWildernessQuest'].includes(action.type))return base;
 if(action.type!=='interactWilderness')return null;const o=objects.find(o=>o.id===action.objectId);if(!o)return null;
 if(o.actionKind==='glyph'&&(!Number.isInteger(action.expectedStep)||action.expectedStep<0||action.expectedStep>3))return null;
 if(o.actionKind==='choice'&&!Object.hasOwn(WILDERNESS_MODES,action.choice))return null;
 return {...base,objectId:o.id,...(o.actionKind==='glyph'?{expectedStep:action.expectedStep}:{}),...(o.actionKind==='choice'?{choice:action.choice}:{})};
}
export function wildernessObjectView(s,candidate,context){
 const object=objects.find(o=>candidate?.type==='wilderness'&&candidate.id===o.id);if(!object)return {name:'알 수 없는 장치',detail:'사용할 수 없는 대상입니다.',completed:false,actions:[]};
 const o=s.world.objectives,kind=object.actionKind,flags={survey:'wilderness_surveyed',hook:'wilderness_hook_taken',anchor:'wilderness_anchored',glyph:'wilderness_calibrated',choice:'wilderness_mode',relay:'wilderness_routed',evidence:'wilderness_evidence_taken',scouts:'wilderness_scouts_rescued'};
 const completed=Boolean(o[flags[kind]]),clue=wildernessClue(s);let detail='',ready=false,label='조작';
 switch(kind){
  case 'survey':ready=wildernessGroupCleared(s,'survey');label='측량판 읽고 기록';detail=completed?`${clue.text} 순서: ${clue.sequenceText}. 조사 보상은 이미 받았습니다.`:`측량판 앞 적 ${left(s,'survey')}/3명 남음. 읽으면 단서가 기록에 계속 남습니다. ${rewards('survey')}.`;break;
  case 'hook':ready=!!o.wilderness_surveyed&&wildernessGroupCleared(s,'anchor');label='무료 갈고리 챙기기';detail='닻의 적을 처치한 뒤 무료 신호 갈고리를 챙기세요. 갈고리는 소모되지 않으며 XP·금화는 이 픽업에서 지급하지 않습니다. 이어 옆 닻에 직접 걸어 귀환 다리를 연결하세요.';break;
  case 'anchor':ready=!!o.wilderness_hook_taken;label='갈고리를 닻에 걸기';detail=`갈고리를 소모하지 않고 귀환 다리를 연결합니다. 연결 즉시 마을로 돌아가거나 재진입할 수 있습니다. 추가 적·퍼즐·재료·대기 시간은 없습니다. ${rewards('anchor')}.`;break;
  case 'glyph':ready=!!o.wilderness_anchored&&wildernessGroupCleared(s,'receiver');label=WILDERNESS_GLYPHS[object.glyph]+' 수신판 누르기';detail=`${clue?clue.text:'측량판의 단서를 먼저 기록하세요.'} 입력 ${o.wilderness_sequence_step??0}/3. 틀리면 미완료 입력만 0으로 돌아갑니다. 완료 보상 ${rewards('calibrate')}.`;break;
  case 'choice':ready=!!o.wilderness_calibrated;detail='다음 네 적과 싸우기 전에 한 번 선택합니다. 비용·보상은 없으며 선택 후 되돌릴 수 없습니다. 두 선택 모두 양옆 퇴로와 같은 네 적·보상을 유지합니다.';break;
  case 'relay':ready=!!o.wilderness_mode&&wildernessGroupCleared(s,'relay');label='신호 중계 연결';detail=`먼저 엄폐판을 고르고 네 적을 처치한 뒤 직접 연결하세요. 적 ${left(s,'relay')}/4명 남음. ${rewards('relay')}.`;break;
  case 'evidence':ready=wildernessGroupCleared(s,'boss');label='신호 기록핵 회수';detail=`보스 처치와 별도로 기록핵을 회수해야 합니다. 귀환문은 보스 처치 직후 열리지만 기록핵 없이 에다에게 보고할 수 없습니다. ${rewards('evidence')}.`;break;
  case 'scouts':ready=!!o.wilderness_evidence_taken&&wildernessGroupCleared(s,'scouts');label='정찰대 구조 마무리';detail=`선택 구조입니다. 남은 적 ${left(s,'scouts')}/4명. 모두 처치한 뒤 네리와 구조를 마무리하세요. 에다 보고에는 필요 없으며 보고 후에도 돌아올 수 있습니다. ${rewards('scouts')}.`;break;
 }
 if(completed&&kind!=='survey')detail=kind==='hook'?'갈고리를 이미 챙겼습니다. 비소모 도구를 보관 중입니다.':kind==='choice'?`현재 선택: ${Object.values(WILDERNESS_MODES).find(m=>m.value===o.wilderness_mode)?.name}. 선택은 저장되어 유지됩니다.`:kind==='glyph'?`수신판 조정 완료. ${clue.sequenceText}. 보상은 이미 받았습니다.`:'이미 완료했고 해당 보상은 다시 지급되지 않습니다. '+(kind==='evidence'?'에다에게 보고하세요.':'');
 const base={type:'interactWilderness',objectId:object.id,expectedRevision:wildernessInputRevision(s),...(storeContext(context)?{expectedStoreRevision:context.revision}:{})};
 const enabled=storeContext(context)&&wildernessEligible(s)&&alive(s)&&!!o.wilderness_accepted&&ready&&!completed;
 const actions=!enabled?[]:kind==='choice'?Object.entries(WILDERNESS_MODES).map(([choice,m])=>({...base,choice,label:m.name,detail:m.detail})):[{...base,label,...(kind==='glyph'?{expectedStep:o.wilderness_sequence_step}:{})}];
 return {name:object.name+(completed?' · 완료':''),detail:detail+(!alive(s)?' 먼저 재시도 후 이어가세요.':''),completed,actions};
}
export function wildernessGuidance(s){
 if(!wildernessEligible(s))return null;const o=s.world.objectives;let title,detail;
 if(o.wilderness_reported){title='에다에게 황야 보고 완료';detail=WILDERNESS_CONTINUATION_NOTICE;}
 else if(!o.wilderness_accepted){title='에다에게 황야 조사 받기';detail='봉화 전장 보고를 마쳤습니다. 에다의 황야 조사를 수락하세요. 새 기술 구매나 입장료는 필요 없습니다.';}
 else if(!o.wilderness_surveyed){title='측량판 조사';detail=WILDERNESS_TACTICS.survey;}
 else if(!o.wilderness_hook_taken){title='닻의 적을 처치하고 무료 갈고리 챙기기';detail=WILDERNESS_TACTICS.anchor;}
 else if(!o.wilderness_anchored){title='갈고리를 닻에 직접 걸기';detail='갈고리는 이미 있습니다. 귀환 닻을 조작하면 다리가 즉시 열립니다.';}
 else if(!o.wilderness_calibrated){title='수신판 조정';detail=WILDERNESS_TACTICS.receiver+' '+wildernessClue(s).sequenceText+` · 입력 ${o.wilderness_sequence_step}/3.`;}
 else if(!o.wilderness_mode){title='다음 교전 전에 엄폐판 선택';detail=WILDERNESS_TACTICS.relay;}
 else if(!o.wilderness_routed){title='네 적 처치 후 신호 중계 연결';detail=WILDERNESS_TACTICS.relay;}
 else if(!o.wilderness_keeper_open){title='신호지기 앞 네 적 돌파';detail=WILDERNESS_TACTICS.approach;}
 else if(!wildernessGroupCleared(s,'boss')){title='갈라진 신호지기 처치';detail=WILDERNESS_TACTICS.boss;}
 else if(!o.wilderness_evidence_taken){title='신호 기록핵 따로 회수';detail='보스 단상의 기록핵을 직접 챙기세요. 퇴로는 열렸지만 에다 보고에는 기록핵이 필요합니다.';}
 else{title='마을 에다에게 기록핵 보고';detail='단상 귀환문으로 에다에게 바로 돌아가세요. 선택 정찰대 구조는 생략하거나 나중에 할 수 있습니다. '+rewards('report')+'.';}
 if(o.wilderness_accepted&&!o.wilderness_reported&&!o.wilderness_evidence_taken&&s.world.region!==WILDERNESS_REGION)detail=(s.world.region==='ash_hamlet'?'':'현재 출구로 마을에 돌아온 뒤 ')+(o.wilderness_anchored?'훈련관 브란 위쪽의 황야 닻다리 또는 마을 북서쪽 신호 황야 입구로 돌아가세요. ':'마을 북서쪽의 신호 황야 입구로 가세요. ')+detail;
 return {title,detail:(!alive(s)?'먼저 재시도 후 이어가세요. ':'')+detail};
}
export function wildernessElderView(s,context){
 if(!wildernessEligible(s))return null;const o=s.world.objectives,base={npcId:'elder',expectedRevision:wildernessInputRevision(s),...(storeContext(context)?{expectedStoreRevision:context.revision}:{})};
 if(o.wilderness_reported)return {...base,title:'황야 보고 완료',detail:WILDERNESS_CONTINUATION_NOTICE,action:null};
 if(!storeContext(context))return {...base,title:'현재 저장 상태 확인 필요',detail:'최신 저장 상태가 확인된 뒤 조작할 수 있습니다.',action:null};
 if(!alive(s))return {...base,title:'재시도 후 에다와 대화',detail:'먼저 재시도한 뒤 수락하거나 보고하세요.',action:null};
 if(!o.wilderness_accepted)return {...base,title:'갈라진 신호 황야 조사',detail:'측량 기록과 무료 갈고리로 신호를 잇고, 신호지기 처치 후 기록핵을 따로 회수해 제게 보고하세요. 선택 구조는 보고 조건이 아닙니다.',type:'acceptWildernessQuest',action:'accept',label:'황야 조사 수락'};
 if(o.wilderness_evidence_taken)return {...base,title:'에다에게 황야 기록핵 보고',detail:rewards('report')+'. 기록핵은 소모되지 않습니다. 다음 담당은 오린이지만 후속 의뢰는 아직 구현 준비 중입니다.',type:'reportWildernessQuest',action:'report',label:'에다에게 기록핵 보고'};
 return {...base,title:'황야 조사 진행 중',detail:wildernessGuidance(s).detail,action:null};
}
export function wildernessPortalView(s,candidate){const id=typeof candidate==='string'?candidate:candidate?.id,p=[...WILDERNESS_LINKS.ash_hamlet,...WILDERNESS_REGIONS[WILDERNESS_REGION].portals].find(p=>p.id===id);if(!p)return null;const gate=wildernessPortalAllowed(s,p),missing=p.id==='wilderness-keeper-return'&&!s.world.objectives.wilderness_evidence_taken;return {id:p.id,name:p.name+(missing?' · 기록핵 미회수':''),allowed:gate.ok,detail:gate.ok?WILDERNESS_REENTRY_NOTICE+(missing?' 기록핵을 먼저 회수하면 에다에게 바로 보고할 수 있습니다.':''):gate.reason};}
export function wildernessPresentationHints(){return {foes:Object.fromEntries(Object.entries(WILDERNESS_FOES).map(([id,f])=>[id,{name:f.name,roleGlyph:f.roleGlyph,undead:f.tags.includes('undead'),attackFamilies:[...new Set(f.patterns.map(p=>p.attackFamily))]}])),tactics:WILDERNESS_TACTICS,reentry:WILDERNESS_REENTRY_NOTICE};}
