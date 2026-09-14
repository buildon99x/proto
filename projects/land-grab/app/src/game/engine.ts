import { Board } from "./board";
import {
  BOARD_SIZE,
  HOME_RADIUS,
  KILL_SCORE,
  MATCH_DURATION_MS,
  PLAYER_LIVES,
  PLAYER_TICK_MS,
  RESPAWN_DELAY_MS,
  SELF_TRAIL_GRACE,
  WALL_THICKNESS,
  type Difficulty
} from "./config";
import { DELTA, OPPOSITE, type Cell, type Direction, type PlayerId, type MatchPhase, type Runner, type Standing } from "./types";

/** 한 프레임에 처리할 최대 시간. 탭 복귀 시 한꺼번에 수십 틱이 도는 것을 막는다. */
const MAX_FRAME_MS = 120;

const TILE_SAMPLE_MS = 100;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MatchEvent =
  | { type: "capture"; id: PlayerId; cells: Cell[]; originX: number; originY: number }
  | { type: "death"; id: PlayerId; killerId: PlayerId | null; x: number; y: number; cells: Cell[] };

export type MatchResult = {
  outcome: "win" | "lose" | "ranked";
  standings: Standing[];
  playerRank: number;
};

export class Match {
  readonly board: Board;
  readonly runners: Runner[];
  readonly durationMs = MATCH_DURATION_MS;
  readonly difficulty: Difficulty;

  phase: MatchPhase = "playing";
  elapsedMs = 0;

  private readonly rng: () => number;
  private tileCounts: number[];
  private tileSampleAccMs = 0;
  private events: MatchEvent[] = [];

  constructor(difficulty: Difficulty, seed = Date.now()) {
    this.difficulty = difficulty;
    this.rng = mulberry32(seed);
    this.board = new Board(BOARD_SIZE);

    const total = difficulty.aiCount + 1;
    this.runners = [];

    const homes = this.homeAnchors(total);
    for (let slot = 0; slot < total; slot += 1) {
      const id = (slot + 1) as PlayerId;
      const home = homes[slot];
      const runner: Runner = {
        id,
        kind: slot === 0 ? "human" : "ai",
        alive: true,
        respawnAt: 0,
        x: home.x,
        y: home.y,
        prevX: home.x,
        prevY: home.y,
        dir: this.spawnDirection(home),
        queuedDir: null,
        turnedAtX: -1,
        turnedAtY: -1,
        trail: [],
        tickMs: slot === 0 ? PLAYER_TICK_MS : difficulty.aiTickMs,
        tickAccMs: 0,
        lives: slot === 0 ? PLAYER_LIVES : Number.POSITIVE_INFINITY,
        kills: 0,
        deaths: 0,
        peakTiles: 0
      };
      this.board.claimHome(id, home.x, home.y, HOME_RADIUS);
      this.runners.push(runner);
    }

    this.tileCounts = this.board.countTiles(this.runners.length);
    this.syncPeaks();
  }

  /** 렌더 레이어가 연출을 띄우려고 매 프레임 비워 간다. */
  drainEvents(): MatchEvent[] {
    if (this.events.length === 0) {
      return [];
    }
    const drained = this.events;
    this.events = [];
    return drained;
  }

  get human(): Runner {
    return this.runners[0];
  }

  get remainingMs(): number {
    return Math.max(0, this.durationMs - this.elapsedMs);
  }

  /** 진행 중일 때만 시간을 흘린다. 일시정지는 완전 정지다. */
  update(deltaMs: number): void {
    if (this.phase !== "playing") {
      return;
    }

    const dt = Math.min(Math.max(deltaMs, 0), MAX_FRAME_MS);
    this.elapsedMs += dt;

    for (const runner of this.runners) {
      if (!runner.alive) {
        if (this.elapsedMs >= runner.respawnAt) {
          this.respawn(runner);
        }
        continue;
      }

      runner.tickAccMs += dt;
      while (runner.alive && runner.tickAccMs >= runner.tickMs) {
        runner.tickAccMs -= runner.tickMs;
        this.step(runner);
      }
    }

    this.tileSampleAccMs += dt;
    if (this.tileSampleAccMs >= TILE_SAMPLE_MS) {
      this.tileSampleAccMs = 0;
      this.tileCounts = this.board.countTiles(this.runners.length);
      this.syncPeaks();
    }

    if (this.elapsedMs >= this.durationMs) {
      this.finish();
    }
  }

  /**
   * 다음 칸 경계에서 반영될 방향을 예약한다.
   *
   * 180° 전환은 버린다. 한 칸에서는 한 번만 방향을 바꿀 수 있다 — 같은 자리에서
   * 방향 전환을 연달아 보내는 것을 막는 splix의 규칙을 그대로 따른다. 결과적으로
   * 한 칸 안에서는 **먼저 누른 입력이 이긴다**.
   */
  queueDirection(runner: Runner, dir: Direction): void {
    if (!runner.alive) {
      return;
    }
    if (runner.turnedAtX === runner.x && runner.turnedAtY === runner.y) {
      return;
    }
    if (OPPOSITE[runner.dir] === dir || runner.dir === dir) {
      return;
    }
    runner.queuedDir = dir;
    runner.turnedAtX = runner.x;
    runner.turnedAtY = runner.y;
  }

  pause(): void {
    if (this.phase === "playing") {
      this.phase = "paused";
    }
  }

  resume(): void {
    if (this.phase === "paused") {
      this.phase = "playing";
    }
  }

  finish(): void {
    if (this.phase !== "result") {
      this.tileCounts = this.board.countTiles(this.runners.length);
      this.syncPeaks();
      this.phase = "result";
    }
  }

  /** 보간용 진행률(0~1). 렌더가 칸 사이를 부드럽게 잇는 데 쓴다. */
  moveProgress(runner: Runner): number {
    if (!runner.alive) {
      return 1;
    }
    return Math.min(1, runner.tickAccMs / runner.tickMs);
  }

  tilesOf(id: PlayerId): number {
    return this.tileCounts[id] ?? 0;
  }

  shareOf(id: PlayerId): number {
    return this.tilesOf(id) / this.board.playableTiles;
  }

  scoreOf(runner: Runner): number {
    return this.tilesOf(runner.id) + runner.kills * KILL_SCORE;
  }

  standings(): Standing[] {
    return this.runners
      .map<Standing>((runner) => ({
        id: runner.id,
        kind: runner.kind,
        tiles: this.tilesOf(runner.id),
        share: this.shareOf(runner.id),
        kills: runner.kills,
        score: this.scoreOf(runner),
        peakTiles: runner.peakTiles,
        alive: runner.alive
      }))
      .sort((a, b) => b.score - a.score || b.peakTiles - a.peakTiles || a.id - b.id);
  }

  result(): MatchResult {
    const standings = this.standings();
    const playerRank = standings.findIndex((item) => item.kind === "human") + 1;
    const outcome: MatchResult["outcome"] =
      this.human.lives <= 0 ? "lose" : playerRank === 1 ? "win" : "ranked";
    return { outcome, standings, playerRank };
  }

  // --- 시뮬레이션 내부 ---

  private step(runner: Runner): void {
    if (runner.queuedDir && OPPOSITE[runner.dir] !== runner.queuedDir) {
      runner.dir = runner.queuedDir;
    }
    runner.queuedDir = null;

    const delta = DELTA[runner.dir];
    const nextX = runner.x + delta.x;
    const nextY = runner.y + delta.y;

    if (!this.board.isPlayable(nextX, nextY)) {
      this.kill(runner, null);
      return;
    }

    const trailOwner = this.board.trailAt(nextX, nextY);
    if (trailOwner === runner.id) {
      if (!this.isRecentTrail(runner, nextX, nextY)) {
        this.kill(runner, null);
        return;
      }
    } else if (trailOwner !== 0) {
      const victim = this.runners.find((item) => item.id === trailOwner);
      if (victim && victim.alive) {
        this.kill(victim, runner);
      }
    }

    for (const other of this.runners) {
      if (other === runner || !other.alive) {
        continue;
      }
      if (other.x !== nextX || other.y !== nextY) {
        continue;
      }
      if (other.trail.length > 0) {
        this.kill(other, runner);
      }
      if (runner.trail.length > 0) {
        this.kill(runner, other);
        return;
      }
    }

    runner.prevX = runner.x;
    runner.prevY = runner.y;
    runner.x = nextX;
    runner.y = nextY;

    if (this.board.ownerAt(nextX, nextY) === runner.id) {
      if (runner.trail.length > 0) {
        const opponents = this.runners
          .filter((item) => item.alive && item.id !== runner.id)
          .map<Cell>((item) => ({ x: item.x, y: item.y }));
        const gained = this.board.capture(runner.id, runner.trail, opponents);
        runner.trail = [];
        if (gained.length > 0) {
          this.events.push({
            type: "capture",
            id: runner.id,
            cells: gained,
            originX: nextX,
            originY: nextY
          });
        }
        this.tileCounts = this.board.countTiles(this.runners.length);
        this.syncPeaks();
      }
      return;
    }

    runner.trail.push({ x: nextX, y: nextY });
    this.board.markTrail(runner.id, nextX, nextY);
  }

  /**
   * 방금 그린 꼬리 몇 칸은 자기 충돌로 치지 않는다.
   * 이게 없으면 영토를 막 벗어난 직후 자기 꼬리에 걸려 죽는 경우가 생긴다.
   */
  private isRecentTrail(runner: Runner, x: number, y: number): boolean {
    const from = Math.max(0, runner.trail.length - SELF_TRAIL_GRACE);
    for (let i = from; i < runner.trail.length; i += 1) {
      const cell = runner.trail[i];
      if (cell.x === x && cell.y === y) {
        return true;
      }
    }
    return false;
  }

  private kill(runner: Runner, killer: Runner | null): void {
    if (!runner.alive) {
      return;
    }

    this.board.clearTrail(runner.trail);
    runner.trail = [];
    const cleared = this.board.clearPlayer(runner.id);
    this.events.push({
      type: "death",
      id: runner.id,
      killerId: killer ? killer.id : null,
      x: runner.x,
      y: runner.y,
      cells: cleared
    });

    runner.alive = false;
    runner.deaths += 1;
    runner.respawnAt = this.elapsedMs + RESPAWN_DELAY_MS;
    runner.tickAccMs = 0;

    if (killer && killer.id !== runner.id) {
      killer.kills += 1;
    }

    this.tileCounts = this.board.countTiles(this.runners.length);

    if (runner.kind === "human") {
      runner.lives -= 1;
      if (runner.lives <= 0) {
        this.finish();
      }
    }
  }

  private respawn(runner: Runner): void {
    if (runner.kind === "human" && runner.lives <= 0) {
      return;
    }

    const home = this.findSpawn();
    this.board.claimHome(runner.id, home.x, home.y, HOME_RADIUS);

    runner.x = home.x;
    runner.y = home.y;
    runner.prevX = home.x;
    runner.prevY = home.y;
    runner.dir = this.spawnDirection(home);
    runner.queuedDir = null;
    runner.turnedAtX = -1;
    runner.turnedAtY = -1;
    runner.trail = [];
    runner.alive = true;
    runner.tickAccMs = 0;

    this.tileCounts = this.board.countTiles(this.runners.length);
  }

  /** 네 구역에 고르게 배치한 시작 지점. 슬롯 수가 3이면 세 구역만 쓴다. */
  private homeAnchors(count: number): Cell[] {
    const low = WALL_THICKNESS + HOME_RADIUS + 1;
    const high = BOARD_SIZE - WALL_THICKNESS - HOME_RADIUS - 2;
    const near = Math.round(low + (high - low) * 0.22);
    const far = Math.round(low + (high - low) * 0.78);
    const quadrants: Cell[] = [
      { x: near, y: far },
      { x: far, y: near },
      { x: far, y: far },
      { x: near, y: near }
    ];
    return quadrants.slice(0, count);
  }

  /** 가장 가까운 벽의 반대쪽을 향해 출발한다. 스폰 직후 벽에 박히지 않게 하는 규칙. */
  private spawnDirection(from: Cell): Direction {
    const low = WALL_THICKNESS;
    const high = BOARD_SIZE - WALL_THICKNESS - 1;
    const gaps: Array<{ dir: Direction; gap: number }> = [
      { dir: "down", gap: from.y - low },
      { dir: "up", gap: high - from.y },
      { dir: "right", gap: from.x - low },
      { dir: "left", gap: high - from.x }
    ];
    // gap 이 가장 작은 쪽이 가장 가까운 벽이고, 그 항목의 dir 이 이미 반대 방향이다.
    return gaps.reduce((best, item) => (item.gap < best.gap ? item : best)).dir;
  }

  /**
   * 빈 `5 × 5` 영역을 찾는다. 세 단계로 조건을 완화해서, 보드가 꽉 차 있어도
   * 반드시 자리를 하나 돌려준다.
   */
  private findSpawn(): Cell {
    const low = WALL_THICKNESS + HOME_RADIUS;
    const high = BOARD_SIZE - WALL_THICKNESS - HOME_RADIUS - 1;
    const span = high - low;
    const passes = [
      { attempts: 120, requireEmpty: true, minDistance: 10 },
      { attempts: 120, requireEmpty: true, minDistance: 0 },
      { attempts: 120, requireEmpty: false, minDistance: 0 }
    ];

    for (const pass of passes) {
      for (let i = 0; i < pass.attempts; i += 1) {
        const x = low + Math.floor(this.rng() * (span + 1));
        const y = low + Math.floor(this.rng() * (span + 1));

        if (pass.requireEmpty && !this.isAreaEmpty(x, y)) {
          continue;
        }
        if (pass.minDistance > 0 && !this.isFarFromRunners(x, y, pass.minDistance)) {
          continue;
        }
        return { x, y };
      }
    }

    return { x: Math.floor(BOARD_SIZE / 2), y: Math.floor(BOARD_SIZE / 2) };
  }

  private isAreaEmpty(centerX: number, centerY: number): boolean {
    for (let y = centerY - HOME_RADIUS; y <= centerY + HOME_RADIUS; y += 1) {
      for (let x = centerX - HOME_RADIUS; x <= centerX + HOME_RADIUS; x += 1) {
        if (!this.board.isPlayable(x, y)) {
          return false;
        }
        if (this.board.ownerAt(x, y) !== 0 || this.board.trailAt(x, y) !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  private isFarFromRunners(x: number, y: number, minDistance: number): boolean {
    return this.runners.every(
      (runner) => !runner.alive || Math.abs(runner.x - x) + Math.abs(runner.y - y) >= minDistance
    );
  }

  private syncPeaks(): void {
    for (const runner of this.runners) {
      const tiles = this.tilesOf(runner.id);
      if (tiles > runner.peakTiles) {
        runner.peakTiles = tiles;
      }
    }
  }
}
