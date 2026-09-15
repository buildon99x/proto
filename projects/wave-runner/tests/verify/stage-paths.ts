/**
 * 스테이지 전 경로 검증 — core-loop.md §6.1 의 설계 버그 대응.
 *
 * Endless 는 섹터를 현재 빌드에 맞춰 뽑으므로 통과 가능성이 자연히 따라오지만,
 * Stage 는 코스가 고정인 채 빌드만 시도마다 달라진다. 그래서 **어떤 게이트 경로를
 * 타면 스테이지가 클리어 불가능**해질 수 있고, 플레이어는 벽에 부딪히기 전까지
 * 그걸 알 수 없다. 원인 모를 죽음은 이 장르의 유일한 자산인 재시도 루프를 부순다.
 *
 * 채택한 규칙(§6.1 B): 최소 한 경로는 통과 가능해야 하고, 통과율이 30% 미만인
 * 스테이지는 퍼즐이 아니라 시행착오 강요이므로 폐기한다.
 *
 * 이 검증은 **증인(witness) 기반**이다 — 오토파일럿이 통과하면 통과 가능함이
 * 증명되지만, 실패했다고 불가능이 증명되지는 않는다. 정확한 솔버는 3단계
 * (런타임 생성)에서 회랑 폭 계측과 함께 필요해진다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/stage-paths.ts
 */
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import type { RunConfig } from "../../app/src/game/engine";
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { STAGE_SECTORS } from "../../app/src/game/course";
import { targetY } from "../../app/src/game/pilot";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const GATES = STAGE_SECTORS - 1;
const MIN_CLEAR_RATE = 0.3;

function baseConfig(tier: number, stageNo: number): RunConfig {
  return {
    mode: "stage",
    tier,
    stageNo,
    seed: 0,
    startBuild: { ...NEUTRAL_BUILD },
    axisCap: 3,
    maxSectorDifficulty: 3
  };
}

/** path 의 비트 i 가 i 번째 게이트에서 아래 관을 탈지 결정한다. */
function runPath(tier: number, stageNo: number, path: number): { cleared: boolean; progress: number } {
  const state = createState(baseConfig(tier, stageNo));
  state.y = startYFor(state.course);
  launch(state);

  for (let t = 0; t < 180; t += DT) {
    const lane = (path >> Math.min(GATES - 1, state.gatesPassed)) & 1 ? "bot" : "top";
    state.holding = state.y > targetY(state, LOOKAHEAD, lane);
    const r = update(state, DT);
    if (r.event === "died") return { cleared: false, progress: state.best };
    if (state.phase === "cleared") return { cleared: true, progress: 1 };
  }
  return { cleared: false, progress: state.best };
}

let failures = 0;
const lines: string[] = [];

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
    let cleared = 0;
    let bestProgress = 0;
    const total = 1 << GATES;
    for (let path = 0; path < total; path += 1) {
      const r = runPath(tier, no, path);
      if (r.cleared) cleared += 1;
      bestProgress = Math.max(bestProgress, r.progress);
    }
    const rate = cleared / total;
    const ok = cleared > 0 && rate >= MIN_CLEAR_RATE;
    if (!ok) failures += 1;
    lines.push(
      `티어 ${tier} · ${no}   통과 경로 ${String(cleared).padStart(2)}/${total}` +
        `  (${(rate * 100).toFixed(0)}%)  최고 도달 ${(bestProgress * 100).toFixed(0)}%  ${ok ? "✓" : "✗"}`
    );
  }
}

console.log(`게이트 ${GATES}개 → 스테이지당 경로 ${1 << GATES}가지. 통과율 ${MIN_CLEAR_RATE * 100}% 미만은 폐기.\n`);
console.log(lines.join("\n"));
console.log("");
if (failures === 0) {
  console.log("결과: 모든 스테이지가 최소 한 경로로 통과 가능하고 통과율 기준을 만족한다.");
  console.log(
    "\n통과율 100% 는 선택이 무의미하다는 뜻이 아니다 — 이 검증은 **공정성 바닥**을 볼 뿐이다.\n" +
      "오토파일럿은 통로 중앙과 셔터 위상을 정확히 알고 달리므로 사람보다 훨씬 잘한다.\n" +
      "빌드 선택이 사람에게 의미가 있는지는 sector-probe.ts 가 답한다 — 같은 섹터에서\n" +
      "축 하나를 ±2 움직이면 허용 반응 지연이 20ms 와 190ms 로 갈린다."
  );
} else {
  console.log(`결과: ${failures}개 스테이지가 기준 미달 — 시드를 바꾸거나 난이도를 낮춰야 한다.`);
  process.exitCode = 1;
}
