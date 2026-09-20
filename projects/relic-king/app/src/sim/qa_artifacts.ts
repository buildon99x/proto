/**
 * 유물 데이터셋(app/src/game/artifacts.ts) 전수 검사(3단계 작업 지시,
 * notes/artifacts-dataset.md §7 "검증 스크립트").
 *
 *   pnpm --filter relic-king qa:artifacts
 *
 * 실패(❌)로 치는 것 — 데이터의 구조적 결함:
 *   - id 중복
 *   - 필수 필드 누락/범위 밖(name·era·origin·holder·note·source·shape·palette·
 *     tier·valueFactor·minLayer)
 *   - source 개수 미달(T0~T3는 ARTIFACT_MIN_SOURCES, T4는 T4_MIN_INDEPENDENT_SOURCES)
 *   - sourceStatus가 "verified"|"pending" 밖의 값
 *   - 거점당 T4(유일) 종수가 1을 **초과**(쿼터 위반 — 척추 1번 직결)
 *   - minLayer가 그 거점 층수(LAYERS_PER_SITE) 밖
 *
 * 실패로 치지 않고 **보고만** 하는 것 — 목표 미달은 실존성 우선 원칙상 정상이다
 * (notes/artifacts-dataset.md §8, 이번 3단계 작업 지시 "채울 수 있는 만큼만"):
 *   - 거점별 실제 종수 vs SPECIES_PER_SITE_BY_TIER 목표
 *   - 거점당 T4가 0종(정말 하나뿐인 후보를 못 찾았을 수 있다 — 지어내는 것보다 낫다)
 *   - era 텍스트가 그 거점의 eras 12층 라벨과 겹치는 키워드가 없음(자유 문장 대조라
 *     휴리스틱이다 — 실제 오류일 수도, 표현 차이일 수도 있다. 수동 확인용 신호)
 */
import { ARTIFACTS } from "../game/artifacts";
import {
  ARTIFACT_MIN_SOURCES, ARTIFACT_SPECIES_TARGET, ARTIFACT_WORLD_VALUE_CEILING, LAYERS_PER_SITE, SPECIES_PER_SITE_BY_TIER,
  T4_MIN_INDEPENDENT_SOURCES, TIER_MIN_LAYER, TIER_STOCK_PER_SPECIES, TIER_VALUE
} from "../game/balance";
import { SITES } from "../game/sites";
import type { PaletteId, Shape, SiteId, Tier } from "../game/types";

let failed = 0;
let warned = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}
function warn(label: string) {
  console.log(`⚠️  ${label}`);
  warned++;
}

const SHAPES: Shape[] = ["jar", "sword", "crown", "mask", "scroll", "coin", "tablet", "statue", "ornament", "mechanism"];
const PALETTES: PaletteId[] = ["celadon", "gold", "silver", "earthenware", "stone", "wood", "glass"];

console.log("──────── qa_artifacts: 유물 데이터셋 전수 검사 ────────");
console.log(`총 종수: ${ARTIFACTS.length}\n`);

// ── 1) id 중복 ────────────────────────────────────────────────────────────
const idCount = new Map<string, number>();
for (const a of ARTIFACTS) idCount.set(a.id, (idCount.get(a.id) ?? 0) + 1);
const dupIds = [...idCount.entries()].filter(([, n]) => n > 1).map(([id]) => id);
check("id 중복 없음", dupIds.length === 0);
if (dupIds.length > 0) console.log("  중복:", dupIds.join(", "));

// ── 2) 필수 필드 ─────────────────────────────────────────────────────────
let fieldErrors = 0;
for (const a of ARTIFACTS) {
  const problems: string[] = [];
  if (!a.name) problems.push("name 없음");
  if (!a.era) problems.push("era 없음");
  if (!a.origin) problems.push("origin 없음");
  if (!a.holder) problems.push("holder 없음");
  if (!a.note || a.note.length < 5) problems.push("note 없음/너무 짧음");
  if (!(a.tier >= 0 && a.tier <= 4)) problems.push("tier 범위 밖");
  if (!(a.valueFactor >= 0.6 && a.valueFactor <= 1.8)) problems.push(`valueFactor 범위 밖(${a.valueFactor})`);
  if (!SHAPES.includes(a.shape)) problems.push(`shape 미정의(${a.shape})`);
  if (!PALETTES.includes(a.palette)) problems.push(`palette 미정의(${a.palette})`);
  if (a.minLayer !== TIER_MIN_LAYER[a.tier]) problems.push("minLayer가 TIER_MIN_LAYER[tier]와 다름");
  if (!(a.minLayer >= 1 && a.minLayer <= LAYERS_PER_SITE)) problems.push("minLayer가 층수 범위 밖");
  if (a.sourceStatus !== "verified" && a.sourceStatus !== "pending") problems.push(`sourceStatus 이상값(${a.sourceStatus})`);
  const minSources = a.tier === 4 ? T4_MIN_INDEPENDENT_SOURCES : ARTIFACT_MIN_SOURCES;
  if (!a.source || a.source.length < minSources) {
    problems.push(`source 부족(${a.source?.length ?? 0} < ${minSources})`);
  }
  if (a.sourceStatus === "verified" && a.tier === 4 && (a.source?.length ?? 0) < T4_MIN_INDEPENDENT_SOURCES) {
    problems.push("T4 verified인데 독립 출처 2개 미만");
  }
  if (problems.length > 0) {
    fieldErrors++;
    console.log(`  ❌ ${a.site}/${a.id}: ${problems.join("; ")}`);
  }
}
check(`필수 필드·출처 규칙 위반 0건 (검사 ${ARTIFACTS.length}종)`, fieldErrors === 0);

// ── 3) 거점당 T4(유일) 쿼터 — 초과는 실패, 0은 보고만 ───────────────────────
console.log("\n── 거점별 티어 분포 vs 목표(SPECIES_PER_SITE_BY_TIER) ──");
let t4Over = 0;
const bySite = new Map<SiteId, Record<Tier, number>>();
for (const s of SITES) bySite.set(s.id, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
for (const a of ARTIFACTS) bySite.get(a.site)![a.tier]++;

let totalVerified = 0;
let totalPending = 0;
for (const s of SITES) {
  const counts = bySite.get(s.id)!;
  const target = SPECIES_PER_SITE_BY_TIER;
  const verified = ARTIFACTS.filter((a) => a.site === s.id && a.sourceStatus === "verified").length;
  const pending = ARTIFACTS.filter((a) => a.site === s.id && a.sourceStatus === "pending").length;
  totalVerified += verified;
  totalPending += pending;
  const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
  console.log(
    `${s.city.padEnd(6, " ")} T0=${counts[0]}/${target[0]} T1=${counts[1]}/${target[1]} ` +
    `T2=${counts[2]}/${target[2]} T3=${counts[3]}/${target[3]} T4=${counts[4]}/${target[4]}  ` +
    `합계 ${total}종 (verified ${verified} / pending ${pending})`
  );
  if (counts[4] > 1) {
    t4Over++;
    console.log(`  ❌ ${s.city}: T4가 ${counts[4]}종 — 거점당 정확히 1종 쿼터 위반`);
  } else if (counts[4] === 0) {
    warn(`${s.city}: T4(유일) 미확보 — 지어내지 않고 비워 둔 상태(차기 확장 대상)`);
  }
}
check("모든 거점이 T4 쿼터(최대 1종) 이내", t4Over === 0);
console.log(`\n전체 verified ${totalVerified}종 / pending ${totalPending}종 / 합계 ${ARTIFACTS.length}종`);
console.log(`(참고) ARTIFACT_SPECIES_TARGET=${ARTIFACT_SPECIES_TARGET} 목표 대비 verified 비율: ${((totalVerified / ARTIFACT_SPECIES_TARGET) * 100).toFixed(1)}%`);

// ── 3.5) 세계 총가치 상한이 실제 데이터셋과 맞는가 ───────────────────────────
// notes/economy.md §6.1: Σ(종수 × 종당재고 × 기준가 × 1.2), T0(무한 재고)는 제외.
// 이 상수는 ASSET_SCORE의 분모라 데이터셋이 커질 때 같이 안 올리면 자산 축이
// 즉시 포화돼 3축 순위가 1축으로 무너진다 — 그래서 보고가 아니라 **실패**로 잡는다.
{
  const ECONOMY_AVG_VALUE_FACTOR = 1.2;
  let computed = 0;
  for (let t = 1 as Tier; t <= 4; t = (t + 1) as Tier) {
    const species = ARTIFACTS.filter((a) => a.tier === t).length;
    computed += species * TIER_STOCK_PER_SPECIES[t] * TIER_VALUE[t] * ECONOMY_AVG_VALUE_FACTOR;
  }
  const drift = Math.abs(computed - ARTIFACT_WORLD_VALUE_CEILING) / computed;
  console.log(
    `\n세계 총가치(실측) ${(computed / 1e8).toFixed(1)}억 vs ` +
    `ARTIFACT_WORLD_VALUE_CEILING ${(ARTIFACT_WORLD_VALUE_CEILING / 1e8).toFixed(1)}억 ` +
    `(오차 ${(drift * 100).toFixed(2)}%)`
  );
  check("ARTIFACT_WORLD_VALUE_CEILING이 실제 데이터셋과 1% 이내로 일치", drift <= 0.01);
}

// ── 4) era ↔ 거점 eras 12층 라벨 정합(휴리스틱, 보고만) ──────────────────────
console.log("\n── era 정합 휴리스틱(수동 확인용 — 실패로 치지 않음) ──");
function tokensOf(text: string): string[] {
  return text.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2);
}
let eraMismatch = 0;
for (const s of SITES) {
  const erasTokens = s.eras.map(tokensOf);
  for (const a of ARTIFACTS.filter((x) => x.site === s.id)) {
    const aTokens = tokensOf(a.era);
    const matches = erasTokens.some((et) => et.some((t) => aTokens.some((at) => at.includes(t) || t.includes(at))));
    if (!matches) {
      eraMismatch++;
      console.log(`  ⚠️  ${s.id}/${a.id}: era="${a.era}"가 그 거점 eras 라벨과 키워드가 겹치지 않는다(수동 확인 필요)`);
    }
  }
}
if (eraMismatch === 0) console.log("  전부 키워드 겹침 확인(참고용 신호일 뿐, 완전한 사실 검증은 아니다)");
else warn(`era 키워드 미겹침 ${eraMismatch}건 — 위 목록 수동 확인 권장`);

console.log(
  failed === 0
    ? `\n✅ qa_artifacts 전체 통과 (경고 ${warned}건은 실패로 치지 않는다 — 위 참조)`
    : `\n❌ qa_artifacts ${failed}건 실패`
);
process.exit(failed === 0 ? 0 : 1);
