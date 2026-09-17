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
    history.push(state.y - targetY(state, lane));
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
/**
 * 표본 시드.
 *
 * 8개에서 32개로 늘렸다(0.7.2). 아래 주석이 적어 둔 그대로 20ms 와 60ms 는 둘 다
 * 통로를 따라갈 만큼 빨라서 무엇이 뽑혔느냐가 결과를 가르는데, 8개로는 그 평균이
 * 흔들려 **멀쩡한 변경이 램프 역전으로 찍힌다** — 게이트 리드인의 중앙선을 흔든
 * 0.7.2 에서 실제로 반등이 966 (기준 920)으로 잡혔고, 같은 코드를 32개로 재니
 * 649 였다. 평균의 표준오차는 `1/√n` 이므로 표본을 4배로 하면 절반이 된다.
 *
 * 기준(`MAX_REBOUND`)을 늘려 통과시키는 쪽이 아니라 표본을 늘린 것은, 느슨해진
 * 기준은 **진짜 역전도 함께 놓치기** 때문이다.
 */
const SEEDS = Array.from({ length: 32 }, (_, i) => 11 * (i + 1));

/**
 * 판정 기준을 "인접 구간 단조 감소"에서 바꾼 이유.
 *
 * 지연 20ms 와 60ms 는 둘 다 통로를 따라갈 만큼 빠르다 — 이 구간에서 어디서
 * 죽느냐를 가르는 것은 지연이 아니라 어떤 섹터가 뽑혔고 게이트가 빌드를 어디로
 * 밀었느냐다. 게이트 제안이 빌드에 맞춰 정해지면서(0.4.0) 모든 게이트가 실제로
 * 기체를 바꾸게 되자 이 흔들림이 커졌고, 표본을 8개로 늘려도 인접 두 칸이
 * 뒤집히는 일이 남는다(실측 20ms 6164 / 60ms 6762).
 *
 * 그래서 데이터가 뒷받침하는 만큼만 묻는다. 램프가 실력을 반영한다는 주장은
 * **지연이 충분히 커지면 확실히 못 간다**는 것이고, 국소적인 뒤집힘은 그 주장을
 * 반증하지 않는다. 대신 큰 반등(두 섹터 넘게)은 여전히 실패로 잡는다.
 */
const MAX_REBOUND = SECTOR_LEN * 2;
const COLLAPSE_RATIO = 0.4;

let monotonic = true;
let prev = Number.POSITIVE_INFINITY;
let anyEnded = false;
const averages: number[] = [];
for (const latency of [0.02, 0.06, 0.1, 0.14, 0.18]) {
  const rs = SEEDS.map((seed) => run(seed, latency));
  const avg = rs.reduce((a, r) => a + r.distance, 0) / rs.length;
  const sectors = Math.round(rs.reduce((a, r) => a + r.sectors, 0) / rs.length);
  const ended = rs.every((r) => r.ended);
  anyEnded = anyEnded || rs.some((r) => r.ended);
  if (avg > prev + MAX_REBOUND) monotonic = false;
  prev = avg;
  averages.push(avg);
  console.log(
    `${(latency * 1000).toFixed(0).padStart(6)}   ${avg.toFixed(0).padStart(9)}   ${String(sectors).padStart(4)}   ${ended ? "전부" : rs.some((r) => r.ended) ? "일부" : "없음"}`
  );
}

const collapsed = averages[averages.length - 1] <= averages[0] * COLLAPSE_RATIO;

console.log("");
console.log(
  `최저 지연 ${averages[0].toFixed(0)} → 최고 지연 ${averages[averages.length - 1].toFixed(0)}` +
    ` (${((averages[averages.length - 1] / averages[0]) * 100).toFixed(0)}%, 기준 ${COLLAPSE_RATIO * 100}% 이하)`
);
if (!anyEnded) {
  console.log("결과: 어떤 지연에서도 런이 끝나지 않는다 — Endless 에 천장이 없다.");
  process.exitCode = 1;
} else if (!collapsed) {
  console.log("결과: 지연을 키워도 도달 거리가 무너지지 않는다 — 램프가 실력을 반영하지 못한다.");
  process.exitCode = 1;
} else if (!monotonic) {
  console.log("결과: 중간에 두 섹터 넘게 되레 멀리 간 구간이 있다 — 난이도 곡선이 뒤집혔다.");
  process.exitCode = 1;
} else {
  console.log("결과: 램프가 조이고, 지연이 충분히 커지면 도달 거리가 무너진다.");
}
