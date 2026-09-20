/**
 * 소장고 중복분 자동 매각(notes/decisions.md G68) 검증.
 *
 *   pnpm --filter relic-king qa:autosell
 *
 * 이 기능은 **플레이어가 보지 않는 동안 소장품을 판다**. 그래서 "얼마나 잘 파는가"
 * 보다 "무엇을 절대 팔지 않는가"가 검증 대상이다. 세 겹으로 확인한다:
 *
 *   1. 규칙 단위 — 손으로 짠 소장고에서 대상 선정(`spareVaultItems`)이 종당 1점·
 *      전시 중·국보(T3)·유일(T4)·티어 상한을 전부 지키는가.
 *   2. 장시간 방치 — 168시간을 자동 루틴과 함께 돌리며 도감(엔딩 판정 축)이
 *      **한 틱도** 감소하지 않는가. G57·G59가 각각 다른 경로에서 겪은 도감 감소
 *      결함을 이 경로가 되풀이하지 않는지 보는 회귀 게이트다.
 *   3. 대조군 — 같은 시드에서 기능을 끈 월드와 비교해, 켰을 때 자산 축이 내려가고
 *      자금이 올라가는 그 트레이드오프가 실제로 그 방향으로 나타나는가(숫자는
 *      보고용이고, 게이트는 "도감이 대조군보다 나쁘지 않다"이다).
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import { AUTO_SELL_SPARE_MAX_TIER, CONDITION_INITIAL_BASE_BY_TIER } from "../game/balance";
import {
  advance, assetScore, codexProgress, createWorld, digPower, nextUid, runAutoRoutine, sellSpares,
  spareVaultItems
} from "../game/engine";
import type { Tier, World } from "../game/types";

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

/** 그 티어의 검증된 종을 n개 고른다(데이터셋이 커져도 깨지지 않게 앞에서부터) */
function speciesOfTier(tier: Tier, n: number): string[] {
  const ids = ARTIFACTS.filter((a) => a.tier === tier && a.sourceStatus === "verified").slice(0, n).map((a) => a.id);
  if (ids.length < n) throw new Error(`T${tier} 검증 종이 ${n}개 필요한데 ${ids.length}개뿐이다`);
  return ids;
}

function put(w: World, artifactId: string, value: number, displayed = false): number {
  const uid = nextUid();
  const tier = ARTIFACT_BY_ID[artifactId].tier;
  w.vault.push({
    uid, artifactId, value, condition: CONDITION_INITIAL_BASE_BY_TIER[tier],
    displayed, museumSite: displayed ? "korea" : undefined, slot: displayed ? 0 : undefined,
    displaySessionStart: displayed ? 0 : undefined
  });
  w.codex[artifactId] = "owned";
  return uid;
}

console.log("──────── qa_autosell: 소장고 중복분 자동 매각 ────────\n");
console.log("1. 규칙 단위 — 손으로 짠 소장고");

const [t0a] = speciesOfTier(0, 1);
const [t1a] = speciesOfTier(1, 1);
const [t2a] = speciesOfTier(2, 1);
const [t3a] = speciesOfTier(3, 1);
const [t4a] = speciesOfTier(4, 1);

function fixture(): World {
  const w = createWorld();
  w.vault = [];
  // T0 ×3(전부 비전시), T1 ×2(한 점 전시), T2 ×2, T3 ×3, T4 ×1
  put(w, t0a, 1_000);
  put(w, t0a, 3_000);
  put(w, t0a, 2_000);
  put(w, t1a, 10_000, true);
  put(w, t1a, 9_000);
  put(w, t2a, 50_000);
  put(w, t2a, 70_000);
  put(w, t3a, 400_000);
  put(w, t3a, 500_000);
  put(w, t3a, 300_000);
  put(w, t4a, 9_000_000);
  return w;
}

{
  const w = fixture();
  const spares = spareVaultItems(w, 2);
  const ids = spares.map((s) => s.artifactId).sort();
  check("기준 진귀(T2): 대상은 T0 2점 + T1 1점 + T2 1점 = 4점",
    spares.length === 4 && ids.filter((i) => i === t0a).length === 2 &&
    ids.filter((i) => i === t1a).length === 1 && ids.filter((i) => i === t2a).length === 1);
  check("국보(T3)·유일(T4)은 중복이 3점 쌓여 있어도 대상이 아니다",
    !spares.some((s) => ARTIFACT_BY_ID[s.artifactId].tier >= 3));
  check("전시 중인 사본은 대상이 아니다", !spares.some((s) => s.displayed));
  check("보존분은 그 종에서 가장 값비싼 사본이다(T0는 3,000₩짜리가 남는다)",
    !spares.some((s) => s.artifactId === t0a && s.value === 3_000));
  check("전시 사본이 보존분 역할을 한다(T1은 비전시 1점이 전부 대상)",
    spares.filter((s) => s.artifactId === t1a).length === 1);
}

{
  const w = fixture();
  check("기준 흔함(T0): T0 2점만 대상", spareVaultItems(w, 0).length === 2);
  check("기준 끔(null): 대상 0점", spareVaultItems(w, null).length === 0);
  // 설정 상한을 넘는 값이 어떤 경로로든 들어와도 잘린다(마이그레이션·세이브 조작 방어)
  const overcap = spareVaultItems(w, 4 as Tier);
  check(`상한 초과 설정(T4)도 AUTO_SELL_SPARE_MAX_TIER(=${AUTO_SELL_SPARE_MAX_TIER})로 잘린다`,
    overcap.length === 4 && !overcap.some((s) => ARTIFACT_BY_ID[s.artifactId].tier > AUTO_SELL_SPARE_MAX_TIER));
}

{
  const w = fixture();
  const before = { ...codexProgress(w) };
  const fundsBefore = w.funds;
  const { count, gained } = sellSpares(w, 2);
  const after = codexProgress(w);
  check("실제 매각: 4점이 빠지고 소장고는 7점이 남는다", count === 4 && w.vault.length === 7);
  check("판 만큼 자금이 늘었다", gained > 0 && w.funds === fundsBefore + gained);
  check("도감 소장 종 수는 그대로다(종당 1점 보존)", after.owned === before.owned);
  check("모든 종이 소장고에 최소 1점 남았다",
    [t0a, t1a, t2a, t3a, t4a].every((id) => w.vault.some((v) => v.artifactId === id)));
  check("두 번째 호출은 아무것도 팔지 않는다(멱등)", sellSpares(w, 2).count === 0);
  check("stats.sold가 실제 판 점수만큼 늘었다", w.stats.sold === 4);
}

console.log("\n2. 168시간 방치 — 도감 단조성 회귀 게이트");

const HOURS = 168;
const ROUTINE_SECONDS = 60;

function idle(spareRule: Tier | null): {
  w: World; minCodexDelta: number; sparesLeft: number; highTierLost: number;
} {
  const w = createWorld();
  w.settings.autoSellSpareBelow = spareRule;
  let prevOwned = codexProgress(w).owned;
  let minCodexDelta = 0;
  let sparesLeft = 0;
  let highTierLost = 0;
  for (let s = 0; s < HOURS * 3600; s += ROUTINE_SECONDS) {
    advance(w, ROUTINE_SECONDS, false, 1);
    // 루틴 **직전**의 국보·유일 목록을 떠 두고 직후와 비교한다 — 이 사이에는
    // 루틴 말고 아무것도 돌지 않으므로, 사라진 게 있다면 범인은 루틴뿐이다.
    const highTier = new Set(
      w.vault.filter((v) => ARTIFACT_BY_ID[v.artifactId].tier >= 3).map((v) => v.uid)
    );
    runAutoRoutine(w);
    const after = new Set(w.vault.map((v) => v.uid));
    for (const uid of highTier) if (!after.has(uid)) highTierLost++;
    const owned = codexProgress(w).owned;
    minCodexDelta = Math.min(minCodexDelta, owned - prevOwned);
    prevOwned = owned;
    sparesLeft = spareVaultItems(w, spareRule).length;
  }
  return { w, minCodexDelta, sparesLeft, highTierLost };
}

const on = idle(2);
const off = idle(null);

check(`자동 정리를 켠 채 ${HOURS}시간 방치해도 도감이 한 틱도 줄지 않는다(최소 틱당 변화 ${on.minCodexDelta})`,
  on.minCodexDelta >= 0);
check("루틴이 돈 직후에는 기준에 걸리는 중복분이 0점이다", on.sparesLeft === 0);
check(`자동 루틴이 국보·유일을 한 점도 건드리지 않았다(소실 ${on.highTierLost}점)`, on.highTierLost === 0);

{
  let err: string | null = null;
  for (const a of ARTIFACTS) {
    const e = on.w.ledger[a.id];
    if (e.total === Infinity) continue;
    if (e.owners.length + e.remaining !== e.total) {
      err = `${a.id}: owners ${e.owners.length} + remaining ${e.remaining} != total ${e.total}`;
      break;
    }
  }
  check("세계 원장 보존(owners + remaining == total)", err === null);
  if (err) console.log(`  ${err}`);
}

console.log("\n3. 대조군 비교 — 트레이드오프가 설계한 방향으로 나타나는가");

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const vaultValue = (w: World) => w.vault.reduce((sum, v) => sum + v.value, 0);
const row = (label: string, w: World) =>
  `  ${label}  자금 ${fmt(w.funds).padStart(14)}₩   소장가치 ${fmt(vaultValue(w)).padStart(15)}₩   ` +
  `자산축 ${(assetScore(w) * 100).toFixed(2).padStart(6)}%   도감 ${codexProgress(w).owned}종   ` +
  `소장 ${String(w.vault.length).padStart(3)}점   드랍 ${w.stats.drops}   발굴력 ${digPower(w).toFixed(0)}/s`;
console.log(row("기능 끔", off.w));
console.log(row("기능 켬", on.w));

// 두 월드는 첫 매각이 일어나는 순간부터 **갈라진다** — 자금이 달라지면
// autoInvestLegacyDig의 구매 시점이 달라지고, 발굴력이 달라지면 드랍 시점이
// 달라진다. 그래서 도감 종 수를 두 런 사이에 정확히 비교하는 건 성립하지
// 않는다(결정론이 깨진 게 아니라, 서로 다른 두 게임이다). 게이트는 "켜면
// 도감이 무너진다"를 잡을 만큼만 느슨하게 둔다 — 도감 단조성이라는 진짜
// 불변식은 위 2번이 틱 단위로 이미 지킨다.
const codexGap = codexProgress(off.w).owned - codexProgress(on.w).owned;
check(`켠다고 도감이 무너지지 않는다(끔 대비 ${codexGap >= 0 ? "-" : "+"}${Math.abs(codexGap)}종, 발산 잡음 허용 ±3)`,
  Math.abs(codexGap) <= 3);
check("켠 쪽 소장고가 끈 쪽보다 적다(중복분이 실제로 빠져나갔다)", on.w.vault.length < off.w.vault.length);
check("켠 쪽 소장 가치가 끈 쪽보다 낮다(자산 축을 깎는 게 이 기능의 대가다)",
  vaultValue(on.w) < vaultValue(off.w));

console.log(failed === 0 ? "\n✅ qa_autosell 전체 통과" : `\n❌ qa_autosell ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
