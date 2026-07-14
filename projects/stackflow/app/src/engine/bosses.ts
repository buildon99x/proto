// Boss rules (spec §8.2): mini-bosses at within-act 3/6/9, Act Boss at 10.
import { stagesCfg } from "./config";
import type { ActBossId, BossState, MiniBossRuleId } from "./types";
import type { Rng } from "./rng";

export interface MiniBossDef {
  id: MiniBossRuleId;
  name: string;
  desc: string;
}

// Confirmed rules [SRC] seed the pool: reversed fall, periodic rotation.
export const MINI_BOSS_POOL: MiniBossDef[] = [
  { id: "reverseFall", name: "Riptide", desc: "Blocks fall UP for this stage." },
  { id: "periodicRotate", name: "Spinner", desc: "Every 5 placements the board rotates 180°." },
  { id: "hiddenPreview", name: "Shroud", desc: "The next-piece preview is hidden." },
  { id: "heavyGravity", name: "Crusher", desc: "Every 5 placements the press crushes the bottom row — no points." },
  { id: "randomPiece", name: "Trickster", desc: "Every 3rd piece is randomized." },
  { id: "lockedColumn", name: "Jailer", desc: "One column is sealed for the stage." },
  { id: "garbageRow", name: "Tide", desc: "Every 6 placements a garbage row rises from below." },
  { id: "targetRaise", name: "Extortion", desc: "At 60% progress the target rises 15%." },
];

export const ACT_BOSSES: Record<number, { id: ActBossId; name: string; desc: string; phase2: string }> = {
  1: {
    id: "inverter",
    name: "The Inverter",
    desc: "Fall direction is permanently reversed — blocks settle upward.",
    phase2: "Phase 2: every 4 placements a junk cell drops in.",
  },
  2: {
    id: "turner",
    name: "The Turner",
    desc: "The board rotates 180° every 5 placements.",
    phase2: "Phase 2: the board rotates every 3 placements.",
  },
  3: {
    id: "warden",
    name: "The Warden",
    desc: "Injects indestructible junk every 3 pieces; one column is sealed.",
    phase2: "Phase 2: a second column seals shut.",
  },
};

export function makeBoss(stage: number, rng: Rng): BossState | null {
  const s = ((stage - 1) % stagesCfg.stagesPerAct) + 1;
  const act = Math.ceil(stage / stagesCfg.stagesPerAct);
  if (s === stagesCfg.actBossStage) {
    const def = ACT_BOSSES[act];
    return {
      kind: "act",
      ruleId: def.id,
      name: def.name,
      desc: def.desc,
      phase: 1,
      idlePlacements: 0,
      counter: 0,
      targetRaised: false,
    };
  }
  if (stagesCfg.miniBossStages.includes(s)) {
    const def = MINI_BOSS_POOL[rng.int(MINI_BOSS_POOL.length)];
    return {
      kind: "mini",
      ruleId: def.id,
      name: def.name,
      desc: def.desc,
      phase: 1,
      idlePlacements: 0,
      counter: 0,
      targetRaised: false,
    };
  }
  return null;
}

export function bossGravityUp(boss: BossState | null): boolean {
  return boss?.ruleId === "reverseFall" || boss?.ruleId === "inverter";
}

export function bossLockedCols(boss: BossState | null, cols: number): number[] {
  if (!boss) return [];
  if (boss.ruleId === "lockedColumn") return [Math.floor(cols / 2)];
  if (boss.ruleId === "warden")
    return boss.phase === 2 ? [0, cols - 1] : [cols - 1];
  return [];
}

export function bossHidesPreview(boss: BossState | null): boolean {
  return boss?.ruleId === "hiddenPreview";
}

/** interval-based rules: how often (in placements) the rule fires; 0 = never */
export function bossRotateEvery(boss: BossState | null): number {
  if (!boss) return 0;
  if (boss.ruleId === "periodicRotate") return 5;
  if (boss.ruleId === "turner") return boss.phase === 2 ? 3 : 5;
  return 0;
}

export function bossJunkEvery(boss: BossState | null): number {
  if (!boss) return 0;
  if (boss.ruleId === "warden") return 3;
  if (boss.ruleId === "inverter" && boss.phase === 2) return 4;
  return 0;
}

export function bossGarbageRowEvery(boss: BossState | null): number {
  return boss?.ruleId === "garbageRow" ? 6 : 0;
}

export function bossRandomPieceEvery(boss: BossState | null): number {
  return boss?.ruleId === "randomPiece" ? 3 : 0;
}

export function bossCrushEvery(boss: BossState | null): number {
  return boss?.ruleId === "heavyGravity" ? 5 : 0;
}
