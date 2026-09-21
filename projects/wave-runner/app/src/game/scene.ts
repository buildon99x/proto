/**
 * # 배경 — 아홉 모티프의 라임 선화
 *
 * 규칙 셋이 이 파일의 전부다.
 *
 * 1. **선으로만.** 면은 여전히 먹이다. 죽는 영역이 화면에서 가장 밝아지면 시선이
 *    통로에서 끌려 나간다.
 * 2. **농도가 거리다.** 지형 0.17 · 구조 0.25 · 상징 0.44. 아홉을 같은 강도로 찍으면
 *    배경이 통로 경계와 같은 무게가 된다.
 * 3. **시차는 통로보다 느리다.** 같은 속도로 흐르면 벽의 일부로 읽혀 부딪힐 것 같아진다.
 *
 * 배치는 화면 단위로 정의한다. 월드 단위로 잡으면 기기마다 줌이 달라 구성이 흔들리고,
 * 배경은 코스가 아니므로 월드에 붙어 있을 이유가 없다. 가로로만 흐른다.
 */
import { motifImage, motifSize, skinReady } from "./skin";
import type { MotifId } from "./skin";

export const SCENE_PARALLAX = 0.34;

/** 농도 셋. 이 값이 곧 거리다. */
const D = { land: 0.17, build: 0.25, sign: 0.44 } as const;

interface Item {
  id: MotifId;
  /** 스트립 안의 가로 위치(0~1) */
  at: number;
  /** 높이 — 화면 높이에 대한 비율 */
  h: number;
  /** 바닥이 닿는 높이(화면 높이 비율). 위 띠는 아래로 매달리고 아래 띠는 바닥에 선다 */
  base: number;
  alpha: number;
}

/**
 * 한 스트립의 구성. 위 띠는 하늘선 0.40 에 바닥을 두고, 아래 띠는 화면 바닥에 선다.
 * 부엉이는 나무 위에, 표범은 바위 위에 — 좌표를 서로 맞춰 두었다.
 */
const ITEMS: Item[] = [
  // ── 위 띠 ──
  { id: "moon",    at: 0.11, h: 0.19, base: 0.235, alpha: D.sign },
  { id: "ridge",   at: 0.00, h: 0.13, base: 0.40, alpha: D.land },
  { id: "ridge",   at: 0.52, h: 0.12, base: 0.40, alpha: D.land },
  { id: "cliff",   at: 0.02, h: 0.26, base: 0.40, alpha: D.land },
  { id: "skyline", at: 0.36, h: 0.25, base: 0.40, alpha: D.build },
  { id: "skyline", at: 0.72, h: 0.21, base: 0.40, alpha: D.build },
  { id: "tree",    at: 0.22, h: 0.19, base: 0.40, alpha: D.build },
  { id: "tree",    at: 0.61, h: 0.15, base: 0.40, alpha: D.build },
  { id: "owl",     at: 0.247, h: 0.055, base: 0.300, alpha: D.sign },
  { id: "boulder", at: 0.86, h: 0.05, base: 0.40, alpha: D.build },
  { id: "ruins",   at: 0.86, h: 0.13, base: 0.40, alpha: D.build },
  { id: "skyline", at: 0.06, h: 0.16, base: 0.40, alpha: D.build },

  // ── 아래 띠 ──
  { id: "ridge",   at: 0.14, h: 0.10, base: 1.0, alpha: D.land },
  { id: "cliff",   at: 0.88, h: 0.22, base: 1.0, alpha: D.land },
  { id: "ruins",   at: 0.02, h: 0.17, base: 1.0, alpha: D.build },
  { id: "ruins",   at: 0.55, h: 0.14, base: 1.0, alpha: D.build },
  { id: "skyline", at: 0.31, h: 0.19, base: 1.0, alpha: D.build },
  { id: "tree",    at: 0.45, h: 0.20, base: 1.0, alpha: D.build },
  { id: "tree",    at: 0.79, h: 0.16, base: 1.0, alpha: D.build },
  { id: "boulder", at: 0.665, h: 0.062, base: 1.0, alpha: D.build },
  { id: "leopard", at: 0.675, h: 0.075, base: 0.938, alpha: D.sign },
  { id: "ridge",   at: 0.62, h: 0.09, base: 1.0, alpha: D.land },
  { id: "boulder", at: 0.22, h: 0.05, base: 1.0, alpha: D.build }
];

/**
 * 문장과 표지등 — 시트에 없는 둘은 코드가 그린다. 원 프레임이 있어야 파형이
 * 궤적으로 오독되지 않는다.
 */
function drawEmblem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string): void {
  ctx.save();
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
  ctx.lineTo(x, y + r * 3.4);
  ctx.moveTo(x - r * 0.5, y + r * 3.4);
  ctx.lineTo(x + r * 0.5, y + r * 3.4);
  ctx.stroke();
  ctx.restore();
}

function drawBeacon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ink: string): void {
  ctx.save();
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
  ctx.restore();
}

/**
 * 배경 한 겹. 통로를 파내는 일은 호출하는 쪽이 한다 — 여기서는 화면 전체에 그리고,
 * `render` 가 침묵 띠와 통로로 덮는다. 순서가 곧 규칙 1과 5의 구현이다.
 */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  camX: number,
  zoom: number,
  ink: string
): void {
  if (!skinReady()) return;
  const stripW = cssW * 1.25;
  const scroll = camX * zoom * SCENE_PARALLAX;
  const first = Math.floor(scroll / stripW) - 1;

  ctx.save();
  for (let s = first; s <= first + 2; s += 1) {
    const ox = s * stripW - scroll;
    for (const it of ITEMS) {
      const img = motifImage(it.id, ink);
      if (!img) continue;
      const size = motifSize(it.id);
      const h = cssH * it.h;
      const w = (size.w / size.h) * h;
      const x = ox + it.at * stripW;
      if (x + w < -40 || x > cssW + 40) continue;
      ctx.globalAlpha = it.alpha;
      ctx.drawImage(img, x, cssH * it.base - h, w, h);
    }
    ctx.globalAlpha = 1;
    drawEmblem(ctx, ox + stripW * 0.9, cssH * 0.16, cssH * 0.035, ink);
    drawBeacon(ctx, ox + stripW * 0.45, cssH * 0.11, cssH * 0.012, ink);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
