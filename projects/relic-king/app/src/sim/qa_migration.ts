/**
 * 세이브 마이그레이션 v1→…→v9→v10→v11 직접 검증.
 *
 *   pnpm --filter relic-king exec tsx src/sim/qa_migration.ts
 *
 * `save.ts`의 `deserialize()`는 localStorage를 거치지 않고 순수 텍스트 → World
 * 변환만 하므로, 여기서는 실제 v1~v7 스키마 모양의 JSON을 직접 만들어 넣고
 * 체인 끝(v9)까지 정확히 올라오는지 필드 단위로 확인한다. v0.2 구현 1단계
 * (spec.md §2.9·§5)가 요구하는 "v1 세이브가 깨지지 않고 마이그레이션되어야
 * 한다"와, 2단계(세계지도·거점·원정·스텝)가 v2→v3에 추가한 신규 필드
 * (teams·staff·appraisalVouchers·visitedSites·unexploredBonusGranted·
 * lastRelocationAt·9거점 sites 항목), 3단계(제보 v0.2·라이벌 v0.2,
 * notes/decisions.md G53)가 v3→v4에 추가한 `rivals[].homeSite`, 4단계(시설과
 * 시장, notes/decisions.md G54)가 v4→v5에 추가한 감정소·보관소·박물관·경매장·
 * 암시장·도난 필드, 마무리 패스(notes/decisions.md G56)가 v5→v6에 추가한
 * `museumCumulativeVisitors`·`blackMarket.listings[].listedAt`, 결함 수정
 * 패스(notes/decisions.md G57)가 v6→v7에 추가한 `settings.autoReinvest`·
 * 기존 `autoSellBelow` 기본값 승격, 그리고 소장고 중복분 자동 매각(G68)이
 * v7→v8에 추가한 `settings.autoSellSpareBelow`까지 전부 같은 방식으로 무손실
 * 승계되는지의 실제 증거다.
 */
import { deserialize, serialize } from "../game/save";
import { AUTO_SELL_SPARE_MAX_TIER } from "../game/balance";
import { ARTIFACTS } from "../game/artifacts";
import { CONDITION_INITIAL_BASE_BY_TIER, TIP_MIN_RESPONSE_SECONDS, layerCost } from "../game/balance";
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

// ── 2) 스키마 버전 — 체인 끝(v9)까지 올라간다 ───────────────────────────
check("version이 11로 올라간다(체인 끝까지)", migrated.version === 11);
check("autoSellBelow가 기본값(1)으로 올라간다(체인 끝까지)", migrated.settings.autoSellBelow === 1);
check("autoReinvest가 채워진다(체인 끝까지)", migrated.settings.autoReinvest === true);
check("rivals[].homeSite가 채워진다(체인 끝까지)",
  migrated.rivals.every((r) => typeof (r as any).homeSite === "string"));

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
// v0.3.4부터는 **빈 채로 두지 않는다.** 발굴단도 단장도 가져 본 적 없는 세이브는
// 지금도 단장 고용비 200,000₩ 앞에 멈춰 있고, 그게 "탭만 열어 두면 2일차부터
// 아무 일도 안 일어난다"의 직접 원인이다(notes/play-telemetry.md §1). 결함 수정이라
// 기존 세이브에도 처방을 적용한다(v6→v7이 autoSellBelow를 올려 준 것과 같은 논리).
check("발굴단도 단장도 없던 세이브에는 시작 발굴단이 지급된다",
  migrated.teams.length === 1 && migrated.staff.filter((s) => s.role === "foreman").length === 1);
check("그 발굴단은 자동 순회 루틴을 켠 채 파견돼 있다",
  migrated.teams[0].routine?.enabled === true && migrated.teams[0].routine?.target === "auto"
    && migrated.teams[0].status !== "idle");
check("maxTeams가 초기값(1)으로 채워진다", migrated.maxTeams === 1);
check("appraisalVouchers가 0으로 채워진다", migrated.appraisalVouchers === 0);
check("visitedSites·unexploredBonusGranted가 빈 객체로 채워진다",
  Object.keys(migrated.visitedSites).length === 0 && Object.keys(migrated.unexploredBonusGranted).length === 0);
check("lastRelocationAt이 null로 채워진다", migrated.lastRelocationAt === null);

// ── 6) 마이그레이션 결과가 다시 직렬화·역직렬화돼도 안정적이다(왕복) ──────────
const roundTrip = deserialize(serialize(migrated)) as World;
check("마이그레이션 결과를 다시 직렬화→역직렬화해도 동일하다",
  roundTrip.version === 11 && roundTrip.funds === migrated.funds && roundTrip.vault.length === migrated.vault.length
    && roundTrip.teams.length === migrated.teams.length);

// ── 7) v4 세이브(이미 최신)를 다시 넣으면 아무 변환도 일어나지 않는다(체인 정지) ──
const v5Again = deserialize(serialize(migrated)) as World;
check("이미 최신 버전인 세이브는 재마이그레이션되지 않는다", v5Again.version === 11);

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
// v2Raw를 넣으면 체인이 끝(v4)까지 이어진다 — 2→3에서 멈추지 않는다(체인 자체가
// while(MIGRATIONS[version])이라 다음 칸(3→4)이 있으면 계속 올라간다).
check("v2 → v11 버전 승격(체인 끝까지)", migratedV3.version === 11);
check("v2 funds·t 무손실 보존", migratedV3.funds === 500_000 && migratedV3.t === 999);
check("v2에 있던 base(korea·egypt)는 baseSince 0으로 채워진다",
  migratedV3.sites.korea.baseSince === 0 && migratedV3.sites.egypt.baseSince === 0);
check("v2 신규 9거점이 채워진다", migratedV3.sites.peru !== undefined && migratedV3.sites.peru.unlocked === false);
check("v2 vault 항목(condition 이미 있음)은 그대로 보존된다", migratedV3.vault[0].condition === 1);
check("v2 → v3 신규 필드도 기본값으로 채워진다", migratedV3.appraisalVouchers === 0);
// 발굴단·단장은 더 이상 "빈 배열"이 기본값이 아니다 — v8→v9가 시작 발굴단을 준다
// (위 v1 체인의 같은 검사 주석 참조).
check("v2 체인에도 시작 발굴단이 지급된다",
  migratedV3.teams.length === 1 && migratedV3.teams[0].routine?.target === "auto");
check("v2 → v7 라이벌 homeSite도 채워진다",
  migratedV3.rivals.every((r) => typeof (r as any).homeSite === "string"));

// ── 9) v3 → v4 단독 구간(손으로 만든 실제 v3 세이브 모양, rivals에 homeSite 없음) ──
console.log("\n──────── qa_migration: v3 → v4 ────────");
const v3Rivals = createWorld().rivals.map(({ homeSite, tipChase, ...rest }) => rest); // v3에는 homeSite가 없었다
const v3Raw = {
  version: 3,
  t: 42,
  lastTickAt: Date.now(),
  funds: 100_000,
  sites: createWorld().sites,
  activeSite: "korea",
  workers: 0, gear: 0, lab: 1,
  pending: [],
  vault: [],
  ledger: createLedger(),
  rivals: v3Rivals,
  codex: {},
  settings: { autoSellBelow: null, muted: false },
  stats: { drops: 0, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
  seasonState: { season: 1, startedAt: 0, endsAt: 7_257_600, titleHolderId: null, titleHeldSinceT: null },
  teams: [], maxTeams: 1, staff: [], appraisalVouchers: 0,
  visitedSites: {}, unexploredBonusGranted: {}, lastRelocationAt: null
};
// v3 → v4 → v5로 체인이 계속 이어진다(위 §8과 같은 이유) — v4 필드까지 함께 확인한다.
const migratedV4 = deserialize(JSON.stringify(v3Raw)) as World;
check("v3 → v11 버전 승격(체인 끝까지)", migratedV4.version === 11);
check("v3 funds·t 무손실 보존", migratedV4.funds === 100_000 && migratedV4.t === 42);
check("homeSite가 없던 라이벌마다 favSite 값으로 채워진다",
  migratedV4.rivals.every((r) => (r as any).homeSite === r.favSite));

// ── 10) v4 → v5 단독 구간(4단계 — 시설과 시장, notes/decisions.md G54, 손으로
// 만든 실제 v4 세이브 모양 — vaultLevel·museums 등 신규 필드 전무) ───────────
console.log("\n──────── qa_migration: v4 → v5 ────────");
const v4Raw = {
  version: 4,
  t: 500_000,
  lastTickAt: Date.now(),
  funds: 250_000,
  sites: createWorld().sites,
  activeSite: "korea",
  workers: 5, gear: 2, lab: 3,
  pending: [],
  vault: [{ uid: 40, artifactId: t0.id, value: 12_000, condition: 1, displayed: false }],
  ledger: createLedger(),
  rivals: createWorld().rivals,
  codex: { [t0.id]: "owned" },
  settings: { autoSellBelow: null, muted: false },
  stats: { drops: 3, clicks: 0, sold: 1, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
  seasonState: { season: 1, startedAt: 0, endsAt: 7_257_600, titleHolderId: null, titleHeldSinceT: null },
  teams: [], maxTeams: 1, staff: [], appraisalVouchers: 0,
  visitedSites: {}, unexploredBonusGranted: {}, lastRelocationAt: null
};
// v4Raw를 넣으면 체인이 끝(v7)까지 이어진다(위 §8·§9와 같은 이유) — v5 필드까지 함께 확인한다.
const migratedV5 = deserialize(JSON.stringify(v4Raw)) as World;
check("v4 → v11 버전 승격(체인 끝까지)", migratedV5.version === 11);
check("v4 funds·t·vault 무손실 보존",
  migratedV5.funds === 250_000 && migratedV5.t === 500_000 && migratedV5.vault.length === 1);
check("vaultLevel·humidityLevel·restorationLevel·securityLevel이 1로 채워진다(레벨1 = 업그레이드 전)",
  migratedV5.vaultLevel === 1 && migratedV5.humidityLevel === 1
    && migratedV5.restorationLevel === 1 && migratedV5.securityLevel === 1);
check("museums·auctionHouses·theftEvents가 빈 배열로 채워진다",
  migratedV5.museums.length === 0 && migratedV5.auctionHouses.length === 0 && migratedV5.theftEvents.length === 0);
check("blackMarket이 빈 매물 목록으로 채워진다", migratedV5.blackMarket.listings.length === 0);
check("onlineElapsedSeconds가 0으로 채워진다", migratedV5.onlineElapsedSeconds === 0);
check("nextRestorationAttemptAt이 t 기준으로 채워진다(과거로 밀리지 않는다)",
  migratedV5.nextRestorationAttemptAt > migratedV5.t);
check("museumCumulativeVisitors가 0으로 채워진다(체인 끝까지, v5에는 필드 자체가 없었다)",
  migratedV5.museumCumulativeVisitors === 0);

// ── 11) v5 → v6 단독 구간(마무리 패스, notes/decisions.md G56 — 명성 축 관람객
// 누적·암시장 장물 72h 배지). 손으로 만든 실제 v5 세이브 모양 — museums 1채,
// blackMarket에 listedAt 없는 loose·stolen 매물 각 1건씩(v5 스키마 그대로).
// v5Raw를 넣으면 체인이 끝(v7)까지 이어진다(위 §8~§10과 같은 이유) — v6 필드까지 함께 확인한다.
console.log("\n──────── qa_migration: v5 → v6 ────────");
const v5Raw = {
  version: 5,
  t: 1_000_000,
  lastTickAt: Date.now(),
  funds: 400_000,
  sites: createWorld().sites,
  activeSite: "korea",
  workers: 8, gear: 3, lab: 4,
  pending: [],
  vault: [],
  ledger: createLedger(),
  rivals: createWorld().rivals,
  codex: {},
  settings: { autoSellBelow: null, muted: false },
  stats: { drops: 10, clicks: 0, sold: 2, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
  seasonState: { season: 1, startedAt: 0, endsAt: 7_257_600, titleHolderId: null, titleHeldSinceT: null },
  // v5 ExpeditionTeam에는 layerAtDispatch가 없다 — 이게 이번 구간의 또 다른 핵심 대상이다
  teams: [{
    id: "team-1", foremanId: "foreman-1", workers: 2, gearLevel: 1, status: "on_site",
    targetSite: "egypt", dispatchedAt: 900_000, arrivesAt: 950_000, returnsAt: 1_050_000,
    mishapRolled: false, routine: null
  }],
  maxTeams: 1, staff: [], appraisalVouchers: 0,
  visitedSites: {}, unexploredBonusGranted: {}, lastRelocationAt: null,
  vaultLevel: 1, humidityLevel: 1, restorationLevel: 1, securityLevel: 1,
  lastConditionDay: 11, nextRestorationAttemptAt: 1_100_000, museumDigEma: 500,
  museums: [{ id: "museum-1", site: "korea", grade: 1, marketingLevel: 1 }],
  auctionHouses: [],
  // v5 BlackMarketListing에는 listedAt이 없다 — 이게 이번 구간의 핵심 대상이다
  blackMarket: { listings: [
    { id: 1, kind: "loose", artifactId: t0.id, estimate: 12_000 },
    { id: 2, kind: "stolen", artifactId: t2.id, estimate: 9_000_000, theftEventId: "theft-1" }
  ] },
  theftEvents: [],
  onlineElapsedSeconds: 3600
};
const migratedV6 = deserialize(JSON.stringify(v5Raw)) as World;
check("v5 → v11 버전 승격(체인 끝까지)", migratedV6.version === 11);
check("v5 funds·t·museums 무손실 보존",
  migratedV6.funds === 400_000 && migratedV6.t === 1_000_000 && migratedV6.museums.length === 1);
check("museumCumulativeVisitors가 0으로 채워진다", migratedV6.museumCumulativeVisitors === 0);
check("blackMarket.listings[].listedAt이 0으로 채워진다(과거 매물은 보수적으로 '이미 만료'로 취급)",
  migratedV6.blackMarket.listings.every((l) => l.listedAt === 0));
check("blackMarket.listings 2건 무손실 보존(kind·estimate·theftEventId)",
  migratedV6.blackMarket.listings.length === 2
    && migratedV6.blackMarket.listings[1].kind === "stolen"
    && migratedV6.blackMarket.listings[1].theftEventId === "theft-1");
check("teams[].layerAtDispatch이 없으면 그 팀 targetSite의 현재 층으로 채워진다",
  migratedV6.teams.length === 1 && migratedV6.teams[0].layerAtDispatch === migratedV6.sites.egypt.layer);
check("v5 → 체인 끝까지 autoSellBelow가 기본값(1)으로 올라간다",
  migratedV6.settings.autoSellBelow === 1);
check("v5 → 체인 끝까지 autoReinvest가 채워진다", migratedV6.settings.autoReinvest === true);
check("v5 → 체인 끝까지 autoSellSpareBelow가 끔(null)으로 채워진다",
  migratedV6.settings.autoSellSpareBelow === null);

// ── 12) v6 → v7 단독 구간(결함 수정 패스, notes/decisions.md G57 — 8시간 방치가
// 굴러가지 않던 교착을 닫는다. 손으로 만든 실제 v6 세이브 모양 — settings에
// autoReinvest 필드 자체가 없고, autoSellBelow는 옛 기본값(null)으로 꺼져 있다) ──
console.log("\n──────── qa_migration: v6 → v7 ────────");
const v6Raw = {
  version: 6,
  t: 2_000_000,
  lastTickAt: Date.now(),
  funds: 12_000,
  sites: createWorld().sites,
  activeSite: "korea",
  workers: 1, gear: 0, lab: 1,
  pending: [{ uid: 60, artifactId: t0.id, remain: 2, estimate: 12_000 }],
  vault: [],
  ledger: createLedger(),
  rivals: createWorld().rivals,
  codex: {},
  settings: { autoSellBelow: null, muted: false },
  stats: { drops: 1, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0, firstT4Finds: 0 },
  seasonState: { season: 1, startedAt: 0, endsAt: 7_257_600, titleHolderId: null, titleHeldSinceT: null },
  teams: [], maxTeams: 1, staff: [], appraisalVouchers: 0,
  visitedSites: {}, unexploredBonusGranted: {}, lastRelocationAt: null,
  vaultLevel: 1, humidityLevel: 1, restorationLevel: 1, securityLevel: 1,
  lastConditionDay: 0, nextRestorationAttemptAt: 2_100_000, museumDigEma: 0,
  museums: [], auctionHouses: [], blackMarket: { listings: [] }, theftEvents: [],
  onlineElapsedSeconds: 0, museumCumulativeVisitors: 0
};
const migratedV7 = deserialize(JSON.stringify(v6Raw)) as World;
check("v6 → v11 버전 승격(체인 끝까지)", migratedV7.version === 11);
check("v6 funds·t·pending 무손실 보존",
  migratedV7.funds === 12_000 && migratedV7.t === 2_000_000 && migratedV7.pending.length === 1);
check("이미 꺼져 있던(null) autoSellBelow가 기본값(1)으로 올라간다(척추 4번 — 방치 교착 수정)",
  migratedV7.settings.autoSellBelow === 1);
check("autoReinvest가 없던 세이브에도 기본값(true)으로 채워진다", migratedV7.settings.autoReinvest === true);
check("muted 등 기존 설정값은 그대로 보존된다", migratedV7.settings.muted === false);

// ── 13) v7 → v8 단독 구간(소장고 중복분 자동 매각 신설, notes/decisions.md G68).
// v6→v7이 autoSellBelow를 **올려** 준 것과 정반대로, 이 필드는 **끔(null)** 으로
// 채워야 한다 — 결함 수정이 아니라 선택지 추가라서다. 켜면 소장 유물이 실제로
// 팔려 자산 축(가중치 .30)이 내려가므로, 돌아온 플레이어의 순위를 그가 고르지
// 않은 설정으로 깎을 수 없다. 새 게임 기본값(createWorld)과도 같은 값이다. ──
console.log("\n──────── qa_migration: v7 → v8 ────────");
const v7Raw = {
  ...v6Raw,
  version: 7,
  funds: 33_000,
  vault: [{ uid: 70, artifactId: t0.id, value: 9_000, condition: 1, displayed: false }],
  settings: { autoSellBelow: 0, muted: true, autoReinvest: false }
};
const migratedV8 = deserialize(JSON.stringify(v7Raw)) as World;
check("v7 → v11 버전 승격(체인 끝까지)", migratedV8.version === 11);
check("v7 funds·vault 무손실 보존", migratedV8.funds === 33_000 && migratedV8.vault.length === 1);
check("autoSellSpareBelow가 끔(null)으로 채워진다 — 기존 플레이어의 소장품을 임의로 팔지 않는다",
  migratedV8.settings.autoSellSpareBelow === null);
check("플레이어가 직접 고른 기존 설정값은 덮어쓰지 않는다(autoSellBelow 0 · muted true · autoReinvest false)",
  migratedV8.settings.autoSellBelow === 0 && migratedV8.settings.muted === true
    && migratedV8.settings.autoReinvest === false);
/**
 * **전제가 바뀌었다(v0.6.4, G95).** 예전 단언은 "옛 세이브의 값 == 새 게임 기본값"
 * 이었다 — 기본값이 `null`이던 시절에는 저절로 성립했다. v0.6.4가 중복분 자동
 * 정리를 **새 게임에서만** 켜면서 둘은 **의도적으로 달라졌다**: 자동 정리는 유물을
 * 파는 비가역 동작이라, 이미 저장된 세이브에는 소급하지 않는다(루틴을 켜 준
 * v9→v10과 성격이 다르다 — 그쪽은 진행이 멈춘 교착을 푸는 것이었다).
 *
 * 그래서 재야 할 것은 "같다"가 아니라 **"옛 세이브는 꺼진 채, 새 게임은 켜진 채
 * 시작한다"**는 두 갈래 자체다. 위 단언이 앞쪽을, 이 단언이 뒤쪽을 지킨다.
 */
check(
  `새 게임은 중복 정리가 켜진 채 시작한다(옛 세이브와 의도적으로 다르다 — ` +
  `새 게임 ${createWorld().settings.autoSellSpareBelow} · 옛 세이브 ${migratedV8.settings.autoSellSpareBelow})`,
  createWorld().settings.autoSellSpareBelow === AUTO_SELL_SPARE_MAX_TIER
    && migratedV8.settings.autoSellSpareBelow === null
);

// ── 14) v8 → v9 단독 구간(기록패·고스트 라이벌, notes/decisions.md G76).
// 이 구간은 **필드를 새로 요구하지 않는다** — 고스트는 `World.rivals`에 섞여 들어가는
// 평범한 `RivalState`이고, v8 저장분에는 고스트가 하나도 없을 뿐이다. 그래서 여기서
// 볼 것은 "뭐가 채워졌나"가 아니라 **"뭐가 안 망가졌나"**다: 라이벌 6명이 그대로 있고,
// 고스트 전용 선택 필드가 그들에게 붙지 않았고, 순위 표본이 없어도 게임이 돈다. ──
console.log("\n──────── qa_migration: v8 → v9 ────────");
const v8Raw = { ...v7Raw, version: 8, settings: { ...v7Raw.settings, autoSellSpareBelow: null } };
const migratedV9 = deserialize(JSON.stringify(v8Raw)) as World;
check("v8 → v11 버전 승격(체인 끝까지 — v9 고스트 칸·v10 계측 칸을 지나 v11까지 간다)", migratedV9.version === 11);
check("v8 funds·vault 무손실 보존", migratedV9.funds === 33_000 && migratedV9.vault.length === 1);
check("라이벌 6명이 그대로 남는다", migratedV9.rivals.length === 6);
check("옛 라이벌에게 고스트 전용 필드가 붙지 않는다",
  migratedV9.rivals.every((r) => r.ghost === undefined && r.ownedExtra === undefined && r.fameExtra === undefined));
check("순위 표본이 없어도(undefined) 세계가 성립한다", migratedV9.rankSample === undefined || migratedV9.rankSample === null);
check("v8 저장분에는 고스트가 없다", migratedV9.rivals.every((r) => !r.id.startsWith("ghost:")));

// ── 15) v9 → v10 (v0.3.4 계측 처방 — notes/decisions.md G81). 원래 v8→v9였는데
// v0.5 기록패가 그 번호를 먼저 가져가, 합치면서 한 칸 뒤로 밀었다. ──
console.log("\n──────── qa_migration: v9 → v10 ────────");
const v9Raw = {
  ...v7Raw,
  version: 9,
  funds: 44_000,
  settings: { autoSellBelow: 0, autoSellSpareBelow: 2, muted: true, autoReinvest: false },
  // 플레이어가 직접 고정 대상을 고른 팀 하나 — 이건 건드리면 안 된다
  staff: [{ id: "foreman-x", name: "테스트", role: "foreman", leadership: 30, navigation: 30 }],
  teams: [{
    id: "team-x", foremanId: "foreman-x", workers: 2, gearLevel: 1, status: "on_site",
    targetSite: "egypt", dispatchedAt: 0, arrivesAt: 0, returnsAt: 9e9, mishapRolled: false,
    layerAtDispatch: 1, routine: { enabled: true, target: "egypt" }
  }]
};
const migratedV10 = deserialize(JSON.stringify(v9Raw)) as World;
check("v9 → v11 버전 승격(v10 칸을 지나간다)", migratedV10.version === 11);
check("v9 funds 무손실 보존", migratedV10.funds === 44_000);
check("spareDestination이 'sell'(기존 동작)로 채워진다 — 경매 출품은 선택지 추가이지 결함 수정이 아니다",
  migratedV10.settings.spareDestination === "sell");
check("플레이어가 고정한 루틴 대상은 자동 순회로 덮어쓰지 않는다",
  migratedV10.teams[0].routine?.target === "egypt");
check("이미 발굴단이 있으면 시작 발굴단을 또 주지 않는다", migratedV10.teams.length === 1);

// 루틴이 꺼진 채로 저장된 팀 — 이쪽은 결함이므로 자동 순회를 켜 준다
const v9NoRoutine = {
  ...v9Raw,
  teams: [{ ...v9Raw.teams[0], routine: null }]
};
const migratedV10b = deserialize(JSON.stringify(v9NoRoutine)) as World;
check("루틴이 없던 팀은 자동 순회로 켜진다(귀환 후 영원히 유휴로 멈추는 결함의 처방)",
  migratedV10b.teams[0].routine?.enabled === true && migratedV10b.teams[0].routine?.target === "auto");

// ── 16) v10 → v11 (v0.6 첫 세션 밀도 패스 — 페이싱 재설계) ──────────────────
// 층 비용 곡선이 `300 × 2.45^(L-1)`에서 `LAYER_COST_BASE × LAYER_COST_GROWTH^(L-1)`로
// 압축됐다. 옛 세이브의 `layerProgress`는 **옛 눈금의 값**이라 그대로 두면 한
// 틱에 여러 층을 뚫는다. "이 층을 얼마나 팠는가"의 비율이 보존되는지 본다.
console.log("\n──────── qa_migration: v10 → v11 ────────");
const OLD_LAYER_COST = (layerCostMod: number, layer: number) => 300 * Math.pow(2.45, layer - 1) * layerCostMod;
const v10Raw: any = {
  ...v9Raw,
  version: 10,
  t: 5_000,
  settings: { ...v9Raw.settings, spareDestination: "sell" },
  sites: {
    ...v9Raw.sites,
    // korea는 layerCostMod = 1. 6층을 딱 절반 판 세이브.
    korea: { layer: 6, layerProgress: OLD_LAYER_COST(1, 6) / 2, dropProgress: 3, unlocked: true }
  },
  tip: {
    artifactId: t2.id, site: t2.site, layer: t2.minLayer, remain: 40, rivals: [], focused: false
  }
};
const migratedV11 = deserialize(JSON.stringify(v10Raw)) as World;
check("v10 → v11 버전 승격", migratedV11.version === 11);
check("층 번호는 그대로다(진척만 새 눈금으로 환산한다)", migratedV11.sites.korea.layer === 6);
check(
  "층 진척이 '그 층을 얼마나 팠는가'의 비율로 보존된다(옛 눈금 절반 → 새 눈금 절반)",
  Math.abs(migratedV11.sites.korea.layerProgress - layerCost("korea", 6) / 2) < 1e-6
);
check(
  "환산된 진척은 그 층의 새 비용을 넘지 않는다(한 틱에 여러 층을 뚫지 않는다)",
  migratedV11.sites.korea.layerProgress < layerCost("korea", 6)
);
check(
  "저장 당시 떠 있던 제보는 반응 유예를 이미 쓴 것으로 친다(진행 중이던 판의 규칙을 바꾸지 않는다)",
  migratedV11.tip !== null && migratedV11.t - migratedV11.tip.openedAt >= TIP_MIN_RESPONSE_SECONDS
);
check("제보의 결판 상태는 비어 있다", migratedV11.tip?.resolved === null);

// 진척이 새 비용을 넘는 값으로 저장돼 있어도(데이터 손상·손수정) 클램프된다
const v10Overflow: any = {
  ...v10Raw,
  sites: { ...v10Raw.sites, korea: { layer: 6, layerProgress: OLD_LAYER_COST(1, 6) * 9, dropProgress: 0, unlocked: true } }
};
const migratedV11b = deserialize(JSON.stringify(v10Overflow)) as World;
check(
  "옛 눈금 기준으로도 넘쳐 있던 진척은 그 층 비용으로 클램프된다",
  Math.abs(migratedV11b.sites.korea.layerProgress - layerCost("korea", 6)) < 1e-6
);

console.log(failed === 0 ? "\n✅ qa_migration 전체 통과" : `\n❌ qa_migration ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
