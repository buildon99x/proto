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

/**
 * 층 L 돌파에 필요한 진척. **깊이가 이 게임의 페이싱 척추다** — 그래서 v0.6의
 * 전체 곡선 압축은 여기서 시작한다.
 *
 * v0.5.1까지는 `300 × 2.45^(L-1)`이었고, 그 곡선에서 12층 도달 실측이
 * **4시간 39분**이었다(`eval.md` §26 전표). 그런데 `notes/mda.md` §6의 시간
 * 스케일 표는 "층 돌파"를 **세션 스케일(10~20분)** 루프로 적어 뒀다 — 게임이
 * 자기 설계 문서와 14배 어긋나 있었다는 뜻이다. v0.6은 문서가 원래 적어 둔
 * 스케일로 되돌린다.
 *
 * 그 결과가 첫 1분이다: 진귀(T2)의 `TIER_MIN_LAYER`가 5층이고 제보 풀은 T2
 * 이상만 보므로(`spawnTip`), **5층에 닿기 전에는 제보가 구조적으로 0**이다.
 * v0.5.1 실측에서 첫 제보가 15분이던 진짜 원인이 이것이었다(`TIP_FIRST_DELAY`도
 * 재시도 간격도 아니었다 — `notes/play-first-10h-v06.md` §2).
 */
export const LAYER_COST_BASE = 6;
export const LAYER_COST_GROWTH = 2.08;
export function layerCost(site: SiteId, layer: number): number {
  return LAYER_COST_BASE * Math.pow(LAYER_COST_GROWTH, layer - 1) * SITE_BY_ID[site].layerCostMod;
}

/**
 * 진척 1당 기대 수입($). 드랍 임계를 이 값에 묶어 두면 깊이가 돈을 불려 주지 않는다.
 * **깊이는 유물의 희소성을 열지, 수입을 늘리지 않는다** — 수입은 발굴력에서만 나온다.
 * 이게 없으면 깊이 × 발굴력이 곱해져 방치형 특유의 폭주가 난다(시뮬로 확인).
 */
/**
 * 진척 1당 기대 수입(₩). 드랍 임계를 이 값에 묶어 두면 깊이가 돈을 불려 주지 않는다.
 * **깊이는 유물의 희소성을 열지, 수입을 늘리지 않는다** — 수입은 발굴력에서만 나온다.
 * 이게 없으면 깊이 × 발굴력이 곱해져 방치형 특유의 폭주가 난다(시뮬로 확인).
 *
 * **v0.6에서 이 값은 건드리지 않았다.** 8,000으로 올려 곡선 전체를 당기는 길을
 * 재 봤는데, 드랍이 전 구간에서 하한에 붙어 버려 반복:의미가 1.62에서 3.23으로
 * **나빠졌다** — 분자를 키우는 게 아니라 소음을 키우는 쪽이었다(작업 지시 §2).
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
  return Math.min(Math.max(base, DROP_INTERVAL_FLOOR_SECONDS * dig), DROP_INTERVAL_CEILING_SECONDS * dig);
}

/**
 * **원정비 사이징 전용** 드랍 임계 — 하한은 반영하고 **천장은 반영하지 않는다**.
 *
 * 천장(`DROP_INTERVAL_CEILING_SECONDS`)은 화면이 조용해지지 않게 하는 **페이싱
 * 장치**이지 수입 장치가 아니다. 천장이 걸린 구간에서는 임계가 `CEIL × dig`라
 * 노셔널 수입률이 `층 기대가치 / CEIL`이 되어 **발굴력과 무관하게** 커진다 —
 * 약한 팀이 깊은 층에 서면 원정비가 10배로 뛴다. 실측에서 팀 하나가 왕복 한
 * 번에 **1,470만₩**을 청구당해 자금이 −1,451만₩까지 떨어졌고, 그 구간 내내
 * 감정 파이프라인이 통째로 멈췄다(`qa:pipeline` 정지 562초).
 *
 * 하한을 반영해야 하는 이유는 그대로다(G56): 하한이 걸린 구간에서 실제 드랍
 * 빈도는 더 안 오르는데 노셔널만 발굴력에 비례해 커지면 과청구가 된다.
 * 결국 이 함수는 **v0.5.1까지의 `dropThreshold`와 정확히 같은 식**이다.
 */
export function notionalDropThreshold(site: SiteId, layer: number, dig = 0, dropModOverride?: number): number {
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
  if (n <= 1) return AUCTION_HOUSE_FIRST_BUILD_COST;
  return Math.round(AUCTION_GRADE_COST_BASE * Math.pow(AUCTION_GRADE_COST_GROWTH, n - 1));
}
/** n번째 박물관 건립비. **첫 관만** `MUSEUM_FIRST_BUILD_COST`이고 2관부터는 원래 곡선이다(v0.6.6) */
export function museumBuildCost(n: number): number {
  if (n <= 1) return MUSEUM_FIRST_BUILD_COST;
  return Math.round(MUSEUM_BUILD_COST_BASE * Math.pow(MUSEUM_BUILD_COST_GROWTH, n - 1));
}

/**
 * 소장고 정원(spec.md §9.3) = 기본 + 레벨분 + **보유 종수**.
 *
 * 마지막 항이 v0.6.4에서 붙었다(`notes/decisions.md` G94). 그 전까지 정원은
 * `100 + 40 × (L-1)` 직선인데 비용은 `1.7^L` 지수라, 수집이 진행되면 **어떤 정리로도
 * 끌 수 없는 초과**가 됐다 — 실측에서 소장 965점 중 수집품(종당 1점)만 474종인데
 * 정원은 180점이었다. 즉 중복을 전부 치워도 경고가 안 꺼진다. §9.3이 이 장치를
 * "**정리하라는 압박은 있지만 처벌은 없다**"로 정의해 둔 것과 어긋난 상태였다.
 *
 * 보유 종수를 더하면 **종당 1점은 언제나 자리가 있고, 자리를 먹는 것은 중복뿐**이다.
 * 그래서 초과는 정확히 "중복을 쌓아 뒀다"의 신호가 되고, 정리하면 꺼진다.
 * 보관소 레벨의 뜻도 같이 바뀐다 — 수집품을 담는 칸이 아니라 **중복을 얼마나 여유
 * 있게 쌓아 둘 수 있나**를 사는 것이다.
 *
 * 정원을 지수로 바꾸는 안(100 × 1.5^L)은 재 보고 버렸다: 몇 레벨만 사면 정리하지
 * 않아도 초과가 영구히 꺼져 **압박 자체가 사라졌고**(실측에서 습도를 한 칸도 안 산다),
 * 그러면 보존 관리가 통째로 무의미해진다(G94 실측표).
 */
export function vaultCapacity(level: number, ownedSpecies = 0): number {
  return VAULT_CAPACITY_BASE + VAULT_CAPACITY_PER_LEVEL * (level - 1) + ownedSpecies;
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

/** 첫 제보까지의 대기(초). 5층 도달이 25초 언저리이므로 이 값이 곧 첫 제보 시각이다 */
export const TIP_FIRST_DELAY = 20;
export const TIP_MEAN_INTERVAL = 75;
/**
 * **반응 유예(초)** — 제보가 뜬 뒤 이 시간이 지나기 전에는 **어느 쪽도** 대상
 * 유물을 가져가지 못한다(플레이어·라이벌 대칭).
 *
 * v0.5.1의 제보 창 중앙값은 **15초**였다(설계 60~150초). 원인은 레이스가 먼저
 * 끝나면서 배너가 같이 닫히는 것이다 — 드랍 8초 × 적중 28%면 평균 2~3드랍에
 * 결판이 난다(`notes/play-telemetry.md` §4). 15초는 긴장이 아니라 반사신경
 * 검사이고, 화면을 들여다보고 있지 않으면 성립조차 하지 않는다.
 *
 * 승률을 건드리지 않고 창만 늘리는 방법이 이 유예다: 유예 동안 양쪽의 적중
 * 판정을 똑같이 막으므로 **상대 승률은 그대로**이고, 플레이어가 [집중 굴착]·
 * [급파]를 누를 시간만 생긴다. 유예가 끝나면 지금까지와 똑같이 먼저 적중한
 * 쪽이 가진다 — "먼저 도달한 쪽이 가진다"(재미 3문장 ②)는 그대로다.
 */
export const TIP_MIN_RESPONSE_SECONDS = 30;
/**
 * **판정 마감(초)** — 반응 유예가 끝난 뒤 이만큼 지나도 아무도 적중하지 못하면,
 * 그 자리에서 **한 번에 결판낸다**(engine.ts `decideTipRace`).
 *
 * v0.6 첫 측정에서 최악 시드 3축이 미달한 원인이 전부 여기 하나였다(`eval.md`
 * §28). 레이스가 "드랍마다 굴리는 주사위"라서 **아무도 못 맞힌 채 배너가 만료되는
 * 제보**가 존재했고, 그 시드에서는 첫 레이스 결과가 7분 30초에야 나왔으며(목표
 * 120초) 첫 10분의 승리가 0회였다(= 사건 종류도 11종에서 멈췄다). 결과가 없는
 * 제보는 긴장 장치가 아니라 **지나간 배너**다.
 *
 * 마감은 창을 줄이지 않는다 — 배너는 그대로 `TIP_DURATION_ONSITE_MIN`~`MAX`를
 * 살고, 결판 뒤 남은 수명은 결과를 보여 주는 데 쓴다. 바뀌는 것은 "결과가 언제
 * 확정되는가"뿐이고, 20초 + 유예 30초 + 이 값 30초 = **최악 80초**로 상한이 잡힌다.
 */
export const TIP_DECIDE_AFTER_GRACE_SECONDS = 30;
/**
 * 마감 판정의 가중은 드랍 판정과 **같은 상수**를 쓴다 — 플레이어
 * {@link TIP_PLAYER_HIT}(집중 굴착이면 {@link TIP_FOCUS_DIG_HIT_CHANCE}) 대
 * 라이벌 **머릿수 × {@link TIP_RIVAL_HIT}**. 유예 전 드랍 판정에서 라이벌 k명이
 * 각자 굴리는 것과 같은 셈이라, 마감은 승률을 바꾸지 않고 **무승부만 없앤다.**
 *
 * 그래서 이 게임의 제보는 판마다 경쟁도가 다르다 — 라이벌이 없는 거점이면
 * 참가만으로 가져가고(승산 100%), 1명이면 반반, 3명이면 25%다. 배너가 그 수치를
 * 그대로 적는다(`tipRaceOdds`, 척추 5번).
 */
/**
 * **첫 승 보장** — 이 세이브에서 레이스를 한 번도 이겨 본 적이 없다면(`racesWon === 0`),
 * 마감 판정은 **그 자리에 있는 플레이어의 승리**로 확정한다. 단 한 번뿐이고,
 * 참가하지 않았으면(직접 발굴도 on_site 팀도 없으면) 적용되지 않는다.
 *
 * 근거: 재미 3문장 ②("조금만 늦었으면 놓쳤다")는 **이겨 본 적이 있어야** 성립한다.
 * 한 번도 못 이겨 본 플레이어에게 레이스는 긴장이 아니라 그냥 지는 절차다.
 * 실측으로도 5시드 중 하나가 첫 10분 승리 0회였다. 대가로 "첫 판은 진짜 경쟁이
 * 아니다"를 얻지만, 이 규칙은 배너와 규칙 화면에 그대로 적힌다(척추 5번) —
 * 숨긴 보정이 아니라 **공개된 튜토리얼**이다. 패배는 보장의 반대쪽에 그대로
 * 남는다(첫 10분 패 최악 1회는 보장 전에도 이미 충족돼 있었다).
 */
export const TIP_FIRST_WIN_GUARANTEED = true;
/**
 * **유일(T4) 우선 편성** — 자격을 갖춘 유일 유물이 제보 풀에 있으면, 티어 가중
 * 추첨을 건너뛰고 그것을 편성한다.
 *
 * v0.6 실측에서 T4는 **194초에 이미 자격을 갖췄는데** 첫 T4 조우는 최악 시드에서
 * 12분 30초였다(`eval.md` §28). 원인은 가중 추첨의 분모다 — 자격 T2가 30종이면
 * 합 30, T4는 한 종뿐이라 24다. 24 : 30은 "유일을 강하게 선호한다"는 주석과 다른
 * 숫자이고, 제보가 10분에 3~4회뿐이라 그 차이가 그대로 시드 운이 됐다.
 *
 * 설정상으로도 맞다: 유일 유물의 반응은 **세계적 사건**이라 제보망이 먼저 알린다.
 * 그래서 이 규칙은 "확률을 몰래 올린다"가 아니라 **공개된 편성 규칙**이고,
 * 규칙 화면에 그대로 적힌다(척추 5번).
 *
 * **연달아 편성하지는 않는다**(`World.lastTipWasUnique`). 우선 편성만 걸어 두면
 * 유일이 세상에 남아 있는 동안 **모든 제보가 유일**이 되고, 유일은 대응해야
 * 가지므로(`TIP_UNIQUE_REQUIRES_RESPONSE`) 아무것도 누르지 않는 플레이는 첫 10분에
 * **한 번도 못 이기게 된다** — 실측으로 그 상태를 만들어 보고 되돌렸다(`eval.md` §28).
 * 유일과 일반 제보가 번갈아 뜨면 승(일반)과 패(유일)가 같은 세션 안에 들어온다.
 */
export const TIP_UNIQUE_PRIORITY = true;
/**
 * **유일(T4)은 대응해야 가진다** — 유일 제보의 레이스에서 플레이어의 적중 판정은
 * [집중 굴착]이나 [급파]로 **대응했을 때만** 유효하다. 그 자리를 직접 발굴로
 * 파고 있는 것만으로는 유일을 가져오지 못한다(진귀·국보는 지금까지 그대로다).
 *
 * 왜 이 규칙인가. v0.6 실측에서 최악 시드 둘이 첫 10분 **3전 3승 · 패 0회**였고,
 * 그 승리가 전부 **경쟁자가 한 명도 없는 거점의 유일**이었다(`eval.md` §28).
 * 라이벌 6명이 12거점 중 3곳에만 살아서, 플레이어의 base가 나머지에 걸리면
 * 유일이 **무경쟁 단독 수령**이 된다. 세상에 하나뿐인 물건을 아무 대가 없이 줍는
 * 것은 재미 3문장 ①("내가 가졌다")과 ②("조금만 늦었으면 놓쳤다")를 동시에 깎는다.
 *
 * **금지가 아니라 불리함이다.** 처음엔 아예 못 가져가게 막아 봤는데, 48시간 시뮬
 * (클릭 0회 기준선)에서 **첫 유일이 끝내 나오지 않았고 명성 축이 0**이 됐다 —
 * 명성은 유일 최초발굴에 걸려 있고, 시뮬 정책은 제보 버튼을 누르지 않기 때문이다.
 * 척추 4번("클릭은 언제나 선택")과 정면으로 부딪히는 결과라 되돌렸다. 지금은
 * 대응하지 않은 쪽의 가중을 {@link TIP_UNRESPONDED_UNIQUE_MULT}배로 **낮출 뿐**이고,
 * 경쟁자 1명 기준 승산은 25%다 — 대개 놓치지만 영영 못 갖는 것은 아니다.
 *
 * 확률을 숨기지도 않는다 — 배너가 그 판의 승산을 그대로 적고([집중 굴착]·[급파]
 * 버튼이 그 자리에 있다), 규칙 화면에도 적힌다(척추 5번).
 */
export const TIP_UNIQUE_REQUIRES_RESPONSE = true;
/** 대응하지 않은 유일 제보에서 플레이어 가중에 곱하는 값(위 주석 참조) */
export const TIP_UNRESPONDED_UNIQUE_MULT = 1 / 3;
/**
 * **첫 유일은 가르친다** — 이 세이브에서 처음 결판나는 유일 제보에 대응하지
 * 않았다면(그리고 다투는 상대가 있다면), 그 판은 **놓친다**. 딱 한 번뿐이고,
 * 그 뒤로는 위의 {@link TIP_UNRESPONDED_UNIQUE_MULT}(승산 25%)로 돌아간다.
 *
 * {@link TIP_FIRST_WIN_GUARANTEED}의 반대쪽 짝이다. 게임은 첫 세션에 두 가지를
 * 가르친다 — **먼저 도달하면 갖는다**(첫 승 보장), **유일은 대응하지 않으면
 * 놓친다**(이 규칙). 재미 3문장 ②는 이겨 본 적과 잃어 본 적이 둘 다 있어야
 * 성립하는데, 확률에만 맡기면 24시드 중 3개가 **첫 10분 3전 3승·패 0회**로
 * 나왔다(`eval.md` §28.5). 25%짜리 판을 세 번 연속 이기는 플레이어는 "잃는
 * 게임"이라는 걸 배우지 못한 채 첫 세션을 끝낸다.
 *
 * 숨기지 않는다: 그 배너는 "대응하지 않으면 놓친다"를 그대로 적고, [집중 굴착]·
 * [급파] 버튼이 같은 줄에 있다. 누르면 정상 승산(60% 대 라이벌 머릿수×28%)으로
 * 겨루고, 실제로 이길 수 있다 — **결과가 정해진 연출이 아니라 대응이 필요한 판**이다.
 */
export const TIP_FIRST_UNIQUE_TAUGHT = true;
/**
 * **이 티어부터는 제보가 세계에 퍼진다** — 대상 거점에 홈을 둔 라이벌이 한 명도
 * 없으면, 가장 가까운 수집가 한 명이 반응 대상으로 편성된다.
 *
 * 라이벌 6명은 12거점 중 3곳(경주·룩소르·폼페이)에만 산다. 그래서 플레이어의
 * base가 나머지 아홉 곳에 걸리면 그 거점의 제보는 **경쟁자가 0명**이고, 국보도
 * 유일도 혼자 주워 담게 된다 — 실측에서 최악 시드 둘이 첫 10분 3전 3승이었고,
 * 그 승리가 전부 무경쟁이었다(`eval.md` §28). 반대로 그 구멍을 유일 규칙으로만
 * 막으면 무경쟁 유일 제보가 **아무 결과 없이 만료**된다(배너만 지나간다).
 *
 * 진귀(T2)는 그대로 둔다 — 흔한 물건까지 세계가 달려들면 "유일·국보가 주인공"이라는
 * 제보의 성격이 사라진다. 경쟁자 없는 자리의 T2 제보는 그냥 **발견**이고, 그건
 * 첫 세션에 있어도 되는 사건이다.
 *
 * 유일만(T4+) 걸어 보는 안도 재 봤다. 12시드에서는 원장이 다 통과하는데 **24시드로
 * 넓히면 A(11종)와 C 패(0회)가 다시 떨어졌다** — 국보 제보가 무경쟁으로 남아 "첫
 * 10분에 한 번도 지지 않는" 시드가 되살아나서다. 첫 국보 획득 지연(5분 4초 →
 * 21~26분)은 이 경계보다 제보 편성 전반(유일 우선·교대·간격)에서 온 것이라,
 * T4로 좁혀도 5분밖에 되돌아오지 않았다(`eval.md` §28.6).
 */
export const TIP_WORLDWIDE_MIN_TIER = 3;
/**
 * 유일(T4)이 **제보 자격을 갖추는 순간** 대기 중인 다음 제보를 이 시간(초)까지
 * 당긴다. 자격이란 "세계에 남아 있고, 내가 반응할 수 있는 거점이며, 내 층이 그
 * 유물의 층에 닿았다"이다(`tipPool`과 같은 조건).
 *
 * 없으면 유일 알림이 **직전 제보의 배너 수명 + 다음 간격**만큼 밀린다. 실측에서
 * 한 시드가 그 대기 때문에 첫 유일 조우가 10분 15초로 밀려 목표(10분)를 15초
 * 차이로 놓쳤다(`eval.md` §28). 유일의 반응은 제보망이 가장 먼저 알리는
 * 사건이라는 설정과도 이쪽이 맞는다.
 */
export const TIP_UNIQUE_ANNOUNCE_WITHIN = 10;
/**
 * 제보 대상 추첨의 티어 가중(T0~T4). 예전엔 `spawnTip` 안에 `12 / 5 / 1`이
 * 그대로 박혀 있었다. v0.6에서 상수로 꺼내면서 유일(T4)을 12 → 24로 올린다 —
 * **첫 T4 조우를 첫 10분 안으로** 끌어오는 유일한 길이 레이스이기 때문이다
 * (작업 지시 §3 협상불가 2: "공급을 늘리는 것이 아니라 레이스를 앞당기는 것").
 * 세계 재고(종당 1점)는 한 자리도 바뀌지 않는다.
 */
export const TIP_TIER_WEIGHT = [0, 0, 1, 6, 24] as const;
/** 풀이 비어 제보를 못 띄웠을 때의 재시도 간격(초). 이 값이 곧 "공급이 말랐을 때
 *  플레이어가 기다리는 시간"이라 상수로 꺼내 둔다 — 예전엔 spawnTip 안에 30이
 *  박혀 있어 첫 제보 실측 936초의 원인 중 하나가 이름 없이 숨어 있었다 */
export const TIP_RETRY_INTERVAL = 10;
export const TIP_DURATION_MIN = 60;
export const TIP_DURATION_MAX = 150;
/** 제보 대상 층에서 파는 동안 롤마다 대상 유물이 나올 확률 */
export const TIP_PLAYER_HIT = 0.28;
/**
 * 라이벌의 제보 적중 확률(드랍 1롤당). v0.5.1의 0.10에서 **플레이어 기본값과
 * 같은 0.28로** 올렸다. 이제 아무것도 누르지 않으면 레이스는 **반반**이고,
 * [집중 굴착]을 누르면 60%(`TIP_FOCUS_DIG_HIT_CHANCE`)가 된다 — 결정이
 * 결과를 바꾸는 자리가 처음으로 생긴다. 척추 4번은 그대로다: 안 눌러도
 * 손해가 아니라 **공정한 레이스**이고, 진다고 진척이 깎이지도 않는다.
 * 아래는 올리기 전에 적어 둔 근거다 — 168시간
 * 전체로는 승 545 / 패 42라 "잃을 수도 있다"가 통계적으로만 존재했고,
 * **첫 10분에는 패가 0회**였다(5시드 전부). 재미 3문장 ②는 이기기만 해서는
 * 성립하지 않는다(작업 지시 §6.2). 플레이어 28% 대 라이벌 18%로, 여전히
 * 플레이어가 유리하되 지는 판이 첫 세션 안에 들어온다.
 */
export const TIP_RIVAL_HIT = 0.28;

/** 추격 계수 상한. UI에 그대로 노출한다(Fair Progression) */
/** 라이벌 재투자 판정 경계(초). `digRival` 주석 참조 — 스텝 무관성을 위한 격자다 */
export const RIVAL_REINVEST_INTERVAL_SECONDS = 30;

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
 *  참조). 발굴단 루틴 재파견과 비슷한 체감 빈도로 잡았다.
 *
 *  **v0.6 — 60 → 20초.** 이 값은 "자동화가 상황에 반응하는 데 걸리는 시간"이고,
 *  게임 전체가 8.6배 압축됐으므로(엔딩 140시간 36분 → 16시간대) 60초는 예전
 *  기준의 8분에 해당한다. 실제로 감정 파이프라인 교착(`qa:pipeline`)의 정지
 *  구간이 전부 "한 루틴 주기" 길이였다 — 주기 자체가 정지 시간이었다는 뜻이다.
 *  20초로 당기면 같은 탈출구가 같은 방식으로, 세 배 빨리 열린다. */
export const AUTO_ROUTINE_INTERVAL_SECONDS = 20;
/** 인부·장비·감정소 자동 재투자가 항상 남겨 두는 자금 여유분 — 다음 몇 건의
 *  감정비 정도는 항상 감당할 수 있게, 재투자가 감정 파이프라인의 현금을
 *  전부 흡수하지 않도록 막는다. */
export const AUTO_INVEST_RESERVE = 5_000;
/** 자동 재투자가 감정 수수료로 남겨 두는 대기 항목 수(engine `autoInvestReserve` 주석) */
export const AUTO_INVEST_FEE_RESERVE_ITEMS = 5;

// ── 발굴단·원정 (§8, world-map.md §2·§3·§5 — 2단계에서 실제로 구현. 회차제·
// 거리·미스헵·후불 원정비는 app/src/game/expedition.ts가 쓴다) ─────────────
export const MAX_EXPEDITION_TEAMS_INITIAL = 1;
export const MAX_EXPEDITION_TEAMS_CAP = 4;
/**
 * 2·3·4번째 발굴단 슬롯 해금비. v0.5.1의 5,000만₩ 곡선(5천만/2억/8억)은
 * 140시간 곡선에 맞춰 잡힌 값이라, 압축 후에는 2번째 팀이 7시간 40분에야
 * 열려 첫 세션에 아무 의미가 없었다(`notes/play-first-10h.md` §2 타임라인).
 */
export const EXPEDITION_TEAM_UNLOCK_BASE = 250_000;
export const EXPEDITION_TEAM_UNLOCK_GROWTH = 3.0;
/**
 * 발굴단 인원·장비 자동 증강(v0.6.6, `engine.ts` `autoInvestTeams`)의 문턱.
 * 세 값 모두 운영 기준선 정책(`sim/policy.ts`)이 v0.3부터 손으로 눌러 오던 그
 * 값을 그대로 옮긴 것이다 — 자동화하면서 밸런스를 새로 발명하지 않는다.
 *
 * - 슬롯 비축 배수: 다음 발굴단 슬롯 해금비의 1.5배가 모이기 전에는 증강하지
 *   않는다. 팀 발굴력을 올리면 원정비(노셔널 수입 비례)도 같이 커져, 슬롯을 하나
 *   더 열어 12거점 커버리지를 넓히는 더 나은 투자로 갈 자금을 한 팀이 흡수한다
 *   (G56 실측 — 팀이 1개에서 멈췄다, G80.1이 자동화를 미룬 이유가 바로 이 결합이다).
 * - 인원은 자금 25만 달러, 장비는 250만 달러 이상일 때만 산다.
 */
export const TEAM_AUTO_UPGRADE_SLOT_RESERVE_MULT = 1.5;
export const TEAM_AUTO_WORKER_MIN_FUNDS = 250_000;
export const TEAM_AUTO_GEAR_MIN_FUNDS = 2_500_000;
export const FOREMAN_HIRE_COST = 100_000;
// MAX_GEAR_LEVEL은 v0.1 실코드에 이미 존재한다(위 §2.1 근방) — 여기 중복 선언하지 않는다.
export const EXPEDITION_MISHAP_BASE = 0.02;
export const EXPEDITION_MISHAP_PER_1000KM = 0.01;
export const EXPEDITION_MISHAP_CHANCE_CAP = 0.25;
export const EXPEDITION_MISHAP_TIME_LOSS_RATIO = 0.5;
export const EXPEDITION_ONSITE_RATIO = 3.0;
export const EXPEDITION_DISTANCE_YIELD_COEFF = 0.5;
/**
 * 원정 이동 속도(km/h). v0.5.1까지 400이었고, 그 값에서 서울→리마 편도가
 * **35.3시간**이었다 — 시작 발굴단이 첫 세션에 존재하지 않는 직접 원인이다
 * (`notes/play-first-10h.md` §5.1). v0.6은 전체 곡선 압축의 일부로 이 값을
 * 올린다. 플레이버("대항해시대풍 선박·대상")는 포기한 대가이고, 그 대신
 * 첫 원정이 세션 안에 왕복한다(경주→도쿄 편도 6분·왕복 21분).
 */
export const EXPEDITION_SPEED_KMH = 3_000;
export const EXPEDITION_ONSITE_MIN_HOURS = 0.05; // 3분 — 거점 로컬 유적의 최소 현지 작업 시간
export const EXPEDITION_DISTANCE_COST_COEFF = 0.5;
export const EXPEDITION_DISTANCE_REF_KM = 10_000;
/** 발굴 원정비 — 수입 대비 비율(notes/economy.md K5). 귀환 시 후불 원천징수된다. */
export const EXPEDITION_COST_INCOME_RATIO = 0.15;
export const MAX_OWNED_SITES = 3; // base 슬롯 **기본값**(world-map.md §5) — 안목으로 늘어난다(아래)

// ── 도감 되먹임 — 안목(眼目) (v0.6.2, notes/decisions.md G91) ──────────────
/**
 * **도감이 힘이 되는 두 갈래 중 하나 — 선점 승산.**
 *
 * 거점 도감을 채운 비율이 그 거점 제보 레이스에서 플레이어 가중에 곱해진다:
 * `× (1 + EYE_RACE_BONUS_MAX × 그 거점 도감 비율)`. 다 채운 거점이면 1.6배다.
 *
 * 왜 이 자리인가. `notes/play-first-10h.md` §4가 이름 붙인 결함이 "도감이 늘어도
 * **다른 축에 아무 영향이 없다**"였다 — 발굴력도 자금도 제보 확률도 도감을
 * 참조하지 않고, 엔딩 판정의 `codexScore`만 본다. 그래서 도감이 멈추는 순간
 * 플레이어가 잃는 건 진행이 아니라 **진행의 유일한 증거**였다(처방 ⑤, 미적용으로
 * 남아 있던 것).
 *
 * 수입이 아니라 **선점**에 붙인 이유는 척추 2번이다("깊이는 희소성만 열고, 수입은
 * 발굴력에서만"). 도감을 발굴력이나 평가액에 곱하면 `도감 × 발굴력`이 곱해져
 * 즉시 폭주한다 — 이 레포가 첫 구현에서 20분 만에 발굴력 194만/s를 만든 그 경로다.
 * 선점 승산은 세계 재고를 한 자리도 늘리지 않고(척추 1번), 이미 상한이 있는 값이다.
 *
 * 설정상으로도 이게 맞다: 이 게임이 번역해 온 것이 웹툰 `도굴왕`의 **정보 우위**이고
 * (brief.md §참고), "아는 자리에서 먼저 찾는다"가 그 우위의 정확한 모양이다.
 */
export const EYE_RACE_BONUS_MAX = 0.6;
/** 안목을 얹어도 적중 확률이 이 값을 넘지 않는다(집중 굴착 60% × 1.6 = 96%를 자른다) */
export const EYE_HIT_CHANCE_CAP = 0.95;
/**
 * **두 번째 갈래로 만들었다가 들어낸 것 — 도감이 base 슬롯을 여는 안**(G91.1).
 *
 * `notes/play-first-10h.md` §5.3이 잰 천장(base 3개 → 도감 434종·22.8%에서 정지)을
 * 지식으로 열자는 설계였고, 실제로 구현해 10시간 계측을 돌렸다. 결과가 분명했다 —
 * 운영 플레이가 base를 3곳에서 **5곳으로** 늘렸는데 10시간 도감은
 * **999종 → 998종**으로 한 종도 늘지 않았고, 자산만 **830억₩ → 743억₩**으로 줄었다.
 *
 * 이유는 v0.6이 이미 그 천장을 없앴기 때문이다. 플레이어는 **한 번에 한 거점만**
 * 파고(`activeSite`), 나머지 11거점은 원정이 덮는다 — v0.6이 이동 속도를 7.5배로
 * 올리고 발굴단 슬롯값을 5,000만₩ → 25만₩으로 내리면서 10시간 안에 4팀이 돈다.
 * base를 더 여는 것은 같은 발굴 시간을 더 넓게 나눌 뿐이라 종을 늘리지 못하고,
 * 해금비와 시설비만 나간다.
 *
 * **그래서 규칙을 남기지 않았다.** 아무것도 바꾸지 않는 조항은 밸런스가 아니라
 * 사문(死文)이고, 규칙 화면에 적히는 순간 거짓말이 된다. 남긴 것은 화면 하나다 —
 * 슬롯이 다 찼을 때 그 자리에 이유를 적는다(예전엔 버튼이 조용히 사라졌다).
 */

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
/**
 * 드랍 1건 사이의 최소 간격(초). §7.5가 "하한 자체가 배경 소음"이라고 적어 둔
 * 값이고(`notes/play-telemetry.md`), v0.6의 D축(반복:의미)은 그 지적을 정면으로
 * 받는다 — **분모를 줄이고 한 건을 무겁게** 하는 방향이다(작업 지시 §2 D).
 * 하한에 걸린 구간에서는 드랍률이 `1/FLOOR`로 발굴력과 무관해지므로, 이 값을
 * 올리면 화면이 조용해지는 대신 종 수집 속도도 같은 비율로 준다 — 그 대가는
 * 거점·발굴단 비용 압축(위)으로 갚는다. `notes/mda.md` §6의 경보 기준
 * (초기 구간 40초 이하, 분 스케일 5분 초과 금지)은 그대로 지킨다.
 */
export const DROP_INTERVAL_FLOOR_SECONDS = 16;
/**
 * 드랍 1건 사이의 **최대** 간격(초) — `notes/mda.md` §6이 "초기 구간 드랍 간격은
 * 40초를 넘기지 않는다"고 **경보 기준으로만** 적어 둔 것을 v0.6에서 **규칙으로**
 * 만든다. 하한과 대칭이다.
 *
 * **왜 필요한가.** 드랍 임계는 층 기대 평가액에 비례하는데(척추 2번), 층 기대
 * 평가액은 진귀(900만₩)·국보(2.6억₩)가 열리는 순간 8~20배로 뛴다. v0.6의 깊이
 * 압축은 그 층들을 첫 1분 안으로 당기므로, 천장이 없으면 **발굴력이 따라오기
 * 전에 드랍이 100초에 한 번**이 된다(실측). 그러면 제보 레이스가 배너 수명 안에
 * 결판나지 않고, 화면은 조용한 대기실이 된다 — mda가 경보로 적어 둔 바로 그
 * 상태다.
 *
 * 천장이 걸린 구간에서는 드랍 **빈도**가 고정되고 **드랍당 가치**가 깊이를 따라
 * 오른다. 이게 작업 지시 §2 D가 허용한 "드랍을 줄이고 한 건을 무겁게"의
 * 실제 구현이다.
 */
export const DROP_INTERVAL_CEILING_SECONDS = 20;
/** §9.5 재역산 가중 — layerBaseWeights()가 실제로 적용한다(위 함수 주석의 보고 참조) */
export const LAYER_BASE_WEIGHTS_8_9 = [52, 36, 11, 0.01, 0] as const;
export const LAYER_BASE_WEIGHTS_10_12 = [38, 40, 18, 0.03, 0.005] as const;
export const VAULT_CAPACITY_BASE = 100;
export const VAULT_CAPACITY_PER_LEVEL = 40;
export const VAULT_OVERFLOW_CONDITION_DECAY_MULT = 2.0;
/**
 * **정원 초과 자동 대응의 안전 계수**(v0.6.3, `notes/decisions.md` G92) — 자동화는
 * 비용의 이 배수만큼 자금이 (재투자 유보금 위로) 남아 있을 때만 시설을 산다.
 * 시뮬 정책이 쓰던 `funds >= cost * 3` 관용구를 엔진 쪽으로 옮긴 값이다.
 *
 * **안전 계수는 반복 지출(습도조절)에만 건다.** 증축은 초과를 그 자리에서 끄는
 * 일회성 구매라 살 수 있으면 바로 산다 — 3배 쿠션을 기다리게 했더니 실측에서
 * 방치 플레이의 **보관소가 Lv.1에 멈췄다.** 자금이 모이는 동안 소장품이 더 빨리
 * 늘어 "한 칸이면 해소되는" 창이 닫혀 버리기 때문이다(G92 실측).
 *
 * 그 창이 닫히는 것 자체는 설계가 아니라 **구조**다: 10시간 실측에서 소장고는
 * 972점인데 도감이 996종이다 — 보관하는 것이 중복분이 아니라 **수집품 그 자체**라,
 * 정원 1,000점은 보관소 23레벨(약 950억₩)이다. 그래서 자동화는 버틸 수 있을
 * 때까지 증축하다가, 따라잡을 수 없어지면 습도조절로 갈아탄다.
 */
export const VAULT_CARE_COST_HEADROOM = 3;
/**
 * 경매 출품 대기가 이 점수를 넘으면 시뮬 정책이 **직접매각으로 되돌린다**(G96).
 * 경매 슬롯이 적체를 못 따라가는 상태에서 "경매로만 보낸다"를 고수하면 중복이
 * 소장고에 무한정 쌓인다 — 실측에서 운영 기준선 소장고 2,125점 중 1,131점이
 * 그 대기였다. 엔진은 이 전환을 몰래 하지 않는다(플레이어가 고른 건 "경매로
 * 보내라"다) — 화면이 대기 점수를 적어 주고, 바꾸는 것은 사람의 선택이다.
 */
export const AUCTION_BACKLOG_FALLBACK_ITEMS = 60;
/**
 * 중복분 자동 정리가 **한 번에 모아서** 도는 최소 점수(v0.6.4, G95.1).
 *
 * 기본값을 켜자(G95) 첫 10분의 **반복 이벤트가 최악 시드에서 106 → 123건**으로 늘어
 * 밀도 원장의 D축(반복:의미)이 1.35 → 1.58로 빨개졌다. 원인은 한 점 나올 때마다
 * 즉시 파는 것이었다 — 그건 "정리"가 아니라 소음이고, 사람도 그렇게 놀지 않는다.
 *
 * 쌓였을 때 한 번에 치우면 화면의 사건 수가 줄고(로그도 한 줄이다) 회수 금액은
 * 거의 같다. 플레이어가 직접 누르는 "지금 정리"는 이 임계와 무관하다 — 임계는
 * 자동 경로(`autoSellVaultSpares`)에만 걸린다.
 */
export const AUTO_SELL_SPARE_BATCH_MIN = 20;
/**
 * 정원 초과가 아니어도 자동화가 유지하는 **습도조절 하한**(v0.6.4, G95).
 *
 * v0.6.3의 `autoVaultCare`는 초과일 때만 습도를 올렸다. ①②③을 적용해 초과가
 * 0%가 되자 **자동화가 습도를 한 칸도 사지 않게 됐고**(Lv.7 → Lv.1), 보존 저하는
 * 그대로 도니 keeper 보존이 1.49 → 1.12로 내려갔다. 초과는 저하를 2배로 만드는
 * 배수일 뿐, 저하 자체는 초과와 무관하게 계속된다 — 상쇄를 초과에만 묶어 둔 것이
 * 틀렸다.
 *
 * 값은 시뮬 정책이 이미 유지하던 선(Lv.5)을 그대로 쓴다. 운영 기준선이 사람 손으로
 * 지키던 수준을 **탭만 열어 둔 플레이에도 준다**(척추 4번).
 */
export const VAULT_CARE_HUMIDITY_FLOOR = 5;
/**
 * **보존 판정의 격자(초)** — 이 간격마다 한 번씩 저하를 굴린다(v0.6.3, G93).
 *
 * v0.6.2까지 이 값은 `86400`(하루)이었다. v0.2 설계에서는 그게 맞았다 — 한 판이
 * 140시간이라 판정이 대략 **5~6회** 일어났다. 그런데 **v0.6이 엔딩을 16시간으로
 * 압축하면서 이 격자만 그대로 남았다.** 그 결과 한 판을 끝까지 가도 하루 경계를
 * 한 번도 넘지 못해, **보존 저하가 단 한 번도 일어나지 않았다**(G93 실측).
 *
 * 즉 소장고가 "정원을 넘기면 보존 저하 2배"라고 10시간 내내 경고하는 동안,
 * 그 저하 자체가 발동하지 않았다. 경고가 가리키는 피해가 없는 경고였다.
 *
 * 값은 지어내지 않고 **원래 리듬을 보존**해 잡았다: 16시간 판에서 5~6회가 되려면
 * 2.8시간 간격이다. 판정 1회당 확률(`CONDITION_DECAY_BASE_RATE_PER_DAY`)은 그대로라,
 * **한 판 전체의 기대 저하량은 v0.2 설계값과 같다.**
 */
export const CONDITION_TICK_SECONDS = 10_000;
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
export const AUCTION_GRADE_COST_BASE = 2_500_000;
export const AUCTION_GRADE_COST_GROWTH = 3.0;
/**
 * **첫 경매장** 건립비(v0.6.6, P6). 2번째부터는 `auctionHouseBuildCost`의 원래
 * 곡선(750만·2,250만)이다.
 *
 * 250만 달러일 때는 첫 중복 배치 매각(20점, `AUTO_SELL_SPARE_BATCH_MIN`)이 만드는
 * 목돈(운영 기본 시드 약 1,200만 달러, 작은 시드는 360만 달러)이 슬롯 해금·발굴단
 * 증강과 경쟁해 **짓느냐 못 짓느냐가 그 틱의 잔액에 달려 있었다** — 못 지으면 다음
 * 목돈(59분·1시간대)까지 밀려 박물관과 한 틱에 같이 열렸다. 100만 달러면 배치 매각
 * 그 순간의 자금으로 닿는다(운영 12시드 중 9시드가 그 틱에 선다, 중앙 34분). "팔 곳이
 * 필요하다"가 동기가 되는 순간이다.
 * 위의 3천만/9천만/2.7억 주석은 v0.6 압축 전의 값이다(지금 곡선은 250만 기준).
 */
export const AUCTION_HOUSE_FIRST_BUILD_COST = 1_000_000;
export const MUSEUM_GRADE_COST_BASE = 3_500_000;
export const MUSEUM_GRADE_COST_GROWTH = 3.0;
export const MARKETING_LEVEL_COST_BASE = 400_000;
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
/**
 * 관람객 1명당 관람료($). 현실 대형 박물관 성인 입장료 수준이다(메트로폴리탄 미술관
 * 성인 $30). v0.5.1까지는 20,000(원화 시절 값)이라 달러로 읽으면 1명당 $20,000이었다
 * (notes/decisions.md G84). 이 값으로는 박물관이 사실상 돈을 벌지 않는다 — 건립비
 * 회수에 15년이 넘게 걸린다(spec.md §10.3). 박물관은 명성의 주축이지 자금원이 아니라는
 * G5의 원래 정의 쪽으로 돌아간 것이고, 엔딩 시각은 움직이지 않는다(eval.md §28).
 */
export const MUSEUM_TICKET_PRICE = 30;
export const MUSEUM_MARKETING_COEFF = 0.08;
export const MUSEUM_MARKETING_LEVEL_CAP = 10;
export const MUSEUM_MAX_COUNT = 3;
export const MUSEUM_SLOT_BY_GRADE = [1, 3, 6, 10, 15] as const;
export const MUSEUM_BUILD_COST_BASE = 4_000_000;
/**
 * **첫 박물관** 건립비(v0.6.6, `notes/decision-tree-10h.md` P6). 2관부터는 위 곡선
 * 그대로(1,200만·3,600만)다.
 *
 * 400만 달러일 때는 첫 1시간 자금(20만~200만 달러대)으로 닿지 않아, 첫 중복 배치
 * 매각이 한 번에 목돈을 만드는 틱(운영 5시드 29~39분)이나 그보다 늦게 **경매장·
 * 관장·경매관장과 한 틱에** 같이 열렸다 — 첫 관람객과 첫 낙찰이 한 번에 뭉개졌다.
 * 첫 국보 무렵 "이걸 걸 자리가 필요하다"가 동기가 되도록, 건립비를 그 순간의 자금
 * 수준에 맞춘다(운영 12시드 중앙 약 20분에 선다). 관람료가 1명당 $30이라
 * (`MUSEUM_TICKET_PRICE`) 박물관을 당겨도 수입 곡선은 거의 움직이지 않는다 — 박물관은
 * 명성 축이지 자금원이 아니다.
 */
export const MUSEUM_FIRST_BUILD_COST = 600_000;
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
/**
 * 추천 점수의 거리 감쇠 반감 시간(편도 시간, h) — `recommendSites`가
 * `점수 × 1/(1 + 편도시간/이 값)`으로 먼 거점을 깎는다. 이 값이 곧 "얼마나
 * 먼 곳까지 추천에 올릴 것인가"다(v0.6, `notes/play-first-10h.md` §8 ①).
 */
export const RECOMMEND_TRAVEL_HALF_HOURS = 0.5;

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

// ── 기록패(플레이어 간 비동기 경쟁, v0.5 · notes/decisions.md G76) ─────────
/** 기록패 스키마 버전. 올릴 때는 parseCard가 옛 버전을 계속 읽게 하거나,
 *  못 읽는다는 사실을 화면에 그대로 적는다(척추 5번). */
export const CARD_VERSION = 1;
/** 기록패 문자열 상한. 이 위로는 파싱 전에 버린다 — 남이 준 문자열이
 *  JSON.parse에 닿기 전에 잘라 내는 첫 번째 방어선이다. */
export const CARD_MAX_CHARS = 2048;
/** 동시에 받아 둘 수 있는 고스트 수. 순위표가 13행이 되면 읽히지 않고,
 *  step()의 라이벌 루프가 그만큼 무거워진다(G76.4). */
export const GHOST_MAX = 3;
/**
 * 고스트가 재현할 수 있는 발굴력 상한(진척/초) — **받아들이는 순간에만** 건다.
 *
 * 기록패는 발굴력이라는 결과값이 아니라 `workers`/`gear`라는 **상태**를 나른다.
 * 결과값을 나르면 받는 쪽이 그걸 되돌리려다 반드시 틀린다 — 실제로 한 번 틀렸다:
 * 발굴력 9,423/s를 `gear = 0` 가정으로 인부 8,566명으로 환산했더니, NPC와 같은
 * 재투자 루프가 그 인부 더미 위에 장비를 13단계 얹어 **4,243,517/s**까지 부풀었다
 * (실측 — `eval.md` §21). 인부와 장비를 그대로 옮기면 이 왜곡이 원천적으로 없다.
 *
 * 그래도 상한을 남겨 두는 이유는 위조 때문이다. 인부 수는 위조할 수 있고
 * (`GHOST_WORKERS_CAP`이 1차로 자르지만 그 안에서도 장비와 곱해진다), 곱셈 하나가
 * 판을 못 쓰게 만들 수 있다. 값의 근거는 실측이다 — 168시간 방치 시뮬에서 가장 센
 * NPC가 26,349/s다. **사람 상대는 가장 센 NPC만큼 셀 수 있지만 그보다 세게 들어오지는
 * 못한다.** 들어온 뒤의 성장은 NPC와 똑같은 규칙이라 막지 않는다.
 */
export const GHOST_DIG_POWER_CAP = 30_000;
/**
 * 기록패가 나를 수 있는 인부 수 상한. 엔딩 시점 플레이어가 77명이다(`eval.md` §21) —
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
