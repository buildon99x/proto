/**
 * 여백 질감이 사양을 지키는가.
 *
 * 이 검증기는 질감이 **규격을 지키는지**만 말한다. 질감이 **유형을 구분시키는지**는
 * 사람으로만 잴 수 있다(정지 식별 80% · 게이트 즉답 70% — margin-texture.md §7).
 * 오토파일럿으로 대신할 수 없는 이유는 근사의 문제가 아니라 원리의 문제다 —
 * 파일럿은 픽셀을 보지 않고 targetY() 로 기하를 직접 읽는다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/margin-texture.ts
 */
import { buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING } from "../../app/src/game/engine";
import { CROSSFADE_SLICES, KEEPOUT, textureRegions } from "../../app/src/game/margin/bands";
import {
  ACHROMATIC_SAT,
  DEFAULT_PAINT,
  TEXTURE_CONTRAST_CAP,
  WALL,
  WALL_AREA,
  accentContrast,
  contrastRatio,
  hueAllowed,
  inkFor,
  textureContrast
} from "../../app/src/game/margin/palette";
import { inkArea, texturePattern } from "../../app/src/game/margin/pattern";
import { SECTORS, SECTOR_LEN, sample } from "../../app/src/game/sectors";
import type { SectorType } from "../../app/src/game/types";

const TYPES: SectorType[] = ["gorge", "corridor", "scatter", "pulse"];
/** 잉크 총량 균형 — 유형 간 최대/최소 비 */
const INK_BALANCE_MAX = 1.1;

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};

console.log("① 색 예산 — 대비 상한과 허용 색상대");
for (const type of TYPES) {
  const { ink, accent } = inkFor(type);
  const ci = contrastRatio(WALL, ink);
  const ca = contrastRatio(WALL, accent);
  const want = textureContrast(type);
  const wantAccent = accentContrast(type);
  const ok =
    Math.abs(ci - want) < 0.02 &&
    Math.abs(ca - wantAccent) < 0.02 &&
    ci <= TEXTURE_CONTRAST_CAP + 1e-9 &&
    ca <= TEXTURE_CONTRAST_CAP + 1e-9;
  console.log(
    `  ${type.padEnd(9)} 잉크 ${ink} ${ci.toFixed(2)}:1 (목표 ${want.toFixed(2)}) · 강조 ${accent} ${ca.toFixed(2)}:1`
  );
  if (!ok) fail(`${type}: 대비가 목표 또는 상한과 어긋난다`);
}
if (!hueAllowed(DEFAULT_PAINT.hue, DEFAULT_PAINT.sat)) {
  fail(`기본 도료 색상 ${DEFAULT_PAINT.hue}° 가 허용 대역 밖이다`);
} else {
  console.log(
    `  도료 ${DEFAULT_PAINT.id} h=${DEFAULT_PAINT.hue}° s=${DEFAULT_PAINT.sat}` +
      (DEFAULT_PAINT.sat < ACHROMATIC_SAT ? " (무채로 간주)" : " (허용 대역)")
  );
}

console.log("\n② 잉크 총량 — 벽 면적이 다르므로 대비로 보정한 뒤 균형이 맞는가");
const loads: Array<{ type: SectorType; ink: number; load: number }> = [];
for (const type of TYPES) {
  const p = texturePattern(type);
  const base = textureContrast(type) - 1;
  const acc = accentContrast(type) - 1;
  let weighted = 0;
  for (const s of p.shapes) {
    const area =
      s.kind === "band" ? s.h * p.tile : s.kind === "rib" ? s.w * p.tile : Math.PI * s.r * s.r;
    weighted += area * (s.kind === "band" && s.accent ? acc : base);
  }
  const load = (weighted / (p.tile * p.tile)) * WALL_AREA[type];
  loads.push({ type, ink: inkArea(p), load });
  console.log(
    `  ${type.padEnd(9)} 타일 ${p.tile} · 잉크 ${(inkArea(p) * 100).toFixed(1)}% · 벽 ${(WALL_AREA[type] * 100).toFixed(1)}% → 부하 ${load.toFixed(5)}`
  );
}
const hi = Math.max(...loads.map((l) => l.load));
const lo = Math.min(...loads.map((l) => l.load));
console.log(`  최대/최소 = ${(hi / lo).toFixed(3)} (허용 ${INK_BALANCE_MAX})`);
if (hi / lo > INK_BALANCE_MAX) fail("유형 간 잉크 총량이 균형을 벗어났다");

console.log("\n③ 타일 이음매 — 결의 주기가 타일을 나누고, 형상이 타일 안에 있는가");
for (const type of TYPES) {
  const p = texturePattern(type);
  let bad = 0;
  for (const s of p.shapes) {
    if (s.kind === "band" && (s.y - s.h / 2 < 0 || s.y + s.h / 2 > p.tile)) bad += 1;
    if (s.kind === "rib" && (s.x - s.w / 2 < 0 || s.x + s.w / 2 > p.tile)) bad += 1;
  }
  const bands = p.shapes.filter((s) => s.kind === "band").length;
  const ribs = p.shapes.filter((s) => s.kind === "rib").length;
  const period = bands > 0 ? p.tile / bands : ribs > 0 ? p.tile / ribs : 0;
  const divides = period === 0 || Math.abs(p.tile / period - Math.round(p.tile / period)) < 1e-9;
  console.log(
    `  ${type.padEnd(9)} 타일 ${p.tile} · 형상 ${p.shapes.length}개 · 주기 ${period || "—"} · 벗어남 ${bad}`
  );
  if (bad > 0) fail(`${type}: 형상 ${bad}개가 타일 경계를 넘는다 (자갈이 아닌 결은 감싸지 않는다)`);
  if (!divides) fail(`${type}: 결의 주기가 타일을 나누지 않아 이음매가 생긴다`);
}

console.log("\n④ 결의 방향 — 대비로 못 가르므로 방향으로 가른다");
const grains = TYPES.map((t) => `${t}=${texturePattern(t).grain}`);
console.log(`  ${grains.join(" · ")}`);
const coarse = texturePattern("gorge");
const fine = texturePattern("corridor");
const coarseBand = coarse.shapes.find((s) => s.kind === "band");
const fineBand = fine.shapes.find((s) => s.kind === "band");
if (coarseBand?.kind === "band" && fineBand?.kind === "band") {
  const spacingRatio = coarse.tile / coarse.shapes.length / (fine.tile / fine.shapes.length);
  const thicknessRatio = coarseBand.h / fineBand.h;
  console.log(`  협곡 대 회랑 — 간격 ${spacingRatio.toFixed(1)}배 · 두께 ${thicknessRatio.toFixed(1)}배`);
  // 둘 다 가로결이므로 2차 구분이 충분히 벌어져 있어야 한다
  if (spacingRatio < 2 || thicknessRatio < 2) {
    fail("협곡과 회랑이 같은 방향인데 간격·두께 차가 2배 미만이다 — 혼동한다");
  }
}
if (new Set(TYPES.map((t) => texturePattern(t).grain)).size < 3) {
  fail("네 유형이 세 방향 미만으로 뭉쳤다");
}

console.log("\n⑤ 벽 면적 상수가 실측과 맞는가 (틀리면 대비 보정이 통째로 어긋난다)");
const measured: Record<string, number[]> = {};
for (const s of SECTORS) {
  let wall = 0;
  let n = 0;
  for (let x = 0; x <= SECTOR_LEN; x += 2) {
    const b = sample(s.nodes, x);
    wall += b.top + (100 - b.bot);
    n += 1;
  }
  (measured[s.type] ??= []).push(wall / n / 100);
}
for (const type of TYPES) {
  const avg = measured[type].reduce((a, b) => a + b, 0) / measured[type].length;
  const diff = Math.abs(avg - WALL_AREA[type]);
  console.log(`  ${type.padEnd(9)} 실측 ${(avg * 100).toFixed(1)}% · 상수 ${(WALL_AREA[type] * 100).toFixed(1)}%`);
  if (diff > 0.02) fail(`${type}: 벽 면적 상수가 실측과 ${(diff * 100).toFixed(1)}%p 어긋난다`);
}

console.log("\n⑥ 구간 분할 — 스팬은 비우고, 리드인에서는 두 유형의 합이 1인가");
for (const [tier, no] of [
  [1, 1],
  [2, 2],
  [4, 3]
] as const) {
  const course = buildStageCourse(tier, no, BASE_TUNING);
  const regions = textureRegions(course, 0, course.finishX, true);
  let spanInk = 0;
  for (const g of course.pieces) {
    if (g.kind !== "gate" || !g.gate) continue;
    const { startX, endX } = g.gate;
    for (const r of regions) {
      if (r.x1 > startX + 1e-9 && r.x0 < endX - 1e-9 && r.alpha > 0.004) spanInk += 1;
    }
  }
  // 리드인 각 조각에서 이전·다음 유형의 알파 합
  let sumBad = 0;
  for (const g of course.pieces) {
    if (g.kind !== "gate" || !g.gate) continue;
    const { leadInX, startX } = g.gate;
    const slice = (startX - leadInX) / CROSSFADE_SLICES;
    for (let s = 0; s < CROSSFADE_SLICES; s += 1) {
      const mid = leadInX + slice * (s + 0.5);
      const here = regions.filter((r) => r.x0 <= mid && r.x1 >= mid);
      const total = here.reduce((a, r) => a + r.alpha, 0);
      if (Math.abs(total - 1) > 1e-6) sumBad += 1;
    }
  }
  const sectorAlphas = regions.filter((r) => r.alpha === 1).length;
  console.log(
    `  ${tier}:${no} 구간 ${regions.length}개 · 섹터 5 + 리드인 ${CROSSFADE_SLICES}×4 · 스팬 침범 ${spanInk} · 알파합 이탈 ${sumBad} (섹터 알파1 ${sectorAlphas})`
  );
  if (spanInk > 0) fail(`${tier}:${no}: 게이트 스팬에 질감이 깔렸다`);
  if (sumBad > 0) fail(`${tier}:${no}: 리드인 알파 합이 1이 아니다`);

  // 강등 단 2 — 크로스페이드를 생략하면 게이트 전체가 비어야 한다
  const plain = textureRegions(course, 0, course.finishX, false);
  const inGate = plain.filter((r) =>
    course.pieces.some(
      (p) => p.kind === "gate" && r.x1 > p.startX + 1e-9 && r.x0 < p.endX - 1e-9
    )
  ).length;
  if (inGate > 0) fail(`${tier}:${no}: 크로스페이드 생략 시에도 게이트에 질감이 남는다`);
}

console.log("\n⑦ 결정성 — 질감이 코스 난수에 닿지 않는가");
const fingerprint = (tier: number, no: number): string =>
  buildStageCourse(tier, no, BASE_TUNING)
    .pieces.map((p) =>
      p.kind === "gate" && p.gate
        ? `gate:${p.gate.seed}`
        : `${p.sector!.id}:${p.sector!.nodes.length}`
    )
    .join("|");
const before = fingerprint(3, 1);
for (let i = 0; i < 1000; i += 1) for (const t of TYPES) texturePattern(t);
const after = fingerprint(3, 1);
const stable = TYPES.every((t) => JSON.stringify(texturePattern(t)) === JSON.stringify(texturePattern(t)));
console.log(`  코스 지문 ${before === after ? "동일" : "갈림"} · 패턴 재호출 ${stable ? "동일" : "갈림"}`);
if (before !== after) fail("질감 생성이 코스 난수 스트림을 건드렸다");
if (!stable) fail("같은 유형이 호출마다 다른 형상을 준다");

console.log("\n⑧ (관찰) 근접대 8을 도려낸 뒤 질감이 실제로 남는 x 비율");
for (const s of SECTORS) {
  let top = 0;
  let bot = 0;
  let n = 0;
  for (let x = 0; x <= SECTOR_LEN; x += 2) {
    const b = sample(s.nodes, x);
    if (b.top - KEEPOUT > 0) top += 1;
    if (100 - b.bot - KEEPOUT > 0) bot += 1;
    n += 1;
  }
  console.log(`  ${s.id.padEnd(15)} 상단 ${((top / n) * 100).toFixed(0)}% · 하단 ${((bot / n) * 100).toFixed(0)}%`);
}

console.log("\n⑨ (관찰) 크로스페이드가 관 선택보다 먼저 도착하는가");
const LEAD_IN = BASE_TUNING.gateLeadInSec * 58;
for (const speed of [30, 42, 58]) {
  const half = LEAD_IN / 2 / speed;
  const commit = LEAD_IN / speed;
  console.log(
    `  속도 ${speed}: mix 0.5 도달 +${half.toFixed(2)}초 · 관 선택 시작 +${commit.toFixed(2)}초 · 여유 ${(commit - half).toFixed(2)}초`
  );
  if (commit - half <= 0) fail(`속도 ${speed}: 크로스페이드가 선택보다 늦다`);
}

console.log(failures === 0 ? "\n통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
