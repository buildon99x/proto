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
 * ## 완화 순서
 *
 * 세 조건을 다 만족하는 후보가 3개에 못 미치면 **성격 → 밴드** 순으로 푼다.
 * **공정성과 차별화는 절대 풀지 않는다.** 함정을 되살리거나 같은 코스를 다시 내느니
 * 목표 여유에서 벗어나는 편이 낫다.
 *
 * 티어 4 에서 이 완화가 실제로 걸린다. 함정을 금지하면 티어 4 후보의 최선 여유가
 * **130ms 아래로 내려가지 않기 때문**이다(최악 ≥50ms 인 147개 후보의 최선 최소값이
 * 정확히 130). 목표 100ms 는 함정을 허용해야만 도달되는 값이었다 — 지금 티어 4 의
 * 어려움 상당 부분을 함정이 만들고 있었다는 뜻이다. 이 구멍은 여유가 아니라 **최난
 * 구간의 지속 길이**로 메워야 하고, 그건 별도 작업이다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER, stageKey } from "../../app/src/game/meta";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, SectorType } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const CANDIDATES = 900;

/** 티어가 오를수록 최선 경로의 여유가 좁아진다. 사람이 체감하는 난이도 곡선. */
const targetSlackMs = (tier: number) => 190 - (tier - 1) * 30;
const SLACK_BAND_MS = 38;
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
  let allPassable = true;

  for (let path = 0; path < PATHS; path += 1) {
    const res = solveCourse(course.pieces, { ...NEUTRAL_BUILD }, tuning, startY, LANES_OF(path), trade, 1 / 90);
    if (!res.passable) {
      allPassable = false;
      continue;
    }
    const ms = res.minSlackSec * 1000;
    best = Math.max(best, ms);
    worst = Math.min(worst, ms);
  }
  return { allPassable, best, worst: Number.isFinite(worst) ? worst : 0 };
}

/**
 * 여유 목표는 처음 만나는 조건(±2)으로 재고, 공정성은 두 상한 모두에서 묻는다.
 * 축 상한을 해금했다고 보이지 않는 막다른 길이 생기면 그건 해금이 아니라 함정이다.
 */
function score(seed: number, tier: number): Score {
  const start = sweep(seed, tier, TUNING);
  if (!start.allPassable) return { allPassable: false, bestMs: 0, worstMs: 0, spreadMs: 0 };
  const open = sweep(seed, tier, OPEN_TUNING);
  return {
    allPassable: open.allPassable,
    bestMs: start.best,
    worstMs: start.worst,
    spreadMs: start.best - start.worst
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
const lines: string[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  const pool: Candidate[] = [];
  let nPassable = 0;
  for (let i = 0; i < CANDIDATES; i += 1) {
    const seed = (tier * 7919 + i * 2654435761) >>> 0;
    const s = score(seed, tier);
    if (!s.allPassable) continue;
    nPassable += 1;
    // 공정성은 절대 풀지 않는 관문이다.
    if (s.worstMs < FAIRNESS_FLOOR_MS) continue;
    pool.push({ seed, s, ...sectorsOf(tier, seed) });
  }
  pool.sort((a, b) => Math.abs(a.s.bestMs - targetSlackMs(tier)) - Math.abs(b.s.bestMs - targetSlackMs(tier)));

  const picked: Candidate[] = [];
  const take = (requireCharacter: boolean, requireBand: boolean) => {
    for (const c of pool) {
      if (picked.length >= STAGES_PER_TIER) return;
      if (picked.includes(c)) continue;
      if (requireBand && Math.abs(c.s.bestMs - targetSlackMs(tier)) > SLACK_BAND_MS) continue;
      if (requireCharacter && !TIER_CHARACTER[tier].holds(c.types)) continue;
      if (takenCourses.some((t) => sameSlots(t, c.ids) > MAX_SAME_SLOT)) continue;
      if (picked.some((p) => sameSlots(p.ids, c.ids) > MAX_SAME_SLOT)) continue;
      picked.push(c);
      takenCourses.push(c.ids);
    }
  };
  take(true, true);
  const relaxedCharacter = picked.length < STAGES_PER_TIER;
  if (relaxedCharacter) take(false, true);
  const relaxedBand = picked.length < STAGES_PER_TIER;
  if (relaxedBand) take(false, false);

  // 티어 안에서는 쉬운 것부터 — 같은 티어라도 1 → 3 으로 갈수록 조여지는 편이 낫다.
  picked.sort((a, b) => b.s.bestMs - a.s.bestMs);

  const relaxed = relaxedBand ? "밴드까지 완화" : relaxedCharacter ? "성격 완화" : "완화 없음";
  lines.push(
    `티어 ${tier}  ${TIER_CHARACTER[tier].note}\n` +
      `        전경로통과 ${nPassable}/${CANDIDATES} → 공정성 하한 통과 ${pool.length} → 채택 ${picked.length}/${STAGES_PER_TIER} (${relaxed})`
  );
  picked.forEach((c, i) => {
    table[stageKey(tier, i + 1)] = c.seed;
    const off = c.s.bestMs - targetSlackMs(tier);
    lines.push(
      `  ${tier}·${i + 1}  seed ${String(c.seed).padStart(10)}` +
        `  최선 ${c.s.bestMs.toFixed(0).padStart(3)}ms (목표 ${targetSlackMs(tier)}, ${off >= 0 ? "+" : ""}${off.toFixed(0)})` +
        `  최악 ${c.s.worstMs.toFixed(0).padStart(3)}ms   ${c.ids.join(" → ")}`
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
const used = new Set(takenCourses.flat());
console.log(`\n코스 중복 최악 ${worstOverlap}/5 (기준 ${MAX_SAME_SLOT})   섹터 커버리지 ${used.size}/12`);

const out = path.join(fileURLToPath(new URL("../../app/src/game/stage-seeds.json", import.meta.url)));
writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`, "utf8");
console.log(`${Object.keys(table).length}개 시드를 ${path.basename(out)} 에 구웠다.`);
