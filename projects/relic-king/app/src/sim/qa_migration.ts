/**
 * 세이브 마이그레이션 v1→v2→v3 직접 검증.
 *
 *   pnpm --filter relic-king exec tsx src/sim/qa_migration.ts
 *
 * `save.ts`의 `deserialize()`는 localStorage를 거치지 않고 순수 텍스트 → World
 * 변환만 하므로, 여기서는 실제 v1·v2 스키마 모양의 JSON을 직접 만들어 넣고
 * 체인 끝(v3)까지 정확히 올라오는지 필드 단위로 확인한다. v0.2 구현 1단계
 * (spec.md §2.9·§5)가 요구하는 "v1 세이브가 깨지지 않고 마이그레이션되어야
 * 한다"와, 2단계(세계지도·거점·원정·스텝)가 v2→v3에 추가한 신규 필드
 * (teams·staff·appraisalVouchers·visitedSites·unexploredBonusGranted·
 * lastRelocationAt·9거점 sites 항목)가 같은 방식으로 무손실 승계되는지의
 * 실제 증거다.
 */
import { deserialize, serialize } from "../game/save";
import { ARTIFACTS } from "../game/artifacts";
import { CONDITION_INITIAL_BASE_BY_TIER } from "../game/balance";
import { createLedger, createWorld } from "../game/engine";
import type { World } from "../game/types";

let failed = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
}

// ── 1) 손으로 만든 v1 JSON(실제 v0.1 세이브 모양) ──────────────────────────
const t0 = ARTIFACTS.find((a) => a.tier === 0)!;
const t2 = ARTIFACTS.find((a) => a.tier === 2)!;
const t4 = ARTIFACTS.find((a) => a.tier === 4)!;

/** v1·v2 세이브에는 없던 신규 9거점(2단계, notes/world-map.md §1) */
const NEW_SITE_IDS = ["greece", "turkey", "israel", "india", "china", "iraq", "japan", "mexico", "peru"] as const;

const v1Raw = {
  version: 1,
  t: 12345,
  lastTickAt: Date.now(),
  funds: 987_654,
  sites: {
    korea: { layer: 7, layerProgress: 120, dropProgress: 30, unlocked: true },
    egypt: { layer: 3, layerProgress: 40, dropProgress: 10, unlocked: true },
    rome: { layer: 1, layerProgress: 0, dropProgress: 0, unlocked: false }
  },
  activeSite: "korea",
  workers: 12,
  gear: 5,
  lab: 3,
  pending: [{ uid: 1, artifactId: t2.id, remain: 4.2, estimate: 9_000_000 }],
  // v1 VaultItem에는 condition·displayed가 없다 — 이게 이번 마이그레이션의 핵심 대상이다
  vault: [
    { uid: 2, artifactId: t0.id, value: 12_000 },
    { uid: 3, artifactId: t4.id, value: 6_000_000_000 }
  ],
  ledger: createLedger(),
  rivals: createWorld().rivals,
  // v1 3종 CodexState — 5종의 부분집합이라 변환 없이 유효해야 한다
  codex: { [t0.id]: "owned", [t2.id]: "owned", [t4.id]: "owned" },
  settings: { autoSellBelow: null, muted: false },
  // v1 Stats에는 firstT4Finds가 없다
  stats: { drops: 40, clicks: 0, sold: 5, blindSold: 1, racesWon: 2, racesLost: 1 }
};

console.log("──────── qa_migration: v1 → v2 → v3 ────────");

const migrated = deserialize(JSON.stringify(v1Raw)) as World;

// ── 2) 스키마 버전 — 체인 끝(v3)까지 올라간다 ───────────────────────────
check("version이 3으로 올라간다(체인 끝까지)", migrated.version === 3);

// ── 3) 기존 v1 데이터가 그대로 보존된다(무손실) ────────────────────────────
check("t 보존", migrated.t === v1Raw.t);
check("funds 보존", migrated.funds === v1Raw.funds);
check("workers/gear/lab 보존", migrated.workers === 12 && migrated.gear === 5 && migrated.lab === 3);
check("sites.korea.layer 보존", migrated.sites.korea.layer === 7);
check("sites.rome.unlocked 보존(false)", migrated.sites.rome.unlocked === false);
check("pending 1건 보존", migrated.pending.length === 1 && migrated.pending[0].artifactId === t2.id);
check("vault 2점 보존", migrated.vault.length === 2);
check("stats.drops 보존", migrated.stats.drops === 40);
check("codex 3종 값이 그대로 유효하다(부분집합)",
  migrated.codex[t0.id] === "owned" && migrated.codex[t2.id] === "owned" && migrated.codex[t4.id] === "owned");

// ── 4) v2가 새로 요구하는 필드가 안전한 기본값으로 채워진다 ──────────────────
check("vault 항목마다 condition이 채워진다",
  migrated.vault.every((v) => typeof v.condition === "number" && v.condition >= 0 && v.condition <= 4));
const t0Item = migrated.vault.find((v) => v.artifactId === t0.id)!;
const t4Item = migrated.vault.find((v) => v.artifactId === t4.id)!;
check("condition 기본값이 티어 기준값(CONDITION_INITIAL_BASE_BY_TIER)과 일치",
  t0Item.condition === CONDITION_INITIAL_BASE_BY_TIER[0] && t4Item.condition === CONDITION_INITIAL_BASE_BY_TIER[4]);
check("vault 항목의 displayed 기본값은 false", migrated.vault.every((v) => v.displayed === false));
check("stats.firstT4Finds가 0으로 채워진다", migrated.stats.firstT4Finds === 0);
check("seasonState가 시즌 1로 채워진다", migrated.seasonState.season === 1 && migrated.seasonState.titleHolderId === null);

// ── 5) v3가 새로 요구하는 필드(2단계 — 세계지도·거점·원정·스텝)도 안전한
// 기본값으로 채워진다. v1 세이브에는 korea·egypt·rome 3거점만 있었으므로
// 신규 9거점이 기본값(층1·미보유·baseSince null)으로 새로 생겨야 한다 ────────
check("신규 9거점이 sites에 채워진다",
  NEW_SITE_IDS.every((id) => migrated.sites[id] !== undefined));
check("신규 거점은 미보유·baseSince null로 시작한다",
  !migrated.sites.greece.unlocked && migrated.sites.greece.baseSince === null && migrated.sites.greece.layer === 1);
check("기존 보유 거점(korea)은 baseSince 0으로 보수적으로 채워진다",
  migrated.sites.korea.unlocked === true && migrated.sites.korea.baseSince === 0);
check("기존 미보유 거점(rome)은 baseSince null로 채워진다",
  migrated.sites.rome.unlocked === false && migrated.sites.rome.baseSince === null);
check("teams·staff가 빈 배열로 채워진다", migrated.teams.length === 0 && migrated.staff.length === 0);
check("maxTeams가 초기값(1)으로 채워진다", migrated.maxTeams === 1);
check("appraisalVouchers가 0으로 채워진다", migrated.appraisalVouchers === 0);
check("visitedSites·unexploredBonusGranted가 빈 객체로 채워진다",
  Object.keys(migrated.visitedSites).length === 0 && Object.keys(migrated.unexploredBonusGranted).length === 0);
check("lastRelocationAt이 null로 채워진다", migrated.lastRelocationAt === null);

// ── 6) 마이그레이션 결과가 다시 직렬화·역직렬화돼도 안정적이다(왕복) ──────────
const roundTrip = deserialize(serialize(migrated)) as World;
check("마이그레이션 결과를 다시 직렬화→역직렬화해도 동일하다",
  roundTrip.version === 3 && roundTrip.funds === migrated.funds && roundTrip.vault.length === migrated.vault.length
    && roundTrip.teams.length === migrated.teams.length);

// ── 7) v3 세이브(이미 최신)를 다시 넣으면 아무 변환도 일어나지 않는다(체인 정지) ──
const v3Again = deserialize(serialize(migrated)) as World;
check("이미 v3인 세이브는 재마이그레이션되지 않는다", v3Again.version === 3);

// ── 8) v2 → v3 단독 구간도 같은 방식으로 검증한다(손으로 만든 실제 v2 세이브 모양) ──
console.log("\n──────── qa_migration: v2 → v3 ────────");
const v2Raw = {
  version: 2,
  t: 999,
  lastTickAt: Date.now(),
  funds: 500_000,
  sites: {
    korea: { layer: 4, layerProgress: 10, dropProgress: 5, unlocked: true },
    egypt: { layer: 1, layerProgress: 0, dropProgress: 0, unlocked: true },
    rome: { layer: 1, layerProgress: 0, dropProgress: 0, unlocked: false }
  },
  activeSite: "korea",
  workers: 3, gear: 1, lab: 2,
  pending: [],
  vault: [{ uid: 9, artifactId: t0.id, value: 12_000, condition: 1, displayed: false }],
  ledger: createLedger(),
  rivals: createWorld().rivals,
  codex: { [t0.id]: "owned" },
  settings: { autoSellBelow: null, muted: false },
  stats: { drops: 1, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
  seasonState: { season: 1, startedAt: 0, endsAt: 7_257_600, titleHolderId: null, titleHeldSinceT: null }
};
const migratedV3 = deserialize(JSON.stringify(v2Raw)) as World;
check("v2 → v3 버전 승격", migratedV3.version === 3);
check("v2 funds·t 무손실 보존", migratedV3.funds === 500_000 && migratedV3.t === 999);
check("v2에 있던 base(korea·egypt)는 baseSince 0으로 채워진다",
  migratedV3.sites.korea.baseSince === 0 && migratedV3.sites.egypt.baseSince === 0);
check("v2 신규 9거점이 채워진다", migratedV3.sites.peru !== undefined && migratedV3.sites.peru.unlocked === false);
check("v2 vault 항목(condition 이미 있음)은 그대로 보존된다", migratedV3.vault[0].condition === 1);
check("v2 → v3 신규 필드도 기본값으로 채워진다",
  migratedV3.teams.length === 0 && migratedV3.staff.length === 0 && migratedV3.appraisalVouchers === 0);

console.log(failed === 0 ? "\n✅ qa_migration 전체 통과" : `\n❌ qa_migration ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
