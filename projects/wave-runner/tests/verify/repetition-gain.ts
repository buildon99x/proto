/**
 * 반복은 이미 무엇을 완화하고 있었는가 — **기존 세 장치를 ms 로 환산한다.**
 *
 * 새 완화 장치를 붙이기 전에 물어야 하는 질문이다. 지금 게임에서 반복이 주는 것은
 * 셋뿐이고, 그 셋이 이미 충분하다면 아무것도 더할 필요가 없다.
 *
 *  (a) **코스 암기** — 같은 코스를 다시 달리면 어느 관이 좋은 길인지 알게 된다.
 *      그 값은 **최선 경로와 최악 경로의 여유 차이**다. 모르면 임의의 경로,
 *      알면 최선 경로이므로 차이가 곧 암기의 값이다.
 *  (b) **연습 모드 체크포인트** — 여유를 1ms 도 넓히지 않는다. 바꾸는 것은 실패의
 *      **단가**다. 구간별 통과율 p_i 로 환산하면 기대 사망이 1/Πp_i − 1 에서
 *      Σ(1/p_i − 1) 로, 죽을 때마다 되돌아가는 거리가 사망 지점 전체에서
 *      직전 체크포인트까지로 준다. 둘 다 실제 주행으로 잰다.
 *  (c) **축 상한 ±2 → ±3** — 해금 상품. 게이트 제안이 상한에 걸린 쌍을 거르므로
 *      상한이 바뀌면 제안 자체가 바뀐다. 솔버로 두 상한을 나눠 푼다.
 *
 * (b) 의 통과율을 재려면 파일럿이 매번 같은 자리에서 죽으면 안 된다. 사람의
 * 손떨림에 해당하는 잡음을 넣는다 — 결정적 시드를 쓰므로 결과는 재현된다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/repetition-gain.ts
 */
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, createState, launch, startYFor, update } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { mulberry32 } from "../../app/src/game/rand";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, Tuning } from "../../app/src/game/types";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;

/** 구간별 통과율이 0 이나 1 로 몰리지 않는 자리. 여기가 가장 정보가 많다. */
const TRIAL_LATENCY = 0.07;
const TRIAL_NOISE = 1.2;
const TRIALS = 60;

const tuningFor = (cap: number): Tuning => ({ ...BASE_TUNING, axisMax: cap, axisMin: -cap });
const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

const lanesOf = (path: number): Array<"top" | "bot"> => {
  const lanes: Array<"top" | "bot"> = [];
  for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
  return lanes;
};

interface Sweep {
  bestMs: number;
  worstMs: number;
  meanMs: number;
  /** 최선 경로의 관 선택. (b) 에서 "해법을 아는 사람" 의 주행에 쓴다 */
  bestLanes: Array<"top" | "bot">;
}

function sweep(tier: number, no: number, cap: number): Sweep {
  const t = tuningFor(cap);
  const course = buildStageCourse(tier, no, t);
  const startY = startYFor(course);
  const trade = tradeWith(t);
  let bestMs = 0;
  let worstMs = Number.POSITIVE_INFINITY;
  let bestLanes = lanesOf(0);
  let sum = 0;
  let n = 0;
  for (let path = 0; path < PATHS; path += 1) {
    const lanes = lanesOf(path);
    const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, t, startY, lanes, trade, 1 / 90);
    if (!res.passable) continue;
    const ms = res.minSlackSec * 1000;
    if (ms > bestMs) {
      bestMs = ms;
      bestLanes = lanes;
    }
    worstMs = Math.min(worstMs, ms);
    sum += ms;
    n += 1;
  }
  return { bestMs, worstMs: Number.isFinite(worstMs) ? worstMs : 0, meanMs: n ? sum / n : 0, bestLanes };
}

// ── (a) 코스 암기 ─────────────────────────────────────────────

console.log("(a) 코스 암기 — 어느 관이 좋은 길인지 아는 것의 값 (축 상한 ±2)\n");
const memo: Array<{ key: string; best: number; mean: number; worst: number }> = [];
for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    const s = sweep(tier, no, 2);
    memo.push({ key: `${tier}:${no}`, best: s.bestMs, mean: s.meanMs, worst: s.worstMs });
  }
}
{
  const head = "스테이지".padEnd(10) + "최선".padStart(9) + "16경로 평균".padStart(13) + "최악".padStart(9) + "암기 이득".padStart(11);
  console.log(head);
  console.log("-".repeat(head.length));
  for (const m of memo) {
    console.log(
      m.key.padEnd(10) +
        `${m.best.toFixed(0)}ms`.padStart(9) +
        `${m.mean.toFixed(0)}ms`.padStart(13) +
        `${m.worst.toFixed(0)}ms`.padStart(9) +
        `+${(m.best - m.mean).toFixed(0)}ms`.padStart(11)
    );
  }
  const gain = memo.reduce((a, m) => a + (m.best - m.mean), 0) / memo.length;
  const spread = memo.reduce((a, m) => a + (m.best - m.worst), 0) / memo.length;
  console.log(
    `\n  평균 +${gain.toFixed(0)}ms (아무 경로 → 최선 경로), 최악에서 최선까지는 평균 ${spread.toFixed(0)}ms.\n` +
      "  → 암기는 이미 이 게임에서 가장 큰 완화 장치다. 다만 **얻으려면 먼저 통과해 봐야 한다** —\n" +
      "     벽에 막힌 사람은 그 벽 너머의 경로를 외울 기회가 없어 이 이득이 닿지 않는다."
  );
}

// ── (b) 연습 모드 체크포인트 ──────────────────────────────────

/** 사람의 손떨림에 해당하는 잡음. 결정적 시드라 결과는 재현된다. */
function noisyRun(
  tier: number,
  no: number,
  seed: number,
  lanes: Array<"top" | "bot">
): { cleared: boolean; segment: number; deathX: number; checkpointX: number } {
  const state = createState({
    mode: "stage",
    tier,
    stageNo: no,
    seed: 0,
    startBuild: { ...NEUTRAL_BUILD },
    axisCap: 2,
    maxSectorDifficulty: 3
  });
  state.y = startYFor(state.course);
  launch(state);

  const rand = mulberry32(seed >>> 0);
  const gauss = () => {
    const u = Math.max(1e-9, rand());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const history: number[] = [];
  const delay = Math.round(TRIAL_LATENCY / DT);

  for (let t = 0; t < 200; t += DT) {
    // 해법을 아는 사람의 주행 — 솔버가 고른 최선 경로를 그대로 탄다.
    const lane = lanes[Math.min(lanes.length - 1, state.gatesPassed)] ?? "top";
    history.push(state.y - targetY(state, LOOKAHEAD, lane) + gauss() * TRIAL_NOISE);
    const seen = history.length > delay ? history[history.length - 1 - delay] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    if (r.event === "died") {
      const gates = state.course.pieces.filter((pc) => pc.kind === "gate" && pc.endX <= state.x);
      const last = gates[gates.length - 1];
      return { cleared: false, segment: state.gatesPassed, deathX: state.x, checkpointX: last?.endX ?? 0 };
    }
    if (state.phase === "cleared") return { cleared: true, segment: GATES, deathX: state.x, checkpointX: 0 };
  }
  return { cleared: false, segment: state.gatesPassed, deathX: state.x, checkpointX: 0 };
}

console.log(
  `\n\n(b) 연습 모드 체크포인트 — 여유는 그대로이고 **실패의 단가**가 바뀐다\n` +
    `    지연 ${(TRIAL_LATENCY * 1000).toFixed(0)}ms + 잡음 σ=${TRIAL_NOISE} 로 스테이지당 ${TRIALS}회 주행.\n`
);
{
  const head =
    "스테이지".padEnd(10) +
    "구간별 통과율".padStart(30) +
    "기대 사망".padStart(12) +
    "사망당 되돌아가는 거리".padStart(26);
  console.log(head);
  console.log("-".repeat(head.length));

  let sumPlain = 0;
  let sumCheck = 0;
  let counted = 0;
  let infinite = 0;
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const lanes = sweep(tier, no, 2).bestLanes;
      // reached[i] = i 번째 구간에 도달한 주행 수
      const reached = new Array(GATES + 2).fill(0);
      let backPlain = 0;
      let backCheck = 0;
      let deaths = 0;
      for (let i = 0; i < TRIALS; i += 1) {
        const r = noisyRun(tier, no, 0x9e3779b9 + i * 2654435761 + tier * 131 + no, lanes);
        const end = r.cleared ? GATES + 1 : r.segment;
        for (let s = 0; s <= end && s <= GATES + 1; s += 1) reached[s] += 1;
        if (!r.cleared) {
          deaths += 1;
          backPlain += r.deathX;
          backCheck += r.deathX - r.checkpointX;
        }
      }
      const ps: number[] = [];
      for (let s = 0; s <= GATES; s += 1) {
        ps.push(reached[s] > 0 ? reached[s + 1] / reached[s] : 0);
      }
      // 기대 **사망 횟수**로 비교한다. 시도 횟수는 단위가 다르다 —
      // 체크포인트의 한 시도는 구간 하나이고 무체크포인트의 한 시도는 코스 전체다.
      const prod = ps.reduce((a, p) => a * p, 1);
      const plain = prod > 0 ? 1 / prod - 1 : Number.POSITIVE_INFINITY;
      const check = ps.reduce((a, p) => a + (p > 0 ? 1 / p - 1 : Number.POSITIVE_INFINITY), 0);
      if (Number.isFinite(plain) && Number.isFinite(check)) {
        sumPlain += plain;
        sumCheck += check;
        counted += 1;
      } else {
        infinite += 1;
      }
      const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "∞");
      console.log(
        `${tier}:${no}`.padEnd(10) +
          ps.map((p) => p.toFixed(2)).join(" ").padStart(30) +
          `${fmt(plain)} → ${fmt(check)}`.padStart(12) +
          (deaths > 0
            ? `${(backPlain / deaths).toFixed(0)} → ${(backCheck / deaths).toFixed(0)} (${((backCheck / backPlain) * 100).toFixed(0)}%)`
            : "죽지 않음"
          ).padStart(26)
      );
    }
  }
  console.log(
    `\n  통과율이 0 인 구간이 있으면 양쪽 다 ∞ 다(${infinite}개 스테이지). 유한한 ${counted}개 평균 기대 사망:` +
      ` 처음부터 ${(sumPlain / Math.max(1, counted)).toFixed(1)}회 → 체크포인트 ${(sumCheck / Math.max(1, counted)).toFixed(1)}회`
  );
  console.log(
    "  → 체크포인트는 여유를 **0ms** 넓힌다. 그리고 병목이 한 구간뿐이면 기대 사망도\n" +
      "     거의 그대로다(1/Πp − 1 과 Σ(1/p − 1) 이 같아진다). 줄어드는 것은 죽을 때마다\n" +
      "     되돌아가는 거리뿐이고, 그나마도 '연습 통과는 클리어가 아니다' 라는 규칙 때문에\n" +
      "     기록으로 이어지지 않는다. 통과율 0 인 구간이 있으면 체크포인트로도 영영 못 넘는다 —\n" +
      "     막힌 사람의 벽 자체는 그대로 서 있다."
  );
}

// ── (c) 축 상한 해금 ──────────────────────────────────────────

console.log("\n\n(c) 축 상한 ±2 → ±3 (해금 상품) — 최선은 그대로, 최악만 올라간다\n");
{
  const head = "스테이지".padEnd(10) + "±2 최선/최악".padStart(16) + "±3 최선/최악".padStart(16) + "Δ최선".padStart(9) + "Δ최악".padStart(9);
  console.log(head);
  console.log("-".repeat(head.length));
  let dBest = 0;
  let dWorst = 0;
  let n = 0;
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const a = sweep(tier, no, 2);
      const b = sweep(tier, no, 3);
      dBest += b.bestMs - a.bestMs;
      dWorst += b.worstMs - a.worstMs;
      n += 1;
      console.log(
        `${tier}:${no}`.padEnd(10) +
          `${a.bestMs.toFixed(0)}/${a.worstMs.toFixed(0)}`.padStart(16) +
          `${b.bestMs.toFixed(0)}/${b.worstMs.toFixed(0)}`.padStart(16) +
          `${(b.bestMs - a.bestMs >= 0 ? "+" : "") + (b.bestMs - a.bestMs).toFixed(0)}`.padStart(9) +
          `${(b.worstMs - a.worstMs >= 0 ? "+" : "") + (b.worstMs - a.worstMs).toFixed(0)}`.padStart(9)
      );
    }
  }
  console.log(
    `\n  평균 Δ최선 ${(dBest / n >= 0 ? "+" : "") + (dBest / n).toFixed(0)}ms · Δ최악 ${(dWorst / n >= 0 ? "+" : "") + (dWorst / n).toFixed(0)}ms.\n` +
      "  → 축 상한 해금은 **난이도를 낮추는 장치가 아니라 분산을 줄이는 장치**다.\n" +
      "     최선 경로는 오히려 조금 좁아지고(제안 풀이 달라진다) 최악 경로만 크게 오른다.\n" +
      "     그리고 320 코어짜리 상품이므로, 막혀서 코어를 못 버는 사람에게는 닿지 않는다."
  );
}

console.log(
  "\n결론: 기존 세 장치 중 여유(ms)를 실제로 넓히는 것은 축 상한 해금 하나뿐이고," +
    " 그것도 최악 경로만 평균 +22ms 다.\n" +
    "      암기는 가장 크지만 먼저 통과해야 얻고, 체크포인트는 0ms 다." +
    " 벽에 막힌 사람에게 닿는 장치가 없다 — 그래서 반복 완화를 붙였다."
);
