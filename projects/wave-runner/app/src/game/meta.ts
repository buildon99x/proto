import { NEUTRAL_BUILD } from "./axes";
import { DEFAULT_PAINT, PAINTS } from "./margin/palette";
import type { Paint } from "./margin/palette";
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
  /**
   * 스테이지별 최고 도달 진행률 0..1. 미클리어 스테이지의 기록 이정표가 읽는다.
   * `clearedStages` 만으로는 "어디까지 갔는가"를 알 수 없다.
   */
  bestStageProgress: Record<string, number>;
  /**
   * **최고 기록 런**의 섹터 경계 도착 시각(초) 5개. `bestStageSec` 과 반드시 같은
   * 순간에 쓴다 — 구간별 최고를 모으면 서로 양립 불가능한 빌드의 합이 되어
   * 달성 불가능한 값이 된다.
   */
  bestStageSplits: Record<string, number[]>;
  /** Endless 최고 거리 */
  bestDistance: number;
  attempts: Record<string, number>;
  /**
   * 선택한 벽 도료 id.
   *
   * **해금 목록은 저장하지 않는다.** 진행도에서 파생하므로 어긋날 상태가 없고,
   * 진행도를 내보내 옮기면 도료도 따라온다. 저장이 늘지 않는 것은 덤이다.
   */
  paint: string;
}

export const EMPTY_META: Meta = {
  cores: 0,
  presets: ["neutral"],
  axisCap: 2,
  fullPool: false,
  clearedStages: [],
  bestStageSec: {},
  bestStageProgress: {},
  bestStageSplits: {},
  bestDistance: 0,
  attempts: {},
  paint: DEFAULT_PAINT.id
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

/**
 * 도료 해금 — 진행도에서 파생한다. 코어로 살 수 없고 코어를 주지도 않는다.
 *
 * 두 경제를 붙이면 "꾸미기를 사면 해금이 느려진다"나 그 반대가 성립해, 실력으로
 * 얻어야 할 것과 취향으로 고르는 것이 한 저울에 올라간다.
 */
export function paintUnlocked(meta: Meta, paint: Paint): boolean {
  switch (paint.unlock.kind) {
    case "default":
      return true;
    case "tier":
      return countClearedInTier(meta, paint.unlock.tier) >= STAGES_PER_TIER;
    case "distance":
      return meta.bestDistance >= paint.unlock.meters;
  }
}

export function unlockedPaints(meta: Meta): Paint[] {
  return PAINTS.filter((p) => paintUnlocked(meta, p));
}

/** 저장된 도료가 아직 잠겨 있으면(진행도를 옮겨 왔을 때) 기본으로 되돌린다 */
export function activePaint(meta: Meta): Paint {
  const chosen = PAINTS.find((p) => p.id === meta.paint);
  return chosen && paintUnlocked(meta, chosen) ? chosen : DEFAULT_PAINT;
}

/** 다음 도료까지 무엇이 남았는가. 홈 화면이 한 줄로 보여준다 */
export function paintRequirement(paint: Paint): string {
  switch (paint.unlock.kind) {
    case "default":
      return "기본";
    case "tier":
      return `티어 ${paint.unlock.tier} 전부 클리어`;
    case "distance":
      return `Endless ${paint.unlock.meters}m`;
  }
}
