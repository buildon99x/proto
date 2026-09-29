/*
 * 규칙 수치 — 한곳에 모은다.
 *
 * V11은 컨셉 v1.1(docs/concept/maple-idle/msw-inc/03-systems.md) 그대로다.
 * V12는 선택 점검(notes/choice-audit.md)에서 진행 속도를 크게 가르던 선택을 고친 값이다.
 * V13은 플레이 리뷰 뒤 개선(눈금 보상·엘리트·필드 보스·첫 10분)이다.
 * V14는 첫 40분 밀도, V15는 계열 사다리, V16은 드랍 상자, V17은 사냥터·모객(규칙 v1.7)이다.
 * 게임은 V17로 돈다. 점검 스크립트만 useRules(V11~V16)로 옛 규칙을 다시 굴려 비교한다.
 */
export interface Rules {
  id: string;
  evolveNeed: number[];
  /** 진화 뒤 남은 근속을 다음 단계로 넘기는가. false면 0부터 (v1.1) */
  tenureCarry: boolean;
  /** 'share' = 던전의 퇴근을 직원 수로 똑같이 나눈다 (v1.1). 'team' = teamShare 표를 쓴다 */
  tenureSplit: 'share' | 'team';
  /** 직원 n명일 때 한 명이 받는 몫 (index = n-1) */
  teamShare: number[];
  smileHappy: number; smileLevelup: number; smileGrad: number;
  searchWait: number; busyWait: number;
  /** 빈틈 걷기 속도 (레벨업 속도 배율). 0이면 멈춰 기다리다 60분 뒤 떠난다 (v1.1) */
  gapWalk: number;
  /** 결재 조건 ② 이번 장 누적 즐거움(명·시간). null이면 동시에 즐기는 인원 (v1.1) */
  joyGoal: number[] | null;
  /** 승진 발령: 진화하면서 새 레벨에 맞는 던전으로 옮기고 빈자리를 신입으로 채운다 (v1.2) */
  promote: boolean;
  /** 퇴사 환급 비율. 0이면 퇴사 없음 (v1.1) */
  releaseRefund: number;
  seatCost: number[]; slotCost: number[]; plotCost: number;
  /** 챕터별 자리·슬롯 비용 배율 */
  costCurve: number[];
  /** 챕터별 스마일 수입 배율 (즐거운 모험가·레벨업). 후반 스마일 과잉(컨셉 D1)을 누른다 */
  incomeCurve: number[];
  /** 결재 ② 막대 눈금 보상 (v1.3, 2장부터). null이면 없다 */
  joyMarks: { at: number[]; from: number } | null;
  /** 5장 결재 ③에 "슬리피우드 식구가 일하는 던전 1곳"을 더한다 (v1.3) */
  nativeCond: boolean;
  /** 입사 첫날 버프 길이 (월드 분). 레벨업·근속 ×30, 분당 1명 도착 */
  buffMin: number;
  /** 튜토리얼 "가로 = 레벨" 단계(누를 곳이 없다)의 월드 배속. 1이면 없다 */
  growBoost: number;
  /**
   * 엘리트 (v1.3, R5 확장): 월드 퇴근 누적이 장별 문턱(every)을 넘으면 한 던전 직원이 min분 동안 엘리트가 된다.
   * 그 던전의 즐거운 모험가는 레벨업 ×lvX, ② 누적 ×joyX. 직원 레벨은 그대로(P2). null이면 없다
   */
  /** seats·tenureX (1.15.0): 엘리트 동안 그 던전 자리 +seats, 엘리트 직원 근속 ×tenureX. 없으면 0·1 (옛 규칙) */
  elite: { every: number[]; min: number; lvX: number; joyX: number; seats?: number; tenureX?: number } | null;
  /**
   * 필드 보스 (v1.3, R5 확장): 2장부터 ② 50% 눈금에서 찾아온다. wait분 안에 초대하지 않으면 자동 초대.
   * 방문 중 그 던전 자리 +seats, 월드 도착 ×arriveX, 그 던전 ② ×joyX. 퇴근 need[장]회면 토벌(최대 max분, 실패 없음).
   * 토벌하면 도감 칸 + 이번 장 ② 목표의 bonus만큼. 스마일 보상은 없다. null이면 없다
   */
  fieldBoss: { need: number[]; wait: number; max: number; seats: number; arriveX: number; joyX: number; bonus: number } | null;
  /**
   * 첫 10분 한 바퀴 (v1.3): 입사 버프가 결재 ② 누적에도 붙고(×30), 입사 선물에 개업권 1장,
   * 1장 결재 선물로 엘리니아 첫 계열 채용권 + 개업권 1장. 1장을 첫 세션 안에 끝낸다
   */
  firstLoop: boolean;
  /**
   * 도착 (v1.4): 배속(입사 버프) 대신 사람 수로 첫 40분을 채운다. 첫 hold분은 분당 rate명이 party명씩 고른 박자로 오고,
   * fade분까지 기본 도착률로 줄어든다. 그동안 mid 비율은 열린 길 가운데 레벨로 온다(길 전체에 수요가 퍼진다).
   * tip: 붐비는 동안 스마일 수입 배율(첫날 손님이 팁을 더 준다). 도착률과 같이 fade분까지 1로 줄어든다.
   * null이면 v1.3 (입사 버프 동안 분당 1명, 그 뒤 기본)
   */
  arrive: { rate: number; hold: number; fade: number; party: [number, number]; mid: number; tip: number } | null;
  /**
   * 구간 개방 (v1.4): 장마다 길 끝이 ends 순서로 늘어난다. 그 장 퇴근 누적이 kills[장] × grow^(연 구간 수)를 넘고
   * 지금 길이 이어져 있으면 다음 구간이 열린다. ends가 null인 장은 처음부터 끝까지. null이면 v1.3 (장 전체)
   */
  zones: { ends: (number[] | null)[]; kills: number[]; grow: number } | null;
  /** 채용비 = 기본 레벨 × hireUnit */
  hireUnit: number;
  /** 헤네시스·엘리니아 사냥터 +2곳씩 (v1.4, content.ts의 extra 부지) */
  morePlots: boolean;
  /** 새 던전의 기본 자리 */
  seatBase: number;
  /** 헤네시스·엘리니아 계열 +2종씩 (v1.5, content.ts의 extra 계열). 2장부터 채용한다 */
  moreSpecies: boolean;
  /** 챕터별 개업 비용 배율 (v1.5). null이면 1 */
  plotCurve: number[] | null;
  /**
   * 드랍 상자 (v1.6): from장부터 월드 퇴근이 need[장]회 쌓이면, 그동안 퇴근이 가장 많았던 던전 앞에 상자가 떨어진다.
   * 드랍 이벤트 중인 던전의 퇴근은 ×2로 센다. 던전마다 하나, 월드에 max개까지. 쥔 무료권(채용권 + 이벤트권)이 hold장 이상이어도
   * 떨어지지 않는다(권을 써야 다시 떨어진다). 막혀 있는 동안은 쌓지 않는다.
   * 열 때 채용권(지금 줄·빈틈에 맞는 계열)과 이벤트권 가운데 하나를 고른다. 스마일은 주지 않는다. null이면 없다
   */
  drop: { need: number[]; max: number; hold: number; from: number } | null;
  /**
   * 사냥터 값 (v1.7, G1): 부지마다 기본 자리(content.ts seats: 8 · 12 · 16, 지역 합은 그대로)와 식구 계열이 있다.
   * 식구가 자기 사냥터에서 일하면 근속 ×homeX. 지역별 규칙이 아니라 부지의 값이다(계열 특성과 같은 자리). null이면 모든 부지가 seatBase, 식구 없음 (v1.6)
   */
  grounds: { homeX: number } | null;
  /**
   * 모객 (v1.7, G2, R5 확장): 떠난 손님은 사라지지 않고 "돌아올 수 있는 손님" 풀에 남는다(레벨별, 상한 pool. 줄지 않는다 — P5).
   * 매니저가 거는 월드 이벤트 둘. 둘 다 동시 이벤트 수 한 자리를 쓴다(던전 이벤트와 겨룬다). 한 번에 하나.
   *   복귀(return): min분 동안 시간당 rate명이 풀에서 자기 레벨로 돌아온다(자리 있는 던전이 덮는 레벨부터). 비용 cost × 장
   *   신규(fresh): 거는 순간 burst명이 입구로 오고, min분 동안 기본 도착률 ×x. 첫날 붐빔(파티 박자)은 곱하지 않는다 — 첫 40분 줄이 터진다. 비용 cost × 장
   * 모객권(ticket): 1장 결재 선물 gift장, awayMin분 넘게 떠났다 돌아오면 1장(쥔 모객권이 hold장 미만일 때). 쓰면 비용 0.
   * 승진 소식(evolveBurst): 직원이 진화하면 그 던전의 새 구간에 맞는 떠난 손님이 빈자리만큼 최대 evolveBurst명 바로 돌아온다("진화했다 → 손님이 돌아온다", F2와 G2를 잇는다).
   * 놓쳐도 잃는 것이 없다. 타이머 압박·한정 판매는 없다. null이면 없다 (v1.6)
   */
  guests: { pool: number; return: { min: number; rate: number; cost: number }; fresh: { min: number; x: number; burst: number; cost: number; /** 신규 모객 자동 쉼 (1.10.0 실험, 기본 0 = 안 쉰다): 입구 줄(Lv 1~3 기다리는 손님)이 이만큼이면 ×x를 쉰다. 6으로 재 보니 첫 40분 줄은 그대로고 가벼운 플레이어의 4장 반복만 늘어 채택하지 않았다 */ pauseAt: number }; ticket: { gift: number; awayMin: number; hold: number; /** 1.15.0: 떠난 손님이 이만큼 쌓이면 1장 (있으면 awayMin 대신). 떠난 시간이 아니라 떠난 손님이 모객의 이유가 된다 */ left?: number }; evolveBurst: number; /** 오렌·봇 순서 (1.10.0 실험): 모객을 진화 앞에 둘지. 'after'가 v1.7 기본. */ order: 'after' | 'before' } | null;
  /**
   * 도감 돌파 보상 (1.10.0 실험, 기본 null = 없다): 도감이 at[i] 비율에 처음 닿으면 무료 이벤트권 event장 + 모객권 recruit장.
   * 진화 보류 성향의 −21.9%(choice-audit L17)를 규칙 되맞춤 없이 좁히려던 장치였으나, 1분 걸음 달력을 한 자리도 움직이지 않았다(권이 쌓여 쓰이지 않는다 — 드랍 상자 §4와 같은 교훈). DEX_MILE_TRIAL로 남긴다
   */
  dexMile: { at: number[]; event: number; recruit: number } | null;
  /**
   * 승진한 직원의 던전 (1.11.0, 기본 null = 없다): 그 던전의 ② 누적 ×(1 + x × 직원 평균 진화 횟수). 레벨은 그대로(P2).
   * 진화 보류 성향이 표준보다 21.9% 빨랐던 이유는 진화가 ②를 한 번도 당기지 않았기 때문이다(choice-audit §14, L17). 진화를 미루면 잃는 것이 생긴다
   */
  stageJoy: { x: number } | null;
  /**
   * 초반 지역의 자리 한 칸 더 (1.11.0, 기본 null = 없다): regions 지역 사냥터는 자리 확장을 costs 칸만큼 더 산다(값마다 한 칸, 장 배율 적용).
   * 첫 40분에 입구 던전과 헤네시스 끝 던전이 최대 자리(24석)에 닿아 줄 40명이 서고, 부지도 다 차 40~50분에 둘 수가 3뿐이었다(choice-audit §14, L16·L18)
   */
  earlySeat: { regions: number[]; costs: number[] } | null;
  /**
   * 본사 임원 발령 (1.13.0, 기본 null = 없다): from장부터 최종 단계 직원을 본사 임원으로 올려 보낸다. 직원은 던전을 떠나고,
   * 월드 전체의 ② 누적이 ×(1 + max × (1 − r^임원 수)) — 첫 임원 +2.5%, 열 명이면 약 +16%, 끝없이 늘지 않는다.
   * 4~5장에 진화를 끝낸 직원이 하루 1~2명씩 쌓여 둘 곳 없는 근속만 늘었다. 그 직원으로 두는 결정을 만든다(choice-audit §16)
   */
  /**
   * 엘리트 지명 (1.14.0, 기본 null = 저절로 추첨): 엘리트 준비가 되면 매니저가 어느 던전에서 맞을지 고른다. wait분 안에 고르지 않으면 지금처럼 저절로 뽑힌다.
   * 기다린 동안 쌓인 퇴근은 다음 엘리트로 넘어가 떠나 있어도 엘리트 수가 줄지 않는다. 접속이 잦은 사람의 5장 후반에 둘 것이 이벤트뿐이었다(choice-audit §17)
   */
  elitePick: { wait: number } | null;
  /** 진화 전망 (1.15.0): 오렌·▲·봇이 12시간 뒤 ②가 hours시간 넘게 늦어지는 진화를 권하지 않는다. 없으면 1.14.0까지처럼 빈틈만 본다 */
  evolveOutlook?: { hours: number } | null;
  exec: { from: number; max: number; r: number; /** 최종 단계에 오른 뒤 다시 채워야 하는 근속. 모두 보내면 길 끝을 맡을 직원이 사라져 엔딩을 못 봤다 */ tenure: number } | null;
}

export const V11: Rules = {
  id: 'v1.1',
  evolveNeed: [2000, 12000, 45000],
  tenureCarry: false,
  tenureSplit: 'share',
  teamShare: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5],
  smileHappy: 0.25, smileLevelup: 2, smileGrad: 20,
  searchWait: 60, busyWait: 30,
  gapWalk: 0,
  joyGoal: null,
  promote: false,
  releaseRefund: 0,
  seatCost: [500, 1000, 2000], slotCost: [1000, 3000], plotCost: 1000,
  costCurve: [1, 1, 1, 1, 1],
  incomeCurve: [1, 1, 1, 1, 1],
  joyMarks: null,
  nativeCond: false,
  buffMin: 15,
  growBoost: 1,
  elite: null,
  fieldBoss: null,
  firstLoop: false,
  arrive: null,
  zones: null,
  hireUnit: 100,
  morePlots: false,
  seatBase: 8,
  moreSpecies: false,
  plotCurve: null,
  drop: null,
  grounds: null,
  guests: null,
  dexMile: null,
  stageJoy: null,
  earlySeat: null,
  elitePick: null,
  exec: null,
};

export const V12: Rules = {
  ...V11,
  id: 'v1.2',
  tenureCarry: true,
  gapWalk: 0.25,
  joyGoal: [300, 3000, 20000, 32000, 34000],
  promote: true,
  releaseRefund: 0.5,
  costCurve: [1, 1.5, 2.5, 4, 6],
  incomeCurve: [1, 0.6, 0.35, 0.22, 0.15],
};

/**
 * V13은 플레이 리뷰(notes/play-review) 뒤의 개선이다. 근거와 수치는 notes/improvement-plan.md와 choice-audit §7.
 */
export const V13: Rules = {
  ...V12,
  id: 'v1.3',
  // F1: ② 막대 25·50·75%에 보상 칸 — 채용권 · 필드 보스 · 무료 이벤트권 2장
  joyMarks: { at: [0.25, 0.5, 0.75], from: 2 },
  // F2: 5장 새 계열(드레이크·이블아이)이 한 번도 쓰이지 않았다 → 결재 ③에 슬리피우드 식구 던전 1곳
  nativeCond: true,
  // F6: 튜토리얼 "가로 = 레벨" 단계를 배속으로 돌리므로 버프가 대본 끝까지 남게 15 → 20분
  buffMin: 20,
  // F6: 계획은 ×3이었지만 실측(playreview:ui)에서 누를 곳 없는 구간이 59초 → ×5로 약 37초, 첫 빈틈 약 1:00
  growBoost: 5,
  // E: 엘리트는 약 3시간에 한 번(표준 봇 장별 월드 시간당 퇴근 960 · 4,200 · 6,600 · 8,300 · 10,000 기준)
  elite: { every: [3000, 12000, 20000, 25000, 30000], min: 60, lvX: 1.5, joyX: 2 },
  // E: 필드 보스는 장마다 한 번. 토벌까지 평소 규모 던전이면 약 3시간
  fieldBoss: { need: [0, 2500, 3000, 3000, 3000], wait: 180, max: 480, seats: 8, arriveX: 1.5, joyX: 2, bonus: 0.05 },
  // T: 1장은 첫 세션 안에 승진 발령 → 결재 도장 → 새 지역까지. ② 목표는 버프 ×30 기준
  firstLoop: true,
  joyGoal: [30, 3000, 21500, 34500, 36500],
};

/**
 * V14는 첫 40분 경험 밀도 개선이다. 배속을 없애고 사람 수·구간·획득량으로 10~20초마다 무언가 일어나게 한다.
 * 근거와 수치는 notes/tempo-v14.md와 tools/cadence.ts.
 */
export const V14: Rules = {
  ...V13,
  id: 'v1.4',
  // 입사 버프(레벨업·근속 ×30)를 없앤다. 한 사람의 속도는 어디서나 같다
  buffMin: 0,
  growBoost: 1,
  // 파티 1~2명이 20초마다 (분당 4.5명). 40분부터 90분까지 기본 도착률(시간당 6명)로 줄어든다
  arrive: { rate: 4.5, hold: 40, fade: 90, party: [1, 2], mid: 0.85, tip: 12 },
  zones: { ends: [[10, 15], [20, 25, 30], null, null, null], kills: [40, 150, 0, 0, 0], grow: 1.6 },
  // 첫 진화는 금방(새내기), 그다음부터는 길게
  evolveNeed: [60, 12000, 45000],
  hireUnit: 20,
  // 첫 두 장은 자리·슬롯이 싸다 (배속이 없으니 결정 하나하나를 싸게). 3장부터는 v1.3 그대로
  costCurve: [0.3, 0.3, 2.5, 4, 6],
  seatBase: 12,
  plotCost: 500,
  morePlots: true,
  joyGoal: [2, 3600, 28000, 45000, 47500],
  // 자리·사냥터가 늘어 즐거운 인원이 는 만큼 3~5장 수입을 낮춘다. 그대로면 표준 봇의 스마일 최고가 약 38만(v1.3 같은 봇 약 13만)
  incomeCurve: [1, 0.6, 0.2, 0.12, 0.08],
};

/**
 * V15는 계열 사다리다. 헤네시스·엘리니아에 계열을 둘씩 더해(지역당 4종) 붐빔을 자리 확장만이 아니라
 * "다른 레벨 계열로 던전을 하나 더"로도 풀게 한다. 근거와 수치는 notes/ladder-v15.md.
 */
export const V15: Rules = {
  ...V14,
  id: 'v1.5',
  moreSpecies: true,
  // 줄을 나누는 새 던전이 자리 확장과 겨룰 수 있게 2장 개업비를 절반으로 (엘리니아 1,000 → 500, 헤네시스 500 → 250)
  plotCurve: [1, 0.5, 1, 1, 1],
};

/**
 * V16은 드랍 상자다. 자리 확장과 겹치지 않는 결정을 하나 더한다. 근거와 수치는 notes/drop-v16.md.
 */
export const V16: Rules = {
  ...V15,
  id: 'v1.6',
  // 첫 40분(2장)은 약 3분에 하나. 3장부터는 장별 퇴근 속도에 맞춰 체크인 10분에 한두 개.
  // 월드에 하나만: 떠나 있으면 상자 하나가 기다린다. 셋이면 체크인마다 셋을 열어 이벤트권이 수백 장 쌓였다(drop-v16 §4)
  // 쥔 무료권이 3장이면 멈춘다: 하루 체크인마다 상자를 열면 한 달에 권이 약 90장 들어와, 무엇을 주든 60~75장이 쓰이지 않고 쌓였다(drop-v16 §4)
  drop: { need: [0, 400, 1000, 1400, 1400], max: 1, hold: 3, from: 2 },
};

/**
 * V17은 규칙 v1.7(1.5.0부터)이다. 사냥터 운영의 실감(G1), 모객(G2), 끊김 없는 여정(G3)의 규칙 필드가 여기에 쌓인다.
 * 새 필드는 null·false가 기본이라 V16이 v1.6을 그대로 재현한다. 근거와 수치는 notes/plan-v17.md.
 */
export const V17: Rules = {
  ...V16,
  id: 'v1.7',
  // G1 사냥터 값: 부지마다 자리(3장부터 8·12·16)와 식구(근속 ×1.1). 어느 부지를 열지, 누구를 어디에 둘지가 부지마다 달라진다
  grounds: { homeX: 1.1 },
  // G2 모객 (1.8.0): 떠난 손님이 자원이 된다. 값은 GUESTS_V17
  get guests() { return GUESTS_V17; },
  dexMile: null,
  // 승진한 직원의 던전 (1.11.0): ② ×(1 + 0.1 × 평균 진화 횟수). 표준이 D26.9로 당겨졌고 아래 초반 자리까지 더해 2~5장 ② 목표를 ×1.23(1.9.0 대비) 되맞췄다(choice-audit §14)
  stageJoy: { x: 0.1 },
  // 1.13.0: 임원 승진(급하지 않은 진화 앞)이 표준을 당겨 4~5장을 ×1.25 (choice-audit §16)
  // 1.15.0: 손님 없는 던전 다시 열기(−2.7일)·엘리트 자리/근속·진화 전망이 표준을 D24.9까지 당겨 3~5장을 되맞췄다
  //         (34,500 · 69,300 · 73,100 → 36,000 · 76,000 · 88,000. 표준 D29.4, 진화 보류 +12% — choice-audit §18)
  joyGoal: [2, 4400, 36000, 76000, 88000],
  // 초반 지역 자리 한 칸 더 (1.11.0): 헤네시스·엘리니아 사냥터는 24 → 28석. 첫 40분 줄 40 → 26, 40~50분 둔 수 3 → 6(choice-audit §14)
  earlySeat: { regions: [1, 2], costs: [2000] },
  // 임원 승진 (1.13.0): 4장부터 최종 단계에 근속 20,000을 다시 채운 직원을 올려 보내면 월드 ② ×(1 + 0.25 × (1 − 0.9^n)). 길 끝을 맡는 직원은 남는다. 오렌·봇은 월드 ②를 0.5% 넘게 올릴 때만 권한다(choice-audit §16)
  exec: { from: 4, max: 0.25, r: 0.9, tenure: 20000 },
  // 엘리트 지명 (1.14.0): 준비된 엘리트는 3시간 동안 지명을 기다린다. 엘리트는 드물게·크게(간격 ×2, 두 시간): 켜져 있는 총 시간은 같고,
  // 지명이 체크인마다 끼어 판에 박힌 탭이 되지 않게 한다(간격 그대로면 표준 4장 같은 수 반복 7, choice-audit §17)
  elitePick: { wait: 180 },
  // 1.15.0 진화 전망 (플레이 리뷰 10절 B1): 빈틈만 보던 진화 권유가 붐빔·손님 없는 던전을 만들어 12시간 뒤 😊가 크게 빠졌다.
  // 월드를 복제해 12시간 굴린 ②가 2시간 넘게 늦어지는 진화는 오렌·▲·봇이 권하지 않는다 (sim.evolveHurts).
  // 0.5시간이면 표준이 2일 더 당겨져 진화 보류 성향과 +26%로 벌어졌다 (choice-audit §18)
  evolveOutlook: { hours: 2 },
  // 1.15.0 엘리트 지명의 깊이 (플레이 리뷰 10절 B3): 지명 카드 넷의 배율이 모두 같아 답이 "손님이 가장 많은 곳" 하나였다.
  // 이제 그 던전 자리 +8(줄 선 곳에 이득), 엘리트 직원 근속 ×3(진화·임원이 가까운 직원에 이득)이 붙어 카드마다 이득의 종류가 다르다
  elite: { every: [6000, 24000, 40000, 50000, 60000], min: 120, lvX: 1.5, joyX: 2, seats: 8, tenureX: 3 },
};
/** G2 모객 값: 복귀는 4시간 동안 시간당 6명(빈자리가 있을 때만), 신규는 거는 순간 3명 + 4시간 동안 기본 도착 ×2. 비용은 장마다 오른다(복귀 200 · 신규 150 × 장). 모객권은 1장 결재 선물 1장, 6시간 넘게 떠났다 오면 1장(2장까지) */
export const GUESTS_V17: NonNullable<Rules['guests']> = { pool: 300, return: { min: 240, rate: 6, cost: 200 }, fresh: { min: 240, x: 2, burst: 3, cost: 150, pauseAt: 0 }, ticket: { gift: 1, awayMin: 360, hold: 2, left: 60 }, evolveBurst: 8, order: 'after' };
/** 1.10.0 실험값: 도감 돌파 보상 (채택하지 않았다). 비교용 */
export const DEX_MILE_TRIAL: NonNullable<Rules['dexMile']> = { at: [0.5], event: 2, recruit: 1 };
/** 1.10.0 실험값: 신규 자동 쉼 6 (채택하지 않았다 — 첫 40분 줄은 그대로고 가벼운 플레이어의 4장 반복이 6 → 11). 비교용 */
export const GUESTS_V17_PAUSE: NonNullable<Rules['guests']> = { ...GUESTS_V17, fresh: { ...GUESTS_V17.fresh, pauseAt: 6 } };

export const RULES: Rules = { ...V17 };
export function useRules(r: Rules): void { Object.assign(RULES, r); }
