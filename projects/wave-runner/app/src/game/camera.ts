import type { Tuning } from "./types";

export interface View {
  /** 월드 1단위당 화면 픽셀 */
  zoom: number;
  /** 화면에 보이는 월드 폭 */
  viewWorldW: number;
  /** 화면에 보이는 월드 높이 */
  viewWorldH: number;
  /** 현재 속도 기준 선행 가시 시간(초) */
  lookaheadSec: number;
}

/**
 * 줌은 두 제약의 최솟값이다.
 *
 *  - fit:  월드 높이가 화면 높이에 들어가는 배율
 *  - cap:  선행 가시 시간이 lookaheadMinSec 이상이 되는 최대 배율
 *
 * cap이 걸리면 위아래로 레터박스가 생기지만, 그 대가로
 * "화면 우측 끝의 장애물이 최소 1.2초 뒤에 도달한다"는 설계 상수가
 * 해상도와 무관하게 구조적으로 보장된다.
 */
export function computeView(canvasW: number, canvasH: number, t: Tuning): View {
  const fit = canvasH / t.worldHeight;
  const cap = canvasW / (t.speed * t.lookaheadMinSec);
  const zoom = Math.min(fit, cap);
  const viewWorldW = canvasW / zoom;
  return {
    zoom,
    viewWorldW,
    viewWorldH: canvasH / zoom,
    lookaheadSec: viewWorldW / t.speed
  };
}

/** 아바타를 화면 좌측 cameraAnchor 지점에 고정했을 때의 카메라 월드 x. */
export function cameraX(playerX: number, view: View, t: Tuning): number {
  return playerX - view.viewWorldW * t.cameraAnchor;
}
