import { RAMPS } from "./palette";
import { Rng } from "../game/rng";
import type { Artifact, Shape } from "../game/types";

export const SPRITE_SIZE = 32;

/**
 * 절차적 유물 스프라이트. `(shape, palette, seed)` 가 같으면 항상 같은 32×32가 나온다.
 *
 * 실물 재현이 목적이 아니다 — 한눈에 구분되고 팔레트가 통일된 도트가 목적이고,
 * 실존성은 이름·연대·소장처·내력 텍스트가 담보한다(notes/mda.md §7.4).
 */

type Mask = Float32Array; // 0 = 빈 칸, >0 = 두께(명암 계산용)

function idx(x: number, y: number) {
  return y * SPRITE_SIZE + x;
}

function ellipse(mask: Mask, cx: number, cy: number, rx: number, ry: number, weight = 1) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(31, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(31, Math.ceil(cx + rx)); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight * (1 - d * 0.55));
    }
  }
}

function rect(mask: Mask, x0: number, y0: number, x1: number, y1: number, weight = 1) {
  for (let y = Math.max(0, y0); y <= Math.min(31, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(31, x1); x++) {
      mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

function triangle(mask: Mask, cx: number, top: number, bottom: number, halfWidth: number, weight = 1) {
  for (let y = top; y <= bottom; y++) {
    const k = (y - top) / Math.max(1, bottom - top);
    const half = Math.round(halfWidth * k);
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 32 && y >= 0 && y < 32) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

function carve(mask: Mask, x0: number, y0: number, x1: number, y1: number) {
  for (let y = Math.max(0, y0); y <= Math.min(31, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(31, x1); x++) mask[idx(x, y)] = 0;
  }
}

function buildMask(shape: Shape, rng: Rng): Mask {
  const m = new Float32Array(SPRITE_SIZE * SPRITE_SIZE);
  switch (shape) {
    case "jar": {
      const belly = 8 + rng.int(0, 3);
      ellipse(m, 16, 20, belly, 9);
      rect(m, 13, 8, 18, 14, 0.9);
      rect(m, 11, 5, 20, 8, 1);
      rect(m, 12, 28, 19, 30, 0.85);
      break;
    }
    case "sword": {
      rect(m, 15, 2, 16, 20);
      rect(m, 14, 4, 17, 19, 0.85);
      rect(m, 8, 20, 23, 22);
      rect(m, 15, 22, 16, 28, 0.9);
      ellipse(m, 16, 29, 3, 2);
      break;
    }
    case "crown": {
      rect(m, 6, 20, 25, 27);
      triangle(m, 16, 5, 20, 4);
      triangle(m, 9, 10, 20, 3);
      triangle(m, 23, 10, 20, 3);
      break;
    }
    case "mask": {
      ellipse(m, 16, 17, 9, 12);
      carve(m, 11, 14, 13, 16);
      carve(m, 18, 14, 20, 16);
      carve(m, 14, 22, 17, 23);
      break;
    }
    case "scroll": {
      rect(m, 4, 6, 27, 8);
      rect(m, 4, 25, 27, 27);
      rect(m, 6, 9, 25, 24, 0.85);
      for (let i = 0; i < 4; i++) carve(m, 9, 11 + i * 3, 22, 11 + i * 3);
      break;
    }
    case "coin": {
      ellipse(m, 16, 16, 13, 13);
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const d = Math.hypot(x - 15.5, y - 15.5);
          if (d > 8.5 && d < 10) m[idx(x, y)] *= 0.72;
        }
      break;
    }
    case "tablet": {
      rect(m, 6, 3, 25, 29);
      for (let i = 0; i < 6; i++) carve(m, 9, 7 + i * 4, 22, 7 + i * 4);
      break;
    }
    case "statue": {
      ellipse(m, 16, 8, 5, 6);
      triangle(m, 16, 30, 13, 9);
      rect(m, 12, 26, 19, 30, 0.9);
      break;
    }
    case "ornament": {
      ellipse(m, 16, 10, 7, 6);
      rect(m, 15, 16, 16, 19, 0.9);
      ellipse(m, 16, 23, 5, 6);
      ellipse(m, 7, 20, 3, 4, 0.9);
      ellipse(m, 25, 20, 3, 4, 0.9);
      break;
    }
    case "mechanism": {
      ellipse(m, 13, 14, 9, 9);
      ellipse(m, 23, 22, 6, 6);
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) {
          const d1 = Math.hypot(x - 12.5, y - 13.5);
          const d2 = Math.hypot(x - 22.5, y - 21.5);
          if ((d1 > 4 && d1 < 5.5) || (d2 > 2.5 && d2 < 3.6)) m[idx(x, y)] *= 0.7;
        }
      break;
    }
  }
  return m;
}

/** 시드 기반 좌우대칭 장식. 유물마다 다른 표면 무늬가 생긴다 */
function decorate(mask: Mask, rng: Rng) {
  const marks = 3 + rng.int(0, 4);
  for (let i = 0; i < marks; i++) {
    const x = 4 + rng.int(0, 11);
    const y = 5 + rng.int(0, 22);
    const h = 1 + rng.int(0, 3);
    for (let dy = 0; dy < h; dy++) {
      const yy = y + dy;
      if (yy > 31) break;
      for (const xx of [x, 31 - x]) {
        const at = idx(xx, yy);
        if (mask[at] > 0) mask[at] *= 0.68;
      }
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function renderSprite(artifact: Artifact): ImageData | null {
  if (typeof ImageData === "undefined") return null;
  const rng = new Rng(artifact.seed);
  const mask = buildMask(artifact.shape, rng);
  decorate(mask, rng);

  const { outline, ramp } = RAMPS[artifact.palette];
  const outlineRgb = hexToRgb(outline);
  const rampRgb = ramp.map(hexToRgb);
  const data = new Uint8ClampedArray(SPRITE_SIZE * SPRITE_SIZE * 4);

  const solid = (x: number, y: number) =>
    x >= 0 && x < 32 && y >= 0 && y < 32 && mask[idx(x, y)] > 0;

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const at = idx(x, y);
      const o = at * 4;
      const v = mask[at];
      if (v <= 0) continue;

      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
      if (edge) {
        data[o] = outlineRgb[0];
        data[o + 1] = outlineRgb[1];
        data[o + 2] = outlineRgb[2];
        data[o + 3] = 255;
        continue;
      }
      // 광원은 좌상단. 명암 3단 + 하이라이트
      const light = 0.45 + 0.55 * v - (y / 31) * 0.35 + ((31 - x) / 31) * 0.2;
      const level = Math.max(0, Math.min(3, Math.floor(light * 3.4)));
      const c = rampRgb[level];
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return new ImageData(data, SPRITE_SIZE, SPRITE_SIZE);
}

const cache = new Map<string, string>();

/** 32×32 스프라이트를 data URL 로 굽는다. 유물 id 단위로 캐시된다 */
export function spriteUrl(artifact: Artifact): string {
  const hit = cache.get(artifact.id);
  if (hit) return hit;
  const image = renderSprite(artifact);
  if (!image || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL();
  cache.set(artifact.id, url);
  return url;
}
