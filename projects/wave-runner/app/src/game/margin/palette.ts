/**
 * 여백 레이어의 색 예산.
 *
 * 여백에 무엇을 놓든 통로 경계와 시선을 다투면 난이도가 올라간다. 그래서 색은
 * 취향이 아니라 **계산으로 검사 가능한 수치**로 정의한다 — 명도 대비와 색상대.
 * 검증기(`tests/verify/margin-texture.ts`)가 여기 있는 함수를 그대로 다시 써서
 * 사양과 구현이 갈라지지 않게 한다.
 *
 * 설계 근거: docs/design/margin-texture.md §3.4
 */
import type { SectorType } from "../types";

/** 통로 밖 벽의 단색. render.ts 의 COLOR.wall 과 같은 값이어야 한다 */
export const WALL = "#121a2e";

function srgbToLinear(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 상대 휘도 */
export function relLuminance(hex: string): number {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number): string => {
    const k = (n + h / 60) % 6;
    const x = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(Math.max(0, Math.min(1, x)) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

/**
 * 축 3색(각도 187° · 속도 33° · 편향 286°)과 판정 색(장애물 빨강 · 클리어 초록
 * 148° · 아바타 노랑)을 각각 ±30° 비켜 간 뒤 남는 구간.
 *
 * 여백이 판독의 언어를 쓰면 게이트 표시가 오염된다.
 */
export const ALLOWED_HUE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [80, 114],
  [219, 256]
];

/** 채도가 이 아래면 무채색으로 보므로 색상 규칙을 적용하지 않는다 */
export const ACHROMATIC_SAT = 0.05;

export function hueAllowed(hue: number, sat: number): boolean {
  if (sat < ACHROMATIC_SAT) return true;
  const h = ((hue % 360) + 360) % 360;
  return ALLOWED_HUE_BANDS.some(([lo, hi]) => h >= lo && h <= hi);
}

/** 벽 도료. 질감 구조는 유형이 정하고 도료는 **색만** 바꾼다 */
export interface Paint {
  id: string;
  name: string;
  hue: number;
  sat: number;
}

/** M1 은 기본 도료 하나뿐이다. 해금 도료는 M3 사안 */
export const PAINTS: readonly Paint[] = [{ id: "basalt", name: "현무암", hue: 228, sat: 0.06 }];

export const DEFAULT_PAINT = PAINTS[0];

/**
 * 유형별 벽 면적 비율 — 섹터 전 구간을 2월드 간격으로 적분한 실측값이다.
 * 같은 대비를 쓰면 협곡은 시끄럽고 산개는 안 보인다.
 */
export const WALL_AREA: Record<SectorType, number> = {
  gorge: 0.722,
  corridor: 0.752,
  scatter: 0.408,
  pulse: 0.46
};

/** 기준점 — 벽 면적 72.2% 에서 대비 1.30:1 */
export const TEXTURE_BASE_CONTRAST = 1.3;
export const TEXTURE_BASE_AREA = WALL_AREA.gorge;
/** 중간대(경계 8~18)의 상한과 같다. 질감은 화면의 절반을 덮으므로 여기를 넘지 않는다 */
export const TEXTURE_CONTRAST_CAP = 1.5;

/** `(대비 − 1) × 벽면적 = 일정`. 화면이 받는 잉크 총량을 유형과 무관하게 유지한다 */
export function textureContrast(type: SectorType): number {
  const raw = 1 + (TEXTURE_BASE_CONTRAST - 1) * (TEXTURE_BASE_AREA / WALL_AREA[type]);
  return Math.min(TEXTURE_CONTRAST_CAP, raw);
}

/** 강조 층(협곡의 4층마다 한 단계)은 한 칸 위로, 상한은 그대로 */
export function accentContrast(type: SectorType): number {
  return Math.min(TEXTURE_CONTRAST_CAP, textureContrast(type) + 0.1);
}

/**
 * 벽 대비가 target **이하이면서 가장 가까운** 색. 베이크 때 한 번만 돈다.
 *
 * 이하인 것이 중요하다. 상한이 곧 사양이므로 0.001 이라도 넘으면 사양 위반이고,
 * 8비트로 양자화된 뒤의 값이 넘을 수 있어 이분 탐색만으로는 부족하다.
 */
export function solveTint(hue: number, sat: number, target: number): string {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(WALL, hsvToHex(hue, sat, mid)) < target) lo = mid;
    else hi = mid;
  }
  let v = (lo + hi) / 2;
  // 양자화 뒤에도 상한을 넘지 않을 때까지 한 단계씩 내린다
  for (let i = 0; i < 12 && contrastRatio(WALL, hsvToHex(hue, sat, v)) > target; i += 1) {
    v -= 1 / 255;
  }
  return hsvToHex(hue, sat, Math.max(0, v));
}

export interface TextureInk {
  ink: string;
  accent: string;
}

export function inkFor(type: SectorType, paint: Paint = DEFAULT_PAINT): TextureInk {
  return {
    ink: solveTint(paint.hue, paint.sat, textureContrast(type)),
    accent: solveTint(paint.hue, paint.sat, accentContrast(type))
  };
}
