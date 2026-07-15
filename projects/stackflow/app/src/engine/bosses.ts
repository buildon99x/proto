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
  { id: "reverseFall", name: "역류", desc: "이번 스테이지 동안 블록이 위로 떨어집니다." },
  { id: "periodicRotate", name: "회전자", desc: "5수마다 보드가 180° 회전합니다." },
  { id: "hiddenPreview", name: "장막", desc: "다음 조각 미리보기가 가려집니다." },
  { id: "heavyGravity", name: "분쇄기", desc: "5수마다 바닥 한 줄이 점수 없이 으스러집니다." },
  { id: "randomPiece", name: "협잡꾼", desc: "3번째 조각마다 무작위로 바뀝니다." },
  { id: "lockedColumn", name: "간수", desc: "한 열이 스테이지 내내 봉인됩니다." },
  { id: "garbageRow", name: "밀물", desc: "6수마다 정크 줄이 추가로 아래에서 차오릅니다." },
  { id: "targetRaise", name: "갈취", desc: "진행 60%에서 목표가 15% 오릅니다." },
];

export const ACT_BOSSES: Record<number, { id: ActBossId; name: string; desc: string; phase2: string }> = {
  1: {
    id: "inverter",
    name: "인버터",
    desc: "낙하 방향이 영구히 뒤집힙니다 — 블록이 위로 쌓입니다.",
    phase2: "페이즈 2: 4수마다 정크 칸이 하나 떨어집니다.",
  },
  2: {
    id: "turner",
    name: "터너",
    desc: "5수마다 보드가 180° 회전합니다.",
    phase2: "페이즈 2: 3수마다 보드가 회전합니다.",
  },
  3: {
    id: "warden",
    name: "워든",
    desc: "3조각마다 파괴 불가 정크를 주입하고, 한 열이 봉인됩니다.",
    phase2: "페이즈 2: 두 번째 열이 봉인됩니다.",
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
