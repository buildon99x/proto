import { AXES, AXIS_COLOR } from "./axes";
import { cameraX, computeView } from "./camera";
import { pieceAt } from "./course";
import { runnerById, silhouetteOf } from "./runners";
import { gateLanes, squeezeBounds } from "./engine";
import type { GameState } from "./engine";
import { sample, shutterDepth } from "./sectors";
import type { AxisTrade, Block } from "./types";

/**
 * ## 명도가 의미를 따른다
 *
 * 첫 판본은 벽(`#121a2e`)이 통로(`#070b14`)보다 **2.4배 밝았다.** 죽는 영역이 밝고 살
 * 길이 어두우면 순간 판단의 반사가 정확히 반대로 걸린다 — 위쪽 벽이 하늘처럼, 통로가
 * 터널처럼 읽혔다. 이제 통로가 밝고 벽이 거의 검다. 벽 폴리곤은 레터박스까지 덮으므로
 * 화면 위아래의 남는 띠도 "갈 수 없는 곳"으로 같이 읽힌다.
 *
 * ## 벽은 축이 아니다
 *
 * `wallEdge` 가 `AXIS_COLOR.slope` 와 **같은 `#3de1ff`** 였다. 그래서 각도 축 쐐기가 벽과
 * 같은 색이고, 각도가 오른 교환 펄스가 벽 색으로 번지고, 각도를 올린 빌드의 아바타가
 * 벽 계열로 흡수됐다. 축 팔레트는 빌드 전용이므로 벽을 중성 은청으로 뺐다.
 */
const COLOR = {
  bg: "#0d1322",
  wall: "#04070e",
  wallEdge: "#9fb4d8",
  block: "#ff5e7a",
  blockEdge: "#ffd0d8",
  player: "#ffe66d",
  finish: "#7dffb0"
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
/**
 * 한 관의 교환 표식. 위 쐐기 = 오르는 축, 아래 막대 = 내리는 축.
 *
 * **위계가 결정과 반대였다.** 쐐기는 크고 빛나는데 막대는 두께 0.26 의 실선이었다.
 * 그런데 두 관의 `plus` 가 같은 축인 경우가 흔하고(그때 쐐기는 판별에 아무 기여를 못
 * 한다), 선택의 절반 이상은 "무엇을 내주는가"다. 막대를 쐐기와 같은 위계로 올렸다.
 *
 * `dimPlus` 는 두 관의 오르는 축이 **실제로 같을 때만** 켜진다. 그때 쐐기는 선택과
 * 무관한 정보이므로 죽이는 것이 과장이 아니라 사실의 반영이다.
 */
function drawTradeMark(
  ctx: CanvasRenderingContext2D,
  trade: AxisTrade,
  cx: number,
  cy: number,
  size: number,
  dimPlus: boolean
) {
  const plus = AXIS_COLOR[trade.plus];
  const minus = AXIS_COLOR[trade.minus];

  ctx.save();
  ctx.translate(cx, cy);
  // 위로 향한 쐐기 = 오르는 축
  ctx.globalAlpha = dimPlus ? 0.42 : 1;
  ctx.fillStyle = plus;
  ctx.shadowColor = plus;
  ctx.shadowBlur = dimPlus ? 0 : 12;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.62);
  ctx.lineTo(size * 0.5, size * 0.06);
  ctx.lineTo(size * 0.2, size * 0.06);
  ctx.lineTo(size * 0.2, size * 0.34);
  ctx.lineTo(-size * 0.2, size * 0.34);
  ctx.lineTo(-size * 0.2, size * 0.06);
  ctx.lineTo(-size * 0.5, size * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  // 아래 막대 = 내리는 축. 쐐기와 같은 무게로 — 내주는 것이 절반의 정보다
  ctx.fillStyle = minus;
  ctx.shadowColor = minus;
  ctx.shadowBlur = 12;
  roundRect(ctx, -size * 0.55, size * 0.54, size * 1.1, size * 0.46, size * 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;
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

  /**
   * 근접 강조 — 아바타 코앞 구간의 **실제 여유 거리**의 함수다.
   *
   * 과장이 아니라 계측의 표시다. 여유가 히트박스 3배 안으로 들어오면 그 구간의 벽이
   * 밝고 굵어진다. 사람이 이미 아는 것을 크게 보여 주는 게 아니라, 화면 밖에서 재던
   * 값을 화면 안으로 옮기는 것이다.
   */
  const playerPx = sx(state.x);
  const playerPy = sy(state.y);
  const rPx = t.radius * view.zoom;
  let nearest = Infinity;
  for (const pts of [topPts, botPts]) {
    for (const [px, py] of pts) {
      if (px < playerPx - rPx * 2 || px > playerPx + rPx * 6) continue;
      nearest = Math.min(nearest, Math.abs(py - playerPy));
    }
  }
  const near = Math.max(0, 1 - Math.max(0, nearest - rPx) / (rPx * 3));

  /**
   * 글로우는 `shadowBlur` 이 아니라 2패스 스트로크다. Canvas2D 의 그림자는 DPR2 에서
   * 화면 전체 재래스터화라, 세그먼트 100개짜리 폴리라인 넷에 걸면 모바일 프레임 예산을
   * 혼자 먹는다. 굵고 옅은 선 + 가늘고 진한 선이면 눈으로는 같고 3~5배 싸다.
   */
  const strokeEdges = (width: number, alpha: number) => {
    ctx.strokeStyle = COLOR.wallEdge;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
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
    ctx.globalAlpha = 1;
  };
  strokeEdges(7 + near * 5, 0.16 + near * 0.26);
  strokeEdges(2, 1);

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
        // 반경은 월드 값이다 — 화면 px 상수로 두면 줌이 바뀔 때 모서리 비율이 달라진다
        roundRect(ctx, sx(base + b.x), sy(b.y), b.w * view.zoom, b.h * view.zoom, 0.4 * view.zoom);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = COLOR.blockEdge;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };
      for (const b of piece.sector.blocks) drawRect(b);
      for (const s of piece.sector.shutters) {
        const depth = shutterDepth(s, state.elapsed);
        // geometry.ts 의 판정은 depth > 0 부터다. 0.2 로 잘라 두면 통로 3.2 월드가
        // 판정만 살아 있고 화면에는 없는 창이 생긴다.
        if (depth <= 0) continue;
        const { top, bot } = squeezeBounds(sample(piece.sector.nodes, s.x), piece.squeeze ?? 1);
        drawRect(
          s.side === "top"
            ? { x: s.x, y: top, w: s.w, h: depth }
            : { x: s.x, y: bot - depth, w: s.w, h: depth }
        );
      }
    }
    if (piece.kind === "gate" && piece.gate && piece.gate.armed) {
      const g = piece.gate;
      const size = 7 * view.zoom;
      /**
       * **표식이 커밋 지점보다 뒤에 있었다.** 분기 중앙(`(startX+endX)/2`)에 두면, 표식이
       * 화면에 들어온 뒤 관이 확정되기까지 0.66초뿐이다 — 22-gate-split 에서는 아바타가
       * 이미 위 관에 들어간 뒤에야 표식이 크게 보였다. 정작 `gateLeadInSec` 1.5초짜리
       * 리드인 구간은 텅 비어 있었다.
       *
       * 칸막이를 두껍게 그리는 건 답이 아니다(두께는 진짜 값이고 확정 시점이 거기서
       * 나온다). 문제는 시점이므로 표식을 리드인으로 당기고, 화면 우측 끝에 핀으로
       * 고정해 등장한 순간부터 분기까지 계속 붙어 있게 한다.
       */
      /**
       * 분기점에 묶고 **우측 끝에 핀으로 고정**한다. 게이트가 화면 밖에 있는 동안에는
       * 표식이 우측 끝 한자리에 가만히 있어 읽을 시간이 있고, 분기가 화면에 들어오면
       * 그때부터 분기점과 함께 왼쪽으로 흐른다. 지나간 뒤에는 그린다는 뜻이 없다.
       */
      const splitX = sx(g.startX);
      if (splitX < -size * 2) continue;
      const markX = Math.min(splitX, cssW - size * 1.6);
      // 표식의 높이는 관의 실제 중앙이다 — 하드코딩하면 gateDivider 를 바꿀 때 어긋난다
      const lanes = gateLanes(g, g.startX + (g.endX - g.startX) * 0.5, t);
      const dTop = lanes.dividerTop ?? 50 - t.gateDivider / 2;
      const dBot = lanes.dividerBot ?? 50 + t.gateDivider / 2;
      // 두 관의 오르는 축이 같으면 쐐기는 선택에 기여하지 않는다
      const samePlus = g.top.plus === g.bot.plus;
      drawTradeMark(ctx, g.top, markX, sy((lanes.outerTop + dTop) / 2), size, samePlus);
      drawTradeMark(ctx, g.bot, markX, sy((dBot + lanes.outerBot) / 2), size, samePlus);
    }
  }

  if (Number.isFinite(state.course.finishX)) {
    const finishX = sx(state.course.finishX);
    if (finishX > -20 && finishX < cssW + 20) {
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

  const px = playerPx;
  const py = playerPy;
  const r = rPx;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.atan2(state.vy, Math.max(1e-6, t.speed)));
  ctx.fillStyle = state.phase === "dead" ? COLOR.block : `rgb(${cr}, ${cg}, ${cb})`;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = state.phase === "dead" ? 24 : 14;
  // 실루엣은 기체의 곡선에서 파생된다 — 코의 벌어짐이 그 기체의 기준 각도다.
  const shape = silhouetteOf(runnerById(state.config.runner ?? "dart")).points;
  /**
   * **외접원 = 히트박스.** `silhouetteOf` 는 모든 기체를 외접원 1 로 정규화하면서
   * "보이는 것과 판정이 어긋나 보이면 안 된다"고 적어 두었는데, 정작 여기서 `r * 1.7`
   * 을 곱하고 있었다. 표준 기체의 세로 반높이가 히트박스의 **1.5배**여서 "닿아 보이는데
   * 안 죽는" 상황이 상시였다 — 각도 과장과 같은 종류의 거짓말이고 방향만 반대다.
   * 이제 그려진 도형의 최원점이 곧 판정 반지름이다. 아바타는 그만큼 작아졌고, 그게
   * 실제 크기다. 찾기 어려워지지 않도록 글로우만 남긴다.
   */
  const reach = r;
  ctx.beginPath();
  ctx.moveTo(shape[0][0] * reach, shape[0][1] * reach);
  for (let i = 1; i < shape.length; i += 1) ctx.lineTo(shape[i][0] * reach, shape[i][1] * reach);
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
    /**
     * 알파가 첫 프레임부터 감쇠해 읽을 시간이 없었다. 앞의 40% 는 만알파로 세우고
     * 남은 구간에서만 뺀다. 재시도 지연(`retryDelayMs`)은 건드리지 않는다 — 루프
     * 속도가 이 게임의 재미이고, 검증기의 스테이지 런도 그 값으로 돈다.
     */
    const hold = Math.min(1, (1 - k) / 0.6);

    // 맞은 자리. "여기로 갈 수 있었다"만 있고 "여기에 맞았다"가 없었다.
    ctx.strokeStyle = `rgba(255, 255, 255, ${(0.9 * hold).toFixed(3)})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - r * 1.1, py - r * 1.1);
    ctx.lineTo(px + r * 1.1, py + r * 1.1);
    ctx.moveTo(px + r * 1.1, py - r * 1.1);
    ctx.lineTo(px - r * 1.1, py + r * 1.1);
    ctx.stroke();

    // 지나갈 수 있었던 자리. 완주선과 같은 초록이면 "골인"과 섞이므로 연두로 뗀다.
    if (state.deathGap) {
      for (const span of state.deathGap) {
        ctx.fillStyle = `rgba(184, 255, 94, ${(0.3 * hold).toFixed(3)})`;
        ctx.fillRect(px - r * 3, sy(span.lo), r * 9, (span.hi - span.lo) * view.zoom);
        ctx.strokeStyle = `rgba(184, 255, 94, ${(0.85 * hold).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - r * 3, sy(span.lo));
        ctx.lineTo(px + r * 6, sy(span.lo));
        ctx.moveTo(px - r * 3, sy(span.hi));
        ctx.lineTo(px + r * 6, sy(span.hi));
        ctx.stroke();
      }
    }

    ctx.strokeStyle = `rgba(255, 94, 122, ${(1 - k).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, r + k * r * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

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
