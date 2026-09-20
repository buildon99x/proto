import { RAMPS, SITE_ACCENT, SITE_RIM_STYLE } from "./palette";
import { MOTIF_BITS } from "./motifs";
import { UNIQUE_SPRITES } from "./unique-sprites";
import { Rng } from "../game/rng";
import type { Artifact, Shape, SiteId } from "../game/types";

export const SPRITE_SIZE = 32;

/**
 * 절차적 유물 스프라이트. `(shape, palette, seed, site, tier)` 가 같으면 항상 같은
 * 32×32가 나온다 — 전부 정적 데이터라 세이브에 아이콘을 담지 않는다(spriteUrl 캐시).
 *
 * 실물 재현이 목적이 아니다 — 한눈에 구분되고 팔레트가 통일된 도트가 목적이고,
 * 실존성은 이름·연대·소장처·내력 텍스트가 담보한다(notes/mda.md §7.4).
 *
 * ── v0.4 구조 (notes/decisions.md G69) ──────────────────────────────────
 * v0.3까지는 `shape` 10종 × `palette` 7종 = 70개 실루엣 조합이 2,000종을 덮었고,
 * 종별 차이는 좌우대칭 명암 마크뿐이라 44px에서 사실상 구분되지 않았다. v0.4는
 * 네 층을 얹는다.
 *
 *  1. **변형(variant)** — `shape` 하나에 실루엣 6종. `shape`는 시세 카테고리이므로
 *     (notes/world-map.md §8.1) 타입을 늘리지 않고 안에서 갈랐다. 10×6 = 60 실루엣.
 *  2. **거점 악센트 테두리** — 외곽선 바로 안쪽 1px 링을 거점색으로 칠한다.
 *     양식(solid·dashed·dotted)이 두 번째 채널이다.
 *  3. **거점 문양** — 8×8 스텐실을 몸체 내부에 타일링한다(render/motifs.ts).
 *  4. **T4 전용 비트맵** — 유일 12종은 절차 생성을 타지 않고 손으로 찍은 32×32
 *     도트를 쓴다(render/unique-sprites.ts).
 *
 * 2·3은 **T2 이상에만** 적용한다. T0~T1(1,763종)은 v0.3과 같은 표현이고, 상위
 * 티어가 새 표현을 얻으면서 아래가 상대적으로 소박해 보이는 건 의도한 결과다.
 */

type Mask = Float32Array; // 0 = 빈 칸, >0 = 두께(명암 계산용)

/** 32×32 RGBA 바이트(길이 4096). `ImageData` 생성자가 요구하는 버퍼 종류를 고정한다 */
export type Rgba = Uint8ClampedArray<ArrayBuffer>;

/** shape 하나당 실루엣 변형 수 */
export const SHAPE_VARIANTS = 6;

function idx(x: number, y: number) {
  return y * SPRITE_SIZE + x;
}

function ellipse(mask: Mask, cx: number, cy: number, rx: number, ry: number, weight = 1) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(31, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(31, Math.ceil(cx + rx)); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight * (1 - d * 0.55));
    }
  }
}

function rect(mask: Mask, x0: number, y0: number, x1: number, y1: number, weight = 1) {
  for (let y = Math.max(0, y0); y <= Math.min(31, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(31, x1); x++) {
      mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

function triangle(mask: Mask, cx: number, top: number, bottom: number, halfWidth: number, weight = 1) {
  for (let y = top; y <= bottom; y++) {
    const k = (y - top) / Math.max(1, bottom - top);
    const half = Math.round(halfWidth * k);
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 32 && y >= 0 && y < 32) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

/** 위 반폭 halfTop → 아래 반폭 halfBottom 으로 선형 변하는 사다리꼴 */
function trapezoid(
  mask: Mask, cx: number, top: number, bottom: number, halfTop: number, halfBottom: number, weight = 1
) {
  for (let y = top; y <= bottom; y++) {
    if (y < 0 || y > 31) continue;
    const k = (y - top) / Math.max(1, bottom - top);
    const half = Math.round(halfTop + (halfBottom - halfTop) * k);
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < 32) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

/** 채운 고리(도넛). rInner 안쪽은 비운다 */
function ring(mask: Mask, cx: number, cy: number, rOuter: number, rInner: number, weight = 1) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= rOuter && d >= rInner) mask[idx(x, y)] = Math.max(mask[idx(x, y)], weight);
    }
  }
}

function carve(mask: Mask, x0: number, y0: number, x1: number, y1: number) {
  for (let y = Math.max(0, y0); y <= Math.min(31, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(31, x1); x++) mask[idx(x, y)] = 0;
  }
}

/** 영역의 두께만 낮춘다(음각·요철). 실루엣은 유지된다 */
function dim(mask: Mask, x0: number, y0: number, x1: number, y1: number, f: number) {
  for (let y = Math.max(0, y0); y <= Math.min(31, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(31, x1); x++) {
      if (mask[idx(x, y)] > 0) mask[idx(x, y)] *= f;
    }
  }
}

/** 원 고리 모양 음각(기어 홈·주화 테두리) */
function dimRing(mask: Mask, cx: number, cy: number, rOuter: number, rInner: number, f: number) {
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= rOuter && d >= rInner && mask[idx(x, y)] > 0) mask[idx(x, y)] *= f;
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// 실루엣 — shape 10종 × 변형 6종
//
// 변형은 그 시세 카테고리 안에서 실제로 존재하는 기형(器形)에서 골랐다. 32px에서
// 뭉개지지 않게 "윤곽선만 봐도 갈리는" 차이를 우선했다 — 표면 장식 차이는 44px에서
// 사라지므로 변형의 근거로 쓰지 않는다.
// ════════════════════════════════════════════════════════════════════════

const SHAPE_VARIANT_NAMES: Record<Shape, string[]> = {
  jar: ["매병", "장경호", "편병", "주자", "고배", "삼족기"],
  sword: ["직도", "곡도", "단검", "창", "환두대도", "도끼"],
  crown: ["출자관", "보관(대륜)", "아치관", "삼산관", "모관", "관식"],
  mask: ["타원 면", "각진 면", "유각 면", "수염 면", "광대 면", "원형 면"],
  scroll: ["가로 두루마리", "세로 축", "감긴 권자본", "책자", "병풍", "절첩본"],
  coin: ["원형", "방공전", "타원 정은", "편심 주화", "도폐", "이중테"],
  tablet: ["점토판", "아치 비석", "원반", "오벨리스크", "팔레트", "낱장"],
  statue: ["입상", "좌상", "반가상", "흉상", "기둥상", "동물상"],
  ornament: ["드리개", "귀걸이 쌍", "목걸이", "팔찌", "피불라", "반지"],
  mechanism: ["이중 기어", "등잔대", "천칭", "수레바퀴", "퀴푸", "철주"]
};

export function shapeVariantName(shape: Shape, variant: number): string {
  return SHAPE_VARIANT_NAMES[shape][variant % SHAPE_VARIANTS];
}

function buildJar(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 매병 — 어깨가 부풀고 굽이 좁다
      trapezoid(m, 16, 11, 29, 9 + rng.int(0, 2), 5);
      ellipse(m, 16, 13, 9, 5);
      rect(m, 13, 7, 18, 11, 0.92);
      rect(m, 12, 5, 19, 7, 1);
      break;
    case 1: // 장경호 — 긴 목 + 둥근 몸
      ellipse(m, 16, 22, 8 + rng.int(0, 2), 8);
      rect(m, 14, 6, 17, 16, 0.88);
      rect(m, 11, 3, 20, 6, 1);
      rect(m, 13, 29, 18, 30, 0.85);
      break;
    case 2: // 편병 — 납작한 몸통 + 작은 목 + 고리 둘
      ellipse(m, 16, 19, 11, 8 + rng.int(0, 2));
      rect(m, 14, 8, 17, 12, 0.9);
      rect(m, 12, 5, 19, 8, 1);
      ring(m, 5, 17, 3.4, 1.8, 0.85);
      ring(m, 27, 17, 3.4, 1.8, 0.85);
      break;
    case 3: // 주자 — 몸통 + 오른쪽 주구 + 왼쪽 손잡이
      ellipse(m, 16, 20, 8, 8);
      rect(m, 14, 10, 18, 14, 0.9);
      rect(m, 13, 7, 19, 10, 1);
      trapezoid(m, 25, 9, 16, 1, 3, 0.92);
      ring(m, 6, 17, 4.2, 2.4, 0.86);
      rect(m, 13, 28, 18, 30, 0.85);
      break;
    case 4: // 고배 — 얕은 완 + 높은 굽
      trapezoid(m, 16, 6, 14, 10 + rng.int(0, 2), 4);
      rect(m, 14, 14, 17, 24, 0.88);
      trapezoid(m, 16, 24, 30, 4, 10);
      dim(m, 6, 27, 25, 28, 0.7);
      break;
    default: // 삼족기 — 둥근 몸 + 다리 셋
      ellipse(m, 16, 15, 9, 8);
      rect(m, 12, 5, 19, 8, 0.95);
      rect(m, 8, 22, 10, 30, 0.9);
      rect(m, 15, 23, 17, 30, 0.9);
      rect(m, 22, 22, 24, 30, 0.9);
      break;
  }
}

function buildSword(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 직도 — 곧은 날 + 십자 손잡이
      rect(m, 15, 2, 16, 20);
      rect(m, 14, 4, 17, 19, 0.85);
      rect(m, 8, 20, 23, 22);
      rect(m, 15, 22, 16, 28, 0.9);
      ellipse(m, 16, 29, 3, 2);
      break;
    case 1: // 곡도 — 휜 날
      for (let y = 2; y <= 21; y++) {
        const x = 12 + Math.round(7 * Math.sin(((y - 2) / 19) * 1.2));
        rect(m, x, y, x + 2, y, 1);
        rect(m, x, y, x + 1, y, 0.82);
      }
      rect(m, 10, 22, 20, 23);
      rect(m, 14, 23, 16, 29, 0.9);
      break;
    case 2: // 단검 — 짧고 넓은 날 + 큰 자루머리
      trapezoid(m, 16, 5, 17, 1, 4);
      rect(m, 12, 17, 20, 19);
      rect(m, 14, 19, 18, 25, 0.88);
      ellipse(m, 16, 27, 5, 4);
      break;
    case 3: // 창 — 긴 자루 + 나뭇잎형 창끝
      ellipse(m, 16, 7, 4, 6);
      rect(m, 15, 12, 17, 31, 0.9);
      rect(m, 12, 14, 20, 15, 0.95);
      break;
    case 4: // 환두대도 — 고리 자루머리
      rect(m, 15, 4, 17, 21);
      rect(m, 14, 6, 18, 20, 0.85);
      rect(m, 10, 21, 22, 23);
      rect(m, 15, 23, 17, 26, 0.9);
      ring(m, 16, 28, 4.2, 2.2);
      break;
    default: // 도끼 — 자루 + 도끼날
      rect(m, 14, 4, 16, 31, 0.9);
      trapezoid(m, 22, 6, 17, 3, 7);
      dim(m, 20, 8, 21, 15, 0.7);
      rng.int(0, 1);
      break;
  }
}

function buildCrown(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 출자관 — 신라 금관 계열, 세움장식 셋
      rect(m, 6, 20, 25, 27);
      triangle(m, 16, 5, 20, 4);
      triangle(m, 9, 10, 20, 3);
      triangle(m, 23, 10, 20, 3);
      break;
    case 1: // 보관(대륜) — 낮은 띠 + 드리개
      rect(m, 4, 13, 27, 20);
      dim(m, 4, 15, 27, 16, 0.7);
      for (const x of [7, 12, 19, 24]) rect(m, x, 20, x + 1, 26 + rng.int(0, 2), 0.88);
      break;
    case 2: // 아치관 — 가운데가 솟은 아치
      ring(m, 16, 24, 13, 10);
      carve(m, 0, 25, 31, 31);
      rect(m, 3, 22, 28, 27);
      dim(m, 3, 24, 28, 25, 0.72);
      break;
    case 3: // 삼산관 — 세 봉우리
      rect(m, 5, 22, 26, 28);
      triangle(m, 10, 11, 22, 5);
      triangle(m, 16, 6, 22, 5);
      triangle(m, 22, 11, 22, 5);
      break;
    case 4: // 모관 — 반구 + 띠
      ellipse(m, 16, 18, 11, 10);
      carve(m, 0, 22, 31, 31);
      rect(m, 4, 21, 27, 26);
      dim(m, 4, 23, 27, 24, 0.7);
      break;
    default: // 관식 — 관모에 꽂는 세움장식 하나
      rect(m, 10, 25, 21, 29);
      trapezoid(m, 16, 3, 25, 1, 7);
      dim(m, 15, 8, 16, 24, 0.68);
      break;
  }
}

function buildMask(m: Mask, v: number, rng: Rng) {
  const eye = (x0: number, y0: number) => carve(m, x0, y0, x0 + 2, y0 + 1);
  switch (v) {
    case 0: // 타원 면
      ellipse(m, 16, 17, 9, 12);
      eye(11, 14);
      eye(18, 14);
      carve(m, 14, 22, 17, 23);
      break;
    case 1: // 각진 면 — 사각 윤곽
      rect(m, 8, 5, 23, 27);
      carve(m, 8, 5, 9, 6);
      carve(m, 22, 5, 23, 6);
      eye(11, 12);
      eye(18, 12);
      dim(m, 14, 16, 17, 20, 0.7);
      carve(m, 13, 22, 18, 23);
      break;
    case 2: // 유각 면 — 뿔 둘
      ellipse(m, 16, 19, 8, 10);
      trapezoid(m, 8, 4, 12, 1, 3, 0.9);
      trapezoid(m, 24, 4, 12, 1, 3, 0.9);
      eye(11, 16);
      eye(18, 16);
      break;
    case 3: // 수염 면 — 턱이 길다
      ellipse(m, 16, 14, 9, 9);
      trapezoid(m, 16, 22, 30, 6, 2, 0.9);
      eye(11, 12);
      eye(18, 12);
      dim(m, 13, 24, 18, 29, 0.68);
      break;
    case 4: // 광대 면 — 볼이 넓고 턱이 좁다
      trapezoid(m, 16, 6, 28, 11, 3);
      dim(m, 5, 6, 26, 7, 0.8);
      eye(10, 13);
      eye(19, 13);
      carve(m, 14, 20, 17, 21);
      break;
    default: // 원형 면 — 눈구멍이 크다
      ellipse(m, 16, 16, 12, 12);
      carve(m, 9, 12, 13, 15);
      carve(m, 18, 12, 22, 15);
      carve(m, 14, 21, 17, 24);
      rng.int(0, 1);
      break;
  }
}

function buildScroll(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 가로 두루마리 — 위아래 축
      rect(m, 4, 6, 27, 8);
      rect(m, 4, 25, 27, 27);
      rect(m, 6, 9, 25, 24, 0.85);
      for (let i = 0; i < 4; i++) dim(m, 9, 11 + i * 3, 22, 11 + i * 3, 0.66);
      break;
    case 1: // 세로 축(괘축) — 좌우 축봉
      rect(m, 3, 4, 5, 28);
      rect(m, 26, 4, 28, 28);
      rect(m, 6, 6, 25, 26, 0.85);
      for (let i = 0; i < 5; i++) dim(m, 8 + i * 4, 9, 8 + i * 4, 23, 0.66);
      break;
    case 2: // 감긴 권자본 — 두꺼운 통 + 아래로 풀린 판면
      ellipse(m, 22, 9, 8, 7);
      dimRing(m, 22, 9, 5, 3, 0.62);
      rect(m, 4, 12, 27, 28, 0.88);
      for (let i = 0; i < 4; i++) dim(m, 7, 15 + i * 3, 24, 15 + i * 3, 0.62);
      break;
    case 3: // 책자 — 등마루 + 책배
      rect(m, 6, 4, 25, 28);
      rect(m, 6, 4, 9, 28, 1);
      dim(m, 10, 6, 24, 26, 0.85);
      for (let i = 0; i < 6; i++) dim(m, 12, 8 + i * 3, 23, 8 + i * 3, 0.68);
      break;
    case 4: // 병풍 — 접힌 폭 넷
      rect(m, 2, 7, 29, 26);
      for (const x of [9, 16, 23]) dim(m, x, 7, x, 26, 0.55);
      dim(m, 2, 7, 8, 26, 0.92);
      dim(m, 17, 7, 22, 26, 0.92);
      rng.int(0, 1);
      break;
    default: // 절첩본 — 지그재그
      for (let i = 0; i < 4; i++) {
        const x = 3 + i * 7;
        trapezoid(m, x + 3, 9, 24, 1, 4, 0.9);
        dim(m, x + 2, 10, x + 3, 23, 0.6);
      }
      rect(m, 2, 24, 29, 26, 0.95);
      break;
  }
}

function buildCoin(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 원형
      ellipse(m, 16, 16, 13, 13);
      dimRing(m, 16, 16, 10, 8.5, 0.72);
      break;
    case 1: // 방공전 — 네모 구멍 엽전
      ellipse(m, 16, 16, 13, 13);
      carve(m, 13, 13, 18, 18);
      dimRing(m, 16, 16, 12, 10.5, 0.75);
      break;
    case 2: // 타원 정은 — 길쭉한 은괴
      ellipse(m, 16, 16, 14, 8);
      dim(m, 10, 13, 22, 14, 0.68);
      dim(m, 10, 18, 22, 19, 0.68);
      break;
    case 3: // 편심 주화 — 초기 타압 주화. 원이 가운데서 벗어나 있다
      ellipse(m, 14 + rng.int(0, 2), 17, 12, 11);
      dimRing(m, 13, 15, 7, 4, 0.7);
      break;
    case 4: // 도폐 — 칼 모양 화폐
      rect(m, 6, 20, 26, 24);
      ellipse(m, 7, 22, 4, 4);
      carve(m, 6, 21, 8, 23);
      trapezoid(m, 22, 8, 20, 2, 4, 0.9);
      break;
    default: // 이중테
      ellipse(m, 16, 16, 13, 13);
      dimRing(m, 16, 16, 12, 11, 0.7);
      dimRing(m, 16, 16, 8, 7, 0.7);
      ellipse(m, 16, 16, 4, 4, 1);
      break;
  }
}

function buildTablet(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 점토판
      rect(m, 6, 3, 25, 29);
      for (let i = 0; i < 6; i++) dim(m, 9, 7 + i * 4, 22, 7 + i * 4, 0.6);
      break;
    case 1: // 아치 비석 — 위가 둥근 석비
      ellipse(m, 16, 11, 10, 10);
      carve(m, 0, 12, 31, 31);
      rect(m, 6, 10, 25, 30);
      dim(m, 9, 16, 22, 17, 0.62);
      dim(m, 9, 22, 22, 23, 0.62);
      break;
    case 2: // 원반 — 둥근 기념석
      ellipse(m, 16, 16, 14, 14);
      dimRing(m, 16, 16, 12, 10.5, 0.66);
      dimRing(m, 16, 16, 7, 5.5, 0.66);
      break;
    case 3: // 오벨리스크 — 위로 좁아지며 피라미디온
      triangle(m, 16, 2, 7, 4);
      trapezoid(m, 16, 7, 28, 4, 8);
      rect(m, 8, 28, 23, 30);
      dim(m, 15, 9, 16, 27, 0.62);
      break;
    case 4: // 팔레트 — 방패꼴 화장판
      ellipse(m, 16, 14, 10, 11);
      trapezoid(m, 16, 22, 30, 9, 5);
      dimRing(m, 16, 13, 5, 3.5, 0.68);
      break;
    default: // 낱장 — 가장자리가 해진 파피루스
      rect(m, 4, 6, 27, 26);
      for (let i = 0; i < 5; i++) {
        carve(m, 4, 7 + rng.int(0, 17), 4 + rng.int(0, 1), 8 + rng.int(0, 1));
        carve(m, 26 - rng.int(0, 1), 7 + rng.int(0, 17), 27, 8);
      }
      for (let i = 0; i < 5; i++) dim(m, 7, 9 + i * 4, 24, 9 + i * 4, 0.6);
      break;
  }
}

function buildStatue(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 입상 — 머리 + 아래로 벌어지는 몸체
      // v0.3까지 이 자리에 `triangle(m, 16, 30, 13, 9)`가 있었다. 인자 순서가
      // (cx, top, bottom, halfWidth)인데 top=30 > bottom=13이라 루프가 한 번도
      // 돌지 않았고, statue 종 전부가 "머리 + 바닥 막대"로만 그려졌다.
      ellipse(m, 16, 8, 5, 6);
      triangle(m, 16, 12, 29, 9);
      rect(m, 10, 29, 21, 30, 0.9);
      break;
    case 1: // 좌상 — 무릎이 넓게 퍼진다
      ellipse(m, 16, 7, 5, 5);
      trapezoid(m, 16, 12, 22, 4, 9, 0.95);
      trapezoid(m, 16, 22, 28, 11, 12);
      rect(m, 4, 28, 27, 30, 0.9);
      dim(m, 14, 14, 18, 21, 0.75);
      break;
    case 2: // 반가상 — 한쪽 다리를 올린 비대칭 자세
      ellipse(m, 14, 7, 5, 5);
      trapezoid(m, 14, 12, 22, 4, 7, 0.95);
      rect(m, 8, 22, 24, 26);
      trapezoid(m, 12, 26, 30, 4, 6, 0.9);
      rect(m, 19, 17, 22, 23, 0.85);
      dim(m, 20, 24, 24, 25, 0.7);
      break;
    case 3: // 흉상 — 머리 + 어깨 + 대좌
      ellipse(m, 16, 10, 6, 7);
      trapezoid(m, 16, 17, 25, 5, 11, 0.95);
      rect(m, 9, 25, 22, 28);
      rect(m, 11, 28, 20, 30, 0.9);
      break;
    case 4: // 기둥상 — 가늘고 긴 신주
      ellipse(m, 16, 6, 4, 5);
      rect(m, 13, 10, 18, 28, 0.92);
      rect(m, 10, 28, 21, 30);
      dim(m, 15, 12, 16, 27, 0.68);
      break;
    default: // 동물상 — 가로로 긴 사족
      ellipse(m, 17, 15, 10, 6);
      ellipse(m, 6, 12, 4, 4);
      rect(m, 9, 20, 11, 28, 0.9);
      rect(m, 14, 20, 16, 28, 0.9);
      rect(m, 22, 20, 24, 28, 0.9);
      rect(m, 25, 13, 27, 20, 0.85);
      rng.int(0, 1);
      break;
  }
}

function buildOrnament(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 드리개
      ellipse(m, 16, 10, 7, 6);
      rect(m, 15, 16, 16, 19, 0.9);
      ellipse(m, 16, 23, 5, 6);
      ellipse(m, 7, 20, 3, 4, 0.9);
      ellipse(m, 25, 20, 3, 4, 0.9);
      break;
    case 1: // 귀걸이 쌍 — 좌우 두 점
      for (const cx of [9, 23]) {
        ring(m, cx, 10, 5, 2.6);
        ellipse(m, cx, 20, 4, 5, 0.95);
        rect(m, cx - 1, 14, cx, 16, 0.9);
      }
      break;
    case 2: // 목걸이 — 구슬을 꿴 호
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.15 + (0.7 * i) / 8);
        ellipse(m, 16 - Math.cos(a) * 13, 8 + Math.sin(a) * 15, 2.4, 2.4);
      }
      ellipse(m, 16, 26, 4, 5, 0.95);
      rng.int(0, 1);
      break;
    case 3: // 팔찌 — 두꺼운 고리
      ring(m, 16, 17, 13, 8);
      dimRing(m, 16, 17, 12, 11, 0.7);
      break;
    case 4: // 피불라 — 활 + 침
      ring(m, 16, 14, 11, 8);
      carve(m, 0, 15, 31, 31);
      rect(m, 6, 14, 26, 16, 0.92);
      rect(m, 8, 19, 24, 20, 0.85);
      ellipse(m, 25, 17, 3, 3);
      break;
    default: // 반지 — 작은 고리 + 알
      ring(m, 16, 20, 9, 6);
      ellipse(m, 16, 9, 5, 5);
      dim(m, 14, 7, 17, 10, 0.75);
      break;
  }
}

function buildMechanism(m: Mask, v: number, rng: Rng) {
  switch (v) {
    case 0: // 이중 기어
      ellipse(m, 13, 14, 9, 9);
      ellipse(m, 23, 22, 6, 6);
      dimRing(m, 13, 14, 5.5, 4, 0.7);
      dimRing(m, 23, 22, 3.6, 2.5, 0.7);
      break;
    case 1: // 등잔대 — 기둥 + 접시
      trapezoid(m, 16, 4, 9, 7, 3);
      rect(m, 14, 9, 17, 25, 0.9);
      trapezoid(m, 16, 25, 30, 3, 10);
      dim(m, 10, 6, 21, 7, 0.7);
      break;
    case 2: // 천칭 — 보 + 접시 둘
      rect(m, 15, 3, 16, 10);
      rect(m, 4, 10, 27, 12);
      rect(m, 6, 12, 7, 18, 0.85);
      rect(m, 24, 12, 25, 18, 0.85);
      trapezoid(m, 6, 18, 23, 5, 2, 0.95);
      trapezoid(m, 25, 18, 23, 5, 2, 0.95);
      break;
    case 3: // 수레바퀴 — 살 있는 바퀴
      ring(m, 16, 16, 14, 11);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * i) / 3;
        for (let r = 3; r < 12; r++) {
          const x = Math.round(16 + Math.cos(a) * r);
          const y = Math.round(16 + Math.sin(a) * r);
          if (x >= 0 && x < 32 && y >= 0 && y < 32) m[idx(x, y)] = Math.max(m[idx(x, y)], 0.9);
        }
      }
      ellipse(m, 16, 16, 4, 4);
      break;
    case 4: // 퀴푸 — 매듭 끈
      rect(m, 3, 6, 28, 8);
      for (let i = 0; i < 6; i++) {
        const x = 5 + i * 4;
        const len = 18 + rng.int(0, 6);
        rect(m, x, 8, x + 1, len, 0.88);
        for (let k = 1; k <= 2; k++) {
          const y = 12 + k * 5;
          if (y < len) ellipse(m, x + 0.5, y, 2, 2, 0.95);
        }
      }
      break;
    default: // 철주 — 긴 기둥 + 주두
      rect(m, 12, 3, 20, 6);
      trapezoid(m, 16, 6, 28, 3, 5, 0.92);
      rect(m, 9, 28, 23, 30);
      dim(m, 15, 8, 16, 27, 0.66);
      break;
  }
}

const BUILDERS: Record<Shape, (m: Mask, v: number, rng: Rng) => void> = {
  jar: buildJar, sword: buildSword, crown: buildCrown, mask: buildMask, scroll: buildScroll,
  coin: buildCoin, tablet: buildTablet, statue: buildStatue, ornament: buildOrnament,
  mechanism: buildMechanism
};

/** 시드 기반 표면 장식. 좌우대칭 음각 + 비대칭 결손 1~2곳 */
function decorate(mask: Mask, rng: Rng) {
  const marks = 3 + rng.int(0, 4);
  for (let i = 0; i < marks; i++) {
    const x = 4 + rng.int(0, 11);
    const y = 5 + rng.int(0, 22);
    const h = 1 + rng.int(0, 3);
    for (let dy = 0; dy < h; dy++) {
      const yy = y + dy;
      if (yy > 31) break;
      for (const xx of [x, 31 - x]) {
        const at = idx(xx, yy);
        if (mask[at] > 0) mask[at] *= 0.68;
      }
    }
  }
  // 비대칭 결손 — 같은 실루엣·같은 대칭 음각을 가진 두 종을 갈라 주는 마지막 축이다.
  //
  // **반드시 몸체에 닿게** 찍는다. 대칭 음각만으로는 명암이 4단으로 양자화되면서
  // 두께 차이가 같은 단으로 떨어져 비트맵이 완전히 같아지는 일이 잦았다(실측:
  // T0~T1에서 완전 동일 비트맵 다발). 결손은 알파 자체를 바꾸므로 양자화를 타지 않는다.
  const chips = 3 + rng.int(0, 2);
  for (let i = 0; i < chips; i++) {
    let x = 1 + rng.int(0, 29);
    let y = 1 + rng.int(0, 29);
    // 빈 칸을 골랐으면 몸체를 만날 때까지 스캔 순서대로 훑는다(결정론 유지)
    for (let k = 0; k < SPRITE_SIZE * SPRITE_SIZE; k++) {
      if (mask[idx(x, y)] > 0) break;
      x++;
      if (x > 30) {
        x = 1;
        y = y > 30 ? 1 : y + 1;
      }
    }
    if (mask[idx(x, y)] > 0) carve(mask, x, y, x, y);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** a를 b쪽으로 k만큼 섞는다. 정수로 반올림해 팔레트 색 수가 늘지 않게 한다 */
function blend(a: [number, number, number], b: [number, number, number], k: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k)
  ];
}

/**
 * 거점 색 편향 세기 (v0.4 — notes/decisions.md G69).
 *
 * 테두리 1px과 문양만으로는 44px에서 거점이 안 읽힌다 — 4×4로 축약하면 그 신호가
 * 평균에 묻힌다(실측: 거점 분류 정확도 26%). 재질 램프 전체를 거점색으로 살짝
 * 기울여 신호를 아이콘 전면에 퍼뜨린다. 재질(청자·금·은…)이 여전히 지배적이도록
 * 비율을 낮게 잡았다 — 같은 청자 항아리가 한반도 것과 중국 것으로 갈리지만,
 * 둘 다 여전히 "청자"로 읽혀야 한다.
 */
const SITE_RAMP_TINT = 0.22;
const SITE_OUTLINE_TINT = 0.55;

function rimAllows(style: string, x: number, y: number): boolean {
  if (style === "dashed") return ((x + y) & 3) < 2;
  if (style === "dotted") return (x + 2 * y) % 3 === 0;
  return true;
}

/**
 * 손으로 찍은 T4 비트맵을 mask + 악센트 오버레이로 푼다.
 * 문자 규격은 `render/unique-sprites.ts` 머리말에 있다.
 */
function planUnique(rows: string[]): { mask: Mask; accent: Uint8Array } {
  const m = new Float32Array(SPRITE_SIZE * SPRITE_SIZE);
  const accent = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE);
  for (let y = 0; y < SPRITE_SIZE; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const ch = row[x] ?? ".";
      const at = idx(x, y);
      if (ch === "#") m[at] = 1;
      else if (ch === "+") m[at] = 1.35;
      else if (ch === "-") m[at] = 0.5;
      else if (ch === "*") {
        m[at] = 1;
        accent[at] = 1;
      }
    }
  }
  return { mask: m, accent };
}

/**
 * 32×32 RGBA 바이트 배열(길이 4096)을 만든다. `ImageData`·`canvas`·`document`가
 * 없는 환경(Node — QA 스크립트·컨택트 시트)에서도 도는 순수 함수라, 아이콘 검사가
 * 브라우저 없이 재현 가능하다. `renderSprite`는 이걸 감싸는 얇은 래퍼다.
 */
export function renderSpriteRGBA(artifact: Artifact): Rgba {
  const unique = UNIQUE_SPRITES[artifact.id];
  let mask: Mask;
  let uniqueAccent: Uint8Array | null = null;
  if (unique) {
    const plan = planUnique(unique);
    mask = plan.mask;
    uniqueAccent = plan.accent;
  } else {
    const rng = new Rng(artifact.seed);
    mask = new Float32Array(SPRITE_SIZE * SPRITE_SIZE);
    BUILDERS[artifact.shape](mask, artifact.spriteVariant % SHAPE_VARIANTS, rng);
    decorate(mask, rng);
  }

  const { outline, ramp } = RAMPS[artifact.palette];
  const site = artifact.site as SiteId;
  const accent = SITE_ACCENT[site];
  const rimRgb = hexToRgb(accent.rim);
  const motifRgb = hexToRgb(accent.motif);
  const rimStyle = SITE_RIM_STYLE[site];
  const motif = MOTIF_BITS[site];
  // 거점 신호(색 편향·테두리·문양)는 T2 이상에만 얹는다 — 머리말 참조
  const marked = artifact.tier >= 2;
  const outlineRgb = marked
    ? blend(hexToRgb(outline), rimRgb, SITE_OUTLINE_TINT)
    : hexToRgb(outline);
  const rampRgb = ramp.map((c) =>
    marked ? blend(hexToRgb(c), rimRgb, SITE_RAMP_TINT) : hexToRgb(c)
  );
  const data = new Uint8ClampedArray(SPRITE_SIZE * SPRITE_SIZE * 4) as Rgba;

  const solid = (x: number, y: number) =>
    x >= 0 && x < 32 && y >= 0 && y < 32 && mask[idx(x, y)] > 0;
  const isEdge = (x: number, y: number) =>
    solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1));
  /** 외곽선에서 체비셰프 거리 r 안쪽에 있는 몸체 픽셀인가 */
  const nearEdge = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (isEdge(x + dx, y + dy)) return true;
      }
    }
    return false;
  };

  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const at = idx(x, y);
      const o = at * 4;
      const v = mask[at];
      if (v <= 0) continue;
      data[o + 3] = 255;

      const put = (c: [number, number, number]) => {
        data[o] = c[0];
        data[o + 1] = c[1];
        data[o + 2] = c[2];
      };

      if (isEdge(x, y)) {
        put(outlineRgb);
        continue;
      }
      if (uniqueAccent && uniqueAccent[at]) {
        put(motifRgb);
        continue;
      }
      if (marked) {
        // 외곽선 바로 안쪽 2px 링 = 거점 악센트 테두리. 1px이면 44px 표시에서
        // 사라지고 4×4 축약 평균에도 묻힌다(실측: 거점 분류 26%).
        //
        // 손으로 찍은 T4만 1px로 좁힌다 — 2px 링이 도안의 톱니·음각 같은 얇은
        // 구조를 덮어 버린다(컨택트 시트로 확인). T4는 도안 자체가 유일해서
        // 거점 신호가 덜 필요하고, `*` 칸으로 악센트를 직접 지정해 뒀다.
        const onRim = nearEdge(x, y, unique ? 1 : 2);
        if (onRim) {
          if (rimAllows(rimStyle, x, y)) {
            put(rimRgb);
            continue;
          }
        } else if (!unique && motif[(y % 8) * 8 + (x % 8)]) {
          // 문양은 링 안쪽(빈 칸에서 2px 이상)에만 — 실루엣 윤곽을 먹지 않게
          put(motifRgb);
          continue;
        }
      }
      // 광원은 좌상단. 명암 3단 + 하이라이트
      const light = 0.45 + 0.55 * v - (y / 31) * 0.35 + ((31 - x) / 31) * 0.2;
      const level = Math.max(0, Math.min(3, Math.floor(light * 3.4)));
      put(rampRgb[level]);
    }
  }
  return data;
}

export function renderSprite(artifact: Artifact): ImageData | null {
  if (typeof ImageData === "undefined") return null;
  return new ImageData(renderSpriteRGBA(artifact), SPRITE_SIZE, SPRITE_SIZE);
}

const cache = new Map<string, string>();

/** 32×32 스프라이트를 data URL 로 굽는다. 유물 id 단위로 캐시된다 */
export function spriteUrl(artifact: Artifact): string {
  const hit = cache.get(artifact.id);
  if (hit) return hit;
  const image = renderSprite(artifact);
  if (!image || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL();
  cache.set(artifact.id, url);
  return url;
}
