/**
 * 소장고 다중 선택 처분(v0.5.2) 검증.
 *
 *   pnpm --filter relic-king qa:bulk
 *
 * 화면은 종 단위로 고르고 엔진이 어느 사본을 내보낼지 정한다(`bulkVaultTargets`).
 * 그래서 확인할 것은 "화면이 보여 준 점수·금액과 실제로 나간 것이 같은가"와
 * "무엇을 절대 내보내지 않는가"다.
 *
 *   1. 대상 선정 — 전시 중 사본 제외, 종당 1점 남기기(가장 비싼 사본 보존),
 *      전시 사본이 보존분 역할을 하는 경우.
 *   2. 매각 — 대상 점수만큼 빠지고 자금이 늘며, 보존 모드에선 도감이 줄지 않는다.
 *      보존을 끄면 `speciesEmptiedBy`가 예고한 종만 도감에서 빠진다.
 *   3. 경매 — 남은 자리만큼만 올라가고 나머지는 금고에 그대로 남는다
 *      (직접매각으로 새지 않는다). `auctionFreeSlots`가 그 자리 수와 같다.
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import { CONDITION_INITIAL_BASE_BY_TIER } from "../game/balance";
import {
  auctionFreeSlots, bulkVaultTargets, createWorld, listManyAtAuction, nextUid, sellVaultItems, speciesEmptiedBy
} from "../game/engine";
import type { Tier, World } from "../game/types";

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

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

const [a0, b0] = speciesOfTier(0, 2);
const [a1] = speciesOfTier(1, 1);
const [a3] = speciesOfTier(3, 1);

/** a0 ×3(비전시), b0 ×1, a1 ×2(한 점 전시), a3 ×1 */
function fixture(): World {
  const w = createWorld();
  w.vault = [];
  w.pending = [];
  w.auctionHouses = [];
  put(w, a0, 9_000);
  put(w, a0, 14_000);
  put(w, a0, 11_000);
  put(w, b0, 12_000);
  put(w, a1, 400_000, true);
  put(w, a1, 350_000);
  put(w, a3, 250_000_000);
  return w;
}

const codexOwned = (w: World) => Object.values(w.codex).filter((s) => s === "owned").length;

console.log("──────── qa_bulk: 소장고 다중 선택 처분 ────────\n");
console.log("1. 대상 선정");
{
  const w = fixture();
  const all = [a0, b0, a1, a3];
  const keep = bulkVaultTargets(w, all, true);
  check("종당 1점 남기기 — a0 2점만 대상, 가장 비싼 14,000짜리는 남는다",
    keep.filter((i) => i.artifactId === a0).length === 2 && !keep.some((i) => i.value === 14_000));
  check("종당 1점 남기기 — 1점뿐인 b0·a3은 대상이 아니다",
    !keep.some((i) => i.artifactId === b0 || i.artifactId === a3));
  check("전시 사본이 보존분 역할 — a1의 비전시 1점은 대상이 된다",
    keep.filter((i) => i.artifactId === a1).length === 1 && keep.every((i) => !i.displayed));
  const none = bulkVaultTargets(w, all, false);
  check("보존을 끄면 비전시 사본 전부(6점)가 대상, 전시 중 사본은 여전히 제외",
    none.length === 6 && none.every((i) => !i.displayed));
  check("고르지 않은 종은 대상이 아니다", bulkVaultTargets(w, [b0], false).every((i) => i.artifactId === b0));
}

console.log("\n2. 매각");
{
  const w = fixture();
  const targets = bulkVaultTargets(w, [a0, b0, a1, a3], true);
  const fundsBefore = w.funds;
  const codexBefore = codexOwned(w);
  const { count, gained } = sellVaultItems(w, targets.map((t) => t.uid));
  check(`표시한 점수와 실제로 판 점수가 같다(${targets.length} = ${count})`, count === targets.length);
  check("자금이 판매액만큼 는다", gained > 0 && Math.abs(w.funds - fundsBefore - gained) < 1e-6);
  check("보존 모드 — 도감이 줄지 않는다", codexOwned(w) === codexBefore);
  check("금고에서 정확히 그 사본들이 빠졌다", w.vault.length === 7 - count);
}
{
  const w = fixture();
  const targets = bulkVaultTargets(w, [a0, b0, a3], false);
  const uids = targets.map((t) => t.uid);
  const predicted = new Set(speciesEmptiedBy(w, uids));
  check("보존을 끄면 a0·b0·a3 세 종이 빠진다고 예고한다",
    predicted.size === 3 && predicted.has(a0) && predicted.has(b0) && predicted.has(a3));
  sellVaultItems(w, uids);
  const demoted = [a0, b0, a3].filter((id) => w.codex[id] === "discovered_not_owned");
  check("예고한 종만 정확히 도감에서 빠졌다", demoted.length === 3 && w.codex[a1] === "owned");
}
{
  const w = fixture();
  const displayedUid = w.vault.find((v) => v.displayed)!.uid;
  const { count } = sellVaultItems(w, [displayedUid, 999_999_999]);
  check("전시 중 uid·없는 uid를 넘겨도 아무것도 팔리지 않는다", count === 0 && w.vault.length === 7);
}

console.log("\n3. 경매");
{
  const w = fixture();
  check("경매장이 없으면 자리 0, 아무것도 오르지 않는다", auctionFreeSlots(w) === 0);
  const noHouse = listManyAtAuction(w, w.vault.map((v) => v.uid));
  check("  … 전부 금고에 남는다(직접매각으로 새지 않는다)",
    noHouse.listed === 0 && w.vault.length === 7 && w.stats.sold === 0);

  w.auctionHouses.push({ id: "auction-qa", site: "korea", grade: 1, listings: [] });
  const free = auctionFreeSlots(w);
  const targets = bulkVaultTargets(w, [a0, b0, a1, a3], false);
  const fundsBefore = w.funds;
  const { listed, skipped } = listManyAtAuction(w, targets.map((t) => t.uid));
  check(`1등급 경매장 자리 ${free}점만큼만 오른다(${listed}점)`, listed === Math.min(free, targets.length));
  check(`넘친 ${skipped}점은 금고에 남는다`, skipped === targets.length - listed && w.vault.length === 7 - listed);
  check("경매 등록은 자금을 바로 바꾸지 않는다(낙찰 때 정산)", w.funds === fundsBefore && w.stats.sold === 0);
  check("등록 뒤 남은 자리 0", auctionFreeSlots(w) === Math.max(0, free - listed));
}

console.log(`\n${failed === 0 ? "✅ 전부 통과" : `❌ ${failed}건 실패`}`);
if (failed > 0) process.exit(1);
