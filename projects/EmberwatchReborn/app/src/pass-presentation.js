// Read-only views of durable progress. All values are authored Emberwatch data.
import {PASS_GROUPS,PASS_SEQUENCE,PASS_RUNE_NAMES} from './pass-content.js';
import {passTierAllowed} from './pass.js';
const eligible=state=>passTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.quarry_reported===1&&['r4:report','r5:promote:adept','r6:q:report'].every(id=>state.world.claimedRewards.includes(id));
const result=(id,title,detail)=>({id,title,detail});
const left=(state,group)=>PASS_GROUPS[group].filter(id=>!(state.world.defeated?.ashwind_pass??[]).includes(id)).length;
const order='바람 → 불꽃 → 돌';
const positions='바람은 북서쪽, 불꽃은 북동쪽, 돌은 남서쪽 신호대';
const status=o=>`정렬 ${o.pass_signal_step??0}/3. ${o.pass_signal_aligned?'세 신호 연결 완료.':`다음은 ${PASS_RUNE_NAMES[PASS_SEQUENCE[o.pass_signal_step??0]]}.`}`;
function signalPrerequisites(state){
 const o=state.world.objectives,remaining=left(state,'signal');
 if(!o.pass_rescue_complete)return `${o.pass_clue_read?'길잡이 구조':'비문 확인과 길잡이 구조'}가 필요합니다. 신호대 적 ${remaining}/${PASS_GROUPS.signal.length}명이 남았습니다.`;
 if(remaining)return `길잡이 구조 완료. 신호대에 남은 적 ${remaining}/${PASS_GROUPS.signal.length}명을 처치하세요.`;
 return '길잡이 구조·신호대 전투 완료. 신호를 맞출 수 있습니다.';
}
const completedDetail='비문 확인, 길잡이 구조와 신호 정렬을 에다에게 보고했고 고갯길 보고 보상은 이미 받았습니다. 다음 조사인 신호 복원·용광로·신호 묘실·전문가 승급·봉화 전장·황야 조사까지 연결되어 있습니다. 달인 승급과 전체 캠페인 결말은 아직 구현되지 않았습니다.';
export function passObjectView(state,object){
 const o=state.world.objectives,view=(name,detail,label,done)=>({name,detail,actions:done?[]:[{label}]});
 switch(object.actionKind){
  case 'clue':return view(o.pass_clue_read?'신호 비문 · 사본 보관 중':'먼 서쪽의 신호 비문 읽기',`비문: “바람이 불꽃을 깨우고, 불꽃이 돌을 밝힌다.” 순서는 ${order}입니다. ${positions}입니다. 첫 확인은 서쪽 적 다섯 명 처치 후 경험치80·금화10·비소모 사본을 줍니다. 다시 읽기는 무료이며 보상은 반복되지 않습니다.`,o.pass_clue_read?'비문 다시 읽기':'비문 확인',false);
  case 'rescue':return view(o.pass_rescue_complete?'길잡이 · 구조 완료':'고립된 길잡이 구조',o.pass_rescue_complete?'구조가 끝났습니다. 북쪽 신호대 길이 열려 있습니다. 아래쪽 귀환 밧줄길을 연결하면 마을과 바로 왕복할 수 있습니다. 구조 보상은 이미 받았습니다.':'비문 확인 후 구조 구역 적 다섯 명을 처치하세요. 구조 보상은 경험치90·금화20입니다. 북쪽 신호대 길이 열리고, 남동쪽 밧줄길을 무료로 연결해 마을과 왕복할 수 있습니다.','길잡이 구조',o.pass_rescue_complete);
  case 'signal':return view(`${PASS_RUNE_NAMES[object.rune]} 신호 장치${o.pass_signal_aligned?' · 정렬 완료':''}`,o.pass_signal_aligned?`세 신호의 정렬이 완료되었습니다: ${order}. 정렬 보상은 이미 받았습니다. ${o.pass_reported?'마을 보고까지 마쳤습니다.':'마을 에다에게 돌아가 조사 결과를 보고하세요.'}`:`비문 순서: ${order}. ${positions}입니다. ${status(o)} ${signalPrerequisites(state)} 순서가 틀리면 0/3으로 돌아가며 금화·재료를 잃지 않습니다. 마지막 돌 신호가 경험치130·금화40·철3·목재3·실2·잿불 조각1·물약1을 한 번 줍니다.`,`${PASS_RUNE_NAMES[object.rune]} 신호 맞추기`,o.pass_signal_aligned);
  case 'shortcut':return view(o.pass_shortcut_open?'귀환 밧줄길 · 연결 완료':'귀환 밧줄길 연결',o.pass_shortcut_open?'마을과 연결되었습니다. 옆 귀환문에서 상호작용하면 마을로 돌아갑니다. 이동은 자원이나 쿨다운을 초기화하지 않습니다.':'길잡이를 구조하면 신호대 전투·정렬 전에 연결할 수 있습니다. 마을과 이 구조 구역을 직접 왕복합니다. 비용·보상·자원 회복이 없고, 신호 정렬이나 보고의 필수 조건도 아닙니다.','밧줄길 연결',o.pass_shortcut_open);
  default:return {name:object.name,detail:'사용할 수 없는 대상입니다.',actions:[]};
 }
}
export function passGuidance(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(!o.pass_accepted)return result('pass-accept','촌장 에다에게 고갯길 조사 받기','채석장 보고를 마쳤습니다. 에다에게 다음 조사를 받은 뒤 마을 서쪽의 고갯길 입구로 가세요. 특정 숙련 기술·장비·입장료는 필요하지 않습니다.');
 if(!o.pass_clue_read)return result('pass-clue','서쪽 고갯길 정리 · 북쪽 비문 확인',`입구의 적 ${left(state,'entry')}명을 처치한 뒤 서쪽 길을 북쪽 끝까지 올라 신호 비문을 확인하세요. 선봉장의 원형 전조에서는 밖으로, 부채꼴 전조에서는 옆으로 피하세요.`);
 if(!o.pass_rescue_complete)return result('pass-rescue','남동쪽 구조 구역 · 길잡이 구조',`비문 사본: ${order}. 입구 쪽으로 내려와 열린 동쪽 통로를 건너세요. 구조 구역 적 ${left(state,'rescue')}명을 처치한 뒤 북동쪽 길잡이를 구하세요.`);
 if(!o.pass_signal_aligned&&!o.pass_shortcut_open)return result('pass-shortcut','남동쪽 귀환 밧줄길 연결 · 선택',`길잡이 아래쪽 밧줄길을 무료로 연결하면 신호대 전투 전 마을과 바로 왕복합니다. 원한다면 북쪽 신호대로 바로 가도 됩니다. 비문 사본: ${order}. ${status(o)}`);
 if(left(state,'signal'))return result('pass-guards','북쪽 신호대 정리',`북동쪽 통로로 올라가 적 ${left(state,'signal')}명을 처치하세요. 중앙 바위의 양쪽 길로 사수의 조준선을 끊을 수 있습니다. 비문 사본: ${order}. ${status(o)}`);
 if(!o.pass_signal_aligned)return result('pass-signals','세 신호를 비문 순서로 정렬',`${order}. ${positions}입니다. ${status(o)} 잘못 누르면 정렬만 0/3으로 돌아갑니다. 부분 정렬은 마을 왕복·저장·사망 후에도 남습니다.`);
 if(!o.pass_reported)return result('pass-report','마을 촌장 에다에게 고갯길 조사 보고','세 신호가 연결되었습니다. 밧줄길 또는 서쪽 입구로 마을에 돌아가 에다에게 보고하면 경험치90·금화60을 한 번 받습니다. 다음 레벨이나 지름길 개방은 보고 조건이 아닙니다.');
 return result('pass-complete','고갯길 조사 완료',completedDetail);
}
export function passElderView(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(!o.pass_accepted)return {title:'새 조사 · 잿바람 고갯길',detail:'고갯길의 길잡이가 고립되고 신호가 끊겼습니다. 마을 서쪽 입구로 가서 먼 비문을 확인하고 길잡이를 구조한 뒤 세 신호를 순서대로 정렬해 주세요. 수락·필수 진행은 무료입니다.',action:'accept',label:'고갯길 조사 수락'};
 if(o.pass_reported)return {title:'고갯길 조사 · 보고 완료',detail:completedDetail,action:null,label:''};
 if(o.pass_signal_aligned)return {title:'고갯길 조사 결과 보고',detail:'신호 정렬을 보고하면 경험치90·금화60을 한 번 받습니다. 추가 레벨·비용·선택 지름길은 요구하지 않습니다.',action:'report',label:'고갯길 조사 보고'};
 return {title:'고갯길 조사 진행 중',detail:passGuidance(state).detail,action:null,label:''};
}
