/**
 * 생성기 검증 — 목표 난이도를 실제로 겨냥하는가.
 *
 * 3단계의 주장은 "난이도를 눈대중이 아니라 생존 회랑 폭으로 겨냥할 수 있다"이다.
 * 그 주장이 참이려면 (1) 생성물이 통과 가능하고 (2) 목표 폭에 수렴하며
 * (3) 목표를 낮추면 실제로 좁아져야 한다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/generation.ts
 */
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { BASE_TUNING } from "../../app/src/game/engine";
import { BEAT_WORLD, generateSector, widthForDifficulty } from "../../app/src/game/generate";
import { SECTOR_TYPE_LABEL } from "../../app/src/game/sectors";
import type { SectorType } from "../../app/src/game/types";

const TYPES: SectorType[] = ["gorge", "corridor", "scatter", "pulse"];
const DIFFICULTIES = [1, 2, 3, 4];

console.log(`리듬 격자 ${BEAT_WORLD} 월드 단위/박 (120BPM · 기본 속도 42 기준)\n`);
const head = ["유형".padEnd(8), ...DIFFICULTIES.map((d) => `난이도 ${d}`.padStart(22))].join("");
console.log(head);
console.log("-".repeat(head.length));

let failures = 0;
const trend: Record<string, number[]> = {};

for (const type of TYPES) {
  const cells: string[] = [];
  const widths: number[] = [];
  for (const d of DIFFICULTIES) {
    const target = widthForDifficulty(d);
    const got = generateSector({
      type,
      targetWidth: target,
      seed: 900 + d * 17 + type.length,
      build: { ...NEUTRAL_BUILD },
      base: BASE_TUNING,
      candidates: 14
    });
    if (!got) {
      failures += 1;
      cells.push("생성 실패".padStart(22));
      widths.push(Number.NaN);
      continue;
    }
    widths.push(got.minWidth);
    cells.push(`${got.minWidth.toFixed(1)}→${target} ${(got.minSlackSec * 1000).toFixed(0)}ms`.padStart(22));
  }
  trend[type] = widths;
  console.log([SECTOR_TYPE_LABEL[type].padEnd(8), ...cells].join(""));
}

console.log("\n칸 = 실제 최소 생존 회랑 폭 → 목표 폭, 그리고 시간으로 환산한 여유");

let monotonic = true;
for (const type of TYPES) {
  const w = trend[type];
  for (let i = 1; i < w.length; i += 1) {
    if (Number.isFinite(w[i]) && Number.isFinite(w[i - 1]) && w[i] > w[i - 1] + 6) monotonic = false;
  }
}

console.log("");
if (failures > 0) {
  console.log(`결과: ${failures}개 조합에서 통과 가능한 후보를 못 찾았다.`);
  process.exitCode = 1;
} else if (!monotonic) {
  console.log("결과: 목표를 낮춰도 실제 폭이 따라 좁아지지 않는다 — 겨냥이 되지 않는다.");
  process.exitCode = 1;
} else {
  console.log("결과: 전 조합에서 통과 가능한 섹터를 생성했고, 목표를 낮추면 실제 폭도 좁아진다.");
}
