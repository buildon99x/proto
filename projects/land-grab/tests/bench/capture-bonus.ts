/**
 * 물막이 배율 실험 — "얕은 왕복 반복"이 정말 최적해가 아니게 되는지 잰다.
 *
 *   pnpm exec tsx projects/land-grab/tests/bench/capture-bonus.ts
 *
 * 브라우저 플레이테스트의 R4 는 20초 시점 **점유율**을 찍는다. 그런데 물막이 배율은
 * 점수 규칙이라 점유율을 직접 바꾸지 않는다. 그래서 여기서는 플레이어 자리를 봇에게
 * 맡겨 **한 번에 파는 깊이만 바꿔 가며** 90초 판을 끝까지 돌리고, 점유율과 점수를
 * 함께 기록한다. 배율을 껐다 켠 두 조건을 같은 시드로 돌려 비교한다.
 */

import { AiController } from "../../app/src/game/ai";
import { MATCH_DURATION_MS, findDifficulty, type Difficulty } from "../../app/src/game/config";
import { Match } from "../../app/src/game/engine";

const SEEDS = [11, 23, 37, 41, 59, 67];
const DEPTHS = [3, 5, 7, 9, 12];
const STEP_MS = 100;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 플레이어 자리를 맡을 봇. 한 번에 파는 사각형 크기만 실험 변수로 둔다. */
function botStyle(depth: number): Difficulty {
  return {
    id: "normal",
    label: `깊이 ${depth}`,
    description: "",
    aiCount: 3,
    aiTickMs: 0,
    rectMin: depth,
    rectMax: depth,
    huntTrailThreshold: Number.POSITIVE_INFINITY,
    huntRange: 0,
    maxTrail: depth * 4 + 12
  };
}

type Outcome = {
  tiles: number;
  peakTiles: number;
  score: number;
  bonus: number;
  bestCapture: number;
  deaths: number;
  topAiScore: number;
  topAiBonus: number;
  topAiBestCapture: number;
  topAiDeaths: number;
  rank: number;
};

function runMatch(depth: number, seed: number, captureBonus: boolean): Outcome {
  const difficulty = findDifficulty("normal");
  const match = new Match(difficulty, seed, captureBonus);

  // 목숨 제한을 풀어 90초를 끝까지 돌린다. 여기서 재려는 것은 생존이 아니라 효율이다.
  match.human.lives = Number.POSITIVE_INFINITY;

  const rivals = new AiController(match, difficulty, mulberry32(seed ^ 0x9e37));
  const player = new AiController(match, botStyle(depth), mulberry32(seed ^ 0x5bf0), [match.human.id]);

  while (match.phase === "playing") {
    player.update();
    rivals.update();
    match.update(STEP_MS);
  }

  const standings = match.standings();
  const me = match.human;
  const topAi = standings.find((entry) => entry.kind === "ai");

  return {
    tiles: match.tilesOf(me.id),
    peakTiles: me.peakTiles,
    score: match.scoreOf(me),
    bonus: me.bonusPoints,
    bestCapture: me.bestCapture,
    deaths: me.deaths,
    topAiScore: topAi ? topAi.score : 0,
    topAiBonus: topAi ? topAi.bonusPoints : 0,
    topAiBestCapture: topAi ? topAi.bestCapture : 0,
    topAiDeaths: topAi ? (match.runners.find((item) => item.id === topAi.id)?.deaths ?? 0) : 0,
    rank: standings.findIndex((entry) => entry.kind === "human") + 1
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function row(depth: number, captureBonus: boolean): string {
  const runs = SEEDS.map((seed) => runMatch(depth, seed, captureBonus));
  const wins = runs.filter((run) => run.rank === 1).length;
  return [
    String(depth).padStart(4),
    mean(runs.map((run) => run.peakTiles)).toFixed(0).padStart(8),
    mean(runs.map((run) => run.bestCapture)).toFixed(0).padStart(8),
    mean(runs.map((run) => run.bonus)).toFixed(0).padStart(8),
    mean(runs.map((run) => run.score)).toFixed(0).padStart(8),
    mean(runs.map((run) => run.topAiScore)).toFixed(0).padStart(9),
    mean(runs.map((run) => run.topAiBestCapture)).toFixed(0).padStart(9),
    mean(runs.map((run) => run.topAiBonus)).toFixed(0).padStart(9),
    mean(runs.map((run) => run.deaths)).toFixed(1).padStart(6),
    mean(runs.map((run) => run.topAiDeaths)).toFixed(1).padStart(7),
    `${wins}/${SEEDS.length}`.padStart(6)
  ].join(" ");
}

console.log(`물막이 배율 실험 — ${MATCH_DURATION_MS / 1000}초 판, 시드 ${SEEDS.length}개 평균\n`);

for (const captureBonus of [false, true]) {
  console.log(captureBonus ? "배율 켜짐 (25칸↑ ×1.5, 60칸↑ ×2)" : "배율 꺼짐 (기준선)");
  console.log("깊이   최고점유  최대점령  내보너스    내점수  최고AI점수 AI최대점령  AI보너스  사망 AI사망    1위");
  for (const depth of DEPTHS) {
    console.log(row(depth, captureBonus));
  }
  console.log("");
}
