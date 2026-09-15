/**
 * Endless 코스 재현성 확인.
 *
 * Endless 는 앞서 나가며 섹터를 이어 붙이고, 그 섹터는 공장이 **여러 프레임에
 * 걸쳐** 만든다. 그래서 두 가지가 깨질 수 있었다.
 *
 *  ① 재현성 — 폴백을 쓸 때만 난수를 더 쓰면, 공장이 제때 끝났는지(=프레임
 *     타이밍)가 난수 스트림을 바꾼다. 같은 시드가 같은 코스를 주지 못한다.
 *  ② 유형 순환 — 늦게 도착한 생성물이 이미 지나간 자리의 사양으로 만들어진 채
 *     끼어들면, 플레이어가 보는 유형 순서가 설계된 순환과 어긋난다.
 *
 * 여기서는 **공장 예산만 다르게** 준 세 주행을 비교한다. 예산이 다르면 생성물과
 * 폴백의 비율이 달라지므로, 두 버그가 살아 있으면 세 주행의 코스가 갈라진다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/endless-determinism.ts
 */
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { EndlessCourse } from "../../app/src/game/course";
import { BASE_TUNING } from "../../app/src/game/engine";
import { SECTOR_LEN } from "../../app/src/game/sectors";
import type { CoursePiece } from "../../app/src/game/types";

const SECTORS = 24;
/** 실제 주행의 프레임 간격 — 60fps, 속도 42 면 한 프레임에 0.7 만큼 나아간다. */
const FRAME_STEP = 0.7;
/** 공장을 굶기기 위한 성긴 간격. 폴백 비율을 억지로 끌어올린다. */
const SPARSE_STEP = 40;

interface Trace {
  /** 플레이어가 겪는 순서 — 섹터 유형과 게이트가 무엇을 묻는가 */
  shape: string;
  /** 통로 좌표까지 포함한 전체 지문 */
  geometry: string;
  produced: number;
  fallbacks: number;
}

function shapeOf(p: CoursePiece): string {
  if (p.kind === "gate" && p.gate) {
    return `gate(${p.gate.top.plus}+${p.gate.top.minus}-|${p.gate.bot.plus}+${p.gate.bot.minus}-)`;
  }
  const s = p.sector!;
  return `${s.type}@${(p.squeeze ?? 1).toFixed(3)}`;
}

function geometryOf(p: CoursePiece): string {
  if (p.kind === "gate") return shapeOf(p);
  const s = p.sector!;
  const nodes = s.nodes.map((n) => `${n.x.toFixed(2)}:${n.top.toFixed(3)}:${n.bot.toFixed(3)}`).join(",");
  const blocks = s.blocks.map((b) => `${b.x.toFixed(2)}:${b.y.toFixed(2)}:${b.w}:${b.h}`).join(",");
  const shutters = s.shutters.map((h) => `${h.x.toFixed(2)}:${h.side}:${h.phase.toFixed(3)}`).join(",");
  return `${shapeOf(p)}[${nodes}|${blocks}|${shutters}]`;
}

/** 공장 예산과 pump 밀도를 바꿔 같은 시드를 주행한다. 둘이 생성물/폴백 비율을 가른다. */
function trace(seed: number, budgetMs: number, step = SPARSE_STEP): Trace {
  const course = new EndlessCourse(seed, BASE_TUNING, 3);
  const build = { ...NEUTRAL_BUILD };
  const target = SECTORS * SECTOR_LEN;
  for (let x = 0; x < target; x += step) {
    course.pump(build, budgetMs);
    course.ensure(x);
  }
  const pieces = course.course.pieces.slice(0, SECTORS * 2);
  return {
    shape: pieces.map(shapeOf).join(" "),
    geometry: pieces.map(geometryOf).join(" "),
    produced: course.factory.stats.produced,
    fallbacks: course.factory.stats.fallbacks
  };
}

const SEEDS = [4242, 7, 90210];
const BUDGETS = [0, 0.4, 3, 50];

let failures = 0;

console.log("예산(ms)별 생성물/폴백 — 비율이 다르지 않으면 이 검증은 아무것도 증명하지 못한다");
console.log("시드      예산     생성  폴백");
console.log("-".repeat(40));
for (const seed of SEEDS) {
  for (const budget of BUDGETS) {
    const t = trace(seed, budget);
    console.log(
      `${String(seed).padEnd(8)}  ${String(budget).padEnd(6)}  ${String(t.produced).padStart(3)}  ${String(t.fallbacks).padStart(5)}`
    );
  }
}

console.log("\n① 같은 시드 = 같은 코스 (공장 타이밍과 무관)");
for (const seed of SEEDS) {
  const traces = BUDGETS.map((b) => ({ b, t: trace(seed, b) }));
  const base = traces[0];
  const diverged = traces.filter((x) => x.t.shape !== base.t.shape);
  if (diverged.length > 0) {
    failures += 1;
    console.log(`  시드 ${seed}: 어긋남 — 예산 ${diverged.map((d) => d.b).join(", ")}`);
    console.log(`    예산 ${base.b}: ${base.t.shape.slice(0, 120)}`);
    console.log(`    예산 ${diverged[0].b}: ${diverged[0].t.shape.slice(0, 120)}`);
  } else {
    console.log(`  시드 ${seed}: 일치 (${BUDGETS.length}개 예산, 섹터 ${SECTORS}개)`);
  }
}

console.log("\n② 유형 순환 — 생성물이 늦게 도착해도 자리의 유형이 바뀌지 않는다");
for (const seed of SEEDS) {
  const slow = trace(seed, 0).shape.split(" ").filter((s) => !s.startsWith("gate"));
  const fast = trace(seed, 50).shape.split(" ").filter((s) => !s.startsWith("gate"));
  const mismatch = slow.findIndex((s, i) => s !== fast[i]);
  if (mismatch >= 0) {
    failures += 1;
    console.log(`  시드 ${seed}: ${mismatch}번 자리에서 갈림 — 폴백 ${slow[mismatch]} / 생성물 ${fast[mismatch]}`);
  } else {
    console.log(`  시드 ${seed}: ${slow.slice(0, 8).join(" ")} … (폴백 주행과 생성 주행이 동일)`);
  }
}

console.log("\n③ 같은 시드 + 같은 예산 = 통로 좌표까지 동일");
for (const seed of SEEDS) {
  const a = trace(seed, 3).geometry;
  const b = trace(seed, 3).geometry;
  if (a !== b) {
    failures += 1;
    console.log(`  시드 ${seed}: 두 번 주행이 다르다`);
  } else {
    console.log(`  시드 ${seed}: 동일 (${a.length}자 지문)`);
  }
}

/*
 * ④ 위 ①은 "코스의 모양"이 타이밍과 무관함을 보인다. 통로 좌표까지 같으려면
 * 각 자리가 생성물이었는지 폴백이었는지도 같아야 하는데, 그건 공장이 제때
 * 끝냈는지에 달렸다. 프레임 예산(3ms)을 지키는 한 원리적으로 보장할 수 없다 —
 * Performance Reliability 가 이 게임의 유일한 필수 Contract 이므로 그 쪽을 판다.
 *
 * 대신 실측한다. 실제 프레임 밀도로 돌리면 공장은 섹터 하나를 만드는 데 필요한
 * 시간보다 20초 이상 앞서 주문을 받으므로, 예산을 크게 흔들어도 배달 결과가
 * 같아야 한다. 같다면 "실사용에서는 좌표까지 재현된다"고 말할 수 있다.
 */
console.log("\n④ 실제 프레임 밀도에서는 좌표까지 재현되는가 (예산 1~50ms)");
for (const seed of SEEDS) {
  const traces = [1, 3, 8, 50].map((b) => ({ b, t: trace(seed, b, FRAME_STEP) }));
  const base = traces[0];
  const diverged = traces.filter((x) => x.t.geometry !== base.t.geometry);
  if (diverged.length > 0) {
    failures += 1;
    console.log(`  시드 ${seed}: 어긋남 — 예산 ${diverged.map((d) => d.b).join(", ")}`);
  } else {
    console.log(
      `  시드 ${seed}: 동일 (생성 ${base.t.produced} / 폴백 ${base.t.fallbacks}, 4개 예산)`
    );
  }
}

console.log(failures === 0 ? "\n통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
