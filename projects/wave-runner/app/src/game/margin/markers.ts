/**
 * 기록 이정표 — 여백에 서는 세 개의 각인.
 *
 * HUD 가 없는 게임에서 **"지금 자기 기록을 넘었다"는 사실만 1비트로** 전달한다.
 * 숫자도 순위도 띄우지 않는다. 정보량을 1비트로 묶어 두는 것이 이 기능의 전부다 —
 * 숫자를 띄우는 순간 그것은 HUD 이고, 화면 정보 추가는 곧 난이도 상승이다.
 *
 * 설계 근거: docs/design/margin-milestone.md
 */
import { KEEPOUT } from "./bands";
import { solveTint } from "./palette";
import { boundsAt } from "../engine";
import type { GameState } from "../engine";

/** 눈금 — 넘는 지점 그 자체 */
export const TICK_W = 1.6;
export const TICK_H = 6;
/**
 * 꼬리 — 다가오는 것을 미리 보이게 하고, **맥동의 세로 리브와 구분시킨다.**
 *
 * 눈금만 두면 두 가지가 동시에 깨진다. 폭 1.6월드는 속도 42에서 0.04초 만에
 * 지나가 지각되지 않고, 세로 막대라는 형태가 맥동 질감의 리브(세로, 두께 1.6)와
 * 똑같아진다. 가로 꼬리는 어떤 질감에도 없는 형태이고 0.32초를 만든다.
 */
export const TAIL_LEN = 12;
export const TAIL_H = 1.2;

export const FLASH_SEC = 0.45;
/** 여백 팔레트의 허용 색상대 중 녹(80~114°). 벽 도료(228°)와도, 클리어 초록(148°)과도 떨어져 있다 */
export const MARK_HUE = 100;
export const MARK_SAT = 0.35;
/**
 * 이정표는 질감보다 **위 레이어**이므로 대비도 위여야 한다.
 *
 * 질감의 상한은 1.50:1 이다. 각인을 같은 대비로 두면 벽에 섞여 읽히지 않는다 —
 * 실제로 맥동 섹터에서 리브와 구별되지 않았다. 원거리대 상시 상한인 2.0:1 을
 * 쓰되, 각인 하나가 차지하는 면적은 화면의 0.12% 라 잉크 총량은 질감의 1/40 이다.
 */
export const MARK_CONTRAST = 2.0;
/**
 * 섬광은 상시 상한(2.0:1)을 순간적으로 넘는다.
 *
 * 선례가 있다 — render.ts 는 교환 직후 0.6초 동안 축 색 원을, 사망 시 0.5초 동안
 * 초록 띠를 그린다. **플레이어의 행동이 만든 0.5초짜리 이벤트는 상시 표시물과
 * 다른 예산을 쓴다.** 상한은 순간 3.0:1, 지속 0.5초.
 */
export const FLASH_CONTRAST = 2.8;
export const FLASH_CONTRAST_CAP = 3;

export type MarkKind = "reach" | "split" | "distance";

export interface Mark {
  kind: MarkKind;
  /** 월드 x */
  x: number;
  /** 0 = 평상, 1 = 막 넘은 순간 */
  flash: number;
}

function decay(age: number): number {
  if (age < 0 || age >= FLASH_SEC) return 0;
  return 1 - age / FLASH_SEC;
}

/**
 * 지금 그려야 할 각인들.
 *
 * 순수 함수다 — 상태를 저장하지 않는다. 섬광의 나이를 기억하는 대신 **위치에서
 * 역산한다**(`(x − 마커) / 속도`). 재시작·체크포인트 복귀에도 따로 손댈 것이 없다.
 */
export function milestoneMarks(state: Readonly<GameState>): Mark[] {
  const m = state.config.milestone;
  if (!m) return [];
  const speed = Math.max(1e-6, state.tuning.speed);
  // 사망 프레임에서는 섬광을 소거한다 — 그 0.5초는 사망 원인 표시의 것이다
  const fade = state.phase === "dead" ? () => 0 : decay;

  if (state.mode === "endless") {
    // 연습에는 Endless 가 없지만 방어적으로 같은 규칙을 쓴다
    if (state.config.practice) return [];
    const best = m.bestDistance ?? 0;
    if (best <= 0) return [];
    return [{ kind: "distance", x: best, flash: fade((state.x - best) / speed) }];
  }

  const finish = state.course.finishX;
  if (!Number.isFinite(finish)) return [];

  // 스플릿은 클리어한 스테이지의 것이고, 연습에서는 경과 시간이 이어붙여져 거짓말이 된다
  const splits = state.config.practice ? undefined : m.splits;
  if (splits && splits.length > 0) {
    const out: Mark[] = [];
    let seen = 0;
    for (const piece of state.course.pieces) {
      if (piece.kind !== "sector") continue;
      const i = seen;
      seen += 1;
      if (i >= splits.length) break;
      const arrived = state.splits[i];
      // 뒤처졌을 때는 아무 일도 일어나지 않는다 — 부정 피드백은 죽음이 이미 준다
      const flash =
        arrived !== undefined && arrived < splits[i] ? fade(state.elapsed - arrived) : 0;
      out.push({ kind: "split", x: piece.endX, flash });
    }
    return out;
  }

  const progress = m.bestProgress ?? 0;
  // 0 이면 아직 아무 데도 못 갔고, 1 에 가까우면 클리어라 각인이 종료선과 겹친다
  if (progress <= 0.02 || progress >= 0.995) return [];
  const x = finish * progress;
  return [{ kind: "reach", x, flash: fade((state.x - x) / speed) }];
}

export interface MarkView {
  camX: number;
  zoom: number;
  offsetY: number;
  cssW: number;
  worldHeight: number;
}

/**
 * 각인을 그린다. 호출자가 이미 벽 인셋으로 clip 해 둔 상태여야 한다.
 *
 * 자리는 그 x 에서 **두꺼운 쪽 벽**의 월드 가장자리다. 통로 폭의 최대값이 62(산개)
 * 이므로 두꺼운 쪽은 최소 19월드이고, 근접대 8 을 빼도 11 이 남아 높이 6 이 언제나
 * 들어간다. 통로 기준으로 잡으면 산개에서 1월드밖에 남지 않아 자리가 없다.
 */
export function drawMarks(
  ctx: CanvasRenderingContext2D,
  marks: readonly Mark[],
  state: Readonly<GameState>,
  view: MarkView
): void {
  if (marks.length === 0) return;
  const { camX, zoom, offsetY, cssW, worldHeight } = view;
  const base = solveTint(MARK_HUE, MARK_SAT, MARK_CONTRAST);
  const lit = solveTint(MARK_HUE, MARK_SAT, FLASH_CONTRAST);
  const sx = (wx: number) => (wx - camX) * zoom;
  const sy = (wy: number) => wy * zoom + offsetY;

  for (const mark of marks) {
    const px = sx(mark.x);
    if (px < -TAIL_LEN * zoom - 4 || px > cssW + 4) continue;

    const b = boundsAt(state, mark.x);
    const topRoom = b.top;
    const botRoom = worldHeight - b.bot;
    const onTop = topRoom >= botRoom;
    const room = onTop ? topRoom : botRoom;
    // 근접대를 침범하면서까지 그리지 않는다. 증명상 일어나지 않지만 규칙이 우선이다
    if (room - KEEPOUT < TICK_H) continue;

    // 월드 가장자리(0 또는 100)에 붙인다. 레터박스가 생기면 그쪽으로 밀려나 더 안전하다
    const y0 = onTop ? 0 : worldHeight - TICK_H;

    ctx.save();
    ctx.fillStyle = mark.flash > 0 ? lit : base;
    ctx.globalAlpha = mark.flash > 0 ? 0.55 + 0.45 * mark.flash : 1;
    // 눈금
    ctx.fillRect(sx(mark.x - TICK_W / 2), sy(y0), TICK_W * zoom, TICK_H * zoom);
    // 꼬리 — 진행 방향 반대쪽으로 뻗어 다가오는 것이 먼저 보인다
    const tailY = onTop ? y0 : y0 + TICK_H - TAIL_H;
    ctx.fillRect(sx(mark.x - TAIL_LEN), sy(tailY), TAIL_LEN * zoom, TAIL_H * zoom);
    ctx.restore();
  }
}
