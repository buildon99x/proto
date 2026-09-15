import { AXES, AXIS_COLOR } from "./axes";
import { cameraX, computeView } from "./camera";
import { pieceAt } from "./course";
import { gateLanes, squeezeBounds } from "./engine";
import type { GameState } from "./engine";
import { sample, shutterDepth } from "./sectors";
import type { AxisTrade, Block } from "./types";

const COLOR = {
  bg: "#070b14",
  wall: "#121a2e",
  wallEdge: "#3de1ff",
  block: "#ff5e7a",
  blockEdge: "#ffd0d8",
  player: "#ffe66d",
  finish: "#7dffb0",
  dim: "rgba(7, 11, 20, 0.74)",
  text: "#e8f1ff",
  textDim: "#7f90ad"
};

interface Bounds {
  top: number;
  bot: number;
  divTop: number | null;
  divBot: number | null;
}

function boundsAt(state: GameState, worldX: number): Bounds {
  const piece = pieceAt(state.course, worldX);
  if (!piece) return { top: 20, bot: 80, divTop: null, divBot: null };
  if (piece.kind === "sector" && piece.sector) {
    const { top, bot } = squeezeBounds(
      sample(piece.sector.nodes, worldX - piece.startX),
      piece.squeeze ?? 1
    );
    return { top, bot, divTop: null, divBot: null };
  }
  if (piece.kind === "gate" && piece.gate) {
    const l = gateLanes(piece.gate, worldX, state.tuning);
    return { top: l.outerTop, bot: l.outerBot, divTop: l.dividerTop, divBot: l.dividerBot };
  }
  return { top: 20, bot: 80, divTop: null, divBot: null };
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

/**
 * 빌드가 궤적의 색이 된다. HUD 를 늘리지 않고 빌드를 보여주는 유일한 자리이고,
 * 빌드가 다르면 스크린샷 한 장으로 구분되는 근거이기도 하다.
 */
export function buildColor(state: GameState): [number, number, number] {
  let [r, g, b] = hexToRgb(COLOR.player);
  const cap = Math.max(1, state.base.axisMax);
  for (const axis of AXES) {
    const w = Math.max(0, state.build[axis]) / cap;
    if (w <= 0) continue;
    const [ar, ag, ab] = hexToRgb(AXIS_COLOR[axis]);
    r += (ar - r) * w * 0.7;
    g += (ag - g) * w * 0.7;
    b += (ab - b) * w * 0.7;
  }
  return [Math.round(r), Math.round(g), Math.round(b)];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** 관 입구의 교환 표시. 글자 없이 색과 방향으로만 말한다. */
function drawTradeMark(
  ctx: CanvasRenderingContext2D,
  trade: AxisTrade,
  cx: number,
  cy: number,
  size: number
) {
  const plus = AXIS_COLOR[trade.plus];
  const minus = AXIS_COLOR[trade.minus];

  ctx.save();
  ctx.translate(cx, cy);
  // 위로 향한 두꺼운 쐐기 = 오르는 축
  ctx.fillStyle = plus;
  ctx.shadowColor = plus;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.75);
  ctx.lineTo(size * 0.62, size * 0.1);
  ctx.lineTo(size * 0.24, size * 0.1);
  ctx.lineTo(size * 0.24, size * 0.42);
  ctx.lineTo(-size * 0.24, size * 0.42);
  ctx.lineTo(-size * 0.24, size * 0.1);
  ctx.lineTo(-size * 0.62, size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // 아래 가느다란 막대 = 내리는 축
  ctx.fillStyle = minus;
  roundRect(ctx, -size * 0.55, size * 0.62, size * 1.1, size * 0.26, size * 0.13);
  ctx.fill();
  ctx.restore();
}

/**
 * 주행 표시.
 *
 * brief 의 "HUD 없음"은 **시선 예산**을 지키려는 조항이었다 — 화면 정보가 늘면
 * 통로에서 눈을 떼야 하고 그것이 곧 난이도다. 그래서 표시를 없애는 대신 시선을
 * 요구하지 않는 자리로 밀었다.
 *
 *  - 레일은 화면 맨 위 3px 이고 숫자가 없다. 초점이 아니라 **주변시**로 읽힌다.
 *  - 숫자는 좌상단, 즉 아바타(`cameraAnchor` 0.28)의 **뒤쪽**이다. 선행 가시는
 *    아바타에서 오른쪽으로 훑으므로, 그 시선 경로와 겹치지 않는 유일한 구석이다.
 *  - 그래도 0 은 아니므로 끌 수 있다(H). 끄면 3단계까지의 무표시 주행 그대로다.
 *
 * 기록과의 비교는 **거짓말하지 않는 것만** 표시한다. Endless 는 지금 거리가 최고
 * 거리를 넘었는가(참·거짓이 확정된다), Stage 는 경과가 최고 기록을 넘었는가(넘은
 * 순간 이번 주행의 경신은 불가능이 확정된다). 빌드마다 속도가 다르므로 "기록 페이스
 * 대비 앞서는가"는 주행 궤적을 저장하지 않는 한 추정일 뿐이고, 추정을 기록처럼
 * 보여주지는 않는다.
 */
function drawHud(ctx: CanvasRenderingContext2D, state: GameState, cssW: number, cssH: number): void {
  const railH = 3;
  const isEndless = state.mode === "endless";
  const record = state.record;

  // 레일이 채워지는 범위. Endless 는 최고 거리를 80% 지점에 두어 **넘어서는 것이 보이게** 한다.
  const railMax = isEndless ? record * 1.25 : state.course.finishX;
  const progress = railMax > 0 && Number.isFinite(railMax) ? Math.min(1, Math.max(0, state.x / railMax)) : 0;
  const beatRecord = isEndless && record > 0 && state.x > record;
  const lostRecord = !isEndless && record > 0 && state.elapsed > record;

  ctx.save();
  ctx.fillStyle = "rgba(232, 241, 255, 0.1)";
  ctx.fillRect(0, 0, cssW, railH);

  if (progress > 0) {
    ctx.fillStyle = beatRecord ? COLOR.finish : COLOR.wallEdge;
    ctx.globalAlpha = beatRecord ? 0.95 : 0.5;
    if (beatRecord) {
      ctx.shadowColor = COLOR.finish;
      ctx.shadowBlur = 10;
    }
    ctx.fillRect(0, 0, cssW * progress, railH);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // 최고 거리 눈금. 넘어야 할 선이 화면에 실제로 그어져 있다.
  if (isEndless && record > 0) {
    ctx.fillStyle = COLOR.finish;
    ctx.globalAlpha = beatRecord ? 0.55 : 0.85;
    ctx.fillRect(Math.round(cssW * 0.8) - 1, 0, 2, railH + 4);
    ctx.globalAlpha = 1;
  }

  const size = Math.round(Math.max(13, Math.min(20, cssH * 0.03)));
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = beatRecord
    ? COLOR.finish
    : lostRecord
      ? "rgba(127, 144, 173, 0.34)"
      : "rgba(232, 241, 255, 0.4)";
  ctx.fillText(
    isEndless ? `${Math.round(state.x)}m` : `${state.elapsed.toFixed(1)}초`,
    14,
    railH + 9
  );
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, cssW: number, cssH: number): void {
  const t = state.tuning;
  const view = computeView(cssW, cssH, t);
  const camX = cameraX(state.x, view, t);
  const offsetY = (cssH - t.worldHeight * view.zoom) / 2;

  const sx = (wx: number) => (wx - camX) * view.zoom;
  const sy = (wy: number) => wy * view.zoom + offsetY;

  if (state.endless) state.endless.ensure(camX + view.viewWorldW + 200);

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const stepPx = 4;
  const topPts: Array<[number, number]> = [];
  const botPts: Array<[number, number]> = [];
  const divider: Array<[number, number, number]> = [];
  for (let px = -stepPx; px <= cssW + stepPx; px += stepPx) {
    const wx = camX + px / view.zoom;
    const b = boundsAt(state, wx);
    topPts.push([px, sy(b.top)]);
    botPts.push([px, sy(b.bot)]);
    if (b.divTop !== null && b.divBot !== null) divider.push([px, sy(b.divTop), sy(b.divBot)]);
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

  // 칸막이 — 구멍 두 개가 아니라 길이 둘로 갈라진 것으로 읽혀야 한다
  if (divider.length > 1) {
    ctx.fillStyle = COLOR.wall;
    ctx.beginPath();
    ctx.moveTo(divider[0][0], divider[0][1]);
    for (const [px, dt] of divider) ctx.lineTo(px, dt);
    for (let i = divider.length - 1; i >= 0; i -= 1) ctx.lineTo(divider[i][0], divider[i][2]);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = COLOR.wallEdge;
  ctx.lineWidth = 2;
  ctx.shadowColor = COLOR.wallEdge;
  ctx.shadowBlur = 10;
  for (const pts of [topPts, botPts]) {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.stroke();
  }
  if (divider.length > 1) {
    for (const idx of [1, 2]) {
      ctx.beginPath();
      divider.forEach((d, i) => (i === 0 ? ctx.moveTo(d[0], d[idx]) : ctx.lineTo(d[0], d[idx])));
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // 섹터 장애물과 셔터
  const fromX = camX - 60;
  const toX = camX + view.viewWorldW + 60;
  for (const piece of state.course.pieces) {
    if (piece.endX < fromX || piece.startX > toX) continue;
    if (piece.kind === "sector" && piece.sector) {
      const base = piece.startX;
      const drawRect = (b: Block) => {
        ctx.fillStyle = COLOR.block;
        ctx.shadowColor = COLOR.block;
        ctx.shadowBlur = 12;
        roundRect(ctx, sx(base + b.x), sy(b.y), b.w * view.zoom, b.h * view.zoom, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = COLOR.blockEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      for (const b of piece.sector.blocks) drawRect(b);
      for (const s of piece.sector.shutters) {
        const depth = shutterDepth(s, state.elapsed);
        if (depth <= 0.2) continue;
        const { top, bot } = squeezeBounds(sample(piece.sector.nodes, s.x), piece.squeeze ?? 1);
        drawRect(
          s.side === "top"
            ? { x: s.x, y: top, w: s.w, h: depth }
            : { x: s.x, y: bot - depth, w: s.w, h: depth }
        );
      }
    }
    if (piece.kind === "gate" && piece.gate) {
      const g = piece.gate;
      const markX = sx((g.startX + g.endX) / 2);
      const size = 7 * view.zoom;
      drawTradeMark(ctx, g.top, markX, sy(50 - 15), size);
      drawTradeMark(ctx, g.bot, markX, sy(50 + 15), size);
    }
  }

  if (Number.isFinite(state.course.finishX)) {
    const finishX = sx(state.course.finishX);
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
  }

  const [cr, cg, cb] = buildColor(state);

  if (state.trail.length > 1) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < state.trail.length; i += 1) {
      const a = state.trail[i - 1];
      const b = state.trail[i];
      const k = i / state.trail.length;
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${(k * 0.55).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, t.radius * view.zoom * 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
    }
  }

  const px = sx(state.x);
  const py = sy(state.y);
  const r = t.radius * view.zoom;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(state.vy, Math.max(1e-6, t.speed)));
  ctx.fillStyle = state.phase === "dead" ? COLOR.block : `rgb(${cr}, ${cg}, ${cb})`;
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

  // 교환 직후 0.6초 — 무엇이 올랐는지 글자 없이 알린다
  if (state.lastTrade && state.elapsed - state.lastTrade.at < 0.6) {
    const k = 1 - (state.elapsed - state.lastTrade.at) / 0.6;
    ctx.strokeStyle = AXIS_COLOR[state.lastTrade.trade.plus];
    ctx.globalAlpha = k;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, r * 1.5 + (1 - k) * r * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (state.phase === "dead") {
    const k = Math.min(1, (state.sincePhase * 1000) / Math.max(1, t.retryDelayMs));

    // 지나갈 수 있었던 자리. 정지 화면을 넣으면 재시도 루프가 죽으므로
    // 사망 순간의 연출로만 원인을 알린다.
    if (state.deathGap) {
      for (const span of state.deathGap) {
        ctx.fillStyle = `rgba(125, 255, 176, ${(0.3 * (1 - k)).toFixed(3)})`;
        ctx.fillRect(px - r * 2, sy(span.lo), r * 5, (span.hi - span.lo) * view.zoom);
        ctx.strokeStyle = `rgba(125, 255, 176, ${(0.85 * (1 - k)).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - r * 2, sy(span.lo));
        ctx.lineTo(px + r * 3, sy(span.lo));
        ctx.moveTo(px - r * 2, sy(span.hi));
        ctx.lineTo(px + r * 3, sy(span.hi));
        ctx.stroke();
      }
    }

    ctx.strokeStyle = `rgba(255, 94, 122, ${(1 - k).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, r + k * r * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 주행 표시는 맨 마지막이다 — 통로 위에 겹치는 것이 아니라 화면 가장자리에 얹힌다.
  //
  // Stage 는 사망 중에도 그린다. 0.5초 뒤 스스로 재시작하므로 그 사이 표시가 사라지면
  // 깜빡임이 된다. Endless 는 사망이 곧 런의 끝이고 결과 오버레이가 덮으므로 끈다 —
  // 오버레이 위로 삐져나온 숫자는 같은 값을 두 번 말하는 것이다.
  const hudPhase = state.phase === "running" || (state.phase === "dead" && state.mode === "stage");
  if (state.hud && hudPhase) drawHud(ctx, state, cssW, cssH);

  // 연습 모드 체크포인트 — 다시 시작될 지점
  if (state.config.practice && state.checkpoints.length > 0) {
    const cp = state.checkpoints[state.checkpoints.length - 1];
    const cx = sx(cp.x);
    if (cx > -40 && cx < cssW + 40) {
      ctx.strokeStyle = "rgba(125, 255, 176, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, cssH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
