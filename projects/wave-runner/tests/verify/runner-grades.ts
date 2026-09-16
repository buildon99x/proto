/**
 * 기체 등급표를 굽는다 — 피커가 읽을 **측정된 성격**.
 *
 * `runner-probe.ts` 는 섹터 하나짜리 여유를 보고 `runner-paths.ts` 는 솔버의 이론값을 본다.
 * 둘 다 수용 시험이지 플레이어에게 보여줄 수치가 아니다. 여기서 재는 것은 **스테이지 한 판을
 * 끝까지 달렸을 때** 어떤가이고, 그 결과를 `app/src/game/runner-grades.json` 으로 굽는다.
 * `stage-seeds.json` 과 같은 방식이다 — 게임은 표만 읽는다.
 *
 * ## 축이 둘인 이유
 *
 * 플레이테스트에서 두 기체의 성격이 **정반대로** 나왔다. 예봉은 통하는 경로가 절반뿐인데
 * 그 경로는 가장 편하고, 둔각은 경로는 넉넉한데 실행이 가장 빡빡하다. 하나의 "난이도"로
 * 뭉치면 이 대비가 사라지므로 두 축을 따로 낸다.
 *
 * - **실행 여유(slackMs)** — 클리어되는 최대 입력 지연. 크면 굼떠도 깬다
 * - **경로 폭(routes)** — 16경로 중 통과 가능한 비율. 크면 아무 길로나 가도 된다
 *
 * 둘 다 "지연을 준 오토파일럿"이라는 같은 도구로 재므로 서로 대조된다. 오토파일럿은 사람이
 * 아니므로 **절대값이 아니라 기체 사이의 비교**로만 쓴다 — 피커도 막대(상대값)로만 그린다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/runner-grades.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { STAGE_SECTORS } from "../../app/src/game/course";
import { createState, launch, update } from "../../app/src/game/engine";
import type { GameState } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { RUNNERS } from "../../app/src/game/runners";
import type { Runner } from "../../app/src/game/runners";
import type { AxisKey } from "../../app/src/game/types";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
/** 처음 만나는 사람의 조건으로 잰다. 해금한 사람은 어차피 더 넓다. */
const CAP = 2;

/** 빌드를 중립 가까이 유지하는 관을 고른다 — 순진하지만 처음 달릴 때의 기본 정책이다. */
function laneNeutral(s: GameState): "top" | "bot" {
  const piece = s.course.pieces.find((p) => p.kind === "gate" && p.endX > s.x);
  const gate = piece?.gate;
  if (!gate) return "top";
  const cost = (tr: { plus: AxisKey; minus: AxisKey }) => {
    const b = { ...s.build };
    b[tr.plus] = Math.min(s.base.axisMax, b[tr.plus] + 1);
    b[tr.minus] = Math.max(s.base.axisMin, b[tr.minus] - 1);
    return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
  };
  return cost(gate.bot) < cost(gate.top) ? "bot" : "top";
}

function makeState(runner: Runner, tier: number, no: number): GameState {
  return createState({
    mode: "stage",
    tier,
    stageNo: no,
    seed: 0,
    runner: runner.id,
    startBuild: { ...runner.startBuild },
    axisCap: CAP,
    maxSectorDifficulty: 3
  });
}

/** 한 판을 끝까지. `path` 가 주어지면 그 경로로, 아니면 중립 유지 정책으로 간다. */
function clears(runner: Runner, tier: number, no: number, latencySec: number, path: number | null): boolean {
  const state = makeState(runner, tier, no);
  launch(state);
  const history: number[] = [];
  const delayFrames = Math.max(0, Math.round(latencySec / DT));
  for (let t = 0; t < 200; t += DT) {
    const lane =
      path === null
        ? laneNeutral(state)
        : ((path >> Math.min(GATES - 1, state.gatesPassed)) & 1 ? "bot" : "top");
    history.push(state.y - targetY(state, LOOKAHEAD, lane));
    const seen = history.length > delayFrames ? history[history.length - 1 - delayFrames] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

/** 클리어되는 최대 지연(ms). −1 은 지연 0 에서도 실패. */
function slackMs(runner: Runner, tier: number, no: number): number {
  let best = -1;
  for (let lat = 0; lat <= 0.3; lat += 0.01) {
    if (!clears(runner, tier, no, lat, null)) return best;
    best = Math.round(lat * 1000);
  }
  return 300;
}

function passableRoutes(runner: Runner, tier: number, no: number): number {
  let n = 0;
  for (let p = 0; p < PATHS; p += 1) if (clears(runner, tier, no, 0, p)) n += 1;
  return n;
}

interface Grade {
  id: string;
  /** 스테이지별 최대 지연의 중앙값(ms). −1 은 지연 0 에서도 못 깨는 스테이지 */
  slackMs: number;
  /** 16경로 중 통과 가능한 평균 비율 0..1 */
  routes: number;
  /** 지연 0 에서도 한 경로도 못 깨는 스테이지 수 */
  walls: number;
}

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const grades: Grade[] = [];
console.log("스테이지 12개를 끝까지 달려 잰다 (축 상한 ±2)\n");
console.log("기체     실행 여유(중앙값)   경로 폭(평균/16)   벽(0/16 스테이지)");
console.log("-".repeat(64));

for (const runner of RUNNERS) {
  const slacks: number[] = [];
  const routes: number[] = [];
  let walls = 0;
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      slacks.push(slackMs(runner, tier, no));
      const r = passableRoutes(runner, tier, no);
      routes.push(r);
      if (r === 0) walls += 1;
    }
  }
  const g: Grade = {
    id: runner.id,
    slackMs: median(slacks),
    routes: routes.reduce((a, b) => a + b, 0) / routes.length / PATHS,
    walls
  };
  grades.push(g);
  console.log(
    `${runner.name.padEnd(6)}   ${String(g.slackMs).padStart(12)}ms   ${(g.routes * PATHS).toFixed(1).padStart(14)}   ${String(g.walls).padStart(16)}`
  );
}

// 피커는 상대값(막대)만 그리므로 최댓값으로 정규화한 값도 함께 굽는다.
const maxSlack = Math.max(...grades.map((g) => Math.max(0, g.slackMs)), 1);
const maxRoutes = Math.max(...grades.map((g) => g.routes), 0.01);
const out = {
  note: "runner-grades.ts 가 굽는다. 손으로 고치지 말 것.",
  measuredAt: new Date().toISOString().slice(0, 10),
  axisCap: CAP,
  runners: Object.fromEntries(
    grades.map((g) => [
      g.id,
      {
        slackMs: g.slackMs,
        routes: Number(g.routes.toFixed(3)),
        walls: g.walls,
        slackBar: Number((Math.max(0, g.slackMs) / maxSlack).toFixed(3)),
        routeBar: Number((g.routes / maxRoutes).toFixed(3))
      }
    ])
  )
};

const dest = join(import.meta.dirname, "../../app/src/game/runner-grades.json");
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\n구웠다 → app/src/game/runner-grades.json`);

// 등급이 전부 같으면 피커에 그릴 것이 없다 — 기체가 성격으로 갈리지 않는다는 뜻이다.
const spreadSlack = Math.max(...grades.map((g) => g.slackMs)) - Math.min(...grades.map((g) => g.slackMs));
const spreadRoutes = Math.max(...grades.map((g) => g.routes)) - Math.min(...grades.map((g) => g.routes));
if (spreadSlack < 20 && spreadRoutes < 0.1) {
  console.error("\nFAIL: 기체 사이의 차이가 두 축 모두에서 미미하다 — 피커에 그릴 성격이 없다.");
  process.exit(1);
}
console.log(`\n결과: 실행 여유 ${spreadSlack}ms · 경로 폭 ${(spreadRoutes * PATHS).toFixed(1)}/16 만큼 갈린다.`);
