/**
 * 설계 상수 회귀 테스트.
 *
 * one-button-roguelite-direction.md §3.2 — 횡스크롤에서 선행 시야는 이 게임의
 * 유일한 실질 손실이므로 "선행 가시 시간 1.2초 이상"을 상수로 관리한다.
 * camera.ts 의 줌 규칙이 이를 구조적으로 보장하지만, 속도를 올리면 그 대가로
 * 세로 가시 범위가 줄어든다. 여기서 두 가지를 동시에 지킨다.
 *
 * 줌 공식은 camera.ts 와 동일하다(TS 모듈을 .mjs 에서 직접 못 읽으므로 2줄만 재기술).
 * tuning.json 이 유일한 상수 출처이므로 값이 어긋날 일은 없다.
 *
 * **재기술은 공짜가 아니었다.** 첫 판본은 화면 전체 폭을 건너는 시간을 쟀는데, 아바타는
 * cameraAnchor 지점에 있으므로 그 왼쪽은 선행이 아니다. camera.ts 와 이 파일이 같은
 * 오식을 복사하고 있어서 회귀 테스트가 제 구멍을 못 봤다. 이제 둘 다 (1 - cameraAnchor)
 * 를 곱하고, 아래에 **공식과 무관한 독립 검산**을 하나 더 둔다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const here = path.dirname(fileURLToPath(import.meta.url));
const tuning = JSON.parse(
  readFileSync(path.join(here, "..", "..", "app", "src", "game", "tuning.json"), "utf8")
);

/** 지원하는 가장 좁은 뷰포트. 세로 프레임의 모바일 하한. */
const MIN_VIEWPORT = { w: 360, h: 640 };

/** 세로 가시 범위가 월드 높이의 이 비율 밑으로 내려가면 코스가 안 보인다. */
const MIN_VISIBLE_HEIGHT_RATIO = 0.6;

function computeView(canvasW, canvasH, t) {
  const ahead = 1 - t.cameraAnchor;
  const zoom = Math.min(canvasH / t.worldHeight, (canvasW * ahead) / (t.speed * t.lookaheadMinSec));
  return {
    zoom,
    viewWorldW: canvasW / zoom,
    viewWorldH: canvasH / zoom,
    lookaheadSec: ((canvasW / zoom) * ahead) / t.speed
  };
}

const view = computeView(MIN_VIEWPORT.w, MIN_VIEWPORT.h, tuning);

assert.ok(
  view.lookaheadSec >= tuning.lookaheadMinSec - 1e-9,
  `선행 가시 시간 ${view.lookaheadSec.toFixed(2)}s < 설계 상수 ${tuning.lookaheadMinSec}s`
);

/**
 * 공식을 믿지 않는 검산: 아바타를 화면에 실제로 놓고, 우측 끝 픽셀이 월드 어디인지
 * 역산해 도달 시간을 잰다. computeView 가 어떻게 바뀌든 이 줄은 코앞 시간을 잰다.
 */
const playerScreenX = MIN_VIEWPORT.w * tuning.cameraAnchor;
const worldPerPx = 1 / view.zoom;
const aheadWorld = (MIN_VIEWPORT.w - playerScreenX) * worldPerPx;
assert.ok(
  aheadWorld / tuning.speed >= tuning.lookaheadMinSec - 1e-9,
  `코앞 선행 ${(aheadWorld / tuning.speed).toFixed(3)}s < ${tuning.lookaheadMinSec}s ` +
    `— 아바타(화면 x ${playerScreenX.toFixed(0)}px)에서 우측 끝까지 ${aheadWorld.toFixed(1)} 월드뿐이다`
);

const visibleRatio = Math.min(view.viewWorldH, tuning.worldHeight) / tuning.worldHeight;
assert.ok(
  visibleRatio >= MIN_VISIBLE_HEIGHT_RATIO,
  `${MIN_VIEWPORT.w}x${MIN_VIEWPORT.h} 에서 세로 가시 범위가 월드의 ${(visibleRatio * 100).toFixed(0)}% 뿐이다. ` +
    `속도(${tuning.speed})를 낮추거나 월드 높이(${tuning.worldHeight})를 줄여야 한다.`
);

console.log(
  `lookahead ok — ${MIN_VIEWPORT.w}x${MIN_VIEWPORT.h}: ` +
    `코앞 ${view.lookaheadSec.toFixed(2)}s 선행(독립 검산 ${(aheadWorld / tuning.speed).toFixed(2)}s), ` +
    `세로 가시 ${(visibleRatio * 100).toFixed(0)}%`
);
