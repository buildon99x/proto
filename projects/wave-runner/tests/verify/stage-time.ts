/**
 * 한 판의 길이 — 스테이지 플레이 타임이 목표 구간 안인가.
 *
 * 1히트 즉사에서 시도당 비용을 낮추는 것이 이 게임의 의도적 이탈이므로(spec 의
 * "모드" 절), 한 판이 얼마나 걸리는지는 튜닝값이 아니라 **지켜야 할 조건**이다.
 * 그런데 이 값은 어디에도 적혀 있지 않고 구조에서 떨어진다 — 그래서 아무도 모르는
 * 사이에 늘어날 수 있다. 여기서 못 박는다.
 *
 * ## 무엇이 이 시간을 정하는가
 *
 * 플레이 타임은 `코스 길이 ÷ 전진 속도` 하나다. 코스 길이는
 * `STAGE_SECTORS × SECTOR_LEN + (STAGE_SECTORS − 1) × gateTotalLen` 으로 고정이고,
 * 전진 속도는 속도 축 눈금이 정한다(−3..+3 → 30..58). 티어가 올라도 길이는 그대로라
 * **난이도는 시간을 거의 바꾸지 않는다** — 바꾸는 것은 게이트에서 속도를 올리는
 * 교환을 잡느냐뿐이다.
 *
 * 그래서 두 가지를 따로 잰다.
 *
 *  1. **이론 중립 시간** — 속도 눈금 0 으로 완주했을 때. 구조만으로 결정되는 값이라
 *     결정적이고, 기준을 어긴 순간을 정확히 짚는다
 *  2. **실측 평균** — 오토파일럿이 실제로 완주한 시간의 평균. 게이트 교환이 속도를
 *     어디로 끌고 가는지가 여기서만 보인다
 *
 * 실측이 이론보다 조금 짧게 나오는 것이 정상이다. 중립 유지 정책이 잡는 교환 중에
 * 속도를 올리는 것이 섞이기 때문이다.
 *
 * ## 구간을 50~60초로 잡은 근거
 *
 * 사람이 정한 목표다(측정이 아니다). 근거는 spec 이 적어 둔 것과 같다 — 1히트 즉사에
 * 500ms 자동 재시작이므로 **클리어까지 여러 번 죽는 것이 기본**이고, 한 판이 길수록
 * 한 번의 실수가 되돌리는 시간이 길어진다. 60초가 넘으면 마지막 섹터의 실수가 1분을
 * 지우고, 50초 아래로 내려가면 빌드를 조립할 게이트 수가 모자란다.
 *
 * 이 구간을 바꾸려면 `STAGE_SECTORS` 를 바꾸는 것이 유일하게 깨끗한 손잡이다.
 * 섹터 길이를 줄이면 수제 섹터의 내부 기하가 압축되고, 전진 속도를 올리면 여유가
 * (`W/2·rate`, `rate = slope×speed`) 속도에 반비례해 깎인다 — 둘 다 시간만 바꾸지
 * 않는다. 섹터 수만이 **어느 한 순간의 난이도도 바꾸지 않고** 노출 시간을 바꾼다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/stage-time.ts
 */
import { STAGE_SECTORS, gateTotalLen } from "../../app/src/game/course";
import { BASE_TUNING, createState, launch, update } from "../../app/src/game/engine";
import type { GameState } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { RUNNERS } from "../../app/src/game/runners";
import type { Runner } from "../../app/src/game/runners";
import { SECTOR_LEN } from "../../app/src/game/sectors";
import type { AxisKey } from "../../app/src/game/types";

/** 목표 구간(초). 사람이 정한 값이고, 위 주석이 근거다. */
const MIN_SEC = 50;
const MAX_SEC = 60;

const DT = 1 / 120;
const LOOKAHEAD = 0.14;
const GATES = STAGE_SECTORS - 1;
/** 처음 만나는 사람의 조건으로 잰다 — `runner-grades.ts` 와 같은 조건이라 수치가 대조된다. */
const CAP = 2;

/** 빌드를 중립 가까이 유지하는 관을 고른다 — 순진하지만 처음 달릴 때의 기본 정책이다. */
function laneNeutral(s: GameState): "top" | "bot" {
  const piece = s.course.pieces.find((p) => p.kind === "gate" && p.endX > s.x);
  const gate = piece?.gate;
  if (!gate) return "top";
  const cost = (tr: { plus: AxisKey; minus: AxisKey }) => {
    const b = { ...s.build };
    b[tr.plus] = Math.min(s.base.axisMax, b[tr.plus] + 1);
    b[tr.minus] = Math.max(s.base.axisMin, b[tr.minus] - 1);
    return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
  };
  return cost(gate.bot) < cost(gate.top) ? "bot" : "top";
}

/** 클리어까지 걸린 초. 죽거나 시간을 넘기면 null. */
function clearSec(runner: Runner, tier: number, no: number): number | null {
  const state = createState({
    mode: "stage",
    tier,
    stageNo: no,
    seed: 0,
    runner: runner.id,
    startBuild: { ...runner.startBuild },
    axisCap: CAP,
    maxSectorDifficulty: 3
  });
  launch(state);
  for (let t = 0; t < 300; t += DT) {
    state.holding = state.y - targetY(state, LOOKAHEAD, laneNeutral(state)) > 0;
    const r = update(state, DT);
    if (r.event === "died") return null;
    if (state.phase === "cleared") return t + DT;
  }
  return null;
}

const courseLen = STAGE_SECTORS * SECTOR_LEN + GATES * gateTotalLen(BASE_TUNING);
/** 속도 눈금 0 의 전진 속도. 기체는 속도 곡선이 전부 1.0 이라 이 값을 바꾸지 않는다. */
const neutralSec = courseLen / BASE_TUNING.speed;

console.log(
  `코스 ${courseLen.toFixed(0)} 월드단위 = 섹터 ${STAGE_SECTORS}×${SECTOR_LEN}` +
    ` + 게이트 ${GATES}×${gateTotalLen(BASE_TUNING).toFixed(1)}`
);
console.log(
  `이론 시간 — 속도 눈금 −2/0/+2 → ${(courseLen / 34).toFixed(1)} / ${neutralSec.toFixed(1)} / ${(courseLen / 52).toFixed(1)}초\n`
);

const header = Array.from({ length: MAX_TIER }, (_, i) => `티어${i + 1}`.padEnd(STAGES_PER_TIER * 5 + 2)).join("");
console.log(`기체     ${header}| 평균`);
console.log("-".repeat(20 + MAX_TIER * (STAGES_PER_TIER * 5 + 2)));

const all: number[] = [];
const perTier: number[][] = Array.from({ length: MAX_TIER }, () => []);
let notCleared = 0;

for (const runner of RUNNERS) {
  const cells: string[] = [];
  const mine: number[] = [];
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    const row: string[] = [];
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      const sec = clearSec(runner, tier, no);
      if (sec === null) {
        row.push("   ✗");
        notCleared += 1;
        continue;
      }
      row.push(sec.toFixed(1).padStart(5));
      mine.push(sec);
      all.push(sec);
      perTier[tier - 1].push(sec);
    }
    cells.push(`${row.join("")}  `);
  }
  const avg = mine.length ? mine.reduce((a, b) => a + b, 0) / mine.length : NaN;
  console.log(
    `${runner.name.padEnd(6)} ${cells.join("")}| ${mine.length ? `${avg.toFixed(1)}초` : "  —  "}` +
      ` (${mine.length}/${MAX_TIER * STAGES_PER_TIER} 클리어)`
  );
}

console.log("\n티어별 평균(클리어한 판만)");
perTier.forEach((xs, i) => {
  if (xs.length === 0) return console.log(`  티어 ${i + 1}: 표본 없음`);
  const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
  console.log(
    `  티어 ${i + 1}: ${avg.toFixed(1)}초  (n=${xs.length}, ${Math.min(...xs).toFixed(1)}~${Math.max(...xs).toFixed(1)}초)`
  );
});

const measured = all.length ? all.reduce((a, b) => a + b, 0) / all.length : NaN;
console.log(
  `\n이론 중립 ${neutralSec.toFixed(1)}초  ·  실측 평균 ${all.length ? `${measured.toFixed(1)}초` : "—"}` +
    ` (n=${all.length}, 못 깬 판 ${notCleared})  ·  목표 ${MIN_SEC}~${MAX_SEC}초`
);

// 오토파일럿이 한 판도 못 깨면 실측 평균은 의미가 없다 — 그것 자체가 다른 검증기의
// 일이므로 여기서는 이론값만으로 판정하고, 표본이 없다는 사실을 말한다.
const fails: string[] = [];
if (neutralSec < MIN_SEC || neutralSec > MAX_SEC) {
  fails.push(
    `이론 중립 시간 ${neutralSec.toFixed(1)}초가 목표 ${MIN_SEC}~${MAX_SEC}초 밖이다.` +
      ` 코스 길이나 기본 속도가 바뀌었다 — STAGE_SECTORS 를 다시 보라.`
  );
}
if (all.length > 0 && (measured < MIN_SEC || measured > MAX_SEC)) {
  fails.push(
    `실측 평균 ${measured.toFixed(1)}초가 목표 ${MIN_SEC}~${MAX_SEC}초 밖이다.` +
      ` 길이는 그대로인데 게이트 교환이 속도를 한쪽으로 몰고 있다.`
  );
}
if (all.length === 0) {
  fails.push("오토파일럿이 한 판도 클리어하지 못해 실측 표본이 없다.");
}

if (fails.length > 0) {
  fails.forEach((f) => console.error(`\nFAIL: ${f}`));
  process.exit(1);
}
console.log("\nPASS — 이론·실측 둘 다 목표 구간 안이다.");
