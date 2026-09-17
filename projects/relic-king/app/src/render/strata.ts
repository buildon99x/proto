import { PALETTE } from "./palette";
import { LAYERS_PER_SITE, layerCost } from "../game/balance";
import { nextRandom } from "../game/rng";
import type { SiteId } from "../game/types";

export const STRATA_W = 240;
export const STRATA_H = 360;
const BAND = 72;
const HEAD_Y = 118;
const SHAFT_X0 = 92;
const SHAFT_X1 = 148;

export type StrataView = {
  site: SiteId;
  layer: number;
  layerProgress: number;
  time: number;
  digging: boolean;
  siteSeed: number;
};

function hash(x: number, y: number, seed: number): number {
  return nextRandom(((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0)[0];
}

function soilColor(layerIndex: number, seed: number): string {
  const rock = layerIndex >= 9;
  const pool = rock ? PALETTE.rock : PALETTE.soil;
  return pool[(layerIndex + seed) % pool.length];
}

/**
 * 지층 단면. 깊이가 곧 진척이고 곧 연대다 — 방치형의 우상향을 숫자가 아니라
 * 그림으로 보여주는 자리(notes/mda.md §8-2).
 */
export function drawStrata(ctx: CanvasRenderingContext2D, view: StrataView) {
  const { layer, layerProgress, site, time, digging, siteSeed } = view;
  const frac = Math.min(1, layerProgress / layerCost(site, Math.min(layer, LAYERS_PER_SITE)));
  const depth = layer - 1 + frac;
  const camera = depth * BAND - HEAD_Y;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PALETTE.sky;
  ctx.fillRect(0, 0, STRATA_W, STRATA_H);

  const first = Math.max(0, Math.floor(camera / BAND) - 1);
  const last = Math.min(LAYERS_PER_SITE - 1, first + Math.ceil(STRATA_H / BAND) + 1);

  for (let li = first; li <= last; li++) {
    const top = li * BAND - camera;
    ctx.fillStyle = soilColor(li, siteSeed);
    ctx.fillRect(0, top, STRATA_W, BAND);

    // 흙 알갱이 — 좌표 해시라 스크롤해도 제자리에 있다
    for (let i = 0; i < 90; i++) {
      const hx = Math.floor(hash(li * 97 + i, 1, siteSeed) * STRATA_W);
      const hy = Math.floor(hash(li * 97 + i, 2, siteSeed) * BAND);
      const shade = hash(li * 97 + i, 3, siteSeed);
      ctx.fillStyle = shade > 0.55 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
      const s = shade > 0.9 ? 2 : 1;
      ctx.fillRect(hx, top + hy, s, s);
    }

    // 층 경계
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(0, top, STRATA_W, 2);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, top + 2, STRATA_W, 1);

    // 층 번호 (도트 눈금)
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let t = 0; t <= li && t < 12; t++) ctx.fillRect(4, top + 6 + t * 3, t % 5 === 4 ? 6 : 3, 2);
  }

  // 파낸 수갱
  const shaftBottom = depth * BAND - camera;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(SHAFT_X0, -camera < 0 ? 0 : -camera, SHAFT_X1 - SHAFT_X0, shaftBottom - Math.max(0, -camera));
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(SHAFT_X0, Math.max(0, -camera), 2, shaftBottom - Math.max(0, -camera));

  // 갱목
  for (let y = Math.max(0, -camera); y < shaftBottom - 20; y += 46) {
    ctx.fillStyle = "#6f4a2d";
    ctx.fillRect(SHAFT_X0 - 3, y, SHAFT_X1 - SHAFT_X0 + 6, 3);
  }

  drawDigger(ctx, shaftBottom, time, digging);

  // 지층에 박힌 유물 실루엣 — 아직 캐지 않은 것들
  for (let li = first; li <= last; li++) {
    const top = li * BAND - camera;
    for (let i = 0; i < 3; i++) {
      const gx = Math.floor(hash(li * 31 + i, 11, siteSeed) * (STRATA_W - 30)) + 8;
      const gy = Math.floor(hash(li * 31 + i, 12, siteSeed) * (BAND - 24)) + 12;
      if (gx > SHAFT_X0 - 16 && gx < SHAFT_X1 + 4) continue;
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.fillRect(gx, top + gy, 7, 5);
      ctx.fillStyle = "rgba(255,240,200,0.10)";
      ctx.fillRect(gx + 1, top + gy + 1, 5, 2);
    }
  }

  if (digging) {
    for (let i = 0; i < 10; i++) {
      const p = (time * 40 + i * 37) % 60;
      const px = SHAFT_X0 + 6 + ((i * 13) % (SHAFT_X1 - SHAFT_X0 - 12));
      ctx.fillStyle = `rgba(200,180,140,${Math.max(0, 0.5 - p / 60)})`;
      ctx.fillRect(px, shaftBottom - 6 - p * 0.4, 1, 1);
    }
  }

  // 지표 하늘
  if (camera < 0) {
    ctx.fillStyle = PALETTE.sky;
    ctx.fillRect(0, 0, STRATA_W, -camera);
    ctx.fillStyle = "#3d5165";
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(hash(i, 7, siteSeed) * STRATA_W);
      const sy = Math.floor(hash(i, 8, siteSeed) * Math.max(1, -camera));
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  // 비네트
  const grad = ctx.createLinearGradient(0, 0, 0, STRATA_H);
  grad.addColorStop(0, "rgba(0,0,0,0.35)");
  grad.addColorStop(0.35, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STRATA_W, STRATA_H);
}

function drawDigger(ctx: CanvasRenderingContext2D, floorY: number, time: number, digging: boolean) {
  const x = 112;
  const y = Math.min(STRATA_H - 6, floorY) - 16;
  const swing = digging ? Math.sin(time * 6) : 0;

  ctx.fillStyle = "rgba(255,225,150,0.10)"; // 헤드램프 불빛
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 2);
  ctx.lineTo(x + 30, y + 22);
  ctx.lineTo(x - 18, y + 22);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#e6c79b"; // 얼굴
  ctx.fillRect(x + 3, y, 7, 6);
  ctx.fillStyle = "#4d6084"; // 몸
  ctx.fillRect(x + 1, y + 6, 11, 9);
  ctx.fillStyle = "#33405a"; // 다리
  ctx.fillRect(x + 2, y + 15, 4, 5);
  ctx.fillRect(x + 8, y + 15, 4, 5);
  ctx.fillStyle = "#e0a92e"; // 헬멧
  ctx.fillRect(x + 2, y - 3, 9, 4);
  ctx.fillStyle = "#fff3c4";
  ctx.fillRect(x + 9, y - 1, 2, 2);

  // 곡괭이
  const px = x + 13;
  const py = y + 5 + Math.round(swing * 4);
  ctx.fillStyle = "#6f4a2d";
  ctx.fillRect(px, py, 2, 10);
  ctx.fillStyle = "#c3ced6";
  ctx.fillRect(px - 3, py - 2, 9, 2);
  ctx.fillRect(px + 5, py - 1, 2, 3);
}
