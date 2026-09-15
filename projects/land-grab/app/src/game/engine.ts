import { Board, MAX_OWNER_ID } from "./board";
import {
  HOME_RADIUS,
  LEADERBOARD_SIZE,
  MATCH_DURATION_MS,
  MAX_PLAYERS,
  PARTY_BOARD_SIZE,
  WORLD_BOARD_SIZE,
  WORLD_BOTS,
  WORLD_VIEW_TILES,
  playerStyle,
  PLAYER_KEYS,
  captureMultiplier,
  PLAYER_LIVES,
  PLAYER_TICK_MS,
  RESPAWN_DELAY_MS,
  SELF_TRAIL_GRACE,
  WALL_THICKNESS,
  DEFAULT_RULES,
  type Difficulty,
  type GameMode,
  type MatchRules
} from "./config";
import {
  DELTA,
  OPPOSITE,
  type Cell,
  type Direction,
  type PlayerId,
  type MatchPhase,
  type Runner,
  type RunnerKind,
  type Standing
} from "./types";

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
  | {
      type: "death";
      id: PlayerId;
      killerId: PlayerId | null;
      /** 죽인 쪽이 받은 점수. 킬이 아니면 `0`. 연출이 이 숫자를 띄운다. */
      awardedScore: number;
      x: number;
      y: number;
      cells: Cell[];
    };

export type MatchResult = {
  outcome: "win" | "lose" | "ranked";
  standings: Standing[];
  /** 1번 자리(싱글이면 나) 의 순위. */
  playerRank: number;
  winner: Standing;
  humans: number;
  mode: GameMode;
  /** 세계 모드에서는 생존 시간이다. */
  elapsedMs: number;
  /** 전체 참가자 수. */
  players: number;
};

export type MatchOptions = {
  /** `party` 는 작은 보드·90초·한 화면 멀티, `world` 는 큰 보드·끝없음·봇 다수. */
  mode?: GameMode;
  seed?: number;
  /** 켜고 끌 수 있는 실험 규칙. 근거는 `docs/design/differentiation.md`. */
  rules?: Partial<MatchRules>;
  /** 한 화면에서 함께 플레이하는 사람 수 (1~4). */
  humans?: number;
  /**
   * 판이 참가자보다 오래 사는가. 서버가 도는 세계가 여기 해당한다.
   *
   * 켜면 사람이 죽어도 판이 끝나지 않는다. 죽은 사람은 `removeRunner` 로 자리를
   * 비우고 새로 들어온다 — 로컬 판에서는 "내 판이 끝났다"가 맞지만, 공유 세계에서
   * 한 명의 죽음이 세계를 끝내면 나머지 접속자의 판이 같이 사라진다.
   */
  shared?: boolean;
};

export class Match {
  readonly board: Board;
  readonly runners: Runner[];
  readonly mode: GameMode;
  /** 세계 모드는 끝이 없다. `Infinity`. */
  readonly durationMs: number;
  readonly difficulty: Difficulty;

  phase: MatchPhase = "playing";
  elapsedMs = 0;

  private readonly rng: () => number;
  private tileCounts: number[];
  private tileSampleAccMs = 0;
  private events: MatchEvent[] = [];
  readonly rules: MatchRules;
  /** 한 화면에서 함께 하는 사람 수. 1이면 기존 싱글 플레이. */
  readonly humans: number;
  /** 참가자보다 오래 사는 판인가. 서버 세계면 true. */
  readonly shared: boolean;

  constructor(difficulty: Difficulty, options: MatchOptions = {}) {
    const { mode = "party", seed = Date.now(), rules = {}, humans = 1, shared = false } = options;

    this.mode = mode;
    this.shared = shared;
    this.rules = { ...DEFAULT_RULES, ...rules };
    // 큰 맵은 카메라가 따라다녀야 해서 한 화면 멀티와 양립하지 않는다.
    // 공유 세계는 사람 없이 시작한다 — 접속이 들어올 때 `addRunner` 로 자리를 연다.
    this.humans =
      mode === "world"
        ? shared
          ? 0
          : 1
        : Math.min(MAX_PLAYERS, Math.max(1, Math.floor(humans)));
    this.durationMs = mode === "world" ? Number.POSITIVE_INFINITY : MATCH_DURATION_MS;
    this.difficulty = difficulty;
    this.rng = mulberry32(seed);
    this.board = new Board(mode === "world" ? WORLD_BOARD_SIZE : PARTY_BOARD_SIZE);

    // 혼자면 난이도가 AI 수를 정한다. 둘 이상이면 빈 자리를 AI 로 채워 항상 4명이 된다.
    // 세계 모드는 봇으로 가득 채운다 — io 게임은 상대가 늘 어딘가에 있어야 한다.
    const total =
      mode === "world" ? WORLD_BOTS + this.humans : this.humans === 1 ? difficulty.aiCount + 1 : MAX_PLAYERS;
    this.runners = [];

    const homes = this.homeAnchors(total);
    for (let slot = 0; slot < total; slot += 1) {
      const id = (slot + 1) as PlayerId;
      this.spawnRunner(id, slot < this.humans ? "human" : "ai", homes[slot]);
    }

    this.tileCounts = this.board.countTiles(this.countPlayers());
    this.syncPeaks();
  }

  /**
   * 판이 도는 중에 자리를 하나 더 연다. 서버가 접속을 받거나 빈 세계를 봇으로
   * 채울 때 쓴다. 번호는 **비어 있는 가장 작은 값을 재사용한다** — 소유자 코드가
   * 1바이트라 번호를 계속 늘려 나갈 수 없다.
   *
   * @returns 자리가 없으면 `null`.
   */
  addRunner(kind: RunnerKind, tickMs?: number): Runner | null {
    const id = this.freeId();
    if (id === null) {
      return null;
    }
    const runner = this.spawnRunner(id, kind, this.findSpawn());
    if (tickMs !== undefined) {
      runner.tickMs = tickMs;
    }
    this.tileCounts = this.board.countTiles(this.countPlayers());
    this.syncPeaks();
    return runner;
  }

  /**
   * 자리를 비운다. 남긴 땅과 꼬리는 그 자리에서 중립으로 돌아간다.
   * 접속이 끊기거나, 공유 세계에서 죽은 사람을 내보낼 때 쓴다.
   */
  removeRunner(id: PlayerId): boolean {
    const index = this.runners.findIndex((item) => item.id === id);
    if (index < 0) {
      return false;
    }
    const [runner] = this.runners.splice(index, 1);
    this.board.clearTrail(runner.trail);
    runner.trail = [];
    this.board.clearPlayer(id);
    this.tileCounts = this.board.countTiles(this.countPlayers());
    return true;
  }

  private spawnRunner(id: PlayerId, kind: RunnerKind, home: Cell): Runner {
    const isHuman = kind === "human";
    const runner: Runner = {
      id,
      kind: isHuman ? "human" : "ai",
      alive: true,
      respawnAt: 0,
      x: home.x,
      y: home.y,
      prevX: home.x,
      prevY: home.y,
      homeX: home.x,
      homeY: home.y,
      dir: this.spawnDirection(home),
      queuedDir: null,
      turnedAtX: -1,
      turnedAtY: -1,
      trail: [],
      tickMs: isHuman ? PLAYER_TICK_MS : this.difficulty.aiTickMs,
      tickAccMs: 0,
      // 여럿이 하면 아무도 중간에 탈락하지 않는다. 한 명이 목숨을 잃어서
      // 판이 끝나 버리면 나머지 사람들의 90초가 사라진다.
      // 세계 모드는 io 문법 그대로 — 목숨 없이, 죽으면 그 판이 끝난다.
      lives: isHuman && this.mode === "party" && this.humans === 1 ? PLAYER_LIVES : Number.POSITIVE_INFINITY,
      kills: 0,
      deaths: 0,
      bonusPoints: 0,
      bestCapture: 0,
      peakTiles: 0
    };
    this.board.claimHome(id, home.x, home.y, HOME_RADIUS);
    this.runners.push(runner);
    return runner;
  }

  /** 쓰이지 않는 가장 작은 번호. 전부 찼으면 `null`. */
  private freeId(): PlayerId | null {
    const taken = new Set<number>(this.runners.map((item) => item.id));
    for (let id = 1; id <= MAX_OWNER_ID; id += 1) {
      if (!taken.has(id)) {
        return id as PlayerId;
      }
    }
    return null;
  }

  /**
   * `countTiles` 에 넘길 상한. 번호를 재사용하면 참가자 수와 최대 번호가
   * 어긋나므로 둘 중 큰 값을 쓴다.
   */
  private countPlayers(): number {
    let max = this.runners.length;
    for (const runner of this.runners) {
      if (runner.id > max) {
        max = runner.id;
      }
    }
    return max;
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

  /** 1번 자리. 싱글 플레이의 "나"이고, 테스트 훅이 보는 대상이다. */
  get human(): Runner {
    return this.runners[0];
  }

  /** 화면에 보여 줄 타일 수(가로). 보드보다 크면 보드 전체가 보인다. */
  get viewTiles(): number {
    return this.mode === "world" ? WORLD_VIEW_TILES : this.board.size;
  }

  /** 화면에 보여 줄 이름. */
  labelOf(runner: Runner): string {
    if (runner.kind !== "human") {
      return this.mode === "world"
        ? `봇 ${playerStyle(runner.id).name}${runner.id}`
        : `AI ${playerStyle(runner.id).name}`;
    }
    if (this.humans === 1) {
      return "나";
    }
    return PLAYER_KEYS[runner.id - 1]?.label ?? `P${runner.id}`;
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
      this.tileCounts = this.board.countTiles(this.countPlayers());
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
      this.tileCounts = this.board.countTiles(this.countPlayers());
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

  /**
   * 점수 = 지금 가진 땅 + 물막이 배율로 쌓은 보너스 + 킬.
   *
   * 보너스는 사망해도 남는다. 죽으면 땅을 전부 잃는 규칙은 그대로라,
   * "크게 한 번 걸어서 확정 성과를 은행에 넣는다"는 선택지를 만들기 위한 예외다.
   */
  scoreOf(runner: Runner): number {
    return this.tilesOf(runner.id) + runner.bonusPoints + runner.kills * this.rules.killScore;
  }

  standings(): Standing[] {
    return this.runners
      .map<Standing>((runner) => ({
        id: runner.id,
        kind: runner.kind,
        label: this.labelOf(runner),
        tiles: this.tilesOf(runner.id),
        share: this.shareOf(runner.id),
        kills: runner.kills,
        score: this.scoreOf(runner),
        peakTiles: runner.peakTiles,
        bonusPoints: runner.bonusPoints,
        bestCapture: runner.bestCapture,
        alive: runner.alive
      }))
      .sort((a, b) => b.score - a.score || b.peakTiles - a.peakTiles || a.id - b.id);
  }

  /** 상위 몇 명만. 참가자가 많은 세계 모드에서 화면에 쓰는 목록이다. */
  leaderboard(limit = LEADERBOARD_SIZE): Standing[] {
    return this.standings().slice(0, limit);
  }

  result(): MatchResult {
    const standings = this.standings();
    const playerRank = standings.findIndex((item) => item.id === this.human.id) + 1;
    const outcome: MatchResult["outcome"] =
      this.humans > 1
        ? "ranked"
        : this.human.lives <= 0
          ? "lose"
          : playerRank === 1
            ? "win"
            : "ranked";
    return {
      outcome,
      standings,
      playerRank,
      winner: standings[0],
      humans: this.humans,
      mode: this.mode,
      elapsedMs: this.elapsedMs,
      players: this.runners.length
    };
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
      runner.homeX = nextX;
      runner.homeY = nextY;
      if (runner.trail.length > 0) {
        const opponents = this.runners
          .filter((item) => item.alive && item.id !== runner.id)
          .map<Cell>((item) => ({ x: item.x, y: item.y }));
        const gained = this.board.capture(runner.id, runner.trail, opponents, this.elapsedMs);
        runner.trail = [];

        if (gained.length > runner.bestCapture) {
          runner.bestCapture = gained.length;
        }
        if (this.rules.captureBonus) {
          const multiplier = captureMultiplier(gained.length);
          runner.bonusPoints += Math.round(gained.length * (multiplier - 1));
        }

        if (gained.length > 0) {
          this.events.push({
            type: "capture",
            id: runner.id,
            cells: gained,
            originX: nextX,
            originY: nextY
          });
        }
        this.tileCounts = this.board.countTiles(this.countPlayers());
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
    const lockUntil =
      this.rules.rubbleLockMs > 0 ? this.elapsedMs + this.rules.rubbleLockMs : 0;
    const cleared = this.board.clearPlayer(runner.id, lockUntil);
    this.events.push({
      type: "death",
      id: runner.id,
      killerId: killer ? killer.id : null,
      awardedScore: killer && killer.id !== runner.id ? this.rules.killScore : 0,
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

    this.tileCounts = this.board.countTiles(this.countPlayers());

    // 공유 세계에서는 서버가 죽은 사람을 내보내고 판은 계속 돈다.
    if (runner.kind === "human" && !this.shared) {
      if (this.mode === "world") {
        // io 문법: 목숨이 없다. 죽으면 그 판이 끝나고 새로 들어간다.
        this.finish();
      } else {
        runner.lives -= 1;
        if (runner.lives <= 0) {
          this.finish();
        }
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
    runner.homeX = home.x;
    runner.homeY = home.y;
    runner.dir = this.spawnDirection(home);
    runner.queuedDir = null;
    runner.turnedAtX = -1;
    runner.turnedAtY = -1;
    runner.trail = [];
    runner.alive = true;
    runner.tickAccMs = 0;

    this.tileCounts = this.board.countTiles(this.countPlayers());
  }

  /**
   * 시작 지점. 파티 모드는 네 구역에 고르게, 세계 모드는 넓게 흩뿌린다.
   * 흩뿌릴 때는 서로 최소 거리를 두되, 못 찾으면 그냥 아무 데나 둔다 —
   * 자리를 못 잡아 게임이 시작되지 않는 편이 훨씬 나쁘다.
   */
  private homeAnchors(count: number): Cell[] {
    const size = this.board.size;
    const low = WALL_THICKNESS + HOME_RADIUS + 1;
    const high = size - WALL_THICKNESS - HOME_RADIUS - 2;

    if (this.mode === "party") {
      const near = Math.round(low + (high - low) * 0.22);
      const far = Math.round(low + (high - low) * 0.78);
      return [
        { x: near, y: far },
        { x: far, y: near },
        { x: far, y: far },
        { x: near, y: near }
      ].slice(0, count);
    }

    const span = high - low;
    const minDistance = Math.floor(size / Math.sqrt(count) / 1.6);
    const anchors: Cell[] = [];

    for (let i = 0; i < count; i += 1) {
      let picked: Cell | null = null;
      for (let attempt = 0; attempt < 200 && !picked; attempt += 1) {
        const x = low + Math.floor(this.rng() * (span + 1));
        const y = low + Math.floor(this.rng() * (span + 1));
        const clear = anchors.every(
          (other) => Math.abs(other.x - x) + Math.abs(other.y - y) >= minDistance
        );
        if (clear) {
          picked = { x, y };
        }
      }
      anchors.push(
        picked ?? {
          x: low + Math.floor(this.rng() * (span + 1)),
          y: low + Math.floor(this.rng() * (span + 1))
        }
      );
    }

    return anchors;
  }

  /** 가장 가까운 벽의 반대쪽을 향해 출발한다. 스폰 직후 벽에 박히지 않게 하는 규칙. */
  private spawnDirection(from: Cell): Direction {
    const low = WALL_THICKNESS;
    const high = this.board.size - WALL_THICKNESS - 1;
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
    const high = this.board.size - WALL_THICKNESS - HOME_RADIUS - 1;
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

    return { x: Math.floor(this.board.size / 2), y: Math.floor(this.board.size / 2) };
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
        if (this.board.isLocked(x, y, this.elapsedMs)) {
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
