// Advantage system (spec §8.4): perks hook into run events.
// Automation = spectacle triggers (they ADD detonations), never silent
// convenience [DES].
import { advantageDefs } from "./config";
import type { AdvantageDef } from "./types";

export function advantageById(id: string): AdvantageDef | undefined {
  return advantageDefs.find((a) => a.id === id);
}

/** static rule modifiers derived from the active advantage set */
export interface AdvantageMods {
  chainPlusPerLink: number; // chainplus
  obsidianDoubled: boolean; // obsidianx2
  lineFillRatio: number; // looselines
  creditMultiplier: number; // greed
  overdrivePlus: number; // overplus
  previews: number; // foresight
  hold: boolean; // pocket
  smallPieces: boolean; // small
  detonatorEvery: number; // detonator
  pulseEvery: number; // pulse
  autoStartLink: number; // sparker: automation chains start at link 2
}

export function computeMods(active: string[]): AdvantageMods {
  const has = (id: string) => active.includes(id);
  return {
    chainPlusPerLink: has("chainplus") ? 1 : 0,
    obsidianDoubled: has("obsidianx2"),
    lineFillRatio: has("looselines") ? 0.9 : 1,
    creditMultiplier: has("greed") ? 1.5 : 1,
    overdrivePlus: has("overplus") ? 1 : 0,
    previews: has("foresight") ? 2 : 1,
    hold: has("pocket"),
    smallPieces: has("small"),
    detonatorEvery: has("detonator") ? 6 : 0,
    pulseEvery: has("pulse") ? 4 : 0,
    autoStartLink: has("sparker") ? 2 : 1,
  };
}
