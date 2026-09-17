/**
 * 섹터 설계의 수용 시험 — **각 축이 정말 양날인가.**
 *
 * 1단계에서 같은 시험을 돌렸을 때 관성도 크기도 모든 구간에서 한쪽만 유리했다.
 * 원인은 축이 아니라 코스였다 — 당시 코스가 전부 "통로 중앙 따라가기" 한 종류라
 * 어떤 축도 부호를 바꿀 자리가 없었다. 2단계의 섹터 4유형은 축의 부호를
 * 뒤집도록 설계됐고, 이 스크립트가 그 설계가 실제로 작동하는지 검사한다.
 *
 * 한 축이 어떤 섹터에서 +가 유리하고 다른 섹터에서 −가 유리하면 양날이다.
 * 어느 축이든 그렇지 않으면 실패로 끝난다 — 그 축은 스탯이지 축이 아니다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/sector-probe.ts
 */
import { AXES, AXIS_LABEL, NEUTRAL_BUILD } from "../../app/src/game/axes";
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import { SECTORS, SECTOR_LEN, SECTOR_TYPE_LABEL } from "../../app/src/game/sectors";
import type { AxisKey, Build, Course, Sector } from "../../app/src/game/types";
import { targetY } from "../../app/src/game/pilot";

const DT = 1 / 120;

function singleSectorCourse(sector: Sector): Course {
  return { pieces: [{ kind: "sector", startX: 0, endX: SECTOR_LEN, sector }], finishX: SECTOR_LEN };
}

function attempt(sector: Sector, build: Build, latencySec: number): boolean {
  const state = createState({
    mode: "stage",
    tier: 1,
    stageNo: 1,
    seed: 0,
    startBuild: build,
    axisCap: 3,
    maxSectorDifficulty: 3
  });
  state.course = singleSectorCourse(sector);
  state.endless = null;
  state.y = startYFor(state.course);
  launch(state);

  const history: number[] = [];
  const delayFrames = Math.max(0, Math.round(latencySec / DT));

  for (let t = 0; t < 60; t += DT) {
    const want = targetY(state, "top");
    history.push(state.y - want);
    const seen = history.length > delayFrames ? history[history.length - 1 - delayFrames] : history[0];
    state.holding = seen > 0;

    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

/** 실패하기 시작하는 반응 지연(ms). 클수록 여유가 크고 쉽다. −10 은 지연 0에서도 실패. */
function tolerance(sector: Sector, build: Build): number {
  let last = -10;
  for (let lat = 0; lat <= 0.32; lat += 0.01) {
    if (!attempt(sector, build, lat)) return last;
    last = Math.round(lat * 1000);
  }
  return 320;
}

const withAxis = (axis: AxisKey, tick: number): Build => ({ ...NEUTRAL_BUILD, [axis]: tick });

const rows = SECTORS.map((sector) => {
  const neutral = tolerance(sector, { ...NEUTRAL_BUILD });
  const byAxis = Object.fromEntries(
    AXES.map((axis) => [axis, { minus: tolerance(sector, withAxis(axis, -2)), plus: tolerance(sector, withAxis(axis, 2)) }])
  ) as Record<AxisKey, { minus: number; plus: number }>;
  return { sector, neutral, byAxis };
});

console.log("각 칸 = 실패하기 시작하는 반응 지연(ms). 클수록 여유. −10 은 지연 0에서도 실패.\n");
const head = ["섹터".padEnd(20), "중립".padStart(7), ...AXES.flatMap((a) => [`${AXIS_LABEL[a]}−`.padStart(7), `${AXIS_LABEL[a]}+`.padStart(7)])].join("");
console.log(head);
console.log("-".repeat(head.length));
for (const r of rows) {
  console.log(
    [
      `${SECTOR_TYPE_LABEL[r.sector.type]} ${r.sector.id}`.padEnd(20),
      `${r.neutral}`.padStart(7),
      ...AXES.flatMap((a) => [`${r.byAxis[a].minus}`.padStart(7), `${r.byAxis[a].plus}`.padStart(7)])
    ].join("")
  );
}

console.log("\n축별 판정 — 섹터마다 어느 쪽이 유리한가");
const failed: string[] = [];
for (const axis of AXES) {
  const signs = rows.map((r) => {
    const d = r.byAxis[axis].plus - r.byAxis[axis].minus;
    return d > 8 ? "+" : d < -8 ? "−" : "=";
  });
  const twoSided = signs.includes("+") && signs.includes("−");
  console.log(`  ${AXIS_LABEL[axis].padEnd(4)} [${signs.join(" ")}]  ${twoSided ? "양날 ✓" : "한쪽만 유리 ✗"}`);
  if (!twoSided) failed.push(AXIS_LABEL[axis]);
}

const unplayable = rows.filter((r) => r.neutral < 0).map((r) => r.sector.id);
if (unplayable.length > 0) {
  console.log(`\n중립 빌드로 통과 불가한 섹터: ${unplayable.join(", ")}`);
}

console.log("");
if (failed.length === 0 && unplayable.length === 0) {
  console.log("결과: 3축 모두 섹터 유형에 따라 부호가 뒤집히고, 중립 빌드로 전 섹터를 통과할 수 있다.");
} else {
  if (failed.length) console.log(`결과: ${failed.join(", ")} 축이 아직 양날이 아니다.`);
  if (unplayable.length) console.log("결과: 중립으로 못 지나는 섹터가 있다 — 불공정하다.");
  process.exitCode = 1;
}
