/**
 * 규칙 실험 하니스 — 설계 가설을 90초 판으로 직접 잰다.
 *
 *   pnpm exec tsx projects/land-grab/tests/bench/rule-sweep.ts
 *   pnpm exec tsx projects/land-grab/tests/bench/rule-sweep.ts 기준선 폐허6초
 *
 * 브라우저 플레이테스트의 R4 는 20초 시점 **점유율**만 찍는다. 점수 규칙이나
 * 눈덩이 이전 같은 것은 거기서 잡히지 않는다. 그래서 여기서는 플레이어 자리를
 * 봇에게 맡기고 **한 번에 파는 사각형 깊이만** 바꿔 가며 판을 끝까지 돌린다.
 * 같은 시드로 규칙만 갈아 끼워 비교한다.
 *
 * 결과는 docs/design/differentiation.md 에 기록한다.
 */

import { AiController } from "../../app/src/game/ai";
import {
  MATCH_DURATION_MS,
  findDifficulty,
  type Difficulty,
  type MatchRules
} from "../../app/src/game/config";
import { Match } from "../../app/src/game/engine";

const SEEDS = [11, 23, 37, 41, 59, 67];
const DEPTHS = [3, 5, 7, 9, 12];
const STEP_MS = 100;

/** `botHunts` 를 켜면 플레이어 봇도 AI 와 똑같이 상대 꼬리를 노린다. */
const VARIANTS: Array<{
  name: string;
  note: string;
  rules: Partial<MatchRules>;
  botHunts?: boolean;
}> = [
  { name: "기준선", note: "규칙 추가 없음", rules: {} },
  { name: "배율", note: "물막이 배율 25칸↑ ×1.5, 60칸↑ ×2", rules: { captureBonus: true } },
  { name: "폐허3초", note: "죽은 영토를 3초간 잠금", rules: { rubbleLockMs: 3_000 } },
  { name: "폐허6초", note: "죽은 영토를 6초간 잠금", rules: { rubbleLockMs: 6_000 } },
  { name: "폐허10초", note: "죽은 영토를 10초간 잠금", rules: { rubbleLockMs: 10_000 } },
  { name: "킬200", note: "킬 점수 500 → 200", rules: { killScore: 200 } },
  { name: "킬100", note: "킬 점수 500 → 100", rules: { killScore: 100 } },
  { name: "킬50", note: "킬 점수 500 → 50", rules: { killScore: 50 } },
  {
    name: "킬100폐허6초",
    note: "킬 점수 100 + 죽은 영토 6초 잠금",
    rules: { killScore: 100, rubbleLockMs: 6_000 }
  },
  {
    name: "사냥봇",
    note: "대조군 — 플레이어 봇도 AI 와 똑같이 사냥한다 (규칙은 기준선)",
    rules: {},
    botHunts: true
  },
  {
    name: "사냥봇킬100",
    note: "대조군 + 킬 점수 100",
    rules: { killScore: 100 },
    botHunts: true
  }
];

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
function botStyle(depth: number, hunts: boolean): Difficulty {
  const rival = findDifficulty("normal");
  return {
    id: "normal",
    label: `깊이 ${depth}`,
    description: "",
    aiCount: 3,
    aiTickMs: 0,
    rectMin: depth,
    rectMax: depth,
    huntTrailThreshold: hunts ? rival.huntTrailThreshold : Number.POSITIVE_INFINITY,
    huntRange: hunts ? rival.huntRange : 0,
    maxTrail: depth * 4 + 12
  };
}

type Outcome = {
  peakTiles: number;
  score: number;
  kills: number;
  deaths: number;
  topAiScore: number;
  aiTiles: number;
  aiKills: number;
  topAiDeaths: number;
  rank: number;
};

function runMatch(
  depth: number,
  seed: number,
  rules: Partial<MatchRules>,
  botHunts: boolean
): Outcome {
  const difficulty = findDifficulty("normal");
  const match = new Match(difficulty, { seed, rules });

  // 목숨 제한을 풀어 90초를 끝까지 돌린다. 재려는 것은 생존이 아니라 효율이다.
  match.human.lives = Number.POSITIVE_INFINITY;

  const rivals = new AiController(match, difficulty, mulberry32(seed ^ 0x9e37));
  const player = new AiController(match, botStyle(depth, botHunts), mulberry32(seed ^ 0x5bf0), [
    match.human.id
  ]);

  while (match.phase === "playing") {
    player.update();
    rivals.update();
    match.update(STEP_MS);
  }

  const standings = match.standings();
  const me = match.human;
  const ai = standings.filter((entry) => entry.kind === "ai");
  const topAi = ai[0];

  return {
    peakTiles: me.peakTiles,
    score: match.scoreOf(me),
    kills: me.kills,
    deaths: me.deaths,
    topAiScore: topAi ? topAi.score : 0,
    aiTiles: ai.reduce((sum, entry) => sum + entry.tiles, 0),
    aiKills: ai.reduce((sum, entry) => sum + entry.kills, 0),
    topAiDeaths: topAi
      ? (match.runners.find((runner) => runner.id === topAi.id)?.deaths ?? 0)
      : 0,
    rank: standings.findIndex((entry) => entry.kind === "human") + 1
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const selected = process.argv.slice(2);
const variants = selected.length
  ? VARIANTS.filter((variant) => selected.includes(variant.name))
  : VARIANTS;

if (variants.length === 0) {
  console.error(`알 수 없는 조건입니다. 가능한 값: ${VARIANTS.map((v) => v.name).join(", ")}`);
  process.exit(1);
}

console.log(`규칙 실험 — ${MATCH_DURATION_MS / 1000}초 판, 시드 ${SEEDS.length}개 평균\n`);

for (const variant of variants) {
  console.log(`${variant.name} — ${variant.note}`);
  console.log("깊이   내최고점유    내점수    내킬  내사망  최고AI점수   AI점유합   AI킬합  AI사망     1위");

  for (const depth of DEPTHS) {
    const runs = SEEDS.map((seed) =>
      runMatch(depth, seed, variant.rules, variant.botHunts ?? false)
    );
    const wins = runs.filter((run) => run.rank === 1).length;
    console.log(
      [
        String(depth).padStart(4),
        mean(runs.map((run) => run.peakTiles)).toFixed(0).padStart(10),
        mean(runs.map((run) => run.score)).toFixed(0).padStart(9),
        mean(runs.map((run) => run.kills)).toFixed(1).padStart(7),
        mean(runs.map((run) => run.deaths)).toFixed(1).padStart(7),
        mean(runs.map((run) => run.topAiScore)).toFixed(0).padStart(11),
        mean(runs.map((run) => run.aiTiles)).toFixed(0).padStart(10),
        mean(runs.map((run) => run.aiKills)).toFixed(1).padStart(8),
        mean(runs.map((run) => run.topAiDeaths)).toFixed(1).padStart(7),
        `${wins}/${SEEDS.length}`.padStart(7)
      ].join(" ")
    );
  }
  console.log("");
}
