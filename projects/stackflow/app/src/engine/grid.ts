import type { ActivePiece, Block, Grid } from "./types";

export function makeGrid(rows: number, cols: number): Grid {
  return Array.from({ length: rows }, () => Array<Block | null>(cols).fill(null));
}

export function cloneGrid(g: Grid): Grid {
  return g.map((row) => row.slice());
}

export function rows(g: Grid): number {
  return g.length;
}
export function cols(g: Grid): number {
  return g[0].length;
}

/** rotate a piece's cell offsets `rot` quarter-turns clockwise, normalized to >= 0 */
export function rotatedCells(
  cells: [number, number][],
  rot: number,
): [number, number][] {
  let out = cells.map(([dc, dr]) => [dc, dr] as [number, number]);
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) {
    out = out.map(([dc, dr]) => [-dr, dc] as [number, number]);
  }
  const minC = Math.min(...out.map(([dc]) => dc));
  const minR = Math.min(...out.map(([, dr]) => dr));
  return out.map(([dc, dr]) => [dc - minC, dr - minR] as [number, number]);
}

export function pieceCells(p: ActivePiece): [number, number][] {
  return rotatedCells(p.def.cells, p.rot).map(
    ([dc, dr]) => [p.col + dc, p.row + dr] as [number, number],
  );
}

export function collides(
  g: Grid,
  p: ActivePiece,
  lockedCols: number[] = [],
): boolean {
  const R = rows(g);
  const C = cols(g);
  for (const [c, r] of pieceCells(p)) {
    if (c < 0 || c >= C || r < 0 || r >= R) return true;
    if (g[r][c]) return true;
    if (lockedCols.includes(c)) return true;
  }
  return false;
}

/** SRS-like wall kicks (spec §3.3): try in-place, then side/up nudges */
const KICKS: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
];

export function tryRotate(
  g: Grid,
  p: ActivePiece,
  delta: 1 | -1 | 2,
  lockedCols: number[] = [],
): ActivePiece | null {
  const rot = (((p.rot + delta) % 4) + 4) % 4;
  for (const [kc, kr] of KICKS) {
    const cand = { ...p, rot, col: p.col + kc, row: p.row + kr };
    if (!collides(g, cand, lockedCols)) return cand;
  }
  return null;
}

/** write the piece's blocks into a cloned grid (per-cell colors) */
export function deposit(g: Grid, p: ActivePiece): Grid {
  const out = cloneGrid(g);
  const cells = pieceCells(p);
  for (let i = 0; i < cells.length; i++) {
    const [c, r] = cells[i];
    out[r][c] = { type: p.def.blockType, color: cellColor(p, i), group: p.def.group };
  }
  return out;
}

export function cellColor(p: ActivePiece, i: number): number {
  if (p.def.blockType === "obsidian" || p.def.blockType === "junk") return -1;
  if (p.def.blockType === "prism") return -2;
  return p.colors[i] ?? p.colors[0] ?? 0;
}

/**
 * Per-cell gravity (spec §4 [DEF]): every block falls straight down
 * (or up, when a boss reverses fall) until supported. Returns a new grid
 * and whether anything moved.
 */
export function applyGravity(g: Grid, up = false): { grid: Grid; moved: boolean } {
  const R = rows(g);
  const C = cols(g);
  const out = makeGrid(R, C);
  let moved = false;
  for (let c = 0; c < C; c++) {
    const stack: Block[] = [];
    for (let r = 0; r < R; r++) {
      const b = g[r][c];
      if (b) stack.push(b);
    }
    if (up) {
      for (let i = 0; i < stack.length; i++) out[i][c] = stack[i];
    } else {
      for (let i = 0; i < stack.length; i++) out[R - stack.length + i][c] = stack[i];
    }
  }
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++) if ((g[r][c] === null) !== (out[r][c] === null)) moved = true;
  return { grid: out, moved };
}

/** rotate the whole board 180° (The Turner [DEF]: 90° is impossible on a non-square grid) */
export function rotateGrid180(g: Grid): Grid {
  return g
    .map((row) => row.slice().reverse())
    .reverse();
}

/** fraction of the top `dangerRows` rows that are occupied → DANGER level 0..1 */
export function dangerLevel(g: Grid, dangerRows: number, up = false): number {
  const R = rows(g);
  const C = cols(g);
  let occ = 0;
  for (let i = 0; i < dangerRows; i++) {
    const r = up ? R - 1 - i : i;
    for (let c = 0; c < C; c++) if (g[r][c]) occ++;
  }
  return occ / (dangerRows * C);
}

export function countBlocks(g: Grid): number {
  let n = 0;
  for (const row of g) for (const b of row) if (b) n++;
  return n;
}

export function isBoardTopped(g: Grid, p: ActivePiece, lockedCols: number[]): boolean {
  // topped out when a fresh spawn collides (spec §8.7 loss condition)
  return collides(g, p, lockedCols);
}
