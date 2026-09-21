import type { SiteId, Tier } from "./types";
import { SITE_BY_ID } from "./sites";

export type { SiteDef } from "./sites";
export {
  SITES, SITE_BY_ID, WORLD_CITY_COORDS, CITY_POPULATION, SITE_THEMATIC_CATEGORY, distanceKm
} from "./sites";

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
 *
 * `dropModOverride`(2단계 신설): 첫 12시간 본거지 보너스(world-map.md §1,
 * `HOME_BASE_BONUS_DROPMOD_MULT`)가 `SITE_BY_ID[site].dropMod` 대신 쓸 실효
 * dropMod를 넘긴다. 생략하면 그 거점의 원래 dropMod를 쓴다.
 */
export function dropThreshold(site: SiteId, layer: number, dig = 0, dropModOverride?: number): number {
  const expected = layerExpectedValue(site, layer);
  const bonus = 1 + DEPTH_INCOME_BONUS * (layer - 1);
  const dropMod = dropModOverride ?? SITE_BY_ID[site].dropMod;
  const base = (expected / (PROGRESS_VALUE * bonus)) * dropMod;
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

// ════════════════════════════════════════════════════════════════════════
// v0.2 4단계 — 시설·시장 비용 곡선 7종(spec.md §9.1, notes/decisions.md G30/C).
// 전부 기존 업그레이드(labCost 등)와 동일한 규약이다 — 인자는 "지금 레벨"(구매
// 전, 1부터 시작)이고 반환값은 그 레벨에서 다음 레벨로 올리는 비용이다.
// ════════════════════════════════════════════════════════════════════════
export function auctionGradeCost(grade: number): number {
  return Math.round(AUCTION_GRADE_COST_BASE * Math.pow(AUCTION_GRADE_COST_GROWTH, grade - 1));
}
export function museumGradeCost(grade: number): number {
  return Math.round(MUSEUM_GRADE_COST_BASE * Math.pow(MUSEUM_GRADE_COST_GROWTH, grade - 1));
}
export function marketingLevelCost(level: number): number {
  return Math.round(MARKETING_LEVEL_COST_BASE * Math.pow(MARKETING_LEVEL_COST_GROWTH, level - 1));
}
export function humidityLevelCost(level: number): number {
  return Math.round(HUMIDITY_LEVEL_COST_BASE * Math.pow(HUMIDITY_LEVEL_COST_GROWTH, level - 1));
}
export function restorationLevelCost(level: number): number {
  return Math.round(RESTORATION_LEVEL_COST_BASE * Math.pow(RESTORATION_LEVEL_COST_GROWTH, level - 1));
}
export function securityLevelCost(level: number): number {
  return Math.round(SECURITY_LEVEL_COST_BASE * Math.pow(SECURITY_LEVEL_COST_GROWTH, level - 1));
}
export function vaultLevelCost(level: number): number {
  return Math.round(VAULT_LEVEL_COST_BASE * Math.pow(VAULT_LEVEL_COST_GROWTH, level - 1));
}

/**
 * 경매장 건립비(1~3번째 건립, 등급1). spec.md·economy.md 어디에도 명시적
 * "n번째 건립비" 곡선이 없다(박물관만 MUSEUM_BUILD_COST_BASE/GROWTH가 있음) —
 * 문서 공백이라 새 상수를 만들지 않고 같은 지수 형태로 AUCTION_GRADE_COST_BASE/
 * GROWTH를 재사용해 채운다(notes/decisions.md G54 참조. 3천만/9천만/2.7억).
 */
export function auctionHouseBuildCost(n: number): number {
  return Math.round(AUCTION_GRADE_COST_BASE * Math.pow(AUCTION_GRADE_COST_GROWTH, n - 1));
}
export function museumBuildCost(n: number): number {
  return Math.round(MUSEUM_BUILD_COST_BASE * Math.pow(MUSEUM_BUILD_COST_GROWTH, n - 1));
}

/** 보관소 정원(§9.3). level은 1부터 시작(레벨1 = 업그레이드 전 기본 정원) */
export function vaultCapacity(level: number): number {
  return VAULT_CAPACITY_BASE + VAULT_CAPACITY_PER_LEVEL * (level - 1);
}

/**
 * 감정량(§9.1) — "실제 변수에 배선"하되 PENDING_CAP은 G39/A1 이후 순수 UI
 * 경고 임계값이지 처분 트리거가 아니다(파괴·강제매각 없음). 그 결정을 뒤집지
 * 않는다 — 이 함수는 w.lab에 연동된 올바른 숫자를 계산해 노출할 뿐, 큐 길이를
 * 강제로 제한하지 않는다.
 */
export function pendingCap(lab: number): number {
  return PENDING_CAP_BASE + PENDING_CAP_PER_LEVEL * lab;
}

/** 습도조절(§9.4). humidityLevel·overflow(야적 여부)를 받아 일일 저하 확률을 낸다 */
export function conditionDecayChancePerDay(humidityLevel: number, overflow: boolean): number {
  const base = CONDITION_DECAY_BASE_RATE_PER_DAY / (1 + HUMIDITY_DECAY_REDUCTION_COEFF * humidityLevel);
  return overflow ? base * VAULT_OVERFLOW_CONDITION_DECAY_MULT : base;
}

/** 복원기술(§9.4) */
export function restorationAttemptHours(level: number): number {
  return RESTORATION_BASE_HOURS / level;
}
export function restorationSuccessChance(level: number): number {
  return Math.min(RESTORATION_SUCCESS_CAP, RESTORATION_SUCCESS_BASE + level * RESTORATION_SUCCESS_COEFF);
}

/** 보안(§9.4) — 반출 직후 도난 판정 유예 시간 */
export function theftInitialGraceHours(securityLevel: number): number {
  return VAULT_SECURITY_BASE_GRACE_HOURS * (1 + securityLevel * VAULT_SECURITY_GRACE_COEFF);
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
 * 가져왔다.
 *
 * **v0.3 재산정**: 데이터셋이 480종 설계치에서 실제 2000종으로 커지면서 유한재고
 * (T1~T4) 총가치가 2,500억 → 11,710억으로 늘었다. §6.1의 공식(Σ 종수 × 종당재고 ×
 * 기준가 × 1.2)을 실제 `ARTIFACTS` 배열에 그대로 적용한 값이다 —
 * `qa_artifacts.ts`가 매번 다시 계산해 이 상수와 어긋나면 실패로 잡는다. 늘어난
 * 몫의 대부분(9,375억)은 T1이다(종수 1,028 × 종당 2,000점).
 */
export const ARTIFACT_WORLD_VALUE_CEILING = 1_171_000_000_000; // notes/economy.md §6.1 (v0.3 재산정)
export const ARTIFACT_SPECIES_TARGET = 2000; // notes/economy.md §8. 도감 2000종 목표(v0.3)
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

// ── 소장고 중복분 자동 매각 (v0.3.1 신설, notes/decisions.md G68) ──────────
// 위의 `AUTO_SELL_MAX_TIER`(감정 직후 자동매각)와 **다른 상한**을 쓴다. 감정
// 직후 경로는 플레이어가 그 유물을 한 번도 못 본 상태에서 파는 것이라 희귀(T1)
// 까지로 묶어 뒀다(G39/A1 "파괴적 손실 금지"). 소장고 경로는 전제가 다르다 —
// 이미 감정이 끝나 이름·평가액이 공개됐고, 도감에도 올라 있고, 종당 1점은
// 무조건 남으며, 화면에서 몇 점이 정리 대상인지 미리 보인다. 그래서 진귀(T2)
// 까지 연다. 실질적으로 이 상한이 T2여야 기능이 의미가 있기도 하다: 기본
// 설정(`autoSellBelow=1`)에서 T0·T1 중복분은 감정 시점에 이미 걸러져 소장고에
// 들어오지도 않으므로, 소장고에 실제로 쌓이는 중복은 대부분 T2다.
//
// 국보(T3)·유일(T4)은 `LOCKED_HOLD_TIER_EXEMPT_MIN_TIER`로 한 번 더 막는다 —
// 이 상수를 나중에 누가 올려도 그 둘은 자동 매각 대상이 되지 않는다.
export const AUTO_SELL_SPARE_MAX_TIER = 2;
/** 종당 보존 점수. 끌 수 없다 — 이걸 0으로 두면 방치 중에 도감(엔딩 판정 축)이
 *  감소한다(G57 주석과 `sim/run.ts`의 `listSparesAtAuction` 참조). */
export const AUTO_SELL_SPARE_KEEP_PER_SPECIES = 1;

// ── 기본 자동화 루틴(notes/decisions.md G57 — v0.2 결함 1 수정) ────────────
// 감정비를 낼 자금이 없으면 그 항목은 spec.md §9.2가 이미 정한 대로 "대기"한다
// (파괴·강제매각 없음, G39/A1). 단 그 탈출구("미감정 매각으로 언제든 풀 수
// 있다")가 지금까지 순수 수동 액션이었다 — 클릭 0회 기본 상태에선 아무도
// 그 액션을 누르지 않으니 큐가 무기한 쌓이고 자금이 영원히 0에 머무는
// 교착이 생겼다(척추 4번 위반, 사람 스크린샷 실측). 아래 두 상수는 그
// 탈출구를 배경에서 자동으로 쓰게 하는 주기·여유값이다 — 새 매각 채널을
// 만드는 게 아니라 기존 blindSell을 기본 자동화로 승격시킬 뿐이다.
/** 자동 루틴(`engine.ts`의 `runAutoRoutine` — 미감정 잉여 처분·인부/장비/감정소
 *  재투자) 점검 주기(초). `useGame.ts`가 탭을 열어 둔 채 방치하는 동안 이
 *  주기로 직접 부른다(엔진의 `advance()`/`step()` 내부에서는 부르지 않는다 —
 *  오프라인 적분 스텝 무관성이 깨지기 때문, engine.ts의 `applyOffline` 주석
 *  참조). 발굴단 루틴 재파견과 비슷한 체감 빈도로 잡았다. */
export const AUTO_ROUTINE_INTERVAL_SECONDS = 60;
/** 인부·장비·감정소 자동 재투자가 항상 남겨 두는 자금 여유분 — 다음 몇 건의
 *  감정비 정도는 항상 감당할 수 있게, 재투자가 감정 파이프라인의 현금을
 *  전부 흡수하지 않도록 막는다. */
export const AUTO_INVEST_RESERVE = 5_000;

// ── 발굴단·원정 (§8, world-map.md §2·§3·§5 — 2단계에서 실제로 구현. 회차제·
// 거리·미스헵·후불 원정비는 app/src/game/expedition.ts가 쓴다) ─────────────
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
export const EXPEDITION_SPEED_KMH = 400; // 대항해시대풍 선박·대상(隊商) 속도. 여객기 속도가 아니다
export const EXPEDITION_ONSITE_MIN_HOURS = 0.1; // 6분 — 거점 로컬 유적의 최소 현지 작업 시간
export const EXPEDITION_DISTANCE_COST_COEFF = 0.5;
export const EXPEDITION_DISTANCE_REF_KM = 10_000;
/** 발굴 원정비 — 수입 대비 비율(notes/economy.md K5). 귀환 시 후불 원천징수된다. */
export const EXPEDITION_COST_INCOME_RATIO = 0.15;
export const MAX_OWNED_SITES = 3; // base 슬롯 수(world-map.md §5) — 원정 가능 거점 수와는 무관하다
export const HOME_BASE_BONUS_DROPMOD_MULT = 0.85;
export const HOME_BASE_BONUS_DURATION_HOURS = 12;
export const UNEXPLORED_BONUS_APPRAISAL_VOUCHER = 1;
export const RELOCATION_COST_ASSET_RATIO = 0.10; // notes/economy.md K6
export const RELOCATION_COOLDOWN_HOURS = 168;
export const FIRST_RELOCATION_FREE_WINDOW_HOURS = 12;

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
/**
 * 유물 1점이 나오기까지의 **최소 간격(초)**. v0.3에서 20초 → 8초로 줄였다
 * ("획득 주기 단축" 작업 지시).
 *
 * 중반 이후 이 값이 사실상 유일한 드랍 속도 조절기다. `dropThreshold`의 base항은
 * 층마다 고정인데 발굴력 D는 계속 커지므로, D가 조금만 자라면 `FLOOR × D`가 base를
 * 넘어 간격이 이 상수로 고정된다(실측: 20분 시점에 이미 평균 간격 = 바닥값).
 *
 * **중립적인 변경이 아니다.** 간격을 K배 줄이면 같은 진척당 유물이 K배 나오므로
 * 화폐 창출률도 K배가 된다(economy.md §1.1). 실측으로 폭주는 없었다 — 기본
 * 재투자 정책이 장비 Lv.10·감정소 Lv.6에서 자연 정체해 발굴력이 바닥값과 무관하게
 * 9,423/s로 같았다. 엔딩만 앞당겨졌다:
 *
 *   바닥값  20초 → 평균 간격 20.3초 · 엔딩 177시간 46분   (v0.2)
 *   바닥값  12초 → 평균 간격 12.6초 · 엔딩 144시간 45분
 *   바닥값   8초 → 평균 간격  9.9초 · 엔딩 140시간 44분   ← 채택
 *   바닥값   5초 → 평균 간격  7.2초 · 엔딩 123시간  6분
 *
 * 5초까지 내려도 불변식(원장 보존·오프라인 적분 스텝 무관·T3/T4 오프라인 상실 0·
 * 클릭 가속 1.35)은 전부 유지됐다. 8초에서 멈춘 건 밸런스가 아니라 **체감** 때문이다
 * — 이 바닥값이 애초에 "드랍이 배경 소음이 되는 구간"을 막으려고 생긴 값이라
 * (아래 dropThreshold 주석), 발굴단 4팀이 동시에 돌 때 5초면 한 점 한 점이
 * 사건으로 읽히지 않는다.
 */
export const DROP_INTERVAL_FLOOR_SECONDS = 8;
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
 * notes/economy.md §8 정본(spec.md §14 총람에는 없지만 §9.4·§11.1·§11.5 본문이
 * 그대로 인용한다). `THEFT_RECOVERY_WINDOW_HOURS`는 **온라인 경과 시간 기준**이다
 * (economy.md 원문 각주) — World.onlineElapsedSeconds가 이 요구를 그대로 구현한다
 * (척추 3번: 오프라인 중에는 회수기간 타이머가 흐르지 않는다).
 */
export const THEFT_APPLICABLE_MAX_TIER = 3;
export const THEFT_RECOVERY_WINDOW_HOURS = 72;

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

// ── 유물 데이터셋 검증 상수 (notes/artifacts-dataset.md §5·§8·§13, 3단계 신설) ──
/** 모든 종 최소 출처 개수(T0~T3). T4는 T4_MIN_INDEPENDENT_SOURCES로 별도 상향 */
export const ARTIFACT_MIN_SOURCES = 1;
/** T4(유일)는 서로 다른 발행주체 출처 이 개수 이상이어야 verified가 될 수 있다 */
export const T4_MIN_INDEPENDENT_SOURCES = 2;
/** note가 출처 원문과 연속 이 단어 수 이상 일치하면 안 된다(n-gram 대조는 수집
 *  파이프라인 몫 — qa_artifacts.ts는 이 상수를 문서화 목적으로만 재노출한다) */
export const NOTE_MAX_VERBATIM_RUN_WORDS = 8;
/** 거점당 티어별 목표 종수(T0~T4). 480종(12거점×40종) 목표의 입력값 —
 *  notes/economy.md §8·notes/artifacts-dataset.md §8. 실존성이 우선이라 이 목표를
 *  전부 채우지 못해도 된다(qa_artifacts.ts는 미달을 실패로 치지 않고 보고만 한다). */
/**
 * 거점당 티어별 목표 종수(T0~T4). v0.3에서 480종 → 2000종으로 확대하며 재산정했다.
 *
 * 상위 두 티어가 거의 안 늘어난 건 데이터가 모자라서가 아니라 **현실이 상한이기
 * 때문이다.** T4는 정의상 "세상에 하나"라 거점당 1종이 끝이고, T3("현존 한 자릿수")도
 * 사람이 근거를 들고 판정해야 하는 티어라 자동 수집 파이프라인이 만들지 않는다
 * (scripts/build-artifacts.mjs 머리말). 늘어난 1,720종은 전부 T0~T2다.
 */
export const SPECIES_PER_SITE_BY_TIER = [66, 85, 12, 3, 1] as const;

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
/** notes/economy.md §8 정본(spec.md §14 총람에는 없지만 §10.1~10.2 본문이 그대로
 *  인용한다) — G5·G24가 확정한 30% 캡과 20% 유지비. */
export const MUSEUM_NET_INCOME_CAP = 0.30;
export const MUSEUM_UPKEEP_RATE = 0.20;
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

// ── 경매장·암시장 (§11, 4단계에서 실제로 구현) ─────────────────────────────
export const AUCTION_HOUSE_MAX_COUNT = 3;
export const AUCTION_SETTLE_HOURS = 6;
export const AUCTION_SLOT_CAP_BY_GRADE = [3, 5, 8, 12] as const;
export const AUCTION_GRADE_MAX = 4;
/**
 * `notes/economy.md` §8·§3.2 정본. spec.md §14 총람 자체에는 없지만(§11.1 채널표에만
 * 인용) economy.md가 실제 선언부라 여기서 그대로 옮긴다(G50/C#6 — 기존 1.0→1.15).
 */
export const AUCTION_PRICE_MULT_MIN = 1.15;
export const AUCTION_PRICE_MULT_MAX = 1.4;
export const AUCTION_FEE_RATE = 0.08;
export const BLACK_MARKET_RESTOCK_INTERVAL_HOURS = 2;
export const BLACK_MARKET_BUY_PRICE_RATIO = 0.75;
export const BLACK_MARKET_SLOT_CAPACITY = 12;
export const STOLEN_TO_BLACKMARKET_CHANCE = 0.5;
export const BLACK_MARKET_STOLEN_PRICE_RATIO = 0.32;
/** 암시장 일반(미감정) 매물의 대상 티어 상한(4단계 신설 — spec.md 미명시 공백을
 *  채운 설계 판단, notes/decisions.md G54 참조). T3 이상을 원장과 무관하게 찍어내면
 *  척추 1번(현실 개체수=재고)이 깨진다 — 일반 매물은 원장에서 실제로 빼내 만든다
 *  (takeForBlackMarket, engine.ts)는 이 상한 안에서만 유일성이 자연히 보존된다.
 *  T3 이상은 오직 장물(도난) 경로로만 암시장에 등장한다(§11.5, THEFT_APPLICABLE_MAX_TIER). */
export const BLACK_MARKET_LOOSE_MAX_TIER = 2;

// ── 거점별 시세 모델 (§11.4, world-map.md §8 — 2단계에서 실제로 구현.
// app/src/game/market.ts가 쓴다) ────────────────────────────────────────────
export const REGIONAL_PRICE_MULT_MIN = 0.60;
export const REGIONAL_PRICE_MULT_MAX = 1.40;
export const THEMATIC_PREFERENCE_BONUS = 0.08;
export const ARBITRAGE_MAX_SPREAD_RATIO = REGIONAL_PRICE_MULT_MAX / REGIONAL_PRICE_MULT_MIN; // ≈2.33(파생값)
export const PRICE_UPDATE_INTERVAL_HOURS = 6;
export const PRICE_CYCLE_HOURS = 72;
export const PRICE_DRIFT_AMPLITUDE = 0.06;
export const SUPPLY_SHOCK_MAGNITUDE = 0.10;
export const SUPPLY_SHOCK_DECAY_HOURS = 48;

// ── 정보 비대칭·원거리 교역 (§11.4, world-map.md §8.5 — 2단계에서 실제로 구현) ──
export const REMOTE_ARBITRAGE_MIN_DISTANCE_KM = 3_000;
export const REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX = 1.60;

// ── 세계지도 렌더(world-map.md §6) — 2단계, app/src/render/worldmap.ts가 쓴다 ──
export const MAP_ZOOM_LEVELS = 3; // 세계 → 권역 → 유적. 이번 단계는 세계 줌 1단계만 구현한다
export const MAP_WORLD_DOT_GRID_W = 320;
export const MAP_WORLD_DOT_GRID_H = 160;
export const MAP_DOT_PX = 2;
export const MAP_REGION_ZOOM_FACTOR = 4;
export const COASTLINE_LAND_THRESHOLD = 0.5;
export const MAP_BOOKMARK_CAP = 10; // 탐색 UX(§7) — 북마크·추천 UI 자체는 5단계 몫, 상수만 선언
export const RECOMMEND_TOP_N = 3;

// ── 스텝(고용) — notes/staff.md, 2단계에서 실제로 구현. app/src/game/staff.ts가 쓴다.
// 관장·경매관장은 박물관·경매장(3단계 이후)이 없어 급여·능력치 공식만 미리 둔다 ──
export const STAFF_STAT_MIN = 1;
export const STAFF_STAT_MAX = 100;
export const FOREMAN_DIG_COEFF = 0.05; // LEADERSHIP=100 → D_team 기반항에 +5
export const FOREMAN_NAV_SPEED_COEFF = 0.003; // NAVIGATION=100 → 이동속도 +30%
export const MUSEUM_CURATOR_COEFF = 0.005;
export const MUSEUM_CURATOR_CONTRIB_CAP = 1.5;
export const THEFT_RECOVERY_BASE = 0.20;
export const CURATOR_RECOVERY_COEFF = 0.006;
export const THEFT_RECOVERY_CHANCE_CAP = 0.80;
export const AUCTIONEER_NEGOTIATION_COEFF = 0.006;
export const AUCTIONEER_LOGISTICS_COEFF = 0.1;
export const STAFF_MARKET_REFRESH_HOURS = 24;
export const STAFF_MARKET_CANDIDATE_COUNT = 3;
export const STAFF_SALARY_STAT_COEFF = 0.6;
export const FOREMAN_SALARY_INCOME_SHARE = 0.03;
export const CURATOR_SALARY_INCOME_SHARE = 0.15;
export const AUCTIONEER_SALARY_FEE_SHARE = 0.05;
export const STAFF_PROMOTION_INTERVAL_HOURS = 168;
export const STAFF_PROMOTION_STAT_GAIN = 2;

// 급여 원천징수 전환(G29/B7)으로 STAFF_ARREARS_*·STAFF_RETIREMENT_*·
// SALARY_ARREARS_GRACE_HOURS 계열은 삭제됐다 — 여기 선언하지 않는다.
// 도난 보험(G50/C#1)으로 THEFT_INSURANCE_PREMIUM_RATE·THEFT_INSURANCE_PAYOUT_RATE도
// 삭제됐다 — 여기 선언하지 않는다.

// ── 기록패(플레이어 간 비동기 경쟁, v0.5 · notes/decisions.md G70) ─────────
/** 기록패 스키마 버전. 올릴 때는 parseCard가 옛 버전을 계속 읽게 하거나,
 *  못 읽는다는 사실을 화면에 그대로 적는다(척추 5번). */
export const CARD_VERSION = 1;
/** 기록패 문자열 상한. 이 위로는 파싱 전에 버린다 — 남이 준 문자열이
 *  JSON.parse에 닿기 전에 잘라 내는 첫 번째 방어선이다. */
export const CARD_MAX_CHARS = 2048;
/** 동시에 받아 둘 수 있는 고스트 수. 순위표가 13행이 되면 읽히지 않고,
 *  step()의 라이벌 루프가 그만큼 무거워진다(G70.4). */
export const GHOST_MAX = 3;
/**
 * 고스트가 재현할 수 있는 발굴력 상한(진척/초) — **받아들이는 순간에만** 건다.
 *
 * 기록패는 발굴력이라는 결과값이 아니라 `workers`/`gear`라는 **상태**를 나른다.
 * 결과값을 나르면 받는 쪽이 그걸 되돌리려다 반드시 틀린다 — 실제로 한 번 틀렸다:
 * 발굴력 9,423/s를 `gear = 0` 가정으로 인부 8,566명으로 환산했더니, NPC와 같은
 * 재투자 루프가 그 인부 더미 위에 장비를 13단계 얹어 **4,243,517/s**까지 부풀었다
 * (실측 — `eval.md` §20). 인부와 장비를 그대로 옮기면 이 왜곡이 원천적으로 없다.
 *
 * 그래도 상한을 남겨 두는 이유는 위조 때문이다. 인부 수는 위조할 수 있고
 * (`GHOST_WORKERS_CAP`이 1차로 자르지만 그 안에서도 장비와 곱해진다), 곱셈 하나가
 * 판을 못 쓰게 만들 수 있다. 값의 근거는 실측이다 — 168시간 방치 시뮬에서 가장 센
 * NPC가 26,349/s다. **사람 상대는 가장 센 NPC만큼 셀 수 있지만 그보다 세게 들어오지는
 * 못한다.** 들어온 뒤의 성장은 NPC와 똑같은 규칙이라 막지 않는다.
 */
export const GHOST_DIG_POWER_CAP = 30_000;
/**
 * 기록패가 나를 수 있는 인부 수 상한. 엔딩 시점 플레이어가 77명이다(`eval.md` §20) —
 * 한 자릿수 배수의 여유를 두되, 위조된 큰 수가 장비 배수와 곱해지는 경로는 막는다.
 * 장비는 게임이 이미 `MAX_GEAR_LEVEL`로 자르므로 따로 상수를 두지 않는다.
 */
export const GHOST_WORKERS_CAP = 500;
/** 고스트 표시 이름 상한(자). 넘으면 잘라 쓴다. */
export const CARD_NAME_MAX_CHARS = 12;

/**
 * 자산 축의 분모(§13.1). `engine.ts`의 module-private 상수였는데, 기록패가 자산
 * 축을 거꾸로 푸는 데 같은 값이 필요해 여기로 올렸다 — 두 곳에 같은 곱셈을 적어 두면
 * 한쪽만 고쳐지는 날이 온다.
 */
export const ASSET_SCORE_REF = ARTIFACT_WORLD_VALUE_CEILING * ASSET_SCORE_REF_SHARE;
/** 기록패에 이름을 정하지 않은 사람의 기본 표시 이름 */
export const DEFAULT_OWNER_NAME = "이름 없는 발굴자";
