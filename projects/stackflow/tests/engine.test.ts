// Unit tests per eval.md §G: line clear, shape clear, cascade chain
// counting, Vine chain scoring, Obsidian multiplier, boss rule
// application, seed reproducibility, targets/config.
import { describe, expect, it } from "vitest";
import { makeGrid, applyGravity, rotatedCells, rotateGrid180 } from "../app/src/engine/grid";
import {
  countObsidian,
  findColorGroups,
  findFullLines,
  growVines,
  resolve,
} from "../app/src/engine/resolve";
import { chainMultiplier, stageTarget, stageKind, shopKind } from "../app/src/engine/config";
import { makeRng } from "../app/src/engine/rng";
import { makeBoss, bossGravityUp, bossLockedCols, ACT_BOSSES } from "../app/src/engine/bosses";
import { Game } from "../app/src/engine/run";
import type { Block, Grid } from "../app/src/engine/types";

const N = (color: number): Block => ({ type: "normal", color });

function grid(rows = 12, cols = 8): Grid {
  return makeGrid(rows, cols);
}

describe("clear conditions (§6)", () => {
  it("clears a full line", () => {
    const g = grid();
    for (let c = 0; c < 8; c++) g[11][c] = N(c % 3); // mixed colors, no group ≥4
    expect(findFullLines(g)).toEqual([11]);
    const { result } = resolve(g);
    expect(result.links.length).toBe(1);
    expect(result.blocksDestroyed).toBe(8);
  });

  it("clears a same-color group of ≥4 (shape clear)", () => {
    const g = grid();
    g[11][0] = N(0);
    g[11][1] = N(0);
    g[10][0] = N(0);
    g[10][1] = N(0);
    const groups = findColorGroups(g, 4);
    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(4);
  });

  it("does not clear a group of 3", () => {
    const g = grid();
    g[11][0] = N(0);
    g[11][1] = N(0);
    g[10][0] = N(0);
    expect(findColorGroups(g, 4).length).toBe(0);
    expect(resolve(g).result.links.length).toBe(0);
  });

  it("prism (wildcard) joins any color group", () => {
    const g = grid();
    g[11][0] = N(1);
    g[11][1] = N(1);
    g[11][2] = { type: "prism", color: -2, group: "harmony" };
    g[11][3] = N(1);
    expect(findColorGroups(g, 4).length).toBe(1);
  });
});

describe("gravity & cascade chains (§4, §7)", () => {
  it("unsupported blocks fall after a clear", () => {
    const g = grid();
    g[5][3] = N(2);
    const out = applyGravity(g).grid;
    expect(out[5][3]).toBeNull();
    expect(out[11][3]).toEqual(N(2));
  });

  it("counts chain links on a cascade and applies super-linear multipliers", () => {
    // Stage-1 hook layout: dropping 4 A-blocks into col1 → 3-link chain.
    const g = grid();
    const bottom = [-9, 0, 0, 0, 1, 1, 1, 2];
    for (let c = 0; c < 8; c++) if (bottom[c] >= 0) g[11][c] = N(bottom[c]);
    const mid = [-9, -9, 1, 1, 2, 2, 2, -9];
    for (let c = 0; c < 8; c++) if (mid[c] >= 0) g[10][c] = N(mid[c]);
    for (let r = 7; r <= 10; r++) g[r][1] = N(0); // the dropped I piece
    const { result } = resolve(g);
    expect(result.links.map((l) => l.link)).toEqual([1, 2, 3]);
    expect(result.maxLink).toBe(3);
    // super-linear curve: 1, 2, 4 for links 1..3
    expect(result.links[0].multiplier).toBe(1);
    expect(result.links[1].multiplier).toBe(2);
    expect(result.links[2].multiplier).toBe(4);
    // deep chain scores far more than the same blocks flat
    expect(result.links[2].score / result.links[2].cleared.length).toBeGreaterThan(
      result.links[0].score / result.links[0].cleared.length,
    );
  });

  it("chainMultiplier follows 1,2,4,7,11,16", () => {
    expect([1, 2, 3, 4, 5, 6].map((k) => chainMultiplier(k))).toEqual([
      1, 2, 4, 7, 11, 16,
    ]);
  });
});

describe("special blocks (§5)", () => {
  it("Obsidian is indestructible and multiplies clears", () => {
    const g = grid();
    g[11][7] = { type: "obsidian", color: -1, group: "arcane" };
    for (let c = 0; c < 4; c++) g[11][c] = N(0);
    expect(countObsidian(g)).toBe(1);
    const { grid: after, result } = resolve(g);
    expect(after[11][7]?.type).toBe("obsidian");
    // 4 blocks × 10 × chain 1 × (1 + 0.25) = 50
    expect(result.links[0].score).toBe(50);
  });

  it("a full line leaves Obsidian in place but clears the rest", () => {
    const g = grid();
    for (let c = 0; c < 7; c++) g[11][c] = N(c % 3);
    g[11][7] = { type: "obsidian", color: -1, group: "arcane" };
    const { grid: after, result } = resolve(g);
    expect(result.blocksDestroyed).toBe(7);
    expect(after[11][7]?.type).toBe("obsidian");
  });

  it("Stone bursts and damages neighbors", () => {
    const g = grid();
    for (let c = 0; c < 3; c++) g[11][c] = N(0);
    g[11][3] = { type: "stone", color: 0, group: "explosives" };
    g[11][4] = N(1); // neighbor caught in the blast
    const { result } = resolve(g);
    expect(result.links[0].stoneBurst).toBeGreaterThan(0);
    expect(result.blocksDestroyed).toBe(5);
  });

  it("Vine chain: destroying one destroys all connected, +1 Stack per block", () => {
    const g = grid();
    for (let c = 0; c < 3; c++) g[11][c] = N(0);
    g[11][3] = { type: "vine", color: 0, group: "colony" };
    g[10][3] = { type: "vine", color: 2, group: "colony" };
    g[9][3] = { type: "vine", color: 2, group: "colony" };
    const { result } = resolve(g);
    // vine at (3,11) joins the color-0 group; chain of 3 vines destroyed
    expect(result.links[0].vineBonus).toBe(4); // 1 + 3 blocks in the chain
    expect(result.blocksDestroyed).toBe(6);
  });

  it("Vines grow toward each other on placement", () => {
    const g = grid();
    g[11][0] = { type: "vine", color: 0, group: "colony" };
    g[11][4] = { type: "vine", color: 1, group: "colony" };
    const { grew, grid: after } = growVines(g);
    expect(grew).toEqual([1, 11]);
    expect(after[11][1]?.type).toBe("vine");
  });

  it("Combo Tile detonates its neighborhood when adjacent to a clear", () => {
    const g = grid();
    for (let c = 0; c < 4; c++) g[11][c] = N(0);
    g[10][3] = { type: "combo", color: 1, group: "arcane" };
    g[10][4] = N(2); // in the combo neighborhood, not in the group
    const { result } = resolve(g);
    expect(result.blocksDestroyed).toBe(6);
  });

  it("Score Booster multiplies the clear it joins", () => {
    const plain = grid();
    for (let c = 0; c < 4; c++) plain[11][c] = N(0);
    const boosted = grid();
    for (let c = 0; c < 3; c++) boosted[11][c] = N(0);
    boosted[11][3] = { type: "booster", color: 0, group: "harmony" };
    const p = resolve(plain).result.links[0].score;
    const b = resolve(boosted).result.links[0].score;
    expect(b).toBeGreaterThan(p);
  });

  it("perfect clear multiplies the commit ×4", () => {
    const g = grid();
    for (let c = 0; c < 4; c++) g[11][c] = N(0);
    const { result } = resolve(g);
    expect(result.perfectClear).toBe(true);
    expect(result.totalScore).toBe(40 * 4);
  });
});

describe("run structure & targets (§8.1)", () => {
  it("targets follow the act/ramp/boss-bump formula", () => {
    expect(stageTarget(1)).toBe(100);
    expect(stageTarget(2)).toBe(118);
    expect(stageTarget(3)).toBe(177);
    expect(stageTarget(10)).toBe(419);
    expect(stageTarget(11)).toBe(1200); // act 2 base
    expect(stageTarget(30)).toBe(37728); // act 3 finale (actBase3 = 9000, see decisions.md)
  });

  it("boss cadence: mini at 3/6/9, act boss at 10", () => {
    expect(stageKind(3)).toBe("mini");
    expect(stageKind(6)).toBe("mini");
    expect(stageKind(9)).toBe("mini");
    expect(stageKind(10)).toBe("act");
    expect(stageKind(5)).toBe("normal");
    expect(stageKind(13)).toBe("mini");
    expect(stageKind(20)).toBe("act");
  });

  it("shop cadence: full shop after even stages, quick-buy after odd", () => {
    expect(shopKind(2)).toBe("shop");
    expect(shopKind(3)).toBe("quickbuy");
    expect(shopKind(10)).toBe("shop");
    expect(shopKind(11)).toBe("quickbuy");
  });
});

describe("boss rules (§8.2)", () => {
  it("act bosses are the signature roster", () => {
    expect(ACT_BOSSES[1].id).toBe("inverter");
    expect(ACT_BOSSES[2].id).toBe("turner");
    expect(ACT_BOSSES[3].id).toBe("warden");
  });

  it("reversed fall: gravity pulls blocks upward", () => {
    const boss = makeBoss(10, makeRng(1)); // act 1 boss = inverter
    expect(boss?.ruleId).toBe("inverter");
    expect(bossGravityUp(boss)).toBe(true);
    const g = grid();
    g[5][3] = N(2);
    const out = applyGravity(g, true).grid;
    expect(out[0][3]).toEqual(N(2));
  });

  it("Warden seals columns and phase 2 seals another", () => {
    const boss = makeBoss(30, makeRng(1));
    expect(boss?.ruleId).toBe("warden");
    expect(bossLockedCols(boss, 8)).toEqual([7]);
    boss!.phase = 2;
    expect(bossLockedCols(boss, 8)).toEqual([0, 7]);
  });

  it("board rotation preserves blocks", () => {
    const g = grid();
    g[11][0] = N(0);
    const out = rotateGrid180(g);
    expect(out[0][7]).toEqual(N(0));
  });

  it("mini-boss stages draw a rule from the pool", () => {
    const boss = makeBoss(3, makeRng(42));
    expect(boss?.kind).toBe("mini");
    expect(boss?.name).toBeTruthy();
  });
});

describe("determinism (§G)", () => {
  it("the same seed reproduces the same run", () => {
    const play = (seed: number) => {
      const g = new Game(seed);
      g.startRun();
      const trace: unknown[] = [];
      for (let i = 0; i < 30 && g.phase === "play"; i++) {
        g.move(i % 3 === 0 ? -1 : 1, 0);
        g.rotate(1);
        const out = g.hardDrop();
        trace.push([g.score, g.placements, out?.maxLink, g.queue[0]?.def.id, g.queue[0]?.colors.join("")]);
        if ((g.phase as string) === "cleared") g.press();
      }
      return JSON.stringify(trace);
    };
    expect(play(12345)).toBe(play(12345));
    expect(play(12345)).not.toBe(play(54321));
  });

  it("4-cell pieces always mix ≥2 colors — a piece can never self-clear on lock", () => {
    const g = new Game(99);
    g.startRun();
    g.hookQueue = []; // past the scripted opening, only random draws
    g.queue = [];
    g.bag = [];
    for (let i = 0; i < 60; i++) {
      const q = (g as unknown as { drawPiece(): { def: { cells: unknown[]; blockType: string }; colors: number[] } }).drawPiece();
      if (q.def.blockType === "normal" && q.def.cells.length >= 4) {
        expect(new Set(q.colors).size).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("stage 1 hook: the seeded board + opening bag detonates a multi-link chain", () => {
    const g = new Game(777);
    g.startRun();
    // first piece is the scripted mono-color I detonator; drop it in column 1
    expect(g.active?.def.id).toBe("I");
    expect(g.active?.colors).toEqual([0, 0, 0, 0]);
    g.rotate(1); // vertical
    while (g.active && g.active.col > 1) if (!g.move(-1, 0)) break;
    while (g.active && g.active.col < 1) if (!g.move(1, 0)) break;
    const out = g.hardDrop()!;
    expect(out.maxLink).toBeGreaterThanOrEqual(3);
    expect(g.score).toBeGreaterThanOrEqual(g.target); // one move clears stage 1
  });
});

describe("economy & advantages (§8.3, §8.4)", () => {
  it("bank pays stipend + per-block credits + overkill", () => {
    const g = new Game(1);
    g.startRun();
    g.score = g.target * 2; // 100% overkill = 4 bonus credits at 25%/credit
    g.stageBlocksDestroyed = 10;
    g.targetHitThisStage = true;
    g.phase = "cleared";
    const reward = g.stageReward();
    expect(reward).toBe(6 + 10 + 4);
    g.bank();
    expect(g.credits).toBe(reward);
    expect(["shop", "quickbuy"]).toContain(g.phase); // stage 1 → quickbuy
    expect(g.phase).toBe("quickbuy");
  });

  it("advantages cap at 5 active slots", () => {
    const g = new Game(1);
    g.startRun();
    g.credits = 999;
    g.phase = "shop";
    const ids = ["greed", "chainplus", "obsidianx2", "overplus", "foresight", "pocket"];
    for (const id of ids) {
      g.shopOffers = [{ kind: "advantage", id, name: id, price: 1, desc: "" }];
      g.buy(g.shopOffers[0]);
      g.phase = "shop";
    }
    expect(g.advantages.length).toBe(5);
    expect(g.advantages.includes("pocket")).toBe(false);
    // replacing works
    g.shopOffers = [{ kind: "advantage", id: "pocket", name: "pocket", price: 1, desc: "" }];
    expect(g.buy(g.shopOffers[0], "greed")).toBe(true);
    expect(g.advantages.includes("pocket")).toBe(true);
    expect(g.advantages.length).toBe(5);
  });

  it("chain amplifier advantage raises deep-link multipliers", () => {
    expect(chainMultiplier(3, 1)).toBe(chainMultiplier(3) + 2);
  });
});

describe("rotation (§3.3)", () => {
  it("supports CW, CCW and 180°", () => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ]; // T
    const cw = rotatedCells(cells, 1);
    const ccw = rotatedCells(cells, 3);
    const flip = rotatedCells(cells, 2);
    expect(cw).not.toEqual(cells);
    expect(ccw).not.toEqual(cells);
    expect(flip).not.toEqual(cells);
    expect(rotatedCells(cells, 4)).toEqual(rotatedCells(cells, 0));
  });
});
