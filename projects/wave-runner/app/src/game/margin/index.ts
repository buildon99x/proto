/**
 * 여백 레이어 — 통로 바깥 벽면에 그리는 것 전부의 유일한 진입점.
 *
 * 세 가지를 지킨다.
 *
 *  1. **렌더 전용.** 물리·충돌·솔버·난수 스트림에 접근하지 않고 게임 상태에 쓰지도
 *     않는다. 여백이 난수를 건드리면 프레임 타이밍이 코스를 바꾼다.
 *  2. **통로 안으로 새지 않는다.** 근접대를 도려낸 벽 경로로 clip 한 뒤에만 그린다.
 *  3. **예산 안에서만 존재한다.** 초과하면 스스로 강등한다.
 *
 * M1 의 입주자는 섹터 유형 질감 하나다. 기록 이정표(M2)·게시물(M4)이 같은 clip
 * 안에서 이 아래에 붙는다.
 *
 * 설계 근거: docs/design/margin-texture.md
 */
import { KEEPOUT, insetWallPath, textureRegions } from "./bands";
import type { WallPoints } from "./bands";
import { MarginBudget } from "./budget";
import { drawMarks, milestoneMarks } from "./markers";
import { drawTexture, prebakeTiles } from "./texture";
import type { MarginView } from "./texture";
import type { GameState } from "../engine";
import type { View } from "../camera";

export { KEEPOUT };
export { resetTextureCache } from "./texture";
export { milestoneMarks } from "./markers";
export type { MarginTier } from "./budget";

const budget = new MarginBudget();

/** 개발 패널·검증이 읽는다 */
export function marginStats(): Readonly<MarginBudget["stats"]> {
  return budget.stats;
}

export interface MarginArgs {
  view: View;
  camX: number;
  offsetY: number;
  cssW: number;
  cssH: number;
  /**
   * render.ts 가 이미 만든 벽 경계 점들. 다시 샘플링하지 않는 것이 요점이다 —
   * 여백은 화면당 추가 기하 계산이 0 이어야 한다.
   */
  topPts: WallPoints;
  botPts: WallPoints;
}

export function drawMargin(
  ctx: CanvasRenderingContext2D,
  state: Readonly<GameState>,
  args: MarginArgs
): void {
  // 런이 새로 시작되면 강등이 풀린다. 런 도중에는 한 방향으로만 간다.
  if (state.phase === "ready") budget.reset();
  if (budget.tier >= 3) return;

  const now = performance.now();
  budget.begin(now);

  const { view, camX, offsetY, cssW, cssH, topPts, botPts } = args;
  // 기본 변환의 배율이 곧 dpr 이다 — GameCanvas 가 setTransform(dpr,…) 로 깔아 둔다
  const dpr = typeof ctx.getTransform === "function" ? ctx.getTransform().a || 1 : 1;
  const marginView: MarginView = { camX, zoom: view.zoom, offsetY, cssW, cssH, dpr };

  // 입력 전에 네 유형을 다 구워 둔다 — 주행 중 첫 등장 프레임에 비용이 몰리지 않게
  if (state.phase === "ready") prebakeTiles(ctx, view.zoom, dpr);

  const regions = textureRegions(
    state.course,
    camX - 20,
    camX + view.viewWorldW + 20,
    budget.tier < 2
  );

  ctx.save();
  insetWallPath(ctx, topPts, botPts, cssW, cssH, view.zoom);
  ctx.clip();
  // 아래에서 위로: 유형 질감 → 기록 이정표
  drawTexture(ctx, regions, marginView);
  drawMarks(ctx, milestoneMarks(state), state, {
    camX,
    zoom: view.zoom,
    offsetY,
    cssW,
    worldHeight: state.base.worldHeight
  });
  ctx.restore();

  budget.end(performance.now());
}
