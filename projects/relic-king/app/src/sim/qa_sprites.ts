/**
 * 아이콘 전수 검사 (v0.4 — notes/decisions.md G70, eval.md "아이콘 구분력").
 *
 *   pnpm --filter relic-king qa:sprites
 *
 * 척도 정의는 `src/render/metric.ts` 머리말에 있다. 이 스크립트는 그 정의를
 * 그대로 써서 합격선을 판정한다.
 *
 * 실패(❌)로 치는 것:
 *   - T2 이상에서 비트맵이 **완전히 같은 쌍**이 1쌍이라도 있음
 *   - T4 12종끼리의 최소 지각거리가 T4_MIN_MUTUAL 미만
 *   - T4 각 종과 비(非)T4 전체 종 사이의 최소 지각거리가 T4_MIN_TO_OTHERS 미만
 *   - T2 이상 거점 분류 정확도(LOO 최근접 중심)가 SITE_ACCURACY_FLOOR 미만
 *
 * 보고만 하는 것:
 *   - 지각거리 임계(NEAR_DUPLICATE_DELTA_E) 이하로 붙은 쌍의 비율·목록
 *   - 거리 분포 분위수, 실루엣 IoU, 거점별 분류 정확도
 *   - 전체 2000종의 완전 중복(상위 티어가 아닌 구간은 현행 수준 허용 — 보고만)
 */
import { ARTIFACTS } from "../game/artifacts";
import {
  bitmapHash, featureOf, NEAR_DUPLICATE_DELTA_E, perceptualDistance, silhouetteIou,
  type SpriteFeature
} from "../render/metric";
import { RAMPS } from "../render/palette";
import { SITES } from "../game/sites";
import type { SiteId } from "../game/types";

/**
 * T4 유일 12종의 분리 하한. 손으로 찍은 전용 비트맵(render/unique-sprites.ts)이라
 * 절차 생성분과 구조가 아예 달라 실측이 이 값을 크게 넘는다 — 회귀 방어선으로만
 * 쓴다(임계를 실측에 붙여 놓으면 사소한 팔레트 조정에도 깨진다).
 */
const T4_MIN_MUTUAL = 12;
const T4_MIN_TO_OTHERS = 10;
/**
 * 거점 분류 정확도 하한. 근거: 12거점 무작위 추측이 8.3%다. "도감을 스크롤하다
 * 멈췄을 때 거점이 읽힌다"를 만족하려면 사람이 대충 봐도 맞히는 수준이어야 하고,
 * 기계 판정에서 85%는 "여섯 개 중 다섯 개 이상 맞힌다"에 해당한다. 100%를
 * 요구하지 않는 이유: 거점 신호(악센트색·테두리 양식·문양)를 실루엣 위에 얹는
 * 구조라, 실루엣이 작은 종(coin·ornament)은 신호가 실릴 면적 자체가 적다.
 */
const SITE_ACCURACY_FLOOR = 0.85;
/**
 * 재질 분류 정확도 하한 (v0.4.1 — notes/decisions.md G74).
 *
 * 거점 신호와 **정반대 방향으로 당기는** 합격선이다. 거점을 색으로 읽히게 만들수록
 * 재질(청자·금·은·질그릇·석재·목재·유리) 정보가 그 색에 덮인다. v0.4 초판이 실제로
 * 그랬다 — 램프 전체를 거점색으로 기울여서 로마 유물은 청동이든 대리석이든 전부
 * 자주색으로 읽혔다. 두 축을 같이 걸어 두면 한쪽을 올리려고 다른 쪽을 희생한
 * 변경이 자동으로 실패로 잡힌다.
 *
 * 7재질 무작위 추측은 14.3%다. 거점 신호를 완전히 끈 상태(v0.3.1 상당)의 실측
 * 상한이 93.0%이고, 그 상태의 거점 분류는 11.8% — 무작위와 다름없다. 두 축은
 * 이렇게 서로를 깎으므로 하한은 상한이 아니라 **타협선**으로 잡는다. 80%는
 * 상한의 86%를 지키는 선이고, 실측은 81.7%다(eval.md §19.5의 배분표 참조).
 */
const MATERIAL_ACCURACY_FLOOR = 0.8;

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const fmt = (n: number) => n.toFixed(2);

console.log("──────── qa_sprites: 유물 아이콘 구분력 검사 ────────");
console.log(`척도: 8×8 축약 CIELAB RMS ΔE*76 · 근접 임계 ${NEAR_DUPLICATE_DELTA_E}`);
console.log(`(정의: src/render/metric.ts)\n`);

const upper = ARTIFACTS.filter((a) => a.tier >= 2);
const t4 = ARTIFACTS.filter((a) => a.tier === 4);
console.log(`검사 대상: T2 이상 ${upper.length}종 (T4 ${t4.length} · T3 ${ARTIFACTS.filter((a) => a.tier === 3).length} · T2 ${ARTIFACTS.filter((a) => a.tier === 2).length})`);
console.log(`전체 ${ARTIFACTS.length}종\n`);

// ── 1) 완전 중복 (비트맵 동일) ─────────────────────────────────────────────
function exactDuplicates(pool: typeof ARTIFACTS) {
  const byHash = new Map<string, string[]>();
  for (const a of pool) {
    const h = bitmapHash(a);
    const list = byHash.get(h);
    if (list) list.push(a.id);
    else byHash.set(h, [a.id]);
  }
  return [...byHash.values()].filter((g) => g.length > 1);
}

const dupUpper = exactDuplicates(upper);
check(`T2 이상 ${upper.length}종에 완전히 같은 비트맵 쌍 0`, dupUpper.length === 0);
if (dupUpper.length > 0) {
  for (const g of dupUpper.slice(0, 20)) console.log(`  ❌ 동일: ${g.join(" = ")}`);
  if (dupUpper.length > 20) console.log(`  … ${dupUpper.length - 20}개 군 더`);
}

const dupAll = exactDuplicates(ARTIFACTS);
const dupAllSpecies = dupAll.reduce((n, g) => n + g.length, 0);
console.log(`ℹ️  전체 ${ARTIFACTS.length}종 완전 중복: ${dupAll.length}군 / ${dupAllSpecies}종 (T0~T1 포함 — 보고만)`);

// ── 2) 지각거리 분포 (T2 이상 전수 쌍) ────────────────────────────────────
const feats: SpriteFeature[] = upper.map(featureOf);
const dists: number[] = [];
const close: { a: string; b: string; d: number; iou: number }[] = [];
for (let i = 0; i < feats.length; i++) {
  for (let j = i + 1; j < feats.length; j++) {
    const d = perceptualDistance(feats[i], feats[j]);
    dists.push(d);
    if (d < NEAR_DUPLICATE_DELTA_E) {
      close.push({ a: feats[i].id, b: feats[j].id, d, iou: silhouetteIou(feats[i], feats[j]) });
    }
  }
}
dists.sort((x, y) => x - y);
const pairs = dists.length;
const closeRatio = close.length / pairs;
console.log("");
console.log(`지각거리 분포 (쌍 ${pairs.toLocaleString()}개)`);
console.log(`  최소 ${fmt(dists[0])} · p1 ${fmt(quantile(dists, 0.01))} · 중앙 ${fmt(quantile(dists, 0.5))} · p99 ${fmt(quantile(dists, 0.99))} · 최대 ${fmt(dists[pairs - 1])}`);
console.log(`  임계(${NEAR_DUPLICATE_DELTA_E}) 이하 근접쌍: ${close.length}쌍 = ${(closeRatio * 100).toFixed(3)}%`);
close.sort((x, y) => x.d - y.d);
for (const c of close.slice(0, 15)) {
  console.log(`  ⚠️  D=${fmt(c.d)} IoU=${c.iou.toFixed(2)}  ${c.a} ↔ ${c.b}`);
}
if (close.length > 15) console.log(`  … ${close.length - 15}쌍 더`);

// ── 3) T4 12종의 분리 ─────────────────────────────────────────────────────
const t4f = t4.map(featureOf);
const otherf = ARTIFACTS.filter((a) => a.tier !== 4).map(featureOf);
let minMutual = Infinity;
let minMutualPair = "";
for (let i = 0; i < t4f.length; i++) {
  for (let j = i + 1; j < t4f.length; j++) {
    const d = perceptualDistance(t4f[i], t4f[j]);
    if (d < minMutual) {
      minMutual = d;
      minMutualPair = `${t4f[i].id} ↔ ${t4f[j].id}`;
    }
  }
}
let minToOthers = Infinity;
let minToOthersPair = "";
const perT4: { id: string; nearest: number }[] = [];
for (const f of t4f) {
  let best = Infinity;
  for (const o of otherf) {
    const d = perceptualDistance(f, o);
    if (d < best) best = d;
    if (d < minToOthers) {
      minToOthers = d;
      minToOthersPair = `${f.id} ↔ ${o.id}`;
    }
  }
  perT4.push({ id: f.id, nearest: best });
}
console.log("");
console.log("T4 유일 12종 분리");
console.log(`  서로 간 최소거리 ${fmt(minMutual)}  (${minMutualPair})`);
console.log(`  비T4 전체와의 최소거리 ${fmt(minToOthers)}  (${minToOthersPair})`);
for (const p of perT4.sort((x, y) => x.nearest - y.nearest)) {
  console.log(`    ${p.id.padEnd(30)} 최근접 비T4 거리 ${fmt(p.nearest)}`);
}
check(`T4 서로 간 최소거리 ≥ ${T4_MIN_MUTUAL}`, minMutual >= T4_MIN_MUTUAL);
check(`T4 ↔ 비T4 최소거리 ≥ ${T4_MIN_TO_OTHERS}`, minToOthers >= T4_MIN_TO_OTHERS);

// ── 4) 거점 분류 (LOO 최근접 중심) ────────────────────────────────────────
// 아이콘만 보고 거점을 맞히는 판정. 학습 데이터에 자기 자신을 넣으면 1종만 있는
// 거점에서 자동으로 맞아 버리므로, 종마다 그 종을 뺀 중심으로 분류한다(leave-one-out).
// 특징 두 가지로 각각 재고 둘 다 보고한다 — 정의와 근거는 render/metric.ts의
// HUE_BINS 머리말에 있다.
const siteIds = SITES.map((s) => s.id);

function classify(
  vectorOf: (f: SpriteFeature) => Float64Array,
  labelOf: (f: SpriteFeature) => string,
  labels: string[]
) {
  const DIM = vectorOf(feats[0]).length;
  const vecs = feats.map(vectorOf);
  const sum = new Map<string, Float64Array>();
  const count = new Map<string, number>();
  for (const s of labels) {
    sum.set(s, new Float64Array(DIM));
    count.set(s, 0);
  }
  feats.forEach((f, k) => {
    const label = labelOf(f);
    const acc = sum.get(label)!;
    for (let i = 0; i < DIM; i++) acc[i] += vecs[k][i];
    count.set(label, count.get(label)! + 1);
  });
  let hits = 0;
  let top3 = 0;
  const confusion = new Map<string, number>();
  const perLabel = new Map<string, { hit: number; n: number }>();
  for (const s of labels) perLabel.set(s, { hit: 0, n: 0 });
  feats.forEach((f, k) => {
    const v = vecs[k];
    const mine = labelOf(f);
    const ranked: { label: string; d: number }[] = [];
    for (const s of labels) {
      const n = count.get(s)! - (s === mine ? 1 : 0);
      if (n <= 0) continue;
      const acc = sum.get(s)!;
      let d = 0;
      for (let i = 0; i < DIM; i++) {
        const c = (acc[i] - (s === mine ? v[i] : 0)) / n;
        const e = c - v[i];
        d += e * e;
      }
      ranked.push({ label: s, d });
    }
    ranked.sort((a, b) => a.d - b.d);
    const row = perLabel.get(mine)!;
    row.n++;
    if (ranked[0].label === mine) {
      hits++;
      row.hit++;
    } else {
      const key = `${mine} → ${ranked[0].label}`;
      confusion.set(key, (confusion.get(key) ?? 0) + 1);
    }
    if (ranked.slice(0, 3).some((r) => r.label === mine)) top3++;
  });
  return {
    accuracy: hits / feats.length,
    top3: top3 / feats.length,
    hits,
    perLabel,
    confusion: [...confusion.entries()].sort((a, b) => b[1] - a[1])
  };
}

const bySite = (v: (f: SpriteFeature) => Float64Array) => classify(v, (f) => f.site, siteIds);
const byColor = bySite((f) => f.hue);
const byLook = bySite((f) => f.lab);

console.log("");
console.log("거점 분류 (아이콘만, LOO 최근접 중심, 12지 선다 — 무작위 8.3%)");
console.log(`  (가) 거점 신호 채널 — 색상 히스토그램+무늬율: ${(byColor.accuracy * 100).toFixed(1)}%  (${byColor.hits}/${feats.length}) · top-3 ${(byColor.top3 * 100).toFixed(1)}%`);
console.log(`  (나) 전체 외형 — 8×8 Lab 지도:          ${(byLook.accuracy * 100).toFixed(1)}%  (${byLook.hits}/${feats.length}) · top-3 ${(byLook.top3 * 100).toFixed(1)}%`);
console.log("  거점별 (가):");
for (const s of siteIds) {
  const r = byColor.perLabel.get(s)!;
  const name = SITES.find((x) => x.id === s)!.name;
  console.log(`    ${s.padEnd(7)} ${name.padEnd(8)} ${r.hit}/${r.n} = ${((r.hit / Math.max(1, r.n)) * 100).toFixed(0)}%`);
}
if (byColor.confusion.length > 0) {
  console.log(`  (가) 혼동 상위: ${byColor.confusion.slice(0, 6).map(([k, v]) => `${k}(${v})`).join(", ")}`);
}
const accuracy = byColor.accuracy;
check(`거점 분류(거점 신호 채널) 정확도 ≥ ${(SITE_ACCURACY_FLOOR * 100).toFixed(0)}%`, accuracy >= SITE_ACCURACY_FLOOR);

// ── 5) 재질 분류 (LOO 최근접 중심) ────────────────────────────────────────
// 거점 신호가 재질을 덮지 않았는지 재는 축이다(G74). 같은 특징·같은 분류기로
// 라벨만 `palette`로 바꿔 잰다 — 거점이 잘 읽히는데 재질이 안 읽히면, 그건
// "아이콘이 거점 색표로 칠해졌다"는 뜻이다.
const paletteIds = Object.keys(RAMPS);
const byMaterial = classify((f) => f.materialHue, (f) => f.palette, paletteIds);

console.log("");
console.log(`재질 분류 (아이콘만, LOO 최근접 중심, ${paletteIds.length}지 선다 — 무작위 ${(100 / paletteIds.length).toFixed(1)}%)`);
console.log(`  색상 히스토그램+무늬율: ${(byMaterial.accuracy * 100).toFixed(1)}%  (${byMaterial.hits}/${feats.length}) · top-3 ${(byMaterial.top3 * 100).toFixed(1)}%`);
console.log("  재질별:");
for (const pid of paletteIds) {
  const r = byMaterial.perLabel.get(pid)!;
  if (r.n === 0) continue;
  console.log(`    ${pid.padEnd(12)} ${r.hit}/${r.n} = ${((r.hit / r.n) * 100).toFixed(0)}%`);
}
if (byMaterial.confusion.length > 0) {
  console.log(`  혼동 상위: ${byMaterial.confusion.slice(0, 6).map(([k, v]) => `${k}(${v})`).join(", ")}`);
}
check(`재질 분류 정확도 ≥ ${(MATERIAL_ACCURACY_FLOOR * 100).toFixed(0)}%`, byMaterial.accuracy >= MATERIAL_ACCURACY_FLOOR);

// ── 6) 결정론 ─────────────────────────────────────────────────────────────
// 같은 유물을 두 번 구워 바이트가 같은지. spriteUrl 캐시가 uid가 아니라 종 id
// 단위인 구조(세이브에 아이콘을 저장하지 않는다)의 전제다.
let deterministic = true;
for (const a of upper) {
  if (bitmapHash(a) !== bitmapHash(a)) {
    deterministic = false;
    console.log(`  ❌ 비결정론: ${a.id}`);
  }
}
check("같은 유물을 두 번 구워 바이트 동일(결정론)", deterministic);

console.log("");
console.log(`──────── ${failed === 0 ? "통과" : `실패 ${failed}건`} ────────`);
console.log(`요약: 완전중복 ${dupUpper.length}쌍군 · 근접쌍 ${(closeRatio * 100).toFixed(3)}% · 거점정확도 신호 ${(byColor.accuracy * 100).toFixed(1)}% / 외형 ${(byLook.accuracy * 100).toFixed(1)}% · 재질정확도 ${(byMaterial.accuracy * 100).toFixed(1)}% · T4 상호최소 ${fmt(minMutual)} / 대외최소 ${fmt(minToOthers)}`);
process.exit(failed === 0 ? 0 : 1);
