/**
 * 방치 플레이 정책 — `sim/run.ts`(밸런스 시뮬)와 `sim/playlog.ts`(플레이 계측)가
 * **같은 정책**을 타야 두 측정이 같은 게임을 말한다. 예전엔 `run.ts` 안에만
 * 있었고, 계측을 붙이려면 복사하거나 `run.ts`를 import 해야 했는데(그 파일은
 * 최상단에서 `main()`을 부른다) 둘 다 로직을 갈라지게 만든다. 그래서 정책만
 * 여기로 떼어 냈다 — 동작은 한 줄도 바뀌지 않았다.
 *
 * 클릭 0회(척추 4번)가 전제다. 매 틱:
 * 1) 안전판(vault 잉여 직접매각) → 2) base 확장 → 3) 발굴단 파견·재배정 →
 * 4) 시설 건립(보관소·박물관·경매장·스텝).
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import {
  AUTO_SELL_SPARE_MAX_TIER, CODEX_GOAL_V2, EXPEDITION_TEAM_UNLOCK_BASE, EXPEDITION_TEAM_UNLOCK_GROWTH, MAX_EXPEDITION_TEAMS_CAP, SITES, auctionHouseBuildCost, auctionGradeCost, dropThreshold, humidityLevelCost, layerExpectedValue, marketingLevelCost, museumBuildCost, museumGradeCost, restorationLevelCost, securityLevelCost, vaultLevelCost, AUCTION_BACKLOG_FALLBACK_ITEMS
} from "../game/balance";
import {
  advance, auctionHouseOf, buildAuctionHouse, buildMuseum, buyHumidityLevel, buyMuseumMarketing, buyRestorationLevel, buySecurityLevel, buyTeamGear, buyTeamWorker, buyVaultLevel, codexScore, createTeam, digPower, dispatchExpedition, displayArtifact, hireAuctioneer, hireCurator, hireForeman, listAtAuction, museumOf, museumSlotCount, runAutoRoutine, sellArtifactCopies, switchSite, teamHomeSite, unlockSite, unlockTeamSlot, upgradeAuctionGrade, upgradeMuseumGrade, spareVaultItems } from "../game/engine";
import type { SiteId, World } from "../game/types";

export const STEP_EARLY = 2; // 초반 1200초(드랍 간격·20분 통계)는 v0.1과 동일한 정밀도를 유지한다
export const STEP_LATE = 15; // 12거점·발굴단·시설을 다 쓰는 장시간 시뮬은 성능을 위해 굵게 쪼갠다

/**
 * 12거점을 순회하는 발굴단 배정 순서(qa_endgame.ts와 같은 방식 — korea는 레거시
 * 단독 발굴이 이미 파고 있으니 발굴단은 egypt부터 채운다).
 */
const TOUR_ORDER: SiteId[] = [
  "korea", "egypt", "rome", "greece", "turkey", "israel", "india", "china", "iraq", "japan", "mexico", "peru"
];

/** 그 거점의 검증된 종을 전부 확보했는가(더 파도 도감이 안 는다는 뜻) */
export function siteCleared(w: World, site: SiteId): boolean {
  const species = ARTIFACTS.filter((a) => a.site === site && a.sourceStatus === "verified");
  if (species.length === 0) return true;
  return species.every((a) => w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified");
}

/** 그 거점의 도감 기여도(검증 종 중 아직 못 채운 비율, 0=전부 채움) */
export function siteCoverageGap(w: World, site: SiteId): number {
  const species = ARTIFACTS.filter((a) => a.site === site && a.sourceStatus === "verified");
  if (species.length === 0) return 0;
  const owned = species.filter((a) => w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified").length;
  return 1 - owned / species.length;
}

/**
 * 다음 파견 대상 — **미방문 거점을 항상 최우선**으로 고른다(마무리 패스,
 * notes/decisions.md G56). 이전엔 "한 거점을 다 채울 때까지" `routine`으로
 * 눌러앉혀 두었는데, 희귀·유일 티어는 실현까지 오래 걸려 팀 하나가 거점
 * 하나에 수백 시간씩 묶이고 나머지 7~8거점은 시즌 내내 미방문으로 남았다
 * (실측 — 672시간에 3팀으로도 5/12거점, 도감 34%에서 성장이 눈에 띄게
 * 둔화됐다). 미방문 거점을 전부 한 번씩 훑은 뒤에야 커버리지가 낮은 순으로
 * 되돌아간다 — 각 귀환마다 다시 계산하므로(아래 act()가 routine 없이 매번
 * 새로 호출한다) 팀이 한 거점에 눌러앉지 않는다.
 */
export function nextTarget(w: World): SiteId {
  const targeted = new Set(w.teams.filter((t) => t.status !== "idle").map((t) => t.targetSite));
  const open = TOUR_ORDER.filter((s) => !siteCleared(w, s) && !targeted.has(s));
  const pool = open.length > 0 ? open : TOUR_ORDER.filter((s) => !targeted.has(s));
  if (pool.length === 0) return TOUR_ORDER[0];
  const unvisited = pool.filter((s) => !w.visitedSites[s]);
  const rank = unvisited.length > 0 ? unvisited : pool;
  return [...rank].sort((a, b) => siteCoverageGap(w, b) - siteCoverageGap(w, a))[0];
}

/**
 * 확장 축(발굴단 슬롯·시설)의 사람 조작 사이 최소 간격(초, v0.6.6).
 *
 * 예전 정책은 문턱을 넘은 구매를 **한 틱에 전부** 눌렀다 — 첫 중복 배치 매각이 목돈을
 * 만드는 틱에 슬롯 해금·단장·보관소·습도·복원·보안·박물관·경매장·관장·경매관장이
 * 한꺼번에 열려(운영 기본 시드 38:30에 증강 포함 14건, 59:15에 박물관·경매장·관장·경매관장 4건
 * 동시, `notes/decision-tree-10h.md` §3) 각각의 첫 경험이 한 번에 뭉개졌고, 사람이
 * 실제로 그렇게 누르지도 않는다(탭을 옮겨 가며 한 번에 하나씩 고른다). 그래서 이
 * 두 축은 **합쳐서 1분에 한 건**만 누른다. 슬롯을 연 뒤 그 칸에 단장을 앉히는 것은
 * 같은 결정의 마무리라 이 간격을 타지 않는다.
 */
const EXPANSION_ACTION_GAP_SECONDS = 60;
const lastExpansionActionAt = new WeakMap<World, number>();
function expansionActionReady(w: World): boolean {
  const last = lastExpansionActionAt.get(w);
  return last === undefined || w.t - last >= EXPANSION_ACTION_GAP_SECONDS;
}

/** 발굴단 슬롯 해금 → 단장 고용 → 새 거점 파견까지 — 방치형 정책의 "발굴단 파견" 축 */
export function ensureTeams(w: World) {
  // 첫 박물관·첫 경매장을 지을 수 있는 틱이면 그쪽을 먼저 누르고 슬롯은 다음 분으로 미룬다 —
  // 둘 다 첫 중복 배치 매각의 목돈을 두고 다투는데, 슬롯을 먼저 열면 1분 뒤에는 자동
  // 증강이 그 돈을 이미 썼다(운영 12시드 첫 경매장 중앙 약 38분 → 47분으로 밀렸다).
  if (expansionActionReady(w) && !firstBuildReady(w, teamHomeSite(w))) {
    let unlocked = false;
    while (w.teams.length >= w.maxTeams && w.maxTeams < MAX_EXPEDITION_TEAMS_CAP) {
      if (!unlockTeamSlot(w)) break;
      unlocked = true;
    }
    if (unlocked) lastExpansionActionAt.set(w, w.t);
  }
  while (w.teams.length < Math.min(w.maxTeams, MAX_EXPEDITION_TEAMS_CAP)) {
    const home = teamHomeSite(w);
    let hired: string | null = null;
    for (let slot = 0; slot < 3 && !hired; slot++) hired = hireForeman(w, home, slot);
    if (!hired) break;
    const teamId = createTeam(w, hired);
    if (!teamId) break;
    dispatchExpedition(w, teamId, nextTarget(w));
  }
}

/** 유휴 상태인 팀을 매번 다시 계산한 다음 대상으로 재파견한다(위 nextTarget
 *  주석 참조 — 고정 routine 대신 귀환마다 새로 고른다) */
export function redispatchIdleTeams(w: World) {
  for (const team of w.teams) {
    if (team.status === "idle") dispatchExpedition(w, team.id, nextTarget(w));
  }
}

/** 전시 슬롯 빈 자리를 미전시 유물 중 티어가 높은 순으로 채운다(명성 축의
 *  관람객 항이 RARITY_WEIGHT로 고티어를 크게 우대한다, museum.ts) */
export function fillMuseumSlots(w: World, site: SiteId) {
  const slotCount = museumSlotCount(w, site);
  const taken = new Set(w.vault.filter((v) => v.displayed && v.museumSite === site).map((v) => v.slot));
  const candidates = w.vault
    .filter((v) => !v.displayed)
    .sort((a, b) => ARTIFACT_BY_ID[b.artifactId].tier - ARTIFACT_BY_ID[a.artifactId].tier);
  let ci = 0;
  for (let slot = 0; slot < slotCount; slot++) {
    if (taken.has(slot)) continue;
    while (ci < candidates.length) {
      const item = candidates[ci++];
      if (displayArtifact(w, item.uid, site, slot)) break;
    }
  }
}

/**
 * T0~T1 잉여(종당 2점 이상)를 직접 매각해 즉시 유동성을 만든다. 마지막 1점은
 * 항상 남긴다 — `sellTierAtMost(w, tier)`를 그냥 쓰면 그 종의 **마지막 1점까지**
 * 팔아 CodexState가 "owned"에서 "discovered_not_owned"로 떨어진다(spec.md §13.3)
 * — 도감 축이 오르내리며 요동치는 걸 실측으로 확인했다(마무리 패스,
 * notes/decisions.md G56). 도감이 이 정책의 핵심 병목이라 이 요동을 없앤다.
 */
export function liquidateSurplus(w: World) {
  const counts = new Map<string, number>();
  for (const v of w.vault) {
    if (v.displayed) continue;
    counts.set(v.artifactId, (counts.get(v.artifactId) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    if (ARTIFACT_BY_ID[id].tier > 1 || count <= 1) continue;
    sellArtifactCopies(w, id, count - 1);
  }
}

/**
 * 첫 경매장을 지을 **동기**(v0.6.6, `notes/decision-tree-10h.md` P6) — 소장고에 중복이
 * 이만큼 쌓인 것을 한 번이라도 본 뒤에 짓는다. "팔 곳이 필요하다"는 중복이 눈에 띄게
 * 쌓일 때 생기고, 이 값은 자동 정리가 한 번에 치우는 문턱(`AUTO_SELL_SPARE_BATCH_MIN`
 * = 20점)의 3/4이다. 이 문턱이 없으면 건립비가 싸진 첫 경매장이 박물관과 몇 분
 * 간격으로 붙어 열린다 — 두 첫 경험을 떼어 놓으려는 목적이 도로 무너진다.
 */
const AUCTION_MOTIVE_SPARES = 15;
const auctionMotiveSeen = new WeakSet<World>();

/** 보관소·습도·복원·보안·박물관·경매장 — "시설 건립" 축. 급하지 않은 지출이라
 *  발굴단·레거시 확장보다 뒤에 붙되, 1분에 한 건씩 흘려 넣는다
 *  (`EXPANSION_ACTION_GAP_SECONDS` 주석). */
export function ensureFacilities(w: World) {
  const home = teamHomeSite(w);
  if (spareVaultItems(w, w.settings.autoSellSpareBelow).length >= AUCTION_MOTIVE_SPARES) auctionMotiveSeen.add(w);
  if (expansionActionReady(w) && facilityAction(w, home)) lastExpansionActionAt.set(w, w.t);
  /**
   * **무료 "등급0 임시 전시대"(1슬롯)도 채운다**(v0.6). 예전엔 이 호출이
   * `if (m)` 안에 있어서 **진짜 박물관을 짓기 전까지 전시가 한 번도 일어나지
   * 않았다** — `brief.md` §첫 세션 9가 "20분 목표는 이 무료 슬롯으로 닿는다"고
   * 적어 둔 바로 그 동작이 시뮬 정책에만 빠져 있었다(`pnpm play`의 UI 실조작은
   * 77초에 이걸 눌러 왔다). 기준을 낮추지 않고 **사람이 실제로 마주하는 조작을
   * 정책에 넣어 다시 잰다**(`notes/decisions.md` G80.2).
   */
  fillMuseumSlots(w, home);

  const house = auctionHouseOf(w, home);
  if (house) {
    /**
     * 경매장이 생기면 **중복분 자동 정리를 경매로 한 번 설정하고 손을 뗀다**(v0.3.4).
     *
     * 예전엔 이 자리에서 `listSparesAtAuction(w, house)`가 매 틱 돌며 한 점씩 직접
     * 출품했다 — 계측에서 그게 168시간 동안 **189회, 플레이어 조작의 64%**로 나왔다
     * (`notes/play-telemetry.md` §2.1). 사람이 실제로 그렇게 논다면 3단계짜리 조작을
     * 189번 반복한다는 뜻이다. 이제 같은 일을 설정 두 번으로 끝낸다.
     */
    if (w.settings.autoSellSpareBelow === null) w.settings.autoSellSpareBelow = AUTO_SELL_SPARE_MAX_TIER;
    /**
     * **출구가 막히면 직접매각으로 되돌린다**(v0.6.4, G96). "경매로 보내라"를 한 번
     * 설정하고 손을 떼는 것까지는 맞는데, 경매 슬롯이 적체를 못 따라가면 중복이
     * 소장고에 그대로 쌓인다 — 실측에서 운영 기준선의 소장고 2,125점 중 **1,131점이
     * 경매 대기**였고, 그게 정원 초과의 최대 원인이었다. 사람이라면 그 상태를 보고
     * 직접 팔거나 경매장을 늘린다. 이 정책은 "사람이 눌렀어야 할 것을 전부 눌러 준
     * 기준선"이므로 그 판단을 여기에 넣는다(§28.8이 지적한 기준선 충실도 문제와 같은 부류).
     */
    const waiting = spareVaultItems(w, w.settings.autoSellSpareBelow).length;
    w.settings.spareDestination = waiting > AUCTION_BACKLOG_FALLBACK_ITEMS ? "sell" : "auction";
  }
}

/** 첫 박물관을 지을 때인가 — 비용의 2배가 모였다 */
function museumBuildReady(w: World, home: SiteId): boolean {
  return museumOf(w, home).grade === 0 && w.funds >= museumBuildCost(w.museums.length + 1) * 2;
}
/** 첫 경매장을 지을 때인가 — 중복이 쌓이는 것을 봤고(`AUCTION_MOTIVE_SPARES`) 비용의 2배가 모였다 */
function auctionBuildReady(w: World): boolean {
  return w.auctionHouses.length === 0 && auctionMotiveSeen.has(w) && w.funds >= auctionHouseBuildCost(1) * 2;
}
function firstBuildReady(w: World, home: SiteId): boolean {
  return museumBuildReady(w, home) || auctionBuildReady(w);
}

/**
 * 시설 축에서 **지금 누를 한 건**을 누른다. 문턱은 v0.6.5 정책 그대로다(건립은
 * 비용의 2배, 증설은 3배, 관장·경매관장은 자금 40만 달러). 눌렀으면 true.
 */
function facilityAction(w: World, home: SiteId): boolean {
  // 1) 건립 — 박물관·경매장이 각자의 순간에 열린다(첫 건립비는 balance.ts
  //    `MUSEUM_FIRST_BUILD_COST`·`AUCTION_HOUSE_FIRST_BUILD_COST`, 경매장 동기는
  //    위 `AUCTION_MOTIVE_SPARES`)
  if (museumBuildReady(w, home) && buildMuseum(w, home)) return true;
  if (auctionBuildReady(w) && buildAuctionHouse(w, home)) return true;
  // 2) 고용
  const m = w.museums.find((mm) => mm.site === home);
  if (m && !m.curatorId && w.funds >= 400_000) {
    for (let slot = 0; slot < 3; slot++) if (hireCurator(w, home, slot)) return true;
  }
  const house = auctionHouseOf(w, home);
  if (house && !house.auctioneerId && w.funds >= 400_000) {
    for (let slot = 0; slot < 3; slot++) if (hireAuctioneer(w, home, slot)) return true;
  }
  // 3) 증설
  if (w.vaultLevel < 6 && w.funds >= vaultLevelCost(w.vaultLevel) * 3 && buyVaultLevel(w)) return true;
  if (w.humidityLevel < 5 && w.funds >= humidityLevelCost(w.humidityLevel) * 3 && buyHumidityLevel(w)) return true;
  if (w.restorationLevel < 4 && w.funds >= restorationLevelCost(w.restorationLevel) * 3 && buyRestorationLevel(w)) return true;
  if (w.securityLevel < 4 && w.funds >= securityLevelCost(w.securityLevel) * 3 && buySecurityLevel(w)) return true;
  if (m) {
    if (m.grade < 4 && w.funds >= museumGradeCost(m.grade) * 3 && upgradeMuseumGrade(w, home)) return true;
    if (w.funds >= marketingLevelCost(m.marketingLevel) * 3 && buyMuseumMarketing(w, home)) return true;
  }
  if (house && house.grade < 4 && w.funds >= auctionGradeCost(house.grade) * 3 && upgradeAuctionGrade(w, home)) return true;
  return false;
}

export function bestSite(w: World): SiteId {
  // 새로 연 base를 10층까지 키운 뒤, 초당 기대 수입이 가장 높은 곳을 판다(레거시 단독 발굴용).
  const unlocked = SITES.filter((s) => w.sites[s.id].unlocked);
  const young = unlocked.find((s) => w.sites[s.id].layer < 10 && s.id !== "korea");
  if (young) return young.id;
  let best = unlocked[0].id;
  let bestRate = -1;
  const d = digPower(w);
  for (const s of unlocked) {
    const sp = w.sites[s.id];
    const rate = layerExpectedValue(s.id, sp.layer) / dropThreshold(s.id, sp.layer, d);
    if (rate > bestRate) {
      bestRate = rate;
      best = s.id;
    }
  }
  return best;
}

/**
 * 방치 정책 — 클릭 0회(척추 4번). 매 틱:
 * 1) 안전판(vault 잉여 직접매각) — 종당 1점을 남기고 파는 vault 정리로,
 *    아래 2)~5)가 쓸 유동성을 만든다.
 * 2) base 확장(최대 3) — 레거시 단독 발굴의 무대.
 * 3) 발굴단 파견·재배정 — 12거점 전역 도감 커버리지를 만드는 핵심 축.
 * 4) 시설 건립(보관소·박물관·경매장·스텝) — 자산·명성 축과 환금을 돕는다.
 *
 * **미감정 적체 시 블라인드 매각·레거시 단독 발굴 업그레이드(감정소·장비·
 * 인부)는 더 이상 이 정책이 직접 구현하지 않는다** — `engine.ts`의
 * `runAutoRoutine`(엔진 기본 자동화, notes/decisions.md G57 — 결함 수정
 * 패스)을 그대로 가져다 쓴다. 전에는 이게 없으면 자금이 막혀 감정비를 못
 * 내는 교착이 생겼는데(G56 실측), 그건 "sim 정책만 아는 요령"이었다 — 실제
 * 브라우저에서 클릭 0회로 방치하는 진짜 플레이어는 이 정책을 실행하지
 * 않으므로 똑같이 교착에 걸렸다(사람 스크린샷 8시간 방치 실측).
 * `runAutoRoutine`은 **`advance()`가 자동으로 불러주지 않는다** — 그 안에서
 * 부르면 잉여 처분·재투자 둘 다 지수 비용 곡선·다건 매각의 "문턱" 판단이라
 * 오프라인 적분 스텝 무관성(`qa_expedition.ts`)을 깬다는 게 실측으로
 * 확인됐다(engine.ts의 `applyOffline` 주석 참조). sim은 원래부터 자체
 * 정책이 매 틱 이 자리에서 큐 정리·인부·장비·감정소를 직접 사 왔으므로,
 * 같은 함수를 그대로 가져다 쓰는 게 로직 중복 없이 자연스럽다.
 */
export function act(w: World) {
  liquidateSurplus(w);
  runAutoRoutine(w);
  actExpansion(w);
}

/**
 * `act()`에서 **게임의 기본 자동화**(`runAutoRoutine`)와 **소장고 잉여 정리**를
 * 뺀 나머지 — 거점 확장·발굴단 운영·시설 건립. 전부 사람이 화면에서 직접
 * 눌러야 하는 것들이다.
 *
 * 따로 뽑아 둔 이유는 `sim/playlog.ts`가 "이 이벤트는 게임이 해 준 것인가,
 * 사람이 눌렀어야 하는 것인가"를 나눠 세기 때문이다. 한 덩어리로 두면 자동
 * 재투자(인부·장비 구매)까지 사람 몫으로 잘못 계상된다 — 실제로 첫 계측에서
 * 2시간에 44회를 사람 조작으로 잘못 세었다.
 */
export function actExpansion(w: World) {
  for (const s of SITES) {
    if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  }

  const tip = w.tip;
  if (tip && w.sites[tip.site].unlocked && w.sites[tip.site].layer >= tip.layer) switchSite(w, tip.site);
  else switchSite(w, bestSite(w));

  ensureTeams(w);
  redispatchIdleTeams(w);
  // 발굴단 인원·장비 증강은 v0.6.6부터 **게임이** 한다(`engine.ts`
  // `autoInvestTeams`, 자동 재투자). 여기 있던 수동 루프(다음 슬롯 해금비 ×1.5
  // 비축 · 인원 25만 · 장비 250만)를 문턱째 그대로 엔진으로 옮겼다 — 첫 10시간
  // 사람 조작의 59%가 이 루프였다(notes/decisions.md G80.1).
  ensureFacilities(w);
}

