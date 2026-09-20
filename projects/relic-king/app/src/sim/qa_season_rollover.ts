/**
 * 시즌 롤오버 단위 검증(spec.md §13.4).
 *
 *   pnpm --filter relic-king exec tsx src/sim/qa_season_rollover.ts
 *
 * §5의 "시즌 경과는 아직 UI가 없으므로 함수와 단위 검증까지만" 지시에 따라,
 * UI 연동 없이 `applySeasonRollover()` 순수 로직만 직접 호출해 확인한다.
 */
import { ARTIFACTS } from "../game/artifacts";
import {
  FAME_PER_DEDICATED, FAME_PER_DEDICATED_T4, SEASON_CARRYOVER_FUNDS_CAP_MULT, SEASON_CASHOUT_RATIO
} from "../game/balance";
import { applySeasonRollover, createPersistentRecord, createWorld } from "../game/engine";

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

console.log("──────── qa_season_rollover ────────");

const t0 = ARTIFACTS.find((a) => a.tier === 0)!;
const t3 = ARTIFACTS.find((a) => a.tier === 3)!;
const t4 = ARTIFACTS.find((a) => a.tier === 4)!;

const w = createWorld();
w.funds = 10_000_000;
w.workers = 30;
w.gear = 7;
w.lab = 5;
w.sites.korea.layer = 9;
w.sites.korea.layerProgress = 500;
w.sites.egypt.unlocked = true;
w.vault = [
  { uid: 100, artifactId: t0.id, value: 12_000, condition: 1 },
  { uid: 101, artifactId: t3.id, value: 260_000_000, condition: 3 },
  { uid: 102, artifactId: t4.id, value: 6_000_000_000, condition: 4 }
];
w.pending = [{ uid: 103, artifactId: t0.id, remain: 5, estimate: 12_000 }];
w.codex[t0.id] = "owned";
w.codex[t3.id] = "owned";
w.codex[t4.id] = "owned";
w.stats.firstT4Finds = 2;

const fundsBefore = w.funds;
const record = createPersistentRecord();
const result = applySeasonRollover(w, record);

// ── 1) vault 헌정 ─────────────────────────────────────────────────────
check("vault가 비워진다", w.vault.length === 0);
check("pending도 비워진다", w.pending.length === 0);
check("T0 헌정이 legacyFame에 반영된다",
  Math.abs(result.legacyFame - (FAME_PER_DEDICATED[0] + FAME_PER_DEDICATED[3] + FAME_PER_DEDICATED_T4)) < 1e-9);
check("T4가 hallOfFame에 영구 기록된다",
  result.hallOfFame.length === 1 && result.hallOfFame[0].artifactId === t4.id && result.hallOfFame[0].dedicatedSeason === 1);
check("도감에서 헌정된 종은 owned가 아니게 된다(discovered_not_owned로 근사)",
  w.codex[t4.id] === "discovered_not_owned" && w.codex[t0.id] === "discovered_not_owned");
check("유일 최초발굴 수가 계정 영구 기록으로 흡수된다", result.firstT4Finds === 2 && w.stats.firstT4Finds === 0);

// ── 2) funds 환전+소각 ────────────────────────────────────────────────
const expectedCredit = fundsBefore * SEASON_CASHOUT_RATIO;
check("carryoverFundsCredit = funds × 10%", Math.abs(result.carryoverFundsCredit - expectedCredit) < 1e-6);
check("다음 시즌 시작 자금 = 3만 + min(carryover, 상한)",
  w.funds === 30_000 + Math.min(expectedCredit, 30_000 * SEASON_CARRYOVER_FUNDS_CAP_MULT));
check("90%는 소각되어 carryover에 남지 않는다(자금이 원래 자금보다 작다)", w.funds < fundsBefore);

// ── 3) 시설·거점 초기화 ───────────────────────────────────────────────
check("감정소 레벨 1로 초기화", w.lab === 1);
check("인부·장비 0으로 초기화", w.workers === 0 && w.gear === 0);
check("거점 층·진행도가 초기화된다", w.sites.korea.layer === 1 && w.sites.korea.layerProgress === 0);
check("보유하지 않은 거점(이집트)도 잠긴 상태로 리셋된다", !w.sites.egypt.unlocked);
check("세계 원장이 초기 스톡으로 되돌아간다(T4 재고 1)", w.ledger[t4.id].remaining === 1 && w.ledger[t4.id].owners.length === 0);

// ── 4) 시즌 카운터 ────────────────────────────────────────────────────
check("season이 1 올라간다", w.seasonState.season === 2);
check("ended가 리셋된다", w.ended === false);

// ── 5) 상한 검증 — carryover가 상한을 넘으면 클램프된다 ─────────────────
const w2 = createWorld();
w2.funds = 999_999_999_999; // 극단값으로 상한 클램프 확인
const record2 = createPersistentRecord();
applySeasonRollover(w2, record2);
check("carryover 상한 클램프 — 다음 시즌 자금이 상한을 넘지 않는다",
  w2.funds === 30_000 + 30_000 * SEASON_CARRYOVER_FUNDS_CAP_MULT);

console.log(failed === 0 ? "\n✅ qa_season_rollover 전체 통과" : `\n❌ qa_season_rollover ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
