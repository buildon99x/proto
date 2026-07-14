// Core engine types — see spec.md §5, §9.

export type BlockType =
  | "normal"
  | "stone"
  | "bomb" // Explosives member [DEF], bigger radius Stone
  | "obsidian"
  | "vine"
  | "combo"
  | "booster"
  | "rune" // Arcane member [DEF]: multiplies clears it participates in
  | "prism" // Harmony member [DEF]: wildcard color
  | "junk"; // indestructible garbage (Warden / boss rules) [DEF]

export type BlockGroup = "explosives" | "colony" | "arcane" | "harmony";

export interface Block {
  type: BlockType;
  /** color index 0..colorCount-1; -1 = colorless (junk/obsidian), -2 = wildcard (prism) */
  color: number;
  group?: BlockGroup;
}

/** grid[row][col]; row 0 at top (spec §2) */
export type Grid = (Block | null)[][];

export interface PieceDef {
  id: string;
  name?: string;
  cells: [number, number][]; // [dc, dr]
  blockType: BlockType;
  group?: BlockGroup;
  desc?: string;
  price?: number;
  rare?: boolean;
  act?: number;
}

export interface ActivePiece {
  def: PieceDef;
  rot: number; // 0..3
  col: number;
  row: number;
  color: number;
}

export type AdvantageKind = "automation" | "reward-multiplier" | "rule-changer";

export interface AdvantageDef {
  id: string;
  name: string;
  kind: AdvantageKind;
  price: number;
  desc: string;
  rare?: boolean;
}

export type MiniBossRuleId =
  | "reverseFall"
  | "periodicRotate"
  | "hiddenPreview"
  | "heavyGravity"
  | "randomPiece"
  | "lockedColumn"
  | "garbageRow"
  | "targetRaise";

export type ActBossId = "inverter" | "turner" | "warden";

export interface BossState {
  kind: "mini" | "act";
  ruleId: MiniBossRuleId | ActBossId;
  name: string;
  desc: string;
  phase: 1 | 2;
  /** placements since last clear, drives the idle nudge (mini) */
  idlePlacements: number;
  /** rule-specific counters */
  counter: number;
  targetRaised: boolean;
}

export interface ClearedCell {
  r: number;
  c: number;
  block: Block;
}

export interface LinkResult {
  link: number;
  cleared: ClearedCell[];
  score: number;
  multiplier: number;
  vineBonus: number;
  stoneBurst: number;
  boosters: number;
  arcane: number;
  harmony: number;
  lineRows: number[];
  perfectFit: boolean;
  /** snapshot of the grid AFTER this link's removal+gravity, for step-by-step playback */
  gridAfter: Grid;
}

export interface ResolveResult {
  links: LinkResult[];
  totalScore: number;
  blocksDestroyed: number;
  maxLink: number;
  perfectClear: boolean;
  overdriveGain: number;
}

export type Phase =
  | "title"
  | "play"
  | "resolving"
  | "cleared" // bank/press choice (spec §8.3)
  | "quickbuy"
  | "shop"
  | "treasure"
  | "summary"
  | "gameover"
  | "victory";

export interface ShopOffer {
  kind: "piece" | "advantage";
  id: string;
  name: string;
  price: number;
  desc: string;
}

export interface RunBests {
  chain: number;
  clear: number;
  perfectClears: number;
  act: number;
  stage: number;
}
