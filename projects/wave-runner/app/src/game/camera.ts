import type { Tuning } from "./types";

export interface View {
  /** 월드 1단위당 화면 픽셀 */
  zoom: number;
  /** 화면에 보이는 월드 폭 */
  viewWorldW: number;
  /** 화면에 보이는 월드 높이 */
  viewWorldH: number;
  /**
   * **아바타 코앞의** 선행 가시 시간(초). 화면 전체를 가로지르는 시간이 아니다 —
   * 아바타는 `cameraAnchor` 지점에 있고 그 왼쪽은 이미 지나온 구간이라 선행이 아니다.
   */
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
 *
 * ## 아바타 앞쪽만 센다 — 리뷰가 잡은 산술 오류
 *
 * cap 이 `canvasW / (speed × lookaheadMinSec)` 이던 판본은 **화면 전체 폭**을 건너는
 * 시간을 쟀다. 그런데 아바타는 좌측 `cameraAnchor` 지점에 고정되어 있으므로 화면의
 * 그 왼쪽 부분은 이미 지나온 구간이다. 실제로 보장되던 값은 `1.2 × (1 − 0.28) = 0.864초`
 * 였고, 위 주석과 `tests/smoke/lookahead.test.mjs` 는 같은 식을 복사해 두어 이 구멍을
 * 잡지 못했다. 이제 `(1 − cameraAnchor)` 를 곱해 **코앞 시간**을 직접 보장한다.
 *
 * 그 대가로 줌이 내려가 레터박스가 커지므로 `cameraAnchor` 를 0.28 → 0.18 로 당겼다.
 * 뒤쪽 시야는 이 게임에서 쓰이지 않는다(뒤로 가는 정보가 없다). 390×720 에서
 * 줌 6.35, 레터박스 위아래 43px, 코앞 정확히 1.20초다.
 */
export function computeView(canvasW: number, canvasH: number, t: Tuning): View {
  const fit = canvasH / t.worldHeight;
  const ahead = 1 - t.cameraAnchor;
  const cap = (canvasW * ahead) / (t.speed * t.lookaheadMinSec);
  const zoom = Math.min(fit, cap);
  const viewWorldW = canvasW / zoom;
  return {
    zoom,
    viewWorldW,
    viewWorldH: canvasH / zoom,
    lookaheadSec: (viewWorldW * ahead) / t.speed
  };
}

/** 아바타를 화면 좌측 cameraAnchor 지점에 고정했을 때의 카메라 월드 x. */
export function cameraX(playerX: number, view: View, t: Tuning): number {
  return playerX - view.viewWorldW * t.cameraAnchor;
}
