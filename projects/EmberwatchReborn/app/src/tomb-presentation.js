// Read-only authored T views. Durable state and the immutable content catalog
// are authoritative; these helpers never grant rewards or initialize progress.
import {TOMB_REGION,TOMB_REGIONS,TOMB_LINKS,TOMB_GROUPS,TOMB_FOES,TOMB_GLYPHS,TOMB_SEQUENCE,TOMB_REWARDS,TOMB_TRAINING_RESERVE} from './tomb-content.js';
import {tombTierAllowed,tombInputRevision,tombWardCarried,tombPortalAllowed} from './tomb.js';
import {trainingGoldBalances} from './training-economy.js';
import {actionLabel,controlsFor} from './controls.js';

const objects=TOMB_REGIONS[TOMB_REGION].objects;
const eligible=state=>tombTierAllowed(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.objectives.furnace_reported===1&&['signal_cipher','furnace_lens'].every(id=>state.inventory.tools.includes(id))&&['r4:report','r5:promote:adept','r6:q:report','r7:p:report','r8:s:report','r9:f:report'].every(id=>state.world.claimedRewards.includes(id));
const alive=state=>!state.world.lifeDown&&state.vitals?.hp>0;
const left=(state,group)=>TOMB_GROUPS[group].filter(id=>!(state.world.defeated?.[TOMB_REGION]??[]).includes(id)).length;
const remaining=(state,group,place)=>`${place} 적 ${left(state,group)}/${TOMB_GROUPS[group].length}명 남음.`;
const result=(id,title,detail)=>({id,title,detail});
const materialNames={iron:'철',wood:'목재',thread:'실',ember_shard:'잿불 조각',health_potion:'물약'};
const reward=stage=>{const row=TOMB_REWARDS['r10:t:'+stage];return [`경험치${row.xp}`,`금화${row.gold}`,...Object.entries({...row.materials,...row.consumables}).map(([id,amount])=>`${materialNames[id]}${amount}`)].join('·');};
export const TOMB_EXPERT_NOTICE='위임장은 자동 승급이나 기술 습득이 아닙니다. 레벨15에 훈련관 브란에게 예약금120을 사용해 전문가로 승급한 뒤, 기술점수로 전문 기술을 배우고 에다에게 봉화 전장 의뢰를 받으세요. 달인 승급과 최종 결말은 아직 개발 중입니다.';
const expertNotice=state=>state.character.tier==='expert'?'전문가 승급을 이미 마쳤습니다. 에다의 봉화 전장 기록을 확인하세요. 달인 승급과 최종 결말은 아직 개발 중입니다.':TOMB_EXPERT_NOTICE;
export const TOMB_DIRECTIONS='지역 북쪽은 화면 오른쪽 위, 동쪽은 오른쪽 아래, 남쪽은 왼쪽 아래, 서쪽은 왼쪽 위입니다. 이동 키는 화면 기준입니다.';
const interaction=state=>`장치·입구·NPC 가까이에서 상호작용(${actionLabel(controlsFor(state),'interact')}) 또는 화면 상호작용 버튼을 사용하세요.`;
const sequenceText=()=>TOMB_SEQUENCE.map(id=>TOMB_GLYPHS[id].name).join(' → ');
const stairDetail='해독 후 비문실 남서쪽 기록 보관 계단을 무료로 연결할 수 있습니다. 선택 귀환로이며 석판·봉인·서약문 회수·에다 보고의 조건이 아닙니다. 연결하지 않아도 원래 입구로 왕복해 끝까지 완료할 수 있습니다. 계단 연결과 지역 전환 자체는 현재 HP·MP·기력과 남은 쿨다운을 유지하며 별도 보상이나 회복이 없습니다.';
const wardDetail='운반 봉인은 비소모이며 HP·대기 시간·속도·공격·MP·기력 페널티가 없습니다. 귀환·사망·다시 불러오기에도 완료한 중계 단계가 유지됩니다.';
const commonDetail=(state,detail)=>`${detail} ${TOMB_DIRECTIONS} ${interaction(state)}`;

/** Bind this snapshot to the panel generation that produced it. Do not refresh
 * its revision/step at click time: the reducer must reject stale or repeat input.
 * Merge only the returned fields with the caller's live position/life/vitals/
 * recovery, never with the whole view or button object. No reward data is sent. */
export function tombCommandFields(action){
 if(!action||!Number.isSafeInteger(action.expectedRevision)||action.expectedRevision<0)return null;
 if(['acceptTombQuest','reportTombQuest'].includes(action.type))return {type:action.type,expectedRevision:action.expectedRevision};
 if(action.type!=='interactTomb')return null;
 const object=objects.find(row=>row.id===action.objectId);if(!object)return null;
 const fields={type:action.type,objectId:object.id,expectedRevision:action.expectedRevision};
 if(object.actionKind==='glyph'){
  if(action.glyph!==object.glyph||!Number.isInteger(action.expectedStep)||action.expectedStep<0||action.expectedStep>3)return null;
  Object.assign(fields,{glyph:object.glyph,expectedStep:action.expectedStep});
 }
 return fields;
}
const objectAction=(state,object,label)=>({label,type:'interactTomb',objectId:object.id,expectedRevision:tombInputRevision(state),...(object.actionKind==='glyph'?{glyph:object.glyph,expectedStep:state.world.objectives.tomb_sequence_step}: {})});

/** Journal data remains available after the active objective has moved on. */
export function tombClueView(state){
 const o=state.world.objectives;if(!o.tomb_decoded)return null;
 const step=o.tomb_sequence_step,nextGlyph=TOMB_SEQUENCE[step]??null;
 const glyphs=TOMB_SEQUENCE.map(id=>({id,...TOMB_GLYPHS[id],objectId:objects.find(row=>row.glyph===id).id}));
 const progress=o.tomb_sequence_solved?'석판 순서 3/3 · 해제 완료. 순서 보상은 이미 받았습니다.':`석판 순서 ${step}/3. 다음은 ${TOMB_GLYPHS[nextGlyph].name}입니다.`;
 const inputHint=o.tomb_sequence_solved?'':' 올바른 앞 순서는 저장됩니다. 잘못 누르면 순서만 0/3으로 돌아가며 피해·자원·금화·보상·시간 벌점은 없습니다.';
 return {id:'tomb-clue',title:'묘실 투영 단서 · 다시 읽기',detail:`${sequenceText()}. ${progress}${inputHint} 투영 장치에서 다시 읽거나 이 기록을 언제든 확인할 수 있습니다. 렌즈와 신호 해독판은 소모되지 않습니다.`,sequence:[...TOMB_SEQUENCE],glyphs,step,nextGlyph,complete:!!o.tomb_sequence_solved};
}

export function tombGoldView(state){
 const balances=trainingGoldBalances(state);
 if(!balances.ok)return {...balances,detail:'금화와 훈련 예약 기록을 확인할 수 없습니다.'};
 return {...balances,detail:`총 금화 ${balances.totalGold} · 전문 훈련 예약 ${balances.reservedGold} · 쓸 수 있는 금화 ${balances.spendableGold}. 예약금은 총 금화에 포함되며 별도 지갑이나 추가 보상이 아닙니다. 예약금은 일반 장비 지출과 사망 손실에 사용되지 않습니다.`};
}

/** F-compatible name/detail/actions, with explicit completed/actionable data.
 * hideWhenCompleted must read completed, not actions.length: a locked object
 * or dead hero also has no actions, but the object has not been completed. */
export function tombObjectView(state,candidate){
 const object=objects.find(row=>row.id===candidate?.id&&candidate?.type==='tomb');
 if(!object)return {name:candidate?.name??'알 수 없는 장치',detail:'사용할 수 없는 대상입니다.',actions:[],completed:false};
 const o=state.world.objectives,canAct=eligible(state)&&alive(state)&&!!o.tomb_accepted;
 const view=(name,detail,label,completed=false,ready=true,reread=false)=>({name,detail:commonDetail(state,`${detail}${!alive(state)?' 쓰러진 상태에서는 조작할 수 없습니다. 재시도 후 이어가세요.':''}`),completed,actions:canAct&&ready&&(!completed||reread)?[objectAction(state,object,label)]:[]});
 switch(object.actionKind){
  case 'decode':return o.tomb_decoded
   ?view('렌즈 투영 장치 · 해독 완료',`해독 보상은 이미 받았으며 다시 읽기는 무료이고 추가 보상이 없습니다. ${tombClueView(state).detail}`,'투영 단서 다시 읽기',true,true,true)
   :view('렌즈 투영 장치 · 세 기호 해독',`${remaining(state,'entry','투영 전실')} 전실의 여섯 명을 모두 처치한 뒤 남동쪽 렌즈 투영 장치를 읽으세요. 비소모 용광로 렌즈와 신호 해독판으로 순서를 밝히면 ${reward('decode')}을 한 번 받습니다. 두 도구는 소모되지 않습니다.`,'렌즈로 순서 해독',false,left(state,'entry')===0);
  case 'glyph':{
   const glyph=TOMB_GLYPHS[object.glyph];
   return view(`${glyph.order} · ${glyph.name} 석판${o.tomb_sequence_solved?' · 해제 완료':''}`,o.tomb_sequence_solved?`${tombClueView(state).detail} 비문실 동쪽의 운반 봉인으로 이어집니다.`:`${o.tomb_decoded?tombClueView(state).detail:'먼저 투영 전실의 렌즈 투영 장치에서 순서를 해독하세요.'} ${remaining(state,'inscription','비문실')} 여섯 명 처치 후 세 석판을 순서대로 누르면 ${reward('sequence')}을 한 번 받습니다. 색 대신 기호 모양·이름·번호로 구별하세요.`,`${glyph.name} 석판 누르기`,!!o.tomb_sequence_solved,!!o.tomb_decoded&&left(state,'inscription')===0);
  }
  case 'wardTake':return view(o.tomb_ward_taken?'운반 봉인 · 인수 완료':'운반 봉인 받기',o.tomb_ward_taken?`${o.tomb_ward_sealed?'상부 봉인까지 완성했습니다.':o.tomb_ward_midpoint?`${left(state,'ward_upper')?'하부 중계를 마쳤습니다.':'하부 중계를 마쳤고 상부 봉인실의 세 적을 모두 처치했습니다.'} 상부 봉인 받침까지 운반을 계속하세요.`:left(state,'ward_lower')?'운반 중입니다. 하부 봉인실의 남은 적을 처치하고 동쪽 하부 중계 받침에 연결하세요.':'운반 중이며 하부 봉인실의 세 적을 모두 처치했습니다. 동쪽 하부 중계 받침에 연결하세요.'} 인수 보상은 없습니다. ${wardDetail}`:`석판 순서를 완성한 뒤 비문실 남동쪽에서 봉인을 직접 받으세요. 하부 봉인실이 열립니다. 인수 시 추가 경험치·금화는 없습니다. ${wardDetail}`,'운반 봉인 받기',!!o.tomb_ward_taken,!!o.tomb_sequence_solved);
  case 'wardMidpoint':{
   const progress=o.tomb_ward_midpoint
    ?`${o.tomb_ward_sealed?'상부 봉인까지 완성했습니다.':left(state,'ward_upper')?'상부 봉인실이 열렸습니다. 봉인을 계속 운반해 남은 상부 적을 처치하고 북쪽 봉인 받침을 완성하세요.':'상부 봉인실의 세 적을 모두 처치했습니다. 봉인을 계속 운반해 북쪽 봉인 받침을 완성하세요.'} 중계 단계는 저장되며 추가 보상은 없습니다.`
    :`${!o.tomb_ward_taken?'먼저 비문실에서 운반 봉인을 받으세요. 하부 봉인실의 세 적을 처치한 뒤 연결할 수 있습니다.':left(state,'ward_lower')?`운반 봉인을 보유하고 있습니다. ${remaining(state,'ward_lower','하부 봉인실')} 남은 적을 모두 처치하면 연결할 수 있습니다.`:'운반 봉인을 보유하고 있고 하부 봉인실의 세 적을 모두 처치했습니다.'} 하부 동쪽 중계 받침에 연결하면 상부로 가는 길이 열립니다. 중계 보상·대기 시간은 없습니다.`;
   return view(o.tomb_ward_midpoint?'하부 중계 받침 · 연결 완료':'하부 중계 받침 · 1/2단계',`${progress} ${wardDetail}`,'하부 중계 연결',!!o.tomb_ward_midpoint,!!o.tomb_ward_taken&&left(state,'ward_lower')===0);
  }
  case 'wardSeal':{
   const progress=o.tomb_ward_sealed
    ?`봉인과 보급 지급을 마쳤고 서약실 길이 열렸습니다. 봉인 보상은 이미 받았습니다. ${left(state,'boss')?'서약 수호자를 처치한 뒤 서약문을 따로 회수하세요.':o.tomb_oath_taken?`서약문도 회수했습니다. ${o.tomb_reported?'촌장 에다에게 보고까지 마쳤습니다.':'마을 촌장 에다에게 보고하세요.'}`:'수호자는 처치했지만 서약문은 아직 회수하지 않았습니다. 서약실 동쪽에서 따로 회수하세요.'}`
    :`${!o.tomb_ward_taken?'먼저 비문실에서 운반 봉인을 받으세요. 하부 중계를 연결한 뒤 상부 세 적을 처치해야 합니다.':!o.tomb_ward_midpoint?'운반 봉인을 보유하고 있습니다. 하부 중계를 먼저 연결하세요. 이후 상부 세 적을 처치해야 합니다.':left(state,'ward_upper')?`하부 중계는 완료했습니다. ${remaining(state,'ward_upper','상부 봉인실')} 남은 적을 모두 처치하세요.`:'하부 중계는 완료했고 상부 봉인실의 세 적을 모두 처치했습니다.'} 북쪽 봉인 받침에서 마무리하면 ${reward('ward')}을 한 번 받습니다. 서약실로 가는 길이 열립니다. ${wardDetail}`;
   return view(o.tomb_ward_sealed?'상부 봉인 받침 · 봉인 완료':'상부 봉인 받침 · 2/2단계',progress,'상부 봉인 완성',!!o.tomb_ward_sealed,!!o.tomb_ward_midpoint&&left(state,'ward_upper')===0);
  }
  case 'oath':return view(o.tomb_oath_taken?'서약문 · 회수 완료':'서약문 · 별도 회수',o.tomb_oath_taken?`비소모 서약문을 보관하고 있습니다. 회수 시 추가 경험치·금화는 없습니다. ${o.tomb_reported?'촌장 에다에게 보고까지 마쳤습니다.':'마을로 돌아가 촌장 에다에게 보고하세요. 오린이나 브란에게 하는 보고가 아닙니다.'}`:`${!o.tomb_ward_sealed?'상부 봉인을 완성하고 서약 수호자를 먼저 처치하세요.':left(state,'boss')?'상부 봉인은 완료했습니다. 서약 수호자를 먼저 처치하세요.':'서약 수호자를 처치했습니다.'} 수호자 동쪽의 서약문에 따로 상호작용해야 합니다. 보스 처치만으로 서약문을 얻거나 보고가 완료되지는 않습니다. 비소모 회수물이며 추가 경험치·금화는 없습니다. 회수 후 마을 촌장 에다에게 보고하세요.`,'서약문 회수',!!o.tomb_oath_taken,!!o.tomb_ward_sealed&&left(state,'boss')===0);
  case 'shortcut':return view(o.tomb_shortcut_open?'기록 보관 계단 · 연결 완료':'기록 보관 계단 연결',o.tomb_shortcut_open?'비문실과 마을이 연결되었습니다. 연결 장치 동쪽의 계단 귀환문을 이용하세요. 선택 귀환로이며 원래 입구도 계속 열려 있습니다. 계단 연결과 지역 전환 자체는 현재 HP·MP·기력과 남은 쿨다운을 유지하며 추가 보상이나 회복은 없습니다.':stairDetail,'기록 보관 계단 연결',!!o.tomb_shortcut_open,!!o.tomb_decoded);
  default:return {name:object.name,detail:'사용할 수 없는 대상입니다.',actions:[],completed:false};
 }
}

function regionalStep(state){
 const o=state.world.objectives;
 if(!o.tomb_decoded)return result('tomb-decode','투영 전실 정리 · 렌즈로 세 기호 해독',`${remaining(state,'entry','투영 전실')} 여섯 명 처치 후 전실 남동쪽 렌즈 투영 장치를 읽으세요. 검수의 쐐기 모양과 서기관의 좁은 틈 모양 표식을 구별하세요. 석관은 양쪽의 탄과 망치를 막습니다.`);
 if(!o.tomb_sequence_solved)return result('tomb-sequence','비문실 정리 · 세 기호 순서 입력',`${remaining(state,'inscription','비문실')} 비문실 적을 모두 처치한 뒤 초승달은 서쪽, 갈라진 빛줄기는 동쪽, 잿불은 북쪽 석판에서 누르세요. ${tombClueView(state).detail} ${stairDetail}`);
 if(!o.tomb_ward_taken)return result('tomb-ward-take','비문실 남동쪽 · 운반 봉인 받기',`석판 순서와 보상 지급을 마쳤습니다. 비문실 남동쪽의 운반 봉인을 직접 받으면 하부 봉인실이 열립니다. ${wardDetail}`);
 if(!o.tomb_ward_midpoint)return result('tomb-ward-midpoint','하부 봉인실 · 중계 1/2단계',`${left(state,'ward_lower')?`${remaining(state,'ward_lower','하부 봉인실')} 남은 적을 모두 처치한 뒤 하부 동쪽 중계 받침에 연결하세요. 분절된 원 표식은 가까운 원형 공격의 감시자, 갈라진 축 표식은 긴 사격선의 관통자입니다.`:'하부 봉인실의 세 적을 모두 처치했습니다. 운반 봉인을 하부 동쪽 중계 받침에 연결하세요.'} ${wardDetail}`);
 if(!o.tomb_ward_sealed)return result('tomb-ward-seal','상부 봉인실 · 봉인 2/2단계',`${left(state,'ward_upper')?`${remaining(state,'ward_upper','상부 봉인실')} 북쪽 연결로를 따라 남은 상부 적을 처치한 뒤 북쪽 봉인 받침에서 완성하세요.`:'상부 봉인실의 세 적을 모두 처치했습니다. 북쪽 봉인 받침에서 완성하세요.'} 하부 중계는 완료되어 다시 할 필요가 없습니다. ${wardDetail}`);
 if(left(state,'boss'))return result('tomb-boss','남쪽 서약실 · 서약 수호자 처치','상부 봉인을 마쳤습니다. 하부 봉인실로 돌아와 남쪽 통로를 따라 서약실로 가세요. 큰 깨진 고리 표식의 서약 수호자가 있습니다. 좁은 쐐기는 옆으로, 원형 범위는 바깥으로, 긴 사격선은 옆으로 피하세요. 처치 후 서약문은 따로 회수해야 합니다.');
 return result('tomb-oath','수호자 처치 완료 · 동쪽 서약문 따로 회수','서약 수호자를 처치했고 처치 보상은 이미 받았습니다. 아직 서약문을 회수하지 않았습니다. 서약실 동쪽의 서약문에 따로 상호작용한 뒤 마을 촌장 에다에게 보고하세요. 서약실 귀환문은 이미 열렸지만 회수 없이 귀환하면 다시 와야 합니다.');
}

export function tombGuidance(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;let next;
 if(o.tomb_reported)next=result('tomb-complete','신호 묘실 · 에다 보고 완료',`해독·석판·봉인·서약문 회수 결과를 촌장 에다에게 보고했고 보고 보상은 이미 받았습니다. ${tombGoldView(state).detail} ${expertNotice(state)}`);
 else if(!o.tomb_accepted)next=result('tomb-accept','촌장 에다에게 신호 묘실 조사 받기',`${state.world.region==='ash_hamlet'?'마을 촌장 에다에게':'현재 지역 출구로 마을에 돌아가 촌장 에다에게'} 용광로 다음 의뢰를 받으세요. 수락·필수 진행은 무료이며 추가 레벨·특정 기술·장비는 필요하지 않습니다. 수락 후 마을 북동쪽 신호 묘실 입구로 가세요.`);
 else if(o.tomb_oath_taken)next=result('tomb-report','비소모 서약문 · 마을 촌장 에다에게 보고',`${state.world.region==='ash_hamlet'?'촌장 에다 가까이에서':'원래 입구·연결한 선택 계단·서약실 귀환문으로 마을에 돌아가 촌장 에다에게'} 서약문을 보고하세요. ${reward('report')}과 전문 위임장을 한 번 받습니다. 레벨14에서도 보고할 수 있으며 레벨15·추가 승급·기존 금화120·선택 계단은 보고 조건이 아닙니다. 보고 금화${TOMB_TRAINING_RESERVE}은 총 금화에 포함된 전문 훈련 예약금이 됩니다. 보고 대상은 에다이며 오린이나 브란이 아닙니다.`);
 else{
  next=regionalStep(state);
  if(state.world.region!==TOMB_REGION)next=result('tomb-travel','신호 묘실로 이동해 조사하기',`${state.world.region==='ash_hamlet'?'마을 북동쪽 신호 묘실 입구로':'현재 지역 출구로 마을에 돌아간 뒤 북동쪽 신호 묘실 입구로'} 이동하세요. ${o.tomb_shortcut_open?'연결한 기록 보관 계단으로 돌아가도 됩니다. ':''}지역 전환 자체로 자원이나 쿨다운이 회복되지는 않습니다. 일반 보행 중에는 전투 시간에 따라 재생과 재사용 대기가 정상 진행됩니다. 묘실에서 할 일: ${next.detail}`);
 }
 if(!alive(state))next={...next,detail:`쓰러진 상태입니다. 먼저 재시도한 뒤 진행을 이어가세요. ${next.detail}`};
 return {...next,detail:commonDetail(state,next.detail)};
}

/** F-compatible quest card; only the actual elder NPC may mount this card. */
export function tombElderView(state){
 if(!eligible(state))return null;
 const o=state.world.objectives,base={npcId:'elder',expectedRevision:tombInputRevision(state)};
 if(o.tomb_reported)return {...base,title:'신호 묘실 · 에다 보고 완료',detail:`서약문 조사 결과를 확인했고 보고 보상은 이미 지급했습니다. ${tombGoldView(state).detail} ${expertNotice(state)}`,action:null,label:''};
 if(!alive(state))return {...base,title:'신호 묘실 · 재시도 후 대화',detail:'쓰러진 상태에서는 수락하거나 보고할 수 없습니다. 먼저 재시도하세요.',action:null,label:''};
 if(!o.tomb_accepted)return {...base,title:'새 의뢰 · 신호 묘실 조사',detail:'렌즈 투영으로 기호를 해독하고 세 석판을 연 뒤 두 단계 운반 봉인을 완성해 주세요. 서약 수호자를 처치한 뒤 서약문을 따로 회수하여 촌장 에다인 제게 보고해야 합니다. 수락·필수 진행은 무료이며 추가 레벨·특정 기술·장비는 요구하지 않습니다.',action:'accept',type:'acceptTombQuest',label:'신호 묘실 조사 수락'};
 if(o.tomb_oath_taken&&state.inventory.tools.includes('tomb_oath'))return {...base,title:'신호 묘실 · 에다에게 서약문 보고',detail:`${reward('report')}과 전문 위임장을 한 번 받습니다. 레벨14에서도 보고할 수 있으며 레벨15·기존 금화120·선택 계단은 필요하지 않습니다. 보고 금화${TOMB_TRAINING_RESERVE}을 총 금화 안에서 전문 훈련용으로 예약합니다. ${tombGoldView(state).detail} ${expertNotice(state)}`,action:'report',type:'reportTombQuest',label:'에다에게 신호 묘실 보고'};
 return {...base,title:'신호 묘실 조사 진행 중',detail:tombGuidance(state).detail,action:null,label:''};
}

/** Exact authored portal ID lookup. Boss return deliberately opens before oath
 * pickup; its label must warn without inventing an oath gate. */
export function tombPortalLabel(state,candidate){
 const id=typeof candidate==='string'?candidate:candidate?.id;
 const portal=[...TOMB_REGIONS[TOMB_REGION].portals,...TOMB_LINKS.ash_hamlet].find(row=>row.id===id);
 if(!portal)return candidate?.name??'';
 const o=state.world.objectives;
 if(id==='tomb-boss-return')return `${portal.name}${left(state,'boss')?' · 수호자 처치 필요':!o.tomb_oath_taken?' · 서약문 미회수':''}`;
 if(id.endsWith('shortcut'))return `${portal.name}${o.tomb_shortcut_open?' · 연결됨':' · 계단 연결 필요'}`;
 if(id==='town-tomb-entry'&&!o.tomb_accepted)return `${portal.name} · 에다 의뢰 필요`;
 return portal.name;
}
export function tombPortalView(state,candidate){
 const id=typeof candidate==='string'?candidate:candidate?.id;
 const portal=[...TOMB_REGIONS[TOMB_REGION].portals,...TOMB_LINKS.ash_hamlet].find(row=>row.id===id);
 if(!portal)return null;
 const gate=tombPortalAllowed(state,portal);
 return {id:portal.id,name:tombPortalLabel(state,portal),allowed:gate.ok&&alive(state),detail:!alive(state)?'쓰러진 상태에서는 이동할 수 없습니다. 먼저 재시도하세요.':gate.ok?`지역 전환 자체는 현재 HP·MP·기력과 남은 쿨다운을 유지합니다.${portal.id==='tomb-boss-return'&&!state.world.objectives.tomb_oath_taken?' 서약문은 아직 회수하지 않았습니다. 귀환 전에 수호자 동쪽에서 따로 회수하세요.':''}`:gate.reason};
}

/** Pure rendering hints. Shapes must be drawn with contrast/outline even with
 * flash=0. This data does not itself implement or verify visual readability. */
export function tombPresentationHints(state){
 return {directions:TOMB_DIRECTIONS,interaction:interaction(state),interactLabel:actionLabel(controlsFor(state),'interact'),clue:tombClueView(state),wardCarried:tombWardCarried(state),ward:{shape:'ring-with-core',collides:false},roleShapes:Object.fromEntries(Object.entries(TOMB_FOES).map(([id,foe])=>[id,foe.roleGlyph]))};
}

/** One copy line for an actual reducer event; no synthetic completion or award. */
export function tombEventCopy(event){
 switch(event?.type){
  case 'tombClueRead':return `투영 단서: ${sequenceText()}. 기록에서 언제든 다시 확인할 수 있습니다.`;
  case 'tombSequenceReset':return TOMB_GLYPHS[event.glyph]&&TOMB_GLYPHS[event.expectedGlyph]?`${TOMB_GLYPHS[event.glyph].name}을 눌렀지만 다음은 ${TOMB_GLYPHS[event.expectedGlyph].name}이었습니다. 순서만 0/3으로 초기화했습니다. 피해·자원·금화·보상·시간 벌점은 없습니다. 다시 ${TOMB_GLYPHS[TOMB_SEQUENCE[0]].name}부터 누르세요.`:'';
  case 'tombSequenceAdvanced':return event.complete?'석판 순서 3/3 · 해제 완료. 비문실 남동쪽의 운반 봉인을 받으세요.':TOMB_GLYPHS[event.nextGlyph]?`석판 순서 ${event.step}/3. 다음은 ${TOMB_GLYPHS[event.nextGlyph].name}입니다.`:'';
  case 'tombWardTaken':return '운반 봉인을 받았습니다. 하부 봉인실의 세 적을 처치하고 하부 중계 받침에 연결하세요.';
  case 'tombWardMidpoint':return '하부 중계 1/2단계 완료. 상부 봉인실의 세 적을 처치하고 북쪽 봉인 받침을 완성하세요.';
  case 'tombWardSealed':return '상부 봉인 2/2단계 완료. 하부를 지나 남쪽 서약실로 가세요. 서약문은 수호자 처치 후 따로 회수합니다.';
  case 'tombOathTaken':return '비소모 서약문을 회수했습니다. 마을 촌장 에다에게 보고하세요.';
  case 'expertCommissionGranted':return `에다 보고 완료. 전문 위임장과 보고 금화 안의 훈련 예약금${TOMB_TRAINING_RESERVE}을 확보했습니다. 자동 승급·기술 습득은 아닙니다.`;
  default:return '';
 }
}
