// 볼링 게임 코어: 상태 머신 + 2D 핀/볼 물리. 렌더러/React와 분리된 순수 로직.

import { audio } from "./audio";
import { scoreGame, type GameScore } from "./scoring";

// ── 레인 좌표계(units) ────────────────────────────────────────
// x: 0..BOARD_W (좌우), y: 0(파울라인) .. LANE_LEN(핀덱 뒤). 볼은 y 증가 방향으로 굴러감.
export const BOARD_W = 50; // 거터 포함 전체 폭
export const GUTTER = 5; // 한쪽 거터 폭 → 플레이 영역 x ∈ [5,45]
export const LANE_LEN = 240;
export const BALL_R = 3.4;
export const PIN_R = 1.9;
const CENTER_X = BOARD_W / 2;

const PIN_SPACING = 8; // 핀 중심 간격(x)
const ROW_GAP = 7.4; // 행 간격(y)
const HEAD_PIN_Y = LANE_LEN - 42; // 헤드핀 y

export interface Pin {
  id: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  removed: boolean; // 이번 프레임에서 이미 쓰러져 치워진 핀
  down: boolean; // 현재 굴림에서 쓰러졌는지(표시용)
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  gutter: boolean;
}

export type Phase = "title" | "aim" | "power" | "spin" | "rolling" | "result" | "gameover";

export interface ResultBanner {
  text: string;
  sub: string;
  color: string;
  timer: number;
}

const TIP_DIST = 2.4; // 홈에서 이만큼 벗어나면 쓰러진 것으로 판정

export class BowlingGame {
  phase: Phase = "title";
  frames: number[][] = [[]];
  frameIndex = 0;
  pins: Pin[] = [];
  ball: Ball = { x: CENTER_X, y: 2, vx: 0, vy: 0, active: false, gutter: false };

  aimX = CENTER_X;
  power = 0; // 확정된 파워 0..1
  spin = 0; // 확정된 스핀 -1..1
  meterT = 0; // 미터 오실레이터용 시각
  banner: ResultBanner | null = null;

  highScore = 0;
  lastTotal = 0;

  private held = { left: false, right: false };
  private settleTimer = 0;
  private pinSoundCooldown = 0;
  private standingAtLaunch = 10; // 이번 공을 굴리기 직전 서있던 핀 수

  constructor() {
    this.resetRack();
    this.highScore = loadHigh();
  }

  get score(): GameScore {
    return scoreGame(this.frames);
  }

  /** 현재 서 있는(치워지지 않은) 핀 수. */
  private standingCount(): number {
    return this.pins.filter((p) => !p.removed).length;
  }

  resetRack(): void {
    const cx = CENTER_X;
    const layout: Array<[number, number]> = [
      [cx, HEAD_PIN_Y], // 1
      [cx - PIN_SPACING / 2, HEAD_PIN_Y + ROW_GAP], // 2
      [cx + PIN_SPACING / 2, HEAD_PIN_Y + ROW_GAP], // 3
      [cx - PIN_SPACING, HEAD_PIN_Y + 2 * ROW_GAP], // 4
      [cx, HEAD_PIN_Y + 2 * ROW_GAP], // 5
      [cx + PIN_SPACING, HEAD_PIN_Y + 2 * ROW_GAP], // 6
      [cx - 1.5 * PIN_SPACING, HEAD_PIN_Y + 3 * ROW_GAP], // 7
      [cx - 0.5 * PIN_SPACING, HEAD_PIN_Y + 3 * ROW_GAP], // 8
      [cx + 0.5 * PIN_SPACING, HEAD_PIN_Y + 3 * ROW_GAP], // 9
      [cx + 1.5 * PIN_SPACING, HEAD_PIN_Y + 3 * ROW_GAP] // 10
    ];
    this.pins = layout.map(([x, y], i) => ({
      id: i + 1,
      homeX: x,
      homeY: y,
      x,
      y,
      vx: 0,
      vy: 0,
      removed: false,
      down: false
    }));
  }

  // ── 입력 ──────────────────────────────────────────────────
  setHeld(dir: "left" | "right", v: boolean): void {
    this.held[dir] = v;
  }

  action(): void {
    audio.resume();
    switch (this.phase) {
      case "title":
        this.startGame();
        break;
      case "aim":
        this.phase = "power";
        this.meterT = 0;
        audio.play("ui");
        break;
      case "power":
        this.power = triWave(this.meterT, POWER_SPEED);
        this.phase = "spin";
        this.meterT = 0;
        audio.play("lock");
        break;
      case "spin":
        this.spin = triWave(this.meterT, SPIN_SPEED) * 2 - 1; // -1..1
        this.launch();
        audio.play("lock");
        break;
      case "gameover":
        this.phase = "title";
        this.newGame();
        audio.play("ui");
        break;
      default:
        break;
    }
  }

  startGame(): void {
    this.newGame();
    this.phase = "aim";
    audio.play("start");
  }

  private newGame(): void {
    this.frames = [[]];
    this.frameIndex = 0;
    this.power = 0;
    this.spin = 0;
    this.banner = null;
    this.resetRack();
    this.beginAim();
  }

  private beginAim(): void {
    // 새 공: 서 있는 핀이 없으면(직전에 클리어) 새 랙을 세운다(10프레임 보너스구).
    if (this.standingCount() === 0) this.resetRack();
    this.ball = { x: this.aimX, y: 2, vx: 0, vy: 0, active: false, gutter: false };
    this.phase = "aim";
  }

  private launch(): void {
    this.standingAtLaunch = this.standingCount();
    const vy0 = lerp(96, 178, this.power);
    this.ball = { x: this.aimX, y: 3, vx: 0, vy: vy0, active: true, gutter: false };
    this.phase = "rolling";
    this.settleTimer = 0;
    this.meterT = 0;
    audio.play("roll");
  }

  // ── 업데이트 루프 ─────────────────────────────────────────
  update(dt: number): void {
    this.meterT += dt;
    if (this.pinSoundCooldown > 0) this.pinSoundCooldown -= dt;

    if (this.phase === "aim") {
      const speed = 22 * dt;
      if (this.held.left) this.aimX = Math.max(GUTTER + BALL_R, this.aimX - speed);
      if (this.held.right) this.aimX = Math.min(BOARD_W - GUTTER - BALL_R, this.aimX + speed);
      this.ball.x = this.aimX;
    }

    if (this.phase === "rolling") {
      // 물리는 고정 스텝으로 여러 번 적분(안정성).
      const step = 1 / 240;
      let remaining = Math.min(dt, 0.05);
      while (remaining > 0) {
        const h = Math.min(step, remaining);
        this.physicsStep(h);
        remaining -= h;
      }
      this.checkSettle(dt);
    }

    if (this.phase === "result" && this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) {
        this.banner = null;
        this.afterResult();
      }
    }
  }

  private physicsStep(h: number): void {
    const ball = this.ball;
    if (ball.active) {
      // 스핀에 의한 곡선(훅): 공이 느려질수록 휘어짐이 커진다.
      if (!ball.gutter && ball.vy > 0) {
        const slowness = 1 - Math.min(1, ball.vy / 178);
        ball.vx += this.spin * (14 + 42 * slowness) * h;
      }
      // 마찰(속도 벡터 감쇠).
      const sp = Math.hypot(ball.vx, ball.vy);
      const dec = 12 * h;
      if (sp > 0) {
        const ns = Math.max(0, sp - dec);
        ball.vx *= ns / sp;
        ball.vy *= ns / sp;
      }
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;

      // 거터 판정.
      if (!ball.gutter) {
        if (ball.x <= GUTTER + BALL_R * 0.4) {
          ball.gutter = true;
          ball.x = GUTTER * 0.5;
          ball.vx = 0;
        } else if (ball.x >= BOARD_W - GUTTER - BALL_R * 0.4) {
          ball.gutter = true;
          ball.x = BOARD_W - GUTTER * 0.5;
          ball.vx = 0;
        }
      }

      // 볼 vs 핀 충돌.
      if (!ball.gutter) {
        for (const p of this.pins) {
          if (p.removed) continue;
          collide(ball, p, BALL_R, PIN_R, 6, 1);
        }
      }

      if (ball.y > LANE_LEN + 8) ball.active = false; // 핏으로 빠짐
    }

    // 핀 이동 + 마찰.
    for (const p of this.pins) {
      if (p.removed) continue;
      if (p.vx !== 0 || p.vy !== 0) {
        const sp = Math.hypot(p.vx, p.vy);
        const dec = 34 * h;
        const ns = Math.max(0, sp - dec);
        if (sp > 0) {
          p.vx *= ns / sp;
          p.vy *= ns / sp;
        }
        p.x += p.vx * h;
        p.y += p.vy * h;
      }
    }

    // 핀 vs 핀 충돌(연쇄 반응).
    for (let i = 0; i < this.pins.length; i++) {
      const a = this.pins[i];
      if (a.removed) continue;
      for (let j = i + 1; j < this.pins.length; j++) {
        const b = this.pins[j];
        if (b.removed) continue;
        collide(a, b, PIN_R, PIN_R, 1, 1);
      }
    }

    // 쓰러짐 표시 + 타격음.
    for (const p of this.pins) {
      if (p.removed || p.down) continue;
      if (Math.hypot(p.x - p.homeX, p.y - p.homeY) > TIP_DIST) {
        p.down = true;
        if (this.pinSoundCooldown <= 0) {
          audio.play("pin");
          this.pinSoundCooldown = 0.035;
        }
      }
    }
  }

  private checkSettle(dt: number): void {
    const ballMoving = this.ball.active && Math.hypot(this.ball.vx, this.ball.vy) > 3;
    const pinsMoving = this.pins.some((p) => !p.removed && Math.hypot(p.vx, p.vy) > 2);
    if (!ballMoving && !pinsMoving) {
      this.settleTimer += dt;
    } else {
      this.settleTimer = 0;
    }
    // 정지가 충분히 유지되거나(0.35s) 최대 시간 초과 시 정산.
    if (this.settleTimer > 0.35 || this.meterT > 8) {
      this.finishRoll();
    }
  }

  private finishRoll(): void {
    const knocked = this.pins.filter((p) => !p.removed && p.down).length;
    this.recordRoll(knocked);
  }

  private recordRoll(knocked: number): void {
    const frame = this.frames[this.frameIndex];
    frame.push(knocked);
    // 이번에 쓰러진 핀 치우기.
    for (const p of this.pins) {
      if (!p.removed && p.down) p.removed = true;
    }

    // 풀랙(10핀)에서 전부 쓰러뜨리면 스트라이크, 남은 핀을 모두 처리하면 스페어.
    const clearedAll = knocked === this.standingAtLaunch;
    const isStrike = clearedAll && this.standingAtLaunch === 10;
    const isSpare = clearedAll && this.standingAtLaunch < 10 && knocked > 0;

    let banner: ResultBanner;
    if (isStrike) {
      banner = { text: "STRIKE!", sub: "", color: "#ffd23f", timer: 1.1 };
      audio.play("strike");
    } else if (isSpare) {
      banner = { text: "SPARE!", sub: "", color: "#3fd0ff", timer: 1.0 };
      audio.play("spare");
    } else if (this.ball.gutter) {
      banner = { text: "GUTTER", sub: "", color: "#8a93a3", timer: 0.9 };
      audio.play("gutter");
    } else if (knocked === 0) {
      banner = { text: "MISS", sub: "", color: "#8a93a3", timer: 0.9 };
      audio.play("miss");
    } else {
      banner = { text: `${knocked} PIN${knocked > 1 ? "S" : ""}`, sub: "", color: "#ffffff", timer: 0.8 };
    }

    this.banner = banner;
    this.phase = "result";
  }

  private afterResult(): void {
    if (this.isFrameOver()) {
      if (this.frameIndex === 9) {
        this.endGame();
        return;
      }
      this.frameIndex += 1;
      this.frames.push([]);
      this.resetRack();
    }
    this.beginAim();
  }

  private isFrameOver(): boolean {
    const frame = this.frames[this.frameIndex];
    if (this.frameIndex < 9) {
      return frame[0] === 10 || frame.length === 2;
    }
    // 10프레임.
    if (frame.length < 2) return false;
    if (frame.length === 2) {
      const bonus = frame[0] === 10 || frame[0] + frame[1] === 10;
      return !bonus; // 보너스 없으면 2구로 종료
    }
    return frame.length === 3;
  }

  private endGame(): void {
    const total = this.score.total;
    this.lastTotal = total;
    if (total > this.highScore) {
      this.highScore = total;
      saveHigh(total);
    }
    this.phase = "gameover";
    audio.play("over");
  }

  // 미터 현재값(렌더용).
  currentPowerT(): number {
    return this.phase === "power" ? triWave(this.meterT, POWER_SPEED) : this.power;
  }
  currentSpinT(): number {
    return this.phase === "spin" ? triWave(this.meterT, SPIN_SPEED) * 2 - 1 : this.spin;
  }
}

// ── 헬퍼 ────────────────────────────────────────────────────
const POWER_SPEED = 1.15;
const SPIN_SPEED = 1.45;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0→1→0 삼각파. speed는 초당 왕복 비율. */
function triWave(t: number, speed: number): number {
  const p = (t * speed) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** 두 원 탄성 충돌(질량 ma,mb). 겹침 분리 + 법선 방향 운동량 교환. */
function collide(a: Body, b: Body, ra: number, rb: number, ma: number, mb: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const minD = ra + rb;
  if (distSq >= minD * minD || distSq === 0) return;
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;

  // 겹침 분리(질량 반비례).
  const overlap = minD - dist;
  const totalM = ma + mb;
  a.x -= nx * overlap * (mb / totalM);
  a.y -= ny * overlap * (mb / totalM);
  b.x += nx * overlap * (ma / totalM);
  b.y += ny * overlap * (ma / totalM);

  // 법선 방향 상대속도.
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const velN = rvx * nx + rvy * ny;
  if (velN > 0) return; // 이미 벌어지는 중
  const restitution = 0.85;
  const impulse = (-(1 + restitution) * velN) / (1 / ma + 1 / mb);
  const ix = impulse * nx;
  const iy = impulse * ny;
  a.vx -= ix / ma;
  a.vy -= iy / ma;
  b.vx += ix / mb;
  b.vy += iy / mb;
}

const HIGH_KEY = "retro-bowling/high/v1";
function loadHigh(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(HIGH_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
function saveHigh(v: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIGH_KEY, String(v));
  } catch {
    /* 무시 */
  }
}
