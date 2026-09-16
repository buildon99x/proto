/**
 * 티어 사다리 — 큐레이션과 점검 도구가 **같은 표**를 읽어야 한다.
 *
 * 전에는 `curate-stages.ts` 와 `course-map/stats.ts` 가 각자 목표 공식을 들고 있었고,
 * 큐레이션이 사다리를 옮긴 뒤 점검표의 "편차" 열이 옛 목표를 기준으로 계산돼
 * 멀쩡한 스테이지가 +51ms 벗어난 것처럼 보였다. 상수를 나눠 갖지 않는다.
 *
 * 값은 공정성 하한(50ms)을 통과한 후보의 실제 분포에서 잡았다. 공식이 아니라 표인
 * 이유는 티어 4 의 도달 가능 범위가 다른 티어와 다르기 때문이다 — 티어 4 는 여유가
 * 아니라 **최난 구간의 지속 길이**로 어려워진다.
 */
export const TARGET_SLACK_MS: Record<number, number> = { 1: 200, 2: 180, 3: 150, 4: 130 };

export const targetSlackMs = (tier: number): number => TARGET_SLACK_MS[tier] ?? 150;

/** 최난 구간(최선×1.25 이내가 이어지는 길이, 월드 단위)의 티어별 요구. */
export const PEAK_RUN_RULE: Record<number, (peak: number) => boolean> = {
  1: (p) => p <= 140,
  2: (p) => p <= 140,
  3: (p) => p <= 140,
  4: (p) => p >= 250
};

/** 티어 4 만 지속형을 요구한다 — 보고서가 이 문장을 그대로 쓴다. */
export const PEAK_RUN_NOTE: Record<number, string> = {
  1: "뾰족(≤140)",
  2: "뾰족(≤140)",
  3: "뾰족(≤140)",
  4: "지속(≥250)"
};
