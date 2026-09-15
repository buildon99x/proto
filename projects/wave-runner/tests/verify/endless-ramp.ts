/**
 * Endless 난이도 램프 확인.
 *
 * Endless 는 끝이 없으므로 "언젠가 끝난다"가 보장되어야 모드로 성립한다.
 * 손으로 만든 가장 어려운 섹터를 다 쓰고 나면 더 올릴 난이도가 없으므로
 * 통로를 중앙으로 조이는 계수(squeezeFor)가 그 천장을 연다. 여기서는
 * 사람에 가까운 반응 지연을 준 주행으로 **런이 실제로 끝나는지와
 * 지연이 커질수록 도달 거리가 줄어드는지**를 본다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/endless-ramp.ts
 */
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import { squeezeFor } from "../../app/src/game/course";
import { SECTOR_LEN } from "../../app/src/game/sectors";
import { targetY } from "../../app/src/game/pilot";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;

function run(seed: number, latencySec: number): { distance: number; sectors: number; ended: boolean } {
  const state = createState({
    mode: "endless",
    tier: 1,
    stageNo: 0,
    seed,
    startBuild: { ...NEUTRAL_BUILD },
    axisCap: 3,
    maxSectorDifficulty: 3
  });
  state.y = startYFor(state.course);
  launch(state);

  const history: number[] = [];
  const delayFrames = Math.max(0, Math.round(latencySec / DT));

  for (let t = 0; t < 900; t += DT) {
    const gate = state.course.pieces.find((p) => p.kind === "gate" && p.endX > state.x)?.gate;
    let lane: "top" | "bot" = "top";
    if (gate) {
      const cost = (tr: { plus: "slope" | "speed" | "bias"; minus: "slope" | "speed" | "bias" }) => {
        const b = { ...state.build };
        b[tr.plus] = Math.min(state.base.axisMax, b[tr.plus] + 1);
        b[tr.minus] = Math.max(state.base.axisMin, b[tr.minus] - 1);
        return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
      };
      lane = cost(gate.bot) < cost(gate.top) ? "bot" : "top";
    }
    history.push(state.y - targetY(state, LOOKAHEAD, lane));
    const seen = history.length > delayFrames ? history[history.length - 1 - delayFrames] : history[0];
    state.holding = seen > 0;

    const r = update(state, DT);
    if (r.event === "died") {
      return { distance: state.x, sectors: state.sectorsPassed, ended: true };
    }
  }
  return { distance: state.x, sectors: state.sectorsPassed, ended: false };
}

console.log("조임 계수 — 섹터 번호별 통로 폭 배율");
console.log(
  [0, 3, 6, 10, 14, 18, 24]
    .map((i) => `${i}:${squeezeFor(i).toFixed(2)}`)
    .join("  ")
);

console.log("\n지연(ms)   도달 거리   섹터   종료");
console.log("-".repeat(40));
let monotonic = true;
let prev = Number.POSITIVE_INFINITY;
let anyEnded = false;
for (const latency of [0.02, 0.06, 0.1, 0.14, 0.18]) {
  const rs = [11, 22, 33].map((seed) => run(seed, latency));
  const avg = rs.reduce((a, r) => a + r.distance, 0) / rs.length;
  const sectors = Math.round(rs.reduce((a, r) => a + r.sectors, 0) / rs.length);
  const ended = rs.every((r) => r.ended);
  anyEnded = anyEnded || rs.some((r) => r.ended);
  if (avg > prev + SECTOR_LEN) monotonic = false;
  prev = avg;
  console.log(
    `${(latency * 1000).toFixed(0).padStart(6)}   ${avg.toFixed(0).padStart(9)}   ${String(sectors).padStart(4)}   ${ended ? "전부" : rs.some((r) => r.ended) ? "일부" : "없음"}`
  );
}

console.log("");
if (!anyEnded) {
  console.log("결과: 어떤 지연에서도 런이 끝나지 않는다 — Endless 에 천장이 없다.");
  process.exitCode = 1;
} else if (!monotonic) {
  console.log("결과: 지연이 커져도 도달 거리가 줄지 않는다 — 램프가 실력을 반영하지 못한다.");
  process.exitCode = 1;
} else {
  console.log("결과: 램프가 조이고, 지연이 커질수록 도달 거리가 줄어든다.");
}
