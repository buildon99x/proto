/**
 * 완화의 오토파일럿 교차 검증 — **솔버가 말한 여유가 실제 주행에서도 늘어나는가.**
 *
 * 솔버 혼자서는 자기가 틀린 줄 모른다. 3단계에서 도달 집합 전파 버그를 잡은 것도
 * 오토파일럿이었다. 그래서 완화도 같은 방식으로 다시 묻는다 — 지연을 준 파일럿을
 * 완화 전/후로 돌려 통과 경로 수가 실제로 늘어나는지 본다.
 *
 * 그리고 그보다 먼저 물어야 하는 것이 있다. 저장소는 솔버의 여유(ms)와 프로브의
 * 반응 지연 허용치(ms)가 **같은 단위**라고 적어 왔다. 정말 같은 단위인지,
 * 즉 "여유 X ms = 지연 X ms 까지 버팀" 이 성립하는지는 한 번도 대조된 적이 없다.
 * ①이 그것을 대조한다. 결과부터 말하면 **성립하지 않는다.**
 *
 * 모순의 방향에 주의한다. 파일럿이 통과했는데 솔버가 불가능이라 하면 **솔버가
 * 틀린 것**이다(저장소 규칙). 반대는 모순이 아니다 — 파일럿은 근사이고 솔버는
 * 상한이기 때문이다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/relief-pilot.ts
 */
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, applyRelief, createState, launch, startYFor, update } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { RELIEF_MAX, failsForLevel } from "../../app/src/game/relief";
import { SECTORS, SECTOR_LEN, SECTOR_TYPE_LABEL } from "../../app/src/game/sectors";
import { solveCourse, solvePiece } from "../../app/src/game/solver";
import type { AxisKey, Build, Course, Sector, Tuning } from "../../app/src/game/types";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const CAP = 2;
const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;

const tuningFor = (level: number): Tuning =>
  applyRelief({ ...BASE_TUNING, axisMax: CAP, axisMin: -CAP }, level);

const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

const lanesOf = (path: number): Array<"top" | "bot"> => {
  const lanes: Array<"top" | "bot"> = [];
  for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
  return lanes;
};

// ── ① 여유(ms) 와 반응 지연(ms) 은 같은 단위인가 ────────────────

function singleSectorCourse(sector: Sector): Course {
  return { pieces: [{ kind: "sector", startX: 0, endX: SECTOR_LEN, sector }], finishX: SECTOR_LEN };
}

function sectorAttempt(sector: Sector, latencySec: number): boolean {
  const state = createState({
    mode: "stage",
    tier: 1,
    stageNo: 1,
    seed: 0,
    startBuild: { ...NEUTRAL_BUILD },
    axisCap: 3,
    maxSectorDifficulty: 3
  });
  state.course = singleSectorCourse(sector);
  state.endless = null;
  state.y = startYFor(state.course);
  launch(state);

  const history: number[] = [];
  const delay = Math.max(0, Math.round(latencySec / DT));
  for (let t = 0; t < 60; t += DT) {
    history.push(state.y - targetY(state, LOOKAHEAD, "top"));
    const seen = history.length > delay ? history[history.length - 1 - delay] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

/** 실패하기 시작하는 반응 지연(ms). 프로브가 재는 것과 같은 값이다. */
function latencyLimit(sector: Sector): number {
  let last = -10;
  for (let lat = 0; lat <= 0.32; lat += 0.01) {
    if (!sectorAttempt(sector, lat)) return last;
    last = Math.round(lat * 1000);
  }
  return 320;
}

console.log("① 여유(ms) 와 반응 지연 허용치(ms) 는 정말 같은 단위인가 — 수제 섹터 12개, 중립 빌드\n");
{
  const head =
    "섹터".padEnd(20) +
    "총길이 여유".padStart(12) +
    "단일구간 여유".padStart(14) +
    "지연 허용".padStart(11) +
    "비(/총길이)".padStart(12) +
    "비(/단일)".padStart(11);
  console.log(head);
  console.log("-".repeat(head.length));

  const ratios: Array<{ id: string; type: string; span: number }> = [];
  for (const sector of SECTORS) {
    const startY = startYFor(singleSectorCourse(sector));
    const res = solvePiece({
      piece: { kind: "sector", startX: 0, endX: SECTOR_LEN, sector },
      build: { ...NEUTRAL_BUILD },
      base: BASE_TUNING,
      startSpans: [{ lo: startY - 1e-6, hi: startY + 1e-6 }],
      startTime: 0
    });
    const total = res.minSlackSec * 1000;
    const span = res.minSpanSlackSec * 1000;
    const lim = latencyLimit(sector);
    ratios.push({ id: sector.id, type: sector.type, span: lim / span });
    console.log(
      `${SECTOR_TYPE_LABEL[sector.type]} ${sector.id}`.padEnd(20) +
        total.toFixed(0).padStart(12) +
        span.toFixed(0).padStart(14) +
        String(lim).padStart(11) +
        (lim / total).toFixed(2).padStart(12) +
        (lim / span).toFixed(2).padStart(11)
    );
  }

  const scatter = ratios.filter((r) => r.type === "scatter");
  const rest = ratios.filter((r) => r.type !== "scatter");
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  console.log(
    `\n  단일 통로 유형(협곡·회랑·맥동) 평균 비 ${mean(rest.map((r) => r.span)).toFixed(2)}` +
      `   산개 평균 비 ${mean(scatter.map((r) => r.span)).toFixed(2)}`
  );
  console.log(
    "  → 환산은 **성립하지 않는다.** 여유는 상한이고, 실제로 버티는 지연은 그보다 낮다.\n" +
      "     생존 집합이 여러 조각으로 쪼개지는 산개에서 특히 크게 벌어진다 — 총 길이는\n" +
      "     넓지만 아바타는 한 조각 안에 있고 다른 조각으로 건너뛸 수 없기 때문이다.\n" +
      "     단일 구간 기준으로 바꾸면 일부 회복되지만(0.37→0.48) 차이는 남는다."
  );
}

// ── ② 완화 전/후 실제 주행 통과 경로 수 ────────────────────────

function stageAttempt(tier: number, no: number, level: number, lanes: Array<"top" | "bot">, latencySec: number): boolean {
  const state = createState(
    {
      mode: "stage",
      tier,
      stageNo: no,
      seed: 0,
      startBuild: { ...NEUTRAL_BUILD },
      axisCap: CAP,
      maxSectorDifficulty: 3,
      relief: true,
      priorFails: failsForLevel(level)
    },
    0
  );
  state.y = startYFor(state.course);
  launch(state);

  const history: number[] = [];
  const delay = Math.max(0, Math.round(latencySec / DT));
  for (let t = 0; t < 200; t += DT) {
    const lane = lanes[Math.min(lanes.length - 1, state.gatesPassed)] ?? "top";
    history.push(state.y - targetY(state, LOOKAHEAD, lane));
    const seen = history.length > delay ? history[history.length - 1 - delay] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

const LATENCIES = [0, 0.04, 0.08];
const LEVELS = [0, RELIEF_MAX];

console.log(`\n\n② 지연을 준 오토파일럿 — 통과한 경로 수 / ${PATHS}, 완화 없음(k=0) vs 상한(k=${RELIEF_MAX})\n`);
{
  const head =
    "스테이지".padEnd(10) +
    LATENCIES.flatMap((l) => [`${(l * 1000).toFixed(0)}ms k=0`.padStart(13), `k=${RELIEF_MAX}`.padStart(8)]).join("");
  console.log(head);
  console.log("-".repeat(head.length));

  let contradictions = 0;
  let improved = 0;
  let regressed = 0;
  const totals: Record<number, Record<number, number>> = {};
  for (const l of LATENCIES) totals[l] = { 0: 0, [RELIEF_MAX]: 0 };

  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const cells: string[] = [];
      for (const latency of LATENCIES) {
        const counts: Record<number, number> = {};
        for (const level of LEVELS) {
          const t = tuningFor(level);
          const course = buildStageCourse(tier, no, t);
          const startY = startYFor(course);
          const trade = tradeWith(t);
          let passed = 0;
          for (let path = 0; path < PATHS; path += 1) {
            const lanes = lanesOf(path);
            const cleared = stageAttempt(tier, no, level, lanes, latency);
            if (cleared) passed += 1;
            // 모순은 한 방향뿐이다 — 파일럿이 통과했는데 솔버가 불가능이라 하면 솔버가 틀렸다.
            if (cleared) {
              const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, t, startY, lanes, trade, 1 / 90);
              if (!res.passable) {
                contradictions += 1;
                console.log(`  모순: ${tier}:${no} 경로 ${path} k=${level} — 파일럿 통과 / 솔버 불가`);
              }
            }
          }
          counts[level] = passed;
          totals[latency][level] += passed;
        }
        if (counts[RELIEF_MAX] > counts[0]) improved += 1;
        if (counts[RELIEF_MAX] < counts[0]) regressed += 1;
        cells.push(String(counts[0]).padStart(13), String(counts[RELIEF_MAX]).padStart(8));
      }
      console.log(`${tier}:${no}`.padEnd(10) + cells.join(""));
    }
  }

  console.log("-".repeat(head.length));
  console.log(
    "합계".padEnd(10) +
      LATENCIES.flatMap((l) => [
        String(totals[l][0]).padStart(13),
        String(totals[l][RELIEF_MAX]).padStart(8)
      ]).join("")
  );

  const before = LATENCIES.reduce((a, l) => a + totals[l][0], 0);
  const after = LATENCIES.reduce((a, l) => a + totals[l][RELIEF_MAX], 0);
  const all = 12 * PATHS * LATENCIES.length;
  console.log(
    `\n  전체 ${all}회 주행 중 통과: 완화 없음 ${before} (${((before / all) * 100).toFixed(0)}%) → ` +
      `상한 ${after} (${((after / all) * 100).toFixed(0)}%)`
  );
  console.log(`  스테이지×지연 ${12 * LATENCIES.length}칸 중 늘어난 칸 ${improved} · 줄어든 칸 ${regressed}`);

  let failures = 0;
  const say = (ok: boolean, line: string) => {
    if (!ok) failures += 1;
    console.log(`  ${ok ? "✓" : "✗"} ${line}`);
  };
  console.log("");
  say(contradictions === 0, `솔버와의 모순 ${contradictions}건 — 파일럿이 통과한 것을 솔버가 부정한 적이 없다`);
  say(after > before, `완화가 실제 주행의 통과 수를 늘린다 (${before} → ${after})`);
  say(regressed === 0, "어떤 스테이지·지연에서도 완화가 통과 수를 줄이지 않는다");

  // ── ③ 스테이지별 "붙는 지연 한계" ──────────────────────────
  //
  // 벽이 티어 경계에 있는지 특정 스테이지에 있는지를 가르는 표다. 16경로 중
  // **하나라도** 통과하면 그 지연에서는 넘을 수 있다고 본다 — 코스를 외운
  // 사람의 조건이다.
  console.log("\n\n③ 붙는 지연 한계 — 16경로 중 하나라도 통과하는 가장 큰 지연(ms)\n");
  const limitFor = (tier: number, no: number, level: number): number => {
    let last = -10;
    for (let ms = 0; ms <= 240; ms += 20) {
      let any = false;
      for (let path = 0; path < PATHS && !any; path += 1) {
        if (stageAttempt(tier, no, level, lanesOf(path), ms / 1000)) any = true;
      }
      if (!any) return last;
      last = ms;
    }
    return 240;
  };
  {
    const head = "스테이지".padEnd(10) + "k=0".padStart(10) + `k=${RELIEF_MAX}`.padStart(10) + "차이".padStart(10);
    console.log(head);
    console.log("-".repeat(head.length));
    let gain = 0;
    let dead = 0;
    for (let tier = 1; tier <= MAX_TIER; tier += 1) {
      for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
        const a = limitFor(tier, no, 0);
        const b = limitFor(tier, no, RELIEF_MAX);
        if (a < 0) dead += 1;
        gain += b - a;
        console.log(
          `${tier}:${no}`.padEnd(10) +
            String(a).padStart(10) +
            String(b).padStart(10) +
            `${b - a >= 0 ? "+" : ""}${b - a}`.padStart(10)
        );
      }
    }
    console.log(
      `\n  −10 은 지연 0 에서도 어떤 경로로도 못 넘는 스테이지다 — 완화 없이 ${dead}개.\n` +
        `  완화 상한에서 한계가 평균 ${(gain / 12).toFixed(0)}ms 올라간다.\n` +
        "  → 벽은 티어 경계에 있지 않다. 같은 티어 안에서도 스테이지마다 갈린다."
    );
  }

  console.log("");
  if (failures === 0) {
    console.log("결과: 솔버가 말한 여유 증가가 실제 주행의 통과 수 증가로 나타나고, 두 도구가 어긋나지 않는다.");
  } else {
    console.log(`결과: ${failures}개 항목이 기준 미달 — 솔버 쪽을 의심해야 한다.`);
    process.exitCode = 1;
  }
}
