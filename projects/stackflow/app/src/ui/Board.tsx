// DOM-rendered board (see notes/decisions.md: DOM over Canvas).
// Colorblind-safe palette + per-color glyphs — never color alone (§8.7).
import { cellColor, pieceCells } from "../engine/grid";
import { stagesCfg } from "../engine/config";
import type { Game } from "../engine/run";
import type { Block, Grid } from "../engine/types";
import type { Fx } from "./useGame";
import { T } from "./strings";

export const COLOR_GLYPHS = ["●", "▲", "■", "◆", "✚"];

const TYPE_ICONS: Partial<Record<Block["type"], string>> = {
  stone: "🪨",
  bomb: "💣",
  obsidian: "🟪",
  vine: "🌿",
  combo: "✳",
  booster: "⭐",
  rune: "🔮",
  prism: "🔷",
  junk: "▦",
};

export function blockGlyph(b: Block): string {
  if (b.type !== "normal") return TYPE_ICONS[b.type] ?? "?";
  if (b.color < 0) return "▦";
  return COLOR_GLYPHS[b.color % COLOR_GLYPHS.length];
}

export function blockClass(b: Block): string {
  if (b.type === "obsidian") return "b-obsidian";
  if (b.type === "junk" || b.color === -1) return "b-junk";
  if (b.color === -2) return "b-prism";
  return `b-c${b.color % 5}`;
}

export function Board({ game, fx, busy }: { game: Game; fx: Fx; busy: boolean }) {
  const grid: Grid = fx.grid ?? game.grid;
  const rows = stagesCfg.rows;
  const cols = stagesCfg.cols;
  const locked = new Set(game.lockedCols());
  const activeCells = new Map<string, Block>();
  const ghostCells = new Map<string, Block>();
  if (!busy && game.phase === "play" && game.active) {
    const p = game.active;
    const mk = (i: number): Block => ({
      type: p.def.blockType,
      color: cellColor(p, i),
      group: p.def.group,
    });
    pieceCells(p).forEach(([c, r], i) => activeCells.set(`${r},${c}`, mk(i)));
    const ghost = game.dropPosition();
    if (ghost)
      pieceCells(ghost).forEach(([c, r], i) => ghostCells.set(`${r},${c}`, mk(i)));
  }

  const dangerRows = stagesCfg.dangerRows;
  const up = game.gravityUp();

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const b = grid[r][c];
      const activeB = activeCells.get(key);
      const ghostB = !activeB ? ghostCells.get(key) : undefined;
      const isClearing = fx.clearing.has(key);
      const inDangerBand = up ? r >= rows - dangerRows : r < dangerRows;
      const shown = activeB ?? b;
      const cls = [
        "cell",
        shown ? blockClass(shown) : "b-empty",
        activeB && "active",
        ghostB && "ghost",
        isClearing && "clearing",
        locked.has(c) && "locked-col",
        inDangerBand && !shown && "danger-band",
      ]
        .filter(Boolean)
        .join(" ");
      cells.push(
        <div key={key} className={cls}>
          {shown ? blockGlyph(shown) : ghostB ? blockGlyph(ghostB) : ""}
        </div>,
      );
    }
  }

  const boardCls = [
    "board",
    fx.shake > 0 && `shake-${fx.shake}`,
    fx.flash && "flash",
    fx.slowmo && "slowmo",
    game.danger >= 0.15 && game.phase === "play" && "danger",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={boardCls}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }}
    >
      {cells}
      {fx.popup && <div className="popup">{fx.popup}</div>}
      {fx.link > 0 && (
        <div className={`chain-counter ${fx.link >= 5 ? "chain-huge" : ""}`}>
          {T.chain(fx.multiplier % 1 === 0 ? String(fx.multiplier) : fx.multiplier.toFixed(1))}
          <span className="chain-link">{T.link(fx.link)}</span>
        </div>
      )}
      {fx.banner && <div className="banner">{fx.banner}</div>}
      {game.danger >= 0.4 && game.phase === "play" && (
        <div className="danger-banner">{T.danger}</div>
      )}
    </div>
  );
}
