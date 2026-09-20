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
  ARTIFACT_WORLD_VALUE_CEILING, ASSET_SCORE_REF_SHARE, CODEX_GOAL_V2, LAYERS_PER_SITE, RANK_WEIGHT, SITES, layerCost
} from "../game/balance";
import {
  advance, assetScore, click, codexProgress, codexScore, createPersistentRecord, createWorld, digPower, fameScore, fullRanking, playerAssets, ranking, rankScore
} from "../game/engine";
import { duration, won } from "../game/format";
import type { PersistentRecord, World } from "../game/types";

import { STEP_EARLY, STEP_LATE, act } from "./policy";

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
  console.log(
    `자산 축   ${assetScore(w).toFixed(4)}   (전시 제외 자산 기준. 총자산 ${won(playerAssets(w))} ₩ / ` +
    `ASSET_SCORE_REF ${won(ARTIFACT_WORLD_VALUE_CEILING * ASSET_SCORE_REF_SHARE)} ₩)`
  );
  console.log(`도감 축   ${codexScore(w).toFixed(4)}   (${codex.owned}종 / 검증 총 ${codex.total}종)`);
  console.log(`명성 축   ${fameScore(w, record).toFixed(4)}   (누적 관람객 ${w.museumCumulativeVisitors.toFixed(0)}명, 유일 최초발굴 ${record.firstT4Finds + w.stats.firstT4Finds}회)`);
  console.log(`종합      ${rankScore(w, record).toFixed(4)}`);
}

main();
