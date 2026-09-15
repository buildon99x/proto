/**
 * 솔버 교차 검증.
 *
 * 솔버는 "통과 불가"를 주장할 수 있는 유일한 도구이므로, 그 주장이 틀리면
 * 3단계 전체가 잘못된 기반 위에 선다. 두 가지를 확인한다.
 *
 *  1. **모순이 없는가** — 오토파일럿이 통과한 조합을 솔버가 불가능이라 하면 솔버가 틀렸다.
 *  2. **실제로 불가능을 잡는가** — 통과할 수 없게 만든 코스를 불가능이라 말해야 한다.
 *
 * 반대 방향(솔버는 가능, 파일럿은 실패)은 모순이 아니다. 파일럿은 근사이고
 * 솔버가 정확하기 때문이다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/solver-check.ts
 */
import { AXES, NEUTRAL_BUILD, applyTrade } from "../../app/src/game/axes";
import { BASE_TUNING, createState, launch, startYFor, update } from "../../app/src/game/engine";
import { SECTORS, SECTOR_LEN } from "../../app/src/game/sectors";
import { solvePiece } from "../../app/src/game/solver";
import { targetY } from "../../app/src/game/pilot";
import type { AxisKey, Build, Course, CoursePiece, Sector } from "../../app/src/game/types";

const DT = 1 / 120;

function sectorPiece(sector: Sector, squeeze = 1): CoursePiece {
  return { kind: "sector", startX: 0, endX: SECTOR_LEN, sector, squeeze };
}

function course(piece: CoursePiece): Course {
  return { pieces: [piece], finishX: SECTOR_LEN };
}

function pilotClears(piece: CoursePiece, build: Build): boolean {
  const state = createState({
    mode: "stage",
    tier: 1,
    stageNo: 1,
    seed: 0,
    startBuild: build,
    axisCap: 3,
    maxSectorDifficulty: 3
  });
  state.course = course(piece);
  state.endless = null;
  state.y = startYFor(state.course);
  launch(state);
  for (let t = 0; t < 60; t += DT) {
    state.holding = state.y > targetY(state, 0.14, "top");
    const r = update(state, DT);
    if (r.event === "died") return false;
    if (state.phase === "cleared") return true;
  }
  return false;
}

function solverSays(piece: CoursePiece, build: Build): { passable: boolean; minWidth: number } {
  const startY = startYFor(course(piece));
  const res = solvePiece({
    piece,
    build,
    base: BASE_TUNING,
    startSpans: [{ lo: startY - 1e-6, hi: startY + 1e-6 }],
    startTime: 0
  });
  return { passable: res.passable, minWidth: res.minWidth };
}

const builds: Array<{ label: string; build: Build }> = [{ label: "중립", build: { ...NEUTRAL_BUILD } }];
for (const axis of AXES) {
  for (const tick of [-2, 2]) {
    builds.push({ label: `${axis}${tick > 0 ? "+" : "−"}2`, build: { ...NEUTRAL_BUILD, [axis]: tick } as Build });
  }
}

let contradictions = 0;
let checked = 0;
const widthRows: string[] = [];

for (const sector of SECTORS) {
  const piece = sectorPiece(sector);
  const widths: string[] = [];
  for (const { label, build } of builds) {
    const solver = solverSays(piece, build);
    const pilot = pilotClears(piece, build);
    checked += 1;
    if (pilot && !solver.passable) {
      contradictions += 1;
      console.log(`모순: ${sector.id} / ${label} — 파일럿은 통과했는데 솔버가 불가능이라 한다`);
    }
    if (label === "중립") widths.push(solver.minWidth.toFixed(1));
  }
  widthRows.push(`${sector.id.padEnd(18)} 최소 생존 회랑 폭 ${widths[0].padStart(6)}`);
}

console.log("중립 빌드에서 각 섹터의 최소 생존 회랑 폭 — 좁을수록 요구 정밀도가 높다\n");
console.log(widthRows.join("\n"));

// 통과할 수 없는 코스를 실제로 잡는지
const impossible = sectorPiece(SECTORS.find((s) => s.id === "corridor-flat")!, 0.05);
const verdict = solverSays(impossible, { ...NEUTRAL_BUILD });
console.log(`\n극단으로 조인 통로(squeeze 0.05): 솔버 판정 ${verdict.passable ? "통과 가능 ✗" : "통과 불가 ✓"}`);

// 편향으로 따라잡을 수 없는 상승 회랑
const climb = sectorPiece(SECTORS.find((s) => s.id === "corridor-up")!);
const biasDown = solverSays(climb, { slope: -2, speed: 0, bias: -3 } as Build);
console.log(
  `상승 회랑 + 각도−2/편향−3: 솔버 판정 ${biasDown.passable ? "통과 가능" : "통과 불가"} (최소 폭 ${biasDown.minWidth.toFixed(2)})`
);

console.log(`\n조합 ${checked}개 검사, 모순 ${contradictions}개`);
if (contradictions > 0 || verdict.passable) {
  process.exitCode = 1;
  console.log("결과: 솔버를 신뢰할 수 없다.");
} else {
  console.log("결과: 오토파일럿과 모순이 없고, 통과 불가를 실제로 잡아낸다.");
}

void applyTrade;
void ({} as AxisKey);
