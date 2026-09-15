import { PALETTE, PLAYER_KEYS } from "./config";
import { WALL } from "./board";
import type { Match } from "./engine";
import type { Effects } from "./effects";
import { DELTA, type Runner } from "./types";

const BACKGROUND = "#0d1220";
const EMPTY_TILE = "#2c2a27";
const EMPTY_TILE_EDGE = "#211f1d";
const WALL_TILE = "#3b3733";
const WALL_STRIPE = "#26231f";
const RUBBLE = "#4b4238";
const RUBBLE_CRACK = "#7b6a57";

/** 타일 사이 간격 비율. splix 계열 특유의 "블록이 따로 놓인" 느낌을 만든다. */
const TILE_GAP = 0.12;
const TILE_RADIUS = 0.22;

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16);
    const mixed = amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount;
    return Math.round(Math.min(255, Math.max(0, mixed)));
  });
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
}

function tilePath(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number): void {
  const gap = cell * TILE_GAP;
  ctx.roundRect(x * cell + gap, y * cell + gap, cell - gap * 2, cell - gap * 2, cell * TILE_RADIUS);
}

/** 빈 타일과 벽은 매 프레임 바뀌지 않으므로 한 번만 그려 두고 재사용한다. */
export class BoardBackdrop {
  private canvas: HTMLCanvasElement | null = null;
  private renderedSize = 0;
  private renderedCells = 0;
  private renderedScale = 0;

  get(match: Match, size: number, scale: number): HTMLCanvasElement {
    if (
      this.canvas &&
      this.renderedSize === size &&
      this.renderedCells === match.board.size &&
      this.renderedScale === scale
    ) {
      return this.canvas;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(size * scale);
    canvas.height = Math.round(size * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D 컨텍스트를 만들 수 없습니다.");
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const board = match.board;
    const cell = size / board.size;

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, size, size);

    ctx.beginPath();
    for (let y = 0; y < board.size; y += 1) {
      for (let x = 0; x < board.size; x += 1) {
        if (!board.isWall(x, y)) {
          tilePath(ctx, x, y, cell);
        }
      }
    }
    ctx.fillStyle = EMPTY_TILE;
    ctx.fill();
    ctx.strokeStyle = EMPTY_TILE_EDGE;
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    for (let y = 0; y < board.size; y += 1) {
      for (let x = 0; x < board.size; x += 1) {
        if (board.isWall(x, y)) {
          ctx.rect(x * cell, y * cell, cell, cell);
        }
      }
    }
    ctx.fillStyle = WALL_TILE;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = WALL_STRIPE;
    ctx.lineWidth = Math.max(2, cell * 0.55);
    ctx.beginPath();
    for (let offset = -size; offset < size * 2; offset += cell * 1.8) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + size, size);
    }
    ctx.stroke();
    ctx.restore();

    this.canvas = canvas;
    this.renderedSize = size;
    this.renderedCells = board.size;
    this.renderedScale = scale;
    return canvas;
  }
}

/**
 * 한 프레임을 그린다. 시뮬레이션 상태는 읽기만 한다.
 *
 * @param size 캔버스의 논리 픽셀 한 변 길이(정사각형).
 */
export function drawMatch(
  ctx: CanvasRenderingContext2D,
  match: Match,
  effects: Effects,
  backdrop: BoardBackdrop,
  size: number,
  scale: number
): void {
  const cell = size / match.board.size;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(backdrop.get(match, size, scale), 0, 0, size, size);

  drawTerritory(ctx, match, cell);
  drawRubble(ctx, match, cell);
  drawCaptureSweeps(ctx, effects, cell);
  drawTrails(ctx, match, cell);
  drawShards(ctx, effects, cell);
  drawShockwaves(ctx, effects, cell);
  drawRunners(ctx, match, cell, size);
  drawScorePops(ctx, effects, cell);
}

function drawTerritory(ctx: CanvasRenderingContext2D, match: Match, cell: number): void {
  const board = match.board;

  for (let id = 1; id < PALETTE.length; id += 1) {
    let any = false;
    ctx.beginPath();

    for (let y = 0; y < board.size; y += 1) {
      for (let x = 0; x < board.size; x += 1) {
        const owner = board.owner[board.index(x, y)];
        if (owner !== id || owner === WALL) {
          continue;
        }
        tilePath(ctx, x, y, cell);
        any = true;
      }
    }

    if (!any) {
      continue;
    }

    const color = PALETTE[id].territory;
    ctx.fillStyle = shade(color, -0.32);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.1);
    ctx.stroke();
  }
}

/**
 * 폐허 — 누군가 죽어서 잠긴 땅. 아무도 가져갈 수 없고, 잠금이 풀릴수록 옅어진다.
 * 잠금 규칙이 꺼져 있으면 아무것도 그리지 않는다.
 */
function drawRubble(ctx: CanvasRenderingContext2D, match: Match, cell: number): void {
  const lockMs = match.rules.rubbleLockMs;
  if (lockMs <= 0) {
    return;
  }

  const board = match.board;
  const now = match.elapsedMs;

  for (let y = 0; y < board.size; y += 1) {
    for (let x = 0; x < board.size; x += 1) {
      const until = board.rubbleUntil[board.index(x, y)];
      if (until <= now) {
        continue;
      }
      const remaining = Math.min(1, (until - now) / lockMs);

      ctx.fillStyle = withAlpha(RUBBLE, 0.25 + remaining * 0.55);
      ctx.beginPath();
      tilePath(ctx, x, y, cell);
      ctx.fill();

      ctx.strokeStyle = withAlpha(RUBBLE_CRACK, 0.3 + remaining * 0.5);
      ctx.lineWidth = Math.max(1, cell * 0.12);
      ctx.beginPath();
      ctx.moveTo((x + 0.25) * cell, (y + 0.25) * cell);
      ctx.lineTo((x + 0.75) * cell, (y + 0.75) * cell);
      ctx.stroke();
    }
  }
}

/** 점령 직후 새 영역 위를 훑고 지나가는 사선 쐐기. */
function drawCaptureSweeps(ctx: CanvasRenderingContext2D, effects: Effects, cell: number): void {
  for (const sweep of effects.sweeps) {
    const progress = sweep.ageMs / sweep.lifeMs;
    const front = progress * (sweep.reach + 6);
    const color = PALETTE[sweep.id].territory;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const spot of sweep.cells) {
      const distance = Math.abs(spot.x - sweep.originX) + Math.abs(spot.y - sweep.originY);
      const local = (front - distance) / 4;
      if (local <= 0 || local >= 1.6) {
        continue;
      }
      const intensity = local < 1 ? local : 1.6 - local;
      ctx.fillStyle = withAlpha(color, Math.min(0.55, intensity * 0.5));
      ctx.beginPath();
      tilePath(ctx, spot.x, spot.y, cell);
      ctx.fill();
    }

    ctx.restore();
  }
}

/** 꼬리는 영토와 같은 색이지만 사선 빗금을 넣어 한눈에 구분되게 한다. */
function drawTrails(ctx: CanvasRenderingContext2D, match: Match, cell: number): void {
  for (const runner of match.runners) {
    if (!runner.alive || runner.trail.length === 0) {
      continue;
    }

    const color = PALETTE[runner.id].territory;

    ctx.save();
    ctx.beginPath();
    for (const spot of runner.trail) {
      ctx.rect(spot.x * cell, spot.y * cell, cell, cell);
    }
    ctx.clip();

    ctx.fillStyle = shade(color, -0.45);
    for (const spot of runner.trail) {
      ctx.fillRect(spot.x * cell, spot.y * cell, cell, cell);
    }

    ctx.strokeStyle = withAlpha(color, 0.85);
    ctx.lineWidth = cell * 0.45;
    ctx.beginPath();
    const span = match.board.size * cell;
    for (let offset = -span; offset < span * 2; offset += cell * 1.1) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + span, span);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.12);
    ctx.beginPath();
    for (const spot of runner.trail) {
      ctx.rect(spot.x * cell, spot.y * cell, cell, cell);
    }
    ctx.stroke();
  }
}

function drawShards(ctx: CanvasRenderingContext2D, effects: Effects, cell: number): void {
  for (const shard of effects.shards) {
    const life = 1 - shard.ageMs / shard.lifeMs;
    const reach = shard.size * cell;

    ctx.save();
    ctx.translate(shard.x * cell, shard.y * cell);
    ctx.rotate(shard.rotation);
    ctx.globalAlpha = Math.max(0, life);
    ctx.fillStyle = shard.color;
    ctx.beginPath();
    ctx.moveTo(-reach, -reach);
    ctx.lineTo(reach, -reach * 0.4);
    ctx.lineTo(-reach * 0.4, reach);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwaves(ctx: CanvasRenderingContext2D, effects: Effects, cell: number): void {
  for (const wave of effects.shockwaves) {
    const progress = wave.ageMs / wave.lifeMs;
    const radius = cell * (1 + progress * 9);

    ctx.strokeStyle = withAlpha(wave.color, Math.max(0, 0.75 * (1 - progress)));
    ctx.lineWidth = Math.max(1.5, cell * 0.5 * (1 - progress));
    ctx.beginPath();
    ctx.arc(wave.x * cell, wave.y * cell, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * 킬 점수를 그 자리에 띄운다. 킬이 점수의 대부분인데 결과 화면에서야 알게 되는 문제를
 * 그 순간 보이게 만드는 장치다. 다른 무엇보다 위에 그린다.
 */
function drawScorePops(ctx: CanvasRenderingContext2D, effects: Effects, cell: number): void {
  if (effects.scorePops.length === 0) {
    return;
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(13, cell * 1.7)}px "Pretendard", system-ui, sans-serif`;
  ctx.lineJoin = "round";

  for (const pop of effects.scorePops) {
    const progress = pop.ageMs / pop.lifeMs;
    // 처음엔 빠르게 솟았다가 잦아든다.
    const rise = (1 - (1 - progress) ** 2) * cell * 3.2;
    const alpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;
    const x = pop.x * cell;
    const y = pop.y * cell - rise;

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = "rgba(8, 12, 22, 0.85)";
    ctx.lineWidth = Math.max(3, cell * 0.5);
    ctx.strokeText(pop.text, x, y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, x, y);
  }

  ctx.restore();
}

function drawRunners(
  ctx: CanvasRenderingContext2D,
  match: Match,
  cell: number,
  size: number
): void {
  for (const runner of match.runners) {
    if (!runner.alive) {
      continue;
    }

    const progress = match.moveProgress(runner);
    const x = (runner.prevX + (runner.x - runner.prevX) * progress + 0.5) * cell;
    const y = (runner.prevY + (runner.y - runner.prevY) * progress + 0.5) * cell;
    const color = PALETTE[runner.id].territory;

    if (runner.kind === "human") {
      drawFocusRing(ctx, x, y, cell, size, color, match.humans === 1);
    }

    const delta = DELTA[runner.dir];
    ctx.strokeStyle = shade(color, -0.35);
    ctx.lineWidth = cell * 0.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - delta.x * cell * 0.5, y - delta.y * cell * 0.5);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.strokeStyle = shade(color, -0.45);
    ctx.lineWidth = Math.max(1.5, cell * 0.16);
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 한 화면에 사람이 여럿이면 누가 누군지 색만으로는 헷갈린다.
    if (match.humans > 1 && runner.kind === "human") {
      drawSeatBadge(ctx, x, y, cell, color, PLAYER_KEYS[runner.id - 1]?.label ?? `P${runner.id}`);
    }
  }
}

function drawSeatBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  color: string,
  label: string
): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(10, cell * 1.05)}px "Pretendard", system-ui, sans-serif`;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(8, 12, 22, 0.9)";
  ctx.lineWidth = Math.max(2.5, cell * 0.42);
  ctx.strokeText(label, x, y - cell * 1.5);
  ctx.fillStyle = color;
  ctx.fillText(label, x, y - cell * 1.5);
  ctx.restore();
}

/**
 * 60×60 격자에서 내 말을 놓치지 않도록 링을 얹는다.
 * 십자선은 혼자일 때만 — 넷이 그으면 화면이 격자무늬가 된다.
 */
function drawFocusRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  size: number,
  color: string,
  crosshair: boolean
): void {
  if (crosshair) {
    ctx.strokeStyle = withAlpha(color, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  ctx.strokeStyle = withAlpha(color, 0.6);
  ctx.lineWidth = Math.max(1, cell * 0.12);
  ctx.beginPath();
  ctx.arc(x, y, cell * 1.7, 0, Math.PI * 2);
  ctx.stroke();
}
