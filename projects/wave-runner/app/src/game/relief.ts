/**
 * 반복 완화 — 같은 스테이지에서 실패가 쌓이면 여유가 **점진적으로** 넓어진다.
 *
 * 난이도 선택 메뉴가 아니다. 입력도 HUD도 팝업도 늘리지 않고, 입력은 오직
 * "이 스테이지에서 몇 번 죽었는가" 하나다. 그래서 완화는 고르는 것이 아니라
 * **쌓이는 것**이고, 벽에 부딪힌 사람에게만 붙는다.
 *
 * 레버는 둘이고 둘 다 코스의 형상을 건드리지 않는다.
 *
 *  1. **히트박스 축소** — 통로 중심선도 장애물 좌표도 그대로인 채 여유만 넓어진다.
 *     아바타가 작아지므로 글자 없이 보인다. 단, 상한이 낮다(측정: 반지름을 절반
 *     넘게 줄여도 여유는 +20~30ms 뿐이다 — ΔW = 2Δr 이므로 원리적으로 그렇다).
 *  2. **통로 완화** — 통로를 중심선 기준으로 벌린다. `squeezeFor` 의 역방향이다.
 *     중심선·장애물·셔터·게이트 제안이 전부 그대로이므로 외운 주행선이 그대로
 *     살아 있고, 바뀌는 것은 벽까지의 여백뿐이다.
 *
 * 1번만으로는 티어 벽을 넘기지 못한다는 것이 측정으로 나왔으므로 둘을 같은
 * 단계 k 로 함께 민다. 자세한 수치는 notes/difficulty-relief.md 와
 * tests/verify/relief-curve.ts 에 있다.
 */

/**
 * 완화 단계 상한.
 *
 * 측정으로 정했다. k=7 에서 티어4 최선 경로의 여유가 228ms 가 되어 **무완화
 * 티어1(211~221ms)을 넘어선다** — 가장 어려운 것을 완화한 결과가 가장 쉬운 것을
 * 그냥 푸는 것보다 헐거워지면 그건 완화가 아니라 난이도 삭제다. k=6 에서는
 * 219ms 로 티어1 구간 안에 머문다.
 */
export const RELIEF_MAX = 6;

/** 이 횟수까지의 실패에는 아무 일도 일어나지 않는다. 0.5초 재시도 루프가 이 게임이다. */
export const RELIEF_GRACE = 5;

/** 유예를 넘긴 뒤 몇 번 더 실패해야 한 단계 오르는가. */
export const RELIEF_STEP = 3;

const RADIUS_PER_LEVEL = 0.0625;
const WIDEN_PER_LEVEL = 0.028;

/**
 * 이 단계부터 게이트 제안 풀을 좁힌다.
 *
 * 여유를 넓히는 것(위 둘)은 **최선 경로**를 올리지만 최악 경로는 못 끌어올린다 —
 * 측정하면 여유 3ms 짜리 경로가 상한에서도 74ms 에 머문다. 최악 경로는 형상이
 * 아니라 **선택**의 문제이기 때문이다. 그래서 상위 단계에서는 제안 풀을 6쌍에서
 * 3쌍으로 좁혀 빌드를 극단으로 미는 교환을 뺀다. 측정: 최악 경로 3ms → 117ms.
 */
export const RELIEF_TEMPER_AT = 4;

/** 좁혔을 때 남기는 제안 쌍의 수. 2 로 내리면 양쪽이 확정되어 게이트가 묻는 것이 사라진다. */
export const TEMPERED_POOL = 3;

export interface ReliefShape {
  /** 히트박스 반지름 배율 */
  radiusScale: number;
  /** 통로 높이 배율. 1 이면 그대로 */
  widen: number;
  /** 게이트 제안 풀에서 남길 쌍의 수. 0 이면 제한 없음 */
  offerPool: number;
}

/** 실패 횟수 → 완화 단계. 계단식이라 한 판 안에서는 절대 바뀌지 않는다. */
export function reliefLevel(fails: number): number {
  if (fails < RELIEF_GRACE) return 0;
  return Math.min(RELIEF_MAX, 1 + Math.floor((fails - RELIEF_GRACE) / RELIEF_STEP));
}

/** 단계 k 에서 몇 번의 실패가 필요한가(표시·검증용). */
export function failsForLevel(level: number): number {
  if (level <= 0) return 0;
  return RELIEF_GRACE + (Math.min(RELIEF_MAX, level) - 1) * RELIEF_STEP;
}

/**
 * 단계 → 실제 계수. 상한은 여기가 아니라 `reliefLevel` 이 건다 —
 * 검증 스크립트가 "상한을 한 칸 넘기면 어떻게 되는가"를 실제로 재야 하기 때문이다.
 */
export function reliefShape(level: number): ReliefShape {
  const k = Math.max(0, Math.round(level));
  return {
    radiusScale: 1 - RADIUS_PER_LEVEL * k,
    widen: 1 + WIDEN_PER_LEVEL * k,
    offerPool: k >= RELIEF_TEMPER_AT ? TEMPERED_POOL : 0
  };
}
