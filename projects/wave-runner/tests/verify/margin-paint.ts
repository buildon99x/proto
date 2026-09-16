/**
 * 벽 도료가 사양을 지키는가.
 *
 * 도료는 **힘을 1도 주지 않는 보상**이다. 그래서 묻는 것은 두 갈래다 —
 * 판독을 해치지 않는가(대비 바닥·허용 색상대·질감과 각인의 대비 보존),
 * 그리고 **실제로 구분되는가**(ΔE). 둘째가 없으면 보상이 아니라 없는 기능이다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/margin-paint.ts
 */
import { buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING } from "../../app/src/game/engine";
import {
  FLASH_CONTRAST,
  FLASH_CONTRAST_CAP,
  MARK_CONTRAST,
  MARK_HUE,
  MARK_SAT
} from "../../app/src/game/margin/markers";
import {
  BACKGROUND,
  CONTRAST_FLOOR,
  DEFAULT_PAINT,
  DEFAULT_WALL,
  PAINTS,
  TEXTURE_CONTRAST_CAP,
  WALL_AREA,
  WALL_BG_RANGE,
  accentContrast,
  contrastRatio,
  deltaE,
  hueAllowed,
  hueOf,
  inkFor,
  satOf,
  solveTint,
  textureContrast
} from "../../app/src/game/margin/palette";
import { inkArea, texturePattern } from "../../app/src/game/margin/pattern";
import { EMPTY_META, activePaint, paintUnlocked, stageKey } from "../../app/src/game/meta";
import type { Meta } from "../../app/src/game/meta";
import type { SectorType } from "../../app/src/game/types";

const TYPES: SectorType[] = ["gorge", "corridor", "scatter", "pulse"];
const EDGE = "#3de1ff";
const BLOCK = "#ff5e7a";
const PLAYER = "#ffe66d";
const CLEAR = "#7dffb0";
/** 원거리대 상시 상한 */
const MARK_CAP = 2.0;
/** 인접 패치의 식별 한계는 2.3 이지만, 화면 절반을 덮는 면이므로 넉넉히 잡아도 이 위여야 한다 */
const MIN_DELTA_E = 4.0;
const INK_BALANCE_MAX = 1.1;

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};

console.log("① 기본 도료는 0.6.0 과 픽셀이 같아야 한다");
console.log(`  ${DEFAULT_PAINT.id} 벽 ${DEFAULT_PAINT.wall} (기준 ${DEFAULT_WALL})`);
if (DEFAULT_PAINT.wall !== DEFAULT_WALL) fail("기본 도료의 벽이 기준값과 다르다");
if (DEFAULT_WALL !== "#121a2e") fail("기준 벽색이 바뀌었다 — 0.6.0 렌더와 갈라진다");

console.log("\n② 대비 바닥 — 벽이 밝아져도 판독이 유지되는가");
console.log("  도료      벽색      색상  벽/배경  엣지   장애물  아바타  클리어");
for (const p of PAINTS) {
  const wbg = contrastRatio(BACKGROUND, p.wall);
  const e = contrastRatio(p.wall, EDGE);
  const b = contrastRatio(p.wall, BLOCK);
  const pl = contrastRatio(p.wall, PLAYER);
  const c = contrastRatio(p.wall, CLEAR);
  console.log(
    `  ${p.name.padEnd(7)} ${p.wall}  ${hueOf(p.wall).toFixed(0).padStart(3)}°  ${wbg.toFixed(3)}  ${e.toFixed(2)}  ${b.toFixed(2)}   ${pl.toFixed(2)}   ${c.toFixed(2)}`
  );
  if (e < CONTRAST_FLOOR.edge) fail(`${p.name}: 엣지 대비 ${e.toFixed(2)} < ${CONTRAST_FLOOR.edge}`);
  if (b < CONTRAST_FLOOR.block) fail(`${p.name}: 장애물 대비 ${b.toFixed(2)} < ${CONTRAST_FLOOR.block}`);
  if (pl < CONTRAST_FLOOR.player) fail(`${p.name}: 아바타 대비 ${pl.toFixed(2)} < ${CONTRAST_FLOOR.player}`);
  if (c < CONTRAST_FLOOR.clear) fail(`${p.name}: 클리어 대비 ${c.toFixed(2)} < ${CONTRAST_FLOOR.clear}`);
  if (wbg < WALL_BG_RANGE.min || wbg > WALL_BG_RANGE.max) {
    fail(`${p.name}: 벽/배경 ${wbg.toFixed(3)} 이 허용 구간 밖이다`);
  }
  if (!hueAllowed(hueOf(p.wall), satOf(p.wall))) {
    fail(`${p.name}: 벽 색상 ${hueOf(p.wall).toFixed(0)}° 가 허용 대역 밖이다 — 판독의 언어를 침범한다`);
  }
  if (!hueAllowed(p.hue, p.sat)) fail(`${p.name}: 잉크 색상 ${p.hue}° 가 허용 대역 밖이다`);
}

console.log("\n③ 정말 구분되는가 — 벽 색차 ΔE (CIE76, 인접 JND 2.3)");
{
  let worst = { a: "", b: "", d: Infinity };
  for (let i = 0; i < PAINTS.length; i += 1) {
    const row = PAINTS.map((q, j) =>
      i === j ? "   —" : deltaE(PAINTS[i].wall, q.wall).toFixed(1).padStart(4)
    );
    console.log(`  ${PAINTS[i].name.padEnd(7)} ${row.join(" ")}`);
    for (let j = i + 1; j < PAINTS.length; j += 1) {
      const d = deltaE(PAINTS[i].wall, PAINTS[j].wall);
      if (d < worst.d) worst = { a: PAINTS[i].name, b: PAINTS[j].name, d };
    }
  }
  console.log(`  최소 ΔE ${worst.d.toFixed(1)} (${worst.a}–${worst.b}), 기준 ${MIN_DELTA_E}`);
  if (worst.d < MIN_DELTA_E) fail(`${worst.a} 와 ${worst.b} 가 화면에서 구분되지 않는다`);

  // 잉크 틴트만 바꿨다면 어땠는지 — 이 설계가 왜 벽까지 옮기는지의 근거
  const cover = inkArea(texturePattern("gorge"));
  const blend = (paintIdx: number): string => {
    const ink = solveTint(PAINTS[paintIdx].hue, PAINTS[paintIdx].sat, textureContrast("gorge"), DEFAULT_WALL);
    const mix = [1, 3, 5].map((k) => {
      const w = parseInt(DEFAULT_WALL.slice(k, k + 2), 16);
      const v = parseInt(ink.slice(k, k + 2), 16);
      return Math.round(w * (1 - cover) + v * cover);
    });
    return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  let inkOnlyMax = 0;
  for (let i = 0; i < PAINTS.length; i += 1) {
    for (let j = i + 1; j < PAINTS.length; j += 1) {
      inkOnlyMax = Math.max(inkOnlyMax, deltaE(blend(i), blend(j)));
    }
  }
  console.log(
    `  (참고) 잉크 틴트만 바꿨다면 벽 평균색 ΔE 최대 ${inkOnlyMax.toFixed(2)} — 잉크는 벽의 ${(cover * 100).toFixed(1)}% 만 덮는다`
  );
}

console.log("\n④ 질감 대비는 도료가 바뀌어도 유형이 정한 값 그대로인가");
for (const p of PAINTS) {
  const loads: number[] = [];
  let bad = 0;
  for (const type of TYPES) {
    const { ink, accent } = inkFor(type, p);
    const ci = contrastRatio(p.wall, ink);
    const ca = contrastRatio(p.wall, accent);
    if (Math.abs(ci - textureContrast(type)) > 0.02) bad += 1;
    if (Math.abs(ca - accentContrast(type)) > 0.02) bad += 1;
    if (ci > TEXTURE_CONTRAST_CAP + 1e-9 || ca > TEXTURE_CONTRAST_CAP + 1e-9) bad += 1;

    const pat = texturePattern(type);
    let weighted = 0;
    for (const sh of pat.shapes) {
      const area =
        sh.kind === "band" ? sh.h * pat.tile : sh.kind === "rib" ? sh.w * pat.tile : Math.PI * sh.r * sh.r;
      weighted += area * ((sh.kind === "band" && sh.accent ? ca : ci) - 1);
    }
    loads.push((weighted / (pat.tile * pat.tile)) * WALL_AREA[type]);
  }
  const balance = Math.max(...loads) / Math.min(...loads);
  console.log(`  ${p.name.padEnd(7)} 유형별 대비 어긋남 ${bad} · 잉크 총량 최대/최소 ${balance.toFixed(3)}`);
  if (bad > 0) fail(`${p.name}: 질감 대비가 유형 목표와 어긋난다`);
  if (balance > INK_BALANCE_MAX) fail(`${p.name}: 유형 간 잉크 총량 균형이 깨졌다`);
}

console.log("\n⑤ 기록 이정표는 도료가 바뀌어도 질감 위에 남는가");
for (const p of PAINTS) {
  const base = contrastRatio(p.wall, solveTint(MARK_HUE, MARK_SAT, MARK_CONTRAST, p.wall));
  const lit = contrastRatio(p.wall, solveTint(MARK_HUE, MARK_SAT, FLASH_CONTRAST, p.wall));
  const top = Math.max(...TYPES.map((t) => textureContrast(t)));
  console.log(`  ${p.name.padEnd(7)} 상시 ${base.toFixed(2)}:1 · 섬광 ${lit.toFixed(2)}:1 · 질감 상한 ${top.toFixed(2)}:1`);
  if (base > MARK_CAP + 1e-9) fail(`${p.name}: 각인 상시 대비가 상한을 넘는다`);
  if (lit > FLASH_CONTRAST_CAP + 1e-9) fail(`${p.name}: 섬광 대비가 상한을 넘는다`);
  if (base <= top) fail(`${p.name}: 각인이 질감보다 조용하다 — 벽에 섞인다`);
}

console.log("\n⑥ 해금은 진행도에서 파생한다 — 저장하지 않는다");
{
  const meta = (over: Partial<Meta>): Meta => ({ ...EMPTY_META, ...over });
  const allTier = (tier: number) => [1, 2, 3].map((n) => stageKey(tier, n));
  const cases: Array<{ name: string; meta: Meta; unlocked: string[] }> = [
    { name: "처음", meta: meta({}), unlocked: ["basalt"] },
    { name: "티어1 전부", meta: meta({ clearedStages: allTier(1) }), unlocked: ["basalt", "slate"] },
    {
      name: "티어1 둘만",
      meta: meta({ clearedStages: allTier(1).slice(0, 2) }),
      unlocked: ["basalt"]
    },
    {
      name: "티어1·2 전부 + 1500m",
      meta: meta({ clearedStages: [...allTier(1), ...allTier(2)], bestDistance: 1500 }),
      unlocked: ["basalt", "slate", "indigo", "moss"]
    },
    {
      name: "전부",
      meta: meta({
        clearedStages: [...allTier(1), ...allTier(2), ...allTier(3)],
        bestDistance: 3000
      }),
      unlocked: PAINTS.map((p) => p.id)
    }
  ];
  for (const c of cases) {
    const got = PAINTS.filter((p) => paintUnlocked(c.meta, p)).map((p) => p.id);
    const ok = JSON.stringify(got) === JSON.stringify(c.unlocked);
    console.log(`  ${c.name.padEnd(18)} → ${got.join(", ")}`);
    if (!ok) fail(`${c.name}: ${c.unlocked.join(",")} 를 기대했다`);
  }
  // 진행도를 옮겨 왔는데 그 도료가 잠겨 있으면 기본으로 되돌아간다
  const borrowed = meta({ paint: "jade" });
  console.log(`  잠긴 도료가 저장돼 있으면 → ${activePaint(borrowed).id}`);
  if (activePaint(borrowed).id !== DEFAULT_PAINT.id) fail("잠긴 도료가 그대로 적용된다");
  const earned = meta({ paint: "jade", bestDistance: 3200 });
  if (activePaint(earned).id !== "jade") fail("해금한 도료가 적용되지 않는다");
  if ("paints" in EMPTY_META) fail("해금 목록을 저장하고 있다 — 파생 가능한 값이다");
}

console.log("\n⑦ 도료는 코스에 닿지 않는가");
{
  const fingerprint = () =>
    buildStageCourse(2, 2, BASE_TUNING)
      .pieces.map((p) => (p.kind === "gate" && p.gate ? `g${p.gate.seed}` : `${p.sector!.id}`))
      .join("|");
  const before = fingerprint();
  for (const p of PAINTS) for (const t of TYPES) inkFor(t, p);
  const after = fingerprint();
  console.log(`  도료 6종 × 유형 4종 해석 후 코스 지문 ${before === after ? "동일" : "갈림"}`);
  if (before !== after) fail("도료 해석이 코스 난수 스트림을 건드렸다");
}

console.log(failures === 0 ? "\n통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
