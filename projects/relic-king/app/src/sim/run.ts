/**
 * 헤드리스 밸런스 시뮬레이터.
 *
 *   pnpm --filter relic-king sim            요약
 *   pnpm --filter relic-king sim -- --hours 3
 *
 * UI 없이 엔진만 돌려 eval.md 의 밸런스·불변식 기준을 측정한다.
 * 클릭 0회(방치 기준선)가 기본이다.
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import {
  CODEX_GOAL, LAYERS_PER_SITE, MAX_GEAR_LEVEL, SITES, SITE_BY_ID,
  dropThreshold, gearCost, labCost, layerCost, layerExpectedValue, workerCost
} from "../game/balance";
import {
  advance, click, blindSellAll, buyGear, buyLab, buyWorker, codexProgress, createWorld,
  digPower, playerAssets, ranking, sellTierAtMost, switchSite, unlockSite
} from "../game/engine";
import { duration, won } from "../game/format";
import type { SiteId, World } from "../game/types";

const STEP = 2;

type Policy = { clicksPerSecond: number };

function bestSite(w: World): SiteId {
  // 새로 연 곳을 10층까지 키운 뒤, 초당 기대 수입이 가장 높은 곳을 판다.
  const unlocked = SITES.filter((s) => w.sites[s.id].unlocked);
  const young = unlocked.find((s) => w.sites[s.id].layer < 10 && s.id !== "korea");
  if (young) return young.id;
  let best = unlocked[0].id;
  let bestRate = -1;
  for (const s of unlocked) {
    const sp = w.sites[s.id];
    const rate = layerExpectedValue(s.id, sp.layer) / dropThreshold(s.id, sp.layer);
    if (rate > bestRate) {
      bestRate = rate;
      best = s.id;
    }
  }
  return best;
}

function act(w: World) {
  sellTierAtMost(w, 1);
  if (w.pending.length >= 18) blindSellAll(w);

  for (const s of SITES) {
    if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  }

  for (let i = 0; i < 40; i++) {
    const wc = workerCost(w.workers);
    const gc = gearCost(w.gear);
    const lc = labCost(w.lab);
    if (w.lab < 6 && w.funds >= lc && lc <= wc * 3) {
      buyLab(w);
    } else if (w.gear < MAX_GEAR_LEVEL && gc <= wc * 6 && w.funds >= gc) {
      buyGear(w);
    } else if (w.funds >= wc) {
      buyWorker(w);
    } else break;
  }

  const tip = w.tip;
  if (tip && w.sites[tip.site].unlocked && w.sites[tip.site].layer >= tip.layer) {
    switchSite(w, tip.site);
  } else {
    switchSite(w, bestSite(w));
  }
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

function run(hours: number, policy: Policy) {
  const w = createWorld();
  const marks: Record<string, number | null> = {
    firstDrop: null, egypt: null, rome: null, deep12: null, firstT3: null, firstT4: null, ending: null
  };
  let dropTimesFirst20: number[] = [];
  let peakFunds = 0;

  const totalSeconds = hours * 3600;
  for (let t = 0; t < totalSeconds; t += STEP) {
    act(w);
    for (let c = 0; c < policy.clicksPerSecond * STEP; c++) click(w);
    const report = advance(w, STEP, false, STEP);

    for (const d of report.drops) {
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

  return { w, marks, avgGap, dropsIn20: dropTimesFirst20.length, peakFunds };
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

function main() {
  const hoursArg = process.argv.indexOf("--hours");
  const hours = hoursArg > -1 ? Number(process.argv[hoursArg + 1]) : 2;

  const idle = run(hours, { clicksPerSecond: 0 });
  const w = idle.w;
  const rank = ranking(w);
  const codex = codexProgress(w);

  console.log("──────── 방치 기준선 (클릭 0회) ────────");
  console.log(`시뮬 길이        ${duration(w.t)}`);
  console.log(`첫 유물 드랍     ${fmt(idle.marks.firstDrop)}   (기준 40초 이내)`);
  console.log(`20분 내 드랍     ${idle.dropsIn20}점, 평균 간격 ${idle.avgGap.toFixed(1)}초   (기준 300초 이하)`);
  console.log(`이집트 해금      ${fmt(idle.marks.egypt)}`);
  console.log(`로마 해금        ${fmt(idle.marks.rome)}   (비용 3억, 최고 보유 자금 ${won(idle.peakFunds)} ₩)`);
  console.log(`12층 도달        ${fmt(idle.marks.deep12)}`);
  console.log(`첫 국보(T3)      ${fmt(idle.marks.firstT3)}`);
  console.log(`첫 유일(T4)      ${fmt(idle.marks.firstT4)}`);
  console.log(`엔딩             ${fmt(idle.marks.ending)}`);
  console.log(`자산             ${won(playerAssets(w))} ₩   순위 ${rank.findIndex((r) => r.id === "player") + 1}위`);
  console.log(`도감             소장 ${codex.owned} / 소실 ${codex.lost} / 전체 ${codex.total}  (${((codex.owned / codex.total) * 100).toFixed(0)}%, 목표 ${CODEX_GOAL * 100}%)`);
  console.log(`발굴력           ${digPower(w).toFixed(0)}/s   인부 ${w.workers} 장비 Lv.${w.gear} 감정소 Lv.${w.lab}`);
  console.log(`레이스           승 ${w.stats.racesWon} / 패 ${w.stats.racesLost}`);
  console.log("순위표");
  for (const r of rank) {
    console.log(`  ${r.name.padEnd(8)} ${won(r.assets).padStart(10)} ₩   발굴력 ${r.dig.toFixed(0)}/s  추격 ×${r.catchup.toFixed(2)}`);
  }

  const err = ledgerOk(w);
  console.log(`\n원장 보존        ${err ? `❌ ${err}` : "✅ 이상 없음"}`);

  // 클릭 상한 — 업그레이드를 멈추고 순수 진척 속도만 잰다.
  // 목표 도달 시간으로 재면 두 런의 난수 경로가 갈라져 측정이 흔들린다.
  const clickRate = measureClickRate(6);
  console.log(`클릭 가속(진척 속도) ×${clickRate.toFixed(2)}   (기준 1.35 이하)`);

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
}

main();
