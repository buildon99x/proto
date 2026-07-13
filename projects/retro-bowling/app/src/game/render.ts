// 픽셀 렌더러. 낮은 내부 해상도(VW x VH)에 그린 뒤 CSS로 nearest-neighbor 확대해
// 도트 그래픽 느낌을 낸다. 원근 투영 레인 + 핀 + 볼 + 스코어보드 + 미터.

import { BowlingGame, BOARD_W, GUTTER, LANE_LEN, BALL_R, PIN_R, type Pin } from "./engine";
import { drawText, drawTextCentered, textWidth } from "./pixelfont";
import { rankFor } from "./scoring";

export const VW = 256;
export const VH = 384;

const C = {
  bg: "#0b1020",
  bg2: "#161d38",
  scoreBg: "#0e1428",
  scoreBorder: "#2b3560",
  scoreActive: "#ffd23f",
  woodL: "#e0aa4c",
  woodD: "#c1852f",
  plank: "#9a6522",
  arrowsCol: "#7a4a16",
  foul: "#e8e2d0",
  gutter: "#1b2138",
  gutterEdge: "#39436e",
  pinBody: "#f4f2e6",
  pinShade: "#c9c4ad",
  pinRed: "#e23b3b",
  pinDown: "#5a5f4a",
  ball: "#ff5277",
  ballDark: "#a3213f",
  ballHi: "#ffd3dd",
  white: "#ffffff",
  dim: "#8a93a3",
  yellow: "#ffd23f",
  cyan: "#3fd0ff",
  green: "#5ad86a",
  red: "#ff5a5a"
};

// ── 레인 원근 투영 ─────────────────────────────────────────
const LANE_TOP = 56; // 화면상 레인 먼쪽(위)
const LANE_BOTTOM = 316; // 화면상 레인 가까운쪽(아래)
const NEAR_HALF = 116;
const FAR_HALF = 38;
const CX = VW / 2;
const CENTER_U = BOARD_W / 2;

interface Proj {
  sx: number;
  sy: number;
  ppu: number;
  half: number;
}

function project(x: number, y: number): Proj {
  const t = y / LANE_LEN;
  const sy = LANE_BOTTOM - t * (LANE_BOTTOM - LANE_TOP);
  const half = NEAR_HALF + (FAR_HALF - NEAR_HALF) * t;
  const sx = CX + ((x - CENTER_U) / CENTER_U) * half;
  return { sx, sy, ppu: half / CENTER_U, half };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function render(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  ctx.imageSmoothingEnabled = false;
  // 배경 그라데이션(위 어둡고 아래 밝은 홀 분위기).
  const grad = ctx.createLinearGradient(0, 0, 0, VH);
  grad.addColorStop(0, C.bg);
  grad.addColorStop(1, C.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VW, VH);

  if (game.phase === "title") {
    drawTitle(ctx, game, time);
    return;
  }
  if (game.phase === "gameover") {
    drawLaneScene(ctx, game, time);
    drawGameOver(ctx, game, time);
    return;
  }

  // 레인을 먼저 그린 뒤 상단 스코어보드를 위에 올린다(레인 뒷벽이 덮지 않도록).
  drawLaneScene(ctx, game, time);
  drawScoreboard(ctx, game);
  drawMeters(ctx, game, time);
  drawBanner(ctx, game);
}

// ── 레인 + 핀 + 볼 ────────────────────────────────────────
function drawLaneScene(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  // 뒤쪽 벽(핀덱 뒤).
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, LANE_TOP - 10, VW, LANE_TOP - (LANE_TOP - 10) + 10);
  ctx.fillStyle = "#0a0f1f";
  ctx.fillRect(0, 0, VW, LANE_TOP);

  const bl = project(0, 0);
  const br = project(BOARD_W, 0);
  const tl = project(0, LANE_LEN);
  const tr = project(BOARD_W, LANE_LEN);

  // 거터(양쪽 채널) + 레인 판.
  const gL0 = project(GUTTER, 0);
  const gL1 = project(GUTTER, LANE_LEN);
  const gR0 = project(BOARD_W - GUTTER, 0);
  const gR1 = project(BOARD_W - GUTTER, LANE_LEN);

  // 좌측 거터
  fillQuad(ctx, bl, gL0, gL1, tl, C.gutter);
  // 우측 거터
  fillQuad(ctx, gR0, br, tr, gR1, C.gutter);
  // 거터 안쪽 하이라이트 라인
  strokeLine(ctx, gL0, gL1, C.gutterEdge);
  strokeLine(ctx, gR0, gR1, C.gutterEdge);

  // 레인 나무판(세로 널판 줄무늬).
  const boards = 15;
  for (let i = 0; i < boards; i++) {
    const x0 = GUTTER + (i / boards) * (BOARD_W - 2 * GUTTER);
    const x1 = GUTTER + ((i + 1) / boards) * (BOARD_W - 2 * GUTTER);
    const p0 = project(x0, 0);
    const p1 = project(x1, 0);
    const p2 = project(x1, LANE_LEN);
    const p3 = project(x0, LANE_LEN);
    fillQuad(ctx, p0, p1, p2, p3, i % 2 === 0 ? C.woodL : C.woodD);
  }
  // 널판 경계선 몇 개.
  for (let i = 1; i < boards; i += 2) {
    const x = GUTTER + (i / boards) * (BOARD_W - 2 * GUTTER);
    strokeLine(ctx, project(x, 0), project(x, LANE_LEN), C.plank, 0.5);
  }

  // 타깃 애로우(파울라인에서 1/3 지점).
  const arrowY = LANE_LEN * 0.32;
  for (let i = -3; i <= 3; i++) {
    const ax = CENTER_U + i * 5;
    const ap = project(ax, arrowY);
    const s = Math.max(2, 3 * ap.ppu);
    ctx.fillStyle = C.arrowsCol;
    // 위를 향한 삼각형(픽셀).
    for (let r = 0; r < s; r++) {
      const w = (s - r) * 1.2;
      ctx.fillRect(Math.round(ap.sx - w / 2), Math.round(ap.sy - s + r), Math.max(1, Math.round(w)), 1);
    }
  }

  // 파울라인.
  strokeLine(ctx, project(GUTTER, 0.5), project(BOARD_W - GUTTER, 0.5), C.foul, 1.5);

  // 핀덱 점(핀 위치 표시) — 핀 뒤 그림자용.
  for (const p of game.pins) {
    if (p.removed) continue;
    const pr = project(p.homeX, p.homeY);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    const r = Math.max(1, PIN_R * pr.ppu);
    ctx.fillRect(Math.round(pr.sx - r), Math.round(pr.sy - 1), Math.round(r * 2), 2);
  }

  // 핀을 먼 것부터(y 큰 것부터) 그려 원근 겹침 처리.
  const pins = [...game.pins].filter((p) => !p.removed).sort((a, b) => b.y - a.y);
  for (const p of pins) drawPin(ctx, p);

  // 볼.
  drawBall(ctx, game, time);

  // 조준 가이드(조준/파워/스핀 단계).
  if (game.phase === "aim" || game.phase === "power" || game.phase === "spin") {
    drawAimGuide(ctx, game);
  }
}

function drawPin(ctx: CanvasRenderingContext2D, p: Pin): void {
  const pr = project(p.x, p.y);
  const ppu = pr.ppu;
  const w = Math.max(3, Math.round(PIN_R * 2 * ppu));
  const h = Math.max(6, Math.round(6.5 * ppu));
  const x = Math.round(pr.sx - w / 2);
  const baseY = Math.round(pr.sy);
  const top = baseY - h;

  if (p.down) {
    // 쓰러지는 중: 눕힌 형태로 흐리게.
    ctx.fillStyle = C.pinDown;
    ctx.fillRect(x - 1, baseY - Math.round(h * 0.4), w + 2, Math.max(2, Math.round(h * 0.4)));
    return;
  }

  // 몸통(아래로 갈수록 넓은 볼링핀 실루엣).
  ctx.fillStyle = C.pinBody;
  const neck = top + Math.round(h * 0.28);
  // 머리
  const headW = Math.max(2, Math.round(w * 0.55));
  ctx.fillRect(Math.round(pr.sx - headW / 2), top, headW, Math.round(h * 0.3));
  // 몸통
  ctx.fillRect(x, neck, w, h - (neck - top));
  // 우측 음영
  ctx.fillStyle = C.pinShade;
  ctx.fillRect(x + w - 1, neck, 1, h - (neck - top));
  ctx.fillRect(Math.round(pr.sx + headW / 2) - 1, top, 1, Math.round(h * 0.3));
  // 빨간 목 줄무늬 2개
  ctx.fillStyle = C.pinRed;
  const stripeY = neck + 1;
  ctx.fillRect(x, stripeY, w, Math.max(1, Math.round(h * 0.08)));
  ctx.fillRect(x, stripeY + Math.max(2, Math.round(h * 0.16)), w, Math.max(1, Math.round(h * 0.08)));
}

function drawBall(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  const b = game.ball;
  const pr = project(b.x, b.y);
  const r = Math.max(2, BALL_R * pr.ppu);
  // 그림자.
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(pr.sx, pr.sy + r * 0.5, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 공 본체.
  ctx.fillStyle = C.ballDark;
  ctx.beginPath();
  ctx.arc(pr.sx, pr.sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = b.gutter ? "#7a3a4a" : C.ball;
  ctx.beginPath();
  ctx.arc(pr.sx, pr.sy - r * 0.12, r * 0.86, 0, Math.PI * 2);
  ctx.fill();
  // 하이라이트.
  ctx.fillStyle = C.ballHi;
  ctx.beginPath();
  ctx.arc(pr.sx - r * 0.35, pr.sy - r * 0.4, Math.max(1, r * 0.24), 0, Math.PI * 2);
  ctx.fill();
  // 스핀 표시(회전하는 점) — 굴러가는 동안.
  if (game.phase === "rolling" && r > 4) {
    const spin = game.spin;
    const ang = time * (6 + spin * 6);
    const dotX = pr.sx + Math.cos(ang) * r * 0.4;
    const dotY = pr.sy - r * 0.12 + Math.sin(ang) * r * 0.4;
    ctx.fillStyle = C.ballDark;
    ctx.fillRect(Math.round(dotX) - 1, Math.round(dotY) - 1, 2, 2);
  }
}

function drawAimGuide(ctx: CanvasRenderingContext2D, game: BowlingGame): void {
  const startY = 4;
  const endY = LANE_LEN * 0.55;
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    if (i % 2 === 1) continue; // 점선
    const y = lerp(startY, endY, i / steps);
    const pr = project(game.aimX, y);
    const s = Math.max(1, Math.round(1.6 * pr.ppu));
    ctx.fillStyle = "rgba(255,210,63,0.7)";
    ctx.fillRect(Math.round(pr.sx - s / 2), Math.round(pr.sy - s / 2), s, s);
  }
  // 조준 화살표(파울라인 앞).
  const ap = project(game.aimX, 1);
  ctx.fillStyle = C.yellow;
  for (let r = 0; r < 5; r++) {
    const w = (5 - r) * 1.4;
    ctx.fillRect(Math.round(ap.sx - w / 2), Math.round(ap.sy - 10 + r), Math.max(1, Math.round(w)), 1);
  }
}

// ── 스코어보드 ─────────────────────────────────────────────
function mark(n: number): string {
  return n === 0 ? "-" : String(n);
}

function frameMarks(rolls: number[], isTenth: boolean): string[] {
  if (!isTenth) {
    const c1 = rolls[0] === undefined ? "" : rolls[0] === 10 ? "X" : mark(rolls[0]);
    let c2 = "";
    if (rolls[0] !== 10 && rolls[1] !== undefined) {
      c2 = rolls[0] + rolls[1] === 10 ? "/" : mark(rolls[1]);
    }
    return [c1, c2, ""];
  }
  const res = ["", "", ""];
  if (rolls[0] !== undefined) res[0] = rolls[0] === 10 ? "X" : mark(rolls[0]);
  if (rolls[1] !== undefined) {
    if (rolls[0] === 10) res[1] = rolls[1] === 10 ? "X" : mark(rolls[1]);
    else res[1] = rolls[0] + rolls[1] === 10 ? "/" : mark(rolls[1]);
  }
  if (rolls[2] !== undefined) {
    if (rolls[0] === 10) {
      if (rolls[1] === 10) res[2] = rolls[2] === 10 ? "X" : mark(rolls[2]);
      else res[2] = rolls[1] + rolls[2] === 10 ? "/" : mark(rolls[2]);
    } else {
      res[2] = rolls[2] === 10 ? "X" : mark(rolls[2]);
    }
  }
  return res;
}

function drawScoreboard(ctx: CanvasRenderingContext2D, game: BowlingGame): void {
  const marginX = 3;
  const top = 3;
  const boxH = 34;
  const totalW = VW - marginX * 2;
  const fw = totalW / 10;
  const score = game.score;

  for (let f = 0; f < 10; f++) {
    const x = marginX + f * fw;
    const active = f === game.frameIndex && game.phase !== "gameover";
    ctx.fillStyle = C.scoreBg;
    ctx.fillRect(Math.round(x), top, Math.ceil(fw), boxH);
    ctx.strokeStyle = active ? C.scoreActive : C.scoreBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, top + 0.5, Math.ceil(fw) - 1, boxH - 1);

    // 프레임 번호.
    drawTextCentered(ctx, String(f + 1), x + fw / 2, top + 2, 1, active ? C.yellow : C.dim, 1);

    const isTenth = f === 9;
    const marks = frameMarks(score.frames[f]?.rolls ?? [], isTenth);
    // 롤 셀.
    const cells = isTenth ? 3 : 2;
    const cellW = fw / cells;
    for (let c = 0; c < cells; c++) {
      const cx = x + c * cellW + cellW / 2;
      if (marks[c]) drawTextCentered(ctx, marks[c], cx, top + 11, 1, C.white, 1);
    }
    // 누적 점수.
    const cum = score.frames[f]?.cumulative;
    if (cum !== null && cum !== undefined) {
      drawTextCentered(ctx, String(cum), x + fw / 2, top + 23, 1, C.white, 1);
    }
  }
}

// ── 미터(파워/스핀) + 프롬프트 ─────────────────────────────
function drawMeters(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  const barX = 54;
  const barW = VW - barX - 12;

  // 파워.
  drawText(ctx, "POWER", 6, 326, 1, game.phase === "power" ? C.yellow : C.dim, 1);
  drawBar(ctx, barX, 325, barW, 7, game.currentPowerT(), C.green, C.red, false);

  // 스핀.
  drawText(ctx, "SPIN", 6, 344, 1, game.phase === "spin" ? C.yellow : C.dim, 1);
  drawBar(ctx, barX, 343, barW, 7, (game.currentSpinT() + 1) / 2, C.cyan, C.cyan, true);

  // 프롬프트.
  let prompt = "";
  switch (game.phase) {
    case "aim":
      prompt = "< >  AIM      SPACE  SET";
      break;
    case "power":
      prompt = "SPACE  LOCK POWER";
      break;
    case "spin":
      prompt = "SPACE  LOCK SPIN + THROW";
      break;
    case "rolling":
      prompt = "...";
      break;
    case "result":
      prompt = "";
      break;
  }
  const blink = game.phase === "aim" ? Math.floor(time * 2) % 2 === 0 : true;
  if (prompt && blink) drawTextCentered(ctx, prompt, VW / 2, 364, 1, C.dim, 1);
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  colLo: string,
  colHi: string,
  centered: boolean
): void {
  ctx.fillStyle = "#05070f";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.scoreBorder;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (centered) {
    // 중앙 0 기준 좌우.
    const mid = x + w / 2;
    ctx.fillStyle = "#2a3358";
    ctx.fillRect(Math.round(mid), y + 1, 1, h - 2);
    const off = (t - 0.5) * (w - 4);
    ctx.fillStyle = colHi;
    if (off >= 0) ctx.fillRect(Math.round(mid), y + 1, Math.round(off), h - 2);
    else ctx.fillRect(Math.round(mid + off), y + 1, Math.round(-off), h - 2);
    // 마커.
    ctx.fillStyle = C.white;
    ctx.fillRect(Math.round(mid + off) - 1, y, 2, h);
  } else {
    const fillW = Math.round((w - 2) * t);
    for (let i = 0; i < fillW; i++) {
      const frac = i / (w - 2);
      ctx.fillStyle = frac > 0.8 ? colHi : frac > 0.55 ? C.yellow : colLo;
      ctx.fillRect(x + 1 + i, y + 1, 1, h - 2);
    }
    // 마커.
    ctx.fillStyle = C.white;
    ctx.fillRect(x + 1 + fillW, y, 2, h);
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, game: BowlingGame): void {
  const b = game.banner;
  if (!b) return;
  const scale = 3;
  const w = textWidth(b.text, scale, 1);
  const y = 150;
  // 배경 박스.
  ctx.fillStyle = "rgba(5,7,15,0.75)";
  ctx.fillRect(CX - w / 2 - 8, y - 6, w + 16, 7 * scale + 12);
  // 그림자 + 본문.
  drawTextCentered(ctx, b.text, CX + 2, y + 2, scale, "rgba(0,0,0,0.6)", 1);
  drawTextCentered(ctx, b.text, CX, y, scale, b.color, 1);
}

// ── 타이틀 / 게임오버 ──────────────────────────────────────
function drawTitle(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  // 장식용 레인 미리보기.
  drawMiniLane(ctx);

  drawTextCentered(ctx, "RETRO", CX + 2, 88 + 2, 5, "rgba(0,0,0,0.6)", 2);
  drawTextCentered(ctx, "RETRO", CX, 88, 5, C.yellow, 2);
  drawTextCentered(ctx, "BOWLING", CX + 2, 132 + 2, 5, "rgba(0,0,0,0.6)", 1);
  drawTextCentered(ctx, "BOWLING", CX, 132, 5, C.ball, 1);

  // 핀 아이콘 장식.
  drawTextCentered(ctx, "* 8 BIT ALLEY *", CX, 176, 1, C.cyan, 1);

  if (game.highScore > 0) {
    drawTextCentered(ctx, `HIGH SCORE  ${game.highScore}`, CX, 300, 1, C.white, 1);
  }

  if (Math.floor(time * 1.6) % 2 === 0) {
    drawTextCentered(ctx, "PRESS SPACE / TAP TO PLAY", CX, 330, 1, C.yellow, 1);
  }
  drawTextCentered(ctx, "< > AIM   SPACE POWER SPIN THROW", CX, 352, 1, C.dim, 1);
}

function drawMiniLane(ctx: CanvasRenderingContext2D): void {
  // 위쪽 절반에 원근 레인 살짝.
  const bl = project(0, 0);
  const br = project(BOARD_W, 0);
  const tl = project(0, LANE_LEN);
  const tr = project(BOARD_W, LANE_LEN);
  fillQuad(ctx, bl, br, tr, tl, "#1a2138");
  const gL0 = project(GUTTER, 0);
  const gL1 = project(GUTTER, LANE_LEN);
  const gR0 = project(BOARD_W - GUTTER, 0);
  const gR1 = project(BOARD_W - GUTTER, LANE_LEN);
  fillQuad(ctx, gL0, gR0, gR1, gL1, "#c1852f");
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: BowlingGame, time: number): void {
  ctx.fillStyle = "rgba(5,7,15,0.82)";
  ctx.fillRect(0, 0, VW, VH);

  drawTextCentered(ctx, "GAME OVER", CX + 1, 40 + 1, 3, "rgba(0,0,0,0.6)", 1);
  drawTextCentered(ctx, "GAME OVER", CX, 40, 3, C.yellow, 1);

  const total = game.lastTotal;
  drawTextCentered(ctx, "FINAL SCORE", CX, 92, 1, C.dim, 1);
  drawTextCentered(ctx, String(total), CX, 106, 4, C.white, 1);

  drawTextCentered(ctx, `RANK  ${rankFor(total)}`, CX, 156, 2, C.cyan, 1);

  const isNewHigh = total >= game.highScore && total > 0;
  drawTextCentered(ctx, `HIGH SCORE  ${game.highScore}`, CX, 196, 1, C.white, 1);
  if (isNewHigh && Math.floor(time * 3) % 2 === 0) {
    drawTextCentered(ctx, "NEW RECORD!", CX, 212, 1, C.yellow, 1);
  }

  // 미니 스코어시트 요약.
  drawMiniScoresheet(ctx, game, 240);

  if (Math.floor(time * 1.6) % 2 === 0) {
    drawTextCentered(ctx, "PRESS SPACE / TAP", CX, 356, 1, C.yellow, 1);
  }
}

function drawMiniScoresheet(ctx: CanvasRenderingContext2D, game: BowlingGame, y: number): void {
  const score = game.score;
  const marginX = 8;
  const totalW = VW - marginX * 2;
  const fw = totalW / 10;
  for (let f = 0; f < 10; f++) {
    const x = marginX + f * fw;
    ctx.strokeStyle = C.scoreBorder;
    ctx.strokeRect(x + 0.5, y + 0.5, fw - 1, 26);
    const marks = frameMarks(score.frames[f]?.rolls ?? [], f === 9);
    const joined = marks.filter((m) => m).join(" ");
    drawTextCentered(ctx, joined || "-", x + fw / 2, y + 4, 1, C.white, 1);
    const cum = score.frames[f]?.cumulative;
    if (cum !== null && cum !== undefined) {
      drawTextCentered(ctx, String(cum), x + fw / 2, y + 15, 1, C.cyan, 1);
    }
  }
}

// ── 폴리곤 헬퍼 ────────────────────────────────────────────
function fillQuad(ctx: CanvasRenderingContext2D, a: Proj, b: Proj, c: Proj, d: Proj, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(d.sx, d.sy);
  ctx.closePath();
  ctx.fill();
}

function strokeLine(ctx: CanvasRenderingContext2D, a: Proj, b: Proj, color: string, width = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.stroke();
}
