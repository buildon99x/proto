// 메타 진행 — localStorage 영속화, 용비늘 경제, 해금/업글 로직, 리절트 정산.

import { DIFFICULTIES, DRAGONS, STAGES, UPGRADES } from "./data";
import type {
  DragonUpgrades,
  MetaState,
  RunConfig,
  RunResult
} from "./types";

const STORAGE_KEY = "dragon-danmaku/meta/v1";
const META_VERSION = 1;

export function emptyUpgrades(): DragonUpgrades {
  return { startLives: 0, bombs: 0, awaken: 0, options: 0 };
}

export function defaultMeta(): MetaState {
  const upgrades: Record<string, DragonUpgrades> = {};
  for (const d of DRAGONS) upgrades[d.id] = emptyUpgrades();
  return {
    version: META_VERSION,
    scales: 0,
    unlockedDragons: ["ignis"],
    unlockedDifficulties: ["novice", "original"],
    clearedFirstLoop: false,
    trueEnding: false,
    upgrades,
    bestScore: 0,
    bestChain: 0,
    defeatedBosses: []
  };
}

export function loadMeta(): MetaState {
  if (typeof window === "undefined") return defaultMeta();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMeta();
    const parsed = JSON.parse(raw) as Partial<MetaState>;
    // 누락 필드 보강(스키마 진화 대비).
    const base = defaultMeta();
    const merged: MetaState = { ...base, ...parsed, version: META_VERSION };
    merged.upgrades = { ...base.upgrades, ...(parsed.upgrades ?? {}) };
    for (const d of DRAGONS) {
      merged.upgrades[d.id] = { ...emptyUpgrades(), ...(merged.upgrades[d.id] ?? {}) };
    }
    merged.unlockedDragons = Array.from(new Set([...base.unlockedDragons, ...(parsed.unlockedDragons ?? [])]));
    merged.unlockedDifficulties = Array.from(
      new Set([...base.unlockedDifficulties, ...(parsed.unlockedDifficulties ?? [])])
    );
    return merged;
  } catch {
    return defaultMeta();
  }
}

export function saveMeta(meta: MetaState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch {
    /* 저장 실패는 무시(프라이빗 모드 등). */
  }
}

// ── 해금 로직 ────────────────────────────────────────────────

export function isDragonUnlocked(meta: MetaState, id: string): boolean {
  return meta.unlockedDragons.includes(id);
}

export function isDifficultyUnlocked(meta: MetaState, id: string): boolean {
  return meta.unlockedDifficulties.includes(id);
}

export function dragonUnlockable(meta: MetaState, id: string): { ok: boolean; reason: string } {
  const dragon = DRAGONS.find((d) => d.id === id);
  if (!dragon) return { ok: false, reason: "없음" };
  if (isDragonUnlocked(meta, id)) return { ok: false, reason: "해금됨" };
  if (id === "nox" && !meta.clearedFirstLoop) return { ok: false, reason: "1주차 클리어 필요" };
  if (meta.scales < dragon.unlockCost) return { ok: false, reason: "용비늘 부족" };
  return { ok: true, reason: "" };
}

export function buyDragon(meta: MetaState, id: string): MetaState {
  const check = dragonUnlockable(meta, id);
  if (!check.ok) return meta;
  const dragon = DRAGONS.find((d) => d.id === id)!;
  return {
    ...meta,
    scales: meta.scales - dragon.unlockCost,
    unlockedDragons: [...meta.unlockedDragons, id]
  };
}

export function upgradeCost(meta: MetaState, dragonId: string, upgradeId: keyof DragonUpgrades): number | null {
  const def = UPGRADES.find((u) => u.id === upgradeId);
  if (!def) return null;
  const level = meta.upgrades[dragonId]?.[upgradeId] ?? 0;
  if (level >= def.costs.length) return null; // 최대치
  return def.costs[level];
}

export function buyUpgrade(meta: MetaState, dragonId: string, upgradeId: keyof DragonUpgrades): MetaState {
  const cost = upgradeCost(meta, dragonId, upgradeId);
  if (cost === null || meta.scales < cost) return meta;
  const current = meta.upgrades[dragonId] ?? emptyUpgrades();
  return {
    ...meta,
    scales: meta.scales - cost,
    upgrades: {
      ...meta.upgrades,
      [dragonId]: { ...current, [upgradeId]: current[upgradeId] + 1 }
    }
  };
}

// ── 런 설정 / 리절트 ─────────────────────────────────────────

export function buildRunConfig(
  meta: MetaState,
  dragonId: string,
  difficultyId: string,
  practiceStage?: number
): RunConfig {
  const dragon = DRAGONS.find((d) => d.id === dragonId) ?? DRAGONS[0];
  const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[1];
  const upgrades = meta.upgrades[dragonId] ?? emptyUpgrades();
  return { dragon, difficulty, upgrades, practiceStage };
}

/** 용비늘 정산: 점수·수집·도달·보너스 기반(meta-progression.md §1). */
export function computeEarnedScales(r: Omit<RunResult, "earnedScales" | "newBest">): number {
  let scales = Math.floor(r.score / 5000);
  scales += r.hiddenScales * 5;
  scales += (r.stageReached + 1) * 30;
  if (r.cleared) scales += 200;
  if (r.noMiss) scales += 150;
  if (r.noBomb) scales += 100;
  if (r.noContinue) scales += 100;
  if (r.trueEnding) scales += 500;
  return scales;
}

/** 리절트를 메타에 반영(용비늘 적립, 해금 플래그, 신기록). */
export function applyResult(meta: MetaState, result: RunResult, bossName: string, difficultyId: string): MetaState {
  const next: MetaState = {
    ...meta,
    scales: meta.scales + result.earnedScales,
    bestScore: Math.max(meta.bestScore, result.score),
    bestChain: Math.max(meta.bestChain, result.bestChain),
    defeatedBosses: meta.defeatedBosses.slice(),
    unlockedDifficulties: meta.unlockedDifficulties.slice()
  };

  if (bossName && !next.defeatedBosses.includes(bossName)) {
    next.defeatedBosses = [...next.defeatedBosses, bossName];
  }

  if (result.cleared) {
    next.clearedFirstLoop = true;
    // Original 이상 1주차 클리어 → Maniac 해금.
    if (difficultyId !== "novice" && !next.unlockedDifficulties.includes("maniac")) {
      next.unlockedDifficulties = [...next.unlockedDifficulties, "maniac"];
    }
    // Maniac 노컨티뉴 클리어 → Ultra(심연) 해금.
    if (difficultyId === "maniac" && result.noContinue && !next.unlockedDifficulties.includes("ultra")) {
      next.unlockedDifficulties = [...next.unlockedDifficulties, "ultra"];
    }
  }
  if (result.trueEnding) next.trueEnding = true;

  return next;
}

export const TOTAL_STAGES = STAGES.length;
