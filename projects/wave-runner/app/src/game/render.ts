import { AXES, AXIS_COLOR } from "./axes";
import { cameraX, computeView } from "./camera";
import { pieceAt } from "./course";
import { runnerById, silhouetteOf } from "./runners";
import { gateLanes, squeezeBounds } from "./engine";
import type { GameState } from "./engine";
import { sample, shutterDepth } from "./sectors";
import { drawScene } from "./scene";
import { platePattern, skinReady } from "./skin";
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
/**
 * ## 자외선 세트 — 통로는 종이, 벽은 먹
 *
 * 명도 법칙은 그대로다. 바뀐 것은 **어느 쪽이 얼마나 밝은가의 폭**이다 — 통로를
 * 크림색 종이로 올려 벽과의 대비를 키웠고, 판정선을 형광 라임으로 옮겼다.
 *
 * 밝기 서열이 이 팔레트의 전부다. 아바타가 가장 밝고, 그다음이 판정선이며, 배경
 * 선화는 판정선의 2/3 를 넘지 않는다(`scene.ts` 의 농도 셋). 판정선을 전체 강도로
 * 찍으면 노란 아바타와 밝기가 같아지는데, 둘을 가르는 것이 색상각 15° 뿐이 되고
 * 그 15° 가 필요한 순간은 하필 아바타가 선에 닿기 직전이다. 그래서 `edgeInk` 는
 * 0.86 으로 올려 칠한다.
 */
const COLOR = {
  bg: "#08040f",
  wall: "#08040f",
  /** 벽 위의 선망. 결은 잉크 위에만 있고 통로에는 없다 */
  screen: "#2a2040",
  /** 배경 덩어리 — 벽보다 어둡다. 밝아지는 것은 선뿐이다 */
  sceneMass: "#03010a",
  /** 경계 바깥의 잉크 알갱이 — 어긋난 판이 죽는 쪽으로만 번진 자리 */
  grit: "#1b1230",
  /** 통로 = 잉크가 닿지 않은 종이 */
  paper: "#ede6cd",
  wallEdge: "#ccff33",
  scene: "#cbe86f",
  block: "#ff5e7a",
  blockEdge: "#ffd0d8",
  player: "#ffe66d",
  finish: "#7dffb0",
  hud: "#cfc6e8"
};

/** 판정선은 아바타보다 한 단계 아래여야 한다 */
const EDGE_INK = 0.86;

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
  ctx.fillStyle = "rgba(207, 198, 232, 0.14)";
  ctx.fillRect(0, 0, cssW, railH);

  if (progress > 0) {
    ctx.fillStyle = beatRecord ? COLOR.finish : COLOR.hud;
    ctx.globalAlpha = beatRecord ? 0.95 : 0.75;
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

  const size = Math.round(Math.max(11, Math.min(14, cssH * 0.018)));
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = beatRecord
    ? COLOR.finish
    : lostRecord
      ? "rgba(207, 198, 232, 0.3)"
      : "rgba(207, 198, 232, 0.62)";
  const label = isEndless ? `RUN ${Math.round(state.x)}` : `TIME ${state.elapsed.toFixed(1)}`;
  ctx.fillText(label, cssW - 96, railH + 12);

  /**
   * 등록 표식 — 인쇄의 판 맞춤 십자. 네 귀퉁이 여백에만 두고 통로 위로는 오지 않는다.
   * 컨셉의 장식이지만 시선 예산을 쓰지 않는 자리에만 있다.
   */
  ctx.strokeStyle = "rgba(207, 198, 232, 0.4)";
  ctx.lineWidth = 1;
  const cross = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  };
  cross(cssW - 110, railH + 17, 7);
  cross(cssW - 17, cssH - 17, 8);
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

  /**
   * ## 통로를 파낸다 — 그리는 순서가 곧 규칙이다
   *
   * 벽을 두 폴리곤으로 칠하는 대신, **화면을 전부 먹으로 덮고 통로를 파낸다.**
   * 배경과 결을 화면 전체에 한 번만 그리면 되고, 통로 안으로 새는 일이 구조적으로
   * 불가능해진다(규칙 1 — 결은 잉크 위에만).
   *
   *   먹 → 배경 선화 → 선망·종이결 → **침묵 띠** → 잉크 알갱이 → 종이 → 판정선
   *
   * 침묵 띠는 경계 바깥으로만 칠해지는데, 경로를 굵게 스트로크한 뒤 그 위에 통로를
   * 종이로 채우면 안쪽 절반이 덮이기 때문이다. 어긋난 판이 죽는 쪽으로만 번진다는
   * 규칙 2가 같은 방식으로 지켜진다 — 알갱이 띠도 바깥 절반만 남는다.
   */
  const corridor = new Path2D();
  corridor.moveTo(topPts[0][0], topPts[0][1]);
  for (const [px, py] of topPts) corridor.lineTo(px, py);
  for (let i = botPts.length - 1; i >= 0; i -= 1) corridor.lineTo(botPts[i][0], botPts[i][1]);
  corridor.closePath();

  const edgeLine = new Path2D();
  const traceEdge = (pts: Array<[number, number]>) => {
    pts.forEach(([px, py], i) => (i === 0 ? edgeLine.moveTo(px, py) : edgeLine.lineTo(px, py)));
  };
  traceEdge(topPts);
  traceEdge(botPts);

  const dividerPath = new Path2D();
  if (divider.length > 1) {
    dividerPath.moveTo(divider[0][0], divider[0][1]);
    for (const [px, dt] of divider) dividerPath.lineTo(px, dt);
    for (let i = divider.length - 1; i >= 0; i -= 1) dividerPath.lineTo(divider[i][0], divider[i][2]);
    dividerPath.closePath();
  }

  // 1. 먹 — 레터박스까지 덮어 "갈 수 없는 곳"이 하나로 읽힌다
  ctx.fillStyle = COLOR.wall;
  ctx.fillRect(0, 0, cssW, cssH);

  // 2. 선망과 종이 결 — 벽 전체를 한 판으로 묶는다
  if (skinReady()) {
    const screen = platePattern(ctx, "gorge", COLOR.screen, 6, view.zoom, camX, offsetY);
    if (screen) {
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = screen;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }
    const grain = platePattern(ctx, "grain", COLOR.screen, 16, view.zoom, camX, offsetY);
    if (grain) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = grain;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }
  }

  /**
   * 3. 배경 선화 — **결 위에** 그린다.
   *
   * 앞 판본은 선화를 먼저 깔고 그 위에 선망과 종이 결을 덮었다. 그러면 선이 결에
   * 섞여 탁해지고, 시안과 비교했을 때 "흐린 선이 많은" 그림이 된다. 시안은 반대다 —
   * **또렷한 선이 적게** 있다. 선화를 맨 위로 올리는 것이 그 차이의 가장 큰 레버다.
   * 시차는 통로보다 느리다.
   */
  const band = Math.max(10, cssH * 0.026);
  let minTop = cssH;
  let maxBot = 0;
  for (const [, py] of topPts) minTop = Math.min(minTop, py);
  for (const [, py] of botPts) maxBot = Math.max(maxBot, py);
  drawScene(
    ctx, cssW, cssH, camX, view.zoom, COLOR.scene, COLOR.sceneMass,
    Math.min(cssH * 0.40, minTop - band * 1.1),
    Math.min(cssH, maxBot + band * 1.1 + cssH * 0.3)
  );

  // 4. 침묵 띠 — 경계 안쪽 이만큼은 배경이 한 점도 없다
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = COLOR.wall;
  ctx.lineWidth = band * 2;
  ctx.stroke(edgeLine);
  if (divider.length > 1) {
    ctx.lineWidth = band;
    ctx.stroke(dividerPath);
  }

  // 5. 잉크 알갱이 — 스퀴지가 남긴 자국. 바깥 절반만 보인다
  const grit = skinReady()
    ? platePattern(ctx, "inkEdge", COLOR.grit, 14, view.zoom, camX, offsetY)
    : null;
  ctx.strokeStyle = grit ?? COLOR.grit;
  ctx.globalAlpha = grit ? 0.5 : 0.35;
  ctx.lineWidth = Math.max(6, cssH * 0.011) * 2;
  ctx.stroke(edgeLine);
  ctx.globalAlpha = 1;
  ctx.restore();

  // 6. 종이 — 통로. 평평하다
  ctx.fillStyle = COLOR.paper;
  ctx.fill(corridor);

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
   * 7. 판정선 — **벽 쪽으로만 칠한다.**
   *
   * 시안의 단면을 재 보니 라임이 경계의 *바깥*(벽 쪽)에 있고 종이로 바로 넘어갔다.
   * 구현은 선을 경로에 중앙 정렬해 절반이 통로를 덮고 있었다. 그만큼 통로가 좁아
   * 보이고(판정은 그대로인데 화면만 좁다), 종이와 라임 사이에 회색 가장자리가 생긴다.
   *
   * 그래서 선을 굵게 긋고 **종이를 한 번 더 덮는다.** 안쪽 절반이 잘려 나가 바깥
   * 절반만 남으므로, 통로 면적은 판정과 정확히 같고 자른 자리는 인쇄의 녹아웃처럼
   * 깨끗하다. 글로우도 같은 방식으로 잘리므로 통로 안으로 번지지 않는다.
   *
   * 글로우는 `shadowBlur` 이 아니라 2패스 스트로크다. Canvas2D 의 그림자는 DPR2 에서
   * 화면 전체 재래스터화라, 세그먼트 100개짜리 폴리라인 넷에 걸면 모바일 프레임 예산을
   * 혼자 먹는다. 굵고 옅은 선 + 가늘고 진한 선이면 눈으로는 같고 3~5배 싸다.
   */
  const strokeOuter = (width: number, alpha: number) => {
    ctx.strokeStyle = COLOR.wallEdge;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width * 2;
    ctx.stroke(edgeLine);
    ctx.globalAlpha = 1;
  };
  strokeOuter(4 + near * 5, 0.07 + near * 0.2);
  strokeOuter(3.2, EDGE_INK);
  ctx.fillStyle = COLOR.paper;
  ctx.fill(corridor);

  // 8. 종이 결 — 통로 안에만. 결은 여기서만 평평함을 깨뜨린다
  if (skinReady()) {
    const paperGrain = platePattern(ctx, "grain", "#a3936a", 30, view.zoom, camX, offsetY);
    if (paperGrain) {
      ctx.save();
      ctx.clip(corridor);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = paperGrain;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }
  }

  // 9. 칸막이 — 구멍 두 개가 아니라 길이 둘로 갈라진 것으로 읽혀야 한다.
  //    통로 안의 벽이므로 종이를 덮은 뒤에 온다
  if (divider.length > 1) {
    ctx.fillStyle = COLOR.wall;
    ctx.fill(dividerPath);
    const lens = skinReady()
      ? platePattern(ctx, "corridor", COLOR.screen, 12, view.zoom, camX, offsetY)
      : null;
    if (lens) {
      ctx.save();
      ctx.clip(dividerPath);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = lens;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    }
    ctx.strokeStyle = COLOR.wallEdge;
    ctx.globalAlpha = EDGE_INK;
    ctx.lineWidth = 3.2;
    ctx.stroke(dividerPath);
    ctx.globalAlpha = 1;
  }

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
      const w = Math.max(1, t.radius * view.zoom * 0.5 * k);
      ctx.strokeStyle = `rgba(20, 16, 28, ${(k * 0.16).toFixed(3)})`;
      ctx.lineWidth = w + Math.max(0.8, t.radius * view.zoom * 0.12);
      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
      ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.45 + k * 0.55).toFixed(3)})`;
      ctx.lineWidth = w;
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
  /**
   * **종이가 밝아지면서 노랑만으로는 아바타가 떠오르지 않는다.** 글로우는 밝은 바탕
   * 위에서 아무 일도 하지 않으므로(밝은 것 위의 밝은 번짐) 먹으로 두른다.
   *
   * 다만 **선으로 두르면 안 된다.** 스트로크는 절반이 실루엣 바깥으로 나가고, 그러면
   * 그려진 아바타가 히트박스보다 커진다 — "외접원 = 히트박스" 를 세운 바로 그 자리에서
   * 같은 거짓말이 되살아난다. 그래서 먹을 **원래 크기로 채우고 노랑을 안쪽에 한 겹 더**
   * 채운다. 바깥 경계는 여전히 정확히 판정 반지름이고, 먹은 전부 안쪽에 있다.
   */
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = state.phase === "dead" ? 24 : 0;
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
  const ink = ctx.fillStyle;
  const trace = (k: number) => {
    ctx.beginPath();
    ctx.moveTo(shape[0][0] * reach * k, shape[0][1] * reach * k);
    for (let i = 1; i < shape.length; i += 1) {
      ctx.lineTo(shape[i][0] * reach * k, shape[i][1] * reach * k);
    }
    ctx.closePath();
  };
  ctx.fillStyle = COLOR.wall;
  trace(1);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = ink;
  trace(0.86);
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
    ctx.strokeStyle = `rgba(20, 16, 28, ${(0.92 * hold).toFixed(3)})`;
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
        ctx.fillStyle = `rgba(93, 68, 160, ${(0.26 * hold).toFixed(3)})`;
        ctx.fillRect(px - r * 3, sy(span.lo), r * 9, (span.hi - span.lo) * view.zoom);
        ctx.strokeStyle = `rgba(75, 52, 140, ${(0.95 * hold).toFixed(3)})`;
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
