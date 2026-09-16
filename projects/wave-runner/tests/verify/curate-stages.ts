/**
 * 스테이지 시드 큐레이션 — 정확한 솔버로 **여유(slack)** 를 겨냥한다.
 *
 * 2단계에서는 오토파일럿 통과율로 골랐다. 3단계의 솔버로 다시 재보니 통과 가능성은
 * 거의 모든 경로에서 참이었고(94~100%), 대신 **여유가 최선 198ms 와 최악 10ms 로**
 * 갈렸다. 통과 가능하지만 여유 10ms 인 경로는 사람에게는 불가능하다.
 *
 * 좋은 스테이지는 네 가지를 만족한다.
 *
 *  1. **공정성** — 모든 경로가 통과 가능하고, **최악 경로도 사람이 낼 수 있어야 한다.**
 *  2. **난이도** — 최선 경로의 여유가 티어별 목표 구간에 들어야 한다.
 *  3. **차별화** — 다른 스테이지와 코스가 달라야 한다. 같은 길을 다시 달리면 티어가
 *     오른 의미가 없다.
 *  4. **티어의 성격** — 티어마다 주로 묻는 것이 달라야 한다.
 *
 * ## 0.5.1 에서 바뀐 것과 그 근거
 *
 * **① 공정성에 하한이 생겼다.** 그전까지 1번 기준은 `passable` 뿐이었는데, 솔버의
 * `passable` 은 여유 3ms 도 참이다. 실제로 12스테이지 중 4개가 사람에게 불가능한
 * 경로를 품고 있었고(티어 1 의 두 스테이지는 16경로 중 8개), 검증은 전부 통과하고
 * 있었다. "보이지 않는 막다른 길 금지"가 형식적으로만 지켜지고 있었던 것이다.
 *
 * 하한을 얼마로 둘지는 다행히 예민하지 않다. 후보들의 최악 여유 분포가 **양극**이라
 * (티어 4 기준 0~10ms 48개 · 60ms 이상 145개 · 그 사이 3개) 30ms 로 잡든 60ms 로
 * 잡든 남는 후보가 같다. 50ms 는 그 골짜기 한가운데다.
 *
 * **② 최소 스프레드 기준을 없앴다.** 후보 900개 × 4티어를 전수로 풀어 보니 스프레드는
 * 어떤 값(0/20/35)에서도 병목이 아니었다. 더 나쁜 것은 방향이다 — 스프레드는 최선과
 * 최악의 차이이므로 **함정이 깊을수록 높은 점수를 받는다.** 실제로 함정이 가장 깊던
 * 두 스테이지의 스프레드가 206ms, 207ms 로 가장 높았다. 하한이 생긴 이상 이 기준은
 * 중복이면서 유해하다.
 *
 * **③ 첫 합격에서 멈추지 않는다.** 그전에는 조건을 만족하는 첫 시드를 잡고 `break`
 * 했다. 그래서 인접 티어가 같은 modal 골격으로 빨려 들어갔고, T2·3 과 T3·1 은 섹터
 * 배열이 **완전히 같아졌다.** 이제 후보를 모두 모은 뒤, 이미 채택한 코스와 같은 자리
 * 섹터가 3개 이상 겹치면 건너뛴다(티어를 가로질러 본다).
 *
 * **④ 티어마다 성격을 요구한다.** 시드가 만들 수 있는 골격은 티어당 480여 가지로
 * 충분한데, 기준이 여유만 보니 전부 비슷한 것으로 수렴했다. 무엇을 묻는 티어인지를
 * 기준에 적어 둔다.
 *
 * ## 0.5.2 에서 더해진 것
 *
 * **⑤ 목표 사다리를 도달 가능한 범위로 다시 잡았다.** 공정성 하한이 생긴 뒤의 후보
 * 분포를 재서(티어당 900개 전수) 200/180/150/130 으로 옮겼다. 그전 190/160/130/100 은
 * 티어 4 에서 도달 불가라 밴드 완화가 상시 걸렸다 — 목표가 목표 노릇을 못 했다.
 *
 * **⑥ 최난 구간의 지속 길이를 티어 지표로 들였다.** 여유의 최솟값만으로는 난이도의
 * 성격을 말할 수 없다 — 한 번의 실수를 묻는 146ms 와 9초 내내 묻는 146ms 는 같은
 * 숫자가 아니다. 분포를 재보니 이 축은 **티어 4 에서만 존재한다**: 티어 1~3 후보는
 * 전부 최난 구간이 140단위 이하인데(구조적으로 뾰족할 수밖에 없다) 티어 4 는 146개 중
 * 88개가 330단위 이상이다. 그래서 티어 4 에만 "지속형" 을 요구한다.
 *
 * 이것이 티어 4 의 정체성을 바꾼다. 여유로는 티어 3(158ms)과 티어 4(146ms)를 12ms
 * 밖에 못 벌리지만, 지속 길이로는 45~79단위 대 352~373단위로 **5배 이상** 벌어진다.
 * 티어 4 는 "더 좁다" 가 아니라 **"더 오래 좁다"** 가 된다.
 *
 * **⑦ 해금이 난이도를 되돌리지 못하게 했다.** ±3 에서 곡선이 역전돼 있었다(티어 3 이
 * 티어 2 보다 쉬웠다). 한 스테이지가 ±2 에서 143ms 인데 ±3 에서 200ms 로 튀는 식이다.
 * 큐레이션이 ±2 로만 재고 ±3 은 공정성만 물었기 때문이다. 이제 두 상한의 최선 여유
 * 차이를 `AXIS_CAP_DRIFT_MS` 안으로 묶는다.
 *
 * **⑧ 섹터 커버리지를 동점 처리에 넣었다.** 목표 근접도가 비슷한 후보들 사이에서는
 * 아직 안 쓴 섹터를 데려오는 쪽을 고른다. 목표를 희생하지 않으면서 12개 섹터를 고루 쓴다.
 *
 * ## 완화 순서
 *
 * 조건을 다 만족하는 후보가 3개에 못 미치면 **지속 → 성격 → 밴드 → 드리프트** 순으로
 * 푼다. **공정성과 차별화는 절대 풀지 않는다.** 함정을 되살리거나 같은 코스를 다시
 * 내느니 목표 여유에서 벗어나는 편이 낫다. 드리프트를 맨 뒤에 두는 것은 ±3 역전이
 * 0.5.2 에서 고친 바로 그 문제이기 때문이다.
 *
 * 현재 설정에서는 네 티어 모두 완화 없이 채워진다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { measure } from "../../app/src/game/geometry";
import { MAX_TIER, STAGES_PER_TIER, stageKey } from "../../app/src/game/meta";
import { SECTORS } from "../../app/src/game/sectors";
import { PEAK_RUN_RULE, targetSlackMs } from "./tiers";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, SectorType } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const CANDIDATES = 900;

const SLACK_BAND_MS = 25;
/**
 * 두 축 상한 사이에서 최선 여유가 흔들려도 되는 폭.
 *
 * **해금은 출발점이 넓어지는 것이지 난이도를 되돌리는 것이 아니다.** ±3 은 게이트
 * 제안을 바꾸므로 같은 코스도 다른 질문이 되는데, 이 값을 묶지 않으면 한 스테이지가
 * ±2 에서 143ms · ±3 에서 200ms 가 되어 해금하는 순간 쉬워진다. 실제로 그래서
 * 티어 곡선이 ±3 에서 역전돼 있었다.
 */
const AXIS_CAP_DRIFT_MS = 30;
/*
 * 목표 사다리(`targetSlackMs`)와 최난 구간 요구(`PEAK_RUN_RULE`)는 `./tiers` 에 있다.
 * 점검 도구가 같은 표를 읽어야 "편차" 열이 거짓말을 하지 않는다.
 *
 * 최난 구간 요구는 취향이 아니라 측정이다 — 티어 1~3 후보는 전부 140단위 이하이고
 * (구조적으로 뾰족하다) 티어 4 는 146개 중 88개가 330단위 이상이다. 분포가 갈라져
 * 있으므로 경계값도 예민하지 않다.
 */
/**
 * 목표 근접도가 이만큼 안에서 비슷하면, 아직 안 쓴 섹터를 데려오는 후보를 먼저 고른다.
 * 난이도를 희생하지 않으면서 12개 섹터를 고루 쓰기 위한 동점 처리다.
 */
const COVERAGE_TIE_MS = 16;
/** 출발 정착 구간 — 출발 집합이 점 하나라 좁게 나오는 자리이고 난이도가 아니다. */
const SETTLE_X = 24;
/**
 * 최악 경로도 넘어야 하는 여유. 사람의 탭 타이밍 산포보다 좁은 경로는 이론상 통과
 * 가능해도 통과할 수 없다. **측정값이 아니라 가정이다** — 다만 후보 분포가 양극이라
 * 30~60ms 어디로 잡아도 결과가 같아, 이 가정에 대한 민감도가 낮다.
 */
const FAIRNESS_FLOOR_MS = 50;
/** 이미 채택한 코스와 **같은 자리에 같은 섹터**가 이 개수를 넘으면 거부한다. */
const MAX_SAME_SLOT = 2;

/**
 * 큐레이션은 **출발 상한 ±2** 로 판정한다.
 *
 * 축 상한 ±3 은 해금 상품이므로 처음 이 스테이지를 만나는 사람은 ±2 다. 게이트
 * 제안이 상한에 걸린 쌍을 거르게 된 뒤로는 상한이 제안 자체를 바꾸므로, 넓은
 * 쪽으로 재면 실제로 플레이될 코스가 아닌 것을 재게 된다.
 */
const START_CAP = 2;
const TUNING = { ...BASE_TUNING, axisMax: START_CAP, axisMin: -START_CAP };
/** 해금한 사람의 조건. 여유 목표는 ±2 로 재되, 공정성은 여기서도 지켜져야 한다. */
const OPEN_TUNING = { ...BASE_TUNING, axisMax: 3, axisMin: -3 };

const tradeWith = (t: typeof BASE_TUNING) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

interface Score {
  allPassable: boolean;
  bestMs: number;
  worstMs: number;
  spreadMs: number;
  /** ±3 에서의 최선 여유. 해금이 난이도를 되돌리지 않는지 보는 값 */
  openBestMs: number;
  /** 최난 구간이 이어지는 최대 길이(월드 단위). 뾰족한가 평평한가 */
  peakRun: number;
}

const LANES_OF = (path: number): Array<"top" | "bot"> => {
  const lanes: Array<"top" | "bot"> = [];
  for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
  return lanes;
};

/** 한 상한에서 16경로를 모두 풀어 통과 여부와 여유 범위를 낸다. */
function sweep(seed: number, tier: number, tuning: typeof BASE_TUNING) {
  const course = buildStageCourse(tier, 1, tuning, seed);
  const startY = startYFor(course);
  const trade = tradeWith(tuning);
  let best = 0;
  let worst = Number.POSITIVE_INFINITY;
  let bestPath = 0;
  let allPassable = true;

  for (let path = 0; path < PATHS; path += 1) {
    const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, tuning, startY, LANES_OF(path), trade, 1 / 90);
    if (!res.passable) {
      allPassable = false;
      continue;
    }
    const ms = res.minSlackSec * 1000;
    if (ms > best) {
      best = ms;
      bestPath = path;
    }
    worst = Math.min(worst, ms);
  }
  return { allPassable, best, worst: Number.isFinite(worst) ? worst : 0, bestPath, course, startY, trade };
}

/**
 * 최선 경로에서 최난 구간이 이어지는 최대 길이.
 *
 * 최선×1.25 이내를 "최난 구간" 으로 본다. 절대값이 아니라 그 스테이지 자신의 최난
 * 대비로 재는 이유는, 묻는 것이 "얼마나 좁은가" 가 아니라 **"가장 좁은 상태가 얼마나
 * 오래 가는가"** 이기 때문이다.
 */
function peakRunOf(a: ReturnType<typeof sweep>, tuning: typeof BASE_TUNING): number {
  const res = solveCourse(
    a.course.pieces, { ...NEUTRAL_BUILD }, tuning, a.startY, LANES_OF(a.bestPath), a.trade, 1 / 90, true
  );
  const limit = a.best * 1.25;
  let run = 0;
  let peak = 0;
  for (const piece of res.perPiece) {
    const t = piece.trace;
    if (!t) continue;
    for (let k = 0; k < t.survival.length; k += 1) {
      if (t.startX + k * t.dx < SETTLE_X) continue;
      const ms = (measure(t.survival[k]) / (2 * t.rate)) * 1000;
      if (ms <= limit) {
        run += t.dx;
        if (run > peak) peak = run;
      } else {
        run = 0;
      }
    }
  }
  return Math.round(peak);
}

/**
 * 여유 목표는 처음 만나는 조건(±2)으로 재고, 공정성은 두 상한 모두에서 묻는다.
 * 축 상한을 해금했다고 보이지 않는 막다른 길이 생기면 그건 해금이 아니라 함정이다.
 */
function score(seed: number, tier: number): Score {
  const empty = { allPassable: false, bestMs: 0, worstMs: 0, spreadMs: 0, openBestMs: 0, peakRun: 0 };
  const start = sweep(seed, tier, TUNING);
  if (!start.allPassable) return empty;
  // 공정성 하한에서 떨어질 후보에 추적 솔브를 쓰지 않는다 — 여기가 가장 비싼 자리다.
  if (start.worst < FAIRNESS_FLOOR_MS) return { ...empty, bestMs: start.best, worstMs: start.worst };
  const open = sweep(seed, tier, OPEN_TUNING);
  if (!open.allPassable) return empty;
  return {
    allPassable: true,
    bestMs: start.best,
    worstMs: start.worst,
    spreadMs: start.best - start.worst,
    openBestMs: open.best,
    peakRun: peakRunOf(start, TUNING)
  };
}

/** 티어마다 주로 묻는 것. 유형 구성으로 표현한다. */
const TIER_CHARACTER: Record<number, { note: string; holds: (types: SectorType[]) => boolean }> = {
  1: {
    note: "협곡·회랑 위주 — 동사를 몸에 익히는 자리",
    holds: (t) => t.filter((x) => x === "gorge" || x === "corridor").length >= 3
  },
  2: { note: "산개 2개 이상 — 경로를 엮는다", holds: (t) => t.filter((x) => x === "scatter").length >= 2 },
  3: { note: "맥동 2개 이상 — 타이밍을 묻는다", holds: (t) => t.filter((x) => x === "pulse").length >= 2 },
  4: { note: "3유형 이상 — 종합", holds: (t) => new Set(t).size >= 3 }
};

interface Candidate {
  seed: number;
  s: Score;
  ids: string[];
  types: SectorType[];
}

const sectorsOf = (tier: number, seed: number) => {
  const pieces = buildStageCourse(tier, 1, TUNING, seed).pieces.filter((p) => p.kind === "sector");
  return {
    ids: pieces.map((p) => p.sector!.id),
    types: pieces.map((p) => p.sector!.type)
  };
};

const sameSlots = (a: string[], b: string[]) => a.filter((v, i) => v === b[i]).length;

const table: Record<string, number> = {};
/** 차별화는 티어를 가로질러 본다 — T2·3 과 T3·1 이 같아졌던 것이 그래서다. */
const takenCourses: string[][] = [];
/** 커버리지 동점 처리용 — 지금까지 한 번이라도 쓴 섹터. */
const usedSectors = new Set<string>();
const lines: string[] = [];

interface Gates {
  peak: boolean;
  character: boolean;
  band: boolean;
  drift: boolean;
}
const ALL_GATES: Gates = { peak: true, character: true, band: true, drift: true };

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  const pool: Candidate[] = [];
  let nPassable = 0;
  for (let i = 0; i < CANDIDATES; i += 1) {
    const seed = (tier * 7919 + i * 2654435761) >>> 0;
    const s = score(seed, tier);
    if (s.bestMs > 0) nPassable += 1;
    // 공정성은 절대 풀지 않는 관문이다.
    if (!s.allPassable) continue;
    pool.push({ seed, s, ...sectorsOf(tier, seed) });
  }

  const picked: Candidate[] = [];
  const admits = (c: Candidate, g: Gates) =>
    (!g.band || Math.abs(c.s.bestMs - targetSlackMs(tier)) <= SLACK_BAND_MS) &&
    (!g.drift || Math.abs(c.s.openBestMs - c.s.bestMs) <= AXIS_CAP_DRIFT_MS) &&
    (!g.peak || PEAK_RUN_RULE[tier](c.s.peakRun)) &&
    (!g.character || TIER_CHARACTER[tier].holds(c.types)) &&
    !picked.includes(c) &&
    takenCourses.every((t) => sameSlots(t, c.ids) <= MAX_SAME_SLOT);

  /**
   * 목표에 가장 가까운 것을 고르되, `COVERAGE_TIE_MS` 안에서 비슷한 후보들 사이에서는
   * 아직 안 쓴 섹터를 더 많이 데려오는 쪽을 택한다. 매번 다시 훑는 이유는 채택할
   * 때마다 "안 쓴 섹터" 집합과 중복 제약이 함께 바뀌기 때문이다.
   */
  const take = (g: Gates) => {
    while (picked.length < STAGES_PER_TIER) {
      const avail = pool.filter((c) => admits(c, g));
      if (avail.length === 0) return;
      const dist = (c: Candidate) => Math.abs(c.s.bestMs - targetSlackMs(tier));
      const nearest = Math.min(...avail.map(dist));
      const tied = avail.filter((c) => dist(c) <= nearest + COVERAGE_TIE_MS);
      tied.sort((a, b) => {
        const na = new Set(a.ids.filter((id) => !usedSectors.has(id))).size;
        const nb = new Set(b.ids.filter((id) => !usedSectors.has(id))).size;
        return nb - na || dist(a) - dist(b);
      });
      const chosen = tied[0];
      picked.push(chosen);
      takenCourses.push(chosen.ids);
      chosen.ids.forEach((id) => usedSectors.add(id));
    }
  };

  // 완화 순서 — 공정성과 차별화는 여기 없다. 절대 풀지 않는다.
  const relaxations: Array<[string, Gates]> = [
    ["완화 없음", ALL_GATES],
    ["지속 완화", { ...ALL_GATES, peak: false }],
    ["성격까지 완화", { ...ALL_GATES, peak: false, character: false }],
    ["밴드까지 완화", { peak: false, character: false, band: false, drift: true }],
    ["드리프트까지 완화", { peak: false, character: false, band: false, drift: false }]
  ];
  let usedRelaxation = relaxations[0][0];
  for (const [label, gates] of relaxations) {
    take(gates);
    if (picked.length >= STAGES_PER_TIER) {
      usedRelaxation = label;
      break;
    }
    usedRelaxation = label;
  }

  // 티어 안에서는 쉬운 것부터 — 같은 티어라도 1 → 3 으로 갈수록 조여지는 편이 낫다.
  picked.sort((a, b) => b.s.bestMs - a.s.bestMs);

  lines.push(
    `티어 ${tier}  ${TIER_CHARACTER[tier].note}\n` +
      `        전경로통과 ${nPassable}/${CANDIDATES} → 공정성 하한 통과 ${pool.length} → 채택 ${picked.length}/${STAGES_PER_TIER} (${usedRelaxation})`
  );
  picked.forEach((c, i) => {
    table[stageKey(tier, i + 1)] = c.seed;
    const off = c.s.bestMs - targetSlackMs(tier);
    const drift = c.s.openBestMs - c.s.bestMs;
    lines.push(
      `  ${tier}·${i + 1}  seed ${String(c.seed).padStart(10)}` +
        `  최선 ${c.s.bestMs.toFixed(0).padStart(3)}ms (목표 ${targetSlackMs(tier)}, ${off >= 0 ? "+" : ""}${off.toFixed(0)})` +
        `  최악 ${c.s.worstMs.toFixed(0).padStart(3)}ms` +
        `  해금드리프트 ${drift >= 0 ? "+" : ""}${drift.toFixed(0)}ms` +
        `  최난구간 ${String(c.s.peakRun).padStart(3)}단위\n` +
        `         ${c.ids.join(" → ")}`
    );
  });
  if (picked.length < STAGES_PER_TIER) {
    lines.push(`  ⚠ 티어 ${tier}: 후보가 모자란다. CANDIDATES 를 늘리거나 목표를 조정해야 한다.`);
  }
}

lines.forEach((l) => console.log(l));

// 얻어진 차별화와 커버리지를 그 자리에서 확인한다 — 기준이 실제로 먹었는지는 결과로만 안다.
let worstOverlap = 0;
for (let i = 0; i < takenCourses.length; i += 1)
  for (let j = i + 1; j < takenCourses.length; j += 1)
    worstOverlap = Math.max(worstOverlap, sameSlots(takenCourses[i], takenCourses[j]));
const missing = SECTORS.filter((x) => !usedSectors.has(x.id)).map((x) => x.id);
console.log(
  `\n코스 중복 최악 ${worstOverlap}/5 (기준 ${MAX_SAME_SLOT})` +
    `   섹터 커버리지 ${usedSectors.size}/${SECTORS.length}` +
    (missing.length ? `   미등장: ${missing.join(", ")}` : "")
);

const out = path.join(fileURLToPath(new URL("../../app/src/game/stage-seeds.json", import.meta.url)));
writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`, "utf8");
console.log(`${Object.keys(table).length}개 시드를 ${path.basename(out)} 에 구웠다.`);
