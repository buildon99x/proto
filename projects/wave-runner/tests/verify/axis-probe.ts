/**
 * 부사 3축의 셋째를 무엇으로 할 것인가 — 실측 판정.
 *
 * core-loop.md §12 ① 의 미해결 쟁점. 크기(radius)는 작을수록 유리하기만 해서
 * 양날이 아니라는 의심이 있었고, 관성(inertiaMs)이 대안 후보였다.
 *
 * 축이 "진짜 양날"이려면 **섹터 유형에 따라 유불리가 뒤집혀야** 한다.
 * 한 방향이 모든 구간에서 좋기만 하면 그건 축이 아니라 스탯이다.
 *
 * 측정 방법: 통로 중앙을 추종하되 **반응 지연을 준** 오토파일럿으로 각 스테이지를
 * 반복 주행한다. 지연은 사람의 불완전함을 거칠게 대신한다. 지연을 키워가며
 * 처음 실패하는 지점을 찾으면 그것이 그 설정의 "여유"다. 여유가 클수록 쉽다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/axis-probe.ts
 */
import { STAGES } from "../../app/src/game/stages";
import { sample } from "../../app/src/game/stages";
import { BASE_TUNING, createState, launch, update } from "../../app/src/game/engine";
import type { Tuning } from "../../app/src/game/types";

const DT = 1 / 120;
const MAX_SEC = 40;

/** 지연 latencySec 만큼 낡은 상태를 보고 조종하는 오토파일럿으로 1회 주행. */
function attempt(stageIndex: number, tuning: Tuning, latencySec: number): boolean {
  const state = createState(stageIndex, tuning);
  launch(state);

  const delay: Array<{ x: number; y: number }> = [];
  const delayFrames = Math.max(0, Math.round(latencySec / DT));
  let t = 0;

  while (t < MAX_SEC) {
    delay.push({ x: state.x, y: state.y });
    const seen = delay.length > delayFrames ? delay[delay.length - 1 - delayFrames] : delay[0];

    const stage = STAGES[stageIndex];
    const lead = tuning.speed * 0.12;
    const { top, bot } = sample(stage.nodes, seen.x + lead);
    state.holding = seen.y > (top + bot) / 2;

    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
    t += DT;
  }
  return false;
}

/** 실패하기 시작하는 지연(초). 클수록 여유가 크고 쉽다. */
function tolerance(stageIndex: number, tuning: Tuning): number {
  let last = 0;
  for (let lat = 0; lat <= 0.5; lat += 0.01) {
    if (!attempt(stageIndex, tuning, lat)) return last;
    last = lat;
  }
  return 0.5;
}

const CANDIDATES: Array<{ label: string; tuning: Tuning }> = [
  { label: "기준 (관성 0, 크기 1.6)", tuning: { ...BASE_TUNING } },
  { label: "관성 −  (0ms)", tuning: { ...BASE_TUNING, inertiaMs: 0 } },
  { label: "관성 +  (120ms)", tuning: { ...BASE_TUNING, inertiaMs: 120 } },
  { label: "크기 −  (r 1.0)", tuning: { ...BASE_TUNING, radius: 1.0 } },
  { label: "크기 +  (r 2.4)", tuning: { ...BASE_TUNING, radius: 2.4 } }
];

const rows: Array<{ label: string; tol: number[] }> = [];
for (const c of CANDIDATES) {
  const tol = STAGES.map((_, i) => tolerance(i, c.tuning));
  rows.push({ label: c.label, tol });
}

const header = ["설정".padEnd(22), ...STAGES.map((s) => `${s.id}.${s.name}`.padStart(12))].join(" ");
console.log(header);
console.log("-".repeat(header.length));
for (const r of rows) {
  console.log([r.label.padEnd(22), ...r.tol.map((v) => `${(v * 1000).toFixed(0)}ms`.padStart(12))].join(" "));
}

// 판정: 어떤 축이 섹터 유형에 따라 유불리를 뒤집는가
function verdict(minusIdx: number, plusIdx: number, name: string) {
  const minus = rows[minusIdx].tol;
  const plus = rows[plusIdx].tol;
  const better = STAGES.map((_, i) => (plus[i] > minus[i] ? "+" : plus[i] < minus[i] ? "-" : "="));
  const hasPlus = better.includes("+");
  const hasMinus = better.includes("-");
  console.log(
    `\n${name}: 구간별 우세 [${better.join(" ")}] → ` +
      (hasPlus && hasMinus ? "양날 (축 자격 있음)" : "한쪽만 유리 (스탯이지 축이 아님)")
  );
}

verdict(1, 2, "관성");
verdict(3, 4, "크기");
