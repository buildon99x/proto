/**
 * 아이콘 지각 거리 척도 (v0.4, notes/decisions.md G70).
 *
 * "두 아이콘이 구분되는가"를 기계로 재는 방법을 여기 한 곳에 정의한다. `qa:sprites`와
 * 컨택트 시트가 같은 함수를 쓰므로, 문서에 적힌 수치는 항상 재현 가능하다.
 *
 * ── 정의 ────────────────────────────────────────────────────────────────
 * 1. 종마다 `renderSpriteRGBA`로 32×32 RGBA를 굽는다(결정론).
 * 2. 투명 픽셀을 도감 격자의 실제 배경색(`SPRITE_BG` = styles.css `.sprite`의
 *    background)으로 합성한다. 알파를 그냥 0으로 두면 "실루엣이 작은 아이콘"끼리
 *    배경만 넓어 서로 가까워 보이는 편향이 생긴다.
 * 3. sRGB → 선형 → XYZ(D65) → CIELAB.
 * 4. **4×4 박스 평균으로 8×8로 줄인다.** 이 게임의 아이콘은 44px(도감 격자)에서
 *    읽히는 게 목표라, 픽셀 단위 차이보다 "눈을 찌푸렸을 때 남는 덩어리"가
 *    구분의 실체다. 8×8 축약이 그 상태를 근사한다 — 1px 장식 차이만 있는 두
 *    아이콘은 이 척도에서 가까운 쌍으로 잡힌다(의도한 동작이다).
 * 5. `D(A,B)` = 64개 칸의 ΔE*76 제곱평균제곱근(RMS).
 *
 * ── 임계 ────────────────────────────────────────────────────────────────
 * `NEAR_DUPLICATE_DELTA_E = 4.0`.
 * 근거: ΔE*76 ≈ 2.3이 단일 색면의 JND(just-noticeable difference)다. 64칸 RMS가
 * 4.0이면 "평균적인 칸이 겨우 알아볼 만큼만 다르다"는 뜻이고, 그 아래면 나란히
 * 놓았을 때 같은 그림으로 읽힌다고 본다. 이 값은 보수적으로 잡은 것이다 —
 * 실제로 구분되는 쌍까지 경고로 잡히는 쪽이, 구분 안 되는 쌍을 놓치는 쪽보다 낫다.
 */
import { renderSpriteRGBA, SPRITE_SIZE } from "./sprite";
import type { Artifact } from "../game/types";

/** styles.css `.sprite`의 background — 도감·소장고 격자에서 아이콘 뒤에 실제로 깔리는 색 */
export const SPRITE_BG: [number, number, number] = [0x19, 0x15, 0x10];

/** 지각적으로 "붙어 있다"고 보는 RMS ΔE*76 임계 (머리말 참조) */
export const NEAR_DUPLICATE_DELTA_E = 4.0;

/** 축약 격자 한 변 (32 / 4) */
export const CELLS = 8;

/**
 * 거점 신호용 색상 히스토그램 칸 수.
 *
 * 거점 분류를 **두 가지** 특징으로 각각 재고 둘 다 보고한다(notes/decisions.md G70).
 *
 *   (가) 거점 신호 채널 — 이 파일의 `hueHistogram`. 불투명 픽셀의 색상(hue)을 채도로
 *        가중해 HUE_BINS칸에 모으고, 평균 명도·평균 채도·이웃 픽셀 색 변화율
 *        (가로·세로)을 덧붙인 HUE_BINS+4 차원. 거점 신호(악센트 테두리·
 *        문양·색 편향)가 실린 채널을 직접 재는 특징이다. 악센트 색표를 알지 못하는
 *        일반 기술자라 "정답을 심어 둔" 분류기가 아니다 — 그냥 "이 아이콘이 어떤
 *        색을 쓰는가"다.
 *   (나) 8×8 Lab 지도 — 위의 `SpriteFeature.lab`. 형태까지 포함한 전체 외형이다.
 *        같은 거점 안에서도 실루엣이 10종×6변형으로 흩어지므로 이 특징으로는
 *        거점보다 유물 종류가 먼저 잡힌다(그래서 수치가 낮게 나온다 — 정상이다).
 *
 * 합격선은 (가)에 걸고 (나)는 참고로 보고한다. 근거: 설계가 거점 신호를 **색 편향·
 * 테두리 양식·문양**에 실었다고 선언했으므로, 그 선언이 사실인지 재는 건 (가)다. (나)가 낮은 건
 * "같은 거점 안에서도 유물이 서로 달라 보인다"는 뜻이라 오히려 요구에 맞는다.
 */
export const HUE_BINS = 16;

const BLOCK = SPRITE_SIZE / CELLS;

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
}

/** sRGB 8비트 → CIELAB (D65 백색점) */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const Y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const fx = labF(X);
  const fy = labF(Y);
  const fz = labF(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** 8×8×3 = 192차원 Lab 특징 벡터 + 실루엣(알파) 마스크 */
export type SpriteFeature = {
  id: string;
  site: string;
  tier: number;
  /** 길이 192: 칸별 [L, a, b] */
  lab: Float64Array;
  /** 길이 1024: 알파>0 이면 1 */
  alpha: Uint8Array;
  /** 불투명 픽셀 수 */
  area: number;
  /** 거점 신호용 특징: 색상 히스토그램 + 평균 L*·채도 + 무늬 변화율 2칸 */
  hue: Float64Array;
};

export function featureOf(a: Artifact): SpriteFeature {
  const rgba = renderSpriteRGBA(a);
  const alpha = new Uint8Array(SPRITE_SIZE * SPRITE_SIZE);
  let area = 0;
  // 배경 합성 후 픽셀별 Lab → 칸별 평균
  const sums = new Float64Array(CELLS * CELLS * 3);
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const o = (y * SPRITE_SIZE + x) * 4;
      const al = rgba[o + 3] / 255;
      if (al > 0) {
        alpha[y * SPRITE_SIZE + x] = 1;
        area++;
      }
      const r = rgba[o] * al + SPRITE_BG[0] * (1 - al);
      const g = rgba[o + 1] * al + SPRITE_BG[1] * (1 - al);
      const b = rgba[o + 2] * al + SPRITE_BG[2] * (1 - al);
      const lab = rgbToLab(r, g, b);
      const cell = (Math.floor(y / BLOCK) * CELLS + Math.floor(x / BLOCK)) * 3;
      sums[cell] += lab[0];
      sums[cell + 1] += lab[1];
      sums[cell + 2] += lab[2];
    }
  }
  const n = BLOCK * BLOCK;
  const lab = new Float64Array(CELLS * CELLS * 3);
  for (let i = 0; i < lab.length; i++) lab[i] = sums[i] / n;
  return { id: a.id, site: a.site, tier: a.tier, lab, alpha, area, hue: hueHistogram(rgba) };
}

/**
 * 불투명 픽셀의 색상 히스토그램. 칸마다 채도 합을 넣고 전체로 정규화한 뒤,
 * 평균 L*·평균 채도를 두 칸 더 붙인다(길이 HUE_BINS+2).
 *
 * 채도로 가중하는 이유: 석재·목재 램프처럼 무채색에 가까운 픽셀은 색상값이
 * 불안정해 잡음만 된다. 거점 악센트는 채도가 높아 자연히 가중치를 크게 받는다.
 */
function hueHistogram(rgba: Uint8ClampedArray): Float64Array {
  const bins = new Float64Array(HUE_BINS + 4);
  let lSum = 0;
  let cSum = 0;
  let count = 0;
  for (let i = 0; i < SPRITE_SIZE * SPRITE_SIZE; i++) {
    const o = i * 4;
    if (rgba[o + 3] === 0) continue;
    const [L, a, b] = rgbToLab(rgba[o], rgba[o + 1], rgba[o + 2]);
    const c = Math.hypot(a, b);
    const h = Math.atan2(b, a);
    const bin = Math.min(HUE_BINS - 1, Math.floor(((h + Math.PI) / (2 * Math.PI)) * HUE_BINS));
    bins[bin] += c;
    lSum += L;
    cSum += c;
    count++;
  }
  const total = cSum || 1;
  for (let i = 0; i < HUE_BINS; i++) bins[i] /= total;
  // 명도·채도는 히스토그램과 같은 크기(0~1 부근)로 맞춰 거리 계산에서 한쪽이
  // 지배하지 않게 한다
  bins[HUE_BINS] = count > 0 ? lSum / count / 100 : 0;
  bins[HUE_BINS + 1] = count > 0 ? cSum / count / 100 : 0;
  // 무늬 변화율 — 이웃 픽셀과 색이 바뀌는 비율(가로·세로). 테두리 양식(solid·
  // dashed·dotted)과 문양 스텐실이 만드는 "잔무늬의 성격"을 재는 일반 특징이다.
  // 색상 히스토그램만으로는 색상환에서 가까운 거점(청자 녹 ↔ 황금 황토처럼
  // 재질 램프가 섞이면 겹치는 조합)이 갈리지 않아 두 칸을 더 둔다.
  let hEdges = 0;
  let hPairs = 0;
  let vEdges = 0;
  let vPairs = 0;
  const diff = (o1: number, o2: number) =>
    Math.abs(rgba[o1] - rgba[o2]) + Math.abs(rgba[o1 + 1] - rgba[o2 + 1]) + Math.abs(rgba[o1 + 2] - rgba[o2 + 2]) > 24;
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      const o = (y * SPRITE_SIZE + x) * 4;
      if (rgba[o + 3] === 0) continue;
      if (x + 1 < SPRITE_SIZE) {
        const r = o + 4;
        if (rgba[r + 3] !== 0) {
          hPairs++;
          if (diff(o, r)) hEdges++;
        }
      }
      if (y + 1 < SPRITE_SIZE) {
        const d = o + SPRITE_SIZE * 4;
        if (rgba[d + 3] !== 0) {
          vPairs++;
          if (diff(o, d)) vEdges++;
        }
      }
    }
  }
  bins[HUE_BINS + 2] = hPairs > 0 ? hEdges / hPairs : 0;
  bins[HUE_BINS + 3] = vPairs > 0 ? vEdges / vPairs : 0;
  return bins;
}

/** 지각 거리 D(A,B) — 64칸 ΔE*76의 RMS. 0이면 축약 격자에서 구분 불가 */
export function perceptualDistance(a: SpriteFeature, b: SpriteFeature): number {
  let acc = 0;
  for (let c = 0; c < CELLS * CELLS; c++) {
    const i = c * 3;
    const dl = a.lab[i] - b.lab[i];
    const da = a.lab[i + 1] - b.lab[i + 1];
    const db = a.lab[i + 2] - b.lab[i + 2];
    acc += dl * dl + da * da + db * db;
  }
  return Math.sqrt(acc / (CELLS * CELLS));
}

/** 실루엣 IoU — 형태만 본 보조 지표(색을 뺀 구분력). 1이면 실루엣이 완전히 같다 */
export function silhouetteIou(a: SpriteFeature, b: SpriteFeature): number {
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.alpha.length; i++) {
    const x = a.alpha[i];
    const y = b.alpha[i];
    if (x | y) union++;
    if (x & y) inter++;
  }
  return union === 0 ? 1 : inter / union;
}

/** 비트맵이 바이트 단위로 완전히 같은지 — "완전 중복" 판정용 해시 */
export function bitmapHash(a: Artifact): string {
  const rgba = renderSpriteRGBA(a);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < rgba.length; i++) {
    h1 = ((h1 ^ rgba[i]) * 16777619) >>> 0;
    h2 = ((h2 + rgba[i]) * 2654435761) >>> 0;
  }
  return `${h1.toString(16)}-${h2.toString(16)}`;
}
