/**
 * 헤드리스 밸런스 시뮬레이터.
 *
 *   pnpm --filter relic-king sim            요약
 *   pnpm --filter relic-king sim -- --hours 3
 *
 * UI 없이 엔진만 돌려 eval.md 의 밸런스·불변식 기준을 측정한다.
 * 클릭 0회(방치 기준선)가 기본이다 — 척추 4번.
 *
 * **마무리 패스(notes/decisions.md G56)**: 이전까지 이 기준선은 v0.1 정책
 * (레거시 단독 발굴만, `w.activeSite` 하나)을 그대로 썼다 — 발굴단(`w.teams`)·
 * 12거점·시설(박물관·경매장·보관소)을 전혀 쓰지 않았다. `MAX_OWNED_SITES=3`
 * (base 슬롯)에 묶여 신규 9거점의 효과가 이 기준선에는 전혀 보이지 않았다
 * (eval.md §13.3(a) 참조 — 도감이 24h 만에 멈췄다). 이번 패스가 정책을
 * "발굴단 파견·거점 확장·시설 건립·스텝 고용을 포함한 합리적인 방치 플레이어"로
 * 교체해, v0.2 시스템이 실제로 쓰이는 기준선으로 만든다. 그리고 이 정책으로
 * v0.2 엔딩(spec.md §13.2, RANK_SCORE 종합 1위 + CODEX_SCORE≥CODEX_GOAL_V2를
 * 1시간 연속 유지)에 실제로 도달하는지 측정한다 — 척추 4번(클릭 0회 완주)의
 * 직접 증거다.
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import {
  AUCTION_SLOT_CAP_BY_GRADE, CODEX_GOAL_V2, EXPEDITION_TEAM_UNLOCK_BASE, EXPEDITION_TEAM_UNLOCK_GROWTH,
  LAYERS_PER_SITE, MAX_EXPEDITION_TEAMS_CAP, RANK_WEIGHT, SITES, SITE_BY_ID,
  auctionHouseBuildCost, auctionGradeCost, dropThreshold, humidityLevelCost,
  layerCost, layerExpectedValue, marketingLevelCost, museumBuildCost, museumGradeCost,
  restorationLevelCost, securityLevelCost, vaultLevelCost
} from "../game/balance";
import {
  advance, assetScore, auctionHouseOf, buildAuctionHouse, buildMuseum,
  buyHumidityLevel, buyMuseumMarketing, buyRestorationLevel, buySecurityLevel, buyTeamGear,
  buyTeamWorker, buyVaultLevel, click, codexProgress, codexScore, createPersistentRecord,
  createTeam, createWorld, digPower, dispatchExpedition, displayArtifact, fameScore, fullRanking,
  hireAuctioneer, hireCurator, hireForeman, listAtAuction, museumOf, museumSlotCount, playerAssets,
  ranking, rankScore, runAutoRoutine, sellArtifactCopies, staffMarketCycle, switchSite, teamHomeSite,
  unlockSite, unlockTeamSlot, upgradeAuctionGrade, upgradeMuseumGrade
} from "../game/engine";
import { duration, won } from "../game/format";
import { auctioneerSlotBonus } from "../game/staff";
import type { AuctionHouse, Auctioneer, PersistentRecord, SiteId, World } from "../game/types";

const STEP_EARLY = 2; // 초반 1200초(드랍 간격·20분 통계)는 v0.1과 동일한 정밀도를 유지한다
const STEP_LATE = 15; // 12거점·발굴단·시설을 다 쓰는 장시간 시뮬은 성능을 위해 굵게 쪼갠다

/**
 * 12거점을 순회하는 발굴단 배정 순서(qa_endgame.ts와 같은 방식 — korea는 레거시
 * 단독 발굴이 이미 파고 있으니 발굴단은 egypt부터 채운다).
 */
const TOUR_ORDER: SiteId[] = [
  "korea", "egypt", "rome", "greece", "turkey", "israel", "india", "china", "iraq", "japan", "mexico", "peru"
];

/** 그 거점의 검증된 종을 전부 확보했는가(더 파도 도감이 안 는다는 뜻) */
function siteCleared(w: World, site: SiteId): boolean {
  const species = ARTIFACTS.filter((a) => a.site === site && a.sourceStatus === "verified");
  if (species.length === 0) return true;
  return species.every((a) => w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified");
}

/** 그 거점의 도감 기여도(검증 종 중 아직 못 채운 비율, 0=전부 채움) */
function siteCoverageGap(w: World, site: SiteId): number {
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
function nextTarget(w: World): SiteId {
  const targeted = new Set(w.teams.filter((t) => t.status !== "idle").map((t) => t.targetSite));
  const open = TOUR_ORDER.filter((s) => !siteCleared(w, s) && !targeted.has(s));
  const pool = open.length > 0 ? open : TOUR_ORDER.filter((s) => !targeted.has(s));
  if (pool.length === 0) return TOUR_ORDER[0];
  const unvisited = pool.filter((s) => !w.visitedSites[s]);
  const rank = unvisited.length > 0 ? unvisited : pool;
  return [...rank].sort((a, b) => siteCoverageGap(w, b) - siteCoverageGap(w, a))[0];
}

/** 발굴단 슬롯 해금 → 단장 고용 → 새 거점 파견까지 — 방치형 정책의 "발굴단 파견" 축 */
function ensureTeams(w: World) {
  while (w.teams.length >= w.maxTeams && w.maxTeams < MAX_EXPEDITION_TEAMS_CAP) {
    if (!unlockTeamSlot(w)) break;
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
function redispatchIdleTeams(w: World) {
  for (const team of w.teams) {
    if (team.status === "idle") dispatchExpedition(w, team.id, nextTarget(w));
  }
}

/** 전시 슬롯 빈 자리를 미전시 유물 중 티어가 높은 순으로 채운다(명성 축의
 *  관람객 항이 RARITY_WEIGHT로 고티어를 크게 우대한다, museum.ts) */
function fillMuseumSlots(w: World, site: SiteId) {
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
function liquidateSurplus(w: World) {
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

/** 종당 2점 이상 보유한 T0~T2 잉여를 경매에 돌린다(자산 축은 이미 쉽게 포화되므로
 *  환금해 발굴단·시설 확장에 재투자하는 쪽이 낫다) */
function listSparesAtAuction(w: World, house: AuctionHouse) {
  const auctioneer = w.staff.find((s) => s.id === house.auctioneerId && s.role === "auctioneer") as
    | Auctioneer
    | undefined;
  const slotCap = auctioneer
    ? auctioneerSlotBonus(house.grade, auctioneer.logistics)
    : AUCTION_SLOT_CAP_BY_GRADE[house.grade - 1];
  if (house.listings.length >= slotCap) return;
  const counts = new Map<string, number>();
  for (const v of w.vault) counts.set(v.artifactId, (counts.get(v.artifactId) ?? 0) + 1);
  for (const item of w.vault) {
    if (house.listings.length >= slotCap) break;
    if (item.displayed) continue;
    if (ARTIFACT_BY_ID[item.artifactId].tier > 2) continue;
    if ((counts.get(item.artifactId) ?? 0) <= 1) continue;
    listAtAuction(w, item.uid, house.site);
  }
}

/** 보관소·습도·복원·보안·박물관·경매장 — "시설 건립" 축. 급하지 않은 지출이라
 *  발굴단·레거시 확장보다 뒤에 붙되, 매 틱 조금씩 흘려 넣는다. */
function ensureFacilities(w: World) {
  const home = teamHomeSite(w);

  if (w.vaultLevel < 6 && w.funds >= vaultLevelCost(w.vaultLevel) * 3) buyVaultLevel(w);
  if (w.humidityLevel < 5 && w.funds >= humidityLevelCost(w.humidityLevel) * 3) buyHumidityLevel(w);
  if (w.restorationLevel < 4 && w.funds >= restorationLevelCost(w.restorationLevel) * 3) buyRestorationLevel(w);
  if (w.securityLevel < 4 && w.funds >= securityLevelCost(w.securityLevel) * 3) buySecurityLevel(w);

  const museum = museumOf(w, home);
  if (museum.grade === 0 && w.funds >= museumBuildCost(w.museums.length + 1) * 2) buildMuseum(w, home);
  const m = w.museums.find((mm) => mm.site === home);
  if (m) {
    if (m.grade < 4 && w.funds >= museumGradeCost(m.grade) * 3) upgradeMuseumGrade(w, home);
    if (w.funds >= marketingLevelCost(m.marketingLevel) * 3) buyMuseumMarketing(w, home);
    if (!m.curatorId && w.funds >= 400_000) {
      for (let slot = 0; slot < 3; slot++) if (hireCurator(w, home, slot)) break;
    }
    fillMuseumSlots(w, home);
  }

  if (w.auctionHouses.length === 0 && w.funds >= auctionHouseBuildCost(1) * 2) buildAuctionHouse(w, home);
  const house = auctionHouseOf(w, home);
  if (house) {
    if (house.grade < 4 && w.funds >= auctionGradeCost(house.grade) * 3) upgradeAuctionGrade(w, home);
    if (!house.auctioneerId && w.funds >= 400_000) {
      for (let slot = 0; slot < 3; slot++) if (hireAuctioneer(w, home, slot)) break;
    }
    listSparesAtAuction(w, house);
  }
}

function bestSite(w: World): SiteId {
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
function act(w: World) {
  liquidateSurplus(w);
  runAutoRoutine(w);

  for (const s of SITES) {
    if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  }

  const tip = w.tip;
  if (tip && w.sites[tip.site].unlocked && w.sites[tip.site].layer >= tip.layer) switchSite(w, tip.site);
  else switchSite(w, bestSite(w));

  ensureTeams(w);
  redispatchIdleTeams(w);
  // 다음 발굴단 슬롯 해금 비용의 1.5배를 먼저 비축한다 — 그 전까지는 팀
  // 인원·장비 증강을 미룬다. 팀 발굴력을 계속 올리면 원정비(노셔널 수입 비례)도
  // 같이 커져 "슬롯 하나를 더 늘려 12거점 커버리지를 넓히는" 더 나은 투자로
  // 갈 자금이 한 팀의 점증 업그레이드에 계속 흡수돼 버린다(마무리 패스 실측 —
  // 48시간이든 336시간이든 팀이 1개에서 멈췄다, notes/decisions.md G56).
  const nextSlotCost =
    w.maxTeams < MAX_EXPEDITION_TEAMS_CAP
      ? EXPEDITION_TEAM_UNLOCK_BASE * Math.pow(EXPEDITION_TEAM_UNLOCK_GROWTH, w.maxTeams - 1)
      : 0;
  const teamUpgradesOk = w.funds >= nextSlotCost * 1.5;
  for (const team of w.teams) {
    if (teamUpgradesOk && w.funds >= 250_000) buyTeamWorker(w, team.id);
    if (teamUpgradesOk && w.funds >= 2_500_000) buyTeamGear(w, team.id);
  }

  ensureFacilities(w);
}

function ledgerOk(w: World): string | null {
  for (const a of ARTIFACTS) {
    const e = w.ledger[a.id];
    if (e.total === Infinity) continue;
    if (e.owners.length + e.remaining !== e.total) {
      return `${a.id}: owners ${e.owners.length} + remaining ${e.remaining} != total ${e.total}`;
    }
    if (a.tier === 4 && e.owners.length > 1) return `${a.id}: 유일 유물이 ${e.owners.length}명에게 있다`;
  }
  return null;
}

function run(hours: number) {
  const w = createWorld();
  const record: PersistentRecord = createPersistentRecord();
  const marks: Record<string, number | null> = {
    firstDrop: null, egypt: null, rome: null, deep12: null, firstT3: null, firstT4: null, ending: null
  };
  let dropTimesFirst20: number[] = [];
  let peakFunds = 0;

  const totalSeconds = hours * 3600;
  let t = 0;
  while (t < totalSeconds) {
    const stepNow = t < 1200 ? STEP_EARLY : STEP_LATE;
    act(w);
    const report = advance(w, stepNow, false, stepNow, record);
    t += stepNow;

    for (const _d of report.drops) {
      if (marks.firstDrop === null) marks.firstDrop = w.t;
      if (w.t <= 1200) dropTimesFirst20.push(w.t);
    }
    for (const a of report.appraised) {
      if (a.tier === 3 && marks.firstT3 === null) marks.firstT3 = w.t;
      if (a.tier === 4 && marks.firstT4 === null) marks.firstT4 = w.t;
    }
    peakFunds = Math.max(peakFunds, w.funds);
    if (marks.egypt === null && w.sites.egypt.unlocked) marks.egypt = w.t;
    if (marks.rome === null && w.sites.rome.unlocked) marks.rome = w.t;
    if (marks.deep12 === null && SITES.some((s) => w.sites[s.id].layer >= LAYERS_PER_SITE)) marks.deep12 = w.t;
    if (marks.ending === null && w.ended) {
      marks.ending = w.t;
      break;
    }
  }

  const gaps: number[] = [];
  for (let i = 1; i < dropTimesFirst20.length; i++) gaps.push(dropTimesFirst20[i] - dropTimesFirst20[i - 1]);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : Infinity;

  return { w, record, marks, avgGap, dropsIn20: dropTimesFirst20.length, peakFunds };
}

/** 업그레이드 없이 60초 동안 쌓인 진척으로 클릭 가속 배율을 잰다 */
function measureClickRate(cps: number): number {
  const totals: number[] = [];
  for (const clicks of [0, cps]) {
    const w = createWorld();
    w.workers = 40;
    const before = w.sites.korea.layerProgress;
    for (let t = 0; t < 60; t++) {
      for (let c = 0; c < clicks; c++) click(w);
      advance(w, 1, false, 1);
    }
    // 층이 올라갔을 수 있으므로 누적 진척을 층 비용으로 되돌려 합산한다
    let total = w.sites.korea.layerProgress - before;
    for (let L = 1; L < w.sites.korea.layer; L++) total += layerCost("korea", L);
    totals.push(total);
  }
  return totals[1] / totals[0];
}

function fmt(v: number | null): string {
  return v === null ? "미달성" : duration(v);
}

/** 엔딩에 도달하지 못했을 때, 3축 중 무엇이 막고 있는지 수치로 진단한다
 *  (작업 지시 — "도달하지 못하면 무엇이 막고 있는지 수치로 진단하라"). */
function diagnoseEnding(w: World, record: PersistentRecord) {
  const rows = fullRanking(w, record);
  const sorted = [...rows].sort((a, b) => b.rank - a.rank);
  const player = rows.find((r) => r.id === "player")!;
  const rankPlace = sorted.findIndex((r) => r.id === "player") + 1;
  const leader = sorted[0];

  console.log("\n──────── 엔딩 진단(RANK_SCORE = .30자산 + .35도감 + .35명성) ────────");
  console.log(`  자산축   ${player.asset.toFixed(4)}  (가중 기여 ${(player.asset * RANK_WEIGHT.asset).toFixed(4)})`);
  console.log(`  도감축   ${player.codex.toFixed(4)}  (가중 기여 ${(player.codex * RANK_WEIGHT.codex).toFixed(4)}, 목표 ${CODEX_GOAL_V2})`);
  console.log(`  명성축   ${player.fame.toFixed(4)}  (가중 기여 ${(player.fame * RANK_WEIGHT.fame).toFixed(4)})`);
  console.log(`  종합     ${player.rank.toFixed(4)}   종합 순위 ${rankPlace}위 (1위: ${leader.name} ${leader.rank.toFixed(4)})`);
  console.log(`  판정: 종합 1위 ${leader.id === "player" ? "✅" : "❌"}   도감≥목표 ${player.codex >= CODEX_GOAL_V2 ? "✅" : "❌"}`);
  const { owned, total } = codexProgress(w);
  console.log(`  도감 실측: ${owned}/${total}종 (${((owned / total) * 100).toFixed(1)}%) — 목표 달성까지 ${Math.max(0, Math.ceil(total * CODEX_GOAL_V2) - owned)}종 더 필요`);
  console.log(`  박물관 누적 관람객 ${w.museumCumulativeVisitors.toFixed(0)}명, 유일 최초발굴 ${record.firstT4Finds + w.stats.firstT4Finds}/12`);
}

function main() {
  const hoursArg = process.argv.indexOf("--hours");
  const hours = hoursArg > -1 ? Number(process.argv[hoursArg + 1]) : 2;

  const idle = run(hours);
  const w = idle.w;
  const record = idle.record;
  const rank = ranking(w);
  const codex = codexProgress(w);

  console.log("──────── 방치 기준선(클릭 0회, v0.2 — 발굴단·거점 확장·시설·스텝) ────────");
  console.log(`시뮬 길이        ${duration(w.t)}`);
  console.log(`첫 유물 드랍     ${fmt(idle.marks.firstDrop)}   (기준 40초 이내)`);
  console.log(`20분 내 드랍     ${idle.dropsIn20}점, 평균 간격 ${idle.avgGap.toFixed(1)}초   (기준 300초 이하)`);
  console.log(`이집트 해금      ${fmt(idle.marks.egypt)}`);
  console.log(`로마 해금        ${fmt(idle.marks.rome)}   (비용 3억, 최고 보유 자금 ${won(idle.peakFunds)} ₩)`);
  console.log(`12층 도달        ${fmt(idle.marks.deep12)}`);
  console.log(`첫 국보(T3)      ${fmt(idle.marks.firstT3)}`);
  console.log(`첫 유일(T4)      ${fmt(idle.marks.firstT4)}`);
  console.log(`엔딩(v0.2)       ${fmt(idle.marks.ending)}`);
  console.log(`자산             ${won(playerAssets(w))} ₩   자산순위(v0.1식) ${rank.findIndex((r) => r.id === "player") + 1}위`);
  console.log(`도감             소장 ${codex.owned} / 소실 ${codex.lost} / 검증 총 ${codex.total}종  (${((codex.owned / codex.total) * 100).toFixed(0)}%, CODEX_GOAL_V2 ${CODEX_GOAL_V2 * 100}%)`);
  console.log(`발굴력(레거시)   ${digPower(w).toFixed(0)}/s   인부 ${w.workers} 장비 Lv.${w.gear} 감정소 Lv.${w.lab}`);
  console.log(`발굴단           ${w.teams.length}팀, 방문 거점 ${SITES.filter((s) => w.visitedSites[s.id]).length}/12`);
  console.log(`레이스           승 ${w.stats.racesWon} / 패 ${w.stats.racesLost}`);
  console.log("순위표(v0.1 자산 단독 기준 — 참고용, 실제 엔딩 판정은 RANK_SCORE 3축이다)");
  for (const r of rank) {
    console.log(`  ${r.name.padEnd(8)} ${won(r.assets).padStart(10)} ₩   발굴력 ${r.dig.toFixed(0)}/s  추격 ×${r.catchup.toFixed(2)}`);
  }

  const err = ledgerOk(w);
  console.log(`\n원장 보존        ${err ? `❌ ${err}` : "✅ 이상 없음"}`);

  if (idle.marks.ending === null) diagnoseEnding(w, record);

  // 클릭 상한 — 업그레이드를 멈추고 순수 진척 속도만 잰다.
  // 목표 도달 시간으로 재면 두 런의 난수 경로가 갈라져 측정이 흔들린다.
  const clickRate = measureClickRate(6);
  console.log(`\n클릭 가속(진척 속도) ×${clickRate.toFixed(2)}   (기준 1.35 이하)`);

  // 오프라인 적분 일치 — 진척 적분은 스텝 크기와 무관해야 한다.
  // 어떤 유물이 걸리느냐는 난수라 비교 대상이 아니고, 드랍 **횟수**와 층은 결정론이다.
  const a = createWorld();
  const b = createWorld();
  advance(a, 3600, true, 1);
  advance(b, 3600, true, 10);
  const same = a.stats.drops === b.stats.drops && a.sites.korea.layer === b.sites.korea.layer;
  const dd = Math.abs(a.sites.korea.layerProgress - b.sites.korea.layerProgress);
  console.log(`오프라인 적분     ${same && dd < 1e-6 ? "✅ 스텝 크기와 무관" : `❌ drops ${a.stats.drops}/${b.stats.drops}, layer ${a.sites.korea.layer}/${b.sites.korea.layer}, Δ${dd}`}`);

  // T3·T4 오프라인 상실 0건
  const c = createWorld();
  c.sites.korea.layer = 12;
  for (const r of c.rivals) r.layer = 12;
  const rep = advance(c, 12 * 3600, true, 10);
  const highLost = rep.lost.filter((l) => {
    const art = ARTIFACT_BY_ID[l.artifactId];
    return art.tier >= 3;
  });
  console.log(`오프라인 T3·T4 상실 ${highLost.length}건   (기준 0건)`);

  // v0.2 3축 순위(spec.md §13.1) — 이제 엔딩 판정과 실제로 연결돼 있다(checkEnding).
  console.log("\n──────── v0.2 3축 순위(RANK_SCORE — 엔딩 판정에 실제로 쓰인다) ────────");
  console.log(`자산 축   ${assetScore(w).toFixed(4)}   (자산 ${won(playerAssets(w))} ₩ / 기준 375억 ₩)`);
  console.log(`도감 축   ${codexScore(w).toFixed(4)}   (${codex.owned}종 / 검증 총 ${codex.total}종)`);
  console.log(`명성 축   ${fameScore(w, record).toFixed(4)}   (누적 관람객 ${w.museumCumulativeVisitors.toFixed(0)}명, 유일 최초발굴 ${record.firstT4Finds + w.stats.firstT4Finds}회)`);
  console.log(`종합      ${rankScore(w, record).toFixed(4)}`);
}

main();
