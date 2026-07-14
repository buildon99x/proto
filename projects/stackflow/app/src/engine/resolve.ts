// Clear conditions, cascade + chain scoring (spec §4, §6, §7, §7.1).
import { chainMultiplier, scoring } from "./config";
import { applyGravity, cloneGrid, cols, rows } from "./grid";
import type { Block, ClearedCell, Grid, LinkResult, ResolveResult } from "./types";

const INDESTRUCTIBLE = new Set(["obsidian", "junk"]);

export interface ResolveOpts {
  /** cells the just-locked piece occupies after gravity, for perfect-fit */
  placedCells?: [number, number][];
  gravityUp?: boolean;
  lockedCols?: number[];
  /** 1 = full line; 0.9 with the Loose Lines advantage */
  lineFillRatio?: number;
  chainPlusPerLink?: number;
  obsidianDoubled?: boolean;
  /** automation chains can start deeper (Sparker) */
  startLink?: number;
}

function key(c: number, r: number): number {
  return r * 64 + c;
}

function clearable(b: Block | null): b is Block {
  return !!b && !INDESTRUCTIBLE.has(b.type);
}

/** connected same-color groups of size >= N (4-connectivity, prism = wildcard) */
export function findColorGroups(g: Grid, minSize: number): [number, number][][] {
  const R = rows(g);
  const C = cols(g);
  const groups: [number, number][][] = [];
  const claimed = new Set<number>();
  for (let color = 0; color < scoring.colorCount; color++) {
    const seen = new Set<number>();
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const b = g[r][c];
        if (!clearable(b) || b.color !== color || seen.has(key(c, r))) continue;
        const comp: [number, number][] = [];
        const stack: [number, number][] = [[c, r]];
        seen.add(key(c, r));
        let colored = 0;
        while (stack.length) {
          const [cc, cr] = stack.pop()!;
          comp.push([cc, cr]);
          const cb = g[cr][cc]!;
          if (cb.color === color) colored++;
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nc = cc + dc;
            const nr = cr + dr;
            if (nc < 0 || nc >= C || nr < 0 || nr >= R) continue;
            const nb = g[nr][nc];
            if (!clearable(nb) || seen.has(key(nc, nr))) continue;
            if (nb.color === color || nb.color === -2) {
              seen.add(key(nc, nr));
              stack.push([nc, nr]);
            }
          }
        }
        // require at least one truly colored member so pure-prism piles don't self-clear
        if (comp.length >= minSize && colored > 0) {
          const fresh = comp.filter(([fc, fr]) => !claimed.has(key(fc, fr)));
          if (fresh.length >= 1) {
            comp.forEach(([fc, fr]) => claimed.add(key(fc, fr)));
            groups.push(comp);
          }
        }
      }
    }
  }
  return groups;
}

/** rows filled to >= ratio across non-locked columns (spec §6) */
export function findFullLines(
  g: Grid,
  lockedCols: number[] = [],
  ratio = 1,
): number[] {
  const R = rows(g);
  const C = cols(g);
  const avail = C - lockedCols.length;
  const need = Math.ceil(avail * ratio);
  const out: number[] = [];
  for (let r = 0; r < R; r++) {
    let occ = 0;
    for (let c = 0; c < C; c++) {
      if (lockedCols.includes(c)) continue;
      if (g[r][c]) occ++;
    }
    if (occ >= need && need > 0) out.push(r);
  }
  return out;
}

/** all vines 4-connected to (c,r) */
function vineNetwork(g: Grid, c: number, r: number): [number, number][] {
  const R = rows(g);
  const C = cols(g);
  const seen = new Set<number>([key(c, r)]);
  const stack: [number, number][] = [[c, r]];
  const out: [number, number][] = [];
  while (stack.length) {
    const [cc, cr] = stack.pop()!;
    out.push([cc, cr]);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (nc < 0 || nc >= C || nr < 0 || nr >= R) continue;
      if (g[nr]?.[nc]?.type === "vine" && !seen.has(key(nc, nr))) {
        seen.add(key(nc, nr));
        stack.push([nc, nr]);
      }
    }
  }
  return out;
}

export function countObsidian(g: Grid): number {
  let n = 0;
  for (const row of g) for (const b of row) if (b?.type === "obsidian") n++;
  return n;
}

/**
 * Run the full cascade (spec §4): find clears → expand (combo tiles,
 * stone/bomb blasts, vine chains) → score the link → remove → gravity →
 * repeat. Explosives synergy: blast radius grows per explosive cleared
 * in the chain (spec §5.3).
 */
export function resolve(gridIn: Grid, opts: ResolveOpts = {}): { grid: Grid; result: ResolveResult } {
  let grid = cloneGrid(gridIn);
  const links: LinkResult[] = [];
  let totalScore = 0;
  let blocksDestroyed = 0;
  let explosivesCleared = 0;
  const startLink = opts.startLink ?? 1;
  const ratio = opts.lineFillRatio ?? 1;
  const R = rows(grid);
  const C = cols(grid);

  for (let i = 0; i < 40; i++) {
    const k = startLink + links.length;
    const groups = findColorGroups(grid, scoring.groupClearMin);
    const lineRows = findFullLines(grid, opts.lockedCols ?? [], ratio);
    const clearedMap = new Map<number, ClearedCell>();
    const add = (c: number, r: number) => {
      const b = grid[r][c];
      if (clearable(b) && !clearedMap.has(key(c, r)))
        clearedMap.set(key(c, r), { r, c, block: b });
    };
    for (const comp of groups) for (const [c, r] of comp) add(c, r);
    for (const r of lineRows) for (let c = 0; c < C; c++) add(c, r);
    if (clearedMap.size === 0) break;

    let vineBonus = 0;
    let stones = 0;

    // expansion to fixpoint: combo tiles, blasts, vine chains feed each other
    let changed = true;
    const detonatedCombos = new Set<number>();
    const explodedStones = new Set<number>();
    const chainedVines = new Set<number>();
    while (changed) {
      changed = false;
      // Combo Tile: detonates when adjacent (8-n) to any cleared cell (spec §6)
      for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
          if (grid[r][c]?.type !== "combo" || detonatedCombos.has(key(c, r))) continue;
          let adj = clearedMap.has(key(c, r));
          for (let dr = -1; dr <= 1 && !adj; dr++)
            for (let dc = -1; dc <= 1 && !adj; dc++)
              if (clearedMap.has(key(c + dc, r + dr))) adj = true;
          if (!adj) continue;
          detonatedCombos.add(key(c, r));
          add(c, r);
          for (let dr = -1; dr <= 1; dr++)
            for (let dc = -1; dc <= 1; dc++) {
              const nc = c + dc;
              const nr = r + dr;
              if (nc >= 0 && nc < C && nr >= 0 && nr < R) add(nc, nr);
            }
          changed = true;
        }
      }
      // Stone / Bomb blast (Explosives synergy: radius +1 per explosive in chain)
      for (const cell of [...clearedMap.values()]) {
        const t = cell.block.type;
        if ((t !== "stone" && t !== "bomb") || explodedStones.has(key(cell.c, cell.r)))
          continue;
        explodedStones.add(key(cell.c, cell.r));
        stones++;
        explosivesCleared++;
        const base = t === "bomb" ? scoring.bombBlastRadius : scoring.stoneBlastRadius;
        const radius = base + Math.min(3, Math.max(0, explosivesCleared - 1));
        for (let dr = -radius; dr <= radius; dr++)
          for (let dc = -radius; dc <= radius; dc++) {
            const nc = cell.c + dc;
            const nr = cell.r + dr;
            if (nc >= 0 && nc < C && nr >= 0 && nr < R) add(nc, nr);
          }
        changed = true;
      }
      // Vine chain: destroying one destroys all connected vines (spec §5.2)
      for (const cell of [...clearedMap.values()]) {
        if (cell.block.type !== "vine" || chainedVines.has(key(cell.c, cell.r))) continue;
        const net = vineNetwork(grid, cell.c, cell.r);
        vineBonus += 1 + net.length; // +1 Stack, +1 more per block in the chain
        for (const [nc, nr] of net) {
          chainedVines.add(key(nc, nr));
          add(nc, nr);
        }
        changed = true;
      }
    }

    const cleared = [...clearedMap.values()];
    const boosters = cleared.filter((x) => x.block.type === "booster").length;
    const arcane = cleared.filter((x) => x.block.group === "arcane").length;
    const harmony = cleared.filter((x) => x.block.group === "harmony").length;
    const obsPer = scoring.obsidianMultiplierPer * (opts.obsidianDoubled ? 2 : 1);
    const obsidianMult = 1 + obsPer * countObsidian(grid);
    let mult =
      chainMultiplier(k, opts.chainPlusPerLink ?? 0) + harmony; // Harmony: +1 per block (spec §5.3)
    mult *= Math.pow(scoring.boosterClearMultiplier, boosters);
    mult *= Math.pow(scoring.arcaneClearMultiplierPer, arcane);
    mult *= obsidianMult;
    const stoneBurst = scoring.stoneBurstFlat * stones;

    const perfectFit =
      links.length === 0 &&
      !!opts.placedCells &&
      opts.placedCells.length > 0 &&
      opts.placedCells.every(([pc, pr]) => clearedMap.has(key(pc, pr)));
    let score =
      scoring.baseBlockValue * cleared.length * mult + stoneBurst + vineBonus;
    if (perfectFit) score *= scoring.perfectFitBonus;
    score = Math.round(score);

    for (const cell of cleared) grid[cell.r][cell.c] = null;
    grid = applyGravity(grid, opts.gravityUp).grid;

    totalScore += score;
    blocksDestroyed += cleared.length;
    links.push({
      link: k,
      cleared,
      score,
      multiplier: mult,
      vineBonus,
      stoneBurst,
      boosters,
      arcane,
      harmony,
      lineRows,
      perfectFit,
      gridAfter: cloneGrid(grid),
    });
  }

  // Perfect clear: no clearable blocks remain (spec §7.1) → ×4 on the commit
  let perfectClear = false;
  if (links.length > 0) {
    perfectClear = grid.every((row) => row.every((b) => !clearable(b)));
    if (perfectClear) totalScore = Math.round(totalScore * scoring.perfectClearMultiplier);
  }

  const maxLink = links.length ? links[links.length - 1].link : 0;
  let overdriveGain = 0;
  for (const l of links) {
    overdriveGain += l.cleared.length * scoring.overdrive.perClearedBlock;
    if (l.link >= scoring.overdrive.bigLinkThreshold)
      overdriveGain += scoring.overdrive.bigLinkBonus;
  }

  return {
    grid,
    result: { links, totalScore, blocksDestroyed, maxLink, perfectClear, overdriveGain },
  };
}

/**
 * Vine growth (spec §5.2): each placement, one vine grows one cell toward
 * the nearest disconnected vine. Grows only into an empty, supported cell.
 */
export function growVines(gridIn: Grid): { grid: Grid; grew: [number, number] | null } {
  const g = cloneGrid(gridIn);
  const R = rows(g);
  const C = cols(g);
  const vines: [number, number][] = [];
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) if (g[r][c]?.type === "vine") vines.push([c, r]);
  if (vines.length < 2) return { grid: g, grew: null };

  // networks
  const netId = new Map<number, number>();
  let n = 0;
  for (const [c, r] of vines) {
    if (netId.has(key(c, r))) continue;
    for (const [nc, nr] of vineNetwork(g, c, r)) netId.set(key(nc, nr), n);
    n++;
  }
  if (n < 2) return { grid: g, grew: null };

  // closest pair across different networks
  let best: { from: [number, number]; to: [number, number]; d: number } | null = null;
  for (const a of vines)
    for (const b of vines) {
      if (netId.get(key(a[0], a[1])) === netId.get(key(b[0], b[1]))) continue;
      const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      if (!best || d < best.d) best = { from: a, to: b, d };
    }
  if (!best) return { grid: g, grew: null };

  // step one cell from `from` toward `to` (col first, then row)
  const [fc, fr] = best.from;
  const [tc, tr] = best.to;
  const steps: [number, number][] = [];
  if (tc !== fc) steps.push([fc + Math.sign(tc - fc), fr]);
  if (tr !== fr) steps.push([fc, fr + Math.sign(tr - fr)]);
  for (const [nc, nr] of steps) {
    if (nc < 0 || nc >= C || nr < 0 || nr >= R || g[nr][nc]) continue;
    const supported = nr === R - 1 || !!g[nr + 1][nc];
    if (!supported) continue;
    const src = g[fr][fc]!;
    g[nr][nc] = { type: "vine", color: src.color, group: "colony" };
    return { grid: g, grew: [nc, nr] };
  }
  return { grid: g, grew: null };
}
