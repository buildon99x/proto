/**
 * 스테이지 시드 큐레이션 — 정확한 솔버로 **여유(slack)** 를 겨냥한다.
 *
 * 2단계에서는 오토파일럿 통과율로 골랐다. 3단계의 솔버로 다시 재보니 통과 가능성은
 * 거의 모든 경로에서 참이었고(94~100%), 대신 **여유가 최선 198ms 와 최악 10ms 로**
 * 갈렸다. 통과 가능하지만 여유 10ms 인 경로는 사람에게는 불가능하다.
 *
 * 그래서 기준을 바꾼다. 좋은 스테이지는 세 가지를 만족한다.
 *
 *  1. **공정성** — 모든 경로가 통과 가능해야 한다(보이지 않는 막다른 길 금지).
 *  2. **난이도** — 최선 경로의 여유가 티어별 목표 구간에 들어야 한다.
 *  3. **선택의 의미** — 최선과 최악 경로의 여유 차이가 충분해야 한다.
 *     차이가 없으면 어느 관으로 가든 같으므로 게이트가 아무것도 묻지 않는다.
 *
 * 세 번째가 3단계에서 비로소 가능해진 판정이다 — 근사로는 "여유"를 잴 수 없다.
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
import type { AxisKey, Build } from "../../app/src/game/types";

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;
const CANDIDATES = 240;

/** 티어가 오를수록 최선 경로의 여유가 좁아진다. 사람이 체감하는 난이도 곡선. */
const targetSlackMs = (tier: number) => 190 - (tier - 1) * 30;
const SLACK_BAND_MS = 38;
/** 최선과 최악 경로의 여유 차이. 작으면 게이트가 아무것도 묻지 않는다. */
const MIN_SPREAD_MS = 35;

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
  const open = sweep(seed, tier, OPEN_TUNING);
  return {
    allPassable: start.allPassable && open.allPassable,
    bestMs: start.best,
    worstMs: start.worst,
    spreadMs: start.best - start.worst
  };
}

function accepts(s: Score, tier: number): boolean {
  if (!s.allPassable) return false;
  if (Math.abs(s.bestMs - targetSlackMs(tier)) > SLACK_BAND_MS) return false;
  return s.spreadMs >= MIN_SPREAD_MS;
}

const table: Record<string, number> = {};

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    let chosen = -1;
    let chosenScore: Score | null = null;
    let fallback = -1;
    let fallbackScore: Score | null = null;
    let fallbackErr = Number.POSITIVE_INFINITY;

    for (let i = 0; i < CANDIDATES; i += 1) {
      const seed = (tier * 7919 + no * 104729 + i * 2654435761) >>> 0;
      const s = score(seed, tier);
      const err = Math.abs(s.bestMs - targetSlackMs(tier)) + Math.max(0, MIN_SPREAD_MS - s.spreadMs);
      if (s.allPassable && err < fallbackErr) {
        fallbackErr = err;
        fallback = seed;
        fallbackScore = s;
      }
      if (accepts(s, tier)) {
        chosen = seed;
        chosenScore = s;
        break;
      }
    }

    if (chosen < 0) {
      chosen = fallback;
      chosenScore = fallbackScore;
    }
    table[stageKey(tier, no)] = chosen;
    const s = chosenScore;
    const mark = s && accepts(s, tier) ? "✓" : "△";
    console.log(
      `티어 ${tier} · ${no}  seed ${String(chosen).padStart(10)}` +
        `  최선 ${s ? s.bestMs.toFixed(0) : "?"}ms (목표 ${targetSlackMs(tier)})` +
        `  최악 ${s ? s.worstMs.toFixed(0) : "?"}ms` +
        `  차이 ${s ? s.spreadMs.toFixed(0) : "?"}ms  ${mark}`
    );
  }
}

const out = path.join(fileURLToPath(new URL("../../app/src/game/stage-seeds.json", import.meta.url)));
writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`, "utf8");
console.log(`\n${Object.keys(table).length}개 시드를 ${path.basename(out)} 에 구웠다.`);
