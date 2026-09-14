import { cameraX, computeView } from "./camera";
import { currentStage, stageLength } from "./engine";
import { sample } from "./stages";
import type { GameState } from "./engine";

const COLOR = {
  bg: "#070b14",
  wall: "#121a2e",
  wallEdge: "#3de1ff",
  block: "#ff5e7a",
  blockEdge: "#ffd0d8",
  player: "#ffe66d",
  trail: "#ffe66d",
  finish: "#7dffb0",
  dim: "rgba(7, 11, 20, 0.72)",
  text: "#e8f1ff",
  textDim: "#7f90ad"
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, cssW: number, cssH: number): void {
  const t = state.tuning;
  const stage = currentStage(state);
  const view = computeView(cssW, cssH, t);
  const camX = cameraX(state.x, view, t);
  const offsetY = (cssH - t.worldHeight * view.zoom) / 2;

  const sx = (wx: number) => (wx - camX) * view.zoom;
  const sy = (wy: number) => wy * view.zoom + offsetY;

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  // 통로 바깥을 벽으로 칠한다. 화면 픽셀 간격으로 경계를 샘플링.
  const stepPx = 4;
  const topPts: Array<[number, number]> = [];
  const botPts: Array<[number, number]> = [];
  for (let px = -stepPx; px <= cssW + stepPx; px += stepPx) {
    const wx = camX + px / view.zoom;
    const { top, bot } = sample(stage.nodes, wx);
    topPts.push([px, sy(top)]);
    botPts.push([px, sy(bot)]);
  }

  ctx.fillStyle = COLOR.wall;
  ctx.beginPath();
  ctx.moveTo(-stepPx, -cssH);
  for (const [px, py] of topPts) ctx.lineTo(px, py);
  ctx.lineTo(cssW + stepPx, -cssH);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-stepPx, cssH * 2);
  for (const [px, py] of botPts) ctx.lineTo(px, py);
  ctx.lineTo(cssW + stepPx, cssH * 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = COLOR.wallEdge;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLOR.wallEdge;
  ctx.shadowBlur = 10;
  for (const pts of [topPts, botPts]) {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // 이빨
  for (const b of stage.blocks) {
    const bx = sx(b.x);
    if (bx > cssW + 40 || bx + b.w * view.zoom < -40) continue;
    ctx.fillStyle = COLOR.block;
    ctx.shadowColor = COLOR.block;
    ctx.shadowBlur = 12;
    roundRect(ctx, bx, sy(b.y), b.w * view.zoom, b.h * view.zoom, 2 * view.zoom * 0.4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLOR.blockEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 종료선
  const finishX = sx(stageLength(stage));
  if (finishX < cssW + 20) {
    ctx.strokeStyle = COLOR.finish;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.shadowColor = COLOR.finish;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(finishX, 0);
    ctx.lineTo(finishX, cssH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
  }

  // 잔상
  if (state.trail.length > 1) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < state.trail.length; i += 1) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      const alpha = (i / state.trail.length) * 0.55;
      ctx.strokeStyle = `rgba(255, 230, 109, ${alpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(1, t.radius * view.zoom * 0.5 * (i / state.trail.length));
      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
    }
  }

  // 아바타 — 진행 방향으로 기운 삼각형
  const px = sx(state.x);
  const py = sy(state.y);
  const r = t.radius * view.zoom;
  const angle = Math.atan2(state.vy, t.speed);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.fillStyle = state.phase === "dead" ? COLOR.block : COLOR.player;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = state.phase === "dead" ? 24 : 14;
  ctx.beginPath();
  ctx.moveTo(r * 1.7, 0);
  ctx.lineTo(-r * 1.1, -r * 1.05);
  ctx.lineTo(-r * 0.45, 0);
  ctx.lineTo(-r * 1.1, r * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;

  if (state.phase === "dead") {
    const k = Math.min(1, (state.sincePhase * 1000) / t.retryDelayMs);
    ctx.strokeStyle = `rgba(255, 94, 122, ${(1 - k).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, r + k * r * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.phase === "ready" || state.phase === "cleared") {
    ctx.fillStyle = COLOR.dim;
    ctx.fillRect(0, 0, cssW, cssH);
    const cx = cssW / 2;
    const cy = cssH / 2;
    ctx.textAlign = "center";

    if (state.phase === "ready") {
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`STAGE ${stage.id}`, cx, cy - 46);
      ctx.fillStyle = COLOR.text;
      ctx.font = "700 30px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(stage.name, cx, cy - 10);
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "400 14px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(stage.asks, cx, cy + 20);
      ctx.fillStyle = COLOR.player;
      ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("누르면 오른다", cx, cy + 58);
    } else {
      ctx.fillStyle = COLOR.finish;
      ctx.font = "700 34px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("CLEAR", cx, cy - 8);
      ctx.fillStyle = COLOR.textDim;
      ctx.font = "400 14px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${state.elapsed.toFixed(2)}초 · 시도 ${state.attempts}회`, cx, cy + 22);
      if (state.sincePhase > 0.5) {
        ctx.fillStyle = COLOR.text;
        ctx.fillText("계속하려면 누르세요", cx, cy + 56);
      }
    }
  }
}
