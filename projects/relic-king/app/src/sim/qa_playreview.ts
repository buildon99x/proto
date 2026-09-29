/**
 * 플레이 리뷰(notes/play-review, 0.7.1 사람처럼 한 판) B1~B4 회귀 게이트.
 *
 *   pnpm --filter relic-king qa:playreview
 *
 * 넷 다 엔진은 "정상"인 채로 사람이 겪는 게임만 틀어져 있던 결함이라 `sim`·`density`에
 * 걸리지 않았다. 그래서 그 조건을 직접 만들어 단언한다.
 *
 * - B1 찾는 한 점은 직접 발굴이 옮겨 가도 바뀌지 않는다(시작 거점의 유일).
 * - B2 감정 교착 탈출이 그 종의 마지막 한 점을 팔면 화면 알림 재료(`w.autoSold`)와 기록을 남긴다.
 *      매각 자체는 초반 자금원이라 그대로다(G57).
 * - B3 떠날 때 결판 전이던 제보는 복귀 순간 유예가 떠날 때 그대로다(돌아온 첫 프레임에 결판나지 않는다).
 * - B4 떠날 때 결판나 있던 제보 배너는 복귀 때 닫히고, 결과는 복귀 요약 재료로 넘어간다.
 */
import { ARTIFACT_BY_ID, ARTIFACTS } from "../game/artifacts";
import { APPRAISE_FEE, START_SITE, TIP_MIN_RESPONSE_SECONDS } from "../game/balance";
import { advance, applyOffline, createPersistentRecord, createWorld, nextUid, runAutoRoutine } from "../game/engine";
import { wantedOf, wantedStatus } from "../game/lore";
import type { World } from "../game/types";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

// ── B1 ────────────────────────────────────────────────────────────────────
{
  const w = createWorld(7);
  const first = wantedOf(w);
  check("B1 기본 찾는 한 점은 시작 거점의 유일", first.site === START_SITE && first.tier === 4, first.name);
  for (const site of ["egypt", "greece", "india"] as const) {
    if (!w.sites[site]) continue;
    w.activeSite = site;
    check(`B1 직접 발굴이 ${site}로 옮겨 가도 그대로`, wantedOf(w).id === first.id, wantedOf(w).name);
  }
  // 라이벌이 먼저 가져가면 칸은 비고(gone), 다른 유일로 덮이지 않는다
  w.codex[first.id] = "lost";
  w.activeSite = "greece";
  check("B1 빼앗긴 칸은 다음 유일로 넘어가지 않고 비어 있다", wantedOf(w).id === first.id && wantedStatus(w) === "gone");
}

// ── B2 ────────────────────────────────────────────────────────────────────
function stallWorld(): { w: World; id: string } {
  const w = createWorld(11);
  w.pending = [];
  w.vault = [];
  const a = ARTIFACTS.find((x) => x.tier === 1 && x.sourceStatus === "verified")!;
  w.codex[a.id] = "owned_unidentified";
  const estimate = 467_000;
  w.pending.push({ uid: nextUid(), artifactId: a.id, remain: 20, estimate });
  w.funds = Math.round(estimate * APPRAISE_FEE) - 1; // 감정비에 1달러 모자란다 — 판 시작에 인부를 산 사람
  w.appraisalVouchers = 0;
  return { w, id: a.id };
}
{
  const { w } = stallWorld();
  const blindBefore = w.stats.blindSold;
  runAutoRoutine(w);
  // 매각 자체는 초반 자금원이라 그대로다(G57) — 막으면 density 첫 거점 해금이 1분 40초 → 14분 45초로 밀린다
  check("B2 교착 탈출 매각은 그대로 한 점", w.stats.blindSold === blindBefore + 1);
  check("B2 마지막 한 점을 팔았으면 화면 알림 재료(autoSold)를 남긴다",
    !!w.autoSold && w.autoSold.stalled && w.autoSold.gained > 0 && !w.autoSold.seen,
    w.autoSold ? `+$${w.autoSold.gained.toLocaleString("en-US")}` : "없음");
  check("B2 활동 기록에도 남긴다(이름은 쓰지 않는다 — 미감정)", w.log.some((l) => l.text.includes("미감정 한 점") && l.text.includes("도감 한 칸이 비었다")));
}
{
  const { w, id } = stallWorld();
  // 같은 종이 소장고에 이미 있다 → 그 사본(중복분)은 팔아도 도감이 줄지 않는다
  w.vault.push({ uid: nextUid(), artifactId: id, value: 400_000, condition: 3, displayed: false } as World["vault"][number]);
  w.codex[id] = "owned";
  const blindBefore = w.stats.blindSold;
  runAutoRoutine(w);
  check("B2 중복분이 있으면 그 사본을 팔고 도감은 그대로", w.stats.blindSold === blindBefore + 1 && w.codex[id] === "owned");
  check("B2 도감이 줄지 않았으면 알리지 않는다", !w.autoSold);
}

// ── B3 · B4 ───────────────────────────────────────────────────────────────
function tipWorld(resolved: boolean): World {
  const w = createWorld(5);
  const t4 = ARTIFACTS.find((x) => x.tier === 4 && x.site === START_SITE)!;
  w.t = 1000;
  w.tip = {
    artifactId: t4.id, site: START_SITE, layer: 10, remain: 146, rivals: ["r1"],
    openedAt: w.t - 1, // 떠나기 1초 전에 떴다 — 유예가 거의 통째로 남아 있다
    resolved: resolved ? { outcome: "won", at: w.t - 1 } : null
  };
  w.lastTickAt = Date.now() - 4 * 3600 * 1000;
  return w;
}
{
  const w = tipWorld(false);
  const sinceOpenBefore = w.t - w.tip!.openedAt;
  const r = applyOffline(w, Date.now(), createPersistentRecord());
  const since = w.tip ? w.t - w.tip.openedAt : NaN;
  check("B3 결판 전 제보는 복귀 때도 열려 있다", !!w.tip && !w.tip.resolved);
  check("B3 복귀 순간 유예가 떠날 때 그대로다", Math.abs(since - sinceOpenBefore) < 1e-6 && since < TIP_MIN_RESPONSE_SECONDS,
    `열린 뒤 ${since.toFixed(1)}초(떠날 때 ${sinceOpenBefore}초)`);
  check("B3 복귀 요약 재료에 '기다리는 제보'가 있다", r?.tip?.state === "waiting");
}
{
  // 실제 판에서 뜬 제보로 — 합성 세계는 그 거점에서 드랍이 돌지 않아 드랍 경로 레이스(`rollDrop`)를
  // 못 건드린다. 처음 고친 판은 합성 검사를 통과하고도 실제 앱에서 떠나기 전 결판으로 읽혔다.
  const w = createWorld(20260917);
  const rec = createPersistentRecord();
  while (!w.tip && w.t < 600) advance(w, 0.25, false, 0.25, rec);
  advance(w, 3, false, 0.25, rec);
  const sinceBefore = w.tip ? w.t - w.tip.openedAt : NaN;
  w.lastTickAt = Date.now() - 4 * 3600 * 1000;
  const r = applyOffline(w, Date.now(), rec);
  check("B3 실제 판: 유예 중에 떠난 제보는 4시간 뒤에도 결판 전이다", !!w.tip && !w.tip.resolved && r?.tip?.state === "waiting",
    r?.tip ? `${ARTIFACT_BY_ID[r.tip.artifactId].name} · ${r.tip.state}` : "제보 없음");
  check("B3 실제 판: 유예가 떠날 때 그대로다", !!w.tip && Math.abs(w.t - w.tip.openedAt - sinceBefore) < 1e-6);
}
{
  const w = tipWorld(true);
  const id = w.tip!.artifactId;
  const r = applyOffline(w, Date.now(), createPersistentRecord());
  check("B4 결판난 제보 배너는 복귀 때 닫힌다", w.tip === null);
  check("B4 결과는 복귀 요약 재료로 넘어간다", r?.tip?.state === "won" && r.tip.artifactId === id, ARTIFACT_BY_ID[id].name);
  check("B4 다음 제보 간격이 정상 범위다", w.nextTipIn > 0);
}

console.log(failed ? `\n${failed}건 실패` : "\n전부 통과");
process.exit(failed ? 1 : 0);
