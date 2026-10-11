// UI reads the same durable objectives/receipts as the reducer; no hidden progress.
export function dungeonObjectView(state,object) {
 const o=state.world.objectives,done=key=>state.world.claimedRewards.includes(key),choice=(label,value)=>({label,value});
 switch(object.actionKind){
  case 'record':return {name:'정비 기록 읽기',detail:'수문 봉인의 순서는 물결 → 톱니 → 불씨. 경비를 물리친 뒤 세 봉인판을 이 순서로 누르세요. 제어실에서는 급수를 차단하고 배수를 열어야 합니다. 손잡이는 입구 옆에 있습니다.',actions:[choice('정비 기록 읽음')]};
  case 'crank':return {name:o.sluice_crank_found?'손잡이 · 회수 완료':'수문 손잡이 회수',detail:'수문 밸브와 귀환 승강기를 고치는 비소모 도구입니다.',actions:o.sluice_crank_found?[]:[choice('손잡이 회수')]};
  case 'rune':return {name:`${object.name} · ${o.sluice_sequence_solved?'해제 완료':`${o.sluice_rune_step??0}/3`}`,detail:'정비 기록: 물결 → 톱니 → 불씨. 경비실 적을 모두 처치한 뒤 입력할 수 있습니다. 잘못 누르면 순서만 처음으로 돌아갑니다. 피해나 재료 비용은 없습니다.',actions:o.sluice_sequence_solved?[]:[choice('이 문양 누르기')]};
  case 'inlet':return {name:`급수 밸브 · ${o.sluice_valve_inlet?'열림':'차단'}`,detail:'제어실 적을 처치하고 손잡이로 급수를 차단하세요. 배수도 열고 방향까지 선택하면 수로의 통행이 영구 복구됩니다.',actions:[choice('급수 차단',0),choice('급수 개방',1)]};
  case 'outlet':return {name:`배수 밸브 · ${o.sluice_valve_outlet?'열림':'차단'}`,detail:'손잡이로 배수를 여세요. 급수 차단·배수 개방을 맞추고 옆 장치에서 배수 방향도 골라야 다리가 열립니다.',actions:[choice('배수 개방',1),choice('배수 차단',0)]};
  case 'flow':return {name:`배수 방향 · ${['미선택','직통','창고'][o.sluice_drain_mode??0]}`,detail:'직통은 필수 경로만 정리합니다. 창고 배수는 선택 적과 추가 재료가 있는 측면 통로도 엽니다. 선택은 다시 바꿀 수 있고 이미 열린 통로는 닫히지 않습니다.',actions:[choice('직통 배수',1),choice('선택 창고 배수',2)]};
  case 'lift':return {name:o.sluice_shortcut_open?'귀환 승강기 · 연결 완료':'귀환 승강기 체인 연결',detail:'손잡이로 체인을 고치면 마을과 하층을 바로 왕복합니다. 별도 보상이나 회복은 없지만 재정비와 보스 재도전 경로가 짧아집니다.',actions:o.sluice_shortcut_open?[]:[choice('승강기 연결')]};
  case 'bell':return {name:o.sluice_boss_awakened?'봉인종 · 보스문 개방':'수문핵 봉인종',detail:'전실의 두 적을 쓰러뜨리면 보스문을 열 수 있습니다. 수문 심장지기는 정면 쓸기 → 직선탄 → 바닥 울림을 반복합니다. 붉은 예고를 보고 옆으로 피한 뒤 반격하세요.',actions:o.sluice_boss_awakened?[]:[choice('봉인종 울리기')]};
  case 'core':return {name:o.first_dungeon_cleared?'수문핵 · 회수 완료':'멈춘 수문핵 회수',detail:'심장지기를 처치하고 수문핵을 회수한 뒤 촌장 에다에게 보고하세요. 핵 회수 시 +2 강화/목걸이 제작 조건이 열리고, 대장장이에게 별도 던전 보급을 받을 수 있습니다.',actions:o.first_dungeon_cleared?[]:[choice('수문핵 회수')]};
  case 'store':return {name:done('r4:store')?'선택 창고 · 회수 완료':'선택 창고 보급품',detail:'창고의 적을 모두 처치하면 철1·목재1·실2·물약1과 경험치30·금화18을 한 번 받습니다.',actions:done('r4:store')?[]:[choice('창고 보급품 회수')]};
  default:return {name:object.name,detail:'사용할 수 없는 대상입니다.',actions:[]};
 }
}
export function dungeonGuidance(state) {
 const o=state.world.objectives,lower=state.world.defeated?.sluice_lower??[];
 const result=(id,title,detail)=>({id,title,detail});
 if(!o.sluice_accepted)return result('sluice-accept','촌장 에다에게 수문소 조사 받기','감시자 보급품에서 수문소의 흔적을 찾았습니다. 마을 촌장 에다에게 조사 의뢰와 열쇠를 받으세요.');
 if(!o.sluice_crank_found)return result('sluice-crank','수문소 상층 입구의 손잡이 회수','감시자 뒤 수문소 입구로 진입하세요. 상층 입구의 정비 기록 옆에서 손잡이를 회수하세요.');
 if(!o.sluice_sequence_solved)return result('sluice-sequence','경비실 돌파 · 물결 → 톱니 → 불씨','경비실의 적 세 마리를 처치하고 봉인판을 순서대로 누르세요.');
 if(!o.sluice_bridge_open)return result('sluice-water','제어실 · 급수 차단 / 배수 개방 / 방향 선택','제어실 적 세 마리를 처치하고 급수는 차단, 배수는 개방한 뒤 옆 장치에서 직통 또는 창고 방향을 반드시 선택하세요.');
 if(!o.first_dungeon_cleared&&!o.sluice_shortcut_open)return result('sluice-lift','하층 안전 입구의 귀환 승강기 연결','수로를 건너 하층으로 내려가세요. 입구 승강기 체인을 손잡이로 연결하면 마을과 바로 왕복합니다.');
 if(!o.sluice_boss_awakened)return result('sluice-bell','하층 전실 정리 · 봉인종 울리기','전실의 두 적을 처치하고 북쪽 봉인종으로 보스문을 여세요.');
 if(!lower.includes('sluice-heartkeeper'))return result('sluice-boss','수문 심장지기 처치','쓸기·직선탄·바닥 울림의 붉은 예고를 피하고 회수 동작에 반격하세요.');
 if(!o.first_dungeon_cleared)return result('sluice-core','심장지기 뒤 수문핵 회수','보스 뒤 수문핵을 직접 회수해야 조사가 완료됩니다.');
 if(!o.adept_commission)return result('sluice-report','귀환 승강기 → 촌장 에다에게 보고','핵을 확보했습니다. 마을 촌장 에다에게 보고해 경험치90·금화60과 숙련 위임장을 받으세요.');
 if(state.character?.tier==='apprentice')return result('adept-promotion','훈련관 브란에게 숙련 승급','레벨5와 수문소 위임장으로 첫 승급을 받으세요. 금화0이며 추가 XP·점수·회복은 없습니다.');
 if(state.character?.tier==='adept'&&!state.character.skills.lay_on_hands&&!state.character.skills.judgement)return result('adept-skills','훈련관에서 숙련 기술 선택','기술점수로 자기 치유 온기 또는 전방 단죄를 배우세요. 기존 저장은 새 행동의 키를 직접 지정해야 합니다.');
 if(!state.equipmentProgress?.claimedAwards.includes('first_dungeon_salvage'))return result('sluice-salvage','대장장이에게 던전 보급 받기','철2·목재1·잿불 조각1을 받으세요. +2 강화와 집중 목걸이 제작은 같은 잿불 조각을 써 선택이 필요합니다. 다음 지역과 전문가·마스터 승급은 개발 중입니다.');
 if(state.world.claimedRewards.includes('r4:store'))return result('sluice-complete','수문소 전체 탐험 완료 · 장비 정비','필수 조사와 선택 창고까지 마쳤습니다. 숙련 기술을 정비하고 남은 적과 선택 경로를 탐험할 수 있습니다. 이후 캠페인은 개발 중입니다.');
 return result('sluice-complete','수문소 조사 완료 · 장비 정비 / 선택 창고','첫 던전의 조사와 보고를 마쳤습니다. 남은 선택 창고와 장비 정비를 진행할 수 있습니다. 숙련 기술을 정비하고 남은 적과 선택 경로를 탐험할 수 있습니다. 이후 캠페인은 개발 중입니다.');
}
