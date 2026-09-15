/**
 * 스테이지 전 경로 검증 — **정확한 솔버 기반**.
 *
 * 2단계까지는 오토파일럿이 통과하면 통과 가능하다고 보는 증인(witness) 방식이었다.
 * 실패가 불가능을 증명하지 못했으므로 "통과율"은 사실 "오토파일럿 통과율"이었다.
 * 3단계의 솔버는 도달 가능 집합을 정확히 전파하므로, 여기서 나오는 통과율은
 * **실제로 사람이 낼 수 있는 최선을 기준으로 한 통과율**이다.
 *
 * 규칙(core-loop.md §6.1 B): 최소 한 경로는 통과 가능해야 하고, 통과율이 너무 낮으면
 * 시행착오 강요, 너무 높으면 게이트가 무의미하다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/stage-paths.ts
 */
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const MIN_RATE = 0.3;

const trade = (b: Build, t: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: t.plus as AxisKey, minus: t.minus as AxisKey }, BASE_TUNING);

let failures = 0;
const lines: string[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    const course = buildStageCourse(tier, no, BASE_TUNING, 3);
    const startY = startYFor(course);
    let cleared = 0;
    let bestSlack = 0;
    let worstSlack = Number.POSITIVE_INFINITY;

    for (let path = 0; path < PATHS; path += 1) {
      const lanes: Array<"top" | "bot"> = [];
      for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
      const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, BASE_TUNING, startY, lanes, trade, 1 / 90);
      if (res.passable) {
        cleared += 1;
        bestSlack = Math.max(bestSlack, res.minSlackSec);
        worstSlack = Math.min(worstSlack, res.minSlackSec);
      }
    }

    const rate = cleared / PATHS;
    const ok = cleared > 0 && rate >= MIN_RATE;
    if (!ok) failures += 1;
    lines.push(
      `티어 ${tier} · ${no}   통과 ${String(cleared).padStart(2)}/${PATHS} (${(rate * 100).toFixed(0)}%)` +
        `   최선 경로 여유 ${(bestSlack * 1000).toFixed(0)}ms` +
        `   최악 통과 경로 ${(Number.isFinite(worstSlack) ? worstSlack * 1000 : 0).toFixed(0)}ms   ${ok ? "✓" : "✗"}`
    );
  }
}

console.log(`게이트 ${GATES}개 → 스테이지당 경로 ${PATHS}가지. 정확한 솔버로 판정.\n`);
console.log(lines.join("\n"));
console.log("");
console.log(
  "여유(ms)는 생존 회랑 폭을 시간으로 환산한 값이다 — 그만큼의 타이밍 오차까지는 만회된다.\n" +
    "경로마다 여유가 다르다는 것이 곧 **빌드 선택이 의미를 가진다**는 뜻이다."
);
console.log("");
if (failures === 0) {
  console.log("결과: 모든 스테이지가 최소 한 경로로 통과 가능하고 통과율 기준을 만족한다.");
} else {
  console.log(`결과: ${failures}개 스테이지가 기준 미달 — 시드를 다시 선별해야 한다.`);
  process.exitCode = 1;
}
