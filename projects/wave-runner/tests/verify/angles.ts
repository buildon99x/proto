/**
 * 축 눈금 ↔ 실제 화면 각도 대응표.
 *
 * 카메라 줌은 x·y 에 같은 배율로 걸리므로(`render.ts` 의 sx/sy) **월드 각도가 곧 화면
 * 각도**다. 그리고 각도는 `atan(rate / speed)` 인데 `rate = slope × (1 ± bias) × speed`
 * 이므로 **속도가 약분된다** — 전진 속도를 아무리 바꿔도 지그재그의 각도는 변하지 않는다.
 *
 * 값은 엔진의 단일 출처인 `resolve()` 에서 뽑는다.
 */
import { AXES, resolve } from "../../app/src/game/axes";
import GRADES from "../../app/src/game/runner-grades.json";
import { RUNNERS, applyRunner } from "../../app/src/game/runners";
import { BASE_TUNING } from "../../app/src/game/engine";
import type { Build, Tuning } from "../../app/src/game/types";

const DEG = 180 / Math.PI;
const T: Tuning = { ...BASE_TUNING, axisMin: -3, axisMax: 3 };

function angles(build: Build, t: Tuning) {
  const r = resolve(build, t);
  const rise = Math.atan(r.riseRate / r.speed) * DEG;
  const fall = Math.atan(r.fallRate / r.speed) * DEG;
  return { rise, fall, apex: rise + fall, speed: r.speed };
}

function f(n: number, w = 5): string {
  return n.toFixed(1).padStart(w);
}

const ticks = [-3, -2, -1, 0, 1, 2, 3];

console.log("== 각도 축만 움직일 때 (편향 0) ==");
console.log("눈금   slope   상승각   하강각   꼭지각");
for (const n of ticks) {
  const b: Build = { slope: n, speed: 0, bias: 0 };
  const a = angles(b, T);
  const s = resolve(b, T).slope;
  console.log(`${String(n).padStart(3)}   ${f(s, 5)}   ${f(a.rise)}°  ${f(a.fall)}°  ${f(a.apex, 6)}°`);
}

console.log("\n== 속도 축이 각도를 바꾸는가 (각도 0 · 편향 0) ==");
console.log("눈금   speed   상승각   하강각");
for (const n of ticks) {
  const a = angles({ slope: 0, speed: n, bias: 0 }, T);
  console.log(`${String(n).padStart(3)}   ${f(a.speed, 5)}   ${f(a.rise)}°  ${f(a.fall)}°`);
}

console.log("\n== 편향이 상승/하강을 가르는가 (각도 0) ==");
console.log("눈금   상승각   하강각   차이   꼭지각");
for (const n of ticks) {
  const a = angles({ slope: 0, speed: 0, bias: n }, T);
  console.log(`${String(n).padStart(3)}   ${f(a.rise)}°  ${f(a.fall)}°  ${f(a.rise - a.fall)}°  ${f(a.apex, 6)}°`);
}

console.log("\n== 도달 가능한 전 범위 (각도 × 편향) — 상승각 / 하강각 ==");
process.stdout.write("각도\\편향");
for (const bn of ticks) process.stdout.write(`   ${String(bn).padStart(11)}`);
process.stdout.write("\n");
let minAng = Infinity;
let maxAng = -Infinity;
for (const sn of ticks) {
  process.stdout.write(String(sn).padStart(8));
  for (const bn of ticks) {
    const a = angles({ slope: sn, speed: 0, bias: bn }, T);
    minAng = Math.min(minAng, a.rise, a.fall);
    maxAng = Math.max(maxAng, a.rise, a.fall);
    process.stdout.write(`   ${f(a.rise, 4)}/${f(a.fall, 4)}`);
  }
  process.stdout.write("\n");
}

console.log(`\n도달 가능한 한쪽 각도 범위: ${minAng.toFixed(1)}° ~ ${maxAng.toFixed(1)}°`);

// 속도 독립성을 단언으로 박아 둔다 — 회귀하면 이 스크립트가 실패한다.
let worst = 0;
for (const sn of ticks) {
  for (const bn of ticks) {
    const base = angles({ slope: sn, speed: 0, bias: bn }, T);
    for (const vn of ticks) {
      const other = angles({ slope: sn, speed: vn, bias: bn }, T);
      worst = Math.max(worst, Math.abs(base.rise - other.rise), Math.abs(base.fall - other.fall));
    }
  }
}
console.log(`속도 축에 의한 각도 변동 최대: ${worst.toExponential(1)}°`);
if (worst > 1e-9) {
  console.error("FAIL: 속도가 각도를 바꾼다");
  process.exit(1);
}
console.log("OK: 각도는 속도와 독립이다");

console.log(`\n축 눈금 순서: ${AXES.join(" · ")}`);

// ── 기체별 각도 ────────────────────────────────────────────────

console.log("\n\n== 기체별 지그재그 각도 ==");
console.log("기체     중심/각도폭/편향폭   눈금0     각도−3..+3      한쪽 각 전 범위");
const spread: Array<{ name: string; lo: number; hi: number; mid: number }> = [];
for (const runner of RUNNERS) {
  const rt = applyRunner(T, runner);
  const mid = angles({ slope: 0, speed: 0, bias: 0 }, rt).rise;
  const s3m = angles({ slope: -3, speed: 0, bias: 0 }, rt).rise;
  const s3p = angles({ slope: 3, speed: 0, bias: 0 }, rt).rise;
  let lo = Infinity;
  let hi = -Infinity;
  for (const sn of ticks) {
    for (const bn of ticks) {
      const a = angles({ slope: sn, speed: 0, bias: bn }, rt);
      lo = Math.min(lo, a.rise, a.fall);
      hi = Math.max(hi, a.rise, a.fall);
    }
  }
  spread.push({ name: runner.name, lo, hi, mid });
  const params = `${runner.slopeCenter.toFixed(2)}/${runner.slopeSpan.toFixed(1)}/${runner.biasSpan.toFixed(1)}`;
  console.log(
    `${runner.name.padEnd(6)}   ${params.padEnd(17)}  ${f(mid)}°   ${f(s3m)}°..${f(s3p)}°   ${f(lo)}°..${f(hi)}°  (폭 ${f(hi - lo)}°)`
  );
}

// ── 불변식 ────────────────────────────────────────────────────

console.log("\n== 불변식 ==");
let fails = 0;

// ① 중립 없음 — 양방향 수직 속도가 모두 0 보다 커야 한다.
//    |편향| ≥ 1 이면 한쪽이 멈추고 "가만히 있는 선택지"가 생긴다. 문법층의 첫 조항이다.
let minRate = Infinity;
for (const runner of RUNNERS) {
  const rt = applyRunner(T, runner);
  for (const sn of ticks) {
    for (const vn of ticks) {
      for (const bn of ticks) {
        const r = resolve({ slope: sn, speed: vn, bias: bn }, rt);
        minRate = Math.min(minRate, r.riseRate, r.fallRate);
      }
    }
  }
}
if (minRate <= 0) {
  console.error(`FAIL 중립 없음: 최소 수직 속도 ${minRate.toFixed(3)} — 한쪽이 멈춘다`);
  fails += 1;
} else {
  console.log(`OK 중립 없음: 모든 기체·전 눈금에서 최소 수직 속도 ${minRate.toFixed(2)} > 0`);
}

// ② 표준 기체는 2단계의 표와 소수점까지 같아야 한다.
//    그래야 그 위에서 구운 스테이지 시드와 여유 수치가 그대로 산다.
const LEGACY = {
  slope: [0.62, 0.74, 0.86, 1.0, 1.16, 1.34, 1.54],
  speed: [30, 34, 38, 42, 47, 52, 58],
  bias: [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]
};
let drift = 0;
const dart = applyRunner(T, RUNNERS[0]);
for (const n of ticks) {
  const r = resolve({ slope: n, speed: n, bias: n }, dart);
  drift = Math.max(
    drift,
    Math.abs(r.slope - LEGACY.slope[n + 3]),
    Math.abs(r.speed - LEGACY.speed[n + 3])
  );
}
if (drift > 1e-9) {
  console.error(`FAIL 표준 기체가 표에서 벗어났다: 최대 ${drift.toExponential(2)}`);
  fails += 1;
} else {
  console.log("OK 표준 기체: 2단계 표와 동일 (편차 0)");
}

// ③ 각도 폭이 다르면 도달 각도 범위도 달라야 한다 — 같으면 기체가 아니다.
const dartSpread = spread[0].hi - spread[0].lo;
for (const s of spread.slice(1)) {
  const d = Math.abs(s.hi - s.lo - dartSpread);
  const mid = Math.abs(s.mid - spread[0].mid);
  if (d < 1 && mid < 1) {
    console.error(`FAIL ${s.name}: 표준과 각도가 사실상 같다 (범위차 ${d.toFixed(1)}° · 중심차 ${mid.toFixed(1)}°)`);
    fails += 1;
  }
}
if (fails === 0) console.log("OK 기체 구분: 모든 기체가 표준과 각도 범위 또는 중심에서 1° 이상 다르다");

// ④ 피커가 읽는 등급표가 모든 기체를 덮는가.
//    기체를 더하고 `runner-grades.ts` 를 다시 굽지 않으면 그 기체만 막대가 비어 버린다.
const missing = RUNNERS.filter((r) => !(r.id in (GRADES.runners as Record<string, unknown>)));
if (missing.length > 0) {
  console.error(
    `FAIL 등급표 누락: ${missing.map((r) => r.name).join(", ")} — ` +
      "pnpm exec tsx projects/wave-runner/tests/verify/runner-grades.ts 를 다시 돌려야 한다"
  );
  fails += 1;
} else {
  console.log(`OK 등급표: 기체 ${RUNNERS.length}종 전부 덮는다 (측정 ${GRADES.measuredAt})`);
}

process.exit(fails === 0 ? 0 : 1);
