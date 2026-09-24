import {
  APPRAISAL_HIGH_TIER_TIME_MULT, APPRAISAL_UNLOCK_LAB_LEVEL, APPRAISE_FEE,
  ASSET_SCORE_REF, AUCTION_FEE_RATE, AUCTION_HOUSE_MAX_COUNT, DEFAULT_OWNER_NAME,
  AUCTION_SETTLE_HOURS, AUCTION_SLOT_CAP_BY_GRADE, AUTO_INVEST_FEE_RESERVE_ITEMS, AUTO_INVEST_RESERVE,
  AUTO_SELL_KEEP_ONE_PER_SPECIES, AUTO_SELL_MAX_TIER, AUTO_SELL_SPARE_KEEP_PER_SPECIES,
  AUTO_SELL_SPARE_BATCH_MIN, AUTO_SELL_SPARE_MAX_TIER,
  BASE_DIG, BLACK_MARKET_BUY_PRICE_RATIO, BLACK_MARKET_LOOSE_MAX_TIER,
  BLACK_MARKET_RESTOCK_INTERVAL_HOURS, BLACK_MARKET_SLOT_CAPACITY, BLACK_MARKET_STOLEN_PRICE_RATIO,
  BLIND_SELL_RATE, CATCHUP_MAX, CATCHUP_SLOPE, CLICK_COMBO_MAX, CLICK_COMBO_STEP, CLICK_COMBO_WINDOW,
  CLICK_FACTOR, CLICK_RATE_CAP, CODEX_GOAL_V2, CONDITION_VALUE_FACTOR, DEPTH_INCOME_BONUS,
  EMERGENCY_DISPATCH_COST_MULT, EMERGENCY_DISPATCH_MAX_REACH_HOURS, EMERGENCY_DISPATCH_MISHAP_MULT,
  EMERGENCY_DISPATCH_TRAVEL_MULT, EXPEDITION_COST_INCOME_RATIO, EXPEDITION_MISHAP_CHANCE_CAP,
  EXPEDITION_MISHAP_TIME_LOSS_RATIO, EXPEDITION_SPEED_KMH, EXPEDITION_TEAM_UNLOCK_BASE,
  EXPEDITION_TEAM_UNLOCK_GROWTH, FAME_FIRST_T4_WEIGHT, FAME_PER_DEDICATED, FAME_PER_DEDICATED_T4,
  FAME_VISITOR_NORMALIZATION, FIRST_RELOCATION_FREE_WINDOW_HOURS, FOREMAN_HIRE_COST,
  FOREMAN_SALARY_INCOME_SHARE, GEAR_MULT, HOME_BASE_BONUS_DROPMOD_MULT, HOME_BASE_BONUS_DURATION_HOURS,
  LAYERS_PER_SITE, LOCKED_HOLD_TIER_EXEMPT_MIN_TIER, MAX_EXPEDITION_TEAMS_CAP,
  EYE_HIT_CHANCE_CAP, EYE_RACE_BONUS_MAX,
  MAX_EXPEDITION_TEAMS_INITIAL, MAX_GEAR_LEVEL, MAX_OWNED_SITES, MUSEUM_MAX_COUNT,
  MUSEUM_NET_INCOME_CAP, MUSEUM_SLOT_BY_GRADE, OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY, PROGRESS_VALUE,
  RANK_WEIGHT, RECOMMEND_TOP_N, RECOMMEND_TRAVEL_HALF_HOURS, REGIONAL_PRICE_MULT_MAX,
  RIVAL_REINVEST_INTERVAL_SECONDS, REGIONAL_PRICE_MULT_MIN, RELOCATION_COOLDOWN_HOURS,
  RELOCATION_COST_ASSET_RATIO, REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX, REMOTE_ARBITRAGE_MIN_DISTANCE_KM,
  RESTORATION_BASE_HOURS,
  SEASON_CASHOUT_RATIO, SEASON_CARRYOVER_FUNDS_CAP_MULT, SEASON_LENGTH_WEEKS, SEASON_TITLE_HOLD_HOURS,
  SITES, SITE_BY_ID,
  STAFF_MARKET_REFRESH_HOURS, STAFF_PROMOTION_INTERVAL_HOURS, STOLEN_TO_BLACKMARKET_CHANCE,
  THEFT_APPLICABLE_MAX_TIER, THEFT_RATE_BASE, THEFT_RECOVERY_WINDOW_HOURS, TIER4_SPECIES_TOTAL,
  CONDITION_TICK_SECONDS, VAULT_CARE_COST_HEADROOM, VAULT_CARE_HUMIDITY_FLOOR,
  TEAM_AUTO_GEAR_MIN_FUNDS, TEAM_AUTO_UPGRADE_SLOT_RESERVE_MULT, TEAM_AUTO_WORKER_MIN_FUNDS,
  TIER_STOCK_PER_SPECIES, TIP_DECIDE_AFTER_GRACE_SECONDS, TIP_DURATION_ONSITE_MAX, TIP_DURATION_ONSITE_MIN,
  TIP_FIRST_DELAY, TIP_FIRST_UNIQUE_TAUGHT, TIP_FIRST_WIN_GUARANTEED, TIP_UNIQUE_PRIORITY,
  TIP_UNIQUE_REQUIRES_RESPONSE,
  TIP_UNIQUE_ANNOUNCE_WITHIN, TIP_UNRESPONDED_UNIQUE_MULT, TIP_WORLDWIDE_MIN_TIER,
  TIP_FOCUS_DIG_COST_MULT, TIP_FOCUS_DIG_HIT_CHANCE, TIP_MEAN_INTERVAL, TIP_PLAYER_HIT,
  TIP_MIN_RESPONSE_SECONDS, TIP_RETRY_INTERVAL, TIP_RIVAL_HIT, TIP_TIER_WEIGHT,
  UNEXPLORED_BONUS_APPRAISAL_VOUCHER, WORKER_DIG,
  appraiseSeconds, auctionGradeCost, auctionHouseBuildCost, conditionDecayChancePerDay, distanceKm,
  dropThreshold, gearCost, humidityLevelCost, labCost, layerCost, layerExpectedValue, marketingLevelCost,
  museumBuildCost, museumGradeCost, notionalDropThreshold, pendingCap, restorationAttemptHours, restorationLevelCost,
  restorationSuccessChance, securityLevelCost, theftInitialGraceHours, tierValue, tierWeights,
  vaultCapacity, vaultLevelCost, workerCost
} from "./balance";
import { ARTIFACTS, ARTIFACT_BY_ID, artifactsOf } from "./artifacts";
import {
  distanceCostMult, distanceYieldBonus, mishapChance, onsiteHoursOf, onsiteWindow,
  teamDigPower, travelHoursOneWay
} from "./expedition";
import { hashFrac } from "./hash";
import { josa, withJosa, usd } from "./format";
import { siteAnchorLabel } from "./sites";
import { localPriceMult } from "./market";
import {
  freshnessOnDisplay, freshnessRecovered, museumUpkeepHourly, museumVisitorIncomeHourly,
  museumVisitorsPerDay
} from "./museum";
import { Rng } from "./rng";
import {
  auctionPriceMult, auctioneerSalary, auctioneerSlotBonus, curatorSalary, foremanSalary,
  foremanSpeedMult, museumCuratorContribution, promote, staffCandidates, theftRecoveryChance
} from "./staff";
import type {
  Artifact, AuctionHouse, AuctionListing, Auctioneer, Curator, ExpeditionTeam, Foreman,
  Ledger, LogKind, Museum, OwnerId, PersistentRecord, RivalState, SeasonState, Shape, SiteId, Staff,
  StepReport, TheftEvent, Tier, Tip, VaultItem, World
} from "./types";

const SEASON_LENGTH_SECONDS = SEASON_LENGTH_WEEKS * 7 * 24 * 3600;

const RIVAL_SEED: { id: string; name: string; baseDig: number; favSite: SiteId; sellBelow: Tier }[] = [
  { id: "r1", name: "이무진", baseDig: 1.35, favSite: "korea", sellBelow: 1 },
  { id: "r2", name: "박준서", baseDig: 1.15, favSite: "korea", sellBelow: 2 },
  { id: "r3", name: "H. 뮐러", baseDig: 1.0, favSite: "egypt", sellBelow: 1 },
  { id: "r4", name: "A. 파리드", baseDig: 0.9, favSite: "egypt", sellBelow: 0 },
  { id: "r5", name: "L. 로시", baseDig: 0.85, favSite: "rome", sellBelow: 2 },
  { id: "r6", name: "서하윤", baseDig: 0.75, favSite: "rome", sellBelow: 0 }
];

let uidCounter = 1;
export function nextUid(): number {
  return uidCounter++;
}

export function createLedger(): Ledger {
  const ledger: Ledger = {};
  for (const a of ARTIFACTS) {
    const total = TIER_STOCK_PER_SPECIES[a.tier];
    ledger[a.id] = { total, remaining: total, owners: [] };
  }
  return ledger;
}

function initialSites(): World["sites"] {
  const sites = {} as World["sites"];
  for (const s of SITES) {
    const isBase = s.unlockCost === 0;
    sites[s.id] = {
      layer: 1, layerProgress: 0, dropProgress: 0,
      unlocked: isBase,
      baseSince: isBase ? 0 : null
    };
  }
  return sites;
}

function initialSeasonState(season = 1, startedAt = 0): SeasonState {
  return { season, startedAt, endsAt: startedAt + SEASON_LENGTH_SECONDS, titleHolderId: null, titleHeldSinceT: null };
}

export function createPersistentRecord(): PersistentRecord {
  return {
    legacyFame: 0, hallOfFame: [], carryoverFundsCredit: 0, firstT4Finds: 0, championHistory: [],
    ownerName: DEFAULT_OWNER_NAME
  };
}

/**
 * `grantTeam=false`는 **계측 전용 문**이다(v0.6). 시작 발굴단 배정·첫 파견은
 * `w.t = 0`에 일어나므로, 상태 diff 계측기(`sim/telemetry.ts`)가 세계를 처음
 * 스냅샷하는 시점에는 **이미 끝나 있다** — 그러면 첫 10분 A축(사건 종류)에서
 * "단장 합류"와 "첫 파견"이 통째로 사라진다. 계측기는 `createWorld(seed, false)`
 * → 스냅샷 → `grantStartingTeam(w)` 순서로 불러 그 두 사건을 본다. 호출 순서와
 * 난수 소비는 기본 경로와 **한 칸도 다르지 않다**(계측이 게임을 바꾸지 않는다).
 */
export function createWorld(seed = 20260917, grantTeam = true): World {
  const sites = initialSites();
  const codex: Record<string, "unseen"> = {};
  for (const a of ARTIFACTS) codex[a.id] = "unseen";

  const world: World = {
    version: 11,
    t: 0,
    lastTickAt: Date.now(),
    // 감정에는 추정가의 2%가 든다. 종잣돈이 0이면 첫 유물을 감정조차 못 해
    // 첫 1분이 완전히 죽는다(스모크로 확인). 인부 한 명 값을 쥐여 주고 시작한다.
    funds: 30_000,
    sites,
    activeSite: "korea",
    workers: 0,
    gear: 0,
    lab: 1,
    pending: [],
    vault: [],
    ledger: createLedger(),
    rivals: RIVAL_SEED.map((r) => ({
      ...r,
      workers: 0,
      gear: 0,
      funds: 0,
      layer: 1,
      layerProgress: 0,
      dropProgress: 0,
      vaultValue: 0,
      owned: [],
      catchup: 1,
      // 라이벌도 플레이어와 동일하게 무료 base 1곳에서 시작한다(spec.md §12.1,
      // notes/decisions.md G18/A14) — favSite를 홈 거점으로 그대로 쓴다.
      homeSite: r.favSite,
      tipChase: null
    })),
    codex,
    tip: null,
    nextTipIn: TIP_FIRST_DELAY,
    log: [{ t: 0, kind: "system", text: "경주 고분군에서 발굴을 시작했다." }],
    // autoSellBelow=1(희귀 이하 자동 매각)·autoReinvest=true가 기본이다 — 클릭
    // 0회로도 자금이 돌게 하는 기본 자동화(G3·척추 4번, notes/decisions.md G57).
    // 셋 다 설정에서 끌 수 있다(off로 두면 예전처럼 완전 수동, 손실은 없다).
    //
    // **`autoSellSpareBelow`도 기본으로 켠다**(v0.6.4, G95 — 예전엔 `null`이었다).
    // 소장고 정원 초과의 최대 원인이 이 기본값이었다: 방치 플레이 소장고 965점 중
    // **482점이 중복이고 그 97%가 진귀(T2)** — 자동 정리 상한 안에 있는, 치울 수
    // 있는 것들이 치워지지 않은 채 쌓여 정원을 밀어내고 있었다. 켜면 방치 플레이의
    // 초과가 92% → 0%가 된다(G95 실측). 도감은 안전하다 — 종당 1점 보존·전시 중
    // 제외·국보 이상 제외를 `spareVaultItems()` 하나가 지키고 `qa:autosell`이
    // 틱 단위로 검증한다. **이미 저장된 세이브는 건드리지 않는다**(유물을 파는
    // 동작이라 비가역이다 — 새 세계에만 적용하고, 옛 세이브는 설정에서 한 번에 켠다).
    settings: {
      autoSellBelow: 1, autoSellSpareBelow: AUTO_SELL_SPARE_MAX_TIER, spareDestination: "sell",
      muted: false, autoReinvest: true, autoFocusTips: true
    },
    stats: { drops: 0, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
    clickCombo: 1,
    clickComboUntil: 0,
    clickSecond: 0,
    clickAccum: 0,
    rngState: seed >>> 0,
    ended: false,
    seasonState: initialSeasonState(),
    teams: [],
    maxTeams: MAX_EXPEDITION_TEAMS_INITIAL,
    staff: [],
    appraisalVouchers: 0,
    visitedSites: {},
    unexploredBonusGranted: {},
    lastRelocationAt: null,
    vaultLevel: 1,
    humidityLevel: 1,
    restorationLevel: 1,
    securityLevel: 1,
    lastConditionDay: 0,
    nextRestorationAttemptAt: RESTORATION_BASE_HOURS * 3600,
    museumDigEma: 0,
    museums: [],
    auctionHouses: [],
    blackMarket: { listings: [] },
    theftEvents: [],
    onlineElapsedSeconds: 0,
    museumCumulativeVisitors: 0
  };

  if (grantTeam) grantStartingTeam(world);
  return world;
}

/**
 * 시작 발굴단 1팀(v0.3.4) — `brief.md` §첫 세션 1이 처음부터 약속했던 것이고
 * (G77.5에서 "구현된 적 없다"로 문서 쪽을 고쳤던 그 항목), v0.3.3 계측이 그
 * 판단을 뒤집을 근거를 냈다.
 *
 * **근거**: 탭만 열어 두는 플레이어는 단장 고용비 $200,000 앞에서 멈춘다.
 * 발굴단이 없으면 다른 거점의 종을 영영 못 만나고, 도감이 125/1,902종(6.6%)에서
 * 정지한다 — 의미 있는 이벤트가 1일차 279건에서 2일차 1건으로 떨어지고, 이후
 * 66시간 53분 동안 아무 일도 없다. 그 정적 속에서 일어나는 유일한 사건이
 * **라이벌에게 빼앗기는 것**(6~24시간 구간 의미 이벤트 15건 전원)이라,
 * 척추 4번("클릭은 언제나 선택 — 안 눌러도 손실 0")이 실측으로 깨져 있었다.
 *
 * 단장은 무료로 배정한다(`FOREMAN_HIRE_COST`를 받지 않는다) — 시작 자금
 * $30,000로는 낼 수 없고, 이건 "첫 세션의 무대 장치"이지 플레이어가 사는
 * 물건이 아니기 때문이다. 후보는 `staffCandidates`의 결정론 목록 첫 번째라
 * 같은 시드면 같은 단장이 온다.
 */
export function grantStartingTeam(w: World) {
  if (w.teams.length > 0 || w.staff.some((s) => s.role === "foreman")) return;
  const home = teamHomeSite(w);
  const candidate = staffCandidates(home, staffMarketCycle(w), "foreman")[0];
  if (!candidate || candidate.role !== "foreman") return;
  const foreman: Foreman = {
    id: `foreman-${nextUid()}`, name: candidate.name, role: "foreman",
    leadership: candidate.leadership, navigation: candidate.navigation
  };
  w.staff.push(foreman);
  const teamId = createTeam(w, foreman.id);
  if (!teamId) return;
  dispatchExpedition(w, teamId, nextRoutineTarget(w, w.teams[w.teams.length - 1]));
  log(w, "system", `단장 ${foreman.name}${josa(foreman.name, "이가")} 합류했다. 발굴단이 원정을 시작한다.`);
}

// ── 파생값 ────────────────────────────────────────────────

export function digPower(w: World): number {
  return (BASE_DIG + w.workers * WORKER_DIG) * Math.pow(GEAR_MULT, w.gear);
}

export function rivalDig(r: RivalState): number {
  return (BASE_DIG + r.workers * WORKER_DIG) * Math.pow(GEAR_MULT, r.gear) * r.baseDig * r.catchup;
}

/** v0.1 자산(팀 전시 여부와 무관하게 vault 전체 합) — 순위표·엔딩은 계속 이 값을 쓴다 */
export function playerAssets(w: World): number {
  return w.vault.reduce((sum, v) => sum + v.value, 0);
}

export type RankRow = { id: OwnerId; name: string; assets: number; dig: number; catchup: number };

export function ranking(w: World): RankRow[] {
  const rows: RankRow[] = [
    { id: "player", name: "나", assets: playerAssets(w), dig: digPower(w), catchup: 1 },
    ...w.rivals.map((r) => ({
      id: r.id, name: r.name, assets: r.vaultValue, dig: rivalDig(r), catchup: r.catchup
    }))
  ];
  return rows.sort((a, b) => b.assets - a.assets);
}

/**
 * owned_unidentified도 "지금 갖고 있다"로 센다(spec.md §13.3) — 이름을 아는지가 아니라
 * 소유 여부가 도감 진행도의 기준이다. v0.1 엔딩 조건(checkEnding)도 이 값을 그대로 쓴다.
 *
 * **분모는 검증된(sourceStatus="verified") 종만 센다**(notes/decisions.md G53, G-B8의
 * 자연스러운 귀결). "pending" 종은 드랍 풀에서 원천 제외되므로 영원히 "owned"가 될 수
 * 없다 — 분모에 포함시키면 도감 완주율이 검증 파이프라인 진행 속도에 발이 묶여 75%
 * 달성이 구조적으로 불가능해질 수 있다. pending 종은 데이터로는 존재하되(향후 검증되면
 * 자동으로 드랍 풀에 편입) 이번 시즌의 "수집 대상 목록"에서는 빠져 있다는 뜻이다.
 */
export function codexProgress(w: World): { owned: number; lost: number; total: number } {
  let owned = 0;
  let lost = 0;
  let total = 0;
  for (const a of ARTIFACTS) {
    if (a.sourceStatus !== "verified") continue;
    total++;
    const s = w.codex[a.id];
    if (s === "owned" || s === "owned_unidentified") owned++;
    else if (s === "lost") lost++;
  }
  return { owned, lost, total };
}

// ── v0.2 3축 순위 (spec.md §13.1) ────────────────────────────────────────

/** 전시 중(vault[].displayed)인 유물은 자산 축에서 제외한다(G49/B4). 박물관이
 *  아직 없어 displayed는 항상 falsy이므로 이번 단계에서는 playerAssets(w)와 같다 */
export function assetScore(w: World): number {
  const assets = w.vault.reduce((sum, v) => (v.displayed ? sum : sum + v.value), 0);
  return Math.min(1, assets / ASSET_SCORE_REF);
}

/**
 * 분모는 `ARTIFACT_SPECIES_TARGET`(480, 문서가 잡은 최종 목표치)이 아니라
 * `codexProgress(w).total`(검증된 종의 실제 수, 지금 182종)을 쓴다(마무리 패스
 * — notes/decisions.md G56 참조). 480을 그대로 쓰면 검증된 종을 전부 소장해도
 * CODEX_SCORE가 182/480≈37.9%에서 멈춰 `CODEX_GOAL_V2`(75%)에 영원히 못 미친다
 * — 엔딩 자체가 구조적으로 불가능해지는 버그였다. `codexProgress()`가 이미
 * "분모는 검증된 종만"(G53.4) 원칙을 쓰고 있으므로, 3축 점수식도 같은 원칙을
 * 그대로 확장한 것뿐이다.
 */
/**
 * 거점별 검증 종 목록. `artifactsOf()`는 부를 때마다 1,902종을 훑으므로, 매 레이스
 * 판정마다 부를 이 계산은 한 번만 갈라 둔다.
 */
const VERIFIED_BY_SITE: Record<string, Artifact[]> = (() => {
  const m: Record<string, Artifact[]> = {};
  for (const a of ARTIFACTS) {
    if (a.sourceStatus !== "verified") continue;
    (m[a.site] ??= []).push(a);
  }
  return m;
})();

/**
 * **거점 안목** — 그 거점의 검증 종 중 내가 아는(가진) 비율 0~1.
 * 잃은 종(`lost`)은 아는 것으로 세지 않는다 — 도감의 회색 칸은 지식이 아니라 빈칸이다.
 */
export function siteEyeRatio(w: World, site: SiteId): number {
  const all = VERIFIED_BY_SITE[site];
  if (!all || all.length === 0) return 0;
  let owned = 0;
  for (const a of all) {
    const st = w.codex[a.id];
    if (st === "owned" || st === "owned_unidentified") owned++;
  }
  return owned / all.length;
}

/** 제보 레이스에서 안목이 플레이어 가중에 곱하는 값(1 ~ 1+EYE_RACE_BONUS_MAX) */
export function eyeRaceMult(w: World, site: SiteId): number {
  return 1 + EYE_RACE_BONUS_MAX * siteEyeRatio(w, site);
}

/** **전체 안목** — 검증 종 전체 대비 보유 비율 0~1(`codexScore`와 같은 분모다) */
export function eyeRatio(w: World): number {
  const { owned, total } = codexProgress(w);
  return total > 0 ? owned / total : 0;
}

/** base 슬롯 상한 — 상수 그대로다(안목으로 여는 안은 재 보고 버렸다, G91.1) */
export function ownedSiteCap(_w: World): number {
  return MAX_OWNED_SITES;
}

export function codexScore(w: World): number {
  const { owned, total } = codexProgress(w);
  return total > 0 ? owned / total : 0;
}

/** 유일 최초발굴 항은 이번 시즌분(Stats.firstT4Finds) + 계정 영구분
 *  (PersistentRecord.firstT4Finds)을 더한다. 관람객 항은 World.museumCumulativeVisitors
 *  (마무리 패스 신설 — G51.2/G55.1이 남긴 공백, accrueMuseums가 누적한다)를 쓴다. */
export function fameScore(w: World, record: PersistentRecord): number {
  const visitors = w.museumCumulativeVisitors;
  const firstT4 = record.firstT4Finds + w.stats.firstT4Finds;
  return Math.min(1, visitors / FAME_VISITOR_NORMALIZATION + (firstT4 / TIER4_SPECIES_TOTAL) * FAME_FIRST_T4_WEIGHT);
}

export function rankScore(w: World, record: PersistentRecord): number {
  return RANK_WEIGHT.asset * assetScore(w) + RANK_WEIGHT.codex * codexScore(w) + RANK_WEIGHT.fame * fameScore(w, record);
}

export type AxisRankRow = { id: OwnerId; name: string; asset: number; codex: number; fame: number; rank: number };

// ── v0.5 추격전 — "몇 위"가 아니라 "어느 축에서 얼마나" (notes/decisions.md G76.5) ──

/** 순위 성장률 표본을 갱신하는 주기(게임 내 초). 짧으면 노이즈가, 길면 반응이 느리다 */
export const RANK_SAMPLE_INTERVAL = 600;

/**
 * 순위 성장률 표본을 찍는다. **`step()`이 부르지 않는다** — UI 틱(`useGame.ts`)이
 * `runAutoRoutine`과 같은 자리에서 부른다(이유는 `World.rankSample` 주석).
 * sim·QA는 이 함수를 거치지 않으므로 밸런스 측정에 영향이 없다.
 */
export function sampleRanks(w: World, record: PersistentRecord): void {
  const prev = w.rankSample;
  if (prev && w.t - prev.t < RANK_SAMPLE_INTERVAL) return;
  const byId: Record<string, number> = {};
  for (const row of fullRanking(w, record)) byId[String(row.id)] = row.rank;
  w.rankSample = { t: w.t, byId };
}

export type RankRace = {
  /** 내 바로 위 상대. 내가 1위면 null이다 */
  target: AxisRankRow | null;
  me: AxisRankRow;
  /** 상대 − 나. 양수면 그 축에서 내가 지고 있다 */
  gap: { asset: number; codex: number; fame: number; rank: number };
  /** 가중치를 반영해 지금 가장 손해가 큰 축 */
  weakestAxis: "asset" | "codex" | "fame";
  /**
   * 추월까지 남은 게임 내 초. `null`은 **이 속도로는 못 넘는다**는 뜻이고,
   * `undefined`는 아직 표본이 모자라 모른다는 뜻이다. 둘을 섞지 마라 —
   * 모르는 것을 "못 넘는다"로 적으면 그게 거짓말이 된다(척추 5번).
   */
  overtakeSeconds: number | null | undefined;
};

/**
 * 나와 바로 위 상대의 추격전. 순위표가 "종합 7위"만 보여 주면 플레이어가 할 수 있는
 * 일이 없다 — 어느 축에서 지고 있는지, 이 속도면 언제 넘는지를 같이 줘야 선택이 생긴다.
 *
 * 추월 시각은 **측정된 성장률**로만 계산한다(`rankSample`). 표본이 없거나 두 표본
 * 사이에 시간이 흐르지 않았으면 `undefined`를 돌려준다 — 추정식을 지어내지 않는다.
 */
export function rankRace(w: World, record: PersistentRecord): RankRace {
  const rows = fullRanking(w, record).sort((a, b) => b.rank - a.rank);
  const myIndex = rows.findIndex((r) => r.id === "player");
  const me = rows[myIndex];
  const target = myIndex > 0 ? rows[myIndex - 1] : null;

  const gap = {
    asset: (target?.asset ?? me.asset) - me.asset,
    codex: (target?.codex ?? me.codex) - me.codex,
    fame: (target?.fame ?? me.fame) - me.fame,
    rank: (target?.rank ?? me.rank) - me.rank
  };
  // 같은 0.01이라도 가중치가 큰 축에서 더 많이 잃는다 — 그쪽을 먼저 가리킨다.
  const weighted: [RankRace["weakestAxis"], number][] = [
    ["asset", gap.asset * RANK_WEIGHT.asset],
    ["codex", gap.codex * RANK_WEIGHT.codex],
    ["fame", gap.fame * RANK_WEIGHT.fame]
  ];
  const weakestAxis = weighted.sort((a, b) => b[1] - a[1])[0][0];

  return { target, me, gap, weakestAxis, overtakeSeconds: overtakeIn(w, me, target) };
}

function overtakeIn(w: World, me: AxisRankRow, target: AxisRankRow | null): number | null | undefined {
  if (!target) return 0;
  const sample = w.rankSample;
  const span = sample ? w.t - sample.t : 0;
  if (!sample || span <= 0) return undefined;
  const mine = sample.byId["player"];
  const theirs = sample.byId[String(target.id)];
  // 방금 받은 고스트는 표본에 없다 — 다음 표본까지는 모른다고 답한다.
  if (mine === undefined || theirs === undefined) return undefined;

  const myRate = (me.rank - mine) / span;
  const theirRate = (target.rank - theirs) / span;
  const closing = myRate - theirRate;
  if (closing <= 0) return null;
  return (target.rank - me.rank) / closing;
}

/**
 * 헤더의 3축 순위표(spec.md §13.1, notes/ux-v02.md §1.1) — 플레이어뿐 아니라
 * 라이벌 전원을 같은 3축·같은 가중식으로 나란히 채점한다. `assetScore`·
 * `codexScore`·`fameScore`는 플레이어 전용 World 필드(vault·codex·Stats)만
 * 읽어서 라이벌에게 그대로 적용할 수 없다 — 라이벌이 가진 필드로 같은 정의를
 * 최대한 그대로 근사한다(5단계 UI 배선, notes/decisions.md G55 보고 대상):
 * - 자산: `RivalState.vaultValue`(라이벌도 매각 안 한 사본의 평가액 합을 그대로
 *   누적하는 필드다) / ASSET_SCORE_REF.
 * - 도감: `RivalState.owned`(사본을 얻을 때마다 push, 매각해도 제거하지 않는다)의
 *   고유 종수 / (검증된 종의 실제 수, `codexProgress(w).total`과 같다 — 마무리
 *   패스가 480 고정값 대신 실측치로 바꿨다, 아래 codexScore 주석 참조) —
 *   "지금 소장 중"이 아니라 "한 번이라도 얻음" 기준이라 플레이어의
 *   CODEX_SCORE(현재 소장 기준)보다 관대한 근사치다.
 * - 명성: 라이벌은 박물관이 없어 관람객 항은 0 그대로다. 유일 최초발굴 항은
 *   `owned`에서 티어4 종 수를 세어 정확히 구할 수 있다 — 유일은 세계 재고가
 *   1개뿐이라 "지금 owned 배열에 있다"는 사실 자체가 "그 라이벌이 그 유일을
 *   처음이자 유일하게 가져갔다"는 뜻이기 때문이다(근사가 아니라 정확한 값).
 */
export function fullRanking(w: World, record: PersistentRecord): AxisRankRow[] {
  const verifiedTotal = codexProgress(w).total;
  return [
    { id: "player", name: "나", asset: assetScore(w), codex: codexScore(w), fame: fameScore(w, record), rank: rankScore(w, record) },
    ...w.rivals.map((r) => {
      const asset = Math.min(1, r.vaultValue / ASSET_SCORE_REF);
      // owned는 이제 종 단위로만 push되므로(위 take() 주석 참조) 길이 자체가
      // 고유 종수다 — Set 변환이 필요 없다(스텝마다 부르는 경로라 성능이 중요하다).
      // `ownedExtra`·`fameExtra`는 기록패로 받은 고스트에만 있다(v0.5, types.ts 주석).
      // NPC는 둘 다 undefined라 이 식은 v0.4와 완전히 같은 값을 낸다.
      const codex = verifiedTotal > 0 ? (r.owned.length + (r.ownedExtra ?? 0)) / verifiedTotal : 0;
      const firstT4 = r.owned.filter((id) => ARTIFACT_BY_ID[id]?.tier === 4).length;
      const fame = Math.min(1, (firstT4 / TIER4_SPECIES_TOTAL) * FAME_FIRST_T4_WEIGHT + (r.fameExtra ?? 0));
      const rank = RANK_WEIGHT.asset * asset + RANK_WEIGHT.codex * codex + RANK_WEIGHT.fame * fame;
      return { id: r.id, name: r.name, asset, codex, fame, rank };
    })
  ];
}

// ════════════════════════════════════════════════════════════════════════
// v0.2 4단계 — 시설과 시장(감정소 확장·보관소·박물관·경매장·암시장)
// spec.md §9~§11, notes/decisions.md G16·G24·G49·G-A5·G9·G-C1이 이 절의 전제다.
// ════════════════════════════════════════════════════════════════════════

/** 그 site의 박물관. 건립한 적 없으면 등급0(임시 전시대, 무료 1슬롯, spec.md §10.1
 *  G44/A7)을 가상으로 돌려준다 — base마다 항상 존재하는 자동 시설이라 별도
 *  레코드 없이 "museums 배열에 없다"는 사실 자체가 등급0이다. */
export function museumOf(w: World, site: SiteId): { grade: number; marketingLevel: number; curatorId?: string } {
  return w.museums.find((m) => m.site === site) ?? { grade: 0, marketingLevel: 1, curatorId: undefined };
}

export function museumSlotCount(w: World, site: SiteId): number {
  if (!w.sites[site].unlocked) return 0;
  return MUSEUM_SLOT_BY_GRADE[museumOf(w, site).grade];
}

export function auctionHouseOf(w: World, site: SiteId): AuctionHouse | undefined {
  return w.auctionHouses.find((a) => a.site === site);
}

/** 감정 완료 시점 또는 상태(condition) 변화 시마다 호출해 value를 다시 맞춘다
 *  (notes/decisions.md G6·G51.7 — 1단계가 미배선으로 남긴 항목을 여기서 잇는다). */
function recomputeVaultValue(item: VaultItem) {
  const artifact = ARTIFACT_BY_ID[item.artifactId];
  item.value = Math.round(tierValue(artifact.tier, artifact.valueFactor) * CONDITION_VALUE_FACTOR[item.condition]);
}

/**
 * 지금 시각(t)의 FRESHNESS(spec.md §10.4). displaySessionStart/restBaseline/restSince
 * 타임스탬프만의 순수 함수라 스텝 크기와 무관하다(qa_expedition.ts와 같은 원칙 —
 * 누적 감쇠가 아니라 "언제부터"를 저장해 언제든 그 시점 값을 다시 계산한다).
 */
export function freshnessOf(item: VaultItem, t: number): number {
  if (item.displayed && item.displaySessionStart !== undefined) {
    return freshnessOnDisplay((t - item.displaySessionStart) / 3600);
  }
  if (item.restSince !== undefined && item.restBaseline !== undefined) {
    return freshnessRecovered(item.restBaseline, (t - item.restSince) / 3600);
  }
  return 1;
}

/** 지금 순간 발굴 잠재 화폐창출률($/s) — 레거시 단독 발굴 + on_site 발굴단 전부 합산.
 *  박물관 30% 캡(G24 — "플레이어 전체 발굴단 D 합" 기준)의 분모다. */
function instantDigIncomeRate(w: World): number {
  let sum = 0;
  const d0 = digPower(w);
  if (d0 > 0) {
    const layer0 = w.sites[w.activeSite].layer;
    const bonus0 = 1 + DEPTH_INCOME_BONUS * (layer0 - 1);
    sum += (d0 * PROGRESS_VALUE * bonus0) / SITE_BY_ID[w.activeSite].dropMod;
  }
  for (const team of w.teams) {
    if (team.status !== "on_site") continue;
    const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
    const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
    const layer = w.sites[team.targetSite].layer;
    const bonus = 1 + DEPTH_INCOME_BONUS * (layer - 1);
    sum += (d * PROGRESS_VALUE * bonus) / SITE_BY_ID[team.targetSite].dropMod;
  }
  return sum;
}

/**
 * 박물관 관람 순수입을 30% 캡(G24) 아래로 매 틱 적산한다(spec.md §10.1~10.2).
 * 캡 기준 D 합은 1차 저역통과 필터(museumDigEma)로 "1시간 이동평균"을 근사한다
 * (World.museumDigEma 주석 참조) — 발굴 공백기에 캡이 순간적으로 0이 되는 걸 막는다.
 * 전시 중 유물이 없는 등급0 임시 전시대는 계산을 건너뛴다(관람객 0이므로 무해하지만
 * 매 틱 순회 비용을 아낀다).
 */
function accrueMuseums(w: World, dt: number) {
  const digRate = instantDigIncomeRate(w);
  const decay = Math.exp(-dt / 3600);
  w.museumDigEma = digRate + (w.museumDigEma - digRate) * decay;
  const capHourly = MUSEUM_NET_INCOME_CAP * w.museumDigEma * 3600;

  for (const site of SITES) {
    if (!w.sites[site.id].unlocked) continue;
    const museum = museumOf(w, site.id);
    const slots = w.vault.filter((v) => v.displayed && v.museumSite === site.id);
    if (slots.length === 0) continue;
    const curator = w.staff.find((s) => s.id === museum.curatorId && s.role === "curator") as Curator | undefined;
    const displayed = slots.map((v) => ({ tier: ARTIFACT_BY_ID[v.artifactId].tier, freshness: freshnessOf(v, w.t) }));
    const visitors = museumVisitorsPerDay(site.population, displayed, curator?.curation ?? 0, museum.marketingLevel);
    // FAME_SCORE의 "박물관 누적 관람객" 항(spec.md §13.1, G51.2/G55.1이 남긴
    // 공백) — visitors는 1일당 방문자 수이므로 이번 dt(초)만큼의 몫만 더한다.
    w.museumCumulativeVisitors += visitors * (dt / 86400);
    const income = museumVisitorIncomeHourly(visitors);
    const upkeep = museumUpkeepHourly(income);
    const salary = curator ? curatorSalary(income, curator) : 0;
    const netBeforeCap = Math.max(0, income - upkeep - salary);
    const netAfterCap = Math.min(netBeforeCap, Math.max(0, capHourly));
    w.funds += (netAfterCap * dt) / 3600;
  }
}

/**
 * 보존 저하(spec.md §9.4) — `CONDITION_TICK_SECONDS` 격자를 넘을 때 한 번씩, vault의 비전시 유물 중
 * 정원(vaultCapacity) 초과분("야적")에는 2배 확률을 적용한다. promoteStaffTick과
 * 같은 결정론 경계 패턴(스텝 크기 무관, floor 비교).
 */
function conditionDecayTick(w: World, t0: number, dt: number) {
  const day = Math.floor((t0 + dt) / CONDITION_TICK_SECONDS);
  if (day <= w.lastConditionDay) return;
  w.lastConditionDay = day;

  const stored = w.vault.filter((v) => !v.displayed).length;
  const overflow = stored > vaultCapacity(w.vaultLevel, codexProgress(w).owned);

  for (const item of w.vault) {
    if (item.condition <= 0) continue;
    const itemOverflow = overflow && !item.displayed;
    // **난수 스트림을 쓰지 않는다.** 판정 수가 소장품 수에 비례하므로 `rng`를 쓰면
    // 경계 순간의 소장고 크기가 스텝 크기에 따라 한 점만 달라도 그 뒤 스트림이
    // 통째로 갈린다 — 격자를 2.8시간으로 촘촘하게 만들자(G93) `qa:expedition`이
    // 바로 그걸 잡았다(1초 vs 10초 스텝, 자금 차이 1,162만₩).
    // 유물 uid와 격자 번호를 섞은 해시로 뽑으면 같은 판정이 스텝 크기와 무관하게
    // 같은 결과를 낸다(`hashFrac` — 이 레포의 절차 생성이 쓰는 그 해시다).
    // 시드를 섞지 않는 이유: World에 시드 필드가 없고, `rngState`는 스트림 위치라
    // 여기서 읽으면 없애려던 의존성이 되돌아온다. 판마다 uid ↔ 유물 대응이 달라져
    // 어차피 판정 패턴이 갈린다.
    if (hashFrac(`cond:${item.uid}:${day}`) < conditionDecayChancePerDay(w.humidityLevel, itemOverflow)) {
      item.condition = (item.condition - 1) as VaultItem["condition"];
      recomputeVaultValue(item);
    }
  }
}

/**
 * 복원(spec.md §9.4) — 백그라운드 자동 시도(플레이어 조작 없음, 방치형 원칙).
 * 간격(RESTORATION_BASE_HOURS/level)이 레벨업마다 짧아지는 동적 값이라 요일
 * 나머지 연산 대신 "다음 시도 시각"을 직접 들고 다니며, 발동 때마다 그 시점의
 * 레벨로 다시 예약한다 — tickExpeditions의 (arrivesAt, returnsAt) 경계 판정과
 * 같은 원칙(스텝 크기 무관).
 */
function restorationTick(w: World, t0: number, dt: number, rng: Rng) {
  if (t0 >= w.nextRestorationAttemptAt || w.nextRestorationAttemptAt > t0 + dt) return;
  w.nextRestorationAttemptAt = w.t + restorationAttemptHours(w.restorationLevel) * 3600;
  const chance = restorationSuccessChance(w.restorationLevel);
  for (const item of w.vault) {
    if (item.condition >= 4) continue; // "관급"에서는 시도하지 않는다
    if (rng.chance(chance)) {
      item.condition = (item.condition + 1) as VaultItem["condition"];
      recomputeVaultValue(item);
    }
  }
}

/**
 * 도난 판정(spec.md §9.4, G9·G39/A1) — **온라인 중에만** 수행한다(THEFT_JUDGEMENT_ONLINE_ONLY,
 * spawnTip의 `if(!offline)` 패턴과 동일). 전시 중·THEFT_APPLICABLE_MAX_TIER(3) 이하·
 * 보안 유예(THEFT_INITIAL_GRACE_HOURS)를 지난 유물만 대상이다. 유예는 w.t(게임 시각,
 * 오프라인 경과 포함) 기준이어도 척추 3번과 무관하다 — 실제 확률 판정 자체가 이
 * 함수 호출 자체(온라인 전용)로 이미 막혀 있어, 유예가 오프라인 동안 "먼저 끝나
 * 있는" 것 자체는 손실을 만들지 않는다.
 */
function theftJudgeTick(w: World, dt: number, rng: Rng) {
  for (const item of w.vault) {
    if (!item.displayed || item.museumSite === undefined || item.displaySessionStart === undefined) continue;
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    if (artifact.tier > THEFT_APPLICABLE_MAX_TIER) continue;
    const graceHours = theftInitialGraceHours(w.securityLevel);
    const elapsedHours = (w.t - item.displaySessionStart) / 3600;
    if (elapsedHours < graceHours) continue;
    const p = THEFT_RATE_BASE * (dt / 3600);
    if (!rng.chance(p)) continue;

    // 도난 확정 — 즉시 영구 상실이 아니라 72h 회수 창(onlineElapsedSeconds 기준)을 연다.
    const site = item.museumSite;
    const stolenAt = w.onlineElapsedSeconds;
    const event: TheftEvent = {
      id: `theft-${nextUid()}`,
      artifactId: item.artifactId,
      tier: artifact.tier,
      value: item.value,
      site,
      stolenAtOnlineSeconds: stolenAt,
      recoveryDeadlineOnlineSeconds: stolenAt + THEFT_RECOVERY_WINDOW_HOURS * 3600,
      nextRecoveryAttemptOnlineSeconds: stolenAt + 3600
    };
    w.theftEvents.push(event);
    w.vault = w.vault.filter((v) => v.uid !== item.uid);
    demoteIfEmptied(w, artifact.id);
    log(w, "system", `${SITE_BY_ID[site].city} 박물관에서 '${artifact.name}'${josa(artifact.name, "을를")} 도난당했다. 회수 기한 ${THEFT_RECOVERY_WINDOW_HOURS}시간(온라인 기준).`);
  }
}

/**
 * 도난 회수 시도 + 창 만료 처리(spec.md §9.4·§11.5). **전부 onlineElapsedSeconds
 * 기준**이다 — 척추 3번(오프라인 중 영구 상실 금지)의 핵심 장치. 오프라인 동안은
 * onlineElapsedSeconds가 늘지 않으므로 이 함수의 경계 조건이 전혀 넘어가지 않는다
 * (호출 자체는 매 스텝 해도 안전하다 — 데이터가 안 바뀌면 아무 것도 하지 않는다).
 */
function theftResolveTick(w: World, rng: Rng, report: StepReport) {
  const remaining: TheftEvent[] = [];
  for (const event of w.theftEvents) {
    if (w.onlineElapsedSeconds >= event.recoveryDeadlineOnlineSeconds) {
      // 회수 실패 — 소유권이 넘어간다. 50%는 암시장 장물로, 50%는 라이벌 소장고로.
      if (rng.chance(STOLEN_TO_BLACKMARKET_CHANCE)) {
        w.blackMarket.listings.push({
          id: nextUid(), kind: "stolen", artifactId: event.artifactId, estimate: event.value,
          theftEventId: event.id, listedAt: w.t
        });
        evictBlackMarketOverflow(w);
      } else if (w.rivals.length > 0) {
        const rival = rng.pick(w.rivals);
        if (!rival.owned.includes(event.artifactId)) rival.owned.push(event.artifactId);
        rival.vaultValue += event.value;
      }
      report.lost.push({ artifactId: event.artifactId, owner: "theft" });
      continue;
    }
    if (w.onlineElapsedSeconds >= event.nextRecoveryAttemptOnlineSeconds) {
      const museum = museumOf(w, event.site);
      const curator = w.staff.find((s) => s.id === museum.curatorId && s.role === "curator") as Curator | undefined;
      const chance = theftRecoveryChance(curator?.securitySense ?? 0);
      if (rng.chance(chance)) {
        w.vault.push({
          uid: nextUid(), artifactId: event.artifactId, value: event.value,
          condition: ARTIFACT_BY_ID[event.artifactId].condition
        });
        if (w.codex[event.artifactId] !== "owned") w.codex[event.artifactId] = "owned";
        log(w, "system", `'${ARTIFACT_BY_ID[event.artifactId].name}'${josa(ARTIFACT_BY_ID[event.artifactId].name, "을를")} 회수했다.`);
        continue;
      }
      event.nextRecoveryAttemptOnlineSeconds = w.onlineElapsedSeconds + 3600;
    }
    remaining.push(event);
  }
  w.theftEvents = remaining;
}

/** 경매 정산(spec.md §11.1·§11.3, AUCTION_SETTLE_HOURS 경과 후) — w.t(게임 시각,
 *  오프라인 포함) 기준으로 둔다. 상실 위험이 없는 지연 정산일 뿐이라 척추 3번과 무관하다. */
function settleAuctions(w: World, t0: number, dt: number) {
  for (const house of w.auctionHouses) {
    const settled: AuctionListing[] = [];
    const keep: AuctionListing[] = [];
    for (const listing of house.listings) {
      if (t0 < listing.settleAt && listing.settleAt <= t0 + dt) settled.push(listing);
      else keep.push(listing);
    }
    house.listings = keep;
    for (const listing of settled) {
      const auctioneer = w.staff.find((s) => s.id === house.auctioneerId && s.role === "auctioneer") as
        | import("./types").Auctioneer
        | undefined;
      const mult = auctionPriceMult(house.grade, auctioneer?.negotiation ?? 0);
      const localMult = bestLocalPriceMult(w, ARTIFACT_BY_ID[listing.artifactId].shape);
      const hammer = Math.round(listing.value * mult * localMult);
      const afterFee = hammer * (1 - AUCTION_FEE_RATE);
      const auctioneerCut = auctioneer ? auctioneerSalary(hammer, auctioneer) : 0;
      const foreman = w.staff.find((s) => s.id === listing.diggerForemanId && s.role === "foreman") as Foreman | undefined;
      const foremanCut = foreman ? foremanSalary(hammer, foreman) : 0;
      const net = Math.round(afterFee - auctioneerCut - foremanCut);
      w.funds += net;
      w.stats.sold += 1;
      demoteIfEmptied(w, listing.artifactId);
      log(w, "system", `경매 낙찰 — '${ARTIFACT_BY_ID[listing.artifactId].name}' ${usd(net)}.`);
    }
  }
}

function evictBlackMarketOverflow(w: World) {
  while (w.blackMarket.listings.length > BLACK_MARKET_SLOT_CAPACITY) w.blackMarket.listings.shift();
}

/**
 * 암시장 일반(미감정) 매물 누적 재입고(spec.md §11.1, G3 — 시간 리셋이 아니라
 * 누적 슬롯). BLACK_MARKET_RESTOCK_INTERVAL_HOURS 경계를 넘을 때마다 1점씩
 * 원장에서 실제로 빼내 채운다 — T0~T2(BLACK_MARKET_LOOSE_MAX_TIER)로 제한해
 * 척추 1번(유일성)을 지킨다(T3 이상은 오직 장물로만 암시장에 등장한다, §11.5).
 */
function restockBlackMarket(w: World, t0: number, dt: number, rng: Rng) {
  const interval = BLACK_MARKET_RESTOCK_INTERVAL_HOURS * 3600;
  if (Math.floor(t0 / interval) >= Math.floor((t0 + dt) / interval)) return;
  const pool = ARTIFACTS.filter((a) => a.tier <= BLACK_MARKET_LOOSE_MAX_TIER && a.sourceStatus === "verified" && available(w, a));
  if (pool.length === 0) return;
  const artifact = rng.pick(pool);
  w.ledger[artifact.id].remaining -= 1;
  w.ledger[artifact.id].owners.push("blackmarket");
  w.blackMarket.listings.push({
    id: nextUid(), kind: "loose", artifactId: artifact.id, listedAt: w.t,
    estimate: layerExpectedValue(artifact.site, artifact.minLayer)
  });
  evictBlackMarketOverflow(w);
}

// ── 스텝 ──────────────────────────────────────────────────

function log(w: World, kind: LogKind, text: string) {
  w.log.unshift({ t: w.t, kind, text });
  if (w.log.length > 60) w.log.length = 60;
}

function available(w: World, a: Artifact): boolean {
  return w.ledger[a.id].remaining > 0;
}

/** 플레이어가 그 종을 지금 물리적으로 갖고 있는가(vault 또는 미감정 큐) — CodexState를
 *  "discovered_not_owned"로 내릴지 판정하는 데만 쓴다 */
function playerHoldsSpecies(w: World, artifactId: string): boolean {
  return w.vault.some((v) => v.artifactId === artifactId) || w.pending.some((p) => p.artifactId === artifactId);
}

/** 종의 마지막 사본을 놓았을 때(매각 등) codex를 "discovered_not_owned"로 내린다.
 *  "lost"(라이벌이 세계 재고 마지막 1점을 가져간 경우)는 건드리지 않는다 — 다른 사건이다 */
function demoteIfEmptied(w: World, artifactId: string) {
  const s = w.codex[artifactId];
  if ((s === "owned" || s === "owned_unidentified") && !playerHoldsSpecies(w, artifactId)) {
    w.codex[artifactId] = "discovered_not_owned";
  }
}

function take(w: World, a: Artifact, owner: OwnerId, report: StepReport, diggerForemanId?: string) {
  const entry = w.ledger[a.id];
  if (entry.remaining !== Infinity) entry.remaining -= 1;
  entry.owners.push(owner);

  if (owner === "player") {
    const prior = w.codex[a.id];
    // 소유 확정(①)과 지식 공개(③)의 분리(spec.md §9.2) — 드랍 즉시 "owned_unidentified"로
    // 전이한다. 이미 "owned"(다른 사본을 이미 감정해 이름을 안다)면 내리지 않는다.
    if (prior !== "owned") w.codex[a.id] = "owned_unidentified";
    // 유일 최초발굴은 매각과 무관한 계정 영구 기록의 재료다(§13.3) — "처음 갖는 순간"만 센다.
    if (a.tier === 4 && prior !== "owned" && prior !== "owned_unidentified") w.stats.firstT4Finds += 1;

    w.pending.push({
      uid: nextUid(),
      artifactId: a.id,
      remain: appraiseSeconds(w.lab),
      estimate: layerExpectedValue(a.site, w.sites[a.site].layer),
      diggerForemanId
    });
    w.stats.drops += 1;
    report.drops.push({ artifactId: a.id, tier: a.tier });
    // 여기서는 오버플로 처리를 하지 않는다 — 그건 autoLiquidatePendingOverflow()가
    // 별도 주기로 맡는다(notes/decisions.md G57). G39/A1의 원칙(티어 구분 없는
    // 무차별 강제매각 금지 — T3·T4까지 팔아치울 수 있는 척추 3번 위반 경로였다)은
    // 그대로 지킨다 — 그 자동 처분도 AUTO_SELL_MAX_TIER(T0·T1) 안에서만 움직인다.
  } else {
    const rival = w.rivals.find((r) => r.id === owner)!;
    // 종 단위로만 push한다(중복 사본은 넣지 않는다) — fullRanking()의 도감 축이
    // 매 step()마다 이 배열의 고유 종수를 읽는데(checkEnding 경유), 사본까지
    // 전부 넣으면 배열이 무한정 자라 그 조회가 스텝마다 O(n²)로 느려진다
    // (마무리 패스에서 qa_expedition.ts가 몇 분씩 걸리는 걸로 실측 — notes/decisions.md
    // G56). "종 단위 소유 여부"만 쓰는 현재 용도(fullRanking·T4 카운트)엔
    // 사본 중복이 애초에 필요 없다 — vaultValue는 별도 누적 필드가 이미 맡는다.
    if (!rival.owned.includes(a.id)) rival.owned.push(a.id);
    const value = tierValue(a.tier, a.valueFactor);
    // 라이벌도 실현(매각) 시점에 단장 급여(G29/B7) + 원정비(K5, spec.md §12.1)를
    // 함께 원천징수당한다 — 플레이어의 두 비용(판매 시 급여·귀환 시 원정비)을
    // 하나의 실현 시점 공제로 합쳤다. **의도적 단순화**(notes/decisions.md G53
    // 재보고): 처음엔 홈 거점 채굴에 원정비를 매 틱 연속 차감했으나, 그 연속
    // 차감이 재투자 임계값(`r.funds >= cost`) 판정 시점을 스텝 크기에 따라
    // 미묘하게 갈라놓아 `qa_expedition.ts`의 스텝 무관성(원정 자체와는 무관한
    // 라이벌 곁가지 효과)을 깼다(china가 3단계로 실제 드랍 가능해지며 그 갈라짐이
    // 처음으로 표면화됐다). 이산적인 실현 시점 공제로 바꾸면 기존에 이미 스텝
    // 무관성이 검증된 "드랍(take) 이벤트 단위" 위에 얹히므로 같은 문제가 생기지
    // 않는다 — 공정성 요구(라이벌도 고정비를 낸다)는 그대로 만족한다.
    const rivalWithholdRate = FOREMAN_SALARY_INCOME_SHARE + EXPEDITION_COST_INCOME_RATIO;
    if (a.tier <= rival.sellBelow) rival.funds += Math.round(value * (1 - rivalWithholdRate));
    else rival.vaultValue += value;

    const playerHasIt = w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified";
    if (entry.remaining === 0 && !playerHasIt) {
      w.codex[a.id] = "lost";
      report.lost.push({ artifactId: a.id, owner: rival.name });
      log(w, "lost", `${rival.name}${josa(rival.name, "이가")} '${a.name}'${josa(a.name, "을를")} 가져갔다. 세계에 남은 수량 0.`);
    } else if (a.tier >= 2) {
      log(w, "rival", `${rival.name}${josa(rival.name, "이가")} '${a.name}'${josa(a.name, "을를")} 발굴했다. (남은 수량 ${entry.remaining})`);
    }
  }
}

function pickTier(w: World, rng: Rng, site: SiteId, layer: number, cap: Tier): Tier {
  const weights = tierWeights(site, layer);
  let roll = rng.next() * 100;
  for (let t = 0; t < 5; t++) {
    roll -= weights[t];
    if (roll <= 0) return Math.min(t, cap) as Tier;
  }
  return 0;
}

/** sourceStatus="pending"인 종은 드랍 풀에서 제외한다(notes/artifacts-dataset.md §5, G-B8).
 *  검증을 마치는 대로 데이터의 sourceStatus만 "verified"로 바꾸면 자동으로 편입된다. */
function candidates(w: World, site: SiteId, tier: Tier, layer: number): Artifact[] {
  return artifactsOf(site, tier).filter(
    (a) => a.minLayer <= layer && a.sourceStatus === "verified" && available(w, a)
  );
}

/** 그 site·layer에서 지금 "쫓는 중"인 제보 목표(있으면). 배너(w.tip)가 아직 살아
 *  있으면 그걸 쓰고, 배너가 만료됐어도 그 자리에 급파로 도착한 발굴단이 추적 중인
 *  유물이 있으면 그쪽을 쓴다(spec.md §8.6, notes/decisions.md G45/A8·G53) — 배너
 *  수명과 레이스 종료 시점을 분리한 설계의 핵심이다. */
function activeTipTarget(
  w: World, site: SiteId, layer: number
): { artifactId: string; focused: boolean; responded: boolean } | null {
  if (w.tip && !w.tip.resolved && w.tip.site === site && layer >= w.tip.layer) {
    // `responded` — [집중 굴착]을 눌렀거나, 급파한 팀이 이 유물을 쫓아 그 자리에
    // 와 있는가. 유일(T4)은 이 값이 참일 때만 플레이어가 가져갈 수 있다
    // (`TIP_UNIQUE_REQUIRES_RESPONSE`).
    const chased = w.teams.some(
      (t) => t.status === "on_site" && t.targetSite === site && t.tipChase?.artifactId === w.tip!.artifactId
    );
    return { artifactId: w.tip.artifactId, focused: !!w.tip.focused, responded: !!w.tip.focused || chased };
  }
  for (const team of w.teams) {
    if (team.status === "on_site" && team.targetSite === site && team.tipChase && layer >= team.tipChase.layer) {
      // 급파로 도착해 추적 중이다 — 배너가 이미 닫혔어도 이것은 대응이다
      return { artifactId: team.tipChase.artifactId, focused: false, responded: true };
    }
  }
  return null;
}

/** artifactId를 쫓던 팀·라이벌의 추적 상태를 비운다(획득 성공 또는 세계 재고 소진 시) */
function clearTipChases(w: World, artifactId: string) {
  for (const team of w.teams) {
    if (team.tipChase?.artifactId === artifactId) team.tipChase = null;
  }
  for (const r of w.rivals) {
    if (r.tipChase?.artifactId === artifactId) r.tipChase = null;
  }
}

function rollDrop(
  w: World, rng: Rng, site: SiteId, layer: number, owner: OwnerId, offline: boolean, report: StepReport,
  diggerForemanId?: string, chaseTarget?: { artifactId: string; focused: boolean; responded: boolean } | null
) {
  // 제보 레이스: 조건을 만족하면 대상 유물이 직접 걸린다. 플레이어는 (배너 또는
  // 급파 추적 중인) chaseTarget을, 라이벌은 배너(w.tip.rivals)에 있을 때만 반응한다
  // (원거리 라이벌 급파는 resolveRivalTipChases가 별도로 처리한다, spec.md §12.3).
  const tip = w.tip;
  /**
   * **반응 유예**(v0.6) — 배너가 뜬 뒤 `TIP_MIN_RESPONSE_SECONDS` 동안은 어느
   * 쪽도 적중 판정을 하지 않는다. 플레이어와 라이벌에 똑같이 걸리므로 승률은
   * 바뀌지 않고, 창 중앙 15초(= 반사신경 검사)만 사라진다. 근거는
   * `balance.ts`의 상수 주석.
   */
  const graced = !!tip && !tip.resolved && w.t - tip.openedAt < TIP_MIN_RESPONSE_SECONDS;
  const raceTarget = graced
    ? null
    : owner === "player" ? chaseTarget : tip && !tip.resolved && tip.site === site && tip.rivals.includes(owner)
      ? { artifactId: tip.artifactId, focused: false, responded: true }
      : null;
  if (raceTarget) {
    const target = ARTIFACT_BY_ID[raceTarget.artifactId];
    // 유일은 대응한 쪽만 가져간다(`TIP_UNIQUE_REQUIRES_RESPONSE`) — 라이벌은
    // 제보를 받고 그 자리를 파는 것 자체가 대응이라 `responded: true`로 들어온다.
    // **다투는 상대가 없으면 적용하지 않는다**: 아무도 오지 않는 자리에서 요구되는
    // 것은 '남보다 먼저'가 아니라 그냥 버튼이고, 그건 규칙이 아니라 통행료다.
    const contested = !!tip && !tip.resolved && tip.artifactId === target.id && tip.rivals.length > 0;
    const unresponded =
      TIP_UNIQUE_REQUIRES_RESPONSE && target.tier === 4 && owner === "player" &&
      contested && !raceTarget.responded;
    // 첫 유일은 대응하지 않으면 놓친다(`TIP_FIRST_UNIQUE_TAUGHT`) — 딱 한 번.
    const uniquePenalty = !unresponded
      ? 1
      : TIP_FIRST_UNIQUE_TAUGHT && !w.taughtUniqueLoss
        ? 0
        : TIP_UNRESPONDED_UNIQUE_MULT;
    if (available(w, target)) {
      // **첫 승 보장은 마감 전에도 지켜진다.** 보장이 걸린 판(아직 한 번도 이겨
      // 본 적이 없고, 플레이어가 그 자리에 있다)에서는 라이벌이 유예 뒤 드랍
      // 판정으로 먼저 가져가지 못한다 — 그러지 않으면 보장은 "라이벌이 60초 안에
      // 못 맞혔을 때만"이라는 뜻이 되고, 실측에서 실제로 그렇게 새어 나갔다
      // (`eval.md` §28 — 첫 제보를 68초에 잃어 첫 10분 승리 0회).
      const guardedForPlayer =
        TIP_FIRST_WIN_GUARANTEED && owner !== "player" && target.tier < 4 &&
        w.stats.racesWon === 0 && !!tip && !tip.resolved && tip.artifactId === target.id &&
        playerRacingAt(w, tip);
      // 안목(그 거점 도감 비율)이 플레이어 쪽에만 곱해진다(G91) — 확률이므로 상한을 씌운다.
      const hit =
        owner === "player"
          ? Math.min(
              EYE_HIT_CHANCE_CAP,
              (raceTarget.focused ? TIP_FOCUS_DIG_HIT_CHANCE : TIP_PLAYER_HIT) *
                uniquePenalty * eyeRaceMult(w, site)
            )
          : TIP_RIVAL_HIT;
      // 난수는 **언제나 뽑는다**. `guardedForPlayer`로 `rng.chance`를 건너뛰면 보장이
      // 걸린 판에서만 난수 소비가 한 칸 줄어, 같은 시드가 스텝 크기에 따라 갈린다
      // (`qa:expedition`의 스텝 무관성이 실제로 이걸 잡았다 — 드랍 5/1209 차이).
      const rolled = rng.chance(hit);
      if (rolled && !guardedForPlayer) {
        take(w, target, owner, report, diggerForemanId);
        clearTipChases(w, target.id);
        if (owner === "player") {
          w.stats.racesWon += 1;
          report.won.push(target.id);
          log(w, "won", `제보를 따라 '${target.name}'${josa(target.name, "을를")} 먼저 확보했다.`);
        } else {
          w.stats.racesLost += 1;
        }
        // 결판이 나도 배너는 닫지 않는다 — 결과를 보여 주며 남은 수명을 산다.
        // 다음 제보 예약은 배너가 실제로 닫힐 때(step) 한다.
        if (tip && tip.artifactId === target.id) {
          tip.resolved = { outcome: owner === "player" ? "won" : "lost", at: w.t };
          if (target.tier === 4) w.taughtUniqueLoss = true;
        }
        return;
      }
    } else {
      clearTipChases(w, target.id); // 이미 남이 가져가 세계 재고가 없다 — 추적 종료
    }
  }

  // 영구 상실은 플레이어가 그 자리에 있었을 때만 일어난다(notes/mda.md §5.2).
  // 그래서 라이벌은 **제보 레이스 밖에서는 유일(T4)을 뽑지 못하고**, 오프라인 중에는
  // 진귀(T2) 이하만 가져간다. 유일 유물을 잃는 경로는 위의 레이스 하나뿐이다.
  const cap: Tier = owner === "player" ? 4 : offline ? 2 : 3;
  let tier = pickTier(w, rng, site, layer, cap);
  let pool = candidates(w, site, tier, layer);
  while (pool.length === 0 && tier > 0) {
    tier = (tier - 1) as Tier;
    pool = candidates(w, site, tier, layer);
  }
  if (pool.length === 0) return;
  const picked = rng.pick(pool);
  // 기록패로 받은 사람 상대는 **내 원장을 비우지 않는다**(notes/decisions.md G76.1).
  // 위의 제보 레이스 분기는 이 앞에서 이미 끝났으므로, 여기 오는 건 배경 발굴뿐이다.
  const asGhost = ghostOwner(w, owner);
  if (asGhost) shadowTake(w, picked, asGhost);
  else take(w, picked, owner, report, diggerForemanId);
}

/** 그 id가 기록패로 받은 고스트의 것인가 */
export function isGhostId(w: World, id: OwnerId): boolean {
  return id !== "player" && w.rivals.some((r) => r.id === id && r.ghost !== undefined);
}

/** 그 owner가 고스트면 그 라이벌, 아니면 undefined */
function ghostOwner(w: World, owner: OwnerId): RivalState | undefined {
  if (owner === "player") return undefined;
  const r = w.rivals.find((x) => x.id === owner);
  return r?.ghost ? r : undefined;
}

/**
 * 고스트의 배경 발굴. 점수만 자라고 **세계 원장·도감·로그는 건드리지 않는다.**
 *
 * 이유는 G76.1의 연장이다. 고스트는 자기 판에서 계속 놀고 있는 사람의 투영이고,
 * 그 사람이 자기 세계에서 캔 것이 내 세계의 재고를 줄일 이유가 없다. 줄이면
 * **친구를 부를수록 내 도감이 느려진다** — 받으면 손해인 기능은 아무도 안 쓴다.
 * 실측이 그걸 그대로 보여 줬다: 엔딩 시점 세기의 고스트 3명이 배경 발굴로 원장을
 * 비우자 도감이 75%에 닿지 못해 168시간 안에 엔딩이 나지 않았다(`eval.md` §21).
 *
 * 그래서 내 판의 유물을 걸고 다투는 자리는 **제보 레이스 하나로 좁힌다**(rollDrop 위쪽
 * 분기). 거기서는 고스트가 실제로 내 세계에 와 있고, 내가 보고 있고, 집중 굴착으로
 * 맞설 수 있다 — 척추 3번이 말하는 "그 자리에 있었을 때"가 정확히 그 상황이다.
 */
function shadowTake(w: World, a: Artifact, r: RivalState) {
  if (!r.owned.includes(a.id)) r.owned.push(a.id);
  const value = tierValue(a.tier, a.valueFactor);
  const rivalWithholdRate = FOREMAN_SALARY_INCOME_SHARE + EXPEDITION_COST_INCOME_RATIO;
  if (a.tier <= r.sellBelow) r.funds += Math.round(value * (1 - rivalWithholdRate));
  else r.vaultValue += value;
}

/** 그 거점이 base로 승격된 지 HOME_BASE_BONUS_DURATION_HOURS 안이면 dropMod를
 *  낮춰 준다(world-map.md §1 통일 공식). 레거시 단독 발굴·발굴단 원정 모두 이
 *  하나의 거점별 실효 dropMod를 공유한다(§9.2 SiteProgress가 플레이어 공용이므로). */
export function effectiveDropMod(w: World, site: SiteId): number {
  const sp = w.sites[site];
  const base = SITE_BY_ID[site].dropMod;
  if (sp.baseSince === null) return base;
  const elapsedHours = (w.t - sp.baseSince) / 3600;
  return elapsedHours < HOME_BASE_BONUS_DURATION_HOURS ? base * HOME_BASE_BONUS_DROPMOD_MULT : base;
}

/** 그 거점에 이번 틱 진척을 보탠 기여자 한 명 — 드랍 귀속 추첨(아래 drainSiteDrops)의 재료 */
/**
 * 이번 청크에 이 거점을 판 주체 하나. `seconds`는 **그 청크 안에서 실제로 판
 * 시간**이다 — 원정단은 청크 중간에 도착·귀환하므로 청크 전체를 판 게 아니다.
 *
 * 이 필드가 필요해진 이유(v0.6): 드랍 임계에 **천장**(`CEIL × dig`)이 생기면서
 * 임계가 발굴력에 직접 묶였다. 예전처럼 "이 청크에 조금이라도 판 주체의 d를
 * 그냥 다 더해" 임계를 잡으면, 같은 1시간을 1초 스텝으로 적분할 때와 10초
 * 스텝으로 적분할 때 임계가 달라진다(실측 — `drops 164/163`). 시간 가중
 * 평균 발굴력을 쓰면 그 청크가 실제로 낸 진척과 임계가 같은 척도를 본다.
 */
type SiteContributor = { d: number; seconds: number; diggerForemanId?: string };

/**
 * 진척(층·드랍 게이지)만 더한다 — 드랍 판정은 하지 않는다. 레거시 단독 발굴과
 * 발굴단 원정이 **같은 거점**을 노리면 이 함수를 여러 번(기여자 수만큼) 호출해
 * 같은 SiteProgress에 누적한 뒤, `drainSiteDrops()`가 그 거점당 딱 한 번만
 * 문턱을 확인해 드랍을 판정한다 — 문턱 확인을 기여자별로 따로 하면(2단계 초기
 * 구현의 실제 버그, notes/decisions.md G52 보고 대상) 항상 먼저 검사되는
 * 기여자(레거시)가 문턱 경계의 부동소수점 반올림 방향에 따라 다른 기여자의
 * 누적분까지 통째로 가로채는 현상이 났다(실측: korea에서 레거시 d=1과 발굴단
 * d≈6.85가 함께 붙었을 때 189개 드랍 전부가 발굴단 기여 없이 레거시로만
 * 귀속됐다 — DROP_INTERVAL_FLOOR_SECONDS×합산발굴력이 매 스텝 정확히 정수
 * 배수로 맞아떨어지는 구조라 우연이 아니라 항상 재현됐다).
 */
function breakLayer(w: World, site: SiteId, report: StepReport) {
  const sp = w.sites[site];
  sp.layerProgress -= layerCost(site, sp.layer);
  sp.layer += 1;
  report.layerUps += 1;
  log(w, "system", `${SITE_BY_ID[site].city} ${sp.layer}층 — ${SITE_BY_ID[site].eras[sp.layer - 1]}`);
  // 미탐사 보너스(world-map.md §4) — 그 거점 층1 최초 돌파(이번 시즌 한정) 1회
  if (sp.layer === 2 && !w.unexploredBonusGranted[site]) {
    w.unexploredBonusGranted[site] = true;
    w.appraisalVouchers += UNEXPLORED_BONUS_APPRAISAL_VOUCHER;
    log(w, "system", `${withJosa(SITE_BY_ID[site].city, "을를")} 처음 탐사했다 — 무료 감정권 ${UNEXPLORED_BONUS_APPRAISAL_VOUCHER}장 획득.`);
  }
}

/**
 * 드랍 귀속 추첨 — 문턱을 넘길 때마다 **그 청크에 실제로 낸 진척(d × seconds)
 * 비중으로 가중 추첨**해 그 드랍의 단장을 정한다. 레거시 단독 발굴(가중치는
 * 있지만 `diggerForemanId`가 없음)과 발굴단들이 실제 기여 비율대로 귀속을
 * 나눠 갖는다.
 */
/**
 * 드랍 간격 하한·천장이 보는 **기준 발굴력**. "이번 청크에 실제로 판 사람들의
 * 합"이 아니라 **"지금 이 거점에 배치돼 있는 발굴력"**이다.
 *
 * 왜 이렇게 정의하는가(v0.6 — 오프라인 적분 검사가 가르쳐 준 것): 하한·천장은
 * 임계를 발굴력에 직접 묶는다. 그런데 원정단은 청크 **중간에** 도착하고
 * 귀환하므로, 청크 안에서 실제로 판 사람의 합을 쓰면 같은 1시간이라도 1초
 * 스텝과 10초 스텝에서 임계가 달라지고 드랍 수가 갈린다(실측 `drops 164/163`).
 * 배치(파견~귀환)는 이동 중에도 유지되는 **시각의 함수**라, 그 경계가 스텝
 * 크기와 무관하다 — 루틴이 켜진 팀은 귀환 즉시 재파견되므로 사실상 상수다.
 *
 * 진척 자체는 여전히 **현지에 있는 동안만** 쌓인다(`tickExpeditions`) — 바뀐
 * 것은 "얼마나 자주 떨어지는가"의 기준이지 "얼마나 팠는가"가 아니다.
 */
function siteReferenceDig(w: World, site: SiteId): number {
  let d = w.activeSite === site ? digPower(w) : 0;
  for (const team of w.teams) {
    if (team.status === "idle" || team.targetSite !== site) continue;
    const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
    d += teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
  }
  return d;
}

/**
 * 한 청크 분량의 진척을 이 거점에 넣고, **층 경계마다 끊어서** 드랍을 소진한다.
 *
 * 예전엔 진척을 통째로 더한 뒤 마지막 층 기준으로 한 번만 드랍을 소진했다.
 * v0.5.1까지는 층 하나 올리는 데 몇 분이 걸려 한 청크에 층이 두 번 오르는 일이
 * 없었으므로 결과가 같았지만, v0.6의 깊이 압축은 **첫 30초에 층을 넷** 올린다 —
 * 그러면 1초 스텝은 층마다, 10초 스텝은 마지막 층 기준으로만 드랍을 세어
 * 적분이 스텝 크기에 따라 갈라진다(실측 — `drops 164/163`, t=30초에 이미 갈렸다).
 * 층 경계로 쪼개면 어느 스텝 크기로 적분해도 "그 층에서 판 진척은 그 층의
 * 임계로 환산"이 지켜진다.
 */
function applySiteChunk(
  w: World, rng: Rng, site: SiteId, contributors: SiteContributor[], report: StepReport
) {
  const sp = w.sites[site];
  const worked = contributors.reduce((sum, c) => sum + c.d * c.seconds, 0);
  if (worked <= 0) return;
  const refDig = siteReferenceDig(w, site);
  const dropMod = effectiveDropMod(w, site);
  const threshold = () => dropThreshold(site, sp.layer, refDig, dropMod);

  let remaining = worked;
  let guard = 0;
  while (remaining > 1e-12 && guard++ < 256) {
    const atCap = sp.layer >= LAYERS_PER_SITE;
    const toBreak = atCap ? Infinity : layerCost(site, sp.layer) - sp.layerProgress;
    const piece = Math.min(remaining, Math.max(0, toBreak));
    sp.layerProgress += piece;
    sp.dropProgress += piece;
    remaining -= piece;

    if (refDig > 0) {
      let dropGuard = 0;
      while (sp.dropProgress >= threshold() && dropGuard++ < 512) {
        sp.dropProgress -= threshold();
        const chaseTarget = activeTipTarget(w, site, sp.layer);
        rollDrop(w, rng, site, sp.layer, "player", false, report, pickContributor(rng, contributors, worked), chaseTarget);
      }
    }

    if (!atCap && sp.layerProgress >= layerCost(site, sp.layer)) breakLayer(w, site, report);
    else if (atCap) {
      sp.layerProgress = Math.min(sp.layerProgress, layerCost(site, sp.layer));
      break;
    }
  }
}

/** 귀속 추첨 — 그 청크에 **실제로 낸 진척**(d × seconds) 비중으로 뽑는다 */
function pickContributor(rng: Rng, contributors: SiteContributor[], worked: number): string | undefined {
  if (contributors.length === 1) return contributors[0].diggerForemanId;
  let roll = rng.next() * worked;
  for (const c of contributors) {
    roll -= c.d * c.seconds;
    if (roll <= 0) return c.diggerForemanId;
  }
  return contributors[contributors.length - 1].diggerForemanId;
}

function digPlayer(
  w: World, dt: number, eff: number, report: StepReport, contributions: Map<SiteId, SiteContributor[]>
) {
  const d = digPower(w);
  if (d <= 0) return;
  // 진척 적립은 `applySiteChunk`가 층 경계로 쪼개 한다 — 여기서는 기여만 등록한다.
  pushContribution(contributions, w.activeSite, { d, seconds: dt * eff });
}

function pushContribution(contributions: Map<SiteId, SiteContributor[]>, site: SiteId, c: SiteContributor) {
  const list = contributions.get(site);
  if (list) list.push(c);
  else contributions.set(site, [c]);
}

function digRival(w: World, r: RivalState, rng: Rng, t0: number, dt: number, eff: number, report: StepReport) {
  const site = r.homeSite;
  const d = rivalDig(r);
  const progress = d * dt * eff;
  r.layerProgress += progress;
  r.dropProgress += progress;

  let guard = 0;
  while (r.layer < LAYERS_PER_SITE && r.layerProgress >= layerCost(site, r.layer) && guard++ < 64) {
    r.layerProgress -= layerCost(site, r.layer);
    r.layer += 1;
  }

  guard = 0;
  while (r.dropProgress >= dropThreshold(site, r.layer, d) && guard++ < 512) {
    r.dropProgress -= dropThreshold(site, r.layer, d);
    rollDrop(w, rng, site, r.layer, r.id, eff < 1, report);
  }

  // **고스트는 재투자하지 않는다**(notes/decisions.md G76.8). 고스트는 설계된 캐릭터가
  // 아니라 "그 사람이 그 시점에 어떤 속도였는지"의 기록이다 — 레이싱 게임의 고스트가
  // 녹화된 주행을 그대로 재생하듯, 기록된 페이스로만 자란다. NPC의 재투자 루프를 태우면
  // 기록 시점의 인부 더미 위에 장비가 계속 얹혀 실측 16,044~28,367/s까지 부풀었고
  // (`eval.md` §21), 그건 그 친구가 실제로 그만큼 세다는 뜻이 아니라 모델이 부푼 것이다.
  // 상대가 진짜로 더 세졌으면 새 기록패를 주면 된다 — 그게 이 기능의 갱신 경로다.
  if (r.ghost) return;

  // 라이벌도 같은 비용 곡선·같은 상한으로 재투자한다 (Fair Progression: 같은 규칙).
  // **결정론 경계에서만** 산다 — `promoteStaffTick`과 같은 floor 비교 방식이다.
  // 매 스텝 사게 두면 "언제 살 수 있게 됐는가"가 스텝 경계에 걸려 라이벌의
  // 발굴력이 스텝 크기마다 달라지고, v0.6의 드랍 간격 **천장**(`CEIL × dig`)이
  // 임계를 발굴력에 묶어 두기 때문에 그 차이가 드랍 수까지 갈라 놓는다
  // (실측 — 오프라인 적분 검사 `drops 164/163`. 천장이 없던 v0.5.1에서는 약한
  // 라이벌의 임계가 항상 층 기대가치 쪽이라 이 민감도가 드러나지 않았다).
  const interval = RIVAL_REINVEST_INTERVAL_SECONDS;
  const crossings = Math.floor((t0 + dt) / interval) - Math.floor(t0 / interval);
  for (let c = 0; c < crossings; c++) {
    for (let i = 0; i < 12; i++) {
      const wc = workerCost(r.workers);
      const gc = gearCost(r.gear);
      if (r.gear < MAX_GEAR_LEVEL && gc <= wc * 6 && r.funds >= gc) {
        r.funds -= gc;
        r.gear += 1;
      } else if (r.funds >= wc) {
        r.funds -= wc;
        r.workers += 1;
      } else break;
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// 발굴단·원정 (spec.md §8, notes/world-map.md §2·§3·§5). 레거시 단독 발굴
// (workers/gear/activeSite, 위 digPlayer)은 그대로 살려 둔다 — 기존 UI가
// 계속 돌아가야 한다(2단계 작업 지시). 발굴단은 그 위에 얹히는 별도의
// 진행 축이다: 팀마다 단장이 필수고, 회차제(파견→이동→현지작업→귀환)로
// 돈다. 같은 거점을 노리면 SiteProgress(w.sites[site])를 공유해 함께
// 진척시킨다(§8.2 "Σ D_team").
// ════════════════════════════════════════════════════════════════════════

/**
 * 발굴단의 "본거지" — 거리 계산의 출발점(world-map.md §2·§3은 두 거점 간
 * 거리만 정의하고 발굴단의 출발지가 무엇인지는 명시하지 않는다).
 * 보유 base 중 가장 먼저 base가 된 곳(=최초 확정된 본거지)으로 고정한다
 * (notes/decisions.md G52 보고 대상) — UI가 팀별 본거지를 고르게 하는 건
 * 5단계(세계지도 UI) 몫이다.
 */
export function teamHomeSite(w: World): SiteId {
  const bases = SITES.filter((s) => w.sites[s.id].unlocked);
  let home: SiteId = bases[0]?.id ?? "korea";
  let earliest = w.sites[home].baseSince ?? Infinity;
  for (const b of bases) {
    const since = w.sites[b.id].baseSince ?? Infinity;
    if (since < earliest) {
      earliest = since;
      home = b.id;
    }
  }
  return home;
}

function teamWorkersSum(w: World): number {
  return w.teams.reduce((sum, t) => sum + t.workers, 0);
}
function teamGearSum(w: World): number {
  return w.teams.reduce((sum, t) => sum + t.gearLevel, 0);
}

export function staffMarketCycle(w: World): number {
  return Math.floor(w.t / (STAFF_MARKET_REFRESH_HOURS * 3600));
}

/** 단장 고용(staff.md §1·§4) — 그 거점의 그 갱신 회차 후보 중 slot번째를 고른다 */
export function hireForeman(w: World, site: SiteId, slot: number): string | null {
  if (w.funds < FOREMAN_HIRE_COST) return null;
  const candidate = staffCandidates(site, staffMarketCycle(w), "foreman")[slot];
  if (!candidate || candidate.role !== "foreman") return null;
  w.funds -= FOREMAN_HIRE_COST;
  const id = `foreman-${nextUid()}`;
  const foreman: Foreman = {
    id, name: candidate.name, role: "foreman",
    leadership: candidate.leadership, navigation: candidate.navigation
  };
  w.staff.push(foreman);
  log(w, "system", `단장 ${foreman.name}${josa(foreman.name, "을를")} 고용했다.`);
  return id;
}

/** 다음(n번째, 2~4번째) 발굴단 슬롯 해금비. 슬롯이 이미 상한이면 0 */
export function nextTeamSlotCost(w: World): number {
  if (w.maxTeams >= MAX_EXPEDITION_TEAMS_CAP) return 0;
  return EXPEDITION_TEAM_UNLOCK_BASE * Math.pow(EXPEDITION_TEAM_UNLOCK_GROWTH, w.maxTeams - 1);
}

/** n번째(2~4번째) 발굴단 슬롯 해금(spec.md §8.1) */
export function unlockTeamSlot(w: World): boolean {
  if (w.maxTeams >= MAX_EXPEDITION_TEAMS_CAP) return false;
  const cost = nextTeamSlotCost(w);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.maxTeams += 1;
  return true;
}

/** 고용된 단장으로 새 발굴단을 만든다. 단장 1명은 팀 하나에만 배속된다 */
export function createTeam(w: World, foremanId: string): string | null {
  if (w.teams.length >= w.maxTeams) return null;
  if (!w.staff.some((s) => s.id === foremanId && s.role === "foreman")) return null;
  if (w.teams.some((t) => t.foremanId === foremanId)) return null;
  const id = `team-${nextUid()}`;
  const home = teamHomeSite(w);
  const team: ExpeditionTeam = {
    id, foremanId, workers: 0, gearLevel: 0, status: "idle", targetSite: home,
    dispatchedAt: w.t, arrivesAt: w.t, returnsAt: w.t, mishapRolled: false,
    layerAtDispatch: w.sites[home].layer,
    // 기본은 자동 순회(v0.3.4) — 켜 두는 쪽이 "안 눌러도 진행된다"는 척추 4번에
    // 맞고, 끄는 건 상세 패널에서 2단계다(`eval.md` §23.3). 루틴이 꺼진 채로는
    // 팀이 한 거점만 왕복하거나 유휴로 멈춘다(`notes/play-telemetry.md` §1).
    routine: { enabled: true, target: "auto" }
  };
  w.teams.push(team);
  return id;
}

/** 팀 합산 인덱스 비용 곡선(notes/decisions.md G21/A6) — 개별 팀이 아니라
 *  Σ_teams workers/gearLevel이 workerCost·gearCost의 인덱스다 */
export function buyTeamWorker(w: World, teamId: string): boolean {
  const team = w.teams.find((t) => t.id === teamId);
  if (!team) return false;
  const cost = workerCost(teamWorkersSum(w));
  if (w.funds < cost) return false;
  w.funds -= cost;
  team.workers += 1;
  return true;
}

export function buyTeamGear(w: World, teamId: string): boolean {
  const team = w.teams.find((t) => t.id === teamId);
  if (!team) return false;
  if (teamGearSum(w) >= MAX_GEAR_LEVEL) return false;
  const cost = gearCost(teamGearSum(w));
  if (w.funds < cost) return false;
  w.funds -= cost;
  team.gearLevel += 1;
  return true;
}

/** 원정 파견(spec.md §8.3) — 미스헵은 파견 시점에 1회만 판정한다 */
/**
 * `at`(파견 시각)을 따로 받는 이유 — **스텝 무관성**. 루틴 재파견은 귀환 정산
 * 안에서 일어나는데, 그때 `w.t`는 "그 청크의 끝"이지 "실제 귀환 순간"이 아니다.
 * `w.t`로 다음 회차를 잡으면 회차 경계가 스텝 크기만큼 밀리고, 왕복이 짧은
 * 거점 로컬 원정에서는 그 오차가 매 회차 쌓여 드랍 수까지 갈라진다
 * (실측 — `sim`의 오프라인 적분 검사가 `drops 164/163`으로 깨졌다).
 * 기본값은 `w.t`라 손으로 보내는 경로는 한 줄도 달라지지 않는다.
 */
export function dispatchExpedition(w: World, teamId: string, target: SiteId, at = w.t): boolean {
  const team = w.teams.find((t) => t.id === teamId);
  if (!team || team.status !== "idle") return false;
  const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  if (!foreman) return false;

  const dist = distanceKm(teamHomeSite(w), target);
  const travel = travelHoursOneWay(dist, foreman.navigation);
  const onsite = onsiteHoursOf(travel);
  const rng = new Rng(w.rngState);
  const mishap = rng.chance(mishapChance(dist));
  w.rngState = rng.state;

  team.status = "traveling_out";
  team.targetSite = target;
  team.dispatchedAt = at;
  team.arrivesAt = at + travel * 3600;
  team.returnsAt = team.arrivesAt + onsite * 3600 + travel * 3600;
  team.mishapRolled = mishap;
  team.layerAtDispatch = w.sites[target].layer;
  team.tipChase = null; // 일반 파견은 제보 추적을 새로 시작하지 않는다(급파 전용, emergencyDispatch)
  log(w, "system", `발굴단이 ${withJosa(SITE_BY_ID[target].city, "로으로")} 출발했다.`);
  return true;
}

/**
 * 급파(spec.md §8.6, notes/decisions.md G45/A8) — 배너(w.tip)가 떠 있고 유휴 팀이
 * 있을 때만 쓸 수 있다. 이동시간을 1/3로 압축하고, 원정비 3배·미스헵 확률 2배를
 * 적용한다(상한 EXPEDITION_MISHAP_CHANCE_CAP은 그대로 유지). 배너는 탭 여부와
 * 무관하게 자기 수명대로 사라지지만, 이 팀은 도착 후에도 그 유물을 계속 쫓는다
 * (team.tipChase — activeTipTarget()·rollDrop이 참조한다).
 */
export function emergencyDispatch(w: World, teamId: string): boolean {
  if (!w.tip || w.tip.resolved) return false;
  const team = w.teams.find((t) => t.id === teamId);
  if (!team || team.status !== "idle") return false;
  const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  if (!foreman) return false;

  const target = w.tip.site;
  const dist = distanceKm(teamHomeSite(w), target);
  const travel = travelHoursOneWay(dist, foreman.navigation) * EMERGENCY_DISPATCH_TRAVEL_MULT;
  if (travel > EMERGENCY_DISPATCH_MAX_REACH_HOURS) return false;
  const onsite = onsiteHoursOf(travel);
  const rng = new Rng(w.rngState);
  const mishap = rng.chance(Math.min(EXPEDITION_MISHAP_CHANCE_CAP, mishapChance(dist) * EMERGENCY_DISPATCH_MISHAP_MULT));
  w.rngState = rng.state;

  team.status = "traveling_out";
  team.targetSite = target;
  team.dispatchedAt = w.t;
  team.arrivesAt = w.t + travel * 3600;
  team.returnsAt = team.arrivesAt + onsite * 3600 + travel * 3600;
  team.mishapRolled = mishap;
  team.layerAtDispatch = w.sites[target].layer;
  // 배수는 곱하지 않고 **큰 쪽 하나만** 남긴다(v0.6.6) — `applyTipCostMult` 주석 참조.
  applyTipCostMult(team, EMERGENCY_DISPATCH_COST_MULT);
  team.tipChase = { artifactId: w.tip.artifactId, layer: w.tip.layer };
  log(w, "system", `발굴단이 제보를 쫓아 ${withJosa(SITE_BY_ID[target].city, "로으로")} 급파됐다.`);
  return true;
}

/**
 * 집중 굴착(spec.md §8.6, G45/A8) — 대상 거점에 이미 on_site인 팀이 있을 때만 쓸 수
 * 있다. 배너가 떠 있는 동안 그 거점의 TIP_PLAYER_HIT을 TIP_FOCUS_DIG_HIT_CHANCE로
 * 올리는 대신, 그 팀의 이번 회차 원정비가 2배(TIP_FOCUS_DIG_COST_MULT)가 된다
 * (finalizeExpedition에서 정산). 안 눌러도 기존 28%는 자동 적용된다(G3 — 손실 0).
 */
export function focusDig(w: World, teamId: string): boolean {
  if (!w.tip || w.tip.resolved) return false;
  const team = w.teams.find((t) => t.id === teamId);
  if (!team || team.status !== "on_site" || team.targetSite !== w.tip.site) return false;
  w.tip.focused = true;
  applyTipCostMult(team, TIP_FOCUS_DIG_COST_MULT);
  return true;
}

/**
 * 제보 대응 배수를 팀의 이번 회차 원정비에 건다 — **곱하지 않고 큰 쪽 하나만 남긴다**
 * (v0.6.6, `notes/decision-tree-10h.md` §6 버그 1). v0.6.5까지는 `costMult *= 2`였고
 * 이 값은 귀환 정산 때만 1로 돌아갔다. 한 원정이 몇 시간씩 이어지는 방치 플레이에서
 * 제보가 n번 오면 원정비가 2ⁿ배가 됐다 — 뜰 때마다 누르면 10시간에 자금이 −$1.47조였다.
 * 이제 한 원정의 배수는 그 회차에 걸린 대응 중 가장 큰 것(집중 ×2, 급파 ×3)이다.
 */
function applyTipCostMult(team: ExpeditionTeam, mult: number) {
  team.costMult = Math.max(team.costMult ?? 1, mult);
}

/**
 * **자동 집중**(v0.6.6, `notes/decision-tree-10h.md` §6 P2-가) — 진귀·국보(T2~T3)
 * 제보는 그 거점에 on_site인 발굴단이 있으면 엔진이 알아서 [집중 굴착]을 한 번 건다.
 * 원정당 한 번 누르는 것이 모든 축에서 낫거나 같은 **지배 전략**이었기 때문이다(§5.2) —
 * 늘 누르게 되는 버튼은 결정이 아니다. 대가(원정비 ×2)는 수동과 똑같이 붙는다.
 *
 * **유일(T4)은 건드리지 않는다.** 유일만 사람이 누른다 — 결정을 한 번의 무거운
 * 순간으로 모은다. `settings.autoFocusTips`(기본 켬)로 끌 수 있고, 꺼도 손실은 없다
 * (안 누른 판은 기존 28%가 그대로 적용된다 — 척추 4번).
 *
 * 제보가 열린 순간(`spawnTip`)과, 제보가 열려 있는 동안 팀이 도착한 순간(`step`의
 * `tickExpeditions` 직후) 둘 다에서 부른다. 난수를 쓰지 않고 상태만 본다 — 제보는
 * 온라인 전용이라 오프라인 적분 경로에도 들어가지 않는다.
 */
function autoFocusTip(w: World) {
  const tip = w.tip;
  if (!w.settings.autoFocusTips || !tip || tip.resolved || tip.focused) return;
  if (ARTIFACT_BY_ID[tip.artifactId].tier >= 4) return;
  const team = w.teams.find((t) => t.status === "on_site" && t.targetSite === tip.site);
  if (!team) return;
  tip.focused = true;
  tip.autoFocused = true;
  applyTipCostMult(team, TIP_FOCUS_DIG_COST_MULT);
}

/** 루틴(spec.md §8.4) — "어디로 갈지"는 대행하지 않는다. 이미 한 번 수동으로
 *  보낸 target을 계속 반복할지만 자동화한다 */
export function setRoutine(w: World, teamId: string, enabled: boolean, target?: SiteId | "auto"): boolean {
  const team = w.teams.find((t) => t.id === teamId);
  if (!team) return false;
  team.routine = enabled ? { enabled: true, target: target ?? "auto" } : null;
  return true;
}

/**
 * 루틴 대상이 `"auto"`일 때 다음에 갈 곳(v0.3.4). `recommendSites()`를 그대로 쓴다 —
 * 미방문 거점을 크게 우대하고(+1000) 그다음 아직 못 채운 검증 종이 많은 순이다.
 * 다른 팀이 이미 향하고 있는 거점은 뺀다(같은 곳에 겹쳐 보내면 커버리지가 안 는다).
 * 추천이 비면(더 채울 게 없으면) 가던 곳을 그대로 유지한다.
 *
 * **왜 자동 순회가 필요한가**: 고정 대상 루틴은 그 거점을 다 캐고 나면 그 뒤로
 * 아무것도 더 주지 못한다. 계측에서 탭만 열어 둔 플레이의 도감이 125/1,902종에서
 * 멈춘 이유가 정확히 이것이다(`notes/play-telemetry.md` §1).
 */
export function nextRoutineTarget(w: World, team: ExpeditionTeam): SiteId {
  const taken = new Set(
    w.teams.filter((t) => t.id !== team.id && t.status !== "idle").map((t) => t.targetSite)
  );
  const pick = recommendSites(w, SITES.length).find((id) => !taken.has(id));
  return pick ?? team.targetSite;
}

/**
 * 원정 귀환 정산(spec.md §8.3, G27/B5) — 원정비는 후불 원천징수다. "원정 기대소득"
 * 노셔널 공식(world-map.md §3)으로 그 원정의 실현소득을 사이징하고, 그 비율만큼
 * funds에서 뗀다. 실제 드랍·자금은 이미 applyDigProgress가 온사이트 구간마다
 * 실시간으로 처리했다 — 이 함수는 오직 "원정비 정산 + 루틴 재파견"만 한다.
 */
/**
 * 이 회차의 원정비 청구액. 귀환 정산(`finalizeExpedition`)과, 자동 재투자가 남겨 둘
 * 예약금(`autoInvestReserve`)이 **같은 식**을 쓴다(v0.6.6). 현지작업 구간은 파견 때 정해진
 * 계획 구간이라 귀환 전에도 청구액을 미리 알 수 있다 — 달라지는 것은 그사이 오른 층뿐이다.
 */
function expeditionBill(w: World, team: ExpeditionTeam): number {
  const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  const travelHours = (team.arrivesAt - team.dispatchedAt) / 3600;
  const dist = foreman ? travelHours * EXPEDITION_SPEED_KMH * foremanSpeedMult(foreman.navigation) : 0;
  const window = onsiteWindow(team);
  const onsiteHours = Math.max(0, (window.end - window.start) / 3600);
  const mishapEff = team.mishapRolled ? 1 - EXPEDITION_MISHAP_TIME_LOSS_RATIO : 1;
  const effectiveOnsiteHours = onsiteHours * mishapEff;

  const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
  const layer = w.sites[team.targetSite].layer;
  /**
   * 노셔널 수입률($/s) — **DROP_INTERVAL_FLOOR_SECONDS 하한까지 반영한다**
   * (마무리 패스 버그 수정, notes/decisions.md G56). 이전엔 `d * PROGRESS_VALUE *
   * bonus / dropMod`로 직접 계산해 `dropThreshold()`가 실제 드랍 판정에 적용하는
   * 하한(드랍 1점당 최소 20초, §9.5)을 건너뛰었다 — dig power가 하한을 넘어서는
   * 순간(대략 d>1~2) 실제 드랍 빈도는 더 안 오르는데 노셔널 수입만 d에 비례해
   * 무한정 커져, 팀 하나가 왕복 한 번에 수천만~수억 달러를 청구당하고 그걸
   * 못 갚아 funds가 영구히 마이너스로 고정되는 실측 버그로 이어졌다(실측: 발굴단
   * 파견을 실제로 쓰는 정책으로 48시간만 돌려도 funds가 -80억까지 떨어져
   * 이후 모든 성장이 멈췄다). `dropThreshold()`를 그대로 불러써 실제 판정과
   * 항상 같은 하한을 쓴다 — 두 계산이 다시 어긋날 일이 없다.
   */
  // **천장을 뺀 임계**로 사이징한다 — `notionalDropThreshold` 주석 참조.
  const rateAt = (l: number) =>
    (layerExpectedValue(team.targetSite, l) * d) / notionalDropThreshold(team.targetSite, l, d);
  // 파견 시점 층과 귀환 시점 층 두 단가를 평균한다 — 한 회차 안에 여러 층을
  // 오른 원정은 초반을 저층 단가로, 후반을 고층 단가로 보냈으므로 최종(최고)층
  // 단가 하나로 전체를 소급 청구하면 과청구가 된다(위 주석 참조).
  const realRate = (rateAt(team.layerAtDispatch) + rateAt(layer)) / 2;
  const notionalIncome = realRate * distanceYieldBonus(dist) * effectiveOnsiteHours * 3600;
  // 집중 굴착(×2)·급파(×3) 배수가 이번 회차에 걸려 있으면 여기서 함께 적용한다
  // (spec.md §8.6, notes/decisions.md G45/A8). 다음 회차를 위해 적용 즉시 리셋한다.
  return Math.round(
    notionalIncome * EXPEDITION_COST_INCOME_RATIO * distanceCostMult(dist) * (team.costMult ?? 1)
  );
}

function finalizeExpedition(w: World, team: ExpeditionTeam, returnedAt = w.t) {
  const billed = expeditionBill(w, team);
  // **정산액은 보유 자금을 넘지 않는다**(v0.6.6, `notes/decision-tree-10h.md` §6 버그 2).
  // 원정비는 후불이라 그사이 자금을 다른 데 썼으면 청구액이 잔고보다 클 수 있다 —
  // 하한이 없던 때는 자금이 음수로 떨어져 감정비를 못 내고 도감이 멈췄다(G56과 같은
  // 종류의 결함). 모자란 몫은 탕감하고, 로그에 그대로 적는다(척추 5번).
  const cost = Math.min(billed, Math.max(0, Math.floor(w.funds)));
  w.funds -= cost;
  team.costMult = 1;
  log(
    w, "system",
    cost < billed
      ? `발굴단이 ${SITE_BY_ID[team.targetSite].city}에서 귀환했다. 원정비 ${usd(billed)} 중 보유 자금 ${usd(cost)}만 정산했다.`
      : `발굴단이 ${SITE_BY_ID[team.targetSite].city}에서 귀환했다. 원정비 ${usd(cost)} 정산.`
  );

  team.status = "idle";
  if (team.routine?.enabled) {
    const target = team.routine.target === "auto" ? nextRoutineTarget(w, team) : team.routine.target;
    // **다음 회차는 "귀환한 그 순간"에서 시작한다**(청크 끝이 아니라) —
    // `dispatchExpedition`의 `at` 주석 참조.
    dispatchExpedition(w, team.id, target, returnedAt);
  }
}

/**
 * 매 스텝 팀별 현지작업 구간과 world.t 절대 구간의 겹침을 계산해 진척을 적용하고,
 * returnsAt을 지나면 귀환 정산한다. **스텝 크기와 무관해야 한다** — 상태 문자열이
 * 아니라 (arrivesAt, returnsAt) 타임스탬프와 실제 겹침 구간으로만 계산하므로,
 * 1초씩 쪼개 부르든 한 번에 크게 부르든 같은 총 진척이 나온다(qa_expedition.ts).
 */
/**
 * 루틴이 켜져 있는데 유휴로 서 있는 팀을 다음 목적지로 보낸다(v0.6).
 *
 * v0.5.1까지 재파견은 `finalizeExpedition`(귀환 정산) 안에서만 일어났다. 그래서
 * **귀환 경로를 거치지 않고 유휴가 된 팀**(새로 꾸린 팀, 세이브 복원)은 누가
 * 손으로 보내 주기 전까지 영원히 서 있었다.
 *
 * **`advance()`/`step()` 안에서 부르지 않는다.** 한 번 그렇게 넣었다가
 * `sim --hours 48`의 오프라인 적분 검사가 `drops 166/163`으로 깨졌다 — 파견은
 * 미스헵을 1회 굴리므로(`dispatchExpedition`), 스텝 경계에 따라 난수 소비
 * 시각이 달라지면 이후 드랍 순서 전체가 갈린다. `autoInvestLegacyDig`가 같은
 * 이유로 `advance()` 밖에 있고(그 함수 주석 참조), 이 함수도 같은 자리에 둔다.
 */
function redeployIdleRoutineTeams(w: World) {
  for (const team of w.teams) {
    if (team.status !== "idle" || !team.routine?.enabled) continue;
    const target = team.routine.target === "auto" ? nextRoutineTarget(w, team) : team.routine.target;
    dispatchExpedition(w, team.id, target);
  }
}

function tickExpeditions(
  w: World, t0: number, dt: number, eff: number, report: StepReport, contributions: Map<SiteId, SiteContributor[]>
) {
  for (const team of w.teams) {
    if (team.status === "idle") continue;
    /**
     * **한 청크 안에서 회차가 여러 번 끝날 수 있다.** 거점 로컬 원정은 왕복이
     * `EXPEDITION_ONSITE_MIN_HOURS`(3분)뿐이라 10초 스텝이든 1초 스텝이든 한
     * 청크에 회차가 걸치고, 예전처럼 "청크당 최대 1회 귀환"으로 처리하면
     * 귀환 시각과 다음 회차 시작 사이의 조각(최대 dt초)이 통째로 증발한다 —
     * 그 조각이 스텝 크기에 비례하므로 적분이 스텝 크기에 따라 갈라진다.
     * 커서를 들고 청크 안을 걸어가며 회차 경계마다 정산한다.
     */
    let cursor = t0;
    let guard = 0;
    while (guard++ < 64) {
      const window = onsiteWindow(team);
      const start = Math.max(cursor, window.start);
      const end = Math.min(t0 + dt, window.end);
      if (end > start) {
        w.visitedSites[team.targetSite] = true;
        const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
        const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
        const mishapEff = team.mishapRolled ? 1 - EXPEDITION_MISHAP_TIME_LOSS_RATIO : 1;
        const effSeconds = (end - start) * eff * mishapEff;
        if (effSeconds > 0 && d > 0) {
          pushContribution(contributions, team.targetSite, { d, seconds: effSeconds, diggerForemanId: team.foremanId });
        }
      }
      if (cursor <= team.returnsAt && team.returnsAt <= t0 + dt) {
        const returnedAt = team.returnsAt;
        finalizeExpedition(w, team, returnedAt);
        // 루틴이 꺼진 팀은 유휴로 남는다 — 그때는 이 청크에서 더 할 일이 없다
        if ((team.status as ExpeditionTeam["status"]) === "idle") break;
        cursor = returnedAt;
        continue;
      }
      team.status = t0 + dt < team.arrivesAt ? "traveling_out" : t0 + dt < window.end ? "on_site" : "traveling_back";
      break;
    }
  }
}

/** 승급(staff.md §6) — 근속 스텝의 최저 스탯을 매주 결정론적으로 보완한다.
 *  스텝 크기 무관 boundary 판정(floor 비교)이라 오프라인 적분과도 안전하다 */
function promoteStaffTick(w: World, t0: number, dt: number) {
  const interval = STAFF_PROMOTION_INTERVAL_HOURS * 3600;
  const before = Math.floor(t0 / interval);
  const after = Math.floor((t0 + dt) / interval);
  if (after <= before) return;
  w.staff = w.staff.map((s) => promote(s));
}

/** 감정 총 소요시간(초) — 감정소 레벨(속도) × 티어별 배율(spec.md §9.2 APPRAISAL_HIGH_TIER_TIME_MULT) */
function totalAppraisalSeconds(lab: number, tier: Tier): number {
  return appraiseSeconds(lab) * APPRAISAL_HIGH_TIER_TIME_MULT[tier];
}

function runAppraisal(w: World, dt: number, report: StepReport) {
  if (w.pending.length === 0) return;
  const done: typeof w.pending = [];
  const keep: typeof w.pending = [];

  // 병렬 처리: 큐의 모든 항목이 동시에 감정된다. 감정소 레벨은 1점당 소요 시간을 줄인다.
  // 무료 감정권(appraisalVouchers, world-map.md §4 미탐사 보너스)이 있으면 수수료를
  // 면제한다 — 자금 게이트도 함께 풀린다(수수료가 0이 될 것이므로).
  for (const item of w.pending) {
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    // 종류 해금(spec.md §9.2) — 감정소 레벨이 그 티어의 해금 레벨에 못 미치면
    // "봉인 보관" 상태로 큐를 건너뛴다(카운트다운도, 처분도 없다 — G39/A1: 파괴·
    // 강제매각 없는 무기한 대기. LOCKED_HOLD_CAP은 이제 순수 UI 경고치라 여기선
    // 강제하지 않는다). 레벨이 오르면 다음 틱부터 자동으로 정상 큐에 합류한다.
    if (w.lab < APPRAISAL_UNLOCK_LAB_LEVEL[artifact.tier]) {
      keep.push(item);
      continue;
    }
    item.remain = Math.min(item.remain, totalAppraisalSeconds(w.lab, artifact.tier));
    const fee = Math.round(item.estimate * APPRAISE_FEE);
    const covered = w.appraisalVouchers > 0 || w.funds >= fee;
    if (!covered) {
      keep.push(item); // 자금 부족 — 대기. 미감정 매각으로 언제든 풀 수 있다
      continue;
    }
    item.remain -= dt;
    if (item.remain > 1e-9) keep.push(item);
    else {
      if (w.appraisalVouchers > 0) w.appraisalVouchers -= 1;
      else w.funds -= fee;
      done.push(item);
    }
  }
  w.pending = keep;

  for (const item of done) {
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    // 보존 상태(condition)를 평가액에 실제로 곱한다(notes/decisions.md G6·G51.7).
    // 초기값은 artifacts.ts가 이미 종별로 결정론 지터를 매긴 artifact.condition을
    // 그대로 쓴다(티어 기준값을 다시 평평하게 매기지 않는다).
    const condition = artifact.condition;
    const value = Math.round(tierValue(artifact.tier, artifact.valueFactor) * CONDITION_VALUE_FACTOR[condition]);
    report.appraised.push({ artifactId: artifact.id, tier: artifact.tier, value });
    // 감정 완료 = 지식 공개(③) — 이름·평가액이 확정되고 도감은 "owned"로 전이한다(§9.2·§13.3)
    w.codex[artifact.id] = "owned";

    if (autoSellEligible(w, artifact)) {
      w.funds += settleSale(w, artifact, value, item.diggerForemanId);
      w.stats.sold += 1;
    } else {
      w.vault.push({
        uid: nextUid(), artifactId: artifact.id, value, condition,
        diggerForemanId: item.diggerForemanId
      });
    }
  }
}

/** 단장 급여(staff.md §5, G29/B7 — 판매 시점 원천징수)를 뗀다. 모든 판매 채널이 공유한다. */
function withholdForemanSalary(w: World, gross: number, diggerForemanId?: string): number {
  if (!diggerForemanId) return gross;
  const foreman = w.staff.find((s) => s.id === diggerForemanId && s.role === "foreman") as Foreman | undefined;
  if (!foreman) return gross;
  return Math.round(gross - foremanSalary(gross, foreman));
}

/**
 * 거점별 시세(world-map.md §8, G48/B3)를 반영한 최종 매각가에서 단장 급여까지
 * 뗀 순수 입금액을 계산한다. 직접매각·자동매각(감정 완료 후 설정 기반)이
 * 이 경로를 쓴다 — spec.md §11.1 채널표에서 두 채널 모두 "로컬"이다.
 */
function settleSale(w: World, artifact: Artifact, baseValue: number, diggerForemanId?: string): number {
  const gross = Math.round(baseValue * bestLocalPriceMult(w, artifact.shape));
  return withholdForemanSalary(w, gross, diggerForemanId);
}

/**
 * 미감정 즉시매각(§11.1 채널표 — 지역성 "무관")은 `LOCAL_PRICE_MULT`를 곱하지
 * 않는다(notes/decisions.md G54 — 4단계에서 발견한 수정). 곱하면 암시장 일반
 * 매입가(추정가×0.75, 역시 지역 무관 기준)와 조합했을 때 LOCAL_PRICE_MULT가
 * 높은 site·shape 조합을 골라 사서 그 자리에서 미감정매각하는 것만으로
 * 무위험 차익이 생긴다 — G42/A5가 "0.75>0.7이라 무위험 차익이 없다"고 닫은
 * 계산이 애초에 양쪽 다 "추정가" 기준(로컬 배율 없음)이라는 전제였는데, 이
 * 전제가 이 함수에서 깨져 있었다(blindSell·blindSellAll 전부 이 버그의 영향을
 * 받았다 — 1단계부터 있던 결함이었지만 암시장 매입이 없던 3단계까지는 이
 * 결함을 이용할 진입 경로 자체가 없었다).
 */
function settleBlindSale(w: World, baseValue: number, diggerForemanId?: string): number {
  return withholdForemanSalary(w, Math.round(baseValue), diggerForemanId);
}

/** 보유 base(최대 MAX_OWNED_SITES) 중 그 카테고리 기준 최댓값을 자동 적용한다(G48/B3) */
function bestLocalPriceMult(w: World, shape: Shape): number {
  const bases = SITES.filter((s) => w.sites[s.id].unlocked);
  let best = REGIONAL_PRICE_MULT_MIN;
  for (const b of bases) {
    const clampMax = qualifiesRemoteArbitrage(w, b.id) ? REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX : REGIONAL_PRICE_MULT_MAX;
    const mult = localPriceMult(b.id, shape, w.t, clampMax);
    if (mult > best) best = mult;
  }
  return best;
}

/** base로부터 REMOTE_ARBITRAGE_MIN_DISTANCE_KM 이상 떨어진 거점을 한 번이라도
 *  방문한 적이 있으면 그 base의 클램프 상한이 확장된다(world-map.md §8.5) */
function qualifiesRemoteArbitrage(w: World, base: SiteId): boolean {
  return SITES.some((s) => w.visitedSites[s.id] && distanceKm(base, s.id) >= REMOTE_ARBITRAGE_MIN_DISTANCE_KM);
}

/**
 * 자동매각(spec.md §2.4 개정분 — notes/decisions.md G39/A1·G47/B1+B2).
 * v0.1의 "미감정 큐 초과 시 티어 무구분 자동매각"은 완전히 삭제됐다(위 runAppraisal
 * 주석 참조) — 이 함수는 그것과 무관한, 감정 **완료 후** 설정 기반 자동매각이다.
 *
 * - `AUTO_SELL_MAX_TIER`(=1) 상한: 설정값이 무엇이든 T2 이상은 대상이 될 수 없다.
 * - T3·T4는 `LOCKED_HOLD_TIER_EXEMPT_MIN_TIER` 기준 하드 예외로 한 번 더 막는다
 *   (AUTO_SELL_MAX_TIER=1이 이미 T2+를 막지만, 설정 상수가 바뀌어도 T3·T4는
 *   무너지지 않도록 이중으로 방어한다).
 * - `AUTO_SELL_KEEP_ONE_PER_SPECIES`: 그 종을 vault에 이미 1점 이상 갖고 있을 때만
 *   판다 — 지금 감정된 사본이 그 종의 유일한 소장분이면 절대 팔지 않는다.
 */
function autoSellEligible(w: World, artifact: Artifact): boolean {
  const auto = w.settings.autoSellBelow;
  if (auto === null) return false;
  if (artifact.tier >= LOCKED_HOLD_TIER_EXEMPT_MIN_TIER) return false;
  if (artifact.tier > Math.min(auto, AUTO_SELL_MAX_TIER)) return false;
  if (!AUTO_SELL_KEEP_ONE_PER_SPECIES) return true;
  return w.vault.some((v) => v.artifactId === artifact.id);
}

/**
 * 감정 파이프라인이 자금 부족으로 **통째로** 멈췄는가(v0.3.2 결함 3 — `eval.md` §22.3).
 *
 * 감정 수수료는 층 기대 평가액의 `APPRAISE_FEE`(2%)인데, 실제로 나오는 유물의
 * 대부분은 흔함(층 5에서 70%)이고 **신규 종은 팔지 않고 소장한다**(`autoSellEligible`의
 * `AUTO_SELL_KEEP_ONE_PER_SPECIES`). 그래서 "수수료는 나가고 수입은 0"인 드랍이
 * 연달아 붙으면 자금이 수수료 한 건 아래로 내려가고, 그 순간부터 큐의 **모든**
 * 항목이 `runAppraisal`의 `covered` 판정에서 막힌다 — 감정이 멈추니 매각도 수입도
 * 멈춘다. 시드 5개 × 1.5시간 실측에서 이 정지 구간이 중앙값 23.4%,
 * 최장 354초였다(`eval.md` §22.3 표).
 *
 * 예전엔 큐가 `pendingCap`까지 다 차야(드랍 20~40건, 4~6분) 아래 잉여 처분이
 * 탈출구를 열었다. 큐 길이는 이 교착의 **대리 지표일 뿐**이라 반응이 늦다 —
 * 그래서 교착 조건 자체를 직접 본다. 탈출 수단은 그대로다: spec.md §9.2가 이미
 * 정해 둔 "미감정 매각으로 언제든 풀 수 있다"를 자동으로 한 번 누르는 것뿐이고,
 * T0·T1 상한(`AUTO_SELL_MAX_TIER`)과 중복분 우선 순서도 그대로 지킨다.
 */
function appraisalStalled(w: World): boolean {
  if (w.appraisalVouchers > 0) return false;
  let hasAppraisable = false;
  for (const p of w.pending) {
    // 봉인 보관(감정소 레벨 미달)은 수수료와 무관하게 대기 중이라 교착 판정에서 뺀다.
    if (w.lab < APPRAISAL_UNLOCK_LAB_LEVEL[ARTIFACT_BY_ID[p.artifactId].tier]) continue;
    hasAppraisable = true;
    if (w.funds >= Math.round(p.estimate * APPRAISE_FEE)) return false;
  }
  return hasAppraisable;
}

/**
 * 미감정 큐가 `pendingCap(w.lab)`(순수 UI 경고 임계값이었던 그 함수, G54.6)를
 * 넘으면 T0·T1 잉여만 자동으로 미감정매각한다(notes/decisions.md G57 — v0.2
 * 결함 1 수정). spec.md §9.2가 이미 "자금이 감정비보다 적으면 그 항목은
 * 대기한다 — 미감정 매각으로 언제든 풀 수 있다"고 정한 그 탈출구를 그대로
 * 쓴다(새 매각 채널이 아니라 기존 `blindSell`을 자동으로 누르는 것뿐이다).
 * 클릭 0회 기본 상태에서는 아무도 그 탈출구를 수동으로 쓰지 않아 자금이
 * 영원히 0에 머무는 교착이 있었다 — 8시간 방치 실측(사람 스크린샷)으로 확인.
 *
 * T2 이상은 절대 건드리지 않는다(`AUTO_SELL_MAX_TIER`) — G39/A1의 "파괴적
 * 손실 금지" 취지를 그대로 지킨다. 봉인 보관 중(감정소 레벨 미달)인 고티어
 * 항목은 애초에 T0·T1이 아니므로 이 함수가 건드릴 일이 없다.
 *
 * `autoInvestLegacyDig`와 같은 이유로 `step()`/`advance()` 안에서는 부르지
 * 않는다 — 처음엔 매 60초 경계마다 불렀는데, 이 함수가 파는 항목 수가 많은
 * 장시간 단일 `advance()` 호출(예: `qa_expedition.ts`의 왕복 원정 검증, 수십
 * 시간을 한 호출로 처리한다)에서는 사고파는 금액이 누적돼 `w.funds`가
 * 스텝 크기에 따라 실측 5천만~1억 달러대로 벌어지는 걸 확인했다 — 여러 건이
 * 쌓이면 개별 드랍의 아주 작은 스텝-청크 잔차(G53.10)가 판매 대상·순서
 * 자체를 바꿔 그 금액만큼 누적 오차가 된다. `runAutoRoutine`(아래)을 통해
 * `applyOffline()`·`sim/run.ts`·UI 타이머에서만 부른다.
 */
function autoLiquidatePendingOverflow(w: World) {
  const cap = pendingCap(w.lab);
  const over = w.pending.length - cap;
  // 큐가 넘쳤으면 넘친 만큼, 넘치진 않았지만 교착이면 딱 한 점 — 한 점의 미감정
  // 매각액(추정가의 70%)이 수수료(2%)의 35배라 한 점이면 파이프라인이 다시 돈다.
  const sellCount = over > 0 ? over : appraisalStalled(w) ? 1 : 0;
  if (sellCount <= 0) return;
  const eligible = w.pending.filter((p) => ARTIFACT_BY_ID[p.artifactId].tier <= AUTO_SELL_MAX_TIER);
  // AUTO_SELL_KEEP_ONE_PER_SPECIES를 이 경로에도 적용한다. `autoSellEligible()`
  // (감정 경로)에는 "이미 금고에 그 종이 있을 때만 판다"는 가드가 있는데 잉여
  // 처분 경로에는 없었다 — 여기서 그 종의 유일한 소장분을 팔면 blindSell() 안의
  // demoteIfEmptied()가 codex를 "discovered_not_owned"로 되돌려 도감(엔딩 판정
  // 축, checkEnding → codexScore ≥ CODEX_GOAL_V2)이 방치 중에 감소한다.
  //
  // **실측 주의**: 이 경로가 도감 감소를 실제로 일으킨 사례는 아직 관측되지
  // 않았다(이 가드 추가 전후로 `sim --hours 12/24/48/96/168/336` 결과가 전부
  // 동일했다). 관측된 감소는 전부 경매 출품 경로였고 그건 `sim/run.ts`의
  // `listSparesAtAuction()`에서 따로 고쳤다. 이 가드는 같은 종류의 구멍을
  // 선제적으로 막아 두는 것이다.
  //
  // 그렇다고 유일 소장분을 무조건 지키면 큐가 안 빠져 G57이 고친 교착이
  // 되살아난다. 그래서 **중복분을 먼저 전부 소진하고, 그러고도 상한을 넘을
  // 때만** 유일 소장분에 손댄다 — 탈출구는 그대로 두고 도감만 지킨다.
  const heldElsewhere = (p: (typeof eligible)[number]) =>
    w.vault.some((v) => v.artifactId === p.artifactId) ||
    w.pending.some((q) => q.uid !== p.uid && q.artifactId === p.artifactId);
  const order = AUTO_SELL_KEEP_ONE_PER_SPECIES
    ? [...eligible.filter(heldElsewhere), ...eligible.filter((p) => !heldElsewhere(p))]
    : eligible;
  for (const item of order.slice(0, sellCount)) blindSell(w, item.uid);
}

/**
 * 인부·장비·감정소 레벨에 남는 자금을 자동으로 재투자한다(notes/decisions.md
 * G57). `sim/run.ts`가 처음부터 방치 기준선 측정에 써 온 정책(economy.md의
 * "σ<1 기본 정책" 실측 — D≈5,209/s 정체 기준선의 근거가 된 바로 그 재투자
 * 루프, notes/decisions.md G21/A7)과 **똑같은 우선순위·비율**을 그대로
 * 쓴다 — 새 밸런스 정책을 발명하지 않고, 이미 몇 라운드째 검증돼 온 정책을
 * 실제 엔진 기본값으로 승격시킬 뿐이다(`sim/run.ts`의 `act()`도 이제 이
 * 함수를 그대로 호출한다 — 로직이 두 곳에서 갈라지지 않는다).
 * `AUTO_INVEST_RESERVE`만큼은 항상 남겨 감정비 파이프라인을 굶기지 않는다.
 * `w.settings.autoReinvest`(기본 켬)로 끌 수 있다 — 꺼도 손실은 없다(척추 4번).
 *
 * **`step()`/`advance()` 안에서 부르지 않는다**(중요, 실측으로 두 번 확인한
 * 제약이라 자세히 남긴다). `w.workers`/`w.gear`가 오르면 `digPower()`가 바로
 * 그다음 틱부터 달라져 드랍·층 진행 속도 자체가 바뀐다 —
 *
 * 1차 시도: `step()` 내부에서 60초 경계마다 불렀다 — 구매가 일어나는 정확한
 *    실제 시각이 그 직전의 아주 작은 자금 잔차(드랍 타이밍의 스텝-청크 경계
 *    잔차, G53.10이 이미 문서화한 성질)에 따라 스텝 크기별로 미묘하게 갈릴
 *    수 있고, 그 잔차가 이후 매 구매마다 발굴력 차이로 증폭돼(다음 구매를
 *    더 앞당기거나 늦추는 피드백 루프) 드랍 수·층 도달까지 스텝 크기에 따라
 *    크게 벌어졌다(`sim --hours 24`의 오프라인 적분 검사가 drops 105/106·
 *    layer 6/7까지 벌어졌다 — 완전 일치를 요구하는 검사라 0.1% 같은 허용치도
 *    못 준다).
 * 2차 시도: `advance()` 맨 끝에서 그 호출 전체에 딱 한 번만 불렀다 — 위
 *    문제는 없앴지만(그 호출의 드랍·층에는 영향을 줄 수 없으니까), 이번엔
 *    "얼마나 살 수 있는가"가 지수 비용 곡선의 문턱이라 입력 funds의 아주
 *    작은 차이(같은 G53.10 잔차)가 "마지막으로 하나 더 살 수 있느냐"를
 *    갈라놓고, 그 한 건의 가격이 이미 커져 있어(반복 구매로 비용이 기하급수로
 *    자란 뒤라) 귀환 후 funds가 스텝 크기에 따라 수백만~천만 달러대로 벌어지는
 *    회귀를 냈다(`qa_expedition.ts`의 0.1% funds 허용치를 실제로 깼다).
 *
 * 두 시도 다 "이 함수가 순수 엔진 루프(`advance()`) 경로에 있다"는 공통
 * 원인이었다 — `qa_expedition.ts`·`qa_economy.ts`·`sim/run.ts`의 스텝 무관성
 * 검증이 전부 `advance()`를 직접 부르는 저수준 테스트라, 그 경로에 있는 한
 * 아무리 호출 빈도를 조절해도 결국 같은 종류의 민감도를 어딘가로 옮길
 * 뿐이었다. **결정**: `advance()`/`step()`에서는 완전히 빼고, 그 경로 밖에서만
 * 부른다 — `applyOffline()`(복귀 시점 1회, 아래)과 `sim/run.ts`의 `act()`(자체
 * 정책, 매 틱)가 각자 필요할 때 직접 부른다. 둘 다 qa 테스트가 검증하는
 * "같은 시드로 두 스텝 크기를 비교" 경로가 아니라 안전하다.
 */
/**
 * 자동 재투자가 남겨 둬야 할 현금.
 *
 * `AUTO_INVEST_RESERVE`(5,000₩)는 층 1의 감정 수수료가 461₩이던 시절의 값이다.
 * v0.6의 깊이 압축은 몇 분 만에 10층대까지 내려가고, 거기서는 감정 수수료가
 * **1건에 43,000₩**이다(수수료 = 층 기대가치 × 2%). 정액 5,000₩만 남기면
 * 재투자가 지갑을 비워 **감정도 매각도 수입도 전부 0인 구간**이 생긴다 —
 * 드랍만 계속 쌓이는 그 교착이 정확히 `qa:pipeline`이 지키는 결함이고
 * (v0.3.2 결함 3), 압축 직후 실측에서 정지 시간이 22.4%까지 올라갔다.
 *
 * 그래서 **대기 중인 미감정 항목의 수수료**를 먼저 남긴다(앞의 몇 건만 —
 * 큐가 길 때 재투자를 영영 못 하게 만들지 않기 위해서다).
 */
function autoInvestReserve(w: World): number {
  let sum = 0;
  let n = 0;
  for (const p of w.pending) {
    if (w.lab < APPRAISAL_UNLOCK_LAB_LEVEL[ARTIFACT_BY_ID[p.artifactId].tier]) continue;
    sum += Math.round(p.estimate * APPRAISE_FEE);
    if (++n >= AUTO_INVEST_FEE_RESERVE_ITEMS) break;
  }
  // **귀환이 다가온 원정의 청구액도 남긴다**(v0.6.6). 원정비는 후불이고 정산은 보유
  // 자금까지만 받는다(`finalizeExpedition`). 재투자가 그 전에 지갑을 비우면 청구액
  // 대부분이 탕감됐다 — 운영 기준선에서 정산 15회 중 15회, 청구액의 87%가 면제됐다
  // (`notes/v066-midpass-review.md` §1.3). 현지 작업 중·귀환 중인 팀만 센다 — 막
  // 떠난 팀의 몫까지 묶으면 몇 시간 동안 재투자가 멈춘다.
  for (const team of w.teams) {
    if (team.status === "on_site" || team.status === "traveling_back") sum += expeditionBill(w, team);
  }
  return Math.max(AUTO_INVEST_RESERVE, sum);
}

export function autoInvestLegacyDig(w: World) {
  if (!w.settings.autoReinvest) return;
  const reserve = autoInvestReserve(w);
  for (let i = 0; i < 200; i++) {
    const wc = workerCost(w.workers);
    const gc = gearCost(w.gear);
    const lc = labCost(w.lab);
    const spendable = w.funds - reserve;
    if (w.lab < 6 && spendable >= lc && lc <= wc * 3) buyLab(w);
    else if (w.gear < MAX_GEAR_LEVEL && spendable >= gc && gc <= wc * 6) buyGear(w);
    else if (spendable >= wc) buyWorker(w);
    else break;
  }
}

/**
 * 발굴단 자동 증강이 건드리지 않고 남겨 두는 자금 — **플레이어가 다음 확장을 위해
 * 모으는 돈**이다.
 *
 * 1. 다음 발굴단 슬롯 해금비 × 1.5(정책이 쓰던 비축 규칙 그대로)
 * 2. 빈 슬롯이 있으면 단장 고용비
 * 3. base 칸이 남아 있으면 아직 안 연 거점 중 가장 싼 해금비
 *
 * 2·3은 정책에 없던 줄이 아니라 **정책의 순서**를 옮긴 것이다. 예전 정책은 거점 해금 →
 * 슬롯 해금 → 단장 고용을 먼저 누르고 **남은 돈으로** 증강했다. 자동화는 그보다 앞선
 * 자동 루틴 안에서 돌기 때문에, 이 몫을 비워 두지 않으면 인원 1명(1.8만 달러)이 거점
 * 해금 문턱을 갉아 첫 10분의 두 번째 거점이 5분 밀렸다(5시드 중 1시드 실측 —
 * 층 돌파 30 → 22회, 밀도 원장 D축 1.32 → 1.59).
 */
function teamUpgradeReserve(w: World): number {
  let reserve = nextTeamSlotCost(w) * TEAM_AUTO_UPGRADE_SLOT_RESERVE_MULT;
  if (w.teams.length < w.maxTeams) reserve += FOREMAN_HIRE_COST;
  if (SITES.filter((s) => w.sites[s.id].unlocked).length < ownedSiteCap(w)) {
    const locked = SITES.filter((s) => !w.sites[s.id].unlocked).map((s) => s.unlockCost);
    if (locked.length > 0) reserve += Math.min(...locked);
  }
  return reserve;
}

/**
 * 발굴단 인원·장비 자동 증강(v0.6.6, `notes/decisions.md` G80.1).
 *
 * 레거시 인부·장비는 자동으로 사 주면서 **발굴단** 인원·장비는 안 사 주던 비대칭을
 * 닫는다. 운영 기준선에서 첫 10시간 사람 조작 144회 중 85회가 이 증강이었고, 첫
 * 1시간에만 38:30~59:30에 44회가 몰렸다(75초에 여섯 틱 연속). "살 수 있으면 산다"라
 * 결정이 아니라 잡무다.
 *
 * G80.1이 자동화를 미룬 이유(팀 증강이 슬롯 해금 자금을 흡수한다)는 **정책이 이미
 * 풀어 둔 규칙을 그대로 가져와** 닫는다 — 다음 슬롯 해금비의 1.5배를 먼저 비축하고(위
 * `teamUpgradeReserve`), 인원은 25만·장비는 250만 달러 이상에서만 산다(`balance.ts`
 * `TEAM_AUTO_*`). 한 번에 팀마다 인원 1·장비 1까지만 산다 — 정책이 틱마다 하던 그대로다.
 *
 * 정책에 없던 규칙은 둘이다.
 * - **현지 작업을 시작한 팀(on_site·traveling_back)은 증강하지 않는다.** 원정비는 후불이고
 *   귀환 순간의 팀 발굴력으로 그 회차 현지 작업 **전체**를 사이징한다(`finalizeExpedition`).
 *   귀환 직전에 산 인원 한 명이 회차 전체 청구서를 소급해 키운다 — 방치 플레이에 이걸
 *   켰더니 인원 33명짜리 팀이 53분에 1,870만 달러를 청구받아 자금이 음수로 떨어지고
 *   감정이 3분 넘게 멈췄다(`qa:pipeline` 최장 정지 중앙 48 → 253초). 대기·출발 중인 팀만
 *   키우면 새 발굴력이 그 회차 현지 작업 전체에 실제로 쓰이므로 청구가 정직해진다
 *   (같은 게이트 23초).
 * - 레거시 재투자와 같은 감정비 여유분(`autoInvestReserve`)을 산 뒤에도 남긴다.
 *
 * `settings.autoReinvest`를 따른다(끄면 쉰다). `advance()` 안에서 부르지 않는다 —
 * `autoInvestLegacyDig`와 같은 이유다(팀 발굴력 변화가 원정 정산 스텝 무관성을 깬다).
 */
export function autoInvestTeams(w: World) {
  if (!w.settings.autoReinvest) return;
  if (w.funds < teamUpgradeReserve(w)) return;
  const feeReserve = autoInvestReserve(w);
  for (const team of w.teams) {
    // 현지 작업을 시작한 팀은 건너뛴다 — 후불 원정비가 소급으로 커진다(위 주석)
    if (team.status === "on_site" || team.status === "traveling_back") continue;
    if (w.funds >= TEAM_AUTO_WORKER_MIN_FUNDS && w.funds - workerCost(teamWorkersSum(w)) >= feeReserve) {
      buyTeamWorker(w, team.id);
    }
    if (w.funds >= TEAM_AUTO_GEAR_MIN_FUNDS && w.funds - gearCost(teamGearSum(w)) >= feeReserve) {
      buyTeamGear(w, team.id);
    }
  }
}

/**
 * 중복분을 **경매장에 출품**한다(v0.3.4). 대상 선정은 `spareVaultItems()` 하나가
 * 그대로 맡으므로 종당 1점·전시 중·국보/유일·티어 상한 네 겹이 전부 같이 지켜진다
 * — 출구만 `blindSell`/직접매각에서 경매로 바뀐다.
 *
 * **왜 만들었나**: 168시간 계측에서 경매 출품이 플레이어 조작의 **64%**
 * (189회 × 3단계 = 567단계)를 차지했다. 한 점씩 손으로 등록하는 것 말고는 길이
 * 없었다(`notes/play-telemetry.md` §2.1).
 *
 * **경매장이 없거나 슬롯이 차 있으면 아무 일도 하지 않는다.** 직접매각으로 몰래
 * 바꾸지 않는다 — 플레이어가 고른 건 "경매로 보내라"이지 "어떻게든 팔아라"가 아니다.
 * 슬롯은 다음 낙찰이 비워 주므로 다음 루틴 틱에 이어서 나간다.
 */
export function auctionSpares(w: World, tier: Tier | null): { count: number; listed: number } {
  const items = spareVaultItems(w, tier);
  if (items.length === 0 || w.auctionHouses.length === 0) return { count: 0, listed: 0 };
  const { listed } = listManyAtAuction(w, items.map((i) => i.uid));
  return { count: items.length, listed };
}

/** 가격 배율이 높은 순으로 정렬한 경매장(`VaultView`의 base 칩과 같은 기준) */
function housesByPrice(w: World): AuctionHouse[] {
  return [...w.auctionHouses].sort(
    (a, b) => auctionPriceMult(b.grade, auctioneerOf(w, b)?.negotiation ?? 0)
      - auctionPriceMult(a.grade, auctioneerOf(w, a)?.negotiation ?? 0)
  );
}

/** 그 경매장의 동시 출품 한도 — 등급 기본값 + 경매관장 물류 보너스 */
function houseSlotCap(w: World, house: AuctionHouse): number {
  const auctioneer = auctioneerOf(w, house);
  return auctioneer
    ? auctioneerSlotBonus(house.grade, auctioneer.logistics)
    : AUCTION_SLOT_CAP_BY_GRADE[house.grade - 1];
}

/** 모든 경매장에 지금 남은 출품 자리 합. 다중 선택 화면이 "몇 점까지 올라가는가"를 미리 보여 준다 */
export function auctionFreeSlots(w: World): number {
  return w.auctionHouses.reduce((sum, h) => sum + Math.max(0, houseSlotCap(w, h) - h.listings.length), 0);
}

/**
 * 고른 사본을 한 번에 경매에 올린다. 가격 배율이 높은 경매장부터 채우고, 자리가
 * 다 차면 나머지는 금고에 그대로 둔다(`skipped`) — 직접매각으로 몰래 돌리지 않는다.
 * 중복 자동 정리(`auctionSpares`)도 같은 함수를 탄다.
 */
export function listManyAtAuction(w: World, uids: Iterable<number>): { listed: number; skipped: number } {
  const houses = housesByPrice(w);
  let listed = 0;
  let skipped = 0;
  for (const uid of uids) {
    if (houses.some((h) => listAtAuction(w, uid, h.site))) listed += 1;
    else skipped += 1;
  }
  return { listed, skipped };
}

function auctioneerOf(w: World, house: AuctionHouse): Auctioneer | undefined {
  return w.staff.find((s) => s.id === house.auctioneerId && s.role === "auctioneer") as Auctioneer | undefined;
}

/**
 * 설정(`settings.autoSellSpareBelow`)이 켜져 있으면 소장고 중복분을 정리한다
 * (v0.3.1, notes/decisions.md G68). `autoLiquidatePendingOverflow`와 같은 이유로
 * `step()`/`advance()` 안에서는 부르지 않는다 — 판매액이 스텝 크기에 따라
 * 누적 오차를 만든다(그 함수 주석의 실측 참조). `runAutoRoutine`을 통해
 * `applyOffline()`·`sim/run.ts`·UI 타이머에서만 불린다.
 *
 * 재투자(`autoInvestLegacyDig`)보다 **먼저** 부른다 — 같은 틱에 회수한 자금이
 * 그 틱의 재투자에 바로 쓰이게 하려는 것이다.
 */
function autoSellVaultSpares(w: World) {
  // 쌓였을 때 한 번에 치운다(G95.1) — 한 점씩 즉시 파는 것은 정리가 아니라 소음이다.
  // 플레이어가 직접 누르는 "지금 정리"는 이 임계를 타지 않는다(`sellSpares` 직접 호출).
  if (spareVaultItems(w, w.settings.autoSellSpareBelow).length < AUTO_SELL_SPARE_BATCH_MIN) return;
  if (w.settings.spareDestination === "auction") {
    const { listed } = auctionSpares(w, w.settings.autoSellSpareBelow);
    if (listed > 0) log(w, "system", `중복 유물 ${listed}점을 경매에 올렸다.`);
    return;
  }
  const { count, gained } = sellSpares(w, w.settings.autoSellSpareBelow);
  if (count === 0) return;
  log(w, "system", `중복 유물 ${count}점을 정리했다(+${usd(gained)}).`);
}

export type VaultCarePlan =
  /** 넘치지 않는다 */
  | { kind: "ok"; stored: number; capacity: number }
  /** 중복이 경매 출품 대기로 묶여 정원을 밀어내고 있다 — 출구가 막힌 것이지 정원이 좁은 게 아니다 */
  | { kind: "backlog"; stored: number; capacity: number; waiting: number }
  /** 한 칸 증축하면 초과가 해소된다 */
  | { kind: "expand"; stored: number; capacity: number; cost: number; affordable: boolean }
  /** 증축으로는 따라잡을 수 없다 — 습도조절로 저하를 상쇄한다 */
  | { kind: "humidity"; stored: number; capacity: number; level: number; cost: number; affordable: boolean }
  /** 자동 재투자가 꺼져 있어 자동으로는 아무것도 하지 않는다 */
  | { kind: "off"; stored: number; capacity: number };

/**
 * **소장고 정원 초과에 무엇을 할 것인가** — 자동화(`autoVaultCare`)와 화면이 **같은
 * 함수**를 읽는다(척추 5번: 화면이 규칙을 다시 구현하지 않는다).
 *
 * 초과는 켜지거나 꺼지거나 둘 중 하나다(보존 저하 2배). 그래서 판단이 두 줄로 끝난다.
 *
 * 1. **한 칸 증축으로 초과가 해소되면 증축한다**(살 수 있으면 바로 — 쿠션을
 *    기다리면 해소 창이 닫힌다). 초기에는 이것으로 꺼진다.
 * 2. **해소가 불가능하면 습도조절을 올린다.** 소장고가 담는 것은 중복분이 아니라
 *    수집품 그 자체라(10시간 실측 소장고 972점 · 도감 996종), 정원으로 따라잡는
 *    길은 없다 — 1,000점을 담으려면 보관소 23레벨, 약 950억₩이다. 초과가 만드는
 *    피해는 보존 저하 2배이고, 습도는 그 확률의 분모를 키운다
 *    (`conditionDecayChancePerDay`). **따라잡을 수 없는 것을 따라잡으려 돈을 태우는
 *    대신, 피해를 줄인다.**
 *
 * 전시 중인 유물은 초과에 세지 않는다(`conditionDecayTick`과 같은 기준).
 */
export function vaultCarePlan(w: World): VaultCarePlan {
  const stored = w.vault.filter((v) => !v.displayed).length;
  const capacity = vaultCapacity(w.vaultLevel, codexProgress(w).owned);
  if (stored <= capacity) {
    // 넘치지 않아도 **저하는 계속 돈다.** 초과는 그 확률을 2배로 만드는 배수일 뿐이라,
    // 상쇄를 초과에만 묶으면 초과가 사라진 순간 자동화가 손을 놓는다(G95 실측).
    if (w.settings.autoReinvest && w.humidityLevel < VAULT_CARE_HUMIDITY_FLOOR) {
      const cost = humidityLevelCost(w.humidityLevel);
      const budget = w.funds - autoInvestReserve(w);
      return {
        kind: "humidity", stored, capacity, level: w.humidityLevel, cost,
        affordable: budget >= cost * VAULT_CARE_COST_HEADROOM
      };
    }
    return { kind: "ok", stored, capacity };
  }

  /**
   * **출구가 막힌 경우를 먼저 가른다**(v0.6.4, G96). 보낼 곳이 경매인데 경매장이
   * 없거나 슬롯이 차 있으면 중복이 소장고에 그대로 쌓인다(`auctionSpares`는 직접매각으로
   * 몰래 바꾸지 않는다 — 플레이어가 고른 건 "경매로 보내라"다). 그 상태에서 정원을
   * 늘리거나 습도를 올리는 건 **원인이 아닌 곳에 돈을 쓰는 것**이다. 실측에서 운영
   * 기준선의 소장고 2,125점 중 1,131점이 이 대기 상태였다(G96).
   */
  const waiting =
    w.settings.spareDestination === "auction" ? spareVaultItems(w, w.settings.autoSellSpareBelow).length : 0;
  if (waiting > 0 && stored - waiting <= capacity) {
    return { kind: "backlog", stored, capacity, waiting };
  }

  if (!w.settings.autoReinvest) return { kind: "off", stored, capacity };

  const budget = w.funds - autoInvestReserve(w);
  if (vaultCapacity(w.vaultLevel + 1, codexProgress(w).owned) >= stored) {
    // 일회성 구매라 쿠션을 기다리지 않는다 — 기다리면 해소 창이 닫힌다(balance.ts 주석)
    const cost = vaultLevelCost(w.vaultLevel);
    return { kind: "expand", stored, capacity, cost, affordable: budget >= cost };
  }
  const cost = humidityLevelCost(w.humidityLevel);
  return {
    kind: "humidity", stored, capacity, level: w.humidityLevel, cost,
    affordable: budget >= cost * VAULT_CARE_COST_HEADROOM
  };
}

/**
 * 정원 초과 자동 대응(v0.6.3, G92). `vaultCarePlan`이 고른 것을 실행한다.
 *
 * **재투자보다 먼저 부른다** — 넘치는 동안은 같은 자금을 두고 인부·장비와 경쟁하는데,
 * 창고가 터진 채로 발굴력을 올리면 더 빨리 더 많이 썩는다. 대신 자동 재투자
 * (`settings.autoReinvest`)가 꺼져 있으면 이 루틴도 쉰다 — 플레이어가 끈 것은
 * "내 돈을 자동으로 쓰지 마라"이고, 그 뜻을 시설 구매에서만 뒤집지 않는다(척추 4번).
 *
 * 한 번에 한 칸만 산다. 습도는 비용이 1.8배씩 오르고 안전 계수가 3이라 저절로 멎는다.
 */
export function autoVaultCare(w: World) {
  const plan = vaultCarePlan(w);
  // 출구가 막힌 것뿐이면 시설을 사지 않는다 — 원인이 정원이 아니다(G96)
  if (plan.kind === "backlog") return;
  if (plan.kind === "expand" && plan.affordable) {
    if (buyVaultLevel(w)) {
      log(w, "system", `소장고 정원을 ${vaultCapacity(w.vaultLevel, codexProgress(w).owned)}점으로 늘렸다 — 초과가 풀렸다.`);
    }
    return;
  }
  if (plan.kind === "humidity" && plan.affordable) {
    if (buyHumidityLevel(w)) {
      log(w, "system", `정원 초과가 이어져 습도조절을 Lv.${w.humidityLevel}로 올렸다 — 보존 저하를 상쇄한다.`);
    }
  }
}

/**
 * 배경 루틴(미감정 잉여 처분·소장고 중복분 정리·인부/장비/감정소 재투자·발굴단 증강)을
 * 한 번에 묶어 부른다(notes/decisions.md G57·G68). **`step()`/`advance()`가 자동으로 부르지
 * 않는다** — 위 세 함수의 주석이 각각 실측으로 남긴 이유(스텝-청크 잔차가
 * 장시간 단일 `advance()` 호출 안에서 funds·드랍/층 진행으로 증폭된다)가
 * 똑같이 적용된다. 대신 이 루틴은 `advance()` 밖, 즉 qa/sim의 스텝 무관성
 * 검증이 거치지 않는 지점에서만 불린다:
 * - `applyOffline()` — 플레이어가 돌아온 시점에 딱 한 번(척추 4번 핵심 경로).
 * - `sim/run.ts`의 `act()` — 방치 기준선 시뮬 정책이 매 틱.
 * - `useGame.ts`의 애니메이션 프레임 루프 — 탭을 열어 둔 채 방치할 때 60초마다.
 */
export function runAutoRoutine(w: World) {
  autoLiquidatePendingOverflow(w);
  autoSellVaultSpares(w);
  autoVaultCare(w);
  autoInvestLegacyDig(w);
  autoInvestTeams(w);
  redeployIdleRoutineTeams(w);
}

/** 이 거점의 제보에 반응할 수단이 있는가(spec.md §8.6 제보 대상 자격) — 레거시
 *  단독 발굴이 지금 그 거점을 파고 있거나(항상 "그 자리"), 발굴단이 이미 on_site로
 *  가 있거나, 유휴 발굴단의 급파 압축 이동시간이 4시간 이내다. 어느 것도 아니면
 *  그 거점의 제보는 뽑히지 않는다 — 반응 불가능한 제보를 띄우지 않는다. */
export function playerCanReactAt(w: World, site: SiteId): boolean {
  if (w.activeSite === site) return true;
  if (w.teams.some((t) => t.status === "on_site" && t.targetSite === site)) return true;
  if (!w.teams.some((t) => t.status === "idle")) return false;
  const dist = distanceKm(teamHomeSite(w), site);
  // 후보 단계에선 어느 단장이 갈지 특정할 수 없으니 항해술 보너스 없는 보수적 기준으로 잰다
  const compressed = travelHoursOneWay(dist, 0) * EMERGENCY_DISPATCH_TRAVEL_MULT;
  return compressed <= EMERGENCY_DISPATCH_MAX_REACH_HOURS;
}

/** 제보 후보 전체(티어·검증만 통과한 모집단) — 아래 단계 필터의 분모다 */
const TIP_UNIVERSE = ARTIFACTS.filter((a) => a.tier >= 2 && a.sourceStatus === "verified");
/** 그중 유일만(12종). 매 스텝 도는 검사가 1,902종을 훑지 않게 미리 갈라 둔다. */
const TIP_UNIQUE_UNIVERSE = TIP_UNIVERSE.filter((a) => a.tier === 4);

/** 지금 제보로 알릴 수 있는 유일이 있는가(`tipPool`과 같은 조건, 12종만 훑는다) */
function hasEligibleUnique(w: World): boolean {
  return TIP_UNIQUE_UNIVERSE.some(
    (a) => available(w, a) && a.minLayer <= w.sites[a.site].layer && playerCanReactAt(w, a.site)
  );
}

/** `spawnTip`이 실제로 뽑는 풀. 단계별 진단(`tipPoolStages`)과 **같은 코드**를 탄다 —
 *  진단이 엔진과 갈라지면 진단이 아니라 추측이 된다. */
function tipPool(w: World): Artifact[] {
  return TIP_UNIVERSE.filter(
    (a) => available(w, a) && a.minLayer <= w.sites[a.site].layer && playerCanReactAt(w, a.site)
  );
}

export type TipPoolStages = {
  /** 검증된 T2+ 전체 */
  all: number;
  /** 세계 재고가 남은 것 */
  stock: number;
  /** 내 층이 minLayer에 닿은 것 */
  layer: number;
  /** 내가 반응할 수단이 있는 것 = 실제 풀 */
  reactable: number;
  /** 반응 가능한 거점 목록(왜 통과했는지의 이름) */
  sites: SiteId[];
};

/**
 * 제보 풀이 **어느 단계에서 0이 되는지**를 세는 읽기 전용 진단
 * (`notes/play-first-10h.md` §5.2의 일회성 프로브를 엔진 안으로 들인 것).
 * World를 바꾸지 않는다 — 계측이 게임을 바꾸면 계측이 아니다.
 */
export function tipPoolStages(w: World): TipPoolStages {
  const stock = TIP_UNIVERSE.filter((a) => available(w, a));
  const layer = stock.filter((a) => a.minLayer <= w.sites[a.site].layer);
  const reactable = layer.filter((a) => playerCanReactAt(w, a.site));
  return {
    all: TIP_UNIVERSE.length,
    stock: stock.length,
    layer: layer.length,
    reactable: reactable.length,
    sites: [...new Set(reactable.map((a) => a.site))]
  };
}

function spawnTip(w: World, rng: Rng) {
  const pool = tipPool(w);
  if (pool.length === 0) {
    w.nextTipIn = TIP_RETRY_INTERVAL;
    return;
  }
  // 유일(T4)이 자격을 갖췄으면 가중 추첨을 건너뛰고 그것을 편성한다
  // (`TIP_UNIQUE_PRIORITY` — 유일의 반응은 세계적 사건이다). 가중 추첨의 분모가
  // 자격 T2 종수에 끌려다니는 문제를 규칙으로 닫는다.
  const uniques =
    TIP_UNIQUE_PRIORITY && !w.lastTipWasUnique ? pool.filter((a) => a.tier === 4) : [];
  let target: Artifact;
  if (uniques.length > 0) {
    target = uniques.length === 1 ? uniques[0] : rng.pick(uniques);
  } else {
    // 높은 티어를 강하게 선호한다 — 제보는 유일·국보가 주인공이다
    const weighted: Artifact[] = [];
    for (const a of pool) {
      const n = TIP_TIER_WEIGHT[a.tier];
      for (let i = 0; i < n; i++) weighted.push(a);
    }
    target = rng.pick(weighted);
  }
  // 같은 거점에 홈을 둔 라이벌 — on_site와 동격이라 배너 안에 즉시 반응한다
  const rivalIds = w.rivals
    .filter((r) => r.homeSite === target.site)
    .map((r) => r.id);
  const chosen = rivalIds.slice(0, 1 + rng.int(0, 3));
  // 국보·유일은 세계에 퍼진다(`TIP_WORLDWIDE_MIN_TIER`) — 그 거점에 아무도 살지
  // 않으면 가장 가까운 수집가 한 명이 반응 대상이 된다. 이동시간은 여기서 모델링
  // 하지 않는다: 원거리 급파(아래)와 달리 이쪽은 "같은 제보를 받았다"는 자격이고,
  // 실제 획득은 마감 판정에서만 일어난다.
  if (chosen.length === 0 && target.tier >= TIP_WORLDWIDE_MIN_TIER) {
    const nearest = w.rivals
      .map((r) => ({ id: r.id, dist: distanceKm(r.homeSite, target.site) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (nearest) chosen.push(nearest.id);
  }

  // 원거리 라이벌 급파(spec.md §12.3) — 가장 가까운 유휴(추적 중이 아닌) 라이벌
  // 1명만 시도한다. 배너 수명과 무관하게 압축 이동시간 뒤 resolveRivalTipChases가
  // 판정한다(플레이어의 급파와 대칭 — G53 범위: 미스헵은 적용하지 않는다).
  const remoteCandidates = w.rivals
    .filter((r) => r.homeSite !== target.site && !r.tipChase)
    .map((r) => ({ r, dist: distanceKm(r.homeSite, target.site) }))
    .filter(({ dist }) => travelHoursOneWay(dist, 0) * EMERGENCY_DISPATCH_TRAVEL_MULT <= EMERGENCY_DISPATCH_MAX_REACH_HOURS)
    .sort((a, b) => a.dist - b.dist);
  if (remoteCandidates.length > 0) {
    const { r, dist } = remoteCandidates[0];
    const notionalCost =
      tierValue(target.tier, target.valueFactor) * EXPEDITION_COST_INCOME_RATIO *
      EMERGENCY_DISPATCH_COST_MULT * distanceCostMult(dist);
    if (r.funds >= notionalCost) {
      const travel = travelHoursOneWay(dist, 0) * EMERGENCY_DISPATCH_TRAVEL_MULT;
      r.funds -= notionalCost;
      r.tipChase = { artifactId: target.id, layer: target.minLayer, arrivesAt: w.t + travel * 3600 };
    }
  }

  w.lastTipWasUnique = target.tier === 4;
  w.tip = {
    artifactId: target.id,
    site: target.site,
    layer: target.minLayer,
    remain: rng.range(TIP_DURATION_ONSITE_MIN, TIP_DURATION_ONSITE_MAX),
    rivals: chosen,
    focused: false,
    openedAt: w.t,
    resolved: null
  };
  log(w, "system", `제보 — ${SITE_BY_ID[target.site].city} ${target.minLayer}층에서 반응. 대상: ${target.name}`);
  autoFocusTip(w);
}

/** 플레이어가 **지금 그 자리에서** 레이스에 참가하고 있는가 — 직접 발굴이 그
 *  거점을 파고 있거나, 발굴단이 on_site로 가 있거나. 이동 중인 급파는 아직 그
 *  자리에 없으므로 참가로 세지 않는다(도착하면 `team.tipChase`가 따로 판정한다 —
 *  spec.md §8.6, 배너 수명과 레이스 종료를 분리한 설계 그대로다). */
function playerRacingAt(w: World, tip: Tip): boolean {
  if (w.sites[tip.site].layer < tip.layer) return false;
  if (w.activeSite === tip.site) return true;
  return w.teams.some((t) => t.status === "on_site" && t.targetSite === tip.site);
}

/**
 * 배너 안에서 같은 자리를 파고 있는 라이벌. **층 조건은 걸지 않는다** — 제보를
 * 받은 쪽은 그 층까지 내려간다는 것이 이 사건의 전제이고, 플레이어도 같은 규칙을
 * 쓴다(`playerRacingAt` — 거점이 같으면 참가).
 *
 * v0.6은 여기에 `r.layer >= tip.layer`를 걸어 두고 있었는데, 압축된 곡선에서
 * 플레이어는 15초에 5층에 닿고 라이벌은 3분쯤 걸린다. 그 결과 **첫 몇 분의 제보에
 * 경쟁자가 한 명도 없었다** — 실측으로 첫 10분 제보의 과반이 무경쟁 단독 수령이었고,
 * "조금만 늦었으면 놓쳤다"(재미 3문장 ②)가 성립할 자리가 없었다(`eval.md` §28).
 */
function tipRivalContenders(w: World, tip: Tip): string[] {
  return tip.rivals.filter((id) => w.rivals.some((x) => x.id === id));
}

export type TipRaceOdds = {
  /** 마감까지 남은 초(이미 결판났으면 0) */
  decideIn: number;
  /** 플레이어가 그 자리에 있는가 */
  racing: boolean;
  /** 마감 판정에서 플레이어가 가질 확률(0~1). 보장이 걸려 있으면 1 */
  playerChance: number;
  /** 첫 승 보장이 이 판에 걸려 있는가 */
  guaranteed: boolean;
  /** 같은 자리를 파고 있는 라이벌 수 — 이 판의 경쟁도 그 자체다 */
  contenders: number;
  /** 유일인데 아직 대응하지 않았다 — 지금 상태로는 가져갈 수 없다 */
  needsResponse: boolean;
  /** 안목이 이 판에 더해 주는 몫(0 = 그 거점을 아직 모른다) */
  eyeBonus: number;
};

/** 마감 판정의 현재 상태 — 화면이 규칙과 같은 말을 하도록 엔진이 직접 낸다(척추 5번). */
export function tipRaceOdds(w: World, tip: Tip): TipRaceOdds {
  const racing = playerRacingAt(w, tip);
  const decideIn = tip.resolved
    ? 0
    : Math.max(0, tip.openedAt + TIP_MIN_RESPONSE_SECONDS + TIP_DECIDE_AFTER_GRACE_SECONDS - w.t);
  const target = ARTIFACT_BY_ID[tip.artifactId];
  const responded =
    !!tip.focused || w.teams.some((t) => t.tipChase?.artifactId === tip.artifactId && t.status === "on_site");
  const needsResponse =
    TIP_UNIQUE_REQUIRES_RESPONSE && target.tier === 4 && tip.rivals.length > 0 && !responded;
  const guaranteed = TIP_FIRST_WIN_GUARANTEED && racing && !needsResponse && w.stats.racesWon === 0;
  const firstUniqueLesson = needsResponse && TIP_FIRST_UNIQUE_TAUGHT && !w.taughtUniqueLoss;
  const eye = eyeRaceMult(w, tip.site);
  const pw =
    racing
      ? (tip.focused ? TIP_FOCUS_DIG_HIT_CHANCE : TIP_PLAYER_HIT) *
        (firstUniqueLesson ? 0 : needsResponse ? TIP_UNRESPONDED_UNIQUE_MULT : 1) * eye
      : 0;
  const contenders = tipRivalContenders(w, tip).length;
  const rw = contenders * TIP_RIVAL_HIT;
  const playerChance = guaranteed ? 1 : pw + rw === 0 ? 0 : pw / (pw + rw);
  return { decideIn, racing, playerChance, guaranteed, contenders, needsResponse, eyeBonus: eye - 1 };
}

/**
 * **판정 마감**(v0.6.1) — 반응 유예가 끝나고 `TIP_DECIDE_AFTER_GRACE_SECONDS`가
 * 더 지나도 아무도 적중하지 못했으면, 그 자리에 있는 진영끼리 **한 번에 결판낸다**.
 *
 * 이 함수가 없으면 제보는 "아무도 못 맞힌 채 만료"될 수 있고, 그게 v0.6 최악
 * 시드에서 첫 레이스 결과를 7분 30초로 밀고 첫 10분 승리를 0회로 만든 원인이었다
 * (`eval.md` §28). 승률은 드랍 판정과 **같은 상수**를 쓴다 — 마감은 승률이 아니라
 * 무승부를 없애는 장치다(`balance.ts` `TIP_DECIDE_AFTER_GRACE_SECONDS` 주석).
 *
 * 척추 3번(영구 상실은 플레이어가 그 자리에 있었을 때만)은 그대로다: 마감 판정은
 * 플레이어가 반응할 수 있는 거점에서만 뜨는 배너 안에서, 온라인 중에만 일어난다.
 */
function decideTipRace(w: World, rng: Rng, report: StepReport) {
  const tip = w.tip;
  if (!tip || tip.resolved) return;
  if (w.t - tip.openedAt < TIP_MIN_RESPONSE_SECONDS + TIP_DECIDE_AFTER_GRACE_SECONDS) return;

  const target = ARTIFACT_BY_ID[tip.artifactId];
  if (!available(w, target)) {
    // 이미 세계에서 사라졌다 — 판정할 것이 없다(배너는 수명대로 닫힌다)
    clearTipChases(w, target.id);
    return;
  }

  const racing = playerRacingAt(w, tip);
  const contenders = tipRivalContenders(w, tip);
  // 유일은 대응(집중 굴착·급파)해야 가진다 — 그 자리에 있는 것만으로는 안 된다.
  const responded =
    !!tip.focused || w.teams.some((t) => t.tipChase?.artifactId === tip.artifactId && t.status === "on_site");
  const unresponded =
    TIP_UNIQUE_REQUIRES_RESPONSE && target.tier === 4 && contenders.length > 0 && !responded;
  const uniquePenalty = !unresponded
    ? 1
    : TIP_FIRST_UNIQUE_TAUGHT && !w.taughtUniqueLoss
      ? 0
      : TIP_UNRESPONDED_UNIQUE_MULT;
  const pw = racing
    ? (tip.focused ? TIP_FOCUS_DIG_HIT_CHANCE : TIP_PLAYER_HIT) * uniquePenalty * eyeRaceMult(w, tip.site)
    : 0;
  // 라이벌 가중은 **머릿수**다 — 유예 전 드랍 판정에서 라이벌 k명이 각자 굴리는
  // 것과 같은 셈이고, 그래서 제보마다 경쟁도가 다르다(1명이면 반반, 4명이면 20%).
  // 배너가 그 수치를 그대로 적는다(척추 5번, `tipRaceOdds`).
  const rw = contenders.length * TIP_RIVAL_HIT;
  // 양쪽 다 그 자리에 없다 — 결판낼 주체가 없으므로 유물은 세상에 남는다.
  // (급파가 이동 중이면 여기 걸린다 — 도착 판정은 기존 경로가 그대로 한다.)
  if (pw + rw === 0) return;
  // **척추 3번** — 유일(T4)은 플레이어가 **그 자리에 있을 때만** 걸린다. 자리를
  // 비운 판에서 마감이 유일을 라이벌에게 넘기지 않는다(배너는 그냥 만료된다).
  // 그 자리에 있었는데 대응하지 않아 진 것은 영구 상실의 정당한 경로다 —
  // "플레이어가 그 자리에 있었을 때만"은 충족되고, 대응 버튼은 화면에 있었다.
  if (!racing && target.tier === 4) return;

  const guaranteed = TIP_FIRST_WIN_GUARANTEED && pw > 0 && w.stats.racesWon === 0;
  const playerTakes = guaranteed || rng.chance(pw / (pw + rw));

  if (playerTakes) {
    take(w, target, "player", report);
    clearTipChases(w, target.id);
    w.stats.racesWon += 1;
    report.won.push(target.id);
    log(
      w, "won",
      guaranteed
        ? `첫 제보의 결판 — '${target.name}'${josa(target.name, "을를")} 확보했다. (첫 승은 참가하면 보장된다)`
        : `제보 마감 — '${target.name}'${josa(target.name, "을를")} 먼저 확보했다.`
    );
  } else {
    const rivalId = contenders.length === 1 ? contenders[0] : rng.pick(contenders);
    take(w, target, rivalId, report);
    clearTipChases(w, target.id);
    w.stats.racesLost += 1;
  }
  tip.resolved = { outcome: playerTakes ? "won" : "lost", at: w.t };
  if (target.tier === 4) w.taughtUniqueLoss = true;
}

/** 원거리 급파 라이벌의 도착 판정(spec.md §12.3) — 압축 이동시간이 지나면 그
 *  시점에 세계 재고가 남아 있는지만 확인해 1회 판정한다(플레이어의 team.tipChase와
 *  대칭). 매 스텝 호출된다. */
function resolveRivalTipChases(w: World, rng: Rng, report: StepReport) {
  for (const r of w.rivals) {
    if (!r.tipChase || w.t < r.tipChase.arrivesAt) continue;
    // 반응 유예 중이면 원거리 급파 라이벌도 판정을 미룬다(플레이어와 대칭)
    if (w.tip && !w.tip.resolved && w.tip.artifactId === r.tipChase.artifactId &&
        w.t - w.tip.openedAt < TIP_MIN_RESPONSE_SECONDS) continue;
    const target = ARTIFACT_BY_ID[r.tipChase.artifactId];
    if (available(w, target) && rng.chance(TIP_RIVAL_HIT)) {
      take(w, target, r.id, report);
      w.stats.racesLost += 1;
    }
    r.tipChase = null;
  }
}

export type RivalExpeditionInfo = {
  id: string; name: string; site: SiteId; status: "home" | "chasing"; arrivesAt: number | null;
};

/** 라이벌의 현재 원정 대상·ETA(spec.md §12.4, notes/decisions.md G18/A14) — 세계지도
 *  마커용 조회 API. UI 배선은 5단계 몫이라 여기서는 순수 조회 함수만 제공한다. */
export function rivalExpeditions(w: World): RivalExpeditionInfo[] {
  return w.rivals.map((r) => {
    if (r.tipChase) {
      const target = ARTIFACT_BY_ID[r.tipChase.artifactId];
      return { id: r.id, name: r.name, site: target.site, status: "chasing", arrivesAt: r.tipChase.arrivesAt };
    }
    return { id: r.id, name: r.name, site: r.homeSite, status: "home", arrivesAt: null };
  });
}

/**
 * 세계지도 추천(notes/world-map.md §7 — "현재 발굴력 대비, 아직 방문 안 했거나
 * 오래 방치된 거점 중 도감 기여도가 높은 상위 3곳", RECOMMEND_TOP_N=3). 5단계
 * UI 배선 — 순수 조회 함수다(World를 바꾸지 않는다). "도감 기여도"는 그
 * 거점에 검증된 종 중 아직 소장하지 않은(unseen 또는 discovered_not_owned) 종의
 * 수로 근사한다. 방문 이력(마지막 방문 시각)은 World가 boolean 플래그만 들고
 * 있어 "얼마나 오래" 방치됐는지는 알 수 없다 — 대신 "한 번도 안 가본 거점"에
 * 큰 가산점을 줘 최우선으로 추천한다(notes/decisions.md G55 보고 대상).
 */
export function recommendSites(w: World, topN = RECOMMEND_TOP_N): SiteId[] {
  const home = teamHomeSite(w);
  const scored = SITES.map((s) => {
    const contribution = ARTIFACTS.filter(
      (a) => a.site === s.id && a.sourceStatus === "verified" && w.codex[a.id] !== "owned" && w.codex[a.id] !== "owned_unidentified"
    ).length;
    const visited = !!w.visitedSites[s.id];
    /**
     * **거리 감쇠**(v0.6, `notes/play-first-10h.md` §8 처방 ①). v0.5.1까지 이
     * 함수는 거리를 전혀 보지 않았고, 그래서 t=0의 추천 1위가 지구 반대편
     * 페루였다 — 시작 발굴단이 편도 35.3시간을 떠나면서 첫 세션에서 사라졌다.
     * 일본은 페루의 92% 종 수를 가지고 왕복이 세션 안에 끝난다.
     *
     * 곱셈 감쇠를 쓰는 이유: 뺄셈이면 종 수가 많은 먼 거점이 여전히 이기거나
     * (계수가 작으면) 종 수가 무의미해진다(계수가 크면). 감쇠면 **"가까운
     * 곳부터, 단 종 수도 본다"**가 그대로 순위가 된다. 먼 거점이 더 좋다는
     * 설계 의도(거리가 비용·미스헵·수확에 다 걸려 있다)는 살아 있다 — 다만
     * 그 선택을 **게임이 대신 하면서 가장 먼 곳을 고르는 일**이 없어진다.
     */
    const hours = travelHoursOneWay(distanceKm(home, s.id), 0);
    const decay = 1 / (1 + hours / RECOMMEND_TRAVEL_HALF_HOURS);
    return { id: s.id, score: (contribution + (visited ? 0 : 1000)) * decay };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.id);
}

function updateCatchup(w: World) {
  const rows = ranking(w);
  const leader = Math.max(rows[0].assets, 1);
  for (const r of w.rivals) {
    const own = Math.max(r.vaultValue, 1);
    r.catchup = Math.min(CATCHUP_MAX, 1 + CATCHUP_SLOPE * Math.log10(leader / own));
  }
}

/**
 * v0.2 엔딩(spec.md §13.2). v0.1 정의(자산 단독 1위 + CODEX_GOAL=75%, `codexProgress()`
 * 기준)를 버리고 "RANK_SCORE 종합 1위 **그리고** CODEX_SCORE≥CODEX_GOAL_V2를
 * SEASON_TITLE_HOLD_HOURS(1시간) 연속 유지"로 교체한다(notes/decisions.md
 * G55.2가 "손대지 않고 보고"로 남긴 것을 마무리 패스 G56에서 닫는다 — 이게 없으면
 * v0.2 게임에 끝이 없다).
 *
 * `seasonState.titleHolderId`/`titleHeldSinceT`는 "지금 두 조건을 모두 만족하는
 * 소유자가 언제부터 그 상태였는가"를 추적한다 — 조건 중 하나라도 깨지면(종합
 * 1위가 바뀌거나, player의 도감이 다시 목표 밑으로 떨어지면) 그 즉시 리셋된다.
 * **판단**(보고 대상): spec 원문 "X이고 Y를 SEASON_TITLE_HOLD_HOURS 연속 유지"는
 * "두 조건을 동시에 계속 만족"으로도, "종합 1위만 계속 유지한 상태에서 도감은
 * 마지막 순간에만 확인"으로도 읽힌다 — 더 엄격하고 실제로 "칭호를 들고 있다"는
 * 직관에 맞는 전자로 구현했다(HOLD_HOURS=1이 짧아 두 해석의 실질 차이도 작다).
 * 라이벌이 종합 1위를 오래 유지해도 이 화면은 끝나지 않는다(v0.1과 같은
 * "플레이어 중심" 엔딩 패턴) — 라이벌의 1위는 시즌 종료 시점 명예의 전당
 * (§13.2 2번, applySeasonRollover)이 별도로 처리할 몫이다.
 */
function checkEnding(w: World, record: PersistentRecord) {
  if (w.ended) return;
  // **엔딩 판정에는 고스트를 넣지 않는다**(notes/decisions.md G76.9). 엔딩은 내 판의
  // 완주 판정이고, 다른 세계에서 건너온 스냅샷이 그걸 무효로 만들 수는 없다. 넣으면
  // 이미 완주한 친구의 기록패 하나로 내 엔딩이 영구히 막힌다(실측 — 엔딩 시점 세기의
  // 고스트 3명을 들이자 168시간까지 도감 85%를 채우고도 엔딩이 나지 않았다, `eval.md` §21).
  // 순위표에는 그대로 보이고, 제보 레이스에서 유물을 뺏기는 것도 그대로다 — 비교와
  // 경쟁은 살리고, 완주할 권리만 내 것으로 남긴다.
  const rows = fullRanking(w, record).filter((r) => !isGhostId(w, r.id));
  const leader = [...rows].sort((a, b) => b.rank - a.rank)[0];
  if (w.seasonState.titleHolderId !== leader.id) {
    w.seasonState.titleHolderId = leader.id;
    w.seasonState.titleHeldSinceT = w.t;
  }
  if (leader.id !== "player") return;
  if (leader.codex < CODEX_GOAL_V2) return;
  if (w.t - (w.seasonState.titleHeldSinceT ?? w.t) < SEASON_TITLE_HOLD_HOURS * 3600) return;
  w.ended = true;
  log(w, "system", "3축 종합 1위를 유지하며 도감을 채웠다. 유물왕.");
}

/** 시즌 경계(seasonState.endsAt)를 이번 dt 구간에서 실제로 지났으면 롤오버를
 *  트리거한다(spec.md §13.4, notes/decisions.md G51.5가 "순수 함수로만 존재"라고
 *  보고한 것을 마무리 패스 G56에서 닫는다). 오프라인 적분 중에도 흐른다 —
 *  시즌 롤오버는 라이벌과의 경쟁에서 지는 "상실"이 아니라 예정된 정산이라
 *  척추 3번(영구 상실은 접속 중에만) 대상이 아니다. */
function maybeRolloverSeason(w: World, t0: number, record: PersistentRecord) {
  if (t0 >= w.seasonState.endsAt || w.t < w.seasonState.endsAt) return;
  applySeasonRollover(w, record);
  log(w, "system", `시즌 ${w.seasonState.season - 1} 종료 — 새 시즌이 시작됐다.`);
}

const emptyReport = (): StepReport => ({ drops: [], appraised: [], lost: [], won: [], layerUps: 0 });

/** dt 초만큼 세계를 전진시킨다. offline=true 면 효율 60% + 라이벌 상위 티어 차단.
 *  `record`(계정 영구 기록)는 엔딩 판정(명성 축)과 시즌 롤오버(§13.4)가 참조·
 *  갱신한다 — 생략하면 호출마다 새로 만든 빈 기록을 쓴다(그 record는 이번
 *  호출이 끝나면 버려진다 — 세션에 걸쳐 영속시키려면 호출부가 직접 들고
 *  다니며 넘겨야 한다, useGame.ts·sim/run.ts 참조). */
export function step(w: World, dt: number, offline = false, record: PersistentRecord = createPersistentRecord()): StepReport {
  const report = emptyReport();
  if (dt <= 0) return report;
  const rng = new Rng(w.rngState);
  const eff = offline ? OFFLINE_EFFICIENCY : 1;
  const t0 = w.t;

  w.t += dt;
  // 레거시 단독 발굴과 발굴단은 같은 거점을 노리면 SiteProgress를 공유한다
  // (spec.md §8.2 "Σ D_team"). 그래서 기여자를 먼저 모으고, 거점별로 한 번씩
  // `applySiteChunk`가 **층 경계로 쪼개** 진척을 넣으며 드랍을 소진한다
  // (귀속은 기여 진척 비중 가중 추첨 — 그 함수 주석 참조).
  const contributions = new Map<SiteId, SiteContributor[]>();
  digPlayer(w, dt, eff, report, contributions);
  tickExpeditions(w, t0, dt, eff, report, contributions);
  // 제보가 열려 있는 동안 팀이 도착했으면 이 스텝의 드랍 판정부터 자동 집중을 적용한다
  if (!offline) autoFocusTip(w);
  for (const [site, contributors] of contributions) applySiteChunk(w, rng, site, contributors, report);
  for (const r of w.rivals) digRival(w, r, rng, t0, dt, eff, report);
  resolveRivalTipChases(w, rng, report);
  runAppraisal(w, dt, report);
  promoteStaffTick(w, t0, dt);

  // 시설(4단계) — 박물관 수입·습도저하·복원은 온·오프라인 무관하게 흐른다(손실
  // 위험이 없는 배경 자동화). 암시장 재입고·경매 정산도 지연일 뿐 상실이 아니라
  // 오프라인에도 흐른다. 도난 "판정"만 온라인 전용(아래)이고, 도난 "회수기간"은
  // onlineElapsedSeconds 기준이라 이 두 틱을 매번 불러도 오프라인 동안은
  // 경계 자체가 넘어가지 않는다(척추 3번).
  accrueMuseums(w, dt);
  conditionDecayTick(w, t0, dt);
  restorationTick(w, t0, dt, rng);
  settleAuctions(w, t0, dt);
  restockBlackMarket(w, t0, dt, rng);

  if (!offline) {
    w.onlineElapsedSeconds += dt;
    theftJudgeTick(w, dt, rng);
    theftResolveTick(w, rng, report);

    if (w.tip) {
      w.tip.remain -= dt;
      // 마감 판정이 먼저다 — 배너가 닫히기 전에 결판을 낸다(무승부 제거, v0.6.1)
      decideTipRace(w, rng, report);
      if (w.tip.remain <= 0) {
        const name = ARTIFACT_BY_ID[w.tip.artifactId].name;
        if (!w.tip.resolved) {
          log(w, "system", `제보가 만료됐다. '${name}'${josa(name, "은는")} 아직 세상에 남아 있다.`);
        }
        w.tip = null;
        w.nextTipIn = rng.range(TIP_MEAN_INTERVAL * 0.5, TIP_MEAN_INTERVAL * 1.5);
      }
    } else {
      // 유일이 방금 자격을 갖췄으면 다음 제보를 앞으로 당긴다
      // (`TIP_UNIQUE_ANNOUNCE_WITHIN`) — 유일 알림이 직전 배너의 수명 뒤에서
      // 기다리지 않게 한다. 연달아 유일이 뜨는 것은 `lastTipWasUnique`가 막는다.
      // **예약된 제보만 당긴다.** `nextTipIn`이 스케줄러가 낼 수 있는 최대치
      // (`TIP_MEAN_INTERVAL × 1.5`)를 넘으면 그건 카운트다운이 아니라 "제보를 꺼
      // 뒀다"는 뜻이다(`qa_expedition`이 제보 잡음을 걷어내려고 그렇게 한다).
      // 이 조건이 없으면 엔진이 그 끔을 되살려 스텝 무관성 검증을 깨뜨린다.
      const scheduled = w.nextTipIn <= TIP_MEAN_INTERVAL * 1.5;
      if (scheduled && w.nextTipIn > TIP_UNIQUE_ANNOUNCE_WITHIN && !w.lastTipWasUnique && hasEligibleUnique(w)) {
        w.nextTipIn = TIP_UNIQUE_ANNOUNCE_WITHIN;
      }
      w.nextTipIn -= dt;
      if (w.nextTipIn <= 0) spawnTip(w, rng);
    }
  } else {
    // 회수기간 만료 판정도 onlineElapsedSeconds 기준이라 오프라인 중엔 경계가
    // 넘어가지 않지만, theftResolveTick 자체는 부르지 않는다 — 도난이라는 사건의
    // 관측(로그·소유권 이전)까지 오프라인에 노출되지 않게 제보와 동일하게 막는다.
  }

  updateCatchup(w);
  checkEnding(w, record);
  maybeRolloverSeason(w, t0, record);
  w.rngState = rng.state;
  return report;
}

/** 큰 dt 를 고정 스텝으로 쪼개 적분한다. 오프라인 복귀와 시뮬이 같은 경로를 탄다 */
export function advance(
  w: World, seconds: number, offline = false, stepSize = 1, record: PersistentRecord = createPersistentRecord()
): StepReport {
  const total = emptyReport();
  let left = Math.max(0, seconds);
  let guard = 0;
  while (left > 1e-6 && guard++ < 200_000) {
    const dt = Math.min(stepSize, left);
    const r = step(w, dt, offline, record);
    total.drops.push(...r.drops);
    total.appraised.push(...r.appraised);
    total.lost.push(...r.lost);
    total.won.push(...r.won);
    total.layerUps += r.layerUps;
    left -= dt;
  }
  return total;
}

/**
 * `runAutoRoutine`(미감정 잉여 처분 + 인부·장비·감정소 재투자)는 여기서
 * `advance()` 뒤에 딱 한 번 불린다 — `advance()` 자체는 `qa_expedition.ts`·
 * `qa_economy.ts`·`sim/run.ts`의 오프라인 적분 스텝 무관성 검증이 직접
 * 부르는 저수준 함수라, 그 안에서(또는 그 직후라도 스텝 크기별로 다르게)
 * 이 루틴을 돌리면 실측으로 두 가지 회귀가 났다: (1) 재투자가 그다음 틱부터
 * 드랍·층 진행 속도(digPower) 자체를 바꿔 진행이 스텝 크기별로 갈라졌고,
 * (2) 잉여 처분·재투자 둘 다 지수 비용 곡선·다건 매각의 "문턱" 판단이라
 * 입력 funds의 아주 작은 차이(G53.10이 이미 문서화한 스텝-청크 잔차)가
 * 누적돼 귀환 후 funds가 스텝 크기에 따라 수천만 달러대로 벌어졌다.
 * `applyOffline()`은 실제 플레이어가 돌아왔을 때 딱 한 번만 불리고 이
 * 테스트들의 경로가 아니므로 안전하다. `sim/run.ts`는 자체 정책(`act()`)에서
 * 이 루틴을 직접 부른다(같은 이유로 `advance()`를 거치지 않는다) — 로직은
 * 갈라지지 않지만 호출 시점은 각자의 용도에 맞게 다르다.
 */
export function applyOffline(
  w: World, nowMs = Date.now(), record: PersistentRecord = createPersistentRecord()
): { seconds: number; report: StepReport } | null {
  const raw = (nowMs - w.lastTickAt) / 1000;
  w.lastTickAt = nowMs;
  if (raw < 60) return null;
  const seconds = Math.min(raw, OFFLINE_CAP_SECONDS);
  const report = advance(w, seconds, true, 10, record);
  runAutoRoutine(w);
  return { seconds, report };
}

// ── 액션 ──────────────────────────────────────────────────

export function click(w: World): boolean {
  const now = w.t;
  if (now > w.clickComboUntil) w.clickCombo = 1;
  w.clickCombo = Math.min(CLICK_COMBO_MAX, w.clickCombo + CLICK_COMBO_STEP);
  w.clickComboUntil = now + CLICK_COMBO_WINDOW;

  const second = Math.floor(now);
  if (second !== w.clickSecond) {
    w.clickSecond = second;
    w.clickAccum = 0;
  }
  const d = digPower(w);
  const cap = d * CLICK_RATE_CAP;
  const gain = Math.min(d * CLICK_FACTOR * w.clickCombo, Math.max(0, cap - w.clickAccum));
  if (gain <= 0) return false;
  w.clickAccum += gain;
  w.stats.clicks += 1;

  const sp = w.sites[w.activeSite];
  sp.layerProgress += gain;
  sp.dropProgress += gain;
  return true;
}

export function buyWorker(w: World): boolean {
  const cost = workerCost(w.workers);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.workers += 1;
  return true;
}

export function buyGear(w: World): boolean {
  if (w.gear >= MAX_GEAR_LEVEL) return false;
  const cost = gearCost(w.gear);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.gear += 1;
  return true;
}

export function buyLab(w: World): boolean {
  const cost = labCost(w.lab);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.lab += 1;
  for (const item of w.pending) item.remain = Math.min(item.remain, appraiseSeconds(w.lab));
  return true;
}

export function unlockSite(w: World, site: SiteId): boolean {
  const def = SITE_BY_ID[site];
  if (w.sites[site].unlocked || w.funds < def.unlockCost) return false;
  const ownedCount = SITES.filter((s) => w.sites[s.id].unlocked).length;
  // base 슬롯 상한(world-map.md §5, G17/A10) — unlockCost는 이제 원정 자격이 아니라
  // base 승격에만 든다. 원정은 12거점 어디든 항상 가능하다(expedition.ts·dispatchExpedition).
  if (ownedCount >= ownedSiteCap(w)) return false;
  w.funds -= def.unlockCost;
  w.sites[site].unlocked = true;
  w.sites[site].baseSince = w.t;
  w.visitedSites[site] = true;
  w.activeSite = site;
  log(w, "system", `${def.city} — ${siteAnchorLabel(def)} 발굴을 시작했다.`);
  return true;
}

/**
 * 거점 이전(world-map.md §5) — 보유 base가 1개일 때만 가능한, "잘못 고른 첫
 * 선택"을 되돌리는 액션이다. 게임 시작 FIRST_RELOCATION_FREE_WINDOW_HOURS(12h)
 * 안에는 비용·쿨다운이 면제된다.
 */
export function relocateBase(w: World, newSite: SiteId): boolean {
  const owned = SITES.filter((s) => w.sites[s.id].unlocked);
  if (owned.length !== 1 || owned[0].id === newSite) return false;
  const current = owned[0].id;
  const withinFreeWindow = w.t < FIRST_RELOCATION_FREE_WINDOW_HOURS * 3600;
  if (!withinFreeWindow) {
    if (w.lastRelocationAt !== null && w.t - w.lastRelocationAt < RELOCATION_COOLDOWN_HOURS * 3600) return false;
    const cost = playerAssets(w) * RELOCATION_COST_ASSET_RATIO;
    if (w.funds < cost) return false;
    w.funds -= cost;
    w.lastRelocationAt = w.t;
  }
  w.sites[current].unlocked = false;
  w.sites[current].baseSince = null;
  w.sites[newSite].unlocked = true;
  w.sites[newSite].baseSince = w.t;
  w.visitedSites[newSite] = true;
  w.activeSite = newSite;
  log(w, "system", `본거지를 ${withJosa(SITE_BY_ID[newSite].city, "로으로")} 옮겼다.`);
  return true;
}

export function switchSite(w: World, site: SiteId): boolean {
  if (!w.sites[site].unlocked) return false;
  w.activeSite = site;
  return true;
}

export function blindSell(w: World, uid: number): boolean {
  const idx = w.pending.findIndex((p) => p.uid === uid);
  if (idx < 0) return false;
  const [item] = w.pending.splice(idx, 1);
  w.funds += settleBlindSale(w, item.estimate * BLIND_SELL_RATE, item.diggerForemanId);
  w.stats.blindSold += 1;
  demoteIfEmptied(w, item.artifactId);
  return true;
}

export function blindSellAll(w: World): number {
  let gained = 0;
  const ids = new Set<string>();
  for (const item of w.pending) {
    gained += settleBlindSale(w, item.estimate * BLIND_SELL_RATE, item.diggerForemanId);
    w.stats.blindSold += 1;
    ids.add(item.artifactId);
  }
  w.pending = [];
  w.funds += gained;
  for (const id of ids) demoteIfEmptied(w, id);
  return gained;
}

/** 같은 유물의 사본을 n점 판다. 소장고가 유물 종류별로 묶여 있으므로 이 단위가 필요하다.
 *  전시 중(displayed) 유물은 건너뛴다 — 팔려면 먼저 undisplayArtifact로 내려야 한다
 *  (전시 중 유물은 자산 축에서 이미 빠져 있으므로, 몰래 팔리는 상태를 만들지 않는다). */
export function sellArtifactCopies(w: World, artifactId: string, count: number): number {
  let gained = 0;
  let left = count;
  const keep: typeof w.vault = [];
  for (const item of w.vault) {
    if (left > 0 && !item.displayed && item.artifactId === artifactId) {
      gained += settleSale(w, ARTIFACT_BY_ID[item.artifactId], item.value, item.diggerForemanId);
      w.stats.sold += 1;
      left -= 1;
    } else keep.push(item);
  }
  w.vault = keep;
  w.funds += gained;
  demoteIfEmptied(w, artifactId);
  return gained;
}

/**
 * 소장고 다중 선택(v0.5.2)이 실제로 처분할 사본을 고른다. 화면은 **종 단위**로
 * 고르고(소장고 그리드가 종별로 묶여 있다), 이 함수가 그 종들의 사본 중 무엇이
 * 나가는지를 정한다 — `spareVaultItems`와 같은 이유로 화면이 규칙을 다시 구현하지
 * 않게 하려는 것이다(표시한 점수와 실제로 나가는 점수가 같아야 한다, 척추 5번).
 *
 * - 전시 중 사본은 언제나 제외한다(다른 매각 경로와 같은 규율).
 * - `keepOnePerSpecies`면 종마다 1점을 남긴다. 남길 사본은 중복 정리와 같은
 *   `keeperOrder`(전시 중 > 평가액 높은 순 > uid)로 고른다 — 전시 사본이 있으면
 *   그게 보존분이 되므로 나머지 비전시 사본은 전부 대상이다. 이 옵션이 있어야
 *   "몽땅 팔았더니 도감이 줄었다"는 사고 없이 한 번에 정리할 수 있다.
 * - 국보·유일도 막지 않는다. 플레이어가 직접 고른 것이라 자동 정리의 하드 예외와
 *   성격이 다르다 — 대신 화면이 확인 단계에서 그 사실을 따로 적는다.
 */
export function bulkVaultTargets(
  w: World, artifactIds: Iterable<string>, keepOnePerSpecies: boolean
): VaultItem[] {
  const wanted = new Set(artifactIds);
  const bySpecies = new Map<string, VaultItem[]>();
  for (const item of w.vault) {
    if (!wanted.has(item.artifactId)) continue;
    const list = bySpecies.get(item.artifactId);
    if (list) list.push(item);
    else bySpecies.set(item.artifactId, [item]);
  }
  const out: VaultItem[] = [];
  for (const list of bySpecies.values()) {
    const ordered = [...list].sort(keeperOrder);
    const kept = keepOnePerSpecies ? ordered.slice(0, 1) : [];
    for (const item of ordered) {
      if (item.displayed || kept.includes(item)) continue;
      out.push(item);
    }
  }
  return out;
}

/**
 * 이 사본들을 처분하면 내 소유에서 완전히 사라지는 종(도감 축에서 빠지는 종).
 * 판정은 `demoteIfEmptied`와 같다 — 금고와 미감정 대기열 어디에도 사본이 남지
 * 않을 때다. 다중 선택 화면이 "도감 −N종"을 처분 **전에** 보여 주는 데 쓴다.
 */
export function speciesEmptiedBy(w: World, uids: Iterable<number>): string[] {
  const leaving = new Set(uids);
  const candidates = new Set(w.vault.filter((v) => leaving.has(v.uid)).map((v) => v.artifactId));
  return [...candidates].filter(
    (id) => !w.vault.some((v) => v.artifactId === id && !leaving.has(v.uid))
      && !w.pending.some((pd) => pd.artifactId === id)
  );
}

/**
 * 고른 사본을 한 번에 직접 매각한다. 채널은 1점 매각과 완전히 같다(`settleSale` —
 * 지역시세 × 단장 급여 원천징수). 전시 중이거나 이미 금고를 떠난 uid는 조용히
 * 건너뛴다 — 화면이 눌린 순간과 엔진이 처리하는 순간 사이에 경매·자동 정리가
 * 끼어들 수 있다.
 */
export function sellVaultItems(w: World, uids: Iterable<number>): { count: number; gained: number } {
  const wanted = new Set(uids);
  if (wanted.size === 0) return { count: 0, gained: 0 };
  const soldIds = new Set<string>();
  let gained = 0;
  let count = 0;
  const keep: VaultItem[] = [];
  for (const item of w.vault) {
    if (!wanted.has(item.uid) || item.displayed) {
      keep.push(item);
      continue;
    }
    gained += settleSale(w, ARTIFACT_BY_ID[item.artifactId], item.value, item.diggerForemanId);
    w.stats.sold += 1;
    count += 1;
    soldIds.add(item.artifactId);
  }
  w.vault = keep;
  w.funds += gained;
  for (const id of soldIds) demoteIfEmptied(w, id);
  return { count, gained };
}

/**
 * 소장고 **중복분** 자동 매각의 대상 선정(v0.3.1, notes/decisions.md G68).
 * 엔진(`autoSellVaultSpares`)과 UI 미리보기(`VaultView`)가 **같은 이 함수**를
 * 쓴다 — 화면이 규칙을 따로 구현하면 "정리 대상 12점"과 실제로 팔리는 점수가
 * 어긋난다(척추 5번 "규칙은 공개한다"는 표시한 수와 실제가 같을 때만 성립한다).
 *
 * 남기는 규칙(네 겹, 전부 설정과 무관하게 강제된다):
 * 1. **종당 `AUTO_SELL_SPARE_KEEP_PER_SPECIES`(=1)점 보존** — 2점째부터가 대상이다.
 *    이게 없으면 방치 중에 도감(엔딩 판정 축)이 감소한다.
 * 2. **전시 중(`displayed`) 사본 제외** — 박물관에서 몰래 사라지지 않는다.
 *    전시 사본이 있으면 그게 보존분 역할을 하므로 나머지는 전부 대상이 된다.
 * 3. **국보(T3)·유일(T4) 하드 예외**(`LOCKED_HOLD_TIER_EXEMPT_MIN_TIER`) — 설정이
 *    무엇이든, 상한 상수를 누가 올려도 대상이 되지 않는다.
 * 4. **`AUTO_SELL_SPARE_MAX_TIER`(=2) 상한** — 설정값이 그 위여도 잘린다.
 *
 * 보존할 1점은 "전시 중 > 평가액 높은 순 > uid 작은 순"으로 고른다. 결정론
 * 타이브레이크가 필요한 이유는 이 함수가 오프라인 복귀·UI 타이머·시뮬에서
 * 각각 다른 시점에 불리기 때문이다 — 같은 월드 상태면 같은 사본이 남아야 한다.
 */
export function spareVaultItems(w: World, tier: Tier | null): VaultItem[] {
  if (tier === null) return [];
  const cap = Math.min(tier, AUTO_SELL_SPARE_MAX_TIER);
  const bySpecies = new Map<string, VaultItem[]>();
  for (const item of w.vault) {
    const list = bySpecies.get(item.artifactId);
    if (list) list.push(item);
    else bySpecies.set(item.artifactId, [item]);
  }
  const kept = new Set<number>();
  for (const list of bySpecies.values()) {
    for (const item of [...list].sort(keeperOrder).slice(0, AUTO_SELL_SPARE_KEEP_PER_SPECIES)) {
      kept.add(item.uid);
    }
  }
  return w.vault.filter((item) => {
    if (item.displayed) return false;
    if (kept.has(item.uid)) return false;
    const a = ARTIFACT_BY_ID[item.artifactId];
    if (a.tier >= LOCKED_HOLD_TIER_EXEMPT_MIN_TIER) return false;
    return a.tier <= cap;
  });
}

/** 보존분 우선순위 — 전시 중 > 평가액 높은 순 > uid 작은 순(결정론 타이브레이크) */
function keeperOrder(a: VaultItem, b: VaultItem): number {
  const ad = a.displayed ? 1 : 0;
  const bd = b.displayed ? 1 : 0;
  if (ad !== bd) return bd - ad;
  if (a.value !== b.value) return b.value - a.value;
  return a.uid - b.uid;
}

/**
 * 중복분을 지금 전부 판다(수동 "지금 정리" 버튼과 자동 루틴이 공유한다).
 * 매각 채널은 직접매각과 완전히 같다(`settleSale` — 지역시세 × 단장 급여 원천징수).
 * 새 채널을 만들지 않는 게 핵심이다 — 자동화는 플레이어가 이미 누를 수 있는
 * 버튼을 대신 눌러 줄 뿐이어야 한다(척추 4번 "클릭은 언제나 선택").
 */
export function sellSpares(w: World, tier: Tier | null): { count: number; gained: number } {
  // 매각 자체는 다중 선택 매각과 같은 함수를 탄다. 그 안의 `demoteIfEmptied`는
  // 종당 1점 보존이 지켜졌다면 전부 no-op이지만, 나중에 보존 규칙이 바뀌어도
  // 도감이 조용히 어긋나지 않게 하는 같은 규율이다.
  return sellVaultItems(w, spareVaultItems(w, tier).map((s) => s.uid));
}

export function sellTierAtMost(w: World, tier: Tier): number {
  let gained = 0;
  const keep: typeof w.vault = [];
  const soldIds = new Set<string>();
  for (const item of w.vault) {
    if (!item.displayed && ARTIFACT_BY_ID[item.artifactId].tier <= tier) {
      gained += settleSale(w, ARTIFACT_BY_ID[item.artifactId], item.value, item.diggerForemanId);
      w.stats.sold += 1;
      soldIds.add(item.artifactId);
    } else keep.push(item);
  }
  w.vault = keep;
  w.funds += gained;
  for (const id of soldIds) demoteIfEmptied(w, id);
  return gained;
}

// ── 시설 업그레이드 액션(spec.md §9.1, 비용 곡선 G30/C) ────────────────────

export function buyVaultLevel(w: World): boolean {
  const cost = vaultLevelCost(w.vaultLevel);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.vaultLevel += 1;
  return true;
}
export function buyHumidityLevel(w: World): boolean {
  const cost = humidityLevelCost(w.humidityLevel);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.humidityLevel += 1;
  return true;
}
export function buyRestorationLevel(w: World): boolean {
  const cost = restorationLevelCost(w.restorationLevel);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.restorationLevel += 1;
  return true;
}
export function buySecurityLevel(w: World): boolean {
  const cost = securityLevelCost(w.securityLevel);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.securityLevel += 1;
  return true;
}

// ── 박물관(spec.md §10) ─────────────────────────────────────────────────

/** 등급1 박물관 건립(base에만, MUSEUM_MAX_COUNT=MAX_OWNED_SITES 상한) —
 *  등급0 임시 전시대를 실제 건물로 승격시킨다. */
export function buildMuseum(w: World, site: SiteId): boolean {
  if (!w.sites[site].unlocked) return false;
  if (w.museums.some((m) => m.site === site)) return false;
  if (w.museums.length >= MUSEUM_MAX_COUNT) return false;
  const cost = museumBuildCost(w.museums.length + 1);
  if (w.funds < cost) return false;
  w.funds -= cost;
  // 등급0에 전시 중이던 유물은 그대로 슬롯을 유지한다(등급1도 최소 1슬롯 이상이라
  // 자리가 남는다 — MUSEUM_SLOT_BY_GRADE=[1,3,6,10,15]).
  w.museums.push({ id: `museum-${nextUid()}`, site, grade: 1, marketingLevel: 1 });
  log(w, "system", `${SITE_BY_ID[site].city}에 박물관을 세웠다.`);
  return true;
}

export function upgradeMuseumGrade(w: World, site: SiteId): boolean {
  const museum = w.museums.find((m) => m.site === site);
  if (!museum || museum.grade >= MUSEUM_SLOT_BY_GRADE.length - 1) return false;
  const cost = museumGradeCost(museum.grade);
  if (w.funds < cost) return false;
  w.funds -= cost;
  museum.grade += 1;
  return true;
}

export function buyMuseumMarketing(w: World, site: SiteId): boolean {
  const museum = w.museums.find((m) => m.site === site);
  if (!museum) return false;
  const cost = marketingLevelCost(museum.marketingLevel);
  if (w.funds < cost) return false;
  w.funds -= cost;
  museum.marketingLevel += 1;
  return true;
}

/** 관장 고용(staff.md §2·§4) — 그 거점(등급0 임시 전시대도 가능, 실제 박물관 여부 무관) */
/** 등급0 임시 전시대에는 배정할 필요가 없다(관장이 없어도 기본 스탯으로 동작한다,
 *  accrueMuseums) — 그래서 등급1 이상 박물관이 그 거점에 실제로 건립돼 있어야
 *  고용할 수 있다(hireAuctioneer와 동일한 요구조건으로 통일). */
export function hireCurator(w: World, site: SiteId, slot: number): string | null {
  const museum = w.museums.find((m) => m.site === site);
  if (!museum) return null;
  const cost = FOREMAN_HIRE_COST; // 스텝 고용비는 직군 무관 공통값(notes/staff.md — 단장만 명시, 관장·경매관장도 동일 적용)
  if (w.funds < cost) return null;
  const candidate = staffCandidates(site, staffMarketCycle(w), "curator")[slot];
  if (!candidate || candidate.role !== "curator") return null;
  w.funds -= cost;
  const id = `curator-${nextUid()}`;
  const curator: Curator = { id, name: candidate.name, role: "curator", curation: candidate.curation, securitySense: candidate.securitySense };
  w.staff.push(curator);
  museum.curatorId = id;
  log(w, "system", `관장 ${curator.name}${josa(curator.name, "을를")} 고용했다.`);
  return id;
}

/** 전시(spec.md §10.5) — 빈 슬롯이면 즉시, 다 찼으면 실패(호출부가 내릴 유물을 먼저 골라야 한다) */
export function displayArtifact(w: World, uid: number, site: SiteId, slot: number): boolean {
  if (slot < 0 || slot >= museumSlotCount(w, site)) return false;
  const item = w.vault.find((v) => v.uid === uid);
  if (!item || item.displayed) return false;
  if (w.vault.some((v) => v.displayed && v.museumSite === site && v.slot === slot)) return false;
  item.displayed = true;
  item.museumSite = site;
  item.slot = slot;
  item.displaySessionStart = w.t;
  return true;
}

export function undisplayArtifact(w: World, uid: number): boolean {
  const item = w.vault.find((v) => v.uid === uid);
  if (!item || !item.displayed) return false;
  item.restBaseline = freshnessOf(item, w.t);
  item.restSince = w.t;
  item.displayed = false;
  item.museumSite = undefined;
  item.slot = undefined;
  item.displaySessionStart = undefined;
  return true;
}

// ── 경매장(spec.md §11.1·§11.3) ─────────────────────────────────────────

export function buildAuctionHouse(w: World, site: SiteId): boolean {
  if (!w.sites[site].unlocked) return false;
  if (w.auctionHouses.some((a) => a.site === site)) return false;
  if (w.auctionHouses.length >= AUCTION_HOUSE_MAX_COUNT) return false;
  const cost = auctionHouseBuildCost(w.auctionHouses.length + 1);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.auctionHouses.push({ id: `auction-${nextUid()}`, site, grade: 1, listings: [] });
  log(w, "system", `${SITE_BY_ID[site].city}에 경매장을 세웠다.`);
  return true;
}

export function upgradeAuctionGrade(w: World, site: SiteId): boolean {
  const house = w.auctionHouses.find((a) => a.site === site);
  if (!house || house.grade >= AUCTION_SLOT_CAP_BY_GRADE.length) return false;
  const cost = auctionGradeCost(house.grade);
  if (w.funds < cost) return false;
  w.funds -= cost;
  house.grade += 1;
  return true;
}

export function hireAuctioneer(w: World, site: SiteId, slot: number): string | null {
  const cost = FOREMAN_HIRE_COST;
  if (w.funds < cost) return null;
  const candidate = staffCandidates(site, staffMarketCycle(w), "auctioneer")[slot];
  if (!candidate || candidate.role !== "auctioneer") return null;
  const house = w.auctionHouses.find((a) => a.site === site);
  if (!house) return null;
  w.funds -= cost;
  const id = `auctioneer-${nextUid()}`;
  const auctioneer: Auctioneer = {
    id, name: candidate.name, role: "auctioneer", negotiation: candidate.negotiation, logistics: candidate.logistics
  };
  w.staff.push(auctioneer);
  house.auctioneerId = id;
  log(w, "system", `경매관장 ${auctioneer.name}${josa(auctioneer.name, "을를")} 고용했다.`);
  return id;
}

/** 경매 상장 — vault에서 빼내 AUCTION_SETTLE_HOURS 뒤 자동 정산된다(settleAuctions) */
export function listAtAuction(w: World, uid: number, site: SiteId): boolean {
  const house = w.auctionHouses.find((a) => a.site === site);
  if (!house) return false;
  if (house.listings.length >= houseSlotCap(w, house)) return false;
  const idx = w.vault.findIndex((v) => v.uid === uid);
  if (idx < 0 || w.vault[idx].displayed) return false;
  const [item] = w.vault.splice(idx, 1);
  house.listings.push({
    vaultUid: item.uid, artifactId: item.artifactId, value: item.value,
    listedAt: w.t, settleAt: w.t + AUCTION_SETTLE_HOURS * 3600, diggerForemanId: item.diggerForemanId
  });
  return true;
}

// ── 암시장(spec.md §11.5) ────────────────────────────────────────────────

export function buyBlackMarketListing(w: World, listingId: number): boolean {
  const idx = w.blackMarket.listings.findIndex((l) => l.id === listingId);
  if (idx < 0) return false;
  const listing = w.blackMarket.listings[idx];
  const ratio = listing.kind === "stolen" ? BLACK_MARKET_STOLEN_PRICE_RATIO : BLACK_MARKET_BUY_PRICE_RATIO;
  const cost = Math.round(listing.estimate * ratio);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.blackMarket.listings.splice(idx, 1);

  if (listing.kind === "stolen") {
    // 장물 — 이미 감정된 값이라 즉시 vault로 들어간다. 최초발굴이 아니므로 codex는
    // 건드리지 않는다(자산 축에는 기여, 도감·명성 축에는 기여하지 않는다, spec.md §11.5).
    w.vault.push({
      uid: nextUid(), artifactId: listing.artifactId, value: listing.estimate,
      condition: ARTIFACT_BY_ID[listing.artifactId].condition
    });
  } else {
    // 미감정 매물 — 정상 감정 파이프라인으로 들어간다(codexProgress가 owned_unidentified로 반영)
    const artifact = ARTIFACT_BY_ID[listing.artifactId];
    if (w.codex[artifact.id] !== "owned") w.codex[artifact.id] = "owned_unidentified";
    w.pending.push({
      uid: nextUid(), artifactId: artifact.id,
      remain: totalAppraisalSeconds(w.lab, artifact.tier), estimate: listing.estimate
    });
  }
  return true;
}

export const costs = { workerCost, gearCost, labCost };

// ── 시즌 롤오버 (spec.md §13.4) ──────────────────────────────────────────

/**
 * 시즌 롤오버(spec.md §13.4, notes/decisions.md G2). vault 헌정 → funds 환전+소각 →
 * 시설 초기화 → 스텝 초기화 → 거점 리셋 순서로 실행하고, `record`(계정 영구 기록)를
 * 갱신해 반환한다. `w`는 그 자리에서 다음 시즌의 초기 상태로 고쳐진다(순수 함수가
 * 아니라 World를 직접 돌려쓴다 — 오프라인 적분·세이브가 같은 World 참조를 계속
 * 쓰는 v0.1 패턴과 맞춘다).
 *
 * **범위(보고 대상, notes/decisions.md G51)**: 이번 단계는 플레이어분만 처리한다.
 * spec.md §13.4 말미는 "라이벌 전원에게도 동일하게 적용된다"고 요구하지만, 라이벌의
 * v0.2 규칙(§12·원정·스텝)이 아직 엔진에 없어(후속 단계 범위) 라이벌 쪽 롤오버는
 * 그 스텝과 함께 붙여야 한다 — 지금 흉내만 내면 나중에 두 번 깨진다.
 *
 * "시설 초기화"(3항) 대상 중 이번 엔진에 실제로 존재하는 필드는 `lab`뿐이다(보관소
 * 레벨·박물관·경매장은 아직 World 필드가 없다). `workers`·`gear`는 §13.4 목록에
 * 문자 그대로는 없지만(발굴단·단장 모델로 이관될 예정) 리셋하지 않으면 자금만
 * 소액으로 리셋된 채 무비용 고발굴력이 다음 시즌으로 그대로 넘어가는 구멍이 생겨
 * (발굴단 시스템이 아직 없어 "팀 해체로 자연히 사라진다"는 전제가 성립하지 않는다)
 * 함께 리셋했다 — 판단 근거는 notes/decisions.md G51에 남겼다.
 */
export function applySeasonRollover(w: World, record: PersistentRecord): PersistentRecord {
  const season = w.seasonState.season;

  // 1. vault 헌정 — T0~T3는 legacyFame, T4는 hallOfFame(+legacyFame)
  for (const item of w.vault) {
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    if (artifact.tier === 4) {
      record.hallOfFame.push({ artifactId: artifact.id, dedicatedSeason: season, ownerName: "나" });
      record.legacyFame += FAME_PER_DEDICATED_T4;
    } else {
      record.legacyFame += FAME_PER_DEDICATED[artifact.tier];
    }
  }
  w.vault = [];
  w.pending = [];
  record.firstT4Finds += w.stats.firstT4Finds;

  // 도감: CodexState는 5종뿐이라 "헌정됨" 전용 표시값이 없다(spec.md §13.4가 요구하는
  // 6번째 상태 — 보고 대상, notes/decisions.md G51). vault·원장이 모두 리셋되므로
  // 알았던 종은 전부 가장 가까운 기존 값인 "discovered_not_owned"로 근사한다.
  for (const a of ARTIFACTS) {
    if (w.codex[a.id] !== "unseen") w.codex[a.id] = "discovered_not_owned";
  }

  // 2. funds — 10%는 환전(상한 있음), 나머지 90%는 소각
  record.carryoverFundsCredit += w.funds * SEASON_CASHOUT_RATIO;
  w.funds = 30_000 + Math.min(record.carryoverFundsCredit, 30_000 * SEASON_CARRYOVER_FUNDS_CAP_MULT);

  // 3. 시설 초기화 — 위 함수 주석 참조. 4단계로 늘어난 시설(보관소·박물관·경매장·
  // 암시장)도 전부 시즌 한정 자산이라 함께 리셋한다(spec.md §13.4 3항).
  w.lab = 1;
  w.workers = 0;
  w.gear = 0;
  w.vaultLevel = 1;
  w.humidityLevel = 1;
  w.restorationLevel = 1;
  w.securityLevel = 1;
  w.lastConditionDay = Math.floor(w.t / CONDITION_TICK_SECONDS);
  w.nextRestorationAttemptAt = w.t + RESTORATION_BASE_HOURS * 3600;
  w.museumDigEma = 0;
  w.museumCumulativeVisitors = 0;
  w.museums = [];
  w.auctionHouses = [];
  w.blackMarket = { listings: [] };
  w.theftEvents = [];
  w.onlineElapsedSeconds = 0;

  // 4. 스텝(단장·관장·경매관장) 전원 계약 종료(spec.md §13.4 4항) — 급여가 판매
  // 시점 원천징수라 미지급 잔액이 없으므로 정산할 것도 없이 그대로 비운다.
  // 발굴단도 단장 없이는 기능하지 않으므로 함께 해체한다 — 다음 시즌은 새
  // 고용 시장에서 다시 뽑는다.
  w.staff = [];
  w.teams = [];
  w.maxTeams = MAX_EXPEDITION_TEAMS_INITIAL;
  w.appraisalVouchers = 0;

  // 5. 거점 리셋 + 세계 원장을 초기 스톡으로 복원(G2). "다음 시즌 시작 시 무료
  // 거점 1곳을 다시 선택하고 HOME_BASE_BONUS도 매 시즌 새로 받는다"(§13.4 5항)는
  // initialSites()가 그대로 만족한다 — korea가 baseSince=0으로 다시 시작한다.
  // 방문 플래그·미탐사 보너스 지급 이력도 시즌 한정이라 함께 리셋한다(world-map.md §8.5).
  w.sites = initialSites();
  w.activeSite = SITES.find((s) => s.unlockCost === 0)?.id ?? SITES[0].id;
  w.ledger = createLedger();
  w.visitedSites = {};
  w.unexploredBonusGranted = {};
  w.lastRelocationAt = null;

  w.ended = false;
  w.stats = { drops: 0, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 };
  w.seasonState = initialSeasonState(season + 1, w.t);

  return record;
}
