/**
 * # 배경 — 아홉 모티프의 라임 선화
 *
 * 규칙 셋이 이 파일의 전부다.
 *
 * 1. **선으로만 말한다.** 덩어리에 면이 들어가지만 그 면은 벽보다 **더 어둡다** —
 *    밝아지는 것은 선뿐이다. 죽는 영역이 화면에서 가장 밝아지면 시선이 통로에서
 *    끌려 나간다.
 * 2. **농도가 거리다.** 지형 0.17 · 구조 0.25 · 상징 0.44. 아홉을 같은 강도로 찍으면
 *    배경이 통로 경계와 같은 무게가 된다. 값은 목표 화면의 선화 점유율을 재서 맞췄다.
 * 3. **시차는 통로보다 느리다.** 같은 속도로 흐르면 벽의 일부로 읽혀 부딪힐 것 같아진다.
 *
 * ## 왜 한 화면을 손으로 짰는가
 *
 * 앞 판본은 화면 1.25배짜리 스트립을 반복했다. 그러면 달 뒤에 절벽, 그 앞 가지에
 * 부엉이 같은 **관계**가 만들어지지 않고 슬롯이 돌아가는 것으로 읽힌다. 그래서
 * 스트립을 일곱 화면으로 늘리고 **첫 화면을 목표 구도 그대로** 손으로 박았다.
 * 스테이지 출발에서 보는 첫 장면이 그 구도이고, 그 뒤 여섯 화면은 다른 조합이라
 * 한 판(53초, 약 7.5화면)에서 같은 장면이 두 번 지나가지 않는다.
 */
import { motifFill, motifImage, motifSize, skinReady } from "./skin";
import type { MotifId } from "./skin";

export const SCENE_PARALLAX = 0.34;

/** 농도 셋. 이 값이 곧 거리다. */
const D = { land: 0.14, build: 0.21, sign: 0.40 } as const;

/** 스트립 길이(화면 수). 한 판이 약 7.5화면이라 반복이 한 번을 넘지 않는다. */
const SCREENS = 7;

interface Item {
  id: MotifId;
  /** 스트립 안의 가로 위치 — **화면 단위**(0 = 출발, 1 = 한 화면 뒤) */
  at: number;
  /** 높이 — 화면 높이에 대한 비율 */
  h: number;
  /** 바닥이 닿는 높이(화면 높이 비율) */
  base: number;
  alpha: number;
  /** 면을 채울 것인가. 열린 도형(나무)은 면이 나오지 않아 무시된다 */
  mass?: boolean;
}

/**
 * 첫 화면 — 목표 구도. 달 앞을 마른 가지가 가로지르고 그 가지에 부엉이가 앉는다.
 * 좌표를 손으로 맞춰 둔 곳이라 하나를 옮기면 옆의 것도 같이 봐야 한다.
 */
const OPENING: Item[] = [
  { id: "cliff",   at: -0.16, h: 0.205, base: 0.335, alpha: D.land, mass: true },
  { id: "ridge",   at: 0.06,  h: 0.11, base: 0.350, alpha: D.land },
  { id: "moon",    at: 0.150, h: 0.168, base: 0.262, alpha: D.sign, mass: true },
  { id: "tree",    at: 0.015, h: 0.175, base: 0.340, alpha: D.build },
  { id: "tree",    at: 0.165, h: 0.190, base: 0.348, alpha: D.build },
  { id: "owl",     at: 0.205, h: 0.055, base: 0.208, alpha: D.sign },
  { id: "boulder", at: 0.355, h: 0.045, base: 0.372, alpha: D.build, mass: true },
  { id: "ruins",   at: 0.425, h: 0.105, base: 0.372, alpha: D.build, mass: true },
  { id: "skyline", at: 0.535, h: 0.225, base: 0.366, alpha: D.build, mass: true },
  { id: "skyline", at: 0.795, h: 0.175, base: 0.366, alpha: D.build, mass: true },

  { id: "ridge",   at: -0.02, h: 0.09, base: 0.862, alpha: D.land },
  { id: "ruins",   at: 0.025, h: 0.165, base: 0.985, alpha: D.build, mass: true },
  { id: "skyline", at: 0.275, h: 0.150, base: 0.985, alpha: D.build, mass: true },
  { id: "ruins",   at: 0.400, h: 0.125, base: 0.990, alpha: D.build, mass: true },
  { id: "tree",    at: 0.545, h: 0.185, base: 0.985, alpha: D.build },
  { id: "boulder", at: 0.735, h: 0.062, base: 0.990, alpha: D.build, mass: true },
  { id: "leopard", at: 0.752, h: 0.073, base: 0.936, alpha: D.sign },
  { id: "tree",    at: 0.880, h: 0.160, base: 0.985, alpha: D.build }
];

/** 나머지 여섯 화면 — 같은 어휘, 다른 문장. 첫 화면과 겹치는 배열이 없도록 짰다. */
const REST: Item[] = [
  // 2화면 — 협곡이 주인공. 도시는 멀리 한 덩어리만
  { id: "cliff",   at: 1.25, h: 0.31, base: 0.345, alpha: D.land, mass: true },
  { id: "ridge",   at: 1.00, h: 0.13, base: 0.352, alpha: D.land },
  { id: "ridge",   at: 1.55, h: 0.10, base: 0.352, alpha: D.land },
  { id: "boulder", at: 1.62, h: 0.05, base: 0.372, alpha: D.build, mass: true },
  { id: "skyline", at: 1.72, h: 0.14, base: 0.366, alpha: D.build, mass: true },
  { id: "ridge",   at: 1.10, h: 0.10, base: 0.870, alpha: D.land },
  { id: "boulder", at: 1.18, h: 0.075, base: 0.990, alpha: D.build, mass: true },
  { id: "tree",    at: 1.42, h: 0.21, base: 0.985, alpha: D.build },
  { id: "ruins",   at: 1.66, h: 0.14, base: 0.988, alpha: D.build, mass: true },

  // 3화면 — 무너진 도시가 가득 찬다
  { id: "skyline", at: 2.05, h: 0.26, base: 0.366, alpha: D.build, mass: true },
  { id: "skyline", at: 2.42, h: 0.20, base: 0.366, alpha: D.build, mass: true },
  { id: "tree",    at: 2.30, h: 0.145, base: 0.352, alpha: D.build },
  { id: "ruins",   at: 2.72, h: 0.115, base: 0.372, alpha: D.build, mass: true },
  { id: "skyline", at: 2.10, h: 0.185, base: 0.985, alpha: D.build, mass: true },
  { id: "ruins",   at: 2.45, h: 0.16, base: 0.988, alpha: D.build, mass: true },
  { id: "tree",    at: 2.78, h: 0.17, base: 0.985, alpha: D.build },

  // 4화면 — 달이 다시, 반대편에서. 표범은 없다
  { id: "ridge",   at: 3.02, h: 0.12, base: 0.350, alpha: D.land },
  { id: "moon",    at: 3.55, h: 0.165, base: 0.235, alpha: D.sign, mass: true },
  { id: "tree",    at: 3.42, h: 0.20, base: 0.348, alpha: D.build },
  { id: "cliff",   at: 3.78, h: 0.24, base: 0.340, alpha: D.land, mass: true },
  { id: "ruins",   at: 3.08, h: 0.13, base: 0.990, alpha: D.build, mass: true },
  { id: "boulder", at: 3.40, h: 0.055, base: 0.990, alpha: D.build, mass: true },
  { id: "tree",    at: 3.60, h: 0.19, base: 0.985, alpha: D.build },
  { id: "ridge",   at: 3.70, h: 0.085, base: 0.860, alpha: D.land },

  // 5화면 — 폐허와 마른 숲. 위는 비워 둔다
  { id: "ridge",   at: 4.05, h: 0.14, base: 0.352, alpha: D.land },
  { id: "tree",    at: 4.28, h: 0.16, base: 0.350, alpha: D.build },
  { id: "tree",    at: 4.62, h: 0.185, base: 0.350, alpha: D.build },
  { id: "boulder", at: 4.85, h: 0.048, base: 0.372, alpha: D.build, mass: true },
  { id: "ruins",   at: 4.02, h: 0.17, base: 0.988, alpha: D.build, mass: true },
  { id: "tree",    at: 4.35, h: 0.22, base: 0.985, alpha: D.build },
  { id: "ruins",   at: 4.58, h: 0.14, base: 0.990, alpha: D.build, mass: true },
  { id: "tree",    at: 4.82, h: 0.17, base: 0.985, alpha: D.build },

  // 6화면 — 부엉이가 다시 온다, 다른 나무에
  { id: "cliff",   at: 5.02, h: 0.26, base: 0.340, alpha: D.land, mass: true },
  { id: "tree",    at: 5.28, h: 0.205, base: 0.348, alpha: D.build },
  { id: "owl",     at: 5.318, h: 0.052, base: 0.225, alpha: D.sign },
  { id: "skyline", at: 5.52, h: 0.19, base: 0.366, alpha: D.build, mass: true },
  { id: "ridge",   at: 5.75, h: 0.11, base: 0.352, alpha: D.land },
  { id: "ruins",   at: 5.15, h: 0.15, base: 0.988, alpha: D.build, mass: true },
  { id: "boulder", at: 5.48, h: 0.07, base: 0.990, alpha: D.build, mass: true },
  { id: "skyline", at: 5.66, h: 0.16, base: 0.985, alpha: D.build, mass: true },
  { id: "tree",    at: 5.90, h: 0.18, base: 0.985, alpha: D.build },

  // 7화면 — 표범이 다시, 높은 바위에. 다음 반복으로 넘어가는 자리라 성기게 둔다
  { id: "ridge",   at: 6.05, h: 0.12, base: 0.350, alpha: D.land },
  { id: "skyline", at: 6.30, h: 0.17, base: 0.366, alpha: D.build, mass: true },
  { id: "tree",    at: 6.70, h: 0.155, base: 0.350, alpha: D.build },
  { id: "boulder", at: 6.20, h: 0.085, base: 0.990, alpha: D.build, mass: true },
  { id: "leopard", at: 6.222, h: 0.078, base: 0.918, alpha: D.sign },
  { id: "ruins",   at: 6.50, h: 0.13, base: 0.990, alpha: D.build, mass: true },
  { id: "tree",    at: 6.78, h: 0.20, base: 0.985, alpha: D.build }
];

const ITEMS = [...OPENING, ...REST];

/** 표지 — 시트에 없는 둘은 코드가 그린다. 화면 단위 좌표를 쓴다 */
const SIGNS: Array<{ at: number; y: number; kind: "emblem" | "beacon" }> = [
  { at: 0.845, y: 0.235, kind: "emblem" },
  { at: 0.935, y: 0.095, kind: "beacon" },
  { at: 2.62,  y: 0.180, kind: "emblem" },
  { at: 3.90,  y: 0.105, kind: "beacon" },
  { at: 5.40,  y: 0.145, kind: "emblem" },
  { at: 6.88,  y: 0.120, kind: "beacon" }
];

/** 원 프레임이 있어야 파형이 궤적으로 오독되지 않는다 */
function drawEmblem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string): void {
  ctx.strokeStyle = ink;
  ctx.globalAlpha = D.sign;
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = D.sign * 0.5;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = D.sign;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.62, y + r * 0.24);
  ctx.lineTo(x - r * 0.2, y - r * 0.26);
  ctx.lineTo(x + r * 0.2, y + r * 0.24);
  ctx.lineTo(x + r * 0.62, y - r * 0.26);
  ctx.stroke();
  ctx.globalAlpha = D.sign * 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.2);
  ctx.lineTo(x, y + r * 3.6);
  ctx.moveTo(x - r * 0.5, y + r * 3.6);
  ctx.lineTo(x + r * 0.5, y + r * 3.6);
  ctx.stroke();
}

function drawBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string): void {
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.globalAlpha = D.sign;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.11);
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = D.sign * 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.lineTo(x, y + s * 9);
  ctx.stroke();
}

/**
 * 배경 한 겹. 통로를 파내는 일은 호출하는 쪽이 한다 — 여기서는 화면 전체에 그리고,
 * `render` 가 침묵 띠와 종이로 덮는다. 순서가 곧 규칙 1과 5의 구현이다.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  camX: number,
  zoom: number,
  ink: string,
  mass: string
): void {
  if (!skinReady()) return;
  const stripW = cssW * SCREENS;
  const scroll = camX * zoom * SCENE_PARALLAX;
  const first = Math.floor(scroll / stripW) - 1;

  ctx.save();
  for (let s = first; s <= first + 1; s += 1) {
    const ox = s * stripW - scroll;
    for (const it of ITEMS) {
      const x = ox + it.at * cssW;
      const size = motifSize(it.id);
      const h = cssH * it.h;
      const w = (size.w / size.h) * h;
      if (x + w < -40 || x > cssW + 40) continue;
      const y = cssH * it.base - h;
      if (it.mass) {
        const solid = motifFill(it.id, mass);
        if (solid) {
          ctx.globalAlpha = 1;
          ctx.drawImage(solid, x, y, w, h);
        }
      }
      const line = motifImage(it.id, ink);
      if (!line) continue;
      ctx.globalAlpha = it.alpha;
      ctx.drawImage(line, x, y, w, h);
    }
    for (const sign of SIGNS) {
      const x = ox + sign.at * cssW;
      if (x < -60 || x > cssW + 60) continue;
      if (sign.kind === "emblem") drawEmblem(ctx, x, cssH * sign.y, cssH * 0.035, ink);
      else drawBeacon(ctx, x, cssH * sign.y, cssH * 0.012, ink);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
