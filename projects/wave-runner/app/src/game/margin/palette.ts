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

/**
 * 도료를 고르지 않았을 때의 벽 바탕색.
 *
 * 0.6.0 까지의 `render.ts` COLOR.wall 과 **정확히 같은 값**이어야 한다 — 기본
 * 도료에서 픽셀이 달라지면 "도료는 꾸미기일 뿐"이라는 말이 거짓이 된다.
 */
export const DEFAULT_WALL = "#121a2e";

/** 통로 안쪽에 보이는 배경. 벽과의 대비가 너무 벌어지면 통로가 다른 물체로 읽힌다 */
export const BACKGROUND = "#070b14";

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

/**
 * CIE Lab. 대비(휘도비)는 "읽히는가"를 말하지만 "다르게 보이는가"는 말하지 못한다 —
 * 도료 둘이 같은 대비로 각각 다른 색일 수 있고, 반대로 눈에 같을 수도 있다.
 */
export function labOf(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => srgbToLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 색차. 인접 패치의 식별 한계(JND)가 대략 2.3 이다 */
export function deltaE(a: string, b: string): number {
  const A = labOf(a);
  const B = labOf(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

export function hueOf(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  if (mx === mn) return 0;
  const d = mx - mn;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (((h * 60) % 360) + 360) % 360;
}

export function satOf(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
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

/**
 * 벽 도료. 질감 **구조**(간격·두께·방향·대비)는 섹터 유형이 정하고 도료는 **색만** 바꾼다.
 * 정보가 꾸미기에 덮이면 질감 레이어 전체가 무의미해지기 때문이다.
 *
 * 도료가 벽 바탕색까지 바꾸는 것은 측정의 결과다. 잉크 틴트만 바꾸면 잉크가 벽의
 * 13% 만 덮으므로 화면에서 도료끼리의 색차가 **ΔE 0.00~6.19** 에 그친다 — 여러 쌍이
 * 8비트로 아예 같은 색이 된다. 바탕색을 아래 대비 바닥 안에서 함께 옮기면 ΔE 6.0~49.3
 * 이 되고, 그래야 "진행이 스크린샷 한 장에 드러난다"는 말이 성립한다.
 */
export type PaintUnlock =
  | { kind: "default" }
  /** 그 티어의 스테이지 전부를 클리어 */
  | { kind: "tier"; tier: number }
  /** Endless 최고 거리 */
  | { kind: "distance"; meters: number };

export interface Paint {
  id: string;
  name: string;
  /** 벽 바탕색 */
  wall: string;
  /** 질감 잉크의 색상·채도. 명도는 유형별 목표 대비가 정한다 */
  hue: number;
  sat: number;
  /** 해금 조건. **진행도에서 파생하고 저장하지 않는다** */
  unlock: PaintUnlock;
}

/**
 * 도료 6종. 전부 §대비 바닥과 허용 색상대를 통과한 값이고 검증기가 다시 잰다.
 * 힘을 1도 주지 않는다 — 코어로 살 수 없고 코어를 주지도 않는다.
 */
export const PAINTS: readonly Paint[] = [
  { id: "basalt", name: "현무암", wall: DEFAULT_WALL, hue: 228, sat: 0.06, unlock: { kind: "default" } },
  { id: "slate", name: "점판암", wall: "#1d202d", hue: 229, sat: 0.2, unlock: { kind: "tier", tier: 1 } },
  { id: "indigo", name: "군청", wall: "#21214a", hue: 240, sat: 0.22, unlock: { kind: "tier", tier: 2 } },
  { id: "abyss", name: "심연", wall: "#1c153f", hue: 250, sat: 0.24, unlock: { kind: "tier", tier: 3 } },
  { id: "moss", name: "이끼", wall: "#1a2315", hue: 99, sat: 0.22, unlock: { kind: "distance", meters: 1500 } },
  { id: "jade", name: "비취", wall: "#182c15", hue: 112, sat: 0.24, unlock: { kind: "distance", meters: 3000 } }
];

export const DEFAULT_PAINT = PAINTS[0];

export function paintFor(id: string | undefined): Paint {
  return PAINTS.find((p) => p.id === id) ?? DEFAULT_PAINT;
}

/**
 * 벽 바탕색이 움직여도 깨지면 안 되는 바닥들.
 *
 * 통로를 읽는 것은 벽의 밝기가 아니라 **엣지 선**이므로 벽이 조금 밝아져도 판독은
 * 유지된다. 그래도 바닥을 명시해 두지 않으면 도료를 하나 더할 때마다 눈대중이 된다.
 */
export const CONTRAST_FLOOR = {
  /** 통로 엣지 #3de1ff */
  edge: 9.0,
  /** 장애물·셔터 #ff5e7a */
  block: 4.5,
  /** 아바타 #ffe66d */
  player: 10.0,
  /** 클리어선·사망 띠 #7dffb0 */
  clear: 10.0
} as const;

/** 벽과 배경의 대비 허용 구간. 벌어질수록 통로가 "빈 곳"이 아니라 다른 물체로 읽힌다 */
export const WALL_BG_RANGE = { min: 1.1, max: 1.35 } as const;

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
export function solveTint(hue: number, sat: number, target: number, wall = DEFAULT_WALL): string {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(wall, hsvToHex(hue, sat, mid)) < target) lo = mid;
    else hi = mid;
  }
  let v = (lo + hi) / 2;
  // 양자화 뒤에도 상한을 넘지 않을 때까지 한 단계씩 내린다
  for (let i = 0; i < 12 && contrastRatio(wall, hsvToHex(hue, sat, v)) > target; i += 1) {
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
    ink: solveTint(paint.hue, paint.sat, textureContrast(type), paint.wall),
    accent: solveTint(paint.hue, paint.sat, accentContrast(type), paint.wall)
  };
}
