/**
 * 질감 타일을 굽고 벽에 깔아 준다.
 *
 * 타일은 런 시작과 리사이즈에만 굽는다. 매 프레임 하는 일은 패턴 채우기뿐이고,
 * Performance Reliability 가 이 게임의 유일한 필수 Contract 이므로 그 이상은 하지 않는다.
 *
 * 설계 근거: docs/design/margin-texture.md §4
 */
import { DEFAULT_PAINT, inkFor } from "./palette";
import type { Paint } from "./palette";
import { texturePattern } from "./pattern";
import type { TexturePattern } from "./pattern";
import type { TextureRegion } from "./bands";
import type { SectorType } from "../types";

interface Tile {
  pattern: CanvasPattern;
  /** 타일 한 변의 **장치 픽셀** 수. 패턴 정렬의 주기다 */
  px: number;
}

const MIN_TILE_PX = 8;
const MAX_TILE_PX = 1024;
/** 유형 4종 × 도료 1종 × 줌 버킷 몇 개 */
const MAX_CACHE = 12;

const cache = new Map<string, Tile>();

export interface MarginView {
  camX: number;
  zoom: number;
  offsetY: number;
  cssW: number;
  cssH: number;
  /** 캔버스 기본 변환의 배율. 타일을 장치 해상도로 구워 흐려지지 않게 한다 */
  dpr: number;
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function bake(
  ctx: CanvasRenderingContext2D,
  p: TexturePattern,
  paint: Paint,
  px: number
): Tile | null {
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const tctx = canvas.getContext("2d");
  if (!tctx) return null;

  const scale = px / p.tile;
  const { ink, accent } = inkFor(p.type, paint);

  for (const s of p.shapes) {
    if (s.kind === "band") {
      tctx.fillStyle = s.accent ? accent : ink;
      tctx.fillRect(0, (s.y - s.h / 2) * scale, px, s.h * scale);
    } else if (s.kind === "rib") {
      tctx.fillStyle = ink;
      tctx.fillRect((s.x - s.w / 2) * scale, 0, s.w * scale, px);
    } else {
      tctx.fillStyle = ink;
      // 타일 경계에서 잘린 자갈은 반대편에서 이어져야 한다
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const cx = (s.x + dx * p.tile) * scale;
          const cy = (s.y + dy * p.tile) * scale;
          const r = s.r * scale;
          if (cx + r < 0 || cx - r > px || cy + r < 0 || cy - r > px) continue;
          tctx.beginPath();
          tctx.arc(cx, cy, r, 0, Math.PI * 2);
          tctx.fill();
        }
      }
    }
  }

  const pattern = ctx.createPattern(canvas, "repeat");
  if (!pattern) return null;
  return { pattern, px };
}

function tileFor(
  ctx: CanvasRenderingContext2D,
  type: SectorType,
  paint: Paint,
  zoom: number,
  dpr: number
): Tile | null {
  const p = texturePattern(type);
  const px = Math.max(MIN_TILE_PX, Math.min(MAX_TILE_PX, Math.round(p.tile * zoom * dpr)));
  const key = `${type}:${paint.id}:${px}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = bake(ctx, p, paint, px);
  if (!made) return null;
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, made);
  return made;
}

/**
 * 네 유형을 한 번에 굽는다.
 *
 * 게으르게 구우면 그 유형이 **처음 화면에 들어오는 프레임**에 비용이 몰린다 —
 * 맥동이 3번째 섹터에 처음 나오면 주행 한복판에서 1~2ms 가 튄다. ready 상태에서
 * 미리 구워 두면 그 스파이크가 입력 전으로 옮겨진다(실측 첫 프레임 +3.7ms).
 */
export function prebakeTiles(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  dpr: number,
  paint: Paint = DEFAULT_PAINT
): void {
  for (const type of ["gorge", "corridor", "scatter", "pulse"] as const) {
    tileFor(ctx, type, paint, zoom, dpr);
  }
}

/** 도료가 바뀌거나 테스트가 처음부터 다시 재려 할 때 */
export function resetTextureCache(): void {
  cache.clear();
}

/**
 * 구간들에 질감을 깐다. 호출자가 이미 벽 인셋으로 clip 해 둔 상태여야 한다.
 *
 * 패턴은 월드에 고정된다 — 카메라만큼 밀어 주므로 패럴랙스가 1.0 이다. 1보다
 * 작게 두면 깊이감이 생기지만 화면에 두 개의 속도가 공존해 속도 축의 체감이
 * 흐려진다. 속도 축은 이 게임에서 측정 가능한 상태량이므로 그쪽을 지킨다.
 */
export function drawTexture(
  ctx: CanvasRenderingContext2D,
  regions: readonly TextureRegion[],
  view: MarginView,
  paint: Paint = DEFAULT_PAINT
): void {
  if (regions.length === 0) return;
  const { camX, zoom, offsetY, cssW, cssH, dpr } = view;

  ctx.save();
  // 이 아래로는 1단위 = 장치 픽셀 1개. 타일이 원래 해상도로 찍힌다
  ctx.scale(1 / dpr, 1 / dpr);
  const wDev = cssW * dpr;
  const hDev = cssH * dpr;

  for (const r of regions) {
    if (r.alpha <= 0.004) continue;
    const tile = tileFor(ctx, r.type, paint, zoom, dpr);
    if (!tile) continue;

    const x0 = (r.x0 - camX) * zoom * dpr;
    const x1 = (r.x1 - camX) * zoom * dpr;
    if (x1 <= 0 || x0 >= wDev) continue;

    const ox = mod(-camX * zoom * dpr, tile.px);
    const oy = mod(offsetY * dpr, tile.px);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, -hDev, x1 - x0, hDev * 3);
    ctx.clip();
    ctx.globalAlpha = r.alpha;
    ctx.translate(ox, oy);
    ctx.fillStyle = tile.pattern;
    ctx.fillRect(-ox, -oy - hDev, wDev + tile.px, hDev * 3);
    ctx.restore();
  }

  ctx.restore();
}
