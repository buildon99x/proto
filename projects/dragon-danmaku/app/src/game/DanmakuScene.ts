// 탄막 슈팅 코어 엔진 — Phaser Scene 1개에 전 시뮬레이션(플레이어/적/탄막/보스/연환/봄/각성).
// React는 화면 전환·HUD만 담당하고, 인게임 로직은 전부 여기서 돈다.

import Phaser from "phaser";
import { MAX_POWER, STAGES } from "../data";
import { computeEarnedScales } from "../meta";
import type { HudSnapshot, RunConfig, RunResult } from "../types";

export const GAME_W = 480;
export const GAME_H = 720;

export interface SceneHooks {
  onHud: (snap: HudSnapshot) => void;
  onContinuePrompt: () => void;
  onStageBanner: (text: string) => void;
  onFinish: (result: RunResult, bossName: string) => void;
}

interface EBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alive: boolean;
}

interface PBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  homing: boolean;
  alive: boolean;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  r: number;
  fireT: number;
  fireInterval: number;
  scoreVal: number;
  drops: "none" | "power" | "scale";
  alive: boolean;
}

interface Pickup {
  x: number;
  y: number;
  vy: number;
  kind: "power" | "scale";
  alive: boolean;
}

interface Effect {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: number;
  alive: boolean;
}

interface Boss {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  r: number;
  t: number;
  patternT: number;
  pattern: number;
  spin: number;
  alive: boolean;
  name: string;
  isTrueBoss: boolean;
}

type Mode = "play" | "continue" | "done";

export class DanmakuScene extends Phaser.Scene {
  // 외부에서 부팅 전에 주입.
  config!: RunConfig;
  hooks!: SceneHooks;

  private gfx!: Phaser.GameObjects.Graphics;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    focus: Phaser.Input.Keyboard.Key;
    focus2: Phaser.Input.Keyboard.Key;
    bomb: Phaser.Input.Keyboard.Key;
    awaken: Phaser.Input.Keyboard.Key;
  };

  // 입력 플래그(키보드+DOM 버튼 공용).
  private btnLaser = false;
  private bombEdge = false;
  private awakenEdge = false;

  // 포인터(모바일/드래그 이동).
  private pointerActive = false;
  private pointerX = GAME_W / 2;
  private pointerY = GAME_H - 120;

  // 플레이어 상태.
  private px = GAME_W / 2;
  private py = GAME_H - 120;
  private hitR = 3.6;
  private invuln = 0;
  private shotT = 0;

  // 런 상태.
  private mode: Mode = "play";
  private paused = false;
  private score = 0;
  private chain = 0;
  private chainTimer = 0;
  private bestChain = 0;
  private lives = 2;
  private bombs = 2;
  private power = 2;
  private options = 0;
  private awakenGauge = 0; // 0..1
  private awakening = false;
  private awakenTimer = 0;
  private hiddenScales = 0;
  private noMiss = true;
  private noBomb = true;
  private noContinue = true;

  // 스테이지/웨이브.
  private stageIndex = 0;
  private firstStage = 0;
  private practice = false;
  private wavesSpawned = 0;
  private waveTimer = 0;
  private waveInterval = 2.2;
  private stagePhase: "waves" | "boss" | "clearing" = "waves";

  // 엔티티.
  private ebullets: EBullet[] = [];
  private pbullets: PBullet[] = [];
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private effects: Effect[] = [];
  private boss: Boss | null = null;

  private hudClock = 0;

  constructor() {
    super("danmaku");
  }

  create(): void {
    this.gfx = this.add.graphics();

    const kb = this.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: kb.addKey(KC.UP),
      down: kb.addKey(KC.DOWN),
      left: kb.addKey(KC.LEFT),
      right: kb.addKey(KC.RIGHT),
      w: kb.addKey(KC.W),
      a: kb.addKey(KC.A),
      s: kb.addKey(KC.S),
      d: kb.addKey(KC.D),
      focus: kb.addKey(KC.SHIFT),
      focus2: kb.addKey(KC.C),
      bomb: kb.addKey(KC.X),
      awaken: kb.addKey(KC.SPACE)
    };
    // 게임 입력 키가 페이지 스크롤을 유발하지 않도록.
    kb.disableGlobalCapture();

    // 봄/각성은 에지 액션 — 프레임 폴링은 빠른 탭을 놓칠 수 있어 keydown 이벤트로 래치.
    this.keys.bomb.on("down", () => {
      this.bombEdge = true;
    });
    this.keys.awaken.on("down", () => {
      this.awakenEdge = true;
    });

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.pointerActive = true;
      this.pointerX = p.x;
      this.pointerY = p.y;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        this.pointerActive = true;
        this.pointerX = p.x;
        this.pointerY = p.y;
      }
    });
    this.input.on("pointerup", () => {
      this.pointerActive = false;
    });

    // 런 초기화.
    const up = this.config.upgrades;
    const isNox = this.config.dragon.id === "nox";
    this.lives = (isNox ? 1 : 2) + up.startLives;
    this.bombs = (isNox ? 1 : 2) + up.bombs;
    this.options = up.options;
    this.power = 2;
    this.firstStage = this.config.practiceStage ?? 0;
    this.practice = this.config.practiceStage !== undefined;
    this.loadStage(this.firstStage);
  }

  // ── 외부(React) 제어 API ───────────────────────────────────
  setPaused(p: boolean): void {
    this.paused = p;
  }
  setLaserBtn(on: boolean): void {
    this.btnLaser = on;
  }
  pressBomb(): void {
    this.bombEdge = true;
  }
  pressAwaken(): void {
    this.awakenEdge = true;
  }
  doContinue(): void {
    if (this.mode !== "continue") return;
    this.noContinue = false;
    this.score = Math.floor(this.score * 0.7);
    const isNox = this.config.dragon.id === "nox";
    this.lives = (isNox ? 1 : 2) + this.config.upgrades.startLives;
    this.bombs = (isNox ? 1 : 2) + this.config.upgrades.bombs;
    this.power = Math.max(2, this.power);
    this.invuln = 150;
    this.clearEnemyBullets(false);
    this.mode = "play";
  }
  declineContinue(): void {
    if (this.mode !== "continue") return;
    this.finish(false, false);
  }
  giveUp(): void {
    if (this.mode === "done") return;
    this.finish(false, false);
  }

  // ── 스테이지 로딩 ──────────────────────────────────────────
  private loadStage(index: number): void {
    this.stageIndex = index;
    this.wavesSpawned = 0;
    this.waveTimer = 0.6;
    this.stagePhase = "waves";
    this.boss = null;
    const def = STAGES[index];
    this.waveInterval = Math.max(1.4, 2.4 - index * 0.12);
    this.hooks.onStageBanner(`${def.stage}  ${def.name}`);
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  update(_time: number, delta: number): void {
    if (this.paused || this.mode !== "play") {
      this.render();
      this.pushHud();
      return;
    }
    const f = Math.min(delta / 16.667, 2.5); // 프레임 보정(60fps 기준).
    const dt = Math.min(delta / 1000, 0.05);

    this.handleInput(f, dt);
    this.updatePlayerWeapons(f, dt);
    this.updateEnemies(f, dt);
    this.updateBoss(f, dt);
    this.updateBullets(f);
    this.updatePickups(f);
    this.updateEffects(f);
    this.updateChain(dt);
    this.updateAwaken(dt);
    this.spawnLogic(dt);
    this.checkCollisions();

    if (this.invuln > 0) this.invuln -= f;

    this.render();

    this.hudClock += delta;
    if (this.hudClock >= 50) {
      this.hudClock = 0;
      this.pushHud();
    }
  }

  // ── 입력 → 이동 + 봄/각성 ──────────────────────────────────
  private handleInput(f: number, _dt: number): void {
    const k = this.keys;
    const focusKey = k.focus.isDown || k.focus2.isDown || this.btnLaser;
    const dragon = this.config.dragon;
    const speed = dragon.speed * (focusKey ? 0.45 : 1) * f;

    let dx = 0;
    let dy = 0;
    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      this.px += (dx / len) * speed;
      this.py += (dy / len) * speed;
      this.pointerActive = false;
    } else if (this.pointerActive) {
      // 포인터 추종(드래그 이동).
      const tx = this.pointerX - this.px;
      const ty = this.pointerY - this.py;
      const dist = Math.hypot(tx, ty);
      if (dist > 1) {
        const step = Math.min(dist, speed * 1.6);
        this.px += (tx / dist) * step;
        this.py += (ty / dist) * step;
      }
    }
    this.px = Phaser.Math.Clamp(this.px, 12, GAME_W - 12);
    this.py = Phaser.Math.Clamp(this.py, 12, GAME_H - 12);

    // 봄/각성(에지) — keydown 이벤트(키보드)·DOM 버튼이 모두 bombEdge/awakenEdge로 모임.
    if (this.bombEdge) this.triggerBomb(false);
    this.bombEdge = false;
    if (this.awakenEdge) this.triggerAwaken();
    this.awakenEdge = false;
  }

  // ── 플레이어 무기(샷/레이저) ───────────────────────────────
  private updatePlayerWeapons(f: number, dt: number): void {
    const dragon = this.config.dragon;
    const k = this.keys;
    const laser = k.focus.isDown || k.focus2.isDown || this.btnLaser;
    this.shotT -= f;

    if (laser) {
      // 레이저: 플레이어 위쪽 컬럼 적/보스에 지속 대미지.
      const dps = dragon.laserDps * (this.awakening ? 1.7 : 1) * (1 + (this.power - 1) * 0.12);
      const half = 11 + this.power * 1.5;
      this.applyLaser(this.px, half, dps * dt);
    } else if (this.shotT <= 0) {
      this.shotT = this.awakening ? 4 : 6;
      this.fireShot();
    }
  }

  private fireShot(): void {
    const dragon = this.config.dragon;
    const streams = dragon.shotCount + Math.floor((this.power - 1) * 0.6) + this.options;
    const spread = dragon.shotSpread + this.power * 2;
    const dmg = dragon.shotPower * (this.awakening ? 1.6 : 1) * (1 + (this.power - 1) * 0.15);
    const half = streams <= 1 ? 0 : spread / 2;
    for (let i = 0; i < streams; i++) {
      const t = streams <= 1 ? 0.5 : i / (streams - 1);
      const angDeg = -90 + (-half + spread * t);
      const ang = Phaser.Math.DegToRad(angDeg);
      this.pbullets.push({
        x: this.px,
        y: this.py - 10,
        vx: Math.cos(ang) * 9,
        vy: Math.sin(ang) * 9,
        dmg,
        homing: dragon.homing,
        alive: true
      });
    }
  }

  private applyLaser(x: number, halfW: number, dmg: number): void {
    for (const e of this.enemies) {
      if (e.alive && Math.abs(e.x - x) < halfW + e.r && e.y < this.py) {
        e.hp -= dmg;
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
    const b = this.boss;
    if (b && b.alive && Math.abs(b.x - x) < halfW + b.r) {
      b.hp -= dmg;
      if (b.hp <= 0) this.killBoss();
    }
  }

  // ── 봄(포효) / 각성(광룡화) ────────────────────────────────
  private triggerBomb(auto: boolean): void {
    if (this.bombs <= 0) return;
    this.bombs -= 1;
    if (!auto) this.noBomb = false;
    this.invuln = Math.max(this.invuln, 120);
    // 화면 탄막 → 점수.
    this.clearEnemyBullets(true);
    // 전체 대미지.
    const dmg = 80;
    for (const e of this.enemies) {
      if (e.alive) {
        e.hp -= dmg;
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
    if (this.boss && this.boss.alive) {
      this.boss.hp -= dmg * 1.5;
      if (this.boss.hp <= 0) this.killBoss();
    }
    this.effects.push({ x: this.px, y: this.py, r: 10, maxR: 520, color: 0xfff0b0, alive: true });
  }

  private triggerAwaken(): void {
    if (this.awakening || this.awakenGauge < 1) return;
    this.awakening = true;
    this.awakenTimer = 9;
    this.awakenGauge = 0;
    this.clearEnemyBullets(true);
    this.effects.push({ x: this.px, y: this.py, r: 10, maxR: 380, color: 0xbfe8ff, alive: true });
  }

  private updateAwaken(dt: number): void {
    if (this.awakening) {
      this.awakenTimer -= dt;
      if (this.awakenTimer <= 0) this.awakening = false;
    }
  }

  private clearEnemyBullets(score: boolean): void {
    let n = 0;
    for (const b of this.ebullets) {
      if (b.alive) {
        b.alive = false;
        n++;
      }
    }
    if (score && n > 0) this.addScore(n * 20);
  }

  // ── 적/웨이브 ──────────────────────────────────────────────
  private spawnLogic(dt: number): void {
    if (this.mode !== "play") return;
    const def = STAGES[this.stageIndex];

    if (this.stagePhase === "waves") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && this.wavesSpawned < def.waveCount) {
        this.waveTimer = this.waveInterval;
        this.spawnWave(def, this.wavesSpawned);
        this.wavesSpawned += 1;
      }
      if (this.wavesSpawned >= def.waveCount && this.enemies.every((e) => !e.alive)) {
        this.spawnBoss(def);
        this.stagePhase = "boss";
      }
    }
  }

  private spawnWave(def: { enemyHp: number; enemyScore: number; bulletSpeed: number }, waveNo: number): void {
    const diff = this.config.difficulty;
    const count = 5 + Math.min(4, waveNo);
    const formation = waveNo % 3; // 0:가로열 1:V 2:측면
    for (let i = 0; i < count; i++) {
      let sx: number;
      let sy: number;
      let vx: number;
      let vy: number;
      if (formation === 0) {
        sx = (GAME_W / (count + 1)) * (i + 1);
        sy = -20 - i * 4;
        vx = 0;
        vy = 1.1;
      } else if (formation === 1) {
        sx = GAME_W / 2 + (i - count / 2) * 34;
        sy = -20 - Math.abs(i - count / 2) * 14;
        vx = 0;
        vy = 1.2;
      } else {
        const left = i % 2 === 0;
        sx = left ? -20 : GAME_W + 20;
        sy = 60 + i * 22;
        vx = left ? 1.0 : -1.0;
        vy = 0.35;
      }
      const isCarrier = waveNo >= 2 && i === Math.floor(count / 2);
      this.enemies.push({
        x: sx,
        y: sy,
        vx,
        vy,
        hp: def.enemyHp * (isCarrier ? 2.4 : 1),
        r: isCarrier ? 16 : 12,
        fireT: 0.6 + Math.random() * 0.8,
        fireInterval: (1.3 + Math.random() * 0.8) / diff.fireRateMul,
        scoreVal: def.enemyScore * (isCarrier ? 3 : 1),
        drops: isCarrier ? "scale" : i % 4 === 0 ? "power" : "none",
        alive: true
      });
    }
  }

  private updateEnemies(f: number, dt: number): void {
    const def = STAGES[this.stageIndex];
    const diff = this.config.difficulty;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.x += e.vx * f;
      e.y += e.vy * f;
      // 화면 진입 후 정지 비행(가로열/ V)
      if (e.vy > 0 && e.y > 90 + (e.r > 14 ? 30 : 0)) e.vy *= 0.92;
      if (e.x < -40 || e.x > GAME_W + 40 || e.y > GAME_H + 40) e.alive = false;

      e.fireT -= dt;
      if (e.fireT <= 0 && e.y > 0 && e.y < GAME_H * 0.7 && this.mode === "play") {
        e.fireT = e.fireInterval;
        this.fireAimed(e.x, e.y, def.bulletSpeed * diff.bulletSpeedMul, e.r > 14 ? 3 : 1);
      }
    }
    // 사망 정리.
    this.enemies = this.enemies.filter((e) => e.alive || false);
  }

  private fireAimed(x: number, y: number, speed: number, spreadN: number): void {
    const baseAng = Math.atan2(this.py - y, this.px - x);
    const half = spreadN <= 1 ? 0 : 0.22 * (spreadN - 1);
    for (let i = 0; i < spreadN; i++) {
      const t = spreadN <= 1 ? 0 : (i / (spreadN - 1)) * 2 - 1;
      const ang = baseAng + t * half;
      this.ebullets.push({
        x,
        y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: 5,
        alive: true
      });
    }
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    this.registerKill(e.x, e.y, e.scoreVal);
    if (e.drops === "power") this.pickups.push({ x: e.x, y: e.y, vy: 1.0, kind: "power", alive: true });
    if (e.drops === "scale") this.pickups.push({ x: e.x, y: e.y, vy: 0.9, kind: "scale", alive: true });
  }

  private registerKill(x: number, y: number, baseScore: number): void {
    // 근접 격파 보너스(암흑룡).
    const closeBonus = this.config.dragon.closeKillBonus;
    if (closeBonus > 0 && Math.hypot(x - this.px, y - this.py) < 120) {
      this.chain += closeBonus;
    }
    this.chain += 1;
    this.chainTimer = 1.0;
    if (this.chain > this.bestChain) this.bestChain = this.chain;
    this.addScore(baseScore);
    this.awakenGauge = Math.min(1, this.awakenGauge + 0.035 * (1 + 0.12 * this.config.upgrades.awaken));
    this.effects.push({ x, y, r: 4, maxR: 26, color: 0xffd56a, alive: true });
  }

  private addScore(base: number): void {
    const diff = this.config.difficulty;
    const mul = this.chainMultiplier();
    const aw = this.awakening ? 2 : 1;
    this.score += Math.floor(base * mul * aw * diff.scoreMul);
  }

  private chainMultiplier(): number {
    const raw = 1 + Math.floor(this.chain / 10) * 0.1;
    return Math.min(raw, this.config.difficulty.chainCap);
  }

  private updateChain(dt: number): void {
    if (this.chain > 0) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) this.chain = 0;
    }
  }

  // ── 보스 ──────────────────────────────────────────────────
  private spawnBoss(def: { bossHp: number; bossName: string; bossIntensity: number }, trueBoss = false): void {
    this.boss = {
      x: GAME_W / 2,
      y: -60,
      hp: def.bossHp,
      maxHp: def.bossHp,
      r: 30,
      t: 0,
      patternT: 0,
      pattern: 0,
      spin: 0,
      alive: true,
      name: def.bossName,
      isTrueBoss: trueBoss
    };
    this.hooks.onStageBanner(trueBoss ? `심연 · 진 최종보스  ${def.bossName}` : `BOSS  ${def.bossName}`);
  }

  private updateBoss(f: number, dt: number): void {
    const b = this.boss;
    if (!b || !b.alive) return;
    b.t += dt;
    // 등장 강하 후 좌우 유영.
    if (b.y < 120) b.y += 1.4 * f;
    else b.x = GAME_W / 2 + Math.sin(b.t * 0.8) * (GAME_W / 2 - 70);

    if (this.mode !== "play") return;
    const def = STAGES[this.stageIndex];
    const diff = this.config.difficulty;
    const intensity = b.isTrueBoss ? 8 : def.bossIntensity;
    b.patternT -= dt;
    b.spin += dt * (1.2 + intensity * 0.1);

    if (b.patternT <= 0 && b.y >= 110) {
      // 패턴 발사 간격(난이도·강도 반영).
      b.patternT = Math.max(0.12, 0.5 - intensity * 0.03) / diff.fireRateMul;
      const speed = (def.bulletSpeed + 0.4) * diff.bulletSpeedMul;
      const phase = b.hp / b.maxHp;
      b.pattern = phase > 0.66 ? 0 : phase > 0.33 ? 1 : 2;
      this.bossPattern(b, speed, intensity);
    }
  }

  private bossPattern(b: Boss, speed: number, intensity: number): void {
    if (b.pattern === 0) {
      // 링 탄막.
      const n = 10 + intensity * 2;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + b.spin;
        this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 5, alive: true });
      }
    } else if (b.pattern === 1) {
      // 조준 확산.
      this.fireAimed(b.x, b.y, speed * 1.15, 5 + Math.floor(intensity / 2));
    } else {
      // 나선.
      const arms = 3 + Math.floor(intensity / 2);
      for (let a = 0; a < arms; a++) {
        const ang = b.spin * 2 + (a / arms) * Math.PI * 2;
        this.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 5, alive: true });
      }
    }
  }

  private killBoss(): void {
    const b = this.boss;
    if (!b) return;
    b.alive = false;
    this.addScore(5000);
    this.effects.push({ x: b.x, y: b.y, r: 20, maxR: 240, color: 0xffe08a, alive: true });
    this.clearEnemyBullets(true);
    const trueBoss = b.isTrueBoss;
    this.boss = null;
    this.stagePhase = "clearing";
    this.time.delayedCall(900, () => this.advanceStage(trueBoss));
  }

  private advanceStage(wasTrueBoss: boolean): void {
    if (this.mode !== "play") return;
    if (wasTrueBoss) {
      this.finish(true, true);
      return;
    }
    if (this.practice) {
      this.finish(true, false);
      return;
    }
    if (this.stageIndex >= STAGES.length - 1) {
      // 1주차 최종 보스 격파. 노컨티뉴면 심연(진보스)로.
      if (this.noContinue) {
        this.hooks.onStageBanner("심연 회랑 개방…");
        this.spawnBoss(
          { bossHp: 3200, bossName: "시원의 고룡 아카식", bossIntensity: 8 },
          true
        );
        this.stagePhase = "boss";
      } else {
        this.finish(true, false);
      }
      return;
    }
    this.loadStage(this.stageIndex + 1);
  }

  // ── 탄/픽업/이펙트 ─────────────────────────────────────────
  private updateBullets(f: number): void {
    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.x += b.vx * f;
      b.y += b.vy * f;
      if (b.x < -20 || b.x > GAME_W + 20 || b.y < -20 || b.y > GAME_H + 20) b.alive = false;
    }
    for (const p of this.pbullets) {
      if (!p.alive) continue;
      if (p.homing) {
        const target = this.nearestTarget(p.x, p.y);
        if (target) {
          const ang = Math.atan2(target.y - p.y, target.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          const next = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(ang - cur), -0.12, 0.12);
          const sp = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(next) * sp;
          p.vy = Math.sin(next) * sp;
        }
      }
      p.x += p.vx * f;
      p.y += p.vy * f;
      if (p.y < -20 || p.x < -20 || p.x > GAME_W + 20) p.alive = false;
      else this.hitWithPlayerBullet(p);
    }
    if (this.ebullets.length > 1600) this.ebullets = this.ebullets.filter((b) => b.alive);
    if (this.pbullets.length > 600) this.pbullets = this.pbullets.filter((b) => b.alive);
  }

  private nearestTarget(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.x - x, this.boss.y - y);
      if (d < bd) best = { x: this.boss.x, y: this.boss.y };
    }
    return best;
  }

  private hitWithPlayerBullet(p: PBullet): void {
    for (const e of this.enemies) {
      if (e.alive && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 3) {
        e.hp -= p.dmg;
        p.alive = false;
        if (e.hp <= 0) this.killEnemy(e);
        return;
      }
    }
    const b = this.boss;
    if (b && b.alive && Math.hypot(b.x - p.x, b.y - p.y) < b.r + 3) {
      b.hp -= p.dmg;
      p.alive = false;
      if (b.hp <= 0) this.killBoss();
    }
  }

  private updatePickups(f: number): void {
    for (const p of this.pickups) {
      if (!p.alive) continue;
      p.y += p.vy * f;
      if (p.y > GAME_H + 20) p.alive = false;
      else if (Math.hypot(p.x - this.px, p.y - this.py) < 22) {
        p.alive = false;
        if (p.kind === "power") this.power = Math.min(MAX_POWER, this.power + 1);
        else {
          this.hiddenScales += 1;
          this.addScore(500);
        }
        this.effects.push({ x: p.x, y: p.y, r: 4, maxR: 30, color: 0x9be8ff, alive: true });
      }
    }
    this.pickups = this.pickups.filter((p) => p.alive);
  }

  private updateEffects(f: number): void {
    for (const e of this.effects) {
      if (!e.alive) continue;
      e.r += (e.maxR - e.r) * 0.18 * f;
      if (e.maxR - e.r < 4) e.alive = false;
    }
    this.effects = this.effects.filter((e) => e.alive);
  }

  // ── 피격 판정 ─────────────────────────────────────────────
  private checkCollisions(): void {
    if (this.invuln > 0) return;
    for (const b of this.ebullets) {
      if (b.alive && Math.hypot(b.x - this.px, b.y - this.py) < b.r + this.hitR) {
        this.onPlayerHit();
        return;
      }
    }
  }

  private onPlayerHit(): void {
    const diff = this.config.difficulty;
    if (diff.autoBomb && this.bombs > 0) {
      this.triggerBomb(true);
      return;
    }
    this.lives -= 1;
    this.noMiss = false;
    this.chain = 0;
    this.power = Math.max(1, this.power - 1);
    this.clearEnemyBullets(false);
    this.invuln = 150;
    this.effects.push({ x: this.px, y: this.py, r: 8, maxR: 120, color: 0xff5a6a, alive: true });

    if (this.lives < 0) {
      this.mode = "continue";
      this.pushHud();
      this.hooks.onContinuePrompt();
    }
  }

  // ── 종료 정산 ─────────────────────────────────────────────
  private finish(cleared: boolean, trueEnding: boolean): void {
    if (this.mode === "done") return;
    this.mode = "done";
    const stageReached = this.stageIndex;
    const partial: Omit<RunResult, "earnedScales" | "newBest"> = {
      score: this.score,
      bestChain: this.bestChain,
      stageReached,
      hiddenScales: this.hiddenScales,
      noMiss: this.noMiss,
      noBomb: this.noBomb,
      noContinue: this.noContinue,
      cleared,
      trueEnding
    };
    const earnedScales = computeEarnedScales(partial);
    const result: RunResult = { ...partial, earnedScales, newBest: false };
    const bossName = STAGES[Math.min(stageReached, STAGES.length - 1)].bossName;
    this.hooks.onFinish(result, bossName);
  }

  // ── HUD 스냅샷 ────────────────────────────────────────────
  private pushHud(): void {
    const def = STAGES[this.stageIndex];
    const grade = this.chainGrade();
    const snap: HudSnapshot = {
      score: this.score,
      best: 0,
      chain: this.chain,
      chainGrade: grade,
      chainMul: this.chainMultiplier(),
      lives: Math.max(0, this.lives),
      bombs: this.bombs,
      awakenGauge: this.awakenGauge,
      awakening: this.awakening,
      power: this.power,
      stageName: this.boss?.isTrueBoss ? "심연 회랑" : def.name,
      stageNo: this.stageIndex + 1,
      bossHp: this.boss && this.boss.alive ? this.boss.hp / this.boss.maxHp : 0,
      bossName: this.boss?.alive ? this.boss.name : "",
      hiddenScales: this.hiddenScales
    };
    this.hooks.onHud(snap);
  }

  private chainGrade(): string {
    if (this.chain >= 400) return "용린";
    if (this.chain >= 150) return "난무";
    if (this.chain >= 50) return "환";
    if (this.chain >= 1) return "연";
    return "—";
  }

  // ── 렌더링 ────────────────────────────────────────────────
  private render(): void {
    const g = this.gfx;
    g.clear();
    const def = STAGES[this.stageIndex];

    // 배경 그라데이션.
    g.fillGradientStyle(def.bgTop, def.bgTop, def.bgBottom, def.bgBottom, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);

    // 이펙트(링).
    for (const e of this.effects) {
      const alpha = Phaser.Math.Clamp(1 - e.r / e.maxR, 0, 1);
      g.lineStyle(2, e.color, alpha * 0.8);
      g.strokeCircle(e.x, e.y, e.r);
    }

    // 픽업.
    for (const p of this.pickups) {
      if (!p.alive) continue;
      if (p.kind === "power") {
        g.fillStyle(0xff5a3c, 1);
        g.fillRect(p.x - 6, p.y - 6, 12, 12);
        g.lineStyle(1, 0xffd0a0, 1);
        g.strokeRect(p.x - 6, p.y - 6, 12, 12);
      } else {
        g.fillStyle(0x6ad0ff, 1);
        g.fillCircle(p.x, p.y, 7);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(p.x, p.y, 2.5);
      }
    }

    // 적.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      g.fillStyle(0x6a2030, 1);
      g.fillCircle(e.x, e.y, e.r);
      g.lineStyle(2, 0xd05a6a, 1);
      g.strokeCircle(e.x, e.y, e.r);
    }

    // 보스.
    const b = this.boss;
    if (b && b.alive) {
      g.fillStyle(0x40121f, 1);
      g.fillCircle(b.x, b.y, b.r);
      g.lineStyle(3, b.isTrueBoss ? 0xffd24a : 0xff6a7a, 1);
      g.strokeCircle(b.x, b.y, b.r);
      g.lineStyle(2, 0x9a2030, 0.6);
      g.strokeCircle(b.x, b.y, b.r + 6 + Math.sin(b.t * 4) * 3);
    }

    // 플레이어 탄.
    g.fillStyle(this.config.dragon.color, 1);
    for (const p of this.pbullets) {
      if (p.alive) g.fillRect(p.x - 1.5, p.y - 6, 3, 9);
    }

    // 레이저 빔(홀드 시).
    const laser = this.keys.focus.isDown || this.keys.focus2.isDown || this.btnLaser;
    if (laser && this.mode === "play") {
      const half = 11 + this.power * 1.5;
      g.fillStyle(this.config.dragon.color, 0.28);
      g.fillRect(this.px - half, 0, half * 2, this.py);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(this.px - 2, 0, 4, this.py);
    }

    // 적탄(흰 코어 + 주홍 글로우).
    for (const bl of this.ebullets) {
      if (!bl.alive) continue;
      g.fillStyle(0xff5a3c, 0.85);
      g.fillCircle(bl.x, bl.y, bl.r);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(bl.x, bl.y, bl.r * 0.45);
    }

    // 플레이어(드래곤) — 무적 시 점멸.
    const blink = this.invuln > 0 && Math.floor(this.invuln / 6) % 2 === 0;
    if (!blink) {
      const col = this.awakening ? 0xffffff : this.config.dragon.color;
      g.fillStyle(col, 1);
      g.fillTriangle(this.px, this.py - 14, this.px - 11, this.py + 10, this.px + 11, this.py + 10);
      if (this.awakening) {
        g.lineStyle(2, 0xbfe8ff, 0.8);
        g.strokeCircle(this.px, this.py, 20 + Math.sin(this.time.now / 80) * 3);
      }
    }
    // 피탄 판정점(항상 표시).
    g.fillStyle(0xffffff, 1);
    g.fillCircle(this.px, this.py, this.hitR);
    g.lineStyle(1, 0xff3344, 0.9);
    g.strokeCircle(this.px, this.py, this.hitR + 1.5);
  }
}
