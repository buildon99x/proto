/*
 * 규칙 수치 — 한곳에 모은다.
 *
 * V11은 컨셉 v1.1(docs/concept/maple-idle/msw-inc/03-systems.md) 그대로다.
 * V12는 선택 점검(notes/choice-audit.md)에서 진행 속도를 크게 가르던 선택을 고친 값이다.
 * 게임은 V12로 돈다. 점검 스크립트만 useRules(V11)로 옛 규칙을 다시 굴려 비교한다.
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

export const RULES: Rules = { ...V12 };
export function useRules(r: Rules): void { Object.assign(RULES, r); }
