import { DEFAULT_RUNNER, RUNNERS } from "./runners";
import type { RunnerId } from "./types";

/**
 * 메타 진행. 해금은 전부 **출발점이 넓어지는 것**이지 강해지는 것이 아니다 —
 * 런 안의 빌드는 언제나 교환이므로 힘이 누적되지 않는다.
 */
export const AXIS_CAP_COST = 320;
export const SECTOR_POOL_COST = 260;

/**
 * 기록은 **기체별로 나뉜다.**
 *
 * 기체가 다르면 같은 스테이지도 다른 문제다 — 프로브가 그걸 수치로 보였다(같은 협곡에서
 * 예봉 +64%, 둔각 −27%). 하나로 합치면 "최고 클리어 티어"가 어떤 기체로 깼는지에 따라
 * 다른 것을 가리키게 되어 진행 지표로 쓸 수 없다.
 *
 * 티어 해금만은 기체를 보지 않는다. 그러지 않으면 새 기체를 고를 때마다 티어 1 부터 다시
 * 뚫어야 해서 선택이 벌이 된다.
 */
export interface Meta {
  version: 3;
  cores: number;
  /** 마지막에 고른 기체 */
  runner: RunnerId;
  /** 축 상한. 2 로 시작해 해금하면 3 */
  axisCap: number;
  /** 확장 섹터 풀 해금 여부 — 생성기가 난이도 3 섹터까지 쓴다 */
  fullPool: boolean;
  /** 클리어한 스테이지 "runner:tier:no" */
  clearedStages: string[];
  /** "runner:tier:no" -> 초 */
  bestStageSec: Record<string, number>;
  /** 기체별 Endless 최고 거리 */
  bestDistance: Record<string, number>;
  /** "runner:tier:no" -> 시도 수 */
  attempts: Record<string, number>;
}

export const EMPTY_META: Meta = {
  version: 3,
  cores: 0,
  runner: DEFAULT_RUNNER.id,
  axisCap: 2,
  fullPool: false,
  clearedStages: [],
  bestStageSec: {},
  bestDistance: {},
  attempts: {}
};

export const STAGES_PER_TIER = 3;
export const MAX_TIER = 4;

export function stageKey(runner: string, tier: number, no: number): string {
  return `${runner}:${tier}:${no}`;
}

/** 어느 기체로든 클리어했는가. 티어 해금과 목록 표시가 이걸 본다. */
export function clearedByAny(meta: Meta, tier: number, no: number): RunnerId[] {
  return RUNNERS.filter((r) => meta.clearedStages.includes(stageKey(r.id, tier, no))).map((r) => r.id);
}

export function tierUnlocked(meta: Meta, tier: number): boolean {
  if (tier <= 1) return true;
  return countClearedInTier(meta, tier - 1) >= STAGES_PER_TIER - 1;
}

/** 티어 해금은 기체를 보지 않는다 — 새 기체마다 티어 1 을 다시 뚫게 하면 선택이 벌이 된다. */
export function countClearedInTier(meta: Meta, tier: number): number {
  let n = 0;
  for (let i = 1; i <= STAGES_PER_TIER; i += 1) {
    if (clearedByAny(meta, tier, i).length > 0) n += 1;
  }
  return n;
}

export function highestTierCleared(meta: Meta): number {
  let best = 0;
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    if (countClearedInTier(meta, tier) > 0) best = tier;
  }
  return best;
}

/** Endless 는 거리에 비례해, Stage 는 최초 클리어에만 지급한다 — 반복 파밍을 막는다. */
export function coresForDistance(distance: number): number {
  return Math.floor(distance / 60);
}

/** 기체별 최고 거리 중 가장 먼 것. 홈 화면의 한 줄 표시용. */
export function bestDistanceOverall(meta: Meta): number {
  const values = Object.values(meta.bestDistance);
  return values.length ? Math.max(...values) : 0;
}

export function coresForStage(tier: number): number {
  return 80 + tier * 40;
}

export function endlessUnlocked(meta: Meta): boolean {
  // 첫 실행에 Endless 를 주면 학습 곡선이 없어 30초 만에 죽고 이탈한다.
  return meta.clearedStages.length > 0;
}
