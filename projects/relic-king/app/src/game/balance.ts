import type { SiteId, Tier } from "./types";

/**
 * 밸런스 상수 전부를 한 곳에 둔다. 프로토타입 배속으로 잡혀 있다 —
 * 전체 게임 목표치(20~40시간)가 아니라 한 세션(40~60분)에 루프 전체가
 * 드러나도록 시간 상수를 압축했다. 근거와 검증 기준은 eval.md.
 */

export const LAYERS_PER_SITE = 12;

export const TIER_NAME = ["흔함", "희귀", "진귀", "국보", "유일"] as const;
export const TIER_VALUE = [12_000, 380_000, 9_000_000, 260_000_000, 6_000_000_000] as const;
/**
 * 종(species) 1개당 세계 재고. 현실의 현존 개체 수를 그대로 쓴다(notes/artifacts-dataset.md).
 * "종당" 임을 이름에 못박는다 — economy.md의 `TIER3_SEASON_SUPPLY`가 이 값과 같은 뜻인데도
 * 이름 때문에 "시즌 전체 공급량"으로 잘못 읽혀 세계 총가치 표가 24배 어긋난 적이 있다
 * (notes/decisions.md G23/A9).
 */
export const TIER_STOCK_PER_SPECIES = [Infinity, 2_000, 60, 6, 1] as const;
export const TIER_MIN_LAYER = [1, 2, 5, 8, 10] as const;

export type SiteDef = {
  id: SiteId;
  name: string;
  anchor: string;
  unlockCost: number;
  /** 층 비용 계수 — 높을수록 파기 어렵다 */
  layerCostMod: number;
  /** 드랍 임계 계수 — 낮을수록 자주 나온다 */
  dropMod: number;
  /** 층별 시대 라벨 (1층 = 가장 얕고 최근) */
  eras: string[];
  /** 티어 가중 보정 (곱) */
  tierBias: [number, number, number, number, number];
};

export const SITES: SiteDef[] = [
  {
    id: "korea",
    name: "한반도",
    anchor: "경주 고분군",
    unlockCost: 0,
    layerCostMod: 1,
    dropMod: 1,
    eras: [
      "조선 후기", "조선 전기", "고려 후기", "고려 전기",
      "통일신라", "남북국 초", "신라 전성", "신라 중고",
      "가야", "삼국 초", "원삼국", "초기 철기"
    ],
    tierBias: [1, 1, 1, 1, 1]
  },
  {
    id: "egypt",
    name: "이집트",
    anchor: "룩소르 왕가의 계곡",
    unlockCost: 5_000_000,
    layerCostMod: 1.4,
    dropMod: 1.15,
    eras: [
      "로마 이집트", "프톨레마이오스", "말기 왕조", "제3중간기",
      "신왕국 말", "람세스 시대", "투트모세 시대", "제2중간기",
      "중왕국", "제1중간기", "고왕국", "초기 왕조"
    ],
    tierBias: [0.85, 1, 1.2, 1.6, 1.5]
  },
  {
    id: "rome",
    name: "로마",
    anchor: "폼페이 유적",
    unlockCost: 300_000_000,
    layerCostMod: 1.15,
    dropMod: 0.8,
    eras: [
      "중세 초", "서로마 말", "제정 후기", "제정 중기",
      "5현제 시대", "율리우스 왕조", "제정 초", "공화정 말",
      "공화정 중기", "포에니 전쟁기", "공화정 초", "왕정기"
    ],
    tierBias: [1.15, 1.1, 0.95, 0.8, 0.9]
  }
];

export const SITE_BY_ID: Record<SiteId, SiteDef> = Object.fromEntries(
  SITES.map((s) => [s.id, s])
) as Record<SiteId, SiteDef>;

/** 층 L 돌파에 필요한 진척. 깊이가 이 게임의 페이싱 척추다 */
export function layerCost(site: SiteId, layer: number): number {
  return 300 * Math.pow(2.45, layer - 1) * SITE_BY_ID[site].layerCostMod;
}

/**
 * 진척 1당 기대 수입(₩). 드랍 임계를 이 값에 묶어 두면 깊이가 돈을 불려 주지 않는다.
 * **깊이는 유물의 희소성을 열지, 수입을 늘리지 않는다** — 수입은 발굴력에서만 나온다.
 * 이게 없으면 깊이 × 발굴력이 곱해져 방치형 특유의 폭주가 난다(시뮬로 확인).
 */
export const PROGRESS_VALUE = 1000;
/** 깊이가 주는 완만한 수입 보너스. 1층 대비 12층이 약 2.3배 */
export const DEPTH_INCOME_BONUS = 0.12;

/** 층 L에서 유물 1롤에 필요한 진척 */
export function dropThreshold(site: SiteId, layer: number): number {
  const expected = layerExpectedValue(site, layer);
  const bonus = 1 + DEPTH_INCOME_BONUS * (layer - 1);
  return (expected / (PROGRESS_VALUE * bonus)) * SITE_BY_ID[site].dropMod;
}

/** 층별 티어 가중 (합이 100). 깊을수록 위 티어가 열린다 */
export function tierWeights(site: SiteId, layer: number): number[] {
  const base = layerBaseWeights(layer);
  const bias = SITE_BY_ID[site].tierBias;
  const raw = base.map((w, i) => w * bias[i]);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / sum) * 100);
}

function layerBaseWeights(layer: number): number[] {
  if (layer <= 2) return [97, 3, 0, 0, 0];
  if (layer <= 4) return [88, 12, 0, 0, 0];
  if (layer <= 7) return [70, 26, 4, 0, 0];
  if (layer <= 9) return [52, 36, 11, 1, 0];
  return [38, 40, 18, 3.9, 0.1];
}

export const BASE_DIG = 1;
export const WORKER_DIG = 1.1;
export const GEAR_MULT = 1.6;
/**
 * 장비 레벨 하드 상한. σ=1(전량 즉시매각) + 전액 재투자 실측에서 무상한 장비가
 * 194만~1,446만/s급 폭주를 냈다(notes/decisions.md G21/A7) — GEAR_MULT가 지수이고
 * gearCost 성장률(2.4)이 σ=1의 현금 유입 가속을 못 따라가기 때문이다. 상한 이후엔
 * 인부(선형)만 늘어 자기제동된다. 기본 정책(σ<1)은 장비 9레벨 선에서 자연 정체하므로
 * (실측 5,209/s) 이 상한에 닿지 않는다 — 정상 플레이는 전혀 느려지지 않는다.
 */
export const MAX_GEAR_LEVEL = 16;

export function workerCost(owned: number): number {
  return Math.round(18_000 * Math.pow(1.15, owned));
}
export function gearCost(level: number): number {
  return Math.round(150_000 * Math.pow(2.4, level));
}
export function labCost(level: number): number {
  return Math.round(200_000 * Math.pow(2.6, level - 1));
}

/** 클릭 1회가 주는 진척 = D × CLICK_FACTOR × combo */
export const CLICK_FACTOR = 0.06;
export const CLICK_COMBO_MAX = 1.4;
export const CLICK_COMBO_STEP = 0.08;
export const CLICK_COMBO_WINDOW = 3;
/** 클릭으로 얻을 수 있는 초당 진척 상한 = D × 이 값. 클릭 노동 방지선 */
export const CLICK_RATE_CAP = 0.35;

/**
 * 감정 1점에 걸리는 시간(초). 큐는 **병렬로** 처리된다 — 순차 처리로 두면
 * 감정소가 드랍 속도의 병목이 되어 수집 자체가 막힌다(시뮬로 확인).
 */
export function appraiseSeconds(lab: number): number {
  return 20 / lab;
}
export const APPRAISE_FEE = 0.02;
/** 미감정 즉시 매각 — 기대값의 이 비율 */
export const BLIND_SELL_RATE = 0.7;
export const PENDING_CAP = 20;

export const OFFLINE_EFFICIENCY = 0.6;
export const OFFLINE_CAP_SECONDS = 12 * 3600;

export const TIP_FIRST_DELAY = 90;
export const TIP_MEAN_INTERVAL = 180;
export const TIP_DURATION_MIN = 60;
export const TIP_DURATION_MAX = 150;
/** 제보 대상 층에서 파는 동안 롤마다 대상 유물이 나올 확률 */
export const TIP_PLAYER_HIT = 0.28;
export const TIP_RIVAL_HIT = 0.1;

/** 추격 계수 상한. UI에 그대로 노출한다(Fair Progression) */
export const CATCHUP_MAX = 2;
export const CATCHUP_SLOPE = 0.15;

export const CODEX_GOAL = 0.75;

export function tierValue(tier: Tier, factor: number): number {
  return Math.round(TIER_VALUE[tier] * factor);
}

/** 해당 층에서 나올 유물의 기대 평가액 — 미감정 추정가로 쓴다 */
export function layerExpectedValue(site: SiteId, layer: number): number {
  const w = tierWeights(site, layer);
  let sum = 0;
  for (let t = 0; t < 5; t++) sum += (w[t] / 100) * TIER_VALUE[t];
  return Math.round(sum);
}
