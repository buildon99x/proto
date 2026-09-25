import { ARTIFACTS, ARTIFACT_BY_ID } from "./artifacts";
import {
  CONDITION_INITIAL_BASE_BY_TIER, MAX_EXPEDITION_TEAMS_INITIAL, RESTORATION_BASE_HOURS,
  SEASON_LENGTH_WEEKS, SITES, SITE_BY_ID, TIP_MIN_RESPONSE_SECONDS, layerCost, CONDITION_TICK_SECONDS } from "./balance";
import { createPersistentRecord, createWorld, grantStartingTeam, nextUid } from "./engine";
import type { PersistentRecord, SiteId, World } from "./types";

// 키 이름의 "v1"은 고정된 네임스페이스 라벨일 뿐 스키마 버전이 아니다(spec.md §2.9) —
// 실제 스키마 버전은 페이로드 내부의 `version` 필드가 맡고, 마이그레이션 체인이
// 그 필드를 보고 같은 키 위에서 순차 변환한다. 버전이 오른다고 키를 바꾸지 않는다
// (키를 바꾸면 예전 세이브를 아예 못 찾게 되어 마이그레이션 자체가 무의미해진다).
const KEY = "relic-king/save/v1";
const BACKUP_KEYS = ["relic-king/backup/0", "relic-king/backup/1", "relic-king/backup/2"];
// PersistentRecord(계정 영구 기록, spec.md §13.4·G2)는 SaveV1(=World, 시즌 한정)과
// 분리된 스키마라 별도 키에 둔다(G51.4가 "영속화는 안 만들었다"고 보고한 것을
// 마무리 패스 G56에서 닫는다) — World가 시즌 롤오버·세이브 가져오기로 통째로
// 바뀌어도 명예의 전당·영구 명성은 그대로 남아야 한다.
const RECORD_KEY = "relic-king/record/v1";

type Migration = (raw: any) => any;

const SEASON_LENGTH_SECONDS = SEASON_LENGTH_WEEKS * 7 * 24 * 3600;

/**
 * 스키마 버전별 마이그레이션 체인. 방치형에서 세이브 소실은 곧 게임 종료라
 * (notes/mda.md §5) 버전을 올릴 때마다 여기에 한 칸씩 붙인다.
 */
const MIGRATIONS: Record<number, Migration> = {
  /**
   * v1 → v2 (spec.md §5·§13.3, notes/decisions.md G51). v1 저장분은 손실 없이
   * 그대로 옮기고, v2가 새로 요구하는 필드만 안전한 기본값으로 채운다:
   * - vault 항목에 `condition`(티어별 기준값)·`displayed`(false)를 채운다.
   * - `stats.firstT4Finds`를 0으로 채운다(과거 이력은 복원 불가 — 명성 점수의
   *   시작값 손실일 뿐 자산·도감·유물 소유권은 전혀 건드리지 않는다).
   * - `seasonState`를 시즌 1·t=0 시작으로 채운다.
   * - `codex` 값 3종(unseen/owned/lost)은 5종 CodexState의 부분집합이라
   *   변환 없이 그대로 유효하다.
   */
  1: (raw: any) => {
    const vault = (raw.vault ?? []).map((v: any) => {
      if (v.condition !== undefined) return v;
      const tier = ARTIFACT_BY_ID[v.artifactId]?.tier ?? 0;
      return { ...v, condition: CONDITION_INITIAL_BASE_BY_TIER[tier], displayed: false };
    });
    const stats = { firstT4Finds: 0, ...raw.stats };
    const seasonState = raw.seasonState ?? {
      season: 1, startedAt: 0, endsAt: SEASON_LENGTH_SECONDS, titleHolderId: null, titleHeldSinceT: null
    };
    return { ...raw, version: 2, vault, stats, seasonState };
  },
  /**
   * v2 → v3 (2단계 — 세계지도·거점·원정·스텝, notes/decisions.md G52). v2는
   * 3거점(korea/egypt/rome)만 알았다. 손실 없이 그대로 옮기고:
   * - `sites`에 신규 9거점 항목을 기본값(층1·미보유)으로 채운다.
   * - 기존 3거점에 `baseSince`가 없으면 `unlocked` 여부로 보수적으로 채운다
   *   (이미 보유 중이면 0 — 즉시 재적용되는 12시간 본거지 보너스는 실질 손실이 아니다).
   * - 발굴단·스텝·거점별 시세 정보 비대칭 관련 신규 필드를 빈 상태로 채운다.
   */
  2: (raw: any) => {
    const sites: Record<string, any> = { ...raw.sites };
    for (const s of SITES) {
      const cur = sites[s.id];
      if (!cur) {
        sites[s.id] = { layer: 1, layerProgress: 0, dropProgress: 0, unlocked: false, baseSince: null };
      } else if (cur.baseSince === undefined) {
        sites[s.id] = { ...cur, baseSince: cur.unlocked ? 0 : null };
      }
    }
    return {
      ...raw,
      version: 3,
      sites,
      teams: raw.teams ?? [],
      maxTeams: raw.maxTeams ?? MAX_EXPEDITION_TEAMS_INITIAL,
      staff: raw.staff ?? [],
      appraisalVouchers: raw.appraisalVouchers ?? 0,
      visitedSites: raw.visitedSites ?? {},
      unexploredBonusGranted: raw.unexploredBonusGranted ?? {},
      lastRelocationAt: raw.lastRelocationAt ?? null
    };
  },
  /**
   * v3 → v4 (3단계 — 제보 v0.2·라이벌 v0.2, notes/decisions.md G53). 손실 없이
   * 그대로 옮기고 `rivals[].homeSite`만 채운다 — v3까지는 라이벌에게 홈 거점
   * 개념이 없었다(favSite가 유일한 위치 정보였다). `favSite`와 같은 값으로
   * 채우는 게 안전하다 — 라이벌은 항상 favSite에서 시작·거주했으므로 실질적인
   * 의미 변화가 없다(spec.md §12.1).
   */
  3: (raw: any) => ({
    ...raw,
    version: 4,
    rivals: (raw.rivals ?? []).map((r: any) => ({ ...r, homeSite: r.homeSite ?? r.favSite }))
  }),
  /**
   * v4 → v5 (4단계 — 시설과 시장, notes/decisions.md G54). v4까지는 감정소
   * 확장·보관소·박물관·경매장·암시장·도난 관련 필드가 World에 전혀 없었다.
   * 손실 없이 그대로 옮기고 신규 필드를 안전한 기본값(레벨1·빈 배열·0)으로
   * 채운다 — 등급1 시작 레벨들은 labCost 등 기존 업그레이드 규약과 맞춘 것이라
   * "업그레이드를 산 적 없다"는 기존 세이브의 실제 상태를 정확히 반영한다.
   */
  4: (raw: any) => ({
    ...raw,
    version: 5,
    vaultLevel: raw.vaultLevel ?? 1,
    humidityLevel: raw.humidityLevel ?? 1,
    restorationLevel: raw.restorationLevel ?? 1,
    securityLevel: raw.securityLevel ?? 1,
    lastConditionDay: raw.lastConditionDay ?? Math.floor((raw.t ?? 0) / 86400),
    nextRestorationAttemptAt: raw.nextRestorationAttemptAt ?? (raw.t ?? 0) + RESTORATION_BASE_HOURS * 3600,
    museumDigEma: raw.museumDigEma ?? 0,
    museums: raw.museums ?? [],
    auctionHouses: raw.auctionHouses ?? [],
    blackMarket: raw.blackMarket ?? { listings: [] },
    theftEvents: raw.theftEvents ?? [],
    onlineElapsedSeconds: raw.onlineElapsedSeconds ?? 0
  }),
  /**
   * v5 → v6 (마무리 패스, notes/decisions.md G56). 손실 없이 그대로 옮기고:
   * - `museumCumulativeVisitors`(명성 축 신설 필드)를 0으로 채운다 — 과거
   *   관람객 이력은 애초에 집계된 적이 없어 복원 불가하다(G51.4의 firstT4Finds=0
   *   마이그레이션과 같은 성격의 손실 없는 기본값이다).
   * - `blackMarket.listings[].listedAt`이 없으면 0으로 채운다 — "이미 아주
   *   오래전에 상장됐다"로 보수적으로 취급해, 마이그레이션 직후 72시간 우선권
   *   배지(G55.9)가 과거 매물에 대해 거짓으로 뜨지 않게 한다.
   * - `teams[].layerAtDispatch`(원정비 소급 과청구 버그 수정 신설 필드)가
   *   없으면 그 팀이 지금 향하는 거점의 **현재** 층으로 채운다 — 파견 시점의
   *   실제 층은 이미 지나간 값이라 복원 불가능하지만, "지금 층"을 쓰면 다음
   *   귀환 정산에서 두 지점(파견·귀환) 단가가 같아져(평균해도 그대로) 최소한
   *   이 필드가 아예 없을 때의 과청구보다 나쁠 게 없다 — 안전한 보수적 기본값.
   */
  5: (raw: any) => ({
    ...raw,
    version: 6,
    museumCumulativeVisitors: raw.museumCumulativeVisitors ?? 0,
    teams: (raw.teams ?? []).map((t: any) => ({
      ...t, layerAtDispatch: t.layerAtDispatch ?? raw.sites?.[t.targetSite]?.layer ?? 1
    })),
    blackMarket: {
      listings: (raw.blackMarket?.listings ?? []).map((l: any) => ({ ...l, listedAt: l.listedAt ?? 0 }))
    }
  }),
  /**
   * v6 → v7 (v0.2 결함 1 수정 — 8시간 방치가 굴러가지 않던 교착, notes/decisions.md
   * G57). `Settings.autoReinvest`(신설)를 채우고, 이번 패스로 새 기본값이 된
   * `autoSellBelow`(기존 null → 1)도 함께 올려 준다 — 이 defect가 "기본 상태에서
   * 방치가 죽는다"는 것이었으므로, 새 게임뿐 아니라 이미 그 교착에 걸려 있었을
   * 기존 세이브도 같은 처방을 받아야 한다(returning player도 같은 defect의
   * 피해자다). 플레이어가 설정 화면에서 이미 명시적으로 끔(null)을 골랐던
   * 경우와 "한 번도 안 건드려서 초기값 그대로인" 경우를 이 세이브만으로는
   * 구분할 수 없다 — 다만 값을 올린 뒤에도 설정 화면에서 언제든 다시 끌 수
   * 있으므로(클릭 1회) 척추 4번("클릭은 언제나 선택")을 어기지 않는다.
   */
  6: (raw: any) => ({
    ...raw,
    version: 7,
    settings: {
      ...raw.settings,
      autoSellBelow: raw.settings?.autoSellBelow ?? 1,
      autoReinvest: raw.settings?.autoReinvest ?? true
    }
  }),
  /**
   * v7 → v8 (소장고 중복분 자동 매각 신설, notes/decisions.md G68).
   * `Settings.autoSellSpareBelow`를 **끔(null)** 으로 채운다 — v6→v7이
   * `autoSellBelow`를 올려 준 것과 정반대의 처방이고, 이유도 정반대다.
   * 그건 "기본 상태에서 방치가 죽는" 결함의 수정이라 기존 세이브도 같은 처방을
   * 받아야 했다. 이건 결함 수정이 아니라 **선택지 추가**이고, 켜면 소장 유물이
   * 실제로 팔려 자산 축 점수가 내려간다 — 돌아온 플레이어의 순위를 그가
   * 고르지 않은 설정으로 깎을 수는 없다. 새 게임 기본값(`createWorld`)과도
   * 같은 값이라 신규·기존 플레이어가 같은 상태에서 시작한다.
   */
  7: (raw: any) => ({
    ...raw,
    version: 8,
    settings: {
      ...raw.settings,
      autoSellSpareBelow: raw.settings?.autoSellSpareBelow ?? null
    }
  }),
  /**
   * v8 → v9 (v0.5 기록패·고스트 라이벌, notes/decisions.md G76). **필드를 새로
   * 요구하지 않는다** — 고스트는 `World.rivals`에 섞여 들어가는 평범한 `RivalState`이고,
   * v8 저장분에는 그냥 고스트가 하나도 없을 뿐이다. 그래도 칸을 비워 두지 않고 한 줄
   * 적어 두는 이유는, 여기가 비면 다음 사람이 "v9는 뭐가 달라졌지"를 코드 전체에서
   * 찾게 되기 때문이다. 고스트 필드(`ghost`·`ownedExtra`·`fameExtra`)는 전부 선택
   * 필드라 옛 라이벌 6명은 손대지 않는다.
   */
  8: (raw: any) => ({ ...raw, version: 9 }),
  /**
   * v9 → v10 (v0.3.4 계측 처방을 v0.5 위로 합치면서 — notes/decisions.md G81).
   * 원래 v8→v9로 썼던 단계인데, 같은 번호를 v0.5의 기록패가 먼저 가져갔다.
   * **이미 배포된 v9를 다시 정의하지 않고 뒤에 한 칸을 더 붙인다** — v9로 저장된
   * 세이브가 이미 존재하므로 그 번호의 뜻을 바꾸면 그 세이브들이 이 단계를
   * 건너뛴다.
   *
   * - `settings.spareDestination`을 `"sell"`로 채운다 — 기존 동작 그대로다.
   *   경매 출품은 **선택지 추가**이지 결함 수정이 아니므로 기존 플레이어의
   *   중복분 처리 방식을 마음대로 바꾸지 않는다(v7→v8의 `autoSellSpareBelow`와
   *   같은 취지).
   * - `teams[].routine`이 비어 있으면 **자동 순회로 켜 준다.** 이쪽은 정반대로
   *   **결함 수정**이라 기존 세이브에도 처방을 적용한다(v6→v7이 `autoSellBelow`를
   *   올려 준 것과 같은 논리): 루틴이 꺼진 팀은 귀환 후 영원히 유휴로 멈추고,
   *   그게 "탭만 열어 두면 2일차부터 아무 일도 안 일어난다"의 직접 원인이다
   *   (`notes/play-telemetry.md` §1). 플레이어가 직접 고른 고정 대상은 건드리지
   *   않고, 자동 순회가 싫으면 상세 패널에서 2단계로 끌 수 있다(척추 4번).
   * - 발굴단도 단장도 한 번도 가져 본 적이 없는 세이브에는 **시작 발굴단을 준다.**
   *   그 플레이어는 지금도 같은 교착(단장 고용비 $200,000 앞에서 멈춤) 안에 있다.
   *   실제 지급은 `deserialize()`가 `grantStartingTeam()`으로 한다 — 여기서는
   *   `w.t` 기준 시각·uid 발급이 필요해 순수 변환으로 처리할 수 없다.
   */
  9: (raw: any) => ({
    ...raw,
    version: 10,
    settings: {
      ...raw.settings,
      spareDestination: raw.settings?.spareDestination ?? "sell"
    },
    teams: (raw.teams ?? []).map((t: any) => ({
      ...t,
      routine: t.routine ?? { enabled: true, target: "auto" }
    }))
  }),
  /**
   * v10 → v11 (v0.6 첫 세션 밀도 패스 — 페이싱 재설계).
   *
   * 두 가지를 옮긴다.
   *
   * **① 층 진척의 눈금이 바뀌었다.** `layerCost`가 `300 × 2.45^(L-1)`에서
   * `8 × 2.1^(L-1)`로 압축됐다. 옛 세이브의 `layerProgress`는 옛 눈금의 값이라
   * 그대로 두면 6층에 12,054(옛 기준 절반)을 들고 있던 플레이어가 **한 틱에
   * 12층까지 뚫는다.** 그래서 "이 층을 얼마나 팠는가"의 **비율**을 보존해
   * 새 눈금으로 환산한다.
   *
   * 옛 상수를 여기에 **박아 둔다**(`layerCost`를 부르지 않는다). 마이그레이션은
   * 그 버전의 세계를 재현하는 기록이라, 살아 있는 상수를 참조하면 다음 압축
   * 때 과거가 같이 움직인다 — 이 레포가 G81에서 비싸게 배운 것과 같은 종류의
   * 사고다("번호의 뜻을 바꾸지 마라").
   *
   * **② 제보 배너에 `openedAt`이 생겼다**(반응 유예의 기준). 저장 당시 떠 있던
   * 배너는 **유예를 이미 다 쓴 것으로** 친다 — 진행 중이던 제보의 규칙을
   * 도중에 바꾸지 않는다(그 판은 옛 규칙으로 끝나는 게 맞다).
   */
  10: (raw: any) => {
    const OLD_LAYER_BASE = 300;
    const OLD_LAYER_GROWTH = 2.45;
    const oldCost = (mod: number, layer: number) =>
      OLD_LAYER_BASE * Math.pow(OLD_LAYER_GROWTH, layer - 1) * mod;
    const sites: any = {};
    for (const [id, st] of Object.entries<any>(raw.sites ?? {})) {
      const mod = SITE_BY_ID[id as SiteId]?.layerCostMod ?? 1;
      const layer = Number(st?.layer ?? 1);
      const before = oldCost(mod, layer);
      const ratio = before > 0 ? Math.min(1, Math.max(0, Number(st?.layerProgress ?? 0) / before)) : 0;
      sites[id] = { ...st, layerProgress: ratio * layerCost(id as SiteId, layer) };
    }
    return {
      ...raw,
      version: 11,
      sites,
      tip: raw.tip
        ? { ...raw.tip, openedAt: Number(raw.t ?? 0) - TIP_MIN_RESPONSE_SECONDS, resolved: raw.tip.resolved ?? null }
        : raw.tip
    };
  }
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function reviveUids(w: World) {
  let max = 0;
  for (const v of w.vault) max = Math.max(max, v.uid);
  for (const p of w.pending) max = Math.max(max, p.uid);
  while (nextUid() <= max) {
    /* uid 카운터를 세이브의 최대값 위로 밀어 올린다 */
  }
}

/**
 * 아주 오래된(또는 일부가 빠진) 페이로드로도 월드가 성립하도록 필수 컨테이너를
 * 채운다. 마이그레이션 체인은 "그 버전이 새로 요구하는 필드"만 채우므로, 원래
 * 스키마에 있었지만 저장분에서 빠진 것(예: `log`)은 여기서 막는다 —
 * 세이브 소실은 방치형에서 곧 게임 종료다(`notes/mda.md` §5).
 */
function ensureShape(w: World) {
  // 보존 판정 격자가 86400초 → CONDITION_TICK_SECONDS로 바뀌었다(v0.6.3, G93).
  // 옛 세이브의 `lastConditionDay`는 **하루 인덱스**라 새 격자에서는 과거를 가리키고,
  // 그대로 두면 불러오는 순간 한 번 더 저하가 굴러간다. 플레이어에게 불리한 쪽으로
  // 기울지 않게 현재 격자로 **앞으로 민다**(세이브 버전은 올리지 않는다 — 진행·원장
  // 어느 것도 이 값에 걸려 있지 않고, 기본값이 안전하다).
  const tick = Math.floor((w.t ?? 0) / CONDITION_TICK_SECONDS);
  if (!Number.isFinite(w.lastConditionDay) || w.lastConditionDay < tick) w.lastConditionDay = tick;
  if (!Array.isArray(w.log)) w.log = [];
  if (!Array.isArray(w.teams)) w.teams = [];
  if (!Array.isArray(w.staff)) w.staff = [];
  if (!Array.isArray(w.museums)) w.museums = [];
  if (!Array.isArray(w.auctionHouses)) w.auctionHouses = [];
  if (!Array.isArray(w.theftEvents)) w.theftEvents = [];
  if (!w.blackMarket || !Array.isArray(w.blackMarket.listings)) w.blackMarket = { listings: [] };
  if (!w.visitedSites) w.visitedSites = {};
  if (!w.unexploredBonusGranted) w.unexploredBonusGranted = {};
  // 진귀·국보 제보 자동 집중(v0.6.6)은 옛 세이브에도 기본값(켬)으로 채운다. 세이브 버전은
  // 올리지 않는다 — 유물이나 진척을 바꾸는 비가역 동작이 아니고, 설정에서 언제든 끈다.
  if (w.settings && typeof w.settings.autoFocusTips !== "boolean") w.settings.autoFocusTips = true;
}

/** 데이터셋에 새 유물이 추가돼도 옛 세이브가 열리도록 빈 칸을 채운다 */
function reconcileDataset(w: World) {
  for (const a of ARTIFACTS) {
    if (!w.codex[a.id]) w.codex[a.id] = "unseen";
    if (!w.ledger[a.id]) {
      const fresh = createWorld();
      w.ledger[a.id] = fresh.ledger[a.id];
    }
  }
}

export function serialize(w: World): string {
  return JSON.stringify(w, (_k, v) => (v === Infinity ? "Infinity" : v));
}

export function deserialize(text: string): World {
  const raw = JSON.parse(text, (_k, v) => (v === "Infinity" ? Infinity : v));
  let migrated = raw;
  let version = Number(raw?.version ?? 0);
  while (MIGRATIONS[version]) {
    migrated = MIGRATIONS[version](migrated);
    version = Number(migrated.version);
  }
  const world = migrated as World;
  ensureShape(world);
  reconcileDataset(world);
  reviveUids(world);
  // v9→v10 처방의 나머지 절반(위 마이그레이션 주석 참조) — uid 발급과 w.t 기준
  // 파견이 필요해 순수 변환 밖에서 한다. 이미 팀이나 단장이 있으면 아무 일도 하지 않는다.
  grantStartingTeam(world);
  return world;
}

export function save(w: World) {
  const s = storage();
  if (!s) return;
  try {
    const text = serialize(w);
    const prev = s.getItem(KEY);
    if (prev) rotateBackup(s, prev, w.t);
    s.setItem(KEY, text);
  } catch {
    /* 사생활 모드·용량 초과. 게임은 계속 돈다 */
  }
}

let lastBackupAt = -Infinity;
function rotateBackup(s: Storage, prev: string, t: number) {
  if (t - lastBackupAt < 300) return;
  lastBackupAt = t;
  try {
    const b1 = s.getItem(BACKUP_KEYS[0]);
    const b2 = s.getItem(BACKUP_KEYS[1]);
    if (b2) s.setItem(BACKUP_KEYS[2], b2);
    if (b1) s.setItem(BACKUP_KEYS[1], b1);
    s.setItem(BACKUP_KEYS[0], prev);
  } catch {
    /* 무시 */
  }
}

export function load(): World | null {
  const s = storage();
  if (!s) return null;
  for (const key of [KEY, ...BACKUP_KEYS]) {
    const text = s.getItem(key);
    if (!text) continue;
    try {
      return deserialize(text);
    } catch {
      /* 다음 백업 시도 */
    }
  }
  return null;
}

export function clear() {
  const s = storage();
  if (!s) return;
  for (const key of [KEY, ...BACKUP_KEYS]) s.removeItem(key);
}

/** `PersistentRecord`(계정 영구 기록) 저장 — World와 별도 키(RECORD_KEY)를 쓴다.
 *  스키마가 아직 한 형태뿐이라 마이그레이션 체인 없이 `createPersistentRecord()`
 *  기본값 위에 저장분을 얕게 덮어써 필드 누락에 방어적으로 대응한다(새 필드가
 *  생겨도 기존 저장을 못 읽는 일이 없다). */
export function saveRecord(record: PersistentRecord) {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    /* 사생활 모드·용량 초과. 게임은 계속 돈다 */
  }
}

export function loadRecord(): PersistentRecord | null {
  const s = storage();
  if (!s) return null;
  const text = s.getItem(RECORD_KEY);
  if (!text) return null;
  try {
    return { ...createPersistentRecord(), ...JSON.parse(text) };
  } catch {
    return null;
  }
}

export function clearRecord() {
  const s = storage();
  if (!s) return;
  s.removeItem(RECORD_KEY);
}

export function exportText(w: World): string {
  return btoa(unescape(encodeURIComponent(serialize(w))));
}

export function importText(text: string): World {
  return deserialize(decodeURIComponent(escape(atob(text.trim()))));
}
