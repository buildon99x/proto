import { ARTIFACTS, ARTIFACT_BY_ID } from "./artifacts";
import {
  CONDITION_INITIAL_BASE_BY_TIER, MAX_EXPEDITION_TEAMS_INITIAL, RESTORATION_BASE_HOURS,
  SEASON_LENGTH_WEEKS, SITES
} from "./balance";
import { createWorld, nextUid } from "./engine";
import type { World } from "./types";

// 키 이름의 "v1"은 고정된 네임스페이스 라벨일 뿐 스키마 버전이 아니다(spec.md §2.9) —
// 실제 스키마 버전은 페이로드 내부의 `version` 필드가 맡고, 마이그레이션 체인이
// 그 필드를 보고 같은 키 위에서 순차 변환한다. 버전이 오른다고 키를 바꾸지 않는다
// (키를 바꾸면 예전 세이브를 아예 못 찾게 되어 마이그레이션 자체가 무의미해진다).
const KEY = "relic-king/save/v1";
const BACKUP_KEYS = ["relic-king/backup/0", "relic-king/backup/1", "relic-king/backup/2"];

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
  })
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
  reconcileDataset(world);
  reviveUids(world);
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

export function exportText(w: World): string {
  return btoa(unescape(encodeURIComponent(serialize(w))));
}

export function importText(text: string): World {
  return deserialize(decodeURIComponent(escape(atob(text.trim()))));
}
