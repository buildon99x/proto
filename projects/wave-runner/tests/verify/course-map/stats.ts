/**
 * 통로 난이도 수치표 — `run.mjs` 가 굽는 그림의 짝이다.
 *
 * 그림은 "어디가 어떻게 어려운가"를 보여주고 이쪽은 그것을 숫자로 못 박는다.
 * 보고서를 쓸 때는 둘을 대조해야 한다 — 어긋나면 그림이 아니라 수치를 다시 재라.
 * 그림은 월드 1단위 격자로 다운샘플된 것이고 수치가 원본이다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/course-map/stats.ts
 */
import { NEUTRAL_BUILD, applyTrade } from "../../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../../app/src/game/engine";
import { measure } from "../../../app/src/game/geometry";
import { MAX_TIER, STAGES_PER_TIER } from "../../../app/src/game/meta";
import { SECTORS } from "../../../app/src/game/sectors";
import { solveCourse } from "../../../app/src/game/solver";
import { PEAK_RUN_NOTE, PEAK_RUN_RULE, targetSlackMs } from "../tiers";
import type { AxisKey, Build } from "../../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const DT = 1 / 90;
/** 출발 집합이 점 하나라 좁게 나오는 구간. 난이도가 아니라 초기 조건이므로 집계에서 뺀다. */
const SETTLE_X = 24;

/** 사람의 탭 타이밍 산포보다 좁은 구간 — 이론상 통과 가능해도 실제로는 불가능하다. */
const HUMAN_FLOOR_MS = 30;

const tuningFor = (cap: number) => ({ ...BASE_TUNING, axisMax: cap, axisMin: -cap });
const tradeWith = (t: typeof BASE_TUNING) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);
const lanesOf = (p: number): Array<"top" | "bot"> =>
  Array.from({ length: GATES }, (_, g) => ((p >> g) & 1 ? "bot" : "top"));
const pad = (v: string | number, n: number) => String(v).padStart(n);

interface Row {
  tier: number; no: number; cap: number;
  best: number; med: number; worst: number; spread: number;
  under60: number; under30: number;
  bottleneck: string; sectors: string[];
  utilisation: number; peakRun: number; peakAt: string;
}

const rows: Row[] = [];

for (const cap of [2, 3]) {
  const tuning = tuningFor(cap);
  const trade = tradeWith(tuning);
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const course = buildStageCourse(tier, no, tuning);
      const startY = startYFor(course);
      const sectors = course.pieces.filter((p) => p.kind === "sector").map((p) => p.sector!.id);

      const all: number[] = [];
      let bestPath = 0, bestMs = -1;
      for (let p = 0; p < PATHS; p += 1) {
        const r = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, tuning, startY, lanesOf(p), trade, DT);
        if (!r.passable) continue;
        const ms = r.minSlackSec * 1000;
        all.push(ms);
        if (ms > bestMs) { bestMs = ms; bestPath = p; }
      }
      all.sort((a, b) => a - b);

      // 최선 경로를 한 번 더, 이번엔 추적을 켜서 — 통로 활용률과 최난 구간의 길이를 잰다
      const traced = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, tuning, startY, lanesOf(bestPath), trade, DT, true);
      const bn = traced.perPiece.reduce((a, b) => (b.slackSec < a.slackSec ? b : a), traced.perPiece[0]);
      const bnPiece = course.pieces[bn.index];

      let freeSum = 0, survSum = 0, run = 0, peakRun = 0, peakEnd = 0;
      const limit = bestMs * 1.25;
      for (const pp of traced.perPiece) {
        const t = pp.trace;
        if (!t) continue;
        for (let k = 0; k < t.survival.length; k += 1) {
          const x = t.startX + k * t.dx;
          if (x < SETTLE_X) continue;
          const w = measure(t.survival[k]);
          freeSum += measure(t.free[k] ?? []) * t.dx;
          survSum += w * t.dx;
          if ((w / (2 * t.rate)) * 1000 <= limit) {
            run += t.dx;
            if (run > peakRun) { peakRun = run; peakEnd = x; }
          } else run = 0;
        }
      }
      const peakPiece = course.pieces.find((p) => peakEnd >= p.startX && peakEnd < p.endX);

      rows.push({
        tier, no, cap,
        best: Math.round(bestMs), med: Math.round(all[Math.floor(all.length / 2)]),
        worst: Math.round(all[0]), spread: Math.round(bestMs - all[0]),
        under60: all.filter((v) => v < 60).length,
        under30: all.filter((v) => v < HUMAN_FLOOR_MS).length,
        bottleneck: bnPiece.kind === "gate" ? `게이트#${bn.index}` : bnPiece.sector!.id,
        sectors,
        utilisation: freeSum > 0 ? survSum / freeSum : 0,
        peakRun: Math.round(peakRun),
        peakAt: peakPiece ? (peakPiece.kind === "gate" ? "게이트" : peakPiece.sector!.id) : "?"
      });
    }
  }
}

for (const cap of [2, 3]) {
  console.log(`\n═══ 축 상한 ±${cap} ${cap === 2 ? "(처음 만나는 조건 — 큐레이션 기준)" : "(해금 후)"} ═══`);
  console.log(
    "티어 요구 — " + [1, 2, 3, 4].map((t) => `T${t} ${targetSlackMs(t)}ms · ${PEAK_RUN_NOTE[t]}`).join("  |  ")
  );
  console.log("스테이지  최선  중앙  최악  차이  <60 <30   목표  편차   통로활용  최난구간  병목");
  for (const r of rows.filter((r) => r.cap === cap)) {
    const off = r.best - targetSlackMs(r.tier);
    console.log(
      `T${r.tier}·${r.no}   ${pad(r.best, 5)} ${pad(r.med, 5)} ${pad(r.worst, 5)} ${pad(r.spread, 5)}` +
      ` ${pad(r.under60, 4)}${pad(r.under30, 4)}  ${pad(targetSlackMs(r.tier), 5)} ${pad((off >= 0 ? "+" : "") + off, 5)}` +
      `   ${pad((r.utilisation * 100).toFixed(0) + "%", 6)}  ${pad(r.peakRun, 5)}단위${PEAK_RUN_RULE[r.tier](r.peakRun) ? " " : "⚠"} ${r.bottleneck}`
    );
  }
  const tiers = [1, 2, 3, 4].map((t) => {
    const v = rows.filter((r) => r.cap === cap && r.tier === t).map((r) => r.best);
    return { t, avg: v.reduce((a, b) => a + b, 0) / v.length, v };
  });
  console.log("\n티어 곡선 (최선 여유 평균)");
  for (const { t, avg, v } of tiers) {
    console.log(`  티어 ${t}  목표 ${pad(targetSlackMs(t), 3)}ms   실측 ${pad(avg.toFixed(0), 3)}ms  [${v.join(", ")}]`);
  }
  const inverted = tiers.filter((a, i) => i > 0 && a.avg > tiers[i - 1].avg);
  if (inverted.length) console.log(`  ⚠ 곡선 역전: ` + inverted.map((a) => `티어 ${a.t}이 티어 ${a.t - 1}보다 쉽다`).join(", "));
}

console.log("\n═══ 코스 중복 (±2 기준, 5자리 중 4자리 이상 일치) ═══");
const s2 = rows.filter((r) => r.cap === 2);
let dup = 0;
for (let i = 0; i < s2.length; i += 1)
  for (let j = i + 1; j < s2.length; j += 1) {
    const n = s2[i].sectors.filter((v, k) => v === s2[j].sectors[k]).length;
    if (n >= 4) {
      dup += 1;
      console.log(`  T${s2[i].tier}·${s2[i].no} vs T${s2[j].tier}·${s2[j].no}   ${n === 5 ? "완전 동일" : `${n}/5 일치`}`);
    }
  }
if (!dup) console.log("  없음");

console.log("\n═══ 섹터 사용 빈도 (60자리) ═══");
const freq = new Map<string, number>();
for (const r of s2) for (const id of r.sectors) freq.set(id, (freq.get(id) ?? 0) + 1);
for (const s of SECTORS) {
  const n = freq.get(s.id) ?? 0;
  console.log(`  ${s.id.padEnd(15)} ${pad(n, 2)}회  ${((n / 60) * 100).toFixed(0).padStart(2)}%  ${"█".repeat(n)}`);
}
const unused = SECTORS.filter((s) => !freq.has(s.id)).map((s) => s.id);
if (unused.length) console.log(`  ⚠ 한 번도 쓰이지 않음: ${unused.join(", ")}`);

const traps = s2.filter((r) => r.under30 > 0);
console.log(`\n═══ 함정 경로 (여유 ${HUMAN_FLOOR_MS}ms 미만 — 통과 가능하지만 사람에게는 불가능) ═══`);
if (traps.length === 0) console.log("  없음");
else for (const r of traps) console.log(`  T${r.tier}·${r.no}  16경로 중 ${r.under30}개 (최악 ${r.worst}ms)`);
