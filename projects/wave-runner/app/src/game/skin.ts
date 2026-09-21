/**
 * # 실크스크린 스킨 — 시트 두 장을 잘라 쓰는 층
 *
 * 이 모듈은 **그리는 것에만** 관여한다. 물리·충돌·카메라·솔버는 한 줄도 모른다.
 * 그래서 에셋이 없거나(노드 검증기, 첫 프레임) 로딩이 늦어도 게임은 같은 규칙으로
 * 돌아가고, 화면만 텍스처 없이 그려진다.
 *
 * ## 왜 시트를 통째로 싣고 코드에서 자르는가
 *
 * 잘린 파일 15개를 저장소에 두면 **색이 파일에 굳는다.** 시트는 검정 선화라서
 * 여기서 알파로 바꾸고 잉크를 입히면, 잉크 세트(야경/자외선)를 바꿀 때 파일을 다시
 * 굽지 않아도 된다. 자르는 일은 로딩 때 한 번뿐이다.
 *
 * ## 판정에 닿지 않는다
 *
 * 텍스처는 벽 채움과 배경에만 쓴다. **판정선은 여전히 코드가 그리는 선이고**,
 * 어떤 에셋도 그 위에 얹히지 않는다 — 보이는 선과 죽는 선이 갈리면 안 된다.
 */
import sheetATextures from "../assets/silkscreen/sheet-a-textures.webp";
import sheetBMotifs from "../assets/silkscreen/sheet-b-motifs.webp";

export type PlateId = "gorge" | "corridor" | "scatter" | "pulse" | "grain" | "inkEdge";
export type MotifId =
  | "ridge" | "cliff" | "boulder"
  | "ruins" | "skyline" | "tree"
  | "moon" | "owl" | "leopard";

interface Rect { x: number; y: number; w: number; h: number }

/** 시트 A(1536×1024) 의 3×2 격자. 여백은 회색이라 안쪽으로 조금 물려 자른다. */
const PLATE_RECT: Record<PlateId, Rect> = {
  gorge:    { x: 41,   y: 23,  w: 465, h: 476 },
  corridor: { x: 529,  y: 23,  w: 478, h: 476 },
  scatter:  { x: 1029, y: 23,  w: 469, h: 476 },
  pulse:    { x: 41,   y: 522, w: 465, h: 475 },
  grain:    { x: 529,  y: 522, w: 478, h: 475 },
  inkEdge:  { x: 1029, y: 560, w: 469, h: 300 }
};

/** 시트 B(1230×1278) 의 3×3 격자. 칸마다 얇은 회색 테두리가 있어 8px 물린다. */
const MOTIF_RECT: Record<MotifId, Rect> = {
  ridge:   { x: 12,  y: 12,  w: 388, h: 395 },
  cliff:   { x: 421, y: 12,  w: 389, h: 395 },
  boulder: { x: 831, y: 12,  w: 387, h: 395 },
  ruins:   { x: 12,  y: 428, w: 388, h: 391 },
  skyline: { x: 421, y: 428, w: 389, h: 391 },
  tree:    { x: 831, y: 428, w: 387, h: 391 },
  moon:    { x: 12,  y: 840, w: 388, h: 390 },
  owl:     { x: 421, y: 840, w: 389, h: 390 },
  leopard: { x: 831, y: 840, w: 387, h: 390 }
};

interface Keyed { canvas: HTMLCanvasElement; w: number; h: number }

const keyed = new Map<string, Keyed>();
const filled = new Map<string, Keyed | null>();
const tinted = new Map<string, HTMLCanvasElement>();
const patterns = new Map<string, CanvasPattern>();
let ready = false;
let started = false;

export function skinReady(): boolean {
  return ready;
}

/**
 * 흰 바탕의 검정 잉크를 알파로 옮긴다. 색은 여기서 정하지 않는다 —
 * 알파만 남기고 잉크는 `tint()` 가 입힌다.
 *
 * 임계값을 하나로 끊지 않고 240→110 구간에서 부드럽게 올린다. 선화의 가장자리가
 * 계단이 되면 축소해서 그릴 때 선이 끊어져 보인다.
 */
function keyOut(img: HTMLImageElement, r: Rect, id: string): Keyed {
  const c = document.createElement("canvas");
  c.width = r.w;
  c.height = r.h;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  const d = x.getImageData(0, 0, r.w, r.h);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
    const a = Math.max(0, Math.min(1, (240 - lum) / 130));
    p[i] = 255;
    p[i + 1] = 255;
    p[i + 2] = 255;
    p[i + 3] = Math.round(a * 255);
  }
  x.putImageData(d, 0, 0);
  const out = { canvas: c, w: r.w, h: r.h };
  keyed.set(id, out);
  return out;
}

/** 알파만 남은 판에 잉크를 입힌다. 같은 색은 한 번만 만든다. */
function tint(id: string, color: string): HTMLCanvasElement | null {
  const key = `${id}:${color}`;
  const hit = tinted.get(key);
  if (hit) return hit;
  const src = keyed.get(id);
  if (!src) return null;
  const c = document.createElement("canvas");
  c.width = src.w;
  c.height = src.h;
  const x = c.getContext("2d")!;
  x.drawImage(src.canvas, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, src.w, src.h);
  tinted.set(key, c);
  return c;
}

export function motifImage(id: MotifId, color: string): HTMLCanvasElement | null {
  return tint(id, color);
}

/**
 * ## 면 — 선화에서 덩어리를 뽑아낸다
 *
 * 목표 화면의 도시·폐허·절벽은 선만이 아니라 **벽보다 조금 어두운 면**을 갖고 있어
 * 깊이가 생긴다. 시트는 선화라 속이 비어 있으므로 여기서 만든다.
 *
 * 바깥에서 물을 부어(테두리에서 flood fill) 닿지 않는 빈칸을 안쪽으로 친다. 선이
 * 끊긴 도형에서는 물이 새어 그림 전체가 면이 되므로, **샌 것을 검사해서 버린다** —
 * 면적이 빈칸의 85% 를 넘으면 그 모티프는 면 없이 선만 쓴다. 마른 나무처럼 열린
 * 도형은 여기서 자동으로 탈락한다.
 */
function fillOf(id: string): Keyed | null {
  if (filled.has(id)) return filled.get(id) ?? null;
  const src = keyed.get(id);
  if (!src) return null;
  const { w, h } = src;
  const x = src.canvas.getContext("2d", { willReadFrequently: true })!;
  const a = x.getImageData(0, 0, w, h).data;
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) ink[i] = a[i * 4 + 3] > 64 ? 1 : 0;

  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => {
    if (i >= 0 && i < w * h && !ink[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let px = 0; px < w; px += 1) {
    push(px);
    push((h - 1) * w + px);
  }
  for (let py = 0; py < h; py += 1) {
    push(py * w);
    push(py * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const px = i % w;
    if (px > 0) push(i - 1);
    if (px < w - 1) push(i + 1);
    push(i - w);
    push(i + w);
  }

  let hollow = 0;
  let inside = 0;
  for (let i = 0; i < w * h; i += 1) {
    if (ink[i]) continue;
    hollow += 1;
    if (!outside[i]) inside += 1;
  }
  // 물이 샜거나 채울 것이 거의 없으면 면을 만들지 않는다
  if (inside < w * h * 0.01 || inside > hollow * 0.85) {
    filled.set(id, null);
    return null;
  }

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d")!;
  const out = cx.createImageData(w, h);
  for (let i = 0; i < w * h; i += 1) {
    const on = ink[i] || !outside[i];
    out.data[i * 4] = 255;
    out.data[i * 4 + 1] = 255;
    out.data[i * 4 + 2] = 255;
    out.data[i * 4 + 3] = on ? 255 : 0;
  }
  cx.putImageData(out, 0, 0);
  const made = { canvas: c, w, h };
  filled.set(id, made);
  keyed.set(`${id}#fill`, made);
  return made;
}

/** 덩어리 면. 면이 나오지 않는 모티프(열린 도형)는 null 이다. */
export function motifFill(id: MotifId, color: string): HTMLCanvasElement | null {
  if (!fillOf(id)) return null;
  return tint(`${id}#fill`, color);
}

export function motifSize(id: MotifId): { w: number; h: number } {
  const r = MOTIF_RECT[id];
  return { w: r.w, h: r.h };
}

/**
 * 벽 채움용 패턴. 타일 한 변이 월드 몇 단위인지로 배율을 잡는다 —
 * **화면 고정이 아니라 월드 고정**이어야 카메라가 움직일 때 벽이 제자리에서
 * 반짝이지 않는다(패턴 변환에 카메라 오프셋을 같이 넣는다).
 */
export function platePattern(
  ctx: CanvasRenderingContext2D,
  id: PlateId,
  color: string,
  worldTile: number,
  zoom: number,
  camX: number,
  offsetY: number
): CanvasPattern | null {
  const img = tint(id, color);
  if (!img) return null;
  const key = `${id}:${color}`;
  let pat = patterns.get(key);
  if (!pat) {
    const made = ctx.createPattern(img, "repeat");
    if (!made) return null;
    pat = made;
    patterns.set(key, pat);
  }
  const s = (worldTile * zoom) / img.width;
  // 패턴 좌표계는 캔버스 고정이므로 카메라만큼 되밀어야 월드에 붙는다
  const tx = -((camX * zoom) % (img.width * s));
  pat.setTransform(new DOMMatrix([s, 0, 0, s, tx, offsetY % (img.height * s)]));
  return pat;
}

/** 시트 두 장을 한 번만 읽어 전부 잘라 둔다. 실패해도 게임은 그대로 돈다. */
export function loadSkin(): void {
  if (started || typeof document === "undefined") return;
  started = true;
  let left = 2;
  const done = () => {
    if (--left === 0) ready = true;
  };
  const load = (src: string, cut: (img: HTMLImageElement) => void) => {
    const img = new Image();
    img.onload = () => {
      try {
        cut(img);
      } catch {
        /* 자르기에 실패하면 텍스처 없이 간다 */
      }
      done();
    };
    img.onerror = done;
    img.src = src;
  };
  load(sheetATextures, (img) => {
    for (const id of Object.keys(PLATE_RECT) as PlateId[]) keyOut(img, PLATE_RECT[id], id);
  });
  load(sheetBMotifs, (img) => {
    for (const id of Object.keys(MOTIF_RECT) as MotifId[]) keyOut(img, MOTIF_RECT[id], id);
  });
}
