import {
  APPRAISE_FEE, ARTIFACT_SPECIES_TARGET, ARTIFACT_WORLD_VALUE_CEILING, ASSET_SCORE_REF_SHARE,
  AUTO_SELL_KEEP_ONE_PER_SPECIES, AUTO_SELL_MAX_TIER, BASE_DIG, BLIND_SELL_RATE, CATCHUP_MAX,
  CATCHUP_SLOPE, CLICK_COMBO_MAX, CLICK_COMBO_STEP, CLICK_COMBO_WINDOW, CLICK_FACTOR, CLICK_RATE_CAP,
  CODEX_GOAL, CONDITION_INITIAL_BASE_BY_TIER, DEPTH_INCOME_BONUS, EXPEDITION_COST_INCOME_RATIO,
  EXPEDITION_MISHAP_TIME_LOSS_RATIO, EXPEDITION_SPEED_KMH, EXPEDITION_TEAM_UNLOCK_BASE,
  EXPEDITION_TEAM_UNLOCK_GROWTH, FAME_FIRST_T4_WEIGHT, FAME_PER_DEDICATED,
  FAME_PER_DEDICATED_T4, FAME_VISITOR_NORMALIZATION, FIRST_RELOCATION_FREE_WINDOW_HOURS,
  FOREMAN_HIRE_COST, GEAR_MULT, HOME_BASE_BONUS_DROPMOD_MULT, HOME_BASE_BONUS_DURATION_HOURS,
  LAYERS_PER_SITE, LOCKED_HOLD_TIER_EXEMPT_MIN_TIER, MAX_EXPEDITION_TEAMS_CAP,
  MAX_EXPEDITION_TEAMS_INITIAL, MAX_GEAR_LEVEL, MAX_OWNED_SITES, OFFLINE_CAP_SECONDS,
  OFFLINE_EFFICIENCY, PROGRESS_VALUE, RANK_WEIGHT, REGIONAL_PRICE_MULT_MAX,
  REGIONAL_PRICE_MULT_MIN, RELOCATION_COOLDOWN_HOURS, RELOCATION_COST_ASSET_RATIO,
  REMOTE_ARBITRAGE_LOCAL_CLAMP_MAX, REMOTE_ARBITRAGE_MIN_DISTANCE_KM, SEASON_CASHOUT_RATIO,
  SEASON_CARRYOVER_FUNDS_CAP_MULT, SEASON_LENGTH_WEEKS, SITES, SITE_BY_ID,
  STAFF_MARKET_REFRESH_HOURS, STAFF_PROMOTION_INTERVAL_HOURS, TIER4_SPECIES_TOTAL,
  TIER_STOCK_PER_SPECIES, TIP_DURATION_MAX, TIP_DURATION_MIN, TIP_FIRST_DELAY, TIP_MEAN_INTERVAL,
  TIP_PLAYER_HIT, TIP_RIVAL_HIT, UNEXPLORED_BONUS_APPRAISAL_VOUCHER, WORKER_DIG,
  appraiseSeconds, distanceKm, dropThreshold, gearCost, labCost, layerCost, layerExpectedValue,
  tierValue, tierWeights, workerCost
} from "./balance";
import { ARTIFACTS, ARTIFACT_BY_ID, artifactsOf } from "./artifacts";
import {
  distanceCostMult, distanceYieldBonus, mishapChance, onsiteHoursOf, onsiteWindow,
  teamDigPower, travelHoursOneWay
} from "./expedition";
import { josa } from "./format";
import { localPriceMult } from "./market";
import { Rng } from "./rng";
import { foremanSalary, foremanSpeedMult, promote, staffCandidates } from "./staff";
import type {
  Artifact, ExpeditionTeam, Foreman, Ledger, LogKind, OwnerId, PersistentRecord, RivalState,
  SeasonState, Shape, SiteId, Staff, StepReport, Tier, VaultItem, World
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
  return { legacyFame: 0, hallOfFame: [], carryoverFundsCredit: 0, firstT4Finds: 0, championHistory: [] };
}

export function createWorld(seed = 20260917): World {
  const sites = initialSites();
  const codex: Record<string, "unseen"> = {};
  for (const a of ARTIFACTS) codex[a.id] = "unseen";

  return {
    version: 3,
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
      catchup: 1
    })),
    codex,
    tip: null,
    nextTipIn: TIP_FIRST_DELAY,
    log: [{ t: 0, kind: "system", text: "경주 고분군에서 발굴을 시작했다." }],
    settings: { autoSellBelow: null, muted: false },
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
    lastRelocationAt: null
  };
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

/** owned_unidentified도 "지금 갖고 있다"로 센다(spec.md §13.3) — 이름을 아는지가 아니라
 *  소유 여부가 도감 진행도의 기준이다. v0.1 엔딩 조건(checkEnding)도 이 값을 그대로 쓴다. */
export function codexProgress(w: World): { owned: number; lost: number; total: number } {
  let owned = 0;
  let lost = 0;
  for (const a of ARTIFACTS) {
    const s = w.codex[a.id];
    if (s === "owned" || s === "owned_unidentified") owned++;
    else if (s === "lost") lost++;
  }
  return { owned, lost, total: ARTIFACTS.length };
}

// ── v0.2 3축 순위 (spec.md §13.1) ────────────────────────────────────────

const ASSET_SCORE_REF = ARTIFACT_WORLD_VALUE_CEILING * ASSET_SCORE_REF_SHARE;

/** 전시 중(vault[].displayed)인 유물은 자산 축에서 제외한다(G49/B4). 박물관이
 *  아직 없어 displayed는 항상 falsy이므로 이번 단계에서는 playerAssets(w)와 같다 */
export function assetScore(w: World): number {
  const assets = w.vault.reduce((sum, v) => (v.displayed ? sum : sum + v.value), 0);
  return Math.min(1, assets / ASSET_SCORE_REF);
}

export function codexScore(w: World): number {
  return codexProgress(w).owned / ARTIFACT_SPECIES_TARGET;
}

/** 박물관 관람객 축은 시설 시스템이 없어 항상 0이다. 유일 최초발굴 항은
 *  이번 시즌분(Stats.firstT4Finds) + 계정 영구분(PersistentRecord.firstT4Finds)을 더한다 */
export function fameScore(w: World, record: PersistentRecord): number {
  const visitors = 0;
  const firstT4 = record.firstT4Finds + w.stats.firstT4Finds;
  return Math.min(1, visitors / FAME_VISITOR_NORMALIZATION + (firstT4 / TIER4_SPECIES_TOTAL) * FAME_FIRST_T4_WEIGHT);
}

export function rankScore(w: World, record: PersistentRecord): number {
  return RANK_WEIGHT.asset * assetScore(w) + RANK_WEIGHT.codex * codexScore(w) + RANK_WEIGHT.fame * fameScore(w, record);
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
    // PENDING_CAP 오버플로 자동매각은 없다(notes/decisions.md G39/A1) — 큐는
    // 무제한 대기다. 티어 구분 없이 자동으로 팔던 옛 로직은 T3·T4까지 팔아치울
    // 수 있는 척추 3번 위반 경로였다. PENDING_CAP은 이제 순수 UI 경고 임계값이다.
  } else {
    const rival = w.rivals.find((r) => r.id === owner)!;
    rival.owned.push(a.id);
    const value = tierValue(a.tier, a.valueFactor);
    if (a.tier <= rival.sellBelow) rival.funds += value;
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

function candidates(w: World, site: SiteId, tier: Tier, layer: number): Artifact[] {
  return artifactsOf(site, tier).filter((a) => a.minLayer <= layer && available(w, a));
}

function rollDrop(
  w: World, rng: Rng, site: SiteId, layer: number, owner: OwnerId, offline: boolean, report: StepReport,
  diggerForemanId?: string
) {
  // 제보 레이스: 조건을 만족하면 대상 유물이 직접 걸린다
  const tip = w.tip;
  if (tip && tip.site === site && layer >= tip.layer) {
    const target = ARTIFACT_BY_ID[tip.artifactId];
    if (available(w, target)) {
      const hit = owner === "player" ? TIP_PLAYER_HIT : tip.rivals.includes(owner) ? TIP_RIVAL_HIT : 0;
      if (hit > 0 && rng.chance(hit)) {
        take(w, target, owner, report, diggerForemanId);
        if (owner === "player") {
          w.stats.racesWon += 1;
          report.won.push(target.id);
          log(w, "won", `제보를 따라 '${target.name}'${josa(target.name, "을를")} 먼저 확보했다.`);
        } else {
          w.stats.racesLost += 1;
        }
        w.tip = null;
        w.nextTipIn = rng.range(TIP_MEAN_INTERVAL * 0.5, TIP_MEAN_INTERVAL * 1.5);
        return;
      }
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
  take(w, rng.pick(pool), owner, report, diggerForemanId);
}

/** 그 거점이 base로 승격된 지 HOME_BASE_BONUS_DURATION_HOURS 안이면 dropMod를
 *  낮춰 준다(world-map.md §1 통일 공식). 레거시 단독 발굴·발굴단 원정 모두 이
 *  하나의 거점별 실효 dropMod를 공유한다(§9.2 SiteProgress가 플레이어 공용이므로). */
function effectiveDropMod(w: World, site: SiteId): number {
  const sp = w.sites[site];
  const base = SITE_BY_ID[site].dropMod;
  if (sp.baseSince === null) return base;
  const elapsedHours = (w.t - sp.baseSince) / 3600;
  return elapsedHours < HOME_BASE_BONUS_DURATION_HOURS ? base * HOME_BASE_BONUS_DROPMOD_MULT : base;
}

/** 그 거점에 이번 틱 진척을 보탠 기여자 한 명 — 드랍 귀속 추첨(아래 drainSiteDrops)의 재료 */
type SiteContributor = { d: number; diggerForemanId?: string };

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
function addSiteProgress(w: World, site: SiteId, effSeconds: number, d: number, report: StepReport) {
  if (effSeconds <= 0 || d <= 0) return;
  const sp = w.sites[site];
  const progress = d * effSeconds;
  sp.layerProgress += progress;
  sp.dropProgress += progress;

  let guard = 0;
  while (sp.layer < LAYERS_PER_SITE && sp.layerProgress >= layerCost(site, sp.layer) && guard++ < 64) {
    sp.layerProgress -= layerCost(site, sp.layer);
    sp.layer += 1;
    report.layerUps += 1;
    log(w, "system", `${SITE_BY_ID[site].name} ${sp.layer}층 — ${SITE_BY_ID[site].eras[sp.layer - 1]}`);
    // 미탐사 보너스(world-map.md §4) — 그 거점 층1 최초 돌파(이번 시즌 한정) 1회
    if (sp.layer === 2 && !w.unexploredBonusGranted[site]) {
      w.unexploredBonusGranted[site] = true;
      w.appraisalVouchers += UNEXPLORED_BONUS_APPRAISAL_VOUCHER;
      log(w, "system", `${SITE_BY_ID[site].name}을(를) 처음 탐사했다 — 무료 감정권 ${UNEXPLORED_BONUS_APPRAISAL_VOUCHER}장 획득.`);
    }
  }
  if (sp.layer >= LAYERS_PER_SITE) sp.layerProgress = Math.min(sp.layerProgress, layerCost(site, sp.layer));
}

/**
 * 그 거점의 드랍 게이지를 한 번에 소진한다(그 거점 기여자 전원의 진척이 이미
 * `addSiteProgress`로 더해진 뒤 틱당 한 번만 호출된다). 문턱은 기여자 합산
 * 발굴력(`totalDig`)으로 계산하고, 문턱을 넘길 때마다 **기여자별 발굴력 비중으로
 * 가중 추첨**해 그 드랍의 단장을 정한다 — 레거시(가중치 있지만 diggerForemanId
 * 없음)와 발굴단들이 실제 기여 비율대로 드랍 귀속을 나눠 갖는다.
 */
function drainSiteDrops(w: World, rng: Rng, site: SiteId, contributors: SiteContributor[], report: StepReport) {
  const sp = w.sites[site];
  const totalDig = contributors.reduce((sum, c) => sum + c.d, 0);
  if (totalDig <= 0) return;
  const dropMod = effectiveDropMod(w, site);
  let guard = 0;
  while (sp.dropProgress >= dropThreshold(site, sp.layer, totalDig, dropMod) && guard++ < 512) {
    sp.dropProgress -= dropThreshold(site, sp.layer, totalDig, dropMod);
    rollDrop(w, rng, site, sp.layer, "player", false, report, pickContributor(rng, contributors, totalDig));
  }
}

function pickContributor(rng: Rng, contributors: SiteContributor[], totalDig: number): string | undefined {
  if (contributors.length === 1) return contributors[0].diggerForemanId;
  let roll = rng.next() * totalDig;
  for (const c of contributors) {
    roll -= c.d;
    if (roll <= 0) return c.diggerForemanId;
  }
  return contributors[contributors.length - 1].diggerForemanId;
}

function digPlayer(
  w: World, dt: number, eff: number, report: StepReport, contributions: Map<SiteId, SiteContributor[]>
) {
  const d = digPower(w);
  if (d <= 0) return;
  addSiteProgress(w, w.activeSite, dt * eff, d, report);
  pushContribution(contributions, w.activeSite, { d });
}

function pushContribution(contributions: Map<SiteId, SiteContributor[]>, site: SiteId, c: SiteContributor) {
  const list = contributions.get(site);
  if (list) list.push(c);
  else contributions.set(site, [c]);
}

function digRival(w: World, r: RivalState, rng: Rng, dt: number, eff: number, report: StepReport) {
  const site = r.favSite;
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

  // 라이벌도 같은 비용 곡선·같은 상한으로 재투자한다 (Fair Progression: 같은 규칙)
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
function teamHomeSite(w: World): SiteId {
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

/** n번째(2~4번째) 발굴단 슬롯 해금(spec.md §8.1) */
export function unlockTeamSlot(w: World): boolean {
  if (w.maxTeams >= MAX_EXPEDITION_TEAMS_CAP) return false;
  const n = w.maxTeams + 1;
  const cost = EXPEDITION_TEAM_UNLOCK_BASE * Math.pow(EXPEDITION_TEAM_UNLOCK_GROWTH, n - 2);
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
    dispatchedAt: w.t, arrivesAt: w.t, returnsAt: w.t, mishapRolled: false, routine: null
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
export function dispatchExpedition(w: World, teamId: string, target: SiteId): boolean {
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
  team.dispatchedAt = w.t;
  team.arrivesAt = w.t + travel * 3600;
  team.returnsAt = team.arrivesAt + onsite * 3600 + travel * 3600;
  team.mishapRolled = mishap;
  log(w, "system", `발굴단이 ${SITE_BY_ID[target].name}(으)로 출발했다.`);
  return true;
}

/** 루틴(spec.md §8.4) — "어디로 갈지"는 대행하지 않는다. 이미 한 번 수동으로
 *  보낸 target을 계속 반복할지만 자동화한다 */
export function setRoutine(w: World, teamId: string, enabled: boolean, target?: SiteId): boolean {
  const team = w.teams.find((t) => t.id === teamId);
  if (!team) return false;
  team.routine = enabled ? { enabled: true, target: target ?? team.targetSite } : null;
  return true;
}

/**
 * 원정 귀환 정산(spec.md §8.3, G27/B5) — 원정비는 후불 원천징수다. "원정 기대소득"
 * 노셔널 공식(world-map.md §3)으로 그 원정의 실현소득을 사이징하고, 그 비율만큼
 * funds에서 뗀다. 실제 드랍·자금은 이미 applyDigProgress가 온사이트 구간마다
 * 실시간으로 처리했다 — 이 함수는 오직 "원정비 정산 + 루틴 재파견"만 한다.
 */
function finalizeExpedition(w: World, team: ExpeditionTeam) {
  const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
  const travelHours = (team.arrivesAt - team.dispatchedAt) / 3600;
  const dist = foreman ? travelHours * EXPEDITION_SPEED_KMH * foremanSpeedMult(foreman.navigation) : 0;
  const window = onsiteWindow(team);
  const onsiteHours = Math.max(0, (window.end - window.start) / 3600);
  const mishapEff = team.mishapRolled ? 1 - EXPEDITION_MISHAP_TIME_LOSS_RATIO : 1;
  const effectiveOnsiteHours = onsiteHours * mishapEff;

  const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
  const layer = w.sites[team.targetSite].layer;
  const bonus = (1 + DEPTH_INCOME_BONUS * (layer - 1)) * distanceYieldBonus(dist);
  const notionalIncome =
    ((d * PROGRESS_VALUE * bonus) / SITE_BY_ID[team.targetSite].dropMod) * effectiveOnsiteHours * 3600;
  const cost = Math.round(notionalIncome * EXPEDITION_COST_INCOME_RATIO * distanceCostMult(dist));
  w.funds -= cost;
  log(w, "system", `발굴단이 ${SITE_BY_ID[team.targetSite].name}에서 귀환했다. 원정비 ${cost.toLocaleString("ko-KR")}₩ 정산.`);

  team.status = "idle";
  if (team.routine?.enabled) dispatchExpedition(w, team.id, team.routine.target);
}

/**
 * 매 스텝 팀별 현지작업 구간과 world.t 절대 구간의 겹침을 계산해 진척을 적용하고,
 * returnsAt을 지나면 귀환 정산한다. **스텝 크기와 무관해야 한다** — 상태 문자열이
 * 아니라 (arrivesAt, returnsAt) 타임스탬프와 실제 겹침 구간으로만 계산하므로,
 * 1초씩 쪼개 부르든 한 번에 크게 부르든 같은 총 진척이 나온다(qa_expedition.ts).
 */
function tickExpeditions(
  w: World, t0: number, dt: number, eff: number, report: StepReport, contributions: Map<SiteId, SiteContributor[]>
) {
  for (const team of w.teams) {
    if (team.status === "idle") continue;
    const window = onsiteWindow(team);
    const overlap = Math.min(t0 + dt, window.end) - Math.max(t0, window.start);
    if (overlap > 0) {
      w.visitedSites[team.targetSite] = true;
      const foreman = w.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
      const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
      const mishapEff = team.mishapRolled ? 1 - EXPEDITION_MISHAP_TIME_LOSS_RATIO : 1;
      const effSeconds = overlap * eff * mishapEff;
      if (effSeconds > 0 && d > 0) {
        addSiteProgress(w, team.targetSite, effSeconds, d, report);
        pushContribution(contributions, team.targetSite, { d, diggerForemanId: team.foremanId });
      }
    }
    if (t0 < team.returnsAt && team.returnsAt <= t0 + dt) {
      finalizeExpedition(w, team);
    } else {
      team.status = t0 + dt < team.arrivesAt ? "traveling_out" : t0 + dt < window.end ? "on_site" : "traveling_back";
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

function runAppraisal(w: World, dt: number, report: StepReport) {
  if (w.pending.length === 0) return;
  const done: typeof w.pending = [];
  const keep: typeof w.pending = [];

  // 병렬 처리: 큐의 모든 항목이 동시에 감정된다. 감정소 레벨은 1점당 소요 시간을 줄인다.
  // 무료 감정권(appraisalVouchers, world-map.md §4 미탐사 보너스)이 있으면 수수료를
  // 면제한다 — 자금 게이트도 함께 풀린다(수수료가 0이 될 것이므로).
  for (const item of w.pending) {
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
    const value = tierValue(artifact.tier, artifact.valueFactor);
    report.appraised.push({ artifactId: artifact.id, tier: artifact.tier, value });
    // 감정 완료 = 지식 공개(③) — 이름·평가액이 확정되고 도감은 "owned"로 전이한다(§9.2·§13.3)
    w.codex[artifact.id] = "owned";

    if (autoSellEligible(w, artifact)) {
      w.funds += settleSale(w, artifact, value, item.diggerForemanId);
      w.stats.sold += 1;
    } else {
      w.vault.push({
        uid: nextUid(), artifactId: artifact.id, value,
        condition: CONDITION_INITIAL_BASE_BY_TIER[artifact.tier],
        diggerForemanId: item.diggerForemanId
      });
    }
  }
}

/**
 * 거점별 시세(world-map.md §8, G48/B3)를 반영한 최종 매각가에서 단장 급여
 * (staff.md §5, G29/B7 — 판매 시점 원천징수)까지 뗀 순수 입금액을 계산한다.
 * 직접매각·미감정매각·자동매각이 전부 이 경로를 공유한다.
 */
function settleSale(w: World, artifact: Artifact, baseValue: number, diggerForemanId?: string): number {
  const gross = Math.round(baseValue * bestLocalPriceMult(w, artifact.shape));
  if (!diggerForemanId) return gross;
  const foreman = w.staff.find((s) => s.id === diggerForemanId && s.role === "foreman") as Foreman | undefined;
  if (!foreman) return gross;
  return Math.round(gross - foremanSalary(gross, foreman));
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

function spawnTip(w: World, rng: Rng) {
  const pool = ARTIFACTS.filter((a) => {
    if (a.tier < 2) return false;
    if (!w.sites[a.site].unlocked) return false;
    if (!available(w, a)) return false;
    return a.minLayer <= w.sites[a.site].layer;
  });
  if (pool.length === 0) {
    w.nextTipIn = 30;
    return;
  }
  // 높은 티어를 강하게 선호한다 — 제보는 유일·국보가 주인공이다
  const weighted: Artifact[] = [];
  for (const a of pool) {
    const n = a.tier === 4 ? 12 : a.tier === 3 ? 5 : 1;
    for (let i = 0; i < n; i++) weighted.push(a);
  }
  const target = rng.pick(weighted);
  const rivalIds = w.rivals
    .filter((r) => r.favSite === target.site && r.layer >= target.minLayer)
    .map((r) => r.id);
  const chosen = rivalIds.slice(0, 1 + rng.int(0, 3));

  w.tip = {
    artifactId: target.id,
    site: target.site,
    layer: target.minLayer,
    remain: rng.range(TIP_DURATION_MIN, TIP_DURATION_MAX),
    rivals: chosen
  };
  log(w, "system", `제보 — ${SITE_BY_ID[target.site].name} ${target.minLayer}층에서 반응. 대상: ${target.name}`);
}

function updateCatchup(w: World) {
  const rows = ranking(w);
  const leader = Math.max(rows[0].assets, 1);
  for (const r of w.rivals) {
    const own = Math.max(r.vaultValue, 1);
    r.catchup = Math.min(CATCHUP_MAX, 1 + CATCHUP_SLOPE * Math.log10(leader / own));
  }
}

function checkEnding(w: World) {
  if (w.ended) return;
  const { owned, total } = codexProgress(w);
  if (owned / total < CODEX_GOAL) return;
  if (ranking(w)[0].id !== "player") return;
  w.ended = true;
  log(w, "system", "도감을 채우고 자산 1위에 올랐다. 유물왕.");
}

const emptyReport = (): StepReport => ({ drops: [], appraised: [], lost: [], won: [], layerUps: 0 });

/** dt 초만큼 세계를 전진시킨다. offline=true 면 효율 60% + 라이벌 상위 티어 차단 */
export function step(w: World, dt: number, offline = false): StepReport {
  const report = emptyReport();
  if (dt <= 0) return report;
  const rng = new Rng(w.rngState);
  const eff = offline ? OFFLINE_EFFICIENCY : 1;
  const t0 = w.t;

  w.t += dt;
  // 레거시 단독 발굴과 발굴단은 같은 거점을 노리면 SiteProgress를 공유한다
  // (spec.md §8.2 "Σ D_team") — 진척은 기여자별로 따로 더하되, 드랍 판정은
  // 거점당 한 번만(귀속은 발굴력 비중 가중 추첨) 하기 위해 기여자를 먼저
  // 모으고 그다음 거점별로 한 번씩 드랍을 소진한다(addSiteProgress 주석 참조).
  const contributions = new Map<SiteId, SiteContributor[]>();
  digPlayer(w, dt, eff, report, contributions);
  tickExpeditions(w, t0, dt, eff, report, contributions);
  for (const [site, contributors] of contributions) drainSiteDrops(w, rng, site, contributors, report);
  for (const r of w.rivals) digRival(w, r, rng, dt, eff, report);
  runAppraisal(w, dt, report);
  promoteStaffTick(w, t0, dt);

  if (!offline) {
    if (w.tip) {
      w.tip.remain -= dt;
      if (w.tip.remain <= 0) {
        const expired = ARTIFACT_BY_ID[w.tip.artifactId].name;
        log(w, "system", `제보가 만료됐다. '${expired}'${josa(expired, "은는")} 아직 세상에 남아 있다.`);
        w.tip = null;
        w.nextTipIn = rng.range(TIP_MEAN_INTERVAL * 0.5, TIP_MEAN_INTERVAL * 1.5);
      }
    } else {
      w.nextTipIn -= dt;
      if (w.nextTipIn <= 0) spawnTip(w, rng);
    }
  }

  updateCatchup(w);
  checkEnding(w);
  w.rngState = rng.state;
  return report;
}

/** 큰 dt 를 고정 스텝으로 쪼개 적분한다. 오프라인 복귀와 시뮬이 같은 경로를 탄다 */
export function advance(w: World, seconds: number, offline = false, stepSize = 1): StepReport {
  const total = emptyReport();
  let left = Math.max(0, seconds);
  let guard = 0;
  while (left > 1e-6 && guard++ < 200_000) {
    const dt = Math.min(stepSize, left);
    const r = step(w, dt, offline);
    total.drops.push(...r.drops);
    total.appraised.push(...r.appraised);
    total.lost.push(...r.lost);
    total.won.push(...r.won);
    total.layerUps += r.layerUps;
    left -= dt;
  }
  return total;
}

export function applyOffline(w: World, nowMs = Date.now()): { seconds: number; report: StepReport } | null {
  const raw = (nowMs - w.lastTickAt) / 1000;
  w.lastTickAt = nowMs;
  if (raw < 60) return null;
  const seconds = Math.min(raw, OFFLINE_CAP_SECONDS);
  const report = advance(w, seconds, true, 10);
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
  if (ownedCount >= MAX_OWNED_SITES) return false;
  w.funds -= def.unlockCost;
  w.sites[site].unlocked = true;
  w.sites[site].baseSince = w.t;
  w.visitedSites[site] = true;
  w.activeSite = site;
  log(w, "system", `${def.name} — ${def.anchor} 발굴을 시작했다.`);
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
  log(w, "system", `본거지를 ${SITE_BY_ID[newSite].name}(으)로 옮겼다.`);
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
  const artifact = ARTIFACT_BY_ID[item.artifactId];
  w.funds += settleSale(w, artifact, Math.round(item.estimate * BLIND_SELL_RATE), item.diggerForemanId);
  w.stats.blindSold += 1;
  demoteIfEmptied(w, item.artifactId);
  return true;
}

export function blindSellAll(w: World): number {
  let gained = 0;
  const ids = new Set<string>();
  for (const item of w.pending) {
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    gained += settleSale(w, artifact, Math.round(item.estimate * BLIND_SELL_RATE), item.diggerForemanId);
    w.stats.blindSold += 1;
    ids.add(item.artifactId);
  }
  w.pending = [];
  w.funds += gained;
  for (const id of ids) demoteIfEmptied(w, id);
  return gained;
}

/** 같은 유물의 사본을 n점 판다. 소장고가 유물 종류별로 묶여 있으므로 이 단위가 필요하다 */
export function sellArtifactCopies(w: World, artifactId: string, count: number): number {
  let gained = 0;
  let left = count;
  const keep: typeof w.vault = [];
  for (const item of w.vault) {
    if (left > 0 && item.artifactId === artifactId) {
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

export function sellTierAtMost(w: World, tier: Tier): number {
  let gained = 0;
  const keep: typeof w.vault = [];
  const soldIds = new Set<string>();
  for (const item of w.vault) {
    if (ARTIFACT_BY_ID[item.artifactId].tier <= tier) {
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

  // 3. 시설 초기화 — 위 함수 주석 참조
  w.lab = 1;
  w.workers = 0;
  w.gear = 0;

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
