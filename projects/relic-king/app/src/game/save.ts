import { ARTIFACTS } from "./artifacts";
import { createWorld, nextUid } from "./engine";
import type { World } from "./types";

const KEY = "relic-king/save/v1";
const BACKUP_KEYS = ["relic-king/backup/0", "relic-king/backup/1", "relic-king/backup/2"];

type Migration = (raw: any) => any;

/**
 * 스키마 버전별 마이그레이션 체인. 방치형에서 세이브 소실은 곧 게임 종료라
 * (notes/mda.md §5) 버전을 올릴 때마다 여기에 한 칸씩 붙인다.
 */
const MIGRATIONS: Record<number, Migration> = {};

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
