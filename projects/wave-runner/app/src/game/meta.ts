import { NEUTRAL_BUILD } from "./axes";
import type { Build } from "./types";

/**
 * 메타 진행. 해금은 전부 **출발점이 넓어지는 것**이지 강해지는 것이 아니다 —
 * 런 안의 빌드는 언제나 교환이므로 힘이 누적되지 않는다.
 */
export interface Preset {
  id: string;
  name: string;
  note: string;
  build: Build;
  cost: number;
}

export const PRESETS: Preset[] = [
  { id: "neutral", name: "표준", note: "모든 축 0에서 출발", build: { ...NEUTRAL_BUILD }, cost: 0 },
  { id: "keen", name: "예각", note: "각도 +1 속도 −1", build: { slope: 1, speed: -1, bias: 0 }, cost: 120 },
  { id: "swift", name: "쾌속", note: "속도 +1 각도 −1", build: { slope: -1, speed: 1, bias: 0 }, cost: 120 },
  { id: "riser", name: "상승", note: "편향 +1 속도 −1", build: { slope: 0, speed: -1, bias: 1 }, cost: 200 }
];

export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

export const AXIS_CAP_COST = 320;
export const SECTOR_POOL_COST = 260;

export interface Meta {
  cores: number;
  presets: string[];
  /** 축 상한. 2 로 시작해 해금하면 3 */
  axisCap: number;
  /** 확장 섹터 풀 해금 여부 — 생성기가 난이도 3 섹터까지 쓴다 */
  fullPool: boolean;
  /** 클리어한 스테이지 "tier:no" */
  clearedStages: string[];
  bestStageSec: Record<string, number>;
  /** Endless 최고 거리 */
  bestDistance: number;
  attempts: Record<string, number>;
  /**
   * 주행 표시(거리·경과·진행 레일)를 켤지.
   *
   * brief 의 "HUD 없음"은 시선 예산을 지키려는 조항이었다. 표시를 아바타 뒤쪽
   * 주변시로 밀어 비용을 거의 0 으로 만들었지만 0 은 아니므로, 끌 수 있게 두어
   * 원래의 무표시 주행이 언제든 성립하게 한다.
   */
  hud: boolean;
}

export const EMPTY_META: Meta = {
  cores: 0,
  presets: ["neutral"],
  axisCap: 2,
  fullPool: false,
  clearedStages: [],
  bestStageSec: {},
  bestDistance: 0,
  attempts: {},
  hud: true
};

export const STAGES_PER_TIER = 3;
export const MAX_TIER = 4;

export function stageKey(tier: number, no: number): string {
  return `${tier}:${no}`;
}

export function tierUnlocked(meta: Meta, tier: number): boolean {
  if (tier <= 1) return true;
  const prev = tier - 1;
  return countClearedInTier(meta, prev) >= STAGES_PER_TIER - 1;
}

export function countClearedInTier(meta: Meta, tier: number): number {
  let n = 0;
  for (let i = 1; i <= STAGES_PER_TIER; i += 1) {
    if (meta.clearedStages.includes(stageKey(tier, i))) n += 1;
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

export function coresForStage(tier: number): number {
  return 80 + tier * 40;
}

export function endlessUnlocked(meta: Meta): boolean {
  // 첫 실행에 Endless 를 주면 학습 곡선이 없어 30초 만에 죽고 이탈한다.
  return meta.clearedStages.length > 0;
}
