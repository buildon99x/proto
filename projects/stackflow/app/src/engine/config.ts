// Data-driven config (eval §G): all tunables live in the JSON files.
import scoringJson from "../data/scoring.json";
import stagesJson from "../data/stages.json";
import blocksJson from "../data/blocks.json";
import type { AdvantageDef, PieceDef } from "./types";

export const scoring = scoringJson;
export const stagesCfg = stagesJson;

export const basePieces: PieceDef[] = blocksJson.basePieces.map((p) => ({
  id: p.id,
  cells: p.cells as [number, number][],
  blockType: "normal",
}));

export const smallPieces: PieceDef[] = blocksJson.smallPieces.map((p) => ({
  id: p.id,
  cells: p.cells as [number, number][],
  blockType: "normal",
}));

export const specialPieces: PieceDef[] = blocksJson.specialPieces.map((p) => ({
  ...p,
  cells: p.cells as [number, number][],
  blockType: p.blockType as PieceDef["blockType"],
  group: p.group as PieceDef["group"],
}));

export const advantageDefs: AdvantageDef[] =
  blocksJson.advantages as AdvantageDef[];

export function chainMultiplier(k: number, chainPlusPerLink = 0): number {
  if (k < 1) return 1;
  const base =
    scoring.chainCurve === "linear"
      ? Math.max(1, 2 * (k - 1))
      : 1 + (k * (k - 1)) / 2;
  return base + chainPlusPerLink * (k - 1);
}

/** target(n) — spec §8.1 */
export function stageTarget(stage: number): number {
  const act = Math.ceil(stage / stagesCfg.stagesPerAct);
  const s = ((stage - 1) % stagesCfg.stagesPerAct) + 1;
  const base = stagesCfg.actBase[act - 1];
  const bump = stagesCfg.miniBossStages.includes(s)
    ? stagesCfg.miniBossBump
    : s === stagesCfg.actBossStage
      ? stagesCfg.actBossBump
      : 1;
  return Math.round(base * (1 + stagesCfg.stageRamp * (s - 1)) * bump);
}

export function actOf(stage: number): number {
  return Math.ceil(stage / stagesCfg.stagesPerAct);
}

export function withinAct(stage: number): number {
  return ((stage - 1) % stagesCfg.stagesPerAct) + 1;
}

export type StageKind = "normal" | "mini" | "act";

export function stageKind(stage: number): StageKind {
  const s = withinAct(stage);
  if (s === stagesCfg.actBossStage) return "act";
  if (stagesCfg.miniBossStages.includes(s)) return "mini";
  return "normal";
}

/** full shop after even within-act stages, quick-buy after odd (spec §8.3) */
export function shopKind(stage: number): "shop" | "quickbuy" {
  return withinAct(stage) % 2 === 0 ? "shop" : "quickbuy";
}
