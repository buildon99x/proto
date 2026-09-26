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
  elite: { every: number[]; min: number; lvX: number; joyX: number } | null;
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
};

export const RULES: Rules = { ...V17 };
export function useRules(r: Rules): void { Object.assign(RULES, r); }
