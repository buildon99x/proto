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

/**
 * 층 L에서 유물 1롤에 필요한 진척(v0.2 — spec.md §9.5, G41/A3+A4).
 *
 * `dig`(그 순간의 실제 발굴력, 진척/초)를 넘기면 `DROP_INTERVAL_FLOOR_SECONDS`
 * 하한이 함께 적용된다 — 초반 층은 실제 D가 낮아 하한에 안 걸리고, 후반 층에
 * 오래 머무는 구간(D가 정체값 근방)만 하한이 작동해 "드랍이 배경 소음이 되는"
 * 구간을 막는다. `dig`를 생략하면(기존 호출부 호환) 하한이 적용되지 않는다 —
 * 반드시 실제 발굴력을 넘기는 호출부(엔진 스텝, UI ETA 표시)에서만 하한이 산다.
 *
 * **보고 — spec.md §9.5 자신은 "app/src/game/balance.ts에는 반영하지 않는다
 * (480종·12거점 파이프라인과 함께 적용)"고 명시했다.** 그러나 이 구현 세션의
 * 작업 지시(1단계 범위 3번)가 "실제로 구현한다"고 명시적으로 요구해 그 지시를
 * 따랐다 — spec 원문의 유보 문구와 상위 작업 지시가 정면으로 어긋나는 지점이다
 * (notes/decisions.md G51 참조). 3거점·60종 규모에서는 §2.3 표(기존 층별
 * 가중표)와 실제로 값이 달라진다.
 */
export function dropThreshold(site: SiteId, layer: number, dig = 0): number {
  const expected = layerExpectedValue(site, layer);
  const bonus = 1 + DEPTH_INCOME_BONUS * (layer - 1);
  const base = (expected / (PROGRESS_VALUE * bonus)) * SITE_BY_ID[site].dropMod;
  return Math.max(base, DROP_INTERVAL_FLOOR_SECONDS * dig);
}

/** 층별 티어 가중 (합이 100). 깊을수록 위 티어가 열린다 */
export function tierWeights(site: SiteId, layer: number): number[] {
  const base = layerBaseWeights(layer);
  const bias = SITE_BY_ID[site].tierBias;
  const raw = base.map((w, i) => w * bias[i]);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => (w / sum) * 100);
}

/** 8~9층·10~12층은 v0.2 재역산 가중(§9.5)을 쓴다 — 위 보고 문구와 같은 이유다 */
function layerBaseWeights(layer: number): number[] {
  if (layer <= 2) return [97, 3, 0, 0, 0];
  if (layer <= 4) return [88, 12, 0, 0, 0];
  if (layer <= 7) return [70, 26, 4, 0, 0];
  if (layer <= 9) return [...LAYER_BASE_WEIGHTS_8_9];
  return [...LAYER_BASE_WEIGHTS_10_12];
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

// ════════════════════════════════════════════════════════════════════════
// v0.2 상수 (spec.md §14 "v0.2 balance.ts 상수 총람"). 이름·값을 문서와
// 1:1로 맞췄다. 이번 1단계는 "엔진 코어"만 만들므로 아래 상수 다수는 아직
// 어떤 로직에서도 참조되지 않는다 — §14 자신이 "아직 쓰이지 않는 상수도 전부
// 선언"하라는 총람이라 그대로 옮겼다. 실제로 로직에 연결된 것만 위 함수들
// (dropThreshold·layerBaseWeights) 또는 engine.ts에서 쓰인다.
// ════════════════════════════════════════════════════════════════════════

// ── 3축 순위·엔딩 (§13.1~13.2) ──────────────────────────────────────────
export const ASSET_SCORE_REF_SHARE = 0.15;
/**
 * ASSET_SCORE_REF 계산에 쓰는 "세계 총가치 상한". spec §14 총람 자체에는 없지만
 * ASSET_SCORE_REF = ARTIFACT_WORLD_VALUE_CEILING × ASSET_SCORE_REF_SHARE(§13.1)
 * 공식이 요구하는 값이라 notes/economy.md §6.1(이미 리뷰를 거쳐 확정된 상수)에서
 * 가져와 선언한다. 480종·12거점 기준으로 산출된 값이라(economy.md §6.1) 현재
 * 3거점·60종 데이터셋의 실제 달성 가능 자산 총합보다 훨씬 크다 — 그 결과
 * ASSET_SCORE가 이 데이터셋 규모에서는 구조적으로 낮게 나온다(보고 대상).
 */
export const ARTIFACT_WORLD_VALUE_CEILING = 250_000_000_000; // notes/economy.md §6.1
export const ARTIFACT_SPECIES_TARGET = 480; // notes/economy.md §8. 도감 480종 목표(§9.2 G7)
export const CODEX_GOAL_V2 = 0.75;
export const FAME_VISITOR_NORMALIZATION = 1_000_000;
export const TIER4_SPECIES_TOTAL = 12;
export const FAME_FIRST_T4_WEIGHT = 0.5;
export const RANK_WEIGHT = { asset: 0.30, codex: 0.35, fame: 0.35 } as const;
export const SEASON_TITLE_HOLD_HOURS = 1;

// ── 시즌 롤오버 (§13.4) ──────────────────────────────────────────────────
export const SEASON_LENGTH_WEEKS = 12; // notes/economy.md §8
export const FAME_PER_DEDICATED = [0.001, 0.01, 0.3, 4] as const; // T0~T3
export const FAME_PER_DEDICATED_T4 = 20;
export const SEASON_CASHOUT_RATIO = 0.10;
export const SEASON_CARRYOVER_FUNDS_CAP_MULT = 500;
export const SEASON_CARRYOVER_DIG_MULT_CAP = 1.5;
export const SEASON_CARRYOVER_FAME_REF = 500;

// ── 제보 v0.2 (§8.6, 재설계 — G45/A8. 원정·발굴단이 이번 단계 범위 밖이라
// 아직 쓰이지 않는다) ────────────────────────────────────────────────────
export const TIP_DURATION_ONSITE_MIN = 60;
export const TIP_DURATION_ONSITE_MAX = 150;
export const TIP_FOCUS_DIG_HIT_CHANCE = 0.60;
export const TIP_FOCUS_DIG_COST_MULT = 2.0;
export const EMERGENCY_DISPATCH_MAX_REACH_HOURS = 4;
export const EMERGENCY_DISPATCH_TRAVEL_MULT = 1 / 3;
export const EMERGENCY_DISPATCH_COST_MULT = 3.0;
export const EMERGENCY_DISPATCH_MISHAP_MULT = 2.0;

// ── 자동매각 (§2.4, B8. KEEP_ONE_PER_SPECIES는 G47/B1+B2로 신설) — 실제로
// engine.ts의 runAppraisal()에서 쓰인다 ───────────────────────────────────
export const AUTO_SELL_MAX_TIER = 1;
export const AUTO_SELL_KEEP_ONE_PER_SPECIES = true;

// ── 발굴단·원정 (§8. 이번 단계 범위 밖 — 토대(타입)만 선언) ───────────────
export const MAX_EXPEDITION_TEAMS_INITIAL = 1;
export const MAX_EXPEDITION_TEAMS_CAP = 4;
export const EXPEDITION_TEAM_UNLOCK_BASE = 50_000_000;
export const EXPEDITION_TEAM_UNLOCK_GROWTH = 4.0;
export const FOREMAN_HIRE_COST = 200_000;
// MAX_GEAR_LEVEL은 v0.1 실코드에 이미 존재한다(위 §2.1 근방) — 여기 중복 선언하지 않는다.
export const EXPEDITION_MISHAP_BASE = 0.02;
export const EXPEDITION_MISHAP_PER_1000KM = 0.01;
export const EXPEDITION_MISHAP_CHANCE_CAP = 0.25;
export const EXPEDITION_MISHAP_TIME_LOSS_RATIO = 0.5;
export const EXPEDITION_ONSITE_RATIO = 3.0;
export const EXPEDITION_DISTANCE_YIELD_COEFF = 0.5;

// ── 감정소·보관소 (§9). DROP_INTERVAL_FLOOR_SECONDS·AUTO_SELL 계열 외에는
// 아직 로직에 연결되지 않았다(봉인 보관·도난·습도·복원은 시설 시스템 후속 단계) ──
export const PENDING_CAP_BASE = 20;
export const PENDING_CAP_PER_LEVEL = 4;
export const APPRAISAL_UNLOCK_LAB_LEVEL = [1, 1, 2, 3, 4] as const; // T0~T4
export const APPRAISAL_HIGH_TIER_TIME_MULT = [1, 1, 1.5, 2, 3] as const; // T0~T4
export const LOCKED_HOLD_CAP = 5;
/** T3 이상은 정원 계산에서 하드 예외(무제한 대기) — 자동매각 T3·T4 예외에도 그대로 쓴다 */
export const LOCKED_HOLD_TIER_EXEMPT_MIN_TIER = 3;
/** 드랍 간격 하한(초). dropThreshold()가 실제로 적용한다 — 위 함수 주석 참조 */
export const DROP_INTERVAL_FLOOR_SECONDS = 20;
/** §9.5 재역산 가중 — layerBaseWeights()가 실제로 적용한다(위 함수 주석의 보고 참조) */
export const LAYER_BASE_WEIGHTS_8_9 = [52, 36, 11, 0.01, 0] as const;
export const LAYER_BASE_WEIGHTS_10_12 = [38, 40, 18, 0.03, 0.005] as const;
export const VAULT_CAPACITY_BASE = 100;
export const VAULT_CAPACITY_PER_LEVEL = 40;
export const VAULT_OVERFLOW_CONDITION_DECAY_MULT = 2.0;
export const CONDITION_DECAY_BASE_RATE_PER_DAY = 0.05;
export const HUMIDITY_DECAY_REDUCTION_COEFF = 0.15;
export const RESTORATION_BASE_HOURS = 48;
export const RESTORATION_SUCCESS_BASE = 0.10;
export const RESTORATION_SUCCESS_COEFF = 0.05;
export const RESTORATION_SUCCESS_CAP = 0.6;
export const VAULT_SECURITY_BASE_GRACE_HOURS = 2;
export const VAULT_SECURITY_GRACE_COEFF = 0.5;
export const THEFT_RATE_BASE = 0.0014;
export const THEFT_JUDGEMENT_ONLINE_ONLY = true;

/**
 * 보존 상태(condition) 축 — 희소도(티어)와 분리된 품질 축이다
 * (notes/decisions.md G6, notes/artifacts-dataset.md §4). VaultItem.condition이
 * 이 인덱스를 쓴다. 습도·복원에 의한 시간 경과 변화(§9.4)는 시설 시스템과
 * 함께 후속 단계에서 붙는다 — 이번 단계는 드랍 시점 초기값만 매긴다.
 */
export const CONDITION_NAME = ["파손", "보통", "양호", "완품", "관급"] as const;
export const CONDITION_VALUE_FACTOR = [0.4, 0.7, 1.0, 1.3, 1.6] as const;
/** 티어별 초기 상태 기준값(T0~T4). artifacts-dataset.md §4의 지터 항은 480종
 *  데이터 파이프라인 몫이라 이번 단계는 기준값만 결정론적으로 쓴다. */
export const CONDITION_INITIAL_BASE_BY_TIER = [1, 1, 2, 3, 4] as const;

// ── 업그레이드 비용 곡선 7종 (§9.1, 신설 — G30/C) — 이번 단계 범위 밖 ──────
export const AUCTION_GRADE_COST_BASE = 30_000_000;
export const AUCTION_GRADE_COST_GROWTH = 3.0;
export const MUSEUM_GRADE_COST_BASE = 40_000_000;
export const MUSEUM_GRADE_COST_GROWTH = 3.0;
export const MARKETING_LEVEL_COST_BASE = 2_000_000;
export const MARKETING_LEVEL_COST_GROWTH = 1.5;
export const HUMIDITY_LEVEL_COST_BASE = 500_000;
export const HUMIDITY_LEVEL_COST_GROWTH = 1.8;
export const RESTORATION_LEVEL_COST_BASE = 800_000;
export const RESTORATION_LEVEL_COST_GROWTH = 1.9;
export const SECURITY_LEVEL_COST_BASE = 600_000;
export const SECURITY_LEVEL_COST_GROWTH = 1.8;
export const VAULT_LEVEL_COST_BASE = 1_000_000;
export const VAULT_LEVEL_COST_GROWTH = 1.7;

// ── 박물관 (§10) — 이번 단계 범위 밖 ───────────────────────────────────────
export const TEMP_EXHIBIT_GRADE = 0;
export const TEMP_EXHIBIT_SLOT_COUNT = 1;
export const TEMP_EXHIBIT_COST = 0;
export const MUSEUM_VISITOR_BASE = 300;
export const MUSEUM_POP_REF = 1_000_000;
export const MUSEUM_POP_EXPONENT = 0.4;
export const MUSEUM_POP_CONTRIB_CAP = 4.0;
export const MUSEUM_RARITY_COEFF = 0.03;
export const RARITY_WEIGHT = [1, 3, 10, 40, 200] as const;
export const MUSEUM_RARITY_CONTRIB_CAP = 15.0;
export const MUSEUM_TICKET_PRICE = 20_000;
export const MUSEUM_MARKETING_COEFF = 0.08;
export const MUSEUM_MARKETING_LEVEL_CAP = 10;
export const MUSEUM_MAX_COUNT = 3;
export const MUSEUM_SLOT_BY_GRADE = [1, 3, 6, 10, 15] as const;
export const MUSEUM_BUILD_COST_BASE = 50_000_000;
export const MUSEUM_BUILD_COST_GROWTH = 3.0;
export const MUSEUM_FATIGUE_DECAY_RATE = 0.02;
export const MUSEUM_FRESHNESS_FLOOR = 0.3;
export const MUSEUM_FRESHNESS_RECOVERY_RATE = 0.05;

// ── 경매장·암시장 (§11) — 이번 단계 범위 밖 ────────────────────────────────
export const AUCTION_HOUSE_MAX_COUNT = 3;
export const AUCTION_SETTLE_HOURS = 6;
export const AUCTION_SLOT_CAP_BY_GRADE = [3, 5, 8, 12] as const;
export const AUCTION_GRADE_MAX = 4;
export const BLACK_MARKET_RESTOCK_INTERVAL_HOURS = 2;
export const BLACK_MARKET_BUY_PRICE_RATIO = 0.75;
export const STOLEN_TO_BLACKMARKET_CHANCE = 0.5;
export const BLACK_MARKET_STOLEN_PRICE_RATIO = 0.32;

// ── 거점별 시세 모델 (§11.4) — 이번 단계 범위 밖 ───────────────────────────
export const REGIONAL_PRICE_MULT_MIN = 0.60;
export const REGIONAL_PRICE_MULT_MAX = 1.40;

// ── 정보 비대칭·원거리 교역 (§11.4) — 이번 단계 범위 밖 ────────────────────
export const REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000;
export const REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = 1.60;

// 급여 원천징수 전환(G29/B7)으로 STAFF_ARREARS_*·STAFF_RETIREMENT_*·
// SALARY_ARREARS_GRACE_HOURS 계열은 삭제됐다 — 여기 선언하지 않는다.
// 도난 보험(G50/C#1)으로 THEFT_INSURANCE_PREMIUM_RATE·THEFT_INSURANCE_PAYOUT_RATE도
// 삭제됐다 — 여기 선언하지 않는다.
