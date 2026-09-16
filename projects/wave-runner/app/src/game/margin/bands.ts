/**
 * 여백의 좌표계 — 벽에서 근접대를 도려낸 영역과, 그 위에 어떤 유형의 질감이
 * 어느 x 구간에 깔리는지.
 *
 * 설계 근거: docs/design/margin-texture.md §3.2, §3.3
 */
import { smooth } from "../geometry";
import type { Course, CoursePiece, SectorType } from "../types";

/**
 * 통로 경계에서 비워 두는 두께.
 *
 * 아바타 반지름 1.6 의 5배이고, 사망 시 0.5초간 겹쳐 그리는 "지나갈 수 있었던
 * 자리" 초록 띠(render.ts 의 deathGap, 아바타 기준 ±2r)가 침범당하지 않는
 * 최소값이다.
 */
export const KEEPOUT = 8;

/** 리드인 크로스페이드를 몇 조각으로 나눠 그리는가. 대비 1.3:1 에서 6조각의 계단은 보이지 않는다 */
export const CROSSFADE_SLICES = 6;

export type WallPoints = ReadonlyArray<readonly [number, number]>;

/**
 * 근접대를 도려낸 벽 영역을 현재 경로에 쌓는다. 호출자가 clip 한다.
 *
 * 벽은 `y ≤ top(x)` 와 `y ≥ bot(x)` 라는 **함수의 그래프**이므로, "경계에서 8만큼
 * 안쪽"은 곡선 오프셋을 계산할 필요 없이 y 를 ∓8 미는 것이 정확한 답이다.
 * render.ts 가 이미 만든 점 배열을 그대로 쓰므로 추가 샘플링이 0 이다.
 *
 * 이웃 한 칸까지 보며 **더 안전한 쪽**을 고르는 것은 꺾이는 자리 때문이다. 점 배열은
 * 4px 간격의 꺾은선이라 회랑 램프가 꺾이는 지점에서 현이 모서리를 자르고, 그만큼
 * 근접대가 얇아진다(실측 8 → 6.2). 3탭 필터 하나로 그 오차가 사라지고 비용은 O(n)이다.
 */
export function insetWallPath(
  ctx: CanvasRenderingContext2D,
  topPts: WallPoints,
  botPts: WallPoints,
  cssW: number,
  cssH: number,
  zoom: number
): void {
  const k = KEEPOUT * zoom;
  const pad = 8;

  ctx.beginPath();
  ctx.moveTo(-pad, -cssH);
  for (let i = 0; i < topPts.length; i += 1) {
    const lo = Math.min(
      topPts[Math.max(0, i - 1)][1],
      topPts[i][1],
      topPts[Math.min(topPts.length - 1, i + 1)][1]
    );
    ctx.lineTo(topPts[i][0], lo - k);
  }
  ctx.lineTo(cssW + pad, -cssH);
  ctx.closePath();

  ctx.moveTo(-pad, cssH * 2);
  for (let i = 0; i < botPts.length; i += 1) {
    const hi = Math.max(
      botPts[Math.max(0, i - 1)][1],
      botPts[i][1],
      botPts[Math.min(botPts.length - 1, i + 1)][1]
    );
    ctx.lineTo(botPts[i][0], hi + k);
  }
  ctx.lineTo(cssW + pad, cssH * 2);
  ctx.closePath();
}

export interface TextureRegion {
  x0: number;
  x1: number;
  type: SectorType;
  alpha: number;
}

function sectorTypeOf(piece: CoursePiece | undefined): SectorType | null {
  return piece && piece.kind === "sector" && piece.sector ? piece.sector.type : null;
}

/**
 * 화면에 깔릴 질감 구간들.
 *
 * - 섹터 본체: 자기 유형 100%
 * - 게이트 리드인: 이전 유형 → 다음 유형 크로스페이드
 * - 게이트 스팬(분기 구간)과 칸막이: 질감 없음
 *
 * 리드인을 크로스페이드 구간으로 쓰는 것은 취향이 아니라 측정의 결과다. 세로
 * 모바일에서는 zoom 에 cap 이 걸려 가시 폭이 50월드로 줄기 때문에, 다음 섹터의
 * 벽이 관 선택보다 0.24초 **늦게** 보인다. 리드인에서 바꾸면 신호가 플레이어
 * 바로 옆 벽에서 읽히므로 가시 폭과 무관해진다.
 */
export function textureRegions(
  course: Course,
  fromX: number,
  toX: number,
  crossfade: boolean
): TextureRegion[] {
  const out: TextureRegion[] = [];
  const pieces = course.pieces;

  for (let i = 0; i < pieces.length; i += 1) {
    const piece = pieces[i];
    if (piece.endX < fromX || piece.startX > toX) continue;

    if (piece.kind === "sector" && piece.sector) {
      out.push({
        x0: Math.max(piece.startX, fromX),
        x1: Math.min(piece.endX, toX),
        type: piece.sector.type,
        alpha: 1
      });
      continue;
    }

    if (piece.kind !== "gate" || !piece.gate) continue;
    const gate = piece.gate;
    const prev = sectorTypeOf(pieces[i - 1]);
    const next = sectorTypeOf(pieces[i + 1]);
    // 스팬은 단색으로 비운다 — 크로스페이드가 끝났다는 표시이자,
    // 칸막이 때문에 벽 형상이 가장 복잡한 구간이라 질감이 형상 판독과 다툰다.
    if (!crossfade) continue;

    const len = gate.startX - gate.leadInX;
    if (len <= 0) continue;
    for (let s = 0; s < CROSSFADE_SLICES; s += 1) {
      const x0 = gate.leadInX + (len * s) / CROSSFADE_SLICES;
      const x1 = gate.leadInX + (len * (s + 1)) / CROSSFADE_SLICES;
      if (x1 < fromX || x0 > toX) continue;
      const mix = smooth((s + 0.5) / CROSSFADE_SLICES);
      const lo = Math.max(x0, fromX);
      const hi = Math.min(x1, toX);
      if (prev) out.push({ x0: lo, x1: hi, type: prev, alpha: 1 - mix });
      if (next) out.push({ x0: lo, x1: hi, type: next, alpha: mix });
    }
  }

  return out;
}
