/**
 * 기체 설계의 수용 시험 — **기체가 정말 양날인가.**
 *
 * `sector-probe.ts` 가 축에 대해 묻는 것을 기체에 대해 묻는다. 2단계에서 관성과 크기가
 * 탈락한 이유가 그대로 적용된다 — **모든 구간에서 한쪽만 유리하면 축이 아니라 스탯**이고,
 * 기체도 마찬가지로 모든 유형에서 유리하기만 하면 기체가 아니라 난이도 슬라이더다.
 *
 * 양날이 나오는 자리는 **폭(span)** 이다. 폭이 좁으면 극단에서도 덜 벌어져 안정적이지만
 * 협곡의 램프 기울기를 따라잡을 각도를 끝내 못 만들고, 넓으면 좁은 갭을 파고들지만
 * 한 칸의 체감이 커서 다루기 어렵다. 중심(center)은 부호를 바꾸지 못하므로 중심만
 * 다른 기체는 이 시험을 통과하지 못한다 — 그게 이 시험의 요점이다.
 *
 * 측정 단위는 **실패하기 시작하는 반응 지연(ms)** 이고, 솔버의 여유(ms)와 같은 단위다.
 *
 * ## 판정은 유형이 아니라 섹터별로 한다
 *
 * 유형 평균으로 판정했더니 편향 폭이 큰 기체가 아무 차이도 못 냈다. 회랑 유형은
 * 평탄·상승·하강 셋인데 **편향의 유불리는 상승과 하강에서 정확히 반대**라 평균이 그대로
 * 상쇄한다. 표는 유형별로 보여주되 수용 판정은 섹터 12개 각각으로 한다.
 *
 * ## 중립 한 점에서 재면 안 된다
 *
 * 처음에 중립 빌드 하나로 쟀더니 중심이 1.0 인 기체(환·잔상)가 표준과 **정확히 0% 차이**로
 * 나왔다. 당연하다 — 중심이 같으면 눈금 0 의 계수가 글자 그대로 같고, **폭은 눈금을
 * 움직여야 비로소 드러나는 성질**이기 때문이다. 축의 양날을 "통로 중앙 따라가기" 코스
 * 하나로 재려다 실패했던 1단계와 같은 종류의 측정 오류다.
 *
 * 그래서 유형마다 **빌드 표본을 훑은 평균**을 기체의 값으로 쓴다.
 *
 * 최댓값(그 유형을 가장 잘 푸는 빌드)을 썼더니 전 기체가 ±7% 안으로 뭉갰다. 최댓값은
 * **플레이어가 갖지 못한 자유**를 모델링하기 때문이다 — 게이트는 거절할 수 없고 매 섹터
 * 두 축을 강제로 민다. 최적점에 앉아 있을 수 있다면 어떤 기체든 비슷해진다. 실제로
 * 지나가게 되는 빌드들의 평균이라야 "이 기체로 이 유형을 달리면 어떤가"를 묻는 것이 된다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/runner-probe.ts
 */
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import { targetY } from "../../app/src/game/pilot";
import { RUNNERS } from "../../app/src/game/runners";
import { SECTORS, SECTOR_LEN, SECTOR_TYPE_LABEL } from "../../app/src/game/sectors";
import type { Build, Course, Runner, Sector, SectorType } from "../../app/src/game/types";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
/** 유불리로 인정하는 최소 차이. 이보다 작으면 측정 잡음과 구분되지 않는다. */
const EDGE_PCT = 8;

function singleSectorCourse(sector: Sector): Course {
  return { pieces: [{ kind: "sector", startX: 0, endX: SECTOR_LEN, sector }], finishX: SECTOR_LEN };
}

function attempt(sector: Sector, runner: Runner, build: Build, latencySec: number): boolean {
  const state = createState({
    mode: "stage",
    tier: 1,
    stageNo: 1,
    seed: 0,
    runner: runner.id,
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
    const want = targetY(state, LOOKAHEAD, "top");
    history.push(state.y - want);
    const seen = history.length > delayFrames ? history[history.length - 1 - delayFrames] : history[0];
    state.holding = seen > 0;

    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

/** 실패하기 시작하는 반응 지연(ms). 클수록 여유가 크고 쉽다. −10 은 지연 0 에서도 실패. */
function tolerance(sector: Sector, runner: Runner, build: Build): number {
  let last = -10;
  for (let lat = 0; lat <= 0.32; lat += 0.01) {
    if (!attempt(sector, runner, build, lat)) return last;
    last = Math.round(lat * 1000);
  }
  return 320;
}

const TYPES: SectorType[] = ["gorge", "corridor", "scatter", "pulse"];
const NEUTRAL: Build = { slope: 0, speed: 0, bias: 0 };

/**
 * 빌드 표본. 폭이 드러나려면 눈금을 끝까지 밀어 봐야 하므로 각도와 편향의 양극을 쓴다.
 * 속도는 각도와 직교하고(`angles.ts`) 이번 단계에서 기체마다 같으므로 훑지 않는다.
 */
const BUILDS: Build[] = [
  NEUTRAL,
  { slope: 2, speed: 0, bias: 0 },
  { slope: -2, speed: 0, bias: 0 },
  { slope: 3, speed: 0, bias: 0 },
  { slope: -3, speed: 0, bias: 0 },
  { slope: 0, speed: 0, bias: 2 },
  { slope: 0, speed: 0, bias: -2 },
  { slope: 0, speed: 0, bias: 3 },
  { slope: 0, speed: 0, bias: -3 }
];

/** 한 섹터를 빌드 표본 전체로 달렸을 때의 평균 여유. */
function reach(sector: Sector, runner: Runner): number {
  let sum = 0;
  for (const build of BUILDS) sum += tolerance(sector, runner, build);
  return sum / BUILDS.length;
}

/**
 * 유형별 대표값. 유형마다 섹터가 셋이고 난이도가 다르므로 평균을 쓴다 —
 * 가장 어려운 하나만 보면 그 섹터의 성질이 유형의 성질로 둔갑한다.
 */
function byType(runner: Runner): Record<SectorType, number> {
  const out = {} as Record<SectorType, number>;
  for (const type of TYPES) {
    const list = SECTORS.filter((s) => s.type === type);
    const sum = list.reduce((acc, s) => acc + reach(s, runner), 0);
    out[type] = sum / list.length;
  }
  return out;
}

const baseline = byType(RUNNERS[0]);

console.log(`유형별 여유(ms) — 빌드 표본 ${BUILDS.length}개의 평균. 괄호는 표준 대비\n`);
const head = ["기체".padEnd(6), ...TYPES.map((t) => SECTOR_TYPE_LABEL[t].padStart(14))].join(" ");
console.log(head);
console.log("-".repeat(head.length));

interface Row {
  runner: Runner;
  values: Record<SectorType, number>;
  perSector: number[];
}

const rows: Row[] = [];
for (const runner of RUNNERS) {
  const values = runner.id === RUNNERS[0].id ? baseline : byType(runner);
  const cells = TYPES.map((type) => {
    const v = values[type];
    const b = baseline[type];
    const pct = b > 0 ? ((v - b) / b) * 100 : 0;
    const tag = runner.id === RUNNERS[0].id ? "" : ` (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`;
    return `${v.toFixed(0)}${tag}`.padStart(14);
  });
  console.log([runner.name.padEnd(6), ...cells].join(" "));
  rows.push({ runner, values, perSector: SECTORS.map((sector) => reach(sector, runner)) });
}

const flat = TYPES.filter((type) => {
  const vals = rows.map((r) => r.values[type]);
  return Math.max(...vals) - Math.min(...vals) < 1;
});
if (flat.length > 0) {
  console.log(
    `\n참고: ${flat.map((t) => SECTOR_TYPE_LABEL[t]).join("·")} 은 모든 기체가 같은 값이다 — ` +
      "이 유형은 기체를 가르지 못한다."
  );
}

console.log(`\n수용 기준: 표준 외 각 기체가 ≥1 섹터에서 +${EDGE_PCT}% 이상, ≥1 섹터에서 −${EDGE_PCT}% 이하\n`);

const basePerSector = rows[0].perSector;
let fails = 0;
for (const row of rows) {
  if (row.runner.id === RUNNERS[0].id) continue;
  const best: string[] = [];
  const worst: string[] = [];
  SECTORS.forEach((sector, i) => {
    const b = basePerSector[i];
    if (b <= 0) return;
    const pct = ((row.perSector[i] - b) / b) * 100;
    if (pct >= EDGE_PCT) best.push(`${sector.id}+${pct.toFixed(0)}%`);
    if (pct <= -EDGE_PCT) worst.push(`${sector.id}${pct.toFixed(0)}%`);
  });
  const ok = best.length > 0 && worst.length > 0;
  if (!ok) fails += 1;
  console.log(`${ok ? "✓" : "✗"} ${row.runner.name.padEnd(4)}`);
  console.log(`     유리 ${best.length ? best.join(" · ") : "없음"}`);
  console.log(`     불리 ${worst.length ? worst.join(" · ") : "없음"}`);
}

if (fails > 0) {
  console.error(
    `\nFAIL: ${fails}개 기체가 한쪽만 유리하다. 하방이 없으면 기체가 아니라 난이도 슬라이더다 —\n` +
      "      중심(center)을 다시 잡거나 그 기체를 버려야 한다."
  );
  process.exit(1);
}
console.log("\n결과: 모든 기체가 유형에 따라 유불리의 부호가 뒤집힌다.");
