/**
 * 밋밋함 계측 — **어디가 아무것도 묻지 않는가.**
 *
 * 난이도 지표는 전부 "가장 좁은 곳" 을 본다(`stats.ts` 의 최난점, `tiers.ts` 의 목표
 * 여유, 큐레이션의 공정성 하한). 그것만 보면 **넓고 긴 구간이 얼마나 되는지는 아무도
 * 재지 않는다.** 여유 190ms 짜리 직선 통로는 모든 기준을 통과하면서 플레이어에게
 * 아무 질문도 하지 않는다 — 난이도 문제가 아니라 밀도 문제다.
 *
 * ## 무엇을 밋밋하다고 보는가
 *
 * 원버튼 지그재그에서 플레이어가 매 순간 푸는 문제는 "언제 뒤집는가" 하나다.
 * 그 문제가 사라지는 조건이 둘이고, **둘 다 만족할 때만** 밋밋하다고 센다.
 *
 *  1. **넉넉하다** — 여유가 그 스테이지 자신의 최난점보다 `RICH_RATIO` 배 이상.
 *     뒤집는 시점이 틀려도 벌이 없다
 *  2. **변하지 않는다** — 생존 회랑의 중앙선 기울기 `|dc/dx|` 가 `STRAIGHT_SLOPE`
 *     아래. 같은 리듬을 유지하면 그만이다
 *
 * 절대 폭이 아니라 **그 스테이지 자신의 최난점 대비**로 재는 이유는, 묻는 것이
 * "넓은가" 가 아니라 **"이 스테이지 안에서 긴장이 빠지는 자리가 어디인가"** 이기
 * 때문이다. `peakRunOf` 가 최난 구간의 지속을 그 스테이지 자신의 최난 대비로 재는
 * 것과 같은 이유고, 실제로 이 지표는 그것의 정확한 반대짝이다.
 *
 * ## 이 수치로 무엇을 하는가
 *
 * 판정하지 않는다 — PASS/FAIL 이 없다. 난이도를 올리면 밋밋함은 언제나 줄어들므로
 * 하한을 걸면 난이도를 올리라는 압력이 된다. 이 파일이 답하는 것은 **"밋밋한 구간이
 * 어느 섹터의 어디에 있는가"** 이고, 그것을 여유를 깎지 않고 고쳤는지는 고친 뒤에
 * 이 표와 `stats.ts` 의 최난점을 **함께** 봐야 안다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/flatness.ts
 */
import { applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { measure } from "../../app/src/game/geometry";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { DEFAULT_RUNNER, applyRunner } from "../../app/src/game/runners";
import { solveCourse } from "../../app/src/game/solver";
import type { Span } from "../../app/src/game/geometry";
import type { AxisKey, Build, Tuning } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const DT = 1 / 90;
const CAP = 2;
/** 출발 정착 구간 — 출발 집합이 점 하나라 좁게 나오는 자리이고 난이도가 아니다. */
const SETTLE_X = 24;

/** 최난점의 몇 배부터 "넉넉하다" 로 보는가. */
const RICH_RATIO = 2.0;
/** 중앙선 기울기가 이 아래면 "변하지 않는다" 로 본다. 아바타의 기본 기울기는 1.0 이다. */
const STRAIGHT_SLOPE = 0.15;
/** 이 길이를 넘는 밋밋한 구간만 이름을 불러 준다(월드 단위). 약 1.4초 이상. */
const NAMED_RUN = 60;

const TUNING: Tuning = applyRunner({ ...BASE_TUNING, axisMax: CAP, axisMin: -CAP }, DEFAULT_RUNNER);
const trade = (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, TUNING);
const lanesOf = (p: number): Array<"top" | "bot"> =>
  Array.from({ length: GATES }, (_, g) => ((p >> g) & 1 ? "bot" : "top"));

/** 생존 집합의 중앙 — 조각난 집합이면 바깥 경계의 중점을 쓴다. */
const centerOf = (spans: Span[]): number =>
  spans.length === 0 ? NaN : (spans[0].lo + spans[spans.length - 1].hi) / 2;

interface Sample {
  x: number;
  ms: number;
  c: number;
  /** 이 x 가 속한 조각의 이름 */
  where: string;
}

interface Run {
  from: number;
  to: number;
  where: string;
}

interface StageResult {
  tier: number;
  no: number;
  minMs: number;
  len: number;
  blandLen: number;
  runs: Run[];
}

const results: StageResult[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    const course = buildStageCourse(tier, no, TUNING);
    const startY = startYFor(course);

    let bestPath = 0;
    let bestMs = -1;
    for (let p = 0; p < PATHS; p += 1) {
      const r = solveCourse(course.pieces, { ...DEFAULT_RUNNER.startBuild }, TUNING, startY, lanesOf(p), trade, DT);
      if (r.passable && r.minSlackSec * 1000 > bestMs) {
        bestMs = r.minSlackSec * 1000;
        bestPath = p;
      }
    }
    const traced = solveCourse(
      course.pieces, { ...DEFAULT_RUNNER.startBuild }, TUNING, startY, lanesOf(bestPath), trade, DT, true
    );

    const samples: Sample[] = [];
    for (const pp of traced.perPiece) {
      const t = pp.trace;
      if (!t) continue;
      const piece = course.pieces[pp.index];
      const where = piece.kind === "gate" ? "게이트" : piece.sector!.id;
      for (let k = 0; k < t.survival.length; k += 1) {
        const x = t.startX + k * t.dx;
        if (x < SETTLE_X) continue;
        samples.push({ x, ms: (measure(t.survival[k]) / (2 * t.rate)) * 1000, c: centerOf(t.survival[k]), where });
      }
    }
    samples.sort((a, b) => a.x - b.x);
    if (samples.length < 2) continue;

    // 최난점은 정착 구간을 뺀 뒤의 최솟값이다 — 넉넉함의 기준선이 된다.
    const minMs = Math.min(...samples.map((s) => s.ms));
    const rich = minMs * RICH_RATIO;

    const runs: Run[] = [];
    let start = -1;
    let blandLen = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const a = samples[i - 1];
      const b = samples[i];
      const dx = b.x - a.x;
      if (dx <= 0) continue;
      const slope = Math.abs((b.c - a.c) / dx);
      const bland = b.ms >= rich && slope < STRAIGHT_SLOPE;
      if (bland) {
        blandLen += dx;
        if (start < 0) start = a.x;
      } else if (start >= 0) {
        if (a.x - start >= NAMED_RUN) runs.push({ from: start, to: a.x, where: samples[i - 1].where });
        start = -1;
      }
    }
    if (start >= 0) {
      const last = samples[samples.length - 1];
      if (last.x - start >= NAMED_RUN) runs.push({ from: start, to: last.x, where: last.where });
    }

    const len = samples[samples.length - 1].x - samples[0].x;
    results.push({ tier, no, minMs, len, blandLen, runs });
  }
}

console.log(
  `밋밋함 = 여유가 그 스테이지 최난점의 ${RICH_RATIO}배 이상이면서 중앙선 기울기 < ${STRAIGHT_SLOPE}` +
    `  (표준 기체 · 축 상한 ±${CAP} · 최선 경로)\n`
);
console.log("스테이지  최난점   밋밋 비율   가장 긴 구간   그 구간이 있는 곳");
console.log("-".repeat(78));

for (const r of results) {
  const pct = (r.blandLen / r.len) * 100;
  const longest = r.runs.reduce((a, b) => (b.to - b.from > (a ? a.to - a.from : 0) ? b : a), null as Run | null);
  console.log(
    `T${r.tier}·${r.no}    ${r.minMs.toFixed(0).padStart(5)}ms   ${pct.toFixed(0).padStart(6)}%   ` +
      `${longest ? `${(longest.to - longest.from).toFixed(0).padStart(6)}단위` : "     —"}   ` +
      `${longest ? longest.where : ""}`
  );
  for (const run of r.runs) {
    console.log(
      `           ${run.from.toFixed(0).padStart(4)}~${run.to.toFixed(0).padStart(4)}  ` +
        `${(run.to - run.from).toFixed(0).padStart(4)}단위 (${((run.to - run.from) / BASE_TUNING.speed).toFixed(1)}초)  ${run.where}`
    );
  }
}

const totalLen = results.reduce((a, r) => a + r.len, 0);
const totalBland = results.reduce((a, r) => a + r.blandLen, 0);
console.log(`\n전체 밋밋 비율 ${((totalBland / totalLen) * 100).toFixed(0)}%`);

// 어느 섹터가 밋밋함을 많이 내는가 — 고칠 대상을 이름으로 부른다.
const byWhere = new Map<string, number>();
for (const r of results)
  for (const run of r.runs) byWhere.set(run.where, (byWhere.get(run.where) ?? 0) + (run.to - run.from));
console.log(`\n${NAMED_RUN}단위 이상 밋밋한 구간을 가장 많이 내는 곳`);
[...byWhere.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([where, len]) => console.log(`  ${where.padEnd(18)} ${len.toFixed(0).padStart(5)}단위`));
