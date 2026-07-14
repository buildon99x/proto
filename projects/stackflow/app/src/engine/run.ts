// Run orchestration (spec §8, §9): stages, bosses, economy, advantages,
// bank/press, Overdrive, stage-1 hook, persistence.
import {
  actOf,
  advantageDefs,
  basePieces,
  scoring,
  smallPieces,
  specialPieces,
  stageKind,
  stageTarget,
  stagesCfg,
  shopKind,
  withinAct,
} from "./config";
import {
  applyGravity,
  cloneGrid,
  collides,
  dangerLevel,
  deposit,
  makeGrid,
  pieceCells,
  rotateGrid180,
  tryRotate,
} from "./grid";
import {
  bossCrushEvery,
  bossGarbageRowEvery,
  bossGravityUp,
  bossHidesPreview,
  bossJunkEvery,
  bossLockedCols,
  bossRandomPieceEvery,
  bossRotateEvery,
  makeBoss,
} from "./bosses";
import { computeMods, type AdvantageMods } from "./advantages";
import { findColorGroups, growVines, resolve } from "./resolve";
import { makeRng, type Rng } from "./rng";
import {
  loadBests,
  loadDiscovered,
  saveBests,
  saveDiscovered,
} from "./persist";
import type {
  ActivePiece,
  Block,
  BossState,
  Grid,
  LinkResult,
  Phase,
  PieceDef,
  ResolveResult,
  RunBests,
  ShopOffer,
} from "./types";

export interface QueuedPiece {
  def: PieceDef;
  /** per-cell colors, parallel to def.cells */
  colors: number[];
}

export interface LockOutcome {
  /** board right after deposit + vine growth, before any clear (for playback) */
  gridAfterDeposit: Grid;
  links: LinkResult[];
  autoLinks: LinkResult[]; // automation-triggered detonations
  totalScore: number;
  perfectClear: boolean;
  perfectFit: boolean;
  maxLink: number;
  overdriveTriggered: boolean;
  overdriveActive: boolean;
  insaneCombo: boolean;
  newBest: string | null;
  targetHit: boolean; // first time this stage
  gameOver: boolean;
  bossPhase2: boolean; // transitioned this lock
  bossBroken: boolean; // act boss defeated this lock
  nudged: boolean;
  boardRotated: boolean;
  crushed: boolean;
  garbageRose: boolean;
  junkDropped: boolean;
  vineGrew: [number, number] | null;
}

/** Stage-1 guaranteed hook (spec §8.1/§8.7 [DES]): seeded board + opening bag
 * engineered so an A-colored drop near the A-group detonates a 3-link chain. */
const HOOK_ROWS: number[][] = [
  // color indexes; -9 = empty. Bottom two rows of the board.
  // col1 is the drop lane: an A-piece there clears A → B → C (3 links);
  // col0 stays open so the bottom row never line-clears mid-hook.
  [-9, -9, 1, 1, 2, 2, 2, -9],
  [-9, 0, 0, 0, 1, 1, 1, 2],
];
// scripted opening bag: the mono I piece is the detonator, the rest are
// mixed so nothing self-clears while the player learns the loop.
const HOOK_BAG: { id: string; colors: number[] }[] = [
  { id: "I", colors: [0, 0, 0, 0] },
  { id: "O", colors: [1, 1, 2, 2] },
  { id: "T", colors: [2, 2, 0, 0] },
  { id: "L", colors: [1, 2, 1, 2] },
  { id: "S", colors: [0, 1, 0, 1] },
  { id: "J", colors: [2, 0, 0, 2] },
];

export class Game {
  seed: number;
  rng: Rng;
  phase: Phase = "title";
  act = 1;
  stage = 1;
  score = 0;
  target = 0;
  credits = 0;
  grid: Grid;
  pool: PieceDef[] = [];
  bag: QueuedPiece[] = [];
  queue: QueuedPiece[] = [];
  active: ActivePiece | null = null;
  hold: QueuedPiece | null = null;
  holdUsed = false;
  advantages: string[] = [];
  mods: AdvantageMods = computeMods([]);
  boss: BossState | null = null;
  chainLink = 0;
  overdrive = 0;
  overdriveLeft = 0;
  danger = 0;
  placements = 0;
  stageBlocksDestroyed = 0;
  totalBlocksDestroyed = 0;
  targetHitThisStage = false; // pressing after this
  shopOffers: ShopOffer[] = [];
  rerolls = 0;
  treasureOffers: ShopOffer[] = [];
  pendingTreasure = false;
  runBests: RunBests;
  session = { chain: 0, clear: 0, perfectClears: 0 };
  discovered: Set<string>;
  drawCount = 0;
  hookQueue: { id: string; colors: number[] }[] = [];
  gameOverReason = "";
  lastOutcome: LockOutcome | null = null;

  constructor(seed?: number) {
    this.seed = seed ?? ((Math.floor(Math.random() * 2 ** 31)) >>> 0);
    this.rng = makeRng(this.seed);
    this.grid = makeGrid(stagesCfg.rows, stagesCfg.cols);
    this.runBests = loadBests();
    this.discovered = loadDiscovered();
  }

  // ---- lifecycle ----

  startRun(): void {
    this.pool = basePieces.map((p) => ({ ...p }));
    this.credits = 0;
    this.advantages = [];
    this.mods = computeMods([]);
    this.hold = null;
    this.session = { chain: 0, clear: 0, perfectClears: 0 };
    this.totalBlocksDestroyed = 0;
    this.startStage(1);
  }

  startStage(stage: number): void {
    this.stage = stage;
    const act = actOf(stage);
    const isActStart = withinAct(stage) === 1;
    if (isActStart) this.grid = makeGrid(stagesCfg.rows, stagesCfg.cols); // board resets per act (§8.7)
    this.act = act;
    this.score = 0;
    this.target = stageTarget(stage);
    this.placements = 0;
    this.stageBlocksDestroyed = 0;
    this.targetHitThisStage = false;
    this.holdUsed = false;
    this.boss = makeBoss(stage, this.rng);
    this.hookQueue = [];
    if (stage === 1) this.seedHook();
    this.bag = [];
    this.queue = [];
    this.refillQueue();
    this.spawn();
    this.phase = "play";
    this.updateDanger();
  }

  private seedHook(): void {
    const R = stagesCfg.rows;
    for (let i = 0; i < HOOK_ROWS.length; i++) {
      const row = HOOK_ROWS[i];
      const r = R - HOOK_ROWS.length + i;
      for (let c = 0; c < row.length; c++) {
        if (row[c] >= 0)
          this.grid[r][c] = { type: "normal", color: row[c] };
      }
    }
    this.hookQueue = [...HOOK_BAG];
  }

  /**
   * Per-cell piece colors [DEF]: special pieces are mono; small (<4-cell)
   * normal pieces are mono; 4-cell normal pieces always mix exactly two
   * distinct colors with both present — so no piece can self-clear on
   * lock (the ≥4 group must be assembled across placements).
   */
  private pieceColors(def: PieceDef): number[] {
    const n = def.cells.length;
    const a = this.rng.int(scoring.colorCount);
    if (def.blockType !== "normal" || n < scoring.groupClearMin) {
      return Array(n).fill(a);
    }
    let b = this.rng.int(scoring.colorCount - 1);
    if (b >= a) b++;
    const colors = def.cells.map(() => (this.rng.next() < 0.5 ? a : b));
    if (!colors.includes(b)) colors[this.rng.int(n)] = b;
    else if (!colors.includes(a)) colors[this.rng.int(n)] = a;
    return colors;
  }

  private drawPiece(): QueuedPiece {
    this.drawCount++;
    if (this.hookQueue.length > 0) {
      const h = this.hookQueue.shift()!;
      const def = basePieces.find((p) => p.id === h.id)!;
      return { def, colors: [...h.colors] };
    }
    const every = bossRandomPieceEvery(this.boss);
    if (every > 0 && this.drawCount % every === 0) {
      const all = [...basePieces, ...smallPieces];
      const def = all[this.rng.int(all.length)];
      return { def, colors: this.pieceColors(def) };
    }
    if (this.bag.length === 0) {
      const source = [...this.pool];
      if (this.mods.smallPieces) source.push(...smallPieces);
      this.bag = source.map((def) => ({
        def,
        colors: this.pieceColors(def),
      }));
      this.rng.shuffle(this.bag);
    }
    return this.bag.pop()!;
  }

  private refillQueue(): void {
    const want = 1 + this.mods.previews;
    while (this.queue.length < want) this.queue.push(this.drawPiece());
  }

  private spawn(): boolean {
    this.refillQueue();
    const q = this.queue.shift()!;
    this.refillQueue();
    const up = bossGravityUp(this.boss);
    const piece: ActivePiece = {
      def: q.def,
      rot: 0,
      col: Math.floor(stagesCfg.cols / 2) - 1,
      row: up ? stagesCfg.rows - 2 : 0,
      colors: q.colors,
    };
    // nudge into bounds
    for (const off of [0, -1, 1, -2, 2]) {
      const cand = { ...piece, col: piece.col + off };
      if (!collides(this.grid, cand, this.lockedCols())) {
        this.active = cand;
        this.discover(q.def.blockType);
        return true;
      }
    }
    this.active = piece;
    return false; // topped out (§8.7)
  }

  lockedCols(): number[] {
    return bossLockedCols(this.boss, stagesCfg.cols);
  }

  gravityUp(): boolean {
    return bossGravityUp(this.boss);
  }

  hidesPreview(): boolean {
    return bossHidesPreview(this.boss);
  }

  private discover(type: string): void {
    if (!this.discovered.has(type)) {
      this.discovered.add(type);
      saveDiscovered(this.discovered);
    }
  }

  private updateDanger(): void {
    this.danger = dangerLevel(this.grid, stagesCfg.dangerRows, this.gravityUp());
  }

  // ---- piece control ----

  move(dc: number, dr: number): boolean {
    if (this.phase !== "play" || !this.active) return false;
    const cand = { ...this.active, col: this.active.col + dc, row: this.active.row + dr };
    if (collides(this.grid, cand, this.lockedCols())) return false;
    this.active = cand;
    return true;
  }

  rotate(delta: 1 | -1 | 2): boolean {
    if (this.phase !== "play" || !this.active) return false;
    const next = tryRotate(this.grid, this.active, delta, this.lockedCols());
    if (!next) return false;
    this.active = next;
    return true;
  }

  holdPiece(): boolean {
    if (!this.mods.hold || this.phase !== "play" || !this.active || this.holdUsed)
      return false;
    const cur: QueuedPiece = { def: this.active.def, colors: this.active.colors };
    if (this.hold) this.queue.unshift(this.hold);
    this.hold = cur;
    this.holdUsed = true;
    this.spawn();
    return true;
  }

  /** landing position for ghost + drop (gravity-direction aware) */
  dropPosition(): ActivePiece | null {
    if (!this.active) return null;
    const dir = this.gravityUp() ? -1 : 1;
    let p = { ...this.active };
    while (true) {
      const cand = { ...p, row: p.row + dir };
      if (collides(this.grid, cand, this.lockedCols())) return p;
      p = cand;
    }
  }

  // ---- the core commit: hard drop, deposit, cascade, all systems ----

  hardDrop(): LockOutcome | null {
    if (this.phase !== "play" || !this.active) return null;
    const landed = this.dropPosition();
    if (!landed) return null;
    const up = this.gravityUp();
    const out: LockOutcome = {
      gridAfterDeposit: this.grid,
      links: [],
      autoLinks: [],
      totalScore: 0,
      perfectClear: false,
      perfectFit: false,
      maxLink: 0,
      overdriveTriggered: false,
      overdriveActive: this.overdriveLeft > 0,
      insaneCombo: false,
      newBest: null,
      targetHit: false,
      gameOver: false,
      bossPhase2: false,
      bossBroken: false,
      nudged: false,
      boardRotated: false,
      crushed: false,
      garbageRose: false,
      junkDropped: false,
      vineGrew: null,
    };

    // 1. deposit + settle (per-cell gravity, spec §4)
    let grid = deposit(this.grid, landed);
    grid = applyGravity(grid, up).grid;
    // track where the placed blocks settled (columns preserved by straight fall)
    const placedCells = settleCells(this.grid, landed, up);

    // 2. vine growth on placement (spec §5.2)
    const vg = growVines(grid);
    grid = vg.grid;
    out.vineGrew = vg.grew;
    out.gridAfterDeposit = cloneGrid(grid);

    // 3. resolve cascade
    const res = resolve(grid, {
      placedCells,
      gravityUp: up,
      lockedCols: this.lockedCols(),
      lineFillRatio: this.mods.lineFillRatio,
      chainPlusPerLink: this.mods.chainPlusPerLink,
      obsidianDoubled: this.mods.obsidianDoubled,
    });
    grid = res.grid;
    out.links = res.result.links;
    out.perfectClear = res.result.perfectClear;
    out.perfectFit = res.result.links.some((l) => l.perfectFit);
    out.maxLink = res.result.maxLink;
    let gained = res.result.totalScore;
    let destroyed = res.result.blocksDestroyed;
    let odGain = res.result.overdriveGain;

    this.placements++;

    // 4. automation advantages (spectacle triggers, spec §8.4 [DES])
    if (
      this.mods.detonatorEvery > 0 &&
      this.placements % this.mods.detonatorEvery === 0
    ) {
      const groups = findColorGroups(grid, 2);
      if (groups.length > 0) {
        const biggest = groups.reduce((a, b) => (b.length > a.length ? b : a));
        for (const [c, r] of biggest) grid[r][c] = null;
        grid = applyGravity(grid, up).grid;
        destroyed += biggest.length;
        gained += Math.round(scoring.baseBlockValue * biggest.length);
        const auto = resolve(grid, {
          gravityUp: up,
          lockedCols: this.lockedCols(),
          lineFillRatio: this.mods.lineFillRatio,
          chainPlusPerLink: this.mods.chainPlusPerLink,
          obsidianDoubled: this.mods.obsidianDoubled,
          startLink: this.mods.autoStartLink,
        });
        grid = auto.grid;
        out.autoLinks.push(...auto.result.links);
        gained += auto.result.totalScore;
        destroyed += auto.result.blocksDestroyed;
        odGain += auto.result.overdriveGain;
      }
    }
    if (this.mods.pulseEvery > 0 && this.placements % this.mods.pulseEvery === 0) {
      const recolored = this.chromaPulse(grid);
      if (recolored) {
        const auto = resolve(grid, {
          gravityUp: up,
          lockedCols: this.lockedCols(),
          lineFillRatio: this.mods.lineFillRatio,
          chainPlusPerLink: this.mods.chainPlusPerLink,
          obsidianDoubled: this.mods.obsidianDoubled,
          startLink: this.mods.autoStartLink,
        });
        grid = auto.grid;
        out.autoLinks.push(...auto.result.links);
        gained += auto.result.totalScore;
        destroyed += auto.result.blocksDestroyed;
        odGain += auto.result.overdriveGain;
      }
    }

    // 5. Overdrive (spec §7.1): piece-count based ×2, never a timer
    if (this.overdriveLeft > 0) {
      gained *= scoring.overdrive.scoreMultiplier;
      this.overdriveLeft--;
    }
    this.overdrive = Math.min(scoring.overdrive.max, this.overdrive + odGain);
    if (this.overdrive >= scoring.overdrive.max && this.overdriveLeft === 0 && odGain > 0) {
      this.overdriveLeft = scoring.overdrive.placements + this.mods.overdrivePlus;
      this.overdrive = 0;
      out.overdriveTriggered = true;
    }

    gained = Math.round(gained);
    this.score += gained;
    out.totalScore = gained;
    this.stageBlocksDestroyed += destroyed;
    this.totalBlocksDestroyed += destroyed;
    this.chainLink = out.maxLink;

    // 6. session stats + bragging meta (spec §8.5)
    const allLinks = [...out.links, ...out.autoLinks];
    const bestLink = Math.max(0, ...allLinks.map((l) => l.link));
    if (bestLink > this.session.chain) this.session.chain = bestLink;
    if (gained > this.session.clear) this.session.clear = gained;
    if (out.perfectClear) this.session.perfectClears++;
    out.insaneCombo =
      bestLink >= scoring.insaneComboLink ||
      (this.runBests.clear > 0 && gained > this.runBests.clear);
    if (bestLink > this.runBests.chain) out.newBest = "chain";
    else if (gained > this.runBests.clear && this.runBests.clear > 0)
      out.newBest = "clear";

    // 7. boss hooks (spec §8.2)
    this.grid = grid;
    this.applyBossHooks(out, allLinks.length > 0);
    grid = this.grid;

    // 8. target / break gauge
    const wasHit = this.targetHitThisStage;
    if (this.score >= this.target && !wasHit) {
      this.targetHitThisStage = true;
      out.targetHit = true;
      if (this.boss?.kind === "act") out.bossBroken = true;
    }
    if (
      this.boss &&
      !out.bossPhase2 &&
      this.boss.phase === 1 &&
      this.score >= this.target * stagesCfg.bossPhase2At
    ) {
      if (this.boss.kind === "act") {
        this.boss.phase = 2;
        out.bossPhase2 = true;
      } else if (this.boss.ruleId === "targetRaise" && !this.boss.targetRaised) {
        this.boss.targetRaised = true;
        this.target = Math.round(this.target * 1.15);
      }
    }

    this.updateDanger();

    // 9. next piece / top-out (spec §8.7: pressure is spatial, no timer)
    if (out.targetHit) {
      this.phase = "cleared"; // bank/press prompt (spec §8.3)
      this.active = null;
    } else {
      const ok = this.spawn();
      if (!ok) {
        out.gameOver = true;
        this.endRun("The board topped out.");
      }
    }
    this.lastOutcome = out;
    return out;
  }

  private chromaPulse(grid: Grid): boolean {
    const R = stagesCfg.rows;
    const C = stagesCfg.cols;
    const candidates: [number, number, number][] = [];
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++) {
        const b = grid[r][c];
        if (!b || b.color < 0 || b.type !== "normal") continue;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nb = grid[r + dr]?.[c + dc];
          if (nb && nb.color >= 0 && nb.color !== b.color)
            candidates.push([c, r, nb.color]);
        }
      }
    if (candidates.length === 0) return false;
    const [c, r, color] = candidates[this.rng.int(candidates.length)];
    grid[r][c] = { ...grid[r][c]!, color };
    return true;
  }

  private applyBossHooks(out: LockOutcome, hadClear: boolean): void {
    const boss = this.boss;
    if (!boss) return;
    const up = this.gravityUp();
    boss.counter++;

    const rotEvery = bossRotateEvery(boss);
    if (rotEvery > 0 && boss.counter % rotEvery === 0) {
      this.grid = applyGravity(rotateGrid180(this.grid), up).grid;
      out.boardRotated = true;
    }
    const junkEvery = bossJunkEvery(boss);
    if (junkEvery > 0 && boss.counter % junkEvery === 0) {
      if (this.dropJunk()) {
        out.junkDropped = true;
        this.discover("junk");
      }
    }
    const garbEvery = bossGarbageRowEvery(boss);
    if (garbEvery > 0 && boss.counter % garbEvery === 0) {
      this.raiseGarbageRow();
      out.garbageRose = true;
    }
    const crushEvery = bossCrushEvery(boss);
    if (crushEvery > 0 && boss.counter % crushEvery === 0) {
      this.crushBottomRow(up);
      out.crushed = true;
    }
    // idle nudge (mini-boss pushes back, piece-count based — spec §8.2)
    if (boss.kind === "mini") {
      boss.idlePlacements = hadClear ? 0 : boss.idlePlacements + 1;
      if (boss.idlePlacements >= stagesCfg.bossNudgeIdlePlacements) {
        boss.idlePlacements = 0;
        if (this.dropJunk()) {
          out.nudged = true;
          this.discover("junk");
        }
      }
    }
  }

  private dropJunk(): boolean {
    const C = stagesCfg.cols;
    const up = this.gravityUp();
    const locked = this.lockedCols();
    const cols: number[] = [];
    for (let c = 0; c < C; c++) if (!locked.includes(c)) cols.push(c);
    this.rng.shuffle(cols);
    for (const c of cols) {
      const spawnRow = up ? stagesCfg.rows - 1 : 0;
      if (!this.grid[spawnRow][c]) {
        const g = cloneGrid(this.grid);
        g[spawnRow][c] = { type: "junk", color: -1 };
        this.grid = applyGravity(g, up).grid;
        return true;
      }
    }
    return false;
  }

  private raiseGarbageRow(): void {
    const C = stagesCfg.cols;
    const hole = this.rng.int(C);
    const g = cloneGrid(this.grid);
    g.shift(); // top row discarded (blocks pushed up)
    const row: (Block | null)[] = [];
    for (let c = 0; c < C; c++)
      row.push(c === hole ? null : { type: "normal", color: -1 });
    g.push(row);
    this.grid = g;
  }

  private crushBottomRow(up: boolean): void {
    const r = up ? 0 : stagesCfg.rows - 1;
    const g = cloneGrid(this.grid);
    for (let c = 0; c < stagesCfg.cols; c++) {
      const b = g[r][c];
      if (b && b.type !== "obsidian" && b.type !== "junk") g[r][c] = null;
    }
    this.grid = applyGravity(g, up).grid;
  }

  // ---- bank / press (spec §8.3) ----

  /** overkill beyond the target converts to bonus credits at bank time */
  overkillCredits(): number {
    if (this.score <= this.target) return 0;
    return Math.floor(
      (this.score - this.target) /
        (this.target * stagesCfg.economy.overkillCreditPer),
    );
  }

  stageReward(): number {
    const kind = stageKind(this.stage);
    const stipend = stagesCfg.economy.stipend[this.act - 1];
    const bossMult = kind === "normal" ? 1 : stagesCfg.economy.bossPayMultiplier;
    const blockCredits = Math.round(
      this.stageBlocksDestroyed *
        stagesCfg.economy.creditPerBlock *
        this.mods.creditMultiplier,
    );
    return stipend * bossMult + blockCredits + this.overkillCredits();
  }

  bank(): void {
    if (this.phase !== "cleared" && this.phase !== "play") return;
    if (this.score < this.target) return;
    this.credits += this.stageReward();
    const finished = this.stage;
    if (finished >= stagesCfg.acts * stagesCfg.stagesPerAct) {
      this.finishRun(true);
      return;
    }
    if (stageKind(finished) === "act") {
      this.makeTreasure();
      this.pendingTreasure = true;
      this.phase = "treasure";
      return;
    }
    this.enterShop(finished);
  }

  press(): void {
    if (this.phase !== "cleared") return;
    this.phase = "play";
    if (!this.active) {
      const ok = this.spawn();
      if (!ok) this.endRun("The board topped out while pressing.");
    }
  }

  private enterShop(finishedStage: number): void {
    const kind = shopKind(finishedStage);
    this.rerolls = 0;
    if (kind === "shop") {
      this.shopOffers = this.makeOffers(stagesCfg.economy.fullShopOffers);
      this.phase = "shop";
    } else {
      this.shopOffers = this.makeOffers(1);
      this.phase = "quickbuy";
    }
  }

  // ---- shop & treasure (spec §8.3) ----

  private makeOffers(n: number, rareOnly = false): ShopOffer[] {
    const act = this.act;
    const pieceOffers: ShopOffer[] = specialPieces
      .filter((p) => (p.act ?? 1) <= act && (!rareOnly || p.rare))
      .map((p) => ({
        kind: "piece" as const,
        id: p.id,
        name: p.name ?? p.id,
        price: p.price ?? 5,
        desc: p.desc ?? "",
      }));
    const advOffers: ShopOffer[] = advantageDefs
      .filter((a) => !this.advantages.includes(a.id) && (!rareOnly || a.rare))
      .map((a) => ({
        kind: "advantage" as const,
        id: a.id,
        name: a.name,
        price: a.price,
        desc: `[${a.kind}] ${a.desc}`,
      }));
    const all = [...pieceOffers, ...advOffers];
    this.rng.shuffle(all);
    return all.slice(0, n);
  }

  rerollCost(): number {
    return (
      stagesCfg.economy.rerollBaseCost +
      stagesCfg.economy.rerollCostStep * this.rerolls
    );
  }

  reroll(): boolean {
    if (this.phase !== "shop") return false;
    const cost = this.rerollCost();
    if (this.credits < cost) return false;
    this.credits -= cost;
    this.rerolls++;
    this.shopOffers = this.makeOffers(stagesCfg.economy.fullShopOffers);
    return true;
  }

  buy(offer: ShopOffer, replaceAdvantageId?: string): boolean {
    if (this.phase !== "shop" && this.phase !== "quickbuy") return false;
    if (this.credits < offer.price) return false;
    if (offer.kind === "advantage") {
      if (this.advantages.length >= stagesCfg.advantageSlots) {
        if (!replaceAdvantageId || !this.advantages.includes(replaceAdvantageId))
          return false;
        this.advantages = this.advantages.filter((a) => a !== replaceAdvantageId);
      }
      this.advantages.push(offer.id);
      this.mods = computeMods(this.advantages);
    } else {
      const def = specialPieces.find((p) => p.id === offer.id)!;
      this.pool.push({ ...def });
      this.bag = []; // reshuffle so the new block can appear soon
    }
    this.credits -= offer.price;
    this.shopOffers = this.shopOffers.filter((o) => o !== offer);
    if (this.phase === "quickbuy") this.leaveShop();
    return true;
  }

  leaveShop(): void {
    if (this.phase !== "shop" && this.phase !== "quickbuy") return;
    this.startStage(this.stage + 1);
  }

  private makeTreasure(): void {
    // free 1-of-3 rare pick after an Act Boss (spec §8.3)
    let offers = this.makeOffers(3, true);
    if (offers.length < 3) offers = [...offers, ...this.makeOffers(3 - offers.length)];
    this.treasureOffers = offers.map((o) => ({ ...o, price: 0 }));
  }

  chooseTreasure(i: number): void {
    if (this.phase !== "treasure") return;
    const offer = this.treasureOffers[i];
    if (offer) {
      if (offer.kind === "advantage") {
        if (this.advantages.length < stagesCfg.advantageSlots) {
          this.advantages.push(offer.id);
          this.mods = computeMods(this.advantages);
        }
      } else {
        const def = specialPieces.find((p) => p.id === offer.id)!;
        this.pool.push({ ...def });
        this.bag = [];
      }
    }
    this.pendingTreasure = false;
    this.enterShop(this.stage); // act boss stage 10 is even → full shop
  }

  // ---- end of run ----

  private endRun(reason: string): void {
    this.gameOverReason = reason;
    this.finishRun(false);
  }

  private finishRun(victory: boolean): void {
    const bests = { ...this.runBests };
    if (this.session.chain > bests.chain) bests.chain = this.session.chain;
    if (this.session.clear > bests.clear) bests.clear = this.session.clear;
    if (this.session.perfectClears > bests.perfectClears)
      bests.perfectClears = this.session.perfectClears;
    if (this.act > bests.act) bests.act = this.act;
    if (this.stage > bests.stage) bests.stage = this.stage;
    this.runBests = bests;
    saveBests(bests);
    this.phase = victory ? "victory" : "gameover";
  }
}

/** where the placed piece's blocks end up after straight-fall settle */
function settleCells(
  before: Grid,
  landed: ActivePiece,
  up: boolean,
): [number, number][] {
  const R = before.length;
  const cells = pieceCells(landed);
  // simulate straight fall per column of just the placed cells over the old grid
  const byCol = new Map<number, number[]>();
  for (const [c, r] of cells) {
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c)!.push(r);
  }
  const out: [number, number][] = [];
  for (const [c, rowsArr] of byCol) {
    const existing: number[] = [];
    for (let r = 0; r < R; r++) if (before[r][c]) existing.push(r);
    if (up) {
      let top = existing.length ? Math.max(...existing) : -1;
      for (let i = 0; i < rowsArr.length; i++) out.push([c, ++top]);
    } else {
      let bottom = existing.length ? Math.min(...existing) : R;
      for (let i = 0; i < rowsArr.length; i++) out.push([c, --bottom]);
    }
  }
  return out;
}
