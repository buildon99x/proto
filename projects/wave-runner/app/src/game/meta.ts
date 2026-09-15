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
  /**
   * **완화 없이** 클리어한 스테이지 "tier:no". 티어 지표와 코어는 오직 이것만 본다 —
   * 기록이 "그 난이도를 실제로 넘었다"를 뜻해야 하기 때문이다.
   */
  clearedStages: string[];
  /**
   * 반복 완화가 걸린 채로 통과한 스테이지. 진행(다음 티어 열기)에는 쓰이지만
   * 지표에도 코어에도 들어가지 않는다. 같은 스테이지를 완화 없이 다시 넘으면
   * 여기서 빠지고 `clearedStages` 로 승격된다.
   */
  assistedStages: string[];
  bestStageSec: Record<string, number>;
  /** Endless 최고 거리 */
  bestDistance: number;
  attempts: Record<string, number>;
  /** 스테이지별 누적 실패 횟수. 반복 완화의 입력이고, 통과하면 0 으로 돌아간다 */
  fails: Record<string, number>;
}

export const EMPTY_META: Meta = {
  cores: 0,
  presets: ["neutral"],
  axisCap: 2,
  fullPool: false,
  clearedStages: [],
  assistedStages: [],
  bestStageSec: {},
  bestDistance: 0,
  attempts: {},
  fails: {}
};

export const STAGES_PER_TIER = 3;
export const MAX_TIER = 4;

export function stageKey(tier: number, no: number): string {
  return `${tier}:${no}`;
}

/**
 * 다음 티어를 여는 데에는 완화 통과도 센다.
 *
 * 지표는 "그 난이도를 넘었는가" 이지만 **문을 여는 것은 지표가 아니라 길찾기**다.
 * 벽에 막힌 사람에게 완화를 주고 다음 티어는 잠가 두면 완화가 아무것도 풀지 못한다.
 * 대신 티어 지표(`highestTierCleared`)와 코어는 끝까지 `clearedStages` 만 본다.
 */
export function tierUnlocked(meta: Meta, tier: number): boolean {
  if (tier <= 1) return true;
  const prev = tier - 1;
  return countProgressInTier(meta, prev) >= STAGES_PER_TIER - 1;
}

/** 완화 없이 넘은 스테이지 수. 티어 지표가 읽는 값이다. */
export function countClearedInTier(meta: Meta, tier: number): number {
  let n = 0;
  for (let i = 1; i <= STAGES_PER_TIER; i += 1) {
    if (meta.clearedStages.includes(stageKey(tier, i))) n += 1;
  }
  return n;
}

/** 어떻게든 넘은 스테이지 수(완화 포함). 문을 여는 데에만 쓴다. */
export function countProgressInTier(meta: Meta, tier: number): number {
  let n = 0;
  for (let i = 1; i <= STAGES_PER_TIER; i += 1) {
    const key = stageKey(tier, i);
    if (meta.clearedStages.includes(key) || meta.assistedStages.includes(key)) n += 1;
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
  return meta.clearedStages.length > 0 || meta.assistedStages.length > 0;
}

/**
 * 스테이지 하나를 통과했을 때의 기록 갱신.
 *
 * **완화가 걸린 통과는 코어를 주지 않고 티어 지표에도 들어가지 않는다.** 그렇게
 * 하지 않으면 "티어 4 클리어" 가 무엇을 뜻하는지가 사람마다 달라지고, 지표가
 * 죽는다. 대신 진행은 열어 두고, 나중에 완화 없이 같은 스테이지를 넘으면 승격된다.
 *
 * 어느 쪽이든 실패 카운터는 0 으로 돌아간다 — 완화는 막혔을 때만 붙는 장치이고,
 * 한 번 넘은 뒤에는 다시 맨손에서 시작해야 승격을 노릴 수 있다.
 */
export function recordStageClear(
  meta: Meta,
  tier: number,
  no: number,
  sec: number,
  relief: number
): { meta: Meta; cores: number; assisted: boolean } {
  const key = stageKey(tier, no);
  const assisted = relief > 0;
  const first = !meta.clearedStages.includes(key);
  const cores = assisted || !first ? 0 : coresForStage(tier);
  return {
    assisted,
    cores,
    meta: {
      ...meta,
      cores: meta.cores + cores,
      clearedStages: assisted || !first ? meta.clearedStages : [...meta.clearedStages, key],
      assistedStages: assisted
        ? meta.assistedStages.includes(key)
          ? meta.assistedStages
          : [...meta.assistedStages, key]
        : meta.assistedStages.filter((k) => k !== key),
      // 완화 통과의 기록 시간도 남기지 않는다 — 같은 칸에 두면 무엇의 기록인지 모른다.
      bestStageSec: assisted
        ? meta.bestStageSec
        : { ...meta.bestStageSec, [key]: Math.min(meta.bestStageSec[key] ?? Number.POSITIVE_INFINITY, sec) },
      fails: { ...meta.fails, [key]: 0 }
    }
  };
}
