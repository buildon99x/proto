// Read-only views of the authored Furnace route. Durable runtime progress is
// the only source of truth; these views never accept, choose, collect or report.
import {FURNACE_REGION,FURNACE_GROUPS,FURNACE_MODES,FURNACE_REWARDS} from './furnace-content.js';
import {furnaceTierAllowed} from './furnace.js';
import {actionLabel,controlsFor} from './controls.js';

const eligible=state=>furnaceTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.signal_reported===1&&state.inventory.tools.includes('signal_cipher')&&['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report'].every(id=>state.world.claimedRewards.includes(id));
const left=(state,group)=>FURNACE_GROUPS[group].filter(id=>!(state.world.defeated?.[FURNACE_REGION]??[]).includes(id)).length;
const totalLeft=state=>Object.keys(FURNACE_GROUPS).reduce((sum,group)=>sum+left(state,group),0);
const remaining=(state,group,place)=>`${place} 적 ${left(state,group)}/${FURNACE_GROUPS[group].length}명 남음.`;
const result=(id,title,detail)=>({id,title,detail});
const directions='지역 북쪽은 화면 오른쪽 위, 동쪽은 오른쪽 아래, 남쪽은 왼쪽 아래, 서쪽은 왼쪽 위입니다. 이동 키는 화면 기준입니다.';
const interaction=state=>`장치·입구·NPC 가까이에서 상호작용(${actionLabel(controlsFor(state),'interact')}) 또는 화면 상호작용 버튼을 사용하세요.`;
const future='다음 신호 묘실(T) 조사는 촌장 에다에게 수락하고 보고합니다. 묘실 보고 후 브란에게 전문가 승급을 하고 에다의 봉화 전장·황야 조사 의뢰로 이어집니다. 달인 승급과 전체 캠페인 결말은 아직 구현되지 않았습니다.';
const materialNames={iron:'철',wood:'목재',thread:'실',ember_shard:'잿불 조각',health_potion:'물약'};
const reward=stage=>{
 const row=FURNACE_REWARDS['r9:f:'+stage];
 return [`경험치${row.xp}`,`금화${row.gold}`,...Object.entries({...row.materials,...row.consumables}).map(([id,amount])=>`${materialNames[id]}${amount}`)].join('·');
};
const modeDetail=o=>o.furnace_mode===FURNACE_MODES.cover.value
 ?'엄폐판 유지: 양쪽 우회로는 모두 열렸고 중앙 엄폐판은 남습니다. 중앙 엄폐판은 적의 탄과 내 망치를 막으며 돌진도 통과할 수 없습니다.'
 :'중앙 통로 개방: 양쪽 우회로와 중앙 통로가 모두 열렸습니다. 중앙은 돌진·관통 망치의 직선 경로가 되지만 양쪽 사수의 조준선에 노출될 수 있습니다.';
const coolingChoice='엄폐판 유지는 중앙에서 적의 탄과 내 망치·돌진을 막는 엄폐물을 남깁니다. 중앙 통로 개방은 직선 진입·탈출로를 열지만 사수의 교차 사격에 노출될 수 있습니다. 두 선택 모두 양쪽 우회로를 열며 보상은 같습니다. 선택은 되돌릴 수 없습니다.';
const liftDetail='냉각 후 입구 동쪽 끝의 화물 승강기를 무료로 연결할 수 있습니다. 선택 귀환로이며 배기·점화·렌즈 회수·보고의 조건이 아닙니다. 연결과 이동은 현재 HP·MP·기력과 남은 쿨다운을 유지하며 별도 보상이나 회복이 없습니다. 연결하지 않아도 원래 입구로 왕복할 수 있습니다.';
const hasLens=state=>state.world.objectives.furnace_lens_taken===1&&state.inventory.tools.includes('furnace_lens');

function regionalStep(state){
 const o=state.world.objectives;
 if(!o.furnace_cooled)return result('furnace-cooling','냉각 앞마당 정리 · 엄폐판 선택',`${remaining(state,'cooling','냉각 앞마당')} ${left(state,'cooling')?'다섯 명을 모두 처치한 뒤':'처치를 마쳤으니'} 앞마당 동쪽 냉각 장치에서 엄폐판 유지 또는 중앙 통로 개방을 선택하세요. ${coolingChoice}`);
 if(!o.furnace_exhausted)return result('furnace-exhaust','작업 고리 정리 · 배기 장치 열기',`${modeDetail(o)} ${remaining(state,'exhaust','작업 고리')} ${left(state,'exhaust')?'여섯 명을 모두 처치한 뒤':'처치를 마쳤으니'} 작업 고리 중앙의 배기 장치를 여세요. 뒤쪽 가로 통로와 중앙 연결로가 함께 열립니다. 화물 승강기는 냉각 후 연결할 수 있는 무료 선택 경로입니다.`);
 if(!o.furnace_ignited)return result('furnace-ignition','뒤쪽 가로 통로 · 북쪽 점화 회랑 정리',`배기로 열린 뒤쪽 가로 통로와 중앙 연결로를 따라 북쪽 점화 회랑으로 가세요. ${remaining(state,'ignition','점화 회랑')} 용광로 전체 적 ${totalLeft(state)}/17명 남음. ${left(state,'ignition')?'남은 적을 모두 처치한 뒤':'처치를 마쳤으니'} 북쪽 중앙 점화 장치를 작동하세요. 기둥 옆으로 돌아 사수의 조준선을 끊을 수 있습니다. 점화 후에도 렌즈는 따로 회수해야 합니다.`);
 return result('furnace-lens','점화 완료 · 용광로 렌즈 따로 회수','점화와 점화 보상 지급을 마쳤습니다. 아직 렌즈를 회수하지 않았습니다. 점화 회랑 동쪽 끝의 용광로 렌즈에 따로 상호작용하세요. 렌즈는 비소모 회수물이며 추가 경험치·금화는 없습니다. 렌즈를 가져와야 마을 대장장이 오린에게 보고할 수 있습니다.');
}

export function furnaceObjectView(state,object){
 const o=state.world.objectives;
 const view=(name,detail,label,done=false)=>({name,detail:`${detail} ${directions}`,actions:done?[]:[{label}]});
 switch(object.actionKind){
  case 'cooling':
   if(o.furnace_cooled)return view('냉각 장치 · '+(o.furnace_mode===FURNACE_MODES.cover.value?'엄폐판 유지 완료':'중앙 통로 개방 완료'),`${modeDetail(o)} 선택은 되돌릴 수 없습니다. 냉각 보상은 이미 받았으며 추가 보상은 없습니다.`,null,true);
   return {name:'냉각 장치 · 엄폐판 선택',detail:`${remaining(state,'cooling','냉각 앞마당')} 오린의 용광로 수리를 수락하고 다섯 명을 모두 처치한 뒤 이 앞마당 동쪽 장치를 사용할 수 있습니다. ${coolingChoice} 어느 쪽이든 ${reward('cooling')}을 한 번 받습니다. 수리 비용·재료 소모·대기 시간은 없습니다. ${directions}`,actions:Object.entries(FURNACE_MODES).map(([choice,mode])=>({label:mode.name,choice}))};
  case 'exhaust':return view(o.furnace_exhausted?'작업 고리 배기 장치 · 개방 완료':'작업 고리 배기 장치',o.furnace_exhausted?'배기를 열어 뒤쪽 가로 통로와 중앙 연결로가 모두 열렸습니다. 배기 보상은 이미 받았으며 추가 보상은 없습니다.':`${o.furnace_cooled?modeDetail(o):'먼저 냉각 앞마당을 정리하고 냉각 장치의 엄폐판 선택을 완료하세요.'} ${remaining(state,'exhaust','작업 고리')} 여섯 명을 모두 처치한 뒤 작업 고리 중앙에서 배기를 열면 ${reward('exhaust')}을 한 번 받고 뒤쪽 가로 통로와 중앙 연결로가 열립니다. 비용·재료 소모는 없습니다.`,'배기 장치 열기',o.furnace_exhausted);
  case 'ignition':return view(o.furnace_ignited?'북쪽 점화 장치 · 점화 완료':'북쪽 점화 장치',o.furnace_ignited?`점화를 마쳤고 점화 보급과 보상은 이미 받았습니다. ${hasLens(state)?'비소모 용광로 렌즈도 회수했습니다.': '렌즈는 자동 회수되지 않습니다. 점화 회랑 동쪽 끝의 렌즈에 따로 상호작용하세요.'}`:`냉각 선택과 작업 고리 배기 개방이 필요합니다. ${remaining(state,'ignition','점화 회랑')} 용광로 전체 적 ${totalLeft(state)}/17명 남음. 열일곱 명 모두 처치한 뒤 점화 회랑 북쪽 중앙에서 점화하면 ${reward('ignition')}을 한 번 받습니다. 렌즈는 그 뒤 별도 회수하며 보고도 별도입니다.`,'용광로 점화',o.furnace_ignited);
  case 'lens':return view(o.furnace_lens_taken?'용광로 렌즈 · 회수 완료':'용광로 렌즈 · 별도 회수',o.furnace_lens_taken?`비소모 용광로 렌즈를 보관하고 있습니다. 렌즈 회수의 추가 보상은 없습니다. ${o.furnace_reported?'오린에게 보고까지 마쳤습니다.':'원래 입구 또는 연결한 선택 승강기로 마을에 돌아가 대장장이 오린에게 보고하세요.'}`:`${o.furnace_ignited?'점화를 마쳤습니다.':'먼저 냉각·배기와 모든 적 처치를 마치고 북쪽 중앙 점화 장치를 작동하세요.'} 점화 회랑 동쪽 끝의 이 렌즈를 직접 회수해야 합니다. 점화만으로 렌즈가 생기거나 보고가 완료되지는 않습니다. 비소모 회수물이며 경험치·금화 보상은 없습니다.`,'용광로 렌즈 회수',o.furnace_lens_taken);
  case 'shortcut':return view(o.furnace_shortcut_open?'화물 승강기 · 연결 완료':'화물 승강기 연결',o.furnace_shortcut_open?'마을과 입구 동쪽이 연결되었습니다. 연결 장치 북쪽의 화물 승강기 귀환문을 이용하세요. 선택 경로이며 원래 입구도 계속 열려 있습니다. 이동은 현재 HP·MP·기력과 남은 쿨다운을 유지하며 추가 보상이나 회복은 없습니다.':liftDetail,'화물 승강기 연결',o.furnace_shortcut_open);
  default:return {name:object.name,detail:'사용할 수 없는 대상입니다.',actions:[]};
 }
}

export function furnaceGuidance(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(o.furnace_reported)return result('furnace-complete','용광로 수리 · 오린 보고 완료',`냉각·배기·점화와 렌즈 회수 결과를 오린에게 보고했습니다. 보고 보상은 이미 받았습니다. ${future}`);
 let next;
 if(!o.furnace_accepted)next=result('furnace-accept','대장장이 오린에게 용광로 수리 받기',`${state.world.region==='ash_hamlet'?'마을 대장장이 오린에게':'현재 지역 출구로 마을에 돌아가 대장장이 오린에게'} 신호 복원 다음 의뢰를 받으세요. 수락과 필수 수리는 무료이며 추가 레벨·특정 숙련 기술·장비는 필요하지 않습니다. 수락 후 마을 남쪽의 잿불 용광로로 입구로 가세요.`);
 else if(hasLens(state))next=result('furnace-report','마을 대장장이 오린에게 렌즈 보고',`${state.world.region==='ash_hamlet'?'회수한 용광로 렌즈를 가지고 대장장이 오린 가까이에서 보고하세요.':state.world.region===FURNACE_REGION?'원래 입구 또는 연결한 선택 화물 승강기로 마을에 돌아가 대장장이 오린에게 렌즈를 보고하세요.':'현재 지역 출구로 마을에 돌아가 대장장이 오린에게 렌즈를 보고하세요.'} ${reward('report')}을 한 번 받습니다. 레벨15·추가 승급·비용·선택 승강기는 보고 조건이 아닙니다.`);
 else{
  next=regionalStep(state);
  if(state.world.region!==FURNACE_REGION)next=result('furnace-travel','잿불 용광로로 돌아가 수리 계속하기',`${state.world.region==='ash_hamlet'?'마을 남쪽의 잿불 용광로로 입구로 이동하세요.':'현재 지역 출구로 마을에 돌아간 뒤 남쪽의 잿불 용광로로 입구로 이동하세요.'} ${o.furnace_shortcut_open?'연결한 용광로 화물 승강기로 돌아가도 됩니다. ':''}이동은 자원과 쿨다운을 회복하지 않습니다. 용광로에서 이어 할 일: ${next.detail}`);
 }
 return {...next,detail:`${next.detail} ${directions} ${interaction(state)}`};
}

export function furnaceBlacksmithView(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(!o.furnace_accepted)return {title:'새 의뢰 · 잿불 용광로 수리',detail:'신호 해독판을 확보했습니다. 냉각 앞마당에서 엄폐판을 선택하고 작업 고리 배기와 북쪽 점화를 복구해 주세요. 점화 회랑 동쪽 끝의 렌즈는 따로 회수해 제게 보고해야 합니다. 수락·필수 수리는 무료이며 추가 레벨·특정 기술·장비는 요구하지 않습니다.',action:'accept',label:'용광로 수리 수락'};
 if(o.furnace_reported)return {title:'용광로 수리 · 보고 완료',detail:`용광로 수리와 렌즈 회수 결과를 확인했고 보고 보상도 이미 지급했습니다. ${future}`,action:null,label:''};
 if(o.furnace_ignited&&hasLens(state))return {title:'용광로 수리 · 렌즈 회수 결과 보고',detail:`비소모 용광로 렌즈를 회수했습니다. ${reward('report')}을 한 번 받습니다. 레벨15·추가 승급·비용·선택 화물 승강기는 필요하지 않습니다.`,action:'report',label:'용광로 수리 보고'};
 return {title:'용광로 수리 진행 중',detail:furnaceGuidance(state).detail,action:null,label:''};
}
