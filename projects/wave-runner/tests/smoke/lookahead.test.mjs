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
  const zoom = Math.min(canvasH / t.worldHeight, canvasW / (t.speed * t.lookaheadMinSec));
  return {
    zoom,
    viewWorldW: canvasW / zoom,
    viewWorldH: canvasH / zoom,
    lookaheadSec: canvasW / zoom / t.speed
  };
}

const view = computeView(MIN_VIEWPORT.w, MIN_VIEWPORT.h, tuning);

assert.ok(
  view.lookaheadSec >= tuning.lookaheadMinSec - 1e-9,
  `선행 가시 시간 ${view.lookaheadSec.toFixed(2)}s < 설계 상수 ${tuning.lookaheadMinSec}s`
);

const visibleRatio = Math.min(view.viewWorldH, tuning.worldHeight) / tuning.worldHeight;
assert.ok(
  visibleRatio >= MIN_VISIBLE_HEIGHT_RATIO,
  `${MIN_VIEWPORT.w}x${MIN_VIEWPORT.h} 에서 세로 가시 범위가 월드의 ${(visibleRatio * 100).toFixed(0)}% 뿐이다. ` +
    `속도(${tuning.speed})를 낮추거나 월드 높이(${tuning.worldHeight})를 줄여야 한다.`
);

console.log(
  `lookahead ok — ${MIN_VIEWPORT.w}x${MIN_VIEWPORT.h}: ` +
    `${view.lookaheadSec.toFixed(2)}s 선행, 세로 가시 ${(visibleRatio * 100).toFixed(0)}%`
);
