/**
 * 12거점 실데이터 도입 후 엔딩 도달 가능성 실측(3단계 작업 지시 — "시뮬에서
 * 엔딩 도달 여부와 도감 완주율을 반드시 측정해 보고하라").
 *
 *   pnpm --filter relic-king exec tsx src/sim/qa_endgame.ts [--hours N]
 *
 * `sim/run.ts`의 "방치 기준선"은 레거시 단독 발굴(`w.activeSite`)만 쓰고
 * 발굴단(`w.teams`)을 전혀 파견하지 않는다 — `unlockSite`(base 승격)만으로는
 * `MAX_OWNED_SITES=3`에 묶여 신규 9거점(2단계 G52.10이 "무데이터"로 보고했던
 * 그 9거점)에 절대 도달하지 못한다. 이 스크립트는 발굴단을 실제로 12거점
 * 전역에 파견하는 정책으로 돌려, 3단계가 채운 데이터가 **실제로 도달
 * 가능한지** 측정한다. `sim/run.ts`의 기존 "클릭 0회" 방치 기준선은 과거
 * 단계들과의 비교 가능성을 위해 건드리지 않았다 — 이 스크립트는 별도
 * 측정치다(notes/decisions.md G53, eval.md §13 참조).
 */
import { ARTIFACTS } from "../game/artifacts";
import { CODEX_GOAL, MAX_EXPEDITION_TEAMS_CAP, SITES } from "../game/balance";
import {
  advance, blindSellAll, buyGear, buyLab, buyTeamGear, buyTeamWorker, buyWorker, codexProgress,
  createTeam, createWorld, digPower, dispatchExpedition, hireForeman, playerAssets, ranking,
  sellTierAtMost, setRoutine, staffMarketCycle, unlockSite, unlockTeamSlot
} from "../game/engine";
import { duration, won } from "../game/format";
import { staffCandidates } from "../game/staff";
import type { SiteId, World } from "../game/types";

const STEP = 10;
// 12거점을 순회하며 발굴단을 분산 배치한다(korea가 시작 base라 첫 팀은 그대로 둔다)
const TOUR_ORDER: SiteId[] = [
  "korea", "egypt", "rome", "greece", "turkey", "israel", "india", "china", "iraq", "japan", "mexico", "peru"
];

function ensureTeams(w: World) {
  // 자금이 허락하는 한 발굴단 슬롯을 최대(4)까지 늘린다
  while (w.teams.length >= w.maxTeams && w.maxTeams < MAX_EXPEDITION_TEAMS_CAP) {
    if (!unlockTeamSlot(w)) break;
  }
  while (w.teams.length < Math.min(w.maxTeams, MAX_EXPEDITION_TEAMS_CAP)) {
    const cycle = staffMarketCycle(w);
    const candidates = staffCandidates(w.activeSite, cycle, "foreman");
    let hired: string | null = null;
    for (let slot = 0; slot < candidates.length; slot++) {
      hired = hireForeman(w, w.activeSite, slot);
      if (hired) break;
    }
    if (!hired) break;
    const teamId = createTeam(w, hired);
    if (!teamId) break;
    // 팀마다 서로 다른 거점을 목표로 잡고 루틴을 켠다(계속 그 거점을 왕복) — korea는
    // 레거시가 이미 파고 있으니 팀은 그다음 순서(egypt)부터 배정한다
    const target = TOUR_ORDER[(w.teams.length + 1) % TOUR_ORDER.length];
    buyTeamWorker(w, teamId);
    buyTeamWorker(w, teamId);
    dispatchOrRoute(w, teamId, target);
  }
}

function dispatchOrRoute(w: World, teamId: string, target: SiteId) {
  setRoutine(w, teamId, true, target);
  const team = w.teams.find((t) => t.id === teamId)!;
  if (team.status === "idle") dispatchExpedition(w, teamId, target);
}

/** 그 거점의 검증된 종을 전부 확보했는가(더 파봐야 소용없다는 뜻) */
function siteCleared(w: World, site: SiteId): boolean {
  const species = ARTIFACTS.filter((a) => a.site === site && a.sourceStatus === "verified");
  if (species.length === 0) return true;
  return species.every((a) => w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified");
}

/** 팀이 노리는 거점이 이미 다 채워졌으면 아직 안 채워진 다음 거점으로 재배정한다 —
 *  가만히 있으면 4팀이 4개 거점만 영원히 들이파고 나머지 8곳은 방치되기 때문이다. */
function redirectClearedTeams(w: World) {
  for (const team of w.teams) {
    const target = team.routine?.target;
    if (!target || !siteCleared(w, target)) continue;
    const next = TOUR_ORDER.find((s) => !siteCleared(w, s) && !w.teams.some((t) => t.routine?.target === s));
    if (next) dispatchOrRoute(w, team.id, next);
  }
}

function act(w: World) {
  sellTierAtMost(w, 1);
  // 안전판(마무리 패스, notes/decisions.md G56) — 이 정책은 감정비(추정가의 2%,
  // 층 기대평가액 기준이라 실제 티어와 무관하게 클 수 있다)를 위한 자금을 따로
  // 비축하지 않는다. 인부·장비·감정소 구매가 매 틱 먼저 자금을 끌어다 쓰면
  // 미감정 큐가 무한정 쌓이고 vault가 비어 매각 수입도 0인 채로 영구히 멈추는
  // 교착이 생긴다(실측으로 발견 — 이 스크립트가 24~336h 내내 도감 21종에서
  // 멈춘 원인이었다). sim/run.ts와 동일한 블라인드 매각 안전판으로 막는다.
  if (w.pending.length >= 24) blindSellAll(w);
  for (const s of SITES) {
    if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  }
  for (let i = 0; i < 10; i++) {
    if (w.funds >= 50_000 && w.workers < 20) buyWorker(w);
    else if (w.funds >= 300_000 && w.gear < 6) buyGear(w);
    else if (w.funds >= 400_000 && w.lab < 4) buyLab(w);
    else break;
  }
  ensureTeams(w);
  redirectClearedTeams(w);
  for (const team of w.teams) {
    // 루틴이 있는데 아직 idle이면(예: 귀환 직후 재파견이 막 걸리기 전) 직접 재파견한다
    if (team.status === "idle" && team.routine?.enabled) dispatchExpedition(w, team.id, team.routine.target);
    if (w.funds >= 200_000) buyTeamWorker(w, team.id);
    if (w.funds >= 2_000_000) buyTeamGear(w, team.id);
  }
}

function main() {
  const hoursArg = process.argv.indexOf("--hours");
  const hours = hoursArg > -1 ? Number(process.argv[hoursArg + 1]) : 336; // 기본 2주

  const w = createWorld();
  const totalSeconds = hours * 3600;
  const checkpoints = [24, 72, 168, 336, 672, 1344, 2016].filter((h) => h <= hours);
  let nextCk = 0;

  console.log(`──────── qa_endgame: 발굴단 12거점 분산 파견, ${hours}시간 ────────`);

  for (let t = 0; t < totalSeconds; t += STEP) {
    act(w);
    advance(w, STEP, false, STEP);
    if (nextCk < checkpoints.length && w.t >= checkpoints[nextCk] * 3600) {
      const codex = codexProgress(w);
      const rank = ranking(w);
      const visitedNew = SITES.filter((s) => w.visitedSites[s.id]).length;
      console.log(
        `${String(checkpoints[nextCk]).padStart(4)}h  도감 ${codex.owned}/${codex.total} ` +
        `(${((codex.owned / codex.total) * 100).toFixed(1)}%)  소실 ${codex.lost}  ` +
        `방문거점 ${visitedNew}/12  자산 ${won(playerAssets(w))}₩  순위 ${rank.findIndex((r) => r.id === "player") + 1}위  ` +
        `엔딩 ${w.ended ? "✅ 달성" : "미달성"}`
      );
      nextCk++;
    }
    if (w.ended) break;
  }

  const codex = codexProgress(w);
  const rank = ranking(w);
  console.log("\n──────── 최종 ────────");
  console.log(`시뮬 길이   ${duration(w.t)}`);
  console.log(`엔딩        ${w.ended ? `✅ 달성(${duration(w.t)})` : "미달성"}`);
  console.log(`도감        소장 ${codex.owned} / 소실 ${codex.lost} / 전체 ${codex.total} (${((codex.owned / codex.total) * 100).toFixed(1)}%, 목표 ${CODEX_GOAL * 100}%)`);
  console.log(`방문 거점   ${SITES.filter((s) => w.visitedSites[s.id]).length}/12`);
  console.log(`발굴단      ${w.teams.length}팀, 발굴력(레거시) ${digPower(w).toFixed(0)}/s`);
  console.log(`자산        ${won(playerAssets(w))}₩   순위 ${rank.findIndex((r) => r.id === "player") + 1}위`);

  // 거점별 도감 소장 현황(신규 9거점이 실제로 기여하는지 직접 확인)
  console.log("\n거점별 소장 종수:");
  for (const s of SITES) {
    const total = ARTIFACTS.filter((a) => a.site === s.id && a.sourceStatus === "verified").length;
    const owned = ARTIFACTS.filter(
      (a) => a.site === s.id && a.sourceStatus === "verified" && (w.codex[a.id] === "owned" || w.codex[a.id] === "owned_unidentified")
    ).length;
    console.log(`  ${s.name.padEnd(6)} ${owned}/${total}`);
  }
}

main();
