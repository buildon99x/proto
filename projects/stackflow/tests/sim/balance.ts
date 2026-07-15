// Balance simulation (spec §8.1 pacing re-validation).
//
// A greedy 1-ply survival bot plays full seeded runs against the live engine
// and reports, per stage: median/p90 placements to clear, top-out rate, and
// the derived minutes (placements ÷ pacing.placementsPerMinute). Used to tune
// the rising-tide + target curve so stages last ≥ minStageMinutes ("min 1 min"
// is enforced by balance, never a clock — spec §0/eval §F2) while staying
// "hard but reachable".
//
//   pnpm --filter stackflow sim        (see app/package.json "sim")
//   tsx projects/stackflow/tests/sim/balance.ts [seeds] [maxStage]
//
// This is a tuning tool AND a committed record of the pacing check that
// notes/decisions.md refers to.

import { Game } from "../../app/src/engine/run";
import {
  applyGravity,
  cloneGrid,
  collides,
  deposit,
} from "../../app/src/engine/grid";
import { resolve } from "../../app/src/engine/resolve";
import { scoring, stagesCfg } from "../../app/src/engine/config";
import type { ActivePiece, Grid } from "../../app/src/engine/types";

const SEEDS = Number(process.argv[2] ?? 60);
const MAX_STAGE = Number(process.argv[3] ?? 30);
const PPM = stagesCfg.pacing.placementsPerMinute;

// Runtime overrides for fast tuning sweeps (mutate the imported config in
// place; stageTarget/raiseTide read it live). e.g.
//   ACTBASE=800,3500,14000 RAMP=0.14 TIDE_HOLES=2 tsx .../balance.ts 40
if (process.env.ACTBASE)
  (stagesCfg as { actBase: number[] }).actBase = process.env.ACTBASE.split(",").map(Number);
if (process.env.RAMP) (stagesCfg as { stageRamp: number }).stageRamp = Number(process.env.RAMP);
if (process.env.MINIBUMP) (stagesCfg as { miniBossBump: number }).miniBossBump = Number(process.env.MINIBUMP);
if (process.env.ACTBUMP) (stagesCfg as { actBossBump: number }).actBossBump = Number(process.env.ACTBUMP);
if (process.env.TIDE_HOLES) stagesCfg.tide.holes = Number(process.env.TIDE_HOLES);
if (process.env.TIDE_EVERY) stagesCfg.tide.everyPlacements = Number(process.env.TIDE_EVERY);
if (process.env.TIDE_WARMUP) stagesCfg.tide.warmupPlacements = Number(process.env.TIDE_WARMUP);

// ---- greedy 1-ply placement heuristic ------------------------------------
// Columns are gap-free after per-cell gravity, so survival = keep the stack
// low + flat while banking clears. value = score − heightPenalty − bumpiness.
const W_HEIGHT = 3.2;
const W_BUMPY = 1.4;
const W_MAXH = 2.6;

function columnHeights(g: Grid, up: boolean): number[] {
  const R = g.length;
  const C = g[0].length;
  const h: number[] = [];
  for (let c = 0; c < C; c++) {
    let height = 0;
    for (let r = 0; r < R; r++) {
      const rr = up ? R - 1 - r : r; // scan from ceiling toward floor
      if (g[rr][c]) {
        height = R - r; // rows from floor up to the highest block
        break;
      }
    }
    h.push(height);
  }
  return h;
}

function landing(
  g: Grid,
  base: ActivePiece,
  rot: number,
  col: number,
  up: boolean,
  locked: number[],
): ActivePiece | null {
  const R = g.length;
  const spawnRow = up ? R - 2 : 0;
  let p: ActivePiece = { ...base, rot, col, row: spawnRow };
  if (collides(g, p, locked)) return null;
  const dir = up ? -1 : 1;
  for (;;) {
    const cand = { ...p, row: p.row + dir };
    if (collides(g, cand, locked)) break;
    p = cand;
  }
  return p;
}

function evaluate(g: Game, landed: ActivePiece): number {
  const up = g.gravityUp();
  const locked = g.lockedCols();
  let grid = deposit(g.grid, landed);
  grid = applyGravity(grid, up).grid;
  const res = resolve(grid, {
    gravityUp: up,
    lockedCols: locked,
    lineFillRatio: g.mods.lineFillRatio,
    chainPlusPerLink: g.mods.chainPlusPerLink,
    obsidianDoubled: g.mods.obsidianDoubled,
  });
  const heights = columnHeights(res.grid, up);
  const agg = heights.reduce((a, b) => a + b, 0);
  const maxH = Math.max(...heights);
  let bump = 0;
  for (let i = 0; i < heights.length - 1; i++)
    bump += Math.abs(heights[i] - heights[i + 1]);
  return (
    res.result.totalScore - W_HEIGHT * agg - W_BUMPY * bump - W_MAXH * maxH
  );
}

/** choose the best (rot, col) for the active piece and execute it */
function playMove(g: Game): boolean {
  const active = g.active;
  if (!active) return false;
  const up = g.gravityUp();
  const locked = g.lockedCols();
  const C = stagesCfg.cols;
  let best: { rot: number; col: number; row: number; val: number } | null =
    null;
  for (let rot = 0; rot < 4; rot++) {
    for (let col = -2; col < C + 2; col++) {
      const landed = landing(g.grid, active, rot, col, up, locked);
      if (!landed) continue;
      const val = evaluate(g, landed);
      if (!best || val > best.val)
        best = { rot, col, row: landed.row, val };
    }
  }
  if (!best) {
    g.hardDrop(); // no candidate (shouldn't happen) — drop as-is
    return true;
  }
  g.active = { ...active, rot: best.rot, col: best.col, row: up ? stagesCfg.rows - 2 : 0 };
  g.hardDrop();
  return true;
}

/** spend credits greedily so the scoring engine scales like a real run */
function shop(g: Game): void {
  let guard = 0;
  while ((g.phase === "shop" || g.phase === "quickbuy") && guard++ < 20) {
    const affordable = g.shopOffers
      .filter((o) => o.price <= g.credits)
      .sort((a, b) => a.price - b.price);
    const pick = affordable[0];
    if (pick && !(pick.kind === "advantage" && g.advantages.length >= stagesCfg.advantageSlots)) {
      g.buy(pick);
    } else break;
  }
  if (g.phase === "shop" || g.phase === "quickbuy") g.leaveShop();
}

interface StageRec {
  stage: number;
  placements: number;
  cleared: boolean;
}

function playRun(seed: number): { furthest: number; stages: StageRec[]; won: boolean } {
  const g = new Game(seed);
  g.startRun();
  const stages: StageRec[] = [];
  let stageNo = g.stage;
  let startPlacements = g.placements;
  let guard = 0;
  while (g.phase !== "gameover" && g.phase !== "victory" && guard++ < 8000) {
    if (g.stage > MAX_STAGE) return { furthest: g.stage, stages, won: true };
    if (g.stage !== stageNo) {
      // a new stage began (startStage resets the board); reset counters
      stageNo = g.stage;
      startPlacements = g.placements;
    }
    switch (g.phase) {
      case "play":
        playMove(g);
        break;
      case "cleared": {
        const score = g.score;
        g.bank();
        if (g.phase === "cleared") {
          // bank refused — the Extortion mini-boss raised the target after the
          // hit; keep playing toward the new target rather than spinning.
          g.press();
        } else {
          stages.push({ stage: stageNo, placements: g.placements - startPlacements, cleared: true });
          void score;
        }
        break;
      }
      case "treasure":
        g.chooseTreasure(0);
        break;
      case "shop":
      case "quickbuy":
        shop(g);
        break;
    }
  }
  if (g.phase === "gameover")
    stages.push({ stage: stageNo, placements: g.placements - startPlacements, cleared: false });
  const won = g.phase === "victory" || g.stage > MAX_STAGE;
  return { furthest: g.stage, stages, won };
}

// ---- run the sim ----------------------------------------------------------
function pct(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

const byStage = new Map<number, number[]>(); // stage → cleared-placement counts
const topoutAt: number[] = [];
let wins = 0;

for (let i = 0; i < SEEDS; i++) {
  const r = playRun(1000 + i * 7);
  if (r.won) wins++;
  for (const s of r.stages) {
    if (s.cleared) {
      if (!byStage.has(s.stage)) byStage.set(s.stage, []);
      byStage.get(s.stage)!.push(s.placements);
    } else {
      topoutAt.push(s.stage);
    }
  }
}

console.log(`\nStackflow balance sim — ${SEEDS} seeds, tide=${JSON.stringify(stagesCfg.tide)}`);
console.log(`pacing: ${PPM} placements/min, min ${stagesCfg.pacing.minStageMinutes} min\n`);
console.log("stage | n  | p50 | p90 | ~min(p50) | flag");
console.log("------+----+-----+-----+-----------+-----");
let below = 0;
for (let st = 1; st <= MAX_STAGE; st++) {
  const arr = byStage.get(st);
  if (!arr || arr.length === 0) continue;
  const p50 = pct(arr, 50);
  const p90 = pct(arr, 90);
  const mins = p50 / PPM;
  const flag = mins < stagesCfg.pacing.minStageMinutes ? "⚠ <1min" : "ok";
  if (mins < stagesCfg.pacing.minStageMinutes) below++;
  console.log(
    `${String(st).padStart(5)} | ${String(arr.length).padStart(2)} | ${String(p50).padStart(3)} | ${String(p90).padStart(3)} | ${mins.toFixed(2).padStart(9)} | ${flag}`,
  );
}
const clearedCounts = [...byStage.values()].flat();
console.log(
  `\nfull-run wins: ${wins}/${SEEDS} (${((wins / SEEDS) * 100).toFixed(0)}%)`,
);
console.log(`stages below ${stagesCfg.pacing.minStageMinutes}min (p50): ${below}`);
console.log(
  `median cleared-stage placements (all stages): ${pct(clearedCounts, 50)} (~${(pct(clearedCounts, 50) / PPM).toFixed(2)} min)`,
);
const topoutHist = new Map<number, number>();
for (const s of topoutAt) topoutHist.set(s, (topoutHist.get(s) ?? 0) + 1);
console.log(
  `top-outs by stage: ${[...topoutHist.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join(" ") || "none"}`,
);
