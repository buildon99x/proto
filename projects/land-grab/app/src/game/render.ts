import { playerStyle } from "./config";
import { WALL } from "./board";
import type { Effects } from "./effects";
import { DELTA, type Cell, type Direction } from "./types";

const BACKGROUND = "#0d1220";
const EMPTY_TILE = "#2c2a27";
const EMPTY_TILE_EDGE = "#211f1d";
const WALL_TILE = "#3b3733";
const WALL_STRIPE = "#26231f";
const RUBBLE = "#4b4238";
const RUBBLE_CRACK = "#7b6a57";

/** 타일 사이 간격 비율. 블록이 따로 놓인 느낌을 만든다. */
const TILE_GAP = 0.12;
const TILE_RADIUS = 0.22;

/**
 * 렌더러가 한 프레임에 필요로 하는 전부.
 *
 * 일부러 `Match` 를 받지 않는다. 온라인에서는 시뮬레이션이 서버에 있고 이쪽에는
 * 받아 적은 상태뿐이라, 렌더러가 `Match` 에 묶여 있으면 화면을 두 벌 써야 한다.
 * 로컬 판은 `game/scene.ts` 가, 온라인은 `net/scene.ts` 가 이 모양을 만들어 준다.
 */
export type Scene = {
  /** 보드 한 변. */
  size: number;
  /** 타일 소유자. 길이 `size * size`, 인덱스는 `y * size + x`. */
  owner: Uint8Array;
  runners: readonly SceneRunner[];
  /** 십자 조준선을 허용하는가. 실제로는 보드 전체가 보일 때만 그린다. */
  crosshair: boolean;
  /** 폐허 규칙. 0이면 폐허를 그리지 않는다. */
  rubbleLockMs: number;
  elapsedMs: number;
  hasRubble: boolean;
  rubbleUntilAt: (x: number, y: number) => number;
};

export type SceneRunner = {
  id: number;
  alive: boolean;
  x: number;
  y: number;
  /** 보간용 직전 칸. */
  prevX: number;
  prevY: number;
  dir: Direction;
  trail: readonly Cell[];
  /** 칸과 칸 사이 보간 진행률(0~1). */
  progress: number;
  /** 내 말인가. 링을 얹어 놓치지 않게 한다. */
  focus: boolean;
  /** 머리 위에 띄울 이름. 없으면 안 그린다. */
  label?: string;
};

/**
 * 보이는 범위. 큰 맵에서는 화면에 들어오는 칸만 그린다 —
 * `600 × 600` 은 36만 칸이라 전부 훑으면 한 프레임도 못 그린다.
 */
export type Camera = {
  /** 화면 중앙에 오는 타일 좌표. */
  x: number;
  y: number;
  /** 가로로 보이는 타일 수. */
  tiles: number;
};

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

/** 화면에 그릴 때 쓰는 좌표 변환. 타일 좌표 → 논리 픽셀. */
type View = {
  cell: number;
  left: number;
  top: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  toX: (tileX: number) => number;
  toY: (tileY: number) => number;
};

function makeView(boardSize: number, size: number, camera: Camera): View {
  const cell = size / camera.tiles;
  const half = camera.tiles / 2;
  const left = camera.x - half;
  const top = camera.y - half;

  return {
    cell,
    left,
    top,
    minX: Math.max(0, Math.floor(left)),
    minY: Math.max(0, Math.floor(top)),
    maxX: Math.min(boardSize - 1, Math.ceil(left + camera.tiles)),
    maxY: Math.min(boardSize - 1, Math.ceil(top + camera.tiles)),
    toX: (tileX: number) => (tileX - left) * cell,
    toY: (tileY: number) => (tileY - top) * cell
  };
}

function tilePath(ctx: CanvasRenderingContext2D, view: View, x: number, y: number): void {
  const gap = view.cell * TILE_GAP;
  ctx.roundRect(
    view.toX(x) + gap,
    view.toY(y) + gap,
    view.cell - gap * 2,
    view.cell - gap * 2,
    view.cell * TILE_RADIUS
  );
}

/** 소유자별로 칸을 모아 한 번에 칠하려고 쓰는 버퍼. 프레임마다 재사용한다. */
const ownerBuckets: number[][] = Array.from({ length: 256 }, () => []);
const touchedOwners: number[] = [];

/**
 * 빈 칸 격자는 모양이 늘 같다. 매 프레임 둥근 사각형 수천 개를 다시 그릴 이유가 없어
 * 한 번 그려 두고 카메라의 소수점 어긋남만큼 밀어서 붙인다.
 */
const emptyGrid: {
  canvas: HTMLCanvasElement | null;
  cell: number;
  span: number;
} = { canvas: null, cell: 0, span: 0 };

function emptyGridCanvas(cell: number, span: number): HTMLCanvasElement {
  if (emptyGrid.canvas && emptyGrid.cell === cell && emptyGrid.span === span) {
    return emptyGrid.canvas;
  }

  const canvas = document.createElement("canvas");
  const side = Math.ceil(span * cell);
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D 컨텍스트를 만들 수 없습니다.");
  }

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, side, side);

  const gap = cell * TILE_GAP;
  ctx.beginPath();
  for (let y = 0; y < span; y += 1) {
    for (let x = 0; x < span; x += 1) {
      ctx.roundRect(x * cell + gap, y * cell + gap, cell - gap * 2, cell - gap * 2, cell * TILE_RADIUS);
    }
  }
  ctx.fillStyle = EMPTY_TILE;
  ctx.fill();
  ctx.strokeStyle = EMPTY_TILE_EDGE;
  ctx.lineWidth = Math.max(0.5, cell * 0.08);
  ctx.stroke();

  emptyGrid.canvas = canvas;
  emptyGrid.cell = cell;
  emptyGrid.span = span;
  return canvas;
}

/**
 * 한 프레임을 그린다. 시뮬레이션 상태는 읽기만 한다.
 *
 * @param size 캔버스의 논리 픽셀 한 변 길이(정사각형).
 * @param scale 장치 픽셀 비율.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  effects: Effects,
  size: number,
  scale: number,
  camera: Camera
): void {
  void scale;
  const view = makeView(scene.size, size, camera);

  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, size, size);

  drawTiles(ctx, scene, view);
  drawRubble(ctx, scene, view);
  drawCaptureSweeps(ctx, effects, view);
  drawTrails(ctx, scene, view);
  drawShards(ctx, effects, view);
  drawShockwaves(ctx, effects, view);
  drawRunners(ctx, scene, view, size, camera);
  drawScorePops(ctx, effects, view);
}

/** 빈 격자는 통째로 붙이고, 주인이 있는 칸과 벽만 위에 덧그린다. */
function drawTiles(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
  const span = Math.ceil(view.maxX - view.minX + 2);
  const grid = emptyGridCanvas(view.cell, Math.max(span, 2));
  const fracX = view.left - Math.floor(view.left);
  const fracY = view.top - Math.floor(view.top);
  ctx.drawImage(grid, -fracX * view.cell, -fracY * view.cell);

  for (const owner of touchedOwners) {
    ownerBuckets[owner].length = 0;
  }
  touchedOwners.length = 0;

  for (let y = view.minY; y <= view.maxY; y += 1) {
    const row = y * scene.size;
    for (let x = view.minX; x <= view.maxX; x += 1) {
      const owner = scene.owner[row + x];
      if (owner === 0) {
        continue;
      }
      const bucket = ownerBuckets[owner];
      if (bucket.length === 0) {
        touchedOwners.push(owner);
      }
      bucket.push(x, y);
    }
  }

  for (const owner of touchedOwners) {
    const cells = ownerBuckets[owner];

    ctx.beginPath();
    for (let i = 0; i < cells.length; i += 2) {
      tilePath(ctx, view, cells[i], cells[i + 1]);
    }

    if (owner === WALL) {
      ctx.fillStyle = WALL_TILE;
      ctx.fill();
      ctx.strokeStyle = WALL_STRIPE;
      ctx.lineWidth = Math.max(1, view.cell * 0.3);
      ctx.beginPath();
      for (let i = 0; i < cells.length; i += 2) {
        const left = view.toX(cells[i]);
        const top = view.toY(cells[i + 1]);
        ctx.moveTo(left, top + view.cell);
        ctx.lineTo(left + view.cell, top);
      }
      ctx.stroke();
      continue;
    }

    const color = playerStyle(owner).territory;
    ctx.fillStyle = shade(color, -0.32);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.5, view.cell * 0.1);
    ctx.stroke();
  }
}

/** 폐허 — 누군가 죽어서 잠긴 땅. 잠금이 풀릴수록 옅어진다. */
function drawRubble(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
  const lockMs = scene.rubbleLockMs;
  if (lockMs <= 0 || !scene.hasRubble) {
    return;
  }

  const now = scene.elapsedMs;
  for (let y = view.minY; y <= view.maxY; y += 1) {
    for (let x = view.minX; x <= view.maxX; x += 1) {
      const until = scene.rubbleUntilAt(x, y);
      if (until <= now) {
        continue;
      }
      const remaining = Math.min(1, (until - now) / lockMs);

      ctx.fillStyle = withAlpha(RUBBLE, 0.25 + remaining * 0.55);
      ctx.beginPath();
      tilePath(ctx, view, x, y);
      ctx.fill();

      ctx.strokeStyle = withAlpha(RUBBLE_CRACK, 0.3 + remaining * 0.5);
      ctx.lineWidth = Math.max(1, view.cell * 0.12);
      ctx.beginPath();
      ctx.moveTo(view.toX(x + 0.25), view.toY(y + 0.25));
      ctx.lineTo(view.toX(x + 0.75), view.toY(y + 0.75));
      ctx.stroke();
    }
  }
}

function visible(view: View, x: number, y: number): boolean {
  return x >= view.minX - 1 && x <= view.maxX + 1 && y >= view.minY - 1 && y <= view.maxY + 1;
}

/** 점령 직후 새 영역 위를 훑고 지나가는 사선 쐐기. */
function drawCaptureSweeps(ctx: CanvasRenderingContext2D, effects: Effects, view: View): void {
  for (const sweep of effects.sweeps) {
    const progress = sweep.ageMs / sweep.lifeMs;
    const front = progress * (sweep.reach + 6);
    const color = playerStyle(sweep.id).territory;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const spot of sweep.cells) {
      if (!visible(view, spot.x, spot.y)) {
        continue;
      }
      const distance = Math.abs(spot.x - sweep.originX) + Math.abs(spot.y - sweep.originY);
      const local = (front - distance) / 4;
      if (local <= 0 || local >= 1.6) {
        continue;
      }
      const intensity = local < 1 ? local : 1.6 - local;
      ctx.fillStyle = withAlpha(color, Math.min(0.55, intensity * 0.5));
      ctx.beginPath();
      tilePath(ctx, view, spot.x, spot.y);
      ctx.fill();
    }

    ctx.restore();
  }
}

const trailBuffer: Cell[] = [];

/** 꼬리는 영토와 같은 색이지만 사선 빗금을 넣어 한눈에 구분되게 한다. */
function drawTrails(ctx: CanvasRenderingContext2D, scene: Scene, view: View): void {
  for (const runner of scene.runners) {
    if (!runner.alive || runner.trail.length === 0) {
      continue;
    }

    const cells = trailBuffer;
    cells.length = 0;
    for (const spot of runner.trail) {
      if (visible(view, spot.x, spot.y)) {
        cells.push(spot);
      }
    }
    if (cells.length === 0) {
      continue;
    }
    const color = playerStyle(runner.id).territory;

    ctx.save();
    ctx.beginPath();
    for (const spot of cells) {
      ctx.rect(view.toX(spot.x), view.toY(spot.y), view.cell, view.cell);
    }
    ctx.clip();

    ctx.fillStyle = shade(color, -0.45);
    for (const spot of cells) {
      ctx.fillRect(view.toX(spot.x), view.toY(spot.y), view.cell, view.cell);
    }

    ctx.strokeStyle = withAlpha(color, 0.85);
    ctx.lineWidth = view.cell * 0.45;
    ctx.beginPath();
    for (const spot of cells) {
      const left = view.toX(spot.x);
      const top = view.toY(spot.y);
      for (let offset = -1; offset <= 1; offset += 1) {
        ctx.moveTo(left + offset * view.cell, top + view.cell);
        ctx.lineTo(left + (offset + 1) * view.cell, top);
      }
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, view.cell * 0.12);
    ctx.beginPath();
    for (const spot of cells) {
      ctx.rect(view.toX(spot.x), view.toY(spot.y), view.cell, view.cell);
    }
    ctx.stroke();
  }
}

function drawShards(ctx: CanvasRenderingContext2D, effects: Effects, view: View): void {
  for (const shard of effects.shards) {
    if (!visible(view, shard.x, shard.y)) {
      continue;
    }
    const life = 1 - shard.ageMs / shard.lifeMs;
    const reach = shard.size * view.cell;

    ctx.save();
    ctx.translate(view.toX(shard.x), view.toY(shard.y));
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

function drawShockwaves(ctx: CanvasRenderingContext2D, effects: Effects, view: View): void {
  for (const wave of effects.shockwaves) {
    if (!visible(view, wave.x, wave.y)) {
      continue;
    }
    const progress = wave.ageMs / wave.lifeMs;
    const radius = view.cell * (1 + progress * 9);

    ctx.strokeStyle = withAlpha(wave.color, Math.max(0, 0.75 * (1 - progress)));
    ctx.lineWidth = Math.max(1.5, view.cell * 0.5 * (1 - progress));
    ctx.beginPath();
    ctx.arc(view.toX(wave.x), view.toY(wave.y), radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRunners(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  view: View,
  size: number,
  camera: Camera
): void {
  for (const runner of scene.runners) {
    if (!runner.alive) {
      continue;
    }

    const progress = runner.progress;
    const tileX = runner.prevX + (runner.x - runner.prevX) * progress + 0.5;
    const tileY = runner.prevY + (runner.y - runner.prevY) * progress + 0.5;
    if (!visible(view, tileX, tileY)) {
      continue;
    }

    const x = view.toX(tileX);
    const y = view.toY(tileY);
    const cell = view.cell;
    const color = playerStyle(runner.id).territory;

    if (runner.focus) {
      drawFocusRing(ctx, x, y, cell, size, color, scene.crosshair && camera.tiles >= scene.size);
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

    if (runner.label !== undefined) {
      drawSeatBadge(ctx, x, y, cell, color, runner.label);
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
 * 내 말을 놓치지 않도록 링을 얹는다.
 * 십자선은 보드 전체가 한 화면에 들어올 때만 — 카메라가 따라다니면 내 말은 늘 가운데다.
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

/** 킬 점수를 그 자리에 띄운다. 다른 무엇보다 위에 그린다. */
function drawScorePops(ctx: CanvasRenderingContext2D, effects: Effects, view: View): void {
  if (effects.scorePops.length === 0) {
    return;
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.max(13, view.cell * 1.7)}px "Pretendard", system-ui, sans-serif`;
  ctx.lineJoin = "round";

  for (const pop of effects.scorePops) {
    if (!visible(view, pop.x, pop.y)) {
      continue;
    }
    const progress = pop.ageMs / pop.lifeMs;
    const rise = (1 - (1 - progress) ** 2) * view.cell * 3.2;
    const alpha = progress < 0.75 ? 1 : 1 - (progress - 0.75) / 0.25;

    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = "rgba(8, 12, 22, 0.85)";
    ctx.lineWidth = Math.max(3, view.cell * 0.5);
    ctx.strokeText(pop.text, view.toX(pop.x), view.toY(pop.y) - rise);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, view.toX(pop.x), view.toY(pop.y) - rise);
  }

  ctx.restore();
}
