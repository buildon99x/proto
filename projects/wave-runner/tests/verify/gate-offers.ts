/**
 * 게이트가 정말 "교환"인지 실제 주행으로 확인한다.
 *
 * 제안을 코스 조립 시점에 미리 뽑아 두면, 지나갈 때쯤 플레이어의 축이 이미 상한에
 * 닿아 **한쪽만 먹히는** 일이 생긴다 — 오를 축이 막히면 순손해, 내릴 축이 막히면
 * 공짜 상승, 둘 다 막히면 무효다. 화면은 셋을 구분하지 않고 늘 화살표와 막대를
 * 그리므로 플레이어는 자기가 무엇을 골랐는지 알 수 없게 된다.
 *
 * 그래서 제안은 직전 게이트를 지날 때 현재 빌드로 정해진다(`gateOffer`). 그것이
 * 지켜지면 통과한 모든 게이트에서 **정확히 두 축이 +1 / −1 만큼** 움직이고,
 * 세 축의 합은 런 내내 0 에서 벗어나지 않는다. 여기서 그 둘을 센다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/gate-offers.ts
 */
import { AXES, NEUTRAL_BUILD } from "../../app/src/game/axes";
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import type { GameState, RunConfig } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import type { Build } from "../../app/src/game/types";

const DT = 1 / 120;

interface Tally {
  gates: number;
  trades: number;
  degenerate: number;
  driftMax: number;
}

const sum = (b: Build) => AXES.reduce((a, k) => a + b[k], 0);

/** 게이트 하나가 정확히 +1 / −1 이었는가. */
function isTrade(before: Build, after: Build): boolean {
  const up = AXES.filter((k) => after[k] - before[k] === 1);
  const down = AXES.filter((k) => after[k] - before[k] === -1);
  const moved = AXES.filter((k) => after[k] !== before[k]);
  return up.length === 1 && down.length === 1 && moved.length === 2;
}

/** 빈틈을 보는 오토파일럿으로 한 판. 게이트마다 변화를 기록한다. */
function run(config: RunConfig, maxSec: number, tally: Tally): void {
  const state: GameState = createState(config);
  state.y = startYFor(state.course);
  launch(state);

  let gates = state.gatesPassed;
  let before: Build = { ...state.build };

  for (let t = 0; t < maxSec; t += DT) {
    const gate = state.course.pieces.find((p) => p.kind === "gate" && p.endX > state.x)?.gate;
    // 어느 관이든 상관없다 — 여기서 묻는 것은 선택의 질이 아니라 교환의 성립이다.
    const lane = gate && gate.seed % 2 === 0 ? "bot" : "top";
    state.holding = state.y - targetY(state, lane) > 0;
    const r = update(state, DT);

    if (state.gatesPassed > gates) {
      gates = state.gatesPassed;
      tally.gates += 1;
      if (isTrade(before, state.build)) tally.trades += 1;
      else tally.degenerate += 1;
      tally.driftMax = Math.max(tally.driftMax, Math.abs(sum(state.build)));
      before = { ...state.build };
    }
    if (r.event === "died" && config.mode === "endless") break;
    if (r.event === "cleared") break;
    if (r.event === "restarted") {
      before = { ...state.build };
      gates = state.gatesPassed;
    }
  }
}

const base = {
  startBuild: { ...NEUTRAL_BUILD },
  overrides: undefined
};

let failures = 0;
console.log("모드           축 상한   통과 게이트   교환 성립   교환 아님   축합 이탈 최대");
console.log("-".repeat(74));

for (const cap of [2, 3]) {
  const stage: Tally = { gates: 0, trades: 0, degenerate: 0, driftMax: 0 };
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      run(
        { ...base, mode: "stage", tier, stageNo: no, seed: 0, axisCap: cap, maxSectorDifficulty: 3 },
        200,
        stage
      );
    }
  }
  const endless: Tally = { gates: 0, trades: 0, degenerate: 0, driftMax: 0 };
  for (let i = 0; i < 12; i += 1) {
    run(
      { ...base, mode: "endless", tier: 1, stageNo: 0, seed: 1000 + i * 37, axisCap: cap, maxSectorDifficulty: cap === 2 ? 2 : 3 },
      300,
      endless
    );
  }
  for (const [name, t] of [["Stage", stage], ["Endless", endless]] as const) {
    if (t.degenerate > 0 || t.driftMax > 0) failures += 1;
    console.log(
      `${name.padEnd(14)} ±${cap}      ${String(t.gates).padStart(9)}   ${String(t.trades).padStart(9)}` +
        `   ${String(t.degenerate).padStart(9)}   ${String(t.driftMax).padStart(13)}`
    );
  }
}

console.log("");
console.log(
  failures === 0
    ? "결과: 통과한 모든 게이트가 한 축 +1 / 다른 축 −1 이었고, 세 축의 합은 0 을 벗어나지 않았다."
    : `실패 ${failures}건 — 교환이 성립하지 않는 게이트가 있다.`
);
process.exit(failures === 0 ? 0 : 1);
