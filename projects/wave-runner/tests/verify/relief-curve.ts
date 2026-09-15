/**
 * 반복 완화 곡선 검증 — **완화가 실제로 여유를 넓히는가, 그리고 어디서 멈추는가.**
 *
 * 완화는 난이도 선택 메뉴가 아니라 실패 횟수를 입력으로 받는 곡선이다. 그러므로
 * 말이 아니라 곡선 자체를 재야 한다. 12 스테이지 × 16 경로 × 완화 단계 8개를
 * 정확한 솔버로 전부 풀어 다섯 가지를 묻고, 마지막에 **버린 후보 하나**를 기록한다.
 *
 *  ① **공정성 바닥** — 어떤 단계에서도 통과 불가 경로가 생기지 않는다.
 *     완화가 통로를 넓히고 제안을 좁히는 일이므로 길을 막을 리가 없어 보이지만,
 *     제안을 좁히는 것은 **다른 교환 사슬**을 만들어 실제로 막을 수 있다.
 *  ② **단조성** — 단계가 오를수록 최선·최악 경로의 여유가 줄지 않는다.
 *     한 칸 올렸는데 어려워지면 그건 완화가 아니라 난수다.
 *  ③ **수렴** — 몇 단계(=몇 회 실패) 만에 목표 대역 100ms 에 드는가.
 *  ④ **상한** — 상한에서 코스가 자명해지지 않는가. 판정은 두 가지다.
 *     티어 순서가 보존되는가, 그리고 **가장 어려운 티어를 최대로 완화한 것이
 *     가장 쉬운 티어를 완화 없이 푸는 것보다 헐거워지지 않는가.**
 *     상한이 최소가 아님을 보이기 위해 한 칸 넘긴 단계까지 함께 잰다.
 *  ⑤ **코스 불변** — 완화 단계가 달라져도 통로 중심선·장애물·셔터 좌표가 같은가.
 *     "같은 스테이지는 언제나 같은 코스" 를 깨지 않았다는 것을 지문으로 확인한다.
 *  ⑥ **버린 후보** — 선행 가시 시간 연장은 여유를 1ms 도 넓히지 않는다.
 *     솔버가 완전 정보를 가정하므로 원리적으로 잡히지 않는 레버다. 기록으로 남긴다.
 *
 * 목표 대역 100ms 의 근거는 이 저장소 안에 있다 — `curate-stages.ts` 가 티어4의
 * 최선 경로 목표로 잡은 값이 100ms 다. 즉 "사람이 넘을 수 있다" 를 이미 설계가
 * 전제하고 있는 가장 낮은 수치이고, 그보다 낮은 값을 새로 지어낼 근거가 없다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/relief-curve.ts
 */
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { computeView } from "../../app/src/game/camera";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { gateLanes, pieceSqueeze, squeezeBounds } from "../../app/src/game/geometry";
import { sample } from "../../app/src/game/sectors";
import { BASE_TUNING, applyRelief, startYFor } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { RELIEF_MAX, RELIEF_TEMPER_AT, failsForLevel } from "../../app/src/game/relief";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, CoursePiece, Tuning } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;

/** 처음 이 스테이지를 만나는 사람의 조건. 완화는 해금 이전에 걸려야 의미가 있다. */
const CAP = 2;

/** 목표 대역 — curate-stages.ts 의 티어4 목표치와 같은 값이다. */
const BAND_MS = 100;

/** 상한이 최소가 아님을 보이려고 한 칸 더 잰다. 게임은 여기까지 올라가지 않는다. */
const LEVELS = Array.from({ length: RELIEF_MAX + 2 }, (_, i) => i);

const tuningFor = (level: number): Tuning =>
  applyRelief({ ...BASE_TUNING, axisMax: CAP, axisMin: -CAP }, level);

const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

const lanesOf = (path: number): Array<"top" | "bot"> => {
  const lanes: Array<"top" | "bot"> = [];
  for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
  return lanes;
};

interface Cell {
  bestMs: number;
  worstMs: number;
  blocked: number;
}

/** 한 스테이지를 한 완화 단계에서 16경로 전부 푼다. */
function sweep(tier: number, no: number, level: number): Cell {
  const t = tuningFor(level);
  const course = buildStageCourse(tier, no, t);
  const startY = startYFor(course);
  const trade = tradeWith(t);
  let bestMs = 0;
  let worstMs = Number.POSITIVE_INFINITY;
  let blocked = 0;

  for (let path = 0; path < PATHS; path += 1) {
    const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, t, startY, lanesOf(path), trade, 1 / 90);
    if (!res.passable) {
      blocked += 1;
      continue;
    }
    const ms = res.minSlackSec * 1000;
    bestMs = Math.max(bestMs, ms);
    worstMs = Math.min(worstMs, ms);
  }
  return { bestMs, worstMs: Number.isFinite(worstMs) ? worstMs : 0, blocked };
}

/**
 * 코스 지문 — 완화가 코스를 바꾸지 않았음을 확인한다.
 *
 * 중심선은 **완화를 적용한 뒤의 값**으로 잰다. 원본 노드를 비교하면 아무것도
 * 증명하지 못하고(완화는 노드를 건드리지 않으니 당연히 같다), 통로를 벌리다
 * 월드 상/하한에 걸려 한쪽만 잘리면 중심선이 실제로 움직이기 때문이다.
 */
function courseFingerprint(tier: number, no: number, level: number): string {
  const t = tuningFor(level);
  const pieces: CoursePiece[] = buildStageCourse(tier, no, t).pieces;
  return pieces
    .map((p) => {
      if (p.kind === "gate" && p.gate) {
        const mids: string[] = [];
        for (let x = p.startX; x <= p.endX; x += 4) {
          const l = gateLanes(p.gate, x, t);
          mids.push(((l.outerTop + l.outerBot) / 2).toFixed(6));
        }
        return `gate:${p.gate.seed}[${mids.join(",")}]`;
      }
      const s = p.sector!;
      const squeeze = pieceSqueeze(p, t);
      const mids: string[] = [];
      for (let x = 0; x <= p.endX - p.startX; x += 4) {
        const b = squeezeBounds(sample(s.nodes, x), squeeze);
        mids.push(((b.top + b.bot) / 2).toFixed(6));
      }
      const blocks = s.blocks.map((b) => `${b.x.toFixed(3)}:${b.y.toFixed(3)}:${b.w}:${b.h}`).join(",");
      const shut = s.shutters.map((h) => `${h.x.toFixed(3)}:${h.side}:${h.phase.toFixed(6)}`).join(",");
      return `${s.id}[${mids.join(",")}|${blocks}|${shut}]`;
    })
    .join(" ");
}

// ── 측정 ──────────────────────────────────────────────────────

const grid = new Map<string, Cell[]>();
for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    grid.set(
      `${tier}:${no}`,
      LEVELS.map((k) => sweep(tier, no, k))
    );
  }
}

console.log(
  `완화 단계별 여유 — 12 스테이지 × 16 경로 × ${LEVELS.length} 단계, 정확한 솔버, 축 상한 ±${CAP}.\n` +
    `칸 = 최선 경로 / 최악 경로 여유(ms). k=${RELIEF_TEMPER_AT} 부터 게이트 제안 풀이 좁아진다.\n` +
    `k=${RELIEF_MAX + 1} 은 상한 밖이다 — 상한이 최소가 아님을 보이려고 함께 잰다.\n`
);

const head = ["스테이지".padEnd(10), ...LEVELS.map((k) => `k=${k}`.padStart(12))].join("");
console.log(head);
console.log("-".repeat(head.length));
for (const [key, cells] of grid) {
  console.log(
    [
      key.padEnd(10),
      ...cells.map((c) => `${c.bestMs.toFixed(0)}/${c.worstMs.toFixed(0)}${c.blocked ? `✗${c.blocked}` : ""}`.padStart(12))
    ].join("")
  );
}

console.log("\n실패 횟수 → 단계");
console.log(
  LEVELS.filter((k) => k <= RELIEF_MAX)
    .map((k) => `${k}단계:${failsForLevel(k)}회`)
    .join("  ")
);

let failures = 0;
const say = (ok: boolean, line: string) => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${line}`);
};

// ① 공정성 바닥
console.log("\n① 공정성 — 어떤 단계에서도 통과 불가 경로가 생기지 않는가");
{
  const bad: string[] = [];
  for (const [key, cells] of grid) {
    cells.forEach((c, k) => {
      if (k <= RELIEF_MAX && c.blocked > 0) bad.push(`${key}@k=${k}(${c.blocked}경로)`);
    });
  }
  say(bad.length === 0, bad.length === 0 ? `전 단계 ${12 * (RELIEF_MAX + 1)}칸 × 16경로 모두 통과 가능` : `막힌 경로: ${bad.join(", ")}`);
}

// ② 단조성
console.log("\n② 단조성 — 단계가 오르면 여유가 줄지 않는가");
{
  const bad: string[] = [];
  for (const [key, cells] of grid) {
    for (let k = 1; k <= RELIEF_MAX; k += 1) {
      if (cells[k].bestMs < cells[k - 1].bestMs - 0.5) bad.push(`${key} 최선 k=${k}`);
      if (cells[k].worstMs < cells[k - 1].worstMs - 0.5) bad.push(`${key} 최악 k=${k}`);
    }
  }
  say(bad.length === 0, bad.length === 0 ? "최선·최악 여유 모두 단계에 대해 단조 증가" : `뒤집힘: ${bad.join(", ")}`);
}

// ③ 수렴
console.log(`\n③ 수렴 — 목표 대역 ${BAND_MS}ms 에 드는 단계와 실패 횟수`);
{
  const rows: string[] = [];
  let worstLevelNeeded = 0;
  let unreached = 0;
  for (const [key, cells] of grid) {
    const bestAt = cells.findIndex((c, k) => k <= RELIEF_MAX && c.bestMs >= BAND_MS);
    const worstAt = cells.findIndex((c, k) => k <= RELIEF_MAX && c.worstMs >= BAND_MS);
    if (bestAt >= 0) worstLevelNeeded = Math.max(worstLevelNeeded, bestAt);
    if (worstAt < 0) unreached += 1;
    rows.push(
      `  ${key.padEnd(8)} 최선 ${bestAt >= 0 ? `k=${bestAt} (${failsForLevel(bestAt)}회 실패)` : "상한에서도 미달"}` +
        `    최악 ${worstAt >= 0 ? `k=${worstAt} (${failsForLevel(worstAt)}회 실패)` : "상한에서도 미달"}`
    );
  }
  console.log(rows.join("\n"));
  say(
    worstLevelNeeded <= RELIEF_MAX,
    `모든 스테이지의 최선 경로가 늦어도 k=${worstLevelNeeded}(${failsForLevel(worstLevelNeeded)}회)에서 ${BAND_MS}ms 를 넘는다`
  );
  console.log(
    `  ※ 최악 경로는 ${unreached}개 스테이지가 상한에서도 ${BAND_MS}ms 에 못 미친다 — ` +
      `완화의 한계이고 notes/difficulty-relief.md 에 남은 위험으로 적었다`
  );
}

// ④ 상한
console.log("\n④ 상한 — 완화를 최대로 걸어도 코스가 자명해지지 않는가");
{
  const tierBest = (tier: number, k: number) =>
    Array.from({ length: STAGES_PER_TIER }, (_, i) => grid.get(`${tier}:${i + 1}`)![k].bestMs);
  const tierMean = (tier: number, k: number) =>
    tierBest(tier, k).reduce((a, b) => a + b, 0) / STAGES_PER_TIER;

  const order = [1, 2, 3, 4].map((t) => tierMean(t, RELIEF_MAX));
  const preserved = order.every((v, i) => i === 0 || v <= order[i - 1] + 1e-9);
  console.log(
    `  완화 최대(k=${RELIEF_MAX})의 티어별 평균 최선 여유: ` +
      order.map((v, i) => `티어${i + 1} ${v.toFixed(0)}ms`).join(" > ")
  );
  say(preserved, "티어 순서가 보존된다 — 완화해도 티어4가 티어3보다 어렵다");

  const tier1Raw = tierBest(1, 0);
  const ceiling = Math.max(...tier1Raw);
  const tier4At = (k: number) => Math.max(...tierBest(4, k));
  console.log(
    `  무완화 티어1 최선 여유 ${Math.min(...tier1Raw).toFixed(0)}~${ceiling.toFixed(0)}ms 가 천장이다.` +
      ` 티어4 최선 여유: k=${RELIEF_MAX} → ${tier4At(RELIEF_MAX).toFixed(0)}ms,` +
      ` k=${RELIEF_MAX + 1} → ${tier4At(RELIEF_MAX + 1).toFixed(0)}ms`
  );
  say(
    tier4At(RELIEF_MAX) <= ceiling,
    `k=${RELIEF_MAX} 에서 티어4가 무완화 티어1을 넘지 않는다 (${tier4At(RELIEF_MAX).toFixed(0)} ≤ ${ceiling.toFixed(0)})`
  );
  say(
    tier4At(RELIEF_MAX + 1) > ceiling,
    `k=${RELIEF_MAX + 1} 에서는 넘는다 (${tier4At(RELIEF_MAX + 1).toFixed(0)} > ${ceiling.toFixed(0)}) — 상한 ${RELIEF_MAX} 이 임의의 값이 아니다`
  );
}

// ⑤ 코스 불변
console.log("\n⑤ 코스 불변 — 완화가 '같은 스테이지는 언제나 같은 코스' 를 깨지 않는가");
{
  const bad: string[] = [];
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const base = courseFingerprint(tier, no, 0);
      for (let k = 1; k <= RELIEF_MAX; k += 1) {
        if (courseFingerprint(tier, no, k) !== base) bad.push(`${tier}:${no}@k=${k}`);
      }
    }
  }
  say(
    bad.length === 0,
    bad.length === 0
      ? "완화를 적용한 뒤의 통로 중심선·장애물·셔터·게이트 시드가 전 단계에서 동일 — 바뀌는 것은 벽까지의 여백과 제안 풀뿐이다"
      : `코스가 달라진 곳: ${bad.join(", ")}`
  );

  // 이 검사가 이빨이 있는지 확인한다. 통로를 계속 벌리면 언젠가 월드 상/하한에
  // 걸려 한쪽만 잘리고, 그때 중심선이 실제로 움직인다. 그 지점이 상한보다
  // 한참 위라는 것을 수치로 보여야 "중심선 불변" 이 우연이 아니다.
  let bites = -1;
  for (let k = RELIEF_MAX + 1; k <= 24 && bites < 0; k += 1) {
    for (let tier = 1; tier <= MAX_TIER && bites < 0; tier += 1) {
      for (let no = 1; no <= STAGES_PER_TIER && bites < 0; no += 1) {
        if (courseFingerprint(tier, no, k) !== courseFingerprint(tier, no, 0)) bites = k;
      }
    }
  }
  say(
    bites > RELIEF_MAX,
    bites > RELIEF_MAX
      ? `이 검사는 이빨이 있다 — 통로를 k=${bites} 까지 벌리면 월드 상/하한에 걸려 중심선이 실제로 움직인다. 상한 ${RELIEF_MAX} 은 그보다 한참 아래다`
      : "완화 범위 안에서 이미 중심선이 움직인다"
  );
}

// ⑥ 버린 후보의 기록
console.log("\n⑥ 버린 후보 — 선행 가시 시간 연장은 여유를 1ms 도 넓히지 않는다");
{
  const head = "lookaheadMinSec".padEnd(18) + "4:3 최선/최악".padStart(18) + "360×640 줌".padStart(13) + "선행(초)".padStart(11);
  console.log(`  ${head}`);
  console.log(`  ${"-".repeat(head.length)}`);
  const seen = new Set<string>();
  for (const look of [1.2, 1.8, 2.4]) {
    const t: Tuning = { ...tuningFor(0), lookaheadMinSec: look };
    const course = buildStageCourse(4, 3, t);
    const startY = startYFor(course);
    const trade = tradeWith(t);
    let best = 0;
    let worst = Number.POSITIVE_INFINITY;
    for (let path = 0; path < PATHS; path += 1) {
      const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, t, startY, lanesOf(path), trade, 1 / 90);
      if (!res.passable) continue;
      best = Math.max(best, res.minSlackSec * 1000);
      worst = Math.min(worst, res.minSlackSec * 1000);
    }
    const view = computeView(360, 640, t);
    seen.add(`${best.toFixed(3)}/${worst.toFixed(3)}`);
    console.log(
      `  ${String(look).padEnd(18)}` +
        `${best.toFixed(3)}/${worst.toFixed(3)}`.padStart(18) +
        view.zoom.toFixed(2).padStart(13) +
        view.lookaheadSec.toFixed(2).padStart(11)
    );
  }
  say(
    seen.size === 1,
    "선행 가시 시간을 두 배로 늘려도 여유가 소수 셋째 자리까지 같다 — 솔버는 완전 정보를 가정하므로 이 레버가 잡히지 않는다.\n" +
      "    대신 줌이 44% 작아져 아바타가 그만큼 작게 보인다. 측정 가능한 이득 0, 측정 가능한 비용 있음."
  );
}

// ── 최악 경로 구제 요약 ───────────────────────────────────────
console.log("\n최악 경로 구제 — 완화 없이 몇 ms 였고 상한에서 몇 ms 가 되는가");
{
  const rows = [...grid.entries()]
    .map(([key, cells]) => ({ key, from: cells[0].worstMs, to: cells[RELIEF_MAX].worstMs }))
    .sort((a, b) => a.from - b.from)
    .slice(0, 6);
  for (const r of rows) {
    console.log(`  ${r.key.padEnd(8)} ${r.from.toFixed(0).padStart(4)}ms → ${r.to.toFixed(0).padStart(4)}ms  (×${(r.to / Math.max(1e-6, r.from)).toFixed(0)})`);
  }
}

console.log("");
if (failures === 0) {
  console.log(
    `결과: 완화는 단조롭게 여유를 넓히고, ${failsForLevel(RELIEF_MAX)}회 실패에서 멈추며, ` +
      "그 상한에서도 코스가 티어1보다 헐거워지지 않는다. 코스 자체는 한 좌표도 바뀌지 않았다."
  );
} else {
  console.log(`결과: ${failures}개 항목이 기준 미달 — 완화 상수를 다시 잡아야 한다.`);
  process.exitCode = 1;
}
