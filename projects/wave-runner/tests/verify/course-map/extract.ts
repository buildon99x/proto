/**
 * 스테이지별 "실제 플레이되는 통로" 추출.
 *
 * 실행은 `run.mjs` 를 통한다 — 이 파일만 돌리면 데이터만 나오고 그림은 나오지 않는다.
 *
 * 솔버의 생존 집합 S[k] = F[k] ∩ B[k] 를 월드 x 격자(1단위)로 다시 담는다.
 * 한 격자에 여러 스텝이 들어오면 **가장 좁은 것**을 남긴다 — 난이도 지도는
 * 좁은 쪽을 숨기면 안 된다.
 */
import { writeFileSync } from "node:fs";
import { NEUTRAL_BUILD, applyTrade } from "../../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../../app/src/game/engine";
import { measure } from "../../../app/src/game/geometry";
import { MAX_TIER, STAGES_PER_TIER } from "../../../app/src/game/meta";
import { solveCourse } from "../../../app/src/game/solver";
import type { CourseSolveResult } from "../../../app/src/game/solver";
import { targetSlackMs } from "../tiers";
import type { AxisKey, Build } from "../../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const CAP = 2; // 처음 만나는 조건
const DT = 1 / 90;
const TUNING = { ...BASE_TUNING, axisMax: CAP, axisMin: -CAP };
const trade = (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, TUNING);
const lanesOf = (p: number): Array<"top" | "bot"> =>
  Array.from({ length: GATES }, (_, g) => ((p >> g) & 1 ? "bot" : "top"));

/** 격자 한 칸 = 월드 1단위. */
interface Col { x: number; free: number[]; surv: number[]; ms: number }

function toGrid(res: CourseSolveResult, finishX: number): Col[] {
  const n = Math.ceil(finishX) + 1;
  const cols: Col[] = Array.from({ length: n }, (_, x) => ({ x, free: [], surv: [], ms: Infinity }));
  for (const pp of res.perPiece) {
    const t = pp.trace;
    if (!t) continue;
    for (let k = 0; k < t.survival.length; k += 1) {
      const x = Math.round(t.startX + k * t.dx);
      if (x < 0 || x >= n) continue;
      const w = measure(t.survival[k]);
      const ms = (w / (2 * t.rate)) * 1000;
      // 같은 칸에 여러 스텝이 겹치면 더 좁은 쪽을 남긴다
      if (ms < cols[x].ms) {
        cols[x].ms = ms;
        cols[x].surv = t.survival[k].flatMap((s) => [s.lo, s.hi]);
        cols[x].free = (t.free[k] ?? []).flatMap((s) => [s.lo, s.hi]);
      }
    }
  }
  // 빈 칸은 앞 칸으로 메운다(조각 경계에서 격자가 한 칸 비는 경우)
  for (let i = 1; i < n; i += 1) if (!Number.isFinite(cols[i].ms) && cols[i - 1]) cols[i] = { ...cols[i - 1], x: i };
  return cols;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const stages: any[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    const course = buildStageCourse(tier, no, TUNING);
    const startY = startYFor(course);
    const finishX = course.finishX;

    let bestMs = -1, bestPath = 0, worstMs = Infinity, worstPath = 0;
    const all: number[] = [];
    for (let p = 0; p < PATHS; p += 1) {
      const r = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, TUNING, startY, lanesOf(p), trade, DT);
      if (!r.passable) continue;
      const ms = r.minSlackSec * 1000;
      all.push(ms);
      if (ms > bestMs) { bestMs = ms; bestPath = p; }
      if (ms < worstMs) { worstMs = ms; worstPath = p; }
    }
    all.sort((a, b) => a - b);

    const solveTraced = (p: number) =>
      solveCourse(course.pieces, { ...NEUTRAL_BUILD }, TUNING, startY, lanesOf(p), trade, DT, true);

    const bestCols = toGrid(solveTraced(bestPath), finishX);
    const worstCols = toGrid(solveTraced(worstPath), finishX);

    stages.push({
      tier, no, finishX: round2(finishX),
      worldHeight: TUNING.worldHeight,
      pieces: course.pieces.map((pc) => ({
        kind: pc.kind,
        id: pc.kind === "sector" ? pc.sector!.id : "gate",
        type: pc.kind === "sector" ? pc.sector!.type : "gate",
        startX: round2(pc.startX),
        endX: round2(pc.endX)
      })),
      stats: {
        best: Math.round(bestMs),
        med: Math.round(all[Math.floor(all.length / 2)]),
        worst: Math.round(worstMs),
        under60: all.filter((v) => v < 60).length,
        under30: all.filter((v) => v < 30).length,
        paths: all.length,
        // 사다리는 `../tiers` 하나에서만 온다. 여기 사본이 있던 동안 그림은 0.5.2 에서
        // 버린 옛 공식(190 − (tier−1)×30)으로 "티어 목표" 를 찍고 있었다.
        target: targetSlackMs(tier)
      },
      best: bestCols.map((c) => [c.free.map(round2), c.surv.map(round2), Math.round(c.ms)]),
      worstMs: worstCols.map((c) => Math.round(c.ms))
    });
    console.error(`T${tier}·${no} best=${Math.round(bestMs)} worst=${Math.round(worstMs)} cols=${bestCols.length}`);
  }
}

const out = process.argv[2];
if (!out) throw new Error("사용법: tsx extract.ts <출력 파일>");
// 렌더러가 file:// 에서 <script> 로 읽을 수 있게 전역 대입문으로 감싼다.
// 경로 수와 코스 길이는 구조(`STAGE_SECTORS`)를 따라 움직이므로 그림이 제 손으로
// 세지 않고 여기서 받아 간다 — 하드코딩된 "16경로" 가 그림에 두 군데 있었다.
writeFileSync(
  out,
  `window.COURSE=${JSON.stringify({ paths: PATHS, gates: GATES, sectors: STAGE_SECTORS })};` +
    `window.STAGES=${JSON.stringify(stages)};`
);
console.error(`written → ${out}`);
