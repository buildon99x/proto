/**
 * 스테이지 시드 큐레이션 — core-loop.md §6 "생성은 자동, 선별은 수동".
 *
 * 스테이지는 시드 하나로 결정된다. 아무 시드나 쓰면 어떤 스테이지는 16개 경로 중
 * 2개만 통과 가능한 시행착오 강요가 되고, 어떤 스테이지는 무슨 선택을 해도 통과돼
 * 게이트가 무의미해진다. 그래서 후보 시드를 훑어 **통과율이 목표 구간에 드는
 * 시드만 남긴다.**
 *
 * 남긴 결과는 app/src/game/stage-seeds.json 으로 굽는다 — 게임은 그 표만 읽으므로
 * 런타임에 검증 비용이 들지 않는다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, createState, launch, startYFor, update } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER, stageKey } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;

/** 너무 낮으면 시행착오 강요, 너무 높으면 게이트가 무의미해진다. */
const MIN_RATE = 0.45;
const MAX_RATE = 0.85;
const CANDIDATES = 60;

function clearRate(seed: number, tier: number): number {
  let cleared = 0;
  for (let path = 0; path < PATHS; path += 1) {
    const state = createState({
      mode: "stage",
      tier,
      stageNo: 1,
      seed: 0,
      startBuild: { ...NEUTRAL_BUILD },
      axisCap: 3,
      maxSectorDifficulty: 3
    });
    state.course = buildStageCourse(tier, 1, BASE_TUNING, 3, seed);
    state.y = startYFor(state.course);
    launch(state);

    let ok = false;
    for (let t = 0; t < 200; t += DT) {
      const lane = (path >> Math.min(GATES - 1, state.gatesPassed)) & 1 ? "bot" : "top";
      state.holding = state.y > targetY(state, LOOKAHEAD, lane);
      const r = update(state, DT);
      if (r.event === "died") break;
      if (state.phase === "cleared") {
        ok = true;
        break;
      }
    }
    if (ok) cleared += 1;
  }
  return cleared / PATHS;
}

const table: Record<string, number> = {};
const report: string[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    let chosen = -1;
    let chosenRate = 0;
    let bestFallback = -1;
    let bestFallbackRate = -1;

    for (let i = 0; i < CANDIDATES; i += 1) {
      const seed = (tier * 7919 + no * 104729 + i * 2654435761) >>> 0;
      const rate = clearRate(seed, tier);
      if (rate > bestFallbackRate) {
        bestFallbackRate = rate;
        bestFallback = seed;
      }
      if (rate >= MIN_RATE && rate <= MAX_RATE) {
        chosen = seed;
        chosenRate = rate;
        break;
      }
    }

    if (chosen < 0) {
      chosen = bestFallback;
      chosenRate = bestFallbackRate;
    }
    table[stageKey(tier, no)] = chosen;
    const mark = chosenRate >= MIN_RATE && chosenRate <= MAX_RATE ? "✓" : "△";
    report.push(`티어 ${tier} · ${no}  seed ${String(chosen).padStart(10)}  통과율 ${(chosenRate * 100).toFixed(0)}%  ${mark}`);
    console.log(report[report.length - 1]);
  }
}

const out = path.join(fileURLToPath(new URL("../../app/src/game/stage-seeds.json", import.meta.url)));
writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`, "utf8");
console.log(`\n${Object.keys(table).length}개 시드를 ${path.basename(out)} 에 구웠다.`);
