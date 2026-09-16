/**
 * 기체별 공정성 바닥 — **어떤 기체로도 보이지 않는 막다른 길이 없는가.**
 *
 * `stage-paths.ts` 가 표준 기체에 대해 묻는 것을 기체 전부로 넓힌다. 기체를 고르는 것은
 * 난이도를 고르는 일이고, 그건 **어려워지는 것까지만** 허용된다 — 어떤 기체로는 아예
 * 클리어 불가능한 스테이지가 있으면 그건 난이도가 아니라 **함정**이다. 플레이어는 벽에
 * 부딪히기 전까지 그걸 알 수 없고, 원인 모를 죽음은 이 장르의 유일한 자산인 재시도 루프를
 * 파괴한다.
 *
 * 스테이지 시드는 **표준 기체로 큐레이션한 것을 그대로 쓴다.** 기체마다 다시 구우면 같은
 * 번호의 스테이지가 기체마다 다른 코스가 되어, 0.4.0 이 "확장 섹터 풀이 스테이지 코스를
 * 바꾼다"를 버그로 고친 것과 같은 문제가 된다. 다른 기체에게 그 코스는 **같은 문제를 다른
 * 기체로 푸는 것**이고, 그래서 여기서 요구하는 것은 여유 목표가 아니라 통과 가능성 하나다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/runner-paths.ts
 */
import { applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { RUNNERS, applyRunner } from "../../app/src/game/runners";
import type { Runner } from "../../app/src/game/runners";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, Tuning } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
/** ±2 는 처음 만나는 사람의 조건, ±3 은 해금한 사람의 조건. 양쪽에서 성립해야 한다. */
const CAPS = [2, 3];

/**
 * 최선 경로에 요구하는 여유의 하한(ms).
 *
 * 통과 가능성만으로는 부족하다 — 여유 11ms 인 경로는 솔버가 통과 가능이라 해도 사람의
 * 타이밍 산포보다 좁아서 실제로는 통과할 수 없다(eval.md 의 "여유 3ms" 항목과 같은 이야기).
 * 티어 4 의 목표가 100ms 이므로 40ms 는 어떤 티어의 목표보다도 한참 아래이고, 그래도
 * 여기에 걸린다면 그 기체에게 그 스테이지는 난이도가 아니라 **보이지 않는 벽**이다.
 */
const MIN_HUMAN_SLACK_MS = 40;

const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

interface Cell {
  cleared: number;
  bestSlack: number;
  worstSlack: number;
}

function solveStage(runner: Runner, tier: number, no: number, cap: number): Cell {
  const tuning = applyRunner({ ...BASE_TUNING, axisMax: cap, axisMin: -cap }, runner);
  const trade = tradeWith(tuning);
  // 코스는 기체와 무관하다 — 표준 기체로 구운 시드를 그대로 쓴다.
  const course = buildStageCourse(tier, no, tuning);
  const startY = startYFor(course);
  let cleared = 0;
  let bestSlack = 0;
  let worstSlack = Number.POSITIVE_INFINITY;

  for (let path = 0; path < PATHS; path += 1) {
    const lanes: Array<"top" | "bot"> = [];
    for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
    const res = solveCourse(course.pieces, { ...runner.startBuild }, tuning, startY, lanes, trade, 1 / 90);
    if (res.passable) {
      cleared += 1;
      bestSlack = Math.max(bestSlack, res.minSlackSec);
      worstSlack = Math.min(worstSlack, res.minSlackSec);
    }
  }
  return { cleared, bestSlack, worstSlack: Number.isFinite(worstSlack) ? worstSlack : 0 };
}

let failures = 0;
let paths = 0;
const summary: Array<{ runner: Runner; minRate: number; minBest: number; worstStage: string }> = [];

for (const runner of RUNNERS) {
  console.log(`\n== ${runner.name} ==`);
  let minRate = 1;
  let minBest = Number.POSITIVE_INFINITY;
  let worstStage = "";

  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    const cells: string[] = [];
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const per: string[] = [];
      for (const cap of CAPS) {
        const cell = solveStage(runner, tier, no, cap);
        paths += PATHS;
        const rate = cell.cleared / PATHS;
        if (rate < minRate) minRate = rate;
        if (cell.cleared > 0 && cell.bestSlack * 1000 < minBest) {
          minBest = cell.bestSlack * 1000;
          worstStage = `${tier}·${no} (±${cap})`;
        }
        if (cell.cleared === 0) {
          failures += 1;
          per.push(`±${cap} 전멸`);
        } else if (cell.bestSlack * 1000 < MIN_HUMAN_SLACK_MS) {
          failures += 1;
          per.push(`±${cap} 최선 ${(cell.bestSlack * 1000).toFixed(0)}ms — 사람 하한 미만`);
        } else {
          per.push(`±${cap} ${cell.cleared}/${PATHS} 최선 ${(cell.bestSlack * 1000).toFixed(0)}ms`);
        }
      }
      cells.push(`  ${tier}·${no}  ${per.join("   |   ")}`);
    }
    console.log(cells.join("\n"));
  }
  summary.push({ runner, minRate, minBest, worstStage });
}

console.log(`\n\n검사한 경로 ${paths}개 (기체 ${RUNNERS.length} × 스테이지 ${MAX_TIER * STAGES_PER_TIER} × 경로 ${PATHS} × 상한 ${CAPS.length})\n`);
console.log("기체     최저 통과율   가장 빡빡한 스테이지의 최선 경로");
for (const s of summary) {
  console.log(
    `${s.runner.name.padEnd(6)}   ${(s.minRate * 100).toFixed(0).padStart(8)}%   ${s.minBest.toFixed(0).padStart(4)}ms  ${s.worstStage}`
  );
}

console.log(`\n판정: 모든 (기체, 스테이지, 상한) 에서 최선 경로의 여유 ≥ ${MIN_HUMAN_SLACK_MS}ms`);

if (failures > 0) {
  console.error(
    `\nFAIL: ${failures}개 (기체, 스테이지, 상한) 조합이 통과 불가이거나 사람 하한 미만이다.\n` +
      "      기체를 고르는 것은 난이도를 고르는 일이지 함정을 고르는 일이 아니다."
  );
  process.exit(1);
}
console.log("\n결과: 모든 기체가 모든 스테이지를 사람이 낼 수 있는 여유로 통과할 수 있다.");
